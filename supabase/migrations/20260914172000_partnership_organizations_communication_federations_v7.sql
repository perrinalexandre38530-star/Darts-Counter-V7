-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V7
-- Communication légère + affiliations fédérales.
-- IMPORTANT :
--   * Aucun média / pièce jointe / historique sportif détaillé n'est stocké ici.
--   * Les annonces sont limitées en taille et en nombre retourné.
--   * Les identifiants/mots de passe/API secrets des fédérations ne doivent JAMAIS être stockés en base.
--     Les futurs secrets connecteurs restent côté serveur (Cloudflare Secrets).
--   * Aucun résultat fédéral complet n'est dupliqué : les exports sont générés à la demande depuis les rencontres V5.

begin;

create table if not exists public.ms_organization_announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  group_id uuid references public.ms_organization_groups(id) on delete cascade,
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_announcement_title_len check (char_length(title) between 2 and 100),
  constraint ms_org_announcement_body_len check (char_length(body) between 1 and 1200)
);

-- Un seul index, aligné avec le fil UI. Pas d'indexation excessive.
create index if not exists ms_org_announcements_feed_idx
  on public.ms_organization_announcements(organization_id,pinned desc,created_at desc);

create table if not exists public.ms_organization_federation_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  federation_name text not null,
  federation_code text not null default '',
  country_code text not null default 'FR',
  season text not null default '',
  affiliation_number text not null default '',
  external_club_id text not null default '',
  portal_url text not null default '',
  integration_mode text not null default 'manual',
  connector_key text not null default '',
  status text not null default 'pending',
  write_enabled boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_fed_name_len check (char_length(federation_name) between 2 and 100),
  constraint ms_org_fed_code_len check (char_length(federation_code) <= 32),
  constraint ms_org_fed_country_len check (char_length(country_code) between 2 and 3),
  constraint ms_org_fed_season_len check (char_length(season) <= 20),
  constraint ms_org_fed_affiliation_len check (char_length(affiliation_number) <= 64),
  constraint ms_org_fed_external_id_len check (char_length(external_club_id) <= 80),
  constraint ms_org_fed_portal_len check (char_length(portal_url) <= 300),
  constraint ms_org_fed_connector_len check (char_length(connector_key) <= 64),
  constraint ms_org_fed_mode_check check (integration_mode in ('manual','portal','api')),
  constraint ms_org_fed_status_check check (status in ('pending','active','disabled'))
);

create index if not exists ms_org_federation_links_org_idx
  on public.ms_organization_federation_links(organization_id,created_at desc);

alter table public.ms_organization_announcements enable row level security;
alter table public.ms_organization_federation_links enable row level security;

drop policy if exists ms_org_announcements_select on public.ms_organization_announcements;
create policy ms_org_announcements_select on public.ms_organization_announcements
for select to authenticated
using (
  public.ms_org_is_member(organization_id)
  and (
    group_id is null
    or public.ms_org_has_role(organization_id,array['owner','admin','manager'])
    or exists (
      select 1 from public.ms_organization_group_members gm
      where gm.group_id=ms_organization_announcements.group_id
        and gm.user_id=auth.uid()
    )
    or exists (
      select 1 from public.ms_organization_groups g
      where g.id=ms_organization_announcements.group_id
        and g.captain_user_id=auth.uid()
    )
  )
);

drop policy if exists ms_org_federation_links_select on public.ms_organization_federation_links;
create policy ms_org_federation_links_select on public.ms_organization_federation_links
for select to authenticated
using (public.ms_org_is_member(organization_id));

revoke insert,update,delete on public.ms_organization_announcements from authenticated;
revoke insert,update,delete on public.ms_organization_federation_links from authenticated;
grant select on public.ms_organization_announcements to authenticated;
grant select on public.ms_organization_federation_links to authenticated;

create or replace function public.ms_org_list_announcements(p_org_id uuid,p_group_id uuid default null)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',a.id::text,
    'organizationId',a.organization_id::text,
    'groupId',coalesce(a.group_id::text,''),
    'groupName',coalesce(g.name,''),
    'title',a.title,
    'body',a.body,
    'pinned',a.pinned,
    'expiresAt',coalesce(a.expires_at::text,''),
    'createdByUserId',a.created_by::text,
    'authorName',coalesce(nullif(trim(p.display_name),''),'Membre MSS'),
    'createdAt',a.created_at,
    'updatedAt',a.updated_at
  )
  from public.ms_organization_announcements a
  left join public.ms_organization_groups g on g.id=a.group_id
  left join public.ms_public_profiles p on p.user_id=a.created_by
  where a.organization_id=p_org_id
    and auth.uid() is not null
    and public.ms_org_is_member(p_org_id)
    and (a.expires_at is null or a.expires_at>now())
    and (p_group_id is null or a.group_id is null or a.group_id=p_group_id)
    and (
      a.group_id is null
      or public.ms_org_has_role(p_org_id,array['owner','admin','manager'])
      or exists (
        select 1 from public.ms_organization_group_members gm
        where gm.group_id=a.group_id and gm.user_id=auth.uid()
      )
      or exists (
        select 1 from public.ms_organization_groups cg
        where cg.id=a.group_id and cg.captain_user_id=auth.uid()
      )
    )
  order by a.pinned desc,a.created_at desc
  limit 80;
$$;

create or replace function public.ms_org_create_announcement(
  p_org_id uuid,
  p_group_id uuid,
  p_title text,
  p_body text,
  p_pinned boolean default false,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_can_global boolean:=false;
  v_is_captain boolean:=false;
  v_row public.ms_organization_announcements%rowtype;
  v_group_name text:='';
  v_author text:='Membre MSS';
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  v_can_global:=public.ms_org_has_role(p_org_id,array['owner','admin','manager']);
  if p_group_id is not null then
    select exists(
      select 1 from public.ms_organization_groups g
      where g.id=p_group_id and g.organization_id=p_org_id and g.captain_user_id=v_me and g.status='active'
    ) into v_is_captain;
    if not exists(select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=p_org_id) then
      raise exception 'GROUP_NOT_FOUND';
    end if;
  end if;
  if not v_can_global and not (p_group_id is not null and v_is_captain) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 100 then raise exception 'TITLE_REQUIRED'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 1200 then raise exception 'BODY_REQUIRED'; end if;

  insert into public.ms_organization_announcements(organization_id,group_id,title,body,pinned,expires_at,created_by)
  values(p_org_id,p_group_id,trim(p_title),trim(p_body),coalesce(p_pinned,false),p_expires_at,v_me)
  returning * into v_row;

  select coalesce(g.name,'') into v_group_name from public.ms_organization_groups g where g.id=v_row.group_id;
  select coalesce(nullif(trim(p.display_name),''),'Membre MSS') into v_author from public.ms_public_profiles p where p.user_id=v_me;
  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,'groupId',coalesce(v_row.group_id::text,''),
    'groupName',coalesce(v_group_name,''),'title',v_row.title,'body',v_row.body,'pinned',v_row.pinned,
    'expiresAt',coalesce(v_row.expires_at::text,''),'createdByUserId',v_row.created_by::text,
    'authorName',coalesce(v_author,'Membre MSS'),'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_update_announcement(
  p_announcement_id uuid,
  p_title text,
  p_body text,
  p_pinned boolean,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_old public.ms_organization_announcements%rowtype;
  v_row public.ms_organization_announcements%rowtype;
  v_allowed boolean:=false;
  v_group_name text:='';
  v_author text:='Membre MSS';
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_old from public.ms_organization_announcements where id=p_announcement_id;
  if not found then raise exception 'ANNOUNCEMENT_NOT_FOUND'; end if;
  v_allowed:=public.ms_org_has_role(v_old.organization_id,array['owner','admin','manager']);
  if not v_allowed and v_old.group_id is not null then
    select exists(select 1 from public.ms_organization_groups g where g.id=v_old.group_id and g.captain_user_id=v_me) into v_allowed;
  end if;
  if not v_allowed then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 100 then raise exception 'TITLE_REQUIRED'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 1200 then raise exception 'BODY_REQUIRED'; end if;
  update public.ms_organization_announcements
  set title=trim(p_title),body=trim(p_body),pinned=coalesce(p_pinned,false),expires_at=p_expires_at,updated_at=now()
  where id=p_announcement_id returning * into v_row;
  select coalesce(g.name,'') into v_group_name from public.ms_organization_groups g where g.id=v_row.group_id;
  select coalesce(nullif(trim(p.display_name),''),'Membre MSS') into v_author from public.ms_public_profiles p where p.user_id=v_row.created_by;
  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,'groupId',coalesce(v_row.group_id::text,''),
    'groupName',coalesce(v_group_name,''),'title',v_row.title,'body',v_row.body,'pinned',v_row.pinned,
    'expiresAt',coalesce(v_row.expires_at::text,''),'createdByUserId',v_row.created_by::text,
    'authorName',coalesce(v_author,'Membre MSS'),'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_delete_announcement(p_announcement_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_group_id uuid;
  v_allowed boolean:=false;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id,group_id into v_org_id,v_group_id from public.ms_organization_announcements where id=p_announcement_id;
  if v_org_id is null then return true; end if;
  v_allowed:=public.ms_org_has_role(v_org_id,array['owner','admin','manager']);
  if not v_allowed and v_group_id is not null then
    select exists(select 1 from public.ms_organization_groups g where g.id=v_group_id and g.captain_user_id=v_me) into v_allowed;
  end if;
  if not v_allowed then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_announcements where id=p_announcement_id;
  return true;
end $$;

create or replace function public.ms_org_list_federation_links(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',f.id::text,
    'organizationId',f.organization_id::text,
    'federationName',f.federation_name,
    'federationCode',f.federation_code,
    'countryCode',f.country_code,
    'season',f.season,
    'affiliationNumber',f.affiliation_number,
    'externalClubId',f.external_club_id,
    'portalUrl',f.portal_url,
    'integrationMode',f.integration_mode,
    'connectorKey',f.connector_key,
    'status',f.status,
    'writeEnabled',f.write_enabled,
    'createdAt',f.created_at,
    'updatedAt',f.updated_at
  )
  from public.ms_organization_federation_links f
  where f.organization_id=p_org_id
    and auth.uid() is not null
    and public.ms_org_is_member(p_org_id)
  order by case f.status when 'active' then 0 when 'pending' then 1 else 2 end,f.created_at desc;
$$;

create or replace function public.ms_org_upsert_federation_link(
  p_org_id uuid,
  p_link_id uuid,
  p_federation_name text,
  p_federation_code text,
  p_country_code text,
  p_season text,
  p_affiliation_number text,
  p_external_club_id text,
  p_portal_url text,
  p_integration_mode text,
  p_connector_key text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_row public.ms_organization_federation_links%rowtype;
  v_mode text:=lower(trim(coalesce(p_integration_mode,'manual')));
  v_status text:=lower(trim(coalesce(p_status,'pending')));
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_federation_name,''))) not between 2 and 100 then raise exception 'FEDERATION_NAME_REQUIRED'; end if;
  if v_mode not in ('manual','portal','api') then raise exception 'INVALID_INTEGRATION_MODE'; end if;
  if v_status not in ('pending','active','disabled') then raise exception 'INVALID_STATUS'; end if;
  if char_length(trim(coalesce(p_portal_url,'')))>300 then raise exception 'PORTAL_URL_TOO_LONG'; end if;

  if p_link_id is null then
    insert into public.ms_organization_federation_links(
      organization_id,federation_name,federation_code,country_code,season,affiliation_number,external_club_id,
      portal_url,integration_mode,connector_key,status,write_enabled,created_by
    ) values (
      p_org_id,left(trim(p_federation_name),100),left(upper(trim(coalesce(p_federation_code,''))),32),
      left(upper(trim(coalesce(p_country_code,'FR'))),3),left(trim(coalesce(p_season,'')),20),
      left(trim(coalesce(p_affiliation_number,'')),64),left(trim(coalesce(p_external_club_id,'')),80),
      left(trim(coalesce(p_portal_url,'')),300),v_mode,left(lower(trim(coalesce(p_connector_key,''))),64),v_status,false,v_me
    ) returning * into v_row;
  else
    update public.ms_organization_federation_links
    set federation_name=left(trim(p_federation_name),100),
        federation_code=left(upper(trim(coalesce(p_federation_code,''))),32),
        country_code=left(upper(trim(coalesce(p_country_code,'FR'))),3),
        season=left(trim(coalesce(p_season,'')),20),
        affiliation_number=left(trim(coalesce(p_affiliation_number,'')),64),
        external_club_id=left(trim(coalesce(p_external_club_id,'')),80),
        portal_url=left(trim(coalesce(p_portal_url,'')),300),
        integration_mode=v_mode,
        connector_key=left(lower(trim(coalesce(p_connector_key,''))),64),
        status=v_status,
        -- write_enabled est volontairement immuable depuis le client. Seul un connecteur serveur approuvé pourra l'activer.
        updated_at=now()
    where id=p_link_id and organization_id=p_org_id
    returning * into v_row;
    if not found then raise exception 'FEDERATION_LINK_NOT_FOUND'; end if;
  end if;

  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,'federationName',v_row.federation_name,
    'federationCode',v_row.federation_code,'countryCode',v_row.country_code,'season',v_row.season,
    'affiliationNumber',v_row.affiliation_number,'externalClubId',v_row.external_club_id,'portalUrl',v_row.portal_url,
    'integrationMode',v_row.integration_mode,'connectorKey',v_row.connector_key,'status',v_row.status,
    'writeEnabled',v_row.write_enabled,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_delete_federation_link(p_link_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_federation_links where id=p_link_id;
  if v_org_id is null then return true; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_federation_links where id=p_link_id;
  return true;
end $$;

revoke all on function public.ms_org_list_announcements(uuid,uuid) from public;
revoke all on function public.ms_org_create_announcement(uuid,uuid,text,text,boolean,timestamptz) from public;
revoke all on function public.ms_org_update_announcement(uuid,text,text,boolean,timestamptz) from public;
revoke all on function public.ms_org_delete_announcement(uuid) from public;
revoke all on function public.ms_org_list_federation_links(uuid) from public;
revoke all on function public.ms_org_upsert_federation_link(uuid,uuid,text,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.ms_org_delete_federation_link(uuid) from public;

grant execute on function public.ms_org_list_announcements(uuid,uuid) to authenticated;
grant execute on function public.ms_org_create_announcement(uuid,uuid,text,text,boolean,timestamptz) to authenticated;
grant execute on function public.ms_org_update_announcement(uuid,text,text,boolean,timestamptz) to authenticated;
grant execute on function public.ms_org_delete_announcement(uuid) to authenticated;
grant execute on function public.ms_org_list_federation_links(uuid) to authenticated;
grant execute on function public.ms_org_upsert_federation_link(uuid,uuid,text,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.ms_org_delete_federation_link(uuid) to authenticated;

commit;
