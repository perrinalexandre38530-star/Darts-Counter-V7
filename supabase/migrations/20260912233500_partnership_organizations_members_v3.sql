-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V3
-- Membres, rôles, invitations ciblées et affectation aux équipes/groupes.
-- Données légères uniquement : relations de comptes + métadonnées.
-- Aucun média, historique de parties ou statistique lourde n'est stocké ici.

begin;

create table if not exists public.ms_organization_group_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  group_id uuid not null references public.ms_organization_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(group_id,user_id)
);

create index if not exists ms_org_group_members_org_idx on public.ms_organization_group_members(organization_id);
create index if not exists ms_org_group_members_user_idx on public.ms_organization_group_members(user_id);

create table if not exists public.ms_organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','manager','captain','member','guest')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists ms_org_invitation_pending_unique
  on public.ms_organization_invitations(organization_id,invited_user_id)
  where status='pending';
create index if not exists ms_org_invitation_recipient_idx on public.ms_organization_invitations(invited_user_id,status,created_at desc);
create index if not exists ms_org_invitation_org_idx on public.ms_organization_invitations(organization_id,status,created_at desc);

alter table public.ms_organization_group_members enable row level security;
alter table public.ms_organization_invitations enable row level security;

drop policy if exists ms_org_group_members_select on public.ms_organization_group_members;
create policy ms_org_group_members_select on public.ms_organization_group_members
for select to authenticated
using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_invitations_select on public.ms_organization_invitations;
create policy ms_org_invitations_select on public.ms_organization_invitations
for select to authenticated
using (
  invited_user_id=auth.uid()
  or public.ms_org_has_role(organization_id,array['owner','admin','manager'])
);

-- Les mutations sensibles passent uniquement par les RPC SECURITY DEFINER ci-dessous.
revoke insert,update,delete on public.ms_organization_members from authenticated;
revoke insert,update,delete on public.ms_organization_group_members from authenticated;
revoke insert,update,delete on public.ms_organization_invitations from authenticated;
grant select on public.ms_organization_members to authenticated;
grant select on public.ms_organization_group_members to authenticated;
grant select on public.ms_organization_invitations to authenticated;

create or replace function public.ms_org_list_members(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'membershipId',m.id::text,
    'organizationId',m.organization_id::text,
    'userId',m.user_id::text,
    'displayName',coalesce(nullif(trim(p.display_name),''),'Joueur MSS'),
    'avatarUrl',coalesce(p.avatar_url,''),
    'countryCode',coalesce(p.country_code,''),
    'role',m.role,
    'status',m.status,
    'joinedAt',m.joined_at,
    'updatedAt',m.updated_at,
    'groupIds',coalesce((
      select jsonb_agg(gm.group_id::text order by gm.created_at)
      from public.ms_organization_group_members gm
      where gm.organization_id=m.organization_id and gm.user_id=m.user_id
    ),'[]'::jsonb)
  )
  from public.ms_organization_members m
  left join public.ms_public_profiles p on p.user_id=m.user_id
  where auth.uid() is not null
    and public.ms_org_is_member(p_org_id)
    and m.organization_id=p_org_id
  order by
    case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 when 'captain' then 3 when 'member' then 4 else 5 end,
    coalesce(p.display_name,'Joueur MSS');
$$;

create or replace function public.ms_org_set_member_role(p_org_id uuid,p_user_id uuid,p_role text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_actor_role text;
  v_target_role text;
  v_member public.ms_organization_members%rowtype;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_role not in ('admin','manager','captain','member','guest') then raise exception 'INVALID_ROLE'; end if;

  select role into v_actor_role from public.ms_organization_members
  where organization_id=p_org_id and user_id=v_me and status='active';
  select role into v_target_role from public.ms_organization_members
  where organization_id=p_org_id and user_id=p_user_id;

  if v_actor_role is null then raise exception 'FORBIDDEN'; end if;
  if v_target_role is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_target_role='owner' then raise exception 'OWNER_PROTECTED'; end if;

  if v_actor_role='owner' then
    null;
  elsif v_actor_role='admin' then
    if v_target_role='admin' or p_role='admin' then raise exception 'CANNOT_MANAGE_ROLE'; end if;
  elsif v_actor_role='manager' then
    if v_target_role in ('admin','manager') or p_role not in ('captain','member','guest') then raise exception 'CANNOT_MANAGE_ROLE'; end if;
  else
    raise exception 'FORBIDDEN';
  end if;

  update public.ms_organization_members
  set role=p_role,updated_at=now()
  where organization_id=p_org_id and user_id=p_user_id
  returning * into v_member;

  return jsonb_build_object(
    'membershipId',v_member.id::text,'organizationId',v_member.organization_id::text,'userId',v_member.user_id::text,
    'role',v_member.role,'status',v_member.status,'joinedAt',v_member.joined_at,'updatedAt',v_member.updated_at
  );
end $$;

create or replace function public.ms_org_set_member_status(p_org_id uuid,p_user_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_actor_role text;
  v_target_role text;
  v_member public.ms_organization_members%rowtype;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_status not in ('active','suspended') then raise exception 'INVALID_STATUS'; end if;
  select role into v_actor_role from public.ms_organization_members where organization_id=p_org_id and user_id=v_me and status='active';
  select role into v_target_role from public.ms_organization_members where organization_id=p_org_id and user_id=p_user_id;
  if v_actor_role not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  if v_target_role is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_target_role='owner' then raise exception 'OWNER_PROTECTED'; end if;
  if v_actor_role='admin' and v_target_role='admin' then raise exception 'CANNOT_MANAGE_ROLE'; end if;

  update public.ms_organization_members set status=p_status,updated_at=now()
  where organization_id=p_org_id and user_id=p_user_id returning * into v_member;

  if p_status='suspended' then
    delete from public.ms_organization_group_members where organization_id=p_org_id and user_id=p_user_id;
  end if;

  return jsonb_build_object(
    'membershipId',v_member.id::text,'organizationId',v_member.organization_id::text,'userId',v_member.user_id::text,
    'role',v_member.role,'status',v_member.status,'joinedAt',v_member.joined_at,'updatedAt',v_member.updated_at
  );
end $$;

create or replace function public.ms_org_remove_member(p_org_id uuid,p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_actor_role text;
  v_target_role text;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_actor_role from public.ms_organization_members where organization_id=p_org_id and user_id=v_me and status='active';
  select role into v_target_role from public.ms_organization_members where organization_id=p_org_id and user_id=p_user_id;
  if v_actor_role not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  if v_target_role is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_target_role='owner' then raise exception 'OWNER_PROTECTED'; end if;
  if v_actor_role='admin' and v_target_role='admin' then raise exception 'CANNOT_MANAGE_ROLE'; end if;

  delete from public.ms_organization_group_members where organization_id=p_org_id and user_id=p_user_id;
  delete from public.ms_organization_invitations where organization_id=p_org_id and invited_user_id=p_user_id and status='pending';
  delete from public.ms_organization_members where organization_id=p_org_id and user_id=p_user_id;
  return true;
end $$;

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
  v_member_status text;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_groups where id=p_group_id;
  if v_org_id is null then raise exception 'GROUP_NOT_FOUND'; end if;
  select role into v_actor_role from public.ms_organization_members where organization_id=v_org_id and user_id=v_me and status='active';
  if v_actor_role not in ('owner','admin','manager') then raise exception 'FORBIDDEN'; end if;
  select status into v_member_status from public.ms_organization_members where organization_id=v_org_id and user_id=p_user_id;
  if v_member_status is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_member_status<>'active' then raise exception 'MEMBER_SUSPENDED'; end if;

  if coalesce(p_assigned,false) then
    insert into public.ms_organization_group_members(organization_id,group_id,user_id,assigned_by)
    values(v_org_id,p_group_id,p_user_id,v_me)
    on conflict(group_id,user_id) do update set assigned_by=excluded.assigned_by;
  else
    delete from public.ms_organization_group_members where group_id=p_group_id and user_id=p_user_id;
  end if;
  return true;
end $$;

create or replace function public.ms_org_invite_user(p_org_id uuid,p_user_id uuid,p_role text default 'member')
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_actor_role text;
  v_existing_status text;
  v_inv public.ms_organization_invitations%rowtype;
  v_name text;
  v_avatar text;
  v_country text;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_user_id is null or p_user_id=v_me then raise exception 'INVALID_USER'; end if;
  if p_role not in ('admin','manager','captain','member','guest') then raise exception 'INVALID_ROLE'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if;

  select role into v_actor_role from public.ms_organization_members where organization_id=p_org_id and user_id=v_me and status='active';
  if v_actor_role='owner' then null;
  elsif v_actor_role='admin' then
    if p_role='admin' then raise exception 'CANNOT_MANAGE_ROLE'; end if;
  elsif v_actor_role='manager' then
    if p_role not in ('captain','member','guest') then raise exception 'CANNOT_MANAGE_ROLE'; end if;
  else raise exception 'FORBIDDEN';
  end if;

  select status into v_existing_status from public.ms_organization_members where organization_id=p_org_id and user_id=p_user_id;
  if v_existing_status='active' then raise exception 'ALREADY_MEMBER'; end if;
  if v_existing_status='suspended' then raise exception 'MEMBER_SUSPENDED'; end if;
  if exists(select 1 from public.ms_organization_invitations where organization_id=p_org_id and invited_user_id=p_user_id and status='pending') then
    raise exception 'INVITATION_ALREADY_PENDING';
  end if;

  insert into public.ms_organization_invitations(organization_id,invited_user_id,invited_by,role,status)
  values(p_org_id,p_user_id,v_me,p_role,'pending') returning * into v_inv;

  select display_name,avatar_url,country_code into v_name,v_avatar,v_country from public.ms_public_profiles where user_id=p_user_id;
  return jsonb_build_object(
    'id',v_inv.id::text,'organizationId',v_inv.organization_id::text,'invitedUserId',v_inv.invited_user_id::text,
    'invitedByUserId',v_inv.invited_by::text,'displayName',coalesce(v_name,'Joueur MSS'),'avatarUrl',coalesce(v_avatar,''),
    'countryCode',coalesce(v_country,''),'role',v_inv.role,'status',v_inv.status,'createdAt',v_inv.created_at,'respondedAt',''
  );
end $$;

create or replace function public.ms_org_list_invitations(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',i.id::text,'organizationId',i.organization_id::text,'organizationName',o.name,'organizationKind',o.kind,
    'invitedUserId',i.invited_user_id::text,'invitedByUserId',i.invited_by::text,
    'displayName',coalesce(p.display_name,'Joueur MSS'),'avatarUrl',coalesce(p.avatar_url,''),'countryCode',coalesce(p.country_code,''),
    'invitedByDisplayName',coalesce(ip.display_name,'Administrateur'),'role',i.role,'status',i.status,
    'createdAt',i.created_at,'respondedAt',i.responded_at
  )
  from public.ms_organization_invitations i
  join public.ms_organizations o on o.id=i.organization_id
  left join public.ms_public_profiles p on p.user_id=i.invited_user_id
  left join public.ms_public_profiles ip on ip.user_id=i.invited_by
  where i.organization_id=p_org_id
    and public.ms_org_has_role(p_org_id,array['owner','admin','manager'])
    and i.status='pending'
  order by i.created_at desc;
$$;

create or replace function public.ms_org_list_my_invitations()
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',i.id::text,'organizationId',i.organization_id::text,'organizationName',o.name,'organizationKind',o.kind,
    'invitedUserId',i.invited_user_id::text,'invitedByUserId',i.invited_by::text,
    'displayName',coalesce(me.display_name,'Joueur MSS'),'avatarUrl',coalesce(me.avatar_url,''),'countryCode',coalesce(me.country_code,''),
    'invitedByDisplayName',coalesce(ip.display_name,'Administrateur'),'role',i.role,'status',i.status,
    'createdAt',i.created_at,'respondedAt',i.responded_at
  )
  from public.ms_organization_invitations i
  join public.ms_organizations o on o.id=i.organization_id
  left join public.ms_public_profiles me on me.user_id=i.invited_user_id
  left join public.ms_public_profiles ip on ip.user_id=i.invited_by
  where auth.uid() is not null and i.invited_user_id=auth.uid() and i.status='pending'
  order by i.created_at desc;
$$;

create or replace function public.ms_org_respond_invitation(p_invitation_id uuid,p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_inv public.ms_organization_invitations%rowtype;
  v_existing_status text;
  v_org public.ms_organizations%rowtype;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_inv from public.ms_organization_invitations where id=p_invitation_id and invited_user_id=v_me and status='pending';
  if v_inv.id is null then raise exception 'INVITATION_NOT_FOUND'; end if;

  if coalesce(p_accept,false) then
    select status into v_existing_status from public.ms_organization_members where organization_id=v_inv.organization_id and user_id=v_me;
    if v_existing_status='suspended' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
    insert into public.ms_organization_members(organization_id,user_id,role,status)
    values(v_inv.organization_id,v_me,v_inv.role,'active')
    on conflict(organization_id,user_id) do update set role=excluded.role,status='active',updated_at=now();
    update public.ms_organization_invitations set status='accepted',responded_at=now() where id=v_inv.id;
  else
    update public.ms_organization_invitations set status='declined',responded_at=now() where id=v_inv.id;
  end if;

  select * into v_org from public.ms_organizations where id=v_inv.organization_id;
  return jsonb_build_object('ok',true,'accepted',coalesce(p_accept,false),'organizationId',v_inv.organization_id::text,'organizationName',v_org.name);
end $$;

create or replace function public.ms_org_cancel_invitation(p_invitation_id uuid)
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
  select organization_id into v_org_id from public.ms_organization_invitations where id=p_invitation_id and status='pending';
  if v_org_id is null then raise exception 'INVITATION_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  update public.ms_organization_invitations set status='revoked',responded_at=now() where id=p_invitation_id;
  return true;
end $$;

create or replace function public.ms_org_rotate_join_code(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_code text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  loop
    v_code := 'MSS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    exit when not exists(select 1 from public.ms_organizations where join_code=v_code);
  end loop;
  update public.ms_organizations set join_code=v_code,updated_at=now() where id=p_org_id;
  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  return jsonb_build_object('joinCode',v_code);
end $$;

revoke all on function public.ms_org_list_members(uuid) from public;
revoke all on function public.ms_org_set_member_role(uuid,uuid,text) from public;
revoke all on function public.ms_org_set_member_status(uuid,uuid,text) from public;
revoke all on function public.ms_org_remove_member(uuid,uuid) from public;
revoke all on function public.ms_org_set_group_member(uuid,uuid,boolean) from public;
revoke all on function public.ms_org_invite_user(uuid,uuid,text) from public;
revoke all on function public.ms_org_list_invitations(uuid) from public;
revoke all on function public.ms_org_list_my_invitations() from public;
revoke all on function public.ms_org_respond_invitation(uuid,boolean) from public;
revoke all on function public.ms_org_cancel_invitation(uuid) from public;
revoke all on function public.ms_org_rotate_join_code(uuid) from public;

grant execute on function public.ms_org_list_members(uuid) to authenticated;
grant execute on function public.ms_org_set_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.ms_org_set_member_status(uuid,uuid,text) to authenticated;
grant execute on function public.ms_org_remove_member(uuid,uuid) to authenticated;
grant execute on function public.ms_org_set_group_member(uuid,uuid,boolean) to authenticated;
grant execute on function public.ms_org_invite_user(uuid,uuid,text) to authenticated;
grant execute on function public.ms_org_list_invitations(uuid) to authenticated;
grant execute on function public.ms_org_list_my_invitations() to authenticated;
grant execute on function public.ms_org_respond_invitation(uuid,boolean) to authenticated;
grant execute on function public.ms_org_cancel_invitation(uuid) to authenticated;
grant execute on function public.ms_org_rotate_join_code(uuid) to authenticated;

commit;
