import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { setSubscription, setSubscriptionSchema } from '@/modules/admin/service';

/** Admin: manually set a member's subscription (support and demo use; the next Stripe webhook overrides it). */
export const PUT = api(async (req, { params }: { params: { id: string } }) => {
  const { admin, actorId } = await adminContext(req);
  return { subscription: await setSubscription(admin, actorId, params.id, await readBody(req, setSubscriptionSchema)) };
});
