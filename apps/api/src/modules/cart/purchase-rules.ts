/**
 * Pure purchase rules, shared by the cart and by order creation, so "what can
 * be bought" is defined in exactly one place.
 */
import type { CourseStatus } from '@prisma/client';

// LiqPay sandbox only settles in hryvnia: a course priced in another currency
// cannot be mixed into a UAH order total.
export const ORDER_CURRENCY = 'UAH';

export type PurchaseBlocker =
  | 'NOT_AVAILABLE'
  | 'FREE'
  | 'OWN_COURSE'
  | 'ALREADY_OWNED'
  | 'UNSUPPORTED_CURRENCY';

export interface PurchaseCandidate {
  status: CourseStatus;
  deletedAt: Date | null;
  priceAmount: number;
  currency: string;
  authorId: string;
}

export function getPurchaseBlocker(
  buyerId: string,
  course: PurchaseCandidate,
  hasActiveEnrollment: boolean,
): PurchaseBlocker | null {
  if (course.status !== 'PUBLISHED' || course.deletedAt !== null) {
    return 'NOT_AVAILABLE';
  }

  if (course.priceAmount === 0) {
    return 'FREE';
  }

  if (course.authorId === buyerId) {
    return 'OWN_COURSE';
  }

  if (hasActiveEnrollment) {
    return 'ALREADY_OWNED';
  }

  if (course.currency !== ORDER_CURRENCY) {
    return 'UNSUPPORTED_CURRENCY';
  }

  return null;
}

export function purchaseBlockerMessage(blocker: PurchaseBlocker): string {
  switch (blocker) {
    case 'NOT_AVAILABLE':
      return 'Курс недоступний для купівлі';
    case 'FREE':
      return 'Курс безкоштовний, купувати його не потрібно';
    case 'OWN_COURSE':
      return 'Не можна купити власний курс';
    case 'ALREADY_OWNED':
      return 'Курс уже придбано';
    case 'UNSUPPORTED_CURRENCY':
      return 'Курс продається у валюті, яку не підтримує оплата';
  }
}
