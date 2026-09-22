'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | undefined;

/**
 * The client used by client components: signup, login, and anything on the dashboard that calls
 * Supabase Auth directly. It stores the session in cookies (not localStorage), the same cookies
 * `cookieClient()` reads on the server, so a page reload or a server component sees the same session.
 *
 * Reads `process.env.NEXT_PUBLIC_*` as two direct, literal expressions rather than through
 * `lib/env.ts`'s `supabaseEnv()`. That helper validates the *whole* `process.env` object with Zod,
 * which only works server-side: Next.js inlines a `NEXT_PUBLIC_*` value into the client bundle at
 * each literal `process.env.NEXT_PUBLIC_X` it finds while building, but the browser never gets a real,
 * fully-populated `process.env` object for a dynamic read like that to see.
 */
export function browserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. See .env.example.');
  cached ??= createBrowserClient(url, anonKey);
  return cached;
}
