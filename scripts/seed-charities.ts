/**
 * Seeds the six demo charities and their events (mirrors supabase/seed.sql exactly, so the site's
 * built-in fallback content and the real database always agree). Exists because supabase/seed.sql
 * itself needs a direct Postgres connection or `supabase db push`, both of which need the Supabase
 * CLI logged in (`supabase login`) — this instead goes through the same admin REST API the app
 * already uses everywhere else, so it works against any project (local or a fresh hosted one) with
 * nothing but the service role key already in .env.local.
 *
 *   npm run seed:charities
 *
 * Safe to run more than once: charities upsert on slug, events are skipped if the same title
 * already exists for that charity (matching seed.sql's own on-conflict / not-exists guards).
 */
import { adminClient } from '@/lib/supabase/admin';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* use the real environment */
}

const CHARITIES = [
  {
    slug: 'bright-start-kids', name: 'Bright Start Kids', category: 'education', is_featured: true,
    summary: 'Books, meals and mentors for children starting school.',
    description: 'Bright Start Kids gives children in under-served neighbourhoods the basics they need to start school: books, uniforms, a hot meal and a mentor who checks in every week.',
    event: { title: 'Charity Golf Day', description: 'A four-ball scramble raising money for school starter packs.', location: 'Riverside Golf Club', days: 30 },
  },
  {
    slug: 'clean-tide-alliance', name: 'Clean Tide Alliance', category: 'environment', is_featured: false,
    summary: 'Community beach and river clean-ups.',
    description: 'Volunteers and local councils working together to remove plastic from coastlines and rivers, and to teach schools how to keep them clean.',
    event: { title: 'Beach Clean and Barbecue', description: 'Two hours of clean-up followed by lunch for all volunteers.', location: 'North Shore', days: 14 },
  },
  {
    slug: 'open-door-health', name: 'Open Door Health', category: 'health', is_featured: false,
    summary: 'Free health check-ups for people who cannot afford them.',
    description: 'Mobile clinics that bring screenings, vaccinations and health advice to rural and low-income communities.',
    event: { title: 'Community Health Fair', description: 'Free screenings and advice, with a golf putting challenge for kids.', location: 'Town Hall Green', days: 45 },
  },
  {
    slug: 'second-innings', name: 'Second Innings', category: 'community', is_featured: false,
    summary: 'Sport and skills for people rebuilding after hardship.',
    description: 'Second Innings pairs people back on their feet with coaches, employers and training, using sport as the way in.',
    event: { title: 'Sunset Nine', description: 'Nine holes at dusk to fund coaching places.', location: 'Hillcrest Links', days: 60 },
  },
  {
    slug: 'green-roots-trust', name: 'Green Roots Trust', category: 'environment', is_featured: false,
    summary: 'Planting native trees and restoring green spaces.',
    description: 'A trust that plants and maintains native woodland, and turns neglected urban land into community gardens.',
    event: { title: 'Tree Planting Weekend', description: 'Bring a spade and help plant 500 native trees.', location: 'Old Mill Woods', days: 21 },
  },
  {
    slug: 'young-voices-fund', name: 'Young Voices Fund', category: 'youth', is_featured: false,
    summary: 'Mental-health support for teenagers.',
    description: 'Trained counsellors and peer-support groups for teenagers, delivered in schools and youth clubs at no cost to families.',
    event: { title: 'Fairway for Families', description: 'A charity golf morning supporting school counselling.', location: 'Oakview Golf Club', days: 75 },
  },
];

async function main() {
  const admin = adminClient();
  const isoDay = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);

  for (const c of CHARITIES) {
    const { event, ...charity } = c;
    const { data: row, error } = await admin.from('charities').upsert(charity, { onConflict: 'slug' }).select('id, name').single();
    if (error) throw new Error(`${c.slug}: ${error.message}`);

    const { data: existing } = await admin.from('charity_events').select('id').eq('charity_id', row.id).eq('title', event.title).maybeSingle();
    if (!existing) {
      const { error: eventError } = await admin
        .from('charity_events')
        .insert({ charity_id: row.id, title: event.title, description: event.description, location: event.location, event_date: isoDay(event.days) });
      if (eventError) throw new Error(`${c.slug} event: ${eventError.message}`);
    }
    console.log(`${row.name.padEnd(22)} ready (${event.title})`);
  }
  console.log('\nDone.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
