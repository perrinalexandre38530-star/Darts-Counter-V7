-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V6
-- Classements calculés à la demande depuis les compétitions V5.
-- IMPORTANT : cette migration NE CRÉE AUCUNE TABLE et ne stocke AUCUNE statistique supplémentaire.
-- Les agrégats sont recalculés depuis les participants + rencontres légères déjà présentes.
-- Les statistiques sportives détaillées / historiques complets restent dans R2 / NAS / stockage choisi.

begin;

create or replace function public.ms_org_get_rankings(
  p_org_id uuid,
  p_competition_id uuid default null,
  p_sport_id text default null
)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  with filtered_competitions as (
    select c.id
    from public.ms_organization_competitions c
    where c.organization_id=p_org_id
      and auth.uid() is not null
      and public.ms_org_is_member(p_org_id)
      and (p_competition_id is null or c.id=p_competition_id)
      and (p_sport_id is null or trim(p_sport_id)='' or lower(c.sport_id)=lower(trim(p_sport_id)))
  ),
  fixture_base as (
    select
      f.*,
      regexp_match(
        coalesce(f.score_label,''),
        '([0-9]+)[[:space:]]*[-–—:][[:space:]]*([0-9]+)'
      ) as score_parts
    from public.ms_organization_competition_fixtures f
    join filtered_competitions c on c.id=f.competition_id
    where f.status='completed'
      and f.winner_participant_id is not null
  ),
  outcomes as (
    select
      hp.entity_type,
      hp.entity_id,
      hp.display_name,
      f.id as fixture_id,
      f.updated_at as played_at,
      (f.winner_participant_id=hp.id) as won,
      case when f.score_parts is not null then (f.score_parts)[1]::integer else 0 end as score_for,
      case when f.score_parts is not null then (f.score_parts)[2]::integer else 0 end as score_against
    from fixture_base f
    join public.ms_organization_competition_participants hp on hp.id=f.home_participant_id

    union all

    select
      ap.entity_type,
      ap.entity_id,
      ap.display_name,
      f.id as fixture_id,
      f.updated_at as played_at,
      (f.winner_participant_id=ap.id) as won,
      case when f.score_parts is not null then (f.score_parts)[2]::integer else 0 end as score_for,
      case when f.score_parts is not null then (f.score_parts)[1]::integer else 0 end as score_against
    from fixture_base f
    join public.ms_organization_competition_participants ap on ap.id=f.away_participant_id
  ),
  aggregates as (
    select
      entity_type,
      entity_id,
      max(display_name) as display_name,
      count(*)::integer as played,
      count(*) filter (where won)::integer as wins,
      count(*) filter (where not won)::integer as losses,
      (count(*) filter (where won) * 3)::integer as points,
      coalesce(sum(score_for),0)::integer as score_for,
      coalesce(sum(score_against),0)::integer as score_against,
      (coalesce(sum(score_for),0)-coalesce(sum(score_against),0))::integer as score_diff,
      round((100.0 * count(*) filter (where won) / nullif(count(*),0))::numeric,1) as win_rate
    from outcomes
    group by entity_type,entity_id
  ),
  descending_outcomes as (
    select
      o.*,
      row_number() over (partition by entity_type,entity_id order by played_at desc,fixture_id desc) as rn,
      first_value(won) over (partition by entity_type,entity_id order by played_at desc,fixture_id desc) as first_won
    from outcomes o
  ),
  current_streaks as (
    select
      entity_type,
      entity_id,
      case when first_won then 'W' else 'L' end as streak_type,
      case
        when min(rn) filter (where won is distinct from first_won) is null then max(rn)
        else min(rn) filter (where won is distinct from first_won)-1
      end::integer as streak_length
    from descending_outcomes
    group by entity_type,entity_id,first_won
  ),
  win_groups as (
    select
      o.*,
      sum(case when won then 0 else 1 end) over (
        partition by entity_type,entity_id
        order by played_at,fixture_id
        rows between unbounded preceding and current row
      ) as loss_group
    from outcomes o
  ),
  win_runs as (
    select entity_type,entity_id,loss_group,count(*) filter (where won)::integer as run_wins
    from win_groups
    group by entity_type,entity_id,loss_group
  ),
  best_streaks as (
    select entity_type,entity_id,coalesce(max(run_wins),0)::integer as best_win_streak
    from win_runs
    group by entity_type,entity_id
  ),
  recent_numbered as (
    select
      o.*,
      row_number() over (partition by entity_type,entity_id order by played_at desc,fixture_id desc) as recent_rn
    from outcomes o
  ),
  recent_forms as (
    select
      entity_type,
      entity_id,
      string_agg(case when won then 'W' else 'L' end,'' order by played_at desc,fixture_id desc)
        filter (where recent_rn<=5) as recent_form
    from recent_numbered
    group by entity_type,entity_id
  ),
  enriched as (
    select
      a.*,
      coalesce(cs.streak_length,0) as current_streak,
      coalesce(cs.streak_type,'L') as current_streak_type,
      coalesce(bs.best_win_streak,0) as best_win_streak,
      coalesce(rf.recent_form,'') as recent_form
    from aggregates a
    left join current_streaks cs using(entity_type,entity_id)
    left join best_streaks bs using(entity_type,entity_id)
    left join recent_forms rf using(entity_type,entity_id)
  ),
  ranked as (
    select
      e.*,
      row_number() over (
        order by e.points desc,e.wins desc,e.score_diff desc,e.win_rate desc,e.display_name asc
      )::integer as rank_position
    from enriched e
  )
  select jsonb_build_object(
    'rank',r.rank_position,
    'entityType',r.entity_type,
    'entityId',r.entity_id::text,
    'displayName',r.display_name,
    'played',r.played,
    'wins',r.wins,
    'losses',r.losses,
    'points',r.points,
    'winRate',coalesce(r.win_rate,0),
    'scoreFor',r.score_for,
    'scoreAgainst',r.score_against,
    'scoreDiff',r.score_diff,
    'currentStreak',r.current_streak,
    'currentStreakType',r.current_streak_type,
    'bestWinStreak',r.best_win_streak,
    'recentForm',r.recent_form
  )
  from ranked r
  order by r.rank_position;
$$;

revoke all on function public.ms_org_get_rankings(uuid,uuid,text) from public;
grant execute on function public.ms_org_get_rankings(uuid,uuid,text) to authenticated;

commit;
