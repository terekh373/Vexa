/**
 * Persistence for admin user management. Prisma calls only — role and status
 * rules live in the service.
 */
import type { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { AdminUserListQuery } from './admin.users.validation.js';

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

const adminUserListSelect = {
  id: true,
  email: true,
  fullName: true,
  roles: true,
  status: true,
  createdAt: true,
  authorProfile: {
    select: {
      displayName: true,
      isVerified: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserListRow = Prisma.UserGetPayload<{ select: typeof adminUserListSelect }>;

export async function listUsers(
  query: AdminUserListQuery,
): Promise<{ items: AdminUserListRow[]; total: number }> {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.role === undefined ? {} : { roles: { has: query.role } }),
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.q === undefined
      ? {}
      : {
          OR: [
            { email: { contains: query.q, mode: 'insensitive' as const } },
            { fullName: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: adminUserListSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

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
