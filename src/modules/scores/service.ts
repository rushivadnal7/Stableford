import type { SupabaseClient } from '@supabase/supabase-js';
import { unwrap } from '@/lib/db';
import { notFound } from '@/lib/errors';
import type { Score } from '@/lib/types';
import type { CreateScoreInput, UpdateScoreInput } from './schema';

/**
 * The 5-score rolling window, date rules and "subscribed only" rule are enforced by the database
 * (triggers and RLS, see supabase/migrations). These functions work with either client:
 * a member's (RLS applies) or the service role (admin editing on a member's behalf).
 */

/** Newest first (PRD section 05). */
export async function listScores(db: SupabaseClient, userId: string): Promise<Score[]> {
  return unwrap(await db.from('scores').select('*').eq('user_id', userId).order('played_on', { ascending: false })) as Score[];
}

export async function addScore(db: SupabaseClient, userId: string, input: CreateScoreInput): Promise<Score> {
  return unwrap(await db.from('scores').insert({ user_id: userId, ...input }).select().single()) as Score;
}

/** With a member's client, RLS hides other people's rows, so a foreign id reads as "not found". */
export async function updateScore(db: SupabaseClient, id: string, patch: UpdateScoreInput): Promise<Score> {
  return unwrap(await db.from('scores').update(patch).eq('id', id).select().single()) as Score;
}

export async function deleteScore(db: SupabaseClient, id: string): Promise<void> {
  const rows = unwrap(await db.from('scores').delete().eq('id', id).select('id')) as Array<{ id: string }>;
  if (rows.length === 0) throw notFound('Score');
}
