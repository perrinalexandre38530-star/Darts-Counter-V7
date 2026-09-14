-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V5
-- Compétitions organisation : métadonnées, participants, calendrier et résumé de résultat.
-- IMPORTANT : aucune statistique détaillée, aucun média, aucun historique lourd dans Supabase.
-- Les résultats complets restent dans R2 / NAS / stockage choisi ; result_ref ne contient qu'une référence courte.

begin;

create table if not exists public.ms_organization_competitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  name text not null,
  sport_id text not null default 'Multisport',
  format text not null default 'league',
  participant_mode text not null default 'teams',
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  description text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_comp_name_len check (char_length(name) between 2 and 100),
  constraint ms_org_comp_format_check check (format in ('league','knockout','groups_knockout','ladder','challenge')),
  constraint ms_org_comp_mode_check check (participant_mode in ('teams','individuals')),
  constraint ms_org_comp_status_check check (status in ('draft','open','active','completed','archived')),
  constraint ms_org_comp_description_len check (char_length(description) <= 360)
);

create table if not exists public.ms_organization_competition_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  competition_id uuid not null references public.ms_organization_competitions(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  display_name text not null default '',
  seed integer not null default 1,
  created_at timestamptz not null default now(),
  constraint ms_org_comp_participant_type_check check (entity_type in ('group','member')),
  constraint ms_org_comp_participant_name_len check (char_length(display_name) <= 120),
  constraint ms_org_comp_participant_seed_check check (seed between 1 and 100000),
  unique(competition_id,entity_type,entity_id)
);

create table if not exists public.ms_organization_competition_fixtures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  competition_id uuid not null references public.ms_organization_competitions(id) on delete cascade,
  round integer not null default 1,
  sequence integer not null default 1,
  group_label text not null default '',
  home_participant_id uuid not null references public.ms_organization_competition_participants(id) on delete cascade,
  away_participant_id uuid not null references public.ms_organization_competition_participants(id) on delete cascade,
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  winner_participant_id uuid references public.ms_organization_competition_participants(id) on delete set null,
  score_label text not null default '',
  result_ref text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_comp_fixture_status_check check (status in ('scheduled','completed','cancelled')),
  constraint ms_org_comp_fixture_group_len check (char_length(group_label) <= 24),
  constraint ms_org_comp_fixture_score_len check (char_length(score_label) <= 60),
  constraint ms_org_comp_fixture_ref_len check (char_length(result_ref) <= 180),
  constraint ms_org_comp_fixture_distinct_check check (home_participant_id <> away_participant_id)
);

-- Indexes volontairement limités aux accès réels de l'UI afin de conserver une base légère.
create index if not exists ms_org_competitions_org_status_idx
  on public.ms_organization_competitions(organization_id,status,created_at desc);
create index if not exists ms_org_comp_participants_comp_idx
  on public.ms_organization_competition_participants(competition_id,seed);
create index if not exists ms_org_comp_fixtures_comp_idx
  on public.ms_organization_competition_fixtures(competition_id,round,sequence);

alter table public.ms_organization_competitions enable row level security;
alter table public.ms_organization_competition_participants enable row level security;
alter table public.ms_organization_competition_fixtures enable row level security;

drop policy if exists ms_org_competitions_select on public.ms_organization_competitions;
create policy ms_org_competitions_select on public.ms_organization_competitions
for select to authenticated
using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_comp_participants_select on public.ms_organization_competition_participants;
create policy ms_org_comp_participants_select on public.ms_organization_competition_participants
for select to authenticated
using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_comp_fixtures_select on public.ms_organization_competition_fixtures;
create policy ms_org_comp_fixtures_select on public.ms_organization_competition_fixtures
for select to authenticated
using (public.ms_org_is_member(organization_id));

-- Aucune écriture directe client : les mutations passent par les RPC métier ci-dessous.
revoke insert,update,delete on public.ms_organization_competitions from authenticated;
revoke insert,update,delete on public.ms_organization_competition_participants from authenticated;
revoke insert,update,delete on public.ms_organization_competition_fixtures from authenticated;
grant select on public.ms_organization_competitions to authenticated;
grant select on public.ms_organization_competition_participants to authenticated;
grant select on public.ms_organization_competition_fixtures to authenticated;

create or replace function public.ms_org_list_competitions(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',c.id::text,
    'organizationId',c.organization_id::text,
    'name',c.name,
    'sportId',c.sport_id,
    'format',c.format,
    'participantMode',c.participant_mode,
    'status',c.status,
    'startsAt',coalesce(c.starts_at::text,''),
    'endsAt',coalesce(c.ends_at::text,''),
    'description',c.description,
    'participantCount',(select count(*) from public.ms_organization_competition_participants p where p.competition_id=c.id),
    'fixtureCount',(select count(*) from public.ms_organization_competition_fixtures f where f.competition_id=c.id),
    'completedFixtureCount',(select count(*) from public.ms_organization_competition_fixtures f where f.competition_id=c.id and f.status='completed'),
    'createdAt',c.created_at,
    'updatedAt',c.updated_at
  )
  from public.ms_organization_competitions c
  where c.organization_id=p_org_id
    and auth.uid() is not null
    and public.ms_org_is_member(p_org_id)
  order by case c.status when 'active' then 0 when 'open' then 1 when 'draft' then 2 when 'completed' then 3 else 4 end,
           coalesce(c.starts_at,c.created_at) desc;
$$;

create or replace function public.ms_org_create_competition(
  p_org_id uuid,
  p_name text,
  p_sport_id text,
  p_format text,
  p_participant_mode text,
  p_starts_at timestamptz,
  p_description text,
  p_entity_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_role text;
  v_comp public.ms_organization_competitions%rowtype;
  v_entity_id uuid;
  v_seed integer:=0;
  v_seen uuid[]:=array[]::uuid[];
  v_display_name text;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_role from public.ms_organization_members
  where organization_id=p_org_id and user_id=v_me and status='active';
  if v_role not in ('owner','admin','manager') then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'COMPETITION_NAME_REQUIRED'; end if;
  if coalesce(p_format,'') not in ('league','knockout','groups_knockout','ladder','challenge') then raise exception 'INVALID_COMPETITION_FORMAT'; end if;
  if coalesce(p_participant_mode,'') not in ('teams','individuals') then raise exception 'INVALID_COMPETITION_MODE'; end if;
  if coalesce(array_length(p_entity_ids,1),0) < 2 then raise exception 'COMPETITION_NEEDS_PARTICIPANTS'; end if;

  insert into public.ms_organization_competitions(
    organization_id,name,sport_id,format,participant_mode,status,starts_at,description,created_by
  ) values (
    p_org_id,
    trim(p_name),
    left(coalesce(nullif(trim(p_sport_id),''),'Multisport'),48),
    p_format,
    p_participant_mode,
    'draft',
    p_starts_at,
    left(coalesce(trim(p_description),''),360),
    v_me
  ) returning * into v_comp;

  foreach v_entity_id in array p_entity_ids loop
    if v_entity_id is null or v_entity_id=any(v_seen) then continue; end if;
    v_seen:=array_append(v_seen,v_entity_id);
    if p_participant_mode='teams' then
      select g.name into v_display_name
      from public.ms_organization_groups g
      where g.id=v_entity_id and g.organization_id=p_org_id and coalesce(g.status,'active')='active';
      if v_display_name is null then raise exception 'COMPETITION_PARTICIPANT_INVALID'; end if;
    else
      if not exists (
        select 1 from public.ms_organization_members m
        where m.user_id=v_entity_id and m.organization_id=p_org_id and m.status='active'
      ) then raise exception 'COMPETITION_PARTICIPANT_INVALID'; end if;
      select coalesce(nullif(trim(pp.display_name),''),'Joueur MSS') into v_display_name
      from public.ms_public_profiles pp where pp.user_id=v_entity_id;
      v_display_name:=coalesce(v_display_name,'Joueur MSS');
    end if;
    v_seed:=v_seed+1;
    insert into public.ms_organization_competition_participants(
      organization_id,competition_id,entity_type,entity_id,display_name,seed
    ) values (
      p_org_id,v_comp.id,case when p_participant_mode='teams' then 'group' else 'member' end,v_entity_id,left(v_display_name,120),v_seed
    );
  end loop;

  if v_seed < 2 then
    raise exception 'COMPETITION_NEEDS_PARTICIPANTS';
  end if;

  return jsonb_build_object(
    'id',v_comp.id::text,'organizationId',v_comp.organization_id::text,'name',v_comp.name,
    'sportId',v_comp.sport_id,'format',v_comp.format,'participantMode',v_comp.participant_mode,
    'status',v_comp.status,'startsAt',coalesce(v_comp.starts_at::text,''),'endsAt','',
    'description',v_comp.description,'participantCount',v_seed,'fixtureCount',0,'completedFixtureCount',0,
    'createdAt',v_comp.created_at,'updatedAt',v_comp.updated_at
  );
end $$;

create or replace function public.ms_org_get_competition(p_competition_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_org_id uuid;
  v_comp jsonb;
  v_participants jsonb;
  v_fixtures jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_competitions where id=p_competition_id;
  if v_org_id is null then raise exception 'COMPETITION_NOT_FOUND'; end if;
  if not public.ms_org_is_member(v_org_id) then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object(
    'id',c.id::text,'organizationId',c.organization_id::text,'name',c.name,'sportId',c.sport_id,
    'format',c.format,'participantMode',c.participant_mode,'status',c.status,
    'startsAt',coalesce(c.starts_at::text,''),'endsAt',coalesce(c.ends_at::text,''),'description',c.description,
    'participantCount',(select count(*) from public.ms_organization_competition_participants p where p.competition_id=c.id),
    'fixtureCount',(select count(*) from public.ms_organization_competition_fixtures f where f.competition_id=c.id),
    'completedFixtureCount',(select count(*) from public.ms_organization_competition_fixtures f where f.competition_id=c.id and f.status='completed'),
    'createdAt',c.created_at,'updatedAt',c.updated_at
  ) into v_comp
  from public.ms_organization_competitions c where c.id=p_competition_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id::text,'competitionId',p.competition_id::text,'organizationId',p.organization_id::text,
    'entityType',p.entity_type,'entityId',p.entity_id::text,
    'displayName',coalesce(nullif(trim(p.display_name),''),case when p.entity_type='group' then coalesce(g.name,'Équipe') else coalesce(nullif(trim(pp.display_name),''),'Joueur MSS') end),
    'avatarUrl',case when p.entity_type='member' then coalesce(pp.avatar_url,'') else '' end,
    'seed',p.seed
  ) order by p.seed),'[]'::jsonb) into v_participants
  from public.ms_organization_competition_participants p
  left join public.ms_organization_groups g on p.entity_type='group' and g.id=p.entity_id
  left join public.ms_public_profiles pp on p.entity_type='member' and pp.user_id=p.entity_id
  where p.competition_id=p_competition_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id::text,'competitionId',f.competition_id::text,'organizationId',f.organization_id::text,
    'round',f.round,'sequence',f.sequence,'groupLabel',f.group_label,
    'homeParticipantId',f.home_participant_id::text,'awayParticipantId',f.away_participant_id::text,
    'homeName',coalesce(nullif(trim(hp.display_name),''),case when hp.entity_type='group' then coalesce(hg.name,'Équipe') else coalesce(nullif(trim(hprof.display_name),''),'Joueur MSS') end),
    'awayName',coalesce(nullif(trim(ap.display_name),''),case when ap.entity_type='group' then coalesce(ag.name,'Équipe') else coalesce(nullif(trim(aprof.display_name),''),'Joueur MSS') end),
    'scheduledAt',coalesce(f.scheduled_at::text,''),'status',f.status,
    'winnerParticipantId',coalesce(f.winner_participant_id::text,''),'scoreLabel',f.score_label,'resultRef',f.result_ref,
    'createdAt',f.created_at,'updatedAt',f.updated_at
  ) order by f.round,f.sequence),'[]'::jsonb) into v_fixtures
  from public.ms_organization_competition_fixtures f
  join public.ms_organization_competition_participants hp on hp.id=f.home_participant_id
  join public.ms_organization_competition_participants ap on ap.id=f.away_participant_id
  left join public.ms_organization_groups hg on hp.entity_type='group' and hg.id=hp.entity_id
  left join public.ms_organization_groups ag on ap.entity_type='group' and ag.id=ap.entity_id
  left join public.ms_public_profiles hprof on hp.entity_type='member' and hprof.user_id=hp.entity_id
  left join public.ms_public_profiles aprof on ap.entity_type='member' and aprof.user_id=ap.entity_id
  where f.competition_id=p_competition_id;

  return jsonb_build_object('competition',v_comp,'participants',v_participants,'fixtures',v_fixtures);
end $$;

create or replace function public.ms_org_set_competition_status(p_competition_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_org_id uuid;
  v_comp public.ms_organization_competitions%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_competitions where id=p_competition_id;
  if v_org_id is null then raise exception 'COMPETITION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('draft','open','active','completed','archived') then raise exception 'INVALID_COMPETITION_STATUS'; end if;
  update public.ms_organization_competitions
  set status=p_status,ends_at=case when p_status='completed' then coalesce(ends_at,now()) else ends_at end,updated_at=now()
  where id=p_competition_id returning * into v_comp;
  return jsonb_build_object(
    'id',v_comp.id::text,'organizationId',v_comp.organization_id::text,'name',v_comp.name,'sportId',v_comp.sport_id,
    'format',v_comp.format,'participantMode',v_comp.participant_mode,'status',v_comp.status,
    'startsAt',coalesce(v_comp.starts_at::text,''),'endsAt',coalesce(v_comp.ends_at::text,''),'description',v_comp.description,
    'participantCount',(select count(*) from public.ms_organization_competition_participants p where p.competition_id=v_comp.id),
    'fixtureCount',(select count(*) from public.ms_organization_competition_fixtures f where f.competition_id=v_comp.id),
    'completedFixtureCount',(select count(*) from public.ms_organization_competition_fixtures f where f.competition_id=v_comp.id and f.status='completed'),
    'createdAt',v_comp.created_at,'updatedAt',v_comp.updated_at
  );
end $$;

create or replace function public.ms_org_delete_competition(p_competition_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare v_org_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_competitions where id=p_competition_id;
  if v_org_id is null then raise exception 'COMPETITION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_competitions where id=p_competition_id;
  return true;
end $$;

create or replace function public.ms_org_generate_competition_fixtures(p_competition_id uuid)
returns integer
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_org_id uuid;
  v_format text;
  v_ids uuid[];
  v_n integer;
  v_i integer;
  v_j integer;
  v_seq integer:=0;
  v_group text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id,format into v_org_id,v_format from public.ms_organization_competitions where id=p_competition_id;
  if v_org_id is null then raise exception 'COMPETITION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from public.ms_organization_competition_fixtures where competition_id=p_competition_id) then return 0; end if;
  select array_agg(id order by seed) into v_ids from public.ms_organization_competition_participants where competition_id=p_competition_id;
  v_n:=coalesce(array_length(v_ids,1),0);
  if v_n<2 then raise exception 'COMPETITION_NEEDS_PARTICIPANTS'; end if;

  if v_format='league' then
    for v_i in 1..v_n-1 loop
      for v_j in v_i+1..v_n loop
        v_seq:=v_seq+1;
        insert into public.ms_organization_competition_fixtures(organization_id,competition_id,round,sequence,home_participant_id,away_participant_id,created_by)
        values(v_org_id,p_competition_id,v_i,v_seq,v_ids[v_i],v_ids[v_j],auth.uid());
      end loop;
    end loop;
  elsif v_format='knockout' then
    v_i:=1;
    while v_i<v_n loop
      v_seq:=v_seq+1;
      insert into public.ms_organization_competition_fixtures(organization_id,competition_id,round,sequence,home_participant_id,away_participant_id,created_by)
      values(v_org_id,p_competition_id,1,v_seq,v_ids[v_i],v_ids[v_i+1],auth.uid());
      v_i:=v_i+2;
    end loop;
  elsif v_format='groups_knockout' then
    for v_i in 1..v_n-1 loop
      for v_j in v_i+1..v_n loop
        if mod(v_i,2)=mod(v_j,2) then
          v_seq:=v_seq+1;
          v_group:=case when mod(v_i,2)=1 then 'POULE A' else 'POULE B' end;
          insert into public.ms_organization_competition_fixtures(organization_id,competition_id,round,sequence,group_label,home_participant_id,away_participant_id,created_by)
          values(v_org_id,p_competition_id,1,v_seq,v_group,v_ids[v_i],v_ids[v_j],auth.uid());
        end if;
      end loop;
    end loop;
  else
    return 0;
  end if;

  update public.ms_organization_competitions set status='active',updated_at=now() where id=p_competition_id and status in ('draft','open');
  return v_seq;
end $$;

create or replace function public.ms_org_create_competition_fixture(
  p_competition_id uuid,
  p_home_participant_id uuid,
  p_away_participant_id uuid,
  p_scheduled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_org_id uuid;
  v_sequence integer;
  v_fixture public.ms_organization_competition_fixtures%rowtype;
  v_home_name text;
  v_away_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_competitions where id=p_competition_id;
  if v_org_id is null then raise exception 'COMPETITION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if p_home_participant_id=p_away_participant_id then raise exception 'COMPETITION_PARTICIPANT_INVALID'; end if;
  if not exists(select 1 from public.ms_organization_competition_participants where id=p_home_participant_id and competition_id=p_competition_id)
     or not exists(select 1 from public.ms_organization_competition_participants where id=p_away_participant_id and competition_id=p_competition_id) then
    raise exception 'COMPETITION_PARTICIPANT_INVALID';
  end if;
  select coalesce(max(sequence),0)+1 into v_sequence from public.ms_organization_competition_fixtures where competition_id=p_competition_id;
  insert into public.ms_organization_competition_fixtures(organization_id,competition_id,round,sequence,home_participant_id,away_participant_id,scheduled_at,created_by)
  values(v_org_id,p_competition_id,1,v_sequence,p_home_participant_id,p_away_participant_id,p_scheduled_at,auth.uid()) returning * into v_fixture;

  select coalesce(nullif(trim(p.display_name),''),case when p.entity_type='group' then coalesce(g.name,'Équipe') else coalesce(nullif(trim(pp.display_name),''),'Joueur MSS') end) into v_home_name
  from public.ms_organization_competition_participants p
  left join public.ms_organization_groups g on p.entity_type='group' and g.id=p.entity_id
  left join public.ms_public_profiles pp on p.entity_type='member' and pp.user_id=p.entity_id
  where p.id=p_home_participant_id;
  select coalesce(nullif(trim(p.display_name),''),case when p.entity_type='group' then coalesce(g.name,'Équipe') else coalesce(nullif(trim(pp.display_name),''),'Joueur MSS') end) into v_away_name
  from public.ms_organization_competition_participants p
  left join public.ms_organization_groups g on p.entity_type='group' and g.id=p.entity_id
  left join public.ms_public_profiles pp on p.entity_type='member' and pp.user_id=p.entity_id
  where p.id=p_away_participant_id;

  return jsonb_build_object(
    'id',v_fixture.id::text,'competitionId',v_fixture.competition_id::text,'organizationId',v_fixture.organization_id::text,
    'round',v_fixture.round,'sequence',v_fixture.sequence,'groupLabel',v_fixture.group_label,
    'homeParticipantId',v_fixture.home_participant_id::text,'awayParticipantId',v_fixture.away_participant_id::text,
    'homeName',v_home_name,'awayName',v_away_name,'scheduledAt',coalesce(v_fixture.scheduled_at::text,''),
    'status',v_fixture.status,'winnerParticipantId','','scoreLabel','','resultRef','',
    'createdAt',v_fixture.created_at,'updatedAt',v_fixture.updated_at
  );
end $$;

create or replace function public.ms_org_set_competition_fixture_result(
  p_fixture_id uuid,
  p_winner_participant_id uuid,
  p_score_label text,
  p_result_ref text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_fixture public.ms_organization_competition_fixtures%rowtype;
  v_home_name text;
  v_away_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_fixture from public.ms_organization_competition_fixtures where id=p_fixture_id;
  if v_fixture.id is null then raise exception 'COMPETITION_FIXTURE_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_fixture.organization_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if p_winner_participant_id not in (v_fixture.home_participant_id,v_fixture.away_participant_id) then raise exception 'COMPETITION_PARTICIPANT_INVALID'; end if;
  if char_length(coalesce(p_score_label,''))>60 or char_length(coalesce(p_result_ref,''))>180 then raise exception 'INVALID_RESULT_SUMMARY'; end if;

  update public.ms_organization_competition_fixtures
  set winner_participant_id=p_winner_participant_id,status='completed',score_label=left(coalesce(trim(p_score_label),''),60),result_ref=left(coalesce(trim(p_result_ref),''),180),updated_at=now()
  where id=p_fixture_id returning * into v_fixture;

  select coalesce(nullif(trim(p.display_name),''),case when p.entity_type='group' then coalesce(g.name,'Équipe') else coalesce(nullif(trim(pp.display_name),''),'Joueur MSS') end) into v_home_name
  from public.ms_organization_competition_participants p left join public.ms_organization_groups g on p.entity_type='group' and g.id=p.entity_id left join public.ms_public_profiles pp on p.entity_type='member' and pp.user_id=p.entity_id where p.id=v_fixture.home_participant_id;
  select coalesce(nullif(trim(p.display_name),''),case when p.entity_type='group' then coalesce(g.name,'Équipe') else coalesce(nullif(trim(pp.display_name),''),'Joueur MSS') end) into v_away_name
  from public.ms_organization_competition_participants p left join public.ms_organization_groups g on p.entity_type='group' and g.id=p.entity_id left join public.ms_public_profiles pp on p.entity_type='member' and pp.user_id=p.entity_id where p.id=v_fixture.away_participant_id;


  return jsonb_build_object(
    'id',v_fixture.id::text,'competitionId',v_fixture.competition_id::text,'organizationId',v_fixture.organization_id::text,
    'round',v_fixture.round,'sequence',v_fixture.sequence,'groupLabel',v_fixture.group_label,
    'homeParticipantId',v_fixture.home_participant_id::text,'awayParticipantId',v_fixture.away_participant_id::text,
    'homeName',v_home_name,'awayName',v_away_name,'scheduledAt',coalesce(v_fixture.scheduled_at::text,''),
    'status',v_fixture.status,'winnerParticipantId',coalesce(v_fixture.winner_participant_id::text,''),
    'scoreLabel',v_fixture.score_label,'resultRef',v_fixture.result_ref,'createdAt',v_fixture.created_at,'updatedAt',v_fixture.updated_at
  );
end $$;

revoke all on function public.ms_org_list_competitions(uuid) from public;
revoke all on function public.ms_org_create_competition(uuid,text,text,text,text,timestamptz,text,uuid[]) from public;
revoke all on function public.ms_org_get_competition(uuid) from public;
revoke all on function public.ms_org_set_competition_status(uuid,text) from public;
revoke all on function public.ms_org_delete_competition(uuid) from public;
revoke all on function public.ms_org_generate_competition_fixtures(uuid) from public;
revoke all on function public.ms_org_create_competition_fixture(uuid,uuid,uuid,timestamptz) from public;
revoke all on function public.ms_org_set_competition_fixture_result(uuid,uuid,text,text) from public;

grant execute on function public.ms_org_list_competitions(uuid) to authenticated;
grant execute on function public.ms_org_create_competition(uuid,text,text,text,text,timestamptz,text,uuid[]) to authenticated;
grant execute on function public.ms_org_get_competition(uuid) to authenticated;
grant execute on function public.ms_org_set_competition_status(uuid,text) to authenticated;
grant execute on function public.ms_org_delete_competition(uuid) to authenticated;
grant execute on function public.ms_org_generate_competition_fixtures(uuid) to authenticated;
grant execute on function public.ms_org_create_competition_fixture(uuid,uuid,uuid,timestamptz) to authenticated;
grant execute on function public.ms_org_set_competition_fixture_result(uuid,uuid,text,text) to authenticated;

commit;
