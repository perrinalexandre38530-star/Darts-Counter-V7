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
