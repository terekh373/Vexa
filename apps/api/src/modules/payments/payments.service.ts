import { OrderStatus, PaymentStatus, type Prisma } from '@prisma/client';
import { routes } from '@vexa/shared';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { sendPurchaseReceiptEmail } from '../../lib/mailer.js';
import { notifyPurchaseCompleted } from '../notifications/notifications.service.js';
import { resolveCommissionRateBps, splitPrice } from './commission.js';
import {
  LIQPAY_API_VERSION,
  LIQPAY_CHECKOUT_URL,
  classifyStatus,
  decodeData,
  encodeData,
  formatAmount,
  liqpayCallbackSchema,
  signData,
  toKopiykas,
  verifySignature,
} from './liqpay.js';
import {
  applyWebhook,
  createPayment,
  findOrderForCheckout,
  findReusablePayment,
  logMalformedWebhook,
  logRejectedWebhook,
  type FulfilItem,
  type OnFulfilled,
  type WebhookDecision,
  type WebhookOrderSnapshot,
  type WebhookSnapshot,
} from './payments.repository.js';
import { webhookBodySchema } from './payments.validation.js';

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CheckoutResponse {
  paymentId: string;
  checkoutUrl: string;
  data: string;
  signature: string;
}

export async function startCheckout(userId: string, orderId: string): Promise<CheckoutResponse> {
  const order = await findOrderForCheckout(userId, orderId);
  if (order === null) throw AppError.notFound('Order not found');
  if (order.status !== OrderStatus.PENDING) throw AppError.conflict('Order is not awaiting payment');

  // One attempt to pay = one order_id on LiqPay's side: reusing a
  // still-open payment means a double click or a reopened checkout page
  // never creates a second payment row for the same order.
  const payment =
    (await findReusablePayment(order.id)) ?? (await createPayment(order.id, order.totalAmount, order.currency));

  const params: Record<string, string | number> = {
    version: LIQPAY_API_VERSION,
    public_key: env.LIQPAY_PUBLIC_KEY,
    action: 'pay',
    amount: formatAmount(payment.amount),
    currency: payment.currency,
    description: `Оплата замовлення №${order.number} на Vexa`,
    order_id: payment.id,
    result_url: new URL(routes.checkoutSuccess(order.id), env.WEB_APP_URL).toString(),
    server_url: env.PAYMENT_WEBHOOK_URL,
    language: 'uk',
    sandbox: 1,
  };

  const data = encodeData(params);
  const signature = signData(data, env.LIQPAY_PRIVATE_KEY);

  return { paymentId: payment.id, checkoutUrl: LIQPAY_CHECKOUT_URL, data, signature };
}

// ---------------------------------------------------------------------------
// Webhook decision (pure)
// ---------------------------------------------------------------------------

function buildFailureReason(callback: WebhookSnapshot['callback']): string {
  const code = callback.errCode ?? callback.rawStatus;
  const suffix = callback.errDescription !== null ? ` ${callback.errDescription}` : '';
  return `LIQPAY:${code}${suffix}`.slice(0, 255);
}

export function decideWebhookOutcome(snapshot: WebhookSnapshot): WebhookDecision {
  const { callback, payment, order, enrollments, defaultCommissionBps } = snapshot;

  if (payment === null) {
    return { kind: 'noop', eventError: 'UNKNOWN_PAYMENT' };
  }

  if (callback.kind === 'ignored') {
    return { kind: 'noop', eventError: `UNSUPPORTED_STATUS:${callback.rawStatus}` };
  }

  // Covers a `sandbox` retry after `success`, and a `failure` arriving after
  // an already-confirmed success.
  if (payment.status === PaymentStatus.SUCCESS) {
    return { kind: 'noop', eventError: 'PAYMENT_ALREADY_SUCCEEDED' };
  }

  if (callback.kind === 'pending') {
    return { kind: 'mark-pending' };
  }

  if (callback.kind === 'failure') {
    return {
      kind: 'fail',
      reason: 'PROVIDER_FAILURE',
      failureReason: buildFailureReason(callback),
      failOrder: order !== null && order.status === OrderStatus.PENDING,
    };
  }

  // callback.kind === 'success' from here on. A payment always has an order
  // (the FK is never null), so this null check is only defensive.
  if (order === null) {
    return { kind: 'noop', eventError: 'UNKNOWN_PAYMENT' };
  }

  const amountMismatch =
    callback.amount !== payment.amount ||
    callback.currency !== payment.currency ||
    payment.amount !== order.totalAmount ||
    payment.currency !== order.currency;

  if (amountMismatch) {
    return { kind: 'fail', reason: 'AMOUNT_MISMATCH', failureReason: 'AMOUNT_MISMATCH', failOrder: false };
  }

  if (order.status === OrderStatus.PAID || order.status === OrderStatus.REFUNDED) {
    return { kind: 'success-no-fulfil', failureReason: 'ORDER_ALREADY_PAID' };
  }

  const activelyOwnedCourseIds = new Set(
    enrollments.filter((enrollment) => enrollment.revokedAt === null).map((enrollment) => enrollment.courseId),
  );
  const alreadyOwned = order.items.some((item) => activelyOwnedCourseIds.has(item.courseId));

  if (alreadyOwned) {
    return { kind: 'success-no-fulfil', failureReason: 'COURSE_ALREADY_OWNED' };
  }

  const items: FulfilItem[] = order.items.map((item) => {
    const commissionRateBps = resolveCommissionRateBps(item.authorCommissionRateBps, defaultCommissionBps);
    const { commissionAmount, authorAmount } = splitPrice(item.priceAmount, commissionRateBps);
    const revokedEnrollment = enrollments.find(
      (enrollment) => enrollment.courseId === item.courseId && enrollment.revokedAt !== null,
    );

    return {
      orderItemId: item.id,
      courseId: item.courseId,
      authorId: item.authorId,
      titleSnapshot: item.titleSnapshot,
      commissionRateBps,
      commissionAmount,
      authorAmount,
      reactivateEnrollmentId: revokedEnrollment?.id ?? null,
    };
  });

  return { kind: 'fulfil', items };
}

// ---------------------------------------------------------------------------
// Webhook entry point
// ---------------------------------------------------------------------------

const notifyFulfilledOrder: OnFulfilled = async (tx, { order, items }) => {
  await notifyPurchaseCompleted(
    {
      buyerId: order.userId,
      orderId: order.id,
      items: items.map((item) => ({ courseId: item.courseId, courseTitle: item.titleSnapshot, authorId: item.authorId })),
    },
    tx,
  );
};

function money(kopiykas: number, currency: string): string {
  return `${formatAmount(kopiykas)} ${currency}`;
}

async function sendReceipt(order: WebhookOrderSnapshot): Promise<void> {
  await sendPurchaseReceiptEmail({
    email: order.buyerEmail,
    orderNumber: order.number,
    items: order.items.map((item) => ({ title: item.titleSnapshot, amount: money(item.priceAmount, order.currency) })),
    totalAmount: money(order.totalAmount, order.currency),
  });
}

export async function handleLiqpayWebhook(body: unknown): Promise<void> {
  const bodyResult = webhookBodySchema.safeParse(body);
  if (!bodyResult.success) {
    throw AppError.validation('Invalid webhook payload');
  }
  const { data, signature } = bodyResult.data;

  if (!verifySignature(data, signature, env.LIQPAY_PRIVATE_KEY)) {
    await logRejectedWebhook({ data, signature });
    throw AppError.validation('Invalid signature');
  }

  const decoded = decodeData(data);
  const parsed = liqpayCallbackSchema.safeParse(decoded);

  // Signature is valid, so this is genuinely LiqPay — asking it to retry a
  // payload it will send identically again would be pointless. Answer 200.
  if (!parsed.success) {
    await logMalformedWebhook(data, decoded);
    return;
  }

  const { order_id, status, amount, currency, payment_id, err_code, err_description } = parsed.data;

  const externalId = `${order_id}:${status}`;
  const paymentIdCheck = z.string().uuid().safeParse(order_id);
  const paymentId = paymentIdCheck.success ? paymentIdCheck.data : null;

  const callback = {
    kind: classifyStatus(status),
    rawStatus: status,
    amount: toKopiykas(amount),
    currency,
    providerPaymentId: payment_id != null ? String(payment_id) : null,
    errCode: err_code ?? null,
    errDescription: err_description ?? null,
  };

  const result = await applyWebhook(
    {
      externalId,
      payload: decoded as Prisma.InputJsonValue,
      paymentId,
      callback,
      defaultCommissionBps: env.PLATFORM_COMMISSION_BPS,
    },
    decideWebhookOutcome,
    notifyFulfilledOrder,
  );

  if (result.duplicate) return;

  const { decision } = result;
  if (decision.kind === 'fail' && decision.reason === 'AMOUNT_MISMATCH') {
    logger.warn({ paymentId, orderId: order_id }, 'LiqPay webhook amount mismatch');
  } else if (decision.kind === 'success-no-fulfil') {
    logger.warn({ paymentId, reason: decision.failureReason }, 'LiqPay webhook success without fulfilment');
  }

  // Sent after the commit and only for a fresh fulfilment: a retry lands in
  // the duplicate or already-succeeded path and never reaches this line.
  if (decision.kind === 'fulfil' && result.order !== null) await sendReceipt(result.order);
}
