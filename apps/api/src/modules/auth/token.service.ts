/**
 * JWT issuing and verification, plus the Redis allowlist of live refresh
 * tokens.
 *
 * Division of responsibility (see the hybrid decision in the SRS discussion):
 *   - Redis  — the source of truth for whether a refresh token is still valid.
 *              One GET per /auth/refresh call.
 *   - Postgres (refresh_tokens) — the session journal: device, IP, revocation
 *              time. Read for the "my sessions" screen and for reuse detection.
 */
import type { UserRole } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { generateTokenId } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { redis } from '../../lib/redis.js';

const ISSUER = 'vexa';
const AUDIENCE = 'vexa-api';

/**
 * @types/jsonwebtoken narrows `expiresIn` to a template literal type from the
 * `ms` package, so a plain string read from the environment does not satisfy
 * it. The value is validated by the env schema, hence the cast.
 */
const ACCESS_TTL = env.JWT_ACCESS_TTL as SignOptions['expiresIn'];
const REFRESH_TTL = env.JWT_REFRESH_TTL as SignOptions['expiresIn'];

export interface AccessTokenPayload {
  /** User id. `sub` is the registered JWT claim for the subject. */
  sub: string;
  roles: UserRole[];
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  /** Token id — the key under which this token lives in the Redis allowlist. */
  jti: string;
  type: 'refresh';
}

export interface IssuedRefreshToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

const allowlistKey = (jti: string): string => `refresh:${jti}`;
const userSessionsKey = (userId: string): string => `refresh:user:${userId}`;

// ---------------------------------------------------------------------------
// Access token
// ---------------------------------------------------------------------------

export function signAccessToken(userId: string, roles: UserRole[]): string {
  const payload: AccessTokenPayload = { sub: userId, roles, type: 'access' };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/** Throws AppError.unauthorized on any invalid, expired or foreign token. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: unknown;

  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }

  if (!isAccessPayload(decoded)) {
    throw AppError.unauthorized('Malformed access token');
  }

  return decoded;
}

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

/**
 * Signs a refresh token and registers it in the Redis allowlist.
 *
 * The Redis TTL is derived from the token's own `exp` claim, so the key can
 * never outlive the signature.
 */
export async function issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
  const jti = generateTokenId();
  const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };

  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const decoded = jwt.decode(token);
  if (decoded === null || typeof decoded !== 'object' || typeof decoded.exp !== 'number') {
    throw new Error('Signed refresh token has no exp claim');
  }

  const expiresAt = new Date(decoded.exp * 1000);
  const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);

  // Both writes in one round trip. The session set carries the same TTL so it
  // cannot outlive its members.
  await redis
    .multi()
    .set(allowlistKey(jti), userId, 'EX', ttlSeconds)
    .sadd(userSessionsKey(userId), jti)
    .expire(userSessionsKey(userId), ttlSeconds)
    .exec();

  return { token, jti, expiresAt };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  let decoded: unknown;

  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  if (!isRefreshPayload(decoded)) {
    throw AppError.unauthorized('Malformed refresh token');
  }

  return decoded;
}

/** A valid signature is not enough: the token must still be in the allowlist. */
export async function isRefreshTokenAllowed(jti: string): Promise<boolean> {
  return (await redis.exists(allowlistKey(jti))) === 1;
}

export async function revokeRefreshToken(jti: string, userId: string): Promise<void> {
  await redis.multi().del(allowlistKey(jti)).srem(userSessionsKey(userId), jti).exec();
}

/** Kills every session of a user. Called on logout-all and on reuse detection. */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const jtis = await redis.smembers(userSessionsKey(userId));

  const pipeline = redis.multi();
  for (const jti of jtis) {
    pipeline.del(allowlistKey(jti));
  }
  pipeline.del(userSessionsKey(userId));
  await pipeline.exec();
}

// ---------------------------------------------------------------------------
// Payload type guards
// ---------------------------------------------------------------------------

function isAccessPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    candidate.type === 'access' &&
    typeof candidate.sub === 'string' &&
    Array.isArray(candidate.roles) &&
    candidate.roles.every((role) => typeof role === 'string')
  );
}

function isRefreshPayload(value: unknown): value is RefreshTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    candidate.type === 'refresh' &&
    typeof candidate.sub === 'string' &&
    typeof candidate.jti === 'string'
  );
}