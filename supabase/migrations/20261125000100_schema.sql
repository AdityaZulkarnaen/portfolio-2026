-- Portfolio 2026 — content schema.
-- Mutable vocabularies use text + check (not enums) so they can evolve with a plain migration.
-- Every table carries created_at/updated_at (maintained by set_updated_at()).
-- Orderable tables carry `position`.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- media (images in Storage bucket `media`; videos as keys under public/videos)
-- ---------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'video')),
  source text not null default 'storage' check (source in ('storage', 'public')),
  path text not null check (length(path) between 1 and 1024),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt text not null default '',
  lqip text,
  focal_x real check (focal_x is null or focal_x between 0 and 1),
  focal_y real check (focal_y is null or focal_y between 0 and 1),
  duration_s numeric(10, 3) check (duration_s is null or duration_s >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_source_path_key unique (source, path)
);

create index media_kind_idx on public.media (kind, position);

-- ---------------------------------------------------------------------------
-- profile (singleton, id = 1)
-- ---------------------------------------------------------------------------
create table public.profile (
  id smallint primary key default 1 check (id = 1),
  full_name text not null,
  short_name text not null default '',
  wordmark_top text not null default '',
  wordmark_bottom text not null default '',
  headline text not null default '',
  roles text[] not null default '{}',
  bio text[] not null default '{}',            -- paragraphs, markup-lite (**bold**, *highlight*, [t](url))
  location text not null default '',
  timezone text not null default 'Asia/Jakarta',
  availability text not null default '',
  email text not null default '',
  socials jsonb not null default '[]'::jsonb check (jsonb_typeof(socials) = 'array'),
  resume_path text,
  footer_tagline text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_media (
  id uuid primary key default gen_random_uuid(),
  profile_id smallint not null default 1 references public.profile (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete cascade,
  slot text not null check (slot in ('portrait', 'about')),
  caption text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_media_slot_media_key unique (slot, media_id)
);

create index profile_media_slot_idx on public.profile_media (slot, position);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique
    check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug::text) <= 96),
  name text not null check (length(name) between 1 and 160),
  year text not null default '',
  kind text not null default '',
  role text not null default '',
  client text,
  summary text not null default '',
  body text not null default '',                -- markup-lite
  stack text[] not null default '{}',
  live_url text check (live_url is null or live_url ~ '^https?://'),
  repo_url text check (repo_url is null or repo_url ~ '^https?://'),
  device text not null default 'desktop' check (device in ('desktop', 'mobile')),
  accent text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  featured boolean not null default false,
  published boolean not null default false,
  position integer not null default 0,
  cover_media_id uuid references public.media (id) on delete set null,
  film_media_id uuid references public.media (id) on delete set null,
  loop_media_id uuid references public.media (id) on delete set null,
  facts jsonb not null default '[]'::jsonb check (jsonb_typeof(facts) = 'array'),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_listing_idx on public.projects (published, position);
create index projects_featured_idx on public.projects (position) where featured and published;

-- ---------------------------------------------------------------------------
-- project_media — editorial 12-column grid frames
-- ---------------------------------------------------------------------------
create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete cascade,
  placement text not null default 'both' check (placement in ('showcase', 'case', 'both')),
  col_start smallint not null default 1 check (col_start between 1 and 12),
  col_end smallint not null default 13 check (col_end between 2 and 13),
  row_index smallint not null default 1 check (row_index between 1 and 64),
  ratio numeric(8, 4) not null default 1.7778 check (ratio > 0 and ratio <= 10), -- width / height of the frame window
  shift numeric(6, 3) not null default 0 check (shift between -4 and 4),         -- vertical offset in grid rows
  depth numeric(5, 3) not null default 0 check (depth between -1 and 1),         -- parallax factor
  format text not null default 'landscape'
    check (format in ('landscape', 'portrait', 'square', 'tall')),
  frame text not null default 'none' check (frame in ('none', 'browser', 'phone')),
  behavior text not null default 'static' check (behavior in ('static', 'scroll')),
  mobile_span smallint not null default 12 check (mobile_span between 1 and 12),
  caption text not null default '',
  is_cover boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_media_cols_check check (col_end > col_start)
);

create index project_media_project_idx on public.project_media (project_id, position);
create index project_media_media_idx on public.project_media (media_id);
create unique index project_media_one_cover_idx on public.project_media (project_id) where is_cover;

-- ---------------------------------------------------------------------------
-- experiences
-- ---------------------------------------------------------------------------
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique
    check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug::text) <= 128),
  role text not null,
  org text not null,
  start_date date not null,
  end_date date,                                -- null = present
  summary text not null default '',
  highlights text[] not null default '{}',
  stack text[] not null default '{}',
  published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_dates_check check (end_date is null or end_date >= start_date)
);

create index experiences_listing_idx on public.experiences (published, position);

-- ---------------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name extensions.citext not null unique check (length(name::text) between 1 and 64),
  category text not null
    check (category in ('language', 'frontend', 'backend', 'mobile', 'data', 'web3', 'tools')),
  marquee_row smallint not null default 1 check (marquee_row between 1 and 3),
  published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skills_listing_idx on public.skills (published, marquee_row, position);

-- ---------------------------------------------------------------------------
-- achievements (awards, competitions, certifications, education, organizations)
-- ---------------------------------------------------------------------------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique
    check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug::text) <= 128),
  kind text not null
    check (kind in ('award', 'competition', 'certification', 'education', 'organization')),
  title text not null,
  org text not null default '',
  period text not null default '',              -- display string, e.g. "2026" or "2024–2028"
  summary text not null default '',             -- markup-lite
  url text check (url is null or url ~ '^https?://'),
  published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index achievements_listing_idx on public.achievements (published, position);

-- ---------------------------------------------------------------------------
-- reels + chapters (Phase 2 showreel)
-- ---------------------------------------------------------------------------
create table public.reels (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9][a-z0-9._/-]*$'), -- video-manifest key
  title text not null default '',
  is_active boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index reels_one_active_idx on public.reels (is_active) where is_active;

create table public.reel_chapters (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  label text not null default '',
  start_s numeric(10, 3) not null check (start_s >= 0),
  end_s numeric(10, 3) not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reel_chapters_range_check check (end_s > start_s)
);

create index reel_chapters_reel_idx on public.reel_chapters (reel_id, start_s);

-- ---------------------------------------------------------------------------
-- messages (contact form inbox; written only through submit_message RPC)
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  email text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  body text not null check (length(btrim(body)) between 1 and 5000),
  ip_hash text not null check (length(ip_hash) between 16 and 128),
  user_agent text check (user_agent is null or length(user_agent) <= 512),
  read_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_inbox_idx on public.messages (archived, created_at desc);
create index messages_rate_idx on public.messages (ip_hash, created_at desc);
create index messages_created_idx on public.messages (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'admins', 'media', 'profile', 'profile_media', 'projects', 'project_media',
    'experiences', 'skills', 'achievements', 'reels', 'reel_chapters', 'messages'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;
