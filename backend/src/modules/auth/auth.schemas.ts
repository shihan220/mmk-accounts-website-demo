import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(128)
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional()
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(20).optional()
});
