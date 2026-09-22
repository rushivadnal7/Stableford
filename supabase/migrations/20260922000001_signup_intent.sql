-- ---------------------------------------------------------------------------
-- Let signup carry the visitor's charity choice through email confirmation.
--
-- Confirming an email often happens on a different device (open Gmail on the phone after
-- signing up on a laptop), so anything kept only in the browser is lost. The choice a visitor
-- makes on the signup form is sent as auth.signUp() metadata instead, and this trigger applies
-- it the moment the profile row is created — by the time they land back on the site, signed in,
-- their charity is already set and only "start the subscription" is left to do.
--
-- `create or replace function` updates the trigger's body in place; the trigger itself
-- (on_auth_user_created, from 20260921000002) still points at this same function name.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charity_id uuid;
  v_percent smallint;
begin
  -- Only accept a charity that exists and is currently active; anything else is left unset
  -- rather than failing the signup outright.
  select id into v_charity_id
  from public.charities
  where id = nullif(new.raw_user_meta_data ->> 'charity_id', '')::uuid
    and is_active = true;

  -- Clamp defensively to the same 10-50 range the column's own CHECK constraint enforces.
  v_percent := least(50, greatest(10, coalesce((new.raw_user_meta_data ->> 'charity_percent')::smallint, 10)));

  insert into public.profiles (id, email, full_name, charity_id, charity_percent)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_charity_id,
    v_percent
  );
  return new;
end
$$;
