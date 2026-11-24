import {CHAIN_ID,chainConfigKey,chainLabel,evaluateChains,type ChainConfig,type ChainImpact} from './challengeChains.ts';
export type ChainCareerSession={id:string;config:ChainConfig;hits:ChainImpact[];playedAt:number;source:'challenge'|'training'};
export function chainCareerSession(record:any,playerId:string):ChainCareerSession|null{
 const p=record?.decoded||record?.payload||{};const c=p.config||record?.resume?.config||{};
 if(c.catalogChallengeId!==CHAIN_ID||!(record.status==='finished'||record.summary?.finished===true||p.status==='finished'))return null;
 const raw=p.entries||p.state?.hits||p.state?.log;if(!Array.isArray(raw))return null;
 const hits=raw.filter((h:any)=>String(h.pid)===playerId);if(!hits.length)return null;
 return {id:String(record.matchId||record.id||''),config:c,hits,playedAt:Number(record.finishedAt||record.updatedAt||0),source:'challenge'};
}
export function summarizeChainCareer(sessions:readonly ChainCareerSession[],config:ChainConfig){
 const target=chainConfigKey(config),seen=new Set<string>();let count=0,darts=0;
 const stats:Record<string,{key:string;label:string;best:number;successes:number;attempts:number;runs:number;breaks:number;mean:number;distribution:Record<number,number>}>= {};
 const recent:{id:string;playedAt:number;best:number}[]=[];
 for(const session of sessions){if(!session.id||seen.has(session.id)||chainConfigKey(session.config)!==target)continue;
  const result=evaluateChains(session.hits,session.config);if(!result.complete||!result.attempts)continue;seen.add(session.id);count++;darts+=result.attempts;
  recent.push({id:session.id,playedAt:session.playedAt,best:result.primary.best});
  for(const s of Object.values(result.stats)){const a=stats[s.key]??(stats[s.key]={key:s.key,label:chainLabel(s.key),best:0,successes:0,attempts:0,runs:0,breaks:0,mean:0,distribution:{}});a.best=Math.max(a.best,s.best);a.successes+=s.successes;a.attempts+=result.attempts;a.runs+=s.runs.length;a.breaks+=s.breaks;for(const [n,v] of Object.entries(s.distribution))a.distribution[Number(n)]=(a.distribution[Number(n)]||0)+v;a.mean=a.runs?a.successes/a.runs:0;}
 }
 return {count,darts,stats,recent:recent.sort((a,b)=>b.playedAt-a.playedAt).slice(0,12),heatmap:['S','D','T'].map(f=>({family:f,cells:Array.from({length:20},(_,i)=>({key:f+(i+1),best:stats[f+(i+1)]?.best??null}))}))};
}
