// @ts-nocheck
// =============================================================
// GOTCHA — moteur pur
// Course depuis 0, GOTCHA adverse, bust et sorties S/D/M.
// =============================================================
import type { GameDart, Player } from "../types-game";

export type GotchaBotLevel = "easy" | "normal" | "hard";
export type GotchaConfigPayload = {
  mode: "gotcha";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: GotchaBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  sfxEnabled?: boolean;
  awenaEnabled?: boolean;
  coachEnabled?: boolean;
  rules: { targetScore: number; outMode: "straight" | "double" | "master"; maxRounds: number; bustRule: "turn" | "zero"; gotchaReset?: "zero" };
};
export type GotchaStats = { darts: number; visits: number; points: number; gotchas: number; victims: number; busts: number; singles: number; doubles: number; triples: number; bulls: number; dbulls: number; misses: number; legsWon: number; bestVisit: number; bestGotchaVisit: number; highestScore: number; exactFinishes: number; };
export type GotchaVisit = { id: string; playerId: string; leg: number; round: number; darts: GameDart[]; startScore: number; endScore: number; visitScore: number; bust: boolean; gotchaVictimIds: string[]; events: string[]; };
export type GotchaState = { sport: "darts"; mode: "gotcha"; config: GotchaConfigPayload; players: Player[]; scores: Record<string, number>; legWins: Record<string, number>; statsByPlayer: Record<string, GotchaStats>; activePlayerIndex: number; roundIndex: number; legIndex: number; turnIndex: number; phase: "playing" | "finished"; winnerId: string | null; lastLegWinnerId: string | null; visits: GotchaVisit[]; startedAt: number; finishedAt?: number; };

function clone<T>(v:T):T { return JSON.parse(JSON.stringify(v)); }
function uid(prefix="gotcha") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
function blankStats(): GotchaStats { return { darts:0,visits:0,points:0,gotchas:0,victims:0,busts:0,singles:0,doubles:0,triples:0,bulls:0,dbulls:0,misses:0,legsWon:0,bestVisit:0,bestGotchaVisit:0,highestScore:0,exactFinishes:0 }; }
function hydrateState(s:GotchaState):GotchaState { s.statsByPlayer=Object.fromEntries((s.players||[]).map((p:any)=>[p.id,{...blankStats(),...(s.statsByPlayer?.[p.id]||{})}]));s.scores=Object.fromEntries((s.players||[]).map((p:any)=>[p.id,Number(s.scores?.[p.id]||0)]));s.legWins=Object.fromEntries((s.players||[]).map((p:any)=>[p.id,Number(s.legWins?.[p.id]||0)]));return s; }
export function dartScore(d: GameDart): number { if (!d || d.bed === "MISS") return 0; if (d.bed === "IB") return 50; if (d.bed === "OB") return 25; const n=Number(d.number||0); return n*(d.bed === "T"?3:d.bed === "D"?2:1); }
function validOut(d: GameDart | undefined, mode: GotchaConfigPayload["rules"]["outMode"]): boolean { if (mode === "straight") return true; if (!d) return false; if (mode === "double") return d.bed === "D" || d.bed === "IB"; return d.bed === "D" || d.bed === "T" || d.bed === "IB"; }
export function normalizeGotchaConfig(raw:any): GotchaConfigPayload { const rules=raw?.rules||{}; const selectedIds=Array.isArray(raw?.selectedIds)?raw.selectedIds.map(String):[]; return { mode:"gotcha", selectedIds, players:Math.max(2,Number(raw?.players||selectedIds.length||2)), playersList:Array.isArray(raw?.playersList)?raw.playersList:[], botIds:Array.isArray(raw?.botIds)?raw.botIds.map(String):[], botsEnabled:Boolean(raw?.botsEnabled), botLevel:raw?.botLevel==="easy"||raw?.botLevel==="hard"?raw.botLevel:"normal", randomOrder:raw?.randomOrder!==false, scoreInputMethod:raw?.scoreInputMethod==="dartboard"?"dartboard":"keypad", seriesWins:raw?.seriesWins===2||raw?.seriesWins===3?raw.seriesWins:1, sfxEnabled:raw?.sfxEnabled!==false, awenaEnabled:raw?.awenaEnabled!==false, coachEnabled:raw?.coachEnabled!==false, rules:{ targetScore:[201,301,401,501,601,701].includes(Number(rules?.targetScore))?Number(rules.targetScore):301, outMode:rules?.outMode==="double"||rules?.outMode==="master"?rules.outMode:"straight", maxRounds:[0,15,20,50,80].includes(Number(rules?.maxRounds))?Number(rules.maxRounds):0, bustRule:rules?.bustRule==="zero"?"zero":"turn", gotchaReset:"zero" } }; }
export function createGotchaState(players:Player[],rawConfig:any):GotchaState { const config=normalizeGotchaConfig(rawConfig); const ps=(players||[]).map((p,i)=>({id:String(p?.id||`p${i+1}`),name:String(p?.name||`Joueur ${i+1}`)})); return {sport:"darts",mode:"gotcha",config,players:ps,scores:Object.fromEntries(ps.map(p=>[p.id,0])),legWins:Object.fromEntries(ps.map(p=>[p.id,0])),statsByPlayer:Object.fromEntries(ps.map(p=>[p.id,blankStats()])),activePlayerIndex:0,roundIndex:0,legIndex:0,turnIndex:0,phase:"playing",winnerId:null,lastLegWinnerId:null,visits:[],startedAt:Date.now()}; }
export function cloneGotchaState(s:GotchaState):GotchaState { return hydrateState(clone(s)); }
function resetLeg(s:GotchaState){s.legIndex++;s.roundIndex=0;s.turnIndex=0;s.activePlayerIndex=0;s.scores=Object.fromEntries(s.players.map(p=>[p.id,0]));}
function awardLeg(s:GotchaState,winnerId:string){s.lastLegWinnerId=winnerId;s.legWins[winnerId]=Number(s.legWins[winnerId]||0)+1;s.statsByPlayer[winnerId].legsWon+=1;if(s.legWins[winnerId]>=s.config.seriesWins){s.phase="finished";s.winnerId=winnerId;s.finishedAt=Date.now();}else resetLeg(s);}
function limitWinner(s:GotchaState):string|null { if(!s.players.length)return null; const ranked=[...s.players].sort((a,b)=>{ const sd=Number(s.scores[b.id]||0)-Number(s.scores[a.id]||0); if(sd)return sd; const gd=Number(s.statsByPlayer[b.id]?.gotchas||0)-Number(s.statsByPlayer[a.id]?.gotchas||0); if(gd)return gd; return Number(s.statsByPlayer[a.id]?.darts||0)-Number(s.statsByPlayer[b.id]?.darts||0); }); return ranked[0]?.id||null; }
export function playGotchaVisit(input:GotchaState,dartsRaw:GameDart[]):GotchaState {
  const s=cloneGotchaState(input); if(s.phase!=="playing"||!s.players.length)return s;
  const darts=(dartsRaw||[]).slice(0,3); const p=s.players[s.activePlayerIndex]; const st=s.statsByPlayer[p.id]||(s.statsByPlayer[p.id]=blankStats());
  st.visits=Number(st.visits||0)+1; const start=Number(s.scores[p.id]||0); let running=start; let visitScore=0; let bust=false; let win=false; const events:string[]=[];
  for(const d of darts){
    st.darts=Number(st.darts||0)+1;
    if(!d||d.bed==="MISS"){st.misses=Number(st.misses||0)+1;continue;}
    if(d.bed==="S")st.singles=Number(st.singles||0)+1;
    if(d.bed==="D")st.doubles=Number(st.doubles||0)+1;
    if(d.bed==="T")st.triples=Number(st.triples||0)+1;
    if(d.bed==="OB"||d.bed==="IB"){st.bulls=Number(st.bulls||0)+1;if(d.bed==="IB")st.dbulls=Number(st.dbulls||0)+1;}
    const pts=dartScore(d); visitScore+=pts; const next=running+pts;
    if(next>s.config.rules.targetScore){bust=true;events.push("BUST — cible dépassée");break;}
    if(next===s.config.rules.targetScore&&!validOut(d,s.config.rules.outMode)){bust=true;events.push("BUST — sortie invalide");break;}
    running=next; if(running===s.config.rules.targetScore){win=true;events.push(`FINISH ${running}`);break;}
  }
  let victims:string[]=[];
  if(bust){st.busts=Number(st.busts||0)+1;running=s.config.rules.bustRule==="zero"?0:start;visitScore=0;}
  else {
    const gained=Math.max(0,running-start);st.points=Number(st.points||0)+gained;st.bestVisit=Math.max(Number(st.bestVisit||0),gained);st.highestScore=Math.max(Number(st.highestScore||0),running);
    if(win) st.exactFinishes=Number(st.exactFinishes||0)+1;
    if(!win&&running>0){
      victims=s.players.filter(q=>q.id!==p.id&&Number(s.scores[q.id]||0)===running).map(q=>q.id);
      if(victims.length){for(const id of victims)s.scores[id]=0;st.gotchas=Number(st.gotchas||0)+1;st.victims=Number(st.victims||0)+victims.length;st.bestGotchaVisit=Math.max(Number(st.bestGotchaVisit||0),victims.length);events.push(`GOTCHA ×${victims.length} !`);}
    }
  }
  s.scores[p.id]=running;s.visits.push({id:uid("gotcha-visit"),playerId:p.id,leg:s.legIndex+1,round:s.roundIndex+1,darts,startScore:start,endScore:running,visitScore,bust,gotchaVictimIds:victims,events});s.turnIndex++;
  if(win){awardLeg(s,p.id);return s;}
  const next=(s.activePlayerIndex+1)%s.players.length;const nextRound=next===0?s.roundIndex+1:s.roundIndex;s.activePlayerIndex=next;s.roundIndex=nextRound;
  if(s.phase==="playing"&&s.config.rules.maxRounds>0&&s.roundIndex>=s.config.rules.maxRounds){const w=limitWinner(s);if(w)awardLeg(s,w);}
  return s;
}

export function gotchaDartLabel(d:GameDart){if(!d||d.bed==="MISS")return"MISS";if(d.bed==="IB")return"DBULL";if(d.bed==="OB")return"BULL";return`${d.bed}${d.number||""}`;}
function targetDart(points:number,outMode:GotchaConfigPayload["rules"]["outMode"]):GameDart|null { if(points<=0)return null; if(points===50&&(outMode!=="straight"||Math.random()<.65))return{bed:"IB"}; if(points===25&&outMode==="straight")return{bed:"OB"}; if(points<=20&&(outMode==="straight"))return{bed:"S",number:points}; if(points<=40&&points%2===0&&(outMode==="double"||outMode==="master"))return{bed:"D",number:points/2}; if(points<=60&&points%3===0&&outMode==="master")return{bed:"T",number:points/3}; for(let n=20;n>=1;n--){if(points>=n*3)return{bed:"T",number:n};} return {bed:"S",number:Math.max(1,Math.min(20,points))}; }
function noisy(d:GameDart,hit:boolean):GameDart { if(hit)return d; if(Math.random()<.12)return{bed:"MISS"}; const base=Number(d.number||20);return{bed:"S",number:((base+Math.floor(Math.random()*7)-3+19)%20)+1}; }
export function pickGotchaBotDarts(s:GotchaState,level:GotchaBotLevel="normal"):GameDart[]{
  const p=s.players[s.activePlayerIndex];if(!p)return[];const chance=level==="hard"?.88:level==="easy"?.52:.70;let score=Number(s.scores[p.id]||0);const out:GameDart[]=[];
  for(let i=0;i<3;i++){
    const remaining=s.config.rules.targetScore-score;
    let desired=targetDart(remaining,s.config.rules.outMode)||{bed:"S",number:20};
    const candidates=s.players.filter(q=>q.id!==p.id).map(q=>({id:q.id,delta:Number(s.scores[q.id]||0)-score,target:Number(s.scores[q.id]||0)})).filter(x=>x.delta>0&&x.delta<=180&&x.target<s.config.rules.targetScore).sort((a,b)=>a.delta-b.delta);
    const gotchaChance=level==="hard"?.58:level==="normal"?.30:.12;
    if(remaining>60&&candidates.length&&Math.random()<gotchaChance){
      const tactical=candidates.find(x=>x.delta<=60)||candidates[0];desired=targetDart(tactical.delta,"straight")||desired;
    }
    const actual=noisy(desired,Math.random()<chance);out.push(actual);const nextScore=score+dartScore(actual);
    if(nextScore>s.config.rules.targetScore)break;score=nextScore;if(score>=s.config.rules.targetScore)break;
  }
  return out;
}
