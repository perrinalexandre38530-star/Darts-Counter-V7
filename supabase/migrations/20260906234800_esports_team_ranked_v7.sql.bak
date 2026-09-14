-- MULTISPORTS SCORING · E-SPORTS HUB V0.7 TEAM RANKED
-- Locked 2v2/3v3/5v5 rosters, captain-driven team matchmaking,
-- canonical team ranked matches, bilateral captain result confirmation,
-- team MMR + per-member team MMR, public team profiles and season leaderboards.
-- Requires E-SPORTS V0.3 -> V0.6 migrations first.

create extension if not exists pgcrypto;

create table if not exists public.ms_esports_team_ranked_rosters (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.ms_esports_seasons(id) on delete set null,
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  game_id text not null,
  platform text not null default 'crossplay',
  mode text not null default 'Ranked Team',
  region text not null default 'EU',
  team_size integer not null check(team_size between 2 and 10),
  captain_user_id uuid not null references auth.users(id) on delete cascade,
  locked_by_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'locked' check(status in ('locked','queued','matched','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_esports_team_rosters_team_idx on public.ms_esports_team_ranked_rosters(team_id,game_id,team_size,status,updated_at desc);
create index if not exists ms_esports_team_rosters_captain_idx on public.ms_esports_team_ranked_rosters(captain_user_id,status,updated_at desc);

create table if not exists public.ms_esports_team_ranked_roster_members (
  roster_id uuid not null references public.ms_esports_team_ranked_rosters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot integer not null check(slot between 1 and 10),
  created_at timestamptz not null default now(),
  primary key(roster_id,user_id),
  unique(roster_id,slot)
);
create index if not exists ms_esports_team_roster_members_user_idx on public.ms_esports_team_ranked_roster_members(user_id,roster_id);

create table if not exists public.ms_esports_team_matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null unique references public.ms_esports_team_ranked_rosters(id) on delete cascade,
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  game_id text not null,
  platform text not null default 'crossplay',
  mode text not null default 'Ranked Team',
  region text not null default 'EU',
  team_size integer not null check(team_size between 2 and 10),
  status text not null default 'searching' check(status in ('searching','matched','cancelled')),
  matched_queue_id uuid references public.ms_esports_team_matchmaking_queue(id) on delete set null,
  matched_at timestamptz,
  expires_at timestamptz not null default (now()+interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_esports_team_queue_lookup_idx on public.ms_esports_team_matchmaking_queue(game_id,team_size,status,mode,region,created_at);

create table if not exists public.ms_esports_team_ratings (
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  game_id text not null,
  team_size integer not null check(team_size between 2 and 10),
  rating integer not null default 1000 check(rating between 100 and 5000),
  peak_rating integer not null default 1000 check(peak_rating between 100 and 5000),
  placement_matches integer not null default 0 check(placement_matches between 0 and 5),
  matches integer not null default 0 check(matches>=0),
  wins integer not null default 0 check(wins>=0),
  losses integer not null default 0 check(losses>=0),
  draws integer not null default 0 check(draws>=0),
  streak integer not null default 0,
  last_match_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(season_id,team_id,game_id,team_size)
);
create index if not exists ms_esports_team_ratings_rank_idx on public.ms_esports_team_ratings(season_id,game_id,team_size,rating desc,matches desc);

create table if not exists public.ms_esports_team_member_ratings (
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  team_size integer not null check(team_size between 2 and 10),
  rating integer not null default 1000 check(rating between 100 and 5000),
  peak_rating integer not null default 1000 check(peak_rating between 100 and 5000),
  placement_matches integer not null default 0 check(placement_matches between 0 and 5),
  matches integer not null default 0 check(matches>=0),
  wins integer not null default 0 check(wins>=0),
  losses integer not null default 0 check(losses>=0),
  draws integer not null default 0 check(draws>=0),
  streak integer not null default 0,
  last_match_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(season_id,user_id,game_id,team_size)
);
create index if not exists ms_esports_team_member_ratings_idx on public.ms_esports_team_member_ratings(season_id,game_id,team_size,rating desc);

create table if not exists public.ms_esports_team_competitive_matches (
  id uuid primary key default gen_random_uuid(),
  source_pair_key text not null unique,
  season_id uuid references public.ms_esports_seasons(id) on delete set null,
  game_id text not null,
  platform text not null default 'crossplay',
  mode text not null default 'Ranked Team',
  region text not null default 'EU',
  team_size integer not null check(team_size between 2 and 10),
  team_a_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  team_b_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  roster_a_id uuid not null references public.ms_esports_team_ranked_rosters(id) on delete restrict,
  roster_b_id uuid not null references public.ms_esports_team_ranked_rosters(id) on delete restrict,
  captain_a_user_id uuid not null references auth.users(id) on delete restrict,
  captain_b_user_id uuid not null references auth.users(id) on delete restrict,
  host_captain_user_id uuid not null references auth.users(id) on delete restrict,
  room_code text,
  status text not null default 'matched' check(status in ('matched','room_ready','pending_confirmation','confirmed','disputed','cancelled')),
  report_a jsonb,
  report_b jsonb,
  final_score_a integer,
  final_score_b integer,
  winner_team_id uuid references public.ms_esports_teams(id) on delete set null,
  mmr_a_before integer,
  mmr_a_after integer,
  mmr_b_before integer,
  mmr_b_after integer,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(team_a_id<>team_b_id)
);
create index if not exists ms_esports_team_matches_a_idx on public.ms_esports_team_competitive_matches(team_a_id,updated_at desc);
create index if not exists ms_esports_team_matches_b_idx on public.ms_esports_team_competitive_matches(team_b_id,updated_at desc);
create index if not exists ms_esports_team_matches_game_idx on public.ms_esports_team_competitive_matches(game_id,team_size,status,updated_at desc);

create table if not exists public.ms_esports_team_rating_history (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  game_id text not null,
  team_size integer not null,
  match_id uuid not null references public.ms_esports_team_competitive_matches(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  result text not null check(result in ('win','loss','draw')),
  created_at timestamptz not null default now(),
  unique(match_id,team_id)
);

create table if not exists public.ms_esports_team_member_rating_history (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  game_id text not null,
  team_size integer not null,
  match_id uuid not null references public.ms_esports_team_competitive_matches(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  result text not null check(result in ('win','loss','draw')),
  created_at timestamptz not null default now(),
  unique(match_id,user_id)
);

alter table public.ms_esports_team_ranked_rosters enable row level security;
alter table public.ms_esports_team_ranked_roster_members enable row level security;
alter table public.ms_esports_team_matchmaking_queue enable row level security;
alter table public.ms_esports_team_ratings enable row level security;
alter table public.ms_esports_team_member_ratings enable row level security;
alter table public.ms_esports_team_competitive_matches enable row level security;
alter table public.ms_esports_team_rating_history enable row level security;
alter table public.ms_esports_team_member_rating_history enable row level security;

drop policy if exists ms_esports_team_rosters_select_v7 on public.ms_esports_team_ranked_rosters;
create policy ms_esports_team_rosters_select_v7 on public.ms_esports_team_ranked_rosters for select to authenticated using(
  exists(select 1 from public.ms_esports_team_ranked_roster_members rm where rm.roster_id=public.ms_esports_team_ranked_rosters.id and rm.user_id=auth.uid())
  or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=public.ms_esports_team_ranked_rosters.team_id and tm.user_id=auth.uid() and tm.status='active')
);
drop policy if exists ms_esports_team_roster_members_select_v7 on public.ms_esports_team_ranked_roster_members;
create policy ms_esports_team_roster_members_select_v7 on public.ms_esports_team_ranked_roster_members for select to authenticated using(user_id=auth.uid());
drop policy if exists ms_esports_team_queue_select_v7 on public.ms_esports_team_matchmaking_queue;
create policy ms_esports_team_queue_select_v7 on public.ms_esports_team_matchmaking_queue for select to authenticated using(
  exists(select 1 from public.ms_esports_team_ranked_roster_members rm where rm.roster_id=public.ms_esports_team_matchmaking_queue.roster_id and rm.user_id=auth.uid())
);
drop policy if exists ms_esports_team_ratings_select_v7 on public.ms_esports_team_ratings;
create policy ms_esports_team_ratings_select_v7 on public.ms_esports_team_ratings for select to authenticated using(true);
drop policy if exists ms_esports_team_member_ratings_select_v7 on public.ms_esports_team_member_ratings;
create policy ms_esports_team_member_ratings_select_v7 on public.ms_esports_team_member_ratings for select to authenticated using(user_id=auth.uid());
drop policy if exists ms_esports_team_matches_select_v7 on public.ms_esports_team_competitive_matches;
create policy ms_esports_team_matches_select_v7 on public.ms_esports_team_competitive_matches for select to authenticated using(
  exists(select 1 from public.ms_esports_team_ranked_roster_members rm where rm.roster_id in (public.ms_esports_team_competitive_matches.roster_a_id,public.ms_esports_team_competitive_matches.roster_b_id) and rm.user_id=auth.uid())
);
drop policy if exists ms_esports_team_rating_history_select_v7 on public.ms_esports_team_rating_history;
create policy ms_esports_team_rating_history_select_v7 on public.ms_esports_team_rating_history for select to authenticated using(
  exists(select 1 from public.ms_esports_team_members tm where tm.team_id=public.ms_esports_team_rating_history.team_id and tm.user_id=auth.uid() and tm.status='active')
  or exists(select 1 from public.ms_esports_teams t where t.id=public.ms_esports_team_rating_history.team_id and t.visibility='public')
);
drop policy if exists ms_esports_team_member_rating_history_select_v7 on public.ms_esports_team_member_rating_history;
create policy ms_esports_team_member_rating_history_select_v7 on public.ms_esports_team_member_rating_history for select to authenticated using(user_id=auth.uid());

create or replace function public.ms_esports_v7_name(p_uid uuid) returns text
language sql stable security definer set search_path=public,auth,extensions as $$
  select coalesce(e.display_name,p.display_name,'Gamer')
  from (select p_uid as uid) x
  left join public.ms_esports_profiles e on e.user_id=x.uid
  left join public.ms_public_profiles p on p.user_id=x.uid;
$$;

create or replace function public.ms_esports_v7_avatar(p_uid uuid) returns text
language sql stable security definer set search_path=public,auth,extensions as $$
  select p.avatar_url from public.ms_public_profiles p where p.user_id=p_uid;
$$;

create or replace function public.ms_esports_team_roster_json_v7(p_roster public.ms_esports_team_ranked_rosters,p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,extensions as $$
declare v_team public.ms_esports_teams; v_members jsonb:='[]'::jsonb; v_season uuid:=coalesce(p_roster.season_id,public.ms_esports_v4_active_season_id());
begin
  select * into v_team from public.ms_esports_teams where id=p_roster.team_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId',rm.user_id::text,'displayName',public.ms_esports_v7_name(rm.user_id),'avatarUrl',public.ms_esports_v7_avatar(rm.user_id),
    'role',case when rm.user_id=p_roster.captain_user_id then 'captain' else coalesce(tm.role,'member') end,
    'rating',coalesce(r.rating,1000)
  ) order by rm.slot),'[]'::jsonb) into v_members
  from public.ms_esports_team_ranked_roster_members rm
  left join public.ms_esports_team_members tm on tm.team_id=p_roster.team_id and tm.user_id=rm.user_id and tm.status='active'
  left join public.ms_esports_team_member_ratings r on r.season_id=v_season and r.user_id=rm.user_id and r.game_id=p_roster.game_id and r.team_size=p_roster.team_size
  where rm.roster_id=p_roster.id;
  return jsonb_build_object('id',p_roster.id::text,'teamId',p_roster.team_id::text,'teamName',coalesce(v_team.name,'Team'),'teamTag',coalesce(v_team.tag,''),
    'gameId',p_roster.game_id,'platform',p_roster.platform,'mode',p_roster.mode,'region',p_roster.region,'teamSize',p_roster.team_size,
    'captainUserId',p_roster.captain_user_id::text,'status',p_roster.status,'members',v_members,'createdAt',p_roster.created_at,'updatedAt',p_roster.updated_at);
end $$;

create or replace function public.ms_esports_team_ranked_my_teams_v7() returns setof jsonb
language sql security definer set search_path=public,auth,extensions as $$
  with my as (
    select t.*,tm.role as my_role,(tm.role in ('owner','captain')) as can_manage
    from public.ms_esports_teams t join public.ms_esports_team_members tm on tm.team_id=t.id
    where tm.user_id=auth.uid() and tm.status='active'
  )
  select jsonb_build_object('teamId',m.id::text,'name',m.name,'tag',m.tag,'gameIds',to_jsonb(m.game_ids),'visibility',m.visibility,'myRole',m.my_role,'canManage',m.can_manage,
    'members',coalesce((select jsonb_agg(jsonb_build_object('userId',x.user_id::text,'displayName',public.ms_esports_v7_name(x.user_id),'avatarUrl',public.ms_esports_v7_avatar(x.user_id),'role',x.role,
      'rating',coalesce((select mr.rating from public.ms_esports_team_member_ratings mr where mr.user_id=x.user_id order by mr.updated_at desc limit 1),1000)) order by case x.role when 'owner' then 0 when 'captain' then 1 when 'officer' then 2 else 3 end,public.ms_esports_v7_name(x.user_id))
      from public.ms_esports_team_members x where x.team_id=m.id and x.status='active'),'[]'::jsonb))
  from my m order by m.updated_at desc;
$$;

create or replace function public.ms_esports_lock_team_roster_v7(
  p_team_id uuid,p_game_id text,p_platform text,p_mode text,p_region text,p_team_size integer,p_captain_user_id uuid,p_member_user_ids uuid[]
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_role text; v_size integer:=greatest(2,least(coalesce(p_team_size,2),10)); v_ids uuid[]; v_count integer; v_captain_role text; v_roster public.ms_esports_team_ranked_rosters; v_slot integer:=0; v_member uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_role from public.ms_esports_team_members where team_id=p_team_id and user_id=v_uid and status='active';
  if coalesce(v_role,'') not in ('owner','captain') then raise exception 'CAPTAIN_OR_OWNER_REQUIRED'; end if;
  if nullif(trim(coalesce(p_game_id,'')),'') is null then raise exception 'GAME_REQUIRED'; end if;
  select array_agg(x order by x::text) into v_ids from (select distinct unnest(coalesce(p_member_user_ids,'{}'::uuid[])) x) q;
  if coalesce(cardinality(v_ids),0)<>v_size then raise exception 'ROSTER_SIZE_MISMATCH'; end if;
  select count(*) into v_count from public.ms_esports_team_members tm where tm.team_id=p_team_id and tm.status='active' and tm.user_id=any(v_ids);
  if v_count<>v_size then raise exception 'ROSTER_MEMBER_NOT_ACTIVE'; end if;
  if not (p_captain_user_id=any(v_ids)) then raise exception 'CAPTAIN_MUST_BE_IN_ROSTER'; end if;
  select role into v_captain_role from public.ms_esports_team_members where team_id=p_team_id and user_id=p_captain_user_id and status='active';
  if coalesce(v_captain_role,'') not in ('owner','captain') then raise exception 'LOCKED_CAPTAIN_ROLE_REQUIRED'; end if;

  update public.ms_esports_team_matchmaking_queue q set status='cancelled',updated_at=now()
  where q.status='searching' and q.roster_id in (select r.id from public.ms_esports_team_ranked_rosters r where r.team_id=p_team_id and r.game_id=trim(p_game_id) and r.team_size=v_size);
  update public.ms_esports_team_ranked_rosters set status='archived',updated_at=now()
  where team_id=p_team_id and game_id=trim(p_game_id) and team_size=v_size and status in ('locked','queued');

  insert into public.ms_esports_team_ranked_rosters(season_id,team_id,game_id,platform,mode,region,team_size,captain_user_id,locked_by_user_id,status)
  values(public.ms_esports_v4_active_season_id(),p_team_id,trim(p_game_id),lower(coalesce(nullif(trim(p_platform),''),'crossplay')),coalesce(nullif(trim(p_mode),''),'Ranked Team'),upper(coalesce(nullif(trim(p_region),''),'EU')),v_size,p_captain_user_id,v_uid,'locked') returning * into v_roster;
  foreach v_member in array v_ids loop v_slot:=v_slot+1; insert into public.ms_esports_team_ranked_roster_members(roster_id,user_id,slot) values(v_roster.id,v_member,v_slot); end loop;
  return public.ms_esports_team_roster_json_v7(v_roster,v_uid);
end $$;

create or replace function public.ms_esports_get_team_roster_v7(p_team_id uuid default null,p_game_id text default null) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_team_ranked_rosters;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select r.* into v from public.ms_esports_team_ranked_rosters r
  where r.status<>'archived' and (p_team_id is null or r.team_id=p_team_id) and (nullif(trim(coalesce(p_game_id,'')),'') is null or r.game_id=trim(p_game_id))
    and (exists(select 1 from public.ms_esports_team_ranked_roster_members rm where rm.roster_id=r.id and rm.user_id=v_uid)
      or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=r.team_id and tm.user_id=v_uid and tm.status='active'))
  order by case r.status when 'matched' then 0 when 'queued' then 1 else 2 end,r.updated_at desc limit 1;
  if not found then return null; end if; return public.ms_esports_team_roster_json_v7(v,v_uid);
end $$;

create or replace function public.ms_esports_archive_team_roster_v7(p_roster_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_team_ranked_rosters; v_role text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v from public.ms_esports_team_ranked_rosters where id=p_roster_id for update; if not found then raise exception 'ROSTER_NOT_FOUND'; end if;
  select role into v_role from public.ms_esports_team_members where team_id=v.team_id and user_id=v_uid and status='active';
  if coalesce(v_role,'') not in ('owner','captain') then raise exception 'CAPTAIN_OR_OWNER_REQUIRED'; end if;
  if v.status='matched' then raise exception 'MATCHED_ROSTER_LOCKED'; end if;
  update public.ms_esports_team_matchmaking_queue set status='cancelled',updated_at=now() where roster_id=v.id and status='searching';
  update public.ms_esports_team_ranked_rosters set status='archived',updated_at=now() where id=v.id;
  return jsonb_build_object('ok',true,'rosterId',v.id::text);
end $$;

create or replace function public.ms_esports_team_queue_json_v7(p_q public.ms_esports_team_matchmaking_queue) returns jsonb
language sql stable security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',p_q.id::text,'rosterId',p_q.roster_id::text,'teamId',p_q.team_id::text,'gameId',p_q.game_id,'platform',p_q.platform,'mode',p_q.mode,'region',p_q.region,'teamSize',p_q.team_size,'status',p_q.status,
    'matchedQueueId',case when p_q.matched_queue_id is null then null else p_q.matched_queue_id::text end,
    'matchId',(select m.id::text from public.ms_esports_team_competitive_matches m where m.source_pair_key=least(p_q.id::text,coalesce(p_q.matched_queue_id::text,p_q.id::text))||':'||greatest(p_q.id::text,coalesce(p_q.matched_queue_id::text,p_q.id::text)) limit 1),
    'createdAt',p_q.created_at,'updatedAt',p_q.updated_at);
$$;

create or replace function public.ms_esports_join_team_queue_v7(p_roster_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_roster public.ms_esports_team_ranked_rosters; v_me public.ms_esports_team_matchmaking_queue; v_other public.ms_esports_team_matchmaking_queue; v_match public.ms_esports_team_competitive_matches; v_key text; v_a public.ms_esports_team_matchmaking_queue; v_b public.ms_esports_team_matchmaking_queue; v_season uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_roster from public.ms_esports_team_ranked_rosters where id=p_roster_id for update; if not found then raise exception 'ROSTER_NOT_FOUND'; end if;
  if v_roster.captain_user_id<>v_uid then raise exception 'LOCKED_CAPTAIN_REQUIRED'; end if;
  if v_roster.status not in ('locked','queued') then raise exception 'ROSTER_NOT_QUEUEABLE'; end if;
  if (select count(*) from public.ms_esports_team_ranked_roster_members where roster_id=v_roster.id)<>v_roster.team_size then raise exception 'ROSTER_INCOMPLETE'; end if;

  insert into public.ms_esports_team_matchmaking_queue(roster_id,team_id,game_id,platform,mode,region,team_size,status,expires_at,updated_at)
  values(v_roster.id,v_roster.team_id,v_roster.game_id,v_roster.platform,v_roster.mode,v_roster.region,v_roster.team_size,'searching',now()+interval '2 hours',now())
  on conflict(roster_id) do update set status='searching',matched_queue_id=null,matched_at=null,expires_at=now()+interval '2 hours',updated_at=now()
  returning * into v_me;
  update public.ms_esports_team_ranked_rosters set status='queued',updated_at=now() where id=v_roster.id;

  select q.* into v_other from public.ms_esports_team_matchmaking_queue q
  where q.id<>v_me.id and q.team_id<>v_me.team_id and q.status='searching' and q.expires_at>now()
    and q.game_id=v_me.game_id and q.team_size=v_me.team_size and lower(q.mode)=lower(v_me.mode) and upper(q.region)=upper(v_me.region)
    and (q.platform=v_me.platform or q.platform='crossplay' or v_me.platform='crossplay')
  order by q.created_at asc for update skip locked limit 1;

  if found then
    if v_me.id::text < v_other.id::text then v_a:=v_me; v_b:=v_other; else v_a:=v_other; v_b:=v_me; end if;
    v_key:=v_a.id::text||':'||v_b.id::text; v_season:=public.ms_esports_v4_active_season_id();
    insert into public.ms_esports_team_competitive_matches(source_pair_key,season_id,game_id,platform,mode,region,team_size,team_a_id,team_b_id,roster_a_id,roster_b_id,captain_a_user_id,captain_b_user_id,host_captain_user_id,status)
    select v_key,v_season,v_a.game_id,case when v_a.platform=v_b.platform then v_a.platform else 'crossplay' end,v_a.mode,v_a.region,v_a.team_size,v_a.team_id,v_b.team_id,v_a.roster_id,v_b.roster_id,ra.captain_user_id,rb.captain_user_id,ra.captain_user_id,'matched'
    from public.ms_esports_team_ranked_rosters ra,public.ms_esports_team_ranked_rosters rb where ra.id=v_a.roster_id and rb.id=v_b.roster_id
    on conflict(source_pair_key) do nothing;
    select * into v_match from public.ms_esports_team_competitive_matches where source_pair_key=v_key;
    update public.ms_esports_team_matchmaking_queue set status='matched',matched_queue_id=case when id=v_a.id then v_b.id else v_a.id end,matched_at=now(),updated_at=now() where id in(v_a.id,v_b.id);
    update public.ms_esports_team_ranked_rosters set status='matched',updated_at=now() where id in(v_a.roster_id,v_b.roster_id);
    perform public.ms_esports_v4_notify(rm.user_id,'team_ranked_match_found','TEAM RANKED · Match trouvé','Une équipe adverse a été trouvée. Le salon compétitif va être créé automatiquement.',jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'teamSize',v_match.team_size))
      from public.ms_esports_team_ranked_roster_members rm where rm.roster_id in(v_a.roster_id,v_b.roster_id);
    select * into v_me from public.ms_esports_team_matchmaking_queue where id=v_me.id;
  end if;
  return public.ms_esports_team_queue_json_v7(v_me);
end $$;

create or replace function public.ms_esports_get_team_queue_v7() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_team_matchmaking_queue;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select q.* into v from public.ms_esports_team_matchmaking_queue q join public.ms_esports_team_ranked_roster_members rm on rm.roster_id=q.roster_id
  where rm.user_id=v_uid and q.status in ('searching','matched') order by case q.status when 'matched' then 0 else 1 end,q.updated_at desc limit 1;
  if not found then return null; end if; return public.ms_esports_team_queue_json_v7(v);
end $$;

create or replace function public.ms_esports_leave_team_queue_v7() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_q public.ms_esports_team_matchmaking_queue; v_roster public.ms_esports_team_ranked_rosters;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select q,r into v_q,v_roster from public.ms_esports_team_matchmaking_queue q join public.ms_esports_team_ranked_rosters r on r.id=q.roster_id where r.captain_user_id=v_uid and q.status='searching' order by q.updated_at desc limit 1 for update of q,r;
  if not found then return jsonb_build_object('ok',true); end if;
  update public.ms_esports_team_matchmaking_queue set status='cancelled',updated_at=now() where id=v_q.id;
  update public.ms_esports_team_ranked_rosters set status='locked',updated_at=now() where id=v_q.roster_id;
  return jsonb_build_object('ok',true,'queueId',v_q.id::text);
end $$;

create or replace function public.ms_esports_team_match_json_v7(p_match public.ms_esports_team_competitive_matches,p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,extensions as $$
declare v_a public.ms_esports_teams; v_b public.ms_esports_teams; v_members_a jsonb:='[]'::jsonb; v_members_b jsonb:='[]'::jsonb; v_ra integer:=1000; v_rb integer:=1000; v_my_side text; v_can_report boolean:=false;
begin
  select * into v_a from public.ms_esports_teams where id=p_match.team_a_id; select * into v_b from public.ms_esports_teams where id=p_match.team_b_id;
  select coalesce(rating,1000) into v_ra from public.ms_esports_team_ratings where season_id=p_match.season_id and team_id=p_match.team_a_id and game_id=p_match.game_id and team_size=p_match.team_size;
  if v_ra is null then v_ra:=1000; end if;
  select coalesce(rating,1000) into v_rb from public.ms_esports_team_ratings where season_id=p_match.season_id and team_id=p_match.team_b_id and game_id=p_match.game_id and team_size=p_match.team_size;
  if v_rb is null then v_rb:=1000; end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',rm.user_id::text,'displayName',public.ms_esports_v7_name(rm.user_id),'avatarUrl',public.ms_esports_v7_avatar(rm.user_id),'role',case when rm.user_id=p_match.captain_a_user_id then 'captain' else coalesce(tm.role,'member') end,'rating',coalesce(ir.rating,1000)) order by rm.slot),'[]'::jsonb) into v_members_a
  from public.ms_esports_team_ranked_roster_members rm left join public.ms_esports_team_members tm on tm.team_id=p_match.team_a_id and tm.user_id=rm.user_id and tm.status='active' left join public.ms_esports_team_member_ratings ir on ir.season_id=p_match.season_id and ir.user_id=rm.user_id and ir.game_id=p_match.game_id and ir.team_size=p_match.team_size where rm.roster_id=p_match.roster_a_id;
  select coalesce(jsonb_agg(jsonb_build_object('userId',rm.user_id::text,'displayName',public.ms_esports_v7_name(rm.user_id),'avatarUrl',public.ms_esports_v7_avatar(rm.user_id),'role',case when rm.user_id=p_match.captain_b_user_id then 'captain' else coalesce(tm.role,'member') end,'rating',coalesce(ir.rating,1000)) order by rm.slot),'[]'::jsonb) into v_members_b
  from public.ms_esports_team_ranked_roster_members rm left join public.ms_esports_team_members tm on tm.team_id=p_match.team_b_id and tm.user_id=rm.user_id and tm.status='active' left join public.ms_esports_team_member_ratings ir on ir.season_id=p_match.season_id and ir.user_id=rm.user_id and ir.game_id=p_match.game_id and ir.team_size=p_match.team_size where rm.roster_id=p_match.roster_b_id;
  if exists(select 1 from public.ms_esports_team_ranked_roster_members where roster_id=p_match.roster_a_id and user_id=p_uid) then v_my_side:='A'; else v_my_side:='B'; end if;
  v_can_report:=p_uid in (p_match.captain_a_user_id,p_match.captain_b_user_id);
  return jsonb_build_object('id',p_match.id::text,'gameId',p_match.game_id,'platform',p_match.platform,'mode',p_match.mode,'region',p_match.region,'teamSize',p_match.team_size,'status',p_match.status,'roomCode',p_match.room_code,'mySide',v_my_side,'canReport',v_can_report,'isHostCaptain',p_match.host_captain_user_id=p_uid,
    'teamA',jsonb_build_object('teamId',p_match.team_a_id::text,'name',coalesce(v_a.name,'Team A'),'tag',coalesce(v_a.tag,''),'captainUserId',p_match.captain_a_user_id::text,'rating',coalesce(p_match.mmr_a_after,p_match.mmr_a_before,v_ra,1000),'members',v_members_a),
    'teamB',jsonb_build_object('teamId',p_match.team_b_id::text,'name',coalesce(v_b.name,'Team B'),'tag',coalesce(v_b.tag,''),'captainUserId',p_match.captain_b_user_id::text,'rating',coalesce(p_match.mmr_b_after,p_match.mmr_b_before,v_rb,1000),'members',v_members_b),
    'reportA',p_match.report_a,'reportB',p_match.report_b,'finalScoreA',p_match.final_score_a,'finalScoreB',p_match.final_score_b,'winnerTeamId',case when p_match.winner_team_id is null then null else p_match.winner_team_id::text end,
    'mmrABefore',p_match.mmr_a_before,'mmrAAfter',p_match.mmr_a_after,'mmrBBefore',p_match.mmr_b_before,'mmrBAfter',p_match.mmr_b_after,'createdAt',p_match.created_at,'updatedAt',p_match.updated_at,'confirmedAt',p_match.confirmed_at);
end $$;

create or replace function public.ms_esports_get_team_match_v7() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_team_competitive_matches;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select m.* into v from public.ms_esports_team_competitive_matches m where exists(select 1 from public.ms_esports_team_ranked_roster_members rm where rm.user_id=v_uid and rm.roster_id in(m.roster_a_id,m.roster_b_id)) order by m.updated_at desc limit 1;
  if not found then return null; end if; return public.ms_esports_team_match_json_v7(v,v_uid);
end $$;

create or replace function public.ms_esports_claim_team_room_v7(p_match_id uuid,p_room_code text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_team_competitive_matches; v_code text:=upper(trim(coalesce(p_room_code,'')));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if; if v_code='' or length(v_code)>32 then raise exception 'ROOM_CODE_REQUIRED'; end if;
  select * into v from public.ms_esports_team_competitive_matches where id=p_match_id for update; if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if v.host_captain_user_id<>v_uid then raise exception 'HOST_CAPTAIN_ONLY'; end if;
  if v.status in ('confirmed','cancelled') then raise exception 'MATCH_ALREADY_FINAL'; end if;
  if v.room_code is null then update public.ms_esports_team_competitive_matches set room_code=v_code,status='room_ready',updated_at=now() where id=v.id returning * into v;
  elsif v.room_code<>v_code then raise exception 'ROOM_ALREADY_CLAIMED'; end if;
  perform public.ms_esports_v4_notify(rm.user_id,'team_ranked_room_ready','TEAM RANKED · Salon prêt','Le salon classé de ton équipe est prêt. Code : '||v_code,jsonb_build_object('matchId',v.id::text,'roomCode',v_code,'gameId',v.game_id)) from public.ms_esports_team_ranked_roster_members rm where rm.roster_id in(v.roster_a_id,v.roster_b_id) and rm.user_id<>v_uid;
  return public.ms_esports_team_match_json_v7(v,v_uid);
end $$;

create or replace function public.ms_esports_v7_apply_team_rating(p_season uuid,p_team uuid,p_game text,p_team_size integer,p_opponent integer,p_score numeric,p_match uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_before integer:=1000; v_matches integer:=0; v_after integer; v_expected numeric; v_k integer; v_result text;
begin
  insert into public.ms_esports_team_ratings(season_id,team_id,game_id,team_size) values(p_season,p_team,p_game,p_team_size) on conflict do nothing;
  select rating,matches into v_before,v_matches from public.ms_esports_team_ratings where season_id=p_season and team_id=p_team and game_id=p_game and team_size=p_team_size for update;
  v_expected:=1.0/(1.0+power(10.0,(coalesce(p_opponent,1000)-v_before)/400.0)); v_k:=case when v_matches<5 then 48 else 32 end;
  v_after:=greatest(100,least(5000,round(v_before+v_k*(p_score-v_expected))::integer)); v_result:=case when p_score>0.5 then 'win' when p_score<0.5 then 'loss' else 'draw' end;
  update public.ms_esports_team_ratings set rating=v_after,peak_rating=greatest(peak_rating,v_after),placement_matches=least(5,placement_matches+1),matches=matches+1,wins=wins+case when p_score=1 then 1 else 0 end,losses=losses+case when p_score=0 then 1 else 0 end,draws=draws+case when p_score=.5 then 1 else 0 end,streak=case when p_score=1 then greatest(1,streak+1) when p_score=0 then least(-1,streak-1) else 0 end,last_match_at=now(),updated_at=now() where season_id=p_season and team_id=p_team and game_id=p_game and team_size=p_team_size;
  insert into public.ms_esports_team_rating_history(season_id,team_id,game_id,team_size,match_id,rating_before,rating_after,delta,result) values(p_season,p_team,p_game,p_team_size,p_match,v_before,v_after,v_after-v_before,v_result) on conflict(match_id,team_id) do nothing;
  return jsonb_build_object('before',v_before,'after',v_after,'delta',v_after-v_before,'result',v_result);
end $$;

create or replace function public.ms_esports_v7_apply_member_rating(p_season uuid,p_user uuid,p_team uuid,p_game text,p_team_size integer,p_opponent integer,p_score numeric,p_match uuid)
returns void language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_before integer:=1000; v_matches integer:=0; v_after integer; v_expected numeric; v_k integer; v_result text;
begin
  insert into public.ms_esports_team_member_ratings(season_id,user_id,game_id,team_size) values(p_season,p_user,p_game,p_team_size) on conflict do nothing;
  select rating,matches into v_before,v_matches from public.ms_esports_team_member_ratings where season_id=p_season and user_id=p_user and game_id=p_game and team_size=p_team_size for update;
  v_expected:=1.0/(1.0+power(10.0,(coalesce(p_opponent,1000)-v_before)/400.0)); v_k:=case when v_matches<5 then 40 else 24 end;
  v_after:=greatest(100,least(5000,round(v_before+v_k*(p_score-v_expected))::integer)); v_result:=case when p_score>0.5 then 'win' when p_score<0.5 then 'loss' else 'draw' end;
  update public.ms_esports_team_member_ratings set rating=v_after,peak_rating=greatest(peak_rating,v_after),placement_matches=least(5,placement_matches+1),matches=matches+1,wins=wins+case when p_score=1 then 1 else 0 end,losses=losses+case when p_score=0 then 1 else 0 end,draws=draws+case when p_score=.5 then 1 else 0 end,streak=case when p_score=1 then greatest(1,streak+1) when p_score=0 then least(-1,streak-1) else 0 end,last_match_at=now(),updated_at=now() where season_id=p_season and user_id=p_user and game_id=p_game and team_size=p_team_size;
  insert into public.ms_esports_team_member_rating_history(season_id,user_id,team_id,game_id,team_size,match_id,rating_before,rating_after,delta,result) values(p_season,p_user,p_team,p_game,p_team_size,p_match,v_before,v_after,v_after-v_before,v_result) on conflict(match_id,user_id) do nothing;
end $$;

create or replace function public.ms_esports_submit_team_result_v7(p_match_id uuid,p_score_a integer,p_score_b integer) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v public.ms_esports_team_competitive_matches; sa integer:=greatest(0,least(coalesce(p_score_a,0),999)); sb integer:=greatest(0,least(coalesce(p_score_b,0),999)); aa integer; ab integer; ba integer; bb integer; score_a numeric; score_b numeric; winner uuid; season uuid; ra integer:=1000; rb integer:=1000; resa jsonb; resb jsonb; member uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v from public.ms_esports_team_competitive_matches where id=p_match_id for update; if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_uid not in(v.captain_a_user_id,v.captain_b_user_id) then raise exception 'CAPTAIN_ONLY'; end if;
  if v.status='cancelled' then raise exception 'MATCH_CANCELLED'; end if; if v.status='confirmed' then return public.ms_esports_team_match_json_v7(v,v_uid); end if;
  if v_uid=v.captain_a_user_id then update public.ms_esports_team_competitive_matches set report_a=jsonb_build_object('scoreA',sa,'scoreB',sb,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v.id returning * into v;
  else update public.ms_esports_team_competitive_matches set report_b=jsonb_build_object('scoreA',sa,'scoreB',sb,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v.id returning * into v; end if;
  if v.report_a is not null and v.report_b is not null then
    aa:=coalesce((v.report_a->>'scoreA')::integer,-1); ab:=coalesce((v.report_a->>'scoreB')::integer,-1); ba:=coalesce((v.report_b->>'scoreA')::integer,-1); bb:=coalesce((v.report_b->>'scoreB')::integer,-1);
    if aa=ba and ab=bb then
      season:=coalesce(v.season_id,public.ms_esports_v4_active_season_id());
      select coalesce(rating,1000) into ra from public.ms_esports_team_ratings where season_id=season and team_id=v.team_a_id and game_id=v.game_id and team_size=v.team_size; if ra is null then ra:=1000; end if;
      select coalesce(rating,1000) into rb from public.ms_esports_team_ratings where season_id=season and team_id=v.team_b_id and game_id=v.game_id and team_size=v.team_size; if rb is null then rb:=1000; end if;
      if sa>sb then score_a:=1; score_b:=0; winner:=v.team_a_id; elsif sb>sa then score_a:=0; score_b:=1; winner:=v.team_b_id; else score_a:=.5; score_b:=.5; winner:=null; end if;
      resa:=public.ms_esports_v7_apply_team_rating(season,v.team_a_id,v.game_id,v.team_size,rb,score_a,v.id); resb:=public.ms_esports_v7_apply_team_rating(season,v.team_b_id,v.game_id,v.team_size,ra,score_b,v.id);
      for member in select user_id from public.ms_esports_team_ranked_roster_members where roster_id=v.roster_a_id loop perform public.ms_esports_v7_apply_member_rating(season,member,v.team_a_id,v.game_id,v.team_size,rb,score_a,v.id); end loop;
      for member in select user_id from public.ms_esports_team_ranked_roster_members where roster_id=v.roster_b_id loop perform public.ms_esports_v7_apply_member_rating(season,member,v.team_b_id,v.game_id,v.team_size,ra,score_b,v.id); end loop;
      update public.ms_esports_team_competitive_matches set season_id=season,status='confirmed',final_score_a=sa,final_score_b=sb,winner_team_id=winner,mmr_a_before=(resa->>'before')::integer,mmr_a_after=(resa->>'after')::integer,mmr_b_before=(resb->>'before')::integer,mmr_b_after=(resb->>'after')::integer,confirmed_at=now(),updated_at=now() where id=v.id returning * into v;
      perform public.ms_esports_v4_notify(rm.user_id,'team_ranked_result','TEAM RANKED · Résultat confirmé','Résultat officiel confirmé. Les MMR équipe et individuels ont été mis à jour.',jsonb_build_object('matchId',v.id::text,'gameId',v.game_id,'teamSize',v.team_size)) from public.ms_esports_team_ranked_roster_members rm where rm.roster_id in(v.roster_a_id,v.roster_b_id);
    else
      update public.ms_esports_team_competitive_matches set status='disputed',updated_at=now() where id=v.id returning * into v;
      perform public.ms_esports_v4_notify(v.captain_a_user_id,'team_ranked_dispute','TEAM RANKED · Scores différents','Les deux capitaines ont saisi des scores différents. Corrigez puis reconfirmez.',jsonb_build_object('matchId',v.id::text));
      perform public.ms_esports_v4_notify(v.captain_b_user_id,'team_ranked_dispute','TEAM RANKED · Scores différents','Les deux capitaines ont saisi des scores différents. Corrigez puis reconfirmez.',jsonb_build_object('matchId',v.id::text));
    end if;
  end if;
  return public.ms_esports_team_match_json_v7(v,v_uid);
end $$;

create or replace function public.ms_esports_team_leaderboard_v7(p_game_id text,p_team_size integer,p_limit integer default 50) returns setof jsonb
language sql security definer set search_path=public,auth,extensions as $$
  with season as (select id,name,slug from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1), ranked as (
    select r.*,row_number() over(order by r.rating desc,r.matches desc,r.wins desc,r.team_id)::int position,s.name season_name,s.slug season_slug from public.ms_esports_team_ratings r join season s on s.id=r.season_id where r.game_id=trim(p_game_id) and r.team_size=greatest(2,least(coalesce(p_team_size,2),10))
  ) select jsonb_build_object('position',r.position,'teamId',r.team_id::text,'name',t.name,'tag',t.tag,'gameId',r.game_id,'teamSize',r.team_size,'rating',r.rating,'peakRating',r.peak_rating,'matches',r.matches,'wins',r.wins,'losses',r.losses,'draws',r.draws,'streak',r.streak,'seasonName',r.season_name,'seasonSlug',r.season_slug)
  from ranked r join public.ms_esports_teams t on t.id=r.team_id where auth.uid() is not null and (t.visibility='public' or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active')) order by r.position limit greatest(1,least(coalesce(p_limit,50),100));
$$;

create or replace function public.ms_esports_team_public_profile_v7(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); t public.ms_esports_teams; members jsonb:='[]'::jsonb; ratings jsonb:='[]'::jsonb; season uuid:=public.ms_esports_v4_active_season_id(); sname text; sslug text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if; select * into t from public.ms_esports_teams where id=p_team_id; if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  if t.visibility='private' and not exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=v_uid and tm.status='active') then raise exception 'PRIVATE_TEAM'; end if;
  select name,slug into sname,sslug from public.ms_esports_seasons where id=season;
  select coalesce(jsonb_agg(jsonb_build_object('userId',tm.user_id::text,'displayName',public.ms_esports_v7_name(tm.user_id),'avatarUrl',public.ms_esports_v7_avatar(tm.user_id),'role',tm.role,'status',tm.status,'rating',coalesce((select mr.rating from public.ms_esports_team_member_ratings mr where mr.season_id=season and mr.user_id=tm.user_id order by mr.updated_at desc limit 1),1000)) order by case tm.role when 'owner' then 0 when 'captain' then 1 when 'officer' then 2 else 3 end),'[]'::jsonb) into members from public.ms_esports_team_members tm where tm.team_id=t.id and tm.status='active';
  select coalesce(jsonb_agg(jsonb_build_object('gameId',r.game_id,'teamSize',r.team_size,'rating',r.rating,'peakRating',r.peak_rating,'matches',r.matches,'wins',r.wins,'losses',r.losses,'draws',r.draws,'streak',r.streak,'seasonName',coalesce(sname,'E-SPORTS Season'),'seasonSlug',coalesce(sslug,'current')) order by r.rating desc),'[]'::jsonb) into ratings from public.ms_esports_team_ratings r where r.season_id=season and r.team_id=t.id;
  return jsonb_build_object('teamId',t.id::text,'name',t.name,'tag',t.tag,'visibility',t.visibility,'gameIds',to_jsonb(t.game_ids),'members',members,'ratings',ratings);
end $$;

revoke all on function public.ms_esports_v7_name(uuid) from public;
revoke all on function public.ms_esports_v7_avatar(uuid) from public;
revoke all on function public.ms_esports_team_roster_json_v7(public.ms_esports_team_ranked_rosters,uuid) from public;
revoke all on function public.ms_esports_team_queue_json_v7(public.ms_esports_team_matchmaking_queue) from public;
revoke all on function public.ms_esports_team_match_json_v7(public.ms_esports_team_competitive_matches,uuid) from public;
revoke all on function public.ms_esports_v7_apply_team_rating(uuid,uuid,text,integer,integer,numeric,uuid) from public;
revoke all on function public.ms_esports_v7_apply_member_rating(uuid,uuid,uuid,text,integer,integer,numeric,uuid) from public;
revoke all on function public.ms_esports_team_ranked_my_teams_v7() from public;
revoke all on function public.ms_esports_lock_team_roster_v7(uuid,text,text,text,text,integer,uuid,uuid[]) from public;
revoke all on function public.ms_esports_get_team_roster_v7(uuid,text) from public;
revoke all on function public.ms_esports_archive_team_roster_v7(uuid) from public;
revoke all on function public.ms_esports_join_team_queue_v7(uuid) from public;
revoke all on function public.ms_esports_get_team_queue_v7() from public;
revoke all on function public.ms_esports_leave_team_queue_v7() from public;
revoke all on function public.ms_esports_get_team_match_v7() from public;
revoke all on function public.ms_esports_claim_team_room_v7(uuid,text) from public;
revoke all on function public.ms_esports_submit_team_result_v7(uuid,integer,integer) from public;
revoke all on function public.ms_esports_team_leaderboard_v7(text,integer,integer) from public;
revoke all on function public.ms_esports_team_public_profile_v7(uuid) from public;

grant execute on function public.ms_esports_team_ranked_my_teams_v7() to authenticated;
grant execute on function public.ms_esports_lock_team_roster_v7(uuid,text,text,text,text,integer,uuid,uuid[]) to authenticated;
grant execute on function public.ms_esports_get_team_roster_v7(uuid,text) to authenticated;
grant execute on function public.ms_esports_archive_team_roster_v7(uuid) to authenticated;
grant execute on function public.ms_esports_join_team_queue_v7(uuid) to authenticated;
grant execute on function public.ms_esports_get_team_queue_v7() to authenticated;
grant execute on function public.ms_esports_leave_team_queue_v7() to authenticated;
grant execute on function public.ms_esports_get_team_match_v7() to authenticated;
grant execute on function public.ms_esports_claim_team_room_v7(uuid,text) to authenticated;
grant execute on function public.ms_esports_submit_team_result_v7(uuid,integer,integer) to authenticated;
grant execute on function public.ms_esports_team_leaderboard_v7(text,integer,integer) to authenticated;
grant execute on function public.ms_esports_team_public_profile_v7(uuid) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_team_ranked_rosters') then execute 'alter publication supabase_realtime add table public.ms_esports_team_ranked_rosters'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_team_matchmaking_queue') then execute 'alter publication supabase_realtime add table public.ms_esports_team_matchmaking_queue'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_team_competitive_matches') then execute 'alter publication supabase_realtime add table public.ms_esports_team_competitive_matches'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_team_ratings') then execute 'alter publication supabase_realtime add table public.ms_esports_team_ratings'; end if;
end $$;
