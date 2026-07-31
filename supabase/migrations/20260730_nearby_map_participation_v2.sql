-- MULTISPORTS SCORING — CARTE LOCALE V2
-- Inscriptions / adhésions / défis / contacts pour clubs, équipes,
-- tournois et lieux de pratique. Migration complémentaire à
-- 20260730_nearby_map_encounters_places.sql.

create extension if not exists pgcrypto with schema extensions;

alter table public.ms_nearby_places
  add column if not exists max_participants integer,
  add column if not exists min_skill_level smallint,
  add column if not exists max_skill_level smallint,
  add column if not exists cover_url text,
  add column if not exists organizer_label text;

alter table public.ms_nearby_places
  drop constraint if exists ms_nearby_places_max_participants_check;
alter table public.ms_nearby_places
  add constraint ms_nearby_places_max_participants_check
  check (max_participants is null or max_participants between 2 and 10000);

alter table public.ms_nearby_places
  drop constraint if exists ms_nearby_places_skill_range_check;
alter table public.ms_nearby_places
  add constraint ms_nearby_places_skill_range_check
  check (
    (min_skill_level is null or min_skill_level between 1 and 5)
    and (max_skill_level is null or max_skill_level between 1 and 5)
    and (min_skill_level is null or max_skill_level is null or min_skill_level <= max_skill_level)
  );

create table if not exists public.ms_nearby_place_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  place_id uuid not null references public.ms_nearby_places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('join','participate','challenge','contact')),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  message text,
  party_size integer not null default 1 check (party_size between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (place_id,user_id)
);

create index if not exists ms_nearby_place_requests_place_status_idx
  on public.ms_nearby_place_requests(place_id,status,created_at desc);
create index if not exists ms_nearby_place_requests_user_status_idx
  on public.ms_nearby_place_requests(user_id,status,created_at desc);

alter table public.ms_nearby_place_requests enable row level security;

drop policy if exists ms_nearby_place_requests_requester_select on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_requester_select
  on public.ms_nearby_place_requests for select to authenticated
  using (user_id=auth.uid());

drop policy if exists ms_nearby_place_requests_owner_select on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_owner_select
  on public.ms_nearby_place_requests for select to authenticated
  using (exists (
    select 1 from public.ms_nearby_places p
    where p.id=place_id and p.owner_user_id=auth.uid()
  ));

drop policy if exists ms_nearby_place_requests_requester_insert on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_requester_insert
  on public.ms_nearby_place_requests for insert to authenticated
  with check (user_id=auth.uid());

drop policy if exists ms_nearby_place_requests_requester_update on public.ms_nearby_place_requests;
create policy ms_nearby_place_requests_requester_update
  on public.ms_nearby_place_requests for update to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());

create or replace function public.ms_publish_nearby_place_v2(
  p_kind text,
  p_title text,
  p_description text default null,
  p_sport text default 'generic',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_area_label text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_precise_location boolean default false,
  p_metadata jsonb default '{}'::jsonb,
  p_max_participants integer default null,
  p_min_skill_level integer default null,
  p_max_skill_level integer default null,
  p_cover_url text default null,
  p_organizer_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_kind text:=lower(trim(coalesce(p_kind,'')));
  v public.ms_nearby_places;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_kind not in ('club','team','tournament','venue') then raise exception 'INVALID_KIND'; end if;
  if length(trim(coalesce(p_title,'')))<2 then raise exception 'TITLE_REQUIRED'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'INVALID_LOCATION'; end if;
  if p_max_participants is not null and (p_max_participants<2 or p_max_participants>10000) then raise exception 'INVALID_CAPACITY'; end if;
  if p_min_skill_level is not null and p_min_skill_level not between 1 and 5 then raise exception 'INVALID_MIN_SKILL'; end if;
  if p_max_skill_level is not null and p_max_skill_level not between 1 and 5 then raise exception 'INVALID_MAX_SKILL'; end if;
  if p_min_skill_level is not null and p_max_skill_level is not null and p_min_skill_level>p_max_skill_level then raise exception 'INVALID_SKILL_RANGE'; end if;

  insert into public.ms_nearby_places(
    owner_user_id,kind,title,description,sport,location,area_label,precise_location,
    starts_at,ends_at,visibility,metadata,expires_at,max_participants,
    min_skill_level,max_skill_level,cover_url,organizer_label
  ) values (
    v_uid,v_kind,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
    lower(coalesce(nullif(trim(p_sport),''),'generic')),
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography,
    nullif(trim(coalesce(p_area_label,'')),''),coalesce(p_precise_location,false),
    p_starts_at,p_ends_at,'public',coalesce(p_metadata,'{}'::jsonb),
    case when v_kind='tournament' then coalesce(p_ends_at,p_starts_at,now()+interval '30 days')+interval '7 days' else null end,
    p_max_participants,p_min_skill_level,p_max_skill_level,
    nullif(trim(coalesce(p_cover_url,'')),''),
    nullif(trim(coalesce(p_organizer_label,'')),'')
  ) returning * into v;

  return jsonb_build_object(
    'id',v.id::text,'ownerUserId',v.owner_user_id::text,'kind',v.kind,'title',v.title,
    'description',v.description,'sport',v.sport,'areaLabel',v.area_label,
    'distanceKm',0,'distanceLabel','Publié ici','mapLat',p_latitude,'mapLng',p_longitude,
    'startsAt',v.starts_at,'endsAt',v.ends_at,'preciseLocation',v.precise_location,
    'metadata',v.metadata,'isOwner',true,'createdAt',v.created_at,
    'maxParticipants',v.max_participants,'acceptedCount',0,
    'minSkillLevel',v.min_skill_level,'maxSkillLevel',v.max_skill_level,
    'coverUrl',v.cover_url,'organizerLabel',v.organizer_label,'myRequestStatus',null
  );
end $$;

create or replace function public.ms_send_nearby_place_request(
  p_place_id uuid,
  p_request_type text,
  p_message text default null,
  p_party_size integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_type text:=lower(trim(coalesce(p_request_type,'')));
  v_place public.ms_nearby_places;
  v public.ms_nearby_place_requests;
  v_accepted integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_type not in ('join','participate','challenge','contact') then raise exception 'INVALID_REQUEST_TYPE'; end if;
  if p_party_size<1 or p_party_size>50 then raise exception 'INVALID_PARTY_SIZE'; end if;

  select * into v_place from public.ms_nearby_places
  where id=p_place_id and visibility='public' and (expires_at is null or expires_at>now());
  if not found then raise exception 'PLACE_NOT_FOUND'; end if;
  if v_place.owner_user_id=v_uid then raise exception 'OWNER_CANNOT_REQUEST'; end if;

  if v_place.max_participants is not null and v_type in ('join','participate') then
    select coalesce(sum(party_size),0)::integer into v_accepted
    from public.ms_nearby_place_requests
    where place_id=p_place_id and status='accepted';
    if v_accepted+p_party_size>v_place.max_participants then raise exception 'PLACE_FULL'; end if;
  end if;

  insert into public.ms_nearby_place_requests(place_id,user_id,request_type,status,message,party_size,created_at,updated_at)
  values(p_place_id,v_uid,v_type,'pending',nullif(trim(coalesce(p_message,'')),''),p_party_size,now(),now())
  on conflict(place_id,user_id) do update set
    request_type=excluded.request_type,
    status=case when public.ms_nearby_place_requests.status='accepted' then 'accepted' else 'pending' end,
    message=excluded.message,
    party_size=excluded.party_size,
    responded_at=case when public.ms_nearby_place_requests.status='accepted' then public.ms_nearby_place_requests.responded_at else null end,
    updated_at=now()
  returning * into v;

  return jsonb_build_object(
    'id',v.id::text,'placeId',v.place_id::text,'userId',v.user_id::text,
    'requestType',v.request_type,'status',v.status,'message',v.message,
    'partySize',v.party_size,'createdAt',v.created_at,'updatedAt',v.updated_at
  );
end $$;

create or replace function public.ms_list_nearby_place_requests(p_limit integer default 100)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  select jsonb_build_object(
    'id',r.id::text,
    'placeId',r.place_id::text,
    'placeTitle',p.title,
    'placeKind',p.kind,
    'sport',p.sport,
    'userId',r.user_id::text,
    'userDisplayName',coalesce(up.display_name,'Joueur'),
    'userAvatarUrl',up.avatar_url,
    'ownerUserId',p.owner_user_id::text,
    'ownerDisplayName',coalesce(op.display_name,p.organizer_label,'Organisateur'),
    'requestType',r.request_type,
    'status',r.status,
    'message',r.message,
    'partySize',r.party_size,
    'direction',case when p.owner_user_id=auth.uid() then 'incoming' else 'outgoing' end,
    'createdAt',r.created_at,
    'updatedAt',r.updated_at,
    'respondedAt',r.responded_at
  )
  from public.ms_nearby_place_requests r
  join public.ms_nearby_places p on p.id=r.place_id
  left join public.ms_public_profiles up on up.user_id=r.user_id
  left join public.ms_public_profiles op on op.user_id=p.owner_user_id
  where auth.uid() is not null
    and (r.user_id=auth.uid() or p.owner_user_id=auth.uid())
  order by case when r.status='pending' then 0 else 1 end,r.updated_at desc
  limit greatest(1,least(coalesce(p_limit,100),200));
$$;

create or replace function public.ms_respond_nearby_place_request(
  p_request_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_status text:=lower(trim(coalesce(p_status,'')));
  v public.ms_nearby_place_requests;
  v_max integer;
  v_used integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_status not in ('accepted','rejected') then raise exception 'INVALID_STATUS'; end if;

  select r.* into v
  from public.ms_nearby_place_requests r
  join public.ms_nearby_places p on p.id=r.place_id
  where r.id=p_request_id and p.owner_user_id=v_uid and r.status='pending'
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;

  if v_status='accepted' then
    select p.max_participants into v_max from public.ms_nearby_places p where p.id=v.place_id;
    if v_max is not null and v.request_type in ('join','participate') then
      select coalesce(sum(party_size),0)::integer into v_used
      from public.ms_nearby_place_requests
      where place_id=v.place_id and status='accepted' and id<>v.id;
      if v_used+v.party_size>v_max then raise exception 'PLACE_FULL'; end if;
    end if;
  end if;

  update public.ms_nearby_place_requests
  set status=v_status,responded_at=now(),updated_at=now()
  where id=v.id
  returning * into v;

  return jsonb_build_object('ok',true,'id',v.id::text,'status',v.status,'placeId',v.place_id::text);
end $$;

create or replace function public.ms_cancel_nearby_place_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare v_uid uuid:=auth.uid(); v public.ms_nearby_place_requests;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.ms_nearby_place_requests
  set status='cancelled',updated_at=now()
  where id=p_request_id and user_id=v_uid and status='pending'
  returning * into v;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',v.id::text,'status',v.status,'placeId',v.place_id::text);
end $$;

-- Enrichit les cartes locales avec capacité, niveau, organisateur et statut
-- d'inscription du membre connecté.
create or replace function public.ms_find_nearby_places(
  p_radius_km integer default 10,
  p_sport text default null,
  p_kinds text[] default '{}'::text[],
  p_limit integer default 100
)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with origin as (
    select location as origin_location
    from public.ms_nearby_settings
    where user_id=auth.uid() and location is not null
      and location_updated_at>now()-interval '7 days'
    limit 1
  ),
  candidates as (
    select p.*,o.origin_location,
      extensions.ST_Distance(p.location,o.origin_location)/1000.0 as real_km
    from public.ms_nearby_places p
    cross join origin o
    where auth.uid() is not null
      and p.visibility='public'
      and (p.expires_at is null or p.expires_at>now())
      and extensions.ST_DWithin(p.location,o.origin_location,greatest(1,least(coalesce(p_radius_km,10),100))*1000.0)
      and (nullif(trim(coalesce(p_sport,'')),'') is null or lower(p.sport)=lower(trim(p_sport)))
      and (coalesce(cardinality(p_kinds),0)=0 or p.kind=any(p_kinds))
    order by real_km asc,coalesce(p.starts_at,p.created_at) asc
    limit greatest(1,least(coalesce(p_limit,100),200))
  )
  select jsonb_build_object(
    'id',c.id::text,'ownerUserId',c.owner_user_id::text,'kind',c.kind,'title',c.title,
    'description',c.description,'sport',c.sport,'areaLabel',c.area_label,
    'distanceKm',public.ms_nearby_distance_bucket(c.real_km),
    'distanceLabel',public.ms_nearby_distance_label(public.ms_nearby_distance_bucket(c.real_km)),
    'mapLat',case when c.precise_location then extensions.ST_Y(c.location::geometry) else (round((extensions.ST_Y(c.location::geometry)::numeric)/0.02)*0.02)::double precision end,
    'mapLng',case when c.precise_location then extensions.ST_X(c.location::geometry) else (round((extensions.ST_X(c.location::geometry)::numeric)/0.02)*0.02)::double precision end,
    'startsAt',c.starts_at,'endsAt',c.ends_at,'preciseLocation',c.precise_location,
    'metadata',c.metadata,'isOwner',(c.owner_user_id=auth.uid()),'createdAt',c.created_at,
    'maxParticipants',c.max_participants,
    'acceptedCount',coalesce(stats.accepted_count,0),
    'minSkillLevel',c.min_skill_level,'maxSkillLevel',c.max_skill_level,
    'coverUrl',c.cover_url,'organizerLabel',coalesce(c.organizer_label,owner.display_name),
    'ownerDisplayName',coalesce(owner.display_name,c.organizer_label,'Organisateur'),
    'ownerAvatarUrl',owner.avatar_url,
    'myRequestStatus',mine.status,
    'myRequestId',mine.id::text
  )
  from candidates c
  left join public.ms_public_profiles owner on owner.user_id=c.owner_user_id
  left join lateral (
    select coalesce(sum(r.party_size),0)::integer as accepted_count
    from public.ms_nearby_place_requests r
    where r.place_id=c.id and r.status='accepted'
  ) stats on true
  left join lateral (
    select r.id,r.status from public.ms_nearby_place_requests r
    where r.place_id=c.id and r.user_id=auth.uid()
    limit 1
  ) mine on true;
$$;

revoke all on table public.ms_nearby_place_requests from anon,authenticated;
revoke all on function public.ms_publish_nearby_place_v2(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb,integer,integer,integer,text,text) from public;
revoke all on function public.ms_send_nearby_place_request(uuid,text,text,integer) from public;
revoke all on function public.ms_list_nearby_place_requests(integer) from public;
revoke all on function public.ms_respond_nearby_place_request(uuid,text) from public;
revoke all on function public.ms_cancel_nearby_place_request(uuid) from public;

grant execute on function public.ms_publish_nearby_place_v2(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb,integer,integer,integer,text,text) to authenticated;
grant execute on function public.ms_send_nearby_place_request(uuid,text,text,integer) to authenticated;
grant execute on function public.ms_list_nearby_place_requests(integer) to authenticated;
grant execute on function public.ms_respond_nearby_place_request(uuid,text) to authenticated;
grant execute on function public.ms_cancel_nearby_place_request(uuid) to authenticated;
grant execute on function public.ms_find_nearby_places(integer,text,text[],integer) to authenticated;
