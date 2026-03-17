import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import {
  getUserById,
  login,
  refreshAccess,
  revokeAllUserRefreshTokens,
  revokeRefreshToken
} from './auth.service';
import { createAuditLog } from '../../services/audit.service';
import { env } from '../../config/env';

const refreshCookieName = 'mmk_refresh_token';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
});

const getClientContext = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent') ?? undefined
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await login(req.body.email, req.body.password, getClientContext(req));

  res.cookie(refreshCookieName, result.refreshToken, getCookieOptions());

  await createAuditLog({
    actorId: result.user.id,
    action: 'AUTH_LOGIN',
    entityType: 'User',
    entityId: result.user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(
    res,
    200,
    {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    'Login successful'
  );
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const tokenFromBody = req.body.refreshToken as string | undefined;
  const tokenFromCookie = req.cookies?.[refreshCookieName] as string | undefined;
  const rawRefreshToken = tokenFromBody ?? tokenFromCookie;

  if (!rawRefreshToken) {
    throw new AppError(400, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required');
  }

  const result = await refreshAccess(rawRefreshToken, getClientContext(req));

  res.cookie(refreshCookieName, result.refreshToken, getCookieOptions());

  sendSuccess(
    res,
    200,
    {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    'Token refreshed'
  );
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const tokenFromBody = req.body.refreshToken as string | undefined;
  const tokenFromCookie = req.cookies?.[refreshCookieName] as string | undefined;
  const rawRefreshToken = tokenFromBody ?? tokenFromCookie;

  await revokeRefreshToken(rawRefreshToken, req.user?.id);
  res.clearCookie(refreshCookieName, getCookieOptions());

  if (req.user) {
    await createAuditLog({
      actorId: req.user.id,
      action: 'AUTH_LOGOUT',
      entityType: 'User',
      entityId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });
  }

  sendSuccess(res, 200, { loggedOut: true }, 'Logged out');
});

export const logoutAllHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  await revokeAllUserRefreshTokens(req.user.id);
  res.clearCookie(refreshCookieName, getCookieOptions());

  await createAuditLog({
    actorId: req.user.id,
    action: 'AUTH_LOGOUT_ALL',
    entityType: 'User',
    entityId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 200, { loggedOutEverywhere: true }, 'Logged out from all sessions');
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const user = await getUserById(req.user.id);
  sendSuccess(res, 200, user);
});
