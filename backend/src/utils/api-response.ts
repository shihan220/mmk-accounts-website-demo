import type { Response } from 'express';

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  data: T,
  message?: string,
  meta?: Record<string, unknown>
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
};
