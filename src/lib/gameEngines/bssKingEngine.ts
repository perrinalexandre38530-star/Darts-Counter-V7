// @ts-nocheck
import type { GameDart, Player } from "../types-game";

export type BssBotLevel = "easy" | "normal" | "hard";
export type BssChallengeKind = "open" | "double" | "triple" | "target" | "bull" | "low" | "high" | "throne";
export type BssConfigPayload = {
  mode: "bss_king";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: BssBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  rules: { badgesToThrone: number; chaosEnabled: boolean; throneFinish: "bull" | "dbull" };
};
export type BssChallenge = { kind:BssChallengeKind; title:string; subtitle:string; icon:string; target?:number; };
export type BssStats = { darts:number; visits:number; challengeWins:number; badgesWon:number; influence:number; bulls:number; dbulls:number; doubles:number; triples:number; misses:number; throneAttempts:number; bestVisit:number; };
export type BssVisit = { id:string; playerId:string; round:number; challenge:BssChallenge; darts:GameDart[]; score:number; events:string[]; };
export type BssState = {
  sport:"darts"; mode:"bss_king"; config:BssConfigPayload; players:Player[];
  badges:Record<string,number>; influence:Record<string,number>; statsByPlayer:Record<string,BssStats>;
  activePlayerIndex:number; round:number; challenge:BssChallenge; roundScores:Record<string,number>;
  roundPlayedIds:string[]; throneReady:Record<string,boolean>; phase:"playing"|"finished"; winnerId:string|null;
  visits:BssVisit[]; events:string[]; startedAt:number; finishedAt?:number;
};

const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const uid=(p="bss")=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const blankStats=():BssStats=>({darts:0,visits:0,challengeWins:0,badgesWon:0,influence:0,bulls:0,dbulls:0,doubles:0,triples:0,misses:0,throneAttempts:0,bestVisit:0});
const TARGETS=[20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];

export function normalizeBssConfig(raw:any):BssConfigPayload {
  const r=raw?.rules||{}; const ids=Array.isArray(raw?.selectedIds)?raw.selectedIds.map(String):[];
  return { mode:"bss_king", selectedIds:ids, players:Math.max(2,Number(raw?.players||ids.length||2)), playersList:Array.isArray(raw?.playersList)?raw.playersList:[], botIds:Array.isArray(raw?.botIds)?raw.botIds.map(String):[], botsEnabled:Boolean(raw?.botsEnabled), botLevel:raw?.botLevel==="easy"||raw?.botLevel==="hard"?raw.botLevel:"normal", randomOrder:raw?.randomOrder!==false, scoreInputMethod:raw?.scoreInputMethod==="dartboard"?"dartboard":"keypad", seriesWins:raw?.seriesWins===2||raw?.seriesWins===3?raw.seriesWins:1, rules:{badgesToThrone:[3,5,7].includes(Number(r?.badgesToThrone))?Number(r.badgesToThrone):5, chaosEnabled:r?.chaosEnabled!==false, throneFinish:r?.throneFinish==="dbull"?"dbull":"bull"} };
}

function challengeForRound(round:number, chaos:boolean):BssChallenge {
  const target=TARGETS[(Math.max(1,round)-1)%TARGETS.length];
  const classic:BssChallenge[]=[
    {kind:"open",title:"TOURNÉE LIBRE",subtitle:"Simple 1 · Double 2 · Triple 3 · Bull 2/4",icon:"🍻"},
    {kind:"target",title:`LE ${target} À LA CARTE`,subtitle:`Seul le secteur ${target} marque · S1 D2 T3`,icon:"🎯",target},
    {kind:"double",title:"DOUBLE OU RIEN",subtitle:"Seuls les Doubles marquent · 3 points",icon:"✌️"},
    {kind:"bull",title:"TOURNÉE DU PATRON",subtitle:"Bull 25 = 2 · DBull 50 = 5",icon:"👑"},
  ];
  const chaosDeck:BssChallenge[]=[
    ...classic,
    {kind:"triple",title:"TRIPLE PRESSION",subtitle:"Seuls les Triples marquent · 4 points",icon:"⚡"},
    {kind:"low",title:"PETITS JOUEURS",subtitle:"Seuls les secteurs 1 à 10 marquent",icon:"😈"},
    {kind:"high",title:"GROSSES TÊTES",subtitle:"Seuls les secteurs 11 à 20 marquent",icon:"🔥"},
  ];
  const deck=chaos?chaosDeck:classic;
  return clone(deck[(Math.max(1,round)-1)%deck.length]);
}

export function createBssState(players:Player[], raw:any):BssState {
  const config=normalizeBssConfig(raw); const ps=(players||[]).map((p,i)=>({id:String(p?.id||`p${i+1}`),name:String(p?.name||`Joueur ${i+1}`)}));
  return {sport:"darts",mode:"bss_king",config,players:ps,badges:Object.fromEntries(ps.map(p=>[p.id,0])),influence:Object.fromEntries(ps.map(p=>[p.id,0])),statsByPlayer:Object.fromEntries(ps.map(p=>[p.id,blankStats()])),activePlayerIndex:0,round:1,challenge:challengeForRound(1,config.rules.chaosEnabled),roundScores:Object.fromEntries(ps.map(p=>[p.id,0])),roundPlayedIds:[],throneReady:Object.fromEntries(ps.map(p=>[p.id,false])),phase:"playing",winnerId:null,visits:[],events:["Bienvenue chez les BSS : le trône attend son KING."],startedAt:Date.now()};
}
export function cloneBssState(raw:BssState):BssState { const s:any=clone(raw); for(const p of s.players||[]) s.statsByPlayer[p.id]={...blankStats(),...(s.statsByPlayer?.[p.id]||{})}; return s; }

function dartScore(d:any,c:BssChallenge){
  if(!d||d.bed==="MISS")return 0;
  if(c.kind==="throne") return d.bed==="IB"?2:d.bed==="OB"?1:0;
  if(c.kind==="bull") return d.bed==="IB"?5:d.bed==="OB"?2:0;
  if(d.bed==="IB"||d.bed==="OB") return c.kind==="open"?(d.bed==="IB"?4:2):0;
  const n=Number(d.number||0); const mult=d.bed==="T"?3:d.bed==="D"?2:1;
  if(c.kind==="double") return d.bed==="D"?3:0;
  if(c.kind==="triple") return d.bed==="T"?4:0;
  if(c.kind==="target") return n===Number(c.target||0)?mult:0;
  if(c.kind==="low") return n>=1&&n<=10?mult:0;
  if(c.kind==="high") return n>=11&&n<=20?mult:0;
  return mult;
}
export function evaluateBssVisit(darts:GameDart[], challenge:BssChallenge){ return (darts||[]).slice(0,3).reduce((sum,d)=>sum+dartScore(d,challenge),0); }

function finishRound(s:BssState){
  const rows=s.players.map(p=>({id:p.id,score:Number(s.roundScores[p.id]||0)})).sort((a,b)=>b.score-a.score);
  const best=rows[0]?.score||0; const winners=best>0?rows.filter(r=>r.score===best):[];
  if(winners.length===1){
    const id=winners[0].id; const p=s.players.find(x=>x.id===id); s.badges[id]=Number(s.badges[id]||0)+1; const st=s.statsByPlayer[id]; st.challengeWins++; st.badgesWon++; s.events.push(`${p?.name||"Joueur"} remporte la tournée ${s.round} et gagne un écusson BSS.`);
    if(s.badges[id]>=s.config.rules.badgesToThrone&&!s.throneReady[id]){ s.throneReady[id]=true; s.events.push(`${p?.name||"Joueur"} a assez d’écussons : PROCHAINE ÉTAPE, LE TRÔNE !`); }
  } else if(winners.length>1) s.events.push(`Égalité sur la tournée ${s.round} : aucun écusson distribué.`);
  else s.events.push(`Tournée ${s.round} blanche : personne ne marque.`);
  s.round+=1; s.roundScores=Object.fromEntries(s.players.map(p=>[p.id,0])); s.roundPlayedIds=[]; s.challenge=challengeForRound(s.round,s.config.rules.chaosEnabled);
}

export function playBssVisit(input:BssState,dartsRaw:GameDart[]):BssState{
  const s=cloneBssState(input); if(s.phase!=="playing"||!s.players.length)return s; const p=s.players[s.activePlayerIndex]; if(!p)return s;
  const darts=(dartsRaw||[]).slice(0,3); const throne=Boolean(s.throneReady[p.id]); const challenge:BssChallenge=throne?{kind:"throne",title:"PRENDS LE TRÔNE",subtitle:s.config.rules.throneFinish==="dbull"?"DBULL 50 obligatoire":"Bull 25 ou DBULL 50",icon:"👑"}:s.challenge;
  const st=s.statsByPlayer[p.id]||(s.statsByPlayer[p.id]=blankStats()); st.visits++; st.darts+=darts.length; let score=evaluateBssVisit(darts,challenge); st.bestVisit=Math.max(st.bestVisit,score); st.influence+=score; s.influence[p.id]=Number(s.influence[p.id]||0)+score;
  for(const d of darts){ if(d?.bed==="MISS")st.misses++; if(d?.bed==="D")st.doubles++; if(d?.bed==="T")st.triples++; if(d?.bed==="OB")st.bulls++; if(d?.bed==="IB")st.dbulls++; }
  const events:string[]=[];
  if(throne){ st.throneAttempts++; const hasDbull=darts.some(d=>d?.bed==="IB"),hasBull=darts.some(d=>d?.bed==="OB"); const crowned=s.config.rules.throneFinish==="dbull"?hasDbull:(hasDbull||hasBull); if(crowned){ s.phase="finished"; s.winnerId=p.id; s.finishedAt=Date.now(); events.push(hasDbull?`${p.name} plante le DBULL et devient BSS KING !`:`${p.name} touche le BULL et s’assoit sur le trône BSS !`); s.events.push(...events); s.visits.push({id:uid("bssv"),playerId:p.id,round:s.round,challenge,darts,score,events}); return s; } events.push(`${p.name} rate le couronnement. Le trône reste libre.`); }
  else { s.roundScores[p.id]=score; events.push(score>0?`${p.name} marque ${score} point${score>1?"s":""} d’influence.`:`${p.name} ne marque rien sur ce défi.`); s.roundPlayedIds.push(p.id); }
  s.events.push(...events); s.visits.push({id:uid("bssv"),playerId:p.id,round:s.round,challenge,darts,score,events});
  s.activePlayerIndex=(s.activePlayerIndex+1)%s.players.length;
  if(!throne && s.roundPlayedIds.length>=s.players.length) finishRound(s);
  return s;
}

function hit(level:BssBotLevel){return level==="hard"?.86:level==="easy"?.46:.66;}
function missOr(d:GameDart,level:BssBotLevel):GameDart{return Math.random()<hit(level)?d:{bed:"MISS"};}
export function pickBssBotDarts(input:BssState, level:BssBotLevel="normal"):GameDart[]{
  const s=cloneBssState(input); const p=s.players[s.activePlayerIndex]; if(!p)return[]; const throne=Boolean(s.throneReady[p.id]); const c=throne?{kind:"throne",target:0}:s.challenge;
  const one=():GameDart=>{ if(c.kind==="throne") return missOr({bed:s.config.rules.throneFinish==="dbull"?"IB":"OB"},level); if(c.kind==="bull")return missOr({bed:Math.random()<.35?"IB":"OB"},level); if(c.kind==="double")return missOr({bed:"D",number:16+Math.floor(Math.random()*5)},level); if(c.kind==="triple")return missOr({bed:"T",number:18+Math.floor(Math.random()*3)},level); if(c.kind==="target")return missOr({bed:Math.random()<.4?"T":Math.random()<.55?"D":"S",number:Number((c as any).target||20)},level); if(c.kind==="low")return missOr({bed:Math.random()<.35?"T":"S",number:7+Math.floor(Math.random()*4)},level); if(c.kind==="high")return missOr({bed:Math.random()<.45?"T":"S",number:17+Math.floor(Math.random()*4)},level); return missOr({bed:Math.random()<.45?"T":Math.random()<.65?"D":"S",number:18+Math.floor(Math.random()*3)},level); };
  return [one(),one(),one()];
}
