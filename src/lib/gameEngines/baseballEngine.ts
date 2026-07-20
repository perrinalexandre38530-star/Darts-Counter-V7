// =============================================================
// BASEBALL DARTS — moteur pur, déterministe et annulable côté UI
// =============================================================

import type { GameDart, Player } from "../types-game";

export type BaseballParticipantMode = "players" | "teams";
export type BaseballSeventhInningRule = "none" | "halve_on_zero";

export type BaseballTeamConfig = {
  id: string;
  name: string;
  color?: string;
  logoDataUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type BaseballConfigPayload = {
  mode: "baseball";
  participantMode: BaseballParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: BaseballTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  innings: number;
  extraInnings: boolean;
  maxExtraInnings: number;
  seventhInningRule: BaseballSeventhInningRule;
  randomOrder: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
};

export type BaseballRules = {
  mode: "baseball";
  innings: number;
  extraInnings: boolean;
  maxExtraInnings: number;
  seventhInningRule: BaseballSeventhInningRule;
  participantMode: BaseballParticipantMode;
};

export type BaseballPlayerStats = {
  darts: number;
  visits: number;
  hits: number;
  targetHits: number;
  misses: number;
  wastedDarts: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  runs: number;
  rawRuns: number;
  penalties: number;
  penaltyRunsLost: number;
  scorelessInnings: number;
  bestInning: number;
  bestDart: number;
};

export type BaseballVisit = {
  id: string;
  createdAt: string;
  inning: number;
  target: number;
  playerId: string;
  teamId: string | null;
  darts: GameDart[];
  labels: string[];
  runs: number;
  rawRuns: number;
  penaltyRunsLost: number;
};

export type BaseballStanding = {
  id: string;
  name: string;
  playerIds: string[];
  total: number;
  rank: number;
  tied: boolean;
};

export type BaseballState = {
  sport: "darts";
  mode: "baseball";
  rules: BaseballRules;
  players: Player[];
  teams: BaseballTeamConfig[];
  teamByPlayer: Record<string, string>;
  turnOrder: string[];
  activePlayerIndex: number;
  inning: number;
  target: number;
  inningScoresByPlayer: Record<string, Record<number, number>>;
  totalsByPlayer: Record<string, number>;
  statsByPlayer: Record<string, BaseballPlayerStats>;
  history: BaseballVisit[];
  standings: BaseballStanding[];
  winnerIds: string[];
  tied: boolean;
  finished: boolean;
  finishReason: "regular" | "extra" | "extra-cap" | null;
  startedAt: number;
  finishedAt?: number;
};

function clampInt(value: any, min: number, max: number, fallback: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function normalizePlayers(players: Player[]): Player[] {
  const seen = new Set<string>();
  const clean = (players || []).filter((player: any) => {
    const id = String(player?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (clean.length) return clean.map((player, index) => ({
    id: String(player.id),
    name: String(player.name || `Joueur ${index + 1}`),
  }));
  return [{ id: "p1", name: "Joueur 1" }];
}

function normalizeTeams(players: Player[], input: BaseballTeamConfig[] = []): BaseballTeamConfig[] {
  const validPlayerIds = new Set(players.map((player) => player.id));
  const usedPlayers = new Set<string>();
  const teams = (input || [])
    .map((team, index) => ({
      ...team,
      id: String(team?.id || `team-${index + 1}`),
      name: String(team?.name || `Équipe ${index + 1}`),
      playerIds: Array.from(new Set((team?.playerIds || []).map(String)))
        .filter((id) => validPlayerIds.has(id) && !usedPlayers.has(id)),
    }))
    .filter((team) => {
      team.playerIds.forEach((id) => usedPlayers.add(id));
      return team.playerIds.length > 0;
    });
  return teams;
}

function emptyStats(): BaseballPlayerStats {
  return {
    darts: 0,
    visits: 0,
    hits: 0,
    targetHits: 0,
    misses: 0,
    wastedDarts: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    bulls: 0,
    dbulls: 0,
    runs: 0,
    rawRuns: 0,
    penalties: 0,
    penaltyRunsLost: 0,
    scorelessInnings: 0,
    bestInning: 0,
    bestDart: 0,
  };
}

function dartInfo(dart: GameDart, target: number) {
  if (!dart || dart.bed === "MISS") {
    return { label: "MISS", onBoard: false, targetHit: false, runs: 0, multiplier: 0 };
  }
  if (dart.bed === "OB") {
    return { label: "BULL", onBoard: true, targetHit: target === 25, runs: target === 25 ? 1 : 0, multiplier: 1 };
  }
  if (dart.bed === "IB") {
    return { label: "DBULL", onBoard: true, targetHit: target === 25, runs: target === 25 ? 2 : 0, multiplier: 2 };
  }
  const number = clampInt(dart.number, 1, 20, 0);
  const multiplier = dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1;
  const targetHit = number === target;
  return {
    label: `${dart.bed}${number}`,
    onBoard: number > 0,
    targetHit,
    runs: targetHit ? multiplier : 0,
    multiplier,
  };
}

function cloneState(state: BaseballState): BaseballState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    teams: state.teams.map((team) => ({ ...team, playerIds: [...team.playerIds] })),
    teamByPlayer: { ...state.teamByPlayer },
    turnOrder: [...state.turnOrder],
    inningScoresByPlayer: Object.fromEntries(
      Object.entries(state.inningScoresByPlayer).map(([id, scores]) => [id, { ...scores }])
    ),
    totalsByPlayer: { ...state.totalsByPlayer },
    statsByPlayer: Object.fromEntries(
      Object.entries(state.statsByPlayer).map(([id, stats]) => [id, { ...stats }])
    ),
    history: [...state.history],
    standings: state.standings.map((standing) => ({ ...standing, playerIds: [...standing.playerIds] })),
    winnerIds: [...state.winnerIds],
  };
}

function entityRows(state: BaseballState): Omit<BaseballStanding, "rank" | "tied">[] {
  if (state.rules.participantMode === "teams" && state.teams.length >= 2) {
    return state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      playerIds: [...team.playerIds],
      total: team.playerIds.reduce((sum, id) => sum + Number(state.totalsByPlayer[id] || 0), 0),
    }));
  }
  return state.players.map((player) => ({
    id: player.id,
    name: player.name,
    playerIds: [player.id],
    total: Number(state.totalsByPlayer[player.id] || 0),
  }));
}

function computeStandings(state: BaseballState): BaseballStanding[] {
  const rows = entityRows(state).sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "fr"));
  let lastScore: number | null = null;
  let lastRank = 0;
  return rows.map((row, index) => {
    const rank = lastScore === row.total ? lastRank : index + 1;
    lastScore = row.total;
    lastRank = rank;
    return {
      ...row,
      rank,
      tied: rows.filter((candidate) => candidate.total === row.total).length > 1,
    };
  });
}

function completeGame(state: BaseballState, reason: BaseballState["finishReason"]): BaseballState {
  state.standings = computeStandings(state);
  const best = state.standings[0]?.total ?? 0;
  state.winnerIds = state.standings.filter((standing) => standing.total === best).map((standing) => standing.id);
  state.tied = state.winnerIds.length > 1;
  state.finished = true;
  state.finishReason = reason;
  state.finishedAt = Date.now();
  return state;
}

function shouldContinueAfterInning(state: BaseballState): boolean {
  const standings = computeStandings(state);
  const top = standings[0]?.total ?? 0;
  const leaders = standings.filter((standing) => standing.total === top);
  state.standings = standings;
  if (state.inning < state.rules.innings) return true;
  if (leaders.length <= 1) return false;
  if (!state.rules.extraInnings) return false;
  return state.inning < state.rules.innings + state.rules.maxExtraInnings;
}

function targetForInning(inning: number): number {
  return inning <= 20 ? inning : 25;
}

export const BaseballEngine = {
  initGame(
    playersInput: Player[],
    rulesInput: Partial<BaseballRules> = {},
    teamConfigs: BaseballTeamConfig[] = []
  ): BaseballState {
    const players = normalizePlayers(playersInput);
    const innings = clampInt(rulesInput.innings, 1, 20, 9);
    const participantMode: BaseballParticipantMode = rulesInput.participantMode === "teams" ? "teams" : "players";
    const teams = participantMode === "teams" ? normalizeTeams(players, teamConfigs) : [];
    const teamByPlayer: Record<string, string> = {};
    teams.forEach((team) => team.playerIds.forEach((id) => { teamByPlayer[id] = team.id; }));
    const turnOrder = players.map((player) => player.id);
    const inningScoresByPlayer = Object.fromEntries(players.map((player) => [player.id, {}]));
    const totalsByPlayer = Object.fromEntries(players.map((player) => [player.id, 0]));
    const statsByPlayer = Object.fromEntries(players.map((player) => [player.id, emptyStats()]));
    const state: BaseballState = {
      sport: "darts",
      mode: "baseball",
      rules: {
        mode: "baseball",
        innings,
        extraInnings: rulesInput.extraInnings !== false,
        maxExtraInnings: clampInt(rulesInput.maxExtraInnings, 1, Math.max(1, 20 - innings), Math.max(1, 20 - innings)),
        seventhInningRule: rulesInput.seventhInningRule === "halve_on_zero" ? "halve_on_zero" : "none",
        participantMode,
      },
      players,
      teams,
      teamByPlayer,
      turnOrder,
      activePlayerIndex: 0,
      inning: 1,
      target: 1,
      inningScoresByPlayer,
      totalsByPlayer,
      statsByPlayer,
      history: [],
      standings: [],
      winnerIds: [],
      tied: false,
      finished: false,
      finishReason: null,
      startedAt: Date.now(),
    };
    state.standings = computeStandings(state);
    return state;
  },

  playTurn(state: BaseballState, dartsInput: GameDart[]): BaseballState {
    if (!state || state.finished) return state;
    const next = cloneState(state);
    const playerId = next.turnOrder[next.activePlayerIndex];
    const player = next.players.find((candidate) => candidate.id === playerId);
    if (!player) return state;

    const darts = (dartsInput || []).slice(0, 3);
    const stats = next.statsByPlayer[playerId] || (next.statsByPlayer[playerId] = emptyStats());
    const labels: string[] = [];
    let rawRuns = 0;

    stats.visits += 1;
    for (const dart of darts) {
      const info = dartInfo(dart, next.target);
      labels.push(info.label);
      stats.darts += 1;
      if (info.onBoard) stats.hits += 1;
      else stats.misses += 1;
      if (dart.bed === "S") stats.singles += 1;
      else if (dart.bed === "D") stats.doubles += 1;
      else if (dart.bed === "T") stats.triples += 1;
      else if (dart.bed === "OB") stats.bulls += 1;
      else if (dart.bed === "IB") stats.dbulls += 1;
      if (info.targetHit) {
        stats.targetHits += 1;
        rawRuns += info.runs;
        stats.bestDart = Math.max(stats.bestDart, info.runs);
      } else if (info.onBoard) {
        stats.wastedDarts += 1;
      }
    }

    const beforeTotal = Number(next.totalsByPlayer[playerId] || 0);
    let penaltyRunsLost = 0;
    if (next.inning === 7 && rawRuns === 0 && next.rules.seventhInningRule === "halve_on_zero") {
      const halved = Math.floor(beforeTotal / 2);
      penaltyRunsLost = beforeTotal - halved;
      next.totalsByPlayer[playerId] = halved;
      stats.penalties += 1;
      stats.penaltyRunsLost += penaltyRunsLost;
    } else {
      next.totalsByPlayer[playerId] = beforeTotal + rawRuns;
    }

    next.inningScoresByPlayer[playerId][next.inning] = rawRuns;
    stats.rawRuns += rawRuns;
    stats.runs = next.totalsByPlayer[playerId];
    stats.bestInning = Math.max(stats.bestInning, rawRuns);
    if (rawRuns === 0) stats.scorelessInnings += 1;

    next.history.push({
      id: `baseball-${next.startedAt}-${next.history.length + 1}`,
      createdAt: new Date().toISOString(),
      inning: next.inning,
      target: next.target,
      playerId,
      teamId: next.teamByPlayer[playerId] || null,
      darts,
      labels,
      runs: rawRuns - penaltyRunsLost,
      rawRuns,
      penaltyRunsLost,
    });

    const isLastPlayer = next.activePlayerIndex >= next.turnOrder.length - 1;
    if (!isLastPlayer) {
      next.activePlayerIndex += 1;
      next.standings = computeStandings(next);
      return next;
    }

    next.standings = computeStandings(next);
    if (!shouldContinueAfterInning(next)) {
      const extra = next.inning > next.rules.innings;
      const topScore = next.standings[0]?.total ?? 0;
      const topIsTied = next.standings.filter((standing) => standing.total === topScore).length > 1;
      const capReached = extra && topIsTied && next.inning >= next.rules.innings + next.rules.maxExtraInnings;
      return completeGame(next, capReached ? "extra-cap" : extra ? "extra" : "regular");
    }

    next.inning += 1;
    next.target = targetForInning(next.inning);
    next.activePlayerIndex = 0;
    return next;
  },

  isGameOver(state: BaseballState) {
    return Boolean(state?.finished);
  },

  getStandings(state: BaseballState) {
    return computeStandings(state);
  },

  targetForInning,
};
