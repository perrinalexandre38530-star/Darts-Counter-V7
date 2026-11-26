begin;
alter table public.ms_training_team_goals add column if not exists mode_id text check(mode_id is null or mode_id ~ '^[a-z0-9_]{1,80}$');
create table if not exists public.ms_training_goal_enrollments (
 goal_id uuid not null references public.ms_training_team_goals(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id text not null check(char_length(profile_id) between 1 and 128), enrolled_at timestamptz not null default now(), primary key(goal_id,user_id));
create table if not exists public.ms_training_goal_credits (
 goal_id uuid not null, user_id uuid not null, session_id text not null check(char_length(session_id) between 1 and 200), ended_at timestamptz not null,
 primary key(goal_id,user_id,session_id), foreign key(goal_id,user_id) references public.ms_training_goal_enrollments(goal_id,user_id) on delete cascade);
alter table public.ms_training_goal_enrollments enable row level security;
alter table public.ms_training_goal_credits enable row level security;
revoke all on public.ms_training_goal_enrollments,public.ms_training_goal_credits from anon,authenticated;
grant select on public.ms_training_goal_enrollments to authenticated;
drop policy if exists training_enroll_read on public.ms_training_goal_enrollments;
create policy training_enroll_read on public.ms_training_goal_enrollments for select to authenticated using(user_id=auth.uid());
drop policy if exists training_goal_progress_write on public.ms_training_team_goal_progress;
create policy training_goal_progress_write on public.ms_training_team_goal_progress for all to authenticated using(user_id=auth.uid() and exists(select 1 from public.ms_training_team_goals g where g.id=goal_id and g.mode_id is null)) with check(user_id=auth.uid() and exists(select 1 from public.ms_training_team_goals g where g.id=goal_id and g.mode_id is null and public.ms_training_team_member(g.team_id) and current_date between g.starts_on and g.ends_on and sessions<=g.target_sessions));
create or replace function public.ms_training_goal_enroll(p_goal uuid,p_profile text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); g public.ms_training_team_goals%rowtype;
begin
 if u is null then raise exception 'Connexion requise'; end if;
 select * into g from public.ms_training_team_goals where id=p_goal for update;
 if not found or g.mode_id is null then raise exception 'Objectif indisponible'; end if;
 if p_profile is null then
 delete from public.ms_training_goal_enrollments where goal_id=p_goal and user_id=u;
 delete from public.ms_training_team_goal_progress where goal_id=p_goal and user_id=u; return; end if;
 if not public.ms_training_team_member(g.team_id) or (now() at time zone 'UTC')::date not between g.starts_on and g.ends_on then raise exception 'Objectif non accessible'; end if;
 insert into public.ms_training_goal_enrollments(goal_id,user_id,profile_id) values(p_goal,u,p_profile) on conflict do nothing;
 if not exists(select 1 from public.ms_training_goal_enrollments where goal_id=p_goal and user_id=u and profile_id=p_profile) then raise exception 'Profil déjà inscrit'; end if;
end;$$;
create or replace function public.ms_training_goal_credit(p_goal uuid,p_profile text,p_sessions jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); g public.ms_training_team_goals%rowtype; e public.ms_training_goal_enrollments%rowtype; x jsonb; n integer; st timestamptz; en timestamptz;
begin
 if u is null then raise exception 'Connexion requise'; end if;
 if jsonb_typeof(p_sessions) is distinct from 'array' or jsonb_array_length(p_sessions)>50 then raise exception 'Lot invalide'; end if;
 select * into g from public.ms_training_team_goals where id=p_goal for update;
 if not found or g.mode_id is null or not public.ms_training_team_member(g.team_id) then return 0; end if;
 select * into e from public.ms_training_goal_enrollments where goal_id=p_goal and user_id=u and profile_id=p_profile;
 if not found then return 0; end if;
 select count(*) into n from public.ms_training_goal_credits where goal_id=p_goal and user_id=u;
 for x in select value from jsonb_array_elements(p_sessions) loop
 exit when n>=g.target_sessions;
 if x->>'mode' is distinct from g.mode_id or coalesce(char_length(x->>'id'),0) not between 1 and 200 then continue; end if;
 begin st:=(x->>'started')::timestamptz; en:=(x->>'ended')::timestamptz; exception when others then continue; end;
 if st is null or en is null or st<e.enrolled_at or en<st or en>now() or (en at time zone 'UTC')::date not between g.starts_on and g.ends_on then continue; end if;
 insert into public.ms_training_goal_credits values(p_goal,u,x->>'id',en) on conflict do nothing;
 if found then n:=n+1; end if;
 end loop;
 if n>0 then insert into public.ms_training_team_goal_progress(goal_id,user_id,sessions) values(p_goal,u,n) on conflict(goal_id,user_id) do update set sessions=excluded.sessions,updated_at=now(); end if;
 return n;
end;$$;
revoke all on function public.ms_training_goal_enroll(uuid,text),public.ms_training_goal_credit(uuid,text,jsonb) from public,anon;
grant execute on function public.ms_training_goal_enroll(uuid,text),public.ms_training_goal_credit(uuid,text,jsonb) to authenticated;
commit;
