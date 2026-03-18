import argon2 from 'argon2';
import crypto from 'node:crypto';
import { AuthChallengePurpose, Prisma, UserRole } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { canSendEmail, sendSecurityCodeEmail } from '../../services/email.service';
import { AppError } from '../../utils/app-error';
import { generateRefreshToken, hashToken, signAccessToken } from '../../utils/tokens';
import { isEmailLike, normalizeAndValidatePhone } from '../../utils/phone';

interface TokenContext {
  ipAddress?: string;
  userAgent?: string;
}

interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

interface VerifyChallengePayload {
  challengeId: string;
  code: string;
}

interface ResetPasswordWithCodePayload extends VerifyChallengePayload {
  newPassword: string;
}

interface PreparedRegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
}

export interface SecurityCodeChallengeResponse {
  challengeId: string;
  expiresAt: Date;
  destination: string;
  deliveryMethod: 'email' | 'onscreen';
  developmentCode?: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const authUserSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

const authUserWithPasswordSelect = {
  ...authUserSelect,
  passwordHash: true
} satisfies Prisma.UserSelect;

type AuthUserWithPassword = Prisma.UserGetPayload<{ select: typeof authUserWithPasswordSelect }>;
type AuthUserProjection = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

type AuthChallengeRow = Prisma.AuthChallengeGetPayload<{
  select: {
    id: true;
    purpose: true;
    email: true;
    userId: true;
    payload: true;
    codeHash: true;
    attemptCount: true;
    expiresAt: true;
    consumedAt: true;
  };
}>;

const purposeLabelMap: Record<AuthChallengePurpose, string> = {
  [AuthChallengePurpose.LOGIN]: 'login',
  [AuthChallengePurpose.REGISTER]: 'register',
  [AuthChallengePurpose.PASSWORD_RESET]: 'password reset'
};

const toAuthUserResponse = (user: AuthUserProjection): AuthUserResponse => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const createTokenBundle = async (
  user: { id: string; email: string; role: UserRole },
  context: TokenContext
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt
    }
  });

  return { accessToken, refreshToken };
};

const mapUniqueConstraintError = (error: unknown): AppError | null => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta?.target.map((entry) => String(entry))
    : [];

  if (target.includes('phone')) {
    return new AppError(409, 'PHONE_IN_USE', 'A user with this phone number already exists');
  }

  return new AppError(409, 'EMAIL_IN_USE', 'A user with this email already exists');
};

const maskEmail = (email: string): string => {
  const [localPart, domainPart] = email.split('@');
  if (!localPart || !domainPart) return email;

  const safeLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? '*'}*`
      : `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 2, 1))}${localPart[localPart.length - 1]}`;

  return `${safeLocal}@${domainPart}`;
};

const generateSecurityCode = (): string => {
  return String(crypto.randomInt(100000, 1000000));
};

const parseRegisterChallengePayload = (payload: Prisma.JsonValue | null): PreparedRegisterPayload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError(400, 'INVALID_CHALLENGE_PAYLOAD', 'Registration payload is invalid or missing');
  }

  const record = payload as Record<string, unknown>;
  const role = String(record.role ?? '') as UserRole;

  if (!Object.values(UserRole).includes(role)) {
    throw new AppError(400, 'INVALID_CHALLENGE_PAYLOAD', 'Registration role payload is invalid');
  }

  const fullName = String(record.fullName ?? '').trim();
  const email = String(record.email ?? '').trim().toLowerCase();
  const phone = String(record.phone ?? '').trim();
  const passwordHash = String(record.passwordHash ?? '').trim();

  if (!fullName || !email || !phone || !passwordHash) {
    throw new AppError(400, 'INVALID_CHALLENGE_PAYLOAD', 'Registration payload is incomplete');
  }

  return {
    fullName,
    email,
    phone,
    passwordHash,
    role
  };
};

const findUserForLogin = async (identifier: string): Promise<AuthUserWithPassword | null> => {
  const trimmed = identifier.trim();

  if (isEmailLike(trimmed)) {
    return prisma.user.findUnique({
      where: { email: trimmed.toLowerCase() },
      select: authUserWithPasswordSelect
    });
  }

  const normalizedPhone = normalizeAndValidatePhone(trimmed);
  if (!normalizedPhone) {
    return null;
  }

  return prisma.user.findUnique({
    where: { phone: normalizedPhone },
    select: authUserWithPasswordSelect
  });
};

const validateCredentials = async (identifier: string, password: string): Promise<AuthUserWithPassword> => {
  const user = await findUserForLogin(identifier);

  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/phone or password');
  }

  const isPasswordValid = await argon2.verify(user.passwordHash, password);
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/phone or password');
  }

  return user;
};

const issueLoginTokens = async (
  userId: string,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
    select: authUserSelect
  });

  if (!updated.isActive) {
    throw new AppError(401, 'INACTIVE_USER', 'User account is inactive');
  }

  const tokens = await createTokenBundle(updated, context);

  return {
    user: toAuthUserResponse(updated),
    ...tokens
  };
};

const createChallenge = async (params: {
  purpose: AuthChallengePurpose;
  email: string;
  userId?: string;
  payload?: Prisma.InputJsonValue;
}): Promise<SecurityCodeChallengeResponse> => {
  const code = generateSecurityCode();
  const email = params.email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + env.AUTH_CODE_TTL_MINUTES * 60 * 1000);

  await prisma.authChallenge.deleteMany({
    where: {
      purpose: params.purpose,
      email,
      consumedAt: null
    }
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      purpose: params.purpose,
      codeHash: hashToken(code),
      email,
      userId: params.userId,
      payload: params.payload,
      expiresAt
    },
    select: {
      id: true,
      expiresAt: true
    }
  });

  const delivered = await sendSecurityCodeEmail({
    to: email,
    code,
    purposeLabel: purposeLabelMap[params.purpose],
    expiresInMinutes: env.AUTH_CODE_TTL_MINUTES
  });

  if (!delivered && env.NODE_ENV === 'production') {
    throw new AppError(
      503,
      'SECURITY_CODE_DELIVERY_FAILED',
      'Unable to send verification code right now. Please try again later.'
    );
  }

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    destination: maskEmail(email),
    deliveryMethod: delivered ? 'email' : 'onscreen',
    ...(env.NODE_ENV !== 'production' || !canSendEmail ? { developmentCode: code } : {})
  };
};

const verifyChallenge = async (params: {
  challengeId: string;
  purpose: AuthChallengePurpose;
  code: string;
}): Promise<AuthChallengeRow> => {
  const challenge = await prisma.authChallenge.findUnique({
    where: { id: params.challengeId },
    select: {
      id: true,
      purpose: true,
      email: true,
      userId: true,
      payload: true,
      codeHash: true,
      attemptCount: true,
      expiresAt: true,
      consumedAt: true
    }
  });

  if (!challenge || challenge.purpose !== params.purpose || challenge.consumedAt) {
    throw new AppError(400, 'INVALID_SECURITY_CHALLENGE', 'Security verification session is invalid');
  }

  if (challenge.expiresAt < new Date()) {
    throw new AppError(400, 'SECURITY_CODE_EXPIRED', 'Security code expired. Request a new code.');
  }

  if (challenge.attemptCount >= env.AUTH_CODE_MAX_ATTEMPTS) {
    throw new AppError(429, 'SECURITY_CODE_ATTEMPTS_EXCEEDED', 'Too many invalid code attempts');
  }

  if (hashToken(params.code.trim()) !== challenge.codeHash) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } }
    });
    throw new AppError(400, 'INVALID_SECURITY_CODE', 'Invalid verification code');
  }

  return prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
    select: {
      id: true,
      purpose: true,
      email: true,
      userId: true,
      payload: true,
      codeHash: true,
      attemptCount: true,
      expiresAt: true,
      consumedAt: true
    }
  });
};

const createUserFromPreparedPayload = async (
  payload: PreparedRegisterPayload,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  try {
    const created = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase().trim(),
        phone: payload.phone,
        fullName: payload.fullName,
        passwordHash: payload.passwordHash,
        role: payload.role,
        isActive: true,
        lastLoginAt: new Date()
      },
      select: authUserSelect
    });

    const tokens = await createTokenBundle(created, context);

    return {
      user: toAuthUserResponse(created),
      ...tokens
    };
  } catch (error) {
    const mapped = mapUniqueConstraintError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export const requestRegistrationCode = async (
  payload: RegisterPayload
): Promise<SecurityCodeChallengeResponse> => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const normalizedPhone = normalizeAndValidatePhone(payload.phone);
  if (!normalizedPhone) {
    throw new AppError(400, 'INVALID_PHONE', 'Invalid phone number format');
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    },
    select: { id: true, email: true, phone: true }
  });

  if (existing) {
    if (existing.phone === normalizedPhone) {
      throw new AppError(409, 'PHONE_IN_USE', 'A user with this phone number already exists');
    }
    throw new AppError(409, 'EMAIL_IN_USE', 'A user with this email already exists');
  }

  const passwordHash = await argon2.hash(payload.password);

  return createChallenge({
    purpose: AuthChallengePurpose.REGISTER,
    email: normalizedEmail,
    payload: {
      fullName: payload.fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: payload.role
    }
  });
};

export const verifyRegistrationCode = async (
  payload: VerifyChallengePayload,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const challenge = await verifyChallenge({
    challengeId: payload.challengeId,
    purpose: AuthChallengePurpose.REGISTER,
    code: payload.code
  });

  const registerPayload = parseRegisterChallengePayload(challenge.payload);
  return createUserFromPreparedPayload(registerPayload, context);
};

export const requestLoginCode = async (
  identifier: string,
  password: string
): Promise<SecurityCodeChallengeResponse> => {
  const user = await validateCredentials(identifier, password);

  return createChallenge({
    purpose: AuthChallengePurpose.LOGIN,
    email: user.email,
    userId: user.id
  });
};

export const verifyLoginCode = async (
  payload: VerifyChallengePayload,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const challenge = await verifyChallenge({
    challengeId: payload.challengeId,
    purpose: AuthChallengePurpose.LOGIN,
    code: payload.code
  });

  const userId = challenge.userId;
  if (!userId) {
    throw new AppError(400, 'INVALID_SECURITY_CHALLENGE', 'Login verification session is incomplete');
  }

  return issueLoginTokens(userId, context);
};

export const requestPasswordResetCode = async (identifier: string): Promise<SecurityCodeChallengeResponse> => {
  const user = await findUserForLogin(identifier);

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'No user found for the provided email/phone');
  }

  if (!user.isActive) {
    throw new AppError(401, 'INACTIVE_USER', 'User account is inactive');
  }

  return createChallenge({
    purpose: AuthChallengePurpose.PASSWORD_RESET,
    email: user.email,
    userId: user.id
  });
};

export const resetPasswordWithCode = async (
  payload: ResetPasswordWithCodePayload
): Promise<{ passwordReset: true }> => {
  const challenge = await verifyChallenge({
    challengeId: payload.challengeId,
    purpose: AuthChallengePurpose.PASSWORD_RESET,
    code: payload.code
  });

  const userId = challenge.userId;
  if (!userId) {
    throw new AppError(400, 'INVALID_SECURITY_CHALLENGE', 'Password reset verification session is incomplete');
  }

  const passwordHash = await argon2.hash(payload.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      updatedAt: new Date()
    }
  });

  await revokeAllUserRefreshTokens(userId);

  return { passwordReset: true };
};

// Legacy direct login/register for compatibility
export const register = async (
  payload: RegisterPayload,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const normalizedPhone = normalizeAndValidatePhone(payload.phone);
  if (!normalizedPhone) {
    throw new AppError(400, 'INVALID_PHONE', 'Invalid phone number format');
  }

  const preparedPayload: PreparedRegisterPayload = {
    fullName: payload.fullName,
    email: payload.email.toLowerCase().trim(),
    phone: normalizedPhone,
    passwordHash: await argon2.hash(payload.password),
    role: payload.role
  };

  return createUserFromPreparedPayload(preparedPayload, context);
};

export const login = async (
  identifier: string,
  password: string,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const user = await validateCredentials(identifier, password);
  return issueLoginTokens(user.id, context);
};

export const refreshAccess = async (
  rawRefreshToken: string,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const tokenHash = hashToken(rawRefreshToken);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: authUserSelect
      }
    }
  });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  if (!tokenRecord.user.isActive) {
    throw new AppError(401, 'INACTIVE_USER', 'User account is inactive');
  }

  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() }
  });

  const tokens = await createTokenBundle(tokenRecord.user, context);

  return {
    user: toAuthUserResponse(tokenRecord.user),
    ...tokens
  };
};

export const revokeRefreshToken = async (rawRefreshToken?: string, userId?: string): Promise<void> => {
  if (!rawRefreshToken) return;

  const tokenHash = hashToken(rawRefreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
      ...(userId ? { userId } : {})
    },
    data: {
      revokedAt: new Date()
    }
  });
};

export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
};

export const getUserById = async (userId: string): Promise<AuthUserResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: authUserSelect
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return toAuthUserResponse(user);
};
