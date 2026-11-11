/** CHALLENGE : diagnostic précis à partir des parties terminées dans History V4.
 * Ne crée jamais d'impacts, ni de scores, à partir d'une règle théorique.
 * Les impacts tirés d'un récapitulatif historique sont indiqués séparément
 * des fléchettes dont le numéro exact est documenté.
 */
import type {ChallengeArchiveItem} from './challengeArchiveCore.ts';

export type ChallengeImpactZone='G'|'P'|'S'|'D'|'T'|'BULL25'|'DBULL50'|'MISS';
export type ChallengeSectorDetail={sector:number;total:number;G:number;P:number;S:number;D:number;T:number};
const zones:readonly ChallengeImpactZone[]=['G','P','S','D','T','BULL25','DBULL50','MISS'];
const emptyZones=():Record<ChallengeImpactZone,number>=>({G:0,P:0,S:0,D:0,T:0,BULL25:0,DBULL50:0,MISS:0});
const number=(value:unknown)=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
function zoneOf(raw:unknown):ChallengeImpactZone|null {
 const zone=String(raw??'').trim().toUpperCase();
 if(zone==='25'||zone==='BULL'||zone==='SBULL'||zone==='BULL25')return 'BULL25';
 if(zone==='50'||zone==='DBULL'||zone==='DBULL50')return 'DBULL50';
 return zones.includes(zone as ChallengeImpactZone)?zone as ChallengeImpactZone:null;
}
function getPlayerSummary(row:ChallengeArchiveItem):any|null {
 const rec=row.record;
 const lists=[rec?.summary?.perPlayer,rec?.payload?.summary?.perPlayer,rec?.payload?.stats?.players,rec?.decoded?.summary?.perPlayer,rec?.decoded?.stats?.players];
 for(const list of lists){
  if(!Array.isArray(list))continue;
  const player=list.find((entry:any)=>String(entry?.id??entry?.playerId??entry?.profileId??'')===row.playerId);
  if(player)return player;
 }
 return null;
}
function playerHits(row:ChallengeArchiveItem):any[]|null {
 const rec=row.record;
 const list=[rec?.payload?.entries,rec?.payload?.state?.hits,rec?.decoded?.entries,rec?.decoded?.state?.hits,rec?.resume?.state?.log]
  .find(Array.isArray);
 if(!Array.isArray(list)||!list.length)return null;
 // If identities are absent, never attribute a multiplayer log to a player.
 const rowId=String(row.playerId||'');
 if(!rowId)return null;
 const people=rec?.summary?.perPlayer||rec?.payload?.summary?.perPlayer||rec?.players||[];
 const isSolo=Array.isArray(people)&&people.length===1;
 return list.filter((entry:any)=>{
  const id=String(entry?.pid??entry?.playerId??entry?.profileId??'');
  return id?id===rowId:isSolo;
 });
}
export function buildChallengeImpactDetails(items:readonly ChallengeArchiveItem[]){
 const byZone=emptyZones();
 const sectors:Array<ChallengeSectorDetail>=Array.from({length:20},(_,i)=>({sector:i+1,total:0,G:0,P:0,S:0,D:0,T:0}));
 let logSessions=0,summarySessions=0,unavailableSessions=0,documentedSectors=0;
 const completed=items.filter(row=>row.status==='finished');
 for(const row of completed){
  const hits=playerHits(row);
  if(hits?.length){
   logSessions++;
   for(const hit of hits){
    const zone=zoneOf(hit?.zone??hit?.hit);
    if(!zone)continue;
    byZone[zone]++;
    const sector=Number(hit?.segment);
    if(sector>=1&&sector<=20&&Number.isInteger(sector)&&['G','P','S','D','T'].includes(zone)){
     const ref=sectors[sector-1]!;
     ref[zone as 'G'|'P'|'S'|'D'|'T']++;
     ref.total++;
     documentedSectors++;
    }
   }
   continue;
  }
  // Historically, only an aggregate hitSummary may be available.
  const summary=getPlayerSummary(row)?.hitSummary;
  if(summary&&typeof summary==='object'&&['S','D','T','SBull','DBull','MISS'].some(k=>number(summary[k])>0)){
   summarySessions++;
   for(const [legacy,zone] of [['S','S'],['D','D'],['T','T'],['SBull','BULL25'],['DBull','DBULL50'],['MISS','MISS']] as const){
    byZone[zone]+=number(summary[legacy]);
   }
  }else unavailableSessions++;
 }
 const total=zones.reduce((sum,zone)=>sum+byZone[zone],0);
 return {
  byZone,sectors,total,documentedSectors,logSessions,summarySessions,unavailableSessions,
  documentedSessions:logSessions+summarySessions,finishedSessions:completed.length,
  topSectors:sectors.filter(row=>row.total>0).sort((a,b)=>b.total-a.total||b.sector-a.sector),
 };
}
export type ChallengeFormComparison={latestCount:number;previousCount:number;goal:'min'|'max';unit:'fl.'|'pts';
 latest:number;previous:number;delta:number;accuracyLatest:number;accuracyPrevious:number;accuracyDelta:number;
 improved:boolean;};
/** Compare only complete, identical configurations and real scores/darts. */
export function buildChallengeFormComparison(items:readonly ChallengeArchiveItem[],goal:'min'|'max'):ChallengeFormComparison|null {
 const relevant=items.filter(row=>row.status==='finished'&&(goal!=='min'||row.darts>0))
  .slice().sort((a,b)=>a.playedAt-b.playedAt||a.id.localeCompare(b.id));
 if(relevant.length<10||new Set(relevant.map(row=>row.configKey)).size!==1)return null;
 const recent=relevant.slice(-5),prior=relevant.slice(-10,-5);
 const avg=(list:readonly number[])=>list.reduce((sum,v)=>sum+v,0)/list.length;
 const metric=(row:ChallengeArchiveItem)=>goal==='min'?row.darts:row.score;
 const latest=avg(recent.map(metric)),previous=avg(prior.map(metric));
 const accuracyLatest=avg(recent.map(row=>row.accuracy));
 const accuracyPrevious=avg(prior.map(row=>row.accuracy));
 const delta=Math.round((latest-previous)*10)/10;
 return {latestCount:5,previousCount:5,goal,unit:goal==='min'?'fl.':'pts',latest,previous,delta,
  accuracyLatest,accuracyPrevious,accuracyDelta:Math.round((accuracyLatest-accuracyPrevious)*10)/10,
  improved:goal==='min'?delta<0:delta>0};
}
