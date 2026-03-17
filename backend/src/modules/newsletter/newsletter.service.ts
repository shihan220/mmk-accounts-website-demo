import { Prisma, SubscriberStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { generateUnsubscribeToken } from '../../utils/tokens';

interface ListSubscribersOptions {
  page: number;
  limit: number;
  status?: SubscriberStatus;
  search?: string;
}

const subscriberSelect = {
  id: true,
  email: true,
  status: true,
  sourcePage: true,
  subscribedAt: true,
  unsubscribedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.NewsletterSubscriberSelect;

export type SubscriberResponse = Prisma.NewsletterSubscriberGetPayload<{ select: typeof subscriberSelect }>;

export const subscribe = async (
  email: string,
  sourcePage?: string
): Promise<{ subscriber: SubscriberResponse; wasCreated: boolean; wasReactivated: boolean }> => {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
    select: subscriberSelect
  });

  if (!existing) {
    const created = await prisma.newsletterSubscriber.create({
      data: {
        email,
        sourcePage: sourcePage?.trim() || null,
        status: SubscriberStatus.ACTIVE,
        unsubscribedAt: null,
        unsubscribeToken: generateUnsubscribeToken()
      },
      select: subscriberSelect
    });

    return { subscriber: created, wasCreated: true, wasReactivated: false };
  }

  if (existing.status !== SubscriberStatus.ACTIVE) {
    const updated = await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        status: SubscriberStatus.ACTIVE,
        unsubscribedAt: null,
        sourcePage: sourcePage?.trim() || existing.sourcePage,
        unsubscribeToken: generateUnsubscribeToken()
      },
      select: subscriberSelect
    });

    return { subscriber: updated, wasCreated: false, wasReactivated: true };
  }

  return { subscriber: existing, wasCreated: false, wasReactivated: false };
};

export const unsubscribeByToken = async (token: string): Promise<SubscriberResponse> => {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token },
    select: subscriberSelect
  });

  if (!existing) {
    throw new AppError(404, 'SUBSCRIBER_NOT_FOUND', 'Invalid unsubscribe token');
  }

  if (existing.status === SubscriberStatus.UNSUBSCRIBED) {
    return existing;
  }

  return prisma.newsletterSubscriber.update({
    where: { id: existing.id },
    data: {
      status: SubscriberStatus.UNSUBSCRIBED,
      unsubscribedAt: new Date()
    },
    select: subscriberSelect
  });
};

export const listSubscribers = async (options: ListSubscribersOptions): Promise<{
  items: SubscriberResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.search
      ? {
          email: {
            contains: options.search,
            mode: 'insensitive'
          }
        }
      : {})
  };

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: 'desc' },
      skip,
      take: options.limit,
      select: subscriberSelect
    }),
    prisma.newsletterSubscriber.count({ where })
  ]);

  return {
    items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit) || 1
    }
  };
};

export const updateSubscriberStatus = async (id: string, status: SubscriberStatus): Promise<SubscriberResponse> => {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { id },
    select: subscriberSelect
  });

  if (!existing) {
    throw new AppError(404, 'SUBSCRIBER_NOT_FOUND', 'Subscriber not found');
  }

  return prisma.newsletterSubscriber.update({
    where: { id },
    data: {
      status,
      unsubscribedAt: status === SubscriberStatus.UNSUBSCRIBED ? new Date() : null,
      ...(status === SubscriberStatus.ACTIVE ? { unsubscribeToken: generateUnsubscribeToken() } : {})
    },
    select: subscriberSelect
  });
};
