// @ts-nocheck
// =============================================================
// BOWLING DARTS — play complet
// 10 frames, scoring bowling officiel, bots, undo, équipes, série BO1/3/5,
// historique + stats détaillées.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  bowlingFrameMark,
  bowlingRollMaxPins,
  bowlingVisitPins,
  cloneBowlingState,
  createBowlingState,
  emptyBowlingStats,
  getBowlingActivePlayerId,
  getBowlingCurrentFrame,
  getBowlingPlayerFrameIndex,
  getBowlingPlayerScore,
  playBowlingRoll,
  type BowlingConfigPayload,
  type BowlingPlayerStats,
  type BowlingState,
  type BowlingTeamConfig,
} from "../lib/gameEngines/bowlingEngine";
import tickerBowling from "../assets/tickers/ticker_bowling.png";

type UiDart = { v: number; mult: 1 | 2 | 3 };
const C = { gold: "#f6c256", cyan: "#42d6ff", pink: "#ff63b8", red: "#ff667e", green: "#a98bff", text: "#f8fafc", soft: "rgba(226,232,240,.72)" };

function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const total = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
function toGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function uiLabel(dart: UiDart) { if (!dart || dart.v === 0) return "MISS"; if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL"; return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`; }
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }

function normalizeConfig(props: any): BowlingConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  return {
    mode: "bowling", participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 1)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [], teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {}, botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [], botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    setsToWin: raw?.setsToWin === 2 || raw?.setsToWin === 3 ? raw.setsToWin : 1,
    difficulty: raw?.difficulty === "easy" || raw?.difficulty === "hard" ? raw.difficulty : "normal",
    bullStrike: raw?.bullStrike !== false, doubleSpare: raw?.doubleSpare !== false,
    randomOrder: Boolean(raw?.randomOrder), scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function botSkill(level: string) { const v = String(level || "").toLowerCase(); if (v.includes("hard") || v.includes("pro") || v.includes("diffic")) return .72; if (v.includes("easy") || v.includes("facile")) return .34; return .52; }
function randomBotVisit(level: string, maxPins: number, bullStrike: boolean, secondBall: boolean, doubleSpare: boolean): UiDart[] {
  const skill = botSkill(level);
  if (bullStrike && maxPins === 10 && Math.random() < skill * .38) {
    return [{ v: 25, mult: Math.random() < .35 ? 2 : 1 }, { v: Math.max(15, Math.ceil(Math.random() * 20)), mult: 1 }, { v: 0, mult: 1 }];
  }
  if (doubleSpare && secondBall && Math.random() < skill * .52) {
    const n = 12 + Math.floor(Math.random() * 9);
    return [{ v: n, mult: 2 }, { v: 18 + Math.floor(Math.random() * 3), mult: 1 }, { v: Math.random() < .2 ? 0 : 20, mult: 1 }];
  }
  return Array.from({ length: 3 }, () => {
    if (Math.random() > skill + .16) return { v: 0, mult: 1 as const };
    const high = 12 + Math.floor(Math.random() * 9);
    const r = Math.random();
    return { v: high, mult: r < skill * .22 ? 3 as const : r < skill * .48 ? 2 as const : 1 as const };
  });
}

function RulesContent({ config, primary }: { config: BowlingConfigPayload; primary: string }) {
  const bo = config.setsToWin === 1 ? "BO1" : config.setsToWin === 2 ? "BO3" : "BO5";
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: primary }}>FORMAT</strong><br />10 frames par partie · {bo}. Une volée de 3 fléchettes correspond à un lancer de bowling.</div>
    <div><strong style={{ color: C.gold }}>STRIKE</strong><br />10 quilles au premier lancer : frame terminée. {config.bullStrike ? "BULL ou DBULL provoque automatiquement le strike." : "BULL est converti comme les autres impacts."}</div>
    <div><strong style={{ color: C.pink }}>SPARE</strong><br />10 quilles en deux lancers. {config.doubleSpare ? "Un DOUBLE au second lancer abat toutes les quilles restantes." : "Le spare doit être obtenu uniquement par la conversion de quilles."}</div>
    <div><strong style={{ color: C.cyan }}>SCORING</strong><br />Strike = 10 + deux lancers suivants. Spare = 10 + lancer suivant. La 10e frame gère automatiquement les boules bonus exactement comme au bowling.</div>
    <div><strong style={{ color: C.green }}>VOCABULAIRE BOWLING</strong><br /><b>Open frame</b> : des quilles restent après deux lancers. <b>Gutter</b> : 0 quille. Deux strikes = <b>Double</b>, trois = <b>Turkey</b>, puis Four/Five Bagger.</div>
    <div><strong style={{ color: C.gold }}>ANIMATION DE PISTE</strong><br />Chaque volée validée déclenche la boule, le rack de quilles, l'impact, les quilles abattues et le sweep. Le rack affiché correspond au nombre de quilles encore debout avant le lancer.</div>
    <div><strong style={{ color: C.pink }}>RAPPORT DE FIN</strong><br />Rapport Bowling complet : high game, moyenne, clean frames, taux de strike, conversion des spares, 1re boule moyenne, gutters, séries X, 200+/250+/300, feuilles des 10 frames et chronologie des lancers.</div>
    <div><strong style={{ color: primary }}>ANNULER</strong><br />Avec une volée en cours : retire la dernière fléchette. Volée vide : restaure le lancer précédent.</div>
  </div>;
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || null;
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${team?.color || C.gold}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${team?.color || C.gold}18`, boxShadow: `0 0 15px ${team?.color || C.gold}44`, flex: "0 0 auto" }}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: team?.color || C.gold, fontWeight: 1000, fontSize: size * .34 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}</div>;
}

function Scorecard({ state, playerId, primary }: { state: BowlingState; playerId: string; primary: string }) {
  const frames = state.framesByPlayer[playerId] || [];
  const current = getBowlingPlayerFrameIndex(state, playerId);
  return <div style={{ overflowX: "auto", paddingBottom: 2 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(10,minmax(58px,1fr))", gap: 5, minWidth: 650 }}>
    {frames.map((frame, index) => {
      const active = index === current && !frame.complete;
      return <div key={frame.index} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${active ? primary : frame.strike ? C.gold + "88" : frame.spare ? C.pink + "88" : "rgba(255,255,255,.09)"}`, background: active ? `${primary}12` : "rgba(0,0,0,.22)" }}>
        <div style={{ padding: "4px 5px", color: active ? primary : "rgba(255,255,255,.55)", fontSize: 8.5, fontWeight: 1000, textAlign: "center" }}>F{frame.index}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${frame.index === 10 ? 3 : 2},1fr)`, minHeight: 25, borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          {Array.from({ length: frame.index === 10 ? 3 : 2 }, (_, r) => <div key={r} style={{ display: "grid", placeItems: "center", fontSize: 12, fontWeight: 1100, color: bowlingFrameMark(frame, r) === "X" ? C.gold : bowlingFrameMark(frame, r) === "/" ? C.pink : "#fff", borderLeft: r ? "1px solid rgba(255,255,255,.06)" : "none" }}>{bowlingFrameMark(frame, r) || "·"}</div>)}
        </div>
        <div style={{ minHeight: 28, display: "grid", placeItems: "center", color: frame.cumulative != null ? primary : "rgba(255,255,255,.24)", fontSize: 14, fontWeight: 1100 }}>{frame.cumulative ?? "—"}</div>
      </div>;
    })}
  </div></div>;
}


type BowlingLaneEvent = {
  id: string;
  playerId: string;
  playerName: string;
  gameNo: number;
  frame: number;
  roll: number;
  pins: number;
  maxPins: number;
  standingPins: number[];
  knockedPins: number[];
  strike: boolean;
  spare: boolean;
  gutter: boolean;
  bullStrike: boolean;
  doubleSpare: boolean;
  strikeStreak: number;
  labels: string[];
};

const PIN_POS: Record<number, [number, number]> = {
  1: [50, 19],
  2: [43, 28], 3: [57, 28],
  4: [36, 37], 5: [50, 37], 6: [64, 37],
  7: [29, 46], 8: [43, 46], 9: [57, 46], 10: [71, 46],
};

function hashText(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h >>> 0);
}
function seededOrder(seed: number) {
  const arr = [1,2,3,4,5,6,7,8,9,10];
  let x = seed || 1;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const j = x % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function simulatedPinDeck(maxPins: number, knocked: number, seed: number) {
  const count = Math.max(0, Math.min(10, maxPins));
  const order = seededOrder(seed);
  // Un rack neuf affiche naturellement les 10 quilles. Sur le second lancer,
  // on simule une configuration plausible des quilles encore debout.
  const standing = count === 10 ? [1,2,3,4,5,6,7,8,9,10] : order.slice(0, count).sort((a,b) => a-b);
  const fallOrder = seededOrder(seed ^ 0x9e3779b9).filter((id) => standing.includes(id));
  return { standing, knocked: fallOrder.slice(0, Math.max(0, Math.min(knocked, standing.length))) };
}
function strikeCall(streak: number) {
  if (streak >= 6) return `${streak} STRIKES !`;
  if (streak === 5) return "FIVE BAGGER !";
  if (streak === 4) return "FOUR BAGGER !";
  if (streak === 3) return "TURKEY !";
  if (streak === 2) return "DOUBLE !";
  return "STRIKE !";
}
function BowlingPin({ id, knocked, delay = 0 }: { id: number; knocked: boolean; delay?: number }) {
  const [x,y] = PIN_POS[id] || [50, 40];
  const side = id % 2 ? 1 : -1;
  return <div className={`dc-bowl-pin ${knocked ? "is-knocked" : ""}`} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${.76 + delay}s`, ['--pin-side' as any]: side }}>
    <div className="dc-bowl-pin-head" /><div className="dc-bowl-pin-neck" /><div className="dc-bowl-pin-body"><i /><i /></div>
  </div>;
}
function BowlingLaneCinematic({ event, primary, onSkip }: { event: BowlingLaneEvent; primary: string; onSkip: () => void }) {
  const result = event.strike ? strikeCall(event.strikeStreak) : event.spare ? "SPARE !" : event.gutter ? "GUTTER" : `${event.pins} QUILLE${event.pins > 1 ? "S" : ""}`;
  const resultColor = event.strike ? C.gold : event.spare ? C.pink : event.gutter ? C.red : primary;
  const after = Math.max(0, event.maxPins - event.pins);
  const allPins = event.standingPins;
  return <div className="dc-bowl-cinema" role="dialog" aria-label={`Animation bowling ${result}`}>
    <style>{`
      @keyframes dcBowlBall {0%{transform:translate(-50%,0) scale(1.06);filter:blur(.2px)}68%{transform:translate(-50%,-270px) scale(.58);filter:blur(0)}78%,100%{transform:translate(-50%,-292px) scale(.48);opacity:.1}}
      @keyframes dcBowlPinFall {0%,64%{transform:translate(-50%,-50%) rotate(0) translate(0,0);opacity:1}82%{transform:translate(-50%,-50%) rotate(calc(var(--pin-side)*68deg)) translate(calc(var(--pin-side)*24px),18px);opacity:1}100%{transform:translate(-50%,-50%) rotate(calc(var(--pin-side)*105deg)) translate(calc(var(--pin-side)*46px),34px);opacity:.08}}
      @keyframes dcBowlImpact {0%,69%{opacity:0;transform:translate(-50%,-50%) scale(.2)}76%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.1)}}
      @keyframes dcBowlSweep {0%,78%{transform:translateY(-72px);opacity:0}84%{opacity:1}100%{transform:translateY(105px);opacity:.82}}
      @keyframes dcBowlResult {0%,69%{opacity:0;transform:translateY(12px) scale(.82)}79%{opacity:1;transform:translateY(0) scale(1.08)}100%{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes dcBowlShine {0%{transform:translateX(-140%)}100%{transform:translateX(160%)}}
      @keyframes dcBowlParticle {0%,70%{opacity:0;transform:translate(0,0) scale(.2)}76%{opacity:1}100%{opacity:0;transform:translate(var(--px),var(--py)) rotate(var(--pr)) scale(1)}}
      .dc-bowl-cinema{position:fixed;inset:0;z-index:9996;background:radial-gradient(circle at 50% 35%,rgba(14,28,45,.36),rgba(0,0,0,.88) 72%);backdrop-filter:blur(5px);display:grid;place-items:center;padding:12px;box-sizing:border-box;overflow:hidden}
      .dc-bowl-stage{position:relative;width:min(560px,96vw);height:min(620px,86vh);min-height:470px;border-radius:28px;overflow:hidden;border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,#070a12 0%,#0b1320 28%,#05070c 100%);box-shadow:0 35px 90px rgba(0,0,0,.68)}
      .dc-bowl-sign{position:absolute;z-index:12;top:18px;left:18px;right:18px;text-align:center}
      .dc-bowl-result{margin-top:3px;font-size:clamp(29px,8vw,52px);line-height:1;font-weight:1100;letter-spacing:1.5px;text-shadow:0 0 28px currentColor;animation:dcBowlResult 1.35s ease both}
      .dc-bowl-lane-wrap{position:absolute;left:4%;right:4%;top:80px;bottom:22px;perspective:700px;overflow:hidden;border-radius:22px}
      .dc-bowl-lane{position:absolute;left:50%;top:0;width:94%;height:100%;transform:translateX(-50%);clip-path:polygon(35% 0,65% 0,98% 100%,2% 100%);background:repeating-linear-gradient(90deg,rgba(130,75,24,.08) 0 3px,transparent 3px 58px),linear-gradient(90deg,#b77731,#e1a451 16%,#f2c676 50%,#dda04e 84%,#a9652c);box-shadow:inset 0 0 46px rgba(75,35,0,.38)}
      .dc-bowl-lane:after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.20) 45%,transparent 58%);animation:dcBowlShine 1.8s linear infinite;opacity:.35}
      .dc-bowl-gutter{position:absolute;top:0;bottom:0;width:12%;background:linear-gradient(90deg,#111820,#27323c,#0a0d11);box-shadow:inset 0 0 14px #000;z-index:2}.dc-bowl-gutter.left{left:0;clip-path:polygon(58% 0,100% 0,100% 100%,0 100%)}.dc-bowl-gutter.right{right:0;clip-path:polygon(0 0,42% 0,100% 100%,0 100%)}
      .dc-bowl-deck{position:absolute;z-index:5;left:25%;right:25%;top:15px;height:150px;transform:perspective(420px) rotateX(14deg);transform-origin:50% 0}
      .dc-bowl-pin{position:absolute;width:18px;height:48px;transform:translate(-50%,-50%);transform-origin:50% 75%;z-index:7}.dc-bowl-pin.is-knocked{animation:dcBowlPinFall 1.45s cubic-bezier(.2,.7,.25,1) forwards}
      .dc-bowl-pin-head{position:absolute;left:5px;top:0;width:9px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.45)}.dc-bowl-pin-neck{position:absolute;left:6px;top:8px;width:7px;height:12px;border-radius:45%;background:#fff}.dc-bowl-pin-body{position:absolute;left:2px;top:15px;width:15px;height:30px;border-radius:46% 46% 38% 38%/30% 30% 65% 65%;background:linear-gradient(90deg,#dfe7eb,#fff 48%,#cbd5dc);box-shadow:0 5px 7px rgba(0,0,0,.24)}.dc-bowl-pin-body i{position:absolute;left:1px;right:1px;height:2px;background:#f24554}.dc-bowl-pin-body i:first-child{top:4px}.dc-bowl-pin-body i:last-child{top:8px}
      .dc-bowl-ball{position:absolute;z-index:9;left:50%;bottom:32px;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.48),transparent 19%),radial-gradient(circle at 64% 35%,#05070b 0 4%,transparent 5%),radial-gradient(circle at 74% 48%,#05070b 0 4%,transparent 5%),linear-gradient(145deg,${primary},#17253c 68%,#020306);box-shadow:0 14px 20px rgba(0,0,0,.42),0 0 22px ${primary}55;animation:dcBowlBall 1.08s cubic-bezier(.38,.05,.7,.15) forwards}
      .dc-bowl-impact{position:absolute;z-index:8;left:50%;top:74px;width:115px;height:115px;border-radius:50%;border:5px solid ${resultColor};box-shadow:0 0 34px ${resultColor};animation:dcBowlImpact 1.35s ease forwards}
      .dc-bowl-sweep{position:absolute;z-index:10;left:26%;right:26%;top:55px;height:16px;border-radius:4px;background:linear-gradient(180deg,#dce4ea,#67717c);border-bottom:3px solid #2e3439;box-shadow:0 7px 10px rgba(0,0,0,.35);animation:dcBowlSweep 1.8s ease forwards}
      .dc-bowl-particle{position:absolute;z-index:11;left:50%;top:150px;width:8px;height:15px;border-radius:2px;background:${resultColor};animation:dcBowlParticle 1.45s ease-out forwards}
      .dc-bowl-skip{position:absolute;right:14px;bottom:14px;z-index:20;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.48);color:rgba(255,255,255,.72);font-size:9px;font-weight:900;padding:8px 11px;cursor:pointer}
      @media (max-height:600px){.dc-bowl-stage{height:94vh;min-height:0}.dc-bowl-lane-wrap{top:68px}.dc-bowl-sign{top:10px}.dc-bowl-result{font-size:30px}}
    `}</style>
    <div className="dc-bowl-stage">
      <div className="dc-bowl-sign"><div style={{ color: "rgba(255,255,255,.63)", fontSize: 9, fontWeight: 1000, letterSpacing: 1.3 }}>PARTIE {event.gameNo} · FRAME {event.frame} · LANCER {event.roll} · {event.playerName.toUpperCase()}</div><div className="dc-bowl-result" style={{ color: resultColor }}>{result}</div><div style={{ marginTop: 7, color: "rgba(255,255,255,.7)", fontSize: 10, fontWeight: 850 }}>{event.bullStrike ? "BULL → STRIKE" : event.doubleSpare ? "DOUBLE → SPARE" : `${event.pins}/${event.maxPins} abattues · ${after} restante${after > 1 ? "s" : ""}`}</div></div>
      <div className="dc-bowl-lane-wrap"><div className="dc-bowl-lane"/><div className="dc-bowl-gutter left"/><div className="dc-bowl-gutter right"/>
        <div className="dc-bowl-deck">{allPins.map((id, index) => <BowlingPin key={id} id={id} knocked={event.knockedPins.includes(id)} delay={index * .018} />)}</div>
        <div className="dc-bowl-impact"/><div className="dc-bowl-sweep"/><div className="dc-bowl-ball"/>
        {(event.strike || event.spare) ? Array.from({length:18},(_,i) => { const angle=(Math.PI*2*i)/18; const dist=70+(i%5)*14; return <i key={i} className="dc-bowl-particle" style={{ ['--px' as any]: `${Math.cos(angle)*dist}px`, ['--py' as any]: `${Math.sin(angle)*dist}px`, ['--pr' as any]: `${i*37}deg`, animationDelay: `${(i%4)*.018}s` }} />; }) : null}
      </div>
      <div style={{ position:"absolute",left:16,right:16,bottom:16,zIndex:13,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,color:"rgba(255,255,255,.52)",fontSize:8.5,fontWeight:850 }}><span>{event.labels.join(" · ")}</span><span>RACK {event.maxPins} → {after}</span></div>
      <button className="dc-bowl-skip" onClick={onSkip}>PASSER</button>
    </div>
  </div>;
}

function StaticFramesScorecard({ frames, primary }: { frames: any[]; primary: string }) {
  return <div style={{ overflowX:"auto", paddingBottom:2 }}><div style={{ display:"grid",gridTemplateColumns:"repeat(10,minmax(54px,1fr))",gap:4,minWidth:620 }}>
    {(frames || []).map((frame:any) => <div key={frame.index} style={{ borderRadius:10,overflow:"hidden",border:`1px solid ${frame.strike ? C.gold+"88" : frame.spare ? C.pink+"88" : "rgba(255,255,255,.08)"}`,background:"rgba(0,0,0,.20)" }}><div style={{ padding:"4px",textAlign:"center",fontSize:8,fontWeight:1000,color:"rgba(255,255,255,.48)" }}>F{frame.index}</div><div style={{display:"grid",gridTemplateColumns:`repeat(${frame.index===10?3:2},1fr)`,minHeight:23,borderTop:"1px solid rgba(255,255,255,.05)",borderBottom:"1px solid rgba(255,255,255,.05)"}}>{Array.from({length:frame.index===10?3:2},(_,r)=><div key={r} style={{display:"grid",placeItems:"center",fontSize:11,fontWeight:1100,color:bowlingFrameMark(frame,r)==="X"?C.gold:bowlingFrameMark(frame,r)==="/"?C.pink:"#fff"}}>{bowlingFrameMark(frame,r)||"·"}</div>)}</div><div style={{height:26,display:"grid",placeItems:"center",color:frame.cumulative!=null?primary:"rgba(255,255,255,.25)",fontWeight:1100,fontSize:13}}>{frame.cumulative ?? "—"}</div></div>)}
  </div></div>;
}

export default function BowlingPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || C.gold;
  const secondary = theme?.accent1 || C.cyan;
  const themeText = theme?.text || C.text;
  const themeSoft = theme?.textSoft || C.soft;

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const map = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) map.set(id, { ...(map.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = (config.selectedIds || []).map((id) => map.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);
  const teamConfigs = React.useMemo<BowlingTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({ id: String(team?.id || `team-${index + 1}`), name: String(team?.name || `Équipe ${index + 1}`), color: team?.color || [C.gold, C.pink, C.cyan, C.green][index % 4], logoDataUrl: team?.logoDataUrl || team?.logoUrl || null, playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [], isBotTeam: Boolean(team?.isBotTeam) })), [config.teamConfigs]);
  const rules = React.useMemo(() => ({ participantMode: config.participantMode, setsToWin: config.setsToWin, difficulty: config.difficulty, bullStrike: config.bullStrike, doubleSpare: config.doubleSpare }), [config]);
  const initialState = React.useMemo(() => createBowlingState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<BowlingState>(initialState);
  const [undoStack, setUndoStack] = React.useState<BowlingState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [laneEvent, setLaneEvent] = React.useState<BowlingLaneEvent | null>(null);
  const laneTimerRef = React.useRef<number | null>(null);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`bowling-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);
  const prevGameRef = React.useRef(state.gameNo);

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const activePlayerId = getBowlingActivePlayerId(state);
  const activeProfile = byId.get(String(activePlayerId)) || state.players.find((p) => p.id === activePlayerId) || state.players[0];
  const activeStats = state.statsByPlayer[activePlayerId] || emptyBowlingStats();
  const activeTeamId = state.teamByPlayer[activePlayerId] || null;
  const activeTeam = activeTeamId ? teamById.get(activeTeamId) : null;
  const activeScore = getBowlingPlayerScore(state, activePlayerId);
  const frame = getBowlingCurrentFrame(state, activePlayerId);
  const frameIndex = getBowlingPlayerFrameIndex(state, activePlayerId);
  const maxPins = bowlingRollMaxPins(frame);
  const currentCalc = frame ? bowlingVisitPins(throwDarts.map(toGameDart), frame, state.rules) : { pins: 0, maxPins: 10, bullStrike: false, doubleSpare: false };
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const boLabel = config.setsToWin === 1 ? "BO1" : config.setsToWin === 2 ? "BO3" : "BO5";

  function commitRoll(darts: UiDart[]) {
    if (state.finished || darts.length < 1 || laneEvent) return;
    const playerId = getBowlingActivePlayerId(state);
    const currentFrame = getBowlingCurrentFrame(state, playerId);
    if (!currentFrame) return;
    const gameDarts = darts.map(toGameDart);
    const calc = bowlingVisitPins(gameDarts, currentFrame, state.rules);
    const rollNo = currentFrame.rolls.length + 1;
    const strike = calc.maxPins === 10 && calc.pins === 10;
    const spare = !strike && rollNo > 1 && calc.maxPins > 0 && calc.maxPins < 10 && calc.pins === calc.maxPins;
    const streakBefore = Number(state.statsByPlayer[playerId]?.strikeStreak || 0);
    const seed = hashText(`${playerId}|${state.gameNo}|${currentFrame.index}|${rollNo}|${gameDarts.map((d:any)=>`${d.bed}${d.number||""}`).join("-")}`);
    const deck = simulatedPinDeck(calc.maxPins, calc.pins, seed);
    const profile = byId.get(String(playerId)) || state.players.find((p:any) => p.id === playerId);
    const event: BowlingLaneEvent = {
      id: `${Date.now()}-${seed}`, playerId, playerName: playerName(profile), gameNo: state.gameNo, frame: currentFrame.index, roll: rollNo,
      pins: calc.pins, maxPins: calc.maxPins, standingPins: deck.standing, knockedPins: deck.knocked, strike, spare, gutter: calc.pins === 0,
      bullStrike: calc.bullStrike, doubleSpare: calc.doubleSpare, strikeStreak: strike ? streakBefore + 1 : 0, labels: darts.map(uiLabel),
    };
    setUndoStack((stack) => [...stack.slice(-59), cloneBowlingState(state)]);
    setState((prev) => playBowlingRoll(prev, getBowlingActivePlayerId(prev), gameDarts));
    setThrowDarts([]); setMultiplier(1); setNotice(""); setLaneEvent(event);
    if (laneTimerRef.current) window.clearTimeout(laneTimerRef.current);
    laneTimerRef.current = window.setTimeout(() => { setLaneEvent(null); laneTimerRef.current = null; }, strike || spare ? 2250 : 1850);
  }
  function addDart(value: number, directMultiplier?: 1 | 2 | 3) {
    if (state.finished || botThinking || laneEvent || throwDarts.length >= 3) return;
    const mult = directMultiplier || multiplier;
    const dart: UiDart = value === 25 ? { v: 25, mult: mult === 2 ? 2 : 1 } : { v: Math.max(0, Math.min(20, Number(value) || 0)), mult };
    const next = [...throwDarts, dart]; setThrowDarts(next); if (mult > 1) setMultiplier(1);
    if (next.length === 3) setNotice("Volée complète — VALIDER");
  }
  function validateRoll() {
    if (state.finished || botThinking || laneEvent) return;
    if (throwDarts.length !== 3) { setNotice("BOWLING se joue avec 3 fléchettes par lancer."); return; }
    commitRoll(throwDarts);
  }
  function cancelOrUndo() {
    if (botThinking || laneEvent) return;
    if (throwDarts.length) { setThrowDarts((prev) => prev.slice(0, -1)); setMultiplier(1); setNotice(""); return; }
    if (undoStack.length) { const previous = undoStack[undoStack.length - 1]; setUndoStack((stack) => stack.slice(0, -1)); setState(cloneBowlingState(previous)); setShowEnd(false); setNotice("Lancer précédent restauré."); }
  }

  React.useEffect(() => {
    if (prevGameRef.current !== state.gameNo && !state.finished) {
      const justFinished = state.completedGames[state.completedGames.length - 1];
      const winner = justFinished?.tied ? "Égalité" : state.standings.slice().sort((a, b) => b.setWins - a.setWins)[0]?.name;
      setNotice(`Partie ${state.gameNo - 1} terminée${winner ? ` · ${winner}` : ""} — partie ${state.gameNo}`);
      prevGameRef.current = state.gameNo;
    }
  }, [state.gameNo, state.finished]);

  React.useEffect(() => {
    if (laneEvent || !activeProfile || state.finished || !isBot(activeProfile, botIds)) { setBotThinking(false); return; }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const secondBall = Boolean(frame?.rolls?.length);
    const timer = window.setTimeout(() => {
      const darts = randomBotVisit(String(level), maxPins, config.bullStrike, secondBall, config.doubleSpare);
      commitRoll(darts); setBotThinking(false);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.activePlayerIndex, state.gameNo, state.finished, activePlayerId, frameIndex, frame?.rolls?.length, laneEvent?.id]);

  function resetMatch() {
    const next = createBowlingState(profiles as any, rules, teamConfigs, config.selectedIds);
    setState(next); setUndoStack([]); setThrowDarts([]); setMultiplier(1); setShowEnd(false); setShowTable(false); setShowStats(false); setNotice(""); setLaneEvent(null);
    if (laneTimerRef.current) { window.clearTimeout(laneTimerRef.current); laneTimerRef.current = null; }
    matchIdRef.current = `bowling-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; autoSavedRef.current = ""; prevGameRef.current = 1;
  }
  function backToConfig() {
    const now = Date.now(); if (now - lastBackRef.current < 350) return; lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de BOWLING en cours ?")) return;
    if (typeof go === "function") go("bowling_config", config);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityIds = new Set(state.winnerIds || []);
    const teams = state.teams.map((team) => {
      const standing = state.standings.find((row) => row.id === team.id);
      return { ...team, players: team.playerIds, score: standing?.score || 0, setWins: standing?.setWins || 0, winner: winnerEntityIds.has(team.id) };
    });
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats: BowlingPlayerStats = state.statsByPlayer[player.id] || emptyBowlingStats();
      const teamId = state.teamByPlayer[player.id] || null;
      const entityId = config.participantMode === "teams" ? teamId : player.id;
      const standing = state.standings.find((row) => row.id === entityId);
      const win = Boolean(entityId && winnerEntityIds.has(entityId));
      const score = getBowlingPlayerScore(state, player.id);
      const games = state.completedGames.map((game) => Number(game.scoresByPlayer?.[player.id] || 0));
      const reportFrames = state.completedGames.flatMap((game: any) => Array.isArray(game?.framesByPlayer?.[player.id]) ? game.framesByPlayer[player.id] : []);
      const strikeFrames = reportFrames.filter((f: any) => f?.strike).length;
      const spareFrames = reportFrames.filter((f: any) => f?.spare).length;
      const openFramesReport = reportFrames.filter((f: any) => f?.open).length;
      const cleanFrames = strikeFrames + spareFrames;
      const spareOpportunities = reportFrames.filter((f: any) => Number(f?.rolls?.[0] || 0) < 10).length;
      const firstBalls = reportFrames.map((f: any) => Number(f?.rolls?.[0] || 0)).filter((v: any) => Number.isFinite(v));
      const firstBallAvg = firstBalls.length ? Math.round((firstBalls.reduce((a: number,b: number)=>a+b,0) / firstBalls.length) * 100) / 100 : 0;
      const games200 = games.filter((v) => v >= 200).length;
      const games250 = games.filter((v) => v >= 250).length;
      const perfectGames = games.filter((v) => v === 300).length;
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, teamId, team: teamId, teamName: teamId ? teamById.get(teamId)?.name : null,
        win, winner: win, rank: standing?.rank || 1, score, finalScore: score, setWins: standing?.setWins || 0,
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, rolls: stats.visits, pins: stats.pins, strikes: stats.strikes, spares: stats.spares, openFrames: stats.openFrames, gutters: stats.gutters,
        singles: stats.singles, doubles: stats.doubles, triples: stats.triples, bulls: stats.bulls, dbulls: stats.dbulls, misses: stats.misses,
        bestRoll: stats.bestRoll, bestStrikeStreak: stats.bestStrikeStreak, highGame: stats.highGame, gamesPlayed: stats.gamesPlayed, gamesWon: stats.gamesWon,
        strikeRate: pct(strikeFrames, Math.max(1, reportFrames.length)), spareRate: pct(spareFrames, Math.max(1, spareOpportunities)),
        cleanFrames, cleanFrameRate: pct(cleanFrames, Math.max(1, reportFrames.length)), strikeFrames, spareFrames, openFramesReport, framesPlayed: reportFrames.length, spareOpportunities, firstBallAvg,
        games200, games250, perfectGames, avgGame: games.length ? Math.round((games.reduce((a,b)=>a+b,0)/games.length)*10)/10 : 0,
        avgPinsPerRoll: stats.visits ? Math.round((stats.pins / stats.visits) * 10) / 10 : 0, gameScores: games, frameReport: state.completedGames.map((game: any) => ({ gameNo: game.gameNo, score: Number(game.scoresByPlayer?.[player.id] || 0), frames: game.framesByPlayer?.[player.id] || [] })), rawStats: stats,
      };
    });
    const winnerStanding = state.tied ? null : state.standings.find((row) => winnerEntityIds.has(row.id)) || state.standings[0] || null;
    const winnerId = state.tied ? null : winnerStanding?.id || null;
    const matchStats = {
      durationMs: Math.max(0, now - state.startedAt), totalDarts: playerRows.reduce((a, p) => a + p.darts, 0), totalRolls: playerRows.reduce((a, p) => a + p.rolls, 0), totalPins: playerRows.reduce((a, p) => a + p.pins, 0),
      strikes: playerRows.reduce((a, p) => a + p.strikes, 0), spares: playerRows.reduce((a, p) => a + p.spares, 0), gutters: playerRows.reduce((a, p) => a + p.gutters, 0),
      cleanFrames: playerRows.reduce((a, p) => a + Number(p.cleanFrames || 0), 0), framesPlayed: playerRows.reduce((a,p) => a + Number(p.framesPlayed || 0), 0),
      highGame: playerRows.reduce((m, p) => Math.max(m, p.highGame || p.score || 0), 0), perfectGames: playerRows.reduce((a,p) => a + Number(p.perfectGames || 0), 0), games200: playerRows.reduce((a,p) => a + Number(p.games200 || 0), 0), games250: playerRows.reduce((a,p) => a + Number(p.games250 || 0), 0), gamesPlayed: state.completedGames.length,
    };
    const summary = {
      kind: "bowling", mode: "bowling", sport: "darts", finished: true, participantMode: config.participantMode, winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      setsToWin: state.rules.setsToWin, series: boLabel, gamesPlayed: state.completedGames.length, completedGames: state.completedGames,
      duration: matchStats.durationMs, durationMs: matchStats.durationMs, standings: state.standings, rankings: state.standings, players: playerRows, perPlayer: playerRows, teams, matchStats,
      scoreLine: state.standings.map((row) => `${row.name} ${row.setWins}-${row.score}`).join(" • "), game: { mode: "bowling", teams },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "bowling", mode: "bowling", sport: "darts", status: "finished", createdAt: state.startedAt, updatedAt: now,
      winnerId, winnerIds: state.winnerIds, players: playerRows, teams, game: { mode: "bowling", teams }, summary,
      payload: { kind: "bowling", mode: "bowling", sport: "darts", winnerId, winnerIds: state.winnerIds, tied: state.tied, config, rules: state.rules, players: playerRows, teams, summary, visits: state.history, visitHistory: state.history, completedGames: state.completedGames, state: { gameNo: state.gameNo, setWinsByEntity: state.setWinsByEntity, framesByPlayer: state.framesByPlayer, standings: state.standings }, stats: { sport: "darts", mode: "bowling", players: playerRows, teams, match: matchStats, global: matchStats } },
    };
  }

  React.useEffect(() => {
    if (!state.finished) return;
    // Laisser la dernière boule et la chute des quilles se terminer avant le rapport final.
    if (!laneEvent) setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord(), { navigate: false }); } catch {}
  }, [state.finished, laneEvent?.id]);

  React.useEffect(() => () => {
    if (laneTimerRef.current) window.clearTimeout(laneTimerRef.current);
  }, []);

  const activeSetWins = config.participantMode === "teams" ? Number(state.setWinsByEntity[activeTeamId || ""] || 0) : Number(state.setWinsByEntity[activePlayerId] || 0);

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerBowling} tickerAlt="BOWLING" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles du Bowling Darts" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />
    <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <section style={{ ...panelStyle(), padding: 0, overflow: "hidden", borderColor: `${primary}88`, boxShadow: `0 0 24px ${primary}20`, marginBottom: 7 }}>
        <div style={{ position: "relative", minHeight: 130, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(150px,190px)", alignItems: "stretch", padding: "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.38),rgba(0,0,0,.06),rgba(0,0,0,.34))" }} />
          <div style={{ position: "absolute", left: -18, top: -6, bottom: -6, width: "34%", minWidth: 105, overflow: "hidden", opacity: .20 }}><div style={{ position: "absolute", left: -12, top: 10, transform: "scale(1.65)", transformOrigin: "left top" }}><ProfileAvatar profile={activeProfile as any} size={86} /></div></div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: 0, textAlign: "center" }}>
            {botThinking ? <div style={{ color: activeTeam?.color || primary, fontSize: 9.5, fontWeight: 1000, letterSpacing: 1 }}>BOT EN RÉFLEXION</div> : <div style={{ color: themeSoft, fontSize: 8.5, fontWeight: 1000, letterSpacing: 1 }}>JOUEUR ACTIF</div>}
            <div style={{ color: activeTeam?.color || primary, fontSize: 15, fontWeight: 1100, letterSpacing: .8, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{playerName(activeProfile)}</div>
            {activeTeam ? <div style={{ marginTop: 2, color: activeTeam.color || primary, fontSize: 9, fontWeight: 900 }}>{activeTeam.name}</div> : null}
            <div style={{ marginTop: 2, fontSize: 58, lineHeight: 1, fontWeight: 1100, color: C.gold, textShadow: "0 4px 18px rgba(255,195,26,.25)" }}>{activeScore}</div>
            <div style={{ marginTop: 5, color: themeSoft, fontSize: 9.5, fontWeight: 900 }}>Frame {Math.min(10, frameIndex + 1)}/10 · Lancer {(frame?.rolls?.length || 0) + 1} · {maxPins} quille{maxPins > 1 ? "s" : ""} debout</div>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, alignContent: "center" }}>
            {[["PARTIE", `${state.gameNo}`], [boLabel, `${activeSetWins}/${config.setsToWin}`], ["STRIKES", activeStats.strikes], ["SPARES", activeStats.spares]].map(([label, value]) => <div key={label} style={{ padding: "9px 6px", borderRadius: 13, background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}><div style={{ color: themeSoft, fontSize: 8, fontWeight: 950 }}>{label}</div><div style={{ marginTop: 2, color: label === "STRIKES" ? C.gold : label === "SPARES" ? C.pink : primary, fontSize: 19, fontWeight: 1100 }}>{value}</div></div>)}
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle(), padding: 8, marginBottom: 7 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}><div><div style={{ color: primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1 }}>FEUILLE DE SCORE</div><div style={{ color: themeSoft, fontSize: 8.5 }}>Strike X · Spare / · score cumulé sous chaque frame</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => setShowTable(true)} style={miniButton(primary)}>CLASSEMENT</button><button onClick={() => setShowStats(true)} style={miniButton(C.cyan)}>STATS</button></div></div>
        <Scorecard state={state} playerId={activePlayerId} primary={primary} />
      </section>

      {notice ? <div style={{ marginBottom: 7, padding: "7px 10px", borderRadius: 12, border: `1px solid ${primary}44`, background: `${primary}0d`, textAlign: "center", color: primary, fontSize: 10.5, fontWeight: 950 }}>{notice}</div> : null}

      {!state.finished ? <section style={{ ...panelStyle(), padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "6px 6px 8px" }}>
          <div style={{ minWidth: 0 }}><div style={{ color: themeSoft, fontSize: 9, fontWeight: 950 }}>{botThinking ? "BOT EN RÉFLEXION" : `VOLÉE DE ${playerName(activeProfile)}`}</div><div style={{ marginTop: 3, display: "flex", gap: 5, minHeight: 28 }}>{[0,1,2].map((i) => <div key={i} style={{ minWidth: 56, height: 28, padding: "0 7px", borderRadius: 10, border: `1px solid ${throwDarts[i] ? primary + "66" : "rgba(255,255,255,.09)"}`, background: throwDarts[i] ? `${primary}10` : "rgba(0,0,0,.18)", display: "grid", placeItems: "center", color: throwDarts[i] ? "#fff" : "rgba(255,255,255,.28)", fontWeight: 1000, fontSize: 10 }}>{throwDarts[i] ? uiLabel(throwDarts[i]) : `D${i + 1}`}</div>)}</div></div>
          <div style={{ textAlign: "right", minWidth: 96 }}><div style={{ color: themeSoft, fontSize: 8, fontWeight: 900 }}>PROJECTION</div><div style={{ color: currentCalc.bullStrike ? C.gold : currentCalc.doubleSpare ? C.pink : primary, fontSize: 30, fontWeight: 1100, lineHeight: 1 }}>{currentCalc.pins}</div><div style={{ color: currentCalc.bullStrike ? C.gold : currentCalc.doubleSpare ? C.pink : themeSoft, fontSize: 8.5, fontWeight: 950 }}>{currentCalc.bullStrike ? "STRIKE X" : currentCalc.doubleSpare ? "SPARE /" : `/ ${maxPins} QUILLES`}</div></div>
        </div>

        {config.scoreInputMethod === "dartboard" ? <>
          <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={() => setMultiplier(1)} style={modeButton(multiplier === 1, C.green)}>SIMPLE</button><button onClick={() => setMultiplier(2)} style={modeButton(multiplier === 2, C.cyan)}>DOUBLE</button><button onClick={() => setMultiplier(3)} style={modeButton(multiplier === 3, C.pink)}>TRIPLE</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={cancelOrUndo} style={actionButton(C.gold)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateRoll} style={actionButton(C.green)}>VALIDER</button></div>
        </> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}><Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={validateRoll} hidePreview hideTotal centerSlot={<div style={{ textAlign: "center", color: currentCalc.bullStrike ? C.gold : currentCalc.doubleSpare ? C.pink : primary, fontWeight: 1100, fontSize: 11 }}>{currentCalc.bullStrike ? "STRIKE" : currentCalc.doubleSpare ? "SPARE" : `${currentCalc.pins} QUILLES`}<div style={{ fontSize: 8, color: themeSoft }}>{throwDarts.length}/3</div></div>} noticeSlot={notice ? <span>{notice}</span> : null} validateAttention={throwDarts.length === 3} safeBottomPad /></div>}
      </section> : null}
    </div>

    {laneEvent ? <BowlingLaneCinematic event={laneEvent} primary={primary} onSkip={() => { if (laneTimerRef.current) window.clearTimeout(laneTimerRef.current); laneTimerRef.current = null; setLaneEvent(null); }} /> : null}

    {showTable ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
    {showStats ? <LiveStatsModal state={state} profilesById={byId} primary={primary} onClose={() => setShowStats(false)} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "stats", initialStatsSubTab: "bowling" }); } }} /> : null}
  </div>;
}

function miniButton(color: string): React.CSSProperties { return { minHeight: 30, borderRadius: 999, padding: "0 10px", border: `1px solid ${color}66`, background: `${color}10`, color, fontSize: 8.5, fontWeight: 1000, cursor: "pointer" }; }
function modeButton(active: boolean, color: string): React.CSSProperties { return { minHeight: 40, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, cursor: "pointer" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(760px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT BOWLING</div><button onClick={onClose} style={closeButton()}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <div style={{ position: "relative", width: 40, height: 40 }}><div style={{ position: "absolute", inset: 4 }}><ProfileAvatar profile={profilesById.get(standing.id)} size={32} /></div><div style={{ position: "absolute", inset: 0 }}><ProfileStarRing profile={profilesById.get(standing.id) || {}} size={40} glow /></div></div>}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>{standing.setWins} victoire{standing.setWins > 1 ? "s" : ""} · {standing.strikes} X · {standing.spares} /</div></div><div style={{ textAlign: "right" }}><div style={{ color: primary, fontSize: 24, fontWeight: 1100 }}>{standing.score}</div><div style={{ color: "rgba(255,255,255,.45)", fontSize: 8 }}>partie actuelle</div></div></div>)}</div>
  </div></div>;
}

function LiveStatsModal({ state, profilesById, primary, onClose }: any) {
  const rows = state.players.map((player: any) => ({ player, profile: profilesById.get(player.id) || player, stats: state.statsByPlayer[player.id] || emptyBowlingStats(), score: getBowlingPlayerScore(state, player.id) }));
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.74)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(880px,100%)", maxHeight: "88vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000 }}>STATS LIVE BOWLING</div><button onClick={onClose} style={closeButton()}>×</button></div>
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","Score","X","/","Open","Gutter","Best série X","Quilles","Rolls","Darts","D","T","Bull"].map((h) => <th key={h} style={{ padding: 8, textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.65)" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}</td><td style={td(primary)}>{row.score}</td><td style={td(C.gold)}>{row.stats.strikes}</td><td style={td(C.pink)}>{row.stats.spares}</td><td style={td()}>{row.stats.openFrames}</td><td style={td(C.red)}>{row.stats.gutters}</td><td style={td()}>{row.stats.bestStrikeStreak}</td><td style={td()}>{row.stats.pins}</td><td style={td()}>{row.stats.visits}</td><td style={td()}>{row.stats.darts}</td><td style={td(C.cyan)}>{row.stats.doubles}</td><td style={td(C.pink)}>{row.stats.triples}</td><td style={td(C.gold)}>{row.stats.bulls + row.stats.dbulls}</td></tr>)}</tbody></table></div>
  </div></div>;
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const [tab, setTab] = React.useState<"report" | "games" | "timeline">("report");
  const rows = state.players.map((player: any) => {
    const profile = profilesById.get(player.id) || player;
    const stats = state.statsByPlayer[player.id] || emptyBowlingStats();
    const scores = state.completedGames.map((game: any) => Number(game?.scoresByPlayer?.[player.id] || 0));
    const frames = state.completedGames.flatMap((game: any) => Array.isArray(game?.framesByPlayer?.[player.id]) ? game.framesByPlayer[player.id] : []);
    const strikeFrames = frames.filter((f: any) => f?.strike).length;
    const spareFrames = frames.filter((f: any) => f?.spare).length;
    const openFrames = frames.filter((f: any) => f?.open).length;
    const cleanFrames = strikeFrames + spareFrames;
    const spareOpp = frames.filter((f: any) => Number(f?.rolls?.[0] || 0) < 10).length;
    const firstBalls = frames.map((f: any) => Number(f?.rolls?.[0] || 0)).filter((v: any) => Number.isFinite(v));
    const avg = scores.length ? scores.reduce((a: number,b: number)=>a+b,0)/scores.length : 0;
    const firstBallAvg = firstBalls.length ? firstBalls.reduce((a: number,b: number)=>a+b,0)/firstBalls.length : 0;
    const cleanGames = state.completedGames.filter((game: any) => {
      const fs = game?.framesByPlayer?.[player.id] || [];
      return fs.length === 10 && fs.every((f: any) => f?.strike || f?.spare);
    }).length;
    return { player, profile, stats, score: getBowlingPlayerScore(state, player.id), scores, frames, strikeFrames, spareFrames, openFrames, cleanFrames, spareOpp, avg, firstBallAvg, cleanGames,
      highGame: scores.length ? Math.max(...scores) : stats.highGame,
      perfectGames: scores.filter((v:number)=>v===300).length, games250: scores.filter((v:number)=>v>=250).length, games200: scores.filter((v:number)=>v>=200).length };
  }).sort((a: any, b: any) => b.stats.gamesWon - a.stats.gamesWon || b.highGame - a.highGame || b.avg - a.avg);
  const winnerStanding = state.tied ? null : state.standings.find((standing: any) => state.winnerIds.includes(standing.id)) || state.standings[0];
  const totalDarts = rows.reduce((a: number, r: any) => a + r.stats.darts, 0);
  const totalStrikes = rows.reduce((a: number, r: any) => a + r.stats.strikes, 0);
  const totalSpares = rows.reduce((a: number, r: any) => a + r.stats.spares, 0);
  const totalGutters = rows.reduce((a: number, r: any) => a + r.stats.gutters, 0);
  const totalFrames = rows.reduce((a:number,r:any)=>a+r.frames.length,0);
  const totalClean = rows.reduce((a:number,r:any)=>a+r.cleanFrames,0);
  const highGame = rows.reduce((m:number,r:any)=>Math.max(m,r.highGame||0),0);
  const allScores = rows.flatMap((r:any)=>r.scores);
  const avgGame = allScores.length ? allScores.reduce((a:number,b:number)=>a+b,0)/allScores.length : 0;
  const markers = {
    perfect: rows.reduce((a:number,r:any)=>a+r.perfectGames,0),
    g250: rows.reduce((a:number,r:any)=>a+r.games250,0),
    g200: rows.reduce((a:number,r:any)=>a+r.games200,0),
    cleanGames: rows.reduce((a:number,r:any)=>a+r.cleanGames,0),
    bestStreak: rows.reduce((m:number,r:any)=>Math.max(m,r.stats.bestStrikeStreak||0),0),
  };
  const tabBtn = (key: string, label: string, color = primary) => <button onClick={() => setTab(key as any)} style={{ minHeight:34,borderRadius:999,padding:"0 12px",border:`1px solid ${tab===key?color:"rgba(255,255,255,.10)"}`,background:tab===key?`${color}18`:"rgba(255,255,255,.035)",color:tab===key?color:"rgba(255,255,255,.62)",fontSize:9,fontWeight:1000,cursor:"pointer" }}>{label}</button>;
  const metric = (label:string,value:any,detail:string,color=primary) => <div style={{padding:10,borderRadius:14,background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.07)",minWidth:0}}><div style={{color:"rgba(255,255,255,.47)",fontSize:8.5,fontWeight:950,textTransform:"uppercase"}}>{label}</div><div style={{marginTop:2,color,fontSize:20,fontWeight:1100,lineHeight:1.05}}>{value}</div><div style={{marginTop:3,color:"rgba(255,255,255,.46)",fontSize:8.5}}>{detail}</div></div>;

  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.82)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panelStyle(), width: "min(1080px,100%)", maxHeight: "96vh", overflow: "auto", borderColor: `${primary}77`, padding: 12 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ width: 34 }} /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1.2 }}>RAPPORT DE SÉRIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>🎳 BOWLING</div></div><button onClick={onClose} style={closeButton()}>×</button></div>
    <div style={{ marginTop: 9, padding: 11, borderRadius: 16, background: `${primary}0f`, border: `1px solid ${primary}44`, textAlign: "center" }}><div style={{ color: C.gold, fontSize: 9, fontWeight: 1000 }}>VAINQUEUR</div><div style={{ marginTop: 2, fontSize: 22, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : winnerStanding?.name || "—"}</div><div style={{ color: primary, fontSize: 15, fontWeight: 1000 }}>{winnerStanding ? `${winnerStanding.setWins} partie${winnerStanding.setWins > 1 ? "s" : ""} gagnée${winnerStanding.setWins > 1 ? "s" : ""} · ${winnerStanding.score} pts dernière partie` : "—"}</div></div>

    <div style={{marginTop:9,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>{tabBtn("report","RAPPORT",C.gold)}{tabBtn("games","FEUILLES 10 FRAMES",C.cyan)}{tabBtn("timeline","CHRONOLOGIE",C.pink)}</div>

    {tab === "report" ? <>
      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(132px,1fr))", gap: 6 }}>
        {metric("Durée",fmtDuration((state.finishedAt || Date.now()) - state.startedAt),`${state.completedGames.length} partie${state.completedGames.length>1?"s":""}`)}
        {metric("High game",highGame,highGame===300?"PERFECT GAME":"meilleur score de la série",C.gold)}
        {metric("Moyenne",avgGame?avgGame.toFixed(1):"—","score moyen / partie",C.cyan)}
        {metric("Clean frames",`${totalFrames?pct(totalClean,totalFrames):0}%`,`${totalClean}/${totalFrames} frames X ou /`,C.green)}
        {metric("Strikes",totalStrikes,`${totalFrames?pct(rows.reduce((a:number,r:any)=>a+r.strikeFrames,0),totalFrames):0}% des frames`,C.gold)}
        {metric("Spares",totalSpares,`${rows.reduce((a:number,r:any)=>a+r.spareFrames,0)} frames clôturées /`,C.pink)}
        {metric("Gutters",totalGutters,`${state.history.length?pct(totalGutters,state.history.length):0}% des lancers`,C.red)}
        {metric("Best série X",markers.bestStreak,markers.bestStreak>=3?"Turkey ou mieux":"strikes consécutifs",C.gold)}
      </div>

      <div style={{marginTop:9,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:6}}>
        {[['300',markers.perfect,'Perfect games',C.gold],['250+',markers.g250,'parties ≥ 250',C.pink],['200+',markers.g200,'parties ≥ 200',C.cyan],['CLEAN',markers.cleanGames,'parties sans open',C.green],['DARTS',totalDarts,'fléchettes saisies',primary]].map(([title,value,detail,color]:any)=><div key={title} style={{padding:8,borderRadius:12,border:`1px solid ${color}33`,background:`${color}09`,textAlign:"center"}}><div style={{color,fontSize:9,fontWeight:1100}}>{title}</div><div style={{fontSize:19,fontWeight:1100}}>{value}</div><div style={{color:"rgba(255,255,255,.42)",fontSize:7.8}}>{detail}</div></div>)}
      </div>

      <div style={{marginTop:10,color:C.gold,fontSize:9.5,fontWeight:1000,letterSpacing:.8}}>RAPPORT PAR JOUEUR</div>
      <div style={{ marginTop: 6, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980, fontSize: 10 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","Wins","Moy.","High","Clean","Strike","Spare conv.","1re boule","Gutter","Best X","200+","250+","300"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.65)" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}</td><td style={td(primary)}>{row.stats.gamesWon}</td><td style={td(C.cyan)}>{row.avg.toFixed(1)}</td><td style={td(C.gold)}>{row.highGame}</td><td style={td(C.green)}>{pct(row.cleanFrames,Math.max(1,row.frames.length))}%</td><td style={td(C.gold)}>{pct(row.strikeFrames,Math.max(1,row.frames.length))}%</td><td style={td(C.pink)}>{pct(row.spareFrames,Math.max(1,row.spareOpp))}%</td><td style={td()}>{row.firstBallAvg.toFixed(2)}</td><td style={td(C.red)}>{row.stats.gutters}</td><td style={td(C.gold)}>{row.stats.bestStrikeStreak}</td><td style={td()}>{row.games200}</td><td style={td()}>{row.games250}</td><td style={td(C.gold)}>{row.perfectGames}</td></tr>)}</tbody></table></div>

      {participantMode === "teams" ? <div style={{marginTop:10}}><div style={{color:C.cyan,fontSize:9.5,fontWeight:1000,letterSpacing:.8}}>BILAN ÉQUIPES</div><div style={{marginTop:6,display:"grid",gap:6}}>{state.standings.map((standing:any)=><div key={standing.id} style={{display:"grid",gridTemplateColumns:"42px minmax(0,1fr) auto auto",gap:8,alignItems:"center",padding:8,borderRadius:13,background:"rgba(255,255,255,.035)",border:`1px solid ${standing.rank===1?primary+"55":"rgba(255,255,255,.06)"}`}}><TeamLogo team={teamById.get(standing.id)} size={38}/><div><div style={{fontWeight:1000}}>{standing.name}</div><div style={{color:"rgba(255,255,255,.48)",fontSize:8.5}}>{standing.playerIds.length} joueurs · {standing.strikes} X · {standing.spares} /</div></div><div style={{textAlign:"center"}}><div style={{color:primary,fontWeight:1100,fontSize:18}}>{standing.setWins}</div><div style={{fontSize:7.5,color:"rgba(255,255,255,.42)"}}>WINS</div></div><div style={{textAlign:"right"}}><div style={{color:C.gold,fontWeight:1100,fontSize:18}}>{standing.score}</div><div style={{fontSize:7.5,color:"rgba(255,255,255,.42)"}}>LAST GAME</div></div></div>)}</div></div> : null}
    </> : null}

    {tab === "games" ? <div style={{marginTop:9,display:"grid",gap:10}}>{state.completedGames.map((game:any) => <section key={game.gameNo} style={{padding:9,borderRadius:15,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.08)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:7}}><div><div style={{color:C.cyan,fontSize:10,fontWeight:1000}}>PARTIE {game.gameNo}</div><div style={{color:"rgba(255,255,255,.45)",fontSize:8.5}}>{game.tied?"Égalité":`Vainqueur : ${game.winnerIds.map((id:string)=>state.standings.find((x:any)=>x.id===id)?.name || teamById.get(id)?.name || playerName(profilesById.get(id)||{name:id})).join(" + ")}`}</div></div><div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>{Object.entries(game.scoresByPlayer||{}).map(([id,score]:any)=><span key={id} style={{padding:"4px 7px",borderRadius:999,background:"rgba(0,0,0,.25)",fontSize:9}}><b>{playerName(profilesById.get(id)||{name:id})}</b> <span style={{color:C.gold,fontWeight:1100}}>{score}</span></span>)}</div></div>
        <div style={{display:"grid",gap:7}}>{state.players.map((player:any)=><div key={player.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:3}}><span style={{fontSize:9,fontWeight:1000}}>{playerName(profilesById.get(player.id)||player)}</span><span style={{color:C.gold,fontSize:11,fontWeight:1100}}>{Number(game.scoresByPlayer?.[player.id]||0)}</span></div><StaticFramesScorecard frames={game.framesByPlayer?.[player.id]||[]} primary={primary}/></div>)}</div>
      </section>)}</div> : null}

    {tab === "timeline" ? <div style={{marginTop:9}}><div style={{color:"rgba(255,255,255,.48)",fontSize:8.5,marginBottom:6}}>Chaque ligne correspond à un lancer de bowling, donc à une volée validée de 3 fléchettes.</div><div style={{overflowX:"auto"}}><div style={{display:"grid",gap:5,minWidth:650}}>{state.history.map((visit:any,index:number)=>{ const profile=profilesById.get(visit.playerId)||{name:visit.playerId}; const result=visit.strike?"STRIKE X":visit.spare?"SPARE /":visit.pins===0?"GUTTER":`${visit.pins} QUILLES`; const color=visit.strike?C.gold:visit.spare?C.pink:visit.pins===0?C.red:primary; return <div key={visit.id||index} style={{display:"grid",gridTemplateColumns:"70px minmax(110px,.8fr) minmax(130px,1fr) 80px 78px",gap:7,alignItems:"center",padding:7,borderRadius:11,background:"rgba(255,255,255,.028)",border:"1px solid rgba(255,255,255,.055)",fontSize:9}}><div style={{color:"rgba(255,255,255,.47)",fontWeight:900}}>P{visit.gameNo} · F{visit.frame}.{visit.roll}</div><div style={{fontWeight:1000,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{playerName(profile)}</div><div style={{color:"rgba(255,255,255,.62)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(visit.labels||[]).join(" · ")}</div><div style={{textAlign:"center",color,fontWeight:1100}}>{result}</div><div style={{textAlign:"right",color:"rgba(255,255,255,.48)"}}>rack {visit.maxPins}→{Math.max(0,visit.maxPins-visit.pins)}</div></div>})}</div></div></div> : null}

    <div style={{ marginTop: 11, color: "rgba(255,255,255,.42)", fontSize: 8.8, textAlign: "center" }}>Rapport, feuilles de frames, chronologie et statistiques BOWLING sauvegardés dans l’historique.</div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><button onClick={onReplay} style={{ minHeight: 44, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 44, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}
function closeButton(): React.CSSProperties { return { width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18, cursor: "pointer" }; }
