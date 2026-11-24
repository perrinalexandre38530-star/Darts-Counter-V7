/** Chaînes indépendantes, calculées uniquement à partir du journal des impacts. */
export const CHAIN_ID='dont-break-the-chain';
export const CHAIN_VARIANTS=[['bull50','BULL 50'],['bull25','BULL 25'],['bull','BULL 25 + 50'],['triple-fixed','TRIPLE DÉFINI'],['triples','TOUS LES TRIPLES'],['double-fixed','DOUBLE DÉFINI'],['doubles','TOUS LES DOUBLES'],['single-fixed','SIMPLE DÉFINI'],['singles','TOUS LES SIMPLES'],['hybrid','FREE HYBRIDE']] as const;
export type ChainVariant=typeof CHAIN_VARIANTS[number][0];
export type ChainFormat='rounds'|'free'|'single'|'goal';
export type ChainConfig={catalogLine?:number;catalogRounds?:number;chainVariant?:ChainVariant;chainFormat?:ChainFormat;chainGoal?:number;chainDarts?:number;chainEnded?:boolean};
export type ChainImpact={zone:string;segment:number|null};
export type ChainStat={key:string;label:string;current:number;best:number;successes:number;breaks:number;runs:number[];mean:number;distribution:Record<number,number>};
export const CHAIN_KEYS=['S','D','T','BULL','25','50','HIT',...['S','D','T'].flatMap(z=>Array.from({length:20},(_,i)=>z+(i+1)))];
export const chainLabel=(key:string)=>({S:'TOUS LES SIMPLES',D:'TOUS LES DOUBLES',T:'TOUS LES TRIPLES',BULL:'BULL 25 + 50','25':'BULL 25','50':'BULL 50',HIT:'SANS MISS'} as Record<string,string>)[key]||key;
export const chainVariant=(c:ChainConfig):ChainVariant=>CHAIN_VARIANTS.some(([key])=>key===c.chainVariant)?c.chainVariant!:'hybrid';
export const chainFixed=(c:ChainConfig)=>chainVariant(c).endsWith('-fixed');
const bounded=(value:unknown,min:number,max:number,fallback:number)=>Math.min(max,Math.max(min,Math.round(Number(value)||fallback)));
export const chainKey=(c:ChainConfig):string=>{const n=bounded(c.catalogLine,1,20,20);return ({bull50:'50',bull25:'25',bull:'BULL','triple-fixed':`T${n}`,triples:'T','double-fixed':`D${n}`,doubles:'D','single-fixed':`S${n}`,singles:'S',hybrid:'HIT'})[chainVariant(c)];};
export const chainFormat=(c:ChainConfig):ChainFormat=>c.chainFormat==='free'||c.chainFormat==='goal'||(c.chainFormat==='single'&&chainVariant(c)!=='hybrid')?c.chainFormat:'rounds';
export const chainGoal=(c:ChainConfig)=>bounded(c.chainGoal,1,100000,10);
export const chainLimit=(c:ChainConfig)=>chainFormat(c)==='rounds'?bounded(c.chainDarts,1,100000,bounded(c.catalogRounds,1,33333,5)*3):Infinity;
export const chainTitle=(c:ChainConfig)=>chainVariant(c)==='hybrid'?'FREE HYBRIDE':chainLabel(chainKey(c));
export const chainConfigKey=(c:ChainConfig)=>`arcade-${CHAIN_ID}-${chainVariant(c)}-${chainFixed(c)?bounded(c.catalogLine,1,20,20):'all'}-${chainFormat(c)}-${chainFormat(c)==='rounds'?chainLimit(c):chainFormat(c)==='goal'?chainGoal(c):'open'}`;
export function chainImpactKeys(h:ChainImpact):string[]{
 if(h.zone==='BULL')return ['HIT','BULL','25'];if(h.zone==='DBULL')return ['HIT','BULL','50'];
 const z=h.zone==='G'||h.zone==='P'||h.zone==='S'?'S':h.zone;
 if(!['S','D','T'].includes(z)||!Number.isInteger(h.segment)||h.segment! < 1||h.segment! > 20)return [];
 return ['HIT',z,z+h.segment];
}
export function evaluateChains(hits:readonly ChainImpact[],c:ChainConfig){
 const key=chainKey(c),hybrid=chainVariant(c)==='hybrid',format=chainFormat(c),limit=chainLimit(c);
 const keys=hybrid?CHAIN_KEYS:[key];
 const stats:Record<string,ChainStat>=Object.fromEntries(keys.map(k=>[k,{key:k,label:chainLabel(k),current:0,best:0,successes:0,breaks:0,runs:[],mean:0,distribution:{}}]));
 const primary=stats[key]!;let complete=false;const hitResults:boolean[]=[],scoreHistory:number[]=[],visitScores:number[]=[];
 for(const h of hits){if(complete||hitResults.length>=limit)break;const accepted=chainImpactKeys(h);const ok=accepted.includes(key);hitResults.push(ok);
  for(const k of keys){const s=stats[k]!;if(accepted.includes(k)){s.current++;s.successes++;s.best=Math.max(s.best,s.current);}else if(s.current){s.runs.push(s.current);s.current=0;s.breaks++;}}
  scoreHistory.push(primary.best);if(hitResults.length%3===0)visitScores.push(primary.best-(scoreHistory[hitResults.length-4]||0));
  complete=hitResults.length>=limit||(format==='single'&&!ok)||(format==='goal'&&primary.best>=chainGoal(c));
 }
 if(hitResults.length%3)visitScores.push(primary.best-(scoreHistory[hitResults.length-hitResults.length%3-1]||0));
 for(const s of Object.values(stats)){if(s.current)s.runs.push(s.current);s.mean=s.runs.length?s.successes/s.runs.length:0;for(const length of s.runs)s.distribution[length]=(s.distribution[length]||0)+1;}
 return {stats,primary,complete:complete||(format==='free'&&Boolean(c.chainEnded)),hitResults,scoreHistory,visitScores,attempts:hitResults.length};
}
export type ChainEvaluation=ReturnType<typeof evaluateChains>;
export function compareChainResults(a:ChainEvaluation,b:ChainEvaluation){const ar=[...a.primary.runs].sort((x,y)=>y-x),br=[...b.primary.runs].sort((x,y)=>y-x);for(let i=0;i<Math.max(ar.length,br.length);i++){const d=(br[i]||0)-(ar[i]||0);if(d)return d;}return (b.primary.successes/Math.max(1,b.attempts))-(a.primary.successes/Math.max(1,a.attempts));}

/** Le classement HIT garde la clé V1 déjà publiée. Les 66 autres sont isolés. */
export const chainOnlineVisits=(c:ChainConfig)=>Number.isFinite(chainLimit(c))?Math.ceil(chainLimit(c)/3):1;
export const chainOnlineTarget=(c:ChainConfig,key=chainKey(c))=>chainConfigKey(c)+(chainVariant(c)==='hybrid'&&key!=='HIT'?`-cat-${key.toLowerCase()}`:'');
export function parseChainOnlineTarget(target:string):{config:ChainConfig;key:string}|null{
 const prefix=`arcade-${CHAIN_ID}-`;if(!target.startsWith(prefix))return null;
 const match=/^(bull50|bull25|bull|triple-fixed|triples|double-fixed|doubles|single-fixed|singles|hybrid)-(all|\d+)-(rounds|goal|single|free)-(open|\d+)(?:-cat-([a-z0-9]+))?$/.exec(target.slice(prefix.length));if(!match)return null;
 const [,variant,sector,format,amount,category]=match;const config:ChainConfig={chainVariant:variant as ChainVariant,catalogLine:Number(sector)||20,chainFormat:format as ChainFormat,chainDarts:format==='rounds'?Number(amount):undefined,chainGoal:format==='goal'?Number(amount):undefined};
 const key=category?category.toUpperCase():chainKey(config);if(!CHAIN_KEYS.includes(key)||chainOnlineTarget(config,key)!==target)return null;return {config,key};
}
export function chainOnlinePerformances(hits:readonly ChainImpact[],config:ChainConfig){
 const result=evaluateChains(hits,config);if(!result.complete||!result.attempts)return [];
 return Object.values(result.stats).map(stat=>({target:chainOnlineTarget(config,stat.key),rule:'arcade',visits:chainOnlineVisits(config),score:stat.best,bestStreak:stat.best,darts:result.attempts,accuracy:Math.round(stat.successes/result.attempts*1000)/10,key:stat.key,stat}));
}
