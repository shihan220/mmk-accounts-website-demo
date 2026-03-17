import { Router } from 'express';
import {
  loginHandler,
  logoutAllHandler,
  logoutHandler,
  meHandler,
  refreshHandler
} from './auth.controller';
import { authRateLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import { loginBodySchema, logoutBodySchema, refreshBodySchema } from './auth.schemas';
import { requireAuth } from '../../middleware/auth';

const authRouter = Router();

authRouter.post('/login', authRateLimiter, validate({ body: loginBodySchema }), loginHandler);
authRouter.post('/refresh', authRateLimiter, validate({ body: refreshBodySchema }), refreshHandler);
authRouter.post('/logout', validate({ body: logoutBodySchema }), logoutHandler);
authRouter.post('/logout-all', requireAuth, logoutAllHandler);
authRouter.get('/me', requireAuth, meHandler);

export { authRouter };
