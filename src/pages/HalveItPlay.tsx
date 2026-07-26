// @ts-nocheck
// =============================================================
// HALVE-IT — Play complet
// Joueurs / équipes / bots / undo / stats / historique
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
  cloneHalveItState,
  createHalveItState,
  emptyHalveItStats,
  getHalveItActivePlayerId,
  getHalveItCurrentTarget,
  halveItTargetScore,
  playHalveItVisit,
  type HalveItConfigPayload,
  type HalveItPlayerStats,
  type HalveItState,
  type HalveItTarget,
  type HalveItTeamConfig,
} from "../lib/gameEngines/halveItEngine";
import tickerHalveIt from "../assets/tickers/ticker_halve_it.png";
import targetBg from "../assets/target_bg.png";

type UiDart = { v: number; mult: 1 | 2 | 3 };
const C = { gold: "#ffd76a", cyan: "#42d6ff", green: "#65efb4", red: "#ff667e", pink: "#ff63b8", text: "#f8fafc", soft: "rgba(226,232,240,.72)" };

function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function avg(value: number, total: number) { return total > 0 ? Math.round((value / total) * 10) / 10 : 0; }
function fmtDuration(ms: number) { const total = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }

function toGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function uiLabel(dart: UiDart) {
  if (!dart || dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function normalizeConfig(props: any): HalveItConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  const preset = ["classic7", "extended9", "expert12", "numbers7"].includes(String(raw?.sequencePreset)) ? raw.sequencePreset : "classic7";
  const startMode = raw?.startMode === "fixed" || raw?.startMode === "opening_visit" ? raw.startMode : "zero";
  return {
    mode: "halve_it",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 1)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    sequencePreset: preset,
    customTargets: Array.isArray(raw?.customTargets) ? raw.customTargets : undefined,
    startMode,
    fixedStartingScore: Math.max(0, Math.min(9999, Number(raw?.fixedStartingScore ?? 40) || 0)),
    rounding: raw?.rounding === "ceil" ? "ceil" : "floor",
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function targetHint(target: HalveItTarget) {
  if (target.kind === "open") return "Toute la cible compte";
  if (target.kind === "double") return "N’importe quel double";
  if (target.kind === "triple") return "N’importe quel triple";
  if (target.kind === "bull") return "BULL 25 ou DBULL 50";
  return `S${target.value} / D${target.value} / T${target.value}`;
}

function botHitChance(level: string) {
  const v = String(level || "").toLowerCase();
  if (v.includes("hard") || v.includes("pro") || v.includes("diffic")) return .62;
  if (v.includes("easy") || v.includes("facile")) return .28;
  return .44;
}
function randomNormalDart(): UiDart {
  if (Math.random() < .11) return { v: 0, mult: 1 };
  if (Math.random() < .08) return { v: 25, mult: Math.random() < .22 ? 2 : 1 };
  const v = 1 + Math.floor(Math.random() * 20);
  const r = Math.random();
  return { v, mult: r < .12 ? 3 : r < .25 ? 2 : 1 };
}
function randomBotVisit(target: HalveItTarget, level: string): UiDart[] {
  const chance = botHitChance(level);
  return Array.from({ length: 3 }, () => {
    if (target.kind === "open") return randomNormalDart();
    if (Math.random() < chance) {
      if (target.kind === "bull") return { v: 25, mult: Math.random() < (level === "hard" ? .34 : .18) ? 2 : 1 };
      if (target.kind === "double") return { v: 1 + Math.floor(Math.random() * 20), mult: 2 };
      if (target.kind === "triple") return { v: 1 + Math.floor(Math.random() * 20), mult: 3 };
      const roll = Math.random();
      return { v: Number(target.value || 20), mult: roll < .24 ? 3 : roll < .42 ? 2 : 1 };
    }
    return randomNormalDart();
  });
}

function RulesContent({ config, primary }: { config: HalveItConfigPayload; primary: string }) {
  const start = config.startMode === "opening_visit" ? "une volée libre initiale" : config.startMode === "fixed" ? `${config.fixedStartingScore} points` : "0 point";
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: primary }}>DÉPART</strong><br />Chaque joueur commence avec {start}.</div>
    <div><strong style={{ color: primary }}>CONTRAT</strong><br />Tous les joueurs jouent la même cible avant de passer à la suivante. Seules les touches qui respectent le contrat rapportent des points.</div>
    <div><strong style={{ color: C.green }}>RÉUSSITE</strong><br />S/D/T sur un numéro comptent à leur valeur réelle. Les rounds DOUBLE, TRIPLE et BULL acceptent toute touche de leur catégorie.</div>
    <div><strong style={{ color: C.red }}>HALVE</strong><br />0 touche valide sur les 3 fléchettes = score courant divisé par deux, arrondi {config.rounding === "ceil" ? "au supérieur" : "à l’inférieur"}.</div>
    <div><strong style={{ color: C.gold }}>VICTOIRE</strong><br />Après la dernière cible, le total le plus élevé gagne. En équipes, les scores des membres sont additionnés.</div>
    <div><strong style={{ color: primary }}>ANNULER</strong><br />ANNULER retire la dernière fléchette ; volée vide, il restaure le tour précédent.</div>
  </div>;
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || null;
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${team?.color || C.gold}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${team?.color || C.gold}18`, boxShadow: `0 0 15px ${team?.color || C.gold}44`, flex: "0 0 auto" }}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: team?.color || C.gold, fontWeight: 1000, fontSize: size * .34 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}</div>;
}

export default function HalveItPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || C.gold;
  const secondary = theme?.accent1 || primary;
  const themeText = theme?.text || C.text;
  const themeSoft = theme?.textSoft || C.soft;
  const themeStroke = theme?.borderSoft || "rgba(255,255,255,.10)";

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = (config.selectedIds || []).map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);

  const teamConfigs = React.useMemo<HalveItTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({
    id: String(team?.id || `team-${index + 1}`), name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color || [C.gold, C.pink, C.cyan, C.green][index % 4], logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
    playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [], isBotTeam: Boolean(team?.isBotTeam),
  })), [config.teamConfigs]);

  const rules = React.useMemo(() => ({
    participantMode: config.participantMode,
    sequencePreset: config.sequencePreset,
    customTargets: config.customTargets,
    startMode: config.startMode,
    fixedStartingScore: config.fixedStartingScore,
    rounding: config.rounding,
  }), [config]);

  const initialState = React.useMemo(() => createHalveItState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<HalveItState>(initialState);
  const [undoStack, setUndoStack] = React.useState<HalveItState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`halveit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const activePlayerId = getHalveItActivePlayerId(state);
  const activeProfile = byId.get(String(activePlayerId)) || state.players.find((p) => p.id === activePlayerId) || state.players[0];
  const activeStats = state.statsByPlayer[activePlayerId] || emptyHalveItStats();
  const activeTeamId = state.teamByPlayer[activePlayerId] || null;
  const activeTeam = activeTeamId ? teamById.get(activeTeamId) : null;
  const activeScore = Number(state.scoresByPlayer[activePlayerId] || 0);
  const target = getHalveItCurrentTarget(state);
  const targetLabel = target?.label || "—";
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  function commitVisit(darts: UiDart[]) {
    if (state.finished || darts.length < 1) return;
    setUndoStack((stack) => [...stack.slice(-49), cloneHalveItState(state)]);
    setState((prev) => playHalveItVisit(prev, darts.map(toGameDart)));
    setThrowDarts([]); setMultiplier(1); setNotice("");
  }
  function addDart(value: number, directMultiplier?: 1 | 2 | 3) {
    if (state.finished || botThinking || throwDarts.length >= 3) return;
    const mult = directMultiplier || multiplier;
    const dart: UiDart = value === 25 ? { v: 25, mult: mult === 2 ? 2 : 1 } : { v: Math.max(0, Math.min(20, Number(value) || 0)), mult };
    const next = [...throwDarts, dart]; setThrowDarts(next); if (mult > 1) setMultiplier(1);
    if (next.length === 3) setNotice("Volée complète — VALIDER");
  }
  function validateVisit() {
    if (state.finished || botThinking) return;
    if (throwDarts.length !== 3) { setNotice("HALVE-IT se joue avec 3 fléchettes par cible."); return; }
    commitVisit(throwDarts);
  }
  function cancelOrUndo() {
    if (botThinking) return;
    if (throwDarts.length) { setThrowDarts((prev) => prev.slice(0, -1)); setMultiplier(1); setNotice(""); return; }
    if (undoStack.length) {
      const previous = undoStack[undoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1)); setState(cloneHalveItState(previous)); setShowEnd(false); setNotice("Tour précédent restauré.");
    }
  }

  React.useEffect(() => {
    if (!activeProfile || state.finished || !isBot(activeProfile, botIds)) { setBotThinking(false); return; }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => { const darts = randomBotVisit(target, String(level)); commitVisit(darts); setBotThinking(false); }, 700);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.roundIndex, state.activePlayerIndex, state.finished, activePlayerId, target?.id]);

  function resetMatch() {
    const next = createHalveItState(profiles as any, rules, teamConfigs, config.selectedIds);
    setState(next); setUndoStack([]); setThrowDarts([]); setMultiplier(1); setShowEnd(false); setShowTable(false); setShowStats(false); setNotice("");
    matchIdRef.current = `halveit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; autoSavedRef.current = "";
  }
  function backToConfig() {
    const now = Date.now(); if (now - lastBackRef.current < 350) return; lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de HALVE-IT en cours ?")) return;
    if (typeof go === "function") go("halve_it_config", config);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityIds = new Set(state.winnerIds || []);
    const teams = state.teams.map((team) => {
      const standing = state.standings.find((row) => row.id === team.id);
      return { ...team, players: team.playerIds, score: standing?.score || 0, points: standing?.score || 0, hits: standing?.hits || 0, halves: standing?.halves || 0, winner: winnerEntityIds.has(team.id) };
    });
    const initialScore = state.rules.startMode === "fixed" ? state.rules.fixedStartingScore : 0;
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats: HalveItPlayerStats = state.statsByPlayer[player.id] || emptyHalveItStats();
      const teamId = state.teamByPlayer[player.id] || null;
      const entityId = config.participantMode === "teams" ? teamId : player.id;
      const standing = state.standings.find((row) => row.id === entityId);
      const win = Boolean(entityId && winnerEntityIds.has(entityId));
      const score = Number(state.scoresByPlayer[player.id] || 0);
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, teamId, team: teamId, teamName: teamId ? teamById.get(teamId)?.name : null,
        win, winner: win, rank: standing?.rank || 1, score, points: score, finalScore: score, startingScore: initialScore,
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, targetAttempts: stats.targetAttempts, targetHits: stats.validHits, validHits: stats.validHits,
        misses: stats.misses, wastedDarts: stats.wastedDarts, singles: stats.singles, doubles: stats.doubles, triples: stats.triples, bulls: stats.bulls, dbulls: stats.dbulls,
        successfulVisits: stats.successfulVisits, failedVisits: stats.failedVisits, oneHitVisits: stats.oneHitVisits, twoHitVisits: stats.twoHitVisits, threeHitVisits: stats.threeHitVisits, perfectVisits: stats.perfectVisits,
        halvingEvents: stats.halvingEvents, penaltyEvents: stats.halvingEvents, pointsWon: stats.pointsWon, pointsLostByHalving: stats.pointsLostByHalving, pointsLost: stats.pointsLostByHalving,
        netPoints: stats.netPoints, bestVisit: stats.bestVisit, bestVisitHits: stats.bestVisitHits, bestSuccessStreak: stats.bestSuccessStreak, targetsCleared: stats.targetsCleared,
        accuracy: pct(stats.validHits, stats.darts), successRate: pct(stats.successfulVisits, stats.visits), failureRate: pct(stats.failedVisits, stats.visits),
        avg3: avg(stats.pointsWon, stats.visits), averagePointsWonPerVisit: avg(stats.pointsWon, stats.visits), targetStats: stats.targets, rawStats: stats,
      };
    });
    const winnerStanding = state.standings[0] || null;
    const winnerId = state.tied ? null : winnerStanding?.id || null;
    const totalDarts = playerRows.reduce((a, p) => a + p.darts, 0);
    const totalHits = playerRows.reduce((a, p) => a + p.validHits, 0);
    const matchStats = {
      durationMs: Math.max(0, now - state.startedAt), totalDarts, totalHits,
      totalHalves: playerRows.reduce((a, p) => a + p.halvingEvents, 0),
      totalPointsWon: playerRows.reduce((a, p) => a + p.pointsWon, 0),
      totalPointsLost: playerRows.reduce((a, p) => a + p.pointsLostByHalving, 0),
      perfectVisits: playerRows.reduce((a, p) => a + p.perfectVisits, 0),
      accuracy: pct(totalHits, totalDarts), targets: state.targets.length,
    };
    const targetSequence = state.targets.map((t) => ({ id: t.id, label: t.label, kind: t.kind, value: t.value ?? null }));
    const summary = {
      kind: "halve_it", mode: "halve_it", sport: "darts", finished: true, participantMode: config.participantMode,
      winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      startMode: state.rules.startMode, fixedStartingScore: state.rules.fixedStartingScore, rounding: state.rules.rounding,
      sequencePreset: state.rules.sequencePreset, targetSequence, targetsPlayed: state.targets.length,
      finishReason: state.finishReason, duration: matchStats.durationMs, durationMs: matchStats.durationMs, standings: state.standings, rankings: state.standings,
      players: playerRows, perPlayer: playerRows, teams, matchStats, scoreLine: state.standings.map((row) => `${row.name} ${row.score}`).join(" • "), game: { mode: "halve_it", teams },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "halve_it", mode: "halve_it", sport: "darts", status: "finished", createdAt: state.startedAt, updatedAt: now,
      winnerId, winnerIds: state.winnerIds, players: playerRows, teams, game: { mode: "halve_it", teams }, summary,
      payload: {
        kind: "halve_it", mode: "halve_it", sport: "darts", winnerId, winnerIds: state.winnerIds, tied: state.tied, config, rules: state.rules,
        players: playerRows, teams, summary, visits: state.history, visitHistory: state.history,
        state: { roundIndex: state.roundIndex, targets: targetSequence, scoresByPlayer: state.scoresByPlayer, standings: state.standings, finishReason: state.finishReason },
        stats: { sport: "darts", mode: "halve_it", players: playerRows, teams, match: matchStats, global: matchStats },
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

  const previewScores = throwDarts.map((d) => halveItTargetScore(target, toGameDart(d)));
  const currentHitCount = previewScores.filter((n) => n > 0).length;
  const currentGain = previewScores.reduce((sum, n) => sum + n, 0);
  const completedPreview = throwDarts.length === 3;
  const previewHalved = completedPreview && target.kind !== "open" && currentHitCount === 0;
  const previewAfter = previewHalved ? (config.rounding === "ceil" ? Math.ceil(activeScore / 2) : Math.floor(activeScore / 2)) : activeScore + currentGain;
  const currentDelta = previewAfter - activeScore;

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerHalveIt} tickerAlt="HALVE-IT" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles HALVE-IT" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />

    <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <section style={{ ...panelStyle(), padding: 0, overflow: "hidden", borderColor: `${primary}88`, boxShadow: `0 0 24px ${primary}20`, marginBottom: 7 }}>
        <div style={{ position: "relative", minHeight: 132, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(150px,185px)", alignItems: "stretch", padding: "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,.08),rgba(0,0,0,.3))" }} />
          <div style={{ position: "absolute", left: -24, top: -4, bottom: -4, width: "32%", minWidth: 100, overflow: "hidden", opacity: .16 }}><div style={{ position: "absolute", left: -20, top: 16, transform: "scale(1.5)", transformOrigin: "left top" }}><ProfileAvatar profile={activeProfile as any} size={82} /></div></div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: 0, textAlign: "center" }}>
            {botThinking ? <div style={{ color: activeTeam?.color || primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1 }}>BOT EN RÉFLEXION</div> : null}
            <div style={{ color: activeTeam?.color || primary, fontSize: 14, fontWeight: 1000, letterSpacing: .8, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{playerName(activeProfile)}</div>
            <div style={{ marginTop: 5, fontSize: 64, lineHeight: 1, fontWeight: 1000, color: C.gold, textShadow: "0 4px 18px rgba(255,195,26,.25)" }}>{activeScore}</div>
            <div style={{ marginTop: 5, color: themeSoft, fontSize: 9.5, fontWeight: 900 }}>Hits {activeStats.validHits}/{activeStats.darts} · {pct(activeStats.validHits, activeStats.darts)}% · Halves {activeStats.halvingEvents}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", minWidth: 0 }}>
            <div style={{ position: "absolute", inset: "0 0 0 4px", borderRadius: 18, backgroundImage: `linear-gradient(180deg,rgba(4,8,16,.30),rgba(4,8,16,.65)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .72 }} />
            <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 8, textAlign: "center" }}>
              <div style={{ color: themeSoft, fontSize: 9.5, fontWeight: 950, letterSpacing: 1 }}>CIBLE</div>
              <div style={{ color: secondary, fontSize: target.kind === "number" ? 50 : target.kind === "bull" ? 30 : 25, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${secondary}88`, marginTop: 3 }}>{targetLabel}</div>
              <div style={{ color: themeSoft, fontSize: 8.7, fontWeight: 900, marginTop: 7 }}>{targetHint(target)}</div>
              <div style={{ color: target.kind === "open" ? C.green : C.red, fontSize: 8.7, fontWeight: 1000, marginTop: 4 }}>{target.kind === "open" ? "VOLÉE DE CAPITAL" : "0/3 = SCORE ÷ 2"}</div>
              <div style={{ color: primary, fontSize: 9, fontWeight: 1000, marginTop: 4 }}>ROUND {Math.min(state.roundIndex + 1, state.targets.length)}/{state.targets.length}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle(), padding: 8, marginBottom: 7 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          {state.targets.map((t, idx) => {
            const done = idx < state.roundIndex; const active = idx === state.roundIndex && !state.finished;
            return <div key={`${t.id}-${idx}`} title={targetHint(t)} style={{ minWidth: t.kind === "number" ? 28 : 46, height: 26, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${active ? primary : done ? primary + "77" : themeStroke}`, background: active ? `${primary}22` : done ? `${primary}0d` : "rgba(255,255,255,.025)", color: active ? primary : done ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.42)", fontSize: 9, fontWeight: 1000 }}>{t.kind === "triple" ? "T" : t.kind === "double" ? "D" : t.kind === "bull" ? "BULL" : t.kind === "open" ? "LIBRE" : t.label}</div>;
          })}
        </div>
      </section>

      <section style={{ ...panelStyle(), marginBottom: 7, padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, state.standings.length))},minmax(0,1fr))`, gap: 6 }}>
          {state.standings.slice(0, 4).map((standing) => {
            const team = config.participantMode === "teams" ? teamById.get(standing.id) : null;
            const profile = config.participantMode === "players" ? byId.get(standing.id) : null;
            return <div key={standing.id} style={{ minWidth: 0, padding: "7px 5px", borderRadius: 13, background: "rgba(255,255,255,.035)", border: `1px solid ${standing.rank === 1 ? primary + "66" : themeStroke}`, textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{team ? <TeamLogo team={team} size={30} /> : <ProfileAvatar profile={profile as any} size={30} />}</div><div style={{ fontSize: 8.5, fontWeight: 950, color: team?.color || themeSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{standing.name}</div><div style={{ color: primary, fontSize: 20, fontWeight: 1100, lineHeight: 1.1 }}>{standing.score}</div></div>;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 7 }}>
          <button onClick={() => setShowTable(true)} style={miniAction(primary)}>CLASSEMENT</button>
          <button onClick={() => setShowStats(true)} style={miniAction(secondary)}>STATS</button>
        </div>
      </section>

      {!state.finished ? <section style={{ ...panelStyle(), padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 7 }}>
          {[0,1,2].map((i) => {
            const dart = throwDarts[i];
            const valid = dart ? halveItTargetScore(target, toGameDart(dart)) > 0 : false;
            return <div key={i} style={{ minHeight: 42, borderRadius: 13, border: `1px solid ${dart ? (valid ? C.green + "88" : C.red + "66") : themeStroke}`, background: dart ? (valid ? `${C.green}10` : `${C.red}0c`) : "rgba(0,0,0,.18)", display: "grid", placeItems: "center", color: dart ? (valid ? C.green : "#fff") : "rgba(255,255,255,.35)", fontWeight: 1000 }}>{dart ? uiLabel(dart) : `FLÈCHE ${i + 1}`}</div>;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 4px 7px", color: themeSoft, fontSize: 10.5, fontWeight: 850 }}>
          <span>{currentHitCount}/3 touche{currentHitCount > 1 ? "s" : ""} · +{currentGain}</span>
          <span style={{ color: completedPreview ? (previewHalved ? C.red : C.green) : themeSoft }}>{completedPreview ? (previewHalved ? `${activeScore} → ${previewAfter} (÷2)` : `${currentDelta >= 0 ? "+" : ""}${currentDelta} pts`) : "3 fléchettes requises"}</span>
        </div>
        {notice ? <div style={{ textAlign: "center", color: primary, fontSize: 10.5, fontWeight: 900, marginBottom: 7 }}>{notice}</div> : null}
        {config.scoreInputMethod === "dartboard" ? <>
          <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={() => setMultiplier(1)} style={modeButton(multiplier === 1, C.green)}>SIMPLE</button><button onClick={() => setMultiplier(2)} style={modeButton(multiplier === 2, C.cyan)}>DOUBLE</button><button onClick={() => setMultiplier(3)} style={modeButton(multiplier === 3, C.pink)}>TRIPLE</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={cancelOrUndo} style={actionButton(C.gold)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateVisit} style={actionButton(C.green)}>VALIDER</button></div>
        </> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}><Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={validateVisit} hidePreview hideTotal centerSlot={<div style={{ textAlign: "center", color: primary, fontWeight: 1000, fontSize: 11 }}>{targetLabel}<div style={{ fontSize: 8, color: themeSoft }}>{throwDarts.length}/3</div></div>} noticeSlot={notice ? <span>{notice}</span> : null} validateAttention={throwDarts.length === 3} safeBottomPad /></div>}
      </section> : null}
    </div>

    {showTable ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
    {showStats ? <LiveStatsModal state={state} profilesById={byId} primary={primary} onClose={() => setShowStats(false)} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function modeButton(active: boolean, color: string): React.CSSProperties { return { minHeight: 40, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, cursor: "pointer" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }
function miniAction(color: string): React.CSSProperties { return { minHeight: 34, borderRadius: 12, border: `1px solid ${color}66`, background: `${color}10`, color, fontSize: 9.5, fontWeight: 1000, letterSpacing: .5, cursor: "pointer" }; }
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(760px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT HALVE-IT</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>Hits {standing.hits} · Halves {standing.halves} · {standing.visits} volées</div></div><div style={{ color: primary, fontSize: 24, fontWeight: 1100 }}>{standing.score}</div></div>)}</div>
  </div></div>;
}

function LiveStatsModal({ state, profilesById, primary, onClose }: any) {
  const rows = state.players.map((p: any) => ({ p, profile: profilesById.get(p.id) || p, stats: state.statsByPlayer[p.id] || emptyHalveItStats(), score: state.scoresByPlayer[p.id] || 0 })).sort((a: any, b: any) => b.score - a.score);
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.74)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(900px,100%)", maxHeight: "90vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>STATS LIVE HALVE-IT</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>{rows.map((r: any) => <div key={r.p.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProfileAvatar profile={r.profile} size={34} /><div style={{ minWidth: 0 }}><div style={{ color: primary, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(r.profile)}</div><div style={{ fontSize: 22, fontWeight: 1100 }}>{r.score}</div></div></div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, fontSize: 9.5 }}><StatKpi label="Hits" value={r.stats.validHits} /><StatKpi label="Précision" value={`${pct(r.stats.validHits,r.stats.darts)}%`} /><StatKpi label="Halves" value={r.stats.halvingEvents} /><StatKpi label="Best" value={r.stats.bestVisit} /><StatKpi label="+ Points" value={r.stats.pointsWon} /><StatKpi label="− Points" value={r.stats.pointsLostByHalving} /></div></div>)}</div>
  </div></div>;
}
function StatKpi({ label, value }: any) { return <div style={{ padding: 7, borderRadius: 10, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ opacity: .55, fontSize: 8 }}>{label}</div><div style={{ fontWeight: 1000 }}>{value}</div></div>; }

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const rows = state.players.map((player: any) => ({ player, profile: profilesById.get(player.id) || player, stats: state.statsByPlayer[player.id] || emptyHalveItStats(), score: Number(state.scoresByPlayer[player.id] || 0) })).sort((a: any, b: any) => b.score - a.score || b.stats.validHits - a.stats.validHits);
  const best = rows[0];
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}><div style={{ ...panelStyle(), width: "min(920px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}77`, padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ width: 34 }} /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>HALVE-IT</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 11, padding: 12, borderRadius: 16, background: `${primary}10`, border: `1px solid ${primary}44`, textAlign: "center" }}><div style={{ color: C.gold, fontSize: 10, fontWeight: 1000 }}>VAINQUEUR</div><div style={{ marginTop: 4, fontSize: 22, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : state.standings[0]?.name || best?.profile?.name || "—"}</div><div style={{ color: primary, fontSize: 32, fontWeight: 1100 }}>{state.standings[0]?.score ?? best?.score ?? 0}</div></div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>{[
      ["Durée", fmtDuration((state.finishedAt || Date.now()) - state.startedAt)], ["Darts", rows.reduce((a: number, r: any) => a + r.stats.darts, 0)], ["Halves", rows.reduce((a: number, r: any) => a + r.stats.halvingEvents, 0)], ["Parfaits 3/3", rows.reduce((a: number, r: any) => a + r.stats.perfectVisits, 0)]
    ].map(([label, value]: any) => <div key={label} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>{label}</div><div style={{ fontWeight: 1100, fontSize: 18, color: primary }}>{value}</div></div>)}</div>

    <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 790, fontSize: 10.5 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","Score","Hits","Préc.","Halves","0/3","1/3","2/3","3/3","Best","Série","+ Points","− Points","Darts"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.68)" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}</td><td style={td(primary)}>{row.score}</td><td style={td()}>{row.stats.validHits}</td><td style={td()}>{pct(row.stats.validHits,row.stats.darts)}%</td><td style={td(C.red)}>{row.stats.halvingEvents}</td><td style={td(C.red)}>{row.stats.failedVisits}</td><td style={td()}>{row.stats.oneHitVisits}</td><td style={td()}>{row.stats.twoHitVisits}</td><td style={td(C.green)}>{row.stats.threeHitVisits}</td><td style={td()}>{row.stats.bestVisit}</td><td style={td()}>{row.stats.bestSuccessStreak}</td><td style={td(C.green)}>+{row.stats.pointsWon}</td><td style={td(C.red)}>−{row.stats.pointsLostByHalving}</td><td style={td()}>{row.stats.darts}</td></tr>)}</tbody></table></div>

    <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{rows.map((row: any) => <details key={row.player.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><summary style={{ cursor: "pointer", fontWeight: 1000, color: primary }}>{playerName(row.profile)} — détail par cible</summary><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(82px,1fr))", gap: 6 }}>{state.targets.map((target: HalveItTarget) => { const s = row.stats.targets?.[String(target.id)]; return <div key={target.id} style={{ padding: 7, borderRadius: 11, background: "rgba(0,0,0,.23)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.58)", fontSize: 9 }}>{target.label}</div><div style={{ color: s?.validHits ? C.green : target.kind === "open" ? "#fff" : C.red, fontWeight: 1100 }}>{s?.validHits || 0}/3</div><div style={{ fontSize: 8.5, opacity: .65 }}>{s?.pointsWon ? `+${s.pointsWon}` : s?.pointsLost ? `−${s.pointsLost}` : "—"}</div></div>; })}</div></details>)}</div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}
