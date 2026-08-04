// @ts-nocheck
// =============================================================
// DARTS FOOTBALL — écran de jeu complet et compact
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
  buildFootballMatchStats,
  cloneFootballState,
  createFootballState,
  footballAccuracy,
  footballActionLabel,
  footballTacticalHint,
  footballVariantLabel,
  footballZoneLabel,
  getFootballAction,
  getFootballActivePlayer,
  getFootballActiveSide,
  getFootballPossessionSide,
  getFootballTargets,
  normalizeFootballConfig,
  pickFootballBotDarts,
  playFootballVisit,
  type FootballConfigPayload,
  type FootballState,
} from "../lib/gameEngines/footballEngine";
import { buildDartsTelemetry } from "../lib/dartsTelemetry";
import { History } from "../lib/history";
import tickerFootball from "../assets/tickers/ticker_football.png";
import FootballEnd from "./FootballEnd";

const GREEN = "#65e5aa", BLUE = "#35d0ff", RED = "#ff5b77", GOLD = "#ffd36b", SOFT = "#aeb8c9", WHITE = "#f7fbff";
const PLAYER_COLORS = [BLUE, RED, GREEN, GOLD, "#a78bfa", "#ff70c5", "#65e6d6", "#d7dde8"];
type UiDart = { v: number; mult: 1 | 2 | 3 };
type Overlay = null | "stats" | "log" | "teams";

function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function panel(accent = "rgba(255,255,255,.10)"): React.CSSProperties { return { borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: `1px solid ${accent}`, boxShadow: "0 14px 34px rgba(0,0,0,.28)", boxSizing: "border-box" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 36, borderRadius: 12, border: `1px solid ${color}66`, background: `${color}12`, color, fontSize: 8, fontWeight: 1100, cursor: "pointer" }; }
function uiToGameDart(dart: UiDart): GameDart { if (!dart || dart.v === 0) return { bed: "MISS" }; if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" }; return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart; }
function gameDartLabel(dart: GameDart) { if (!dart || dart.bed === "MISS") return "MISS"; if (dart.bed === "OB") return "BULL"; if (dart.bed === "IB") return "DBULL"; return `${dart.bed}${dart.number}`; }
function normalizeConfig(props: any): FootballConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const decoded = record?.decoded || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || decoded?.config || decoded?.payload?.config || record?.config || props?.config || props?.params || {};
  return normalizeFootballConfig(raw);
}
function buildHitsBySegment(visits: any[]) {
  const out: Record<string, number> = {};
  visits.forEach((visit) => (visit.darts || []).forEach((dart: GameDart) => { const label = gameDartLabel(dart); out[label] = Number(out[label] || 0) + 1; }));
  return out;
}

function Rules({ config }: { config: FootballConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.46 }}>
    <div><strong style={{ color: GREEN }}>{footballVariantLabel(config.variant).toUpperCase()}</strong><br />Chaque camp joue à tour de rôle. Le rôle affiché dépend de la possession et de la position du ballon.</div>
    <div><strong style={{ color: BLUE }}>ATTAQUE</strong><br />Touche une cible proposée. S = +1 zone, D = +2, T = +3. BULL et DBULL déclenchent une longue passe.</div>
    <div><strong style={{ color: RED }}>DÉFENSE</strong><br />S repousse le ballon. D intercepte. T intercepte et lance immédiatement une contre-attaque.</div>
    <div><strong style={{ color: GOLD }}>TIR / GARDIEN</strong><br />Dans la surface, T ou DBULL marque directement. Sur un tir cadré moins puissant, le gardien reçoit une volée de parade.</div>
    <div><strong style={{ color: GREEN }}>ANNULER</strong><br />ANNULER efface la volée en cours. Quand elle est vide, le bouton restaure la dernière volée validée.</div>
  </div>;
}

function FootballField({ state }: { state: FootballState }) {
  const ballLeft = `${Math.max(4, Math.min(96, (state.ballPosition / 6) * 100))}%`;
  const possession = getFootballPossessionSide(state);
  return <div style={{ ...panel(`${GREEN}55`), position: "relative", minHeight: 154, overflow: "hidden", background: "linear-gradient(90deg,rgba(23,115,58,.74),rgba(19,94,50,.80) 50%,rgba(23,115,58,.74)), repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 12.5%,rgba(0,0,0,.025) 12.5% 25%)" }}>
    <div style={{ position: "absolute", inset: 8, border: "2px solid rgba(255,255,255,.60)", borderRadius: 10 }} />
    <div style={{ position: "absolute", left: "50%", top: 8, bottom: 8, width: 1, background: "rgba(255,255,255,.58)" }} />
    <div style={{ position: "absolute", left: "50%", top: "50%", width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(255,255,255,.58)", transform: "translate(-50%,-50%)" }} />
    <div style={{ position: "absolute", left: 8, top: "27%", width: "14%", height: "46%", border: "1px solid rgba(255,255,255,.55)", borderLeft: 0 }} />
    <div style={{ position: "absolute", right: 8, top: "27%", width: "14%", height: "46%", border: "1px solid rgba(255,255,255,.55)", borderRight: 0 }} />
    <div style={{ position: "absolute", left: 0, top: "37%", width: 9, height: "26%", border: `2px solid ${BLUE}`, borderLeft: 0, borderRadius: "0 5px 5px 0" }} />
    <div style={{ position: "absolute", right: 0, top: "37%", width: 9, height: "26%", border: `2px solid ${RED}`, borderRight: 0, borderRadius: "5px 0 0 5px" }} />
    <div style={{ position: "absolute", left: 12, top: 11, color: BLUE, fontSize: 8, fontWeight: 1100, maxWidth: "37%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.sides[0]?.name}</div>
    <div style={{ position: "absolute", right: 12, top: 11, color: RED, fontSize: 8, fontWeight: 1100, maxWidth: "37%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{state.sides[1]?.name}</div>
    <div style={{ position: "absolute", left: ballLeft, top: "54%", transform: "translate(-50%,-50%)", transition: "left .35s ease", zIndex: 5 }}>
      <div style={{ width: 29, height: 29, borderRadius: "50%", display: "grid", placeItems: "center", background: "#fff", color: "#111", fontSize: 19, boxShadow: `0 0 0 4px ${possession?.color || GREEN}55,0 8px 18px rgba(0,0,0,.55)` }}>⚽</div>
    </div>
    <div style={{ position: "absolute", left: "50%", bottom: 11, transform: "translateX(-50%)", borderRadius: 999, padding: "5px 9px", background: "rgba(0,0,0,.58)", border: `1px solid ${possession?.color || GREEN}77`, color: possession?.color || GREEN, fontSize: 7.5, fontWeight: 1100, whiteSpace: "nowrap" }}>POSSESSION · {possession?.name} · {footballZoneLabel(state.ballPosition)}</div>
  </div>;
}

function TargetStrip({ state }: { state: FootballState }) {
  const action = getFootballAction(state);
  const targets = getFootballTargets(state, action);
  const color = action === "defense" ? RED : action === "goalkeeper" ? GOLD : action === "shot" || action === "penalty" || action === "classic_shot" ? GOLD : GREEN;
  const special = action === "classic_possession" ? ["BULL", "DBULL"] : action === "classic_shot" ? ["TOUT DOUBLE", "DBULL"] : [];
  return <div style={{ ...panel(`${color}55`), padding: 9 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><strong style={{ color, fontSize: 10.5, letterSpacing: .8 }}>{footballActionLabel(action)}</strong><span style={{ color: SOFT, fontSize: 7.5 }}>{state.stage === "penalties" ? `TIR ${Math.floor(state.turnCount / 2) + 1}` : `P${state.period} · T${state.roundInPeriod}`}</span></div>
    <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap" }}>{special.length ? special.map((label) => <span key={label} style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${color}88`, background: `${color}18`, color, fontSize: 9, fontWeight: 1150 }}>{label}</span>) : targets.map((target) => <span key={target} style={{ minWidth: 31, textAlign: "center", borderRadius: 999, padding: "6px 8px", border: `1px solid ${color}88`, background: `${color}18`, color, fontSize: 10, fontWeight: 1150 }}>{target}</span>)}</div>
  </div>;
}

function OverlayShell({ title, subtitle, color, onClose, children }: any) {
  React.useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, []);
  return <div role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 9998, display: "grid", placeItems: "center", padding: 10, background: "rgba(0,0,0,.78)", backdropFilter: "blur(7px)" }}>
    <div style={{ width: "min(620px,100%)", maxHeight: "88dvh", overflowY: "auto", borderRadius: 22, padding: 13, border: `1px solid ${color}77`, background: "linear-gradient(180deg,#101713,#050806)", boxShadow: `0 0 45px ${color}22` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}><div><div style={{ color, fontSize: 12, fontWeight: 1150, letterSpacing: 1 }}>{title}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{subtitle}</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${color}66`, background: `${color}12`, color, fontWeight: 1100 }}>✕</button></div>
      {children}
    </div>
  </div>;
}
function Kpi({ label, value, detail, color = GREEN }: any) { return <div style={{ borderRadius: 14, padding: 10, border: `1px solid ${color}44`, background: `${color}0c` }}><div style={{ color: SOFT, fontSize: 7, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 19, fontWeight: 1150 }}>{value}</div>{detail ? <div style={{ marginTop: 2, color: SOFT, fontSize: 7 }}>{detail}</div> : null}</div>; }

export default function FootballPlay(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const onFinish = props?.onFinish;
  const config = React.useMemo(() => normalizeConfig(props), []);
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length >= 2 ? ordered : [{ id: "p1", name: "Joueur 1" }, { id: "p2", name: "Joueur 2" }];
  }, [store, config]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => {
    const decoded = resumeRecord?.decoded || null;
    const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.stateSnapshot || decoded?.stateSnapshot || decoded?.payload?.stateSnapshot || null;
    return snapshot?.mode === "football" ? cloneFootballState(snapshot) : createFootballState(players, config);
  }, []);
  const [state, setState] = React.useState<FootballState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<FootballState[]>([]);
  const [notice, setNotice] = React.useState(footballTacticalHint(initialState));
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [showEnd, setShowEnd] = React.useState(initialState.phase === "finished");
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `football-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const activePlayer = getFootballActivePlayer(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeSide = getFootballActiveSide(state);
  const activeStats = state.statsByPlayer[String(activePlayer?.id || "")] || {};
  const actionNow = getFootballAction(state);
  const score0 = Number(state.scoreBySide[state.sides[0]?.id] || 0), score1 = Number(state.scoreBySide[state.sides[1]?.id] || 0);
  const lastVisit = state.visits[state.visits.length - 1];

  function backToConfig() { if (typeof go === "function") go("football_config", { config }); }
  function addDart(v: number, mult?: 1 | 2 | 3) { if (botThinking || state.phase === "finished" || throwDarts.length >= 3) return; setThrowDarts((previous) => [...previous, { v: Number(v) || 0, mult: (mult || multiplier) as any }].slice(0, 3)); }
  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, 3);
    if (!darts.length || state.phase === "finished") return;
    setUndoStack((previous) => [...previous.slice(-39), cloneFootballState(state)]);
    const next = playFootballVisit(state, darts.map(uiToGameDart));
    setState(next); setThrowDarts([]); setMultiplier(1);
    const visit = next.visits[next.visits.length - 1];
    setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || footballTacticalHint(next));
    if (next.phase === "finished") setShowEnd(true);
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice("Volée effacée."); return; }
    const previous = undoStack[undoStack.length - 1];
    if (!previous) { setNotice("Aucune volée à annuler."); return; }
    setState(previous); setUndoStack((stack) => stack.slice(0, -1)); setShowEnd(false); autoSavedRef.current = ""; setNotice("Dernière volée annulée.");
  }
  function resetMatch() {
    matchIdRef.current = `football-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = createFootballState(players, config);
    setState(next); setThrowDarts([]); setUndoStack([]); setOverlay(null); setShowEnd(false); setNotice(footballTacticalHint(next)); autoSavedRef.current = "";
  }

  React.useEffect(() => {
    if (state.phase === "finished" || !activePlayer || !isBot(activeProfile, botIds) || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const gameDarts = pickFootballBotDarts(state, config.botLevel);
      setUndoStack((previous) => [...previous.slice(-39), cloneFootballState(state)]);
      const next = playFootballVisit(state, gameDarts);
      setState(next); setThrowDarts([]); setMultiplier(1); setBotThinking(false);
      const visit = next.visits[next.visits.length - 1];
      setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || "Volée BOT validée.");
      if (next.phase === "finished") setShowEnd(true);
    }, 650);
    return () => { window.clearTimeout(timer); setBotThinking(false); };
  }, [state.activeSideIndex, state.turnCount, state.phase, state.pendingShot?.target]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished";
    const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player: any, index: number) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.statsByPlayer[player.id] || {};
      const sideIndex = state.sideByPlayer[player.id] ?? 0;
      const side = state.sides[sideIndex];
      const visits = state.visits.filter((visit: any) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit: any) => visit.darts.map((dart: any, dartIndex: number) => ({ ...dart, label: visit.labels[dartIndex], period: visit.period, round: visit.round, turn: visit.turn, action: visit.action, targets: visit.targets, events: visit.events, dartIndex: dartIndex + 1 })));
      const won = finished && state.winnerPlayerIds.includes(player.id);
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        color: side?.color || PLAYER_COLORS[index % PLAYER_COLORS.length], sideId: side?.id, sideName: side?.name,
        rank: won ? 1 : state.draw ? 1 : 2, win: won, winner: won, ...stats,
        accuracy: footballAccuracy(stats), visitsHistory: visits, visitHistory: visits, dartsDetail,
        hitsBySegment: buildHitsBySegment(visits), score: Number(state.scoreBySide[side?.id] || 0),
      };
    });
    const matchStats = buildFootballMatchStats(state);
    const winnerSides = state.sides.filter((side) => state.winnerSideIds.includes(side.id));
    const summary: any = {
      kind: "football", mode: "football", sport: "darts", variant: config.variant,
      variantLabel: footballVariantLabel(config.variant), finished, draw: state.draw,
      statisticsVersion: 2, telemetryVersion: 1,
      winnerId: finished ? state.winnerPlayerIds[0] || null : null,
      winnerIds: finished ? state.winnerPlayerIds : [], winnerSideIds: finished ? state.winnerSideIds : [],
      winnerName: finished ? (state.draw ? "Match nul" : winnerSides.map((side) => side.name).join(" / ")) : null,
      players: playerRows, perPlayer: playerRows, rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [],
      visits: state.visits, matchStats, config, scoreBySide: state.scoreBySide,
      scoreLine: `${state.sides[0]?.name} ${score0} - ${score1} ${state.sides[1]?.name}`,
      game: { mode: "football", variant: config.variant, halfRounds: config.halfRounds, tieBreaker: config.tieBreaker },
    };
    const record: any = {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "football", mode: "football", sport: "darts", status,
      statisticsVersion: 2, telemetryVersion: 1, createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now,
      ...(finished ? { finishedAt: now, endedAt: now } : {}), winnerId: summary.winnerId, winnerIds: summary.winnerIds,
      winnerName: summary.winnerName, players: playerRows, resumeId: matchIdRef.current,
      resume: { config, state: cloneFootballState(state), updatedAt: now }, game: summary.game, summary,
      payload: { kind: "football", mode: "football", sport: "darts", variant: config.variant, statisticsVersion: 2, telemetryVersion: 1, config, players: playerRows, summary, visits: state.visits, visitHistory: state.visits, events: state.visits, stateSnapshot: cloneFootballState(state), stats: { sport: "darts", mode: "football", variant: config.variant, players: playerRows, match: matchStats, global: matchStats } },
    };
    const telemetry = buildDartsTelemetry(record, record.payload);
    if (telemetry) {
      record.payload.telemetry = telemetry; record.payload.dartTelemetry = telemetry;
      record.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      record.summary.telemetryExact = true; record.summary.telemetryCoverage = "full";
    }
    return record;
  }

  React.useEffect(() => {
    if (state.phase === "finished" || state.visits.length === 0) return;
    const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 260);
    return () => window.clearTimeout(timer);
  }, [state]);
  React.useEffect(() => {
    if (state.phase !== "finished") return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord("finished"), { navigate: false }); }
    catch { void (History as any).upsert(buildHistoryRecord("finished")); }
  }, [state.phase]);

  const noticeSlot = notice ? <div style={{ maxWidth: 185, color: notice.includes("BUT") ? GOLD : SOFT, fontSize: 7.2, fontWeight: 900, lineHeight: 1.25, textAlign: "center", whiteSpace: "normal" }}>{notice}</div> : null;
  const centerScore = <div style={{ textAlign: "center" }}><div style={{ color: activeSide?.color || GREEN, fontSize: 14, fontWeight: 1200 }}>{throwDarts.length}/3</div><div style={{ color: SOFT, fontSize: 6.5 }}>{footballActionLabel(actionNow)}</div></div>;

  return <div style={{ minHeight: "100dvh", color: theme?.text || WHITE, background: "radial-gradient(circle at 50% -12%,rgba(101,229,170,.18),#07110d 43%,#020604 100%)" }}>
    <PageHeader tickerSrc={tickerFootball} tickerAlt="DARTS FOOTBALL" left={<BackDot onClick={backToConfig} color={GREEN} glow={`${GREEN}88`} />} right={<InfoDot title="Règles DARTS FOOTBALL" color={BLUE} glow={`${BLUE}88`} content={<Rules config={config} />} />} />
    <main style={{ width: "min(760px,100%)", margin: "0 auto", padding: "6px 8px max(10px,env(safe-area-inset-bottom))", boxSizing: "border-box", display: "grid", gap: 7 }}>
      <section style={{ ...panel("rgba(255,255,255,.10)"), padding: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 8, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}><div style={{ color: BLUE, fontSize: 8, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[0]?.name}</div><div style={{ color: WHITE, fontSize: 25, fontWeight: 1200 }}>{score0}</div></div>
        <div style={{ textAlign: "center" }}><div style={{ color: GREEN, fontSize: 8, fontWeight: 1100, letterSpacing: 1 }}>PÉRIODE {state.period}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 7 }}>{footballVariantLabel(config.variant)} · TOUR {state.roundInPeriod}</div></div>
        <div style={{ minWidth: 0, textAlign: "right" }}><div style={{ color: RED, fontSize: 8, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[1]?.name}</div><div style={{ color: WHITE, fontSize: 25, fontWeight: 1200 }}>{score1}</div></div>
      </section>

      <FootballField state={state} />

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,.95fr)", gap: 7 }}>
        <div style={{ ...panel(`${activeSide?.color || GREEN}55`), padding: 9, display: "grid", gridTemplateColumns: "48px minmax(0,1fr)", gap: 9, alignItems: "center" }}>
          <ProfileAvatar profile={activeProfile} size={46} />
          <div style={{ minWidth: 0 }}><div style={{ color: activeSide?.color || GREEN, fontSize: 7.5, fontWeight: 1100 }}>{botThinking ? "BOT EN RÉFLEXION" : "JOUEUR ACTIF"} · {activeSide?.name}</div><div style={{ marginTop: 3, color: WHITE, fontSize: 13, fontWeight: 1150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(activeProfile)}</div><div style={{ marginTop: 4, color: SOFT, fontSize: 7.5 }}>{activeStats.goals || 0} but · {activeStats.shotsOnTarget || 0} tir cadré · {activeStats.interceptions || 0} interception</div></div>
        </div>
        <TargetStrip state={state} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
        <button onClick={() => setOverlay("teams")} style={actionButton(BLUE)}>⚽ MATCH</button>
        <button onClick={() => setOverlay("stats")} style={actionButton(GREEN)}>📊 STATS</button>
        <button onClick={() => setOverlay("log")} style={actionButton(GOLD)}>🕘 ACTIONS</button>
      </section>

      <section style={{ minWidth: 0 }}>
        {config.scoreInputMethod === "dartboard" ? <div style={{ ...panel("rgba(255,255,255,.09)"), padding: 7, display: "grid", justifyItems: "center", gap: 6 }}><DartboardClickable onHit={(segment, mult) => addDart(segment, mult)} multiplier={multiplier} size={Math.min(310, typeof window !== "undefined" ? window.innerWidth - 34 : 300)} disabled={botThinking || state.phase === "finished" || throwDarts.length >= 3} /><div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr .8fr 1fr", gap: 7 }}><button type="button" onClick={cancelOrUndo} style={actionButton(RED)}>↶ ANNULER</button><div style={{ display: "grid", placeItems: "center" }}>{centerScore}</div><button type="button" disabled={!throwDarts.length} onClick={() => commitVisit()} style={{ ...actionButton(GOLD), minHeight: 42, color: "#171008", background: "linear-gradient(180deg,#ffc63a,#ffad00)" }}>VALIDER</button></div></div> : <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((previous) => previous.slice(0, -1))} onNumber={(number) => addDart(number)} onBull={() => addDart(25)} onValidate={() => commitVisit()} hidePreview={false} hideTotal centerSlot={centerScore} noticeSlot={noticeSlot} validateAttention={throwDarts.length > 0} safeBottomPad={false} />}
      </section>
    </main>

    {overlay === "stats" ? <OverlayShell title={`STATS · ${playerName(activeProfile).toUpperCase()}`} subtitle={footballActionLabel(actionNow)} color={GREEN} onClose={() => setOverlay(null)}><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><Kpi label="PRÉCISION ACTIONS" value={`${footballAccuracy(activeStats)}%`} color={GREEN} /><Kpi label="BUTS" value={activeStats.goals || 0} color={GOLD} /><Kpi label="TIRS CADRÉS" value={activeStats.shotsOnTarget || 0} color={BLUE} /><Kpi label="ARRÊTS" value={activeStats.saves || 0} color={GOLD} /><Kpi label="INTERCEPTIONS" value={activeStats.interceptions || 0} color={RED} /><Kpi label="TACLES" value={activeStats.tackles || 0} color={RED} /><Kpi label="PROGRESSION" value={activeStats.advances || 0} color={GREEN} detail={`meilleure +${activeStats.bestProgress || 0}`} /><Kpi label="FLÉCHETTES" value={activeStats.darts || 0} color={WHITE} /></div></OverlayShell> : null}
    {overlay === "teams" ? <OverlayShell title="FEUILLE DE MATCH" subtitle={`${footballVariantLabel(config.variant)} · ${state.visits.length} volées`} color={BLUE} onClose={() => setOverlay(null)}><div style={{ display: "grid", gap: 9 }}>{state.sides.map((side: any, sideIndex: number) => <div key={side.id} style={{ borderRadius: 16, padding: 10, border: `1px solid ${side.color}55`, background: `${side.color}0d` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: side.color }}>{side.name}</strong><strong style={{ color: WHITE, fontSize: 18 }}>{state.scoreBySide[side.id] || 0}</strong></div><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{side.playerIds.map((id: string) => { const profile = profilesById.get(id); const stats = state.statsByPlayer[id] || {}; return <div key={id} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: 7, alignItems: "center" }}><ProfileAvatar profile={profile} size={30} /><span style={{ color: WHITE, fontSize: 9, fontWeight: 1000 }}>{playerName(profile)}</span><span style={{ color: SOFT, fontSize: 8 }}>{stats.goals || 0}B · {stats.interceptions || 0}INT</span></div>; })}</div></div>)}</div></OverlayShell> : null}
    {overlay === "log" ? <OverlayShell title="FIL DU MATCH" subtitle={`${state.visits.length} action${state.visits.length > 1 ? "s" : ""}`} color={GOLD} onClose={() => setOverlay(null)}><div style={{ display: "grid", gap: 7 }}>{[...state.visits].reverse().map((visit: any) => <div key={visit.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: state.sides.find((side) => side.id === visit.sideId)?.color || WHITE, fontSize: 9 }}>{playerName(profilesById.get(String(visit.playerId)))} · P{visit.period} T{visit.round}</strong><strong style={{ color: GOLD, fontSize: 8 }}>{footballActionLabel(visit.action)}</strong></div><div style={{ marginTop: 4, color: SOFT, fontSize: 7.5 }}>{visit.labels.join(" / ")}</div><div style={{ marginTop: 4, color: WHITE, fontSize: 8.2, lineHeight: 1.4 }}>{visit.events.map((event: any) => event.label).join(" · ") || "Aucun événement"}</div></div>)}</div></OverlayShell> : null}

    {showEnd && state.phase === "finished" ? <FootballEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialStatsSubTab: "football", initialPlayerId: focusId, playerId: focusId }); }} onHistory={() => { try { onFinish?.(buildHistoryRecord("finished"), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}
