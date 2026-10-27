export type ChallengeExerciseType='classic'|'clock'|'half-it'|'sequence'|'grouping'|'doubles8';
export type ChallengeScoreMode='challenge'|'real';
export type ChallengeObjectiveToken='1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'bull'|'any-double'|'any-triple';
export type ChallengeHit='S'|'D'|'T'|'25'|'50'|'MISS';

export type ChallengeExerciseConfigLike={
 target:string;
 rule:string;
 visits:number;
 exerciseType?:ChallengeExerciseType;
 clockIncludeBull?:boolean;
 clockScoreMode?:ChallengeScoreMode;
 halfItStartScore?:number;
 sequenceObjectives?:ChallengeObjectiveToken[];
 sequenceScoreMode?:ChallengeScoreMode;
 groupingMin?:number;
 groupingMax?:number;
 groupingHits?:2|3;
 doublesBonusTarget?:number;
 doublesTargets?:number[];
};

export type ChallengeEntryLike={hit:ChallengeHit;segment?:number|null};

export const DEFAULT_HALF_IT_SEQUENCE:ChallengeObjectiveToken[]=['15','16','any-double','17','18','any-triple','19','20','bull'];
export const DEFAULT_CUSTOM_SEQUENCE:ChallengeObjectiveToken[]=['20','any-double','18','any-triple','bull'];
export const DOUBLES_8_TARGETS=[20,18,16,12,10,8,4,2] as const;

export function normalizedDoublesTargets(cfg?:Pick<ChallengeExerciseConfigLike,'doublesTargets'>|null):number[]{
 const raw=Array.isArray(cfg?.doublesTargets)?cfg!.doublesTargets:DOUBLES_8_TARGETS;
 const out:number[]=[];
 for(const value of raw){
  const n=clampSector(value,20);
  if(!out.includes(n))out.push(n);
 }
 return out.length?out:[...DOUBLES_8_TARGETS];
}

export function isDefaultDoublesTargets(values?:number[]|null):boolean{
 const list=Array.isArray(values)?values:[];
 return list.length===DOUBLES_8_TARGETS.length&&list.every((value,index)=>Number(value)===DOUBLES_8_TARGETS[index]);
}

const classicValues:Record<ChallengeHit,number>={S:1,D:2,T:3,'25':1,'50':2,MISS:0};
const clampSector=(value:any,fallback:number)=>Math.max(1,Math.min(20,Math.round(Number(value)||fallback)));

export function challengeExerciseType(cfg:ChallengeExerciseConfigLike):ChallengeExerciseType{
 const value=String(cfg?.exerciseType||'classic').toLowerCase();
 return value==='clock'||value==='half-it'||value==='sequence'||value==='grouping'||value==='doubles8'?value:'classic';
}

export function normalizedSequence(cfg:ChallengeExerciseConfigLike):ChallengeObjectiveToken[]{
 const type=challengeExerciseType(cfg);
 const source=Array.isArray(cfg.sequenceObjectives)&&cfg.sequenceObjectives.length?cfg.sequenceObjectives:(type==='half-it'?DEFAULT_HALF_IT_SEQUENCE:DEFAULT_CUSTOM_SEQUENCE);
 return source.filter((x):x is ChallengeObjectiveToken=>isChallengeObjectiveToken(x));
}

export function isChallengeObjectiveToken(value:any):value is ChallengeObjectiveToken{
 const v=String(value||'');
 return v==='bull'||v==='any-double'||v==='any-triple'||(/^([1-9]|1[0-9]|20)$/.test(v));
}

export function objectiveForVisit(cfg:ChallengeExerciseConfigLike,visitIndex:number):ChallengeObjectiveToken|string{
 const type=challengeExerciseType(cfg);
 if(type==='clock'){
  if(visitIndex<20)return String(visitIndex+1) as ChallengeObjectiveToken;
  return cfg.clockIncludeBull?'bull':'20';
 }
 if(type==='half-it'||type==='sequence'){
  const sequence=normalizedSequence(cfg);
  return sequence[Math.max(0,Math.min(sequence.length-1,visitIndex))]||'20';
 }
 if(type==='grouping')return `group:${clampSector(cfg.groupingMin,15)}-${clampSector(cfg.groupingMax,20)}`;
 if(type==='doubles8'){
  const targets=normalizedDoublesTargets(cfg);
  const bonusVisitIndex=targets.length*3;
  if(visitIndex>=bonusVisitIndex)return `bonus-double:${clampSector(cfg.doublesBonusTarget,20)}`;
  const target=targets[Math.max(0,Math.min(targets.length-1,Math.floor(visitIndex/3)))];
  return `double:${target}`;
 }
 return String(cfg.target||'20');
}

export function objectiveLabel(objective:string,cfg?:ChallengeExerciseConfigLike):string{
 if(objective==='any-double')return 'DOUBLE LIBRE';
 if(objective==='any-triple')return 'TRIPLE LIBRE';
 if(objective==='bull'||objective==='bull25'||objective==='bull50')return 'BULL';
 if(objective.startsWith('bonus-double:'))return `BONUS D${clampSector(objective.split(':')[1],20)}`;
 if(objective.startsWith('double:'))return `D${clampSector(objective.split(':')[1],20)}`;
 if(objective.startsWith('group:')){
  const min=clampSector(cfg?.groupingMin,15),max=clampSector(cfg?.groupingMax,20),hits=Math.max(2,Math.min(3,Number(cfg?.groupingHits||2)));
  return `${Math.min(min,max)}–${Math.max(min,max)} · ${hits} MÊME SECTEUR`;
 }
 return objective;
}

export function objectiveBoardKey(objective:string,cfg?:ChallengeExerciseConfigLike):string{
 if(objective.startsWith('group:'))return String(clampSector(cfg?.groupingMax,20));
 if(objective.startsWith('bonus-double:')||objective.startsWith('double:'))return String(clampSector(objective.split(':')[1],20));
 if(objective==='bull25'||objective==='bull50')return 'bull';
 return objective;
}

export function exerciseTitle(cfg:ChallengeExerciseConfigLike):string{
 switch(challengeExerciseType(cfg)){
  case 'clock':return 'HORLOGE 1 → 20';
  case 'half-it':return 'HALF-IT';
  case 'sequence':return 'SÉQUENCE';
  case 'grouping':return 'GROUPEMENT';
  case 'doubles8':{const targets=normalizedDoublesTargets(cfg);return isDefaultDoublesTargets(targets)?'8 DOUBLES · 9 FLÉCHETTES':`${targets.length} DOUBLE${targets.length>1?'S':''} PERSONNALISÉ${targets.length>1?'S':''}`;}
  default:return 'CIBLE FIXE';
 }
}

export function challengeObjectiveKeyTarget(cfg:ChallengeExerciseConfigLike):string{
 const type=challengeExerciseType(cfg);
 if(type==='classic')return String(cfg.target||'20');
 if(type==='clock')return `clock-${cfg.clockScoreMode==='real'?'real':'hits'}-${cfg.clockIncludeBull?'bull':'20'}`;
 if(type==='half-it')return `halfit-${Math.max(0,Math.round(Number(cfg.halfItStartScore??40)||0))}-${normalizedSequence(cfg).join('.')}`;
 if(type==='sequence')return `sequence-${cfg.sequenceScoreMode==='challenge'?'hits':'real'}-${normalizedSequence(cfg).join('.')}`;
 if(type==='doubles8'){
  const targets=normalizedDoublesTargets(cfg);
  const bonus=clampSector(cfg.doublesBonusTarget,20);
  return isDefaultDoublesTargets(targets)?`doubles8-bonus-d${bonus}`:`doubles8-custom-${targets.join('.')}-bonus-d${bonus}`;
 }
 const a=clampSector(cfg.groupingMin,15),b=clampSector(cfg.groupingMax,20),hits=Math.max(2,Math.min(3,Number(cfg.groupingHits||2)));
 return `grouping-${Math.min(a,b)}-${Math.max(a,b)}-x${hits}`;
}

export function challengeOnlineTargetLabel(value:string):string{
 if(value.startsWith('clock-'))return 'HORLOGE';
 if(value.startsWith('halfit-'))return 'HALF-IT';
 if(value.startsWith('sequence-'))return 'SÉQUENCE';
 if(value.startsWith('grouping-'))return 'GROUPEMENT';
 if(value.startsWith('doubles8-'))return '8 DOUBLES';
 if(value==='any-double')return 'DOUBLES';
 if(value==='any-triple')return 'TRIPLES';
 if(value==='bull'||value==='bull25'||value==='bull50')return 'BULL';
 return value.toUpperCase();
}

export function classicHitAllowed(hit:ChallengeHit,rule:string,target:string):boolean{
 if(hit==='MISS')return true;
 if(target==='bull'||target==='bull25'||target==='bull50')return hit==='25'||hit==='50';
 if(rule==='all')return hit==='S'||hit==='D'||hit==='T';
 if(rule==='single')return hit==='S';
 if(rule==='double')return hit==='D';
 if(rule==='triple')return hit==='T';
 if(rule==='bull'||rule==='bull25'||rule==='bull50')return hit==='25'||hit==='50';
 return false;
}

export function classicHitValue(hit:ChallengeHit,rule:string,target:string,segment?:number|null):number{
 if(!classicHitAllowed(hit,rule,target))return 0;
 if(target==='any-double')return hit==='D'&&Number(segment)>0?1:0;
 if(target==='any-triple')return hit==='T'&&Number(segment)>0?1:0;
 return classicValues[hit];
}

export function realHitValue(hit:ChallengeHit,segment?:number|null,fallbackSegment?:number|null):number{
 if(hit==='MISS')return 0;
 if(hit==='25')return 25;
 if(hit==='50')return 50;
 const n=Math.max(0,Math.min(20,Math.round(Number(segment||fallbackSegment||0))));
 if(!n)return 0;
 return hit==='S'?n:hit==='D'?n*2:hit==='T'?n*3:0;
}

export function objectiveAcceptsHit(entry:ChallengeEntryLike,objective:string):boolean{
 if(entry.hit==='MISS')return false;
 if(objective==='bull'||objective==='bull25'||objective==='bull50')return entry.hit==='25'||entry.hit==='50';
 if(objective==='any-double')return entry.hit==='D'&&Number(entry.segment)>0;
 if(objective==='any-triple')return entry.hit==='T'&&Number(entry.segment)>0;
 if(/^([1-9]|1[0-9]|20)$/.test(objective))return entry.hit==='S'||entry.hit==='D'||entry.hit==='T';
 return false;
}

function objectivePoints(entry:ChallengeEntryLike,objective:string,mode:ChallengeScoreMode):number{
 if(!objectiveAcceptsHit(entry,objective))return 0;
 if(mode==='challenge')return classicValues[entry.hit];
 const sector=/^([1-9]|1[0-9]|20)$/.test(objective)?Number(objective):null;
 return realHitValue(entry.hit,entry.segment,sector);
}

export type ChallengeEvaluation={
 score:number;
 entryPoints:number[];
 entrySuccessful:boolean[];
 visitScores:number[];
 cumulativeScores:number[];
};

export type ChallengeExerciseObjectiveStats={attempts:number;validated:number;perfect:number;points:number};

export type ChallengeExerciseVisitStats={
 index:number;
 objective:string;
 darts:number;
 successfulHits:number;
 validated:boolean;
 perfect:boolean;
 points:number;
 scoreBefore:number;
 scoreAfter:number;
 delta:number;
 halfItCut:boolean;
 groupingSector:number|null;
};

export type ChallengeExerciseAnalytics={
 type:ChallengeExerciseType;
 visitsPlayed:number;
 completedVisits:number;
 validatedVisits:number;
 failedVisits:number;
 validationRate:number;
 perfectVisits:number;
 bestValidatedVisitStreak:number;
 bestPerfectVisitStreak:number;
 bestVisitPoints:number;
 objectiveStats:Record<string,ChallengeExerciseObjectiveStats>;
 visitStats:ChallengeExerciseVisitStats[];
 halfItCuts:number;
 halfItLowestScore:number;
 halfItEndScore:number;
 groupingDoublets:number;
 groupingTriplets:number;
 groupingPoints:number;
 groupingSectorHits:Record<string,number>;
 topGroupingSector:number|null;
 topGroupingSectorHits:number;
};

export function evaluateChallengeEntries(entries:ChallengeEntryLike[],cfg:ChallengeExerciseConfigLike):ChallengeEvaluation{
 const type=challengeExerciseType(cfg);
 const entryPoints=Array(entries.length).fill(0) as number[];
 const entrySuccessful=Array(entries.length).fill(false) as boolean[];
 const visitScores:number[]=[];
 const cumulativeScores:number[]=[];
 let score=type==='half-it'?Math.max(0,Math.round(Number(cfg.halfItStartScore??40)||0)):0;
 const visits=Math.ceil(entries.length/3);

 for(let visitIndex=0;visitIndex<visits;visitIndex++){
  const start=visitIndex*3;
  const visit=entries.slice(start,start+3);
  const before=score;

  if(type==='classic'){
   visit.forEach((entry,j)=>{
    const points=classicHitValue(entry.hit,String(cfg.rule||'all'),String(cfg.target||'20'),entry.segment);
    entryPoints[start+j]=points;
    entrySuccessful[start+j]=points>0;
    score+=points;
   });
  }else if(type==='doubles8'){
   const targets=normalizedDoublesTargets(cfg);
   const bonusVisit=visitIndex>=targets.length*3;
   const objective=String(objectiveForVisit(cfg,visitIndex));
   const target=clampSector(objective.split(':')[1],20);
   let doubleHits=0;
   visit.forEach((entry,j)=>{
    if(entry.hit!=='D')return;
    const segment=Math.round(Number(entry.segment||0));
    // Les anciennes parties Challenge ne stockaient pas le numéro du double :
    // un segment absent reste accepté pour préserver leur historique.
    if(segment>0&&segment!==target)return;
    entrySuccessful[start+j]=true;
    doubleHits++;
    const points=bonusVisit?50:doubleHits===1?10:doubleHits===2?20:70;
    entryPoints[start+j]=points;
    score+=points;
   });
  }else if(type==='grouping'){
   const rawMin=clampSector(cfg.groupingMin,15),rawMax=clampSector(cfg.groupingMax,20);
   const min=Math.min(rawMin,rawMax),max=Math.max(rawMin,rawMax);
   const required=Math.max(2,Math.min(3,Math.round(Number(cfg.groupingHits||2))));
   const bySector=new Map<number,number[]>();
   visit.forEach((entry,j)=>{
    const n=Math.round(Number(entry.segment||0));
    if(entry.hit==='MISS'||n<min||n>max||!['S','D','T'].includes(entry.hit))return;
    const list=bySector.get(n)||[];list.push(j);bySector.set(n,list);
   });
   for(const [sector,indexes] of bySector.entries()){
    if(indexes.length<required)continue;
    for(const j of indexes){
     const points=realHitValue(visit[j].hit,sector,sector);
     entryPoints[start+j]=points;
     entrySuccessful[start+j]=points>0;
     score+=points;
    }
   }
  }else{
   const objective=String(objectiveForVisit(cfg,visitIndex));
   const mode:ChallengeScoreMode=type==='clock'?(cfg.clockScoreMode||'challenge'):type==='sequence'?(cfg.sequenceScoreMode||'real'):'real';
   let visitEarned=0;
   visit.forEach((entry,j)=>{
    const points=objectivePoints(entry,objective,mode);
    entryPoints[start+j]=points;
    entrySuccessful[start+j]=points>0;
    visitEarned+=points;
   });
   if(type==='half-it'){
    if(visit.length===3&&visitEarned<=0)score=Math.ceil(score/2);
    else score+=visitEarned;
   }else score+=visitEarned;
  }

  visitScores.push(score-before);
  cumulativeScores.push(score);
 }

 return {score,entryPoints,entrySuccessful,visitScores,cumulativeScores};
}

export function analyzeChallengeExercise(entries:ChallengeEntryLike[],cfg:ChallengeExerciseConfigLike):ChallengeExerciseAnalytics{
 const type=challengeExerciseType(cfg);
 const evaluation=evaluateChallengeEntries(entries,cfg);
 const visitsPlayed=Math.ceil(entries.length/3);
 let completedVisits=0;
 let validatedVisits=0;
 let failedVisits=0;
 let perfectVisits=0;
 let bestValidatedVisitStreak=0;
 let validatedVisitRun=0;
 let bestPerfectVisitStreak=0;
 let perfectVisitRun=0;
 let bestVisitPoints=0;
 let halfItCuts=0;
 let groupingDoublets=0;
 let groupingTriplets=0;
 let groupingPoints=0;
 const groupingSectorHits:Record<string,number>={};
 const objectiveStats:Record<string,ChallengeExerciseObjectiveStats>={};
 const visitStats:ChallengeExerciseVisitStats[]=[];

 for(let visitIndex=0;visitIndex<visitsPlayed;visitIndex++){
  const start=visitIndex*3;
  const visit=entries.slice(start,start+3);
  const successFlags=evaluation.entrySuccessful.slice(start,start+visit.length);
  const successfulHits=successFlags.filter(Boolean).length;
  const complete=visit.length===3;
  if(complete)completedVisits++;
  const validated=successfulHits>0;
  const perfect=successfulHits===3;
  if(validated){validatedVisits++;validatedVisitRun++;bestValidatedVisitStreak=Math.max(bestValidatedVisitStreak,validatedVisitRun)}else if(complete)validatedVisitRun=0;
  if(complete&&successfulHits===0){
   failedVisits++;
   if(type==='half-it')halfItCuts++;
  }
  if(perfect){perfectVisits++;perfectVisitRun++;bestPerfectVisitStreak=Math.max(bestPerfectVisitStreak,perfectVisitRun)}else if(complete)perfectVisitRun=0;
  const visitPoints=evaluation.entryPoints.slice(start,start+visit.length).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  bestVisitPoints=Math.max(bestVisitPoints,visitPoints);
  const objective=String(objectiveForVisit(cfg,visitIndex));
  const objectiveRow=objectiveStats[objective]||(objectiveStats[objective]={attempts:0,validated:0,perfect:0,points:0});
  objectiveRow.attempts++;
  if(validated)objectiveRow.validated++;
  if(perfect)objectiveRow.perfect++;
  objectiveRow.points+=visitPoints;

  const scoreBefore=visitIndex>0?Number(evaluation.cumulativeScores[visitIndex-1]||0):(type==='half-it'?Math.max(0,Math.round(Number(cfg.halfItStartScore??40)||0)):0);
  const scoreAfter=Number(evaluation.cumulativeScores[visitIndex]??scoreBefore);
  const groupingSector=type==='grouping'?(()=>{
   for(let j=0;j<visit.length;j++){
    if(!successFlags[j])continue;
    const sector=Math.round(Number(visit[j]?.segment||0));
    if(sector>=1&&sector<=20)return sector;
   }
   return null;
  })():null;
  visitStats.push({
   index:visitIndex,
   objective,
   darts:visit.length,
   successfulHits,
   validated,
   perfect,
   points:visitPoints,
   scoreBefore,
   scoreAfter,
   delta:scoreAfter-scoreBefore,
   halfItCut:type==='half-it'&&complete&&successfulHits===0,
   groupingSector,
  });

  if(type==='grouping'&&successfulHits>0){
   if(successfulHits===2)groupingDoublets++;
   if(successfulHits===3)groupingTriplets++;
   groupingPoints+=Math.max(0,Number(evaluation.visitScores[visitIndex]||0));
   visit.forEach((entry,j)=>{
    if(!successFlags[j])return;
    const sector=Math.round(Number(entry.segment||0));
    if(sector<1||sector>20)return;
    const key=String(sector);
    groupingSectorHits[key]=(groupingSectorHits[key]||0)+1;
   });
  }
 }

 const topGrouping=Object.entries(groupingSectorHits)
  .map(([sector,hits])=>({sector:Number(sector),hits:Number(hits)||0}))
  .sort((a,b)=>b.hits-a.hits||b.sector-a.sector)[0]||null;
 const denominator=completedVisits||visitsPlayed;
 const halfItStart=Math.max(0,Math.round(Number(cfg.halfItStartScore??40)||0));
 const halfItLowestScore=type==='half-it'?Math.min(halfItStart,...evaluation.cumulativeScores.map(value=>Math.max(0,Number(value)||0))):0;
 return {
  type,
  visitsPlayed,
  completedVisits,
  validatedVisits,
  failedVisits,
  validationRate:denominator?Math.round((validatedVisits/denominator)*1000)/10:0,
  perfectVisits,
  bestValidatedVisitStreak,
  bestPerfectVisitStreak,
  bestVisitPoints,
  objectiveStats,
  visitStats,
  halfItCuts,
  halfItLowestScore,
  halfItEndScore:type==='half-it'?evaluation.score:0,
  groupingDoublets,
  groupingTriplets,
  groupingPoints,
  groupingSectorHits,
  topGroupingSector:topGrouping?.sector??null,
  topGroupingSectorHits:topGrouping?.hits??0,
 };
}


export type ChallengeRankLike={
 score:number;
 tieBreakPoints?:number;
 accuracy?:number;
 bestStreak?:number;
 bestVisit?:number;
 darts?:number;
 exerciseStats?:Partial<ChallengeExerciseAnalytics>|null;
};

const metric=(value:any)=>Number.isFinite(Number(value))?Number(value):0;

/**
 * Ordre de départage commun au gameplay local, aux compétitions et au classement
 * Online. Les exercices privilégient d'abord la validation de l'objectif, puis
 * la régularité de volée. Le Challenge classique conserve son départage historique
 * par somme des secteurs (utile notamment pour DOUBLES / TRIPLES).
 */
export function compareChallengeRankRows(a:ChallengeRankLike,b:ChallengeRankLike,cfg:ChallengeExerciseConfigLike):number{
 const scoreDelta=metric(b?.score)-metric(a?.score);
 if(scoreDelta)return scoreDelta;
 const type=challengeExerciseType(cfg);
 if(type!=='classic'){
  const ax=a?.exerciseStats||{},bx=b?.exerciseStats||{};
  const validation=metric((bx as any).validationRate)-metric((ax as any).validationRate);
  if(validation)return validation;
  const streak=metric((bx as any).bestValidatedVisitStreak)-metric((ax as any).bestValidatedVisitStreak);
  if(streak)return streak;
  const bestVisit=metric((bx as any).bestVisitPoints)-metric((ax as any).bestVisitPoints);
  if(bestVisit)return bestVisit;
  const perfect=metric((bx as any).perfectVisits)-metric((ax as any).perfectVisits);
  if(perfect)return perfect;
 }
 const segmentSum=metric(b?.tieBreakPoints)-metric(a?.tieBreakPoints);
 if(segmentSum)return segmentSum;
 const accuracy=metric(b?.accuracy)-metric(a?.accuracy);
 if(accuracy)return accuracy;
 const streak=metric(b?.bestStreak)-metric(a?.bestStreak);
 if(streak)return streak;
 const bestVisit=metric(b?.bestVisit)-metric(a?.bestVisit);
 if(bestVisit)return bestVisit;
 const dartsA=metric(a?.darts),dartsB=metric(b?.darts);
 if(dartsA!==dartsB)return dartsA-dartsB;
 return 0;
}

/**
 * Recompose une configuration Challenge depuis les règles d'une compétition.
 * `objectiveOverride` reste utile pour les compétitions classiques à plusieurs
 * cibles ; pour HORLOGE / HALF-IT / SÉQUENCE / GROUPEMENT, la configuration
 * d'exercice stockée dans `exerciseConfig` reste l'autorité.
 */
export function challengeExerciseConfigFromRules(rules:any,objectiveOverride?:string|null):ChallengeExerciseConfigLike{
 const stored=(rules?.exerciseConfig&&typeof rules.exerciseConfig==='object')?rules.exerciseConfig:rules||{};
 const type=challengeExerciseType(stored);
 if(type==='classic'){
  const target=String(objectiveOverride||rules?.target||stored?.target||'20');
  const rule=target==='any-double'?'double':target==='any-triple'?'triple':target==='bull'||target==='bull25'||target==='bull50'?'bull':String(rules?.rule||stored?.rule||'all');
  return {target,rule,visits:Math.max(1,Math.round(Number(rules?.visits??stored?.visits??30)||30)),exerciseType:'classic'};
 }
 const common:any={
  target:String(stored?.target||'20'),
  rule:String(stored?.rule||'all'),
  visits:Math.max(1,Math.round(Number(stored?.visits??rules?.visits??30)||30)),
  exerciseType:type,
  clockIncludeBull:Boolean(stored?.clockIncludeBull),
  clockScoreMode:stored?.clockScoreMode==='real'?'real':'challenge',
  halfItStartScore:Math.max(0,Math.round(Number(stored?.halfItStartScore??40)||0)),
  sequenceObjectives:normalizedSequence(stored),
  sequenceScoreMode:stored?.sequenceScoreMode==='challenge'?'challenge':'real',
  groupingMin:clampSector(stored?.groupingMin,15),
  groupingMax:clampSector(stored?.groupingMax,20),
  groupingHits:Number(stored?.groupingHits)===3?3:2,
  doublesBonusTarget:clampSector(stored?.doublesBonusTarget,20),
  doublesTargets:normalizedDoublesTargets(stored),
 };
 if(type==='clock'){
  common.target='1';common.rule='all';common.visits=common.clockIncludeBull?21:20;
 }else if(type==='half-it'||type==='sequence'){
  const sequence=normalizedSequence(common);
  common.sequenceObjectives=sequence;
  common.visits=Math.max(1,sequence.length);
  const first=String(sequence[0]||'20');
  common.target=/^([1-9]|1[0-9]|20)$/.test(first)?first:'20';common.rule='all';
 }else if(type==='doubles8'){
  common.doublesTargets=normalizedDoublesTargets(common);
  common.target=String(common.doublesTargets[0]||20);common.rule='double';common.visits=common.doublesTargets.length*3+1;common.doublesBonusTarget=clampSector(common.doublesBonusTarget,20);
 }else if(type==='grouping'){
  const lo=Math.min(common.groupingMin,common.groupingMax),hi=Math.max(common.groupingMin,common.groupingMax);
  common.groupingMin=lo;common.groupingMax=hi;common.target=String(lo);common.rule='all';
 }
 return common as ChallengeExerciseConfigLike;
}

export function challengeCompetitionObjectiveKey(rules:any):string{
 return challengeObjectiveKeyTarget(challengeExerciseConfigFromRules(rules));
}

export function maxChallengePointsPerDart(cfg:ChallengeExerciseConfigLike):number{
 const type=challengeExerciseType(cfg);
 if(type==='classic')return Math.max(1,...(['S','D','T','25','50'] as ChallengeHit[]).map(hit=>classicHitValue(hit,String(cfg.rule||'all'),String(cfg.target||'20'),20)));
 if(type==='clock'&&cfg.clockScoreMode!=='real')return 3;
 if(type==='sequence'&&cfg.sequenceScoreMode==='challenge')return 3;
 if(type==='doubles8')return 34;
 return 60;
}
