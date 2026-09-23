import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  EnrollmentSource,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';
import { encodeData, formatAmount, LIQPAY_CHECKOUT_URL, signData } from '../../src/modules/payments/liqpay.js';

const app = createApp();
const CATEGORY_SLUG = 'payments-integration-category';

interface Fixture {
  authorId: string;
  buyerId: string;
  buyerToken: string;
  otherBuyerToken: string;
  course1Id: string;
  course1Price: number;
  course2Id: string;
  course2Price: number;
}

async function resetState(): Promise<void> {
  await prisma.balanceEntry.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.course.deleteMany();
  await prisma.authorProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Тестова категорія оплати' },
  });

  const author = await prisma.user.create({
    data: {
      email: `payments-author-${randomUUID()}@example.com`,
      fullName: 'Payments Author',
      roles: [UserRole.AUTHOR],
    },
  });
  await prisma.authorProfile.create({
    data: { userId: author.id, displayName: 'Payments Author' },
  });

  const buyer = await prisma.user.create({
    data: {
      email: `payments-buyer-${randomUUID()}@example.com`,
      fullName: 'Payments Buyer',
      roles: [UserRole.STUDENT],
    },
  });
  const otherBuyer = await prisma.user.create({
    data: {
      email: `payments-other-buyer-${randomUUID()}@example.com`,
      fullName: 'Other Buyer',
      roles: [UserRole.STUDENT],
    },
  });

  const baseCourse = {
    authorId: author.id,
    categoryId: category.id,
    type: ContentType.COURSE,
    status: CourseStatus.PUBLISHED,
    shortDescription: 'Короткий опис',
    description: 'Повний опис',
    publishedAt: new Date(),
  };

  const course1 = await prisma.course.create({
    data: {
      ...baseCourse,
      slug: `payments-course-1-${randomUUID()}`,
      title: 'Курс оплати 1',
      priceAmount: 29_900,
    },
  });
  const course2 = await prisma.course.create({
    data: {
      ...baseCourse,
      slug: `payments-course-2-${randomUUID()}`,
      title: 'Курс оплати 2',
      priceAmount: 19_900,
    },
  });

  return {
    authorId: author.id,
    buyerId: buyer.id,
    buyerToken: signAccessToken(buyer.id, buyer.roles),
    otherBuyerToken: signAccessToken(otherBuyer.id, otherBuyer.roles),
    course1Id: course1.id,
    course1Price: course1.priceAmount,
    course2Id: course2.id,
    course2Price: course2.priceAmount,
  };
}

interface OrderResponse {
  id: string;
  number: number;
  totalAmount: number;
  currency: string;
  items: { id: string; courseId: string }[];
}

async function createOrder(token: string, courseIds: string[]): Promise<OrderResponse> {
  for (const courseId of courseIds) {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId })
      .expect(200);
  }

  const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send();
  expect(response.status).toBe(201);
  return response.body as OrderResponse;
}

interface CheckoutResponse {
  paymentId: string;
  checkoutUrl: string;
  data: string;
  signature: string;
}

async function checkout(token: string, orderId: string) {
  return request(app).post(`/api/orders/${orderId}/checkout`).set('Authorization', `Bearer ${token}`).send();
}

function decodeCheckoutData(data: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as Record<string, unknown>;
}

function signWebhook(params: Record<string, string | number>): { data: string; signature: string } {
  const data = encodeData(params);
  const signature = signData(data, env.LIQPAY_PRIVATE_KEY);
  return { data, signature };
}

async function sendWebhook(data: string, signature: string) {
  return request(app).post('/api/payments/webhook').type('form').send({ data, signature });
}

async function paySuccessfully(
  paymentId: string,
  amountKopiykas: number,
  status = 'sandbox',
): Promise<request.Response> {
  const { data, signature } = signWebhook({
    order_id: paymentId,
    status,
    amount: amountKopiykas / 100,
    currency: 'UAH',
    payment_id: 123456,
  });
  return sendWebhook(data, signature);
}

describe('payments integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('starts checkout and reuses the same payment on a repeat call', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id, fixture.course2Id]);

    const first = await checkout(fixture.buyerToken, order.id);
    expect(first.status).toBe(200);
    const body = first.body as CheckoutResponse;
    expect(body.checkoutUrl).toBe(LIQPAY_CHECKOUT_URL);

    const decoded = decodeCheckoutData(body.data);
    expect(decoded.order_id).toBe(body.paymentId);
    expect(decoded.amount).toBe(formatAmount(order.totalAmount));
    expect(decoded.currency).toBe('UAH');
    expect(decoded.server_url).toBe(env.PAYMENT_WEBHOOK_URL);
    expect(String(decoded.result_url)).toMatch(new RegExp(`/checkout/success/${order.id}$`));
    expect(decoded.sandbox).toBe(1);

    const second = await checkout(fixture.buyerToken, order.id);
    expect(second.status).toBe(200);
    expect((second.body as CheckoutResponse).paymentId).toBe(body.paymentId);

    const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments).toHaveLength(1);
  });

  it('requires auth, hides foreign orders and rejects a non-pending order', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id]);

    const noAuth = await request(app).post(`/api/orders/${order.id}/checkout`).send();
    expect(noAuth.status).toBe(401);

    const foreign = await checkout(fixture.otherBuyerToken, order.id);
    expect(foreign.status).toBe(404);

    const missing = await checkout(fixture.buyerToken, randomUUID());
    expect(missing.status).toBe(404);

    const first = await checkout(fixture.buyerToken, order.id);
    expect(first.status).toBe(200);
    const paid = await paySuccessfully(first.body.paymentId as string, order.totalAmount);
    expect(paid.status).toBe(200);

    const afterPaid = await checkout(fixture.buyerToken, order.id);
    expect(afterPaid.status).toBe(409);
  });

  it('fulfils a successful sandbox payment: order, payment, commission, enrollment and balance', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id, fixture.course2Id]);
    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    const webhookResponse = await paySuccessfully(paymentId, order.totalAmount);
    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toEqual({ status: 'ok' });

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(dbOrder.status).toBe(OrderStatus.PAID);
    expect(dbOrder.paidAt).not.toBeNull();

    const dbPayment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(dbPayment.status).toBe(PaymentStatus.SUCCESS);
    expect(dbPayment.providerPaymentId).toBe('123456');

    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.commissionRateBps).toBe(1500);
      expect(item.commissionAmount).not.toBeNull();
      expect(item.authorAmount).not.toBeNull();
      expect((item.commissionAmount ?? 0) + (item.authorAmount ?? 0)).toBe(item.priceAmount);
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: fixture.buyerId, courseId: { in: [fixture.course1Id, fixture.course2Id] } },
    });
    expect(enrollments).toHaveLength(2);
    for (const enrollment of enrollments) {
      expect(enrollment.source).toBe(EnrollmentSource.PURCHASE);
      expect(enrollment.orderItemId).not.toBeNull();
      expect(enrollment.revokedAt).toBeNull();
    }

    const totalAuthorAmount = items.reduce((sum, item) => sum + (item.authorAmount ?? 0), 0);
    const balanceEntries = await prisma.balanceEntry.findMany({ where: { userId: fixture.authorId } });
    expect(balanceEntries).toHaveLength(2);
    expect(balanceEntries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(totalAuthorAmount);

    const balance = await prisma.balance.findUniqueOrThrow({ where: { userId: fixture.authorId } });
    expect(balance.availableAmount).toBe(totalAuthorAmount);

    const course1 = await prisma.course.findUniqueOrThrow({ where: { id: fixture.course1Id } });
    const course2 = await prisma.course.findUniqueOrThrow({ where: { id: fixture.course2Id } });
    expect(course1.studentsCount).toBe(1);
    expect(course2.studentsCount).toBe(1);

    const authorProfile = await prisma.authorProfile.findUniqueOrThrow({ where: { userId: fixture.authorId } });
    expect(authorProfile.studentsCount).toBe(1);

    const myOrder = await request(app)
      .get(`/api/me/orders/${order.id}`)
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(myOrder.status).toBe(200);
    expect(myOrder.body.status).toBe('PAID');
  });

  it('is idempotent for a repeated identical webhook', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id]);
    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    const { data, signature } = signWebhook({
      order_id: paymentId,
      status: 'sandbox',
      amount: order.totalAmount / 100,
      currency: 'UAH',
      payment_id: 555,
    });

    const first = await sendWebhook(data, signature);
    expect(first.status).toBe(200);
    const second = await sendWebhook(data, signature);
    expect(second.status).toBe(200);

    const events = await prisma.paymentWebhookEvent.findMany({ where: { paymentId } });
    expect(events).toHaveLength(1);

    const enrollments = await prisma.enrollment.findMany({ where: { userId: fixture.buyerId } });
    expect(enrollments).toHaveLength(1);

    const balanceEntries = await prisma.balanceEntry.findMany({ where: { userId: fixture.authorId } });
    expect(balanceEntries).toHaveLength(1);

    const balance = await prisma.balance.findUniqueOrThrow({ where: { userId: fixture.authorId } });
    expect(balance.availableAmount).toBe(balanceEntries[0]?.amount);
  });

  it('ignores a success callback that arrives after the payment already succeeded', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id]);
    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    await paySuccessfully(paymentId, order.totalAmount, 'sandbox').then((res) => expect(res.status).toBe(200));

    const before = await prisma.balance.findUniqueOrThrow({ where: { userId: fixture.authorId } });

    const repeated = await paySuccessfully(paymentId, order.totalAmount, 'success');
    expect(repeated.status).toBe(200);

    const after = await prisma.balance.findUniqueOrThrow({ where: { userId: fixture.authorId } });
    expect(after.availableAmount).toBe(before.availableAmount);

    const enrollments = await prisma.enrollment.findMany({ where: { userId: fixture.buyerId } });
    expect(enrollments).toHaveLength(1);
  });

  it('rejects a webhook with an invalid signature', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id]);
    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    const data = encodeData({
      order_id: paymentId,
      status: 'sandbox',
      amount: order.totalAmount / 100,
      currency: 'UAH',
    });

    const response = await sendWebhook(data, signData(data, 'a-completely-wrong-private-key'));
    expect(response.status).toBe(400);

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(dbOrder.status).toBe(OrderStatus.PENDING);

    const dbPayment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(dbPayment.status).not.toBe(PaymentStatus.SUCCESS);

    const enrollments = await prisma.enrollment.findMany({ where: { userId: fixture.buyerId } });
    expect(enrollments).toHaveLength(0);

    const events = await prisma.paymentWebhookEvent.findMany({ where: { signatureValid: false } });
    expect(events).toHaveLength(1);
  });

  it('fails the order and payment when the card is declined', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id]);
    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    const { data, signature } = signWebhook({
      order_id: paymentId,
      status: 'failure',
      amount: order.totalAmount / 100,
      currency: 'UAH',
      err_code: 'limit',
      err_description: 'Insufficient funds',
    });

    const response = await sendWebhook(data, signature);
    expect(response.status).toBe(200);

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(dbOrder.status).toBe(OrderStatus.FAILED);

    const dbPayment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(dbPayment.status).toBe(PaymentStatus.FAILED);
    expect(dbPayment.failureReason).not.toBeNull();
    expect(dbPayment.failureReason?.startsWith('LIQPAY:')).toBe(true);

    const enrollments = await prisma.enrollment.findMany({ where: { userId: fixture.buyerId } });
    expect(enrollments).toHaveLength(0);
  });

  it('fails the payment on an amount mismatch without touching the order', async () => {
    const fixture = await seedFixture();
    const order = await createOrder(fixture.buyerToken, [fixture.course1Id]);
    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    const { data, signature } = signWebhook({
      order_id: paymentId,
      status: 'sandbox',
      amount: (order.totalAmount + 100) / 100,
      currency: 'UAH',
    });

    const response = await sendWebhook(data, signature);
    expect(response.status).toBe(200);

    const dbPayment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(dbPayment.status).toBe(PaymentStatus.FAILED);
    expect(dbPayment.failureReason).toBe('AMOUNT_MISMATCH');

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(dbOrder.status).toBe(OrderStatus.PENDING);

    const enrollments = await prisma.enrollment.findMany({ where: { userId: fixture.buyerId } });
    expect(enrollments).toHaveLength(0);
  });

  it('applies the author commission override instead of the platform default', async () => {
    const fixture = await seedFixture();
    await prisma.authorProfile.update({
      where: { userId: fixture.authorId },
      data: { commissionRateBps: 1000 },
    });

    const order = await createOrder(fixture.buyerToken, [fixture.course1Id]);
    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    const response = await paySuccessfully(paymentId, order.totalAmount);
    expect(response.status).toBe(200);

    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    expect(item.commissionRateBps).toBe(1000);
    expect(item.commissionAmount).toBe(Math.floor((fixture.course1Price * 1000) / 10_000));
    expect((item.commissionAmount ?? 0) + (item.authorAmount ?? 0)).toBe(fixture.course1Price);
  });

  it('still opens access when a stale payment for a cancelled order succeeds', async () => {
    const fixture = await seedFixture();
    const firstOrder = await createOrder(fixture.buyerToken, [fixture.course1Id]);
    const firstCheckout = await checkout(fixture.buyerToken, firstOrder.id);
    const firstPaymentId = firstCheckout.body.paymentId as string;

    // Creating a second order cancels the first (one PENDING order per user).
    await createOrder(fixture.buyerToken, [fixture.course2Id]);

    const cancelledOrder = await prisma.order.findUniqueOrThrow({ where: { id: firstOrder.id } });
    expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);

    const response = await paySuccessfully(firstPaymentId, firstOrder.totalAmount);
    expect(response.status).toBe(200);

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: firstOrder.id } });
    expect(dbOrder.status).toBe(OrderStatus.PAID);

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: fixture.buyerId, courseId: fixture.course1Id },
    });
    expect(enrollment).not.toBeNull();
    expect(enrollment?.revokedAt).toBeNull();
  });

  it('marks the payment SUCCESS without a second enrollment when the course is already owned', async () => {
    const fixture = await seedFixture();
    await prisma.enrollment.create({
      data: { userId: fixture.buyerId, courseId: fixture.course1Id, source: EnrollmentSource.ADMIN_GRANT },
    });

    // The purchase-rules block re-adding an owned course to the cart, so the
    // order is written directly to reach the COURSE_ALREADY_OWNED branch.
    const order = await prisma.order.create({
      data: {
        userId: fixture.buyerId,
        status: OrderStatus.PENDING,
        totalAmount: fixture.course1Price,
        items: {
          create: [
            {
              courseId: fixture.course1Id,
              authorId: fixture.authorId,
              titleSnapshot: 'Курс оплати 1',
              priceAmount: fixture.course1Price,
            },
          ],
        },
      },
    });

    const checkoutResponse = await checkout(fixture.buyerToken, order.id);
    const paymentId = checkoutResponse.body.paymentId as string;

    const response = await paySuccessfully(paymentId, order.totalAmount);
    expect(response.status).toBe(200);

    const dbPayment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(dbPayment.status).toBe(PaymentStatus.SUCCESS);
    expect(dbPayment.failureReason).toBe('COURSE_ALREADY_OWNED');

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: fixture.buyerId, courseId: fixture.course1Id },
    });
    expect(enrollments).toHaveLength(1);

    const balance = await prisma.balance.findUnique({ where: { userId: fixture.authorId } });
    expect(balance).toBeNull();
  });
});
