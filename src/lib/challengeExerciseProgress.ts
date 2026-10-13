import { challengeExerciseType, objectiveLabel, type ChallengeExerciseAnalytics, type ChallengeExerciseConfigLike } from './challengeExercises.ts';
import type { ChallengeExerciseCareer } from './challengeExerciseCareer.ts';

export type ChallengeExerciseProgressObjective={
  objective:string;
  label:string;
  currentRate:number;
  historicalRate:number;
  delta:number;
};

export type ChallengeExerciseProgressSector={
  sector:number;
  currentHits:number;
  historicalAverage:number;
  delta:number;
};

export type ChallengeExerciseRecordBreak={
  key:'score'|'validation'|'streak'|'perfect_streak';
  label:string;
  value:number;
  previous:number;
  suffix:string;
};

export type ChallengeExerciseProgress={
  previousMatches:number;
  baseline:boolean;
  scoreDeltaFromLast:number|null;
  validationDeltaFromLast:number|null;
  records:ChallengeExerciseRecordBreak[];
  improvedObjective:ChallengeExerciseProgressObjective|null;
  regressedObjective:ChallengeExerciseProgressObjective|null;
  improvedSector:ChallengeExerciseProgressSector|null;
  regressedSector:ChallengeExerciseProgressSector|null;
};

const finite=(value:any,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
const round1=(value:number)=>Math.round(value*10)/10;

function objectiveProgress(current:ChallengeExerciseAnalytics,prior:ChallengeExerciseCareer,cfg:ChallengeExerciseConfigLike){
  const priorByObjective=new Map(prior.objectives.map(row=>[String(row.objective),row]));
  const rows:ChallengeExerciseProgressObjective[]=[];
  for(const [objective,value] of Object.entries(current.objectiveStats||{})){
    const attempts=Math.max(0,finite(value?.attempts,0));
    const historical=priorByObjective.get(String(objective));
    if(!attempts||!historical||historical.attempts<=0)continue;
    const currentRate=round1(finite(value?.validated,0)/attempts*100);
    const historicalRate=round1(finite(historical.validationRate,0));
    rows.push({objective:String(objective),label:objectiveLabel(String(objective),cfg),currentRate,historicalRate,delta:round1(currentRate-historicalRate)});
  }
  const improved=rows.filter(row=>row.delta>0).sort((a,b)=>b.delta-a.delta||b.currentRate-a.currentRate)[0]||null;
  const regressed=rows.filter(row=>row.delta<0).sort((a,b)=>a.delta-b.delta||a.currentRate-b.currentRate)[0]||null;
  return {improved,regressed};
}

function groupingProgress(current:ChallengeExerciseAnalytics,prior:ChallengeExerciseCareer){
  if(prior.matches<=0)return {improved:null as ChallengeExerciseProgressSector|null,regressed:null as ChallengeExerciseProgressSector|null};
  const priorBySector=new Map(prior.groupingSectors.map(row=>[Number(row.sector),finite(row.hits,0)]));
  const sectors=new Set<number>([...Array.from(priorBySector.keys()),...Object.keys(current.groupingSectorHits||{}).map(Number)]);
  const rows:ChallengeExerciseProgressSector[]=[];
  for(const sector of sectors){
    if(!Number.isInteger(sector)||sector<1||sector>20)continue;
    const currentHits=finite(current.groupingSectorHits?.[String(sector)],0);
    const historicalAverage=round1(finite(priorBySector.get(sector),0)/Math.max(1,prior.matches));
    rows.push({sector,currentHits,historicalAverage,delta:round1(currentHits-historicalAverage)});
  }
  const improved=rows.filter(row=>row.delta>0).sort((a,b)=>b.delta-a.delta||b.currentHits-a.currentHits)[0]||null;
  const regressed=rows.filter(row=>row.delta<0).sort((a,b)=>a.delta-b.delta||a.currentHits-b.currentHits)[0]||null;
  return {improved,regressed};
}

export function buildChallengeExerciseProgress(currentScore:number,current:ChallengeExerciseAnalytics,prior:ChallengeExerciseCareer,cfg:ChallengeExerciseConfigLike):ChallengeExerciseProgress{
  const previousMatches=Math.max(0,finite(prior?.matches,0));
  const baseline=previousMatches===0;
  const previous=prior?.recent?.[prior.recent.length-1]||null;
  const records:ChallengeExerciseRecordBreak[]=[];
  if(!baseline){
    const score=finite(currentScore,0);
    const validation=finite(current.validationRate,0);
    const streak=finite(current.bestValidatedVisitStreak,0);
    const perfectStreak=finite(current.bestPerfectVisitStreak,0);
    if(score>finite(prior.bestScore,0))records.push({key:'score',label:'RECORD SCORE',value:score,previous:finite(prior.bestScore,0),suffix:' PTS'});
    if(validation>finite(prior.bestValidationRate,0))records.push({key:'validation',label:'RECORD VALIDATION',value:round1(validation),previous:round1(finite(prior.bestValidationRate,0)),suffix:'%'});
    if(streak>finite(prior.bestValidatedVisitStreak,0))records.push({key:'streak',label:'RECORD SÉRIE',value:streak,previous:finite(prior.bestValidatedVisitStreak,0),suffix:''});
    if(perfectStreak>finite(prior.bestPerfectVisitStreak,0))records.push({key:'perfect_streak',label:'SÉRIE PARFAITE',value:perfectStreak,previous:finite(prior.bestPerfectVisitStreak,0),suffix:''});
  }
  const type=challengeExerciseType(cfg);
  const objectives=type==='grouping'?{improved:null,regressed:null}:objectiveProgress(current,prior,cfg);
  const sectors=type==='grouping'?groupingProgress(current,prior):{improved:null,regressed:null};
  return {
    previousMatches,
    baseline,
    scoreDeltaFromLast:previous?round1(finite(currentScore,0)-finite(previous.score,0)):null,
    validationDeltaFromLast:previous?round1(finite(current.validationRate,0)-finite(previous.validationRate,0)):null,
    records,
    improvedObjective:objectives.improved,
    regressedObjective:objectives.regressed,
    improvedSector:sectors.improved,
    regressedSector:sectors.regressed,
  };
}
