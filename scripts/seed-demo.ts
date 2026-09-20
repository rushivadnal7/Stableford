/**
 * Creates demo accounts so the app can be tried straight away:
 *   npm run seed:demo                     (local Supabase)
 *   npm run seed:demo -- --allow-remote   (the project in .env.local, when it is not local)
 *
 * Safe to run repeatedly: existing accounts are reset to the state below. The passwords are public
 * knowledge (they are printed here and in the README), so only seed a live project for a demo.
 */
import { adminClient } from '@/lib/supabase/admin';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* use the real environment */
}

const DAY = 86_400_000;
const isoDay = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);

interface DemoUser {
  email: string;
  password: string;
  name: string;
  role?: 'admin';
  charitySlug?: string;
  charityPercent?: number;
  subscription?: { plan: 'monthly' | 'yearly'; status: 'active' | 'canceled' };
  scores?: number[];
  note: string;
}

const PASSWORD = 'Stableford#2026';

const named: DemoUser[] = [
  { email: 'admin@stableford.demo', password: 'Admin#Stableford2026', name: 'Ada Admin', role: 'admin', note: 'administrator' },
  {
    email: 'member@stableford.demo', password: PASSWORD, name: 'Morgan Member', charitySlug: 'bright-start-kids', charityPercent: 15,
    subscription: { plan: 'monthly', status: 'active' }, scores: [32, 28, 35, 30, 27], note: 'active subscriber with five scores',
  },
  {
    email: 'yearly@stableford.demo', password: PASSWORD, name: 'Yara Yearly', charitySlug: 'clean-tide-alliance', charityPercent: 10,
    subscription: { plan: 'yearly', status: 'active' }, scores: [24, 31, 29, 26, 33], note: 'active yearly subscriber',
  },
  {
    email: 'lapsed@stableford.demo', password: PASSWORD, name: 'Lee Lapsed', charitySlug: 'open-door-health',
    subscription: { plan: 'monthly', status: 'canceled' }, scores: [21, 25, 22], note: 'subscription ended (restricted access)',
  },
  { email: 'newcomer@stableford.demo', password: PASSWORD, name: 'Nia Newcomer', note: 'registered, never subscribed' },
];

// Extra active members so a simulated draw has a real pool and entries. Scores are deterministic.
const charities = ['bright-start-kids', 'clean-tide-alliance', 'open-door-health', 'second-innings', 'green-roots-trust', 'young-voices-fund'];
const bulk: DemoUser[] = Array.from({ length: 8 }, (_, i) => ({
  email: `player${i + 1}@stableford.demo`,
  password: PASSWORD,
  name: `Player ${i + 1}`,
  charitySlug: charities[i % charities.length],
  charityPercent: 10 + (i % 3) * 5,
  subscription: { plan: i % 4 === 0 ? ('yearly' as const) : ('monthly' as const), status: 'active' as const },
  scores: Array.from({ length: 5 }, (_, k) => 15 + ((i * 7 + k * 5) % 28)),
  note: 'demo player',
}));

async function ensureAuthUser(email: string, password: string, name: string): Promise<string> {
  const admin = adminClient();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (created.data.user) return created.data.user.id;

  // Already registered: find them and reset the password so the printed credentials always work.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) {
      const { error: updateError } = await admin.auth.admin.updateUserById(found.id, { password, email_confirm: true });
      if (updateError) throw updateError;
      return found.id;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`Could not create or find ${email}: ${created.error?.message}`);
}

async function seed(u: DemoUser, charityIds: Map<string, string>, planIds: Map<string, string>) {
  const admin = adminClient();
  const id = await ensureAuthUser(u.email, u.password, u.name);

  const profile = await admin
    .from('profiles')
    .update({ full_name: u.name, role: u.role ?? 'member', charity_id: u.charitySlug ? (charityIds.get(u.charitySlug) ?? null) : null, charity_percent: u.charityPercent ?? 10 })
    .eq('id', id);
  if (profile.error) throw profile.error;

  if (u.subscription) {
    const yearly = u.subscription.plan === 'yearly';
    const active = u.subscription.status === 'active';
    const sub = await admin.from('subscriptions').upsert(
      {
        user_id: id,
        plan_id: planIds.get(u.subscription.plan),
        status: u.subscription.status,
        current_period_end: new Date(Date.now() + (active ? 1 : -3) * (yearly ? 365 : 30) * DAY).toISOString(),
        cancel_at_period_end: false,
      },
      { onConflict: 'user_id' },
    );
    if (sub.error) throw sub.error;
  }

  // Reset scores: oldest first, so the rolling-window trigger keeps them all (there are at most five).
  await admin.from('scores').delete().eq('user_id', id);
  const scores = u.scores ?? [];
  for (const [i, score] of scores.entries()) {
    const { error } = await admin.from('scores').insert({ user_id: id, score, played_on: isoDay((scores.length - i) * 4) });
    if (error) throw error;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const local = /127\.0\.0\.1|localhost/.test(url);
  if (!local && !process.argv.includes('--allow-remote')) {
    console.error(`Refusing to seed demo accounts into ${url}.\nThey have public passwords. Re-run with --allow-remote if you mean it.`);
    process.exit(1);
  }

  const admin = adminClient();
  const [{ data: charityRows, error: cErr }, { data: planRows, error: pErr }] = await Promise.all([
    admin.from('charities').select('id, slug'),
    admin.from('plans').select('id, code'),
  ]);
  if (cErr || pErr || !charityRows?.length || !planRows?.length) {
    throw new Error('Charities or plans are missing. Apply the migrations and seed data first (npm run db:reset).');
  }
  const charityIds = new Map(charityRows.map((c) => [c.slug as string, c.id as string]));
  const planIds = new Map(planRows.map((p) => [p.code as string, p.id as string]));

  for (const u of [...named, ...bulk]) await seed(u, charityIds, planIds);

  console.log(`\nDemo accounts ready on ${url}\n`);
  for (const u of named) console.log(`  ${u.email.padEnd(28)} ${u.password.padEnd(22)} ${u.note}`);
  console.log(`  player1..player${bulk.length}@stableford.demo   ${PASSWORD}   active demo players (build a draw pool)\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
