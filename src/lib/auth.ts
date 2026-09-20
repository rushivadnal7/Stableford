import type { SupabaseClient } from '@supabase/supabase-js';
import { fromDbError, forbidden, subscriptionRequired, unauthorized } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import { cookieClient, tokenClient } from '@/lib/supabase/user';
import type { Profile } from '@/lib/types';

/** Who is calling, and a database client that acts as them (Row Level Security applies to `db`). */
export interface AuthContext {
  userId: string;
  profile: Profile;
  db: SupabaseClient;
}

function bearerToken(req: Request): string | null {
  return req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

/**
 * Identify the caller from `Authorization: Bearer <jwt>` (API clients, tests) or, failing that,
 * the Supabase session cookie (browser). getUser() asks Supabase Auth to validate the token,
 * so a revoked or forged JWT is rejected rather than merely decoded.
 */
export async function authenticate(req: Request): Promise<AuthContext> {
  const token = bearerToken(req);
  const db = token ? tokenClient(token) : await cookieClient();
  const { data, error } = token ? await db.auth.getUser(token) : await db.auth.getUser();
  if (error || !data.user) throw unauthorized();

  const { data: profile, error: profileError } = await db.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (profileError || !profile) throw unauthorized();
  return { userId: data.user.id, profile: profile as Profile, db };
}

export async function requireAdmin(req: Request): Promise<AuthContext> {
  const ctx = await authenticate(req);
  if (ctx.profile.role !== 'admin') throw forbidden('Administrators only.');
  return ctx;
}

/**
 * For admin routes: verify the caller is an admin, then hand back the service-role client. Admin
 * operations bypass RLS, so this check is what guards them. It must run before any admin query.
 */
export async function adminContext(req: Request): Promise<{ actorId: string; admin: SupabaseClient }> {
  const ctx = await requireAdmin(req);
  return { actorId: ctx.userId, admin: adminClient() };
}

/** The entitlement rule lives in SQL (`is_active_subscriber`) so the API and RLS can never disagree. */
export async function isActiveSubscriber(ctx: AuthContext): Promise<boolean> {
  const { data, error } = await ctx.db.rpc('is_active_subscriber', { uid: ctx.userId });
  if (error) throw fromDbError(error);
  return data === true;
}

/** Checked on every request that needs a paid subscription (PRD section 04). */
export async function requireSubscriber(req: Request): Promise<AuthContext> {
  const ctx = await authenticate(req);
  if (!(await isActiveSubscriber(ctx))) throw subscriptionRequired();
  return ctx;
}
