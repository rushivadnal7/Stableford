-- Behaviour: triggers that protect invariants and the functions the API calls.
-- Errors raised on purpose use a stable snake_case message; src/lib/errors.ts maps them to HTTP responses.

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger charities_updated_at before update on public.charities for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger scores_updated_at before update on public.scores for each row execute function public.set_updated_at();
create trigger draws_updated_at before update on public.draws for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> profile row
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Entitlement: the single definition of "active subscriber" (decision D-2).
-- The 1-day grace covers a renewal webhook arriving slightly after the period ends.
-- ---------------------------------------------------------------------------
create function public.subscription_is_active(p_status public.subscription_status, p_period_end timestamptz)
returns boolean
language sql
stable
as $$
  select p_status = 'active' and (p_period_end is null or p_period_end > now() - interval '1 day')
$$;

-- Runs as the caller, so RLS on `subscriptions` applies: members can only ask about themselves.
create function public.is_active_subscriber(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and public.subscription_is_active(s.status, s.current_period_end)
  )
$$;

-- ---------------------------------------------------------------------------
-- Score rules (I-3, I-4, I-5)
-- ---------------------------------------------------------------------------
create function public.scores_before_write()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
  v_oldest date;
begin
  if new.played_on > (now() at time zone 'utc')::date then
    raise exception 'score_date_in_future';
  end if;

  if tg_op = 'INSERT' then
    -- One writer per user at a time, so concurrent requests cannot overrun the 5-score window.
    -- The lock is held until the transaction ends, and later statements see the other writer's commit.
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

    select count(*), min(played_on) into v_count, v_oldest
    from public.scores where user_id = new.user_id;

    if v_count >= 5 and new.played_on < v_oldest then
      raise exception 'score_older_than_last_five';
    end if;
  end if;

  return new;
end
$$;

create trigger scores_before_write
  before insert or update of played_on on public.scores
  for each row execute function public.scores_before_write();

-- Keep only the newest 5 by score date. The BEFORE trigger already rejected dates older than
-- all existing scores, so what gets trimmed is always the oldest existing score.
create function public.scores_after_insert()
returns trigger
language plpgsql
as $$
begin
  delete from public.scores
  where id in (
    select id from public.scores
    where user_id = new.user_id
    order by played_on desc, created_at desc
    offset 5
  );
  return null;
end
$$;

create trigger scores_after_insert
  after insert on public.scores
  for each row execute function public.scores_after_insert();

-- ---------------------------------------------------------------------------
-- Draw engine, SQL half (decision D-6). Set-based work over many rows lives here;
-- picking numbers and the prize maths are TypeScript (src/modules/draws).
-- All of these are service-role only (see the privileges block at the end).
-- ---------------------------------------------------------------------------

-- Step 1. Snapshot who is in the draw and what the pool is. Safe to repeat while the draw is a draft.
create function public.create_draw_snapshot(p_draw_id uuid, p_pool_share_percent integer)
returns jsonb
language plpgsql
as $$
declare
  v_draw public.draws%rowtype;
  v_active integer;
  v_eligible integer;
  v_base bigint;
  v_charity bigint;
  v_rollover bigint;
  v_freq jsonb;
begin
  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found then raise exception 'draw_not_found'; end if;
  if v_draw.status <> 'draft' then raise exception 'draw_not_draft'; end if;

  delete from public.draw_entries where draw_id = p_draw_id;
  delete from public.draw_tiers where draw_id = p_draw_id;
  delete from public.charity_contributions where draw_id = p_draw_id;

  -- Pool and charity totals: each active subscriber contributes their monthly-equivalent fee
  -- (integer division rounds down; a yearly plan counts as price / 12).
  with active as (
    select p.charity_id, p.charity_percent,
           case pl.interval when 'year' then pl.price_cents / 12 else pl.price_cents end as monthly_cents
    from public.subscriptions s
    join public.profiles p on p.id = s.user_id
    join public.plans pl on pl.id = s.plan_id
    where public.subscription_is_active(s.status, s.current_period_end)
  )
  select count(*),
         coalesce(sum(monthly_cents * p_pool_share_percent / 100), 0),
         coalesce(sum(case when charity_id is not null then monthly_cents * charity_percent / 100 else 0 end), 0)
    into v_active, v_base, v_charity
  from active;

  insert into public.charity_contributions (draw_id, charity_id, amount_cents)
  select p_draw_id, p.charity_id, sum(
           (case pl.interval when 'year' then pl.price_cents / 12 else pl.price_cents end) * p.charity_percent / 100)
  from public.subscriptions s
  join public.profiles p on p.id = s.user_id
  join public.plans pl on pl.id = s.plan_id
  where public.subscription_is_active(s.status, s.current_period_end) and p.charity_id is not null
  group by p.charity_id
  having sum((case pl.interval when 'year' then pl.price_cents / 12 else pl.price_cents end) * p.charity_percent / 100) > 0;

  -- Entries: active subscribers holding exactly 5 scores. The entry is the distinct score values.
  insert into public.draw_entries (draw_id, user_id, numbers)
  select p_draw_id, s.user_id, array_agg(distinct sc.score order by sc.score)
  from public.subscriptions s
  join public.scores sc on sc.user_id = s.user_id
  where public.subscription_is_active(s.status, s.current_period_end)
  group by s.user_id
  having count(*) = 5;
  get diagnostics v_eligible = row_count;

  -- Jackpot carried over from the latest earlier published draw (decision D-7).
  select d.rollover_out_cents into v_rollover
  from public.draws d
  where d.status = 'published' and d.period < v_draw.period
  order by d.period desc
  limit 1;
  v_rollover := coalesce(v_rollover, 0);

  -- How often each number appears across all entries. The algorithmic mode weights by this.
  select coalesce(jsonb_object_agg(f.n::text, f.c), '{}'::jsonb) into v_freq
  from (
    select x as n, count(*) as c
    from public.draw_entries e, unnest(e.numbers) as x
    where e.draw_id = p_draw_id
    group by x
  ) f;

  update public.draws set
    seed = null, numbers = null, simulated_at = null,
    active_subscribers = v_active, eligible_entries = v_eligible,
    base_pool_cents = v_base, rollover_in_cents = v_rollover,
    total_pool_cents = v_base + v_rollover, rollover_out_cents = 0,
    charity_cents_total = v_charity
  where id = p_draw_id;

  return jsonb_build_object(
    'active_subscribers', v_active,
    'eligible_entries', v_eligible,
    'base_pool_cents', v_base,
    'rollover_in_cents', v_rollover,
    'frequencies', v_freq
  );
end
$$;

-- Step 2. Store the drawn numbers and count matches. Returns winners per tier, e.g. {"3": 4, "5": 1}.
create function public.apply_draw_numbers(p_draw_id uuid, p_numbers smallint[], p_seed text)
returns jsonb
language plpgsql
as $$
declare
  v_draw public.draws%rowtype;
begin
  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found then raise exception 'draw_not_found'; end if;
  if v_draw.status <> 'draft' then raise exception 'draw_not_draft'; end if;

  update public.draws set numbers = p_numbers, seed = p_seed, simulated_at = null where id = p_draw_id;

  update public.draw_entries e
  set match_count = (select count(*) from unnest(e.numbers) x where x = any (p_numbers))
  where e.draw_id = p_draw_id;

  return (
    select coalesce(jsonb_object_agg(w.match_count::text, w.n), '{}'::jsonb)
    from (
      select match_count, count(*) as n
      from public.draw_entries
      where draw_id = p_draw_id and match_count >= 3
      group by match_count
    ) w
  );
end
$$;

-- Step 3. Store the prize ledger computed in TypeScript. The database re-checks the money adds up,
-- so a bug in the prize maths cannot silently create or lose cents.
create function public.store_draw_tiers(p_draw_id uuid, p_tiers jsonb, p_rollover_out_cents bigint)
returns void
language plpgsql
as $$
declare
  v_draw public.draws%rowtype;
begin
  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found then raise exception 'draw_not_found'; end if;
  if v_draw.status <> 'draft' then raise exception 'draw_not_draft'; end if;
  if v_draw.numbers is null then raise exception 'draw_not_simulated'; end if;

  delete from public.draw_tiers where draw_id = p_draw_id;

  insert into public.draw_tiers (draw_id, tier, pool_cents, winner_count, prize_each_cents, retained_cents, rolled_over_cents)
  select p_draw_id, (t ->> 'tier')::smallint, (t ->> 'pool_cents')::bigint, (t ->> 'winner_count')::integer,
         (t ->> 'prize_each_cents')::bigint, (t ->> 'retained_cents')::bigint, (t ->> 'rolled_over_cents')::bigint
  from jsonb_array_elements(p_tiers) t;

  if (select count(*) from public.draw_tiers where draw_id = p_draw_id) <> 3
     or (select coalesce(sum(pool_cents), 0) from public.draw_tiers where draw_id = p_draw_id) <> v_draw.total_pool_cents
  then
    raise exception 'draw_pool_mismatch';
  end if;

  if exists (
    select 1 from public.draw_tiers t
    where t.draw_id = p_draw_id
      and t.winner_count <> (select count(*) from public.draw_entries e where e.draw_id = t.draw_id and e.match_count = t.tier)
  ) then
    raise exception 'draw_tier_mismatch';
  end if;

  update public.draws set rollover_out_cents = p_rollover_out_cents, simulated_at = now() where id = p_draw_id;
end
$$;

-- Step 4. Freeze the draft and create the winners, atomically (I-12).
create function public.publish_draw(p_draw_id uuid, p_admin uuid)
returns integer
language plpgsql
as $$
declare
  v_draw public.draws%rowtype;
  v_prev_rollover bigint;
  v_winners integer;
begin
  -- Publishing is rare, so one global lock keeps the ordering checks below race-free.
  perform pg_advisory_xact_lock(hashtextextended('publish_draw', 0));

  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found then raise exception 'draw_not_found'; end if;
  if v_draw.status <> 'draft' then raise exception 'draw_not_draft'; end if;
  if v_draw.simulated_at is null then raise exception 'draw_not_simulated'; end if;

  -- Publishing out of order, or on top of a changed rollover, would count a jackpot twice.
  if exists (select 1 from public.draws where status = 'published' and period > v_draw.period) then
    raise exception 'draw_out_of_order';
  end if;
  select d.rollover_out_cents into v_prev_rollover
  from public.draws d
  where d.status = 'published' and d.period < v_draw.period
  order by d.period desc
  limit 1;
  if coalesce(v_prev_rollover, 0) <> v_draw.rollover_in_cents then
    raise exception 'draw_stale_rollover';
  end if;

  insert into public.winners (draw_id, user_id, tier, prize_cents)
  select e.draw_id, e.user_id, e.match_count, t.prize_each_cents
  from public.draw_entries e
  join public.draw_tiers t on t.draw_id = e.draw_id and t.tier = e.match_count
  where e.draw_id = p_draw_id and e.match_count >= 3;
  get diagnostics v_winners = row_count;

  update public.draws set status = 'published', published_at = now(), published_by = p_admin where id = p_draw_id;
  return v_winners;
end
$$;

-- ---------------------------------------------------------------------------
-- Published draws are immutable (I-18): the draw row and everything snapshotted for it can no
-- longer be changed or deleted, even by the service role. Winners stay editable (review, payout).
-- ---------------------------------------------------------------------------
create function public.protect_published_draw()
returns trigger
language plpgsql
as $$
declare
  v_draw_id uuid;
begin
  if tg_table_name = 'draws' then
    if old.status = 'published' then raise exception 'draw_is_published'; end if;
  else
    v_draw_id := case when tg_op = 'DELETE' then old.draw_id else new.draw_id end;
    if exists (select 1 from public.draws d where d.id = v_draw_id and d.status = 'published') then
      raise exception 'draw_is_published';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger draws_protect_published before update or delete on public.draws
  for each row execute function public.protect_published_draw();
create trigger draw_entries_protect_published before insert or update or delete on public.draw_entries
  for each row execute function public.protect_published_draw();
create trigger draw_tiers_protect_published before insert or update or delete on public.draw_tiers
  for each row execute function public.protect_published_draw();
create trigger charity_contributions_protect_published before insert or update or delete on public.charity_contributions
  for each row execute function public.protect_published_draw();

-- ---------------------------------------------------------------------------
-- Reports for the admin dashboard (ADM-07)
-- ---------------------------------------------------------------------------
create function public.admin_report()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_subscribers', (
      select count(*) from public.subscriptions s where public.subscription_is_active(s.status, s.current_period_end)),
    'draws_published', (select count(*) from public.draws where status = 'published'),
    'total_prize_pool_cents', (select coalesce(sum(base_pool_cents), 0) from public.draws where status = 'published'),
    'current_jackpot_cents', (
      select coalesce(rollover_out_cents, 0) from public.draws where status = 'published' order by period desc limit 1),
    'winners_total', (select count(*) from public.winners),
    'pending_verifications', (select count(*) from public.winners where verification_status = 'submitted'),
    'paid_out_cents', (select coalesce(sum(prize_cents), 0) from public.winners where payout_status = 'paid'),
    'pending_payout_cents', (select coalesce(sum(prize_cents), 0) from public.winners where payout_status = 'pending'),
    'charity_totals', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.total_cents desc, c.name), '[]'::jsonb)
      from (
        select ch.id as charity_id, ch.name,
               coalesce(s.cents, 0) as subscription_cents,
               coalesce(d.cents, 0) as donation_cents,
               coalesce(s.cents, 0) + coalesce(d.cents, 0) as total_cents
        from public.charities ch
        left join (
          select cc.charity_id, sum(cc.amount_cents) as cents
          from public.charity_contributions cc
          join public.draws dr on dr.id = cc.draw_id and dr.status = 'published'
          group by cc.charity_id
        ) s on s.charity_id = ch.id
        left join (
          select charity_id, sum(amount_cents) as cents from public.donations group by charity_id
        ) d on d.charity_id = ch.id
      ) c
    ),
    'draw_stats', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'period', dr.period, 'mode', dr.mode, 'active_subscribers', dr.active_subscribers,
        'eligible_entries', dr.eligible_entries, 'total_pool_cents', dr.total_pool_cents,
        'rollover_out_cents', dr.rollover_out_cents,
        'winners', (select count(*) from public.winners w where w.draw_id = dr.id)
      ) order by dr.period desc), '[]'::jsonb)
      from public.draws dr where dr.status = 'published'
    )
  )
$$;

-- ---------------------------------------------------------------------------
-- Function privileges. Supabase exposes public functions over the REST API to anon and
-- authenticated by default, so the service-role-only functions are revoked explicitly.
-- ---------------------------------------------------------------------------
revoke all on function public.create_draw_snapshot(uuid, integer) from public, anon, authenticated;
revoke all on function public.apply_draw_numbers(uuid, smallint[], text) from public, anon, authenticated;
revoke all on function public.store_draw_tiers(uuid, jsonb, bigint) from public, anon, authenticated;
revoke all on function public.publish_draw(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_report() from public, anon, authenticated;
grant execute on function public.create_draw_snapshot(uuid, integer) to service_role;
grant execute on function public.apply_draw_numbers(uuid, smallint[], text) to service_role;
grant execute on function public.store_draw_tiers(uuid, jsonb, bigint) to service_role;
grant execute on function public.publish_draw(uuid, uuid) to service_role;
grant execute on function public.admin_report() to service_role;

-- RLS policies call these as the signed-in member.
revoke all on function public.subscription_is_active(public.subscription_status, timestamptz) from public, anon;
revoke all on function public.is_active_subscriber(uuid) from public, anon;
grant execute on function public.subscription_is_active(public.subscription_status, timestamptz) to authenticated, service_role;
grant execute on function public.is_active_subscriber(uuid) to authenticated, service_role;
