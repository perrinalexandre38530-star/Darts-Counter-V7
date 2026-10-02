-- MULTISPORTS SCORING — CHALLENGE leaderboard V4
-- Restaure les joueurs historiques après le passage V2 -> V3.
-- V2 séparait SOLO / DUO / DUEL / MULTI dans objective_key ; V3 les regroupe
-- car la performance classée reste individuelle. Cette migration recopie les
-- anciennes entrées vers la clé V3 sans supprimer aucune donnée existante.

begin;

alter table public.ms_challenge_score_entries_v2
  add column if not exists stats_payload jsonb not null default '{}'::jsonb;

-- 1) V2 -> V3 : même match, même joueur, même configuration comparable,
-- mais sans le segment matchMode dans la clé.
insert into public.ms_challenge_score_entries_v2(
  user_id, objective_key, target, rule, visits, match_mode,
  scope_key, team_key, team_name,
  score, darts, best_streak, accuracy, match_id, stats_payload,
  created_at, updated_at
)
select
  s.user_id,
  'challenge:v3:' || split_part(s.objective_key, ':', 3) || ':' ||
    split_part(s.objective_key, ':', 4) || ':' ||
    split_part(s.objective_key, ':', 5) || ':' ||
    coalesce(nullif(split_part(s.objective_key, ':', 7), ''), 'none') || ':' ||
    coalesce(nullif(split_part(s.objective_key, ':', 8), ''), '0') || ':' ||
    coalesce(nullif(split_part(s.objective_key, ':', 9), ''), 'none') || ':' ||
    coalesce(nullif(split_part(s.objective_key, ':', 10), ''), '0'),
  s.target,
  s.rule,
  s.visits,
  s.match_mode,
  s.scope_key,
  s.team_key,
  s.team_name,
  s.score,
  s.darts,
  s.best_streak,
  s.accuracy,
  s.match_id,
  coalesce(s.stats_payload, '{}'::jsonb),
  s.created_at,
  s.updated_at
from public.ms_challenge_score_entries_v2 s
where s.objective_key like 'challenge:v2:%'
on conflict(user_id, objective_key, scope_key, match_id) do update set
  target = excluded.target,
  rule = excluded.rule,
  visits = excluded.visits,
  match_mode = excluded.match_mode,
  team_key = coalesce(excluded.team_key, public.ms_challenge_score_entries_v2.team_key),
  team_name = coalesce(excluded.team_name, public.ms_challenge_score_entries_v2.team_name),
  score = greatest(public.ms_challenge_score_entries_v2.score, excluded.score),
  darts = case
    when excluded.score > public.ms_challenge_score_entries_v2.score then excluded.darts
    else public.ms_challenge_score_entries_v2.darts
  end,
  best_streak = greatest(public.ms_challenge_score_entries_v2.best_streak, excluded.best_streak),
  accuracy = greatest(public.ms_challenge_score_entries_v2.accuracy, excluded.accuracy),
  stats_payload = case
    when public.ms_challenge_score_entries_v2.stats_payload = '{}'::jsonb and excluded.stats_payload <> '{}'::jsonb then excluded.stats_payload
    else public.ms_challenge_score_entries_v2.stats_payload
  end,
  updated_at = greatest(public.ms_challenge_score_entries_v2.updated_at, excluded.updated_at);

-- 2) V1 -> V3 uniquement lorsqu'aucune entrée détaillée V2/V3 équivalente
-- n'existe déjà pour ce compte. On conserve ainsi les anciens joueurs qui
-- n'avaient qu'une ligne "best score" V1.
insert into public.ms_challenge_score_entries_v2(
  user_id, objective_key, target, rule, visits, match_mode,
  scope_key, team_key, team_name,
  score, darts, best_streak, accuracy, match_id, stats_payload,
  created_at, updated_at
)
select
  b.user_id,
  'challenge:v3:' || lower(trim(b.target)) || ':' || lower(trim(b.rule)) || ':' || b.visits::text || ':none:0:none:0',
  b.target,
  b.rule,
  b.visits,
  'solo',
  'public',
  null,
  null,
  b.best_score,
  b.best_darts,
  b.best_streak,
  b.best_accuracy,
  left(coalesce(nullif(trim(b.best_match_id), ''), 'legacy-v1-' || b.user_id::text || '-' || md5(b.objective_key)),160),
  '{}'::jsonb,
  b.created_at,
  b.updated_at
from public.ms_challenge_best_scores b
where b.objective_key like 'challenge:v1:%'
  and not exists (
    select 1
    from public.ms_challenge_score_entries_v2 s
    where s.user_id = b.user_id
      and s.scope_key = 'public'
      and s.target = b.target
      and s.rule = b.rule
      and s.visits = b.visits
  )
on conflict(user_id, objective_key, scope_key, match_id) do nothing;

commit;
