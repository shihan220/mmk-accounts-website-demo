import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import {
  createUser,
  deactivateUser,
  getUserById,
  listUsers,
  updateUser,
  updateUserPassword
} from './users.service';
import { createAuditLog } from '../../services/audit.service';

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listUsers(req.query as never);
  sendSuccess(res, 200, result.items, undefined, { pagination: result.pagination });
});

export const getUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(req.params.id);
  sendSuccess(res, 200, user);
});

export const createUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await createUser(req.body);

  await createAuditLog({
    actorId: req.user?.id,
    action: 'USER_CREATE',
    entityType: 'User',
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 201, user, 'User created');
});

export const updateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateUser(req.params.id, req.body);

  await createAuditLog({
    actorId: req.user?.id,
    action: 'USER_UPDATE',
    entityType: 'User',
    entityId: user.id,
    metadata: { updatedFields: Object.keys(req.body) },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 200, user, 'User updated');
});

export const updateUserPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await updateUserPassword(req.params.id, req.body.password);

  await createAuditLog({
    actorId: req.user?.id,
    action: 'USER_PASSWORD_UPDATE',
    entityType: 'User',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 200, { updated: true }, 'Password updated and active sessions revoked');
});

export const deactivateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await deactivateUser(req.params.id);

  await createAuditLog({
    actorId: req.user?.id,
    action: 'USER_DEACTIVATE',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  sendSuccess(res, 200, user, 'User deactivated');
});
