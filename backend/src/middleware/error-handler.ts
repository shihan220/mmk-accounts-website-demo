import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import { sendError } from '../utils/api-response';
import { AppError, isAppError } from '../utils/app-error';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (isAppError(error)) {
    return sendError(res, error.statusCode, error.code, error.message, error.details);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return sendError(res, 409, 'CONFLICT', 'A record with these details already exists', error.meta);
    }
    if (error.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Requested record was not found');
    }

    return sendError(res, 400, 'DB_ERROR', 'Database operation failed', error.message);
  }

  logger.error(
    {
      err: error,
      path: req.originalUrl,
      method: req.method
    },
    'Unhandled error'
  );

  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
};

export const toAppError = (statusCode: number, code: string, message: string): never => {
  throw new AppError(statusCode, code, message);
};
