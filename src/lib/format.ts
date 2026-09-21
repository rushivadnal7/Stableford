import { CONFIG } from '@/lib/config';

const LOCALE = 'en-US';

/** Cents to a price. Whole amounts drop the decimals: 1000 -> "$10", 1050 -> "$10.50". */
export function formatMoney(cents: number, currency: string = CONFIG.currency): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** 0.1667 -> "17%". */
export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}
