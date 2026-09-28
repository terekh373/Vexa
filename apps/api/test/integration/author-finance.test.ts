import { randomUUID } from 'node:crypto';
import {
  BalanceEntryType,
  ContentType,
  CourseStatus,
  EnrollmentSource,
  OrderStatus,
  PayoutStatus,
  ReviewStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();
const CATEGORY_SLUG = 'author-finance-category';
const EMAIL_PREFIX = 'author-finance-';

interface Fixture {
  authorId: string;
  authorToken: string;
  studentId: string;
  studentToken: string;
  courseId: string;
}

async function resetState(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  const courses = await prisma.course.findMany({
    where: { authorId: { in: userIds } },
    select: { id: true },
  });
  const courseIds = courses.map((course) => course.id);

  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.balanceEntry.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.payout.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.balance.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.review.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.enrollment.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.authorProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(availableAmount = 100_000): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Фінанси автора' },
  });
  const author = await prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}author-${randomUUID()}@example.com`,
      fullName: 'Finance Author',
      roles: [UserRole.AUTHOR],
    },
  });
  await prisma.authorProfile.create({
    data: { userId: author.id, displayName: 'Finance Author' },
  });
  const student = await prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}student-${randomUUID()}@example.com`,
      fullName: 'Finance Student',
      roles: [UserRole.STUDENT],
    },
  });
  const course = await prisma.course.create({
    data: {
      authorId: author.id,
      categoryId: category.id,
      type: ContentType.COURSE,
      status: CourseStatus.PUBLISHED,
      slug: `finance-course-${randomUUID()}`,
      title: 'Курс про фінанси',
      shortDescription: 'Опис',
      description: 'Повний опис',
      priceAmount: 10_000,
      publishedAt: new Date(),
    },
  });
  await prisma.balance.create({
    data: { userId: author.id, availableAmount },
  });

  return {
    authorId: author.id,
    authorToken: signAccessToken(author.id, author.roles),
    studentId: student.id,
    studentToken: signAccessToken(student.id, student.roles),
    courseId: course.id,
  };
}

async function seedDashboardData(fixture: Fixture): Promise<void> {
  const order = await prisma.order.create({
    data: {
      userId: fixture.studentId,
      status: OrderStatus.PAID,
      totalAmount: 10_000,
      paidAt: new Date(),
    },
  });
  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      courseId: fixture.courseId,
      authorId: fixture.authorId,
      titleSnapshot: 'Курс про фінанси',
      priceAmount: 10_000,
      commissionRateBps: 1500,
      commissionAmount: 1500,
      authorAmount: 8500,
    },
  });
  await prisma.enrollment.create({
    data: {
      userId: fixture.studentId,
      courseId: fixture.courseId,
      orderItemId: orderItem.id,
      source: EnrollmentSource.PURCHASE,
    },
  });
  await prisma.review.create({
    data: {
      userId: fixture.studentId,
      courseId: fixture.courseId,
      rating: 5,
      text: 'Чудовий курс',
      status: ReviewStatus.PUBLISHED,
    },
  });
}

describe('author finance integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('returns dashboard metrics from paid order items and current author data', async () => {
    const fixture = await seedFixture();
    await seedDashboardData(fixture);

    const response = await request(app)
      .get('/api/author/dashboard?period=30d')
      .set('Authorization', `Bearer ${fixture.authorToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      period: '30d',
      salesCount: 1,
      revenueAmount: 8500,
      studentsCount: 1,
      ratingAvg: 5,
      reviewsCount: 1,
      currency: 'UAH',
      coursesByStatus: { PUBLISHED: 1 },
    });
  });

  it('forbids a student from author finance endpoints', async () => {
    const fixture = await seedFixture();

    await request(app)
      .get('/api/author/balance')
      .set('Authorization', `Bearer ${fixture.studentToken}`)
      .expect(403);
  });

  it('rejects payout amounts below the configured minimum and above available balance', async () => {
    const fixture = await seedFixture(env.PAYOUT_MIN_AMOUNT);

    const belowMinimum = await request(app)
      .post('/api/author/payouts')
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .send({
        amount: env.PAYOUT_MIN_AMOUNT - 1,
        method: 'CARD',
        destination: '4444 3333 2222 1111',
      });
    expect(belowMinimum.status).toBe(400);

    const aboveAvailable = await request(app)
      .post('/api/author/payouts')
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .send({
        amount: env.PAYOUT_MIN_AMOUNT + 1,
        method: 'CARD',
        destination: '4444 3333 2222 1111',
      });
    expect(aboveAvailable.status).toBe(409);
  });

  it('creates a payout atomically, stores only the masked destination and exposes histories', async () => {
    const fixture = await seedFixture(100_000);
    const fullDestination = '4444 3333 2222 1111';

    const response = await request(app)
      .post('/api/author/payouts')
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .send({ amount: 60_000, method: 'CARD', destination: fullDestination });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      amount: 60_000,
      method: 'CARD',
      destinationMasked: '**** 1111',
      status: PayoutStatus.REQUESTED,
    });
    expect(JSON.stringify(response.body)).not.toContain(fullDestination);

    const balance = await prisma.balance.findUniqueOrThrow({ where: { userId: fixture.authorId } });
    expect(balance.availableAmount).toBe(40_000);

    const entry = await prisma.balanceEntry.findFirstOrThrow({
      where: { userId: fixture.authorId, type: BalanceEntryType.PAYOUT },
    });
    expect(entry.amount).toBe(-60_000);

    const dbPayout = await prisma.payout.findFirstOrThrow({ where: { authorId: fixture.authorId } });
    expect(dbPayout.destinationMasked).toBe('**** 1111');
    expect(JSON.stringify(dbPayout)).not.toContain(fullDestination);

    const balanceHistory = await request(app)
      .get('/api/author/balance/entries')
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(balanceHistory.status).toBe(200);
    expect(balanceHistory.body.items[0]).toMatchObject({ type: 'PAYOUT', amount: -60_000 });

    const payouts = await request(app)
      .get('/api/author/payouts')
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(payouts.status).toBe(200);
    expect(payouts.body.items[0]).toMatchObject({
      amount: 60_000,
      destinationMasked: '**** 1111',
      status: 'REQUESTED',
    });
  });

  it('does not let parallel payout requests make the balance negative', async () => {
    const fixture = await seedFixture(100_000);
    const makeRequest = () =>
      request(app)
        .post('/api/author/payouts')
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send({ amount: 60_000, method: 'CARD', destination: '4444 3333 2222 1111' });

    const [first, second] = await Promise.all([makeRequest(), makeRequest()]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);

    const balance = await prisma.balance.findUniqueOrThrow({ where: { userId: fixture.authorId } });
    expect(balance.availableAmount).toBe(40_000);
    expect(balance.availableAmount).toBeGreaterThanOrEqual(0);
    expect(await prisma.payout.count({ where: { authorId: fixture.authorId } })).toBe(1);
  });

  it('lists course reviews with reply state', async () => {
    const fixture = await seedFixture();
    await seedDashboardData(fixture);

    const first = await request(app)
      .get('/api/author/reviews')
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(first.status).toBe(200);
    expect(first.body.items[0]).toMatchObject({
      rating: 5,
      hasReply: false,
      course: { id: fixture.courseId },
      user: { id: fixture.studentId },
    });

    const reviewId = first.body.items[0].id as string;
    await request(app)
      .post(`/api/author/reviews/${reviewId}/reply`)
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .send({ text: 'Дякую!' })
      .expect(200);

    const second = await request(app)
      .get('/api/author/reviews')
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(second.body.items[0]).toMatchObject({
      id: reviewId,
      hasReply: true,
      authorReply: 'Дякую!',
    });
  });
});
