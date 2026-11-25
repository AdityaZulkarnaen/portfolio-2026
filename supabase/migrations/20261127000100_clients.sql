create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  logo_media_id uuid references public.media (id) on delete set null,
  url text check (url is null or url ~ '^https?://'),
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_listing_idx on public.clients (published, position);

create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

revoke all on public.clients from anon, authenticated;
grant select on public.clients to anon, authenticated;
grant insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;

create policy "clients: read published or admin" on public.clients
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "clients: admin insert" on public.clients
  for insert to authenticated with check ((select public.is_admin()));
create policy "clients: admin update" on public.clients
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "clients: admin delete" on public.clients
  for delete to authenticated using ((select public.is_admin()));
