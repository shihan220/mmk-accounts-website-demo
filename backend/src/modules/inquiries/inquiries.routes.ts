import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { formRateLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import {
  addInquiryNoteHandler,
  getInquiryHandler,
  inquiryAllowedRoles,
  listInquiriesHandler,
  submitContactInquiryHandler,
  submitQuoteInquiryHandler,
  updateInquiryHandler
} from './inquiries.controller';
import {
  addInquiryNoteBodySchema,
  inquiryIdParamsSchema,
  listInquiriesQuerySchema,
  submitInquiryBodySchema,
  updateInquiryBodySchema
} from './inquiries.schemas';

const inquiriesRouter = Router();

inquiriesRouter.post('/contact', formRateLimiter, validate({ body: submitInquiryBodySchema }), submitContactInquiryHandler);
inquiriesRouter.post('/quote', formRateLimiter, validate({ body: submitInquiryBodySchema }), submitQuoteInquiryHandler);

inquiriesRouter.use(requireAuth, requireRole(...inquiryAllowedRoles));

inquiriesRouter.get('/', validate({ query: listInquiriesQuerySchema }), listInquiriesHandler);
inquiriesRouter.get('/:id', validate({ params: inquiryIdParamsSchema }), getInquiryHandler);
inquiriesRouter.patch(
  '/:id',
  validate({ params: inquiryIdParamsSchema, body: updateInquiryBodySchema }),
  updateInquiryHandler
);
inquiriesRouter.post(
  '/:id/notes',
  validate({ params: inquiryIdParamsSchema, body: addInquiryNoteBodySchema }),
  addInquiryNoteHandler
);

export { inquiriesRouter };
