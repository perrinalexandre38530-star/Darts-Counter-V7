// @ts-nocheck
// =============================================================
// OCEAN CONTROL — écran de jeu compact + panneaux flottants
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad"; // conservé pour le contrat d’intégration historique
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  buildOceanControlMatchStats,
  cloneOceanControlState,
  createOceanControlState,
  getOceanActivePlayer,
  getOceanNextUnplacedShip,
  getOceanOwnerForPlayer,
  getOceanPlacementOwner,
  getOceanTargetOwner,
  normalizeOceanControlConfig,
  oceanControlAccuracy,
  oceanControlDifficultyLabel,
  oceanControlFleetLabel,
  oceanControlLatestSonarScan,
  oceanControlRemainingCells,
  oceanControlRemainingDecks,
  oceanControlTacticalHint,
  oceanControlVariantLabel,
  pickOceanControlBotDarts,
  placeOceanControlShip,
  playOceanControlVisit,
  resetOceanPlacementOwner,
  selectOceanControlFocus,
  selectOceanControlTarget,
  type OceanControlConfigPayload,
  type OceanControlOrientation,
  type OceanControlState,
} from "../lib/gameEngines/oceanControlEngine";
import { History } from "../lib/history";
import tickerOcean from "../assets/tickers/ticker_ocean_control.png";
import OceanControlEnd from "./OceanControlEnd";
import "../styles/ocean-control-play.css";

type UiDart = { v: number; mult: 1 | 2 | 3 };
type Overlay = null | "fleet" | "targets" | "intel" | "stats" | "log";

const BLUE = "#30b9ff", CYAN = "#65e9ff", GREEN = "#65e5aa", GOLD = "#f5ca68", RED = "#ff6573", SOFT = "#aab4c7";
const PLAYER_COLORS = [BLUE, "#ff6b74", GREEN, GOLD, "#a78bfa", "#ff63b8", "#6de1d2", "#d4d8e5"];

function panel(accent = "rgba(255,255,255,.10)"): React.CSSProperties { return { borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: `1px solid ${accent}`, boxShadow: "0 14px 34px rgba(0,0,0,.28)", boxSizing: "border-box" }; }
function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function uiToGameDart(dart: UiDart): GameDart { if (!dart || dart.v === 0) return { bed: "MISS" }; if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" }; return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart; }
function gameToUiDart(dart: GameDart): UiDart { if (dart.bed === "MISS") return { v: 0, mult: 1 }; if (dart.bed === "OB") return { v: 25, mult: 1 }; if (dart.bed === "IB") return { v: 25, mult: 2 }; return { v: Number(dart.number || 0), mult: dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1 }; }
function normalizeConfig(props: any): OceanControlConfigPayload { const record = props?.params?.rec || props?.params?.record || props?.params?.match || null; const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || props?.config || props?.params || {}; return normalizeOceanControlConfig(raw); }

function Rules({ config }: { config: OceanControlConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.46 }}>
    <div><strong style={{ color: BLUE }}>{oceanControlVariantLabel(config.variant).toUpperCase()}</strong><br />Détruis la flotte adverse en attaquant les secteurs 1 à 20.</div>
    <div><strong style={{ color: CYAN }}>ARMES</strong><br />{config.variant === "tactical" ? "Simple = 1 zone · Double = 2 zones · Triple = ligne de 3." : "S, D et T attaquent une seule zone."}</div>
    <div><strong style={{ color: GREEN }}>SONAR</strong><br />Sélectionne une zone sur la grille puis touche le Bull pour analyser les cases voisines.</div>
    <div><strong style={{ color: GOLD }}>DBULL</strong><br />Déclenche une frappe de précision sur la zone sélectionnée ou une cible inconnue.</div>
  </div>;
}

function ShipStrip({ owner, reveal = false }: any) {
  return <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{(owner?.ships || []).map((ship: any) => <div key={ship.id} title={ship.name} style={{ minWidth: 44, borderRadius: 11, padding: "5px 7px", textAlign: "center", background: ship.sunk ? `${RED}18` : `${BLUE}10`, border: `1px solid ${ship.sunk ? RED : BLUE}55`, opacity: ship.sunk ? .6 : 1 }}><div style={{ fontSize: 15, filter: !reveal && !ship.sunk ? "brightness(.78)" : "none" }}>{ship.sunk ? "💥" : ship.icon}</div><div style={{ color: ship.sunk ? RED : SOFT, fontSize: 6.8, fontWeight: 1000 }}>{ship.hits.length}/{ship.length}</div></div>)}</div>;
}

function OceanGrid({ state, owner, own = false, onFocus, placement = false, placementShip, onPlace, sonarScan = null, recentCells = [] }: any) {
  const difficulty = state.config.difficulty;
  return <div className="ocean-control-grid">{Array.from({ length: 20 }, (_, cell) => {
    const number = state.gridNumbers[cell];
    const status = owner?.attackedCells?.[String(cell)] || null;
    const ship = own ? owner?.ships?.find((row: any) => row.cells.includes(cell)) : null;
    const focused = Number(state.focusNumber) === Number(number);
    const scanned = Boolean(!own && sonarScan?.targetOwnerId === owner?.id && sonarScan?.cells?.includes(cell));
    const scanCenter = Boolean(scanned && sonarScan?.centerCell === cell);
    const recent = Boolean(recentCells?.includes(cell));
    const showNumber = difficulty !== "admiral" || status || focused || placement || own;
    const className = ["ocean-control-cell", status ? `is-${status}` : "", focused ? "is-focused" : "", ship ? "has-ship" : "", placement ? "is-placement" : "", scanned ? "is-sonar-scan" : "", scanCenter ? "is-sonar-center" : "", recent ? "is-recent-impact" : ""].filter(Boolean).join(" ");
    return <button key={cell} type="button" className={className} onClick={() => placement ? onPlace?.(cell) : onFocus?.(number)} aria-label={`Zone ${number}${status ? ` · ${status}` : ""}`}>
      <span className="ocean-cell-number">{showNumber ? number : "•"}</span>
      <span className="ocean-cell-mark">{status === "miss" ? "≈" : status === "hit" ? "✹" : status === "sunk" ? "💥" : ship ? ship.icon : ""}</span>
      {scanCenter ? <span className="ocean-cell-sonar-badge">{sonarScan.contactCount}</span> : null}
      {placement && placementShip ? <span className="ocean-cell-coord">{String.fromCharCode(65 + Math.floor(cell / 5))}{(cell % 5) + 1}</span> : null}
    </button>;
  })}</div>;
}

function feedbackFromVisit(visit: any) {
  const events = Array.isArray(visit?.events) ? visit.events : [];
  const priority = ["battle_win", "sunk", "strike", "hit", "sonar", "water", "duplicate", "miss"];
  const event = priority.map((type) => events.find((row: any) => row.type === type)).find(Boolean) || events[0];
  if (!event) return null;
  const map: any = {
    battle_win: { icon: "🏆", tone: "win" },
    sunk: { icon: "💥", tone: "sunk" },
    strike: { icon: "🎯", tone: "strike" },
    hit: { icon: "🔥", tone: "hit" },
    sonar: { icon: "📡", tone: "sonar" },
    water: { icon: "🌊", tone: "water" },
    duplicate: { icon: "↻", tone: "duplicate" },
    miss: { icon: "✕", tone: "miss" },
  };
  const visual = map[event.type] || map.miss;
  return { ...visual, label: event.label, id: `${visit?.id || Date.now()}-${event.type}` };
}

function ImpactFeedback({ feedback }: any) {
  if (!feedback) return null;
  return <div key={feedback.id} className={`ocean-impact-feedback is-${feedback.tone}`} role="status" aria-live="polite"><span>{feedback.icon}</span><strong>{feedback.label}</strong></div>;
}

function QuickButton({ icon, label, value, color, onClick }: any) {
  return <button type="button" onClick={onClick} className="ocean-float-action" style={{ borderColor: `${color}66`, background: `linear-gradient(180deg,${color}20,rgba(3,10,16,.96))` }} title={`${label} · ${value}`}>
    <span className="ocean-float-action__icon" style={{ color }}>{icon}</span>
    <span className="ocean-float-action__label">{label}</span>
    <span className="ocean-float-action__badge" style={{ borderColor: `${color}66`, color }}>{String(value).split(" ")[0]}</span>
  </button>;
}

function dartPreviewLabel(dart?: UiDart) {
  if (!dart) return "—";
  if (Number(dart.v) === 0) return "MISS";
  if (Number(dart.v) === 25) return dart.mult === 2 ? "DB" : "B";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function CompactDartPad({ currentThrow, multiplier, onSimple, onDouble, onTriple, onNumber, onBull, onCancel, onBackspace, onValidate, noticeSlot, disabled = false }: any) {
  const rows = [
    [0, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18, 19, 20],
  ];

  return <div className="ocean-compact-pad">
    <div className="ocean-pad-statusline">
      <div className="ocean-pad-statusline__notice">{noticeSlot}</div>
      <div className="ocean-pad-preview-strip">
        {[0, 1, 2].map((index) => <span key={index} className="ocean-pad-preview-chip">{dartPreviewLabel(currentThrow[index])}</span>)}
      </div>
    </div>

    <div className="ocean-pad-action-row">
      <button type="button" className={`ocean-pad-mode ${multiplier === 1 ? "is-active is-simple" : ""}`} onClick={onSimple} disabled={disabled}>SIMPLE</button>
      <button type="button" className={`ocean-pad-mode ${multiplier === 2 ? "is-active is-double" : ""}`} onClick={onDouble} disabled={disabled}>DOUBLE</button>
      <button type="button" className={`ocean-pad-mode ${multiplier === 3 ? "is-active is-triple" : ""}`} onClick={onTriple} disabled={disabled}>TRIPLE</button>
      <button type="button" className="ocean-pad-undo" onClick={onCancel} disabled={disabled}>↶</button>
    </div>

    <div className="ocean-pad-grid-rows">
      {rows.map((row, rowIndex) => <div key={rowIndex} className="ocean-pad-grid-row">{row.map((n) => <button key={n} type="button" className={`ocean-pad-cell ${n === 0 ? "is-miss" : ""}`} onClick={() => onNumber(n)} disabled={disabled} title={n === 0 ? "MISS" : String(n)}>{n === 0 ? "MISS" : n}</button>)}</div>)}
    </div>

    <div className="ocean-pad-footer-row">
      <button type="button" className={`ocean-pad-bull ${multiplier === 2 ? "is-dbull" : ""}`} onClick={onBull} disabled={disabled}>{multiplier === 2 ? "DBULL" : "BULL"}</button>
      <button type="button" className="ocean-pad-backspace" onClick={onBackspace} disabled={disabled || !currentThrow.length}>⌫</button>
      <button type="button" className="ocean-pad-validate" onClick={onValidate} disabled={disabled || !currentThrow.length}>VALIDER</button>
    </div>
  </div>;
}

function Kpi({ label, value, color = BLUE, detail }: any) { return <div style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", minWidth: 0 }}><div style={{ color: SOFT, fontSize: 7.2, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 19, fontWeight: 1100 }}>{value}</div>{detail ? <div style={{ marginTop: 3, color: "rgba(255,255,255,.42)", fontSize: 7.3 }}>{detail}</div> : null}</div>; }

function OverlayShell({ title, subtitle, color, onClose, children }: any) {
  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,3,8,.86)", backdropFilter: "blur(9px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "8px 8px max(8px,env(safe-area-inset-bottom))" }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div style={{ width: "min(820px,100%)", maxHeight: "88dvh", overflow: "hidden", borderRadius: "23px 23px 15px 15px", background: "linear-gradient(180deg,#111c29,#05080c)", border: `1px solid ${color}55`, boxShadow: "0 28px 90px rgba(0,0,0,.72)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 13px", borderBottom: "1px solid rgba(255,255,255,.08)" }}><div style={{ minWidth: 0 }}><div style={{ color, fontSize: 11.5, fontWeight: 1100, letterSpacing: .75 }}>{title}</div>{subtitle ? <div style={{ marginTop: 2, color: SOFT, fontSize: 8.5 }}>{subtitle}</div> : null}</div><button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.045)", color: "#fff", fontSize: 18 }}>×</button></div>
      <div className="dc-scroll-thin" style={{ maxHeight: "calc(88dvh - 65px)", overflowY: "auto", padding: 12 }}>{children}</div>
    </div>
  </div>;
}

function PlacementScreen({ state, profilesById, ready, onReady, orientation, setOrientation, onPlace, onReset, onAuto }: any) {
  const owner = getOceanPlacementOwner(state);
  const ship = getOceanNextUnplacedShip(state);
  const memberProfiles = (owner?.memberIds || []).map((id: string) => profilesById.get(String(id))).filter(Boolean);
  if (!owner) return null;
  if (!ready) return <div style={{ minHeight: "calc(100dvh - 76px)", display: "grid", placeItems: "center", padding: 16, boxSizing: "border-box" }}><div style={{ width: "min(520px,100%)", textAlign: "center", borderRadius: 24, padding: 20, background: "linear-gradient(180deg,rgba(48,185,255,.16),rgba(0,0,0,.44))", border: `1px solid ${BLUE}66` }}><div style={{ fontSize: 42 }}>🔒</div><div style={{ marginTop: 8, color: CYAN, fontWeight: 1150, fontSize: 18 }}>{owner.name}</div><div style={{ marginTop: 7, color: SOFT, fontSize: 10, lineHeight: 1.45 }}>Passe l’appareil au commandant de cette flotte. Les autres joueurs ne doivent pas regarder le placement.</div><div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 6 }}>{memberProfiles.map((profile: any) => <ProfileAvatar key={profile.id} profile={profile} size={42} />)}</div><button onClick={onReady} style={{ marginTop: 16, width: "100%", minHeight: 48, borderRadius: 15, border: `1px solid ${GREEN}88`, background: `linear-gradient(180deg,${GREEN},#239d70)`, color: "#03130d", fontWeight: 1200 }}>AFFICHER MA GRILLE</button></div></div>;
  return <main style={{ width: "min(760px,100%)", margin: "0 auto", padding: "8px 9px 16px", boxSizing: "border-box" }}>
    <section style={{ ...panel(`${BLUE}55`), padding: 12, textAlign: "center" }}><div style={{ color: CYAN, fontSize: 11, fontWeight: 1100 }}>PLACEMENT SECRET · {owner.name}</div><div style={{ marginTop: 5, color: "#fff", fontSize: 17, fontWeight: 1150 }}>{ship ? `${ship.icon} ${ship.name} · ${ship.length} zones` : "Flotte prête"}</div><div style={{ marginTop: 4, color: SOFT, fontSize: 8.5 }}>Choisis la première case du navire puis son orientation.</div></section>
    <section style={{ ...panel(), padding: 8, marginTop: 8 }}><OceanGrid state={state} owner={owner} own placement placementShip={ship} onPlace={onPlace} /></section>
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}><button onClick={() => setOrientation("horizontal")} style={{ minHeight: 42, borderRadius: 13, border: `1px solid ${orientation === "horizontal" ? CYAN : "rgba(255,255,255,.10)"}`, background: orientation === "horizontal" ? `${CYAN}18` : "rgba(255,255,255,.03)", color: orientation === "horizontal" ? CYAN : SOFT, fontWeight: 1050 }}>↔ HORIZONTAL</button><button onClick={() => setOrientation("vertical")} style={{ minHeight: 42, borderRadius: 13, border: `1px solid ${orientation === "vertical" ? CYAN : "rgba(255,255,255,.10)"}`, background: orientation === "vertical" ? `${CYAN}18` : "rgba(255,255,255,.03)", color: orientation === "vertical" ? CYAN : SOFT, fontWeight: 1050 }}>↕ VERTICAL</button></div>
    <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}><button onClick={onReset} style={{ minHeight: 40, borderRadius: 13, border: `1px solid ${RED}55`, background: `${RED}10`, color: RED, fontWeight: 1000 }}>RECOMMENCER</button><button onClick={onAuto} style={{ minHeight: 40, borderRadius: 13, border: `1px solid ${GOLD}66`, background: `${GOLD}12`, color: GOLD, fontWeight: 1000 }}>PLACEMENT AUTO</button></div>
  </main>;
}

export default function OceanControlPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: Math.max(2, config.players) }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => { const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null; return snapshot?.mode === "ocean_control" ? cloneOceanControlState(snapshot) : createOceanControlState(players, config); }, []);

  const [state, setState] = React.useState<OceanControlState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<OceanControlState[]>([]);
  const [notice, setNotice] = React.useState(oceanControlTacticalHint(initialState));
  const [impactFeedback, setImpactFeedback] = React.useState<any>(null);
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [showEnd, setShowEnd] = React.useState(initialState.phase === "finished");
  const [botThinking, setBotThinking] = React.useState(false);
  const [placementReady, setPlacementReady] = React.useState(false);
  const [orientation, setOrientation] = React.useState<OceanControlOrientation>("horizontal");
  const placementOwnerIdRef = React.useRef(getOceanPlacementOwner(initialState)?.id || "");
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `ocean-control-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  const activePlayer = getOceanActivePlayer(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeStats = state.statsByPlayer[String(activePlayer?.id || "")] || {};
  const activeColor = PLAYER_COLORS[state.activePlayerIndex % PLAYER_COLORS.length];
  const ownOwner = activePlayer ? getOceanOwnerForPlayer(state, activePlayer.id) : null;
  const targetOwner = getOceanTargetOwner(state);
  const lastVisit = state.visits[state.visits.length - 1];

  function backToConfig() { if (typeof go === "function") go("ocean_control_config", config); }
  function addDart(v: number, mult?: 1 | 2 | 3) { if (botThinking || state.phase !== "playing" || throwDarts.length >= 3) return; setThrowDarts((prev) => [...prev, { v: Number(v) || 0, mult: (mult || multiplier) as any }].slice(0, 3)); }
  function commitVisit(source?: UiDart[]) { const darts = (source || throwDarts).slice(0, 3); if (!darts.length || state.phase !== "playing") return; setUndoStack((prev) => [...prev.slice(-29), cloneOceanControlState(state)]); const next = playOceanControlVisit(state, darts.map(uiToGameDart)); setState(next); setThrowDarts([]); setMultiplier(1); const visit = next.visits[next.visits.length - 1]; setNotice(visit?.events?.map((event) => event.label).join(" · ") || oceanControlTacticalHint(next)); setImpactFeedback(feedbackFromVisit(visit)); if (next.phase === "finished") setShowEnd(true); }
  function cancelOrUndo() { if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setImpactFeedback(null); setNotice("Volée effacée."); return; } const previous = undoStack[undoStack.length - 1]; if (!previous) { setNotice("Aucune action à annuler."); return; } setState(previous); setUndoStack((prev) => prev.slice(0, -1)); setShowEnd(false); setImpactFeedback(null); autoSavedRef.current = ""; setNotice("Dernière volée annulée."); }
  function resetMatch() { matchIdRef.current = `ocean-control-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const next = createOceanControlState(players, config); setState(next); setThrowDarts([]); setUndoStack([]); setShowEnd(false); setOverlay(null); setPlacementReady(false); setImpactFeedback(null); setNotice(oceanControlTacticalHint(next)); autoSavedRef.current = ""; }
  function chooseTarget(ownerId: string) { setState((prev) => selectOceanControlTarget(prev, ownerId)); setOverlay(null); }
  function chooseFocus(number: number) { setState((prev) => selectOceanControlFocus(prev, number)); setNotice(`Zone ${number} sélectionnée pour le sonar / DBULL.`); }
  function handlePlace(cell: number) { const beforeOwner = getOceanPlacementOwner(state)?.id; const next = placeOceanControlShip(state, cell, orientation); const afterOwner = getOceanPlacementOwner(next)?.id; setState(next); if (beforeOwner !== afterOwner || next.phase !== "placement") setPlacementReady(false); }
  function autoPlaceCurrentOwner() { let next = cloneOceanControlState(state); let safety = 0; while (next.phase === "placement" && getOceanPlacementOwner(next)?.id === getOceanPlacementOwner(state)?.id && safety < 300) { const ship = getOceanNextUnplacedShip(next); if (!ship) break; const cell = Math.floor(Math.random() * 20); const orient = Math.random() > .5 ? "horizontal" : "vertical"; const candidate = placeOceanControlShip(next, cell, orient as any); if (JSON.stringify(candidate) !== JSON.stringify(next)) next = candidate; safety += 1; } setState(next); setPlacementReady(false); }

  React.useEffect(() => {
    const ownerId = getOceanPlacementOwner(state)?.id || "";
    if (ownerId !== placementOwnerIdRef.current) { placementOwnerIdRef.current = ownerId; setPlacementReady(false); }
  }, [state.placementOwnerIndex, state.phase]);

  React.useEffect(() => {
    if (state.phase !== "placement") return;
    const owner = getOceanPlacementOwner(state); if (!owner) return;
    const allBot = owner.memberIds.every((id) => isBot(profilesById.get(String(id)), botIds));
    if (!allBot) return;
    const timer = window.setTimeout(autoPlaceCurrentOwner, 350);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.placementOwnerIndex]);

  React.useEffect(() => {
    if (state.phase !== "playing" || !activePlayer || !isBot(activeProfile, botIds) || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const plan = pickOceanControlBotDarts(state, config.botLevel);
      let prepared = plan.focusNumber ? selectOceanControlFocus(state, plan.focusNumber) : state;
      const next = playOceanControlVisit(prepared, plan.darts);
      setUndoStack((prev) => [...prev.slice(-29), cloneOceanControlState(state)]); setState(next); setThrowDarts([]); setBotThinking(false);
      const visit = next.visits[next.visits.length - 1]; setNotice(visit?.events?.map((event) => event.label).join(" · ") || "Volée BOT validée."); setImpactFeedback(feedbackFromVisit(visit)); if (next.phase === "finished") setShowEnd(true);
    }, 650);
    return () => { window.clearTimeout(timer); setBotThinking(false); };
  }, [state.activePlayerIndex, state.roundIndex, state.battleNumber, state.phase]);

  React.useEffect(() => { if (!overlay) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOverlay(null); }; window.addEventListener("keydown", onKey); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); }; }, [overlay]);
  React.useEffect(() => { if (!impactFeedback) return; const timer = window.setTimeout(() => setImpactFeedback(null), 1650); return () => window.clearTimeout(timer); }, [impactFeedback?.id]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished"; const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player, index) => {
      const profile = profilesById.get(String(player.id)) || player; const stats = state.statsByPlayer[player.id] || {}; const owner = getOceanOwnerForPlayer(state, player.id);
      const visits = state.visits.filter((visit) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit) => visit.darts.map((dart, dartIndex) => ({ ...dart, label: visit.labels[dartIndex], battle: visit.battle, round: visit.round, visit: visit.visit, dartIndex: dartIndex + 1, events: visit.events })));
      const won = finished && state.winnerPlayerIds.includes(player.id);
      return { id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null, dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, color: PLAYER_COLORS[index % PLAYER_COLORS.length], ownerId: owner?.id || null, ownerName: owner?.name || null, rank: won ? 1 : 2, win: won, winner: won, ...stats, accuracy: oceanControlAccuracy(stats), visitsHistory: visits, visitHistory: visits, dartsDetail, hitsBySegment: { ...(stats.hitsBySegment || {}) } };
    });
    const matchStats = buildOceanControlMatchStats(state);
    const summary = { kind: "ocean_control", mode: "ocean_control", sport: "darts", variant: config.variant, variantLabel: oceanControlVariantLabel(config.variant), finished, statisticsVersion: 2, telemetryVersion: 2, winnerId: finished ? state.winnerPlayerIds[0] || null : null, winnerIds: finished ? state.winnerPlayerIds : [], winnerOwnerIds: finished ? state.winnerOwnerIds : [], winnerName: finished ? state.owners.filter((owner) => state.winnerOwnerIds.includes(owner.id)).map((owner) => owner.name).join(" / ") : null, battlesPlayed: state.battleNumber, configuredWins: config.winsNeeded, players: playerRows, perPlayer: playerRows, rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [], visits: state.visits, sonarScans: state.sonarScans || [], battleHistory: state.battleHistory || [], matchStats, config, scoreByOwner: state.scoreByOwner, scoreLine: `${oceanControlVariantLabel(config.variant)} · ${matchStats.shipsSunk} navires coulés · ${matchStats.totalDarts} fléchettes`, game: { mode: "ocean_control", variant: config.variant, winsNeeded: config.winsNeeded } };
    return { id: matchIdRef.current, matchId: matchIdRef.current, kind: "ocean_control", mode: "ocean_control", sport: "darts", status, statisticsVersion: 2, telemetryVersion: 2, createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now, ...(finished ? { finishedAt: now, endedAt: now } : {}), winnerId: summary.winnerId, winnerIds: summary.winnerIds, winnerName: summary.winnerName, players: playerRows, resumeId: matchIdRef.current, resume: { config, state: cloneOceanControlState(state), updatedAt: now }, game: summary.game, summary, payload: { kind: "ocean_control", mode: "ocean_control", sport: "darts", variant: config.variant, statisticsVersion: 2, telemetryVersion: 2, config, players: playerRows, summary, visits: state.visits, visitHistory: state.visits, sonarScans: state.sonarScans || [], battleHistory: state.battleHistory || [], stateSnapshot: cloneOceanControlState(state), stats: { sport: "darts", mode: "ocean_control", variant: config.variant, players: playerRows, match: matchStats, global: matchStats } } };
  }

  React.useEffect(() => { if (state.phase === "finished" || state.visits.length === 0) return; const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 280); return () => window.clearTimeout(timer); }, [state]);
  React.useEffect(() => { if (state.phase !== "finished") return; setShowEnd(true); if (autoSavedRef.current === matchIdRef.current) return; autoSavedRef.current = matchIdRef.current; try { onFinish?.(buildHistoryRecord("finished"), { navigate: false }); } catch {} }, [state.phase]);

  if (state.phase === "placement") return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: "radial-gradient(circle at 50% -10%,rgba(48,185,255,.22),#07101b 43%,#020507 100%)" }}><PageHeader tickerSrc={tickerOcean} tickerAlt="OCEAN CONTROL" tickerHeight={78} tickerBottomGap={6} left={<BackDot onClick={backToConfig} color={BLUE} glow={`${BLUE}88`} />} right={<InfoDot title="Placement de la flotte" color={CYAN} glow={`${CYAN}88`} content={<Rules config={config} />} />} /><PlacementScreen state={state} profilesById={profilesById} ready={placementReady} onReady={() => setPlacementReady(true)} orientation={orientation} setOrientation={setOrientation} onPlace={handlePlace} onReset={() => setState((prev) => resetOceanPlacementOwner(prev))} onAuto={autoPlaceCurrentOwner} /></div>;

  const remainingShips = oceanControlRemainingDecks(targetOwner);
  const remainingCells = oceanControlRemainingCells(targetOwner);
  const totalTargetCells = targetOwner?.ships?.reduce((sum: number, ship: any) => sum + Number(ship.length || 0), 0) || 1;
  const targetDamagePercent = Math.max(0, Math.min(100, Math.round(((totalTargetCells - remainingCells) / totalTargetCells) * 100)));
  const latestSonar = oceanControlLatestSonarScan(state, targetOwner?.id);
  const sonarScansForTarget = (state.sonarScans || []).filter((scan) => scan.targetOwnerId === targetOwner?.id).slice(-8).reverse();
  const recentCells = lastVisit?.targetOwnerId === targetOwner?.id ? Array.from(new Set((lastVisit?.events || []).map((event: any) => event.cell).filter((cell: any) => Number.isInteger(cell)))) : [];
  const scoreLine = state.owners.map((owner) => `${owner.name} ${state.scoreByOwner[owner.id] || 0}`).join(" · ");
  const noticeSlot = <div style={{ color: botThinking ? GOLD : SOFT, fontSize: 8.2, fontWeight: 900, textAlign: "center", lineHeight: 1.2 }}>{botThinking ? "BOT EN APPROCHE…" : notice}</div>;

  return <div className="ocean-control-page" style={{ color: theme?.text || "#fff" }}>
    <PageHeader tickerSrc={tickerOcean} tickerAlt="OCEAN CONTROL" tickerHeight={60} tickerBottomGap={2} left={<BackDot onClick={backToConfig} color={BLUE} glow={`${BLUE}88`} />} right={<InfoDot title="Règles OCEAN CONTROL" color={CYAN} glow={`${CYAN}88`} content={<Rules config={config} />} />} />

    <main className="ocean-control-main">
      <section className="ocean-commander-panel" style={{ borderColor: `${activeColor}66` }}>
        <div className="ocean-commander-bar">
          <ProfileAvatar profile={activeProfile} size={36} />
          <div className="ocean-commander-identity">
            <div className="ocean-commander-name" style={{ color: activeColor }}>{playerName(activeProfile)}</div>
            <div className="ocean-commander-meta">{ownOwner?.name} · Bataille {state.battleNumber}</div>
            <div className="ocean-commander-target">CIBLE · {targetOwner?.name || "—"}</div>
          </div>
          <div className="ocean-commander-metrics">
            <div className="ocean-mini-kpi"><span>NAVIRES</span><strong style={{ color: RED }}>{remainingShips}</strong></div>
            <div className="ocean-mini-kpi"><span>FOCUS</span><strong style={{ color: state.focusNumber ? GOLD : SOFT }}>{state.focusNumber || "—"}</strong></div>
            <div className="ocean-mini-kpi"><span>VOLÉE</span><strong style={{ color: CYAN }}>{throwDarts.length}/3</strong></div>
          </div>
        </div>
        <div className="ocean-match-scoreline"><span>BO{config.winsNeeded * 2 - 1}</span><strong>{scoreLine}</strong><span>{oceanControlDifficultyLabel(config.difficulty)}</span></div>
      </section>

      <section className="ocean-grid-panel">
        <div className="ocean-grid-heading">
          <div>
            <strong>GRILLE ENNEMIE</strong>
            <span>{remainingCells} zones intactes · {targetDamagePercent}% détruit</span>
          </div>
          <button type="button" className="ocean-grid-help" onClick={() => setOverlay("intel")}>{latestSonar ? `SONAR ${latestSonar.contactCount}` : oceanControlVariantLabel(config.variant)}</button>
        </div>
        <div className="ocean-target-progress" aria-label={`${targetDamagePercent}% de la flotte ennemie détruite`}><span style={{ width: `${targetDamagePercent}%` }} /></div>
        <OceanGrid state={state} owner={targetOwner} onFocus={chooseFocus} sonarScan={latestSonar} recentCells={recentCells} />
        <ImpactFeedback feedback={impactFeedback} />
        <div className="ocean-floating-dock" aria-label="Informations de partie">
          <QuickButton icon="⚓" label="FLOTTE" value={`${oceanControlRemainingDecks(ownOwner)} navires`} color={GREEN} onClick={() => setOverlay("fleet")} />
          <QuickButton icon="🎯" label="CIBLES" value={`${state.owners.filter((owner) => owner.id !== ownOwner?.id && !owner.eliminated).length} ennemies`} color={RED} onClick={() => setOverlay("targets")} />
          <QuickButton icon="📡" label="SONAR" value={`${latestSonar?.contactCount ?? 0} contacts`} color={CYAN} onClick={() => setOverlay("intel")} />
          <QuickButton icon="📊" label="STATS" value={`${oceanControlAccuracy(activeStats)}% précision`} color={GOLD} onClick={() => setOverlay("stats")} />
          <QuickButton icon="📖" label="JOURNAL" value={`${state.visits.length} volées`} color="#a78bfa" onClick={() => setOverlay("log")} />
        </div>
      </section>

      <section className="ocean-fire-control-panel">
        {config.scoreInputMethod === "dartboard" ? <div className="ocean-dartboard-input">
          <div className="ocean-pad-statusline">
            <div className="ocean-pad-statusline__notice">{noticeSlot}</div>
            <div className="ocean-pad-preview-strip">{[0, 1, 2].map((index) => <span key={index} className="ocean-pad-preview-chip">{dartPreviewLabel(throwDarts[index])}</span>)}</div>
          </div>
          <DartboardClickable onHit={(segment, mult) => addDart(segment, mult)} multiplier={multiplier} size={Math.min(205, typeof window !== "undefined" ? window.innerWidth - 118 : 200)} disabled={botThinking} />
          <div className="ocean-pad-action-row">
            <button type="button" className={`ocean-pad-mode ${multiplier === 1 ? "is-active is-simple" : ""}`} onClick={() => setMultiplier(1)} disabled={botThinking}>SIMPLE</button>
            <button type="button" className={`ocean-pad-mode ${multiplier === 2 ? "is-active is-double" : ""}`} onClick={() => setMultiplier(2)} disabled={botThinking}>DOUBLE</button>
            <button type="button" className={`ocean-pad-mode ${multiplier === 3 ? "is-active is-triple" : ""}`} onClick={() => setMultiplier(3)} disabled={botThinking}>TRIPLE</button>
            <button type="button" className="ocean-pad-undo" onClick={cancelOrUndo} disabled={botThinking}>↶</button>
          </div>
          <div className="ocean-pad-footer-row">
            <button type="button" className={`ocean-pad-bull ${multiplier === 2 ? "is-dbull" : ""}`} onClick={() => addDart(25)} disabled={botThinking}>{multiplier === 2 ? "DBULL" : "BULL"}</button>
            <button type="button" className="ocean-pad-backspace" onClick={() => setThrowDarts((prev) => prev.slice(0, -1))} disabled={botThinking || !throwDarts.length}>⌫</button>
            <button onClick={() => commitVisit()} disabled={!throwDarts.length || botThinking} className="ocean-pad-validate">VALIDER</button>
          </div>
        </div> : <CompactDartPad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={() => commitVisit()} noticeSlot={noticeSlot} disabled={botThinking} />}
      </section>
    </main>

    {overlay === "fleet" ? <OverlayShell title="MA FLOTTE" subtitle={`${ownOwner?.name} · ${scoreLine}`} color={GREEN} onClose={() => setOverlay(null)}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 10 }}><Kpi label="NAVIRES ACTIFS" value={oceanControlRemainingDecks(ownOwner)} color={GREEN} /><Kpi label="ZONES INTACTES" value={oceanControlRemainingCells(ownOwner)} color={CYAN} /><Kpi label="MANCHES" value={state.scoreByOwner[ownOwner?.id || ""] || 0} color={GOLD} /></div><ShipStrip owner={ownOwner} reveal /><div style={{ marginTop: 10 }}><OceanGrid state={state} owner={ownOwner} own onFocus={() => {}} /></div></OverlayShell> : null}
    {overlay === "targets" ? <OverlayShell title="CHOISIR UNE FLOTTE ENNEMIE" subtitle="Change la cible de la prochaine volée" color={RED} onClose={() => setOverlay(null)}><div style={{ display: "grid", gap: 8 }}>{state.owners.filter((owner) => owner.id !== ownOwner?.id).map((owner) => { const total = owner.ships.reduce((sum, ship) => sum + ship.length, 0) || 1; const left = oceanControlRemainingCells(owner); const damage = Math.round(((total - left) / total) * 100); return <button key={owner.id} disabled={owner.eliminated} onClick={() => chooseTarget(owner.id)} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 11, borderRadius: 15, border: `1px solid ${state.targetOwnerId === owner.id ? RED : "rgba(255,255,255,.09)"}`, background: state.targetOwnerId === owner.id ? `${RED}14` : "rgba(255,255,255,.03)", color: owner.eliminated ? "rgba(255,255,255,.3)" : "#fff", textAlign: "left" }}><div><div style={{ fontWeight: 1100 }}>{owner.name}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{oceanControlRemainingDecks(owner)} navires · {left} zones · {damage}% détruit</div><div style={{ marginTop: 6, height: 5, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ width: `${damage}%`, height: "100%", background: `linear-gradient(90deg,${GOLD},${RED})` }} /></div></div><strong style={{ color: owner.eliminated ? RED : CYAN }}>{owner.eliminated ? "COULÉE" : state.targetOwnerId === owner.id ? "CIBLE" : "VISER"}</strong></button>; })}</div></OverlayShell> : null}
    {overlay === "intel" ? <OverlayShell title="CENTRE TACTIQUE" subtitle={`${targetOwner?.name || "Aucune cible"} · ${remainingCells} zones intactes`} color={CYAN} onClose={() => setOverlay(null)}>
      <div className="ocean-intel-mission"><span>🧭</span><div><strong>RECOMMANDATION DU COMMANDANT</strong><p>{oceanControlTacticalHint(state)}</p></div></div>
      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><Kpi label="DÉGÂTS" value={`${targetDamagePercent}%`} color={RED} detail={`${totalTargetCells - remainingCells}/${totalTargetCells} zones`} /><Kpi label="DERNIER SONAR" value={latestSonar ? latestSonar.contactCount : "—"} color={CYAN} detail={latestSonar ? `autour du ${latestSonar.focusNumber}` : "aucun balayage"} /><Kpi label="SÉRIE D’IMPACTS" value={activeStats.currentHitStreak || 0} color={GOLD} detail={`record ${activeStats.bestHitStreak || 0}`} /></div>
      <div className="ocean-intel-section"><strong>HISTORIQUE SONAR</strong>{sonarScansForTarget.length ? <div className="ocean-sonar-history">{sonarScansForTarget.map((scan) => <button key={scan.id} type="button" onClick={() => { setState((prev) => selectOceanControlFocus(prev, scan.focusNumber)); setOverlay(null); }} className={`ocean-sonar-card ${scan.contactCount ? "has-contact" : "is-clear"}`}><span>📡 {scan.focusNumber}</span><strong>{scan.contactCount}</strong><small>{scan.contactCount ? `contact${scan.contactCount > 1 ? "s" : ""}` : "zone claire"}</small></button>)}</div> : <div className="ocean-intel-empty">Aucun balayage enregistré sur cette flotte. Sélectionne une zone puis touche le Bull.</div>}</div>
      <div className="ocean-intel-section"><strong>ARSENAL TACTIQUE</strong><div className="ocean-weapon-grid"><div><b>S</b><span>1 zone</span></div><div><b>D</b><span>2 zones</span></div><div><b>T</b><span>ligne de 3</span></div><div><b>BULL</b><span>sonar</span></div><div><b>DB</b><span>frappe ciblée</span></div></div></div>
      {(state.battleHistory || []).length ? <div className="ocean-intel-section"><strong>MANCHES TERMINÉES</strong><div style={{ display: "grid", gap: 6 }}>{[...(state.battleHistory || [])].reverse().map((battle) => { const winner = state.owners.find((owner) => owner.id === battle.winnerOwnerId); return <div key={`${battle.battle}-${battle.finishedAt}`} className="ocean-battle-row"><span>B{battle.battle}</span><strong>{winner?.name || "Flotte"}</strong><small>{battle.hits} impacts · {battle.shipsSunk} navires · {battle.darts} fléchettes</small></div>; })}</div></div> : null}
    </OverlayShell> : null}
    {overlay === "stats" ? <OverlayShell title={`STATS · ${playerName(activeProfile).toUpperCase()}`} subtitle={oceanControlVariantLabel(config.variant)} color={GOLD} onClose={() => setOverlay(null)}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><Kpi label="PRÉCISION" value={`${oceanControlAccuracy(activeStats)}%`} color={GREEN} detail={`${activeStats.shipHits || 0}/${activeStats.validShots || 0} tirs`} /><Kpi label="NAVIRES COULÉS" value={activeStats.shipsSunk || 0} color={RED} /><Kpi label="SONARS" value={activeStats.sonarUses || 0} color={CYAN} detail={`${activeStats.sonarContacts || 0} contacts`} /><Kpi label="FRAPPES DBULL" value={activeStats.precisionStrikes || 0} color={GOLD} /><Kpi label="VOLÉES RÉUSSIES" value={activeStats.successfulVisits || 0} color={BLUE} /><Kpi label="VOLÉES PARFAITES" value={activeStats.perfectVisits || 0} color={GREEN} /><Kpi label="MEILLEURE SÉRIE" value={activeStats.bestHitStreak || 0} color={GOLD} detail={`${activeStats.bestVisitHits || 0} hits sur une volée`} /><Kpi label="MULTI-IMPACTS" value={activeStats.multiHitVisits || 0} color="#a78bfa" /><Kpi label="ZONES TOUCHÉES" value={activeStats.shipHits || 0} color={BLUE} /><Kpi label="À L’EAU" value={activeStats.waterShots || 0} color={SOFT} /><Kpi label="DOUBLONS" value={activeStats.duplicateShots || 0} color={RED} /><Kpi label="FLÉCHETTES" value={activeStats.darts || 0} color="#fff" /></div></OverlayShell> : null}
    {overlay === "log" ? <OverlayShell title="JOURNAL DE BORD" subtitle={`${state.visits.length} volée${state.visits.length > 1 ? "s" : ""}`} color={CYAN} onClose={() => setOverlay(null)}><div style={{ display: "grid", gap: 7 }}>{[...state.visits].reverse().map((visit) => <div key={visit.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 9.5 }}>{playerName(profilesById.get(String(visit.playerId)))} · B{visit.battle} · T{visit.round}</strong><strong style={{ color: BLUE }}>{visit.labels.join(" / ")}</strong></div><div style={{ marginTop: 5, color: "#cfd8e4", fontSize: 8.2, lineHeight: 1.4 }}>{visit.events.map((event) => event.label).join(" · ") || "Aucun impact"}</div></div>)}</div></OverlayShell> : null}

    {showEnd && state.phase === "finished" ? <OceanControlEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "ocean_control" }); }} onHistory={() => { try { onFinish?.(buildHistoryRecord("finished"), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}
