// =============================================================
// BOWLING DARTS — moteur pur
// 1 roll de bowling = 1 volée (1 à 3 darts, UI standard = 3 darts)
// Scoring bowling officiel sur 10 frames, strikes/spares et 10e frame bonus.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type BowlingParticipantMode = "players" | "teams";
export type BowlingScoreInputMethod = "keypad" | "dartboard";
export type BowlingDifficulty = "easy" | "normal" | "hard";

export type BowlingTeamConfig = {
  id: string;
  name: string;
  color?: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type BowlingConfigPayload = {
  mode: "bowling";
  participantMode: BowlingParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: BowlingTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  setsToWin: 1 | 2 | 3;
  difficulty: BowlingDifficulty;
  bullStrike: boolean;
  doubleSpare: boolean;
  randomOrder: boolean;
  scoreInputMethod: BowlingScoreInputMethod;
};

export type BowlingRules = Pick<
  BowlingConfigPayload,
  "participantMode" | "setsToWin" | "difficulty" | "bullStrike" | "doubleSpare"
>;

export type BowlingFrame = {
  index: number;
  rolls: number[];
  visitIds: string[];
  complete: boolean;
  strike: boolean;
  spare: boolean;
  open: boolean;
  score: number | null;
  cumulative: number | null;
};

export type BowlingPlayerStats = {
  darts: number;
  visits: number;
  pins: number;
  strikes: number;
  spares: number;
  openFrames: number;
  gutters: number;
  strikeStreak: number;
  bestStrikeStreak: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  singles: number;
  bestRoll: number;
  highGame: number;
  gamesPlayed: number;
  gamesWon: number;
};

export type BowlingVisit = {
  id: string;
  createdAt: string;
  gameNo: number;
  playerId: string;
  teamId: string | null;
  frame: number;
  roll: number;
  darts: GameDart[];
  labels: string[];
  pins: number;
  maxPins: number;
  strike: boolean;
  spare: boolean;
  bullStrike: boolean;
  doubleSpare: boolean;
};

export type BowlingStanding = {
  id: string;
  name: string;
  playerIds: string[];
  score: number;
  setWins: number;
  strikes: number;
  spares: number;
  rank: number;
  tied: boolean;
};

export type BowlingCompletedGame = {
  gameNo: number;
  scoresByPlayer: Record<string, number>;
  entityScores: Record<string, number>;
  winnerIds: string[];
  tied: boolean;
  completedAt: number;
};

export type BowlingState = {
  sport: "darts";
  mode: "bowling";
  rules: BowlingRules;
  players: Player[];
  teams: BowlingTeamConfig[];
  teamByPlayer: Record<string, string>;
  turnOrder: string[];
  activePlayerIndex: number;
  gameNo: number;
  framesByPlayer: Record<string, BowlingFrame[]>;
  statsByPlayer: Record<string, BowlingPlayerStats>;
  history: BowlingVisit[];
  completedGames: BowlingCompletedGame[];
  setWinsByEntity: Record<string, number>;
  standings: BowlingStanding[];
  winnerIds: string[];
  tied: boolean;
  finished: boolean;
  startedAt: number;
  finishedAt?: number;
};

function cleanPlayers(players: Player[]) {
  const seen = new Set<string>();
  const out = (players || []).filter((player: any) => {
    const id = String(player?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((player: any, index) => ({ id: String(player.id), name: String(player.name || `Joueur ${index + 1}`) }));
  return out.length ? out : [{ id: "p1", name: "Joueur 1" }];
}

function cleanTeams(players: Player[], teams: BowlingTeamConfig[] = []) {
  const valid = new Set(players.map((player) => player.id));
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

export function emptyBowlingStats(): BowlingPlayerStats {
  return {
    darts: 0, visits: 0, pins: 0, strikes: 0, spares: 0, openFrames: 0, gutters: 0,
    strikeStreak: 0, bestStrikeStreak: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0,
    misses: 0, singles: 0, bestRoll: 0, highGame: 0, gamesPlayed: 0, gamesWon: 0,
  };
}

export function createBowlingFrames(): BowlingFrame[] {
  return Array.from({ length: 10 }, (_, index) => ({
    index: index + 1, rolls: [], visitIds: [], complete: false, strike: false, spare: false,
    open: false, score: null, cumulative: null,
  }));
}

function teamMap(teams: BowlingTeamConfig[]) {
  const out: Record<string, string> = {};
  teams.forEach((team) => team.playerIds.forEach((id) => { out[id] = team.id; }));
  return out;
}

function entityIds(state: BowlingState) {
  return state.rules.participantMode === "teams" && state.teams.length
    ? state.teams.map((team) => team.id)
    : state.players.map((player) => player.id);
}

function entityRows(state: BowlingState) {
  if (state.rules.participantMode === "teams" && state.teams.length) {
    return state.teams.map((team) => {
      const members = team.playerIds;
      return {
        id: team.id,
        name: team.name,
        playerIds: [...members],
        score: members.reduce((sum, id) => sum + getBowlingPlayerScore(state, id), 0),
        setWins: Number(state.setWinsByEntity[team.id] || 0),
        strikes: members.reduce((sum, id) => sum + Number(state.statsByPlayer[id]?.strikes || 0), 0),
        spares: members.reduce((sum, id) => sum + Number(state.statsByPlayer[id]?.spares || 0), 0),
      };
    });
  }
  return state.players.map((player) => ({
    id: player.id,
    name: player.name,
    playerIds: [player.id],
    score: getBowlingPlayerScore(state, player.id),
    setWins: Number(state.setWinsByEntity[player.id] || 0),
    strikes: Number(state.statsByPlayer[player.id]?.strikes || 0),
    spares: Number(state.statsByPlayer[player.id]?.spares || 0),
  }));
}

function recalcStandings(state: BowlingState) {
  const rows = entityRows(state).sort((a, b) =>
    b.setWins - a.setWins || b.score - a.score || b.strikes - a.strikes || b.spares - a.spares || a.name.localeCompare(b.name, "fr")
  );
  state.standings = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    tied: index > 0 && row.setWins === rows[index - 1].setWins && row.score === rows[index - 1].score,
  }));
}

export function createBowlingState(
  playersInput: Player[],
  rulesInput: Partial<BowlingRules> = {},
  teamsInput: BowlingTeamConfig[] = [],
  turnOrderInput: string[] = [],
): BowlingState {
  const players = cleanPlayers(playersInput);
  const teams = cleanTeams(players, teamsInput);
  const participantMode: BowlingParticipantMode = rulesInput.participantMode === "teams" && teams.length ? "teams" : "players";
  const rules: BowlingRules = {
    participantMode,
    setsToWin: rulesInput.setsToWin === 2 || rulesInput.setsToWin === 3 ? rulesInput.setsToWin : 1,
    difficulty: rulesInput.difficulty === "easy" || rulesInput.difficulty === "hard" ? rulesInput.difficulty : "normal",
    bullStrike: rulesInput.bullStrike !== false,
    doubleSpare: rulesInput.doubleSpare !== false,
  };
  const valid = new Set(players.map((player) => player.id));
  const order = Array.from(new Set((turnOrderInput || []).map(String))).filter((id) => valid.has(id));
  players.forEach((player) => { if (!order.includes(player.id)) order.push(player.id); });
  const framesByPlayer: Record<string, BowlingFrame[]> = {};
  const statsByPlayer: Record<string, BowlingPlayerStats> = {};
  players.forEach((player) => { framesByPlayer[player.id] = createBowlingFrames(); statsByPlayer[player.id] = emptyBowlingStats(); });
  const setWinsByEntity: Record<string, number> = {};
  (participantMode === "teams" ? teams.map((team) => team.id) : players.map((player) => player.id)).forEach((id) => { setWinsByEntity[id] = 0; });
  const state: BowlingState = {
    sport: "darts", mode: "bowling", rules, players, teams, teamByPlayer: teamMap(teams), turnOrder: order,
    activePlayerIndex: 0, gameNo: 1, framesByPlayer, statsByPlayer, history: [], completedGames: [], setWinsByEntity,
    standings: [], winnerIds: [], tied: false, finished: false, startedAt: Date.now(),
  };
  recalcAllScores(state);
  recalcStandings(state);
  return state;
}

export function cloneBowlingState(state: BowlingState): BowlingState {
  return JSON.parse(JSON.stringify(state));
}

export function bowlingDartLabel(dart: GameDart) {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "IB") return "DBULL";
  if (dart.bed === "OB") return "BULL";
  return `${dart.bed}${dart.number ?? ""}`;
}

function countDarts(stats: BowlingPlayerStats, darts: GameDart[]) {
  darts.forEach((dart) => {
    if (!dart || dart.bed === "MISS") stats.misses += 1;
    else if (dart.bed === "IB") stats.dbulls += 1;
    else if (dart.bed === "OB") stats.bulls += 1;
    else if (dart.bed === "D") stats.doubles += 1;
    else if (dart.bed === "T") stats.triples += 1;
    else stats.singles += 1;
  });
}

function dartPinValue(dart: GameDart, difficulty: BowlingDifficulty) {
  if (!dart || dart.bed === "MISS") return 0;
  if (dart.bed === "IB") return 7;
  if (dart.bed === "OB") return 5;
  const number = Math.max(1, Math.min(20, Number(dart.number || 0)));
  const divisor = difficulty === "easy" ? 4 : difficulty === "hard" ? 7 : 5;
  const base = Math.max(1, Math.ceil(number / divisor));
  const multBonus = dart.bed === "T" ? 2 : dart.bed === "D" ? 1 : 0;
  return base + multBonus;
}

export function getBowlingActivePlayerId(state: BowlingState) {
  return state.turnOrder[state.activePlayerIndex] || state.players[0]?.id || "";
}

export function getBowlingPlayerFrameIndex(state: BowlingState, playerId: string) {
  const frames = state.framesByPlayer[playerId] || [];
  const idx = frames.findIndex((frame) => !frame.complete);
  return idx >= 0 ? idx : 9;
}

export function getBowlingCurrentFrame(state: BowlingState, playerId: string) {
  return state.framesByPlayer[playerId]?.[getBowlingPlayerFrameIndex(state, playerId)] || null;
}

export function bowlingRollMaxPins(frame: BowlingFrame | null) {
  if (!frame) return 10;
  const rolls = frame.rolls || [];
  if (frame.index < 10) {
    if (!rolls.length) return 10;
    return Math.max(0, 10 - Number(rolls[0] || 0));
  }
  if (!rolls.length) return 10;
  if (rolls.length === 1) return rolls[0] === 10 ? 10 : Math.max(0, 10 - rolls[0]);
  if (rolls.length === 2) {
    if (rolls[0] === 10) return rolls[1] === 10 ? 10 : Math.max(0, 10 - rolls[1]);
    if (rolls[0] + rolls[1] === 10) return 10;
  }
  return 0;
}

export function bowlingVisitPins(
  darts: GameDart[],
  frame: BowlingFrame,
  rules: BowlingRules,
): { pins: number; maxPins: number; bullStrike: boolean; doubleSpare: boolean } {
  const maxPins = bowlingRollMaxPins(frame);
  const list = Array.isArray(darts) ? darts : [];
  const bullStrike = rules.bullStrike && maxPins === 10 && list.some((dart) => dart?.bed === "OB" || dart?.bed === "IB");
  if (bullStrike) return { pins: 10, maxPins, bullStrike: true, doubleSpare: false };
  const isSecondBallOfRack = frame.rolls.length > 0 && maxPins > 0 && maxPins < 10;
  const doubleSpare = rules.doubleSpare && isSecondBallOfRack && list.some((dart) => dart?.bed === "D");
  if (doubleSpare) return { pins: maxPins, maxPins, bullStrike: false, doubleSpare: true };
  const raw = list.reduce((sum, dart) => sum + dartPinValue(dart, rules.difficulty), 0);
  return { pins: Math.max(0, Math.min(maxPins, raw)), maxPins, bullStrike: false, doubleSpare: false };
}

function finalizeFrame(frame: BowlingFrame) {
  const rolls = frame.rolls;
  if (frame.index < 10) {
    frame.strike = rolls[0] === 10;
    frame.complete = frame.strike || rolls.length >= 2;
    frame.spare = frame.complete && !frame.strike && Number(rolls[0] || 0) + Number(rolls[1] || 0) === 10;
    frame.open = frame.complete && !frame.strike && !frame.spare;
    return;
  }
  const first = Number(rolls[0] || 0);
  const second = Number(rolls[1] || 0);
  const needsThird = first === 10 || (rolls.length >= 2 && first + second === 10);
  frame.complete = rolls.length >= (needsThird ? 3 : 2);
  frame.strike = first === 10;
  frame.spare = first !== 10 && rolls.length >= 2 && first + second === 10;
  frame.open = frame.complete && !frame.strike && !frame.spare;
}

function nextRollValues(frames: BowlingFrame[], frameIndex: number) {
  const values: number[] = [];
  for (let index = frameIndex + 1; index < frames.length; index += 1) {
    for (const roll of frames[index].rolls) values.push(Number(roll || 0));
    if (values.length >= 2) break;
  }
  return values;
}

export function scoreBowlingFrames(frames: BowlingFrame[]) {
  let cumulative = 0;
  frames.forEach((frame, index) => {
    finalizeFrame(frame);
    frame.score = null;
    frame.cumulative = null;
    if (!frame.complete) return;
    if (index === 9) {
      frame.score = frame.rolls.reduce((sum, roll) => sum + Number(roll || 0), 0);
    } else if (frame.strike) {
      const next = nextRollValues(frames, index);
      if (next.length < 2) return;
      frame.score = 10 + next[0] + next[1];
    } else if (frame.spare) {
      const next = nextRollValues(frames, index);
      if (next.length < 1) return;
      frame.score = 10 + next[0];
    } else {
      frame.score = frame.rolls.slice(0, 2).reduce((sum, roll) => sum + Number(roll || 0), 0);
    }
    cumulative += Number(frame.score || 0);
    frame.cumulative = cumulative;
  });
  return cumulative;
}

function recalcAllScores(state: BowlingState) {
  state.players.forEach((player) => scoreBowlingFrames(state.framesByPlayer[player.id] || []));
}

export function getBowlingPlayerScore(state: BowlingState, playerId: string) {
  const frames = state.framesByPlayer[playerId] || [];
  scoreBowlingFrames(frames);
  let score = 0;
  frames.forEach((frame) => { if (frame.cumulative != null) score = frame.cumulative; });
  return score;
}

export function getBowlingPlayerRawPins(state: BowlingState, playerId: string) {
  return (state.framesByPlayer[playerId] || []).reduce((sum, frame) => sum + frame.rolls.reduce((a, b) => a + Number(b || 0), 0), 0);
}

function playerGameComplete(state: BowlingState, playerId: string) {
  const frames = state.framesByPlayer[playerId] || [];
  return frames.length === 10 && frames.every((frame) => frame.complete);
}

function currentGameComplete(state: BowlingState) {
  return state.players.every((player) => playerGameComplete(state, player.id));
}

function entityGameScore(state: BowlingState, entityId: string) {
  if (state.rules.participantMode === "teams") {
    const team = state.teams.find((row) => row.id === entityId);
    return (team?.playerIds || []).reduce((sum, id) => sum + getBowlingPlayerScore(state, id), 0);
  }
  return getBowlingPlayerScore(state, entityId);
}

function closeGame(state: BowlingState) {
  recalcAllScores(state);
  const ids = entityIds(state);
  const entityScores: Record<string, number> = {};
  ids.forEach((id) => { entityScores[id] = entityGameScore(state, id); });
  const best = Math.max(...ids.map((id) => entityScores[id] || 0));
  const winners = ids.filter((id) => entityScores[id] === best);
  const tied = winners.length !== 1;
  const scoresByPlayer: Record<string, number> = {};
  state.players.forEach((player) => {
    const total = getBowlingPlayerScore(state, player.id);
    scoresByPlayer[player.id] = total;
    const stats = state.statsByPlayer[player.id];
    stats.gamesPlayed += 1;
    stats.highGame = Math.max(stats.highGame, total);
  });

  if (!tied) {
    const winner = winners[0];
    state.setWinsByEntity[winner] = Number(state.setWinsByEntity[winner] || 0) + 1;
    if (state.rules.participantMode === "teams") {
      const team = state.teams.find((row) => row.id === winner);
      (team?.playerIds || []).forEach((id) => { if (state.statsByPlayer[id]) state.statsByPlayer[id].gamesWon += 1; });
    } else if (state.statsByPlayer[winner]) state.statsByPlayer[winner].gamesWon += 1;
  }

  state.completedGames.push({ gameNo: state.gameNo, scoresByPlayer, entityScores, winnerIds: winners, tied, completedAt: Date.now() });
  const matchWinners = ids.filter((id) => Number(state.setWinsByEntity[id] || 0) >= state.rules.setsToWin);
  if (matchWinners.length) {
    state.finished = true;
    state.finishedAt = Date.now();
    state.winnerIds = matchWinners;
    state.tied = matchWinners.length > 1;
    recalcStandings(state);
    return;
  }

  state.gameNo += 1;
  state.players.forEach((player) => { state.framesByPlayer[player.id] = createBowlingFrames(); });
  state.activePlayerIndex = 0;
  state.winnerIds = [];
  state.tied = false;
  recalcStandings(state);
}

function advancePlayer(state: BowlingState) {
  if (!state.turnOrder.length) return;
  for (let step = 1; step <= state.turnOrder.length; step += 1) {
    const index = (state.activePlayerIndex + step) % state.turnOrder.length;
    const id = state.turnOrder[index];
    if (!playerGameComplete(state, id)) {
      state.activePlayerIndex = index;
      return;
    }
  }
}

export function playBowlingRoll(stateInput: BowlingState, playerId: string, dartsInput: GameDart[]) {
  const state = cloneBowlingState(stateInput);
  if (state.finished) return state;
  const activeId = getBowlingActivePlayerId(state);
  if (!playerId || playerId !== activeId) return state;
  const frameIndex = getBowlingPlayerFrameIndex(state, playerId);
  const frame = state.framesByPlayer[playerId]?.[frameIndex];
  if (!frame || frame.complete) return state;
  const darts = (Array.isArray(dartsInput) ? dartsInput : []).slice(0, 3);
  if (!darts.length) return state;
  const calc = bowlingVisitPins(darts, frame, state.rules);
  const rollIndex = frame.rolls.length + 1;
  const visitId = `bowling-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  frame.rolls.push(calc.pins);
  frame.visitIds.push(visitId);
  finalizeFrame(frame);

  const stats = state.statsByPlayer[playerId] || emptyBowlingStats();
  state.statsByPlayer[playerId] = stats;
  stats.darts += darts.length;
  stats.visits += 1;
  stats.pins += calc.pins;
  stats.bestRoll = Math.max(stats.bestRoll, calc.pins);
  if (calc.pins === 0) stats.gutters += 1;
  countDarts(stats, darts);

  // En 10e frame les lancers bonus peuvent eux aussi être des strikes / spares.
  // maxPins===10 signifie qu’un rack neuf était en place pour ce lancer.
  const justStrike = calc.maxPins === 10 && calc.pins === 10;
  const justSpare = !justStrike && rollIndex > 1 && calc.maxPins > 0 && calc.maxPins < 10 && calc.pins === calc.maxPins;
  if (justStrike) {
    stats.strikes += 1;
    stats.strikeStreak += 1;
    stats.bestStrikeStreak = Math.max(stats.bestStrikeStreak, stats.strikeStreak);
  } else {
    stats.strikeStreak = 0;
    if (justSpare) stats.spares += 1;
    else if (frame.complete && frame.open) stats.openFrames += 1;
  }

  state.history.push({
    id: visitId, createdAt: new Date().toISOString(), gameNo: state.gameNo, playerId,
    teamId: state.teamByPlayer[playerId] || null, frame: frame.index, roll: rollIndex,
    darts, labels: darts.map(bowlingDartLabel), pins: calc.pins, maxPins: calc.maxPins,
    strike: justStrike, spare: justSpare, bullStrike: calc.bullStrike, doubleSpare: calc.doubleSpare,
  });

  recalcAllScores(state);
  if (frame.complete) advancePlayer(state);
  if (currentGameComplete(state)) closeGame(state);
  else recalcStandings(state);
  return state;
}

export function bowlingFrameMark(frame: BowlingFrame, rollIndex: number) {
  const value = Number(frame?.rolls?.[rollIndex] ?? -1);
  if (value < 0) return "";
  if (rollIndex === 0 && value === 10) return "X";
  if (rollIndex > 0) {
    const prev = Number(frame.rolls[rollIndex - 1] || 0);
    const isSpare = prev < 10 && prev + value === 10;
    if (isSpare) return "/";
    if (value === 10) return "X";
  }
  return value === 0 ? "-" : String(value);
}
