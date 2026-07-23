// @ts-nocheck
// =============================================================
// PRISONER — Play complet / moteur / bots / undo / stats / history
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import {
  clonePrisonerState,
  createPrisonerState,
  emptyPrisonerStats,
  getPrisonerActivePlayerId,
  getPrisonerAvailableDarts,
  getPrisonersOwnedCount,
  getPrisonerTarget,
  playPrisonerVisit,
  prisonerDartLabel,
  type PrisonerConfigPayload,
  type PrisonerDart,
  type PrisonerPlayerStats,
  type PrisonerState,
  type PrisonerTeamConfig,
} from "../lib/gameEngines/prisonerEngine";
import tickerPrisoner from "../assets/tickers/ticker_prisoner.png";
import targetBg from "../assets/target_bg.png";

type UiDart = { v: number; mult: 1 | 2 | 3; singleRing?: "inner" | "outer" };
const C = { gold: "#ffd76a", cyan: "#42d6ff", green: "#65efb4", red: "#ff667e", pink: "#ff63b8", text: "#f8fafc", soft: "rgba(226,232,240,.72)" };

function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const total = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }
function progressPct(value: number, total = 20) { return total > 0 ? Math.round((Math.max(0, value) / total) * 1000) / 10 : 0; }

function normalizeConfig(props: any): PrisonerConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  return {
    mode: "prisoner",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(2, Number(raw?.players || raw?.selectedIds?.length || 2)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    startingDarts: Math.max(1, Math.min(9, Number(raw?.startingDarts || 3))),
    sequenceMode: raw?.sequenceMode === "numeric" ? "numeric" : "clockwise",
    bullCaptureRule: "bull",
    missPenaltyEnabled: raw?.missPenaltyEnabled !== false,
    eliminationEnabled: raw?.eliminationEnabled !== false,
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function toPrisonerDart(dart: UiDart): PrisonerDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  if (dart.mult === 3) return { bed: "T", number: dart.v };
  if (dart.mult === 2) return { bed: "D", number: dart.v };
  return { bed: "S", number: dart.v, singleRing: dart.singleRing === "inner" ? "inner" : "outer" };
}
function uiLabel(dart: UiDart) {
  if (!dart || dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  if (dart.mult === 3) return `T${dart.v}`;
  if (dart.mult === 2) return `D${dart.v}`;
  return `${dart.singleRing === "inner" ? "SI" : "SE"}${dart.v}`;
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || null;
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${team?.color || C.gold}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${team?.color || C.gold}18`, boxShadow: `0 0 15px ${team?.color || C.gold}44`, flex: "0 0 auto" }}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: team?.color || C.gold, fontWeight: 1000, fontSize: size * .34 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}</div>;
}

function RulesContent({ config, primary }: { config: PrisonerConfigPayload; primary: string }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: primary }}>PARCOURS</strong><br />{config.sequenceMode === "clockwise" ? "1 → 18 → 4 → 13 → … → 5 → 20 (ordre physique du cadran)." : "1 → 2 → 3 → … → 20."}</div>
    <div><strong style={{ color: C.green }}>VALIDER UNE CIBLE</strong><br />Simple extérieur, triple ou double du numéro demandé. Plusieurs cibles peuvent être validées dans la même volée.</div>
    <div><strong style={{ color: C.pink }}>PRISONNIER</strong><br />Simple intérieur ou Bull/DBull : ta fléchette reste prisonnière et devient indisponible.</div>
    <div><strong style={{ color: C.cyan }}>CAPTURE</strong><br />Toucher la zone extérieure du numéro où se trouve un prisonnier libère une fléchette. Une fléchette adverse capturée devient la tienne.</div>
    <div><strong style={{ color: C.red }}>MISS</strong><br />{config.missPenaltyEnabled ? "Une fléchette hors dartboard est indisponible pendant ton prochain tour." : "Aucune pénalité temporaire n’est appliquée aux MISS."}</div>
    <div><strong style={{ color: C.gold }}>VICTOIRE</strong><br />Finir le parcours ou être le dernier joueur / la dernière équipe avec des fléchettes jouables.</div>
    <div><strong style={{ color: primary }}>KEYPAD</strong><br />SE = simple extérieur, SI = simple intérieur. Le simple intérieur crée un prisonnier ; le simple extérieur peut progresser ou capturer.</div>
  </div>;
}

function botChance(level: string) { const v = String(level || "").toLowerCase(); if (v.includes("hard") || v.includes("pro") || v.includes("diffic")) return .62; if (v.includes("easy") || v.includes("facile")) return .30; return .45; }
function randomBotVisit(state: PrisonerState, playerId: string, level: string): PrisonerDart[] {
  const budget = getPrisonerAvailableDarts(state, playerId);
  const hitChance = botChance(level);
  const out: PrisonerDart[] = [];
  const captureTargets = state.prisoners.map((p) => p.location);
  let predictedProgress = Number(state.progressIndexByPlayer[playerId] || 0);

  const push = (dart: PrisonerDart) => {
    out.push(dart);
    const target = state.sequence[predictedProgress] ?? null;
    const playable = dart.bed === "D" || dart.bed === "T" || (dart.bed === "S" && dart.singleRing !== "inner");
    if (target !== null && playable && Number(dart.number) === target) predictedProgress = Math.min(state.sequence.length, predictedProgress + 1);
  };

  for (let i = 0; i < budget; i += 1) {
    const target = state.sequence[predictedProgress] ?? 20;
    const roll = Math.random();

    // Un bot sait reconnaître une opportunité de capture, y compris au Bull.
    if (captureTargets.length && roll < .12) {
      const location = captureTargets[Math.floor(Math.random() * captureTargets.length)];
      if (location === "BULL") push(Math.random() < .25 ? { bed: "IB" } : { bed: "OB" });
      else push({ bed: Math.random() < .2 ? "D" : Math.random() < .35 ? "T" : "S", number: location, singleRing: "outer" });
      continue;
    }
    if (roll < hitChance) {
      const r = Math.random();
      push({ bed: r < .18 ? "D" : r < .34 ? "T" : "S", number: target, singleRing: "outer" });
      continue;
    }
    if (roll < hitChance + .14) { push({ bed: "S", number: target, singleRing: "inner" }); continue; }
    if (roll < hitChance + .20) { push(Math.random() < .25 ? { bed: "IB" } : { bed: "OB" }); continue; }
    if (roll < hitChance + .30) { push({ bed: "MISS" }); continue; }
    let n = Math.max(1, Math.min(20, target + (Math.random() < .5 ? -1 : 1)));
    if (n === target) n = target === 20 ? 19 : target + 1;
    push({ bed: "S", number: n, singleRing: "outer" });
  }
  return out;
}


export default function PrisonerPlay(props: any) {
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
  const teamConfigs = React.useMemo<PrisonerTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({ id: String(team?.id || `team-${index + 1}`), name: String(team?.name || `Équipe ${index + 1}`), color: team?.color || [C.gold, C.pink, C.cyan, C.green][index % 4], logoDataUrl: team?.logoDataUrl || team?.logoUrl || null, playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [], isBotTeam: Boolean(team?.isBotTeam) })), [config.teamConfigs]);
  const rules = React.useMemo(() => ({ participantMode: config.participantMode, startingDarts: config.startingDarts, sequenceMode: config.sequenceMode, bullCaptureRule: config.bullCaptureRule, missPenaltyEnabled: config.missPenaltyEnabled, eliminationEnabled: config.eliminationEnabled }), [config]);
  const initialState = React.useMemo(() => createPrisonerState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<PrisonerState>(initialState);
  const [undoStack, setUndoStack] = React.useState<PrisonerState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [singleRing, setSingleRing] = React.useState<"inner" | "outer">("outer");
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showPrisoners, setShowPrisoners] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`prisoner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activePlayerId = getPrisonerActivePlayerId(state);
  const activeProfile = byId.get(activePlayerId) || state.players.find((p) => p.id === activePlayerId) || { id: activePlayerId, name: "Joueur" };
  const activeTeam = config.participantMode === "teams" ? teamById.get(state.teamByPlayer[activePlayerId]) : null;
  const activeStats = state.statsByPlayer[activePlayerId] || emptyPrisonerStats(config.startingDarts);
  const target = getPrisonerTarget(state, activePlayerId);
  const dartsBudget = getPrisonerAvailableDarts(state, activePlayerId);
  const prisonersOwned = getPrisonersOwnedCount(state, activePlayerId);
  const owned = Number(state.dartsOwnedByPlayer[activePlayerId] || 0);
  const missPenalty = Number(state.missPenaltyByPlayer[activePlayerId] || 0);
  const activeIsBot = isBot(activeProfile, botIds);

  function commitVisit(darts: UiDart[] | PrisonerDart[]) {
    if (state.finished) return;
    const converted = darts.map((d: any) => d?.bed ? d : toPrisonerDart(d));
    setUndoStack((prev) => [...prev.slice(-39), clonePrisonerState(state)]);
    const next = playPrisonerVisit(state, converted as PrisonerDart[]);
    setState(next); setThrowDarts([]); setMultiplier(1); setSingleRing("outer");
    const last = next.history[next.history.length - 1];
    if (last?.skipped) setNotice("Tour passé : tes fléchettes hors cible reviennent maintenant.");
    else if (last?.captures) setNotice(`${last.captures} capture${last.captures > 1 ? "s" : ""} !`);
    else if (last?.prisonersCreated) setNotice(`${last.prisonersCreated} fléchette${last.prisonersCreated > 1 ? "s" : ""} prisonnière${last.prisonersCreated > 1 ? "s" : ""}.`);
    else if (last?.progressHits) setNotice(`+${last.progressHits} cible${last.progressHits > 1 ? "s" : ""} validée${last.progressHits > 1 ? "s" : ""}.`);
    else setNotice("");
  }

  function validateVisit() { if (state.finished || activeIsBot) return; if (dartsBudget <= 0) return commitVisit([]); if (!throwDarts.length) { setNotice("Entre au moins une fléchette ou utilise ANNULER pour revenir au tour précédent."); return; } commitVisit(throwDarts); }
  function cancelOrUndo() { if (throwDarts.length) { setThrowDarts((prev) => prev.slice(0, -1)); return; } setUndoStack((prev) => { const last = prev[prev.length - 1]; if (!last) return prev; setState(clonePrisonerState(last)); setNotice("Tour précédent restauré."); return prev.slice(0, -1); }); }
  function addDart(v: number, forcedMult?: 1 | 2 | 3, ring?: "inner" | "outer") {
    if (state.finished || activeIsBot || throwDarts.length >= dartsBudget) return;
    const mult = v === 25 ? (forcedMult === 2 ? 2 : 1) : (forcedMult || multiplier);
    const dart: UiDart = { v, mult, singleRing: mult === 1 && v >= 1 && v <= 20 ? (ring || singleRing) : undefined };
    setThrowDarts((prev) => [...prev, dart]); setMultiplier(1);
  }
  function onDetailedBoardHit(hit: any) {
    if (throwDarts.length >= dartsBudget) return;
    if (!hit || hit.ring === "miss" || hit.segment === 0) return addDart(0, 1);
    if (hit.segment === 25) return addDart(25, hit.mult === 2 ? 2 : 1);
    if (hit.ring === "inner_single") return addDart(hit.segment, 1, "inner");
    if (hit.ring === "outer_single") return addDart(hit.segment, 1, "outer");
    return addDart(hit.segment, hit.mult);
  }

  React.useEffect(() => {
    if (state.finished || !activeIsBot || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => { const darts = randomBotVisit(state, activePlayerId, String(activeProfile?.botLevel || config.botLevel)); commitVisit(darts); setBotThinking(false); }, 650);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.activePlayerIndex, state.finished, activePlayerId, activeIsBot]);

  function backToConfig() {
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de PRISONER en cours ?")) return;
    if (typeof go === "function") go("prisoner_config", config);
  }
  function resetMatch() { const next = createPrisonerState(profiles as any, rules, teamConfigs, config.selectedIds); setState(next); setUndoStack([]); setThrowDarts([]); setShowEnd(false); setNotice(""); matchIdRef.current = `prisoner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; autoSavedRef.current = ""; }

  function buildHistoryRecord() {
    const now = state.finishedAt || Date.now();
    const individualOrder = state.players.map((player: any) => {
      const st = state.statsByPlayer[player.id] || emptyPrisonerStats(config.startingDarts);
      return { id: player.id, completed: Boolean(state.completedByPlayer[player.id]), progress: Number(state.progressIndexByPlayer[player.id] || 0), dartsOwned: Number(state.dartsOwnedByPlayer[player.id] || 0), captures: st.captures };
    }).sort((a, b) => Number(b.completed) - Number(a.completed) || b.progress - a.progress || b.dartsOwned - a.dartsOwned || b.captures - a.captures);
    const rankById = new Map(individualOrder.map((r, i) => [String(r.id), i + 1]));
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats: PrisonerPlayerStats = state.statsByPlayer[player.id] || emptyPrisonerStats(config.startingDarts);
      const teamId = state.teamByPlayer[player.id] || null;
      const winner = config.participantMode === "teams" ? Boolean(teamId && state.winnerIds.includes(teamId)) : state.winnerIds.includes(player.id);
      const progress = Number(state.progressIndexByPlayer[player.id] || 0);
      const dartsOwned = Number(state.dartsOwnedByPlayer[player.id] || 0);
      return {
        id: String(player.id), playerId: String(player.id), name: playerName(profile), avatar: profile?.avatarDataUrl || profile?.avatarUrl || profile?.avatar || null,
        teamId, rank: rankById.get(String(player.id)) || 99, win: winner, winner, completed: Boolean(state.completedByPlayer[player.id]), eliminated: Boolean(state.eliminatedByPlayer[player.id]),
        progress, targetsCompleted: progress, progressPct: progressPct(progress, state.sequence.length), currentTarget: getPrisonerTarget(state, player.id), dartsOwned, availableDarts: getPrisonerAvailableDarts(state, player.id), prisonersRemaining: getPrisonersOwnedCount(state, player.id),
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, turnsSkipped: stats.turnsSkipped, progressHits: stats.progressHits, bestProgressVisit: stats.bestProgressVisit, bestProgressStreak: stats.bestProgressStreak,
        captures: stats.captures, opponentCaptures: stats.opponentCaptures, ownRescues: stats.ownRescues, captureLosses: stats.captureLosses, prisonersCreated: stats.prisonersCreated,
        innerSinglePrisoners: stats.innerSinglePrisoners, bullPrisoners: stats.bullPrisoners, offboardMisses: stats.offboardMisses, temporaryLostDarts: stats.temporaryLostDarts,
        validOuterHits: stats.validOuterHits, outerSingles: stats.outerSingles, innerSingles: stats.innerSingles, doubles: stats.doubles, triples: stats.triples, bulls: stats.bulls, dbulls: stats.dbulls, misses: stats.misses,
        maxDartsOwned: stats.maxDartsOwned, minDartsOwned: stats.minDartsOwned, finalDartsOwned: dartsOwned, completedAtVisit: stats.completedAtVisit, eliminatedAtVisit: stats.eliminatedAtVisit,
        progressAccuracy: pct(stats.progressHits, stats.darts), captureRate: pct(stats.captures, Math.max(1, stats.validOuterHits)), targetStats: stats.targets, rawStats: stats,
      };
    });
    const teams = teamConfigs.map((team: any) => { const standing = state.standings.find((s) => s.id === team.id); return { ...team, ...(standing || {}), winner: state.winnerIds.includes(team.id), win: state.winnerIds.includes(team.id) }; });
    const winnerStanding = state.standings.find((s) => state.winnerIds.includes(s.id)) || state.standings[0] || null;
    const winnerId = state.tied ? null : state.winnerIds[0] || null;
    const totalDarts = playerRows.reduce((a, p) => a + p.darts, 0);
    const totalCaptures = playerRows.reduce((a, p) => a + p.captures, 0);
    const totalPrisonersCreated = playerRows.reduce((a, p) => a + p.prisonersCreated, 0);
    const totalProgress = playerRows.reduce((a, p) => a + p.progressHits, 0);
    const matchStats = {
      durationMs: Math.max(0, now - state.startedAt), totalDarts, totalVisits: playerRows.reduce((a, p) => a + p.visits, 0), totalProgress,
      totalCaptures, totalPrisonersCreated, prisonersRemaining: state.prisoners.length, totalMisses: playerRows.reduce((a, p) => a + p.offboardMisses, 0),
      totalDartsOwnedFinal: playerRows.reduce((a, p) => a + p.finalDartsOwned, 0), progressAccuracy: pct(totalProgress, totalDarts), courseLength: state.sequence.length,
    };
    const summary = {
      kind: "prisoner", mode: "prisoner", sport: "darts", finished: true, participantMode: config.participantMode,
      winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      finishReason: state.finishReason, duration: matchStats.durationMs, durationMs: matchStats.durationMs, sequence: state.sequence, sequenceMode: config.sequenceMode, startingDarts: config.startingDarts,
      standings: state.standings, rankings: state.standings, players: playerRows, perPlayer: playerRows, teams, matchStats,
      scoreLine: state.standings.map((row) => `${row.name} ${row.progress}/${state.sequence.length} · ${row.dartsOwned}🎯`).join(" • "), game: { mode: "prisoner", teams },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "prisoner", mode: "prisoner", sport: "darts", status: "finished", createdAt: state.startedAt, updatedAt: now,
      winnerId, winnerIds: state.winnerIds, players: playerRows, teams, game: { mode: "prisoner", teams }, summary,
      payload: {
        kind: "prisoner", mode: "prisoner", sport: "darts", winnerId, winnerIds: state.winnerIds, tied: state.tied, config, rules: state.rules, players: playerRows, teams, summary,
        visits: state.history, visitHistory: state.history, prisoners: state.prisoners,
        state: { visitNo: state.visitNo, sequence: state.sequence, progressIndexByPlayer: state.progressIndexByPlayer, dartsOwnedByPlayer: state.dartsOwnedByPlayer, missPenaltyByPlayer: state.missPenaltyByPlayer, eliminatedByPlayer: state.eliminatedByPlayer, completedByPlayer: state.completedByPlayer, standings: state.standings, finishReason: state.finishReason },
        stats: { sport: "darts", mode: "prisoner", players: playerRows, teams, match: matchStats, global: matchStats },
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

  const nextTargets = state.sequence.slice(Number(state.progressIndexByPlayer[activePlayerId] || 0), Number(state.progressIndexByPlayer[activePlayerId] || 0) + 5);
  const activeProgress = Number(state.progressIndexByPlayer[activePlayerId] || 0);

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerPrisoner} tickerAlt="PRISONER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles de PRISONER" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />
    <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <section style={{ ...panelStyle(), padding: 0, overflow: "hidden", borderColor: `${primary}88`, boxShadow: `0 0 24px ${primary}20`, marginBottom: 7 }}>
        <div style={{ position: "relative", minHeight: 140, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(145px,185px)", alignItems: "stretch", padding: "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.38),rgba(0,0,0,.08),rgba(0,0,0,.35))" }} />
          <div style={{ position: "absolute", left: -24, top: -4, bottom: -4, width: "32%", minWidth: 100, overflow: "hidden", opacity: .12 }}><div style={{ position: "absolute", left: -20, top: 20, transform: "scale(1.55)", transformOrigin: "left top" }}><ProfileAvatar profile={activeProfile as any} size={82} /></div></div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: 0, textAlign: "center" }}>
            {botThinking ? <div style={{ color: activeTeam?.color || primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1 }}>BOT EN RÉFLEXION</div> : null}
            <div style={{ color: activeTeam?.color || primary, fontSize: 14, fontWeight: 1000, letterSpacing: .8, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{playerName(activeProfile)}</div>
            <div style={{ marginTop: 5, display: "flex", alignItems: "baseline", gap: 5 }}><span style={{ fontSize: 58, lineHeight: 1, fontWeight: 1100, color: C.gold, textShadow: "0 4px 18px rgba(255,195,26,.25)" }}>{activeProgress}</span><span style={{ color: themeSoft, fontWeight: 1000 }}>/20</span></div>
            <div style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}><Badge label={`${owned} possédée${owned > 1 ? "s" : ""}`} color={primary} /><Badge label={`${dartsBudget} jouable${dartsBudget > 1 ? "s" : ""}`} color={C.green} /><Badge label={`${prisonersOwned} prison.`} color={C.pink} />{missPenalty ? <Badge label={`−${missPenalty} MISS`} color={C.red} /> : null}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", minWidth: 0 }}>
            <div style={{ position: "absolute", inset: "0 0 0 4px", borderRadius: 18, backgroundImage: `linear-gradient(180deg,rgba(4,8,16,.30),rgba(4,8,16,.68)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .74 }} />
            <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 8 }}>
              <div style={{ color: themeSoft, fontSize: 9.5, fontWeight: 950, letterSpacing: 1 }}>CIBLE</div>
              <div style={{ color: secondary, fontSize: 54, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${secondary}88`, marginTop: 3 }}>{target ?? "✓"}</div>
              <div style={{ color: themeSoft, fontSize: 8.8, fontWeight: 900, marginTop: 5, textAlign: "center" }}>SE / T / D pour avancer</div>
              <div style={{ color: C.pink, fontSize: 8.5, fontWeight: 900, marginTop: 2, textAlign: "center" }}>SI / Bull = prisonnier</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle(), padding: 8, marginBottom: 7 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ color: primary, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>PROCHAINES CIBLES</div><div style={{ color: themeSoft, fontSize: 9 }}>{config.sequenceMode === "clockwise" ? "ORDRE CADRAN" : "1 → 20"}</div></div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5 }}>{nextTargets.length ? nextTargets.map((n, idx) => <div key={`${n}-${idx}`} style={{ height: 31, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${idx === 0 ? primary : themeStroke}`, background: idx === 0 ? `${primary}1d` : "rgba(255,255,255,.025)", color: idx === 0 ? primary : "rgba(255,255,255,.58)", fontSize: idx === 0 ? 14 : 10, fontWeight: 1000 }}>{n}</div>) : <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.green, fontWeight: 1000 }}>PARCOURS TERMINÉ</div>}</div>
      </section>

      <section style={{ ...panelStyle(), marginBottom: 7, padding: 8 }}>
        <button type="button" onClick={() => setShowTable(true)} style={{ width: "100%", border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, state.standings.length))},minmax(0,1fr))`, gap: 6 }}>
            {state.standings.slice(0, 4).map((standing) => { const team = config.participantMode === "teams" ? teamById.get(standing.id) : null; const profile = config.participantMode === "players" ? byId.get(standing.id) : null; return <div key={standing.id} style={{ minWidth: 0, padding: "7px 5px", borderRadius: 13, background: "rgba(255,255,255,.035)", border: `1px solid ${standing.rank === 1 ? primary + "66" : themeStroke}`, opacity: standing.eliminated ? .52 : 1 }}><div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{team ? <TeamLogo team={team} size={30} /> : <ProfileAvatar profile={profile as any} size={30} />}</div><div style={{ fontSize: 8.5, fontWeight: 950, color: team?.color || themeSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{standing.name}</div><div style={{ color: primary, fontSize: 19, fontWeight: 1100, lineHeight: 1.1 }}>{standing.progress}/20</div><div style={{ color: standing.eliminated ? C.red : C.green, fontSize: 8.2, fontWeight: 900 }}>{standing.eliminated ? "OUT" : `${standing.dartsOwned} 🎯 · ${standing.captures} cap.`}</div></div>; })}
          </div>
          <div style={{ marginTop: 6, color: themeSoft, fontSize: 9.5, fontWeight: 850 }}>Classement · toucher pour le détail</div>
        </button>
      </section>

      <section style={{ ...panelStyle(), marginBottom: 7, padding: 8 }}>
        <button type="button" onClick={() => setShowPrisoners(true)} style={{ width: "100%", border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div style={{ color: C.pink, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>PRISONNIERS SUR LA CIBLE</div><div style={{ color: C.pink, fontSize: 18, fontWeight: 1100 }}>{state.prisoners.length}</div></div>
          <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>{state.prisoners.slice(0, 10).map((p) => <span key={p.id} style={{ borderRadius: 999, padding: "4px 7px", background: `${C.pink}12`, border: `1px solid ${C.pink}35`, color: "#ffd5e8", fontSize: 9, fontWeight: 900 }}>{p.location === "BULL" ? "BULL" : p.location} · {playerName(byId.get(p.ownerId))}</span>)}{!state.prisoners.length ? <span style={{ color: themeSoft, fontSize: 9.5 }}>Aucune fléchette emprisonnée.</span> : null}</div>
        </button>
      </section>

      {!state.finished ? <section style={{ ...panelStyle(), padding: 8 }}>
        {notice ? <div style={{ marginBottom: 7, padding: "7px 9px", borderRadius: 11, background: `${primary}0d`, border: `1px solid ${primary}22`, color: primary, fontSize: 9.5, fontWeight: 900, textAlign: "center" }}>{notice}</div> : null}
        {dartsBudget <= 0 && !activeIsBot ? <button onClick={validateVisit} style={{ width: "100%", minHeight: 50, borderRadius: 999, border: `1px solid ${C.red}88`, background: `${C.red}14`, color: C.red, fontWeight: 1100 }}>PASSER LE TOUR · FLÉCHETTES TEMPORAIREMENT INDISPONIBLES</button> : null}
        {dartsBudget > 0 && !activeIsBot ? <>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7, justifyContent: "center" }}>{Array.from({ length: dartsBudget }, (_, i) => <div key={i} style={{ minWidth: 48, height: 27, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${throwDarts[i] ? primary : themeStroke}`, background: throwDarts[i] ? `${primary}16` : "rgba(255,255,255,.025)", color: throwDarts[i] ? primary : themeSoft, fontSize: 9.5, fontWeight: 1000 }}>{throwDarts[i] ? uiLabel(throwDarts[i]) : `🎯 ${i + 1}`}</div>)}</div>
          {config.scoreInputMethod === "dartboard" ? <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}><DartboardClickable onHit={() => {}} onDetailedHit={onDetailedBoardHit} multiplier={multiplier} size={305} disabled={throwDarts.length >= dartsBudget} /><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={cancelOrUndo} style={actionButton(primary)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateVisit} style={actionButton(C.green)}>VALIDER</button></div></div> : <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginBottom: 6 }}><button onClick={() => setSingleRing("outer")} style={modeButton(singleRing === "outer", C.green)}>SE · SIMPLE EXTÉRIEUR</button><button onClick={() => setSingleRing("inner")} style={modeButton(singleRing === "inner", C.pink)}>SI · SIMPLE INTÉRIEUR</button></div>
            <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={validateVisit} hidePreview hideTotal centerSlot={<div style={{ textAlign: "center", color: primary, fontWeight: 1000, fontSize: 10 }}>{target ? `CIBLE ${target}` : "FIN"}<div style={{ fontSize: 8, color: themeSoft }}>{throwDarts.length}/{dartsBudget}</div></div>} noticeSlot={singleRing === "inner" && multiplier === 1 ? <span style={{ color: C.pink }}>SI actif</span> : null} validateAttention={throwDarts.length >= Math.min(3, dartsBudget)} safeBottomPad />
          </div>}
        </> : null}
        {activeIsBot ? <div style={{ minHeight: 82, display: "grid", placeItems: "center", color: primary, fontWeight: 1000, letterSpacing: 1 }}>{botThinking ? "BOT EN RÉFLEXION…" : "TOUR DU BOT"}</div> : null}
      </section> : null}
    </div>

    {showTable ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
    {showPrisoners ? <PrisonersModal state={state} profilesById={byId} primary={primary} onClose={() => setShowPrisoners(false)} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function Badge({ label, color }: any) { return <span style={{ borderRadius: 999, padding: "4px 7px", border: `1px solid ${color}55`, background: `${color}10`, color, fontSize: 8.8, fontWeight: 950 }}>{label}</span>; }
function modeButton(active: boolean, color: string): React.CSSProperties { return { minHeight: 38, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, fontSize: 9.5, cursor: "pointer" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(780px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT PRISONER</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}`, opacity: standing.eliminated ? .55 : 1 }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>{standing.progress}/20 · {standing.captures} captures · {standing.prisoners} prisonniers{standing.eliminated ? " · ÉLIMINÉ" : ""}</div></div><div style={{ color: primary, fontSize: 20, fontWeight: 1100 }}>{standing.dartsOwned} 🎯</div></div>)}</div>
  </div></div>;
}

function PrisonersModal({ state, profilesById, primary, onClose }: any) {
  const grouped = state.prisoners.reduce((acc: any, p: any) => { const key = String(p.location); (acc[key] ||= []).push(p); return acc; }, {});
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(720px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ color: C.pink, fontWeight: 1000, letterSpacing: 1 }}>PRISONNIERS SUR LE DARTBOARD</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff" }}>×</button></div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>{Object.entries(grouped).map(([loc, arr]: any) => <div key={loc} style={{ padding: 10, borderRadius: 14, background: `${C.pink}0c`, border: `1px solid ${C.pink}28` }}><div style={{ color: C.pink, fontSize: 19, fontWeight: 1100 }}>{loc}</div><div style={{ marginTop: 5, display: "grid", gap: 3 }}>{arr.map((p: any) => <div key={p.id} style={{ fontSize: 10, color: "rgba(255,255,255,.78)" }}>🎯 {playerName(profilesById.get(p.ownerId))}</div>)}</div></div>)}{!state.prisoners.length ? <div style={{ gridColumn: "1/-1", color: "rgba(255,255,255,.55)", textAlign: "center", padding: 18 }}>Aucun prisonnier.</div> : null}</div><div style={{ marginTop: 10, color: "rgba(255,255,255,.56)", fontSize: 10.5, lineHeight: 1.4 }}>Libération d’un numéro : SE / T / D sur ce numéro. Au Bull : toucher Bull ou DBull.</div></div></div>;
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const rows = state.players.map((player: any) => ({ player, profile: profilesById.get(player.id) || player, stats: state.statsByPlayer[player.id] || emptyPrisonerStats(state.rules.startingDarts), progress: Number(state.progressIndexByPlayer[player.id] || 0), dartsOwned: Number(state.dartsOwnedByPlayer[player.id] || 0), prisoners: getPrisonersOwnedCount(state, player.id), completed: Boolean(state.completedByPlayer[player.id]), eliminated: Boolean(state.eliminatedByPlayer[player.id]), teamId: state.teamByPlayer[player.id] || null })).sort((a: any, b: any) => Number(b.completed) - Number(a.completed) || b.progress - a.progress || b.dartsOwned - a.dartsOwned || b.stats.captures - a.stats.captures);
  const winner = state.standings.find((s: any) => state.winnerIds.includes(s.id)) || state.standings[0];
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.80)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}><div style={{ ...panelStyle(), width: "min(940px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}77`, padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ width: 34 }} /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>PRISONER</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 11, padding: 12, borderRadius: 16, background: `${primary}10`, border: `1px solid ${primary}44`, textAlign: "center" }}><div style={{ color: C.gold, fontSize: 10, fontWeight: 1000 }}>VAINQUEUR</div><div style={{ marginTop: 4, fontSize: 22, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : winner?.name || "—"}</div><div style={{ color: primary, fontSize: 12, fontWeight: 900, marginTop: 4 }}>{state.finishReason === "course_completed" ? "Parcours terminé" : state.finishReason === "last_team" ? "Dernière équipe encore en jeu" : "Dernier joueur encore en jeu"}</div></div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>{[["Durée", fmtDuration((state.finishedAt || Date.now()) - state.startedAt)], ["Flèches", rows.reduce((a: number, r: any) => a + r.stats.darts, 0)], ["Captures", rows.reduce((a: number, r: any) => a + r.stats.captures, 0)], ["Prisonniers", rows.reduce((a: number, r: any) => a + r.stats.prisonersCreated, 0)]].map(([label, value]: any) => <div key={label} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>{label}</div><div style={{ fontWeight: 1100, fontSize: 18, color: primary }}>{value}</div></div>)}</div>
    <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980, fontSize: 10.5 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","Prog.","🎯 fin","Capt.","Perdues","Prison.","Rescues","MISS","SE","SI","D","T","Bull","Darts","Best +"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.68)" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}{row.completed ? <span style={{ color: C.green }}> · FINI</span> : row.eliminated ? <span style={{ color: C.red }}> · OUT</span> : ""}</td><td style={td(primary)}>{row.progress}/20</td><td style={td(C.gold)}>{row.dartsOwned}</td><td style={td(C.green)}>{row.stats.captures}</td><td style={td(C.red)}>{row.stats.captureLosses}</td><td style={td(C.pink)}>{row.stats.prisonersCreated}</td><td style={td(C.cyan)}>{row.stats.ownRescues}</td><td style={td(C.red)}>{row.stats.offboardMisses}</td><td style={td()}>{row.stats.outerSingles}</td><td style={td(C.pink)}>{row.stats.innerSingles}</td><td style={td()}>{row.stats.doubles}</td><td style={td()}>{row.stats.triples}</td><td style={td()}>{row.stats.bulls + row.stats.dbulls}</td><td style={td()}>{row.stats.darts}</td><td style={td(C.green)}>{row.stats.bestProgressVisit}</td></tr>)}</tbody></table></div>
    <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{rows.map((row: any) => <details key={row.player.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><summary style={{ cursor: "pointer", fontWeight: 1000, color: primary }}>{playerName(row.profile)} — stats complètes</summary><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 6 }}>{[["Progression", `${row.progress}/20 (${progressPct(row.progress)}%)`], ["Captures adverses", row.stats.opponentCaptures], ["Sauvetages propres", row.stats.ownRescues], ["Flèches perdues", row.stats.captureLosses], ["Prisonniers créés", row.stats.prisonersCreated], ["Prisonniers restants", row.prisoners], ["Max flèches possédées", row.stats.maxDartsOwned], ["Min flèches possédées", row.stats.minDartsOwned], ["Tours passés", row.stats.turnsSkipped], ["MISS hors cible", row.stats.offboardMisses], ["Précision progression", `${pct(row.stats.progressHits,row.stats.darts)}%`], ["Série progression", row.stats.bestProgressStreak]].map(([k,v]: any) => <div key={k} style={{ padding: 8, borderRadius: 11, background: "rgba(0,0,0,.23)" }}><div style={{ color: "rgba(255,255,255,.52)", fontSize: 8.8 }}>{k}</div><div style={{ color: primary, fontWeight: 1100, marginTop: 2 }}>{v}</div></div>)}</div></details>)}</div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}
