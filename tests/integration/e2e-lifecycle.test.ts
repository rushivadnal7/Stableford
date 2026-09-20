import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as adminDrawsRoute from '@/app/api/admin/draws/route';
import * as publishRoute from '@/app/api/admin/draws/[id]/publish/route';
import * as simulateRoute from '@/app/api/admin/draws/[id]/simulate/route';
import * as reportsRoute from '@/app/api/admin/reports/route';
import * as reviewRoute from '@/app/api/admin/winners/[id]/review/route';
import * as payRoute from '@/app/api/admin/winners/[id]/pay/route';
import * as adminWinnersRoute from '@/app/api/admin/winners/route';
import * as charitiesRoute from '@/app/api/charities/route';
import * as checkoutRoute from '@/app/api/checkout/route';
import * as donationRoute from '@/app/api/donations/checkout/route';
import * as drawRoute from '@/app/api/draws/[id]/route';
import * as dashboardRoute from '@/app/api/me/dashboard/route';
import * as meRoute from '@/app/api/me/route';
import * as plansRoute from '@/app/api/plans/route';
import * as scoresRoute from '@/app/api/scores/route';
import * as webhookRoute from '@/app/api/webhooks/stripe/route';
import * as proofRoute from '@/app/api/winners/[id]/proof/route';
import * as proofUploadRoute from '@/app/api/winners/[id]/proof-upload/route';
import { call } from './api';
import { admin, createUser, daysAgo, resetDb, type TestUser } from './helpers';

// Stripe: real signatures, faked API. Draw numbers: fixed so the outcome is known.
const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), sessionsCreate: vi.fn(), customersCreate: vi.fn() }));

vi.mock('@/lib/stripe', async () => {
  const { default: StripeSdk } = await import('stripe');
  const real = new StripeSdk('sk_test_placeholder');
  return {
    stripe: () => ({
      webhooks: real.webhooks,
      subscriptions: { retrieve: mocks.retrieve },
      customers: { create: mocks.customersCreate },
      checkout: { sessions: { create: mocks.sessionsCreate } },
      billingPortal: { sessions: { create: vi.fn() } },
    }),
  };
});

vi.mock('@/modules/draws/engine', async (original) => {
  const actual = await original<typeof import('@/modules/draws/engine')>();
  return { ...actual, drawNumbers: () => [1, 2, 3, 4, 5] };
});

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const signer = new Stripe('sk_test_placeholder');

const as = (user: TestUser | null, handler: unknown, method: string, opts: { body?: unknown; params?: Record<string, string>; path?: string } = {}) =>
  call(handler, method, opts.path ?? '/x', { token: user?.token, body: opts.body, params: opts.params });

async function stripeEvent(type: string, object: object) {
  const payload = JSON.stringify({ id: `evt_${randomUUID()}`, object: 'event', type, data: { object } });
  const sig = signer.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  return call(webhookRoute.POST, 'POST', '/api/webhooks/stripe', { rawBody: payload, headers: { 'stripe-signature': sig } });
}

const stripeSub = (user: TestUser, id: string, plan_code: string, status = 'active') => ({
  id, status, cancel_at_period_end: false, metadata: { user_id: user.id, plan_code },
  items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400 }] },
});

let boss: TestUser, alice: TestUser, bob: TestUser, carol: TestUser;
let charityId: string;
let drawId: string;
let winId: string;

beforeAll(async () => {
  await resetDb();
  boss = await createUser('boss', { role: 'admin' });
  alice = await createUser('alice');
  bob = await createUser('bob');
  carol = await createUser('carol');
  mocks.customersCreate.mockImplementation(async () => ({ id: `cus_${randomUUID().slice(0, 8)}` }));
  mocks.sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.test/s' });
});

/**
 * The whole product, start to finish, through the HTTP layer. Steps depend on each other, so they run in order.
 */
describe('a month in the life of the platform', () => {
  it('1. a visitor sees the plans and picks a charity', async () => {
    const plans = await as(null, plansRoute.GET, 'GET');
    expect(plans.body.plans.map((p: { code: string }) => p.code)).toEqual(['monthly', 'yearly']);
    const list = await as(null, charitiesRoute.GET, 'GET', { path: '/api/charities?category=education' });
    charityId = list.body.items[0].id;
    expect(list.body.items[0].name).toBe('Bright Start Kids');
  });

  it('2. members choose a charity and pay through Stripe; the webhook activates them', async () => {
    await as(alice, meRoute.PATCH, 'PATCH', { body: { charity_id: charityId, charity_percent: 20 } });
    await as(bob, meRoute.PATCH, 'PATCH', { body: { charity_id: charityId } });

    expect((await as(alice, checkoutRoute.POST, 'POST', { body: { plan_code: 'yearly' } })).body.url).toContain('stripe');
    expect((await as(bob, checkoutRoute.POST, 'POST', { body: { plan_code: 'monthly' } })).body.url).toContain('stripe');

    const subs: Record<string, object> = { sub_alice: stripeSub(alice, 'sub_alice', 'yearly'), sub_bob: stripeSub(bob, 'sub_bob', 'monthly') };
    mocks.retrieve.mockImplementation(async (id: string) => subs[id]);
    expect((await stripeEvent('checkout.session.completed', { id: 'cs_a', mode: 'subscription', subscription: 'sub_alice' })).body.status).toBe('processed');
    expect((await stripeEvent('checkout.session.completed', { id: 'cs_b', mode: 'subscription', subscription: 'sub_bob' })).body.status).toBe('processed');

    for (const u of [alice, bob]) expect((await as(u, meRoute.GET, 'GET')).body.subscription.active).toBe(true);
    expect((await as(carol, meRoute.GET, 'GET')).body.subscription.active).toBe(false);
  });

  it('3. subscribers log scores; a non-subscriber cannot', async () => {
    const enter = async (u: TestUser, scores: number[]) => {
      for (const [i, s] of scores.entries()) {
        expect((await as(u, scoresRoute.POST, 'POST', { body: { score: s, played_on: daysAgo(i + 1) } })).status).toBe(201);
      }
    };
    await enter(alice, [1, 2, 3, 4, 5]);
    await enter(bob, [20, 21, 22, 23, 24]);
    expect((await as(carol, scoresRoute.POST, 'POST', { body: { score: 30, played_on: daysAgo(1) } })).status).toBe(402);
  });

  it('4. a member makes an independent donation', async () => {
    const start = await as(alice, donationRoute.POST, 'POST', { body: { charity_id: charityId, amount_cents: 1500 } });
    expect(start.status).toBe(200);
    const paid = await stripeEvent('checkout.session.completed', {
      id: 'cs_donation', mode: 'payment', payment_status: 'paid', amount_total: 1500,
      metadata: { type: 'donation', user_id: alice.id, charity_id: charityId },
    });
    expect(paid.body.status).toBe('processed');
  });

  it('5. the admin simulates and publishes the monthly draw', async () => {
    const created = await as(boss, adminDrawsRoute.POST, 'POST', { body: { period: '2031-06', mode: 'algorithmic', weighting: 'common' } });
    expect(created.status).toBe(201);
    drawId = created.body.draw.id;

    // Pool: Alice (yearly, floor(10000/12)=833) puts in 416, Bob (monthly) 500 -> 916.
    // Tiers: 4 -> floor(35%)=320, 3 -> floor(25%)=229, 5 takes the rest = 367.
    const sim = await as(boss, simulateRoute.POST, 'POST', { params: { id: drawId } });
    expect(sim.body.draw).toMatchObject({ status: 'draft', numbers: [1, 2, 3, 4, 5], active_subscribers: 2, eligible_entries: 2, base_pool_cents: 916 });
    expect(sim.body.tiers[0]).toMatchObject({ tier: 5, pool_cents: 367, winner_count: 1, prize_each_cents: 367 });
    expect(sim.body.winners).toMatchObject({ preview: true });
    expect(sim.body.winners.rows).toHaveLength(1);

    // Until published, members see nothing.
    expect((await as(alice, drawRoute.GET, 'GET', { params: { id: drawId } })).status).toBe(404);

    const published = await as(boss, publishRoute.POST, 'POST', { params: { id: drawId } });
    expect(published.body.draw.status).toBe('published');
    expect(published.body.winners.rows[0]).toMatchObject({ tier: 5, prize_cents: 367, verification_status: 'awaiting_proof' });
    winId = published.body.winners.rows[0].id;
  });

  it('6. members see the result on their dashboard', async () => {
    const a = await as(alice, dashboardRoute.GET, 'GET');
    expect(a.body.participation).toMatchObject({ draws_entered: 1 });
    expect(a.body.winnings).toMatchObject({ total_won_cents: 367, paid_cents: 0, pending_cents: 367 });

    const b = await as(bob, dashboardRoute.GET, 'GET');
    expect(b.body.participation.recent[0]).toMatchObject({ period: '2031-06', matches: 0 });
    expect(b.body.winnings.items).toEqual([]);
  });

  it('7. the winner uploads proof; the admin approves and pays', async () => {
    const params = { id: winId };
    const up = await as(alice, proofUploadRoute.POST, 'POST', { params, body: { filename: 'round.png' } });
    await admin().storage.from('proofs').uploadToSignedUrl(up.body.path, up.body.token, PNG, { contentType: 'image/png' });
    expect((await as(alice, proofRoute.POST, 'POST', { params, body: { path: up.body.path } })).body.winner.verification_status).toBe('submitted');

    const queue = await as(boss, adminWinnersRoute.GET, 'GET', { path: '/api/admin/winners?verification=submitted' });
    expect(queue.body.items).toHaveLength(1);
    expect((await fetch(queue.body.items[0].proof_url)).status).toBe(200);

    expect((await as(boss, reviewRoute.POST, 'POST', { params, body: { decision: 'approve' } })).body.winner.verification_status).toBe('approved');
    expect((await as(boss, payRoute.POST, 'POST', { params })).body.winner.payout_status).toBe('paid');

    const a = await as(alice, dashboardRoute.GET, 'GET');
    expect(a.body.winnings).toMatchObject({ total_won_cents: 367, paid_cents: 367, pending_cents: 0 });
    expect(a.body.winnings.items[0]).toMatchObject({ verification_status: 'approved', payout_status: 'paid' });
  });

  it('8. the admin report adds it all up', async () => {
    const r = (await as(boss, reportsRoute.GET, 'GET')).body;
    expect(r).toMatchObject({
      total_users: 4, active_subscribers: 2, draws_published: 1,
      total_prize_pool_cents: 916, winners_total: 1, paid_out_cents: 367, pending_payout_cents: 0, pending_verifications: 0,
    });
    // Charity: Alice 20% of 833 = 166, Bob 10% of 1000 = 100, plus the 1500 donation.
    const mine = r.charity_totals.find((c: { charity_id: string }) => c.charity_id === charityId);
    expect(mine).toMatchObject({ subscription_cents: 266, donation_cents: 1500, total_cents: 1766 });
    expect(r.draw_stats[0]).toMatchObject({ period: '2031-06', eligible_entries: 2, winners: 1 });
  });

  it("9. when a subscription lapses, history stays but the member drops out of the next draw", async () => {
    mocks.retrieve.mockResolvedValue(stripeSub(alice, 'sub_alice', 'yearly', 'canceled'));
    await stripeEvent('customer.subscription.deleted', { id: 'sub_alice' });

    expect((await as(alice, scoresRoute.POST, 'POST', { body: { score: 9, played_on: daysAgo(30) } })).status).toBe(402);
    const dash = await as(alice, dashboardRoute.GET, 'GET');
    expect(dash.body.subscription).toMatchObject({ active: false, status: 'canceled' });
    expect(dash.body.scores).toHaveLength(5); // history is kept
    expect(dash.body.winnings.total_won_cents).toBe(367); // and so are the winnings

    const july = await as(boss, adminDrawsRoute.POST, 'POST', { body: { period: '2031-07' } });
    const sim = await as(boss, simulateRoute.POST, 'POST', { params: { id: july.body.draw.id } });
    // Only Bob remains: pool 500 -> jackpot share 200. He matches nothing, so all 200 rolls over.
    expect(sim.body.draw).toMatchObject({ active_subscribers: 1, eligible_entries: 1, base_pool_cents: 500, rollover_in_cents: 0, rollover_out_cents: 200 });
    expect(sim.body.winners.rows).toEqual([]);
    const published = await as(boss, publishRoute.POST, 'POST', { params: { id: july.body.draw.id } });
    expect(published.body.draw.status).toBe('published');
  });
});
