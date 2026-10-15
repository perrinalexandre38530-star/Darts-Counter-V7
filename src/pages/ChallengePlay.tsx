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
 isChallengeProfileLinkedToUser,
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
import targetAnyDouble from '../assets/challenge_targets/target_any_double.webp';
import targetAnyTriple from '../assets/challenge_targets/target_any_triple.webp';
import challengeBoard from '../assets/challenge_board.webp';
import type { ChallengeConfigData,ChallengeRule } from './ChallengeConfig';
import { analyzeChallengeExercise, challengeExerciseType, challengeObjectiveKeyTarget, challengeOnlineTargetLabel, classicHitAllowed, classicHitValue, compareChallengeRankRows, evaluateChallengeEntries, exerciseTitle, maxChallengePointsPerDart, objectiveBoardKey, objectiveForVisit, objectiveLabel, realHitValue, type ChallengeExerciseAnalytics, type ChallengeHit } from '../lib/challengeExercises';
import { buildChallengeExerciseCareer, challengeCareerConfigKey, type ChallengeExerciseCareer } from '../lib/challengeExerciseCareer';
import { buildChallengeExerciseProgress, type ChallengeExerciseProgress } from '../lib/challengeExerciseProgress';

type Hit=ChallengeHit;
type Entry={hit:Hit;pid:string;segment?:number|null};
type Participant={id:string;name:string;profile?:any;team?:any;teamName?:string;avatarDataUrl?:string|null};

const hits:Hit[]=['S','D','T','25','50','MISS'];
const challengeSoundUrls={intro:'/sounds/challenge/intro.mp3',end:'/sounds/challenge/end-game.mp3',S:'/sounds/challenge/simple.mp3',D:'/sounds/challenge/double.mp3',T:'/sounds/challenge/triple.mp3',MISS:'/sounds/challenge/miss.mp3'} as const;
const targetBoards:Record<string,string>={'1':target1,'2':target2,'3':target3,'4':target4,'5':target5,'6':target6,'7':target7,'8':target8,'9':target9,'10':target10,'11':target11,'12':target12,'13':target13,'14':target14,'15':target15,'16':target16,'17':target17,'18':target18,'19':target19,'20':target20,'any-double':targetAnyDouble,'any-triple':targetAnyTriple,bull:targetBull50,bull25:targetBull25,bull50:targetBull50};
const ruleLabel=(r:string)=>r==='single'?'S':r==='double'?'D':r==='triple'?'T':(r==='bull'||r==='bull25'||r==='bull50')?'BULL':'TOUS';
const isBullMode=(rule:string,target:string)=>target==='bull'||target==='bull25'||target==='bull50'||rule==='bull'||rule==='bull25'||rule==='bull50';

const explicitOnlineUserIdFromProfile=(profile:any)=>{
 const pi:any=profile?.privateInfo||profile?.private_info||{};
 return String(pi?.onlineUserId||pi?.online_user_id||pi?.userId||pi?.user_id||profile?.onlineUserId||profile?.online_user_id||profile?.userId||profile?.user_id||profile?.linkedUserId||profile?.linked_user_id||'').trim();
};
const onlineTargetFilters=['any-double','any-triple','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','bull'];
const onlineVisitFilters=[5,10,15,20,30,50,100];
const onlineRuleFilters=['all','single','double','triple','bull'];
const hitValue=(h:Hit,r:ChallengeRule,t:string,segment?:number|null)=>classicHitValue(h,r,t,segment);
const tieBreakValue=(e:Entry,cfg:ChallengeConfigData)=>((cfg.target==='any-double'&&e.hit==='D')||(cfg.target==='any-triple'&&e.hit==='T'))?Math.max(0,Number(e.segment||0)):0;
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
 const evaluation=evaluateChallengeEntries(entries,cfg);
 const hitCounts=Object.fromEntries(hits.map(h=>[h,entries.filter(e=>e.hit===h).length])) as Record<Hit,number>;
 let bestStreak=0,run=0;
 const positionStats=[0,1,2].map(position=>({position:position+1,attempts:0,successful:0,accuracy:0,S:0,D:0,T:0,B25:0,B50:0,MISS:0}));
 entries.forEach((entry,index)=>{
  const success=Boolean(evaluation.entrySuccessful[index]);
  if(success){run++;bestStreak=Math.max(bestStreak,run)}else run=0;
  const bucket=positionStats[index%3];bucket.attempts++;if(success)bucket.successful++;
  if(entry.hit==='S')bucket.S++;else if(entry.hit==='D')bucket.D++;else if(entry.hit==='T')bucket.T++;else if(entry.hit==='25')bucket.B25++;else if(entry.hit==='50')bucket.B50++;else bucket.MISS++;
 });
 positionStats.forEach(bucket=>bucket.accuracy=bucket.attempts?Math.round(bucket.successful/bucket.attempts*1000)/10:0);
 const successful=evaluation.entrySuccessful.filter(Boolean).length;
 const darts=entries.length;
 const positiveVisits=evaluation.visitScores.filter(value=>value>0);
 return {score:evaluation.score,darts,successful,failures:Math.max(0,darts-successful),accuracy:darts?Math.round(successful/darts*1000)/10:0,bestStreak,bestVisit:positiveVisits.length?Math.max(...positiveVisits):0,avgVisit:evaluation.visitScores.length?Math.round((evaluation.visitScores.reduce((a,b)=>a+b,0)/evaluation.visitScores.length)*10)/10:0,hitCounts,positionStats,visitScores:evaluation.visitScores,cumulativeScores:evaluation.cumulativeScores};
}

function mergeExerciseAnalytics(rows:ChallengeExerciseAnalytics[],cfg:ChallengeConfigData):ChallengeExerciseAnalytics{
 const type=challengeExerciseType(cfg);
 const sectorHits:Record<string,number>={};
 const objectiveStats:ChallengeExerciseAnalytics['objectiveStats']={};
 const sum=(key:keyof ChallengeExerciseAnalytics)=>rows.reduce((total,row)=>total+Number(row[key]||0),0);
 rows.forEach(row=>{
  Object.entries(row.groupingSectorHits||{}).forEach(([sector,hits])=>{sectorHits[sector]=(sectorHits[sector]||0)+(Number(hits)||0)});
  Object.entries(row.objectiveStats||{}).forEach(([objective,value])=>{
   const target=objectiveStats[objective]||(objectiveStats[objective]={attempts:0,validated:0,perfect:0,points:0});
   target.attempts+=Number(value?.attempts||0);target.validated+=Number(value?.validated||0);target.perfect+=Number(value?.perfect||0);target.points+=Number(value?.points||0);
  });
 });
 const completedVisits=sum('completedVisits');
 const visitsPlayed=sum('visitsPlayed');
 const validatedVisits=sum('validatedVisits');
 const top=Object.entries(sectorHits).map(([sector,hits])=>({sector:Number(sector),hits:Number(hits)||0})).sort((a,b)=>b.hits-a.hits||b.sector-a.sector)[0]||null;
 const denominator=completedVisits||visitsPlayed;
 return {
  type,
  visitsPlayed,
  completedVisits,
  validatedVisits,
  failedVisits:sum('failedVisits'),
  validationRate:denominator?Math.round(validatedVisits/denominator*1000)/10:0,
  perfectVisits:sum('perfectVisits'),
  bestValidatedVisitStreak:Math.max(0,...rows.map(row=>Number(row.bestValidatedVisitStreak||0))),
  bestPerfectVisitStreak:Math.max(0,...rows.map(row=>Number(row.bestPerfectVisitStreak||0))),
  bestVisitPoints:Math.max(0,...rows.map(row=>Number(row.bestVisitPoints||0))),
  objectiveStats,
  visitStats:[],
  halfItCuts:sum('halfItCuts'),
  halfItLowestScore:rows.length?Math.min(...rows.map(row=>Number(row.halfItLowestScore||0))):0,
  halfItEndScore:Math.max(0,...rows.map(row=>Number(row.halfItEndScore||0))),
  groupingDoublets:sum('groupingDoublets'),
  groupingTriplets:sum('groupingTriplets'),
  groupingPoints:sum('groupingPoints'),
  groupingSectorHits:sectorHits,
  topGroupingSector:top?.sector??null,
  topGroupingSectorHits:top?.hits??0,
 };
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
const maxPointsPerDart=(cfg:ChallengeConfigData)=>maxChallengePointsPerDart(cfg);
const hitLabel=(h:Hit)=>h==='25'?'BULL25':h==='50'?'BULL50':h;

function bestExactHitStreak(entries:Entry[],hit:Hit){
 let best=0,run=0;
 for(const entry of entries){if(entry.hit===hit){run++;best=Math.max(best,run)}else run=0}
 return best;
}
function bestHitVisitStreak(entries:Entry[],cfg:ChallengeConfigData){
 const evaluated=evaluateChallengeEntries(entries,cfg);let best=0,run=0;
 for(let i=0;i<entries.length;i+=3){const ok=evaluated.entrySuccessful.slice(i,i+3).some(Boolean);if(ok){run++;best=Math.max(best,run)}else run=0}
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
  firstNine:evaluateChallengeEntries(entries.slice(0,9),cfg).score,
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
 let countedSuccess=hitCounts.S+hitCounts.D+hitCounts.T+hitCounts['25']+hitCounts['50'];
 let countedTotal=countedSuccess+hitCounts.MISS;
 const derivedSuccessful=Math.max(0,Math.min(darts,Math.round(darts*accuracy/100)));
 // Anciennes lignes Online : le serveur pouvait avoir le score/précision mais
 // pas encore la ventilation S/D/T/Bull/Miss. On reconstruit uniquement ce qui
 // est mathématiquement certain, sans inventer une répartition S/D/T.
 if(countedTotal===0&&darts>0){
  const derivedMiss=Math.max(0,darts-derivedSuccessful);
  hitCounts.MISS=derivedMiss;
  if(cfg.rule==='single')hitCounts.S=derivedSuccessful;
  else if(cfg.rule==='double')hitCounts.D=derivedSuccessful;
  else if(cfg.rule==='triple')hitCounts.T=derivedSuccessful;
  else if(isBullMode(cfg.rule,cfg.target)){
   const score=Math.max(0,Number(raw?.score??stats?.score??0)||0);
   const b50=Math.max(0,Math.min(derivedSuccessful,score-derivedSuccessful));
   const b25=Math.max(0,derivedSuccessful-b50);
   hitCounts['25']=b25;hitCounts['50']=b50;
  }
  countedSuccess=hitCounts.S+hitCounts.D+hitCounts.T+hitCounts['25']+hitCounts['50'];
  countedTotal=countedSuccess+hitCounts.MISS;
 }
 const successful=countedTotal>0?countedSuccess:derivedSuccessful;
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
  avgVisit:Math.max(0,Number(stats?.avgVisit??stats?.averageVisit??((darts>0)?((Number(raw?.score??stats?.score??0)||0)/Math.max(1,Math.ceil(darts/3))):0))||0),
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
 push('score','SCORE',raw.score,totalDarts*maxPerDart,'PERF');
 push('first9','9 FL.',raw.firstNine,Math.min(9,totalDarts)*maxPerDart,'PERF');
 push('bestStreak','SUITE MAX',raw.bestStreak,totalDarts,'PERF');
 push('visitHitStreak','TOURS HIT',raw.hitVisitStreak,totalVisits,'PERF');
 push('bestVisit','BEST VOLÉE',raw.bestVisit,3*maxPerDart,'PERF');
 for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`count_${h}`,h==='MISS'?'MISS':h==='S'?'SIMPLES':h==='D'?'DOUBLES':h==='T'?'TRIPLES':h==='25'?'BULL 25':'BULL 50',raw.hitCounts[h],totalDarts,'HITS',{inverse:h==='MISS'});
 for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`streak_${h}`,h==='MISS'?'MISS':h==='S'?'SIMPLES':h==='D'?'DOUBLES':h==='T'?'TRIPLES':h==='25'?'BULL 25':'BULL 50',raw.hitStreaks[h],totalDarts,'SÉRIES',{inverse:h==='MISS'});
 for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`pct_${h}`,h==='MISS'?'MISS':h==='S'?'SIMPLES':h==='D'?'DOUBLES':h==='T'?'TRIPLES':h==='25'?'BULL 25':'BULL 50',raw.hitPct[h],100,'%',{pct:true,inverse:h==='MISS',sampled:raw.darts>0});
 raw.positionPct.forEach((row,index)=>{
  const attempts=raw.darts>index?Math.floor((raw.darts+2-index)/3):0;
  for(const h of ['MISS','S','D','T','25','50'] as Hit[]) push(`dart${index+1}_${h}`,h==='MISS'?'MISS':h==='S'?'SIMPLES':h==='D'?'DOUBLES':h==='T'?'TRIPLES':h==='25'?'BULL 25':'BULL 50',row[h],100,`FL. ${index+1}`,{pct:true,inverse:h==='MISS',sampled:attempts>0});
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

function challengeRecordIcon(card:ChallengeRecordCard){
 const key=String(card.key||'');
 if(key==='score')return '★';
 if(key==='first9')return '⑨';
 if(key==='bestStreak'||key.includes('streak'))return '✦';
 if(key==='visitHitStreak')return '↗';
 if(key==='bestVisit'||key.includes('visit'))return '▮';
 if(key.includes('MISS'))return '×';
 if(key.includes('_S'))return 'S';
 if(key.includes('_D'))return 'D';
 if(key.includes('_T'))return 'T';
 if(key.includes('_25'))return '25';
 if(key.includes('_50'))return '50';
 if(key.startsWith('pct_'))return '%';
 if(key.startsWith('dart1_'))return '①';
 if(key.startsWith('dart2_'))return '②';
 if(key.startsWith('dart3_'))return '③';
 if(key.startsWith('exercise_'))return '◎';
 return '•';
}
function ChallengeRecordGrid({cards,group,showHolder=true}:{cards:ChallengeRecordCard[];group?:string;showHolder?:boolean}){
 const groups=Array.from(new Set(cards.map(c=>c.group))).filter(g=>!group||g===group);
 return <div className="challenge-records">{groups.map(groupName=><section className={`record-group record-group-${String(groupName).toLowerCase().replace(/[^a-z0-9]+/g,'-')}`} key={groupName}><h3>{groupName}</h3><div className="record-grid">{cards.filter(c=>c.group===groupName).map(card=>{const icon=challengeRecordIcon(card);const qualityBand=card.quality>=.75?'top':card.quality>=.5?'good':card.quality>=.25?'mid':'low';return <div className={`record-card quality-${qualityBand}`} key={card.key}><span className="record-card-label"><i aria-hidden="true">{icon}</i><span>{card.label}</span></span><b style={{color:recordColor(card.quality)}}>{card.value}</b>{showHolder&&card.holder&&<em>{card.holder}</em>}<i className="record-quality" aria-hidden="true"><u style={{width:`${Math.round(card.quality*100)}%`,background:recordColor(card.quality)}}/></i></div>})}</div></section>)}</div>;
}

function makeExerciseRecordCards(stats:ChallengeExerciseAnalytics,cfg:ChallengeConfigData,holder?:string):ChallengeRecordCard[]{
 const type=challengeExerciseType(cfg);
 if(type==='classic')return [];
 const visits=Math.max(1,Number(cfg.visits||1));
 const cards:ChallengeRecordCard[]=[];
 const push=(key:string,label:string,value:number,max:number,opts?:{pct?:boolean;inverse?:boolean})=>{
  const ratio=max>0?Math.max(0,Math.min(1,value/max)):0;
  const quality=opts?.inverse?1-ratio:ratio;
  cards.push({key,label,value:opts?.pct?`${value.toFixed(1)}%`:String(Math.round(value*10)/10),numeric:value,quality,group:'RECORDS EXERCICE',holder,inverse:opts?.inverse});
 };
 push('exercise_validation','VALIDATION',Number(stats.validationRate||0),100,{pct:true});
 push('exercise_streak','SÉRIE OBJECTIFS',Number(stats.bestValidatedVisitStreak||0),visits);
 if(type==='half-it'){
  push('exercise_cuts','DIVISIONS ÷2',Number(stats.halfItCuts||0),visits,{inverse:true});
  push('exercise_perfect','VOLÉES PARFAITES',Number(stats.perfectVisits||0),visits);
 }else if(type==='grouping'){
  push('exercise_triplets','TRIPLETS',Number(stats.groupingTriplets||0),visits);
  push('exercise_group_points','POINTS GROUPÉS',Number(stats.groupingPoints||0),visits*180);
 }else{
  push('exercise_perfect','VOLÉES PARFAITES',Number(stats.perfectVisits||0),visits);
  push('exercise_best_visit','BEST OBJECTIF',Number(stats.bestVisitPoints||0),Math.max(1,maxPointsPerDart(cfg)*3));
 }
 return cards;
}

function buildGlobalExerciseRecordCards(rows:Array<{participant:Participant;stats:ChallengeExerciseAnalytics}>,cfg:ChallengeConfigData):ChallengeRecordCard[]{
 if(!rows.length)return [];
 const perPlayer=rows.map(({participant,stats})=>makeExerciseRecordCards(stats,cfg,String(participant.name||'Joueur').toUpperCase()));
 const keys=Array.from(new Set(perPlayer.flatMap(cards=>cards.map(card=>card.key))));
 return keys.map(key=>{
  const candidates=perPlayer.map(cards=>cards.find(card=>card.key===key)).filter(Boolean) as ChallengeRecordCard[];
  const sample=candidates[0];
  const lowerIsBetter=Boolean(sample?.inverse);
  const winner=lowerIsBetter?candidates.reduce((best,card)=>card.numeric<best.numeric?card:best,candidates[0]):candidates.reduce((best,card)=>card.numeric>best.numeric?card:best,candidates[0]);
  const tied=candidates.filter(card=>Math.abs(card.numeric-winner.numeric)<1e-9).map(card=>card.holder).filter(Boolean) as string[];
  return {...winner,holder:tied.length>1?`EX ÆQUO · ${tied.join(' / ')}`:winner.holder};
 });
}

function exerciseResultMeta(stats:ChallengeExerciseAnalytics,cfg:ChallengeConfigData):string{
 const type=challengeExerciseType(cfg);
 if(type==='grouping')return `${stats.validatedVisits}/${stats.completedVisits||stats.visitsPlayed} volées groupées · ${stats.groupingTriplets} triplet${stats.groupingTriplets>1?'s':''} · top ${stats.topGroupingSector||'—'}`;
 if(type==='half-it')return `${stats.validatedVisits}/${stats.completedVisits||stats.visitsPlayed} objectifs sécurisés · ${stats.halfItCuts} division${stats.halfItCuts>1?'s':''} ÷2 · série ${stats.bestValidatedVisitStreak}`;
 if(type==='clock'||type==='sequence')return `${stats.validatedVisits}/${stats.completedVisits||stats.visitsPlayed} objectifs validés · série ${stats.bestValidatedVisitStreak} · ${stats.perfectVisits} parfaite${stats.perfectVisits>1?'s':''}`;
 return `${stats.validationRate.toFixed(1)}% de validation`;
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

export default function ChallengePlay({go,params,onCompetitionFinish}:{go:(t:any,p?:any)=>void;params?:any;onCompetitionFinish?:(result:{winnerId:string|null;standings:Array<{id:string;name:string;score:number;tieBreak:number;accuracy:number;bestStreak:number}>;record:any})=>void|Promise<void>}){
 const historyStatsOnly=Boolean(params?.historyStatsOnly);
 const onlineStatsOverride=params?.onlineStatsOverride||null;
 useFullscreenPlay({enabled:true,lockBodyScroll:true});
 const theme=useTheme(); const {store}=useStore(); const awena=useAwenaOptional();
 const resumeRecord=params?.rec||null;
 const resumePayload=resumeRecord?.decoded||resumeRecord?.payload||resumeRecord?.resume?.livePayload||{};
 const resumeSnapshot=params?.snapshot||resumeRecord?.resume?.state||resumePayload?.state||resumePayload?.snapshot||null;
 const cfg:ChallengeConfigData=params?.config||resumeRecord?.resume?.config||resumePayload?.config||{target:'20',visits:30,rule:'all',playerIds:[],teamIds:[],participantMode:'players',participantSource:'direct',configMode:'guided',matchMode:'solo'};
 const soundsEnabled=React.useMemo(()=>{if(typeof cfg.soundsEnabled==='boolean')return cfg.soundsEnabled;try{return localStorage.getItem('dc_challenge_sounds_v1')!=='0'}catch{return true}},[cfg.soundsEnabled]);
 const profiles=store?.profiles||[];
 const teams=React.useMemo(()=>{try{return loadTeamsBySport('darts')||[]}catch{return []}},[]);
 const selectedTeams=React.useMemo(()=>teams.filter((team:any)=>(cfg.teamIds||[]).includes(String(team.id))),[teams,cfg.teamIds]);
 const participants=React.useMemo<Participant[]>(()=>{
  const picked=profiles.filter((p:any)=>cfg.playerIds?.includes(String(p.id))).map((p:any)=>{
   const team=selectedTeams.find((t:any)=>Array.isArray(t?.playerIds)&&t.playerIds.map(String).includes(String(p.id)));
   return {id:String(p.id),name:p.name||p.nickname||'Joueur',profile:p,team,teamName:team?.name||''};
  });
  if(picked.length) return picked;
  const competitionPlayers=Array.isArray(params?.competitionParticipants)?params.competitionParticipants:[];
  if(competitionPlayers.length){return competitionPlayers.map((p:any)=>{const id=String(p?.id||p?.playerId||p?.profileId||'');const profile=profiles.find((x:any)=>String(x.id)===id);return {id,name:p?.name||profile?.name||profile?.nickname||'Joueur',profile,team:p?.team||null,teamName:p?.teamName||'',avatarDataUrl:p?.avatarDataUrl||p?.avatarUrl||null}}).filter((p:any)=>p.id)}
  const resumedPlayers=(resumeRecord?.players||resumePayload?.players||resumePayload?.finalPlayers||resumeRecord?.summary?.perPlayer||[]);
  if(Array.isArray(resumedPlayers)&&resumedPlayers.length){return resumedPlayers.map((p:any)=>{const id=String(p?.id||p?.playerId||p?.profileId||p?.userId||'');const profile=profiles.find((x:any)=>String(x.id)===id);const teamId=String(p?.teamId||'');const team=selectedTeams.find((t:any)=>String(t.id)===teamId)||selectedTeams.find((t:any)=>Array.isArray(t?.playerIds)&&t.playerIds.map(String).includes(id));return {id,name:p?.name||p?.displayName||profile?.name||profile?.nickname||'Joueur',profile,team,teamName:p?.teamName||team?.name||'',avatarDataUrl:p?.avatarDataUrl||p?.avatarUrl||null}}).filter((p:any)=>p.id)}
  // Compatibilité avec les anciennes configs Challenge où l'équipe elle-même était un participant.
  if(cfg.participantMode==='teams') return (cfg.teamIds||[]).map(id=>{const team=teams.find((t:any)=>String(t.id)===String(id));return team?{id:`team:${team.id}`,name:team.name||'Équipe',team}:null}).filter(Boolean) as Participant[];
  return [];
 },[cfg.playerIds,cfg.participantMode,cfg.teamIds,profiles,selectedTeams,teams,resumeRecord,resumePayload,params?.competitionParticipants]);
 const safeParticipants=participants.length?participants:[{id:'solo',name:'Joueur'}];
 const initialLog=React.useMemo<Entry[]>(()=>{const source=resumeSnapshot?.log||resumeSnapshot?.entries||resumePayload?.entries||resumeRecord?.resume?.livePayload?.entries||[];return Array.isArray(source)?source.filter((e:any)=>e&&hits.includes(e.hit)&&e.pid).map((e:any)=>({hit:e.hit as Hit,pid:String(e.pid),...(Number(e?.segment)>0?{segment:Number(e.segment)}:{})})):[]},[resumeSnapshot,resumePayload,resumeRecord]);
 const [log,setLog]=React.useState<Entry[]>(()=>initialLog);
 const [rankOpen,setRankOpen]=React.useState(false);
 const [onlineRanking,setOnlineRanking]=React.useState<ChallengeLeaderboardRow[]>([]);
 const [onlineRankingLoading,setOnlineRankingLoading]=React.useState(false);
 const [onlineRankingError,setOnlineRankingError]=React.useState('');
 const [onlineHistorySyncing,setOnlineHistorySyncing]=React.useState(false);
 const [onlineTarget,setOnlineTarget]=React.useState<string>(()=>challengeObjectiveKeyTarget(cfg));
 const [onlineRule,setOnlineRule]=React.useState<string>(()=>String(cfg.rule||'all'));
 const [onlineVisits,setOnlineVisits]=React.useState<number>(()=>Math.max(1,Number(cfg.visits||30)));
 const [onlineScope,setOnlineScope]=React.useState<'public'|'team'>('public');
 const [onlineTeamKey,setOnlineTeamKey]=React.useState('');
 const [onlineTeams,setOnlineTeams]=React.useState<ChallengeLeaderboardTeam[]>([]);
 const [onlineFiltersOpen,setOnlineFiltersOpen]=React.useState(false);
 const [detailOpen,setDetailOpen]=React.useState(historyStatsOnly);
 const [playersOpen,setPlayersOpen]=React.useState(false);
 const [detailTab,setDetailTab]=React.useState<string>(()=>String(params?.initialDetailTab||'global'));
 const [detailSection,setDetailSection]=React.useState<string>('PERF');
 const [exerciseCareer,setExerciseCareer]=React.useState<ChallengeExerciseCareer|null>(null);
 const [exerciseCareerLoading,setExerciseCareerLoading]=React.useState(false);
 const [finishExerciseProgressByPlayer,setFinishExerciseProgressByPlayer]=React.useState<Record<string,ChallengeExerciseProgress>>({});
 const [finishExerciseProgressLoading,setFinishExerciseProgressLoading]=React.useState(false);
 const [voiceOn,setVoiceOn]=React.useState(false);
 const [voiceHeard,setVoiceHeard]=React.useState('');
 const [segmentMultiplier,setSegmentMultiplier]=React.useState<'S'|'D'|'T'>('S');
 const matchIdRef=React.useRef(String(params?.resumeId||resumeRecord?.matchId||resumeRecord?.id||`challenge-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
 const createdAtRef=React.useRef(Number(resumeRecord?.createdAt||resumeRecord?.created_at||Date.now())||Date.now());
 const lastPersistSignatureRef=React.useRef('');
 const trainingSavedRef=React.useRef(false);
 const onlineSubmittedRef=React.useRef(false);
 const onlineSubmittingRef=React.useRef(false);
 const onlineHistorySyncedRef=React.useRef(false);
 const competitionFinishRef=React.useRef(false);
 const soundPoolsRef=React.useRef<Partial<Record<keyof typeof challengeSoundUrls,HTMLAudioElement[]>>>({});
 const introPlayedRef=React.useRef(false);
 const endPlayedRef=React.useRef(false);
 const totalMax=cfg.visits*3*safeParticipants.length;
 const done=log.length>=totalMax;
 const activeIndex=Math.floor(log.length/3)%safeParticipants.length;
 const current=safeParticipants[activeIndex];
 const currentLog=log.filter(e=>e.pid===current.id);
 const turn=Math.min(cfg.visits,Math.floor(currentLog.length/3)+1);
 const currentVisitIndex=Math.max(0,Math.min(cfg.visits-1,Math.floor(currentLog.length/3)));
 const exerciseType=challengeExerciseType(cfg);
 const currentObjective=String(objectiveForVisit(cfg,currentVisitIndex));
 const currentObjectiveText=objectiveLabel(currentObjective,cfg);
 const currentBoardKey=objectiveBoardKey(currentObjective,cfg);
 const groupingMode=exerciseType==='grouping';
 const familyMode=exerciseType==='classic'&&(cfg.target==='any-double'||cfg.target==='any-triple');
 const objectiveFamilyMode=currentObjective==='any-double'||currentObjective==='any-triple';
 const currentEvaluation=React.useMemo(()=>evaluateChallengeEntries(currentLog,cfg),[currentLog,cfg]);
 const currentScore=currentEvaluation.score;
 const currentHits=currentLog.map(e=>e.hit);
 const counts=Object.fromEntries(hits.map(h=>[h,currentHits.filter(x=>x===h).length])) as Record<Hit,number>;
 const successful=currentEvaluation.entrySuccessful.filter(Boolean).length;
 const pct=Math.round(successful/Math.max(1,currentHits.length)*100);
 const participantScore=(p:Participant)=>computeChallengeDetailedStats(log.filter(e=>e.pid===p.id),cfg).score;
 const participantDarts=(p:Participant)=>log.filter(e=>e.pid===p.id).length;
 const streak=React.useMemo(()=>{let n=0;for(let i=currentEvaluation.entrySuccessful.length-1;i>=0;i--){if(!currentEvaluation.entrySuccessful[i])break;n++;}return n},[currentEvaluation]);
 const participantMaxStreak=(p:Participant)=>computeChallengeDetailedStats(log.filter(x=>x.pid===p.id),cfg).bestStreak;
 const participantStats=(p:Participant)=>{const detailed=computeChallengeDetailedStats(log.filter(e=>e.pid===p.id),cfg);return {score:detailed.score,darts:detailed.darts,hits:detailed.successful,misses:detailed.failures,pct:detailed.accuracy,streak:detailed.bestStreak,hitCounts:detailed.hitCounts,detailed};};
 const participantRankSnapshot=(p:Participant)=>{
  const entries=log.filter(e=>e.pid===p.id);
  const st=participantStats(p);
  return {score:st.score,tieBreakPoints:entries.reduce((sum,e)=>sum+tieBreakValue(e,cfg),0),accuracy:st.pct,bestStreak:st.streak,bestVisit:st.detailed.bestVisit,darts:st.darts,exerciseStats:analyzeChallengeExercise(entries,cfg)};
 };
 const allowedHits=React.useMemo<Hit[]>(()=>{
  if(groupingMode)return ['MISS'];
  if(currentObjective==='bull'||currentObjective==='bull25'||currentObjective==='bull50')return ['25','50','MISS'];
  if(objectiveFamilyMode)return [currentObjective==='any-triple'?'T':'D','MISS'];
  if(exerciseType!=='classic')return ['S','D','T','MISS'];
  if(isBullMode(cfg.rule,cfg.target))return ['25','50','MISS'];
  if(cfg.rule==='single')return ['S','MISS'];if(cfg.rule==='double')return ['D','MISS'];if(cfg.rule==='triple')return ['T','MISS'];return ['S','D','T','MISS'];
 },[groupingMode,currentObjective,objectiveFamilyMode,exerciseType,cfg.target,cfg.rule]);
 const objectiveHint=groupingMode?`Au moins ${Number(cfg.groupingHits||2)} fléchettes dans le même secteur ${Math.min(Number(cfg.groupingMin||15),Number(cfg.groupingMax||20))}–${Math.max(Number(cfg.groupingMin||15),Number(cfg.groupingMax||20))}`:exerciseType==='half-it'?'Échec de la volée = score ÷ 2':exerciseType==='clock'?'L’objectif avance à chaque volée':exerciseType==='sequence'?'Objectif programmé pour cette volée':'';
 const currentVisitStart=currentVisitIndex*3;
 const currentVisitEntries=currentLog.slice(currentVisitStart,currentVisitStart+3);
 const currentVisitFlags=currentEvaluation.entrySuccessful.slice(currentVisitStart,currentVisitStart+currentVisitEntries.length);
 const currentVisitPoints=currentEvaluation.entryPoints.slice(currentVisitStart,currentVisitStart+currentVisitEntries.length).reduce((sum,value)=>sum+Number(value||0),0);
 const currentVisitSuccessCount=currentVisitFlags.filter(Boolean).length;
 const currentVisitBeforeScore=currentVisitIndex>0?Number(currentEvaluation.cumulativeScores[currentVisitIndex-1]||0):(exerciseType==='half-it'?Math.max(0,Number(cfg.halfItStartScore??40)||0):0);
 const groupingRequired=Math.max(2,Math.min(3,Number(cfg.groupingHits||2)));
 const groupingLive=React.useMemo(()=>{
  const countsBySector=new Map<number,number>();
  currentVisitEntries.forEach(entry=>{const sector=Math.round(Number(entry.segment||0));if(entry.hit==='MISS'||sector<1||sector>20)return;countsBySector.set(sector,(countsBySector.get(sector)||0)+1)});
  const leader=Array.from(countsBySector.entries()).map(([sector,count])=>({sector,count})).sort((a,b)=>b.count-a.count||b.sector-a.sector)[0]||null;
  return {leader,qualified:Boolean(leader&&leader.count>=groupingRequired),remaining:leader?Math.max(0,groupingRequired-leader.count):groupingRequired};
 },[currentVisitEntries,groupingRequired]);
 const currentVisitDartLabels=React.useMemo(()=>currentVisitEntries.map(entry=>{
  if(entry.hit==='MISS')return 'MISS';
  if(entry.hit==='25')return 'B25';
  if(entry.hit==='50')return 'B50';
  const fallback=/^([1-9]|1[0-9]|20)$/.test(currentObjective)?Number(currentObjective):0;
  const segment=Math.round(Number(entry.segment||fallback||0));
  return segment?`${entry.hit}${segment}`:entry.hit;
 }),[currentVisitEntries,currentObjective]);
 const liveExerciseStatus=React.useMemo(()=>{
  if(exerciseType==='grouping'){
   if(groupingLive.qualified)return {tone:'ok',title:`SECTEUR ${groupingLive.leader?.sector} VALIDÉ`,detail:`${groupingLive.leader?.count}/${groupingRequired} fléchettes · +${currentVisitPoints} pts`};
   if(groupingLive.leader)return {tone:'wait',title:`GROUPEMENT ${groupingLive.leader.sector} · ${groupingLive.leader.count}/${groupingRequired}`,detail:`Encore ${groupingLive.remaining} fléchette${groupingLive.remaining>1?'s':''} sur le même secteur`};
   return {tone:'wait',title:`GROUPE ${groupingRequired} FLÉCHETTES`,detail:'Commence sur un secteur autorisé'};
  }
  if(exerciseType==='half-it'){
   if(currentVisitSuccessCount>0)return {tone:'ok',title:`OBJECTIF ${currentObjectiveText} SÉCURISÉ`,detail:`+${currentVisitPoints} pts sur cette volée`};
   const remaining=Math.max(0,3-currentVisitEntries.length);
   return {tone:'danger',title:`OBJECTIF ${currentObjectiveText}`,detail:remaining?`${remaining} fléchette${remaining>1?'s':''} pour éviter ÷2`:`Score ${currentVisitBeforeScore} → ${Math.ceil(currentVisitBeforeScore/2)}`};
  }
  if(exerciseType==='clock'||exerciseType==='sequence')return {tone:currentVisitSuccessCount>0?'ok':'wait',title:`OBJECTIF ${currentObjectiveText}`,detail:`${currentVisitSuccessCount}/3 hit${currentVisitSuccessCount>1?'s':''} · +${currentVisitPoints} pts`};
  return null;
 },[exerciseType,groupingLive,groupingRequired,currentVisitPoints,currentVisitSuccessCount,currentObjectiveText,currentVisitEntries.length,currentVisitBeforeScore]);
 const onlineObjectiveTarget=challengeObjectiveKeyTarget(cfg);
 const onlineTargetOptions=React.useMemo(()=>Array.from(new Set([onlineObjectiveTarget,...onlineTargetFilters])),[onlineObjectiveTarget]);
 const onlineVisitOptions=React.useMemo(()=>Array.from(new Set([Math.max(1,Number(cfg.visits||1)),onlineVisits,...onlineVisitFilters])).sort((a,b)=>a-b),[cfg.visits,onlineVisits]);
 const playChallengeSound=React.useCallback((key:keyof typeof challengeSoundUrls)=>{
  if(!soundsEnabled||typeof window==='undefined') return;
  try{
   const src=challengeSoundUrls[key];
   const pool=soundPoolsRef.current[key]||(soundPoolsRef.current[key]=[]);
   let audio=pool.find(a=>a.paused||a.ended);
   if(!audio){audio=new Audio(src);audio.preload='auto';pool.push(audio);}
   audio.currentTime=0;
   audio.volume=key==='intro'?0.72:key==='end'?0.88:0.96;
   void audio.play().catch(()=>{});
  }catch{}
 },[soundsEnabled]);
 React.useEffect(()=>{
  if(!soundsEnabled||historyStatsOnly||introPlayedRef.current) return;
  introPlayedRef.current=true;
  const id=window.setTimeout(()=>playChallengeSound('intro'),120);
  return()=>window.clearTimeout(id);
 },[soundsEnabled,historyStatsOnly,playChallengeSound]);
 React.useEffect(()=>{
  if(!soundsEnabled||!done||historyStatsOnly||endPlayedRef.current) return;
  endPlayedRef.current=true;
  playChallengeSound('end');
 },[soundsEnabled,done,historyStatsOnly,playChallengeSound]);
 const add=React.useCallback((h:Hit,segment?:number|null)=>{if(done)return;setLog(v=>[...v,{hit:h,pid:safeParticipants[Math.floor(v.length/3)%safeParticipants.length].id,...(segment?{segment}: {})}]);if(h==='S'||h==='D'||h==='T'||h==='MISS')playChallengeSound(h);},[done,safeParticipants,playChallengeSound]);
 const addFamilySegment=React.useCallback((segment:number)=>add(currentObjective==='any-triple'?'T':'D',segment),[add,currentObjective]);
 const addGroupingSegment=React.useCallback((segment:number)=>add(segmentMultiplier,segment),[add,segmentMultiplier]);
 const lang=React.useMemo(()=>{try{return localStorage.getItem('dc_lang_v1')||navigator.language||'fr'}catch{return 'fr'}},[]);
 const startVoice=React.useCallback(()=>{if(groupingMode||objectiveFamilyMode){setVoiceHeard('Utilisez le keypad détaillé pour cet objectif');return;}const Ctor=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!Ctor){setVoiceHeard('Micro non supporté');return;}try{const rec=new Ctor();rec.lang=localeMap[String(lang).toLowerCase().split('-')[0]]||lang||'fr-FR';rec.interimResults=false;rec.maxAlternatives=5;rec.continuous=false;setVoiceOn(true);setVoiceHeard('…');rec.onresult=(ev:any)=>{const alternatives=Array.from(ev?.results?.[0]||[]) as any[];const heard=alternatives.map(a=>a?.transcript||'').filter(Boolean).join(' | ');setVoiceHeard(heard);const hit=parseChallengeVoice(heard,String(lang),allowedHits);if(hit)add(hit);else setVoiceHeard(`${heard} ?`);};rec.onerror=()=>setVoiceHeard('');rec.onend=()=>setVoiceOn(false);rec.start();}catch{setVoiceOn(false);}},[lang,allowedHits,add,groupingMode,objectiveFamilyMode]);
 const participantTieBreak=(p:Participant)=>log.filter(e=>e.pid===p.id).reduce((sum,e)=>sum+tieBreakValue(e,cfg),0);
 const standings=[...safeParticipants].sort((a,b)=>compareChallengeRankRows(participantRankSnapshot(a),participantRankSnapshot(b),cfg));
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
   const exerciseStats=analyzeChallengeExercise(entries,cfg);
   const evaluated=evaluateChallengeEntries(entries,cfg);
   const onlineUserId=explicitOnlineUserIdFromProfile(p.profile);
   return {id:String(p.id),name:p.name,avatarDataUrl:(p.profile?avatarSrc(p.profile):teamSrc(p.team))||null,...(onlineUserId?{onlineUserId,userId:onlineUserId}:{}),teamId:p.team?String(p.team.id||''):undefined,teamName:p.teamName||p.team?.name||'',score:detailed.score,points:detailed.score,darts:detailed.darts,dartsThrown:detailed.darts,hitCount:detailed.successful,misses:detailed.failures,bestStreak:detailed.bestStreak,bestVisit:detailed.bestVisit,avgVisit:detailed.avgVisit,successRate:detailed.accuracy,target:cfg.target,rule:cfg.rule,hitSummary:{S:detailed.hitCounts.S,D:detailed.hitCounts.D,T:detailed.hitCounts.T,SBull:detailed.hitCounts['25'],DBull:detailed.hitCounts['50'],MISS:detailed.hitCounts.MISS,darts:detailed.darts,hits:detailed.successful},positionStats:detailed.positionStats,visitScores:detailed.visitScores,cumulativeScores:detailed.cumulativeScores,exerciseStats,favNumberHits:{[String(targetSegment)]:detailed.successful},tieBreakPoints:entries.reduce((sum,e)=>sum+tieBreakValue(e,cfg),0),segmentHits:Object.fromEntries(Array.from({length:20},(_,i)=>{const n=i+1;return [String(n),entries.filter((e,index)=>Number(e.segment)===n&&evaluated.entrySuccessful[index]).length]}))};
  });
  const rankings=[...perPlayer].sort((a,b)=>compareChallengeRankRows(a as any,b as any,cfg)).map((row,index)=>({...row,rank:index+1}));
  const winnerId=status==='finished'&&safeParticipants.length>1?(rankings[0]?.id||null):null;
  const finalScores=Object.fromEntries(rankings.map(row=>[row.id,row.score]));
  const scoreLine=rankings.map(row=>`${row.name} ${row.score}`).join(' • ');
  const resumeState={log:[...log],entries:[...log],activePlayerIndex:activeIndex,turn,updatedAt:now};
  const matchMode=String(cfg.matchMode||'solo').toLowerCase();
  const summary={title:'CHALLENGE',kind:'challenge',mode:'challenge',matchMode,status,finished:status==='finished',winnerId,scoreLine,finalScores,rankings,perPlayer:rankings,target:cfg.target,leaderboardTarget:challengeObjectiveKeyTarget(cfg),objective:exerciseTitle(cfg),rule:cfg.rule,visits:cfg.visits,exerciseType:challengeExerciseType(cfg)};
  const payload={kind:'challenge',mode:'challenge',sport:'darts',status,config:{...cfg,leaderboardTarget:challengeObjectiveKeyTarget(cfg)},state:resumeState,entries:[...log],events:[...log],players:rankings,finalPlayers:rankings,summary:{...summary},stats:{kind:'challenge',mode:'challenge',players:rankings.map(row=>({id:row.id,name:row.name,score:row.score,points:row.score,best:row.score,bestScore:row.score,darts:row.darts,dartsThrown:row.darts,hitCount:row.hitCount,misses:row.misses,bestStreak:row.bestStreak,bestVisit:row.bestVisit,avgVisit:row.avgVisit,successRate:row.successRate,hitSummary:row.hitSummary,positionStats:row.positionStats,visitScores:row.visitScores,cumulativeScores:row.cumulativeScores,exerciseStats:(row as any).exerciseStats,favNumberHits:row.favNumberHits,special:{score:row.score,points:row.score,best:row.score,bestScore:row.score,bestStreak:row.bestStreak,bestVisit:row.bestVisit,avgVisit:row.avgVisit,successRate:row.successRate,positionStats:row.positionStats,exerciseStats:(row as any).exerciseStats,targetHits:row.hitCount,misses:row.misses,target:cfg.target,rule:cfg.rule,tieBreakPoints:(row as any).tieBreakPoints||0,segmentHits:(row as any).segmentHits||{},familyMode:cfg.target==='any-double'||cfg.target==='any-triple'},segmentHits:(row as any).segmentHits||{},tieBreakPoints:(row as any).tieBreakPoints||0})),global:{matches:1,target:cfg.target,rule:cfg.rule,visits:cfg.visits,exerciseType:challengeExerciseType(cfg)}}};
  return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:'challenge',mode:'challenge',sport:'darts',status,createdAt:createdAtRef.current,updatedAt:now,finishedAt:status==='finished'?now:undefined,winnerId,players:safeParticipants.map(p=>{const onlineUserId=explicitOnlineUserIdFromProfile(p.profile);return {id:String(p.id),name:p.name,avatarDataUrl:(p.profile?avatarSrc(p.profile):teamSrc(p.team))||null,...(onlineUserId?{onlineUserId,userId:onlineUserId}:{}),teamId:p.team?String(p.team.id||''):undefined,teamName:p.teamName||p.team?.name||''}}),game:{mode:'challenge',target:cfg.target,leaderboardTarget:challengeObjectiveKeyTarget(cfg),objective:exerciseTitle(cfg),rule:cfg.rule,visits:cfg.visits,matchMode,exerciseType:challengeExerciseType(cfg)},summary,payload,resume:status==='in_progress'?{config:cfg,state:resumeState,livePayload:payload,summary}:undefined};
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
  if(!done||historyStatsOnly||!onCompetitionFinish||competitionFinishRef.current) return;
  competitionFinishRef.current=true;
  const record:any=buildChallengeRecord('finished');
  const rows=safeParticipants.map(p=>{const st=participantStats(p);const exerciseStats=analyzeChallengeExercise(log.filter(e=>e.pid===p.id),cfg);return{id:String(p.id),name:p.name,score:st.score,tieBreak:participantTieBreak(p),tieBreakPoints:participantTieBreak(p),accuracy:st.pct,bestStreak:st.streak,bestVisit:st.detailed.bestVisit,darts:st.darts,exerciseStats}});
  const tieMode=String((cfg as any)?.competition?.tieBreak||'exercise');
  rows.sort((a,b)=>challengeExerciseType(cfg)!=='classic'||tieMode==='exercise'?compareChallengeRankRows(a as any,b as any,cfg):b.score-a.score||(tieMode==='accuracy'?b.accuracy-a.accuracy:tieMode==='best_streak'?b.bestStreak-a.bestStreak:b.tieBreak-a.tieBreak));
  const winnerId=rows[0]?.id||null;
  void Promise.resolve(onCompetitionFinish({winnerId,standings:rows,record})).catch(error=>console.warn('[challenge] competition finish callback failed',error));
 },[done,historyStatsOnly,onCompetitionFinish,buildChallengeRecord,standings]);

 React.useEffect(()=>{
  if(historyStatsOnly||!done||trainingSavedRef.current||safeParticipants.length!==1) return;
  trainingSavedRef.current=true;
  const p=safeParticipants[0];
  const stats=participantStats(p);
  try{
   recordTrainingDetailedSession({id:`${matchIdRef.current}-training`,modeId:'training_challenges',participantId:p.profile?.id?String(p.profile.id):String(p.id),participantName:p.name,participantType:'player',startedAt:createdAtRef.current,endedAt:Date.now(),durationMs:Date.now()-createdAtRef.current,darts:stats.darts,hits:stats.hits,misses:stats.misses,points:stats.score,accuracyPct:stats.pct,success:stats.score>0,config:{...cfg,sourceMode:'challenge',challengeTarget:cfg.target,challengeRule:cfg.rule},metrics:{sourceMode:'challenge',score:stats.score,bestStreak:stats.streak,bestVisit:stats.detailed.bestVisit,avgVisit:stats.detailed.avgVisit,target:cfg.target,rule:cfg.rule,visits:cfg.visits,exerciseType:challengeExerciseType(cfg),exerciseValidationRate:analyzeChallengeExercise(log.filter(entry=>entry.pid===p.id),cfg).validationRate,matchId:matchIdRef.current,bestDartPosition:(stats.detailed.positionStats.slice().sort((a,b)=>b.accuracy-a.accuracy)[0]?.position||0),bestDartAccuracy:(stats.detailed.positionStats.slice().sort((a,b)=>b.accuracy-a.accuracy)[0]?.accuracy||0),...Object.fromEntries(stats.detailed.positionStats.flatMap(pos=>[[`dart${pos.position}Attempts`,pos.attempts],[`dart${pos.position}Successful`,pos.successful],[`dart${pos.position}Accuracy`,pos.accuracy],[`dart${pos.position}S`,pos.S],[`dart${pos.position}D`,pos.D],[`dart${pos.position}T`,pos.T],[`dart${pos.position}B25`,pos.B25],[`dart${pos.position}B50`,pos.B50],[`dart${pos.position}MISS`,pos.MISS]]))},visitHistory:log,telemetry:{target:cfg.target,rule:cfg.rule,hits:stats.hitCounts,positionStats:stats.detailed.positionStats,visitScores:stats.detailed.visitScores,cumulativeScores:stats.detailed.cumulativeScores,exerciseStats:analyzeChallengeExercise(log.filter(entry=>entry.pid===p.id),cfg)},telemetryCoverage:'exact'} as any);
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
   // P0 V10: ouvrir le classement doit être immédiat. Le backfill des anciennes
   // parties reste uniquement sur le bouton SYNCHRONISER explicite.
   const scopes=await refreshOnlineTeams();
   if(cancelled) return;
   if(onlineScope==='team'&&!onlineTeamKey){
    if(scopes[0]) setOnlineTeamKey(scopes[0].key);
    else {setOnlineRanking([]);setOnlineRankingLoading(false);return;}
   }
   await refreshOnlineRanking();
  })();
  return()=>{cancelled=true};
 },[rankOpen,onlineTarget,onlineRule,onlineVisits,onlineScope,onlineTeamKey,refreshOnlineTeams,refreshOnlineRanking]);

 React.useEffect(()=>{
  if(historyStatsOnly||!done||onlineSubmittedRef.current||onlineSubmittingRef.current) return;
  onlineSubmittingRef.current=true;
  void (async()=>{
   try{
    const uid=await getChallengeOnlineUserId();
    if(!uid) return;
    const linked=safeParticipants.find((p:any)=>isChallengeProfileLinkedToUser(p?.profile,uid));
    // ONLINE = comptes utilisateurs uniquement. Un profil purement local ne doit
    // jamais être publié, même lorsqu'il est le seul participant d'un Challenge SOLO.
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
     target:challengeObjectiveKeyTarget(cfg),
     rule:cfg.rule,
     visits:cfg.visits,
     matchMode:cfg.matchMode||'solo',
     setMode:(cfg as any).setMode||null,
     setTarget:(cfg as any).setTarget||null,
     legMode:(cfg as any).legMode||null,
     legTarget:(cfg as any).legTarget||null,
     score:stats.score,
     darts:stats.darts,
     bestStreak:exerciseType==='classic'?stats.streak:analyzeChallengeExercise(log.filter(entry=>entry.pid===linked.id),cfg).bestValidatedVisitStreak,
     accuracy:exerciseType==='classic'?stats.pct:analyzeChallengeExercise(log.filter(entry=>entry.pid===linked.id),cfg).validationRate,
     matchId:matchIdRef.current,
     displayName:linked.name,
     avatarUrl:avatarSrc(profile)||null,
     countryCode:profile?.countryCode||profile?.country||pi?.countryCode||pi?.country||null,
     teams:myTeams,
    stats:{
     exerciseConfig:{...cfg},
     exerciseStats:analyzeChallengeExercise(log.filter(entry=>entry.pid===linked.id),cfg),
     bestVisit:stats.detailed.bestVisit,
     avgVisit:stats.detailed.avgVisit,
     hitCounts:stats.detailed.hitCounts,
     positionStats:stats.detailed.positionStats,
     visitScores:stats.detailed.visitScores,
     cumulativeScores:stats.detailed.cumulativeScores,
     entries:log.filter(entry=>entry.pid===linked.id).map(entry=>({hit:entry.hit,segment:entry.segment||null,pid:String(linked.id)})),
     tieBreakPoints:log.filter(entry=>entry.pid===linked.id).reduce((sum,entry)=>sum+tieBreakValue(entry,cfg),0),
     segmentHits:Object.fromEntries(Array.from({length:20},(_,i)=>{const n=i+1;return [String(n),log.filter(entry=>entry.pid===linked.id&&Number(entry.segment)===n&&entry.hit!=='MISS').length]})),
     team:myTeams[0]?(()=>{const localTeam=linked.team||teams.find((team:any)=>String(team?.syncedClubTeamId||team?.clubTeamId||team?.onlineTeamId||team?.id||'')===String(myTeams[0].key));return {key:myTeams[0].key,name:myTeams[0].name,logoUrl:localTeam?teamSrc(localTeam):null}})():null,
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
 const exerciseAnalyticsByPlayer=React.useMemo(()=>safeParticipants.map(p=>({participant:p,stats:analyzeChallengeExercise(log.filter(e=>e.pid===p.id),cfg)})),[safeParticipants,log,cfg]);
 const globalExerciseAnalytics=React.useMemo(()=>mergeExerciseAnalytics(exerciseAnalyticsByPlayer.map(row=>row.stats),cfg),[exerciseAnalyticsByPlayer,cfg]);
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
 const detailExerciseAnalytics=(detailTab==='global'||detailTab==='match')?globalExerciseAnalytics:(exerciseAnalyticsByPlayer.find(x=>x.participant.id===detailTab)?.stats||globalExerciseAnalytics);
 const detailStats=(historyStatsOnly&&safeParticipants.length===1&&overrideDetailed)?overrideDetailed:(detailCurrent?.stats||globalDetailed);
 const isSoloDetailView=safeParticipants.length===1;
 const detailRecordCards=React.useMemo(()=>{
  if(historyStatsOnly&&safeParticipants.length===1&&overrideRecordRaw)return makeRecordCards(overrideRecordRaw,cfg,String(safeParticipants[0]?.name||'Joueur').toUpperCase());
  if(detailTab==='global'||detailTab==='match')return globalRecordCards;
  const row=recordRows.find(x=>x.participant.id===detailTab)||recordRows[0];
  return row?makeRecordCards(row.raw,cfg):globalRecordCards;
 },[historyStatsOnly,safeParticipants,overrideRecordRaw,detailTab,globalRecordCards,recordRows,cfg]);
 const bestDartPosition=detailStats.positionStats.slice().sort((a,b)=>b.accuracy-a.accuracy)[0];
 const globalExerciseRecordCards=React.useMemo(()=>buildGlobalExerciseRecordCards(exerciseAnalyticsByPlayer,cfg),[exerciseAnalyticsByPlayer,cfg]);
 const detailExerciseRecordCards=React.useMemo(()=>{
  if(exerciseType==='classic')return [];
  if(detailTab==='global'||detailTab==='match')return globalExerciseRecordCards;
  const row=exerciseAnalyticsByPlayer.find(item=>item.participant.id===detailTab)||exerciseAnalyticsByPlayer[0];
  return row?makeExerciseRecordCards(row.stats,cfg,String(row.participant.name||'Joueur').toUpperCase()):globalExerciseRecordCards;
 },[exerciseType,detailTab,globalExerciseRecordCards,exerciseAnalyticsByPlayer,cfg]);
 const detailRecordGroups=React.useMemo(()=>Array.from(new Set(detailRecordCards.map(card=>card.group))),[detailRecordCards]);
 const detailSectionTabs=React.useMemo(()=>Array.from(new Set([...detailRecordGroups,...(exerciseType!=='classic'?['EXERCICE']:[]),'ANALYSE','FLÉCHETTES','VOLÉES'])),[detailRecordGroups,exerciseType]);
 const detailSectionMeta:Record<string,{icon:string;label:string}>={PERF:{icon:'↗',label:'PERF'},HITS:{icon:'◎',label:'HITS'},'SÉRIES':{icon:'✦',label:'SÉRIES'},'%':{icon:'%',label:'%'},'FL. 1':{icon:'①',label:'FL.1'},'FL. 2':{icon:'②',label:'FL.2'},'FL. 3':{icon:'③',label:'FL.3'},EXERCICE:{icon:'🎯',label:'EXERCICE'},ANALYSE:{icon:'◉',label:'VISUEL'},'FLÉCHETTES':{icon:'➶',label:'DARTS'},'VOLÉES':{icon:'▮',label:'VOLÉES'}};
 const detailEntries=React.useMemo(()=>{
  if(detailTab==='global'||detailTab==='match') return log;
  const pid=detailCurrent?.participant?.id;
  return pid?log.filter(entry=>entry.pid===pid):log;
 },[detailTab,detailCurrent,log]);
 const detailFamilySegments=React.useMemo(()=>{
  if(!familyMode) return [] as Array<{segment:number;hits:number}>;
  const map=new Map<number,number>();
  detailEntries.forEach(entry=>{const n=Number(entry.segment||0); if(!n) return; if(hitValue(entry.hit,cfg.rule,cfg.target,entry.segment)<=0) return; map.set(n,(map.get(n)||0)+1);});
  return Array.from(map.entries()).map(([segment,hits])=>({segment,hits})).sort((a,b)=>b.hits-a.hits||b.segment-a.segment);
 },[familyMode,detailEntries,cfg.rule,cfg.target]);
 const detailTieBreak=React.useMemo(()=>detailEntries.reduce((sum,entry)=>sum+tieBreakValue(entry,cfg),0),[detailEntries,cfg]);
 const selectedOnlineTeam=onlineTeams.find(team=>team.key===onlineTeamKey)||null;
 const familyBandClass=(n:number)=>n<=5?'band-neutral':n<=10?'band-yellow':n<=15?'band-orange':'band-red';
 const detailGroupingSectors=React.useMemo(()=>Object.entries(detailExerciseAnalytics.groupingSectorHits||{}).map(([sector,hits])=>({sector:Number(sector),hits:Number(hits)||0})).sort((a,b)=>b.hits-a.hits||b.sector-a.sector).slice(0,8),[detailExerciseAnalytics]);
 const detailExerciseDenominator=detailExerciseAnalytics.completedVisits||detailExerciseAnalytics.visitsPlayed;
 const exerciseRouteItems=React.useMemo(()=>{
  if(exerciseType==='classic')return [] as Array<{key:string;label:string}>;
  if(exerciseType==='grouping'){
   const min=Math.min(Number(cfg.groupingMin||15),Number(cfg.groupingMax||20));
   const max=Math.max(Number(cfg.groupingMin||15),Number(cfg.groupingMax||20));
   return Array.from({length:Math.max(1,max-min+1)},(_,index)=>({key:`g-${min+index}`,label:String(min+index)}));
  }
  return Array.from({length:Math.max(1,Number(cfg.visits||1))},(_,index)=>{const objective=String(objectiveForVisit(cfg,index));return {key:`${index}-${objective}`,label:objectiveLabel(objective,cfg)};});
 },[exerciseType,cfg]);
 const exerciseRouteWindow=React.useMemo(()=>{
  if(exerciseType==='grouping'||exerciseRouteItems.length<=9)return exerciseRouteItems.map((item,index)=>({...item,index}));
  const start=Math.max(0,Math.min(exerciseRouteItems.length-9,currentVisitIndex-4));
  return exerciseRouteItems.slice(start,start+9).map((item,offset)=>({...item,index:start+offset}));
 },[exerciseType,exerciseRouteItems,currentVisitIndex]);
 const detailObjectivePerformance=React.useMemo(()=>{
  if(exerciseType==='classic'||exerciseType==='grouping')return [] as Array<{index:number;objective:string;label:string;attempts:number;completed:number;validated:number;perfect:number;successfulHits:number;points:number;cuts:number;scoreBefore:number|null;scoreAfter:number|null}>;
  const playerRows=detailTab==='global'||detailTab==='match'?exerciseAnalyticsByPlayer:(()=>{const row=exerciseAnalyticsByPlayer.find(item=>item.participant.id===detailTab)||exerciseAnalyticsByPlayer[0];return row?[row]:[]})();
  return Array.from({length:Math.max(1,Number(cfg.visits||1))},(_,index)=>{
   const objective=String(objectiveForVisit(cfg,index));
   const visits=playerRows.map(row=>(row.stats.visitStats||[]).find(visit=>visit.index===index)).filter(Boolean) as NonNullable<ChallengeExerciseAnalytics['visitStats'][number]>[];
   const attempts=visits.filter(visit=>visit.darts>0).length;
   const completed=visits.filter(visit=>visit.darts>=3).length;
   const validated=visits.filter(visit=>visit.validated).length;
   const perfect=visits.filter(visit=>visit.perfect).length;
   const successfulHits=visits.reduce((sum,visit)=>sum+Number(visit.successfulHits||0),0);
   const points=visits.reduce((sum,visit)=>sum+Number(visit.points||0),0);
   const cuts=visits.filter(visit=>visit.halfItCut).length;
   const single=visits.length===1?visits[0]:null;
   return {index,objective,label:objectiveLabel(objective,cfg),attempts,completed,validated,perfect,successfulHits,points,cuts,scoreBefore:single?single.scoreBefore:null,scoreAfter:single?single.scoreAfter:null};
  });
 },[exerciseType,detailTab,exerciseAnalyticsByPlayer,cfg]);
 const detailObjectiveHighlights=React.useMemo(()=>{
  const played=detailObjectivePerformance.filter(row=>row.attempts>0);
  if(!played.length)return {best:null as (typeof played)[number]|null,weak:null as (typeof played)[number]|null};
  const rate=(row:(typeof played)[number])=>row.attempts?row.validated/row.attempts:0;
  const best=played.slice().sort((a,b)=>rate(b)-rate(a)||b.perfect-a.perfect||b.points-a.points||a.index-b.index)[0]||null;
  const weak=played.slice().sort((a,b)=>rate(a)-rate(b)||b.cuts-a.cuts||a.points-b.points||a.index-b.index)[0]||null;
  return {best,weak};
 },[detailObjectivePerformance]);
 const careerParticipant=React.useMemo(()=>{
  if(isSoloDetailView)return safeParticipants[0]||null;
  if(detailTab==='global'||detailTab==='match')return null;
  return safeParticipants.find(p=>p.id===detailTab)||null;
 },[isSoloDetailView,safeParticipants,detailTab]);
 const careerIdentity=React.useMemo(()=>careerParticipant?{
  ids:[String(careerParticipant.id||''),String(careerParticipant.profile?.id||'')].filter(Boolean),
  onlineUserIds:[explicitOnlineUserIdFromProfile(careerParticipant.profile)].filter(Boolean),
  teamIds:[String(careerParticipant.team?.id||'')].filter(Boolean),
  name:String(careerParticipant.name||''),
 }:null,[careerParticipant]);
 const careerConfigKey=React.useMemo(()=>challengeCareerConfigKey(cfg),[cfg]);
 React.useEffect(()=>{
  if(!detailOpen||detailSection!=='EXERCICE'||exerciseType==='classic'||!careerParticipant||!careerIdentity){setExerciseCareer(null);setExerciseCareerLoading(false);return;}
  let cancelled=false;
  setExerciseCareerLoading(true);
  void (async()=>{
   try{
    const records=await History.getAll();
    if(cancelled)return;
    const participantEntries=log.filter(entry=>entry.pid===careerParticipant.id);
    const currentSession=(done||historyStatsOnly)?{
     matchId:matchIdRef.current,
     playedAt:Number(resumeRecord?.finishedAt||resumeRecord?.updatedAt||Date.now())||Date.now(),
     score:computeChallengeDetailedStats(participantEntries,cfg).score,
     exerciseStats:analyzeChallengeExercise(participantEntries,cfg),
    }:null;
    setExerciseCareer(buildChallengeExerciseCareer(records,cfg,careerIdentity,currentSession));
   }catch(error){
    console.warn('[challenge] exercise career load failed',error);
    if(!cancelled)setExerciseCareer(null);
   }finally{if(!cancelled)setExerciseCareerLoading(false)}
  })();
  return()=>{cancelled=true};
 },[detailOpen,detailSection,exerciseType,careerParticipant,careerIdentity,careerConfigKey,done,historyStatsOnly,resumeRecord]);
 const finishProgressParticipantKey=React.useMemo(()=>safeParticipants.map(p=>`${p.id}:${explicitOnlineUserIdFromProfile(p.profile)}:${p.team?.id||''}`).join('|'),[safeParticipants]);
 React.useEffect(()=>{
  if(exerciseType==='classic'||(!done&&!historyStatsOnly)){setFinishExerciseProgressByPlayer({});setFinishExerciseProgressLoading(false);return;}
  let cancelled=false;
  setFinishExerciseProgressLoading(true);
  void (async()=>{
   try{
    const records=await History.getAll();
    if(cancelled)return;
    const currentMatchId=String(matchIdRef.current||'');
    const currentPlayedAt=Number(resumeRecord?.finishedAt||resumeRecord?.updatedAt||resumeRecord?.createdAt||Date.now())||Date.now();
    const recordTime=(record:any)=>Number(record?.finishedAt??record?.updatedAt??record?.createdAt??record?.updated_at??record?.created_at??0)||0;
    const priorRecords=(Array.isArray(records)?records:[]).filter((record:any)=>{
     const id=String(record?.matchId||record?.id||'');
     if(id&&id===currentMatchId)return false;
     if(historyStatsOnly){const at=recordTime(record);if(at&&at>=currentPlayedAt)return false;}
     return true;
    });
    const next:Record<string,ChallengeExerciseProgress>={};
    for(const participant of safeParticipants){
     const identity={
      ids:[String(participant.id||''),String(participant.profile?.id||'')].filter(Boolean),
      onlineUserIds:[explicitOnlineUserIdFromProfile(participant.profile)].filter(Boolean),
      teamIds:[String(participant.team?.id||'')].filter(Boolean),
      name:String(participant.name||''),
     };
     const prior=buildChallengeExerciseCareer(priorRecords,cfg,identity,null);
     const entries=log.filter(entry=>entry.pid===participant.id);
     const detailed=computeChallengeDetailedStats(entries,cfg);
     const analytics=analyzeChallengeExercise(entries,cfg);
     next[String(participant.id)]=buildChallengeExerciseProgress(detailed.score,analytics,prior,cfg);
    }
    if(!cancelled)setFinishExerciseProgressByPlayer(next);
   }catch(error){
    console.warn('[challenge] exercise progress comparison failed',error);
    if(!cancelled)setFinishExerciseProgressByPlayer({});
   }finally{if(!cancelled)setFinishExerciseProgressLoading(false)}
  })();
  return()=>{cancelled=true};
 },[done,historyStatsOnly,exerciseType,careerConfigKey,finishProgressParticipantKey,log.length,resumeRecord]);
 const currentVisitValidated=React.useCallback((visitIndex:number)=>currentEvaluation.entrySuccessful.slice(visitIndex*3,visitIndex*3+3).some(Boolean),[currentEvaluation]);
 const finishLeader=standings[0]||safeParticipants[0];
 const finishLeaderStats=finishLeader?participantStats(finishLeader):participantStats(safeParticipants[0]);
 const finishLeaderExercise=finishLeader?(exerciseAnalyticsByPlayer.find(row=>row.participant.id===finishLeader.id)?.stats||globalExerciseAnalytics):globalExerciseAnalytics;
 const finishExerciseRecords=exerciseType==='classic'?[]:globalExerciseRecordCards.slice(0,4);
 const finishExerciseSubline=exerciseType==='classic'?`${finishLeaderStats.pct}% de réussite · ${finishLeaderStats.streak} de suite`:exerciseResultMeta(finishLeaderExercise,cfg);
 const finishLeaderProgress=finishLeader?finishExerciseProgressByPlayer[String(finishLeader.id)]||null:null;
 const finishProgressImproved=finishLeaderProgress?(exerciseType==='grouping'?finishLeaderProgress.improvedSector:finishLeaderProgress.improvedObjective):null;
 const finishProgressRegressed=finishLeaderProgress?(exerciseType==='grouping'?finishLeaderProgress.regressedSector:finishLeaderProgress.regressedObjective):null;

 return <div className={`cp exercise-${exerciseType}`} style={{background:theme.bg,color:theme.text}}>
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
     <div className="player-side">
      <div className="player-score"><small>SCORE</small><b>{currentScore}</b></div>
      <div className="player-objective"><img src={groupingMode?challengeBoard:(targetBoards[currentBoardKey]||target20)} alt={`Objectif ${currentObjectiveText}`}/><b className="player-objective-value">{currentObjectiveText}</b><span>OBJECTIF</span></div>
     </div>
    </div>
    <div className="player-context-strip landscape-only"><span>TOUR <b>{done?cfg.visits:turn}</b> / {cfg.visits}</span><strong>{safeParticipants.length} {safeParticipants.length>1?'JOUEURS':'JOUEUR'}</strong></div>
    <div className="left-kpis landscape-only"><div><span>RÉUSSITE</span><b>{pct}%</b></div><div><span>SUITE</span><b>{streak}</b></div><div><span>FLÉCHETTES</span><b>{currentLog.length}/{cfg.visits*3}</b></div></div>
    <div className="left-actions landscape-only"><button type="button" onClick={()=>setRankOpen(true)}><span>◎</span><b>ONLINE</b></button><div><span>RECORD SUITE</span><b>{participantMaxStreak(current)}</b></div></div>
    {safeParticipants.length>1&&<div className="player-list landscape-only"><div className="player-list-title"><b>JOUEURS</b><span>{safeParticipants.length}</span></div><div className="player-list-scroll">{safeParticipants.map((p,i)=><div key={p.id} className={'player-row '+(i===activeIndex?'active':'')}><div className="list-team-bg">{p.team?<ResolvedTeamLogo team={p.team}/>:null}</div><span className="list-avatar"><ChallengeAvatar participant={p} size={34}/></span><span className="list-name"><b>{p.name}</b>{p.teamName?<small>{p.teamName}</small>:null}</span><span className="list-score"><b>{participantScore(p)}</b><small>{participantDarts(p)} fl.</small></span></div>)}</div></div>}
   </section>

   <section className="cp-board">
    <div className="board-caption"><span>{exerciseTitle(cfg)} · TOUR {done?cfg.visits:turn}/{cfg.visits}</span><b>{currentObjectiveText}</b>{objectiveHint&&<small>{objectiveHint}</small>}</div>
    <div className="board-media"><img src={groupingMode?challengeBoard:(targetBoards[currentBoardKey]||target20)} alt={`Objectif ${currentObjectiveText}`}/><div className="board-glow"/>{exerciseType!=='classic'&&<div className={`exercise-board-hud ${exerciseType}`}><div className="exercise-board-hud-title"><span>{groupingMode?'ZONE AUTORISÉE':'PARCOURS'}</span><b>{groupingMode?`×${groupingRequired} MÊME SECTEUR`:`${Math.min(currentVisitIndex+1,cfg.visits)} / ${cfg.visits}`}</b></div><div className="exercise-route">{exerciseRouteWindow.map(item=>{const active=!groupingMode&&item.index===currentVisitIndex;const played=!groupingMode&&item.index<Math.ceil(currentLog.length/3);const ok=played&&currentVisitValidated(item.index);return <i key={item.key} className={`${active?'active ':''}${played?(ok?'ok':'ko'):''}`}><small>{groupingMode?'SECT.':`#${item.index+1}`}</small><b>{item.label}</b>{played&&<em>{ok?'✓':exerciseType==='half-it'?'½':'×'}</em>}</i>})}</div></div>}</div>
   </section>

   <aside className="cp-right">
    <div className="turn-banner portrait-only"><span>TOUR</span><b>{done?cfg.visits:turn}</b><i>/ {cfg.visits}</i><em className="turn-player-count">{safeParticipants.length} {safeParticipants.length>1?'JOUEURS':'JOUEUR'}</em></div>
    {liveExerciseStatus&&<div className={`exercise-live ${exerciseType} ${liveExerciseStatus.tone}`}>
     <span className="exercise-live-copy"><small>{exerciseTitle(cfg)} · VOLÉE EN COURS</small><b>{liveExerciseStatus.title}</b><em>{liveExerciseStatus.detail}</em></span>
     <span className="exercise-live-darts">{[0,1,2].map(index=><i key={index} className={currentVisitDartLabels[index]?'filled':''}>{currentVisitDartLabels[index]||`#${index+1}`}</i>)}</span>
     <span className="exercise-live-progress"><i style={{width:`${Math.min(100,((currentVisitIndex+(currentVisitEntries.length/3))/Math.max(1,cfg.visits))*100)}%`}}/></span>
    </div>}
    <div className="portrait-stats-wrap portrait-only"><div className="portrait-stats"><div className="ps-title"><strong>STATS CHALLENGE</strong><button type="button" className="online-rank" aria-label="Classement online" onClick={()=>setRankOpen(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9"/></svg></button></div><div className="ps-kpis"><div><span>SCORE</span><b>{currentScore}</b></div><div><span>RÉUSSITE</span><b>{pct}%</b></div><div><span>FLÉCHETTES</span><b>{currentLog.length}/{cfg.visits*3}</b></div><div><span>SUITE</span><b>{streak}</b></div></div><div className="ps-hits">{allowedHits.map(h=><div className={'psh '+h} key={h}><span>{h}</span><b>{counts[h]}</b></div>)}</div></div><button type="button" className="match-detail-trigger" onClick={()=>{setDetailTab('global');setDetailSection('PERF');setDetailOpen(true)}}>STATS DÉTAILLÉES <span>↗</span></button></div>
    {safeParticipants.length>1&&<button type="button" className="players-launch portrait-only" onClick={()=>setPlayersOpen(true)} aria-label="Ouvrir la liste des joueurs">
     <img src="/challenge/ticker_challenge.png" alt="" aria-hidden="true"/>
     <span className="players-launch-shade"/>
     <b>JOUEURS</b>
     <span className="players-launch-avatars">{safeParticipants.slice(0,4).map(p=><i key={p.id}><ChallengeAvatar participant={p} size={28}/></i>)}</span>
     <strong>{safeParticipants.length}</strong>
    </button>}
    <button type="button" className="landscape-stats landscape-only stats-hit-open" onClick={()=>{setDetailTab('global');setDetailSection('PERF');setDetailOpen(true)}}><h2>STATS HITS <span>↗</span></h2><div className="hitstats">{hits.map(h=><div className={'hs '+h} key={h}><b>{h}<small>{h==='S'?' ×1':h==='D'?' ×2':h==='T'?' ×3':''}</small></b><strong>{counts[h]}</strong></div>)}</div></button>
    <div className="input-tools"><button className="undo" disabled={!log.length} onClick={()=>setLog(v=>v.slice(0,-1))}>↶ <span>ANNULER</span></button><button className={'voice '+(voiceOn?'listening':'')} type="button" onClick={startVoice} aria-label="Saisie vocale"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg><span>{voiceOn?'ÉCOUTE…':'VOCAL'}</span></button></div>
    {groupingMode?<div className="challenge-segment-keypad compact grouping-keypad"><div className="multiplier-tabs"><button type="button" className={segmentMultiplier==='S'?'on S':''} onClick={()=>setSegmentMultiplier('S')}>SIMPLE</button><button type="button" className={segmentMultiplier==='D'?'on D':''} onClick={()=>setSegmentMultiplier('D')}>DOUBLE</button><button type="button" className={segmentMultiplier==='T'?'on T':''} onClick={()=>setSegmentMultiplier('T')}>TRIPLE</button></div><div className={'grouping-keypad-help '+(groupingLive.qualified?'ok':'')}>{groupingLive.qualified?`✓ ${liveExerciseStatus?.title} · +${currentVisitPoints} PTS`:`${segmentMultiplier} · ${liveExerciseStatus?.title||'CHOISISSEZ LE SECTEUR'}`}</div><div className="segment-number-grid grouping-range-grid">{Array.from({length:Math.max(1,Math.max(Number(cfg.groupingMin||15),Number(cfg.groupingMax||20))-Math.min(Number(cfg.groupingMin||15),Number(cfg.groupingMax||20))+1)},(_,i)=>Math.min(Number(cfg.groupingMin||15),Number(cfg.groupingMax||20))+i).map(n=><button type="button" key={n} className={familyBandClass(n)} disabled={done} onClick={()=>addGroupingSegment(n)}>{segmentMultiplier}{n}</button>)}</div><button type="button" className="segment-miss" disabled={done} onClick={()=>add('MISS')}>MISS / HORS ZONE</button></div>:objectiveFamilyMode?<div className="challenge-segment-keypad compact"><div className="segment-number-grid">{Array.from({length:20},(_,i)=>i+1).map(n=><button type="button" key={n} className={familyBandClass(n)} disabled={done} onClick={()=>addFamilySegment(n)}>{currentObjective==='any-triple'?'T':'D'}{n}</button>)}</div><button type="button" className="segment-miss" disabled={done} onClick={()=>add('MISS')}>MISS</button></div>:<div className={'keypad keys-'+allowedHits.length}>{allowedHits.map(h=><button className={h} key={h} disabled={done} onClick={()=>add(h)}><b>{h==='25'?'BULL 25':h==='50'?'BULL 50':h}</b><span>{h==='S'?'×1':h==='D'?'×2':h==='T'?'×3':h==='25'?'25':h==='50'?'50':'×'}</span></button>)}</div>}
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
     <em>{exerciseTitle(cfg)}</em>
    </div>
    <div className="match-side-panel match-side-panel-right">
     {right.team&&<div className="match-side-panel-bg"><ResolvedTeamLogo team={right.team}/></div>}
     <div className="match-side-panel-avatar"><ChallengeAvatar participant={right} size={72}/></div>
     <b style={{color:theme.primary}}>{String(right.name||'Joueur').toUpperCase()}</b>
     {(right.teamName||right.team?.name)?<small>{right.teamName||right.team?.name}</small>:null}
    </div>
   </div>})()}
   <div className="detail-tabs baby-match-tabs">
    {safeParticipants.length===2&&<button type="button" className={'detail-tab-match '+(detailTab==='match'?'on':'')} onClick={()=>{setDetailTab('match');setDetailSection('PERF')}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v14H4zM14 5h6v14h-6zM10 12h4"/></svg><span>DÉTAIL MATCH</span></button>}
    {isSoloDetailView?
     <button type="button" className="detail-tab-solo on" onClick={()=>{setDetailTab('global');setDetailSection('PERF')}} aria-label="Stats du joueur">
      <span className="detail-tab-avatar"><ChallengeAvatar participant={safeParticipants[0]} size={40}/></span>
      <span>STATS</span>
     </button>
    :<>
     <button type="button" className={'detail-tab-main '+(detailTab==='global'?'on':'')} onClick={()=>{setDetailTab('global');setDetailSection('PERF')}} aria-label="Records de la partie"><svg className="detail-stats-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V7M10 20V4M16 20v-6M22 20V9"/></svg><span>RECORDS</span></button>
     {safeParticipants.map(p=><button type="button" key={p.id} className={'detail-tab-player '+(detailTab===p.id?'on':'')} onClick={()=>{setDetailTab(p.id);setDetailSection('PERF')}} title={p.name}><span className="detail-tab-avatar"><ChallengeAvatar participant={p} size={40}/></span>{detailTab===p.id&&<b style={{color:theme.primary}}>{String(p.name||'Joueur').toUpperCase()}</b>}</button>)}
    </>}
   </div>
   {detailTab==='match'&&safeParticipants.length===2?(()=>{const left=safeParticipants[0],right=safeParticipants[1],a=participantStats(left),b=participantStats(right);const rows=[['SCORE',a.score,b.score],['RÉUSSITE',`${a.pct}%`,`${b.pct}%`],['FLÉCHETTES',`${a.darts}/${cfg.visits*3}`,`${b.darts}/${cfg.visits*3}`],['SUITE MAX',a.streak,b.streak],['BEST VOLÉE',a.detailed.bestVisit,b.detailed.bestVisit],['MOY. / VOLÉE',a.detailed.avgVisit.toFixed(1),b.detailed.avgVisit.toFixed(1)],['S',a.hitCounts.S,b.hitCounts.S],['D',a.hitCounts.D,b.hitCounts.D],['T',a.hitCounts.T,b.hitCounts.T],['BULL 25',a.hitCounts['25'],b.hitCounts['25']],['BULL 50',a.hitCounts['50'],b.hitCounts['50']],['MISS',a.hitCounts.MISS,b.hitCounts.MISS]] as Array<[string,React.ReactNode,React.ReactNode]>;return <div className="detail-scroll detail-match-scroll"><div className="match-compare restored">{rows.map(([label,leftValue,rightValue])=><div className="match-compare-row" key={label}><strong>{leftValue}</strong><span>{label}</span><strong>{rightValue}</strong></div>)}</div></div>})():<div className="detail-scroll compact-detail-scroll">
    <div className="records-head"><strong>{isSoloDetailView?`STATS · ${String(safeParticipants[0]?.name||'JOUEUR').toUpperCase()}`:detailTab==='global'?'STATS DE LA PARTIE':`STATS · ${String(detailCurrent?.participant?.name||'JOUEUR').toUpperCase()}`}</strong><span>Choisissez un onglet pour lire l’essentiel en un coup d’œil.</span></div>
    <div className="detail-glance" aria-label="Résumé rapide"><div><span>★</span><small>SCORE</small><b>{detailStats.score}</b></div><div><span>◎</span><small>RÉUSSITE</small><b>{detailStats.accuracy.toFixed(1)}%</b></div><div><span>✦</span><small>SUITE</small><b>{detailStats.bestStreak}</b></div><div><span>➶</span><small>FLÉCHETTES</small><b>{detailStats.darts}</b></div></div>
    <div className="detail-section-tabs">{detailSectionTabs.map(section=>{const meta=detailSectionMeta[section]||{icon:'•',label:section};return <button type="button" key={section} className={detailSection===section?'on':''} onClick={()=>setDetailSection(section)}><i>{meta.icon}</i><span>{meta.label}</span></button>})}</div>
    {detailRecordGroups.includes(detailSection)&&<><ChallengeRecordGrid cards={detailRecordCards} group={detailSection} showHolder={detailTab==='global'||detailTab==='match'}/><div className="records-legend"><span><i style={{background:RECORD_COLORS.green}}/>75–100% · TOP</span><span><i style={{background:RECORD_COLORS.yellow}}/>50–75% · BON</span><span><i style={{background:RECORD_COLORS.orange}}/>25–50% · MOYEN</span><span><i style={{background:RECORD_COLORS.red}}/>0–25% · FAIBLE</span></div></>}
    {detailSection==='EXERCICE'&&<section className="exercise-detail"><div className="exercise-detail-head"><span><small>ANALYSE SPÉCIFIQUE</small><b>{exerciseTitle(cfg)}</b></span><strong>{detailExerciseAnalytics.validationRate.toFixed(1)}%<small>VALIDATION</small></strong></div>{detailExerciseRecordCards.length>0&&<div className="exercise-records-block"><ChallengeRecordGrid cards={detailExerciseRecordCards} showHolder={detailTab==='global'||detailTab==='match'}/></div>}<div className="exercise-detail-kpis"><div><span>TOURS VALIDÉS</span><b>{detailExerciseAnalytics.validatedVisits}<small> / {detailExerciseDenominator||0}</small></b></div><div><span>ÉCHECS</span><b>{detailExerciseAnalytics.failedVisits}</b></div><div><span>VOLÉES PARFAITES</span><b>{detailExerciseAnalytics.perfectVisits}</b></div><div><span>TOURS JOUÉS</span><b>{detailExerciseAnalytics.visitsPlayed}</b></div></div><div className="exercise-detail-kpis exercise-streak-kpis"><div><span>MEILLEURE SÉRIE</span><b>{detailExerciseAnalytics.bestValidatedVisitStreak}</b></div><div><span>SÉRIE PARFAITE</span><b>{detailExerciseAnalytics.bestPerfectVisitStreak}</b></div><div><span>BEST OBJECTIF</span><b>{detailExerciseAnalytics.bestVisitPoints}</b></div><div><span>VALIDATION</span><b>{detailExerciseAnalytics.validationRate.toFixed(1)}%</b></div></div>{exerciseType==='grouping'&&<><div className="exercise-detail-kpis accent"><div><span>DOUBLETS</span><b>{detailExerciseAnalytics.groupingDoublets}</b></div><div><span>TRIPLETS</span><b>{detailExerciseAnalytics.groupingTriplets}</b></div><div><span>POINTS GROUPÉS</span><b>{detailExerciseAnalytics.groupingPoints}</b></div><div><span>SECTEUR FORT</span><b>{detailExerciseAnalytics.topGroupingSector?`${detailExerciseAnalytics.topGroupingSector}`:'—'}<small>{detailExerciseAnalytics.topGroupingSectorHits?` · ${detailExerciseAnalytics.topGroupingSectorHits} hits`:''}</small></b></div></div><div className="grouping-sector-analysis"><h3>SECTEURS LES PLUS REGROUPÉS</h3>{detailGroupingSectors.length?detailGroupingSectors.map(row=>{const max=Math.max(1,...detailGroupingSectors.map(item=>item.hits));return <div key={row.sector}><span>{row.sector}</span><i><b style={{width:`${Math.max(6,row.hits/max*100)}%`}}/></i><strong>{row.hits} hits</strong></div>}):<p>Aucun groupement validé pour le moment.</p>}</div></>}{exerciseType==='half-it'&&<div className="exercise-detail-kpis accent"><div><span>DIVISIONS ÷2</span><b>{detailExerciseAnalytics.halfItCuts}</b></div><div><span>TOURS SÉCURISÉS</span><b>{detailExerciseAnalytics.validatedVisits}</b></div><div><span>SCORE DÉPART</span><b>{Math.max(0,Number(cfg.halfItStartScore??40)||0)}</b></div><div><span>SCORE ACTUEL</span><b>{detailStats.score}</b></div></div>}{(exerciseType==='clock'||exerciseType==='sequence')&&<div className="exercise-detail-note"><b>{exerciseType==='clock'?'PARCOURS AUTOMATIQUE':'SÉQUENCE PROGRAMMÉE'}</b><span>{detailExerciseAnalytics.validatedVisits} objectif{detailExerciseAnalytics.validatedVisits>1?'s':''} validé{detailExerciseAnalytics.validatedVisits>1?'s':''} · {detailExerciseAnalytics.failedVisits} tour{detailExerciseAnalytics.failedVisits>1?'s':''} sans hit · {detailExerciseAnalytics.perfectVisits} volée{detailExerciseAnalytics.perfectVisits>1?'s':''} parfaite{detailExerciseAnalytics.perfectVisits>1?'s':''}.</span></div>}{exerciseType!=='classic'&&exerciseType!=='grouping'&&<div className={`objective-performance objective-performance-${exerciseType}`}><div className="objective-performance-head"><span><small>LECTURE OBJECTIF PAR OBJECTIF</small><b>{exerciseType==='clock'?'CARTE 1 → 20':exerciseType==='half-it'?'PARCOURS HALF-IT':'CARTE DE LA SÉQUENCE'}</b></span><em>{detailTab==='global'||detailTab==='match'?'TOUS LES JOUEURS':String(detailCurrent?.participant?.name||safeParticipants[0]?.name||'JOUEUR').toUpperCase()}</em></div>{detailObjectiveHighlights.best&&<div className="objective-highlights"><div className="best"><span>OBJECTIF FORT</span><b>{detailObjectiveHighlights.best.label}</b><small>{detailObjectiveHighlights.best.validated}/{detailObjectiveHighlights.best.attempts} validé · {detailObjectiveHighlights.best.points} pts</small></div><div className="weak"><span>{exerciseType==='half-it'?'ZONE À SÉCURISER':'OBJECTIF À TRAVAILLER'}</span><b>{detailObjectiveHighlights.weak?.label||'—'}</b><small>{detailObjectiveHighlights.weak?`${detailObjectiveHighlights.weak.validated}/${detailObjectiveHighlights.weak.attempts} validé${detailObjectiveHighlights.weak.cuts?` · ${detailObjectiveHighlights.weak.cuts} × ÷2`:''}`:'—'}</small></div></div>}<div className="objective-performance-grid">{detailObjectivePerformance.map(row=>{const pending=row.attempts===0;const rate=row.attempts?Math.round(row.validated/row.attempts*100):0;const incomplete=row.attempts>0&&row.completed===0;const allPerfect=row.attempts>0&&row.perfect===row.attempts;const status=pending?'pending':incomplete&&!row.validated?'active':row.cuts>0?'cut':row.validated===0?'fail':allPerfect?'perfect':'ok';const statusLabel=pending?'À VENIR':incomplete&&!row.validated?'EN COURS':row.cuts>0?(row.cuts===1?'÷2':`${row.cuts} × ÷2`):row.validated===0?'RATÉ':allPerfect?'3/3':`${rate}%`;return <div className={`objective-performance-card ${status}`} key={`${row.index}-${row.objective}`}><header><span>#{row.index+1}</span><strong>{statusLabel}</strong></header><b>{row.label}</b><div className="objective-performance-bar"><i style={{width:`${pending?0:Math.max(5,rate)}%`}}/></div><footer><span>{row.successfulHits} HIT{row.successfulHits>1?'S':''}</span><em>{row.points} PTS</em></footer>{exerciseType==='half-it'&&row.scoreBefore!==null&&row.scoreAfter!==null?<small className="objective-score-shift">{row.scoreBefore} → <b>{row.scoreAfter}</b></small>:null}</div>})}</div></div>}{<div className="exercise-career"><div className="exercise-career-head"><span><small>RECORDS PERSISTANTS</small><b>HISTORIQUE DE L’EXERCICE</b></span>{careerParticipant&&<em>{String(careerParticipant.name||'Joueur').toUpperCase()}</em>}</div>{!careerParticipant?<div className="exercise-career-empty">Sélectionne un joueur pour afficher ses records historiques sur cette configuration.</div>:exerciseCareerLoading?<div className="exercise-career-empty">Analyse de l’historique Challenge…</div>:exerciseCareer&&exerciseCareer.matches>0?<><div className="exercise-career-kpis"><div><span>PARTIES</span><b>{exerciseCareer.matches}</b></div><div><span>RECORD SCORE</span><b>{exerciseCareer.bestScore}</b><small>Moy. {exerciseCareer.averageScore.toFixed(1)}</small></div><div><span>VALIDATION MOY.</span><b>{exerciseCareer.averageValidationRate.toFixed(1)}%</b><small>Record {exerciseCareer.bestValidationRate.toFixed(1)}%</small></div><div><span>MEILLEURE SÉRIE</span><b>{exerciseCareer.bestValidatedVisitStreak}</b><small>Parfaite {exerciseCareer.bestPerfectVisitStreak}</small></div></div><div className="exercise-career-trend"><div><span>FORME RÉCENTE</span><b className={exerciseCareer.trendDelta>0?'up':exerciseCareer.trendDelta<0?'down':'flat'}>{exerciseCareer.trendDelta>0?'+':''}{exerciseCareer.trendDelta.toFixed(1)} pts</b></div><section>{exerciseCareer.recent.map((row,index)=><i key={`${row.playedAt}-${index}`} title={`${row.validationRate.toFixed(1)}% · ${row.score} pts`}><u style={{height:`${Math.max(5,Math.min(100,row.validationRate))}%`}}/><small>{Math.round(row.validationRate)}%</small></i>)}</section></div>{exerciseType==='grouping'?<div className="exercise-career-insights"><div className="strong"><span>SECTEUR HISTORIQUE FORT</span><b>{exerciseCareer.topGroupingSector?.sector||'—'}</b><small>{exerciseCareer.topGroupingSector?`${exerciseCareer.topGroupingSector.hits} hits groupés`:'Aucun groupement enregistré'}</small></div><div><span>TRIPLETS CUMULÉS</span><b>{exerciseCareer.groupingTriplets}</b><small>{exerciseCareer.groupingPoints} points groupés</small></div><div className="career-sector-list"><span>TOP SECTEURS</span><b>{exerciseCareer.groupingSectors.slice(0,4).map(row=>`${row.sector} · ${row.hits}`).join('  •  ')||'—'}</b></div></div>:<div className="exercise-career-insights"><div className="strong"><span>OBJECTIF HISTORIQUE FORT</span><b>{exerciseCareer.strongestObjective?.label||'—'}</b><small>{exerciseCareer.strongestObjective?`${exerciseCareer.strongestObjective.validationRate.toFixed(1)}% · ${exerciseCareer.strongestObjective.validated}/${exerciseCareer.strongestObjective.attempts}`:'Aucune donnée'}</small></div><div className="weak"><span>{exerciseType==='half-it'?'ZONE LA PLUS DANGEREUSE':'OBJECTIF À TRAVAILLER'}</span><b>{(exerciseType==='half-it'?exerciseCareer.dangerObjective:exerciseCareer.weakestObjective)?.label||'—'}</b><small>{exerciseType==='half-it'&&exerciseCareer.dangerObjective?`${exerciseCareer.dangerObjective.cuts} × ÷2 · ${exerciseCareer.dangerObjective.validationRate.toFixed(1)}%`:exerciseCareer.weakestObjective?`${exerciseCareer.weakestObjective.validationRate.toFixed(1)}% · ${exerciseCareer.weakestObjective.validated}/${exerciseCareer.weakestObjective.attempts}`:'Aucune donnée'}</small></div></div>}</>:<div className="exercise-career-empty">Aucune partie terminée enregistrée pour cette configuration. Les records apparaîtront ici dès la première partie terminée.</div>}</div>}</section>}
    {detailSection==='ANALYSE'&&<section className="visual-analysis"><h3>ANALYSE VISUELLE</h3><div className="detail-kpis"><div><span>SCORE</span><b>{detailStats.score}</b></div><div><span>PRÉCISION</span><b>{detailStats.accuracy.toFixed(1)}%</b></div><div><span>SUITE MAX</span><b>{detailStats.bestStreak}</b></div><div><span>BEST VOLÉE</span><b>{detailStats.bestVisit}</b></div><div><span>MOY./VOLÉE</span><b>{detailStats.avgVisit.toFixed(1)}</b></div><div><span>MEILLEURE FL.</span><b>{bestDartPosition?`#${bestDartPosition.position} · ${bestDartPosition.accuracy.toFixed(1)}%`:'—'}</b></div></div>{familyMode&&<div className="family-analysis-strip"><div><span>DÉPARTAGE</span><b>{detailTieBreak}</b></div><div><span>TOP SEGMENTS</span><b>{detailFamilySegments.slice(0,3).map(row=>`${cfg.target==='any-triple'?'T':'D'}${row.segment} · ${row.hits}`).join('  •  ')||'—'}</b></div></div>}<div className="detail-grid"><section><h3>RÉPARTITION HITS</h3><Donut stats={detailStats}/></section><section><h3>ÉVOLUTION SCORE</h3><MiniLine values={detailStats.cumulativeScores}/></section></div></section>}
    {detailSection==='FLÉCHETTES'&&<section className="position-section standalone"><h3>PRÉCISION PAR FLÉCHETTE</h3><div className="position-grid">{detailStats.positionStats.map(pos=><div className="position-card" key={pos.position}><div className="position-head"><b>FLÉCHETTE {pos.position}</b><strong>{pos.accuracy.toFixed(1)}%</strong></div><div className="position-bar"><i style={{width:`${Math.min(100,pos.accuracy)}%`}}/></div><div className="position-rings"><span>S <b>{pos.attempts?((pos.S/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.S}</em></span><span>D <b>{pos.attempts?((pos.D/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.D}</em></span><span>T <b>{pos.attempts?((pos.T/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.T}</em></span><span>25 <b>{pos.attempts?((pos.B25/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.B25}</em></span><span>50 <b>{pos.attempts?((pos.B50/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.B50}</em></span><span>MISS <b>{pos.attempts?((pos.MISS/pos.attempts)*100).toFixed(1):'0.0'}%</b><em>{pos.MISS}</em></span></div></div>)}</div></section>}
    {detailSection==='VOLÉES'&&<section className="visits-section standalone"><h3>POINTS PAR VOLÉE</h3><div className="visit-bars">{detailStats.visitScores.map((value,index)=>{const max=Math.max(1,...detailStats.visitScores);return <div key={index}><i style={{height:`${Math.max(3,(value/max)*100)}%`}}/><span>{index+1}</span><b>{value}</b></div>})}</div></section>}
   </div>}
   <button type="button" className="match-detail-close" onClick={closeDetail}>{historyStatsOnly?statsReturnLabel:'FERMER'}</button>
  </div></div>}
  {rankOpen&&<div className="stats-modal" onClick={()=>setRankOpen(false)}><div className="stats-modal-card online-challenge-card" onClick={e=>e.stopPropagation()}>
   <div className="stats-modal-head"><div><strong>CLASSEMENT ONLINE CHALLENGE</strong><span>Une seule ligne par joueur : son meilleur score pour cette configuration comparable.</span></div><button onClick={()=>setRankOpen(false)}>×</button></div>
   <div className="online-ranking-toolbar"><div className="online-filter-summary"><b>🎯 {challengeOnlineTargetLabel(onlineTarget)}</b><b>🔁 {onlineVisits} TOURS</b><b>✦ {ruleLabel(onlineRule)}</b><b>{onlineScope==='team'?'🛡️':'🌍'} {onlineScope==='team'?(selectedOnlineTeam?.name||'ÉQUIPE OFFICIELLE'):'PUBLIC'}</b></div><button type="button" className="online-filter-trigger" onClick={()=>setOnlineFiltersOpen(true)} aria-label="Filtres"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="12" cy="18" r="1.8"/></svg><span>FILTRES</span></button></div>
   {onlineScope==='team'&&<div className="online-official-team-note">✓ ÉQUIPE OFFICIELLE · accès vérifié par Organisation MSS</div>}
   {onlineHistorySyncing&&<div className="online-history-sync">↻ SYNCHRONISATION DES ANCIENNES PARTIES CHALLENGE…</div>}
   {onlineRankingLoading?<div className="online-rank-state">CHARGEMENT DU CLASSEMENT…</div>:onlineRankingError?<div className="online-rank-state error">{onlineRankingError}</div>:onlineRanking.length===0?<div className="online-rank-state">Aucun score publié pour cette combinaison de filtres.</div>:<div className="rank-list online-rank-list">{onlineRanking.map(row=><div key={row.userId}>
    <strong>#{row.rank}</strong>
    <span className="online-rank-player">{row.avatarUrl?<img src={row.avatarUrl} alt=""/>:<i>{String(row.displayName||'?').slice(0,1).toUpperCase()}</i>}<span>{row.displayName}</span></span>
    <b>{row.score} pts</b>
    <em>{row.darts} fl. · suite {row.bestStreak} · {row.accuracy.toFixed(1)}% · {row.playedCount} partie{row.playedCount>1?'s':''}</em>
   </div>)}</div>}
   <div className="online-ranking-actions"><button className="online-open" onClick={()=>void (async()=>{setOnlineHistorySyncing(true);try{await syncChallengeHistoricalScores(profiles,teams);onlineHistorySyncedRef.current=true;await refreshOnlineTeams();await refreshOnlineRanking()}finally{setOnlineHistorySyncing(false)}})()}>↻ SYNCHRONISER</button><button className="online-open full" onClick={()=>go('challenge_leaderboard',{from:'challenge_play',prefilter:true,target:onlineTarget,rule:onlineRule,visits:onlineVisits})}>🏆 CLASSEMENT COMPLET & STATS</button></div>
   {onlineFiltersOpen&&<div className="online-filter-picker" onClick={()=>setOnlineFiltersOpen(false)}><div className="online-filter-picker-card" onClick={e=>e.stopPropagation()}><header><div><strong>FILTRES</strong><span>SOLO / DUO / MULTI sont regroupés : la performance est individuelle.</span></div><button onClick={()=>setOnlineFiltersOpen(false)}>×</button></header><section><h3>CLASSEMENT</h3><div><button className={onlineScope==='public'?'on':''} onClick={()=>setOnlineScope('public')}>🌍 PUBLIC</button><button className={onlineScope==='team'?'on':''} onClick={()=>setOnlineScope('team')} disabled={!onlineTeams.length}>🛡️ ÉQUIPE OFFICIELLE</button></div></section>{onlineScope==='team'&&<section><h3>ÉQUIPE OFFICIELLE</h3><div>{onlineTeams.length?onlineTeams.map(team=><button key={team.key} className={onlineTeamKey===team.key?'on':''} onClick={()=>setOnlineTeamKey(team.key)}><b>✓ {team.name}</b><small>{team.organizationName||'Organisation MSS'}</small></button>):<em>Aucune équipe officielle. Affecte ton compte à une équipe Darts dans une Organisation MSS.</em>}</div></section>}<section><h3>🎯 CIBLE</h3><div>{onlineTargetOptions.map(value=><button key={value} className={onlineTarget===value?'on':''} onClick={()=>setOnlineTarget(value)}>{challengeOnlineTargetLabel(value)}</button>)}</div></section><section><h3>🔁 TOURS</h3><div>{onlineVisitOptions.map(value=><button key={value} className={onlineVisits===value?'on':''} onClick={()=>setOnlineVisits(value)}>{value}</button>)}</div></section><section><h3>✦ HITS</h3><div>{onlineRuleFilters.map(value=><button key={value} className={onlineRule===value?'on':''} onClick={()=>setOnlineRule(value)}>{ruleLabel(value)}</button>)}</div></section><footer><button onClick={()=>{setOnlineFiltersOpen(false);void refreshOnlineRanking()}}>APPLIQUER</button></footer></div></div>}
  </div></div>}
  {done&&!historyStatsOnly&&<div className={`finish finish-wow finish-${exerciseType}`}><div className="finish-burst" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</div><div className="finish-glow" aria-hidden="true"/><div className="finish-panel"><div className="finish-exercise-badge"><i>{exerciseType==='clock'?'↻':exerciseType==='half-it'?'½':exerciseType==='sequence'?'≡':exerciseType==='grouping'?'◉':'★'}</i><span><small>CHALLENGE TERMINÉ</small><b>{exerciseTitle(cfg)}</b></span><em>{cfg.visits} TOURS</em></div><div className="finish-hero"><span className="finish-hero-avatar"><ChallengeAvatar participant={finishLeader} size={82}/></span><div><small>{safeParticipants.length>1?'VAINQUEUR':'RÉSULTAT'}</small><h2>{String(finishLeader?.name||'Joueur').toUpperCase()}</h2><strong>{finishLeaderStats.score} <small>PTS</small></strong><p>{finishExerciseSubline}</p></div></div>{finishExerciseRecords.length>0&&<div className="finish-exercise-records">{finishExerciseRecords.map(card=><div key={card.key}><span>{card.label}</span><b>{card.value}</b>{card.holder&&safeParticipants.length>1?<small>{card.holder}</small>:null}</div>)}</div>}{exerciseType!=='classic'&&<div className="finish-progress"><header><span><small>PROGRESSION PERSONNELLE</small><b>COMPARAISON AVEC L’HISTORIQUE</b></span>{finishExerciseProgressLoading?<em>ANALYSE…</em>:finishLeaderProgress?.baseline?<em>PREMIÈRE RÉFÉRENCE</em>:finishLeaderProgress?.records.length?<em className="record">NOUVEAU RECORD ×{finishLeaderProgress.records.length}</em>:<em>HISTORIQUE · {finishLeaderProgress?.previousMatches||0} PARTIES</em>}</header>{finishExerciseProgressLoading?<div className="finish-progress-empty">Comparaison avec les performances précédentes…</div>:finishLeaderProgress?.baseline?<div className="finish-progress-empty">Cette partie devient la référence de départ pour cette configuration. Les prochaines performances seront comparées à celle-ci.</div>:finishLeaderProgress?<><div className="finish-progress-deltas"><div className={(finishLeaderProgress.scoreDeltaFromLast||0)>0?'up':(finishLeaderProgress.scoreDeltaFromLast||0)<0?'down':'flat'}><span>SCORE VS DERNIÈRE</span><b>{finishLeaderProgress.scoreDeltaFromLast===null?'—':`${finishLeaderProgress.scoreDeltaFromLast>0?'+':''}${finishLeaderProgress.scoreDeltaFromLast}`}</b><small>{finishLeaderStats.score} pts aujourd’hui</small></div><div className={(finishLeaderProgress.validationDeltaFromLast||0)>0?'up':(finishLeaderProgress.validationDeltaFromLast||0)<0?'down':'flat'}><span>VALIDATION VS DERNIÈRE</span><b>{finishLeaderProgress.validationDeltaFromLast===null?'—':`${finishLeaderProgress.validationDeltaFromLast>0?'+':''}${finishLeaderProgress.validationDeltaFromLast.toFixed(1)} pts`}</b><small>{finishLeaderExercise.validationRate.toFixed(1)}% aujourd’hui</small></div></div>{finishLeaderProgress.records.length>0&&<div className="finish-new-records">{finishLeaderProgress.records.map(record=><div key={record.key}><span>NOUVEAU RECORD</span><b>{record.label}</b><strong>{record.value}{record.suffix}</strong><small>ancien {record.previous}{record.suffix}</small></div>)}</div>}{(finishProgressImproved||finishProgressRegressed)&&<div className="finish-progress-insights">{finishProgressImproved&&('sector' in finishProgressImproved?<div className="up"><span>SECTEUR EN PROGRÈS</span><b>{finishProgressImproved.sector}</b><small>+{finishProgressImproved.delta.toFixed(1)} hit{finishProgressImproved.delta>1?'s':''} vs moyenne historique</small></div>:<div className="up"><span>OBJECTIF EN PROGRÈS</span><b>{finishProgressImproved.label}</b><small>+{finishProgressImproved.delta.toFixed(1)} pts de validation vs historique</small></div>)}{finishProgressRegressed&&('sector' in finishProgressRegressed?<div className="down"><span>SECTEUR EN RECUL</span><b>{finishProgressRegressed.sector}</b><small>{finishProgressRegressed.delta.toFixed(1)} hit{Math.abs(finishProgressRegressed.delta)>1?'s':''} vs moyenne historique</small></div>:<div className="down"><span>OBJECTIF EN RECUL</span><b>{finishProgressRegressed.label}</b><small>{finishProgressRegressed.delta.toFixed(1)} pts de validation vs historique</small></div>)}</div>}</>:<div className="finish-progress-empty">Comparaison historique indisponible.</div>}</div>}<div className="finish-scoreline">{standings.map((p,i)=>{const st=participantStats(p).detailed;const ex=exerciseAnalyticsByPlayer.find(row=>row.participant.id===p.id)?.stats||globalExerciseAnalytics;const progress=finishExerciseProgressByPlayer[String(p.id)];return <div className={'finish-score-row '+(i===0?'winner':'')} key={p.id}><span className="finish-row-avatar"><ChallengeAvatar participant={p} size={34}/></span><span className="finish-row-name"><b>{i+1}. {p.name}</b><em>{exerciseType==='classic'?`${st.accuracy.toFixed(1)}% · suite ${st.bestStreak} · best ${st.bestVisit}`:exerciseResultMeta(ex,cfg)}</em>{exerciseType!=='classic'&&progress?.records.length>0?<i className="finish-row-record">NOUVEAU RECORD ×{progress.records.length}</i>:null}</span><strong>{participantScore(p)}<small>PTS</small></strong></div>})}</div><div className="finish-actions"><button className="finish-stats" onClick={()=>{setDetailTab('global');setDetailSection(exerciseType==='classic'?'PERF':'EXERCICE');setDetailOpen(true)}}>{exerciseType==='classic'?'STATS DÉTAILLÉES':'STATS EXERCICE'}</button><button onClick={()=>go('challenge_config')}>REJOUER</button><button className="finish-menu" onClick={()=>go('games')}>MENU PRINCIPAL</button></div></div></div>}
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
.exercise-live{min-height:54px;flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 8px;border:1px solid #3b4a5e;border-radius:11px;background:linear-gradient(180deg,#0c151f,#070d14);box-shadow:inset 0 0 16px #0008}.exercise-live.ok{border-color:#2c8c55;background:linear-gradient(180deg,#0d2518,#07130d)}.exercise-live.danger{border-color:#8f333a;background:linear-gradient(180deg,#2b1115,#10090b)}.exercise-live-copy{min-width:0;display:flex;flex-direction:column}.exercise-live-copy small{font-size:6.5px;color:#8190a2;font-weight:1000;letter-spacing:.65px}.exercise-live-copy b{margin-top:2px;font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.exercise-live.ok .exercise-live-copy b{color:#71f5a0}.exercise-live.danger .exercise-live-copy b{color:#ff7078}.exercise-live-copy em{margin-top:2px;font-size:7.5px;color:#aab5c3;font-style:normal;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.exercise-live-darts{display:grid;grid-template-columns:repeat(3,34px);gap:4px}.exercise-live-darts i{height:30px;border:1px solid #2d3a49;border-radius:8px;background:#081019;color:#667487;display:grid;place-items:center;font-size:8px;font-style:normal;font-weight:1000}.exercise-live-darts i.filled{border-color:#66778b;color:#fff;background:#111c28}.exercise-live.ok .exercise-live-darts i.filled{border-color:#3c9d64;background:#0e2819;color:#8affae}.input-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(88px,34%);gap:6px;height:50px}.input-tools .undo,.voice{height:100%;margin:0;border-radius:11px;font-weight:1000;cursor:pointer}.input-tools .undo{color:#fff;background:linear-gradient(180deg,#351015,#16090b);border:1px solid #d33b43;font-size:12px}.input-tools .undo:disabled{opacity:.42}.voice{border:1px solid #26dfff88;background:linear-gradient(180deg,#102635,#071018);color:#34e8ff;display:flex;align-items:center;justify-content:center;gap:6px}.voice svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2}.voice span{font-size:11px}.voice.listening{box-shadow:0 0 20px #28e7ff88;animation:voicepulse .8s infinite alternate}@keyframes voicepulse{to{filter:brightness(1.5)}}
.board-caption{flex-wrap:wrap}.board-caption small{flex:0 0 100%;margin-top:-4px;text-align:center;color:#92a0b1;font-size:8px;font-weight:850;letter-spacing:.35px}.challenge-segment-keypad{display:grid;gap:7px;padding:8px;border:1px solid #334255;border-radius:14px;background:#070d14}.grouping-keypad{border-color:#6b2a30;background:linear-gradient(180deg,#100c10,#070d14)}.multiplier-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.multiplier-tabs button{min-height:36px;border:1px solid #435268;border-radius:9px;background:#0b141f;color:#a8b4c2;font-size:9px;font-weight:1000}.multiplier-tabs button.on{color:#fff;box-shadow:0 0 14px rgba(255,70,78,.18)}.multiplier-tabs button.on.S{border-color:#259df7;background:linear-gradient(180deg,#117ecf,#064372)}.multiplier-tabs button.on.D{border-color:#ff5961;background:linear-gradient(180deg,#b72831,#611016)}.multiplier-tabs button.on.T{border-color:#ffb039;background:linear-gradient(180deg,#b8730c,#684005)}.grouping-keypad-help{min-height:24px;display:flex;align-items:center;justify-content:center;border:1px solid #2d3a4b;border-radius:8px;background:#081019;color:#9aa9ba;font-size:8px;font-weight:900;letter-spacing:.45px}.grouping-keypad-help.ok{border-color:#2b8b51;background:#0b2416;color:#78f7a3;box-shadow:0 0 12px #2ee67122}.grouping-range-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.grouping-range-grid button{min-height:56px;font-size:18px}.grouping-keypad .segment-miss{min-height:42px;font-size:12px}.challenge-segment-keypad.compact{gap:8px}.segment-number-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.segment-number-grid button{min-height:46px;border:1px solid #34465b;border-radius:10px;background:linear-gradient(180deg,#101b28,#08101a);color:#fff;font-size:15px;font-weight:1000;letter-spacing:.35px}.segment-number-grid button.band-neutral{border-color:#536074;background:linear-gradient(180deg,#162335,#0a111a)}.segment-number-grid button.band-yellow{border-color:#f1bf41;background:linear-gradient(180deg,#ffcf5e,#8e6510);color:#1e1200;text-shadow:0 1px 0 rgba(255,255,255,.2)}.segment-number-grid button.band-orange{border-color:#ff9d45;background:linear-gradient(180deg,#ff9f3c,#9a4506);color:#fff3e7}.segment-number-grid button.band-red{border-color:#ff5b5b;background:linear-gradient(180deg,#ff4a52,#8f1118);color:#fff3f3}.segment-number-grid button:disabled{opacity:.55}.segment-miss{min-height:44px;border:1px solid #7b3037;border-radius:10px;background:linear-gradient(180deg,#351016,#14080b);font-weight:1000;color:#ff777d;font-size:16px;letter-spacing:.45px}.keypad{height:auto;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:clamp(78px,16vh,124px);gap:6px;align-self:stretch}.keypad.keys-4{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,clamp(78px,16vh,124px))}.keypad.keys-3{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:clamp(78px,16vh,124px)}.keypad.keys-2{grid-template-columns:repeat(2,minmax(0,1fr))}.keypad button{min-width:0;min-height:0;border-radius:12px;color:#fff;border:1px solid #536074;box-shadow:inset 0 0 0 2px #ffffff12,inset 0 -18px 30px #0005,0 5px 12px #0008;background:linear-gradient(#142238,#09101a);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer}.keypad button:active{transform:scale(.97);filter:brightness(1.2)}.keypad button:disabled{opacity:.5}.keypad button b{font-size:clamp(28px,4vw,54px);line-height:1}.keypad button span{font-size:clamp(8px,1.2vw,15px);font-weight:900;margin-top:3px}.keypad [class~="25"] b,.keypad [class~="50"] b{font-size:clamp(18px,2.4vw,32px)}.keypad .S{background:linear-gradient(#1389ed,#074ea8)}.keypad .D{background:linear-gradient(#f03940,#981017)}.keypad .T{background:linear-gradient(#e69b13,#8a5205)}.keypad [class~="25"]{background:linear-gradient(#10b66b,#05683d)}.keypad [class~="50"]{background:linear-gradient(#a93fe8,#5a147c)}.keypad .MISS{background:linear-gradient(#56616e,#242c35)}
.challenge-roster{display:flex;gap:5px;overflow-x:auto;padding:0 1px 4px}.challenge-roster>div{flex:0 0 auto;min-width:60px;height:38px;padding:3px 6px;border:1px solid #283546;border-radius:9px;background:#080e16;display:grid;grid-template-columns:30px minmax(18px,1fr);align-items:center;gap:6px;opacity:.7}.challenge-roster>div.active{opacity:1;border-color:#ff3b43;box-shadow:0 0 10px #ff273322}.roster-avatar{width:30px;height:30px;border-radius:50%;overflow:hidden;display:grid;place-items:center}.roster-avatar>*{width:100%!important;height:100%!important}.challenge-roster strong{font-size:12px;color:#ff5555;text-align:center}
.turn-banner{height:28px;display:flex;align-items:baseline;justify-content:center;gap:5px;border:1px solid #4b2630;border-radius:9px;background:linear-gradient(90deg,#10090c,#201014,#10090c);color:#fff}.turn-banner span{font-size:8px;color:#9da8b7;font-weight:900}.turn-banner b{font-size:18px;color:#ff4248}.turn-banner i{font-size:10px;font-style:normal;font-weight:900}.turn-banner em{margin-left:8px;font-size:8px;color:#c5ceda;font-style:normal;font-weight:900;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.portrait-stats-wrap{min-width:0}.portrait-stats{display:block!important;border:1px solid #3d4b5e;border-radius:11px;background:linear-gradient(180deg,#0d141e,#080c12);padding:5px 7px}.ps-title{height:25px;display:flex;align-items:center;justify-content:space-between}.ps-title strong{font-size:11px;color:#ff4141;letter-spacing:.6px}.online-rank{width:30px;height:25px;border-radius:8px;border:1px solid #24dfff88;background:#08202a;color:#27e9ff;display:grid;place-items:center}.online-rank svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.ps-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.ps-kpis div{height:37px;border:1px solid #263343;border-radius:8px;background:#091019;display:flex;flex-direction:column;align-items:center;justify-content:center}.ps-kpis span{font-size:6.5px;color:#93a1b2;font-weight:1000}.ps-kpis b{font-size:14px;line-height:1.05}.ps-hits{display:grid;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));gap:4px;margin-top:4px}.psh{height:28px;border-radius:7px;background:#111925;display:flex;align-items:center;justify-content:center;gap:6px;border-bottom:3px solid #748093}.psh span{font-size:9px;font-weight:1000}.psh b{font-size:13px}.psh.S{border-color:#169cff}.psh.D{border-color:#ff3b48}.psh.T{border-color:#ffad19}.psh[class~="25"]{border-color:#10d47b}.psh[class~="50"]{border-color:#bc55ff}.match-detail-trigger{width:100%;height:30px;margin-top:4px;border:1px solid #5b3440;border-radius:9px;background:linear-gradient(180deg,#1b1015,#0b090d);color:#fff;font-size:9px;font-weight:1000;letter-spacing:.8px}.match-detail-trigger span{color:#ff454d;margin-left:5px}
.match-detail-modal{position:fixed;inset:0;z-index:10050;background:#000d;backdrop-filter:blur(8px);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(16px,env(safe-area-inset-bottom,0px));overflow:auto}.match-detail-card{width:min(820px,100%);max-height:min(94dvh,900px);border:1px solid #4c596a;border-radius:18px;background:linear-gradient(180deg,#101621,#06090e);box-shadow:0 28px 80px #000;padding:12px}.match-detail-top{display:grid;grid-template-columns:minmax(0,1fr) 138px minmax(0,1fr);gap:8px;align-items:stretch;min-height:82px}.match-detail-top.tall{min-height:128px}.match-side{position:relative;min-width:0;display:grid;grid-template-columns:58px minmax(0,1fr);grid-template-rows:auto auto;column-gap:9px;align-items:center;overflow:hidden;border-radius:12px;padding:8px 10px}.match-side>*:not(.match-side-team-bg){position:relative;z-index:2}.match-side-team-bg{position:absolute!important;z-index:0!important;inset:4px 5%;display:grid;place-items:center;opacity:.25;pointer-events:none}.match-side-team-bg img{width:100%;height:100%;max-width:86%;object-fit:contain;object-position:center}.match-side>span{grid-row:1/3;width:58px;height:58px;border-radius:50%;overflow:hidden;border:1px solid #536174;display:grid;place-items:center}.match-side>span>*{width:100%!important;height:100%!important}.match-side>b{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.match-side>strong{font-size:19px;color:#ff4950;line-height:1}.match-center-title{text-align:center;display:flex;flex-direction:column;align-items:center}.match-center-title small{font-size:7px;color:#95a2b2;font-weight:1000;letter-spacing:.8px}.match-center-title b{font-size:12px;color:#fff;letter-spacing:.8px}.match-center-title em{font-size:7px;color:#ff555b;font-style:normal;font-weight:1000}.match-compare{margin-top:10px;border:1px solid #263342;border-radius:12px;overflow:hidden;background:#070c13}.match-compare-row{min-height:34px;display:grid;grid-template-columns:minmax(0,1fr) 112px minmax(0,1fr);align-items:center;text-align:center;border-bottom:1px solid #1f2a37}.match-compare-row:last-child{border-bottom:0}.match-compare-row span{height:100%;display:grid;place-items:center;border-left:1px solid #263342;border-right:1px solid #263342;color:#95a2b2;font-size:8px;font-weight:1000;letter-spacing:.55px}.match-compare-row strong{font-size:15px;color:#fff}.match-detail-close{width:100%;height:38px;margin-top:9px;border:1px solid #d13d46;border-radius:10px;background:linear-gradient(180deg,#351015,#16090b);color:#fff;font-size:10px;font-weight:1000;letter-spacing:.8px}.stats-modal{position:fixed;inset:0;z-index:10020;background:#000c;backdrop-filter:blur(7px);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));overflow:auto}.stats-modal-card{width:min(500px,100%);max-height:min(90dvh,720px);overflow:auto;border:1px solid #4a596c;border-radius:17px;background:linear-gradient(180deg,#0e151f,#06090e);box-shadow:0 25px 70px #000;padding:12px}.stats-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.stats-modal-head>div{display:flex;flex-direction:column}.stats-modal-head strong{color:#ff4141;font-size:15px}.stats-modal-head span{font-size:9px;color:#9da9b8;margin-top:2px}.stats-modal-head button{width:34px;height:34px;border-radius:50%;border:1px solid #536176;background:#121a25;color:white;font-size:22px}.rank-list{display:grid;gap:6px;margin:10px 0}.rank-list>div{display:grid;grid-template-columns:30px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:9px;border:1px solid #293545;border-radius:10px;background:#0a1018}.rank-list>div>strong{color:#ffb52e}.rank-list>div>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rank-list>div>em{font-size:9px;color:#9ba7b6;font-style:normal}.rank-list>div>b{color:#fff}.online-open{width:100%;min-height:42px;border:1px solid #24dfff88;border-radius:11px;background:#0a1a25;color:#2eeaff;font-weight:1000}.finish{position:fixed;inset:0;z-index:10030;background:#000e;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center}.finish h2{font-size:clamp(26px,6vw,42px);letter-spacing:2px}.finish strong{font-size:clamp(38px,9vw,62px);color:#ff4141}.finish-streak{margin-top:8px;color:#fff;font-weight:900;letter-spacing:1px}.finish-scoreline{width:min(480px,100%);margin-top:14px;display:grid;gap:6px}.finish-score-row{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'name score' 'meta score';gap:2px 10px;align-items:center;padding:8px 10px;border:1px solid #334153;border-radius:11px;background:#0a1018;text-align:left}.finish-score-row span{grid-area:name;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finish-score-row b{grid-area:score;color:#ffb33f;font-size:18px}.finish-score-row em{grid-area:meta;color:#9da9b8;font-style:normal;font-size:9px}.finish-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:16px}.finish button{margin-top:0;padding:14px 22px;border-radius:12px;background:#19b84a;color:white;font-weight:900;border:1px solid #5cff87}.finish .finish-stats{background:linear-gradient(180deg,#52141b,#1c090d);border-color:#ff4f57;color:#fff}.finish .finish-menu{background:linear-gradient(180deg,#102330,#071018);border-color:#35dff0;color:#eafcff;box-shadow:inset 0 0 14px rgba(53,223,240,.08)}.finish-wow{overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(255,55,66,.18),transparent 30%),radial-gradient(circle at 50% 50%,rgba(255,174,38,.08),transparent 48%),#000f}.finish-wow>*:not(.finish-burst):not(.finish-glow){position:relative;z-index:3}.finish-glow{position:absolute;z-index:1;width:min(72vw,620px);height:min(72vw,620px);border-radius:50%;background:radial-gradient(circle,rgba(255,56,66,.24) 0,rgba(255,56,66,.08) 35%,transparent 68%);filter:blur(10px);animation:challengeGlow 1.8s ease-in-out infinite alternate}.finish-crown{font-size:clamp(42px,10vw,72px);line-height:1;color:#ffd24b;text-shadow:0 0 18px #ffb31f,0 0 42px #ff4d2f;animation:challengeCrown .7s cubic-bezier(.2,.85,.25,1.25) both}.finish-wow h2{margin:4px 0 0;text-shadow:0 0 18px #ff3645aa;animation:challengeTitle .55s .08s cubic-bezier(.2,.85,.25,1.25) both}.finish-wow>strong{animation:challengeScore .6s .16s cubic-bezier(.2,.85,.25,1.25) both;text-shadow:0 0 16px #ff4141aa,0 0 34px #ff2a3c55}.finish-score-row{animation:challengeRow .45s both}.finish-score-row.winner{border-color:#ffb33f99;background:linear-gradient(90deg,rgba(255,179,63,.14),#0a1018 58%);box-shadow:0 0 16px rgba(255,179,63,.12)}.finish-burst{position:absolute;z-index:2;inset:0;pointer-events:none;overflow:hidden}.finish-burst i{--angle:calc(var(--i) * 15deg);position:absolute;left:50%;top:46%;width:7px;height:18px;border-radius:3px;background:hsl(calc(var(--i) * 29deg) 92% 62%);transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-22px);opacity:0;animation:challengeBurst 1.55s calc(var(--i) * 14ms) cubic-bezier(.12,.75,.2,1) both}.finish-burst i:nth-child(3n){width:5px;height:11px}.finish-burst i:nth-child(4n){border-radius:50%;height:8px}.finish-actions button{transition:transform .16s ease,filter .16s ease}.finish-actions button:hover{transform:translateY(-2px);filter:brightness(1.08)}@keyframes challengeBurst{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-18px) scale(.35)}12%{opacity:1}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-46vmin) rotate(480deg) scale(1)}}@keyframes challengeGlow{from{transform:scale(.92);opacity:.7}to{transform:scale(1.08);opacity:1}}@keyframes challengeCrown{from{opacity:0;transform:translateY(18px) scale(.2) rotate(-18deg)}to{opacity:1;transform:none}}@keyframes challengeTitle{from{opacity:0;transform:translateY(16px) scale(.7)}to{opacity:1;transform:none}}@keyframes challengeScore{from{opacity:0;transform:scale(.45)}to{opacity:1;transform:scale(1)}}@keyframes challengeRow{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.finish-burst,.finish-glow{display:none}.finish-crown,.finish-wow h2,.finish-wow>strong,.finish-score-row{animation:none!important}}

.match-detail-card.advanced{display:flex;flex-direction:column;overflow:hidden;padding:12px}.detail-tabs{display:flex;gap:6px;overflow-x:auto;padding:9px 1px 8px;border-bottom:1px solid #273545}.detail-tabs button{flex:0 0 auto;min-height:34px;padding:7px 12px;border-radius:999px;border:1px solid #39485a;background:#08101a;color:#9aa8b9;font-size:9px;font-weight:1000;letter-spacing:.65px}.detail-tabs button.on{color:#fff;border-color:#ff4c54;background:linear-gradient(180deg,#4c1218,#17090c);box-shadow:0 0 14px #ff293333}.detail-scroll{min-height:0;overflow:auto;padding:10px 2px 2px}.detail-scroll h3{margin:0 0 8px;color:#ff5a61;font-size:10px;letter-spacing:.8px}.detail-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.detail-kpis>div{min-height:58px;border:1px solid #293748;border-radius:11px;background:#081019;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:5px}.detail-kpis span{font-size:7px;color:#8e9cad;font-weight:1000}.detail-kpis b{margin-top:3px;font-size:16px;color:#fff}.exercise-detail{border:1px solid #334356;border-radius:14px;background:linear-gradient(180deg,#0a121b,#060b11);padding:10px}.exercise-detail-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:9px;border-bottom:1px solid #263443}.exercise-detail-head>span{min-width:0;display:flex;flex-direction:column}.exercise-detail-head small{font-size:6.5px;color:#8391a3;font-weight:1000;letter-spacing:.75px}.exercise-detail-head b{margin-top:2px;font-size:14px;color:#ff5960;letter-spacing:.5px}.exercise-detail-head>strong{min-width:84px;text-align:right;font-size:23px;color:#70f39d;line-height:1}.exercise-detail-head>strong small{display:block;margin-top:3px;color:#8190a2}.exercise-detail-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}.exercise-detail-kpis>div{min-height:62px;border:1px solid #293748;border-radius:11px;background:#081019;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px}.exercise-detail-kpis.accent>div{border-color:#493239;background:linear-gradient(180deg,#140d11,#090b0e)}.exercise-detail-kpis span{font-size:6.8px;color:#8998aa;font-weight:1000}.exercise-detail-kpis b{margin-top:4px;font-size:18px;color:#fff}.exercise-detail-kpis b small{font-size:8px;color:#93a1b2}.exercise-detail-note{margin-top:9px;border:1px solid #2d3c4e;border-radius:11px;background:#081019;padding:10px;display:flex;flex-direction:column;gap:4px}.exercise-detail-note b{font-size:9px;color:#ff5960;letter-spacing:.65px}.exercise-detail-note span{font-size:9px;color:#a8b4c2;line-height:1.45}.grouping-sector-analysis{margin-top:9px;border:1px solid #293748;border-radius:11px;background:#070d14;padding:9px}.grouping-sector-analysis h3{margin:0 0 7px!important}.grouping-sector-analysis>div{display:grid;grid-template-columns:30px minmax(0,1fr) 52px;gap:7px;align-items:center;min-height:25px}.grouping-sector-analysis>div>span{font-size:10px;font-weight:1000;color:#fff;text-align:center}.grouping-sector-analysis>div>i{height:7px;border-radius:999px;background:#17222f;overflow:hidden}.grouping-sector-analysis>div>i>b{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ff4f57,#ffb039)}.grouping-sector-analysis>div>strong{font-size:8px;color:#a9b5c3;text-align:right}.grouping-sector-analysis p{margin:6px 0;color:#8e9cad;font-size:9px}.objective-performance{margin-top:9px;border:1px solid rgba(var(--exercise-rgb),.28);border-radius:13px;background:linear-gradient(180deg,rgba(var(--exercise-rgb),.045),#070d14);padding:9px}.objective-performance-head{display:flex;align-items:center;justify-content:space-between;gap:9px;padding-bottom:8px;border-bottom:1px solid #263443}.objective-performance-head>span{display:flex;flex-direction:column;min-width:0}.objective-performance-head small{font-size:6.2px;color:#8190a2;font-weight:1000;letter-spacing:.7px}.objective-performance-head b{margin-top:2px;color:var(--exercise-accent);font-size:11px;letter-spacing:.45px}.objective-performance-head em{font-style:normal;font-size:7px;color:#a9b4c1;font-weight:1000;text-align:right;white-space:nowrap}.objective-highlights{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.objective-highlights>div{min-height:54px;border:1px solid #2a394a;border-radius:10px;background:#081019;padding:7px;display:flex;flex-direction:column;justify-content:center}.objective-highlights span{font-size:6px;color:#8392a4;font-weight:1000;letter-spacing:.5px}.objective-highlights b{margin-top:2px;font-size:13px;color:#fff}.objective-highlights small{margin-top:2px;font-size:7px;color:#9ca9b8}.objective-highlights .best{border-color:#236b43;background:linear-gradient(180deg,#0b2116,#07100c)}.objective-highlights .best b{color:#69ef9a}.objective-highlights .weak{border-color:#6d3037;background:linear-gradient(180deg,#211014,#10090b)}.objective-highlights .weak b{color:#ff737a}.objective-performance-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:8px}.objective-performance-card{min-width:0;min-height:96px;border:1px solid #2c3949;border-radius:10px;background:#081019;padding:7px;display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden}.objective-performance-card header,.objective-performance-card footer{display:flex;align-items:center;justify-content:space-between;gap:5px}.objective-performance-card header span{font-size:6px;color:#748395;font-weight:1000}.objective-performance-card header strong{font-size:6.4px;color:#aeb9c6;letter-spacing:.35px}.objective-performance-card>b{font-size:10px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.objective-performance-bar{height:5px;border-radius:999px;background:#17222f;overflow:hidden}.objective-performance-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--exercise-accent),#fff);opacity:.85}.objective-performance-card footer{margin-top:auto}.objective-performance-card footer span,.objective-performance-card footer em{font-size:6.5px;font-style:normal;font-weight:1000}.objective-performance-card footer span{color:#8c9bad}.objective-performance-card footer em{color:#fff}.objective-performance-card.pending{opacity:.48}.objective-performance-card.active{border-color:var(--exercise-accent);box-shadow:0 0 12px rgba(var(--exercise-rgb),.14)}.objective-performance-card.ok{border-color:#286a46;background:linear-gradient(180deg,#0a1b13,#07100c)}.objective-performance-card.ok header strong{color:#6fe99c}.objective-performance-card.perfect{border-color:#4da96f;background:linear-gradient(180deg,#0c2718,#07110c);box-shadow:inset 0 0 18px #54ef8a12}.objective-performance-card.perfect header strong{color:#78f3a7}.objective-performance-card.fail,.objective-performance-card.cut{border-color:#71363c;background:linear-gradient(180deg,#211014,#10090b)}.objective-performance-card.fail header strong,.objective-performance-card.cut header strong{color:#ff747b}.objective-performance-card.cut:after{content:'½';position:absolute;right:5px;bottom:-8px;font-size:40px;font-weight:1000;color:#ff4d5714;line-height:1}.objective-score-shift{display:block;margin-top:1px;font-size:7px;color:#9ba8b7}.objective-score-shift b{color:#fff}.detail-grid{display:grid;grid-template-columns:1fr 1.25fr;gap:8px;margin-top:8px}.detail-grid>section,.position-section,.visits-section,.players-detail-list{border:1px solid #293748;border-radius:13px;background:#070d14;padding:10px}.challenge-donut-wrap{display:grid;grid-template-columns:130px minmax(0,1fr);gap:12px;align-items:center}.challenge-donut{width:126px;height:126px;border-radius:50%;display:grid;place-items:center;position:relative}.challenge-donut:after{content:'';position:absolute;inset:25px;border-radius:50%;background:#080e16;border:1px solid #273646}.challenge-donut>span{position:relative;z-index:2;font-size:18px;font-weight:1000;text-align:center}.challenge-donut>span small{display:block;font-size:6px;color:#91a0b2;margin-top:2px}.challenge-donut-legend{display:grid;grid-template-columns:1fr 1fr;gap:5px}.challenge-donut-legend>div{display:grid;grid-template-columns:8px 1fr auto;gap:5px;align-items:center;font-size:8px}.challenge-donut-legend i{width:8px;height:8px;border-radius:50%}.challenge-donut-legend b{font-size:8px}.challenge-donut-legend span{color:#aeb8c5}.challenge-mini-line{width:100%;height:142px;overflow:visible}.challenge-mini-line line{stroke:#334254;stroke-width:1}.challenge-mini-line polyline{fill:none;stroke:#ff4f57;stroke-width:4;stroke-linejoin:round;stroke-linecap:round}.challenge-mini-line circle{fill:#ff4f57;stroke:#fff;stroke-width:1.3}.position-section{margin-top:8px}.position-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.position-card{border:1px solid #243243;border-radius:11px;background:#09111a;padding:8px}.position-head{display:flex;justify-content:space-between;align-items:center;gap:6px}.position-head b{font-size:8px;color:#b3bdca}.position-head strong{font-size:15px;color:#ff6268}.position-bar{height:6px;border-radius:999px;background:#17212d;overflow:hidden;margin:6px 0 7px}.position-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff424a,#ffb01c);border-radius:999px}.position-rings{display:grid;grid-template-columns:1fr 1fr;gap:4px}.position-rings span{border-radius:7px;background:#0e1722;padding:5px;font-size:7px;color:#94a3b4;display:grid;grid-template-columns:auto 1fr auto;gap:3px;align-items:center}.position-rings b{color:#fff;text-align:right}.position-rings em{font-style:normal;color:#ffb33f}.visits-section{margin-top:8px}.visit-bars{height:112px;display:flex;align-items:flex-end;gap:3px;overflow-x:auto;padding-top:5px}.visit-bars>div{height:100%;min-width:14px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px}.visit-bars i{display:block;width:10px;min-height:3px;border-radius:4px 4px 1px 1px;background:linear-gradient(180deg,#ff5d64,#9e1118)}.visit-bars span{font-size:6px;color:#8493a5}.players-detail-list{margin-top:8px}.players-detail-list button{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;grid-template-areas:'avatar name score accuracy' 'avatar meta meta meta';gap:3px 7px;align-items:center;padding:7px;border:0;border-bottom:1px solid #1e2a38;background:transparent;color:#fff;text-align:left}.players-detail-list button:last-child{border-bottom:0}.players-detail-list button>span{grid-area:avatar;width:34px;height:34px;border-radius:50%;overflow:hidden}.players-detail-list button>b{grid-area:name;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.players-detail-list button>em{grid-area:score;color:#ffb33f;font-style:normal;font-weight:1000}.players-detail-list button>strong{grid-area:accuracy;color:#6ef29a}.players-detail-list button>small{grid-area:meta;color:#8f9eaf}.finish-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px}.finish-actions button{margin-top:0}.finish-stats{background:linear-gradient(180deg,#53131a,#1a090c)!important;border-color:#ff4c54!important}
@media(orientation:portrait){
 .match-detail-card{width:100%;max-height:94dvh;padding:9px}.match-detail-top{grid-template-columns:minmax(0,1fr) 100px minmax(0,1fr);min-height:86px}.match-side{grid-template-columns:50px minmax(0,1fr);padding:6px}.match-side>span{width:50px;height:50px}.detail-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.detail-grid{grid-template-columns:1fr}.position-grid{grid-template-columns:1fr}.challenge-donut-wrap{grid-template-columns:112px minmax(0,1fr)}.challenge-donut{width:106px;height:106px}.challenge-donut:after{inset:22px}.detail-scroll{padding-top:7px}.exercise-detail-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.exercise-detail-head>strong{font-size:20px}.objective-performance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.objective-highlights{grid-template-columns:1fr}.objective-performance-card{min-height:88px}.exercise-live{min-height:48px;padding:5px 6px}.exercise-live-darts{grid-template-columns:repeat(3,30px)}.exercise-live-darts i{height:28px}
 .portrait-only{display:flex!important}.landscape-only{display:none!important}.cp{gap:5px;height:calc(var(--vh,1vh)*100);max-height:100dvh;padding:max(4px,env(safe-area-inset-top,0px)) max(5px,env(safe-area-inset-right,0px)) max(12px,calc(env(safe-area-inset-bottom,0px) + 6px)) max(5px,env(safe-area-inset-left,0px))}.cp-head{height:68px;border-radius:13px}.cp-head-title{display:none}.cp-head .cp-ticker{position:absolute;z-index:1;inset:0;display:block!important;width:100%;height:100%;object-fit:cover;object-position:center}.cp-head:after{content:'';position:absolute;z-index:2;inset:0;background:linear-gradient(90deg,#02050ab8 0,transparent 22%,transparent 78%,#02050ab8 100%);pointer-events:none}.cp-back{left:7px;z-index:4}.cp-awena{right:7px;z-index:4}.cp-layout{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:5px;margin:0;overflow:hidden}.cp-left{padding:0;border:0;background:transparent;box-shadow:none;gap:3px}.player{height:100px;min-height:100px;padding:7px 8px;grid-template-columns:64px minmax(0,1fr) 54px minmax(78px,23%);gap:6px}.player-avatar{width:64px;height:64px}.player-team-bg{inset:5px 48% 5px 5%;opacity:.25}.player-team-bg img{max-width:96%}.player-meta small,.player-score small{font-size:7.5px}.player-meta>b{font-size:15px}.player-meta>span{font-size:7px}.player-meta em{font-size:7px}.player-score{min-width:52px;padding-left:5px}.player-score b{font-size:25px}.player-objective{height:68px;min-width:0;position:relative;display:flex!important;align-items:center;justify-content:center;overflow:hidden;border-left:1px solid #303a48;padding-left:4px}.player-objective img{width:100%;height:58px;object-fit:contain;filter:drop-shadow(0 0 7px #ff343455)}.player-objective span{position:absolute;bottom:0;right:2px;font-size:6px;color:#b8c2d0;font-weight:1000;letter-spacing:.5px}.cp-board{display:none}.portrait-stats-wrap{display:block!important}.cp-right{height:100%;min-height:0;padding:5px 5px 10px;display:flex;flex-direction:column;gap:4px;border-radius:13px}.turn-banner{flex:0 0 28px}.portrait-stats-wrap{flex:0 0 auto}.input-tools{flex:0 0 50px;height:50px;grid-template-columns:minmax(0,1fr) 104px;gap:5px}.input-tools .undo{font-size:11px}.voice span{font-size:9px}.challenge-segment-keypad{display:grid;gap:7px;padding:8px;border:1px solid #334255;border-radius:14px;background:#070d14}.challenge-segment-keypad.compact{gap:8px}.segment-number-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.segment-number-grid button{min-height:46px;border:1px solid #34465b;border-radius:10px;background:linear-gradient(180deg,#101b28,#08101a);color:#fff;font-size:15px;font-weight:1000;letter-spacing:.35px}.segment-number-grid button.band-neutral{border-color:#536074;background:linear-gradient(180deg,#162335,#0a111a)}.segment-number-grid button.band-yellow{border-color:#f1bf41;background:linear-gradient(180deg,#ffcf5e,#8e6510);color:#1e1200;text-shadow:0 1px 0 rgba(255,255,255,.2)}.segment-number-grid button.band-orange{border-color:#ff9d45;background:linear-gradient(180deg,#ff9f3c,#9a4506);color:#fff3e7}.segment-number-grid button.band-red{border-color:#ff5b5b;background:linear-gradient(180deg,#ff4a52,#8f1118);color:#fff3f3}.segment-number-grid button:disabled{opacity:.55}.segment-miss{min-height:44px;border:1px solid #7b3037;border-radius:10px;background:linear-gradient(180deg,#351016,#14080b);font-weight:1000;color:#ff777d;font-size:16px;letter-spacing:.45px}.keypad{flex:1 1 auto;height:auto;min-height:0;align-self:stretch;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:5px;padding-bottom:4px}.keypad.keys-4{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))}.keypad.keys-3{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:minmax(0,1fr)}.keypad.keys-2{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:minmax(0,1fr)}.keypad button{height:auto;min-height:0;border-radius:11px}.keypad button b{font-size:clamp(28px,10vw,42px)}.keypad [class~="25"] b,.keypad [class~="50"] b{font-size:clamp(15px,5.2vw,24px)}.keypad button span{font-size:clamp(8px,2.7vw,11px)}
}
@media(orientation:portrait) and (max-height:700px){.exercise-live{display:none}.cp-head{height:58px}.cp-awena{width:42px;height:42px}.cp-back{transform:translateY(-50%) scale(.9)}.player{height:82px;min-height:82px;grid-template-columns:52px minmax(0,1fr) 50px minmax(68px,22%)}.player-avatar{width:52px;height:52px}.player-objective{height:60px}.player-objective img{height:50px}.ps-title{height:20px}.ps-kpis div{height:30px}.ps-hits{margin-top:2px}.psh{height:23px}.match-detail-trigger{height:26px;margin-top:3px;font-size:8px}.cp-right{padding-bottom:9px}.turn-banner{flex-basis:25px;height:25px}.input-tools{flex-basis:46px;height:46px}.challenge-roster>div{height:34px}.challenge-roster{padding-bottom:2px}.challenge-segment-keypad{display:grid;gap:7px;padding:8px;border:1px solid #334255;border-radius:14px;background:#070d14}.challenge-segment-keypad.compact{gap:8px}.segment-number-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.segment-number-grid button{min-height:46px;border:1px solid #34465b;border-radius:10px;background:linear-gradient(180deg,#101b28,#08101a);color:#fff;font-size:15px;font-weight:1000;letter-spacing:.35px}.segment-number-grid button.band-neutral{border-color:#536074;background:linear-gradient(180deg,#162335,#0a111a)}.segment-number-grid button.band-yellow{border-color:#f1bf41;background:linear-gradient(180deg,#ffcf5e,#8e6510);color:#1e1200;text-shadow:0 1px 0 rgba(255,255,255,.2)}.segment-number-grid button.band-orange{border-color:#ff9d45;background:linear-gradient(180deg,#ff9f3c,#9a4506);color:#fff3e7}.segment-number-grid button.band-red{border-color:#ff5b5b;background:linear-gradient(180deg,#ff4a52,#8f1118);color:#fff3f3}.segment-number-grid button:disabled{opacity:.55}.segment-miss{min-height:44px;border:1px solid #7b3037;border-radius:10px;background:linear-gradient(180deg,#351016,#14080b);font-weight:1000;color:#ff777d;font-size:16px;letter-spacing:.45px}.keypad{height:auto;padding-bottom:3px}}
@media(orientation:landscape) and (max-height:520px){.cp{gap:4px;padding:3px max(4px,env(safe-area-inset-right,0px)) max(4px,env(safe-area-inset-bottom,0px)) max(4px,env(safe-area-inset-left,0px))}.cp-head{height:46px;border-radius:11px}.cp-back{left:5px;transform:translateY(-50%) scale(.82)}.cp-awena{right:5px;width:40px;height:40px}.cp-awena i{width:16px;height:16px;font-size:8px}.cp-ticker{width:min(360px,50%);height:42px}.cp-layout{gap:5px;grid-template-columns:25fr 35fr 40fr}.cp-left,.cp-right{padding:5px;gap:4px;border-radius:11px}.player{min-height:68px;padding:4px;grid-template-columns:48px minmax(0,1fr) auto;gap:5px}.player-avatar{width:48px;height:48px}.player-meta>b{font-size:14px}.player-meta i{margin-top:2px;font-size:7px}.player-score{min-width:48px}.player-score b{font-size:23px}.left-kpis{gap:3px}.left-kpis>div{min-height:42px}.left-kpis span{font-size:6px}.left-kpis b{font-size:15px}.left-actions{gap:3px}.left-actions>button,.left-actions>div{min-height:36px}.left-actions span{font-size:6px}.left-actions b{font-size:9px}.player-list-title{height:25px;flex-basis:25px}.player-list-scroll{padding:3px;gap:2px}.player-row{min-height:35px;grid-template-columns:28px minmax(0,1fr) auto;padding:2px 3px}.list-avatar{width:28px;height:28px}.list-name b{font-size:8px}.list-name small,.list-score small{font-size:6px}.list-score b{font-size:11px}.cp-board{padding:5px;border-radius:11px}.board-caption{min-height:36px;padding:2px 8px;border-radius:9px}.board-caption span{font-size:10px}.board-caption b{font-size:24px}.landscape-turn{min-height:30px;padding:2px 6px}.landscape-turn span{font-size:9px}.landscape-turn b{font-size:22px}.landscape-turn i{font-size:12px}.landscape-stats h2{font-size:11px;margin-bottom:3px;padding-bottom:3px}.hitstats{gap:2px}.hs{min-height:46px;padding:2px 1px;border-bottom-width:3px}.hs b{font-size:8px}.hs b small{font-size:6px}.hs strong{font-size:17px}.input-tools{height:40px;gap:4px}.input-tools .undo{font-size:9px}.voice svg{width:17px;height:17px}.voice span{font-size:8px}.challenge-segment-keypad{display:grid;gap:7px;padding:8px;border:1px solid #334255;border-radius:14px;background:#070d14}.challenge-segment-keypad.compact{gap:8px}.segment-number-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.segment-number-grid button{min-height:46px;border:1px solid #34465b;border-radius:10px;background:linear-gradient(180deg,#101b28,#08101a);color:#fff;font-size:15px;font-weight:1000;letter-spacing:.35px}.segment-number-grid button.band-neutral{border-color:#536074;background:linear-gradient(180deg,#162335,#0a111a)}.segment-number-grid button.band-yellow{border-color:#f1bf41;background:linear-gradient(180deg,#ffcf5e,#8e6510);color:#1e1200;text-shadow:0 1px 0 rgba(255,255,255,.2)}.segment-number-grid button.band-orange{border-color:#ff9d45;background:linear-gradient(180deg,#ff9f3c,#9a4506);color:#fff3e7}.segment-number-grid button.band-red{border-color:#ff5b5b;background:linear-gradient(180deg,#ff4a52,#8f1118);color:#fff3f3}.segment-number-grid button:disabled{opacity:.55}.segment-miss{min-height:44px;border:1px solid #7b3037;border-radius:10px;background:linear-gradient(180deg,#351016,#14080b);font-weight:1000;color:#ff777d;font-size:16px;letter-spacing:.45px}.keypad{height:auto;grid-auto-rows:clamp(62px,18vh,78px);gap:4px}.keypad.keys-4{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,clamp(62px,18vh,78px))}.keypad.keys-3{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:clamp(62px,18vh,78px)}.keypad button{border-radius:9px}.keypad button b{font-size:clamp(25px,5vh,34px)}.keypad button span{font-size:8px}}


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


/* Challenge V27 — doubles/triples visuels + layout joueur + stats lisibles */
.player{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;grid-auto-rows:1fr!important;gap:10px!important}
.player-avatar-wrap{grid-column:1!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;padding-left:6px!important}
.player-side{grid-column:2!important;display:grid!important;grid-template-columns:minmax(72px,.8fr) minmax(82px,1fr)!important;align-items:center!important;gap:8px!important;min-width:0!important}
.player-score{border-left:0!important;padding-left:0!important;min-width:0!important}
.player-objective{justify-self:stretch!important;border-left:1px solid rgba(90,108,128,.34)!important;padding-left:8px!important;min-width:0!important;max-width:none!important;margin-right:0!important}
.player-objective img{width:min(96px,100%)!important;height:auto!important;display:block!important}
.player-objective-value{display:none!important}
@media(orientation:portrait){.player{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;height:122px!important}.player-side{grid-template-columns:72px minmax(72px,1fr)!important;gap:6px!important}.player-score b{font-size:54px!important}.player-objective img{width:70px!important}.player-avatar-label{display:flex!important;flex-direction:column!important;gap:2px!important;margin-left:8px!important}}
@media(orientation:landscape){.player{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;height:108px!important}.player-side{grid-template-columns:84px minmax(88px,1fr)!important;gap:8px!important}.player-score b{font-size:56px!important}.player-objective img{width:82px!important}}
.detail-section-tabs{gap:7px!important;padding:3px 0 10px!important}
.detail-section-tabs button{display:flex!important;align-items:center!important;gap:6px!important;min-height:38px!important;padding:7px 11px!important;font-size:9px!important}
.detail-section-tabs button i{font-style:normal!important;color:#ff5259!important;font-size:13px!important;line-height:1!important}
.detail-section-tabs button span{display:block!important;line-height:1!important}
.records-head strong{font-size:13px!important}.records-head span{font-size:8.5px!important}
.record-group h3{font-size:10px!important;letter-spacing:.9px!important}
.record-grid{gap:8px!important}.record-card{min-height:82px!important;padding:9px 10px 10px!important;gap:5px 10px!important}.record-card>span{font-size:8.3px!important;line-height:1.22!important}.record-card>b{font-size:21px!important}.record-card>em{font-size:8.2px!important}.record-quality{height:5px!important}
.records-legend span{font-size:7.5px!important;min-height:28px!important}
.detail-kpis>div span{font-size:8px!important}.detail-kpis>div b{font-size:18px!important}
.visual-analysis>h3,.position-section h3,.visits-section h3{font-size:10px!important;letter-spacing:.8px!important}
.position-head b{font-size:9px!important}.position-head strong{font-size:12px!important}.position-rings span{font-size:8px!important}.position-rings span b{font-size:10px!important}.position-rings span em{font-size:10px!important}
.visit-bars>div span{font-size:8px!important}.visit-bars>div b{font-size:10px!important}
.family-analysis-strip{display:grid;grid-template-columns:118px minmax(0,1fr);gap:8px;margin:10px 0 12px}.family-analysis-strip>div{min-height:52px;padding:8px 10px;border:1px solid #2c3b4e;border-radius:12px;background:linear-gradient(180deg,#08111b,#050b12);display:grid;align-content:center;gap:4px}.family-analysis-strip span{font-size:8px;font-weight:1000;color:#8fa0b2;letter-spacing:.55px}.family-analysis-strip b{font-size:14px;color:#fff;line-height:1.15}

@media(max-width:620px){.detail-section-tabs button{font-size:9px!important;padding:8px 10px!important}.record-card{min-height:92px!important}.record-card>b{font-size:26px!important}.record-card>span{font-size:9.5px!important}.family-analysis-strip{grid-template-columns:1fr!important}}
/* Challenge detailed stats readability V69 */
.records-head{padding:2px 2px 8px}.records-head strong{font-size:13px!important;letter-spacing:.65px}.records-head span{font-size:9px!important;line-height:1.35;color:#98a6b7}.record-group{padding:11px!important}.record-group>h3{font-size:10px!important;margin-bottom:9px!important}.record-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:9px!important}.record-card{min-height:94px!important;padding:11px 12px 12px!important;grid-template-areas:'label label' 'value value' 'holder holder' 'bar bar'!important;gap:6px!important;align-content:center}.record-card>span{font-size:10px!important;letter-spacing:.55px!important;color:#b6c2d0!important}.record-card>b{font-size:30px!important;text-align:left!important}.record-card>em{font-size:8px!important;color:#8290a2!important}.record-quality{height:6px!important}.records-legend span{font-size:8px!important;min-height:30px!important}.detail-section-tabs button{min-height:44px!important;font-size:10px!important;padding:8px 13px!important}.detail-section-tabs button i{font-size:15px!important}.detail-kpis>div{min-height:76px!important;padding:10px!important}.detail-kpis>div span{font-size:9px!important}.detail-kpis>div b{font-size:24px!important}
@media(max-width:620px){.record-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.record-group{padding:9px!important}.record-card{min-height:100px!important;padding:10px!important}.record-card>b{font-size:29px!important}.record-card>span{font-size:9.5px!important}.records-legend{grid-template-columns:repeat(2,minmax(0,1fr))!important}.records-legend span{font-size:7.5px!important}.detail-section-tabs{gap:6px!important}.detail-section-tabs button{min-height:44px!important;font-size:9px!important}.detail-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}.detail-kpis>div b{font-size:23px!important}}
@media(max-width:360px){.record-grid{grid-template-columns:1fr!important}.record-card{min-height:86px!important}}

/* Challenge V70 — lecture stats instantanée, cartes iconographiques et mobile moins dense */
.detail-glance{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 10px}.detail-glance>div{position:relative;min-width:0;min-height:66px;padding:8px 9px 8px 38px;border:1px solid #2c3a4b;border-radius:12px;background:linear-gradient(180deg,#0d1722,#071019);display:flex;flex-direction:column;justify-content:center}.detail-glance>div>span{position:absolute;left:9px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:7px;display:grid;place-items:center;border:1px solid #46596f;background:#111e2b;color:#ff5960;font-size:12px;font-weight:1000}.detail-glance small{font-size:7.5px;color:#8796a8;font-weight:1000;letter-spacing:.55px}.detail-glance b{margin-top:2px;font-size:20px;line-height:1;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.record-card-label{grid-area:label!important;display:flex!important;align-items:center!important;gap:7px!important;min-width:0}.record-card-label>i{flex:0 0 24px;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;border:1px solid #3a4a5d;background:#101a26;color:#ff5b62;font-style:normal;font-size:10px;font-weight:1000}.record-card-label>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:inherit}.record-card.quality-top{box-shadow:inset 0 0 0 1px rgba(67,218,119,.06)}.record-card.quality-good{box-shadow:inset 0 0 0 1px rgba(255,205,64,.05)}.record-card.quality-mid{box-shadow:inset 0 0 0 1px rgba(255,143,49,.05)}.record-card.quality-low{box-shadow:inset 0 0 0 1px rgba(255,76,85,.05)}
@media(max-width:620px){.match-detail-modal{padding:4px}.match-detail-card.advanced{width:100%!important;max-height:98dvh!important;border-radius:14px!important;padding:8px!important}.records-head{padding-inline:2px}.records-head span{display:none}.detail-glance{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:8px}.detail-glance>div{min-height:58px;padding:7px 8px 7px 36px}.detail-glance b{font-size:19px}.detail-glance small{font-size:7px}.detail-section-tabs{position:sticky;top:0;z-index:5;padding:6px 0 8px!important;background:linear-gradient(180deg,#0b1119 78%,rgba(11,17,25,0))}.record-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.record-card{min-height:88px!important;padding:9px!important}.record-card>b{font-size:27px!important}.record-card-label>i{width:22px;height:22px;flex-basis:22px}.record-card-label>span{font-size:9px!important}.record-card>em{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.records-legend{display:none!important}.match-detail-close{position:sticky;bottom:0;z-index:7;height:44px;margin-top:8px;box-shadow:0 -8px 18px #06090ecc}}
@media(max-width:380px){.detail-glance{grid-template-columns:1fr 1fr}.record-grid{grid-template-columns:1fr!important}.record-card{min-height:82px!important}.record-card>b{font-size:28px!important}}

/* Challenge V39 — identité visuelle + parcours + fiche finale dédiée aux exercices */
.cp{--exercise-accent:#ff5259;--exercise-rgb:255,82,89}.cp.exercise-clock{--exercise-accent:#42d9ff;--exercise-rgb:66,217,255}.cp.exercise-half-it{--exercise-accent:#b884ff;--exercise-rgb:184,132,255}.cp.exercise-sequence{--exercise-accent:#ffbd4a;--exercise-rgb:255,189,74}.cp.exercise-grouping{--exercise-accent:#63ee9a;--exercise-rgb:99,238,154}
.cp:not(.exercise-classic) .board-caption{border-color:rgba(var(--exercise-rgb),.56);box-shadow:0 0 20px rgba(var(--exercise-rgb),.17)}.cp:not(.exercise-classic) .board-caption>b{color:var(--exercise-accent);text-shadow:0 0 12px rgba(var(--exercise-rgb),.42)}.cp:not(.exercise-classic) .player{border-color:rgba(var(--exercise-rgb),.38)}.cp:not(.exercise-classic) .player-score b{color:var(--exercise-accent)}
.exercise-board-hud{position:absolute;z-index:5;left:8px;right:8px;bottom:8px;padding:7px;border:1px solid rgba(var(--exercise-rgb),.46);border-radius:12px;background:linear-gradient(180deg,rgba(7,13,20,.9),rgba(4,8,13,.96));box-shadow:0 8px 24px #000a,0 0 18px rgba(var(--exercise-rgb),.12);backdrop-filter:blur(7px)}.exercise-board-hud-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}.exercise-board-hud-title span{font-size:7px;font-weight:1000;letter-spacing:.85px;color:#8998a9}.exercise-board-hud-title b{font-size:8px;color:var(--exercise-accent);letter-spacing:.55px}.exercise-route{display:flex;gap:4px;overflow:hidden}.exercise-route>i{position:relative;flex:1 1 0;min-width:0;height:43px;border:1px solid #2f3c4d;border-radius:8px;background:#09111a;display:flex;flex-direction:column;align-items:center;justify-content:center;font-style:normal;overflow:hidden}.exercise-route>i small{font-size:5.5px;color:#748294;font-weight:1000}.exercise-route>i b{max-width:100%;font-size:8px;color:#cbd3dd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 3px}.exercise-route>i em{position:absolute;right:3px;top:2px;font-size:8px;font-style:normal;font-weight:1000}.exercise-route>i.ok{border-color:#2c8652;background:#0a2114}.exercise-route>i.ok em{color:#67ef98}.exercise-route>i.ko{border-color:#713139;background:#211013}.exercise-route>i.ko em{color:#ff6971}.exercise-route>i.active{border-color:var(--exercise-accent);background:rgba(var(--exercise-rgb),.13);box-shadow:0 0 14px rgba(var(--exercise-rgb),.24)}.exercise-route>i.active b{color:#fff}.exercise-board-hud.grouping .exercise-route>i{height:40px}.exercise-board-hud.grouping .exercise-route>i b{font-size:12px;color:#fff}
.exercise-live{position:relative;overflow:hidden}.exercise-live-progress{grid-column:1/-1;height:3px;border-radius:999px;background:#1a2633;overflow:hidden;margin:-2px 1px 0}.exercise-live-progress>i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--exercise-accent),#fff);box-shadow:0 0 8px rgba(var(--exercise-rgb),.5)}.exercise-live.clock,.exercise-live.half-it,.exercise-live.sequence,.exercise-live.grouping{border-color:rgba(var(--exercise-rgb),.46)}.exercise-live.clock .exercise-live-copy b,.exercise-live.sequence .exercise-live-copy b,.exercise-live.grouping .exercise-live-copy b{color:var(--exercise-accent)}
.exercise-records-block{margin-top:9px;padding-top:9px;border-top:1px solid #263443}.exercise-records-block .record-group{border-color:rgba(var(--exercise-rgb),.28);background:linear-gradient(180deg,rgba(var(--exercise-rgb),.055),#070d14)}.exercise-records-block .record-group>h3{color:var(--exercise-accent)!important}.exercise-streak-kpis>div{border-color:rgba(var(--exercise-rgb),.26);background:linear-gradient(180deg,rgba(var(--exercise-rgb),.06),#081019)}.exercise-streak-kpis b{color:var(--exercise-accent)!important}
.finish.finish-clock,.finish.finish-half-it,.finish.finish-sequence,.finish.finish-grouping{background:radial-gradient(circle at 50% 32%,rgba(var(--exercise-rgb),.17),transparent 33%),#000f}.finish-panel{position:relative;z-index:4;width:min(760px,96vw);max-height:94dvh;overflow:auto;padding:12px;border:1px solid rgba(var(--exercise-rgb),.5);border-radius:22px;background:linear-gradient(180deg,#101721f5,#05080df7);box-shadow:0 30px 90px #000,0 0 38px rgba(var(--exercise-rgb),.12);text-align:left}.finish-exercise-badge{min-height:58px;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:9px;align-items:center;padding:7px 9px;border:1px solid rgba(var(--exercise-rgb),.35);border-radius:13px;background:rgba(var(--exercise-rgb),.06)}.finish-exercise-badge>i{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;border:1px solid rgba(var(--exercise-rgb),.5);background:#071019;color:var(--exercise-accent);font-size:21px;font-style:normal;font-weight:1000}.finish-exercise-badge>span{min-width:0}.finish-exercise-badge small,.finish-exercise-badge b{display:block}.finish-exercise-badge small{font-size:6.5px;color:#8492a4;font-weight:1000;letter-spacing:.8px}.finish-exercise-badge b{margin-top:2px;font-size:14px;color:#fff;letter-spacing:.5px}.finish-exercise-badge>em{font-size:8px;color:var(--exercise-accent);font-style:normal;font-weight:1000;white-space:nowrap}.finish-hero{display:grid;grid-template-columns:86px minmax(0,1fr);gap:12px;align-items:center;margin-top:9px;padding:10px;border:1px solid #293747;border-radius:15px;background:radial-gradient(circle at 16% 50%,rgba(var(--exercise-rgb),.12),transparent 34%),#080e16}.finish-hero-avatar{width:82px;height:82px;border-radius:50%;overflow:hidden;display:grid;place-items:center;border:2px solid var(--exercise-accent);box-shadow:0 0 18px rgba(var(--exercise-rgb),.22)}.finish-hero-avatar>*{width:100%!important;height:100%!important}.finish-hero>div{min-width:0}.finish-hero>div>small{font-size:7px;color:#8b98a9;font-weight:1000;letter-spacing:.9px}.finish .finish-hero h2{margin:1px 0 2px;font-size:clamp(18px,4vw,28px);line-height:1.05;letter-spacing:.8px;color:#fff;text-shadow:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finish .finish-hero strong{display:flex;align-items:baseline;gap:5px;font-size:clamp(30px,7vw,48px);line-height:1;color:var(--exercise-accent);text-shadow:0 0 15px rgba(var(--exercise-rgb),.35)}.finish .finish-hero strong small{font-size:10px;color:#a6b1bf;letter-spacing:.7px}.finish-hero p{margin:5px 0 0;color:#c2cbd6;font-size:9px;line-height:1.35;font-weight:850}.finish-exercise-records{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}.finish-exercise-records>div{min-height:58px;padding:6px;border:1px solid #293748;border-radius:10px;background:#071019;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.finish-exercise-records span{font-size:6px;color:#8997a8;font-weight:1000;letter-spacing:.4px}.finish-exercise-records b{margin-top:3px;font-size:16px!important;color:var(--exercise-accent)!important;line-height:1}.finish-exercise-records small{max-width:100%;margin-top:3px;font-size:6px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finish-progress{margin-top:8px;padding:8px;border:1px solid rgba(var(--exercise-rgb),.34);border-radius:12px;background:linear-gradient(180deg,rgba(var(--exercise-rgb),.055),#070d14)}.finish-progress>header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:6px;border-bottom:1px solid #263442}.finish-progress>header span{min-width:0;display:flex;flex-direction:column}.finish-progress>header small{font-size:6px;color:#8492a3;font-weight:1000;letter-spacing:.55px}.finish-progress>header b{margin-top:2px;font-size:9px;color:#fff;letter-spacing:.4px}.finish-progress>header em{font-size:7px;color:#95a4b6;font-style:normal;font-weight:1000;white-space:nowrap}.finish-progress>header em.record{color:#ffd75a;text-shadow:0 0 10px #ffd75a44}.finish-progress-empty{margin-top:7px;padding:8px;border:1px dashed #34475b;border-radius:9px;color:#94a3b4;font-size:7.5px;line-height:1.4;text-align:center}.finish-progress-deltas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:7px}.finish-progress-deltas>div{min-height:52px;padding:6px;border:1px solid #2a3948;border-radius:9px;background:#071019;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'label value' 'sub sub';align-items:center;gap:2px 6px}.finish-progress-deltas span{grid-area:label;font-size:6px;color:#8493a5;font-weight:1000}.finish-progress-deltas b{grid-area:value;font-size:15px}.finish-progress-deltas small{grid-area:sub;font-size:6px;color:#a5b0bd}.finish-progress-deltas .up b{color:#69ef9a}.finish-progress-deltas .down b{color:#ff737a}.finish-progress-deltas .flat b{color:#bcc7d3}.finish-new-records{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:6px}.finish-new-records>div{position:relative;min-height:52px;padding:6px 76px 6px 7px;border:1px solid #8b7424;border-radius:9px;background:linear-gradient(135deg,#241d08,#0c0e12 68%)}.finish-new-records span{display:block;font-size:5.8px;color:#ffd75a;font-weight:1000;letter-spacing:.55px}.finish-new-records b{display:block;margin-top:2px;font-size:8px;color:#fff}.finish-new-records strong{position:absolute;right:7px;top:9px;font-size:16px!important;color:#ffd75a!important}.finish-new-records small{display:block;margin-top:4px;font-size:5.8px;color:#a8a58f}.finish-progress-insights{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:6px}.finish-progress-insights>div{min-height:48px;padding:6px;border:1px solid #2a3948;border-radius:9px;background:#071019}.finish-progress-insights span{display:block;font-size:5.8px;color:#8493a5;font-weight:1000;letter-spacing:.45px}.finish-progress-insights b{display:block;margin-top:2px;font-size:13px}.finish-progress-insights small{display:block;margin-top:2px;font-size:6px;color:#9eabb9;line-height:1.25}.finish-progress-insights .up{border-color:#286e47;background:linear-gradient(180deg,#0b2116,#07100c)}.finish-progress-insights .up b{color:#69ef9a}.finish-progress-insights .down{border-color:#6e3138;background:linear-gradient(180deg,#211014,#10090b)}.finish-progress-insights .down b{color:#ff737a}.finish-row-record{display:inline-flex;width:max-content;margin-top:3px;padding:2px 5px;border:1px solid #8b7424;border-radius:999px;background:#211b08;color:#ffd75a;font-size:5.8px!important;font-style:normal!important;font-weight:1000;letter-spacing:.35px}.finish-panel .finish-scoreline{width:100%;max-width:none;margin-top:8px;gap:5px}.finish-panel .finish-score-row{min-height:52px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;grid-template-areas:none;gap:8px;align-items:center;padding:6px 8px;text-align:left}.finish-row-avatar{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center}.finish-row-avatar>*{width:100%!important;height:100%!important}.finish-row-name{min-width:0;display:flex;flex-direction:column}.finish-panel .finish-row-name>b{grid-area:auto;color:#fff;font-size:10px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finish-panel .finish-row-name>em{grid-area:auto;margin-top:3px;color:#93a0b0;font-size:7px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finish-panel .finish-score-row>strong{grid-area:auto;display:flex;flex-direction:column;align-items:flex-end;font-size:19px;color:var(--exercise-accent);line-height:1}.finish-panel .finish-score-row>strong small{margin-top:2px;font-size:6px;color:#8290a1}.finish-panel .finish-score-row.winner{border-color:rgba(var(--exercise-rgb),.55);background:linear-gradient(90deg,rgba(var(--exercise-rgb),.12),#0a1018 62%)}.finish-panel .finish-actions{margin-top:10px}.finish-panel .finish-actions button{min-height:42px;padding:9px 16px}.finish-panel .finish-stats{background:linear-gradient(180deg,rgba(var(--exercise-rgb),.28),rgba(var(--exercise-rgb),.08))!important;border-color:var(--exercise-accent)!important;color:#fff!important}
@media(max-width:620px){.finish{padding:8px}.finish-panel{width:98vw;max-height:96dvh;padding:8px;border-radius:16px}.finish-exercise-badge{grid-template-columns:38px minmax(0,1fr) auto;min-height:50px;padding:5px 7px}.finish-exercise-badge>i{width:34px;height:34px;font-size:18px}.finish-exercise-badge b{font-size:11px}.finish-hero{grid-template-columns:64px minmax(0,1fr);gap:8px;padding:7px}.finish-hero-avatar{width:60px;height:60px}.finish .finish-hero h2{font-size:17px}.finish .finish-hero strong{font-size:30px}.finish-hero p{font-size:7px}.finish-exercise-records{grid-template-columns:repeat(2,minmax(0,1fr))}.finish-exercise-records>div{min-height:46px}.finish-progress-deltas,.finish-new-records,.finish-progress-insights{grid-template-columns:1fr}.finish-progress>header{align-items:flex-start}.finish-progress>header em{font-size:6px}.finish-panel .finish-score-row{min-height:48px}.finish-panel .finish-actions{display:grid;grid-template-columns:1fr 1fr}.finish-panel .finish-actions .finish-menu{grid-column:1/-1}.exercise-board-hud{display:none}}

/* Challenge V45 — records persistants et progression multi-parties des exercices */
.exercise-career{margin-top:10px;padding:10px;border:1px solid rgba(var(--exercise-rgb),.32);border-radius:14px;background:linear-gradient(180deg,rgba(var(--exercise-rgb),.055),#060c13);box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}.exercise-career-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:8px;border-bottom:1px solid #263443}.exercise-career-head>span{display:flex;flex-direction:column;min-width:0}.exercise-career-head small{font-size:6.2px;color:#7f8ea0;font-weight:1000;letter-spacing:.72px}.exercise-career-head b{margin-top:2px;font-size:11px;color:var(--exercise-accent);letter-spacing:.48px}.exercise-career-head em{font-size:7px;color:#c0cad6;font-style:normal;font-weight:1000;white-space:nowrap}.exercise-career-empty{margin-top:8px;padding:12px;border:1px dashed #344558;border-radius:10px;background:#071019;color:#8e9daf;font-size:8.5px;line-height:1.45;text-align:center}.exercise-career-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}.exercise-career-kpis>div{min-height:66px;padding:7px;border:1px solid #293848;border-radius:10px;background:#071019;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.exercise-career-kpis span{font-size:6px;color:#8493a5;font-weight:1000;letter-spacing:.45px}.exercise-career-kpis b{margin-top:3px;font-size:18px;color:var(--exercise-accent)}.exercise-career-kpis small{margin-top:2px;font-size:6.5px;color:#a8b3c0}.exercise-career-trend{margin-top:7px;padding:8px;border:1px solid #283747;border-radius:10px;background:#071019}.exercise-career-trend>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.exercise-career-trend>div span{font-size:6.5px;color:#8a99aa;font-weight:1000;letter-spacing:.55px}.exercise-career-trend>div b{font-size:8px}.exercise-career-trend>div b.up{color:#69ef9a}.exercise-career-trend>div b.down{color:#ff737a}.exercise-career-trend>div b.flat{color:#aab5c2}.exercise-career-trend>section{height:72px;display:flex;align-items:flex-end;gap:5px;margin-top:6px}.exercise-career-trend>section i{position:relative;flex:1 1 0;height:100%;min-width:22px;border-radius:7px;background:#0b1520;border:1px solid #203043;overflow:hidden;display:flex;align-items:flex-end;justify-content:center;font-style:normal}.exercise-career-trend>section u{display:block;width:100%;min-height:4px;background:linear-gradient(180deg,var(--exercise-accent),rgba(var(--exercise-rgb),.28));text-decoration:none;opacity:.88}.exercise-career-trend>section small{position:absolute;left:0;right:0;bottom:3px;font-size:6px;color:#fff;font-weight:1000;text-align:center;text-shadow:0 1px 4px #000}.exercise-career-insights{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:7px}.exercise-career-insights>div{min-height:58px;padding:7px;border:1px solid #2a3949;border-radius:10px;background:#081019;display:flex;flex-direction:column;justify-content:center}.exercise-career-insights span{font-size:6px;color:#8493a5;font-weight:1000;letter-spacing:.45px}.exercise-career-insights b{margin-top:2px;font-size:13px;color:#fff}.exercise-career-insights small{margin-top:2px;font-size:7px;color:#9daaba}.exercise-career-insights .strong{border-color:#256c45;background:linear-gradient(180deg,#0a2115,#07100c)}.exercise-career-insights .strong b{color:#69ef9a}.exercise-career-insights .weak{border-color:#6e3138;background:linear-gradient(180deg,#211014,#10090b)}.exercise-career-insights .weak b{color:#ff737a}.exercise-career-insights .career-sector-list{grid-column:1/-1}.exercise-career-insights .career-sector-list b{color:var(--exercise-accent);font-size:11px;line-height:1.35}
@media(max-width:620px){.exercise-career{padding:8px}.exercise-career-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.exercise-career-kpis>div{min-height:56px}.exercise-career-insights{grid-template-columns:1fr}.exercise-career-insights .career-sector-list{grid-column:auto}.exercise-career-trend>section{height:62px}}

`;
