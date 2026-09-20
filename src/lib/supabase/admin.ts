import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serviceEnv, supabaseEnv } from '@/lib/env';
import { realtimeOptions } from '@/lib/supabase/options';

let cached: SupabaseClient | undefined;

/**
 * Service-role client. It bypasses Row Level Security, so it is for the server only and only after
 * the caller has been authorised explicitly (admin routes, Stripe webhooks, system writes).
 */
export function adminClient(): SupabaseClient {
  cached ??= createClient(supabaseEnv().NEXT_PUBLIC_SUPABASE_URL, serviceEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...realtimeOptions,
  });
  return cached;
}
