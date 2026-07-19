// @ts-nocheck
// ============================================
// LES 5 VIES — PLAY V2
// Interface Killer-like, objectif dynamique, saisie X01 et stats complètes.
// ============================================

import React from "react";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import type { Dart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ScoreInputHub from "../components/ScoreInputHub";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { sanitizeScoreInputMethod, type ScoreInputMethod } from "../lib/scoreInput/types";
import deadActiveIcon from "../assets/icons/dead-active.png";
import deadListIcon from "../assets/icons/dead-list.png";
import tickerFiveLives from "../assets/tickers/ticker_five_lives.png";
import type { FiveLivesConfig, FiveLivesPlayerLite } from "./FiveLivesConfig";

const tickerFiveLives2: any = (() => {
  try {
    const mods: any = import.meta.glob("../assets/tickers/ticker_five_lives*.png", { eager: true, import: "default" });
    const entries = Object.entries(mods || {});
    const pick = (re: RegExp) => entries.find(([key]) => re.test(String(key)))?.[1];
    return pick(/ticker_five_lives[_-]?2\.png$/i) || pick(/ticker_five_lives.*2.*\.png$/i) || (tickerFiveLives as any);
  } catch {
    return tickerFiveLives as any;
  }
})();

type Props = { store: any; go: (tab: any, params?: any) => void; config: FiveLivesConfig; onFinish?: (m: any) => void };
type FiveLivesStats = {
  visits: number; targetsFaced: number; successfulVisits: number; failedVisits: number; livesLost: number;
  dartsThrown: number; totalScore: number; bestVisit: number; worstVisit: number; bestMargin: number;
  totalPositiveMargin: number; singles: number; doubles: number; triples: number; bulls: number; dbulls: number;
  misses: number; scoreOnlyVisits: number; hitsBySegment: Record<string, number>; lastScore: number | null;
  eliminatedAtTurn: number | null;
};
type PlayerState = FiveLivesPlayerLite & { lives: number; eliminated: boolean; stats: FiveLivesStats };
type VisitEvent = {
  id: string; turn: number; playerId: string; playerName: string; score: number; target: number | null;
  required: number | null; margin: number | null; success: boolean; openingVisit: boolean; lifeLost: boolean;
  eliminated: boolean; livesBefore: number; livesAfter: number; darts: Dart[]; inputMethod: ScoreInputMethod; at: number;
};

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Math.floor(Number(n));
  return Number.isFinite(x) ? Math.max(min, Math.min(max, x)) : fallback;
}
function sanitizeFiveLivesScoreInput(value: unknown): ScoreInputMethod {
  const method = sanitizeScoreInputMethod(value);
  return method === "visit_score" || method === "dartboard" ? method : "keypad";
}
function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 1000) / 10 : 0; }
function fmt1(n: any) { const x = Number(n); return Number.isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1) : "0.0"; }
function fmtDuration(ms: number) { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function fmtDart(d: Dart) {
  if (!d || Number(d.v) === 0) return "MISS";
  if (Number(d.v) === 25) return Number(d.mult) === 2 ? "DBULL" : "BULL";
  return `${Number(d.mult) === 3 ? "T" : Number(d.mult) === 2 ? "D" : "S"}${Number(d.v)}`;
}
function dartScore(d: Dart) {
  if (!d || Number(d.v) === 0) return 0;
  if (Number(d.v) === 25) return Number(d.mult) === 2 ? 50 : 25;
  return (Number(d.v) || 0) * (Number(d.mult) || 1);
}
function computeVisitScore(darts: Dart[]) { return (Array.isArray(darts) ? darts : []).reduce((sum, d) => sum + dartScore(d), 0); }
function emptyStats(): FiveLivesStats {
  return { visits: 0, targetsFaced: 0, successfulVisits: 0, failedVisits: 0, livesLost: 0, dartsThrown: 0,
    totalScore: 0, bestVisit: 0, worstVisit: 180, bestMargin: 0, totalPositiveMargin: 0, singles: 0,
    doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0, scoreOnlyVisits: 0, hitsBySegment: {},
    lastScore: null, eliminatedAtTurn: null };
}
function normalizeVisitDarts(darts: Dart[]): Dart[] {
  const out = (Array.isArray(darts) ? darts : []).slice(0, 3).map((d: any) => ({
    v: Number.isFinite(Number(d?.v)) ? Number(d.v) : 0,
    mult: Number(d?.v) === 25 ? (Number(d?.mult) === 2 ? 2 : 1) : Number(d?.mult) === 3 ? 3 : Number(d?.mult) === 2 ? 2 : 1,
  } as Dart));
  while (out.length < 3) out.push({ v: 0, mult: 1 } as Dart);
  return out;
}
function updateRingStats(stats: FiveLivesStats, darts: Dart[]) {
  const hitsBySegment = { ...(stats.hitsBySegment || {}) };
  let { singles, doubles, triples, bulls, dbulls, misses } = stats;
  darts.forEach((d) => {
    const v = Number(d?.v) || 0, mult = Number(d?.mult) || 1, label = fmtDart(d);
    hitsBySegment[label] = (hitsBySegment[label] || 0) + 1;
    if (v === 0) misses += 1; else if (v === 25 && mult === 2) dbulls += 1; else if (v === 25) bulls += 1;
    else if (mult === 3) triples += 1; else if (mult === 2) doubles += 1; else singles += 1;
  });
  return { ...stats, singles, doubles, triples, bulls, dbulls, misses, hitsBySegment };
}

function HeartKpi({ value, size = 58, active = false }: { value: any; size?: number; active?: boolean }) {
  const gid = `fiveLivesHeart-${size}-${active ? "a" : "n"}`;
  return <div aria-label={`${value} vies`} style={{ width: size, height: Math.round(size * .86), position: "relative", display: "grid", placeItems: "center", filter: active ? "drop-shadow(0 0 10px rgba(255,255,255,.32)) drop-shadow(0 0 18px rgba(255,79,184,.48))" : "drop-shadow(0 8px 16px rgba(255,79,184,.20))" }}>
    <svg width={size} height={Math.round(size * .86)} viewBox="0 0 48 42" style={{ position: "absolute", inset: 0 }}><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(255,105,205,.64)"/><stop offset="1" stopColor="rgba(98,9,68,.72)"/></linearGradient></defs><path d="M24 40s-18-10.8-18-24C6 9.6 10.2 5 16 5c3.1 0 6 1.5 8 4.2C26 6.5 28.9 5 32 5c5.8 0 10 4.6 10 11 0 13.2-18 24-18 24z" fill={`url(#${gid})`} stroke={active ? "rgba(255,255,255,.92)" : "rgba(255,159,221,.82)"} strokeWidth="1.35"/></svg>
    <div style={{ position: "relative", color: "#fff", fontWeight: 1000, fontSize: Math.max(13, Math.round(size * .34)), transform: "translateY(2px)", textShadow: "0 2px 8px #000" }}>{value}</div>
  </div>;
}
function Avatar({ player, size = 58, active = false }: { player: any; size?: number; active?: boolean }) {
  const src = player?.avatarDataUrl || player?.avatarUrl || player?.avatar || null;
  return <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", flex: "0 0 auto", background: "rgba(255,255,255,.08)", border: `2px solid ${active ? "#ff4fb8" : "rgba(255,255,255,.16)"}`, boxShadow: active ? "0 0 20px rgba(255,79,184,.42)" : "0 8px 18px rgba(0,0,0,.35)", fontWeight: 1000 }}>
    {src ? <img src={src} alt={player?.name || "Joueur"} style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : String(player?.name || "J").slice(0, 1).toUpperCase()}
  </div>;
}
function Kpi({ label, value, tone = "#ff4fb8", sub }: { label: string; value: any; tone?: string; sub?: React.ReactNode }) {
  return <div style={{ minWidth: 0, padding: "10px 8px", borderRadius: 15, border: `1px solid ${tone}42`, background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025))", textAlign: "center" }}>
    <div style={{ color: "rgba(255,255,255,.58)", fontSize: 9.5, fontWeight: 1000, letterSpacing: .7, textTransform: "uppercase" }}>{label}</div>
    <div style={{ color: tone, fontSize: 22, lineHeight: 1.05, fontWeight: 1000, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", textShadow: `0 0 12px ${tone}55` }}>{value}</div>
    {sub ? <div style={{ marginTop: 3, color: "rgba(255,255,255,.62)", fontSize: 9.5, fontWeight: 800 }}>{sub}</div> : null}
  </div>;
}
function InfoOverlay({ onClose, startingLives }: { onClose: () => void; startingLives: number }) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.78)", display: "grid", placeItems: "center", padding: 16 }}><div onClick={e => e.stopPropagation()} style={{ width: "min(520px, 100%)", maxHeight: "82vh", overflow: "auto", padding: 18, borderRadius: 22, border: "1px solid rgba(255,79,184,.48)", background: "linear-gradient(180deg, #17111d, #08070c)", boxShadow: "0 24px 70px rgba(0,0,0,.75)" }}>
    <div style={{ color: "#ff79cf", fontSize: 18, fontWeight: 1000, textTransform: "uppercase" }}>Règles — Les 5 vies</div>
    <div style={{ marginTop: 12, display: "grid", gap: 10, color: "rgba(255,255,255,.78)", fontSize: 13, lineHeight: 1.45 }}>
      <div><b style={{ color: "#fff" }}>Objectif :</b> rester le dernier joueur encore en vie.</div>
      <div><b style={{ color: "#fff" }}>Départ :</b> chacun commence avec <b>{startingLives}</b> vies. La première volée crée la référence.</div>
      <div><b style={{ color: "#fff" }}>À chaque tour :</b> faire strictement plus que la volée précédente. L’écran indique la référence, le minimum et ce qu’il reste à marquer.</div>
      <div><b style={{ color: "#fff" }}>Échec :</b> un score égal ou inférieur coûte une vie. À 0, le joueur est éliminé.</div>
      <div><b style={{ color: "#fff" }}>Saisie :</b> Keypad détaillé, total de volée ou cible interactive selon la configuration.</div>
    </div><button type="button" onClick={onClose} style={{ width: "100%", marginTop: 16, height: 42, border: 0, borderRadius: 999, background: "linear-gradient(90deg,#ff4fb8,#ff9cda)", color: "#260018", fontWeight: 1000 }}>COMPRIS</button>
  </div></div>;
}

export default function FiveLivesPlay({ go, config, onFinish }: Props) {
  useFullscreenPlay();
  const { theme } = useTheme(); const { t } = useLang();
  const accent = "#ff4fb8", danger = theme?.danger || "#ff566d";
  const startingLives = clampInt(config?.startingLives, 1, 20, 5);
  const startedAtRef = React.useRef(Number(config?.createdAt) || Date.now());
  const savedRef = React.useRef(false);
  const [players, setPlayers] = React.useState<PlayerState[]>(() => (config?.players || []).map(p => ({ ...p, lives: startingLives, eliminated: false, stats: emptyStats() })));
  const [turnIndex, setTurnIndex] = React.useState(0), [mult, setMult] = React.useState<1|2|3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<Dart[]>([]), [lastScoreToBeat, setLastScoreToBeat] = React.useState<number|null>(null);
  const [events, setEvents] = React.useState<VisitEvent[]>([]), [winnerId, setWinnerId] = React.useState<string|null>(null);
  const [endOpen, setEndOpen] = React.useState(false), [finalMatch, setFinalMatch] = React.useState<any>(null);
  const [infoOpen, setInfoOpen] = React.useState(false), [logOpen, setLogOpen] = React.useState(false);
  const [playersOpen, setPlayersOpen] = React.useState(false), [quitOpen, setQuitOpen] = React.useState(false);
  const [inputHeight, setInputHeight] = React.useState(330); const inputRef = React.useRef<HTMLDivElement|null>(null);
  const inputMethod = sanitizeFiveLivesScoreInput(config?.scoreInputMethod || "keypad");

  React.useLayoutEffect(() => { const el = inputRef.current; if (!el) return; const measure=()=>setInputHeight(Math.ceil(el.getBoundingClientRect().height)); measure(); let ro:ResizeObserver|null=null; try{ro=new ResizeObserver(measure);ro.observe(el);}catch{} window.addEventListener("resize",measure); return()=>{ro?.disconnect?.();window.removeEventListener("resize",measure)}; }, [inputMethod]);
  const aliveIds = React.useMemo(()=>players.filter(p=>!p.eliminated).map(p=>p.id),[players]);
  const activeIndex = React.useMemo(()=>{ if(!players.length)return 0; const n=players.length,start=((turnIndex%n)+n)%n; for(let k=0;k<n;k++){const idx=(start+k)%n;if(!players[idx]?.eliminated)return idx;} return 0;},[turnIndex,players]);
  const activePlayer=players[activeIndex]||null, visitScore=computeVisitScore(currentThrow);
  const requiredScore=lastScoreToBeat==null?null:lastScoreToBeat+1, missingScore=requiredScore==null?null:Math.max(0,requiredScore-visitScore), previewSuccess=requiredScore!=null&&visitScore>=requiredScore;
  function nextAliveIndex(from:number,list:PlayerState[]){const n=list.length;if(!n)return 0;for(let s=1;s<=n;s++){const idx=(from+s)%n;if(!list[idx]?.eliminated)return idx;}return from;}

  function rankingFrom(finalPlayers:PlayerState[], winId:string){return [...finalPlayers].sort((a,b)=>a.id===winId?-1:b.id===winId?1:Number(b.stats.eliminatedAtTurn||0)-Number(a.stats.eliminatedAtTurn||0)).map((p,idx)=>{
    const avgVisit=p.stats.visits?p.stats.totalScore/p.stats.visits:0, successRate=pct(p.stats.successfulVisits,p.stats.targetsFaced), hitCount=p.stats.singles+p.stats.doubles+p.stats.triples+p.stats.bulls+p.stats.dbulls;
    return {id:p.id,playerId:p.id,profileId:p.id,name:p.name,avatarDataUrl:p.avatarDataUrl||null,isBot:!!p.isBot,rank:idx+1,position:idx+1,isWinner:p.id===winId,win:p.id===winId,lives:p.lives,livesLeft:p.lives,remainingLives:p.lives,lostLives:p.stats.livesLost,livesLost:p.stats.livesLost,damageTaken:p.stats.livesLost,visits:p.stats.visits,turns:p.stats.visits,rounds:p.stats.visits,targetsFaced:p.stats.targetsFaced,successfulVisits:p.stats.successfulVisits,validHits:p.stats.successfulVisits,successes:p.stats.successfulVisits,failedVisits:p.stats.failedVisits,fails:p.stats.failedVisits,successRate,darts:p.stats.dartsThrown,dartsThrown:p.stats.dartsThrown,totalThrows:p.stats.dartsThrown,points:p.stats.totalScore,score:p.stats.totalScore,totalScore:p.stats.totalScore,avgVisit:Math.round(avgVisit*100)/100,avg3:Math.round(avgVisit*100)/100,bestVisit:p.stats.bestVisit,worstVisit:p.stats.visits?p.stats.worstVisit:0,bestMargin:p.stats.bestMargin,avgWinningMargin:p.stats.successfulVisits?Math.round((p.stats.totalPositiveMargin/p.stats.successfulVisits)*100)/100:0,singles:p.stats.singles,doubles:p.stats.doubles,triples:p.stats.triples,bulls:p.stats.bulls,dbulls:p.stats.dbulls,misses:p.stats.misses,hitsTotal:hitCount,hitRate:pct(hitCount,p.stats.dartsThrown),scoreOnlyVisits:p.stats.scoreOnlyVisits,hitsBySegment:p.stats.hitsBySegment,lastScore:p.stats.lastScore,eliminatedAtTurn:p.stats.eliminatedAtTurn,eliminated:p.eliminated};
  });}
  function buildFinishedMatch(finalPlayers:PlayerState[],finalEvents:VisitEvent[],winId:string){const finishedAt=Date.now(),rankings=rankingFrom(finalPlayers,winId),winnerName=rankings.find(p=>p.id===winId)?.name||"Vainqueur",scoreLine=rankings.map(p=>`${p.rank}. ${p.name} ${p.livesLeft}♥`).join(" • "),detailedByPlayer=Object.fromEntries(rankings.map(p=>[p.id,p]));
    const statsBlock={mode:"five_lives",players:rankings,global:{startingLives,totalVisits:finalEvents.length,totalDarts:rankings.reduce((s,p)=>s+Number(p.dartsThrown||0),0),highestVisit:Math.max(0,...rankings.map(p=>Number(p.bestVisit||0))),durationMs:finishedAt-startedAtRef.current}};
    const summary={kind:"five_lives",mode:"five_lives",finished:true,winnerId:winId,winnerName,startingLives,lastScoreToBeat:finalEvents.at(-1)?.score??lastScoreToBeat??0,scoreInputMethod:inputMethod,createdAt:startedAtRef.current,finishedAt,durationMs:finishedAt-startedAtRef.current,players:rankings,perPlayer:rankings,detailedByPlayer,rankings,scoreLine,result:{finished:true,winnerId:winId,winnerName,rankings},totalVisits:finalEvents.length,totalDarts:statsBlock.global.totalDarts,highestVisit:statsBlock.global.highestVisit};
    const id=config?.id||`fiveLives-${finishedAt}`; return {id,matchId:id,resumeId:id,kind:"five_lives",mode:"five_lives",status:"finished",createdAt:startedAtRef.current,finishedAt,updatedAt:finishedAt,winnerId:winId,winnerName,players:rankings,stats:statsBlock,summary,payload:{kind:"five_lives",mode:"five_lives",status:"finished",config:{...config,scoreInputMethod:inputMethod},players:rankings,finalPlayers:rankings,winnerId:winId,winnerName,startingLives,scoreInputMethod:inputMethod,visitHistory:finalEvents,events:finalEvents,stats:statsBlock,statsIndex:statsBlock,summary,finishedAt}};
  }
  function applyTurn(rawDarts:Dart[],forcedScore?:number,sourceMethod:ScoreInputMethod=inputMethod){if(!activePlayer||winnerId)return;const scoreOnly=sourceMethod==="visit_score"||Number.isFinite(Number(forcedScore)),darts=scoreOnly?[]:normalizeVisitDarts(rawDarts),score=scoreOnly?clampInt(forcedScore,0,180,0):computeVisitScore(darts),target=lastScoreToBeat,openingVisit=target==null,success=openingVisit||score>Number(target),turn=events.length+1;
    const updated=players.map(p=>({...p,stats:{...p.stats,hitsBySegment:{...(p.stats.hitsBySegment||{})}}})),p=updated[activeIndex];if(!p||p.eliminated)return;const livesBefore=p.lives;if(!openingVisit&&!success){p.lives=Math.max(0,p.lives-1);if(p.lives<=0)p.eliminated=true;}
    let ns={...p.stats,visits:p.stats.visits+1,targetsFaced:p.stats.targetsFaced+(openingVisit?0:1),successfulVisits:p.stats.successfulVisits+(!openingVisit&&success?1:0),failedVisits:p.stats.failedVisits+(!openingVisit&&!success?1:0),livesLost:p.stats.livesLost+(!openingVisit&&!success?1:0),dartsThrown:p.stats.dartsThrown+3,totalScore:p.stats.totalScore+score,bestVisit:Math.max(p.stats.bestVisit,score),worstVisit:Math.min(p.stats.worstVisit,score),bestMargin:!openingVisit&&success?Math.max(p.stats.bestMargin,score-Number(target)):p.stats.bestMargin,totalPositiveMargin:p.stats.totalPositiveMargin+(!openingVisit&&success?score-Number(target):0),scoreOnlyVisits:p.stats.scoreOnlyVisits+(scoreOnly?1:0),lastScore:score,eliminatedAtTurn:p.eliminated?turn:p.stats.eliminatedAtTurn};if(!scoreOnly)ns=updateRingStats(ns,darts);p.stats=ns;
    const ev:VisitEvent={id:`5v-${turn}-${Date.now()}`,turn,playerId:p.id,playerName:p.name,score,target,required:target==null?null:Number(target)+1,margin:target==null?null:score-Number(target),success,openingVisit,lifeLost:!openingVisit&&!success,eliminated:p.eliminated,livesBefore,livesAfter:p.lives,darts,inputMethod:sourceMethod,at:Date.now()},nextEvents=[...events,ev],alive=updated.filter(x=>!x.eliminated);
    setPlayers(updated);setEvents(nextEvents);setLastScoreToBeat(score);setCurrentThrow([]);setMult(1);if(alive.length===1){const winId=alive[0].id,match=buildFinishedMatch(updated,nextEvents,winId);setWinnerId(winId);setFinalMatch(match);setEndOpen(true);return;}setTurnIndex(nextAliveIndex(activeIndex,updated));
  }
  function addDart(d:Dart){if(winnerId)return;setCurrentThrow(prev=>prev.length>=3?prev:[...prev,d]);setMult(1);}
  function finishAndSave(){if(!finalMatch||savedRef.current)return;savedRef.current=true;setEndOpen(false);onFinish?.(finalMatch);}
  const recentEvents=events.slice(-8).reverse(),liveAvg=activePlayer?.stats?.visits?activePlayer.stats.totalScore/activePlayer.stats.visits:0;

  const cardStyle:React.CSSProperties={borderRadius:20,border:"1px solid rgba(255,255,255,.10)",background:"linear-gradient(180deg,rgba(23,23,27,.94),rgba(8,8,11,.98))",boxShadow:"0 14px 34px rgba(0,0,0,.46)"};
  const requestBack=()=>{if(events.length||currentThrow.length)setQuitOpen(true);else go("five_lives_config");};

  return (
    <div style={{position:"fixed",inset:0,height:"100dvh",overflow:"hidden",display:"flex",flexDirection:"column",gap:8,padding:8,paddingBottom:"max(8px,env(safe-area-inset-bottom))",background:"radial-gradient(circle at 50% 0%,rgba(255,79,184,.12),transparent 34%),#04050a",color:theme?.text||"#fff",overscrollBehavior:"none"}}>
      <header style={{position:"relative",height:"clamp(78px,11vh,104px)",flex:"0 0 auto",overflow:"hidden",borderRadius:4,borderBottom:`1px solid ${accent}38`,boxShadow:"0 12px 30px rgba(0,0,0,.42)"}}>
        <img src={tickerFiveLives as any} alt="Les 5 vies" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",pointerEvents:"none"}}>
          <div style={{pointerEvents:"auto"}}><BackDot onClick={requestBack} title={t?.("common.back")||"Retour"} size={42} color={accent} glow={`${accent}AA`}/></div>
          <div style={{pointerEvents:"auto"}}><InfoDot onClick={()=>setInfoOpen(true)} title="Règles" size={42} color={accent} glow={`${accent}AA`}/></div>
        </div>
      </header>

      <div style={{...cardStyle,flex:"0 0 auto",padding:6,overflow:"hidden"}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",padding:2}}>
          {players.map((p,idx)=>{const active=idx===activeIndex&&!p.eliminated&&!winnerId;return <div key={p.id} style={{minWidth:126,padding:"6px 8px",borderRadius:16,border:`1px solid ${active?accent:"rgba(255,255,255,.09)"}`,background:active?`${accent}18`:"rgba(255,255,255,.025)",boxShadow:active?`0 0 20px ${accent}34`:"none",opacity:p.eliminated?.45:1}}><div style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) 34px",alignItems:"center",gap:7}}><Avatar player={p} size={34} active={active}/><div style={{minWidth:0}}><div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontSize:11,fontWeight:1000,color:active?"#ff8bd6":"#fff"}}>{p.name}</div><div style={{marginTop:2,fontSize:9,color:"rgba(255,255,255,.56)"}}>{p.stats.lastScore==null?"Pas joué":`Score ${p.stats.lastScore}`}</div></div>{p.eliminated?<img src={deadListIcon as any} alt="Éliminé" style={{width:30,height:30,objectFit:"contain"}}/>:<HeartKpi value={p.lives} size={34} active={active}/>}</div></div>})}
        </div>
      </div>

      {activePlayer?<section style={{...cardStyle,flex:"0 0 auto",padding:10,border:`1px solid ${accent}4c`,boxShadow:`0 14px 34px rgba(0,0,0,.46),0 0 24px ${accent}17`}}>
        <div style={{display:"grid",gridTemplateColumns:"76px minmax(0,1fr) 92px",gap:9,alignItems:"center"}}>
          <div style={{display:"grid",justifyItems:"center",gap:5,minWidth:0}}><Avatar player={activePlayer} size={66} active/><div title={activePlayer.name} style={{width:76,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"center",fontSize:11,fontWeight:1000,color:accent,textTransform:"uppercase"}}>{activePlayer.name}</div></div>
          <div style={{borderRadius:15,border:"1px solid rgba(255,255,255,.08)",background:"rgba(0,0,0,.30)",padding:"7px 9px",display:"grid",gap:5}}>
            {[
              ["Score précédent",lastScoreToBeat==null?"—":lastScoreToBeat,"#d8b7ff"],
              ["Minimum à faire",requiredScore==null?"LIBRE":requiredScore>180?"IMPOSSIBLE":requiredScore,requiredScore!=null&&requiredScore>180?danger:"#ffca65"],
              ["Reste à faire",missingScore==null?"—":missingScore,previewSuccess?"#72f0a8":danger],
              ["Volée en cours",visitScore,previewSuccess?"#72f0a8":accent],
            ].map(([label,value,tone]:any)=><div key={label} style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,fontSize:11}}><span style={{color:"rgba(255,255,255,.76)",fontWeight:800}}>{label}</span><span style={{color:tone,fontWeight:1000,fontSize:14,textShadow:`0 0 10px ${tone}44`}}>{value}</span></div>)}
          </div>
          <div style={{display:"grid",justifyItems:"center",gap:5}}><HeartKpi value={activePlayer.lives} size={56} active/><div style={{display:"flex",alignItems:"center",gap:5,color:"rgba(255,255,255,.74)",fontSize:10,fontWeight:900}}><span style={{width:24,height:24,borderRadius:999,display:"grid",placeItems:"center",background:`${accent}1b`,border:`1px solid ${accent}66`,color:accent,fontSize:13}}>{aliveIds.length}</span> survivants</div><div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><span key={i} style={{minWidth:26,height:22,padding:"0 4px",borderRadius:9,display:"grid",placeItems:"center",background:"rgba(0,0,0,.45)",border:"1px solid rgba(255,255,255,.09)",color:i<currentThrow.length?"#fff":"rgba(255,255,255,.40)",fontSize:9,fontWeight:1000}}>{currentThrow[i]?fmtDart(currentThrow[i]):"—"}</span>)}</div></div>
        </div>
        <div style={{marginTop:7,textAlign:"center",fontSize:10,fontWeight:900,color:previewSuccess?"#72f0a8":"rgba(255,255,255,.56)"}}>{requiredScore==null?"Première volée : créez la référence":previewSuccess?"OBJECTIF ATTEINT — vous pouvez valider":`Il faut faire strictement plus que ${lastScoreToBeat}`}</div>
      </section>:null}

      <button type="button" onClick={()=>setPlayersOpen(true)} style={{...cardStyle,position:"relative",flex:"0 0 auto",width:"100%",height:92,padding:0,overflow:"hidden",cursor:"pointer",textAlign:"left",backgroundImage:`url(${tickerFiveLives2})`,backgroundSize:"cover",backgroundPosition:"center",color:"#fff"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(0,0,0,.80),rgba(0,0,0,.42),rgba(0,0,0,.70))"}}/>
        <div style={{position:"relative",height:"100%",display:"grid",gridTemplateRows:"36px 1fr"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",borderBottom:"1px solid rgba(255,255,255,.10)"}}><span style={{color:accent,fontWeight:1000,letterSpacing:1.1}}>JOUEURS</span><span style={{display:"flex",alignItems:"center",gap:8}}><span onClick={e=>{e.stopPropagation();setLogOpen(true)}} style={{padding:"5px 9px",borderRadius:999,border:`1px solid ${accent}66`,background:"rgba(0,0,0,.38)",color:accent,fontSize:10,fontWeight:1000}}>LOG</span><span style={{width:27,height:27,borderRadius:999,display:"grid",placeItems:"center",border:`2px solid ${accent}99`,color:accent,fontWeight:1000}}>{players.length}</span></span></div><div style={{display:"flex",alignItems:"center",gap:8,overflow:"hidden",padding:"7px 12px"}}>{players.map(p=><div key={p.id} style={{opacity:p.eliminated?.42:1}}><Avatar player={p} size={40} active={p.id===activePlayer?.id}/></div>)}</div></div>
      </button>

      <div style={{flex:"1 1 auto",minHeight:0}}/>

      {!winnerId&&!endOpen?<div ref={inputRef} style={{flex:"0 0 auto",zIndex:60,paddingTop:4,background:"linear-gradient(180deg,rgba(4,5,10,0),rgba(4,5,10,.82) 12%,#04050a 100%)"}}><div style={{maxWidth:760,margin:"0 auto"}}><ScoreInputHub currentThrow={currentThrow} multiplier={mult} onSimple={()=>setMult(1)} onDouble={()=>setMult(2)} onTriple={()=>setMult(3)} onBackspace={()=>setCurrentThrow(p=>p.slice(0,-1))} onCancel={()=>{setCurrentThrow([]);setMult(1)}} onNumber={n=>addDart({v:n,mult} as Dart)} onBull={()=>addDart({v:25,mult:mult===2?2:1} as Dart)} onValidate={()=>applyTurn(currentThrow,undefined,inputMethod)} onDirectDart={d=>addDart(d as Dart)} onSetVisitDarts={d=>{setCurrentThrow((d||[]).slice(0,3) as Dart[]);setMult(1)}} onSubmitVisitScore={score=>applyTurn([],score,"visit_score")} onCorrectVisitScore={()=>setCurrentThrow([])} preferredMethod={inputMethod} enablePresets={false} hideSwitcher hideTabs switcherMode="hidden" hidePreview hideTotal compact centerSlot={<div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,.48)",fontSize:9,fontWeight:900}}>VOLÉE</div><div style={{color:accent,fontSize:20,fontWeight:1000}}>{visitScore}</div></div>} disabled={!!winnerId}/></div></div>:null}

      {playersOpen?<div onClick={()=>setPlayersOpen(false)} style={{position:"fixed",inset:0,zIndex:100,display:"grid",placeItems:"center",padding:12,background:"rgba(0,0,0,.72)",backdropFilter:"blur(6px)"}}><div onClick={e=>e.stopPropagation()} style={{width:"min(540px,100%)",maxHeight:"80vh",overflow:"hidden",borderRadius:22,border:`1px solid ${accent}55`,background:"linear-gradient(180deg,#18141b,#08080c)",boxShadow:"0 26px 80px rgba(0,0,0,.78)"}}><div style={{height:48,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",borderBottom:"1px solid rgba(255,255,255,.10)"}}><div style={{color:accent,fontSize:16,fontWeight:1000}}>JOUEURS</div><button onClick={()=>setPlayersOpen(false)} style={{width:34,height:34,borderRadius:999,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:1000}}>×</button></div><div style={{maxHeight:"calc(80vh - 48px)",overflowY:"auto",padding:12,display:"grid",gap:8}}>{players.map((p,idx)=>{const active=idx===activeIndex&&!p.eliminated&&!winnerId,avg=p.stats.visits?p.stats.totalScore/p.stats.visits:0;return <div key={p.id} style={{display:"grid",gridTemplateColumns:"42px minmax(0,1fr) auto",gap:10,alignItems:"center",padding:"9px 10px",borderRadius:15,border:`1px solid ${active?`${accent}88`:"rgba(255,255,255,.08)"}`,background:p.eliminated?"linear-gradient(180deg,rgba(70,10,20,.84),rgba(15,7,10,.96))":active?`${accent}12`:"rgba(255,255,255,.035)",opacity:p.eliminated?.66:1}}><Avatar player={p} size={42} active={active}/><div style={{minWidth:0}}><div style={{color:active?accent:"#fff",fontSize:13,fontWeight:1000,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div><div style={{marginTop:3,display:"flex",gap:8,flexWrap:"wrap",color:"rgba(255,255,255,.58)",fontSize:9.5,fontWeight:800}}><span>Dernier {p.stats.lastScore??"—"}</span><span>Moy. {fmt1(avg)}</span><span>Best {p.stats.bestVisit||"—"}</span><span>Objectifs {pct(p.stats.successfulVisits,p.stats.targetsFaced)}%</span></div></div>{p.eliminated?<img src={deadListIcon as any} alt="Éliminé" style={{width:38,height:38,objectFit:"contain"}}/>:<HeartKpi value={p.lives} size={44} active={active}/>}</div>})}</div></div></div>:null}

      {logOpen?<div onClick={()=>setLogOpen(false)} style={{position:"fixed",inset:0,zIndex:105,display:"grid",placeItems:"center",padding:12,background:"rgba(0,0,0,.72)",backdropFilter:"blur(5px)"}}><div onClick={e=>e.stopPropagation()} style={{width:"min(540px,100%)",maxHeight:"78vh",overflow:"hidden",borderRadius:22,border:`1px solid ${accent}55`,background:"linear-gradient(180deg,#18141b,#08080c)"}}><div style={{height:48,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",borderBottom:"1px solid rgba(255,255,255,.10)"}}><div style={{color:accent,fontWeight:1000}}>FIL DE PARTIE</div><button onClick={()=>setLogOpen(false)} style={{width:34,height:34,borderRadius:999,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:1000}}>×</button></div><div style={{maxHeight:"calc(78vh - 48px)",overflowY:"auto",padding:12,display:"grid",gap:7}}>{recentEvents.length?recentEvents.map(ev=><div key={ev.id} style={{display:"grid",gridTemplateColumns:"30px 1fr auto",gap:8,alignItems:"center",padding:"8px 9px",borderRadius:12,background:"rgba(255,255,255,.04)",fontSize:10.5}}><span style={{color:"rgba(255,255,255,.42)",fontWeight:900}}>#{ev.turn}</span><span><b>{ev.playerName}</b> • {ev.openingVisit?"référence initiale":ev.success?`réussite +${ev.margin}`:`échec ${ev.margin}`}</span><span style={{color:ev.success?"#72f0a8":danger,fontWeight:1000}}>{ev.score}{ev.lifeLost?" • -1♥":""}</span></div>):<div style={{padding:10,color:"rgba(255,255,255,.52)",fontSize:11}}>La première volée apparaîtra ici.</div>}</div></div></div>:null}

      {quitOpen?<div onClick={()=>setQuitOpen(false)} style={{position:"fixed",inset:0,zIndex:115,display:"grid",placeItems:"center",padding:14,background:"rgba(0,0,0,.78)"}}><div onClick={e=>e.stopPropagation()} style={{width:"min(430px,100%)",padding:18,borderRadius:22,border:`1px solid ${accent}66`,background:"linear-gradient(180deg,#1b121c,#08080c)",boxShadow:"0 28px 80px rgba(0,0,0,.78)",textAlign:"center"}}><div style={{color:accent,fontSize:18,fontWeight:1000}}>QUITTER LA PARTIE ?</div><div style={{marginTop:8,color:"rgba(255,255,255,.68)",fontSize:12,lineHeight:1.4}}>La partie en cours ne sera pas enregistrée.</div><div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><button onClick={()=>setQuitOpen(false)} style={{height:42,borderRadius:999,border:"1px solid rgba(255,255,255,.14)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:1000}}>CONTINUER</button><button onClick={()=>go("five_lives_config")} style={{height:42,borderRadius:999,border:0,background:"linear-gradient(90deg,#ff4f70,#ff8a9d)",color:"#260008",fontWeight:1000}}>QUITTER</button></div></div></div>:null}

      {infoOpen?<InfoOverlay onClose={()=>setInfoOpen(false)} startingLives={startingLives}/>:null}
      {endOpen&&finalMatch?<div style={{position:"fixed",inset:0,zIndex:120,background:"rgba(0,0,0,.84)",overflowY:"auto",padding:"16px 10px calc(18px + env(safe-area-inset-bottom))"}}><div style={{width:"min(760px,100%)",margin:"0 auto",borderRadius:24,border:`1px solid ${accent}66`,background:"linear-gradient(180deg,#1a101b,#07070b)",boxShadow:"0 28px 80px rgba(0,0,0,.78)",overflow:"hidden"}}><div style={{padding:18,textAlign:"center",background:`radial-gradient(circle at 50% 0%,${accent}30,transparent 65%)`}}><div style={{color:"rgba(255,255,255,.55)",fontSize:10,fontWeight:1000,letterSpacing:1.2}}>PARTIE TERMINÉE</div><div style={{marginTop:4,color:accent,fontSize:26,fontWeight:1000,textTransform:"uppercase",textShadow:`0 0 18px ${accent}77`}}>Les 5 vies</div><div style={{marginTop:12,display:"flex",justifyContent:"center",alignItems:"center",gap:12}}><Avatar player={finalMatch.summary.rankings[0]} size={72} active/><div style={{textAlign:"left"}}><div style={{color:"rgba(255,255,255,.52)",fontSize:10,fontWeight:1000}}>VAINQUEUR</div><div style={{color:"#fff",fontSize:21,fontWeight:1000}}>{finalMatch.winnerName}</div><div style={{color:"#ff9bdc",fontSize:11,fontWeight:900}}>{finalMatch.summary.rankings[0]?.livesLeft} vie(s) restante(s)</div></div></div></div><div style={{padding:"0 14px 14px"}}><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}><Kpi label="Durée" value={fmtDuration(finalMatch.summary.durationMs)} tone="#d8b7ff"/><Kpi label="Volées" value={finalMatch.summary.totalVisits} tone="#ffca65"/><Kpi label="Meilleure volée" value={finalMatch.summary.highestVisit} tone="#72f0a8"/></div><div style={{marginTop:12,color:accent,fontSize:11,fontWeight:1000,letterSpacing:.8}}>CLASSEMENT ET STATISTIQUES</div><div style={{marginTop:7,overflowX:"auto",borderRadius:15,border:"1px solid rgba(255,255,255,.09)"}}><table style={{width:"100%",minWidth:760,borderCollapse:"collapse",fontSize:10.5}}><thead><tr style={{color:"#ff8bd6",background:"rgba(255,79,184,.09)",textAlign:"left"}}>{['#','Joueur','Vies','Perdues','Volées','Moy.','Best','Réussite','Échecs','Best marge','S','D','T','Bull','DBull','Miss'].map(x=><th key={x} style={{padding:"9px 7px",whiteSpace:"nowrap"}}>{x}</th>)}</tr></thead><tbody>{finalMatch.summary.rankings.map((p:any)=><tr key={p.id} style={{borderTop:"1px solid rgba(255,255,255,.065)",background:p.isWinner?`${accent}0d`:"transparent"}}><td style={endTd}>{p.rank}</td><td style={{...endTd,color:p.isWinner?"#ff9bdc":"#fff",fontWeight:1000}}>{p.name}{p.isWinner?" 🏆":""}</td><td style={endTd}>{p.livesLeft}</td><td style={endTd}>{p.livesLost}</td><td style={endTd}>{p.visits}</td><td style={endTd}>{fmt1(p.avgVisit)}</td><td style={endTd}>{p.bestVisit}</td><td style={endTd}>{p.successRate}%</td><td style={endTd}>{p.failedVisits}</td><td style={endTd}>+{p.bestMargin}</td><td style={endTd}>{p.singles}</td><td style={endTd}>{p.doubles}</td><td style={endTd}>{p.triples}</td><td style={endTd}>{p.bulls}</td><td style={endTd}>{p.dbulls}</td><td style={endTd}>{p.misses}</td></tr>)}</tbody></table></div><div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1.25fr",gap:8}}><button type="button" onClick={()=>go("five_lives_config")} style={{height:44,borderRadius:999,border:"1px solid rgba(255,255,255,.16)",background:"rgba(255,255,255,.045)",color:"#fff",fontWeight:1000}}>REJOUER</button><button type="button" onClick={finishAndSave} style={{height:44,borderRadius:999,border:0,background:"linear-gradient(90deg,#ff4fb8,#ff9cda)",color:"#260018",fontWeight:1000,boxShadow:`0 12px 28px ${accent}33`}}>SAUVEGARDER & HISTORIQUE</button></div></div></div></div>:null}
    </div>
  );
}
const endTd:React.CSSProperties={padding:"9px 7px",color:"rgba(255,255,255,.82)",fontWeight:850,whiteSpace:"nowrap"};
