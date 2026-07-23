// =============================================================
// BOB'S 27 — moteur pur
// Règle classique : 27 pts, D1 -> D20 -> DBULL, 3 fléchettes/cible.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type Bobs27ParticipantMode = "players" | "teams";
export type Bobs27ScoreInputMethod = "keypad" | "dartboard";
export type Bobs27NegativeRule = "eliminate" | "continue";

export type Bobs27TeamConfig = {
  id: string;
  name: string;
  color?: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type Bobs27ConfigPayload = {
  mode: "bobs_27";
  participantMode: Bobs27ParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: Bobs27TeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  startingScore: number;
  startTarget: number;
  endTarget: number;
  includeBull: boolean;
  negativeRule: Bobs27NegativeRule;
  randomOrder: boolean;
  scoreInputMethod: Bobs27ScoreInputMethod;
};

export type Bobs27Rules = Pick<
  Bobs27ConfigPayload,
  "participantMode" | "startingScore" | "startTarget" | "endTarget" | "includeBull" | "negativeRule"
>;

export type Bobs27TargetStat = {
  target: number;
  attempts: number;
  darts: number;
  hits: number;
  pointsWon: number;
  penaltyLost: number;
  bestHits: number;
};

export type Bobs27PlayerStats = {
  darts: number;
  visits: number;
  targetAttempts: number;
  targetHits: number;
  misses: number;
  wastedDarts: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  validDoubles: number;
  successfulVisits: number;
  failedVisits: number;
  oneHitVisits: number;
  twoHitVisits: number;
  threeHitVisits: number;
  perfectVisits: number;
  pointsWon: number;
  penaltyEvents: number;
  pointsLost: number;
  netPoints: number;
  bestVisit: number;
  bestVisitHits: number;
  currentSuccessStreak: number;
  bestSuccessStreak: number;
  targetsCleared: number;
  lastTargetReached: number;
  eliminatedAtTarget: number | null;
  targets: Record<string, Bobs27TargetStat>;
};

export type Bobs27Visit = {
  id: string;
  createdAt: string;
  round: number;
  target: number;
  targetLabel: string;
  targetValue: number;
  playerId: string;
  teamId: string | null;
  darts: GameDart[];
  labels: string[];
  validHits: number;
  gain: number;
  penalty: number;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
  eliminated: boolean;
};

export type Bobs27Standing = {
  id: string;
  name: string;
  playerIds: string[];
  score: number;
  hits: number;
  visits: number;
  rank: number;
  tied: boolean;
  eliminated: boolean;
};

export type Bobs27State = {
  sport: "darts";
  mode: "bobs_27";
  rules: Bobs27Rules;
  players: Player[];
  teams: Bobs27TeamConfig[];
  teamByPlayer: Record<string, string>;
  turnOrder: string[];
  activePlayerIndex: number;
  roundIndex: number;
  targets: number[];
  scoresByPlayer: Record<string, number>;
  eliminatedByPlayer: Record<string, boolean>;
  statsByPlayer: Record<string, Bobs27PlayerStats>;
  history: Bobs27Visit[];
  standings: Bobs27Standing[];
  winnerIds: string[];
  tied: boolean;
  finished: boolean;
  finishReason: "completed" | "all_eliminated" | null;
  startedAt: number;
  finishedAt?: number;
};

function clampInt(value: any, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

export function bobs27TargetValue(target: number) {
  return target === 25 ? 50 : clampInt(target, 1, 20, 1) * 2;
}

export function bobs27TargetLabel(target: number) {
  return target === 25 ? "DBULL" : `D${target}`;
}

export function bobs27DartLabel(dart: GameDart) {
  if (!dart) return "MISS";
  if (dart.bed === "IB") return "DBULL";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "MISS") return "MISS";
  return `${dart.bed}${dart.number ?? ""}`;
}

export function isBobs27TargetHit(dart: GameDart, target: number) {
  if (!dart) return false;
  if (target === 25) return dart.bed === "IB";
  return dart.bed === "D" && Number(dart.number) === target;
}

function normalizePlayers(players: Player[]) {
  const seen = new Set<string>();
  const clean = (players || []).filter((p: any) => {
    const id = String(p?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return clean.length
    ? clean.map((p: any, index) => ({ id: String(p.id), name: String(p.name || `Joueur ${index + 1}`) }))
    : [{ id: "p1", name: "Joueur 1" }];
}

function normalizeTeams(players: Player[], teams: Bobs27TeamConfig[] = []) {
  const valid = new Set(players.map((p) => p.id));
  const used = new Set<string>();
  return (teams || []).map((team, index) => ({
    ...team,
    id: String(team?.id || `team-${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    playerIds: Array.from(new Set((team?.playerIds || []).map(String))).filter((id) => valid.has(id) && !used.has(id)),
  })).filter((team) => {
    team.playerIds.forEach((id) => used.add(id));
    return team.playerIds.length > 0;
  });
}

export function emptyBobs27Stats(): Bobs27PlayerStats {
  return {
    darts: 0, visits: 0, targetAttempts: 0, targetHits: 0, misses: 0, wastedDarts: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, validDoubles: 0,
    successfulVisits: 0, failedVisits: 0, oneHitVisits: 0, twoHitVisits: 0, threeHitVisits: 0,
    perfectVisits: 0, pointsWon: 0, penaltyEvents: 0, pointsLost: 0, netPoints: 0,
    bestVisit: 0, bestVisitHits: 0, currentSuccessStreak: 0, bestSuccessStreak: 0,
    targetsCleared: 0, lastTargetReached: 0, eliminatedAtTarget: null, targets: {},
  };
}

function buildTargets(startTarget: number, endTarget: number, includeBull: boolean) {
  const start = clampInt(startTarget, 1, 20, 1);
  const end = clampInt(endTarget, start, 20, 20);
  const out = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  if (includeBull) out.push(25);
  return out;
}

function teamMaps(players: Player[], teams: Bobs27TeamConfig[]) {
  const map: Record<string, string> = {};
  teams.forEach((team) => team.playerIds.forEach((id) => { map[id] = team.id; }));
  return map;
}

function entityRows(state: Bobs27State): Omit<Bobs27Standing, "rank" | "tied">[] {
  if (state.rules.participantMode === "teams" && state.teams.length) {
    return state.teams.map((team) => {
      const stats = team.playerIds.map((id) => state.statsByPlayer[id] || emptyBobs27Stats());
      return {
        id: team.id,
        name: team.name,
        playerIds: [...team.playerIds],
        score: team.playerIds.reduce((sum, id) => sum + Number(state.scoresByPlayer[id] || 0), 0),
        hits: stats.reduce((sum, row) => sum + row.targetHits, 0),
        visits: stats.reduce((sum, row) => sum + row.visits, 0),
        eliminated: team.playerIds.every((id) => Boolean(state.eliminatedByPlayer[id])),
      };
    });
  }
  return state.players.map((player) => ({
    id: player.id,
    name: player.name,
    playerIds: [player.id],
    score: Number(state.scoresByPlayer[player.id] || 0),
    hits: state.statsByPlayer[player.id]?.targetHits || 0,
    visits: state.statsByPlayer[player.id]?.visits || 0,
    eliminated: Boolean(state.eliminatedByPlayer[player.id]),
  }));
}

function recalcStandings(state: Bobs27State) {
  const rows = entityRows(state).sort((a, b) =>
    b.score - a.score || b.hits - a.hits || b.visits - a.visits || a.name.localeCompare(b.name, "fr")
  );
  state.standings = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    tied: index > 0 && row.score === rows[index - 1].score && row.hits === rows[index - 1].hits,
  }));
  const best = rows[0];
  state.winnerIds = best ? rows.filter((row) => row.score === best.score && row.hits === best.hits).map((row) => row.id) : [];
  state.tied = state.winnerIds.length > 1;
}

function nextPlayableIndex(state: Bobs27State, fromIndex: number) {
  const len = state.turnOrder.length;
  for (let step = 1; step <= len; step += 1) {
    const idx = (fromIndex + step) % len;
    const id = state.turnOrder[idx];
    if (!state.eliminatedByPlayer[id]) return idx;
  }
  return -1;
}

function currentTarget(state: Bobs27State) {
  return state.targets[Math.max(0, Math.min(state.targets.length - 1, state.roundIndex))] ?? 1;
}

function finish(state: Bobs27State, reason: Bobs27State["finishReason"]) {
  state.finished = true;
  state.finishReason = reason;
  state.finishedAt = Date.now();
  recalcStandings(state);
  return state;
}

export function createBobs27State(
  inputPlayers: Player[],
  rulesInput: Partial<Bobs27Rules> = {},
  inputTeams: Bobs27TeamConfig[] = [],
  turnOrderInput?: string[]
): Bobs27State {
  const players = normalizePlayers(inputPlayers);
  const rules: Bobs27Rules = {
    participantMode: rulesInput.participantMode === "teams" ? "teams" : "players",
    startingScore: clampInt(rulesInput.startingScore, 1, 999, 27),
    startTarget: clampInt(rulesInput.startTarget, 1, 20, 1),
    endTarget: clampInt(rulesInput.endTarget, 1, 20, 20),
    includeBull: rulesInput.includeBull !== false,
    negativeRule: rulesInput.negativeRule === "continue" ? "continue" : "eliminate",
  };
  if (rules.endTarget < rules.startTarget) rules.endTarget = rules.startTarget;
  const teams = normalizeTeams(players, inputTeams);
  const validIds = new Set(players.map((p) => p.id));
  const desired = Array.isArray(turnOrderInput) ? turnOrderInput.map(String).filter((id) => validIds.has(id)) : [];
  const turnOrder = Array.from(new Set([...desired, ...players.map((p) => p.id)]));
  const scoresByPlayer = Object.fromEntries(players.map((p) => [p.id, rules.startingScore]));
  const statsByPlayer = Object.fromEntries(players.map((p) => [p.id, emptyBobs27Stats()]));
  const eliminatedByPlayer = Object.fromEntries(players.map((p) => [p.id, false]));
  const state: Bobs27State = {
    sport: "darts", mode: "bobs_27", rules, players, teams,
    teamByPlayer: teamMaps(players, teams), turnOrder, activePlayerIndex: 0, roundIndex: 0,
    targets: buildTargets(rules.startTarget, rules.endTarget, rules.includeBull),
    scoresByPlayer, eliminatedByPlayer, statsByPlayer, history: [], standings: [], winnerIds: [], tied: false,
    finished: false, finishReason: null, startedAt: Date.now(),
  };
  recalcStandings(state);
  return state;
}

export function cloneBobs27State(state: Bobs27State): Bobs27State {
  return {
    ...state,
    rules: { ...state.rules }, players: state.players.map((p) => ({ ...p })),
    teams: state.teams.map((t) => ({ ...t, playerIds: [...t.playerIds] })),
    teamByPlayer: { ...state.teamByPlayer }, turnOrder: [...state.turnOrder], targets: [...state.targets],
    scoresByPlayer: { ...state.scoresByPlayer }, eliminatedByPlayer: { ...state.eliminatedByPlayer },
    statsByPlayer: Object.fromEntries(Object.entries(state.statsByPlayer).map(([id, row]) => [id, {
      ...row, targets: Object.fromEntries(Object.entries(row.targets).map(([key, value]) => [key, { ...value }]))
    }])),
    history: state.history.map((v) => ({ ...v, darts: v.darts.map((d) => ({ ...d })), labels: [...v.labels] })),
    standings: state.standings.map((r) => ({ ...r, playerIds: [...r.playerIds] })), winnerIds: [...state.winnerIds],
  };
}

export function playBobs27Visit(previous: Bobs27State, dartsInput: GameDart[]): Bobs27State {
  if (previous.finished) return previous;
  const state = cloneBobs27State(previous);
  const playerId = state.turnOrder[state.activePlayerIndex];
  if (!playerId || state.eliminatedByPlayer[playerId]) return state;
  const target = currentTarget(state);
  const targetValue = bobs27TargetValue(target);
  const darts = (dartsInput || []).slice(0, 3).map((dart) => ({ ...dart }));
  while (darts.length < 3) darts.push({ bed: "MISS" });
  const validHits = darts.filter((dart) => isBobs27TargetHit(dart, target)).length;
  const gain = validHits * targetValue;
  const penalty = validHits === 0 ? targetValue : 0;
  const delta = gain - penalty;
  const scoreBefore = Number(state.scoresByPlayer[playerId] || 0);
  const rawAfter = scoreBefore + delta;
  const eliminated = state.rules.negativeRule === "eliminate" && rawAfter < 0;
  const scoreAfter = eliminated ? 0 : rawAfter;
  state.scoresByPlayer[playerId] = scoreAfter;
  if (eliminated) state.eliminatedByPlayer[playerId] = true;

  const stat = state.statsByPlayer[playerId] || emptyBobs27Stats();
  stat.darts += 3;
  stat.visits += 1;
  stat.targetAttempts += 1;
  stat.targetHits += validHits;
  stat.validDoubles += validHits;
  stat.pointsWon += gain;
  stat.pointsLost += penalty;
  stat.netPoints += delta;
  stat.bestVisit = Math.max(stat.bestVisit, gain);
  stat.bestVisitHits = Math.max(stat.bestVisitHits, validHits);
  stat.lastTargetReached = target;
  if (validHits > 0) {
    stat.successfulVisits += 1;
    stat.targetsCleared += 1;
    stat.currentSuccessStreak += 1;
    stat.bestSuccessStreak = Math.max(stat.bestSuccessStreak, stat.currentSuccessStreak);
    if (validHits === 1) stat.oneHitVisits += 1;
    if (validHits === 2) stat.twoHitVisits += 1;
    if (validHits === 3) { stat.threeHitVisits += 1; stat.perfectVisits += 1; }
  } else {
    stat.failedVisits += 1;
    stat.penaltyEvents += 1;
    stat.currentSuccessStreak = 0;
  }
  if (eliminated) stat.eliminatedAtTarget = target;

  darts.forEach((dart) => {
    const valid = isBobs27TargetHit(dart, target);
    if (dart.bed === "S") stat.singles += 1;
    else if (dart.bed === "D") stat.doubles += 1;
    else if (dart.bed === "T") stat.triples += 1;
    else if (dart.bed === "OB") stat.bulls += 1;
    else if (dart.bed === "IB") stat.dbulls += 1;
    else if (dart.bed === "MISS") stat.misses += 1;
    if (!valid) stat.wastedDarts += 1;
  });

  const key = String(target);
  const targetStat = stat.targets[key] || { target, attempts: 0, darts: 0, hits: 0, pointsWon: 0, penaltyLost: 0, bestHits: 0 };
  targetStat.attempts += 1;
  targetStat.darts += 3;
  targetStat.hits += validHits;
  targetStat.pointsWon += gain;
  targetStat.penaltyLost += penalty;
  targetStat.bestHits = Math.max(targetStat.bestHits, validHits);
  stat.targets[key] = targetStat;
  state.statsByPlayer[playerId] = stat;

  state.history.push({
    id: `b27-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), round: state.roundIndex + 1, target, targetLabel: bobs27TargetLabel(target),
    targetValue, playerId, teamId: state.teamByPlayer[playerId] || null, darts, labels: darts.map(bobs27DartLabel),
    validHits, gain, penalty, delta, scoreBefore, scoreAfter, eliminated,
  });

  recalcStandings(state);
  const activeLeft = state.turnOrder.filter((id) => !state.eliminatedByPlayer[id]);
  if (!activeLeft.length) return finish(state, "all_eliminated");

  const currentIndex = state.activePlayerIndex;
  const nextIndex = nextPlayableIndex(state, currentIndex);
  if (nextIndex < 0) return finish(state, "all_eliminated");

  // Le round avance lorsqu'on repasse avant/au premier index actif du cycle.
  const wrapped = nextIndex <= currentIndex;
  if (wrapped) {
    state.roundIndex += 1;
    if (state.roundIndex >= state.targets.length) return finish(state, "completed");
  }
  state.activePlayerIndex = nextIndex;
  recalcStandings(state);
  return state;
}

export function getBobs27ActivePlayerId(state: Bobs27State) {
  return state.turnOrder[state.activePlayerIndex] || state.players[0]?.id || "";
}

export function getBobs27CurrentTarget(state: Bobs27State) {
  return currentTarget(state);
}
