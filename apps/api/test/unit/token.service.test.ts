import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { AppError } from '../../src/lib/errors.js';
import { redis } from '../../src/lib/redis.js';
import {
  isRefreshTokenAllowed,
  issueRefreshToken,
  revokeRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/modules/auth/token.service.js';

const ISSUER = 'vexa';
const AUDIENCE = 'vexa-api';

function expectUnauthorized(action: () => unknown): void {
  try {
    action();
    throw new Error('Expected action to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(401);
  }
}

describe('token.service', () => {
  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  it('signs and verifies access tokens', () => {
    const token = signAccessToken('user-1', ['STUDENT']);

    expect(verifyAccessToken(token)).toMatchObject({
      sub: 'user-1',
      roles: ['STUDENT'],
      type: 'access',
    });
  });

  it('rejects a token signed with a foreign secret with 401', () => {
    const token = jwt.sign(
      { sub: 'user-1', roles: ['STUDENT'], type: 'access' },
      'foreign-secret-that-is-definitely-long-enough',
      { issuer: ISSUER, audience: AUDIENCE, expiresIn: '15m' },
    );

    expectUnauthorized(() => verifyAccessToken(token));
  });

  it('rejects an expired token with 401', () => {
    const token = jwt.sign(
      { sub: 'user-1', roles: ['STUDENT'], type: 'access' },
      env.JWT_ACCESS_SECRET,
      { issuer: ISSUER, audience: AUDIENCE, expiresIn: -1 },
    );

    expectUnauthorized(() => verifyAccessToken(token));
  });

  it('rejects a refresh token signed with a foreign secret with 401', () => {
    const token = jwt.sign(
      { sub: 'user-1', jti: 'refresh-1', type: 'refresh' },
      'foreign-refresh-secret-that-is-long-enough',
      { issuer: ISSUER, audience: AUDIENCE, expiresIn: '30d' },
    );

    expectUnauthorized(() => verifyRefreshToken(token));
  });

  it('rejects an expired refresh token with 401', () => {
    const token = jwt.sign(
      { sub: 'user-1', jti: 'refresh-1', type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { issuer: ISSUER, audience: AUDIENCE, expiresIn: -1 },
    );

    expectUnauthorized(() => verifyRefreshToken(token));
  });

  it('signs refresh tokens and keeps their jti in the Redis allowlist', async () => {
    const issued = await issueRefreshToken('user-1');
    const payload = verifyRefreshToken(issued.token);

    expect(payload).toMatchObject({ sub: 'user-1', jti: issued.jti, type: 'refresh' });
    await expect(isRefreshTokenAllowed(issued.jti)).resolves.toBe(true);

    await revokeRefreshToken(issued.jti, 'user-1');
    await expect(isRefreshTokenAllowed(issued.jti)).resolves.toBe(false);
  });
});
