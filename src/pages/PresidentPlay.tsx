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
  return <div style={{ width: "min(260px, 67vw)", aspectRatio: "3 / 4", margin: "0 auto", borderRadius: 24, padding: 8, background: "linear-gradient(145deg,#080808,#17120b)", border: `2px solid ${primary}`, boxShadow: `0 0 30px ${primary}32, inset 0 0 0 2px rgba(255,255,255,.035)` }}>
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
  return <div style={{ minHeight:"100dvh", color:text, background:`radial-gradient(circle at 50% -5%,${primary}1f 0,${theme?.bg || "#080b14"} 44%,#020309 100%)`, paddingBottom:8, overflowX:"hidden" }}>
    <PageHeader title="♛ PRÉSIDENT" subtitle={`Manche ${Math.min(state.roundNo,config.rounds)}/${config.rounds} · Pli ${state.trickNo}`} left={<BackDot onClick={back} color={primary} glow={`${primary}77`} title="Retour configuration" />} right={<InfoDot title="Règles Président" color={primary} glow={`${primary}77`} content={<RulesContent config={config} primary={primary} />} />} />
    <div style={{ width:"100%", maxWidth:980, margin:"0 auto", padding:"6px 8px 8px", boxSizing:"border-box" }}>
      <section style={{ ...panel(), marginBottom:7, borderColor:`${primary}66`, padding:9 }}>
        <div style={{ display:"grid", gridTemplateColumns:"54px minmax(0,1fr) auto", gap:9, alignItems:"center" }}><ProfileAvatar profile={activeProfile} size={50} /><div style={{ minWidth:0 }}><div style={{ color:primary, fontSize:9.5, fontWeight:1000, letterSpacing:1 }}>{botThinking?"BOT EN RÉFLEXION":"JOUEUR ACTIF"}</div><div style={{ fontSize:16, fontWeight:1100, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{playerName(activeProfile)}</div><div style={{ color:roleColor(currentRole,primary), fontSize:9.5, fontWeight:1000 }}>{currentRole} · {hand.length} carte{hand.length>1?"s":""}</div></div><button onClick={()=>setShowTable(true)} style={{ minHeight:36, borderRadius:999, border:`1px solid ${primary}55`, background:`${primary}0e`, color:primary, fontWeight:1000, padding:"0 11px" }}>CLASSEMENT</button></div>
      </section>

      <section style={{ ...panel(), marginBottom:7, padding:9 }}><div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:8 }}><div><div style={{ color:softText, fontSize:9, fontWeight:1000 }}>TABLE</div><div style={{ color:state.currentTarget?primary:"#fff", fontSize:21, fontWeight:1100 }}>{state.currentTarget ? presidentTargetLabel(state.currentTarget) : "OUVERTURE"}</div></div><div style={{ textAlign:"right" }}><div style={{ color:softText, fontSize:9, fontWeight:1000 }}>DERNIER JOUEUR</div><div style={{ fontWeight:1000, fontSize:12 }}>{state.lastSuccessfulPlayerId ? playerName(profilesById.get(state.lastSuccessfulPlayerId)) : "—"}</div></div></div>{state.revolutionActive ? <div style={{ marginTop:6, color:"#ff9f70", fontSize:10, fontWeight:1000 }}>↕ RÉVOLUTION : les valeurs les plus basses deviennent les plus fortes.</div> : null}</section>

      <section style={{ ...panel(), marginBottom:7, padding:10 }}><TargetCard selected={selectedTarget} tableTarget={state.currentTarget} revolution={state.revolutionActive} primary={primary} /></section>

      <section style={{ ...panel(), marginBottom:7 }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:8 }}><div><div style={{ color:primary, fontWeight:1100, fontSize:11, letterSpacing:1 }}>VOTRE MAIN</div><div style={{ color:softText, fontSize:9.5 }}>{hand.length} carte{hand.length>1?"s":""} · {legalTargets.length} combinaison{legalTargets.length>1?"s":""} jouable{legalTargets.length>1?"s":""}</div></div>{!activeCanPlay && state.currentTarget ? <div style={{ color:"#ff9aab", fontSize:10, fontWeight:1000 }}>AUCUN COUP POSSIBLE</div> : null}</div><HandStrip hand={hand} legalTargets={legalTargets} selected={selectedTarget} onSelect={(t:any)=>{setSelectedTarget(t);setThrowDarts([]);setMultiplier(1);setNotice("");}} primary={primary} /></section>

      {!botThinking ? <section style={{ ...panel(), padding:8 }}>
        {config.scoreInputMethod === "dartboard" ? <><div style={{ opacity:selectedTarget?1:.45, pointerEvents:selectedTarget?"auto":"none" }}><DartboardClickable multiplier={multiplier} onHit={(segment,mult)=>addDart(segment,mult)} size={Math.min(330,Math.max(250,window.innerWidth-40))} /></div><div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:7, marginTop:7 }}><button onClick={undoTurn} style={action(primary)}>ANNULER</button><button disabled={!state.currentTarget} onClick={passTurn} style={action("#ff9a70",!state.currentTarget)}>PASSER</button><button disabled={!throwDarts.length} onClick={validateAttempt} style={action("#6ee7b7",!throwDarts.length)}>VALIDER</button></div></> : <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={()=>setMultiplier(1)} onDouble={()=>setMultiplier(2)} onTriple={()=>setMultiplier(3)} onCancel={undoTurn} onBackspace={()=>setThrowDarts((d)=>d.slice(0,-1))} onNumber={(n)=>addDart(n)} onBull={()=>addDart(25)} onValidate={validateAttempt} hidePreview hideTotal centerSlot={<div style={{ textAlign:"center" }}><div style={{ color:primary, fontWeight:1100, fontSize:12 }}>{selectedTarget?presidentTargetLabel(selectedTarget):"—"}</div><button disabled={!state.currentTarget} onClick={(e)=>{e.stopPropagation();passTurn();}} style={{ marginTop:2, border:0, background:"transparent", color:state.currentTarget?"#ffae77":"#666", fontSize:8.5, fontWeight:1000 }}>PASSER</button></div>} noticeSlot={notice?<span>{notice}</span>:null} validateAttention={throwDarts.length>0} safeBottomPad />}
      </section> : <section style={{ ...panel(), textAlign:"center", color:primary, fontWeight:1000, padding:18 }}>♛ LE BOT JOUE…</section>}
    </div>

    {showRound && latestRound && !state.finished ? <RoundOverlay result={latestRound} state={state} profilesById={profilesById} primary={primary} onClose={()=>setShowRound(false)} /> : null}
    {showEnd && state.finished ? <EndOverlay state={state} profilesById={profilesById} primary={primary} onClose={()=>setShowEnd(false)} onReplay={replay} onHistory={()=>{ try { onFinish?.(buildHistoryRecord(),{navigate:true}); } catch { if(typeof go==="function") go("statsHub",{tab:"history"}); } }} /> : null}
    {showTable ? <div onClick={()=>setShowTable(false)} style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(0,0,0,.74)", backdropFilter:"blur(7px)", display:"grid", placeItems:"center", padding:10 }}><div onClick={(e)=>e.stopPropagation()} style={{ ...panel(), width:"min(720px,100%)", maxHeight:"88vh", overflow:"auto" }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><b style={{ color:primary, letterSpacing:1 }}>CLASSEMENT DU RÈGNE</b><button onClick={()=>setShowTable(false)} style={{ width:32,height:32,borderRadius:999,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.04)",color:"#fff" }}>×</button></div><div style={{ display:"grid", gap:7, marginTop:10 }}>{standingsLive.map((row:any,i:number)=>{ const s=state.statsByPlayer[row.id]; return <div key={row.id} style={{ display:"grid",gridTemplateColumns:"28px 38px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:9,borderRadius:13,background:"rgba(255,255,255,.04)" }}><div style={{ fontWeight:1100,color:i===0?"#ffd76a":"#fff" }}>{i+1}.</div><ProfileAvatar profile={profilesById.get(row.id)} size={35}/><div><div style={{ fontWeight:1000 }}>{row.name}</div><div style={{ fontSize:9,opacity:.62 }}>{s.president}× Président · {s.tricksWon} plis</div></div><div style={{ color:primary,fontSize:20,fontWeight:1100 }}>{row.powerPoints}</div></div>; })}</div></div></div> : null}
  </div>;
}

function action(color:string,disabled=false):React.CSSProperties { return { minHeight:42,borderRadius:13,border:`1px solid ${disabled?"rgba(255,255,255,.08)":color+"88"}`,background:disabled?"rgba(255,255,255,.03)":`${color}18`,color:disabled?"#555a70":color,fontWeight:1000,cursor:disabled?"not-allowed":"pointer" }; }
