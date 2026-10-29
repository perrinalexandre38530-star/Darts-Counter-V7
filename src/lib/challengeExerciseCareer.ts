import {
  challengeExerciseType,
  challengeObjectiveKeyTarget,
  objectiveLabel,
  type ChallengeExerciseAnalytics,
  type ChallengeExerciseConfigLike,
} from './challengeExercises.ts';

export type ChallengeCareerIdentity={
  ids?:string[];
  onlineUserIds?:string[];
  teamIds?:string[];
  name?:string;
};

export type ChallengeCareerObjective={
  objective:string;
  label:string;
  attempts:number;
  validated:number;
  perfect:number;
  points:number;
  cuts:number;
  validationRate:number;
};

export type ChallengeCareerSector={sector:number;hits:number};

export type ChallengeExerciseCareer={
  matches:number;
  firstPlayedAt:number;
  lastPlayedAt:number;
  bestScore:number;
  averageScore:number;
  averageValidationRate:number;
  bestValidationRate:number;
  bestValidatedVisitStreak:number;
  bestPerfectVisitStreak:number;
  perfectVisits:number;
  halfItCuts:number;
  groupingDoublets:number;
  groupingTriplets:number;
  groupingPoints:number;
  objectives:ChallengeCareerObjective[];
  strongestObjective:ChallengeCareerObjective|null;
  weakestObjective:ChallengeCareerObjective|null;
  dangerObjective:ChallengeCareerObjective|null;
  groupingSectors:ChallengeCareerSector[];
  topGroupingSector:ChallengeCareerSector|null;
  recent:Array<{playedAt:number;score:number;validationRate:number}>;
  trendDelta:number;
};

export type ChallengeCareerCurrentSession={
  matchId?:string;
  playedAt?:number;
  score:number;
  exerciseStats:ChallengeExerciseAnalytics;
};

const norm=(value:any)=>String(value??'').trim();
const normName=(value:any)=>norm(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const uniq=(values:any[])=>Array.from(new Set(values.map(norm).filter(Boolean)));
const finite=(value:any,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};

export function challengeCareerConfigKey(cfg:ChallengeExerciseConfigLike):string{
  return `${challengeObjectiveKeyTarget(cfg)}|v${Math.max(1,Math.round(finite(cfg.visits,1)))}`;
}

function recordConfigKey(record:any):string{
  const payload=record?.decoded||record?.payload||record?.resume?.livePayload||{};
  const cfg=payload?.config||record?.resume?.config||{};
  const stored=norm(cfg?.leaderboardTarget||record?.game?.leaderboardTarget||record?.summary?.leaderboardTarget);
  const visits=Math.max(1,Math.round(finite(cfg?.visits??record?.game?.visits??record?.summary?.visits,1)));
  if(stored)return `${stored}|v${visits}`;
  if(cfg&&Object.keys(cfg).length)return challengeCareerConfigKey(cfg as ChallengeExerciseConfigLike);
  return '';
}

function recordPlayers(record:any):any[]{
  const payload=record?.decoded||record?.payload||record?.resume?.livePayload||{};
  const candidates=[payload?.stats?.players,payload?.players,payload?.finalPlayers,record?.summary?.rankings,record?.summary?.perPlayer,record?.players];
  for(const value of candidates)if(Array.isArray(value)&&value.length)return value;
  return [];
}

function rowIdentity(row:any){
  return {
    ids:uniq([row?.id,row?.profileId,row?.profile_id,row?.participantId,row?.participant_id,row?.playerId,row?.player_id]),
    onlineUserIds:uniq([row?.onlineUserId,row?.online_user_id,row?.userId,row?.user_id,row?.linkedUserId,row?.linked_user_id]),
    teamIds:uniq([row?.teamId,row?.team_id]),
    name:normName(row?.name||row?.displayName||row?.nickname),
  };
}

function intersects(a:string[],b:string[]){
  if(!a.length||!b.length)return false;
  const set=new Set(a);return b.some(value=>set.has(value));
}

function matchesIdentity(row:any,identity:ChallengeCareerIdentity):boolean{
  const candidate=rowIdentity(row);
  const ids=uniq(identity.ids||[]),online=uniq(identity.onlineUserIds||[]),teams=uniq(identity.teamIds||[]);
  if(candidate.onlineUserIds.length&&online.length)return intersects(candidate.onlineUserIds,online);
  if(candidate.teamIds.length&&teams.length)return intersects(candidate.teamIds,teams);
  if(intersects(candidate.onlineUserIds,online))return true;
  if(intersects(candidate.teamIds,teams))return true;
  if(intersects(candidate.ids,ids))return true;
  const stableCandidate=candidate.onlineUserIds.length||candidate.teamIds.length||candidate.ids.length;
  const stableIdentity=online.length||teams.length||ids.length;
  if(stableCandidate&&stableIdentity)return false;
  return Boolean(candidate.name&&candidate.name===normName(identity.name));
}

function rowExerciseStats(row:any):ChallengeExerciseAnalytics|null{
  const stats=row?.exerciseStats||row?.special?.exerciseStats||row?.stats?.exerciseStats||null;
  if(!stats||typeof stats!=='object')return null;
  return stats as ChallengeExerciseAnalytics;
}

function rowScore(row:any):number{
  return finite(row?.score??row?.points??row?.bestScore??row?.best,0);
}

function recordPlayedAt(record:any):number{
  return finite(record?.finishedAt??record?.updatedAt??record?.createdAt??record?.updated_at??record?.created_at,0);
}

function statusFinished(record:any):boolean{
  const raw=norm(record?.status).toLowerCase();
  if(raw==='finished'||raw==='done'||raw==='ended'||raw==='match_end')return true;
  return record?.summary?.finished===true||record?.payload?.summary?.finished===true;
}

function mergeSession(target:any,session:{playedAt:number;score:number;stats:ChallengeExerciseAnalytics}){
  const stats=session.stats;
  target.matches++;
  target.firstPlayedAt=target.firstPlayedAt?Math.min(target.firstPlayedAt,session.playedAt||target.firstPlayedAt):session.playedAt;
  target.lastPlayedAt=Math.max(target.lastPlayedAt,session.playedAt||0);
  target.scoreTotal+=session.score;
  target.bestScore=Math.max(target.bestScore,session.score);
  target.validationTotal+=finite(stats.validationRate,0);
  target.bestValidationRate=Math.max(target.bestValidationRate,finite(stats.validationRate,0));
  target.bestValidatedVisitStreak=Math.max(target.bestValidatedVisitStreak,finite(stats.bestValidatedVisitStreak,0));
  target.bestPerfectVisitStreak=Math.max(target.bestPerfectVisitStreak,finite(stats.bestPerfectVisitStreak,0));
  target.perfectVisits+=finite(stats.perfectVisits,0);
  target.halfItCuts+=finite(stats.halfItCuts,0);
  target.groupingDoublets+=finite(stats.groupingDoublets,0);
  target.groupingTriplets+=finite(stats.groupingTriplets,0);
  target.groupingPoints+=finite(stats.groupingPoints,0);
  for(const [objective,value] of Object.entries(stats.objectiveStats||{})){
    const row:any=value||{};
    const out=target.objectives[objective]||(target.objectives[objective]={objective,attempts:0,validated:0,perfect:0,points:0,cuts:0});
    out.attempts+=finite(row.attempts,0);out.validated+=finite(row.validated,0);out.perfect+=finite(row.perfect,0);out.points+=finite(row.points,0);
  }
  for(const visit of stats.visitStats||[]){
    if(!visit?.halfItCut)continue;
    const objective=norm(visit.objective);if(!objective)continue;
    const out=target.objectives[objective]||(target.objectives[objective]={objective,attempts:0,validated:0,perfect:0,points:0,cuts:0});
    out.cuts++;
  }
  for(const [sector,hits] of Object.entries(stats.groupingSectorHits||{}))target.groupingSectors[sector]=(target.groupingSectors[sector]||0)+finite(hits,0);
  target.recent.push({playedAt:session.playedAt,score:session.score,validationRate:finite(stats.validationRate,0)});
}

export function buildChallengeExerciseCareer(records:any[],cfg:ChallengeExerciseConfigLike,identity:ChallengeCareerIdentity,current?:ChallengeCareerCurrentSession|null):ChallengeExerciseCareer{
  const wantedType=challengeExerciseType(cfg);
  const wantedKey=challengeCareerConfigKey(cfg);
  const seen=new Set<string>();
  const aggregate:any={matches:0,firstPlayedAt:0,lastPlayedAt:0,bestScore:0,scoreTotal:0,validationTotal:0,bestValidationRate:0,bestValidatedVisitStreak:0,bestPerfectVisitStreak:0,perfectVisits:0,halfItCuts:0,groupingDoublets:0,groupingTriplets:0,groupingPoints:0,objectives:{},groupingSectors:{},recent:[]};

  for(const record of Array.isArray(records)?records:[]){
    if(!record||String(record?.kind||record?.mode||record?.game?.mode||'').toLowerCase()!=='challenge')continue;
    if(!statusFinished(record))continue;
    if(recordConfigKey(record)!==wantedKey)continue;
    const id=norm(record?.matchId||record?.id);if(id&&seen.has(id))continue;
    const payload=record?.decoded||record?.payload||record?.resume?.livePayload||{};
    const recordType=challengeExerciseType((payload?.config||record?.resume?.config||{exerciseType:record?.game?.exerciseType}) as ChallengeExerciseConfigLike);
    if(recordType!==wantedType)continue;
    const row=recordPlayers(record).find(player=>matchesIdentity(player,identity));
    if(!row)continue;
    const stats=rowExerciseStats(row);if(!stats)continue;
    if(id)seen.add(id);
    mergeSession(aggregate,{playedAt:recordPlayedAt(record),score:rowScore(row),stats});
  }

  if(current){
    const id=norm(current.matchId);
    if(!id||!seen.has(id))mergeSession(aggregate,{playedAt:finite(current.playedAt,Date.now()),score:finite(current.score,0),stats:current.exerciseStats});
  }

  const objectives:ChallengeCareerObjective[]=Object.values(aggregate.objectives).map((row:any)=>({
    objective:String(row.objective),label:objectiveLabel(String(row.objective),cfg),attempts:finite(row.attempts,0),validated:finite(row.validated,0),perfect:finite(row.perfect,0),points:finite(row.points,0),cuts:finite(row.cuts,0),validationRate:row.attempts?Math.round((finite(row.validated,0)/finite(row.attempts,1))*1000)/10:0,
  }));
  const attempted=objectives.filter(row=>row.attempts>0);
  const strengthCandidates=wantedType==='doubles8'?attempted.filter(row=>!row.objective.startsWith('bonus-double:')):attempted;
  const strongestObjective=strengthCandidates.slice().sort((a,b)=>b.validationRate-a.validationRate||b.validated-a.validated||b.points-a.points)[0]||null;
  const weakestObjective=strengthCandidates.slice().sort((a,b)=>a.validationRate-b.validationRate||b.attempts-a.attempts||a.points-b.points)[0]||null;
  const dangerObjective=strengthCandidates.slice().sort((a,b)=>b.cuts-a.cuts||a.validationRate-b.validationRate||b.attempts-a.attempts)[0]||null;
  const groupingSectors:ChallengeCareerSector[]=Object.entries(aggregate.groupingSectors).map(([sector,hits])=>({sector:Number(sector),hits:finite(hits,0)})).filter(row=>row.sector>=1&&row.sector<=20).sort((a,b)=>b.hits-a.hits||b.sector-a.sector);
  const recent=aggregate.recent.sort((a:any,b:any)=>a.playedAt-b.playedAt).slice(-6);
  const trendDelta=recent.length>=2?Math.round((recent[recent.length-1].validationRate-recent[recent.length-2].validationRate)*10)/10:0;

  return {
    matches:aggregate.matches,
    firstPlayedAt:aggregate.firstPlayedAt,
    lastPlayedAt:aggregate.lastPlayedAt,
    bestScore:aggregate.bestScore,
    averageScore:aggregate.matches?Math.round((aggregate.scoreTotal/aggregate.matches)*10)/10:0,
    averageValidationRate:aggregate.matches?Math.round((aggregate.validationTotal/aggregate.matches)*10)/10:0,
    bestValidationRate:Math.round(aggregate.bestValidationRate*10)/10,
    bestValidatedVisitStreak:aggregate.bestValidatedVisitStreak,
    bestPerfectVisitStreak:aggregate.bestPerfectVisitStreak,
    perfectVisits:aggregate.perfectVisits,
    halfItCuts:aggregate.halfItCuts,
    groupingDoublets:aggregate.groupingDoublets,
    groupingTriplets:aggregate.groupingTriplets,
    groupingPoints:aggregate.groupingPoints,
    objectives,
    strongestObjective,
    weakestObjective,
    dangerObjective,
    groupingSectors,
    topGroupingSector:groupingSectors[0]||null,
    recent,
    trendDelta,
  };
}
