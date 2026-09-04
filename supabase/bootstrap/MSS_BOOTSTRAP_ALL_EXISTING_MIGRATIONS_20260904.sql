-- MULTISPORTS SCORING — SAFE BOOTSTRAP OF ALL EXISTING BACKEND MIGRATIONS
-- Generated from Darts-Counter-V7(17)(1).zip on 2026-09-04.
-- Dependency-safe order. Existing migrations are written to be rerunnable (IF NOT EXISTS / CREATE OR REPLACE / guarded policies / UPSERTs).
-- Recommended: run preflight first, then this file once in Supabase SQL Editor, then postflight.

BEGIN;

-- ============================================================
-- 01/12  20260727_public_online_nearby.sql
-- ============================================================
-- MULTISPORTS SCORING — backend public ONLINE + JOUEURS À PROXIMITÉ
-- Supabase/PostGIS. Aucune dépendance au NAS pour les fonctions publiques.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

-- ============================================================
-- ONLINE PUBLIC : salons, participants, match live, chat
-- ============================================================
create table if not exists public.online_lobbies (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  mode text not null default 'x01',
  max_players integer not null default 2 check (max_players between 2 and 64),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  host_nickname text,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'waiting' check (status in ('waiting','started','closed','ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  closed_at timestamptz
);
create index if not exists online_lobbies_status_created_idx on public.online_lobbies(status, created_at desc);

create table if not exists public.online_lobby_players (
  id uuid primary key default extensions.gen_random_uuid(),
  lobby_id uuid not null references public.online_lobbies(id) on delete cascade,
  lobby_code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  display_name text,
  avatar_url text,
  role text not null default 'player' check (role in ('player','spectator')),
  status text not null default 'online' check (status in ('online','ready','offline')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  unique(lobby_id,user_id)
);
create index if not exists online_lobby_players_code_idx on public.online_lobby_players(lobby_code, joined_at);
create index if not exists online_lobby_players_user_idx on public.online_lobby_players(user_id, updated_at desc);

create table if not exists public.online_matches (
  id uuid primary key default extensions.gen_random_uuid(),
  lobby_code text not null unique,
  mode text not null default 'x01',
  status text not null default 'started' check (status in ('started','ended')),
  state_json jsonb not null default '{}'::jsonb,
  owner_user uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists online_matches_updated_idx on public.online_matches(updated_at desc);

create table if not exists public.online_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  lobby_code text not null,
  user_id uuid references auth.users(id) on delete set null,
  nickname text,
  message jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists online_messages_lobby_created_idx on public.online_messages(lobby_code, created_at desc);

alter table public.online_lobbies enable row level security;
alter table public.online_lobby_players enable row level security;
alter table public.online_matches enable row level security;
alter table public.online_messages enable row level security;

drop policy if exists ms_online_lobbies_select on public.online_lobbies;
create policy ms_online_lobbies_select on public.online_lobbies for select to authenticated using (true);
drop policy if exists ms_online_lobbies_insert on public.online_lobbies;
create policy ms_online_lobbies_insert on public.online_lobbies for insert to authenticated with check (host_user_id=auth.uid());
drop policy if exists ms_online_lobbies_update on public.online_lobbies;
create policy ms_online_lobbies_update on public.online_lobbies for update to authenticated using (host_user_id=auth.uid()) with check (host_user_id=auth.uid());
drop policy if exists ms_online_lobbies_delete on public.online_lobbies;
create policy ms_online_lobbies_delete on public.online_lobbies for delete to authenticated using (host_user_id=auth.uid());

drop policy if exists ms_online_lobby_players_select on public.online_lobby_players;
create policy ms_online_lobby_players_select on public.online_lobby_players for select to authenticated using (true);
drop policy if exists ms_online_lobby_players_insert on public.online_lobby_players;
create policy ms_online_lobby_players_insert on public.online_lobby_players for insert to authenticated with check (
  user_id=auth.uid() and exists(select 1 from public.online_lobbies l where l.id=lobby_id and l.status in ('waiting','started'))
);
drop policy if exists ms_online_lobby_players_update on public.online_lobby_players;
create policy ms_online_lobby_players_update on public.online_lobby_players for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists ms_online_lobby_players_delete on public.online_lobby_players;
create policy ms_online_lobby_players_delete on public.online_lobby_players for delete to authenticated using (
  user_id=auth.uid() or exists(select 1 from public.online_lobbies l where l.id=lobby_id and l.host_user_id=auth.uid())
);

drop policy if exists ms_online_matches_select on public.online_matches;
create policy ms_online_matches_select on public.online_matches for select to authenticated using (true);
drop policy if exists ms_online_matches_insert on public.online_matches;
create policy ms_online_matches_insert on public.online_matches for insert to authenticated with check (
  owner_user=auth.uid() and exists(select 1 from public.online_lobby_players p where p.lobby_code=online_matches.lobby_code and p.user_id=auth.uid())
);
drop policy if exists ms_online_matches_update on public.online_matches;
create policy ms_online_matches_update on public.online_matches for update to authenticated using (
  owner_user=auth.uid() or exists(select 1 from public.online_lobby_players p where p.lobby_code=online_matches.lobby_code and p.user_id=auth.uid() and p.role='player')
) with check (
  owner_user=auth.uid() or exists(select 1 from public.online_lobby_players p where p.lobby_code=online_matches.lobby_code and p.user_id=auth.uid() and p.role='player')
);

drop policy if exists ms_online_messages_select on public.online_messages;
create policy ms_online_messages_select on public.online_messages for select to authenticated using (
  exists(select 1 from public.online_lobby_players p where p.lobby_code=online_messages.lobby_code and p.user_id=auth.uid())
);
drop policy if exists ms_online_messages_insert on public.online_messages;
create policy ms_online_messages_insert on public.online_messages for insert to authenticated with check (
  user_id=auth.uid() and exists(select 1 from public.online_lobby_players p where p.lobby_code=online_messages.lobby_code and p.user_id=auth.uid())
);

-- Realtime pour spectateur/chat.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_lobbies') then execute 'alter publication supabase_realtime add table public.online_lobbies'; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_matches') then execute 'alter publication supabase_realtime add table public.online_matches'; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_lobby_players') then execute 'alter publication supabase_realtime add table public.online_lobby_players'; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_messages') then execute 'alter publication supabase_realtime add table public.online_messages'; end if;
  end if;
end $$;

-- ============================================================
-- SOCIAL PUBLIC + PROXIMITÉ
-- ============================================================
create table if not exists public.ms_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Joueur', avatar_url text, country_code text, city_label text,
  updated_at timestamptz not null default now()
);
create table if not exists public.ms_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'offline' check(status in ('online','away','offline')),
  last_seen_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ms_friend_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled')),
  message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), responded_at timestamptz,
  check(from_user_id<>to_user_id)
);
create unique index if not exists ms_friend_requests_pending_pair_uq on public.ms_friend_requests(from_user_id,to_user_id) where status='pending';
create index if not exists ms_friend_requests_to_idx on public.ms_friend_requests(to_user_id,status,created_at desc);
create table if not exists public.ms_friendships (
  id uuid primary key default extensions.gen_random_uuid(), user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(user_a_id<>user_b_id), unique(user_a_id,user_b_id)
);
create table if not exists public.ms_private_messages (
  id uuid primary key default extensions.gen_random_uuid(), thread_id text not null,
  from_user_id uuid not null references auth.users(id) on delete cascade, to_user_id uuid not null references auth.users(id) on delete cascade,
  text text not null, status text not null default 'sent' check(status in ('sent','read')), metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), edited_at timestamptz, read_at timestamptz,
  deleted_by_sender boolean not null default false, deleted_by_recipient boolean not null default false, check(from_user_id<>to_user_id)
);
create index if not exists ms_private_messages_thread_idx on public.ms_private_messages(thread_id,created_at desc);

create table if not exists public.ms_nearby_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visible boolean not null default false,
  location extensions.geography(Point,4326), location_updated_at timestamptz,
  radius_km integer not null default 10 check(radius_km between 1 and 100), sports text[] not null default '{}'::text[], skill_level numeric(3,1),
  available_now boolean not null default false, available_until timestamptz,
  looking_for_game boolean not null default false, looking_until timestamptz,
  preferred_modes text[] not null default '{}'::text[], area_label text, display_name text not null default 'Joueur', avatar_url text, country_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ms_nearby_settings_location_gix on public.ms_nearby_settings using gist(location);
create index if not exists ms_nearby_settings_visible_idx on public.ms_nearby_settings(visible,updated_at desc);

create table if not exists public.ms_nearby_game_requests (
  id uuid primary key default extensions.gen_random_uuid(), from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade, sport text not null default 'generic', modes text[] not null default '{}'::text[],
  message text, status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled','expired')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), responded_at timestamptz,
  expires_at timestamptz not null default(now()+interval '24 hours'), check(from_user_id<>to_user_id)
);
create index if not exists ms_nearby_game_requests_to_idx on public.ms_nearby_game_requests(to_user_id,status,created_at desc);

alter table public.ms_public_profiles enable row level security;
alter table public.ms_presence enable row level security;
alter table public.ms_friend_requests enable row level security;
alter table public.ms_friendships enable row level security;
alter table public.ms_private_messages enable row level security;
alter table public.ms_nearby_settings enable row level security;
alter table public.ms_nearby_game_requests enable row level security;

drop policy if exists ms_nearby_owner_select on public.ms_nearby_settings;
create policy ms_nearby_owner_select on public.ms_nearby_settings for select to authenticated using(user_id=auth.uid());
drop policy if exists ms_nearby_owner_insert on public.ms_nearby_settings;
create policy ms_nearby_owner_insert on public.ms_nearby_settings for insert to authenticated with check(user_id=auth.uid());
drop policy if exists ms_nearby_owner_update on public.ms_nearby_settings;
create policy ms_nearby_owner_update on public.ms_nearby_settings for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Les autres tables sont accessibles par RPC SECURITY DEFINER uniquement.

create or replace function public.ms_touch_public_profile(p_display_name text default null,p_avatar_url text default null,p_country_code text default null,p_city_label text default null)
returns void language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_name text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select coalesce(nullif(trim(p_display_name),''),nullif(trim(raw_user_meta_data->>'nickname'),''),nullif(split_part(email,'@',1),''),'Joueur') into v_name from auth.users where id=v_uid;
 insert into public.ms_public_profiles(user_id,display_name,avatar_url,country_code,city_label,updated_at)
 values(v_uid,coalesce(v_name,'Joueur'),p_avatar_url,upper(nullif(trim(p_country_code),'')),nullif(trim(p_city_label),''),now())
 on conflict(user_id) do update set display_name=coalesce(nullif(trim(p_display_name),''),ms_public_profiles.display_name),avatar_url=coalesce(p_avatar_url,ms_public_profiles.avatar_url),country_code=coalesce(upper(nullif(trim(p_country_code),'')),ms_public_profiles.country_code),city_label=coalesce(nullif(trim(p_city_label),''),ms_public_profiles.city_label),updated_at=now();
end $$;

create or replace function public.ms_update_presence(p_status text) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_status text:=lower(trim(coalesce(p_status,'offline')));
begin if v_uid is null then raise exception 'AUTH_REQUIRED'; end if; if v_status not in('online','away','offline') then raise exception 'INVALID_STATUS'; end if;
 perform public.ms_touch_public_profile(); insert into public.ms_presence(user_id,status,last_seen_at,updated_at) values(v_uid,v_status,now(),now()) on conflict(user_id) do update set status=excluded.status,last_seen_at=now(),updated_at=now(); return jsonb_build_object('ok',true,'status',v_status,'updatedAt',now()); end $$;

create or replace function public.ms_search_players(p_query text,p_limit integer default 25) returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
 select jsonb_build_object('id',p.user_id::text,'userId',p.user_id::text,'nickname',p.display_name,'displayName',p.display_name,'avatarUrl',p.avatar_url,'countryCode',p.country_code,'country',p.country_code,'status',coalesce(pr.status,'offline'),'lastSeenAt',pr.last_seen_at,'createdAt',p.updated_at)
 from public.ms_public_profiles p left join public.ms_presence pr on pr.user_id=p.user_id
 where auth.uid() is not null and p.user_id<>auth.uid() and length(trim(coalesce(p_query,'')))>=2 and lower(p.display_name) like '%'||lower(trim(p_query))||'%'
 order by case when pr.status='online' then 0 when pr.status='away' then 1 else 2 end,p.display_name limit greatest(1,least(coalesce(p_limit,25),50)); $$;

create or replace function public.ms_send_friend_request(p_to_user_id uuid,p_message text default null) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_me uuid:=auth.uid(); v_a uuid; v_b uuid; v_row public.ms_friend_requests;
begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; if p_to_user_id is null or p_to_user_id=v_me then raise exception 'INVALID_TARGET'; end if;
 if v_me::text<p_to_user_id::text then v_a:=v_me;v_b:=p_to_user_id;else v_a:=p_to_user_id;v_b:=v_me;end if;
 if exists(select 1 from public.ms_friendships where user_a_id=v_a and user_b_id=v_b) then raise exception 'ALREADY_FRIENDS'; end if;
 if exists(select 1 from public.ms_friend_requests where status='pending' and from_user_id=p_to_user_id and to_user_id=v_me) then raise exception 'REQUEST_ALREADY_RECEIVED'; end if;
 perform public.ms_touch_public_profile(); insert into public.ms_friend_requests(from_user_id,to_user_id,status,message) values(v_me,p_to_user_id,'pending',nullif(trim(p_message),''))
 on conflict(from_user_id,to_user_id) where status='pending' do update set message=excluded.message,updated_at=now() returning * into v_row;
 return jsonb_build_object('id',v_row.id::text,'status',v_row.status,'message',v_row.message,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at); end $$;

create or replace function public.ms_list_friend_requests() returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
 select jsonb_build_object('id',r.id::text,'status',r.status,'message',r.message,'direction',case when r.to_user_id=auth.uid() then 'incoming' else 'outgoing' end,'createdAt',r.created_at,'updatedAt',r.updated_at,'respondedAt',r.responded_at,
 'fromUser',jsonb_build_object('id',r.from_user_id::text,'userId',r.from_user_id::text,'displayName',coalesce(fp.display_name,'Joueur'),'nickname',coalesce(fp.display_name,'Joueur'),'avatarUrl',fp.avatar_url,'countryCode',fp.country_code,'status',coalesce(fpres.status,'offline'),'lastSeenAt',fpres.last_seen_at),
 'toUser',jsonb_build_object('id',r.to_user_id::text,'userId',r.to_user_id::text,'displayName',coalesce(tp.display_name,'Joueur'),'nickname',coalesce(tp.display_name,'Joueur'),'avatarUrl',tp.avatar_url,'countryCode',tp.country_code,'status',coalesce(tpres.status,'offline'),'lastSeenAt',tpres.last_seen_at))
 from public.ms_friend_requests r left join public.ms_public_profiles fp on fp.user_id=r.from_user_id left join public.ms_public_profiles tp on tp.user_id=r.to_user_id left join public.ms_presence fpres on fpres.user_id=r.from_user_id left join public.ms_presence tpres on tpres.user_id=r.to_user_id
 where auth.uid() is not null and (r.from_user_id=auth.uid() or r.to_user_id=auth.uid()) order by r.created_at desc; $$;

create or replace function public.ms_respond_friend_request(p_request_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_me uuid:=auth.uid(); v_r public.ms_friend_requests; v_status text:=lower(trim(p_status)); v_a uuid; v_b uuid;
begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; if v_status not in('accepted','rejected') then raise exception 'INVALID_STATUS'; end if;
 select * into v_r from public.ms_friend_requests where id=p_request_id and to_user_id=v_me and status='pending' for update; if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
 update public.ms_friend_requests set status=v_status,responded_at=now(),updated_at=now() where id=v_r.id;
 if v_status='accepted' then if v_r.from_user_id::text<v_r.to_user_id::text then v_a:=v_r.from_user_id;v_b:=v_r.to_user_id;else v_a:=v_r.to_user_id;v_b:=v_r.from_user_id;end if; insert into public.ms_friendships(user_a_id,user_b_id) values(v_a,v_b) on conflict(user_a_id,user_b_id) do update set updated_at=now(); end if;
 return jsonb_build_object('id',v_r.id::text,'status',v_status,'respondedAt',now()); end $$;

create or replace function public.ms_list_friends() returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
 with f as(select id,case when user_a_id=auth.uid() then user_b_id else user_a_id end friend_id,created_at from public.ms_friendships where auth.uid() is not null and (user_a_id=auth.uid() or user_b_id=auth.uid()))
 select jsonb_build_object('id',f.friend_id::text,'userId',f.friend_id::text,'friendshipId',f.id::text,'nickname',coalesce(p.display_name,'Joueur'),'displayName',coalesce(p.display_name,'Joueur'),'avatarUrl',p.avatar_url,'countryCode',p.country_code,'country',p.country_code,'status',coalesce(pr.status,'offline'),'lastSeenAt',pr.last_seen_at,'createdAt',f.created_at)
 from f left join public.ms_public_profiles p on p.user_id=f.friend_id left join public.ms_presence pr on pr.user_id=f.friend_id order by case when pr.status='online' then 0 when pr.status='away' then 1 else 2 end,coalesce(p.display_name,'Joueur'); $$;

create or replace function public.ms_remove_friend(p_friend_user_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_me uuid:=auth.uid(); v_a uuid;v_b uuid; begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; if v_me::text<p_friend_user_id::text then v_a:=v_me;v_b:=p_friend_user_id;else v_a:=p_friend_user_id;v_b:=v_me;end if; delete from public.ms_friendships where user_a_id=v_a and user_b_id=v_b; return jsonb_build_object('ok',true); end $$;

create or replace function public.ms_list_private_messages(p_limit integer default 500) returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
 select jsonb_build_object('id',m.id::text,'threadId',m.thread_id,'text',m.text,'status',m.status,'metadata',m.metadata,'createdAt',m.created_at,'readAt',m.read_at,'editedAt',m.edited_at,'direction',case when m.from_user_id=auth.uid() then 'outgoing' else 'incoming' end,
 'fromUser',jsonb_build_object('id',m.from_user_id::text,'userId',m.from_user_id::text,'displayName',coalesce(fp.display_name,'Joueur'),'nickname',coalesce(fp.display_name,'Joueur'),'avatarUrl',fp.avatar_url),
 'toUser',jsonb_build_object('id',m.to_user_id::text,'userId',m.to_user_id::text,'displayName',coalesce(tp.display_name,'Joueur'),'nickname',coalesce(tp.display_name,'Joueur'),'avatarUrl',tp.avatar_url))
 from public.ms_private_messages m left join public.ms_public_profiles fp on fp.user_id=m.from_user_id left join public.ms_public_profiles tp on tp.user_id=m.to_user_id
 where auth.uid() is not null and ((m.from_user_id=auth.uid() and not m.deleted_by_sender) or(m.to_user_id=auth.uid() and not m.deleted_by_recipient)) order by m.created_at asc limit greatest(1,least(coalesce(p_limit,500),1000)); $$;

create or replace function public.ms_send_private_message(p_to_user_id uuid,p_text text,p_metadata jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_me uuid:=auth.uid();v_thread text;v_row public.ms_private_messages; begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; if p_to_user_id=v_me or length(trim(coalesce(p_text,'')))=0 then raise exception 'INVALID_MESSAGE'; end if; v_thread:=least(v_me::text,p_to_user_id::text)||':'||greatest(v_me::text,p_to_user_id::text); perform public.ms_touch_public_profile(); insert into public.ms_private_messages(thread_id,from_user_id,to_user_id,text,metadata) values(v_thread,v_me,p_to_user_id,left(trim(p_text),4000),coalesce(p_metadata,'{}'::jsonb)) returning * into v_row; return jsonb_build_object('id',v_row.id::text,'threadId',v_row.thread_id,'text',v_row.text,'status',v_row.status,'metadata',v_row.metadata,'createdAt',v_row.created_at,'direction','outgoing'); end $$;
create or replace function public.ms_edit_private_message(p_message_id uuid,p_text text) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$ declare v_me uuid:=auth.uid();v_row public.ms_private_messages; begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; update public.ms_private_messages set text=left(trim(p_text),4000),edited_at=now(),updated_at=now() where id=p_message_id and from_user_id=v_me and created_at>now()-interval '24 hours' returning * into v_row; if not found then raise exception 'MESSAGE_NOT_EDITABLE'; end if; return jsonb_build_object('id',v_row.id::text,'threadId',v_row.thread_id,'text',v_row.text,'status',v_row.status,'metadata',v_row.metadata,'createdAt',v_row.created_at,'editedAt',v_row.edited_at,'direction','outgoing'); end $$;
create or replace function public.ms_mark_private_message_read(p_message_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$ declare v_me uuid:=auth.uid(); begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; update public.ms_private_messages set status='read',read_at=coalesce(read_at,now()),updated_at=now() where id=p_message_id and to_user_id=v_me; return jsonb_build_object('ok',true,'id',p_message_id::text); end $$;
create or replace function public.ms_mark_private_thread_read(p_friend_user_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$ declare v_me uuid:=auth.uid();v_count integer; begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; update public.ms_private_messages set status='read',read_at=coalesce(read_at,now()),updated_at=now() where from_user_id=p_friend_user_id and to_user_id=v_me and read_at is null; get diagnostics v_count=row_count; return jsonb_build_object('ok',true,'count',v_count); end $$;
create or replace function public.ms_delete_private_message(p_message_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$ declare v_me uuid:=auth.uid(); begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; update public.ms_private_messages set deleted_by_sender=case when from_user_id=v_me then true else deleted_by_sender end,deleted_by_recipient=case when to_user_id=v_me then true else deleted_by_recipient end,updated_at=now() where id=p_message_id and(from_user_id=v_me or to_user_id=v_me); delete from public.ms_private_messages where id=p_message_id and deleted_by_sender and deleted_by_recipient; return jsonb_build_object('ok',true,'id',p_message_id::text); end $$;

create or replace function public.ms_get_nearby_settings() returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_me uuid:=auth.uid();v public.ms_nearby_settings; begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; select * into v from public.ms_nearby_settings where user_id=v_me; if not found then return jsonb_build_object('visible',false,'radiusKm',10,'sports',jsonb_build_array(),'availableNow',false,'lookingForGame',false,'preferredModes',jsonb_build_array(),'hasLocation',false); end if; return jsonb_build_object('visible',v.visible,'radiusKm',v.radius_km,'sports',to_jsonb(v.sports),'skillLevel',v.skill_level,'availableNow',(v.available_now and coalesce(v.available_until,now())>now()),'lookingForGame',(v.looking_for_game and coalesce(v.looking_until,now())>now()),'preferredModes',to_jsonb(v.preferred_modes),'areaLabel',v.area_label,'updatedAt',v.updated_at,'hasLocation',v.location is not null); end $$;

create or replace function public.ms_set_nearby_settings(p_latitude double precision default null,p_longitude double precision default null,p_visible boolean default false,p_radius_km integer default 10,p_sports text[] default '{}'::text[],p_skill_level numeric default null,p_available_now boolean default false,p_looking_for_game boolean default false,p_preferred_modes text[] default '{}'::text[],p_area_label text default null,p_display_name text default null,p_avatar_url text default null,p_country_code text default null)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_me uuid:=auth.uid();v_location extensions.geography(Point,4326);v_existing extensions.geography(Point,4326);v public.ms_nearby_settings;v_name text;
begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
 if (p_latitude is null) <> (p_longitude is null) then raise exception 'LAT_LON_REQUIRED_TOGETHER'; end if;
 if p_latitude is not null and(p_latitude< -90 or p_latitude>90) then raise exception 'INVALID_LATITUDE'; end if; if p_longitude is not null and(p_longitude< -180 or p_longitude>180) then raise exception 'INVALID_LONGITUDE'; end if;
 select location into v_existing from public.ms_nearby_settings where user_id=v_me; if p_latitude is not null then v_location:=extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography; else v_location:=v_existing; end if; if p_visible and v_location is null then raise exception 'LOCATION_REQUIRED'; end if;
 select coalesce(nullif(trim(p_display_name),''),nullif(trim(raw_user_meta_data->>'nickname'),''),nullif(split_part(email,'@',1),''),'Joueur') into v_name from auth.users where id=v_me;
 insert into public.ms_nearby_settings(user_id,visible,location,location_updated_at,radius_km,sports,skill_level,available_now,available_until,looking_for_game,looking_until,preferred_modes,area_label,display_name,avatar_url,country_code,updated_at)
 values(v_me,p_visible,v_location,case when p_latitude is not null then now() else null end,greatest(1,least(coalesce(p_radius_km,10),100)),coalesce(p_sports,'{}'::text[]),p_skill_level,p_available_now,case when p_available_now then now()+interval '6 hours' else null end,p_looking_for_game,case when p_looking_for_game then now()+interval '24 hours' else null end,coalesce(p_preferred_modes,'{}'::text[]),nullif(trim(p_area_label),''),coalesce(v_name,'Joueur'),p_avatar_url,upper(nullif(trim(p_country_code),'')),now())
 on conflict(user_id) do update set visible=excluded.visible,location=coalesce(excluded.location,ms_nearby_settings.location),location_updated_at=case when p_latitude is not null then now() else ms_nearby_settings.location_updated_at end,radius_km=excluded.radius_km,sports=excluded.sports,skill_level=excluded.skill_level,available_now=excluded.available_now,available_until=excluded.available_until,looking_for_game=excluded.looking_for_game,looking_until=excluded.looking_until,preferred_modes=excluded.preferred_modes,area_label=coalesce(excluded.area_label,ms_nearby_settings.area_label),display_name=excluded.display_name,avatar_url=coalesce(excluded.avatar_url,ms_nearby_settings.avatar_url),country_code=coalesce(excluded.country_code,ms_nearby_settings.country_code),updated_at=now() returning * into v;
 perform public.ms_touch_public_profile(v.display_name,v.avatar_url,v.country_code,v.area_label); return public.ms_get_nearby_settings(); end $$;

create or replace function public.ms_find_nearby_players(p_radius_km integer default 10,p_sport text default null,p_available_only boolean default false,p_looking_only boolean default false,p_limit integer default 100)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
 with origin as(select location g from public.ms_nearby_settings where user_id=auth.uid() and location is not null and location_updated_at>now()-interval '7 days' limit 1),
 candidates as(select n.*,extensions.ST_Distance(n.location,o.g)/1000.0 real_km from public.ms_nearby_settings n cross join origin o where auth.uid() is not null and n.user_id<>auth.uid() and n.visible=true and n.location is not null and n.location_updated_at>now()-interval '7 days' and extensions.ST_DWithin(n.location,o.g,least(greatest(1,least(coalesce(p_radius_km,10),100)),n.radius_km)*1000.0) and(nullif(trim(coalesce(p_sport,'')),'') is null or lower(trim(p_sport))=any(select lower(x) from unnest(n.sports)x)) and(not coalesce(p_available_only,false) or(n.available_now and n.available_until>now())) and(not coalesce(p_looking_only,false) or(n.looking_for_game and n.looking_until>now())))
 select jsonb_build_object('userId',c.user_id::text,'displayName',c.display_name,'avatarUrl',c.avatar_url,'countryCode',c.country_code,'cityLabel',c.area_label,
 'distanceKm',case when c.real_km<2 then 2 when c.real_km<5 then 5 when c.real_km<10 then 10 when c.real_km<25 then 25 when c.real_km<50 then 50 else 100 end,
 'distanceLabel',case when c.real_km<2 then 'Moins de 2 km' when c.real_km<5 then 'À environ 5 km' when c.real_km<10 then 'À environ 10 km' when c.real_km<25 then 'À environ 25 km' when c.real_km<50 then 'À environ 50 km' else 'À proximité' end,
 'sports',to_jsonb(c.sports),'skillLevel',c.skill_level,'availableNow',(c.available_now and c.available_until>now()),'lookingForGame',(c.looking_for_game and c.looking_until>now()),'preferredModes',to_jsonb(c.preferred_modes),'updatedAt',c.updated_at)
 from candidates c order by c.real_km asc limit greatest(1,least(coalesce(p_limit,100),200)); $$;

create or replace function public.ms_send_nearby_game_request(p_to_user_id uuid,p_sport text,p_modes text[] default '{}'::text[],p_message text default null) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$ declare v_me uuid:=auth.uid();v public.ms_nearby_game_requests; begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; if p_to_user_id is null or p_to_user_id=v_me then raise exception 'INVALID_TARGET'; end if; insert into public.ms_nearby_game_requests(from_user_id,to_user_id,sport,modes,message,status,expires_at) values(v_me,p_to_user_id,lower(coalesce(nullif(trim(p_sport),''),'generic')),coalesce(p_modes,'{}'::text[]),nullif(trim(p_message),''),'pending',now()+interval '24 hours') returning * into v; return jsonb_build_object('id',v.id::text,'status',v.status,'createdAt',v.created_at,'expiresAt',v.expires_at); end $$;
create or replace function public.ms_list_nearby_game_requests() returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$ select jsonb_build_object('id',r.id::text,'fromUserId',r.from_user_id::text,'toUserId',r.to_user_id::text,'fromDisplayName',coalesce(fp.display_name,'Joueur'),'toDisplayName',coalesce(tp.display_name,'Joueur'),'sport',r.sport,'modes',to_jsonb(r.modes),'message',r.message,'status',case when r.status='pending' and r.expires_at<now() then 'expired' else r.status end,'direction',case when r.to_user_id=auth.uid() then 'incoming' else 'outgoing' end,'createdAt',r.created_at,'expiresAt',r.expires_at) from public.ms_nearby_game_requests r left join public.ms_public_profiles fp on fp.user_id=r.from_user_id left join public.ms_public_profiles tp on tp.user_id=r.to_user_id where auth.uid() is not null and(r.from_user_id=auth.uid() or r.to_user_id=auth.uid()) and r.created_at>now()-interval '30 days' order by r.created_at desc; $$;
create or replace function public.ms_respond_nearby_game_request(p_request_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$ declare v_me uuid:=auth.uid();v_status text:=lower(trim(p_status));v public.ms_nearby_game_requests; begin if v_me is null then raise exception 'AUTH_REQUIRED'; end if; if v_status not in('accepted','rejected','cancelled') then raise exception 'INVALID_STATUS'; end if; if v_status='cancelled' then update public.ms_nearby_game_requests set status='cancelled',responded_at=now(),updated_at=now() where id=p_request_id and from_user_id=v_me and status='pending' returning * into v; else update public.ms_nearby_game_requests set status=v_status,responded_at=now(),updated_at=now() where id=p_request_id and to_user_id=v_me and status='pending' and expires_at>now() returning * into v; end if; if not found then raise exception 'REQUEST_NOT_FOUND'; end if; return jsonb_build_object('ok',true,'id',v.id::text,'status',v.status,'respondedAt',v.responded_at); end $$;

-- Fermeture de l'accès RPC à anon/public, ouverture aux utilisateurs authentifiés.
revoke all on function public.ms_touch_public_profile(text,text,text,text) from public;
revoke all on function public.ms_update_presence(text) from public;
revoke all on function public.ms_search_players(text,integer) from public;
revoke all on function public.ms_send_friend_request(uuid,text) from public;
revoke all on function public.ms_list_friend_requests() from public;
revoke all on function public.ms_respond_friend_request(uuid,text) from public;
revoke all on function public.ms_list_friends() from public;
revoke all on function public.ms_remove_friend(uuid) from public;
revoke all on function public.ms_list_private_messages(integer) from public;
revoke all on function public.ms_send_private_message(uuid,text,jsonb) from public;
revoke all on function public.ms_edit_private_message(uuid,text) from public;
revoke all on function public.ms_mark_private_message_read(uuid) from public;
revoke all on function public.ms_mark_private_thread_read(uuid) from public;
revoke all on function public.ms_delete_private_message(uuid) from public;
revoke all on function public.ms_get_nearby_settings() from public;
revoke all on function public.ms_set_nearby_settings(double precision,double precision,boolean,integer,text[],numeric,boolean,boolean,text[],text,text,text,text) from public;
revoke all on function public.ms_find_nearby_players(integer,text,boolean,boolean,integer) from public;
revoke all on function public.ms_send_nearby_game_request(uuid,text,text[],text) from public;
revoke all on function public.ms_list_nearby_game_requests() from public;
revoke all on function public.ms_respond_nearby_game_request(uuid,text) from public;

grant execute on function public.ms_touch_public_profile(text,text,text,text) to authenticated;
grant execute on function public.ms_update_presence(text) to authenticated;
grant execute on function public.ms_search_players(text,integer) to authenticated;
grant execute on function public.ms_send_friend_request(uuid,text) to authenticated;
grant execute on function public.ms_list_friend_requests() to authenticated;
grant execute on function public.ms_respond_friend_request(uuid,text) to authenticated;
grant execute on function public.ms_list_friends() to authenticated;
grant execute on function public.ms_remove_friend(uuid) to authenticated;
grant execute on function public.ms_list_private_messages(integer) to authenticated;
grant execute on function public.ms_send_private_message(uuid,text,jsonb) to authenticated;
grant execute on function public.ms_edit_private_message(uuid,text) to authenticated;
grant execute on function public.ms_mark_private_message_read(uuid) to authenticated;
grant execute on function public.ms_mark_private_thread_read(uuid) to authenticated;
grant execute on function public.ms_delete_private_message(uuid) to authenticated;
grant execute on function public.ms_get_nearby_settings() to authenticated;
grant execute on function public.ms_set_nearby_settings(double precision,double precision,boolean,integer,text[],numeric,boolean,boolean,text[],text,text,text,text) to authenticated;
grant execute on function public.ms_find_nearby_players(integer,text,boolean,boolean,integer) to authenticated;
grant execute on function public.ms_send_nearby_game_request(uuid,text,text[],text) to authenticated;
grant execute on function public.ms_list_nearby_game_requests() to authenticated;
grant execute on function public.ms_respond_nearby_game_request(uuid,text) to authenticated;


-- ============================================================
-- 02/12  20260730_nearby_map_encounters_places.sql
-- ============================================================
-- MULTISPORTS SCORING — CARTE LOCALE / JOUEURS CROISÉS / CLUBS / TOURNOIS
-- Migration complémentaire à 20260727_public_online_nearby.sql
-- Les coordonnées joueurs restent privées : seules des coordonnées arrondies
-- sur une grille d'environ 2 km sont renvoyées à la carte.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

-- ============================================================
-- JOUEURS CROISÉS — aucun trajet, aucune coordonnée conservée
-- ============================================================
create table if not exists public.ms_nearby_encounters (
  id uuid primary key default extensions.gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  first_crossed_at timestamptz not null default now(),
  last_crossed_at timestamptz not null default now(),
  crossed_count integer not null default 1 check (crossed_count > 0),
  closest_distance_km integer not null default 100,
  sports text[] not null default '{}'::text[],
  area_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a_id <> user_b_id),
  unique (user_a_id, user_b_id)
);
create index if not exists ms_nearby_encounters_user_a_idx on public.ms_nearby_encounters(user_a_id,last_crossed_at desc);
create index if not exists ms_nearby_encounters_user_b_idx on public.ms_nearby_encounters(user_b_id,last_crossed_at desc);
alter table public.ms_nearby_encounters enable row level security;

-- ============================================================
-- POINTS LOCAUX — clubs, équipes, tournois et lieux de pratique
-- ============================================================
create table if not exists public.ms_nearby_places (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('club','team','tournament','venue')),
  title text not null,
  description text,
  sport text not null default 'generic',
  location extensions.geography(Point,4326) not null,
  area_label text,
  precise_location boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  visibility text not null default 'public' check (visibility in ('public','friends','private')),
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_nearby_places_location_gix on public.ms_nearby_places using gist(location);
create index if not exists ms_nearby_places_kind_sport_idx on public.ms_nearby_places(kind,sport,starts_at);
create index if not exists ms_nearby_places_owner_idx on public.ms_nearby_places(owner_user_id,created_at desc);
alter table public.ms_nearby_places enable row level security;

drop policy if exists ms_nearby_places_owner_select on public.ms_nearby_places;
create policy ms_nearby_places_owner_select on public.ms_nearby_places for select to authenticated using (owner_user_id=auth.uid());
drop policy if exists ms_nearby_places_owner_insert on public.ms_nearby_places;
create policy ms_nearby_places_owner_insert on public.ms_nearby_places for insert to authenticated with check (owner_user_id=auth.uid());
drop policy if exists ms_nearby_places_owner_update on public.ms_nearby_places;
create policy ms_nearby_places_owner_update on public.ms_nearby_places for update to authenticated using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());
drop policy if exists ms_nearby_places_owner_delete on public.ms_nearby_places;
create policy ms_nearby_places_owner_delete on public.ms_nearby_places for delete to authenticated using (owner_user_id=auth.uid());

create or replace function public.ms_nearby_distance_bucket(p_real_km double precision)
returns integer language sql immutable set search_path=public,auth,extensions as $$
  select case
    when p_real_km < 2 then 2
    when p_real_km < 5 then 5
    when p_real_km < 10 then 10
    when p_real_km < 25 then 25
    when p_real_km < 50 then 50
    else 100
  end;
$$;

create or replace function public.ms_nearby_distance_label(p_bucket integer)
returns text language sql immutable set search_path=public,auth,extensions as $$
  select case p_bucket
    when 2 then 'Moins de 2 km'
    when 5 then 'À environ 5 km'
    when 10 then 'À environ 10 km'
    when 25 then 'À environ 25 km'
    when 50 then 'À environ 50 km'
    else 'À proximité'
  end;
$$;

-- Recherche V2 : même signature que la V1, mais ajoute une ancre cartographique
-- arrondie et journalise un croisement anonymisé.
create or replace function public.ms_find_nearby_players(
  p_radius_km integer default 10,
  p_sport text default null,
  p_available_only boolean default false,
  p_looking_only boolean default false,
  p_limit integer default 100
)
returns setof jsonb
language sql
volatile
security definer
set search_path=public,auth,extensions
as $$
  with origin as (
    select location as origin_location
    from public.ms_nearby_settings
    where user_id=auth.uid()
      and location is not null
      and location_updated_at>now()-interval '7 days'
    limit 1
  ),
  candidates as (
    select
      n.*,
      o.origin_location,
      extensions.ST_Distance(n.location,o.origin_location)/1000.0 as real_km,
      public.ms_nearby_distance_bucket(extensions.ST_Distance(n.location,o.origin_location)/1000.0) as distance_bucket
    from public.ms_nearby_settings n
    cross join origin o
    where auth.uid() is not null
      and n.user_id<>auth.uid()
      and n.visible=true
      and n.location is not null
      and n.location_updated_at>now()-interval '7 days'
      and extensions.ST_DWithin(
        n.location,
        o.origin_location,
        least(greatest(1,least(coalesce(p_radius_km,10),100)),n.radius_km)*1000.0
      )
      and (
        nullif(trim(coalesce(p_sport,'')),'') is null
        or lower(trim(p_sport))=any(select lower(x) from unnest(n.sports)x)
      )
      and (not coalesce(p_available_only,false) or (n.available_now and n.available_until>now()))
      and (not coalesce(p_looking_only,false) or (n.looking_for_game and n.looking_until>now()))
    order by real_km asc
    limit greatest(1,least(coalesce(p_limit,100),200))
  ),
  logged as (
    insert into public.ms_nearby_encounters(
      user_a_id,user_b_id,first_crossed_at,last_crossed_at,crossed_count,
      closest_distance_km,sports,area_label,updated_at
    )
    select
      case when auth.uid()::text<c.user_id::text then auth.uid() else c.user_id end,
      case when auth.uid()::text<c.user_id::text then c.user_id else auth.uid() end,
      now(),now(),1,c.distance_bucket,
      case when nullif(trim(coalesce(p_sport,'')),'') is null then c.sports else array[lower(trim(p_sport))] end,
      c.area_label,now()
    from candidates c
    on conflict(user_a_id,user_b_id) do update set
      last_crossed_at=now(),
      crossed_count=public.ms_nearby_encounters.crossed_count +
        case when public.ms_nearby_encounters.last_crossed_at<now()-interval '30 minutes' then 1 else 0 end,
      closest_distance_km=least(public.ms_nearby_encounters.closest_distance_km,excluded.closest_distance_km),
      sports=excluded.sports,
      area_label=coalesce(excluded.area_label,public.ms_nearby_encounters.area_label),
      updated_at=now()
    returning user_a_id,user_b_id
  )
  select jsonb_build_object(
    'userId',c.user_id::text,
    'displayName',c.display_name,
    'avatarUrl',c.avatar_url,
    'countryCode',c.country_code,
    'cityLabel',c.area_label,
    'distanceKm',c.distance_bucket,
    'distanceLabel',public.ms_nearby_distance_label(c.distance_bucket),
    'sports',to_jsonb(c.sports),
    'skillLevel',c.skill_level,
    'availableNow',(c.available_now and c.available_until>now()),
    'lookingForGame',(c.looking_for_game and c.looking_until>now()),
    'preferredModes',to_jsonb(c.preferred_modes),
    'updatedAt',c.updated_at,
    -- Grille d'environ 2 km : impossible d'en déduire l'adresse exacte.
    'mapLat',(round((extensions.ST_Y(c.location::geometry)::numeric)/0.02)*0.02)::double precision,
    'mapLng',(round((extensions.ST_X(c.location::geometry)::numeric)/0.02)*0.02)::double precision,
    'bearingDeg',mod(round(degrees(extensions.ST_Azimuth(c.origin_location::geometry,c.location::geometry))/45.0)*45,360)
  )
  from candidates c;
$$;

create or replace function public.ms_list_nearby_encounters(p_limit integer default 100)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with mine as (
    select
      e.*,
      case when e.user_a_id=auth.uid() then e.user_b_id else e.user_a_id end as other_user_id
    from public.ms_nearby_encounters e
    where auth.uid() is not null
      and (e.user_a_id=auth.uid() or e.user_b_id=auth.uid())
      and e.last_crossed_at>now()-interval '90 days'
    order by e.last_crossed_at desc
    limit greatest(1,least(coalesce(p_limit,100),200))
  )
  select jsonb_build_object(
    'userId',m.other_user_id::text,
    'displayName',coalesce(p.display_name,n.display_name,'Joueur'),
    'avatarUrl',coalesce(p.avatar_url,n.avatar_url),
    'countryCode',coalesce(p.country_code,n.country_code),
    'cityLabel',coalesce(p.city_label,n.area_label,m.area_label),
    'sports',to_jsonb(case when cardinality(m.sports)>0 then m.sports else coalesce(n.sports,'{}'::text[]) end),
    'skillLevel',n.skill_level,
    'crossedCount',m.crossed_count,
    'closestDistanceKm',m.closest_distance_km,
    'distanceLabel',public.ms_nearby_distance_label(m.closest_distance_km),
    'firstCrossedAt',m.first_crossed_at,
    'lastCrossedAt',m.last_crossed_at,
    'availableNow',(coalesce(n.available_now,false) and n.available_until>now()),
    'lookingForGame',(coalesce(n.looking_for_game,false) and n.looking_until>now())
  )
  from mine m
  left join public.ms_public_profiles p on p.user_id=m.other_user_id
  left join public.ms_nearby_settings n on n.user_id=m.other_user_id;
$$;

create or replace function public.ms_clear_nearby_encounters()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare v_uid uuid:=auth.uid(); v_deleted integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.ms_nearby_encounters where user_a_id=v_uid or user_b_id=v_uid;
  get diagnostics v_deleted=row_count;
  return jsonb_build_object('ok',true,'deleted',v_deleted);
end $$;

create or replace function public.ms_publish_nearby_place(
  p_kind text,
  p_title text,
  p_description text default null,
  p_sport text default 'generic',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_area_label text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_precise_location boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_kind text:=lower(trim(coalesce(p_kind,'')));
  v public.ms_nearby_places;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_kind not in ('club','team','tournament','venue') then raise exception 'INVALID_KIND'; end if;
  if length(trim(coalesce(p_title,'')))<2 then raise exception 'TITLE_REQUIRED'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'INVALID_LOCATION'; end if;

  insert into public.ms_nearby_places(
    owner_user_id,kind,title,description,sport,location,area_label,precise_location,
    starts_at,ends_at,visibility,metadata,expires_at
  ) values (
    v_uid,v_kind,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
    lower(coalesce(nullif(trim(p_sport),''),'generic')),
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography,
    nullif(trim(coalesce(p_area_label,'')),''),coalesce(p_precise_location,false),
    p_starts_at,p_ends_at,'public',coalesce(p_metadata,'{}'::jsonb),
    case when v_kind='tournament' then coalesce(p_ends_at,p_starts_at,now()+interval '30 days')+interval '7 days' else null end
  ) returning * into v;

  return jsonb_build_object(
    'id',v.id::text,'ownerUserId',v.owner_user_id::text,'kind',v.kind,'title',v.title,
    'description',v.description,'sport',v.sport,'areaLabel',v.area_label,
    'distanceKm',0,'distanceLabel','Publié ici','mapLat',p_latitude,'mapLng',p_longitude,
    'startsAt',v.starts_at,'endsAt',v.ends_at,'preciseLocation',v.precise_location,
    'metadata',v.metadata,'isOwner',true,'createdAt',v.created_at
  );
end $$;

create or replace function public.ms_find_nearby_places(
  p_radius_km integer default 10,
  p_sport text default null,
  p_kinds text[] default '{}'::text[],
  p_limit integer default 100
)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with origin as (
    select location as origin_location
    from public.ms_nearby_settings
    where user_id=auth.uid()
      and location is not null
      and location_updated_at>now()-interval '7 days'
    limit 1
  ),
  candidates as (
    select p.*,o.origin_location,
      extensions.ST_Distance(p.location,o.origin_location)/1000.0 as real_km
    from public.ms_nearby_places p
    cross join origin o
    where auth.uid() is not null
      and p.visibility='public'
      and (p.expires_at is null or p.expires_at>now())
      and extensions.ST_DWithin(p.location,o.origin_location,greatest(1,least(coalesce(p_radius_km,10),100))*1000.0)
      and (nullif(trim(coalesce(p_sport,'')),'') is null or lower(p.sport)=lower(trim(p_sport)))
      and (coalesce(cardinality(p_kinds),0)=0 or p.kind=any(p_kinds))
    order by real_km asc,coalesce(p.starts_at,p.created_at) asc
    limit greatest(1,least(coalesce(p_limit,100),200))
  )
  select jsonb_build_object(
    'id',c.id::text,'ownerUserId',c.owner_user_id::text,'kind',c.kind,'title',c.title,
    'description',c.description,'sport',c.sport,'areaLabel',c.area_label,
    'distanceKm',public.ms_nearby_distance_bucket(c.real_km),
    'distanceLabel',public.ms_nearby_distance_label(public.ms_nearby_distance_bucket(c.real_km)),
    'mapLat',case when c.precise_location then extensions.ST_Y(c.location::geometry) else (round((extensions.ST_Y(c.location::geometry)::numeric)/0.02)*0.02)::double precision end,
    'mapLng',case when c.precise_location then extensions.ST_X(c.location::geometry) else (round((extensions.ST_X(c.location::geometry)::numeric)/0.02)*0.02)::double precision end,
    'startsAt',c.starts_at,'endsAt',c.ends_at,'preciseLocation',c.precise_location,
    'metadata',c.metadata,'isOwner',(c.owner_user_id=auth.uid()),'createdAt',c.created_at
  ) from candidates c;
$$;

create or replace function public.ms_delete_nearby_place(p_place_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare v_uid uuid:=auth.uid(); v_deleted integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.ms_nearby_places where id=p_place_id and owner_user_id=v_uid;
  get diagnostics v_deleted=row_count;
  if v_deleted=0 then raise exception 'PLACE_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',p_place_id::text);
end $$;

revoke all on function public.ms_nearby_distance_bucket(double precision) from public;
revoke all on function public.ms_nearby_distance_label(integer) from public;
revoke all on function public.ms_list_nearby_encounters(integer) from public;
revoke all on function public.ms_clear_nearby_encounters() from public;
revoke all on function public.ms_publish_nearby_place(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb) from public;
revoke all on function public.ms_find_nearby_places(integer,text,text[],integer) from public;
revoke all on function public.ms_delete_nearby_place(uuid) from public;

grant execute on function public.ms_find_nearby_players(integer,text,boolean,boolean,integer) to authenticated;
grant execute on function public.ms_list_nearby_encounters(integer) to authenticated;
grant execute on function public.ms_clear_nearby_encounters() to authenticated;
grant execute on function public.ms_publish_nearby_place(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb) to authenticated;
grant execute on function public.ms_find_nearby_places(integer,text,text[],integer) to authenticated;
grant execute on function public.ms_delete_nearby_place(uuid) to authenticated;


-- ============================================================
-- 03/12  20260730_nearby_map_participation_v2.sql
-- ============================================================
-- MULTISPORTS SCORING — CARTE LOCALE V2
-- Inscriptions / adhésions / défis / contacts pour clubs, équipes,
-- tournois et lieux de pratique. Migration complémentaire à
-- 20260730_nearby_map_encounters_places.sql.

create extension if not exists pgcrypto with schema extensions;

alter table public.ms_nearby_places
  add column if not exists max_participants integer,
  add column if not exists min_skill_level smallint,
  add column if not exists max_skill_level smallint,
  add column if not exists cover_url text,
  add column if not exists organizer_label text;

alter table public.ms_nearby_places
  drop constraint if exists ms_nearby_places_max_participants_check;
alter table public.ms_nearby_places
  add constraint ms_nearby_places_max_participants_check
  check (max_participants is null or max_participants between 2 and 10000);

alter table public.ms_nearby_places
  drop constraint if exists ms_nearby_places_skill_range_check;
alter table public.ms_nearby_places
  add constraint ms_nearby_places_skill_range_check
  check (
    (min_skill_level is null or min_skill_level between 1 and 5)
    and (max_skill_level is null or max_skill_level between 1 and 5)
    and (min_skill_level is null or max_skill_level is null or min_skill_level <= max_skill_level)
  );

create table if not exists public.ms_nearby_place_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  place_id uuid not null references public.ms_nearby_places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('join','participate','challenge','contact')),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  message text,
  party_size integer not null default 1 check (party_size between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (place_id,user_id)
);

create index if not exists ms_nearby_place_requests_place_status_idx
  on public.ms_nearby_place_requests(place_id,status,created_at desc);
create index if not exists ms_nearby_place_requests_user_status_idx
  on public.ms_nearby_place_requests(user_id,status,created_at desc);

alter table public.ms_nearby_place_requests enable row level security;

drop policy if exists ms_nearby_place_requests_requester_select on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_requester_select
  on public.ms_nearby_place_requests for select to authenticated
  using (user_id=auth.uid());

drop policy if exists ms_nearby_place_requests_owner_select on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_owner_select
  on public.ms_nearby_place_requests for select to authenticated
  using (exists (
    select 1 from public.ms_nearby_places p
    where p.id=place_id and p.owner_user_id=auth.uid()
  ));

drop policy if exists ms_nearby_place_requests_requester_insert on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_requester_insert
  on public.ms_nearby_place_requests for insert to authenticated
  with check (user_id=auth.uid());

drop policy if exists ms_nearby_place_requests_requester_update on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_requester_update
  on public.ms_nearby_place_requests for update to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());

create or replace function public.ms_publish_nearby_place_v2(
  p_kind text,
  p_title text,
  p_description text default null,
  p_sport text default 'generic',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_area_label text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_precise_location boolean default false,
  p_metadata jsonb default '{}'::jsonb,
  p_max_participants integer default null,
  p_min_skill_level integer default null,
  p_max_skill_level integer default null,
  p_cover_url text default null,
  p_organizer_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_kind text:=lower(trim(coalesce(p_kind,'')));
  v public.ms_nearby_places;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_kind not in ('club','team','tournament','venue') then raise exception 'INVALID_KIND'; end if;
  if length(trim(coalesce(p_title,'')))<2 then raise exception 'TITLE_REQUIRED'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'INVALID_LOCATION'; end if;
  if p_max_participants is not null and (p_max_participants<2 or p_max_participants>10000) then raise exception 'INVALID_CAPACITY'; end if;
  if p_min_skill_level is not null and p_min_skill_level not between 1 and 5 then raise exception 'INVALID_MIN_SKILL'; end if;
  if p_max_skill_level is not null and p_max_skill_level not between 1 and 5 then raise exception 'INVALID_MAX_SKILL'; end if;
  if p_min_skill_level is not null and p_max_skill_level is not null and p_min_skill_level>p_max_skill_level then raise exception 'INVALID_SKILL_RANGE'; end if;

  insert into public.ms_nearby_places(
    owner_user_id,kind,title,description,sport,location,area_label,precise_location,
    starts_at,ends_at,visibility,metadata,expires_at,max_participants,
    min_skill_level,max_skill_level,cover_url,organizer_label
  ) values (
    v_uid,v_kind,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
    lower(coalesce(nullif(trim(p_sport),''),'generic')),
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography,
    nullif(trim(coalesce(p_area_label,'')),''),coalesce(p_precise_location,false),
    p_starts_at,p_ends_at,'public',coalesce(p_metadata,'{}'::jsonb),
    case when v_kind='tournament' then coalesce(p_ends_at,p_starts_at,now()+interval '30 days')+interval '7 days' else null end,
    p_max_participants,p_min_skill_level,p_max_skill_level,
    nullif(trim(coalesce(p_cover_url,'')),''),
    nullif(trim(coalesce(p_organizer_label,'')),'')
  ) returning * into v;

  return jsonb_build_object(
    'id',v.id::text,'ownerUserId',v.owner_user_id::text,'kind',v.kind,'title',v.title,
    'description',v.description,'sport',v.sport,'areaLabel',v.area_label,
    'distanceKm',0,'distanceLabel','Publié ici','mapLat',p_latitude,'mapLng',p_longitude,
    'startsAt',v.starts_at,'endsAt',v.ends_at,'preciseLocation',v.precise_location,
    'metadata',v.metadata,'isOwner',true,'createdAt',v.created_at,
    'maxParticipants',v.max_participants,'acceptedCount',0,
    'minSkillLevel',v.min_skill_level,'maxSkillLevel',v.max_skill_level,
    'coverUrl',v.cover_url,'organizerLabel',v.organizer_label,'myRequestStatus',null
  );
end $$;

create or replace function public.ms_send_nearby_place_request(
  p_place_id uuid,
  p_request_type text,
  p_message text default null,
  p_party_size integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_type text:=lower(trim(coalesce(p_request_type,'')));
  v_place public.ms_nearby_places;
  v public.ms_nearby_place_requests;
  v_accepted integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_type not in ('join','participate','challenge','contact') then raise exception 'INVALID_REQUEST_TYPE'; end if;
  if p_party_size<1 or p_party_size>50 then raise exception 'INVALID_PARTY_SIZE'; end if;

  select * into v_place from public.ms_nearby_places
  where id=p_place_id and visibility='public' and (expires_at is null or expires_at>now());
  if not found then raise exception 'PLACE_NOT_FOUND'; end if;
  if v_place.owner_user_id=v_uid then raise exception 'OWNER_CANNOT_REQUEST'; end if;

  if v_place.max_participants is not null and v_type in ('join','participate') then
    select coalesce(sum(party_size),0)::integer into v_accepted
    from public.ms_nearby_place_requests
    where place_id=p_place_id and status='accepted';
    if v_accepted+p_party_size>v_place.max_participants then raise exception 'PLACE_FULL'; end if;
  end if;

  insert into public.ms_nearby_place_requests(place_id,user_id,request_type,status,message,party_size,created_at,updated_at)
  values(p_place_id,v_uid,v_type,'pending',nullif(trim(coalesce(p_message,'')),''),p_party_size,now(),now())
  on conflict(place_id,user_id) do update set
    request_type=excluded.request_type,
    status=case when public.ms_nearby_place_requests.status='accepted' then 'accepted' else 'pending' end,
    message=excluded.message,
    party_size=excluded.party_size,
    responded_at=case when public.ms_nearby_place_requests.status='accepted' then public.ms_nearby_place_requests.responded_at else null end,
    updated_at=now()
  returning * into v;

  return jsonb_build_object(
    'id',v.id::text,'placeId',v.place_id::text,'userId',v.user_id::text,
    'requestType',v.request_type,'status',v.status,'message',v.message,
    'partySize',v.party_size,'createdAt',v.created_at,'updatedAt',v.updated_at
  );
end $$;

create or replace function public.ms_list_nearby_place_requests(p_limit integer default 100)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  select jsonb_build_object(
    'id',r.id::text,
    'placeId',r.place_id::text,
    'placeTitle',p.title,
    'placeKind',p.kind,
    'sport',p.sport,
    'userId',r.user_id::text,
    'userDisplayName',coalesce(up.display_name,'Joueur'),
    'userAvatarUrl',up.avatar_url,
    'ownerUserId',p.owner_user_id::text,
    'ownerDisplayName',coalesce(op.display_name,p.organizer_label,'Organisateur'),
    'requestType',r.request_type,
    'status',r.status,
    'message',r.message,
    'partySize',r.party_size,
    'direction',case when p.owner_user_id=auth.uid() then 'incoming' else 'outgoing' end,
    'createdAt',r.created_at,
    'updatedAt',r.updated_at,
    'respondedAt',r.responded_at
  )
  from public.ms_nearby_place_requests r
  join public.ms_nearby_places p on p.id=r.place_id
  left join public.ms_public_profiles up on up.user_id=r.user_id
  left join public.ms_public_profiles op on op.user_id=p.owner_user_id
  where auth.uid() is not null
    and (r.user_id=auth.uid() or p.owner_user_id=auth.uid())
  order by case when r.status='pending' then 0 else 1 end,r.updated_at desc
  limit greatest(1,least(coalesce(p_limit,100),200));
$$;

create or replace function public.ms_respond_nearby_place_request(
  p_request_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_status text:=lower(trim(coalesce(p_status,'')));
  v public.ms_nearby_place_requests;
  v_max integer;
  v_used integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_status not in ('accepted','rejected') then raise exception 'INVALID_STATUS'; end if;

  select r.* into v
  from public.ms_nearby_place_requests r
  join public.ms_nearby_places p on p.id=r.place_id
  where r.id=p_request_id and p.owner_user_id=v_uid and r.status='pending'
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;

  if v_status='accepted' then
    select p.max_participants into v_max from public.ms_nearby_places p where p.id=v.place_id;
    if v_max is not null and v.request_type in ('join','participate') then
      select coalesce(sum(party_size),0)::integer into v_used
      from public.ms_nearby_place_requests
      where place_id=v.place_id and status='accepted' and id<>v.id;
      if v_used+v.party_size>v_max then raise exception 'PLACE_FULL'; end if;
    end if;
  end if;

  update public.ms_nearby_place_requests
  set status=v_status,responded_at=now(),updated_at=now()
  where id=v.id
  returning * into v;

  return jsonb_build_object('ok',true,'id',v.id::text,'status',v.status,'placeId',v.place_id::text);
end $$;

create or replace function public.ms_cancel_nearby_place_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare v_uid uuid:=auth.uid(); v public.ms_nearby_place_requests;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.ms_nearby_place_requests
  set status='cancelled',updated_at=now()
  where id=p_request_id and user_id=v_uid and status='pending'
  returning * into v;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',v.id::text,'status',v.status,'placeId',v.place_id::text);
end $$;

-- Enrichit les cartes locales avec capacité, niveau, organisateur et statut
-- d'inscription du membre connecté.
create or replace function public.ms_find_nearby_places(
  p_radius_km integer default 10,
  p_sport text default null,
  p_kinds text[] default '{}'::text[],
  p_limit integer default 100
)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with origin as (
    select location as origin_location
    from public.ms_nearby_settings
    where user_id=auth.uid() and location is not null
      and location_updated_at>now()-interval '7 days'
    limit 1
  ),
  candidates as (
    select p.*,o.origin_location,
      extensions.ST_Distance(p.location,o.origin_location)/1000.0 as real_km
    from public.ms_nearby_places p
    cross join origin o
    where auth.uid() is not null
      and p.visibility='public'
      and (p.expires_at is null or p.expires_at>now())
      and extensions.ST_DWithin(p.location,o.origin_location,greatest(1,least(coalesce(p_radius_km,10),100))*1000.0)
      and (nullif(trim(coalesce(p_sport,'')),'') is null or lower(p.sport)=lower(trim(p_sport)))
      and (coalesce(cardinality(p_kinds),0)=0 or p.kind=any(p_kinds))
    order by real_km asc,coalesce(p.starts_at,p.created_at) asc
    limit greatest(1,least(coalesce(p_limit,100),200))
  )
  select jsonb_build_object(
    'id',c.id::text,'ownerUserId',c.owner_user_id::text,'kind',c.kind,'title',c.title,
    'description',c.description,'sport',c.sport,'areaLabel',c.area_label,
    'distanceKm',public.ms_nearby_distance_bucket(c.real_km),
    'distanceLabel',public.ms_nearby_distance_label(public.ms_nearby_distance_bucket(c.real_km)),
    'mapLat',case when c.precise_location then extensions.ST_Y(c.location::geometry) else (round((extensions.ST_Y(c.location::geometry)::numeric)/0.02)*0.02)::double precision end,
    'mapLng',case when c.precise_location then extensions.ST_X(c.location::geometry) else (round((extensions.ST_X(c.location::geometry)::numeric)/0.02)*0.02)::double precision end,
    'startsAt',c.starts_at,'endsAt',c.ends_at,'preciseLocation',c.precise_location,
    'metadata',c.metadata,'isOwner',(c.owner_user_id=auth.uid()),'createdAt',c.created_at,
    'maxParticipants',c.max_participants,
    'acceptedCount',coalesce(stats.accepted_count,0),
    'minSkillLevel',c.min_skill_level,'maxSkillLevel',c.max_skill_level,
    'coverUrl',c.cover_url,'organizerLabel',coalesce(c.organizer_label,owner.display_name),
    'ownerDisplayName',coalesce(owner.display_name,c.organizer_label,'Organisateur'),
    'ownerAvatarUrl',owner.avatar_url,
    'myRequestStatus',mine.status,
    'myRequestId',mine.id::text
  )
  from candidates c
  left join public.ms_public_profiles owner on owner.user_id=c.owner_user_id
  left join lateral (
    select coalesce(sum(r.party_size),0)::integer as accepted_count
    from public.ms_nearby_place_requests r
    where r.place_id=c.id and r.status='accepted'
  ) stats on true
  left join lateral (
    select r.id,r.status from public.ms_nearby_place_requests r
    where r.place_id=c.id and r.user_id=auth.uid()
    limit 1
  ) mine on true;
$$;

revoke all on table public.ms_nearby_place_requests from anon,authenticated;
revoke all on function public.ms_publish_nearby_place_v2(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb,integer,integer,integer,text,text) from public;
revoke all on function public.ms_send_nearby_place_request(uuid,text,text,integer) from public;
revoke all on function public.ms_list_nearby_place_requests(integer) from public;
revoke all on function public.ms_respond_nearby_place_request(uuid,text) from public;
revoke all on function public.ms_cancel_nearby_place_request(uuid) from public;

grant execute on function public.ms_publish_nearby_place_v2(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb,integer,integer,integer,text,text) to authenticated;
grant execute on function public.ms_send_nearby_place_request(uuid,text,text,integer) to authenticated;
grant execute on function public.ms_list_nearby_place_requests(integer) to authenticated;
grant execute on function public.ms_respond_nearby_place_request(uuid,text) to authenticated;
grant execute on function public.ms_cancel_nearby_place_request(uuid) to authenticated;
grant execute on function public.ms_find_nearby_places(integer,text,text[],integer) to authenticated;


-- ============================================================
-- 04/12  20260826_running_route_community_v1.sql
-- ============================================================
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


-- ============================================================
-- 05/12  20260826_running_route_community_v2.sql
-- ============================================================
-- MULTISPORTS SCORING — RUNNING PERFORMANCE route community V2
-- Reviews, perceived difficulty, live trail conditions, hazards, planned outings and user photos.
-- Requires the public profile/social base and running route community V1.

create table if not exists public.ms_running_route_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  rating smallint not null check (rating between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, route_key)
);
create index if not exists ms_running_route_reviews_route_idx on public.ms_running_route_reviews(route_key, updated_at desc);
alter table public.ms_running_route_reviews enable row level security;

create table if not exists public.ms_running_route_conditions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  kind text not null check (kind in ('good','dry','wet','muddy','snow','icy','blocked')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ms_running_route_conditions_route_idx on public.ms_running_route_conditions(route_key, created_at desc);
alter table public.ms_running_route_conditions enable row level security;

create table if not exists public.ms_running_route_hazards (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  kind text not null check (kind in ('obstacle','works','flood','danger','closure','other')),
  severity smallint not null default 1 check (severity between 1 and 3),
  note text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ms_running_route_hazards_route_idx on public.ms_running_route_hazards(route_key, created_at desc);
alter table public.ms_running_route_hazards enable row level security;

create table if not exists public.ms_running_route_outings (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  starts_at timestamptz not null,
  pace text not null default 'easy' check (pace in ('easy','steady','sporty')),
  max_people smallint not null default 6 check (max_people between 2 and 30),
  note text not null default '',
  status text not null default 'open' check (status in ('open','cancelled','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_running_route_outings_route_start_idx on public.ms_running_route_outings(route_key, starts_at asc);
alter table public.ms_running_route_outings enable row level security;

create table if not exists public.ms_running_route_outing_members (
  outing_id uuid not null references public.ms_running_route_outings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(outing_id,user_id)
);
alter table public.ms_running_route_outing_members enable row level security;

create table if not exists public.ms_running_route_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  storage_path text not null,
  public_url text not null,
  caption text not null default '',
  created_at timestamptz not null default now(),
  unique(user_id, storage_path)
);
create index if not exists ms_running_route_photos_route_idx on public.ms_running_route_photos(route_key, created_at desc);
alter table public.ms_running_route_photos enable row level security;

create or replace function public.ms_upsert_running_route_review(p_route_key text,p_rating integer,p_difficulty integer,p_text text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_route_key,'')))<4 then raise exception 'INVALID_ROUTE_KEY'; end if;
  if p_rating not between 1 and 5 or p_difficulty not between 1 and 5 then raise exception 'INVALID_SCORE'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_reviews(user_id,route_key,rating,difficulty,text,updated_at)
  values(v_uid,trim(p_route_key),p_rating,p_difficulty,left(trim(coalesce(p_text,'')),600),now())
  on conflict(user_id,route_key) do update set rating=excluded.rating,difficulty=excluded.difficulty,text=excluded.text,updated_at=now();
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.ms_post_running_route_condition(p_route_key text,p_kind text,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('good','dry','wet','muddy','snow','icy','blocked') then raise exception 'INVALID_CONDITION'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_conditions(user_id,route_key,kind,note) values(v_uid,trim(p_route_key),p_kind,left(trim(coalesce(p_note,'')),300));
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.ms_post_running_route_hazard(p_route_key text,p_kind text,p_severity integer default 1,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('obstacle','works','flood','danger','closure','other') then raise exception 'INVALID_HAZARD'; end if;
  if p_severity not between 1 and 3 then raise exception 'INVALID_SEVERITY'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_hazards(user_id,route_key,kind,severity,note) values(v_uid,trim(p_route_key),p_kind,p_severity,left(trim(coalesce(p_note,'')),400));
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.ms_create_running_route_outing(p_route_key text,p_starts_at timestamptz,p_pace text default 'easy',p_max_people integer default 6,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_starts_at <= now()-interval '30 minutes' then raise exception 'INVALID_DATE'; end if;
  if p_pace not in ('easy','steady','sporty') then raise exception 'INVALID_PACE'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_outings(owner_user_id,route_key,starts_at,pace,max_people,note)
  values(v_uid,trim(p_route_key),p_starts_at,p_pace,greatest(2,least(coalesce(p_max_people,6),30)),left(trim(coalesce(p_note,'')),400)) returning id into v_id;
  insert into public.ms_running_route_outing_members(outing_id,user_id) values(v_id,v_uid) on conflict do nothing;
  return jsonb_build_object('ok',true,'outingId',v_id::text);
end $$;

create or replace function public.ms_join_running_route_outing(p_outing_id uuid,p_join boolean default true)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_max integer;v_count integer;v_status text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select max_people,status into v_max,v_status from public.ms_running_route_outings where id=p_outing_id and starts_at>now()-interval '2 hours';
  if v_max is null or v_status<>'open' then raise exception 'OUTING_UNAVAILABLE'; end if;
  if coalesce(p_join,true) then
    select count(*) into v_count from public.ms_running_route_outing_members where outing_id=p_outing_id;
    if v_count>=v_max and not exists(select 1 from public.ms_running_route_outing_members where outing_id=p_outing_id and user_id=v_uid) then raise exception 'OUTING_FULL'; end if;
    insert into public.ms_running_route_outing_members(outing_id,user_id) values(p_outing_id,v_uid) on conflict do nothing;
  else
    delete from public.ms_running_route_outing_members m using public.ms_running_route_outings o where m.outing_id=p_outing_id and o.id=m.outing_id and m.user_id=v_uid and o.owner_user_id<>v_uid;
  end if;
  return jsonb_build_object('ok',true,'joined',coalesce(p_join,true));
end $$;

create or replace function public.ms_publish_running_route_photo(p_route_key text,p_storage_path text,p_public_url text,p_caption text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_public_url,'')))<10 or length(trim(coalesce(p_storage_path,'')))<5 then raise exception 'INVALID_PHOTO'; end if;
  if split_part(trim(p_storage_path),'/',1)<>v_uid::text then raise exception 'INVALID_OWNER'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_photos(user_id,route_key,storage_path,public_url,caption)
  values(v_uid,trim(p_route_key),trim(p_storage_path),trim(p_public_url),left(trim(coalesce(p_caption,'')),300))
  returning id into v_id;
  return jsonb_build_object('ok',true,'photoId',v_id::text);
end $$;

create or replace function public.ms_running_route_social_feed(p_route_key text,p_limit integer default 30)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_limit integer:=greatest(3,least(coalesce(p_limit,30),60));v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'summary',jsonb_build_object(
      'reviewCount',(select count(*) from public.ms_running_route_reviews r where r.route_key=trim(p_route_key)),
      'ratingAvg',(select round(avg(r.rating)::numeric,1) from public.ms_running_route_reviews r where r.route_key=trim(p_route_key)),
      'difficultyAvg',(select round(avg(r.difficulty)::numeric,1) from public.ms_running_route_reviews r where r.route_key=trim(p_route_key)),
      'recentCondition',(select c.kind from public.ms_running_route_conditions c where c.route_key=trim(p_route_key) and c.created_at>now()-interval '14 days' order by c.created_at desc limit 1)
    ),
    'reviews',coalesce((select jsonb_agg(x.obj order by x.updated_at desc) from (
      select jsonb_build_object('id',r.id::text,'userId',r.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'avatarUrl',p.avatar_url,'countryCode',p.country_code,'rating',r.rating,'difficulty',r.difficulty,'text',r.text,'updatedAt',r.updated_at) obj,r.updated_at
      from public.ms_running_route_reviews r left join public.ms_public_profiles p on p.user_id=r.user_id where r.route_key=trim(p_route_key) order by r.updated_at desc limit v_limit
    ) x),'[]'::jsonb),
    'conditions',coalesce((select jsonb_agg(x.obj order by x.created_at desc) from (
      select jsonb_build_object('id',c.id::text,'userId',c.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'avatarUrl',p.avatar_url,'kind',c.kind,'note',c.note,'createdAt',c.created_at) obj,c.created_at
      from public.ms_running_route_conditions c left join public.ms_public_profiles p on p.user_id=c.user_id where c.route_key=trim(p_route_key) and c.created_at>now()-interval '21 days' order by c.created_at desc limit v_limit
    ) x),'[]'::jsonb),
    'hazards',coalesce((select jsonb_agg(x.obj order by x.created_at desc) from (
      select jsonb_build_object('id',h.id::text,'userId',h.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'kind',h.kind,'severity',h.severity,'note',h.note,'createdAt',h.created_at) obj,h.created_at
      from public.ms_running_route_hazards h left join public.ms_public_profiles p on p.user_id=h.user_id where h.route_key=trim(p_route_key) and h.resolved_at is null and h.created_at>now()-interval '45 days' order by h.created_at desc limit v_limit
    ) x),'[]'::jsonb),
    'outings',coalesce((select jsonb_agg(x.obj order by x.starts_at asc) from (
      select jsonb_build_object('id',o.id::text,'ownerUserId',o.owner_user_id::text,'ownerDisplayName',coalesce(p.display_name,'Athlète'),'ownerAvatarUrl',p.avatar_url,'startsAt',o.starts_at,'pace',o.pace,'maxPeople',o.max_people,'note',o.note,'participants',(select count(*) from public.ms_running_route_outing_members m where m.outing_id=o.id),'joined',exists(select 1 from public.ms_running_route_outing_members m where m.outing_id=o.id and m.user_id=v_uid)) obj,o.starts_at
      from public.ms_running_route_outings o left join public.ms_public_profiles p on p.user_id=o.owner_user_id where o.route_key=trim(p_route_key) and o.status='open' and o.starts_at>now()-interval '2 hours' and o.starts_at<now()+interval '60 days' order by o.starts_at asc limit v_limit
    ) x),'[]'::jsonb),
    'photos',coalesce((select jsonb_agg(x.obj order by x.created_at desc) from (
      select jsonb_build_object('id',ph.id::text,'userId',ph.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'avatarUrl',p.avatar_url,'url',ph.public_url,'caption',ph.caption,'createdAt',ph.created_at) obj,ph.created_at
      from public.ms_running_route_photos ph left join public.ms_public_profiles p on p.user_id=ph.user_id where ph.route_key=trim(p_route_key) order by ph.created_at desc limit v_limit
    ) x),'[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

grant execute on function public.ms_upsert_running_route_review(text,integer,integer,text) to authenticated;
grant execute on function public.ms_post_running_route_condition(text,text,text) to authenticated;
grant execute on function public.ms_post_running_route_hazard(text,text,integer,text) to authenticated;
grant execute on function public.ms_create_running_route_outing(text,timestamptz,text,integer,text) to authenticated;
grant execute on function public.ms_join_running_route_outing(uuid,boolean) to authenticated;
grant execute on function public.ms_publish_running_route_photo(text,text,text,text) to authenticated;
grant execute on function public.ms_running_route_social_feed(text,integer) to authenticated;

-- Public user photos, but only authenticated users can upload into their own user folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('route-community','route-community',true,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='route_community_public_read') then
    create policy route_community_public_read on storage.objects for select using (bucket_id='route-community');
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='route_community_user_insert') then
    create policy route_community_user_insert on storage.objects for insert to authenticated with check (bucket_id='route-community' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='route_community_user_delete') then
    create policy route_community_user_delete on storage.objects for delete to authenticated using (bucket_id='route-community' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
end $$;


-- ============================================================
-- 06/12  20260830_esports_public_network_v3.sql
-- ============================================================
-- MULTISPORTS SCORING · E-SPORTS HUB V0.3 PUBLIC NETWORK
-- Public gamer profiles, global LFG and shared teams/clans.

create extension if not exists pgcrypto;

create table if not exists public.ms_esports_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Gamer',
  bio text not null default '',
  country_code text,
  game_ids text[] not null default '{}'::text[],
  platforms text[] not null default '{}'::text[],
  rank_by_game jsonb not null default '{}'::jsonb,
  looking_for_group boolean not null default false,
  activity jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ms_esports_lfg_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  platform text not null default 'pc',
  mode text not null default 'Casual',
  rank_label text not null default '',
  message text not null default '',
  slots_needed integer not null default 1 check(slots_needed between 1 and 20),
  status text not null default 'open' check(status in ('open','closed')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_esports_lfg_game_idx on public.ms_esports_lfg_posts(game_id,status,created_at desc);
create index if not exists ms_esports_lfg_user_idx on public.ms_esports_lfg_posts(user_id,created_at desc);

create table if not exists public.ms_esports_teams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tag text not null default '',
  game_ids text[] not null default '{}'::text[],
  member_names text[] not null default '{}'::text[],
  visibility text not null default 'public' check(visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_esports_teams_owner_idx on public.ms_esports_teams(owner_user_id,updated_at desc);
create index if not exists ms_esports_teams_games_gin on public.ms_esports_teams using gin(game_ids);

alter table public.ms_esports_profiles enable row level security;
alter table public.ms_esports_lfg_posts enable row level security;
alter table public.ms_esports_teams enable row level security;

drop policy if exists ms_esports_profiles_select on public.ms_esports_profiles;
create policy ms_esports_profiles_select on public.ms_esports_profiles for select to authenticated using (true);
drop policy if exists ms_esports_profiles_insert on public.ms_esports_profiles;
create policy ms_esports_profiles_insert on public.ms_esports_profiles for insert to authenticated with check(user_id=auth.uid());
drop policy if exists ms_esports_profiles_update on public.ms_esports_profiles;
create policy ms_esports_profiles_update on public.ms_esports_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists ms_esports_lfg_select on public.ms_esports_lfg_posts;
create policy ms_esports_lfg_select on public.ms_esports_lfg_posts for select to authenticated using(user_id=auth.uid() or (status='open' and expires_at>now()));
drop policy if exists ms_esports_lfg_insert on public.ms_esports_lfg_posts;
create policy ms_esports_lfg_insert on public.ms_esports_lfg_posts for insert to authenticated with check(user_id=auth.uid());
drop policy if exists ms_esports_lfg_update on public.ms_esports_lfg_posts;
create policy ms_esports_lfg_update on public.ms_esports_lfg_posts for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists ms_esports_lfg_delete on public.ms_esports_lfg_posts;
create policy ms_esports_lfg_delete on public.ms_esports_lfg_posts for delete to authenticated using(user_id=auth.uid());

drop policy if exists ms_esports_teams_select on public.ms_esports_teams;
create policy ms_esports_teams_select on public.ms_esports_teams for select to authenticated using(owner_user_id=auth.uid() or visibility='public');
drop policy if exists ms_esports_teams_insert on public.ms_esports_teams;
create policy ms_esports_teams_insert on public.ms_esports_teams for insert to authenticated with check(owner_user_id=auth.uid());
drop policy if exists ms_esports_teams_update on public.ms_esports_teams;
create policy ms_esports_teams_update on public.ms_esports_teams for update to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());
drop policy if exists ms_esports_teams_delete on public.ms_esports_teams;
create policy ms_esports_teams_delete on public.ms_esports_teams for delete to authenticated using(owner_user_id=auth.uid());

create or replace function public.ms_esports_upsert_profile(
  p_display_name text default null,
  p_bio text default null,
  p_country_code text default null,
  p_game_ids text[] default '{}'::text[],
  p_platforms text[] default '{}'::text[],
  p_rank_by_game jsonb default '{}'::jsonb,
  p_looking_for_group boolean default false,
  p_activity jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.ms_esports_profiles(user_id,display_name,bio,country_code,game_ids,platforms,rank_by_game,looking_for_group,activity,updated_at)
  values(v_uid,coalesce(nullif(trim(p_display_name),''),'Gamer'),coalesce(p_bio,''),upper(nullif(trim(p_country_code),'')),coalesce(p_game_ids,'{}'::text[]),coalesce(p_platforms,'{}'::text[]),coalesce(p_rank_by_game,'{}'::jsonb),coalesce(p_looking_for_group,false),coalesce(p_activity,'{}'::jsonb),now())
  on conflict(user_id) do update set display_name=excluded.display_name,bio=excluded.bio,country_code=excluded.country_code,game_ids=excluded.game_ids,platforms=excluded.platforms,rank_by_game=excluded.rank_by_game,looking_for_group=excluded.looking_for_group,activity=excluded.activity,updated_at=now()
  returning * into v;
  perform public.ms_touch_public_profile(v.display_name,null,v.country_code,null);
  return jsonb_build_object('ok',true,'userId',v.user_id::text,'updatedAt',v.updated_at);
end $$;

create or replace function public.ms_esports_search_players(
  p_query text default null,
  p_game_id text default null,
  p_platform text default null,
  p_rank text default null,
  p_limit integer default 50
) returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object(
    'userId',e.user_id::text,
    'displayName',e.display_name,
    'avatarUrl',p.avatar_url,
    'countryCode',coalesce(e.country_code,p.country_code),
    'status',coalesce(pr.status,'offline'),
    'lastSeenAt',pr.last_seen_at,
    'gameIds',to_jsonb(e.game_ids),
    'platforms',to_jsonb(e.platforms),
    'rankByGame',e.rank_by_game,
    'lookingForGroup',e.looking_for_group,
    'activity',e.activity
  )
  from public.ms_esports_profiles e
  left join public.ms_public_profiles p on p.user_id=e.user_id
  left join public.ms_presence pr on pr.user_id=e.user_id
  where auth.uid() is not null
    and e.user_id<>auth.uid()
    and (nullif(trim(coalesce(p_query,'')),'') is null or lower(e.display_name) like '%'||lower(trim(p_query))||'%' or lower(e.bio) like '%'||lower(trim(p_query))||'%')
    and (nullif(trim(coalesce(p_game_id,'')),'') is null or lower(trim(p_game_id))=any(select lower(x) from unnest(e.game_ids)x))
    and (nullif(trim(coalesce(p_platform,'')),'') is null or lower(trim(p_platform))=any(select lower(x) from unnest(e.platforms)x))
    and (nullif(trim(coalesce(p_rank,'')),'') is null or lower(e.rank_by_game::text) like '%'||lower(trim(p_rank))||'%')
  order by (coalesce(pr.status,'offline')='online') desc,e.looking_for_group desc,e.updated_at desc
  limit greatest(1,least(coalesce(p_limit,50),100));
$$;

create or replace function public.ms_esports_publish_lfg(
  p_game_id text,
  p_platform text,
  p_mode text default 'Casual',
  p_rank_label text default null,
  p_message text default null,
  p_slots_needed integer default 1
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_lfg_posts; v_name text; v_avatar text; v_country text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_game_id),'') is null then raise exception 'GAME_REQUIRED'; end if;
  update public.ms_esports_lfg_posts set status='closed',updated_at=now() where user_id=v_uid and game_id=trim(p_game_id) and status='open';
  insert into public.ms_esports_lfg_posts(user_id,game_id,platform,mode,rank_label,message,slots_needed,status,expires_at)
  values(v_uid,trim(p_game_id),lower(coalesce(nullif(trim(p_platform),''),'pc')),coalesce(nullif(trim(p_mode),''),'Casual'),coalesce(nullif(trim(p_rank_label),''),''),coalesce(nullif(trim(p_message),''),''),greatest(1,least(coalesce(p_slots_needed,1),20)),'open',now()+interval '24 hours') returning * into v;
  select coalesce(e.display_name,p.display_name,'Gamer'),p.avatar_url,coalesce(e.country_code,p.country_code) into v_name,v_avatar,v_country from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v_uid limit 1;
  return jsonb_build_object('id',v.id::text,'userId',v.user_id::text,'displayName',coalesce(v_name,'Gamer'),'avatarUrl',v_avatar,'countryCode',v_country,'gameId',v.game_id,'platform',v.platform,'mode',v.mode,'rankLabel',v.rank_label,'message',v.message,'slotsNeeded',v.slots_needed,'status',v.status,'createdAt',v.created_at,'updatedAt',v.updated_at,'expiresAt',v.expires_at,'mine',true);
end $$;

create or replace function public.ms_esports_list_lfg(
  p_game_id text default null,
  p_platform text default null,
  p_query text default null,
  p_mine_only boolean default false,
  p_limit integer default 80
) returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object(
    'id',l.id::text,'userId',l.user_id::text,'displayName',coalesce(e.display_name,p.display_name,'Gamer'),'avatarUrl',p.avatar_url,'countryCode',coalesce(e.country_code,p.country_code),
    'gameId',l.game_id,'platform',l.platform,'mode',l.mode,'rankLabel',l.rank_label,'message',l.message,'slotsNeeded',l.slots_needed,'status',case when l.status='open' and l.expires_at<=now() then 'closed' else l.status end,
    'createdAt',l.created_at,'updatedAt',l.updated_at,'expiresAt',l.expires_at,'mine',(l.user_id=auth.uid())
  )
  from public.ms_esports_lfg_posts l
  left join public.ms_esports_profiles e on e.user_id=l.user_id
  left join public.ms_public_profiles p on p.user_id=l.user_id
  where auth.uid() is not null
    and (not coalesce(p_mine_only,false) or l.user_id=auth.uid())
    and (l.user_id=auth.uid() or (l.status='open' and l.expires_at>now()))
    and (nullif(trim(coalesce(p_game_id,'')),'') is null or l.game_id=trim(p_game_id))
    and (nullif(trim(coalesce(p_platform,'')),'') is null or lower(l.platform)=lower(trim(p_platform)))
    and (nullif(trim(coalesce(p_query,'')),'') is null or lower(coalesce(e.display_name,p.display_name,'')) like '%'||lower(trim(p_query))||'%' or lower(l.message) like '%'||lower(trim(p_query))||'%' or lower(l.rank_label) like '%'||lower(trim(p_query))||'%')
  order by (l.user_id=auth.uid()) desc,l.created_at desc
  limit greatest(1,least(coalesce(p_limit,80),150));
$$;

create or replace function public.ms_esports_set_lfg_status(p_post_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_status text:=lower(trim(p_status)); v public.ms_esports_lfg_posts;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_status not in('open','closed') then raise exception 'INVALID_STATUS'; end if;
  update public.ms_esports_lfg_posts set status=v_status,expires_at=case when v_status='open' then now()+interval '24 hours' else expires_at end,updated_at=now() where id=p_post_id and user_id=v_uid returning * into v;
  if not found then raise exception 'LFG_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',v.id::text,'status',v.status,'updatedAt',v.updated_at);
end $$;

create or replace function public.ms_esports_create_team(
  p_name text,
  p_tag text default null,
  p_game_ids text[] default '{}'::text[],
  p_member_names text[] default '{}'::text[],
  p_visibility text default 'public'
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_teams; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'TEAM_NAME_REQUIRED'; end if;
  insert into public.ms_esports_teams(owner_user_id,name,tag,game_ids,member_names,visibility)
  values(v_uid,trim(p_name),upper(left(coalesce(trim(p_tag),''),8)),coalesce(p_game_ids,'{}'::text[]),coalesce(p_member_names,'{}'::text[]),case when lower(trim(coalesce(p_visibility,'public')))='private' then 'private' else 'public' end) returning * into v;
  select coalesce(e.display_name,p.display_name,'Gamer') into v_name from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v_uid limit 1;
  return jsonb_build_object('id',v.id::text,'ownerUserId',v.owner_user_id::text,'ownerDisplayName',coalesce(v_name,'Gamer'),'name',v.name,'tag',v.tag,'gameIds',to_jsonb(v.game_ids),'memberNames',to_jsonb(v.member_names),'visibility',v.visibility,'createdAt',v.created_at,'updatedAt',v.updated_at,'mine',true);
end $$;

create or replace function public.ms_esports_list_teams(p_game_id text default null,p_owned_only boolean default false,p_limit integer default 50)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',t.id::text,'ownerUserId',t.owner_user_id::text,'ownerDisplayName',coalesce(e.display_name,p.display_name,'Gamer'),'name',t.name,'tag',t.tag,'gameIds',to_jsonb(t.game_ids),'memberNames',to_jsonb(t.member_names),'visibility',t.visibility,'createdAt',t.created_at,'updatedAt',t.updated_at,'mine',(t.owner_user_id=auth.uid()))
  from public.ms_esports_teams t
  left join public.ms_esports_profiles e on e.user_id=t.owner_user_id
  left join public.ms_public_profiles p on p.user_id=t.owner_user_id
  where auth.uid() is not null and (t.owner_user_id=auth.uid() or t.visibility='public') and (not coalesce(p_owned_only,false) or t.owner_user_id=auth.uid()) and (nullif(trim(coalesce(p_game_id,'')),'') is null or trim(p_game_id)=any(t.game_ids))
  order by (t.owner_user_id=auth.uid()) desc,t.updated_at desc limit greatest(1,least(coalesce(p_limit,50),100));
$$;

create or replace function public.ms_esports_delete_team(p_team_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.ms_esports_teams where id=p_team_id and owner_user_id=v_uid;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',p_team_id::text);
end $$;

revoke all on function public.ms_esports_upsert_profile(text,text,text,text[],text[],jsonb,boolean,jsonb) from public;
revoke all on function public.ms_esports_search_players(text,text,text,text,integer) from public;
revoke all on function public.ms_esports_publish_lfg(text,text,text,text,text,integer) from public;
revoke all on function public.ms_esports_list_lfg(text,text,text,boolean,integer) from public;
revoke all on function public.ms_esports_set_lfg_status(uuid,text) from public;
revoke all on function public.ms_esports_create_team(text,text,text[],text[],text) from public;
revoke all on function public.ms_esports_list_teams(text,boolean,integer) from public;
revoke all on function public.ms_esports_delete_team(uuid) from public;

grant execute on function public.ms_esports_upsert_profile(text,text,text,text[],text[],jsonb,boolean,jsonb) to authenticated;
grant execute on function public.ms_esports_search_players(text,text,text,text,integer) to authenticated;
grant execute on function public.ms_esports_publish_lfg(text,text,text,text,text,integer) to authenticated;
grant execute on function public.ms_esports_list_lfg(text,text,text,boolean,integer) to authenticated;
grant execute on function public.ms_esports_set_lfg_status(uuid,text) to authenticated;
grant execute on function public.ms_esports_create_team(text,text,text[],text[],text) to authenticated;
grant execute on function public.ms_esports_list_teams(text,boolean,integer) to authenticated;
grant execute on function public.ms_esports_delete_team(uuid) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_lfg_posts') then execute 'alter publication supabase_realtime add table public.ms_esports_lfg_posts'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_teams') then execute 'alter publication supabase_realtime add table public.ms_esports_teams'; end if;
exception when others then null; end $$;


-- ============================================================
-- 07/12  20260830231400_esports_competitive_network_v4.sql
-- ============================================================
-- MULTISPORTS SCORING · E-SPORTS HUB V0.4 COMPETITIVE NETWORK
-- LFG applications, real clan memberships/roles, realtime notifications,
-- matchmaking queue and first server-side Community XP season leaderboard.
-- Requires V0.3 migration first.

create extension if not exists pgcrypto;

create table if not exists public.ms_esports_lfg_applications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.ms_esports_lfg_posts(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null default '',
  status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_id, applicant_user_id)
);
create index if not exists ms_esports_lfg_apps_post_idx on public.ms_esports_lfg_applications(post_id,status,created_at desc);
create index if not exists ms_esports_lfg_apps_user_idx on public.ms_esports_lfg_applications(applicant_user_id,created_at desc);

create table if not exists public.ms_esports_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','captain','officer','member')),
  status text not null default 'pending' check(status in ('pending','active','declined','left')),
  request_kind text not null default 'request' check(request_kind in ('owner','request','invite')),
  invited_by uuid references auth.users(id) on delete set null,
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id,user_id)
);
create index if not exists ms_esports_team_members_team_idx on public.ms_esports_team_members(team_id,status,role);
create index if not exists ms_esports_team_members_user_idx on public.ms_esports_team_members(user_id,status,updated_at desc);

create table if not exists public.ms_esports_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'info',
  title text not null default 'E-SPORTS',
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ms_esports_notifications_user_idx on public.ms_esports_notifications(user_id,read_at,created_at desc);

create table if not exists public.ms_esports_matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  game_id text not null,
  platform text not null default 'pc',
  mode text not null default 'Casual',
  rank_label text not null default '',
  region text not null default '',
  team_size integer not null default 1 check(team_size between 1 and 10),
  status text not null default 'searching' check(status in ('searching','matched','cancelled')),
  matched_with_user_id uuid references auth.users(id) on delete set null,
  matched_at timestamptz,
  expires_at timestamptz not null default (now()+interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_esports_matchmaking_lookup_idx on public.ms_esports_matchmaking_queue(game_id,status,mode,team_size,created_at);

create table if not exists public.ms_esports_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ms_esports_season_scores (
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null default 'all',
  community_xp integer not null default 0 check(community_xp>=0),
  lfg_accepts integer not null default 0 check(lfg_accepts>=0),
  team_joins integer not null default 0 check(team_joins>=0),
  matches_found integer not null default 0 check(matches_found>=0),
  updated_at timestamptz not null default now(),
  primary key(season_id,user_id,game_id)
);
create index if not exists ms_esports_season_scores_rank_idx on public.ms_esports_season_scores(season_id,game_id,community_xp desc);

insert into public.ms_esports_seasons(slug,name,starts_at,ends_at,active)
values('preseason-2026','E-SPORTS PRESEASON 2026','2026-08-30 00:00:00+00','2026-12-31 23:59:59+00',true)
on conflict(slug) do update set name=excluded.name,starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=true;

-- Existing V0.3 team owners become real active owner memberships.
insert into public.ms_esports_team_members(team_id,user_id,role,status,request_kind,invited_by,message)
select t.id,t.owner_user_id,'owner','active','owner',t.owner_user_id,'Owner'
from public.ms_esports_teams t
on conflict(team_id,user_id) do update set role='owner',status='active',request_kind='owner',updated_at=now();

alter table public.ms_esports_lfg_applications enable row level security;
alter table public.ms_esports_team_members enable row level security;
alter table public.ms_esports_notifications enable row level security;
alter table public.ms_esports_matchmaking_queue enable row level security;
alter table public.ms_esports_seasons enable row level security;
alter table public.ms_esports_season_scores enable row level security;

-- Read-only client policies. All sensitive writes go through SECURITY DEFINER RPCs.
drop policy if exists ms_esports_lfg_apps_select on public.ms_esports_lfg_applications;
create policy ms_esports_lfg_apps_select on public.ms_esports_lfg_applications for select to authenticated using(
  applicant_user_id=auth.uid() or exists(select 1 from public.ms_esports_lfg_posts p where p.id=post_id and p.user_id=auth.uid())
);

drop policy if exists ms_esports_team_members_select on public.ms_esports_team_members;
create policy ms_esports_team_members_select on public.ms_esports_team_members for select to authenticated using(
  user_id=auth.uid()
  or exists(select 1 from public.ms_esports_teams t where t.id=team_id and t.owner_user_id=auth.uid())
  or (status='active' and exists(select 1 from public.ms_esports_teams t where t.id=team_id and t.visibility='public'))
);

drop policy if exists ms_esports_notifications_select on public.ms_esports_notifications;
create policy ms_esports_notifications_select on public.ms_esports_notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists ms_esports_notifications_update on public.ms_esports_notifications;
create policy ms_esports_notifications_update on public.ms_esports_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists ms_esports_matchmaking_select on public.ms_esports_matchmaking_queue;
create policy ms_esports_matchmaking_select on public.ms_esports_matchmaking_queue for select to authenticated using(user_id=auth.uid());

drop policy if exists ms_esports_seasons_select on public.ms_esports_seasons;
create policy ms_esports_seasons_select on public.ms_esports_seasons for select to authenticated using(true);
drop policy if exists ms_esports_season_scores_select on public.ms_esports_season_scores;
create policy ms_esports_season_scores_select on public.ms_esports_season_scores for select to authenticated using(true);

-- Internal helper. Not granted to clients.
create or replace function public.ms_esports_v4_active_season_id() returns uuid
language sql stable security definer set search_path=public,auth,extensions as $$
  select id from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1;
$$;

create or replace function public.ms_esports_v4_add_xp(p_user_id uuid,p_game_id text,p_xp integer,p_reason text)
returns void language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_season uuid:=public.ms_esports_v4_active_season_id(); v_game text:=coalesce(nullif(trim(p_game_id),''),'all');
begin
  if v_season is null or p_user_id is null or coalesce(p_xp,0)<=0 then return; end if;
  insert into public.ms_esports_season_scores(season_id,user_id,game_id,community_xp,lfg_accepts,team_joins,matches_found,updated_at)
  values(v_season,p_user_id,v_game,p_xp,case when p_reason='lfg_accept' then 1 else 0 end,case when p_reason='team_join' then 1 else 0 end,case when p_reason='match_found' then 1 else 0 end,now())
  on conflict(season_id,user_id,game_id) do update set
    community_xp=public.ms_esports_season_scores.community_xp+excluded.community_xp,
    lfg_accepts=public.ms_esports_season_scores.lfg_accepts+excluded.lfg_accepts,
    team_joins=public.ms_esports_season_scores.team_joins+excluded.team_joins,
    matches_found=public.ms_esports_season_scores.matches_found+excluded.matches_found,
    updated_at=now();
end $$;

create or replace function public.ms_esports_v4_notify(p_user_id uuid,p_kind text,p_title text,p_body text,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public,auth,extensions as $$
begin
  if p_user_id is null then return; end if;
  insert into public.ms_esports_notifications(user_id,kind,title,body,metadata)
  values(p_user_id,coalesce(nullif(trim(p_kind),''),'info'),coalesce(nullif(trim(p_title),''),'E-SPORTS'),coalesce(p_body,''),coalesce(p_metadata,'{}'::jsonb));
end $$;

create or replace function public.ms_esports_apply_lfg(p_post_id uuid,p_message text default '') returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_post public.ms_esports_lfg_posts; v_app public.ms_esports_lfg_applications; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_post from public.ms_esports_lfg_posts where id=p_post_id and status='open' and expires_at>now();
  if not found then raise exception 'LFG_NOT_AVAILABLE'; end if;
  if v_post.user_id=v_uid then raise exception 'CANNOT_APPLY_OWN_LFG'; end if;
  insert into public.ms_esports_lfg_applications(post_id,applicant_user_id,message,status,updated_at)
  values(v_post.id,v_uid,left(coalesce(p_message,''),300),'pending',now())
  on conflict(post_id,applicant_user_id) do update set message=excluded.message,status=case when public.ms_esports_lfg_applications.status='accepted' then 'accepted' else 'pending' end,updated_at=now()
  returning * into v_app;
  select coalesce(e.display_name,p.display_name,'Gamer') into v_name from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v_uid limit 1;
  perform public.ms_esports_v4_notify(v_post.user_id,'lfg_application','Nouvelle candidature LFG',coalesce(v_name,'Gamer')||' souhaite rejoindre ton groupe.',jsonb_build_object('postId',v_post.id::text,'applicationId',v_app.id::text,'gameId',v_post.game_id));
  return jsonb_build_object('id',v_app.id::text,'postId',v_app.post_id::text,'postOwnerUserId',v_post.user_id::text,'applicantUserId',v_uid::text,'applicantDisplayName',coalesce(v_name,'Gamer'),'gameId',v_post.game_id,'mode',v_post.mode,'rankLabel',v_post.rank_label,'message',v_app.message,'status',v_app.status,'mine',true,'forMyPost',false,'createdAt',v_app.created_at,'updatedAt',v_app.updated_at);
end $$;

create or replace function public.ms_esports_list_lfg_applications(p_post_id uuid default null,p_limit integer default 120)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object(
    'id',a.id::text,'postId',a.post_id::text,'postOwnerUserId',p.user_id::text,'applicantUserId',a.applicant_user_id::text,
    'applicantDisplayName',coalesce(ep.display_name,pp.display_name,'Gamer'),'gameId',p.game_id,'mode',p.mode,'rankLabel',coalesce(ep.rank_by_game->>p.game_id,p.rank_label,''),
    'message',a.message,'status',a.status,'mine',(a.applicant_user_id=auth.uid()),'forMyPost',(p.user_id=auth.uid()),'createdAt',a.created_at,'updatedAt',a.updated_at)
  from public.ms_esports_lfg_applications a
  join public.ms_esports_lfg_posts p on p.id=a.post_id
  left join public.ms_esports_profiles ep on ep.user_id=a.applicant_user_id
  left join public.ms_public_profiles pp on pp.user_id=a.applicant_user_id
  where auth.uid() is not null and (a.applicant_user_id=auth.uid() or p.user_id=auth.uid())
    and (p_post_id is null or a.post_id=p_post_id)
  order by (a.status='pending') desc,a.updated_at desc
  limit greatest(1,least(coalesce(p_limit,120),200));
$$;

create or replace function public.ms_esports_review_lfg_application(p_application_id uuid,p_status text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_status text:=lower(trim(p_status)); v_app public.ms_esports_lfg_applications; v_post public.ms_esports_lfg_posts; v_owner_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_status not in('accepted','declined') then raise exception 'INVALID_STATUS'; end if;
  select a.* into v_app from public.ms_esports_lfg_applications a join public.ms_esports_lfg_posts p on p.id=a.post_id where a.id=p_application_id and p.user_id=v_uid for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  if v_app.status<>'pending' then raise exception 'APPLICATION_ALREADY_REVIEWED'; end if;
  select * into v_post from public.ms_esports_lfg_posts where id=v_app.post_id for update;
  update public.ms_esports_lfg_applications set status=v_status,updated_at=now() where id=v_app.id;
  if v_status='accepted' then
    if v_post.status<>'open' or v_post.expires_at<=now() then raise exception 'LFG_NOT_AVAILABLE'; end if;
    if v_post.slots_needed<=1 then
      update public.ms_esports_lfg_posts set status='closed',updated_at=now() where id=v_post.id;
      update public.ms_esports_lfg_applications set status='declined',updated_at=now() where post_id=v_post.id and id<>v_app.id and status='pending';
    else
      update public.ms_esports_lfg_posts set slots_needed=slots_needed-1,updated_at=now() where id=v_post.id;
    end if;
    perform public.ms_esports_v4_add_xp(v_uid,v_post.game_id,10,'lfg_accept');
    perform public.ms_esports_v4_add_xp(v_app.applicant_user_id,v_post.game_id,10,'lfg_accept');
  end if;
  select coalesce(e.display_name,p.display_name,'Gamer') into v_owner_name from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v_uid limit 1;
  perform public.ms_esports_v4_notify(v_app.applicant_user_id,'lfg_'||v_status,case when v_status='accepted' then 'Candidature LFG acceptée' else 'Candidature LFG refusée' end,coalesce(v_owner_name,'Gamer')||case when v_status='accepted' then ' t''a accepté dans son groupe.' else ' n''a pas retenu ta candidature.' end,jsonb_build_object('postId',v_post.id::text,'gameId',v_post.game_id,'status',v_status));
  return jsonb_build_object('ok',true,'id',v_app.id::text,'status',v_status,'postId',v_post.id::text);
end $$;

create or replace function public.ms_esports_withdraw_lfg_application(p_application_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_lfg_applications;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.ms_esports_lfg_applications set status='withdrawn',updated_at=now() where id=p_application_id and applicant_user_id=v_uid and status='pending' returning * into v;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',v.id::text,'status',v.status);
end $$;

-- Replace the V0.3 creator so every new clan automatically has a real owner membership.
create or replace function public.ms_esports_create_team(
  p_name text,p_tag text default null,p_game_ids text[] default '{}'::text[],p_member_names text[] default '{}'::text[],p_visibility text default 'public'
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_teams; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'TEAM_NAME_REQUIRED'; end if;
  insert into public.ms_esports_teams(owner_user_id,name,tag,game_ids,member_names,visibility)
  values(v_uid,trim(p_name),upper(left(coalesce(trim(p_tag),''),8)),coalesce(p_game_ids,'{}'::text[]),coalesce(p_member_names,'{}'::text[]),case when lower(trim(coalesce(p_visibility,'public')))='private' then 'private' else 'public' end) returning * into v;
  insert into public.ms_esports_team_members(team_id,user_id,role,status,request_kind,invited_by,message)
  values(v.id,v_uid,'owner','active','owner',v_uid,'Owner') on conflict(team_id,user_id) do update set role='owner',status='active',request_kind='owner',updated_at=now();
  select coalesce(e.display_name,p.display_name,'Gamer') into v_name from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v_uid limit 1;
  return jsonb_build_object('id',v.id::text,'ownerUserId',v.owner_user_id::text,'ownerDisplayName',coalesce(v_name,'Gamer'),'name',v.name,'tag',v.tag,'gameIds',to_jsonb(v.game_ids),'memberNames',to_jsonb(v.member_names),'visibility',v.visibility,'createdAt',v.created_at,'updatedAt',v.updated_at,'mine',true);
end $$;

create or replace function public.ms_esports_request_team_join(p_team_id uuid,p_message text default '') returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_team public.ms_esports_teams; v_member public.ms_esports_team_members; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_team from public.ms_esports_teams where id=p_team_id and visibility='public';
  if not found then raise exception 'TEAM_NOT_JOINABLE'; end if;
  if v_team.owner_user_id=v_uid then raise exception 'ALREADY_OWNER'; end if;
  insert into public.ms_esports_team_members(team_id,user_id,role,status,request_kind,invited_by,message,updated_at)
  values(v_team.id,v_uid,'member','pending','request',null,left(coalesce(p_message,''),240),now())
  on conflict(team_id,user_id) do update set status=case when public.ms_esports_team_members.status='active' then 'active' else 'pending' end,request_kind=case when public.ms_esports_team_members.status='active' then public.ms_esports_team_members.request_kind else 'request' end,message=excluded.message,updated_at=now()
  returning * into v_member;
  select coalesce(e.display_name,p.display_name,'Gamer') into v_name from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v_uid limit 1;
  perform public.ms_esports_v4_notify(v_team.owner_user_id,'team_join_request','Nouvelle demande de clan',coalesce(v_name,'Gamer')||' souhaite rejoindre ['||v_team.tag||'] '||v_team.name,jsonb_build_object('teamId',v_team.id::text,'membershipId',v_member.id::text));
  return jsonb_build_object('id',v_member.id::text,'teamId',v_team.id::text,'teamName',v_team.name,'teamTag',v_team.tag,'teamOwnerUserId',v_team.owner_user_id::text,'userId',v_uid::text,'displayName',coalesce(v_name,'Gamer'),'role',v_member.role,'status',v_member.status,'requestKind',v_member.request_kind,'message',v_member.message,'mine',true,'teamMine',false,'canManage',false,'createdAt',v_member.created_at,'updatedAt',v_member.updated_at);
end $$;

create or replace function public.ms_esports_invite_team_member(p_team_id uuid,p_target_user_id uuid,p_role text default 'member',p_message text default '') returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_team public.ms_esports_teams; v_member public.ms_esports_team_members; v_role text:=lower(trim(coalesce(p_role,'member'))); v_target_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_team from public.ms_esports_teams where id=p_team_id and owner_user_id=v_uid;
  if not found then raise exception 'TEAM_FORBIDDEN'; end if;
  if p_target_user_id is null or p_target_user_id=v_uid then raise exception 'INVALID_TARGET'; end if;
  if v_role not in('captain','officer','member') then v_role:='member'; end if;
  insert into public.ms_esports_team_members(team_id,user_id,role,status,request_kind,invited_by,message,updated_at)
  values(v_team.id,p_target_user_id,v_role,'pending','invite',v_uid,left(coalesce(p_message,''),240),now())
  on conflict(team_id,user_id) do update set role=excluded.role,status=case when public.ms_esports_team_members.status='active' then 'active' else 'pending' end,request_kind=case when public.ms_esports_team_members.status='active' then public.ms_esports_team_members.request_kind else 'invite' end,invited_by=v_uid,message=excluded.message,updated_at=now()
  returning * into v_member;
  select coalesce(e.display_name,p.display_name,'Gamer') into v_target_name from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=p_target_user_id limit 1;
  perform public.ms_esports_v4_notify(p_target_user_id,'team_invite','Invitation de clan','Tu es invité à rejoindre ['||v_team.tag||'] '||v_team.name,jsonb_build_object('teamId',v_team.id::text,'membershipId',v_member.id::text,'role',v_member.role));
  return jsonb_build_object('id',v_member.id::text,'teamId',v_team.id::text,'teamName',v_team.name,'teamTag',v_team.tag,'teamOwnerUserId',v_uid::text,'userId',p_target_user_id::text,'displayName',coalesce(v_target_name,'Gamer'),'role',v_member.role,'status',v_member.status,'requestKind',v_member.request_kind,'message',v_member.message,'mine',false,'teamMine',true,'canManage',true,'createdAt',v_member.created_at,'updatedAt',v_member.updated_at);
end $$;

create or replace function public.ms_esports_list_team_memberships(p_team_id uuid default null,p_limit integer default 200)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object(
    'id',m.id::text,'teamId',t.id::text,'teamName',t.name,'teamTag',t.tag,'teamOwnerUserId',t.owner_user_id::text,'userId',m.user_id::text,
    'displayName',coalesce(ep.display_name,pp.display_name,'Gamer'),'role',m.role,'status',m.status,'requestKind',m.request_kind,'message',m.message,
    'mine',(m.user_id=auth.uid()),'teamMine',(t.owner_user_id=auth.uid()),
    'canManage',(t.owner_user_id=auth.uid() or exists(select 1 from public.ms_esports_team_members mm where mm.team_id=t.id and mm.user_id=auth.uid() and mm.status='active' and mm.role in('owner','captain','officer'))),
    'createdAt',m.created_at,'updatedAt',m.updated_at)
  from public.ms_esports_team_members m
  join public.ms_esports_teams t on t.id=m.team_id
  left join public.ms_esports_profiles ep on ep.user_id=m.user_id
  left join public.ms_public_profiles pp on pp.user_id=m.user_id
  where auth.uid() is not null
    and (p_team_id is null or t.id=p_team_id)
    and (
      m.user_id=auth.uid() or t.owner_user_id=auth.uid()
      or exists(select 1 from public.ms_esports_team_members me where me.team_id=t.id and me.user_id=auth.uid() and me.status='active' and me.role in('owner','captain','officer'))
      or (m.status='active' and t.visibility='public')
    )
  order by (m.status='pending') desc,case m.role when 'owner' then 1 when 'captain' then 2 when 'officer' then 3 else 4 end,m.updated_at desc
  limit greatest(1,least(coalesce(p_limit,200),300));
$$;

create or replace function public.ms_esports_review_team_membership(p_membership_id uuid,p_status text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_status text:=lower(trim(p_status)); v_member public.ms_esports_team_members; v_team public.ms_esports_teams; v_can_manage boolean:=false; v_game text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_status not in('active','declined') then raise exception 'INVALID_STATUS'; end if;
  select * into v_member from public.ms_esports_team_members where id=p_membership_id for update;
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  if v_member.status<>'pending' then raise exception 'MEMBERSHIP_ALREADY_REVIEWED'; end if;
  select * into v_team from public.ms_esports_teams where id=v_member.team_id;
  select (v_team.owner_user_id=v_uid or exists(select 1 from public.ms_esports_team_members m where m.team_id=v_team.id and m.user_id=v_uid and m.status='active' and m.role in('owner','captain','officer'))) into v_can_manage;
  if v_member.request_kind='invite' then
    if v_member.user_id<>v_uid then raise exception 'MEMBERSHIP_FORBIDDEN'; end if;
  elsif not v_can_manage then raise exception 'MEMBERSHIP_FORBIDDEN'; end if;
  update public.ms_esports_team_members set status=v_status,updated_at=now() where id=v_member.id;
  if v_status='active' then
    v_game:=coalesce(v_team.game_ids[1],'all');
    perform public.ms_esports_v4_add_xp(v_member.user_id,v_game,5,'team_join');
  end if;
  perform public.ms_esports_v4_notify(case when v_member.request_kind='invite' then v_team.owner_user_id else v_member.user_id end,'team_membership_'||v_status,case when v_status='active' then 'Clan rejoint' else 'Demande de clan refusée' end,case when v_status='active' then 'Adhésion confirmée pour ['||v_team.tag||'] '||v_team.name else 'La demande concernant ['||v_team.tag||'] '||v_team.name||' a été refusée.' end,jsonb_build_object('teamId',v_team.id::text,'membershipId',v_member.id::text,'status',v_status));
  return jsonb_build_object('ok',true,'id',v_member.id::text,'teamId',v_team.id::text,'status',v_status);
end $$;

create or replace function public.ms_esports_set_team_member_role(p_membership_id uuid,p_role text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_role text:=lower(trim(p_role)); v_member public.ms_esports_team_members; v_team public.ms_esports_teams;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in('captain','officer','member') then raise exception 'INVALID_ROLE'; end if;
  select * into v_member from public.ms_esports_team_members where id=p_membership_id and status='active';
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  select * into v_team from public.ms_esports_teams where id=v_member.team_id and owner_user_id=v_uid;
  if not found or v_member.role='owner' then raise exception 'ROLE_FORBIDDEN'; end if;
  update public.ms_esports_team_members set role=v_role,updated_at=now() where id=v_member.id;
  perform public.ms_esports_v4_notify(v_member.user_id,'team_role_changed','Rôle de clan modifié','Ton rôle dans ['||v_team.tag||'] '||v_team.name||' est maintenant '||upper(v_role)||'.',jsonb_build_object('teamId',v_team.id::text,'role',v_role));
  return jsonb_build_object('ok',true,'id',v_member.id::text,'role',v_role);
end $$;

create or replace function public.ms_esports_leave_team(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_team public.ms_esports_teams;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_team from public.ms_esports_teams where id=p_team_id;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  if v_team.owner_user_id=v_uid then raise exception 'OWNER_CANNOT_LEAVE'; end if;
  update public.ms_esports_team_members set status='left',updated_at=now() where team_id=p_team_id and user_id=v_uid and status='active';
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'teamId',p_team_id::text,'status','left');
end $$;

create or replace function public.ms_esports_join_matchmaking(
  p_game_id text,p_platform text,p_mode text default 'Casual',p_rank_label text default null,p_region text default null,p_team_size integer default 1
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_me public.ms_esports_matchmaking_queue; v_other public.ms_esports_matchmaking_queue; v_name text; v_avatar text; v_other_rank text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_game_id),'') is null then raise exception 'GAME_REQUIRED'; end if;
  select * into v_me from public.ms_esports_matchmaking_queue where user_id=v_uid for update;
  if found and v_me.status='matched' and v_me.matched_with_user_id is not null then
    update public.ms_esports_matchmaking_queue set status='searching',matched_with_user_id=null,matched_at=null,expires_at=now()+interval '2 hours',updated_at=now() where user_id=v_me.matched_with_user_id and status='matched';
    perform public.ms_esports_v4_notify(v_me.matched_with_user_id,'match_cancelled','Matchmaking relancé','Le joueur associé a relancé une recherche. Tu es replacé dans la file.',jsonb_build_object('gameId',v_me.game_id));
  end if;
  delete from public.ms_esports_matchmaking_queue where user_id=v_uid;
  update public.ms_esports_matchmaking_queue set status='cancelled',updated_at=now() where status='searching' and expires_at<=now();
  insert into public.ms_esports_matchmaking_queue(user_id,game_id,platform,mode,rank_label,region,team_size,status,expires_at,updated_at)
  values(v_uid,trim(p_game_id),lower(coalesce(nullif(trim(p_platform),''),'pc')),coalesce(nullif(trim(p_mode),''),'Casual'),coalesce(nullif(trim(p_rank_label),''),''),upper(coalesce(nullif(trim(p_region),''),'')),greatest(1,least(coalesce(p_team_size,1),10)),'searching',now()+interval '2 hours',now()) returning * into v_me;

  select q.* into v_other from public.ms_esports_matchmaking_queue q
  where q.user_id<>v_uid and q.status='searching' and q.expires_at>now()
    and q.game_id=v_me.game_id and lower(q.mode)=lower(v_me.mode) and q.team_size=v_me.team_size
    and (q.platform=v_me.platform or q.platform='crossplay' or v_me.platform='crossplay')
    and (q.region='' or v_me.region='' or q.region=v_me.region)
    and (q.rank_label='' or v_me.rank_label='' or lower(q.rank_label)=lower(v_me.rank_label))
  order by q.created_at asc limit 1 for update skip locked;

  if found then
    update public.ms_esports_matchmaking_queue set status='matched',matched_with_user_id=v_other.user_id,matched_at=now(),updated_at=now() where id=v_me.id returning * into v_me;
    update public.ms_esports_matchmaking_queue set status='matched',matched_with_user_id=v_uid,matched_at=now(),updated_at=now() where id=v_other.id;
    perform public.ms_esports_v4_add_xp(v_uid,v_me.game_id,8,'match_found');
    perform public.ms_esports_v4_add_xp(v_other.user_id,v_me.game_id,8,'match_found');
    perform public.ms_esports_v4_notify(v_uid,'match_found','MATCH TROUVÉ','Un joueur compatible a été trouvé pour '||v_me.game_id||'.',jsonb_build_object('gameId',v_me.game_id,'matchedUserId',v_other.user_id::text));
    perform public.ms_esports_v4_notify(v_other.user_id,'match_found','MATCH TROUVÉ','Un joueur compatible a été trouvé pour '||v_me.game_id||'.',jsonb_build_object('gameId',v_me.game_id,'matchedUserId',v_uid::text));
  end if;

  if v_me.matched_with_user_id is not null then
    select coalesce(e.display_name,p.display_name,'Gamer'),p.avatar_url,e.rank_by_game->>v_me.game_id into v_name,v_avatar,v_other_rank
    from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v_me.matched_with_user_id limit 1;
  end if;
  return jsonb_build_object('id',v_me.id::text,'userId',v_me.user_id::text,'gameId',v_me.game_id,'platform',v_me.platform,'mode',v_me.mode,'rankLabel',v_me.rank_label,'region',v_me.region,'teamSize',v_me.team_size,'status',v_me.status,'matchedWithUserId',case when v_me.matched_with_user_id is null then null else v_me.matched_with_user_id::text end,'matchedDisplayName',v_name,'matchedAvatarUrl',v_avatar,'matchedRankLabel',v_other_rank,'matchedAt',v_me.matched_at,'createdAt',v_me.created_at,'expiresAt',v_me.expires_at);
end $$;

create or replace function public.ms_esports_get_matchmaking() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_matchmaking_queue; v_name text; v_avatar text; v_rank text; v_status text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v from public.ms_esports_matchmaking_queue where user_id=v_uid;
  if not found then return null; end if;
  v_status:=case when v.status='searching' and v.expires_at<=now() then 'expired' else v.status end;
  if v.matched_with_user_id is not null then
    select coalesce(e.display_name,p.display_name,'Gamer'),p.avatar_url,e.rank_by_game->>v.game_id into v_name,v_avatar,v_rank from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id where coalesce(e.user_id,p.user_id)=v.matched_with_user_id limit 1;
  end if;
  return jsonb_build_object('id',v.id::text,'userId',v.user_id::text,'gameId',v.game_id,'platform',v.platform,'mode',v.mode,'rankLabel',v.rank_label,'region',v.region,'teamSize',v.team_size,'status',v_status,'matchedWithUserId',case when v.matched_with_user_id is null then null else v.matched_with_user_id::text end,'matchedDisplayName',v_name,'matchedAvatarUrl',v_avatar,'matchedRankLabel',v_rank,'matchedAt',v.matched_at,'createdAt',v.created_at,'expiresAt',v.expires_at);
end $$;

create or replace function public.ms_esports_leave_matchmaking() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_matchmaking_queue;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v from public.ms_esports_matchmaking_queue where user_id=v_uid for update;
  if not found then return jsonb_build_object('ok',true,'status','idle'); end if;
  if v.status='matched' and v.matched_with_user_id is not null then
    update public.ms_esports_matchmaking_queue set status='searching',matched_with_user_id=null,matched_at=null,expires_at=now()+interval '2 hours',updated_at=now() where user_id=v.matched_with_user_id and status='matched';
    perform public.ms_esports_v4_notify(v.matched_with_user_id,'match_cancelled','Matchmaking relancé','Le joueur associé a quitté le match. Tu es replacé dans la file.',jsonb_build_object('gameId',v.game_id));
  end if;
  update public.ms_esports_matchmaking_queue set status='cancelled',updated_at=now() where id=v.id;
  return jsonb_build_object('ok',true,'id',v.id::text,'status','cancelled');
end $$;

create or replace function public.ms_esports_list_notifications(p_limit integer default 60)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',n.id::text,'kind',n.kind,'title',n.title,'body',n.body,'metadata',n.metadata,'readAt',n.read_at,'createdAt',n.created_at)
  from public.ms_esports_notifications n where auth.uid() is not null and n.user_id=auth.uid()
  order by (n.read_at is null) desc,n.created_at desc limit greatest(1,least(coalesce(p_limit,60),120));
$$;

create or replace function public.ms_esports_mark_notification_read(p_notification_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_count integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.ms_esports_notifications set read_at=coalesce(read_at,now()) where user_id=v_uid and (p_notification_id is null or id=p_notification_id);
  get diagnostics v_count=row_count;
  return jsonb_build_object('ok',true,'updated',v_count);
end $$;

create or replace function public.ms_esports_leaderboard(p_game_id text default null,p_limit integer default 50)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with season as (
    select id,name,slug from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1
  ), scores as (
    select s.user_id,
      case when nullif(trim(coalesce(p_game_id,'')),'') is null then 'all' else trim(p_game_id) end as game_id,
      sum(s.community_xp)::int as community_xp,sum(s.lfg_accepts)::int as lfg_accepts,sum(s.team_joins)::int as team_joins,sum(s.matches_found)::int as matches_found,
      max(season.name) as season_name,max(season.slug) as season_slug
    from public.ms_esports_season_scores s join season on season.id=s.season_id
    where nullif(trim(coalesce(p_game_id,'')),'') is null or s.game_id=trim(p_game_id)
    group by s.user_id
  ), ranked as (
    select scores.*,row_number() over(order by community_xp desc,matches_found desc,lfg_accepts desc,user_id)::int as position from scores
  )
  select jsonb_build_object('position',r.position,'userId',r.user_id::text,'displayName',coalesce(e.display_name,p.display_name,'Gamer'),'avatarUrl',p.avatar_url,'countryCode',coalesce(e.country_code,p.country_code),'gameId',r.game_id,'communityXp',r.community_xp,'lfgAccepts',r.lfg_accepts,'teamJoins',r.team_joins,'matchesFound',r.matches_found,'seasonName',r.season_name,'seasonSlug',r.season_slug)
  from ranked r left join public.ms_esports_profiles e on e.user_id=r.user_id left join public.ms_public_profiles p on p.user_id=r.user_id
  where auth.uid() is not null order by r.position limit greatest(1,least(coalesce(p_limit,50),100));
$$;

-- Public execute rights only on the user-facing RPC surface.
revoke all on function public.ms_esports_v4_active_season_id() from public;
revoke all on function public.ms_esports_v4_add_xp(uuid,text,integer,text) from public;
revoke all on function public.ms_esports_v4_notify(uuid,text,text,text,jsonb) from public;

revoke all on function public.ms_esports_apply_lfg(uuid,text) from public;
revoke all on function public.ms_esports_list_lfg_applications(uuid,integer) from public;
revoke all on function public.ms_esports_review_lfg_application(uuid,text) from public;
revoke all on function public.ms_esports_withdraw_lfg_application(uuid) from public;
revoke all on function public.ms_esports_request_team_join(uuid,text) from public;
revoke all on function public.ms_esports_invite_team_member(uuid,uuid,text,text) from public;
revoke all on function public.ms_esports_list_team_memberships(uuid,integer) from public;
revoke all on function public.ms_esports_review_team_membership(uuid,text) from public;
revoke all on function public.ms_esports_set_team_member_role(uuid,text) from public;
revoke all on function public.ms_esports_leave_team(uuid) from public;
revoke all on function public.ms_esports_join_matchmaking(text,text,text,text,text,integer) from public;
revoke all on function public.ms_esports_get_matchmaking() from public;
revoke all on function public.ms_esports_leave_matchmaking() from public;
revoke all on function public.ms_esports_list_notifications(integer) from public;
revoke all on function public.ms_esports_mark_notification_read(uuid) from public;
revoke all on function public.ms_esports_leaderboard(text,integer) from public;

grant execute on function public.ms_esports_apply_lfg(uuid,text) to authenticated;
grant execute on function public.ms_esports_list_lfg_applications(uuid,integer) to authenticated;
grant execute on function public.ms_esports_review_lfg_application(uuid,text) to authenticated;
grant execute on function public.ms_esports_withdraw_lfg_application(uuid) to authenticated;
grant execute on function public.ms_esports_request_team_join(uuid,text) to authenticated;
grant execute on function public.ms_esports_invite_team_member(uuid,uuid,text,text) to authenticated;
grant execute on function public.ms_esports_list_team_memberships(uuid,integer) to authenticated;
grant execute on function public.ms_esports_review_team_membership(uuid,text) to authenticated;
grant execute on function public.ms_esports_set_team_member_role(uuid,text) to authenticated;
grant execute on function public.ms_esports_leave_team(uuid) to authenticated;
grant execute on function public.ms_esports_join_matchmaking(text,text,text,text,text,integer) to authenticated;
grant execute on function public.ms_esports_get_matchmaking() to authenticated;
grant execute on function public.ms_esports_leave_matchmaking() to authenticated;
grant execute on function public.ms_esports_list_notifications(integer) to authenticated;
grant execute on function public.ms_esports_mark_notification_read(uuid) to authenticated;
grant execute on function public.ms_esports_leaderboard(text,integer) to authenticated;

-- Keep same execute access for the replaced V0.3 team creator.
grant execute on function public.ms_esports_create_team(text,text,text[],text[],text) to authenticated;

-- Realtime is supplemental: RPCs remain source of truth, and failure to add a publication never breaks migration.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_notifications') then execute 'alter publication supabase_realtime add table public.ms_esports_notifications'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_matchmaking_queue') then execute 'alter publication supabase_realtime add table public.ms_esports_matchmaking_queue'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_lfg_applications') then execute 'alter publication supabase_realtime add table public.ms_esports_lfg_applications'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_team_members') then execute 'alter publication supabase_realtime add table public.ms_esports_team_members'; end if;
exception when others then null; end $$;


-- ============================================================
-- 08/12  20260831073300_esports_ranked_sessions_v5.sql
-- ============================================================
-- MULTISPORTS SCORING · E-SPORTS HUB V0.5 RANKED SESSIONS
-- Matchmaking -> one canonical competitive session -> private online room code,
-- bilateral result confirmation and server-side Elo/MMR by game + season.
-- Requires E-SPORTS V0.3 + V0.4 migrations first.

create extension if not exists pgcrypto;

create table if not exists public.ms_esports_competitive_matches (
  id uuid primary key default gen_random_uuid(),
  source_pair_key text not null unique,
  season_id uuid references public.ms_esports_seasons(id) on delete set null,
  game_id text not null,
  platform text not null default 'crossplay',
  mode text not null default 'Ranked',
  team_size integer not null default 1 check(team_size between 1 and 10),
  player_a_user_id uuid not null references auth.users(id) on delete cascade,
  player_b_user_id uuid not null references auth.users(id) on delete cascade,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  room_code text,
  status text not null default 'matched' check(status in ('matched','room_ready','pending_confirmation','confirmed','disputed','cancelled')),
  report_a jsonb,
  report_b jsonb,
  final_score_a integer,
  final_score_b integer,
  winner_user_id uuid references auth.users(id) on delete set null,
  mmr_a_before integer,
  mmr_a_after integer,
  mmr_b_before integer,
  mmr_b_after integer,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(player_a_user_id <> player_b_user_id)
);
create index if not exists ms_esports_comp_matches_a_idx on public.ms_esports_competitive_matches(player_a_user_id,updated_at desc);
create index if not exists ms_esports_comp_matches_b_idx on public.ms_esports_competitive_matches(player_b_user_id,updated_at desc);
create index if not exists ms_esports_comp_matches_game_idx on public.ms_esports_competitive_matches(game_id,status,updated_at desc);

create table if not exists public.ms_esports_ratings (
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  rating integer not null default 1000 check(rating between 100 and 5000),
  matches integer not null default 0 check(matches >= 0),
  wins integer not null default 0 check(wins >= 0),
  losses integer not null default 0 check(losses >= 0),
  draws integer not null default 0 check(draws >= 0),
  last_match_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(season_id,user_id,game_id)
);
create index if not exists ms_esports_ratings_rank_idx on public.ms_esports_ratings(season_id,game_id,rating desc,matches desc);

alter table public.ms_esports_competitive_matches enable row level security;
alter table public.ms_esports_ratings enable row level security;

drop policy if exists ms_esports_comp_matches_select on public.ms_esports_competitive_matches;
create policy ms_esports_comp_matches_select on public.ms_esports_competitive_matches for select to authenticated using(
  player_a_user_id=auth.uid() or player_b_user_id=auth.uid()
);

drop policy if exists ms_esports_ratings_select on public.ms_esports_ratings;
create policy ms_esports_ratings_select on public.ms_esports_ratings for select to authenticated using(true);

create or replace function public.ms_esports_v5_match_json(p_match public.ms_esports_competitive_matches,p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,extensions as $$
declare
  v_a_name text; v_b_name text; v_a_avatar text; v_b_avatar text;
  v_a_rating integer:=1000; v_b_rating integer:=1000;
begin
  select coalesce(e.display_name,p.display_name,'Gamer'),p.avatar_url into v_a_name,v_a_avatar
  from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id
  where coalesce(e.user_id,p.user_id)=p_match.player_a_user_id limit 1;
  select coalesce(e.display_name,p.display_name,'Gamer'),p.avatar_url into v_b_name,v_b_avatar
  from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id
  where coalesce(e.user_id,p.user_id)=p_match.player_b_user_id limit 1;
  if p_match.season_id is not null then
    select rating into v_a_rating from public.ms_esports_ratings where season_id=p_match.season_id and user_id=p_match.player_a_user_id and game_id=p_match.game_id;
    if v_a_rating is null then v_a_rating:=1000; end if;
    select rating into v_b_rating from public.ms_esports_ratings where season_id=p_match.season_id and user_id=p_match.player_b_user_id and game_id=p_match.game_id;
    if v_b_rating is null then v_b_rating:=1000; end if;
  end if;
  return jsonb_build_object(
    'id',p_match.id::text,'gameId',p_match.game_id,'platform',p_match.platform,'mode',p_match.mode,'teamSize',p_match.team_size,
    'status',p_match.status,'roomCode',p_match.room_code,'isHost',p_match.host_user_id=p_uid,'mySide',case when p_match.player_a_user_id=p_uid then 'A' else 'B' end,
    'playerA',jsonb_build_object('userId',p_match.player_a_user_id::text,'displayName',coalesce(v_a_name,'Gamer'),'avatarUrl',v_a_avatar,'rating',coalesce(p_match.mmr_a_after,p_match.mmr_a_before,v_a_rating,1000)),
    'playerB',jsonb_build_object('userId',p_match.player_b_user_id::text,'displayName',coalesce(v_b_name,'Gamer'),'avatarUrl',v_b_avatar,'rating',coalesce(p_match.mmr_b_after,p_match.mmr_b_before,v_b_rating,1000)),
    'reportA',p_match.report_a,'reportB',p_match.report_b,'finalScoreA',p_match.final_score_a,'finalScoreB',p_match.final_score_b,
    'winnerUserId',case when p_match.winner_user_id is null then null else p_match.winner_user_id::text end,
    'mmrABefore',p_match.mmr_a_before,'mmrAAfter',p_match.mmr_a_after,'mmrBBefore',p_match.mmr_b_before,'mmrBAfter',p_match.mmr_b_after,
    'createdAt',p_match.created_at,'updatedAt',p_match.updated_at,'confirmedAt',p_match.confirmed_at
  );
end $$;

create or replace function public.ms_esports_get_or_create_competitive_match() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=auth.uid(); v_me public.ms_esports_matchmaking_queue; v_other public.ms_esports_matchmaking_queue;
  v_key text; v_a uuid; v_b uuid; v_match public.ms_esports_competitive_matches; v_season uuid:=public.ms_esports_v4_active_season_id();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_me from public.ms_esports_matchmaking_queue where user_id=v_uid and status='matched' and matched_with_user_id is not null;
  if not found then return null; end if;
  select * into v_other from public.ms_esports_matchmaking_queue where user_id=v_me.matched_with_user_id and status='matched' and matched_with_user_id=v_uid;
  if not found then return null; end if;
  v_key:=least(v_me.id::text,v_other.id::text)||':'||greatest(v_me.id::text,v_other.id::text);
  if v_uid::text < v_me.matched_with_user_id::text then v_a:=v_uid; v_b:=v_me.matched_with_user_id; else v_a:=v_me.matched_with_user_id; v_b:=v_uid; end if;
  insert into public.ms_esports_competitive_matches(source_pair_key,season_id,game_id,platform,mode,team_size,player_a_user_id,player_b_user_id,host_user_id,status)
  values(v_key,v_season,v_me.game_id,case when v_me.platform=v_other.platform then v_me.platform else 'crossplay' end,v_me.mode,v_me.team_size,v_a,v_b,v_a,'matched')
  on conflict(source_pair_key) do nothing;
  select * into v_match from public.ms_esports_competitive_matches where source_pair_key=v_key;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_get_competitive_match() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches
  where player_a_user_id=v_uid or player_b_user_id=v_uid
  order by updated_at desc limit 1;
  if not found then return null; end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_claim_competitive_room(p_match_id uuid,p_room_code text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_code text:=upper(trim(coalesce(p_room_code,''))); v_other uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_code='' or length(v_code)>32 then raise exception 'ROOM_CODE_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_match.host_user_id<>v_uid and v_match.room_code is null then raise exception 'HOST_ONLY'; end if;
  if v_match.room_code is null then
    update public.ms_esports_competitive_matches set room_code=v_code,status='room_ready',updated_at=now() where id=v_match.id returning * into v_match;
    v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
    perform public.ms_esports_v4_notify(v_other,'ranked_room_ready','Salon compétitif prêt','Ton salon E-SPORTS classé est prêt. Code : '||v_code,jsonb_build_object('matchId',v_match.id::text,'roomCode',v_code,'gameId',v_match.game_id));
  elsif v_match.room_code<>v_code then
    raise exception 'ROOM_ALREADY_CLAIMED';
  end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_submit_competitive_result(p_match_id uuid,p_score_a integer,p_score_b integer) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_score_a integer:=greatest(0,least(coalesce(p_score_a,0),999)); v_score_b integer:=greatest(0,least(coalesce(p_score_b,0),999));
  v_ra integer:=1000; v_rb integer:=1000; v_ea numeric; v_eb numeric; v_sa numeric; v_sb numeric; v_new_a integer; v_new_b integer; v_winner uuid; v_season uuid;
  v_a_report_a integer; v_a_report_b integer; v_b_report_a integer; v_b_report_b integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_match.status='cancelled' then raise exception 'MATCH_CANCELLED'; end if;
  if v_match.status='confirmed' then return public.ms_esports_v5_match_json(v_match,v_uid); end if;

  if v_uid=v_match.player_a_user_id then
    update public.ms_esports_competitive_matches set report_a=jsonb_build_object('scoreA',v_score_a,'scoreB',v_score_b,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v_match.id returning * into v_match;
  else
    update public.ms_esports_competitive_matches set report_b=jsonb_build_object('scoreA',v_score_a,'scoreB',v_score_b,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v_match.id returning * into v_match;
  end if;

  if v_match.report_a is not null and v_match.report_b is not null then
    v_a_report_a:=coalesce((v_match.report_a->>'scoreA')::integer,-1); v_a_report_b:=coalesce((v_match.report_a->>'scoreB')::integer,-1);
    v_b_report_a:=coalesce((v_match.report_b->>'scoreA')::integer,-1); v_b_report_b:=coalesce((v_match.report_b->>'scoreB')::integer,-1);
    if v_a_report_a=v_b_report_a and v_a_report_b=v_b_report_b then
      v_season:=coalesce(v_match.season_id,public.ms_esports_v4_active_season_id());
      insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_a_user_id,v_match.game_id) on conflict do nothing;
      insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_b_user_id,v_match.game_id) on conflict do nothing;
      select rating into v_ra from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_a_user_id and game_id=v_match.game_id for update;
      select rating into v_rb from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_b_user_id and game_id=v_match.game_id for update;
      v_ea:=1.0/(1.0+power(10.0,(v_rb-v_ra)/400.0)); v_eb:=1.0-v_ea;
      if v_score_a>v_score_b then v_sa:=1; v_sb:=0; v_winner:=v_match.player_a_user_id;
      elsif v_score_b>v_score_a then v_sa:=0; v_sb:=1; v_winner:=v_match.player_b_user_id;
      else v_sa:=0.5; v_sb:=0.5; v_winner:=null; end if;
      v_new_a:=greatest(100,least(5000,round(v_ra+32*(v_sa-v_ea))::integer));
      v_new_b:=greatest(100,least(5000,round(v_rb+32*(v_sb-v_eb))::integer));
      update public.ms_esports_ratings set rating=v_new_a,matches=matches+1,wins=wins+case when v_sa=1 then 1 else 0 end,losses=losses+case when v_sa=0 then 1 else 0 end,draws=draws+case when v_sa=.5 then 1 else 0 end,last_match_at=now(),updated_at=now() where season_id=v_season and user_id=v_match.player_a_user_id and game_id=v_match.game_id;
      update public.ms_esports_ratings set rating=v_new_b,matches=matches+1,wins=wins+case when v_sb=1 then 1 else 0 end,losses=losses+case when v_sb=0 then 1 else 0 end,draws=draws+case when v_sb=.5 then 1 else 0 end,last_match_at=now(),updated_at=now() where season_id=v_season and user_id=v_match.player_b_user_id and game_id=v_match.game_id;
      update public.ms_esports_competitive_matches set season_id=v_season,status='confirmed',final_score_a=v_score_a,final_score_b=v_score_b,winner_user_id=v_winner,mmr_a_before=v_ra,mmr_a_after=v_new_a,mmr_b_before=v_rb,mmr_b_after=v_new_b,confirmed_at=now(),updated_at=now() where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||v_new_a,jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',v_new_a));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||v_new_b,jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',v_new_b));
    else
      update public.ms_esports_competitive_matches set status='disputed',updated_at=now() where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie pour obtenir le même résultat.',jsonb_build_object('matchId',v_match.id::text));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie pour obtenir le même résultat.',jsonb_build_object('matchId',v_match.id::text));
    end if;
  end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_mmr_leaderboard(p_game_id text,p_limit integer default 50)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with season as (
    select id,name,slug from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1
  ), ranked as (
    select r.*,row_number() over(order by r.rating desc,r.matches desc,r.wins desc,r.user_id)::int as position,s.name as season_name,s.slug as season_slug
    from public.ms_esports_ratings r join season s on s.id=r.season_id
    where r.game_id=trim(p_game_id)
  )
  select jsonb_build_object('position',r.position,'userId',r.user_id::text,'displayName',coalesce(e.display_name,p.display_name,'Gamer'),'avatarUrl',p.avatar_url,'countryCode',coalesce(e.country_code,p.country_code),'gameId',r.game_id,'rating',r.rating,'matches',r.matches,'wins',r.wins,'losses',r.losses,'draws',r.draws,'seasonName',r.season_name,'seasonSlug',r.season_slug)
  from ranked r left join public.ms_esports_profiles e on e.user_id=r.user_id left join public.ms_public_profiles p on p.user_id=r.user_id
  where auth.uid() is not null order by r.position limit greatest(1,least(coalesce(p_limit,50),100));
$$;

revoke all on function public.ms_esports_v5_match_json(public.ms_esports_competitive_matches,uuid) from public;
revoke all on function public.ms_esports_get_or_create_competitive_match() from public;
revoke all on function public.ms_esports_get_competitive_match() from public;
revoke all on function public.ms_esports_claim_competitive_room(uuid,text) from public;
revoke all on function public.ms_esports_submit_competitive_result(uuid,integer,integer) from public;
revoke all on function public.ms_esports_mmr_leaderboard(text,integer) from public;

grant execute on function public.ms_esports_get_or_create_competitive_match() to authenticated;
grant execute on function public.ms_esports_get_competitive_match() to authenticated;
grant execute on function public.ms_esports_claim_competitive_room(uuid,text) to authenticated;
grant execute on function public.ms_esports_submit_competitive_result(uuid,integer,integer) to authenticated;
grant execute on function public.ms_esports_mmr_leaderboard(text,integer) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_competitive_matches') then
    execute 'alter publication supabase_realtime add table public.ms_esports_competitive_matches';
  end if;
end $$;


-- ============================================================
-- 09/12  20260901_running_public_routes_v3.sql
-- ============================================================
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


-- ============================================================
-- 10/12  20260901191600_esports_ranked_progression_v6.sql
-- ============================================================
-- MULTISPORTS SCORING · E-SPORTS HUB V0.6 RANKED PROGRESSION
-- Divisions + 5 placement matches + MMR history + rematch + voluntary forfeit + dispute cases.
-- Requires E-SPORTS V0.3, V0.4 and V0.5 migrations.

create extension if not exists pgcrypto;

alter table public.ms_esports_ratings add column if not exists placement_matches integer not null default 0 check(placement_matches between 0 and 5);
alter table public.ms_esports_ratings add column if not exists peak_rating integer not null default 1000 check(peak_rating between 100 and 5000);
alter table public.ms_esports_ratings add column if not exists streak integer not null default 0;
alter table public.ms_esports_competitive_matches add column if not exists resolution_reason text not null default 'ranked';

update public.ms_esports_ratings
set placement_matches=least(5,matches), peak_rating=greatest(peak_rating,rating)
where placement_matches<>least(5,matches) or peak_rating<rating;

create table if not exists public.ms_esports_rating_history (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  match_id uuid references public.ms_esports_competitive_matches(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  result text not null check(result in ('win','loss','draw')),
  reason text not null default 'ranked',
  created_at timestamptz not null default now(),
  unique(match_id,user_id)
);
create index if not exists ms_esports_rating_history_user_idx on public.ms_esports_rating_history(user_id,game_id,created_at desc);

create table if not exists public.ms_esports_rematch_requests (
  match_id uuid not null references public.ms_esports_competitive_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(match_id,user_id)
);

create table if not exists public.ms_esports_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.ms_esports_competitive_matches(id) on delete cascade,
  opened_by_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'score_mismatch',
  details text not null default '',
  status text not null default 'open' check(status in ('open','resolved','rejected')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_esports_disputes_status_idx on public.ms_esports_disputes(status,updated_at desc);

alter table public.ms_esports_rating_history enable row level security;
alter table public.ms_esports_rematch_requests enable row level security;
alter table public.ms_esports_disputes enable row level security;

drop policy if exists ms_esports_rating_history_select on public.ms_esports_rating_history;
create policy ms_esports_rating_history_select on public.ms_esports_rating_history for select to authenticated using(user_id=auth.uid());

drop policy if exists ms_esports_rematch_select on public.ms_esports_rematch_requests;
create policy ms_esports_rematch_select on public.ms_esports_rematch_requests for select to authenticated using(
  exists(select 1 from public.ms_esports_competitive_matches m where m.id=match_id and (m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid()))
);

drop policy if exists ms_esports_disputes_select on public.ms_esports_disputes;
create policy ms_esports_disputes_select on public.ms_esports_disputes for select to authenticated using(
  exists(select 1 from public.ms_esports_competitive_matches m where m.id=match_id and (m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid()))
);

-- Backfill V0.5 confirmed matches so V0.6 charts are not empty after migration.
insert into public.ms_esports_rating_history(season_id,user_id,game_id,match_id,rating_before,rating_after,delta,result,reason,created_at)
select m.season_id,m.player_a_user_id,m.game_id,m.id,m.mmr_a_before,m.mmr_a_after,m.mmr_a_after-m.mmr_a_before,
  case when m.final_score_a>m.final_score_b then 'win' when m.final_score_a<m.final_score_b then 'loss' else 'draw' end,
  coalesce(m.resolution_reason,'ranked'),coalesce(m.confirmed_at,m.updated_at)
from public.ms_esports_competitive_matches m
where m.status='confirmed' and m.season_id is not null and m.mmr_a_before is not null and m.mmr_a_after is not null
on conflict(match_id,user_id) do nothing;
insert into public.ms_esports_rating_history(season_id,user_id,game_id,match_id,rating_before,rating_after,delta,result,reason,created_at)
select m.season_id,m.player_b_user_id,m.game_id,m.id,m.mmr_b_before,m.mmr_b_after,m.mmr_b_after-m.mmr_b_before,
  case when m.final_score_b>m.final_score_a then 'win' when m.final_score_b<m.final_score_a then 'loss' else 'draw' end,
  coalesce(m.resolution_reason,'ranked'),coalesce(m.confirmed_at,m.updated_at)
from public.ms_esports_competitive_matches m
where m.status='confirmed' and m.season_id is not null and m.mmr_b_before is not null and m.mmr_b_after is not null
on conflict(match_id,user_id) do nothing;

create or replace function public.ms_esports_division_v6(p_rating integer,p_matches integer)
returns jsonb language plpgsql immutable as $$
declare r integer:=greatest(100,least(coalesce(p_rating,1000),5000)); m integer:=greatest(0,coalesce(p_matches,0)); v_floor integer; v_next integer; v_id text; v_label text; v_next_label text; v_idx integer; v_progress integer;
begin
  if m<5 then return jsonb_build_object('division','placement','divisionLabel','PLACEMENT','divisionIndex',0,'progressPercent',least(100,m*20),'nextDivision','RANKED','nextRating',null); end if;
  if r<900 then v_id:='bronze'; v_label:='BRONZE'; v_floor:=100; v_next:=900; v_next_label:='SILVER'; v_idx:=1;
  elsif r<1050 then v_id:='silver'; v_label:='SILVER'; v_floor:=900; v_next:=1050; v_next_label:='GOLD'; v_idx:=2;
  elsif r<1200 then v_id:='gold'; v_label:='GOLD'; v_floor:=1050; v_next:=1200; v_next_label:='PLATINUM'; v_idx:=3;
  elsif r<1400 then v_id:='platinum'; v_label:='PLATINUM'; v_floor:=1200; v_next:=1400; v_next_label:='DIAMOND'; v_idx:=4;
  elsif r<1600 then v_id:='diamond'; v_label:='DIAMOND'; v_floor:=1400; v_next:=1600; v_next_label:='MASTER'; v_idx:=5;
  elsif r<1850 then v_id:='master'; v_label:='MASTER'; v_floor:=1600; v_next:=1850; v_next_label:='GRANDMASTER'; v_idx:=6;
  elsif r<2100 then v_id:='grandmaster'; v_label:='GRANDMASTER'; v_floor:=1850; v_next:=2100; v_next_label:='CHAMPION'; v_idx:=7;
  else return jsonb_build_object('division','champion','divisionLabel','CHAMPION','divisionIndex',8,'progressPercent',100,'nextDivision',null,'nextRating',null); end if;
  v_progress:=greatest(0,least(100,round((r-v_floor)::numeric/greatest(1,v_next-v_floor)*100)::integer));
  return jsonb_build_object('division',v_id,'divisionLabel',v_label,'divisionIndex',v_idx,'progressPercent',v_progress,'nextDivision',v_next_label,'nextRating',v_next);
end $$;

create or replace function public.ms_esports_v6_apply_rating(
  p_season uuid,p_user uuid,p_game text,p_opponent_rating integer,p_score numeric,p_match uuid,p_reason text
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_before integer:=1000; v_after integer; v_matches integer:=0; v_expected numeric; v_k integer; v_result text; v_streak integer:=0;
begin
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(p_season,p_user,p_game) on conflict do nothing;
  select rating,matches,streak into v_before,v_matches,v_streak from public.ms_esports_ratings where season_id=p_season and user_id=p_user and game_id=p_game for update;
  v_expected:=1.0/(1.0+power(10.0,(coalesce(p_opponent_rating,1000)-v_before)/400.0));
  v_k:=case when v_matches<5 then 48 else 32 end;
  v_after:=greatest(100,least(5000,round(v_before+v_k*(p_score-v_expected))::integer));
  v_result:=case when p_score>0.5 then 'win' when p_score<0.5 then 'loss' else 'draw' end;
  update public.ms_esports_ratings set
    rating=v_after,
    matches=matches+1,
    wins=wins+case when p_score=1 then 1 else 0 end,
    losses=losses+case when p_score=0 then 1 else 0 end,
    draws=draws+case when p_score=.5 then 1 else 0 end,
    placement_matches=least(5,placement_matches+1),
    peak_rating=greatest(peak_rating,v_after),
    streak=case when p_score=1 then greatest(1,streak+1) when p_score=0 then least(-1,streak-1) else 0 end,
    last_match_at=now(),updated_at=now()
  where season_id=p_season and user_id=p_user and game_id=p_game;
  insert into public.ms_esports_rating_history(season_id,user_id,game_id,match_id,rating_before,rating_after,delta,result,reason)
  values(p_season,p_user,p_game,p_match,v_before,v_after,v_after-v_before,v_result,coalesce(nullif(trim(p_reason),''),'ranked'))
  on conflict(match_id,user_id) do nothing;
  return jsonb_build_object('before',v_before,'after',v_after,'delta',v_after-v_before,'result',v_result);
end $$;

-- V0.6 upgrades the existing V0.5 submit RPC while preserving its API contract.
create or replace function public.ms_esports_submit_competitive_result(p_match_id uuid,p_score_a integer,p_score_b integer) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_score_a integer:=greatest(0,least(coalesce(p_score_a,0),999)); v_score_b integer:=greatest(0,least(coalesce(p_score_b,0),999));
  v_ra integer:=1000; v_rb integer:=1000; v_sa numeric; v_sb numeric; v_winner uuid; v_season uuid; v_res_a jsonb; v_res_b jsonb;
  v_a_report_a integer; v_a_report_b integer; v_b_report_a integer; v_b_report_b integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if exists(select 1 from public.ms_esports_disputes where match_id=v_match.id and status='open') then raise exception 'DISPUTE_OPEN'; end if;
  if v_match.status='cancelled' then raise exception 'MATCH_CANCELLED'; end if;
  if v_match.status='confirmed' then return public.ms_esports_v5_match_json(v_match,v_uid); end if;
  if v_uid=v_match.player_a_user_id then
    update public.ms_esports_competitive_matches set report_a=jsonb_build_object('scoreA',v_score_a,'scoreB',v_score_b,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v_match.id returning * into v_match;
  else
    update public.ms_esports_competitive_matches set report_b=jsonb_build_object('scoreA',v_score_a,'scoreB',v_score_b,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v_match.id returning * into v_match;
  end if;
  if v_match.report_a is not null and v_match.report_b is not null then
    v_a_report_a:=coalesce((v_match.report_a->>'scoreA')::integer,-1); v_a_report_b:=coalesce((v_match.report_a->>'scoreB')::integer,-1);
    v_b_report_a:=coalesce((v_match.report_b->>'scoreA')::integer,-1); v_b_report_b:=coalesce((v_match.report_b->>'scoreB')::integer,-1);
    if v_a_report_a=v_b_report_a and v_a_report_b=v_b_report_b then
      v_season:=coalesce(v_match.season_id,public.ms_esports_v4_active_season_id());
      insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_a_user_id,v_match.game_id) on conflict do nothing;
      insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_b_user_id,v_match.game_id) on conflict do nothing;
      select rating into v_ra from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_a_user_id and game_id=v_match.game_id for update;
      select rating into v_rb from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_b_user_id and game_id=v_match.game_id for update;
      if v_score_a>v_score_b then v_sa:=1; v_sb:=0; v_winner:=v_match.player_a_user_id;
      elsif v_score_b>v_score_a then v_sa:=0; v_sb:=1; v_winner:=v_match.player_b_user_id;
      else v_sa:=0.5; v_sb:=0.5; v_winner:=null; end if;
      v_res_a:=public.ms_esports_v6_apply_rating(v_season,v_match.player_a_user_id,v_match.game_id,v_rb,v_sa,v_match.id,'ranked');
      v_res_b:=public.ms_esports_v6_apply_rating(v_season,v_match.player_b_user_id,v_match.game_id,v_ra,v_sb,v_match.id,'ranked');
      update public.ms_esports_competitive_matches set season_id=v_season,status='confirmed',resolution_reason='ranked',final_score_a=v_score_a,final_score_b=v_score_b,winner_user_id=v_winner,
        mmr_a_before=(v_res_a->>'before')::integer,mmr_a_after=(v_res_a->>'after')::integer,mmr_b_before=(v_res_b->>'before')::integer,mmr_b_after=(v_res_b->>'after')::integer,confirmed_at=now(),updated_at=now()
      where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||(v_res_a->>'after'),jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',(v_res_a->>'after')::integer));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||(v_res_b->>'after'),jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',(v_res_b->>'after')::integer));
    else
      update public.ms_esports_competitive_matches set status='disputed',updated_at=now() where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie ou ouvrez un litige.',jsonb_build_object('matchId',v_match.id::text));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie ou ouvrez un litige.',jsonb_build_object('matchId',v_match.id::text));
    end if;
  end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_rating_profile_v6(p_game_id text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_game text:=trim(coalesce(p_game_id,'')); v_season public.ms_esports_seasons; v_rating public.ms_esports_ratings; v_div jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if; if v_game='' then raise exception 'GAME_REQUIRED'; end if;
  select * into v_season from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1;
  if not found then raise exception 'NO_ACTIVE_SEASON'; end if;
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season.id,v_uid,v_game) on conflict do nothing;
  select * into v_rating from public.ms_esports_ratings where season_id=v_season.id and user_id=v_uid and game_id=v_game;
  v_div:=public.ms_esports_division_v6(v_rating.rating,v_rating.matches);
  return v_div || jsonb_build_object('userId',v_uid::text,'gameId',v_game,'rating',v_rating.rating,'matches',v_rating.matches,'wins',v_rating.wins,'losses',v_rating.losses,'draws',v_rating.draws,
    'winRate',case when v_rating.matches=0 then 0 else round(v_rating.wins::numeric/v_rating.matches*100)::integer end,'placementsDone',least(5,v_rating.placement_matches),'placementsRemaining',greatest(0,5-v_rating.placement_matches),
    'peakRating',greatest(v_rating.peak_rating,v_rating.rating),'streak',v_rating.streak,'seasonName',v_season.name,'seasonSlug',v_season.slug);
end $$;

create or replace function public.ms_esports_rating_history_v6(p_game_id text,p_limit integer default 40)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',h.id::text,'matchId',h.match_id::text,'gameId',h.game_id,'ratingBefore',h.rating_before,'ratingAfter',h.rating_after,'delta',h.delta,'result',h.result,'reason',h.reason,'createdAt',h.created_at)
  from public.ms_esports_rating_history h where h.user_id=auth.uid() and h.game_id=trim(p_game_id) order by h.created_at desc limit greatest(5,least(coalesce(p_limit,40),100));
$$;

create or replace function public.ms_esports_ranked_history_v6(p_game_id text,p_limit integer default 30)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with x as (
    select m.*,
      case when m.player_a_user_id=auth.uid() then m.player_b_user_id else m.player_a_user_id end opponent_id,
      case when m.player_a_user_id=auth.uid() then 'A' else 'B' end my_side,
      case when m.player_a_user_id=auth.uid() then m.final_score_a else m.final_score_b end score_for,
      case when m.player_a_user_id=auth.uid() then m.final_score_b else m.final_score_a end score_against,
      case when m.player_a_user_id=auth.uid() then m.mmr_a_before else m.mmr_b_before end mmr_before,
      case when m.player_a_user_id=auth.uid() then m.mmr_a_after else m.mmr_b_after end mmr_after
    from public.ms_esports_competitive_matches m
    where (m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid()) and m.game_id=trim(p_game_id)
    order by m.created_at desc limit greatest(5,least(coalesce(p_limit,30),100))
  )
  select jsonb_build_object('matchId',x.id::text,'gameId',x.game_id,'opponentUserId',x.opponent_id::text,'opponentDisplayName',coalesce(e.display_name,p.display_name,'Gamer'),'opponentAvatarUrl',p.avatar_url,'mySide',x.my_side,
    'scoreFor',x.score_for,'scoreAgainst',x.score_against,
    'result',case when x.status='disputed' then 'disputed' when x.status='cancelled' then 'cancelled' when x.status<>'confirmed' then 'pending' when x.score_for>x.score_against then 'win' when x.score_for<x.score_against then 'loss' else 'draw' end,
    'mmrBefore',x.mmr_before,'mmrAfter',x.mmr_after,'status',x.status,'reason',coalesce(x.resolution_reason,'ranked'),'createdAt',x.created_at,'confirmedAt',x.confirmed_at)
  from x left join public.ms_esports_profiles e on e.user_id=x.opponent_id left join public.ms_public_profiles p on p.user_id=x.opponent_id;
$$;

create or replace function public.ms_esports_forfeit_competitive_match_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_season uuid; v_ra integer:=1000; v_rb integer:=1000; v_sa numeric; v_sb numeric; v_winner uuid; v_res_a jsonb; v_res_b jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if; if v_match.status in ('confirmed','cancelled') then raise exception 'MATCH_ALREADY_FINAL'; end if;
  if exists(select 1 from public.ms_esports_disputes where match_id=v_match.id and status='open') then raise exception 'DISPUTE_OPEN'; end if;
  v_season:=coalesce(v_match.season_id,public.ms_esports_v4_active_season_id());
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_a_user_id,v_match.game_id) on conflict do nothing;
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_b_user_id,v_match.game_id) on conflict do nothing;
  select rating into v_ra from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_a_user_id and game_id=v_match.game_id for update;
  select rating into v_rb from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_b_user_id and game_id=v_match.game_id for update;
  if v_uid=v_match.player_a_user_id then v_sa:=0; v_sb:=1; v_winner:=v_match.player_b_user_id; else v_sa:=1; v_sb:=0; v_winner:=v_match.player_a_user_id; end if;
  v_res_a:=public.ms_esports_v6_apply_rating(v_season,v_match.player_a_user_id,v_match.game_id,v_rb,v_sa,v_match.id,'forfeit');
  v_res_b:=public.ms_esports_v6_apply_rating(v_season,v_match.player_b_user_id,v_match.game_id,v_ra,v_sb,v_match.id,'forfeit');
  update public.ms_esports_competitive_matches set season_id=v_season,status='confirmed',resolution_reason='forfeit',final_score_a=case when v_winner=player_a_user_id then 1 else 0 end,final_score_b=case when v_winner=player_b_user_id then 1 else 0 end,winner_user_id=v_winner,
    mmr_a_before=(v_res_a->>'before')::integer,mmr_a_after=(v_res_a->>'after')::integer,mmr_b_before=(v_res_b->>'before')::integer,mmr_b_after=(v_res_b->>'after')::integer,confirmed_at=now(),updated_at=now()
  where id=v_match.id returning * into v_match;
  perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_forfeit','Match terminé par forfait','Le match classé a été finalisé par forfait.',jsonb_build_object('matchId',v_match.id::text));
  perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_forfeit','Match terminé par forfait','Le match classé a été finalisé par forfait.',jsonb_build_object('matchId',v_match.id::text));
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_rematch_state_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_other uuid; v_me boolean; v_them boolean; v_new uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid);
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
  select exists(select 1 from public.ms_esports_rematch_requests where match_id=p_match_id and user_id=v_uid) into v_me;
  select exists(select 1 from public.ms_esports_rematch_requests where match_id=p_match_id and user_id=v_other) into v_them;
  select id into v_new from public.ms_esports_competitive_matches where source_pair_key='rematch:'||p_match_id::text limit 1;
  return jsonb_build_object('matchId',p_match_id::text,'requestedByMe',v_me,'requestedByOpponent',v_them,'ready',v_new is not null,'newMatchId',case when v_new is null then null else v_new::text end);
end $$;

create or replace function public.ms_esports_request_rematch_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_other uuid; v_count integer; v_new public.ms_esports_competitive_matches;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and status='confirmed' and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'CONFIRMED_MATCH_REQUIRED'; end if;
  v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
  insert into public.ms_esports_rematch_requests(match_id,user_id) values(v_match.id,v_uid) on conflict do nothing;
  select count(*) into v_count from public.ms_esports_rematch_requests where match_id=v_match.id;
  if v_count=1 then perform public.ms_esports_v4_notify(v_other,'ranked_rematch_request','Demande de rematch','Ton adversaire souhaite rejouer immédiatement.',jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id)); end if;
  if v_count>=2 then
    insert into public.ms_esports_competitive_matches(source_pair_key,season_id,game_id,platform,mode,team_size,player_a_user_id,player_b_user_id,host_user_id,status,resolution_reason)
    values('rematch:'||v_match.id::text,public.ms_esports_v4_active_season_id(),v_match.game_id,v_match.platform,v_match.mode,v_match.team_size,v_match.player_a_user_id,v_match.player_b_user_id,
      case when v_match.host_user_id=v_match.player_a_user_id then v_match.player_b_user_id else v_match.player_a_user_id end,'matched','ranked')
    on conflict(source_pair_key) do nothing;
    select * into v_new from public.ms_esports_competitive_matches where source_pair_key='rematch:'||v_match.id::text;
    perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_rematch_ready','Rematch accepté','Les deux joueurs ont accepté. Nouvelle session créée.',jsonb_build_object('matchId',v_new.id::text,'gameId',v_new.game_id));
    perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_rematch_ready','Rematch accepté','Les deux joueurs ont accepté. Nouvelle session créée.',jsonb_build_object('matchId',v_new.id::text,'gameId',v_new.game_id));
  end if;
  return public.ms_esports_rematch_state_v6(v_match.id);
end $$;

create or replace function public.ms_esports_open_dispute_v6(p_match_id uuid,p_reason text,p_details text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_case public.ms_esports_disputes; v_other uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if; if v_match.status in ('confirmed','cancelled') then raise exception 'MATCH_ALREADY_FINAL'; end if;
  if length(trim(coalesce(p_details,'')))<3 then raise exception 'DETAILS_REQUIRED'; end if;
  insert into public.ms_esports_disputes(match_id,opened_by_user_id,reason,details,status) values(v_match.id,v_uid,left(coalesce(nullif(trim(p_reason),''),'other'),64),left(trim(p_details),1000),'open')
  on conflict(match_id) do update set opened_by_user_id=excluded.opened_by_user_id,reason=excluded.reason,details=excluded.details,status='open',resolution=null,updated_at=now() returning * into v_case;
  update public.ms_esports_competitive_matches set status='disputed',updated_at=now() where id=v_match.id;
  v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
  perform public.ms_esports_v4_notify(v_other,'ranked_dispute_open','Litige ouvert','Un dossier de litige a été ouvert sur votre match classé. Le MMR reste gelé.',jsonb_build_object('matchId',v_match.id::text,'disputeId',v_case.id::text));
  return jsonb_build_object('id',v_case.id::text,'matchId',v_case.match_id::text,'status',v_case.status,'reason',v_case.reason,'details',v_case.details,'openedByMe',v_case.opened_by_user_id=v_uid,'resolution',v_case.resolution,'createdAt',v_case.created_at,'updatedAt',v_case.updated_at);
end $$;

create or replace function public.ms_esports_withdraw_dispute_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_case public.ms_esports_disputes; v_match public.ms_esports_competitive_matches;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_case from public.ms_esports_disputes where match_id=p_match_id and status='open' and opened_by_user_id=v_uid for update;
  if not found then raise exception 'OPEN_OWN_DISPUTE_REQUIRED'; end if;
  update public.ms_esports_disputes set status='resolved',resolution='withdrawn_by_opener',updated_at=now() where id=v_case.id returning * into v_case;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id for update;
  update public.ms_esports_competitive_matches set status=case when v_match.report_a is not null or v_match.report_b is not null then 'pending_confirmation' when v_match.room_code is not null then 'room_ready' else 'matched' end,updated_at=now() where id=p_match_id;
  return jsonb_build_object('id',v_case.id::text,'matchId',v_case.match_id::text,'status',v_case.status,'reason',v_case.reason,'details',v_case.details,'openedByMe',true,'resolution',v_case.resolution,'createdAt',v_case.created_at,'updatedAt',v_case.updated_at);
end $$;

create or replace function public.ms_esports_list_disputes_v6(p_limit integer default 20)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',d.id::text,'matchId',d.match_id::text,'status',d.status,'reason',d.reason,'details',d.details,'openedByMe',d.opened_by_user_id=auth.uid(),'resolution',d.resolution,'createdAt',d.created_at,'updatedAt',d.updated_at)
  from public.ms_esports_disputes d join public.ms_esports_competitive_matches m on m.id=d.match_id
  where m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid() order by d.updated_at desc limit greatest(1,least(coalesce(p_limit,20),50));
$$;

revoke all on function public.ms_esports_division_v6(integer,integer) from public;
revoke all on function public.ms_esports_v6_apply_rating(uuid,uuid,text,integer,numeric,uuid,text) from public;
revoke all on function public.ms_esports_rating_profile_v6(text) from public;
revoke all on function public.ms_esports_rating_history_v6(text,integer) from public;
revoke all on function public.ms_esports_ranked_history_v6(text,integer) from public;
revoke all on function public.ms_esports_forfeit_competitive_match_v6(uuid) from public;
revoke all on function public.ms_esports_rematch_state_v6(uuid) from public;
revoke all on function public.ms_esports_request_rematch_v6(uuid) from public;
revoke all on function public.ms_esports_open_dispute_v6(uuid,text,text) from public;
revoke all on function public.ms_esports_withdraw_dispute_v6(uuid) from public;
revoke all on function public.ms_esports_list_disputes_v6(integer) from public;

grant execute on function public.ms_esports_rating_profile_v6(text) to authenticated;
grant execute on function public.ms_esports_rating_history_v6(text,integer) to authenticated;
grant execute on function public.ms_esports_ranked_history_v6(text,integer) to authenticated;
grant execute on function public.ms_esports_forfeit_competitive_match_v6(uuid) to authenticated;
grant execute on function public.ms_esports_rematch_state_v6(uuid) to authenticated;
grant execute on function public.ms_esports_request_rematch_v6(uuid) to authenticated;
grant execute on function public.ms_esports_open_dispute_v6(uuid,text,text) to authenticated;
grant execute on function public.ms_esports_withdraw_dispute_v6(uuid) to authenticated;
grant execute on function public.ms_esports_list_disputes_v6(integer) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_rating_history') then execute 'alter publication supabase_realtime add table public.ms_esports_rating_history'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_rematch_requests') then execute 'alter publication supabase_realtime add table public.ms_esports_rematch_requests'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_disputes') then execute 'alter publication supabase_realtime add table public.ms_esports_disputes'; end if;
end $$;


-- ============================================================
-- 11/12  20260902143000_online_community_pulse_v1.sql
-- ============================================================
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


-- ============================================================
-- 12/12  20260904_running_route_catalog_v1.sql
-- ============================================================
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


COMMIT;
