export type ChallengeExerciseType='classic'|'clock'|'half-it'|'sequence'|'grouping';
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
};

export type ChallengeEntryLike={hit:ChallengeHit;segment?:number|null};

export const DEFAULT_HALF_IT_SEQUENCE:ChallengeObjectiveToken[]=['15','16','any-double','17','18','any-triple','19','20','bull'];
export const DEFAULT_CUSTOM_SEQUENCE:ChallengeObjectiveToken[]=['20','any-double','18','any-triple','bull'];

const classicValues:Record<ChallengeHit,number>={S:1,D:2,T:3,'25':1,'50':2,MISS:0};
const clampSector=(value:any,fallback:number)=>Math.max(1,Math.min(20,Math.round(Number(value)||fallback)));

export function challengeExerciseType(cfg:ChallengeExerciseConfigLike):ChallengeExerciseType{
 const value=String(cfg?.exerciseType||'classic').toLowerCase();
 return value==='clock'||value==='half-it'||value==='sequence'||value==='grouping'?value:'classic';
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
 return String(cfg.target||'20');
}

export function objectiveLabel(objective:string,cfg?:ChallengeExerciseConfigLike):string{
 if(objective==='any-double')return 'DOUBLE LIBRE';
 if(objective==='any-triple')return 'TRIPLE LIBRE';
 if(objective==='bull'||objective==='bull25'||objective==='bull50')return 'BULL';
 if(objective.startsWith('group:')){
  const min=clampSector(cfg?.groupingMin,15),max=clampSector(cfg?.groupingMax,20),hits=Math.max(2,Math.min(3,Number(cfg?.groupingHits||2)));
  return `${Math.min(min,max)}–${Math.max(min,max)} · ${hits} MÊME SECTEUR`;
 }
 return objective;
}

export function objectiveBoardKey(objective:string,cfg?:ChallengeExerciseConfigLike):string{
 if(objective.startsWith('group:'))return String(clampSector(cfg?.groupingMax,20));
 if(objective==='bull25'||objective==='bull50')return 'bull';
 return objective;
}

export function exerciseTitle(cfg:ChallengeExerciseConfigLike):string{
 switch(challengeExerciseType(cfg)){
  case 'clock':return 'HORLOGE 1 → 20';
  case 'half-it':return 'HALF-IT';
  case 'sequence':return 'SÉQUENCE';
  case 'grouping':return 'GROUPEMENT';
  default:return 'CIBLE FIXE';
 }
}

export function challengeObjectiveKeyTarget(cfg:ChallengeExerciseConfigLike):string{
 const type=challengeExerciseType(cfg);
 if(type==='classic')return String(cfg.target||'20');
 if(type==='clock')return `clock-${cfg.clockScoreMode==='real'?'real':'hits'}-${cfg.clockIncludeBull?'bull':'20'}`;
 if(type==='half-it')return `halfit-${Math.max(0,Math.round(Number(cfg.halfItStartScore??40)||0))}-${normalizedSequence(cfg).join('.')}`;
 if(type==='sequence')return `sequence-${cfg.sequenceScoreMode==='challenge'?'hits':'real'}-${normalizedSequence(cfg).join('.')}`;
 const a=clampSector(cfg.groupingMin,15),b=clampSector(cfg.groupingMax,20),hits=Math.max(2,Math.min(3,Number(cfg.groupingHits||2)));
 return `grouping-${Math.min(a,b)}-${Math.max(a,b)}-x${hits}`;
}

export function challengeOnlineTargetLabel(value:string):string{
 if(value.startsWith('clock-'))return 'HORLOGE';
 if(value.startsWith('halfit-'))return 'HALF-IT';
 if(value.startsWith('sequence-'))return 'SÉQUENCE';
 if(value.startsWith('grouping-'))return 'GROUPEMENT';
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

export function maxChallengePointsPerDart(cfg:ChallengeExerciseConfigLike):number{
 const type=challengeExerciseType(cfg);
 if(type==='classic')return Math.max(1,...(['S','D','T','25','50'] as ChallengeHit[]).map(hit=>classicHitValue(hit,String(cfg.rule||'all'),String(cfg.target||'20'),20)));
 if(type==='clock'&&cfg.clockScoreMode!=='real')return 3;
 if(type==='sequence'&&cfg.sequenceScoreMode==='challenge')return 3;
 return 60;
}
