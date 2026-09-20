import type { SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '@/lib/config';
import { unwrap } from '@/lib/db';
import { conflict } from '@/lib/errors';
import type { Draw, DrawTier } from '@/lib/types';
import { audit } from '@/modules/audit/service';
import { drawNumbers, newSeed, type DrawInput, type Frequencies } from './engine';
import { computePrizes } from './prize';
import type { CreateDrawInput, UpdateDrawInput } from './schema';

/**
 * How the winning numbers get chosen. Production always uses `randomPicker`; tests inject a fixed
 * picker so the outcome is known. Every draw stores its seed, so any draw can be replayed.
 */
export type NumberPicker = (input: Pick<DrawInput, 'mode' | 'weighting' | 'frequencies'>) => { seed: string; numbers: number[] };

export const randomPicker: NumberPicker = (input) => {
  const seed = newSeed();
  return { seed, numbers: drawNumbers({ ...input, seed }) };
};

/** What `create_draw_snapshot` reports back. */
interface Snapshot {
  active_subscribers: number;
  eligible_entries: number;
  base_pool_cents: number;
  rollover_in_cents: number;
  frequencies: Frequencies;
}

export async function createDraw(admin: SupabaseClient, actorId: string, input: CreateDrawInput): Promise<Draw> {
  const draw = unwrap(
    await admin.from('draws').insert({ period: input.period, mode: input.mode, weighting: input.weighting ?? null, created_by: actorId }).select().single(),
  ) as Draw;
  await audit(admin, actorId, 'draw.create', 'draw', draw.id, { period: draw.period, mode: draw.mode });
  return draw;
}

/** Change the mode of a draft. Any earlier simulation no longer matches, so it is cleared. */
export async function updateDraw(admin: SupabaseClient, actorId: string, id: string, input: UpdateDrawInput): Promise<Draw> {
  const current = unwrap(await admin.from('draws').select('status').eq('id', id).single()) as Pick<Draw, 'status'>;
  if (current.status !== 'draft') throw conflict('draw_is_published', 'A published draw cannot be changed.');

  const draw = unwrap(
    await admin
      .from('draws')
      .update({ mode: input.mode, weighting: input.weighting ?? null, numbers: null, seed: null, simulated_at: null })
      .eq('id', id)
      .select()
      .single(),
  ) as Draw;
  await audit(admin, actorId, 'draw.update', 'draw', id, { mode: draw.mode, weighting: draw.weighting });
  return draw;
}

export async function listDraws(admin: SupabaseClient): Promise<Draw[]> {
  return unwrap(await admin.from('draws').select('*').order('period', { ascending: false })) as Draw[];
}

/** A draw with its prize ledger and winners. For a draft the winners are a preview, not yet official. */
export async function getDrawDetail(admin: SupabaseClient, id: string) {
  const draw = unwrap(await admin.from('draws').select('*').eq('id', id).single()) as Draw;
  const tiers = unwrap(await admin.from('draw_tiers').select('*').eq('draw_id', id).order('tier', { ascending: false })) as DrawTier[];

  const published = draw.status === 'published';
  const rows = published
    ? unwrap(
        await admin
          .from('winners')
          .select('*, profile:profiles!winners_user_id_fkey(email, full_name)')
          .eq('draw_id', id)
          .order('tier', { ascending: false }),
      )
    : unwrap(
        await admin
          .from('draw_entries')
          .select('user_id, numbers, match_count, profile:profiles(email, full_name)')
          .eq('draw_id', id)
          .gte('match_count', 3)
          .order('match_count', { ascending: false }),
      );

  return { draw, tiers, winners: { preview: !published, rows } };
}

/**
 * Dry-run a draw and store everything on the draft (decision D-5). Safe to repeat until published.
 *   1. SQL snapshots who is in, the pool and number frequencies.
 *   2. TypeScript picks the numbers.
 *   3. SQL counts matches per entry.
 *   4. TypeScript works out the prizes and SQL stores the ledger, re-checking that it adds up.
 */
export async function simulateDraw(admin: SupabaseClient, actorId: string, id: string, pick: NumberPicker = randomPicker) {
  const draw = unwrap(await admin.from('draws').select('*').eq('id', id).single()) as Draw;
  if (draw.status !== 'draft') throw conflict('draw_not_draft', 'This draw is already published.');

  const snapshot = unwrap(
    await admin.rpc('create_draw_snapshot', { p_draw_id: id, p_pool_share_percent: CONFIG.prize.poolSharePercent }),
  ) as Snapshot;

  const { seed, numbers } = pick({ mode: draw.mode, weighting: draw.weighting, frequencies: snapshot.frequencies });
  const winnerCounts = unwrap(await admin.rpc('apply_draw_numbers', { p_draw_id: id, p_numbers: numbers, p_seed: seed })) as Record<string, number>;

  const prizes = computePrizes({
    basePoolCents: snapshot.base_pool_cents,
    rolloverInCents: snapshot.rollover_in_cents,
    winnersByTier: { 5: winnerCounts['5'] ?? 0, 4: winnerCounts['4'] ?? 0, 3: winnerCounts['3'] ?? 0 },
  });
  unwrap(
    await admin.rpc('store_draw_tiers', {
      p_draw_id: id,
      p_tiers: prizes.tiers.map((t) => ({
        tier: t.tier,
        pool_cents: t.poolCents,
        winner_count: t.winnerCount,
        prize_each_cents: t.prizeEachCents,
        retained_cents: t.retainedCents,
        rolled_over_cents: t.rolledOverCents,
      })),
      p_rollover_out_cents: prizes.rolloverOutCents,
    }),
  );

  await audit(admin, actorId, 'draw.simulate', 'draw', id, { numbers, eligible_entries: snapshot.eligible_entries });
  return getDrawDetail(admin, id);
}

/** Make the simulated draft official and create the winners. Atomic in the database (I-12). */
export async function publishDraw(admin: SupabaseClient, actorId: string, id: string) {
  const winners = unwrap(await admin.rpc('publish_draw', { p_draw_id: id, p_admin: actorId })) as number;
  await audit(admin, actorId, 'draw.publish', 'draw', id, { winners });
  return getDrawDetail(admin, id);
}
