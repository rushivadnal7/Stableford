/** A draw period is a UTC calendar month written YYYY-MM (assumptions A-04 and A-15). */
export const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const periodOf = (date: Date): string => date.toISOString().slice(0, 7);

export function nextPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** The draw a member should look forward to: this month's, unless it has already been published. */
export function upcomingDrawPeriod(now: Date, publishedPeriods: readonly string[]): string {
  const current = periodOf(now);
  return publishedPeriods.includes(current) ? nextPeriod(current) : current;
}
