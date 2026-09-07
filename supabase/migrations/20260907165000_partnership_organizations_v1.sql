-- ============================================================
-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V1
-- 2026-09-07
--
-- Clubs, associations, entreprises, bars/venues, écoles,
-- collectivités, organisateurs et autres groupes.
-- Socle multi-tenant : organization_id + rôles + groupes + agenda.
-- ============================================================

create table if not exists public.ms_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 96),
  slug text not null unique,
  kind text not null default 'other' check (kind in ('club','association','company','venue','school','local_authority','organizer','other')),
  plan text not null default 'group' check (plan in ('group','club','pro','business','custom')),
  join_code text not null unique,
  city text,
  country_code text not null default 'FR',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ms_organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','manager','captain','member','guest')),
  status text not null default 'active' check (status in ('active','invited','suspended')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,user_id)
);

create table if not exists public.ms_organization_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 72),
  sport_id text not null default 'multisport',
  kind text not null default 'team' check (kind in ('team','section','department','class','group')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ms_organization_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  group_id uuid references public.ms_organization_groups(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 96),
  event_type text not null default 'event',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ms_organizations_owner_idx on public.ms_organizations(owner_id);
create index if not exists ms_organization_members_user_idx on public.ms_organization_members(user_id);
create index if not exists ms_organization_members_org_idx on public.ms_organization_members(organization_id);
create index if not exists ms_organization_groups_org_idx on public.ms_organization_groups(organization_id);
create index if not exists ms_organization_events_org_start_idx on public.ms_organization_events(organization_id,starts_at);

create or replace function public.ms_org_is_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select exists(
    select 1
    from public.ms_organization_members m
    where m.organization_id=p_organization_id
      and m.user_id=auth.uid()
      and m.status='active'
  );
$$;

create or replace function public.ms_org_has_role(p_organization_id uuid,p_roles text[])
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select exists(
    select 1
    from public.ms_organization_members m
    where m.organization_id=p_organization_id
      and m.user_id=auth.uid()
      and m.status='active'
      and m.role=any(p_roles)
  );
$$;

alter table public.ms_organizations enable row level security;
alter table public.ms_organization_members enable row level security;
alter table public.ms_organization_groups enable row level security;
alter table public.ms_organization_events enable row level security;

drop policy if exists ms_org_select_member on public.ms_organizations;
create policy ms_org_select_member on public.ms_organizations
for select to authenticated
using (public.ms_org_is_member(id));

drop policy if exists ms_org_update_admin on public.ms_organizations;
create policy ms_org_update_admin on public.ms_organizations
for update to authenticated
using (public.ms_org_has_role(id,array['owner','admin']))
with check (public.ms_org_has_role(id,array['owner','admin']));

drop policy if exists ms_org_delete_owner on public.ms_organizations;
create policy ms_org_delete_owner on public.ms_organizations
for delete to authenticated
using (public.ms_org_has_role(id,array['owner']));

drop policy if exists ms_org_members_select on public.ms_organization_members;
create policy ms_org_members_select on public.ms_organization_members
for select to authenticated
using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_members_update_admin on public.ms_organization_members;
create policy ms_org_members_update_admin on public.ms_organization_members
for update to authenticated
using (public.ms_org_has_role(organization_id,array['owner','admin','manager']))
with check (public.ms_org_has_role(organization_id,array['owner','admin','manager']));

drop policy if exists ms_org_members_delete_admin on public.ms_organization_members;
create policy ms_org_members_delete_admin on public.ms_organization_members
for delete to authenticated
using (user_id=auth.uid() or public.ms_org_has_role(organization_id,array['owner','admin']));

drop policy if exists ms_org_groups_select on public.ms_organization_groups;
create policy ms_org_groups_select on public.ms_organization_groups
for select to authenticated
using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_groups_write on public.ms_organization_groups;
create policy ms_org_groups_write on public.ms_organization_groups
for all to authenticated
using (public.ms_org_has_role(organization_id,array['owner','admin','manager']))
with check (public.ms_org_has_role(organization_id,array['owner','admin','manager']) and created_by=auth.uid());

drop policy if exists ms_org_events_select on public.ms_organization_events;
create policy ms_org_events_select on public.ms_organization_events
for select to authenticated
using (public.ms_org_is_member(organization_id));

drop policy if exists ms_org_events_write on public.ms_organization_events;
create policy ms_org_events_write on public.ms_organization_events
for all to authenticated
using (public.ms_org_has_role(organization_id,array['owner','admin','manager','captain']))
with check (public.ms_org_has_role(organization_id,array['owner','admin','manager','captain']) and created_by=auth.uid());

create or replace function public.ms_org_create(
  p_name text,
  p_kind text default 'club',
  p_plan text default 'club',
  p_city text default null,
  p_country_code text default 'FR',
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid := auth.uid();
  v_org public.ms_organizations%rowtype;
  v_base_slug text;
  v_slug text;
  v_code text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then raise exception 'INVALID_NAME'; end if;

  v_base_slug := regexp_replace(lower(trim(p_name)),'[^a-z0-9]+','-','g');
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug='' then v_base_slug := 'organisation'; end if;
  v_slug := left(v_base_slug,60)||'-'||lower(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_code := 'MSS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.ms_organizations(owner_id,name,slug,kind,plan,join_code,city,country_code,description)
  values(
    v_uid,
    trim(p_name),
    v_slug,
    case when lower(coalesce(p_kind,'')) in ('club','association','company','venue','school','local_authority','organizer','other') then lower(p_kind) else 'other' end,
    case when lower(coalesce(p_plan,'')) in ('group','club','pro','business','custom') then lower(p_plan) else 'group' end,
    v_code,
    nullif(trim(coalesce(p_city,'')),''),
    upper(left(coalesce(nullif(trim(p_country_code),''),'FR'),2)),
    nullif(trim(coalesce(p_description,'')),'')
  ) returning * into v_org;

  insert into public.ms_organization_members(organization_id,user_id,role,status)
  values(v_org.id,v_uid,'owner','active')
  on conflict(organization_id,user_id) do update set role='owner',status='active',updated_at=now();

  return jsonb_build_object(
    'id',v_org.id::text,
    'name',v_org.name,
    'kind',v_org.kind,
    'plan',v_org.plan,
    'role','owner',
    'joinCode',v_org.join_code,
    'city',coalesce(v_org.city,''),
    'countryCode',v_org.country_code,
    'description',coalesce(v_org.description,''),
    'memberCount',1,
    'groupCount',0,
    'eventCount',0,
    'createdAt',v_org.created_at,
    'updatedAt',v_org.updated_at
  );
end
$$;

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
  on conflict(organization_id,user_id) do update set status='active',updated_at=now();

  select role into v_role from public.ms_organization_members where organization_id=v_org.id and user_id=v_uid;
  select count(*) into v_members from public.ms_organization_members where organization_id=v_org.id and status='active';
  select count(*) into v_groups from public.ms_organization_groups where organization_id=v_org.id;
  select count(*) into v_events from public.ms_organization_events where organization_id=v_org.id;

  return jsonb_build_object(
    'id',v_org.id::text,'name',v_org.name,'kind',v_org.kind,'plan',v_org.plan,'role',v_role,
    'joinCode',v_org.join_code,'city',coalesce(v_org.city,''),'countryCode',v_org.country_code,
    'description',coalesce(v_org.description,''),'memberCount',v_members,'groupCount',v_groups,'eventCount',v_events,
    'createdAt',v_org.created_at,'updatedAt',v_org.updated_at
  );
end
$$;

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

revoke all on function public.ms_org_create(text,text,text,text,text,text) from public;
revoke all on function public.ms_org_join_by_code(text) from public;
revoke all on function public.ms_org_list_mine() from public;
revoke all on function public.ms_org_is_member(uuid) from public;
revoke all on function public.ms_org_has_role(uuid,text[]) from public;

grant execute on function public.ms_org_create(text,text,text,text,text,text) to authenticated;
grant execute on function public.ms_org_join_by_code(text) to authenticated;
grant execute on function public.ms_org_list_mine() to authenticated;
grant execute on function public.ms_org_is_member(uuid) to authenticated;
grant execute on function public.ms_org_has_role(uuid,text[]) to authenticated;

grant select,update,delete on public.ms_organizations to authenticated;
grant select,update,delete on public.ms_organization_members to authenticated;
grant select,insert,update,delete on public.ms_organization_groups to authenticated;
grant select,insert,update,delete on public.ms_organization_events to authenticated;
