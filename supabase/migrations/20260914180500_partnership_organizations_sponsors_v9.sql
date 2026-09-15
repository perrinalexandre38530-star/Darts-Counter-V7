-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V9
-- Sponsors & partenaires : fiche relationnelle légère uniquement.
-- IMPORTANT : les logos/images restent dans R2 / NAS / stockage choisi.
-- Supabase ne conserve que logo_media_key et les métadonnées courtes nécessaires au partage multi-utilisateur.

begin;

create table if not exists public.ms_organization_partners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  group_id uuid references public.ms_organization_groups(id) on delete set null,
  partner_kind text not null default 'sponsor',
  name text not null,
  category text not null default '',
  website_url text not null default '',
  offer_title text not null default '',
  offer_text text not null default '',
  promo_code text not null default '',
  placement text not null default 'organization',
  starts_at timestamptz,
  ends_at timestamptz,
  logo_media_key text not null default '',
  status text not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_partner_name_len check (char_length(name) between 2 and 100),
  constraint ms_org_partner_kind_check check (partner_kind in ('sponsor','partner','supplier','institutional')),
  constraint ms_org_partner_category_len check (char_length(category)<=80),
  constraint ms_org_partner_website_len check (char_length(website_url)<=400),
  constraint ms_org_partner_website_https check (website_url='' or website_url ~* '^https://'),
  constraint ms_org_partner_offer_title_len check (char_length(offer_title)<=120),
  constraint ms_org_partner_offer_text_len check (char_length(offer_text)<=600),
  constraint ms_org_partner_promo_len check (char_length(promo_code)<=80),
  constraint ms_org_partner_placement_check check (placement in ('organization','team','competition','venue','all')),
  constraint ms_org_partner_logo_key_len check (char_length(logo_media_key)<=180),
  constraint ms_org_partner_status_check check (status in ('draft','active','paused','archived')),
  constraint ms_org_partner_period_check check (starts_at is null or ends_at is null or ends_at>=starts_at)
);

-- Un seul index métier pour limiter la maintenance/stockage d'index.
create index if not exists ms_org_partners_org_idx
  on public.ms_organization_partners(organization_id,status,ends_at);

alter table public.ms_organization_partners enable row level security;

drop policy if exists ms_org_partners_select on public.ms_organization_partners;
create policy ms_org_partners_select on public.ms_organization_partners
for select to authenticated
using (
  public.ms_org_is_member(organization_id)
  and (
    public.ms_org_has_role(organization_id,array['owner','admin','manager'])
    or (
      status='active'
      and (starts_at is null or starts_at<=now())
      and (ends_at is null or ends_at>=now())
      and (
        group_id is null
        or exists (
          select 1 from public.ms_organization_group_members gm
          where gm.group_id=ms_organization_partners.group_id and gm.user_id=auth.uid()
        )
        or exists (
          select 1 from public.ms_organization_groups g
          where g.id=ms_organization_partners.group_id and g.captain_user_id=auth.uid()
        )
      )
    )
  )
);

revoke insert,update,delete on public.ms_organization_partners from authenticated;
grant select on public.ms_organization_partners to authenticated;

create or replace function public.ms_org_list_partners(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'id',p.id::text,
    'organizationId',p.organization_id::text,
    'groupId',coalesce(p.group_id::text,''),
    'groupName',coalesce(g.name,''),
    'partnerKind',p.partner_kind,
    'name',p.name,
    'category',p.category,
    'websiteUrl',p.website_url,
    'offerTitle',p.offer_title,
    'offerText',p.offer_text,
    'promoCode',p.promo_code,
    'placement',p.placement,
    'startsAt',coalesce(p.starts_at::text,''),
    'endsAt',coalesce(p.ends_at::text,''),
    'logoMediaKey',p.logo_media_key,
    'status',p.status,
    'createdAt',p.created_at,
    'updatedAt',p.updated_at
  )
  from public.ms_organization_partners p
  left join public.ms_organization_groups g on g.id=p.group_id
  where p.organization_id=p_org_id
    and auth.uid() is not null
    and public.ms_org_is_member(p_org_id)
    and (
      public.ms_org_has_role(p_org_id,array['owner','admin','manager'])
      or (
        p.status='active'
        and (p.starts_at is null or p.starts_at<=now())
        and (p.ends_at is null or p.ends_at>=now())
        and (
          p.group_id is null
          or exists (
            select 1 from public.ms_organization_group_members gm
            where gm.group_id=p.group_id and gm.user_id=auth.uid()
          )
          or exists (
            select 1 from public.ms_organization_groups gg
            where gg.id=p.group_id and gg.captain_user_id=auth.uid()
          )
        )
      )
    )
  order by case p.status when 'active' then 0 when 'draft' then 1 when 'paused' then 2 else 3 end,
           p.ends_at nulls last,p.name
  limit 100;
$$;

create or replace function public.ms_org_create_partner(
  p_org_id uuid,
  p_group_id uuid,
  p_partner_kind text,
  p_name text,
  p_category text,
  p_website_url text,
  p_offer_title text,
  p_offer_text text,
  p_promo_code text,
  p_placement text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_logo_media_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_row public.ms_organization_partners%rowtype;
  v_kind text:=lower(trim(coalesce(p_partner_kind,'sponsor')));
  v_placement text:=lower(trim(coalesce(p_placement,'organization')));
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'PARTNER_NAME_REQUIRED'; end if;
  if v_kind not in ('sponsor','partner','supplier','institutional') then raise exception 'INVALID_PARTNER_KIND'; end if;
  if v_placement not in ('organization','team','competition','venue','all') then raise exception 'INVALID_PLACEMENT'; end if;
  if char_length(trim(coalesce(p_category,'')))>80 then raise exception 'CATEGORY_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_website_url,'')))>400 then raise exception 'WEBSITE_TOO_LONG'; end if;
  if trim(coalesce(p_website_url,''))<>'' and trim(p_website_url) !~* '^https://' then raise exception 'WEBSITE_MUST_BE_HTTPS'; end if;
  if char_length(trim(coalesce(p_offer_title,'')))>120 then raise exception 'OFFER_TITLE_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_offer_text,'')))>600 then raise exception 'OFFER_TEXT_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_promo_code,'')))>80 then raise exception 'PROMO_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_logo_media_key,'')))>180 then raise exception 'LOGO_KEY_TOO_LONG'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at<p_starts_at then raise exception 'INVALID_PERIOD'; end if;
  if p_group_id is not null and not exists(select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=p_org_id) then raise exception 'GROUP_NOT_FOUND'; end if;

  insert into public.ms_organization_partners(
    organization_id,group_id,partner_kind,name,category,website_url,offer_title,offer_text,promo_code,
    placement,starts_at,ends_at,logo_media_key,status,created_by
  ) values (
    p_org_id,p_group_id,v_kind,trim(p_name),left(trim(coalesce(p_category,'')),80),left(trim(coalesce(p_website_url,'')),400),
    left(trim(coalesce(p_offer_title,'')),120),left(trim(coalesce(p_offer_text,'')),600),left(trim(coalesce(p_promo_code,'')),80),
    v_placement,p_starts_at,p_ends_at,left(trim(coalesce(p_logo_media_key,'')),180),'draft',v_me
  ) returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,'groupId',coalesce(v_row.group_id::text,''),
    'groupName',coalesce((select g.name from public.ms_organization_groups g where g.id=v_row.group_id),''),
    'partnerKind',v_row.partner_kind,'name',v_row.name,'category',v_row.category,'websiteUrl',v_row.website_url,
    'offerTitle',v_row.offer_title,'offerText',v_row.offer_text,'promoCode',v_row.promo_code,'placement',v_row.placement,
    'startsAt',coalesce(v_row.starts_at::text,''),'endsAt',coalesce(v_row.ends_at::text,''),'logoMediaKey',v_row.logo_media_key,
    'status',v_row.status,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_update_partner(
  p_partner_id uuid,
  p_group_id uuid,
  p_partner_kind text,
  p_name text,
  p_category text,
  p_website_url text,
  p_offer_title text,
  p_offer_text text,
  p_promo_code text,
  p_placement text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_logo_media_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_row public.ms_organization_partners%rowtype;
  v_kind text:=lower(trim(coalesce(p_partner_kind,'sponsor')));
  v_placement text:=lower(trim(coalesce(p_placement,'organization')));
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_partners where id=p_partner_id;
  if v_org_id is null then raise exception 'PARTNER_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'PARTNER_NAME_REQUIRED'; end if;
  if v_kind not in ('sponsor','partner','supplier','institutional') then raise exception 'INVALID_PARTNER_KIND'; end if;
  if v_placement not in ('organization','team','competition','venue','all') then raise exception 'INVALID_PLACEMENT'; end if;
  if char_length(trim(coalesce(p_category,'')))>80 then raise exception 'CATEGORY_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_website_url,'')))>400 then raise exception 'WEBSITE_TOO_LONG'; end if;
  if trim(coalesce(p_website_url,''))<>'' and trim(p_website_url) !~* '^https://' then raise exception 'WEBSITE_MUST_BE_HTTPS'; end if;
  if char_length(trim(coalesce(p_offer_title,'')))>120 then raise exception 'OFFER_TITLE_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_offer_text,'')))>600 then raise exception 'OFFER_TEXT_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_promo_code,'')))>80 then raise exception 'PROMO_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_logo_media_key,'')))>180 then raise exception 'LOGO_KEY_TOO_LONG'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at<p_starts_at then raise exception 'INVALID_PERIOD'; end if;
  if p_group_id is not null and not exists(select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=v_org_id) then raise exception 'GROUP_NOT_FOUND'; end if;

  update public.ms_organization_partners set
    group_id=p_group_id,partner_kind=v_kind,name=trim(p_name),category=left(trim(coalesce(p_category,'')),80),
    website_url=left(trim(coalesce(p_website_url,'')),400),offer_title=left(trim(coalesce(p_offer_title,'')),120),
    offer_text=left(trim(coalesce(p_offer_text,'')),600),promo_code=left(trim(coalesce(p_promo_code,'')),80),
    placement=v_placement,starts_at=p_starts_at,ends_at=p_ends_at,logo_media_key=left(trim(coalesce(p_logo_media_key,'')),180),updated_at=now()
  where id=p_partner_id returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,'groupId',coalesce(v_row.group_id::text,''),
    'groupName',coalesce((select g.name from public.ms_organization_groups g where g.id=v_row.group_id),''),
    'partnerKind',v_row.partner_kind,'name',v_row.name,'category',v_row.category,'websiteUrl',v_row.website_url,
    'offerTitle',v_row.offer_title,'offerText',v_row.offer_text,'promoCode',v_row.promo_code,'placement',v_row.placement,
    'startsAt',coalesce(v_row.starts_at::text,''),'endsAt',coalesce(v_row.ends_at::text,''),'logoMediaKey',v_row.logo_media_key,
    'status',v_row.status,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_set_partner_status(p_partner_id uuid,p_status text)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_status text:=lower(trim(coalesce(p_status,'')));
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_partners where id=p_partner_id;
  if v_org_id is null then raise exception 'PARTNER_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
  if v_status not in ('draft','active','paused','archived') then raise exception 'INVALID_PARTNER_STATUS'; end if;
  update public.ms_organization_partners set status=v_status,updated_at=now() where id=p_partner_id;
  return true;
end $$;

create or replace function public.ms_org_delete_partner(p_partner_id uuid)
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
  select organization_id into v_org_id from public.ms_organization_partners where id=p_partner_id;
  if v_org_id is null then return true; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_partners where id=p_partner_id;
  return true;
end $$;

revoke all on function public.ms_org_list_partners(uuid) from public;
revoke all on function public.ms_org_create_partner(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,timestamptz,text) from public;
revoke all on function public.ms_org_update_partner(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,timestamptz,text) from public;
revoke all on function public.ms_org_set_partner_status(uuid,text) from public;
revoke all on function public.ms_org_delete_partner(uuid) from public;

grant execute on function public.ms_org_list_partners(uuid) to authenticated;
grant execute on function public.ms_org_create_partner(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.ms_org_update_partner(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.ms_org_set_partner_status(uuid,text) to authenticated;
grant execute on function public.ms_org_delete_partner(uuid) to authenticated;

commit;
