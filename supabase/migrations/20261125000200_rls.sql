-- Row Level Security.
-- Public (anon) can read published content. Only admins (rows in public.admins) can write.
-- messages has no insert policy: inserts go through public.submit_message (service_role only).

-- ---------------------------------------------------------------------------
-- is_admin()
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.media enable row level security;
alter table public.profile enable row level security;
alter table public.profile_media enable row level security;
alter table public.projects enable row level security;
alter table public.project_media enable row level security;
alter table public.experiences enable row level security;
alter table public.skills enable row level security;
alter table public.achievements enable row level security;
alter table public.reels enable row level security;
alter table public.reel_chapters enable row level security;
alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- Explicit grants (do not rely on platform default privileges)
-- ---------------------------------------------------------------------------
revoke all on
  public.admins, public.media, public.profile, public.profile_media, public.projects,
  public.project_media, public.experiences, public.skills, public.achievements,
  public.reels, public.reel_chapters, public.messages
from anon, authenticated;

-- Public read surface.
grant select on
  public.media, public.profile, public.profile_media, public.projects, public.project_media,
  public.experiences, public.skills, public.achievements, public.reels, public.reel_chapters
to anon, authenticated;

-- Admin writes (still gated by the policies below).
grant insert, update, delete on
  public.media, public.profile, public.profile_media, public.projects, public.project_media,
  public.experiences, public.skills, public.achievements, public.reels, public.reel_chapters
to authenticated;

-- Admin-only tables.
grant select on public.admins to authenticated;
grant select, update, delete on public.messages to authenticated;

-- Server-side scripts (seed, contact RPC) use the secret key.
grant all on
  public.admins, public.media, public.profile, public.profile_media, public.projects,
  public.project_media, public.experiences, public.skills, public.achievements,
  public.reels, public.reel_chapters, public.messages
to service_role;

-- ---------------------------------------------------------------------------
-- admins: an admin can see the admin list; a user can see their own row.
-- No write policies — rows are managed with the secret key (seed script).
-- ---------------------------------------------------------------------------
create policy "admins: read self or admin"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Tables without a published flag: public read, admin write.
-- ---------------------------------------------------------------------------
create policy "media: public read" on public.media
  for select to anon, authenticated using (true);
create policy "media: admin insert" on public.media
  for insert to authenticated with check ((select public.is_admin()));
create policy "media: admin update" on public.media
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "media: admin delete" on public.media
  for delete to authenticated using ((select public.is_admin()));

create policy "profile: public read" on public.profile
  for select to anon, authenticated using (true);
create policy "profile: admin insert" on public.profile
  for insert to authenticated with check ((select public.is_admin()));
create policy "profile: admin update" on public.profile
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "profile: admin delete" on public.profile
  for delete to authenticated using ((select public.is_admin()));

create policy "profile_media: public read" on public.profile_media
  for select to anon, authenticated using (true);
create policy "profile_media: admin insert" on public.profile_media
  for insert to authenticated with check ((select public.is_admin()));
create policy "profile_media: admin update" on public.profile_media
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "profile_media: admin delete" on public.profile_media
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Published content: published OR admin.
-- ---------------------------------------------------------------------------
create policy "projects: read published or admin" on public.projects
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "projects: admin insert" on public.projects
  for insert to authenticated with check ((select public.is_admin()));
create policy "projects: admin update" on public.projects
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "projects: admin delete" on public.projects
  for delete to authenticated using ((select public.is_admin()));

-- Frames follow their project's visibility.
create policy "project_media: read with project" on public.project_media
  for select to anon, authenticated using (
    (select public.is_admin())
    or exists (
      select 1 from public.projects p
      where p.id = project_media.project_id and p.published
    )
  );
create policy "project_media: admin insert" on public.project_media
  for insert to authenticated with check ((select public.is_admin()));
create policy "project_media: admin update" on public.project_media
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "project_media: admin delete" on public.project_media
  for delete to authenticated using ((select public.is_admin()));

create policy "experiences: read published or admin" on public.experiences
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "experiences: admin insert" on public.experiences
  for insert to authenticated with check ((select public.is_admin()));
create policy "experiences: admin update" on public.experiences
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "experiences: admin delete" on public.experiences
  for delete to authenticated using ((select public.is_admin()));

create policy "skills: read published or admin" on public.skills
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "skills: admin insert" on public.skills
  for insert to authenticated with check ((select public.is_admin()));
create policy "skills: admin update" on public.skills
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "skills: admin delete" on public.skills
  for delete to authenticated using ((select public.is_admin()));

create policy "achievements: read published or admin" on public.achievements
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "achievements: admin insert" on public.achievements
  for insert to authenticated with check ((select public.is_admin()));
create policy "achievements: admin update" on public.achievements
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "achievements: admin delete" on public.achievements
  for delete to authenticated using ((select public.is_admin()));

-- Reels: the active reel is public; drafts only for admins.
create policy "reels: read active or admin" on public.reels
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "reels: admin insert" on public.reels
  for insert to authenticated with check ((select public.is_admin()));
create policy "reels: admin update" on public.reels
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reels: admin delete" on public.reels
  for delete to authenticated using ((select public.is_admin()));

create policy "reel_chapters: read with reel" on public.reel_chapters
  for select to anon, authenticated using (
    (select public.is_admin())
    or exists (
      select 1 from public.reels r
      where r.id = reel_chapters.reel_id and r.is_active
    )
  );
create policy "reel_chapters: admin insert" on public.reel_chapters
  for insert to authenticated with check ((select public.is_admin()));
create policy "reel_chapters: admin update" on public.reel_chapters
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reel_chapters: admin delete" on public.reel_chapters
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- messages: admin inbox only. No insert policy (RPC only).
-- ---------------------------------------------------------------------------
create policy "messages: admin read" on public.messages
  for select to authenticated using ((select public.is_admin()));
create policy "messages: admin update" on public.messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "messages: admin delete" on public.messages
  for delete to authenticated using ((select public.is_admin()));
