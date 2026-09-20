-- Access control (I-7, I-8). Two layers: table privileges say WHAT a role may do at all,
-- RLS policies say WHICH ROWS. Members use their own JWT; anything that writes shared state
-- (subscriptions, draws, winners, ...) goes through the service role on the server, which bypasses RLS.
--
-- NOTE for future migrations: Supabase grants new tables to anon/authenticated by default.
-- Revoke what is not needed and enable RLS on every new table.

alter table public.charities enable row level security;
alter table public.charity_events enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.scores enable row level security;
alter table public.draws enable row level security;
alter table public.draw_entries enable row level security;
alter table public.draw_tiers enable row level security;
alter table public.charity_contributions enable row level security;
alter table public.winners enable row level security;
alter table public.donations enable row level security;
alter table public.stripe_events enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.plans, public.charities, public.charity_events to anon, authenticated;
grant select on public.profiles, public.subscriptions, public.donations, public.draws,
                public.draw_entries, public.draw_tiers, public.winners to authenticated;
grant select, insert, update, delete on public.scores to authenticated;
-- Members may edit only these profile columns; role and Stripe ids are off limits (I-7).
grant update (full_name, charity_id, charity_percent) on public.profiles to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Policies. `(select auth.uid())` is evaluated once per statement instead of once per row.
-- ---------------------------------------------------------------------------
create policy plans_read on public.plans
  for select to anon, authenticated using (is_active);

create policy charities_read on public.charities
  for select to anon, authenticated using (is_active);

create policy charity_events_read on public.charity_events
  for select to anon, authenticated
  using (exists (select 1 from public.charities c where c.id = charity_id and c.is_active));

create policy profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy subscriptions_read_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy donations_read_own on public.donations
  for select to authenticated using (user_id = (select auth.uid()));

-- Scores: members read their own history always, but write only while subscribed (I-8).
create policy scores_read_own on public.scores
  for select to authenticated using (user_id = (select auth.uid()));

create policy scores_insert_own on public.scores
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_subscriber((select auth.uid())));

create policy scores_update_own on public.scores
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_active_subscriber((select auth.uid())))
  with check (user_id = (select auth.uid()) and public.is_active_subscriber((select auth.uid())));

create policy scores_delete_own on public.scores
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_active_subscriber((select auth.uid())));

-- Draws are private until published. Entries and winners are visible to their owner only.
create policy draws_read_published on public.draws
  for select to authenticated using (status = 'published');

create policy draw_tiers_read_published on public.draw_tiers
  for select to authenticated
  using (exists (select 1 from public.draws d where d.id = draw_id and d.status = 'published'));

create policy draw_entries_read_own on public.draw_entries
  for select to authenticated
  using (user_id = (select auth.uid())
         and exists (select 1 from public.draws d where d.id = draw_id and d.status = 'published'));

create policy winners_read_own on public.winners
  for select to authenticated using (user_id = (select auth.uid()));

-- charity_contributions, stripe_events and audit_log have RLS on and no policy: service role only.
