import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';

const app = createApp();

const registerBody = {
  email: 'student@example.com',
  password: 'StrongPass123',
  fullName: 'Test Student',
};

async function resetState(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
}

describe('auth integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('registers with 201 and rejects a duplicate email with 409', async () => {
    const registered = await request(app).post('/api/auth/register').send(registerBody);

    expect(registered.status).toBe(201);
    expect(registered.body.user).toMatchObject({
      email: registerBody.email,
      fullName: registerBody.fullName,
      roles: ['STUDENT'],
    });
    expect(registered.body.tokens.accessToken).toEqual(expect.any(String));
    expect(registered.body.tokens.refreshToken).toEqual(expect.any(String));

    const duplicate = await request(app).post('/api/auth/register').send(registerBody);

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('logs in with 200 and rejects a wrong password with 401', async () => {
    await request(app).post('/api/auth/register').send(registerBody).expect(201);

    const login = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: registerBody.password,
    });

    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(registerBody.email);
    expect(login.body.tokens.refreshToken).toEqual(expect.any(String));

    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: 'WrongPass123',
    });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('UNAUTHORIZED');
  });

  it('forgot-password always answers 204 for valid email shapes', async () => {
    await request(app).post('/api/auth/register').send(registerBody).expect(201);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registerBody.email })
      .expect(204);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(204);
  });

  it('resets the password once and revokes all existing refresh sessions', async () => {
    const registered = await request(app).post('/api/auth/register').send(registerBody).expect(201);
    const firstRefreshToken = registered.body.tokens.refreshToken as string;

    const secondSession = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: registerBody.password,
    });
    expect(secondSession.status).toBe(200);
    const secondRefreshToken = secondSession.body.tokens.refreshToken as string;

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registerBody.email })
      .expect(204);

    const resetKeys = await redis.keys('password-reset:*');
    expect(resetKeys).toHaveLength(1);
    const resetToken = resetKeys[0]!.slice('password-reset:'.length);
    const newPassword = 'NewStrongPass456';

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword })
      .expect(204);

    const oldPasswordLogin = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: registerBody.password,
    });
    expect(oldPasswordLogin.status).toBe(401);

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: secondRefreshToken })
      .expect(401);

    const newPasswordLogin = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: newPassword,
    });
    expect(newPasswordLogin.status).toBe(200);

    const reused = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'AnotherPass789' });
    expect(reused.status).toBe(404);
    expect(reused.body.error.code).toBe('NOT_FOUND');
  });

  it('rotates refresh tokens and old-token reuse revokes every user session', async () => {
    const registered = await request(app).post('/api/auth/register').send(registerBody).expect(201);
    const firstRefreshToken = registered.body.tokens.refreshToken as string;

    // Open a second independent session. Reuse detection on the first session
    // must revoke this one too.
    const secondSession = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: registerBody.password,
    });
    expect(secondSession.status).toBe(200);
    const secondRefreshToken = secondSession.body.tokens.refreshToken as string;

    const rotated = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken });

    expect(rotated.status).toBe(200);
    expect(rotated.body.tokens.refreshToken).not.toBe(firstRefreshToken);

    const reuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken });

    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('UNAUTHORIZED');

    const revokedOtherSession = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: secondRefreshToken });

    expect(revokedOtherSession.status).toBe(401);
    expect(revokedOtherSession.body.error.code).toBe('UNAUTHORIZED');
  });
});
