-- Reference data the app cannot run without. Prices are seed values (assumption A-05) and editable later.
insert into public.plans (code, name, interval, price_cents) values
  ('monthly', 'Monthly', 'month', 1000),
  ('yearly', 'Yearly', 'year', 10000)
on conflict (code) do nothing;
