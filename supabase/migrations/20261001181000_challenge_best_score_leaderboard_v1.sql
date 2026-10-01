-- MULTISPORTS SCORING — CHALLENGE public leaderboard V1
-- One row per authenticated user and comparable Challenge objective.
-- The row only keeps that user's BEST score for the objective.

create table if not exists public.ms_challenge_best_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_key text not null,
  target text not null,
  rule text not null,
  visits integer not null check (visits > 0),
  best_score integer not null default 0 check (best_score >= 0),
  best_darts integer not null default 0 check (best_darts >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  best_accuracy numeric not null default 0 check (best_accuracy >= 0 and best_accuracy <= 100),
  best_match_id text,
  played_count integer not null default 1 check (played_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, objective_key)
);

create index if not exists ms_challenge_best_scores_objective_score_idx
  on public.ms_challenge_best_scores(objective_key, best_score desc, best_accuracy desc, updated_at asc);

alter table public.ms_challenge_best_scores enable row level security;
-- Table access stays private. All reads/writes go through SECURITY DEFINER RPCs.

create or replace function public.ms_submit_challenge_score(
  p_objective_key text,
  p_target text,
  p_rule text,
  p_visits integer,
  p_score integer,
  p_darts integer,
  p_best_streak integer,
  p_accuracy numeric,
  p_match_id text default null
) returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_previous integer;
  v_best integer;
  v_improved boolean := false;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_objective_key,''))) < 6 then raise exception 'INVALID_OBJECTIVE'; end if;
  if coalesce(p_visits,0) <= 0 then raise exception 'INVALID_VISITS'; end if;
  if coalesce(p_score,0) < 0 then raise exception 'INVALID_SCORE'; end if;

  perform public.ms_touch_public_profile();

  select best_score into v_previous
  from public.ms_challenge_best_scores
  where user_id=v_uid and objective_key=trim(p_objective_key);

  if v_previous is null or p_score > v_previous then
    v_improved := true;
  end if;

  insert into public.ms_challenge_best_scores(
    user_id,objective_key,target,rule,visits,best_score,best_darts,best_streak,best_accuracy,best_match_id,played_count,created_at,updated_at
  ) values (
    v_uid,trim(p_objective_key),left(trim(coalesce(p_target,'20')),24),left(trim(coalesce(p_rule,'all')),24),p_visits,
    greatest(0,p_score),greatest(0,coalesce(p_darts,0)),greatest(0,coalesce(p_best_streak,0)),
    greatest(0,least(100,coalesce(p_accuracy,0))),nullif(left(trim(coalesce(p_match_id,'')),160),''),1,now(),now()
  )
  on conflict(user_id,objective_key) do update set
    played_count=public.ms_challenge_best_scores.played_count+1,
    target=excluded.target,
    rule=excluded.rule,
    visits=excluded.visits,
    best_score=greatest(public.ms_challenge_best_scores.best_score,excluded.best_score),
    best_darts=case when excluded.best_score > public.ms_challenge_best_scores.best_score then excluded.best_darts else public.ms_challenge_best_scores.best_darts end,
    best_streak=case when excluded.best_score > public.ms_challenge_best_scores.best_score then excluded.best_streak else public.ms_challenge_best_scores.best_streak end,
    best_accuracy=case
      when excluded.best_score > public.ms_challenge_best_scores.best_score then excluded.best_accuracy
      when excluded.best_score = public.ms_challenge_best_scores.best_score then greatest(public.ms_challenge_best_scores.best_accuracy,excluded.best_accuracy)
      else public.ms_challenge_best_scores.best_accuracy
    end,
    best_match_id=case when excluded.best_score > public.ms_challenge_best_scores.best_score then excluded.best_match_id else public.ms_challenge_best_scores.best_match_id end,
    updated_at=case when excluded.best_score >= public.ms_challenge_best_scores.best_score then now() else public.ms_challenge_best_scores.updated_at end;

  select best_score into v_best
  from public.ms_challenge_best_scores
  where user_id=v_uid and objective_key=trim(p_objective_key);

  return jsonb_build_object('ok',true,'improved',v_improved,'bestScore',coalesce(v_best,0));
end $$;

create or replace function public.ms_challenge_leaderboard(
  p_objective_key text,
  p_limit integer default 100
) returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with ranked as (
    select
      s.*,
      row_number() over(order by s.best_score desc,s.best_accuracy desc,s.updated_at asc,s.user_id asc) as rank
    from public.ms_challenge_best_scores s
    where auth.uid() is not null
      and s.objective_key=trim(p_objective_key)
  )
  select jsonb_build_object(
    'rank',r.rank,
    'userId',r.user_id::text,
    'displayName',coalesce(nullif(trim(p.display_name),''),'Joueur'),
    'avatarUrl',p.avatar_url,
    'countryCode',p.country_code,
    'score',r.best_score,
    'darts',r.best_darts,
    'bestStreak',r.best_streak,
    'accuracy',r.best_accuracy,
    'playedCount',r.played_count,
    'updatedAt',r.updated_at
  )
  from ranked r
  left join public.ms_public_profiles p on p.user_id=r.user_id
  order by r.rank
  limit greatest(1,least(coalesce(p_limit,100),100));
$$;

revoke all on table public.ms_challenge_best_scores from public;
revoke all on function public.ms_submit_challenge_score(text,text,text,integer,integer,integer,integer,numeric,text) from public;
revoke all on function public.ms_challenge_leaderboard(text,integer) from public;
grant execute on function public.ms_submit_challenge_score(text,text,text,integer,integer,integer,integer,numeric,text) to authenticated;
grant execute on function public.ms_challenge_leaderboard(text,integer) to authenticated;
