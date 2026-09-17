-- MULTISPORTS SCORING — ORGANISATIONS V12
-- Stabilisation finale : identité éditable + agenda CRUD sécurisé.
-- AUCUNE nouvelle table. AUCUN média/statistique lourde ajouté à Supabase.

begin;

create or replace function public.ms_org_update_identity(
  p_org_id uuid,
  p_name text,
  p_kind text,
  p_city text,
  p_country_code text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_org public.ms_organizations%rowtype;
  v_role text;
  v_members bigint;
  v_groups bigint;
  v_events bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 96 then raise exception 'INVALID_NAME'; end if;
  if lower(coalesce(p_kind,'')) not in ('club','association','company','venue','school','local_authority','organizer','other') then raise exception 'INVALID_KIND'; end if;
  if char_length(trim(coalesce(p_city,''))) > 120 then raise exception 'CITY_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_description,''))) > 500 then raise exception 'DESCRIPTION_TOO_LONG'; end if;

  update public.ms_organizations
  set name=trim(p_name),
      kind=lower(p_kind),
      city=nullif(trim(coalesce(p_city,'')),''),
      country_code=upper(left(coalesce(nullif(trim(p_country_code),''),'FR'),2)),
      description=nullif(trim(coalesce(p_description,'')),''),
      updated_at=now()
  where id=p_org_id
  returning * into v_org;
  if v_org.id is null then raise exception 'ORGANIZATION_NOT_FOUND'; end if;

  select role into v_role from public.ms_organization_members where organization_id=v_org.id and user_id=v_uid and status='active';
  select count(*) into v_members from public.ms_organization_members where organization_id=v_org.id and status='active';
  select count(*) into v_groups from public.ms_organization_groups where organization_id=v_org.id;
  select count(*) into v_events from public.ms_organization_events where organization_id=v_org.id;

  return jsonb_build_object(
    'id',v_org.id::text,'name',v_org.name,'kind',v_org.kind,'plan',v_org.plan,'role',coalesce(v_role,'member'),
    'joinCode',v_org.join_code,'city',coalesce(v_org.city,''),'countryCode',v_org.country_code,
    'description',coalesce(v_org.description,''),'profile',coalesce(v_org.profile,'{}'::jsonb),
    'logoMediaKey',coalesce(v_org.logo_media_key,''),'coverMediaKey',coalesce(v_org.cover_media_key,''),
    'memberCount',v_members,'groupCount',v_groups,'eventCount',v_events,
    'createdAt',v_org.created_at,'updatedAt',v_org.updated_at
  );
end
$$;

-- Les écritures agenda passent désormais uniquement par RPC.
revoke insert,update,delete on public.ms_organization_events from authenticated;
grant select on public.ms_organization_events to authenticated;

create or replace function public.ms_org_create_event(
  p_org_id uuid,
  p_group_id uuid,
  p_title text,
  p_event_type text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_event public.ms_organization_events%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_role from public.ms_organization_members where organization_id=p_org_id and user_id=v_uid and status='active';
  if v_role not in ('owner','admin','manager','captain') then raise exception 'FORBIDDEN'; end if;
  if v_role='captain' and (p_group_id is null or not exists(select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=p_org_id and g.captain_user_id=v_uid and g.status='active')) then raise exception 'CAPTAIN_GROUP_REQUIRED'; end if;
  if p_group_id is not null and not exists(select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=p_org_id) then raise exception 'INVALID_GROUP'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 96 then raise exception 'INVALID_TITLE'; end if;
  if coalesce(p_event_type,'event') not in ('event','training','match','tournament','meeting','other') then raise exception 'INVALID_EVENT_TYPE'; end if;
  if p_starts_at is null then raise exception 'START_REQUIRED'; end if;
  if p_ends_at is not null and p_ends_at < p_starts_at then raise exception 'INVALID_END'; end if;
  if char_length(trim(coalesce(p_location,''))) > 160 then raise exception 'LOCATION_TOO_LONG'; end if;

  insert into public.ms_organization_events(organization_id,group_id,title,event_type,starts_at,ends_at,location,created_by)
  values(p_org_id,p_group_id,trim(p_title),coalesce(p_event_type,'event'),p_starts_at,p_ends_at,nullif(trim(coalesce(p_location,'')),''),v_uid)
  returning * into v_event;

  return jsonb_build_object('id',v_event.id::text,'organizationId',v_event.organization_id::text,'groupId',coalesce(v_event.group_id::text,''),'title',v_event.title,'eventType',v_event.event_type,'startsAt',v_event.starts_at,'endsAt',v_event.ends_at,'location',coalesce(v_event.location,''),'createdBy',v_event.created_by::text,'createdAt',v_event.created_at);
end
$$;

create or replace function public.ms_org_update_event(
  p_event_id uuid,
  p_group_id uuid,
  p_title text,
  p_event_type text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_event public.ms_organization_events%rowtype;
  v_role text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_event from public.ms_organization_events where id=p_event_id;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  select role into v_role from public.ms_organization_members where organization_id=v_event.organization_id and user_id=v_uid and status='active';
  if v_role not in ('owner','admin','manager','captain') then raise exception 'FORBIDDEN'; end if;
  if v_role='captain' then
    if v_event.group_id is null or not exists(select 1 from public.ms_organization_groups g where g.id=v_event.group_id and g.organization_id=v_event.organization_id and g.captain_user_id=v_uid and g.status='active') then raise exception 'FORBIDDEN'; end if;
    if p_group_id is null or not exists(select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=v_event.organization_id and g.captain_user_id=v_uid and g.status='active') then raise exception 'CAPTAIN_GROUP_REQUIRED'; end if;
  end if;
  if p_group_id is not null and not exists(select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=v_event.organization_id) then raise exception 'INVALID_GROUP'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 96 then raise exception 'INVALID_TITLE'; end if;
  if coalesce(p_event_type,'event') not in ('event','training','match','tournament','meeting','other') then raise exception 'INVALID_EVENT_TYPE'; end if;
  if p_starts_at is null then raise exception 'START_REQUIRED'; end if;
  if p_ends_at is not null and p_ends_at < p_starts_at then raise exception 'INVALID_END'; end if;

  update public.ms_organization_events
  set group_id=p_group_id,title=trim(p_title),event_type=coalesce(p_event_type,'event'),starts_at=p_starts_at,ends_at=p_ends_at,location=nullif(trim(coalesce(p_location,'')),''),updated_at=now()
  where id=p_event_id returning * into v_event;

  return jsonb_build_object('id',v_event.id::text,'organizationId',v_event.organization_id::text,'groupId',coalesce(v_event.group_id::text,''),'title',v_event.title,'eventType',v_event.event_type,'startsAt',v_event.starts_at,'endsAt',v_event.ends_at,'location',coalesce(v_event.location,''),'createdBy',v_event.created_by::text,'createdAt',v_event.created_at);
end
$$;

create or replace function public.ms_org_delete_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_event public.ms_organization_events%rowtype;
  v_role text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_event from public.ms_organization_events where id=p_event_id;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  select role into v_role from public.ms_organization_members where organization_id=v_event.organization_id and user_id=v_uid and status='active';
  if v_role not in ('owner','admin','manager','captain') then raise exception 'FORBIDDEN'; end if;
  if v_role='captain' and (v_event.group_id is null or not exists(select 1 from public.ms_organization_groups g where g.id=v_event.group_id and g.organization_id=v_event.organization_id and g.captain_user_id=v_uid and g.status='active')) then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_events where id=p_event_id;
  return true;
end
$$;

revoke all on function public.ms_org_update_identity(uuid,text,text,text,text,text) from public;
revoke all on function public.ms_org_create_event(uuid,uuid,text,text,timestamptz,timestamptz,text) from public;
revoke all on function public.ms_org_update_event(uuid,uuid,text,text,timestamptz,timestamptz,text) from public;
revoke all on function public.ms_org_delete_event(uuid) from public;

grant execute on function public.ms_org_update_identity(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.ms_org_create_event(uuid,uuid,text,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.ms_org_update_event(uuid,uuid,text,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.ms_org_delete_event(uuid) to authenticated;

commit;
