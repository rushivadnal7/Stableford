import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '@/lib/supabase/admin';
import { anonClient, tokenClient } from '@/lib/supabase/user';
import type { SubscriptionStatus } from '@/lib/types';

// Vitest does not load .env files into process.env; the app reads them lazily, so loading here is enough.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* fall back to the real environment */
}

const DAY = 86_400_000;

/** These tests delete data. Refuse to run against anything but the local stack. */
function assertLocal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(`Integration tests only run against a local Supabase (got "${url}"). Run "npm run db:start".`);
  }
}

export function admin(): SupabaseClient {
  assertLocal();
  return adminClient();
}

/** ISO date `n` days ago (UTC), the format the API and database use for `played_on`. */
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
export const daysFromNow = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

export interface TestUser {
  id: string;
  email: string;
  token: string;
  /** Acts as this user: Row Level Security applies. */
  db: SupabaseClient;
}

/** Create a confirmed auth user (the signup trigger creates the profile) and sign them in. */
export async function createUser(name: string, opts: { role?: 'member' | 'admin' } = {}): Promise<TestUser> {
  const email = `${name}-${randomUUID().slice(0, 8)}@test.local`;
  const password = 'Passw0rd!test';
  const created = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created.error || !created.data.user) throw new Error(`createUser failed: ${created.error?.message}`);
  const id = created.data.user.id;

  if (opts.role === 'admin') {
    const { error } = await admin().from('profiles').update({ role: 'admin' }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  const session = await anonClient().auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session) throw new Error(`sign-in failed: ${session.error?.message}`);
  const token = session.data.session.access_token;
  return { id, email, token, db: tokenClient(token) };
}

/** Give a user a subscription row directly, the way the Stripe webhook would. */
export async function subscribe(
  userId: string,
  o: {
    plan?: 'monthly' | 'yearly';
    status?: SubscriptionStatus;
    /** null = no period end; default is 30 days from now. */
    periodEnd?: Date | null;
    charityId?: string | null;
    charityPercent?: number;
  } = {},
) {
  const a = admin();
  const plan = await a.from('plans').select('id').eq('code', o.plan ?? 'monthly').single();
  if (plan.error) throw new Error(plan.error.message);

  const periodEnd = o.periodEnd === undefined ? new Date(Date.now() + 30 * DAY) : o.periodEnd;
  const sub = await a.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: plan.data.id,
      status: o.status ?? 'active',
      current_period_end: periodEnd?.toISOString() ?? null,
      stripe_subscription_id: `sub_${userId.slice(0, 8)}`,
    },
    { onConflict: 'user_id' },
  );
  if (sub.error) throw new Error(sub.error.message);

  const profile: Record<string, unknown> = {};
  if (o.charityId !== undefined) profile.charity_id = o.charityId;
  if (o.charityPercent !== undefined) profile.charity_percent = o.charityPercent;
  if (Object.keys(profile).length) {
    const { error } = await a.from('profiles').update(profile).eq('id', userId);
    if (error) throw new Error(error.message);
  }
}

/** Insert scores one at a time (service role), so the rolling-window triggers run in a known order. */
export async function addScores(userId: string, entries: Array<[score: number, playedOn: string]>) {
  for (const [score, played_on] of entries) {
    const { error } = await admin().from('scores').insert({ user_id: userId, score, played_on });
    if (error) throw new Error(`addScores failed: ${error.message}`);
  }
}

export async function charityIds(count: number): Promise<string[]> {
  const { data, error } = await admin().from('charities').select('id').order('slug').limit(count);
  if (error || !data || data.length < count) throw new Error('Seed charities missing. Run "npm run db:reset".');
  return data.map((c) => c.id as string);
}

/**
 * Wipe everything the tests create (never the seeded plans and charities).
 * Published draws are immutable, so this uses TRUNCATE over a direct connection (it does not fire
 * row triggers); the API itself cannot delete them.
 */
export async function resetDb() {
  assertLocal();
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `truncate public.winners, public.draw_tiers, public.draw_entries, public.charity_contributions,
                public.draws, public.donations, public.stripe_events, public.audit_log,
                public.scores, public.subscriptions restart identity`,
    );
    // Charities created by a test run go too; the six seeded ones stay.
    await client.query(
      `delete from public.charities
       where slug not in ('bright-start-kids', 'clean-tide-alliance', 'open-door-health', 'second-innings', 'green-roots-trust', 'young-voices-fund')`,
    );
    await client.query(`update public.charities set is_active = true`);
  } finally {
    await client.end();
  }
  const users = await admin().auth.admin.listUsers({ perPage: 1000 });
  for (const u of users.data.users) await admin().auth.admin.deleteUser(u.id);
}
