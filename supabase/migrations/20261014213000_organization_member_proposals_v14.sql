-- MULTISPORTS SCORING — ORGANISATIONS V14
-- Stabilisation du double flux Invitation admin / Proposition membre.
-- Empêche les demandes parallèles pour une même personne et nettoie
-- automatiquement l'autre flux lorsqu'une adhésion devient effective.

begin;

create or replace function public.ms_org_finalize_member_proposal(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_prop public.ms_organization_member_proposals%rowtype;
begin
  select *
  into v_prop
  from public.ms_organization_member_proposals
  where id=p_proposal_id
  for update;

  if v_prop.id is null or v_prop.status<>'pending' then
    return false;
  end if;

  if v_prop.admin_status<>'approved' then
    return false;
  end if;

  if v_prop.target_status not in ('approved','not_required') then
    return false;
  end if;

  if v_prop.target_type='user' then
    if exists(
      select 1
      from public.ms_organization_members
      where organization_id=v_prop.organization_id
        and user_id=v_prop.target_user_id
        and status='suspended'
    ) then
      raise exception 'MEMBERSHIP_SUSPENDED';
    end if;

    insert into public.ms_organization_members(
      organization_id,
      user_id,
      role,
      status
    )
    values(
      v_prop.organization_id,
      v_prop.target_user_id,
      v_prop.role,
      'active'
    )
    on conflict(organization_id,user_id)
    do update set
      role=excluded.role,
      status='active',
      updated_at=now();

    -- Une proposition validée devient l'unique source d'adhésion.
    -- Toute invitation directe encore en attente pour ce même utilisateur
    -- est révoquée afin d'éviter un second parcours concurrent.
    update public.ms_organization_invitations
    set
      status='revoked',
      responded_at=now()
    where organization_id=v_prop.organization_id
      and invited_user_id=v_prop.target_user_id
      and status='pending';
  else
    insert into public.ms_organization_local_members(
      organization_id,
      owner_user_id,
      local_profile_id,
      display_name,
      avatar_url,
      country_code,
      role,
      status
    )
    values(
      v_prop.organization_id,
      v_prop.proposer_user_id,
      v_prop.local_profile_id,
      coalesce(nullif(trim(v_prop.local_profile_name),''),'Profil local'),
      coalesce(v_prop.local_profile_avatar_url,''),
      upper(left(coalesce(v_prop.local_profile_country_code,''),2)),
      v_prop.role,
      'active'
    )
    on conflict(organization_id,owner_user_id,local_profile_id)
    do update set
      display_name=excluded.display_name,
      avatar_url=excluded.avatar_url,
      country_code=excluded.country_code,
      role=excluded.role,
      status='active',
      updated_at=now();
  end if;

  update public.ms_organization_member_proposals
  set
    status='accepted',
    updated_at=now()
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
  if v_me is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select role
  into v_actor_role
  from public.ms_organization_members
  where organization_id=p_org_id
    and user_id=v_me
    and status='active';

  if v_actor_role is null then
    raise exception 'FORBIDDEN';
  end if;

  if p_role not in ('captain','member','guest') then
    raise exception 'INVALID_ROLE';
  end if;

  if p_target_user_id is not null then
    v_type:='user';

    if p_target_user_id=v_me then
      raise exception 'INVALID_USER';
    end if;

    if not exists(
      select 1
      from auth.users
      where id=p_target_user_id
    ) then
      raise exception 'USER_NOT_FOUND';
    end if;

    if exists(
      select 1
      from public.ms_organization_members
      where organization_id=p_org_id
        and user_id=p_target_user_id
        and status='active'
    ) then
      raise exception 'ALREADY_MEMBER';
    end if;

    -- Ne jamais ouvrir une proposition si une invitation administrative
    -- existe déjà pour cette même organisation/personne.
    if exists(
      select 1
      from public.ms_organization_invitations
      where organization_id=p_org_id
        and invited_user_id=p_target_user_id
        and status='pending'
    ) then
      raise exception 'INVITATION_ALREADY_PENDING';
    end if;

    if v_me::text < p_target_user_id::text then
      v_a:=v_me;
      v_b:=p_target_user_id;
    else
      v_a:=p_target_user_id;
      v_b:=v_me;
    end if;

    if not exists(
      select 1
      from public.ms_friendships
      where user_a_id=v_a
        and user_b_id=v_b
    ) then
      raise exception 'FRIEND_REQUIRED';
    end if;

    if exists(
      select 1
      from public.ms_organization_member_proposals
      where organization_id=p_org_id
        and target_type='user'
        and target_user_id=p_target_user_id
        and status='pending'
    ) then
      raise exception 'PROPOSAL_ALREADY_PENDING';
    end if;
  else
    v_type:='local_profile';
    v_target_status:='not_required';

    if nullif(trim(coalesce(p_local_profile_id,'')),'') is null then
      raise exception 'LOCAL_PROFILE_REQUIRED';
    end if;

    if nullif(trim(coalesce(p_local_profile_name,'')),'') is null then
      raise exception 'LOCAL_PROFILE_NAME_REQUIRED';
    end if;

    if not exists(
      select 1
      from public.account_sync_documents d,
      lateral jsonb_array_elements(
        case
          when jsonb_typeof(d.payload)='array' then d.payload
          else '[]'::jsonb
        end
      ) profile
      where d.owner_user_id=v_me
        and d.document_type='local_profiles'
        and d.document_id='default'
        and d.deleted_at is null
        and trim(coalesce(profile->>'id',''))=trim(p_local_profile_id)
    ) then
      raise exception 'LOCAL_PROFILE_NOT_OWNED';
    end if;

    if exists(
      select 1
      from public.ms_organization_local_members
      where organization_id=p_org_id
        and owner_user_id=v_me
        and local_profile_id=trim(p_local_profile_id)
        and status='active'
    ) then
      raise exception 'ALREADY_MEMBER';
    end if;

    if exists(
      select 1
      from public.ms_organization_member_proposals
      where organization_id=p_org_id
        and target_type='local_profile'
        and proposer_user_id=v_me
        and local_profile_id=trim(p_local_profile_id)
        and status='pending'
    ) then
      raise exception 'PROPOSAL_ALREADY_PENDING';
    end if;
  end if;

  if v_actor_role='owner' then
    v_admin_status:='approved';
  end if;

  insert into public.ms_organization_member_proposals(
    organization_id,
    proposer_user_id,
    target_type,
    target_user_id,
    local_profile_id,
    local_profile_name,
    local_profile_avatar_url,
    local_profile_country_code,
    role,
    admin_status,
    target_status,
    status,
    admin_reviewed_by,
    admin_reviewed_at
  )
  values(
    p_org_id,
    v_me,
    v_type,
    p_target_user_id,
    case when v_type='local_profile' then trim(p_local_profile_id) else null end,
    case when v_type='local_profile' then trim(p_local_profile_name) else null end,
    case when v_type='local_profile' then coalesce(p_local_profile_avatar_url,'') else '' end,
    case when v_type='local_profile' then upper(left(coalesce(p_local_profile_country_code,''),2)) else '' end,
    p_role,
    v_admin_status,
    v_target_status,
    'pending',
    case when v_admin_status='approved' then v_me else null end,
    case when v_admin_status='approved' then now() else null end
  )
  returning *
  into v_prop;

  perform public.ms_org_finalize_member_proposal(v_prop.id);

  select *
  into v_prop
  from public.ms_organization_member_proposals
  where id=v_prop.id;

  return jsonb_build_object(
    'id',v_prop.id::text,
    'organizationId',v_prop.organization_id::text,
    'proposerUserId',v_prop.proposer_user_id::text,
    'targetType',v_prop.target_type,
    'targetUserId',coalesce(v_prop.target_user_id::text,''),
    'localProfileId',coalesce(v_prop.local_profile_id,''),
    'localProfileName',coalesce(v_prop.local_profile_name,''),
    'localProfileAvatarUrl',coalesce(v_prop.local_profile_avatar_url,''),
    'localProfileCountryCode',coalesce(v_prop.local_profile_country_code,''),
    'role',v_prop.role,
    'adminStatus',v_prop.admin_status,
    'targetStatus',v_prop.target_status,
    'status',v_prop.status,
    'createdAt',v_prop.created_at,
    'updatedAt',v_prop.updated_at
  );
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

  -- Une proposition initiée par un membre est déjà un parcours d'adhésion.
  -- L'administration ne doit pas pouvoir créer en parallèle une invitation
  -- directe qui contournerait/dupliquerait cette proposition.
  if exists(
    select 1
    from public.ms_organization_member_proposals
    where organization_id=p_org_id
      and target_type='user'
      and target_user_id=p_user_id
      and status='pending'
  ) then
    raise exception 'PROPOSAL_ALREADY_PENDING';
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

    -- L'adhésion est désormais acquise via l'invitation directe : toute
    -- proposition encore en attente visant la même personne est annulée.
    update public.ms_organization_member_proposals
    set
      status='cancelled',
      updated_at=now()
    where organization_id=v_inv.organization_id
      and target_type='user'
      and target_user_id=v_me
      and status='pending';
  else
    update public.ms_organization_invitations set status='declined',responded_at=now() where id=v_inv.id;
  end if;

  select * into v_org from public.ms_organizations where id=v_inv.organization_id;
  return jsonb_build_object('ok',true,'accepted',coalesce(p_accept,false),'organizationId',v_inv.organization_id::text,'organizationName',v_org.name);
end $$;

revoke all on function public.ms_org_finalize_member_proposal(uuid) from public;
revoke all on function public.ms_org_propose_member(uuid,uuid,text,text,text,text,text) from public;
revoke all on function public.ms_org_invite_user(uuid,uuid,text) from public;
revoke all on function public.ms_org_respond_invitation(uuid,boolean) from public;

grant execute on function public.ms_org_propose_member(uuid,uuid,text,text,text,text,text) to authenticated;
grant execute on function public.ms_org_invite_user(uuid,uuid,text) to authenticated;
grant execute on function public.ms_org_respond_invitation(uuid,boolean) to authenticated;

commit;
