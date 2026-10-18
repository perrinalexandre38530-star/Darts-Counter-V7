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

export function buildClosestCenterStats(players:any[], impacts:any[], scores:Record<string,number>, rounds:number) {
  const totalRounds=Math.max(1,Number(rounds||1));
  const roundBestOwner:Record<number,string>={};
  for(let r=1;r<=totalRounds;r++){
    const items=(impacts||[]).filter((x:any)=>Number(x.round)===r&&Number.isFinite(Number(x.distanceMm)));
    items.sort((a:any,b:any)=>Number(a.distanceMm)-Number(b.distanceMm));
    if(items[0]) roundBestOwner[r]=String(items[0].playerId);
  }
  const playerStats:ClosestCenterPlayerStat[]=(players||[]).map((p:any)=>{
    const items=(impacts||[]).filter((x:any)=>String(x.playerId)===String(p.id)&&Number.isFinite(Number(x.distanceMm)));
    const distances=items.map((x:any)=>Number(x.distanceMm)).filter(Number.isFinite);
    const uncertainties=items.map((x:any)=>Number(x.uncertaintyMm)).filter((v:number)=>Number.isFinite(v)&&v>=0);
    const identities=items.map((x:any)=>Number(x.identityConfidence)).filter((v:number)=>Number.isFinite(v)&&v>=0&&v<=1);
    const attempts=totalRounds*3;
    return {
      playerId:String(p.id),
      name:String(p.name||"Joueur"),
      teamId:p.teamId||null,
      points:Number(scores?.[p.id]||0),
      attempts,
      measured:distances.length,
      misses:Math.max(0,attempts-distances.length),
      bestMm:distances.length?Math.min(...distances):null,
      averageMm:avg(distances),
      medianMm:median(distances),
      consistencyMm:std(distances),
      under10mm:distances.filter((d:number)=>d<=10).length,
      under25mm:distances.filter((d:number)=>d<=25).length,
      roundWins:Object.values(roundBestOwner).filter(id=>id===String(p.id)).length,
      avgUncertaintyMm:avg(uncertainties),
      avgIdentityConfidence:avg(identities),
    };
  }).sort((a,b)=>b.points-a.points||((a.bestMm??Infinity)-(b.bestMm??Infinity)));

  const allDistances=(impacts||[]).map((x:any)=>Number(x.distanceMm)).filter(Number.isFinite);
  const bestImpact=(impacts||[]).filter((x:any)=>Number.isFinite(Number(x.distanceMm))).sort((a:any,b:any)=>Number(a.distanceMm)-Number(b.distanceMm))[0]||null;
  return {
    rounds:totalRounds,
    totalImpacts:allDistances.length,
    bestDistanceMm:allDistances.length?Math.min(...allDistances):null,
    averageDistanceMm:avg(allDistances),
    bestImpact:bestImpact?{playerId:String(bestImpact.playerId),distanceMm:Number(bestImpact.distanceMm),round:Number(bestImpact.round||0)}:null,
    players:playerStats,
  };
}
