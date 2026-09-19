import { FileKind, type User } from '@prisma/client';
import type { AuthUser } from '@vexa/shared';
import { AppError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../auth/password.service.js';
import { revokeAllSessions } from '../auth/auth.service.js';
import {
  findAvatarFileById,
  findProfileUserById,
  updatePasswordHash,
  updateProfile,
} from './me.repository.js';
import type { ChangePasswordInput, UpdateMeInput } from './me.validation.js';

function toProfileResponse(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    emailVerified: user.emailVerifiedAt !== null,
    locale: user.locale,
  };
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<AuthUser> {
  const user = await findProfileUserById(userId);

  if (user === null) {
    throw AppError.unauthorized('Account no longer exists');
  }

  if (input.avatarFileId !== undefined && input.avatarFileId !== null) {
    const avatar = await findAvatarFileById(input.avatarFileId);

    if (avatar === null) {
      throw AppError.validation('Invalid avatar file', [
        { field: 'avatarFileId', message: 'Файл аватара не знайдено' },
      ]);
    }

    if (avatar.uploadedById !== userId) {
      throw AppError.forbidden('Avatar file belongs to another user');
    }

    if (avatar.kind !== FileKind.AVATAR || !avatar.isReady) {
      throw AppError.validation('Invalid avatar file', [
        {
          field: 'avatarFileId',
          message: 'Аватар має бути готовим файлом типу AVATAR',
        },
      ]);
    }
  }

  const updated = await updateProfile(userId, input);
  return toProfileResponse(updated);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await findProfileUserById(userId);

  if (user === null) {
    throw AppError.unauthorized('Account no longer exists');
  }

  if (user.passwordHash === null) {
    throw AppError.conflict('Password is not configured for this account');
  }

  const currentPasswordIsValid = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordIsValid) {
    throw AppError.validation('Current password is incorrect', [
      { field: 'currentPassword', message: 'Невірний поточний пароль' },
    ]);
  }

  const passwordHash = await hashPassword(input.newPassword);
  await updatePasswordHash(userId, passwordHash);
  await revokeAllSessions(userId);
}
