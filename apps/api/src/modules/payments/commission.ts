/**
 * Commission split for one order item, applied once at payment confirmation.
 */

/**
 * Rounds the commission down, in the author's favor: `commissionAmount =
 * floor(price * bps / 10000)`, `authorAmount = price - commissionAmount`.
 * The invariant `commissionAmount + authorAmount === priceAmount` holds by
 * construction, not by a separate check. Matches prisma/seed.ts's
 * `splitPrice` so seeded and live payments split money the same way.
 *
 * Inputs are expected to already be valid (integer kopiykas, bps in
 * [0, 10000]) — a violation here is a programming error, not a user error,
 * so it throws a plain `Error` rather than an `AppError`.
 */
export function splitPrice(
  priceAmount: number,
  commissionRateBps: number,
): { commissionAmount: number; authorAmount: number } {
  if (!Number.isInteger(priceAmount) || priceAmount < 0) {
    throw new Error(`splitPrice: priceAmount must be a non-negative integer, got ${priceAmount}`);
  }
  if (!Number.isInteger(commissionRateBps) || commissionRateBps < 0 || commissionRateBps > 10_000) {
    throw new Error(
      `splitPrice: commissionRateBps must be an integer in [0, 10000], got ${commissionRateBps}`,
    );
  }

  const commissionAmount = Math.floor((priceAmount * commissionRateBps) / 10_000);
  return { commissionAmount, authorAmount: priceAmount - commissionAmount };
}

export function resolveCommissionRateBps(authorOverride: number | null, defaultBps: number): number {
  return authorOverride ?? defaultBps;
}
