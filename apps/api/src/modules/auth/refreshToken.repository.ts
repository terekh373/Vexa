/**
 * Persistence for the refresh_tokens table — the session journal.
 *
 * Only Prisma calls live here: business rules belong to auth.service.
 */
import type { RefreshToken } from '@prisma/client';
import { sha256Hex } from '../../lib/crypto.js';
import { prisma } from '../../lib/prisma.js';

export interface CreateRefreshTokenInput {
  userId: string;
  jti: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export async function createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshToken> {
  return prisma.refreshToken.create({
    data: {
      userId: input.userId,
      // The raw jti is never stored: a database dump must not hand over
      // usable session identifiers.
      tokenHash: sha256Hex(input.jti),
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    },
  });
}

export async function findByJti(jti: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({
    where: { tokenHash: sha256Hex(jti) },
  });
}

/** Marks one session as revoked. Idempotent: re-revoking is a no-op. */
export async function revokeByJti(jti: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256Hex(jti), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllByUserId(userId: string): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return result.count;
}