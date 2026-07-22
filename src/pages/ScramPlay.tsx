// =============================================================
// src/pages/ScramPlay.tsx
// SCRAM — UI Cricket, moteur deux phases, stats + historique
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import { CricketMarkIcon, DartIconColorizable } from "../components/MaskIcon";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import { useScramEngine } from "../hooks/useScramEngine";
import type {
  ScramConfigPayload,
  ScramPlayerStats,
  ScramTarget,
  ScramTeam,
} from "../lib/gameEngines/scramEngine";
import { SCORE_INPUT_LS_KEY } from "../lib/scoreInput/types";

import tickerScram from "../assets/tickers/ticker_scram.png";

const UI_TARGETS: ScramTarget[] = [15, 16, 17, 18, 19, 20, 25];
const TEAM_COLOR: Record<ScramTeam, string> = { A: "#ff4ad1", B: "#ffd76a" };
const TARGET_COLOR: Record<ScramTarget, string> = {
  15: "#fff05a",
  16: "#ffd54a",
  17: "#ffad4a",
  18: "#ff7b62",
  19: "#ff62d5",
  20: "#ff5d6c",
  25: "#ff6262",
};
const T = {
  bg: "#050711",
  panel: "#111827",
  panelSoft: "rgba(255,255,255,.055)",
  stroke: "rgba(255,255,255,.105)",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.72)",
  cyan: "#42d6ff",
  gold: "#ffd76a",
  green: "#65efb4",
  red: "#ff667e",
};

type HitMode = "S" | "D" | "T";
type InputMethod = "keypad" | "dartboard";
type UiDart = { v: number; mult: 1 | 2 | 3 };

function targetLabel(target: ScramTarget) {
  return target === 25 ? "Bull" : String(target);
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function round2(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function readTargetFromDart(dart: any): ScramTarget | null {
  if (!dart || dart.bed === "MISS") return null;
  if (dart.bed === "OB" || dart.bed === "IB") return 25;
  const n = Number(dart.number || 0);
  return n >= 15 && n <= 20 ? (n as ScramTarget) : null;
}

function buildPlayerScramMetrics(state: any, playerId: string, fallbackStats?: ScramPlayerStats) {
  const stats: any = fallbackStats || state?.statsByPlayer?.[playerId] || emptyStats();
  const visits = (Array.isArray(state?.history) ? state.history : []).filter((visit: any) => String(visit?.playerId || "") === String(playerId));
  const stopper = visits.filter((visit: any) => visit?.role === "stopper");
  const scorer = visits.filter((visit: any) => visit?.role === "scorer");
  const sumDarts = (rows: any[]) => rows.reduce((sum, visit) => sum + (Array.isArray(visit?.darts) ? visit.darts.length : Number(visit?.dartsCount || 0)), 0);
  const stopperDarts = Number(stats.stopperDarts || 0) || sumDarts(stopper);
  const scorerDarts = Number(stats.scorerDarts || 0) || sumDarts(scorer);
  const stopperMarks = stopper.reduce((sum, visit) => sum + Number(visit?.marks || 0), 0);
  const scorerPoints = scorer.reduce((sum, visit) => sum + Number(visit?.points || 0), 0);
  const bestMarksVisit = Math.max(Number(stats.bestMarksVisit || 0), ...stopper.map((visit) => Number(visit?.marks || 0)), 0);
  const bestScoringVisit = Math.max(Number(stats.bestScoringVisit || stats.bestVisit || 0), ...scorer.map((visit) => Number(visit?.points || 0)), 0);
  const onTargetDarts = visits.reduce((sum, visit) => sum + (Array.isArray(visit?.darts) ? visit.darts.filter((dart: any) => readTargetFromDart(dart) != null).length : 0), 0);
  const segmentStats: Record<string, any> = {};
  for (const target of UI_TARGETS) {
    segmentStats[String(target)] = { target, darts: 0, marks: 0, points: 0, scoringHits: 0, blockedDarts: 0, closes: 0 };
  }
  for (const visit of visits) {
    for (const dart of Array.isArray(visit?.darts) ? visit.darts : []) {
      const target = readTargetFromDart(dart);
      if (target != null && segmentStats[String(target)]) segmentStats[String(target)].darts += 1;
    }
    for (const [target, value] of Object.entries(visit?.marksByTarget || {})) if (segmentStats[String(target)]) segmentStats[String(target)].marks += Number(value || 0);
    for (const [target, value] of Object.entries(visit?.pointsByTarget || {})) if (segmentStats[String(target)]) segmentStats[String(target)].points += Number(value || 0);
    for (const [target, value] of Object.entries(visit?.scoringHitsByTarget || {})) if (segmentStats[String(target)]) segmentStats[String(target)].scoringHits += Number(value || 0);
    for (const [target, value] of Object.entries(visit?.blockedDartsByTarget || {})) if (segmentStats[String(target)]) segmentStats[String(target)].blockedDarts += Number(value || 0);
    for (const target of Array.isArray(visit?.targetsClosed) ? visit.targetsClosed : []) if (segmentStats[String(target)]) segmentStats[String(target)].closes += 1;
  }
  const phaseStats: Record<string, any> = {};
  for (const phase of [1, 2]) {
    const phaseVisits = visits.filter((visit: any) => Number(visit?.phase) === phase);
    phaseStats[String(phase)] = {
      visits: phaseVisits.length,
      darts: sumDarts(phaseVisits),
      points: phaseVisits.reduce((sum, visit) => sum + Number(visit?.points || 0), 0),
      marks: phaseVisits.reduce((sum, visit) => sum + Number(visit?.marks || 0), 0),
      closes: phaseVisits.reduce((sum, visit) => sum + (Array.isArray(visit?.targetsClosed) ? visit.targetsClosed.length : 0), 0),
    };
  }
  const darts = Number(stats.darts || 0);
  const hits = Number(stats.hits || 0);
  const misses = Number(stats.misses || 0);
  const scoringHits = Number(stats.scoringHits || 0);
  const blockedDarts = Number(stats.blockedDarts || 0);
  const wastedDarts = Number(stats.wastedDarts || 0);
  const stopperVisits = Number(stats.stopperVisits || stopper.length);
  const scorerVisits = Number(stats.scorerVisits || scorer.length);
  return {
    stopperDarts, scorerDarts, stopperMarks, scorerPoints, bestMarksVisit, bestScoringVisit, onTargetDarts, segmentStats, phaseStats,
    hitRate: percent(hits, darts),
    targetRate: percent(onTargetDarts, darts),
    missRate: percent(misses, darts),
    scorerEfficiency: percent(scoringHits, scorerDarts),
    blockedRate: percent(blockedDarts, scorerDarts),
    wastedRate: percent(wastedDarts, darts),
    mpr: stopperDarts ? round2((stopperMarks / stopperDarts) * 3) : 0,
    marksPerStopperVisit: stopperVisits ? round2(stopperMarks / stopperVisits) : 0,
    pointsPerScorerVisit: scorerVisits ? round2(scorerPoints / scorerVisits) : 0,
    pointsPerScorerDart: scorerDarts ? round2(scorerPoints / scorerDarts) : 0,
    closesPerStopperVisit: stopperVisits ? round2(Number(stats.targetsClosed || 0) / stopperVisits) : 0,
  };
}

function emptyStats(): ScramPlayerStats {
  return {
    darts: 0, hits: 0, misses: 0, singles: 0, doubles: 0, triples: 0,
    bulls: 0, dbulls: 0, visits: 0, stopperVisits: 0, scorerVisits: 0,
    stopperDarts: 0, scorerDarts: 0, stopperHits: 0, scorerHits: 0, stopperMisses: 0, scorerMisses: 0,
    marks: 0, targetsClosed: 0, points: 0, scoringHits: 0, blockedDarts: 0,
    wastedDarts: 0, bestVisit: 0, bestMarksVisit: 0, bestScoringVisit: 0,
  };
}

function isBot(profile: any, botIds: Set<string>) {
  return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot");
}

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}

function RulesContent({ useBull, maxRounds, isSolo }: { useBull: boolean; maxRounds: number; isSolo: boolean }) {
  return (
    <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.45 }}>
      <div><strong style={{ color: T.cyan }}>{isSolo ? "DUEL SOLO" : "PARTIE EN ÉQUIPES"}</strong><br />{isSolo ? "Les deux joueurs s’affrontent directement : aucun libellé TEAM n’est utilisé." : "Deux équipes alternent leurs joueurs selon l’ordre choisi dans la configuration."}</div>
      <div><strong style={{ color: T.cyan }}>CIBLES</strong><br />15, 16, 17, 18, 19, 20{useBull ? " et Bull" : ""}.</div>
      <div><strong style={{ color: T.gold }}>PHASE 1</strong><br />Le Bloqueur joue en premier et ferme chaque cible en 3 marques : S = 1, D = 2, T = 3. Le Scoreur marque uniquement sur les cibles encore ouvertes.</div>
      <div><strong style={{ color: T.gold }}>PHASE 2</strong><br />Les rôles s’inversent. Le nouveau Bloqueur repart avec un tableau vierge.</div>
      <div><strong style={{ color: T.green }}>VICTOIRE</strong><br />Après la seconde phase, le joueur ou l’équipe avec le plus grand total gagne. Une égalité est possible.</div>
      {maxRounds > 0 ? <div style={{ opacity: .75 }}>Sécurité active : maximum {maxRounds} rounds par phase.</div> : null}
    </div>
  );
}

function roleLabel(team: ScramTeam, stopper: ScramTeam) {
  return team === stopper ? "BLOQUEUR" : "SCOREUR";
}

function randomBotVisit(args: {
  role: "stopper" | "scorer";
  openTargets: ScramTarget[];
  level: string;
}): UiDart[] {
  const baseAccuracy = args.level === "hard" ? .84 : args.level === "easy" ? .46 : .66;
  const weighted = [...args.openTargets].sort((a, b) => b - a);
  return Array.from({ length: 3 }, () => {
    if (!weighted.length || Math.random() > baseAccuracy) {
      const misses = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14];
      return { v: misses[Math.floor(Math.random() * misses.length)] || 0, mult: 1 as const };
    }
    const target = weighted[Math.min(weighted.length - 1, Math.floor(Math.random() * Math.min(3, weighted.length)))];
    if (target === 25) return Math.random() < baseAccuracy * .28 ? { v: 50, mult: 1 } : { v: 25, mult: 1 };
    const roll = Math.random();
    const mult: 1 | 2 | 3 = roll < baseAccuracy * .18 ? 3 : roll < baseAccuracy * .38 ? 2 : 1;
    return { v: target, mult };
  });
}

function teamName(team: ScramTeam, members: any[]) {
  if (members.length === 1) return playerName(members[0]);
  return `ÉQUIPE ${team}`;
}

export default function ScramPlay(props: any) {
  const params = (props?.params || {}) as ScramConfigPayload;
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(params.playersList) ? params.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function"
      ? store.resolveSelectedProfiles(params.selectedIds || [])
      : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => {
      const id = String(profile?.id || "");
      if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) });
    });
    return (params.selectedIds || []).map((id) => byId.get(String(id))).filter(Boolean);
  }, [store, params.selectedIds, params.playersList]);

  const firstStopper: ScramTeam = params.firstStopper === "B" ? "B" : "A";
  const rules = React.useMemo(() => ({
    useBull: params.useBull !== false,
    maxRoundsPerPhase: Number(params.maxRoundsPerPhase || 0) || 0,
    firstStopper,
  }), [params.useBull, params.maxRoundsPerPhase, firstStopper]);

  const { state, play, undo, reset, canUndo, isFinished } = useScramEngine(profiles as any, rules);
  const inputMethod: InputMethod = React.useMemo(() => {
    if (params.inputMethod === "dartboard" || params.inputMethod === "keypad") return params.inputMethod;
    try { return localStorage.getItem(SCORE_INPUT_LS_KEY) === "dartboard" ? "dartboard" : "keypad"; }
    catch { return "keypad"; }
  }, [params.inputMethod]);
  const [hitMode, setHitMode] = React.useState<HitMode>("S");
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showMarksBoard, setShowMarksBoard] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [viewport, setViewport] = React.useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 390,
    height: typeof window !== "undefined" ? window.innerHeight : 780,
  }));
  const matchIdRef = React.useRef(`scram-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const lastBackRef = React.useRef(0);
  const savedRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (isFinished) setShowEnd(true);
  }, [isFinished]);

  React.useEffect(() => {
    const syncViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const byId = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const teamPlayers = React.useMemo(() => ({
    A: (state?.teams?.A || []).map((id) => byId.get(String(id))).filter(Boolean),
    B: (state?.teams?.B || []).map((id) => byId.get(String(id))).filter(Boolean),
  }), [state?.teams, byId]);
  const teamConfigBySide = React.useMemo(() => {
    const out: Partial<Record<ScramTeam, any>> = {};
    for (const team of params.teamConfigs || []) {
      if (team?.side === "A" || team?.side === "B") out[team.side] = team;
    }
    return out;
  }, [params.teamConfigs]);
  const isSolo = params.participantMode !== "teams" && teamPlayers.A.length === 1 && teamPlayers.B.length === 1;
  const teamLogoBySide = React.useMemo(() => ({
    A: teamConfigBySide.A?.logoDataUrl || null,
    B: teamConfigBySide.B?.logoDataUrl || null,
  }), [teamConfigBySide]);
  const displayTeamName = React.useCallback((team: ScramTeam) => {
    if (isSolo && teamPlayers[team][0]) return playerName(teamPlayers[team][0]);
    const configured = String(teamConfigBySide[team]?.name || "").trim();
    return configured || teamName(team, teamPlayers[team]);
  }, [isSolo, teamConfigBySide, teamPlayers]);
  const activePlayer = state?.players?.[state.activePlayerIndex] || null;
  const activeProfile = activePlayer ? byId.get(String(activePlayer.id)) || activePlayer : null;
  const activeTeam: ScramTeam = activePlayer ? state.teamByPlayer[String(activePlayer.id)] : "A";
  const activeStats = activePlayer ? state.statsByPlayer[String(activePlayer.id)] || emptyStats() : emptyStats();
  const botIds = React.useMemo(() => new Set((params.botIds || []).map(String)), [params.botIds]);
  const playableTargets = UI_TARGETS.filter((target) => target !== 25 || state.rules.useBull);
  const stopperMarks = state.marksByTeam[state.stopperTeam];
  const closedCount = playableTargets.filter((target) => stopperMarks[target] >= 3).length;

  React.useEffect(() => {
    if (!activeProfile || state.finished || !isBot(activeProfile, botIds)) {
      setBotThinking(false);
      return;
    }
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const role = activeTeam === state.stopperTeam ? "stopper" : "scorer";
      const openTargets = playableTargets.filter((target) => state.marksByTeam[state.stopperTeam][target] < 3);
      play(randomBotVisit({ role, openTargets, level: params.botLevel || "normal" }));
      setThrowDarts([]);
      setHitMode("S");
      setBotThinking(false);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.phase, state.finished, activePlayer?.id, activeTeam, botIds, params.botLevel]);

  function addDart(value: number, multiplier?: 1 | 2 | 3) {
    if (state.finished || botThinking || throwDarts.length >= 3) return;
    const mult: 1 | 2 | 3 = multiplier || (hitMode === "D" ? 2 : hitMode === "T" ? 3 : 1);
    if (value === 25) {
      setThrowDarts((previous) => [...previous, mult >= 2 ? { v: 50, mult: 1 } : { v: 25, mult: 1 }]);
    } else {
      setThrowDarts((previous) => [...previous, { v: value, mult }]);
    }
    if (mult >= 2) setHitMode("S");
  }

  function validateVisit() {
    if (!throwDarts.length || state.finished || botThinking) return;
    play(throwDarts);
    setThrowDarts([]);
    setHitMode("S");
  }

  function undoVisit() {
    if (!canUndo || botThinking) return;
    undo();
    setThrowDarts([]);
    setHitMode("S");
    setShowEnd(false);
  }

  function backToConfig() {
    const now = Date.now();
    if (now - lastBackRef.current < 350) return;
    lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie Scram en cours ?")) return;
    if (typeof go === "function") go("scram_config", params);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerTeam = state.winnerTeam;
    const winnerId = winnerTeam ? state.teams[winnerTeam][0] || null : null;
    const teamAName = displayTeamName("A");
    const teamBName = displayTeamName("B");
    const ordered = [...state.players].sort((left, right) => {
      const leftTeam = state.teamByPlayer[left.id];
      const rightTeam = state.teamByPlayer[right.id];
      if (winnerTeam && leftTeam !== rightTeam) return leftTeam === winnerTeam ? -1 : 1;
      return (state.statsByPlayer[right.id]?.points || 0) - (state.statsByPlayer[left.id]?.points || 0);
    });
    const richPlayers = ordered.map((player, index) => {
      const profile: any = byId.get(String(player.id)) || player;
      const team = state.teamByPlayer[player.id];
      const stats = state.statsByPlayer[player.id] || emptyStats();
      const metrics = buildPlayerScramMetrics(state, String(player.id), stats);
      const win = Boolean(winnerTeam && team === winnerTeam);
      const totalTargetDarts = stats.scoringHits + stats.blockedDarts + stats.wastedDarts;
      return {
        id: player.id,
        playerId: player.id,
        profileId: player.id,
        name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        team,
        teamIndex: team === "A" ? 0 : 1,
        rolePhase1: team === firstStopper ? "stopper" : "scorer",
        rolePhase2: team === firstStopper ? "scorer" : "stopper",
        win,
        winner: win,
        rank: state.tied ? 1 : win ? 1 : 2,
        score: stats.points,
        points: stats.points,
        darts: stats.darts,
        dartsThrown: stats.darts,
        hits: stats.hits,
        hitRate: metrics.hitRate,
        targetRate: metrics.targetRate,
        missRate: metrics.missRate,
        validHits: stats.scoringHits + stats.marks,
        misses: stats.misses,
        singles: stats.singles,
        doubles: stats.doubles,
        triples: stats.triples,
        bulls: stats.bulls,
        dbulls: stats.dbulls,
        visits: stats.visits,
        stopperVisits: stats.stopperVisits,
        scorerVisits: stats.scorerVisits,
        stopperDarts: metrics.stopperDarts,
        scorerDarts: metrics.scorerDarts,
        stopperHits: stats.stopperHits || 0,
        scorerHits: stats.scorerHits || 0,
        stopperMisses: stats.stopperMisses || 0,
        scorerMisses: stats.scorerMisses || 0,
        marks: stats.marks,
        marksTotal: stats.marks,
        totalMarks: stats.marks,
        closed: stats.targetsClosed,
        closes: stats.targetsClosed,
        closedNumbers: stats.targetsClosed,
        scoringHits: stats.scoringHits,
        scoringAccuracy: percent(stats.scoringHits, Math.max(1, totalTargetDarts)),
        scorerEfficiency: metrics.scorerEfficiency,
        blockedDarts: stats.blockedDarts,
        blockedRate: metrics.blockedRate,
        wastedDarts: stats.wastedDarts,
        wastedRate: metrics.wastedRate,
        bestVisit: metrics.bestScoringVisit,
        bestScoringVisit: metrics.bestScoringVisit,
        bestMarksVisit: metrics.bestMarksVisit,
        mpr: metrics.mpr,
        marksPerStopperVisit: metrics.marksPerStopperVisit,
        pointsPerScorerVisit: metrics.pointsPerScorerVisit,
        pointsPerScorerDart: metrics.pointsPerScorerDart,
        closesPerStopperVisit: metrics.closesPerStopperVisit,
        onTargetDarts: metrics.onTargetDarts,
        segmentStats: metrics.segmentStats,
        phaseStats: metrics.phaseStats,
        rawStats: { ...stats, ...metrics },
        _order: index,
      };
    });
    const teams = (["A", "B"] as ScramTeam[]).map((team) => {
      const members = richPlayers.filter((player) => player.team === team);
      return {
        id: team,
        name: team === "A" ? teamAName : teamBName,
        playerIds: state.teams[team],
        players: state.teams[team],
        score: state.scores[team],
        winner: winnerTeam === team,
        color: teamConfigBySide[team]?.color || TEAM_COLOR[team],
        logoDataUrl: teamConfigBySide[team]?.logoDataUrl || null,
        darts: members.reduce((sum, player) => sum + Number(player.darts || 0), 0),
        visits: members.reduce((sum, player) => sum + Number(player.visits || 0), 0),
        points: members.reduce((sum, player) => sum + Number(player.points || 0), 0),
        marks: members.reduce((sum, player) => sum + Number(player.marks || 0), 0),
        closes: members.reduce((sum, player) => sum + Number(player.closed || 0), 0),
        scoringHits: members.reduce((sum, player) => sum + Number(player.scoringHits || 0), 0),
        blockedDarts: members.reduce((sum, player) => sum + Number(player.blockedDarts || 0), 0),
        bestScoringVisit: members.reduce((best, player) => Math.max(best, Number(player.bestScoringVisit || 0)), 0),
        bestMarksVisit: members.reduce((best, player) => Math.max(best, Number(player.bestMarksVisit || 0)), 0),
      };
    });
    const winnerIds = winnerTeam ? [...state.teams[winnerTeam]] : [];
    const allDarts = richPlayers.reduce((total, player) => total + Number(player.dartsThrown || 0), 0);
    const allVisits = richPlayers.reduce((total, player) => total + Number(player.visits || 0), 0);
    const allPoints = richPlayers.reduce((total, player) => total + Number(player.points || 0), 0);
    const allMarks = richPlayers.reduce((total, player) => total + Number(player.marks || 0), 0);
    const allCloses = richPlayers.reduce((total, player) => total + Number(player.closed || 0), 0);
    const summary = {
      kind: "scram",
      mode: "scram",
      finished: true,
      participantMode: params.participantMode || (isSolo ? "players" : "teams"),
      inputMethod,
      winnerId,
      winnerIds,
      winnerTeam,
      winnerName: state.tied ? "Égalité" : winnerTeam ? displayTeamName(winnerTeam) : "Égalité",
      tied: state.tied,
      scoreA: state.scores.A,
      scoreB: state.scores.B,
      scoreLine: `${teamAName} ${state.scores.A} — ${state.scores.B} ${teamBName}`,
      rounds: state.phaseRounds[1] + state.phaseRounds[2],
      phaseRounds: state.phaseRounds,
      darts: allDarts,
      visits: allVisits,
      points: allPoints,
      marks: allMarks,
      closes: allCloses,
      bestScoringVisit: richPlayers.reduce((best, player) => Math.max(best, Number(player.bestScoringVisit || 0)), 0),
      bestMarksVisit: richPlayers.reduce((best, player) => Math.max(best, Number(player.bestMarksVisit || 0)), 0),
      finishReason: state.finishReason,
      duration: Math.max(0, now - state.startedAt),
      teamAProfileIds: state.teams.A,
      teamBProfileIds: state.teams.B,
      teams,
      game: { mode: "scram", teams },
      rankings: richPlayers,
      players: richPlayers,
      perPlayer: richPlayers,
      detailedByPlayer: Object.fromEntries(richPlayers.map((player) => [player.id, player])),
    };
    return {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "scram",
      status: "finished",
      createdAt: state.startedAt,
      updatedAt: now,
      winnerId,
      winnerIds,
      winnerTeam,
      teamAProfileIds: state.teams.A,
      teamBProfileIds: state.teams.B,
      players: richPlayers,
      game: { mode: "scram", teams },
      summary,
      payload: {
        kind: "scram",
        mode: "scram",
        sport: "darts",
        winnerId,
        winnerIds,
        winnerTeam,
        tied: state.tied,
        config: params,
        rules: state.rules,
        teams,
        players: richPlayers,
        summary,
        visits: state.history,
        visitHistory: state.history,
        state: {
          phase: state.phase,
          scores: state.scores,
          marksByTeam: state.marksByTeam,
          phaseRounds: state.phaseRounds,
          finishReason: state.finishReason,
        },
        stats: {
          sport: "darts",
          mode: "scram",
          players: richPlayers,
          teams,
          global: {
            duration: Math.max(0, now - state.startedAt),
            rounds: summary.rounds,
            phaseRounds: state.phaseRounds,
            darts: allDarts,
            visits: allVisits,
            points: allPoints,
            marks: allMarks,
            closes: allCloses,
            bestScoringVisit: summary.bestScoringVisit,
            bestMarksVisit: summary.bestMarksVisit,
            finishReason: state.finishReason,
            inputMethod,
            participantMode: summary.participantMode,
          },
        },
      },
    };
  }

  function persistFinished(navigate: boolean) {
    const id = matchIdRef.current;
    if (savedRef.current.has(id)) return;
    savedRef.current.add(id);
    onFinish?.(buildHistoryRecord(), { navigate });
  }

  function saveAndQuit() {
    persistFinished(true);
  }

  function saveAndReplay() {
    persistFinished(false);
    reset();
    matchIdRef.current = `scram-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setThrowDarts([]);
    setHitMode("S");
    setShowEnd(false);
  }

  const phaseProgress = playableTargets.length ? (closedCount / playableTargets.length) * 100 : 0;

  const tickerHeight = viewport.height < 690 ? 48 : 56;
  const dartboardSize = Math.max(132, Math.min(220, viewport.width - 44, Math.floor(viewport.height * .27)));
  const activeColor = TEAM_COLOR[activeTeam];
  const sideNames: Record<ScramTeam, string> = { A: displayTeamName("A"), B: displayTeamName("B") };

  return (
    <div style={{ height: "100dvh", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", color: T.text, background: "radial-gradient(circle at 50% -5%, #1e3154 0, #080b16 44%, #020309 100%)" }}>
      <PageHeader
        tickerSrc={tickerScram}
        tickerAlt="SCRAM"
        tickerEdgeFade="strong"
        tickerHeight={tickerHeight}
        left={<BackDot onClick={backToConfig} color={T.cyan} glow="rgba(66,214,255,.62)" title="Retour à la configuration" />}
        right={<InfoDot title="Règles du Scram" color={T.gold} glow="rgba(255,215,106,.58)" content={<RulesContent useBull={state.rules.useBull} maxRounds={state.rules.maxRoundsPerPhase} isSolo={isSolo} />} />}
      />

      <main style={{ flex: 1, minHeight: 0, width: "100%", boxSizing: "border-box", padding: "6px 7px max(5px, env(safe-area-inset-bottom))", display: "grid", gridTemplateRows: "auto auto minmax(0,1fr)", gap: 6, overflow: "hidden", position: "relative" }}>
        <section style={{ ...panelStyle(), minWidth: 0, padding: 6, borderColor: `${activeColor}66`, boxShadow: `0 0 18px ${activeColor}20, inset 0 0 18px ${activeColor}0c` }}>
          <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr) 106px", gap: 6, alignItems: "stretch" }}>
            <div style={{ minWidth: 0, display: "grid", justifyItems: "center", alignContent: "center", gap: 2, padding: "2px 0" }}>
              <div style={{ width: 52, height: 52, position: "relative", flex: "0 0 auto" }}>
                <div style={{ position: "absolute", inset: 4 }}><ProfileAvatar profile={activeProfile as any} size={44} /></div>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><ProfileStarRing profile={activeProfile as any} size={52} glow /></div>
              </div>
              <div style={{ maxWidth: "100%", fontSize: 15, fontWeight: 1000, lineHeight: 1.05, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
              <div style={{ fontSize: 10.5, fontWeight: 1000, color: activeColor, textAlign: "center", letterSpacing: .3 }}>{roleLabel(activeTeam, state.stopperTeam)}</div>
              {!isSolo && teamPlayers[activeTeam].length > 1 ? <div style={{ maxWidth: "100%", color: T.soft, fontSize: 8.5, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayTeamName(activeTeam)}</div> : null}
            </div>

            <div style={{ minWidth: 0, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 3, paddingTop: 1 }}>
                {Array.from({ length: 3 }, (_, index) => <DartIconColorizable key={index} color={activeColor} active={index < throwDarts.length} size={22} />)}
              </div>
              <div style={{ position: "relative", minHeight: 0, borderRadius: 14, border: `1px solid ${T.stroke}`, background: "linear-gradient(180deg, rgba(17,25,44,.92), rgba(8,11,18,.84))", overflow: "hidden", padding: "6px 10px" }}>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", opacity: .14 }}>
                    <ScoreGhostVisual logoSrc={teamLogoBySide.A} fallbackProfile={teamPlayers.A[0]} size={68} />
                  </div>
                  <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", opacity: .14 }}>
                    <ScoreGhostVisual logoSrc={teamLogoBySide.B} fallbackProfile={teamPlayers.B[0]} size={68} />
                  </div>
                </div>
                <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1px 1fr", alignItems: "center", height: "100%", minHeight: 62 }}>
                  <div style={{ display: "grid", placeItems: "center", minWidth: 0, minHeight: 0, borderRadius: 12, background: activeTeam === "A" ? `${TEAM_COLOR.A}10` : "transparent" }}>
                    <div style={{ fontSize: "clamp(28px,5.5dvh,42px)", lineHeight: 1, fontWeight: 1000, color: TEAM_COLOR.A, textShadow: `0 0 14px ${TEAM_COLOR.A}66` }}>{state.scores.A}</div>
                  </div>
                  <div style={{ width: 1, height: "62%", justifySelf: "center", background: "rgba(255,255,255,.16)" }} />
                  <div style={{ display: "grid", placeItems: "center", minWidth: 0, minHeight: 0, borderRadius: 12, background: activeTeam === "B" ? `${TEAM_COLOR.B}10` : "transparent" }}>
                    <div style={{ fontSize: "clamp(28px,5.5dvh,42px)", lineHeight: 1, fontWeight: 1000, color: TEAM_COLOR.B, textShadow: `0 0 14px ${TEAM_COLOR.B}66` }}>{state.scores.B}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ minWidth: 0, display: "grid", gridTemplateRows: "auto auto 1fr", gap: 4 }}>
              <div style={{ textAlign: "right", fontSize: 9.5, color: T.soft, fontWeight: 1000, letterSpacing: .35 }}>PHASE {state.phase}/2 • R{state.round}</div>
              <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ width: `${phaseProgress}%`, height: "100%", borderRadius: 999, background: TEAM_COLOR[state.stopperTeam], boxShadow: `0 0 8px ${TEAM_COLOR[state.stopperTeam]}` }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <MiniKpi label="DARTS" value={activeStats.darts} />
                <MiniKpi label="POINTS" value={activeStats.points} />
                <MiniKpi label="MARKS" value={activeStats.marks} />
                <MiniKpi label="BEST" value={activeStats.bestVisit} />
              </div>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setShowMarksBoard(true)}
          style={{
            ...panelStyle(),
            minWidth: 0,
            padding: 0,
            overflow: "hidden",
            cursor: "pointer",
            backgroundImage: `linear-gradient(90deg, rgba(5,8,16,.94), rgba(18,13,6,.50), rgba(5,8,16,.94)), url(${tickerScram})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "8px 10px" }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 1000, color: T.gold, letterSpacing: .4 }}>MARQUEURS</div>
              <div style={{ fontSize: 8.8, color: T.soft }}>Touchez pour ouvrir</div>
            </div>
            <div style={{ minWidth: 0, display: "grid", gridTemplateColumns: `repeat(${playableTargets.length}, minmax(0,1fr))`, gap: 3 }}>
              {playableTargets.map((target) => {
                const closed = stopperMarks[target] >= 3;
                return (
                  <div key={target} style={{ minWidth: 0, padding: "4px 0", borderRadius: 999, border: `1px solid ${closed ? TARGET_COLOR[target] + '88' : 'rgba(255,255,255,.10)'}`, background: closed ? `${TARGET_COLOR[target]}16` : "rgba(0,0,0,.18)", color: TARGET_COLOR[target], fontWeight: 1000, fontSize: target === 25 ? 9.5 : 11.5, lineHeight: 1, textAlign: "center", textShadow: closed ? `0 0 10px ${TARGET_COLOR[target]}55` : "none" }}>{target === 25 ? "BULL" : target}</div>
                );
              })}
            </div>
            <div style={{ color: T.text, fontSize: 18, fontWeight: 900 }}>›</div>
          </div>
        </button>

        <section style={{ ...panelStyle(), minWidth: 0, minHeight: 0, padding: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", minHeight: 0, display: "grid", gridTemplateRows: inputMethod === "dartboard" ? "auto minmax(0,1fr) auto" : "auto auto auto", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: state.rules.useBull ? "1fr 1fr 1fr" : "1fr 1fr", gap: 5 }}>
              <ModeButton label="DOUBLE" color="#31c9ef" active={hitMode === "D"} onClick={() => setHitMode(hitMode === "D" ? "S" : "D")} disabled={state.finished || botThinking} />
              <ModeButton label="TRIPLE" color="#c24cff" active={hitMode === "T"} onClick={() => setHitMode(hitMode === "T" ? "S" : "T")} disabled={state.finished || botThinking} />
              {state.rules.useBull ? <ModeButton label="BULL" color="#28dc92" active={false} onClick={() => addDart(25)} disabled={state.finished || botThinking || throwDarts.length >= 3} /> : null}
            </div>

            {inputMethod === "dartboard" ? (
              <div style={{ minHeight: 0, display: "grid", placeItems: "center", overflow: "hidden" }}>
                <DartboardClickable
                  size={dartboardSize}
                  multiplier={hitMode === "T" ? 3 : hitMode === "D" ? 2 : 1}
                  disabled={state.finished || botThinking}
                  onHit={(segment, multiplier) => addDart(segment, multiplier)}
                />
              </div>
            ) : (
              <div style={{ padding: 4, borderRadius: 11, background: "rgba(0,0,0,.23)", border: `1px solid ${T.stroke}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4 }}>
                  {Array.from({ length: 21 }, (_, value) => {
                    const target = value >= 15 && value <= 20;
                    const color = target ? TARGET_COLOR[value as ScramTarget] : T.text;
                    return <button key={value} type="button" onClick={() => addDart(value)} disabled={state.finished || botThinking || throwDarts.length >= 3} style={{ height: "clamp(29px,4.8dvh,38px)", minWidth: 0, padding: 0, borderRadius: 8, border: target ? `1px solid ${color}bb` : `1px solid ${T.stroke}`, background: "linear-gradient(145deg,#152039,#080c18)", color, fontWeight: 1000, fontSize: 12.5, cursor: "pointer", boxShadow: target ? `0 0 8px ${color}28` : "none", opacity: state.finished || botThinking ? .48 : 1 }}>{value}</button>;
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <ActionButton label="ANNULER" color={T.red} disabled={botThinking || (!throwDarts.length && !canUndo)} onClick={() => throwDarts.length ? setThrowDarts([]) : undoVisit()} />
              <ActionButton label="VALIDER" color={T.green} disabled={botThinking || !throwDarts.length || state.finished} onClick={validateVisit} />
            </div>
          </div>
        </section>

        {showMarksBoard ? (
          <MarksOverlay
            playableTargets={playableTargets}
            marksByTeam={state.marksByTeam}
            teamLogoBySide={teamLogoBySide}
            teamPlayers={teamPlayers}
            onClose={() => setShowMarksBoard(false)}
          />
        ) : null}
      </main>

      {showEnd && state.finished ? (
        <EndModal
          state={state}
          profilesById={byId}
          sideNames={sideNames}
          isSolo={isSolo}
          onClose={() => setShowEnd(false)}
          onSave={saveAndQuit}
          onReplay={saveAndReplay}
        />
      ) : null}
    </div>
  );
}

function panelStyle(): React.CSSProperties {
  return { borderRadius: 18, border: `1px solid ${T.stroke}`, background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(5,8,16,.72))", boxShadow: "0 14px 30px rgba(0,0,0,.25)" };
}

function ModeButton({ label, color, active, onClick, disabled }: any) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ minHeight: 31, padding: "3px 4px", borderRadius: 999, border: `1px solid ${active ? color : T.stroke}`, background: active ? `linear-gradient(180deg,${color}55,${color}18)` : "rgba(0,0,0,.24)", color: active ? "#fff" : color, fontWeight: 1000, fontSize: 10.5, letterSpacing: .45, boxShadow: active ? `0 0 12px ${color}48` : "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .42 : 1 }}>{label}</button>;
}

function ActionButton({ label, color, disabled, onClick }: any) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ minHeight: 34, padding: "4px 6px", borderRadius: 999, border: `1px solid ${color}88`, background: disabled ? "rgba(255,255,255,.055)" : `linear-gradient(180deg,${color}88,${color}32)`, color: disabled ? "rgba(255,255,255,.4)" : "#fff", fontWeight: 1000, fontSize: 10.5, letterSpacing: .75, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : `0 0 11px ${color}30` }}>{label}</button>;
}

function MiniKpi({ label, value }: { label: string; value: number }) {
  return <div style={{ minWidth: 0, padding: "3px 2px", borderRadius: 8, textAlign: "center", background: "rgba(255,255,255,.042)", border: `1px solid ${T.stroke}` }}><div style={{ color: T.soft, fontSize: 7.5, fontWeight: 1000 }}>{label}</div><div style={{ color: T.cyan, fontSize: 12.5, lineHeight: 1.05, fontWeight: 1000, marginTop: 1 }}>{value}</div></div>;
}

function ScoreGhostVisual({ logoSrc, fallbackProfile, size = 64 }: { logoSrc?: string | null; fallbackProfile?: any; size?: number }) {
  if (logoSrc) {
    return <img src={logoSrc} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: 16, display: "block" }} />;
  }
  if (fallbackProfile) {
    return <ProfileAvatar profile={fallbackProfile as any} size={size} noFrame showStars={false} />;
  }
  return <div style={{ width: size, height: size, borderRadius: size / 2, background: "rgba(255,255,255,.08)" }} />;
}

function MarksOverlay({ playableTargets, marksByTeam, teamLogoBySide, teamPlayers, onClose }: any) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, display: "grid", placeItems: "center", padding: 14, background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)" }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(520px, 94vw)", maxHeight: "78dvh", overflowY: "auto", borderRadius: 22, padding: 14, color: T.text, background: "linear-gradient(180deg,#16223a,#070a12)", border: `1px solid ${T.gold}55`, boxShadow: `0 0 30px ${T.gold}22` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: T.soft, fontWeight: 1000, letterSpacing: 1 }}>SCRAM</div>
            <div style={{ fontSize: 18, color: T.gold, fontWeight: 1000 }}>MARQUEURS DES SEGMENTS</div>
          </div>
          <button type="button" onClick={onClose} style={{ minHeight: 34, padding: "6px 14px", borderRadius: 999, border: `1px solid ${T.stroke}`, background: "rgba(255,255,255,.04)", color: T.text, fontWeight: 900, cursor: "pointer" }}>FERMER</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 1fr", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "center" }}><ScoreGhostVisual logoSrc={teamLogoBySide?.A} fallbackProfile={teamPlayers?.A?.[0]} size={44} /></div>
          <div />
          <div style={{ display: "flex", justifyContent: "center" }}><ScoreGhostVisual logoSrc={teamLogoBySide?.B} fallbackProfile={teamPlayers?.B?.[0]} size={44} /></div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {playableTargets.map((target: ScramTarget) => (
            <div key={target} style={{ minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) 48px minmax(0,1fr)", gap: 6, alignItems: "stretch" }}>
              <div style={{ minHeight: 0, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${(marksByTeam?.A?.[target] || 0) >= 3 ? TEAM_COLOR.A + '88' : 'rgba(255,255,255,.08)'}`, background: (marksByTeam?.A?.[target] || 0) >= 3 ? `${TEAM_COLOR.A}12` : "rgba(20,31,54,.48)" }}><CricketMarkIcon marks={marksByTeam?.A?.[target] || 0} color={TEAM_COLOR.A} size={20} glow /></div>
              <div style={{ display: "grid", placeItems: "center", color: TARGET_COLOR[target], fontSize: target === 25 ? 12 : 18, fontWeight: 1000, textShadow: `0 0 10px ${TARGET_COLOR[target]}88` }}>{targetLabel(target)}</div>
              <div style={{ minHeight: 0, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${(marksByTeam?.B?.[target] || 0) >= 3 ? TEAM_COLOR.B + '88' : 'rgba(255,255,255,.08)'}`, background: (marksByTeam?.B?.[target] || 0) >= 3 ? `${TEAM_COLOR.B}12` : "rgba(20,31,54,.48)" }}><CricketMarkIcon marks={marksByTeam?.B?.[target] || 0} color={TEAM_COLOR.B} size={20} glow /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EndModal({ state, profilesById, sideNames, isSolo, onClose, onSave, onReplay }: any) {
  const rows = state.players.map((player: any) => {
    const team: ScramTeam = state.teamByPlayer[player.id];
    const stats: ScramPlayerStats = state.statsByPlayer[player.id] || emptyStats();
    const metrics = buildPlayerScramMetrics(state, String(player.id), stats);
    return { player, profile: profilesById.get(String(player.id)) || player, team, stats, metrics };
  });
  const winnerLabel = state.tied ? "ÉGALITÉ" : `${sideNames?.[state.winnerTeam] || `ÉQUIPE ${state.winnerTeam}`} GAGNE`;
  const totalDarts = rows.reduce((sum: number, row: any) => sum + Number(row.stats.darts || 0), 0);
  const totalVisits = rows.reduce((sum: number, row: any) => sum + Number(row.stats.visits || 0), 0);
  const totalMarks = rows.reduce((sum: number, row: any) => sum + Number(row.stats.marks || 0), 0);
  const totalPoints = rows.reduce((sum: number, row: any) => sum + Number(row.stats.points || 0), 0);
  const totalCloses = rows.reduce((sum: number, row: any) => sum + Number(row.stats.targetsClosed || 0), 0);
  const bestScoringVisit = rows.reduce((best: number, row: any) => Math.max(best, Number(row.metrics.bestScoringVisit || 0)), 0);
  const bestMarksVisit = rows.reduce((best: number, row: any) => Math.max(best, Number(row.metrics.bestMarksVisit || 0)), 0);
  const columns: Array<[string, (row: any) => React.ReactNode]> = [
    ["Joueur", (row) => playerName(row.profile)],
    ...(!isSolo ? [["Équipe", (row: any) => sideNames?.[row.team] || row.team] as [string, (row: any) => React.ReactNode]] : []),
    ["Pts", (row) => row.stats.points], ["Marks", (row) => row.stats.marks], ["Ferm.", (row) => row.stats.targetsClosed],
    ["Darts", (row) => row.stats.darts], ["Volées", (row) => row.stats.visits], ["Hit %", (row) => `${row.metrics.hitRate.toFixed(1)}%`],
    ["Cible %", (row) => `${row.metrics.targetRate.toFixed(1)}%`], ["MPR", (row) => row.metrics.mpr.toFixed(2)],
    ["Pts/volée", (row) => row.metrics.pointsPerScorerVisit.toFixed(1)], ["Marks/volée", (row) => row.metrics.marksPerStopperVisit.toFixed(2)],
    ["Best pts", (row) => row.metrics.bestScoringVisit], ["Best marks", (row) => row.metrics.bestMarksVisit],
    ["Score hits", (row) => row.stats.scoringHits], ["Bloquées", (row) => row.stats.blockedDarts], ["Hors cible", (row) => row.stats.wastedDarts],
    ["S", (row) => row.stats.singles], ["D", (row) => row.stats.doubles], ["T", (row) => row.stats.triples],
    ["Bull", (row) => row.stats.bulls], ["DBull", (row) => row.stats.dbulls], ["Miss", (row) => row.stats.misses],
  ];
  const globalKpis = [
    ["ROUNDS", Number(state.phaseRounds?.[1] || 0) + Number(state.phaseRounds?.[2] || 0)],
    ["VOLÉES", totalVisits], ["DARTS", totalDarts], ["POINTS", totalPoints],
    ["MARKS", totalMarks], ["FERMETURES", totalCloses], ["BEST SCORE", bestScoringVisit], ["BEST MARKS", bestMarksVisit],
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 12, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)" }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(860px,97vw)", maxHeight: "91dvh", overflowY: "auto", borderRadius: 22, padding: 14, color: T.text, background: "linear-gradient(180deg,#16223a,#070a12)", border: `1px solid ${state.tied ? T.cyan : TEAM_COLOR[state.winnerTeam as ScramTeam]}99`, boxShadow: `0 0 34px ${state.tied ? T.cyan : TEAM_COLOR[state.winnerTeam as ScramTeam]}30` }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: T.soft, fontWeight: 1000, letterSpacing: 1.3 }}>FIN DU SCRAM</div>
          <div style={{ marginTop: 3, fontSize: 22, fontWeight: 1000, color: state.tied ? T.cyan : TEAM_COLOR[state.winnerTeam as ScramTeam], textShadow: "0 0 14px currentColor" }}>{winnerLabel}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", margin: "11px 0" }}>
          <TeamResult team="A" label={sideNames?.A || (isSolo ? "Joueur A" : "ÉQUIPE A")} score={state.scores.A} winner={state.winnerTeam === "A"} />
          <div style={{ color: T.soft, fontWeight: 1000 }}>—</div>
          <TeamResult team="B" label={sideNames?.B || (isSolo ? "Joueur B" : "ÉQUIPE B")} score={state.scores.B} winner={state.winnerTeam === "B"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginBottom: 11 }}>
          {globalKpis.map(([label, value]) => <MiniKpi key={String(label)} label={String(label)} value={Number(value)} />)}
        </div>

        <div style={{ fontSize: 11.5, color: T.cyan, fontWeight: 1000, marginBottom: 7 }}>STATS COMPLÈTES DES JOUEURS</div>
        <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${T.stroke}` }}>
          <table style={{ width: "100%", minWidth: 1580, borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead><tr style={{ color: T.cyan, background: "rgba(66,214,255,.08)", textAlign: "left" }}>{columns.map(([label]) => <th key={label} style={{ padding: "7px 6px", borderBottom: `1px solid ${T.stroke}`, whiteSpace: "nowrap" }}>{label}</th>)}</tr></thead>
            <tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ background: state.winnerTeam === row.team ? `${TEAM_COLOR[row.team]}0e` : "transparent" }}>{columns.map(([label, read]) => <td key={label} style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,.06)", fontWeight: label === "Joueur" ? 1000 : 800, color: label === "Équipe" ? TEAM_COLOR[row.team] : T.text, whiteSpace: "nowrap" }}>{read(row)}</td>)}</tr>)}</tbody>
          </table>
        </div>

        <div style={{ marginTop: 11, display: "grid", gap: 8 }}>
          {rows.map((row: any) => (
            <div key={`role-${row.player.id}`} style={{ borderRadius: 14, border: `1px solid ${TEAM_COLOR[row.team]}44`, background: `${TEAM_COLOR[row.team]}08`, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 7 }}>
                <div style={{ fontWeight: 1000 }}>{playerName(row.profile)}</div>
                <div style={{ color: TEAM_COLOR[row.team], fontSize: 10, fontWeight: 1000 }}>{isSolo ? "DUEL" : sideNames?.[row.team] || `ÉQUIPE ${row.team}`}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
                <MiniKpi label="VOL. BLOQUEUR" value={row.stats.stopperVisits} /><MiniKpi label="DARTS BLOQ." value={row.metrics.stopperDarts} />
                <MiniKpi label="MPR BLOQ." value={row.metrics.mpr} /><MiniKpi label="BEST MARKS" value={row.metrics.bestMarksVisit} />
                <MiniKpi label="VOL. SCOREUR" value={row.stats.scorerVisits} /><MiniKpi label="DARTS SCORE" value={row.metrics.scorerDarts} />
                <MiniKpi label="PTS/VOLÉE" value={row.metrics.pointsPerScorerVisit} /><MiniKpi label="BEST SCORE" value={row.metrics.bestScoringVisit} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 13 }}>
          <ActionButton label="SAUVER & QUITTER" color={T.red} onClick={onSave} disabled={false} />
          <ActionButton label="SAUVER & REJOUER" color={T.green} onClick={onReplay} disabled={false} />
        </div>
        <button type="button" onClick={onClose} style={{ width: "100%", minHeight: 40, marginTop: 9, borderRadius: 999, border: `1px solid ${T.stroke}`, background: "rgba(255,255,255,.04)", color: T.soft, fontWeight: 900 }}>REVOIR LA PARTIE</button>
      </div>
    </div>
  );
}

function TeamResult({ team, label, score, winner }: { team: ScramTeam; label: string; score: number; winner: boolean }) {
  const color = TEAM_COLOR[team];
  return <div style={{ minWidth: 0, padding: 12, borderRadius: 16, textAlign: "center", border: `1px solid ${winner ? color : T.stroke}`, background: winner ? `${color}16` : "rgba(255,255,255,.035)", boxShadow: winner ? `0 0 18px ${color}30` : "none" }}><div style={{ color, fontSize: 11, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div><div style={{ fontSize: 32, fontWeight: 1000, marginTop: 2 }}>{score}</div></div>;
}
