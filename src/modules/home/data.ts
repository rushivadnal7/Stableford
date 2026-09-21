import { FALLBACK_CHARITIES, FALLBACK_PLANS } from '@/content/fallback';
import { unwrap } from '@/lib/db';
import { anonClient } from '@/lib/supabase/user';
import { listCharities } from '@/modules/charities/service';

export interface HomePlan {
  code: 'monthly' | 'yearly';
  name: string;
  interval: 'month' | 'year';
  price_cents: number;
}

export interface HomeCharity {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  is_featured: boolean;
  image_url: string | null;
}

export interface HomeData {
  plans: HomePlan[];
  charities: HomeCharity[];
  /** false when the database could not be reached and the built-in copy is shown instead. */
  live: boolean;
}

/**
 * What the home page needs from the database: the plans and prices, and the charities to show
 * (featured first). It uses the public (anon) client, so Row Level Security decides what is visible.
 * If anything fails the page still renders, with the built-in fallback.
 */
export async function getHomeData(): Promise<HomeData> {
  try {
    const db = anonClient();
    const [charities, plans] = await Promise.all([
      listCharities(db, { limit: 6, offset: 0 }),
      db.from('plans').select('code, name, interval, price_cents').order('price_cents'),
    ]);
    const planRows = unwrap(plans) as HomePlan[];
    if (planRows.length === 0 || charities.items.length === 0) throw new Error('No plans or charities found');
    return { plans: planRows, charities: charities.items as HomeCharity[], live: true };
  } catch (error) {
    console.warn('Home page is using its built-in content:', error instanceof Error ? error.message : error);
    return { plans: FALLBACK_PLANS, charities: FALLBACK_CHARITIES, live: false };
  }
}
