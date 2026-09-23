import { BalanceEntryType, PayoutMethod, PayoutStatus } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { sendPayoutRequestEmail } from '../../lib/mailer.js';
import { prisma } from '../../lib/prisma.js';
import { notifyPayoutRequested } from '../notifications/notifications.service.js';
import {
  allCourseStatuses,
  findAuthorBalance,
  findAuthorBalanceEntries,
  findAuthorPayouts,
  findAuthorReviews,
  loadAuthorDashboardSnapshot,
  payoutSelect,
} from './author.finance.repository.js';
import type {
  AuthorBalanceEntriesQuery,
  AuthorDashboardQuery,
  AuthorPayoutsQuery,
  AuthorReviewsQuery,
  CreatePayoutInput,
} from './author.finance.validation.js';

function periodStart(period: AuthorDashboardQuery['period']): Date | null {
  if (period === 'all') return null;
  const days = Number(period.slice(0, -1));
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return from;
}

export function maskPayoutDestination(method: PayoutMethod, destination: string): string {
  const normalized =
    method === PayoutMethod.CARD
      ? destination.replace(/[^0-9]/g, '')
      : destination.replace(/[\s-]/g, '').toUpperCase();
  const lastFour = normalized.slice(-4);
  if (lastFour.length !== 4) {
    throw AppError.validation('Invalid payout destination', [
      { field: 'destination', message: 'Destination must contain at least 4 characters' },
    ]);
  }

  return `**** ${lastFour}`;
}

export async function getAuthorDashboard(userId: string, query: AuthorDashboardQuery) {
  const snapshot = await loadAuthorDashboardSnapshot(userId, periodStart(query.period));
  const coursesByStatus = Object.fromEntries(allCourseStatuses.map((status) => [status, 0])) as Record<
    string,
    number
  >;

  for (const course of snapshot.courses) {
    coursesByStatus[course.status] = (coursesByStatus[course.status] ?? 0) + 1;
  }

  const revenueAmount = snapshot.orderItems.reduce(
    (sum, item) => sum + (item.authorAmount ?? 0),
    0,
  );

  return {
    period: query.period,
    salesCount: snapshot.orderItems.length,
    revenueAmount,
    studentsCount: snapshot.students.length,
    ratingAvg: snapshot.reviewAggregate._avg.rating ?? 0,
    reviewsCount: snapshot.reviewAggregate._count._all,
    coursesByStatus,
    currency: 'UAH',
  };
}

export async function getAuthorBalance(userId: string) {
  const balance = await findAuthorBalance(userId);

  return {
    availableAmount: balance?.availableAmount ?? 0,
    pendingAmount: balance?.pendingAmount ?? 0,
    withdrawnAmount: balance?.withdrawnAmount ?? 0,
    currency: balance?.currency ?? 'UAH',
    payoutMinAmount: env.PAYOUT_MIN_AMOUNT,
    updatedAt: balance?.updatedAt ?? null,
  };
}

export async function listAuthorBalanceEntries(userId: string, query: AuthorBalanceEntriesQuery) {
  const { items, total } = await findAuthorBalanceEntries(userId, query);
  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function listAuthorPayouts(userId: string, query: AuthorPayoutsQuery) {
  const { items, total } = await findAuthorPayouts(userId, query);
  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function listAuthorReviews(userId: string, query: AuthorReviewsQuery) {
  const { items, total } = await findAuthorReviews(userId, query);
  return {
    items: items.map((review) => ({
      ...review,
      hasReply: review.authorReply !== null,
    })),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function createAuthorPayout(userId: string, input: CreatePayoutInput) {
  if (input.amount < env.PAYOUT_MIN_AMOUNT) {
    throw AppError.validation('Payout amount is below the minimum', [
      {
        field: 'amount',
        message: `Minimum payout amount is ${env.PAYOUT_MIN_AMOUNT}`,
      },
    ]);
  }

  const destinationMasked = maskPayoutDestination(input.method, input.destination);

  const created = await prisma.$transaction(async (tx) => {
    const reserved = await tx.balance.updateMany({
      where: {
        userId,
        availableAmount: { gte: input.amount },
      },
      data: {
        availableAmount: { decrement: input.amount },
      },
    });

    if (reserved.count !== 1) {
      throw AppError.conflict('Insufficient available balance', [
        { field: 'amount', message: 'Amount exceeds available balance' },
      ]);
    }

    const payout = await tx.payout.create({
      data: {
        authorId: userId,
        amount: input.amount,
        method: input.method,
        destinationMasked,
        status: PayoutStatus.REQUESTED,
      },
      select: payoutSelect,
    });

    await tx.balanceEntry.create({
      data: {
        userId,
        type: BalanceEntryType.PAYOUT,
        amount: -input.amount,
        payoutId: payout.id,
        comment: 'Заявка на виплату',
      },
    });

    await notifyPayoutRequested(
      {
        authorId: userId,
        payoutId: payout.id,
        amount: payout.amount,
        currency: payout.currency,
      },
      tx,
    );

    const author = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    return { payout, email: author.email };
  });

  await sendPayoutRequestEmail({
    email: created.email,
    payoutId: created.payout.id,
    amount: `${(created.payout.amount / 100).toFixed(2)} ${created.payout.currency}`,
  });

  return created.payout;
}
