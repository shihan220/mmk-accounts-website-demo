import { Router } from 'express';
import { UserRole } from '@prisma/client';
import {
  createUserHandler,
  deactivateUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
  updateUserPasswordHandler
} from './users.controller';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  updateUserPasswordBodySchema,
  userIdParamsSchema
} from './users.schemas';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const usersRouter = Router();

usersRouter.use(requireAuth, requireRole(UserRole.ADMIN));

usersRouter.get('/', validate({ query: listUsersQuerySchema }), listUsersHandler);
usersRouter.get('/:id', validate({ params: userIdParamsSchema }), getUserHandler);
usersRouter.post('/', validate({ body: createUserBodySchema }), createUserHandler);
usersRouter.patch('/:id', validate({ params: userIdParamsSchema, body: updateUserBodySchema }), updateUserHandler);
usersRouter.patch(
  '/:id/password',
  validate({ params: userIdParamsSchema, body: updateUserPasswordBodySchema }),
  updateUserPasswordHandler
);
usersRouter.delete('/:id', validate({ params: userIdParamsSchema }), deactivateUserHandler);

export { usersRouter };
