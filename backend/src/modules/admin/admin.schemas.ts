import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30)
});

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actorId: z.string().uuid().optional(),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional()
});
