import { InquirySource, UserRole } from '@prisma/client';
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import {
  addInquiryNote,
  createInquiry,
  getInquiryById,
  listInquiries,
  updateInquiry
} from './inquiries.service';
import { createAuditLog } from '../../services/audit.service';

const submitInquiry = (source: InquirySource) =>
  asyncHandler(async (req: Request, res: Response) => {
    const inquiry = await createInquiry(source, req.body);

    await createAuditLog({
      action: 'INQUIRY_SUBMIT',
      entityType: 'Inquiry',
      entityId: inquiry.id,
      metadata: { source },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    sendSuccess(
      res,
      201,
      { inquiryId: inquiry.id },
      "Thank you. We'll be in touch within 2 business hours."
    );
  });

export const submitContactInquiryHandler = submitInquiry(InquirySource.CONTACT);
export const submitQuoteInquiryHandler = submitInquiry(InquirySource.QUOTE);

export const listInquiriesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listInquiries(req.query as never);
  sendSuccess(res, 200, result.items, undefined, { pagination: result.pagination });
});

export const getInquiryHandler = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await getInquiryById(req.params.id);
  sendSuccess(res, 200, inquiry);
});

export const updateInquiryHandler = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await updateInquiry(req.params.id, req.body);

  await createAuditLog({
    actorId: req.user?.id,
    action: 'INQUIRY_UPDATE',
    entityType: 'Inquiry',
    entityId: inquiry.id,
    metadata: { updatedFields: Object.keys(req.body) },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 200, inquiry, 'Inquiry updated');
});

export const addInquiryNoteHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const inquiry = await addInquiryNote(req.params.id, req.user.id, req.body.note);

  await createAuditLog({
    actorId: req.user.id,
    action: 'INQUIRY_NOTE_ADD',
    entityType: 'Inquiry',
    entityId: inquiry.id,
    metadata: { noteLength: req.body.note.length },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 201, inquiry, 'Note added');
});

export const inquiryAllowedRoles = [UserRole.ADMIN, UserRole.STAFF] as const;
