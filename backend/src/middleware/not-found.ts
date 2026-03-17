import type { RequestHandler } from 'express';
import { sendError } from '../utils/api-response';

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
};
