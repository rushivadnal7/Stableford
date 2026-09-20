-- Demo content for local development and the live demo. Safe to run more than once.
-- Charities here are fictional. Test users are created by `npm run seed:demo` (needs the auth admin API).

insert into public.charities (slug, name, category, summary, description, is_featured) values
  ('bright-start-kids', 'Bright Start Kids', 'education',
   'Books, meals and mentors for children starting school.',
   'Bright Start Kids gives children in under-served neighbourhoods the basics they need to start school: books, uniforms, a hot meal and a mentor who checks in every week.', true),
  ('clean-tide-alliance', 'Clean Tide Alliance', 'environment',
   'Community beach and river clean-ups.',
   'Volunteers and local councils working together to remove plastic from coastlines and rivers, and to teach schools how to keep them clean.', false),
  ('open-door-health', 'Open Door Health', 'health',
   'Free health check-ups for people who cannot afford them.',
   'Mobile clinics that bring screenings, vaccinations and health advice to rural and low-income communities.', false),
  ('second-innings', 'Second Innings', 'community',
   'Sport and skills for people rebuilding after hardship.',
   'Second Innings pairs people back on their feet with coaches, employers and training, using sport as the way in.', false),
  ('green-roots-trust', 'Green Roots Trust', 'environment',
   'Planting native trees and restoring green spaces.',
   'A trust that plants and maintains native woodland, and turns neglected urban land into community gardens.', false),
  ('young-voices-fund', 'Young Voices Fund', 'youth',
   'Mental-health support for teenagers.',
   'Trained counsellors and peer-support groups for teenagers, delivered in schools and youth clubs at no cost to families.', false)
on conflict (slug) do nothing;

insert into public.charity_events (charity_id, title, description, location, event_date)
select c.id, e.title, e.description, e.location, current_date + e.days
from (values
  ('bright-start-kids', 'Charity Golf Day', 'A four-ball scramble raising money for school starter packs.', 'Riverside Golf Club', 30),
  ('clean-tide-alliance', 'Beach Clean and Barbecue', 'Two hours of clean-up followed by lunch for all volunteers.', 'North Shore', 14),
  ('open-door-health', 'Community Health Fair', 'Free screenings and advice, with a golf putting challenge for kids.', 'Town Hall Green', 45),
  ('second-innings', 'Sunset Nine', 'Nine holes at dusk to fund coaching places.', 'Hillcrest Links', 60),
  ('green-roots-trust', 'Tree Planting Weekend', 'Bring a spade and help plant 500 native trees.', 'Old Mill Woods', 21),
  ('young-voices-fund', 'Fairway for Families', 'A charity golf morning supporting school counselling.', 'Oakview Golf Club', 75)
) as e(slug, title, description, location, days)
join public.charities c on c.slug = e.slug
where not exists (select 1 from public.charity_events x where x.charity_id = c.id and x.title = e.title);
