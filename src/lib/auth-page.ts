import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ROUTES } from '@/lib/routes';
import { adminClient } from '@/lib/supabase/admin';
import { cookieClient } from '@/lib/supabase/user';
import type { Profile } from '@/lib/types';

export interface PageUser {
  userId: string;
  profile: Profile;
  db: SupabaseClient;
}

/**
 * Who is signed in, for a Server Component page. `authenticate()` in lib/auth.ts does the same job
 * for API routes, which receive a `Request`; a page instead reads the cookie jar directly (the
 * pattern Next.js recommends for Server Components), so this is a separate, small function rather
 * than a shared one.
 *
 * `cache()` dedupes this within one request: the (app) layout calls it to gate the whole section,
 * and a page below it calls it again for the profile, but only one round trip to Supabase happens.
 */
export const pageUser = cache(async (): Promise<PageUser | null> => {
  const db = await cookieClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await db.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (profileError || !profile) return null;
  return { userId: data.user.id, profile: profile as Profile, db };
});

/** For a page that only makes sense while signed in. Sends an anonymous visitor to log in first. */
export async function requireUser(next: string = ROUTES.dashboard): Promise<PageUser> {
  const user = await pageUser();
  if (!user) redirect(`${ROUTES.login}?next=${encodeURIComponent(next)}`);
  return user;
}

export interface PageAdmin {
  userId: string;
  profile: Profile;
  /** Service-role client: admin pages read and write across every member, same as the admin API routes. */
  admin: SupabaseClient;
}

/**
 * For the admin section. An anonymous visitor goes to log in; a signed-in member who is not an
 * admin is sent to their own dashboard rather than shown a 403 (the admin area is unadvertised,
 * not merely permission-gated, so this quietly does not confirm it exists).
 */
export async function requireAdmin(): Promise<PageAdmin> {
  const user = await pageUser();
  if (!user) redirect(`${ROUTES.login}?next=${encodeURIComponent('/admin')}`);
  if (user.profile.role !== 'admin') redirect(ROUTES.dashboard);
  return { userId: user.userId, profile: user.profile, admin: adminClient() };
}
