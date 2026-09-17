// @ts-nocheck
// =============================================================
// PENDU — moteur pur
// Défis de fléchettes, erreurs progressives et élimination.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type PenduBotLevel = "easy" | "normal" | "hard";
export type PenduChallenge = { kind: "segment"; number: number; bed: "S" | "D" | "T" } | { kind: "score"; target: number };
export type PenduConfigPayload = {
  mode: "pendu";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: PenduBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  rules: {
    partsToLose: 6 | 8;
    challengeMode: "caller" | "random" | "mixed";
    targetFamily: "segments" | "scores" | "mixed";
    executionMode: "strict" | "flex";
  };
};
export type PenduPlayerStats = { darts:number; visits:number; challengesSet:number; challengesPassed:number; challengesFailed:number; errorsTaken:number; eliminations:number; legsWon:number; bestVisit:number; };
export type PenduVisit = { id:string; playerId:string; leg:number; turn:number; phase:"caller"|"copy"; challenge:PenduChallenge; darts:GameDart[]; score:number; success:boolean; events:string[]; };
export type PenduState = {
  sport:"darts"; mode:"pendu"; config:PenduConfigPayload; players:Player[];
  errors:Record<string,number>; eliminated:Record<string,boolean>; legWins:Record<string,number>; statsByPlayer:Record<string,PenduPlayerStats>;
  activePlayerIndex:number; callerPlayerIndex:number; copyQueue:string[]; copyIndex:number; challenge:PenduChallenge;
  legIndex:number; turnIndex:number; phase:"caller"|"copy"|"finished"; winnerId:string|null; lastLegWinnerId:string|null;
  visits:PenduVisit[]; startedAt:number; finishedAt?:number;
};

function clone<T>(v:T):T{return JSON.parse(JSON.stringify(v));}
function id(prefix="pendu"){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;}
function blankStats():PenduPlayerStats{return{darts:0,visits:0,challengesSet:0,challengesPassed:0,challengesFailed:0,errorsTaken:0,eliminations:0,legsWon:0,bestVisit:0};}
function scoreDart(d:GameDart){if(!d||d.bed==="MISS")return 0;if(d.bed==="IB")return 50;if(d.bed==="OB")return 25;const n=Number(d.number||0);return n*(d.bed==="T"?3:d.bed==="D"?2:1);}
function scoreVisit(ds:GameDart[]){return(ds||[]).slice(0,3).reduce((s,d)=>s+scoreDart(d),0);}
function aliveIds(state:PenduState){return state.players.filter(p=>!state.eliminated[p.id]).map(p=>p.id);}
function nextAliveIndex(state:PenduState,from:number){for(let s=1;s<=state.players.length;s++){const i=(from+s)%state.players.length;const p=state.players[i];if(p&&!state.eliminated[p.id])return i;}return from;}
function orderedAliveIdsAfter(state:PenduState,from:number){const out:string[]=[];for(let s=1;s<state.players.length;s++){const i=(from+s)%state.players.length;const p=state.players[i];if(p&&!state.eliminated[p.id])out.push(p.id);}return out;}

export function normalizePenduConfig(raw:any):PenduConfigPayload{
  const rules=raw?.rules||{}; const selectedIds=Array.isArray(raw?.selectedIds)?raw.selectedIds.map(String):[];
  return{mode:"pendu",selectedIds,players:Math.max(2,Number(raw?.players||selectedIds.length||2)),playersList:Array.isArray(raw?.playersList)?raw.playersList:[],botIds:Array.isArray(raw?.botIds)?raw.botIds.map(String):[],botsEnabled:Boolean(raw?.botsEnabled),botLevel:raw?.botLevel==="easy"||raw?.botLevel==="hard"?raw.botLevel:"normal",randomOrder:raw?.randomOrder!==false,scoreInputMethod:raw?.scoreInputMethod==="dartboard"?"dartboard":"keypad",seriesWins:raw?.seriesWins===2||raw?.seriesWins===3?raw.seriesWins:1,rules:{partsToLose:rules?.partsToLose===8?8:6,challengeMode:["random","mixed"].includes(rules?.challengeMode)?rules.challengeMode:"caller",targetFamily:["scores","mixed"].includes(rules?.targetFamily)?rules.targetFamily:"segments",executionMode:rules?.executionMode==="flex"?"flex":"strict"}};
}

export function randomPenduChallenge(configOrRules:any):PenduChallenge{
  const rules=configOrRules?.rules||configOrRules||{}; const family=String(rules.targetFamily||"segments"); const scoreMode=family==="scores"||(family==="mixed"&&Math.random()<.45);
  if(scoreMode){const pool=[30,40,45,50,55,60,65,70,75,80,90,100];return{kind:"score",target:pool[Math.floor(Math.random()*pool.length)]||50};}
  const r=Math.random(); const bed:"S"|"D"|"T"=r<.58?"S":r<.84?"D":"T"; return{kind:"segment",number:1+Math.floor(Math.random()*20),bed};
}
export function penduChallengeLabel(c:PenduChallenge,executionMode="strict"){if(c.kind==="score")return`${executionMode==="flex"?"≥ ":""}${c.target} pts`;return`${c.bed}${c.number}`;}
function succeeds(c:PenduChallenge,darts:GameDart[],config:PenduConfigPayload){if(c.kind==="score"){const sc=scoreVisit(darts);return config.rules.executionMode==="flex"?sc>=c.target:sc===c.target;}return(darts||[]).some(d=>{if(!d||Number(d.number||0)!==c.number)return false;if(config.rules.executionMode==="strict")return d.bed===c.bed;const rank:any={S:1,D:2,T:3};return Number(rank[d.bed]||0)>=Number(rank[c.bed]||0);});}
function startCycle(state:PenduState,callerIndex:number){state.callerPlayerIndex=callerIndex;state.activePlayerIndex=callerIndex;state.copyQueue=[];state.copyIndex=0;state.challenge=randomPenduChallenge(state.config);state.phase="caller";return state;}
function resetLeg(state:PenduState,starter:number){state.legIndex+=1;state.turnIndex=0;state.errors=Object.fromEntries(state.players.map(p=>[p.id,0]));state.eliminated=Object.fromEntries(state.players.map(p=>[p.id,false]));startCycle(state,starter);}
function winLeg(state:PenduState,winnerId:string){state.lastLegWinnerId=winnerId;state.legWins[winnerId]=Number(state.legWins[winnerId]||0)+1;state.statsByPlayer[winnerId].legsWon+=1;if(state.legWins[winnerId]>=state.config.seriesWins){state.phase="finished";state.winnerId=winnerId;state.finishedAt=Date.now();return state;}const wi=Math.max(0,state.players.findIndex(p=>p.id===winnerId));resetLeg(state,(wi+1)%state.players.length);return state;}
function checkWinner(state:PenduState){const alive=aliveIds(state);if(alive.length===1)return winLeg(state,alive[0]);return state;}

export function createPenduState(players:Player[],rawConfig:any):PenduState{
 const config=normalizePenduConfig(rawConfig);const safe=(players||[]).map((p,i)=>({id:String(p?.id||`p${i+1}`),name:String(p?.name||`Joueur ${i+1}`)}));
 const state:PenduState={sport:"darts",mode:"pendu",config,players:safe,errors:Object.fromEntries(safe.map(p=>[p.id,0])),eliminated:Object.fromEntries(safe.map(p=>[p.id,false])),legWins:Object.fromEntries(safe.map(p=>[p.id,0])),statsByPlayer:Object.fromEntries(safe.map(p=>[p.id,blankStats()])),activePlayerIndex:0,callerPlayerIndex:0,copyQueue:[],copyIndex:0,challenge:randomPenduChallenge(config),legIndex:0,turnIndex:0,phase:"caller",winnerId:null,lastLegWinnerId:null,visits:[],startedAt:Date.now()};return state;
}
export function clonePenduState(s:PenduState):PenduState{return clone(s);}
export function setPenduChallenge(input:PenduState,challenge:PenduChallenge):PenduState{const s=clonePenduState(input);if(s.phase==="caller")s.challenge=clone(challenge);return s;}

export function playPenduVisit(input:PenduState,dartsRaw:GameDart[]):PenduState{
 const state=clonePenduState(input);if(state.phase==="finished")return state;const player=state.players[state.activePlayerIndex];if(!player)return state;const darts=(dartsRaw||[]).slice(0,3);const success=succeeds(state.challenge,darts,state.config);const stats=state.statsByPlayer[player.id]||(state.statsByPlayer[player.id]=blankStats());stats.visits+=1;stats.darts+=darts.length;stats.bestVisit=Math.max(stats.bestVisit,scoreVisit(darts));const events:string[]=[];
 if(state.phase==="caller")stats.challengesSet+=1;if(success){stats.challengesPassed+=1;events.push(`${player.name} réussit ${penduChallengeLabel(state.challenge,state.config.rules.executionMode)}`);}else{stats.challengesFailed+=1;state.errors[player.id]=Number(state.errors[player.id]||0)+1;stats.errorsTaken+=1;events.push(`${player.name} rate : ${state.errors[player.id]}/${state.config.rules.partsToLose}`);if(state.errors[player.id]>=state.config.rules.partsToLose){state.eliminated[player.id]=true;stats.eliminations+=1;events.push(`${player.name} est PENDU`);}}
 state.visits.push({id:id("pendu-visit"),playerId:player.id,leg:state.legIndex+1,turn:state.turnIndex+1,phase:state.phase,challenge:clone(state.challenge),darts,score:scoreVisit(darts),success,events});state.turnIndex+=1;
 const alive=aliveIds(state);if(alive.length===1)return winLeg(state,alive[0]);
 if(state.phase==="caller"){
   if(!success){const next=nextAliveIndex(state,state.callerPlayerIndex);return startCycle(state,next);}
   const queue=orderedAliveIdsAfter(state,state.callerPlayerIndex);state.copyQueue=queue;state.copyIndex=0;state.phase="copy";const first=queue[0];state.activePlayerIndex=Math.max(0,state.players.findIndex(p=>p.id===first));return state;
 }
 let pos=state.copyIndex+1;while(pos<state.copyQueue.length&&state.eliminated[state.copyQueue[pos]])pos++;if(pos<state.copyQueue.length){state.copyIndex=pos;state.activePlayerIndex=Math.max(0,state.players.findIndex(p=>p.id===state.copyQueue[pos]));return state;}
 const nextCaller=nextAliveIndex(state,state.callerPlayerIndex);return startCycle(state,nextCaller);
}

function skill(level:PenduBotLevel){return level==="hard"?.78:level==="easy"?.36:.57;}
function randomDart():GameDart{const n=1+Math.floor(Math.random()*20);const r=Math.random();return{bed:r<.72?"S":r<.90?"D":"T",number:n} as GameDart;}
function scorePlan(target:number):GameDart[]{let rem=Math.max(0,Math.min(180,Math.round(target)));const out:GameDart[]=[];for(let i=0;i<3;i++){if(rem<=0)break;if(rem>=60){out.push({bed:"T",number:20});rem-=60;continue;}if(rem===50){out.push({bed:"IB"});rem=0;continue;}if(rem===25){out.push({bed:"OB"});rem=0;continue;}if(rem<=20){out.push({bed:"S",number:rem});rem=0;continue;}if(rem%3===0&&rem/3<=20){out.push({bed:"T",number:rem/3});rem=0;continue;}if(rem%2===0&&rem/2<=20){out.push({bed:"D",number:rem/2});rem=0;continue;}out.push({bed:"S",number:Math.min(20,rem)});rem-=Math.min(20,rem);}while(out.length<3)out.push({bed:"MISS"});return out.slice(0,3);}
export function pickPenduBotDarts(state:PenduState,level:PenduBotLevel="normal"):GameDart[]{const ok=Math.random()<skill(level);const c=state.challenge;if(c.kind==="segment"){if(ok)return[{bed:c.bed,number:c.number},randomDart(),randomDart()];return Array.from({length:3},()=>{let d=randomDart();if(Number(d.number)===c.number&&d.bed===c.bed)d={bed:"S",number:(c.number%20)+1};return d;});}if(ok){const target=state.config.rules.executionMode==="flex"?Math.min(170,c.target+Math.floor(Math.random()*20)):c.target;return scorePlan(target);}return scorePlan(Math.max(0,c.target-10-Math.floor(Math.random()*25)));}
