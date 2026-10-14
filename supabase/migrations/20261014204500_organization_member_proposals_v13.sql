-- MULTISPORTS SCORING — ORGANISATIONS V13
-- Propositions d'adhésion par les membres : ami MSS (double validation propriétaire + ami)
-- ou profil local appartenant au compte du proposant (validation propriétaire).
-- Les profils locaux restent des identités distinctes et ne sont jamais fusionnés avec le compte propriétaire.

begin;

create table if not exists public.ms_organization_local_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  local_profile_id text not null,
  display_name text not null,
  avatar_url text not null default '',
  country_code text not null default '',
  role text not null default 'member' check (role in ('captain','member','guest')),
  status text not null default 'active' check (status in ('active','suspended')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, owner_user_id, local_profile_id)
);

create table if not exists public.ms_organization_local_group_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  group_id uuid not null references public.ms_organization_groups(id) on delete cascade,
  local_member_id uuid not null references public.ms_organization_local_members(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(group_id, local_member_id)
);

create table if not exists public.ms_organization_member_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  proposer_user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('user','local_profile')),
  target_user_id uuid references auth.users(id) on delete cascade,
  local_profile_id text,
  local_profile_name text,
  local_profile_avatar_url text not null default '',
  local_profile_country_code text not null default '',
  role text not null default 'member' check (role in ('captain','member','guest')),
  admin_status text not null default 'pending' check (admin_status in ('pending','approved','declined')),
  target_status text not null default 'pending' check (target_status in ('pending','approved','declined','not_required')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  admin_reviewed_by uuid references auth.users(id) on delete set null,
  admin_reviewed_at timestamptz,
  target_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type='user' and target_user_id is not null and local_profile_id is null)
    or
    (target_type='local_profile' and target_user_id is null and local_profile_id is not null and local_profile_name is not null)
  )
);

create unique index if not exists ms_org_member_proposal_user_pending_uq
  on public.ms_organization_member_proposals(organization_id,target_user_id)
  where target_type='user' and status='pending';
create unique index if not exists ms_org_member_proposal_local_pending_uq
  on public.ms_organization_member_proposals(organization_id,proposer_user_id,local_profile_id)
  where target_type='local_profile' and status='pending';
create index if not exists ms_org_member_proposal_org_idx
  on public.ms_organization_member_proposals(organization_id,status,created_at desc);
create index if not exists ms_org_member_proposal_target_idx
  on public.ms_organization_member_proposals(target_user_id,status,created_at desc);

alter table public.ms_organization_local_members enable row level security;
alter table public.ms_organization_local_group_members enable row level security;
alter table public.ms_organization_member_proposals enable row level security;

-- Lecture de l'effectif local réservée aux membres de l'organisation.
drop policy if exists ms_org_local_members_select on public.ms_organization_local_members;
create policy ms_org_local_members_select on public.ms_organization_local_members
for select to authenticated using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_local_group_members_select on public.ms_organization_local_group_members;
create policy ms_org_local_group_members_select on public.ms_organization_local_group_members
for select to authenticated using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_member_proposals_select on public.ms_organization_member_proposals;
create policy ms_org_member_proposals_select on public.ms_organization_member_proposals
for select to authenticated using (
  proposer_user_id=auth.uid()
  or target_user_id=auth.uid()
  or exists (
    select 1 from public.ms_organization_members m
    where m.organization_id=ms_organization_member_proposals.organization_id
      and m.user_id=auth.uid() and m.status='active' and m.role='owner'
  )
);

revoke insert,update,delete on public.ms_organization_local_members from authenticated;
revoke insert,update,delete on public.ms_organization_local_group_members from authenticated;
revoke insert,update,delete on public.ms_organization_member_proposals from authenticated;
grant select on public.ms_organization_local_members to authenticated;
grant select on public.ms_organization_local_group_members to authenticated;
grant select on public.ms_organization_member_proposals to authenticated;

-- Finalise une proposition uniquement lorsque toutes les validations requises sont acquises.
create or replace function public.ms_org_finalize_member_proposal(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_prop public.ms_organization_member_proposals%rowtype;
begin
  select * into v_prop from public.ms_organization_member_proposals where id=p_proposal_id for update;
  if v_prop.id is null or v_prop.status<>'pending' then return false; end if;
  if v_prop.admin_status<>'approved' then return false; end if;
  if v_prop.target_status not in ('approved','not_required') then return false; end if;

  if v_prop.target_type='user' then
    if exists(select 1 from public.ms_organization_members where organization_id=v_prop.organization_id and user_id=v_prop.target_user_id and status='suspended') then
      raise exception 'MEMBERSHIP_SUSPENDED';
    end if;
    insert into public.ms_organization_members(organization_id,user_id,role,status)
    values(v_prop.organization_id,v_prop.target_user_id,v_prop.role,'active')
    on conflict(organization_id,user_id) do update set role=excluded.role,status='active',updated_at=now();
  else
    insert into public.ms_organization_local_members(
      organization_id,owner_user_id,local_profile_id,display_name,avatar_url,country_code,role,status
    ) values(
      v_prop.organization_id,v_prop.proposer_user_id,v_prop.local_profile_id,
      coalesce(nullif(trim(v_prop.local_profile_name),''),'Profil local'),
      coalesce(v_prop.local_profile_avatar_url,''),upper(left(coalesce(v_prop.local_profile_country_code,''),2)),v_prop.role,'active'
    )
    on conflict(organization_id,owner_user_id,local_profile_id) do update set
      display_name=excluded.display_name,avatar_url=excluded.avatar_url,country_code=excluded.country_code,
      role=excluded.role,status='active',updated_at=now();
  end if;

  update public.ms_organization_member_proposals
  set status='accepted',updated_at=now()
  where id=v_prop.id;
  return true;
end $$;

create or replace function public.ms_org_propose_member(
  p_org_id uuid,
  p_target_user_id uuid default null,
  p_local_profile_id text default null,
  p_local_profile_name text default null,
  p_local_profile_avatar_url text default '',
  p_local_profile_country_code text default '',
  p_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_actor_role text;
  v_type text;
  v_admin_status text:='pending';
  v_target_status text:='pending';
  v_prop public.ms_organization_member_proposals%rowtype;
  v_a uuid;
  v_b uuid;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_actor_role from public.ms_organization_members
  where organization_id=p_org_id and user_id=v_me and status='active';
  if v_actor_role is null then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('captain','member','guest') then raise exception 'INVALID_ROLE'; end if;

  if p_target_user_id is not null then
    v_type:='user';
    if p_target_user_id=v_me then raise exception 'INVALID_USER'; end if;
    if not exists(select 1 from auth.users where id=p_target_user_id) then raise exception 'USER_NOT_FOUND'; end if;
    if exists(select 1 from public.ms_organization_members where organization_id=p_org_id and user_id=p_target_user_id and status='active') then raise exception 'ALREADY_MEMBER'; end if;
    if v_me::text < p_target_user_id::text then v_a:=v_me; v_b:=p_target_user_id; else v_a:=p_target_user_id; v_b:=v_me; end if;
    if not exists(select 1 from public.ms_friendships where user_a_id=v_a and user_b_id=v_b) then raise exception 'FRIEND_REQUIRED'; end if;
    if exists(select 1 from public.ms_organization_member_proposals where organization_id=p_org_id and target_type='user' and target_user_id=p_target_user_id and status='pending') then raise exception 'PROPOSAL_ALREADY_PENDING'; end if;
  else
    v_type:='local_profile';
    v_target_status:='not_required';
    if nullif(trim(coalesce(p_local_profile_id,'')),'') is null then raise exception 'LOCAL_PROFILE_REQUIRED'; end if;
    if nullif(trim(coalesce(p_local_profile_name,'')),'') is null then raise exception 'LOCAL_PROFILE_NAME_REQUIRED'; end if;
    if not exists(
      select 1
      from public.account_sync_documents d, lateral jsonb_array_elements(
        case when jsonb_typeof(d.payload)='array' then d.payload else '[]'::jsonb end
      ) profile
      where d.owner_user_id=v_me and d.document_type='local_profiles' and d.document_id='default' and d.deleted_at is null
        and trim(coalesce(profile->>'id',''))=trim(p_local_profile_id)
    ) then raise exception 'LOCAL_PROFILE_NOT_OWNED'; end if;
    if exists(select 1 from public.ms_organization_local_members where organization_id=p_org_id and owner_user_id=v_me and local_profile_id=trim(p_local_profile_id) and status='active') then raise exception 'ALREADY_MEMBER'; end if;
    if exists(select 1 from public.ms_organization_member_proposals where organization_id=p_org_id and target_type='local_profile' and proposer_user_id=v_me and local_profile_id=trim(p_local_profile_id) and status='pending') then raise exception 'PROPOSAL_ALREADY_PENDING'; end if;
  end if;

  -- Le créateur/propriétaire valide implicitement la partie administrative de sa propre proposition.
  if v_actor_role='owner' then v_admin_status:='approved'; end if;

  insert into public.ms_organization_member_proposals(
    organization_id,proposer_user_id,target_type,target_user_id,
    local_profile_id,local_profile_name,local_profile_avatar_url,local_profile_country_code,
    role,admin_status,target_status,status,admin_reviewed_by,admin_reviewed_at
  ) values(
    p_org_id,v_me,v_type,p_target_user_id,
    case when v_type='local_profile' then trim(p_local_profile_id) else null end,
    case when v_type='local_profile' then trim(p_local_profile_name) else null end,
    case when v_type='local_profile' then coalesce(p_local_profile_avatar_url,'') else '' end,
    case when v_type='local_profile' then upper(left(coalesce(p_local_profile_country_code,''),2)) else '' end,
    p_role,v_admin_status,v_target_status,'pending',
    case when v_admin_status='approved' then v_me else null end,
    case when v_admin_status='approved' then now() else null end
  ) returning * into v_prop;

  perform public.ms_org_finalize_member_proposal(v_prop.id);
  select * into v_prop from public.ms_organization_member_proposals where id=v_prop.id;

  return jsonb_build_object(
    'id',v_prop.id::text,'organizationId',v_prop.organization_id::text,'proposerUserId',v_prop.proposer_user_id::text,
    'targetType',v_prop.target_type,'targetUserId',coalesce(v_prop.target_user_id::text,''),
    'localProfileId',coalesce(v_prop.local_profile_id,''),'localProfileName',coalesce(v_prop.local_profile_name,''),
    'localProfileAvatarUrl',coalesce(v_prop.local_profile_avatar_url,''),'localProfileCountryCode',coalesce(v_prop.local_profile_country_code,''),
    'role',v_prop.role,'adminStatus',v_prop.admin_status,'targetStatus',v_prop.target_status,'status',v_prop.status,
    'createdAt',v_prop.created_at,'updatedAt',v_prop.updated_at
  );
end $$;

create or replace function public.ms_org_review_member_proposal(p_proposal_id uuid,p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_prop public.ms_organization_member_proposals%rowtype;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_prop from public.ms_organization_member_proposals where id=p_proposal_id and status='pending' for update;
  if v_prop.id is null then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  if not exists(select 1 from public.ms_organization_members where organization_id=v_prop.organization_id and user_id=v_me and role='owner' and status='active') then raise exception 'OWNER_APPROVAL_REQUIRED'; end if;

  update public.ms_organization_member_proposals set
    admin_status=case when coalesce(p_approve,false) then 'approved' else 'declined' end,
    status=case when coalesce(p_approve,false) then status else 'declined' end,
    admin_reviewed_by=v_me,admin_reviewed_at=now(),updated_at=now()
  where id=v_prop.id;

  if coalesce(p_approve,false) then perform public.ms_org_finalize_member_proposal(v_prop.id); end if;
  select * into v_prop from public.ms_organization_member_proposals where id=v_prop.id;
  return jsonb_build_object('id',v_prop.id::text,'status',v_prop.status,'adminStatus',v_prop.admin_status,'targetStatus',v_prop.target_status);
end $$;

create or replace function public.ms_org_respond_member_proposal(p_proposal_id uuid,p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_prop public.ms_organization_member_proposals%rowtype;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_prop from public.ms_organization_member_proposals
  where id=p_proposal_id and target_type='user' and target_user_id=v_me and status='pending' for update;
  if v_prop.id is null then raise exception 'PROPOSAL_NOT_FOUND'; end if;

  update public.ms_organization_member_proposals set
    target_status=case when coalesce(p_accept,false) then 'approved' else 'declined' end,
    status=case when coalesce(p_accept,false) then status else 'declined' end,
    target_responded_at=now(),updated_at=now()
  where id=v_prop.id;

  if coalesce(p_accept,false) then perform public.ms_org_finalize_member_proposal(v_prop.id); end if;
  select * into v_prop from public.ms_organization_member_proposals where id=v_prop.id;
  return jsonb_build_object('id',v_prop.id::text,'status',v_prop.status,'adminStatus',v_prop.admin_status,'targetStatus',v_prop.target_status);
end $$;

create or replace function public.ms_org_cancel_member_proposal(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_prop public.ms_organization_member_proposals%rowtype;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_prop from public.ms_organization_member_proposals where id=p_proposal_id and status='pending' for update;
  if v_prop.id is null then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  if v_prop.proposer_user_id<>v_me and not exists(
    select 1 from public.ms_organization_members where organization_id=v_prop.organization_id and user_id=v_me and role='owner' and status='active'
  ) then raise exception 'FORBIDDEN'; end if;
  update public.ms_organization_member_proposals set status='cancelled',updated_at=now() where id=v_prop.id;
  return true;
end $$;

create or replace function public.ms_org_list_member_proposals(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',p.id::text,'organizationId',p.organization_id::text,'organizationName',o.name,'organizationKind',o.kind,
    'proposerUserId',p.proposer_user_id::text,'proposerDisplayName',coalesce(pp.display_name,'Membre MSS'),
    'targetType',p.target_type,'targetUserId',coalesce(p.target_user_id::text,''),
    'targetDisplayName',case when p.target_type='user' then coalesce(tp.display_name,'Joueur MSS') else coalesce(p.local_profile_name,'Profil local') end,
    'targetAvatarUrl',case when p.target_type='user' then coalesce(tp.avatar_url,'') else coalesce(p.local_profile_avatar_url,'') end,
    'targetCountryCode',case when p.target_type='user' then coalesce(tp.country_code,'') else coalesce(p.local_profile_country_code,'') end,
    'localProfileId',coalesce(p.local_profile_id,''),'role',p.role,'adminStatus',p.admin_status,'targetStatus',p.target_status,'status',p.status,
    'createdAt',p.created_at,'updatedAt',p.updated_at
  )
  from public.ms_organization_member_proposals p
  join public.ms_organizations o on o.id=p.organization_id
  left join public.ms_public_profiles pp on pp.user_id=p.proposer_user_id
  left join public.ms_public_profiles tp on tp.user_id=p.target_user_id
  where p.organization_id=p_org_id and p.status='pending'
    and exists(select 1 from public.ms_organization_members m where m.organization_id=p_org_id and m.user_id=auth.uid() and m.status='active')
    and (
      p.proposer_user_id=auth.uid()
      or exists(select 1 from public.ms_organization_members m where m.organization_id=p_org_id and m.user_id=auth.uid() and m.status='active' and m.role='owner')
    )
  order by p.created_at desc;
$$;

create or replace function public.ms_org_list_my_member_proposals()
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',p.id::text,'organizationId',p.organization_id::text,'organizationName',o.name,'organizationKind',o.kind,
    'proposerUserId',p.proposer_user_id::text,'proposerDisplayName',coalesce(pp.display_name,'Un ami'),
    'targetType',p.target_type,'targetUserId',coalesce(p.target_user_id::text,''),
    'targetDisplayName',coalesce(tp.display_name,'Joueur MSS'),'targetAvatarUrl',coalesce(tp.avatar_url,''),'targetCountryCode',coalesce(tp.country_code,''),
    'localProfileId','','role',p.role,'adminStatus',p.admin_status,'targetStatus',p.target_status,'status',p.status,
    'createdAt',p.created_at,'updatedAt',p.updated_at
  )
  from public.ms_organization_member_proposals p
  join public.ms_organizations o on o.id=p.organization_id
  left join public.ms_public_profiles pp on pp.user_id=p.proposer_user_id
  left join public.ms_public_profiles tp on tp.user_id=p.target_user_id
  where auth.uid() is not null and p.target_type='user' and p.target_user_id=auth.uid() and p.status='pending' and p.target_status='pending'
  order by p.created_at desc;
$$;

-- L'effectif standard inclut désormais les comptes MSS ET les profils locaux validés.
create or replace function public.ms_org_list_members(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select row_data from (
    select 0 as entity_order,
      case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 when 'captain' then 3 when 'member' then 4 else 5 end as role_order,
      coalesce(p.display_name,'Joueur MSS') as sort_name,
      jsonb_build_object(
        'membershipId',m.id::text,'organizationId',m.organization_id::text,'userId',m.user_id::text,
        'entityType','user','ownerUserId',m.user_id::text,'localProfileId','',
        'displayName',coalesce(nullif(trim(p.display_name),''),'Joueur MSS'),'avatarUrl',coalesce(p.avatar_url,''),'countryCode',coalesce(p.country_code,''),
        'role',m.role,'status',m.status,'joinedAt',m.joined_at,'updatedAt',m.updated_at,
        'groupIds',coalesce((select jsonb_agg(gm.group_id::text order by gm.created_at) from public.ms_organization_group_members gm where gm.organization_id=m.organization_id and gm.user_id=m.user_id),'[]'::jsonb)
      ) as row_data
    from public.ms_organization_members m
    left join public.ms_public_profiles p on p.user_id=m.user_id
    where auth.uid() is not null and public.ms_org_is_member(p_org_id) and m.organization_id=p_org_id

    union all

    select 1 as entity_order,
      case lm.role when 'captain' then 3 when 'member' then 4 else 5 end as role_order,
      lm.display_name as sort_name,
      jsonb_build_object(
        'membershipId',lm.id::text,'organizationId',lm.organization_id::text,'userId','local:'||lm.id::text,
        'entityType','local_profile','ownerUserId',lm.owner_user_id::text,'localProfileId',lm.local_profile_id,
        'displayName',lm.display_name,'avatarUrl',coalesce(lm.avatar_url,''),'countryCode',coalesce(lm.country_code,''),
        'role',lm.role,'status',lm.status,'joinedAt',lm.joined_at,'updatedAt',lm.updated_at,
        'groupIds',coalesce((select jsonb_agg(gm.group_id::text order by gm.created_at) from public.ms_organization_local_group_members gm where gm.organization_id=lm.organization_id and gm.local_member_id=lm.id),'[]'::jsonb)
      ) as row_data
    from public.ms_organization_local_members lm
    where auth.uid() is not null and public.ms_org_is_member(p_org_id) and lm.organization_id=p_org_id
  ) q
  order by entity_order,role_order,sort_name;
$$;

create or replace function public.ms_org_set_local_member_role(p_org_id uuid,p_local_member_id uuid,p_role text)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_role not in ('captain','member','guest') then raise exception 'INVALID_ROLE'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  update public.ms_organization_local_members set role=p_role,updated_at=now() where id=p_local_member_id and organization_id=p_org_id;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  return true;
end $$;

create or replace function public.ms_org_set_local_member_status(p_org_id uuid,p_local_member_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_status not in ('active','suspended') then raise exception 'INVALID_STATUS'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  update public.ms_organization_local_members set status=p_status,updated_at=now() where id=p_local_member_id and organization_id=p_org_id;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  if p_status='suspended' then delete from public.ms_organization_local_group_members where organization_id=p_org_id and local_member_id=p_local_member_id; end if;
  return true;
end $$;

create or replace function public.ms_org_remove_local_member(p_org_id uuid,p_local_member_id uuid)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_local_members where id=p_local_member_id and organization_id=p_org_id;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  return true;
end $$;

create or replace function public.ms_org_set_local_group_member(p_group_id uuid,p_local_member_id uuid,p_assigned boolean)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_org_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_groups where id=p_group_id;
  if v_org_id is null then raise exception 'GROUP_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.ms_organization_local_members where id=p_local_member_id and organization_id=v_org_id and status='active') then raise exception 'MEMBER_NOT_FOUND'; end if;
  if coalesce(p_assigned,false) then
    insert into public.ms_organization_local_group_members(organization_id,group_id,local_member_id,assigned_by)
    values(v_org_id,p_group_id,p_local_member_id,auth.uid())
    on conflict(group_id,local_member_id) do update set assigned_by=excluded.assigned_by;
  else
    delete from public.ms_organization_local_group_members where group_id=p_group_id and local_member_id=p_local_member_id;
  end if;
  return true;
end $$;

revoke all on function public.ms_org_finalize_member_proposal(uuid) from public;
revoke all on function public.ms_org_propose_member(uuid,uuid,text,text,text,text,text) from public;
revoke all on function public.ms_org_review_member_proposal(uuid,boolean) from public;
revoke all on function public.ms_org_respond_member_proposal(uuid,boolean) from public;
revoke all on function public.ms_org_cancel_member_proposal(uuid) from public;
revoke all on function public.ms_org_list_member_proposals(uuid) from public;
revoke all on function public.ms_org_list_my_member_proposals() from public;
revoke all on function public.ms_org_set_local_member_role(uuid,uuid,text) from public;
revoke all on function public.ms_org_set_local_member_status(uuid,uuid,text) from public;
revoke all on function public.ms_org_remove_local_member(uuid,uuid) from public;
revoke all on function public.ms_org_set_local_group_member(uuid,uuid,boolean) from public;

-- finalize est interne seulement; les autres RPC sont exposées aux comptes connectés.
grant execute on function public.ms_org_propose_member(uuid,uuid,text,text,text,text,text) to authenticated;
grant execute on function public.ms_org_review_member_proposal(uuid,boolean) to authenticated;
grant execute on function public.ms_org_respond_member_proposal(uuid,boolean) to authenticated;
grant execute on function public.ms_org_cancel_member_proposal(uuid) to authenticated;
grant execute on function public.ms_org_list_member_proposals(uuid) to authenticated;
grant execute on function public.ms_org_list_my_member_proposals() to authenticated;
grant execute on function public.ms_org_set_local_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.ms_org_set_local_member_status(uuid,uuid,text) to authenticated;
grant execute on function public.ms_org_remove_local_member(uuid,uuid) to authenticated;
grant execute on function public.ms_org_set_local_group_member(uuid,uuid,boolean) to authenticated;

commit;
