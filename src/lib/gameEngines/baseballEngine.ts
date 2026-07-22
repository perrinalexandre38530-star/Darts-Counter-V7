// =============================================================
// BASEBALL DARTS — moteur pur, déterministe et annulable côté UI
// =============================================================

import type { GameDart, Player } from "../types-game";

export type BaseballParticipantMode = "players" | "teams";
export type BaseballSeventhInningRule = "none" | "halve_on_zero";
export type BaseballGameVariant = "target" | "attack_defense";
export type BaseballBullTargetMode = "off" | "defense" | "attack" | "random";
export type BaseballDuelRole = "attack" | "defense";

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
  gameVariant?: BaseballGameVariant;
  bullTargetMode?: BaseballBullTargetMode;
  bullBonusPoints?: number;
  missEndsTurn?: boolean;
  /** @deprecated conservé pour relire d'anciennes configurations V63. */
  dbullRuns?: 2 | 3;
  randomOrder: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
};

export type BaseballRules = {
  mode: "baseball";
  innings: number;
  extraInnings: boolean;
  maxExtraInnings: number;
  seventhInningRule: BaseballSeventhInningRule;
  gameVariant: BaseballGameVariant;
  bullTargetMode: BaseballBullTargetMode;
  bullBonusPoints: number;
  missEndsTurn: boolean;
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
  attackVisits: number;
  defenseVisits: number;
  attackPower: number;
  defensePower: number;
  duelPoints: number;
  runsPrevented: number;
  bullAttackBonus: number;
  bullDefenseDamage: number;
  dbullAttackDoubles: number;
  dbullDefenseHalves: number;
  turnsLostOnMiss: number;
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
  role: "classic" | BaseballDuelRole;
  opponentPlayerId?: string | null;
  power?: number;
  attackPower?: number;
  defensePower?: number;
  duelPoints?: number;
  bullScoreDelta?: number;
  opponentScoreDelta?: number;
  endedByMiss?: boolean;
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
  targetSequence: number[];
  inningScoresByPlayer: Record<string, Record<number, number>>;
  /** Ajustements de score liés aux BULL/DBULL, notamment au niveau équipe. */
  scoreAdjustmentsByEntity: Record<string, number>;
  inningAdjustmentsByEntity: Record<string, Record<number, number>>;
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
  duelPhase: BaseballDuelRole | null;
  duelPairIndex: number;
  pendingAttackPower: number;
  pendingAttackerId: string | null;
  pendingDefenderId: string | null;
  pendingAttackHadOwnScore: boolean;
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
  return (input || [])
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
    attackVisits: 0,
    defenseVisits: 0,
    attackPower: 0,
    defensePower: 0,
    duelPoints: 0,
    runsPrevented: 0,
    bullAttackBonus: 0,
    bullDefenseDamage: 0,
    dbullAttackDoubles: 0,
    dbullDefenseHalves: 0,
    turnsLostOnMiss: 0,
  };
}

function cloneState(state: BaseballState): BaseballState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    teams: state.teams.map((team) => ({ ...team, playerIds: [...team.playerIds] })),
    teamByPlayer: { ...state.teamByPlayer },
    turnOrder: [...state.turnOrder],
    targetSequence: [...state.targetSequence],
    inningScoresByPlayer: Object.fromEntries(
      Object.entries(state.inningScoresByPlayer).map(([id, scores]) => [id, { ...scores }])
    ),
    scoreAdjustmentsByEntity: { ...state.scoreAdjustmentsByEntity },
    inningAdjustmentsByEntity: Object.fromEntries(
      Object.entries(state.inningAdjustmentsByEntity).map(([id, scores]) => [id, { ...scores }])
    ),
    totalsByPlayer: { ...state.totalsByPlayer },
    statsByPlayer: Object.fromEntries(
      Object.entries(state.statsByPlayer).map(([id, stats]) => [id, { ...stats }])
    ),
    history: state.history.map((visit) => ({ ...visit, darts: [...visit.darts], labels: [...visit.labels] })),
    standings: state.standings.map((standing) => ({ ...standing, playerIds: [...standing.playerIds] })),
    winnerIds: [...state.winnerIds],
  };
}

function shuffled(values: number[]): number[] {
  const out = [...values];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const picked = Math.floor(Math.random() * (index + 1));
    [out[index], out[picked]] = [out[picked], out[index]];
  }
  return out;
}

/**
 * Cibles classiques : 1..20 uniquement. Le BULL ne rejoint la rotation
 * que lorsque l'option explicite « random » est choisie.
 */
function buildTargetSequence(innings: number, maxExtraInnings: number, bullTargetMode: BaseballBullTargetMode): number[] {
  const totalNeeded = Math.max(1, innings + maxExtraInnings);
  const numbers = Array.from({ length: 20 }, (_, index) => index + 1);
  const pool = bullTargetMode === "random" ? [...numbers, 25] : numbers;
  const sequence: number[] = [];

  while (sequence.length < totalNeeded) {
    const cycle = shuffled(pool).filter((value) => value !== sequence[sequence.length - 1]);
    sequence.push(...cycle);
  }
  return sequence.slice(0, totalNeeded);
}

function targetForInning(state: Pick<BaseballState, "targetSequence" | "rules">, inning: number): number {
  return state.targetSequence[Math.max(0, inning - 1)] ?? 1;
}

function entityIdForPlayer(state: BaseballState, playerId: string): string {
  if (state.rules.participantMode === "teams") return state.teamByPlayer[playerId] || playerId;
  return playerId;
}

function entityPlayerIds(state: BaseballState, entityId: string): string[] {
  if (state.rules.participantMode === "teams") {
    return state.teams.find((team) => team.id === entityId)?.playerIds || [];
  }
  return [entityId];
}

function entityTotal(state: BaseballState, entityId: string): number {
  const base = entityPlayerIds(state, entityId).reduce((sum, id) => sum + Number(state.totalsByPlayer[id] || 0), 0);
  return Math.max(0, base + Number(state.scoreAdjustmentsByEntity[entityId] || 0));
}

function addInningAdjustment(state: BaseballState, entityId: string, inning: number, delta: number) {
  if (!delta) return;
  if (!state.inningAdjustmentsByEntity[entityId]) state.inningAdjustmentsByEntity[entityId] = {};
  state.inningAdjustmentsByEntity[entityId][inning] = Number(state.inningAdjustmentsByEntity[entityId][inning] || 0) + delta;
}

function applyEntityDelta(state: BaseballState, entityId: string, requestedDelta: number, inning: number): number {
  if (!entityId || !requestedDelta) return 0;
  const before = entityTotal(state, entityId);
  const after = Math.max(0, before + requestedDelta);
  const actual = after - before;
  state.scoreAdjustmentsByEntity[entityId] = Number(state.scoreAdjustmentsByEntity[entityId] || 0) + actual;
  addInningAdjustment(state, entityId, inning, actual);
  return actual;
}

function setEntityTotal(state: BaseballState, entityId: string, desired: number, inning: number): number {
  return applyEntityDelta(state, entityId, Math.max(0, desired) - entityTotal(state, entityId), inning);
}

function orderedEntityIds(state: BaseballState): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const playerId of state.turnOrder) {
    const entityId = entityIdForPlayer(state, playerId);
    if (!seen.has(entityId)) {
      seen.add(entityId);
      out.push(entityId);
    }
  }
  return out;
}

function nextOpponentEntityId(state: BaseballState, playerId: string): string | null {
  const own = entityIdForPlayer(state, playerId);
  const entities = orderedEntityIds(state);
  if (entities.length < 2) return null;
  const ownIndex = Math.max(0, entities.indexOf(own));
  for (let offset = 1; offset < entities.length; offset += 1) {
    const candidate = entities[(ownIndex + offset) % entities.length];
    if (candidate && candidate !== own) return candidate;
  }
  return null;
}

function entityRows(state: BaseballState): Omit<BaseballStanding, "rank" | "tied">[] {
  if (state.rules.participantMode === "teams" && state.teams.length >= 2) {
    return state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      playerIds: [...team.playerIds],
      total: entityTotal(state, team.id),
    }));
  }
  return state.players.map((player) => ({
    id: player.id,
    name: player.name,
    playerIds: [player.id],
    total: entityTotal(state, player.id),
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

function dartLabel(dart: GameDart): string {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${clampInt(dart.number, 1, 20, 1)}`;
}

function classicTargetRuns(dart: GameDart, target: number, bullMode: BaseballBullTargetMode): number {
  if (!dart || dart.bed === "MISS") return 0;
  if (target === 25 && bullMode === "random") {
    if (dart.bed === "OB") return 3;
    if (dart.bed === "IB") return 5;
    return 0;
  }
  if (target < 1 || target > 20) return 0;
  if ((dart.bed === "S" || dart.bed === "D" || dart.bed === "T") && Number(dart.number) === target) {
    return dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1;
  }
  return 0;
}

function isOnBoard(dart: GameDart): boolean {
  return Boolean(dart && dart.bed !== "MISS");
}

function isTargetHit(dart: GameDart, target: number, bullMode: BaseballBullTargetMode): boolean {
  return classicTargetRuns(dart, target, bullMode) > 0;
}

function effectiveDarts(dartsInput: GameDart[], missEndsTurn: boolean): { darts: GameDart[]; endedByMiss: boolean } {
  const capped = (dartsInput || []).slice(0, 3);
  if (!missEndsTurn) return { darts: capped, endedByMiss: false };
  const missIndex = capped.findIndex((dart) => !dart || dart.bed === "MISS");
  if (missIndex < 0) return { darts: capped, endedByMiss: false };
  return { darts: capped.slice(0, missIndex + 1), endedByMiss: true };
}

function registerDartStats(stats: BaseballPlayerStats, dart: GameDart) {
  stats.darts += 1;
  if (isOnBoard(dart)) stats.hits += 1;
  else stats.misses += 1;
  if (dart?.bed === "S") stats.singles += 1;
  else if (dart?.bed === "D") stats.doubles += 1;
  else if (dart?.bed === "T") stats.triples += 1;
  else if (dart?.bed === "OB") stats.bulls += 1;
  else if (dart?.bed === "IB") stats.dbulls += 1;
}

function applySpecialBull(
  state: BaseballState,
  playerId: string,
  dart: GameDart,
  role: "classic" | BaseballDuelRole,
  opponentPlayerId: string | null,
): { ownDelta: number; opponentDelta: number } {
  if (dart?.bed !== "OB" && dart?.bed !== "IB") return { ownDelta: 0, opponentDelta: 0 };
  const mode = state.rules.bullTargetMode;
  if (mode !== "attack" && mode !== "defense") return { ownDelta: 0, opponentDelta: 0 };

  // Dans la variante duel, les effets correspondent strictement au rôle joué.
  if (state.rules.gameVariant === "attack_defense") {
    if (mode === "attack" && role !== "attack") return { ownDelta: 0, opponentDelta: 0 };
    if (mode === "defense" && role !== "defense") return { ownDelta: 0, opponentDelta: 0 };
  }

  const ownEntity = entityIdForPlayer(state, playerId);
  if (mode === "attack") {
    if (dart.bed === "OB") {
      const delta = applyEntityDelta(state, ownEntity, state.rules.bullBonusPoints, state.inning);
      return { ownDelta: delta, opponentDelta: 0 };
    }
    const before = entityTotal(state, ownEntity);
    const delta = setEntityTotal(state, ownEntity, before * 2, state.inning);
    return { ownDelta: delta, opponentDelta: 0 };
  }

  const opponentEntity = opponentPlayerId
    ? entityIdForPlayer(state, opponentPlayerId)
    : nextOpponentEntityId(state, playerId);
  if (!opponentEntity || opponentEntity === ownEntity) return { ownDelta: 0, opponentDelta: 0 };
  if (dart.bed === "OB") {
    const delta = applyEntityDelta(state, opponentEntity, -state.rules.bullBonusPoints, state.inning);
    return { ownDelta: 0, opponentDelta: delta };
  }
  const before = entityTotal(state, opponentEntity);
  const after = Math.ceil(before / 2);
  const delta = setEntityTotal(state, opponentEntity, after, state.inning);
  return { ownDelta: 0, opponentDelta: delta };
}

function applySeventhInningPenalty(state: BaseballState, playerId: string, scoredOwnPoints: boolean): number {
  if (state.inning !== 7 || scoredOwnPoints || state.rules.seventhInningRule !== "halve_on_zero") return 0;
  const entityId = entityIdForPlayer(state, playerId);
  const before = entityTotal(state, entityId);
  const after = Math.floor(before / 2);
  const delta = setEntityTotal(state, entityId, after, state.inning);
  const lost = Math.max(0, -delta);
  const stats = state.statsByPlayer[playerId] || (state.statsByPlayer[playerId] = emptyStats());
  stats.penalties += 1;
  stats.penaltyRunsLost += lost;
  return lost;
}

function finishOrAdvanceInning(next: BaseballState): BaseballState {
  next.standings = computeStandings(next);
  if (!shouldContinueAfterInning(next)) {
    const extra = next.inning > next.rules.innings;
    const topScore = next.standings[0]?.total ?? 0;
    const topIsTied = next.standings.filter((standing) => standing.total === topScore).length > 1;
    const capReached = extra && topIsTied && next.inning >= next.rules.innings + next.rules.maxExtraInnings;
    return completeGame(next, capReached ? "extra-cap" : extra ? "extra" : "regular");
  }

  next.inning += 1;
  next.target = targetForInning(next, next.inning);
  next.duelPairIndex = 0;
  next.duelPhase = next.rules.gameVariant === "attack_defense" ? "attack" : null;
  if (next.rules.gameVariant === "attack_defense") {
    setActivePlayer(next, currentDuelIds(next).attackerId);
  } else {
    next.activePlayerIndex = 0;
  }
  next.pendingAttackPower = 0;
  next.pendingAttackerId = null;
  next.pendingDefenderId = null;
  next.pendingAttackHadOwnScore = false;
  return next;
}

function duelPairs(state: BaseballState): Array<{ attackerId: string; defenderId: string }> {
  if (state.rules.participantMode === "teams") {
    // Le duel d'équipes oppose toujours exactement 2 équipes de même taille.
    // Pour chaque cible, on joue deux demi-manches :
    // 1) tous les joueurs de l'équipe A attaquent face à leur vis-à-vis de B ;
    // 2) les rôles s'inversent et tous les joueurs de B attaquent face à A.
    // Chaque joueur attaque ET défend donc exactement une fois sur la cible.
    const teamA = state.teams[0];
    const teamB = state.teams[1];
    if (!teamA || !teamB) return [];
    const count = Math.min(teamA.playerIds.length, teamB.playerIds.length);
    const pairs: Array<{ attackerId: string; defenderId: string }> = [];
    for (let memberIndex = 0; memberIndex < count; memberIndex += 1) {
      const a = teamA.playerIds[memberIndex];
      const b = teamB.playerIds[memberIndex];
      if (a && b) pairs.push({ attackerId: a, defenderId: b });
    }
    for (let memberIndex = 0; memberIndex < count; memberIndex += 1) {
      const a = teamA.playerIds[memberIndex];
      const b = teamB.playerIds[memberIndex];
      if (a && b) pairs.push({ attackerId: b, defenderId: a });
    }
    return pairs;
  }

  // Duel individuel : strictement 2 joueurs, chacun attaque puis défend
  // sur la même cible avant de passer à la suivante.
  const first = state.turnOrder[0];
  const second = state.turnOrder[1];
  if (!first || !second) return [];
  return [
    { attackerId: first, defenderId: second },
    { attackerId: second, defenderId: first },
  ];
}

function duelPairCount(state: BaseballState): number {
  return duelPairs(state).length;
}

function currentDuelIds(state: BaseballState): { attackerId: string; defenderId: string } {
  const pairs = duelPairs(state);
  const fallback = state.turnOrder[0] || state.players[0]?.id || "";
  if (!pairs.length) return { attackerId: fallback, defenderId: fallback };
  const pairIndex = Math.max(0, Math.min(pairs.length - 1, state.duelPairIndex));
  return pairs[pairIndex];
}

function setActivePlayer(state: BaseballState, playerId: string) {
  const index = state.turnOrder.indexOf(playerId);
  state.activePlayerIndex = index >= 0 ? index : 0;
}

function refreshPlayerRunStats(state: BaseballState) {
  for (const player of state.players) {
    const stats = state.statsByPlayer[player.id] || (state.statsByPlayer[player.id] = emptyStats());
    if (state.rules.participantMode === "players") stats.runs = entityTotal(state, player.id);
    else stats.runs = Number(state.totalsByPlayer[player.id] || 0);
  }
}

function pushVisit(state: BaseballState, visit: Omit<BaseballVisit, "id" | "createdAt" | "teamId">) {
  state.history.push({
    ...visit,
    id: `baseball-${state.startedAt}-${state.history.length + 1}`,
    createdAt: new Date().toISOString(),
    teamId: state.teamByPlayer[visit.playerId] || null,
  });
}

function playClassicTurn(state: BaseballState, dartsInput: GameDart[]): BaseballState {
  const next = cloneState(state);
  const playerId = next.turnOrder[next.activePlayerIndex];
  const player = next.players.find((candidate) => candidate.id === playerId);
  if (!player) return state;

  const { darts, endedByMiss } = effectiveDarts(dartsInput, next.rules.missEndsTurn);
  const stats = next.statsByPlayer[playerId] || (next.statsByPlayer[playerId] = emptyStats());
  const labels = darts.map(dartLabel);
  let rawRuns = 0;
  let ownBullDelta = 0;
  let opponentDelta = 0;

  stats.visits += 1;
  if (endedByMiss) stats.turnsLostOnMiss += 1;

  for (const dart of darts) {
    registerDartStats(stats, dart);
    const targetRun = classicTargetRuns(dart, next.target, next.rules.bullTargetMode);
    if (targetRun > 0) {
      stats.targetHits += 1;
      stats.bestDart = Math.max(stats.bestDart, targetRun);
      rawRuns += targetRun;
      next.totalsByPlayer[playerId] = Number(next.totalsByPlayer[playerId] || 0) + targetRun;
      next.inningScoresByPlayer[playerId][next.inning] = Number(next.inningScoresByPlayer[playerId][next.inning] || 0) + targetRun;
    } else if (isOnBoard(dart)) {
      stats.wastedDarts += 1;
    }

    const effect = applySpecialBull(next, playerId, dart, "classic", null);
    ownBullDelta += effect.ownDelta;
    opponentDelta += effect.opponentDelta;
    if (effect.ownDelta > 0) {
      if (dart.bed === "OB") stats.bullAttackBonus += effect.ownDelta;
      else stats.dbullAttackDoubles += 1;
    }
    if (effect.opponentDelta < 0) {
      stats.bullDefenseDamage += -effect.opponentDelta;
      if (dart.bed === "IB") stats.dbullDefenseHalves += 1;
    }
  }

  if (next.inningScoresByPlayer[playerId][next.inning] === undefined) {
    next.inningScoresByPlayer[playerId][next.inning] = 0;
  }

  const scoredOwnPoints = rawRuns > 0 || ownBullDelta > 0;
  const penaltyRunsLost = applySeventhInningPenalty(next, playerId, scoredOwnPoints);
  stats.rawRuns += rawRuns;
  stats.bestInning = Math.max(stats.bestInning, rawRuns + Math.max(0, ownBullDelta));
  if (!scoredOwnPoints) stats.scorelessInnings += 1;
  refreshPlayerRunStats(next);

  pushVisit(next, {
    inning: next.inning,
    target: next.target,
    playerId,
    darts,
    labels,
    runs: rawRuns + ownBullDelta - penaltyRunsLost,
    rawRuns,
    penaltyRunsLost,
    role: "classic",
    opponentPlayerId: null,
    bullScoreDelta: ownBullDelta,
    opponentScoreDelta: opponentDelta,
    endedByMiss,
  });

  const isLastPlayer = next.activePlayerIndex >= next.turnOrder.length - 1;
  if (!isLastPlayer) {
    next.activePlayerIndex += 1;
    next.standings = computeStandings(next);
    return next;
  }
  return finishOrAdvanceInning(next);
}

function playDuelTurn(state: BaseballState, dartsInput: GameDart[]): BaseballState {
  const next = cloneState(state);
  const { attackerId, defenderId } = currentDuelIds(next);
  const role: BaseballDuelRole = next.duelPhase === "defense" ? "defense" : "attack";
  const playerId = role === "attack" ? attackerId : defenderId;
  const opponentPlayerId = role === "attack" ? defenderId : attackerId;
  const player = next.players.find((candidate) => candidate.id === playerId);
  if (!player) return state;

  const { darts, endedByMiss } = effectiveDarts(dartsInput, next.rules.missEndsTurn);
  const stats = next.statsByPlayer[playerId] || (next.statsByPlayer[playerId] = emptyStats());
  const labels = darts.map(dartLabel);
  let power = 0;
  let ownBullDelta = 0;
  let opponentDelta = 0;

  stats.visits += 1;
  if (role === "attack") stats.attackVisits += 1;
  else stats.defenseVisits += 1;
  if (endedByMiss) stats.turnsLostOnMiss += 1;

  for (const dart of darts) {
    registerDartStats(stats, dart);
    // Seules les touches correspondant à la cible de la manche comptent.
    // Exemple cible 20 : T20=3, S1=0, D5=0.
    const dartPower = classicTargetRuns(dart, next.target, next.rules.bullTargetMode);
    if (dartPower > 0) {
      stats.targetHits += 1;
      stats.bestDart = Math.max(stats.bestDart, dartPower);
      power += dartPower;
    }
    const effect = applySpecialBull(next, playerId, dart, role, opponentPlayerId);
    const bullSpecialIsActive = (dart?.bed === "OB" || dart?.bed === "IB") && (
      (next.rules.bullTargetMode === "attack" && role === "attack") ||
      (next.rules.bullTargetMode === "defense" && role === "defense")
    );
    if (dartPower <= 0 && isOnBoard(dart) && !bullSpecialIsActive) stats.wastedDarts += 1;
    ownBullDelta += effect.ownDelta;
    opponentDelta += effect.opponentDelta;
    if (effect.ownDelta > 0) {
      if (dart.bed === "OB") stats.bullAttackBonus += effect.ownDelta;
      else stats.dbullAttackDoubles += 1;
    }
    if (effect.opponentDelta < 0) {
      stats.bullDefenseDamage += -effect.opponentDelta;
      if (dart.bed === "IB") stats.dbullDefenseHalves += 1;
    }
  }

  if (role === "attack") {
    stats.attackPower += power;
    next.pendingAttackPower = power;
    next.pendingAttackerId = attackerId;
    next.pendingDefenderId = defenderId;
    next.pendingAttackHadOwnScore = ownBullDelta > 0;
    refreshPlayerRunStats(next);
    pushVisit(next, {
      inning: next.inning,
      target: next.target,
      playerId,
      darts,
      labels,
      runs: ownBullDelta,
      rawRuns: 0,
      penaltyRunsLost: 0,
      role,
      opponentPlayerId,
      power,
      attackPower: power,
      bullScoreDelta: ownBullDelta,
      opponentScoreDelta: opponentDelta,
      endedByMiss,
    });
    next.duelPhase = "defense";
    setActivePlayer(next, defenderId);
    next.standings = computeStandings(next);
    return next;
  }

  stats.defensePower += power;
  const attackStats = next.statsByPlayer[attackerId] || (next.statsByPlayer[attackerId] = emptyStats());
  const attackPower = next.pendingAttackerId === attackerId ? next.pendingAttackPower : 0;
  const duelPoints = Math.max(0, attackPower - power);
  const prevented = Math.min(attackPower, power);
  attackStats.duelPoints += duelPoints;
  attackStats.rawRuns += duelPoints;
  attackStats.bestInning = Math.max(attackStats.bestInning, duelPoints);
  stats.runsPrevented += prevented;

  next.totalsByPlayer[attackerId] = Number(next.totalsByPlayer[attackerId] || 0) + duelPoints;
  next.inningScoresByPlayer[attackerId][next.inning] = duelPoints;
  const scoredOwnPoints = duelPoints > 0 || next.pendingAttackHadOwnScore;
  const penaltyRunsLost = applySeventhInningPenalty(next, attackerId, scoredOwnPoints);
  if (!scoredOwnPoints) attackStats.scorelessInnings += 1;
  refreshPlayerRunStats(next);

  pushVisit(next, {
    inning: next.inning,
    target: next.target,
    playerId,
    darts,
    labels,
    runs: 0,
    rawRuns: 0,
    penaltyRunsLost: 0,
    role,
    opponentPlayerId,
    power,
    attackPower,
    defensePower: power,
    duelPoints,
    bullScoreDelta: ownBullDelta,
    opponentScoreDelta: opponentDelta,
    endedByMiss,
  });

  next.pendingAttackPower = 0;
  next.pendingAttackerId = null;
  next.pendingDefenderId = null;
  next.pendingAttackHadOwnScore = false;

  const lastPair = next.duelPairIndex >= duelPairCount(next) - 1;
  if (!lastPair) {
    next.duelPairIndex += 1;
    next.duelPhase = "attack";
    setActivePlayer(next, currentDuelIds(next).attackerId);
    next.standings = computeStandings(next);
    return next;
  }

  return finishOrAdvanceInning(next);
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
    const requestedDuel = rulesInput.gameVariant === "attack_defense";
    const duelEligible = participantMode === "players"
      ? turnOrder.length === 2
      : teams.length === 2
        && teams[0].playerIds.length >= 1
        && teams[0].playerIds.length === teams[1].playerIds.length;
    // Garde-fou moteur : le duel individuel est strictement 1v1 ;
    // le duel multi-joueurs passe obligatoirement par exactement 2 équipes équilibrées.
    const gameVariant: BaseballGameVariant = requestedDuel && duelEligible ? "attack_defense" : "target";
    const bullTargetMode: BaseballBullTargetMode =
      rulesInput.bullTargetMode === "defense" || rulesInput.bullTargetMode === "attack" || rulesInput.bullTargetMode === "random"
        ? rulesInput.bullTargetMode
        : "off";
    const maxExtraInnings = clampInt(rulesInput.maxExtraInnings, 1, 10, 3);
    // Les deux variantes utilisent une cible de manche. En Attaque/Défense,
    // les deux rôles d'un duel jouent obligatoirement sur la même cible.
    const targetSequence = buildTargetSequence(innings, maxExtraInnings, bullTargetMode);
    const inningScoresByPlayer = Object.fromEntries(players.map((player) => [player.id, {}]));
    const totalsByPlayer = Object.fromEntries(players.map((player) => [player.id, 0]));
    const statsByPlayer = Object.fromEntries(players.map((player) => [player.id, emptyStats()]));
    const entityIds = participantMode === "teams" && teams.length ? teams.map((team) => team.id) : players.map((player) => player.id);
    const scoreAdjustmentsByEntity = Object.fromEntries(entityIds.map((id) => [id, 0]));
    const inningAdjustmentsByEntity = Object.fromEntries(entityIds.map((id) => [id, {}]));

    const state: BaseballState = {
      sport: "darts",
      mode: "baseball",
      rules: {
        mode: "baseball",
        innings,
        extraInnings: rulesInput.extraInnings !== false,
        maxExtraInnings,
        seventhInningRule: rulesInput.seventhInningRule === "halve_on_zero" ? "halve_on_zero" : "none",
        gameVariant,
        bullTargetMode,
        bullBonusPoints: clampInt(rulesInput.bullBonusPoints, 1, 20, 4),
        missEndsTurn: rulesInput.missEndsTurn !== false,
        participantMode,
      },
      players,
      teams,
      teamByPlayer,
      turnOrder,
      activePlayerIndex: 0,
      inning: 1,
      target: targetSequence[0] ?? 1,
      targetSequence,
      inningScoresByPlayer,
      scoreAdjustmentsByEntity,
      inningAdjustmentsByEntity,
      totalsByPlayer,
      statsByPlayer,
      history: [],
      standings: [],
      winnerIds: [],
      tied: false,
      finished: false,
      finishReason: null,
      startedAt: Date.now(),
      duelPhase: gameVariant === "attack_defense" ? "attack" : null,
      duelPairIndex: 0,
      pendingAttackPower: 0,
      pendingAttackerId: null,
      pendingDefenderId: null,
      pendingAttackHadOwnScore: false,
    };
    if (state.rules.gameVariant === "attack_defense") {
      setActivePlayer(state, currentDuelIds(state).attackerId);
    }
    state.standings = computeStandings(state);
    return state;
  },

  playTurn(state: BaseballState, dartsInput: GameDart[]): BaseballState {
    if (!state || state.finished) return state;
    if (state.rules.gameVariant === "attack_defense") return playDuelTurn(state, dartsInput);
    return playClassicTurn(state, dartsInput);
  },

  isGameOver(state: BaseballState) {
    return Boolean(state?.finished);
  },

  getStandings(state: BaseballState) {
    return computeStandings(state);
  },

  getEntityTotal(state: BaseballState, entityId: string) {
    return entityTotal(state, entityId);
  },

  getCurrentDuel(state: BaseballState) {
    if (state.rules.gameVariant !== "attack_defense") return null;
    const ids = currentDuelIds(state);
    return { ...ids, role: state.duelPhase || "attack" };
  },

  targetForInning,
  buildTargetSequence,
};
