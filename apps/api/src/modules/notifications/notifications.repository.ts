import { type NotificationType, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { NotificationsQuery } from './notifications.validation.js';

export type NotificationDbClient = Prisma.TransactionClient | typeof prisma;

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  payload?: Prisma.InputJsonValue;
}

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  payload: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export async function createNotificationRecord(
  db: NotificationDbClient,
  input: CreateNotificationData,
): Promise<NotificationRecord> {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      ...(input.payload === undefined ? {} : { payload: input.payload }),
    },
    select: notificationSelect,
  });
}

export async function findNotifications(
  userId: string,
  query: NotificationsQuery,
): Promise<{ items: NotificationRecord[]; total: number; unreadCount: number }> {
  const where: Prisma.NotificationWhereInput = { userId };

  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: notificationSelect,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { items, total, unreadCount };
}

export async function markNotificationReadForUser(userId: string, notificationId: string): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });

  return result.count > 0;
}

export async function markAllNotificationsReadForUser(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return result.count;
}
