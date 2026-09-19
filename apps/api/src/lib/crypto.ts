/**
 * Small crypto helpers shared across modules.
 */
import { createHash, randomUUID } from 'node:crypto';

/** Hex SHA-256 digest. 64 characters, fits refresh_tokens.token_hash. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Token identifier (jti). Random UUID v4 — 122 bits of entropy. */
export function generateTokenId(): string {
  return randomUUID();
}