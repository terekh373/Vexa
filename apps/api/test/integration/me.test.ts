import { randomUUID } from 'node:crypto';
import { FileKind, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { register } from '../../src/modules/auth/auth.service.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();

async function resetState(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
}

async function createRegisteredUser() {
  const email = `me-${randomUUID()}@example.com`;
  const password = 'StrongPass123';
  const result = await register(
    { email, password, fullName: 'Initial Name' },
    { userAgent: null, ipAddress: null },
  );

  return { email, password, ...result };
}

describe('me profile integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('updates fullName and assigns an owned ready AVATAR file', async () => {
    const account = await createRegisteredUser();
    const avatar = await prisma.file.create({
      data: {
        uploadedById: account.user.id,
        kind: FileKind.AVATAR,
        storageKey: `avatar/${account.user.id}/${randomUUID()}.jpg`,
        originalName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1_024,
        isReady: true,
      },
    });

    const response = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${account.tokens.accessToken}`)
      .send({ fullName: 'Updated Student', avatarFileId: avatar.id });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: account.user.id,
      email: account.email,
      fullName: 'Updated Student',
      roles: ['STUDENT'],
      emailVerified: false,
      locale: 'uk',
    });

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: account.user.id },
      select: { fullName: true, avatarFileId: true },
    });
    expect(updated).toEqual({
      fullName: 'Updated Student',
      avatarFileId: avatar.id,
    });
  });

  it('rejects a foreign avatar and an owned avatar that is not ready', async () => {
    const account = await createRegisteredUser();
    const other = await prisma.user.create({
      data: {
        email: `other-${randomUUID()}@example.com`,
        fullName: 'Other User',
        roles: [UserRole.STUDENT],
      },
    });

    const foreignAvatar = await prisma.file.create({
      data: {
        uploadedById: other.id,
        kind: FileKind.AVATAR,
        storageKey: `avatar/${other.id}/${randomUUID()}.jpg`,
        originalName: 'foreign.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1_024,
        isReady: true,
      },
    });

    const foreign = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${account.tokens.accessToken}`)
      .send({ avatarFileId: foreignAvatar.id });
    expect(foreign.status).toBe(403);

    const pendingAvatar = await prisma.file.create({
      data: {
        uploadedById: account.user.id,
        kind: FileKind.AVATAR,
        storageKey: `avatar/${account.user.id}/${randomUUID()}.jpg`,
        originalName: 'pending.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1_024,
        isReady: false,
      },
    });

    const pending = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${account.tokens.accessToken}`)
      .send({ avatarFileId: pendingAvatar.id });
    expect(pending.status).toBe(400);
    expect(pending.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('changes password, revokes old refresh sessions and allows login with the new password', async () => {
    const account = await createRegisteredUser();
    const newPassword = 'NewStrongPass456';

    const response = await request(app)
      .post('/api/me/password')
      .set('Authorization', `Bearer ${account.tokens.accessToken}`)
      .send({ currentPassword: account.password, newPassword });
    expect(response.status).toBe(204);

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: account.tokens.refreshToken })
      .expect(401);

    const oldLogin = await request(app).post('/api/auth/login').send({
      email: account.email,
      password: account.password,
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/auth/login').send({
      email: account.email,
      password: newPassword,
    });
    expect(newLogin.status).toBe(200);
  });

  it('returns 400 for a wrong current password', async () => {
    const account = await createRegisteredUser();

    const response = await request(app)
      .post('/api/me/password')
      .set('Authorization', `Bearer ${account.tokens.accessToken}`)
      .send({ currentPassword: 'WrongPass123', newPassword: 'NewStrongPass456' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for an account that has no local password', async () => {
    const user = await prisma.user.create({
      data: {
        email: `google-${randomUUID()}@example.com`,
        fullName: 'Google User',
        googleId: randomUUID(),
        passwordHash: null,
        roles: [UserRole.STUDENT],
      },
    });
    const token = signAccessToken(user.id, user.roles);

    const response = await request(app)
      .post('/api/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Anything123', newPassword: 'NewStrongPass456' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });
});
