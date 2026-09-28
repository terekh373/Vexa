import { describe, expect, it } from 'vitest';
import { escapeLikePattern } from '../../src/modules/courses/catalog-suggest.js';

describe('escapeLikePattern', () => {
  it('escapes the percent sign', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });

  it('escapes the underscore', () => {
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
  });

  it('escapes the backslash itself', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('escapes a backslash before a wildcard without double-escaping', () => {
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%');
  });

  it('leaves ordinary text unchanged', () => {
    expect(escapeLikePattern('Квадратні рівняння')).toBe('Квадратні рівняння');
  });
});
