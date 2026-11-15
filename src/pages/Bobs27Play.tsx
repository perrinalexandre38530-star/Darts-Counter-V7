// @ts-nocheck
// =============================================================
// BOB'S 27 — moteur complet, bots, undo, équipes, stats/history
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
  bobs27TargetLabel,
  bobs27TargetValue,
  cloneBobs27State,
  createBobs27State,
  emptyBobs27Stats,
  getBobs27ActivePlayerId,
  getBobs27CurrentTarget,
  playBobs27Visit,
  type Bobs27ConfigPayload,
  type Bobs27PlayerStats,
  type Bobs27State,
  type Bobs27TeamConfig,
} from "../lib/gameEngines/bobs27Engine";
import tickerBobs27 from "../assets/tickers/ticker_bobs_27.png";
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
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }

function normalizeConfig(props: any): Bobs27ConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  return {
    mode: "bobs_27", participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 1)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [], teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {}, botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [], botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    startingScore: Math.max(1, Number(raw?.startingScore || 27)), startTarget: Math.max(1, Math.min(20, Number(raw?.startTarget || 1))),
    endTarget: Math.max(1, Math.min(20, Number(raw?.endTarget || 20))), includeBull: raw?.includeBull !== false,
    negativeRule: raw?.negativeRule === "continue" ? "continue" : "eliminate", randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

const BOBS27_SAVE_KEY = "mss_bobs27_active_match_v1";
function matchSignature(config: Bobs27ConfigPayload) {
  return JSON.stringify({ ids: config.selectedIds, teams: (config.teamConfigs || []).map((t) => ({ id: t.id, playerIds: t.playerIds })), participantMode: config.participantMode, start: config.startingScore, from: config.startTarget, to: config.endTarget, bull: config.includeBull, negative: config.negativeRule });
}
function readBobs27Save(config: Bobs27ConfigPayload): { state: Bobs27State; undo: Bobs27State[]; darts: UiDart[]; matchId: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(BOBS27_SAVE_KEY) || "null");
    if (!saved || saved.version !== 1 || saved.signature !== matchSignature(config)) return null;
    const state = saved.state as Bobs27State;
    if (state?.mode !== "bobs_27" || state.finished || !Array.isArray(state.history) || !Array.isArray(state.targets) || !Array.isArray(state.turnOrder) || !state.targets.length || !state.players?.length || !state.statsByPlayer || !state.scoresByPlayer) return null;
    if (state.turnOrder.some((id) => !state.players.some((p) => p.id === id))) return null;
    if (!Number.isInteger(state.roundIndex) || state.roundIndex < 0 || state.roundIndex >= state.targets.length) return null;
    if (!Number.isInteger(state.activePlayerIndex) || state.activePlayerIndex < 0 || state.activePlayerIndex >= state.turnOrder.length) return null;
    const darts = Array.isArray(saved.darts) ? saved.darts.slice(0, 3).filter((d: any) => Number.isInteger(d?.v) && d.v >= 0 && d.v <= 25 && [1,2,3].includes(d.mult)) : [];
    return { state, darts, undo: Array.isArray(saved.undo) ? saved.undo.slice(-49) : [], matchId: String(saved.matchId || `bobs27-${Date.now()}`) };
  } catch { return null; }
}
function botHitChance(level: string) { const v = String(level || "").toLowerCase(); if (v.includes("hard") || v.includes("pro") || v.includes("diffic")) return .58; if (v.includes("easy") || v.includes("facile")) return .24; return .39; }
function randomBotVisit(target: number, level: string): UiDart[] {
  const chance = botHitChance(level);
  return Array.from({ length: 3 }, () => {
    if (Math.random() < chance) return target === 25 ? { v: 25, mult: 2 as const } : { v: target, mult: 2 as const };
    if (Math.random() < .16) return { v: 0, mult: 1 as const };
    if (target === 25) return Math.random() < .45 ? { v: 25, mult: 1 as const } : { v: 20, mult: Math.random() < .3 ? 3 as const : 1 as const };
    let value = Math.max(1, Math.min(20, target + (Math.random() < .5 ? -1 : 1)));
    if (value === target) value = target === 20 ? 19 : target + 1;
    const roll = Math.random(); return { v: value, mult: roll < .2 ? 2 as const : roll < .35 ? 3 as const : 1 as const };
  });
}

function RulesContent({ config, primary }: { config: Bobs27ConfigPayload; primary: string }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: primary }}>DÉPART</strong><br />Chaque joueur commence à {config.startingScore} points.</div>
    <div><strong style={{ color: primary }}>PARCOURS</strong><br />3 fléchettes par cible : D{config.startTarget} → D{config.endTarget}{config.includeBull ? " → DBULL" : ""}.</div>
    <div><strong style={{ color: C.green }}>RÉUSSITE</strong><br />Chaque touche sur le double demandé ajoute sa valeur. Deux touches comptent deux fois, trois touches trois fois.</div>
    <div><strong style={{ color: C.red }}>ÉCHEC</strong><br />0/3 retire une seule fois la valeur du double demandé.</div>
    <div><strong style={{ color: C.gold }}>SOUS 0</strong><br />{config.negativeRule === "eliminate" ? "Le joueur est éliminé immédiatement." : "Le joueur continue et son score peut devenir négatif."}</div>
    <div><strong style={{ color: primary }}>ANNULER</strong><br />Retire une fléchette de la volée ; volée vide, restaure le tour précédent.</div>
  </div>;
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || null;
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${team?.color || C.gold}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${team?.color || C.gold}18`, boxShadow: `0 0 15px ${team?.color || C.gold}44`, flex: "0 0 auto" }}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: team?.color || C.gold, fontWeight: 1000, fontSize: size * .34 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}</div>;
}

function DartSvg({ color = "rgba(255,255,255,.38)", size = 20, rotate = -12 }: { color?: string; size?: number; rotate?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ transform: `rotate(${rotate}deg)`, filter: `drop-shadow(0 0 8px ${color}35)` }}>
    <path d="M6 25 L15.4 15.6" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M15.8 15.2 L22.8 8.2" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M22.2 7.2 L27.4 4.8 L25 10 L20.4 11.2 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M5.2 24.2 L3.4 28.6 L7.8 26.8" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </svg>;
}

function QuickIcon({ kind, color = C.gold, size = 18 }: { kind: string; color?: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as any;
  if (kind === "players") return <svg {...common}><circle cx="8" cy="8" r="3"/><path d="M3.5 18c1-3 3.2-4.5 5.5-4.5S13.5 15 14.5 18"/><circle cx="17" cy="9" r="2.4"/><path d="M14.8 18c.8-2.2 2.5-3.5 4.7-3.7"/></svg>;
  if (kind === "standings") return <svg {...common}><path d="M7 20V10"/><path d="M12 20V6"/><path d="M17 20V13"/><path d="M4 20h16"/></svg>;
  if (kind === "stats") return <svg {...common}><path d="M5 18V9"/><path d="M10 18V5"/><path d="M15 18v-7"/><path d="M20 18V8"/></svg>;
  if (kind === "visits") return <svg {...common}><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="8"/></svg>;
  if (kind === "rules") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.8 2.1c-1 .6-1.4 1.1-1.4 2"/><circle cx="12" cy="17.2" r=".7" fill={color} stroke="none"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
}


export default function Bobs27Play(props: any) {
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
  const teamConfigs = React.useMemo<Bobs27TeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({ id: String(team?.id || `team-${index + 1}`), name: String(team?.name || `Équipe ${index + 1}`), color: team?.color || [C.gold, C.pink, C.cyan, C.green][index % 4], logoDataUrl: team?.logoDataUrl || team?.logoUrl || null, playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [], isBotTeam: Boolean(team?.isBotTeam) })), [config.teamConfigs]);
  const rules = React.useMemo(() => ({ participantMode: config.participantMode, startingScore: config.startingScore, startTarget: config.startTarget, endTarget: Math.max(config.startTarget, config.endTarget), includeBull: config.includeBull, negativeRule: config.negativeRule }), [config]);
  const initialState = React.useMemo(() => createBobs27State(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<Bobs27State>(initialState);
  const [undoStack, setUndoStack] = React.useState<Bobs27State[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showPlayers, setShowPlayers] = React.useState(false);
  const [showPerformance, setShowPerformance] = React.useState(false);
  const [showVisits, setShowVisits] = React.useState(false);
  const [inspectedTarget, setInspectedTarget] = React.useState<number | null>(null);
  const [showRulesInline, setShowRulesInline] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [restoreChoice, setRestoreChoice] = React.useState<ReturnType<typeof readBobs27Save>>(null);
  const [storageReady, setStorageReady] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`bobs27-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);
  const progressStripRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const strip = progressStripRef.current;
    const current = strip?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!strip || !current) return;
    // Ne pas déplacer la page : on défile uniquement le parcours horizontal.
    const left = current.offsetLeft - strip.offsetLeft - (strip.clientWidth - current.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [state.roundIndex, state.finished]);

  React.useEffect(() => {
    const found = readBobs27Save(config);
    if (found && found.state.history.length) setRestoreChoice(found);
    else setStorageReady(true);
  }, []);
  React.useEffect(() => {
    if (!storageReady) return;
    try {
      if (state.finished) { localStorage.removeItem(BOBS27_SAVE_KEY); return; }
      if (!state.history.length && !throwDarts.length) { localStorage.removeItem(BOBS27_SAVE_KEY); return; }
      localStorage.setItem(BOBS27_SAVE_KEY, JSON.stringify({ version: 1, signature: matchSignature(config), matchId: matchIdRef.current, state, undo: undoStack.slice(-49), darts: throwDarts }));
    } catch { /* Le stockage plein ou désactivé ne doit pas bloquer la partie. */ }
  }, [storageReady, state, undoStack, throwDarts, config]);
  function resolveRestoration(resume: boolean) {
    if (resume && restoreChoice) {
      setState(cloneBobs27State(restoreChoice.state));
      setUndoStack(restoreChoice.undo);
      setThrowDarts(restoreChoice.darts);
      matchIdRef.current = restoreChoice.matchId;
      setNotice("Partie BOB’S 27 restaurée.");
    } else {
      try { localStorage.removeItem(BOBS27_SAVE_KEY); } catch {}
    }
    setRestoreChoice(null);
    setStorageReady(true);
  }

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const activePlayerId = getBobs27ActivePlayerId(state);
  const activeProfile = byId.get(String(activePlayerId)) || state.players.find((p) => p.id === activePlayerId) || state.players[0];
  const activeStats = state.statsByPlayer[activePlayerId] || emptyBobs27Stats();
  const activeTeamId = state.teamByPlayer[activePlayerId] || null;
  const activeTeam = activeTeamId ? teamById.get(activeTeamId) : null;
  const activeScore = Number(state.scoresByPlayer[activePlayerId] || 0);
  const target = getBobs27CurrentTarget(state);
  const targetValue = bobs27TargetValue(target);
  const targetLabel = bobs27TargetLabel(target);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  function commitVisit(darts: UiDart[]) {
    if (state.finished || darts.length < 1) return;
    setUndoStack((stack) => [...stack.slice(-49), cloneBobs27State(state)]);
    setState((prev) => playBobs27Visit(prev, darts.map(toGameDart)));
    setThrowDarts([]); setMultiplier(1); setNotice("");
  }
  function addDart(value: number, directMultiplier?: 1 | 2 | 3) {
    if (!storageReady || restoreChoice || state.finished || botThinking || isBot(activeProfile, botIds) || throwDarts.length >= 3) return;
    const mult = directMultiplier || multiplier;
    const dart: UiDart = value === 25 ? { v: 25, mult: mult === 2 ? 2 : 1 } : { v: Math.max(0, Math.min(20, Number(value) || 0)), mult };
    const next = [...throwDarts, dart]; setThrowDarts(next); if (mult > 1) setMultiplier(1);
    if (next.length === 3) setNotice("Volée complète — VALIDER");
  }
  function validateVisit() {
    if (!storageReady || restoreChoice || state.finished || botThinking || isBot(activeProfile, botIds)) return;
    if (throwDarts.length !== 3) { setNotice("Bob’s 27 se joue avec 3 fléchettes par cible."); return; }
    commitVisit(throwDarts);
  }
  function cancelOrUndo() {
    if (botThinking || restoreChoice) return;
    if (throwDarts.length) { setThrowDarts((prev) => prev.slice(0, -1)); setMultiplier(1); setNotice(""); return; }
    if (undoStack.length) { const previous = undoStack[undoStack.length - 1]; setUndoStack((stack) => stack.slice(0, -1)); setState(cloneBobs27State(previous)); setShowEnd(false); setNotice("Tour précédent restauré."); }
  }

  React.useEffect(() => {
    if (!storageReady || restoreChoice || !activeProfile || state.finished || !isBot(activeProfile, botIds)) { setBotThinking(false); return; }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => {
      const darts = randomBotVisit(target, String(level));
      commitVisit(darts);
      setBotThinking(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [storageReady, restoreChoice, state.history.length, state.roundIndex, state.activePlayerIndex, state.finished, activePlayerId, target]);

  function resetMatch() {
    const next = createBobs27State(profiles as any, rules, teamConfigs, config.selectedIds);
    try { localStorage.removeItem(BOBS27_SAVE_KEY); } catch {}
    setState(next); setUndoStack([]); setThrowDarts([]); setMultiplier(1); setShowEnd(false); setShowTable(false); setShowPlayers(false); setShowPerformance(false); setShowVisits(false); setShowRulesInline(false); setNotice("");
    matchIdRef.current = `bobs27-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; autoSavedRef.current = "";
  }
  function backToConfig() {
    const now = Date.now(); if (now - lastBackRef.current < 350) return; lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter Bob’s 27 ? La partie sera conservée pour une reprise ultérieure.")) return;
    if (typeof go === "function") go("bobs_27_config", config);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityIds = new Set(state.winnerIds || []);
    const teams = state.teams.map((team) => { const standing = state.standings.find((row) => row.id === team.id); return { ...team, players: team.playerIds, score: standing?.score || 0, points: standing?.score || 0, hits: standing?.hits || 0, winner: winnerEntityIds.has(team.id) }; });
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player; const stats: Bobs27PlayerStats = state.statsByPlayer[player.id] || emptyBobs27Stats();
      const teamId = state.teamByPlayer[player.id] || null; const entityId = config.participantMode === "teams" ? teamId : player.id; const standing = state.standings.find((row) => row.id === entityId);
      const win = Boolean(entityId && winnerEntityIds.has(entityId)); const score = Number(state.scoresByPlayer[player.id] || 0);
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, teamId, team: teamId, teamName: teamId ? teamById.get(teamId)?.name : null,
        win, winner: win, rank: standing?.rank || 1, score, points: score, finalScore: score, startingScore: state.rules.startingScore,
        eliminated: Boolean(state.eliminatedByPlayer[player.id]), eliminatedAtTarget: stats.eliminatedAtTarget,
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, targetAttempts: stats.targetAttempts, targetHits: stats.targetHits, validHits: stats.targetHits,
        misses: stats.misses, wastedDarts: stats.wastedDarts, singles: stats.singles, doubles: stats.doubles, triples: stats.triples, bulls: stats.bulls, dbulls: stats.dbulls, validDoubles: stats.validDoubles,
        successfulVisits: stats.successfulVisits, failedVisits: stats.failedVisits, oneHitVisits: stats.oneHitVisits, twoHitVisits: stats.twoHitVisits, threeHitVisits: stats.threeHitVisits, perfectVisits: stats.perfectVisits,
        pointsWon: stats.pointsWon, penaltyEvents: stats.penaltyEvents, pointsLost: stats.pointsLost, netPoints: stats.netPoints, bestVisit: stats.bestVisit, bestVisitHits: stats.bestVisitHits,
        bestSuccessStreak: stats.bestSuccessStreak, targetsCleared: stats.targetsCleared, lastTargetReached: stats.lastTargetReached,
        doubleAccuracy: pct(stats.targetHits, stats.darts), successRate: pct(stats.successfulVisits, stats.visits), failureRate: pct(stats.failedVisits, stats.visits),
        averagePointsWonPerVisit: stats.visits ? Math.round((stats.pointsWon / stats.visits) * 10) / 10 : 0,
        targetStats: stats.targets, rawStats: stats,
      };
    });
    const winnerStanding = state.standings[0] || null; const winnerId = state.tied ? null : winnerStanding?.id || null;
    const matchStats = {
      durationMs: Math.max(0, (state.finishedAt || now) - state.startedAt), totalDarts: playerRows.reduce((a, p) => a + p.darts, 0), totalHits: playerRows.reduce((a, p) => a + p.targetHits, 0),
      totalPointsWon: playerRows.reduce((a, p) => a + p.pointsWon, 0), totalPointsLost: playerRows.reduce((a, p) => a + p.pointsLost, 0), perfectVisits: playerRows.reduce((a, p) => a + p.perfectVisits, 0),
      doubleAccuracy: pct(playerRows.reduce((a, p) => a + p.targetHits, 0), playerRows.reduce((a, p) => a + p.darts, 0)), targets: state.targets.length,
    };
    const summary = {
      kind: "bobs_27", mode: "bobs_27", sport: "darts", finished: true, participantMode: config.participantMode,
      winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      startingScore: state.rules.startingScore, targetSequence: [...state.targets], targetsPlayed: state.finishReason === "completed" ? state.targets.length : Math.min(state.roundIndex + 1, state.targets.length),
      finishReason: state.finishReason, duration: matchStats.durationMs, durationMs: matchStats.durationMs, standings: state.standings, rankings: state.standings,
      players: playerRows, perPlayer: playerRows, teams, matchStats, scoreLine: state.standings.map((row) => `${row.name} ${row.score}`).join(" • "), game: { mode: "bobs_27", teams },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "bobs_27", mode: "bobs_27", sport: "darts", status: "finished", createdAt: state.startedAt, updatedAt: now,
      winnerId, winnerIds: state.winnerIds, players: playerRows, teams, game: { mode: "bobs_27", teams }, summary,
      payload: { kind: "bobs_27", mode: "bobs_27", sport: "darts", winnerId, winnerIds: state.winnerIds, tied: state.tied, config, rules: state.rules, players: playerRows, teams, summary, visits: state.history, visitHistory: state.history, state: { roundIndex: state.roundIndex, targets: state.targets, scoresByPlayer: state.scoresByPlayer, eliminatedByPlayer: state.eliminatedByPlayer, standings: state.standings, finishReason: state.finishReason }, stats: { sport: "darts", mode: "bobs_27", players: playerRows, teams, match: matchStats, global: matchStats } },
    };
  }

  React.useEffect(() => {
    if (!state.finished) return; setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current || typeof onFinish !== "function") return;
    try { onFinish(buildHistoryRecord(), { navigate: false }); autoSavedRef.current = matchIdRef.current; }
    catch (error) { console.error("BOB’S 27 : sauvegarde des résultats impossible", error); setNotice("Enregistrement impossible : consultez les résultats et réessayez via HISTORIQUE & STATS."); }
  }, [state.finished]);

  const currentHitCount = throwDarts.filter((d) => target === 25 ? d.v === 25 && d.mult === 2 : d.v === target && d.mult === 2).length;
  const currentDelta = currentHitCount ? currentHitCount * targetValue : throwDarts.length === 3 ? -targetValue : 0;
  const projectedRawScore = activeScore + currentDelta;
  const projectedScore = state.rules.negativeRule === "eliminate" && projectedRawScore < 0 ? 0 : projectedRawScore;
  const possibleMinRaw = currentHitCount ? projectedRawScore : activeScore - targetValue;
  const possibleMin = state.rules.negativeRule === "eliminate" ? Math.max(0, possibleMinRaw) : possibleMinRaw;
  const possibleMax = activeScore + (currentHitCount + (3 - throwDarts.length)) * targetValue;
  const remainingDarts = Math.max(0, 3 - throwDarts.length);
  const atRisk = state.rules.negativeRule === "eliminate" && currentHitCount === 0 && activeScore - targetValue < 0;
  const progressTargets = state.targets;
  const latestVisit = state.history[state.history.length - 1];
  const isValidDart = (dart: UiDart) => target === 25 ? dart.v === 25 && dart.mult === 2 : dart.v === target && dart.mult === 2;
  function removeEnteredDart(index: number) {
    if (!storageReady || restoreChoice || botThinking || state.finished || isBot(activeProfile, botIds)) return;
    setThrowDarts((previous) => previous.filter((_, i) => i !== index));
    setMultiplier(1);
    setNotice("Fléchette retirée. Corrige la saisie avant validation.");
  }

  // Présentation inspirée de SHOVE A PENNY : carte active, outils, tableau et saisie.
  const compactPanel: React.CSSProperties = { ...panelStyle(), padding: 8, borderRadius: 14, boxShadow: "none" };
  const roundNumber = Math.min(state.roundIndex + 1, state.targets.length);
  return <div data-bobs27-shove-layout="1" style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}18 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerBobs27} tickerAlt="BOB'S 27" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles de Bob's 27" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />
    <style>{`
      [data-bobs27-shove-layout] { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; }
      [data-bobs27-shove-layout] *, [data-bobs27-shove-layout] *::before, [data-bobs27-shove-layout] *::after { box-sizing: border-box; }
      .bobs27-page { container-type: inline-size; width: 100%; max-width: 1100px; min-width: 0; }
      .bobs27-layout-columns, .bobs27-layout-columns > div, .bobs27-layout-columns > section { min-width: 0; max-width: 100%; width: 100%; }
      .bobs27-layout-columns nav, .bobs27-layout-columns nav button { min-width: 0; max-width: 100%; }
      .bobs27-layout-columns nav button span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
      .bobs27-doubles-strip { width: 100%; max-width: 100%; min-width: 0; overscroll-behavior-x: contain; }
      @container (min-width: 850px) { .bobs27-layout-columns { grid-template-columns: minmax(0,.95fr) minmax(0,1.05fr) !important; } }
      @container (max-width: 420px) { .bobs27-layout-columns nav button { flex-direction: column; gap: 2px !important; } .bobs27-layout-columns nav button span { font-size: 8px !important; } }
    `}</style>
    <main className="bobs27-page" style={{ width: "100%", maxWidth: 1100, minWidth: 0, margin: "0 auto", padding: "6px 8px 10px", boxSizing: "border-box" }}>
      <div className="bobs27-layout-columns" style={{ display: "grid", width: "100%", minWidth: 0, gridTemplateColumns: "minmax(0,1fr)", alignItems: "start", gap: 7 }}>
        <div style={{ display: "grid", width: "100%", gridTemplateColumns: "minmax(0,1fr)", gap: 7, minWidth: 0 }}>
          {/* Carte active + objectif, structurés au plus près de SHOVE A PENNY */}
          <section data-bobs27-active-player="mss-hero-shove" aria-label="Joueur actif et cible" style={{ position: "relative", width: "100%", maxWidth: "100%", minWidth: 0, isolation: "isolate", minHeight: 136, borderRadius: 18, overflow: "hidden", border: `1px solid ${primary}b8`, background: `linear-gradient(98deg,${primary}18,rgba(8,12,20,.985) 63%)`, boxShadow: `0 0 0 1px ${primary}60, inset 0 1px 0 ${primary}99, inset 0 0 32px ${primary}15, 0 14px 30px rgba(0,0,0,.24)` }}>
            {(() => { const avatar = activeProfile?.avatarDataUrl || activeProfile?.avatarUrl || activeProfile?.avatar || activeProfile?.photoDataUrl; return typeof avatar === "string" && avatar ? <img src={avatar} alt="" aria-hidden="true" style={{ position: "absolute", left: -18, top: -6, width: 222, height: 178, objectFit: "cover", opacity: .22, filter: "saturate(.84)", pointerEvents: "none" }} /> : null; })()}
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg,rgba(4,6,11,.08) 0%,rgba(4,6,11,.26) 36%,rgba(4,6,11,.68) 68%,rgba(4,6,11,.82) 100%)" }} />
            <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: `${primary}c4`, boxShadow: `0 0 14px ${primary}88` }} />
            <div style={{ position: "relative", width: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,34%)", gap: 8, padding: 8, minHeight: 136, alignItems: "stretch" }}>
              <div style={{ minWidth: 0, display: "grid", alignContent: "center", justifyItems: "center", gap: 3, textAlign: "center", padding: "0 6px" }}>
                <strong style={{ color: activeTeam?.color || primary, fontSize: "clamp(14px,3vw,19px)", fontWeight: 1000, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "100%" }}>{playerName(activeProfile)}</strong>
                <div aria-label={`Score actuel : ${activeScore}`} style={{ color: state.eliminatedByPlayer[activePlayerId] ? C.red : C.gold, fontSize: "clamp(44px,10vw,62px)", lineHeight: .95, fontWeight: 1000, letterSpacing: -2.3, textShadow: `0 0 18px ${primary}30` }}>{activeScore}</div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 2 }}>
                  {[0,1,2].map((i) => {
                    const dart = throwDarts[i];
                    const color = !dart ? "rgba(185,196,214,.45)" : isValidDart(dart) ? C.green : C.red;
                    return <DartSvg key={i} color={color} size={22} rotate={-22 + (i * 14)} />;
                  })}
                </div>
              </div>
              <button type="button" onClick={() => setInspectedTarget(target)} aria-label={`Objectif ${targetLabel}, étape ${roundNumber} sur ${state.targets.length}. Afficher le détail de la cible.`} style={{ minWidth: 0, minHeight: 118, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4, textAlign: "center", cursor: "pointer", borderRadius: 15, border: `1px solid ${primary}72`, background: `radial-gradient(circle at 50% 46%,${primary}18,transparent 74%),linear-gradient(160deg,${primary}12,rgba(4,7,13,.94))`, color: "#fff", padding: "8px 6px" }}>
                <span style={{ fontSize: 11, color: primary, fontWeight: 1000, letterSpacing: .7 }}>OBJECTIF</span>
                <strong style={{ fontSize: target === 25 ? "clamp(28px,6vw,40px)" : "clamp(44px,10vw,62px)", fontWeight: 1000, color: primary, lineHeight: 1.02, textShadow: `0 0 17px ${primary}45` }}>{targetLabel}</strong>
                <span style={{ color: themeSoft, fontWeight: 900, fontSize: 11 }}>ÉTAPE {roundNumber}/{state.targets.length}</span>
              </button>
            </div>
          </section>

          <nav aria-label="Outils Bob’s 27" style={{ display: "grid", width: "100%", minWidth: 0, gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            {[
              { label: "JOUEURS", kind: "players", action: () => setShowPlayers(true) },
              { label: "CLASSEMENT", kind: "standings", action: () => setShowTable(true) },
              { label: "STATS", kind: "stats", action: () => setShowPerformance(true) },
              { label: "VOLÉES", kind: "visits", action: () => setShowVisits(true) },
            ].map((tool) => <button key={tool.label} type="button" onClick={tool.action} style={{ minWidth: 0, minHeight: 49, borderRadius: 12, border: `1px solid ${primary}55`, background: `linear-gradient(180deg,${primary}12,rgba(5,8,15,.96))`, display: "grid", placeItems: "center", alignContent: "center", gap: 2, color: primary, cursor: "pointer", padding: "4px 4px" }}><QuickIcon kind={tool.kind} color={primary} size={17} /><span style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: .18 }}>{tool.label}</span></button>)}
          </nav>

          <button type="button" onClick={() => setShowPerformance(true)} aria-label="Afficher le suivi de performance" style={{ ...compactPanel, width: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "auto repeat(3,minmax(0,1fr))", alignItems: "center", gap: 6, padding: "8px 10px", textAlign: "left", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><QuickIcon kind="stats" color={primary} size={16} /><span style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: .45 }}>STATS</span></div>
            <div style={{ textAlign: "center", minWidth: 0 }}><div style={{ color: C.gold, fontSize: 21, fontWeight: 1000, lineHeight: 1 }}>{activeStats.targetHits}/{activeStats.darts}</div><div style={{ color: themeSoft, fontSize: 8.5, fontWeight: 900 }}>DOUBLES</div></div>
            <div style={{ textAlign: "center", minWidth: 0 }}><div style={{ color: C.green, fontSize: 21, fontWeight: 1000, lineHeight: 1 }}>{pct(activeStats.targetHits,activeStats.darts)}%</div><div style={{ color: themeSoft, fontSize: 8.5, fontWeight: 900 }}>PRÉCISION</div></div>
            <div style={{ textAlign: "center", minWidth: 0 }}><div style={{ color: primary, fontSize: 21, fontWeight: 1000, lineHeight: 1 }}>{activeStats.visits}</div><div style={{ color: themeSoft, fontSize: 8.5, fontWeight: 900 }}>VOLÉES</div></div>
          </button>

          {/* Grille de match basée sur le tableau SHOVE A PENNY : lignes joueurs,
              colonnes cibles, en-tête et colonne des joueurs fixes. */}
          <section aria-label="Tableau des doubles et scores par joueur" style={{ ...compactPanel, width: "100%", minWidth: 0, overflow: "hidden", padding: "9px 7px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "0 3px 8px" }}>
              <strong style={{ fontSize: 11, letterSpacing: .5, color: primary }}>TABLEAU DE MATCH</strong>
              <span style={{ fontSize: 10, color: themeSoft, fontWeight: 900, whiteSpace: "nowrap" }}>DOUBLE {roundNumber}/{state.targets.length}</span>
            </div>
            <div className="bobs27-doubles-strip" ref={progressStripRef} role="region" aria-label="Grille des 21 doubles, défilement horizontal" tabIndex={0} style={{ overflowX: "auto", width: "100%", maxWidth: "100%", scrollbarWidth: "thin", overscrollBehaviorX: "contain", borderRadius: 10, border: `1px solid ${themeStroke}` }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 3, tableLayout: "fixed", width: "max-content", minWidth: "100%", fontSize: 10 }}>
                <thead><tr>
                  <th scope="col" style={{ position: "sticky", left: 0, zIndex: 4, width: 126, minWidth: 126, maxWidth: 126, textAlign: "left", background: "#101118", color: primary, padding: "7px 8px", borderRadius: 7 }}>JOUEUR / SCORE</th>
                  {progressTargets.map((n, idx) => {
                    const current = idx === state.roundIndex && !state.finished;
                    const past = idx < state.roundIndex;
                    return <th key={`${n}-${idx}`} scope="col" style={{ width: 50, minWidth: 50, padding: 0 }}>
                      <button type="button" aria-current={current ? "step" : undefined} onClick={() => setInspectedTarget(n)} title={`Détail ${bobs27TargetLabel(n)}`} style={{ width: "100%", minHeight: 31, padding: "4px 2px", borderRadius: 7, cursor: "pointer", fontWeight: 1000, fontSize: 11, border: `1px solid ${current ? primary : past ? C.green + "70" : themeStroke}`, background: current ? `${primary}2b` : past ? `${C.green}13` : "rgba(255,255,255,.04)", color: current ? primary : past ? C.green : themeSoft }}>{n === 25 ? "DB" : `D${n}`}</button>
                    </th>;
                  })}
                </tr></thead>
                <tbody>{state.players.map((player, index) => {
                  const profile = byId.get(String(player.id)) || player;
                  const eliminated = Boolean(state.eliminatedByPlayer[player.id]);
                  const score = Number(state.scoresByPlayer[player.id] ?? 0);
                  const currentPlayer = player.id === activePlayerId;
                  return <tr key={player.id}>
                    <th scope="row" style={{ position: "sticky", left: 0, zIndex: 3, width: 126, minWidth: 126, maxWidth: 126, background: currentPlayer ? "#282116" : "#101118", border: `1px solid ${currentPlayer ? primary + "80" : themeStroke}`, borderRadius: 7, padding: "4px 6px", textAlign: "left" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, fontWeight: 950, color: eliminated ? C.red : currentPlayer ? primary : themeText }} title={playerName(profile)}>{playerName(profile)}</span>
                        <b style={{ fontSize: 16, color: eliminated ? C.red : currentPlayer ? primary : C.gold }}>{score}</b>
                      </div>
                      {eliminated ? <span style={{ fontSize: 8, color: C.red }}>ÉLIMINÉ</span> : <span style={{ fontSize: 8, color: themeSoft }}>J{index + 1}{currentPlayer ? " · ACTIF" : ""}</span>}
                    </th>
                    {progressTargets.map((n, idx) => {
                      const entry = state.statsByPlayer[player.id]?.targets?.[String(n)];
                      const hits = Number(entry?.hits ?? 0);
                      const isCurrent = idx === state.roundIndex && !state.finished;
                      const completed = Boolean(entry);
                      const positive = completed && hits > 0;
                      return <td key={`${player.id}-${n}-${idx}`} style={{ textAlign: "center", padding: 0 }}>
                        <button type="button" onClick={() => setInspectedTarget(n)} aria-label={`${playerName(profile)}, ${bobs27TargetLabel(n)} : ${completed ? `${hits} sur 3` : "non joué"}`} style={{ width: "100%", minHeight: 37, borderRadius: 7, padding: "3px 2px", cursor: "pointer", background: positive ? `${C.green}17` : completed ? `${C.red}14` : isCurrent ? `${primary}0d` : "rgba(255,255,255,.025)", border: `1px solid ${positive ? C.green + "70" : completed ? C.red + "55" : isCurrent ? primary + "40" : "rgba(255,255,255,.05)"}`, color: positive ? C.green : completed ? C.red : themeSoft, fontWeight: 950, fontSize: 11 }}>
                          {completed ? `${hits}/3` : "—"}
                        </button>
                      </td>;
                    })}
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 3px 0", fontSize: 9, color: themeSoft }}>
              <span><b style={{ color: C.green }}>●</b> Double réussi &nbsp; <b style={{ color: C.red }}>●</b> Aucun double</span>
              <button type="button" onClick={() => setShowTable(true)} style={{ background: "none", border: 0, color: primary, fontSize: 10, fontWeight: 1000, cursor: "pointer" }}>CLASSEMENT ›</button>
            </div>
          </section>
        </div>

        {!state.finished ? <section aria-label="Saisie de la volée" style={{ ...compactPanel, padding: 8, minWidth: 0, maxWidth: "100%", width: "100%", overflowX: "clip" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "0 3px 8px" }}><strong style={{ fontSize: 11, letterSpacing: .5, color: primary }}>VOLÉE EN COURS</strong><span style={{ fontSize: 10, color: themeSoft, fontWeight: 900, whiteSpace: "nowrap" }}>{targetLabel} · {throwDarts.length}/3 FLÉCHETTES</span></div>
          <div data-bobs27-visit-row="1" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
            {[0,1,2].map((i) => {
              const dart = throwDarts[i];
              const valid = dart ? isValidDart(dart) : false;
              const tone = !dart ? "rgba(185,196,214,.55)" : valid ? C.green : C.red;
              return <button type="button" key={i} onClick={() => removeEnteredDart(i)} disabled={!dart || botThinking} aria-label={dart ? `Corriger flèche ${i + 1} : ${uiLabel(dart)}` : `Flèche ${i + 1} en attente`} style={{ minWidth: 0, height: 62, borderRadius: 12, border: `1px solid ${dart ? tone + "80" : themeStroke}`, background: dart ? `${tone}13` : "rgba(255,255,255,.025)", color: dart ? tone : themeSoft, padding: "5px 4px", cursor: dart ? "pointer" : "default", display: "grid", gridTemplateRows: "14px 1fr", alignItems: "center", justifyItems: "center", gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 1000, letterSpacing: .5, color: themeSoft }}>FLÈCHE {i + 1}</span>
                <strong style={{ fontSize: dart ? 22 : 18, lineHeight: 1.05, fontWeight: 1000, color: dart ? tone : "rgba(255,255,255,.45)" }}>{dart ? uiLabel(dart) : "—"}</strong>
              </button>;
            })}
          </div>
          <div role="status" aria-live="polite" style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center", padding: "8px 4px 8px", fontSize: 10, fontWeight: 900, borderRadius: 10, marginTop: 8, border: `1px solid ${themeStroke}`, background: "rgba(0,0,0,.22)" }}>
            <span style={{ color: currentHitCount ? C.green : atRisk ? C.red : themeSoft }}>{currentHitCount}/3 doubles · {throwDarts.length === 3 ? (projectedRawScore < 0 && state.rules.negativeRule === "eliminate" ? "ÉLIMINATION" : `Score ${projectedScore}`) : `Score possible ${possibleMin}–${possibleMax}`}</span>
            <span style={{ color: atRisk && !currentHitCount ? C.red : primary, flexShrink: 0 }}>{throwDarts.length === 3 ? `${currentDelta > 0 ? "+" : ""}${currentDelta} pts` : `${remainingDarts} restante${remainingDarts > 1 ? "s" : ""}`}</span>
          </div>
          {atRisk && !currentHitCount ? <div style={{ color: C.red, textAlign: "center", fontSize: 10, marginBottom: 5, fontWeight: 900 }}>Un double est indispensable pour éviter l’élimination.</div> : null}
          {notice ? <div style={{ color: primary, fontSize: 10, textAlign: "center", fontWeight: 900, marginBottom: 4 }}>{notice}</div> : null}
          {config.scoreInputMethod === "dartboard" ? <>
            <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginTop: 6 }}><button onClick={() => setMultiplier(1)} style={modeButton(multiplier === 1, C.green)}>SIMPLE</button><button onClick={() => setMultiplier(2)} style={modeButton(multiplier === 2, C.cyan)}>DOUBLE</button><button onClick={() => setMultiplier(3)} style={modeButton(multiplier === 3, C.pink)}>TRIPLE</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginTop: 6 }}><button onClick={cancelOrUndo} style={actionButton(C.gold)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateVisit} style={actionButton(C.green)}>VALIDER</button></div>
          </> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}><Keypad showMissOnZero currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={(bull) => addDart(25, bull === 50 ? 2 : 1)} onValidate={validateVisit} hidePreview hideTotal centerSlot={<div style={{ textAlign: "center", color: primary, fontWeight: 1000, fontSize: 11 }}>{targetLabel}<div style={{ fontSize: 8, color: themeSoft }}>{throwDarts.length}/3</div></div>} noticeSlot={null} validateAttention={throwDarts.length === 3} safeBottomPad /></div>}
        </section> : null}
      </div>
      {latestVisit ? <button type="button" onClick={() => setShowVisits(true)} aria-label="Consulter l’historique des volées" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: 7, padding: "6px 9px", borderRadius: 10, border: `1px solid ${themeStroke}`, background: "rgba(255,255,255,.03)", color: themeText, fontSize: 10, cursor: "pointer" }}><span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>DERNIÈRE VOLÉE · {latestVisit.targetLabel} · {latestVisit.labels.join(" · ")}</span><b style={{ flexShrink: 0, color: latestVisit.delta >= 0 ? C.green : C.red, marginLeft: 6 }}>{latestVisit.delta > 0 ? "+" : ""}{latestVisit.delta} ›</b></button> : null}
    </main>
    {restoreChoice ? <div role="dialog" aria-modal="true" aria-label="Reprendre Bob’s 27" style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,.86)", display: "grid", placeItems: "center", padding: 18 }}>
      <div style={{ ...panelStyle(), maxWidth: 420, width: "100%", textAlign: "center", borderColor: primary }}>
        <h2 style={{ color: primary, margin: "0 0 10px" }}>REPRENDRE BOB’S 27 ?</h2>
        <p style={{ color: themeSoft, fontSize: 13 }}>Une partie interrompue a été retrouvée ({restoreChoice.state.history.length} volées enregistrées, étape {restoreChoice.state.roundIndex + 1}/{restoreChoice.state.targets.length}).</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 18 }}>
          <button type="button" onClick={() => resolveRestoration(false)} style={actionButton(C.red)}>NOUVELLE PARTIE</button>
          <button type="button" onClick={() => resolveRestoration(true)} style={actionButton(C.green)}>REPRENDRE</button>
        </div>
      </div>
    </div> : null}
    {inspectedTarget !== null ? <TargetDetailModal target={inspectedTarget} state={state} profilesById={byId} primary={primary} config={config} onClose={() => setInspectedTarget(null)} /> : null}
    {showVisits ? <VisitsModal state={state} profilesById={byId} primary={primary} onClose={() => setShowVisits(false)} /> : null}
    {showPerformance ? <PerformanceModal state={state} profilesById={byId} primary={primary} onClose={() => setShowPerformance(false)} /> : null}
    {showPlayers ? <PlayersModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowPlayers(false)} /> : null}
    {showRulesInline ? <RulesModal config={config} primary={primary} onClose={() => setShowRulesInline(false)} /> : null}
    {showTable ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function FloatingPanel({ title, subtitle, primary, onClose, children, maxWidth = 680 }: any) {
  return <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.66)", backdropFilter: "blur(3px)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "max(76px,env(safe-area-inset-top)) 10px max(16px,env(safe-area-inset-bottom))" }}>
    <section onClick={(event) => event.stopPropagation()} style={{ ...panelStyle(), padding: 0, width: "100%", maxWidth, maxHeight: "calc(100dvh - 94px)", minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderColor: `${primary}70` }}>
      <div style={{ position: "relative", flexShrink: 0, minHeight: 62, display: "flex", justifyContent: "center", alignItems: "center", padding: "10px 48px", background: "linear-gradient(180deg,rgba(0,0,0,.24),rgba(0,0,0,.86)),url('" + tickerBobs27 + "') center/cover", borderBottom: `1px solid ${primary}55` }}>
        <div style={{ textAlign: "center", minWidth: 0 }}><div style={{ color: "#fff", fontSize: 14, fontWeight: 1000, letterSpacing: .6, textShadow: "0 2px 5px #000" }}>{title}</div>{subtitle ? <div style={{ fontSize: 10, color: primary, fontWeight: 900 }}>{subtitle}</div> : null}</div>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ position: "absolute", right: 9, top: 9, width: 35, height: 35, borderRadius: 12, border: `1px solid ${primary}88`, background: "rgba(0,0,0,.75)", color: primary, fontSize: 22, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ overflowY: "auto", overscrollBehavior: "contain", minHeight: 0, padding: 12 }}>{children}</div>
    </section>
  </div>;
}

function RulesModal({ config, primary, onClose }: any) {
  return <FloatingPanel title="RÈGLES DU BOB’S 27" subtitle="PRINCIPE · POINTS · ÉLIMINATION" primary={primary} onClose={onClose} maxWidth={520}>
    <RulesContent config={config} primary={primary} />
  </FloatingPanel>;
}

function PlayersModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  const activeId = getBobs27ActivePlayerId(state);
  const players = state.players || [];
  return <FloatingPanel title="JOUEURS" subtitle={`${players.length} PARTICIPANTS · BOB’S 27`} primary={primary} onClose={onClose} maxWidth={600}>
    <div style={{ display: "grid", gap: 8 }}>{players.map((player: any, index: number) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.statsByPlayer[player.id] || emptyBobs27Stats();
      const active = String(player.id) === String(activeId);
      const eliminated = Boolean(state.eliminatedByPlayer[player.id]);
      return <div key={player.id} style={{ display: "grid", gridTemplateColumns: "22px 40px minmax(0,1fr) auto", gap: 9, alignItems: "center", minWidth: 0, padding: 9, borderRadius: 13, border: `1px solid ${active ? primary + "88" : "rgba(255,255,255,.1)"}`, background: active ? `${primary}15` : "rgba(255,255,255,.04)" }}>
        <b style={{ fontSize: 11, color: primary }}>J{index + 1}</b>
        <ProfileAvatar profile={profile} size={38} />
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(profile)} {active ? <span style={{ color: primary, fontSize: 9 }}>• ACTIF</span> : null}</div><div style={{ fontSize: 10, color: eliminated ? C.red : C.soft }}>{eliminated ? "ÉLIMINÉ" : `${stats.targetHits} doubles · ${stats.darts} fléchettes · ${pct(stats.targetHits,stats.darts)}%`}</div></div>
        <strong style={{ fontSize: 22, color: eliminated ? C.red : primary, fontWeight: 1000 }}>{state.scoresByPlayer[player.id] ?? 0}</strong>
      </div>;
    })}</div>
  </FloatingPanel>;
}

function PerformanceModal({ state, profilesById, primary, onClose }: any) {
  const players = state.players || [];
  return <FloatingPanel title="SUIVI DE PERFORMANCE" subtitle="PRÉCISION · VOLÉES · POINTS · DOUBLES" primary={primary} onClose={onClose} maxWidth={680}>
    <div style={{ display: "grid", gap: 9 }}>{players.map((player: any) => {
      const stats: Bobs27PlayerStats = state.statsByPlayer[player.id] || emptyBobs27Stats();
      const profile = profilesById.get(String(player.id)) || player;
      const accuracy = pct(stats.targetHits, stats.darts);
      const success = pct(stats.successfulVisits, stats.visits);
      const net = Number(stats.netPoints || 0);
      return <section key={player.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <ProfileAvatar profile={profile} size={38} />
          <div style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(profile)}</strong><span style={{ fontSize: 10, color: C.soft }}>{state.eliminatedByPlayer[player.id] ? "ÉLIMINÉ" : `${stats.visits} volée${stats.visits > 1 ? "s" : ""} jouée${stats.visits > 1 ? "s" : ""}`}</span></div>
          <b style={{ color: primary, fontSize: 25 }}>{state.scoresByPlayer[player.id] ?? 0}</b>
        </div>
        <div style={{ height: 7, borderRadius: 9, background: "rgba(255,255,255,.09)", overflow: "hidden" }} aria-label={`Précision : ${accuracy}%`}><div style={{ height: "100%", width: `${Math.max(0, Math.min(100, accuracy))}%`, background: C.green, borderRadius: 9 }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, color: C.soft, marginTop: 4 }}><span>Précision des doubles : <b style={{ color: C.green }}>{accuracy}%</b></span><span>{stats.targetHits}/{stats.darts} touches</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
          {[["VOLÉES RÉUSSIES", `${stats.successfulVisits}/${stats.visits}`, C.green], ["RÉUSSITE VOLÉES", `${success}%`, primary], ["VOLÉES PARFAITES", stats.perfectVisits, C.gold], ["MEILLEURE SÉRIE", stats.bestSuccessStreak, C.gold], ["POINTS GAGNÉS", `+${stats.pointsWon}`, C.green], ["POINTS PERDUS", `−${stats.pointsLost}`, C.red], ["BILAN NET", `${net > 0 ? "+" : ""}${net}`, net >= 0 ? C.green : C.red], ["CIBLES VALIDÉES", stats.targetsCleared, primary], ["FLÉCHETTES HORS CIBLE", stats.wastedDarts, C.soft]].map(([label, value, color]: any) => <div key={label} style={{ borderRadius: 9, padding: "7px 4px", background: "rgba(0,0,0,.24)", minWidth: 0, textAlign: "center" }}><div style={{ color: C.soft, fontWeight: 900, fontSize: 8 }}>{label}</div><b style={{ color, fontSize: 15 }}>{value}</b></div>)}
        </div>
        <details style={{ marginTop: 9 }}><summary style={{ cursor: "pointer", color: primary, fontSize: 11, fontWeight: 900 }}>Voir le détail des doubles</summary><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(54px,1fr))", gap: 5, marginTop: 7 }}>{state.targets.map((target: number) => { const entry = stats.targets?.[String(target)]; return <div key={target} style={{ textAlign: "center", borderRadius: 7, background: "rgba(255,255,255,.04)", padding: 5 }}><div style={{ fontSize: 10 }}>{bobs27TargetLabel(target)}</div><strong style={{ color: !entry ? C.soft : entry.hits ? C.green : C.red }}>{entry ? `${entry.hits}/3` : "—"}</strong></div>; })}</div></details>
      </section>;
    })}</div>
  </FloatingPanel>;
}

function TargetDetailModal({ target, state, profilesById, primary, onClose, config }: any) {
  const label = bobs27TargetLabel(target);
  const value = bobs27TargetValue(target);
  const [tab, setTab] = React.useState<"objective" | "rules">("objective");
  return <FloatingPanel title={`${label} · OBJECTIF`} subtitle={`ÉTAPE ${Math.max(1,(state?.targets || []).findIndex((t: number) => t === target) + 1)}/${state?.targets?.length || 1}`} primary={primary} onClose={onClose} maxWidth={480}>
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <button type="button" onClick={() => setTab("objective")} style={{ minHeight: 38, borderRadius: 12, border: `1px solid ${tab === "objective" ? primary + "90" : "rgba(255,255,255,.10)"}`, background: tab === "objective" ? `${primary}18` : "rgba(255,255,255,.04)", color: tab === "objective" ? primary : "#fff", fontWeight: 1000, cursor: "pointer" }}>OBJECTIF</button>
        <button type="button" onClick={() => setTab("rules")} style={{ minHeight: 38, borderRadius: 12, border: `1px solid ${tab === "rules" ? primary + "90" : "rgba(255,255,255,.10)"}`, background: tab === "rules" ? `${primary}18` : "rgba(255,255,255,.04)", color: tab === "rules" ? primary : "#fff", fontWeight: 1000, cursor: "pointer" }}>RÈGLES</button>
      </div>
      {tab === "objective" ? <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {[ ["CIBLE", label, primary], ["PAR HIT", `+${value}`, C.green], ["ÉCHEC 0/3", `−${value}`, C.red] ].map(([k,v,c]: any) => <div key={k} style={{ padding: "10px 8px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}><div style={{ color: C.soft, fontSize: 9, fontWeight: 900 }}>{k}</div><div style={{ color: c, fontSize: 20, fontWeight: 1000, marginTop: 2 }}>{v}</div></div>)}
        </div>
        <div style={{ display: "grid", gap: 7 }}>{state.players.map((player: any, index: number) => {
          const entry = state.statsByPlayer[player.id]?.targets?.[String(target)];
          const hits = Number(entry?.hits || 0);
          const delta = entry ? hits ? hits * value : -value : null;
          return <div key={player.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 11, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)" }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 1000 }}><span style={{ color: primary, marginRight: 5 }}>J{index + 1}</span>{playerName(profilesById.get(String(player.id)) || player)}</div><div style={{ color: C.soft, fontSize: 10 }}>{entry ? `${hits}/3 doubles touchés` : "Étape non jouée"}</div></div><strong style={{ color: delta === null ? C.soft : delta > 0 ? C.green : C.red, fontSize: 19, whiteSpace: "nowrap" }}>{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}</strong></div>;
        })}</div>
      </> : <RulesContent config={config} primary={primary} />}
    </div>
  </FloatingPanel>;
}

function VisitsModal({ state, profilesById, primary, onClose }: any) {
  const visits = [...state.history].reverse();
  return <FloatingPanel title="HISTORIQUE DES VOLÉES" subtitle={`${visits.length} VOLÉE${visits.length > 1 ? "S" : ""} · PLUS RÉCENTES EN PREMIER`} primary={primary} onClose={onClose} maxWidth={720}>
    {visits.length === 0 ? <div style={{ textAlign: "center", padding: "24px 8px", color: C.soft, fontWeight: 800 }}>Aucune volée enregistrée pour le moment.</div> : <div style={{ display: "grid", gap: 7 }}>{visits.map((visit: any) => <div key={visit.id} style={{ padding: 10, border: "1px solid rgba(255,255,255,.10)", borderRadius: 13, background: "rgba(255,255,255,.035)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ minWidth: 0 }}><div style={{ color: primary, fontSize: 10, fontWeight: 900 }}>{visit.targetLabel} · TOUR {visit.round}</div><div style={{ fontWeight: 900 }}>{playerName(profilesById.get(String(visit.playerId)) || state.players.find((p: any) => String(p.id) === String(visit.playerId)))}</div></div><div style={{ color: visit.delta >= 0 ? C.green : C.red, fontWeight: 1000, fontSize: 20 }}>{visit.delta > 0 ? "+" : ""}{visit.delta}</div></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>{visit.labels.map((label: string, index: number) => <span key={index} style={{ fontSize: 11, fontWeight: 900, padding: "5px 9px", borderRadius: 9, background: "rgba(255,255,255,.07)" }}>{label}</span>)}<span style={{ color: C.soft, fontSize: 10, alignSelf: "center" }}>{visit.validHits}/3 · {visit.scoreBefore} → {visit.scoreAfter}{visit.eliminated ? " · ÉLIMINÉ" : ""}</span></div>
    </div>)}</div>}
  </FloatingPanel>;
}

function modeButton(active: boolean, color: string): React.CSSProperties { return { minHeight: 40, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, cursor: "pointer" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 36, borderRadius: 10, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  const standings = Array.isArray(state.standings) ? state.standings : [];
  return <FloatingPanel title="CLASSEMENT BOB’S 27" subtitle={`${standings.length} PARTICIPANT${standings.length > 1 ? "S" : ""} · CLASSEMENT EN DIRECT`} primary={primary} onClose={onClose} maxWidth={760}>
    <div style={{ display: "grid", gap: 8 }}>{standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "28px 38px minmax(0,1fr) auto", gap: 8, alignItems: "center", minWidth: 0, padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={36} /> : <ProfileAvatar profile={profilesById.get(String(standing.id))} size={36} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>Hits {standing.hits} · {standing.visits} volées{standing.eliminated ? " · éliminé" : ""}</div></div><div style={{ color: primary, fontSize: 24, fontWeight: 1100 }}>{standing.score}</div></div>)}</div>
  </FloatingPanel>;
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const isTeams = participantMode === "teams";
  const rankings = Array.isArray(state.standings) ? state.standings : [];
  const rows = state.players.map((player: any) => ({
    player,
    profile: profilesById.get(player.id) || player,
    stats: state.statsByPlayer[player.id] || emptyBobs27Stats(),
    score: Number(state.scoresByPlayer[player.id] ?? 0),
    eliminated: Boolean(state.eliminatedByPlayer[player.id]),
  })).sort((a: any, b: any) => b.score - a.score || b.stats.targetHits - a.stats.targetHits);
  const totalDarts = rows.reduce((sum: number, row: any) => sum + Number(row.stats.darts || 0), 0);
  const totalHits = rows.reduce((sum: number, row: any) => sum + Number(row.stats.targetHits || 0), 0);
  const totalPerfect = rows.reduce((sum: number, row: any) => sum + Number(row.stats.perfectVisits || 0), 0);
  const totalVisits = Array.isArray(state.history) ? state.history.length : 0;
  const overlayButton: React.CSSProperties = { minHeight: 43, minWidth: 0, borderRadius: 12, border: `1px solid ${primary}80`, background: `${primary}17`, color: primary, fontWeight: 1000, cursor: "pointer", padding: "8px 10px" };
  return <div role="dialog" aria-modal="true" aria-label="Résultats de BOB’S 27" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.84)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}>
    <div onClick={(event) => event.stopPropagation()} style={{ ...panelStyle(), position: "relative", boxSizing: "border-box", width: "min(760px,100%)", minWidth: 0, maxHeight: "min(94dvh,94vh)", overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", borderColor: `${primary}77`, padding: "10px 10px 14px" }}>
      <header style={{ position: "relative", minHeight: 93, borderRadius: 13, overflow: "hidden", background: `linear-gradient(180deg,rgba(0,0,0,.48),rgba(0,0,0,.82)),url(${tickerBobs27}) center / cover`, display: "grid", placeItems: "center", textAlign: "center", padding: "10px 42px" }}>
        <div><div style={{ color: primary, fontWeight: 1000, fontSize: 11, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontWeight: 1100, fontSize: 22, textShadow: "0 2px 6px #000" }}>BOB’S 27</div></div>
        <button type="button" onClick={onClose} aria-label="Fermer les résultats" style={{ position: "absolute", top: 7, right: 7, width: 34, height: 34, borderRadius: "50%", border: `1px solid ${primary}88`, background: "rgba(0,0,0,.7)", color: primary, fontSize: 21, cursor: "pointer" }}>×</button>
      </header>

      <section aria-label="Podium" style={{ marginTop: 10, borderRadius: 14, padding: 10, background: `linear-gradient(135deg,${primary}16,rgba(4,7,14,.75))`, border: `1px solid ${primary}44` }}>
        <div style={{ color: primary, fontSize: 11, fontWeight: 1000, textAlign: "center", marginBottom: 9 }}>{state.tied ? "ÉGALITÉ EN TÊTE" : "CLASSEMENT FINAL"}{isTeams ? " · ÉQUIPES" : ""}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(3, rankings.length))},minmax(0,1fr))`, alignItems: "end", gap: 7 }}>
          {rankings.slice(0,3).map((standing: any, index: number) => <div key={standing.id} style={{ minWidth: 0, padding: "10px 5px", borderRadius: 12, textAlign: "center", background: standing.rank === 1 ? `${C.gold}18` : "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? `${C.gold}7a` : "rgba(255,255,255,.10)"}` }}>
            <div style={{ fontSize: 18 }}>{standing.rank === 1 ? "🏆" : standing.rank === 2 ? "🥈" : "🥉"}</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>{isTeams ? <TeamLogo team={teamById.get(standing.id)} size={40} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={40} />}</div>
            <div style={{ fontWeight: 950, fontSize: 12, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={standing.name}>{standing.name}</div>
            <div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontSize: 27, lineHeight: 1.2, fontWeight: 1100 }}>{standing.score}</div>
            <div style={{ color: C.soft, fontSize: 10 }}>#{standing.rank}{standing.eliminated ? " · OUT" : ""}</div>
          </div>)}
        </div>
        {rankings.length > 3 ? <details style={{ marginTop: 8, fontSize: 12 }}><summary style={{ cursor: "pointer", color: primary, textAlign: "center", fontWeight: 900 }}>Voir les {rankings.length - 3} autres participants</summary>{rankings.slice(3).map((standing: any) => <div key={standing.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 4px", borderBottom: "1px solid rgba(255,255,255,.07)" }}><span>#{standing.rank} · {standing.name}{standing.eliminated ? " · OUT" : ""}</span><strong>{standing.score}</strong></div>)}</details> : null}
      </section>

      <section aria-label="Statistiques du match" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
        {[["DURÉE",fmtDuration((state.finishedAt || Date.now()) - state.startedAt)],["VOLÉES",totalVisits],["DOUBLES",`${totalHits}/${totalDarts}`],["VOLÉES PARFAITES",totalPerfect]].map(([label,value]: any) => <div key={label} style={{ minWidth: 0, padding: "9px 7px", borderRadius: 11, background: "rgba(255,255,255,.045)", textAlign: "center", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: C.soft, fontSize: 9, fontWeight: 900 }}>{label}</div><div style={{ color: primary, fontWeight: 1100, fontSize: 20 }}>{value}</div></div>)}
      </section>

      <section aria-label="Statistiques individuelles" style={{ marginTop: 11 }}>
        <div style={{ color: primary, fontSize: 12, fontWeight: 1000, marginBottom: 7 }}>SUIVI DE PERFORMANCE · JOUEURS</div>
        <div style={{ display: "grid", gap: 7 }}>
          {rows.map((row: any) => <details key={row.player.id} style={{ minWidth: 0, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", overflow: "hidden" }}>
            <summary style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", cursor: "pointer", listStyle: "none" }}>
              <ProfileAvatar profile={row.profile} size={38} />
              <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(row.profile)} {row.eliminated ? <span style={{ color: C.red }}>· OUT</span> : null}</div><div style={{ color: C.soft, fontSize: 10 }}>{row.stats.targetHits} doubles / {row.stats.darts} fléchettes · {pct(row.stats.targetHits,row.stats.darts)}%</div></div>
              <strong style={{ color: primary, fontSize: 22 }}>{row.score}</strong><span aria-hidden="true" style={{ color: primary }}>⌄</span>
            </summary>
            <div style={{ padding: "0 9px 10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
                {[["0/3",row.stats.failedVisits,C.red],["1/3",row.stats.oneHitVisits,C.soft],["2/3",row.stats.twoHitVisits,C.soft],["3/3",row.stats.threeHitVisits,C.green],["MEILLEURE VOLÉE",row.stats.bestVisit,C.gold],["MEILLEURE SÉRIE",row.stats.bestSuccessStreak,C.gold],["POINTS GAGNÉS",`+${row.stats.pointsWon}`,C.green],["POINTS PERDUS",`−${row.stats.pointsLost}`,C.red],["FLÉCHETTES",row.stats.darts,C.soft]].map(([label,value,color]: any) => <div key={label} style={{ textAlign: "center", minWidth: 0, padding: "7px 3px", borderRadius: 8, background: "rgba(0,0,0,.3)" }}><div style={{ color: C.soft, fontSize: 8, fontWeight: 900 }}>{label}</div><div style={{ color, fontSize: 15, fontWeight: 1000 }}>{value}</div></div>)}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: primary, fontWeight: 1000 }}>DÉTAIL DES DOUBLES</div>
              <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(58px,1fr))", gap: 5 }}>
                {state.targets.map((target: number) => { const entry = row.stats.targets?.[String(target)]; return <div key={target} style={{ padding: 5, borderRadius: 8, background: "rgba(0,0,0,.26)", textAlign: "center", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontSize: 9, color: C.soft }}>{bobs27TargetLabel(target)}</div><div style={{ color: entry ? entry.hits > 0 ? C.green : C.red : C.soft, fontSize: 12, fontWeight: 1000 }}>{entry ? `${entry.hits}/3` : "—"}</div><div style={{ fontSize: 9, color: entry?.pointsWon ? C.green : entry?.penaltyLost ? C.red : C.soft }}>{entry?.pointsWon ? `+${entry.pointsWon}` : entry?.penaltyLost ? `−${entry.penaltyLost}` : "·"}</div></div>; })}
              </div>
            </div>
          </details>)}
        </div>
      </section>

      <footer style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onReplay} style={overlayButton}>↻ REJOUER</button>
        <button type="button" onClick={onHistory} style={{ ...overlayButton, background: `linear-gradient(90deg,${primary},${C.gold})`, color: "#16120a" }}>HISTORIQUE & STATS</button>
      </footer>
    </div>
  </div>;
}

function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }
