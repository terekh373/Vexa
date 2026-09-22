/**
 * Persistence for checkout and the LiqPay webhook.
 *
 * The webhook handler follows the same split as orders.createOrderFromCart:
 * this repository owns the transaction and the row locks, the service
 * supplies a pure decision function that never touches Prisma.
 */
import { randomUUID } from 'node:crypto';
import {
  BalanceEntryType,
  EnrollmentSource,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  type Prisma,
} from '@prisma/client';
import { sha256Hex } from '../../lib/crypto.js';
import { prisma } from '../../lib/prisma.js';

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CheckoutOrder {
  id: string;
  number: number;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
}

export async function findOrderForCheckout(userId: string, orderId: string): Promise<CheckoutOrder | null> {
  return prisma.order.findFirst({
    where: { id: orderId, userId, deletedAt: null },
    select: { id: true, number: true, status: true, totalAmount: true, currency: true },
  });
}

export interface CheckoutPayment {
  id: string;
  amount: number;
  currency: string;
}

export async function findReusablePayment(orderId: string): Promise<CheckoutPayment | null> {
  return prisma.payment.findFirst({
    where: {
      orderId,
      provider: PaymentProvider.LIQPAY,
      status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, amount: true, currency: true },
  });
}

export async function createPayment(
  orderId: string,
  amount: number,
  currency: string,
): Promise<CheckoutPayment> {
  return prisma.payment.create({
    data: { orderId, provider: PaymentProvider.LIQPAY, status: PaymentStatus.CREATED, amount, currency },
    select: { id: true, amount: true, currency: true },
  });
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export interface WebhookCallback {
  kind: 'success' | 'failure' | 'pending' | 'ignored';
  rawStatus: string;
  amount: number;
  currency: string;
  providerPaymentId: string | null;
  errCode: string | null;
  errDescription: string | null;
}

export interface WebhookPaymentSnapshot {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
}

export interface WebhookOrderItemSnapshot {
  id: string;
  courseId: string;
  authorId: string;
  titleSnapshot: string;
  priceAmount: number;
  authorCommissionRateBps: number | null;
}

export interface WebhookOrderSnapshot {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  items: WebhookOrderItemSnapshot[];
}

export interface WebhookEnrollmentSnapshot {
  id: string;
  courseId: string;
  revokedAt: Date | null;
}

export interface WebhookSnapshot {
  callback: WebhookCallback;
  payment: WebhookPaymentSnapshot | null;
  order: WebhookOrderSnapshot | null;
  enrollments: WebhookEnrollmentSnapshot[];
  defaultCommissionBps: number;
}

export interface FulfilItem {
  orderItemId: string;
  courseId: string;
  authorId: string;
  titleSnapshot: string;
  commissionRateBps: number;
  commissionAmount: number;
  authorAmount: number;
  /** id of a revoked enrollment on this course to reactivate, if one exists. */
  reactivateEnrollmentId: string | null;
}

export type WebhookDecision =
  | { kind: 'noop'; eventError: string }
  | { kind: 'mark-pending' }
  | { kind: 'fail'; reason: 'PROVIDER_FAILURE' | 'AMOUNT_MISMATCH'; failureReason: string; failOrder: boolean }
  | { kind: 'success-no-fulfil'; failureReason: 'ORDER_ALREADY_PAID' | 'COURSE_ALREADY_OWNED' }
  | { kind: 'fulfil'; items: FulfilItem[] };

function eventErrorFor(decision: WebhookDecision): string | null {
  if (decision.kind === 'noop') return decision.eventError;
  if (decision.kind === 'success-no-fulfil') return decision.failureReason;
  return null;
}

export async function logRejectedWebhook(input: { data: string; signature: string }): Promise<void> {
  // The idempotency key is never derived from the unverified request body:
  // doing so would let an attacker pre-claim the key a genuine payment will
  // later need, before that payment's real, correctly-signed callback ever
  // arrives.
  await prisma.paymentWebhookEvent.create({
    data: {
      provider: PaymentProvider.LIQPAY,
      externalId: `invalid-signature:${randomUUID()}`,
      payload: { data: input.data, signature: input.signature },
      signatureValid: false,
      paymentId: null,
      error: 'INVALID_SIGNATURE',
    },
  });
}

export async function logMalformedWebhook(data: string, decoded: unknown): Promise<void> {
  await prisma.paymentWebhookEvent.createMany({
    data: [
      {
        provider: PaymentProvider.LIQPAY,
        externalId: `malformed:${sha256Hex(data)}`,
        payload: { data, decoded } as Prisma.InputJsonValue,
        signatureValid: true,
        paymentId: null,
        error: 'MALFORMED_PAYLOAD',
      },
    ],
    skipDuplicates: true,
  });
}

export interface ApplyWebhookInput {
  externalId: string;
  payload: Prisma.InputJsonValue;
  paymentId: string | null;
  callback: WebhookCallback;
  defaultCommissionBps: number;
}

export type ApplyWebhookResult = { duplicate: true } | { duplicate: false; decision: WebhookDecision };

async function applyDecision(
  tx: Prisma.TransactionClient,
  decision: WebhookDecision,
  ctx: {
    payment: WebhookPaymentSnapshot | null;
    order: WebhookOrderSnapshot | null;
    callback: WebhookCallback;
    payload: Prisma.InputJsonValue;
  },
): Promise<void> {
  const { payment, order, callback, payload } = ctx;

  switch (decision.kind) {
    case 'noop':
      return;

    case 'mark-pending': {
      if (payment === null) return;
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: payment.status === PaymentStatus.CREATED ? PaymentStatus.PENDING : payment.status,
          payload,
          providerPaymentId: callback.providerPaymentId,
        },
      });
      return;
    }

    case 'fail': {
      if (payment === null) return;
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: decision.failureReason,
          processedAt: new Date(),
          payload,
          providerPaymentId: callback.providerPaymentId,
        },
      });
      if (decision.failOrder && order !== null) {
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.FAILED } });
      }
      return;
    }

    case 'success-no-fulfil': {
      if (payment === null) return;
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          processedAt: new Date(),
          payload,
          providerPaymentId: callback.providerPaymentId,
          failureReason: decision.failureReason,
        },
      });
      return;
    }

    case 'fulfil': {
      if (payment === null || order === null) return;
      const now = new Date();

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: now, cancelledAt: null },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          processedAt: now,
          providerPaymentId: callback.providerPaymentId,
          payload,
          failureReason: null,
        },
      });

      for (const item of decision.items) {
        await tx.orderItem.update({
          where: { id: item.orderItemId },
          data: {
            commissionRateBps: item.commissionRateBps,
            commissionAmount: item.commissionAmount,
            authorAmount: item.authorAmount,
          },
        });

        if (item.reactivateEnrollmentId !== null) {
          await tx.enrollment.update({
            where: { id: item.reactivateEnrollmentId },
            data: { revokedAt: null, source: EnrollmentSource.PURCHASE, orderItemId: item.orderItemId },
          });
        } else {
          await tx.enrollment.create({
            data: {
              userId: order.userId,
              courseId: item.courseId,
              orderItemId: item.orderItemId,
              source: EnrollmentSource.PURCHASE,
            },
          });
        }

        await tx.balanceEntry.create({
          data: {
            userId: item.authorId,
            type: BalanceEntryType.SALE,
            amount: item.authorAmount,
            orderItemId: item.orderItemId,
            comment: `Продаж «${item.titleSnapshot}»`.slice(0, 255),
          },
        });

        // Sale proceeds go straight to availableAmount: the refund window
        // (pendingAmount) is a separate feature that does not exist yet.
        await tx.balance.upsert({
          where: { userId: item.authorId },
          create: { userId: item.authorId, availableAmount: item.authorAmount },
          update: { availableAmount: { increment: item.authorAmount } },
        });

        await tx.course.update({
          where: { id: item.courseId },
          data: { studentsCount: { increment: 1 } },
        });
      }

      return;
    }
  }
}

export async function applyWebhook(
  input: ApplyWebhookInput,
  decide: (snapshot: WebhookSnapshot) => WebhookDecision,
): Promise<ApplyWebhookResult> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.paymentWebhookEvent.createMany({
      data: [
        {
          provider: PaymentProvider.LIQPAY,
          externalId: input.externalId,
          payload: input.payload,
          signatureValid: true,
          paymentId: input.paymentId,
        },
      ],
      skipDuplicates: true,
    });

    // A concurrent duplicate waits on this unique index inside the same
    // transaction. If this transaction rolls back, the row disappears and a
    // retried callback from LiqPay is processed again from scratch.
    if (created.count === 0) {
      return { duplicate: true };
    }

    let payment: WebhookPaymentSnapshot | null = null;
    let order: WebhookOrderSnapshot | null = null;
    let enrollments: WebhookEnrollmentSnapshot[] = [];

    if (input.paymentId !== null) {
      const lockedPayments = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM payments WHERE id = ${input.paymentId}::uuid FOR UPDATE
      `;

      if (lockedPayments.length > 0) {
        const paymentRow = await tx.payment.findUnique({
          where: { id: input.paymentId },
          select: { id: true, orderId: true, status: true, amount: true, currency: true },
        });

        if (paymentRow !== null) {
          payment = {
            id: paymentRow.id,
            status: paymentRow.status,
            amount: paymentRow.amount,
            currency: paymentRow.currency,
          };

          const lockedOrders = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM orders WHERE id = ${paymentRow.orderId}::uuid FOR UPDATE
          `;

          if (lockedOrders.length > 0) {
            const orderRow = await tx.order.findUnique({
              where: { id: paymentRow.orderId },
              select: {
                id: true,
                userId: true,
                status: true,
                totalAmount: true,
                currency: true,
                items: {
                  select: {
                    id: true,
                    courseId: true,
                    authorId: true,
                    titleSnapshot: true,
                    priceAmount: true,
                    author: { select: { authorProfile: { select: { commissionRateBps: true } } } },
                  },
                },
              },
            });

            if (orderRow !== null) {
              order = {
                id: orderRow.id,
                userId: orderRow.userId,
                status: orderRow.status,
                totalAmount: orderRow.totalAmount,
                currency: orderRow.currency,
                items: orderRow.items.map((item) => ({
                  id: item.id,
                  courseId: item.courseId,
                  authorId: item.authorId,
                  titleSnapshot: item.titleSnapshot,
                  priceAmount: item.priceAmount,
                  authorCommissionRateBps: item.author.authorProfile?.commissionRateBps ?? null,
                })),
              };

              enrollments = await tx.enrollment.findMany({
                where: {
                  userId: orderRow.userId,
                  courseId: { in: orderRow.items.map((item) => item.courseId) },
                },
                select: { id: true, courseId: true, revokedAt: true },
              });
            }
          }
        }
      }
    }

    const decision = decide({
      callback: input.callback,
      payment,
      order,
      enrollments,
      defaultCommissionBps: input.defaultCommissionBps,
    });

    await applyDecision(tx, decision, { payment, order, callback: input.callback, payload: input.payload });

    await tx.paymentWebhookEvent.update({
      where: { provider_externalId: { provider: PaymentProvider.LIQPAY, externalId: input.externalId } },
      data: {
        paymentId: payment?.id ?? null,
        processedAt: new Date(),
        error: eventErrorFor(decision),
      },
    });

    return { duplicate: false, decision };
  });
}
