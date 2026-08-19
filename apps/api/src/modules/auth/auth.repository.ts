/**
 * Persistence for the users table. Prisma calls only — no business rules.
 */
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
}

/**
 * Soft-deleted accounts are invisible to authentication: the row survives for
 * order history, but its owner can no longer sign in.
 */
export async function findActiveByEmail(email: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
}

export async function findActiveById(id: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      // roles defaults to [STUDENT] in the schema: one account, roles added
      // later without a second sign-up (SRS 15.1).
    },
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
}

/** True when the address is taken, including by a soft-deleted account. */
export async function emailExists(email: string): Promise<boolean> {
  const found = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return found !== null;
}