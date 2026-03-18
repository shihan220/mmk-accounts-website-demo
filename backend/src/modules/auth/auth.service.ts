import argon2 from 'argon2';
import { Prisma, UserRole } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
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

export const register = async (
  payload: RegisterPayload,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const passwordHash = await argon2.hash(payload.password);
  const normalizedPhone = normalizeAndValidatePhone(payload.phone);
  if (!normalizedPhone) {
    throw new AppError(400, 'INVALID_PHONE', 'Invalid phone number format');
  }

  try {
    const created = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase().trim(),
        phone: normalizedPhone,
        fullName: payload.fullName,
        passwordHash,
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

export const login = async (
  identifier: string,
  password: string,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const user = await findUserForLogin(identifier);

  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/phone or password');
  }

  const isPasswordValid = await argon2.verify(user.passwordHash, password);
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/phone or password');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: authUserSelect
  });

  const tokens = await createTokenBundle(updated, context);

  return {
    user: toAuthUserResponse(updated),
    ...tokens
  };
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
