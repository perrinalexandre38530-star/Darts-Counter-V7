-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V4
-- Fiches équipes/groupes, capitaines, couleurs, roster et logo par référence média.
-- Données légères uniquement : Supabase conserve les métadonnées et media keys.
-- Les octets des logos restent dans R2 / stockage choisi par l'utilisateur.

begin;

alter table public.ms_organization_groups
  add column if not exists description text not null default '',
  add column if not exists primary_color text not null default '#22D3EE',
  add column if not exists secondary_color text not null default '#0F172A',
  add column if not exists captain_user_id uuid references auth.users(id) on delete set null,
  add column if not exists logo_media_key text not null default '',
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='ms_organization_groups_status_check'
      and conrelid='public.ms_organization_groups'::regclass
  ) then
    alter table public.ms_organization_groups
      add constraint ms_organization_groups_status_check check (status in ('active','archived'));
  end if;
end $$;

create index if not exists ms_org_groups_captain_idx on public.ms_organization_groups(captain_user_id);
create index if not exists ms_org_groups_status_idx on public.ms_organization_groups(organization_id,status,created_at desc);

-- Après V4, les écritures groupes passent par RPC pour éviter qu'un client
-- puisse modifier created_by / organization_id / captain sans contrôle métier.
revoke insert,update,delete on public.ms_organization_groups from authenticated;
grant select on public.ms_organization_groups to authenticated;

create or replace function public.ms_org_list_groups(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',g.id::text,
    'organizationId',g.organization_id::text,
    'name',g.name,
    'sportId',g.sport_id,
    'kind',g.kind,
    'description',coalesce(g.description,''),
    'primaryColor',coalesce(g.primary_color,'#22D3EE'),
    'secondaryColor',coalesce(g.secondary_color,'#0F172A'),
    'captainUserId',coalesce(g.captain_user_id::text,''),
    'captainDisplayName',coalesce(nullif(trim(cp.display_name),''),''),
    'captainAvatarUrl',coalesce(cp.avatar_url,''),
    'logoMediaKey',coalesce(g.logo_media_key,''),
    'status',coalesce(g.status,'active'),
    'memberCount',(
      select count(*)
      from public.ms_organization_group_members gm
      join public.ms_organization_members m
        on m.organization_id=gm.organization_id and m.user_id=gm.user_id
      where gm.group_id=g.id and m.status='active'
    ),
    'createdAt',g.created_at,
    'updatedAt',g.updated_at
  )
  from public.ms_organization_groups g
  left join public.ms_public_profiles cp on cp.user_id=g.captain_user_id
  where g.organization_id=p_org_id
    and auth.uid() is not null
    and public.ms_org_is_member(p_org_id)
  order by case when g.status='active' then 0 else 1 end, g.created_at desc;
$$;

create or replace function public.ms_org_create_group(
  p_org_id uuid,
  p_name text,
  p_sport_id text,
  p_kind text,
  p_description text,
  p_primary_color text,
  p_secondary_color text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_role text;
  v_group public.ms_organization_groups%rowtype;
  v_result jsonb;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_role
  from public.ms_organization_members
  where organization_id=p_org_id and user_id=v_me and status='active';
  if v_role not in ('owner','admin','manager') then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 72 then raise exception 'GROUP_NAME_REQUIRED'; end if;
  if coalesce(p_kind,'team') not in ('team','section','department','class','group') then raise exception 'INVALID_GROUP_KIND'; end if;
  if coalesce(p_primary_color,'') !~ '^#[0-9A-Fa-f]{6}$' or coalesce(p_secondary_color,'') !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'INVALID_COLOR';
  end if;

  insert into public.ms_organization_groups(
    organization_id,name,sport_id,kind,description,primary_color,secondary_color,created_by
  ) values (
    p_org_id,
    trim(p_name),
    left(coalesce(nullif(trim(p_sport_id),''),'Multisport'),48),
    coalesce(p_kind,'team'),
    left(coalesce(trim(p_description),''),280),
    upper(p_primary_color),
    upper(p_secondary_color),
    v_me
  ) returning * into v_group;

  select jsonb_build_object(
    'id',v_group.id::text,'organizationId',v_group.organization_id::text,'name',v_group.name,
    'sportId',v_group.sport_id,'kind',v_group.kind,'description',v_group.description,
    'primaryColor',v_group.primary_color,'secondaryColor',v_group.secondary_color,
    'captainUserId','','captainDisplayName','','captainAvatarUrl','',
    'logoMediaKey',v_group.logo_media_key,'status',v_group.status,'memberCount',0,
    'createdAt',v_group.created_at,'updatedAt',v_group.updated_at
  ) into v_result;
  return v_result;
end $$;

create or replace function public.ms_org_update_group(
  p_group_id uuid,
  p_name text,
  p_sport_id text,
  p_kind text,
  p_description text,
  p_primary_color text,
  p_secondary_color text,
  p_captain_user_id uuid,
  p_logo_media_key text,
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
  v_role text;
  v_group public.ms_organization_groups%rowtype;
  v_result jsonb;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_groups where id=p_group_id;
  if v_org_id is null then raise exception 'GROUP_NOT_FOUND'; end if;
  select role into v_role
  from public.ms_organization_members
  where organization_id=v_org_id and user_id=v_me and status='active';
  if v_role not in ('owner','admin','manager') then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 72 then raise exception 'GROUP_NAME_REQUIRED'; end if;
  if coalesce(p_kind,'team') not in ('team','section','department','class','group') then raise exception 'INVALID_GROUP_KIND'; end if;
  if coalesce(p_status,'active') not in ('active','archived') then raise exception 'INVALID_GROUP_STATUS'; end if;
  if coalesce(p_primary_color,'') !~ '^#[0-9A-Fa-f]{6}$' or coalesce(p_secondary_color,'') !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'INVALID_COLOR';
  end if;
  if char_length(coalesce(p_logo_media_key,'')) > 180 then raise exception 'INVALID_MEDIA_KEY'; end if;

  if p_captain_user_id is not null and not exists (
    select 1 from public.ms_organization_members
    where organization_id=v_org_id and user_id=p_captain_user_id and status='active'
  ) then
    raise exception 'GROUP_CAPTAIN_INVALID';
  end if;

  update public.ms_organization_groups
  set name=trim(p_name),
      sport_id=left(coalesce(nullif(trim(p_sport_id),''),'Multisport'),48),
      kind=coalesce(p_kind,'team'),
      description=left(coalesce(trim(p_description),''),280),
      primary_color=upper(p_primary_color),
      secondary_color=upper(p_secondary_color),
      captain_user_id=p_captain_user_id,
      logo_media_key=left(coalesce(trim(p_logo_media_key),''),180),
      status=coalesce(p_status,'active'),
      updated_at=now()
  where id=p_group_id
  returning * into v_group;

  if p_captain_user_id is not null then
    insert into public.ms_organization_group_members(organization_id,group_id,user_id,assigned_by)
    values(v_org_id,p_group_id,p_captain_user_id,v_me)
    on conflict(group_id,user_id) do update set assigned_by=excluded.assigned_by;
  end if;

  select jsonb_build_object(
    'id',g.id::text,'organizationId',g.organization_id::text,'name',g.name,'sportId',g.sport_id,
    'kind',g.kind,'description',coalesce(g.description,''),'primaryColor',g.primary_color,
    'secondaryColor',g.secondary_color,'captainUserId',coalesce(g.captain_user_id::text,''),
    'captainDisplayName',coalesce(nullif(trim(cp.display_name),''),''),'captainAvatarUrl',coalesce(cp.avatar_url,''),
    'logoMediaKey',coalesce(g.logo_media_key,''),'status',g.status,
    'memberCount',(select count(*) from public.ms_organization_group_members gm join public.ms_organization_members m on m.organization_id=gm.organization_id and m.user_id=gm.user_id where gm.group_id=g.id and m.status='active'),
    'createdAt',g.created_at,'updatedAt',g.updated_at
  ) into v_result
  from public.ms_organization_groups g
  left join public.ms_public_profiles cp on cp.user_id=g.captain_user_id
  where g.id=p_group_id;
  return v_result;
end $$;

create or replace function public.ms_org_delete_group(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_role text;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_groups where id=p_group_id;
  if v_org_id is null then raise exception 'GROUP_NOT_FOUND'; end if;
  select role into v_role from public.ms_organization_members where organization_id=v_org_id and user_id=v_me and status='active';
  if v_role not in ('owner','admin','manager') then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_groups where id=p_group_id;
  return true;
end $$;

-- Extension de la V3 : un capitaine désigné peut gérer le roster de SA propre équipe.
create or replace function public.ms_org_set_group_member(p_group_id uuid,p_user_id uuid,p_assigned boolean)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_actor_role text;
  v_captain_user_id uuid;
  v_member_status text;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id,captain_user_id into v_org_id,v_captain_user_id from public.ms_organization_groups where id=p_group_id;
  if v_org_id is null then raise exception 'GROUP_NOT_FOUND'; end if;
  select role into v_actor_role from public.ms_organization_members where organization_id=v_org_id and user_id=v_me and status='active';
  if v_actor_role not in ('owner','admin','manager') and v_captain_user_id is distinct from v_me then raise exception 'FORBIDDEN'; end if;
  select status into v_member_status from public.ms_organization_members where organization_id=v_org_id and user_id=p_user_id;
  if v_member_status is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_member_status<>'active' then raise exception 'MEMBER_SUSPENDED'; end if;
  if p_user_id=v_captain_user_id and coalesce(p_assigned,false)=false then raise exception 'CAPTAIN_MUST_REMAIN_ASSIGNED'; end if;

  if coalesce(p_assigned,false) then
    insert into public.ms_organization_group_members(organization_id,group_id,user_id,assigned_by)
    values(v_org_id,p_group_id,p_user_id,v_me)
    on conflict(group_id,user_id) do update set assigned_by=excluded.assigned_by;
  else
    delete from public.ms_organization_group_members where group_id=p_group_id and user_id=p_user_id;
  end if;
  return true;
end $$;

revoke all on function public.ms_org_list_groups(uuid) from public;
revoke all on function public.ms_org_create_group(uuid,text,text,text,text,text,text) from public;
revoke all on function public.ms_org_update_group(uuid,text,text,text,text,text,text,uuid,text,text) from public;
revoke all on function public.ms_org_delete_group(uuid) from public;
revoke all on function public.ms_org_set_group_member(uuid,uuid,boolean) from public;

grant execute on function public.ms_org_list_groups(uuid) to authenticated;
grant execute on function public.ms_org_create_group(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.ms_org_update_group(uuid,text,text,text,text,text,text,uuid,text,text) to authenticated;
grant execute on function public.ms_org_delete_group(uuid) to authenticated;
grant execute on function public.ms_org_set_group_member(uuid,uuid,boolean) to authenticated;

commit;
