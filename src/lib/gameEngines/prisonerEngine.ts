// =============================================================
// PRISONER — moteur pur
// Course autour du cadran + fléchettes prisonnières / captures.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type PrisonerParticipantMode = "players" | "teams";
export type PrisonerScoreInputMethod = "keypad" | "dartboard";
export type PrisonerSingleRing = "inner" | "outer";
export type PrisonerDart = GameDart & { singleRing?: PrisonerSingleRing };

export type PrisonerTeamConfig = {
  id: string;
  name: string;
  color?: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type PrisonerConfigPayload = {
  mode: "prisoner";
  participantMode: PrisonerParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: PrisonerTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  startingDarts: number;
  sequenceMode: "clockwise" | "numeric";
  bullCaptureRule: "bull" | "any_bull";
  missPenaltyEnabled: boolean;
  eliminationEnabled: boolean;
  randomOrder: boolean;
  scoreInputMethod: PrisonerScoreInputMethod;
};

export type PrisonerRules = Pick<
  PrisonerConfigPayload,
  "participantMode" | "startingDarts" | "sequenceMode" | "bullCaptureRule" | "missPenaltyEnabled" | "eliminationEnabled"
>;

export type PrisonerTargetStat = {
  target: number;
  dartsAimed: number;
  progressHits: number;
  outerSingles: number;
  doubles: number;
  triples: number;
  prisonerMistakes: number;
};

export type PrisonerPlayerStats = {
  darts: number;
  visits: number;
  turnsSkipped: number;
  progressHits: number;
  targetsCompleted: number;
  bestProgressVisit: number;
  currentProgressStreak: number;
  bestProgressStreak: number;
  captures: number;
  opponentCaptures: number;
  ownRescues: number;
  captureLosses: number;
  prisonersCreated: number;
  prisonersRemaining: number;
  innerSinglePrisoners: number;
  bullPrisoners: number;
  offboardMisses: number;
  temporaryLostDarts: number;
  validOuterHits: number;
  outerSingles: number;
  innerSingles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  maxDartsOwned: number;
  minDartsOwned: number;
  finalDartsOwned: number;
  eliminated: boolean;
  eliminatedAtVisit: number | null;
  completed: boolean;
  completedAtVisit: number | null;
  targets: Record<string, PrisonerTargetStat>;
};

export type PrisonerToken = {
  id: string;
  ownerId: string;
  originalOwnerId: string;
  location: number | "BULL";
  createdAt: number;
  createdVisit: number;
};

export type PrisonerDartEvent = {
  index: number;
  label: string;
  kind: "progress" | "capture" | "prisoner" | "miss" | "neutral";
  targetBefore: number | null;
  targetAfter: number | null;
  capturedTokenId?: string;
  capturedFromPlayerId?: string;
  prisonerTokenId?: string;
};

export type PrisonerVisit = {
  id: string;
  createdAt: string;
  visitNo: number;
  playerId: string;
  teamId: string | null;
  targetBefore: number | null;
  targetAfter: number | null;
  dartsBudget: number;
  darts: PrisonerDart[];
  labels: string[];
  events: PrisonerDartEvent[];
  progressHits: number;
  captures: number;
  prisonersCreated: number;
  offboardMisses: number;
  dartsOwnedBefore: number;
  dartsOwnedAfter: number;
  prisonersOwnedAfter: number;
  nextTurnMissPenalty: number;
  completed: boolean;
  eliminated: boolean;
  skipped?: boolean;
};

export type PrisonerStanding = {
  id: string;
  name: string;
  playerIds: string[];
  progress: number;
  dartsOwned: number;
  availableDarts: number;
  captures: number;
  prisoners: number;
  completed: boolean;
  eliminated: boolean;
  rank: number;
  tied: boolean;
};

export type PrisonerState = {
  sport: "darts";
  mode: "prisoner";
  rules: PrisonerRules;
  players: Player[];
  teams: PrisonerTeamConfig[];
  teamByPlayer: Record<string, string>;
  turnOrder: string[];
  activePlayerIndex: number;
  visitNo: number;
  sequence: number[];
  progressIndexByPlayer: Record<string, number>;
  dartsOwnedByPlayer: Record<string, number>;
  missPenaltyByPlayer: Record<string, number>;
  eliminatedByPlayer: Record<string, boolean>;
  completedByPlayer: Record<string, boolean>;
  prisoners: PrisonerToken[];
  statsByPlayer: Record<string, PrisonerPlayerStats>;
  history: PrisonerVisit[];
  standings: PrisonerStanding[];
  winnerIds: string[];
  tied: boolean;
  finished: boolean;
  finishReason: "course_completed" | "last_player" | "last_team" | null;
  startedAt: number;
  finishedAt?: number;
};

export const PRISONER_CLOCKWISE_SEQUENCE = [1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20];
export const PRISONER_NUMERIC_SEQUENCE = Array.from({ length: 20 }, (_, i) => i + 1);

function clampInt(value: any, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
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

function normalizeTeams(players: Player[], teams: PrisonerTeamConfig[] = []) {
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

function teamMaps(players: Player[], teams: PrisonerTeamConfig[]) {
  const map: Record<string, string> = {};
  teams.forEach((team) => team.playerIds.forEach((id) => { map[id] = team.id; }));
  return map;
}

export function emptyPrisonerStats(startingDarts = 3): PrisonerPlayerStats {
  return {
    darts: 0, visits: 0, turnsSkipped: 0, progressHits: 0, targetsCompleted: 0,
    bestProgressVisit: 0, currentProgressStreak: 0, bestProgressStreak: 0,
    captures: 0, opponentCaptures: 0, ownRescues: 0, captureLosses: 0,
    prisonersCreated: 0, prisonersRemaining: 0, innerSinglePrisoners: 0, bullPrisoners: 0,
    offboardMisses: 0, temporaryLostDarts: 0, validOuterHits: 0,
    outerSingles: 0, innerSingles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    maxDartsOwned: startingDarts, minDartsOwned: startingDarts, finalDartsOwned: startingDarts,
    eliminated: false, eliminatedAtVisit: null, completed: false, completedAtVisit: null, targets: {},
  };
}

export function prisonerDartLabel(dart: PrisonerDart) {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "IB") return "DBULL";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "S") return `${dart.singleRing === "inner" ? "SI" : "SE"}${dart.number ?? ""}`;
  return `${dart.bed}${dart.number ?? ""}`;
}

export function isPrisonerZone(dart: PrisonerDart) {
  return dart?.bed === "OB" || dart?.bed === "IB" || (dart?.bed === "S" && dart?.singleRing === "inner");
}

export function isPlayableOuterZone(dart: PrisonerDart) {
  return dart?.bed === "D" || dart?.bed === "T" || (dart?.bed === "S" && dart?.singleRing !== "inner");
}

export function prisonerLocation(dart: PrisonerDart): number | "BULL" | null {
  if (dart?.bed === "OB" || dart?.bed === "IB") return "BULL";
  if (Number(dart?.number) >= 1 && Number(dart?.number) <= 20) return Number(dart.number);
  return null;
}

export function createPrisonerState(
  inputPlayers: Player[],
  rulesInput: Partial<PrisonerRules> = {},
  inputTeams: PrisonerTeamConfig[] = [],
  turnOrderInput?: string[]
): PrisonerState {
  const players = normalizePlayers(inputPlayers);
  const rules: PrisonerRules = {
    participantMode: rulesInput.participantMode === "teams" ? "teams" : "players",
    startingDarts: clampInt(rulesInput.startingDarts, 1, 9, 3),
    sequenceMode: rulesInput.sequenceMode === "numeric" ? "numeric" : "clockwise",
    bullCaptureRule: rulesInput.bullCaptureRule === "any_bull" ? "any_bull" : "bull",
    missPenaltyEnabled: rulesInput.missPenaltyEnabled !== false,
    eliminationEnabled: rulesInput.eliminationEnabled !== false,
  };
  const teams = normalizeTeams(players, inputTeams);
  const validIds = new Set(players.map((p) => p.id));
  const desired = Array.isArray(turnOrderInput) ? turnOrderInput.map(String).filter((id) => validIds.has(id)) : [];
  const turnOrder = Array.from(new Set([...desired, ...players.map((p) => p.id)]));
  const progressIndexByPlayer = Object.fromEntries(players.map((p) => [p.id, 0]));
  const dartsOwnedByPlayer = Object.fromEntries(players.map((p) => [p.id, rules.startingDarts]));
  const missPenaltyByPlayer = Object.fromEntries(players.map((p) => [p.id, 0]));
  const eliminatedByPlayer = Object.fromEntries(players.map((p) => [p.id, false]));
  const completedByPlayer = Object.fromEntries(players.map((p) => [p.id, false]));
  const statsByPlayer = Object.fromEntries(players.map((p) => [p.id, emptyPrisonerStats(rules.startingDarts)]));
  const state: PrisonerState = {
    sport: "darts", mode: "prisoner", rules, players, teams, teamByPlayer: teamMaps(players, teams), turnOrder,
    activePlayerIndex: 0, visitNo: 0, sequence: rules.sequenceMode === "numeric" ? [...PRISONER_NUMERIC_SEQUENCE] : [...PRISONER_CLOCKWISE_SEQUENCE],
    progressIndexByPlayer, dartsOwnedByPlayer, missPenaltyByPlayer, eliminatedByPlayer, completedByPlayer,
    prisoners: [], statsByPlayer, history: [], standings: [], winnerIds: [], tied: false, finished: false, finishReason: null,
    startedAt: Date.now(),
  };
  recalcStandings(state);
  return state;
}

export function clonePrisonerState(state: PrisonerState): PrisonerState {
  return JSON.parse(JSON.stringify(state));
}

export function getPrisonerActivePlayerId(state: PrisonerState) {
  return state.turnOrder[state.activePlayerIndex] || state.turnOrder[0] || state.players[0]?.id || "";
}

export function getPrisonerTarget(state: PrisonerState, playerId = getPrisonerActivePlayerId(state)) {
  const idx = clampInt(state.progressIndexByPlayer[playerId], 0, state.sequence.length, 0);
  return idx >= state.sequence.length ? null : state.sequence[idx] ?? null;
}

export function getPrisonersOwnedCount(state: PrisonerState, playerId: string) {
  return state.prisoners.filter((p) => p.ownerId === playerId).length;
}

export function getPrisonerAvailableDarts(state: PrisonerState, playerId: string) {
  const owned = Math.max(0, Number(state.dartsOwnedByPlayer[playerId] || 0));
  const imprisoned = getPrisonersOwnedCount(state, playerId);
  const missPenalty = state.rules.missPenaltyEnabled ? Math.max(0, Number(state.missPenaltyByPlayer[playerId] || 0)) : 0;
  return Math.max(0, owned - imprisoned - missPenalty);
}

function permanentPlayableDarts(state: PrisonerState, playerId: string) {
  return Math.max(0, Number(state.dartsOwnedByPlayer[playerId] || 0) - getPrisonersOwnedCount(state, playerId));
}

function entityRows(state: PrisonerState): Omit<PrisonerStanding, "rank" | "tied">[] {
  if (state.rules.participantMode === "teams" && state.teams.length) {
    return state.teams.map((team) => {
      const members = team.playerIds;
      const progresses = members.map((id) => Number(state.progressIndexByPlayer[id] || 0));
      const completed = members.some((id) => Boolean(state.completedByPlayer[id]));
      return {
        id: team.id, name: team.name, playerIds: [...members],
        progress: Math.max(0, ...progresses),
        dartsOwned: members.reduce((a, id) => a + Number(state.dartsOwnedByPlayer[id] || 0), 0),
        availableDarts: members.reduce((a, id) => a + getPrisonerAvailableDarts(state, id), 0),
        captures: members.reduce((a, id) => a + Number(state.statsByPlayer[id]?.captures || 0), 0),
        prisoners: members.reduce((a, id) => a + getPrisonersOwnedCount(state, id), 0),
        completed,
        eliminated: members.every((id) => Boolean(state.eliminatedByPlayer[id])),
      };
    });
  }
  return state.players.map((player) => ({
    id: player.id, name: player.name, playerIds: [player.id],
    progress: Number(state.progressIndexByPlayer[player.id] || 0), dartsOwned: Number(state.dartsOwnedByPlayer[player.id] || 0),
    availableDarts: getPrisonerAvailableDarts(state, player.id), captures: Number(state.statsByPlayer[player.id]?.captures || 0),
    prisoners: getPrisonersOwnedCount(state, player.id), completed: Boolean(state.completedByPlayer[player.id]),
    eliminated: Boolean(state.eliminatedByPlayer[player.id]),
  }));
}

function recalcStandings(state: PrisonerState) {
  const rows = entityRows(state).sort((a, b) =>
    Number(b.completed) - Number(a.completed) || b.progress - a.progress || b.dartsOwned - a.dartsOwned || b.captures - a.captures || a.name.localeCompare(b.name, "fr")
  );
  state.standings = rows.map((row, index) => ({ ...row, rank: index + 1, tied: index > 0 && row.completed === rows[index - 1].completed && row.progress === rows[index - 1].progress && row.dartsOwned === rows[index - 1].dartsOwned && row.captures === rows[index - 1].captures }));
}

function finish(state: PrisonerState, winnerIds: string[], reason: PrisonerState["finishReason"]) {
  state.finished = true;
  state.finishReason = reason;
  state.finishedAt = Date.now();
  state.winnerIds = Array.from(new Set(winnerIds.map(String).filter(Boolean)));
  state.tied = state.winnerIds.length > 1;
  recalcStandings(state);
  return state;
}

function maybeFinish(state: PrisonerState, completingPlayerId?: string) {
  if (completingPlayerId) {
    if (state.rules.participantMode === "teams") {
      const teamId = state.teamByPlayer[completingPlayerId];
      if (teamId) return finish(state, [teamId], "course_completed");
    }
    return finish(state, [completingPlayerId], "course_completed");
  }
  if (!state.rules.eliminationEnabled) return state;
  if (state.rules.participantMode === "teams" && state.teams.length) {
    const aliveTeams = state.teams.filter((team) => team.playerIds.some((id) => !state.eliminatedByPlayer[id] && !state.completedByPlayer[id]));
    if (aliveTeams.length === 1 && state.teams.length > 1) return finish(state, [aliveTeams[0].id], "last_team");
  } else {
    const alive = state.players.filter((p) => !state.eliminatedByPlayer[p.id] && !state.completedByPlayer[p.id]);
    if (alive.length === 1 && state.players.length > 1) return finish(state, [alive[0].id], "last_player");
  }
  return state;
}

function markEliminations(state: PrisonerState) {
  if (!state.rules.eliminationEnabled) return;
  state.players.forEach((player) => {
    const id = player.id;
    if (state.completedByPlayer[id]) return;
    const out = permanentPlayableDarts(state, id) <= 0;
    state.eliminatedByPlayer[id] = out;
    const stat = state.statsByPlayer[id] || emptyPrisonerStats(state.rules.startingDarts);
    if (out && !stat.eliminated) stat.eliminatedAtVisit = state.visitNo;
    stat.eliminated = out;
    stat.finalDartsOwned = Number(state.dartsOwnedByPlayer[id] || 0);
    stat.minDartsOwned = Math.min(stat.minDartsOwned, stat.finalDartsOwned);
    stat.maxDartsOwned = Math.max(stat.maxDartsOwned, stat.finalDartsOwned);
    stat.prisonersRemaining = getPrisonersOwnedCount(state, id);
    state.statsByPlayer[id] = stat;
  });
}

function nextPlayableIndex(state: PrisonerState, fromIndex: number) {
  const len = state.turnOrder.length;
  for (let step = 1; step <= len; step += 1) {
    const idx = (fromIndex + step) % len;
    const id = state.turnOrder[idx];
    if (!state.eliminatedByPlayer[id] && !state.completedByPlayer[id]) return idx;
  }
  return -1;
}

function captureMatches(state: PrisonerState, dart: PrisonerDart, token: PrisonerToken) {
  const location = prisonerLocation(dart);
  if (location === null || token.location !== location || !isPlayableOuterZone(dart)) {
    if (location === "BULL" && token.location === "BULL" && (dart.bed === "OB" || dart.bed === "IB")) return true;
    return false;
  }
  return true;
}

function targetStat(stats: PrisonerPlayerStats, target: number) {
  const key = String(target);
  if (!stats.targets[key]) stats.targets[key] = { target, dartsAimed: 0, progressHits: 0, outerSingles: 0, doubles: 0, triples: 0, prisonerMistakes: 0 };
  return stats.targets[key];
}

export function playPrisonerVisit(input: PrisonerState, inputDarts: PrisonerDart[]): PrisonerState {
  const state = clonePrisonerState(input);
  if (state.finished) return state;
  const playerId = getPrisonerActivePlayerId(state);
  if (!playerId) return state;
  const stat = state.statsByPlayer[playerId] || emptyPrisonerStats(state.rules.startingDarts);
  const dartsBudget = getPrisonerAvailableDarts(state, playerId);
  const ownedBefore = Number(state.dartsOwnedByPlayer[playerId] || 0);
  const targetBefore = getPrisonerTarget(state, playerId);
  const darts = (inputDarts || []).slice(0, dartsBudget).map((d) => ({ ...d, singleRing: d?.bed === "S" ? (d.singleRing === "inner" ? "inner" : "outer") : d?.singleRing }));
  state.visitNo += 1;
  stat.visits += 1;

  if (dartsBudget <= 0) {
    const hasTemporary = permanentPlayableDarts(state, playerId) > 0 && Number(state.missPenaltyByPlayer[playerId] || 0) > 0;
    if (hasTemporary) {
      stat.turnsSkipped += 1;
      state.missPenaltyByPlayer[playerId] = 0;
      state.history.push({
        id: `prisoner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), visitNo: state.visitNo,
        playerId, teamId: state.teamByPlayer[playerId] || null, targetBefore, targetAfter: targetBefore, dartsBudget: 0, darts: [], labels: [], events: [],
        progressHits: 0, captures: 0, prisonersCreated: 0, offboardMisses: 0, dartsOwnedBefore: ownedBefore, dartsOwnedAfter: ownedBefore,
        prisonersOwnedAfter: getPrisonersOwnedCount(state, playerId), nextTurnMissPenalty: 0, completed: false, eliminated: false, skipped: true,
      });
    }
  } else {
    // Le malus MISS du tour précédent expire dès que ce tour est joué.
    state.missPenaltyByPlayer[playerId] = 0;
    let progressHits = 0;
    let captures = 0;
    let prisonersCreated = 0;
    let offboardMisses = 0;
    const events: PrisonerDartEvent[] = [];
    let progressInVisit = 0;

    darts.forEach((dart, index) => {
      const currentTarget = getPrisonerTarget(state, playerId);
      if (currentTarget !== null) targetStat(stat, currentTarget).dartsAimed += 1;
      stat.darts += 1;
      const label = prisonerDartLabel(dart);
      let kind: PrisonerDartEvent["kind"] = "neutral";
      let capturedTokenId: string | undefined;
      let capturedFromPlayerId: string | undefined;
      let prisonerTokenId: string | undefined;

      if (dart.bed === "MISS") {
        stat.misses += 1;
        stat.offboardMisses += 1;
        stat.temporaryLostDarts += 1;
        offboardMisses += 1;
        kind = "miss";
      } else if (dart.bed === "S" && dart.singleRing === "inner") {
        stat.innerSingles += 1;
        stat.innerSinglePrisoners += 1;
        stat.prisonersCreated += 1;
        if (currentTarget !== null) targetStat(stat, currentTarget).prisonerMistakes += 1;
        const token: PrisonerToken = { id: `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ownerId: playerId, originalOwnerId: playerId, location: Number(dart.number), createdAt: Date.now(), createdVisit: state.visitNo };
        state.prisoners.push(token); prisonerTokenId = token.id; prisonersCreated += 1; kind = "prisoner";
      } else if (dart.bed === "OB" || dart.bed === "IB") {
        if (dart.bed === "OB") stat.bulls += 1; else stat.dbulls += 1;
        // Un bull libère d'abord un prisonnier déjà présent au Bull.
        const bullTokenIndex = state.prisoners.findIndex((token) => token.location === "BULL");
        if (bullTokenIndex >= 0) {
          const token = state.prisoners[bullTokenIndex];
          state.prisoners.splice(bullTokenIndex, 1);
          capturedTokenId = token.id; capturedFromPlayerId = token.ownerId;
          stat.captures += 1; captures += 1; kind = "capture";
          if (token.ownerId === playerId) stat.ownRescues += 1;
          else {
            stat.opponentCaptures += 1;
            state.dartsOwnedByPlayer[token.ownerId] = Math.max(0, Number(state.dartsOwnedByPlayer[token.ownerId] || 0) - 1);
            state.dartsOwnedByPlayer[playerId] = Number(state.dartsOwnedByPlayer[playerId] || 0) + 1;
            const victimStats = state.statsByPlayer[token.ownerId] || emptyPrisonerStats(state.rules.startingDarts);
            victimStats.captureLosses += 1;
            victimStats.finalDartsOwned = state.dartsOwnedByPlayer[token.ownerId];
            victimStats.minDartsOwned = Math.min(victimStats.minDartsOwned, victimStats.finalDartsOwned);
            state.statsByPlayer[token.ownerId] = victimStats;
          }
        } else {
          stat.bullPrisoners += 1; stat.prisonersCreated += 1;
          const token: PrisonerToken = { id: `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ownerId: playerId, originalOwnerId: playerId, location: "BULL", createdAt: Date.now(), createdVisit: state.visitNo };
          state.prisoners.push(token); prisonerTokenId = token.id; prisonersCreated += 1; kind = "prisoner";
        }
      } else if (isPlayableOuterZone(dart)) {
        stat.validOuterHits += 1;
        if (dart.bed === "S") stat.outerSingles += 1;
        else if (dart.bed === "D") stat.doubles += 1;
        else if (dart.bed === "T") stat.triples += 1;

        const tokenIndex = state.prisoners.findIndex((token) => captureMatches(state, dart, token));
        if (tokenIndex >= 0) {
          const token = state.prisoners[tokenIndex];
          state.prisoners.splice(tokenIndex, 1);
          capturedTokenId = token.id; capturedFromPlayerId = token.ownerId;
          stat.captures += 1; captures += 1; kind = "capture";
          if (token.ownerId === playerId) stat.ownRescues += 1;
          else {
            stat.opponentCaptures += 1;
            state.dartsOwnedByPlayer[token.ownerId] = Math.max(0, Number(state.dartsOwnedByPlayer[token.ownerId] || 0) - 1);
            state.dartsOwnedByPlayer[playerId] = Number(state.dartsOwnedByPlayer[playerId] || 0) + 1;
            const victimStats = state.statsByPlayer[token.ownerId] || emptyPrisonerStats(state.rules.startingDarts);
            victimStats.captureLosses += 1;
            victimStats.finalDartsOwned = state.dartsOwnedByPlayer[token.ownerId];
            victimStats.minDartsOwned = Math.min(victimStats.minDartsOwned, victimStats.finalDartsOwned);
            state.statsByPlayer[token.ownerId] = victimStats;
          }
        }

        const targetNow = getPrisonerTarget(state, playerId);
        if (targetNow !== null && Number(dart.number) === targetNow) {
          state.progressIndexByPlayer[playerId] = Math.min(state.sequence.length, Number(state.progressIndexByPlayer[playerId] || 0) + 1);
          stat.progressHits += 1; stat.targetsCompleted = state.progressIndexByPlayer[playerId]; progressHits += 1; progressInVisit += 1;
          stat.currentProgressStreak += 1; stat.bestProgressStreak = Math.max(stat.bestProgressStreak, stat.currentProgressStreak);
          const ts = targetStat(stat, targetNow); ts.progressHits += 1;
          if (dart.bed === "S") ts.outerSingles += 1; else if (dart.bed === "D") ts.doubles += 1; else if (dart.bed === "T") ts.triples += 1;
          kind = kind === "capture" ? "capture" : "progress";
          if (state.progressIndexByPlayer[playerId] >= state.sequence.length) {
            state.completedByPlayer[playerId] = true; stat.completed = true; stat.completedAtVisit = state.visitNo;
          }
        } else {
          stat.currentProgressStreak = 0;
        }
      }

      events.push({ index, label, kind, targetBefore: currentTarget, targetAfter: getPrisonerTarget(state, playerId), capturedTokenId, capturedFromPlayerId, prisonerTokenId });
    });

    stat.bestProgressVisit = Math.max(stat.bestProgressVisit, progressInVisit);
    if (state.rules.missPenaltyEnabled) state.missPenaltyByPlayer[playerId] = Math.min(offboardMisses, Number(state.dartsOwnedByPlayer[playerId] || 0));
    stat.finalDartsOwned = Number(state.dartsOwnedByPlayer[playerId] || 0);
    stat.maxDartsOwned = Math.max(stat.maxDartsOwned, stat.finalDartsOwned);
    stat.minDartsOwned = Math.min(stat.minDartsOwned, stat.finalDartsOwned);
    state.statsByPlayer[playerId] = stat;

    markEliminations(state);
    state.players.forEach((p) => {
      const s = state.statsByPlayer[p.id] || emptyPrisonerStats(state.rules.startingDarts);
      s.prisonersRemaining = getPrisonersOwnedCount(state, p.id);
      s.finalDartsOwned = Number(state.dartsOwnedByPlayer[p.id] || 0);
      s.maxDartsOwned = Math.max(s.maxDartsOwned, s.finalDartsOwned);
      s.minDartsOwned = Math.min(s.minDartsOwned, s.finalDartsOwned);
      state.statsByPlayer[p.id] = s;
    });

    state.history.push({
      id: `prisoner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), visitNo: state.visitNo,
      playerId, teamId: state.teamByPlayer[playerId] || null, targetBefore, targetAfter: getPrisonerTarget(state, playerId), dartsBudget,
      darts, labels: darts.map(prisonerDartLabel), events, progressHits, captures, prisonersCreated, offboardMisses,
      dartsOwnedBefore: ownedBefore, dartsOwnedAfter: Number(state.dartsOwnedByPlayer[playerId] || 0), prisonersOwnedAfter: getPrisonersOwnedCount(state, playerId),
      nextTurnMissPenalty: Number(state.missPenaltyByPlayer[playerId] || 0), completed: Boolean(state.completedByPlayer[playerId]), eliminated: Boolean(state.eliminatedByPlayer[playerId]),
    });
  }

  recalcStandings(state);
  if (state.completedByPlayer[playerId]) return maybeFinish(state, playerId);
  const afterElimination = maybeFinish(state);
  if (afterElimination.finished) return afterElimination;
  const next = nextPlayableIndex(state, state.activePlayerIndex);
  if (next >= 0) state.activePlayerIndex = next;
  return state;
}
