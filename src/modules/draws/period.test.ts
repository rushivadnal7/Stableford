import { describe, expect, it } from 'vitest';
import { nextPeriod, PERIOD_PATTERN, periodOf, upcomingDrawPeriod } from './period';

describe('periods', () => {
  it('formats a date as its UTC month', () => {
    expect(periodOf(new Date('2026-10-05T12:00:00Z'))).toBe('2026-10');
    expect(periodOf(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
    expect(periodOf(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01');
  });

  it('rolls December over into January of the next year', () => {
    expect(nextPeriod('2026-09')).toBe('2026-10');
    expect(nextPeriod('2026-12')).toBe('2027-01');
  });

  it('validates the YYYY-MM shape', () => {
    for (const ok of ['2026-01', '2026-12', '1999-06']) expect(PERIOD_PATTERN.test(ok)).toBe(true);
    for (const bad of ['2026-13', '2026-00', '26-01', '2026-1', '2026-01-01', '']) expect(PERIOD_PATTERN.test(bad)).toBe(false);
  });

  it("points a member at this month's draw until it is published, then next month's", () => {
    const now = new Date('2026-10-15T00:00:00Z');
    expect(upcomingDrawPeriod(now, [])).toBe('2026-10');
    expect(upcomingDrawPeriod(now, ['2026-09'])).toBe('2026-10');
    expect(upcomingDrawPeriod(now, ['2026-10', '2026-09'])).toBe('2026-11');
    expect(upcomingDrawPeriod(new Date('2026-12-20T00:00:00Z'), ['2026-12'])).toBe('2027-01');
  });

  it('skips past a run of several already-published months in a row, not just one', () => {
    const now = new Date('2026-09-15T00:00:00Z');
    expect(upcomingDrawPeriod(now, ['2026-09', '2026-10'])).toBe('2026-11');
    expect(upcomingDrawPeriod(now, ['2026-09', '2026-10', '2026-11', '2026-12'])).toBe('2027-01');
  });
});
