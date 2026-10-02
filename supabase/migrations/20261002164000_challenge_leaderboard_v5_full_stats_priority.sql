-- MULTISPORTS SCORING — CHALLENGE leaderboard V5
-- Priorise, à score égal, la performance qui possède le journal détaillé
-- fléchette-par-fléchette. Cela permet d'ouvrir le même panneau STATS
-- DÉTAILLÉES que dans ChallengePlay pour les meilleurs scores Online.

begin;

create or replace function public.ms_challenge_leaderboard_v3(
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
    if v_scope not like 'official:%' then raise exception 'INVALID_SCOPE'; end if;
    v_team_key := substring(v_scope from 10);
    if not exists(
      select 1
      from public.ms_organization_group_members gm
      join public.ms_organization_members om on om.organization_id=gm.organization_id and om.user_id=gm.user_id and om.status='active'
      join public.ms_organization_groups g on g.id=gm.group_id and g.organization_id=gm.organization_id
      where gm.user_id=v_uid
        and gm.group_id::text=v_team_key
        and coalesce(g.status,'active')='active'
    ) then raise exception 'PRIVATE_TEAM'; end if;
  end if;

  return query
  with filtered as (
    select
      s.*,
      count(*) over(partition by s.user_id) as played_count,
      row_number() over(
        partition by s.user_id
        order by
          s.score desc,
          (coalesce(s.stats_payload,'{}'::jsonb) ? 'entries') desc,
          (coalesce(s.stats_payload,'{}'::jsonb) <> '{}'::jsonb) desc,
          s.accuracy desc,
          s.best_streak desc,
          s.darts asc,
          s.updated_at asc,
          s.match_id asc
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
      row_number() over(
        order by b.score desc,b.accuracy desc,b.best_streak desc,b.darts asc,b.updated_at asc,b.user_id asc
      ) as rank
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
    'matchId',r.match_id,
    'detailAvailable',(coalesce(r.stats_payload,'{}'::jsonb) <> '{}'::jsonb),
    'fullDetailAvailable',(coalesce(r.stats_payload,'{}'::jsonb) ? 'entries'),
    'target',r.target,
    'rule',r.rule,
    'visits',r.visits,
    'scopeKey',r.scope_key,
    'teamKey',r.team_key,
    'teamName',r.team_name
  )
  from ranked r
  left join public.ms_public_profiles p on p.user_id=r.user_id
  order by r.rank
  limit greatest(1,least(coalesce(p_limit,100),100));
end $$;

create or replace function public.ms_challenge_score_detail_v3(
  p_objective_key text,
  p_scope_key text,
  p_user_id text
) returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text := trim(coalesce(p_scope_key,'public'));
  v_team_key text;
  v_target_user uuid;
  v_row public.ms_challenge_score_entries_v2%rowtype;
  v_profile public.ms_public_profiles%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  begin
    v_target_user := p_user_id::uuid;
  exception when others then
    raise exception 'INVALID_USER';
  end;

  if v_scope <> 'public' then
    if v_scope not like 'official:%' then raise exception 'INVALID_SCOPE'; end if;
    v_team_key := substring(v_scope from 10);
    if not exists(
      select 1
      from public.ms_organization_group_members gm
      join public.ms_organization_members om on om.organization_id=gm.organization_id and om.user_id=gm.user_id and om.status='active'
      where gm.user_id=v_uid and gm.group_id::text=v_team_key
    ) then raise exception 'PRIVATE_TEAM'; end if;
  end if;

  select s.* into v_row
  from public.ms_challenge_score_entries_v2 s
  where s.user_id=v_target_user
    and s.objective_key=trim(p_objective_key)
    and s.scope_key=v_scope
  order by
    s.score desc,
    (coalesce(s.stats_payload,'{}'::jsonb) ? 'entries') desc,
    (coalesce(s.stats_payload,'{}'::jsonb) <> '{}'::jsonb) desc,
    s.accuracy desc,
    s.best_streak desc,
    s.darts asc,
    s.updated_at asc,
    s.match_id asc
  limit 1;

  if v_row.user_id is null then return null; end if;
  select * into v_profile from public.ms_public_profiles where user_id=v_target_user;

  return jsonb_build_object(
    'userId',v_target_user::text,
    'displayName',coalesce(nullif(trim(v_profile.display_name),''),'Joueur'),
    'avatarUrl',v_profile.avatar_url,
    'countryCode',v_profile.country_code,
    'score',v_row.score,
    'darts',v_row.darts,
    'bestStreak',v_row.best_streak,
    'accuracy',v_row.accuracy,
    'matchId',v_row.match_id,
    'target',v_row.target,
    'rule',v_row.rule,
    'visits',v_row.visits,
    'updatedAt',v_row.updated_at,
    'stats',coalesce(v_row.stats_payload,'{}'::jsonb)
  );
end $$;

revoke all on function public.ms_challenge_leaderboard_v3(text,text,integer) from public;
revoke all on function public.ms_challenge_score_detail_v3(text,text,text) from public;
grant execute on function public.ms_challenge_leaderboard_v3(text,text,integer) to authenticated;
grant execute on function public.ms_challenge_score_detail_v3(text,text,text) to authenticated;

commit;
