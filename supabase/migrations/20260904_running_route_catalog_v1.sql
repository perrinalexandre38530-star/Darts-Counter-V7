-- MULTISPORTS SCORING — RUNNING PERF Route Catalog V1
-- Persistent worldwide catalogue used by the server-side route aggregator.
-- Public clients may read/search it; only the Supabase service role can ingest.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create table if not exists public.ms_running_route_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null,
  provider_route_id text not null,
  title text not null,
  sport text not null,
  route jsonb not null,
  distance_m integer not null default 0,
  elevation_gain_m integer not null default 0,
  elevation_loss_m integer not null default 0,
  center_lat double precision not null,
  center_lon double precision not null,
  center extensions.geography(Point,4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(center_lon,center_lat),4326)::extensions.geography
  ) stored,
  network text,
  route_ref text,
  operator text,
  source_url text,
  image_url text,
  attribution text,
  source_license text,
  ranking double precision not null default 0,
  difficulty double precision not null default 0,
  is_loop boolean,
  metadata jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_route_id,sport),
  constraint ms_running_route_catalog_route_valid check (jsonb_typeof(route)='array' and jsonb_array_length(route)>=2),
  constraint ms_running_route_catalog_sport_valid check (sport in ('running','trail','hiking','walking','nordic-walking')),
  constraint ms_running_route_catalog_center_valid check (center_lat between -85 and 85 and center_lon between -180 and 180)
);

create index if not exists ms_running_route_catalog_center_gix on public.ms_running_route_catalog using gist(center);
create index if not exists ms_running_route_catalog_sport_distance_idx on public.ms_running_route_catalog(sport,distance_m);
create index if not exists ms_running_route_catalog_provider_idx on public.ms_running_route_catalog(provider,updated_at desc);
create index if not exists ms_running_route_catalog_updated_idx on public.ms_running_route_catalog(updated_at desc);

alter table public.ms_running_route_catalog enable row level security;

drop policy if exists ms_running_route_catalog_public_read on public.ms_running_route_catalog;
create policy ms_running_route_catalog_public_read on public.ms_running_route_catalog
for select to anon, authenticated using(true);

-- No INSERT/UPDATE/DELETE policy is intentionally created. The service role used by
-- the Cloudflare Function/GPX importer bypasses RLS and is the only ingestion path.

create or replace function public.ms_search_running_route_catalog(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km integer default 20,
  p_sport text default 'running',
  p_min_distance_m integer default 0,
  p_max_distance_m integer default 1000000,
  p_limit integer default 60
) returns setof jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography g
  )
  select jsonb_build_object(
    'provider',r.provider,
    'providerRouteId',r.provider_route_id,
    'title',r.title,
    'sport',r.sport,
    'route',r.route,
    'distanceM',r.distance_m,
    'elevationGainM',r.elevation_gain_m,
    'elevationLossM',r.elevation_loss_m,
    'network',r.network,
    'routeRef',r.route_ref,
    'operator',r.operator,
    'sourceUrl',r.source_url,
    'imageUrl',r.image_url,
    'attribution',r.attribution,
    'license',r.source_license,
    'ranking',r.ranking,
    'difficulty',r.difficulty,
    'isLoop',r.is_loop,
    'distanceFromCenterM',round(extensions.st_distance(r.center,o.g))::integer,
    'fetchedAt',r.fetched_at,
    'updatedAt',r.updated_at,
    'metadata',r.metadata
  )
  from public.ms_running_route_catalog r cross join origin o
  where r.sport=lower(trim(coalesce(p_sport,'running')))
    and r.distance_m between greatest(0,coalesce(p_min_distance_m,0)) and greatest(coalesce(p_min_distance_m,0),coalesce(p_max_distance_m,1000000))
    and extensions.st_dwithin(r.center,o.g,greatest(1,least(100,coalesce(p_radius_km,20)))*1000)
  order by
    case when r.ranking>0 then r.ranking else 0 end desc,
    extensions.st_distance(r.center,o.g) asc,
    r.updated_at desc
  limit greatest(1,least(100,coalesce(p_limit,60)));
$$;

grant select on public.ms_running_route_catalog to anon, authenticated;
grant execute on function public.ms_search_running_route_catalog(double precision,double precision,integer,text,integer,integer,integer) to anon, authenticated;

comment on table public.ms_running_route_catalog is 'Worldwide referenced route catalogue for RUNNING PERF: OSM, licensed provider content and legally imported GPX feeds.';
