-- MULTISPORTS SCORING — Supabase postflight
-- Run after bootstrap. Expected result: zero rows in both MISSING queries.

with expected(name) as (select unnest(array[
  'online_lobbies',
  'ms_public_profiles',
  'ms_presence',
  'ms_nearby_places',
  'ms_running_route_attempts',
  'ms_running_route_reviews',
  'ms_running_public_routes',
  'ms_running_route_catalog',
  'ms_esports_profiles',
  'ms_esports_seasons',
  'ms_esports_competitive_matches',
  'ms_esports_ratings',
  'ms_esports_rating_history'
]::text[]))
select 'MISSING_TABLE' issue, e.name
from expected e
where not exists(select 1 from pg_tables t where t.schemaname='public' and t.tablename=e.name)
order by e.name;

with expected(name) as (select unnest(array[
  'ms_search_players',
  'ms_find_nearby_players',
  'ms_running_route_leaderboard',
  'ms_running_route_social_feed',
  'ms_find_running_public_routes',
  'ms_search_running_route_catalog',
  'ms_esports_list_lfg',
  'ms_esports_get_or_create_competitive_match',
  'ms_esports_rating_profile_v6',
  'ms_get_community_pulse'
]::text[]))
select 'MISSING_FUNCTION' issue, e.name
from expected e
where not exists(
  select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=e.name
)
order by e.name;

select
  (select count(*) from pg_tables where schemaname='public' and tablename like 'ms_%') as ms_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ms_%') as ms_functions,
  (select count(*) from pg_policies where schemaname='public' and policyname like 'ms_%') as ms_policies,
  exists(select 1 from storage.buckets where id='route-community') as route_community_bucket_ok,
  exists(select 1 from pg_extension where extname='postgis') as postgis_ok;
