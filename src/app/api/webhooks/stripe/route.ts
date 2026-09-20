import type Stripe from 'stripe';
import { stripeEnv } from '@/lib/env';
import { badRequest } from '@/lib/errors';
import { api } from '@/lib/http';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';
import { handleStripeEvent } from '@/modules/billing/webhook';

/**
 * Stripe calls this for payment and subscription events. It must read the raw body: the signature
 * covers the exact bytes, so parsing the JSON first would break verification.
 */
export const POST = api(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) throw badRequest('Missing Stripe signature.');

  const client = stripe();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(await req.text(), signature, stripeEnv().STRIPE_WEBHOOK_SECRET);
  } catch {
    throw badRequest('Invalid Stripe signature.');
  }
  return handleStripeEvent({ admin: adminClient(), stripe: client }, event);
});
