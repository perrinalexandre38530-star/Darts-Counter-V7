// @ts-nocheck
// =============================================================
// SHOOTER — moteur complet, bots, undo, équipes, stats/history
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
  cloneShooterState,
  createShooterState,
  emptyShooterStats,
  getShooterActiveEntity,
  getShooterActivePlayerId,
  getShooterCurrentTarget,
  isShooterTargetHit,
  playShooterVisit,
  shooterTargetLabel,
  type ShooterConfigPayload,
  type ShooterHitZone,
  type ShooterPlayerStats,
  type ShooterState,
  type ShooterTeamConfig,
} from "../lib/gameEngines/shooterEngine";
import tickerShooter from "../assets/tickers/ticker_shooter.png";
import targetBg from "../assets/target_bg.png";

type UiDart = { v: number; mult: 1 | 2 | 3 };
const C = { gold: "#ffd76a", cyan: "#42d6ff", green: "#65efb4", red: "#ff667e", pink: "#ff63b8", text: "#f8fafc", soft: "rgba(226,232,240,.72)" };

function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const total = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
function toGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function uiLabel(dart: UiDart) { if (!dart || dart.v === 0) return "MISS"; if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL"; return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`; }
function dartMarks(dart: UiDart) { if (!dart || dart.v === 0) return 0; if (dart.v === 25) return dart.mult === 2 ? 2 : 1; return dart.mult; }
function dartPoints(dart: UiDart) { if (!dart || dart.v === 0) return 0; if (dart.v === 25) return dart.mult === 2 ? 50 : 25; return dart.v * dart.mult; }
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }

function normalizeConfig(props: any): ShooterConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  const zone: ShooterHitZone = raw?.hitZone === "single" || raw?.hitZone === "double" || raw?.hitZone === "triple" ? raw.hitZone : "any";
  return {
    mode: "shooter",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 1)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    sequencePreset: raw?.sequencePreset === "around" || raw?.sequencePreset === "pro" || raw?.sequencePreset === "random" ? raw.sequencePreset : "classic",
    randomTargetCount: Math.max(3, Math.min(20, Number(raw?.randomTargetCount || 10))),
    includeBull: zone === "triple" ? false : raw?.includeBull !== false,
    hitZone: zone,
    marksToClear: ([1,2,3,4,5,6].includes(Number(raw?.marksToClear)) ? Number(raw.marksToClear) : 3) as any,
    maxRounds: Math.max(0, Math.min(99, Number(raw?.maxRounds ?? 15))),
    penaltyRule: raw?.penaltyRule === "score" || raw?.penaltyRule === "progress" ? raw.penaltyRule : "none",
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function botHitChance(level: string) { const v = String(level || "").toLowerCase(); if (v.includes("hard") || v.includes("pro") || v.includes("diffic")) return .72; if (v.includes("easy") || v.includes("facile")) return .34; return .52; }
function validBotDart(target: number, zone: ShooterHitZone, level: string): UiDart {
  if (target === 25) {
    if (zone === "double") return { v: 25, mult: 2 };
    if (zone === "single") return { v: 25, mult: 1 };
    return { v: 25, mult: String(level).toLowerCase().includes("hard") && Math.random() < .45 ? 2 : 1 };
  }
  if (zone === "single") return { v: target, mult: 1 };
  if (zone === "double") return { v: target, mult: 2 };
  if (zone === "triple") return { v: target, mult: 3 };
  const roll = Math.random();
  return { v: target, mult: roll < .24 ? 3 : roll < .50 ? 2 : 1 };
}
function missBotDart(target: number): UiDart {
  if (Math.random() < .16) return { v: 0, mult: 1 };
  if (target === 25) return { v: [20, 1, 18, 5][Math.floor(Math.random() * 4)], mult: Math.random() < .2 ? 3 : 1 } as UiDart;
  let value = Math.max(1, Math.min(20, target + (Math.random() < .5 ? -1 : 1)));
  if (value === target) value = target === 20 ? 19 : target + 1;
  const roll = Math.random(); return { v: value, mult: roll < .17 ? 2 : roll < .31 ? 3 : 1 } as UiDart;
}
function randomBotVisit(target: number, zone: ShooterHitZone, level: string): UiDart[] { const chance = botHitChance(level); return Array.from({ length: 3 }, () => Math.random() < chance ? validBotDart(target, zone, level) : missBotDart(target)); }
function zoneLabel(zone: ShooterHitZone) { if (zone === "single") return "SIMPLE"; if (zone === "double") return "DOUBLE"; if (zone === "triple") return "TRIPLE"; return "S / D / T"; }

function RulesContent({ config, primary }: { config: ShooterConfigPayload; primary: string }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: primary }}>OBJECTIF</strong><br />Termine toute la séquence avant les autres. Chaque cible demande {config.marksToClear} mark{config.marksToClear > 1 ? "s" : ""}.</div>
    <div><strong style={{ color: primary }}>ZONE VALIDE</strong><br />{zoneLabel(config.hitZone)} sur le numéro demandé. Simple = 1 mark, double = 2, triple = 3.</div>
    <div><strong style={{ color: C.green }}>SCORE</strong><br />Les impacts valides ajoutent leur valeur réelle : T20 = 60, D18 = 36, BULL = 25, DBULL = 50.</div>
    <div><strong style={{ color: C.red }}>0/3</strong><br />{config.penaltyRule === "score" ? "La valeur de la cible est retirée du score." : config.penaltyRule === "progress" ? "Un mark de progression est retiré." : "Aucune pénalité."}</div>
    <div><strong style={{ color: C.gold }}>VICTOIRE</strong><br />Premier à terminer. {config.maxRounds ? `Sinon arrêt après ${config.maxRounds} rounds et classement à la progression.` : "Aucune limite de rounds."}</div>
    <div><strong style={{ color: primary }}>ANNULER</strong><br />Retire une fléchette de la volée ; volée vide, restaure le tour précédent.</div>
  </div>;
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || null;
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${team?.color || C.gold}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${team?.color || C.gold}18`, boxShadow: `0 0 15px ${team?.color || C.gold}44`, flex: "0 0 auto" }}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: team?.color || C.gold, fontWeight: 1000, fontSize: size * .34 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}</div>;
}

export default function ShooterPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || C.cyan;
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
  const teamConfigs = React.useMemo<ShooterTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({ id: String(team?.id || `team-${index + 1}`), name: String(team?.name || `Équipe ${index + 1}`), color: team?.color || [C.gold, C.pink, C.cyan, C.green][index % 4], logoDataUrl: team?.logoDataUrl || team?.logoUrl || null, playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [], isBotTeam: Boolean(team?.isBotTeam) })), [config.teamConfigs]);
  const rules = React.useMemo(() => ({ participantMode: config.participantMode, sequencePreset: config.sequencePreset, randomTargetCount: config.randomTargetCount, includeBull: config.includeBull, hitZone: config.hitZone, marksToClear: config.marksToClear, maxRounds: config.maxRounds, penaltyRule: config.penaltyRule }), [config]);
  const initialState = React.useMemo(() => createShooterState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<ShooterState>(initialState);
  const [undoStack, setUndoStack] = React.useState<ShooterState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`shooter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const activePlayerId = getShooterActivePlayerId(state);
  const activeProfile = byId.get(String(activePlayerId)) || state.players.find((p) => p.id === activePlayerId) || state.players[0];
  const activeStats = state.statsByPlayer[activePlayerId] || emptyShooterStats();
  const activeTeamId = state.teamByPlayer[activePlayerId] || null;
  const activeTeam = activeTeamId ? teamById.get(activeTeamId) : null;
  const activeEntity = getShooterActiveEntity(state);
  const target = getShooterCurrentTarget(state);
  const targetLabel = shooterTargetLabel(target);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  function commitVisit(darts: UiDart[]) {
    if (state.finished || darts.length < 1) return;
    setUndoStack((stack) => [...stack.slice(-49), cloneShooterState(state)]);
    setState((prev) => playShooterVisit(prev, darts.map(toGameDart)));
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
    if (throwDarts.length !== 3) { setNotice("SHOOTER se joue avec 3 fléchettes par volée."); return; }
    commitVisit(throwDarts);
  }
  function cancelOrUndo() {
    if (botThinking) return;
    if (throwDarts.length) { setThrowDarts((prev) => prev.slice(0, -1)); setMultiplier(1); setNotice(""); return; }
    if (undoStack.length) { const previous = undoStack[undoStack.length - 1]; setUndoStack((stack) => stack.slice(0, -1)); setState(cloneShooterState(previous)); setShowEnd(false); setNotice("Tour précédent restauré."); }
  }

  React.useEffect(() => {
    if (!activeProfile || state.finished || !isBot(activeProfile, botIds)) { setBotThinking(false); return; }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => { const darts = randomBotVisit(target, config.hitZone, String(level)); commitVisit(darts); setBotThinking(false); }, 700);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.roundIndex, state.activePlayerIndex, state.finished, activePlayerId, target]);

  function resetMatch() {
    const next = createShooterState(profiles as any, rules, teamConfigs, config.selectedIds);
    setState(next); setUndoStack([]); setThrowDarts([]); setMultiplier(1); setShowEnd(false); setShowTable(false); setNotice("");
    matchIdRef.current = `shooter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; autoSavedRef.current = "";
  }
  function backToConfig() {
    const now = Date.now(); if (now - lastBackRef.current < 350) return; lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de SHOOTER en cours ?")) return;
    if (typeof go === "function") go("shooter_config", config);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityIds = new Set(state.winnerIds || []);
    const teams = state.teams.map((team) => {
      const standing = state.standings.find((row) => row.id === team.id);
      const rows = team.playerIds.map((id) => state.statsByPlayer[id] || emptyShooterStats());
      const darts = rows.reduce((a, r) => a + r.darts, 0), hits = rows.reduce((a, r) => a + r.validDarts, 0);
      return { ...team, players: team.playerIds, score: standing?.score || 0, points: standing?.score || 0, targetsCleared: standing?.targetsCleared || 0, marksOnTarget: standing?.marksOnTarget || 0, hits, darts, accuracy: pct(hits, darts), winner: winnerEntityIds.has(team.id), rank: standing?.rank || 1 };
    });
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player; const stats: ShooterPlayerStats = state.statsByPlayer[player.id] || emptyShooterStats();
      const teamId = state.teamByPlayer[player.id] || null; const entityId = state.entityByPlayer[player.id]; const standing = state.standings.find((row) => row.id === entityId);
      const win = Boolean(entityId && winnerEntityIds.has(entityId));
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, teamId, team: teamId, teamName: teamId ? teamById.get(teamId)?.name : null,
        win, winner: win, rank: standing?.rank || 1, score: standing?.score || 0, points: stats.points, finalScore: standing?.score || 0,
        targetsCleared: standing?.targetsCleared || 0, progressTargetIndex: standing?.targetIndex || 0, marksOnCurrentTarget: standing?.marksOnTarget || 0,
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, targetAttempts: stats.targetAttempts,
        targetHits: stats.validDarts, validHits: stats.validDarts, validDarts: stats.validDarts, invalidDarts: stats.invalidDarts, accuracy: pct(stats.validDarts, stats.darts),
        marks: stats.marks, marksApplied: stats.marksApplied, pointsWon: stats.points, netPoints: stats.netPoints,
        penaltyEvents: stats.penaltyEvents, penaltyPoints: stats.penaltyPoints, progressPenalties: stats.progressPenalties, targetClearCredits: stats.targetClearCredits,
        successfulVisits: stats.successfulVisits, failedVisits: stats.failedVisits, oneHitVisits: stats.oneHitVisits, twoHitVisits: stats.twoHitVisits, threeHitVisits: stats.threeHitVisits, perfectVisits: stats.perfectVisits, firstDartHits: stats.firstDartHits,
        singles: stats.singles, doubles: stats.doubles, triples: stats.triples, bulls: stats.bulls, dbulls: stats.dbulls, misses: stats.misses,
        bestVisitMarks: stats.bestVisitMarks, bestVisitPoints: stats.bestVisitPoints, bestHitStreak: stats.bestHitStreak, bestSuccessVisitStreak: stats.bestSuccessVisitStreak, lastTargetReached: stats.lastTargetReached,
        averageMarksPerVisit: stats.visits ? Math.round((stats.marks / stats.visits) * 100) / 100 : 0,
        averagePointsPerVisit: stats.visits ? Math.round((stats.points / stats.visits) * 10) / 10 : 0,
        successRate: pct(stats.successfulVisits, stats.visits), failureRate: pct(stats.failedVisits, stats.visits), targetStats: stats.targets, rawStats: stats,
      };
    });
    const winnerStanding = state.standings[0] || null; const winnerId = state.tied ? null : winnerStanding?.id || null;
    const totalDarts = playerRows.reduce((a, p) => a + p.darts, 0), totalHits = playerRows.reduce((a, p) => a + p.validDarts, 0);
    const matchStats = {
      durationMs: Math.max(0, now - state.startedAt), totalDarts, totalHits, accuracy: pct(totalHits, totalDarts),
      totalMarks: playerRows.reduce((a, p) => a + p.marks, 0), totalPoints: playerRows.reduce((a, p) => a + p.pointsWon, 0),
      penaltyEvents: playerRows.reduce((a, p) => a + p.penaltyEvents, 0), penaltyPoints: playerRows.reduce((a, p) => a + p.penaltyPoints, 0),
      perfectVisits: playerRows.reduce((a, p) => a + p.perfectVisits, 0), targetClearCredits: playerRows.reduce((a, p) => a + p.targetClearCredits, 0),
      sequenceLength: state.sequence.length, roundsPlayed: Math.min(state.roundIndex + 1, config.maxRounds || state.roundIndex + 1),
    };
    const summary = {
      kind: "shooter", mode: "shooter", sport: "darts", finished: true, participantMode: config.participantMode,
      winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      targetSequence: [...state.sequence], sequencePreset: state.rules.sequencePreset, marksToClear: state.rules.marksToClear, hitZone: state.rules.hitZone,
      finishReason: state.finishReason, roundsPlayed: matchStats.roundsPlayed, duration: matchStats.durationMs, durationMs: matchStats.durationMs,
      standings: state.standings, rankings: state.standings, players: playerRows, perPlayer: playerRows, teams, matchStats,
      scoreLine: state.standings.map((row) => `${row.name} ${row.targetsCleared}/${state.sequence.length} · ${row.score}`).join(" • "), game: { mode: "shooter", teams },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "shooter", mode: "shooter", sport: "darts", status: "finished", createdAt: state.startedAt, updatedAt: now,
      winnerId, winnerIds: state.winnerIds, players: playerRows, teams, game: { mode: "shooter", teams }, summary,
      payload: { kind: "shooter", mode: "shooter", sport: "darts", winnerId, winnerIds: state.winnerIds, tied: state.tied, config, rules: state.rules, players: playerRows, teams, summary, visits: state.history, visitHistory: state.history, state: { roundIndex: state.roundIndex, sequence: state.sequence, entities: state.entities, standings: state.standings, finishReason: state.finishReason }, stats: { sport: "darts", mode: "shooter", players: playerRows, teams, match: matchStats, global: matchStats } },
    };
  }

  React.useEffect(() => {
    if (!state.finished) return; setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return; autoSavedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord(), { navigate: false }); } catch {}
  }, [state.finished]);

  const previewValid = throwDarts.map((d) => isShooterTargetHit(toGameDart(d), target, config.hitZone));
  const currentHitCount = previewValid.filter(Boolean).length;
  const currentRawMarks = throwDarts.reduce((sum, d, i) => sum + (previewValid[i] ? dartMarks(d) : 0), 0);
  const currentPoints = throwDarts.reduce((sum, d, i) => sum + (previewValid[i] ? dartPoints(d) : 0), 0);
  const neededMarks = Math.max(0, config.marksToClear - Number(activeEntity?.marksOnTarget || 0));

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerShooter} tickerAlt="SHOOTER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles de SHOOTER" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />
    <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <section style={{ ...panelStyle(), padding: 0, overflow: "hidden", borderColor: `${primary}88`, boxShadow: `0 0 24px ${primary}20`, marginBottom: 7 }}>
        <div style={{ position: "relative", minHeight: 132, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(150px,185px)", alignItems: "stretch", padding: "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,.08),rgba(0,0,0,.3))" }} />
          <div style={{ position: "absolute", left: -24, top: -4, bottom: -4, width: "32%", minWidth: 100, overflow: "hidden", opacity: .12 }}><div style={{ position: "absolute", left: -20, top: 16, transform: "scale(1.5)", transformOrigin: "left top" }}><ProfileAvatar profile={activeProfile as any} size={82} /></div></div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: 0, textAlign: "center" }}>
            {botThinking ? <div style={{ color: activeTeam?.color || primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1 }}>BOT EN RÉFLEXION</div> : null}
            <div style={{ color: activeTeam?.color || primary, fontSize: 14, fontWeight: 1000, letterSpacing: .8, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{playerName(activeProfile)}</div>
            {activeTeam ? <div style={{ color: activeTeam.color || themeSoft, fontSize: 9, fontWeight: 900, marginTop: 2 }}>{activeTeam.name}</div> : null}
            <div style={{ marginTop: 5, fontSize: 54, lineHeight: 1, fontWeight: 1000, color: C.gold, textShadow: "0 4px 18px rgba(255,195,26,.25)" }}>{Number(activeEntity?.score || 0)}</div>
            <div style={{ marginTop: 5, color: themeSoft, fontSize: 9.5, fontWeight: 900 }}>Préc. {pct(activeStats.validDarts, activeStats.darts)}% · Marks {activeStats.marks} · Série {activeStats.bestHitStreak}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", minWidth: 0 }}>
            <div style={{ position: "absolute", inset: "0 0 0 4px", borderRadius: 18, backgroundImage: `linear-gradient(180deg,rgba(4,8,16,.30),rgba(4,8,16,.65)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .72 }} />
            <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 8 }}>
              <div style={{ color: themeSoft, fontSize: 9.5, fontWeight: 950, letterSpacing: 1 }}>CIBLE</div>
              <div style={{ color: secondary, fontSize: target === 25 ? 30 : 52, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${secondary}88`, marginTop: 3 }}>{targetLabel}</div>
              <div style={{ width: "100%", maxWidth: 110, marginTop: 8, height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.10)", border: `1px solid ${primary}33` }}><div style={{ width: `${Math.min(100, (Number(activeEntity?.marksOnTarget || 0) / config.marksToClear) * 100)}%`, height: "100%", background: `linear-gradient(90deg,${primary},${secondary})` }} /></div>
              <div style={{ color: primary, fontSize: 10, fontWeight: 1000, marginTop: 4 }}>{Number(activeEntity?.marksOnTarget || 0)}/{config.marksToClear} MARKS</div>
              <div style={{ color: themeSoft, fontSize: 8.5, fontWeight: 900, marginTop: 3 }}>{zoneLabel(config.hitZone)} · Cible {Math.min(Number(activeEntity?.targetIndex || 0) + 1, state.sequence.length)}/{state.sequence.length}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle(), padding: 8, marginBottom: 7 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          {state.sequence.map((n, idx) => { const done = idx < Number(activeEntity?.targetIndex || 0); const active = idx === Number(activeEntity?.targetIndex || 0) && !state.finished; return <div key={`${n}-${idx}`} title={shooterTargetLabel(n)} style={{ minWidth: n === 25 ? 42 : 28, height: 26, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${active ? primary : done ? primary + "77" : themeStroke}`, background: active ? `${primary}22` : done ? `${primary}0d` : "rgba(255,255,255,.025)", color: active ? primary : done ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.42)", fontSize: 9.5, fontWeight: 1000 }}>{n === 25 ? "BULL" : n}</div>; })}
        </div>
        <div style={{ marginTop: 5, textAlign: "center", color: themeSoft, fontSize: 9 }}>Round {state.roundIndex + 1}{config.maxRounds ? `/${config.maxRounds}` : ""} · {neededMarks} mark{neededMarks > 1 ? "s" : ""} restant{neededMarks > 1 ? "s" : ""}</div>
      </section>

      <section style={{ ...panelStyle(), marginBottom: 7, padding: 8 }}>
        <button type="button" onClick={() => setShowTable(true)} style={{ width: "100%", border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, state.standings.length))},minmax(0,1fr))`, gap: 6 }}>
            {state.standings.slice(0, 4).map((standing) => {
              const team = config.participantMode === "teams" ? teamById.get(standing.id) : null; const profile = config.participantMode === "players" ? byId.get(standing.id) : null;
              return <div key={standing.id} style={{ minWidth: 0, padding: "7px 5px", borderRadius: 13, background: "rgba(255,255,255,.035)", border: `1px solid ${standing.rank === 1 ? primary + "66" : themeStroke}` }}><div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{team ? <TeamLogo team={team} size={30} /> : <ProfileAvatar profile={profile as any} size={30} />}</div><div style={{ fontSize: 8.5, fontWeight: 950, color: team?.color || themeSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{standing.name}</div><div style={{ color: primary, fontSize: 18, fontWeight: 1100, lineHeight: 1.1 }}>{standing.targetsCleared}/{state.sequence.length}</div><div style={{ color: C.gold, fontSize: 9, fontWeight: 900 }}>{standing.score} pts</div></div>;
            })}
          </div>
          <div style={{ marginTop: 6, color: themeSoft, fontSize: 9.5, fontWeight: 850 }}>Classement · toucher pour le détail</div>
        </button>
      </section>

      {!state.finished ? <section style={{ ...panelStyle(), padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 7 }}>
          {[0,1,2].map((i) => <div key={i} style={{ minHeight: 42, borderRadius: 13, border: `1px solid ${throwDarts[i] ? primary + "66" : themeStroke}`, background: throwDarts[i] ? `${primary}10` : "rgba(0,0,0,.18)", display: "grid", placeItems: "center", color: throwDarts[i] && previewValid[i] ? C.green : throwDarts[i] ? C.red : "rgba(255,255,255,.35)", fontWeight: 1000 }}>{throwDarts[i] ? uiLabel(throwDarts[i]) : `FLÈCHE ${i + 1}`}</div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 4px 7px", color: themeSoft, fontSize: 10.5, fontWeight: 850 }}><span>{currentHitCount}/3 touches · {currentRawMarks} marks</span><span style={{ color: currentPoints > 0 ? C.green : themeSoft }}>{throwDarts.length === 3 ? `+${currentPoints} pts` : "3 fléchettes requises"}</span></div>
        {notice ? <div style={{ textAlign: "center", color: primary, fontSize: 10.5, fontWeight: 900, marginBottom: 7 }}>{notice}</div> : null}
        {config.scoreInputMethod === "dartboard" ? <>
          <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={() => setMultiplier(1)} style={modeButton(multiplier === 1, C.green)}>SIMPLE</button><button onClick={() => setMultiplier(2)} style={modeButton(multiplier === 2, C.cyan)}>DOUBLE</button><button onClick={() => setMultiplier(3)} style={modeButton(multiplier === 3, C.pink)}>TRIPLE</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={cancelOrUndo} style={actionButton(C.gold)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateVisit} style={actionButton(C.green)}>VALIDER</button></div>
        </> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}><Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={validateVisit} hidePreview hideTotal centerSlot={<div style={{ textAlign: "center", color: primary, fontWeight: 1000, fontSize: 11 }}>{targetLabel}<div style={{ fontSize: 8, color: themeSoft }}>{throwDarts.length}/3</div></div>} noticeSlot={notice ? <span>{notice}</span> : null} validateAttention={throwDarts.length === 3} safeBottomPad /></div>}
      </section> : null}
    </div>

    {showTable ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function modeButton(active: boolean, color: string): React.CSSProperties { return { minHeight: 40, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, cursor: "pointer" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(760px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT SHOOTER</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>{standing.targetsCleared}/{state.sequence.length} cibles · {standing.marksOnTarget}/{state.rules.marksToClear} marks · précision {standing.accuracy}%</div></div><div style={{ textAlign: "right" }}><div style={{ color: primary, fontSize: 22, fontWeight: 1100 }}>{standing.score}</div><div style={{ fontSize: 8.5, opacity: .55 }}>PTS</div></div></div>)}</div>
  </div></div>;
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const rows = state.players.map((player: any) => {
    const profile = profilesById.get(player.id) || player, stats = state.statsByPlayer[player.id] || emptyShooterStats();
    const standing = state.standings.find((s: any) => s.id === state.entityByPlayer[player.id]);
    return { player, profile, stats, standing };
  }).sort((a: any, b: any) => Number(a.standing?.rank || 99) - Number(b.standing?.rank || 99) || b.stats.validDarts - a.stats.validDarts);
  const best = state.standings[0];
  const totalDarts = rows.reduce((a: number, r: any) => a + r.stats.darts, 0), totalHits = rows.reduce((a: number, r: any) => a + r.stats.validDarts, 0);
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}><div style={{ ...panelStyle(), width: "min(930px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}77`, padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ width: 34 }} /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>SHOOTER</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 11, padding: 12, borderRadius: 16, background: `${primary}10`, border: `1px solid ${primary}44`, textAlign: "center" }}><div style={{ color: C.gold, fontSize: 10, fontWeight: 1000 }}>VAINQUEUR</div><div style={{ marginTop: 4, fontSize: 22, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : best?.name || "—"}</div><div style={{ color: primary, fontSize: 28, fontWeight: 1100 }}>{best?.targetsCleared || 0}/{state.sequence.length} CIBLES · {best?.score || 0} PTS</div></div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>{[
      ["Durée", fmtDuration((state.finishedAt || Date.now()) - state.startedAt)], ["Darts", totalDarts], ["Précision", `${pct(totalHits,totalDarts)}%`], ["Parfaits 3/3", rows.reduce((a: number, r: any) => a + r.stats.perfectVisits, 0)]
    ].map(([label, value]: any) => <div key={label} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>{label}</div><div style={{ fontWeight: 1100, fontSize: 18, color: primary }}>{value}</div></div>)}</div>

    <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900, fontSize: 10.5 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","Rang","Cibles","Préc.","Marks","Score","0/3","1/3","2/3","3/3","Best marks","Best pts","Série","Darts"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.68)" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}{row.standing?.rank === 1 ? <span style={{ color: C.gold }}> · 🏆</span> : ""}</td><td style={td(C.gold)}>{row.standing?.rank || "—"}</td><td style={td(primary)}>{row.standing?.targetsCleared || 0}/{state.sequence.length}</td><td style={td()}>{pct(row.stats.validDarts,row.stats.darts)}%</td><td style={td()}>{row.stats.marks}</td><td style={td(primary)}>{row.stats.points}</td><td style={td(C.red)}>{row.stats.failedVisits}</td><td style={td()}>{row.stats.oneHitVisits}</td><td style={td()}>{row.stats.twoHitVisits}</td><td style={td(C.green)}>{row.stats.threeHitVisits}</td><td style={td()}>{row.stats.bestVisitMarks}</td><td style={td()}>{row.stats.bestVisitPoints}</td><td style={td()}>{row.stats.bestHitStreak}</td><td style={td()}>{row.stats.darts}</td></tr>)}</tbody></table></div>

    <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{rows.map((row: any) => <details key={row.player.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><summary style={{ cursor: "pointer", fontWeight: 1000, color: primary }}>{playerName(row.profile)} — détail par cible</summary><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(82px,1fr))", gap: 6 }}>{state.sequence.map((target: number, idx: number) => { const s = row.stats.targets?.[String(target)]; return <div key={`${target}-${idx}`} style={{ padding: 7, borderRadius: 11, background: "rgba(0,0,0,.23)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.58)", fontSize: 9 }}>{shooterTargetLabel(target)}</div><div style={{ color: s?.validDarts ? C.green : C.red, fontWeight: 1100 }}>{s?.validDarts || 0}/{s?.darts || 0}</div><div style={{ fontSize: 8.5, opacity: .65 }}>{s?.marks || 0} marks · {s?.points || 0} pts</div></div>; })}</div></details>)}</div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }
