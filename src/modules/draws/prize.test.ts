import { describe, expect, it } from 'vitest';
import { CONFIG, TIERS } from '@/lib/config';
import { createRng } from './engine';
import { computePrizes, type PrizeResult } from './prize';

const tier = (r: PrizeResult, t: 3 | 4 | 5) => r.tiers.find((x) => x.tier === t)!;

/** Every cent of the pool must end up as a prize, retained, or rolled over. */
function expectLedgerBalances(r: PrizeResult) {
  for (const t of r.tiers) {
    expect(t.prizeEachCents * t.winnerCount + t.retainedCents + t.rolledOverCents).toBe(t.poolCents);
  }
  const paid = r.tiers.reduce((s, t) => s + t.prizeEachCents * t.winnerCount, 0);
  expect(paid + r.retainedCents + r.rolloverOutCents).toBe(r.totalPoolCents);
}

describe('prize config', () => {
  it('tier shares add up to 100%', () => {
    const sum = TIERS.reduce((s, t) => s + CONFIG.prize.tierSharePercent[t], 0);
    expect(sum).toBe(100);
  });
});

describe('computePrizes', () => {
  it('splits 40/35/25 and pays winners of a tier equally', () => {
    const r = computePrizes({ basePoolCents: 10_000, rolloverInCents: 0, winnersByTier: { 5: 1, 4: 2, 3: 5 } });
    expect(tier(r, 5)).toMatchObject({ poolCents: 4000, prizeEachCents: 4000, retainedCents: 0 });
    expect(tier(r, 4)).toMatchObject({ poolCents: 3500, prizeEachCents: 1750 });
    expect(tier(r, 3)).toMatchObject({ poolCents: 2500, prizeEachCents: 500 });
    expect(r.rolloverOutCents).toBe(0);
    expectLedgerBalances(r);
  });

  it('rounds each share down and gives the remainder cents to the jackpot tier so none go missing', () => {
    const r = computePrizes({ basePoolCents: 1001, rolloverInCents: 0, winnersByTier: {} });
    expect(tier(r, 4).poolCents).toBe(350);
    expect(tier(r, 3).poolCents).toBe(250);
    expect(tier(r, 5).poolCents).toBe(401);
    expect(r.totalPoolCents).toBe(1001);
  });

  it('retains leftover cents when a tier does not divide evenly', () => {
    const r = computePrizes({ basePoolCents: 10_000, rolloverInCents: 0, winnersByTier: { 4: 3 } });
    expect(tier(r, 4)).toMatchObject({ prizeEachCents: 1166, retainedCents: 2 }); // 3500 = 3 x 1166 + 2
    expectLedgerBalances(r);
  });

  it('rolls an unclaimed 5-match jackpot into the next draw in full', () => {
    const r = computePrizes({ basePoolCents: 10_000, rolloverInCents: 0, winnersByTier: { 4: 1, 3: 1 } });
    expect(tier(r, 5)).toMatchObject({ winnerCount: 0, prizeEachCents: 0, rolledOverCents: 4000, retainedCents: 0 });
    expect(r.rolloverOutCents).toBe(4000);
    expectLedgerBalances(r);
  });

  it('adds the rolled-in jackpot to the 5-match tier only', () => {
    const r = computePrizes({ basePoolCents: 1000, rolloverInCents: 5000, winnersByTier: { 5: 2 } });
    expect(tier(r, 5)).toMatchObject({ poolCents: 5400, prizeEachCents: 2700 });
    expect(tier(r, 4).poolCents).toBe(350);
    expect(tier(r, 3).poolCents).toBe(250);
    expect(r.totalPoolCents).toBe(6000);
    expect(r.rolloverOutCents).toBe(0);
    expectLedgerBalances(r);
  });

  it('keeps the jackpot growing while nobody wins it', () => {
    const month1 = computePrizes({ basePoolCents: 1000, rolloverInCents: 0, winnersByTier: {} });
    const month2 = computePrizes({ basePoolCents: 1000, rolloverInCents: month1.rolloverOutCents, winnersByTier: {} });
    expect(month1.rolloverOutCents).toBe(400);
    expect(month2.rolloverOutCents).toBe(800);
  });

  it('does not roll over unclaimed 4- and 3-match tiers; the platform retains them', () => {
    const r = computePrizes({ basePoolCents: 10_000, rolloverInCents: 0, winnersByTier: { 5: 1 } });
    expect(tier(r, 4)).toMatchObject({ retainedCents: 3500, rolledOverCents: 0 });
    expect(tier(r, 3)).toMatchObject({ retainedCents: 2500, rolledOverCents: 0 });
    expect(r.rolloverOutCents).toBe(0);
    expect(r.retainedCents).toBe(6000);
    expectLedgerBalances(r);
  });

  it('handles an empty month', () => {
    const r = computePrizes({ basePoolCents: 0, rolloverInCents: 0, winnersByTier: {} });
    expect(r.totalPoolCents).toBe(0);
    expectLedgerBalances(r);
  });

  it('rejects amounts that are negative or not whole cents', () => {
    expect(() => computePrizes({ basePoolCents: -1, rolloverInCents: 0, winnersByTier: {} })).toThrow(RangeError);
    expect(() => computePrizes({ basePoolCents: 10.5, rolloverInCents: 0, winnersByTier: {} })).toThrow(RangeError);
    expect(() => computePrizes({ basePoolCents: 0, rolloverInCents: -5, winnersByTier: {} })).toThrow(RangeError);
  });

  it('never creates or loses a cent, for any pool, rollover and winner mix', () => {
    const rng = createRng('prize-property-test');
    for (let i = 0; i < 2000; i++) {
      const r = computePrizes({
        basePoolCents: Math.floor(rng() * 5_000_000),
        rolloverInCents: rng() < 0.4 ? Math.floor(rng() * 2_000_000) : 0,
        winnersByTier: { 5: Math.floor(rng() * 4), 4: Math.floor(rng() * 20), 3: Math.floor(rng() * 200) },
      });
      expectLedgerBalances(r);
    }
  });
});
