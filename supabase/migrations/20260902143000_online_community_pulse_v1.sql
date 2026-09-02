-- ============================================================
-- MULTISPORTS SCORING — ONLINE COMMUNITY PULSE V1
-- 2026-09-02
--
-- Objectif : montrer une communauté RÉELLE dès le lancement sans faux comptes.
-- - compteur réel des comptes authentifiés
-- - activité 24 h / 7 j issue d'un heartbeat léger de l'application
-- - "en ligne" protégé contre les présences fantômes (stale > 2 min)
-- - nouveaux membres réels
-- - profils publics récents uniquement quand un profil public existe déjà
--
-- IMPORTANT : le heartbeat global ne crée PAS automatiquement de profil public.
-- Il met seulement à jour ms_presence pour préserver la confidentialité des comptes
-- qui n'ont jamais utilisé les fonctions sociales/ONLINE.
-- ============================================================

create or replace function public.ms_community_heartbeat(p_status text default 'online')
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := case
    when lower(coalesce(p_status,'')) in ('online','away','offline') then lower(p_status)
    else 'online'
  end;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.ms_presence(user_id,status,last_seen_at,updated_at)
  values(v_uid,v_status,now(),now())
  on conflict(user_id) do update
    set status=excluded.status,
        last_seen_at=excluded.last_seen_at,
        updated_at=excluded.updated_at;

  return jsonb_build_object('ok',true,'status',v_status,'updatedAt',now());
end
$$;

create or replace function public.ms_get_community_pulse(p_recent_limit integer default 8)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1,least(coalesce(p_recent_limit,8),20));
  v_members bigint := 0;
  v_active_24h bigint := 0;
  v_active_7d bigint := 0;
  v_online_now bigint := 0;
  v_new_7d bigint := 0;
  v_recent_members jsonb := '[]'::jsonb;
  v_active_members jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Tous les comptes Supabase réellement créés. Aucun compte synthétique n'est ajouté.
  select count(*) into v_members from auth.users;

  select count(*) into v_active_24h
  from public.ms_presence
  where last_seen_at >= now() - interval '24 hours';

  select count(*) into v_active_7d
  from public.ms_presence
  where last_seen_at >= now() - interval '7 days';

  -- Une app fermée/crashée ne doit pas laisser un faux "en ligne" indéfiniment.
  select count(*) into v_online_now
  from public.ms_presence
  where status='online'
    and last_seen_at >= now() - interval '2 minutes';

  select count(*) into v_new_7d
  from auth.users
  where created_at >= now() - interval '7 days';

  select coalesce(jsonb_agg(row_data order by sort_at desc),'[]'::jsonb)
    into v_recent_members
  from (
    select
      jsonb_build_object(
        'userId',p.user_id::text,
        'displayName',coalesce(nullif(trim(p.display_name),''),'Joueur'),
        'avatarUrl',p.avatar_url,
        'countryCode',p.country_code,
        'cityLabel',p.city_label,
        'createdAt',u.created_at,
        'lastSeenAt',pr.last_seen_at,
        'status',case
          when pr.status='online' and pr.last_seen_at >= now()-interval '2 minutes' then 'online'
          when pr.status='away' and pr.last_seen_at >= now()-interval '24 hours' then 'away'
          else 'offline'
        end
      ) as row_data,
      u.created_at as sort_at
    from public.ms_public_profiles p
    join auth.users u on u.id=p.user_id
    left join public.ms_presence pr on pr.user_id=p.user_id
    where p.user_id<>v_uid
    order by u.created_at desc
    limit v_limit
  ) q;

  select coalesce(jsonb_agg(row_data order by sort_at desc),'[]'::jsonb)
    into v_active_members
  from (
    select
      jsonb_build_object(
        'userId',p.user_id::text,
        'displayName',coalesce(nullif(trim(p.display_name),''),'Joueur'),
        'avatarUrl',p.avatar_url,
        'countryCode',p.country_code,
        'cityLabel',p.city_label,
        'lastSeenAt',pr.last_seen_at,
        'status',case
          when pr.status='online' and pr.last_seen_at >= now()-interval '2 minutes' then 'online'
          when pr.status='away' and pr.last_seen_at >= now()-interval '24 hours' then 'away'
          else 'offline'
        end
      ) as row_data,
      pr.last_seen_at as sort_at
    from public.ms_presence pr
    join public.ms_public_profiles p on p.user_id=pr.user_id
    where pr.user_id<>v_uid
      and pr.last_seen_at >= now()-interval '24 hours'
    order by pr.last_seen_at desc
    limit v_limit
  ) q;

  return jsonb_build_object(
    'members',v_members,
    'active24h',v_active_24h,
    'active7d',v_active_7d,
    'onlineNow',v_online_now,
    'new7d',v_new_7d,
    'recentMembers',v_recent_members,
    'activeMembers',v_active_members,
    'generatedAt',now()
  );
end
$$;

revoke all on function public.ms_community_heartbeat(text) from public;
revoke all on function public.ms_get_community_pulse(integer) from public;
grant execute on function public.ms_community_heartbeat(text) to authenticated;
grant execute on function public.ms_get_community_pulse(integer) to authenticated;

-- Harmonise aussi les statuts déjà utilisés par la recherche d'amis et la liste
-- d'amis : un crash/kill de l'application ne doit jamais laisser un profil
-- « en ligne » pendant des heures.
create or replace function public.ms_search_players(p_query text,p_limit integer default 25)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
 select jsonb_build_object(
   'id',p.user_id::text,
   'userId',p.user_id::text,
   'nickname',p.display_name,
   'displayName',p.display_name,
   'avatarUrl',p.avatar_url,
   'countryCode',p.country_code,
   'country',p.country_code,
   'status',case
     when pr.status='online' and pr.last_seen_at>=now()-interval '2 minutes' then 'online'
     when pr.status='away' and pr.last_seen_at>=now()-interval '24 hours' then 'away'
     else 'offline'
   end,
   'lastSeenAt',pr.last_seen_at,
   'createdAt',p.updated_at
 )
 from public.ms_public_profiles p
 left join public.ms_presence pr on pr.user_id=p.user_id
 where auth.uid() is not null
   and p.user_id<>auth.uid()
   and length(trim(coalesce(p_query,'')))>=2
   and lower(p.display_name) like '%'||lower(trim(p_query))||'%'
 order by
   case
     when pr.status='online' and pr.last_seen_at>=now()-interval '2 minutes' then 0
     when pr.status='away' and pr.last_seen_at>=now()-interval '24 hours' then 1
     else 2
   end,
   p.display_name
 limit greatest(1,least(coalesce(p_limit,25),50));
$$;

create or replace function public.ms_list_friends()
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
 with f as(
   select id,
          case when user_a_id=auth.uid() then user_b_id else user_a_id end friend_id,
          created_at
   from public.ms_friendships
   where auth.uid() is not null
     and (user_a_id=auth.uid() or user_b_id=auth.uid())
 )
 select jsonb_build_object(
   'id',f.friend_id::text,
   'userId',f.friend_id::text,
   'friendshipId',f.id::text,
   'nickname',coalesce(p.display_name,'Joueur'),
   'displayName',coalesce(p.display_name,'Joueur'),
   'avatarUrl',p.avatar_url,
   'countryCode',p.country_code,
   'country',p.country_code,
   'status',case
     when pr.status='online' and pr.last_seen_at>=now()-interval '2 minutes' then 'online'
     when pr.status='away' and pr.last_seen_at>=now()-interval '24 hours' then 'away'
     else 'offline'
   end,
   'lastSeenAt',pr.last_seen_at,
   'createdAt',f.created_at
 )
 from f
 left join public.ms_public_profiles p on p.user_id=f.friend_id
 left join public.ms_presence pr on pr.user_id=f.friend_id
 order by
   case
     when pr.status='online' and pr.last_seen_at>=now()-interval '2 minutes' then 0
     when pr.status='away' and pr.last_seen_at>=now()-interval '24 hours' then 1
     else 2
   end,
   coalesce(p.display_name,'Joueur');
$$;

grant execute on function public.ms_search_players(text,integer) to authenticated;
grant execute on function public.ms_list_friends() to authenticated;
