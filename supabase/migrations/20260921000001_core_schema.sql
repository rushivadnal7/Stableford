-- Core schema: enums, helper, tables, indexes and declarative constraints.
-- Behaviour (triggers, functions) is in 0002, reference data in 0003, access control in 0004+.
-- Design notes: docs/03-data-model.md. Money is always integer cents.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('member', 'admin');
create type public.plan_interval as enum ('month', 'year');
create type public.subscription_status as enum ('incomplete', 'active', 'past_due', 'canceled');
create type public.draw_mode as enum ('random', 'algorithmic');
create type public.draw_weighting as enum ('common', 'rare');
create type public.draw_status as enum ('draft', 'published');
create type public.verification_status as enum ('awaiting_proof', 'submitted', 'approved', 'rejected');
create type public.payout_status as enum ('pending', 'paid');

-- ---------------------------------------------------------------------------
-- Helper used by a CHECK constraint (must exist before the table)
-- A draw is exactly 5 distinct numbers between 1 and 45.
-- ---------------------------------------------------------------------------
create function public.is_valid_draw_numbers(n smallint[])
returns boolean
language sql
immutable
as $$
  select n is not null
     and cardinality(n) = 5
     and not exists (select 1 from unnest(n) as x where x is null or x < 1 or x > 45)
     and (select count(distinct x) from unnest(n) as x) = 5
$$;

-- ---------------------------------------------------------------------------
-- Charities
-- ---------------------------------------------------------------------------
create table public.charities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  category text not null default 'general',
  summary text not null default '',
  description text not null default '',
  image_path text,                                   -- object path in the public `charity-media` bucket
  is_featured boolean not null default false,
  is_active boolean not null default true,           -- soft delete: charities with history are deactivated, not removed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index charities_active_idx on public.charities (is_active, is_featured);

create table public.charity_events (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references public.charities (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  location text,
  event_date date not null,
  created_at timestamptz not null default now()
);
create index charity_events_charity_idx on public.charity_events (charity_id, event_date);

-- ---------------------------------------------------------------------------
-- People and billing
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'member',
  charity_id uuid references public.charities (id) on delete set null,
  charity_percent smallint not null default 10 check (charity_percent between 10 and 50),   -- I-6
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_charity_idx on public.profiles (charity_id);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('monthly', 'yearly')),
  name text not null,
  interval public.plan_interval not null,
  price_cents integer not null check (price_cents > 0),
  is_active boolean not null default true
);

-- One row per user: the latest subscription state mirrored from Stripe (decision D-1).
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_status_idx on public.subscriptions (status);

-- ---------------------------------------------------------------------------
-- Scores. Rolling-window rules live in triggers (0002).
-- ---------------------------------------------------------------------------
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 45),          -- I-1
  played_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scores_user_date_key unique (user_id, played_on)     -- I-2
);

-- ---------------------------------------------------------------------------
-- Draws: a draft is simulated (any number of times), then frozen by publishing.
-- ---------------------------------------------------------------------------
create table public.draws (
  id uuid primary key default gen_random_uuid(),
  period text not null unique check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),                       -- I-9
  mode public.draw_mode not null default 'random',
  weighting public.draw_weighting,
  status public.draw_status not null default 'draft',
  seed text,
  numbers smallint[],
  simulated_at timestamptz,
  active_subscribers integer not null default 0,
  eligible_entries integer not null default 0,
  base_pool_cents bigint not null default 0,
  rollover_in_cents bigint not null default 0,
  total_pool_cents bigint not null default 0,
  rollover_out_cents bigint not null default 0,
  charity_cents_total bigint not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint draws_weighting_matches_mode check ((mode = 'algorithmic') = (weighting is not null)),   -- I-10
  constraint draws_numbers_valid check (numbers is null or public.is_valid_draw_numbers(numbers)),
  constraint draws_published_is_complete check (                                                     -- I-11
    status = 'draft' or (numbers is not null and simulated_at is not null and published_at is not null)
  )
);

-- Snapshot of who entered and with which numbers. Deleting a draw removes its snapshot.
create table public.draw_entries (
  draw_id uuid not null references public.draws (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  numbers smallint[] not null,
  match_count smallint check (match_count between 0 and 5),
  primary key (draw_id, user_id)
);
create index draw_entries_user_idx on public.draw_entries (user_id);

-- Prize ledger: one row per tier. Every cent of a tier's pool is accounted for.
create table public.draw_tiers (
  draw_id uuid not null references public.draws (id) on delete cascade,
  tier smallint not null check (tier in (3, 4, 5)),
  pool_cents bigint not null check (pool_cents >= 0),
  winner_count integer not null check (winner_count >= 0),
  prize_each_cents bigint not null check (prize_each_cents >= 0),
  retained_cents bigint not null check (retained_cents >= 0),         -- rounding leftovers and unclaimed 3/4-match money
  rolled_over_cents bigint not null check (rolled_over_cents >= 0),   -- only tier 5 rolls over
  primary key (draw_id, tier),
  constraint draw_tiers_adds_up check (prize_each_cents * winner_count + retained_cents + rolled_over_cents = pool_cents)
);

-- Charity share per draw and charity (snapshot, so history survives plan or charity changes).
create table public.charity_contributions (
  draw_id uuid not null references public.draws (id) on delete cascade,
  charity_id uuid not null references public.charities (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  primary key (draw_id, charity_id)
);
create index charity_contributions_charity_idx on public.charity_contributions (charity_id);

-- ---------------------------------------------------------------------------
-- Winners: one row per winning user per draw, with proof review and payout state.
-- ---------------------------------------------------------------------------
create table public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  tier smallint not null check (tier in (3, 4, 5)),
  prize_cents bigint not null check (prize_cents >= 0),
  verification_status public.verification_status not null default 'awaiting_proof',
  proof_path text,
  proof_submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  payout_status public.payout_status not null default 'pending',
  paid_at timestamptz,
  paid_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint winners_one_per_draw unique (draw_id, user_id),                                            -- I-13
  constraint winners_paid_requires_approval check (payout_status = 'pending' or verification_status = 'approved'),  -- I-14
  constraint winners_review_requires_proof check (verification_status = 'awaiting_proof' or proof_path is not null) -- I-15
);
create index winners_user_idx on public.winners (user_id);
create index winners_draw_idx on public.winners (draw_id);
create index winners_status_idx on public.winners (verification_status, payout_status);

-- ---------------------------------------------------------------------------
-- Donations, webhook log and audit log
-- ---------------------------------------------------------------------------
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  charity_id uuid not null references public.charities (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  stripe_session_id text not null unique,                             -- I-16
  created_at timestamptz not null default now()
);
create index donations_user_idx on public.donations (user_id);
create index donations_charity_idx on public.donations (charity_id);

create table public.stripe_events (
  id text primary key,                                                -- I-16: Stripe event id
  type text not null,
  received_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
