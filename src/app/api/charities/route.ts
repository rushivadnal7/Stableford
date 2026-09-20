import { api, readQuery } from '@/lib/http';
import { anonClient } from '@/lib/supabase/user';
import { charityListQuery } from '@/modules/charities/schema';
import { listCategories, listCharities } from '@/modules/charities/service';

/** Public charity directory: search (?q=), filter (?category=, ?featured=), paging (?limit=, ?offset=). */
export const GET = api(async (req) => {
  const db = anonClient();
  const [list, categories] = await Promise.all([listCharities(db, readQuery(req, charityListQuery)), listCategories(db)]);
  return { ...list, categories };
});
