import { beforeAll, describe, expect, it } from 'vitest';
import { anonClient } from '@/lib/supabase/user';
import { addScores, admin, charityIds, createUser, daysAgo, daysFromNow, resetDb, subscribe, type TestUser } from './helpers';

/** A signed-in member with an active subscription. */
async function activeMember(name: string): Promise<TestUser> {
  const user = await createUser(name);
  await subscribe(user.id);
  return user;
}

const insertScore = (u: TestUser, score: number, played_on: string) =>
  u.db.from('scores').insert({ user_id: u.id, score, played_on }).select().single();

async function playedOn(u: TestUser): Promise<string[]> {
  const { data } = await u.db.from('scores').select('played_on').order('played_on', { ascending: false });
  return (data ?? []).map((r) => r.played_on as string);
}

beforeAll(resetDb);

describe('signup', () => {
  it('creates a profile with safe defaults', async () => {
    const u = await createUser('newcomer');
    const { data } = await u.db.from('profiles').select('*').eq('id', u.id).single();
    expect(data).toMatchObject({ email: u.email, full_name: 'newcomer', role: 'member', charity_percent: 10, charity_id: null });
  });
});

describe('score rules (I-1 to I-5)', () => {
  it('rejects scores outside 1-45', async () => {
    const u = await activeMember('range');
    expect((await insertScore(u, 0, daysAgo(1))).error?.code).toBe('23514');
    expect((await insertScore(u, 46, daysAgo(1))).error?.code).toBe('23514');
    expect((await insertScore(u, 1, daysAgo(1))).error).toBeNull();
    expect((await insertScore(u, 45, daysAgo(2))).error).toBeNull();
  });

  it('allows only one score per date', async () => {
    const u = await activeMember('dupe');
    await insertScore(u, 30, daysAgo(3));
    const second = await insertScore(u, 31, daysAgo(3));
    expect(second.error?.code).toBe('23505');
    expect(second.error?.message).toContain('scores_user_date_key');
  });

  it('rejects dates in the future', async () => {
    const u = await activeMember('future');
    expect((await insertScore(u, 20, daysFromNow(2))).error?.message).toBe('score_date_in_future');
  });

  it('keeps only the newest five, dropping the oldest automatically', async () => {
    const u = await activeMember('rolling');
    await addScores(u.id, [[10, daysAgo(30)], [11, daysAgo(25)], [12, daysAgo(20)], [13, daysAgo(15)], [14, daysAgo(10)]]);
    expect(await playedOn(u)).toHaveLength(5);

    expect((await insertScore(u, 15, daysAgo(5))).error).toBeNull();
    const dates = await playedOn(u);
    expect(dates).toEqual([daysAgo(5), daysAgo(10), daysAgo(15), daysAgo(20), daysAgo(25)]); // newest first; day 30 gone
  });

  it('inserts a date between existing ones and still drops only the oldest', async () => {
    const u = await activeMember('between');
    await addScores(u.id, [[10, daysAgo(30)], [11, daysAgo(25)], [12, daysAgo(20)], [13, daysAgo(15)], [14, daysAgo(10)]]);
    expect((await insertScore(u, 20, daysAgo(12))).error).toBeNull();
    const dates = await playedOn(u);
    expect(dates).toContain(daysAgo(12));
    expect(dates).not.toContain(daysAgo(30));
    expect(dates).toHaveLength(5);
  });

  it('rejects a date older than all five stored scores', async () => {
    const u = await activeMember('too-old');
    await addScores(u.id, [[10, daysAgo(5)], [11, daysAgo(4)], [12, daysAgo(3)], [13, daysAgo(2)], [14, daysAgo(1)]]);
    expect((await insertScore(u, 9, daysAgo(40))).error?.message).toBe('score_older_than_last_five');
    expect(await playedOn(u)).toHaveLength(5);
  });

  it('lets a score be edited, but not moved into the future', async () => {
    const u = await activeMember('edit');
    const { data } = await insertScore(u, 20, daysAgo(2));
    const ok = await u.db.from('scores').update({ score: 25 }).eq('id', data.id).select().single();
    expect(ok.data?.score).toBe(25);
    const bad = await u.db.from('scores').update({ played_on: daysFromNow(3) }).eq('id', data.id);
    expect(bad.error?.message).toBe('score_date_in_future');
  });

  it('never exceeds five scores under concurrent writes', async () => {
    const u = await activeMember('concurrent');
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => insertScore(u, 10 + i, daysAgo(i + 1))));
    expect(results.filter((r) => !r.error).length).toBeGreaterThanOrEqual(5);
    const dates = await playedOn(u);
    expect(dates).toHaveLength(5);
    expect(new Set(dates).size).toBe(5);
  });
});

describe('access control (I-7, I-8)', () => {
  it('lets a lapsed member read their scores but not change them', async () => {
    const u = await createUser('lapsed');
    await addScores(u.id, [[22, daysAgo(2)]]);
    for (const status of ['canceled', 'past_due', 'incomplete'] as const) {
      await subscribe(u.id, { status });
      expect((await insertScore(u, 30, daysAgo(1))).error?.code).toBe('42501');
      expect((await u.db.from('scores').select('id')).data).toHaveLength(1);
    }
  });

  it('treats a period that ended over a day ago as lapsed, but allows a one-day grace', async () => {
    const u = await createUser('grace');
    await subscribe(u.id, { periodEnd: new Date(Date.now() - 12 * 3600_000) });
    expect((await u.db.rpc('is_active_subscriber', { uid: u.id })).data).toBe(true);
    await subscribe(u.id, { periodEnd: new Date(Date.now() - 48 * 3600_000) });
    expect((await u.db.rpc('is_active_subscriber', { uid: u.id })).data).toBe(false);
  });

  it("hides one member's scores from another", async () => {
    const a = await activeMember('owner');
    const b = await activeMember('snoop');
    const { data: row } = await insertScore(a, 33, daysAgo(2));
    expect((await b.db.from('scores').select('id')).data).toEqual([]);
    const tamper = await b.db.from('scores').update({ score: 1 }).eq('id', row.id).select();
    expect(tamper.data).toEqual([]);
    expect((await a.db.from('scores').select('score').eq('id', row.id).single()).data?.score).toBe(33);
  });

  it('stops a member changing their own role or Stripe customer id', async () => {
    const u = await createUser('sneaky');
    expect((await u.db.from('profiles').update({ role: 'admin' }).eq('id', u.id)).error?.code).toBe('42501');
    expect((await u.db.from('profiles').update({ stripe_customer_id: 'cus_x' }).eq('id', u.id)).error?.code).toBe('42501');
  });

  it('lets a member edit name, charity and charity percent, within 10-50', async () => {
    const u = await createUser('giver');
    const [charity] = await charityIds(1);
    const ok = await u.db.from('profiles').update({ full_name: 'Giver', charity_id: charity, charity_percent: 25 }).eq('id', u.id).select().single();
    expect(ok.data).toMatchObject({ full_name: 'Giver', charity_id: charity, charity_percent: 25 });
    expect((await u.db.from('profiles').update({ charity_percent: 9 }).eq('id', u.id)).error?.code).toBe('23514');
    expect((await u.db.from('profiles').update({ charity_percent: 51 }).eq('id', u.id)).error?.code).toBe('23514');
  });

  it('stops a member writing their own subscription', async () => {
    const u = await createUser('freeloader');
    const { data: plan } = await admin().from('plans').select('id').eq('code', 'monthly').single();
    const res = await u.db.from('subscriptions').insert({ user_id: u.id, plan_id: plan?.id, status: 'active' });
    expect(res.error?.code).toBe('42501');
  });

  it('lets anyone read active charities, events and plans, but not profiles', async () => {
    const anon = anonClient();
    expect((await anon.from('charities').select('id')).data?.length).toBeGreaterThanOrEqual(6);
    expect((await anon.from('charity_events').select('id')).data?.length).toBeGreaterThanOrEqual(6);
    expect((await anon.from('plans').select('code')).data?.map((p) => p.code).sort()).toEqual(['monthly', 'yearly']);
    expect((await anon.from('profiles').select('id')).error?.code).toBe('42501');
  });

  it('hides inactive charities from the public', async () => {
    const [id] = await charityIds(1);
    await admin().from('charities').update({ is_active: false }).eq('id', id);
    const { data } = await anonClient().from('charities').select('id').eq('id', id);
    expect(data).toEqual([]);
    await admin().from('charities').update({ is_active: true }).eq('id', id);
  });

  it('keeps draw-engine and report functions away from members', async () => {
    const u = await createUser('curious');
    expect((await u.db.rpc('admin_report')).error?.code).toBe('42501');
    expect((await u.db.rpc('publish_draw', { p_draw_id: crypto.randomUUID(), p_admin: u.id })).error?.code).toBe('42501');
    expect((await anonClient().rpc('create_draw_snapshot', { p_draw_id: crypto.randomUUID(), p_pool_share_percent: 50 })).error?.code).toBe('42501');
  });
});

describe('draw and winner constraints', () => {
  const draft = async (period: string, extra: Record<string, unknown> = {}) =>
    admin().from('draws').insert({ period, ...extra }).select().single();

  it('accepts only YYYY-MM periods, one draw per month', async () => {
    expect((await draft('2026-13')).error?.code).toBe('23514');
    expect((await draft('26-01')).error?.code).toBe('23514');
    expect((await draft('2031-01')).error).toBeNull();
    expect((await draft('2031-01')).error?.code).toBe('23505');
  });

  it('requires a weighting for algorithmic draws only', async () => {
    expect((await draft('2031-02', { mode: 'algorithmic' })).error?.code).toBe('23514');
    expect((await draft('2031-03', { mode: 'random', weighting: 'common' })).error?.code).toBe('23514');
    expect((await draft('2031-04', { mode: 'algorithmic', weighting: 'rare' })).error).toBeNull();
  });

  it('accepts only 5 distinct numbers between 1 and 45', async () => {
    const { data } = await draft('2031-05');
    const set = (numbers: number[]) => admin().from('draws').update({ numbers }).eq('id', data.id);
    expect((await set([1, 1, 2, 3, 4])).error?.code).toBe('23514');
    expect((await set([0, 1, 2, 3, 4])).error?.code).toBe('23514');
    expect((await set([1, 2, 3, 4, 46])).error?.code).toBe('23514');
    expect((await set([1, 2, 3, 4])).error?.code).toBe('23514');
    expect((await set([5, 15, 25, 35, 45])).error).toBeNull();
  });

  it('requires every cent of a tier to be accounted for', async () => {
    const { data } = await draft('2031-06');
    const tier = (o: Record<string, number>) =>
      admin().from('draw_tiers').insert({ draw_id: data.id, tier: 3, pool_cents: 100, winner_count: 3, prize_each_cents: 30, retained_cents: 10, rolled_over_cents: 0, ...o });
    expect((await tier({ retained_cents: 9 })).error?.code).toBe('23514'); // 90 + 9 != 100
    expect((await tier({})).error).toBeNull(); // 90 + 10 == 100
  });

  it('cannot mark a winner paid before the proof is approved, or review without a proof', async () => {
    const { data: d } = await draft('2031-07');
    const u = await createUser('winner-constraints');
    const base = { draw_id: d.id, user_id: u.id, tier: 3, prize_cents: 500 };
    const w = (o: Record<string, unknown>) => admin().from('winners').insert({ ...base, ...o });
    expect((await w({ payout_status: 'paid' })).error?.code).toBe('23514');
    expect((await w({ verification_status: 'submitted' })).error?.code).toBe('23514');
    expect((await w({ verification_status: 'approved', proof_path: 'a/b.png', payout_status: 'paid' })).error).toBeNull();
    expect((await w({})).error?.code).toBe('23505'); // one row per user per draw
  });
});
