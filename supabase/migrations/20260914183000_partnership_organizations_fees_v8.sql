-- MULTISPORTS SCORING — PARTENARIATS / ORGANISATIONS V8
-- Cotisations & paiements : suivi financier léger uniquement.
-- IMPORTANT :
--   * Aucune carte bancaire, IBAN, secret Stripe, reçu PDF ou transaction détaillée n'est stocké ici.
--   * Les paiements réels restent chez le prestataire (Stripe / banque / autre).
--   * MSS ne conserve que le montant attendu, la cible, le statut de règlement et une référence externe courte.
--   * Les lignes "pending" ne sont PAS stockées : elles sont déduites dynamiquement des membres actifs.
--     Une ligne de règlement n'est créée que pour "paid" ou "waived", afin de limiter la croissance de la base.

begin;

create table if not exists public.ms_organization_fee_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ms_organizations(id) on delete cascade,
  group_id uuid references public.ms_organization_groups(id) on delete cascade,
  title text not null,
  fee_kind text not null default 'membership',
  amount_cents integer not null default 0,
  currency text not null default 'EUR',
  due_at timestamptz,
  description text not null default '',
  payment_url text not null default '',
  status text not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_fee_title_len check (char_length(title) between 2 and 100),
  constraint ms_org_fee_kind_check check (fee_kind in ('membership','license','event','other')),
  constraint ms_org_fee_amount_check check (amount_cents between 0 and 100000000),
  constraint ms_org_fee_currency_len check (char_length(currency)=3),
  constraint ms_org_fee_description_len check (char_length(description)<=600),
  constraint ms_org_fee_payment_url_len check (char_length(payment_url)<=400),
  constraint ms_org_fee_payment_url_https check (payment_url='' or payment_url ~* '^https://'),
  constraint ms_org_fee_status_check check (status in ('draft','open','closed','archived'))
);

-- Un seul index métier pour la liste organisation/statut/échéance.
create index if not exists ms_org_fee_campaigns_org_idx
  on public.ms_organization_fee_campaigns(organization_id,status,due_at);

create table if not exists public.ms_organization_fee_records (
  id uuid primary key default gen_random_uuid(),
  fee_id uuid not null references public.ms_organization_fee_campaigns(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  paid_at timestamptz,
  note text not null default '',
  external_ref text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ms_org_fee_record_status_check check (status in ('paid','waived')),
  constraint ms_org_fee_record_note_len check (char_length(note)<=240),
  constraint ms_org_fee_record_external_ref_len check (char_length(external_ref)<=120),
  unique(fee_id,member_user_id)
);

alter table public.ms_organization_fee_campaigns enable row level security;
alter table public.ms_organization_fee_records enable row level security;

drop policy if exists ms_org_fee_campaigns_select on public.ms_organization_fee_campaigns;
create policy ms_org_fee_campaigns_select on public.ms_organization_fee_campaigns
for select to authenticated
using (
  public.ms_org_is_member(organization_id)
  and (
    public.ms_org_has_role(organization_id,array['owner','admin','manager'])
    or group_id is null
    or exists (
      select 1
      from public.ms_organization_group_members gm
      where gm.group_id=ms_organization_fee_campaigns.group_id
        and gm.user_id=auth.uid()
    )
    or exists (
      select 1
      from public.ms_organization_groups g
      where g.id=ms_organization_fee_campaigns.group_id
        and g.captain_user_id=auth.uid()
    )
  )
);

drop policy if exists ms_org_fee_records_select on public.ms_organization_fee_records;
create policy ms_org_fee_records_select on public.ms_organization_fee_records
for select to authenticated
using (
  member_user_id=auth.uid()
  or exists (
    select 1
    from public.ms_organization_fee_campaigns f
    where f.id=ms_organization_fee_records.fee_id
      and public.ms_org_has_role(f.organization_id,array['owner','admin','manager'])
  )
);

revoke insert,update,delete on public.ms_organization_fee_campaigns from authenticated;
revoke insert,update,delete on public.ms_organization_fee_records from authenticated;
grant select on public.ms_organization_fee_campaigns to authenticated;
grant select on public.ms_organization_fee_records to authenticated;

create or replace function public.ms_org_list_fee_campaigns(p_org_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  with visible as (
    select f.*,
      (
        f.group_id is null
        or exists (
          select 1 from public.ms_organization_group_members gm
          where gm.group_id=f.group_id and gm.user_id=auth.uid()
        )
        or exists (
          select 1 from public.ms_organization_groups g
          where g.id=f.group_id and g.captain_user_id=auth.uid()
        )
      ) as is_targeted
    from public.ms_organization_fee_campaigns f
    where f.organization_id=p_org_id
      and auth.uid() is not null
      and public.ms_org_is_member(p_org_id)
      and (
        public.ms_org_has_role(p_org_id,array['owner','admin','manager'])
        or f.group_id is null
        or exists (
          select 1 from public.ms_organization_group_members gm
          where gm.group_id=f.group_id and gm.user_id=auth.uid()
        )
        or exists (
          select 1 from public.ms_organization_groups g
          where g.id=f.group_id and g.captain_user_id=auth.uid()
        )
      )
  )
  select jsonb_build_object(
    'id',f.id::text,
    'organizationId',f.organization_id::text,
    'groupId',coalesce(f.group_id::text,''),
    'groupName',coalesce(g.name,''),
    'title',f.title,
    'feeKind',f.fee_kind,
    'amountCents',f.amount_cents,
    'currency',f.currency,
    'dueAt',coalesce(f.due_at::text,''),
    'description',f.description,
    'paymentUrl',f.payment_url,
    'status',f.status,
    'targetCount',case
      when f.group_id is null then (
        select count(*) from public.ms_organization_members m
        where m.organization_id=f.organization_id and m.status='active'
      )
      else (
        select count(*)
        from public.ms_organization_group_members gm
        join public.ms_organization_members m
          on m.organization_id=gm.organization_id and m.user_id=gm.user_id and m.status='active'
        where gm.group_id=f.group_id
      )
    end,
    'paidCount',(select count(*) from public.ms_organization_fee_records r where r.fee_id=f.id and r.status='paid'),
    'waivedCount',(select count(*) from public.ms_organization_fee_records r where r.fee_id=f.id and r.status='waived'),
    'isTargeted',f.is_targeted,
    'myStatus',case
      when not f.is_targeted then 'pending'
      when exists(select 1 from public.ms_organization_fee_records r where r.fee_id=f.id and r.member_user_id=auth.uid() and r.status='paid') then 'paid'
      when exists(select 1 from public.ms_organization_fee_records r where r.fee_id=f.id and r.member_user_id=auth.uid() and r.status='waived') then 'waived'
      when f.status='open' and f.due_at is not null and f.due_at<now() then 'overdue'
      else 'pending'
    end,
    'createdAt',f.created_at,
    'updatedAt',f.updated_at
  )
  from visible f
  left join public.ms_organization_groups g on g.id=f.group_id
  order by
    case f.status when 'open' then 0 when 'draft' then 1 when 'closed' then 2 else 3 end,
    f.due_at nulls last,
    f.created_at desc
  limit 100;
$$;

create or replace function public.ms_org_create_fee_campaign(
  p_org_id uuid,
  p_group_id uuid,
  p_title text,
  p_fee_kind text,
  p_amount_cents integer,
  p_currency text,
  p_due_at timestamptz,
  p_description text,
  p_payment_url text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_row public.ms_organization_fee_campaigns%rowtype;
  v_kind text:=lower(trim(coalesce(p_fee_kind,'membership')));
  v_currency text:=upper(trim(coalesce(p_currency,'EUR')));
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.ms_org_has_role(p_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 100 then raise exception 'FEE_TITLE_REQUIRED'; end if;
  if v_kind not in ('membership','license','event','other') then raise exception 'INVALID_FEE_KIND'; end if;
  if coalesce(p_amount_cents,-1)<0 or coalesce(p_amount_cents,0)>100000000 then raise exception 'INVALID_AMOUNT'; end if;
  if char_length(v_currency)<>3 then raise exception 'INVALID_CURRENCY'; end if;
  if char_length(trim(coalesce(p_description,'')))>600 then raise exception 'DESCRIPTION_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_payment_url,'')))>400 then raise exception 'PAYMENT_URL_TOO_LONG'; end if;
  if trim(coalesce(p_payment_url,''))<>'' and trim(p_payment_url) !~* '^https://' then raise exception 'PAYMENT_URL_MUST_BE_HTTPS'; end if;
  if p_group_id is not null and not exists(
    select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=p_org_id
  ) then raise exception 'GROUP_NOT_FOUND'; end if;

  insert into public.ms_organization_fee_campaigns(
    organization_id,group_id,title,fee_kind,amount_cents,currency,due_at,description,payment_url,status,created_by
  ) values (
    p_org_id,p_group_id,trim(p_title),v_kind,p_amount_cents,v_currency,p_due_at,
    left(trim(coalesce(p_description,'')),600),left(trim(coalesce(p_payment_url,'')),400),'draft',v_me
  ) returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,'groupId',coalesce(v_row.group_id::text,''),
    'groupName',coalesce((select g.name from public.ms_organization_groups g where g.id=v_row.group_id),''),
    'title',v_row.title,'feeKind',v_row.fee_kind,'amountCents',v_row.amount_cents,'currency',v_row.currency,
    'dueAt',coalesce(v_row.due_at::text,''),'description',v_row.description,'paymentUrl',v_row.payment_url,
    'status',v_row.status,'targetCount',0,'paidCount',0,'waivedCount',0,'isTargeted',true,'myStatus','pending',
    'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_update_fee_campaign(
  p_fee_id uuid,
  p_group_id uuid,
  p_title text,
  p_fee_kind text,
  p_amount_cents integer,
  p_currency text,
  p_due_at timestamptz,
  p_description text,
  p_payment_url text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_row public.ms_organization_fee_campaigns%rowtype;
  v_kind text:=lower(trim(coalesce(p_fee_kind,'membership')));
  v_currency text:=upper(trim(coalesce(p_currency,'EUR')));
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id into v_org_id from public.ms_organization_fee_campaigns where id=p_fee_id;
  if v_org_id is null then raise exception 'FEE_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 100 then raise exception 'FEE_TITLE_REQUIRED'; end if;
  if v_kind not in ('membership','license','event','other') then raise exception 'INVALID_FEE_KIND'; end if;
  if coalesce(p_amount_cents,-1)<0 or coalesce(p_amount_cents,0)>100000000 then raise exception 'INVALID_AMOUNT'; end if;
  if char_length(v_currency)<>3 then raise exception 'INVALID_CURRENCY'; end if;
  if char_length(trim(coalesce(p_description,'')))>600 then raise exception 'DESCRIPTION_TOO_LONG'; end if;
  if char_length(trim(coalesce(p_payment_url,'')))>400 then raise exception 'PAYMENT_URL_TOO_LONG'; end if;
  if trim(coalesce(p_payment_url,''))<>'' and trim(p_payment_url) !~* '^https://' then raise exception 'PAYMENT_URL_MUST_BE_HTTPS'; end if;
  if p_group_id is not null and not exists(
    select 1 from public.ms_organization_groups g where g.id=p_group_id and g.organization_id=v_org_id
  ) then raise exception 'GROUP_NOT_FOUND'; end if;

  update public.ms_organization_fee_campaigns
  set group_id=p_group_id,title=trim(p_title),fee_kind=v_kind,amount_cents=p_amount_cents,currency=v_currency,
      due_at=p_due_at,description=left(trim(coalesce(p_description,'')),600),
      payment_url=left(trim(coalesce(p_payment_url,'')),400),updated_at=now()
  where id=p_fee_id
  returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id::text,'organizationId',v_row.organization_id::text,'groupId',coalesce(v_row.group_id::text,''),
    'groupName',coalesce((select g.name from public.ms_organization_groups g where g.id=v_row.group_id),''),
    'title',v_row.title,'feeKind',v_row.fee_kind,'amountCents',v_row.amount_cents,'currency',v_row.currency,
    'dueAt',coalesce(v_row.due_at::text,''),'description',v_row.description,'paymentUrl',v_row.payment_url,
    'status',v_row.status,'targetCount',0,'paidCount',0,'waivedCount',0,'isTargeted',true,'myStatus','pending',
    'createdAt',v_row.created_at,'updatedAt',v_row.updated_at
  );
end $$;

create or replace function public.ms_org_set_fee_campaign_status(p_fee_id uuid,p_status text)
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
  select organization_id into v_org_id from public.ms_organization_fee_campaigns where id=p_fee_id;
  if v_org_id is null then raise exception 'FEE_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  if v_status not in ('draft','open','closed','archived') then raise exception 'INVALID_FEE_STATUS'; end if;
  update public.ms_organization_fee_campaigns set status=v_status,updated_at=now() where id=p_fee_id;
  return true;
end $$;

create or replace function public.ms_org_list_fee_members(p_fee_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  with fee as (
    select * from public.ms_organization_fee_campaigns where id=p_fee_id
  ),
  targets as (
    select m.user_id,m.organization_id
    from fee f
    join public.ms_organization_members m
      on m.organization_id=f.organization_id and m.status='active'
    where f.group_id is null
       or exists (
         select 1 from public.ms_organization_group_members gm
         where gm.group_id=f.group_id and gm.user_id=m.user_id
       )
  )
  select jsonb_build_object(
    'userId',t.user_id::text,
    'displayName',coalesce(nullif(trim(p.display_name),''),'Membre MSS'),
    'avatarUrl',coalesce(p.avatar_url,''),
    'countryCode',coalesce(p.country_code,''),
    'status',case
      when r.status='paid' then 'paid'
      when r.status='waived' then 'waived'
      when f.status='open' and f.due_at is not null and f.due_at<now() then 'overdue'
      else 'pending'
    end,
    'paidAt',coalesce(r.paid_at::text,''),
    'note',coalesce(r.note,''),
    'externalRef',coalesce(r.external_ref,''),
    'updatedAt',coalesce(r.updated_at::text,'')
  )
  from targets t
  join fee f on true
  left join public.ms_public_profiles p on p.user_id=t.user_id
  left join public.ms_organization_fee_records r on r.fee_id=f.id and r.member_user_id=t.user_id
  where auth.uid() is not null
    and public.ms_org_has_role(f.organization_id,array['owner','admin','manager'])
  order by coalesce(p.display_name,'Membre MSS');
$$;

create or replace function public.ms_org_set_fee_member_status(
  p_fee_id uuid,
  p_user_id uuid,
  p_status text,
  p_note text default '',
  p_external_ref text default ''
)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_me uuid:=auth.uid();
  v_org_id uuid;
  v_group_id uuid;
  v_status text:=lower(trim(coalesce(p_status,'pending')));
  v_targeted boolean:=false;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  select organization_id,group_id into v_org_id,v_group_id
  from public.ms_organization_fee_campaigns where id=p_fee_id;
  if v_org_id is null then raise exception 'FEE_NOT_FOUND'; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  if v_status not in ('pending','paid','waived') then raise exception 'INVALID_FEE_STATUS'; end if;

  select exists(
    select 1 from public.ms_organization_members m
    where m.organization_id=v_org_id and m.user_id=p_user_id and m.status='active'
      and (
        v_group_id is null
        or exists (
          select 1 from public.ms_organization_group_members gm
          where gm.group_id=v_group_id and gm.user_id=p_user_id
        )
      )
  ) into v_targeted;
  if not v_targeted then raise exception 'MEMBER_NOT_TARGETED'; end if;

  if v_status='pending' then
    delete from public.ms_organization_fee_records where fee_id=p_fee_id and member_user_id=p_user_id;
  else
    insert into public.ms_organization_fee_records(
      fee_id,member_user_id,status,paid_at,note,external_ref,updated_by
    ) values (
      p_fee_id,p_user_id,v_status,case when v_status='paid' then now() else null end,
      left(trim(coalesce(p_note,'')),240),left(trim(coalesce(p_external_ref,'')),120),v_me
    )
    on conflict(fee_id,member_user_id) do update
    set status=excluded.status,paid_at=excluded.paid_at,note=excluded.note,
        external_ref=excluded.external_ref,updated_by=v_me,updated_at=now();
  end if;
  return true;
end $$;

create or replace function public.ms_org_delete_fee_campaign(p_fee_id uuid)
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
  select organization_id into v_org_id from public.ms_organization_fee_campaigns where id=p_fee_id;
  if v_org_id is null then return true; end if;
  if not public.ms_org_has_role(v_org_id,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
  delete from public.ms_organization_fee_campaigns where id=p_fee_id;
  return true;
end $$;

revoke all on function public.ms_org_list_fee_campaigns(uuid) from public;
revoke all on function public.ms_org_create_fee_campaign(uuid,uuid,text,text,integer,text,timestamptz,text,text) from public;
revoke all on function public.ms_org_update_fee_campaign(uuid,uuid,text,text,integer,text,timestamptz,text,text) from public;
revoke all on function public.ms_org_set_fee_campaign_status(uuid,text) from public;
revoke all on function public.ms_org_list_fee_members(uuid) from public;
revoke all on function public.ms_org_set_fee_member_status(uuid,uuid,text,text,text) from public;
revoke all on function public.ms_org_delete_fee_campaign(uuid) from public;

grant execute on function public.ms_org_list_fee_campaigns(uuid) to authenticated;
grant execute on function public.ms_org_create_fee_campaign(uuid,uuid,text,text,integer,text,timestamptz,text,text) to authenticated;
grant execute on function public.ms_org_update_fee_campaign(uuid,uuid,text,text,integer,text,timestamptz,text,text) to authenticated;
grant execute on function public.ms_org_set_fee_campaign_status(uuid,text) to authenticated;
grant execute on function public.ms_org_list_fee_members(uuid) to authenticated;
grant execute on function public.ms_org_set_fee_member_status(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.ms_org_delete_fee_campaign(uuid) to authenticated;

commit;
