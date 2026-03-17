import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import { getDashboardSummary, listAuditLogs } from './admin.service';

export const dashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getDashboardSummary(req.query as never);
  sendSuccess(res, 200, data);
});

export const listAuditLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listAuditLogs(req.query as never);
  sendSuccess(res, 200, result.items, undefined, { pagination: result.pagination });
});
