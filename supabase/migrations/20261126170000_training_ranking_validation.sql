-- P10: consistency checks only; client-reported scores are not certified.
begin;
create or replace function public.ms_training_snapshot_eligible(s jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare mode text:=s->>'modeId'; metric text:=s->>'metric'; perf text:=s->>'performance'; n integer; d integer; v numeric;
begin
 if jsonb_typeof(s) is distinct from 'object' or coalesce(mode,'') !~ '^[a-z0-9_]{1,80}$' or coalesce(char_length(s->>'variant'),0) not between 1 and 500 or coalesce(s->>'period','') not in ('30 jours','90 jours','Tout') then return false; end if;
 if coalesce(s->>'sessions','') !~ '^[0-9]{1,6}$' or coalesce(s->>'darts','') !~ '^[0-9]{1,8}$' or coalesce(perf,'') !~ '^[0-9]{1,3}\.[0-9] (pts/3|%)$' then return false; end if;
 n:=(s->>'sessions')::integer; d:=(s->>'darts')::integer; v:=split_part(perf,' ',1)::numeric;
 if n<3 or d<30 or d<n then return false; end if;
 if mode='training_x01' then return coalesce(metric='Moyenne 3 fléch.' and perf like '% pts/3' and v between 0 and 180,false); end if;
 if mode in ('training_finish_do','training_finish_challenge') then return coalesce(metric='Checkouts réussis' and right(perf,2)=' %' and v between 0 and 100 and exists(select 1 from generate_series(greatest(0,floor(v*n/100)::integer-1),least(n,ceil(v*n/100)::integer+1)) k where round(100.0*k/n,1)=v),false); end if;
 return coalesce(metric='Taux de touches' and right(perf,2)=' %' and v between 0 and 100,false);
end;$$;
revoke all on function public.ms_training_snapshot_eligible(jsonb) from public,anon,authenticated;
create or replace function public.ms_training_share_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.created_at:=now();
 if new.ranking_opt_in and not public.ms_training_snapshot_eligible(new.snapshot) then raise exception 'Performance non éligible au classement'; end if;
 return new;
end;$$;
revoke all on function public.ms_training_share_guard() from public,anon,authenticated;
drop trigger if exists ms_training_share_guard on public.ms_training_team_shares;
create trigger ms_training_share_guard before insert on public.ms_training_team_shares for each row execute function public.ms_training_share_guard();
create or replace function public.ms_training_team_rankings(p_scope text, p_team uuid default null, p_config jsonb default null)
returns jsonb language sql stable security definer set search_path = '' as $$
with eligible as (
 select s.user_id,s.team_id,g.name as team_name,s.created_at,s.id,
 left(s.snapshot->>'player',100) as player,
 jsonb_build_array(s.snapshot->>'modeId',s.snapshot->>'mode',s.snapshot->>'variant',s.snapshot->>'period',s.snapshot->>'metric') as config,
 case when s.snapshot->>'performance' ~ '^[0-9]{1,3}\.[0-9] (pts/3|%)$' then split_part(s.snapshot->>'performance',' ',1)::numeric end as score,
 case when s.snapshot->>'sessions' ~ '^[0-9]{1,6}$' then (s.snapshot->>'sessions')::int end as sessions,
 case when s.snapshot->>'darts' ~ '^[0-9]{1,8}$' then (s.snapshot->>'darts')::int end as darts
 from public.ms_training_team_shares s
 join public.ms_organization_groups g on g.id=s.team_id and g.kind='team'
 where auth.uid() is not null and s.ranking_opt_in and s.created_at >= now()-interval '30 days'
 and ((p_scope='internal' and s.team_id=p_team and public.ms_training_team_member(p_team)) or p_scope in ('players','teams'))
 and exists(select 1 from public.ms_organization_group_members gm join public.ms_organization_members m on m.organization_id=gm.organization_id and m.user_id=gm.user_id where gm.group_id=g.id and gm.organization_id=g.organization_id and gm.user_id=s.user_id and m.status='active')
 and public.ms_training_snapshot_eligible(s.snapshot)
 and nullif(s.snapshot->>'modeId','') is not null and nullif(s.snapshot->>'variant','') is not null
 and s.snapshot->>'period' in ('30 jours','90 jours','Tout')
), valid as (
 select * from eligible where sessions>=3 and darts>=30 and score>=0 and score<=case when config->>0='training_x01' then 180 else 100 end
 and ((config->>0='training_x01' and config->>4='Moyenne 3 fléch.') or (config->>0 in ('training_finish_do','training_finish_challenge') and config->>4='Checkouts réussis') or (config->>0 not in ('training_x01','training_finish_do','training_finish_challenge') and config->>4='Taux de touches'))
), latest as (
 select distinct on (config,user_id,case when p_scope='players' then null::uuid else team_id end) * from valid
 order by config,user_id,case when p_scope='players' then null::uuid else team_id end,created_at desc,id desc
), ranked as (
 select case when p_scope='teams' then team_id::text else user_id::text end as entity_id,
 case when p_scope='teams' then team_name else coalesce(nullif(player,''),'Joueur') end as name,team_name,
 round(avg(score),1) as score,count(*) as participants
 from latest where config=p_config
 group by 1,2,3 having p_scope<>'teams' or count(*)>=2
), top_rows as (
 select dense_rank() over(order by score desc) as rank,name,team_name,score,participants from ranked order by score desc,name,entity_id limit 100
), options as (select distinct config from latest order by config limit 200)
select jsonb_build_object('options',coalesce((select jsonb_agg(config order by config) from options),'[]'::jsonb),'rows',coalesce((select jsonb_agg(to_jsonb(r) order by rank,name) from top_rows r),'[]'::jsonb));
$$;
revoke all on function public.ms_training_team_rankings(text,uuid,jsonb) from public,anon;
grant execute on function public.ms_training_team_rankings(text,uuid,jsonb) to authenticated;

commit;
