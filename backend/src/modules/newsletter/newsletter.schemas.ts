import { SubscriberStatus } from '@prisma/client';
import { z } from 'zod';

export const subscribeBodySchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  sourcePage: z.string().trim().max(200).optional()
});

export const unsubscribeQuerySchema = z.object({
  token: z.string().min(10)
});

export const listSubscribersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(SubscriberStatus).optional(),
  search: z.string().trim().optional()
});

export const subscriberIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const updateSubscriberBodySchema = z.object({
  status: z.nativeEnum(SubscriberStatus)
});
