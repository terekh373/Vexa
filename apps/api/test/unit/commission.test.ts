import { describe, expect, it } from 'vitest';
import { splitPrice } from '../../src/modules/payments/commission.js';

describe('commission.splitPrice', () => {
  it('splits 50000 at 1500 bps into 7500 / 42500', () => {
    expect(splitPrice(50_000, 1500)).toEqual({ commissionAmount: 7500, authorAmount: 42_500 });
  });

  it('splits 29999 at 1500 bps into 4499 / 25500', () => {
    expect(splitPrice(29_999, 1500)).toEqual({ commissionAmount: 4499, authorAmount: 25_500 });
  });

  it('splits 1 at 1500 bps into 0 / 1', () => {
    expect(splitPrice(1, 1500)).toEqual({ commissionAmount: 0, authorAmount: 1 });
  });

  it('gives the whole price to the author at 0 bps', () => {
    expect(splitPrice(29_900, 0)).toEqual({ commissionAmount: 0, authorAmount: 29_900 });
  });

  it('gives the whole price to the platform at 10000 bps', () => {
    expect(splitPrice(29_900, 10_000)).toEqual({ commissionAmount: 29_900, authorAmount: 0 });
  });

  it('keeps commissionAmount + authorAmount === priceAmount across a range of prices', () => {
    const prices = [0, 1, 5, 99, 100, 9_900, 19_900, 29_900, 123_456, 999_999];
    const rates = [0, 1, 1500, 2500, 5000, 9999, 10_000];

    for (const price of prices) {
      for (const rate of rates) {
        const { commissionAmount, authorAmount } = splitPrice(price, rate);
        expect(commissionAmount + authorAmount).toBe(price);
        expect(commissionAmount).toBeGreaterThanOrEqual(0);
        expect(authorAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('throws on a bps value outside [0, 10000]', () => {
    expect(() => splitPrice(1000, -1)).toThrow();
    expect(() => splitPrice(1000, 10_001)).toThrow();
  });

  it('throws on a non-integer price', () => {
    expect(() => splitPrice(100.5, 1500)).toThrow();
    expect(() => splitPrice(-100, 1500)).toThrow();
  });
});
