// @ts-nocheck
// =============================================================
// ATTRAPE-MOI SI TU PEUX ! — Play complet
// Poursuite score cumulé, inversion Fuyard/Chasseur, BO3/5/7, équipes, bots.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import tickerAttrapeMoi from "../assets/tickers/ticker_attrape_moi.png";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  cloneCatchMeState,
  createCatchMeState,
  emptyCatchMePlayerStats,
  getCatchMeDistance,
  getCatchMeLegsToWin,
  getCatchMeSetsToWin,
  playCatchMeVisit,
  startNextCatchMeLeg,
  type CatchMeConfigPayload,
  type CatchMeState,
  type CatchMeTeamConfig,
} from "../lib/gameEngines/attrapeMoiEngine";

type UiDart = { v: number; mult: 1 | 2 | 3 };

const C = {
  runner: "#ff5d9e",
  chaser: "#42d6ff",
  gold: "#ffd76a",
  red: "#ff667e",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.70)",
};

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function round1(n: number) { return Math.round((Number(n) || 0) * 10) / 10; }
function fmtDuration(ms: number) {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function toGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function dartPoints(dart: UiDart) {
  if (!dart || dart.v === 0) return 0;
  if (dart.v === 25) return dart.mult === 2 ? 50 : 25;
  return dart.v * dart.mult;
}
function normalizeConfig(props: any): CatchMeConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  const legs = [3, 5, 7].includes(Number(raw?.legsBestOf)) ? Number(raw.legsBestOf) : 3;
  const sets = [1, 3, 5, 7].includes(Number(raw?.setsBestOf)) ? Number(raw.setsBestOf) : 1;
  return {
    mode: "attrape_moi",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(2, Number(raw?.players || raw?.selectedIds?.length || 2)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    headStart: Math.max(0, Math.min(2000, Number(raw?.headStart ?? 100))),
    pursuitRounds: Math.max(1, Math.min(99, Number(raw?.pursuitRounds ?? 10))),
    legsBestOf: legs as 3 | 5 | 7,
    setsBestOf: sets as 1 | 3 | 5 | 7,
    startingRunner: raw?.startingRunner === "second" || raw?.startingRunner === "random" ? raw.startingRunner : "first",
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}
function isBot(profile: any, botIds: Set<string>) {
  return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot");
}
function botVisit(levelRaw: string): UiDart[] {
  const level = String(levelRaw || "normal").toLowerCase();
  const skill = level.includes("hard") ? .76 : level.includes("easy") ? .32 : .55;
  return Array.from({ length: 3 }, () => {
    if (Math.random() > skill) {
      if (Math.random() < .14) return { v: 0, mult: 1 } as UiDart;
      const v = 1 + Math.floor(Math.random() * 20);
      return { v, mult: Math.random() < .08 ? 2 : 1 } as UiDart;
    }
    const roll = Math.random();
    if (level.includes("hard") && roll < .07) return { v: 25, mult: 2 } as UiDart;
    if (roll < .12) return { v: 25, mult: 1 } as UiDart;
    const preferred = [20, 20, 20, 19, 18, 17][Math.floor(Math.random() * 6)];
    const multiRoll = Math.random();
    const mult: 1 | 2 | 3 = multiRoll < (level.includes("hard") ? .48 : .24) ? 3 : multiRoll < .34 ? 2 : 1;
    return { v: preferred, mult };
  });
}
function panelStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))",
    border: "1px solid rgba(255,255,255,.10)",
    boxShadow: "0 14px 34px rgba(0,0,0,.30)",
    boxSizing: "border-box",
    ...extra,
  };
}
function roleLabel(role: string) { return role === "runner" ? "FUYARD" : "CHASSEUR"; }
function roleIcon(role: string) { return role === "runner" ? "🏃" : "🎯"; }

function RulesContent({ config, primary }: { config: CatchMeConfigPayload; primary: string }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: C.runner }}>🏃 FUYARD</strong><br />Il démarre chaque manche avec {config.headStart} points d’avance et joue en premier.</div>
    <div><strong style={{ color: C.chaser }}>🎯 CHASSEUR</strong><br />Il part de 0 et doit atteindre ou dépasser le score cumulé du Fuyard.</div>
    <div><strong style={{ color: primary }}>POURSUITE</strong><br />Une manche dure au maximum {config.pursuitRounds} rounds. Chaque joueur lance 3 fléchettes par passage.</div>
    <div><strong style={{ color: C.gold }}>CAPTURE / ÉVASION</strong><br />Capture immédiate dès que le Chasseur rejoint le Fuyard. Sinon le Fuyard gagne la manche s’il tient jusqu’au dernier round.</div>
    <div><strong style={{ color: C.gold }}>RÔLES ALTERNÉS</strong><br />Après chaque manche, le Fuyard devient Chasseur et inversement. Le duel compare donc les deux joueurs dans les deux rôles.</div>
    <div><strong style={{ color: primary }}>FORMAT</strong><br />Manches : BO{config.legsBestOf}. Sets : BO{config.setsBestOf}. Un set repart à 0–0 manche ; les sets gagnés restent acquis.</div>
    {config.participantMode === "teams" ? <div><strong style={{ color: C.gold }}>ÉQUIPES</strong><br />Tous les Fuyards jouent d’abord, puis tous les Chasseurs. La capture peut survenir pendant n’importe quelle volée du camp Chasseur.</div> : null}
  </div>;
}

function TeamLogo({ team, size = 46 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || null;
  const color = team?.color || C.gold;
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${color}18`, boxShadow: `0 0 15px ${color}44`, flex: "0 0 auto" }}>
    {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color, fontWeight: 1000, fontSize: size * .32 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}
  </div>;
}

export default function AttrapeMoiPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || C.gold;
  const themeText = theme?.text || C.text;
  const themeSoft = theme?.textSoft || C.soft;

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
    return ordered.length >= 2 ? ordered : Array.from({ length: Math.max(2, config.players) }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);

  const teamConfigs = React.useMemo<CatchMeTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({
    id: String(team?.id || `team-${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color || [C.runner, C.chaser][index % 2],
    logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
    playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [],
    isBotTeam: Boolean(team?.isBotTeam),
  })), [config.teamConfigs]);

  const rules = React.useMemo(() => ({
    participantMode: config.participantMode,
    headStart: config.headStart,
    pursuitRounds: config.pursuitRounds,
    legsBestOf: config.legsBestOf,
    setsBestOf: config.setsBestOf,
  }), [config]);

  const createInitial = React.useCallback(() => createCatchMeState(profiles as any, rules, teamConfigs, config.selectedIds, config.startingRunner), [profiles, rules, teamConfigs, config.selectedIds, config.startingRunner]);
  const [state, setState] = React.useState<CatchMeState>(() => createInitial());
  const [undoStack, setUndoStack] = React.useState<CatchMeState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [notice, setNotice] = React.useState("");
  const [botThinking, setBotThinking] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);
  const [openPanel, setOpenPanel] = React.useState<null | "match" | "ranking" | "stats">(null);
  const matchIdRef = React.useRef(`attrape-moi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);

  const byId = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((t) => [String(t.id), t])), [teamConfigs]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activeProfile = byId.get(String(state.activePlayerId)) || state.players.find((p) => p.id === state.activePlayerId) || state.players[0];
  const activeEntityId = state.phase === "runner" ? state.runnerEntityId : state.chaserEntityId;
  const activeEntity = state.entities[activeEntityId];
  const activeTeam = config.participantMode === "teams" ? teamById.get(activeEntityId) : null;
  const runnerEntity = state.entities[state.runnerEntityId];
  const chaserEntity = state.entities[state.chaserEntityId];
  const runnerScore = Number(state.entityScores[state.runnerEntityId] || 0);
  const chaserScore = Number(state.entityScores[state.chaserEntityId] || 0);
  const distance = getCatchMeDistance(state);
  const legsToWin = getCatchMeLegsToWin(state);
  const setsToWin = getCatchMeSetsToWin(state);
  const currentThrowPoints = throwDarts.reduce((a, d) => a + dartPoints(d), 0);

  function commitVisit(darts: UiDart[]) {
    if (state.finished || state.awaitingNextLeg || darts.length !== 3) return;
    setUndoStack((stack) => [...stack.slice(-59), cloneCatchMeState(state)]);
    setState((prev) => playCatchMeVisit(prev, darts.map(toGameDart)));
    setThrowDarts([]);
    setMultiplier(1);
    setNotice("");
  }
  function addDart(value: number, directMultiplier?: 1 | 2 | 3) {
    if (state.finished || state.awaitingNextLeg || botThinking || throwDarts.length >= 3) return;
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
    if (throwDarts.length !== 3) { setNotice("3 fléchettes sont nécessaires par volée."); return; }
    commitVisit(throwDarts);
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice(""); return; }
    if (!undoStack.length || state.finished) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setState(cloneCatchMeState(previous));
    setNotice("Dernière volée annulée.");
  }
  function continueLeg() {
    if (!state.awaitingNextLeg || state.finished) return;
    setUndoStack([]);
    setThrowDarts([]);
    setMultiplier(1);
    setNotice("");
    setState((prev) => startNextCatchMeLeg(prev));
  }
  function resetMatch() {
    const next = createInitial();
    setState(next); setUndoStack([]); setThrowDarts([]); setMultiplier(1); setNotice(""); setShowEnd(false); setBotThinking(false);
    matchIdRef.current = `attrape-moi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    autoSavedRef.current = "";
  }
  function backToConfig() {
    const now = Date.now(); if (now - lastBackRef.current < 350) return; lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette poursuite en cours ?")) return;
    if (typeof go === "function") go("attrape_moi_config", config);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityId = state.winnerEntityId;
    const entities = state.entityOrder.map((id, index) => {
      const entity = state.entities[id];
      const es = state.entityStats[id];
      const captureAvg = es.captures ? round1(es.captureRoundsTotal / es.captures) : 0;
      const escapeAvgLead = es.escapes ? round1(es.finalEscapeLeadTotal / es.escapes) : 0;
      return {
        id, name: entity?.name || `Camp ${index + 1}`, playerIds: entity?.playerIds || [], players: entity?.playerIds || [],
        setWins: Number(state.setWins[id] || 0), setsWon: Number(state.setWins[id] || 0), legsWon: es.legsWon,
        runnerLegWins: es.runnerLegWins, chaserLegWins: es.chaserLegWins, captures: es.captures, escapes: es.escapes,
        fastestCaptureRound: es.fastestCaptureRound, avgCaptureRound: captureAvg, latestCaptureRound: es.latestCaptureRound,
        runnerLegs: es.runnerLegs, chaserLegs: es.chaserLegs, runnerPoints: es.runnerPoints, chaserPoints: es.chaserPoints,
        maxRunnerLead: es.maxRunnerLead, avgEscapeLead: escapeAvgLead, bestEscapeLead: es.bestEscapeLead, closestChaseGap: es.closestChaseGap,
        winner: id === winnerEntityId, win: id === winnerEntityId, rank: id === winnerEntityId ? 1 : 2,
      };
    }).sort((a, b) => a.rank - b.rank);
    const entityById = new Map(entities.map((e) => [e.id, e]));
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats = state.playerStats[player.id] || emptyCatchMePlayerStats();
      const entityId = state.entityByPlayer[player.id];
      const entity = entityById.get(entityId);
      const win = entityId === winnerEntityId;
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        teamId: state.teamByPlayer[player.id] || null, team: state.teamByPlayer[player.id] || null,
        teamName: state.teamByPlayer[player.id] ? teamById.get(String(state.teamByPlayer[player.id]))?.name : null,
        entityId, win, winner: win, rank: win ? 1 : 2,
        score: stats.points, points: stats.points, totalScored: stats.points,
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, avg3: stats.darts ? round1((stats.points / stats.darts) * 3) : 0,
        bestVisit: stats.bestVisit, singles: stats.singles, doubles: stats.doubles, triples: stats.triples, bulls: stats.bulls, dbulls: stats.dbulls, misses: stats.misses,
        runnerDarts: stats.runnerDarts, runnerVisits: stats.runnerVisits, runnerPoints: stats.runnerPoints, runnerAvg3: stats.runnerDarts ? round1((stats.runnerPoints / stats.runnerDarts) * 3) : 0, runnerBestVisit: stats.runnerBestVisit,
        chaserDarts: stats.chaserDarts, chaserVisits: stats.chaserVisits, chaserPoints: stats.chaserPoints, chaserAvg3: stats.chaserDarts ? round1((stats.chaserPoints / stats.chaserDarts) * 3) : 0, chaserBestVisit: stats.chaserBestVisit,
        captureCredits: stats.captureCredits, escapeCredits: stats.escapeCredits, legsWon: stats.legsWon, setsWon: stats.setsWon,
        runnerLegWins: entity?.runnerLegWins || 0, chaserLegWins: entity?.chaserLegWins || 0, teamCaptures: entity?.captures || 0, teamEscapes: entity?.escapes || 0,
        fastestCaptureRound: entity?.fastestCaptureRound ?? null, avgCaptureRound: entity?.avgCaptureRound || 0, maxRunnerLead: entity?.maxRunnerLead || 0, avgEscapeLead: entity?.avgEscapeLead || 0,
        rawStats: stats,
      };
    });
    const totalDarts = playerRows.reduce((a, p) => a + Number(p.darts || 0), 0);
    const totalPoints = playerRows.reduce((a, p) => a + Number(p.points || 0), 0);
    const totalCaptures = entities.reduce((a, e) => a + Number(e.captures || 0), 0);
    const totalEscapes = entities.reduce((a, e) => a + Number(e.escapes || 0), 0);
    const winnerEntity = entities.find((e) => e.id === winnerEntityId) || null;
    const matchStats = {
      durationMs: Math.max(0, (state.finishedAt || now) - state.startedAt), totalDarts, totalPoints,
      totalVisits: playerRows.reduce((a, p) => a + Number(p.visits || 0), 0), totalCaptures, totalEscapes,
      legsPlayed: state.legResults.length, setsPlayed: Math.max(1, ...state.legResults.map((r) => Number(r.setNo || 1))),
      headStart: state.rules.headStart, pursuitRounds: state.rules.pursuitRounds,
    };
    const legResults = state.legResults.map((result) => ({
      ...result,
      runnerName: state.entities[result.runnerEntityId]?.name || result.runnerEntityId,
      chaserName: state.entities[result.chaserEntityId]?.name || result.chaserEntityId,
      winnerName: state.entities[result.winnerEntityId]?.name || result.winnerEntityId,
    }));
    const gameInfo = {
      mode: "attrape_moi", participantMode: config.participantMode,
      headStart: state.rules.headStart, pursuitRounds: state.rules.pursuitRounds,
      legsBestOf: state.rules.legsBestOf, setsBestOf: state.rules.setsBestOf,
      teams: config.participantMode === "teams" ? entities.map((e) => ({ id: e.id, name: e.name, playerIds: e.playerIds, players: e.playerIds })) : [],
    };
    const summary = {
      kind: "attrape_moi", mode: "attrape_moi", sport: "darts", finished: state.finished, participantMode: config.participantMode,
      winnerId: winnerEntityId, winnerName: winnerEntity?.name || "—", tied: false,
      headStart: state.rules.headStart, pursuitRounds: state.rules.pursuitRounds, legsBestOf: state.rules.legsBestOf, setsBestOf: state.rules.setsBestOf,
      legsToWin, setsToWin, setWins: { ...state.setWins }, entities, standings: entities,
      legResults, players: playerRows, perPlayer: playerRows, teams: config.participantMode === "teams" ? entities : [], matchStats,
      duration: matchStats.durationMs, durationMs: matchStats.durationMs,
      scoreLine: entities.map((e) => `${e.name} ${e.setWins} set${e.setWins > 1 ? "s" : ""} · ${e.legsWon} manche${e.legsWon > 1 ? "s" : ""}`).join(" • "),
      game: gameInfo,
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "attrape_moi", mode: "attrape_moi", sport: "darts", status: state.finished ? "finished" : "in_progress",
      createdAt: state.startedAt, updatedAt: now, winnerId: winnerEntityId, players: playerRows, teams: config.participantMode === "teams" ? entities : [],
      game: summary.game, summary,
      payload: {
        kind: "attrape_moi", mode: "attrape_moi", sport: "darts", winnerId: winnerEntityId, config, rules: state.rules,
        players: playerRows, teams: config.participantMode === "teams" ? entities : [], summary,
        visits: state.history, visitHistory: state.history, legResults,
        state: { entityOrder: state.entityOrder, entities: state.entities, setWins: state.setWins, legWins: state.legWins, winnerEntityId },
        stats: { sport: "darts", mode: "attrape_moi", players: playerRows, entities, teams: config.participantMode === "teams" ? entities : [], match: matchStats, global: matchStats },
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

  React.useEffect(() => {
    if (state.finished || state.awaitingNextLeg || botThinking || throwDarts.length) return;
    if (!isBot(activeProfile, botIds)) return;
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => {
      const darts = botVisit(String(level));
      setUndoStack((stack) => [...stack.slice(-59), cloneCatchMeState(state)]);
      setState((prev) => playCatchMeVisit(prev, darts.map(toGameDart)));
      setBotThinking(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.activePlayerId, state.phase, state.pursuitRound, state.awaitingNextLeg, state.finished]);

  const progress = Math.max(0, Math.min(100, runnerScore > 0 ? (chaserScore / runnerScore) * 100 : 100));
  const activeColor = state.phase === "runner" ? C.runner : C.chaser;

  const rankingRows = state.entityOrder
    .map((id: string) => ({
      id,
      entity: state.entities[id],
      setWins: Number(state.setWins[id] || 0),
      legWins: Number(state.legWins[id] || 0),
      score: Number(state.entityScores[id] || 0),
      stats: state.entityStats[id] || {},
    }))
    .sort((a: any, b: any) => (b.setWins - a.setWins) || (b.legWins - a.legWins) || (b.score - a.score));

  const activeStats = state.playerStats[state.activePlayerId] || emptyCatchMePlayerStats();
  const activeAvg3 = activeStats.darts ? round1((activeStats.points / activeStats.darts) * 3) : 0;
  const runnerName = runnerEntity?.name || "Fuyard";
  const chaserName = chaserEntity?.name || "Chasseur";

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}18 0, ${theme?.bg || "#080c17"} 48%, #020309 100%)`, overflowX: "hidden", paddingBottom: 8 }}>
    <PageHeader
      tickerSrc={tickerAttrapeMoi}
      tickerAlt="ATTRAPE-MOI SI TU PEUX !"
      tickerHeight={92}
      tickerBottomGap={8}
      left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>}
      right={<div style={{ marginRight: 6 }}><InfoDot title="Règles — Attrape-moi si tu peux !" color={primary} glow={`${primary}77`} content={<RulesContent config={config} primary={primary} />} /></div>}
    />

    <div style={{ padding: "5px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* SCORE / POURSUITE — un seul bloc compact */}
      <section style={panelStyle({ padding: 9, marginBottom: 7, borderColor: `${primary}66`, boxShadow: `0 0 22px ${primary}14, 0 12px 28px rgba(0,0,0,.32)` })}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginBottom: 7 }}>
          <CompactMeta label="SET" value={`${state.setNo}`} sub={`${Number(state.setWins[state.entityOrder[0]] || 0)}–${Number(state.setWins[state.entityOrder[1]] || 0)}`} color={primary} />
          <CompactMeta label="MANCHE" value={`${state.legNo}`} sub={`1er à ${legsToWin}`} color={C.gold} />
          <CompactMeta label="ROUND" value={`${state.pursuitRound}/${state.rules.pursuitRounds}`} sub={`+${state.rules.headStart}`} color={activeColor} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 96px minmax(0,1fr)", gap: 7, alignItems: "center" }}>
          <ScoreSide label="🏃 FUYARD" name={runnerName} score={runnerScore} color={C.runner} align="left" />
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ color: themeSoft, fontSize: 7.5, fontWeight: 1000, letterSpacing: .7 }}>DISTANCE</div>
            <div style={{ marginTop: 1, color: distance <= 25 ? C.red : distance <= 60 ? C.gold : primary, fontSize: 27, lineHeight: 1, fontWeight: 1100 }}>{distance > 0 ? `+${distance}` : distance}</div>
            <div style={{ marginTop: 5, height: 6, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: 999, background: `linear-gradient(90deg,${C.chaser},${distance <= 25 ? C.red : C.gold})`, transition: "width .2s ease" }} />
            </div>
            <div style={{ marginTop: 4, color: distance <= 25 ? C.red : themeSoft, fontSize: 7.5, fontWeight: 950 }}>{distance <= 0 ? "CAPTURE" : distance <= 25 ? "DANGER" : "POURSUITE"}</div>
          </div>
          <ScoreSide label="🎯 CHASSEUR" name={chaserName} score={chaserScore} color={C.chaser} align="right" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginTop: 8 }}>
          <InfoButton label="MATCH" onClick={() => setOpenPanel("match")} color={primary} />
          <InfoButton label="CLASSEMENT" onClick={() => setOpenPanel("ranking")} color={primary} />
          <InfoButton label="STATS" onClick={() => setOpenPanel("stats")} color={primary} />
        </div>
      </section>

      {!state.awaitingNextLeg && !state.finished ? <>
        {/* JOUEUR ACTIF — bloc unique */}
        <section style={panelStyle({ position: "relative", padding: 0, marginBottom: 7, minHeight: 104, overflow: "hidden", borderColor: `${activeColor}77`, boxShadow: `0 0 22px ${activeColor}16, 0 12px 30px rgba(0,0,0,.32)` })}>
          <div style={{ position: "absolute", left: -18, top: -14, bottom: -14, width: 112, opacity: .13, transform: "scale(1.18)", transformOrigin: "left center", pointerEvents: "none", display: "grid", placeItems: "center" }}>
            <ProfileAvatar profile={activeProfile as any} size={92} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(2,5,12,.16), rgba(2,5,12,.72) 30%, rgba(2,5,12,.82) 100%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "64px minmax(0,1fr) auto", gap: 9, alignItems: "center", minHeight: 104, padding: "8px 11px" }}>
            <div style={{ display: "grid", placeItems: "center" }}><ProfileAvatar profile={activeProfile as any} size={54} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: activeColor, fontWeight: 1100, fontSize: 9.5, letterSpacing: 1 }}>{roleIcon(state.phase)} {roleLabel(state.phase)} · À TOI</div>
              <div style={{ marginTop: 2, fontWeight: 1100, fontSize: 19, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
              <div style={{ marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap", color: themeSoft, fontSize: 8.8 }}>
                <span>AVG/3 <b style={{ color: themeText }}>{activeAvg3}</b></span>
                <span>BEST <b style={{ color: themeText }}>{activeStats.bestVisit || 0}</b></span>
                <span>DARTS <b style={{ color: themeText }}>{activeStats.darts || 0}</b></span>
              </div>
              <div style={{ marginTop: 3, color: themeSoft, fontSize: 8.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {config.participantMode === "teams" ? `${activeEntity?.name || activeTeam?.name || "Équipe"} · joueur ${state.phaseMemberIndex + 1}/${activeEntity?.playerIds?.length || 1}` : `Round ${state.pursuitRound}/${state.rules.pursuitRounds}`}
              </div>
            </div>
            <div style={{ minWidth: 56, textAlign: "right" }}>
              <div style={{ color: activeColor, fontSize: 30, lineHeight: 1, fontWeight: 1100 }}>{currentThrowPoints}</div>
              <div style={{ marginTop: 3, color: themeSoft, fontSize: 8 }}>{throwDarts.length}/3 DARTS</div>
            </div>
          </div>
          {botThinking ? <div style={{ position: "absolute", zIndex: 2, left: 0, right: 0, bottom: 3, textAlign: "center", color: activeColor, fontSize: 8.5, fontWeight: 1000, letterSpacing: .8 }}>BOT EN POURSUITE…</div> : null}
        </section>

        {/* SAISIE — immédiatement sous le joueur actif */}
        <section style={panelStyle({ padding: config.scoreInputMethod === "dartboard" ? 7 : 4, overflow: "hidden" })}>
          {config.scoreInputMethod === "dartboard" ? <>
            <DartboardClickable multiplier={multiplier} disabled={botThinking || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, marginTop: 7 }}>
              {[1, 2, 3].map((m) => <button key={m} onClick={() => setMultiplier(m as any)} style={smallButton(multiplier === m ? activeColor : "rgba(255,255,255,.22)")}>{m === 1 ? "S" : m === 2 ? "D" : "T"}</button>)}
              <button onClick={cancelOrUndo} style={smallButton(C.red)}>ANNULER</button>
              <button disabled={throwDarts.length !== 3} onClick={validateVisit} style={smallButton(throwDarts.length === 3 ? C.gold : "rgba(255,255,255,.18)")}>VALIDER</button>
            </div>
            {notice ? <div style={{ marginTop: 6, textAlign: "center", fontSize: 9.5, color: activeColor }}>{notice}</div> : null}
          </> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}>
            <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={validateVisit} hidePreview hideTotal centerSlot={<div style={{ textAlign: "center", color: activeColor, fontWeight: 1000, fontSize: 10 }}>{roleIcon(state.phase)} {roleLabel(state.phase)}<div style={{ fontSize: 8, color: themeSoft }}>{throwDarts.length}/3 · {currentThrowPoints} pts</div></div>} noticeSlot={notice ? <span>{notice}</span> : null} validateAttention={throwDarts.length === 3} safeBottomPad />
          </div>}
        </section>
      </> : null}
    </div>

    {openPanel ? <MatchFloatingPanel
      kind={openPanel}
      onClose={() => setOpenPanel(null)}
      primary={primary}
      state={state}
      config={config}
      profileById={byId}
      teamById={teamById}
      rankingRows={rankingRows}
      themeText={themeText}
      themeSoft={themeSoft}
    /> : null}

    {state.awaitingNextLeg && state.lastLegResult && !state.finished ? <LegResultModal state={state} onContinue={continueLeg} primary={primary} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function CompactMeta({ label, value, sub, color }: any) {
  return <div style={{ minWidth: 0, padding: "5px 4px", borderRadius: 10, background: "rgba(255,255,255,.035)", textAlign: "center" }}>
    <div style={{ fontSize: 7, color: "rgba(255,255,255,.46)", fontWeight: 950, letterSpacing: .5 }}>{label}</div>
    <div style={{ marginTop: 1, color, fontWeight: 1100, fontSize: 15, lineHeight: 1 }}>{value}</div>
    <div style={{ marginTop: 2, fontSize: 7.2, opacity: .6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
  </div>;
}

function ScoreSide({ label, name, score, color, align = "left" }: any) {
  return <div style={{ minWidth: 0, textAlign: align }}>
    <div style={{ color, fontSize: 8.3, fontWeight: 1100, letterSpacing: .55 }}>{label}</div>
    <div style={{ marginTop: 1, color: "rgba(255,255,255,.92)", fontSize: 10.5, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
    <div style={{ marginTop: 2, color, fontSize: 29, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 14px ${color}33` }}>{score}</div>
  </div>;
}

function InfoButton({ label, onClick, color }: any) {
  return <button type="button" onClick={onClick} style={{ minHeight: 30, borderRadius: 10, border: `1px solid ${color}55`, background: `${color}0d`, color, fontSize: 8.2, fontWeight: 1050, letterSpacing: .5, cursor: "pointer" }}>{label}</button>;
}

function MatchFloatingPanel({ kind, onClose, primary, state, config, profileById, teamById, rankingRows, themeText, themeSoft }: any) {
  const title = kind === "ranking" ? "CLASSEMENT" : kind === "stats" ? "STATISTIQUES" : "MATCH";
  const runnerId = state.runnerEntityId;
  const chaserId = state.chaserEntityId;
  const playerRows = (state.players || []).map((player: any) => {
    const profile = profileById.get(String(player.id)) || player;
    const stats = state.playerStats[player.id] || emptyCatchMePlayerStats();
    const avg3 = stats.darts ? round1((stats.points / stats.darts) * 3) : 0;
    const runnerAvg = stats.runnerDarts ? round1((stats.runnerPoints / stats.runnerDarts) * 3) : 0;
    const chaserAvg = stats.chaserDarts ? round1((stats.chaserPoints / stats.chaserDarts) * 3) : 0;
    return { player, profile, stats, avg3, runnerAvg, chaserAvg };
  });

  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,.76)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}>
    <div onClick={(e) => e.stopPropagation()} style={panelStyle({ width: "min(680px,100%)", maxHeight: "82dvh", overflow: "auto", padding: 12, borderColor: `${primary}77`, boxShadow: `0 0 32px ${primary}20, 0 22px 54px rgba(0,0,0,.55)` })}>
      <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 36px", alignItems: "center", gap: 8 }}>
        <div />
        <div style={{ textAlign: "center", color: primary, fontSize: 12, fontWeight: 1100, letterSpacing: 1 }}>{title}</div>
        <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
      </div>

      {kind === "match" ? <>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
          <MiniKpi label="SET" value={state.setNo} sub={`${Number(state.setWins[state.entityOrder[0]] || 0)}–${Number(state.setWins[state.entityOrder[1]] || 0)}`} color={primary} />
          <MiniKpi label="MANCHE" value={state.legNo} sub={`BO${state.rules.legsBestOf}`} color={C.gold} />
          <MiniKpi label="ROUND" value={`${state.pursuitRound}/${state.rules.pursuitRounds}`} sub={`Avance ${state.rules.headStart}`} color={state.phase === "runner" ? C.runner : C.chaser} />
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
          <EntityCard state={state} entityId={runnerId} role="runner" profileById={profileById} teamById={teamById} participantMode={config.participantMode} />
          <EntityCard state={state} entityId={chaserId} role="chaser" profileById={profileById} teamById={teamById} participantMode={config.participantMode} />
        </div>
        <div style={{ marginTop: 8, padding: 9, borderRadius: 12, background: "rgba(255,255,255,.035)", color: themeSoft, fontSize: 10.2, lineHeight: 1.45 }}>
          <b style={{ color: primary }}>RÈGLE EN COURS</b> · Le Fuyard conserve l’avance jusqu’au dernier round. Le Chasseur gagne immédiatement dès qu’il atteint ou dépasse son score.
        </div>
      </> : null}

      {kind === "ranking" ? <div style={{ marginTop: 9, display: "grid", gap: 6 }}>
        {rankingRows.map((row: any, idx: number) => {
          const color = row.id === runnerId ? C.runner : row.id === chaserId ? C.chaser : primary;
          return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) repeat(3,54px)", gap: 6, alignItems: "center", padding: 8, borderRadius: 12, border: `1px solid ${idx === 0 ? color + "66" : "rgba(255,255,255,.08)"}`, background: idx === 0 ? `${color}0c` : "rgba(255,255,255,.025)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: `${color}18`, color, fontWeight: 1100 }}>{idx + 1}</div>
            <div style={{ minWidth: 0 }}><div style={{ color: themeText, fontSize: 11.5, fontWeight: 1050, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.entity?.name || row.id}</div><div style={{ marginTop: 1, color, fontSize: 8.2, fontWeight: 950 }}>{row.id === runnerId ? "🏃 FUYARD" : row.id === chaserId ? "🎯 CHASSEUR" : ""}</div></div>
            <CompactMeta label="SETS" value={row.setWins} sub="" color={C.gold} />
            <CompactMeta label="M." value={row.legWins} sub="" color={primary} />
            <CompactMeta label="PTS" value={row.score} sub="" color={color} />
          </div>;
        })}
      </div> : null}

      {kind === "stats" ? <div style={{ marginTop: 9, display: "grid", gap: 7 }}>
        {playerRows.map((row: any) => {
          const entityId = state.entityByPlayer[row.player.id];
          const entityColor = entityId === runnerId ? C.runner : entityId === chaserId ? C.chaser : primary;
          return <div key={row.player.id} style={{ padding: 9, borderRadius: 13, border: `1px solid ${entityColor}44`, background: "rgba(255,255,255,.028)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProfileAvatar profile={row.profile} size={34} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: themeText, fontWeight: 1050, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(row.profile)}</div><div style={{ color: entityColor, fontSize: 8.2, fontWeight: 950 }}>{entityId === runnerId ? "FUYARD ACTUEL" : entityId === chaserId ? "CHASSEUR ACTUEL" : ""}</div></div></div>
            <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
              <CompactMeta label="AVG/3" value={row.avg3} sub="global" color={primary} />
              <CompactMeta label="BEST" value={row.stats.bestVisit || 0} sub="volée" color={C.gold} />
              <CompactMeta label="FUYARD" value={row.runnerAvg} sub="avg/3" color={C.runner} />
              <CompactMeta label="CHASSEUR" value={row.chaserAvg} sub="avg/3" color={C.chaser} />
            </div>
            <div style={{ marginTop: 6, color: themeSoft, fontSize: 8.8, textAlign: "center" }}>{row.stats.captureCredits || 0} capture(s) · {row.stats.escapeCredits || 0} évasion(s) · {row.stats.darts || 0} darts</div>
          </div>;
        })}
      </div> : null}
    </div>
  </div>;
}

function MiniKpi({ label, value, sub, color }: any) {
  return <div style={{ minWidth: 0, padding: "7px 5px", borderRadius: 12, background: "rgba(255,255,255,.035)", textAlign: "center" }}><div style={{ fontSize: 8, color: "rgba(255,255,255,.48)", fontWeight: 900 }}>{label}</div><div style={{ color, fontWeight: 1100, fontSize: 19, lineHeight: 1.05 }}>{value}</div><div style={{ fontSize: 8.3, opacity: .6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div></div>;
}

function EntityCard({ state, entityId, role, profileById, teamById, participantMode }: any) {
  const entity = state.entities[entityId];
  const team = participantMode === "teams" ? teamById.get(entityId) : null;
  const profile = participantMode === "players" ? profileById.get(entityId) : null;
  const color = role === "runner" ? C.runner : C.chaser;
  const score = Number(state.entityScores[entityId] || 0);
  const es = state.entityStats[entityId];
  return <div style={panelStyle({ minWidth: 0, padding: 9, borderColor: `${color}66`, boxShadow: `0 0 18px ${color}14` })}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      {participantMode === "teams" ? <TeamLogo team={team || entity} size={38} /> : <ProfileAvatar profile={profile || entity} size={38} />}
      <div style={{ minWidth: 0, flex: 1 }}><div style={{ color, fontSize: 9.5, fontWeight: 1100, letterSpacing: .7 }}>{roleIcon(role)} {roleLabel(role)}</div><div style={{ fontSize: 12, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entity?.name || "Camp"}</div></div>
    </div>
    <div style={{ marginTop: 6, textAlign: "center", color, fontSize: 30, lineHeight: 1, fontWeight: 1100 }}>{score}</div>
    <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 4 }}>
      <div style={{ padding: 4, borderRadius: 8, background: "rgba(255,255,255,.035)", textAlign: "center" }}><div style={{ fontSize: 7.5, opacity: .5 }}>SETS</div><b style={{ fontSize: 13 }}>{Number(state.setWins[entityId] || 0)}</b></div>
      <div style={{ padding: 4, borderRadius: 8, background: "rgba(255,255,255,.035)", textAlign: "center" }}><div style={{ fontSize: 7.5, opacity: .5 }}>MANCHES</div><b style={{ fontSize: 13 }}>{Number(state.legWins[entityId] || 0)}</b></div>
    </div>
    <div style={{ marginTop: 5, textAlign: "center", fontSize: 8.5, color: "rgba(255,255,255,.52)" }}>{es?.captures || 0} capture{es?.captures === 1 ? "" : "s"} · {es?.escapes || 0} évasion{es?.escapes === 1 ? "" : "s"}</div>
  </div>;
}

function LegResultModal({ state, onContinue, primary }: any) {
  const result = state.lastLegResult;
  const winner = state.entities[result.winnerEntityId];
  const captured = result.reason === "capture";
  const nextRunner = state.entities[state.chaserEntityId];
  const nextChaser = state.entities[state.runnerEntityId];
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 12 }}>
    <div style={panelStyle({ width: "min(620px,100%)", padding: 14, borderColor: `${captured ? C.chaser : C.runner}88`, textAlign: "center" })}>
      <div style={{ color: captured ? C.chaser : C.runner, fontWeight: 1100, fontSize: 12, letterSpacing: 1.4 }}>{captured ? "💥 CAPTURE !" : "🏁 ÉVASION !"}</div>
      <div style={{ marginTop: 4, fontSize: 25, fontWeight: 1100 }}>{winner?.name || "—"}</div>
      <div style={{ marginTop: 4, color: "rgba(255,255,255,.68)", fontSize: 11 }}>{captured ? `Rattrapé au round ${result.pursuitRound}/${state.rules.pursuitRounds}` : `A tenu les ${state.rules.pursuitRounds} rounds`}</div>
      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
        <MiniKpi label="FUYARD" value={result.runnerScore} sub={state.entities[result.runnerEntityId]?.name} color={C.runner} />
        <MiniKpi label="DISTANCE" value={result.finalDistance > 0 ? `+${result.finalDistance}` : result.finalDistance} sub={captured ? "capturé" : "conservée"} color={captured ? C.chaser : C.runner} />
        <MiniKpi label="CHASSEUR" value={result.chaserScore} sub={state.entities[result.chaserEntityId]?.name} color={C.chaser} />
      </div>
      {result.setWonBy ? <div style={{ marginTop: 9, color: C.gold, fontWeight: 1100, fontSize: 13 }}>🏆 SET POUR {state.entities[result.setWonBy]?.name?.toUpperCase()}</div> : null}
      <div style={{ marginTop: 10, padding: 9, borderRadius: 13, background: "rgba(255,255,255,.035)", fontSize: 10.5, lineHeight: 1.45 }}><b style={{ color: primary }}>INVERSION DES RÔLES</b><br />Prochaine manche : 🏃 {nextRunner?.name} devient Fuyard · 🎯 {nextChaser?.name} devient Chasseur.</div>
      <button onClick={onContinue} style={{ marginTop: 12, width: "100%", minHeight: 48, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${C.runner},${C.chaser})`, color: "#071018", fontWeight: 1100, letterSpacing: 1 }}>MANCHE SUIVANTE</button>
    </div>
  </div>;
}

function EndModal({ state, profilesById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const winner = state.entities[state.winnerEntityId] || null;
  const entityRows = state.entityOrder.map((id: string) => ({ entity: state.entities[id], stats: state.entityStats[id], setWins: state.setWins[id] || 0, winner: id === state.winnerEntityId }));
  const playerRows = state.players.map((player: any) => ({ player, profile: profilesById.get(player.id) || player, stats: state.playerStats[player.id] || emptyCatchMePlayerStats(), winner: state.entityByPlayer[player.id] === state.winnerEntityId }));
  const totalDarts = playerRows.reduce((a: number, r: any) => a + r.stats.darts, 0);
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.82)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 9 }}>
    <div style={panelStyle({ width: "min(950px,100%)", maxHeight: "95vh", overflow: "auto", padding: 13, borderColor: `${primary}77` })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ width: 34 }} /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 10.5, fontWeight: 1100, letterSpacing: 1.2 }}>FIN DE POURSUITE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>ATTRAPE-MOI SI TU PEUX !</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>

      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, background: `${C.gold}0d`, border: `1px solid ${C.gold}55`, textAlign: "center" }}><div style={{ color: C.gold, fontSize: 10, fontWeight: 1100 }}>🏆 VAINQUEUR</div><div style={{ marginTop: 2, fontSize: 25, fontWeight: 1100 }}>{winner?.name || "—"}</div><div style={{ color: primary, fontSize: 15, fontWeight: 1000 }}>{Number(state.setWins[state.winnerEntityId] || 0)} SET{Number(state.setWins[state.winnerEntityId] || 0) > 1 ? "S" : ""} GAGNÉ{Number(state.setWins[state.winnerEntityId] || 0) > 1 ? "S" : ""}</div></div>

      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
        <MiniKpi label="FORMAT" value={`BO${state.rules.legsBestOf}`} sub={`sets BO${state.rules.setsBestOf}`} color={primary} />
        <MiniKpi label="MANCHES" value={state.legResults.length} sub={`${state.legResults.filter((r: any) => r.reason === "capture").length} captures`} color={C.chaser} />
        <MiniKpi label="DARTS" value={totalDarts} sub="total" color={C.gold} />
        <MiniKpi label="DURÉE" value={fmtDuration((state.finishedAt || Date.now()) - state.startedAt)} sub={`${state.rules.headStart} pts d'avance`} color={C.runner} />
      </div>

      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
        {entityRows.map(({ entity, stats, setWins, winner: won }: any) => <div key={entity.id} style={panelStyle({ padding: 10, borderColor: won ? `${C.gold}77` : "rgba(255,255,255,.09)" })}>
          <div style={{ fontWeight: 1100, fontSize: 15 }}>{entity.name}{won ? " 🏆" : ""}</div>
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 4 }}>
            <MiniKpi label="SETS" value={setWins} sub="gagnés" color={C.gold} />
            <MiniKpi label="FUYARD" value={stats.runnerLegWins} sub={`${stats.escapes} évasions`} color={C.runner} />
            <MiniKpi label="CHASSEUR" value={stats.chaserLegWins} sub={`${stats.captures} captures`} color={C.chaser} />
          </div>
          <div style={{ marginTop: 7, fontSize: 9.5, color: "rgba(255,255,255,.60)", lineHeight: 1.5 }}>Capture la plus rapide : <b>{stats.fastestCaptureRound ? `round ${stats.fastestCaptureRound}` : "—"}</b> · Distance max Fuyard : <b>{stats.maxRunnerLead}</b> · Plus proche chasse : <b>{stats.closestChaseGap ?? "—"}</b></div>
        </div>)}
      </div>

      <div style={{ marginTop: 9, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 10.2 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","AVG/3","Best","AVG Fuyard","AVG Chasseur","Pts Fuyard","Pts Chasseur","Captures","Évasions","Darts"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.68)" }}>{h}</th>)}</tr></thead><tbody>{playerRows.map((row: any) => {
        const s = row.stats; const avg = s.darts ? round1((s.points / s.darts) * 3) : 0; const ravg = s.runnerDarts ? round1((s.runnerPoints / s.runnerDarts) * 3) : 0; const cavg = s.chaserDarts ? round1((s.chaserPoints / s.chaserDarts) * 3) : 0;
        return <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}{row.winner ? <span style={{ color: C.gold }}> · 🏆</span> : ""}</td><td style={td(primary)}>{avg}</td><td style={td(C.gold)}>{s.bestVisit}</td><td style={td(C.runner)}>{ravg}</td><td style={td(C.chaser)}>{cavg}</td><td style={td()}>{s.runnerPoints}</td><td style={td()}>{s.chaserPoints}</td><td style={td(C.chaser)}>{s.captureCredits}</td><td style={td(C.runner)}>{s.escapeCredits}</td><td style={td()}>{s.darts}</td></tr>;
      })}</tbody></table></div>

      <details style={{ marginTop: 9, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><summary style={{ cursor: "pointer", fontWeight: 1000, color: primary }}>DÉTAIL DES MANCHES</summary><div style={{ marginTop: 8, display: "grid", gap: 5 }}>{state.legResults.map((r: any) => <div key={r.globalLegNo} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 7, alignItems: "center", padding: 7, borderRadius: 10, background: "rgba(0,0,0,.22)", fontSize: 9.5 }}><b style={{ color: primary }}>S{r.setNo} M{r.legNo}</b><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason === "capture" ? "💥 CAPTURE" : "🏁 ÉVASION"} · {state.entities[r.winnerEntityId]?.name}</span><b style={{ color: r.reason === "capture" ? C.chaser : C.runner }}>{r.runnerScore}–{r.chaserScore} · R{r.pursuitRound}</b></div>)}</div></details>

      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><button onClick={onReplay} style={actionButton(primary)}>REJOUER</button><button onClick={onHistory} style={{ ...actionButton(C.gold), background: `linear-gradient(90deg,${C.runner},${C.chaser})`, color: "#071018" }}>HISTORIQUE & STATS</button></div>
    </div>
  </div>;
}

function smallButton(color: string): React.CSSProperties { return { minHeight: 40, borderRadius: 12, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer", fontSize: 10 }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 46, borderRadius: 999, border: `1px solid ${color}`, background: `${color}16`, color, fontWeight: 1100, cursor: "pointer" }; }
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }
