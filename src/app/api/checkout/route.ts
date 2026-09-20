import { authenticate } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { checkoutSchema, createSubscriptionCheckout } from '@/modules/billing/checkout';

/** Start a monthly or yearly subscription. Returns the Stripe Checkout URL to redirect the browser to. */
export const POST = api(async (req) => {
  const ctx = await authenticate(req);
  const { plan_code } = await readBody(req, checkoutSchema);
  return createSubscriptionCheckout(ctx, plan_code);
});
