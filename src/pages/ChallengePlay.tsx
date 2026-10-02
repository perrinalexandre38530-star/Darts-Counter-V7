import React from 'react';
import BackDot from '../components/BackDot';
import ProfileAvatar from '../components/ProfileAvatar';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../contexts/StoreContext';
import { useAwenaOptional } from '../awena/AwenaProvider';
import { useFullscreenPlay } from '../hooks/useFullscreenPlay';
import { loadTeamsBySport, resolveTeamLogo } from '../lib/petanqueTeamsStore';
import { resolveTeamLogoSrc } from '../assets/teamLogoLibrary';
import { History } from '../lib/history';
import { recordTrainingDetailedSession } from '../training/stats/trainingStatsHub';
import {
 fetchChallengeLeaderboard,
 getChallengeOnlineUserId,
 listChallengeTeamScopes,
 challengeTeamsForProfile,
 syncChallengeHistoricalScores,
 submitChallengeBestScore,
 type ChallengeLeaderboardRow,
 type ChallengeLeaderboardTeam,
} from '../lib/challengeLeaderboard';
import target1 from '../assets/challenge_targets/target_1.webp';
import target2 from '../assets/challenge_targets/target_2.webp';
import target3 from '../assets/challenge_targets/target_3.webp';
import target4 from '../assets/challenge_targets/target_4.webp';
import target5 from '../assets/challenge_targets/target_5.webp';
import target6 from '../assets/challenge_targets/target_6.webp';
import target7 from '../assets/challenge_targets/target_7.webp';
import target8 from '../assets/challenge_targets/target_8.webp';
import target9 from '../assets/challenge_targets/target_9.webp';
import target10 from '../assets/challenge_targets/target_10.webp';
import target11 from '../assets/challenge_targets/target_11.webp';
import target12 from '../assets/challenge_targets/target_12.webp';
import target13 from '../assets/challenge_targets/target_13.webp';
import target14 from '../assets/challenge_targets/target_14.webp';
import target15 from '../assets/challenge_targets/target_15.webp';
import target16 from '../assets/challenge_targets/target_16.webp';
import target17 from '../assets/challenge_targets/target_17.webp';
import target18 from '../assets/challenge_targets/target_18.webp';
import target19 from '../assets/challenge_targets/target_19.webp';
import target20 from '../assets/challenge_targets/target_20.webp';
import targetBull25 from '../assets/challenge_targets/target_bull25.webp';
import targetBull50 from '../assets/challenge_targets/target_bull50.webp';
import type { ChallengeConfigData,ChallengeRule } from './ChallengeConfig';

type Hit='S'|'D'|'T'|'25'|'50'|'MISS';
type Entry={hit:Hit;pid:string};
type Participant={id:string;name:string;profile?:any;team?:any;teamName?:string;avatarDataUrl?:string|null};

const hits:Hit[]=['S','D','T','25','50','MISS'];
const onlineTargetFilters=['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','bull','bull25','bull50'];
const onlineVisitFilters=[5,10,15,20,30,50,100];
const onlineRuleFilters=['all','single','double','triple','bull','bull25','bull50'];
const val:Record<Hit,number>={S:1,D:2,T:3,'25':1,'50':2,MISS:0};
const targetBoards:Record<string,string>={'1':target1,'2':target2,'3':target3,'4':target4,'5':target5,'6':target6,'7':target7,'8':target8,'9':target9,'10':target10,'11':target11,'12':target12,'13':target13,'14':target14,'15':target15,'16':target16,'17':target17,'18':target18,'19':target19,'20':target20,bull:targetBull50,bull25:targetBull25,bull50:targetBull50};
const targetLabel=(t:string)=>t==='bull'?'BULL':t==='bull25'?'BULL 25':t==='bull50'?'BULL 50':t;
const ruleLabel=(r:string)=>r==='single'?'S':r==='double'?'D':r==='triple'?'T':r==='bull'?'BULL':r==='bull25'?'B25':r==='bull50'?'B50':'TOUS';
const isBullMode=(rule:string,target:string)=>target==='bull'||target==='bull25'||target==='bull50'||rule==='bull'||rule==='bull25'||rule==='bull50';
const ok=(h:Hit,r:ChallengeRule,t:string)=>{
 if(h==='MISS') return true;
 if(t==='bull') return h==='25'||h==='50';
 if(t==='bull25') return h==='25';
 if(t==='bull50') return h==='50';
 if(r==='all') return ['S','D','T'].includes(h);
 if(r==='single') return h==='S';
 if(r==='double') return h==='D';
 if(r==='triple') return h==='T';
 if(r==='bull') return h==='25'||h==='50';
 if(r==='bull25') return h==='25';
 return h==='50';
};
const hitValue=(h:Hit,r:ChallengeRule,t:string)=>ok(h,r,t)?val[h]:0;
const avatarSrc=(p:any)=>p?.avatarDataUrl||p?.photoDataUrl||p?.avatarUrl||p?.photoUrl||p?.avatar||p?.imageUrl||'';
const teamSrc=(t:any)=>t?.logoDataUrl||resolveTeamLogoSrc(t?.logoLibraryId||t?.logoLibraryFileName||null)||t?.logoUrl||t?.avatarUrl||t?.imageUrl||'';
const normalize=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const localeMap:Record<string,string>={fr:'fr-FR',en:'en-US',es:'es-ES',de:'de-DE',it:'it-IT',pt:'pt-PT',nl:'nl-NL',pl:'pl-PL',ro:'ro-RO',sr:'sr-RS',hr:'hr-HR',da:'da-DK',no:'nb-NO',sv:'sv-SE',is:'is-IS',cs:'cs-CZ',tr:'tr-TR',ar:'ar-SA',ru:'ru-RU',hi:'hi-IN',zh:'zh-CN',ja:'ja-JP'};
const voiceWords:Record<string,Record<'S'|'D'|'T'|'MISS',string[]>>={
 fr:{S:['simple','s'],D:['double','d','b'],T:['triple','t'],MISS:['miss','rate','loupe','manque','zero','m']},en:{S:['single','s'],D:['double','d'],T:['triple','t'],MISS:['miss','missed','zero','m']},es:{S:['simple','s'],D:['doble','d'],T:['triple','t'],MISS:['fallo','fallado','cero','m']},de:{S:['einfach','single','s'],D:['doppel','double','d'],T:['dreifach','triple','t'],MISS:['daneben','fehler','null','m']},it:{S:['singolo','semplice','s'],D:['doppio','d'],T:['triplo','t'],MISS:['mancato','errore','zero','m']},pt:{S:['simples','s'],D:['duplo','d'],T:['triplo','t'],MISS:['falha','falhou','zero','m']},nl:{S:['enkel','single','s'],D:['dubbel','d'],T:['triple','driedubbel','t'],MISS:['mis','gemist','nul','m']},pl:{S:['pojedynczy','s'],D:['podwojny','d'],T:['potrojny','t'],MISS:['pudlo','zero','m']},ro:{S:['simplu','s'],D:['dublu','d'],T:['triplu','t'],MISS:['ratat','zero','m']},sr:{S:['jedan','singl','s'],D:['duplo','d'],T:['troduplo','tripl','t'],MISS:['promasaj','nula','m']},hr:{S:['jedan','singl','s'],D:['duplo','d'],T:['troduplo','tripl','t'],MISS:['promasaj','nula','m']},da:{S:['enkelt','s'],D:['dobbelt','d'],T:['tredobbelt','triple','t'],MISS:['forbi','nul','m']},no:{S:['enkel','s'],D:['dobbel','d'],T:['trippel','t'],MISS:['bom','null','m']},sv:{S:['enkel','s'],D:['dubbel','d'],T:['trippel','t'],MISS:['miss','noll','m']},is:{S:['einfalt','s'],D:['tvofalt','d'],T:['threfalt','triple','t'],MISS:['framhja','null','m']},cs:{S:['jednoduchy','single','s'],D:['dvojity','double','d'],T:['trojity','triple','t'],MISS:['mimo','nula','m']},tr:{S:['tek','single','s'],D:['cift','double','d'],T:['uclu','triple','t'],MISS:['iskala','sifir','m']},ar:{S:['مفرد','واحد','s'],D:['مزدوج','دبل','d'],T:['ثلاثي','تربل','t'],MISS:['خطأ','خارج','صفر','m']},ru:{S:['одинарный','сингл','s'],D:['двойной','дабл','d'],T:['тройной','трипл','t'],MISS:['мимо','ноль','m']},hi:{S:['सिंगल','एकल','s'],D:['डबल','d'],T:['ट्रिपल','t'],MISS:['मिस','चूक','शून्य','m']},zh:{S:['单倍','单区','s'],D:['双倍','d'],T:['三倍','t'],MISS:['脱靶','未中','零','m']},ja:{S:['シングル','s'],D:['ダブル','d'],T:['トリプル','t'],MISS:['ミス','外れ','ゼロ','m']}
};

function parseChallengeVoice(raw:string,lang:string,allowed:Hit[]):Hit|null{
 const n=normalize(raw); const base=(lang||'fr').toLowerCase().split('-')[0]; const dict=voiceWords[base]||voiceWords.en;
 for(const h of ['MISS','T','D','S'] as const){if(!allowed.includes(h))continue;if(dict[h].some(w=>{const x=normalize(w);return n===x||n.split(' ').includes(x)}))return h;}
 return null;
}


function ResolvedTeamLogo({team,className=''}:{team:any;className?:string}){
 const direct=teamSrc(team);
 const [src,setSrc]=React.useState(direct);
 React.useEffect(()=>{let alive=true;setSrc(direct);if(!team?.id)return()=>{alive=false};void resolveTeamLogo(team,true).then(v=>{if(alive&&v)setSrc(v)}).catch(()=>{});return()=>{alive=false}},[team?.id,team?.logoMediaKey,team?.logoLibraryId,team?.logoLibraryFileName,direct]);
 if(!src) return null;
 return <img className={className} src={src} alt="" onError={()=>{const fallback=resolveTeamLogoSrc(team?.logoLibraryId||team?.logoLibraryFileName||null)||'';if(fallback&&fallback!==src)setSrc(fallback)}}/>;
}

type ChallengeDetailedStats={
 score:number;darts:number;successful:number;failures:number;accuracy:number;bestStreak:number;bestVisit:number;avgVisit:number;
 hitCounts:Record<Hit,number>;positionStats:Array<{position:number;attempts:number;successful:number;accuracy:number;S:number;D:number;T:number;B25:number;B50:number;MISS:number}>;
 visitScores:number[];cumulativeScores:number[];
};

function computeChallengeDetailedStats(entries:Entry[],cfg:ChallengeConfigData):ChallengeDetailedStats{
 const hitCounts=Object.fromEntries(hits.map(h=>[h,entries.filter(e=>e.hit===h).length])) as Record<Hit,number>;
 let bestStreak=0,run=0,score=0;
 const positionStats=[0,1,2].map(position=>({position:position+1,attempts:0,successful:0,accuracy:0,S:0,D:0,T:0,B25:0,B50:0,MISS:0}));
 entries.forEach((entry,index)=>{
  const points=hitValue(entry.hit,cfg.rule,cfg.target);
  score+=points;
  if(points>0){run++;bestStreak=Math.max(bestStreak,run)}else run=0;
  const bucket=positionStats[index%3];bucket.attempts++;if(points>0)bucket.successful++;
  if(entry.hit==='S')bucket.S++;else if(entry.hit==='D')bucket.D++;else if(entry.hit==='T')bucket.T++;else if(entry.hit==='25')bucket.B25++;else if(entry.hit==='50')bucket.B50++;else bucket.MISS++;
 });
 positionStats.forEach(bucket=>bucket.accuracy=bucket.attempts?Math.round(bucket.successful/bucket.attempts*1000)/10:0);
 const visitScores:number[]=[];for(let i=0;i<entries.length;i+=3)visitScores.push(entries.slice(i,i+3).reduce((sum,e)=>sum+hitValue(e.hit,cfg.rule,cfg.target),0));
 let cumulative=0;const cumulativeScores=visitScores.map(value=>(cumulative+=value));
 const successful=entries.reduce((n,e)=>n+(hitValue(e.hit,cfg.rule,cfg.target)>0?1:0),0);
 const darts=entries.length;
 return {score,darts,successful,failures:Math.max(0,darts-successful),accuracy:darts?Math.round(successful/darts*1000)/10:0,bestStreak,bestVisit:visitScores.length?Math.max(...visitScores):0,avgVisit:visitScores.length?Math.round((visitScores.reduce((a,b)=>a+b,0)/visitScores.length)*10)/10:0,hitCounts,positionStats,visitScores,cumulativeScores};
}


type ChallengeRecordRaw={
 score:number;firstNine:number;bestStreak:number;hitVisitStreak:number;bestVisit:number;
 hitCounts:Record<Hit,number>;hitStreaks:Record<Hit,number>;hitPct:Record<Hit,number>;
 positionPct:Array<Record<Hit,number>>;darts:number;visitsPlayed:number;
};
type ChallengeRecordCard={key:string;label:string;value:string;numeric:number;quality:number;group:string;holder?:string;inverse?:boolean;sampled?:boolean};

const RECORD_COLORS={green:'#58f28d',yellow:'#ffe45f',orange:'#ff9e43',red:'#ff4d57'} as const;
const recordTone=(quality:number)=>quality>=.75?'green':quality>=.5?'yellow':quality>=.25?'orange':'red';
const recordColor=(quality:number)=>RECORD_COLORS[recordTone(Math.max(0,Math.min(1,Number(quality)||0)))];
const percent=(n:number,d:number)=>d>0?Math.round((n/d)*1000)/10:0;
const maxPointsPerDart=(cfg:ChallengeConfigData)=>Math.max(1,...hits.map(h=>hitValue(h,cfg.rule,cfg.target)));
const hitLabel=(h:Hit)=>h==='25'?'BULL25':h==='50'?'BULL50':h;

function bestExactHitStreak(entries:Entry[],hit:Hit){
 let best=0,run=0;
 for(const entry of entries){if(entry.hit===hit){run++;best=Math.max(best,run)}else run=0}
 return best;
}
function bestHitVisitStreak(entries:Entry[],cfg:ChallengeConfigData){
 let best=0,run=0;
 for(let i=0;i<entries.length;i+=3){const visit=entries.slice(i,i+3);if(visit.some(e=>hitValue(e.hit,cfg.rule,cfg.target)>0)){run++;best=Math.max(best,run)}else run=0}
 return best;
}
function buildRecordRaw(entries:Entry[],cfg:ChallengeConfigData):ChallengeRecordRaw{
 const detailed=computeChallengeDetailedStats(entries,cfg);
 const hitCounts=detailed.hitCounts;
 const hitStreaks=Object.fromEntries(hits.map(h=>[h,bestExactHitStreak(entries,h)])) as Record<Hit,number>;
 const hitPct=Object.fromEntries(hits.map(h=>[h,percent(hitCounts[h],detailed.darts)])) as Record<Hit,number>;
 const positionPct=detailed.positionStats.map(pos=>Object.fromEntries((['S','D','T','25','50','MISS'] as Hit[]).map(h=>{
  const count=h==='25'?pos.B25:h==='50'?pos.B50:h==='MISS'?pos.MISS:(pos as any)[h];
  return [h,percent(Number(count||0),pos.attempts)];
 })) as Record<Hit,number>);
 return {
  score:detailed.score,
  firstNine:entries.slice(0,9).reduce((sum,e)=>sum+hitValue(e.hit,cfg.rule,cfg.target),0),
  bestStreak:detailed.bestStreak,
  hitVisitStreak:bestHitVisitStreak(entries,cfg),
  bestVisit:detailed.bestVisit,
  hitCounts,hitStreaks,hitPct,positionPct,darts:detailed.darts,visitsPlayed:detailed.visitScores.length,
 };
}

function onlineDetailedStatsOverride(raw:any,cfg:ChallengeConfigData):ChallengeDetailedStats|null{
 if(!raw||typeof raw!=='object') return null;
 const stats=(raw?.stats&&typeof raw.stats==='object')?raw.stats:raw;
 const hc=stats?.hitCounts||stats?.hits||stats?.hitSummary||{};
 const hitCounts:Record<Hit,number>={
  S:Number(hc?.S??hc?.single??0)||0,
  D:Number(hc?.D??hc?.double??0)||0,
  T:Number(hc?.T??hc?.triple??0)||0,
  '25':Number(hc?.['25']??hc?.SBull??hc?.bull25??0)||0,
  '50':Number(hc?.['50']??hc?.DBull??hc?.bull50??0)||0,
  MISS:Number(hc?.MISS??hc?.miss??0)||0,
 };
 const darts=Math.max(0,Number(raw?.darts??stats?.darts??0)||0);
 const accuracy=Math.max(0,Math.min(100,Number(raw?.accuracy??stats?.accuracy??stats?.successRate??0)||0));
 const countedSuccess=hitCounts.S+hitCounts.D+hitCounts.T+hitCounts['25']+hitCounts['50'];
 const countedTotal=countedSuccess+hitCounts.MISS;
 const successful=countedTotal>0?countedSuccess:Math.max(0,Math.min(darts,Math.round(darts*accuracy/100)));
 const failures=countedTotal>0?hitCounts.MISS:Math.max(0,darts-successful);
 const sourcePositions=Array.isArray(stats?.positionStats)?stats.positionStats:[];
 const positionStats=[0,1,2].map(index=>{
  const src=sourcePositions.find((p:any)=>Number(p?.position||0)===index+1)||sourcePositions[index]||{};
  const attempts=Math.max(0,Number(src?.attempts??0)||0);
  const okCount=Math.max(0,Number(src?.successful??src?.hits??0)||0);
  return {
   position:index+1,
   attempts,
   successful:okCount,
   accuracy:Math.max(0,Math.min(100,Number(src?.accuracy??(attempts?okCount/attempts*100:0))||0)),
   S:Number(src?.S??0)||0,D:Number(src?.D??0)||0,T:Number(src?.T??0)||0,
   B25:Number(src?.B25??src?.['25']??0)||0,B50:Number(src?.B50??src?.['50']??0)||0,
   MISS:Number(src?.MISS??src?.miss??0)||0,
  };
 });
 const visitScores=Array.isArray(stats?.visitScores)?stats.visitScores.map((v:any)=>Number(v)||0):[];
 const cumulativeScores=Array.isArray(stats?.cumulativeScores)?stats.cumulativeScores.map((v:any)=>Number(v)||0):(()=>{let total=0;return visitScores.map(v=>(total+=v))})();
 return {
  score:Math.max(0,Number(raw?.score??stats?.score??0)||0),
  darts,
  successful,
  failures,
  accuracy,
  bestStreak:Math.max(0,Number(raw?.bestStreak??stats?.bestStreak??0)||0),
  bestVisit:Math.max(0,Number(stats?.bestVisit??stats?.bestVolley??0)||0),
  avgVisit:Math.max(0,Number(stats?.avgVisit??stats?.averageVisit??0)||0),
  hitCounts,
  positionStats,
  visitScores,
  cumulativeScores,
 };
}

function onlineRecordRawOverride(raw:any,cfg:ChallengeConfigData,detailed:ChallengeDetailedStats):ChallengeRecordRaw{
 const stats=(raw?.stats&&typeof raw.stats==='object')?raw.stats:raw||{};
 const hitStreakSource=stats?.hitStreaks||stats?.streaks||{};
 const hitStreaks=Object.fromEntries(hits.map(h=>[h,Math.max(0,Number(hitStreakSource?.[h]??hitStreakSource?.[hitLabel(h)]??0)||0)])) as Record<Hit,number>;
 const hitPct=Object.fromEntries(hits.map(h=>[h,Number(stats?.hitPct?.[h]??(detailed.darts?detailed.hitCounts[h]/detailed.darts*100:0))||0])) as Record<Hit,number>;
 const positionPct=detailed.positionStats.map(pos=>Object.fromEntries((['S','D','T','25','50','MISS'] as Hit[]).map(h=>{
  const count=h==='25'?pos.B25:h==='50'?pos.B50:h==='MISS'?pos.MISS:(pos as any)[h];
  return [h,pos.attempts?Number(count||0)/pos.attempts*100:0];
 })) as Record<Hit,number>);
 return {
  score:detailed.score,
  firstNine:Math.max(0,Number(stats?.firstNine??stats?.first9??stats?.scoreFirst9??0)||0),
  bestStreak:detailed.bestStreak,
  hitVisitStreak:Math.max(0,Number(stats?.hitVisitStreak??stats?.bestHitVisitStreak??0)||0),
  bestVisit:detailed.bestVisit,
  hitCounts:detailed.hitCounts,
  hitStreaks,
  hitPct,
  positionPct,
  darts:detailed.darts,
  visitsPlayed:detailed.visitScores.length||Math.ceil(detailed.darts/3),
 };
}
function makeRecordCards(raw:ChallengeRecordRaw,cfg:ChallengeConfigData,holder?:string):ChallengeRecordCard[]{
 const totalDarts=Math.max(1,Number(cfg.visits||1)*3);
 const totalVisits=Math.max(1,Number(cfg.visits||1));
 const maxPerDart=maxPointsPerDart(cfg);
 const cards:ChallengeRecordCard[]=[];
 const push=(key:string,label:string,value:number,max:number,group:string,opts?:{pct?:boolean;inverse?:boolean;sampled?:boolean})=>{
  const ratio=max>0?Math.max(0,Math.min(1,value/max)):0;
  const sampled=opts?.sampled!==false;
  const quality=sampled?(opts?.inverse?1-ratio:ratio):0;
  cards.push({key,label,value:opts?.pct?`${value.toFixed(1)}%`:String(Math.round(value*10)/10),numeric:value,quality,group,holder,inverse:opts?.inverse,sampled});
 };
 push('score','MEILLEUR SCORE',raw.score,totalDarts*maxPerDart,'PERFORMANCE');
 push('first9','SCORE SUR 9 PREMIÈRES FLÉCHETTES',raw.firstNine,Math.min(9,totalDarts)*maxPerDart,'PERFORMANCE');
 push('bestStreak','SÉRIE DE TOUCHES SANS MISS',raw.bestStreak,totalDarts,'PERFORMANCE');
 push('visitHitStreak','SÉRIE DE TOURS AVEC ≥ 1 TOUCHE',raw.hitVisitStreak,totalVisits,'PERFORMANCE');
 push('bestVisit','POINTS MAX SUR 1 TOUR',raw.bestVisit,3*maxPerDart,'PERFORMANCE');
 for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`count_${h}`,`PLUS GRAND NOMBRE DE ${hitLabel(h)}`,raw.hitCounts[h],totalDarts,'VOLUMES',{inverse:h==='MISS'});
 for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`streak_${h}`,`MEILLEURE SÉRIE DE ${hitLabel(h)} À LA SUITE`,raw.hitStreaks[h],totalDarts,'SÉRIES',{inverse:h==='MISS'});
 for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`pct_${h}`,h==='MISS'?`MEILLEUR % MISS (PLUS BAS)`:`MEILLEUR % ${hitLabel(h)}`,raw.hitPct[h],100,'POURCENTAGES',{pct:true,inverse:h==='MISS',sampled:raw.darts>0});
 raw.positionPct.forEach((row,index)=>{
  const attempts=raw.darts>index?Math.floor((raw.darts+2-index)/3):0;
  for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`dart${index+1}_${h}`,`${index+1}${index===0?'RE':index===1?'E':'E'} FLÉCHETTE · ${h==='MISS'?'% MISS':`% ${hitLabel(h)}`}`,row[h],100,`${index+1}${index===0?'RE':index===1?'E':'E'} FLÉCHETTE`,{pct:true,inverse:h==='MISS',sampled:attempts>0});
 });
 return cards;
}
function buildGlobalRecordCards(rows:Array<{participant:Participant;raw:ChallengeRecordRaw}>,cfg:ChallengeConfigData):ChallengeRecordCard[]{
 if(!rows.length) return makeRecordCards(buildRecordRaw([],cfg),cfg);
 const perPlayer=rows.map(({participant,raw})=>({participant,cards:makeRecordCards(raw,cfg,String(participant.name||'Joueur').toUpperCase())}));
 const keys=perPlayer[0].cards.map(c=>c.key);
 return keys.map(key=>{
  const allCandidates=perPlayer.map(x=>x.cards.find(c=>c.key===key)!).filter(Boolean);
  const sampledCandidates=allCandidates.filter(c=>c.sampled!==false);
  const candidates=sampledCandidates.length?sampledCandidates:allCandidates;
  const sample=candidates[0];
  // Les statistiques marquées "inverse" sont meilleures quand leur valeur est
  // basse (MISS : moins il y en a, mieux c'est), quel que soit leur format.
  const lowerIsBetter=Boolean(sample?.inverse);
  const winner=lowerIsBetter
   ? candidates.reduce((best,c)=>c.numeric<best.numeric?c:best,candidates[0])
   : candidates.reduce((best,c)=>c.numeric>best.numeric?c:best,candidates[0]);
  const tied=candidates.filter(c=>Math.abs(c.numeric-winner.numeric)<1e-9).map(c=>c.holder).filter(Boolean) as string[];
  const holder=tied.length>1?`EX ÆQUO · ${tied.join(' / ')}`:winner.holder;
  return {...winner,holder};
 });
}

function ChallengeRecordGrid({cards,group}:{cards:ChallengeRecordCard[];group?:string}){
 const groups=Array.from(new Set(cards.map(c=>c.group))).filter(g=>!group||g===group);
 return <div className="challenge-records">{groups.map(groupName=><section className="record-group" key={groupName}><h3>{groupName}</h3><div className="record-grid">{cards.filter(c=>c.group===groupName).map(card=><div className="record-card" key={card.key}><span>{card.label}</span><b style={{color:recordColor(card.quality)}}>{card.value}</b>{card.holder&&<em>{card.holder}</em>}<i className="record-quality"><u style={{width:`${Math.round(card.quality*100)}%`,background:recordColor(card.quality)}}/></i></div>)}</div></section>)}</div>;
}

function MiniLine({values}:{values:number[]}){
 const width=520,height=150,pad=18;const max=Math.max(1,...values),min=Math.min(0,...values),range=Math.max(1,max-min);
 const points=values.map((v,i)=>`${values.length<=1?width/2:pad+i/(values.length-1)*(width-pad*2)},${height-pad-(v-min)/range*(height-pad*2)}`).join(' ');
 return <svg className="challenge-mini-line" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Évolution du score"><line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad}/>{points&&<polyline points={points}/>} {values.map((v,i)=>{const x=values.length<=1?width/2:pad+i/(Math.max(1,values.length-1))*(width-pad*2);const y=height-pad-(v-min)/range*(height-pad*2);return <circle key={i} cx={x} cy={y} r="4"><title>{`Tour ${i+1}: ${v}`}</title></circle>})}</svg>;
}

function Donut({stats}:{stats:ChallengeDetailedStats}){
 const parts=[['S',stats.hitCounts.S,'#169cff'],['D',stats.hitCounts.D,'#ff3b48'],['T',stats.hitCounts.T,'#ffad19'],['25',stats.hitCounts['25'],'#10d47b'],['50',stats.hitCounts['50'],'#bc55ff'],['MISS',stats.hitCounts.MISS,'#758196']] as any[];
 const total=Math.max(1,parts.reduce((a,p)=>a+Number(p[1]||0),0));let cursor=0;const stops=parts.filter(p=>p[1]>0).map(p=>{const start=cursor;cursor+=Number(p[1])/total*100;return `${p[2]} ${start}% ${cursor}%`});
 return <div className="challenge-donut-wrap"><div className="challenge-donut" style={{background:stops.length?`conic-gradient(${stops.join(',')})`:'#1a2330'}}><span>{stats.accuracy.toFixed(1)}%<small>PRÉCISION</small></span></div><div className="challenge-donut-legend">{parts.map(p=><div key={p[0]}><i style={{background:p[2]}}/><b>{p[0]}</b><span>{p[1]}</span></div>)}</div></div>;
}

function ChallengeAvatar({participant,size}: {participant:Participant;size:number}){
 const direct=participant.avatarDataUrl||(participant.profile?avatarSrc(participant.profile):teamSrc(participant.team));
 const [directFailed,setDirectFailed]=React.useState(false);
 React.useEffect(()=>setDirectFailed(false),[direct]);
 if(direct&&!directFailed) return <img className="challenge-avatar-img" src={direct} alt="" onError={()=>setDirectFailed(true)}/>;
 if(participant.profile) return <ProfileAvatar profile={participant.profile} profileId={String(participant.profile?.id||participant.id)} fallbackMode="full" loading="eager" noFrame size={size}/>;
 if(direct) return <img className="challenge-avatar-img" src={direct} alt=""/>;
 return <span className="challenge-avatar-fallback">{String(participant.name||'?').slice(0,1).toUpperCase()}</span>;
}

export default function ChallengePlay({go,params}:{go:(t:any,p?:any)=>void;params?:any}){
 const historyStatsOnly=Boolean(params?.historyStatsOnly);
 const onlineStatsOverride=params?.onlineStatsOverride||null;
 useFullscreenPlay({enabled:true,lockBodyScroll:true});
 const theme=useTheme(); const {store}=useStore(); const awena=useAwenaOptional();
 const resumeRecord=params?.rec||null;
 const resumePayload=resumeRecord?.decoded||resumeRecord?.payload||resumeRecord?.resume?.livePayload||{};
 const resumeSnapshot=params?.snapshot||resumeRecord?.resume?.state||resumePayload?.state||resumePayload?.snapshot||null;
 const cfg:ChallengeConfigData=params?.config||resumeRecord?.resume?.config||resumePayload?.config||{target:'20',visits:30,rule:'all',playerIds:[],teamIds:[],participantMode:'players',participantSource:'direct',configMode:'guided',matchMode:'solo'};
 const profiles=store?.profiles||[];
 const teams=React.useMemo(()=>{try{return loadTeamsBySport('darts')||[]}catch{return []}},[]);
 const selectedTeams=React.useMemo(()=>teams.filter((team:any)=>(cfg.teamIds||[]).includes(String(team.id))),[teams,cfg.teamIds]);
 const participants=React.useMemo<Participant[]>(()=>{
  const picked=profiles.filter((p:any)=>cfg.playerIds?.includes(String(p.id))).map((p:any)=>{
   const team=selectedTeams.find((t:any)=>Array.isArray(t?.playerIds)&&t.playerIds.map(String).includes(String(p.id)));
   return {id:String(p.id),name:p.name||p.nickname||'Joueur',profile:p,team,teamName:team?.name||''};
  });
  if(picked.length) return picked;
  const resumedPlayers=(resumeRecord?.players||resumePayload?.players||resumePayload?.finalPlayers||resumeRecord?.summary?.perPlayer||[]);
  if(Array.isArray(resumedPlayers)&&resumedPlayers.length){return resumedPlayers.map((p:any)=>{const id=String(p?.id||p?.playerId||p?.profileId||p?.userId||'');const profile=profiles.find((x:any)=>String(x.id)===id);const teamId=String(p?.teamId||'');const team=selectedTeams.find((t:any)=>String(t.id)===teamId)||selectedTeams.find((t:any)=>Array.isArray(t?.playerIds)&&t.playerIds.map(String).includes(id));return {id,name:p?.name||p?.displayName||profile?.name||profile?.nickname||'Joueur',profile,team,teamName:p?.teamName||team?.name||'',avatarDataUrl:p?.avatarDataUrl||p?.avatarUrl||null}}).filter((p:any)=>p.id)}
  // Compatibilité avec les anciennes configs Challenge où l'équipe elle-même était un participant.
  if(cfg.participantMode==='teams') return (cfg.teamIds||[]).map(id=>{const team=teams.find((t:any)=>String(t.id)===String(id));return team?{id:`team:${team.id}`,name:team.name||'Équipe',team}:null}).filter(Boolean) as Participant[];
  return [];
 },[cfg.playerIds,cfg.participantMode,cfg.teamIds,profiles,selectedTeams,teams,resumeRecord,resumePayload]);
 const safeParticipants=participants.length?participants:[{id:'solo',name:'Joueur'}];
 const initialLog=React.useMemo<Entry[]>(()=>{const source=resumeSnapshot?.log||resumeSnapshot?.entries||resumePayload?.entries||resumeRecord?.resume?.livePayload?.entries||[];return Array.isArray(source)?source.filter((e:any)=>e&&hits.includes(e.hit)&&e.pid).map((e:any)=>({hit:e.hit as Hit,pid:String(e.pid)})):[]},[resumeSnapshot,resumePayload,resumeRecord]);
 const [log,setLog]=React.useState<Entry[]>(()=>initialLog);
 const [rankOpen,setRankOpen]=React.useState(false);
 const [onlineRanking,setOnlineRanking]=React.useState<ChallengeLeaderboardRow[]>([]);
 const [onlineRankingLoading,setOnlineRankingLoading]=React.useState(false);
 const [onlineRankingError,setOnlineRankingError]=React.useState('');
 const [onlineHistorySyncing,setOnlineHistorySyncing]=React.useState(false);
 const [onlineTarget,setOnlineTarget]=React.useState<string>(()=>String(cfg.target||'20'));
 const [onlineRule,setOnlineRule]=React.useState<string>(()=>String(cfg.rule||'all'));
 const [onlineVisits,setOnlineVisits]=React.useState<number>(()=>Math.max(1,Number(cfg.visits||30)));
 const [onlineScope,setOnlineScope]=React.useState<'public'|'team'>('public');
 const [onlineTeamKey,setOnlineTeamKey]=React.useState('');
 const [onlineTeams,setOnlineTeams]=React.useState<ChallengeLeaderboardTeam[]>([]);
 const [onlineFiltersOpen,setOnlineFiltersOpen]=React.useState(false);
 const [detailOpen,setDetailOpen]=React.useState(historyStatsOnly);
 const [playersOpen,setPlayersOpen]=React.useState(false);
 const [detailTab,setDetailTab]=React.useState<string>(()=>String(params?.initialDetailTab||'global'));
 const [detailSection,setDetailSection]=React.useState<string>('PERFORMANCE');
 const [voiceOn,setVoiceOn]=React.useState(false);
 const [voiceHeard,setVoiceHeard]=React.useState('');
 const matchIdRef=React.useRef(String(params?.resumeId||resumeRecord?.matchId||resumeRecord?.id||`challenge-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
 const createdAtRef=React.useRef(Number(resumeRecord?.createdAt||resumeRecord?.created_at||Date.now())||Date.now());
 const lastPersistSignatureRef=React.useRef('');
 const trainingSavedRef=React.useRef(false);
 const onlineSubmittedRef=React.useRef(false);
 const onlineSubmittingRef=React.useRef(false);
 const onlineHistorySyncedRef=React.useRef(false);
 const totalMax=cfg.visits*3*safeParticipants.length;
 const done=log.length>=totalMax;
 const activeIndex=Math.floor(log.length/3)%safeParticipants.length;
 const current=safeParticipants[activeIndex];
 const currentLog=log.filter(e=>e.pid===current.id);
 const turn=Math.min(cfg.visits,Math.floor(currentLog.length/3)+1);
 const currentScore=currentLog.reduce((s,e)=>s+hitValue(e.hit,cfg.rule,cfg.target),0);
 const currentHits=currentLog.map(e=>e.hit);
 const counts=Object.fromEntries(hits.map(h=>[h,currentHits.filter(x=>x===h).length])) as Record<Hit,number>;
 const successful=currentHits.filter(h=>hitValue(h,cfg.rule,cfg.target)>0).length;
 const pct=Math.round(successful/Math.max(1,currentHits.length)*100);
 const participantScore=(p:Participant)=>log.filter(e=>e.pid===p.id).reduce((s,e)=>s+hitValue(e.hit,cfg.rule,cfg.target),0);
 const participantDarts=(p:Participant)=>log.filter(e=>e.pid===p.id).length;
 const streak=React.useMemo(()=>{let n=0;for(let i=currentLog.length-1;i>=0;i--){if(hitValue(currentLog[i].hit,cfg.rule,cfg.target)<=0)break;n++;}return n},[currentLog,cfg.rule,cfg.target]);
 const participantMaxStreak=(p:Participant)=>computeChallengeDetailedStats(log.filter(x=>x.pid===p.id),cfg).bestStreak;
 const participantStats=(p:Participant)=>{const detailed=computeChallengeDetailedStats(log.filter(e=>e.pid===p.id),cfg);return {score:detailed.score,darts:detailed.darts,hits:detailed.successful,misses:detailed.failures,pct:detailed.accuracy,streak:detailed.bestStreak,hitCounts:detailed.hitCounts,detailed};};
 const allowedHits=React.useMemo<Hit[]>(()=>{if(isBullMode(cfg.rule,cfg.target))return ['25','50','MISS'];if(cfg.rule==='single')return ['S','MISS'];if(cfg.rule==='double')return ['D','MISS'];if(cfg.rule==='triple')return ['T','MISS'];return ['S','D','T','MISS'];},[cfg.target,cfg.rule]);
 const add=React.useCallback((h:Hit)=>{if(done)return;setLog(v=>[...v,{hit:h,pid:safeParticipants[Math.floor(v.length/3)%safeParticipants.length].id}]);},[done,safeParticipants]);
 const lang=React.useMemo(()=>{try{return localStorage.getItem('dc_lang_v1')||navigator.language||'fr'}catch{return 'fr'}},[]);
 const startVoice=React.useCallback(()=>{const Ctor=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!Ctor){setVoiceHeard('Micro non supporté');return;}try{const rec=new Ctor();rec.lang=localeMap[String(lang).toLowerCase().split('-')[0]]||lang||'fr-FR';rec.interimResults=false;rec.maxAlternatives=5;rec.continuous=false;setVoiceOn(true);setVoiceHeard('…');rec.onresult=(ev:any)=>{const alternatives=Array.from(ev?.results?.[0]||[]) as any[];const heard=alternatives.map(a=>a?.transcript||'').filter(Boolean).join(' | ');setVoiceHeard(heard);const hit=parseChallengeVoice(heard,String(lang),allowedHits);if(hit)add(hit);else setVoiceHeard(`${heard} ?`);};rec.onerror=()=>setVoiceHeard('');rec.onend=()=>setVoiceOn(false);rec.start();}catch{setVoiceOn(false);}},[lang,allowedHits,add]);
 const standings=[...safeParticipants].sort((a,b)=>participantScore(b)-participantScore(a));
 const playerLabel=current.team?'ÉQUIPE ACTIVE':'JOUEUR ACTIF';
 const statsReturnTab=String(params?.returnTab||'history');
 const statsReturnParams=params?.returnParams;
 const statsReturnLabel=statsReturnTab==='challenge_leaderboard'?'RETOUR CLASSEMENT':'RETOUR HISTORIQUE';
 const closeDetail=React.useCallback(()=>{
  if(historyStatsOnly){go(statsReturnTab,statsReturnParams);return;}
  setDetailOpen(false);
 },[historyStatsOnly,go,statsReturnTab,statsReturnParams]);

 const buildChallengeRecord=React.useCallback((status:'in_progress'|'finished')=>{
  const now=Date.now();
  const targetSegment=(cfg.target==='bull'||cfg.target==='bull25'||cfg.target==='bull50')?25:Number(cfg.target)||20;
  const perPlayer=safeParticipants.map((p)=>{
   const entries=log.filter(e=>e.pid===p.id);
   const detailed=computeChallengeDetailedStats(entries,cfg);
   return {id:String(p.id),name:p.name,avatarDataUrl:(p.profile?avatarSrc(p.profile):teamSrc(p.team))||null,teamId:p.team?String(p.team.id||''):undefined,teamName:p.teamName||p.team?.name||'',score:detailed.score,points:detailed.score,darts:detailed.darts,dartsThrown:detailed.darts,hitCount:detailed.successful,misses:detailed.failures,bestStreak:detailed.bestStreak,bestVisit:detailed.bestVisit,avgVisit:detailed.avgVisit,successRate:detailed.accuracy,target:cfg.target,rule:cfg.rule,hitSummary:{S:detailed.hitCounts.S,D:detailed.hitCounts.D,T:detailed.hitCounts.T,SBull:detailed.hitCounts['25'],DBull:detailed.hitCounts['50'],MISS:detailed.hitCounts.MISS,darts:detailed.darts,hits:detailed.successful},positionStats:detailed.positionStats,visitScores:detailed.visitScores,cumulativeScores:detailed.cumulativeScores,favNumberHits:{[String(targetSegment)]:detailed.successful}};
  });
  const rankings=[...perPlayer].sort((a,b)=>b.score-a.score).map((row,index)=>({...row,rank:index+1}));
  const winnerId=status==='finished'&&safeParticipants.length>1?(rankings[0]?.id||null):null;
  const finalScores=Object.fromEntries(rankings.map(row=>[row.id,row.score]));
  const scoreLine=rankings.map(row=>`${row.name} ${row.score}`).join(' • ');
  const resumeState={log:[...log],entries:[...log],activePlayerIndex:activeIndex,turn,updatedAt:now};
  const summary={title:'CHALLENGE',kind:'challenge',mode:'challenge',status,finished:status==='finished',winnerId,scoreLine,finalScores,rankings,perPlayer:rankings,target:cfg.target,objective:targetLabel(cfg.target),rule:cfg.rule,visits:cfg.visits};
  const payload={kind:'challenge',mode:'challenge',sport:'darts',status,config:cfg,state:resumeState,entries:[...log],events:[...log],players:rankings,finalPlayers:rankings,summary:{...summary},stats:{kind:'challenge',mode:'challenge',players:rankings.map(row=>({id:row.id,name:row.name,score:row.score,points:row.score,best:row.score,bestScore:row.score,darts:row.darts,dartsThrown:row.darts,hitCount:row.hitCount,misses:row.misses,bestStreak:row.bestStreak,bestVisit:row.bestVisit,avgVisit:row.avgVisit,successRate:row.successRate,hitSummary:row.hitSummary,positionStats:row.positionStats,visitScores:row.visitScores,cumulativeScores:row.cumulativeScores,favNumberHits:row.favNumberHits,special:{score:row.score,points:row.score,best:row.score,bestScore:row.score,bestStreak:row.bestStreak,bestVisit:row.bestVisit,avgVisit:row.avgVisit,successRate:row.successRate,positionStats:row.positionStats,targetHits:row.hitCount,misses:row.misses,target:cfg.target,rule:cfg.rule}})),global:{matches:1,target:cfg.target,rule:cfg.rule,visits:cfg.visits}}};
  return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:'challenge',mode:'challenge',sport:'darts',status,createdAt:createdAtRef.current,updatedAt:now,finishedAt:status==='finished'?now:undefined,winnerId,players:safeParticipants.map(p=>({id:String(p.id),name:p.name,avatarDataUrl:(p.profile?avatarSrc(p.profile):teamSrc(p.team))||null,teamId:p.team?String(p.team.id||''):undefined,teamName:p.teamName||p.team?.name||''})),game:{mode:'challenge',target:cfg.target,objective:targetLabel(cfg.target),rule:cfg.rule,visits:cfg.visits,matchMode:cfg.matchMode||'solo'},summary,payload,resume:status==='in_progress'?{config:cfg,state:resumeState,livePayload:payload,summary}:undefined};
 },[activeIndex,cfg,log,safeParticipants,turn]);

 React.useEffect(()=>{
  if(historyStatsOnly||log.length===0) return;
  const status=done?'finished':'in_progress';
  const record:any=buildChallengeRecord(status);
  const signature=`${status}|${log.length}|${record?.summary?.scoreLine||''}`;
  if(lastPersistSignatureRef.current===signature) return;
  lastPersistSignatureRef.current=signature;
  void History.upsert(record).catch((error:any)=>console.warn('[challenge] history persistence failed',error));
 },[buildChallengeRecord,done,log.length,historyStatsOnly]);

 React.useEffect(()=>{
  if(historyStatsOnly||!done||trainingSavedRef.current||safeParticipants.length!==1) return;
  trainingSavedRef.current=true;
  const p=safeParticipants[0];
  const stats=participantStats(p);
  try{
   recordTrainingDetailedSession({id:`${matchIdRef.current}-training`,modeId:'training_challenges',participantId:p.profile?.id?String(p.profile.id):String(p.id),participantName:p.name,participantType:'player',startedAt:createdAtRef.current,endedAt:Date.now(),durationMs:Date.now()-createdAtRef.current,darts:stats.darts,hits:stats.hits,misses:stats.misses,points:stats.score,accuracyPct:stats.pct,success:stats.score>0,config:{...cfg,sourceMode:'challenge',challengeTarget:cfg.target,challengeRule:cfg.rule},metrics:{sourceMode:'challenge',score:stats.score,bestStreak:stats.streak,bestVisit:stats.detailed.bestVisit,avgVisit:stats.detailed.avgVisit,target:cfg.target,rule:cfg.rule,visits:cfg.visits,matchId:matchIdRef.current,bestDartPosition:(stats.detailed.positionStats.slice().sort((a,b)=>b.accuracy-a.accuracy)[0]?.position||0),bestDartAccuracy:(stats.detailed.positionStats.slice().sort((a,b)=>b.accuracy-a.accuracy)[0]?.accuracy||0),...Object.fromEntries(stats.detailed.positionStats.flatMap(pos=>[[`dart${pos.position}Attempts`,pos.attempts],[`dart${pos.position}Successful`,pos.successful],[`dart${pos.position}Accuracy`,pos.accuracy],[`dart${pos.position}S`,pos.S],[`dart${pos.position}D`,pos.D],[`dart${pos.position}T`,pos.T],[`dart${pos.position}B25`,pos.B25],[`dart${pos.position}B50`,pos.B50],[`dart${pos.position}MISS`,pos.MISS]]))},visitHistory:log,telemetry:{target:cfg.target,rule:cfg.rule,hits:stats.hitCounts,positionStats:stats.detailed.positionStats,visitScores:stats.detailed.visitScores,cumulativeScores:stats.detailed.cumulativeScores},telemetryCoverage:'exact'} as any);
  }catch(error){console.warn('[challenge] training stats persistence failed',error)}
 },[cfg,done,log,participantStats,safeParticipants,historyStatsOnly]);

 const refreshOnlineRanking=React.useCallback(async()=>{
  setOnlineRankingLoading(true);
  setOnlineRankingError('');
  try{
   const rows=await fetchChallengeLeaderboard(
    {target:onlineTarget,rule:onlineRule,visits:onlineVisits},
    100,
    onlineScope==='team'?{type:'team',teamKey:onlineTeamKey}:{type:'public'},
   );
   setOnlineRanking(rows);
  }catch(error:any){
   console.warn('[challenge] online leaderboard fetch failed',error);
   const message=String(error?.message||'');
   setOnlineRankingError(message.includes('PRIVATE_TEAM')?'Classement privé réservé aux membres de cette équipe.':'Classement online indisponible pour le moment.');
  }finally{
   setOnlineRankingLoading(false);
  }
 },[onlineTarget,onlineRule,onlineVisits,onlineScope,onlineTeamKey]);

 const refreshOnlineTeams=React.useCallback(async()=>{
  try{
   const remoteTeams=await listChallengeTeamScopes();
   setOnlineTeams(remoteTeams);
   if(!onlineTeamKey&&remoteTeams[0]) setOnlineTeamKey(remoteTeams[0].key);
   return remoteTeams;
  }catch(error){
   console.warn('[challenge] online team scopes failed',error);
   return [] as ChallengeLeaderboardTeam[];
  }
 },[onlineTeamKey]);

 React.useEffect(()=>{
  if(!rankOpen) return;
  let cancelled=false;
  void (async()=>{
   if(!onlineHistorySyncedRef.current){
    onlineHistorySyncedRef.current=true;
    setOnlineHistorySyncing(true);
    try{
     await syncChallengeHistoricalScores(profiles,teams);
    }catch(error){
     console.warn('[challenge] historical online leaderboard sync failed',error);
     onlineHistorySyncedRef.current=false;
    }finally{
     if(!cancelled)setOnlineHistorySyncing(false);
    }
   }
   const scopes=await refreshOnlineTeams();
   if(cancelled) return;
   if(onlineScope==='team'&&!onlineTeamKey){
    if(scopes[0]) setOnlineTeamKey(scopes[0].key);
    else {setOnlineRanking([]);setOnlineRankingLoading(false);return;}
   }
   await refreshOnlineRanking();
  })();
  return()=>{cancelled=true};
 },[rankOpen,onlineTarget,onlineRule,onlineVisits,onlineScope,onlineTeamKey,profiles,teams,refreshOnlineTeams,refreshOnlineRanking]);

 React.useEffect(()=>{
  if(historyStatsOnly||!done||onlineSubmittedRef.current||onlineSubmittingRef.current) return;
  onlineSubmittingRef.current=true;
  void (async()=>{
   try{
    const uid=await getChallengeOnlineUserId();
    if(!uid) return;
    const linked=safeParticipants.find((p:any)=>{
     const profile:any=p?.profile||{};
     const pi:any=profile?.privateInfo||profile?.private_info||{};
     return [pi?.onlineUserId,pi?.online_user_id,profile?.onlineUserId,profile?.userId].some(v=>String(v||'')===uid);
    }) || (safeParticipants.length===1?safeParticipants[0]:null);
    if(!linked) return;
    const stats=participantStats(linked);
    const profile:any=linked.profile||{};
    const pi:any=profile?.privateInfo||profile?.private_info||{};
    const myTeams=challengeTeamsForProfile(profile,teams);
    if(linked.team){
     const key=String(linked.team?.syncedClubTeamId||linked.team?.clubTeamId||linked.team?.onlineTeamId||linked.team?.id||'').trim();
     if(key&&!myTeams.some(team=>team.key===key)) myTeams.push({key,name:String(linked.teamName||linked.team?.name||'Équipe'),localId:String(linked.team?.id||'')||null});
    }
    const result=await submitChallengeBestScore({
     target:cfg.target,
     rule:cfg.rule,
     visits:cfg.visits,
     matchMode:cfg.matchMode||'solo',
     setMode:(cfg as any).setMode||null,
     setTarget:(cfg as any).setTarget||null,
     legMode:(cfg as any).legMode||null,
     legTarget:(cfg as any).legTarget||null,
     score:stats.score,
     darts:stats.darts,
     bestStreak:stats.streak,
     accuracy:stats.pct,
     matchId:matchIdRef.current,
     displayName:linked.name,
     avatarUrl:avatarSrc(profile)||null,
     countryCode:profile?.countryCode||profile?.country||pi?.countryCode||pi?.country||null,
     teams:myTeams,
    stats:{
     bestVisit:stats.detailed.bestVisit,
     avgVisit:stats.detailed.avgVisit,
     hitCounts:stats.detailed.hitCounts,
     positionStats:stats.detailed.positionStats,
     visitScores:stats.detailed.visitScores,
     cumulativeScores:stats.detailed.cumulativeScores,
     entries:log.filter(entry=>entry.pid===linked.id).map(entry=>({hit:entry.hit,pid:String(linked.id)})),
     score:stats.score,
     darts:stats.darts,
     bestStreak:stats.streak,
     accuracy:stats.pct,
    },
    });
    if(result.ok){
     onlineSubmittedRef.current=true;
     await refreshOnlineTeams();
     if(rankOpen) await refreshOnlineRanking();
    }
   }catch(error){
    console.warn('[challenge] online leaderboard submit failed',error);
   }finally{
    onlineSubmittingRef.current=false;
   }
  })();
 },[done,cfg.target,cfg.rule,cfg.visits,cfg.matchMode,safeParticipants,teams,rankOpen,refreshOnlineRanking,refreshOnlineTeams,historyStatsOnly]);

 const detailedByPlayer=React.useMemo(()=>safeParticipants.map(p=>({participant:p,stats:computeChallengeDetailedStats(log.filter(e=>e.pid===p.id),cfg)})),[safeParticipants,log,cfg]);
 const recordRows=React.useMemo(()=>safeParticipants.map(p=>({participant:p,raw:buildRecordRaw(log.filter(e=>e.pid===p.id),cfg)})),[safeParticipants,log,cfg]);
 const globalRecordCards=React.useMemo(()=>buildGlobalRecordCards(recordRows,cfg),[recordRows,cfg]);
 const globalDetailed=React.useMemo<ChallengeDetailedStats>(()=>{
  const parts=detailedByPlayer.map(x=>x.stats);
  const fallback=computeChallengeDetailedStats([],cfg);
  if(!parts.length) return fallback;
  const hitCounts=Object.fromEntries(hits.map(h=>[h,Math.max(0,...parts.map(st=>Number(st.hitCounts[h]||0)))])) as Record<Hit,number>;
  const positionStats=[0,1,2].map(index=>{
   const rows=parts.map(st=>st.positionStats[index]).filter(Boolean);
   const best=rows.slice().sort((a,b)=>b.accuracy-a.accuracy)[0]||fallback.positionStats[index];
   return {...best,position:index+1};
  });
  const maxVisits=Math.max(0,...parts.map(st=>st.cumulativeScores.length));
  const cumulativeScores=Array.from({length:maxVisits},(_,i)=>Math.max(0,...parts.map(st=>Number(st.cumulativeScores[i]||0))));
  const visitScores=Array.from({length:maxVisits},(_,i)=>Math.max(0,...parts.map(st=>Number(st.visitScores[i]||0))));
  return {
   score:Math.max(0,...parts.map(st=>st.score)),
   darts:Math.max(0,...parts.map(st=>st.darts)),
   successful:Math.max(0,...parts.map(st=>st.successful)),
   failures:Math.min(...parts.map(st=>st.failures)),
   accuracy:Math.max(0,...parts.map(st=>st.accuracy)),
   bestStreak:Math.max(0,...parts.map(st=>st.bestStreak)),
   bestVisit:Math.max(0,...parts.map(st=>st.bestVisit)),
   avgVisit:Math.max(0,...parts.map(st=>st.avgVisit)),
   hitCounts,positionStats,visitScores,cumulativeScores
  };
 },[detailedByPlayer,cfg]);
 const overrideDetailed=React.useMemo(()=>onlineDetailedStatsOverride(onlineStatsOverride,cfg),[onlineStatsOverride,cfg]);
 const overrideRecordRaw=React.useMemo(()=>overrideDetailed?onlineRecordRawOverride(onlineStatsOverride,cfg,overrideDetailed):null,[onlineStatsOverride,cfg,overrideDetailed]);
 const detailCurrent=(detailTab==='global'||detailTab==='match')?null:(detailedByPlayer.find(x=>x.participant.id===detailTab)||detailedByPlayer[0]||null);
 const detailStats=(historyStatsOnly&&safeParticipants.length===1&&overrideDetailed)?overrideDetailed:(detailCurrent?.stats||globalDetailed);
 const isSoloDetailView=safeParticipants.length===1;
 const detailRecordCards=React.useMemo(()=>{
  if(historyStatsOnly&&safeParticipants.length===1&&overrideRecordRaw)return makeRecordCards(overrideRecordRaw,cfg,String(safeParticipants[0]?.name||'Joueur').toUpperCase());
  if(detailTab==='global'||detailTab==='match')return globalRecordCards;
  const row=recordRows.find(x=>x.participant.id===detailTab)||recordRows[0];
  return row?makeRecordCards(row.raw,cfg):globalRecordCards;
 },[historyStatsOnly,safeParticipants,overrideRecordRaw,detailTab,globalRecordCards,recordRows,cfg]);
 const bestDartPosition=detailStats.positionStats.slice().sort((a,b)=>b.accuracy-a.accuracy)[0];
 const detailRecordGroups=React.useMemo(()=>Array.from(new Set(detailRecordCards.map(card=>card.group))),[detailRecordCards]);
 const detailSectionTabs=React.useMemo(()=>[...detailRecordGroups,'ANALYSE','FLÉCHETTES','VOLÉES'],[detailRecordGroups]);
 const selectedOnlineTeam=onlineTeams.find(team=>team.key===onlineTeamKey)||null;


 return <div className="cp" style={{background:theme.bg,color:theme.text}}>
  <header className="cp-head">
   <div className="cp-back"><BackDot onClick={()=>historyStatsOnly?go(statsReturnTab,statsReturnParams):go('challenge_config')} size={44} color="#35e9ff" glow="#35e9ff77"/></div>
   <img className="cp-ticker" src="/challenge/ticker_challenge.png" alt="Challenge"/>
   <button className="cp-awena" type="button" aria-label="Ouvrir Awena" title="Awena" onClick={()=>awena?.openPanel?.()}><span><img src="/awena/awena-avatar.webp" alt="Awena"/></span><i aria-hidden>🎙</i></button>
  </header>

  <main className="cp-layout">
   <section className="cp-left">
    {safeParticipants.length>1&&<div className="challenge-roster portrait-only">{safeParticipants.map((p,i)=><div key={p.id} title={p.name} aria-label={`${p.name} : ${participantScore(p)} points`} className={i===activeIndex?'active':''}><span className="roster-avatar"><ChallengeAvatar participant={p} size={30}/></span><strong>{participantScore(p)}</strong></div>)}</div>}
    <div className="player">
     {current.team&&<div className="player-team-bg" aria-hidden="true"><ResolvedTeamLogo team={current.team}/></div>}
     <div className="player-avatar-wrap">
      <div className="player-avatar"><ChallengeAvatar participant={current} size={68}/></div>
      <div className="player-avatar-label"><b style={{color:theme.primary}}>{String(current.name||'Joueur').toUpperCase()}</b>{current.teamName?<span>{current.teamName}</span>:null}</div>
     </div>
     <div className="player-meta landscape-player-meta" aria-hidden="true" />
     <div className="player-score"><small>SCORE</small><b>{currentScore}</b></div>
     <div className="player-objective"><img src={targetBoards[cfg.target]||target20} alt={`Objectif ${targetLabel(cfg.target)}`}/><b className="player-objective-value">{targetLabel(cfg.target)}</b><span>OBJECTIF</span></div>
    </div>
    <div className="player-context-strip landscape-only"><span>TOUR <b>{done?cfg.visits:turn}</b> / {cfg.visits}</span><strong>{safeParticipants.length} {safeParticipants.length>1?'JOUEURS':'JOUEUR'}</strong></div>
    <div className="left-kpis landscape-only"><div><span>RÉUSSITE</span><b>{pct}%</b></div><div><span>SUITE</span><b>{streak}</b></div><div><span>FLÉCHETTES</span><b>{currentLog.length}/{cfg.visits*3}</b></div></div>
    <div className="left-actions landscape-only"><button type="button" onClick={()=>setRankOpen(true)}><span>◎</span><b>ONLINE</b></button><div><span>RECORD SUITE</span><b>{participantMaxStreak(current)}</b></div></div>
    {safeParticipants.length>1&&<div className="player-list landscape-only"><div className="player-list-title"><b>JOUEURS</b><span>{safeParticipants.length}</span></div><div className="player-list-scroll">{safeParticipants.map((p,i)=><div key={p.id} className={'player-row '+(i===activeIndex?'active':'')}><div className="list-team-bg">{p.team?<ResolvedTeamLogo team={p.team}/>:null}</div><span className="list-avatar"><ChallengeAvatar participant={p} size={34}/></span><span className="list-name"><b>{p.name}</b>{p.teamName?<small>{p.teamName}</small>:null}</span><span className="list-score"><b>{participantScore(p)}</b><small>{participantDarts(p)} fl.</small></span></div>)}</div></div>}
   </section>

   <section className="cp-board">
    <div className="board-caption"><span>OBJECTIF</span><b>{targetLabel(cfg.target)}</b></div>
    <div className="board-media"><img src={targetBoards[cfg.target]||target20} alt={`Objectif ${targetLabel(cfg.target)}`}/><div className="board-glow"/></div>
   </section>

   <aside className="cp-right">
    <div className="turn-banner portrait-only"><span>TOUR</span><b>{done?cfg.visits:turn}</b><i>/ {cfg.visits}</i><em className="turn-player-count">{safeParticipants.length} {safeParticipants.length>1?'JOUEURS':'JOUEUR'}</em></div>
    <div className="portrait-stats-wrap portrait-only"><div className="portrait-stats"><div className="ps-title"><strong>STATS CHALLENGE</strong><button type="button" className="online-rank" aria-label="Classement online" onClick={()=>setRankOpen(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9"/></svg></button></div><div className="ps-kpis"><div><span>SCORE</span><b>{currentScore}</b></div><div><span>RÉUSSITE</span><b>{pct}%</b></div><div><span>FLÉCHETTES</span><b>{currentLog.length}/{cfg.visits*3}</b></div><div><span>SUITE</span><b>{streak}</b></div></div><div className="ps-hits">{allowedHits.map(h=><div className={'psh '+h} key={h}><span>{h}</span><b>{counts[h]}</b></div>)}</div></div><button type="button" className="match-detail-trigger" onClick={()=>{setDetailTab('global');setDetailSection('PERFORMANCE');setDetailOpen(true)}}>STATS DÉTAILLÉES <span>↗</span></button></div>
    {safeParticipants.length>1&&<button type="button" className="players-launch portrait-only" onClick={()=>setPlayersOpen(true)} aria-label="Ouvrir la liste des joueurs">
     <img src="/challenge/ticker_challenge.png" alt="" aria-hidden="true"/>
     <span className="players-launch-shade"/>
     <b>JOUEURS</b>
     <span className="players-launch-avatars">{safeParticipants.slice(0,4).map(p=><i key={p.id}><ChallengeAvatar participant={p} size={28}/></i>)}</span>
     <strong>{safeParticipants.length}</strong>
    </button>}
    <button type="button" className="landscape-stats landscape-only stats-hit-open" onClick={()=>{setDetailTab('global');setDetailSection('PERFORMANCE');setDetailOpen(true)}}><h2>STATS HITS <span>↗</span></h2><div className="hitstats">{hits.map(h=><div className={'hs '+h} key={h}><b>{h}<small>{h==='S'?' ×1':h==='D'?' ×2':h==='T'?' ×3':''}</small></b><strong>{counts[h]}</strong></div>)}</div></button>
    <div className="input-tools"><button className="undo" disabled={!log.length} onClick={()=>setLog(v=>v.slice(0,-1))}>↶ <span>ANNULER</span></button><button className={'voice '+(voiceOn?'listening':'')} type="button" onClick={startVoice} aria-label="Saisie vocale"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg><span>{voiceOn?'ÉCOUTE…':'VOCAL'}</span></button></div>
    <div className={'keypad keys-'+allowedHits.length}>{allowedHits.map(h=><button className={h} key={h} disabled={done} onClick={()=>add(h)}><b>{h==='25'?'BULL 25':h==='50'?'BULL 50':h}</b><span>{h==='S'?'×1':h==='D'?'×2':h==='T'?'×3':h==='25'?'×1':h==='50'?'×2':'×'}</span></button>)}</div>
    <div className="sr-only" aria-live="polite">{voiceHeard}</div>
   </aside>
  </main>


  {playersOpen&&<div className="players-modal" onClick={()=>setPlayersOpen(false)}><div className="players-modal-card" onClick={e=>e.stopPropagation()}>
   <div className="players-modal-head"><img src="/challenge/ticker_challenge.png" alt=""/><span/><b>JOUEURS</b><strong>{safeParticipants.length}</strong><button type="button" onClick={()=>setPlayersOpen(false)}>×</button></div>
   <div className="players-modal-list">{safeParticipants.map((p,i)=><div key={p.id} className={'players-modal-row '+(i===activeIndex?'active':'')}>
    {p.team&&<div className="players-modal-team-bg"><ResolvedTeamLogo team={p.team}/></div>}
    <span className="players-modal-avatar"><ChallengeAvatar participant={p} size={42}/></span>
    <span className="players-modal-name"><b style={{color:i===activeIndex?theme.primary:undefined}}>{String(p.name||'Joueur').toUpperCase()}</b>{p.teamName?<small>{p.teamName}</small>:null}</span>
    <span className="players-modal-score"><b>{participantScore(p)}</b><small>{participantDarts(p)} fl.</small></span>
   </div>)}</div>
  </div></div>}

  {detailOpen&&<div className="match-detail-modal" onClick={closeDetail}><div className="match-detail-card advanced" onClick={e=>e.stopPropagation()}>
   {safeParticipants.length===2&&(()=>{const left=safeParticipants[0],right=safeParticipants[1],a=participantStats(left),b=participantStats(right);return <div className="match-detail-top tall redesigned">
    <div className="match-side-panel match-side-panel-left">
     {left.team&&<div className="match-side-panel-bg"><ResolvedTeamLogo team={left.team}/></div>}
     <div className="match-side-panel-avatar"><ChallengeAvatar participant={left} size={72}/></div>
     <b style={{color:theme.primary}}>{String(left.name||'Joueur').toUpperCase()}</b>
     {(left.teamName||left.team?.name)?<small>{left.teamName||left.team?.name}</small>:null}
    </div>
    <div className="match-center-scoreboard">
     <small>CHALLENGE</small>
     <div className="match-score-boxes"><strong>{a.score}</strong><strong>{b.score}</strong></div>
     <em>OBJECTIF {targetLabel(cfg.target)}</em>
    </div>
    <div className="match-side-panel match-side-panel-right">
     {right.team&&<div className="match-side-panel-bg"><ResolvedTeamLogo team={right.team}/></div>}
     <div className="match-side-panel-avatar"><ChallengeAvatar participant={right} size={72}/></div>
     <b style={{color:theme.primary}}>{String(right.name||'Joueur').toUpperCase()}</b>
     {(right.teamName||right.team?.name)?<small>{right.teamName||right.team?.name}</small>:null}
    </div>
   </div>})()}
   <div className="detail-tabs baby-match-tabs">
    {safeParticipants.length===2&&<button type="button" className={'detail-tab-match '+(detailTab==='match'?'on':'')} onClick={()=>{setDetailTab('match');setDetailSection('PERFORMANCE')}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v14H4zM14 5h6v14h-6zM10 12h4"/></svg><span>DÉTAIL MATCH</span></button>}
    {isSoloDetailView?
     <button type="button" className="detail-tab-solo on" onClick={()=>{setDetailTab('global');setDetailSection('PERFORMANCE')}} aria-label="Stats du joueur">
      <span className="detail-tab-avatar"><ChallengeAvatar participant={safeParticipants[0]} size={40}/></span>
      <span>STATS</span>
     </button>
    :<>
     <button type="button" className={'detail-tab-main '+(detailTab==='global'?'on':'')} onClick={()=>{setDetailTab('global');setDetailSection('PERFORMANCE')}} aria-label="Records de la partie"><svg className="detail-stats-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V7M10 20V4M16 20v-6M22 20V9"/></svg><span>RECORDS</span></button>
     {safeParticipants.map(p=><button type="button" key={p.id} className={'detail-tab-player '+(detailTab===p.id?'on':'')} onClick={()=>{setDetailTab(p.id);setDetailSection('PERFORMANCE')}} title={p.name}><span className="detail-tab-avatar"><ChallengeAvatar participant={p} size={40}/></span>{detailTab===p.id&&<b style={{color:theme.primary}}>{String(p.name||'Joueur').toUpperCase()}</b>}</button>)}
    </>}
   </div>
   {detailTab==='match'&&safeParticipants.length===2?(()=>{const left=safeParticipants[0],right=safeParticipants[1],a=participantStats(left),b=participantStats(right);const rows=[['SCORE',a.score,b.score],['RÉUSSITE',`${a.pct}%`,`${b.pct}%`],['FLÉCHETTES',`${a.darts}/${cfg.visits*3}`,`${b.darts}/${cfg.visits*3}`],['SUITE MAX',a.streak,b.streak],['BEST VOLÉE',a.detailed.bestVisit,b.detailed.bestVisit],['MOY. / VOLÉE',a.detailed.avgVisit.toFixed(1),b.detailed.avgVisit.toFixed(1)],['S',a.hitCounts.S,b.hitCounts.S],['D',a.hitCounts.D,b.hitCounts.D],['T',a.hitCounts.T,b.hitCounts.T],['BULL 25',a.hitCounts['25'],b.hitCounts['25']],['BULL 50',a.hitCounts['50'],b.hitCounts['50']],['MISS',a.hitCounts.MISS,b.hitCounts.MISS]] as Array<[string,React.ReactNode,React.ReactNode]>;return <div className="detail-scroll detail-match-scroll"><div className="match-compare restored">{rows.map(([label,leftValue,rightValue])=><div className="match-compare-row" key={label}><strong>{leftValue}</strong><span>{label}</span><strong>{rightValue}</strong></div>)}</div></div>})():<div className="detail-scroll compact-detail-scroll">
    <div className="records-head"><strong>{isSoloDetailView?`STATS · ${String(safeParticipants[0]?.name||'JOUEUR').toUpperCase()}`:detailTab==='global'?'STATS DE LA PARTIE':`STATS · ${String(detailCurrent?.participant?.name||'JOUEUR').toUpperCase()}`}</strong><span>Les groupes sont rangés par onglets pour limiter le scroll.</span></div>
    <div className="detail-section-tabs">{detailSectionTabs.map(section=><button type="button" key={section} className={detailSection===section?'on':''} onClick={()=>setDetailSection(section)}>{section}</button>)}</div>
    {detailRecordGroups.includes(detailSection)&&<><ChallengeRecordGrid cards={detailRecordCards} group={detailSection}/><div className="records-legend"><span><i style={{background:RECORD_COLORS.green}}/>75–100% · TOP</span><span><i style={{background:RECORD_COLORS.yellow}}/>50–75% · BON</span><span><i style={{background:RECORD_COLORS.orange}}/>25–50% · MOYEN</span><span><i style={{background:RECORD_COLORS.red}}/>0–25% · FAIBLE</span></div></>}
    {detailSection==='ANALYSE'&&<section className="visual-analysis"><h3>ANALYSE VISUELLE</h3><div className="detail-kpis"><div><span>SCORE</span><b>{detailStats.score}</b></div><div><span>PRÉCISION</span><b>{detailStats.accuracy.toFixed(1)}%</b></div><div><span>SUITE MAX</span><b>{detailStats.bestStreak}</b></div><div><span>BEST VOLÉE</span><b>{detailStats.bestVisit}</b></div><div><span>MOY. / VOLÉE</span><b>{detailStats.avgVisit.toFixed(1)}</b></div><div><span>MEILLEURE FLÉCHETTE</span><b>{bestDartPosition?`#${bestDartPosition.position} · ${bestDartPosition.accuracy.toFixed(1)}%`:'—'}</b></div></div><div className="detail-grid"><section><h3>RÉPARTITION S / D / T / BULL / MISS</h3><Donut stats={detailStats}/></section><section><h3>ÉVOLUTION DU SCORE</h3><MiniLine values={detailStats.cumulativeScores}/></section></div></section>}
    {detailSection==='FLÉCHETTES'&&<section className="position-section standalone"><h3>PRÉCISION PAR FLÉCHETTE</h3><div className="position-grid">{detailStats.positionStats.map(pos=><div className="position-card" key={pos.position}><div className="position-head"><b>FLÉCHETTE {pos.position}</b><strong>{pos.accuracy.toFixed(1)}%</strong></div><div className="position-bar"><i style={{width:`${Math.min(100,pos.accuracy)}%`}}/></div><div className="position-rings"><span>S <b>{pos.attempts?((pos.S/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.S}</em></span><span>D <b>{pos.attempts?((pos.D/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.D}</em></span><span>T <b>{pos.attempts?((pos.T/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.T}</em></span><span>25 <b>{pos.attempts?((pos.B25/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.B25}</em></span><span>50 <b>{pos.attempts?((pos.B50/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.B50}</em></span><span>MISS <b>{pos.attempts?((pos.MISS/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.MISS}</em></span></div></div>)}</div></section>}
    {detailSection==='VOLÉES'&&<section className="visits-section standalone"><h3>POINTS PAR VOLÉE</h3><div className="visit-bars">{detailStats.visitScores.map((value,index)=>{const max=Math.max(1,...detailStats.visitScores);return <div key={index}><i style={{height:`${Math.max(3,(value/max)*100)}%`}}/><span>{index+1}</span><b>{value}</b></div>})}</div></section>}
   </div>}
   <button type="button" className="match-detail-close" onClick={closeDetail}>{historyStatsOnly?statsReturnLabel:'FERMER'}</button>
  </div></div>}
  {rankOpen&&<div className="stats-modal" onClick={()=>setRankOpen(false)}><div className="stats-modal-card online-challenge-card" onClick={e=>e.stopPropagation()}>
   <div className="stats-modal-head"><div><strong>CLASSEMENT ONLINE CHALLENGE</strong><span>Une seule ligne par joueur : son meilleur score pour cette configuration comparable.</span></div><button onClick={()=>setRankOpen(false)}>×</button></div>
   <div className="online-ranking-toolbar"><div className="online-filter-summary"><b>🎯 {targetLabel(onlineTarget)}</b><b>🔁 {onlineVisits} TOURS</b><b>✦ {ruleLabel(onlineRule)}</b><b>{onlineScope==='team'?'🛡️':'🌍'} {onlineScope==='team'?(selectedOnlineTeam?.name||'ÉQUIPE OFFICIELLE'):'PUBLIC'}</b></div><button type="button" className="online-filter-trigger" onClick={()=>setOnlineFiltersOpen(true)} aria-label="Filtres"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="12" cy="18" r="1.8"/></svg><span>FILTRES</span></button></div>
   {onlineScope==='team'&&<div className="online-official-team-note">✓ ÉQUIPE OFFICIELLE · accès vérifié par Organisation MSS</div>}
   {onlineHistorySyncing&&<div className="online-history-sync">↻ SYNCHRONISATION DES ANCIENNES PARTIES CHALLENGE…</div>}
   {onlineRankingLoading?<div className="online-rank-state">CHARGEMENT DU CLASSEMENT…</div>:onlineRankingError?<div className="online-rank-state error">{onlineRankingError}</div>:onlineRanking.length===0?<div className="online-rank-state">Aucun score publié pour cette combinaison de filtres.</div>:<div className="rank-list online-rank-list">{onlineRanking.map(row=><div key={row.userId}>
    <strong>#{row.rank}</strong>
    <span className="online-rank-player">{row.avatarUrl?<img src={row.avatarUrl} alt=""/>:<i>{String(row.displayName||'?').slice(0,1).toUpperCase()}</i>}<span>{row.displayName}</span></span>
    <b>{row.score} pts</b>
    <em>{row.darts} fl. · suite {row.bestStreak} · {row.accuracy.toFixed(1)}% · {row.playedCount} partie{row.playedCount>1?'s':''}</em>
   </div>)}</div>}
   <div className="online-ranking-actions"><button className="online-open" onClick={()=>void (async()=>{setOnlineHistorySyncing(true);try{await syncChallengeHistoricalScores(profiles,teams);onlineHistorySyncedRef.current=true;await refreshOnlineTeams();await refreshOnlineRanking()}finally{setOnlineHistorySyncing(false)}})()}>↻ SYNCHRONISER</button><button className="online-open full" onClick={()=>go('challenge_leaderboard',{from:'challenge_play',target:onlineTarget,rule:onlineRule,visits:onlineVisits})}>🏆 CLASSEMENT COMPLET & STATS</button></div>
   {onlineFiltersOpen&&<div className="online-filter-picker" onClick={()=>setOnlineFiltersOpen(false)}><div className="online-filter-picker-card" onClick={e=>e.stopPropagation()}><header><div><strong>FILTRES</strong><span>SOLO / DUO / MULTI sont regroupés : la performance est individuelle.</span></div><button onClick={()=>setOnlineFiltersOpen(false)}>×</button></header><section><h3>CLASSEMENT</h3><div><button className={onlineScope==='public'?'on':''} onClick={()=>setOnlineScope('public')}>🌍 PUBLIC</button><button className={onlineScope==='team'?'on':''} onClick={()=>setOnlineScope('team')} disabled={!onlineTeams.length}>🛡️ ÉQUIPE OFFICIELLE</button></div></section>{onlineScope==='team'&&<section><h3>ÉQUIPE OFFICIELLE</h3><div>{onlineTeams.length?onlineTeams.map(team=><button key={team.key} className={onlineTeamKey===team.key?'on':''} onClick={()=>setOnlineTeamKey(team.key)}><b>✓ {team.name}</b><small>{team.organizationName||'Organisation MSS'}</small></button>):<em>Aucune équipe officielle. Affecte ton compte à une équipe Darts dans une Organisation MSS.</em>}</div></section>}<section><h3>🎯 CIBLE</h3><div>{onlineTargetFilters.map(value=><button key={value} className={onlineTarget===value?'on':''} onClick={()=>setOnlineTarget(value)}>{targetLabel(value)}</button>)}</div></section><section><h3>🔁 TOURS</h3><div>{onlineVisitFilters.map(value=><button key={value} className={onlineVisits===value?'on':''} onClick={()=>setOnlineVisits(value)}>{value}</button>)}</div></section><section><h3>✦ HITS</h3><div>{onlineRuleFilters.map(value=><button key={value} className={onlineRule===value?'on':''} onClick={()=>setOnlineRule(value)}>{ruleLabel(value)}</button>)}</div></section><footer><button onClick={()=>{setOnlineFiltersOpen(false);void refreshOnlineRanking()}}>APPLIQUER</button></footer></div></div>}
  </div></div>}
  {done&&!historyStatsOnly&&<div className="finish"><h2>CHALLENGE TERMINÉ</h2><strong>{standings[0]?participantScore(standings[0]):0} POINTS</strong><span className="finish-streak">MEILLEURE SUITE : {standings[0]?participantMaxStreak(standings[0]):0}</span><div className="finish-scoreline">{standings.map((p,i)=>{const st=participantStats(p).detailed;const bestPos=st.positionStats.slice().sort((a,b)=>b.accuracy-a.accuracy)[0];return <div className="finish-score-row" key={p.id}><span>{i+1}. {p.name}</span><b>{participantScore(p)} pts</b><em>{participantDarts(p)} fl. · précision {st.accuracy.toFixed(1)}% · suite {st.bestStreak} · best volée {st.bestVisit} · flèche #{bestPos?.position||'—'} {bestPos?bestPos.accuracy.toFixed(1):'0.0'}%</em></div>})}</div><div className="finish-actions"><button className="finish-stats" onClick={()=>{setDetailTab('global');setDetailSection('PERFORMANCE');setDetailOpen(true)}}>STATS DÉTAILLÉES</button><button onClick={()=>go('challenge_config')}>REJOUER</button><button className="finish-menu" onClick={()=>go('games')}>MENU PRINCIPAL</button></div></div>}
  <style>{css}</style>
 </div>;
}

const css=`
.cp{width:100%;height:calc(var(--vh,1vh)*100);min-height:0;box-sizing:border-box;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr);gap:6px;padding:max(5px,env(safe-area-inset-top,0px)) max(6px,env(safe-area-inset-right,0px)) max(6px,env(safe-area-inset-bottom,0px)) max(6px,env(safe-area-inset-left,0px));background-image:radial-gradient(circle at 48% 28%,#2b0b0f 0,#080b10 48%,#020305 100%)!important}.portrait-only{display:none!important}.landscape-only{display:block}.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.cp-head{height:58px;min-height:0;max-width:1500px;width:100%;margin:auto;position:relative;display:flex;align-items:center;justify-content:center;border:1px solid #536174;border-radius:14px;background:linear-gradient(180deg,#0c1119,#05070b);box-shadow:inset 0 0 24px #000,0 6px 20px #0009;overflow:hidden}.cp-back{position:absolute;left:8px;top:50%;transform:translateY(-50%);z-index:4}.cp-head-title{display:none}.cp-ticker{display:block;width:min(430px,58%);height:52px;object-fit:contain;object-position:center;position:relative;z-index:1}.cp-awena{position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:4;width:48px;height:48px;flex:0 0 48px;border-radius:50%;padding:3px;border:none;background:conic-gradient(#3dff96,#33d8ff,#ff4cc8,#3dff96);box-shadow:0 0 16px rgba(51,216,255,.34),0 8px 22px rgba(0,0,0,.42);cursor:pointer}.cp-awena>span{width:100%;height:100%;border-radius:50%;overflow:hidden;display:block;background:#060815}.cp-awena img{width:100%;height:100%;object-fit:cover;display:block}.cp-awena i{position:absolute;right:-2px;bottom:-2px;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:#11172a;border:1px solid rgba(255,255,255,.18);color:#fff;font-size:10px;font-style:normal;box-shadow:0 4px 10px rgba(0,0,0,.45)}
.cp-layout{width:min(1500px,100%);height:100%;min-height:0;margin:auto;display:grid;grid-template-columns:24fr 36fr 40fr;gap:8px;overflow:hidden}.cp-left,.cp-right,.cp-board{min-width:0;min-height:0;border:1px solid #46576b;border-radius:15px;background:linear-gradient(160deg,#0b1119f7,#05070bf7);box-shadow:inset 0 0 28px #0008,0 10px 25px #0008}.cp-left{padding:10px;display:flex;flex-direction:column;gap:7px;overflow:hidden}.cp-right{padding:10px;display:flex;flex-direction:column;gap:7px;overflow:hidden;background:linear-gradient(160deg,#0a1018fa,#05070bfa)}
.player{position:relative;overflow:hidden;display:grid;grid-template-columns:clamp(54px,7vw,74px) minmax(0,1fr) auto;gap:8px;align-items:center;min-height:clamp(88px,16vh,118px);padding:8px;border:1px solid #ff343466;border-radius:14px;background:linear-gradient(100deg,#0b1119,#090b10);box-shadow:inset 0 0 16px #000}.player>*:not(.player-team-bg){position:relative;z-index:2}.player-team-bg{position:absolute!important;z-index:0!important;inset:5px 40% 5px 7%;display:flex;align-items:center;justify-content:center;opacity:.24;pointer-events:none;filter:saturate(1.12) contrast(1.04)}.player-team-bg img{width:100%;height:100%;max-width:86%;object-fit:contain;object-position:center}.player-avatar{width:clamp(54px,7vw,74px);height:clamp(54px,7vw,74px);border-radius:50%;overflow:hidden;display:grid;place-items:center;border:2px solid #566273;background:#101722;box-shadow:0 0 0 2px #0008,0 0 14px #ff343422}.player-avatar>*{width:100%!important;height:100%!important}.challenge-avatar-img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%}.challenge-avatar-fallback{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;background:#151d28;color:#fff;font-size:clamp(19px,4vw,32px);font-weight:1000}.player-meta{min-width:0;display:flex;flex-direction:column}.player-meta small,.player-score small{font-size:8px;color:#99a5b5;font-weight:950;letter-spacing:.7px}.player-meta>b{font-size:clamp(16px,2.4vw,25px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-meta>span{font-size:8px;color:#8e9bad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-meta em{font-size:8px;color:#ff5252;font-style:normal;font-weight:950}.player-meta i{margin-top:5px;font-size:9px;color:#c2cad7;font-style:normal;font-weight:950}.player-score{min-width:64px;padding-left:8px;border-left:1px solid #303a48;text-align:center;display:flex;flex-direction:column}.player-score b{font-size:clamp(25px,4vw,40px);line-height:1;color:#fff}
.left-kpis{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.left-kpis>div{min-height:54px;border:1px solid #2c3949;border-radius:11px;background:#080e16;display:flex;flex-direction:column;align-items:center;justify-content:center}.left-kpis span{font-size:7px;color:#92a0b0;font-weight:950}.left-kpis b{font-size:clamp(16px,2vw,24px)}.left-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:5px}.left-actions>button,.left-actions>div{min-height:46px;border:1px solid #334153;border-radius:10px;background:#091019;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px}.left-actions button{cursor:pointer;border-color:#24dfff66;color:#36eaff}.left-actions span{font-size:8px;font-weight:950}.left-actions b{font-size:11px}.player-list{display:flex!important;flex:1;min-height:0;flex-direction:column;border:1px solid #303d4d;border-radius:12px;background:#070c12;overflow:hidden}.player-list-title{height:32px;flex:0 0 32px;padding:0 8px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #263241}.player-list-title b{font-size:9px;color:#ff4c53;letter-spacing:.8px}.player-list-title span{font-size:9px;color:#9da9b9}.player-list-scroll{min-height:0;overflow:auto;padding:5px;display:grid;gap:4px}.player-row{min-height:43px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:6px;align-items:center;padding:4px 5px;border:1px solid #263241;border-radius:9px;background:#0a1018;opacity:.74}.player-row.active{opacity:1;border-color:#ff3b43;box-shadow:0 0 12px #ff273322}.list-avatar{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center}.list-avatar>*{width:100%!important;height:100%!important}.list-name{min-width:0}.list-name b{display:block;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.list-name small{display:block;font-size:7px;color:#8996a7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.list-score{text-align:right}.list-score b{display:block;font-size:13px;color:#ff555b}.list-score small{display:block;font-size:7px;color:#8f9cac}
.cp-board{padding:8px;display:grid;grid-template-rows:auto minmax(0,1fr);gap:4px;overflow:hidden;background:radial-gradient(circle at 50% 46%,#311013 0,#0a0e14 57%,#030405 100%)}.board-caption{position:relative;z-index:4;min-height:46px;display:flex;align-items:baseline;justify-content:center;gap:10px;padding:5px 14px;border:1px solid #ff343477;border-radius:12px;background:#05080ddd;box-shadow:0 0 20px #ff202033}.board-caption span{color:#a5b0bf;font-size:clamp(12px,1.5vw,20px);font-weight:950;letter-spacing:1.5px}.board-caption b{font-size:clamp(26px,3vw,42px);line-height:1;color:#ff3d45;text-shadow:0 0 12px #ff2020}.board-media{position:relative;min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden}.board-media img{position:relative;z-index:2;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;filter:drop-shadow(0 18px 25px #000d) drop-shadow(0 0 22px #ff242455)}.board-glow{position:absolute;z-index:1;inset:8% 10%;border-radius:50%;box-shadow:0 0 70px #ff1d2522;pointer-events:none}
.landscape-turn{display:flex!important;align-items:baseline;justify-content:center;gap:7px;min-height:38px;padding:4px 8px;border:1px solid #4b2630;border-radius:10px;background:linear-gradient(90deg,#10090c,#201014,#10090c);box-shadow:inset 0 0 14px #0008}.landscape-turn span{font-size:11px;color:#b2bdcb;font-weight:1000;letter-spacing:1px}.landscape-turn b{font-size:clamp(22px,2.4vw,34px);line-height:1;color:#ff4048;text-shadow:0 0 12px #ff232366}.landscape-turn i{font-size:clamp(13px,1.4vw,19px);font-style:normal;font-weight:1000;color:#fff}.landscape-stats{display:block!important;width:100%;padding:0;border:0;background:transparent;color:inherit;text-align:inherit;cursor:pointer}.landscape-stats h2{text-align:center;margin:0 0 5px;padding:0 0 5px;border-bottom:1px solid #3b4654;font-size:clamp(12px,1.5vw,20px);letter-spacing:1px}.landscape-stats h2 span{color:#ff5258;font-size:.7em;margin-left:5px}.stats-hit-open:hover{filter:brightness(1.08)}.hitstats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.hs{min-width:0;min-height:54px;padding:5px 2px;border-radius:9px;background:linear-gradient(180deg,#101722,#080c12);text-align:center;border-bottom:4px solid #748093;display:flex;flex-direction:column;justify-content:center;box-shadow:inset 0 0 12px #0008}.hs b{display:block;font-size:clamp(9px,1vw,15px)}.hs b small{font-size:7px}.hs strong{font-size:clamp(18px,2vw,30px);line-height:1.05;margin-top:2px}.hs.S{border-color:#169cff}.hs.D{border-color:#ff3b48}.hs.T{border-color:#ffad19}.hs[class~="25"]{border-color:#10d47b}.hs[class~="50"]{border-color:#bc55ff}
.input-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(88px,34%);gap:6px;height:50px}.input-tools .undo,.voice{height:100%;margin:0;border-radius:11px;font-weight:1000;cursor:pointer}.input-tools .undo{color:#fff;background:linear-gradient(180deg,#351015,#16090b);border:1px solid #d33b43;font-size:12px}.input-tools .undo:disabled{opacity:.42}.voice{border:1px solid #26dfff88;background:linear-gradient(180deg,#102635,#071018);color:#34e8ff;display:flex;align-items:center;justify-content:center;gap:6px}.voice svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2}.voice span{font-size:11px}.voice.listening{box-shadow:0 0 20px #28e7ff88;animation:voicepulse .8s infinite alternate}@keyframes voicepulse{to{filter:brightness(1.5)}}
.keypad{height:auto;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:clamp(78px,16vh,124px);gap:6px;align-self:stretch}.keypad.keys-4{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,clamp(78px,16vh,124px))}.keypad.keys-3{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:clamp(78px,16vh,124px)}.keypad.keys-2{grid-template-columns:repeat(2,minmax(0,1fr))}.keypad button{min-width:0;min-height:0;border-radius:12px;color:#fff;border:1px solid #536074;box-shadow:inset 0 0 0 2px #ffffff12,inset 0 -18px 30px #0005,0 5px 12px #0008;background:linear-gradient(#142238,#09101a);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer}.keypad button:active{transform:scale(.97);filter:brightness(1.2)}.keypad button:disabled{opacity:.5}.keypad button b{font-size:clamp(28px,4vw,54px);line-height:1}.keypad button span{font-size:clamp(8px,1.2vw,15px);font-weight:900;margin-top:3px}.keypad [class~="25"] b,.keypad [class~="50"] b{font-size:clamp(18px,2.4vw,32px)}.keypad .S{background:linear-gradient(#1389ed,#074ea8)}.keypad .D{background:linear-gradient(#f03940,#981017)}.keypad .T{background:linear-gradient(#e69b13,#8a5205)}.keypad [class~="25"]{background:linear-gradient(#10b66b,#05683d)}.keypad [class~="50"]{background:linear-gradient(#a93fe8,#5a147c)}.keypad .MISS{background:linear-gradient(#56616e,#242c35)}
.challenge-roster{display:flex;gap:5px;overflow-x:auto;padding:0 1px 4px}.challenge-roster>div{flex:0 0 auto;min-width:60px;height:38px;padding:3px 6px;border:1px solid #283546;border-radius:9px;background:#080e16;display:grid;grid-template-columns:30px minmax(18px,1fr);align-items:center;gap:6px;opacity:.7}.challenge-roster>div.active{opacity:1;border-color:#ff3b43;box-shadow:0 0 10px #ff273322}.roster-avatar{width:30px;height:30px;border-radius:50%;overflow:hidden;display:grid;place-items:center}.roster-avatar>*{width:100%!important;height:100%!important}.challenge-roster strong{font-size:12px;color:#ff5555;text-align:center}
.turn-banner{height:28px;display:flex;align-items:baseline;justify-content:center;gap:5px;border:1px solid #4b2630;border-radius:9px;background:linear-gradient(90deg,#10090c,#201014,#10090c);color:#fff}.turn-banner span{font-size:8px;color:#9da8b7;font-weight:900}.turn-banner b{font-size:18px;color:#ff4248}.turn-banner i{font-size:10px;font-style:normal;font-weight:900}.turn-banner em{margin-left:8px;font-size:8px;color:#c5ceda;font-style:normal;font-weight:900;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.portrait-stats-wrap{min-width:0}.portrait-stats{display:block!important;border:1px solid #3d4b5e;border-radius:11px;background:linear-gradient(180deg,#0d141e,#080c12);padding:5px 7px}.ps-title{height:25px;display:flex;align-items:center;justify-content:space-between}.ps-title strong{font-size:11px;color:#ff4141;letter-spacing:.6px}.online-rank{width:30px;height:25px;border-radius:8px;border:1px solid #24dfff88;background:#08202a;color:#27e9ff;display:grid;place-items:center}.online-rank svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.ps-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.ps-kpis div{height:37px;border:1px solid #263343;border-radius:8px;background:#091019;display:flex;flex-direction:column;align-items:center;justify-content:center}.ps-kpis span{font-size:6.5px;color:#93a1b2;font-weight:1000}.ps-kpis b{font-size:14px;line-height:1.05}.ps-hits{display:grid;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));gap:4px;margin-top:4px}.psh{height:28px;border-radius:7px;background:#111925;display:flex;align-items:center;justify-content:center;gap:6px;border-bottom:3px solid #748093}.psh span{font-size:9px;font-weight:1000}.psh b{font-size:13px}.psh.S{border-color:#169cff}.psh.D{border-color:#ff3b48}.psh.T{border-color:#ffad19}.psh[class~="25"]{border-color:#10d47b}.psh[class~="50"]{border-color:#bc55ff}.match-detail-trigger{width:100%;height:30px;margin-top:4px;border:1px solid #5b3440;border-radius:9px;background:linear-gradient(180deg,#1b1015,#0b090d);color:#fff;font-size:9px;font-weight:1000;letter-spacing:.8px}.match-detail-trigger span{color:#ff454d;margin-left:5px}
.match-detail-modal{position:fixed;inset:0;z-index:10050;background:#000d;backdrop-filter:blur(8px);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(16px,env(safe-area-inset-bottom,0px));overflow:auto}.match-detail-card{width:min(820px,100%);max-height:min(94dvh,900px);border:1px solid #4c596a;border-radius:18px;background:linear-gradient(180deg,#101621,#06090e);box-shadow:0 28px 80px #000;padding:12px}.match-detail-top{display:grid;grid-template-columns:minmax(0,1fr) 138px minmax(0,1fr);gap:8px;align-items:stretch;min-height:82px}.match-detail-top.tall{min-height:128px}.match-side{position:relative;min-width:0;display:grid;grid-template-columns:58px minmax(0,1fr);grid-template-rows:auto auto;column-gap:9px;align-items:center;overflow:hidden;border-radius:12px;padding:8px 10px}.match-side>*:not(.match-side-team-bg){position:relative;z-index:2}.match-side-team-bg{position:absolute!important;z-index:0!important;inset:4px 5%;display:grid;place-items:center;opacity:.25;pointer-events:none}.match-side-team-bg img{width:100%;height:100%;max-width:86%;object-fit:contain;object-position:center}.match-side>span{grid-row:1/3;width:58px;height:58px;border-radius:50%;overflow:hidden;border:1px solid #536174;display:grid;place-items:center}.match-side>span>*{width:100%!important;height:100%!important}.match-side>b{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.match-side>strong{font-size:19px;color:#ff4950;line-height:1}.match-center-title{text-align:center;display:flex;flex-direction:column;align-items:center}.match-center-title small{font-size:7px;color:#95a2b2;font-weight:1000;letter-spacing:.8px}.match-center-title b{font-size:12px;color:#fff;letter-spacing:.8px}.match-center-title em{font-size:7px;color:#ff555b;font-style:normal;font-weight:1000}.match-compare{margin-top:10px;border:1px solid #263342;border-radius:12px;overflow:hidden;background:#070c13}.match-compare-row{min-height:34px;display:grid;grid-template-columns:minmax(0,1fr) 112px minmax(0,1fr);align-items:center;text-align:center;border-bottom:1px solid #1f2a37}.match-compare-row:last-child{border-bottom:0}.match-compare-row span{height:100%;display:grid;place-items:center;border-left:1px solid #263342;border-right:1px solid #263342;color:#95a2b2;font-size:8px;font-weight:1000;letter-spacing:.55px}.match-compare-row strong{font-size:15px;color:#fff}.match-detail-close{width:100%;height:38px;margin-top:9px;border:1px solid #d13d46;border-radius:10px;background:linear-gradient(180deg,#351015,#16090b);color:#fff;font-size:10px;font-weight:1000;letter-spacing:.8px}.stats-modal{position:fixed;inset:0;z-index:10020;background:#000c;backdrop-filter:blur(7px);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));overflow:auto}.stats-modal-card{width:min(500px,100%);max-height:min(90dvh,720px);overflow:auto;border:1px solid #4a596c;border-radius:17px;background:linear-gradient(180deg,#0e151f,#06090e);box-shadow:0 25px 70px #000;padding:12px}.stats-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.stats-modal-head>div{display:flex;flex-direction:column}.stats-modal-head strong{color:#ff4141;font-size:15px}.stats-modal-head span{font-size:9px;color:#9da9b8;margin-top:2px}.stats-modal-head button{width:34px;height:34px;border-radius:50%;border:1px solid #536176;background:#121a25;color:white;font-size:22px}.rank-list{display:grid;gap:6px;margin:10px 0}.rank-list>div{display:grid;grid-template-columns:30px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:9px;border:1px solid #293545;border-radius:10px;background:#0a1018}.rank-list>div>strong{color:#ffb52e}.rank-list>div>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rank-list>div>em{font-size:9px;color:#9ba7b6;font-style:normal}.rank-list>div>b{color:#fff}.online-open{width:100%;min-height:42px;border:1px solid #24dfff88;border-radius:11px;background:#0a1a25;color:#2eeaff;font-weight:1000}.finish{position:fixed;inset:0;z-index:10030;background:#000e;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center}.finish h2{font-size:clamp(26px,6vw,42px);letter-spacing:2px}.finish strong{font-size:clamp(38px,9vw,62px);color:#ff4141}.finish-streak{margin-top:8px;color:#fff;font-weight:900;letter-spacing:1px}.finish-scoreline{width:min(480px,100%);margin-top:14px;display:grid;gap:6px}.finish-score-row{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'name score' 'meta score';gap:2px 10px;align-items:center;padding:8px 10px;border:1px solid #334153;border-radius:11px;background:#0a1018;text-align:left}.finish-score-row span{grid-area:name;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finish-score-row b{grid-area:score;color:#ffb33f;font-size:18px}.finish-score-row em{grid-area:meta;color:#9da9b8;font-style:normal;font-size:9px}.finish-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:16px}.finish button{margin-top:0;padding:14px 22px;border-radius:12px;background:#19b84a;color:white;font-weight:900;border:1px solid #5cff87}.finish .finish-stats{background:linear-gradient(180deg,#52141b,#1c090d);border-color:#ff4f57;color:#fff}.finish .finish-menu{background:linear-gradient(180deg,#102330,#071018);border-color:#35dff0;color:#eafcff;box-shadow:inset 0 0 14px rgba(53,223,240,.08)}

.match-detail-card.advanced{display:flex;flex-direction:column;overflow:hidden;padding:12px}.detail-tabs{display:flex;gap:6px;overflow-x:auto;padding:9px 1px 8px;border-bottom:1px solid #273545}.detail-tabs button{flex:0 0 auto;min-height:34px;padding:7px 12px;border-radius:999px;border:1px solid #39485a;background:#08101a;color:#9aa8b9;font-size:9px;font-weight:1000;letter-spacing:.65px}.detail-tabs button.on{color:#fff;border-color:#ff4c54;background:linear-gradient(180deg,#4c1218,#17090c);box-shadow:0 0 14px #ff293333}.detail-scroll{min-height:0;overflow:auto;padding:10px 2px 2px}.detail-scroll h3{margin:0 0 8px;color:#ff5a61;font-size:10px;letter-spacing:.8px}.detail-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.detail-kpis>div{min-height:58px;border:1px solid #293748;border-radius:11px;background:#081019;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:5px}.detail-kpis span{font-size:7px;color:#8e9cad;font-weight:1000}.detail-kpis b{margin-top:3px;font-size:16px;color:#fff}.detail-grid{display:grid;grid-template-columns:1fr 1.25fr;gap:8px;margin-top:8px}.detail-grid>section,.position-section,.visits-section,.players-detail-list{border:1px solid #293748;border-radius:13px;background:#070d14;padding:10px}.challenge-donut-wrap{display:grid;grid-template-columns:130px minmax(0,1fr);gap:12px;align-items:center}.challenge-donut{width:126px;height:126px;border-radius:50%;display:grid;place-items:center;position:relative}.challenge-donut:after{content:'';position:absolute;inset:25px;border-radius:50%;background:#080e16;border:1px solid #273646}.challenge-donut>span{position:relative;z-index:2;font-size:18px;font-weight:1000;text-align:center}.challenge-donut>span small{display:block;font-size:6px;color:#91a0b2;margin-top:2px}.challenge-donut-legend{display:grid;grid-template-columns:1fr 1fr;gap:5px}.challenge-donut-legend>div{display:grid;grid-template-columns:8px 1fr auto;gap:5px;align-items:center;font-size:8px}.challenge-donut-legend i{width:8px;height:8px;border-radius:50%}.challenge-donut-legend b{font-size:8px}.challenge-donut-legend span{color:#aeb8c5}.challenge-mini-line{width:100%;height:142px;overflow:visible}.challenge-mini-line line{stroke:#334254;stroke-width:1}.challenge-mini-line polyline{fill:none;stroke:#ff4f57;stroke-width:4;stroke-linejoin:round;stroke-linecap:round}.challenge-mini-line circle{fill:#ff4f57;stroke:#fff;stroke-width:1.3}.position-section{margin-top:8px}.position-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.position-card{border:1px solid #243243;border-radius:11px;background:#09111a;padding:8px}.position-head{display:flex;justify-content:space-between;align-items:center;gap:6px}.position-head b{font-size:8px;color:#b3bdca}.position-head strong{font-size:15px;color:#ff6268}.position-bar{height:6px;border-radius:999px;background:#17212d;overflow:hidden;margin:6px 0 7px}.position-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff424a,#ffb01c);border-radius:999px}.position-rings{display:grid;grid-template-columns:1fr 1fr;gap:4px}.position-rings span{border-radius:7px;background:#0e1722;padding:5px;font-size:7px;color:#94a3b4;display:grid;grid-template-columns:auto 1fr auto;gap:3px;align-items:center}.position-rings b{color:#fff;text-align:right}.position-rings em{font-style:normal;color:#ffb33f}.visits-section{margin-top:8px}.visit-bars{height:112px;display:flex;align-items:flex-end;gap:3px;overflow-x:auto;padding-top:5px}.visit-bars>div{height:100%;min-width:14px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px}.visit-bars i{display:block;width:10px;min-height:3px;border-radius:4px 4px 1px 1px;background:linear-gradient(180deg,#ff5d64,#9e1118)}.visit-bars span{font-size:6px;color:#8493a5}.players-detail-list{margin-top:8px}.players-detail-list button{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;grid-template-areas:'avatar name score accuracy' 'avatar meta meta meta';gap:3px 7px;align-items:center;padding:7px;border:0;border-bottom:1px solid #1e2a38;background:transparent;color:#fff;text-align:left}.players-detail-list button:last-child{border-bottom:0}.players-detail-list button>span{grid-area:avatar;width:34px;height:34px;border-radius:50%;overflow:hidden}.players-detail-list button>b{grid-area:name;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.players-detail-list button>em{grid-area:score;color:#ffb33f;font-style:normal;font-weight:1000}.players-detail-list button>strong{grid-area:accuracy;color:#6ef29a}.players-detail-list button>small{grid-area:meta;color:#8f9eaf}.finish-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px}.finish-actions button{margin-top:0}.finish-stats{background:linear-gradient(180deg,#53131a,#1a090c)!important;border-color:#ff4c54!important}
@media(orientation:portrait){
 .match-detail-card{width:100%;max-height:94dvh;padding:9px}.match-detail-top{grid-template-columns:minmax(0,1fr) 100px minmax(0,1fr);min-height:86px}.match-side{grid-template-columns:50px minmax(0,1fr);padding:6px}.match-side>span{width:50px;height:50px}.detail-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.detail-grid{grid-template-columns:1fr}.position-grid{grid-template-columns:1fr}.challenge-donut-wrap{grid-template-columns:112px minmax(0,1fr)}.challenge-donut{width:106px;height:106px}.challenge-donut:after{inset:22px}.detail-scroll{padding-top:7px}
 .portrait-only{display:flex!important}.landscape-only{display:none!important}.cp{gap:5px;height:calc(var(--vh,1vh)*100);max-height:100dvh;padding:max(4px,env(safe-area-inset-top,0px)) max(5px,env(safe-area-inset-right,0px)) max(12px,calc(env(safe-area-inset-bottom,0px) + 6px)) max(5px,env(safe-area-inset-left,0px))}.cp-head{height:68px;border-radius:13px}.cp-head-title{display:none}.cp-head .cp-ticker{position:absolute;z-index:1;inset:0;display:block!important;width:100%;height:100%;object-fit:cover;object-position:center}.cp-head:after{content:'';position:absolute;z-index:2;inset:0;background:linear-gradient(90deg,#02050ab8 0,transparent 22%,transparent 78%,#02050ab8 100%);pointer-events:none}.cp-back{left:7px;z-index:4}.cp-awena{right:7px;z-index:4}.cp-layout{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:5px;margin:0;overflow:hidden}.cp-left{padding:0;border:0;background:transparent;box-shadow:none;gap:3px}.player{height:100px;min-height:100px;padding:7px 8px;grid-template-columns:64px minmax(0,1fr) 54px minmax(78px,23%);gap:6px}.player-avatar{width:64px;height:64px}.player-team-bg{inset:5px 48% 5px 5%;opacity:.25}.player-team-bg img{max-width:96%}.player-meta small,.player-score small{font-size:7.5px}.player-meta>b{font-size:15px}.player-meta>span{font-size:7px}.player-meta em{font-size:7px}.player-score{min-width:52px;padding-left:5px}.player-score b{font-size:25px}.player-objective{height:68px;min-width:0;position:relative;display:flex!important;align-items:center;justify-content:center;overflow:hidden;border-left:1px solid #303a48;padding-left:4px}.player-objective img{width:100%;height:58px;object-fit:contain;filter:drop-shadow(0 0 7px #ff343455)}.player-objective span{position:absolute;bottom:0;right:2px;font-size:6px;color:#b8c2d0;font-weight:1000;letter-spacing:.5px}.cp-board{display:none}.portrait-stats-wrap{display:block!important}.cp-right{height:100%;min-height:0;padding:5px 5px 10px;display:flex;flex-direction:column;gap:4px;border-radius:13px}.turn-banner{flex:0 0 28px}.portrait-stats-wrap{flex:0 0 auto}.input-tools{flex:0 0 50px;height:50px;grid-template-columns:minmax(0,1fr) 104px;gap:5px}.input-tools .undo{font-size:11px}.voice span{font-size:9px}.keypad{flex:1 1 auto;height:auto;min-height:0;align-self:stretch;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:5px;padding-bottom:4px}.keypad.keys-4{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))}.keypad.keys-3{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:minmax(0,1fr)}.keypad.keys-2{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:minmax(0,1fr)}.keypad button{height:auto;min-height:0;border-radius:11px}.keypad button b{font-size:clamp(28px,10vw,42px)}.keypad [class~="25"] b,.keypad [class~="50"] b{font-size:clamp(15px,5.2vw,24px)}.keypad button span{font-size:clamp(8px,2.7vw,11px)}
}
@media(orientation:portrait) and (max-height:700px){.cp-head{height:58px}.cp-awena{width:42px;height:42px}.cp-back{transform:translateY(-50%) scale(.9)}.player{height:82px;min-height:82px;grid-template-columns:52px minmax(0,1fr) 50px minmax(68px,22%)}.player-avatar{width:52px;height:52px}.player-objective{height:60px}.player-objective img{height:50px}.ps-title{height:20px}.ps-kpis div{height:30px}.ps-hits{margin-top:2px}.psh{height:23px}.match-detail-trigger{height:26px;margin-top:3px;font-size:8px}.cp-right{padding-bottom:9px}.turn-banner{flex-basis:25px;height:25px}.input-tools{flex-basis:46px;height:46px}.challenge-roster>div{height:34px}.challenge-roster{padding-bottom:2px}.keypad{height:auto;padding-bottom:3px}}
@media(orientation:landscape) and (max-height:520px){.cp{gap:4px;padding:3px max(4px,env(safe-area-inset-right,0px)) max(4px,env(safe-area-inset-bottom,0px)) max(4px,env(safe-area-inset-left,0px))}.cp-head{height:46px;border-radius:11px}.cp-back{left:5px;transform:translateY(-50%) scale(.82)}.cp-awena{right:5px;width:40px;height:40px}.cp-awena i{width:16px;height:16px;font-size:8px}.cp-ticker{width:min(360px,50%);height:42px}.cp-layout{gap:5px;grid-template-columns:25fr 35fr 40fr}.cp-left,.cp-right{padding:5px;gap:4px;border-radius:11px}.player{min-height:68px;padding:4px;grid-template-columns:48px minmax(0,1fr) auto;gap:5px}.player-avatar{width:48px;height:48px}.player-meta>b{font-size:14px}.player-meta i{margin-top:2px;font-size:7px}.player-score{min-width:48px}.player-score b{font-size:23px}.left-kpis{gap:3px}.left-kpis>div{min-height:42px}.left-kpis span{font-size:6px}.left-kpis b{font-size:15px}.left-actions{gap:3px}.left-actions>button,.left-actions>div{min-height:36px}.left-actions span{font-size:6px}.left-actions b{font-size:9px}.player-list-title{height:25px;flex-basis:25px}.player-list-scroll{padding:3px;gap:2px}.player-row{min-height:35px;grid-template-columns:28px minmax(0,1fr) auto;padding:2px 3px}.list-avatar{width:28px;height:28px}.list-name b{font-size:8px}.list-name small,.list-score small{font-size:6px}.list-score b{font-size:11px}.cp-board{padding:5px;border-radius:11px}.board-caption{min-height:36px;padding:2px 8px;border-radius:9px}.board-caption span{font-size:10px}.board-caption b{font-size:24px}.landscape-turn{min-height:30px;padding:2px 6px}.landscape-turn span{font-size:9px}.landscape-turn b{font-size:22px}.landscape-turn i{font-size:12px}.landscape-stats h2{font-size:11px;margin-bottom:3px;padding-bottom:3px}.hitstats{gap:2px}.hs{min-height:46px;padding:2px 1px;border-bottom-width:3px}.hs b{font-size:8px}.hs b small{font-size:6px}.hs strong{font-size:17px}.input-tools{height:40px;gap:4px}.input-tools .undo{font-size:9px}.voice svg{width:17px;height:17px}.voice span{font-size:8px}.keypad{height:auto;grid-auto-rows:clamp(62px,18vh,78px);gap:4px}.keypad.keys-4{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,clamp(62px,18vh,78px))}.keypad.keys-3{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:clamp(62px,18vh,78px)}.keypad button{border-radius:9px}.keypad button b{font-size:clamp(25px,5vh,34px)}.keypad button span{font-size:8px}}


/* Challenge V13 — détails match / identité portrait / tabs joueurs */
.player-avatar-wrap{display:flex;align-items:center;justify-content:center;min-width:0}
.player-avatar-label{display:none}
.turn-banner,.landscape-turn{position:relative}
.turn-player-count{position:absolute;right:10px;top:50%;transform:translateY(-50%);margin:0!important;max-width:none!important;font-size:8px!important;letter-spacing:.55px;color:#aeb9c7!important;font-style:normal!important;font-weight:1000!important;white-space:nowrap}
.match-detail-top.tall{min-height:118px;align-items:center}
.match-side{display:grid!important;grid-template-rows:1fr!important;align-items:center!important;overflow:visible!important;padding:8px 6px!important}
.match-side-left{grid-template-columns:minmax(72px,1fr) 62px 64px!important}
.match-side-right{grid-template-columns:64px 62px minmax(72px,1fr)!important}
.match-identity{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.match-identity>span{width:62px;height:62px;border-radius:50%;overflow:hidden;border:1px solid #536174;display:grid;place-items:center;box-shadow:0 0 15px #0008}
.match-identity>span>*{width:100%!important;height:100%!important}
.match-identity>b{max-width:100%;font-size:10px;line-height:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.65px}
.match-team-name{max-width:100%;font-size:7px;color:#fff;opacity:.82;line-height:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.match-team-logo{width:58px;height:58px;display:grid;place-items:center;opacity:.38;filter:saturate(1.1);overflow:hidden}
.match-team-logo img{width:100%;height:100%;object-fit:contain}
.match-side>strong{font-size:40px!important;color:#ff4850!important;line-height:1!important;text-align:center;text-shadow:0 0 14px #ff273344}
.match-center-title{justify-content:center}
.match-center-title b{font-size:13px}
.detail-tabs.baby-match-tabs{gap:7px;padding:8px 2px;align-items:center;background:linear-gradient(90deg,#080d14,#0e1621,#080d14)}
.detail-tabs.baby-match-tabs button{height:46px;min-height:46px;padding:4px 9px;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:6px}
.detail-tab-main,.detail-tab-match{min-width:112px}
.detail-tab-solo{min-width:124px;height:46px;min-height:46px;padding:4px 10px;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid #ff4e56;background:linear-gradient(180deg,#4b1218,#17090c);color:#fff;box-shadow:0 0 12px #ff293326}
.detail-tab-solo span:last-child{font-size:8px;font-weight:1000;letter-spacing:.6px}
.detail-tab-main svg,.detail-tab-match svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
.detail-tab-main span,.detail-tab-match span{font-size:8px;font-weight:1000;letter-spacing:.6px}
.detail-tab-player{width:50px!important;min-width:50px!important;padding:3px!important;overflow:hidden;transition:width .16s ease,min-width .16s ease}
.detail-tab-player.on{width:auto!important;min-width:104px!important;padding-right:10px!important}
.detail-tab-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:50%;overflow:hidden;display:grid;place-items:center;transform:scale(1.06)}
.detail-tab-avatar>*{width:100%!important;height:100%!important}
.detail-tab-player b{max-width:120px;font-size:8px;letter-spacing:.55px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.detail-match-scroll{padding-top:9px}
.match-compare.restored{margin-top:0}
.match-compare.restored .match-compare-row{min-height:39px;grid-template-columns:minmax(0,1fr) 132px minmax(0,1fr)}
.match-compare.restored .match-compare-row>strong{font-size:17px}
.match-compare.restored .match-compare-row>span{font-size:8px}
.records-head{display:flex;flex-direction:column;gap:3px;margin:0 0 9px;padding:9px 10px;border:1px solid #2e3b4b;border-radius:11px;background:linear-gradient(180deg,#0c141f,#080d14)}
.records-head strong{font-size:11px;color:#ff5960;letter-spacing:.8px}.records-head span{font-size:7.5px;color:#91a0b2;line-height:1.35}
.challenge-records{display:grid;gap:9px}.record-group{border:1px solid #293748;border-radius:13px;background:#070d14;padding:9px}.record-group>h3{margin:0 0 7px!important;color:#aeb9c7!important;font-size:8px!important;letter-spacing:.85px!important}.record-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.record-card{min-height:68px;position:relative;overflow:hidden;border:1px solid #253243;border-radius:10px;background:linear-gradient(180deg,#0b131d,#070c12);padding:7px 8px 9px;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'label value' 'holder value' 'bar bar';gap:3px 8px;align-items:center}.record-card>span{grid-area:label;color:#8f9eaf;font-size:6.8px;font-weight:1000;letter-spacing:.35px;line-height:1.25}.record-card>b{grid-area:value;font-size:18px;line-height:1;font-weight:1000;text-align:right;text-shadow:0 0 10px currentColor}.record-card>em{grid-area:holder;min-width:0;color:#fff;font-size:7px;font-style:normal;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.record-quality{grid-area:bar;height:4px;border-radius:999px;background:#17212d;overflow:hidden;display:block}.record-quality u{display:block;height:100%;min-width:2px;border-radius:999px;text-decoration:none}.records-legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:8px 0}.records-legend span{min-height:24px;border:1px solid #273545;border-radius:8px;background:#080f17;display:flex;align-items:center;justify-content:center;gap:5px;color:#95a3b4;font-size:6.6px;font-weight:900;text-align:center}.records-legend i{width:7px;height:7px;border-radius:50%;flex:0 0 7px}.visual-analysis{margin-top:9px;border-top:1px solid #273545;padding-top:9px}.visual-analysis>h3{margin:0 0 8px!important;color:#ff5960!important;font-size:9px!important;letter-spacing:.8px!important}
@media(orientation:portrait){
 .player{height:104px;min-height:104px;grid-template-columns:minmax(112px,1fr) 58px minmax(80px,24%);gap:7px;padding:6px 8px}
 .landscape-player-meta{display:none!important}
 .player-avatar-wrap{height:100%;flex-direction:column;gap:3px;align-items:center;justify-content:center;position:relative;z-index:2}
 .player-avatar{width:60px!important;height:60px!important;flex:0 0 60px}
 .player-avatar-label{display:flex!important;max-width:116px;flex-direction:column;align-items:center;gap:2px;line-height:1}
 .player-avatar-label b{max-width:116px;font-size:9px;font-weight:1000;letter-spacing:.6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
 .player-avatar-label span{max-width:116px;font-size:7px;color:#fff;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
 .record-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.records-legend{grid-template-columns:repeat(2,minmax(0,1fr))}.record-card{min-height:64px}.record-card>b{font-size:16px}.match-team-name{font-size:6.5px}.match-side>strong{font-size:32px!important}
 .player-team-bg{inset:6px 58% 6px 3%!important;opacity:.25!important;justify-content:center!important}
 .player-team-bg img{max-width:90%!important;object-position:center!important}
 .player-score{min-width:54px;padding-left:5px}
 .turn-player-count{right:8px;font-size:6.8px!important}
 .match-detail-top{grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr)!important;gap:4px!important;min-height:102px!important}
 .match-side-left{grid-template-columns:minmax(55px,1fr) 44px 45px!important}
 .match-side-right{grid-template-columns:45px 44px minmax(55px,1fr)!important}
 .match-identity>span{width:50px;height:50px}
 .match-identity>b{font-size:7px}
 .match-team-logo{width:42px;height:42px;opacity:.42}
 .match-side>strong{font-size:28px!important}
 .match-center-title b{font-size:10px}
 .detail-tabs.baby-match-tabs{gap:5px;padding:7px 1px}
 .detail-tabs.baby-match-tabs button{height:42px;min-height:42px;border-radius:11px;padding:3px 7px}.detail-tab-solo{height:42px;min-height:42px}
 .detail-tab-main,.detail-tab-match{min-width:96px}
 .detail-tab-main span,.detail-tab-match span{font-size:6.8px}
 .detail-tab-main svg,.detail-tab-match svg{width:19px;height:19px}
 .detail-tab-player{width:44px!important;min-width:44px!important}
 .detail-tab-player.on{min-width:92px!important}
 .detail-tab-avatar{width:34px;height:34px;flex-basis:34px}
 .detail-tab-player b{max-width:78px;font-size:6.8px}
 .match-compare.restored .match-compare-row{grid-template-columns:minmax(0,1fr) 112px minmax(0,1fr);min-height:36px}
 .match-compare.restored .match-compare-row>strong{font-size:15px}
}
@media(orientation:portrait) and (max-height:700px){
 .player{height:88px;min-height:88px;grid-template-columns:minmax(100px,1fr) 52px minmax(72px,23%)}
 .player-avatar{width:50px!important;height:50px!important;flex-basis:50px}
 .player-avatar-label b{font-size:7.5px}.player-avatar-label span{font-size:6.3px}
}

/* Challenge V17 — active player / detail header / player lists */
.player{position:relative;overflow:hidden}
.player>*:not(.player-team-bg){position:relative;z-index:2}
.player-team-bg{position:absolute;inset:8px 24% 8px 6%;display:flex;align-items:center;justify-content:flex-start;opacity:.22;pointer-events:none;z-index:1}.player-team-bg img{width:100%;height:100%;object-fit:contain;object-position:left center}
.player-avatar-wrap{align-self:stretch;justify-content:flex-start}.player-avatar{box-shadow:0 0 0 2px rgba(255,255,255,.08),0 10px 24px rgba(0,0,0,.36)}
.player-avatar-label{display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1;max-width:100%}.player-avatar-label b{font-size:10px;font-weight:1000;letter-spacing:.7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-avatar-label span{font-size:7px;color:#fff;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.landscape-player-meta{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;min-width:0}.landscape-player-meta small{display:none}.landscape-player-meta>b{font-size:22px;font-weight:1000;letter-spacing:.85px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.landscape-player-meta>span{font-size:11px;color:#fff;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-meta-sub{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.player-meta-sub em,.player-meta-sub i{font-style:normal;color:#aab6c5;font-size:10px;font-weight:900;letter-spacing:.55px}
.player-score{display:flex;flex-direction:column;align-items:center;justify-content:center;border-left:1px solid rgba(120,140,160,.28);padding-left:10px;min-width:76px}.player-score small{font-size:9px;color:#aeb9c7;font-weight:1000;letter-spacing:.7px}.player-score b{font-size:58px;line-height:.92;color:#fff;text-shadow:0 0 16px rgba(255,70,82,.22)}
.player-objective{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:88px}.player-objective img{width:min(88px,100%);height:auto;object-fit:contain;filter:drop-shadow(0 6px 14px rgba(0,0,0,.45))}.player-objective span{font-size:10px;font-weight:1000;color:#d7dee7;letter-spacing:.8px}
.player-list .player-row{position:relative;overflow:hidden}.list-team-bg{position:absolute;inset:2px 54px 2px auto;right:44px;display:flex;align-items:center;justify-content:flex-end;pointer-events:none;opacity:.16;z-index:1}.list-team-bg img{width:100%;height:100%;object-fit:contain;object-position:right center}.player-row>*:not(.list-team-bg){position:relative;z-index:2}.portrait-player-list{margin-top:6px;max-height:116px}.portrait-player-list .player-list-scroll{max-height:82px;overflow:auto}.portrait-player-list .player-row{min-height:34px;padding:3px 5px}.portrait-player-list .list-avatar{width:26px;height:26px}.portrait-player-list .list-name b{font-size:7.5px}.portrait-player-list .list-score b{font-size:10px}.portrait-player-list .list-name small,.portrait-player-list .list-score small{font-size:6px}

.match-detail-card.advanced{width:min(1120px,100%);max-width:1120px}.match-detail-top.redesigned{display:grid;grid-template-columns:minmax(0,1fr) 220px minmax(0,1fr);gap:10px;align-items:stretch;min-height:144px}.match-side-panel{position:relative;overflow:hidden;border:1px solid #2d3949;border-radius:16px;background:linear-gradient(180deg,#0d1520,#09111a);display:flex;flex-direction:column;justify-content:flex-end;padding:14px 18px 12px;min-width:0}.match-side-panel-bg{position:absolute;top:8px;bottom:8px;width:56%;pointer-events:none;opacity:.28;display:flex;align-items:center}.match-side-panel-left .match-side-panel-bg{right:8px;justify-content:flex-end}.match-side-panel-right .match-side-panel-bg{left:8px;justify-content:flex-start}.match-side-panel-bg img{width:100%;height:100%;object-fit:contain}.match-side-panel-avatar{position:absolute;top:14px;width:72px;height:72px;border-radius:50%;overflow:hidden;border:1px solid #536174;box-shadow:0 0 18px rgba(0,0,0,.45);background:#090f16}.match-side-panel-left .match-side-panel-avatar{left:14px}.match-side-panel-right .match-side-panel-avatar{right:14px}.match-side-panel-avatar>*{width:100%!important;height:100%!important}.match-side-panel b,.match-side-panel small{position:relative;z-index:2;max-width:46%}.match-side-panel b{font-size:18px;line-height:1.05;font-weight:1000;letter-spacing:.7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.match-side-panel small{margin-top:4px;font-size:11px;color:#fff;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.match-side-panel-left{align-items:flex-start;padding-left:18px}.match-side-panel-left b,.match-side-panel-left small{text-align:left}.match-side-panel-right{align-items:flex-end;padding-right:18px}.match-side-panel-right b,.match-side-panel-right small{text-align:right}.match-center-scoreboard{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-width:0}.match-center-scoreboard small{font-size:12px;color:#d7dde6;font-weight:1000;letter-spacing:.9px}.match-center-scoreboard em{font-size:11px;color:#ff5b63;font-style:normal;font-weight:1000;letter-spacing:.8px}.match-score-boxes{display:grid;grid-template-columns:repeat(2,78px);gap:8px}.match-score-boxes strong{display:grid;place-items:center;height:78px;border-radius:12px;border:1px solid #ff4f57;background:linear-gradient(180deg,#4d1217,#17090c);box-shadow:inset 0 0 20px rgba(0,0,0,.35),0 0 14px rgba(255,62,74,.16);color:#fff;font-size:52px;line-height:1;text-shadow:0 0 16px rgba(255,66,74,.32)}

@media(orientation:landscape){.player{height:108px;min-height:108px;grid-template-columns:88px minmax(0,1fr) 86px 94px;gap:10px;padding:10px 12px}.player-avatar-wrap{align-items:flex-start;justify-content:center}.player-avatar{width:72px!important;height:72px!important;flex:0 0 72px}.player-avatar-label{display:none}.player-team-bg{inset:8px 26% 8px 12%}.cp-left .player-list .player-row{grid-template-columns:34px minmax(0,1fr) auto}.cp-left .list-team-bg{left:94px;right:48px;inset-block:3px;justify-content:center}.match-detail-card.advanced .detail-scroll{padding-right:4px}.challenge-records .record-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(orientation:portrait){.player{height:122px;min-height:122px;grid-template-columns:82px minmax(0,1fr) 64px 80px;gap:6px;padding:8px 8px 8px 10px}.player-avatar-wrap{align-items:flex-start;justify-content:center}.player-avatar{width:66px!important;height:66px!important;flex:0 0 66px}.player-avatar-label{display:flex;align-items:flex-start;max-width:100%}.landscape-player-meta{display:none!important}.player-team-bg{inset:10px 26% 10px 13%}.player-score{min-width:58px;padding-left:6px}.player-score b{font-size:52px}.player-score small{font-size:8px}.player-objective{min-width:74px}.player-objective img{width:68px}.player-objective span{font-size:8px}.match-detail-card.advanced{width:min(96vw,760px)}.match-detail-top.redesigned{grid-template-columns:minmax(0,1fr) 132px minmax(0,1fr);gap:6px;min-height:116px}.match-side-panel{padding:10px 10px 10px}.match-side-panel-avatar{top:10px;width:50px;height:50px}.match-side-panel-left .match-side-panel-avatar{left:10px}.match-side-panel-right .match-side-panel-avatar{right:10px}.match-side-panel-bg{width:58%;top:6px;bottom:6px}.match-side-panel b,.match-side-panel small{max-width:58%}.match-side-panel b{font-size:9px}.match-side-panel small{font-size:7px;margin-top:2px}.match-center-scoreboard small{font-size:8px}.match-center-scoreboard em{font-size:7px}.match-score-boxes{grid-template-columns:repeat(2,44px);gap:5px}.match-score-boxes strong{height:44px;font-size:30px;border-radius:8px}.challenge-records .record-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* Challenge V18 — team watermark / records winners / mobile players modal */
.player-team-bg{top:-28%!important;bottom:-28%!important;left:-4%!important;right:48%!important;display:flex!important;align-items:center!important;justify-content:center!important;opacity:.17!important;overflow:hidden!important;filter:saturate(1.18) contrast(1.08) brightness(1.05)!important;mask-image:linear-gradient(90deg,#000 0%,#000 58%,rgba(0,0,0,.72) 76%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 58%,rgba(0,0,0,.72) 76%,transparent 100%)}
.player-team-bg img{height:156%!important;width:auto!important;max-width:none!important;object-fit:contain!important;object-position:center!important;transform:translateX(8%) scale(1.08)}
.player-objective{justify-self:end!important;align-self:stretch!important;margin-right:-4px!important;padding-right:0!important;border-left:1px solid rgba(90,108,128,.35);min-width:84px!important}
.player-objective img{margin-left:auto!important;margin-right:0!important}

.match-side-panel-bg{top:-34%!important;bottom:-34%!important;width:88%!important;opacity:.18!important;overflow:hidden!important;filter:saturate(1.2) contrast(1.08) brightness(1.05)!important}
.match-side-panel-left .match-side-panel-bg{right:-2%!important;justify-content:flex-end!important;mask-image:linear-gradient(90deg,#000 0%,#000 55%,rgba(0,0,0,.72) 76%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 55%,rgba(0,0,0,.72) 76%,transparent 100%)}
.match-side-panel-right .match-side-panel-bg{left:-2%!important;justify-content:flex-start!important;mask-image:linear-gradient(270deg,#000 0%,#000 55%,rgba(0,0,0,.72) 76%,transparent 100%);-webkit-mask-image:linear-gradient(270deg,#000 0%,#000 55%,rgba(0,0,0,.72) 76%,transparent 100%)}
.match-side-panel-bg img{height:158%!important;width:auto!important;max-width:none!important;object-fit:contain!important;transform:scale(1.08)}

.players-launch{position:relative;overflow:hidden;width:100%;height:42px;flex:0 0 42px;border:1px solid #405064;border-radius:11px;background:#07101a;color:#fff;align-items:center;justify-content:flex-start;padding:0 10px;gap:8px;box-shadow:inset 0 0 16px #0008}.players-launch>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:.52}.players-launch-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,5,9,.88),rgba(4,8,12,.58),rgba(2,5,9,.9))}.players-launch>b,.players-launch>strong,.players-launch-avatars{position:relative;z-index:2}.players-launch>b{font-size:10px;letter-spacing:.9px}.players-launch>strong{margin-left:auto;min-width:28px;height:28px;border-radius:50%;display:grid;place-items:center;border:1px solid #36eaff;color:#36eaff;background:#061019;font-size:10px}.players-launch-avatars{display:flex;align-items:center;margin-left:auto}.players-launch-avatars i{width:28px;height:28px;border-radius:50%;overflow:hidden;display:grid;place-items:center;border:2px solid #0a1018;margin-left:-7px;background:#101722}.players-launch-avatars i:first-child{margin-left:0}.players-launch-avatars i>*{width:100%!important;height:100%!important}
.players-modal{position:fixed;inset:0;z-index:10022;background:#000d;backdrop-filter:blur(7px);display:grid;place-items:center;padding:14px}.players-modal-card{width:min(470px,96vw);max-height:min(82dvh,650px);display:flex;flex-direction:column;border:1px solid #4a596c;border-radius:16px;background:linear-gradient(180deg,#0d1520,#06090e);overflow:hidden;box-shadow:0 26px 70px #000}.players-modal-head{position:relative;height:62px;flex:0 0 62px;display:flex;align-items:center;padding:0 12px;gap:8px;overflow:hidden}.players-modal-head>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.58}.players-modal-head>span{position:absolute;inset:0;background:linear-gradient(90deg,#02050ade,rgba(2,5,10,.38),#02050ade)}.players-modal-head>b,.players-modal-head>strong,.players-modal-head>button{position:relative;z-index:2}.players-modal-head>b{font-size:14px;letter-spacing:1px}.players-modal-head>strong{margin-left:auto;color:#36eaff;font-size:13px}.players-modal-head>button{width:32px;height:32px;border-radius:50%;border:1px solid #506174;background:#0b121c;color:#fff;font-size:20px}.players-modal-list{min-height:0;overflow:auto;padding:8px;display:grid;gap:6px}.players-modal-row{position:relative;overflow:hidden;min-height:54px;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 8px;border:1px solid #2b3949;border-radius:11px;background:#081019}.players-modal-row.active{border-color:#ff4a52;box-shadow:0 0 0 1px rgba(255,74,82,.24) inset}.players-modal-team-bg{position:absolute;top:-38%;bottom:-38%;right:42px;width:42%;display:flex;align-items:center;justify-content:center;opacity:.15;pointer-events:none}.players-modal-team-bg img{height:158%;width:auto;max-width:none;object-fit:contain}.players-modal-row>*:not(.players-modal-team-bg){position:relative;z-index:2}.players-modal-avatar{width:42px;height:42px;border-radius:50%;overflow:hidden;display:grid;place-items:center}.players-modal-avatar>*{width:100%!important;height:100%!important}.players-modal-name{min-width:0}.players-modal-name b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.players-modal-name small{display:block;margin-top:2px;font-size:7px;color:#c1c9d3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.players-modal-score{text-align:right}.players-modal-score b{display:block;font-size:18px;color:#ff555b}.players-modal-score small{display:block;font-size:7px;color:#8e9cac}

@media(orientation:portrait){.player-team-bg{top:-30%!important;bottom:-30%!important;left:-6%!important;right:50%!important}.player-objective{margin-right:-5px!important;min-width:78px!important}.player-objective img{width:72px!important}.cp-right{gap:4px}.players-launch{display:flex!important}.portrait-player-list{display:none!important}}
@media(orientation:landscape){.player-team-bg{top:-30%!important;bottom:-30%!important;left:-5%!important;right:48%!important}.player-objective{margin-right:-4px!important}.players-launch{display:none!important}.match-detail-card.advanced{width:min(1160px,96vw)!important;max-height:92dvh!important}.match-detail-card.advanced .detail-scroll{columns:auto!important}.challenge-records .record-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}

/* Challenge V19 — ajustements UI demandés */
.player-avatar-wrap{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px;min-width:0}
.player-avatar-label{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:0;text-align:center;gap:1px}
.player-avatar-label b,.player-avatar-label span{display:block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-avatar-label b{font-size:14px;letter-spacing:.55px;line-height:1.05}
.player-avatar-label span{font-size:8px;color:#d8e1ec;opacity:.92}
.landscape-player-meta{display:none!important}

.player-context-strip{min-height:30px;border:1px solid #293647;border-radius:10px;background:#091018;display:flex!important;align-items:center;justify-content:space-between;padding:0 10px;gap:12px}
.player-context-strip span,.player-context-strip strong{font-size:10px;font-weight:1000;letter-spacing:.55px;color:#e9eef6}
.player-context-strip b{color:#ff5259;font-size:18px;line-height:1}

.player-team-bg{inset:0!important;left:0!important;right:42%!important;top:0!important;bottom:0!important;border-radius:16px 0 0 16px;display:flex!important;align-items:center!important;justify-content:center!important;opacity:.18!important;overflow:hidden!important;filter:saturate(1.16) contrast(1.06) brightness(1.04)!important;mask-image:linear-gradient(90deg,#000 0%,#000 60%,rgba(0,0,0,.68) 78%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 60%,rgba(0,0,0,.68) 78%,transparent 100%)}
.player-team-bg img{height:172%!important;width:auto!important;max-width:none!important;object-fit:contain!important;object-position:center!important;transform:translateX(3%) scale(1.08)}

.player-objective{justify-self:stretch!important;align-self:stretch!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;margin-right:-10px!important;padding:0 0 0 6px!important;border-left:1px solid rgba(90,108,128,.34)!important;min-width:92px!important}
.player-objective img{margin:0 auto!important;width:78px!important;max-width:100%!important;height:auto!important;object-fit:contain!important}
.player-objective span{position:static!important;display:block!important;margin-top:1px!important;text-align:center!important;font-size:8px!important;line-height:1!important;letter-spacing:.7px!important}

.list-team-bg{left:86px!important;right:42px!important;inset-block:2px!important;display:flex!important;align-items:center!important;justify-content:center!important;opacity:.98!important;filter:none!important}
.list-team-bg img{width:100%!important;height:100%!important;max-width:none!important;object-fit:contain!important;object-position:center!important}

.match-side-panel-bg{top:0!important;bottom:0!important;width:100%!important;opacity:.2!important;overflow:hidden!important;filter:saturate(1.18) contrast(1.06) brightness(1.03)!important}
.match-side-panel-left .match-side-panel-bg{right:0!important;justify-content:flex-end!important;mask-image:linear-gradient(90deg,#000 0%,#000 58%,rgba(0,0,0,.7) 78%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 58%,rgba(0,0,0,.7) 78%,transparent 100%)}
.match-side-panel-right .match-side-panel-bg{left:0!important;justify-content:flex-start!important;mask-image:linear-gradient(270deg,#000 0%,#000 58%,rgba(0,0,0,.7) 78%,transparent 100%);-webkit-mask-image:linear-gradient(270deg,#000 0%,#000 58%,rgba(0,0,0,.7) 78%,transparent 100%)}
.match-side-panel-bg img{height:166%!important;width:auto!important;max-width:none!important;object-fit:contain!important;transform:scale(1.08)!important}

@media(orientation:landscape){
 .player{height:112px!important;min-height:112px!important;grid-template-columns:94px minmax(0,1fr) 84px 96px!important;gap:8px!important;padding:8px 10px!important}
 .player-avatar-wrap{align-items:center!important;justify-content:center!important}
 .player-avatar{width:70px!important;height:70px!important;flex:0 0 70px!important}
 .player-avatar-label b{font-size:12px!important}
 .player-avatar-label span{font-size:7px!important}
 .player-team-bg{right:43%!important}
 .cp-left{gap:5px!important}
 .player-objective{margin-right:-8px!important}
}
@media(orientation:portrait){
 .player-team-bg{inset:0!important;left:0!important;right:46%!important;top:0!important;bottom:0!important;border-radius:15px 0 0 15px!important}
 .player-team-bg img{height:162%!important;transform:translateX(2%) scale(1.05)!important}
 .player-avatar-label b{font-size:11px!important}
 .player-avatar-label span{font-size:6.5px!important}
 .player-objective{margin-right:-6px!important;min-width:82px!important;padding-left:4px!important}
 .player-objective img{width:70px!important;height:54px!important}
 .player-objective span{font-size:6.5px!important}
}

/* Challenge V24 — objectif responsive, sans empiéter sur le joueur actif */
.player-objective-value{display:none;font-size:16px;line-height:1;color:#ff5259;font-weight:1000;text-align:center;text-shadow:0 0 10px rgba(255,72,82,.32)}

@media(orientation:portrait){
 .player{grid-template-columns:minmax(104px,1fr) 56px clamp(56px,16vw,64px)!important;column-gap:5px!important}
 .player-objective{width:100%!important;min-width:0!important;max-width:64px!important;margin:0!important;padding:0 2px!important;justify-self:end!important;align-self:stretch!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;border-left:1px solid rgba(90,108,128,.34)!important;overflow:hidden!important}
 .player-objective img{display:block!important;width:clamp(42px,12vw,52px)!important;height:44px!important;max-width:100%!important;margin:0 auto!important;object-fit:contain!important;object-position:center!important}
 .player-objective span{position:static!important;display:block!important;width:100%!important;margin:1px 0 0!important;text-align:center!important;font-size:6px!important;line-height:1!important;letter-spacing:.45px!important;white-space:nowrap!important}
 .player-objective-value{display:none!important}
}

@media(orientation:landscape){
 .player{grid-template-columns:minmax(72px,1fr) clamp(48px,6vw,66px) clamp(42px,5vw,58px)!important;column-gap:5px!important;padding-left:7px!important;padding-right:7px!important}
 .player-objective{width:100%!important;min-width:0!important;max-width:58px!important;margin:0!important;padding:0 2px!important;justify-self:end!important;align-self:stretch!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;border-left:1px solid rgba(90,108,128,.34)!important;overflow:hidden!important}
 .player-objective img{display:none!important}
 .player-objective-value{display:block!important;font-size:clamp(12px,1.6vw,17px)!important}
 .player-objective span{position:static!important;display:block!important;width:100%!important;margin:0!important;text-align:center!important;font-size:clamp(5px,.8vw,7px)!important;line-height:1!important;letter-spacing:.35px!important;white-space:nowrap!important}
}

@media(orientation:landscape) and (max-width:950px){
 .player{grid-template-columns:minmax(82px,1fr) clamp(46px,7vw,58px)!important;column-gap:5px!important}
 .player-objective{display:none!important}
 .player-avatar{width:clamp(48px,8vh,62px)!important;height:clamp(48px,8vh,62px)!important;flex-basis:clamp(48px,8vh,62px)!important}
 .player-avatar-label b{font-size:clamp(8px,1.5vw,11px)!important}
 .player-avatar-label span{font-size:clamp(6px,1vw,7px)!important}
 .player-score{min-width:46px!important;padding-left:4px!important}
 .player-score b{font-size:clamp(26px,5vh,38px)!important}
}

.online-challenge-card{width:min(920px,96vw)!important;max-height:min(92dvh,880px)!important;overflow:auto!important}
.online-filter-panel{margin-top:10px;display:grid;gap:7px;padding:9px;border:1px solid #2a394b;border-radius:13px;background:linear-gradient(180deg,#09121c,#060b11)}
.online-filter-summary{display:flex;gap:6px;overflow-x:auto;padding-bottom:3px;scrollbar-width:thin}.online-filter-summary b{flex:0 0 auto;min-height:27px;display:flex;align-items:center;padding:0 9px;border-radius:999px;border:1px solid #39485a;background:#0d1722;color:#e8eef7;font-size:8px;letter-spacing:.35px}
.online-filter-row{display:grid;grid-template-columns:76px minmax(0,1fr);gap:7px;align-items:center}.online-filter-row>span{font-size:7.5px;color:#92a0b2;font-weight:1000;letter-spacing:.6px}.online-filter-row>div{display:flex;gap:5px;overflow-x:auto;padding:1px 0 3px;scrollbar-width:thin}.online-filter-row button{flex:0 0 auto;min-height:30px;min-width:38px;padding:4px 8px;border-radius:9px;border:1px solid #334255;background:#0a111a;color:#aab6c6;display:flex;align-items:center;justify-content:center;gap:5px;font-size:8px;font-weight:1000;white-space:nowrap}.online-filter-row button.on{border-color:#ff4a52;color:#fff;background:linear-gradient(180deg,#4a1218,#17090c);box-shadow:0 0 12px #ff293326}.online-filter-row button:disabled{opacity:.35}.online-filter-row.scope button{min-width:96px}.online-filter-row.teams button{padding-left:5px;padding-right:10px}.online-filter-row>div>em{font-size:8px;color:#8c98a7;font-style:normal;padding:7px}
.online-team-filter-logo,.online-team-filter-fallback{width:24px;height:24px;flex:0 0 24px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#111923;border:1px solid #4a596c;font-style:normal}.online-team-filter-logo img{width:100%!important;height:100%!important;object-fit:cover!important}.online-team-filter-fallback{font-size:12px}
.online-history-sync{margin:8px 0 0;padding:8px 10px;border:1px solid #1b8292;border-radius:9px;background:#072029;color:#43e9ff;font-size:8px;font-weight:1000;text-align:center;letter-spacing:.45px}
.online-rank-state{margin:12px 0;padding:18px 12px;border:1px dashed #3b4a5d;border-radius:12px;background:#081019;color:#a9b5c5;text-align:center;font-size:10px;font-weight:900;letter-spacing:.45px}
.online-rank-state.error{color:#ff7b82;border-color:#7d3037;background:#1a0b0e}
.online-rank-list>div{grid-template-columns:38px minmax(0,1fr) auto!important;grid-template-areas:'rank player score' 'rank meta score'!important;min-height:58px}
.online-rank-list>div>strong{grid-area:rank;font-size:13px}
.online-rank-list>div>b{grid-area:score;font-size:16px;color:#ffb33f!important}
.online-rank-list>div>em{grid-area:meta;font-size:8px!important}
.online-rank-player{grid-area:player!important;display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important}
.online-rank-player>img,.online-rank-player>i{width:32px;height:32px;border-radius:50%;object-fit:cover;display:grid;place-items:center;flex:0 0 32px;border:1px solid #4d5c70;background:#111923;color:#fff;font-style:normal;font-weight:1000}
.online-rank-player>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:950;color:#fff}
@media(max-width:620px){.online-challenge-card{width:98vw!important;padding:9px!important}.online-filter-row{grid-template-columns:1fr;gap:3px}.online-filter-row>span{padding-left:2px}.online-filter-summary b{font-size:7px}.online-rank-list>div{grid-template-columns:32px minmax(0,1fr) auto!important}.online-rank-player>img,.online-rank-player>i{width:28px;height:28px;flex-basis:28px}.online-rank-list>div>em{font-size:7px!important}}

/* Challenge V26 — filtres compacts + groupes de stats par onglets */
.detail-section-tabs{display:flex;gap:5px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:thin}.detail-section-tabs button{flex:0 0 auto;min-height:32px;padding:5px 10px;border:1px solid #344458;border-radius:9px;background:#08111b;color:#95a4b5;font-size:7.5px;font-weight:1000;letter-spacing:.45px;white-space:nowrap}.detail-section-tabs button.on{border-color:#ff4e56;background:linear-gradient(180deg,#4b1218,#17090c);color:#fff;box-shadow:0 0 12px #ff293326}.compact-detail-scroll{overflow:auto}.compact-detail-scroll .visual-analysis{margin-top:0;border-top:0;padding-top:0}.position-section.standalone,.visits-section.standalone{margin-top:0}.visit-bars>div b{font-size:8px;color:#fff}
.online-ranking-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 62px;gap:7px;align-items:stretch;margin-top:9px}.online-filter-trigger{border:1px solid #36eaff66;border-radius:11px;background:#071722;color:#35e9ff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:43px}.online-filter-trigger svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7}.online-filter-trigger span{font-size:6px;font-weight:1000;letter-spacing:.55px}.online-official-team-note{margin-top:6px;padding:6px 8px;border:1px solid #226443;border-radius:9px;background:#06150f;color:#6ff0a2;font-size:7.5px;font-weight:1000}.online-ranking-actions{display:grid;grid-template-columns:1fr 1.35fr;gap:6px}.online-open.full{border-color:#ff4e56;color:#fff;background:linear-gradient(180deg,#481218,#16090c)}
.online-filter-picker{position:fixed;inset:0;z-index:10140;background:#000d;backdrop-filter:blur(8px);display:grid;place-items:center;padding:12px}.online-filter-picker-card{width:min(720px,96vw);max-height:90dvh;overflow:auto;border:1px solid #43546a;border-radius:17px;background:linear-gradient(180deg,#0e1723,#05080d);padding:11px;box-shadow:0 28px 80px #000}.online-filter-picker-card>header{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #273648;padding-bottom:9px}.online-filter-picker-card header>div{min-width:0}.online-filter-picker-card header strong,.online-filter-picker-card header span{display:block}.online-filter-picker-card header strong{font-size:13px;color:#fff}.online-filter-picker-card header span{margin-top:2px;font-size:7.5px;color:#8e9dae}.online-filter-picker-card header>button{width:34px;height:34px;border-radius:50%;border:1px solid #4d5e72;background:#0a121d;color:#fff;font-size:20px}.online-filter-picker-card section{margin-top:8px;padding:8px;border:1px solid #273648;border-radius:11px;background:#07101a}.online-filter-picker-card h3{margin:0 0 6px;color:#ff5960;font-size:8px;letter-spacing:.7px}.online-filter-picker-card section>div{display:flex;gap:5px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}.online-filter-picker-card section button{flex:0 0 auto;min-height:32px;padding:5px 9px;border:1px solid #344458;border-radius:8px;background:#0a131f;color:#aab6c5;font-size:8px;font-weight:1000;white-space:nowrap}.online-filter-picker-card section button.on{border-color:#ff4e56;background:linear-gradient(180deg,#4b1218,#17090c);color:#fff}.online-filter-picker-card section button small{display:block;margin-top:2px;color:#7f8da0;font-size:6px}.online-filter-picker-card section>div>em{font-size:8px;color:#8e9bad;font-style:normal;line-height:1.4}.online-filter-picker-card footer{position:sticky;bottom:0;padding-top:9px;background:linear-gradient(180deg,transparent,#05080d 35%)}.online-filter-picker-card footer button{width:100%;height:40px;border:1px solid #ff4e56;border-radius:10px;background:linear-gradient(180deg,#511319,#18090c);color:#fff;font-weight:1000}
@media(max-width:620px){.online-ranking-toolbar{grid-template-columns:minmax(0,1fr) 54px}.online-ranking-actions{grid-template-columns:1fr}.detail-section-tabs button{font-size:6.8px;padding-inline:8px}.record-grid{grid-template-columns:1fr!important}.detail-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-grid{grid-template-columns:1fr!important}}

`;
