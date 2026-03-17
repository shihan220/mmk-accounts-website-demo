import { prisma } from '../lib/prisma';
import { logger } from '../config/logger';

interface AuditPayload {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (payload: AuditPayload): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: payload.actorId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        metadata: payload.metadata as never,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to persist audit log');
  }
};
