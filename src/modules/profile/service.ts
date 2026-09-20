import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '@/lib/config';
import { unwrap, unwrapMaybe } from '@/lib/db';
import { unprocessable } from '@/lib/errors';
import type { Profile } from '@/lib/types';

/** The fields a member may change. Role and Stripe ids are protected by column grants (I-7). */
export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().max(120).optional(),
    charity_id: z.uuid().nullable().optional(),
    charity_percent: z.number().int().min(CONFIG.charity.minPercent).max(CONFIG.charity.maxPercent).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' });

export type UpdateProfileInput = z.output<typeof updateProfileSchema>;

/** Used by members (their own client) and admins (service role). RLS decides whose row is reachable. */
export async function updateProfile(db: SupabaseClient, userId: string, patch: UpdateProfileInput): Promise<Profile> {
  if (patch.charity_id) {
    // Only active charities are readable through `db` by a member, so this also rejects hidden ones.
    const charity = unwrapMaybe(await db.from('charities').select('id').eq('id', patch.charity_id).eq('is_active', true).maybeSingle());
    if (!charity) throw unprocessable('charity_not_found', 'That charity is not available.');
  }
  return unwrap(await db.from('profiles').update(patch).eq('id', userId).select().single()) as Profile;
}
