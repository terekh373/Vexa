/**
 * All Prisma access for the shopping cart.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { PurchaseCandidate } from './purchase-rules.js';

const cartLineSelect = {
  id: true,
  courseId: true,
  createdAt: true,
  course: {
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      status: true,
      deletedAt: true,
      priceAmount: true,
      currency: true,
      coverFileId: true,
      authorId: true,
      author: {
        select: {
          fullName: true,
          authorProfile: { select: { displayName: true } },
        },
      },
    },
  },
} satisfies Prisma.CartItemSelect;

export type CartLine = Prisma.CartItemGetPayload<{ select: typeof cartLineSelect }>;

export interface CartSnapshot {
  lines: CartLine[];
  ownedCourseIds: Set<string>;
}

export async function findCartLines(userId: string): Promise<CartSnapshot> {
  const lines = await prisma.cartItem.findMany({
    where: { cart: { userId } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: cartLineSelect,
  });

  if (lines.length === 0) {
    return { lines, ownedCourseIds: new Set() };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      revokedAt: null,
      courseId: { in: lines.map((line) => line.courseId) },
    },
    select: { courseId: true },
  });

  return { lines, ownedCourseIds: new Set(enrollments.map((enrollment) => enrollment.courseId)) };
}

export interface CourseForPurchase extends PurchaseCandidate {
  id: string;
}

export async function findCourseForPurchase(courseId: string): Promise<CourseForPurchase | null> {
  return prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      status: true,
      deletedAt: true,
      priceAmount: true,
      currency: true,
      authorId: true,
    },
  });
}

export async function hasActiveEnrollment(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId, revokedAt: null },
    select: { id: true },
  });

  return enrollment !== null;
}

/** Upsert twice (cart, then item) so a repeated add never creates a duplicate or hits the unique index. */
export async function addCartItem(userId: string, courseId: string): Promise<void> {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });

  await prisma.cartItem.upsert({
    where: { cartId_courseId: { cartId: cart.id, courseId } },
    create: { cartId: cart.id, courseId },
    update: {},
  });
}

export async function removeCartItem(userId: string, courseId: string): Promise<void> {
  await prisma.cartItem.deleteMany({
    where: { courseId, cart: { userId } },
  });
}
