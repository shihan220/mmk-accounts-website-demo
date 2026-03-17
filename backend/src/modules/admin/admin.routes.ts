import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { dashboardHandler, listAuditLogsHandler } from './admin.controller';
import { dashboardQuerySchema, listAuditLogsQuerySchema } from './admin.schemas';

const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.STAFF));
adminRouter.get('/dashboard', validate({ query: dashboardQuerySchema }), dashboardHandler);
adminRouter.get('/audit-logs', requireRole(UserRole.ADMIN), validate({ query: listAuditLogsQuerySchema }), listAuditLogsHandler);

export { adminRouter };
