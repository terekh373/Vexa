import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  setMailTransportForTests,
  type MailMessage,
} from '../../src/lib/mailer.js';
import { redis } from '../../src/lib/redis.js';

const app = createApp();
const sentMessages: MailMessage[] = [];

const registration = {
  email: 'mail-flow@example.com',
  password: 'StrongPass123',
  fullName: 'Mail Flow User',
  acceptTerms: true,
};

async function resetState(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
  sentMessages.length = 0;
}

describe('transactional email and support integration', () => {
  beforeEach(async () => {
    await resetState();
    setMailTransportForTests(async (message) => {
      sentMessages.push(message);
    });
  });

  afterAll(async () => {
    setMailTransportForTests(null);
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('registers only with terms consent and emits a verification email', async () => {
    const withoutTerms = await request(app).post('/api/auth/register').send({
      email: 'no-terms@example.com',
      password: 'StrongPass123',
      fullName: 'No Terms User',
    });
    expect(withoutTerms.status).toBe(400);

    const registered = await request(app)
      .post('/api/auth/register')
      .send(registration);

    expect(registered.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: registration.email },
      select: { termsAcceptedAt: true },
    });
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.to[0]?.email).toBe(registration.email);
    expect(sentMessages[0]?.subject).toContain('підтвердіть email');
    expect(sentMessages[0]?.text).toContain('/verify-email?token=');
  });

  it('resends verification without revealing account existence', async () => {
    await request(app).post('/api/auth/register').send(registration).expect(201);
    sentMessages.length = 0;

    await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: registration.email })
      .expect(204);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.to[0]?.email).toBe(registration.email);

    await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'missing-account@example.com' })
      .expect(204);

    expect(sentMessages).toHaveLength(1);
  });

  it('sends a guest support request to the configured support mailbox', async () => {
    await request(app)
      .post('/api/support/contact')
      .send({
        name: 'Оксана Петренко',
        email: 'oksana@example.com',
        message: 'Потрібна допомога з доступом до придбаного курсу.',
      })
      .expect(204);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.subject).toContain('звернення');
    expect(sentMessages[0]?.replyTo?.email).toBe('oksana@example.com');
    expect(sentMessages[0]?.text).toContain('Потрібна допомога');
  });
});
