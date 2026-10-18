export type ClosestCenterPlayerStat = {
  playerId: string;
  name: string;
  teamId?: string | null;
  points: number;
  attempts: number;
  measured: number;
  misses: number;
  bestMm: number | null;
  averageMm: number | null;
  medianMm: number | null;
  consistencyMm: number | null;
  under10mm: number;
  under25mm: number;
  roundWins: number;
  avgUncertaintyMm: number | null;
  avgIdentityConfidence: number | null;
  rankedDarts: number;
};

function median(values:number[]) {
  if (!values.length) return null;
  const v=[...values].sort((a,b)=>a-b);
  const m=Math.floor(v.length/2);
  return v.length%2?v[m]:(v[m-1]+v[m])/2;
}

function avg(values:number[]) {
  return values.length ? values.reduce((s,v)=>s+v,0)/values.length : null;
}

function std(values:number[]) {
  if(values.length<2) return values.length ? 0 : null;
  const m=avg(values)!;
  return Math.sqrt(values.reduce((s,v)=>s+(v-m)*(v-m),0)/values.length);
}

function isManualRankImpact(x:any) {
  return x?.source === "manual_rank" || x?.ordinalOnly === true || Number.isFinite(Number(x?.manualRank));
}

function orderValue(x:any) {
  if (isManualRankImpact(x)) return Number(x.manualRank || x.distanceMm || Infinity);
  return Number(x.distanceMm);
}

export function buildClosestCenterStats(players:any[], impacts:any[], scores:Record<string,number>, rounds:number, dartsPerPlayer:number = 3) {
  const totalRounds=Math.max(1,Number(rounds||1));
  const roundBestOwner:Record<number,string>={};
  for(let r=1;r<=totalRounds;r++){
    const items=(impacts||[]).filter((x:any)=>Number(x.round)===r&&(isManualRankImpact(x)||Number.isFinite(Number(x.distanceMm))));
    items.sort((a:any,b:any)=>orderValue(a)-orderValue(b));
    if(items[0]) roundBestOwner[r]=String(items[0].playerId);
  }
  const playerStats:ClosestCenterPlayerStat[]=(players||[]).map((p:any)=>{
    const playerImpacts=(impacts||[]).filter((x:any)=>String(x.playerId)===String(p.id));
    const explicitMisses=playerImpacts.filter((x:any)=>x?.miss===true || x?.isMiss===true);
    const items=playerImpacts.filter((x:any)=>!x?.miss&&!x?.isMiss&&!isManualRankImpact(x)&&Number.isFinite(Number(x.distanceMm)));
    const rankedItems=playerImpacts.filter((x:any)=>isManualRankImpact(x));
    const distances=items.map((x:any)=>Number(x.distanceMm)).filter(Number.isFinite);
    const uncertainties=items.map((x:any)=>Number(x.uncertaintyMm)).filter((v:number)=>Number.isFinite(v)&&v>=0);
    const identities=items.map((x:any)=>Number(x.identityConfidence)).filter((v:number)=>Number.isFinite(v)&&v>=0&&v<=1);
    const attempts=totalRounds*Math.max(1,Number(dartsPerPlayer||3));
    return {
      playerId:String(p.id),
      name:String(p.name||"Joueur"),
      teamId:p.teamId||null,
      points:Number(scores?.[p.id]||0),
      attempts,
      measured:distances.length,
      misses:rankedItems.length ? 0 : (explicitMisses.length ? explicitMisses.length : Math.max(0,attempts-distances.length)),
      bestMm:distances.length?Math.min(...distances):null,
      averageMm:avg(distances),
      medianMm:median(distances),
      consistencyMm:std(distances),
      under10mm:distances.filter((d:number)=>d<=10).length,
      under25mm:distances.filter((d:number)=>d<=25).length,
      roundWins:Object.values(roundBestOwner).filter(id=>id===String(p.id)).length,
      avgUncertaintyMm:avg(uncertainties),
      avgIdentityConfidence:avg(identities),
      rankedDarts:rankedItems.length,
    };
  }).sort((a,b)=>b.points-a.points||((a.bestMm??Infinity)-(b.bestMm??Infinity)));

  const metricImpacts=(impacts||[]).filter((x:any)=>!x?.miss&&!x?.isMiss&&!isManualRankImpact(x)&&Number.isFinite(Number(x.distanceMm)));
  const explicitMisses=(impacts||[]).filter((x:any)=>x?.miss===true || x?.isMiss===true);
  const allDistances=metricImpacts.map((x:any)=>Number(x.distanceMm)).filter(Number.isFinite);
  const bestImpact=[...metricImpacts].sort((a:any,b:any)=>Number(a.distanceMm)-Number(b.distanceMm))[0]||null;
  const totalRankedDarts=(impacts||[]).filter((x:any)=>isManualRankImpact(x)).length;
  return {
    rounds:totalRounds,
    totalImpacts: totalRankedDarts || allDistances.length,
    totalRankedDarts,
    totalMisses: explicitMisses.length,
    totalThrows: totalRankedDarts || (allDistances.length + explicitMisses.length),
    manualRankingOnly: totalRankedDarts > 0 && allDistances.length === 0,
    bestDistanceMm:allDistances.length?Math.min(...allDistances):null,
    averageDistanceMm:avg(allDistances),
    bestImpact:bestImpact?{playerId:String(bestImpact.playerId),distanceMm:Number(bestImpact.distanceMm),round:Number(bestImpact.round||0)}:null,
    players:playerStats,
  };
}
