import type { AuthContext } from '@/lib/auth';
import { isActiveSubscriber } from '@/lib/auth';
import { unwrap, unwrapMaybe } from '@/lib/db';
import type { Score, Winner } from '@/lib/types';
import { upcomingDrawPeriod } from '@/modules/draws/period';
import { listScores } from '@/modules/scores/service';

interface EntryRow {
  match_count: number | null;
  numbers: number[];
  draw: { id: string; period: string; numbers: number[]; published_at: string } | null;
}

type WinRow = Winner & { draw: { period: string } | null };

/**
 * Everything the member dashboard needs in one call (PRD section 10). All reads go through the
 * member's own client, so Row Level Security guarantees they only ever see their own data.
 */
export async function getDashboard(ctx: AuthContext, now = new Date()) {
  const { db, userId, profile } = ctx;

  const [active, subscription, scores, charity, entries, publishedDraws, wins] = await Promise.all([
    isActiveSubscriber(ctx),
    db.from('subscriptions').select('status, current_period_end, cancel_at_period_end, plan:plans(code, name, interval, price_cents)').eq('user_id', userId).maybeSingle(),
    listScores(db, userId),
    profile.charity_id
      ? db.from('charities').select('id, slug, name, category, summary').eq('id', profile.charity_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from('draw_entries').select('match_count, numbers, draw:draws(id, period, numbers, published_at)'),
    db.from('draws').select('period').eq('status', 'published').order('period', { ascending: false }).limit(24),
    db.from('winners').select('*, draw:draws(period)').order('created_at', { ascending: false }),
  ]);

  const sub = unwrapMaybe(subscription) as { status: string; current_period_end: string | null; cancel_at_period_end: boolean; plan: unknown } | null;
  // Without generated schema types, supabase-js types an embedded many-to-one row as an array; at runtime it is an object.
  const entryRows = (unwrap(entries) as unknown as EntryRow[]).filter((e) => e.draw).sort((a, b) => b.draw!.period.localeCompare(a.draw!.period));
  const winRows = unwrap(wins) as unknown as WinRow[];
  const upcomingPeriod = upcomingDrawPeriod(now, (unwrap(publishedDraws) as Array<{ period: string }>).map((d) => d.period));
  const scoreRows = scores as Score[];

  return {
    subscription: {
      active,
      status: sub?.status ?? 'none',
      plan: sub?.plan ?? null,
      renewal_date: sub?.current_period_end ?? null,
      cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    },
    scores: scoreRows,
    charity: { selected: unwrapMaybe(charity as { data: unknown; error: null }), contribution_percent: profile.charity_percent },
    participation: {
      draws_entered: entryRows.length,
      upcoming_period: upcomingPeriod,
      // In the next draw only with an active subscription and a full set of five scores.
      eligible_for_upcoming: active && scoreRows.length === 5,
      recent: entryRows.slice(0, 6).map((e) => ({ period: e.draw!.period, your_numbers: e.numbers, draw_numbers: e.draw!.numbers, matches: e.match_count })),
    },
    winnings: {
      total_won_cents: winRows.reduce((s, w) => s + w.prize_cents, 0),
      paid_cents: winRows.filter((w) => w.payout_status === 'paid').reduce((s, w) => s + w.prize_cents, 0),
      pending_cents: winRows.filter((w) => w.payout_status === 'pending').reduce((s, w) => s + w.prize_cents, 0),
      items: winRows.map((w) => ({
        id: w.id,
        period: w.draw?.period ?? null,
        tier: w.tier,
        prize_cents: w.prize_cents,
        verification_status: w.verification_status,
        payout_status: w.payout_status,
        review_note: w.review_note,
      })),
    },
  };
}
