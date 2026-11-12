/** CHALLENGE — diagnostic de conformité des parties History V4, sans mutation.
 * Sortie volontairement agrégée : aucune identité, date de partie, ID de match,
 * configuration libre, journal de fléchettes ou contenu de sauvegarde n'est exporté.
 */
import type { ChallengeArchiveItem } from './challengeArchiveCore.ts';
import { buildChallengeArchiveReliability } from './challengeArchiveReliability.ts';
import { arcadeRuleDetails } from './challengeArcadeEngine.ts';

export type ChallengeAuditProblem = {
 code: 'NO_CONFIG'|'NO_DATE'|'NO_SCORE'|'NO_DARTS'|'JOURNAL_CONFLICT'|'SUMMARY_ONLY'|'NO_DETAIL';
 count:number;
 message:string;
 severity:'warning'|'info';
};
export type ChallengeArchiveAudit = {
 schema:'mss-challenge-audit-v1';
 scope:'selected-challenge-and-profile';
 total:number;finished:number;inProgress:number;recordEligible:number;notEligible:number;duplicateSnapshots:number;
 journalVerified:number;summaryOnly:number;withoutDetail:number;
 problems:ChallengeAuditProblem[];
 eligibleByMode:Array<{modeId:string;finished:number;eligible:number;goal:'min'|'max'}>;
};
const goalFor=(modeId:string):'min'|'max'=>{
 if(!modeId.startsWith('arcade:'))return 'max';
 const kind=arcadeRuleDetails({catalogChallengeId:modeId.slice(7),catalogLine:20,catalogRounds:5,catalogVariant:'classic'}).kind;
 return kind==='path'||kind==='team'?'min':'max';
};
const eligible=(row:ChallengeArchiveItem,goal:'min'|'max')=>row.status==='finished' &&
 (goal==='min'?row.dartsKnown!==false&&Number.isFinite(row.darts)&&row.darts>0:
 row.scoreKnown!==false&&Number.isFinite(row.score));

export function buildChallengeArchiveAudit(items:readonly ChallengeArchiveItem[],rawSnapshots:readonly any[]=[]):ChallengeArchiveAudit {
 const quality=buildChallengeArchiveReliability(items);
 const countsByMatch=new Map<string,number>();
 for(const row of rawSnapshots){
  const key=String(row?.matchId??row?.id??row?.resumeId??'').trim();
  if(key)countsByMatch.set(key,(countsByMatch.get(key)||0)+1);
 }
 const duplicateSnapshots=[...countsByMatch.values()].reduce((sum,n)=>sum+Math.max(0,n-1),0);
 const counts=new Map<string,{modeId:string;finished:number;eligible:number;goal:'min'|'max'}>();
 for(const row of items){
  if(row.status!=='finished')continue;
  const goal=goalFor(row.modeId);
  const entry=counts.get(row.modeId)||{modeId:row.modeId,finished:0,eligible:0,goal};
  entry.finished++;
  if(eligible(row,goal))entry.eligible++;
  counts.set(row.modeId,entry);
 }
 const eligibleByMode=[...counts.values()].sort((a,b)=>a.modeId.localeCompare(b.modeId));
 const recordEligible=eligibleByMode.reduce((sum,row)=>sum+row.eligible,0);
 const problems:ChallengeAuditProblem[]=[];
 const add=(code:ChallengeAuditProblem['code'],count:number,message:string,severity:ChallengeAuditProblem['severity']='warning')=>{
  if(count>0)problems.push({code,count,message,severity});
 };
 add('NO_CONFIG',quality.unknownConfig,'Configuration non documentée : record isolé');
 add('NO_DATE',quality.missingDates,'Date absente : chronologie indisponible');
 add('NO_SCORE',quality.missingScores,'Score absent : aucun record de points inventé');
 add('NO_DARTS',quality.missingDartsForMinimum,'Nombre de fléchettes absent : record de parcours exclu');
 add('JOURNAL_CONFLICT',quality.dartCountConflicts,'Compteur de fléchettes différent du journal : à vérifier');
 add('SUMMARY_ONLY',quality.summaryOnly,'Ancienne partie avec résumé uniquement', 'info');
 add('NO_DETAIL',quality.withoutDetail,'Partie sans télémétrie détaillée', 'info');
 return {
  schema:'mss-challenge-audit-v1',scope:'selected-challenge-and-profile',
  total:items.length,finished:quality.finished,inProgress:quality.inProgress,
  recordEligible,notEligible:Math.max(0,quality.finished-recordEligible),duplicateSnapshots,
  journalVerified:quality.withJournal,summaryOnly:quality.summaryOnly,withoutDetail:quality.withoutDetail,
  problems,eligibleByMode,
 };
}
