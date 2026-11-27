-- A skill's mark for the stack section: a monochrome logo (processed by the seed), optional.
alter table public.skills
  add column logo_media_id uuid references public.media (id) on delete set null;
