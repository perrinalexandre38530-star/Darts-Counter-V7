-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V11 FINAL
-- Installations physiques + QR de lieu. Une seule table relationnelle légère.
-- Aucun média, aucune stat détaillée, aucun historique de match dans Supabase.

begin;

create table if not exists public.ms_organization_installations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'other',
  sport_id text not null default 'Multisport',
  zone_label text not null default '',
  qr_token text not null unique,
  status text not null default 'active',
  play_count bigint not null default 0,
  last_played_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_install_name_len check (char_length(name) between 2 and 100),
  constraint ms_org_install_kind_check check (kind in ('dartboard','table','pitch','court','lane','room','station','other')),
  constraint ms_org_install_sport_len check (char_length(sport_id) between 1 and 48),
  constraint ms_org_install_zone_len check (char_length(zone_label) <= 120),
  constraint ms_org_install_token_len check (char_length(qr_token) between 12 and 40),
  constraint ms_org_install_status_check check (status in ('active','maintenance','archived')),
  constraint ms_org_install_play_count check (play_count >= 0)
);

create index if not exists ms_org_installations_org_idx
  on public.ms_organization_installations(organization_id,status,created_at desc);

alter table public.ms_organization_installations enable row level security;

drop policy if exists ms_org_installations_select on public.ms_organization_installations;
create policy ms_org_installations_select on public.ms_organization_installations
for select to authenticated
using (public.ms_org_is_member(organization_id));

revoke insert,update,delete on public.ms_organization_installations from authenticated;
grant select on public.ms_organization_installations to authenticated;

create or replace function public.ms_org_new_installation_token()
returns text
language sql
volatile
security definer
set search_path=public
as $$
  select 'MSSV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
$$;

revoke all on function public.ms_org_new_installation_token() from public;

create or replace function public.ms_org_list_installations(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',i.id::text,
    'organizationId',i.organization_id::text,
    'organizationName',o.name,
    'organizationKind',o.kind,
    'name',i.name,
    'kind',i.kind,
    'sportId',i.sport_id,
    'zoneLabel',i.zone_label,
    'qrToken',i.qr_token,
    'status',i.status,
    'playCount',i.play_count,
    'lastPlayedAt',coalesce(i.last_played_at::text,''),
    'createdAt',i.created_at,
    'updatedAt',i.updated_at
  )
  from public.ms_organization_installations i
  join public.ms_organizations o on o.id=i.organization_id
  where i.organization_id=p_org_id
    and auth.uid() is not null
    and public.ms_org_is_member(p_org_id)
  order by case i.status when 'active' then 0 when 'maintenance' then 1 else 2 end,
           i.created_at asc
  limit 200;
$$;

create or replace function public.ms_org_create_installation(
  p_org_id uuid,
  p_name text,
  p_kind text,
  p_sport_id text,
  p_zone_label text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_row public.ms_organization_installations%rowtype;
  v_kind text:=lower(trim(coalesce(p_kind,'other')));
  v_token text;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'INSTALLATION_NAME_REQUIRED'; end if;
  if v_kind not in ('dartboard','table','pitch','court','lane','room','station','other') then raise exception 'INVALID_INSTALLATION_KIND'; end if;
  if char_length(trim(coalesce(p_sport_id,'Multisport'))) not between 1 and 48 then raise exception 'INVALID_SPORT'; end if;
  if char_length(trim(coalesce(p_zone_label,''))) > 120 then raise exception 'ZONE_TOO_LONG'; end if;

  loop
    v_token:=public.ms_org_new_installation_token();
    exit when not exists(select 1 from public.ms_organization_installations where qr_token=v_token);
  end loop;

  insert into public.ms_organization_installations(
    organization_id,name,kind,sport_id,zone_label,qr_token,status,created_by
  ) values (
    p_org_id,trim(p_name),v_kind,left(trim(coalesce(p_sport_id,'Multisport')),48),left(trim(coalesce(p_zone_label,'')),120),v_token,'active',v_me
  ) returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,
    'organizationName',(select o.name from public.ms_organizations o where o.id=v_row.organization_id),
    'organizationKind',(select o.kind from public.ms_organizations o where o.id=v_row.organization_id),
    'name',v_row.name,'kind',v_row.kind,'sportId',v_row.sport_id,'zoneLabel',v_row.zone_label,
    'qrToken',v_row.qr_token,'status',v_row.status,'playCount',v_row.play_count,
    'lastPlayedAt',coalesce(v_row.last_played_at::text,''),'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_update_installation(
  p_installation_id uuid,
  p_name text,
  p_kind text,
  p_sport_id text,
  p_zone_label text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_row public.ms_organization_installations%rowtype;
  v_kind text:=lower(trim(coalesce(p_kind,'other')));
  v_status text:=lower(trim(coalesce(p_status,'active')));
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_installations where id=p_installation_id;
  if v_org_id is null then raise exception 'INSTALLATION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'INSTALLATION_NAME_REQUIRED'; end if;
  if v_kind not in ('dartboard','table','pitch','court','lane','room','station','other') then raise exception 'INVALID_INSTALLATION_KIND'; end if;
  if v_status not in ('active','maintenance','archived') then raise exception 'INVALID_INSTALLATION_STATUS'; end if;
  if char_length(trim(coalesce(p_sport_id,'Multisport'))) not between 1 and 48 then raise exception 'INVALID_SPORT'; end if;
  if char_length(trim(coalesce(p_zone_label,''))) > 120 then raise exception 'ZONE_TOO_LONG'; end if;

  update public.ms_organization_installations
  set name=trim(p_name),kind=v_kind,sport_id=left(trim(coalesce(p_sport_id,'Multisport')),48),
      zone_label=left(trim(coalesce(p_zone_label,'')),120),status=v_status,updated_at=now()
  where id=p_installation_id returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,
    'organizationName',(select o.name from public.ms_organizations o where o.id=v_row.organization_id),
    'organizationKind',(select o.kind from public.ms_organizations o where o.id=v_row.organization_id),
    'name',v_row.name,'kind',v_row.kind,'sportId',v_row.sport_id,'zoneLabel',v_row.zone_label,
    'qrToken',v_row.qr_token,'status',v_row.status,'playCount',v_row.play_count,
    'lastPlayedAt',coalesce(v_row.last_played_at::text,''),'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_delete_installation(p_installation_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_installations where id=p_installation_id;
  if v_org_id is null then raise exception 'INSTALLATION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_installations where id=p_installation_id;
  return true;
end $$;

create or replace function public.ms_org_rotate_installation_qr(p_installation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_token text;
  v_row public.ms_organization_installations%rowtype;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_installations where id=p_installation_id;
  if v_org_id is null then raise exception 'INSTALLATION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  loop
    v_token:=public.ms_org_new_installation_token();
    exit when not exists(select 1 from public.ms_organization_installations where qr_token=v_token);
  end loop;
  update public.ms_organization_installations set qr_token=v_token,updated_at=now() where id=p_installation_id returning * into v_row;
  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,
    'organizationName',(select o.name from public.ms_organizations o where o.id=v_row.organization_id),
    'organizationKind',(select o.kind from public.ms_organizations o where o.id=v_row.organization_id),
    'name',v_row.name,'kind',v_row.kind,'sportId',v_row.sport_id,'zoneLabel',v_row.zone_label,
    'qrToken',v_row.qr_token,'status',v_row.status,'playCount',v_row.play_count,
    'lastPlayedAt',coalesce(v_row.last_played_at::text,''),'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

-- Résolution QR : accessible à tout utilisateur connecté, même non-membre du lieu.
-- Le payload est volontairement public-safe : aucun code d'invitation, email ou donnée sensible.
create or replace function public.ms_org_resolve_installation_qr(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_row record;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select i.*,o.name as organization_name,o.kind as organization_kind
  into v_row
  from public.ms_organization_installations i
  join public.ms_organizations o on o.id=i.organization_id
  where i.qr_token=upper(trim(coalesce(p_token,''))) and i.status='active';
  if v_row.id is null then raise exception 'INVALID_QR_TOKEN'; end if;
  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,
    'organizationName',v_row.organization_name,'organizationKind',v_row.organization_kind,
    'name',v_row.name,'kind',v_row.kind,'sportId',v_row.sport_id,'zoneLabel',v_row.zone_label,
    'qrToken',v_row.qr_token,'status',v_row.status,'playCount',v_row.play_count,
    'lastPlayedAt',coalesce(v_row.last_played_at::text,''),'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

-- Compteur d'activation minimal, sans ligne d'historique supplémentaire.
-- Anti-spam très simple : une installation ne s'incrémente pas plus d'une fois toutes les 5 secondes.
create or replace function public.ms_org_touch_installation(p_token text)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_id uuid;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select id into v_id from public.ms_organization_installations where qr_token=upper(trim(coalesce(p_token,''))) and status='active';
  if v_id is null then raise exception 'INVALID_QR_TOKEN'; end if;
  update public.ms_organization_installations
  set play_count=play_count + case when last_played_at is null or last_played_at < now()-interval '5 seconds' then 1 else 0 end,
      last_played_at=now(),updated_at=now()
  where id=v_id;
  return true;
end $$;

revoke all on function public.ms_org_list_installations(uuid) from public;
revoke all on function public.ms_org_create_installation(uuid,text,text,text,text) from public;
revoke all on function public.ms_org_update_installation(uuid,text,text,text,text,text) from public;
revoke all on function public.ms_org_delete_installation(uuid) from public;
revoke all on function public.ms_org_rotate_installation_qr(uuid) from public;
revoke all on function public.ms_org_resolve_installation_qr(text) from public;
revoke all on function public.ms_org_touch_installation(text) from public;

grant execute on function public.ms_org_list_installations(uuid) to authenticated;
grant execute on function public.ms_org_create_installation(uuid,text,text,text,text) to authenticated;
grant execute on function public.ms_org_update_installation(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.ms_org_delete_installation(uuid) to authenticated;
grant execute on function public.ms_org_rotate_installation_qr(uuid) to authenticated;
grant execute on function public.ms_org_resolve_installation_qr(text) to authenticated;
grant execute on function public.ms_org_touch_installation(text) to authenticated;

commit;
