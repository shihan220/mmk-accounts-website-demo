import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth';
import { formRateLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import {
  listSubscribersHandler,
  subscribeHandler,
  unsubscribeHandler,
  updateSubscriberStatusHandler
} from './newsletter.controller';
import {
  listSubscribersQuerySchema,
  subscribeBodySchema,
  subscriberIdParamsSchema,
  unsubscribeQuerySchema,
  updateSubscriberBodySchema
} from './newsletter.schemas';

const newsletterRouter = Router();

newsletterRouter.post('/subscribe', formRateLimiter, validate({ body: subscribeBodySchema }), subscribeHandler);
newsletterRouter.get('/unsubscribe', validate({ query: unsubscribeQuerySchema }), unsubscribeHandler);

newsletterRouter.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.STAFF));
newsletterRouter.get('/subscribers', validate({ query: listSubscribersQuerySchema }), listSubscribersHandler);
newsletterRouter.patch(
  '/subscribers/:id',
  validate({ params: subscriberIdParamsSchema, body: updateSubscriberBodySchema }),
  updateSubscriberStatusHandler
);

export { newsletterRouter };
