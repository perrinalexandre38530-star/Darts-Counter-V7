// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — écran PLAY complet
// Carte Territories, bots, undo, fin de partie, historique et stats.
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
import { buildTerritoriesMap } from "../territories/map";
import type { TerritoriesCountry } from "../territories/types";
import TerritoriesMapView from "../territories/TerritoriesMapView";
import {
  FIRE_STATUS_OWNER_COLORS,
  activeIncidents,
  buildFireMapForView,
  cloneDartsFirefighterState,
  createDartsFirefighterState,
  dartLabel,
  difficultyLabel,
  finishReasonLabel,
  fireStatus,
  fireTerritoryColor,
  getActivePlayer,
  playDartsFirefighterVisit,
  normalizeDartsFirefighterConfig,
  protectedCount,
  selectFireTerritory,
  totalFire,
  type DartsFirefighterConfigPayload,
  type DartsFirefighterState,
  type FireTerritory,
} from "../lib/gameEngines/dartsFirefighterEngine";
import { pushDartsFirefighterStats } from "../lib/dartsFirefighterStats";
import { History } from "../lib/history";
import tickerFirefighter from "../assets/tickers/ticker_darts_firefighter.png";
import DartsFirefighterEnd from "./DartsFirefighterEnd";

type UiDart = { v: number; mult: 1 | 2 | 3 };

const FIRE = "#ff5a25";
const WATER = "#25c9ff";
const GOLD = "#ffd76a";
const RED = "#ff4c55";
const GREEN = "#5ce6a8";
const PLAYER_COLORS = ["#25c9ff", "#ffbf45", "#ff6aa9", "#8d7dff", "#62e9aa", "#ff8a5b", "#d4d8e5", "#66a7ff"];

function toCountry(mapId: string): TerritoriesCountry {
  const id = String(mapId || "FR").toUpperCase();
  if (id === "EN") return "UK";
  const supported = new Set(["FR","AF","AR","ASIA","AT","BE","BR","CA","HR","CZ","DK","EG","EU","FI","GR","IS","IN","MX","NL","NA","NO","PL","SA","SAM","KR","SE","CH","UA","UN","IT","DE","ES","US","CN","AU","JP","RU","WORLD","UK"]);
  return (supported.has(id) ? id : "FR") as TerritoriesCountry;
}
function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Pompier"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 10, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.27))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 44, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}16`, color, fontWeight: 1050, cursor: "pointer" }; }
function uiToGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function uiLabel(dart?: UiDart) {
  if (!dart) return "—";
  return dartLabel(uiToGameDart(dart));
}
function statusLabel(t: FireTerritory) {
  if (t.destroyed) return "DÉTRUIT";
  if (t.fireLevel > 0) return `FEU N${t.fireLevel}`;
  if (t.smoke) return "FUMÉE";
  if (t.protection > 0) return `PROTÉGÉ ${t.protection}`;
  return "SAIN";
}
function statusIcon(t: FireTerritory) {
  if (t.destroyed) return "⬛";
  if (t.fireLevel === 3) return "🔥🔥🔥";
  if (t.fireLevel === 2) return "🔥🔥";
  if (t.fireLevel === 1) return "🔥";
  if (t.smoke) return "💨";
  if (t.protection > 0) return "💧";
  return "✓";
}
function normalizeConfig(props: any): DartsFirefighterConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || props?.config || props?.params || {};
  return normalizeDartsFirefighterConfig(raw);
}

function Rules({ config }: { config: DartsFirefighterConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: FIRE }}>OBJECTIF</strong><br />{config.objective === "survival" ? `Résiste pendant ${config.maxRounds} rounds.` : config.objective === "protect_critical" ? `Protège les zones critiques pendant ${config.maxRounds} rounds.` : "Éteins tous les foyers avant la limite."}</div>
    <div><strong style={{ color: WATER }}>PUISSANCE</strong><br />Simple 1 · Double 2 · Triple 3. Le surplus crée une protection qui absorbe une future propagation.</div>
    <div><strong style={{ color: GOLD }}>CIBLES</strong><br />Chaque territoire actif porte un numéro de secteur. Une touche agit automatiquement sur le territoire correspondant.</div>
    <div><strong style={{ color: WATER }}>BULL</strong><br />{`Bull = ${config.bullPower || 2} unités sur ${config.bullTargetMode === "priority" ? "la priorité automatique" : "la zone sélectionnée"}. ${config.bullAirSupport ? "Le Double Bull appelle le Canadair." : "Canadair désactivé."}`}</div>
    <div><strong style={{ color: FIRE }}>VENT</strong><br />{config.windEnabled ? `Vent ${config.windStrength || "normal"}, changement tous les ${config.windChangeEvery || 3} cycles.` : "Vent désactivé."}</div>
  </div>;
}

function buildBotVisit(state: DartsFirefighterState, level: string): { darts: UiDart[]; selectedId: string | null } {
  const targets = [...state.territories].filter((t) => t.playable && !t.destroyed)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || b.fireLevel - a.fireLevel || Number(b.smoke) - Number(a.smoke) || a.protection - b.protection);
  const target = targets[0] || null;
  const missChance = level === "hard" ? .04 : level === "easy" ? .25 : .11;
  const bullChance = level === "hard" ? .18 : level === "easy" ? .04 : .10;
  const darts: UiDart[] = [];
  const dartsPerTurn = Math.max(1, Math.min(3, Number(state.config.dartsPerTurn || 3)));
  for (let i = 0; i < dartsPerTurn; i += 1) {
    const r = Math.random();
    if (r < missChance) darts.push({ v: 0, mult: 1 });
    else if (r < missChance + bullChance) darts.push({ v: 25, mult: level === "hard" && Math.random() > .48 ? 2 : 1 });
    else {
      const multiplier = level === "hard" ? (Math.random() < .55 ? 3 : 2) : level === "easy" ? (Math.random() < .78 ? 1 : 2) : (Math.random() < .34 ? 3 : Math.random() < .55 ? 2 : 1);
      darts.push({ v: target?.target || (1 + Math.floor(Math.random() * 20)), mult: multiplier as any });
    }
  }
  return { darts, selectedId: target?.id || null };
}

export default function DartsFirefighterPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || WATER;
  const text = theme?.text || "#f7f8fb";
  const soft = theme?.textSoft || "#a6adbd";
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => {
      const id = String(profile?.id || profile?.profileId || "");
      if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) });
    });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Pompier ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null, dartSetId: config.playerDartSets?.[String(profile.id)] ?? profile?.dartSetId ?? null, isBot: isBot(profile, botIds) })), [profiles, botIds]);
  const profilesById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const rawMap = React.useMemo(() => buildTerritoriesMap(toCountry(config.mapId)), [config.mapId]);
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const resumeState = resumeRecord?.payload?.stateSnapshot || resumeRecord?.resume?.state || resumeRecord?.payload?.resume?.state || null;
  const initialState = React.useMemo(() => {
    if (resumeState && typeof resumeState === "object" && Array.isArray(resumeState.territories) && Array.isArray(resumeState.players)) {
      try { return cloneDartsFirefighterState({ ...resumeState, config: { ...config, ...(resumeState.config || {}) }, finished: false, finishedAt: null }); } catch {}
    }
    return createDartsFirefighterState(players, config, rawMap);
  }, [rawMap]);

  const [state, setState] = React.useState<DartsFirefighterState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<DartsFirefighterState[]>([]);
  const [notice, setNotice] = React.useState("Sélectionne une zone pour préparer un Bull ou un Canadair.");
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTargets, setShowTargets] = React.useState(false);
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `darts-firefighter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  const activePlayer = getActivePlayer(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeColor = PLAYER_COLORS[state.activePlayerIndex % PLAYER_COLORS.length];
  const selectedTerritory = state.territories.find((t) => t.id === state.selectedTerritoryId) || null;
  const fireMap = React.useMemo(() => buildFireMapForView(state), [state]);
  const incidents = activeIncidents(state);
  const fireLoad = totalFire(state);
  const protections = protectedCount(state);
  const latestVisit = state.history[state.history.length - 1];
  const currentStats = state.playerStats[activePlayer?.id] || {};
  const projectedLabels = throwDarts.map(uiLabel);
  const forecastTerritories = config.forecastEnabled
    ? state.forecastTerritoryIds.map((id) => state.territories.find((territory) => territory.id === id)).filter(Boolean)
    : [];

  function backToConfig() {
    if (typeof go === "function") go("darts_firefighter_config", config);
  }
  function selectTerritory(id: string) {
    if (state.finished) return;
    setState((prev) => selectFireTerritory(prev, id));
    const t = state.territories.find((zone) => zone.id === id);
    if (t) setNotice(`${t.name} · secteur ${t.target} · ${statusLabel(t)}`);
  }
  function addDart(v: number, mult?: 1 | 2 | 3) {
    if (botThinking || state.finished || throwDarts.length >= Number(config.dartsPerTurn || 3)) return;
    const dart = { v: Number(v) || 0, mult: (mult || multiplier) as 1 | 2 | 3 };
    const next = [...throwDarts, dart].slice(0, Number(config.dartsPerTurn || 3));
    setThrowDarts(next);
    if (dart.v === 0 && config.missEndsTurn) window.setTimeout(() => commitVisit(next), 0);
  }
  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, Number(config.dartsPerTurn || 3));
    if (!darts.length || state.finished) return;
    setUndoStack((prev) => [...prev.slice(-19), cloneDartsFirefighterState(state)]);
    const next = playDartsFirefighterVisit(state, darts.map(uiToGameDart));
    setState(next);
    setThrowDarts([]);
    setMultiplier(1);
    const visit = next.history[next.history.length - 1];
    const important = [...(visit?.events || [])].reverse().find((event: any) => ["extinguished","destroyed","spread_blocked","canadair","spread"].includes(event.type));
    setNotice(important?.label || `Volée validée · ${visit?.score >= 0 ? "+" : ""}${visit?.score || 0} pts`);
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice("Volée effacée."); return; }
    const previous = undoStack[undoStack.length - 1];
    if (!previous) { setNotice("Aucune action à annuler."); return; }
    setState(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    setShowEnd(false);
    autoSavedRef.current = "";
    setNotice("Dernière volée annulée.");
  }
  function resetMatch() {
    matchIdRef.current = `darts-firefighter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    autoSavedRef.current = "";
    setState(createDartsFirefighterState(players, config, rawMap));
    setThrowDarts([]);
    setUndoStack([]);
    setShowEnd(false);
    setNotice("Nouvelle intervention engagée.");
  }

  React.useEffect(() => {
    if (!activePlayer || !isBot(activeProfile, botIds) || state.finished || botThinking || throwDarts.length) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const plan = buildBotVisit(state, config.botLevel || "normal");
      let prepared = state;
      if (plan.selectedId) prepared = selectFireTerritory(prepared, plan.selectedId);
      setUndoStack((prev) => [...prev.slice(-19), cloneDartsFirefighterState(state)]);
      const next = playDartsFirefighterVisit(prepared, plan.darts.map(uiToGameDart));
      setState(next);
      const visit = next.history[next.history.length - 1];
      setNotice(`BOT ${activePlayer.name} · ${visit?.labels?.join(" / ")} · ${visit?.score >= 0 ? "+" : ""}${visit?.score || 0}`);
      setBotThinking(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.turnIndex, state.finished, activePlayer?.id]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const recordStatus = statusOverride || (state.finished ? "finished" : "in_progress");
    const isFinished = recordStatus === "finished";
    const now = isFinished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player, index) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.playerStats[player.id] || {};
      const visits = state.history.filter((visit) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit) => visit.darts.map((dart: GameDart, dartIndex: number) => ({ ...dart, label: visit.labels[dartIndex], visitId: visit.id, round: visit.round, dartIndex: dartIndex + 1 })));
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        win: isFinished && state.won, winner: isFinished && state.won, rank: index + 1,
        ...stats,
        accuracy: pct(stats.hits, stats.darts),
        visitsHistory: visits, visitHistory: visits, dartsDetail, hitsBySegment: { ...(stats.hitsBySegment || {}) },
      };
    });
    [...playerRows].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).forEach((row, index) => { row.rank = index + 1; });
    const totalDarts = playerRows.reduce((sum, row) => sum + Number(row.darts || 0), 0);
    const totalHits = playerRows.reduce((sum, row) => sum + Number(row.hits || 0), 0);
    const totalScore = Number(state.score || 0);
    const canadairs = state.history.flatMap((visit) => visit.events || []).filter((event) => event.type === "canadair").length;
    const matchStats = {
      statisticsVersion: 1, telemetryVersion: 1,
      score: totalScore,
      durationMs: Math.max(0, now - state.startedAt),
      totalDarts, totalHits, accuracy: pct(totalHits, totalDarts),
      totalVisits: state.history.length,
      totalFireReduced: playerRows.reduce((sum, row) => sum + Number(row.fireReduced || 0), 0),
      totalExtinguished: state.totalExtinguished,
      totalDestroyed: state.totalDestroyed,
      totalSpread: state.totalSpread,
      propagationBlocked: state.propagationBlocked,
      protectionsPlaced: playerRows.reduce((sum, row) => sum + Number(row.protectionsPlaced || 0), 0),
      waterApplied: playerRows.reduce((sum, row) => sum + Number(row.waterApplied || 0), 0),
      canadairs,
      bulls: playerRows.reduce((sum, row) => sum + Number(row.bulls || 0), 0),
      dbulls: playerRows.reduce((sum, row) => sum + Number(row.dbulls || 0), 0),
      misses: playerRows.reduce((sum, row) => sum + Number(row.misses || 0), 0),
      perfectVisits: playerRows.reduce((sum, row) => sum + Number(row.perfectVisits || 0), 0),
      bestVisitScore: Math.max(0, ...playerRows.map((row) => Number(row.bestVisitScore || 0))),
      roundsPlayed: Math.max(1, state.roundIndex || 1),
      activeTerritories: config.activeTerritories,
      objective: config.objective,
      missionPreset: config.missionPreset,
      dartsPerTurn: config.dartsPerTurn,
      propagationTiming: config.propagationTiming,
      windStrength: config.windStrength,
      destructionLimit: config.destructionLimit,
      incidentsRemaining: activeIncidents(state),
      protectedTerritories: protectedCount(state),
    };
    const finalTerritories = state.territories.filter((t) => t.playable).map((t) => ({ id: t.id, name: t.name, target: t.target, critical: t.critical, fireLevel: t.fireLevel, smoke: t.smoke, protection: t.protection, destroyed: t.destroyed, status: fireStatus(t), neighbors: t.neighbors }));
    const summary = {
      kind: "darts_firefighter", mode: "darts_firefighter", sport: "darts", finished: isFinished,
      statisticsVersion: 1, telemetryVersion: 1,
      won: isFinished && state.won, winnerId: isFinished && state.won ? state.players[0]?.id || null : null,
      winnerIds: isFinished && state.won ? state.players.map((player) => String(player.id)) : [],
      winnerName: isFinished ? (state.won ? "BRIGADE D’INTERVENTION" : "INCENDIE") : null,
      score: totalScore, mapId: config.mapId, difficulty: config.difficulty,
      missionPreset: config.missionPreset, objective: config.objective,
      activeTerritories: config.activeTerritories, initialFires: config.initialFires, initialSmoke: config.initialSmoke, initialFireLevel: config.initialFireLevel, criticalTerritories: config.criticalTerritories,
      propagationTiming: config.propagationTiming, windStrength: config.windStrength, dartsPerTurn: config.dartsPerTurn, targetOrder: config.targetOrder,
      roundsPlayed: matchStats.roundsPlayed, durationMs: matchStats.durationMs,
      finishReason: state.finishReason, totalExtinguished: state.totalExtinguished, totalDestroyed: state.totalDestroyed,
      totalSpread: state.totalSpread, propagationBlocked: state.propagationBlocked,
      players: playerRows, perPlayer: playerRows, rankings: isFinished ? [...playerRows].sort((a, b) => b.score - a.score) : [],
      matchStats, finalTerritories, visits: state.history,
      scoreLine: `${isFinished ? (state.won ? "VICTOIRE" : "DÉFAITE") : "EN COURS"} · ${totalScore} pts · ${state.totalExtinguished} feux éteints · ${state.totalDestroyed} zones perdues`,
      game: { mode: "darts_firefighter", mapId: config.mapId, difficulty: config.difficulty },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current,
      kind: "darts_firefighter", mode: "darts_firefighter", sport: "darts", status: recordStatus,
      statisticsVersion: 1, telemetryVersion: 1,
      createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now,
      ...(isFinished ? { finishedAt: now, endedAt: now } : {}),
      winnerId: summary.winnerId, winnerIds: summary.winnerIds, winnerName: summary.winnerName, players: playerRows,
      resumeId: matchIdRef.current,
      resume: { config, state: cloneDartsFirefighterState(state), updatedAt: now },
      game: summary.game, summary,
      payload: {
        kind: "darts_firefighter", mode: "darts_firefighter", sport: "darts",
        statisticsVersion: 1, telemetryVersion: 1, won: state.won, finishReason: state.finishReason,
        config, players: playerRows, summary, visits: state.history, visitHistory: state.history,
        stateSnapshot: cloneDartsFirefighterState(state),
        finalTerritories,
        state: { score: state.score, roundIndex: state.roundIndex, turnIndex: state.turnIndex, combo: state.combo, brigadeGauge: state.brigadeGauge, windOffset: state.windOffset, windLabel: state.windLabel, totalExtinguished: state.totalExtinguished, totalDestroyed: state.totalDestroyed, totalSpread: state.totalSpread, propagationBlocked: state.propagationBlocked, finishReason: state.finishReason },
        stats: { sport: "darts", mode: "darts_firefighter", players: playerRows, match: matchStats, global: matchStats },
      },
    };
  }

  React.useEffect(() => {
    if (state.finished || state.history.length === 0) return;
    const timer = window.setTimeout(() => {
      try {
        void (History as any).upsert(buildHistoryRecord("in_progress"));
        window.dispatchEvent(new Event("dc-history-updated"));
      } catch {}
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.turnIndex, state.roundIndex, state.score, state.finished]);

  React.useEffect(() => {
    if (!state.finished) return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    const record = buildHistoryRecord("finished");
    try { pushDartsFirefighterStats(record); } catch {}
    try { onFinish?.(record, { navigate: false }); } catch {}
  }, [state.finished]);

  const keypadNotice = <div style={{ display: "grid", gap: 3 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: soft, fontSize: 9, fontWeight: 950 }}><span>{config.bullTargetMode === "priority" ? "BULL → PRIORITÉ AUTO" : selectedTerritory ? `BULL → ${selectedTerritory.name}` : "BULL → PRIORITÉ AUTO"}</span><span style={{ color: FIRE }}>{projectedLabels.join(" · ") || `${config.dartsPerTurn || 3} FLÉCHETTE${Number(config.dartsPerTurn || 3) > 1 ? "S" : ""}`}</span></div>
    <div style={{ textAlign: "center", color: notice.includes("DÉTRUIT") || notice.includes("Propagation") ? RED : WATER, fontSize: 9.4, fontWeight: 1000 }}>{notice}</div>
  </div>;
  const centerScore = <div style={{ minWidth: 62, height: 46, padding: "0 8px", borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(180deg,#42dcff,#0a91d4)", border: "1px solid rgba(160,235,255,.8)", color: "#02131c", fontSize: 18, lineHeight: 1, fontWeight: 1100, boxShadow: "0 0 20px rgba(37,201,255,.34)" }}>💧{throwDarts.reduce((sum, dart) => sum + (dart.v === 0 ? 0 : dart.v === 25 ? (dart.mult === 2 ? 3 : 2) : dart.mult), 0)}</div>;

  return <div style={{ minHeight: "100dvh", color: text, background: `radial-gradient(circle at 50% -6%,${FIRE}25 0,${theme?.bg || "#080a11"} 46%,#020305 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerFirefighter} tickerAlt="DARTS FIREFIGHTER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={FIRE} glow={`${FIRE}88`} title="Retour configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles DARTS FIREFIGHTER" color={WATER} glow={`${WATER}88`} content={<Rules config={config} />} /></div>} />

    <main style={{ width: "min(980px,100%)", margin: "0 auto", padding: "6px 8px", boxSizing: "border-box" }}>
      <section style={{ ...panelStyle(), padding: 0, overflow: "hidden", marginBottom: 6, borderColor: `${activeColor}66` }}>
        <div style={{ position: "relative", minHeight: 112, display: "grid", gridTemplateColumns: "minmax(0,1fr) 142px", gap: 4, padding: "7px 9px", background: "linear-gradient(110deg,rgba(14,13,13,.97),rgba(11,22,29,.96))" }}>
          <div style={{ position: "absolute", left: -12, top: 5, opacity: .30, filter: `drop-shadow(0 0 12px ${activeColor}55)` }}><ProfileAvatar profile={activeProfile as any} size={95} showStars={false} /></div>
          <div style={{ position: "relative", zIndex: 2, minWidth: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
            {botThinking ? <div style={{ color: WATER, fontSize: 8.5, fontWeight: 1000, letterSpacing: 1 }}>BOT EN INTERVENTION</div> : null}
            <div style={{ color: activeColor, fontSize: 13, fontWeight: 1100, textTransform: "uppercase", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
            <div style={{ color: "#fff", fontSize: 43, lineHeight: .96, fontWeight: 1100, textShadow: `0 0 24px ${FIRE}44` }}>{state.score}</div>
            <div style={{ color: GOLD, fontSize: 8.5, fontWeight: 1000, letterSpacing: .65 }}>SCORE BRIGADE · COMBO x{config.comboEnabled === false ? "1.00" : (1 + Math.min(.75, state.combo * .05)).toFixed(2)}</div>
            <div style={{ marginTop: 3, color: soft, fontSize: 8.2, fontWeight: 950 }}>{currentStats?.fireReduced || 0} niveaux supprimés · {currentStats?.firesExtinguished || 0} feux éteints · {pct(currentStats?.hits || 0, currentStats?.darts || 0)}%</div>
          </div>
          <div style={{ position: "relative", zIndex: 2, borderRadius: 16, display: "grid", alignContent: "center", textAlign: "center", background: "rgba(0,0,0,.32)", border: `1px solid ${FIRE}55` }}>
            <div style={{ color: soft, fontSize: 8.2, fontWeight: 950 }}>ROUND</div><div style={{ color: FIRE, fontSize: 32, lineHeight: .95, fontWeight: 1100 }}>{Math.min(config.maxRounds, state.roundIndex + 1)}<span style={{ fontSize: 13, opacity: .55 }}>/{config.maxRounds}</span></div>
            <div style={{ margin: "7px auto 0", width: "82%", height: 7, borderRadius: 999, background: "rgba(255,255,255,.09)", overflow: "hidden" }}><div style={{ width: `${state.brigadeGauge}%`, height: "100%", background: `linear-gradient(90deg,${WATER},#d9fbff)`, boxShadow: `0 0 10px ${WATER}` }} /></div>
            <div style={{ color: WATER, fontSize: 8, fontWeight: 950, marginTop: 3 }}>PRESSION {Math.round(state.brigadeGauge)}%</div>
            <div style={{ color: GOLD, fontSize: 7.8, fontWeight: 950, marginTop: 3 }}>{config.windEnabled ? state.windLabel : "VENT COUPÉ"}</div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5, marginBottom: 6 }}>
        <MiniKpi label="INCIDENTS" value={incidents} color={FIRE} icon="🔥" />
        <MiniKpi label="CHARGE FEU" value={fireLoad.toFixed(1)} color="#ff9c32" icon="♨" />
        <MiniKpi label="PROTÉGÉS" value={protections} color={WATER} icon="💧" />
        <MiniKpi label="BLOQUÉS" value={state.propagationBlocked} color={GREEN} icon="🛡" />
        <MiniKpi label="DÉTRUITS" value={state.totalDestroyed} color={RED} icon="⬛" />
      </section>

      <section style={{ ...panelStyle(), marginBottom: 6, padding: 7, borderColor: `${FIRE}44`, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <div><div style={{ color: FIRE, fontSize: 9, fontWeight: 1100, letterSpacing: .8 }}>CARTE D’INTERVENTION</div><div style={{ color: soft, fontSize: 8.2 }}>{config.bullTargetMode === "priority" ? "Bull et Canadair ciblent automatiquement le danger prioritaire." : "Touchez une zone pour la réserver au Bull / Canadair."}</div></div>
          <div style={{ display: "flex", gap: 5 }}><button onClick={() => setShowTargets(true)} style={{ ...actionButton(GOLD), minHeight: 34, padding: "0 10px", fontSize: 9 }}>CIBLES 1–20</button><button onClick={() => setShowTimeline(true)} style={{ ...actionButton(WATER), minHeight: 34, padding: "0 10px", fontSize: 9 }}>JOURNAL</button></div>
        </div>
        <div style={{ height: "min(47vh,410px)", minHeight: 270, borderRadius: 15, overflow: "hidden", background: "radial-gradient(circle,rgba(255,92,35,.13),rgba(0,0,0,.38))", border: "1px solid rgba(255,255,255,.08)" }}>
          <TerritoriesMapView country={toCountry(config.mapId)} map={fireMap} ownerColors={FIRE_STATUS_OWNER_COLORS} selectedTerritoryId={state.selectedTerritoryId || undefined} activeColor={WATER} themeColor={FIRE} interactive={!state.finished && !botThinking} onSelectTerritory={selectTerritory} isSelectableTerritoryId={(id) => Boolean(state.territories.find((t) => t.id === id && t.playable && !t.destroyed))} style={{ width: "100%", height: "100%" }} />
        </div>
        {config.forecastEnabled && forecastTerritories.length ? <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, overflowX: "auto", paddingBottom: 1 }}>
          <span style={{ flex: "0 0 auto", color: GOLD, fontSize: 8, fontWeight: 1000 }}>⚠ MENACES</span>
          {forecastTerritories.map((territory: any) => <button key={territory.id} type="button" onClick={() => selectTerritory(territory.id)} style={{ flex: "0 0 auto", minHeight: 29, padding: "0 9px", borderRadius: 999, border: `1px solid ${FIRE}66`, background: `${FIRE}13`, color: "#ffd4c2", fontSize: 8.2, fontWeight: 950 }}>{territory.target} · {territory.name}</button>)}
        </div> : null}
        {selectedTerritory ? <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderRadius: 13, padding: 8, background: `${fireTerritoryColor(fireStatus(selectedTerritory))}13`, border: `1px solid ${fireTerritoryColor(fireStatus(selectedTerritory))}77` }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(0,0,0,.34)", color: GOLD, fontSize: 20, fontWeight: 1100 }}>{selectedTerritory.target}</div>
          <div style={{ minWidth: 0 }}><div style={{ color: selectedTerritory.critical ? GOLD : "#fff", fontSize: 11.5, fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedTerritory.critical ? "⚠ " : ""}{selectedTerritory.name}</div><div style={{ color: soft, fontSize: 8.5 }}>{statusIcon(selectedTerritory)} {statusLabel(selectedTerritory)} · voisins {selectedTerritory.neighbors.length}</div></div>
          <div style={{ color: WATER, fontSize: 9, fontWeight: 1000, textAlign: "right" }}>{config.bullTargetMode === "priority" ? <>CIBLE<br />OBSERVÉE</> : <>BULL<br />PRIORITAIRE</>}</div>
        </div> : null}
      </section>

      {latestVisit?.events?.length ? <section style={{ ...panelStyle(), marginBottom: 6, padding: 7, borderColor: `${latestVisit.events.some((event) => event.type === "destroyed") ? RED : WATER}44` }}><div style={{ display: "flex", gap: 6, overflowX: "auto" }}>{latestVisit.events.slice(-6).map((event: any, index: number) => <div key={`${event.type}-${index}`} style={{ flex: "0 0 auto", maxWidth: 250, padding: "6px 9px", borderRadius: 999, background: event.score < 0 ? `${RED}12` : `${WATER}10`, border: `1px solid ${event.score < 0 ? RED : WATER}44`, color: event.score < 0 ? "#ffb2ba" : "#dffaff", fontSize: 8.8, fontWeight: 900 }}>{event.type === "extinguished" ? "✅" : event.type === "destroyed" ? "⬛" : event.type === "canadair" ? "✈️" : event.type === "spread_blocked" ? "🛡" : event.type === "spread" ? "🔥" : "💧"} {event.label}</div>)}</div></section> : null}

      <section style={{ ...panelStyle(), padding: 6 }}>
        {config.scoreInputMethod === "dartboard" ? <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= Number(config.dartsPerTurn || 3)} onHit={(segment, mult) => addDart(segment, mult)} /> : null}
        <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={() => commitVisit()} centerSlot={centerScore} noticeSlot={keypadNotice} validateAttention={throwDarts.length === Number(config.dartsPerTurn || 3)} safeBottomPad />
      </section>
    </main>

    {showTargets ? <TargetsModal state={state} onClose={() => setShowTargets(false)} onSelect={(id) => { selectTerritory(id); setShowTargets(false); }} /> : null}
    {showTimeline ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setShowTimeline(false)} /> : null}
    {showEnd && state.finished ? <DartsFirefighterEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "darts_firefighter" }); }} onHistory={() => { const record = buildHistoryRecord("finished"); try { pushDartsFirefighterStats(record); } catch {} try { onFinish?.(record, { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function MiniKpi({ label, value, color, icon }: any) {
  return <div style={{ minWidth: 0, padding: "7px 3px", borderRadius: 12, textAlign: "center", background: `${color}0d`, border: `1px solid ${color}3f` }}><div style={{ fontSize: 12 }}>{icon}</div><div style={{ color, fontSize: 15, lineHeight: 1, fontWeight: 1100 }}>{value}</div><div style={{ marginTop: 3, color: "#8f96a8", fontSize: 6.8, fontWeight: 1000, letterSpacing: .3 }}>{label}</div></div>;
}

function TargetsModal({ state, onClose, onSelect }: any) {
  const rows = state.territories.filter((t: FireTerritory) => t.playable).sort((a: FireTerritory, b: FireTerritory) => a.target - b.target);
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.84)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panelStyle(), width: "min(760px,100%)", maxHeight: "92dvh", overflow: "auto", background: "linear-gradient(180deg,#15100d,#06080c)", borderColor: `${FIRE}66` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div><div style={{ color: FIRE, fontWeight: 1100 }}>CIBLES DE LA MISSION</div><div style={{ color: "#9299aa", fontSize: 9 }}>Clique pour préparer le Bull ou le Canadair.</div></div><button onClick={onClose} style={actionButton("#c9ced8")}>FERMER</button></div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 6 }}>{rows.map((t: FireTerritory) => { const color = fireTerritoryColor(fireStatus(t)); return <button key={t.id} disabled={t.destroyed} onClick={() => onSelect(t.id)} style={{ minHeight: 61, borderRadius: 13, padding: 8, textAlign: "left", border: `1px solid ${color}66`, background: `${color}10`, color: "#fff", cursor: t.destroyed ? "not-allowed" : "pointer" }}><div style={{ display: "grid", gridTemplateColumns: "31px minmax(0,1fr)", gap: 7, alignItems: "center" }}><div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)", color: GOLD, fontWeight: 1100 }}>{t.target}</div><div style={{ minWidth: 0 }}><div style={{ color: t.critical ? GOLD : "#fff", fontWeight: 1000, fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.critical ? "⚠ " : ""}{t.name}</div><div style={{ color, fontSize: 8.3, fontWeight: 950 }}>{statusIcon(t)} {statusLabel(t)}</div></div></div></button>; })}</div></div></div>;
}

function TimelineModal({ state, profilesById, onClose }: any) {
  const rows = [...state.history].reverse();
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.84)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panelStyle(), width: "min(820px,100%)", maxHeight: "92dvh", overflow: "auto", background: "linear-gradient(180deg,#0d151b,#05070a)", borderColor: `${WATER}66` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: WATER, fontWeight: 1100 }}>JOURNAL D’INTERVENTION</div><div style={{ color: "#9299aa", fontSize: 9 }}>{rows.length} volée{rows.length > 1 ? "s" : ""}</div></div><button onClick={onClose} style={actionButton("#c9ced8")}>FERMER</button></div><div style={{ marginTop: 10, display: "grid", gap: 6 }}>{rows.length ? rows.map((visit: any) => { const profile = profilesById.get(String(visit.playerId)); const danger = visit.events.some((event: any) => event.type === "destroyed" || event.type === "spread"); return <div key={visit.id} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.035)", border: `1px solid ${danger ? RED : WATER}35` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 9.5 }}>{playerName(profile)} · R{visit.round} · {visit.labels.join(" / ")}</strong><strong style={{ color: visit.score >= 0 ? GREEN : RED }}>{visit.score >= 0 ? "+" : ""}{visit.score}</strong></div><div style={{ marginTop: 3, color: "#8d94a5", fontSize: 8.2 }}>Charge feu {visit.totalFireBefore.toFixed(1)} → {visit.totalFireAfter.toFixed(1)} · combo {visit.comboBefore} → {visit.comboAfter}</div><div style={{ marginTop: 4, color: "#cfd5df", fontSize: 8.3 }}>{visit.events.slice(-4).map((e: any) => e.label).join(" · ") || "Aucun effet"}</div></div>; }) : <div style={{ color: "#9299aa", padding: 12 }}>Aucune volée enregistrée.</div>}</div></div></div>;
}
