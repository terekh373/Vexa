/**
 * Persistence for admin user management. Prisma calls only — role and status
 * rules live in the service.
 */
import type { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const adminUserSelect = {
  id: true,
  email: true,
  fullName: true,
  roles: true,
  status: true,
  deletedAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export async function findUserById(userId: string): Promise<AdminUserRow | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
}

export async function setUserStatus(userId: string, status: UserStatus): Promise<AdminUserRow> {
  return prisma.user.update({ where: { id: userId }, data: { status }, select: adminUserSelect });
}

const authorProfileSelect = {
  userId: true,
  displayName: true,
  isVerified: true,
  verifiedAt: true,
} satisfies Prisma.AuthorProfileSelect;

export type AuthorProfileRow = Prisma.AuthorProfileGetPayload<{ select: typeof authorProfileSelect }>;

export async function findAuthorProfileByUserId(userId: string): Promise<AuthorProfileRow | null> {
  return prisma.authorProfile.findUnique({ where: { userId }, select: authorProfileSelect });
}

export async function setAuthorVerification(
  userId: string,
  data: { isVerified: boolean; verifiedAt: Date | null },
): Promise<AuthorProfileRow> {
  return prisma.authorProfile.update({ where: { userId }, data, select: authorProfileSelect });
}
