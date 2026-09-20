import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { CONFIG } from '@/lib/config';
import { likePattern, unwrap } from '@/lib/db';
import { conflict, fromDbError, unprocessable } from '@/lib/errors';
import type { Plan, Profile } from '@/lib/types';
import { audit } from '@/modules/audit/service';
import { listScores } from '@/modules/scores/service';

export const userListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminUpdateUserSchema = z
  .object({
    full_name: z.string().trim().max(120).optional(),
    role: z.enum(['member', 'admin']).optional(),
    charity_id: z.uuid().nullable().optional(),
    charity_percent: z.number().int().min(CONFIG.charity.minPercent).max(CONFIG.charity.maxPercent).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' });

export const setSubscriptionSchema = z.object({
  plan_code: z.enum(['monthly', 'yearly']),
  status: z.enum(['incomplete', 'active', 'past_due', 'canceled']),
  current_period_end: z.iso.datetime().nullable().optional(),
  cancel_at_period_end: z.boolean().optional(),
});

export const auditQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

/** Members, with their subscription, for the admin user table (ADM-01). */
export async function listUsers(admin: SupabaseClient, q: z.output<typeof userListQuery>) {
  let query = admin
    .from('profiles')
    .select('*, subscription:subscriptions(status, current_period_end, cancel_at_period_end, plan:plans(code, name))', { count: 'exact' });
  if (q.q) {
    const pattern = likePattern(q.q);
    query = query.or(`email.ilike.${pattern},full_name.ilike.${pattern}`);
  }
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(q.offset, q.offset + q.limit - 1);
  if (error) throw fromDbError(error);
  return { items: data, total: count ?? 0 };
}

/** One member in full: profile, subscription, scores, winnings and donations. */
export async function getUser(admin: SupabaseClient, id: string) {
  const profile = unwrap(await admin.from('profiles').select('*').eq('id', id).single()) as Profile;
  const [subscription, scores, winnings, donations, charity] = await Promise.all([
    admin.from('subscriptions').select('*, plan:plans(code, name, interval, price_cents)').eq('user_id', id).maybeSingle(),
    listScores(admin, id),
    admin.from('winners').select('*, draw:draws(period)').eq('user_id', id).order('created_at', { ascending: false }),
    admin.from('donations').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    profile.charity_id ? admin.from('charities').select('id, slug, name').eq('id', profile.charity_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  return {
    profile,
    subscription: unwrap(subscription),
    scores,
    winnings: unwrap(winnings),
    donations: unwrap(donations),
    charity: unwrap(charity as { data: unknown; error: null }),
  };
}

export async function updateUser(admin: SupabaseClient, actorId: string, id: string, patch: z.output<typeof adminUpdateUserSchema>) {
  if (id === actorId && patch.role && patch.role !== 'admin') {
    throw conflict('cannot_demote_self', 'You cannot remove your own admin role.');
  }
  if (patch.charity_id) {
    const { data } = await admin.from('charities').select('id').eq('id', patch.charity_id).eq('is_active', true).maybeSingle();
    if (!data) throw unprocessable('charity_not_found', 'That charity is not available.');
  }
  const profile = unwrap(await admin.from('profiles').update(patch).eq('id', id).select().single()) as Profile;
  await audit(admin, actorId, 'user.update', 'user', id, { fields: Object.keys(patch), role: patch.role });
  return profile;
}

/**
 * Manually set a member's subscription (support and demo use). Stripe stays the source of truth:
 * the next webhook for a real subscription will overwrite this. With no end date, an active
 * subscription runs for one plan period from now.
 */
export async function setSubscription(admin: SupabaseClient, actorId: string, userId: string, input: z.output<typeof setSubscriptionSchema>) {
  const plan = unwrap(await admin.from('plans').select('*').eq('code', input.plan_code).single()) as Plan;
  const days = plan.interval === 'year' ? 365 : 30;
  const periodEnd = input.current_period_end === undefined ? new Date(Date.now() + days * 86_400_000).toISOString() : input.current_period_end;

  const subscription = unwrap(
    await admin
      .from('subscriptions')
      .upsert(
        { user_id: userId, plan_id: plan.id, status: input.status, current_period_end: periodEnd, cancel_at_period_end: input.cancel_at_period_end ?? false },
        { onConflict: 'user_id' },
      )
      .select('*, plan:plans(code, name)')
      .single(),
  );
  await audit(admin, actorId, 'subscription.override', 'user', userId, { plan: input.plan_code, status: input.status });
  return subscription;
}

export async function getReport(admin: SupabaseClient) {
  return unwrap(await admin.rpc('admin_report'));
}

export async function listAudit(admin: SupabaseClient, limit: number) {
  return unwrap(
    await admin.from('audit_log').select('*, actor:profiles(email, full_name)').order('id', { ascending: false }).limit(limit),
  );
}
