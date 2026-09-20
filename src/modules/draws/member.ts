import type { SupabaseClient } from '@supabase/supabase-js';
import { unwrap, unwrapMaybe } from '@/lib/db';

/** Published draws only: Row Level Security hides drafts from members. */
export async function listPublishedDraws(db: SupabaseClient) {
  return unwrap(
    await db
      .from('draws')
      .select('id, period, mode, numbers, eligible_entries, total_pool_cents, rollover_out_cents, published_at')
      .eq('status', 'published')
      .order('period', { ascending: false }),
  );
}

/** One published draw, plus how the signed-in member fared in it. The seed is never exposed. */
export async function getMemberDraw(db: SupabaseClient, userId: string, id: string) {
  const draw = unwrap(
    await db
      .from('draws')
      .select('id, period, mode, weighting, numbers, active_subscribers, eligible_entries, total_pool_cents, rollover_in_cents, rollover_out_cents, published_at')
      .eq('id', id)
      .eq('status', 'published')
      .single(),
  );
  const tiers = unwrap(
    await db.from('draw_tiers').select('tier, pool_cents, winner_count, prize_each_cents, rolled_over_cents').eq('draw_id', id).order('tier', { ascending: false }),
  );
  const entry = unwrapMaybe(await db.from('draw_entries').select('numbers, match_count').eq('draw_id', id).eq('user_id', userId).maybeSingle());
  const winner = unwrapMaybe(await db.from('winners').select('*').eq('draw_id', id).eq('user_id', userId).maybeSingle());
  return { draw, tiers, entry, winner };
}
