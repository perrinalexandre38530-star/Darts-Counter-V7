-- MULTISPORTS SCORING — ORGANISATIONS V17
-- Intégrité Membres ↔ Teams : un capitaine de Team doit rester un compte MSS actif.
-- Si un capitaine est suspendu, retiré ou quitte l'organisation, la Team est
-- automatiquement libérée de cette référence afin d'éviter un capitaine fantôme.

begin;

create or replace function public.ms_org_clear_inactive_team_captain()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if tg_op='DELETE' then
    update public.ms_organization_groups
    set captain_user_id=null,
        updated_at=now()
    where organization_id=old.organization_id
      and captain_user_id=old.user_id;
    return old;
  end if;

  if new.status<>'active' then
    update public.ms_organization_groups
    set captain_user_id=null,
        updated_at=now()
    where organization_id=new.organization_id
      and captain_user_id=new.user_id;
  end if;

  return new;
end $$;

drop trigger if exists ms_org_member_captain_integrity_trg
  on public.ms_organization_members;

create trigger ms_org_member_captain_integrity_trg
after update of status or delete
on public.ms_organization_members
for each row
execute function public.ms_org_clear_inactive_team_captain();

-- Nettoyage ponctuel des données déjà incohérentes :
-- si un capitaine enregistré n'est plus un membre actif de l'organisation,
-- on retire seulement son rôle de capitaine de la Team. Aucun membre n'est supprimé.
update public.ms_organization_groups g
set captain_user_id=null,
    updated_at=now()
where g.captain_user_id is not null
  and not exists (
    select 1
    from public.ms_organization_members m
    where m.organization_id=g.organization_id
      and m.user_id=g.captain_user_id
      and m.status='active'
  );

revoke all on function public.ms_org_clear_inactive_team_captain() from public;

commit;
