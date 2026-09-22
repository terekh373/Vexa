import {
  FileKind,
  Prisma,
  UserRole,
  UserStatus,
  type AuthorProfile,
  type User,
} from '@prisma/client';
import type { AuthResponse, AuthUser } from '@vexa/shared';
import { AppError } from '../../lib/errors.js';
import { issueTokens, revokeAllSessions, type SessionContext } from '../auth/auth.service.js';
import { hashPassword, verifyPassword } from '../auth/password.service.js';
import {
  createAuthorProfileAndGrantRole,
  findAuthorProfileByUserId,
  findAvatarFileById,
  findProfileUserById,
  updateAuthorProfileRecord,
  updatePasswordHash,
  updateProfile,
} from './me.repository.js';
import type {
  AuthorProfileCreateInput,
  AuthorProfileUpdateInput,
  ChangePasswordInput,
  UpdateMeInput,
} from './me.validation.js';

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

function toAuthorProfileResponse(profile: AuthorProfile) {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    headline: profile.headline,
    bio: profile.bio,
    isVerified: profile.isVerified,
    ratingAvg: Number(profile.ratingAvg),
    reviewsCount: profile.reviewsCount,
    studentsCount: profile.studentsCount,
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

export async function activateAuthorProfile(
  userId: string,
  input: AuthorProfileCreateInput,
  context: SessionContext,
): Promise<AuthResponse & { authorProfile: ReturnType<typeof toAuthorProfileResponse> }> {
  const [user, existingProfile] = await Promise.all([
    findProfileUserById(userId),
    findAuthorProfileByUserId(userId),
  ]);

  if (user === null) {
    throw AppError.unauthorized('Account no longer exists');
  }

  if (user.status === UserStatus.BLOCKED) {
    throw AppError.forbidden('Account is blocked');
  }

  if (existingProfile !== null || user.roles.includes(UserRole.AUTHOR)) {
    throw AppError.conflict('Author profile is already active');
  }

  try {
    const created = await createAuthorProfileAndGrantRole(userId, input);
    const tokens = await issueTokens(created.user, context);

    return {
      user: toProfileResponse(created.user),
      tokens,
      authorProfile: toAuthorProfileResponse(created.authorProfile),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('Author profile is already active');
    }

    throw error;
  }
}

export async function updateAuthorProfile(
  userId: string,
  input: AuthorProfileUpdateInput,
) {
  const user = await findProfileUserById(userId);

  if (user === null) {
    throw AppError.unauthorized('Account no longer exists');
  }

  if (user.status === UserStatus.BLOCKED) {
    throw AppError.forbidden('Account is blocked');
  }

  const profile = await findAuthorProfileByUserId(userId);
  if (profile === null || !user.roles.includes(UserRole.AUTHOR)) {
    throw AppError.notFound('Author profile not found');
  }

  const updated = await updateAuthorProfileRecord(userId, input);
  return toAuthorProfileResponse(updated);
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
