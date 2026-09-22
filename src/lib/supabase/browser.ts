'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/env';

let cached: SupabaseClient | undefined;

/**
 * The client used by client components: signup, login, and anything on the dashboard that calls
 * Supabase Auth directly. It stores the session in cookies (not localStorage), the same cookies
 * `cookieClient()` reads on the server, so a page reload or a server component sees the same session.
 */
export function browserClient(): SupabaseClient {
  cached ??= createBrowserClient(supabaseEnv().NEXT_PUBLIC_SUPABASE_URL, supabaseEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return cached;
}
