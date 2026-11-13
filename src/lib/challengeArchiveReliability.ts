/** Read-only quality audit for the Challenge stats/records derived from History V4.
 * Never mutate, repair or guess absent match telemetry here.
 */
import type {ChallengeArchiveItem} from './challengeArchiveCore.ts';
import {arcadeRuleDetails} from './challengeArcadeEngine.ts';
import {getChallengeDartEvidence} from './challengeDartEvidence.ts';

export type ChallengeArchiveReliability={
 finished:number;withJournal:number;summaryOnly:number;withoutDetail:number;recoveredDarts:number;
 unknownConfig:number;missingDates:number;missingDartsForMinimum:number;missingScores:number;
 dartCountConflicts:number;inProgress:number;
};
const str=(value:unknown)=>String(value??'').trim();
const normalizeId=(value:unknown)=>str(value).replace(/^online:/,'');
function hasPlayerSummary(rec:any,playerId:string):boolean{
 const candidates=[rec?.summary?.perPlayer,rec?.payload?.summary?.perPlayer,rec?.payload?.stats?.players,rec?.decoded?.summary?.perPlayer];
 return candidates.some(arr=>Array.isArray(arr)&&arr.some((p:any)=>[p?.id,p?.playerId,p?.profileId,p?.userId,p?.onlineUserId].some(id=>id!=null&&normalizeId(id)===normalizeId(playerId))));
}
function playerDartsInJournal(item:ChallengeArchiveItem):number|null{
 return getChallengeDartEvidence(item.record,item.playerId)?.darts??null;
}
export function buildChallengeArchiveReliability(items:readonly ChallengeArchiveItem[]):ChallengeArchiveReliability{
 const result:ChallengeArchiveReliability={finished:0,withJournal:0,summaryOnly:0,withoutDetail:0,
  unknownConfig:0,missingDates:0,missingDartsForMinimum:0,missingScores:0,dartCountConflicts:0,inProgress:0,recoveredDarts:0};
 for(const item of items){
  if(item.status==='in_progress'){result.inProgress++;continue;}
  result.finished++;
  if(item.dartsRecoveredFromJournal)result.recoveredDarts++;
  if(item.configLabel==='CONFIGURATION NON DOCUMENTÉE'||item.configKey.includes('configuration-inconnue:'))result.unknownConfig++;
  if(!item.playedAt)result.missingDates++;
  if(item.scoreKnown===false)result.missingScores++;
  const isMinimum=item.modeId.startsWith('arcade:')&&['path','team'].includes(arcadeRuleDetails({catalogChallengeId:item.modeId.slice(7),catalogLine:20,catalogRounds:5,catalogVariant:'classic'}).kind);
  if(isMinimum&&item.darts<=0)result.missingDartsForMinimum++;
  const journalDarts=playerDartsInJournal(item);
  if(journalDarts!==null){
   result.withJournal++;
   if(item.darts>0&&item.darts!==journalDarts)result.dartCountConflicts++;
  }else if(hasPlayerSummary(item.record,item.playerId))result.summaryOnly++;
  else result.withoutDetail++;
 }
 return result;
}
