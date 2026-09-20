import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as billingPortalRoute from '@/app/api/billing/portal/route';
import * as checkoutRoute from '@/app/api/checkout/route';
import * as donationRoute from '@/app/api/donations/checkout/route';
import * as meRoute from '@/app/api/me/route';
import * as scoresRoute from '@/app/api/scores/route';
import * as webhookRoute from '@/app/api/webhooks/stripe/route';
import { call } from './api';
import { admin, charityIds, createUser, daysAgo, resetDb, subscribe, type TestUser } from './helpers';

// Real signature verification; fake API calls (no network, no real Stripe account).
const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  customersCreate: vi.fn(),
  sessionsCreate: vi.fn(),
  portalCreate: vi.fn(),
}));

vi.mock('@/lib/stripe', async () => {
  const { default: StripeSdk } = await import('stripe');
  const real = new StripeSdk('sk_test_placeholder');
  return {
    stripe: () => ({
      webhooks: real.webhooks,
      subscriptions: { retrieve: mocks.retrieve },
      customers: { create: mocks.customersCreate },
      checkout: { sessions: { create: mocks.sessionsCreate } },
      billingPortal: { sessions: { create: mocks.portalCreate } },
    }),
  };
});

const signer = new Stripe('sk_test_placeholder');

async function sendWebhook(event: object, o: { secret?: string; sign?: boolean } = {}) {
  const payload = JSON.stringify(event);
  const headers: Record<string, string> = {};
  if (o.sign !== false) {
    headers['stripe-signature'] = signer.webhooks.generateTestHeaderString({ payload, secret: o.secret ?? process.env.STRIPE_WEBHOOK_SECRET! });
  }
  return call(webhookRoute.POST, 'POST', '/api/webhooks/stripe', { rawBody: payload, headers });
}

const event = (type: string, object: object, id = `evt_${randomUUID()}`) => ({ id, object: 'event', type, data: { object } });
const inThirtyDays = () => Math.floor(Date.now() / 1000) + 30 * 86_400;

function subscription(user: TestUser, over: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { user_id: user.id, plan_code: 'monthly' },
    items: { data: [{ current_period_end: inThirtyDays() }] },
    ...over,
  };
}

const subscriptionRow = async (user: TestUser) =>
  (await admin().from('subscriptions').select('*, plan:plans(code)').eq('user_id', user.id).maybeSingle()).data;

let user: TestUser;
beforeEach(async () => {
  vi.resetAllMocks();
  await resetDb();
  user = await createUser('payer');
});

describe('Stripe webhook', () => {
  it('rejects a missing or forged signature and changes nothing', async () => {
    const body = event('customer.subscription.updated', subscription(user));
    expect((await sendWebhook(body, { sign: false })).status).toBe(400);
    const forged = await sendWebhook(body, { secret: 'whsec_wrong' });
    expect(forged.status).toBe(400);
    expect(forged.body.error.message).toBe('Invalid Stripe signature.');
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(await subscriptionRow(user)).toBeNull();
  });

  it('activates a subscription when checkout completes, and grants access', async () => {
    mocks.retrieve.mockResolvedValue(subscription(user, { metadata: { user_id: user.id, plan_code: 'yearly' } }));
    const res = await sendWebhook(event('checkout.session.completed', { id: 'cs_1', mode: 'subscription', subscription: 'sub_1' }));
    expect(res.body).toEqual({ status: 'processed' });
    expect(mocks.retrieve).toHaveBeenCalledWith('sub_1');

    expect(await subscriptionRow(user)).toMatchObject({ status: 'active', stripe_subscription_id: 'sub_1', cancel_at_period_end: false, plan: { code: 'yearly' } });
    const me = await call(meRoute.GET, 'GET', '/api/me', { token: user.token });
    expect(me.body.subscription).toMatchObject({ active: true, status: 'active' });
    const score = await call(scoresRoute.POST, 'POST', '/api/scores', { token: user.token, body: { score: 30, played_on: daysAgo(1) } });
    expect(score.status).toBe(201);
  });

  it('ignores a repeated delivery of the same event', async () => {
    mocks.retrieve.mockResolvedValue(subscription(user));
    const e = event('customer.subscription.created', subscription(user), 'evt_fixed');
    expect((await sendWebhook(e)).body.status).toBe('processed');
    expect((await sendWebhook(e)).body.status).toBe('duplicate');
    expect(mocks.retrieve).toHaveBeenCalledTimes(1);
  });

  it('removes access when a payment fails, and when the subscription ends', async () => {
    mocks.retrieve.mockResolvedValue(subscription(user));
    await sendWebhook(event('customer.subscription.created', subscription(user)));

    mocks.retrieve.mockResolvedValue(subscription(user, { status: 'past_due' }));
    await sendWebhook(event('customer.subscription.updated', subscription(user)));
    expect((await subscriptionRow(user))?.status).toBe('past_due');
    expect((await call(scoresRoute.POST, 'POST', '/api/scores', { token: user.token, body: { score: 30, played_on: daysAgo(1) } })).status).toBe(402);

    mocks.retrieve.mockResolvedValue(subscription(user, { status: 'canceled' }));
    await sendWebhook(event('customer.subscription.deleted', subscription(user)));
    expect((await subscriptionRow(user))?.status).toBe('canceled');
  });

  it('keeps access until the period ends after a cancellation is scheduled', async () => {
    mocks.retrieve.mockResolvedValue(subscription(user, { cancel_at_period_end: true }));
    await sendWebhook(event('customer.subscription.updated', subscription(user)));
    expect(await subscriptionRow(user)).toMatchObject({ status: 'active', cancel_at_period_end: true });
    expect((await call(meRoute.GET, 'GET', '/api/me', { token: user.token })).body.subscription.active).toBe(true);
  });

  it('uses the fresh Stripe state, not the possibly stale event payload', async () => {
    mocks.retrieve.mockResolvedValue(subscription(user, { status: 'active' }));
    await sendWebhook(event('customer.subscription.updated', subscription(user, { status: 'past_due' })));
    expect((await subscriptionRow(user))?.status).toBe('active');
  });

  it('lets a new subscription replace an ended one, but not the other way round', async () => {
    await subscribe(user.id, { status: 'canceled' }); // an old, ended subscription (sub_<id>)

    mocks.retrieve.mockResolvedValue(subscription(user, { id: 'sub_new' }));
    await sendWebhook(event('customer.subscription.created', subscription(user, { id: 'sub_new' })));
    expect(await subscriptionRow(user)).toMatchObject({ status: 'active', stripe_subscription_id: 'sub_new' });

    // A late "canceled" event about the old subscription arrives afterwards.
    mocks.retrieve.mockResolvedValue(subscription(user, { id: 'sub_old', status: 'canceled' }));
    await sendWebhook(event('customer.subscription.deleted', subscription(user, { id: 'sub_old' })));
    expect(await subscriptionRow(user)).toMatchObject({ status: 'active', stripe_subscription_id: 'sub_new' });
  });

  it('records a paid donation once, however many times it is replayed', async () => {
    const [charity] = await charityIds(1);
    const session = { id: 'cs_don', mode: 'payment', payment_status: 'paid', amount_total: 2500, metadata: { type: 'donation', user_id: user.id, charity_id: charity } };
    await sendWebhook(event('checkout.session.completed', session));
    await sendWebhook(event('checkout.session.completed', session)); // different event id, same session
    const rows = (await admin().from('donations').select('*')).data ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ user_id: user.id, charity_id: charity, amount_cents: 2500, stripe_session_id: 'cs_don' });
  });

  it('does not record an unpaid donation', async () => {
    const [charity] = await charityIds(1);
    await sendWebhook(event('checkout.session.completed', { id: 'cs_unpaid', mode: 'payment', payment_status: 'unpaid', amount_total: 1000, metadata: { type: 'donation', user_id: user.id, charity_id: charity } }));
    expect((await admin().from('donations').select('id')).data).toEqual([]);
  });

  it('acknowledges events it does not care about, and subscriptions it did not create', async () => {
    expect((await sendWebhook(event('invoice.created', { id: 'in_1' }))).body.status).toBe('ignored');

    mocks.retrieve.mockResolvedValue({ ...subscription(user), metadata: {} });
    expect((await sendWebhook(event('customer.subscription.created', { id: 'sub_1' }))).status).toBe(200);
    expect(await subscriptionRow(user)).toBeNull();
  });

  it('answers 500 when processing fails, so Stripe retries, and succeeds on the retry', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = event('customer.subscription.updated', subscription(user), 'evt_retry');
    mocks.retrieve.mockRejectedValueOnce(new Error('Stripe is down'));
    expect((await sendWebhook(e)).status).toBe(500);
    expect((await admin().from('stripe_events').select('id')).data).toEqual([]); // not marked as done

    mocks.retrieve.mockResolvedValue(subscription(user));
    expect((await sendWebhook(e)).body.status).toBe('processed');
    expect((await subscriptionRow(user))?.status).toBe('active');
    spy.mockRestore();
  });
});

describe('subscription checkout', () => {
  const start = (token: string, plan_code: string) => call(checkoutRoute.POST, 'POST', '/api/checkout', { token, body: { plan_code } });

  beforeEach(() => {
    mocks.customersCreate.mockImplementation(async () => ({ id: `cus_${randomUUID().slice(0, 8)}` }));
    mocks.sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
  });

  it('requires sign-in, a valid plan and a chosen charity', async () => {
    expect((await call(checkoutRoute.POST, 'POST', '/api/checkout', { body: { plan_code: 'monthly' } })).status).toBe(401);
    expect((await start(user.token, 'weekly')).status).toBe(400);
    const noCharity = await start(user.token, 'monthly');
    expect(noCharity.status).toBe(422);
    expect(noCharity.body.error.code).toBe('charity_required');
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a monthly Checkout session priced from our plans table', async () => {
    const [charity] = await charityIds(1);
    await admin().from('profiles').update({ charity_id: charity }).eq('id', user.id);

    const res = await start(user.token, 'monthly');
    expect(res.body).toEqual({ url: 'https://checkout.stripe.test/session' });
    const args = mocks.sessionsCreate.mock.calls[0]![0];
    expect(args).toMatchObject({
      mode: 'subscription',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: 1000, recurring: { interval: 'month' } } }],
      subscription_data: { metadata: { user_id: user.id, plan_code: 'monthly' } },
    });
    expect(args.success_url).toContain('/dashboard');
    expect(args.customer).toMatch(/^cus_/);

    // The customer is remembered, not recreated.
    await start(user.token, 'yearly');
    expect(mocks.customersCreate).toHaveBeenCalledTimes(1);
    expect(mocks.sessionsCreate.mock.calls[1]![0].line_items[0].price_data).toMatchObject({ unit_amount: 10000, recurring: { interval: 'year' } });
  });

  it('refuses to start a second subscription, or one with a failed payment outstanding', async () => {
    const [charity] = await charityIds(1);
    await admin().from('profiles').update({ charity_id: charity }).eq('id', user.id);

    await subscribe(user.id, { status: 'active' });
    expect((await start(user.token, 'monthly')).body.error.code).toBe('already_subscribed');

    await subscribe(user.id, { status: 'past_due' });
    expect((await start(user.token, 'monthly')).body.error.code).toBe('payment_past_due');
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('hides Stripe failures behind a generic error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const [charity] = await charityIds(1);
    await admin().from('profiles').update({ charity_id: charity }).eq('id', user.id);
    mocks.sessionsCreate.mockRejectedValue(new Error('sk_test_secret exploded'));
    const res = await start(user.token, 'monthly');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('sk_test');
    spy.mockRestore();
  });
});

describe('donation checkout and billing portal', () => {
  beforeEach(() => {
    mocks.customersCreate.mockImplementation(async () => ({ id: `cus_${randomUUID().slice(0, 8)}` }));
    mocks.sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.test/donate' });
  });

  it('creates a one-off donation session for an active charity', async () => {
    const [charity] = await charityIds(1);
    const res = await call(donationRoute.POST, 'POST', '/api/donations/checkout', { token: user.token, body: { charity_id: charity, amount_cents: 2500 } });
    expect(res.body).toEqual({ url: 'https://checkout.stripe.test/donate' });
    expect(mocks.sessionsCreate.mock.calls[0]![0]).toMatchObject({
      mode: 'payment',
      line_items: [{ price_data: { unit_amount: 2500 } }],
      metadata: { type: 'donation', user_id: user.id, charity_id: charity },
    });
  });

  it('validates the amount and the charity', async () => {
    const [charity] = await charityIds(1);
    const donate = (body: unknown) => call(donationRoute.POST, 'POST', '/api/donations/checkout', { token: user.token, body });
    expect((await donate({ charity_id: charity, amount_cents: 50 })).status).toBe(400);
    expect((await donate({ charity_id: charity, amount_cents: 99.5 })).status).toBe(400);
    expect((await donate({ charity_id: charity, amount_cents: 2_000_000 })).status).toBe(400);
    expect((await donate({ charity_id: randomUUID(), amount_cents: 1000 })).body.error.code).toBe('charity_not_found');

    await admin().from('charities').update({ is_active: false }).eq('id', charity);
    expect((await donate({ charity_id: charity, amount_cents: 1000 })).body.error.code).toBe('charity_not_found');
    await admin().from('charities').update({ is_active: true }).eq('id', charity);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('opens the billing portal only for someone with a billing account', async () => {
    mocks.portalCreate.mockResolvedValue({ url: 'https://billing.stripe.test/portal' });
    const none = await call(billingPortalRoute.POST, 'POST', '/api/billing/portal', { token: user.token });
    expect(none.status).toBe(422);
    expect(none.body.error.code).toBe('no_billing_account');

    await admin().from('profiles').update({ stripe_customer_id: 'cus_existing' }).eq('id', user.id);
    const ok = await call(billingPortalRoute.POST, 'POST', '/api/billing/portal', { token: user.token });
    expect(ok.body).toEqual({ url: 'https://billing.stripe.test/portal' });
    expect(mocks.portalCreate.mock.calls[0]![0]).toMatchObject({ customer: 'cus_existing' });
  });
});
