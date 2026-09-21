import { describe, expect, it } from 'vitest';
import { feeSplit, monthsFree, yearlySaving } from './fee-split';

describe('feeSplit', () => {
  it('divides a $10 payment at the 10% minimum: 50% pool, 10% charity, rest platform', () => {
    expect(feeSplit(1000, 10)).toEqual({ poolCents: 500, charityCents: 100, platformCents: 400 });
  });

  it('gives the platform less as the charity share grows, never below zero', () => {
    expect(feeSplit(1000, 30)).toEqual({ poolCents: 500, charityCents: 300, platformCents: 200 });
    expect(feeSplit(1000, 50)).toEqual({ poolCents: 500, charityCents: 500, platformCents: 0 });
  });

  it('keeps the charity share within 10 to 50 percent', () => {
    expect(feeSplit(1000, 3).charityCents).toBe(100);
    expect(feeSplit(1000, 90).charityCents).toBe(500);
  });

  it('always adds back up to the price, including awkward amounts', () => {
    for (const price of [1, 99, 333, 1001, 10000]) {
      for (const pct of [10, 17, 33, 50]) {
        const s = feeSplit(price, pct);
        expect(s.poolCents + s.charityCents + s.platformCents).toBe(price);
        expect(s.platformCents).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('yearly plan maths', () => {
  it('works out the saving and the free months for $10 vs $100', () => {
    expect(yearlySaving(1000, 10000)).toBeCloseTo(0.1667, 3);
    expect(monthsFree(1000, 10000)).toBe(2);
  });

  it('never reports a negative saving', () => {
    expect(yearlySaving(1000, 20000)).toBe(0);
    expect(monthsFree(1000, 20000)).toBe(0);
  });
});
