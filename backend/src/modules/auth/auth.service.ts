import argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { generateRefreshToken, hashToken, signAccessToken } from '../../utils/tokens';

interface TokenContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const toAuthUserResponse = (user: {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AuthUserResponse => ({
  id: user.id,
  email: user.email,
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

export const login = async (
  email: string,
  password: string,
  context: TokenContext
): Promise<{ user: AuthUserResponse; accessToken: string; refreshToken: string }> => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      passwordHash: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isPasswordValid = await argon2.verify(user.passwordHash, password);
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
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
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
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
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return toAuthUserResponse(user);
};
