/**
 * Business constants in one place. The database enforces the same limits with
 * CHECK constraints (see supabase/migrations), so keep the two in step; the
 * integration tests fail if they drift.
 */
export const CONFIG = {
  /** Stripe currency for every charge. Prices themselves live in the `plans` table. */
  currency: 'usd',

  score: { min: 1, max: 45, keep: 5 },

  charity: { minPercent: 10, maxPercent: 50, defaultPercent: 10 },

  prize: {
    /** Share of each subscriber's monthly-equivalent fee that feeds the prize pool (assumption A-06). */
    poolSharePercent: 50,
    /** How the month's pool is split. Must add up to 100. Only tier 5 rolls over. */
    tierSharePercent: { 5: 40, 4: 35, 3: 25 } as Record<Tier, number>,
    numbersPerDraw: 5,
    numberMin: 1,
    numberMax: 45,
  },

  proof: {
    maxBytes: 5 * 1024 * 1024,
    extensions: ['png', 'jpg', 'jpeg', 'webp'] as const,
  },

  /** Lifetime of a signed URL handed to the browser, in seconds. */
  signedUrlTtlSeconds: 300,
} as const;

/** A prize tier is the number of drawn numbers a subscriber matched. */
export type Tier = 3 | 4 | 5;
export const TIERS: readonly Tier[] = [5, 4, 3];
