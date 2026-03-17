import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/api-response';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { inquiriesRouter } from '../modules/inquiries/inquiries.routes';
import { newsletterRouter } from '../modules/newsletter/newsletter.routes';
import { adminRouter } from '../modules/admin/admin.routes';

const apiRouter = Router();

apiRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, 200, { status: 'ok' });
  })
);

apiRouter.get('/', (_req, res) => {
  sendSuccess(res, 200, {
    name: 'MMK Accountants API',
    version: '1.0.0'
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/inquiries', inquiriesRouter);
apiRouter.use('/newsletter', newsletterRouter);
apiRouter.use('/admin', adminRouter);

export { apiRouter };
