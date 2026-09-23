import {
  CourseStatus,
  OrderStatus,
  ReviewStatus,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  AuthorBalanceEntriesQuery,
  AuthorPayoutsQuery,
  AuthorReviewsQuery,
} from './author.finance.validation.js';

export async function loadAuthorDashboardSnapshot(userId: string, from: Date | null) {
  const [orderItems, students, reviewAggregate, courseStatusGroups] = await prisma.$transaction([
    prisma.orderItem.findMany({
      where: {
        authorId: userId,
        authorAmount: { not: null },
        order: {
          status: OrderStatus.PAID,
          ...(from === null ? {} : { paidAt: { gte: from } }),
        },
      },
      select: {
        authorAmount: true,
      },
    }),
    prisma.enrollment.findMany({
      where: {
        revokedAt: null,
        ...(from === null ? {} : { createdAt: { gte: from } }),
        course: {
          authorId: userId,
          deletedAt: null,
        },
      },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.review.aggregate({
      where: {
        status: ReviewStatus.PUBLISHED,
        ...(from === null ? {} : { createdAt: { gte: from } }),
        course: {
          authorId: userId,
          deletedAt: null,
        },
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.course.groupBy({
      by: ['status'],
      where: { authorId: userId, deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  return { orderItems, students, reviewAggregate, courseStatusGroups };
}

export async function findAuthorBalance(userId: string) {
  return prisma.balance.findUnique({
    where: { userId },
    select: {
      availableAmount: true,
      pendingAmount: true,
      withdrawnAmount: true,
      currency: true,
      updatedAt: true,
    },
  });
}

const balanceEntrySelect = {
  id: true,
  type: true,
  amount: true,
  comment: true,
  createdAt: true,
  orderItem: {
    select: {
      id: true,
      titleSnapshot: true,
    },
  },
  payout: {
    select: {
      id: true,
      status: true,
      method: true,
      destinationMasked: true,
    },
  },
} satisfies Prisma.BalanceEntrySelect;

export async function findAuthorBalanceEntries(
  userId: string,
  query: AuthorBalanceEntriesQuery,
) {
  const where: Prisma.BalanceEntryWhereInput = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.balanceEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: balanceEntrySelect,
    }),
    prisma.balanceEntry.count({ where }),
  ]);

  return { items, total };
}

const payoutSelect = {
  id: true,
  amount: true,
  currency: true,
  method: true,
  destinationMasked: true,
  status: true,
  comment: true,
  processedAt: true,
  createdAt: true,
} satisfies Prisma.PayoutSelect;

export async function findAuthorPayouts(userId: string, query: AuthorPayoutsQuery) {
  const where: Prisma.PayoutWhereInput = { authorId: userId };
  const [items, total] = await prisma.$transaction([
    prisma.payout.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: payoutSelect,
    }),
    prisma.payout.count({ where }),
  ]);

  return { items, total };
}

const authorReviewSelect = {
  id: true,
  rating: true,
  text: true,
  authorReply: true,
  authorRepliedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
    },
  },
  course: {
    select: {
      id: true,
      title: true,
      slug: true,
    },
  },
} satisfies Prisma.ReviewSelect;

export async function findAuthorReviews(userId: string, query: AuthorReviewsQuery) {
  const where: Prisma.ReviewWhereInput = {
    status: ReviewStatus.PUBLISHED,
    course: {
      authorId: userId,
      deletedAt: null,
    },
  };

  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: authorReviewSelect,
    }),
    prisma.review.count({ where }),
  ]);

  return { items, total };
}

export const allCourseStatuses: readonly CourseStatus[] = Object.values(CourseStatus);
export { payoutSelect };
