// @ts-nocheck
// =============================================================
// HALVE-IT — Play complet
// Joueurs / équipes / bots / undo / stats / historique
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable, { type DartboardGuideTarget } from "../components/DartboardClickable";
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
import "./HalveItPlayResponsive.css";
import tickerSplitScoreFr from "../assets/tickers/ticker_split_score_fr.webp";
import tickerSplitScoreEn from "../assets/tickers/ticker_split_score_en.webp";
import { readDartsMatchDraft, writeDartsMatchDraft, clearDartsMatchDraft } from "../lib/dartsMatchDrafts";
import { useLang } from "../contexts/LangContext";
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
    variantId: raw?.variantId === "split_score" ? "split_score" : undefined,
    sessionId: typeof raw?.sessionId === "string" ? raw.sessionId : undefined,
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

// En mode cible tactile, montrer le contrat sur la véritable cible :
// numéro complet, tous les doubles/triples ou les deux zones du bull.
function boardGuidesForTarget(target: HalveItTarget): DartboardGuideTarget[] {
  if (target.kind === "number") return [{ ring: "number", segment: target.value, color: C.gold }];
  if (target.kind === "bull") return [{ ring: "bull_any", color: C.green }];
  if (target.kind === "double" || target.kind === "triple") {
    return Array.from({ length: 20 }, (_, i) => ({
      ring: target.kind === "double" ? "double" as const : "triple" as const,
      segment: i + 1,
      color: target.kind === "double" ? C.cyan : C.pink,
    }));
  }
  return [];
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
  const { lang } = useLang();
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const isSplitScore = config.variantId === "split_score";
  const modeId = isSplitScore ? "split_score" : "halve_it";
  const modeLabel = isSplitScore ? "SPLIT SCORE" : "HALVE-IT";
  const headerTicker = isSplitScore ? (lang === "fr" ? tickerSplitScoreFr : tickerSplitScoreEn) : tickerHalveIt;
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

  const draftMode = isSplitScore ? "split_score" : "halve_it";
  const restored = React.useMemo(() => {
    if (props?.params?.resumeDraft !== true) return null;
    const draft = readDartsMatchDraft(draftMode);
    const snap: any = draft?.snapshot;
    const s: any = snap?.state;
    if (!s || draft?.config?.sessionId !== config.sessionId || !Array.isArray(s.players)
      || !Array.isArray(s.targets) || !Array.isArray(s.turnOrder) || !s.turnOrder.length
      || s.players.length !== profiles.length || s.players.some((p: any) => !profiles.some((q: any) => q.id === p.id))
      || s.targets.length < 1 || s.targets.length > 20 || !Number.isInteger(s.roundIndex)
      || s.roundIndex < 0 || s.roundIndex >= s.targets.length || !Number.isInteger(s.activePlayerIndex)
      || s.activePlayerIndex < 0 || s.activePlayerIndex >= s.turnOrder.length
      || !s.scoresByPlayer || !s.statsByPlayer || !Array.isArray(s.history) || s.finished
      || !Array.isArray(snap.throwDarts) || snap.throwDarts.length > 3) return null;
    return snap;
  }, []);
  const initialState = React.useMemo(() => restored?.state || createHalveItState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<HalveItState>(initialState);
  const [undoStack, setUndoStack] = React.useState<HalveItState[]>(() =>
    restored?.lastUndo && Array.isArray(restored.lastUndo.history) ? [restored.lastUndo] : []);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>(restored?.throwDarts || []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(restored?.multiplier === 2 || restored?.multiplier === 3 ? restored.multiplier : 1);
  const [showEnd, setShowEnd] = React.useState(false);
  const standingsStripRef = React.useRef<HTMLDivElement | null>(null);
  const [showTable, setShowTable] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(String(restored?.matchId || config.sessionId || `halveit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
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
  const boardGuides = React.useMemo(() => boardGuidesForTarget(target), [target?.id]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  // Jusqu'à douze participants : suivre horizontalement le joueur / l'équipe
  // en cours sans faire défiler verticalement le reste de la page ni le clavier.
  React.useEffect(() => {
    const strip = standingsStripRef.current;
    const active = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!strip || !active) return;
    const box = strip.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    const displacement = item.left + item.width / 2 - (box.left + box.width / 2);
    if (Math.abs(displacement) > 1) strip.scrollLeft += displacement;
  }, [activePlayerId, activeTeamId, state.standings.length, config.participantMode]);

  function commitVisit(darts: UiDart[]) {
    // Garde moteur : la saisie manuelle et les bots doivent fournir 3 fléchettes.
    // Évite une transition de round si une action/touche déclenche une demi-volée.
    if (state.finished || !Array.isArray(darts) || darts.length !== 3) return;
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
    if (throwDarts.length !== 3) { setNotice(`${modeLabel} se joue avec 3 fléchettes par cible.`); return; }
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
    // Un nouveau match ne doit jamais proposer de reprendre le précédent.
    clearDartsMatchDraft(draftMode);
    matchIdRef.current = `halveit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; autoSavedRef.current = "";
  }
  function backToConfig() {
    const now = Date.now(); if (now - lastBackRef.current < 350) return; lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm(`Quitter cette partie de ${modeLabel} en cours ?`)) return;
    if (typeof go === "function") go("halve_it_config", { ...config, variantId: isSplitScore ? "split_score" : undefined, launchMode: props?.params?.quickParty === true ? "quick" : "arcade", quickParty: props?.params?.quickParty === true });
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
      kind: modeId, mode: modeId, variantId: isSplitScore ? "split_score" : undefined, sport: "darts", finished: true, participantMode: config.participantMode,
      winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      startMode: state.rules.startMode, fixedStartingScore: state.rules.fixedStartingScore, rounding: state.rules.rounding,
      sequencePreset: state.rules.sequencePreset, targetSequence, targetsPlayed: state.targets.length,
      finishReason: state.finishReason, duration: matchStats.durationMs, durationMs: matchStats.durationMs, standings: state.standings, rankings: state.standings,
      players: playerRows, perPlayer: playerRows, teams, matchStats, scoreLine: state.standings.map((row) => `${row.name} ${row.score}`).join(" • "), game: { mode: modeId, teams },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: modeId, mode: modeId, variantId: isSplitScore ? "split_score" : undefined, sport: "darts", status: "finished", createdAt: state.startedAt, updatedAt: now,
      winnerId, winnerIds: state.winnerIds, players: playerRows, teams, game: { mode: modeId, teams }, summary,
      payload: {
        kind: modeId, mode: modeId, sport: "darts", winnerId, winnerIds: state.winnerIds, tied: state.tied, config, rules: state.rules,
        players: playerRows, teams, summary, visits: state.history, visitHistory: state.history,
        state: { roundIndex: state.roundIndex, targets: targetSequence, scoresByPlayer: state.scoresByPlayer, standings: state.standings, finishReason: state.finishReason },
        stats: { sport: "darts", mode: modeId, players: playerRows, teams, match: matchStats, global: matchStats },
      },
    };
  }

  // Enregistrement automatique unique ; le bouton HISTORIQUE ne doit pas
  // renvoyer une seconde fois la même partie finie au pipeline History V4.
  React.useEffect(() => {
    if (!state.finished) return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current || typeof onFinish !== "function") return;
    try {
      onFinish(buildHistoryRecord(), { navigate: false });
      autoSavedRef.current = matchIdRef.current;
    } catch { /* Ne pas marquer comme sauvegardé si l'écriture a échoué. */ }
  }, [state.finished]);

  function openFinishedHistory() {
    if (autoSavedRef.current !== matchIdRef.current && typeof onFinish === "function") {
      try {
        onFinish(buildHistoryRecord(), { navigate: true });
        autoSavedRef.current = matchIdRef.current;
        return;
      } catch { /* L'historique reste consultable même si l'écriture échoue. */ }
    }
    if (typeof go === "function") go("statsHub", { tab: "history" });
  }

  React.useEffect(() => {
    if (state.finished) { clearDartsMatchDraft(draftMode); return; }
    if (!state.history.length && !throwDarts.length) return;
    writeDartsMatchDraft(draftMode, config as any, {
      state, throwDarts, multiplier, lastUndo: undoStack.at(-1) || null, matchId: matchIdRef.current,
    });
  }, [draftMode, config, state, throwDarts, multiplier, undoStack]);

  const previewScores = throwDarts.map((d) => halveItTargetScore(target, toGameDart(d)));
  const currentHitCount = previewScores.filter((n) => n > 0).length;
  const currentGain = previewScores.reduce((sum, n) => sum + n, 0);
  const completedPreview = throwDarts.length === 3;
  const previewHalved = completedPreview && target.kind !== "open" && currentHitCount === 0;
  const previewAfter = previewHalved ? (config.rounding === "ceil" ? Math.ceil(activeScore / 2) : Math.floor(activeScore / 2)) : activeScore + currentGain;
  const currentDelta = previewAfter - activeScore;
  const lastVisit = state.history[state.history.length - 1] || null;
  const lastVisitName = lastVisit ? playerName(byId.get(String(lastVisit.playerId)) || state.players.find((p: any) => p.id === lastVisit.playerId)) : "";

  return <div className="msc-halveit-play" style={{ height: "100dvh", minHeight: 0, display: "flex", flexDirection: "column", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, overflow: "hidden" }}>
    <PageHeader tickerSrc={headerTicker} tickerAlt={modeLabel} left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title={`Règles ${modeLabel}`} color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />

    <div className="msc-halveit-stage">
    <div className="msc-halveit-overview" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <section style={{ ...panelStyle(), padding: 0, overflow: "hidden", borderColor: `${primary}88`, boxShadow: `0 0 24px ${primary}20`, marginBottom: 7 }}>
        <div className="msc-halveit-hero" style={{ position: "relative", minHeight: 132, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(150px,185px)", alignItems: "stretch", padding: "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,.08),rgba(0,0,0,.3))" }} />
          <div style={{ position: "absolute", left: -24, top: -4, bottom: -4, width: "32%", minWidth: 100, overflow: "hidden", opacity: .16 }}><div style={{ position: "absolute", left: -20, top: 16, transform: "scale(1.5)", transformOrigin: "left top" }}><ProfileAvatar profile={activeProfile as any} size={82} /></div></div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: 0, textAlign: "center" }}>
            {botThinking ? <div style={{ color: activeTeam?.color || primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1 }}>BOT EN RÉFLEXION</div> : null}
            <div style={{ color: activeTeam?.color || primary, fontSize: 14, fontWeight: 1000, letterSpacing: .8, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{playerName(activeProfile)}</div>
            <div className="msc-halveit-active-score" style={{ marginTop: 5, fontSize: 64, lineHeight: 1, fontWeight: 1000, color: C.gold, textShadow: "0 4px 18px rgba(255,195,26,.25)" }}>{activeScore}</div>
            <div style={{ marginTop: 5, color: themeSoft, fontSize: 9.5, fontWeight: 900 }}>Hits {activeStats.validHits}/{activeStats.darts} · {pct(activeStats.validHits, activeStats.darts)}% · Halves {activeStats.halvingEvents}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", minWidth: 0 }}>
            <div style={{ position: "absolute", inset: "0 0 0 4px", borderRadius: 18, backgroundImage: `linear-gradient(180deg,rgba(4,8,16,.30),rgba(4,8,16,.65)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .72 }} />
            <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 8, textAlign: "center" }}>
              <div style={{ color: themeSoft, fontSize: 9.5, fontWeight: 950, letterSpacing: 1 }}>CIBLE</div>
              <div className="msc-halveit-target-label" style={{ color: secondary, fontSize: target.kind === "number" ? 50 : target.kind === "bull" ? 30 : 25, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${secondary}88`, marginTop: 3 }}>{targetLabel}</div>
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
        <div ref={standingsStripRef} className="msc-halveit-standings-strip" role="list" aria-label={`${modeLabel} — classement des ${state.standings.length} participants`}>
          {state.standings.map((standing) => {
            const team = config.participantMode === "teams" ? teamById.get(standing.id) : null;
            const profile = config.participantMode === "players" ? byId.get(standing.id) : null;
            const isActive = config.participantMode === "teams" ? standing.id === activeTeamId : standing.id === activePlayerId;
            return <div key={standing.id} role="listitem" className="msc-halveit-standing" aria-current={isActive ? "true" : undefined} style={{ padding: "7px 5px", borderRadius: 13, background: isActive ? `${primary}19` : "rgba(255,255,255,.035)", border: `1px solid ${isActive ? primary : standing.rank === 1 ? primary + "66" : themeStroke}`, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{team ? <TeamLogo team={team} size={30} /> : <ProfileAvatar profile={profile as any} size={30} />}</div>
              <div title={standing.name} style={{ fontSize: 9, fontWeight: 950, color: isActive ? primary : team?.color || themeSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{standing.rank}. {standing.name}</div>
              <div style={{ color: primary, fontSize: 20, fontWeight: 1100, lineHeight: 1.1 }}>{standing.score}</div>
              {isActive ? <div style={{ fontSize: 8, color: C.green, fontWeight: 1000, marginTop: 2 }}>EN JEU</div> : null}
            </div>;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 7 }}>
          <button onClick={() => setShowTable(true)} style={miniAction(primary)}>CLASSEMENT</button>
          <button onClick={() => setShowStats(true)} style={miniAction(secondary)}>STATS</button>
        </div>
      </section>

      {state.finished ? <div className="msc-halveit-finished-bar" style={{ ...panelStyle(), marginBottom: 7, padding: "9px 11px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 9 }}>
        <div style={{ minWidth: 0 }}><strong style={{ color: primary, fontSize: 11 }}>PARTIE TERMINÉE</strong><div style={{ color: themeSoft, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.tied ? "Égalité" : `Vainqueur : ${state.standings[0]?.name || "—"}`}</div></div>
        <button type="button" onClick={() => setShowEnd(true)} style={{ ...miniAction(primary), minHeight: 42, flexShrink: 0 }}>VOIR LES RÉSULTATS</button>
      </div> : null}

      {lastVisit ? <div className="msc-halveit-last-visit" aria-live="polite" style={{ ...panelStyle(), padding: "8px 11px", marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11 }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: themeSoft }}><strong style={{ color: primary }}>DERNIÈRE VOLÉE</strong> · {lastVisitName} · {lastVisit.targetLabel}</span>
        <strong style={{ color: lastVisit.halved ? C.red : C.green, whiteSpace: "nowrap" }}>{lastVisit.halved ? `÷2 (−${lastVisit.loss})` : `+${lastVisit.gain}`} · {lastVisit.scoreAfter} pts</strong>
      </div> : null}
    </div>

      {!state.finished ? <section className="msc-halveit-keypad" style={{ ...panelStyle(), padding: 8 }}>
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
          <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= 3} guideTargets={boardGuides} guideLabel={`VISE ${targetLabel}`} guideColor={primary} onHit={(segment, mult) => addDart(segment, mult)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={() => setMultiplier(1)} style={modeButton(multiplier === 1, C.green)}>SIMPLE</button><button onClick={() => setMultiplier(2)} style={modeButton(multiplier === 2, C.cyan)}>DOUBLE</button><button onClick={() => setMultiplier(3)} style={modeButton(multiplier === 3, C.pink)}>TRIPLE</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={cancelOrUndo} style={actionButton(C.gold)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateVisit} style={actionButton(C.green)}>VALIDER</button></div>
        </> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}><Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25, multiplier === 2 ? 2 : 1)} onValidate={validateVisit} hidePreview hideTotal centerSlot={<div style={{ textAlign: "center", color: primary, fontWeight: 1000, fontSize: 11 }}>{targetLabel}<div style={{ fontSize: 8, color: themeSoft }}>{throwDarts.length}/3 · DOUBLE + BULL = 50</div></div>} noticeSlot={notice ? <span>{notice}</span> : null} validateAttention={throwDarts.length === 3} safeBottomPad /></div>}
      </section> : null}
    </div>

    {showTable ? <StandingsModal modeLabel={modeLabel} state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
    {showStats ? <LiveStatsModal modeLabel={modeLabel} state={state} profilesById={byId} primary={primary} onClose={() => setShowStats(false)} /> : null}
    {showEnd && state.finished ? <EndModal modeLabel={modeLabel} state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={openFinishedHistory} /> : null}
  </div>;
}

function modeButton(active: boolean, color: string): React.CSSProperties { return { minHeight: 40, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, cursor: "pointer" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }
function miniAction(color: string): React.CSSProperties { return { minHeight: 34, borderRadius: 12, border: `1px solid ${color}66`, background: `${color}10`, color, fontSize: 9.5, fontWeight: 1000, letterSpacing: .5, cursor: "pointer" }; }
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }

function StandingsModal({ modeLabel, state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(760px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT {modeLabel}</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>Hits {standing.hits} · Halves {standing.halves} · {standing.visits} volées</div></div><div style={{ color: primary, fontSize: 24, fontWeight: 1100 }}>{standing.score}</div></div>)}</div>
  </div></div>;
}

function LiveStatsModal({ modeLabel, state, profilesById, primary, onClose }: any) {
  const rows = state.players.map((p: any) => ({
    p,
    profile: profilesById.get(p.id) || p,
    stats: state.statsByPlayer[p.id] || emptyHalveItStats(),
    score: state.scoresByPlayer[p.id] || 0,
  })).sort((a: any, b: any) => b.score - a.score);
  const totalVisits = rows.reduce((sum: number, row: any) => sum + row.stats.visits, 0);
  const totalHalves = rows.reduce((sum: number, row: any) => sum + row.stats.halvingEvents, 0);
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.74)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}>
    <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Statistiques ${modeLabel}`} style={{ ...panelStyle(), width: "min(900px,100%)", maxHeight: "90dvh", overflow: "auto", padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ color: primary, fontWeight: 1000, letterSpacing: .6 }}>SUIVI DE PERFORMANCE · {modeLabel}</div>
        <button type="button" aria-label="Fermer les statistiques" onClick={onClose} style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button>
      </div>
      <div style={{ marginTop: 6, color: C.soft, fontSize: 11 }}>{totalVisits} volées validées · {totalHalves} pénalité{totalHalves > 1 ? "s" : ""} ÷2 · Manche {Math.min(state.roundIndex + 1, state.targets.length)}/{state.targets.length}</div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 9 }}>
        {rows.map((r: any) => <div key={r.p.id} style={{ minWidth: 0, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProfileAvatar profile={r.profile} size={34} /><div style={{ minWidth: 0 }}><div style={{ color: primary, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(r.profile)}</div><div style={{ fontSize: 23, fontWeight: 1100 }}>{r.score} <span style={{ color: C.soft, fontSize: 10 }}>pts</span></div></div></div>
          <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, fontSize: 9.5 }}>
            <StatKpi label="Touches" value={r.stats.validHits} />
            <StatKpi label="Précision" value={`${pct(r.stats.validHits,r.stats.darts)}%`} />
            <StatKpi label="Volées OK" value={`${pct(r.stats.successfulVisits,r.stats.visits)}%`} />
            <StatKpi label="÷ 2" value={r.stats.halvingEvents} />
            <StatKpi label="Best" value={r.stats.bestVisit} />
            <StatKpi label="Série max" value={r.stats.bestSuccessStreak} />
            <StatKpi label="Points +" value={`+${r.stats.pointsWon}`} />
            <StatKpi label="Points −" value={`−${r.stats.pointsLostByHalving}`} />
            <StatKpi label="0 / 3" value={r.stats.failedVisits} />
          </div>
          <div style={{ color: primary, fontWeight: 1000, fontSize: 10, margin: "12px 0 7px" }}>DÉTAIL PAR CIBLE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(62px,1fr))", gap: 5 }}>
            {state.targets.map((target: HalveItTarget, index: number) => {
              const stat = r.stats.targets?.[String(target.id)];
              const attempts = stat?.attempts || 0;
              const hits = stat?.validHits || 0;
              return <div key={`${target.id}-${index}`} title={targetHint(target)} style={{ padding: "7px 4px", textAlign: "center", borderRadius: 10, background: "rgba(0,0,0,.25)", border: `1px solid ${attempts ? (hits ? `${C.green}66` : `${C.red}66`) : "rgba(255,255,255,.07)"}` }}>
                <div style={{ fontSize: 9, fontWeight: 1000, color: C.soft }}>{target.label}</div>
                <div style={{ fontSize: 13, fontWeight: 1000, color: !attempts ? C.soft : hits ? C.green : C.red }}>{attempts ? `${hits}/${stat?.darts || attempts * 3}` : "—"}</div>
                {attempts ? <div style={{ fontSize: 9, color: C.soft }}>{stat?.pointsLost ? `−${stat.pointsLost}` : `+${stat?.pointsWon || 0}`} pts</div> : null}
              </div>;
            })}
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}
function StatKpi({ label, value }: any) { return <div style={{ padding: 7, borderRadius: 10, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ opacity: .55, fontSize: 8 }}>{label}</div><div style={{ fontWeight: 1000 }}>{value}</div></div>; }

// V182 — Résultats lisibles sur téléphone et classement réel des ÉQUIPES.
// Le classement final vient de state.standings (source du moteur), jamais d'un
// tri par score individuel qui inverserait le résultat d'une partie en équipe.
function EndModal({ modeLabel, state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const standings = Array.isArray(state.standings) ? state.standings : [];
  const winnerIds = new Set<string>((state.winnerIds || []).map(String));
  const teamsMode = participantMode === "teams" && Array.isArray(state.teams) && state.teams.length > 0;
  const rows = state.players.map((player: any) => ({
    player,
    profile: profilesById.get(String(player.id)) || player,
    stats: state.statsByPlayer[player.id] || emptyHalveItStats(),
    score: Number(state.scoresByPlayer[player.id] || 0),
    teamId: state.teamByPlayer?.[player.id] || null,
  })).sort((a: any, b: any) => {
    const rankA = standings.find((r: any) => String(r.id) === String(teamsMode ? a.teamId : a.player.id))?.rank ?? 999;
    const rankB = standings.find((r: any) => String(r.id) === String(teamsMode ? b.teamId : b.player.id))?.rank ?? 999;
    return rankA - rankB || b.score - a.score;
  });
  const winnerNames = standings.filter((row: any) => winnerIds.has(String(row.id))).map((row: any) => row.name);
  const totalDarts = rows.reduce((n: number, row: any) => n + row.stats.darts, 0);
  const totalHalves = rows.reduce((n: number, row: any) => n + row.stats.halvingEvents, 0);
  const totalPerfect = rows.reduce((n: number, row: any) => n + row.stats.perfectVisits, 0);
  const recentVisits = (state.history || []).slice(-8).reverse();

  return <div onClick={onClose} className="msc-halveit-end-backdrop" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}>
    <div onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Résultats ${modeLabel}`} style={{ ...panelStyle(), width: "min(920px,100%)", maxHeight: "94dvh", overflowY: "auto", overflowX: "hidden", borderColor: `${primary}77`, padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ width: 34 }} />
        <div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>{modeLabel}</div></div>
        <button type="button" aria-label="Fermer les résultats" onClick={onClose} style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button>
      </div>

      <div style={{ marginTop: 11, padding: 12, borderRadius: 16, background: `${primary}10`, border: `1px solid ${primary}44`, textAlign: "center" }}>
        <div style={{ color: C.gold, fontSize: 10, fontWeight: 1000 }}>{state.tied ? "ÉGALITÉ EN TÊTE" : "VAINQUEUR"}</div>
        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 1100, overflowWrap: "anywhere" }}>{winnerNames.join(" / ") || standings[0]?.name || "—"}</div>
        <div style={{ color: primary, fontSize: 30, fontWeight: 1100 }}>{standings[0]?.score ?? 0} <span style={{ fontSize: 12 }}>pts</span></div>
        {teamsMode ? <div style={{ color: C.soft, fontSize: 10 }}>Résultat calculé sur le total des membres de chaque équipe</div> : null}
      </div>

      <div className="msc-halveit-end-kpis" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        {[["Durée", fmtDuration((state.finishedAt || Date.now()) - state.startedAt)], ["Fléchettes", totalDarts], ["Divisions ÷2", totalHalves], ["Volées 3/3", totalPerfect]].map(([label, value]: any) => <div key={label} style={{ minWidth: 0, padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>{label}</div><div style={{ fontWeight: 1100, fontSize: 18, color: primary }}>{value}</div></div>)}
      </div>

      <section style={{ marginTop: 13 }} aria-label="Classement final">
        <div style={{ color: primary, fontWeight: 1000, fontSize: 11, letterSpacing: .7, marginBottom: 7 }}>CLASSEMENT FINAL {teamsMode ? "DES ÉQUIPES" : "DES JOUEURS"}</div>
        <div style={{ display: "grid", gap: 7 }}>
          {standings.map((row: any) => {
            const winner = winnerIds.has(String(row.id));
            return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "25px 36px minmax(0,1fr) auto", alignItems: "center", gap: 8, minWidth: 0, padding: 9, borderRadius: 13, background: winner ? `${primary}14` : "rgba(255,255,255,.04)", border: `1px solid ${winner ? `${primary}77` : "rgba(255,255,255,.08)"}` }}>
              <div style={{ textAlign: "center", color: winner ? C.gold : C.soft, fontWeight: 1000 }}>{row.rank}</div>
              {teamsMode ? <TeamLogo team={teamById.get(String(row.id))} size={34} /> : <ProfileAvatar profile={profilesById.get(String(row.id))} size={34} />}
              <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: 1000, fontSize: 12 }}>{row.name}{winner ? " 🏆" : ""}</div><div style={{ color: C.soft, fontSize: 9 }}>{row.hits} touches · {row.halves} divisions · {row.visits} volées</div></div>
              <div style={{ color: winner ? C.gold : primary, fontSize: 23, fontWeight: 1100 }}>{row.score}</div>
            </div>;
          })}
        </div>
      </section>

      <section style={{ marginTop: 13 }} aria-label="Performances individuelles">
        <div style={{ color: primary, fontWeight: 1000, fontSize: 11, letterSpacing: .7, marginBottom: 7 }}>PERFORMANCES PAR JOUEUR</div>
        <div style={{ display: "grid", gap: 7 }}>
          {rows.map((row: any) => <details key={row.player.id} style={{ padding: 10, borderRadius: 13, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}>
            <summary style={{ cursor: "pointer", listStylePosition: "inside", color: primary, fontWeight: 1000, fontSize: 12 }}>
              {playerName(row.profile)} · {row.score} pts{teamsMode && row.teamId ? ` · ${teamById.get(String(row.teamId))?.name || "Équipe"}` : ""}
            </summary>
            <div className="msc-halveit-player-kpis" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
              <StatKpi label="Touches" value={row.stats.validHits} />
              <StatKpi label="Précision" value={`${pct(row.stats.validHits, row.stats.darts)}%`} />
              <StatKpi label="Volées OK" value={`${pct(row.stats.successfulVisits, row.stats.visits)}%`} />
              <StatKpi label="Divisions ÷2" value={row.stats.halvingEvents} />
              <StatKpi label="Meilleure volée" value={row.stats.bestVisit} />
              <StatKpi label="Série max" value={row.stats.bestSuccessStreak} />
              <StatKpi label="Points gagnés" value={`+${row.stats.pointsWon}`} />
              <StatKpi label="Points perdus" value={`−${row.stats.pointsLostByHalving}`} />
              <StatKpi label="Volées 0/3" value={row.stats.failedVisits} />
            </div>
            <div style={{ color: C.soft, margin: "10px 0 6px", fontSize: 10, fontWeight: 900 }}>CIBLE PAR CIBLE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 6 }}>
              {state.targets.map((target: HalveItTarget) => {
                const stat = row.stats.targets?.[String(target.id)];
                const attempted = Number(stat?.attempts || 0);
                return <div key={target.id} style={{ padding: 7, borderRadius: 10, background: "rgba(0,0,0,.25)", border: `1px solid ${attempted ? (stat.validHits ? `${C.green}55` : `${C.red}55`) : "rgba(255,255,255,.06)"}`, textAlign: "center" }}>
                  <div style={{ color: C.soft, fontSize: 9 }}>{target.label}</div>
                  <div style={{ color: attempted && stat?.validHits ? C.green : C.red, fontWeight: 1100 }}>{attempted ? `${stat.validHits}/${stat.darts}` : "—"}</div>
                  <div style={{ fontSize: 9, color: C.soft }}>{attempted ? `${stat.pointsWon ? "+"+stat.pointsWon : ""}${stat.pointsLost ? " −"+stat.pointsLost : ""}` || "0 pt" : "pas jouée"}</div>
                </div>;
              })}
            </div>
          </details>)}
        </div>
      </section>

      {recentVisits.length > 0 ? <section style={{ marginTop: 13 }} aria-label="Dernières volées">
        <div style={{ color: primary, fontWeight: 1000, fontSize: 11, letterSpacing: .7, marginBottom: 7 }}>DERNIÈRES VOLÉES</div>
        <div style={{ display: "grid", gap: 5 }}>{recentVisits.map((visit: any) => <div key={visit.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 7, background: "rgba(255,255,255,.035)", padding: "8px 10px", borderRadius: 10, fontSize: 10 }}>
          <div style={{ minWidth: 0, flex: "1 1 145px" }}><strong>{playerName(profilesById.get(String(visit.playerId)) || state.players.find((p: any) => String(p.id) === String(visit.playerId)))}</strong><span style={{ color: C.soft }}> · {visit.targetLabel} · {(visit.labels || []).join(" / ")}</span></div>
          <div style={{ color: visit.halved ? C.red : C.green, fontWeight: 1000, whiteSpace: "nowrap" }}>{visit.scoreBefore} → {visit.scoreAfter} ({visit.delta > 0 ? "+" : ""}{visit.delta})</div>
        </div>)}</div>
      </section> : null}

      <div className="msc-halveit-end-actions" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        <button type="button" onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button>
        <button type="button" onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button>
      </div>
    </div>
  </div>;
}
