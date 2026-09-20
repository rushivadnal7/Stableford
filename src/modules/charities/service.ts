import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '@/lib/config';
import { likePattern, unwrap } from '@/lib/db';
import { AppError, badRequest, fromDbError, notFound } from '@/lib/errors';
import { supabaseEnv } from '@/lib/env';
import type { Charity, CharityEvent } from '@/lib/types';
import { audit } from '@/modules/audit/service';
import type { CharityListQuery, CreateCharityInput, CreateEventInput, UpdateCharityInput, UpdateEventInput } from './schema';

/** Public URL of an image in the `charity-media` bucket. */
export function charityImageUrl(imagePath: string | null): string | null {
  return imagePath ? `${supabaseEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/charity-media/${imagePath}` : null;
}

const withImageUrl = (c: Charity) => ({ ...c, image_url: charityImageUrl(c.image_path) });

/** Directory with search (name, summary, description), category filter and featured filter. */
export async function listCharities(db: SupabaseClient, params: CharityListQuery) {
  let query = db.from('charities').select('*', { count: 'exact' }).eq('is_active', true);
  if (params.category) query = query.eq('category', params.category);
  if (params.featured !== undefined) query = query.eq('is_featured', params.featured);
  if (params.q) {
    const pattern = likePattern(params.q);
    query = query.or(`name.ilike.${pattern},summary.ilike.${pattern},description.ilike.${pattern}`);
  }
  const { data, error, count } = await query
    .order('is_featured', { ascending: false })
    .order('name')
    .range(params.offset, params.offset + params.limit - 1);
  if (error) throw fromDbError(error);
  return { items: (data as Charity[]).map(withImageUrl), total: count ?? 0 };
}

/** Distinct categories, for the filter control. */
export async function listCategories(db: SupabaseClient): Promise<string[]> {
  const rows = unwrap(await db.from('charities').select('category').eq('is_active', true)) as Array<{ category: string }>;
  return [...new Set(rows.map((r) => r.category))].sort();
}

/** A charity profile with its upcoming events (PRD section 08.2). */
export async function getCharity(db: SupabaseClient, slug: string) {
  const charity = unwrap(await db.from('charities').select('*').eq('slug', slug).eq('is_active', true).single()) as Charity;
  const today = new Date().toISOString().slice(0, 10);
  const events = unwrap(
    await db.from('charity_events').select('*').eq('charity_id', charity.id).gte('event_date', today).order('event_date'),
  ) as CharityEvent[];
  return { ...withImageUrl(charity), events };
}

// ---------------------------------------------------------------------------
// Admin (service-role client; the route has already checked the caller is an admin)
// ---------------------------------------------------------------------------

export async function listAllCharities(admin: SupabaseClient) {
  const rows = unwrap(await admin.from('charities').select('*').order('name')) as Charity[];
  return rows.map(withImageUrl);
}

export async function createCharity(admin: SupabaseClient, actorId: string, input: CreateCharityInput) {
  const charity = unwrap(await admin.from('charities').insert(input).select().single()) as Charity;
  await audit(admin, actorId, 'charity.create', 'charity', charity.id, { slug: charity.slug });
  return withImageUrl(charity);
}

export async function updateCharity(admin: SupabaseClient, actorId: string, id: string, patch: UpdateCharityInput) {
  const charity = unwrap(await admin.from('charities').update(patch).eq('id', id).select().single()) as Charity;
  await audit(admin, actorId, 'charity.update', 'charity', id, { fields: Object.keys(patch) });
  return withImageUrl(charity);
}

/**
 * Delete a charity that nobody has used. One with contributions, donations or supporters is kept for
 * the record and hidden instead (decision D-9), so history and totals stay correct.
 */
export async function deleteCharity(admin: SupabaseClient, actorId: string, id: string) {
  const { data, error } = await admin.from('charities').delete().eq('id', id).select('id');
  if (error?.code === '23503') {
    unwrap(await admin.from('charities').update({ is_active: false, is_featured: false }).eq('id', id));
    await audit(admin, actorId, 'charity.deactivate', 'charity', id);
    return { deleted: false, deactivated: true };
  }
  if (error) throw fromDbError(error);
  if (!data?.length) throw notFound('Charity');
  await audit(admin, actorId, 'charity.delete', 'charity', id);
  return { deleted: true, deactivated: false };
}

export async function createEvent(admin: SupabaseClient, actorId: string, charityId: string, input: CreateEventInput) {
  const event = unwrap(await admin.from('charity_events').insert({ charity_id: charityId, ...input }).select().single()) as CharityEvent;
  await audit(admin, actorId, 'charity_event.create', 'charity_event', event.id, { charityId });
  return event;
}

export async function updateEvent(admin: SupabaseClient, actorId: string, eventId: string, patch: UpdateEventInput) {
  const event = unwrap(await admin.from('charity_events').update(patch).eq('id', eventId).select().single()) as CharityEvent;
  await audit(admin, actorId, 'charity_event.update', 'charity_event', eventId);
  return event;
}

export async function deleteEvent(admin: SupabaseClient, actorId: string, eventId: string) {
  const rows = unwrap(await admin.from('charity_events').delete().eq('id', eventId).select('id')) as Array<{ id: string }>;
  if (rows.length === 0) throw notFound('Event');
  await audit(admin, actorId, 'charity_event.delete', 'charity_event', eventId);
}

/**
 * A short-lived signed URL so the browser uploads an image straight to Storage. Going through the
 * server would hit Vercel's request-size limit. Save the returned `path` as the charity's image_path.
 */
export async function createMediaUploadUrl(admin: SupabaseClient, filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!(CONFIG.proof.extensions as readonly string[]).includes(ext)) {
    throw badRequest(`Images must be ${CONFIG.proof.extensions.join(', ')}.`);
  }
  const path = `charities/${randomUUID()}.${ext}`;
  const { data, error } = await admin.storage.from('charity-media').createSignedUploadUrl(path);
  if (error || !data) throw new AppError(502, 'storage_error', 'Could not prepare the upload.');
  return { path, token: data.token, upload_url: data.signedUrl, public_url: charityImageUrl(path), max_bytes: CONFIG.proof.maxBytes };
}
