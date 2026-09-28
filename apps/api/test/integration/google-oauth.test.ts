import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { register } from '../../src/modules/auth/auth.service.js';
import {
  createGoogleExchangeCodeForUser,
  resolveGoogleUser,
} from '../../src/modules/auth/googleOAuth.service.js';

const app = createApp();
const context = { userAgent: 'google-oauth-test', ipAddress: '127.0.0.1' };

async function resetState(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
}

describe('Google OAuth integration', () => {
  beforeEach(resetState);

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('links a verified Google identity to an existing account with the same email', async () => {
    const registered = await register(
      {
        email: 'linked@example.com',
        password: 'StrongPass123',
        fullName: 'Existing User',
        acceptTerms: true,
      },
      context,
    );

    const user = await resolveGoogleUser({
      sub: 'google-sub-linked',
      email: 'linked@example.com',
      email_verified: true,
      name: 'Google Name',
    });

    expect(user.id).toBe(registered.user.id);
    expect(user.googleId).toBe('google-sub-linked');
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(await prisma.user.count({ where: { email: 'linked@example.com' } })).toBe(1);
  });

  it('consumes the web exchange code only once', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'once@example.com',
        fullName: 'Once User',
        googleId: 'google-once',
        passwordHash: null,
        emailVerifiedAt: new Date(),
      },
    });
    const code = await createGoogleExchangeCodeForUser(user.id);

    const first = await request(app).post('/api/auth/google/exchange').send({ code });
    expect(first.status).toBe(200);
    expect(first.body.user.email).toBe('once@example.com');
    expect(first.body.tokens.accessToken).toEqual(expect.any(String));
    expect(first.body.tokens.refreshToken).toEqual(expect.any(String));

    const reused = await request(app).post('/api/auth/google/exchange').send({ code });
    expect(reused.status).toBe(404);
    expect(reused.body.error.code).toBe('NOT_FOUND');
  });

  it('does not issue tokens to a blocked Google user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'blocked-google@example.com',
        fullName: 'Blocked User',
        googleId: 'google-blocked',
        passwordHash: null,
        emailVerifiedAt: new Date(),
        status: 'BLOCKED',
      },
    });
    const code = await createGoogleExchangeCodeForUser(user.id);

    const response = await request(app).post('/api/auth/google/exchange').send({ code });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
