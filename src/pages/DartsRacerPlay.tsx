// @ts-nocheck
// =============================================================
// DARTS RACER — Play complet
// Moteur, bots, équipes, undo, piste, stats, historique.
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
  cloneDartsRacerState,
  createDartsRacerState,
  dartsRacerDartDistance,
  dartsRacerDartPoints,
  emptyDartsRacerStats,
  getDartsRacerActiveEntity,
  getDartsRacerActivePlayerId,
  getDartsRacerLap,
  playDartsRacerVisit,
  type DartsRacerConfigPayload,
  type DartsRacerPlayerStats,
  type DartsRacerSpecialCellType,
  type DartsRacerState,
  type DartsRacerTeamConfig,
} from "../lib/gameEngines/dartsRacerEngine";
import tickerDartsRacer from "../assets/tickers/ticker_darts_racer.png";
import dartsRacerRaceBackground from "../assets/games/darts_racer_race_bg.png";
import dartsRacerChecker from "../assets/games/darts_racer_checker.jpg";

type UiDart = { v: number; mult: 1 | 2 | 3 };

const C = {
  cyan: "#42d6ff",
  gold: "#ffd76a",
  pink: "#ff63b8",
  red: "#ff667e",
  purple: "#a78bfa",
  silver: "#d7deeb",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.72)",
};

const PLAYER_COLORS = ["#2fd8ff", "#e761c4", "#ff9b52", "#8c7dff", "#ffcf57", "#ff6f88", "#62d7c9", "#d5d7e6"];
function playerColor(index: number) { return PLAYER_COLORS[Math.max(0, Number(index) || 0) % PLAYER_COLORS.length]; }
function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const total = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
function rankColor(rank: number, fallback: string) { if (rank === 1) return C.gold; if (rank === 2) return "#c7ced8"; if (rank === 3) return "#c98245"; return fallback; }

function toGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function uiLabel(dart?: UiDart) {
  if (!dart) return "—";
  if (dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}
function uiDistance(dart: UiDart) { return dartsRacerDartDistance(toGameDart(dart)); }
function styleLabel(style: string) { return style === "sprint" ? "SPRINT" : style === "chaos" ? "CHAOS" : "ARCADE"; }
function cellIcon(type: DartsRacerSpecialCellType) { return type === "boost" ? "⚡" : type === "attack" ? "💥" : type === "shield" ? "🛡" : "⚠"; }
function cellLabel(type: DartsRacerSpecialCellType) { return type === "boost" ? "BOOST" : type === "attack" ? "ATTAQUE" : type === "shield" ? "BOUCLIER" : "PIÈGE"; }

function panelStyle(): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 12,
    background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))",
    border: "1px solid rgba(255,255,255,.10)",
    boxShadow: "0 14px 34px rgba(0,0,0,.30)",
    boxSizing: "border-box",
  };
}

function normalizeConfig(props: any): DartsRacerConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  return {
    mode: "darts_racer",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 1)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    trackLength: ([30,40,50,60].includes(Number(raw?.trackLength)) ? Number(raw.trackLength) : 40) as any,
    laps: ([1,2,3].includes(Number(raw?.laps)) ? Number(raw.laps) : 1) as any,
    raceStyle: raw?.raceStyle === "sprint" || raw?.raceStyle === "chaos" ? raw.raceStyle : "arcade",
    specialCells: raw?.raceStyle === "sprint" ? false : raw?.specialCells !== false,
    collisions: raw?.collisions !== false,
    maxRounds: Math.max(0, Math.min(99, Number(raw?.maxRounds ?? 20))),
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function RulesContent({ config, primary }: { config: DartsRacerConfigPayload; primary: string }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: primary }}>BUT</strong><br />Premier kart à {config.trackLength * config.laps} cases. {config.laps} tour{config.laps > 1 ? "s" : ""} de {config.trackLength} cases.</div>
    <div><strong style={{ color: C.gold }}>VITESSE</strong><br />Simple +1 · Double +2 · Triple +3 · BULL +4 · DBULL +5 · MISS +0.</div>
    <div><strong style={{ color: C.pink }}>STYLE {styleLabel(config.raceStyle)}</strong><br />{config.raceStyle === "sprint" ? "Course pure, sans cases spéciales." : config.raceStyle === "chaos" ? "Boosts, attaques et pièges renforcés." : "Boosts, attaques, boucliers et pièges équilibrés."}</div>
    <div><strong style={{ color: primary }}>COLLISIONS</strong><br />{config.collisions ? "ON : tomber sur la case d’un rival le repousse, sauf bouclier." : "OFF : les karts peuvent partager une case."}</div>
    <div><strong style={{ color: C.gold }}>ÉQUIPES</strong><br />Les équipiers partagent le même kart ; chaque joueur conserve ses propres statistiques de fléchettes.</div>
  </div>;
}

function randomBotVisit(levelRaw: string): UiDart[] {
  const level = levelRaw === "easy" || levelRaw === "hard" ? levelRaw : "normal";
  const thresholds = level === "hard"
    ? { miss: .05, single: .34, double: .63, triple: .88, bull: .97 }
    : level === "easy"
      ? { miss: .25, single: .80, double: .92, triple: .98, bull: .995 }
      : { miss: .12, single: .60, double: .80, triple: .94, bull: .985 };
  return Array.from({ length: 3 }, () => {
    const r = Math.random();
    if (r < thresholds.miss) return { v: 0, mult: 1 as const };
    if (r < thresholds.single) return { v: 1 + Math.floor(Math.random() * 20), mult: 1 as const };
    if (r < thresholds.double) return { v: 1 + Math.floor(Math.random() * 20), mult: 2 as const };
    if (r < thresholds.triple) return { v: 1 + Math.floor(Math.random() * 20), mult: 3 as const };
    if (r < thresholds.bull) return { v: 25, mult: 1 as const };
    return { v: 25, mult: 2 as const };
  });
}

export default function DartsRacerPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || C.cyan;
  const secondary = theme?.accent1 || C.pink;
  const themeText = theme?.text || C.text;
  const themeSoft = theme?.textSoft || C.soft;
  const themeStroke = theme?.borderSoft || "rgba(255,255,255,.10)";

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => {
      const id = String(profile?.id || profile?.profileId || "");
      if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) });
    });
    const ordered = (config.selectedIds || []).map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);

  const teamConfigs = React.useMemo<DartsRacerTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({
    id: String(team?.id || `team-${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color || [C.gold, C.pink, C.cyan, C.purple][index % 4],
    logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
    playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [],
    isBotTeam: Boolean(team?.isBotTeam),
  })), [config.teamConfigs]);

  const rules = React.useMemo(() => ({
    participantMode: config.participantMode,
    trackLength: config.trackLength,
    laps: config.laps,
    raceStyle: config.raceStyle,
    specialCells: config.specialCells,
    collisions: config.collisions,
    maxRounds: config.maxRounds,
  }), [config]);

  const initialState = React.useMemo(() => createDartsRacerState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<DartsRacerState>(initialState);
  const [undoStack, setUndoStack] = React.useState<DartsRacerState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showStandings, setShowStandings] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`darts-racer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activePlayerId = getDartsRacerActivePlayerId(state);
  const activeProfile = byId.get(String(activePlayerId)) || state.players.find((p) => p.id === activePlayerId) || state.players[0];
  const activeStats = state.statsByPlayer[activePlayerId] || emptyDartsRacerStats();
  const activeTeamId = state.teamByPlayer[activePlayerId] || null;
  const activeTeam = activeTeamId ? teamById.get(activeTeamId) : null;
  const activeEntity = getDartsRacerActiveEntity(state);
  const activeStanding = state.standings.find((row) => String(row.id) === String(activeEntity?.id));
  const activePlayerIndex = Math.max(0, state.players.findIndex((p) => String(p.id) === String(activePlayerId)));
  const activeColor = activeTeam?.color || playerColor(activePlayerIndex);
  const currentLap = activeEntity ? getDartsRacerLap(state, activeEntity) : 1;
  const localPosition = activeEntity?.completed ? config.trackLength : Number(activeEntity?.position || 0) % config.trackLength;
  const lastVisit = state.history[state.history.length - 1] || null;

  function commitVisit(darts: UiDart[]) {
    if (state.finished || darts.length < 1) return;
    setUndoStack((stack) => [...stack.slice(-49), cloneDartsRacerState(state)]);
    setState((prev) => playDartsRacerVisit(prev, darts.map(toGameDart)));
    setThrowDarts([]);
    setMultiplier(1);
    setNotice("");
  }

  function addDart(value: number, directMultiplier?: 1 | 2 | 3) {
    if (state.finished || botThinking || throwDarts.length >= 3) return;
    const mult = directMultiplier || multiplier;
    const dart: UiDart = value === 25
      ? { v: 25, mult: mult === 2 ? 2 : 1 }
      : { v: Math.max(0, Math.min(20, Number(value) || 0)), mult };
    const next = [...throwDarts, dart];
    setThrowDarts(next);
    if (mult > 1) setMultiplier(1);
    if (next.length === 3) setNotice("Volée complète — VALIDER");
  }

  function validateVisit() {
    if (state.finished || botThinking) return;
    if (throwDarts.length !== 3) {
      setNotice("DARTS RACER se joue avec 3 fléchettes par volée.");
      return;
    }
    commitVisit(throwDarts);
  }

  function cancelOrUndo() {
    if (botThinking) return;
    if (throwDarts.length) {
      setThrowDarts((prev) => prev.slice(0, -1));
      setMultiplier(1);
      setNotice("");
      return;
    }
    if (undoStack.length) {
      const previous = undoStack[undoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1));
      setState(cloneDartsRacerState(previous));
      setShowEnd(false);
      setNotice("Tour précédent restauré.");
    }
  }

  React.useEffect(() => {
    if (!activeProfile || state.finished || !isBot(activeProfile, botIds)) {
      setBotThinking(false);
      return;
    }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => {
      commitVisit(randomBotVisit(String(level)));
      setBotThinking(false);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.roundIndex, state.activePlayerIndex, state.finished, activePlayerId]);

  function resetMatch() {
    setState(createDartsRacerState(profiles as any, rules, teamConfigs, config.selectedIds));
    setUndoStack([]); setThrowDarts([]); setMultiplier(1); setShowEnd(false); setShowStandings(false); setShowStats(false); setNotice("");
    matchIdRef.current = `darts-racer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    autoSavedRef.current = "";
  }

  function backToConfig() {
    const now = Date.now();
    if (now - lastBackRef.current < 350) return;
    lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette course DARTS RACER en cours ?")) return;
    if (typeof go === "function") go("darts_racer_config", config);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityIds = new Set(state.winnerIds || []);
    const teams = state.teams.map((team) => {
      const standing = state.standings.find((row) => row.id === team.id);
      const rows = team.playerIds.map((id) => state.statsByPlayer[id] || emptyDartsRacerStats());
      const darts = rows.reduce((a, r) => a + r.darts, 0);
      return {
        ...team,
        players: team.playerIds,
        position: standing?.position || 0,
        distance: standing?.position || 0,
        progressPct: standing?.progressPct || 0,
        lap: standing?.lap || 1,
        shield: standing?.shield || 0,
        darts,
        winner: winnerEntityIds.has(team.id),
        rank: standing?.rank || 1,
      };
    });

    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats: DartsRacerPlayerStats = state.statsByPlayer[player.id] || emptyDartsRacerStats();
      const teamId = state.teamByPlayer[player.id] || null;
      const entityId = state.entityByPlayer[player.id];
      const entity = state.entities[entityId];
      const standing = state.standings.find((row) => row.id === entityId);
      const win = Boolean(entityId && winnerEntityIds.has(entityId));
      const visits = state.history.filter((visit: any) => String(visit.playerId) === String(player.id));
      const visitDistances = visits.map((visit: any) => Number(visit.netDistance || 0));
      const visitScores = visits.map((visit: any) => (visit.darts || []).reduce((sum: number, dart: GameDart) => sum + dartsRacerDartPoints(dart), 0));
      const eventCounts = visits.flatMap((visit: any) => visit.specialEvents || []).reduce((acc: any, event: any) => { acc[event.type] = Number(acc[event.type] || 0) + 1; return acc; }, {});
      const totalDartPoints = visitScores.reduce((a: number, value: number) => a + value, 0);
      const productiveVisits = visitDistances.filter((value: number) => value > 0).length;
      const emptyVisits = visitDistances.filter((value: number) => value === 0).length;
      const backwardVisits = visitDistances.filter((value: number) => value < 0).length;
      const perfectVisits = visits.filter((visit: any) => (visit.darts || []).length === 3 && (visit.darts || []).every((dart: GameDart) => dartsRacerDartDistance(dart) > 0)).length;
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        teamId, team: teamId, teamName: teamId ? teamById.get(teamId)?.name : null,
        win, winner: win, rank: standing?.rank || 1,
        position: standing?.position || 0, distance: standing?.position || 0, finalPosition: standing?.position || 0,
        totalDistance: state.totalDistance, progressPct: standing?.progressPct || 0, lap: standing?.lap || 1, shield: standing?.shield || 0,
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, hits: stats.hits,
        accuracy: pct(stats.hits, stats.darts), singles: stats.singles, doubles: stats.doubles, triples: stats.triples,
        bulls: stats.bulls, dbulls: stats.dbulls, misses: stats.misses,
        baseDistance: stats.baseDistance, bonusDistance: stats.bonusDistance, penaltyDistance: stats.penaltyDistance,
        netDistance: stats.netDistance, averageDistancePerVisit: stats.visits ? stats.netDistance / stats.visits : 0, averageDistancePerDart: stats.darts ? stats.netDistance / stats.darts : 0,
        bestVisitDistance: stats.bestVisitDistance, maxPosition: stats.maxPosition,
        dartPoints: Number(stats.dartPoints || totalDartPoints), avg3DScore: stats.darts ? (Number(stats.dartPoints || totalDartPoints) / stats.darts) * 3 : 0, bestVisitPoints: Number(stats.bestVisitPoints || Math.max(0, ...visitScores)),
        productiveVisits: Number(stats.productiveVisits ?? productiveVisits), emptyVisits: Number(stats.emptyVisits ?? emptyVisits), backwardVisits: Number(stats.backwardVisits ?? backwardVisits), perfectVisits: Number(stats.perfectVisits ?? perfectVisits),
        visitDistances: Array.isArray(stats.visitDistances) && stats.visitDistances.length ? stats.visitDistances : visitDistances, visitScores: Array.isArray(stats.visitScores) && stats.visitScores.length ? stats.visitScores : visitScores,
        visitHistory: visits, dartsDetail: visits.flatMap((visit: any) => (visit.darts || []).map((dart: GameDart, dartIndex: number) => ({ ...dart, visitId: visit.id, round: visit.round, dartIndex: dartIndex + 1, label: visit.labels?.[dartIndex] || null, distance: dartsRacerDartDistance(dart), score: dartsRacerDartPoints(dart) }))),
        hitsBySegment: { ...(stats.hitsBySegment || {}) }, eventCounts,
        boosts: stats.boosts, miniBoosts: stats.miniBoosts, turboHits: stats.turboHits, hyperTurboHits: stats.hyperTurboHits,
        specialBoosts: stats.specialBoosts, attackPickups: stats.attackPickups, attacksLanded: stats.attacksLanded, attackDistance: stats.attackDistance,
        shieldsPicked: stats.shieldsPicked, shieldsUsed: stats.shieldsUsed, hazards: stats.hazards, hazardDistance: stats.hazardDistance,
        collisions: stats.collisions, collisionDistance: stats.collisionDistance, leadVisits: stats.leadVisits,
        lapsCompleted: stats.lapsCompleted, finishVisit: stats.finishVisit, finishDarts: entity?.finishDarts ?? null, rawStats: stats,
      };
    });

    const winnerStanding = state.standings[0] || null;
    const winnerId = state.tied ? null : winnerStanding?.id || null;
    const totalDarts = playerRows.reduce((a, p) => a + p.darts, 0);
    const totalHits = playerRows.reduce((a, p) => a + p.hits, 0);
    const totalVisits = playerRows.reduce((a, p) => a + p.visits, 0);
    const totalDartPoints = playerRows.reduce((a, p) => a + Number(p.dartPoints || 0), 0);
    const totalSpecialEvents = state.history.reduce((a: number, visit: any) => a + (visit.specialEvents?.length || 0), 0);
    const matchStats = {
      statisticsVersion: 2, telemetryVersion: 1,
      durationMs: Math.max(0, now - state.startedAt), totalDarts, totalHits, totalVisits, accuracy: pct(totalHits, totalDarts),
      totalDartPoints, avg3DScore: totalDarts ? (totalDartPoints / totalDarts) * 3 : 0, bestVisitPoints: Math.max(0, ...playerRows.map((p) => Number(p.bestVisitPoints || 0))),
      totalBaseDistance: playerRows.reduce((a, p) => a + p.baseDistance, 0),
      totalBonusDistance: playerRows.reduce((a, p) => a + p.bonusDistance, 0),
      totalPenaltyDistance: playerRows.reduce((a, p) => a + p.penaltyDistance, 0),
      totalNetDistance: playerRows.reduce((a, p) => a + p.netDistance, 0),
      averageDistancePerVisit: totalVisits ? playerRows.reduce((a, p) => a + p.netDistance, 0) / totalVisits : 0,
      averageDistancePerDart: totalDarts ? playerRows.reduce((a, p) => a + p.netDistance, 0) / totalDarts : 0,
      bestVisitDistance: Math.max(0, ...playerRows.map((p) => Number(p.bestVisitDistance || 0))),
      productiveVisits: playerRows.reduce((a, p) => a + Number(p.productiveVisits || 0), 0), emptyVisits: playerRows.reduce((a, p) => a + Number(p.emptyVisits || 0), 0), backwardVisits: playerRows.reduce((a, p) => a + Number(p.backwardVisits || 0), 0), perfectVisits: playerRows.reduce((a, p) => a + Number(p.perfectVisits || 0), 0),
      boosts: playerRows.reduce((a, p) => a + p.specialBoosts + p.boosts, 0),
      specialBoosts: playerRows.reduce((a, p) => a + p.specialBoosts, 0),
      attacks: playerRows.reduce((a, p) => a + p.attacksLanded, 0), attackDistance: playerRows.reduce((a, p) => a + p.attackDistance, 0),
      shields: playerRows.reduce((a, p) => a + p.shieldsPicked, 0), shieldsUsed: playerRows.reduce((a, p) => a + p.shieldsUsed, 0),
      hazards: playerRows.reduce((a, p) => a + p.hazards, 0), hazardDistance: playerRows.reduce((a, p) => a + p.hazardDistance, 0),
      collisions: playerRows.reduce((a, p) => a + p.collisions, 0), collisionDistance: playerRows.reduce((a, p) => a + p.collisionDistance, 0),
      totalSpecialEvents, leadChanges: state.leadChanges,
      roundsPlayed: Math.min(state.roundIndex + 1, config.maxRounds || state.roundIndex + 1),
      trackLength: state.rules.trackLength, laps: state.rules.laps, totalDistance: state.totalDistance, raceStyle: state.rules.raceStyle, participantMode: config.participantMode,
    };

    const summary = {
      kind: "darts_racer", mode: "darts_racer", sport: "darts", finished: true, statisticsVersion: 2, telemetryVersion: 1,
      participantMode: config.participantMode, winnerId, winnerIds: state.winnerIds,
      winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      trackLength: state.rules.trackLength, laps: state.rules.laps, totalDistance: state.totalDistance,
      raceStyle: state.rules.raceStyle, specialCells: state.specialCells, collisions: state.rules.collisions,
      finishReason: state.finishReason, roundsPlayed: matchStats.roundsPlayed,
      duration: matchStats.durationMs, durationMs: matchStats.durationMs,
      standings: state.standings, rankings: state.standings, players: playerRows, perPlayer: playerRows, teams, matchStats,
      scoreLine: state.standings.map((row) => `${row.name} ${row.position}/${state.totalDistance}`).join(" • "),
      game: { mode: "darts_racer", teams },
    };

    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "darts_racer", mode: "darts_racer", sport: "darts", status: "finished", statisticsVersion: 2, telemetryVersion: 1,
      createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now, finishedAt: now, endedAt: now, winnerId, winnerIds: state.winnerIds, players: playerRows, teams,
      game: { mode: "darts_racer", teams }, summary,
      payload: {
        kind: "darts_racer", mode: "darts_racer", sport: "darts", statisticsVersion: 2, telemetryVersion: 1, winnerId, winnerIds: state.winnerIds, tied: state.tied,
        config, rules: state.rules, players: playerRows, teams, summary,
        visits: state.history, visitHistory: state.history,
        state: { roundIndex: state.roundIndex, totalDistance: state.totalDistance, specialCells: state.specialCells, entities: state.entities, standings: state.standings, finishReason: state.finishReason, leadChanges: state.leadChanges },
        stats: { sport: "darts", mode: "darts_racer", players: playerRows, teams, match: matchStats, global: matchStats },
      },
    };
  }

  React.useEffect(() => {
    if (!state.finished) return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord(), { navigate: false }); } catch {}
  }, [state.finished]);

  const previewDistance = throwDarts.reduce((sum, dart) => sum + uiDistance(dart), 0);
  const projectedPosition = Math.min(state.totalDistance, Number(activeEntity?.position || 0) + previewDistance);
  const keypadStatus = <div style={{ display: "grid", gap: 4 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 3px", color: themeSoft, fontSize: 9.5, fontWeight: 900 }}>
      <span>CASE {Number(activeEntity?.position || 0)}/{state.totalDistance}</span>
      <span style={{ color: previewDistance > 0 ? primary : themeSoft }}>+{previewDistance} · PROJ. {projectedPosition}</span>
    </div>
    {notice ? <div style={{ textAlign: "center", color: primary, fontSize: 9.5, fontWeight: 1000 }}>{notice}</div> : null}
  </div>;
  const goldVisitScore = <div title="Distance de la volée" style={{ minWidth: 58, height: 46, padding: "0 8px", borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(180deg,#ffd34d,#ffad00)", border: "1px solid rgba(255,225,120,.82)", color: "#17120a", fontSize: 19, lineHeight: 1, fontWeight: 1100, boxShadow: "0 0 20px rgba(255,181,0,.34), inset 0 1px 0 rgba(255,255,255,.45)" }}>+{previewDistance}</div>;

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerDartsRacer} tickerAlt="DARTS RACER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles de DARTS RACER" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />

    <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <section style={{ marginBottom: 6, padding: 0, overflow: "hidden", borderRadius: 19, border: `1px solid ${activeColor}88`, background: "linear-gradient(180deg,rgba(7,17,24,.94),rgba(3,8,12,.96))", boxShadow: `0 0 22px ${activeColor}18,0 14px 34px rgba(0,0,0,.34)` }}>
        <div style={{ position: "relative", minHeight: 116, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(126px,145px)", gap: 4, alignItems: "stretch", padding: "7px 9px" }}>
          <div style={{ position: "absolute", inset: 0, background: "#03070d", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${dartsRacerRaceBackground})`, backgroundPosition: "center 58%", backgroundSize: "cover", opacity: .38, filter: "saturate(.92) contrast(1.03)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(2,6,11,.70) 0%,rgba(2,6,11,.38) 43%,rgba(2,6,11,.54) 69%,rgba(2,6,11,.74) 100%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: -18, top: -5, bottom: -5, width: "27%", minWidth: 86, overflow: "hidden", opacity: .42, pointerEvents: "none" }}><div style={{ position: "absolute", left: -13, top: 11, transform: "scale(1.28)", transformOrigin: "left top", filter: `drop-shadow(0 0 8px ${activeColor}44)` }}><ProfileAvatar profile={activeProfile as any} size={84} showStars={false} /></div></div>
          {activeTeam?.logoDataUrl ? <div style={{ position: "absolute", right: "calc(126px + 12px)", top: 6, opacity: .16, pointerEvents: "none" }}><img src={activeTeam.logoDataUrl} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} /></div> : null}

          <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 2, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2px 9px 2px 5px" }}>
            {botThinking ? <div style={{ color: activeColor, fontSize: 8.5, fontWeight: 1000, letterSpacing: .8 }}>BOT EN PLEINE COURSE</div> : null}
            <div style={{ color: activeColor, fontSize: 13.2, fontWeight: 1000, letterSpacing: .75, lineHeight: 1.02, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
            <div style={{ marginTop: 4, color: "#f5f7fb", fontSize: 48, fontWeight: 1000, lineHeight: .95, letterSpacing: -1.6, textShadow: "0 4px 18px rgba(0,0,0,.52)" }}>{Number(activeEntity?.position || 0)}</div>
            <div style={{ marginTop: 2, color: C.gold, fontSize: 8.1, fontWeight: 1000, letterSpacing: .55 }}>CASE / {state.totalDistance}</div>
            <div style={{ marginTop: 3, color: "rgba(255,255,255,.58)", fontSize: 8.2, fontWeight: 950, letterSpacing: .3, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{Math.max(1, activeStanding?.rank || 1)}/{state.standings.length} · {pct(activeStats.hits, activeStats.darts)}% TOUCHES · BEST +{activeStats.bestVisitDistance}{activeTeam ? ` · ${activeTeam.name}` : ""}</div>
          </div>

          <div style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0, overflow: "hidden", borderRadius: 17, background: "#050913", isolation: "isolate" }}>
            <div style={{ position: "absolute", inset: 0, background: "#050913", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${dartsRacerChecker})`, backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat", opacity: .34, filter: "grayscale(1) contrast(1.42) brightness(.82)", mixBlendMode: "screen", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(5,9,19,.38),rgba(5,9,19,.62))", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 1, background: `linear-gradient(180deg,rgba(255,255,255,.02),${primary},rgba(255,255,255,.02))`, boxShadow: `0 0 12px ${primary}66` }} />
            <div style={{ position: "relative", width: "100%", padding: "6px 5px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,.62)", fontSize: 8.2, fontWeight: 950, letterSpacing: .75 }}>TOUR</div>
              <div style={{ marginTop: 1, color: secondary, fontSize: 34, lineHeight: .95, fontWeight: 1000, textShadow: `0 0 18px ${secondary}70` }}>{currentLap}<span style={{ fontSize: 14, opacity: .55 }}>/{config.laps}</span></div>
              <div style={{ width: "100%", maxWidth: 112, marginTop: 7 }}><div style={{ width: "100%", height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.10)", border: `1px solid ${primary}44` }}><div style={{ width: `${Math.min(100, (localPosition / config.trackLength) * 100)}%`, height: "100%", background: `linear-gradient(90deg,${primary},${secondary})`, boxShadow: `0 0 9px ${primary}88` }} /></div><div style={{ color: primary, fontSize: 9, fontWeight: 1000, marginTop: 3 }}>{localPosition}/{config.trackLength} CASES</div></div>
              <div style={{ marginTop: 2, color: activeEntity?.shield ? C.gold : themeSoft, fontSize: 8.2, fontWeight: 950 }}>{activeEntity?.shield ? "🛡 BOUCLIER ACTIF" : `${styleLabel(config.raceStyle)} · ROUND ${state.roundIndex + 1}${config.maxRounds ? `/${config.maxRounds}` : ""}`}</div>
            </div>
          </div>
        </div>
      </section>

      <RaceTrack state={state} participantMode={config.participantMode} profilesById={byId} teamById={teamById} primary={primary} secondary={secondary} onOpenStandings={() => setShowStandings(true)} />

      {lastVisit?.specialEvents?.length ? <section style={{ ...panelStyle(), padding: 8, marginBottom: 6, borderColor: `${C.gold}55` }}><div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>{lastVisit.specialEvents.map((event: any, index: number) => <div key={`${event.type}-${index}`} style={{ flex: "0 0 auto", padding: "6px 9px", borderRadius: 999, background: event.shielded ? `${C.gold}12` : `${primary}10`, border: `1px solid ${event.shielded ? C.gold : primary}55`, color: event.shielded ? C.gold : "#e9f8ff", fontSize: 9.3, fontWeight: 950 }}>{event.type === "collision" ? "🏎" : event.type === "boost" ? "⚡" : event.type === "attack" ? "💥" : event.type === "shield" ? "🛡" : "⚠"} {event.label}</div>)}</div></section> : null}

      <section style={{ ...panelStyle(), marginBottom: 6, padding: 7 }}>
        <button type="button" onClick={() => setShowStats(true)} style={{ width: "100%", border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer" }}>
          <div className={state.standings.length > 2 ? "dc-scroll-thin" : undefined} style={state.standings.length > 2 ? { display: "flex", gap: 7, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 2 } : { display: "grid", gridTemplateColumns: state.standings.length === 1 ? "1fr" : "1fr 1fr", gap: 7 }}>
            {state.standings.map((standing, index) => {
              const team = config.participantMode === "teams" ? teamById.get(standing.id) : null;
              const profile = config.participantMode === "players" ? byId.get(standing.id) : null;
              const originalPlayerIndex = config.participantMode === "players" ? Math.max(0, state.players.findIndex((p) => String(p.id) === String(standing.id))) : index;
              const color = team?.color || playerColor(originalPlayerIndex);
              const active = String(standing.id) === String(activeEntity?.id) && !state.finished;
              const rColor = rankColor(standing.rank, color);
              return <div key={standing.id} style={{ position: "relative", overflow: "hidden", flex: state.standings.length > 2 ? "0 0 min(46vw,205px)" : undefined, minWidth: state.standings.length > 2 ? 160 : 0, minHeight: 110, scrollSnapAlign: state.standings.length > 2 ? "start" : undefined, borderRadius: 17, padding: "7px 8px", border: `1px solid ${active ? color : `${color}66`}`, background: `linear-gradient(150deg,${color}18,rgba(2,7,11,.78) 56%,rgba(0,0,0,.90))`, boxShadow: active ? `0 0 19px ${color}28,inset 0 0 22px ${color}0d` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minWidth: 0 }}><span style={{ width: 21, height: 21, borderRadius: "50%", display: "grid", placeItems: "center", background: `${rColor}20`, border: `1.5px solid ${rColor}`, color: rColor, fontSize: 9.5, fontWeight: 1000 }}>{standing.rank}</span><div style={{ minWidth: 0, color: active ? color : "rgba(255,255,255,.95)", fontSize: 10.2, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{state.finished && standing.rank === 1 ? " 🏆" : ""}</div></div>
                <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>{team ? <TeamLogo team={team} size={44} /> : <ProfileAvatar profile={profile as any} size={44} showStars={false} />}</div>
                <div style={{ marginTop: 3, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 5, alignItems: "end" }}><div style={{ textAlign: "right" }}><span style={{ color, fontSize: 20, fontWeight: 1000 }}>{standing.position}</span><span style={{ color: "rgba(255,255,255,.48)", fontSize: 9, fontWeight: 900 }}>/{state.totalDistance}</span></div><div style={{ width: 1, height: 20, background: "rgba(255,255,255,.12)" }} /><div style={{ textAlign: "left" }}><span style={{ color: C.gold, fontSize: 16, fontWeight: 1000 }}>{Math.round(standing.progressPct)}</span><span style={{ color: "rgba(255,255,255,.48)", fontSize: 8, fontWeight: 900 }}> %</span></div></div>
                <div style={{ marginTop: 3, textAlign: "center", color: "rgba(255,255,255,.55)", fontSize: 8.1, fontWeight: 900 }}>TOUR {standing.lap}/{config.laps} · {standing.shield ? "🛡 BOUCLIER" : `${standing.distanceToFinish} CASES RESTANTES`}</div>
              </div>;
            })}
          </div>
          <div style={{ marginTop: 6, color: themeSoft, fontSize: 9.2, fontWeight: 850 }}>STATS DE COURSE · TOUCHER POUR LE DÉTAIL</div>
        </button>
      </section>

      {!state.finished ? <section style={{ ...panelStyle(), padding: 7 }}>
        {config.scoreInputMethod === "dartboard" ? <>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 7 }}>{[0,1,2].map((i) => <div key={i} style={{ minWidth: 58, padding: "8px 10px", borderRadius: 13, textAlign: "center", background: "rgba(0,0,0,.48)", border: `1px solid ${throwDarts[i] ? primary + "66" : themeStroke}`, color: throwDarts[i] ? primary : "rgba(255,255,255,.42)", fontWeight: 1000 }}>{uiLabel(throwDarts[i])}{throwDarts[i] ? <span style={{ color: C.gold, fontSize: 9 }}> +{uiDistance(throwDarts[i])}</span> : null}</div>)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 4px 7px", color: themeSoft, fontSize: 10, fontWeight: 850 }}><span>CASE {activeEntity?.position}/{state.totalDistance}</span><span style={{ color: previewDistance > 0 ? C.gold : themeSoft }}>VOLÉE +{previewDistance}</span></div>
          {notice ? <div style={{ textAlign: "center", color: primary, fontSize: 10, fontWeight: 900, marginBottom: 7 }}>{notice}</div> : null}
          <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={() => setMultiplier(1)} style={modeButton(multiplier === 1, primary)}>SIMPLE +1</button><button onClick={() => setMultiplier(2)} style={modeButton(multiplier === 2, C.gold)}>DOUBLE +2</button><button onClick={() => setMultiplier(3)} style={modeButton(multiplier === 3, C.pink)}>TRIPLE +3</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={cancelOrUndo} style={actionButton(C.gold)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateVisit} style={actionButton(primary)}>VALIDER</button></div>
        </> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}>
          <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={validateVisit} centerSlot={goldVisitScore} noticeSlot={keypadStatus} validateAttention={throwDarts.length === 3} safeBottomPad />
        </div>}
      </section> : null}
    </div>

    {showStandings ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowStandings(false)} /> : null}
    {showStats ? <StatsModal state={state} profilesById={byId} primary={primary} onClose={() => setShowStats(false)} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.standings[0]?.playerIds?.[0] || state.players?.[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "darts_racer" }); }} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function modeButton(active: boolean, color: string): React.CSSProperties { return { minHeight: 40, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, cursor: "pointer" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }

function TeamLogo({ team, size = 40 }: any) {
  if (team?.logoDataUrl) return <img src={team.logoDataUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1px solid ${team?.color || C.cyan}88`, background: "#070a10" }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center", background: `${team?.color || C.cyan}18`, border: `1px solid ${team?.color || C.cyan}88`, color: team?.color || C.cyan, fontSize: size * .42, fontWeight: 1000 }}>T</div>;
}

function RaceTrack({ state, participantMode, profilesById, teamById, primary, secondary, onOpenStandings }: any) {
  const specials = state.specialCells || [];
  return <section style={{ ...panelStyle(), padding: 9, marginBottom: 6, overflow: "hidden" }}>
    <button onClick={onOpenStandings} style={{ border: 0, width: "100%", background: "transparent", color: "inherit", padding: 0, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 7 }}><div style={{ color: primary, fontSize: 10.5, fontWeight: 1000, letterSpacing: .7 }}>PISTE · {state.rules.trackLength} CASES × {state.rules.laps} TOUR{state.rules.laps > 1 ? "S" : ""}</div><div style={{ color: "rgba(255,255,255,.48)", fontSize: 8.5 }}>CLASSEMENT ›</div></div>
      <div style={{ position: "relative", height: 13, margin: "0 6px 8px", borderRadius: 999, background: "repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0,rgba(255,255,255,.08) 8px,rgba(0,0,0,.18) 8px,rgba(0,0,0,.18) 16px)", border: "1px solid rgba(255,255,255,.10)" }}>
        {specials.map((cell: any) => <div key={`${cell.position}-${cell.type}`} title={`${cellLabel(cell.type)} · case ${cell.position}`} style={{ position: "absolute", left: `${(cell.position / state.totalDistance) * 100}%`, top: -5, transform: "translateX(-50%)", fontSize: 10, filter: "drop-shadow(0 0 4px rgba(0,0,0,.8))" }}>{cellIcon(cell.type)}</div>)}
        <div style={{ position: "absolute", right: -2, top: -5, fontSize: 11 }}>🏁</div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {state.standings.map((standing: any, index: number) => {
          const team = participantMode === "teams" ? teamById.get(standing.id) : null;
          const profile = participantMode === "players" ? profilesById.get(standing.id) : null;
          const color = team?.color || playerColor(index);
          return <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) 44px", gap: 7, alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>{team ? <TeamLogo team={team} size={30} /> : <ProfileAvatar profile={profile} size={30} showStars={false} />}</div>
            <div><div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,.08)", border: `1px solid ${color}55`, overflow: "hidden", position: "relative" }}><div style={{ width: `${Math.min(100, standing.progressPct)}%`, height: "100%", background: `linear-gradient(90deg,${color},${secondary})`, boxShadow: `0 0 10px ${color}55` }} /><div style={{ position: "absolute", left: `calc(${Math.min(98, standing.progressPct)}% - 8px)`, top: -4, fontSize: 12 }}>🏎️</div></div><div style={{ marginTop: 2, display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.48)", fontSize: 7.8, fontWeight: 850 }}><span>{standing.name}</span><span>T{standing.lap}/{state.rules.laps}</span></div></div>
            <div style={{ color, fontSize: 12, fontWeight: 1000, textAlign: "right" }}>{standing.position}<span style={{ opacity: .45, fontSize: 8 }}>/{state.totalDistance}</span></div>
          </div>;
        })}
      </div>
    </button>
  </section>;
}

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.74)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(760px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT DARTS RACER</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any, index: number) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} showStars={false} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏁" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>{standing.position}/{state.totalDistance} cases · {standing.progressPct}% · tour {standing.lap}/{state.rules.laps}{standing.shield ? " · 🛡" : ""}</div></div><div style={{ textAlign: "right" }}><div style={{ color: primary, fontSize: 20, fontWeight: 1100 }}>{standing.distanceToFinish}</div><div style={{ fontSize: 8.5, opacity: .55 }}>RESTANTES</div></div></div>)}</div>
  </div></div>;
}

function StatsModal({ state, profilesById, primary, onClose }: any) {
  const rows = state.players.map((player: any) => ({ player, profile: profilesById.get(player.id) || player, stats: state.statsByPlayer[player.id] || emptyDartsRacerStats(), standing: state.standings.find((s: any) => s.id === state.entityByPlayer[player.id]) })).sort((a: any,b: any) => Number(a.standing?.rank || 99)-Number(b.standing?.rank || 99));
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.76)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 10 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(920px,100%)", maxHeight: "90vh", overflow: "auto", padding: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><div style={{ color: primary, fontSize: 12, fontWeight: 1000, letterSpacing: 1 }}>STATISTIQUES DE COURSE</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>{[["Rounds",state.roundIndex+1],["Leader changes",state.leadChanges],["Événements",state.history.reduce((a:any,v:any)=>a+(v.specialEvents?.length||0),0)],["Distance",state.totalDistance]].map(([label,value]:any)=><div key={label} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ color: "#8f95a8", fontSize: 8.5 }}>{label}</div><div style={{ color: primary, fontSize: 18, fontWeight: 1000 }}>{value}</div></div>)}</div>
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 930, borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ color: primary, textAlign: "left" }}>{["Joueur","Rang","Case","Darts","Hits","Dist.","Best","T","D","Bull","Boost","Att.","Shield","Piège","Coll.","Leader"].map((h)=><th key={h} style={{ padding: 7, borderBottom: `1px solid ${primary}44` }}>{h}</th>)}</tr></thead><tbody>{rows.map((row:any)=><tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}</td><td style={{ padding: 7 }}>{row.standing?.rank || "—"}</td><td style={{ padding: 7, color: primary }}>{row.standing?.position || 0}</td><td style={{ padding: 7 }}>{row.stats.darts}</td><td style={{ padding: 7 }}>{row.stats.hits}</td><td style={{ padding: 7 }}>{row.stats.netDistance}</td><td style={{ padding: 7, color: C.gold }}>+{row.stats.bestVisitDistance}</td><td style={{ padding: 7 }}>{row.stats.triples}</td><td style={{ padding: 7 }}>{row.stats.doubles}</td><td style={{ padding: 7 }}>{row.stats.bulls+row.stats.dbulls}</td><td style={{ padding: 7 }}>{row.stats.specialBoosts}</td><td style={{ padding: 7 }}>{row.stats.attacksLanded}</td><td style={{ padding: 7 }}>{row.stats.shieldsPicked}</td><td style={{ padding: 7 }}>{row.stats.hazards}</td><td style={{ padding: 7 }}>{row.stats.collisions}</td><td style={{ padding: 7 }}>{row.stats.leadVisits}</td></tr>)}</tbody></table></div>
  </div></div>;
}

function EndKpi({ label, value, color = C.cyan, detail }: any) {
  return <div style={{ minWidth: 0, padding: 9, borderRadius: 13, background: `${color}0c`, border: `1px solid ${color}2e`, textAlign: "center" }}><div style={{ color: "#9297aa", fontSize: 8.2, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .35 }}>{label}</div><div style={{ marginTop: 2, color, fontSize: 18, fontWeight: 1100, lineHeight: 1.05 }}>{value}</div>{detail ? <div style={{ marginTop: 2, color: "rgba(255,255,255,.48)", fontSize: 8 }}>{detail}</div> : null}</div>;
}

function EndProgress({ label, value, max, color, suffix = "" }: any) {
  const pctValue = max > 0 ? Math.max(0, Math.min(100, (Number(value || 0) / max) * 100)) : 0;
  return <div style={{ display: "grid", gridTemplateColumns: "78px minmax(0,1fr) 48px", gap: 7, alignItems: "center" }}><div style={{ color: "#c5cad6", fontSize: 9, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div><div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ height: "100%", width: `${pctValue}%`, background: `linear-gradient(90deg,${color}aa,${color})`, boxShadow: `0 0 9px ${color}55` }} /></div><div style={{ color, fontSize: 9, fontWeight: 1000, textAlign: "right" }}>{value}{suffix}</div></div>;
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onStats, onHistory }: any) {
  const [tab, setTab] = React.useState("summary");
  const winner = state.standings[0];
  const playerRows = state.players.map((player: any, index: number) => {
    const stats: any = state.statsByPlayer[player.id] || emptyDartsRacerStats();
    const standing = state.standings.find((s: any) => s.id === state.entityByPlayer[player.id]);
    const visits = state.history.filter((v: any) => String(v.playerId) === String(player.id));
    const totalPoints = visits.reduce((sum: number, v: any) => sum + (v.darts || []).reduce((a: number, d: GameDart) => a + dartsRacerDartPoints(d), 0), 0);
    const color = playerColor(index);
    return { player, profile: profilesById.get(player.id) || player, stats, standing, visits, totalPoints, color };
  }).sort((a: any, b: any) => Number(a.standing?.rank || 99) - Number(b.standing?.rank || 99));
  const totals = playerRows.reduce((acc: any, row: any) => { const s = row.stats; acc.darts += Number(s.darts || 0); acc.hits += Number(s.hits || 0); acc.visits += Number(s.visits || 0); acc.net += Number(s.netDistance || 0); acc.boosts += Number(s.specialBoosts || 0); acc.attacks += Number(s.attacksLanded || 0); acc.shields += Number(s.shieldsPicked || 0); acc.hazards += Number(s.hazards || 0); acc.collisions += Number(s.collisions || 0); acc.points += Number(row.totalPoints || 0); return acc; }, { darts:0,hits:0,visits:0,net:0,boosts:0,attacks:0,shields:0,hazards:0,collisions:0,points:0 });
  const bestVisit = Math.max(0, ...playerRows.map((r:any)=>Number(r.stats.bestVisitDistance||0)));
  const bestScore = Math.max(0, ...playerRows.map((r:any)=>Number(r.stats.bestVisitPoints||0)), ...playerRows.flatMap((r:any)=>r.visits.map((v:any)=>(v.darts||[]).reduce((a:number,d:GameDart)=>a+dartsRacerDartPoints(d),0))));
  const latestVisits = [...state.history].slice(-14).reverse();
  const tabs = [["summary","RÉSUMÉ","🏁"],["precision","FLÉCHETTES","🎯"],["arcade","ARCADE","⚡"],["timeline","VOLÉES","📈"]];
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.84)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panelStyle(), width: "min(900px,100%)", maxHeight: "94dvh", overflow: "auto", padding: 12, borderColor: `${primary}66`, background: "linear-gradient(180deg,rgba(10,18,28,.98),rgba(4,8,14,.99))" }}>
    <div style={{ textAlign: "center" }}><div style={{ color: C.gold, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1.4 }}>🏁 COURSE TERMINÉE</div><div style={{ marginTop: 3, color: "#fff", fontSize: 23, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : winner?.name || "DARTS RACER"}</div><div style={{ color: primary, fontSize: 10, fontWeight: 900 }}>{styleLabel(state.rules.raceStyle)} · {state.rules.trackLength} CASES × {state.rules.laps} TOUR{state.rules.laps > 1 ? "S" : ""} · {state.finishReason === "round_limit" ? "LIMITE DE ROUNDS" : "ARRIVÉE FRANCHIE"}</div></div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>{tabs.map(([id,label,icon]:any)=><button key={id} onClick={()=>setTab(id)} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${tab===id?primary:"rgba(255,255,255,.09)"}`, background: tab===id?`${primary}18`:"rgba(255,255,255,.035)", color: tab===id?primary:"#aeb4c3", fontWeight: 1000, fontSize: 8.6, cursor:"pointer" }}><div style={{fontSize:15}}>{icon}</div>{label}</button>)}</div>

    {tab === "summary" ? <>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}><EndKpi label="Distance" value={state.totalDistance} color={primary}/><EndKpi label="Rounds" value={state.roundIndex+1} color={primary}/><EndKpi label="Darts" value={totals.darts} color={C.silver}/><EndKpi label="Précision" value={`${pct(totals.hits,totals.darts)}%`} color="#65efb4"/><EndKpi label="Best volée" value={`+${bestVisit}`} color={C.gold}/><EndKpi label="Best score" value={bestScore} color={C.gold}/><EndKpi label="Leader changes" value={state.leadChanges} color={C.pink}/><EndKpi label="Durée" value={fmtDuration(Math.max(0,(state.finishedAt||Date.now())-state.startedAt))} color={primary}/></div>
      <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{state.standings.map((standing:any,index:number)=>{const team=participantMode==="teams"?teamById.get(standing.id):null;const profile=participantMode==="players"?profilesById.get(standing.id):null;const tone=rankColor(standing.rank,playerColor(index));return <div key={standing.id} style={{ display:"grid",gridTemplateColumns:"34px 42px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:9,borderRadius:14,background:index===0?`${primary}13`:"rgba(255,255,255,.035)",border:`1px solid ${index===0?primary:"rgba(255,255,255,.08)"}` }}><div style={{ color:tone,fontWeight:1100,textAlign:"center" }}>#{standing.rank}</div>{team?<TeamLogo team={team} size={38}/>:<ProfileAvatar profile={profile} size={38} showStars={false}/>}<div style={{minWidth:0}}><div style={{fontWeight:1000,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{standing.name}{index===0?" 🏆":""}</div><div style={{color:"#979cad",fontSize:9.5}}>Tour {standing.lap}/{state.rules.laps} · {standing.progressPct}% · {standing.distanceToFinish} restantes</div></div><div style={{color:tone,fontSize:18,fontWeight:1100}}>{standing.position}<span style={{fontSize:8,opacity:.5}}>/{state.totalDistance}</span></div></div>})}</div>
      <div style={{ marginTop: 10, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", display:"grid", gap:7 }}><div style={{color:primary,fontSize:8.5,fontWeight:1000,letterSpacing:.7}}>COMPARATEUR DE DISTANCE</div>{playerRows.map((row:any)=><EndProgress key={row.player.id} label={playerName(row.profile)} value={row.standing?.position||0} max={state.totalDistance} color={row.color}/>)}</div>
    </> : null}

    {tab === "precision" ? <>
      <div style={{ marginTop: 10, display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:6 }}><EndKpi label="Touches" value={`${totals.hits}/${totals.darts}`} color="#65efb4"/><EndKpi label="Avg 3D" value={totals.darts?((totals.points/totals.darts)*3).toFixed(1):"0.0"} color={primary}/><EndKpi label="Dist./dart" value={totals.darts?(totals.net/totals.darts).toFixed(2):"0.00"} color={C.gold}/><EndKpi label="Dist./volée" value={totals.visits?(totals.net/totals.visits).toFixed(2):"0.00"} color={C.gold}/></div>
      <div style={{ marginTop:10, display:"grid",gap:7 }}>{playerRows.map((row:any)=>{const st=row.stats;const darts=Number(st.darts||0),hits=Number(st.hits||0);return <div key={row.player.id} style={{padding:10,borderRadius:14,border:`1px solid ${row.color}44`,background:`${row.color}0b`}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div style={{fontWeight:1000,color:row.color}}>{playerName(row.profile)} · #{row.standing?.rank||"—"}</div><div style={{fontWeight:1100,color:"#65efb4"}}>{pct(hits,darts)}%</div></div><div style={{marginTop:7,display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:4}}>{[["S",st.singles,C.cyan],["D",st.doubles,"#8ad8ff"],["T",st.triples,C.pink],["B",st.bulls,C.gold],["DB",st.dbulls,C.gold],["MISS",st.misses,C.red]].map(([l,v,c]:any)=><div key={l} style={{padding:"6px 2px",borderRadius:9,textAlign:"center",background:"rgba(0,0,0,.20)"}}><div style={{fontSize:7.5,color:"#858b9e",fontWeight:900}}>{l}</div><div style={{fontSize:15,color:c,fontWeight:1100}}>{v||0}</div></div>)}</div><div style={{marginTop:6,color:"#969cae",fontSize:8.8}}>Avg3D {darts?((row.totalPoints/darts)*3).toFixed(1):"0.0"} · Best +{st.bestVisitDistance||0} · Best score {st.bestVisitPoints||Math.max(0,...row.visits.map((v:any)=>(v.darts||[]).reduce((a:number,d:GameDart)=>a+dartsRacerDartPoints(d),0)))}</div></div>})}</div>
    </> : null}

    {tab === "arcade" ? <>
      <div style={{ marginTop:10,display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:6 }}><EndKpi label="Boosts" value={totals.boosts} color={C.gold}/><EndKpi label="Attaques" value={totals.attacks} color={C.pink}/><EndKpi label="Boucliers" value={totals.shields} color="#7dd3fc"/><EndKpi label="Pièges" value={totals.hazards} color={C.red}/><EndKpi label="Collisions" value={totals.collisions} color={primary}/></div>
      <div style={{marginTop:10,display:"grid",gap:7}}>{playerRows.map((row:any)=>{const st=row.stats;return <div key={row.player.id} style={{padding:9,borderRadius:14,background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.08)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><strong style={{color:row.color}}>{playerName(row.profile)}</strong><span style={{color:C.gold,fontWeight:1000}}>+{Number(st.bonusDistance||0)} / −{Number(st.penaltyDistance||0)}</span></div><div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:4,fontSize:8.5,textAlign:"center"}}><div>⚡ <b>{st.specialBoosts||0}</b></div><div>💥 <b>{st.attacksLanded||0}</b></div><div>🛡 <b>{st.shieldsPicked||0}</b></div><div>⚠ <b>{st.hazards||0}</b></div><div>🏎 <b>{st.collisions||0}</b></div></div><div style={{marginTop:5,color:"#8f95a8",fontSize:8}}>attaque {st.attackDistance||0} cases · pièges {st.hazardDistance||0} · collisions {st.collisionDistance||0} · en tête {st.leadVisits||0} volée(s)</div></div>})}</div>
    </> : null}

    {tab === "timeline" ? <div style={{marginTop:10,display:"grid",gap:6}}>{latestVisits.length?latestVisits.map((visit:any,index:number)=>{const profile=profilesById.get(visit.playerId);const events=(visit.specialEvents||[]).map((e:any)=>e.label).join(" · ");const score=(visit.darts||[]).reduce((a:number,d:GameDart)=>a+dartsRacerDartPoints(d),0);return <div key={visit.id||index} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.07)"}}><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8}}><div style={{fontSize:9.5,fontWeight:1000}}>{playerName(profile)} · R{visit.round} · {(visit.labels||[]).join(" / ")}</div><div style={{color:Number(visit.netDistance||0)>=0?primary:C.red,fontWeight:1100}}> {Number(visit.netDistance||0)>=0?"+":""}{visit.netDistance||0}</div></div><div style={{marginTop:2,color:"#868c9e",fontSize:8.3}}>Score {score} · {visit.positionBefore}→{visit.positionAfter}{events?` · ${events}`:""}</div></div>}):<div style={{color:"#8f95a8",padding:12}}>Aucune volée enregistrée.</div>}</div> : null}

    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}><button onClick={onReplay} style={actionButton(primary)}>REJOUER</button><button onClick={onStats} style={actionButton(C.pink)}>STATS</button><button onClick={onHistory} style={actionButton(C.gold)}>HISTORIQUE</button><button onClick={onClose} style={actionButton(C.silver)}>FERMER</button></div>
  </div></div>;
}

