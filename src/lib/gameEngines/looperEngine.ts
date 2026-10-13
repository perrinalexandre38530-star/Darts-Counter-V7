// @ts-nocheck
import type { GameDart, Player } from "../types-game";

export type LooperBotLevel = "easy" | "normal" | "hard";
export type LooperRing = "inner_single" | "outer_single" | "single" | "double" | "triple" | "bull" | "dbull";
export type LooperTarget = { bed: "S" | "D" | "T" | "OB" | "IB"; number?: number; ring?: LooperRing };
export type LooperConfigPayload = {
  mode: "looper";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: LooperBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  sfxEnabled?: boolean;
  awenaEnabled?: boolean;
  coachEnabled?: boolean;
  firstVisitGuide?: boolean;
  rules: { lives: number; startTarget: "offhand" | "random"; exactSegment: boolean; numberLoopsEnabled: boolean; setterShield: boolean };
};
export type LooperStats = { darts:number;visits:number;hits:number;misses:number;lifeLosses:number;shieldsUsed:number;shieldsEarned:number;targetsSet:number;loopsSurvived:number;legsWon:number;bullTargets:number;bestHitStreak:number;currentHitStreak:number; };
export type LooperVisit = { id:string;playerId:string;leg:number;turn:number;darts:GameDart[];targetBefore:LooperTarget;targetAfter:LooperTarget;beforeLives:Record<string,number>;afterLives:Record<string,number>;hit:boolean;hitIndex:number;events:string[]; };
export type LooperState = { sport:"darts";mode:"looper";config:LooperConfigPayload;players:Player[];lives:Record<string,number>;shields:Record<string,number>;legWins:Record<string,number>;statsByPlayer:Record<string,LooperStats>;activePlayerIndex:number;legIndex:number;turnIndex:number;phase:"assignment"|"playing"|"finished";winnerId:string|null;lastLegWinnerId:string|null;currentTarget:LooperTarget;setterId:string|null;visits:LooperVisit[];startedAt:number;finishedAt?:number; };

const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const uid=(p="looper")=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const blank=():LooperStats=>({darts:0,visits:0,hits:0,misses:0,lifeLosses:0,shieldsUsed:0,shieldsEarned:0,targetsSet:0,loopsSurvived:0,legsWon:0,bullTargets:0,bestHitStreak:0,currentHitStreak:0});
const isNumberBed=(d:any)=>d?.bed==="S"||d?.bed==="D"||d?.bed==="T";
const isScoring=(d:any)=>isNumberBed(d)||d?.bed==="OB"||d?.bed==="IB";

function normalizeSingleRing(raw:any):LooperRing {
  const ring=String(raw||"");
  if(ring==="inner_single"||ring==="outer_single") return ring;
  return "single";
}
export function looperTargetFromDart(d:any, fallback?:LooperTarget):LooperTarget {
  if(!d||!isScoring(d)) return fallback ? clone(fallback) : {bed:"S",number:20,ring:"single"};
  if(d.bed==="IB") return {bed:"IB",ring:"dbull"};
  if(d.bed==="OB") return {bed:"OB",ring:"bull"};
  const number=Math.max(1,Math.min(20,Number(d.number||20)));
  if(d.bed==="D") return {bed:"D",number,ring:"double"};
  if(d.bed==="T") return {bed:"T",number,ring:"triple"};
  return {bed:"S",number,ring:normalizeSingleRing(d.ring)};
}
export function looperTargetLabel(target:any):string {
  const t=normalizeTarget(target);
  if(t.bed==="IB") return "DBULL";
  if(t.bed==="OB") return "BULL";
  if(t.bed==="D") return `D${t.number}`;
  if(t.bed==="T") return `T${t.number}`;
  if(t.ring==="inner_single") return `PETIT S${t.number}`;
  if(t.ring==="outer_single") return `GRAND S${t.number}`;
  return `S${t.number}`;
}
function normalizeTarget(raw:any):LooperTarget {
  if(typeof raw==="number") return {bed:"S",number:Math.max(1,Math.min(20,raw)),ring:"single"};
  if(raw?.bed==="IB") return {bed:"IB",ring:"dbull"};
  if(raw?.bed==="OB") return {bed:"OB",ring:"bull"};
  if(raw?.bed==="D") return {bed:"D",number:Math.max(1,Math.min(20,Number(raw.number||20))),ring:"double"};
  if(raw?.bed==="T") return {bed:"T",number:Math.max(1,Math.min(20,Number(raw.number||20))),ring:"triple"};
  return {bed:"S",number:Math.max(1,Math.min(20,Number(raw?.number||20))),ring:normalizeSingleRing(raw?.ring)};
}
export function looperDartMatchesTarget(d:any,target:any,exact=true):boolean {
  const t=normalizeTarget(target);
  if(!d||!isScoring(d)) return false;
  if(t.bed==="IB"||t.bed==="OB") return d.bed===t.bed;
  if(Number(d.number||0)!==Number(t.number||0)) return false;
  if(!exact) return isNumberBed(d);
  if(d.bed!==t.bed) return false;
  if(t.bed!=="S") return true;
  const targetRing=normalizeSingleRing(t.ring);
  const dartRing=normalizeSingleRing(d.ring);
  if(targetRing==="single") return d.bed==="S";
  return dartRing===targetRing;
}
function randomTarget():LooperTarget {
  const n=1+Math.floor(Math.random()*20);
  const r=Math.random();
  if(r<.12) return {bed:"D",number:n,ring:"double"};
  if(r<.21) return {bed:"T",number:n,ring:"triple"};
  if(r<.25) return {bed:"OB",ring:"bull"};
  return {bed:"S",number:n,ring:Math.random()<.5?"inner_single":"outer_single"};
}
function sameTarget(a:any,b:any){return looperTargetLabel(a)===looperTargetLabel(b);}
function nextDifferentTarget(t:LooperTarget):LooperTarget {
  if(t.bed==="IB"||t.bed==="OB") return {bed:"S",number:20,ring:"inner_single"};
  const n=((Number(t.number||20))%20)+1;
  return {bed:t.bed,number:n,ring:t.ring};
}
export function normalizeLooperConfig(raw:any):LooperConfigPayload {
  const r=raw?.rules||{}; const ids=Array.isArray(raw?.selectedIds)?raw.selectedIds.map(String):[];
  return {mode:"looper",selectedIds:ids,players:Math.max(2,Number(raw?.players||ids.length||2)),playersList:Array.isArray(raw?.playersList)?raw.playersList:[],botIds:Array.isArray(raw?.botIds)?raw.botIds.map(String):[],botsEnabled:Boolean(raw?.botsEnabled),botLevel:raw?.botLevel==="easy"||raw?.botLevel==="hard"?raw.botLevel:"normal",randomOrder:raw?.randomOrder!==false,scoreInputMethod:raw?.scoreInputMethod==="dartboard"?"dartboard":"keypad",seriesWins:raw?.seriesWins===2||raw?.seriesWins===3?raw.seriesWins:1,sfxEnabled:raw?.sfxEnabled!==false,awenaEnabled:raw?.awenaEnabled!==false,coachEnabled:raw?.coachEnabled!==false,firstVisitGuide:raw?.firstVisitGuide!==false,rules:{lives:[3,4,5].includes(Number(r?.lives))?Number(r.lives):5,startTarget:r?.startTarget==="random"?"random":"offhand",exactSegment:r?.exactSegment!==false,numberLoopsEnabled:r?.numberLoopsEnabled!==false,setterShield:r?.setterShield!==false}};
}
function aliveIds(s:LooperState){return s.players.filter(p=>Number(s.lives[p.id]||0)>0).map(p=>p.id);}
function nextAliveIndex(s:LooperState,from:number){const total=s.players.length||1;for(let step=1;step<=total;step++){const idx=(from+step)%total;if(Number(s.lives[s.players[idx].id]||0)>0)return idx;}return from;}
export function createLooperState(players:Player[],raw:any):LooperState {
  const config=normalizeLooperConfig(raw); const ps=(players||[]).map((p,i)=>({id:String(p?.id||`p${i+1}`),name:String(p?.name||`Joueur ${i+1}`)}));
  return {sport:"darts",mode:"looper",config,players:ps,lives:Object.fromEntries(ps.map(p=>[p.id,config.rules.lives])),shields:Object.fromEntries(ps.map(p=>[p.id,0])),legWins:Object.fromEntries(ps.map(p=>[p.id,0])),statsByPlayer:Object.fromEntries(ps.map(p=>[p.id,blank()])),activePlayerIndex:0,legIndex:0,turnIndex:0,phase:config.rules.startTarget==="offhand"?"assignment":"playing",winnerId:null,lastLegWinnerId:null,currentTarget:randomTarget(),setterId:null,visits:[],startedAt:Date.now()};
}
export function cloneLooperState(raw:LooperState):LooperState {
  const s:any=clone(raw); s.currentTarget=normalizeTarget(s.currentTarget);
  if(Array.isArray(s.visits)) s.visits=s.visits.map((v:any)=>({...v,targetBefore:normalizeTarget(v.targetBefore),targetAfter:normalizeTarget(v.targetAfter)}));
  for(const p of s.players||[]){s.statsByPlayer[p.id]={...blank(),...(s.statsByPlayer?.[p.id]||{})};}
  return s;
}
export function assignLooperTarget(input:LooperState,dart:GameDart):LooperState {
  const s=cloneLooperState(input); if(s.phase!=="assignment")return s;
  s.currentTarget=looperTargetFromDart(dart,randomTarget()); s.setterId=s.players[s.activePlayerIndex]?.id||null; s.phase="playing";
  return s;
}
function resetLeg(s:LooperState){s.legIndex++;s.turnIndex=0;s.activePlayerIndex=0;s.phase=s.config.rules.startTarget==="offhand"?"assignment":"playing";s.currentTarget=randomTarget();s.setterId=null;s.lives=Object.fromEntries(s.players.map(p=>[p.id,s.config.rules.lives]));s.shields=Object.fromEntries(s.players.map(p=>[p.id,0]));for(const p of s.players){s.statsByPlayer[p.id].currentHitStreak=0;}}
function awardLeg(s:LooperState,winnerId:string){s.lastLegWinnerId=winnerId;s.legWins[winnerId]=Number(s.legWins[winnerId]||0)+1;s.statsByPlayer[winnerId].legsWon++;if(s.legWins[winnerId]>=s.config.seriesWins){s.phase="finished";s.winnerId=winnerId;s.finishedAt=Date.now();return;}resetLeg(s);}
export function playLooperVisit(input:LooperState,dartsRaw:GameDart[]):LooperState {
  const s=cloneLooperState(input); if(s.phase!=="playing"||!s.players.length)return s;
  const p=s.players[s.activePlayerIndex]; if(!p||Number(s.lives[p.id]||0)<=0)return s;
  const darts=(dartsRaw||[]).slice(0,3); const beforeLives=clone(s.lives); const st=s.statsByPlayer[p.id]||(s.statsByPlayer[p.id]=blank()); st.visits++;
  const targetBefore=clone(s.currentTarget); const events:string[]=[]; let hitIndex=-1;
  for(let i=0;i<darts.length;i++){const d:any=darts[i];st.darts++;if(hitIndex<0&&looperDartMatchesTarget(d,s.currentTarget,s.config.rules.exactSegment)){hitIndex=i;st.hits++;st.currentHitStreak++;st.bestHitStreak=Math.max(st.bestHitStreak,st.currentHitStreak);events.push(`${p.name} touche ${looperTargetLabel(s.currentTarget)} avec la fléchette ${i+1}`);}else if(hitIndex<0)st.misses++;}
  const hit=hitIndex>=0;
  if(hit){
    st.loopsSurvived++;
    const candidates=darts.slice(hitIndex+1).filter(isScoring);
    let nextTarget=candidates.length?looperTargetFromDart(candidates[candidates.length-1],s.currentTarget):clone(s.currentTarget);
    if(!s.config.rules.numberLoopsEnabled&&sameTarget(nextTarget,s.currentTarget))nextTarget=nextDifferentTarget(nextTarget);
    s.currentTarget=nextTarget;s.setterId=p.id;st.targetsSet++;
    if(nextTarget.bed==="OB"||nextTarget.bed==="IB")st.bullTargets++;
    events.push(candidates.length?`Nouvelle cible : ${looperTargetLabel(nextTarget)}`:`Cible conservée : ${looperTargetLabel(nextTarget)}`);
    if(s.config.rules.setterShield){if(Number(s.shields[p.id]||0)<1)st.shieldsEarned++;s.shields[p.id]=1;events.push("Bouclier poseur actif");}
  } else {
    st.currentHitStreak=0;
    if(Number(s.shields[p.id]||0)>0){s.shields[p.id]=Number(s.shields[p.id]||0)-1;st.shieldsUsed++;events.push(`${p.name} consomme un bouclier`);}else{s.lives[p.id]=Math.max(0,Number(s.lives[p.id]||0)-1);st.lifeLosses++;events.push(`${p.name} perd 1 vie`);}
  }
  const alive=aliveIds(s); const visit={id:uid("loopv"),playerId:p.id,leg:s.legIndex+1,turn:s.turnIndex+1,darts,targetBefore,targetAfter:clone(s.currentTarget),beforeLives,afterLives:clone(s.lives),hit,hitIndex,events}; s.visits.push(visit);s.turnIndex++;
  if(alive.length===1){awardLeg(s,alive[0]);return s;}
  s.activePlayerIndex=nextAliveIndex(s,s.activePlayerIndex);return s;
}
function chance(level:LooperBotLevel){return level==="hard"?.84:level==="easy"?.44:.64;}
function dartForTarget(t:LooperTarget):GameDart {
  if(t.bed==="IB")return{bed:"IB",ring:"dbull"} as any;if(t.bed==="OB")return{bed:"OB",ring:"bull"} as any;
  return{bed:t.bed,number:t.number,ring:t.ring} as any;
}
function randomMiss(target:LooperTarget):GameDart {if(Math.random()<.18)return{bed:"MISS"};let t=randomTarget();if(sameTarget(t,target))t=nextDifferentTarget(t);return dartForTarget(t);}
export function pickLooperBotDarts(input:LooperState,level:LooperBotLevel="normal"):GameDart[]{
  const s=cloneLooperState(input); if(s.phase==="assignment")return[dartForTarget(randomTarget())]; const p=s.players[s.activePlayerIndex];if(!p)return[];
  const out:GameDart[]=[];const good=Math.random()<chance(level);let hitDone=false;
  for(let i=0;i<3;i++){if(!hitDone&&good&&(i===0||Math.random()<.72)){out.push(dartForTarget(s.currentTarget));hitDone=true;continue;}if(hitDone){let setter=randomTarget();if(level==="hard"&&Math.random()<.42)setter={bed:"D",number:1+Math.floor(Math.random()*20),ring:"double"};out.push(dartForTarget(setter));continue;}out.push(randomMiss(s.currentTarget));}
  return out.slice(0,3);
}
