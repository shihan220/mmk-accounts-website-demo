import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false
};

export const globalRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.'
    }
  }
});

export const authRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.'
    }
  }
});

export const formRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.FORM_RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'FORM_RATE_LIMITED',
      message: 'Too many submissions. Please wait and try again.'
    }
  }
});
