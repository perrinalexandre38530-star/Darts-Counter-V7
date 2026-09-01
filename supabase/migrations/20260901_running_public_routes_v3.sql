-- RUNNING PERF V3 — public route catalogue (user published GPS routes)
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create table if not exists public.ms_running_public_routes (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_activity_id text not null,
  title text not null,
  description text not null default '',
  sport text not null,
  route jsonb not null,
  distance_m integer not null default 0,
  elevation_gain_m integer not null default 0,
  center extensions.geography(Point,4326),
  status text not null default 'public' check(status in ('public','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, source_activity_id)
);
create index if not exists ms_running_public_routes_center_gix on public.ms_running_public_routes using gist(center);
create index if not exists ms_running_public_routes_sport_idx on public.ms_running_public_routes(sport,status,updated_at desc);
alter table public.ms_running_public_routes enable row level security;

drop policy if exists ms_running_public_routes_read on public.ms_running_public_routes;
create policy ms_running_public_routes_read on public.ms_running_public_routes for select to authenticated using(status='public' or owner_user_id=auth.uid());
drop policy if exists ms_running_public_routes_owner on public.ms_running_public_routes;
create policy ms_running_public_routes_owner on public.ms_running_public_routes for all to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());

create or replace function public.ms_publish_running_public_route(
  p_source_activity_id text,p_title text,p_description text,p_sport text,p_route jsonb,p_distance_m integer,p_elevation_gain_m integer
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_lat double precision; v_lon double precision;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_route)<>'array' or jsonb_array_length(p_route)<2 or jsonb_array_length(p_route)>600 then raise exception 'INVALID_ROUTE'; end if;
  v_lat := nullif(p_route->0->>'lat','')::double precision;
  v_lon := nullif(coalesce(p_route->0->>'lon',p_route->0->>'lng'),'')::double precision;
  insert into public.ms_running_public_routes(owner_user_id,source_activity_id,title,description,sport,route,distance_m,elevation_gain_m,center,status,updated_at)
  values(v_uid,left(trim(coalesce(p_source_activity_id,'')),120),left(coalesce(nullif(trim(p_title),''),'Parcours'),120),left(trim(coalesce(p_description,'')),600),left(lower(trim(p_sport)),40),p_route,greatest(0,coalesce(p_distance_m,0)),greatest(0,coalesce(p_elevation_gain_m,0)),case when v_lat is null or v_lon is null then null else extensions.st_setsrid(extensions.st_makepoint(v_lon,v_lat),4326)::extensions.geography end,'public',now())
  on conflict(owner_user_id,source_activity_id) do update set title=excluded.title,description=excluded.description,sport=excluded.sport,route=excluded.route,distance_m=excluded.distance_m,elevation_gain_m=excluded.elevation_gain_m,center=excluded.center,status='public',updated_at=now()
  returning id into v_id;
  return jsonb_build_object('id',v_id::text,'ok',true);
end $$;

create or replace function public.ms_unpublish_running_public_route(p_source_activity_id text)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 update public.ms_running_public_routes set status='hidden',updated_at=now() where owner_user_id=v_uid and source_activity_id=p_source_activity_id;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.ms_find_running_public_routes(p_latitude double precision,p_longitude double precision,p_radius_km integer default 20,p_sport text default null,p_limit integer default 30)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with origin as (select extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography g)
  select jsonb_build_object(
    'id',r.id::text,'title',r.title,'description',r.description,'sport',r.sport,'route',r.route,'distanceM',r.distance_m,'elevationGainM',r.elevation_gain_m,
    'ownerUserId',r.owner_user_id::text,'ownerDisplayName',coalesce(p.display_name,'Athlète'),'ownerAvatarUrl',p.avatar_url,
    'distanceFromCenterM',round(extensions.st_distance(r.center,o.g))::integer,'createdAt',r.created_at
  )
  from public.ms_running_public_routes r cross join origin o left join public.ms_public_profiles p on p.user_id=r.owner_user_id
  where r.status='public' and r.center is not null
    and (p_sport is null or r.sport=lower(trim(p_sport)))
    and extensions.st_dwithin(r.center,o.g,greatest(1,least(100,p_radius_km))*1000)
  order by extensions.st_distance(r.center,o.g) asc,r.updated_at desc
  limit greatest(1,least(60,p_limit));
$$;

grant execute on function public.ms_publish_running_public_route(text,text,text,text,jsonb,integer,integer) to authenticated;
grant execute on function public.ms_unpublish_running_public_route(text) to authenticated;
grant execute on function public.ms_find_running_public_routes(double precision,double precision,integer,text,integer) to authenticated;
