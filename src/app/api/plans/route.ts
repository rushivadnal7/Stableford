import { unwrap } from '@/lib/db';
import { api } from '@/lib/http';
import { anonClient } from '@/lib/supabase/user';

/** Public: the plans a visitor can subscribe to. */
export const GET = api(async () => {
  const plans = unwrap(await anonClient().from('plans').select('code, name, interval, price_cents').order('price_cents'));
  return { plans };
});
