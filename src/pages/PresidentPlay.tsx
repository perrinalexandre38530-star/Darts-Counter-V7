// @ts-nocheck
// =============================================================
// PRÉSIDENT — Play complet
// Main virtuelle, plis, S/D/T, PASSER, taxes, bots, stats/history.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import tickerPresident from "../assets/tickers/ticker_president.png";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  clonePresidentState,
  createPresidentState,
  getPresidentStandings,
  passPresidentTurn,
  playPresidentTurn,
  presidentAutoTarget,
  presidentCanPlayerPlay,
  presidentDartLabel,
  presidentLegalTargets,
  presidentRoleForRank,
  presidentTargetDescription,
  presidentTargetLabel,
  type PresidentComboSize,
  type PresidentConfigPayload,
  type PresidentState,
  type PresidentTarget,
} from "../lib/gameEngines/presidentEngine";

const GOLD = "#e9c56c";
type UiDart = { v: number; mult: 1 | 2 | 3 };

function playerName(p: any) { return p?.name || p?.displayName || p?.display_name || p?.pseudo || "Joueur"; }
function isBotProfile(p: any, ids: Set<string>) { return ids.has(String(p?.id || "")) || Boolean(p?.isBot || p?.bot || p?.botLevel || p?.kind === "bot"); }
function toGameDart(d: UiDart): GameDart {
  if (!d || d.v === 0) return { bed: "MISS" };
  if (d.v === 25) return { bed: d.mult === 2 ? "IB" : "OB" };
  return { bed: d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S", number: d.v } as GameDart;
}
function dartMatchesUi(config: PresidentConfigPayload, target: PresidentTarget, d: UiDart) {
  if (config.variant === "chaos" && config.coupEtat && d.v === 25 && d.mult === 2) return true;
  if (config.variant === "chaos" && config.bullJoker && target.size === 1 && d.v === 25 && d.mult === 1) return true;
  const expected = target.size;
  return d.v === target.value && d.mult === expected;
}
function normalizeConfig(props: any): PresidentConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  return {
    mode: "president",
    players: Math.max(3, Math.min(8, Number(raw?.players || raw?.selectedIds?.length || 3))),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String).slice(0, 8) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    rounds: ([1,3,5,7,10].includes(Number(raw?.rounds)) ? Number(raw.rounds) : 5) as any,
    handSize: Math.max(5, Math.min(16, Number(raw?.handSize || 10))),
    deckCopies: ([3,4,5].includes(Number(raw?.deckCopies)) ? Number(raw.deckCopies) : 4) as any,
    variant: raw?.variant === "chaos" ? "chaos" : "classic",
    randomOrder: Boolean(raw?.randomOrder),
    bullJoker: raw?.variant === "chaos" && raw?.bullJoker !== false,
    coupEtat: raw?.variant === "chaos" && raw?.coupEtat !== false,
    revolution: raw?.variant === "chaos" && raw?.revolution !== false,
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}
function panel(): React.CSSProperties { return { borderRadius: 18, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.058),rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 14px 30px rgba(0,0,0,.32)", boxSizing: "border-box", minWidth: 0 }; }
function roleColor(role: string, primary: string) { if (role === "Président") return "#ffd76a"; if (role === "Trou du cul") return "#ff7a91"; if (role === "Vice-Président") return primary; if (role === "Vice-Trou du cul") return "#ff9f63"; return "#b8c0d9"; }
function formatPct(a: number, b: number) { return b ? Math.round((a / b) * 1000) / 10 : 0; }
function fmtTime(ms: number) { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}`; }

function RulesContent({ config, primary }: any) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><b style={{ color: primary }}>S / D / T</b><br />Simple = 1 carte, Double = paire, Triple = brelan. La valeur touchée doit correspondre exactement à la carte choisie.</div>
    <div><b style={{ color: primary }}>3 ESSAIS MAX</b><br />La combinaison est jouée dès la première fléchette réussie. Trois échecs équivalent à PASSER pour le pli.</div>
    <div><b style={{ color: primary }}>PLI</b><br />Même combinaison, valeur supérieure. Quand tous les adversaires passent, le dernier joueur ayant réussi ouvre un nouveau pli.</div>
    <div><b style={{ color: primary }}>TAXES</b><br />Le Trou du cul donne ses 2 meilleures cartes au Président, qui lui rend ses 2 plus faibles. VP/VTC échangent 1 carte à partir de 4 joueurs.</div>
    {config.variant === "chaos" ? <div><b style={{ color: "#ffd76a" }}>CHAOS</b><br />BULL joker simple · DBULL Coup d’État · T20 Révolution.</div> : null}
  </div>;
}

function TargetCard({ selected, tableTarget, revolution, primary }: { selected: PresidentTarget | null; tableTarget: PresidentTarget | null; revolution: boolean; primary: string }) {
  const label = selected ? presidentTargetLabel(selected) : "—";
  const desc = selected ? presidentTargetDescription(selected) : "AUCUNE CARTE JOUABLE";
  return <div style={{ width: "100%", maxWidth: 190, aspectRatio: "3 / 4", margin: "0 auto", borderRadius: 24, padding: 8, background: "linear-gradient(145deg,#080808,#17120b)", border: `2px solid ${primary}`, boxShadow: `0 0 30px ${primary}32, inset 0 0 0 2px rgba(255,255,255,.035)` }}>
    <div style={{ height: "100%", borderRadius: 17, border: `1px solid ${primary}88`, padding: 13, display: "grid", gridTemplateRows: "auto auto 1fr auto", background: "radial-gradient(circle at 50% 55%,rgba(233,197,108,.12),transparent 46%),linear-gradient(180deg,rgba(255,255,255,.03),rgba(0,0,0,.28))", position: "relative", overflow: "hidden" }}>
      <div style={{ textAlign: "center", color: primary, fontWeight: 1100, letterSpacing: 1.2, fontSize: 17 }}>♛ PRÉSIDENT</div>
      <div style={{ margin: "8px auto 0", padding: "5px 10px", borderRadius: 999, border: `1px solid ${primary}77`, color: "#f8e7b8", fontSize: 9, fontWeight: 1000, letterSpacing: 1.1 }}>{tableTarget ? `À BATTRE ${presidentTargetLabel(tableTarget)}` : "OUVERTURE LIBRE"}</div>
      <div style={{ alignSelf: "center", textAlign: "center", minWidth: 0 }}><div style={{ fontFamily: "Georgia,serif", fontSize: 60, lineHeight: .95, fontWeight: 1100, color: primary, textShadow: `0 0 18px ${primary}55` }}>{label}</div><div style={{ marginTop: 9, color: "#f6e5b4", fontWeight: 1000, fontSize: 15, letterSpacing: 1.1 }}>{desc}</div>{revolution ? <div style={{ marginTop: 9, color: "#ff9c6d", fontSize: 10, fontWeight: 1000 }}>↕ RÉVOLUTION ACTIVE</div> : null}</div>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,.58)", fontSize: 9 }}>S = simple · D = paire · T = brelan</div>
    </div>
  </div>;
}

function HandStrip({ hand, legalTargets, selected, onSelect, primary }: any) {
  const grouped = React.useMemo(() => {
    const m = new Map<number, number>();
    (hand || []).forEach((v: number) => m.set(v, (m.get(v) || 0) + 1));
    return [...m.entries()].sort((a,b) => a[0]-b[0]);
  }, [hand]);
  const legalSet = new Set((legalTargets || []).map((t: any) => `${t.size}:${t.value}`));
  return <div style={{ display: "grid", gap: 8 }}>
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}>{grouped.map(([value,count]) => <div key={value} style={{ minWidth: 48, padding: "7px 6px", borderRadius: 12, border: `1px solid ${primary}33`, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.24))", textAlign: "center" }}><div style={{ color: primary, fontWeight: 1100, fontSize: 18 }}>{value}</div><div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>×{count}</div></div>)}</div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{legalTargets.map((t: PresidentTarget) => { const active = selected?.value === t.value && selected?.size === t.size; const txt = presidentTargetLabel(t); return <button key={`${t.size}-${t.value}`} onClick={() => onSelect(t)} style={{ minWidth: 54, height: 34, borderRadius: 999, border: `1px solid ${active ? primary : "rgba(255,255,255,.12)"}`, background: active ? `${primary}20` : "rgba(255,255,255,.04)", color: active ? primary : legalSet.has(`${t.size}:${t.value}`) ? "#fff" : "#5f647b", fontWeight: 1000 }}>{txt}</button>; })}</div>
  </div>;
}

function RoundOverlay({ result, state, profilesById, primary, onClose }: any) {
  if (!result) return null;
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "grid", placeItems: "center", padding: 10, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)" }}><div style={{ ...panel(), width: "min(720px,100%)", maxHeight: "92vh", overflow: "auto", borderColor: `${primary}77` }}>
    <div style={{ textAlign: "center" }}><div style={{ color: primary, fontWeight: 1100, letterSpacing: 1.2 }}>FIN DE MANCHE {result.roundNo}</div><div style={{ marginTop: 3, fontSize: 20, fontWeight: 1100 }}>NOUVELLE HIÉRARCHIE</div></div>
    <div style={{ display: "grid", gap: 7, marginTop: 12 }}>{result.ranking.map((id: string, i: number) => { const role = result.roles[id]; const p = profilesById.get(id); return <div key={id} style={{ display: "grid", gridTemplateColumns: "32px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${i===0 ? primary+"66" : "rgba(255,255,255,.08)"}` }}><div style={{ fontWeight: 1100, color: i===0?"#ffd76a":"#fff", textAlign: "center" }}>{i+1}.</div><ProfileAvatar profile={p} size={38} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(p)}</div><div style={{ color: roleColor(role,primary), fontSize: 10, fontWeight: 1000 }}>{role}</div></div><div style={{ color: primary, fontWeight: 1100 }}>+{result.powerPoints[id]} pts</div></div>; })}</div>
    {state.taxesThisRound?.length ? <div style={{ marginTop: 11, padding: 10, borderRadius: 14, background: `${primary}0d`, border: `1px solid ${primary}35` }}><div style={{ color: primary, fontSize: 11, fontWeight: 1100, marginBottom: 7 }}>TAXES DE LA MANCHE {state.roundNo}</div>{state.taxesThisRound.map((tax: any, i: number) => <div key={i} style={{ fontSize: 10.5, lineHeight: 1.45, color: "rgba(255,255,255,.75)" }}><b>{playerName(profilesById.get(tax.fromPlayerId))}</b> donne <b style={{ color: primary }}>{tax.given.join(" · ")}</b> à <b>{playerName(profilesById.get(tax.toPlayerId))}</b> et reçoit <b>{tax.returned.join(" · ")}</b>.</div>)}</div> : null}
    <button onClick={onClose} style={{ width: "100%", minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,#b68b31,${primary},#fff0b2)`, color: "#100d06", fontWeight: 1100, marginTop: 12 }}>COMMENCER LA MANCHE {state.roundNo}</button>
  </div></div>;
}

function EndOverlay({ state, profilesById, primary, onReplay, onHistory, onClose }: any) {
  const standings = getPresidentStandings(state);
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center", padding: 10, background: "rgba(0,0,0,.82)", backdropFilter: "blur(9px)" }}><div style={{ ...panel(), width: "min(880px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}88` }}>
    <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", alignItems: "center" }}><div /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontWeight: 1100, letterSpacing: 1.2 }}>FIN DU RÈGNE</div><div style={{ fontSize: 23, fontWeight: 1100 }}>♛ PRÉSIDENT SUPRÊME</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 12, padding: 14, borderRadius: 16, textAlign: "center", background: `${primary}10`, border: `1px solid ${primary}48` }}><ProfileAvatar profile={profilesById.get(state.winnerId)} size={70} /><div style={{ marginTop: 7, fontSize: 24, fontWeight: 1100 }}>{playerName(profilesById.get(state.winnerId))}</div><div style={{ color: primary, fontSize: 34, fontWeight: 1100 }}>{standings[0]?.powerPoints || 0} pts</div></div>
    <div style={{ display: "grid", gap: 7, marginTop: 11 }}>{standings.map((row: any, i: number) => { const s = state.statsByPlayer[row.id]; return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "30px 40px minmax(0,1fr) repeat(3,auto)", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${i===0?primary+"66":"rgba(255,255,255,.08)"}` }}><div style={{ fontWeight: 1100, color: i===0?"#ffd76a":"#fff" }}>{i+1}.</div><ProfileAvatar profile={profilesById.get(row.id)} size={36} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{row.name}</div><div style={{ fontSize: 9.5, color: "rgba(255,255,255,.58)" }}>rang moy. {row.avgRank ? row.avgRank.toFixed(2) : "—"} · réussite {formatPct(s.successfulPlays,s.visits)}%</div></div><div style={{ textAlign: "center" }}><div style={{ color: primary, fontWeight: 1100 }}>{row.powerPoints}</div><div style={{ fontSize: 8.5, opacity: .6 }}>PTS</div></div><div style={{ textAlign: "center" }}><div style={{ color: "#ffd76a", fontWeight: 1100 }}>{s.president}</div><div style={{ fontSize: 8.5, opacity: .6 }}>PRÉS.</div></div><div style={{ textAlign: "center" }}><div style={{ color: "#ff8b9e", fontWeight: 1100 }}>{s.trouDuCul}</div><div style={{ fontSize: 8.5, opacity: .6 }}>TDC</div></div></div>; })}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 11 }}>{[["Durée",fmtTime((state.finishedAt||Date.now())-state.startedAt)],["Manches",state.roundResults.length],["Plis",Object.values(state.statsByPlayer).reduce((a:any,s:any)=>a+s.tricksWon,0)],["Coups d’État",Object.values(state.statsByPlayer).reduce((a:any,s:any)=>a+s.coupEtats,0)]].map(([l,v]:any)=><div key={l} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ fontSize: 8.5, opacity: .6 }}>{l}</div><div style={{ color: primary, fontWeight: 1100, fontSize: 18 }}>{v}</div></div>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 12 }}><button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}14`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,#b68b31,${primary},#fff0b2)`, color: "#100d06", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}


function MiniKpi({ label, value, color, compact = false }: { label: string; value: React.ReactNode; color: string; compact?: boolean }) {
  return <div style={{ minWidth:0, padding: compact ? "6px 3px" : "8px 5px", borderRadius: compact ? 10 : 13, border:`1px solid ${color}38`, background:`linear-gradient(180deg,${color}14,rgba(255,255,255,.025))`, textAlign:"center", overflow:"hidden" }}>
    <div style={{ color:"rgba(255,255,255,.52)", fontSize:compact?7.5:8.5, fontWeight:1000, letterSpacing:.35, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</div>
    <div style={{ color, fontSize:compact?14:20, fontWeight:1100, lineHeight:1.05, marginTop:compact?2:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{value}</div>
  </div>;
}

function QuickTile({ label, value, color, icon, onClick, alert = false }: any) {
  return <button type="button" onClick={onClick} style={{ minWidth:0, minHeight:61, borderRadius:15, padding:"8px 7px", border:`1px solid ${alert ? color : color+"55"}`, background:`linear-gradient(180deg,${color}${alert?"28":"16"},rgba(255,255,255,.025))`, color:"#fff", cursor:"pointer", boxShadow:alert?`0 0 18px ${color}32`:"none", textAlign:"left", overflow:"hidden" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:5 }}><span style={{ color, fontSize:15, lineHeight:1 }}>{icon}</span><span style={{ color, fontSize:8, fontWeight:1100, letterSpacing:.7 }}>OUVRIR</span></div>
    <div style={{ marginTop:5, fontSize:10, fontWeight:1100, letterSpacing:.55, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</div>
    <div style={{ color:"rgba(255,255,255,.58)", fontSize:8.5, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{value}</div>
  </button>;
}

function ModalShell({ title, color, onClose, children, wide = false }: any) {
  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(0,0,0,.72)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", display:"grid", placeItems:"center", padding:10 }}>
    <div onClick={(e)=>e.stopPropagation()} style={{ ...panel(), width:wide?"min(860px,100%)":"min(720px,100%)", maxHeight:"88vh", overflow:"hidden", borderColor:`${color}66`, boxShadow:`0 0 34px ${color}1d` }}>
      <div style={{ display:"grid", gridTemplateColumns:"34px 1fr 34px", alignItems:"center", gap:8, paddingBottom:9, borderBottom:"1px solid rgba(255,255,255,.08)" }}><div/><div style={{ textAlign:"center", color, fontWeight:1100, fontSize:12, letterSpacing:1 }}>{title}</div><button type="button" onClick={onClose} style={{ width:32,height:32,borderRadius:999,border:`1px solid ${color}66`,background:"rgba(0,0,0,.3)",color,fontWeight:1100,cursor:"pointer" }}>×</button></div>
      <div style={{ maxHeight:"calc(88vh - 54px)", overflowY:"auto", paddingTop:10 }}>{children}</div>
    </div>
  </div>;
}

function TinyTarget({ selected, tableTarget, revolution, primary, onClick }: any) {
  const label = selected ? presidentTargetLabel(selected) : "—";
  const desc = selected ? presidentTargetDescription(selected) : "CHOISIR";
  return <button type="button" onClick={onClick} style={{ position:"relative", width:"100%", height:"100%", minHeight:102, borderRadius:17, border:`1px solid ${primary}66`, background:"radial-gradient(circle at 50% 45%,rgba(233,197,108,.16),transparent 50%),linear-gradient(160deg,#171008,#07090f)", color:"#fff", cursor:"pointer", overflow:"hidden", padding:"7px 5px" }}>
    <div style={{ color:"rgba(255,255,255,.55)", fontSize:7.5, fontWeight:1000, letterSpacing:.7 }}>{tableTarget?"CIBLE À BATTRE":"OUVERTURE"}</div>
    <div style={{ color:primary, fontSize:36, fontWeight:1100, lineHeight:1, marginTop:7, textShadow:`0 0 18px ${primary}55` }}>{label}</div>
    <div style={{ color:"#f7e5b4", fontSize:8.5, fontWeight:1000, marginTop:5, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{desc}</div>
    {revolution?<div style={{ color:"#ff9b6a", fontSize:7.5, fontWeight:1100, marginTop:4 }}>↕ RÉVOLUTION</div>:null}
    <div style={{ position:"absolute", right:6, bottom:4, color:`${primary}aa`, fontSize:8, fontWeight:1000 }}>TOUCHER</div>
  </button>;
}

export default function PresidentPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const store = props?.store ?? props?.params?.store ?? null;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || GOLD;
  const text = theme?.text || "#f7f8fb";
  const softText = theme?.textSoft || "#aeb2d3";
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const allProfiles = React.useMemo(() => {
    const map = new Map<string, any>();
    (Array.isArray(store?.profiles) ? store.profiles : []).forEach((p: any) => map.set(String(p.id), p));
    (config.playersList || []).forEach((p: any) => map.set(String(p.id), { ...(map.get(String(p.id)) || {}), ...p }));
    return [...map.values()];
  }, [store, config.playersList]);
  const profilesById = React.useMemo(() => new Map(allProfiles.map((p: any) => [String(p.id), p])), [allProfiles]);
  const players = React.useMemo(() => config.selectedIds.map((id) => { const p = profilesById.get(String(id)); return { id: String(id), name: playerName(p) }; }), [config.selectedIds, profilesById]);

  const createInitial = React.useCallback(() => createPresidentState(players as any, {
    rounds: config.rounds, handSize: config.handSize, deckCopies: config.deckCopies, variant: config.variant,
    bullJoker: config.bullJoker, coupEtat: config.coupEtat, revolution: config.revolution,
  }, config.selectedIds), [players, config]);

  const [state, setState] = React.useState<PresidentState>(() => createInitial());
  const [selectedTarget, setSelectedTarget] = React.useState<PresidentTarget | null>(null);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1|2|3>(1);
  const [notice, setNotice] = React.useState("");
  const [undo, setUndo] = React.useState<PresidentState[]>([]);
  const [botThinking, setBotThinking] = React.useState(false);
  const [showRound, setShowRound] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showHand, setShowHand] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [showTrick, setShowTrick] = React.useState(false);
  const matchIdRef = React.useRef(`president-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  const savedRef = React.useRef("");
  const roundCountRef = React.useRef(0);

  const activeId = state.activePlayerId;
  const activeProfile = profilesById.get(activeId) || state.players.find((p) => p.id === activeId);
  const hand = state.hands[activeId] || [];
  const legalTargets = React.useMemo(() => presidentLegalTargets(hand, state.currentTarget, state.revolutionActive), [hand, state.currentTarget, state.revolutionActive]);
  const activeCanPlay = legalTargets.length > 0;
  const currentRole = state.previousRoles[activeId] || (state.roundNo === 1 ? "Citoyen" : "Citoyen");
  const latestRound = state.roundResults[state.roundResults.length - 1] || null;

  React.useEffect(() => {
    const first = presidentAutoTarget(state, activeId);
    setSelectedTarget(first);
    setThrowDarts([]); setMultiplier(1); setNotice("");
  }, [activeId, state.trickNo, state.roundNo, state.currentTarget?.value, state.currentTarget?.size, state.revolutionActive]);

  React.useEffect(() => {
    if (state.roundResults.length > roundCountRef.current) {
      roundCountRef.current = state.roundResults.length;
      if (!state.finished) setShowRound(true);
    }
    if (state.finished) setShowEnd(true);
  }, [state.roundResults.length, state.finished]);

  function commitAttempt(darts: UiDart[], target = selectedTarget) {
    if (!target || state.finished || botThinking) return;
    setUndo((u) => [...u.slice(-49), clonePresidentState(state)]);
    setState((prev) => playPresidentTurn(prev, target, darts.map(toGameDart)));
    setThrowDarts([]); setMultiplier(1); setNotice("");
  }
  function addDart(value: number, direct?: 1|2|3) {
    if (!selectedTarget || state.finished || botThinking || throwDarts.length >= 3) return;
    const mult = direct || multiplier;
    const d: UiDart = value === 25 ? { v:25, mult: mult === 2 ? 2 : 1 } : { v: Math.max(0,Math.min(20,Number(value)||0)), mult };
    const next = [...throwDarts,d]; setThrowDarts(next); if (mult>1) setMultiplier(1);
    if (dartMatchesUi(config, selectedTarget, d)) { setNotice("CARTE JOUÉE !"); window.setTimeout(() => commitAttempt(next, selectedTarget), 80); return; }
    if (next.length >= 3) { setNotice("3 essais manqués — passe."); window.setTimeout(() => commitAttempt(next, selectedTarget), 80); }
  }
  function validateAttempt() { if (!selectedTarget) return; if (!throwDarts.length) { setNotice("Joue au moins une fléchette ou utilise PASSER."); return; } commitAttempt(throwDarts); }
  function passTurn() {
    if (!state.currentTarget || state.finished || botThinking) return;
    setUndo((u) => [...u.slice(-49), clonePresidentState(state)]);
    setState((prev) => passPresidentTurn(prev, false));
    setThrowDarts([]); setMultiplier(1); setNotice("PASSÉ");
  }
  function undoTurn() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice(""); return; }
    if (!undo.length || state.finished) return;
    const prev = undo[undo.length-1]; setUndo((u)=>u.slice(0,-1)); setState(clonePresidentState(prev)); setNotice("Dernier tour annulé.");
  }
  function back() {
    if (state.history.length && !state.finished && !window.confirm("Quitter le règne en cours ?")) return;
    if (typeof go === "function") go("president_config", config);
  }
  function replay() {
    setState(createInitial()); setUndo([]); setThrowDarts([]); setSelectedTarget(null); setNotice(""); setShowEnd(false); setShowRound(false);
    matchIdRef.current = `president-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; savedRef.current = ""; roundCountRef.current = 0;
  }

  React.useEffect(() => {
    const p = profilesById.get(activeId);
    if (!p || !isBotProfile(p, botIds) || state.finished || showRound || showEnd) { setBotThinking(false); return; }
    let cancelled = false; setBotThinking(true);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const target = presidentAutoTarget(state, activeId);
      if (!target) { if (state.currentTarget) setState((prev)=>passPresidentTurn(prev,true)); setBotThinking(false); return; }
      const level = String(config.botLevel || "normal");
      const base = level === "hard" ? .64 : level === "easy" ? .26 : .44;
      const difficulty = target.size === 3 ? .55 : target.size === 2 ? .72 : 1;
      const chance = base * difficulty;
      const darts: UiDart[] = [];
      let hit = false;
      for (let i=0;i<3 && !hit;i+=1) {
        if (Math.random() < chance) { darts.push({ v: target.value, mult: target.size as any }); hit = true; }
        else if (config.variant === "chaos" && config.coupEtat && Math.random() < .035) { darts.push({ v:25,mult:2 }); hit = true; }
        else { const miss = Math.random()<.2; darts.push(miss ? {v:0,mult:1} : {v:Math.max(1,Math.min(20,target.value+(Math.random()<.5?-1:1))),mult:1}); }
      }
      setUndo((u)=>[...u.slice(-49),clonePresidentState(state)]);
      setState((prev)=>playPresidentTurn(prev,target,darts.map(toGameDart)));
      setBotThinking(false);
    }, 480);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeId, state.trickNo, state.roundNo, state.currentTarget?.value, state.currentTarget?.size, showRound, showEnd]);

  function buildHistoryRecord() {
    const now = Date.now();
    const standings = getPresidentStandings(state);
    const rows = state.players.map((p:any) => {
      const profile = profilesById.get(p.id) || p; const s = state.statsByPlayer[p.id]; const standingIndex = standings.findIndex((x:any)=>x.id===p.id); const rank = standingIndex>=0 ? standingIndex+1 : 0;
      return {
        id:p.id, playerId:p.id, profileId:p.id, name:playerName(profile), avatarDataUrl:profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        winner:p.id===state.winnerId, win:p.id===state.winnerId, rank, score:s.powerPoints, points:s.powerPoints, powerPoints:s.powerPoints,
        roundsPlayed:s.roundsPlayed, president:s.president, vicePresident:s.vicePresident, citizen:s.citizen, viceTrouDuCul:s.viceTrouDuCul, trouDuCul:s.trouDuCul,
        avgRank:s.roundsPlayed ? Math.round((s.rankTotal/s.roundsPlayed)*100)/100 : 0, bestFinishRank:s.bestFinishRank, worstFinishRank:s.worstFinishRank,
        darts:s.darts, dartsThrown:s.darts, visits:s.visits, successfulPlays:s.successfulPlays, failedPlays:s.failedPlays, successRate:formatPct(s.successfulPlays,s.visits),
        cardsPlayed:s.cardsPlayed, singlesPlayed:s.singlesPlayed, pairsPlayed:s.pairsPlayed, triplesPlayed:s.triplesPlayed, tricksWon:s.tricksWon,
        voluntaryPasses:s.voluntaryPasses, automaticPasses:s.automaticPasses, taxesGiven:s.taxesGiven, taxesReceived:s.taxesReceived, coupEtats:s.coupEtats, revolutions:s.revolutions,
        singles:s.singles, doubles:s.doubles, triples:s.triples, bulls:s.bulls, dbulls:s.dbulls, misses:s.misses, rawStats:s,
      };
    });
    const matchStats = { durationMs:Math.max(0,(state.finishedAt||now)-state.startedAt), roundsPlayed:state.roundResults.length, totalDarts:rows.reduce((a,p)=>a+p.darts,0), totalCardsPlayed:rows.reduce((a,p)=>a+p.cardsPlayed,0), totalTricks:rows.reduce((a,p)=>a+p.tricksWon,0), coupEtats:rows.reduce((a,p)=>a+p.coupEtats,0), revolutions:rows.reduce((a,p)=>a+p.revolutions,0) };
    const summary = { kind:"president", mode:"president", sport:"darts", finished:state.finished, winnerId:state.winnerId, winnerName:playerName(profilesById.get(state.winnerId)), rounds:config.rounds, handSize:config.handSize, variant:config.variant, standings, rankings:standings, players:rows, perPlayer:rows, roundResults:state.roundResults, matchStats, durationMs:matchStats.durationMs, scoreLine:standings.map((x:any)=>`${x.name} ${x.powerPoints} pts`).join(" • "), game:{mode:"president"} };
    return { id:matchIdRef.current, matchId:matchIdRef.current, kind:"president", mode:"president", sport:"darts", status:state.finished?"finished":"in_progress", createdAt:state.startedAt, updatedAt:now, winnerId:state.winnerId, players:rows, game:{mode:"president"}, summary, payload:{ kind:"president", mode:"president", sport:"darts", winnerId:state.winnerId, config, rules:state.rules, players:rows, summary, visits:state.history, visitHistory:state.history, roundResults:state.roundResults, stats:{sport:"darts",mode:"president",players:rows,match:matchStats,global:matchStats}, state:{standings:state.standings,previousRoles:state.previousRoles} } };
  }
  React.useEffect(() => {
    if (!state.finished || savedRef.current === matchIdRef.current) return;
    savedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord(), { navigate:false }); } catch {}
  }, [state.finished]);

  const standingsLive = getPresidentStandings(state);
  const activeStats = state.statsByPlayer[activeId] || ({} as any);
  const activeStanding = standingsLive.find((row:any)=>row.id===activeId);
  const successRate = formatPct(Number(activeStats.successfulPlays||0), Number(activeStats.visits||0));
  const totalPasses = Number(activeStats.voluntaryPasses||0) + Number(activeStats.automaticPasses||0);
  const totalTaxes = Number(activeStats.taxesGiven||0) + Number(activeStats.taxesReceived||0);
  const passedNames = state.passedPlayerIds.map((id)=>playerName(profilesById.get(id))).join(" · ") || "Aucun";
  const trickEvents = state.history.filter((ev:any)=>ev.roundNo===state.roundNo && ev.trickNo===state.trickNo).slice(-12).reverse();
  const activeColor = roleColor(currentRole, primary);

  return <div style={{ minHeight:"100dvh", color:text, background:`radial-gradient(circle at 50% -5%,${primary}1f 0,${theme?.bg || "#080b14"} 44%,#020309 100%)`, paddingBottom:8, overflowX:"hidden" }}>
    <PageHeader tickerSrc={tickerPresident} tickerAlt="PRÉSIDENT" tickerFit="contain" tickerHeight={82} tickerEdgeFade="strong" tickerBottomGap={6} left={<BackDot onClick={back} color={primary} glow={`${primary}77`} title="Retour configuration" />} right={<InfoDot title="Règles Président" color={primary} glow={`${primary}77`} content={<RulesContent config={config} primary={primary} />} />} />

    <div style={{ width:"100%", maxWidth:980, margin:"0 auto", padding:"5px 8px 8px", boxSizing:"border-box" }}>
      <section style={{ ...panel(), marginBottom:6, padding:0, overflow:"hidden", borderColor:`${activeColor}70`, boxShadow:`0 0 24px ${activeColor}18` }}>
        <div style={{ position:"relative", minHeight:124, display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(116px,132px)", gap:5, alignItems:"stretch", padding:"7px 8px" }}>
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg,${activeColor}10,rgba(0,0,0,.10) 42%,rgba(0,0,0,.30))` }}/>
          <div style={{ position:"absolute", left:-22, top:-5, bottom:-5, width:"29%", minWidth:105, overflow:"hidden", opacity:.15, pointerEvents:"none" }}><div style={{ position:"absolute", left:-12, top:18, transform:"scale(1.55)", transformOrigin:"left top", filter:"saturate(.85)" }}><ProfileAvatar profile={activeProfile} size={88}/></div></div>
          <div style={{ position:"relative", zIndex:1, minWidth:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"3px 4px" }}>
            <div style={{ color:botThinking?"#67dcff":activeColor, fontSize:8.5, fontWeight:1100, letterSpacing:1 }}>{botThinking?"BOT EN RÉFLEXION":currentRole.toUpperCase()}</div>
            <div style={{ color:activeColor, fontSize:14, fontWeight:1100, letterSpacing:.75, marginTop:2, maxWidth:"100%", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{playerName(activeProfile).toUpperCase()}</div>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:7, marginTop:4 }}><span style={{ color:"#ffd45c", fontSize:52, fontWeight:1100, lineHeight:1, textShadow:"0 3px 18px rgba(255,205,70,.22)" }}>{hand.length}</span><span style={{ color:"rgba(255,255,255,.55)", fontSize:9, fontWeight:1000 }}>CARTES</span></div>
            <div style={{ marginTop:4, display:"flex", gap:8, color:"rgba(255,255,255,.60)", fontSize:8.5, fontWeight:900 }}><span>MANCHE {Math.min(state.roundNo,config.rounds)}/{config.rounds}</span><span>•</span><span>PLI {state.trickNo}</span></div>
          </div>
          <div style={{ position:"relative", zIndex:2, minWidth:0 }}><TinyTarget selected={selectedTarget} tableTarget={state.currentTarget} revolution={state.revolutionActive} primary={primary} onClick={()=>setShowHand(true)}/></div>
        </div>
      </section>

      <section style={{ ...panel(), marginBottom:6, padding:6 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:4 }}>
          <MiniKpi label="CARTES" value={hand.length} color="#ffd45c" />
          <MiniKpi label="PLIS" value={activeStats.tricksWon||0} color="#43d8ff" />
          <MiniKpi label="RÉUSSITE" value={`${successRate}%`} color="#72efad" />
          <MiniKpi label="POUVOIR" value={activeStanding?.powerPoints||0} color="#dc7cff" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:3, marginTop:4 }}>
          <MiniKpi compact label="DARTS" value={activeStats.darts||0} color={primary}/>
          <MiniKpi compact label="SIMPLE" value={activeStats.singlesPlayed||0} color="#f0f3ff"/>
          <MiniKpi compact label="PAIRES" value={activeStats.pairsPlayed||0} color="#39c9ff"/>
          <MiniKpi compact label="BRELANS" value={activeStats.triplesPlayed||0} color="#c45cff"/>
          <MiniKpi compact label="PASS" value={totalPasses} color="#ff9b67"/>
          <MiniKpi compact label="TAXES" value={totalTaxes} color="#ffcf57"/>
          <MiniKpi compact label="MISS" value={activeStats.misses||0} color="#ff6f86"/>
        </div>
      </section>

      <section style={{ ...panel(), marginBottom:6, padding:6 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:5 }}>
          <QuickTile label="MAIN & COUPS" value={`${hand.length} cartes · ${legalTargets.length} coups`} color="#ffd45c" icon="♠" alert={!selectedTarget} onClick={()=>setShowHand(true)}/>
          <QuickTile label="TABLE / PLI" value={state.currentTarget?presidentTargetLabel(state.currentTarget):"Ouverture libre"} color="#43d8ff" icon="◎" onClick={()=>setShowTrick(true)}/>
          <QuickTile label="STATS" value={`${activeStats.cardsPlayed||0} cartes jouées`} color="#c45cff" icon="▥" onClick={()=>setShowStats(true)}/>
          <QuickTile label="CLASSEMENT" value={`#${Math.max(1,standingsLive.findIndex((x:any)=>x.id===activeId)+1)} · ${activeStanding?.powerPoints||0} pts`} color="#ffb347" icon="♛" onClick={()=>setShowTable(true)}/>
        </div>
      </section>

      {!botThinking ? <section style={{ ...panel(), padding:7 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, margin:"0 2px 6px" }}><div><div style={{ color:primary, fontWeight:1100, fontSize:9.5, letterSpacing:.8 }}>COUP SÉLECTIONNÉ</div><div style={{ color:selectedTarget?"#fff":"#ff8a9a", fontSize:11, fontWeight:1000 }}>{selectedTarget?`${presidentTargetLabel(selectedTarget)} · ${presidentTargetDescription(selectedTarget)}`:"CHOISIS UN COUP DANS TA MAIN"}</div></div><button type="button" onClick={()=>setShowHand(true)} style={{ borderRadius:999,border:`1px solid ${primary}66`,background:`${primary}12`,color:primary,fontWeight:1000,fontSize:9,padding:"7px 10px" }}>CHANGER</button></div>
        {config.scoreInputMethod === "dartboard" ? <><div style={{ opacity:selectedTarget?1:.45, pointerEvents:selectedTarget?"auto":"none" }}><DartboardClickable multiplier={multiplier} onHit={(segment,mult)=>addDart(segment,mult)} size={Math.min(310,Math.max(235,window.innerWidth-42))} /></div><div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:7, marginTop:7 }}><button onClick={undoTurn} style={action(primary)}>ANNULER</button><button disabled={!state.currentTarget} onClick={passTurn} style={action("#ff9a70",!state.currentTarget)}>PASSER</button><button disabled={!throwDarts.length} onClick={validateAttempt} style={action("#6ee7b7",!throwDarts.length)}>VALIDER</button></div></> : <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={()=>setMultiplier(1)} onDouble={()=>setMultiplier(2)} onTriple={()=>setMultiplier(3)} onCancel={undoTurn} onBackspace={()=>setThrowDarts((d)=>d.slice(0,-1))} onNumber={(n)=>addDart(n)} onBull={()=>addDart(25)} onValidate={validateAttempt} hidePreview hideTotal centerSlot={<div style={{ textAlign:"center" }}><div style={{ color:primary, fontWeight:1100, fontSize:12 }}>{selectedTarget?presidentTargetLabel(selectedTarget):"—"}</div><button disabled={!state.currentTarget} onClick={(e)=>{e.stopPropagation();passTurn();}} style={{ marginTop:2,border:0,background:"transparent",color:state.currentTarget?"#ffae77":"#666",fontSize:8.5,fontWeight:1000 }}>PASSER</button></div>} noticeSlot={notice?<span>{notice}</span>:null} validateAttention={throwDarts.length>0} safeBottomPad />}
      </section> : <section style={{ ...panel(), textAlign:"center", color:"#43d8ff", fontWeight:1100, padding:16 }}>♛ LE BOT JOUE…</section>}
    </div>

    {showHand ? <ModalShell title="MAIN & COMBINAISONS" color="#ffd45c" onClose={()=>setShowHand(false)} wide>
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(140px,190px)", gap:10, alignItems:"start" }}>
        <div style={{ ...panel(), padding:9 }}><div style={{ color:"#ffd45c", fontSize:10, fontWeight:1100, marginBottom:7 }}>MAIN DE {playerName(activeProfile).toUpperCase()}</div><HandStrip hand={hand} legalTargets={legalTargets} selected={selectedTarget} onSelect={(t:any)=>{setSelectedTarget(t);setThrowDarts([]);setMultiplier(1);setNotice("");}} primary={primary}/><div style={{ color:"rgba(255,255,255,.5)", fontSize:9, marginTop:9 }}>Choisis la combinaison à tenter. Le panneau se ferme ensuite avec × et tu joues jusqu’à 3 fléchettes.</div></div>
        <div style={{ ...panel(), padding:7 }}><TargetCard selected={selectedTarget} tableTarget={state.currentTarget} revolution={state.revolutionActive} primary={primary}/></div>
      </div>
    </ModalShell>:null}

    {showTrick ? <ModalShell title={`TABLE · MANCHE ${state.roundNo} · PLI ${state.trickNo}`} color="#43d8ff" onClose={()=>setShowTrick(false)}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:6 }}><MiniKpi label="À BATTRE" value={state.currentTarget?presidentTargetLabel(state.currentTarget):"LIBRE"} color="#43d8ff"/><MiniKpi label="DERNIER COUP" value={state.lastSuccessfulPlayerId?playerName(profilesById.get(state.lastSuccessfulPlayerId)):"—"} color="#72efad"/><MiniKpi label="PASSÉS" value={state.passedPlayerIds.length} color="#ff9b67"/></div>
      <div style={{ ...panel(), marginTop:8, padding:9 }}><div style={{ color:"#43d8ff", fontSize:10, fontWeight:1100, marginBottom:6 }}>ÉTAT DES JOUEURS</div>{state.order.map((id:string)=>{const p=profilesById.get(id);const active=id===activeId;const passed=state.passedPlayerIds.includes(id);const done=state.finishedPlayerIds.includes(id);return <div key={id} style={{ display:"grid",gridTemplateColumns:"34px minmax(0,1fr) auto auto",gap:7,alignItems:"center",padding:"6px 5px",borderBottom:"1px solid rgba(255,255,255,.055)",background:active?`${primary}0d`:"transparent" }}><ProfileAvatar profile={p} size={30}/><div style={{ minWidth:0 }}><div style={{ color:active?primary:"#fff",fontWeight:1000,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{playerName(p)}</div><div style={{ color:"rgba(255,255,255,.45)",fontSize:8.5 }}>{state.previousRoles[id]||"Citoyen"}</div></div><div style={{ color:"#ffd45c",fontWeight:1100 }}>{state.hands[id]?.length||0}</div><div style={{ color:done?"#72efad":passed?"#ff9b67":"rgba(255,255,255,.42)",fontSize:8.5,fontWeight:1000 }}>{done?"FINI":passed?"PASS":"EN JEU"}</div></div>})}</div>
      <div style={{ ...panel(), marginTop:8, padding:9 }}><div style={{ color:"#43d8ff",fontSize:10,fontWeight:1100,marginBottom:6 }}>DERNIERS COUPS DU PLI</div>{trickEvents.length?trickEvents.map((ev:any)=><div key={ev.id} style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) auto auto",gap:8,padding:"6px 2px",borderBottom:"1px solid rgba(255,255,255,.05)",fontSize:9.5 }}><b>{playerName(profilesById.get(ev.playerId))}</b><span style={{ color:ev.success?"#72efad":"#ff9b67",fontWeight:1000 }}>{ev.success?presidentTargetLabel(ev.target):"PASS"}</span><span style={{ color:"rgba(255,255,255,.48)" }}>{ev.labels?.join(" · ")||"—"}</span></div>):<div style={{ color:"rgba(255,255,255,.48)",fontSize:10 }}>Aucun coup joué sur ce pli.</div>}</div>
    </ModalShell>:null}

    {showStats ? <ModalShell title="STATISTIQUES PRÉSIDENT" color="#c45cff" onClose={()=>setShowStats(false)} wide>
      <div style={{ ...panel(), padding:9, borderColor:`${activeColor}55` }}><div style={{ display:"grid",gridTemplateColumns:"44px minmax(0,1fr) auto",gap:9,alignItems:"center" }}><ProfileAvatar profile={activeProfile} size={40}/><div><div style={{ color:activeColor,fontWeight:1100 }}>{playerName(activeProfile)}</div><div style={{ color:"rgba(255,255,255,.48)",fontSize:9 }}>{currentRole}</div></div><div style={{ color:"#c45cff",fontSize:22,fontWeight:1100 }}>{activeStanding?.powerPoints||0} pts</div></div></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5,marginTop:7 }}><MiniKpi label="RÉUSSITE" value={`${successRate}%`} color="#72efad"/><MiniKpi label="CARTES JOUÉES" value={activeStats.cardsPlayed||0} color="#ffd45c"/><MiniKpi label="PLIS GAGNÉS" value={activeStats.tricksWon||0} color="#43d8ff"/><MiniKpi label="PRÉSIDENCES" value={activeStats.president||0} color="#ffb347"/></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5,marginTop:5 }}><MiniKpi label="SIMPLES" value={activeStats.singlesPlayed||0} color="#f0f3ff"/><MiniKpi label="PAIRES" value={activeStats.pairsPlayed||0} color="#39c9ff"/><MiniKpi label="BRELANS" value={activeStats.triplesPlayed||0} color="#c45cff"/><MiniKpi label="ÉCHECS" value={activeStats.failedPlays||0} color="#ff6f86"/></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5,marginTop:5 }}><MiniKpi label="DARTS" value={activeStats.darts||0} color={primary}/><MiniKpi label="PASS" value={totalPasses} color="#ff9b67"/><MiniKpi label="TAXES" value={totalTaxes} color="#ffcf57"/><MiniKpi label="COUPS D'ÉTAT" value={activeStats.coupEtats||0} color="#ff6e55"/></div>
      <div style={{ ...panel(), marginTop:8, padding:9 }}><div style={{ color:"#c45cff",fontSize:10,fontWeight:1100,marginBottom:6 }}>COMPARATIF JOUEURS</div>{standingsLive.map((row:any,i:number)=>{const st=state.statsByPlayer[row.id];const rate=formatPct(st.successfulPlays,st.visits);return <div key={row.id} style={{ display:"grid",gridTemplateColumns:"24px 32px minmax(0,1fr) repeat(3,auto)",gap:6,alignItems:"center",padding:"6px 2px",borderBottom:"1px solid rgba(255,255,255,.05)" }}><div style={{ color:i===0?"#ffd45c":"rgba(255,255,255,.55)",fontWeight:1100 }}>{i+1}</div><ProfileAvatar profile={profilesById.get(row.id)} size={28}/><div style={{ minWidth:0,fontWeight:1000,fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{row.name}</div><div style={{ color:"#c45cff",fontWeight:1100,fontSize:10 }}>{row.powerPoints}p</div><div style={{ color:"#43d8ff",fontWeight:1000,fontSize:9 }}>{st.tricksWon} plis</div><div style={{ color:"#72efad",fontWeight:1000,fontSize:9 }}>{rate}%</div></div>})}</div>
    </ModalShell>:null}

    {showRound && latestRound && !state.finished ? <RoundOverlay result={latestRound} state={state} profilesById={profilesById} primary={primary} onClose={()=>setShowRound(false)} /> : null}
    {showEnd && state.finished ? <EndOverlay state={state} profilesById={profilesById} primary={primary} onClose={()=>setShowEnd(false)} onReplay={replay} onHistory={()=>{ try { onFinish?.(buildHistoryRecord(),{navigate:true}); } catch { if(typeof go==="function") go("statsHub",{tab:"history"}); } }} /> : null}
    {showTable ? <ModalShell title="CLASSEMENT DU RÈGNE" color="#ffb347" onClose={()=>setShowTable(false)}><div style={{ display:"grid", gap:6 }}>{standingsLive.map((row:any,i:number)=>{ const st=state.statsByPlayer[row.id]; const role=state.previousRoles[row.id]||"Citoyen"; return <div key={row.id} style={{ display:"grid",gridTemplateColumns:"26px 36px minmax(0,1fr) auto auto",gap:7,alignItems:"center",padding:8,borderRadius:12,background:i===0?"rgba(255,179,71,.09)":"rgba(255,255,255,.035)",border:`1px solid ${i===0?"#ffb34755":"rgba(255,255,255,.06)"}` }}><div style={{ color:i===0?"#ffd45c":"#fff",fontWeight:1100 }}>{i+1}.</div><ProfileAvatar profile={profilesById.get(row.id)} size={32}/><div style={{ minWidth:0 }}><div style={{ color:roleColor(role,primary),fontWeight:1100,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{row.name}</div><div style={{ color:"rgba(255,255,255,.45)",fontSize:8.5 }}>{role} · {state.hands[row.id]?.length||0} cartes</div></div><div style={{ color:"#43d8ff",fontWeight:1000,fontSize:9 }}>{st.tricksWon} plis</div><div style={{ color:"#ffb347",fontSize:18,fontWeight:1100 }}>{row.powerPoints}</div></div>})}</div></ModalShell> : null}
  </div>;
}

function action(color:string,disabled=false):React.CSSProperties { return { minHeight:42,borderRadius:13,border:`1px solid ${disabled?"rgba(255,255,255,.08)":color+"88"}`,background:disabled?"rgba(255,255,255,.03)":`${color}18`,color:disabled?"#555a70":color,fontWeight:1000,cursor:disabled?"not-allowed":"pointer" }; }
