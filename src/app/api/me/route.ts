import { authenticate, isActiveSubscriber } from '@/lib/auth';
import { unwrapMaybe } from '@/lib/db';
import { api, readBody } from '@/lib/http';
import { updateProfile, updateProfileSchema } from '@/modules/profile/service';

/** The signed-in user's profile and subscription status. */
export const GET = api(async (req) => {
  const ctx = await authenticate(req);
  const [active, subscription] = await Promise.all([
    isActiveSubscriber(ctx),
    ctx.db.from('subscriptions').select('status, current_period_end, cancel_at_period_end, plan:plans(code, name, interval, price_cents)').eq('user_id', ctx.userId).maybeSingle(),
  ]);
  return { profile: ctx.profile, subscription: { active, ...(unwrapMaybe(subscription) ?? { status: 'none' }) } };
});

/** Update name, chosen charity and contribution percentage (10-50). */
export const PATCH = api(async (req) => {
  const ctx = await authenticate(req);
  const patch = await readBody(req, updateProfileSchema);
  return { profile: await updateProfile(ctx.db, ctx.userId, patch) };
});
