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

const identifierInputSchema = z.object({
  identifier: z.string().trim().min(3).max(120).optional(),
  email: z.string().email().optional()
});

const normalizeIdentifier = (value: { identifier?: string; email?: string }): string => {
  const candidate = value.identifier ?? value.email;
  return candidate?.trim() ?? '';
};

const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Security code must be 6 digits');
const challengeIdSchema = z.string().trim().uuid();

export const loginRequestBodySchema = identifierInputSchema
  .extend({
    password: z.string().min(8).max(128)
  })
  .transform((value) => ({
    identifier: normalizeIdentifier(value),
    password: value.password
  }))
  .refine((value) => value.identifier.length > 0, {
    message: 'identifier is required',
    path: ['identifier']
  });

export const loginVerifyBodySchema = z.object({
  challengeId: challengeIdSchema,
  code: codeSchema
});

export const registerRequestBodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).default(UserRole.STAFF)
});

export const registerVerifyBodySchema = z.object({
  challengeId: challengeIdSchema,
  code: codeSchema
});

export const forgotPasswordRequestBodySchema = identifierInputSchema
  .transform((value) => ({
    identifier: normalizeIdentifier(value)
  }))
  .refine((value) => value.identifier.length > 0, {
    message: 'identifier is required',
    path: ['identifier']
  });

export const forgotPasswordResetBodySchema = z.object({
  challengeId: challengeIdSchema,
  code: codeSchema,
  newPassword: z.string().min(8).max(128)
});

// Backward-compatible aliases
export const loginBodySchema = loginRequestBodySchema;
export const registerBodySchema = registerRequestBodySchema;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional()
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(20).optional()
});
