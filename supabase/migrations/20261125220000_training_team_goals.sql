begin;
create or replace function public.ms_training_team_manager(p_team uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ms_organization_groups g join public.ms_organization_members m on m.organization_id=g.organization_id and m.user_id=auth.uid() and m.status='active' where g.id=p_team and g.kind='team' and (m.role in ('owner','admin','manager') or (g.captain_user_id=auth.uid() and public.ms_training_team_member(g.id))));
$$;
revoke all on function public.ms_training_team_manager(uuid) from public,anon;
grant execute on function public.ms_training_team_manager(uuid) to authenticated;
create table if not exists public.ms_training_team_goals (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.ms_organization_groups(id) on delete cascade,
 created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), kind text not null check(kind in ('program','challenge')),
 title text not null check(char_length(title) between 1 and 100), instructions text not null check(char_length(instructions) between 1 and 1500),
 starts_on date not null, ends_on date not null check(ends_on>=starts_on and ends_on-starts_on<=90),
 target_sessions integer not null check(target_sessions between 1 and 100)
);
create index if not exists ms_training_team_goals_idx on public.ms_training_team_goals(team_id,ends_on);
alter table public.ms_training_team_goals enable row level security;
revoke all on public.ms_training_team_goals from anon,authenticated;
grant select,insert,delete on public.ms_training_team_goals to authenticated;
drop policy if exists training_goal_read on public.ms_training_team_goals;
create policy training_goal_read on public.ms_training_team_goals for select to authenticated using(public.ms_training_team_member(team_id) or public.ms_training_team_manager(team_id));
drop policy if exists training_goal_insert on public.ms_training_team_goals;
create policy training_goal_insert on public.ms_training_team_goals for insert to authenticated with check(created_by=auth.uid() and public.ms_training_team_manager(team_id));
drop policy if exists training_goal_delete on public.ms_training_team_goals;
create policy training_goal_delete on public.ms_training_team_goals for delete to authenticated using(public.ms_training_team_manager(team_id));
create table if not exists public.ms_training_team_goal_progress (
 goal_id uuid not null references public.ms_training_team_goals(id) on delete cascade, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 sessions integer not null check(sessions between 0 and 100), updated_at timestamptz not null default now(), primary key(goal_id,user_id)
);
alter table public.ms_training_team_goal_progress enable row level security;
revoke all on public.ms_training_team_goal_progress from anon,authenticated;
grant select,insert,update,delete on public.ms_training_team_goal_progress to authenticated;
drop policy if exists training_goal_progress_read on public.ms_training_team_goal_progress;
create policy training_goal_progress_read on public.ms_training_team_goal_progress for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.ms_training_team_goals g where g.id=goal_id and (public.ms_training_team_member(g.team_id) or public.ms_training_team_manager(g.team_id))));
drop policy if exists training_goal_progress_write on public.ms_training_team_goal_progress;
create policy training_goal_progress_write on public.ms_training_team_goal_progress for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.ms_training_team_goals g where g.id=goal_id and public.ms_training_team_member(g.team_id) and current_date between g.starts_on and g.ends_on and sessions<=g.target_sessions));
commit;
