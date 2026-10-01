-- MULTISPORTS SCORING — CHALLENGE leaderboard V3
-- - SOLO / DUO / MULTI regroupés : la performance classée est individuelle
-- - classement privé sécurisé uniquement pour les équipes OFFICIELLES des Organisations MSS
-- - les équipes locales restent utilisables dans le gameplay mais ne peuvent pas s'auto-attribuer un classement privé online
-- - stockage des statistiques détaillées du meilleur score pour consultation depuis le classement
-- - filtres comparables : cible + règle + tours (+ futurs sets/legs dans objective_key)

begin;

alter table public.ms_challenge_score_entries_v2
  add column if not exists stats_payload jsonb not null default '{}'::jsonb;

create index if not exists ms_challenge_score_entries_v2_objective_scope_v3_idx
  on public.ms_challenge_score_entries_v2(objective_key,scope_key,score desc,accuracy desc,best_streak desc,darts asc);

-- Équipes officielles : uniquement une équipe/groupe Organisation auquel le compte
-- est réellement affecté côté serveur. Impossible de s'auto-attribuer une équipe locale.
create or replace function public.ms_challenge_official_team_scopes_v3()
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'teamKey',g.id::text,
    'teamName',g.name,
    'official',true,
    'organizationId',o.id::text,
    'organizationName',o.name
  )
  from public.ms_organization_group_members gm
  join public.ms_organization_groups g on g.id=gm.group_id and g.organization_id=gm.organization_id
  join public.ms_organization_members om on om.organization_id=gm.organization_id and om.user_id=gm.user_id and om.status='active'
  join public.ms_organizations o on o.id=gm.organization_id
  where auth.uid() is not null
    and gm.user_id=auth.uid()
    and coalesce(g.status,'active')='active'
    and g.kind='team'
    and lower(coalesce(g.sport_id,'')) in ('darts','dart','flechettes','fléchettes')
  order by lower(o.name),lower(g.name),g.id;
$$;

create or replace function public.ms_submit_challenge_score_v3(
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
  p_stats jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := trim(coalesce(p_objective_key,''));
  v_match text := left(trim(coalesce(p_match_id,'')),160);
  v_best integer := 0;
  v_previous integer;
  v_group record;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_key) < 12 then raise exception 'INVALID_OBJECTIVE'; end if;
  if coalesce(p_visits,0) <= 0 then raise exception 'INVALID_VISITS'; end if;
  if coalesce(p_score,0) < 0 then raise exception 'INVALID_SCORE'; end if;
  if length(v_match)=0 then raise exception 'INVALID_MATCH_ID'; end if;
  if jsonb_typeof(coalesce(p_stats,'{}'::jsonb)) <> 'object' then raise exception 'INVALID_STATS'; end if;

  perform public.ms_touch_public_profile();

  select max(score) into v_previous
  from public.ms_challenge_score_entries_v2
  where user_id=v_uid and objective_key=v_key and scope_key='public';

  insert into public.ms_challenge_score_entries_v2(
    user_id,objective_key,target,rule,visits,match_mode,scope_key,team_key,team_name,
    score,darts,best_streak,accuracy,match_id,stats_payload,created_at,updated_at
  ) values (
    v_uid,v_key,left(trim(coalesce(p_target,'20')),24),left(trim(coalesce(p_rule,'all')),24),p_visits,
    left(trim(coalesce(p_match_mode,'solo')),24),'public',null,null,
    greatest(0,p_score),greatest(0,coalesce(p_darts,0)),greatest(0,coalesce(p_best_streak,0)),
    greatest(0,least(100,coalesce(p_accuracy,0))),v_match,coalesce(p_stats,'{}'::jsonb),now(),now()
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
    stats_payload=excluded.stats_payload,
    updated_at=now();

  -- Publication automatique dans chaque classement privé OFFICIEL dont le compte
  -- est membre. Le client ne fournit jamais cette appartenance : elle vient des tables Organisation.
  for v_group in
    select g.id,g.name,g.organization_id
    from public.ms_organization_group_members gm
    join public.ms_organization_groups g on g.id=gm.group_id and g.organization_id=gm.organization_id
    join public.ms_organization_members om on om.organization_id=gm.organization_id and om.user_id=gm.user_id and om.status='active'
    where gm.user_id=v_uid
      and coalesce(g.status,'active')='active'
      and g.kind='team'
      and lower(coalesce(g.sport_id,'')) in ('darts','dart','flechettes','fléchettes')
  loop
    insert into public.ms_challenge_score_entries_v2(
      user_id,objective_key,target,rule,visits,match_mode,scope_key,team_key,team_name,
      score,darts,best_streak,accuracy,match_id,stats_payload,created_at,updated_at
    ) values (
      v_uid,v_key,left(trim(coalesce(p_target,'20')),24),left(trim(coalesce(p_rule,'all')),24),p_visits,
      left(trim(coalesce(p_match_mode,'solo')),24),'official:'||v_group.id::text,v_group.id::text,v_group.name,
      greatest(0,p_score),greatest(0,coalesce(p_darts,0)),greatest(0,coalesce(p_best_streak,0)),
      greatest(0,least(100,coalesce(p_accuracy,0))),v_match,coalesce(p_stats,'{}'::jsonb),now(),now()
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
      stats_payload=excluded.stats_payload,
      updated_at=now();
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
    'matchId',r.match_id,
    'detailAvailable',(r.stats_payload <> '{}'::jsonb),
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
  order by s.score desc,s.accuracy desc,s.best_streak desc,s.darts asc,s.updated_at asc,s.match_id asc
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

revoke all on function public.ms_challenge_official_team_scopes_v3() from public;
revoke all on function public.ms_submit_challenge_score_v3(text,text,text,integer,text,integer,integer,integer,numeric,text,jsonb) from public;
revoke all on function public.ms_challenge_leaderboard_v3(text,text,integer) from public;
revoke all on function public.ms_challenge_score_detail_v3(text,text,text) from public;

grant execute on function public.ms_challenge_official_team_scopes_v3() to authenticated;
grant execute on function public.ms_submit_challenge_score_v3(text,text,text,integer,text,integer,integer,integer,numeric,text,jsonb) to authenticated;
grant execute on function public.ms_challenge_leaderboard_v3(text,text,integer) to authenticated;
grant execute on function public.ms_challenge_score_detail_v3(text,text,text) to authenticated;

commit;
