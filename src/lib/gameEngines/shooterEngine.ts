// =============================================================
// SHOOTER — moteur pur
// Course de précision sur une séquence de cibles.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type ShooterParticipantMode = "players" | "teams";
export type ShooterScoreInputMethod = "keypad" | "dartboard";
export type ShooterSequencePreset = "classic" | "around" | "pro" | "random";
export type ShooterPenaltyRule = "none" | "score" | "progress";
export type ShooterHitZone = "any" | "single" | "double" | "triple";
export type ShooterBotLevel = "easy" | "normal" | "hard";

export type ShooterTeamConfig = {
  id: string;
  name: string;
  color?: string | null;
  logoDataUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type ShooterConfigPayload = {
  mode: "shooter";
  participantMode: ShooterParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: ShooterTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: ShooterBotLevel;
  sequencePreset: ShooterSequencePreset;
  randomTargetCount: number;
  includeBull: boolean;
  hitZone: ShooterHitZone;
  marksToClear: 1 | 2 | 3 | 4 | 5 | 6;
  maxRounds: number;
  penaltyRule: ShooterPenaltyRule;
  randomOrder: boolean;
  scoreInputMethod: ShooterScoreInputMethod;
};

export type ShooterRules = Pick<
  ShooterConfigPayload,
  "participantMode" | "sequencePreset" | "randomTargetCount" | "includeBull" | "hitZone" | "marksToClear" | "maxRounds" | "penaltyRule"
>;

export type ShooterTargetStat = {
  target: number;
  attempts: number;
  darts: number;
  validDarts: number;
  marks: number;
  marksApplied: number;
  points: number;
  clears: number;
  bestVisitMarks: number;
  bestVisitPoints: number;
};

export type ShooterPlayerStats = {
  darts: number;
  visits: number;
  targetAttempts: number;
  validDarts: number;
  invalidDarts: number;
  marks: number;
  marksApplied: number;
  points: number;
  netPoints: number;
  penaltyEvents: number;
  penaltyPoints: number;
  progressPenalties: number;
  targetClearCredits: number;
  successfulVisits: number;
  failedVisits: number;
  oneHitVisits: number;
  twoHitVisits: number;
  threeHitVisits: number;
  perfectVisits: number;
  firstDartHits: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  bestVisitMarks: number;
  bestVisitPoints: number;
  currentHitStreak: number;
  bestHitStreak: number;
  currentSuccessVisitStreak: number;
  bestSuccessVisitStreak: number;
  lastTargetReached: number | null;
  targets: Record<string, ShooterTargetStat>;
};

export type ShooterEntityProgress = {
  id: string;
  name: string;
  playerIds: string[];
  targetIndex: number;
  marksOnTarget: number;
  score: number;
  completed: boolean;
  completedAtVisit: number | null;
};

export type ShooterVisit = {
  id: string;
  createdAt: string;
  round: number;
  playerId: string;
  teamId: string | null;
  entityId: string;
  target: number;
  targetLabel: string;
  darts: GameDart[];
  labels: string[];
  validDarts: number;
  rawMarks: number;
  appliedMarks: number;
  points: number;
  penalty: number;
  progressPenalty: number;
  entityScoreBefore: number;
  entityScoreAfter: number;
  marksBefore: number;
  marksAfter: number;
  targetIndexBefore: number;
  targetIndexAfter: number;
  clearedTarget: boolean;
  completed: boolean;
};

export type ShooterStanding = {
  id: string;
  name: string;
  playerIds: string[];
  rank: number;
  tied: boolean;
  targetIndex: number;
  marksOnTarget: number;
  targetsCleared: number;
  score: number;
  hits: number;
  marks: number;
  visits: number;
  accuracy: number;
  completed: boolean;
};

export type ShooterState = {
  sport: "darts";
  mode: "shooter";
  rules: ShooterRules;
  players: Player[];
  teams: ShooterTeamConfig[];
  teamByPlayer: Record<string, string | null>;
  entityByPlayer: Record<string, string>;
  turnOrder: string[];
  activePlayerIndex: number;
  roundIndex: number;
  sequence: number[];
  entities: Record<string, ShooterEntityProgress>;
  statsByPlayer: Record<string, ShooterPlayerStats>;
  history: ShooterVisit[];
  standings: ShooterStanding[];
  winnerIds: string[];
  tied: boolean;
  finished: boolean;
  finishReason: "completed" | "round_limit" | null;
  startedAt: number;
  finishedAt?: number;
};

const CLASSIC = [20, 19, 18, 17, 16, 15];
const PRO = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2];

function clampInt(value: any, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function normalizePlayers(input: Player[]): Player[] {
  const seen = new Set<string>();
  const out: Player[] = [];
  (input || []).forEach((raw: any, index) => {
    const id = String(raw?.id || raw?.profileId || `p${index + 1}`);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, name: String(raw?.name || raw?.displayName || `Joueur ${index + 1}`) });
  });
  return out.length ? out : [{ id: "p1", name: "Joueur 1" }];
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildShooterSequence(rules: Partial<ShooterRules>): number[] {
  const preset: ShooterSequencePreset = rules.sequencePreset === "around" || rules.sequencePreset === "pro" || rules.sequencePreset === "random" ? rules.sequencePreset : "classic";
  const includeBull = rules.hitZone === "triple" ? false : rules.includeBull !== false;
  let sequence: number[];
  if (preset === "around") sequence = Array.from({ length: 20 }, (_, i) => i + 1);
  else if (preset === "pro") sequence = [...PRO];
  else if (preset === "random") sequence = shuffle(Array.from({ length: 20 }, (_, i) => i + 1)).slice(0, clampInt(rules.randomTargetCount, 3, 20, 10));
  else sequence = [...CLASSIC];
  if (includeBull) sequence.push(25);
  return sequence;
}

function normalizeTeams(players: Player[], inputTeams: ShooterTeamConfig[]): ShooterTeamConfig[] {
  const playerIds = new Set(players.map((p) => p.id));
  const seenPlayers = new Set<string>();
  const out: ShooterTeamConfig[] = [];
  (inputTeams || []).forEach((team: any, index) => {
    const ids = Array.from(new Set((Array.isArray(team?.playerIds) ? team.playerIds : []).map(String)))
      .filter((id) => playerIds.has(id) && !seenPlayers.has(id));
    if (!ids.length) return;
    ids.forEach((id) => seenPlayers.add(id));
    out.push({
      id: String(team?.id || `team-${index + 1}`),
      name: String(team?.name || `Équipe ${index + 1}`),
      color: team?.color || null,
      logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
      playerIds: ids,
      isBotTeam: Boolean(team?.isBotTeam),
    });
  });
  return out;
}

export function emptyShooterStats(): ShooterPlayerStats {
  return {
    darts: 0, visits: 0, targetAttempts: 0, validDarts: 0, invalidDarts: 0,
    marks: 0, marksApplied: 0, points: 0, netPoints: 0,
    penaltyEvents: 0, penaltyPoints: 0, progressPenalties: 0, targetClearCredits: 0,
    successfulVisits: 0, failedVisits: 0, oneHitVisits: 0, twoHitVisits: 0, threeHitVisits: 0, perfectVisits: 0, firstDartHits: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    bestVisitMarks: 0, bestVisitPoints: 0, currentHitStreak: 0, bestHitStreak: 0,
    currentSuccessVisitStreak: 0, bestSuccessVisitStreak: 0, lastTargetReached: null,
    targets: {},
  };
}

export function shooterTargetLabel(target: number) {
  return target === 25 ? "BULL" : String(target);
}

export function shooterDartLabel(dart: GameDart) {
  if (!dart) return "MISS";
  if (dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number || ""}`;
}

function bedMarks(dart: GameDart) {
  if (dart.bed === "T") return 3;
  if (dart.bed === "D" || dart.bed === "IB") return 2;
  if (dart.bed === "S" || dart.bed === "OB") return 1;
  return 0;
}

function dartScore(dart: GameDart) {
  if (dart.bed === "IB") return 50;
  if (dart.bed === "OB") return 25;
  if (dart.bed === "MISS") return 0;
  const n = clampInt(dart.number, 1, 20, 1);
  return n * (dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1);
}

export function isShooterTargetHit(dart: GameDart, target: number, zone: ShooterHitZone) {
  if (!dart || dart.bed === "MISS") return false;
  if (target === 25) {
    if (zone === "triple") return false;
    if (zone === "double") return dart.bed === "IB";
    if (zone === "single") return dart.bed === "OB";
    return dart.bed === "OB" || dart.bed === "IB";
  }
  if (dart.number !== target) return false;
  if (zone === "single") return dart.bed === "S";
  if (zone === "double") return dart.bed === "D";
  if (zone === "triple") return dart.bed === "T";
  return dart.bed === "S" || dart.bed === "D" || dart.bed === "T";
}

function entityMaps(players: Player[], teams: ShooterTeamConfig[], participantMode: ShooterParticipantMode) {
  const teamByPlayer: Record<string, string | null> = Object.fromEntries(players.map((p) => [p.id, null]));
  teams.forEach((team) => team.playerIds.forEach((id) => { if (id in teamByPlayer) teamByPlayer[id] = team.id; }));
  const entityByPlayer: Record<string, string> = {};
  players.forEach((p) => { entityByPlayer[p.id] = participantMode === "teams" && teamByPlayer[p.id] ? String(teamByPlayer[p.id]) : p.id; });
  return { teamByPlayer, entityByPlayer };
}

function createEntities(players: Player[], teams: ShooterTeamConfig[], participantMode: ShooterParticipantMode, entityByPlayer: Record<string, string>) {
  const entities: Record<string, ShooterEntityProgress> = {};
  if (participantMode === "teams") {
    teams.forEach((team) => {
      entities[team.id] = { id: team.id, name: team.name, playerIds: [...team.playerIds], targetIndex: 0, marksOnTarget: 0, score: 0, completed: false, completedAtVisit: null };
    });
  }
  players.forEach((player) => {
    const eid = entityByPlayer[player.id];
    if (!entities[eid]) entities[eid] = { id: eid, name: player.name, playerIds: [player.id], targetIndex: 0, marksOnTarget: 0, score: 0, completed: false, completedAtVisit: null };
  });
  return entities;
}

function aggregateEntityStats(state: ShooterState, entity: ShooterEntityProgress) {
  const rows = entity.playerIds.map((id) => state.statsByPlayer[id] || emptyShooterStats());
  const darts = rows.reduce((a, r) => a + r.darts, 0);
  const hits = rows.reduce((a, r) => a + r.validDarts, 0);
  return {
    hits,
    marks: rows.reduce((a, r) => a + r.marks, 0),
    visits: rows.reduce((a, r) => a + r.visits, 0),
    accuracy: darts ? Math.round((hits / darts) * 1000) / 10 : 0,
  };
}

function standingsKey(row: Omit<ShooterStanding, "rank" | "tied">) {
  return [row.completed ? 1 : 0, row.targetIndex, row.marksOnTarget, row.score, row.accuracy];
}

function recalcStandings(state: ShooterState) {
  const rows: Omit<ShooterStanding, "rank" | "tied">[] = Object.values(state.entities).map((entity) => {
    const agg = aggregateEntityStats(state, entity);
    return {
      id: entity.id, name: entity.name, playerIds: [...entity.playerIds], targetIndex: entity.targetIndex,
      marksOnTarget: entity.marksOnTarget, targetsCleared: Math.min(entity.targetIndex, state.sequence.length), score: entity.score,
      hits: agg.hits, marks: agg.marks, visits: agg.visits, accuracy: agg.accuracy, completed: entity.completed,
    };
  });
  rows.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    const ea = state.entities[a.id], eb = state.entities[b.id];
    if (a.completed && b.completed && ea.completedAtVisit !== eb.completedAtVisit) return Number(ea.completedAtVisit ?? 1e9) - Number(eb.completedAtVisit ?? 1e9);
    return b.targetIndex - a.targetIndex || b.marksOnTarget - a.marksOnTarget || b.score - a.score || b.accuracy - a.accuracy || a.name.localeCompare(b.name, "fr");
  });
  state.standings = rows.map((row, index) => {
    const prev = rows[index - 1];
    const tied = Boolean(prev) && standingsKey(row).every((v, i) => v === standingsKey(prev)[i]);
    return { ...row, rank: index + 1, tied };
  });
  const best = rows[0];
  if (!best) { state.winnerIds = []; state.tied = false; return; }
  const bestKey = standingsKey(best);
  state.winnerIds = rows.filter((row) => standingsKey(row).every((v, i) => v === bestKey[i])).map((row) => row.id);
  state.tied = state.winnerIds.length > 1;
}

function finish(state: ShooterState, reason: ShooterState["finishReason"]) {
  state.finished = true;
  state.finishReason = reason;
  state.finishedAt = Date.now();
  recalcStandings(state);
  return state;
}

export function createShooterState(
  inputPlayers: Player[],
  rulesInput: Partial<ShooterRules> = {},
  inputTeams: ShooterTeamConfig[] = [],
  turnOrderInput?: string[]
): ShooterState {
  const players = normalizePlayers(inputPlayers);
  const hitZone: ShooterHitZone = rulesInput.hitZone === "single" || rulesInput.hitZone === "double" || rulesInput.hitZone === "triple" ? rulesInput.hitZone : "any";
  const rules: ShooterRules = {
    participantMode: rulesInput.participantMode === "teams" ? "teams" : "players",
    sequencePreset: rulesInput.sequencePreset === "around" || rulesInput.sequencePreset === "pro" || rulesInput.sequencePreset === "random" ? rulesInput.sequencePreset : "classic",
    randomTargetCount: clampInt(rulesInput.randomTargetCount, 3, 20, 10),
    includeBull: hitZone === "triple" ? false : rulesInput.includeBull !== false,
    hitZone,
    marksToClear: clampInt(rulesInput.marksToClear, 1, 6, 3) as ShooterRules["marksToClear"],
    maxRounds: clampInt(rulesInput.maxRounds, 0, 99, 15),
    penaltyRule: rulesInput.penaltyRule === "score" || rulesInput.penaltyRule === "progress" ? rulesInput.penaltyRule : "none",
  };
  const teams = normalizeTeams(players, inputTeams);
  const { teamByPlayer, entityByPlayer } = entityMaps(players, teams, rules.participantMode);
  const validIds = new Set(players.map((p) => p.id));
  const desired = Array.isArray(turnOrderInput) ? turnOrderInput.map(String).filter((id) => validIds.has(id)) : [];
  const turnOrder = Array.from(new Set([...desired, ...players.map((p) => p.id)]));
  const sequence = buildShooterSequence(rules);
  const state: ShooterState = {
    sport: "darts", mode: "shooter", rules, players, teams, teamByPlayer, entityByPlayer,
    turnOrder, activePlayerIndex: 0, roundIndex: 0, sequence,
    entities: createEntities(players, teams, rules.participantMode, entityByPlayer),
    statsByPlayer: Object.fromEntries(players.map((p) => [p.id, emptyShooterStats()])),
    history: [], standings: [], winnerIds: [], tied: false, finished: false, finishReason: null, startedAt: Date.now(),
  };
  recalcStandings(state);
  return state;
}

export function cloneShooterState(state: ShooterState): ShooterState {
  return {
    ...state,
    rules: { ...state.rules },
    players: state.players.map((p) => ({ ...p })),
    teams: state.teams.map((team) => ({ ...team, playerIds: [...team.playerIds] })),
    teamByPlayer: { ...state.teamByPlayer }, entityByPlayer: { ...state.entityByPlayer }, turnOrder: [...state.turnOrder], sequence: [...state.sequence],
    entities: Object.fromEntries(Object.entries(state.entities).map(([id, e]) => [id, { ...e, playerIds: [...e.playerIds] }])),
    statsByPlayer: Object.fromEntries(Object.entries(state.statsByPlayer).map(([id, row]) => [id, { ...row, targets: Object.fromEntries(Object.entries(row.targets).map(([key, val]) => [key, { ...val }])) }])),
    history: state.history.map((v) => ({ ...v, darts: v.darts.map((d) => ({ ...d })), labels: [...v.labels] })),
    standings: state.standings.map((r) => ({ ...r, playerIds: [...r.playerIds] })), winnerIds: [...state.winnerIds],
  };
}

export function getShooterActivePlayerId(state: ShooterState) {
  return state.turnOrder[state.activePlayerIndex] || state.players[0]?.id || "";
}

export function getShooterActiveEntity(state: ShooterState) {
  const pid = getShooterActivePlayerId(state);
  return state.entities[state.entityByPlayer[pid]] || Object.values(state.entities)[0];
}

export function getShooterCurrentTarget(state: ShooterState) {
  const entity = getShooterActiveEntity(state);
  return state.sequence[Math.max(0, Math.min(state.sequence.length - 1, entity?.targetIndex || 0))] ?? 20;
}

export function playShooterVisit(previous: ShooterState, dartsInput: GameDart[]): ShooterState {
  if (previous.finished) return previous;
  const state = cloneShooterState(previous);
  const playerId = getShooterActivePlayerId(state);
  const entityId = state.entityByPlayer[playerId];
  const entity = state.entities[entityId];
  if (!playerId || !entity || entity.completed) return state;

  const target = state.sequence[Math.max(0, Math.min(state.sequence.length - 1, entity.targetIndex))] ?? 20;
  const darts = (dartsInput || []).slice(0, 3).map((d) => ({ ...d }));
  while (darts.length < 3) darts.push({ bed: "MISS" });

  const targetIndexBefore = entity.targetIndex;
  const marksBefore = entity.marksOnTarget;
  const entityScoreBefore = entity.score;
  let validDarts = 0;
  let rawMarks = 0;
  let points = 0;
  darts.forEach((dart) => {
    if (!isShooterTargetHit(dart, target, state.rules.hitZone)) return;
    validDarts += 1;
    rawMarks += bedMarks(dart);
    points += dartScore(dart);
  });
  const needed = Math.max(0, state.rules.marksToClear - entity.marksOnTarget);
  const appliedMarks = Math.min(needed, rawMarks);
  entity.marksOnTarget += appliedMarks;
  entity.score += points;

  let penalty = 0;
  let progressPenalty = 0;
  if (validDarts === 0) {
    if (state.rules.penaltyRule === "score") {
      penalty = target === 25 ? 25 : target;
      entity.score = Math.max(0, entity.score - penalty);
    } else if (state.rules.penaltyRule === "progress") {
      progressPenalty = Math.min(1, entity.marksOnTarget);
      entity.marksOnTarget = Math.max(0, entity.marksOnTarget - progressPenalty);
    }
  }

  let clearedTarget = false;
  if (entity.marksOnTarget >= state.rules.marksToClear) {
    clearedTarget = true;
    entity.targetIndex += 1;
    entity.marksOnTarget = 0;
    if (entity.targetIndex >= state.sequence.length) {
      entity.completed = true;
      entity.completedAtVisit = state.history.length + 1;
    }
  }

  const stats = state.statsByPlayer[playerId] || emptyShooterStats();
  stats.darts += 3;
  stats.visits += 1;
  stats.targetAttempts += 1;
  stats.validDarts += validDarts;
  stats.invalidDarts += 3 - validDarts;
  stats.marks += rawMarks;
  stats.marksApplied += appliedMarks;
  stats.points += points;
  stats.penaltyEvents += validDarts === 0 && state.rules.penaltyRule !== "none" ? 1 : 0;
  stats.penaltyPoints += penalty;
  stats.progressPenalties += progressPenalty;
  stats.netPoints += points - penalty;
  stats.lastTargetReached = target;
  stats.bestVisitMarks = Math.max(stats.bestVisitMarks, rawMarks);
  stats.bestVisitPoints = Math.max(stats.bestVisitPoints, points);
  if (clearedTarget) stats.targetClearCredits += 1;
  if (validDarts > 0) {
    stats.successfulVisits += 1;
    stats.currentSuccessVisitStreak += 1;
    stats.bestSuccessVisitStreak = Math.max(stats.bestSuccessVisitStreak, stats.currentSuccessVisitStreak);
    if (validDarts === 1) stats.oneHitVisits += 1;
    if (validDarts === 2) stats.twoHitVisits += 1;
    if (validDarts === 3) { stats.threeHitVisits += 1; stats.perfectVisits += 1; }
    if (isShooterTargetHit(darts[0], target, state.rules.hitZone)) stats.firstDartHits += 1;
  } else {
    stats.failedVisits += 1;
    stats.currentSuccessVisitStreak = 0;
  }
  darts.forEach((dart) => {
    const valid = isShooterTargetHit(dart, target, state.rules.hitZone);
    if (dart.bed === "S") stats.singles += 1;
    else if (dart.bed === "D") stats.doubles += 1;
    else if (dart.bed === "T") stats.triples += 1;
    else if (dart.bed === "OB") stats.bulls += 1;
    else if (dart.bed === "IB") stats.dbulls += 1;
    else if (dart.bed === "MISS") stats.misses += 1;
    if (valid) {
      stats.currentHitStreak += 1;
      stats.bestHitStreak = Math.max(stats.bestHitStreak, stats.currentHitStreak);
    } else stats.currentHitStreak = 0;
  });
  const key = String(target);
  const targetStat = stats.targets[key] || { target, attempts: 0, darts: 0, validDarts: 0, marks: 0, marksApplied: 0, points: 0, clears: 0, bestVisitMarks: 0, bestVisitPoints: 0 };
  targetStat.attempts += 1;
  targetStat.darts += 3;
  targetStat.validDarts += validDarts;
  targetStat.marks += rawMarks;
  targetStat.marksApplied += appliedMarks;
  targetStat.points += points;
  targetStat.clears += clearedTarget ? 1 : 0;
  targetStat.bestVisitMarks = Math.max(targetStat.bestVisitMarks, rawMarks);
  targetStat.bestVisitPoints = Math.max(targetStat.bestVisitPoints, points);
  stats.targets[key] = targetStat;
  state.statsByPlayer[playerId] = stats;

  state.history.push({
    id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), round: state.roundIndex + 1, playerId,
    teamId: state.teamByPlayer[playerId] || null, entityId, target, targetLabel: shooterTargetLabel(target),
    darts, labels: darts.map(shooterDartLabel), validDarts, rawMarks, appliedMarks, points, penalty, progressPenalty,
    entityScoreBefore, entityScoreAfter: entity.score, marksBefore, marksAfter: entity.marksOnTarget,
    targetIndexBefore, targetIndexAfter: entity.targetIndex, clearedTarget, completed: entity.completed,
  });

  recalcStandings(state);
  if (entity.completed) {
    state.winnerIds = [entity.id];
    state.tied = false;
    return finish(state, "completed");
  }

  const currentIndex = state.activePlayerIndex;
  state.activePlayerIndex = (currentIndex + 1) % Math.max(1, state.turnOrder.length);
  if (state.activePlayerIndex <= currentIndex) {
    state.roundIndex += 1;
    if (state.rules.maxRounds > 0 && state.roundIndex >= state.rules.maxRounds) return finish(state, "round_limit");
  }
  recalcStandings(state);
  return state;
}
