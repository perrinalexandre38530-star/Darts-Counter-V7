-- MULTISPORTS SCORING · E-SPORTS HUB V0.6 RANKED PROGRESSION
-- Divisions + 5 placement matches + MMR history + rematch + voluntary forfeit + dispute cases.
-- Requires E-SPORTS V0.3, V0.4 and V0.5 migrations.

create extension if not exists pgcrypto;

alter table public.ms_esports_ratings add column if not exists placement_matches integer not null default 0 check(placement_matches between 0 and 5);
alter table public.ms_esports_ratings add column if not exists peak_rating integer not null default 1000 check(peak_rating between 100 and 5000);
alter table public.ms_esports_ratings add column if not exists streak integer not null default 0;
alter table public.ms_esports_competitive_matches add column if not exists resolution_reason text not null default 'ranked';

update public.ms_esports_ratings
set placement_matches=least(5,matches), peak_rating=greatest(peak_rating,rating)
where placement_matches<>least(5,matches) or peak_rating<rating;

create table if not exists public.ms_esports_rating_history (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  match_id uuid references public.ms_esports_competitive_matches(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  result text not null check(result in ('win','loss','draw')),
  reason text not null default 'ranked',
  created_at timestamptz not null default now(),
  unique(match_id,user_id)
);
create index if not exists ms_esports_rating_history_user_idx on public.ms_esports_rating_history(user_id,game_id,created_at desc);

create table if not exists public.ms_esports_rematch_requests (
  match_id uuid not null references public.ms_esports_competitive_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(match_id,user_id)
);

create table if not exists public.ms_esports_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.ms_esports_competitive_matches(id) on delete cascade,
  opened_by_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'score_mismatch',
  details text not null default '',
  status text not null default 'open' check(status in ('open','resolved','rejected')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_esports_disputes_status_idx on public.ms_esports_disputes(status,updated_at desc);

alter table public.ms_esports_rating_history enable row level security;
alter table public.ms_esports_rematch_requests enable row level security;
alter table public.ms_esports_disputes enable row level security;

drop policy if exists ms_esports_rating_history_select on public.ms_esports_rating_history;
create policy ms_esports_rating_history_select on public.ms_esports_rating_history for select to authenticated using(user_id=auth.uid());

drop policy if exists ms_esports_rematch_select on public.ms_esports_rematch_requests;
create policy ms_esports_rematch_select on public.ms_esports_rematch_requests for select to authenticated using(
  exists(select 1 from public.ms_esports_competitive_matches m where m.id=match_id and (m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid()))
);

drop policy if exists ms_esports_disputes_select on public.ms_esports_disputes;
create policy ms_esports_disputes_select on public.ms_esports_disputes for select to authenticated using(
  exists(select 1 from public.ms_esports_competitive_matches m where m.id=match_id and (m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid()))
);

-- Backfill V0.5 confirmed matches so V0.6 charts are not empty after migration.
insert into public.ms_esports_rating_history(season_id,user_id,game_id,match_id,rating_before,rating_after,delta,result,reason,created_at)
select m.season_id,m.player_a_user_id,m.game_id,m.id,m.mmr_a_before,m.mmr_a_after,m.mmr_a_after-m.mmr_a_before,
  case when m.final_score_a>m.final_score_b then 'win' when m.final_score_a<m.final_score_b then 'loss' else 'draw' end,
  coalesce(m.resolution_reason,'ranked'),coalesce(m.confirmed_at,m.updated_at)
from public.ms_esports_competitive_matches m
where m.status='confirmed' and m.season_id is not null and m.mmr_a_before is not null and m.mmr_a_after is not null
on conflict(match_id,user_id) do nothing;
insert into public.ms_esports_rating_history(season_id,user_id,game_id,match_id,rating_before,rating_after,delta,result,reason,created_at)
select m.season_id,m.player_b_user_id,m.game_id,m.id,m.mmr_b_before,m.mmr_b_after,m.mmr_b_after-m.mmr_b_before,
  case when m.final_score_b>m.final_score_a then 'win' when m.final_score_b<m.final_score_a then 'loss' else 'draw' end,
  coalesce(m.resolution_reason,'ranked'),coalesce(m.confirmed_at,m.updated_at)
from public.ms_esports_competitive_matches m
where m.status='confirmed' and m.season_id is not null and m.mmr_b_before is not null and m.mmr_b_after is not null
on conflict(match_id,user_id) do nothing;

create or replace function public.ms_esports_division_v6(p_rating integer,p_matches integer)
returns jsonb language plpgsql immutable as $$
declare r integer:=greatest(100,least(coalesce(p_rating,1000),5000)); m integer:=greatest(0,coalesce(p_matches,0)); v_floor integer; v_next integer; v_id text; v_label text; v_next_label text; v_idx integer; v_progress integer;
begin
  if m<5 then return jsonb_build_object('division','placement','divisionLabel','PLACEMENT','divisionIndex',0,'progressPercent',least(100,m*20),'nextDivision','RANKED','nextRating',null); end if;
  if r<900 then v_id:='bronze'; v_label:='BRONZE'; v_floor:=100; v_next:=900; v_next_label:='SILVER'; v_idx:=1;
  elsif r<1050 then v_id:='silver'; v_label:='SILVER'; v_floor:=900; v_next:=1050; v_next_label:='GOLD'; v_idx:=2;
  elsif r<1200 then v_id:='gold'; v_label:='GOLD'; v_floor:=1050; v_next:=1200; v_next_label:='PLATINUM'; v_idx:=3;
  elsif r<1400 then v_id:='platinum'; v_label:='PLATINUM'; v_floor:=1200; v_next:=1400; v_next_label:='DIAMOND'; v_idx:=4;
  elsif r<1600 then v_id:='diamond'; v_label:='DIAMOND'; v_floor:=1400; v_next:=1600; v_next_label:='MASTER'; v_idx:=5;
  elsif r<1850 then v_id:='master'; v_label:='MASTER'; v_floor:=1600; v_next:=1850; v_next_label:='GRANDMASTER'; v_idx:=6;
  elsif r<2100 then v_id:='grandmaster'; v_label:='GRANDMASTER'; v_floor:=1850; v_next:=2100; v_next_label:='CHAMPION'; v_idx:=7;
  else return jsonb_build_object('division','champion','divisionLabel','CHAMPION','divisionIndex',8,'progressPercent',100,'nextDivision',null,'nextRating',null); end if;
  v_progress:=greatest(0,least(100,round((r-v_floor)::numeric/greatest(1,v_next-v_floor)*100)::integer));
  return jsonb_build_object('division',v_id,'divisionLabel',v_label,'divisionIndex',v_idx,'progressPercent',v_progress,'nextDivision',v_next_label,'nextRating',v_next);
end $$;

create or replace function public.ms_esports_v6_apply_rating(
  p_season uuid,p_user uuid,p_game text,p_opponent_rating integer,p_score numeric,p_match uuid,p_reason text
) returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_before integer:=1000; v_after integer; v_matches integer:=0; v_expected numeric; v_k integer; v_result text; v_streak integer:=0;
begin
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(p_season,p_user,p_game) on conflict do nothing;
  select rating,matches,streak into v_before,v_matches,v_streak from public.ms_esports_ratings where season_id=p_season and user_id=p_user and game_id=p_game for update;
  v_expected:=1.0/(1.0+power(10.0,(coalesce(p_opponent_rating,1000)-v_before)/400.0));
  v_k:=case when v_matches<5 then 48 else 32 end;
  v_after:=greatest(100,least(5000,round(v_before+v_k*(p_score-v_expected))::integer));
  v_result:=case when p_score>0.5 then 'win' when p_score<0.5 then 'loss' else 'draw' end;
  update public.ms_esports_ratings set
    rating=v_after,
    matches=matches+1,
    wins=wins+case when p_score=1 then 1 else 0 end,
    losses=losses+case when p_score=0 then 1 else 0 end,
    draws=draws+case when p_score=.5 then 1 else 0 end,
    placement_matches=least(5,placement_matches+1),
    peak_rating=greatest(peak_rating,v_after),
    streak=case when p_score=1 then greatest(1,streak+1) when p_score=0 then least(-1,streak-1) else 0 end,
    last_match_at=now(),updated_at=now()
  where season_id=p_season and user_id=p_user and game_id=p_game;
  insert into public.ms_esports_rating_history(season_id,user_id,game_id,match_id,rating_before,rating_after,delta,result,reason)
  values(p_season,p_user,p_game,p_match,v_before,v_after,v_after-v_before,v_result,coalesce(nullif(trim(p_reason),''),'ranked'))
  on conflict(match_id,user_id) do nothing;
  return jsonb_build_object('before',v_before,'after',v_after,'delta',v_after-v_before,'result',v_result);
end $$;

-- V0.6 upgrades the existing V0.5 submit RPC while preserving its API contract.
create or replace function public.ms_esports_submit_competitive_result(p_match_id uuid,p_score_a integer,p_score_b integer) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_score_a integer:=greatest(0,least(coalesce(p_score_a,0),999)); v_score_b integer:=greatest(0,least(coalesce(p_score_b,0),999));
  v_ra integer:=1000; v_rb integer:=1000; v_sa numeric; v_sb numeric; v_winner uuid; v_season uuid; v_res_a jsonb; v_res_b jsonb;
  v_a_report_a integer; v_a_report_b integer; v_b_report_a integer; v_b_report_b integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if exists(select 1 from public.ms_esports_disputes where match_id=v_match.id and status='open') then raise exception 'DISPUTE_OPEN'; end if;
  if v_match.status='cancelled' then raise exception 'MATCH_CANCELLED'; end if;
  if v_match.status='confirmed' then return public.ms_esports_v5_match_json(v_match,v_uid); end if;
  if v_uid=v_match.player_a_user_id then
    update public.ms_esports_competitive_matches set report_a=jsonb_build_object('scoreA',v_score_a,'scoreB',v_score_b,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v_match.id returning * into v_match;
  else
    update public.ms_esports_competitive_matches set report_b=jsonb_build_object('scoreA',v_score_a,'scoreB',v_score_b,'submittedAt',now()),status='pending_confirmation',updated_at=now() where id=v_match.id returning * into v_match;
  end if;
  if v_match.report_a is not null and v_match.report_b is not null then
    v_a_report_a:=coalesce((v_match.report_a->>'scoreA')::integer,-1); v_a_report_b:=coalesce((v_match.report_a->>'scoreB')::integer,-1);
    v_b_report_a:=coalesce((v_match.report_b->>'scoreA')::integer,-1); v_b_report_b:=coalesce((v_match.report_b->>'scoreB')::integer,-1);
    if v_a_report_a=v_b_report_a and v_a_report_b=v_b_report_b then
      v_season:=coalesce(v_match.season_id,public.ms_esports_v4_active_season_id());
      insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_a_user_id,v_match.game_id) on conflict do nothing;
      insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_b_user_id,v_match.game_id) on conflict do nothing;
      select rating into v_ra from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_a_user_id and game_id=v_match.game_id for update;
      select rating into v_rb from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_b_user_id and game_id=v_match.game_id for update;
      if v_score_a>v_score_b then v_sa:=1; v_sb:=0; v_winner:=v_match.player_a_user_id;
      elsif v_score_b>v_score_a then v_sa:=0; v_sb:=1; v_winner:=v_match.player_b_user_id;
      else v_sa:=0.5; v_sb:=0.5; v_winner:=null; end if;
      v_res_a:=public.ms_esports_v6_apply_rating(v_season,v_match.player_a_user_id,v_match.game_id,v_rb,v_sa,v_match.id,'ranked');
      v_res_b:=public.ms_esports_v6_apply_rating(v_season,v_match.player_b_user_id,v_match.game_id,v_ra,v_sb,v_match.id,'ranked');
      update public.ms_esports_competitive_matches set season_id=v_season,status='confirmed',resolution_reason='ranked',final_score_a=v_score_a,final_score_b=v_score_b,winner_user_id=v_winner,
        mmr_a_before=(v_res_a->>'before')::integer,mmr_a_after=(v_res_a->>'after')::integer,mmr_b_before=(v_res_b->>'before')::integer,mmr_b_after=(v_res_b->>'after')::integer,confirmed_at=now(),updated_at=now()
      where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||(v_res_a->>'after'),jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',(v_res_a->>'after')::integer));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||(v_res_b->>'after'),jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',(v_res_b->>'after')::integer));
    else
      update public.ms_esports_competitive_matches set status='disputed',updated_at=now() where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie ou ouvrez un litige.',jsonb_build_object('matchId',v_match.id::text));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie ou ouvrez un litige.',jsonb_build_object('matchId',v_match.id::text));
    end if;
  end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_rating_profile_v6(p_game_id text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_game text:=trim(coalesce(p_game_id,'')); v_season public.ms_esports_seasons; v_rating public.ms_esports_ratings; v_div jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if; if v_game='' then raise exception 'GAME_REQUIRED'; end if;
  select * into v_season from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1;
  if not found then raise exception 'NO_ACTIVE_SEASON'; end if;
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season.id,v_uid,v_game) on conflict do nothing;
  select * into v_rating from public.ms_esports_ratings where season_id=v_season.id and user_id=v_uid and game_id=v_game;
  v_div:=public.ms_esports_division_v6(v_rating.rating,v_rating.matches);
  return v_div || jsonb_build_object('userId',v_uid::text,'gameId',v_game,'rating',v_rating.rating,'matches',v_rating.matches,'wins',v_rating.wins,'losses',v_rating.losses,'draws',v_rating.draws,
    'winRate',case when v_rating.matches=0 then 0 else round(v_rating.wins::numeric/v_rating.matches*100)::integer end,'placementsDone',least(5,v_rating.placement_matches),'placementsRemaining',greatest(0,5-v_rating.placement_matches),
    'peakRating',greatest(v_rating.peak_rating,v_rating.rating),'streak',v_rating.streak,'seasonName',v_season.name,'seasonSlug',v_season.slug);
end $$;

create or replace function public.ms_esports_rating_history_v6(p_game_id text,p_limit integer default 40)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',h.id::text,'matchId',h.match_id::text,'gameId',h.game_id,'ratingBefore',h.rating_before,'ratingAfter',h.rating_after,'delta',h.delta,'result',h.result,'reason',h.reason,'createdAt',h.created_at)
  from public.ms_esports_rating_history h where h.user_id=auth.uid() and h.game_id=trim(p_game_id) order by h.created_at desc limit greatest(5,least(coalesce(p_limit,40),100));
$$;

create or replace function public.ms_esports_ranked_history_v6(p_game_id text,p_limit integer default 30)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with x as (
    select m.*,
      case when m.player_a_user_id=auth.uid() then m.player_b_user_id else m.player_a_user_id end opponent_id,
      case when m.player_a_user_id=auth.uid() then 'A' else 'B' end my_side,
      case when m.player_a_user_id=auth.uid() then m.final_score_a else m.final_score_b end score_for,
      case when m.player_a_user_id=auth.uid() then m.final_score_b else m.final_score_a end score_against,
      case when m.player_a_user_id=auth.uid() then m.mmr_a_before else m.mmr_b_before end mmr_before,
      case when m.player_a_user_id=auth.uid() then m.mmr_a_after else m.mmr_b_after end mmr_after
    from public.ms_esports_competitive_matches m
    where (m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid()) and m.game_id=trim(p_game_id)
    order by m.created_at desc limit greatest(5,least(coalesce(p_limit,30),100))
  )
  select jsonb_build_object('matchId',x.id::text,'gameId',x.game_id,'opponentUserId',x.opponent_id::text,'opponentDisplayName',coalesce(e.display_name,p.display_name,'Gamer'),'opponentAvatarUrl',p.avatar_url,'mySide',x.my_side,
    'scoreFor',x.score_for,'scoreAgainst',x.score_against,
    'result',case when x.status='disputed' then 'disputed' when x.status='cancelled' then 'cancelled' when x.status<>'confirmed' then 'pending' when x.score_for>x.score_against then 'win' when x.score_for<x.score_against then 'loss' else 'draw' end,
    'mmrBefore',x.mmr_before,'mmrAfter',x.mmr_after,'status',x.status,'reason',coalesce(x.resolution_reason,'ranked'),'createdAt',x.created_at,'confirmedAt',x.confirmed_at)
  from x left join public.ms_esports_profiles e on e.user_id=x.opponent_id left join public.ms_public_profiles p on p.user_id=x.opponent_id;
$$;

create or replace function public.ms_esports_forfeit_competitive_match_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_season uuid; v_ra integer:=1000; v_rb integer:=1000; v_sa numeric; v_sb numeric; v_winner uuid; v_res_a jsonb; v_res_b jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if; if v_match.status in ('confirmed','cancelled') then raise exception 'MATCH_ALREADY_FINAL'; end if;
  if exists(select 1 from public.ms_esports_disputes where match_id=v_match.id and status='open') then raise exception 'DISPUTE_OPEN'; end if;
  v_season:=coalesce(v_match.season_id,public.ms_esports_v4_active_season_id());
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_a_user_id,v_match.game_id) on conflict do nothing;
  insert into public.ms_esports_ratings(season_id,user_id,game_id) values(v_season,v_match.player_b_user_id,v_match.game_id) on conflict do nothing;
  select rating into v_ra from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_a_user_id and game_id=v_match.game_id for update;
  select rating into v_rb from public.ms_esports_ratings where season_id=v_season and user_id=v_match.player_b_user_id and game_id=v_match.game_id for update;
  if v_uid=v_match.player_a_user_id then v_sa:=0; v_sb:=1; v_winner:=v_match.player_b_user_id; else v_sa:=1; v_sb:=0; v_winner:=v_match.player_a_user_id; end if;
  v_res_a:=public.ms_esports_v6_apply_rating(v_season,v_match.player_a_user_id,v_match.game_id,v_rb,v_sa,v_match.id,'forfeit');
  v_res_b:=public.ms_esports_v6_apply_rating(v_season,v_match.player_b_user_id,v_match.game_id,v_ra,v_sb,v_match.id,'forfeit');
  update public.ms_esports_competitive_matches set season_id=v_season,status='confirmed',resolution_reason='forfeit',final_score_a=case when v_winner=player_a_user_id then 1 else 0 end,final_score_b=case when v_winner=player_b_user_id then 1 else 0 end,winner_user_id=v_winner,
    mmr_a_before=(v_res_a->>'before')::integer,mmr_a_after=(v_res_a->>'after')::integer,mmr_b_before=(v_res_b->>'before')::integer,mmr_b_after=(v_res_b->>'after')::integer,confirmed_at=now(),updated_at=now()
  where id=v_match.id returning * into v_match;
  perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_forfeit','Match terminé par forfait','Le match classé a été finalisé par forfait.',jsonb_build_object('matchId',v_match.id::text));
  perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_forfeit','Match terminé par forfait','Le match classé a été finalisé par forfait.',jsonb_build_object('matchId',v_match.id::text));
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_rematch_state_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_other uuid; v_me boolean; v_them boolean; v_new uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid);
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
  select exists(select 1 from public.ms_esports_rematch_requests where match_id=p_match_id and user_id=v_uid) into v_me;
  select exists(select 1 from public.ms_esports_rematch_requests where match_id=p_match_id and user_id=v_other) into v_them;
  select id into v_new from public.ms_esports_competitive_matches where source_pair_key='rematch:'||p_match_id::text limit 1;
  return jsonb_build_object('matchId',p_match_id::text,'requestedByMe',v_me,'requestedByOpponent',v_them,'ready',v_new is not null,'newMatchId',case when v_new is null then null else v_new::text end);
end $$;

create or replace function public.ms_esports_request_rematch_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_other uuid; v_count integer; v_new public.ms_esports_competitive_matches;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and status='confirmed' and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'CONFIRMED_MATCH_REQUIRED'; end if;
  v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
  insert into public.ms_esports_rematch_requests(match_id,user_id) values(v_match.id,v_uid) on conflict do nothing;
  select count(*) into v_count from public.ms_esports_rematch_requests where match_id=v_match.id;
  if v_count=1 then perform public.ms_esports_v4_notify(v_other,'ranked_rematch_request','Demande de rematch','Ton adversaire souhaite rejouer immédiatement.',jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id)); end if;
  if v_count>=2 then
    insert into public.ms_esports_competitive_matches(source_pair_key,season_id,game_id,platform,mode,team_size,player_a_user_id,player_b_user_id,host_user_id,status,resolution_reason)
    values('rematch:'||v_match.id::text,public.ms_esports_v4_active_season_id(),v_match.game_id,v_match.platform,v_match.mode,v_match.team_size,v_match.player_a_user_id,v_match.player_b_user_id,
      case when v_match.host_user_id=v_match.player_a_user_id then v_match.player_b_user_id else v_match.player_a_user_id end,'matched','ranked')
    on conflict(source_pair_key) do nothing;
    select * into v_new from public.ms_esports_competitive_matches where source_pair_key='rematch:'||v_match.id::text;
    perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_rematch_ready','Rematch accepté','Les deux joueurs ont accepté. Nouvelle session créée.',jsonb_build_object('matchId',v_new.id::text,'gameId',v_new.game_id));
    perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_rematch_ready','Rematch accepté','Les deux joueurs ont accepté. Nouvelle session créée.',jsonb_build_object('matchId',v_new.id::text,'gameId',v_new.game_id));
  end if;
  return public.ms_esports_rematch_state_v6(v_match.id);
end $$;

create or replace function public.ms_esports_open_dispute_v6(p_match_id uuid,p_reason text,p_details text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_case public.ms_esports_disputes; v_other uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if; if v_match.status in ('confirmed','cancelled') then raise exception 'MATCH_ALREADY_FINAL'; end if;
  if length(trim(coalesce(p_details,'')))<3 then raise exception 'DETAILS_REQUIRED'; end if;
  insert into public.ms_esports_disputes(match_id,opened_by_user_id,reason,details,status) values(v_match.id,v_uid,left(coalesce(nullif(trim(p_reason),''),'other'),64),left(trim(p_details),1000),'open')
  on conflict(match_id) do update set opened_by_user_id=excluded.opened_by_user_id,reason=excluded.reason,details=excluded.details,status='open',resolution=null,updated_at=now() returning * into v_case;
  update public.ms_esports_competitive_matches set status='disputed',updated_at=now() where id=v_match.id;
  v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
  perform public.ms_esports_v4_notify(v_other,'ranked_dispute_open','Litige ouvert','Un dossier de litige a été ouvert sur votre match classé. Le MMR reste gelé.',jsonb_build_object('matchId',v_match.id::text,'disputeId',v_case.id::text));
  return jsonb_build_object('id',v_case.id::text,'matchId',v_case.match_id::text,'status',v_case.status,'reason',v_case.reason,'details',v_case.details,'openedByMe',v_case.opened_by_user_id=v_uid,'resolution',v_case.resolution,'createdAt',v_case.created_at,'updatedAt',v_case.updated_at);
end $$;

create or replace function public.ms_esports_withdraw_dispute_v6(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_case public.ms_esports_disputes; v_match public.ms_esports_competitive_matches;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_case from public.ms_esports_disputes where match_id=p_match_id and status='open' and opened_by_user_id=v_uid for update;
  if not found then raise exception 'OPEN_OWN_DISPUTE_REQUIRED'; end if;
  update public.ms_esports_disputes set status='resolved',resolution='withdrawn_by_opener',updated_at=now() where id=v_case.id returning * into v_case;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id for update;
  update public.ms_esports_competitive_matches set status=case when v_match.report_a is not null or v_match.report_b is not null then 'pending_confirmation' when v_match.room_code is not null then 'room_ready' else 'matched' end,updated_at=now() where id=p_match_id;
  return jsonb_build_object('id',v_case.id::text,'matchId',v_case.match_id::text,'status',v_case.status,'reason',v_case.reason,'details',v_case.details,'openedByMe',true,'resolution',v_case.resolution,'createdAt',v_case.created_at,'updatedAt',v_case.updated_at);
end $$;

create or replace function public.ms_esports_list_disputes_v6(p_limit integer default 20)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',d.id::text,'matchId',d.match_id::text,'status',d.status,'reason',d.reason,'details',d.details,'openedByMe',d.opened_by_user_id=auth.uid(),'resolution',d.resolution,'createdAt',d.created_at,'updatedAt',d.updated_at)
  from public.ms_esports_disputes d join public.ms_esports_competitive_matches m on m.id=d.match_id
  where m.player_a_user_id=auth.uid() or m.player_b_user_id=auth.uid() order by d.updated_at desc limit greatest(1,least(coalesce(p_limit,20),50));
$$;

revoke all on function public.ms_esports_division_v6(integer,integer) from public;
revoke all on function public.ms_esports_v6_apply_rating(uuid,uuid,text,integer,numeric,uuid,text) from public;
revoke all on function public.ms_esports_rating_profile_v6(text) from public;
revoke all on function public.ms_esports_rating_history_v6(text,integer) from public;
revoke all on function public.ms_esports_ranked_history_v6(text,integer) from public;
revoke all on function public.ms_esports_forfeit_competitive_match_v6(uuid) from public;
revoke all on function public.ms_esports_rematch_state_v6(uuid) from public;
revoke all on function public.ms_esports_request_rematch_v6(uuid) from public;
revoke all on function public.ms_esports_open_dispute_v6(uuid,text,text) from public;
revoke all on function public.ms_esports_withdraw_dispute_v6(uuid) from public;
revoke all on function public.ms_esports_list_disputes_v6(integer) from public;

grant execute on function public.ms_esports_rating_profile_v6(text) to authenticated;
grant execute on function public.ms_esports_rating_history_v6(text,integer) to authenticated;
grant execute on function public.ms_esports_ranked_history_v6(text,integer) to authenticated;
grant execute on function public.ms_esports_forfeit_competitive_match_v6(uuid) to authenticated;
grant execute on function public.ms_esports_rematch_state_v6(uuid) to authenticated;
grant execute on function public.ms_esports_request_rematch_v6(uuid) to authenticated;
grant execute on function public.ms_esports_open_dispute_v6(uuid,text,text) to authenticated;
grant execute on function public.ms_esports_withdraw_dispute_v6(uuid) to authenticated;
grant execute on function public.ms_esports_list_disputes_v6(integer) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_rating_history') then execute 'alter publication supabase_realtime add table public.ms_esports_rating_history'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_rematch_requests') then execute 'alter publication supabase_realtime add table public.ms_esports_rematch_requests'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_disputes') then execute 'alter publication supabase_realtime add table public.ms_esports_disputes'; end if;
end $$;
