// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — PLAY / TERRITORIES LAYOUT
// Interface compacte, guidée, carte intégrée, keypad immédiatement accessible.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ScoreInputHub from "../components/ScoreInputHub";
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
import "../styles/darts-firefighter-play.css";

export const DARTS_FIREFIGHTER_PLAY_UI_VERSION = "5.0.1-territories-hotfix";

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


type TacticalSuggestion = {
  territory: FireTerritory;
  shot: string;
  power: number;
  action: string;
  reason: string;
  color: string;
  kind: "direct" | "bull" | "canadair";
};

type TacticalPlan = {
  primary: TacticalSuggestion | null;
  alternatives: TacticalSuggestion[];
  clusterCount: number;
};

function directShotForTerritory(territory: FireTerritory, forecasted: boolean): TacticalSuggestion {
  const requiredPower = territory.fireLevel > 0 || territory.smoke
    ? Math.min(3, Math.max(1, Number(territory.fireLevel || 0) + (territory.smoke ? 1 : 0)))
    : Math.max(1, 3 - Number(territory.protection || 0));
  const bed = requiredPower >= 3 ? "T" : requiredPower === 2 ? "D" : "S";
  const shot = `${bed}${territory.target}`;
  let action = "Créer un pare-feu";
  if (territory.smoke && territory.fireLevel > 0) action = "Dissiper la fumée et réduire le feu";
  else if (territory.smoke) action = "Dissiper la fumée";
  else if (territory.fireLevel === 3) action = "Frapper le foyer principal";
  else if (territory.fireLevel === 2) action = "Éteindre le foyer actif";
  else if (territory.fireLevel === 1) action = "Éteindre le départ de feu";
  else if (forecasted) action = "Bloquer la prochaine propagation";
  const reasonBits = [
    territory.critical ? "ZONE CRITIQUE" : "",
    territory.fireLevel ? `FEU N${territory.fireLevel}` : "",
    territory.smoke ? "FUMÉE" : "",
    forecasted ? "MENACÉE" : "",
  ].filter(Boolean);
  return {
    territory,
    shot,
    power: requiredPower,
    action,
    reason: reasonBits.join(" · ") || `PROTECTION ${territory.protection}/3`,
    color: fireTerritoryColor(fireStatus(territory)),
    kind: "direct",
  };
}

function buildTacticalPlan(state: DartsFirefighterState, config: DartsFirefighterConfigPayload): TacticalPlan {
  const playable = state.territories.filter((territory) => territory.playable && !territory.destroyed);
  if (!playable.length) return { primary: null, alternatives: [], clusterCount: 0 };
  const forecast = new Set(state.forecastTerritoryIds || []);
  const objectiveProtect = config.objective === "protect_critical";
  const ranked = [...playable].sort((a, b) => {
    const score = (territory: FireTerritory) =>
      Number(territory.fireLevel || 0) * 130
      + Number(territory.smoke) * 54
      + Number(territory.critical) * (objectiveProtect ? 155 : 90)
      + Number(forecast.has(territory.id)) * 78
      + Math.max(0, 3 - Number(territory.protection || 0)) * (territory.critical ? 13 : 5)
      - Number(territory.protection || 0) * 2;
    return score(b) - score(a) || Number(b.critical) - Number(a.critical) || Number(b.fireLevel) - Number(a.fireLevel);
  });
  const danger = ranked.find((territory) => territory.fireLevel > 0 || territory.smoke)
    || ranked.find((territory) => forecast.has(territory.id))
    || ranked.find((territory) => territory.critical)
    || ranked[0];
  const incidentIds = new Set(playable.filter((territory) => territory.fireLevel > 0 || territory.smoke).map((territory) => territory.id));
  const clusterCount = danger
    ? [danger.id, ...(danger.neighbors || [])].filter((id) => incidentIds.has(id)).length
    : 0;
  const gaugeCost = Math.max(0, Number(config.canadairGaugeCost ?? 35));
  const canadairReady = config.bullAirSupport !== false
    && (!config.canadairRequiresGauge || Number(state.brigadeGauge || 0) >= gaugeCost);
  const directPrimary = directShotForTerritory(danger, forecast.has(danger.id));
  const primary: TacticalSuggestion = canadairReady && clusterCount >= 3
    ? {
        territory: danger,
        shot: "DBULL",
        power: 3,
        action: `Déclencher le Canadair sur ${danger.name}`,
        reason: `${clusterCount} foyers groupés · jauge ${Math.round(state.brigadeGauge)}%`,
        color: WATER,
        kind: "canadair",
      }
    : directPrimary;
  const alternatives = ranked
    .filter((territory) => territory.id !== danger.id && (territory.fireLevel > 0 || territory.smoke || forecast.has(territory.id) || territory.critical))
    .slice(0, 2)
    .map((territory) => directShotForTerritory(territory, forecast.has(territory.id)));
  if (primary.kind === "canadair") alternatives.unshift(directPrimary);
  return { primary, alternatives: alternatives.slice(0, 3), clusterCount };
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
  const [showMap, setShowMap] = React.useState(false);
  const [showTargets, setShowTargets] = React.useState(false);
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `darts-firefighter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  React.useEffect(() => {
    try {
      document.documentElement.dataset.dartsFirefighterPlay = DARTS_FIREFIGHTER_PLAY_UI_VERSION;
      console.info(`[DARTS FIREFIGHTER] PLAY UI ${DARTS_FIREFIGHTER_PLAY_UI_VERSION}`);
    } catch {}
    return () => {
      try { delete document.documentElement.dataset.dartsFirefighterPlay; } catch {}
    };
  }, []);

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

  const tacticalPlan = React.useMemo(() => buildTacticalPlan(state, config), [state, config]);
  const primarySuggestion = tacticalPlan.primary;
  const focusTerritory = primarySuggestion?.territory || selectedTerritory || null;
  const mapLabel = String((rawMap as any)?.name || (rawMap as any)?.label || config.mapId || "Carte");

  React.useEffect(() => {
    const recommendedId = tacticalPlan.primary?.territory?.id;
    if (!recommendedId || config.bullTargetMode === "priority") return;
    const current = state.territories.find((territory) => territory.id === state.selectedTerritoryId);
    const currentStillUseful = Boolean(current && !current.destroyed && (current.fireLevel > 0 || current.smoke || current.critical || state.forecastTerritoryIds.includes(current.id)));
    if (!currentStillUseful && state.selectedTerritoryId !== recommendedId) {
      setState((prev) => selectFireTerritory(prev, recommendedId));
    }
  }, [state.history.length, state.roundIndex, tacticalPlan.primary?.territory?.id]);

  const currentWater = throwDarts.reduce((sum, dart) => sum + (dart.v === 0 ? 0 : dart.v === 25 ? (dart.mult === 2 ? 3 : 2) : dart.mult), 0);
  const centerScore = <div style={{ minWidth: 64, height: 46, padding: "0 8px", borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(180deg,#55e5ff,#0b9edc)", border: "1px solid rgba(178,242,255,.9)", color: "#02131c", fontSize: 18, lineHeight: 1, fontWeight: 1100, boxShadow: "0 0 20px rgba(37,201,255,.34)" }}>💧{currentWater}</div>;

  return <div className="dff-play" data-firefighter-play-version={DARTS_FIREFIGHTER_PLAY_UI_VERSION} style={{ minHeight: "100dvh", color: text, background: `radial-gradient(circle at 50% -6%,${FIRE}22 0,${theme?.bg || "#080a11"} 42%,#020305 100%)`, paddingBottom: "calc(8px + env(safe-area-inset-bottom))", overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerFirefighter} tickerAlt="DARTS FIREFIGHTER" tickerHeight={92} left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={FIRE} glow={`${FIRE}88`} title="Retour configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles DARTS FIREFIGHTER" color={WATER} glow={`${WATER}88`} content={<Rules config={config} />} /></div>} />

    {state.players.length > 1 ? <FirefighterTurnCarousel players={state.players} activePlayerId={activePlayer?.id} profilesById={profilesById} playerStats={state.playerStats} /> : null}

    <main className="dff-play__main" style={{ width: "min(760px,100%)", margin: "0 auto", padding: "5px 8px", boxSizing: "border-box" }}>
      <section className="dff-play__player" style={{ ...panelStyle(), padding: 0, overflow: "hidden", marginBottom: 6, borderColor: `${activeColor}66` }}>
        <div style={{ position: "relative", minHeight: 104, display: "grid", gridTemplateColumns: "minmax(0,1fr) 132px", gap: 5, padding: "7px 8px", background: "linear-gradient(110deg,rgba(14,13,13,.98),rgba(8,19,27,.97))" }}>
          <div style={{ position: "absolute", left: -14, top: 2, opacity: .31, filter: `drop-shadow(0 0 12px ${activeColor}55)` }}><ProfileAvatar profile={activeProfile as any} size={98} showStars={false} /></div>
          <div style={{ position: "relative", zIndex: 2, minWidth: 0, paddingLeft: 54, display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center" }}>
            <div style={{ color: botThinking ? WATER : activeColor, fontSize: 8, fontWeight: 1000, letterSpacing: .9 }}>{botThinking ? "BOT EN INTERVENTION" : "POMPIER ACTIF"}</div>
            <div style={{ color: activeColor, fontSize: 12.5, fontWeight: 1100, textTransform: "uppercase", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
            <div style={{ color: "#fff", fontSize: 36, lineHeight: .95, fontWeight: 1100, textShadow: `0 0 22px ${FIRE}44` }}>{state.score}</div>
            <div style={{ color: GOLD, fontSize: 7.5, fontWeight: 1000, letterSpacing: .45 }}>SCORE BRIGADE · COMBO x{config.comboEnabled === false ? "1.00" : (1 + Math.min(.75, state.combo * .05)).toFixed(2)}</div>
          </div>
          <div style={{ position: "relative", zIndex: 2, borderRadius: 15, padding: 7, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, background: "rgba(0,0,0,.32)", border: `1px solid ${FIRE}55` }}>
            <HeaderMiniStat label="ROUND" value={`${Math.min(config.maxRounds, state.roundIndex + 1)}/${config.maxRounds}`} color={FIRE} />
            <HeaderMiniStat label="INCIDENTS" value={incidents} color="#ff9c32" />
            <HeaderMiniStat label="PRESSION" value={`${Math.round(state.brigadeGauge)}%`} color={WATER} />
            <HeaderMiniStat label="DÉTRUITS" value={state.totalDestroyed} color={RED} />
            <div style={{ gridColumn: "1 / -1", color: GOLD, fontSize: 7, fontWeight: 950, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{config.windEnabled ? state.windLabel : "VENT COUPÉ"} · CHARGE {fireLoad.toFixed(1)}</div>
          </div>
        </div>
      </section>

      <section className="dff-play__kpis" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginBottom: 6 }}>
        <FirefighterKpiCard
          title="OBJECTIF"
          color={primarySuggestion?.color || WATER}
          value={primarySuggestion?.shot || "—"}
          subtitle={primarySuggestion?.action || "Analyse en cours"}
          onClick={() => primarySuggestion?.territory && selectTerritory(primarySuggestion.territory.id)}
          icon={primarySuggestion?.kind === "canadair" ? "✈️" : "🎯"}
          emphasized
        />
        <FirefighterKpiCard
          title="TERRITOIRE"
          color={focusTerritory ? fireTerritoryColor(fireStatus(focusTerritory)) : activeColor}
          value={focusTerritory?.name || "—"}
          subtitle={focusTerritory ? `${focusTerritory.target} · ${statusLabel(focusTerritory)}${focusTerritory.critical ? " · CRITIQUE" : ""}` : "Aucune zone active"}
          onClick={() => setShowMap(true)}
          icon={focusTerritory ? statusIcon(focusTerritory) : "🗺️"}
        />
        <FirefighterMapCard
          country={toCountry(config.mapId)}
          map={fireMap}
          ownerColors={FIRE_STATUS_OWNER_COLORS}
          selectedTerritoryId={focusTerritory?.id || state.selectedTerritoryId || undefined}
          mapLabel={mapLabel}
          onClick={() => setShowMap(true)}
        />
      </section>

      <TacticalGuidance
        primary={primarySuggestion}
        alternatives={tacticalPlan.alternatives}
        notice={notice}
        selectedTerritory={selectedTerritory}
        bullTargetMode={config.bullTargetMode || "selected"}
        dartsPerTurn={Number(config.dartsPerTurn || 3)}
        onSelect={selectTerritory}
        onOpenTargets={() => setShowTargets(true)}
        onOpenMap={() => setShowMap(true)}
        onOpenTimeline={() => setShowTimeline(true)}
      />

      <section className="dff-play__input" style={{ ...panelStyle(), marginTop: 6, padding: 4, borderColor: `${WATER}33`, background: "linear-gradient(180deg,rgba(8,20,28,.9),rgba(3,5,9,.98))" }}>
        <ScoreInputHub
          currentThrow={throwDarts as any}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onCancel={cancelOrUndo}
          onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))}
          onNumber={(number) => addDart(number)}
          onBull={() => addDart(25)}
          onValidate={() => commitVisit()}
          onDirectDart={(dart: any) => addDart(Number(dart?.v || 0), Number(dart?.mult || 1) as 1 | 2 | 3)}
          onSetVisitDarts={(darts: any[]) => setThrowDarts((Array.isArray(darts) ? darts : []).slice(0, Number(config.dartsPerTurn || 3)) as UiDart[])}
          preferredMethod={config.scoreInputMethod === "dartboard" ? "dartboard" : "keypad"}
          enablePresets={false}
          centerSlot={centerScore}
          disabled={botThinking || state.finished}
          switcherMode="hidden"
          hideSwitcher
          showPlaceholders={false}
          lockContentHeight
          fitToParent
        />
      </section>
    </main>

    {showMap ? <FirefighterMapModal state={state} country={toCountry(config.mapId)} map={fireMap} mapLabel={mapLabel} primary={primarySuggestion} onClose={() => setShowMap(false)} onSelect={selectTerritory} /> : null}
    {showTargets ? <TargetsModal state={state} onClose={() => setShowTargets(false)} onSelect={(id) => { selectTerritory(id); setShowTargets(false); }} /> : null}
    {showTimeline ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setShowTimeline(false)} /> : null}
    {showEnd && state.finished ? <DartsFirefighterEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "darts_firefighter" }); }} onHistory={() => { const record = buildHistoryRecord("finished"); try { pushDartsFirefighterStats(record); } catch {} try { onFinish?.(record, { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function FirefighterTurnCarousel({ players, activePlayerId, profilesById, playerStats }: any) {
  return <div className="dff-play__turns" aria-label="Ordre de passage">
    {(players || []).map((player: any, index: number) => {
      const active = String(player?.id) === String(activePlayerId);
      const profile = profilesById?.get?.(String(player?.id)) || player;
      const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
      const stats = playerStats?.[player?.id] || {};
      return <div key={String(player?.id || index)} className={`dff-play__turn ${active ? "is-active" : ""}`} style={{ borderColor: active ? color : "rgba(255,255,255,.10)", boxShadow: active ? `0 0 14px ${color}45` : "none" }}>
        <ProfileAvatar profile={profile} size={28} ringColor={color} showStars={false} noFrame />
        <div style={{ minWidth: 0, flex: 1 }}><div style={{ color: active ? color : "#c4cad4", fontSize: 7.4, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>{playerName(profile)}</div><div style={{ color: "#7f8798", fontSize: 6.3, fontWeight: 900 }}>{Number(stats.fireReduced || 0)} eau · {Number(stats.firesExtinguished || 0)} feux</div></div>
        {active ? <span style={{ color, fontSize: 8, fontWeight: 1100 }}>▶</span> : null}
      </div>;
    })}
  </div>;
}

function HeaderMiniStat({ label, value, color }: any) {
  return <div style={{ minWidth: 0, borderRadius: 10, padding: "5px 3px", textAlign: "center", background: `${color}0d`, border: `1px solid ${color}35` }}><div style={{ color: "#8f96a8", fontSize: 6.2, fontWeight: 1000, letterSpacing: .35 }}>{label}</div><div style={{ color, fontSize: 13.5, lineHeight: 1.05, fontWeight: 1100 }}>{value}</div></div>;
}

function FirefighterKpiCard({ title, color, value, subtitle, onClick, icon, emphasized }: any) {
  return <button className="dff-play__kpi" type="button" onClick={onClick} style={{ position: "relative", minWidth: 0, height: 88, padding: "7px 6px", borderRadius: 15, overflow: "hidden", cursor: onClick ? "pointer" : "default", color: "#fff", background: `radial-gradient(circle at 50% 120%,${color}22,rgba(3,5,10,.96) 64%)`, border: `1px solid ${color}60`, boxShadow: emphasized ? `0 0 17px ${color}20` : "0 8px 20px rgba(0,0,0,.25)" }}>
    <div aria-hidden style={{ position: "absolute", right: -4, bottom: -14, fontSize: 49, opacity: .10, filter: `drop-shadow(0 0 8px ${color})` }}>{icon}</div>
    <div style={{ position: "relative", color, fontSize: 7.4, fontWeight: 1100, letterSpacing: .65 }}>{title}</div>
    <div style={{ position: "relative", marginTop: 5, color: emphasized ? GOLD : "#fff", fontSize: emphasized ? 23 : 12.2, lineHeight: 1.05, fontWeight: 1100, textShadow: `0 0 12px ${color}55`, whiteSpace: emphasized ? "nowrap" : "normal", display: emphasized ? "block" : "-webkit-box", WebkitLineClamp: emphasized ? undefined : 2, WebkitBoxOrient: emphasized ? undefined : "vertical", overflow: "hidden" }}>{value}</div>
    <div style={{ position: "relative", marginTop: 4, color: "#9da5b5", fontSize: 6.9, lineHeight: 1.15, fontWeight: 900, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{subtitle}</div>
  </button>;
}

function FirefighterMapCard({ country, map, ownerColors, selectedTerritoryId, mapLabel, onClick }: any) {
  return <button className="dff-play__kpi dff-play__map-card" type="button" onClick={onClick} style={{ position: "relative", minWidth: 0, height: 88, padding: 0, borderRadius: 15, overflow: "hidden", cursor: "pointer", color: "#fff", background: "radial-gradient(circle,rgba(255,93,35,.13),rgba(3,5,10,.97))", border: `1px solid ${FIRE}60`, boxShadow: "0 8px 20px rgba(0,0,0,.25)" }}>
    <div style={{ position: "absolute", inset: 4, opacity: .82, pointerEvents: "none" }}><TerritoriesMapView country={country} map={map} ownerColors={ownerColors} selectedTerritoryId={selectedTerritoryId} activeColor={WATER} themeColor={FIRE} interactive={false} style={{ width: "100%", height: "100%" }} /></div>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.05) 48%,rgba(0,0,0,.82))" }} />
    <div style={{ position: "absolute", left: 6, right: 6, top: 6, color: FIRE, fontSize: 7.4, fontWeight: 1100, letterSpacing: .65, textShadow: "0 1px 4px #000" }}>CARTE</div>
    <div style={{ position: "absolute", left: 6, right: 6, bottom: 7, color: "#fff", fontSize: 7.3, fontWeight: 1000, textShadow: "0 1px 5px #000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mapLabel} · OUVRIR</div>
  </button>;
}

function TacticalGuidance({ primary, alternatives, notice, selectedTerritory, bullTargetMode, dartsPerTurn, onSelect, onOpenTargets, onOpenMap, onOpenTimeline }: any) {
  const visitSequence = [primary, ...(alternatives || [])].filter(Boolean).slice(0, Math.max(1, Number(dartsPerTurn || 3))).map((suggestion: TacticalSuggestion) => suggestion.shot).join(" → ");
  const dangerNotice = String(notice || "").toUpperCase().includes("DÉTRUIT") || String(notice || "").toUpperCase().includes("PROPAG");
  return <section className="dff-play__guidance" style={{ ...panelStyle(), padding: 6, borderColor: `${primary?.color || WATER}48`, background: "linear-gradient(105deg,rgba(10,18,24,.96),rgba(16,10,8,.94))" }}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, alignItems: "center" }}>
      <button type="button" disabled={!primary?.territory} onClick={() => primary?.territory && onSelect(primary.territory.id)} style={{ minWidth: 0, padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: primary?.territory ? "pointer" : "default", color: "#fff" }}>
        <div style={{ color: primary?.color || WATER, fontSize: 7.3, fontWeight: 1100, letterSpacing: .65 }}>PLAN D’INTERVENTION CONSEILLÉ</div>
        <div style={{ marginTop: 2, display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}><strong style={{ color: GOLD, fontSize: 16.5, lineHeight: 1 }}>{primary?.shot || "—"}</strong><span style={{ minWidth: 0, color: "#fff", fontSize: 9.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primary?.action || "Analyse du terrain"}</span></div>
        <div style={{ marginTop: 2, color: GOLD, fontSize: 7.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>VOLÉE CONSEILLÉE · {visitSequence || "—"}</div>
        <div style={{ marginTop: 1, color: "#929aac", fontSize: 7.1, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primary ? `${primary.territory.name} · ${primary.reason}` : "Aucune priorité disponible"}</div>
      </button>
      <div style={{ display: "flex", gap: 4 }}>
        <MiniActionButton label="CARTE" icon="🗺️" color={FIRE} onClick={onOpenMap} />
        <MiniActionButton label="CIBLES" icon="🎯" color={GOLD} onClick={onOpenTargets} />
        <MiniActionButton label="JOURNAL" icon="☰" color={WATER} onClick={onOpenTimeline} />
      </div>
    </div>
    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, overflowX: "auto", paddingBottom: 1 }}>
      <span style={{ flex: "0 0 auto", color: "#8d95a7", fontSize: 6.8, fontWeight: 1000 }}>AUTRES</span>
      {(alternatives || []).length ? alternatives.map((suggestion: TacticalSuggestion) => <button key={`${suggestion.territory.id}-${suggestion.shot}`} type="button" onClick={() => onSelect(suggestion.territory.id)} style={{ flex: "0 0 auto", minHeight: 25, padding: "0 8px", borderRadius: 999, border: `1px solid ${suggestion.color}55`, background: `${suggestion.color}10`, color: "#eefbff", fontSize: 7.3, fontWeight: 950 }}><strong style={{ color: GOLD }}>{suggestion.shot}</strong> · {suggestion.territory.name}</button>) : <span style={{ color: "#71798a", fontSize: 7.2 }}>Aucune autre urgence</span>}
      <span style={{ flex: "0 0 auto", marginLeft: "auto", color: bullTargetMode === "priority" ? WATER : selectedTerritory ? WATER : "#737b8d", fontSize: 6.8, fontWeight: 1000 }}>{bullTargetMode === "priority" ? "BULL → AUTO" : selectedTerritory ? `BULL → ${selectedTerritory.target}` : "BULL → CONSEIL"}</span>
    </div>
    <div style={{ marginTop: 5, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,.06)", color: dangerNotice ? "#ff9ba5" : WATER, textAlign: "center", fontSize: 7.5, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{notice}</div>
  </section>;
}

function MiniActionButton({ label, icon, color, onClick }: any) {
  return <button type="button" onClick={onClick} title={label} style={{ width: 41, height: 37, borderRadius: 10, border: `1px solid ${color}55`, background: `${color}0d`, color, display: "grid", placeItems: "center", alignContent: "center", gap: 1, cursor: "pointer", padding: 0 }}><span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span><span style={{ fontSize: 5.4, lineHeight: 1, fontWeight: 1000, letterSpacing: .2 }}>{label}</span></button>;
}

function FirefighterMapModal({ state, country, map, mapLabel, primary, onClose, onSelect }: any) {
  const selected = state.territories.find((territory: FireTerritory) => territory.id === state.selectedTerritoryId) || primary?.territory || null;
  const incidentRows = state.territories.filter((territory: FireTerritory) => territory.playable && !territory.destroyed && (territory.fireLevel > 0 || territory.smoke || territory.critical)).sort((a: FireTerritory, b: FireTerritory) => Number(b.critical) - Number(a.critical) || b.fireLevel - a.fireLevel).slice(0, 10);
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.88)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 7 }}>
    <div style={{ width: "min(980px,100%)", height: "min(94dvh,820px)", borderRadius: 19, overflow: "hidden", display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto", background: "linear-gradient(180deg,#120b08,#05070b)", border: `1px solid ${FIRE}77`, boxShadow: `0 0 36px ${FIRE}22,0 18px 70px rgba(0,0,0,.65)` }}>
      <div style={{ minHeight: 51, padding: "7px 9px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ minWidth: 0 }}><div style={{ color: FIRE, fontSize: 9, fontWeight: 1100, letterSpacing: .75 }}>CARTE D’INTERVENTION</div><div style={{ color: "#fff", fontSize: 12, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mapLabel}</div></div>
        <div style={{ display: "flex", gap: 6 }}><button type="button" onClick={onClose} style={{ ...actionButton("#cbd2de"), minHeight: 34, padding: "0 12px", fontSize: 8 }}>FERMER</button></div>
      </div>
      <div style={{ position: "relative", minHeight: 0, background: "radial-gradient(circle,rgba(255,90,37,.15),rgba(0,0,0,.46))" }}>
        <TerritoriesMapView country={country} map={map} ownerColors={FIRE_STATUS_OWNER_COLORS} selectedTerritoryId={state.selectedTerritoryId || primary?.territory?.id || undefined} activeColor={WATER} themeColor={FIRE} interactive={!state.finished} onSelectTerritory={onSelect} isSelectableTerritoryId={(id) => Boolean(state.territories.find((territory: FireTerritory) => territory.id === id && territory.playable && !territory.destroyed))} style={{ width: "100%", height: "100%" }} />
        {primary?.territory ? <button type="button" onClick={() => onSelect(primary.territory.id)} style={{ position: "absolute", left: 10, top: 10, maxWidth: "calc(100% - 20px)", minHeight: 55, padding: "7px 10px", borderRadius: 14, textAlign: "left", color: "#fff", background: "rgba(4,7,12,.91)", border: `1px solid ${primary.color}77`, boxShadow: `0 0 20px ${primary.color}25`, backdropFilter: "blur(8px)" }}><div style={{ color: primary.color, fontSize: 7.3, fontWeight: 1100 }}>OBJECTIF CONSEILLÉ</div><div style={{ marginTop: 2, display: "flex", alignItems: "baseline", gap: 6 }}><strong style={{ color: GOLD, fontSize: 18 }}>{primary.shot}</strong><span style={{ fontSize: 9.5, fontWeight: 1000 }}>{primary.territory.name}</span></div><div style={{ color: "#9ba3b4", fontSize: 7.3 }}>{primary.action} · {primary.reason}</div></button> : null}
        {selected ? <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, minHeight: 58, padding: "7px 9px", borderRadius: 14, display: "grid", gridTemplateColumns: "45px minmax(0,1fr) auto", gap: 8, alignItems: "center", background: "rgba(4,7,12,.92)", border: `1px solid ${fireTerritoryColor(fireStatus(selected))}77`, backdropFilter: "blur(8px)" }}><div style={{ width: 43, height: 43, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(0,0,0,.36)", color: GOLD, fontSize: 20, fontWeight: 1100 }}>{selected.target}</div><div style={{ minWidth: 0 }}><div style={{ color: selected.critical ? GOLD : "#fff", fontSize: 10.5, fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected.critical ? "⚠ " : ""}{selected.name}</div><div style={{ color: fireTerritoryColor(fireStatus(selected)), fontSize: 8, fontWeight: 950 }}>{statusIcon(selected)} {statusLabel(selected)} · PROTECTION {selected.protection}/3</div></div><button type="button" onClick={onClose} style={{ ...actionButton(WATER), minHeight: 38, padding: "0 10px", fontSize: 7.5 }}>VALIDER<br />CIBLE</button></div> : null}
      </div>
      <div style={{ padding: "7px 8px", display: "flex", gap: 5, overflowX: "auto", borderTop: "1px solid rgba(255,255,255,.08)" }}>{incidentRows.map((territory: FireTerritory) => { const suggestion = directShotForTerritory(territory, state.forecastTerritoryIds.includes(territory.id)); const color = fireTerritoryColor(fireStatus(territory)); return <button key={territory.id} type="button" onClick={() => onSelect(territory.id)} style={{ flex: "0 0 auto", minHeight: 34, padding: "0 9px", borderRadius: 999, border: `1px solid ${color}55`, background: `${color}0e`, color: "#fff", fontSize: 7.5, fontWeight: 950 }}><strong style={{ color: GOLD }}>{suggestion.shot}</strong> · {territory.name}</button>; })}</div>
    </div>
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
