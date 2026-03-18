import { Router } from 'express';
import {
  forgotPasswordRequestCodeHandler,
  forgotPasswordResetHandler,
  loginHandler,
  loginRequestCodeHandler,
  loginVerifyCodeHandler,
  logoutAllHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  registerRequestCodeHandler,
  registerVerifyCodeHandler,
  refreshHandler
} from './auth.controller';
import { authRateLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import {
  forgotPasswordRequestBodySchema,
  forgotPasswordResetBodySchema,
  loginBodySchema,
  loginRequestBodySchema,
  loginVerifyBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  registerRequestBodySchema,
  registerVerifyBodySchema
} from './auth.schemas';
import { requireAuth } from '../../middleware/auth';

const authRouter = Router();

authRouter.post('/login', authRateLimiter, validate({ body: loginBodySchema }), loginHandler);
authRouter.post('/register', authRateLimiter, validate({ body: registerBodySchema }), registerHandler);
authRouter.post('/login/request-code', authRateLimiter, validate({ body: loginRequestBodySchema }), loginRequestCodeHandler);
authRouter.post('/login/verify-code', authRateLimiter, validate({ body: loginVerifyBodySchema }), loginVerifyCodeHandler);
authRouter.post('/register/request-code', authRateLimiter, validate({ body: registerRequestBodySchema }), registerRequestCodeHandler);
authRouter.post('/register/verify-code', authRateLimiter, validate({ body: registerVerifyBodySchema }), registerVerifyCodeHandler);
authRouter.post(
  '/password/forgot',
  authRateLimiter,
  validate({ body: forgotPasswordRequestBodySchema }),
  forgotPasswordRequestCodeHandler
);
authRouter.post('/password/reset', authRateLimiter, validate({ body: forgotPasswordResetBodySchema }), forgotPasswordResetHandler);
authRouter.post('/refresh', authRateLimiter, validate({ body: refreshBodySchema }), refreshHandler);
authRouter.post('/logout', validate({ body: logoutBodySchema }), logoutHandler);
authRouter.post('/logout-all', requireAuth, logoutAllHandler);
authRouter.get('/me', requireAuth, meHandler);

export { authRouter };
