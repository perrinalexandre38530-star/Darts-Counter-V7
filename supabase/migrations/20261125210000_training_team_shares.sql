-- Voluntary, self-reported training snapshots; not verified leaderboard entries.
create or replace function public.ms_training_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.ms_organization_groups g
 join public.ms_organization_group_members gm on gm.group_id=g.id and gm.organization_id=g.organization_id
 join public.ms_organization_members m on m.organization_id=g.organization_id and m.user_id=gm.user_id
 where g.id=p_team and g.kind='team' and gm.user_id=auth.uid() and m.status='active');
$$;
revoke all on function public.ms_training_team_member(uuid) from public;
grant execute on function public.ms_training_team_member(uuid) to authenticated;
create or replace function public.ms_training_my_teams()
returns table(id uuid,name text) language sql stable security definer set search_path = '' as $$
 select g.id,g.name from public.ms_organization_groups g where public.ms_training_team_member(g.id) order by g.name;
$$;
revoke all on function public.ms_training_my_teams() from public;
grant execute on function public.ms_training_my_teams() to authenticated;
create table if not exists public.ms_training_team_shares (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.ms_organization_groups(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=4096)
);
create index if not exists ms_training_team_shares_team_idx on public.ms_training_team_shares(team_id,created_at desc);
alter table public.ms_training_team_shares enable row level security;
revoke all on public.ms_training_team_shares from anon, authenticated;
grant select,insert,delete on public.ms_training_team_shares to authenticated;
create policy training_share_read on public.ms_training_team_shares for select to authenticated using (user_id=auth.uid() or public.ms_training_team_member(team_id));
create policy training_share_insert on public.ms_training_team_shares for insert to authenticated with check (user_id=auth.uid() and public.ms_training_team_member(team_id));
create policy training_share_delete on public.ms_training_team_shares for delete to authenticated using (user_id=auth.uid());
