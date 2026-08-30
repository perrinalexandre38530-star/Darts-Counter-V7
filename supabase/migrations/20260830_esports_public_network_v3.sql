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
