-- P7: voluntary, declarative rankings; no direct public access to P6 snapshots.
alter table public.ms_training_team_shares add column if not exists ranking_opt_in boolean not null default false;
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
