-- RPCs.

-- ---------------------------------------------------------------------------
-- submit_message — contact form entry point.
-- Called only by the Server Action with the secret key (service_role).
-- Rate limits live in Postgres because an in-memory limiter does not survive serverless:
--   * 3 messages per ip_hash per 10 minutes (the 4th call fails)
--   * 60 messages globally per 10 minutes
-- Raises 'rate_limited' (SQLSTATE P0001) when either limit is hit.
-- ---------------------------------------------------------------------------
create or replace function public.submit_message(
  p_name text,
  p_email text,
  p_body text,
  p_ip_hash text,
  p_user_agent text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_per_ip integer;
  v_global integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 then
    raise exception 'invalid_ip_hash' using errcode = '22023';
  end if;

  -- Serialize concurrent submissions so the counts below cannot be raced.
  perform pg_advisory_xact_lock(hashtext('public.submit_message'));

  select count(*) into v_per_ip
  from public.messages m
  where m.ip_hash = p_ip_hash
    and m.created_at > now() - interval '10 minutes';

  if v_per_ip >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'per_ip';
  end if;

  select count(*) into v_global
  from public.messages m
  where m.created_at > now() - interval '10 minutes';

  if v_global >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'global';
  end if;

  insert into public.messages (name, email, body, ip_hash, user_agent)
  values (
    btrim(p_name),
    lower(btrim(p_email)),
    btrim(p_body),
    p_ip_hash,
    left(p_user_agent, 512)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_message(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_message(text, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- replace_project_media — atomically replace a project's editorial frames.
-- security invoker: RLS on project_media applies, so only admins succeed.
-- p_frames: jsonb array of objects with project_media columns (media_id required).
-- ---------------------------------------------------------------------------
create or replace function public.replace_project_media(p_project uuid, p_frames jsonb)
returns setof public.project_media
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_frames is null or jsonb_typeof(p_frames) <> 'array' then
    raise exception 'frames_must_be_array' using errcode = '22023';
  end if;

  if not exists (select 1 from public.projects p where p.id = p_project) then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  delete from public.project_media pm where pm.project_id = p_project;

  insert into public.project_media (
    project_id, media_id, placement, col_start, col_end, row_index, ratio, shift, depth,
    format, frame, behavior, mobile_span, caption, is_cover, position
  )
  select
    p_project,
    (e.frame ->> 'media_id')::uuid,
    coalesce(e.frame ->> 'placement', 'both'),
    coalesce((e.frame ->> 'col_start')::smallint, 1),
    coalesce((e.frame ->> 'col_end')::smallint, 13),
    coalesce((e.frame ->> 'row_index')::smallint, 1),
    coalesce((e.frame ->> 'ratio')::numeric, 1.7778),
    coalesce((e.frame ->> 'shift')::numeric, 0),
    coalesce((e.frame ->> 'depth')::numeric, 0),
    coalesce(e.frame ->> 'format', 'landscape'),
    coalesce(e.frame ->> 'frame', 'none'),
    coalesce(e.frame ->> 'behavior', 'static'),
    coalesce((e.frame ->> 'mobile_span')::smallint, 12),
    coalesce(e.frame ->> 'caption', ''),
    coalesce((e.frame ->> 'is_cover')::boolean, false),
    coalesce((e.frame ->> 'position')::integer, (e.ord - 1)::integer)
  from jsonb_array_elements(p_frames) with ordinality as e(frame, ord);

  return query
    select pm.*
    from public.project_media pm
    where pm.project_id = p_project
    order by pm.position, pm.row_index, pm.col_start;
end;
$$;

revoke all on function public.replace_project_media(uuid, jsonb) from public, anon;
grant execute on function public.replace_project_media(uuid, jsonb) to authenticated, service_role;
