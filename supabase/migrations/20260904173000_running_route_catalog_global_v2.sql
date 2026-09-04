-- MULTISPORTS SCORING — Worldwide Route Catalog V2
-- Extends the original RUNNING PERF catalogue to multi-activity outdoor routes
-- and adds lightweight geographic metadata for worldwide ingestion.

alter table if exists public.ms_running_route_catalog
  add column if not exists country_code text,
  add column if not exists region_name text,
  add column if not exists locality text;

alter table if exists public.ms_running_route_catalog
  drop constraint if exists ms_running_route_catalog_sport_valid;

alter table if exists public.ms_running_route_catalog
  add constraint ms_running_route_catalog_sport_valid check (
    sport in (
      'running','trail','hiking','walking','nordic-walking',
      'cycling','mtb','gravel','ebike','bmx','roller',
      'snowshoe','ski-touring','equestrian'
    )
  );

create index if not exists ms_running_route_catalog_country_sport_idx
  on public.ms_running_route_catalog(country_code,sport,distance_m);
create index if not exists ms_running_route_catalog_region_idx
  on public.ms_running_route_catalog(region_name);

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
    'countryCode',r.country_code,
    'regionName',r.region_name,
    'locality',r.locality,
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

grant execute on function public.ms_search_running_route_catalog(double precision,double precision,integer,text,integer,integer,integer) to anon, authenticated;

comment on table public.ms_running_route_catalog is 'Worldwide multi-activity outdoor route catalogue: OSM, licensed APIs and legally reusable official/open-data route sources.';
