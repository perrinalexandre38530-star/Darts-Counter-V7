-- ============================================================
-- MULTISPORTS SCORING — ONLINE PUBLIC STABILIZATION V2
-- 2026-09-18
--
-- Source de vérité publique : Supabase + Realtime.
-- Le NAS n'est pas requis pour les salons, le chat ou le match live.
-- Cette migration ajoute des RPC atomiques afin d'éviter les races client
-- (salon plein, READY, start simultané, reprise après veille).
-- ============================================================

alter table public.online_lobby_players
  add column if not exists presence_status text not null default 'online',
  add column if not exists last_seen_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'online_lobby_players_presence_status_check'
  ) then
    alter table public.online_lobby_players
      add constraint online_lobby_players_presence_status_check
      check (presence_status in ('online','away','offline'));
  end if;
end $$;

alter table public.online_matches
  add column if not exists revision bigint not null default 0,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists online_lobby_players_presence_idx
  on public.online_lobby_players(lobby_code,presence_status,last_seen_at desc);
create index if not exists online_matches_lobby_revision_idx
  on public.online_matches(lobby_code,revision desc);


-- Garde-fou chat public : le JSON complet d'un message doit rester compact.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='online_messages_payload_size_check'
  ) then
    alter table public.online_messages
      add constraint online_messages_payload_size_check
      check (octet_length(message::text) <= 8192);
  end if;
end $$;

create or replace function public.ms_online_lobby_snapshot(p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_lobby public.online_lobbies%rowtype;
  v_players jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_code = '' then raise exception 'LOBBY_CODE_REQUIRED'; end if;

  select * into v_lobby from public.online_lobbies where code=v_code limit 1;
  if not found then return null; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',p.id,
      'user_id',p.user_id,
      'nickname',p.nickname,
      'display_name',p.display_name,
      'avatar_url',p.avatar_url,
      'role',p.role,
      'status',p.status,
      'presence_status',case
        when p.last_seen_at < now()-interval '2 minutes' then 'offline'
        else p.presence_status
      end,
      'last_seen_at',p.last_seen_at,
      'ready_at',p.ready_at,
      'joined_at',p.joined_at,
      'updated_at',p.updated_at
    ) order by p.joined_at asc
  ),'[]'::jsonb)
  into v_players
  from public.online_lobby_players p
  where p.lobby_id=v_lobby.id;

  return to_jsonb(v_lobby) || jsonb_build_object('players',v_players);
end
$$;

create or replace function public.ms_online_create_lobby(
  p_mode text default 'x01',
  p_max_players integer default 2,
  p_settings jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_lobby_id uuid;
  v_name text := 'Joueur';
  v_avatar text;
  v_try integer := 0;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  p_max_players := greatest(2,least(coalesce(p_max_players,2),64));

  select coalesce(nullif(trim(display_name),''),'Joueur'),avatar_url
    into v_name,v_avatar
  from public.ms_public_profiles where user_id=v_uid;
  v_name := coalesce(nullif(trim(v_name),''),'Joueur');

  loop
    v_try := v_try + 1;
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(v_chars,1+floor(random()*length(v_chars))::integer,1);
    end loop;
    exit when not exists(select 1 from public.online_lobbies where code=v_code);
    if v_try >= 20 then raise exception 'LOBBY_CODE_GENERATION_FAILED'; end if;
  end loop;

  insert into public.online_lobbies(code,mode,max_players,host_user_id,host_nickname,settings,status,updated_at)
  values(v_code,coalesce(nullif(trim(p_mode),''),'x01'),p_max_players,v_uid,v_name,coalesce(p_settings,'{}'::jsonb),'waiting',now())
  returning id into v_lobby_id;

  insert into public.online_lobby_players(
    lobby_id,lobby_code,user_id,nickname,display_name,avatar_url,role,status,presence_status,last_seen_at,updated_at
  ) values(
    v_lobby_id,v_code,v_uid,v_name,v_name,v_avatar,'player','ready','online',now(),now()
  )
  on conflict(lobby_id,user_id) do update set
    nickname=excluded.nickname,display_name=excluded.display_name,avatar_url=excluded.avatar_url,
    role='player',status='ready',presence_status='online',last_seen_at=now(),updated_at=now();

  return public.ms_online_lobby_snapshot(v_code);
end
$$;

create or replace function public.ms_online_join_lobby(
  p_code text,
  p_nickname text default null,
  p_role text default 'player'
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_role text := case when lower(trim(coalesce(p_role,'')))='spectator' then 'spectator' else 'player' end;
  v_lobby public.online_lobbies%rowtype;
  v_count integer := 0;
  v_name text := nullif(trim(coalesce(p_nickname,'')),'');
  v_avatar text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_code='' then raise exception 'LOBBY_CODE_REQUIRED'; end if;

  select * into v_lobby from public.online_lobbies where code=v_code for update;
  if not found then raise exception 'LOBBY_NOT_FOUND'; end if;
  if v_lobby.status in ('closed','ended') then raise exception 'LOBBY_CLOSED'; end if;
  if v_lobby.status='started' and v_role='player' and not exists(
    select 1 from public.online_lobby_players where lobby_id=v_lobby.id and user_id=v_uid
  ) then
    raise exception 'MATCH_ALREADY_STARTED';
  end if;

  -- Un appareil fermé sans passer par "Quitter" ne doit pas bloquer le salon indéfiniment.
  if v_lobby.status='waiting' then
    delete from public.online_lobby_players
    where lobby_id=v_lobby.id
      and role='player'
      and user_id<>v_lobby.host_user_id
      and last_seen_at < now()-interval '5 minutes';
  end if;

  if v_name is null then
    select coalesce(nullif(trim(display_name),''),'Joueur'),avatar_url into v_name,v_avatar
    from public.ms_public_profiles where user_id=v_uid;
  else
    select avatar_url into v_avatar from public.ms_public_profiles where user_id=v_uid;
  end if;
  v_name := coalesce(v_name,'Joueur');

  if v_role='player' and not exists(
    select 1 from public.online_lobby_players where lobby_id=v_lobby.id and user_id=v_uid
  ) then
    select count(*) into v_count from public.online_lobby_players
      where lobby_id=v_lobby.id and role='player';
    if v_count >= v_lobby.max_players then raise exception 'LOBBY_FULL'; end if;
  end if;

  insert into public.online_lobby_players(
    lobby_id,lobby_code,user_id,nickname,display_name,avatar_url,role,status,presence_status,last_seen_at,updated_at
  ) values(
    v_lobby.id,v_code,v_uid,v_name,v_name,v_avatar,v_role,
    case when v_uid=v_lobby.host_user_id then 'ready' else 'online' end,
    'online',now(),now()
  )
  on conflict(lobby_id,user_id) do update set
    nickname=excluded.nickname,display_name=excluded.display_name,avatar_url=coalesce(excluded.avatar_url,public.online_lobby_players.avatar_url),
    role=excluded.role,
    status=case when public.online_lobby_players.user_id=v_lobby.host_user_id then 'ready' else public.online_lobby_players.status end,
    presence_status='online',last_seen_at=now(),updated_at=now();

  return public.ms_online_lobby_snapshot(v_code);
end
$$;

create or replace function public.ms_online_set_ready(
  p_code text,
  p_ready boolean,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_lobby public.online_lobbies%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_lobby from public.online_lobbies where code=v_code limit 1;
  if not found then raise exception 'LOBBY_NOT_FOUND'; end if;
  if v_lobby.status <> 'waiting' then raise exception 'LOBBY_ALREADY_STARTED'; end if;

  update public.online_lobby_players
  set status=case when user_id=v_lobby.host_user_id then 'ready' when p_ready then 'ready' else 'online' end,
      nickname=coalesce(nullif(trim(coalesce(p_nickname,'')),''),nickname),
      display_name=coalesce(nullif(trim(coalesce(p_nickname,'')),''),display_name),
      ready_at=case when user_id=v_lobby.host_user_id or p_ready then now() else null end,
      presence_status='online',last_seen_at=now(),updated_at=now()
  where lobby_id=v_lobby.id and user_id=v_uid;

  if not found then raise exception 'NOT_IN_LOBBY'; end if;
  return public.ms_online_lobby_snapshot(v_code);
end
$$;

create or replace function public.ms_online_touch_lobby(p_code text,p_presence text default 'online')
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_presence text := case when lower(coalesce(p_presence,'')) in ('online','away','offline') then lower(p_presence) else 'online' end;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.online_lobby_players
  set presence_status=v_presence,last_seen_at=now(),updated_at=now()
  where lobby_code=v_code and user_id=v_uid;
  if not found then raise exception 'NOT_IN_LOBBY'; end if;
  return jsonb_build_object('ok',true,'presence',v_presence,'at',now());
end
$$;

create or replace function public.ms_online_leave_lobby(p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_lobby public.online_lobbies%rowtype;
  v_next public.online_lobby_players%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_lobby from public.online_lobbies where code=v_code for update;
  if not found then return jsonb_build_object('ok',true,'closed',true); end if;

  if v_lobby.status='waiting' then
    delete from public.online_lobby_players where lobby_id=v_lobby.id and user_id=v_uid;
    if v_uid=v_lobby.host_user_id then
      select * into v_next from public.online_lobby_players
      where lobby_id=v_lobby.id and role='player'
      order by joined_at asc limit 1;
      if found then
        update public.online_lobbies
        set host_user_id=v_next.user_id,
            host_nickname=coalesce(v_next.display_name,v_next.nickname,'Joueur'),updated_at=now()
        where id=v_lobby.id;
        update public.online_lobby_players
        set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now()
        where id=v_next.id;
      else
        update public.online_lobbies set status='closed',closed_at=now(),updated_at=now() where id=v_lobby.id;
      end if;
    end if;
  else
    update public.online_lobby_players
    set presence_status='offline',last_seen_at=now(),updated_at=now()
    where lobby_id=v_lobby.id and user_id=v_uid;
  end if;

  return coalesce(public.ms_online_lobby_snapshot(v_code),jsonb_build_object('ok',true,'closed',true));
end
$$;

create or replace function public.ms_online_start_match(p_code text,p_initial_state jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_lobby public.online_lobbies%rowtype;
  v_players integer := 0;
  v_not_ready integer := 0;
  v_match public.online_matches%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_lobby from public.online_lobbies where code=v_code for update;
  if not found then raise exception 'LOBBY_NOT_FOUND'; end if;
  if v_lobby.host_user_id<>v_uid then raise exception 'HOST_ONLY'; end if;
  if v_lobby.status not in ('waiting','started') then raise exception 'LOBBY_CLOSED'; end if;

  select count(*) into v_players from public.online_lobby_players
    where lobby_id=v_lobby.id and role='player';
  if v_players < 2 then raise exception 'NEED_TWO_PLAYERS'; end if;

  select count(*) into v_not_ready from public.online_lobby_players
    where lobby_id=v_lobby.id and role='player' and user_id<>v_lobby.host_user_id and status<>'ready';
  if v_not_ready > 0 then raise exception 'PLAYERS_NOT_READY'; end if;

  insert into public.online_matches(lobby_code,mode,status,state_json,owner_user,updated_by,revision,created_at,updated_at,finished_at)
  values(v_code,v_lobby.mode,'started',coalesce(p_initial_state,'{}'::jsonb),v_uid,v_uid,1,now(),now(),null)
  on conflict(lobby_code) do update set
    mode=excluded.mode,status='started',state_json=excluded.state_json,owner_user=v_uid,
    updated_by=v_uid,revision=public.online_matches.revision+1,updated_at=now(),finished_at=null
  returning * into v_match;

  update public.online_lobbies set status='started',started_at=coalesce(started_at,now()),updated_at=now() where id=v_lobby.id;
  return to_jsonb(v_match);
end
$$;

create or replace function public.ms_online_update_match_state(
  p_code text,
  p_state jsonb,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_match public.online_matches%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.online_lobby_players where lobby_code=v_code and user_id=v_uid and role='player') then
    raise exception 'NOT_IN_LOBBY';
  end if;

  update public.online_matches
  set state_json=coalesce(p_state,'{}'::jsonb),
      status=case when lower(coalesce(p_status,'')) in ('started','ended') then lower(p_status) else status end,
      revision=revision+1,updated_by=v_uid,updated_at=now(),
      finished_at=case when lower(coalesce(p_status,''))='ended' then coalesce(finished_at,now()) else finished_at end
  where lobby_code=v_code
  returning * into v_match;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  return to_jsonb(v_match);
end
$$;

create or replace function public.ms_online_end_match(p_code text,p_final_state jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code,'')));
  v_match public.online_matches%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.online_lobby_players where lobby_code=v_code and user_id=v_uid and role='player') then
    raise exception 'NOT_IN_LOBBY';
  end if;

  update public.online_matches
  set status='ended',
      state_json=case when p_final_state is null then state_json else p_final_state end,
      revision=revision+1,updated_by=v_uid,updated_at=now(),finished_at=coalesce(finished_at,now())
  where lobby_code=v_code
  returning * into v_match;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;

  update public.online_lobbies set status='ended',closed_at=coalesce(closed_at,now()),updated_at=now() where code=v_code;
  return to_jsonb(v_match);
end
$$;

-- RPCs réservés aux comptes authentifiés.
revoke all on function public.ms_online_lobby_snapshot(text) from public;
revoke all on function public.ms_online_create_lobby(text,integer,jsonb) from public;
revoke all on function public.ms_online_join_lobby(text,text,text) from public;
revoke all on function public.ms_online_set_ready(text,boolean,text) from public;
revoke all on function public.ms_online_touch_lobby(text,text) from public;
revoke all on function public.ms_online_leave_lobby(text) from public;
revoke all on function public.ms_online_start_match(text,jsonb) from public;
revoke all on function public.ms_online_update_match_state(text,jsonb,text) from public;
revoke all on function public.ms_online_end_match(text,jsonb) from public;

grant execute on function public.ms_online_lobby_snapshot(text) to authenticated;
grant execute on function public.ms_online_create_lobby(text,integer,jsonb) to authenticated;
grant execute on function public.ms_online_join_lobby(text,text,text) to authenticated;
grant execute on function public.ms_online_set_ready(text,boolean,text) to authenticated;
grant execute on function public.ms_online_touch_lobby(text,text) to authenticated;
grant execute on function public.ms_online_leave_lobby(text) to authenticated;
grant execute on function public.ms_online_start_match(text,jsonb) to authenticated;
grant execute on function public.ms_online_update_match_state(text,jsonb,text) to authenticated;
grant execute on function public.ms_online_end_match(text,jsonb) to authenticated;

-- Realtime : idempotent, y compris sur une base où la migration V1 existe déjà.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_lobbies') then execute 'alter publication supabase_realtime add table public.online_lobbies'; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_lobby_players') then execute 'alter publication supabase_realtime add table public.online_lobby_players'; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_matches') then execute 'alter publication supabase_realtime add table public.online_matches'; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='online_messages') then execute 'alter publication supabase_realtime add table public.online_messages'; end if;
  end if;
end $$;
