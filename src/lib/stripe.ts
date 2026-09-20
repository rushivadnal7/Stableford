import Stripe from 'stripe';
import { stripeEnv } from '@/lib/env';

let cached: Stripe | undefined;

/** The Stripe client, created on first use so a missing key only affects routes that need it. */
export function stripe(): Stripe {
  cached ??= new Stripe(stripeEnv().STRIPE_SECRET_KEY);
  return cached;
}
