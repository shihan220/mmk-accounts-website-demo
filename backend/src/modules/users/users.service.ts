import argon2 from 'argon2';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';

export interface ListUsersOptions {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

export type UserResponse = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export const listUsers = async (options: ListUsersOptions): Promise<{
  items: UserResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const where: Prisma.UserWhereInput = {
    ...(options.search
      ? {
          OR: [
            { fullName: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } }
          ]
        }
      : {}),
    ...(options.role ? { role: options.role } : {}),
    ...(options.isActive !== undefined ? { isActive: options.isActive } : {})
  };

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: options.limit,
      select: userSelect
    }),
    prisma.user.count({ where })
  ]);

  return {
    items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit) || 1
    }
  };
};

export const getUserById = async (id: string): Promise<UserResponse> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return user;
};

export const createUser = async (payload: {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}): Promise<UserResponse> => {
  const passwordHash = await argon2.hash(payload.password);

  try {
    return await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.fullName,
        passwordHash,
        role: payload.role,
        isActive: payload.isActive
      },
      select: userSelect
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_IN_USE', 'A user with this email already exists');
    }
    throw error;
  }
};

export const updateUser = async (
  id: string,
  payload: Partial<{ email: string; fullName: string; role: UserRole; isActive: boolean }>
): Promise<UserResponse> => {
  await getUserById(id);

  try {
    return await prisma.user.update({
      where: { id },
      data: payload,
      select: userSelect
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_IN_USE', 'A user with this email already exists');
    }
    throw error;
  }
};

export const updateUserPassword = async (id: string, password: string): Promise<void> => {
  await getUserById(id);

  const passwordHash = await argon2.hash(password);

  await prisma.user.update({
    where: { id },
    data: { passwordHash }
  });

  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() }
  });
};

export const deactivateUser = async (id: string): Promise<UserResponse> => {
  await getUserById(id);

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: userSelect
  });

  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  return user;
};
