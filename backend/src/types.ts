import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}
