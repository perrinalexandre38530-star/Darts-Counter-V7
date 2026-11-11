/** CHALLENGE archive, stored in the canonical History V4 pipeline.
 * Display filtering MUST NOT delete these records or change their statistics.
 * The normalized read model is shared by the game chooser and Stats > Training.
 */
import { CHALLENGE_MODE_OPTIONS } from './challengeUnifiedCatalog.ts';
import { arcadeRuleDetails } from './challengeArcadeEngine.ts';

export type ChallengeArchiveItem = {
  id:string; modeId:string; title:string; configKey:string; configLabel:string;
  playedAt:number; score:number; darts:number; successful:number; accuracy:number; bestStreak:number;
  status:'finished'|'in_progress'; playerId:string; playerName:string;
  record:any;
};
export type ChallengeArchiveSummary = {
  total:number; completed:number; inProgress:number; totalDarts:number; averageAccuracy:number;
  latest:ChallengeArchiveItem[]; ongoing:ChallengeArchiveItem[];
  byConfig:Array<{key:string;label:string;plays:number;best:ChallengeArchiveItem;latest:ChallengeArchiveItem;goal:'min'|'max'}>;
  all:ChallengeArchiveItem[];
};

const txt=(v:unknown)=>String(v??'').trim();
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0};
const norm=(v:unknown)=>txt(v).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const isArray=(v:unknown):v is any[]=>Array.isArray(v);
const archiveIds=new Set(CHALLENGE_MODE_OPTIONS.map(mode=>mode.id));
const challengeKindTokens=new Set(['challenge','challenge_play','challenge_solo','challenge_multi','darts_challenge']);

/** Only actual Challenge games, never another game merely named "Challenge". */
export function isChallengeMatchRecord(rec:any):boolean{
  const modes=[rec?.kind,rec?.mode,rec?.game?.mode,rec?.summary?.mode,rec?.summary?.kind,
    rec?.payload?.mode,rec?.payload?.kind,rec?.decoded?.mode,rec?.decoded?.kind];
  return modes.some(value=>challengeKindTokens.has(norm(value))) ||
    (norm(rec?.game?.exerciseType)==='arcade' && !!rec?.game?.catalogChallengeId);
}
export function challengeRecordModeId(rec:any):string{
  const payload=rec?.payload||rec?.decoded||{};
  const cfg=payload?.config||rec?.resume?.config||{};
  const arcadeId=txt(cfg.catalogChallengeId||rec?.game?.catalogChallengeId);
  if(arcadeId && archiveIds.has('arcade:'+arcadeId))return 'arcade:'+arcadeId;
  const raw=norm(cfg.exerciseType||rec?.game?.exerciseType||rec?.summary?.exerciseType);
  if(archiveIds.has(raw))return raw;
  const key=norm(rec?.game?.leaderboardTarget||payload?.config?.leaderboardTarget||rec?.summary?.leaderboardTarget);
  if(key.startsWith('clock-'))return 'clock';
  if(key.startsWith('grouping-'))return 'grouping';
  if(key.startsWith('halfit-'))return 'half-it';
  if(key.startsWith('doubles8-'))return 'doubles8';
  if(key.startsWith('sequence-'))return 'sequence';
  if(key.startsWith('jdc-'))return 'jdc';
  return 'classic';
}
export function isFinishedChallengeRecord(rec:any):boolean{
 const status=norm(rec?.status||rec?.payload?.status||rec?.summary?.status);
 if(status==='in_progress'||status==='playing'||status==='pending')return false;
 return ['finished','completed','complete','done'].includes(status) || rec?.summary?.finished===true || rec?.payload?.summary?.finished===true;
}
export function challengeRecordConfigKey(rec:any):string{
  const cfg=rec?.payload?.config||rec?.decoded?.config||rec?.resume?.config||{};
  const mode=challengeRecordModeId(rec);
  const official=txt(cfg.leaderboardTarget||rec?.game?.leaderboardTarget||rec?.summary?.leaderboardTarget);
  // A target alone is NOT a complete configuration: classic 20 with 5 vs 30 rounds
  // or SO vs DO must never share a personal record. Arcade seed/steps also matter.
  const relevant=mode.startsWith('arcade:')
    ?[cfg.catalogLine,cfg.catalogVariant,cfg.catalogRounds,cfg.catalogTarget,cfg.catalogMin,cfg.catalogMax,cfg.catalogLives,cfg.catalogStep]
    :[cfg.target||rec?.game?.target,cfg.rule||rec?.game?.rule,cfg.visits||rec?.game?.visits,cfg.clockIncludeBull,cfg.clockScoreMode,cfg.halfItStartScore,cfg.sequenceObjectives,cfg.groupingMin,cfg.groupingMax,cfg.groupingHits,cfg.doublesTargets,cfg.doublesBonusTarget];
  // Preserve all previous keys for default/legacy recordings. If an arcade seed
  // or an opponent-assigned route actually changes the challenge, differentiate it.
  if(mode.startsWith('arcade:')){
    const seed=num(cfg.catalogSeed);
    if(seed!==0&&seed!==1)relevant.push({seed});
    const assignments=cfg.catalogAssignments;
    if(assignments&&typeof assignments==='object'&&Object.keys(assignments).length){
      // Object keys are normalized so save/load order never splits a record group.
      relevant.push({assignments:Object.fromEntries(Object.entries(assignments).sort(([a],[b])=>a.localeCompare(b)))});
    }
  }
  return mode+':'+official+':'+JSON.stringify(relevant);
}
export function challengeConfigDisplay(rec:any):string{
 const cfg=rec?.payload?.config||rec?.decoded?.config||rec?.resume?.config||{};
 const mode=challengeRecordModeId(rec);
 if(mode.startsWith('arcade:')){
  const fields=[cfg.catalogVariant&&cfg.catalogVariant!=='classic'?txt(cfg.catalogVariant).toUpperCase():'CLASSIQUE',cfg.catalogLine?'N° '+cfg.catalogLine:'',cfg.catalogRounds?cfg.catalogRounds+' OBJECTIFS':''];
  return fields.filter(Boolean).join(' · ');
 }
 const target=txt(cfg.target||rec?.game?.target||rec?.summary?.target||'20');
 const visits=num(cfg.visits||rec?.game?.visits||rec?.summary?.visits);
 const rule=txt(cfg.rule||rec?.game?.rule||'all').toUpperCase();
 return [target.toUpperCase(),rule,visits?visits+' TOURS':''].filter(Boolean).join(' · ');
}

function playerRows(rec:any):any[]{
 const arrays=[rec?.summary?.perPlayer,rec?.summary?.rankings,rec?.payload?.summary?.perPlayer,
  rec?.payload?.summary?.rankings,rec?.payload?.stats?.players,rec?.payload?.finalPlayers,
  rec?.decoded?.summary?.perPlayer,rec?.decoded?.stats?.players];
 return (arrays.find(isArray)||[]) as any[];
}
function chosenPlayer(rec:any,id:string,name:string):any|null{
 const rows=playerRows(rec);
 const canonical=txt(id).replace(/^online:/,'');
 if(canonical){
  const matched=rows.find(p=>[p?.id,p?.profileId,p?.playerId,p?.onlineUserId,p?.userId].some(v=>txt(v).replace(/^online:/,'')===canonical));
  if(matched)return matched;
  const roster=isArray(rec?.players)?rec.players:[];
  // Legacy backup may only have an identity in the lightweight roster.
  if(roster.some((p:any)=>[p?.id,p?.userId,p?.onlineUserId].some(v=>txt(v).replace(/^online:/,'')===canonical))){
   return rows.find(p=>norm(p?.name)===norm(roster.find((x:any)=>txt(x?.id)===canonical)?.name))||{id:canonical,name};
  }
  // No reliable identity: never join two different profiles by display name.
  return null;
 }
 if(name){
  const matched=rows.filter(p=>norm(p?.name||p?.displayName)===norm(name));
  return matched.length===1?matched[0]:null;
 }
 return rows[0]||(isArray(rec?.players)?rec.players[0]:null)||null;
}
export function challengeArchiveItems(records:readonly any[],options?:{modeId?:string|null;playerId?:string|null;playerName?:string|null}):ChallengeArchiveItem[]{
 const modeFilter=txt(options?.modeId);
 const playerId=txt(options?.playerId),playerName=txt(options?.playerName);
 const used=new Set<string>();
 const out:ChallengeArchiveItem[]=[];
 for(const rec of records){
  if(!isChallengeMatchRecord(rec))continue;
  const id=txt(rec?.matchId||rec?.id||rec?.resumeId);
  if(!id||used.has(id))continue;
  used.add(id);
  const modeId=challengeRecordModeId(rec);
  if(modeFilter&&modeId!==modeFilter)continue;
  const player=chosenPlayer(rec,playerId,playerName);
  if((playerId||playerName)&&!player)continue;
  const status=isFinishedChallengeRecord(rec)?'finished':'in_progress';
  const score=num(player?.score??player?.points??player?.special?.score??rec?.summary?.finalScores?.[playerId]);
  const darts=num(player?.darts??player?.dartsThrown??player?.stats?.darts??rec?.summary?.darts);
  const successes=num(player?.hitCount??player?.successful??player?.stats?.hitCount);
  const accuracy=num(player?.accuracy??player?.successRate??player?.stats?.accuracy) || (darts?Math.round(successes/darts*1000)/10:0);
  const entry=CHALLENGE_MODE_OPTIONS.find(mode=>mode.id===modeId);
  out.push({id,modeId,title:entry?.title||modeId,configKey:challengeRecordConfigKey(rec),configLabel:challengeConfigDisplay(rec),
   playedAt:num(rec?.finishedAt||rec?.updatedAt||rec?.createdAt),score,darts,successful:successes,accuracy,
   bestStreak:num(player?.bestStreak??player?.stats?.bestStreak),status,
   playerId:txt(player?.id||playerId),playerName:txt(player?.name||playerName),record:rec});
 }
 return out.sort((a,b)=>b.playedAt-a.playedAt);
}
const lowerBetter=(modeId:string)=>{
 if(!modeId.startsWith('arcade:'))return false;
 const id=modeId.slice(7);
 return ['path','team'].includes(arcadeRuleDetails({catalogChallengeId:id,catalogLine:20,catalogRounds:5,catalogVariant:'classic'}).kind);
};
export function summarizeChallengeArchive(items:ChallengeArchiveItem[]):ChallengeArchiveSummary{
 const completed=items.filter(item=>item.status==='finished');
 const ongoing=items.filter(item=>item.status==='in_progress');
 const configurations=new Map<string,{key:string;label:string;plays:number;best:ChallengeArchiveItem;latest:ChallengeArchiveItem;goal:'min'|'max'}>();
 for(const item of completed){
  const goal=lowerBetter(item.modeId)?'min':'max';
  const current=configurations.get(item.configKey);
  if(!current){configurations.set(item.configKey,{key:item.configKey,label:item.configLabel,plays:1,best:item,latest:item,goal});continue;}
  current.plays++;
  if((goal==='min' && item.darts>0 && (!current.best.darts||item.darts<current.best.darts)) ||
     (goal==='max' && item.score>current.best.score))current.best=item;
  if(item.playedAt>current.latest.playedAt)current.latest=item;
 }
 const darts=completed.reduce((sum,row)=>sum+row.darts,0);
 const weightedAccuracy=darts?completed.reduce((sum,row)=>sum+row.accuracy*row.darts,0)/darts:0;
 return {total:items.length,completed:completed.length,inProgress:ongoing.length,totalDarts:darts,
  averageAccuracy:completed.length?Math.round((darts?weightedAccuracy:completed.reduce((sum,row)=>sum+row.accuracy,0)/completed.length)*10)/10:0,
  latest:completed.slice(0,8),ongoing:ongoing.slice(0,20),
  byConfig:[...configurations.values()].sort((a,b)=>b.latest.playedAt-a.latest.playedAt),all:items};
}

