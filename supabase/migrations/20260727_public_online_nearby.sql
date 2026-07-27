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
