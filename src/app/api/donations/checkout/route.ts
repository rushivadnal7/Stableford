import { authenticate } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { createDonationCheckout, donationSchema } from '@/modules/billing/checkout';

/** A one-off donation to a charity, independent of gameplay. Returns the Stripe Checkout URL. */
export const POST = api(async (req) => {
  const ctx = await authenticate(req);
  return createDonationCheckout(ctx, await readBody(req, donationSchema));
});
