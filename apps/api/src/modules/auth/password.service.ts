import { hash, verify, type Algorithm } from '@node-rs/argon2';
import { logger } from '../../lib/logger.js';

/**
 * Algorithm.Argon2id from @node-rs/argon2 is an ambient const enum, which
 * `verbatimModuleSyntax` forbids reading. The numeric value is part of the
 * library's public surface, so we pin it here and keep the type annotation.
 * Verified by the `$argon2id$` prefix of every produced hash.
 */
const ARGON2ID = 2 as Algorithm;

const HASH_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // KiB — 19 MiB per hash operation
  timeCost: 2, // number of iterations
  parallelism: 1, // threads; 1 keeps the event loop predictable
} as const;

/**
 * Precomputed hash of a throwaway value.
 *
 * Used to burn the same CPU time when the email does not exist as when it
 * does. Without it, a failed login answers measurably faster for unknown
 * emails, which turns the endpoint into a user-enumeration oracle.
 */
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hash('dummy-password-for-timing-equalisation', HASH_OPTIONS);
  return dummyHashPromise;
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, HASH_OPTIONS);
}

/**
 * Verifies a password against a stored hash.
 *
 * Pass `null` when the user was not found or signed up via Google only: the
 * comparison still runs against the dummy hash and always returns false.
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string | null,
): Promise<boolean> {
  if (storedHash === null) {
    await verify(await getDummyHash(), plainPassword);
    return false;
  }

  try {
    return await verify(storedHash, plainPassword);
  } catch (error) {
    // A malformed hash in the database must not read as a successful login.
    logger.error({ err: error }, 'Password verification failed');
    return false;
  }
}