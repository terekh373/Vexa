/**
 * Email confirmation (SRS 15.1).
 *
 * The token lives in Redis only: it is short-lived and single-use, so a table
 * and a migration would buy nothing. Delivery is stubbed at this stage — the
 * link goes to the log, per the issue scope.
 */
import { randomBytes } from 'node:crypto';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { redis } from '../../lib/redis.js';
import { markEmailVerified } from './auth.repository.js';

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

const verificationKey = (token: string): string => `email-verify:${token}`;

/** 32 random bytes, base64url — safe to place in a URL as-is. */
function generateVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createVerificationToken(userId: string): Promise<string> {
  const token = generateVerificationToken();
  await redis.set(verificationKey(token), userId, 'EX', TOKEN_TTL_SECONDS);

  return token;
}

/**
 * Placeholder for the mail transport. Replaced by a real provider in the
 * notifications issue; the signature stays the same.
 */
export function sendVerificationEmail(email: string, token: string): void {
  logger.info(
    { email, verificationUrl: `/api/auth/verify-email?token=${token}` },
    'Verification email (delivery stubbed)',
  );
}

/**
 * Consumes a token.
 *
 * GETDEL would be a single round trip, but it requires Redis 6.2+. A
 * MULTI/EXEC transaction is executed atomically as well and runs on any
 * version, so two parallel requests still cannot both consume one token.
 */
export async function consumeVerificationToken(token: string): Promise<string> {
  const key = verificationKey(token);

  const results = await redis.multi().get(key).del(key).exec();

  // exec() returns null when the transaction was aborted.
  if (results === null) {
    throw AppError.notFound('Verification token is invalid or expired');
  }

  // Each entry is [error, value]; the first one belongs to GET.
  const userId = results[0]?.[1];

  if (typeof userId !== 'string') {
    throw AppError.notFound('Verification token is invalid or expired');
  }

  await markEmailVerified(userId);

  return userId;
}