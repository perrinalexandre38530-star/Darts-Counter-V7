// =============================================================
// HALVE-IT — moteur complet
// - cible imposée par round
// - seules les touches valides comptent
// - 0 touche => score / 2 (arrondi configurable)
// - joueurs / équipes / bots / stats / historique
// =============================================================

import type { GameDart, Player } from "../types-game";

export type HalveItParticipantMode = "players" | "teams";
export type HalveItScoreInputMethod = "keypad" | "dartboard";
export type HalveItSequencePreset = "classic7" | "extended9" | "expert12" | "numbers7";
export type HalveItStartMode = "zero" | "fixed" | "opening_visit";
export type HalveItRounding = "floor" | "ceil";

export type HalveItTargetId =
  | "open"
  | "double_any"
  | "triple_any"
  | "bull"
  | `n${number}`;

export type HalveItTarget = {
  id: HalveItTargetId;
  kind: "open" | "number" | "double" | "triple" | "bull";
  label: string;
  value?: number;
};

export type HalveItTeamConfig = {
  id: string;
  name: string;
  color?: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type HalveItConfigPayload = {
  mode: "halve_it";
  participantMode: HalveItParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: HalveItTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  sequencePreset: HalveItSequencePreset;
  customTargets?: HalveItTargetId[];
  startMode: HalveItStartMode;
  fixedStartingScore: number;
  rounding: HalveItRounding;
  randomOrder: boolean;
  scoreInputMethod: HalveItScoreInputMethod;
};

export type HalveItRules = Pick<
  HalveItConfigPayload,
  "participantMode" | "sequencePreset" | "customTargets" | "startMode" | "fixedStartingScore" | "rounding"
>;

export type HalveItTargetStat = {
  targetId: HalveItTargetId;
  label: string;
  attempts: number;
  darts: number;
  validHits: number;
  pointsWon: number;
  pointsLost: number;
  failedVisits: number;
  perfectVisits: number;
  bestVisit: number;
};

export type HalveItPlayerStats = {
  darts: number;
  visits: number;
  targetAttempts: number;
  validHits: number;
  misses: number;
  wastedDarts: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  successfulVisits: number;
  failedVisits: number;
  oneHitVisits: number;
  twoHitVisits: number;
  threeHitVisits: number;
  perfectVisits: number;
  halvingEvents: number;
  pointsWon: number;
  pointsLostByHalving: number;
  netPoints: number;
  bestVisit: number;
  bestVisitHits: number;
  currentSuccessStreak: number;
  bestSuccessStreak: number;
  targetsCleared: number;
  targets: Record<string, HalveItTargetStat>;
};

export type HalveItVisit = {
  id: string;
  createdAt: string;
  round: number;
  target: HalveItTarget;
  targetId: HalveItTargetId;
  targetLabel: string;
  playerId: string;
  teamId: string | null;
  darts: GameDart[];
  labels: string[];
  validHits: number;
  gain: number;
  halved: boolean;
  loss: number;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
};

export type HalveItStanding = {
  id: string;
  name: string;
  playerIds: string[];
  score: number;
  hits: number;
  halves: number;
  visits: number;
  rank: number;
  tied: boolean;
};

export type HalveItState = {
  sport: "darts";
  mode: "halve_it";
  rules: HalveItRules;
  players: Player[];
  teams: HalveItTeamConfig[];
  teamByPlayer: Record<string, string>;
  turnOrder: string[];
  activePlayerIndex: number;
  roundIndex: number;
  targets: HalveItTarget[];
  scoresByPlayer: Record<string, number>;
  statsByPlayer: Record<string, HalveItPlayerStats>;
  history: HalveItVisit[];
  standings: HalveItStanding[];
  winnerIds: string[];
  tied: boolean;
  finished: boolean;
  finishReason: "completed" | null;
  startedAt: number;
  finishedAt?: number;
};

function clampInt(value: any, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

export function halveItDartLabel(dart: GameDart) {
  if (!dart) return "MISS";
  if (dart.bed === "IB") return "DBULL";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "MISS") return "MISS";
  return `${dart.bed}${dart.number ?? ""}`;
}

export function halveItDartPoints(dart: GameDart) {
  if (!dart) return 0;
  if (dart.bed === "IB") return 50;
  if (dart.bed === "OB") return 25;
  if (dart.bed === "MISS") return 0;
  const n = clampInt(dart.number, 1, 20, 0);
  if (!n) return 0;
  if (dart.bed === "D") return n * 2;
  if (dart.bed === "T") return n * 3;
  return n;
}

export function targetFromId(idInput: HalveItTargetId | string): HalveItTarget {
  const id = String(idInput || "").toLowerCase() as HalveItTargetId;
  if (id === "open") return { id: "open", kind: "open", label: "LIBRE" };
  if (id === "double_any") return { id: "double_any", kind: "double", label: "DOUBLE" };
  if (id === "triple_any") return { id: "triple_any", kind: "triple", label: "TRIPLE" };
  if (id === "bull") return { id: "bull", kind: "bull", label: "BULL" };
  const m = /^n(\d{1,2})$/.exec(id);
  const value = m ? clampInt(m[1], 1, 20, 20) : 20;
  return { id: `n${value}` as HalveItTargetId, kind: "number", value, label: String(value) };
}

export function halveItPresetTargets(preset: HalveItSequencePreset): HalveItTargetId[] {
  switch (preset) {
    case "extended9":
      return ["n20", "n19", "triple_any", "n18", "double_any", "n17", "n16", "n15", "bull"];
    case "expert12":
      return ["n20", "n19", "triple_any", "n18", "double_any", "n17", "n16", "n15", "n14", "n13", "n12", "bull"];
    case "numbers7":
      return ["n20", "n19", "n18", "n17", "n16", "n15", "bull"];
    case "classic7":
    default:
      return ["n20", "n19", "triple_any", "n18", "double_any", "n17", "bull"];
  }
}

export function halveItTargetSequence(rules: Pick<HalveItRules, "sequencePreset" | "customTargets" | "startMode">) {
  const base = Array.isArray(rules.customTargets) && rules.customTargets.length
    ? rules.customTargets.map((id) => targetFromId(id).id)
    : halveItPresetTargets(rules.sequencePreset || "classic7");
  const ids: HalveItTargetId[] = rules.startMode === "opening_visit" ? ["open", ...base.filter((id) => id !== "open")] : base.filter((id) => id !== "open");
  return ids.map(targetFromId);
}

export function halveItTargetScore(target: HalveItTarget, dart: GameDart) {
  const points = halveItDartPoints(dart);
  if (points <= 0) return 0;
  switch (target.kind) {
    case "open": return points;
    case "number": return dart.bed !== "OB" && dart.bed !== "IB" && dart.bed !== "MISS" && Number(dart.number) === Number(target.value) ? points : 0;
    case "double": return dart.bed === "D" ? points : 0;
    case "triple": return dart.bed === "T" ? points : 0;
    case "bull": return dart.bed === "OB" || dart.bed === "IB" ? points : 0;
    default: return 0;
  }
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

function normalizeTeams(players: Player[], teams: HalveItTeamConfig[] = []) {
  const valid = new Set(players.map((p) => p.id));
  const used = new Set<string>();
  const out: HalveItTeamConfig[] = [];
  (teams || []).forEach((team, index) => {
    const playerIds = Array.from(new Set((team?.playerIds || []).map(String)))
      .filter((id) => valid.has(id) && !used.has(id));
    if (!playerIds.length) return;
    playerIds.forEach((id) => used.add(id));
    out.push({
      ...team,
      id: String(team?.id || `team-${index + 1}`),
      name: String(team?.name || `Équipe ${index + 1}`),
      playerIds,
    });
  });
  return out;
}

function teamMaps(players: Player[], teams: HalveItTeamConfig[]) {
  const map: Record<string, string> = {};
  teams.forEach((team) => team.playerIds.forEach((id) => { map[id] = team.id; }));
  return map;
}

export function emptyHalveItStats(): HalveItPlayerStats {
  return {
    darts: 0, visits: 0, targetAttempts: 0, validHits: 0, misses: 0, wastedDarts: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0,
    successfulVisits: 0, failedVisits: 0, oneHitVisits: 0, twoHitVisits: 0, threeHitVisits: 0,
    perfectVisits: 0, halvingEvents: 0, pointsWon: 0, pointsLostByHalving: 0, netPoints: 0,
    bestVisit: 0, bestVisitHits: 0, currentSuccessStreak: 0, bestSuccessStreak: 0,
    targetsCleared: 0, targets: {},
  };
}

function entityRows(state: HalveItState): Omit<HalveItStanding, "rank" | "tied">[] {
  if (state.rules.participantMode === "teams" && state.teams.length) {
    return state.teams.map((team) => {
      const stats = team.playerIds.map((id) => state.statsByPlayer[id] || emptyHalveItStats());
      return {
        id: team.id,
        name: team.name,
        playerIds: [...team.playerIds],
        score: team.playerIds.reduce((sum, id) => sum + Number(state.scoresByPlayer[id] || 0), 0),
        hits: stats.reduce((sum, row) => sum + row.validHits, 0),
        halves: stats.reduce((sum, row) => sum + row.halvingEvents, 0),
        visits: stats.reduce((sum, row) => sum + row.visits, 0),
      };
    });
  }
  return state.players.map((player) => ({
    id: player.id,
    name: player.name,
    playerIds: [player.id],
    score: Number(state.scoresByPlayer[player.id] || 0),
    hits: state.statsByPlayer[player.id]?.validHits || 0,
    halves: state.statsByPlayer[player.id]?.halvingEvents || 0,
    visits: state.statsByPlayer[player.id]?.visits || 0,
  }));
}

function recalcStandings(state: HalveItState) {
  const rows = entityRows(state).sort((a, b) =>
    b.score - a.score || b.hits - a.hits || a.halves - b.halves || a.name.localeCompare(b.name, "fr")
  );
  state.standings = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    tied: index > 0 && row.score === rows[index - 1].score,
  }));
  const bestScore = rows[0]?.score;
  state.winnerIds = Number.isFinite(bestScore) ? rows.filter((row) => row.score === bestScore).map((row) => row.id) : [];
  state.tied = state.winnerIds.length > 1;
}

function currentTarget(state: HalveItState) {
  return state.targets[Math.max(0, Math.min(state.targets.length - 1, state.roundIndex))] || targetFromId("n20");
}

function finish(state: HalveItState) {
  state.finished = true;
  state.finishReason = "completed";
  state.finishedAt = Date.now();
  recalcStandings(state);
  return state;
}

export function createHalveItState(
  inputPlayers: Player[],
  rulesInput: Partial<HalveItRules> = {},
  inputTeams: HalveItTeamConfig[] = [],
  turnOrderInput?: string[]
): HalveItState {
  const players = normalizePlayers(inputPlayers);
  const rules: HalveItRules = {
    participantMode: rulesInput.participantMode === "teams" ? "teams" : "players",
    sequencePreset: (["classic7", "extended9", "expert12", "numbers7"] as string[]).includes(String(rulesInput.sequencePreset)) ? rulesInput.sequencePreset as HalveItSequencePreset : "classic7",
    customTargets: Array.isArray(rulesInput.customTargets) ? rulesInput.customTargets.map((id) => targetFromId(id).id) : undefined,
    startMode: rulesInput.startMode === "fixed" || rulesInput.startMode === "opening_visit" ? rulesInput.startMode : "zero",
    fixedStartingScore: clampInt(rulesInput.fixedStartingScore, 0, 9999, 40),
    rounding: rulesInput.rounding === "ceil" ? "ceil" : "floor",
  };
  const teams = normalizeTeams(players, inputTeams);
  const validIds = new Set(players.map((p) => p.id));
  const desired = Array.isArray(turnOrderInput) ? turnOrderInput.map(String).filter((id) => validIds.has(id)) : [];
  const turnOrder = Array.from(new Set([...desired, ...players.map((p) => p.id)]));
  const initialScore = rules.startMode === "fixed" ? rules.fixedStartingScore : 0;
  const state: HalveItState = {
    sport: "darts", mode: "halve_it", rules, players, teams,
    teamByPlayer: teamMaps(players, teams), turnOrder, activePlayerIndex: 0, roundIndex: 0,
    targets: halveItTargetSequence(rules),
    scoresByPlayer: Object.fromEntries(players.map((p) => [p.id, initialScore])),
    statsByPlayer: Object.fromEntries(players.map((p) => [p.id, emptyHalveItStats()])),
    history: [], standings: [], winnerIds: [], tied: false, finished: false, finishReason: null, startedAt: Date.now(),
  };
  recalcStandings(state);
  return state;
}

export function cloneHalveItState(state: HalveItState): HalveItState {
  return {
    ...state,
    rules: { ...state.rules, customTargets: state.rules.customTargets ? [...state.rules.customTargets] : undefined },
    players: state.players.map((p) => ({ ...p })),
    teams: state.teams.map((t) => ({ ...t, playerIds: [...t.playerIds] })),
    teamByPlayer: { ...state.teamByPlayer }, turnOrder: [...state.turnOrder], targets: state.targets.map((t) => ({ ...t })),
    scoresByPlayer: { ...state.scoresByPlayer },
    statsByPlayer: Object.fromEntries(Object.entries(state.statsByPlayer).map(([id, row]) => [id, {
      ...row, targets: Object.fromEntries(Object.entries(row.targets).map(([key, value]) => [key, { ...value }]))
    }])),
    history: state.history.map((v) => ({ ...v, target: { ...v.target }, darts: v.darts.map((d) => ({ ...d })), labels: [...v.labels] })),
    standings: state.standings.map((r) => ({ ...r, playerIds: [...r.playerIds] })), winnerIds: [...state.winnerIds],
  };
}

export function playHalveItVisit(previous: HalveItState, dartsInput: GameDart[]): HalveItState {
  if (previous.finished) return previous;
  const state = cloneHalveItState(previous);
  const playerId = state.turnOrder[state.activePlayerIndex];
  if (!playerId) return state;
  const target = currentTarget(state);
  const darts = (dartsInput || []).slice(0, 3).map((dart) => ({ ...dart }));
  while (darts.length < 3) darts.push({ bed: "MISS" });

  const validScores = darts.map((dart) => halveItTargetScore(target, dart));
  const validHits = validScores.filter((score) => score > 0).length;
  const gain = validScores.reduce((sum, score) => sum + score, 0);
  const scoreBefore = Number(state.scoresByPlayer[playerId] || 0);
  const mayHalve = target.kind !== "open";
  const halved = mayHalve && validHits === 0;
  const halvedScore = state.rules.rounding === "ceil" ? Math.ceil(scoreBefore / 2) : Math.floor(scoreBefore / 2);
  const scoreAfter = halved ? halvedScore : scoreBefore + gain;
  const loss = halved ? Math.max(0, scoreBefore - scoreAfter) : 0;
  const delta = scoreAfter - scoreBefore;
  state.scoresByPlayer[playerId] = scoreAfter;

  const stat = state.statsByPlayer[playerId] || emptyHalveItStats();
  stat.darts += 3;
  stat.visits += 1;
  stat.targetAttempts += 1;
  stat.validHits += validHits;
  stat.pointsWon += gain;
  stat.pointsLostByHalving += loss;
  stat.netPoints += delta;
  stat.bestVisit = Math.max(stat.bestVisit, gain);
  stat.bestVisitHits = Math.max(stat.bestVisitHits, validHits);

  if (target.kind === "open" || validHits > 0) {
    stat.successfulVisits += 1;
    stat.targetsCleared += 1;
    stat.currentSuccessStreak += 1;
    stat.bestSuccessStreak = Math.max(stat.bestSuccessStreak, stat.currentSuccessStreak);
    if (validHits === 1) stat.oneHitVisits += 1;
    if (validHits === 2) stat.twoHitVisits += 1;
    if (validHits === 3) { stat.threeHitVisits += 1; stat.perfectVisits += 1; }
  } else {
    stat.failedVisits += 1;
    stat.halvingEvents += 1;
    stat.currentSuccessStreak = 0;
  }

  darts.forEach((dart, index) => {
    const valid = validScores[index] > 0;
    if (dart.bed === "S") stat.singles += 1;
    else if (dart.bed === "D") stat.doubles += 1;
    else if (dart.bed === "T") stat.triples += 1;
    else if (dart.bed === "OB") stat.bulls += 1;
    else if (dart.bed === "IB") stat.dbulls += 1;
    else if (dart.bed === "MISS") stat.misses += 1;
    if (!valid) stat.wastedDarts += 1;
  });

  const key = String(target.id);
  const targetStat = stat.targets[key] || {
    targetId: target.id, label: target.label, attempts: 0, darts: 0, validHits: 0,
    pointsWon: 0, pointsLost: 0, failedVisits: 0, perfectVisits: 0, bestVisit: 0,
  };
  targetStat.attempts += 1;
  targetStat.darts += 3;
  targetStat.validHits += validHits;
  targetStat.pointsWon += gain;
  targetStat.pointsLost += loss;
  targetStat.failedVisits += halved ? 1 : 0;
  targetStat.perfectVisits += validHits === 3 ? 1 : 0;
  targetStat.bestVisit = Math.max(targetStat.bestVisit, gain);
  stat.targets[key] = targetStat;
  state.statsByPlayer[playerId] = stat;

  state.history.push({
    id: `halveit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), round: state.roundIndex + 1, target: { ...target }, targetId: target.id,
    targetLabel: target.label, playerId, teamId: state.teamByPlayer[playerId] || null,
    darts, labels: darts.map(halveItDartLabel), validHits, gain, halved, loss, delta, scoreBefore, scoreAfter,
  });

  recalcStandings(state);
  const currentIndex = state.activePlayerIndex;
  const nextIndex = (currentIndex + 1) % state.turnOrder.length;
  const wrapped = nextIndex <= currentIndex;
  if (wrapped) {
    state.roundIndex += 1;
    if (state.roundIndex >= state.targets.length) return finish(state);
  }
  state.activePlayerIndex = nextIndex;
  recalcStandings(state);
  return state;
}

export function getHalveItActivePlayerId(state: HalveItState) {
  return state.turnOrder[state.activePlayerIndex] || state.players[0]?.id || "";
}

export function getHalveItCurrentTarget(state: HalveItState) {
  return currentTarget(state);
}
