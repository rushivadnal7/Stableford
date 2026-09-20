import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { unwrap, unwrapMaybe } from '@/lib/db';
import { mapStripeStatus, periodEndIso } from './mapping';

export interface WebhookDeps {
  admin: SupabaseClient;
  stripe: Pick<Stripe, 'subscriptions'>;
}

export type WebhookOutcome = { status: 'processed' | 'duplicate' | 'ignored' };

/**
 * Mirror a Stripe subscription into our `subscriptions` row. The webhook is the only writer of
 * subscription state (flow 8), so the browser can never grant itself access.
 */
export async function syncSubscription(admin: SupabaseClient, sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.user_id;
  const planCode = sub.metadata?.plan_code;
  if (!userId || !planCode) {
    console.warn('Ignoring a Stripe subscription that was not created by this app', sub.id);
    return;
  }

  const profile = unwrapMaybe(await admin.from('profiles').select('id').eq('id', userId).maybeSingle());
  if (!profile) {
    console.warn('Ignoring a Stripe subscription for an unknown user', { subscription: sub.id, userId });
    return;
  }

  const status = mapStripeStatus(sub.status);
  const existing = unwrapMaybe(await admin.from('subscriptions').select('stripe_subscription_id').eq('user_id', userId).maybeSingle()) as
    | { stripe_subscription_id: string | null }
    | null;

  // A late "canceled" or "incomplete" event about an older subscription must not overwrite a newer one.
  if (existing?.stripe_subscription_id && existing.stripe_subscription_id !== sub.id && (status === 'canceled' || status === 'incomplete')) {
    return;
  }

  const plan = unwrap(await admin.from('plans').select('id').eq('code', planCode).single()) as { id: string };
  unwrap(
    await admin.from('subscriptions').upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        status,
        stripe_subscription_id: sub.id,
        current_period_end: periodEndIso(sub),
        cancel_at_period_end: sub.cancel_at_period_end,
      },
      { onConflict: 'user_id' },
    ),
  );
}

/** Record a paid donation. The unique Stripe session id makes a replay harmless. */
async function recordDonation(admin: SupabaseClient, session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== 'paid') return;
  const userId = session.metadata?.user_id;
  const charityId = session.metadata?.charity_id;
  if (!userId || !charityId || !session.amount_total) return;

  unwrap(
    await admin
      .from('donations')
      .upsert({ user_id: userId, charity_id: charityId, amount_cents: session.amount_total, stripe_session_id: session.id }, { onConflict: 'stripe_session_id', ignoreDuplicates: true }),
  );
}

/**
 * Apply one verified Stripe event. Safe to run twice for the same event:
 *  - subscription events re-fetch the subscription, so stale or out-of-order payloads cannot regress it;
 *  - the event id is stored only after success, so a failed attempt is retried by Stripe;
 *  - donations are keyed on the checkout session id.
 */
export async function handleStripeEvent({ admin, stripe }: WebhookDeps, event: Stripe.Event): Promise<WebhookOutcome> {
  const seen = unwrapMaybe(await admin.from('stripe_events').select('id').eq('id', event.id).maybeSingle());
  if (seen) return { status: 'duplicate' };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        await syncSubscription(admin, await stripe.subscriptions.retrieve(id));
      } else if (session.mode === 'payment' && session.metadata?.type === 'donation') {
        await recordDonation(admin, session);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(admin, await stripe.subscriptions.retrieve(event.data.object.id));
      break;
    default:
      return { status: 'ignored' };
  }

  unwrap(await admin.from('stripe_events').upsert({ id: event.id, type: event.type }, { onConflict: 'id', ignoreDuplicates: true }));
  return { status: 'processed' };
}
