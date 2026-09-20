import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { createDraw, getDrawDetail, publishDraw, simulateDraw, type NumberPicker } from '@/modules/draws/service';
import { addScores, admin, charityIds, createUser, daysAgo, resetDb, subscribe, type TestUser } from './helpers';

const fixed = (numbers: number[]): NumberPicker => () => ({ seed: 'test-seed', numbers });

interface MemberSpec {
  plan?: 'monthly' | 'yearly';
  status?: 'active' | 'canceled';
  charityId?: string | null;
  charityPercent?: number;
  scores: number[];
}

async function member(name: string, spec: MemberSpec): Promise<TestUser> {
  const u = await createUser(name);
  await subscribe(u.id, { plan: spec.plan, status: spec.status, charityId: spec.charityId ?? null, charityPercent: spec.charityPercent });
  await addScores(u.id, spec.scores.map((s, i) => [s, daysAgo(i + 1)] as [number, string]));
  return u;
}

/** Run a draft through simulate and publish. */
async function runDraw(adminId: string, period: string, numbers: number[]) {
  const draw = await createDraw(admin(), adminId, { period, mode: 'random' });
  await simulateDraw(admin(), adminId, draw.id, fixed(numbers));
  return draw;
}

const expectCode = async (p: Promise<unknown>, code: string) => {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
};

let boss: TestUser;
beforeEach(async () => {
  await resetDb();
  boss = await createUser('boss', { role: 'admin' });
});

describe('a full draw with winners in every tier', () => {
  it('snapshots the pool, matches entries, splits prizes and publishes', async () => {
    const [c1, c2] = await charityIds(2);
    await member('u1', { charityId: c1, charityPercent: 10, scores: [10, 11, 12, 13, 14] }); // 5 matches
    await member('u2', { charityId: c1, charityPercent: 20, scores: [10, 11, 12, 13, 20] }); // 4 matches
    await member('u3', { plan: 'yearly', charityId: c2, charityPercent: 10, scores: [10, 11, 12, 30, 31] }); // 3 matches
    await member('u4', { charityId: c2, charityPercent: 10, scores: [10, 11, 40, 41, 42] }); // 2 matches: no prize
    await member('u5', { scores: [10, 11, 12, 13] }); // active, only 4 scores: pays in, cannot win
    await member('u6', { status: 'canceled', scores: [10, 11, 12, 13, 14] }); // lapsed: counted nowhere

    const draw = await createDraw(admin(), boss.id, { period: '2026-10', mode: 'random' });
    const sim = await simulateDraw(admin(), boss.id, draw.id, fixed([10, 11, 12, 13, 14]));

    // Pool: four monthly members at 50% of 1000 = 500 each, one yearly at 50% of floor(10000/12) = 416.
    expect(sim.draw).toMatchObject({
      status: 'draft',
      numbers: [10, 11, 12, 13, 14],
      seed: 'test-seed',
      active_subscribers: 5,
      eligible_entries: 4,
      base_pool_cents: 2416,
      rollover_in_cents: 0,
      total_pool_cents: 2416,
      rollover_out_cents: 0,
      charity_cents_total: 483, // 100 + 200 + 83 + 100; u5 chose no charity
    });

    // 2416 -> tier 4: floor(35%) = 845, tier 3: floor(25%) = 604, tier 5 takes the rest: 967.
    const tiers = Object.fromEntries(sim.tiers.map((t) => [t.tier, t]));
    expect(tiers[5]).toMatchObject({ pool_cents: 967, winner_count: 1, prize_each_cents: 967, retained_cents: 0, rolled_over_cents: 0 });
    expect(tiers[4]).toMatchObject({ pool_cents: 845, winner_count: 1, prize_each_cents: 845 });
    expect(tiers[3]).toMatchObject({ pool_cents: 604, winner_count: 1, prize_each_cents: 604 });
    expect(sim.winners.preview).toBe(true);
    expect(sim.winners.rows).toHaveLength(3);

    const contributions = await admin().from('charity_contributions').select('charity_id, amount_cents').eq('draw_id', draw.id);
    expect(Object.fromEntries((contributions.data ?? []).map((c) => [c.charity_id, c.amount_cents]))).toEqual({ [c1]: 300, [c2]: 183 });

    // Nothing is official or visible to members until published.
    expect((await admin().from('winners').select('id').eq('draw_id', draw.id)).data).toEqual([]);

    const published = await publishDraw(admin(), boss.id, draw.id);
    expect(published.draw.status).toBe('published');
    expect(published.winners.preview).toBe(false);
    const won = published.winners.rows.map((w: { tier: number; prize_cents: number; verification_status: string; payout_status: string }) => ({
      tier: w.tier, prize: w.prize_cents, verification: w.verification_status, payout: w.payout_status,
    }));
    expect(won).toEqual([
      { tier: 5, prize: 967, verification: 'awaiting_proof', payout: 'pending' },
      { tier: 4, prize: 845, verification: 'awaiting_proof', payout: 'pending' },
      { tier: 3, prize: 604, verification: 'awaiting_proof', payout: 'pending' },
    ]);
  });

  it('can be simulated repeatedly while a draft without duplicating the snapshot', async () => {
    await member('a', { scores: [1, 2, 3, 4, 5] });
    await member('b', { scores: [6, 7, 8, 9, 10] });
    const draw = await createDraw(admin(), boss.id, { period: '2026-10', mode: 'random' });
    await simulateDraw(admin(), boss.id, draw.id, fixed([1, 2, 3, 4, 5]));
    const second = await simulateDraw(admin(), boss.id, draw.id, fixed([6, 7, 8, 9, 10]));

    const entries = await admin().from('draw_entries').select('user_id').eq('draw_id', draw.id);
    expect(entries.data).toHaveLength(2);
    expect(second.draw.numbers).toEqual([6, 7, 8, 9, 10]);
    expect(second.tiers).toHaveLength(3);
  });

  it('feeds number frequencies to the algorithmic picker', async () => {
    await member('a', { scores: [10, 11, 12, 13, 14] });
    await member('b', { scores: [10, 11, 12, 13, 20] });
    await member('c', { scores: [10, 11, 30, 31, 32] });
    const draw = await createDraw(admin(), boss.id, { period: '2026-10', mode: 'algorithmic', weighting: 'common' });
    let seen: Record<string, number> = {};
    await simulateDraw(admin(), boss.id, draw.id, (input) => {
      seen = input.frequencies;
      return { seed: 's', numbers: [1, 2, 3, 4, 5] };
    });
    expect(seen).toMatchObject({ '10': 3, '11': 3, '12': 2, '13': 2, '14': 1, '20': 1, '30': 1 });
  });
});

describe('publishing rules', () => {
  it('needs a simulation first', async () => {
    const draw = await createDraw(admin(), boss.id, { period: '2026-10', mode: 'random' });
    await expectCode(publishDraw(admin(), boss.id, draw.id), 'draw_not_simulated');
  });

  it('publishes exactly once and freezes the draw for good (I-12, I-18)', async () => {
    await member('a', { scores: [1, 2, 3, 4, 5] });
    const draw = await runDraw(boss.id, '2026-10', [1, 2, 3, 4, 5]);
    await publishDraw(admin(), boss.id, draw.id);

    await expectCode(publishDraw(admin(), boss.id, draw.id), 'draw_not_draft');
    await expectCode(simulateDraw(admin(), boss.id, draw.id, fixed([9, 9, 9, 9, 9])), 'draw_not_draft');

    // Even the service role cannot rewrite history.
    expect((await admin().from('draws').update({ numbers: [40, 41, 42, 43, 44] }).eq('id', draw.id)).error?.message).toBe('draw_is_published');
    expect((await admin().from('draws').delete().eq('id', draw.id)).error?.message).toBe('draw_is_published');
    expect((await admin().from('draw_entries').delete().eq('draw_id', draw.id)).error?.message).toBe('draw_is_published');
    expect((await admin().from('draw_tiers').update({ pool_cents: 1 }).eq('draw_id', draw.id)).error?.message).toBe('draw_is_published');
  });

  it('refuses two publishes racing for the same draw', async () => {
    await member('a', { scores: [1, 2, 3, 4, 5] });
    const draw = await runDraw(boss.id, '2026-10', [1, 2, 3, 4, 5]);
    const results = await Promise.allSettled([publishDraw(admin(), boss.id, draw.id), publishDraw(admin(), boss.id, draw.id)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await admin().from('winners').select('id').eq('draw_id', draw.id)).data).toHaveLength(1);
  });

  it('will not publish a month older than one already published', async () => {
    await member('a', { scores: [1, 2, 3, 4, 5] });
    const later = await runDraw(boss.id, '2026-11', [40, 41, 42, 43, 44]);
    const earlier = await runDraw(boss.id, '2026-10', [40, 41, 42, 43, 44]);
    await publishDraw(admin(), boss.id, later.id);
    await expectCode(publishDraw(admin(), boss.id, earlier.id), 'draw_out_of_order');
  });
});

describe('jackpot rollover (PRD section 07)', () => {
  it('carries an unclaimed 5-match jackpot forward until someone wins it', async () => {
    await member('a', { scores: [7, 8, 9, 10, 11] });
    await member('b', { scores: [20, 21, 22, 23, 24] });
    const miss = [1, 2, 3, 4, 5];

    // Month 1: pool 1000, nobody matches. Tier 5 (400) rolls over; tiers 4 and 3 are retained, not rolled.
    const jan = await runDraw(boss.id, '2026-01', miss);
    const janDetail = await publishDraw(admin(), boss.id, jan.id);
    expect(janDetail.draw).toMatchObject({ total_pool_cents: 1000, rollover_out_cents: 400 });
    expect(janDetail.tiers.find((t) => t.tier === 4)).toMatchObject({ retained_cents: 350, rolled_over_cents: 0 });
    expect(janDetail.tiers.find((t) => t.tier === 3)).toMatchObject({ retained_cents: 250, rolled_over_cents: 0 });

    // Month 2: the 400 joins the jackpot. Still nobody wins, so 800 rolls over.
    const feb = await runDraw(boss.id, '2026-02', miss);
    const febDetail = await publishDraw(admin(), boss.id, feb.id);
    expect(febDetail.draw).toMatchObject({ rollover_in_cents: 400, total_pool_cents: 1400, rollover_out_cents: 800 });

    // Month 3: member a matches all five and takes the whole jackpot: 400 + 800.
    const mar = await runDraw(boss.id, '2026-03', [7, 8, 9, 10, 11]);
    const marDetail = await publishDraw(admin(), boss.id, mar.id);
    expect(marDetail.draw).toMatchObject({ rollover_in_cents: 800, total_pool_cents: 1800, rollover_out_cents: 0 });
    expect(marDetail.tiers.find((t) => t.tier === 5)).toMatchObject({ pool_cents: 1200, winner_count: 1, prize_each_cents: 1200 });
    expect(marDetail.winners.rows).toHaveLength(1);
  });

  it('refuses to publish a draw whose rollover went stale', async () => {
    await member('a', { scores: [20, 21, 22, 23, 24] });
    const miss = [1, 2, 3, 4, 5];
    // One member pays 500 into the pool, so the jackpot share is 200 (500 - 175 - 125).
    const jan = await runDraw(boss.id, '2026-01', miss);
    await publishDraw(admin(), boss.id, jan.id); // rolls 200 over

    // March is simulated now, taking the 200 as its rollover...
    const mar = await runDraw(boss.id, '2026-03', miss);
    expect((await getDrawDetail(admin(), mar.id)).draw.rollover_in_cents).toBe(200);
    // ...then February is published, and its jackpot (200 + 200) rolls over. March's figure is now wrong.
    const feb = await runDraw(boss.id, '2026-02', miss);
    await publishDraw(admin(), boss.id, feb.id);
    await expectCode(publishDraw(admin(), boss.id, mar.id), 'draw_stale_rollover');

    // Re-simulating picks up the new rollover, and then it publishes.
    const resim = await simulateDraw(admin(), boss.id, mar.id, fixed(miss));
    expect(resim.draw.rollover_in_cents).toBe(400);
    await publishDraw(admin(), boss.id, mar.id);
  });
});

describe('the database double-checks the prize ledger', () => {
  it('rejects a ledger that does not add up to the pool', async () => {
    await member('a', { scores: [1, 2, 3, 4, 5] });
    const draw = await createDraw(admin(), boss.id, { period: '2026-10', mode: 'random' });
    await simulateDraw(admin(), boss.id, draw.id, fixed([1, 2, 3, 4, 5]));

    const tier = (t: number, pool: number, winners: number, each: number, retained: number, rolled: number) => ({
      tier: t, pool_cents: pool, winner_count: winners, prize_each_cents: each, retained_cents: retained, rolled_over_cents: rolled,
    });
    // Pool is 500. Claim 501 in total.
    const bad = await admin().rpc('store_draw_tiers', {
      p_draw_id: draw.id,
      p_tiers: [tier(5, 201, 1, 201, 0, 0), tier(4, 175, 0, 0, 175, 0), tier(3, 125, 0, 0, 125, 0)],
      p_rollover_out_cents: 0,
    });
    expect(bad.error?.message).toBe('draw_pool_mismatch');

    // Right total, but the winner count contradicts the entries that actually matched.
    const wrongWinners = await admin().rpc('store_draw_tiers', {
      p_draw_id: draw.id,
      p_tiers: [tier(5, 200, 0, 0, 0, 200), tier(4, 175, 1, 175, 0, 0), tier(3, 125, 0, 0, 125, 0)],
      p_rollover_out_cents: 200,
    });
    expect(wrongWinners.error?.message).toBe('draw_tier_mismatch');
  });
});

describe('the admin report', () => {
  it('sums users, pool, charity totals and draw statistics', async () => {
    const [c1] = await charityIds(1);
    await member('a', { charityId: c1, charityPercent: 10, scores: [1, 2, 3, 4, 5] });
    const draw = await runDraw(boss.id, '2026-10', [1, 2, 3, 4, 5]);
    await publishDraw(admin(), boss.id, draw.id);
    await admin().from('donations').insert({ user_id: boss.id, charity_id: c1, amount_cents: 2500, stripe_session_id: 'cs_test_1' });

    const { data, error } = await admin().rpc('admin_report');
    expect(error).toBeNull();
    expect(data).toMatchObject({ total_users: 2, active_subscribers: 1, draws_published: 1, total_prize_pool_cents: 500, winners_total: 1, pending_verifications: 0 });
    const mine = data.charity_totals.find((c: { charity_id: string }) => c.charity_id === c1);
    expect(mine).toMatchObject({ subscription_cents: 100, donation_cents: 2500, total_cents: 2600 });
    expect(data.draw_stats[0]).toMatchObject({ period: '2026-10', eligible_entries: 1, winners: 1 });
    expect((await getDrawDetail(admin(), draw.id)).draw.status).toBe('published');
  });
});
