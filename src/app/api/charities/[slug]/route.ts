import { api } from '@/lib/http';
import { anonClient } from '@/lib/supabase/user';
import { getCharity } from '@/modules/charities/service';

/** Public charity profile with its upcoming events. */
export const GET = api(async (_req, { params }: { params: { slug: string } }) => {
  return { charity: await getCharity(anonClient(), params.slug) };
});
