import { AppError } from '../../lib/errors.js';
import { getPurchaseBlocker, purchaseBlockerMessage, type PurchaseBlocker } from '../cart/purchase-rules.js';
import {
  createOrderFromCart,
  findMyOrder,
  findMyOrders,
  type CartSnapshotLine,
  type OrderPlan,
  type OrderRecord,
} from './orders.repository.js';
import type { MyOrdersQuery } from './orders.validation.js';

function buildOrderPlan(userId: string): (lines: CartSnapshotLine[]) => OrderPlan {
  return (lines) => {
    if (lines.length === 0) {
      return { kind: 'empty' };
    }

    const blocked: { courseId: string; blocker: PurchaseBlocker }[] = [];
    for (const line of lines) {
      const blocker = getPurchaseBlocker(userId, line.course, line.hasActiveEnrollment);
      if (blocker !== null) blocked.push({ courseId: line.courseId, blocker });
    }

    if (blocked.length > 0) {
      return { kind: 'blocked', blocked };
    }

    // Price always comes from the course on the server, never from the client.
    const items = lines.map((line) => ({
      courseId: line.courseId,
      authorId: line.authorId,
      titleSnapshot: line.title,
      priceAmount: line.course.priceAmount,
    }));

    return {
      kind: 'create',
      totalAmount: items.reduce((sum, item) => sum + item.priceAmount, 0),
      items,
    };
  };
}

function toOrderResponse(order: OrderRecord) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    cancelledAt: order.cancelledAt,
    items: order.items.map((item) => ({
      id: item.id,
      courseId: item.courseId,
      courseSlug: item.course.slug,
      title: item.titleSnapshot,
      priceAmount: item.priceAmount,
    })),
  };
}

export async function createOrder(userId: string) {
  const { plan, order } = await createOrderFromCart(userId, buildOrderPlan(userId));

  if (plan.kind === 'empty') {
    throw AppError.conflict('Cart is empty');
  }

  if (plan.kind === 'blocked') {
    throw AppError.conflict(
      'Some courses in the cart cannot be purchased',
      plan.blocked.map((entry) => ({ field: entry.courseId, message: purchaseBlockerMessage(entry.blocker) })),
    );
  }

  if (order === null) {
    throw AppError.conflict('Cart is empty');
  }

  return toOrderResponse(order);
}

export async function listMyOrders(userId: string, query: MyOrdersQuery) {
  const { items, total } = await findMyOrders(userId, query);

  return {
    items: items.map(toOrderResponse),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getMyOrder(userId: string, orderId: string) {
  const order = await findMyOrder(userId, orderId);
  if (order === null) throw AppError.notFound('Order not found');
  return toOrderResponse(order);
}
