/**
 * LiqPay protocol helpers.
 *
 * Pure functions only: no Prisma, no Express. Everything here operates on
 * plain strings/numbers so it can be unit tested without a database and
 * reused by the dev webhook script.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';
export const LIQPAY_API_VERSION = 3;

export function encodeData(params: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
}

export function signData(data: string, privateKey: string): string {
  return createHash('sha1')
    .update(privateKey + data + privateKey)
    .digest('base64');
}

/**
 * LiqPay's own documentation is inconsistent about the hash: the prose
 * describes sha3-256, but every code sample signs with sha1. Both are
 * accepted here so neither a documentation-following nor a sample-following
 * caller gets rejected. Comparison is constant-time; buffer lengths are
 * checked first because `timingSafeEqual` throws on a length mismatch
 * instead of returning false.
 */
export function verifySignature(data: string, signature: string, privateKey: string): boolean {
  const provided = Buffer.from(signature, 'base64');
  const candidates = [
    createHash('sha1').update(privateKey + data + privateKey).digest(),
    createHash('sha3-256').update(privateKey + data + privateKey).digest(),
  ];

  return candidates.some(
    (candidate) => candidate.length === provided.length && timingSafeEqual(candidate, provided),
  );
}

export function decodeData(data: string): unknown {
  try {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export function formatAmount(kopiykas: number): string {
  return `${Math.trunc(kopiykas / 100)}.${String(kopiykas % 100).padStart(2, '0')}`;
}

/**
 * LiqPay sends `amount` as a number of hryvnias (e.g. 299.9), not kopiykas.
 * For any amount with at most 2 decimal digits the float representation
 * error is well under half a kopiyka, so `Math.round` recovers the exact
 * integer. The float value only ever exists on this boundary — it is never
 * stored; everything downstream works in integer kopiykas.
 */
export function toKopiykas(amount: number): number {
  return Math.round(amount * 100);
}

export type LiqpayStatusKind = 'success' | 'failure' | 'pending' | 'ignored';

const SUCCESS_STATUSES = new Set(['success', 'sandbox']);
const FAILURE_STATUSES = new Set(['failure', 'error']);
const PENDING_STATUSES = new Set([
  'processing',
  'prepared',
  'wait_secure',
  'wait_accept',
  '3ds_verify',
  'otp_verify',
  'cvv_verify',
  'wait_sender',
  'wait_qr',
  'wait_card',
  'wait_compensation',
  'invoice_wait',
  'cash_wait',
]);

/**
 * `reversed` (a refund) and any unrecognized status fall through to
 * `ignored` — refunds are a separate, not-yet-built feature.
 */
export function classifyStatus(status: string): LiqpayStatusKind {
  if (SUCCESS_STATUSES.has(status)) return 'success';
  if (FAILURE_STATUSES.has(status)) return 'failure';
  if (PENDING_STATUSES.has(status)) return 'pending';
  return 'ignored';
}

// Not strict: LiqPay is free to add fields, and this schema only needs the
// ones the webhook actually reads.
export const liqpayCallbackSchema = z.object({
  order_id: z.string(),
  status: z.string(),
  amount: z.number().finite().nonnegative(),
  currency: z.string(),
  payment_id: z.number().or(z.string()).optional(),
  err_code: z.string().optional(),
  err_description: z.string().optional(),
});

export type LiqpayCallback = z.infer<typeof liqpayCallbackSchema>;
