import { InquiryStatus, Prisma, SubscriberStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

interface DashboardOptions {
  days: number;
}

interface ListAuditOptions {
  page: number;
  limit: number;
  actorId?: string;
  action?: string;
  entityType?: string;
}

export const getDashboardSummary = async (options: DashboardOptions) => {
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);

  const [
    totalInquiries,
    newInquiries,
    inProgressInquiries,
    resolvedInquiries,
    recentInquiries,
    inquiriesBySource,
    activeSubscribers,
    unsubscribedSubscribers
  ] = await Promise.all([
    prisma.inquiry.count(),
    prisma.inquiry.count({ where: { status: InquiryStatus.NEW } }),
    prisma.inquiry.count({ where: { status: InquiryStatus.IN_PROGRESS } }),
    prisma.inquiry.count({ where: { status: { in: [InquiryStatus.RESOLVED, InquiryStatus.CLOSED] } } }),
    prisma.inquiry.count({ where: { submittedAt: { gte: since } } }),
    prisma.inquiry.groupBy({
      by: ['source'],
      _count: { _all: true }
    }),
    prisma.newsletterSubscriber.count({ where: { status: SubscriberStatus.ACTIVE } }),
    prisma.newsletterSubscriber.count({ where: { status: SubscriberStatus.UNSUBSCRIBED } })
  ]);

  const latestInquiries = await prisma.inquiry.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      source: true,
      fullName: true,
      email: true,
      service: true,
      status: true,
      submittedAt: true
    }
  });

  return {
    inquiries: {
      total: totalInquiries,
      new: newInquiries,
      inProgress: inProgressInquiries,
      resolvedOrClosed: resolvedInquiries,
      receivedInLastWindow: recentInquiries,
      bySource: inquiriesBySource.map((item) => ({
        source: item.source,
        count: item._count._all
      }))
    },
    newsletter: {
      active: activeSubscribers,
      unsubscribed: unsubscribedSubscribers
    },
    latestInquiries
  };
};

export const listAuditLogs = async (options: ListAuditOptions) => {
  const where: Prisma.AuditLogWhereInput = {
    ...(options.actorId ? { actorId: options.actorId } : {}),
    ...(options.action ? { action: { contains: options.action, mode: 'insensitive' } } : {}),
    ...(options.entityType
      ? { entityType: { contains: options.entityType, mode: 'insensitive' } }
      : {})
  };

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: options.limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      }
    }),
    prisma.auditLog.count({ where })
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
