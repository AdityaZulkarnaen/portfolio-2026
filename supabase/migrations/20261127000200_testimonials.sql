create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (length(btrim(quote)) between 1 and 1200),
  author_name text not null check (length(author_name) between 1 and 160),
  author_role text not null default '',
  author_org text not null default '',
  avatar_media_id uuid references public.media (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testimonials_listing_idx on public.testimonials (published, position);
create index testimonials_project_idx on public.testimonials (project_id);

create trigger set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;

revoke all on public.testimonials from anon, authenticated;
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;
grant all on public.testimonials to service_role;

create policy "testimonials: read published or admin" on public.testimonials
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "testimonials: admin insert" on public.testimonials
  for insert to authenticated with check ((select public.is_admin()));
create policy "testimonials: admin update" on public.testimonials
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "testimonials: admin delete" on public.testimonials
  for delete to authenticated using ((select public.is_admin()));
