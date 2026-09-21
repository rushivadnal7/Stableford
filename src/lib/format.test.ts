import { describe, expect, it } from 'vitest';
import { formatMoney, formatPercent } from './format';

describe('formatMoney', () => {
  it('drops the decimals for whole amounts', () => {
    expect(formatMoney(1000)).toBe('$10');
    expect(formatMoney(10000)).toBe('$100');
    expect(formatMoney(0)).toBe('$0');
  });

  it('keeps two decimals otherwise', () => {
    expect(formatMoney(1050)).toBe('$10.50');
    expect(formatMoney(99)).toBe('$0.99');
  });

  it('separates thousands', () => {
    expect(formatMoney(123_456_00)).toBe('$123,456');
  });
});

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(0.1667)).toBe('17%');
    expect(formatPercent(0.5)).toBe('50%');
  });
});
