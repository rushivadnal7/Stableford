import type Stripe from 'stripe';
import { z } from 'zod';
import { isActiveSubscriber, type AuthContext } from '@/lib/auth';
import { CONFIG } from '@/lib/config';
import { unwrap, unwrapMaybe } from '@/lib/db';
import { appEnv } from '@/lib/env';
import { AppError, conflict, unprocessable } from '@/lib/errors';
import { charityHref } from '@/lib/routes';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';
import type { Plan } from '@/lib/types';

export const checkoutSchema = z.object({ plan_code: z.enum(['monthly', 'yearly']) });

export const donationSchema = z.object({
  charity_id: z.uuid(),
  // Whole cents, between $1 and $10,000.
  amount_cents: z.number().int().min(100).max(1_000_000),
});

/** One Stripe customer per user, created on first need and remembered on the profile. */
async function ensureCustomer(ctx: AuthContext, client: Stripe): Promise<string> {
  if (ctx.profile.stripe_customer_id) return ctx.profile.stripe_customer_id;
  const customer = await client.customers.create(
    { email: ctx.profile.email, name: ctx.profile.full_name || undefined, metadata: { user_id: ctx.userId } },
    { idempotencyKey: `customer-${ctx.userId}` },
  );
  unwrap(await adminClient().from('profiles').update({ stripe_customer_id: customer.id }).eq('id', ctx.userId));
  return customer.id;
}

const redirects = (kind: 'subscription' | 'donation' = 'subscription', cancelPath = '/signup?checkout=cancelled') => {
  const base = appEnv().APP_URL;
  // A cancelled subscription checkout goes back to signup (where the plan and charity choice are
  // still on screen) rather than the dashboard, which they may not have access to yet. A donation
  // is independent of subscribing, so it returns to wherever it was started instead.
  return { success_url: `${base}/dashboard?checkout=success&type=${kind}`, cancel_url: `${base}${cancelPath}` };
};

function requireUrl(session: Stripe.Checkout.Session): { url: string } {
  if (!session.url) throw new AppError(502, 'stripe_error', 'Stripe did not return a checkout link.');
  return { url: session.url };
}

/**
 * Start a subscription through Stripe Checkout (PRD section 04). Card details go to Stripe's hosted
 * page, never to us. Price and plan come from our `plans` table (decision D-3); the webhook, not this
 * call, is what actually activates the subscription.
 */
export async function createSubscriptionCheckout(ctx: AuthContext, planCode: 'monthly' | 'yearly', client: Stripe = stripe()) {
  if (!ctx.profile.charity_id) throw unprocessable('charity_required', 'Choose a charity before subscribing.');
  if (await isActiveSubscriber(ctx)) throw conflict('already_subscribed', 'You already have an active subscription. Use the billing portal to change it.');

  const existing = unwrapMaybe(await ctx.db.from('subscriptions').select('status').eq('user_id', ctx.userId).maybeSingle()) as { status: string } | null;
  if (existing?.status === 'past_due') {
    throw conflict('payment_past_due', 'A payment failed. Update your payment method in the billing portal.');
  }

  const plan = unwrap(await ctx.db.from('plans').select('*').eq('code', planCode).eq('is_active', true).single()) as Plan;
  const session = await client.checkout.sessions.create({
    mode: 'subscription',
    customer: await ensureCustomer(ctx, client),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CONFIG.currency,
          unit_amount: plan.price_cents,
          recurring: { interval: plan.interval },
          product_data: { name: `Stableford ${plan.name} plan` },
        },
      },
    ],
    // The webhook reads these to know who subscribed and to which plan.
    subscription_data: { metadata: { user_id: ctx.userId, plan_code: plan.code } },
    metadata: { user_id: ctx.userId, plan_code: plan.code },
    ...redirects(),
  });
  return requireUrl(session);
}

/** A one-off donation, independent of gameplay (PRD section 08.1). Recorded by the webhook once paid. */
export async function createDonationCheckout(ctx: AuthContext, input: z.output<typeof donationSchema>, client: Stripe = stripe()) {
  const charity = unwrapMaybe(await ctx.db.from('charities').select('id, name, slug').eq('id', input.charity_id).eq('is_active', true).maybeSingle()) as
    | { id: string; name: string; slug: string }
    | null;
  if (!charity) throw unprocessable('charity_not_found', 'That charity is not available.');

  const session = await client.checkout.sessions.create({
    mode: 'payment',
    customer: await ensureCustomer(ctx, client),
    line_items: [
      { quantity: 1, price_data: { currency: CONFIG.currency, unit_amount: input.amount_cents, product_data: { name: `Donation to ${charity.name}` } } },
    ],
    metadata: { type: 'donation', user_id: ctx.userId, charity_id: charity.id },
    ...redirects('donation', `${charityHref(charity.slug)}?checkout=cancelled`),
  });
  return requireUrl(session);
}

/** Stripe's hosted page to update a card, view invoices or cancel (the webhook then updates our state). */
export async function createPortalSession(ctx: AuthContext, client: Stripe = stripe()) {
  if (!ctx.profile.stripe_customer_id) throw unprocessable('no_billing_account', 'You have no billing account yet.');
  const session = await client.billingPortal.sessions.create({
    customer: ctx.profile.stripe_customer_id,
    return_url: `${appEnv().APP_URL}/dashboard`,
  });
  return { url: session.url };
}
