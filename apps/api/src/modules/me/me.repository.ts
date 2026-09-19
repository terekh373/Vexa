import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface UpdateProfileData {
  fullName?: string;
  avatarFileId?: string | null;
}

export async function findProfileUserById(userId: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
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

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
