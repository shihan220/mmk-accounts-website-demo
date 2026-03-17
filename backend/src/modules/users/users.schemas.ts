import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const userIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => (value == null ? undefined : value === 'true'))
});

export const createUserBodySchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  fullName: z.string().min(2).max(120).trim(),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).default(UserRole.STAFF),
  isActive: z.boolean().default(true)
});

export const updateUserBodySchema = z
  .object({
    email: z.string().email().transform((value) => value.toLowerCase().trim()).optional(),
    fullName: z.string().min(2).max(120).trim().optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided'
  });

export const updateUserPasswordBodySchema = z.object({
  password: z.string().min(8).max(128)
});
