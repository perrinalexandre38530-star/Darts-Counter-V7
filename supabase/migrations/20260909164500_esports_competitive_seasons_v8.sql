-- MULTISPORTS SCORING · E-SPORTS V0.8 · COMPETITIVE SEASONS
-- Team season dashboard, placement/division progression, promotion/relegation events,
-- season archives, seasonal honours, MVP and historical leaderboards.

create table if not exists public.ms_esports_team_division_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  game_id text not null,
  team_size integer not null check(team_size between 2 and 10),
  match_id uuid references public.ms_esports_team_competitive_matches(id) on delete set null,
  from_division text not null,
  to_division text not null,
  direction text not null check(direction in ('promotion','relegation')),
  rating_before integer not null,
  rating_after integer not null,
  created_at timestamptz not null default now(),
  unique(match_id,team_id)
);
create index if not exists ms_esports_team_division_events_lookup_v8 on public.ms_esports_team_division_events(team_id,game_id,team_size,created_at desc);

create table if not exists public.ms_esports_team_season_awards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ms_esports_seasons(id) on delete cascade,
  team_id uuid not null references public.ms_esports_teams(id) on delete cascade,
  game_id text not null,
  team_size integer not null check(team_size between 2 and 10),
  award_type text not null check(award_type in ('champion','runner_up','third_place','season_mvp','achievement')),
  title text not null,
  user_id uuid references auth.users(id) on delete set null,
  value jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now(),
  unique(season_id,team_id,game_id,team_size,award_type,user_id)
);
create index if not exists ms_esports_team_season_awards_lookup_v8 on public.ms_esports_team_season_awards(team_id,game_id,team_size,awarded_at desc);

alter table public.ms_esports_team_division_events enable row level security;
alter table public.ms_esports_team_season_awards enable row level security;

drop policy if exists ms_esports_team_division_events_select_v8 on public.ms_esports_team_division_events;
create policy ms_esports_team_division_events_select_v8 on public.ms_esports_team_division_events for select to authenticated using(
  exists(select 1 from public.ms_esports_teams t where t.id=team_id and (t.visibility='public' or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active')))
);

drop policy if exists ms_esports_team_season_awards_select_v8 on public.ms_esports_team_season_awards;
create policy ms_esports_team_season_awards_select_v8 on public.ms_esports_team_season_awards for select to authenticated using(
  exists(select 1 from public.ms_esports_teams t where t.id=team_id and (t.visibility='public' or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active')))
);

create or replace function public.ms_esports_team_division_v8(p_rating integer,p_matches integer)
returns jsonb language sql immutable as $$
  select public.ms_esports_division_v6(p_rating,p_matches);
$$;

create or replace function public.ms_esports_capture_team_division_event_v8()
returns trigger language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_matches integer:=0; v_before jsonb; v_after jsonb; v_bi integer; v_ai integer;
begin
  select coalesce(matches,0) into v_matches from public.ms_esports_team_ratings
  where season_id=new.season_id and team_id=new.team_id and game_id=new.game_id and team_size=new.team_size;
  v_before:=public.ms_esports_team_division_v8(new.rating_before,greatest(0,v_matches-1));
  v_after:=public.ms_esports_team_division_v8(new.rating_after,v_matches);
  v_bi:=coalesce((v_before->>'divisionIndex')::integer,0);
  v_ai:=coalesce((v_after->>'divisionIndex')::integer,0);
  if v_ai<>v_bi and (v_before->>'division')<>'placement' and (v_after->>'division')<>'placement' then
    insert into public.ms_esports_team_division_events(season_id,team_id,game_id,team_size,match_id,from_division,to_division,direction,rating_before,rating_after)
    values(new.season_id,new.team_id,new.game_id,new.team_size,new.match_id,v_before->>'division',v_after->>'division',case when v_ai>v_bi then 'promotion' else 'relegation' end,new.rating_before,new.rating_after)
    on conflict(match_id,team_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists ms_esports_team_rating_history_division_v8 on public.ms_esports_team_rating_history;
create trigger ms_esports_team_rating_history_division_v8 after insert on public.ms_esports_team_rating_history
for each row execute function public.ms_esports_capture_team_division_event_v8();

create or replace function public.ms_esports_team_season_dashboard_v8(p_team_id uuid,p_game_id text,p_team_size integer)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=auth.uid(); v_team public.ms_esports_teams; v_season public.ms_esports_seasons; v_rating public.ms_esports_team_ratings;
  v_recent jsonb:='[]'::jsonb; v_mvp jsonb:=null; v_modes jsonb:='[]'::jsonb; v_div jsonb; v_wr integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_team from public.ms_esports_teams where id=p_team_id; if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  if v_team.visibility='private' and not exists(select 1 from public.ms_esports_team_members tm where tm.team_id=v_team.id and tm.user_id=v_uid and tm.status='active') then raise exception 'PRIVATE_TEAM'; end if;
  select * into v_season from public.ms_esports_seasons where active=true and starts_at<=now() and ends_at>=now() order by starts_at desc limit 1;
  if v_season.id is null then raise exception 'NO_ACTIVE_SEASON'; end if;
  select * into v_rating from public.ms_esports_team_ratings where season_id=v_season.id and team_id=p_team_id and game_id=trim(p_game_id) and team_size=greatest(2,least(coalesce(p_team_size,2),10));
  if v_rating.team_id is null then
    v_rating.season_id:=v_season.id; v_rating.team_id:=p_team_id; v_rating.game_id:=trim(p_game_id); v_rating.team_size:=greatest(2,least(coalesce(p_team_size,2),10));
    v_rating.rating:=1000; v_rating.peak_rating:=1000; v_rating.placement_matches:=0; v_rating.matches:=0; v_rating.wins:=0; v_rating.losses:=0; v_rating.draws:=0; v_rating.streak:=0;
  end if;
  v_div:=public.ms_esports_team_division_v8(v_rating.rating,v_rating.matches);
  v_wr:=case when v_rating.matches>0 then round(v_rating.wins::numeric/v_rating.matches*100)::integer else 0 end;
  select coalesce(jsonb_agg(x.result order by x.created_at desc),'[]'::jsonb) into v_recent from (
    select case h.result when 'win' then 'W' when 'loss' then 'L' else 'D' end result,h.created_at from public.ms_esports_team_rating_history h
    where h.season_id=v_season.id and h.team_id=p_team_id and h.game_id=trim(p_game_id) and h.team_size=v_rating.team_size order by h.created_at desc limit 5
  ) x;
  select jsonb_build_object('userId',mr.user_id::text,'displayName',public.ms_esports_v7_name(mr.user_id),'avatarUrl',public.ms_esports_v7_avatar(mr.user_id),'rating',mr.rating,'peakRating',mr.peak_rating,'matches',mr.matches,'wins',mr.wins,'losses',mr.losses,'draws',mr.draws)
  into v_mvp from public.ms_esports_team_member_ratings mr
  where mr.season_id=v_season.id and mr.game_id=trim(p_game_id) and mr.team_size=v_rating.team_size
    and exists(select 1 from public.ms_esports_team_members tm where tm.team_id=p_team_id and tm.user_id=mr.user_id and tm.status='active')
  order by mr.rating desc,mr.matches desc,mr.wins desc,mr.user_id limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('mode',x.mode,'matches',x.matches,'wins',x.wins,'losses',x.losses,'draws',x.draws,'winRate',case when x.matches>0 then round(x.wins::numeric/x.matches*100)::integer else 0 end) order by x.matches desc,x.mode),'[]'::jsonb)
  into v_modes from (
    select coalesce(m.mode,'Ranked Team') mode,count(*)::integer matches,
      count(*) filter(where (m.team_a_id=p_team_id and m.final_score_a>m.final_score_b) or (m.team_b_id=p_team_id and m.final_score_b>m.final_score_a))::integer wins,
      count(*) filter(where (m.team_a_id=p_team_id and m.final_score_a<m.final_score_b) or (m.team_b_id=p_team_id and m.final_score_b<m.final_score_a))::integer losses,
      count(*) filter(where m.final_score_a=m.final_score_b)::integer draws
    from public.ms_esports_team_competitive_matches m where m.season_id=v_season.id and m.status='confirmed' and m.game_id=trim(p_game_id) and m.team_size=v_rating.team_size and p_team_id in(m.team_a_id,m.team_b_id)
    group by coalesce(m.mode,'Ranked Team')
  ) x;
  return jsonb_build_object('seasonId',v_season.id::text,'seasonName',v_season.name,'seasonSlug',v_season.slug,'startsAt',v_season.starts_at,'endsAt',v_season.ends_at,'active',v_season.active,'teamId',v_team.id::text,'teamName',v_team.name,'teamTag',v_team.tag,'gameId',trim(p_game_id),'teamSize',v_rating.team_size,'rating',v_rating.rating,'peakRating',v_rating.peak_rating,'placementMatches',v_rating.placement_matches,'matches',v_rating.matches,'wins',v_rating.wins,'losses',v_rating.losses,'draws',v_rating.draws,'streak',v_rating.streak,'division',v_div,'winRate',v_wr,'recentForm',v_recent,'mvp',v_mvp,'modeStats',v_modes);
end $$;

create or replace function public.ms_esports_team_season_history_v8(p_team_id uuid,p_game_id text,p_team_size integer)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('seasonId',s.id::text,'seasonName',s.name,'seasonSlug',s.slug,'startsAt',s.starts_at,'endsAt',s.ends_at,'active',s.active,'rating',r.rating,'peakRating',r.peak_rating,'placementMatches',r.placement_matches,'matches',r.matches,'wins',r.wins,'losses',r.losses,'draws',r.draws,'streak',r.streak,'division',public.ms_esports_team_division_v8(r.rating,r.matches))
  from public.ms_esports_team_ratings r join public.ms_esports_seasons s on s.id=r.season_id join public.ms_esports_teams t on t.id=r.team_id
  where auth.uid() is not null and r.team_id=p_team_id and r.game_id=trim(p_game_id) and r.team_size=greatest(2,least(coalesce(p_team_size,2),10))
    and (t.visibility='public' or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active'))
  order by s.starts_at desc;
$$;

create or replace function public.ms_esports_team_division_events_v8(p_team_id uuid,p_game_id text,p_team_size integer,p_limit integer default 30)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',e.id::text,'seasonId',e.season_id::text,'matchId',e.match_id::text,'fromDivision',e.from_division,'toDivision',e.to_division,'direction',e.direction,'ratingBefore',e.rating_before,'ratingAfter',e.rating_after,'createdAt',e.created_at)
  from public.ms_esports_team_division_events e join public.ms_esports_teams t on t.id=e.team_id
  where auth.uid() is not null and e.team_id=p_team_id and e.game_id=trim(p_game_id) and e.team_size=greatest(2,least(coalesce(p_team_size,2),10))
    and (t.visibility='public' or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active'))
  order by e.created_at desc limit greatest(1,least(coalesce(p_limit,30),100));
$$;

create or replace function public.ms_esports_team_season_awards_v8(p_team_id uuid,p_game_id text,p_team_size integer)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  select jsonb_build_object('id',a.id::text,'seasonId',a.season_id::text,'seasonName',s.name,'seasonSlug',s.slug,'teamId',a.team_id::text,'gameId',a.game_id,'teamSize',a.team_size,'awardType',a.award_type,'title',a.title,'userId',a.user_id::text,'displayName',case when a.user_id is null then null else public.ms_esports_v7_name(a.user_id) end,'value',a.value,'awardedAt',a.awarded_at)
  from public.ms_esports_team_season_awards a join public.ms_esports_seasons s on s.id=a.season_id join public.ms_esports_teams t on t.id=a.team_id
  where auth.uid() is not null and a.team_id=p_team_id and a.game_id=trim(p_game_id) and a.team_size=greatest(2,least(coalesce(p_team_size,2),10))
    and (t.visibility='public' or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active'))
  order by s.starts_at desc,a.awarded_at desc;
$$;

create or replace function public.ms_esports_team_season_leaderboard_v8(p_game_id text,p_team_size integer,p_season_slug text default null,p_limit integer default 50)
returns setof jsonb language sql security definer set search_path=public,auth,extensions as $$
  with chosen as (
    select * from public.ms_esports_seasons s where (nullif(trim(coalesce(p_season_slug,'')),'') is not null and s.slug=trim(p_season_slug)) or (nullif(trim(coalesce(p_season_slug,'')),'') is null and s.active=true and s.starts_at<=now() and s.ends_at>=now()) order by s.starts_at desc limit 1
  ), ranked as (
    select r.*,row_number() over(order by r.rating desc,r.matches desc,r.wins desc,r.team_id)::int position,s.name season_name,s.slug season_slug
    from public.ms_esports_team_ratings r join chosen s on s.id=r.season_id where r.game_id=trim(p_game_id) and r.team_size=greatest(2,least(coalesce(p_team_size,2),10))
  )
  select jsonb_build_object('position',r.position,'teamId',r.team_id::text,'name',t.name,'tag',t.tag,'gameId',r.game_id,'teamSize',r.team_size,'rating',r.rating,'peakRating',r.peak_rating,'placementMatches',r.placement_matches,'matches',r.matches,'wins',r.wins,'losses',r.losses,'draws',r.draws,'streak',r.streak,'division',public.ms_esports_team_division_v8(r.rating,r.matches),'seasonName',r.season_name,'seasonSlug',r.season_slug)
  from ranked r join public.ms_esports_teams t on t.id=r.team_id
  where auth.uid() is not null and (t.visibility='public' or exists(select 1 from public.ms_esports_team_members tm where tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active'))
  order by r.position limit greatest(1,least(coalesce(p_limit,50),100));
$$;

-- Service-role season closure. Snapshots podium + per-team MVP without exposing season administration to clients.
create or replace function public.ms_esports_finalize_team_season_v8(p_season_id uuid,p_close boolean default false)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_count integer:=0;
begin
  if p_season_id is null or not exists(select 1 from public.ms_esports_seasons where id=p_season_id) then raise exception 'SEASON_NOT_FOUND'; end if;
  with ranked as (
    select r.*,row_number() over(partition by r.game_id,r.team_size order by r.rating desc,r.matches desc,r.wins desc,r.team_id) pos from public.ms_esports_team_ratings r where r.season_id=p_season_id
  )
  insert into public.ms_esports_team_season_awards(season_id,team_id,game_id,team_size,award_type,title,value)
  select p_season_id,r.team_id,r.game_id,r.team_size,case r.pos when 1 then 'champion' when 2 then 'runner_up' else 'third_place' end,
    case r.pos when 1 then 'SEASON CHAMPION' when 2 then 'SEASON RUNNER-UP' else 'SEASON THIRD PLACE' end,
    jsonb_build_object('position',r.pos,'rating',r.rating,'peakRating',r.peak_rating,'matches',r.matches,'wins',r.wins,'losses',r.losses,'draws',r.draws)
  from ranked r where r.pos<=3
  on conflict(season_id,team_id,game_id,team_size,award_type,user_id) do nothing;

  with candidates as (
    select tr.team_id,mr.user_id,mr.game_id,mr.team_size,mr.rating,mr.peak_rating,mr.matches,mr.wins,mr.losses,mr.draws,
      row_number() over(partition by tr.team_id,mr.game_id,mr.team_size order by mr.rating desc,mr.matches desc,mr.wins desc,mr.user_id) pos
    from public.ms_esports_team_member_ratings mr join public.ms_esports_team_members tm on tm.user_id=mr.user_id and tm.status='active'
    join public.ms_esports_team_ratings tr on tr.team_id=tm.team_id and tr.season_id=mr.season_id and tr.game_id=mr.game_id and tr.team_size=mr.team_size
    where mr.season_id=p_season_id
  )
  insert into public.ms_esports_team_season_awards(season_id,team_id,game_id,team_size,award_type,title,user_id,value)
  select p_season_id,c.team_id,c.game_id,c.team_size,'season_mvp','SEASON MVP',c.user_id,jsonb_build_object('rating',c.rating,'peakRating',c.peak_rating,'matches',c.matches,'wins',c.wins,'losses',c.losses,'draws',c.draws)
  from candidates c where c.pos=1
  on conflict(season_id,team_id,game_id,team_size,award_type,user_id) do nothing;
  get diagnostics v_count=row_count;
  if coalesce(p_close,false) then update public.ms_esports_seasons set active=false where id=p_season_id; end if;
  return jsonb_build_object('ok',true,'seasonId',p_season_id::text,'mvpAwardsInserted',v_count,'closed',coalesce(p_close,false));
end $$;

revoke all on function public.ms_esports_team_division_v8(integer,integer) from public;
revoke all on function public.ms_esports_capture_team_division_event_v8() from public;
revoke all on function public.ms_esports_team_season_dashboard_v8(uuid,text,integer) from public;
revoke all on function public.ms_esports_team_season_history_v8(uuid,text,integer) from public;
revoke all on function public.ms_esports_team_division_events_v8(uuid,text,integer,integer) from public;
revoke all on function public.ms_esports_team_season_awards_v8(uuid,text,integer) from public;
revoke all on function public.ms_esports_team_season_leaderboard_v8(text,integer,text,integer) from public;
revoke all on function public.ms_esports_finalize_team_season_v8(uuid,boolean) from public;

grant execute on function public.ms_esports_team_division_v8(integer,integer) to authenticated;
grant execute on function public.ms_esports_team_season_dashboard_v8(uuid,text,integer) to authenticated;
grant execute on function public.ms_esports_team_season_history_v8(uuid,text,integer) to authenticated;
grant execute on function public.ms_esports_team_division_events_v8(uuid,text,integer,integer) to authenticated;
grant execute on function public.ms_esports_team_season_awards_v8(uuid,text,integer) to authenticated;
grant execute on function public.ms_esports_team_season_leaderboard_v8(text,integer,text,integer) to authenticated;
grant execute on function public.ms_esports_finalize_team_season_v8(uuid,boolean) to service_role;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_team_division_events') then execute 'alter publication supabase_realtime add table public.ms_esports_team_division_events'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ms_esports_team_season_awards') then execute 'alter publication supabase_realtime add table public.ms_esports_team_season_awards'; end if;
end $$;
