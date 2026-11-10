/** Moteur indépendant de saisie exacte. Progression purement dérivée des lancers,
 * de sorte que ANNULER et la reprise ne puissent pas décaler les objectifs.
 */
export type ArcadeZone='G'|'P'|'D'|'T'|'BULL'|'DBULL'|'MISS';
export type ArcadeHit={pid:string;zone:ArcadeZone;segment:number|null};
export type ArcadeVariant='classic'|'doubles'|'triples';
export type ArcadePlayConfig={catalogChallengeId:string;catalogLine:number;catalogVariant:ArcadeVariant;catalogRounds:number};
export type ArcadeObjective={zone:ArcadeZone|'S';segment:number|null;label:string};
export type ArcadeProgress={attempts:number;successes:number;index:number;score:number;complete:boolean;remaining:number;accuracy:number;current:ArcadeObjective|null;hitResults:boolean[]};
export const BOARD_CLOCKWISE=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5] as const;
export const clampArcadeNumber=(value:number)=>Math.max(1,Math.min(20,Math.round(Number(value)||20)));
export const oppositeSector=(segment:number):number=>{
 const i=BOARD_CLOCKWISE.indexOf(clampArcadeNumber(segment) as typeof BOARD_CLOCKWISE[number]);
 return BOARD_CLOCKWISE[(i+10)%20]!;
};
export function arcadeObjectives(config:ArcadePlayConfig):ArcadeObjective[]{
 const initial=clampArcadeNumber(config.catalogLine);
 if(config.catalogChallengeId==='perfect-line')return [
  {zone:'D',segment:initial,label:'D'+initial},
  {zone:'G',segment:initial,label:'G'+initial},
  {zone:'T',segment:initial,label:'T'+initial},
  {zone:'P',segment:initial,label:'P'+initial},
  {zone:'BULL',segment:null,label:'BULL 25'},
  {zone:'DBULL',segment:null,label:'DBULL 50'},
 ];
 if(config.catalogChallengeId==='opposites'){
  const start=BOARD_CLOCKWISE.indexOf(initial as typeof BOARD_CLOCKWISE[number]);
  const rounds=Math.max(1,Math.min(10,Math.round(Number(config.catalogRounds)||5)));
  const zone=config.catalogVariant==='doubles'?'D':config.catalogVariant==='triples'?'T':'S';
  const objective=(sector:number):ArcadeObjective=>({zone,segment:sector,label:(zone==='S'?'S':zone)+sector});
  return Array.from({length:rounds},(_,i)=>{
   const sector=BOARD_CLOCKWISE[(start+i)%20]!;
   return [objective(sector),objective(oppositeSector(sector))];
  }).flat();
 }
 return [];
}
export function isArcadeObjectiveHit(objective:ArcadeObjective|null|undefined,hit:ArcadeHit):boolean{
 if(!objective||hit.zone==='MISS')return false;
 if(objective.zone==='BULL'||objective.zone==='DBULL')return objective.zone===hit.zone;
 return objective.segment===hit.segment&&(objective.zone==='S'?hit.zone==='G'||hit.zone==='P':objective.zone===hit.zone);
}
export function evaluateArcadeProgress(hits:readonly ArcadeHit[],config:ArcadePlayConfig):ArcadeProgress{
 const objectives=arcadeObjectives(config);
 let index=0;
 const hitResults:boolean[]=[];
 for(const hit of hits){
  // A player whose challenge is complete cannot continue accumulating attempts.
  if(index>=objectives.length)break;
  const valid=isArcadeObjectiveHit(objectives[index],hit);
  hitResults.push(valid);
  if(valid)index++;
 }
 const attempts=hitResults.length;
 const successes=hitResults.filter(Boolean).length;
 return {attempts,successes,index,score:successes*100,complete:objectives.length>0&&index>=objectives.length,
  remaining:Math.max(0,objectives.length-index),accuracy:attempts?Math.round(successes/attempts*1000)/10:0,
  current:objectives[index]||null,hitResults};
}
/** Un joueur change après 3 fléchettes, ou immédiatement s'il a terminé son parcours. */
export function currentArcadePlayer(hits:readonly ArcadeHit[],ids:readonly string[],config:ArcadePlayConfig):string|null{
 if(ids.length===0)return null;
 const completed=new Set(ids.filter(pid=>evaluateArcadeProgress(hits.filter(hit=>hit.pid===pid),config).complete));
 if(completed.size===ids.length)return null;
 if(!hits.length)return ids[0]!;
 const last=hits[hits.length-1]!;
 const index=ids.indexOf(last.pid);
 const playerDarts=hits.filter(hit=>hit.pid===last.pid).length;
 if(!completed.has(last.pid)&&playerDarts%3!==0)return last.pid;
 for(let i=1;i<=ids.length;i++){
  const next=ids[(Math.max(0,index)+i)%ids.length]!;
  if(!completed.has(next))return next;
 }
 return null;
}
