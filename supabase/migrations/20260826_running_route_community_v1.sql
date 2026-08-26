-- MULTISPORTS SCORING — RUNNING PERFORMANCE route community V1
-- Public authenticated leaderboard by stable route fingerprint.

create table if not exists public.ms_running_route_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  route_name text not null default 'Parcours',
  route_source text,
  sport text not null default 'running',
  activity_id text not null,
  elapsed_ms bigint not null check (elapsed_ms > 0),
  moving_ms bigint not null check (moving_ms > 0),
  distance_m numeric not null default 0,
  pace_sec_per_km numeric,
  elevation_gain_m numeric not null default 0,
  started_at timestamptz not null,
  verification text not null default 'declared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, activity_id)
);
create index if not exists ms_running_route_attempts_route_time_idx on public.ms_running_route_attempts(route_key, elapsed_ms asc);
create index if not exists ms_running_route_attempts_user_started_idx on public.ms_running_route_attempts(user_id, started_at desc);

alter table public.ms_running_route_attempts enable row level security;
-- Direct table reads/writes intentionally disabled. RPCs below are SECURITY DEFINER.

create or replace function public.ms_upsert_running_route_attempt(
  p_route_key text,
  p_route_name text,
  p_route_source text,
  p_sport text,
  p_activity_id text,
  p_elapsed_ms bigint,
  p_moving_ms bigint,
  p_distance_m numeric,
  p_pace_sec_per_km numeric,
  p_elevation_gain_m numeric,
  p_started_at timestamptz,
  p_verification text
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_route_key,''))) < 4 then raise exception 'INVALID_ROUTE_KEY'; end if;
  if length(trim(coalesce(p_activity_id,''))) < 2 then raise exception 'INVALID_ACTIVITY_ID'; end if;
  if coalesce(p_elapsed_ms,0) <= 0 then raise exception 'INVALID_TIME'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_attempts(user_id,route_key,route_name,route_source,sport,activity_id,elapsed_ms,moving_ms,distance_m,pace_sec_per_km,elevation_gain_m,started_at,verification,updated_at)
  values(v_uid,trim(p_route_key),left(coalesce(nullif(trim(p_route_name),''),'Parcours'),160),left(coalesce(p_route_source,''),40),left(coalesce(p_sport,'running'),40),trim(p_activity_id),p_elapsed_ms,greatest(1,coalesce(p_moving_ms,p_elapsed_ms)),greatest(0,coalesce(p_distance_m,0)),p_pace_sec_per_km,greatest(0,coalesce(p_elevation_gain_m,0)),coalesce(p_started_at,now()),left(coalesce(p_verification,'declared'),30),now())
  on conflict(user_id,activity_id) do update set route_key=excluded.route_key,route_name=excluded.route_name,route_source=excluded.route_source,sport=excluded.sport,elapsed_ms=excluded.elapsed_ms,moving_ms=excluded.moving_ms,distance_m=excluded.distance_m,pace_sec_per_km=excluded.pace_sec_per_km,elevation_gain_m=excluded.elevation_gain_m,started_at=excluded.started_at,verification=excluded.verification,updated_at=now();
  return jsonb_build_object('ok',true,'routeKey',trim(p_route_key));
end $$;

create or replace function public.ms_running_route_leaderboard(p_route_key text,p_limit integer default 20)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with best as (
    select distinct on (a.user_id) a.*,
      count(*) over(partition by a.user_id) as attempts
    from public.ms_running_route_attempts a
    where auth.uid() is not null and a.route_key=trim(p_route_key)
    order by a.user_id,a.elapsed_ms asc,a.started_at desc
  ), ranked as (
    select b.*,row_number() over(order by b.elapsed_ms asc,b.started_at asc) as rank
    from best b
  )
  select jsonb_build_object(
    'rank',r.rank,
    'userId',r.user_id::text,
    'displayName',coalesce(p.display_name,'Athlète'),
    'avatarUrl',p.avatar_url,
    'countryCode',p.country_code,
    'elapsedMs',r.elapsed_ms,
    'movingMs',r.moving_ms,
    'paceSecPerKm',r.pace_sec_per_km,
    'distanceM',r.distance_m,
    'elevationGainM',r.elevation_gain_m,
    'startedAt',r.started_at,
    'attempts',r.attempts
  )
  from ranked r left join public.ms_public_profiles p on p.user_id=r.user_id
  order by r.rank
  limit greatest(1,least(coalesce(p_limit,20),50));
$$;

grant execute on function public.ms_upsert_running_route_attempt(text,text,text,text,text,bigint,bigint,numeric,numeric,numeric,timestamptz,text) to authenticated;
grant execute on function public.ms_running_route_leaderboard(text,integer) to authenticated;
