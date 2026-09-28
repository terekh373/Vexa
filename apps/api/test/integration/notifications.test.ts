import { randomUUID } from 'node:crypto';
import { NotificationType, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';
import {
  createNotification,
  notifyPayoutRequested,
  notifyPurchaseCompleted,
} from '../../src/modules/notifications/notifications.service.js';

const app = createApp();

interface Fixture {
  userId: string;
  userToken: string;
  otherUserId: string;
  otherUserToken: string;
  authorId: string;
  authorToken: string;
}

async function resetState(): Promise<void> {
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'notifications-' } },
  });
}

async function seedFixture(): Promise<Fixture> {
  const user = await prisma.user.create({
    data: {
      email: `notifications-user-${randomUUID()}@example.com`,
      fullName: 'Notifications User',
      roles: [UserRole.STUDENT],
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      email: `notifications-other-${randomUUID()}@example.com`,
      fullName: 'Notifications Other',
      roles: [UserRole.STUDENT],
    },
  });
  const author = await prisma.user.create({
    data: {
      email: `notifications-author-${randomUUID()}@example.com`,
      fullName: 'Notifications Author',
      roles: [UserRole.AUTHOR],
    },
  });

  return {
    userId: user.id,
    userToken: signAccessToken(user.id, user.roles),
    otherUserId: otherUser.id,
    otherUserToken: signAccessToken(otherUser.id, otherUser.roles),
    authorId: author.id,
    authorToken: signAccessToken(author.id, author.roles),
  };
}

describe('notifications integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('lists notifications with pagination and an unread counter', async () => {
    const fixture = await seedFixture();

    await createNotification({
      userId: fixture.userId,
      type: NotificationType.SYSTEM,
      title: 'Перше сповіщення',
    });
    await createNotification({
      userId: fixture.userId,
      type: NotificationType.ACCOUNT,
      title: 'Друге сповіщення',
    });
    await createNotification({
      userId: fixture.userId,
      type: NotificationType.REVIEW,
      title: 'Третє сповіщення',
    });

    await request(app).get('/api/me/notifications').expect(401);

    const response = await request(app)
      .get('/api/me/notifications?page=1&limit=2')
      .set('Authorization', `Bearer ${fixture.userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body).toMatchObject({
      unreadCount: 3,
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('marks one or all notifications read and returns 404 for another users notification', async () => {
    const fixture = await seedFixture();

    const own = await createNotification({
      userId: fixture.userId,
      type: NotificationType.SYSTEM,
      title: 'Власне сповіщення',
    });
    const foreign = await createNotification({
      userId: fixture.otherUserId,
      type: NotificationType.SYSTEM,
      title: 'Чуже сповіщення',
    });
    await createNotification({
      userId: fixture.userId,
      type: NotificationType.SYSTEM,
      title: 'Ще одне',
    });

    await request(app)
      .patch(`/api/me/notifications/${foreign.id}/read`)
      .set('Authorization', `Bearer ${fixture.userToken}`)
      .expect(404);

    await request(app)
      .patch(`/api/me/notifications/${own.id}/read`)
      .set('Authorization', `Bearer ${fixture.userToken}`)
      .expect(204);

    const beforeAll = await request(app)
      .get('/api/me/notifications')
      .set('Authorization', `Bearer ${fixture.userToken}`);
    expect(beforeAll.body.unreadCount).toBe(1);

    const markedAll = await request(app)
      .patch('/api/me/notifications/read-all')
      .set('Authorization', `Bearer ${fixture.userToken}`);
    expect(markedAll.status).toBe(200);
    expect(markedAll.body.updatedCount).toBe(1);

    const afterAll = await request(app)
      .get('/api/me/notifications')
      .set('Authorization', `Bearer ${fixture.userToken}`);
    expect(afterAll.body.unreadCount).toBe(0);
  });

  it('creates purchase notifications for the buyer and author and a payout notification for the author', async () => {
    const fixture = await seedFixture();
    const orderId = randomUUID();
    const courseId = randomUUID();

    await notifyPurchaseCompleted({
      buyerId: fixture.userId,
      orderId,
      items: [
        {
          courseId,
          courseTitle: 'Тестовий курс',
          authorId: fixture.authorId,
        },
      ],
    });
    await notifyPayoutRequested({
      authorId: fixture.authorId,
      payoutId: randomUUID(),
      amount: 12_345,
      currency: 'UAH',
    });

    const buyer = await request(app)
      .get('/api/me/notifications')
      .set('Authorization', `Bearer ${fixture.userToken}`);
    expect(buyer.status).toBe(200);
    expect(buyer.body.unreadCount).toBe(1);
    expect(buyer.body.items[0]).toMatchObject({
      type: 'PURCHASE',
      payload: { href: '/orders', orderId },
    });

    const author = await request(app)
      .get('/api/me/notifications')
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(author.status).toBe(200);
    expect(author.body.unreadCount).toBe(2);
    expect(author.body.items.map((item: { type: string }) => item.type).sort()).toEqual([
      'PAYOUT',
      'PURCHASE',
    ]);
  });
});
