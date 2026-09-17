import { AppError } from '../../lib/errors.js';
import {
  addCartItem,
  findCartLines,
  findCourseForPurchase,
  hasActiveEnrollment,
  removeCartItem,
  type CartLine,
} from './cart.repository.js';
import { getPurchaseBlocker, purchaseBlockerMessage, ORDER_CURRENCY } from './purchase-rules.js';

function displayNameOf(author: CartLine['course']['author']): string {
  return author.authorProfile?.displayName ?? author.fullName;
}

export async function getCart(userId: string) {
  const { lines, ownedCourseIds } = await findCartLines(userId);

  const items = lines.map((line) => {
    const blocker = getPurchaseBlocker(userId, line.course, ownedCourseIds.has(line.courseId));

    return {
      courseId: line.courseId,
      slug: line.course.slug,
      title: line.course.title,
      type: line.course.type,
      priceAmount: line.course.priceAmount,
      currency: line.course.currency,
      coverFileId: line.course.coverFileId,
      author: { id: line.course.authorId, displayName: displayNameOf(line.course.author) },
      isAvailable: blocker === null,
      unavailableReason: blocker === null ? null : purchaseBlockerMessage(blocker),
      addedAt: line.createdAt,
    };
  });

  const totalAmount = items
    .filter((item) => item.isAvailable)
    .reduce((sum, item) => sum + item.priceAmount, 0);

  return {
    items,
    itemsCount: items.length,
    totalAmount,
    currency: ORDER_CURRENCY,
  };
}

export async function addItem(userId: string, courseId: string) {
  const course = await findCourseForPurchase(courseId);
  if (course === null || course.deletedAt !== null) {
    throw AppError.notFound('Course not found');
  }

  const owned = await hasActiveEnrollment(userId, courseId);
  const blocker = getPurchaseBlocker(userId, course, owned);
  if (blocker !== null) {
    throw AppError.conflict('Course cannot be purchased', [
      { field: 'courseId', message: purchaseBlockerMessage(blocker) },
    ]);
  }

  await addCartItem(userId, courseId);
  return getCart(userId);
}

export async function removeItem(userId: string, courseId: string) {
  await removeCartItem(userId, courseId);
  return getCart(userId);
}
