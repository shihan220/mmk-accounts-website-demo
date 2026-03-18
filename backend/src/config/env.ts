import { z } from 'zod';

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  TRUST_PROXY: z.string().optional(),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  FORM_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('no-reply@mmkaccountants.com'),
  NOTIFICATION_TO: z.string().optional()
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  CORS_ORIGINS: parsed.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  TRUST_PROXY: parseBoolean(parsed.TRUST_PROXY, false),
  SMTP_SECURE: parseBoolean(parsed.SMTP_SECURE, false)
};

export type Environment = typeof env;
