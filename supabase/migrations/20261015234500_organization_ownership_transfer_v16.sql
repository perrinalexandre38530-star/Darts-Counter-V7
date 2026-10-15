-- MULTISPORTS SCORING — ORGANISATIONS V16
-- Transfert sécurisé de propriété vers un autre membre MSS actif.

begin;

create or replace function public.ms_org_transfer_ownership(
  p_org_id uuid,
  p_target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_owner_id uuid;
  v_target_status text;
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_target_user_id is null or p_target_user_id=v_me then
    raise exception 'OWNER_TRANSFER_SELF';
  end if;

  -- Verrouille l'organisation pendant tout le transfert afin d'éviter deux
  -- transferts concurrents et garde owner_id + rôles membres atomiques.
  select owner_id
  into v_owner_id
  from public.ms_organizations
  where id=p_org_id
  for update;

  if v_owner_id is null then
    raise exception 'ORGANIZATION_NOT_FOUND';
  end if;

  if v_owner_id<>v_me then
    raise exception 'OWNER_ONLY';
  end if;

  select status
  into v_target_status
  from public.ms_organization_members
  where organization_id=p_org_id
    and user_id=p_target_user_id
  for update;

  if v_target_status is null then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  if v_target_status<>'active' then
    raise exception 'OWNER_TRANSFER_TARGET_ACTIVE_REQUIRED';
  end if;

  -- Le propriétaire historique reste dans l'organisation en tant qu'admin.
  -- Le nouveau propriétaire devient la seule autorité owner canonique.
  update public.ms_organization_members
  set role='admin',updated_at=now()
  where organization_id=p_org_id
    and user_id=v_me;

  update public.ms_organization_members
  set role='owner',status='active',updated_at=now()
  where organization_id=p_org_id
    and user_id=p_target_user_id;

  update public.ms_organizations
  set owner_id=p_target_user_id,updated_at=now()
  where id=p_org_id;

  return true;
end $$;

revoke all on function public.ms_org_transfer_ownership(uuid,uuid) from public;
grant execute on function public.ms_org_transfer_ownership(uuid,uuid) to authenticated;

commit;
