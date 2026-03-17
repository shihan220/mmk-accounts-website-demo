import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload } from '../types';
import { env } from '../config/env';

export const signAccessToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`
  });
};

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(48).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateUnsubscribeToken = (): string => {
  return crypto.randomBytes(24).toString('hex');
};
