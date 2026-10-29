export type ChallengeProgressRow={
  id?:string;
  at:number;
  score:number;
  exerciseType?:string;
  exerciseStats?:any;
};

export type ChallengeTrend={
  current:number|null;
  previous:number|null;
  delta:number|null;
};

export type ChallengeRecordEvent={
  id:string;
  at:number;
  kind:'score'|'validation'|'validated-streak'|'perfect-streak';
  value:number;
  previous:number;
};

export type ChallengeObjectiveMovement={
  objective:string;
  recentAttempts:number;
  priorAttempts:number;
  recentRate:number;
  priorRate:number;
  delta:number;
};

export type ChallengeSectorMovement={
  sector:number;
  recentAverage:number;
  priorAverage:number;
  delta:number;
};

export type ChallengeStatsProgression={
  matches:number;
  windowSize:number;
  scoreTrend:ChallengeTrend;
  validationTrend:ChallengeTrend;
  momentum:'up'|'down'|'steady'|'insufficient';
  recordEvents:ChallengeRecordEvent[];
  recentRecordEvents:ChallengeRecordEvent[];
  objectiveMovements:ChallengeObjectiveMovement[];
  bestObjectiveProgress:ChallengeObjectiveMovement|null;
  biggestObjectiveDrop:ChallengeObjectiveMovement|null;
  sectorMovements:ChallengeSectorMovement[];
  bestSectorProgress:ChallengeSectorMovement|null;
  biggestSectorDrop:ChallengeSectorMovement|null;
  currentStrength:{key:string;rate:number;attempts:number}|null;
  currentWeakness:{key:string;rate:number;attempts:number}|null;
};

const finite=(value:any,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
const avg=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
const round1=(value:number)=>Math.round(value*10)/10;

function validationOf(row:ChallengeProgressRow):number{
  return finite(row?.exerciseStats?.validationRate,0);
}

function streakOf(row:ChallengeProgressRow,key:'bestValidatedVisitStreak'|'bestPerfectVisitStreak'):number{
  return finite(row?.exerciseStats?.[key],0);
}

function recordHistory(rows:ChallengeProgressRow[]):ChallengeRecordEvent[]{
  if(rows.length<2)return [];
  const first=rows[0];
  let bestScore=finite(first.score,0);
  let bestValidation=validationOf(first);
  let bestValidated=streakOf(first,'bestValidatedVisitStreak');
  let bestPerfect=streakOf(first,'bestPerfectVisitStreak');
  const out:ChallengeRecordEvent[]=[];
  for(let index=1;index<rows.length;index++){
    const row=rows[index];
    const values:Array<{kind:ChallengeRecordEvent['kind'];value:number;best:number}>= [
      {kind:'score',value:finite(row.score,0),best:bestScore},
      {kind:'validation',value:validationOf(row),best:bestValidation},
      {kind:'validated-streak',value:streakOf(row,'bestValidatedVisitStreak'),best:bestValidated},
      {kind:'perfect-streak',value:streakOf(row,'bestPerfectVisitStreak'),best:bestPerfect},
    ];
    for(const item of values){
      if(item.value>item.best){
        out.push({id:`${String(row.id||row.at)}:${item.kind}`,at:finite(row.at,0),kind:item.kind,value:item.value,previous:item.best});
        if(item.kind==='score')bestScore=item.value;
        else if(item.kind==='validation')bestValidation=item.value;
        else if(item.kind==='validated-streak')bestValidated=item.value;
        else bestPerfect=item.value;
      }
    }
  }
  return out;
}

function aggregateObjectives(rows:ChallengeProgressRow[]){
  const map=new Map<string,{attempts:number;validated:number}>();
  for(const row of rows){
    for(const [objective,raw] of Object.entries(row?.exerciseStats?.objectiveStats||{})){
      if(String(objective).startsWith('bonus-double:'))continue;
      const src:any=raw||{};
      const dst=map.get(objective)||{attempts:0,validated:0};
      dst.attempts+=finite(src.attempts,0);
      dst.validated+=finite(src.validated,0);
      map.set(objective,dst);
    }
  }
  return map;
}

function objectiveMovements(prior:ChallengeProgressRow[],recent:ChallengeProgressRow[]):ChallengeObjectiveMovement[]{
  const priorMap=aggregateObjectives(prior);
  const recentMap=aggregateObjectives(recent);
  const out:ChallengeObjectiveMovement[]=[];
  for(const [objective,recentStats] of recentMap){
    const priorStats=priorMap.get(objective);
    if(!priorStats||priorStats.attempts<=0||recentStats.attempts<=0)continue;
    const recentRate=(recentStats.validated/recentStats.attempts)*100;
    const priorRate=(priorStats.validated/priorStats.attempts)*100;
    out.push({objective,recentAttempts:recentStats.attempts,priorAttempts:priorStats.attempts,recentRate:round1(recentRate),priorRate:round1(priorRate),delta:round1(recentRate-priorRate)});
  }
  return out.sort((a,b)=>b.delta-a.delta||b.recentAttempts-a.recentAttempts||a.objective.localeCompare(b.objective));
}

function aggregateGrouping(rows:ChallengeProgressRow[]){
  const map=new Map<number,number>();
  for(const row of rows){
    for(const [sectorRaw,hitsRaw] of Object.entries(row?.exerciseStats?.groupingSectorHits||{})){
      const sector=Number(sectorRaw);
      if(!Number.isFinite(sector)||sector<1||sector>20)continue;
      map.set(sector,(map.get(sector)||0)+finite(hitsRaw,0));
    }
  }
  return map;
}

function sectorMovements(prior:ChallengeProgressRow[],recent:ChallengeProgressRow[]):ChallengeSectorMovement[]{
  if(!prior.length||!recent.length)return [];
  const priorMap=aggregateGrouping(prior);
  const recentMap=aggregateGrouping(recent);
  const sectors=new Set<number>([...priorMap.keys(),...recentMap.keys()]);
  return [...sectors].map(sector=>{
    const recentAverage=(recentMap.get(sector)||0)/recent.length;
    const priorAverage=(priorMap.get(sector)||0)/prior.length;
    return {sector,recentAverage:round1(recentAverage),priorAverage:round1(priorAverage),delta:round1(recentAverage-priorAverage)};
  }).sort((a,b)=>b.delta-a.delta||b.recentAverage-a.recentAverage||a.sector-b.sector);
}

function currentObjectiveForm(recent:ChallengeProgressRow[]){
  const map=aggregateObjectives(recent);
  const rows=[...map.entries()].map(([key,value])=>({key,attempts:value.attempts,rate:value.attempts?(value.validated/value.attempts)*100:0})).filter(item=>item.attempts>0);
  const currentStrength=rows.slice().sort((a,b)=>b.rate-a.rate||b.attempts-a.attempts||a.key.localeCompare(b.key))[0]||null;
  const currentWeakness=rows.slice().sort((a,b)=>a.rate-b.rate||b.attempts-a.attempts||a.key.localeCompare(b.key))[0]||null;
  return {
    currentStrength:currentStrength?{...currentStrength,rate:round1(currentStrength.rate)}:null,
    currentWeakness:currentWeakness?{...currentWeakness,rate:round1(currentWeakness.rate)}:null,
  };
}

export function buildChallengeStatsProgression(inputRows:ChallengeProgressRow[]):ChallengeStatsProgression{
  const rows=(Array.isArray(inputRows)?inputRows:[])
    .filter(row=>row&&row.exerciseStats&&typeof row.exerciseStats==='object')
    .slice()
    .sort((a,b)=>finite(a.at,0)-finite(b.at,0));
  const matches=rows.length;
  const windowSize=matches>=6?3:matches>=4?2:matches>=2?1:0;
  const recent=windowSize?rows.slice(-windowSize):rows.slice();
  const prior=windowSize?rows.slice(0,-windowSize):[];
  const previousWindow=windowSize&&prior.length>=windowSize?prior.slice(-windowSize):prior.slice();
  const scoreTrend:ChallengeTrend=previousWindow.length&&recent.length?{
    current:round1(avg(recent.map(row=>finite(row.score,0)))),
    previous:round1(avg(previousWindow.map(row=>finite(row.score,0)))),
    delta:round1(avg(recent.map(row=>finite(row.score,0)))-avg(previousWindow.map(row=>finite(row.score,0)))),
  }:{current:recent.length?round1(avg(recent.map(row=>finite(row.score,0)))):null,previous:null,delta:null};
  const validationTrend:ChallengeTrend=previousWindow.length&&recent.length?{
    current:round1(avg(recent.map(validationOf))),
    previous:round1(avg(previousWindow.map(validationOf))),
    delta:round1(avg(recent.map(validationOf))-avg(previousWindow.map(validationOf))),
  }:{current:recent.length?round1(avg(recent.map(validationOf))):null,previous:null,delta:null};
  const momentum=validationTrend.delta===null?'insufficient':validationTrend.delta>1?'up':validationTrend.delta<-1?'down':'steady';
  const recordEvents=recordHistory(rows);
  const movements=objectiveMovements(prior,recent);
  const sectors=sectorMovements(prior,recent);
  const form=currentObjectiveForm(recent);
  return {
    matches,
    windowSize,
    scoreTrend,
    validationTrend,
    momentum,
    recordEvents,
    recentRecordEvents:recordEvents.slice(-6).reverse(),
    objectiveMovements:movements,
    bestObjectiveProgress:movements.find(item=>item.delta>0)||null,
    biggestObjectiveDrop:movements.slice().reverse().find(item=>item.delta<0)||null,
    sectorMovements:sectors,
    bestSectorProgress:sectors.find(item=>item.delta>0)||null,
    biggestSectorDrop:sectors.slice().reverse().find(item=>item.delta<0)||null,
    currentStrength:form.currentStrength,
    currentWeakness:form.currentWeakness,
  };
}
