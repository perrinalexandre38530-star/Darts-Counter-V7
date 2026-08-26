-- MULTISPORTS SCORING — RUNNING PERFORMANCE route community V2
-- Reviews, perceived difficulty, live trail conditions, hazards, planned outings and user photos.
-- Requires the public profile/social base and running route community V1.

create table if not exists public.ms_running_route_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  rating smallint not null check (rating between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, route_key)
);
create index if not exists ms_running_route_reviews_route_idx on public.ms_running_route_reviews(route_key, updated_at desc);
alter table public.ms_running_route_reviews enable row level security;

create table if not exists public.ms_running_route_conditions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  kind text not null check (kind in ('good','dry','wet','muddy','snow','icy','blocked')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ms_running_route_conditions_route_idx on public.ms_running_route_conditions(route_key, created_at desc);
alter table public.ms_running_route_conditions enable row level security;

create table if not exists public.ms_running_route_hazards (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  kind text not null check (kind in ('obstacle','works','flood','danger','closure','other')),
  severity smallint not null default 1 check (severity between 1 and 3),
  note text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ms_running_route_hazards_route_idx on public.ms_running_route_hazards(route_key, created_at desc);
alter table public.ms_running_route_hazards enable row level security;

create table if not exists public.ms_running_route_outings (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  starts_at timestamptz not null,
  pace text not null default 'easy' check (pace in ('easy','steady','sporty')),
  max_people smallint not null default 6 check (max_people between 2 and 30),
  note text not null default '',
  status text not null default 'open' check (status in ('open','cancelled','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ms_running_route_outings_route_start_idx on public.ms_running_route_outings(route_key, starts_at asc);
alter table public.ms_running_route_outings enable row level security;

create table if not exists public.ms_running_route_outing_members (
  outing_id uuid not null references public.ms_running_route_outings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(outing_id,user_id)
);
alter table public.ms_running_route_outing_members enable row level security;

create table if not exists public.ms_running_route_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  storage_path text not null,
  public_url text not null,
  caption text not null default '',
  created_at timestamptz not null default now(),
  unique(user_id, storage_path)
);
create index if not exists ms_running_route_photos_route_idx on public.ms_running_route_photos(route_key, created_at desc);
alter table public.ms_running_route_photos enable row level security;

create or replace function public.ms_upsert_running_route_review(p_route_key text,p_rating integer,p_difficulty integer,p_text text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_route_key,'')))<4 then raise exception 'INVALID_ROUTE_KEY'; end if;
  if p_rating not between 1 and 5 or p_difficulty not between 1 and 5 then raise exception 'INVALID_SCORE'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_reviews(user_id,route_key,rating,difficulty,text,updated_at)
  values(v_uid,trim(p_route_key),p_rating,p_difficulty,left(trim(coalesce(p_text,'')),600),now())
  on conflict(user_id,route_key) do update set rating=excluded.rating,difficulty=excluded.difficulty,text=excluded.text,updated_at=now();
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.ms_post_running_route_condition(p_route_key text,p_kind text,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('good','dry','wet','muddy','snow','icy','blocked') then raise exception 'INVALID_CONDITION'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_conditions(user_id,route_key,kind,note) values(v_uid,trim(p_route_key),p_kind,left(trim(coalesce(p_note,'')),300));
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.ms_post_running_route_hazard(p_route_key text,p_kind text,p_severity integer default 1,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('obstacle','works','flood','danger','closure','other') then raise exception 'INVALID_HAZARD'; end if;
  if p_severity not between 1 and 3 then raise exception 'INVALID_SEVERITY'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_hazards(user_id,route_key,kind,severity,note) values(v_uid,trim(p_route_key),p_kind,p_severity,left(trim(coalesce(p_note,'')),400));
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.ms_create_running_route_outing(p_route_key text,p_starts_at timestamptz,p_pace text default 'easy',p_max_people integer default 6,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_starts_at <= now()-interval '30 minutes' then raise exception 'INVALID_DATE'; end if;
  if p_pace not in ('easy','steady','sporty') then raise exception 'INVALID_PACE'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_outings(owner_user_id,route_key,starts_at,pace,max_people,note)
  values(v_uid,trim(p_route_key),p_starts_at,p_pace,greatest(2,least(coalesce(p_max_people,6),30)),left(trim(coalesce(p_note,'')),400)) returning id into v_id;
  insert into public.ms_running_route_outing_members(outing_id,user_id) values(v_id,v_uid) on conflict do nothing;
  return jsonb_build_object('ok',true,'outingId',v_id::text);
end $$;

create or replace function public.ms_join_running_route_outing(p_outing_id uuid,p_join boolean default true)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_max integer;v_count integer;v_status text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select max_people,status into v_max,v_status from public.ms_running_route_outings where id=p_outing_id and starts_at>now()-interval '2 hours';
  if v_max is null or v_status<>'open' then raise exception 'OUTING_UNAVAILABLE'; end if;
  if coalesce(p_join,true) then
    select count(*) into v_count from public.ms_running_route_outing_members where outing_id=p_outing_id;
    if v_count>=v_max and not exists(select 1 from public.ms_running_route_outing_members where outing_id=p_outing_id and user_id=v_uid) then raise exception 'OUTING_FULL'; end if;
    insert into public.ms_running_route_outing_members(outing_id,user_id) values(p_outing_id,v_uid) on conflict do nothing;
  else
    delete from public.ms_running_route_outing_members m using public.ms_running_route_outings o where m.outing_id=p_outing_id and o.id=m.outing_id and m.user_id=v_uid and o.owner_user_id<>v_uid;
  end if;
  return jsonb_build_object('ok',true,'joined',coalesce(p_join,true));
end $$;

create or replace function public.ms_publish_running_route_photo(p_route_key text,p_storage_path text,p_public_url text,p_caption text default '')
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_public_url,'')))<10 or length(trim(coalesce(p_storage_path,'')))<5 then raise exception 'INVALID_PHOTO'; end if;
  if split_part(trim(p_storage_path),'/',1)<>v_uid::text then raise exception 'INVALID_OWNER'; end if;
  perform public.ms_touch_public_profile();
  insert into public.ms_running_route_photos(user_id,route_key,storage_path,public_url,caption)
  values(v_uid,trim(p_route_key),trim(p_storage_path),trim(p_public_url),left(trim(coalesce(p_caption,'')),300))
  returning id into v_id;
  return jsonb_build_object('ok',true,'photoId',v_id::text);
end $$;

create or replace function public.ms_running_route_social_feed(p_route_key text,p_limit integer default 30)
returns jsonb language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_limit integer:=greatest(3,least(coalesce(p_limit,30),60));v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'summary',jsonb_build_object(
      'reviewCount',(select count(*) from public.ms_running_route_reviews r where r.route_key=trim(p_route_key)),
      'ratingAvg',(select round(avg(r.rating)::numeric,1) from public.ms_running_route_reviews r where r.route_key=trim(p_route_key)),
      'difficultyAvg',(select round(avg(r.difficulty)::numeric,1) from public.ms_running_route_reviews r where r.route_key=trim(p_route_key)),
      'recentCondition',(select c.kind from public.ms_running_route_conditions c where c.route_key=trim(p_route_key) and c.created_at>now()-interval '14 days' order by c.created_at desc limit 1)
    ),
    'reviews',coalesce((select jsonb_agg(x.obj order by x.updated_at desc) from (
      select jsonb_build_object('id',r.id::text,'userId',r.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'avatarUrl',p.avatar_url,'countryCode',p.country_code,'rating',r.rating,'difficulty',r.difficulty,'text',r.text,'updatedAt',r.updated_at) obj,r.updated_at
      from public.ms_running_route_reviews r left join public.ms_public_profiles p on p.user_id=r.user_id where r.route_key=trim(p_route_key) order by r.updated_at desc limit v_limit
    ) x),'[]'::jsonb),
    'conditions',coalesce((select jsonb_agg(x.obj order by x.created_at desc) from (
      select jsonb_build_object('id',c.id::text,'userId',c.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'avatarUrl',p.avatar_url,'kind',c.kind,'note',c.note,'createdAt',c.created_at) obj,c.created_at
      from public.ms_running_route_conditions c left join public.ms_public_profiles p on p.user_id=c.user_id where c.route_key=trim(p_route_key) and c.created_at>now()-interval '21 days' order by c.created_at desc limit v_limit
    ) x),'[]'::jsonb),
    'hazards',coalesce((select jsonb_agg(x.obj order by x.created_at desc) from (
      select jsonb_build_object('id',h.id::text,'userId',h.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'kind',h.kind,'severity',h.severity,'note',h.note,'createdAt',h.created_at) obj,h.created_at
      from public.ms_running_route_hazards h left join public.ms_public_profiles p on p.user_id=h.user_id where h.route_key=trim(p_route_key) and h.resolved_at is null and h.created_at>now()-interval '45 days' order by h.created_at desc limit v_limit
    ) x),'[]'::jsonb),
    'outings',coalesce((select jsonb_agg(x.obj order by x.starts_at asc) from (
      select jsonb_build_object('id',o.id::text,'ownerUserId',o.owner_user_id::text,'ownerDisplayName',coalesce(p.display_name,'Athlète'),'ownerAvatarUrl',p.avatar_url,'startsAt',o.starts_at,'pace',o.pace,'maxPeople',o.max_people,'note',o.note,'participants',(select count(*) from public.ms_running_route_outing_members m where m.outing_id=o.id),'joined',exists(select 1 from public.ms_running_route_outing_members m where m.outing_id=o.id and m.user_id=v_uid)) obj,o.starts_at
      from public.ms_running_route_outings o left join public.ms_public_profiles p on p.user_id=o.owner_user_id where o.route_key=trim(p_route_key) and o.status='open' and o.starts_at>now()-interval '2 hours' and o.starts_at<now()+interval '60 days' order by o.starts_at asc limit v_limit
    ) x),'[]'::jsonb),
    'photos',coalesce((select jsonb_agg(x.obj order by x.created_at desc) from (
      select jsonb_build_object('id',ph.id::text,'userId',ph.user_id::text,'displayName',coalesce(p.display_name,'Athlète'),'avatarUrl',p.avatar_url,'url',ph.public_url,'caption',ph.caption,'createdAt',ph.created_at) obj,ph.created_at
      from public.ms_running_route_photos ph left join public.ms_public_profiles p on p.user_id=ph.user_id where ph.route_key=trim(p_route_key) order by ph.created_at desc limit v_limit
    ) x),'[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

grant execute on function public.ms_upsert_running_route_review(text,integer,integer,text) to authenticated;
grant execute on function public.ms_post_running_route_condition(text,text,text) to authenticated;
grant execute on function public.ms_post_running_route_hazard(text,text,integer,text) to authenticated;
grant execute on function public.ms_create_running_route_outing(text,timestamptz,text,integer,text) to authenticated;
grant execute on function public.ms_join_running_route_outing(uuid,boolean) to authenticated;
grant execute on function public.ms_publish_running_route_photo(text,text,text,text) to authenticated;
grant execute on function public.ms_running_route_social_feed(text,integer) to authenticated;

-- Public user photos, but only authenticated users can upload into their own user folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('route-community','route-community',true,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='route_community_public_read') then
    create policy route_community_public_read on storage.objects for select using (bucket_id='route-community');
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='route_community_user_insert') then
    create policy route_community_user_insert on storage.objects for insert to authenticated with check (bucket_id='route-community' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='route_community_user_delete') then
    create policy route_community_user_delete on storage.objects for delete to authenticated using (bucket_id='route-community' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
end $$;
