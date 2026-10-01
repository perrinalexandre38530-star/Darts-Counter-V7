-- MULTISPORTS SCORING — CHALLENGE leaderboard V2
-- - idempotent historical backfill (one stored entry per match)
-- - only the BEST entry per user is exposed in rankings
-- - complete comparable configuration key (target/rule/visits/match mode + future sets/legs)
-- - public leaderboard + private team scopes
-- - team scopes are readable only by authenticated registered members

create table if not exists public.ms_challenge_team_members_v2 (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_key text not null,
  team_name text not null default 'Équipe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, team_key),
  check (length(trim(team_key)) between 1 and 160)
);

create index if not exists ms_challenge_team_members_v2_team_idx
  on public.ms_challenge_team_members_v2(team_key, updated_at desc);

create table if not exists public.ms_challenge_score_entries_v2 (
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_key text not null,
  target text not null,
  rule text not null,
  visits integer not null check (visits > 0),
  match_mode text not null default 'solo',
  scope_key text not null default 'public',
  team_key text,
  team_name text,
  score integer not null default 0 check (score >= 0),
  darts integer not null default 0 check (darts >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  accuracy numeric not null default 0 check (accuracy >= 0 and accuracy <= 100),
  match_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, objective_key, scope_key, match_id),
  check (scope_key='public' or scope_key like 'team:%'),
  check (length(trim(match_id)) between 1 and 160)
);

create index if not exists ms_challenge_score_entries_v2_rank_idx
  on public.ms_challenge_score_entries_v2(objective_key, scope_key, score desc, accuracy desc, updated_at asc);
create index if not exists ms_challenge_score_entries_v2_user_idx
  on public.ms_challenge_score_entries_v2(user_id, updated_at desc);
create index if not exists ms_challenge_score_entries_v2_team_idx
  on public.ms_challenge_score_entries_v2(team_key, objective_key, score desc)
  where team_key is not null;

alter table public.ms_challenge_team_members_v2 enable row level security;
alter table public.ms_challenge_score_entries_v2 enable row level security;
-- No direct table policies: reads/writes are deliberately limited to SECURITY DEFINER RPCs.

create or replace function public.ms_challenge_register_teams_v2(
  p_teams jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_team jsonb;
  v_key text;
  v_name text;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(coalesce(p_teams,'[]'::jsonb)) <> 'array' then raise exception 'INVALID_TEAMS'; end if;

  for v_team in select value from jsonb_array_elements(coalesce(p_teams,'[]'::jsonb)) loop
    v_key := left(trim(coalesce(v_team->>'key','')),160);
    v_name := left(trim(coalesce(v_team->>'name','Équipe')),120);
    if length(v_key) > 0 then
      insert into public.ms_challenge_team_members_v2(user_id,team_key,team_name,created_at,updated_at)
      values(v_uid,v_key,coalesce(nullif(v_name,''),'Équipe'),now(),now())
      on conflict(user_id,team_key) do update set
        team_name=excluded.team_name,
        updated_at=now();
      v_count := v_count + 1;
    end if;
  end loop;

  return jsonb_build_object('ok',true,'registered',v_count);
end $$;

create or replace function public.ms_submit_challenge_score_v2(
  p_objective_key text,
  p_target text,
  p_rule text,
  p_visits integer,
  p_match_mode text,
  p_score integer,
  p_darts integer,
  p_best_streak integer,
  p_accuracy numeric,
  p_match_id text,
  p_teams jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := trim(coalesce(p_objective_key,''));
  v_match text := left(trim(coalesce(p_match_id,'')),160);
  v_team jsonb;
  v_team_key text;
  v_team_name text;
  v_best integer := 0;
  v_previous integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_key) < 12 then raise exception 'INVALID_OBJECTIVE'; end if;
  if coalesce(p_visits,0) <= 0 then raise exception 'INVALID_VISITS'; end if;
  if coalesce(p_score,0) < 0 then raise exception 'INVALID_SCORE'; end if;
  if length(v_match) = 0 then raise exception 'INVALID_MATCH_ID'; end if;
  if jsonb_typeof(coalesce(p_teams,'[]'::jsonb)) <> 'array' then raise exception 'INVALID_TEAMS'; end if;

  perform public.ms_touch_public_profile();

  select max(score) into v_previous
  from public.ms_challenge_score_entries_v2
  where user_id=v_uid and objective_key=v_key and scope_key='public';

  insert into public.ms_challenge_score_entries_v2(
    user_id,objective_key,target,rule,visits,match_mode,scope_key,team_key,team_name,
    score,darts,best_streak,accuracy,match_id,created_at,updated_at
  ) values (
    v_uid,v_key,left(trim(coalesce(p_target,'20')),24),left(trim(coalesce(p_rule,'all')),24),p_visits,
    left(trim(coalesce(p_match_mode,'solo')),24),'public',null,null,
    greatest(0,p_score),greatest(0,coalesce(p_darts,0)),greatest(0,coalesce(p_best_streak,0)),
    greatest(0,least(100,coalesce(p_accuracy,0))),v_match,now(),now()
  )
  on conflict(user_id,objective_key,scope_key,match_id) do update set
    target=excluded.target,
    rule=excluded.rule,
    visits=excluded.visits,
    match_mode=excluded.match_mode,
    score=excluded.score,
    darts=excluded.darts,
    best_streak=excluded.best_streak,
    accuracy=excluded.accuracy,
    updated_at=now();

  for v_team in select value from jsonb_array_elements(coalesce(p_teams,'[]'::jsonb)) loop
    v_team_key := left(trim(coalesce(v_team->>'key','')),160);
    v_team_name := left(trim(coalesce(v_team->>'name','Équipe')),120);
    if length(v_team_key) > 0 then
      insert into public.ms_challenge_team_members_v2(user_id,team_key,team_name,created_at,updated_at)
      values(v_uid,v_team_key,coalesce(nullif(v_team_name,''),'Équipe'),now(),now())
      on conflict(user_id,team_key) do update set
        team_name=excluded.team_name,
        updated_at=now();

      insert into public.ms_challenge_score_entries_v2(
        user_id,objective_key,target,rule,visits,match_mode,scope_key,team_key,team_name,
        score,darts,best_streak,accuracy,match_id,created_at,updated_at
      ) values (
        v_uid,v_key,left(trim(coalesce(p_target,'20')),24),left(trim(coalesce(p_rule,'all')),24),p_visits,
        left(trim(coalesce(p_match_mode,'solo')),24),'team:'||v_team_key,v_team_key,coalesce(nullif(v_team_name,''),'Équipe'),
        greatest(0,p_score),greatest(0,coalesce(p_darts,0)),greatest(0,coalesce(p_best_streak,0)),
        greatest(0,least(100,coalesce(p_accuracy,0))),v_match,now(),now()
      )
      on conflict(user_id,objective_key,scope_key,match_id) do update set
        team_name=excluded.team_name,
        target=excluded.target,
        rule=excluded.rule,
        visits=excluded.visits,
        match_mode=excluded.match_mode,
        score=excluded.score,
        darts=excluded.darts,
        best_streak=excluded.best_streak,
        accuracy=excluded.accuracy,
        updated_at=now();
    end if;
  end loop;

  select coalesce(max(score),0) into v_best
  from public.ms_challenge_score_entries_v2
  where user_id=v_uid and objective_key=v_key and scope_key='public';

  return jsonb_build_object(
    'ok',true,
    'improved',(v_previous is null or p_score > v_previous),
    'bestScore',v_best
  );
end $$;

create or replace function public.ms_challenge_team_scopes_v2()
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  select jsonb_build_object(
    'teamKey',m.team_key,
    'teamName',m.team_name,
    'updatedAt',m.updated_at
  )
  from public.ms_challenge_team_members_v2 m
  where auth.uid() is not null and m.user_id=auth.uid()
  order by lower(m.team_name),m.team_key;
$$;

create or replace function public.ms_challenge_leaderboard_v2(
  p_objective_key text,
  p_scope_key text default 'public',
  p_limit integer default 100
) returns setof jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text := trim(coalesce(p_scope_key,'public'));
  v_team_key text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_objective_key,''))) < 12 then raise exception 'INVALID_OBJECTIVE'; end if;

  if v_scope <> 'public' then
    if v_scope not like 'team:%' then raise exception 'INVALID_SCOPE'; end if;
    v_team_key := substring(v_scope from 6);
    if not exists(
      select 1 from public.ms_challenge_team_members_v2 m
      where m.user_id=v_uid and m.team_key=v_team_key
    ) then
      raise exception 'PRIVATE_TEAM';
    end if;
  end if;

  return query
  with filtered as (
    select
      s.*,
      count(*) over(partition by s.user_id) as played_count,
      row_number() over(
        partition by s.user_id
        order by s.score desc,s.accuracy desc,s.best_streak desc,s.darts asc,s.updated_at asc,s.match_id asc
      ) as user_best_rank
    from public.ms_challenge_score_entries_v2 s
    where s.objective_key=trim(p_objective_key)
      and s.scope_key=v_scope
  ),
  best_per_user as (
    select * from filtered where user_best_rank=1
  ),
  ranked as (
    select
      b.*,
      row_number() over(order by b.score desc,b.accuracy desc,b.best_streak desc,b.darts asc,b.updated_at asc,b.user_id asc) as rank
    from best_per_user b
  )
  select jsonb_build_object(
    'rank',r.rank,
    'userId',r.user_id::text,
    'displayName',coalesce(nullif(trim(p.display_name),''),'Joueur'),
    'avatarUrl',p.avatar_url,
    'countryCode',p.country_code,
    'score',r.score,
    'darts',r.darts,
    'bestStreak',r.best_streak,
    'accuracy',r.accuracy,
    'playedCount',r.played_count,
    'updatedAt',r.updated_at,
    'target',r.target,
    'rule',r.rule,
    'visits',r.visits,
    'matchMode',r.match_mode,
    'scopeKey',r.scope_key,
    'teamKey',r.team_key,
    'teamName',r.team_name
  )
  from ranked r
  left join public.ms_public_profiles p on p.user_id=r.user_id
  order by r.rank
  limit greatest(1,least(coalesce(p_limit,100),100));
end $$;

revoke all on table public.ms_challenge_team_members_v2 from public;
revoke all on table public.ms_challenge_score_entries_v2 from public;
revoke all on function public.ms_challenge_register_teams_v2(jsonb) from public;
revoke all on function public.ms_submit_challenge_score_v2(text,text,text,integer,text,integer,integer,integer,numeric,text,jsonb) from public;
revoke all on function public.ms_challenge_team_scopes_v2() from public;
revoke all on function public.ms_challenge_leaderboard_v2(text,text,integer) from public;

grant execute on function public.ms_challenge_register_teams_v2(jsonb) to authenticated;
grant execute on function public.ms_submit_challenge_score_v2(text,text,text,integer,text,integer,integer,integer,numeric,text,jsonb) to authenticated;
grant execute on function public.ms_challenge_team_scopes_v2() to authenticated;
grant execute on function public.ms_challenge_leaderboard_v2(text,text,integer) to authenticated;
