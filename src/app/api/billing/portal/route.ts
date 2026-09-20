import { authenticate } from '@/lib/auth';
import { api } from '@/lib/http';
import { createPortalSession } from '@/modules/billing/checkout';

/** Stripe customer portal: update payment method, view invoices, cancel. */
export const POST = api(async (req) => createPortalSession(await authenticate(req)));
