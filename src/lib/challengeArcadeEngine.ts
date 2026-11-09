/** Moteur déterministe des deux premiers défis de l'extension CHALLENGE.
 * Chaque lancer est saisi en zone exacte : G et P sont différents.
 * On recalcule l'état depuis le journal : ANNULER ne peut pas désynchroniser la progression.
 */
export type ArcadeZone='G'|'P'|'D'|'T'|'BULL'|'DBULL'|'MISS';
export type ArcadeHit={pid:string;zone:ArcadeZone;segment:number|null};
export type ArcadeVariant='classic'|'doubles'|'triples';
export type ArcadePlayConfig={
 catalogChallengeId:string;
 catalogLine:number;
 catalogVariant:ArcadeVariant;
 catalogRounds:number;
};
export type ArcadeObjective={zone:ArcadeZone|'S';segment:number|null;label:string};
export type ArcadeProgress={attempts:number;successes:number;index:number;score:number;complete:boolean;remaining:number;accuracy:number;current:ArcadeObjective|null;hitResults:boolean[]};
export const BOARD_CLOCKWISE=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5] as const;
export const clampArcadeNumber=(value:number)=>Math.max(1,Math.min(20,Math.round(Number(value)||20)));
export const oppositeSector=(sector:number)=>{
 const index=BOARD_CLOCKWISE.indexOf(clampArcadeNumber(sector) as typeof BOARD_CLOCKWISE[number]);
 return BOARD_CLOCKWISE[(index+10)%20];
};
export function arcadeObjectives(config:ArcadePlayConfig):ArcadeObjective[]{
 const initial=clampArcadeNumber(config.catalogLine);
 if(config.catalogChallengeId==='perfect-line'){
  return [
   {zone:'D',segment:initial,label:'D'+initial},
   {zone:'G',segment:initial,label:'G'+initial},
   {zone:'T',segment:initial,label:'T'+initial},
   {zone:'P',segment:initial,label:'P'+initial},
   {zone:'BULL',segment:null,label:'BULL 25'},
   {zone:'DBULL',segment:null,label:'DBULL 50'},
  ];
 }
 if(config.catalogChallengeId==='opposites'){
  const start=BOARD_CLOCKWISE.indexOf(initial as typeof BOARD_CLOCKWISE[number]);
  const rounds=Math.max(1,Math.min(10,Math.round(Number(config.catalogRounds)||5)));
  const zone=config.catalogVariant==='doubles'?'D':config.catalogVariant==='triples'?'T':'S';
  const make=(number:number):ArcadeObjective=>({zone,segment:number,label:(zone==='S'?'S':zone)+number});
  return Array.from({length:rounds},(_,i)=>{
   const number=BOARD_CLOCKWISE[(start+i)%20];
   return [make(number),make(oppositeSector(number))];
  }).flat();
 }
 return [];
}
export function isArcadeObjectiveHit(objective:ArcadeObjective|undefined|null,hit:ArcadeHit):boolean{
 if(!objective||hit.zone==='MISS')return false;
 if(objective.zone==='BULL'||objective.zone==='DBULL')return objective.zone===hit.zone;
 return objective.segment===hit.segment && (objective.zone==='S'?(hit.zone==='G'||hit.zone==='P'):objective.zone===hit.zone);
}
export function evaluateArcadeProgress(hits:readonly ArcadeHit[],config:ArcadePlayConfig):ArcadeProgress{
 const objectives=arcadeObjectives(config);
 let index=0;
 const hitResults:boolean[]=[];
 for(const hit of hits){
  const success=isArcadeObjectiveHit(objectives[index],hit);
  hitResults.push(success);
  if(success)index++;
 }
 const attempts=hits.length;
 const successes=hitResults.filter(Boolean).length;
 return {
  attempts,successes,index,score:successes*100,
  complete:objectives.length>0&&index>=objectives.length,
  remaining:Math.max(0,objectives.length-index),
  accuracy:attempts?Math.round(successes/attempts*1000)/10:0,
  current:objectives[index]||null,hitResults,
 };
}
export function currentArcadePlayer(hits:readonly ArcadeHit[],ids:readonly string[],config:ArcadePlayConfig):string|null{
 if(!ids.length)return null;
 const completed=new Set(ids.filter(pid=>evaluateArcadeProgress(hits.filter(hit=>hit.pid===pid),config).complete));
 if(completed.size===ids.length)return null;
 if(!hits.length)return ids[0];
 const last=hits[hits.length-1];
 const idx=ids.indexOf(last.pid);
 const currentDarts=hits.filter(hit=>hit.pid===last.pid).length;
 if(!completed.has(last.pid)&&currentDarts%3!==0)return last.pid;
 for(let step=1;step<=ids.length;step++){
  const candidate=ids[(Math.max(0,idx)+step)%ids.length];
  if(!completed.has(candidate))return candidate;
 }
 return null;
}
