/**
 * Persistence for orders. Order creation is the one place that reads the
 * cart and writes an order atomically, so it is exposed as a single
 * transactional function rather than separate steps the service would have
 * to sequence itself.
 */
import { OrderStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ORDER_CURRENCY, type PurchaseBlocker, type PurchaseCandidate } from '../cart/purchase-rules.js';
import type { MyOrdersQuery } from './orders.validation.js';

export interface CartSnapshotLine {
  courseId: string;
  title: string;
  authorId: string;
  course: PurchaseCandidate;
  hasActiveEnrollment: boolean;
}

export type OrderPlan =
  | { kind: 'empty' }
  | { kind: 'blocked'; blocked: { courseId: string; blocker: PurchaseBlocker }[] }
  | {
      kind: 'create';
      totalAmount: number;
      items: { courseId: string; authorId: string; titleSnapshot: string; priceAmount: number }[];
    };

// Commission fields are deliberately left out: the buyer never sees the
// platform's internal split, and it does not exist yet on a fresh order.
const orderSelect = {
  id: true,
  number: true,
  status: true,
  totalAmount: true,
  currency: true,
  createdAt: true,
  paidAt: true,
  cancelledAt: true,
  items: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      courseId: true,
      titleSnapshot: true,
      priceAmount: true,
      course: { select: { slug: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderRecord = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

export async function createOrderFromCart(
  userId: string,
  plan: (lines: CartSnapshotLine[]) => OrderPlan,
): Promise<{ plan: OrderPlan; order: OrderRecord | null }> {
  return prisma.$transaction(async (tx) => {
    // Lock the cart row: without it, a double click starts two concurrent
    // transactions that both read the same cart and each create an order
    // from it. The second transaction waits here and then sees the cart the
    // first one already emptied.
    await tx.$queryRaw`SELECT id FROM carts WHERE user_id = ${userId}::uuid FOR UPDATE`;

    const cartItems = await tx.cartItem.findMany({
      where: { cart: { userId } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        courseId: true,
        course: {
          select: {
            title: true,
            authorId: true,
            status: true,
            deletedAt: true,
            priceAmount: true,
            currency: true,
          },
        },
      },
    });

    let ownedCourseIds = new Set<string>();
    if (cartItems.length > 0) {
      const enrollments = await tx.enrollment.findMany({
        where: {
          userId,
          revokedAt: null,
          courseId: { in: cartItems.map((item) => item.courseId) },
        },
        select: { courseId: true },
      });
      ownedCourseIds = new Set(enrollments.map((enrollment) => enrollment.courseId));
    }

    const lines: CartSnapshotLine[] = cartItems.map((item) => ({
      courseId: item.courseId,
      title: item.course.title,
      authorId: item.course.authorId,
      course: {
        status: item.course.status,
        deletedAt: item.course.deletedAt,
        priceAmount: item.course.priceAmount,
        currency: item.course.currency,
        authorId: item.course.authorId,
      },
      hasActiveEnrollment: ownedCourseIds.has(item.courseId),
    }));

    const result = plan(lines);

    if (result.kind !== 'create') {
      return { plan: result, order: null };
    }

    // At most one PENDING order per user: otherwise the same course could be
    // paid for twice through two unpaid orders sitting side by side.
    await tx.order.updateMany({
      where: { userId, status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
    });

    const order = await tx.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING,
        totalAmount: result.totalAmount,
        currency: ORDER_CURRENCY,
        items: {
          create: result.items.map((item) => ({
            courseId: item.courseId,
            authorId: item.authorId,
            titleSnapshot: item.titleSnapshot,
            priceAmount: item.priceAmount,
          })),
        },
      },
      select: orderSelect,
    });

    await tx.cartItem.deleteMany({ where: { cart: { userId } } });

    return { plan: result, order };
  });
}

export async function findMyOrders(
  userId: string,
  { page, limit }: Pick<MyOrdersQuery, 'page' | 'limit'>,
): Promise<{ items: OrderRecord[]; total: number }> {
  const where: Prisma.OrderWhereInput = { userId, deletedAt: null };

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: orderSelect,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total };
}

export async function findMyOrder(userId: string, orderId: string): Promise<OrderRecord | null> {
  return prisma.order.findFirst({
    where: { id: orderId, userId, deletedAt: null },
    select: orderSelect,
  });
}
