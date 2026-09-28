import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface VerifiedGoogleProfile {
  sub: string;
  email: string;
  name: string;
}

export async function findActiveByGoogleId(googleId: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { googleId, deletedAt: null },
  });
}

export async function findActiveGoogleUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
}

export async function linkGoogleAccount(userId: string, googleId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      googleId,
      emailVerifiedAt: new Date(),
    },
  });
}

export async function createGoogleUser(profile: VerifiedGoogleProfile): Promise<User> {
  return prisma.user.create({
    data: {
      email: profile.email,
      fullName: profile.name,
      googleId: profile.sub,
      passwordHash: null,
      emailVerifiedAt: new Date(),
      // roles defaults to [STUDENT]. A Google-only account intentionally has
      // no local password until a separate password-setting flow is used.
    },
  });
}
