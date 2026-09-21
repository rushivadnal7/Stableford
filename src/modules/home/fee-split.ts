import { CONFIG } from '@/lib/config';

const { poolSharePercent } = CONFIG.prize;
const { minPercent, maxPercent } = CONFIG.charity;

export interface FeeSplit {
  poolCents: number;
  charityCents: number;
  platformCents: number;
}

/**
 * How one payment divides: prize pool, the member's charity, and the rest. Rounds down like the
 * database does, and gives the leftover cent to the platform so the parts always add up.
 */
export function feeSplit(priceCents: number, charityPercent: number): FeeSplit {
  const percent = Math.min(maxPercent, Math.max(minPercent, Math.round(charityPercent)));
  const poolCents = Math.floor((priceCents * poolSharePercent) / 100);
  const charityCents = Math.floor((priceCents * percent) / 100);
  return { poolCents, charityCents, platformCents: priceCents - poolCents - charityCents };
}

/** Share saved by paying yearly instead of twelve months, e.g. 0.1667. */
export function yearlySaving(monthlyCents: number, yearlyCents: number): number {
  return Math.max(0, 1 - yearlyCents / (monthlyCents * 12));
}

/** Whole months you get free on the yearly plan, e.g. 2. */
export function monthsFree(monthlyCents: number, yearlyCents: number): number {
  return Math.max(0, Math.round(12 - yearlyCents / monthlyCents));
}
