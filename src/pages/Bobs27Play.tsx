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
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`bobs27-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);

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
    if (state.finished || botThinking || throwDarts.length >= 3) return;
    const mult = directMultiplier || multiplier;
    const dart: UiDart = value === 25 ? { v: 25, mult: mult === 2 ? 2 : 1 } : { v: Math.max(0, Math.min(20, Number(value) || 0)), mult };
    const next = [...throwDarts, dart]; setThrowDarts(next); if (mult > 1) setMultiplier(1);
    if (next.length === 3) setNotice("Volée complète — VALIDER");
  }
  function validateVisit() {
    if (state.finished || botThinking) return;
    if (throwDarts.length !== 3) { setNotice("Bob’s 27 se joue avec 3 fléchettes par cible."); return; }
    commitVisit(throwDarts);
  }
  function cancelOrUndo() {
    if (botThinking) return;
    if (throwDarts.length) { setThrowDarts((prev) => prev.slice(0, -1)); setMultiplier(1); setNotice(""); return; }
    if (undoStack.length) { const previous = undoStack[undoStack.length - 1]; setUndoStack((stack) => stack.slice(0, -1)); setState(cloneBobs27State(previous)); setShowEnd(false); setNotice("Tour précédent restauré."); }
  }

  React.useEffect(() => {
    if (!activeProfile || state.finished || !isBot(activeProfile, botIds)) { setBotThinking(false); return; }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => { const darts = randomBotVisit(target, String(level)); commitVisit(darts); setBotThinking(false); }, 700);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.roundIndex, state.activePlayerIndex, state.finished, activePlayerId, target]);

  function resetMatch() {
    const next = createBobs27State(profiles as any, rules, teamConfigs, config.selectedIds);
    setState(next); setUndoStack([]); setThrowDarts([]); setMultiplier(1); setShowEnd(false); setShowTable(false); setNotice("");
    matchIdRef.current = `bobs27-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; autoSavedRef.current = "";
  }
  function backToConfig() {
    const now = Date.now(); if (now - lastBackRef.current < 350) return; lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de Bob’s 27 en cours ?")) return;
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
      durationMs: Math.max(0, now - state.startedAt), totalDarts: playerRows.reduce((a, p) => a + p.darts, 0), totalHits: playerRows.reduce((a, p) => a + p.targetHits, 0),
      totalPointsWon: playerRows.reduce((a, p) => a + p.pointsWon, 0), totalPointsLost: playerRows.reduce((a, p) => a + p.pointsLost, 0), perfectVisits: playerRows.reduce((a, p) => a + p.perfectVisits, 0),
      doubleAccuracy: pct(playerRows.reduce((a, p) => a + p.targetHits, 0), playerRows.reduce((a, p) => a + p.darts, 0)), targets: state.targets.length,
    };
    const summary = {
      kind: "bobs_27", mode: "bobs_27", sport: "darts", finished: true, participantMode: config.participantMode,
      winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      startingScore: state.rules.startingScore, targetSequence: [...state.targets], targetsPlayed: Math.min(state.roundIndex + 1, state.targets.length),
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
    if (autoSavedRef.current === matchIdRef.current) return; autoSavedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord(), { navigate: false }); } catch {}
  }, [state.finished]);

  const currentHitCount = throwDarts.filter((d) => target === 25 ? d.v === 25 && d.mult === 2 : d.v === target && d.mult === 2).length;
  const currentDelta = currentHitCount ? currentHitCount * targetValue : throwDarts.length === 3 ? -targetValue : 0;
  const progressTargets = state.targets;

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerBobs27} tickerAlt="BOB'S 27" left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles de Bob's 27" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />
    <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <section style={{ ...panelStyle(), padding: 0, overflow: "hidden", borderColor: `${primary}88`, boxShadow: `0 0 24px ${primary}20`, marginBottom: 7 }}>
        <div style={{ position: "relative", minHeight: 132, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(150px,185px)", alignItems: "stretch", padding: "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,.08),rgba(0,0,0,.3))" }} />
          <div style={{ position: "absolute", left: -24, top: -4, bottom: -4, width: "32%", minWidth: 100, overflow: "hidden", opacity: .12 }}><div style={{ position: "absolute", left: -20, top: 16, transform: "scale(1.5)", transformOrigin: "left top" }}><ProfileAvatar profile={activeProfile as any} size={82} /></div></div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: 0, textAlign: "center" }}>
            {botThinking ? <div style={{ color: activeTeam?.color || primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1 }}>BOT EN RÉFLEXION</div> : null}
            <div style={{ color: activeTeam?.color || primary, fontSize: 14, fontWeight: 1000, letterSpacing: .8, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{playerName(activeProfile)}</div>
            <div style={{ marginTop: 5, fontSize: 64, lineHeight: 1, fontWeight: 1000, color: activeScore <= 0 && state.eliminatedByPlayer[activePlayerId] ? C.red : C.gold, textShadow: "0 4px 18px rgba(255,195,26,.25)" }}>{activeScore}</div>
            <div style={{ marginTop: 5, color: themeSoft, fontSize: 9.5, fontWeight: 900 }}>Hits {activeStats.targetHits}/{activeStats.darts} · {pct(activeStats.targetHits, activeStats.darts)}% · Série {activeStats.bestSuccessStreak}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", minWidth: 0 }}>
            <div style={{ position: "absolute", inset: "0 0 0 4px", borderRadius: 18, backgroundImage: `linear-gradient(180deg,rgba(4,8,16,.30),rgba(4,8,16,.65)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .72 }} />
            <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 8 }}>
              <div style={{ color: themeSoft, fontSize: 9.5, fontWeight: 950, letterSpacing: 1 }}>CIBLE</div>
              <div style={{ color: secondary, fontSize: target === 25 ? 30 : 48, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${secondary}88`, marginTop: 3 }}>{targetLabel}</div>
              <div style={{ color: themeSoft, fontSize: 9, fontWeight: 900, marginTop: 7 }}>+{targetValue}/hit · 0/3 = −{targetValue}</div>
              <div style={{ color: primary, fontSize: 9, fontWeight: 1000, marginTop: 4 }}>ÉTAPE {Math.min(state.roundIndex + 1, state.targets.length)}/{state.targets.length}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle(), padding: 8, marginBottom: 7 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          {progressTargets.map((n, idx) => { const done = idx < state.roundIndex; const active = idx === state.roundIndex && !state.finished; return <div key={n} title={bobs27TargetLabel(n)} style={{ minWidth: n === 25 ? 40 : 28, height: 26, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${active ? primary : done ? primary + "77" : themeStroke}`, background: active ? `${primary}22` : done ? `${primary}0d` : "rgba(255,255,255,.025)", color: active ? primary : done ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.42)", fontSize: 9.5, fontWeight: 1000 }}>{n === 25 ? "DB" : `D${n}`}</div>; })}
        </div>
      </section>

      <section style={{ ...panelStyle(), marginBottom: 7, padding: 8 }}>
        <button type="button" onClick={() => setShowTable(true)} style={{ width: "100%", border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, state.standings.length))},minmax(0,1fr))`, gap: 6 }}>
            {state.standings.slice(0, 4).map((standing) => {
              const team = config.participantMode === "teams" ? teamById.get(standing.id) : null; const profile = config.participantMode === "players" ? byId.get(standing.id) : null;
              return <div key={standing.id} style={{ minWidth: 0, padding: "7px 5px", borderRadius: 13, background: "rgba(255,255,255,.035)", border: `1px solid ${standing.rank === 1 ? primary + "66" : themeStroke}` }}><div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{team ? <TeamLogo team={team} size={30} /> : <ProfileAvatar profile={profile as any} size={30} />}</div><div style={{ fontSize: 8.5, fontWeight: 950, color: team?.color || themeSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{standing.name}</div><div style={{ color: primary, fontSize: 20, fontWeight: 1100, lineHeight: 1.1 }}>{standing.score}</div></div>;
            })}
          </div>
          <div style={{ marginTop: 6, color: themeSoft, fontSize: 9.5, fontWeight: 850 }}>Classement · toucher pour le détail</div>
        </button>
      </section>

      {!state.finished ? <section style={{ ...panelStyle(), padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 7 }}>
          {[0,1,2].map((i) => <div key={i} style={{ minHeight: 42, borderRadius: 13, border: `1px solid ${throwDarts[i] ? primary + "66" : themeStroke}`, background: throwDarts[i] ? `${primary}10` : "rgba(0,0,0,.18)", display: "grid", placeItems: "center", color: throwDarts[i] && (target === 25 ? throwDarts[i].v === 25 && throwDarts[i].mult === 2 : throwDarts[i].v === target && throwDarts[i].mult === 2) ? C.green : throwDarts[i] ? "#fff" : "rgba(255,255,255,.35)", fontWeight: 1000 }}>{throwDarts[i] ? uiLabel(throwDarts[i]) : `FLÈCHE ${i + 1}`}</div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 4px 7px", color: themeSoft, fontSize: 10.5, fontWeight: 850 }}><span>{currentHitCount}/3 touche{currentHitCount > 1 ? "s" : ""}</span><span style={{ color: currentDelta > 0 ? C.green : currentDelta < 0 ? C.red : themeSoft }}>{throwDarts.length === 3 ? `${currentDelta > 0 ? "+" : ""}${currentDelta} pts` : "3 fléchettes requises"}</span></div>
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT BOB’S 27</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>Hits {standing.hits} · {standing.visits} volées{standing.eliminated ? " · éliminé" : ""}</div></div><div style={{ color: primary, fontSize: 24, fontWeight: 1100 }}>{standing.score}</div></div>)}</div>
  </div></div>;
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const rows = state.players.map((player: any) => ({ player, profile: profilesById.get(player.id) || player, stats: state.statsByPlayer[player.id] || emptyBobs27Stats(), score: Number(state.scoresByPlayer[player.id] || 0), eliminated: Boolean(state.eliminatedByPlayer[player.id]) })).sort((a: any, b: any) => b.score - a.score || b.stats.targetHits - a.stats.targetHits);
  const best = rows[0];
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}><div style={{ ...panelStyle(), width: "min(900px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}77`, padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ width: 34 }} /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>BOB’S 27</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 11, padding: 12, borderRadius: 16, background: `${primary}10`, border: `1px solid ${primary}44`, textAlign: "center" }}><div style={{ color: C.gold, fontSize: 10, fontWeight: 1000 }}>VAINQUEUR</div><div style={{ marginTop: 4, fontSize: 22, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : state.standings[0]?.name || best?.profile?.name || "—"}</div><div style={{ color: primary, fontSize: 32, fontWeight: 1100 }}>{state.standings[0]?.score ?? best?.score ?? 0}</div></div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>{[
      ["Durée", fmtDuration((state.finishedAt || Date.now()) - state.startedAt)], ["Darts", rows.reduce((a: number, r: any) => a + r.stats.darts, 0)], ["Hits doubles", rows.reduce((a: number, r: any) => a + r.stats.targetHits, 0)], ["Parfaits 3/3", rows.reduce((a: number, r: any) => a + r.stats.perfectVisits, 0)]
    ].map(([label, value]: any) => <div key={label} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>{label}</div><div style={{ fontWeight: 1100, fontSize: 18, color: primary }}>{value}</div></div>)}</div>

    <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 790, fontSize: 10.5 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","Score","Hits","Préc.","0/3","1/3","2/3","3/3","Best","Série","+ Points","− Points","Darts"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.68)" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}{row.eliminated ? <span style={{ color: C.red }}> · OUT</span> : ""}</td><td style={td(primary)}>{row.score}</td><td style={td()}>{row.stats.targetHits}</td><td style={td()}>{pct(row.stats.targetHits,row.stats.darts)}%</td><td style={td(C.red)}>{row.stats.failedVisits}</td><td style={td()}>{row.stats.oneHitVisits}</td><td style={td()}>{row.stats.twoHitVisits}</td><td style={td(C.green)}>{row.stats.threeHitVisits}</td><td style={td()}>{row.stats.bestVisit}</td><td style={td()}>{row.stats.bestSuccessStreak}</td><td style={td(C.green)}>+{row.stats.pointsWon}</td><td style={td(C.red)}>−{row.stats.pointsLost}</td><td style={td()}>{row.stats.darts}</td></tr>)}</tbody></table></div>

    <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{rows.map((row: any) => <details key={row.player.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><summary style={{ cursor: "pointer", fontWeight: 1000, color: primary }}>{playerName(row.profile)} — détail par double</summary><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(78px,1fr))", gap: 6 }}>{state.targets.map((target: number) => { const s = row.stats.targets?.[String(target)]; return <div key={target} style={{ padding: 7, borderRadius: 11, background: "rgba(0,0,0,.23)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.58)", fontSize: 9 }}>{bobs27TargetLabel(target)}</div><div style={{ color: s?.hits ? C.green : C.red, fontWeight: 1100 }}>{s?.hits || 0}/3</div><div style={{ fontSize: 8.5, opacity: .65 }}>{s?.pointsWon ? `+${s.pointsWon}` : s?.penaltyLost ? `−${s.penaltyLost}` : "—"}</div></div>; })}</div></details>)}</div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }
