// @ts-nocheck
// =============================================================
// BASEBALL DARTS — match complet, tableau, bots, undo, stats/history
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import { useTheme } from "../contexts/ThemeContext";
import { useBaseballEngine } from "../hooks/useBaseballEngine";
import type {
  BaseballConfigPayload,
  BaseballPlayerStats,
  BaseballStanding,
  BaseballTeamConfig,
} from "../lib/gameEngines/baseballEngine";
import tickerBaseball from "../assets/tickers/ticker_baseball.png";

type UiDart = { v: number; mult: 1 | 2 | 3 };
const T = {
  bg: "#040710",
  panel: "var(--dc-card,#101827)",
  stroke: "var(--stroke,rgba(255,255,255,.105))",
  text: "var(--dc-text,#f8fafc)",
  soft: "var(--muted,rgba(226,232,240,.72))",
  cyan: "#42d6ff",
  gold: "#ffd76a",
  green: "#65efb4",
  red: "#ff667e",
  pink: "#ff63b8",
};

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}

function isBot(profile: any, botIds: Set<string>) {
  return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot");
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function emptyStats(): BaseballPlayerStats {
  return {
    darts: 0, visits: 0, hits: 0, targetHits: 0, misses: 0, wastedDarts: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0,
    runs: 0, rawRuns: 0, penalties: 0, penaltyRunsLost: 0,
    scorelessInnings: 0, bestInning: 0, bestDart: 0,
    attackVisits: 0, defenseVisits: 0, attackPower: 0, defensePower: 0,
    duelPoints: 0, runsPrevented: 0, bullAttackBonus: 0, bullDefenseDamage: 0,
    dbullAttackDoubles: 0, dbullDefenseHalves: 0, turnsLostOnMiss: 0,
  };
}

function dartLabel(dart: UiDart) {
  if (!dart || dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function visitRuns(darts: UiDart[], target: number, bullMode: string = "off") {
  return (darts || []).reduce((total, dart) => {
    if (target === 25 && bullMode === "random" && dart.v === 25) return total + (dart.mult === 2 ? 5 : 3);
    if (target < 1 || target > 20 || dart.v !== target) return total;
    return total + (dart.mult === 3 ? 3 : dart.mult === 2 ? 2 : 1);
  }, 0);
}

function botAccuracy(level: string) {
  const normalized = String(level || "").toLowerCase();
  const numeric = Number.parseFloat(normalized.replace(",", "."));
  if (normalized.includes("hard") || normalized.includes("diffic") || normalized.includes("pro") || numeric >= 4) return .72;
  if (normalized.includes("easy") || normalized.includes("facile") || normalized.includes("debut") || normalized.includes("début") || (numeric > 0 && numeric <= 2)) return .36;
  return .54;
}

function truncateAtMiss(darts: UiDart[], missEndsTurn: boolean) {
  if (!missEndsTurn) return darts;
  const index = darts.findIndex((dart) => !dart || dart.v === 0);
  return index >= 0 ? darts.slice(0, index + 1) : darts;
}

function randomBotVisit(target: number, level: string, variant: string, bullMode: string, role: string, missEndsTurn: boolean): UiDart[] {
  const accuracy = botAccuracy(level);
  const darts = Array.from({ length: 3 }, () => {
    const missChance = variant === "attack_defense" ? .08 + (1 - accuracy) * .12 : .07 + (1 - accuracy) * .15;
    if (Math.random() < missChance) return { v: 0, mult: 1 as const };

    const specialBullAllowed = bullMode === "attack" ? role !== "defense" : bullMode === "defense" ? role === "defense" : false;
    if (specialBullAllowed && Math.random() < .12 + accuracy * .12) {
      return { v: 25, mult: Math.random() < .22 + accuracy * .24 ? 2 as const : 1 as const };
    }

    if (Math.random() > accuracy) {
      let value = 1 + Math.floor(Math.random() * 20);
      if (value === target) value = value === 20 ? 19 : value + 1;
      return { v: value, mult: 1 as const };
    }
    if (target === 25) return { v: 25, mult: Math.random() < accuracy * .35 ? 2 as const : 1 as const };
    const roll = Math.random();
    const mult: 1 | 2 | 3 = roll < accuracy * .2 ? 3 : roll < accuracy * .45 ? 2 : 1;
    return { v: target, mult };
  });
  return truncateAtMiss(darts, missEndsTurn);
}

function RulesContent({ config, primary = T.cyan, secondary = T.gold }: { config: BaseballConfigPayload; primary?: string; secondary?: string }) {
  const bullText = config.bullTargetMode === "defense"
    ? `Défense : BULL retire ${config.bullBonusPoints || 4} point(s) à l’adversaire ; DBULL divise son score par 2 avec arrondi supérieur.`
    : config.bullTargetMode === "attack"
      ? `Attaque : BULL ajoute ${config.bullBonusPoints || 4} point(s) à son score ; DBULL double son score courant.`
      : config.bullTargetMode === "random"
        ? "Tirage : le BULL peut devenir la cible d’une manche ; BULL = 3 runs et DBULL = 5 runs."
        : "Jamais : le BULL n’a pas d’effet spécial et n’entre pas dans le tirage.";
  return (
    <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.45 }}>
      {config.gameVariant === "attack_defense" ? (
        <>
          <div><strong style={{ color: primary }}>ATTAQUE / DÉFENSE</strong><br />Chaque manche possède une cible aléatoire. Le premier joueur attaque cette cible, le second la défend, puis les rôles s’inversent sur exactement la même cible avant de passer à la manche suivante.</div>
          <div><strong style={{ color: secondary }}>CALCUL SUR LA CIBLE</strong><br />Seules les touches sur la cible comptent : S=1, D=2, T=3. Toute autre valeur vaut 0. Exemple cible 20 : T20 + S1 + D5 = 3 en attaque ; D20 + MISS = 2 en défense ; l’attaquant marque 3 − 2 = 1 point. Si l’option BULL dans le tirage est active et que BULL sort : BULL=3 et DBULL=5.</div>
        </>
      ) : (
        <>
          <div><strong style={{ color: primary }}>CIBLES</strong><br />Chaque manche tire une cible aléatoire parmi 1 à 20, sans répétition tant que possible. Le BULL ne rejoint la rotation que si cette option est choisie explicitement.</div>
          <div><strong style={{ color: secondary }}>RUNS</strong><br />Sur une cible numérique : Simple = 1, Double = 2, Triple = 3.</div>
        </>
      )}
      <div><strong style={{ color: T.green }}>FORMAT</strong><br />{config.innings} manches{config.extraInnings ? `, puis jusqu’à ${config.maxExtraInnings} manche${config.maxExtraInnings > 1 ? "s" : ""} supplémentaire${config.maxExtraInnings > 1 ? "s" : ""} si nécessaire` : " sans manche supplémentaire"}.</div>
      <div><strong style={{ color: primary }}>BULL / DBULL</strong><br />{bullText}</div>
      <div><strong style={{ color: T.pink }}>MISS</strong><br />{config.missEndsTurn !== false ? "Un MISS met immédiatement fin à la volée et passe au tour/rôle suivant." : "Un MISS vaut 0, mais la volée continue jusqu’à validation."}</div>
      {config.seventhInningRule === "halve_on_zero" ? <div><strong style={{ color: T.pink }}>7e MANCHE</strong><br />0 point pendant la 7e manche divise le score par deux.</div> : null}
      <div><strong style={{ color: primary }}>ANNULER</strong><br />Avec une volée vide, ANNULER restaure le passage précédent. Avec une volée en cours, il retire la dernière fléchette.</div>
    </div>
  );
}

function normalizeConfig(props: any): BaseballConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  return {
    mode: "baseball",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 2)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    innings: Math.max(1, Math.min(20, Number(raw?.innings || raw?.rounds || 9))),
    extraInnings: raw?.extraInnings !== false,
    maxExtraInnings: Math.max(1, Number(raw?.maxExtraInnings || 3)),
    seventhInningRule: raw?.seventhInningRule === "halve_on_zero" ? "halve_on_zero" : "none",
    gameVariant: raw?.gameVariant === "attack_defense" ? "attack_defense" : "target",
    bullTargetMode: ["defense", "attack", "random"].includes(raw?.bullTargetMode) ? raw.bullTargetMode : "off",
    bullBonusPoints: Math.min(20, Math.max(1, Number(raw?.bullBonusPoints || 4) || 4)),
    missEndsTurn: raw?.missEndsTurn !== false,
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

export default function BaseballPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;

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
    if (ordered.length) return ordered;
    return Array.from({ length: config.players }, (_, index) => ({ id: `p${index + 1}`, name: `Joueur ${index + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);

  const teamConfigs = React.useMemo<BaseballTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({
    id: String(team?.id || `team-${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color || [T.pink, T.gold, T.cyan, T.green][index % 4],
    logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
    playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [],
    isBotTeam: Boolean(team?.isBotTeam),
  })), [config.teamConfigs]);

  const rules = React.useMemo(() => ({
    mode: "baseball" as const,
    innings: config.innings,
    extraInnings: config.extraInnings,
    maxExtraInnings: config.maxExtraInnings,
    seventhInningRule: config.seventhInningRule,
    gameVariant: config.gameVariant,
    bullTargetMode: config.bullTargetMode,
    bullBonusPoints: config.bullBonusPoints,
    missEndsTurn: config.missEndsTurn,
    participantMode: config.participantMode,
  }), [config.innings, config.extraInnings, config.maxExtraInnings, config.seventhInningRule, config.gameVariant, config.bullTargetMode, config.bullBonusPoints, config.missEndsTurn, config.participantMode]);
  const { state, play, undo, reset, canUndo, isFinished } = useBaseballEngine(profiles as any, rules, teamConfigs);

  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [showEnd, setShowEnd] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(`baseball-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const savedRef = React.useRef(new Set<string>());
  const lastBackRef = React.useRef(0);

  React.useEffect(() => { if (isFinished) setShowEnd(true); }, [isFinished]);

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [team.id, team])), [teamConfigs]);
  const activePlayerId = state?.turnOrder?.[state.activePlayerIndex] || state?.players?.[state.activePlayerIndex]?.id;
  const activePlayer = state?.players?.find((player: any) => player.id === activePlayerId) || state?.players?.[0];
  const activeProfile = byId.get(String(activePlayer?.id || "")) || activePlayer;
  const activeStats = state?.statsByPlayer?.[String(activePlayer?.id || "")] || emptyStats();
  const activeTeamId = state?.teamByPlayer?.[String(activePlayer?.id || "")] || null;
  const activeTeam = activeTeamId ? teamById.get(activeTeamId) : null;
  const primary = theme?.primary || T.cyan;
  const secondary = theme?.accent1 || primary;
  const themeText = theme?.text || T.text;
  const themeSoft = theme?.textSoft || T.soft;
  const themeStroke = theme?.borderSoft || T.stroke;
  const accent = activeTeam?.color || primary;
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  React.useEffect(() => {
    if (!activeProfile || state.finished || !isBot(activeProfile, botIds)) {
      setBotThinking(false);
      return;
    }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => {
      play(randomBotVisit(state.target, String(level), state.rules.gameVariant, state.rules.bullTargetMode, state.duelPhase || "classic", state.rules.missEndsTurn));
      setThrowDarts([]);
      setMultiplier(1);
      setBotThinking(false);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.inning, state.duelPhase, state.duelPairIndex, state.finished, activePlayer?.id, botIds, config.botLevel]);

  function addDart(value: number, directMultiplier?: 1 | 2 | 3) {
    if (state.finished || botThinking || throwDarts.length >= 3) return;
    const mult = directMultiplier || multiplier;
    const normalized: UiDart = value === 25
      ? { v: 25, mult: mult === 2 ? 2 : 1 }
      : { v: Math.max(0, Math.min(20, Number(value) || 0)), mult };
    if (normalized.v === 0 && state.rules.missEndsTurn) {
      play([...throwDarts, normalized]);
      setThrowDarts([]);
      setMultiplier(1);
      return;
    }
    setThrowDarts((previous) => [...previous, normalized]);
    if (mult >= 2) setMultiplier(1);
  }

  function validateVisit() {
    if (!throwDarts.length || state.finished || botThinking) return;
    play(throwDarts);
    setThrowDarts([]);
    setMultiplier(1);
  }

  function cancelOrUndo() {
    if (botThinking) return;
    if (throwDarts.length) {
      setThrowDarts((previous) => previous.slice(0, -1));
      setMultiplier(1);
      return;
    }
    if (canUndo) {
      undo();
      setShowEnd(false);
      setMultiplier(1);
    }
  }

  function backToConfig() {
    const now = Date.now();
    if (now - lastBackRef.current < 350) return;
    lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de Baseball Darts en cours ?")) return;
    if (typeof go === "function") go("baseball_config", config);
  }

  function entityInningScore(standing: BaseballStanding, inning: number) {
    const base = standing.playerIds.reduce((total, id) => total + Number(state.inningScoresByPlayer[id]?.[inning] || 0), 0);
    return base + Number(state.inningAdjustmentsByEntity?.[standing.id]?.[inning] || 0);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityIds = new Set(state.winnerIds || []);
    const teams = (state.teams || []).map((team) => {
      const standing = state.standings.find((row) => row.id === team.id);
      return {
        ...team,
        players: team.playerIds,
        score: standing?.total || 0,
        runs: standing?.total || 0,
        winner: winnerEntityIds.has(team.id),
      };
    });
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats = state.statsByPlayer[player.id] || emptyStats();
      const teamId = state.teamByPlayer[player.id] || null;
      const entityId = config.participantMode === "teams" ? teamId : player.id;
      const standing = state.standings.find((row) => row.id === entityId);
      const win = Boolean(entityId && winnerEntityIds.has(entityId));
      return {
        id: player.id,
        playerId: player.id,
        profileId: player.id,
        name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        teamId,
        team: teamId,
        teamName: teamId ? teamById.get(teamId)?.name : null,
        win,
        winner: win,
        rank: standing?.rank || 1,
        score: config.participantMode === "players" ? (standing?.total || 0) : (state.totalsByPlayer[player.id] || 0),
        points: config.participantMode === "players" ? (standing?.total || 0) : (state.totalsByPlayer[player.id] || 0),
        runs: config.participantMode === "players" ? (standing?.total || 0) : (state.totalsByPlayer[player.id] || 0),
        rawRuns: stats.rawRuns,
        innings: { ...state.inningScoresByPlayer[player.id] },
        inningsPlayed: stats.visits,
        darts: stats.darts,
        dartsThrown: stats.darts,
        visits: stats.visits,
        hits: stats.hits,
        targetHits: stats.targetHits,
        validHits: stats.targetHits,
        misses: stats.misses,
        wastedDarts: stats.wastedDarts,
        singles: stats.singles,
        doubles: stats.doubles,
        triples: stats.triples,
        bulls: stats.bulls,
        dbulls: stats.dbulls,
        penalties: stats.penalties,
        penaltyRunsLost: stats.penaltyRunsLost,
        scorelessInnings: stats.scorelessInnings,
        bestInning: stats.bestInning,
        bestVisit: stats.bestInning,
        bestDart: stats.bestDart,
        attackVisits: stats.attackVisits,
        defenseVisits: stats.defenseVisits,
        attackPower: stats.attackPower,
        defensePower: stats.defensePower,
        duelPoints: stats.duelPoints,
        runsPrevented: stats.runsPrevented,
        bullAttackBonus: stats.bullAttackBonus,
        bullDefenseDamage: stats.bullDefenseDamage,
        dbullAttackDoubles: stats.dbullAttackDoubles,
        dbullDefenseHalves: stats.dbullDefenseHalves,
        turnsLostOnMiss: stats.turnsLostOnMiss,
        targetAccuracy: percent(stats.targetHits, stats.darts),
        rawStats: stats,
      };
    });
    const winnerStanding = state.standings[0] || null;
    const winnerId = state.tied ? null : winnerStanding?.id || null;
    const summary = {
      kind: "baseball",
      mode: "baseball",
      sport: "darts",
      finished: true,
      participantMode: config.participantMode,
      gameVariant: state.rules.gameVariant,
      bullTargetMode: state.rules.bullTargetMode,
      winnerId,
      winnerIds: state.winnerIds,
      winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—",
      tied: state.tied,
      innings: state.inning,
      regularInnings: state.rules.innings,
      extraInningsPlayed: Math.max(0, state.inning - state.rules.innings),
      targetSequence: [...state.targetSequence],
      duration: Math.max(0, now - state.startedAt),
      standings: state.standings,
      rankings: state.standings,
      players: playerRows,
      perPlayer: playerRows,
      teams,
      scoreLine: state.standings.map((standing) => `${standing.name} ${standing.total}`).join(" • "),
      game: { mode: "baseball", teams },
    };
    return {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "baseball",
      mode: "baseball",
      sport: "darts",
      status: "finished",
      createdAt: state.startedAt,
      updatedAt: now,
      winnerId,
      winnerIds: state.winnerIds,
      players: playerRows,
      teams,
      game: { mode: "baseball", teams },
      summary,
      payload: {
        kind: "baseball",
        mode: "baseball",
        sport: "darts",
        winnerId,
        winnerIds: state.winnerIds,
        tied: state.tied,
        config,
        rules: state.rules,
        players: playerRows,
        teams,
        summary,
        visits: state.history,
        visitHistory: state.history,
        state: {
          inning: state.inning,
          target: state.target,
          targetSequence: [...state.targetSequence],
          totalsByPlayer: state.totalsByPlayer,
          inningScoresByPlayer: state.inningScoresByPlayer,
          scoreAdjustmentsByEntity: state.scoreAdjustmentsByEntity,
          inningAdjustmentsByEntity: state.inningAdjustmentsByEntity,
          duelPhase: state.duelPhase,
          duelPairIndex: state.duelPairIndex,
          standings: state.standings,
          finishReason: state.finishReason,
        },
        stats: {
          sport: "darts",
          mode: "baseball",
          players: playerRows,
          teams,
          global: {
            duration: Math.max(0, now - state.startedAt),
            innings: state.inning,
            darts: playerRows.reduce((total, player) => total + player.dartsThrown, 0),
            runs: playerRows.reduce((total, player) => total + player.runs, 0),
            visits: state.history.length,
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

  function saveAndQuit() { persistFinished(true); }
  function saveAndReplay() {
    persistFinished(false);
    reset();
    matchIdRef.current = `baseball-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setThrowDarts([]);
    setMultiplier(1);
    setShowEnd(false);
  }

  const previewRuns = visitRuns(throwDarts, state.target, state.rules.bullTargetMode);
  const previewPower = visitRuns(throwDarts, state.target, state.rules.bullTargetMode);
  const shownInnings = Array.from({ length: Math.max(state.rules.innings, state.inning) }, (_, index) => index + 1);
  const duelOpponentId = state.rules.gameVariant === "attack_defense"
    ? (state.duelPhase === "defense" ? state.turnOrder[state.duelPairIndex] : state.turnOrder[(state.duelPairIndex + 1) % state.turnOrder.length])
    : null;
  const duelOpponent = duelOpponentId ? (byId.get(String(duelOpponentId)) || state.players.find((player: any) => player.id === duelOpponentId)) : null;
  const activeEntityIdForScore = config.participantMode === "teams" ? activeTeamId : activePlayer?.id;
  const activeStanding = state.standings.find((standing) => standing.id === activeEntityIdForScore);
  const activeScore = activeStanding?.total || 0;
  const specialBullInThrow = throwDarts.some((dart) => dart.v === 25) && (state.rules.bullTargetMode === "attack" || state.rules.bullTargetMode === "defense");

  return (
    <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 34, overflowX: "hidden" }}>
      <PageHeader tickerSrc={tickerBaseball} tickerAlt="BASEBALL DARTS" left={<BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" />} right={<InfoDot title="Règles du Baseball Darts" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} secondary={secondary} />} />} />

      <div style={{ padding: "8px 4px 0", width: "100vw", maxWidth: "100vw", marginLeft: "calc(50% - 50vw)", boxSizing: "border-box" }}>
        <section style={{ ...panelStyle(), marginBottom: 10, padding: 12, borderColor: `${accent}77`, boxShadow: `0 0 24px ${accent}24` }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ width: 58, height: 58, position: "relative", flex: "0 0 auto" }}>
                <div style={{ position: "absolute", inset: 6 }}><ProfileAvatar profile={activeProfile as any} size={46} /></div>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><ProfileStarRing profile={activeProfile as any} size={58} glow /></div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1 }}>{botThinking ? "BOT EN RÉFLEXION" : "AU LANCER"}</div>
                <div style={{ marginTop: 2, fontSize: 17, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
                {activeTeam ? <div style={{ marginTop: 2, color: themeSoft, fontSize: 10.5, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeTeam.name}</div> : null}
              </div>
            </div>
            <div style={{ textAlign: "center", minWidth: state.rules.gameVariant === "attack_defense" ? 128 : 96 }}>
              <div style={{ color: themeSoft, fontSize: 9.5, fontWeight: 1000, letterSpacing: 1 }}>MANCHE {state.inning}{state.inning > state.rules.innings ? " • EXTRA" : ""}</div>
              {state.rules.gameVariant === "attack_defense" ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 7, marginTop: 3 }}>
                    <span style={{ color: secondary, fontSize: 34, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${secondary}88` }}>{state.target === 25 ? "BULL" : state.target}</span>
                    <span style={{ color: state.duelPhase === "defense" ? T.green : accent, fontSize: 14, fontWeight: 1100, letterSpacing: .7 }}>{state.duelPhase === "defense" ? "DÉFENSE" : "ATTAQUE"}</span>
                  </div>
                  <div style={{ color: themeSoft, fontSize: 9, fontWeight: 900, marginTop: 4 }}>CIBLE • VS {playerName(duelOpponent)}</div>
                </>
              ) : (
                <>
                  <div style={{ color: secondary, fontSize: 38, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${secondary}88`, marginTop: 4 }}>{state.target === 25 ? "BULL" : state.target}</div>
                  <div style={{ color: themeSoft, fontSize: 9, fontWeight: 900, marginTop: 3 }}>CIBLE</div>
                </>
              )}
            </div>
          </div>
        </section>

        <section style={{ ...panelStyle(), marginBottom: 10, padding: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1 }}>TABLEAU DES MANCHES</div>
            <div style={{ color: themeSoft, fontSize: 9.5 }}>Glisser horizontalement</div>
          </div>
          <div style={{ overflowX: "auto", borderRadius: 13, border: `1px solid ${themeStroke}` }} className="dc-scroll-thin">
            <table style={{ width: "100%", minWidth: Math.max(500, 86 + shownInnings.length * 48 + 58), borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: `${primary}12`, color: primary }}>
                  <th style={{ ...thStyle(), position: "sticky", left: 0, zIndex: 3, background: theme?.card || "#101827", minWidth: 74, width: 74, textAlign: "center" }}>PROFIL</th>
                  {shownInnings.map((inning) => {
                    const target = state.targetSequence?.[inning - 1];
                    return <th key={inning} style={{ ...thStyle(), minWidth: 48 }}><div style={{ fontSize: 8, opacity: .7 }}>M{inning}{state.rules.gameVariant === "attack_defense" ? " • A/D" : ""}</div><div style={{ color: secondary, fontSize: 10.5, marginTop: 1 }}>{target === 25 ? "BULL" : target || "—"}</div></th>;
                  })}
                  <th style={{ ...thStyle(), color: secondary, minWidth: 54 }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {state.standings.map((standing) => {
                  const activeEntityId = config.participantMode === "teams" ? activeTeamId : activePlayer?.id;
                  const active = standing.id === activeEntityId;
                  const color = config.participantMode === "teams" ? teamById.get(standing.id)?.color || primary : active ? accent : themeText;
                  return (
                    <tr key={standing.id} style={{ background: active ? `${color}12` : "rgba(255,255,255,.018)" }}>
                      <td style={{ ...tdStyle(), position: "sticky", left: 0, zIndex: 2, background: active ? `${primary}18` : (theme?.card || "#0d1421"), color, fontWeight: 1000, minWidth: 74, width: 74, padding: "4px 5px", borderLeft: active ? `3px solid ${color}` : "3px solid transparent" }}><StandingMedallion standing={standing} participantMode={config.participantMode} profilesById={byId} teamById={teamById} color={color} /></td>
                      {shownInnings.map((inning) => {
                        const value = entityInningScore(standing, inning);
                        const played = standing.playerIds.every((id) => state.inningScoresByPlayer[id]?.[inning] !== undefined);
                        return <td key={inning} style={{ ...tdStyle(), color: played ? value > 0 ? T.green : "rgba(255,255,255,.46)" : "rgba(255,255,255,.20)", fontWeight: value > 0 ? 1000 : 750 }}>{played ? value : "·"}</td>;
                      })}
                      <td style={{ ...tdStyle(), color: secondary, fontSize: 16, fontWeight: 1100 }}>{standing.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ ...panelStyle(), marginBottom: 10, padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            {state.rules.gameVariant === "attack_defense" ? (
              <>
                <MiniKpi label="POINTS" value={activeScore} color={accent} />
                <MiniKpi label="PUISS. ATT" value={activeStats.attackPower} color={secondary} />
                <MiniKpi label="PUISS. DEF" value={activeStats.defensePower} color={T.green} />
                <MiniKpi label="BLOQUÉS" value={activeStats.runsPrevented} color={primary} />
              </>
            ) : (
              <>
                <MiniKpi label="RUNS" value={activeScore} color={accent} />
                <MiniKpi label="BEST" value={activeStats.bestInning} color={secondary} />
                <MiniKpi label="HITS CIBLE" value={activeStats.targetHits} color={T.green} />
                <MiniKpi label="PRÉCISION" value={`${percent(activeStats.targetHits, activeStats.darts)}%`} color={primary} />
              </>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(68px,1fr))", gap: 6, marginTop: 6 }}>
            <MiniKpi label="DARTS" value={activeStats.darts} color={primary} />
            <MiniKpi label="SIMPLES" value={activeStats.singles} color={themeText} />
            <MiniKpi label="DOUBLES" value={activeStats.doubles} color="#31c9ef" />
            <MiniKpi label="TRIPLES" value={activeStats.triples} color="#c24cff" />
            <MiniKpi label="BULL" value={activeStats.bulls} color={T.green} />
            <MiniKpi label="DBULL" value={activeStats.dbulls} color={secondary} />
            <MiniKpi label="MISS" value={activeStats.misses} color={T.red} />
          </div>
        </section>

        <section style={{ ...panelStyle(), padding: 10 }}>
          {config.scoreInputMethod === "dartboard" ? (
            <div style={{ padding: "2px 0 10px" }}>
              <DartboardClickable multiplier={multiplier} disabled={state.finished || botThinking || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                <ModeButton label="SIMPLE" color={T.green} active={multiplier === 1} onClick={() => setMultiplier(1)} disabled={state.finished || botThinking} />
                <ModeButton label="DOUBLE" color="#31c9ef" active={multiplier === 2} onClick={() => setMultiplier(2)} disabled={state.finished || botThinking} />
                <ModeButton label="TRIPLE" color="#c24cff" active={multiplier === 3} onClick={() => setMultiplier(3)} disabled={state.finished || botThinking} />
              </div>
              <VisitStrip darts={throwDarts} activeName={playerName(activeProfile)} runs={state.rules.gameVariant === "attack_defense" ? previewPower : previewRuns} valueLabel={state.rules.gameVariant === "attack_defense" ? "PUISS." : "R"} color={accent} botThinking={botThinking} specialBull={specialBullInThrow} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
                <ActionButton label="MISS" color={T.red} disabled={botThinking || state.finished} onClick={() => addDart(0, 1)} />
                <ActionButton label="ANNULER" color={secondary} disabled={botThinking || (!throwDarts.length && !canUndo)} onClick={cancelOrUndo} />
                <ActionButton label="VALIDER" color={T.green} disabled={botThinking || !throwDarts.length || state.finished} onClick={validateVisit} />
              </div>
            </div>
          ) : (
            <div style={{ opacity: botThinking ? .48 : 1, pointerEvents: botThinking || state.finished ? "none" : "auto" }}>
              <Keypad
                currentThrow={throwDarts as any}
                multiplier={multiplier}
                onSimple={() => setMultiplier(1)}
                onDouble={() => setMultiplier(2)}
                onTriple={() => setMultiplier(3)}
                onBackspace={() => setThrowDarts((previous) => previous.slice(0, -1))}
                onCancel={cancelOrUndo}
                onNumber={(number) => addDart(number)}
                onBull={() => addDart(25, multiplier === 2 ? 2 : 1)}
                onValidate={validateVisit}
                hidePreview={false}
                centerSlot={<div style={{ color: (state.rules.gameVariant === "attack_defense" ? previewPower : previewRuns) ? T.green : themeSoft, fontSize: 17, fontWeight: 1100, whiteSpace: "nowrap", textAlign: "center" }}>{state.rules.gameVariant === "attack_defense" ? `PUISS. ${previewPower}` : `+${previewRuns} R`}{specialBullInThrow ? <div style={{ fontSize: 8, color: secondary, marginTop: 2 }}>EFFET BULL</div> : null}</div>}
              />
            </div>
          )}
        </section>
      </div>

      {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} primary={primary} secondary={secondary} onClose={() => setShowEnd(false)} onSave={saveAndQuit} onReplay={saveAndReplay} /> : null}
    </div>
  );
}

function panelStyle(): React.CSSProperties {
  return { borderRadius: 18, border: `1px solid ${T.stroke}`, background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(5,8,16,.72))", boxShadow: "0 14px 30px rgba(0,0,0,.25)", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" };
}

function thStyle(): React.CSSProperties {
  return { padding: "8px 7px", borderBottom: `1px solid ${T.stroke}`, textAlign: "center", fontSize: 9.5, fontWeight: 1000, letterSpacing: .4 };
}

function tdStyle(): React.CSSProperties {
  return { padding: "8px 7px", borderBottom: "1px solid rgba(255,255,255,.055)", textAlign: "center" };
}

function MiniKpi({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return <div style={{ padding: "7px 4px", borderRadius: 12, textAlign: "center", background: "rgba(255,255,255,.045)", border: `1px solid ${T.stroke}`, minWidth: 0 }}><div style={{ color: T.soft, fontSize: 8.5, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div><div style={{ color, fontSize: 15, fontWeight: 1000, marginTop: 2 }}>{value}</div></div>;
}


function StandingMedallion({ standing, participantMode, profilesById, teamById, color }: any) {
  const title = standing?.name || "Participant";
  const badge = (
    <span style={{ position: "absolute", right: -3, bottom: -2, minWidth: 17, height: 17, padding: "0 4px", display: "grid", placeItems: "center", borderRadius: 999, background: "#05070c", border: `1px solid ${color}`, color, fontSize: 8, fontWeight: 1100, boxShadow: `0 0 8px ${color}55` }}>
      {standing?.rank || 1}
    </span>
  );

  if (participantMode === "teams") {
    const team = teamById.get(String(standing?.id || ""));
    const logo = team?.logoDataUrl || team?.logoUrl || team?.logo || null;
    const initials = String(team?.name || standing?.name || "EQ").split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
    return (
      <div title={title} aria-label={title} style={{ width: 44, height: 44, margin: "0 auto", position: "relative" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", background: `${color}18`, border: `2px solid ${color}`, boxShadow: `0 0 12px ${color}44`, color, fontWeight: 1100, fontSize: 11 }}>
          {logo ? <img src={logo} alt={title} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials || "EQ"}
        </div>
        {badge}
      </div>
    );
  }

  const playerId = String(standing?.playerIds?.[0] || standing?.id || "");
  const profile = profilesById.get(playerId) || { id: playerId, name: title };
  return (
    <div title={title} aria-label={title} style={{ width: 46, height: 46, margin: "0 auto", position: "relative" }}>
      <div style={{ position: "absolute", inset: 5 }}><ProfileAvatar profile={profile} size={36} /></div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><ProfileStarRing profile={profile} size={46} glow /></div>
      {badge}
    </div>
  );
}

function ModeButton({ label, color, active, onClick, disabled }: any) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ minHeight: 42, borderRadius: 999, border: `1px solid ${active ? color : T.stroke}`, background: active ? `linear-gradient(180deg,${color}55,${color}18)` : "rgba(0,0,0,.24)", color: active ? "#fff" : color, fontWeight: 1000, letterSpacing: .6, boxShadow: active ? `0 0 18px ${color}55` : "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .42 : 1 }}>{label}</button>;
}

function ActionButton({ label, color, disabled, onClick }: any) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ minHeight: 48, borderRadius: 999, border: `1px solid ${color}88`, background: disabled ? "rgba(255,255,255,.055)" : `linear-gradient(180deg,${color}88,${color}32)`, color: disabled ? "rgba(255,255,255,.4)" : "#fff", fontWeight: 1000, letterSpacing: 1, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : `0 0 15px ${color}38` }}>{label}</button>;
}

function VisitStrip({ darts, activeName, runs, valueLabel = "R", color, botThinking, specialBull }: any) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, minHeight: 48, padding: "8px 10px", borderRadius: 15, border: `1px solid ${T.stroke}`, background: "rgba(0,0,0,.20)", marginTop: 9 }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 10, color: T.soft, fontWeight: 900 }}>{botThinking ? "BOT EN RÉFLEXION" : `VOLÉE DE ${activeName}`}</div><div style={{ fontSize: 13, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{botThinking ? "…" : darts.length ? darts.map(dartLabel).join(" • ") : "—"}</div></div><div style={{ textAlign: "right" }}><div style={{ color, fontSize: 18, fontWeight: 1100, whiteSpace: "nowrap" }}>{valueLabel === "R" ? `+${runs} R` : `${valueLabel} ${runs}`}</div>{specialBull ? <div style={{ color: T.gold, fontSize: 8, fontWeight: 1000 }}>EFFET BULL</div> : null}</div></div>;
}

function EndModal({ state, profilesById, teamById, primary = T.cyan, secondary = T.gold, onClose, onSave, onReplay }: any) {
  const winnerLabel = state.tied ? "ÉGALITÉ" : `${state.standings[0]?.name || "—"} GAGNE`;
  const rows = state.players.map((player: any) => ({
    player,
    profile: profilesById.get(String(player.id)) || player,
    team: state.teamByPlayer[player.id] ? teamById.get(state.teamByPlayer[player.id]) : null,
    stats: state.statsByPlayer[player.id] || emptyStats(),
    score: state.totalsByPlayer[player.id] || 0,
  }));
  const columns: Array<[string, (row: any) => React.ReactNode]> = state.rules.gameVariant === "attack_defense" ? [
    ["Joueur", (row) => playerName(row.profile)], ["Équipe", (row) => row.team?.name || "—"], ["Points", (row) => row.score],
    ["P.Att", (row) => row.stats.attackPower], ["P.Def", (row) => row.stats.defensePower], ["Duel", (row) => row.stats.duelPoints], ["Bloqués", (row) => row.stats.runsPrevented],
    ["Darts", (row) => row.stats.darts], ["S", (row) => row.stats.singles], ["D", (row) => row.stats.doubles], ["T", (row) => row.stats.triples], ["Bull", (row) => row.stats.bulls], ["DBull", (row) => row.stats.dbulls], ["Miss", (row) => row.stats.misses],
  ] : [
    ["Joueur", (row) => playerName(row.profile)], ["Équipe", (row) => row.team?.name || "—"], ["Runs", (row) => row.score],
    ["Best", (row) => row.stats.bestInning], ["Cible", (row) => row.stats.targetHits], ["Préc.", (row) => `${percent(row.stats.targetHits, row.stats.darts)}%`],
    ["Darts", (row) => row.stats.darts], ["S", (row) => row.stats.singles], ["D", (row) => row.stats.doubles], ["T", (row) => row.stats.triples], ["Bull", (row) => row.stats.bulls], ["DBull", (row) => row.stats.dbulls],
    ["Hors cible", (row) => row.stats.wastedDarts], ["Miss", (row) => row.stats.misses], ["Pénalités", (row) => row.stats.penalties], ["Runs perdus", (row) => row.stats.penaltyRunsLost],
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 14, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)" }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(760px,96vw)", maxHeight: "89dvh", overflowY: "auto", borderRadius: 22, padding: 15, color: T.text, background: "linear-gradient(180deg,#16283d,#070a12)", border: `1px solid ${state.tied ? primary : secondary}99`, boxShadow: `0 0 34px ${state.tied ? primary : secondary}30` }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: T.soft, fontWeight: 1000, letterSpacing: 1.3 }}>FIN DU BASEBALL • {state.inning} MANCHE{state.inning > 1 ? "S" : ""}</div><div style={{ marginTop: 4, fontSize: 23, fontWeight: 1000, color: state.tied ? primary : secondary, textShadow: "0 0 14px currentColor" }}>{winnerLabel}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, margin: "14px 0" }}>{state.standings.map((standing: BaseballStanding) => <div key={standing.id} style={{ padding: 11, borderRadius: 15, textAlign: "center", border: `1px solid ${standing.rank === 1 ? secondary : T.stroke}`, background: standing.rank === 1 ? `${secondary}18` : "rgba(255,255,255,.035)" }}><div style={{ color: standing.rank === 1 ? secondary : T.soft, fontSize: 10, fontWeight: 1000 }}>{standing.rank}. {standing.name}</div><div style={{ fontSize: 29, fontWeight: 1100, marginTop: 2 }}>{standing.total}</div><div style={{ color: T.soft, fontSize: 9 }}>{state.rules.gameVariant === "attack_defense" ? "POINTS" : "RUNS"}</div></div>)}</div>
        <div style={{ fontSize: 12, color: primary, fontWeight: 1000, marginBottom: 7 }}>STATISTIQUES COMPLÈTES</div>
        <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${T.stroke}` }}><table style={{ width: "100%", minWidth: 940, borderCollapse: "collapse", fontSize: 11 }}><thead><tr style={{ color: primary, background: `${primary}12`, textAlign: "left" }}>{columns.map(([label]) => <th key={label} style={{ padding: "8px 7px", borderBottom: `1px solid ${T.stroke}` }}>{label}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id}>{columns.map(([label, read]) => <td key={label} style={{ padding: "9px 7px", borderBottom: "1px solid rgba(255,255,255,.06)", fontWeight: label === "Joueur" ? 1000 : 800, color: label === "Équipe" ? row.team?.color || T.text : T.text }}>{read(row)}</td>)}</tr>)}</tbody></table></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 13 }}><ActionButton label="SAUVER & QUITTER" color={T.red} onClick={onSave} disabled={false} /><ActionButton label="SAUVER & REJOUER" color={T.green} onClick={onReplay} disabled={false} /></div>
        <button type="button" onClick={onClose} style={{ width: "100%", minHeight: 42, marginTop: 9, borderRadius: 999, border: `1px solid ${T.stroke}`, background: "rgba(255,255,255,.04)", color: T.soft, fontWeight: 900 }}>REVOIR LE TABLEAU</button>
      </div>
    </div>
  );
}
