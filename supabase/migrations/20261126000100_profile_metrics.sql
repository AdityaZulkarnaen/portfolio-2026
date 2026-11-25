-- Featured-works metrics on the home page: [{ "value": "5+", "label": "Clients" }, …].
alter table public.profile
  add column metrics jsonb not null default '[]'::jsonb
  check (jsonb_typeof(metrics) = 'array');
