import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  classifyStatus,
  encodeData,
  formatAmount,
  signData,
  toKopiykas,
  verifySignature,
} from '../../src/modules/payments/liqpay.js';

const PRIVATE_KEY = 'sandbox_test_private_key';

describe('liqpay signing', () => {
  it('accepts a signature produced by signData', () => {
    const data = encodeData({ order_id: 'abc', status: 'success', amount: 100, currency: 'UAH' });
    const signature = signData(data, PRIVATE_KEY);

    expect(verifySignature(data, signature, PRIVATE_KEY)).toBe(true);
  });

  it('rejects a signature after the data was tampered with', () => {
    const data = encodeData({ order_id: 'abc', status: 'success', amount: 100, currency: 'UAH' });
    const signature = signData(data, PRIVATE_KEY);
    const tamperedData = encodeData({ order_id: 'abc', status: 'failure', amount: 100, currency: 'UAH' });

    expect(verifySignature(tamperedData, signature, PRIVATE_KEY)).toBe(false);
  });

  it('rejects a signature of a different length without throwing', () => {
    const data = encodeData({ order_id: 'abc', status: 'success', amount: 100, currency: 'UAH' });

    expect(() => verifySignature(data, 'not-a-valid-signature', PRIVATE_KEY)).not.toThrow();
    expect(verifySignature(data, 'not-a-valid-signature', PRIVATE_KEY)).toBe(false);
  });

  it('accepts the sha3-256 variant of the signature', () => {
    const data = encodeData({ order_id: 'abc', status: 'success', amount: 100, currency: 'UAH' });
    const sha3Signature = createHash('sha3-256')
      .update(PRIVATE_KEY + data + PRIVATE_KEY)
      .digest('base64');

    expect(verifySignature(data, sha3Signature, PRIVATE_KEY)).toBe(true);
  });
});

describe('liqpay formatAmount', () => {
  it('formats whole and fractional kopiykas', () => {
    expect(formatAmount(29_900)).toBe('299.00');
    expect(formatAmount(5)).toBe('0.05');
    expect(formatAmount(29_999)).toBe('299.99');
    expect(formatAmount(0)).toBe('0.00');
  });
});

describe('liqpay toKopiykas', () => {
  it('rounds a hryvnia amount to the nearest kopiyka', () => {
    expect(toKopiykas(299.9)).toBe(29_990);
  });
});

describe('liqpay classifyStatus', () => {
  it('classifies known statuses', () => {
    expect(classifyStatus('sandbox')).toBe('success');
    expect(classifyStatus('success')).toBe('success');
    expect(classifyStatus('failure')).toBe('failure');
    expect(classifyStatus('processing')).toBe('pending');
    expect(classifyStatus('reversed')).toBe('ignored');
  });
});
