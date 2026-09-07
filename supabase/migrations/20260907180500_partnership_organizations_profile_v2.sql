-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V2
-- Fiche organisme légère + références médias.
-- IMPORTANT : aucune image, photo, statistique lourde ou blob n'est stocké ici.
-- Les champs logo_media_key / cover_media_key ne contiennent que des clés vers
-- le coffre média MSS (R2 ou destination choisie dans le Centre de stockage).

begin;

alter table public.ms_organizations
  add column if not exists profile jsonb not null default '{}'::jsonb,
  add column if not exists logo_media_key text,
  add column if not exists cover_media_key text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='ms_org_profile_light_chk') then
    alter table public.ms_organizations
      add constraint ms_org_profile_light_chk
      check (jsonb_typeof(profile)='object' and octet_length(profile::text) <= 16384);
  end if;
  if not exists (select 1 from pg_constraint where conname='ms_org_logo_media_key_chk') then
    alter table public.ms_organizations
      add constraint ms_org_logo_media_key_chk
      check (logo_media_key is null or (char_length(logo_media_key) <= 220 and logo_media_key ~ '^[A-Za-z0-9:_-]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname='ms_org_cover_media_key_chk') then
    alter table public.ms_organizations
      add constraint ms_org_cover_media_key_chk
      check (cover_media_key is null or (char_length(cover_media_key) <= 220 and cover_media_key ~ '^[A-Za-z0-9:_-]+$'));
  end if;
end
$$;

-- Mise à jour sécurisée de la fiche : propriétaire / administrateur uniquement.
create or replace function public.ms_org_update_profile(
  p_org_id uuid,
  p_profile jsonb,
  p_logo_media_key text,
  p_cover_media_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid := auth.uid();
  v_org public.ms_organizations%rowtype;
  v_role text;
  v_profile jsonb := coalesce(p_profile,'{}'::jsonb);
  v_members bigint;
  v_groups bigint;
  v_events bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_org_id is null then raise exception 'ORGANIZATION_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(v_profile) <> 'object' then raise exception 'INVALID_PROFILE'; end if;

  -- Interdit explicitement de glisser les médias eux-mêmes dans le JSON.
  v_profile := v_profile
    - 'logoMediaKey' - 'logo_media_key'
    - 'coverMediaKey' - 'cover_media_key'
    - 'logoDataUrl' - 'coverDataUrl' - 'image' - 'photo' - 'blob';

  if octet_length(v_profile::text) > 16384 then raise exception 'PROFILE_TOO_LARGE'; end if;
  if nullif(trim(coalesce(p_logo_media_key,'')),'') is not null and
     (char_length(trim(p_logo_media_key)) > 220 or trim(p_logo_media_key) !~ '^[A-Za-z0-9:_-]+$') then
    raise exception 'INVALID_LOGO_MEDIA_KEY';
  end if;
  if nullif(trim(coalesce(p_cover_media_key,'')),'') is not null and
     (char_length(trim(p_cover_media_key)) > 220 or trim(p_cover_media_key) !~ '^[A-Za-z0-9:_-]+$') then
    raise exception 'INVALID_COVER_MEDIA_KEY';
  end if;

  update public.ms_organizations
  set profile=v_profile,
      logo_media_key=nullif(trim(coalesce(p_logo_media_key,'')),''),
      cover_media_key=nullif(trim(coalesce(p_cover_media_key,'')),'')
  where id=p_org_id
  returning * into v_org;

  if v_org.id is null then raise exception 'ORGANIZATION_NOT_FOUND'; end if;

  select role into v_role
  from public.ms_organization_members
  where organization_id=v_org.id and user_id=v_uid and status='active';

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

-- Rejoindre : renvoie aussi la fiche et les références médias.
create or replace function public.ms_org_join_by_code(p_join_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid := auth.uid();
  v_org public.ms_organizations%rowtype;
  v_role text;
  v_status text;
  v_members bigint;
  v_groups bigint;
  v_events bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_org
  from public.ms_organizations
  where upper(replace(join_code,' ',''))=upper(replace(trim(coalesce(p_join_code,'')),' ',''))
  limit 1;

  if v_org.id is null then raise exception 'ORGANIZATION_NOT_FOUND'; end if;

  insert into public.ms_organization_members(organization_id,user_id,role,status)
  values(v_org.id,v_uid,case when v_org.owner_id=v_uid then 'owner' else 'member' end,'active')
  on conflict(organization_id,user_id) do update
    set status = case
      when public.ms_organization_members.status='suspended' then 'suspended'
      else 'active'
    end;

  select role,status into v_role,v_status
  from public.ms_organization_members
  where organization_id=v_org.id and user_id=v_uid;

  if v_status='suspended' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;

  select count(*) into v_members from public.ms_organization_members where organization_id=v_org.id and status='active';
  select count(*) into v_groups from public.ms_organization_groups where organization_id=v_org.id;
  select count(*) into v_events from public.ms_organization_events where organization_id=v_org.id;

  return jsonb_build_object(
    'id',v_org.id::text,'name',v_org.name,'kind',v_org.kind,'plan',v_org.plan,'role',v_role,
    'joinCode',v_org.join_code,'city',coalesce(v_org.city,''),'countryCode',v_org.country_code,
    'description',coalesce(v_org.description,''),'profile',coalesce(v_org.profile,'{}'::jsonb),
    'logoMediaKey',coalesce(v_org.logo_media_key,''),'coverMediaKey',coalesce(v_org.cover_media_key,''),
    'memberCount',v_members,'groupCount',v_groups,'eventCount',v_events,
    'createdAt',v_org.created_at,'updatedAt',v_org.updated_at
  );
end
$$;

-- Liste des organisations du compte avec fiche légère.
create or replace function public.ms_org_list_mine()
returns setof jsonb
language sql
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',o.id::text,
    'name',o.name,
    'kind',o.kind,
    'plan',o.plan,
    'role',m.role,
    'joinCode',o.join_code,
    'city',coalesce(o.city,''),
    'countryCode',o.country_code,
    'description',coalesce(o.description,''),
    'profile',coalesce(o.profile,'{}'::jsonb),
    'logoMediaKey',coalesce(o.logo_media_key,''),
    'coverMediaKey',coalesce(o.cover_media_key,''),
    'memberCount',(select count(*) from public.ms_organization_members mm where mm.organization_id=o.id and mm.status='active'),
    'groupCount',(select count(*) from public.ms_organization_groups g where g.organization_id=o.id),
    'eventCount',(select count(*) from public.ms_organization_events e where e.organization_id=o.id),
    'createdAt',o.created_at,
    'updatedAt',o.updated_at
  )
  from public.ms_organization_members m
  join public.ms_organizations o on o.id=m.organization_id
  where auth.uid() is not null
    and m.user_id=auth.uid()
    and m.status='active'
  order by o.updated_at desc,o.created_at desc;
$$;

revoke all on function public.ms_org_update_profile(uuid,jsonb,text,text) from public;
grant execute on function public.ms_org_update_profile(uuid,jsonb,text,text) to authenticated;

-- Les clients n'ont pas d'UPDATE direct sur les trois nouveaux champs : RPC uniquement.
revoke update (profile,logo_media_key,cover_media_key) on public.ms_organizations from authenticated;

commit;
