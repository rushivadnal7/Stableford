import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from '@/lib/env';
import { realtimeOptions } from '@/lib/supabase/options';

/** A client that acts as the holder of `accessToken`. Row Level Security applies to everything it does. */
export function tokenClient(accessToken: string): SupabaseClient {
  const env = supabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
    ...realtimeOptions,
  });
}

/** A client that acts as the user signed in through the browser session cookie. */
export async function cookieClient(): Promise<SupabaseClient> {
  const env = supabaseEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    ...realtimeOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        try {
          all.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a context that cannot set cookies. Token refresh is handled by the phase 2 proxy.
        }
      },
    },
  });
}

/** Anonymous client for public reads (RLS allows only what `anon` may see). */
export function anonClient(): SupabaseClient {
  const env = supabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...realtimeOptions,
  });
}
