import { UserRole, type AuthorProfile, type User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface UpdateProfileData {
  fullName?: string;
  avatarFileId?: string | null;
}

export interface AuthorProfileData {
  displayName?: string;
  headline?: string | null;
  bio?: string | null;
}

export async function findProfileUserById(userId: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
}

export async function findAuthorProfileByUserId(userId: string): Promise<AuthorProfile | null> {
  return prisma.authorProfile.findUnique({ where: { userId } });
}

export async function findAvatarFileById(fileId: string) {
  return prisma.file.findFirst({
    where: { id: fileId, deletedAt: null },
    select: {
      id: true,
      uploadedById: true,
      kind: true,
      isReady: true,
    },
  });
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileData,
): Promise<User> {
  const data: UpdateProfileData = {};

  if (input.fullName !== undefined) {
    data.fullName = input.fullName;
  }

  if (input.avatarFileId !== undefined) {
    data.avatarFileId = input.avatarFileId;
  }

  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function createAuthorProfileAndGrantRole(
  userId: string,
  input: Required<Pick<AuthorProfileData, 'displayName'>> & AuthorProfileData,
): Promise<{ user: User; authorProfile: AuthorProfile }> {
  return prisma.$transaction(async (tx) => {
    const authorProfile = await tx.authorProfile.create({
      data: {
        userId,
        displayName: input.displayName,
        headline: input.headline ?? null,
        bio: input.bio ?? null,
      },
    });

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        roles: {
          push: UserRole.AUTHOR,
        },
      },
    });

    return { user, authorProfile };
  });
}

export async function updateAuthorProfileRecord(
  userId: string,
  input: AuthorProfileData,
): Promise<AuthorProfile> {
  const data: AuthorProfileData = {};

  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.headline !== undefined) data.headline = input.headline;
  if (input.bio !== undefined) data.bio = input.bio;

  return prisma.authorProfile.update({
    where: { userId },
    data,
  });
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
