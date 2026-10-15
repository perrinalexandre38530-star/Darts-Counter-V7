-- MULTISPORTS SCORING — ORGANISATIONS V15
-- Cycle de vie adhésion : départ volontaire d'un membre et retrait par son propriétaire d'un profil local.

begin;

create or replace function public.ms_org_leave_self(p_org_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_role text;
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select role into v_role
  from public.ms_organization_members
  where organization_id=p_org_id
    and user_id=v_me;

  if v_role is null then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  if v_role='owner' then
    raise exception 'OWNER_MUST_TRANSFER';
  end if;

  -- Une proposition créée par un membre qui quitte l'organisation ne doit plus
  -- pouvoir être validée ultérieurement comme si son proposant était encore membre.
  update public.ms_organization_member_proposals
  set status='cancelled', updated_at=now()
  where organization_id=p_org_id
    and proposer_user_id=v_me
    and status='pending';

  delete from public.ms_organization_group_members
  where organization_id=p_org_id
    and user_id=v_me;

  delete from public.ms_organization_invitations
  where organization_id=p_org_id
    and invited_user_id=v_me
    and status='pending';

  delete from public.ms_organization_members
  where organization_id=p_org_id
    and user_id=v_me;

  return true;
end $$;

create or replace function public.ms_org_withdraw_local_member(
  p_org_id uuid,
  p_local_member_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_owner uuid;
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select owner_user_id into v_owner
  from public.ms_organization_local_members
  where id=p_local_member_id
    and organization_id=p_org_id;

  if v_owner is null then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  if v_owner<>v_me then
    raise exception 'FORBIDDEN';
  end if;

  -- Les affectations aux groupes sont supprimées par la FK ON DELETE CASCADE.
  delete from public.ms_organization_local_members
  where id=p_local_member_id
    and organization_id=p_org_id
    and owner_user_id=v_me;

  return true;
end $$;

revoke all on function public.ms_org_leave_self(uuid) from public;
revoke all on function public.ms_org_withdraw_local_member(uuid,uuid) from public;

grant execute on function public.ms_org_leave_self(uuid) to authenticated;
grant execute on function public.ms_org_withdraw_local_member(uuid,uuid) to authenticated;

commit;
