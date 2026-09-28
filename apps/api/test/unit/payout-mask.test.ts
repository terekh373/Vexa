import { PayoutMethod } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { maskPayoutDestination } from '../../src/modules/author/author.finance.service.js';

describe('maskPayoutDestination', () => {
  it('keeps only the last four card digits', () => {
    const full = '4444 3333 2222 1111';
    const masked = maskPayoutDestination(PayoutMethod.CARD, full);

    expect(masked).toBe('**** 1111');
    expect(masked).not.toContain('4444');
    expect(masked).not.toContain('3333');
    expect(masked).not.toContain('2222');
  });

  it('keeps only the last four IBAN characters', () => {
    const full = 'UA213223130000026007233566001';
    const masked = maskPayoutDestination(PayoutMethod.IBAN, full);

    expect(masked).toBe('**** 6001');
    expect(masked).not.toContain('UA21');
  });
});
