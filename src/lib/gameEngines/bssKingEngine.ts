// @ts-nocheck
import type { GameDart, Player } from "../types-game";

export type BssBotLevel = "easy" | "normal" | "hard";
export type BssChallengeKind =
  | "open" | "double" | "triple" | "target" | "bull" | "low" | "high" | "throne"
  | "even" | "odd" | "triple_even" | "dbull" | "color" | "sequence" | "max_score" | "exact_score"
  | "no_miss" | "same_number" | "three_different" | "one_each_bed" | "sdt_target"
  | "ascending" | "descending" | "neighbors" | "bull_sandwich" | "mirror"
  | "avoid_target" | "three_colors" | "bull_double" | "min_score" | "double_target"
  | "big_single" | "small_single" | "color_area" | "color_bed" | "area_parity" | "area_range"
  | "color_target" | "color_bonus" | "area_bonus";
export type BssChallengeColor = "red" | "green" | "black" | "white";
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
  quickParty?: boolean;
  partyMode?: "quick" | "arcade";
  temporaryParticipants?: boolean;
  rules: { badgesToThrone: number; chaosEnabled: boolean; throneFinish: "bull" | "dbull" };
};
export type BssChallenge = {
  kind:BssChallengeKind;
  title:string;
  subtitle:string;
  icon:string;
  target?:number;
  targetColor?:BssChallengeColor;
  sequenceStart?:number;
  maxScore?:number;
  exactScore?:number;
  minScore?:number;
  targetArea?:"big"|"small";
  targetBed?:"S"|"D"|"T";
  targetParity?:"even"|"odd";
  targetRange?:"low"|"high";
};
export type BssStats = { darts:number; visits:number; challengeWins:number; badgesWon:number; influence:number; bulls:number; dbulls:number; doubles:number; triples:number; misses:number; throneAttempts:number; bestVisit:number; };
export type BssVisit = { id:string; playerId:string; round:number; challenge:BssChallenge; darts:GameDart[]; score:number; events:string[]; };
export type BssPlayedChallenge = { round:number; challenge:BssChallenge; winnerId:string|null; winnerIds:string[]; tie:boolean; blank:boolean; bestScore:number; };
export type BssState = {
  sport:"darts"; mode:"bss_king"; config:BssConfigPayload; players:Player[];
  badges:Record<string,number>; influence:Record<string,number>; statsByPlayer:Record<string,BssStats>;
  activePlayerIndex:number; round:number; challenge:BssChallenge; challengeQueue:BssChallenge[]; playedChallenges:BssPlayedChallenge[]; replayChallenges:BssChallenge[]; roundScores:Record<string,number>;
  roundPlayedIds:string[]; throneReady:Record<string,boolean>; phase:"playing"|"finished"; winnerId:string|null;
  visits:BssVisit[]; events:string[]; startedAt:number; finishedAt?:number;
};

const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const uid=(p="bss")=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const blankStats=():BssStats=>({darts:0,visits:0,challengeWins:0,badgesWon:0,influence:0,bulls:0,dbulls:0,doubles:0,triples:0,misses:0,throneAttempts:0,bestVisit:0});
const TARGETS=[20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];
const EXACT_SCORES=[21,24,27,30,32,36,40,42,45,50,51,54,57,60];
const MAX_SCORES=[20,25,30,35,40];
const MIN_SCORES=[45,50,60,75,90];
const COLORS:BssChallengeColor[]=["red","green","black","white"];
const BOARD_ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const RED_NUMBERS=new Set([20,12,14,8,7,3,2,10,13,18]);
const colorLabel:Record<BssChallengeColor,string>={red:"ROUGE",green:"VERT",black:"NOIR",white:"BLANC"};
const CORE_CHALLENGE_KINDS:BssChallengeKind[]=["open","target","double","triple","bull","low","high","even","odd"];
const WILD_CHALLENGE_KINDS:BssChallengeKind[]=[
  ...CORE_CHALLENGE_KINDS,
  "triple_even","dbull","color","sequence","max_score","exact_score","no_miss","same_number",
  "three_different","one_each_bed","sdt_target","ascending","descending","neighbors","bull_sandwich",
  "mirror","avoid_target","three_colors","bull_double","min_score","double_target","big_single",
  "small_single","color_area","color_bed","area_parity","area_range","color_target","color_bonus","area_bonus"
];

export function normalizeBssConfig(raw:any):BssConfigPayload {
  const r=raw?.rules||{}; const ids=Array.isArray(raw?.selectedIds)?raw.selectedIds.map(String):[];
  const quickParty=raw?.quickParty===true||raw?.partyMode==="quick";
  return { mode:"bss_king", selectedIds:ids, players:Math.max(2,Number(raw?.players||ids.length||2)), playersList:Array.isArray(raw?.playersList)?raw.playersList:[], botIds:Array.isArray(raw?.botIds)?raw.botIds.map(String):[], botsEnabled:Boolean(raw?.botsEnabled), botLevel:raw?.botLevel==="easy"||raw?.botLevel==="hard"?raw.botLevel:"normal", randomOrder:raw?.randomOrder!==false, scoreInputMethod:raw?.scoreInputMethod==="dartboard"?"dartboard":"keypad", seriesWins:raw?.seriesWins===2||raw?.seriesWins===3?raw.seriesWins:1, quickParty, partyMode:quickParty?"quick":"arcade", temporaryParticipants:quickParty||raw?.temporaryParticipants===true, rules:{badgesToThrone:[3,5,7].includes(Number(r?.badgesToThrone))?Number(r.badgesToThrone):5, chaosEnabled:r?.chaosEnabled!==false, throneFinish:r?.throneFinish==="dbull"?"dbull":"bull"} };
}

function randomOf<T>(values:T[]):T { return values[Math.floor(Math.random()*values.length)]; }
function challengeKey(c?:BssChallenge|null){
  if(!c)return "";
  return [c.kind,c.target??"",c.targetColor??"",c.targetArea??"",c.targetBed??"",c.targetParity??"",c.targetRange??"",c.sequenceStart??"",c.maxScore??"",c.exactScore??"",c.minScore??""].join(":");
}
function singleColorForNumber(n:number):BssChallengeColor {
  const idx=BOARD_ORDER.indexOf(Number(n));
  return idx>=0&&idx%2===0?"black":"white";
}
function ringColorForNumber(n:number):BssChallengeColor { return RED_NUMBERS.has(Number(n))?"red":"green"; }
function baseBssValue(d:any){
  if(!d||d.bed==="MISS")return 0;
  if(d.bed==="IB")return 4;
  if(d.bed==="OB")return 2;
  return d.bed==="T"?3:d.bed==="D"?2:1;
}
function bedLabel(bed?:string){ return bed==="T"?"TRIPLE":bed==="D"?"DOUBLE":"SIMPLE"; }

function createChallenge(kind:BssChallengeKind):BssChallenge {
  if(kind==="open") return {kind,title:"TOURNÉE LIBRE",subtitle:"Fais le plus gros score · S=1 · D=2 · T=3 · Bull=2 · DBull=4",icon:"🍻"};
  if(kind==="target"){ const target=randomOf(TARGETS); return {kind,title:`VISE LE ${target}`,subtitle:`Seul le ${target} compte · Simple=1 · Double=2 · Triple=3`,icon:"🎯",target}; }
  if(kind==="double") return {kind,title:"DOUBLES UNIQUEMENT",subtitle:"Chaque Double vaut 3 points · tout le reste vaut 0",icon:"✌️"};
  if(kind==="triple") return {kind,title:"TRIPLES UNIQUEMENT",subtitle:"Chaque Triple vaut 4 points · tout le reste vaut 0",icon:"⚡"};
  if(kind==="bull") return {kind,title:"VISE LE CENTRE",subtitle:"Bull 25 = 2 points · DBull 50 = 5 points",icon:"👑"};
  if(kind==="low") return {kind,title:"SECTEURS 1 À 10",subtitle:"Seuls 1 à 10 comptent · S=1 · D=2 · T=3",icon:"😈"};
  if(kind==="high") return {kind,title:"SECTEURS 11 À 20",subtitle:"Seuls 11 à 20 comptent · S=1 · D=2 · T=3",icon:"🔥"};
  if(kind==="even") return {kind,title:"PAIRS UNIQUEMENT",subtitle:"Seuls les secteurs pairs comptent · S=1 · D=2 · T=3",icon:"2️⃣"};
  if(kind==="odd") return {kind,title:"IMPAIRS UNIQUEMENT",subtitle:"Seuls les secteurs impairs comptent · S=1 · D=2 · T=3",icon:"3️⃣"};
  if(kind==="triple_even") return {kind,title:"TRIPLES PAIRS",subtitle:"Seuls les triples d’un secteur pair comptent · 5 points chacun",icon:"⚡"};
  if(kind==="dbull") return {kind,title:"BULLE ROUGE",subtitle:"Seul le DBULL 50 compte · 6 points BSS par touche",icon:"🔴"};
  if(kind==="color"){ const targetColor=randomOf(COLORS); return {kind,title:`COULEUR ${colorLabel[targetColor]}`,subtitle:`Touche uniquement les zones ${colorLabel[targetColor].toLowerCase()} · Simple=1 · Double=2 · Triple=3`,icon:"🎨",targetColor}; }
  if(kind==="big_single") return {kind,title:"GROS SIMPLE",subtitle:"Seuls les gros simples comptent · 2 points BSS par touche",icon:"🟠",targetArea:"big"};
  if(kind==="small_single") return {kind,title:"PETIT SIMPLE",subtitle:"Seuls les petits simples comptent · 2 points BSS par touche",icon:"🟡",targetArea:"small"};
  if(kind==="color_area"){ const targetColor=randomOf(["black","white"] as BssChallengeColor[]), targetArea=randomOf(["big","small"] as Array<"big"|"small">); return {kind,title:`${colorLabel[targetColor]} + ${targetArea==="big"?"GROS":"PETIT"}`,subtitle:`Touche un ${targetArea==="big"?"gros":"petit"} simple ${colorLabel[targetColor].toLowerCase()} · 3 points BSS par touche`,icon:"🎨",targetColor,targetArea}; }
  if(kind==="color_bed"){ const targetBed=randomOf(["D","T"] as Array<"D"|"T">), targetColor=randomOf(["red","green"] as BssChallengeColor[]); return {kind,title:`${colorLabel[targetColor]} + ${bedLabel(targetBed)}`,subtitle:`Seuls les ${bedLabel(targetBed).toLowerCase()}s ${colorLabel[targetColor].toLowerCase()} comptent · ${targetBed==="T"?5:4} points BSS par touche`,icon:"🎨",targetColor,targetBed}; }
  if(kind==="area_parity"){ const targetArea=randomOf(["big","small"] as Array<"big"|"small">), targetParity=randomOf(["even","odd"] as Array<"even"|"odd">); return {kind,title:`${targetArea==="big"?"GROS":"PETIT"} ${targetParity==="even"?"PAIRS":"IMPAIRS"}`,subtitle:`Seuls les ${targetArea==="big"?"gros":"petits"} simples sur secteurs ${targetParity==="even"?"pairs":"impairs"} comptent · 3 points BSS par touche`,icon:"🎯",targetArea,targetParity}; }
  if(kind==="area_range"){ const targetArea=randomOf(["big","small"] as Array<"big"|"small">), targetRange=randomOf(["low","high"] as Array<"low"|"high">); return {kind,title:`${targetArea==="big"?"GROS":"PETIT"} ${targetRange==="low"?"1-10":"11-20"}`,subtitle:`Seuls les ${targetArea==="big"?"gros":"petits"} simples des secteurs ${targetRange==="low"?"1 à 10":"11 à 20"} comptent · 3 points BSS par touche`,icon:"🎯",targetArea,targetRange}; }
  if(kind==="color_target"){ const target=randomOf(TARGETS), single=singleColorForNumber(target), ring=ringColorForNumber(target), targetColor=randomOf([single,ring]); return {kind,title:`${colorLabel[targetColor]} + ${target}`,subtitle:`Seules les touches du secteur ${target} dans la couleur ${colorLabel[targetColor].toLowerCase()} comptent · plus le lit est fort, plus tu marques`,icon:"🎨",target,targetColor}; }
  if(kind==="color_bonus"){ const targetColor=randomOf(COLORS); return {kind,title:`BONUS ${colorLabel[targetColor]}`,subtitle:`Toutes les touches comptent, mais la couleur ${colorLabel[targetColor].toLowerCase()} gagne +2 points BSS par fléchette`,icon:"✨",targetColor}; }
  if(kind==="area_bonus"){ const targetArea=randomOf(["big","small"] as Array<"big"|"small">); return {kind,title:`BONUS ${targetArea==="big"?"GROS":"PETIT"}`,subtitle:`Toutes les touches comptent, mais les ${targetArea==="big"?"gros":"petits"} simples gagnent +2 points BSS`,icon:"✨",targetArea}; }
  if(kind==="sequence"){ const sequenceStart=1+Math.floor(Math.random()*18); return {kind,title:`SUITE ${sequenceStart}-${sequenceStart+1}-${sequenceStart+2}`,subtitle:`Chaque secteur distinct de la suite vaut 3 points BSS · suite complète = +3 bonus`,icon:"🔗",sequenceStart}; }
  if(kind==="max_score"){ const maxScore=randomOf(MAX_SCORES); return {kind,title:`MAX ${maxScore}`,subtitle:`Approche-toi au maximum de ${maxScore} sans dépasser · score BSS proportionnel à ta précision`,icon:"🧸",maxScore}; }
  if(kind==="exact_score"){ const exactScore=randomOf(EXACT_SCORES); return {kind,title:`EXACT ${exactScore}`,subtitle:`Plus ton score réel est proche de ${exactScore}, plus tu marques · exact = 12 points BSS`,icon:"🎯",exactScore}; }
  if(kind==="no_miss") return {kind,title:"SANS FAUTE",subtitle:"Aucun MISS autorisé · si les 3 fléchettes touchent la cible, leurs multiplicateurs comptent",icon:"🧱"};
  if(kind==="same_number") return {kind,title:"TRIPLÉ DE SECTEUR",subtitle:"Répète le même numéro · 1 fois = 1 · paire = 5 · triplé = 10 points BSS",icon:"🎰"};
  if(kind==="three_different") return {kind,title:"3 SECTEURS DIFFÉRENTS",subtitle:"Chaque numéro différent augmente ton score · 3 différents = 8 points BSS",icon:"🃏"};
  if(kind==="one_each_bed") return {kind,title:"SIMPLE + DOUBLE + TRIPLE",subtitle:"Simple=2 · Double=3 · Triple=4 s’ils sont différents · trio complet = +3 bonus",icon:"🪜"};
  if(kind==="sdt_target"){ const target=randomOf(TARGETS); return {kind,title:`S-D-T DU ${target}`,subtitle:`Sur le ${target} : Simple=2 · Double=3 · Triple=4 · trio complet = +3 bonus`,icon:"🎯",target}; }
  if(kind==="ascending") return {kind,title:"MONTÉE",subtitle:"1 point par touche +3 pour chaque progression correcte · montée parfaite = 9",icon:"📈"};
  if(kind==="descending") return {kind,title:"DESCENTE",subtitle:"1 point par touche +3 pour chaque descente correcte · descente parfaite = 9",icon:"📉"};
  if(kind==="neighbors"){ const target=randomOf(TARGETS); return {kind,title:`VOISINS DU ${target}`,subtitle:`Chaque voisin distinct touché vaut 3 points BSS · trio complet = +3 bonus`,icon:"🧭",target}; }
  if(kind==="bull_sandwich") return {kind,title:"SANDWICH BULL",subtitle:"Bull en 1re/3e = 3 pts chacun · touche centrale = 1 · sandwich complet = +4",icon:"🥪"};
  if(kind==="mirror") return {kind,title:"MIROIR",subtitle:"1 point par touche · si 1re et 3e ont le même numéro = +6 bonus",icon:"🪞"};
  if(kind==="avoid_target"){ const target=randomOf(TARGETS.slice(0,12)); return {kind,title:`INTERDIT ${target}`,subtitle:`Marque librement, mais toucher le ${target} annule toute la volée`,icon:"☠️",target}; }
  if(kind==="three_colors") return {kind,title:"3 COULEURS",subtitle:"Chaque couleur différente vaut 2 points · 3 couleurs = +3 bonus",icon:"🌈"};
  if(kind==="bull_double") return {kind,title:"BULL + DOUBLE",subtitle:"Bull = 4 points · Double = 4 points · les deux dans la volée = +2 bonus",icon:"🍻"};
  if(kind==="min_score"){ const minScore=randomOf(MIN_SCORES); return {kind,title:`CAP ${minScore}+`,subtitle:`Plus tu approches puis dépasses ${minScore}, plus tu marques de points BSS · plafond 12`,icon:"🚀",minScore}; }
  if(kind==="double_target"){ const target=randomOf(TARGETS); return {kind,title:`RÉPÈTE LE ${target}`,subtitle:`Chaque touche sur le ${target} marque : Simple=3 · Double=4 · Triple=5`,icon:"✌️",target}; }
  return {kind:"open",title:"TOURNÉE LIBRE",subtitle:"Fais le plus gros score · S=1 · D=2 · T=3 · Bull=2 · DBull=4",icon:"🍻"};
}

function shuffleArray<T>(values:T[]):T[]{ const copy=[...values]; for(let i=copy.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; } return copy; }
function createChallengePlan(chaos:boolean):BssChallenge[]{
  if(!chaos){
    const out:BssChallenge[]=[];
    let previous:BssChallenge|null=null;
    while(out.length<18){
      const eligible=CORE_CHALLENGE_KINDS.filter(kind=>kind!==previous?.kind);
      const challenge=createChallenge(randomOf(eligible.length?eligible:CORE_CHALLENGE_KINDS));
      out.push(challenge);
      previous=challenge;
    }
    return out;
  }
  return shuffleArray(WILD_CHALLENGE_KINDS).map(kind=>createChallenge(kind));
}
function randomChallenge(chaos:boolean, previous?:BssChallenge|null):BssChallenge {
  const pool=chaos?WILD_CHALLENGE_KINDS:CORE_CHALLENGE_KINDS;
  const previousKind=previous?.kind;
  const eligible=previousKind ? pool.filter(kind=>kind!==previousKind) : pool;
  const candidate=createChallenge(randomOf(eligible.length?eligible:pool));
  if(challengeKey(candidate)!==challengeKey(previous)) return candidate;
  return createChallenge(randomOf(eligible.length?eligible:pool));
}
function pullNextChallenge(s:BssState, previous?:BssChallenge|null):BssChallenge {
  if(!Array.isArray((s as any).challengeQueue)) (s as any).challengeQueue=[];
  if(!Array.isArray((s as any).replayChallenges)) (s as any).replayChallenges=[];
  if(!s.challengeQueue.length){
    if(s.replayChallenges.length){
      s.events.push("Toutes les tournées prévues ont été jouées : on relance les contrats restés à égalité.");
      s.challengeQueue=shuffleArray(s.replayChallenges.map(ch=>clone(ch)));
      s.replayChallenges=[];
    } else {
      s.events.push("Toutes les tournées prévues ont été jouées : nouveau cycle de défis.");
      s.challengeQueue=createChallengePlan(s.config.rules.chaosEnabled);
    }
  }
  let next=s.challengeQueue.shift()||randomChallenge(s.config.rules.chaosEnabled, previous);
  if(previous && challengeKey(next)===challengeKey(previous) && s.challengeQueue.length){
    const altIndex=s.challengeQueue.findIndex(ch=>challengeKey(ch)!==challengeKey(previous));
    if(altIndex>=0){
      const alt=s.challengeQueue.splice(altIndex,1)[0];
      s.challengeQueue.push(next);
      next=alt;
    }
  }
  return next;
}

export function createBssState(players:Player[], raw:any):BssState {
  const config=normalizeBssConfig(raw); const ps=(players||[]).map((p,i)=>({id:String(p?.id||`p${i+1}`),name:String(p?.name||`Joueur ${i+1}`)}));
  const challengeQueue=createChallengePlan(config.rules.chaosEnabled);
  const challenge=challengeQueue.shift()||randomChallenge(config.rules.chaosEnabled);
  return {sport:"darts",mode:"bss_king",config,players:ps,badges:Object.fromEntries(ps.map(p=>[p.id,0])),influence:Object.fromEntries(ps.map(p=>[p.id,0])),statsByPlayer:Object.fromEntries(ps.map(p=>[p.id,blankStats()])),activePlayerIndex:0,round:1,challenge,challengeQueue,playedChallenges:[],replayChallenges:[],roundScores:Object.fromEntries(ps.map(p=>[p.id,0])),roundPlayedIds:[],throneReady:Object.fromEntries(ps.map(p=>[p.id,false])),phase:"playing",winnerId:null,visits:[],events:["Bienvenue chez les BSS : le trône attend son KING."],startedAt:Date.now()};
}
export function cloneBssState(raw:BssState):BssState {
  const s:any=clone(raw);
  for(const p of s.players||[]) s.statsByPlayer[p.id]={...blankStats(),...(s.statsByPlayer?.[p.id]||{})};
  if(!s.challenge) s.challenge=randomChallenge(s?.config?.rules?.chaosEnabled!==false);
  if(!Array.isArray(s.challengeQueue)) s.challengeQueue=createChallengePlan(s?.config?.rules?.chaosEnabled!==false);
  if(!Array.isArray(s.playedChallenges)) s.playedChallenges=[];
  if(!Array.isArray(s.replayChallenges)) s.replayChallenges=[];
  return s;
}

function rawDartScore(d:any){
  if(!d||d.bed==="MISS")return 0;
  if(d.bed==="IB")return 50;
  if(d.bed==="OB")return 25;
  const n=Number(d.number||0); if(n<1||n>20)return 0;
  return n*(d.bed==="T"?3:d.bed==="D"?2:1);
}
function bssDartMeta(d:any){
  const ring=String(d?.ring||"");
  if(!ring.startsWith("BSSMETA")){
    const area=ring==="inner_single"?"small":ring==="outer_single"?"big":null;
    return { color:null as BssChallengeColor|null, area:area as ("big"|"small")|null };
  }
  const parts=Object.fromEntries(ring.split("|").slice(1).map((chunk:string)=>{ const [k,v]=chunk.split("="); return [k,v]; }));
  const color=(COLORS.includes(parts.c as BssChallengeColor)?parts.c:null) as BssChallengeColor|null;
  const area=(parts.a==="big"||parts.a==="small"?parts.a:null) as ("big"|"small")|null;
  return {color,area};
}
function dartSingleArea(d:any):"big"|"small"|null {
  if(!d||d.bed!=="S") return null;
  return bssDartMeta(d).area;
}
function dartBoardColor(d:any):BssChallengeColor|null {
  if(!d||d.bed==="MISS")return null;
  const explicit=bssDartMeta(d).color; if(explicit)return explicit;
  if(d.bed==="IB")return "red";
  if(d.bed==="OB")return "green";
  const n=Number(d.number||0); if(n<1||n>20)return null;
  if(d.bed==="D"||d.bed==="T") return RED_NUMBERS.has(n)?"red":"green";
  const idx=BOARD_ORDER.indexOf(n); return idx>=0&&idx%2===0?"black":"white";
}
function dartScore(d:any,c:BssChallenge){
  if(!d||d.bed==="MISS")return 0;
  if(c.kind==="throne") return d.bed==="IB"?2:d.bed==="OB"?1:0;
  if(c.kind==="bull") return d.bed==="IB"?5:d.bed==="OB"?2:0;
  if(c.kind==="dbull") return d.bed==="IB"?6:0;
  if(c.kind==="color"){ if(dartBoardColor(d)!==c.targetColor)return 0; return d.bed==="IB"?4:d.bed==="OB"?2:d.bed==="T"?3:d.bed==="D"?2:1; }
  if(c.kind==="big_single") return d.bed==="S"&&dartSingleArea(d)==="big"?2:0;
  if(c.kind==="small_single") return d.bed==="S"&&dartSingleArea(d)==="small"?2:0;
  if(c.kind==="color_area") return d.bed==="S"&&dartSingleArea(d)===c.targetArea&&dartBoardColor(d)===c.targetColor?3:0;
  if(c.kind==="color_bed") return d.bed===c.targetBed&&dartBoardColor(d)===c.targetColor?(c.targetBed==="T"?5:4):0;
  if(c.kind==="area_parity"){ const n=Number(d.number||0); const parityOk=c.targetParity==="even"?n%2===0:n%2===1; return d.bed==="S"&&dartSingleArea(d)===c.targetArea&&n>=1&&n<=20&&parityOk?3:0; }
  if(c.kind==="area_range"){ const n=Number(d.number||0); const rangeOk=c.targetRange==="low"?(n>=1&&n<=10):(n>=11&&n<=20); return d.bed==="S"&&dartSingleArea(d)===c.targetArea&&rangeOk?3:0; }
  if(c.kind==="color_target"){ const n=Number(d.number||0); return n===Number(c.target||0)&&dartBoardColor(d)===c.targetColor?(2+baseBssValue(d)):0; }
  if(c.kind==="color_bonus"){ const base=baseBssValue(d); return base+(dartBoardColor(d)===c.targetColor?2:0); }
  if(c.kind==="area_bonus"){ const base=baseBssValue(d); return base+(d.bed==="S"&&dartSingleArea(d)===c.targetArea?2:0); }
  if(d.bed==="IB"||d.bed==="OB") return c.kind==="open"?(d.bed==="IB"?4:2):0;
  const n=Number(d.number||0); const mult=d.bed==="T"?3:d.bed==="D"?2:1;
  if(c.kind==="double") return d.bed==="D"?3:0;
  if(c.kind==="triple") return d.bed==="T"?4:0;
  if(c.kind==="triple_even") return d.bed==="T"&&n%2===0?5:0;
  if(c.kind==="target") return n===Number(c.target||0)?mult:0;
  if(c.kind==="low") return n>=1&&n<=10?mult:0;
  if(c.kind==="high") return n>=11&&n<=20?mult:0;
  if(c.kind==="even") return n>=1&&n<=20&&n%2===0?mult:0;
  if(c.kind==="odd") return n>=1&&n<=20&&n%2===1?mult:0;
  return mult;
}
export function evaluateBssVisit(darts:GameDart[], challenge:BssChallenge){
  const three=(darts||[]).slice(0,3);
  const validNumbers=three.map((d:any)=>d?.bed==="MISS"?0:Number(d?.number||0));
  const validDarts=three.filter((d:any)=>d?.bed!=="MISS");
  if(challenge?.kind==="sequence"){
    const start=Number(challenge.sequenceStart||1); const needed=[start,start+1,start+2];
    const hit=new Set(validDarts.filter((d:any)=>needed.includes(Number(d?.number))).map((d:any)=>Number(d.number)));
    return hit.size*3+(hit.size===3?3:0);
  }
  if(challenge?.kind==="max_score"){
    const total=three.reduce((sum,d)=>sum+rawDartScore(d),0); const cap=Number(challenge.maxScore||20);
    if(total<=0||total>cap)return 0;
    return Math.round((total/cap)*120)/10;
  }
  if(challenge?.kind==="exact_score"){
    const total=three.reduce((sum,d)=>sum+rawDartScore(d),0); const diff=Math.abs(total-Number(challenge.exactScore||0));
    if(diff===0)return 12; if(diff<=2)return 10; if(diff<=5)return 8; if(diff<=10)return 6; if(diff<=20)return 3; return 0;
  }
  if(challenge?.kind==="no_miss"){
    if(three.length<3||validDarts.length<3)return 0;
    return three.reduce((sum,d)=>sum+dartScore(d,{kind:"open",title:"",subtitle:"",icon:""} as BssChallenge),0);
  }
  if(challenge?.kind==="same_number"){
    const nums=validNumbers.filter(n=>n>=1&&n<=20); if(!nums.length)return 0;
    const counts=new Map<number,number>(); for(const n of nums)counts.set(n,(counts.get(n)||0)+1);
    const max=Math.max(...counts.values()); return max>=3?10:max===2?5:1;
  }
  if(challenge?.kind==="three_different"){
    const nums=validNumbers.filter(n=>n>=1&&n<=20); const count=new Set(nums).size; return count===3?8:count*2;
  }
  if(challenge?.kind==="one_each_bed"){
    const beds=new Set(validDarts.map((d:any)=>d?.bed)); let score=(beds.has("S")?2:0)+(beds.has("D")?3:0)+(beds.has("T")?4:0); if(beds.has("S")&&beds.has("D")&&beds.has("T"))score+=3; return score;
  }
  if(challenge?.kind==="sdt_target"){
    const t=Number(challenge.target||20); const beds=new Set(validDarts.filter((d:any)=>Number(d?.number)===t).map((d:any)=>d?.bed)); let score=(beds.has("S")?2:0)+(beds.has("D")?3:0)+(beds.has("T")?4:0); if(beds.has("S")&&beds.has("D")&&beds.has("T"))score+=3; return score;
  }
  if(challenge?.kind==="ascending"||challenge?.kind==="descending"){
    const nums=three.map((d:any)=>d?.bed==="MISS"?null:Number(d?.number||0)); let score=nums.filter(n=>Number(n)>=1&&Number(n)<=20).length;
    const cmp=(a:number,b:number)=>challenge.kind==="ascending"?a<b:a>b;
    if(nums[0]&&nums[1]&&cmp(Number(nums[0]),Number(nums[1])))score+=3;
    if(nums[1]&&nums[2]&&cmp(Number(nums[1]),Number(nums[2])))score+=3;
    return score;
  }
  if(challenge?.kind==="neighbors"){
    const t=Number(challenge.target||20); const idx=BOARD_ORDER.indexOf(t); if(idx<0)return 0;
    const needed=new Set([BOARD_ORDER[(idx+BOARD_ORDER.length-1)%BOARD_ORDER.length],t,BOARD_ORDER[(idx+1)%BOARD_ORDER.length]]);
    const hit=new Set(validNumbers.filter(n=>needed.has(n))); return hit.size*3+(hit.size===3?3:0);
  }
  if(challenge?.kind==="bull_sandwich"){
    const isBull=(d:any)=>d?.bed==="OB"||d?.bed==="IB"; let score=(isBull(three[0])?3:0)+(three[1]?.bed&&three[1]?.bed!=="MISS"?1:0)+(isBull(three[2])?3:0); if(isBull(three[0])&&three[1]?.bed!=="MISS"&&isBull(three[2]))score+=4; return score;
  }
  if(challenge?.kind==="mirror"){
    let score=validDarts.length; const a=three[0]?.bed!=="MISS"?Number(three[0]?.number||0):0,c=three[2]?.bed!=="MISS"?Number(three[2]?.number||0):0; if(a>=1&&a<=20&&a===c)score+=6; return score;
  }
  if(challenge?.kind==="avoid_target"){
    const forbidden=Number(challenge.target||20); if(validDarts.some((d:any)=>Number(d?.number)===forbidden))return 0;
    return three.reduce((sum,d)=>sum+dartScore(d,{kind:"open",title:"",subtitle:"",icon:""} as BssChallenge),0);
  }
  if(challenge?.kind==="three_colors"){
    const cols=validDarts.map(d=>dartBoardColor(d)).filter(Boolean); const count=new Set(cols).size; return count*2+(count===3?3:0);
  }
  if(challenge?.kind==="bull_double"){
    const hasBull=validDarts.some((d:any)=>d?.bed==="OB"||d?.bed==="IB"), hasDouble=validDarts.some((d:any)=>d?.bed==="D"); return (hasBull?4:0)+(hasDouble?4:0)+(hasBull&&hasDouble?2:0);
  }
  if(challenge?.kind==="min_score"){
    const total=three.reduce((sum,d)=>sum+rawDartScore(d),0), target=Number(challenge.minScore||60); if(total<=0)return 0;
    const progress=Math.min(8,Math.floor((total/target)*8)); const bonus=total>=target?Math.min(4,1+Math.floor((total-target)/15)):0; return Math.min(12,progress+bonus);
  }
  if(challenge?.kind==="double_target"){
    const t=Number(challenge.target||20); return validDarts.filter((d:any)=>Number(d?.number)===t).reduce((sum:number,d:any)=>sum+2+baseBssValue(d),0);
  }
  return three.reduce((sum,d)=>sum+dartScore(d,challenge),0);
}

function finishRound(s:BssState){
  const rows=s.players.map(p=>({id:p.id,score:Number(s.roundScores[p.id]||0)})).sort((a,b)=>b.score-a.score);
  const best=rows[0]?.score||0; const winners=best>0?rows.filter(r=>r.score===best):[];
  const previous=clone(s.challenge);
  const roundNumber=s.round;
  let winnerId:string|null=null; let winnerIds:string[]=[]; let tie=false; let blank=false;
  if(winners.length===1){
    const id=winners[0].id; winnerId=id; winnerIds=[id];
    const p=s.players.find(x=>x.id===id); s.badges[id]=Number(s.badges[id]||0)+1; const st=s.statsByPlayer[id]; st.challengeWins++; st.badgesWon++; s.events.push(`${p?.name||"Joueur"} remporte la tournée ${s.round} et gagne un écusson BSS.`);
    if(s.badges[id]>=s.config.rules.badgesToThrone&&!s.throneReady[id]){ s.throneReady[id]=true; s.events.push(`${p?.name||"Joueur"} a assez d’écussons : PROCHAINE ÉTAPE, LE TRÔNE !`); }
  } else if(winners.length>1){
    tie=true; winnerIds=winners.map(r=>r.id); s.replayChallenges.push(previous); s.events.push(`Égalité sur la tournée ${s.round} : aucun écusson distribué. Le contrat sera rejoué plus tard si besoin.`);
  } else { blank=true; s.events.push(`Tournée ${s.round} blanche : personne ne marque.`); }
  s.playedChallenges.push({ round:roundNumber, challenge:previous, winnerId, winnerIds, tie, blank, bestScore:best });
  s.round+=1; s.roundScores=Object.fromEntries(s.players.map(p=>[p.id,0])); s.roundPlayedIds=[]; s.challenge=pullNextChallenge(s,previous);
}

export function playBssVisit(input:BssState,dartsRaw:GameDart[]):BssState{
  const s=cloneBssState(input); if(s.phase!=="playing"||!s.players.length)return s; const p=s.players[s.activePlayerIndex]; if(!p)return s;
  const darts=(dartsRaw||[]).slice(0,3); const throne=Boolean(s.throneReady[p.id]); const challenge:BssChallenge=throne?{kind:"throne",title:"PRENDS LE TRÔNE",subtitle:s.config.rules.throneFinish==="dbull"?"Touche 1 DBULL 50 pour gagner":"Touche 1 Bull 25 ou 1 DBULL 50 pour gagner",icon:"👑"}:s.challenge;
  const st=s.statsByPlayer[p.id]||(s.statsByPlayer[p.id]=blankStats()); st.visits++; st.darts+=darts.length; let score=evaluateBssVisit(darts,challenge); st.bestVisit=Math.max(st.bestVisit,score); st.influence+=score; s.influence[p.id]=Number(s.influence[p.id]||0)+score;
  for(const d of darts){ if(d?.bed==="MISS")st.misses++; if(d?.bed==="D")st.doubles++; if(d?.bed==="T")st.triples++; if(d?.bed==="OB")st.bulls++; if(d?.bed==="IB")st.dbulls++; }
  const events:string[]=[];
  if(throne){ st.throneAttempts++; const hasDbull=darts.some(d=>d?.bed==="IB"),hasBull=darts.some(d=>d?.bed==="OB"); const crowned=s.config.rules.throneFinish==="dbull"?hasDbull:(hasDbull||hasBull); if(crowned){ s.phase="finished"; s.winnerId=p.id; s.finishedAt=Date.now(); events.push(hasDbull?`${p.name} plante le DBULL et devient BSS KING !`:`${p.name} touche le BULL et s’assoit sur le trône BSS !`); s.events.push(...events); s.visits.push({id:uid("bssv"),playerId:p.id,round:s.round,challenge,darts,score,events}); return s; } events.push(`${p.name} rate le couronnement. Le trône reste libre.`); s.roundScores[p.id]=0; s.roundPlayedIds.push(p.id); }
  else { s.roundScores[p.id]=score; events.push(score>0?`${p.name} marque ${score} point${score>1?"s":""} sur cette tournée.`:`${p.name} ne marque aucun point sur cette tournée.`); s.roundPlayedIds.push(p.id); }
  s.events.push(...events); s.visits.push({id:uid("bssv"),playerId:p.id,round:s.round,challenge,darts,score,events});
  s.activePlayerIndex=(s.activePlayerIndex+1)%s.players.length;
  if(s.roundPlayedIds.length>=s.players.length) finishRound(s);
  return s;
}

function hit(level:BssBotLevel,override?:number){const n=Number(override);if(Number.isFinite(n)&&n>0&&n<=1)return Math.max(.25,Math.min(.99,n));return level==="hard"?.86:level==="easy"?.46:.66;}
function missOr(d:GameDart,level:BssBotLevel,override?:number):GameDart{return Math.random()<hit(level,override)?d:{bed:"MISS"};}
function botColorDart(color:BssChallengeColor):GameDart{
  if(color==="red") return Math.random()<.18?{bed:"IB"}:{bed:"T",number:20};
  if(color==="green") return Math.random()<.18?{bed:"OB"}:{bed:"T",number:19};
  if(color==="black") return {bed:"S",number:20};
  return {bed:"S",number:1};
}
function bssMetaRing(color?:BssChallengeColor|null,area?:"big"|"small"|null){ return ["BSSMETA",color?`c=${color}`:"",area?`a=${area}`:""].filter(Boolean).join("|"); }
function exactBotDarts(target:number):GameDart[]{
  // Priorité à une combinaison simple lisible et valide.
  for(let a=20;a>=1;a--) for(let b=20;b>=0;b--) for(let c=20;c>=0;c--){ if(a+b+c===target) return [{bed:"S",number:a},b?{bed:"S",number:b}:{bed:"MISS"},c?{bed:"S",number:c}:{bed:"MISS"}]; }
  return [{bed:"S",number:20},{bed:"S",number:20},{bed:"S",number:Math.max(1,Math.min(20,target-40))}];
}
export function pickBssBotDarts(input:BssState, level:BssBotLevel="normal", hitRateOverride?:number):GameDart[]{
  const s=cloneBssState(input); const p=s.players[s.activePlayerIndex]; if(!p)return[]; const throne=Boolean(s.throneReady[p.id]); const c:any=throne?{kind:"throne",target:0}:s.challenge;
  if(c.kind==="color_bed"){ const color=c.targetColor||"red", bed=c.targetBed||"D", number=color==="red"?20:19; return [1,2,3].map(()=>missOr({bed,number},level,hitRateOverride)); }
  if(c.kind==="area_parity"){ const number=c.targetParity==="odd"?19:20, area=c.targetArea||"big"; return [1,2,3].map(()=>missOr({bed:"S",number,ring:bssMetaRing(singleColorForNumber(number),area)} as any,level,hitRateOverride)); }
  if(c.kind==="area_range"){ const number=c.targetRange==="low"?10:20, area=c.targetArea||"big"; return [1,2,3].map(()=>missOr({bed:"S",number,ring:bssMetaRing(singleColorForNumber(number),area)} as any,level,hitRateOverride)); }
  if(c.kind==="color_target"){ const target=Number(c.target||20), color=c.targetColor||singleColorForNumber(target); const bed=(color==="black"||color==="white")?"S":(Math.random()<.5?"D":"T"); return [1,2,3].map(()=>missOr({bed,number:target,ring:bed==="S"?bssMetaRing(color,"big"):bssMetaRing(color,null)} as any,level,hitRateOverride)); }
  if(c.kind==="color_bonus"){ return [1,2,3].map(()=>missOr(botColorDart(c.targetColor||"red"),level,hitRateOverride)); }
  if(c.kind==="area_bonus"){ const area=c.targetArea||"big", number=20; return [1,2,3].map(()=>missOr({bed:"S",number,ring:bssMetaRing(singleColorForNumber(number),area)} as any,level,hitRateOverride)); }
  if(c.kind==="sequence"){
    const start=Number(c.sequenceStart||1); return [start,start+1,start+2].map(n=>missOr({bed:"S",number:n},level,hitRateOverride));
  }
  if(c.kind==="exact_score") return exactBotDarts(Number(c.exactScore||30)).map(d=>missOr(d,level,hitRateOverride));
  if(c.kind==="max_score"){
    const cap=Number(c.maxScore||20); const a=Math.max(1,Math.floor(cap/3)); const b=Math.max(1,Math.floor((cap-a)/2)); const cc=Math.max(0,cap-a-b);
    return [a,b,cc].map(n=>n?missOr({bed:"S",number:Math.min(20,n)},level,hitRateOverride):{bed:"MISS"});
  }
  if(c.kind==="no_miss") return [20,19,18].map(n=>missOr({bed:"S",number:n},level,hitRateOverride));
  if(c.kind==="same_number") return [1,2,3].map(()=>missOr({bed:"S",number:20},level,hitRateOverride));
  if(c.kind==="three_different") return [20,19,18].map(n=>missOr({bed:"S",number:n},level,hitRateOverride));
  if(c.kind==="one_each_bed") return [missOr({bed:"S",number:20},level,hitRateOverride),missOr({bed:"D",number:20},level,hitRateOverride),missOr({bed:"T",number:20},level,hitRateOverride)];
  if(c.kind==="sdt_target"){ const t=Number(c.target||20); return ["S","D","T"].map((bed:any)=>missOr({bed,number:t},level,hitRateOverride)); }
  if(c.kind==="ascending") return [5,12,20].map(n=>missOr({bed:"S",number:n},level,hitRateOverride));
  if(c.kind==="descending") return [20,12,5].map(n=>missOr({bed:"S",number:n},level,hitRateOverride));
  if(c.kind==="neighbors"){
    const t=Number(c.target||20),idx=BOARD_ORDER.indexOf(t); const nums=[BOARD_ORDER[(idx+BOARD_ORDER.length-1)%BOARD_ORDER.length],t,BOARD_ORDER[(idx+1)%BOARD_ORDER.length]]; return nums.map(n=>missOr({bed:"S",number:n},level,hitRateOverride));
  }
  if(c.kind==="bull_sandwich") return [missOr({bed:"OB"},level,hitRateOverride),missOr({bed:"S",number:20},level,hitRateOverride),missOr({bed:"OB"},level,hitRateOverride)];
  if(c.kind==="mirror") return [missOr({bed:"S",number:20},level,hitRateOverride),missOr({bed:"S",number:19},level,hitRateOverride),missOr({bed:"S",number:20},level,hitRateOverride)];
  if(c.kind==="avoid_target"){ const bad=Number(c.target||20),safe=bad===20?19:20; return [1,2,3].map(()=>missOr({bed:"T",number:safe},level,hitRateOverride)); }
  if(c.kind==="three_colors") return [missOr({bed:"IB"},level,hitRateOverride),missOr({bed:"OB"},level,hitRateOverride),missOr({bed:"S",number:20},level,hitRateOverride)];
  if(c.kind==="bull_double") return [missOr({bed:"OB"},level,hitRateOverride),missOr({bed:"D",number:20},level,hitRateOverride),missOr({bed:"S",number:20},level,hitRateOverride)];
  if(c.kind==="min_score") return [1,2,3].map(()=>missOr({bed:"T",number:20},level,hitRateOverride));
  if(c.kind==="double_target"){ const t=Number(c.target||20); return [missOr({bed:"S",number:t},level,hitRateOverride),missOr({bed:"D",number:t},level,hitRateOverride),missOr({bed:"S",number:20},level,hitRateOverride)]; }
  const one=():GameDart=>{
    if(c.kind==="throne") return missOr({bed:s.config.rules.throneFinish==="dbull"?"IB":"OB"},level,hitRateOverride);
    if(c.kind==="bull")return missOr({bed:Math.random()<.35?"IB":"OB"},level,hitRateOverride);
    if(c.kind==="dbull")return missOr({bed:"IB"},level,hitRateOverride);
    if(c.kind==="color")return missOr(botColorDart(c.targetColor||"red"),level,hitRateOverride);
    if(c.kind==="big_single")return missOr({bed:"S",number:20,ring:bssMetaRing("black","big")} as any,level,hitRateOverride);
    if(c.kind==="small_single")return missOr({bed:"S",number:20,ring:bssMetaRing("black","small")} as any,level,hitRateOverride);
    if(c.kind==="color_area"){ const color=c.targetColor||"black",area=c.targetArea||"big"; const number=color==="white"?1:20; return missOr({bed:"S",number,ring:bssMetaRing(color,area)} as any,level,hitRateOverride); }
    if(c.kind==="double")return missOr({bed:"D",number:16+Math.floor(Math.random()*5)},level,hitRateOverride);
    if(c.kind==="triple")return missOr({bed:"T",number:18+Math.floor(Math.random()*3)},level,hitRateOverride);
    if(c.kind==="triple_even")return missOr({bed:"T",number:18+2*Math.floor(Math.random()*2)},level,hitRateOverride);
    if(c.kind==="target")return missOr({bed:Math.random()<.4?"T":Math.random()<.55?"D":"S",number:Number(c.target||20)},level,hitRateOverride);
    if(c.kind==="low")return missOr({bed:Math.random()<.35?"T":"S",number:7+Math.floor(Math.random()*4)},level,hitRateOverride);
    if(c.kind==="high")return missOr({bed:Math.random()<.45?"T":"S",number:17+Math.floor(Math.random()*4)},level,hitRateOverride);
    if(c.kind==="even")return missOr({bed:Math.random()<.45?"T":"S",number:18+2*Math.floor(Math.random()*2)},level,hitRateOverride);
    if(c.kind==="odd")return missOr({bed:Math.random()<.45?"T":"S",number:17+2*Math.floor(Math.random()*2)},level,hitRateOverride);
    return missOr({bed:Math.random()<.45?"T":Math.random()<.65?"D":"S",number:18+Math.floor(Math.random()*3)},level,hitRateOverride);
  };
  return [one(),one(),one()];
}
