-- MULTISPORTS SCORING — CARTE LOCALE / JOUEURS CROISÉS / CLUBS / TOURNOIS
-- Migration complémentaire à 20260727_public_online_nearby.sql
-- Les coordonnées joueurs restent privées : seules des coordonnées arrondies
-- sur une grille d'environ 2 km sont renvoyées à la carte.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

-- ============================================================
-- JOUEURS CROISÉS — aucun trajet, aucune coordonnée conservée
-- ============================================================
create table if not exists public.ms_nearby_encounters (
  id uuid primary key default extensions.gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  first_crossed_at timestamptz not null default now(),
  last_crossed_at timestamptz not null default now(),
  crossed_count integer not null default 1 check (crossed_count > 0),
  closest_distance_km integer not null default 100,
  sports text[] not null default '{}'::text[],
  area_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a_id <> user_b_id),
  unique (user_a_id, user_b_id)
);
create index if not exists ms_nearby_encounters_user_a_idx on public.ms_nearby_encounters(user_a_id,last_crossed_at desc);
create index if not exists ms_nearby_encounters_user_b_idx on public.ms_nearby_encounters(user_b_id,last_crossed_at desc);
alter table public.ms_nearby_encounters enable row level security;

-- ============================================================
-- POINTS LOCAUX — clubs, équipes, tournois et lieux de pratique
-- ============================================================
create table if not exists public.ms_nearby_places (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('club','team','tournament','venue')),
  title text not null,
  description text,
  sport text not null default 'generic',
  location extensions.geography(Point,4326) not null,
  area_label text,
  precise_location boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  visibility text not null default 'public' check (visibility in ('public','friends','private')),
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_nearby_places_location_gix on public.ms_nearby_places using gist(location);
create index if not exists ms_nearby_places_kind_sport_idx on public.ms_nearby_places(kind,sport,starts_at);
create index if not exists ms_nearby_places_owner_idx on public.ms_nearby_places(owner_user_id,created_at desc);
alter table public.ms_nearby_places enable row level security;

drop policy if exists ms_nearby_places_owner_select on public.ms_nearby_places;
create policy ms_nearby_places_owner_select on public.ms_nearby_places for select to authenticated using (owner_user_id=auth.uid());
drop policy if exists ms_nearby_places_owner_insert on public.ms_nearby_places;
create policy ms_nearby_places_owner_insert on public.ms_nearby_places for insert to authenticated with check (owner_user_id=auth.uid());
drop policy if exists ms_nearby_places_owner_update on public.ms_nearby_places;
create policy ms_nearby_places_owner_update on public.ms_nearby_places for update to authenticated using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());
drop policy if exists ms_nearby_places_owner_delete on public.ms_nearby_places;
create policy ms_nearby_places_owner_delete on public.ms_nearby_places for delete to authenticated using (owner_user_id=auth.uid());

create or replace function public.ms_nearby_distance_bucket(p_real_km double precision)
returns integer language sql immutable set search_path=public,auth,extensions as $$
  select case
    when p_real_km < 2 then 2
    when p_real_km < 5 then 5
    when p_real_km < 10 then 10
    when p_real_km < 25 then 25
    when p_real_km < 50 then 50
    else 100
  end;
$$;

create or replace function public.ms_nearby_distance_label(p_bucket integer)
returns text language sql immutable set search_path=public,auth,extensions as $$
  select case p_bucket
    when 2 then 'Moins de 2 km'
    when 5 then 'À environ 5 km'
    when 10 then 'À environ 10 km'
    when 25 then 'À environ 25 km'
    when 50 then 'À environ 50 km'
    else 'À proximité'
  end;
$$;

-- Recherche V2 : même signature que la V1, mais ajoute une ancre cartographique
-- arrondie et journalise un croisement anonymisé.
create or replace function public.ms_find_nearby_players(
  p_radius_km integer default 10,
  p_sport text default null,
  p_available_only boolean default false,
  p_looking_only boolean default false,
  p_limit integer default 100
)
returns setof jsonb
language sql
volatile
security definer
set search_path=public,auth,extensions
as $$
  with origin as (
    select location as origin_location
    from public.ms_nearby_settings
    where user_id=auth.uid()
      and location is not null
      and location_updated_at>now()-interval '7 days'
    limit 1
  ),
  candidates as (
    select
      n.*,
      o.origin_location,
      extensions.ST_Distance(n.location,o.origin_location)/1000.0 as real_km,
      public.ms_nearby_distance_bucket(extensions.ST_Distance(n.location,o.origin_location)/1000.0) as distance_bucket
    from public.ms_nearby_settings n
    cross join origin o
    where auth.uid() is not null
      and n.user_id<>auth.uid()
      and n.visible=true
      and n.location is not null
      and n.location_updated_at>now()-interval '7 days'
      and extensions.ST_DWithin(
        n.location,
        o.origin_location,
        least(greatest(1,least(coalesce(p_radius_km,10),100)),n.radius_km)*1000.0
      )
      and (
        nullif(trim(coalesce(p_sport,'')),'') is null
        or lower(trim(p_sport))=any(select lower(x) from unnest(n.sports)x)
      )
      and (not coalesce(p_available_only,false) or (n.available_now and n.available_until>now()))
      and (not coalesce(p_looking_only,false) or (n.looking_for_game and n.looking_until>now()))
    order by real_km asc
    limit greatest(1,least(coalesce(p_limit,100),200))
  ),
  logged as (
    insert into public.ms_nearby_encounters(
      user_a_id,user_b_id,first_crossed_at,last_crossed_at,crossed_count,
      closest_distance_km,sports,area_label,updated_at
    )
    select
      case when auth.uid()::text<c.user_id::text then auth.uid() else c.user_id end,
      case when auth.uid()::text<c.user_id::text then c.user_id else auth.uid() end,
      now(),now(),1,c.distance_bucket,
      case when nullif(trim(coalesce(p_sport,'')),'') is null then c.sports else array[lower(trim(p_sport))] end,
      c.area_label,now()
    from candidates c
    on conflict(user_a_id,user_b_id) do update set
      last_crossed_at=now(),
      crossed_count=public.ms_nearby_encounters.crossed_count +
        case when public.ms_nearby_encounters.last_crossed_at<now()-interval '30 minutes' then 1 else 0 end,
      closest_distance_km=least(public.ms_nearby_encounters.closest_distance_km,excluded.closest_distance_km),
      sports=excluded.sports,
      area_label=coalesce(excluded.area_label,public.ms_nearby_encounters.area_label),
      updated_at=now()
    returning user_a_id,user_b_id
  )
  select jsonb_build_object(
    'userId',c.user_id::text,
    'displayName',c.display_name,
    'avatarUrl',c.avatar_url,
    'countryCode',c.country_code,
    'cityLabel',c.area_label,
    'distanceKm',c.distance_bucket,
    'distanceLabel',public.ms_nearby_distance_label(c.distance_bucket),
    'sports',to_jsonb(c.sports),
    'skillLevel',c.skill_level,
    'availableNow',(c.available_now and c.available_until>now()),
    'lookingForGame',(c.looking_for_game and c.looking_until>now()),
    'preferredModes',to_jsonb(c.preferred_modes),
    'updatedAt',c.updated_at,
    -- Grille d'environ 2 km : impossible d'en déduire l'adresse exacte.
    'mapLat',(round((extensions.ST_Y(c.location::geometry)::numeric)/0.02)*0.02)::double precision,
    'mapLng',(round((extensions.ST_X(c.location::geometry)::numeric)/0.02)*0.02)::double precision,
    'bearingDeg',mod(round(degrees(extensions.ST_Azimuth(c.origin_location::geometry,c.location::geometry))/45.0)*45,360)
  )
  from candidates c;
$$;

create or replace function public.ms_list_nearby_encounters(p_limit integer default 100)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with mine as (
    select
      e.*,
      case when e.user_a_id=auth.uid() then e.user_b_id else e.user_a_id end as other_user_id
    from public.ms_nearby_encounters e
    where auth.uid() is not null
      and (e.user_a_id=auth.uid() or e.user_b_id=auth.uid())
      and e.last_crossed_at>now()-interval '90 days'
    order by e.last_crossed_at desc
    limit greatest(1,least(coalesce(p_limit,100),200))
  )
  select jsonb_build_object(
    'userId',m.other_user_id::text,
    'displayName',coalesce(p.display_name,n.display_name,'Joueur'),
    'avatarUrl',coalesce(p.avatar_url,n.avatar_url),
    'countryCode',coalesce(p.country_code,n.country_code),
    'cityLabel',coalesce(p.city_label,n.area_label,m.area_label),
    'sports',to_jsonb(case when cardinality(m.sports)>0 then m.sports else coalesce(n.sports,'{}'::text[]) end),
    'skillLevel',n.skill_level,
    'crossedCount',m.crossed_count,
    'closestDistanceKm',m.closest_distance_km,
    'distanceLabel',public.ms_nearby_distance_label(m.closest_distance_km),
    'firstCrossedAt',m.first_crossed_at,
    'lastCrossedAt',m.last_crossed_at,
    'availableNow',(coalesce(n.available_now,false) and n.available_until>now()),
    'lookingForGame',(coalesce(n.looking_for_game,false) and n.looking_until>now())
  )
  from mine m
  left join public.ms_public_profiles p on p.user_id=m.other_user_id
  left join public.ms_nearby_settings n on n.user_id=m.other_user_id;
$$;

create or replace function public.ms_clear_nearby_encounters()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare v_uid uuid:=auth.uid(); v_deleted integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.ms_nearby_encounters where user_a_id=v_uid or user_b_id=v_uid;
  get diagnostics v_deleted=row_count;
  return jsonb_build_object('ok',true,'deleted',v_deleted);
end $$;

create or replace function public.ms_publish_nearby_place(
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
  p_metadata jsonb default '{}'::jsonb
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

  insert into public.ms_nearby_places(
    owner_user_id,kind,title,description,sport,location,area_label,precise_location,
    starts_at,ends_at,visibility,metadata,expires_at
  ) values (
    v_uid,v_kind,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
    lower(coalesce(nullif(trim(p_sport),''),'generic')),
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography,
    nullif(trim(coalesce(p_area_label,'')),''),coalesce(p_precise_location,false),
    p_starts_at,p_ends_at,'public',coalesce(p_metadata,'{}'::jsonb),
    case when v_kind='tournament' then coalesce(p_ends_at,p_starts_at,now()+interval '30 days')+interval '7 days' else null end
  ) returning * into v;

  return jsonb_build_object(
    'id',v.id::text,'ownerUserId',v.owner_user_id::text,'kind',v.kind,'title',v.title,
    'description',v.description,'sport',v.sport,'areaLabel',v.area_label,
    'distanceKm',0,'distanceLabel','Publié ici','mapLat',p_latitude,'mapLng',p_longitude,
    'startsAt',v.starts_at,'endsAt',v.ends_at,'preciseLocation',v.precise_location,
    'metadata',v.metadata,'isOwner',true,'createdAt',v.created_at
  );
end $$;

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
    where user_id=auth.uid()
      and location is not null
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
    'metadata',c.metadata,'isOwner',(c.owner_user_id=auth.uid()),'createdAt',c.created_at
  ) from candidates c;
$$;

create or replace function public.ms_delete_nearby_place(p_place_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare v_uid uuid:=auth.uid(); v_deleted integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.ms_nearby_places where id=p_place_id and owner_user_id=v_uid;
  get diagnostics v_deleted=row_count;
  if v_deleted=0 then raise exception 'PLACE_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',p_place_id::text);
end $$;

revoke all on function public.ms_nearby_distance_bucket(double precision) from public;
revoke all on function public.ms_nearby_distance_label(integer) from public;
revoke all on function public.ms_list_nearby_encounters(integer) from public;
revoke all on function public.ms_clear_nearby_encounters() from public;
revoke all on function public.ms_publish_nearby_place(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb) from public;
revoke all on function public.ms_find_nearby_places(integer,text,text[],integer) from public;
revoke all on function public.ms_delete_nearby_place(uuid) from public;

grant execute on function public.ms_find_nearby_players(integer,text,boolean,boolean,integer) to authenticated;
grant execute on function public.ms_list_nearby_encounters(integer) to authenticated;
grant execute on function public.ms_clear_nearby_encounters() to authenticated;
grant execute on function public.ms_publish_nearby_place(text,text,text,text,double precision,double precision,text,timestamptz,timestamptz,boolean,jsonb) to authenticated;
grant execute on function public.ms_find_nearby_places(integer,text,text[],integer) to authenticated;
grant execute on function public.ms_delete_nearby_place(uuid) to authenticated;
