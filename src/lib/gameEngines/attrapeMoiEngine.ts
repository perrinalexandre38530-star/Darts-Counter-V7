// =============================================================
// ATTRAPE-MOI SI TU PEUX ! — moteur pur
// Poursuite score cumulatif avec rôles Fuyard / Chasseur alternés.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type CatchMeParticipantMode = "players" | "teams";
export type CatchMeScoreInputMethod = "keypad" | "dartboard";
export type CatchMeBotLevel = "easy" | "normal" | "hard";
export type CatchMeStartingRunner = "first" | "second" | "random";
export type CatchMeRole = "runner" | "chaser";

export type CatchMeTeamConfig = {
  id: string;
  name: string;
  color?: string | null;
  logoDataUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type CatchMeConfigPayload = {
  mode: "attrape_moi";
  participantMode: CatchMeParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: CatchMeTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: CatchMeBotLevel;
  headStart: number;
  pursuitRounds: number;
  legsBestOf: 3 | 5 | 7;
  setsBestOf: 1 | 3 | 5 | 7;
  startingRunner: CatchMeStartingRunner;
  scoreInputMethod: CatchMeScoreInputMethod;
};

export type CatchMeRules = Pick<
  CatchMeConfigPayload,
  "participantMode" | "headStart" | "pursuitRounds" | "legsBestOf" | "setsBestOf"
>;

export type CatchMePlayerStats = {
  darts: number;
  visits: number;
  points: number;
  bestVisit: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  runnerDarts: number;
  runnerVisits: number;
  runnerPoints: number;
  runnerBestVisit: number;
  chaserDarts: number;
  chaserVisits: number;
  chaserPoints: number;
  chaserBestVisit: number;
  captureCredits: number;
  escapeCredits: number;
  legsWon: number;
  setsWon: number;
};

export type CatchMeEntityStats = {
  id: string;
  name: string;
  playerIds: string[];
  legsWon: number;
  setsWon: number;
  runnerLegWins: number;
  chaserLegWins: number;
  captures: number;
  escapes: number;
  captureRoundsTotal: number;
  fastestCaptureRound: number | null;
  latestCaptureRound: number | null;
  runnerLegs: number;
  chaserLegs: number;
  runnerPoints: number;
  chaserPoints: number;
  maxRunnerLead: number;
  finalEscapeLeadTotal: number;
  bestEscapeLead: number;
  closestChaseGap: number | null;
};

export type CatchMeVisit = {
  id: string;
  createdAt: string;
  setNo: number;
  legNo: number;
  globalLegNo: number;
  pursuitRound: number;
  role: CatchMeRole;
  entityId: string;
  playerId: string;
  teamId: string | null;
  darts: GameDart[];
  labels: string[];
  score: number;
  entityScoreBefore: number;
  entityScoreAfter: number;
  runnerScoreAfter: number;
  chaserScoreAfter: number;
  distanceAfter: number;
  captured: boolean;
};

export type CatchMeLegResult = {
  setNo: number;
  legNo: number;
  globalLegNo: number;
  runnerEntityId: string;
  chaserEntityId: string;
  winnerEntityId: string;
  winnerRole: CatchMeRole;
  reason: "capture" | "escape";
  pursuitRound: number;
  runnerScore: number;
  chaserScore: number;
  finalDistance: number;
  headStart: number;
  dartsInLeg: number;
  visitsInLeg: number;
  setWonBy?: string | null;
  matchWonBy?: string | null;
};

export type CatchMeState = {
  sport: "darts";
  mode: "attrape_moi";
  rules: CatchMeRules;
  players: Player[];
  teams: CatchMeTeamConfig[];
  teamByPlayer: Record<string, string | null>;
  entityByPlayer: Record<string, string>;
  entities: Record<string, { id: string; name: string; playerIds: string[] }>;
  entityOrder: [string, string];
  runnerEntityId: string;
  chaserEntityId: string;
  phase: CatchMeRole;
  phaseMemberIndex: number;
  activePlayerId: string;
  pursuitRound: number;
  setNo: number;
  legNo: number;
  globalLegNo: number;
  entityScores: Record<string, number>;
  legWins: Record<string, number>;
  setWins: Record<string, number>;
  playerStats: Record<string, CatchMePlayerStats>;
  entityStats: Record<string, CatchMeEntityStats>;
  history: CatchMeVisit[];
  legResults: CatchMeLegResult[];
  awaitingNextLeg: boolean;
  finished: boolean;
  winnerEntityId: string | null;
  lastLegResult: CatchMeLegResult | null;
  startedAt: number;
  finishedAt?: number;
};

function clampInt(value: any, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

export function catchMeDartScore(dart: GameDart): number {
  if (!dart || dart.bed === "MISS") return 0;
  if (dart.bed === "IB") return 50;
  if (dart.bed === "OB") return 25;
  const n = clampInt(dart.number, 1, 20, 1);
  return n * (dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1);
}

export function catchMeDartLabel(dart: GameDart): string {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "IB") return "DBULL";
  if (dart.bed === "OB") return "BULL";
  return `${dart.bed}${dart.number || ""}`;
}

export function emptyCatchMePlayerStats(): CatchMePlayerStats {
  return {
    darts: 0, visits: 0, points: 0, bestVisit: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    runnerDarts: 0, runnerVisits: 0, runnerPoints: 0, runnerBestVisit: 0,
    chaserDarts: 0, chaserVisits: 0, chaserPoints: 0, chaserBestVisit: 0,
    captureCredits: 0, escapeCredits: 0, legsWon: 0, setsWon: 0,
  };
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
  return out;
}

function normalizeTeams(players: Player[], inputTeams: CatchMeTeamConfig[]): CatchMeTeamConfig[] {
  const validIds = new Set(players.map((p) => p.id));
  const used = new Set<string>();
  const out: CatchMeTeamConfig[] = [];
  (inputTeams || []).forEach((team: any, index) => {
    const ids: string[] = Array.from(new Set<string>(
      (Array.isArray(team?.playerIds) ? team.playerIds : []).map((id: any) => String(id))
    )).filter((id: string) => validIds.has(id) && !used.has(id));
    if (!ids.length) return;
    ids.forEach((id) => used.add(id));
    out.push({
      id: String(team?.id || `team-${index + 1}`),
      name: String(team?.name || `Équipe ${index + 1}`),
      color: team?.color || null,
      logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
      playerIds: ids,
      isBotTeam: Boolean(team?.isBotTeam),
    });
  });
  return out.slice(0, 2);
}

function buildEntityData(players: Player[], teams: CatchMeTeamConfig[], participantMode: CatchMeParticipantMode) {
  const teamByPlayer: Record<string, string | null> = Object.fromEntries(players.map((p) => [p.id, null]));
  teams.forEach((team) => team.playerIds.forEach((id) => { if (id in teamByPlayer) teamByPlayer[id] = team.id; }));
  const entityByPlayer: Record<string, string> = {};
  const entities: CatchMeState["entities"] = {};
  if (participantMode === "teams") {
    teams.forEach((team) => {
      entities[team.id] = { id: team.id, name: team.name, playerIds: [...team.playerIds] };
      team.playerIds.forEach((id) => { entityByPlayer[id] = team.id; });
    });
  } else {
    players.slice(0, 2).forEach((player) => {
      entities[player.id] = { id: player.id, name: player.name, playerIds: [player.id] };
      entityByPlayer[player.id] = player.id;
    });
  }
  return { teamByPlayer, entityByPlayer, entities };
}

function newEntityStats(entity: { id: string; name: string; playerIds: string[] }): CatchMeEntityStats {
  return {
    id: entity.id, name: entity.name, playerIds: [...entity.playerIds], legsWon: 0, setsWon: 0,
    runnerLegWins: 0, chaserLegWins: 0, captures: 0, escapes: 0, captureRoundsTotal: 0,
    fastestCaptureRound: null, latestCaptureRound: null, runnerLegs: 0, chaserLegs: 0,
    runnerPoints: 0, chaserPoints: 0, maxRunnerLead: 0, finalEscapeLeadTotal: 0,
    bestEscapeLead: 0, closestChaseGap: null,
  };
}

function firstActivePlayer(entities: CatchMeState["entities"], entityId: string): string {
  return entities[entityId]?.playerIds?.[0] || "";
}

function roleEntityId(state: CatchMeState, role: CatchMeRole): string {
  return role === "runner" ? state.runnerEntityId : state.chaserEntityId;
}

function scoreDistance(state: CatchMeState): number {
  return Number(state.entityScores[state.runnerEntityId] || 0) - Number(state.entityScores[state.chaserEntityId] || 0);
}

function minToWin(bestOf: number): number { return Math.floor(bestOf / 2) + 1; }

export function createCatchMeState(
  inputPlayers: Player[],
  inputRules: Partial<CatchMeRules>,
  inputTeams: CatchMeTeamConfig[] = [],
  orderedIds: string[] = [],
  startingRunner: CatchMeStartingRunner = "first",
): CatchMeState {
  const playersAll = normalizePlayers(inputPlayers);
  const participantMode: CatchMeParticipantMode = inputRules.participantMode === "teams" ? "teams" : "players";
  const teams = participantMode === "teams" ? normalizeTeams(playersAll, inputTeams) : [];

  let players: Player[];
  if (participantMode === "teams") {
    const used = new Set(teams.flatMap((t) => t.playerIds));
    players = playersAll.filter((p) => used.has(p.id));
  } else {
    const preferred = orderedIds.length ? orderedIds.map(String) : playersAll.map((p) => p.id);
    const byId = new Map(playersAll.map((p) => [p.id, p]));
    players = preferred.map((id) => byId.get(id)).filter(Boolean) as Player[];
    if (players.length < 2) players = playersAll.slice(0, 2);
    players = players.slice(0, 2);
  }

  const { teamByPlayer, entityByPlayer, entities } = buildEntityData(players, teams, participantMode);
  const ids = participantMode === "teams" ? teams.map((t) => t.id) : players.map((p) => p.id);
  if (ids.length < 2) throw new Error("ATTRAPE-MOI SI TU PEUX nécessite exactement deux camps.");
  const entityOrder: [string, string] = [ids[0], ids[1]];
  let runnerEntityId = entityOrder[0];
  if (startingRunner === "second") runnerEntityId = entityOrder[1];
  if (startingRunner === "random") runnerEntityId = Math.random() < .5 ? entityOrder[0] : entityOrder[1];
  const chaserEntityId = runnerEntityId === entityOrder[0] ? entityOrder[1] : entityOrder[0];

  const rules: CatchMeRules = {
    participantMode,
    headStart: clampInt(inputRules.headStart, 0, 2000, 100),
    pursuitRounds: clampInt(inputRules.pursuitRounds, 1, 99, 10),
    legsBestOf: ([3, 5, 7].includes(Number(inputRules.legsBestOf)) ? Number(inputRules.legsBestOf) : 3) as 3 | 5 | 7,
    setsBestOf: ([1, 3, 5, 7].includes(Number(inputRules.setsBestOf)) ? Number(inputRules.setsBestOf) : 3) as 1 | 3 | 5 | 7,
  };

  const playerStats: Record<string, CatchMePlayerStats> = {};
  players.forEach((p) => { playerStats[p.id] = emptyCatchMePlayerStats(); });
  const entityStats: Record<string, CatchMeEntityStats> = {};
  Object.values(entities).forEach((e) => { entityStats[e.id] = newEntityStats(e); });
  entityStats[runnerEntityId].runnerLegs += 1;
  entityStats[chaserEntityId].chaserLegs += 1;

  const entityScores = Object.fromEntries(entityOrder.map((id) => [id, id === runnerEntityId ? rules.headStart : 0]));
  const legWins = Object.fromEntries(entityOrder.map((id) => [id, 0]));
  const setWins = Object.fromEntries(entityOrder.map((id) => [id, 0]));

  return {
    sport: "darts", mode: "attrape_moi", rules, players, teams, teamByPlayer, entityByPlayer, entities, entityOrder,
    runnerEntityId, chaserEntityId, phase: "runner", phaseMemberIndex: 0,
    activePlayerId: firstActivePlayer(entities, runnerEntityId), pursuitRound: 1,
    setNo: 1, legNo: 1, globalLegNo: 1, entityScores, legWins, setWins,
    playerStats, entityStats, history: [], legResults: [], awaitingNextLeg: false,
    finished: false, winnerEntityId: null, lastLegResult: null, startedAt: Date.now(),
  };
}

function updateDartBreakdown(stats: CatchMePlayerStats, darts: GameDart[]) {
  for (const dart of darts) {
    if (!dart || dart.bed === "MISS") stats.misses += 1;
    else if (dart.bed === "S") stats.singles += 1;
    else if (dart.bed === "D") stats.doubles += 1;
    else if (dart.bed === "T") stats.triples += 1;
    else if (dart.bed === "OB") stats.bulls += 1;
    else if (dart.bed === "IB") stats.dbulls += 1;
  }
}

function finishLeg(state: CatchMeState, winnerEntityId: string, reason: "capture" | "escape", catchingPlayerId?: string | null): CatchMeState {
  const next = cloneCatchMeState(state);
  const winnerRole: CatchMeRole = winnerEntityId === next.runnerEntityId ? "runner" : "chaser";
  const runnerScore = Number(next.entityScores[next.runnerEntityId] || 0);
  const chaserScore = Number(next.entityScores[next.chaserEntityId] || 0);
  const finalDistance = runnerScore - chaserScore;

  next.legWins[winnerEntityId] = Number(next.legWins[winnerEntityId] || 0) + 1;
  const es = next.entityStats[winnerEntityId];
  es.legsWon += 1;
  if (winnerRole === "runner") {
    es.runnerLegWins += 1; es.escapes += 1;
    es.finalEscapeLeadTotal += Math.max(0, finalDistance);
    es.bestEscapeLead = Math.max(es.bestEscapeLead, Math.max(0, finalDistance));
    const members = next.entities[winnerEntityId]?.playerIds || [];
    members.forEach((id) => { if (next.playerStats[id]) next.playerStats[id].escapeCredits += 1; });
  } else {
    es.chaserLegWins += 1; es.captures += 1; es.captureRoundsTotal += next.pursuitRound;
    es.fastestCaptureRound = es.fastestCaptureRound == null ? next.pursuitRound : Math.min(es.fastestCaptureRound, next.pursuitRound);
    es.latestCaptureRound = es.latestCaptureRound == null ? next.pursuitRound : Math.max(es.latestCaptureRound, next.pursuitRound);
    if (catchingPlayerId && next.playerStats[catchingPlayerId]) next.playerStats[catchingPlayerId].captureCredits += 1;
  }
  (next.entities[winnerEntityId]?.playerIds || []).forEach((id) => { if (next.playerStats[id]) next.playerStats[id].legsWon += 1; });

  let setWonBy: string | null = null;
  let matchWonBy: string | null = null;
  if (next.legWins[winnerEntityId] >= minToWin(next.rules.legsBestOf)) {
    setWonBy = winnerEntityId;
    next.setWins[winnerEntityId] = Number(next.setWins[winnerEntityId] || 0) + 1;
    next.entityStats[winnerEntityId].setsWon += 1;
    (next.entities[winnerEntityId]?.playerIds || []).forEach((id) => { if (next.playerStats[id]) next.playerStats[id].setsWon += 1; });
    if (next.setWins[winnerEntityId] >= minToWin(next.rules.setsBestOf)) {
      matchWonBy = winnerEntityId;
      next.finished = true;
      next.winnerEntityId = winnerEntityId;
      next.finishedAt = Date.now();
    }
  }

  const visitsInLeg = next.history.filter((v) => v.globalLegNo === next.globalLegNo).length;
  const dartsInLeg = next.history.filter((v) => v.globalLegNo === next.globalLegNo).reduce((sum, v) => sum + v.darts.length, 0);
  const result: CatchMeLegResult = {
    setNo: next.setNo, legNo: next.legNo, globalLegNo: next.globalLegNo,
    runnerEntityId: next.runnerEntityId, chaserEntityId: next.chaserEntityId,
    winnerEntityId, winnerRole, reason, pursuitRound: next.pursuitRound,
    runnerScore, chaserScore, finalDistance, headStart: next.rules.headStart,
    dartsInLeg, visitsInLeg, setWonBy, matchWonBy,
  };
  next.lastLegResult = result;
  next.legResults.push(result);
  next.awaitingNextLeg = !next.finished;
  next.phaseMemberIndex = 0;
  return next;
}

export function playCatchMeVisit(input: CatchMeState, dartsRaw: GameDart[]): CatchMeState {
  if (input.finished || input.awaitingNextLeg) return input;
  const darts = (Array.isArray(dartsRaw) ? dartsRaw : []).slice(0, 3);
  if (!darts.length) return input;
  const state = cloneCatchMeState(input);
  const role = state.phase;
  const entityId = roleEntityId(state, role);
  const playerId = state.activePlayerId;
  if (!playerId || state.entityByPlayer[playerId] !== entityId) return input;

  const score = darts.reduce((sum, dart) => sum + catchMeDartScore(dart), 0);
  const before = Number(state.entityScores[entityId] || 0);
  state.entityScores[entityId] = before + score;
  const ps = state.playerStats[playerId] || emptyCatchMePlayerStats();
  ps.darts += darts.length; ps.visits += 1; ps.points += score; ps.bestVisit = Math.max(ps.bestVisit, score);
  updateDartBreakdown(ps, darts);
  if (role === "runner") {
    ps.runnerDarts += darts.length; ps.runnerVisits += 1; ps.runnerPoints += score; ps.runnerBestVisit = Math.max(ps.runnerBestVisit, score);
    state.entityStats[entityId].runnerPoints += score;
  } else {
    ps.chaserDarts += darts.length; ps.chaserVisits += 1; ps.chaserPoints += score; ps.chaserBestVisit = Math.max(ps.chaserBestVisit, score);
    state.entityStats[entityId].chaserPoints += score;
  }
  state.playerStats[playerId] = ps;

  const runnerScore = Number(state.entityScores[state.runnerEntityId] || 0);
  const chaserScore = Number(state.entityScores[state.chaserEntityId] || 0);
  const distance = runnerScore - chaserScore;
  const runnerStats = state.entityStats[state.runnerEntityId];
  runnerStats.maxRunnerLead = Math.max(runnerStats.maxRunnerLead, Math.max(0, distance));
  const chaserStats = state.entityStats[state.chaserEntityId];
  if (distance > 0) chaserStats.closestChaseGap = chaserStats.closestChaseGap == null ? distance : Math.min(chaserStats.closestChaseGap, distance);

  const captured = role === "chaser" && chaserScore >= runnerScore;
  const visit: CatchMeVisit = {
    id: `catch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), setNo: state.setNo, legNo: state.legNo, globalLegNo: state.globalLegNo,
    pursuitRound: state.pursuitRound, role, entityId, playerId, teamId: state.teamByPlayer[playerId] || null,
    darts: darts.map((d) => ({ ...d })), labels: darts.map(catchMeDartLabel), score,
    entityScoreBefore: before, entityScoreAfter: before + score, runnerScoreAfter: runnerScore,
    chaserScoreAfter: chaserScore, distanceAfter: distance, captured,
  };
  state.history.push(visit);
  if (captured) return finishLeg(state, state.chaserEntityId, "capture", playerId);

  const members = state.entities[entityId]?.playerIds || [];
  if (state.phaseMemberIndex + 1 < members.length) {
    state.phaseMemberIndex += 1;
    state.activePlayerId = members[state.phaseMemberIndex];
    return state;
  }

  state.phaseMemberIndex = 0;
  if (role === "runner") {
    state.phase = "chaser";
    state.activePlayerId = firstActivePlayer(state.entities, state.chaserEntityId);
    return state;
  }

  if (state.pursuitRound >= state.rules.pursuitRounds) {
    return finishLeg(state, state.runnerEntityId, "escape", null);
  }
  state.pursuitRound += 1;
  state.phase = "runner";
  state.activePlayerId = firstActivePlayer(state.entities, state.runnerEntityId);
  return state;
}

export function startNextCatchMeLeg(input: CatchMeState): CatchMeState {
  if (input.finished || !input.awaitingNextLeg || !input.lastLegResult) return input;
  const state = cloneCatchMeState(input);
  const previousRunner = state.runnerEntityId;
  state.runnerEntityId = state.chaserEntityId;
  state.chaserEntityId = previousRunner;

  const setWon = Boolean(state.lastLegResult.setWonBy);
  if (setWon) {
    state.setNo += 1;
    state.legNo = 1;
    state.legWins = Object.fromEntries(state.entityOrder.map((id) => [id, 0]));
  } else {
    state.legNo += 1;
  }
  state.globalLegNo += 1;
  state.pursuitRound = 1;
  state.phase = "runner";
  state.phaseMemberIndex = 0;
  state.entityScores = Object.fromEntries(state.entityOrder.map((id) => [id, id === state.runnerEntityId ? state.rules.headStart : 0]));
  state.activePlayerId = firstActivePlayer(state.entities, state.runnerEntityId);
  state.awaitingNextLeg = false;
  state.lastLegResult = null;
  state.entityStats[state.runnerEntityId].runnerLegs += 1;
  state.entityStats[state.chaserEntityId].chaserLegs += 1;
  return state;
}

export function getCatchMeDistance(state: CatchMeState): number { return scoreDistance(state); }
export function getCatchMeActiveRole(state: CatchMeState): CatchMeRole { return state.phase; }
export function getCatchMeActiveEntityId(state: CatchMeState): string { return roleEntityId(state, state.phase); }
export function getCatchMeLegsToWin(state: CatchMeState): number { return minToWin(state.rules.legsBestOf); }
export function getCatchMeSetsToWin(state: CatchMeState): number { return minToWin(state.rules.setsBestOf); }

export function cloneCatchMeState(state: CatchMeState): CatchMeState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    teams: state.teams.map((t) => ({ ...t, playerIds: [...t.playerIds] })),
    teamByPlayer: { ...state.teamByPlayer }, entityByPlayer: { ...state.entityByPlayer },
    entities: Object.fromEntries(Object.entries(state.entities).map(([id, e]) => [id, { ...e, playerIds: [...e.playerIds] }])),
    entityOrder: [...state.entityOrder] as [string, string],
    entityScores: { ...state.entityScores }, legWins: { ...state.legWins }, setWins: { ...state.setWins },
    playerStats: Object.fromEntries(Object.entries(state.playerStats).map(([id, s]) => [id, { ...s }])),
    entityStats: Object.fromEntries(Object.entries(state.entityStats).map(([id, s]) => [id, { ...s, playerIds: [...s.playerIds] }])),
    history: state.history.map((v) => ({ ...v, darts: v.darts.map((d) => ({ ...d })), labels: [...v.labels] })),
    legResults: state.legResults.map((r) => ({ ...r })),
    lastLegResult: state.lastLegResult ? { ...state.lastLegResult } : null,
  };
}
