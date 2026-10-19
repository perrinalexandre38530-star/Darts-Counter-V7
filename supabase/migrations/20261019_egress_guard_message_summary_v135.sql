-- MULTISPORTS SCORING — V135
-- Réduction Egress Supabase sans toucher aux comptes/profils.
-- 1) résumé léger pour le badge global
-- 2) liste compacte des messages (payloads de parties partagées exclus)
-- 3) index de lecture pour éviter les scans inutiles

create index if not exists ms_private_messages_from_created_idx
  on public.ms_private_messages(from_user_id, created_at desc)
  where deleted_by_sender = false;

create index if not exists ms_private_messages_to_created_idx
  on public.ms_private_messages(to_user_id, created_at desc)
  where deleted_by_recipient = false;

create index if not exists ms_private_messages_to_unread_idx
  on public.ms_private_messages(to_user_id, created_at desc)
  where deleted_by_recipient = false and read_at is null;

create or replace function public.ms_list_private_messages_compact(p_limit integer default 120)
returns setof jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with recent as (
    select m.*
    from public.ms_private_messages m
    where auth.uid() is not null
      and (
        (m.from_user_id = auth.uid() and not m.deleted_by_sender)
        or
        (m.to_user_id = auth.uid() and not m.deleted_by_recipient)
      )
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit,120),250))
  )
  select jsonb_build_object(
    'id',m.id::text,
    'threadId',m.thread_id,
    'text',m.text,
    'status',m.status,
    'metadata',
      case
        when m.metadata->>'type' = 'mss-shared-match-v1' then
          jsonb_set(
            m.metadata,
            '{sharedMatch}',
            coalesce(m.metadata->'sharedMatch','{}'::jsonb) - 'payload',
            true
          )
        else m.metadata
      end,
    'createdAt',m.created_at,
    'readAt',m.read_at,
    'editedAt',m.edited_at,
    'direction',case when m.from_user_id=auth.uid() then 'outgoing' else 'incoming' end,
    'fromUser',jsonb_build_object(
      'id',m.from_user_id::text,
      'userId',m.from_user_id::text,
      'displayName',coalesce(fp.display_name,'Joueur'),
      'nickname',coalesce(fp.display_name,'Joueur'),
      'avatarUrl',fp.avatar_url
    ),
    'toUser',jsonb_build_object(
      'id',m.to_user_id::text,
      'userId',m.to_user_id::text,
      'displayName',coalesce(tp.display_name,'Joueur'),
      'nickname',coalesce(tp.display_name,'Joueur'),
      'avatarUrl',tp.avatar_url
    )
  )
  from recent m
  left join public.ms_public_profiles fp on fp.user_id=m.from_user_id
  left join public.ms_public_profiles tp on tp.user_id=m.to_user_id
  order by m.created_at asc;
$$;

create or replace function public.ms_message_center_summary()
returns jsonb
language sql
security definer
set search_path=public,auth,extensions
as $$
  with me as (
    select auth.uid() as uid
  ),
  unread as (
    select
      count(*) filter (where coalesce(m.metadata->>'type','') <> 'mss-shared-match-v1')::int as unread_messages,
      count(*) filter (where m.metadata->>'type' = 'mss-shared-match-v1')::int as shared_matches
    from public.ms_private_messages m, me
    where me.uid is not null
      and m.to_user_id = me.uid
      and not m.deleted_by_recipient
      and m.read_at is null
  ),
  pending_friends as (
    select count(*)::int as friend_requests
    from public.ms_friend_requests r, me
    where me.uid is not null
      and r.to_user_id = me.uid
      and r.status = 'pending'
  ),
  newest_message as (
    select m.id, m.created_at, m.metadata,
           coalesce(p.display_name,'Joueur') as from_name
    from public.ms_private_messages m
    join me on me.uid is not null and m.to_user_id = me.uid
    left join public.ms_public_profiles p on p.user_id=m.from_user_id
    where not m.deleted_by_recipient and m.read_at is null
    order by m.created_at desc
    limit 1
  ),
  newest_friend as (
    select r.id, r.created_at, coalesce(p.display_name,'Joueur') as from_name
    from public.ms_friend_requests r
    join me on me.uid is not null and r.to_user_id = me.uid
    left join public.ms_public_profiles p on p.user_id=r.from_user_id
    where r.status='pending'
    order by r.created_at desc
    limit 1
  ),
  totals as (
    select
      coalesce(u.unread_messages,0) as unread_messages,
      coalesce(u.shared_matches,0) as shared_matches,
      coalesce(f.friend_requests,0) as friend_requests
    from unread u cross join pending_friends f
  )
  select jsonb_build_object(
    'unreadMessages', t.unread_messages,
    'sharedMatches', t.shared_matches,
    'friendRequests', t.friend_requests,
    'total', t.unread_messages + t.shared_matches + t.friend_requests,
    'newestKey',
      case
        when nm.id is not null and (nf.id is null or nm.created_at >= nf.created_at)
          then 'msg:' || nm.id::text
        when nf.id is not null then 'friend:' || nf.id::text
        else ''
      end,
    'newestLabel',
      case
        when nm.id is not null and (nf.id is null or nm.created_at >= nf.created_at) then
          case when nm.metadata->>'type'='mss-shared-match-v1'
            then 'Nouvelle partie partagée par ' || nm.from_name
            else 'Nouveau message de ' || nm.from_name
          end
        when nf.id is not null then 'Nouvelle demande d''ami de ' || nf.from_name
        else ''
      end
  )
  from totals t
  left join newest_message nm on true
  left join newest_friend nf on true;
$$;

revoke all on function public.ms_list_private_messages_compact(integer) from public;
revoke all on function public.ms_message_center_summary() from public;
grant execute on function public.ms_list_private_messages_compact(integer) to authenticated, service_role;
grant execute on function public.ms_message_center_summary() to authenticated, service_role;

notify pgrst, 'reload schema';
