-- MULTISPORTS SCORING — Supabase preflight audit
-- READ ONLY. Run first in Supabase SQL Editor.

with expected_tables(name) as (
  select unnest(array[
    'ms_esports_competitive_matches',
    'ms_esports_disputes',
    'ms_esports_lfg_applications',
    'ms_esports_lfg_posts',
    'ms_esports_matchmaking_queue',
    'ms_esports_notifications',
    'ms_esports_profiles',
    'ms_esports_rating_history',
    'ms_esports_ratings',
    'ms_esports_rematch_requests',
    'ms_esports_season_scores',
    'ms_esports_seasons',
    'ms_esports_team_members',
    'ms_esports_teams',
    'ms_friend_requests',
    'ms_friendships',
    'ms_nearby_encounters',
    'ms_nearby_game_requests',
    'ms_nearby_place_requests',
    'ms_nearby_places',
    'ms_nearby_settings',
    'ms_presence',
    'ms_private_messages',
    'ms_public_profiles',
    'ms_running_public_routes',
    'ms_running_route_attempts',
    'ms_running_route_catalog',
    'ms_running_route_conditions',
    'ms_running_route_hazards',
    'ms_running_route_outing_members',
    'ms_running_route_outings',
    'ms_running_route_photos',
    'ms_running_route_reviews',
    'online_lobbies',
    'online_lobby_players',
    'online_matches',
    'online_messages'
  ]::text[])
), table_status as (
  select 'table'::text kind, e.name,
         case when c.oid is null then 'MISSING' else 'OK' end status
  from expected_tables e
  left join pg_class c on c.relname=e.name and c.relkind in ('r','p')
  left join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
), expected_functions(name) as (
  select unnest(array[
    'ms_cancel_nearby_place_request',
    'ms_clear_nearby_encounters',
    'ms_community_heartbeat',
    'ms_create_running_route_outing',
    'ms_delete_nearby_place',
    'ms_delete_private_message',
    'ms_edit_private_message',
    'ms_esports_apply_lfg',
    'ms_esports_claim_competitive_room',
    'ms_esports_create_team',
    'ms_esports_delete_team',
    'ms_esports_division_v6',
    'ms_esports_forfeit_competitive_match_v6',
    'ms_esports_get_competitive_match',
    'ms_esports_get_matchmaking',
    'ms_esports_get_or_create_competitive_match',
    'ms_esports_invite_team_member',
    'ms_esports_join_matchmaking',
    'ms_esports_leaderboard',
    'ms_esports_leave_matchmaking',
    'ms_esports_leave_team',
    'ms_esports_list_disputes_v6',
    'ms_esports_list_lfg',
    'ms_esports_list_lfg_applications',
    'ms_esports_list_notifications',
    'ms_esports_list_team_memberships',
    'ms_esports_list_teams',
    'ms_esports_mark_notification_read',
    'ms_esports_mmr_leaderboard',
    'ms_esports_open_dispute_v6',
    'ms_esports_publish_lfg',
    'ms_esports_ranked_history_v6',
    'ms_esports_rating_history_v6',
    'ms_esports_rating_profile_v6',
    'ms_esports_rematch_state_v6',
    'ms_esports_request_rematch_v6',
    'ms_esports_request_team_join',
    'ms_esports_review_lfg_application',
    'ms_esports_review_team_membership',
    'ms_esports_search_players',
    'ms_esports_set_lfg_status',
    'ms_esports_set_team_member_role',
    'ms_esports_submit_competitive_result',
    'ms_esports_upsert_profile',
    'ms_esports_v4_active_season_id',
    'ms_esports_v4_add_xp',
    'ms_esports_v4_notify',
    'ms_esports_v5_match_json',
    'ms_esports_v6_apply_rating',
    'ms_esports_withdraw_dispute_v6',
    'ms_esports_withdraw_lfg_application',
    'ms_find_nearby_places',
    'ms_find_nearby_players',
    'ms_find_running_public_routes',
    'ms_get_community_pulse',
    'ms_get_nearby_settings',
    'ms_join_running_route_outing',
    'ms_list_friend_requests',
    'ms_list_friends',
    'ms_list_nearby_encounters',
    'ms_list_nearby_game_requests',
    'ms_list_nearby_place_requests',
    'ms_list_private_messages',
    'ms_mark_private_message_read',
    'ms_mark_private_thread_read',
    'ms_nearby_distance_bucket',
    'ms_nearby_distance_label',
    'ms_post_running_route_condition',
    'ms_post_running_route_hazard',
    'ms_publish_nearby_place',
    'ms_publish_nearby_place_v2',
    'ms_publish_running_public_route',
    'ms_publish_running_route_photo',
    'ms_remove_friend',
    'ms_respond_friend_request',
    'ms_respond_nearby_game_request',
    'ms_respond_nearby_place_request',
    'ms_running_route_leaderboard',
    'ms_running_route_social_feed',
    'ms_search_players',
    'ms_search_running_route_catalog',
    'ms_send_friend_request',
    'ms_send_nearby_game_request',
    'ms_send_nearby_place_request',
    'ms_send_private_message',
    'ms_set_nearby_settings',
    'ms_touch_public_profile',
    'ms_unpublish_running_public_route',
    'ms_update_presence',
    'ms_upsert_running_route_attempt',
    'ms_upsert_running_route_review'
  ]::text[])
), function_status as (
  select 'function'::text kind, e.name,
         case when exists(
           select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname=e.name
         ) then 'OK' else 'MISSING' end status
  from expected_functions e
), extension_status as (
  select 'extension'::text kind, x.name,
         case when exists(select 1 from pg_extension e where e.extname=x.name) then 'OK' else 'MISSING' end status
  from (values ('pgcrypto'),('postgis')) x(name)
), bucket_status as (
  select 'storage_bucket'::text kind, 'route-community'::text name,
         case when exists(select 1 from storage.buckets where id='route-community') then 'OK' else 'MISSING' end status
), migration_history as (
  select 'migration_history'::text kind,
         coalesce(string_agg(version::text, ', ' order by version::text),'none recorded') name,
         'INFO'::text status
  from supabase_migrations.schema_migrations
)
select * from table_status
union all select * from function_status
union all select * from extension_status
union all select * from bucket_status
union all select * from migration_history
order by case status when 'MISSING' then 0 when 'INFO' then 1 else 2 end, kind, name;

-- Summary
select
  (select count(*) from pg_tables where schemaname='public' and tablename like 'ms_%') as ms_tables_present,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ms_%') as ms_functions_present,
  (select count(*) from pg_policies where schemaname='public' and policyname like 'ms_%') as ms_policies_present;
