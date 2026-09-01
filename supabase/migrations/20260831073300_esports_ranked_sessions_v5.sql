-- MULTISPORTS SCORING · E-SPORTS HUB V0.5 RANKED SESSIONS
-- Matchmaking -> one canonical competitive session -> private online room code,
-- bilateral result confirmation and server-side Elo/MMR by game + season.
-- Requires E-SPORTS V0.3 + V0.4 migrations first.

create extension if not exists pgcrypto;

create table if not exists public.ms_esports_competitive_matches (
  id uuid primary key default gen_random_uuid(),
  source_pair_key text not null unique,
  season_id uuid references public.ms_esports_seasons(id) on delete set null,
  game_id text not null,
  platform text not null default 'crossplay',
  mode text not null default 'Ranked',
  team_size integer not null default 1 check(team_size between 1 and 10),
  player_a_user_id uuid not null references auth.users(id) on delete cascade,
  player_b_user_id uuid not null references auth.users(id) on delete cascade,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  room_code text,
  status text not null default 'matched' check(status in ('matched','room_ready','pending_confirmation','confirmed','disputed','cancelled')),
  report_a jsonb,
  report_b jsonb,
  final_score_a integer,
  final_score_b integer,
  winner_user_id uuid references auth.users(id) on delete set null,
  mmr_a_before integer,
  mmr_a_after integer,
  mmr_b_before integer,
  mmr_b_after integer,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(player_a_user_id <> player_b_user_id)
);
create index if not exists ms_esports_comp_matches_a_idx on public.ms_esports_competitive_matches(player_a_user_id,updated_at desc);
create index if not exists ms_esports_comp_matches_b_idx on public.ms_esports_competitive_matches(player_b_user_id,updated_at desc);
create index if not exists ms_esports_comp_matches_game_idx on public.ms_esports_competitive_matches(game_id,status,updated_at desc);

create table if not exists public.ms_esports_ratings (
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  rating integer not null default 1000 check(rating between 100 and 5000),
  matches integer not null default 0 check(matches >= 0),
  wins integer not null default 0 check(wins >= 0),
  losses integer not null default 0 check(losses >= 0),
  draws integer not null default 0 check(draws >= 0),
  last_match_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(season_id,user_id,game_id)
);
create index if not exists ms_esports_ratings_rank_idx on public.ms_esports_ratings(season_id,game_id,rating desc,matches desc);

alter table public.ms_esports_competitive_matches enable row level security;
alter table public.ms_esports_ratings enable row level security;

drop policy if exists ms_esports_comp_matches_select on public.ms_esports_competitive_matches;
create policy ms_esports_comp_matches_select on public.ms_esports_competitive_matches for select to authenticated using(
  player_a_user_id=auth.uid() or player_b_user_id=auth.uid()
);

drop policy if exists ms_esports_ratings_select on public.ms_esports_ratings;
create policy ms_esports_ratings_select on public.ms_esports_ratings for select to authenticated using(true);

create or replace function public.ms_esports_v5_match_json(p_match public.ms_esports_competitive_matches,p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,extensions as $$
declare
  v_a_name text; v_b_name text; v_a_avatar text; v_b_avatar text;
  v_a_rating integer:=1000; v_b_rating integer:=1000;
begin
  select coalesce(e.display_name,p.display_name,'Gamer'),p.avatar_url into v_a_name,v_a_avatar
  from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id
  where coalesce(e.user_id,p.user_id)=p_match.player_a_user_id limit 1;
  select coalesce(e.display_name,p.display_name,'Gamer'),p.avatar_url into v_b_name,v_b_avatar
  from public.ms_esports_profiles e full join public.ms_public_profiles p on p.user_id=e.user_id
  where coalesce(e.user_id,p.user_id)=p_match.player_b_user_id limit 1;
  if p_match.season_id is not null then
    select rating into v_a_rating from public.ms_esports_ratings where season_id=p_match.season_id and user_id=p_match.player_a_user_id and game_id=p_match.game_id;
    if v_a_rating is null then v_a_rating:=1000; end if;
    select rating into v_b_rating from public.ms_esports_ratings where season_id=p_match.season_id and user_id=p_match.player_b_user_id and game_id=p_match.game_id;
    if v_b_rating is null then v_b_rating:=1000; end if;
  end if;
  return jsonb_build_object(
    'id',p_match.id::text,'gameId',p_match.game_id,'platform',p_match.platform,'mode',p_match.mode,'teamSize',p_match.team_size,
    'status',p_match.status,'roomCode',p_match.room_code,'isHost',p_match.host_user_id=p_uid,'mySide',case when p_match.player_a_user_id=p_uid then 'A' else 'B' end,
    'playerA',jsonb_build_object('userId',p_match.player_a_user_id::text,'displayName',coalesce(v_a_name,'Gamer'),'avatarUrl',v_a_avatar,'rating',coalesce(p_match.mmr_a_after,p_match.mmr_a_before,v_a_rating,1000)),
    'playerB',jsonb_build_object('userId',p_match.player_b_user_id::text,'displayName',coalesce(v_b_name,'Gamer'),'avatarUrl',v_b_avatar,'rating',coalesce(p_match.mmr_b_after,p_match.mmr_b_before,v_b_rating,1000)),
    'reportA',p_match.report_a,'reportB',p_match.report_b,'finalScoreA',p_match.final_score_a,'finalScoreB',p_match.final_score_b,
    'winnerUserId',case when p_match.winner_user_id is null then null else p_match.winner_user_id::text end,
    'mmrABefore',p_match.mmr_a_before,'mmrAAfter',p_match.mmr_a_after,'mmrBBefore',p_match.mmr_b_before,'mmrBAfter',p_match.mmr_b_after,
    'createdAt',p_match.created_at,'updatedAt',p_match.updated_at,'confirmedAt',p_match.confirmed_at
  );
end $$;

create or replace function public.ms_esports_get_or_create_competitive_match() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=auth.uid(); v_me public.ms_esports_matchmaking_queue; v_other public.ms_esports_matchmaking_queue;
  v_key text; v_a uuid; v_b uuid; v_match public.ms_esports_competitive_matches; v_season uuid:=public.ms_esports_v4_active_season_id();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_me from public.ms_esports_matchmaking_queue where user_id=v_uid and status='matched' and matched_with_user_id is not null;
  if not found then return null; end if;
  select * into v_other from public.ms_esports_matchmaking_queue where user_id=v_me.matched_with_user_id and status='matched' and matched_with_user_id=v_uid;
  if not found then return null; end if;
  v_key:=least(v_me.id::text,v_other.id::text)||':'||greatest(v_me.id::text,v_other.id::text);
  if v_uid::text < v_me.matched_with_user_id::text then v_a:=v_uid; v_b:=v_me.matched_with_user_id; else v_a:=v_me.matched_with_user_id; v_b:=v_uid; end if;
  insert into public.ms_esports_competitive_matches(source_pair_key,season_id,game_id,platform,mode,team_size,player_a_user_id,player_b_user_id,host_user_id,status)
  values(v_key,v_season,v_me.game_id,case when v_me.platform=v_other.platform then v_me.platform else 'crossplay' end,v_me.mode,v_me.team_size,v_a,v_b,v_a,'matched')
  on conflict(source_pair_key) do nothing;
  select * into v_match from public.ms_esports_competitive_matches where source_pair_key=v_key;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_get_competitive_match() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches
  where player_a_user_id=v_uid or player_b_user_id=v_uid
  order by updated_at desc limit 1;
  if not found then return null; end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_claim_competitive_room(p_match_id uuid,p_room_code text) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_code text:=upper(trim(coalesce(p_room_code,''))); v_other uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_code='' or length(v_code)>32 then raise exception 'ROOM_CODE_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_match.host_user_id<>v_uid and v_match.room_code is null then raise exception 'HOST_ONLY'; end if;
  if v_match.room_code is null then
    update public.ms_esports_competitive_matches set room_code=v_code,status='room_ready',updated_at=now() where id=v_match.id returning * into v_match;
    v_other:=case when v_match.player_a_user_id=v_uid then v_match.player_b_user_id else v_match.player_a_user_id end;
    perform public.ms_esports_v4_notify(v_other,'ranked_room_ready','Salon compétitif prêt','Ton salon E-SPORTS classé est prêt. Code : '||v_code,jsonb_build_object('matchId',v_match.id::text,'roomCode',v_code,'gameId',v_match.game_id));
  elsif v_match.room_code<>v_code then
    raise exception 'ROOM_ALREADY_CLAIMED';
  end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_submit_competitive_result(p_match_id uuid,p_score_a integer,p_score_b integer) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=auth.uid(); v_match public.ms_esports_competitive_matches; v_score_a integer:=greatest(0,least(coalesce(p_score_a,0),999)); v_score_b integer:=greatest(0,least(coalesce(p_score_b,0),999));
  v_ra integer:=1000; v_rb integer:=1000; v_ea numeric; v_eb numeric; v_sa numeric; v_sb numeric; v_new_a integer; v_new_b integer; v_winner uuid; v_season uuid;
  v_a_report_a integer; v_a_report_b integer; v_b_report_a integer; v_b_report_b integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.ms_esports_competitive_matches where id=p_match_id and (player_a_user_id=v_uid or player_b_user_id=v_uid) for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
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
      v_ea:=1.0/(1.0+power(10.0,(v_rb-v_ra)/400.0)); v_eb:=1.0-v_ea;
      if v_score_a>v_score_b then v_sa:=1; v_sb:=0; v_winner:=v_match.player_a_user_id;
      elsif v_score_b>v_score_a then v_sa:=0; v_sb:=1; v_winner:=v_match.player_b_user_id;
      else v_sa:=0.5; v_sb:=0.5; v_winner:=null; end if;
      v_new_a:=greatest(100,least(5000,round(v_ra+32*(v_sa-v_ea))::integer));
      v_new_b:=greatest(100,least(5000,round(v_rb+32*(v_sb-v_eb))::integer));
      update public.ms_esports_ratings set rating=v_new_a,matches=matches+1,wins=wins+case when v_sa=1 then 1 else 0 end,losses=losses+case when v_sa=0 then 1 else 0 end,draws=draws+case when v_sa=.5 then 1 else 0 end,last_match_at=now(),updated_at=now() where season_id=v_season and user_id=v_match.player_a_user_id and game_id=v_match.game_id;
      update public.ms_esports_ratings set rating=v_new_b,matches=matches+1,wins=wins+case when v_sb=1 then 1 else 0 end,losses=losses+case when v_sb=0 then 1 else 0 end,draws=draws+case when v_sb=.5 then 1 else 0 end,last_match_at=now(),updated_at=now() where season_id=v_season and user_id=v_match.player_b_user_id and game_id=v_match.game_id;
      update public.ms_esports_competitive_matches set season_id=v_season,status='confirmed',final_score_a=v_score_a,final_score_b=v_score_b,winner_user_id=v_winner,mmr_a_before=v_ra,mmr_a_after=v_new_a,mmr_b_before=v_rb,mmr_b_after=v_new_b,confirmed_at=now(),updated_at=now() where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||v_new_a,jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',v_new_a));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_confirmed','Résultat confirmé','Résultat classé validé. Nouveau MMR : '||v_new_b,jsonb_build_object('matchId',v_match.id::text,'gameId',v_match.game_id,'rating',v_new_b));
    else
      update public.ms_esports_competitive_matches set status='disputed',updated_at=now() where id=v_match.id returning * into v_match;
      perform public.ms_esports_v4_notify(v_match.player_a_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie pour obtenir le même résultat.',jsonb_build_object('matchId',v_match.id::text));
      perform public.ms_esports_v4_notify(v_match.player_b_user_id,'ranked_result_disputed','Résultat à confirmer','Les deux scores saisis diffèrent. Corrigez votre saisie pour obtenir le même résultat.',jsonb_build_object('matchId',v_match.id::text));
    end if;
  end if;
  return public.ms_esports_v5_match_json(v_match,v_uid);
end $$;

create or replace function public.ms_esports_mmr_leaderboard(p_game_id text,p_limit integer default 50)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with season as (
    select id,name,slug from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1
  ), ranked as (
    select r.*,row_number() over(order by r.rating desc,r.matches desc,r.wins desc,r.user_id)::int as position,s.name as season_name,s.slug as season_slug
    from public.ms_esports_ratings r join season s on s.id=r.season_id
    where r.game_id=trim(p_game_id)
  )
  select jsonb_build_object('position',r.position,'userId',r.user_id::text,'displayName',coalesce(e.display_name,p.display_name,'Gamer'),'avatarUrl',p.avatar_url,'countryCode',coalesce(e.country_code,p.country_code),'gameId',r.game_id,'rating',r.rating,'matches',r.matches,'wins',r.wins,'losses',r.losses,'draws',r.draws,'seasonName',r.season_name,'seasonSlug',r.season_slug)
  from ranked r left join public.ms_esports_profiles e on e.user_id=r.user_id left join public.ms_public_profiles p on p.user_id=r.user_id
  where auth.uid() is not null order by r.position limit greatest(1,least(coalesce(p_limit,50),100));
$$;

revoke all on function public.ms_esports_v5_match_json(public.ms_esports_competitive_matches,uuid) from public;
revoke all on function public.ms_esports_get_or_create_competitive_match() from public;
revoke all on function public.ms_esports_get_competitive_match() from public;
revoke all on function public.ms_esports_claim_competitive_room(uuid,text) from public;
revoke all on function public.ms_esports_submit_competitive_result(uuid,integer,integer) from public;
revoke all on function public.ms_esports_mmr_leaderboard(text,integer) from public;

grant execute on function public.ms_esports_get_or_create_competitive_match() to authenticated;
grant execute on function public.ms_esports_get_competitive_match() to authenticated;
grant execute on function public.ms_esports_claim_competitive_room(uuid,text) to authenticated;
grant execute on function public.ms_esports_submit_competitive_result(uuid,integer,integer) to authenticated;
grant execute on function public.ms_esports_mmr_leaderboard(text,integer) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_competitive_matches') then
    execute 'alter publication supabase_realtime add table public.ms_esports_competitive_matches';
  end if;
end $$;
