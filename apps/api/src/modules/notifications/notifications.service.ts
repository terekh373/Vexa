import { NotificationType, type Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import {
  createNotificationRecord,
  findNotifications,
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
  type CreateNotificationData,
  type NotificationDbClient,
} from './notifications.repository.js';
import type { NotificationsQuery } from './notifications.validation.js';

const TITLE_MAX_LENGTH = 180;

function title(value: string): string {
  return value.length > TITLE_MAX_LENGTH ? value.slice(0, TITLE_MAX_LENGTH) : value;
}

export async function createNotification(
  input: CreateNotificationData,
  db: NotificationDbClient = prisma,
) {
  return createNotificationRecord(db, input);
}

export async function listNotifications(userId: string, query: NotificationsQuery) {
  const { items, total, unreadCount } = await findNotifications(userId, query);

  return {
    items,
    unreadCount,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const found = await markNotificationReadForUser(userId, notificationId);
  if (!found) throw AppError.notFound('Notification not found');
}

export async function markAllNotificationsRead(userId: string) {
  const updatedCount = await markAllNotificationsReadForUser(userId);
  return { updatedCount };
}

export interface PurchaseNotificationItem {
  courseId: string;
  courseTitle: string;
  authorId: string;
}

/**
 * Creates the buyer notification and one notification per affected author.
 * Payment processing can pass its transaction client so access opening,
 * ledger writes and notifications stay atomic.
 */
export async function notifyPurchaseCompleted(
  input: {
    buyerId: string;
    orderId: string;
    items: PurchaseNotificationItem[];
  },
  db: NotificationDbClient = prisma,
): Promise<void> {
  await createNotification(
    {
      userId: input.buyerId,
      type: NotificationType.PURCHASE,
      title: 'Покупку підтверджено',
      body:
        input.items.length === 1
          ? `Курс «${input.items[0]?.courseTitle ?? ''}» доступний у вашому навчанні.`
          : `Доступ відкрито до ${input.items.length} курсів.`,
      payload: { href: '/orders', orderId: input.orderId },
    },
    db,
  );

  for (const item of input.items) {
    await createNotification(
      {
        userId: item.authorId,
        type: NotificationType.PURCHASE,
        title: title(`Новий продаж: «${item.courseTitle}»`),
        body: 'Курс придбано. Нарахування відображатиметься у балансі автора.',
        payload: {
          href: '/author/balance',
          orderId: input.orderId,
          courseId: item.courseId,
        },
      },
      db,
    );
  }
}

export async function notifyNewReview(
  input: {
    authorId: string;
    courseId: string;
    courseTitle: string;
    reviewId: string;
    rating: number;
  },
  db: NotificationDbClient = prisma,
): Promise<void> {
  await createNotification(
    {
      userId: input.authorId,
      type: NotificationType.REVIEW,
      title: title(`Новий відгук: «${input.courseTitle}»`),
      body: `Оцінка: ${input.rating}/5`,
      payload: {
        href: '/author/reviews',
        courseId: input.courseId,
        reviewId: input.reviewId,
      },
    },
    db,
  );
}

export async function notifyPayoutRequested(
  input: { authorId: string; payoutId: string; amount: number; currency: string },
  db: NotificationDbClient = prisma,
): Promise<void> {
  await createNotification(
    {
      userId: input.authorId,
      type: NotificationType.PAYOUT,
      title: 'Заявку на виплату створено',
      body: `Сума: ${(input.amount / 100).toFixed(2)} ${input.currency}`,
      payload: { href: '/author/balance', payoutId: input.payoutId },
    },
    db,
  );
}

export async function notifyModerationResult(
  input: {
    authorId: string;
    courseId: string;
    courseTitle: string;
    status: 'PUBLISHED' | 'REJECTED' | 'UNPUBLISHED';
    comment?: string | null;
  },
  db: NotificationDbClient = prisma,
): Promise<void> {
  const verb =
    input.status === 'PUBLISHED'
      ? 'опубліковано'
      : input.status === 'REJECTED'
        ? 'відхилено'
        : 'знято з публікації';

  await createNotification(
    {
      userId: input.authorId,
      type: NotificationType.MODERATION,
      title: title(`Курс «${input.courseTitle}» ${verb}`),
      body: input.comment ?? null,
      payload: {
        href: `/author/courses/${input.courseId}/edit`,
        courseId: input.courseId,
        status: input.status,
      },
    },
    db,
  );
}

export type NotificationPayload = Prisma.JsonValue;
