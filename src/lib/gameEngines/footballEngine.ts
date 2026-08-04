// =============================================================
// DARTS FOOTBALL — moteur pur et déterministe
// Terrain, possession, attaque/défense, tirs, gardien et penalties.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type FootballParticipantMode = "players" | "teams";
export type FootballVariant = "match" | "golden_goal" | "penalties" | "classic";
export type FootballTieBreaker = "draw" | "golden_goal" | "penalties";
export type FootballBotLevel = "easy" | "normal" | "hard";
export type FootballAction =
  | "attack"
  | "defense"
  | "shot"
  | "goalkeeper"
  | "penalty"
  | "classic_possession"
  | "classic_shot";

export type FootballTeamConfig = {
  id: string;
  name: string;
  color?: string;
  logoDataUrl?: string | null;
  playerIds: string[];
};

export type FootballConfigPayload = {
  mode: "football";
  participantMode: FootballParticipantMode;
  variant: FootballVariant;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: FootballTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botLevel: FootballBotLevel;
  halfRounds: number;
  extraRounds: number;
  tieBreaker: FootballTieBreaker;
  goalkeeperEnabled: boolean;
  missLosesPossession: boolean;
  randomOrder: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
};

export type FootballSide = {
  id: string;
  name: string;
  color: string;
  logoDataUrl?: string | null;
  playerIds: string[];
};

export type FootballPlayerStats = {
  darts: number;
  visits: number;
  hits: number;
  misses: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  attackVisits: number;
  defenseVisits: number;
  goalkeeperVisits: number;
  penaltyVisits: number;
  successfulActions: number;
  advances: number;
  passes: number;
  tackles: number;
  interceptions: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  saves: number;
  possessionWins: number;
  possessionLosses: number;
  bestProgress: number;
};

export type FootballVisitEvent = {
  type: string;
  label: string;
  value?: number;
};

export type FootballVisit = {
  id: string;
  createdAt: string;
  period: number;
  round: number;
  turn: number;
  playerId: string;
  sideId: string;
  action: FootballAction;
  targets: number[];
  saveTargets?: number[];
  possessionSideIdBefore: string;
  possessionSideIdAfter: string;
  ballBefore: number;
  ballAfter: number;
  scoreBefore: Record<string, number>;
  scoreAfter: Record<string, number>;
  darts: GameDart[];
  labels: string[];
  events: FootballVisitEvent[];
};

export type FootballPendingShot = {
  shooterId: string;
  attackingSideIndex: number;
  defendingSideIndex: number;
  target: number;
  saveTargets: number[];
  power: number;
  label: string;
};

export type FootballStage = "regulation" | "extra_time" | "penalties";
export type FootballPhase = "playing" | "goalkeeper" | "finished";

export type FootballState = {
  sport: "darts";
  mode: "football";
  config: FootballConfigPayload;
  players: Player[];
  sides: FootballSide[];
  sideByPlayer: Record<string, number>;
  activeSideIndex: number;
  sidePlayerCursor: [number, number];
  possessionSideIndex: number;
  ballPosition: number;
  period: number;
  roundInPeriod: number;
  completedTurnsInPeriod: number;
  turnCount: number;
  stage: FootballStage;
  phase: FootballPhase;
  pendingShot: FootballPendingShot | null;
  scoreBySide: Record<string, number>;
  penaltyAttemptsBySide: Record<string, boolean[]>;
  statsByPlayer: Record<string, FootballPlayerStats>;
  visits: FootballVisit[];
  winnerSideIds: string[];
  winnerPlayerIds: string[];
  draw: boolean;
  startedAt: number;
  finishedAt?: number;
};

const SIDE_COLORS = ["#35d0ff", "#ff5b77"];
const FIELD_MIN = 0;
const FIELD_MAX = 6;
const CENTER = 3;
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const ATTACK_PATTERNS = [
  [6, 10, 15], [4, 13, 18], [2, 8, 17], [5, 12, 20], [1, 9, 16], [3, 11, 19], [7, 14, 20],
];
const DEFENSE_PATTERNS = [
  [1, 5, 12], [3, 8, 16], [6, 14, 19], [2, 10, 17], [4, 11, 20], [7, 13, 18], [9, 15, 20],
];
const SHOT_PATTERNS = [
  [20, 18, 12], [6, 10, 15], [4, 13, 17], [2, 8, 19], [5, 11, 16],
];
const PENALTY_PATTERNS = [[20, 18, 12], [6, 10, 15], [4, 13, 17], [2, 8, 19], [5, 11, 16]];

function clampInt(value: any, min: number, max: number, fallback: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
function uniq(values: any[]): string[] {
  return Array.from(new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean)));
}
function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const picked = Math.floor(rng() * (index + 1));
    [out[index], out[picked]] = [out[picked], out[index]];
  }
  return out;
}
function emptyStats(): FootballPlayerStats {
  return {
    darts: 0, visits: 0, hits: 0, misses: 0, singles: 0, doubles: 0, triples: 0,
    bulls: 0, dbulls: 0, attackVisits: 0, defenseVisits: 0, goalkeeperVisits: 0,
    penaltyVisits: 0, successfulActions: 0, advances: 0, passes: 0, tackles: 0,
    interceptions: 0, shots: 0, shotsOnTarget: 0, goals: 0, saves: 0,
    possessionWins: 0, possessionLosses: 0, bestProgress: 0,
  };
}
function cleanPlayers(playersInput: Player[]): Player[] {
  const seen = new Set<string>();
  return (playersInput || []).map((player, index) => ({
    id: String(player?.id || `p${index + 1}`),
    name: String(player?.name || `Joueur ${index + 1}`),
  })).filter((player) => {
    if (!player.id || seen.has(player.id)) return false;
    seen.add(player.id);
    return true;
  });
}

export function normalizeFootballConfig(raw: Partial<FootballConfigPayload> | any = {}): FootballConfigPayload {
  const variant: FootballVariant = ["match", "golden_goal", "penalties", "classic"].includes(raw?.variant) ? raw.variant : "match";
  const participantMode: FootballParticipantMode = raw?.participantMode === "teams" ? "teams" : "players";
  const tieBreaker: FootballTieBreaker = ["draw", "golden_goal", "penalties"].includes(raw?.tieBreaker) ? raw.tieBreaker : "penalties";
  const botLevel: FootballBotLevel = raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal";
  return {
    mode: "football",
    participantMode,
    variant,
    selectedIds: uniq(raw?.selectedIds || []),
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets && typeof raw.playerDartSets === "object" ? raw.playerDartSets : {},
    botIds: uniq(raw?.botIds || []),
    botLevel,
    halfRounds: clampInt(raw?.halfRounds, 2, 20, 5),
    extraRounds: clampInt(raw?.extraRounds, 1, 10, 3),
    tieBreaker,
    goalkeeperEnabled: raw?.goalkeeperEnabled !== false,
    missLosesPossession: raw?.missLosesPossession !== false,
    randomOrder: raw?.randomOrder === true,
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function buildSides(players: Player[], config: FootballConfigPayload, rng: () => number): FootballSide[] {
  if (config.participantMode === "teams" && config.teamConfigs?.length >= 2) {
    const validIds = new Set(players.map((player) => player.id));
    return config.teamConfigs.slice(0, 2).map((team, index) => ({
      id: String(team?.id || `side-${index + 1}`),
      name: String(team?.name || `Équipe ${index + 1}`),
      color: String(team?.color || SIDE_COLORS[index]),
      logoDataUrl: team?.logoDataUrl || null,
      playerIds: uniq(team?.playerIds || []).filter((id) => validIds.has(id)),
    }));
  }
  const ordered = config.randomOrder ? shuffle(players, rng) : [...players];
  return [0, 1].map((index) => ({
    id: `side-${index + 1}`,
    name: ordered[index]?.name || `Joueur ${index + 1}`,
    color: SIDE_COLORS[index],
    playerIds: ordered[index] ? [ordered[index].id] : [],
  }));
}

export function createFootballState(playersInput: Player[], configInput: FootballConfigPayload, rng: () => number = Math.random): FootballState {
  const config = normalizeFootballConfig(configInput);
  let players = cleanPlayers(playersInput);
  if (players.length < 2) players = [{ id: "p1", name: "Joueur 1" }, { id: "p2", name: "Joueur 2" }];
  const sides = buildSides(players, config, rng);
  const sideByPlayer: Record<string, number> = {};
  sides.forEach((side, sideIndex) => side.playerIds.forEach((id) => { sideByPlayer[id] = sideIndex; }));
  const scoreBySide = Object.fromEntries(sides.map((side) => [side.id, 0]));
  const penaltyAttemptsBySide = Object.fromEntries(sides.map((side) => [side.id, []]));
  const statsByPlayer = Object.fromEntries(players.map((player) => [player.id, emptyStats()]));
  return {
    sport: "darts", mode: "football", config, players, sides, sideByPlayer,
    activeSideIndex: 0, sidePlayerCursor: [0, 0], possessionSideIndex: 0,
    ballPosition: CENTER, period: 1, roundInPeriod: 1, completedTurnsInPeriod: 0,
    turnCount: 0, stage: config.variant === "penalties" ? "penalties" : "regulation",
    phase: "playing", pendingShot: null, scoreBySide, penaltyAttemptsBySide,
    statsByPlayer, visits: [], winnerSideIds: [], winnerPlayerIds: [], draw: false,
    startedAt: Date.now(),
  };
}

export function cloneFootballState(state: FootballState): FootballState {
  return JSON.parse(JSON.stringify(state));
}

export function footballVariantLabel(value: FootballVariant): string {
  if (value === "golden_goal") return "Golden Goal";
  if (value === "penalties") return "Tirs au but";
  if (value === "classic") return "Classic";
  return "Match";
}
export function footballTieBreakerLabel(value: FootballTieBreaker): string {
  if (value === "golden_goal") return "Golden Goal";
  if (value === "penalties") return "Tirs au but";
  return "Match nul";
}
export function footballActionLabel(action: FootballAction): string {
  const labels: Record<FootballAction, string> = {
    attack: "ATTAQUE", defense: "DÉFENSE", shot: "TIR", goalkeeper: "GARDIEN",
    penalty: "PENALTY", classic_possession: "RÉCUPÉRER", classic_shot: "FRAPPE",
  };
  return labels[action];
}
export function footballZoneLabel(position: number): string {
  if (position <= 0) return "But A";
  if (position === 1) return "Surface A";
  if (position === 2) return "Camp A";
  if (position === 3) return "Milieu";
  if (position === 4) return "Camp B";
  if (position === 5) return "Surface B";
  return "But B";
}
export function getFootballActivePlayer(state: FootballState): Player | null {
  const side = state.sides[state.activeSideIndex];
  if (!side?.playerIds?.length) return null;
  const cursor = state.sidePlayerCursor[state.activeSideIndex] % side.playerIds.length;
  return state.players.find((player) => player.id === side.playerIds[cursor]) || null;
}
export function getFootballActiveSide(state: FootballState): FootballSide {
  return state.sides[state.activeSideIndex];
}
export function getFootballPossessionSide(state: FootballState): FootballSide {
  return state.sides[state.possessionSideIndex];
}
function opponent(index: number): number { return index === 0 ? 1 : 0; }
function direction(sideIndex: number): number { return sideIndex === 0 ? 1 : -1; }
function inOpponentSurface(state: FootballState, sideIndex: number): boolean {
  return sideIndex === 0 ? state.ballPosition >= 5 : state.ballPosition <= 1;
}
function safePattern(patterns: number[][], index: number): number[] {
  return [...patterns[Math.abs(index) % patterns.length]];
}

export function getFootballAction(state: FootballState): FootballAction {
  if (state.phase === "goalkeeper") return "goalkeeper";
  if (state.stage === "penalties" || state.config.variant === "penalties") return "penalty";
  if (state.config.variant === "classic") return state.activeSideIndex === state.possessionSideIndex ? "classic_shot" : "classic_possession";
  if (state.activeSideIndex !== state.possessionSideIndex) return "defense";
  if (inOpponentSurface(state, state.possessionSideIndex)) return "shot";
  return "attack";
}

export function getFootballTargets(state: FootballState, actionInput?: FootballAction): number[] {
  const action = actionInput || getFootballAction(state);
  const seed = state.turnCount + state.period * 3 + state.activeSideIndex;
  if (action === "attack") return safePattern(ATTACK_PATTERNS, seed);
  if (action === "defense") return safePattern(DEFENSE_PATTERNS, seed);
  if (action === "shot") return safePattern(SHOT_PATTERNS, seed);
  if (action === "goalkeeper") return [...(state.pendingShot?.saveTargets || [])];
  if (action === "penalty") return safePattern(PENALTY_PATTERNS, Math.floor(state.turnCount / 2));
  if (action === "classic_possession") return [];
  return Array.from({ length: 20 }, (_, index) => index + 1);
}

function dartLabel(dart: GameDart): string {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${Number(dart.number || 0)}`;
}
function multiplierOf(dart: GameDart): number {
  if (dart.bed === "T") return 3;
  if (dart.bed === "D" || dart.bed === "IB") return 2;
  return 1;
}
function targetHit(dart: GameDart, targets: number[]): boolean {
  return Boolean(dart?.number && targets.includes(Number(dart.number)));
}
function neighborTargets(target: number): number[] {
  const index = BOARD_ORDER.indexOf(target);
  if (index < 0) return [target];
  const left = BOARD_ORDER[(index - 1 + BOARD_ORDER.length) % BOARD_ORDER.length];
  const right = BOARD_ORDER[(index + 1) % BOARD_ORDER.length];
  return [target, left, right];
}
function updateBasicStats(stats: FootballPlayerStats, dart: GameDart) {
  stats.darts += 1;
  if (!dart || dart.bed === "MISS") { stats.misses += 1; return; }
  stats.hits += 1;
  if (dart.bed === "S") stats.singles += 1;
  else if (dart.bed === "D") stats.doubles += 1;
  else if (dart.bed === "T") stats.triples += 1;
  else if (dart.bed === "OB") stats.bulls += 1;
  else if (dart.bed === "IB") stats.dbulls += 1;
}
function addGoal(state: FootballState, sideIndex: number, scorerId: string, events: FootballVisitEvent[]) {
  const side = state.sides[sideIndex];
  state.scoreBySide[side.id] = Number(state.scoreBySide[side.id] || 0) + 1;
  const scorerStats = state.statsByPlayer[scorerId];
  if (scorerStats) scorerStats.goals += 1;
  events.push({ type: "goal", label: `⚽ BUT ${side.name.toUpperCase()} !`, value: 1 });
  state.possessionSideIndex = opponent(sideIndex);
  state.ballPosition = CENTER;
  state.pendingShot = null;
  state.phase = "playing";
  state.activeSideIndex = opponent(sideIndex);
}
function finish(state: FootballState, winnerSideIndexes: number[], draw = false) {
  state.phase = "finished";
  state.finishedAt = Date.now();
  state.draw = draw;
  state.winnerSideIds = winnerSideIndexes.map((index) => state.sides[index]?.id).filter(Boolean);
  state.winnerPlayerIds = winnerSideIndexes.flatMap((index) => state.sides[index]?.playerIds || []);
}
function scoreValue(state: FootballState, sideIndex: number): number {
  return Number(state.scoreBySide[state.sides[sideIndex].id] || 0);
}
function maybeFinishAfterGoal(state: FootballState, scoringSide: number) {
  if (state.config.variant === "golden_goal" || state.stage === "extra_time") finish(state, [scoringSide], false);
}
function beginPenalties(state: FootballState) {
  state.stage = "penalties";
  state.phase = "playing";
  state.period = 3;
  state.roundInPeriod = 1;
  state.completedTurnsInPeriod = 0;
  state.activeSideIndex = 0;
  state.possessionSideIndex = 0;
  state.ballPosition = CENTER;
  state.pendingShot = null;
}
function finishRegulationOrAdvance(state: FootballState) {
  if (state.config.variant !== "match" || state.phase === "goalkeeper" || state.phase === "finished") return;
  const maxTurns = (state.stage === "extra_time" ? state.config.extraRounds : state.config.halfRounds) * 2;
  if (state.completedTurnsInPeriod < maxTurns) return;
  const score0 = scoreValue(state, 0);
  const score1 = scoreValue(state, 1);
  if (state.stage === "extra_time") {
    if (score0 !== score1) finish(state, [score0 > score1 ? 0 : 1], false);
    else beginPenalties(state);
    return;
  }
  if (state.period === 1) {
    state.period = 2;
    state.roundInPeriod = 1;
    state.completedTurnsInPeriod = 0;
    state.activeSideIndex = 1;
    state.possessionSideIndex = 1;
    state.ballPosition = CENTER;
    return;
  }
  if (score0 !== score1) { finish(state, [score0 > score1 ? 0 : 1], false); return; }
  if (state.config.tieBreaker === "draw") { finish(state, [], true); return; }
  if (state.config.tieBreaker === "penalties") { beginPenalties(state); return; }
  state.stage = "extra_time";
  state.period = 3;
  state.roundInPeriod = 1;
  state.completedTurnsInPeriod = 0;
  state.activeSideIndex = 0;
  state.possessionSideIndex = 0;
  state.ballPosition = CENTER;
}
function advanceNormalTurn(state: FootballState, currentSide: number) {
  state.turnCount += 1;
  state.completedTurnsInPeriod += 1;
  state.roundInPeriod = Math.floor(state.completedTurnsInPeriod / 2) + 1;
  const side = state.sides[currentSide];
  if (side?.playerIds?.length) state.sidePlayerCursor[currentSide] = (state.sidePlayerCursor[currentSide] + 1) % side.playerIds.length;
  if (state.phase === "playing" && state.activeSideIndex === currentSide) state.activeSideIndex = opponent(currentSide);
  if (state.phase === "finished") return;
  if (state.config.variant === "golden_goal" && state.turnCount >= state.config.halfRounds * 4) {
    const s0 = scoreValue(state, 0), s1 = scoreValue(state, 1);
    if (s0 === s1) beginPenalties(state); else finish(state, [s0 > s1 ? 0 : 1], false);
    return;
  }
  finishRegulationOrAdvance(state);
}
function penaltyFinished(state: FootballState): boolean {
  const a = state.penaltyAttemptsBySide[state.sides[0].id] || [];
  const b = state.penaltyAttemptsBySide[state.sides[1].id] || [];
  if (a.length < 5 || b.length < 5) return false;
  if (a.length === b.length && a.filter(Boolean).length !== b.filter(Boolean).length) return true;
  return a.length > 5 && b.length > 5 && a.length === b.length && a.filter(Boolean).length !== b.filter(Boolean).length;
}
function playPenalty(state: FootballState, playerId: string, darts: GameDart[], targets: number[], events: FootballVisitEvent[]) {
  const sideIndex = state.activeSideIndex;
  const side = state.sides[sideIndex];
  const stats = state.statsByPlayer[playerId];
  stats.penaltyVisits += 1;
  stats.shots += 1;
  let scored = false;
  for (const dart of darts) {
    if (dart.bed === "IB" || dart.bed === "OB" || targetHit(dart, targets)) { scored = true; break; }
  }
  state.penaltyAttemptsBySide[side.id].push(scored);
  if (scored) {
    state.scoreBySide[side.id] += 1;
    stats.goals += 1; stats.shotsOnTarget += 1; stats.successfulActions += 1;
    events.push({ type: "penalty_goal", label: `⚽ Penalty marqué par ${side.name}` });
  } else events.push({ type: "penalty_miss", label: `✕ Penalty manqué par ${side.name}` });
  state.turnCount += 1;
  state.sidePlayerCursor[sideIndex] = (state.sidePlayerCursor[sideIndex] + 1) % Math.max(1, side.playerIds.length);
  state.activeSideIndex = opponent(sideIndex);
  state.possessionSideIndex = state.activeSideIndex;
  state.roundInPeriod = Math.floor(state.turnCount / 2) + 1;
  if (penaltyFinished(state)) {
    const g0 = state.penaltyAttemptsBySide[state.sides[0].id].filter(Boolean).length;
    const g1 = state.penaltyAttemptsBySide[state.sides[1].id].filter(Boolean).length;
    finish(state, [g0 > g1 ? 0 : 1], false);
  }
}

export function playFootballVisit(stateInput: FootballState, dartsInput: GameDart[]): FootballState {
  const state = cloneFootballState(stateInput);
  if (state.phase === "finished") return state;
  const darts = (dartsInput || []).slice(0, 3);
  if (!darts.length) return state;
  const currentSide = state.activeSideIndex;
  const player = getFootballActivePlayer(state);
  if (!player) return state;
  const playerId = player.id;
  const side = state.sides[currentSide];
  const actionAtStart = getFootballAction(state);
  const targetsAtStart = getFootballTargets(state, actionAtStart);
  const scoreBefore = { ...state.scoreBySide };
  const ballBefore = state.ballPosition;
  const possessionBefore = state.sides[state.possessionSideIndex].id;
  const stats = state.statsByPlayer[playerId] || (state.statsByPlayer[playerId] = emptyStats());
  stats.visits += 1;
  if (actionAtStart === "attack" || actionAtStart === "shot" || actionAtStart === "classic_shot") stats.attackVisits += 1;
  if (actionAtStart === "defense" || actionAtStart === "classic_possession") stats.defenseVisits += 1;
  if (actionAtStart === "goalkeeper") stats.goalkeeperVisits += 1;
  const labels = darts.map(dartLabel);
  const events: FootballVisitEvent[] = [];
  let successful = 0;
  let progressThisVisit = 0;
  let goalScoredBy: number | null = null;
  let goalkeeperResolved = false;
  darts.forEach((dart) => updateBasicStats(stats, dart));

  if (actionAtStart === "penalty") {
    playPenalty(state, playerId, darts, targetsAtStart, events);
  } else if (actionAtStart === "goalkeeper") {
    const pending = state.pendingShot;
    const saveTargets = pending?.saveTargets || [];
    const savingDart = darts.find((dart) => dart.bed === "IB" || dart.bed === "OB" || targetHit(dart, saveTargets));
    if (pending && savingDart) {
      successful += 1; stats.saves += 1; stats.successfulActions += 1;
      state.possessionSideIndex = currentSide;
      const counter = savingDart.bed === "T" || savingDart.bed === "IB" ? 2 : savingDart.bed === "D" ? 1 : 0;
      state.ballPosition = currentSide === 0 ? 1 + counter : 5 - counter;
      state.pendingShot = null; state.phase = "playing";
      events.push({ type: "save", label: `🧤 Arrêt de ${player.name}` });
      if (counter) events.push({ type: "counter", label: `Contre-attaque +${counter}` });
      state.activeSideIndex = pending.attackingSideIndex;
    } else if (pending) {
      addGoal(state, pending.attackingSideIndex, pending.shooterId, events);
      goalScoredBy = pending.attackingSideIndex;
    }
    goalkeeperResolved = true;
    state.turnCount += 1;
    state.sidePlayerCursor[currentSide] = (state.sidePlayerCursor[currentSide] + 1) % Math.max(1, side.playerIds.length);
    if (goalScoredBy !== null) maybeFinishAfterGoal(state, goalScoredBy);
    if ((state.phase as FootballPhase) !== "finished") finishRegulationOrAdvance(state);
  } else if (actionAtStart === "classic_possession") {
    const won = darts.some((dart) => dart.bed === "OB" || dart.bed === "IB");
    if (won) {
      successful += 1; stats.possessionWins += 1; stats.interceptions += 1; stats.successfulActions += 1;
      state.possessionSideIndex = currentSide; state.ballPosition = CENTER;
      events.push({ type: "possession", label: `⚡ ${side.name} récupère le ballon` });
    } else events.push({ type: "failed", label: "Bull manqué : possession inchangée" });
    advanceNormalTurn(state, currentSide);
  } else if (actionAtStart === "classic_shot") {
    stats.shots += 1;
    const scoredDart = darts.find((dart) => dart.bed === "D" || dart.bed === "IB");
    if (scoredDart) {
      successful += 1; stats.shotsOnTarget += 1; stats.successfulActions += 1;
      addGoal(state, currentSide, playerId, events); goalScoredBy = currentSide;
      maybeFinishAfterGoal(state, currentSide);
    } else {
      state.possessionSideIndex = opponent(currentSide);
      events.push({ type: "shot_miss", label: "Frappe manquée : ballon perdu" });
    }
    advanceNormalTurn(state, currentSide);
  } else {
    for (let dartIndex = 0; dartIndex < darts.length && (state.phase as FootballPhase) !== "finished"; dartIndex += 1) {
      const dart = darts[dartIndex];
      const action = getFootballAction(state);
      const targets = getFootballTargets(state, action);
      const isBull = dart.bed === "OB" || dart.bed === "IB";
      const valid = isBull || targetHit(dart, targets);
      if (action === "attack") {
        if (!valid) { events.push({ type: "miss", label: `${dartLabel(dart)} hors cible` }); continue; }
        const step = isBull ? (dart.bed === "IB" ? 3 : 2) : multiplierOf(dart);
        const before = state.ballPosition;
        state.ballPosition = Math.max(FIELD_MIN, Math.min(FIELD_MAX, state.ballPosition + direction(currentSide) * step));
        const moved = Math.abs(state.ballPosition - before);
        progressThisVisit += moved; successful += 1; stats.advances += moved; stats.passes += 1;
        events.push({ type: "advance", label: `${dartLabel(dart)} : progression +${moved}`, value: moved });
      } else if (action === "defense") {
        if (!valid) { events.push({ type: "miss", label: `${dartLabel(dart)} : pressing manqué` }); continue; }
        successful += 1; stats.tackles += 1;
        const power = isBull ? (dart.bed === "IB" ? 3 : 2) : multiplierOf(dart);
        if (power >= 2) {
          const oldPossession = state.possessionSideIndex;
          state.possessionSideIndex = currentSide;
          stats.interceptions += 1; stats.possessionWins += 1;
          const oldPlayer = state.sides[oldPossession]?.playerIds?.[state.sidePlayerCursor[oldPossession] % Math.max(1, state.sides[oldPossession]?.playerIds?.length || 1)];
          if (oldPlayer && state.statsByPlayer[oldPlayer]) state.statsByPlayer[oldPlayer].possessionLosses += 1;
          const counter = power >= 3 ? 2 : 1;
          state.ballPosition = Math.max(FIELD_MIN, Math.min(FIELD_MAX, state.ballPosition + direction(currentSide) * counter));
          events.push({ type: "interception", label: `${dartLabel(dart)} : interception + contre ${counter}` });
        } else {
          const before = state.ballPosition;
          state.ballPosition = Math.max(FIELD_MIN, Math.min(FIELD_MAX, state.ballPosition - direction(state.possessionSideIndex)));
          events.push({ type: "clearance", label: `${dartLabel(dart)} : ballon repoussé`, value: Math.abs(before - state.ballPosition) });
        }
      } else if (action === "shot") {
        stats.shots += 1;
        if (!valid) { events.push({ type: "shot_miss", label: `${dartLabel(dart)} : tir non cadré` }); continue; }
        successful += 1; stats.shotsOnTarget += 1;
        const target = dart.number || targets[0] || 20;
        const power = isBull ? (dart.bed === "IB" ? 4 : 2) : multiplierOf(dart);
        if (!state.config.goalkeeperEnabled || power >= 3 || dart.bed === "IB") {
          addGoal(state, currentSide, playerId, events); goalScoredBy = currentSide;
          maybeFinishAfterGoal(state, currentSide);
        } else {
          state.pendingShot = {
            shooterId: playerId, attackingSideIndex: currentSide, defendingSideIndex: opponent(currentSide),
            target, saveTargets: neighborTargets(target), power, label: dartLabel(dart),
          };
          state.phase = "goalkeeper";
          state.activeSideIndex = opponent(currentSide);
          events.push({ type: "shot_on_target", label: `🥅 ${dartLabel(dart)} : tir cadré, arrêt possible` });
        }
        break;
      }
    }
    if (successful > 0) stats.successfulActions += successful;
    stats.bestProgress = Math.max(stats.bestProgress, progressThisVisit);
    if (successful === 0 && state.config.missLosesPossession && actionAtStart === "attack" && state.phase === "playing") {
      const old = state.possessionSideIndex;
      state.possessionSideIndex = opponent(old);
      stats.possessionLosses += 1;
      events.push({ type: "turnover", label: "Aucune cible : ballon perdu" });
    }
    if (state.phase === "playing" || state.phase === "goalkeeper") advanceNormalTurn(state, currentSide);
    if (goalScoredBy !== null && (state.phase as FootballPhase) !== "finished") maybeFinishAfterGoal(state, goalScoredBy);
  }

  const visit: FootballVisit = {
    id: `football-visit-${Date.now()}-${state.visits.length + 1}`,
    createdAt: new Date().toISOString(), period: state.period, round: state.roundInPeriod,
    turn: state.turnCount, playerId, sideId: side.id, action: actionAtStart,
    targets: targetsAtStart, saveTargets: stateInput.pendingShot?.saveTargets || undefined,
    possessionSideIdBefore: possessionBefore,
    possessionSideIdAfter: state.sides[state.possessionSideIndex]?.id || possessionBefore,
    ballBefore, ballAfter: state.ballPosition, scoreBefore, scoreAfter: { ...state.scoreBySide },
    darts, labels, events,
  };
  state.visits.push(visit);
  return state;
}

export function footballTacticalHint(state: FootballState): string {
  if (state.phase === "finished") return state.draw ? "Match nul." : "Match terminé.";
  const action = getFootballAction(state);
  const targets = getFootballTargets(state, action);
  if (action === "attack") return `Construis l’attaque : ${targets.join(" · ")} — S +1, D +2, T +3.`;
  if (action === "defense") return `Défends : ${targets.join(" · ")} — D intercepte, T lance la contre-attaque.`;
  if (action === "shot") return `Frappe : ${targets.join(" · ")} — T ou DBULL = but direct.`;
  if (action === "goalkeeper") return `Gardien : ${targets.join(" · ")} — touche une zone pour arrêter.`;
  if (action === "penalty") return `Penalty : ${targets.join(" · ")} — une cible suffit pour marquer.`;
  if (action === "classic_possession") return "Touche BULL ou DBULL pour récupérer le ballon.";
  return "Avec la possession, touche un DOUBLE ou DBULL pour marquer.";
}

export function footballAccuracy(stats: Partial<FootballPlayerStats> | undefined | null): number {
  const darts = Number(stats?.darts || 0);
  return darts ? Math.round((Number(stats?.successfulActions || 0) / darts) * 1000) / 10 : 0;
}

export function buildFootballMatchStats(state: FootballState) {
  const rows = Object.values(state.statsByPlayer || {});
  const total = (key: keyof FootballPlayerStats) => rows.reduce((sum, stats) => sum + Number(stats?.[key] || 0), 0);
  return {
    durationMs: Math.max(0, Number((state.finishedAt || Date.now()) - state.startedAt)),
    totalDarts: total("darts"), totalVisits: total("visits"), goals: total("goals"),
    shots: total("shots"), shotsOnTarget: total("shotsOnTarget"), saves: total("saves"),
    tackles: total("tackles"), interceptions: total("interceptions"), advances: total("advances"),
    successfulActions: total("successfulActions"), misses: total("misses"),
    scoreBySide: { ...state.scoreBySide }, periodsPlayed: state.period, stage: state.stage,
  };
}

function randomOffTarget(targets: number[], rng: () => number): number {
  const choices = Array.from({ length: 20 }, (_, index) => index + 1).filter((number) => !targets.includes(number));
  return choices[Math.floor(rng() * choices.length)] || 1;
}
export function pickFootballBotDarts(state: FootballState, levelInput?: FootballBotLevel, rng: () => number = Math.random): GameDart[] {
  const level = levelInput || state.config.botLevel;
  const action = getFootballAction(state);
  const targets = getFootballTargets(state, action);
  const accuracy = level === "hard" ? 0.78 : level === "easy" ? 0.38 : 0.58;
  const darts: GameDart[] = [];
  for (let index = 0; index < 3; index += 1) {
    const hit = rng() < accuracy;
    if (action === "classic_possession") {
      darts.push(hit ? { bed: rng() < 0.18 ? "IB" : "OB" } : { bed: "MISS" });
      continue;
    }
    if (action === "classic_shot") {
      darts.push(hit ? { bed: "D", number: 1 + Math.floor(rng() * 20) } : { bed: "S", number: 1 + Math.floor(rng() * 20) });
      continue;
    }
    if (!hit) {
      darts.push(rng() < 0.2 ? { bed: "MISS" } : { bed: "S", number: randomOffTarget(targets, rng) });
      continue;
    }
    const target = targets[Math.floor(rng() * Math.max(1, targets.length))] || 20;
    let bed: "S" | "D" | "T" = "S";
    const roll = rng();
    if (level === "hard" && roll < 0.25) bed = "T";
    else if (roll < (level === "easy" ? 0.18 : 0.35)) bed = "D";
    darts.push({ bed, number: target });
    if ((action === "shot" && bed === "T") || action === "penalty") break;
  }
  return darts;
}
