import { UserRole, UserStatus } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { revokeAllSessions } from '../auth/auth.service.js';
import {
  findAuthorProfileByUserId,
  findUserById,
  listUsers,
  setAuthorVerification,
  setUserStatus,
  type AdminUserRow,
} from './admin.users.repository.js';
import type {
  AdminUserListQuery,
  UpdateUserStatusInput,
  VerifyAuthorInput,
} from './admin.users.validation.js';

function toUserResponse(user: AdminUserRow) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    status: user.status,
    updatedAt: user.updatedAt,
  };
}

export async function listAdminUsers(query: AdminUserListQuery) {
  const { items, total } = await listUsers(query);

  return {
    items: items.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      status: user.status,
      createdAt: user.createdAt,
      ...(user.roles.includes(UserRole.AUTHOR)
        ? {
            displayName: user.authorProfile?.displayName ?? null,
            isVerified: user.authorProfile?.isVerified ?? false,
          }
        : {}),
    })),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

async function requireActiveUser(userId: string): Promise<AdminUserRow> {
  const user = await findUserById(userId);
  if (user === null || user.deletedAt !== null) throw AppError.notFound('User not found');
  return user;
}

export async function updateUserStatus(userId: string, input: UpdateUserStatusInput) {
  const user = await requireActiveUser(userId);

  if (user.roles.includes(UserRole.ADMIN)) {
    throw AppError.conflict('Admin accounts cannot be blocked from the admin panel');
  }

  if (user.status === input.status) {
    return toUserResponse(user);
  }

  const updated = await setUserStatus(userId, input.status);

  // A blocked account must lose every live session, not just future logins:
  // an already-issued refresh token would otherwise keep working for weeks.
  if (input.status === UserStatus.BLOCKED) {
    await revokeAllSessions(userId);
  }

  return toUserResponse(updated);
}

export async function verifyAuthor(userId: string, input: VerifyAuthorInput) {
  const user = await requireActiveUser(userId);

  const profile = await findAuthorProfileByUserId(user.id);
  if (profile === null) throw AppError.notFound('Author profile not found');

  const verifiedAt = input.isVerified ? profile.verifiedAt ?? new Date() : null;

  return setAuthorVerification(user.id, { isVerified: input.isVerified, verifiedAt });
}
