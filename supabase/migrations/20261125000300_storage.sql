-- Storage: public bucket `media` for images. Reads go through the public CDN URL;
-- writes (upload/replace/delete) are admin-only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB
  array['image/webp', 'image/avif', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media bucket: admin read" on storage.objects;
drop policy if exists "media bucket: admin insert" on storage.objects;
drop policy if exists "media bucket: admin update" on storage.objects;
drop policy if exists "media bucket: admin delete" on storage.objects;

-- Admin select is needed for list() and for upsert uploads; anonymous reads use the public URL.
create policy "media bucket: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "media bucket: admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media bucket: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media bucket: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
