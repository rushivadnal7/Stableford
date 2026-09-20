import { CONFIG, TIERS, type Tier } from '@/lib/config';

/** What one prize tier looks like after a draw. Every cent of `poolCents` is accounted for. */
export interface TierResult {
  tier: Tier;
  /** The tier's share of the month's pool. The 5-match tier also includes the rolled-in jackpot. */
  poolCents: number;
  winnerCount: number;
  prizeEachCents: number;
  /** Cents the platform keeps: rounding leftovers, or the whole pool of an unclaimed 3/4-match tier. */
  retainedCents: number;
  /** Only the 5-match tier rolls over, and only when nobody wins it. */
  rolledOverCents: number;
}

export interface PrizeResult {
  tiers: TierResult[];
  totalPoolCents: number;
  rolloverOutCents: number;
  retainedCents: number;
}

export interface PrizeInput {
  /** Sum of every active subscriber's pool contribution for the month. */
  basePoolCents: number;
  /** Jackpot carried over from the previous published draw. */
  rolloverInCents: number;
  winnersByTier: Partial<Record<Tier, number>>;
}

/**
 * Split the month's pool into tiers and pay each tier's winners equally (PRD section 07).
 *
 * Rules, all covered by tests:
 *  - Tiers get 40% / 35% / 25% of the base pool. Tiers 4 and 3 round down; the 5-match tier takes the
 *    remainder so the three shares add up to the base pool exactly and no cent goes missing.
 *  - The rolled-in jackpot is added to the 5-match tier only.
 *  - Winners of a tier share it equally, rounded down to the cent. The leftover cents are retained.
 *  - An unclaimed 5-match tier rolls over in full. An unclaimed 4- or 3-match tier does not roll over
 *    (PRD); it is retained and shown in the ledger (assumption A-07).
 */
export function computePrizes(input: PrizeInput): PrizeResult {
  const { basePoolCents, rolloverInCents, winnersByTier } = input;
  for (const [name, value] of Object.entries({ basePoolCents, rolloverInCents })) {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  }

  const percent = CONFIG.prize.tierSharePercent;
  const share4 = Math.floor((basePoolCents * percent[4]) / 100);
  const share3 = Math.floor((basePoolCents * percent[3]) / 100);
  const shares: Record<Tier, number> = {
    5: basePoolCents - share4 - share3 + rolloverInCents,
    4: share4,
    3: share3,
  };

  const tiers = TIERS.map((tier): TierResult => {
    const poolCents = shares[tier];
    const winnerCount = winnersByTier[tier] ?? 0;

    if (winnerCount > 0) {
      const prizeEachCents = Math.floor(poolCents / winnerCount);
      return { tier, poolCents, winnerCount, prizeEachCents, retainedCents: poolCents - prizeEachCents * winnerCount, rolledOverCents: 0 };
    }
    const rolls = tier === 5;
    return { tier, poolCents, winnerCount: 0, prizeEachCents: 0, retainedCents: rolls ? 0 : poolCents, rolledOverCents: rolls ? poolCents : 0 };
  });

  return {
    tiers,
    totalPoolCents: basePoolCents + rolloverInCents,
    rolloverOutCents: tiers.reduce((sum, t) => sum + t.rolledOverCents, 0),
    retainedCents: tiers.reduce((sum, t) => sum + t.retainedCents, 0),
  };
}
