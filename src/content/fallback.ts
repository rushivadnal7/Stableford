import type { HomeCharity, HomePlan } from '@/modules/home/data';

/**
 * Shown only when the database cannot be reached (a build without credentials, or an outage), so the
 * home page never breaks. It mirrors supabase/seed.sql and the plans migration; the live data wins.
 */
export const FALLBACK_PLANS: HomePlan[] = [
  { code: 'monthly', name: 'Monthly', interval: 'month', price_cents: 1000 },
  { code: 'yearly', name: 'Yearly', interval: 'year', price_cents: 10000 },
];

export const FALLBACK_CHARITIES: HomeCharity[] = [
  { id: 'bright-start-kids', slug: 'bright-start-kids', name: 'Bright Start Kids', category: 'education', summary: 'Books, meals and mentors for children starting school.', is_featured: true, image_url: null },
  { id: 'clean-tide-alliance', slug: 'clean-tide-alliance', name: 'Clean Tide Alliance', category: 'environment', summary: 'Community beach and river clean-ups.', is_featured: false, image_url: null },
  { id: 'open-door-health', slug: 'open-door-health', name: 'Open Door Health', category: 'health', summary: 'Free health check-ups for people who cannot afford them.', is_featured: false, image_url: null },
  { id: 'second-innings', slug: 'second-innings', name: 'Second Innings', category: 'community', summary: 'Sport and skills for people rebuilding after hardship.', is_featured: false, image_url: null },
  { id: 'green-roots-trust', slug: 'green-roots-trust', name: 'Green Roots Trust', category: 'environment', summary: 'Planting native trees and restoring green spaces.', is_featured: false, image_url: null },
  { id: 'young-voices-fund', slug: 'young-voices-fund', name: 'Young Voices Fund', category: 'youth', summary: 'Mental-health support for teenagers.', is_featured: false, image_url: null },
];
