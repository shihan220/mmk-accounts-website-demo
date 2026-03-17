import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import {
  listSubscribers,
  subscribe,
  unsubscribeByToken,
  updateSubscriberStatus
} from './newsletter.service';
import { createAuditLog } from '../../services/audit.service';

export const subscribeHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await subscribe(req.body.email, req.body.sourcePage);

  sendSuccess(
    res,
    200,
    { subscribed: true },
    result.wasCreated || result.wasReactivated
      ? 'Subscription successful'
      : 'You are already subscribed'
  );
});

export const unsubscribeHandler = asyncHandler(async (req: Request, res: Response) => {
  await unsubscribeByToken(req.query.token as string);
  sendSuccess(res, 200, { unsubscribed: true }, 'You have been unsubscribed');
});

export const listSubscribersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listSubscribers(req.query as never);
  sendSuccess(res, 200, result.items, undefined, { pagination: result.pagination });
});

export const updateSubscriberStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const subscriber = await updateSubscriberStatus(req.params.id, req.body.status);

  await createAuditLog({
    actorId: req.user?.id,
    action: 'NEWSLETTER_STATUS_UPDATE',
    entityType: 'NewsletterSubscriber',
    entityId: subscriber.id,
    metadata: { status: subscriber.status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 200, subscriber, 'Subscriber status updated');
});
