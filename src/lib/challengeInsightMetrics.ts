/** Derived, read-only CHALLENGE indicators. History V4 remains the single source.
 * In-progress sessions are excluded from records and completed performance metrics.
 * Only results sharing the same configKey may compete for a record.
 */
import type {ChallengeArchiveItem} from './challengeArchiveCore.ts';

export type HistoryPoint={playedAt:number;score:number;darts:number;accuracy:number;bestStreak:number};
export type RecordBreakthrough={id:string;playedAt:number;value:number;gain:number;first:boolean;score:number;darts:number};

const chronological=(items:readonly ChallengeArchiveItem[])=>items.filter(i=>i.status==='finished')
 .slice().sort((a,b)=>a.playedAt-b.playedAt || a.id.localeCompare(b.id));
const avg=(items:readonly number[])=>items.length?items.reduce((n,v)=>n+v,0)/items.length:0;
const pct=(value:number)=>Math.round(value*10)/10;

export function buildChallengeStats(items:readonly ChallengeArchiveItem[]){
 const finished=chronological(items);
 const ongoing=items.filter(i=>i.status==='in_progress');
 const played=finished.length;
 const totalDarts=finished.reduce((n,i)=>n+i.darts,0);
 const totalHits=finished.reduce((n,i)=>n+i.successful,0);
 const weightedAccuracy=totalDarts
  ?finished.reduce((n,i)=>n+i.darts*i.accuracy,0)/totalDarts
  :avg(finished.map(i=>i.accuracy));
 const configs=new Map<string,{key:string;label:string;count:number;last:number}>();
 for(const item of finished){
  const existing=configs.get(item.configKey);
  if(existing){existing.count++;existing.last=Math.max(existing.last,item.playedAt);}
  else configs.set(item.configKey,{key:item.configKey,label:item.configLabel,count:1,last:item.playedAt});
 }
 return {
  played,ongoing:ongoing.length,totalDarts,totalHits,
  accuracy:played?pct(weightedAccuracy):null,
  averageScore:finished.some(i=>i.scoreKnown!==false)?pct(avg(finished.filter(i=>i.scoreKnown!==false).map(i=>i.score))):null,
  averageDarts:played?pct(totalDarts/played):null,
  averageSuccessful:played?pct(totalHits/played):null,
  bestStreak:played?Math.max(...finished.map(i=>i.bestStreak)):null,
  latest:finished[finished.length-1]||null,
  history:finished.slice(-30).map(i=>({playedAt:i.playedAt,score:i.score,scoreKnown:i.scoreKnown!==false,darts:i.darts,accuracy:i.accuracy,bestStreak:i.bestStreak})),
  configurations:Array.from(configs.values()).sort((a,b)=>b.count-a.count||b.last-a.last),
  recent:finished.slice(-20).reverse(),
 };
}

export function buildChallengeRecordDetails(items:readonly ChallengeArchiveItem[],configKey:string,goal:'min'|'max'){
 const matches=chronological(items).filter(i=>i.configKey===configKey);
 const eligible=goal==='min'?matches.filter(i=>i.darts>0):matches.filter(i=>i.scoreKnown!==false);
 const metric=(i:ChallengeArchiveItem)=>goal==='min'?i.darts:i.score;
 const better=(a:number,b:number)=>goal==='min'?a<b:a>b;
 const breakthroughs:RecordBreakthrough[]=[];
 const curve:Array<{playedAt:number;value:number}>=[];
 let best:number|null=null;
 for(const item of eligible){
  const value=metric(item);
  if(best===null||better(value,best)){
   breakthroughs.push({id:item.id,playedAt:item.playedAt,value,gain:best===null?0:Math.abs(value-best),first:best===null,score:item.score,darts:item.darts});
   best=value;
  }
  curve.push({playedAt:item.playedAt,value:best!});
 }
 const ranking=eligible.slice().sort((a,b)=>goal==='min'?a.darts-b.darts:a.score===b.score?a.darts-b.darts:b.score-a.score).slice(0,5);
 const top=ranking[0]||null;
 const last=eligible[eligible.length-1]||null;
 const gap=last&&top?Math.max(0,goal==='min'?last.darts-top.darts:top.score-last.score):null;
 const first=eligible[0]||null;
 const initial=first?metric(first):null;
 const absoluteProgress=top&&first?Math.max(0,goal==='min'?first.darts-top.darts:top.score-first.score):0;
 return {
  goal,played:eligible.length,ignoredZeroDarts:goal==='min'?matches.length-eligible.length:0,
  ignoredUnknownScores:goal==='max'?matches.length-eligible.length:0,
  best:top,last,first,value:top?metric(top):null,gap,initial,
  absoluteProgress,
  breakthroughs:breakthroughs.slice().reverse(),improvements:Math.max(0,breakthroughs.length-1),
  history:curve.slice(-30),ranking,
  bestAccuracy:matches.length?matches.reduce((a,b)=>b.accuracy>a.accuracy?b:a):null,
  longestStreak:matches.length?matches.reduce((a,b)=>b.bestStreak>a.bestStreak?b:a):null,
  performances:eligible.slice(-30),
 };
}
