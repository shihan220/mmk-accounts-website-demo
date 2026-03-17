import { InquirySource, InquiryStatus } from '@prisma/client';
import { z } from 'zod';

export const submitInquiryBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  service: z.string().trim().max(120).optional().or(z.literal('')),
  message: z.string().trim().min(10).max(5000)
});

export const inquiryIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const listInquiriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(InquiryStatus).optional(),
  source: z.nativeEnum(InquirySource).optional(),
  assignedToId: z.string().uuid().optional(),
  search: z.string().trim().optional()
});

export const updateInquiryBodySchema = z
  .object({
    status: z.nativeEnum(InquiryStatus).optional(),
    assignedToId: z.string().uuid().nullable().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided'
  });

export const addInquiryNoteBodySchema = z.object({
  note: z.string().trim().min(2).max(4000)
});
