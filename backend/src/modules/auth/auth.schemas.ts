import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { normalizeAndValidatePhone } from '../../utils/phone';

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .transform((value) => normalizeAndValidatePhone(value))
  .refine((value): value is string => value != null, {
    message: 'Invalid phone number format'
  });

const emailSchema = z
  .string()
  .email()
  .transform((value) => value.toLowerCase().trim());

export const loginBodySchema = z
  .object({
    identifier: z.string().trim().min(3).max(120).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(128)
  })
  .transform((value) => {
    const candidate = value.identifier ?? value.email;
    return {
      identifier: candidate?.trim() ?? '',
      password: value.password
    };
  })
  .refine((value) => value.identifier.length > 0, {
    message: 'identifier is required',
    path: ['identifier']
  });

export const registerBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: phoneSchema,
    password: z.string().min(8).max(128),
    role: z.nativeEnum(UserRole).default(UserRole.STAFF),
    adminSignupCode: z.string().trim().min(4).max(128).optional()
  })
  .superRefine((payload, ctx) => {
    if (payload.role === UserRole.ADMIN && !payload.adminSignupCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['adminSignupCode'],
        message: 'adminSignupCode is required when role is ADMIN'
      });
    }
  });

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional()
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(20).optional()
});
