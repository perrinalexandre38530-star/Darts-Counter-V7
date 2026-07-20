// ============================================
// src/lib/gameEngines/scramEngine.ts
// SCRAM — moteur complet en deux phases
// ============================================

import type { GameDart, Player } from "../types-game";

export type ScramTeam = "A" | "B";
export type ScramPhase = 1 | 2;
export type ScramTarget = 15 | 16 | 17 | 18 | 19 | 20 | 25;

export type ScramRules = {
  mode: "scram";
  useBull: boolean;
  marksToClose: 3;
  /** 0 = illimité. Le cap est appliqué séparément aux deux phases. */
  maxRoundsPerPhase: number;
  /** L'équipe qui bloque en premier. Le bloqueur lance toujours la phase. */
  firstStopper: ScramTeam;
};

export type ScramConfigPayload = {
  players: number;
  selectedIds: string[];
  playersList?: any[];
  /** Deux équipes choisies dans le sélecteur commun X01/Scram. */
  teamConfigs?: Array<{
    id: string;
    side: ScramTeam;
    name: string;
    color?: string;
    logoDataUrl?: string | null;
    playerIds: string[];
    isBotTeam?: boolean;
  }>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  useBull?: boolean;
  maxRoundsPerPhase?: number;
  firstStopper?: ScramTeam | "random";
};

export type TargetMarks = Record<ScramTarget, number>;

export type ScramPlayerStats = {
  darts: number;
  hits: number;
  misses: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  visits: number;
  stopperVisits: number;
  scorerVisits: number;
  marks: number;
  targetsClosed: number;
  points: number;
  scoringHits: number;
  blockedDarts: number;
  wastedDarts: number;
  bestVisit: number;
};

export type ScramVisit = {
  id: string;
  createdAt: string;
  phase: ScramPhase;
  round: number;
  playerId: string;
  team: ScramTeam;
  role: "stopper" | "scorer";
  darts: GameDart[];
  labels: string[];
  points: number;
  marks: number;
  targetsClosed: ScramTarget[];
};

export type ScramState = {
  sport: "darts";
  mode: "scram";
  rules: ScramRules;
  players: Player[];
  teams: Record<ScramTeam, string[]>;
  teamByPlayer: Record<string, ScramTeam>;
  phase: ScramPhase;
  stopperTeam: ScramTeam;
  scorerTeam: ScramTeam;
  turnOrder: string[];
  turnCursor: number;
  activePlayerIndex: number;
  round: number;
  phaseRounds: Record<ScramPhase, number>;
  scores: Record<ScramTeam, number>;
  marksByTeam: Record<ScramTeam, TargetMarks>;
  statsByPlayer: Record<string, ScramPlayerStats>;
  winnerTeam: ScramTeam | null;
  tied: boolean;
  finished: boolean;
  finishReason: "closed" | "round-cap" | null;
  startedAt: number;
  finishedAt?: number;
  history: ScramVisit[];
};

const BASE_TARGETS: ScramTarget[] = [15, 16, 17, 18, 19, 20];

function opposite(team: ScramTeam): ScramTeam {
  return team === "A" ? "B" : "A";
}

function targets(rules: ScramRules): ScramTarget[] {
  return rules.useBull ? [...BASE_TARGETS, 25] : [...BASE_TARGETS];
}

function emptyMarks(): TargetMarks {
  return { 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 25: 0 };
}

function emptyStats(): ScramPlayerStats {
  return {
    darts: 0,
    hits: 0,
    misses: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    bulls: 0,
    dbulls: 0,
    visits: 0,
    stopperVisits: 0,
    scorerVisits: 0,
    marks: 0,
    targetsClosed: 0,
    points: 0,
    scoringHits: 0,
    blockedDarts: 0,
    wastedDarts: 0,
    bestVisit: 0,
  };
}

function normalizePlayers(players: Player[]): Player[] {
  const seen = new Set<string>();
  const clean = (players || []).filter((p) => {
    const id = String(p?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (clean.length >= 2) return clean;
  return [
    { id: clean[0]?.id || "p1", name: clean[0]?.name || "Joueur 1" },
    { id: "p2", name: "Joueur 2" },
  ];
}

function buildTeams(players: Player[]) {
  const teams: Record<ScramTeam, string[]> = { A: [], B: [] };
  const teamByPlayer: Record<string, ScramTeam> = {};
  players.forEach((player, index) => {
    const team: ScramTeam = index % 2 === 0 ? "A" : "B";
    teams[team].push(player.id);
    teamByPlayer[player.id] = team;
  });
  return { teams, teamByPlayer };
}

function buildTurnOrder(teams: Record<ScramTeam, string[]>, stopper: ScramTeam): string[] {
  const scorer = opposite(stopper);
  const order: string[] = [];
  const count = Math.max(teams[stopper].length, teams[scorer].length);
  for (let index = 0; index < count; index += 1) {
    if (teams[stopper][index]) order.push(teams[stopper][index]);
    if (teams[scorer][index]) order.push(teams[scorer][index]);
  }
  return order;
}

function playerIndexForId(players: Player[], id: string): number {
  const index = players.findIndex((p) => p.id === id);
  return index < 0 ? 0 : index;
}

function allClosed(marks: TargetMarks, rules: ScramRules): boolean {
  return targets(rules).every((target) => Number(marks[target] || 0) >= rules.marksToClose);
}

function dartInfo(dart: GameDart): {
  target: ScramTarget | null;
  marks: number;
  points: number;
  label: string;
  onBoard: boolean;
} {
  if (!dart || dart.bed === "MISS") return { target: null, marks: 0, points: 0, label: "MISS", onBoard: false };
  if (dart.bed === "OB") return { target: 25, marks: 1, points: 25, label: "OB", onBoard: true };
  if (dart.bed === "IB") return { target: 25, marks: 2, points: 50, label: "IB", onBoard: true };

  const number = Number(dart.number || 0);
  const multiplier = dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1;
  const target = number >= 15 && number <= 20 ? (number as ScramTarget) : null;
  return {
    target,
    marks: multiplier,
    points: number * multiplier,
    label: `${dart.bed}${number}`,
    onBoard: number >= 1 && number <= 20,
  };
}

function cloneState(state: ScramState): ScramState {
  return {
    ...state,
    teams: { A: [...state.teams.A], B: [...state.teams.B] },
    teamByPlayer: { ...state.teamByPlayer },
    turnOrder: [...state.turnOrder],
    phaseRounds: { 1: state.phaseRounds[1], 2: state.phaseRounds[2] },
    scores: { ...state.scores },
    marksByTeam: { A: { ...state.marksByTeam.A }, B: { ...state.marksByTeam.B } },
    statsByPlayer: Object.fromEntries(
      Object.entries(state.statsByPlayer).map(([id, stats]) => [id, { ...stats }])
    ),
    history: [...state.history],
  };
}

function finish(state: ScramState, reason: "closed" | "round-cap") {
  state.finished = true;
  state.finishReason = reason;
  state.finishedAt = Date.now();
  state.tied = state.scores.A === state.scores.B;
  state.winnerTeam = state.tied ? null : state.scores.A > state.scores.B ? "A" : "B";
}

function startSecondPhase(state: ScramState, reason: "closed" | "round-cap") {
  state.phase = 2;
  state.stopperTeam = opposite(state.rules.firstStopper);
  state.scorerTeam = state.rules.firstStopper;
  state.round = 1;
  state.phaseRounds[1] = Math.max(1, state.phaseRounds[1]);
  state.turnOrder = buildTurnOrder(state.teams, state.stopperTeam);
  state.turnCursor = 0;
  state.activePlayerIndex = playerIndexForId(state.players, state.turnOrder[0]);
  state.finishReason = reason;
}

function endCurrentPhase(state: ScramState, reason: "closed" | "round-cap") {
  if (state.phase === 1) startSecondPhase(state, reason);
  else finish(state, reason);
}

export const ScramEngine = {
  initGame(playersInput: Player[], rulesInput: Partial<ScramRules> = {}): ScramState {
    const players = normalizePlayers(playersInput);
    const { teams, teamByPlayer } = buildTeams(players);
    const firstStopper: ScramTeam = rulesInput.firstStopper === "B" ? "B" : "A";
    const rules: ScramRules = {
      mode: "scram",
      useBull: rulesInput.useBull !== false,
      marksToClose: 3,
      maxRoundsPerPhase: Math.max(0, Number(rulesInput.maxRoundsPerPhase || 0) || 0),
      firstStopper,
    };
    const turnOrder = buildTurnOrder(teams, firstStopper);
    const statsByPlayer = Object.fromEntries(players.map((player) => [player.id, emptyStats()]));

    return {
      sport: "darts",
      mode: "scram",
      rules,
      players,
      teams,
      teamByPlayer,
      phase: 1,
      stopperTeam: firstStopper,
      scorerTeam: opposite(firstStopper),
      turnOrder,
      turnCursor: 0,
      activePlayerIndex: playerIndexForId(players, turnOrder[0]),
      round: 1,
      phaseRounds: { 1: 1, 2: 1 },
      scores: { A: 0, B: 0 },
      marksByTeam: { A: emptyMarks(), B: emptyMarks() },
      statsByPlayer,
      winnerTeam: null,
      tied: false,
      finished: false,
      finishReason: null,
      startedAt: Date.now(),
      history: [],
    };
  },

  playTurn(state: ScramState, dartsInput: GameDart[]): ScramState {
    if (!state || state.finished) return state;
    const next = cloneState(state);
    const darts = (dartsInput || []).slice(0, 3);
    const player = next.players[next.activePlayerIndex];
    if (!player) return state;

    const team = next.teamByPlayer[player.id];
    const role: "stopper" | "scorer" = team === next.stopperTeam ? "stopper" : "scorer";
    const stats = next.statsByPlayer[player.id] || (next.statsByPlayer[player.id] = emptyStats());
    const phaseBefore = next.phase;
    const roundBefore = next.round;
    let visitPoints = 0;
    let visitMarks = 0;
    const labels: string[] = [];
    const closedTargets: ScramTarget[] = [];

    stats.visits += 1;
    if (role === "stopper") stats.stopperVisits += 1;
    else stats.scorerVisits += 1;

    for (const dart of darts) {
      const info = dartInfo(dart);
      labels.push(info.label);
      stats.darts += 1;
      if (!info.onBoard) stats.misses += 1;
      else stats.hits += 1;

      if (dart.bed === "S") stats.singles += 1;
      else if (dart.bed === "D") stats.doubles += 1;
      else if (dart.bed === "T") stats.triples += 1;
      else if (dart.bed === "OB") stats.bulls += 1;
      else if (dart.bed === "IB") stats.dbulls += 1;

      if (!info.target || (info.target === 25 && !next.rules.useBull)) {
        if (info.onBoard) stats.wastedDarts += 1;
        continue;
      }

      if (role === "stopper") {
        const before = next.marksByTeam[team][info.target] || 0;
        const after = Math.min(next.rules.marksToClose, before + info.marks);
        const applied = Math.max(0, after - before);
        next.marksByTeam[team][info.target] = after;
        stats.marks += applied;
        visitMarks += applied;
        if (before < next.rules.marksToClose && after >= next.rules.marksToClose) {
          stats.targetsClosed += 1;
          closedTargets.push(info.target);
        }
      } else if ((next.marksByTeam[next.stopperTeam][info.target] || 0) < next.rules.marksToClose) {
        next.scores[team] += info.points;
        stats.points += info.points;
        stats.scoringHits += 1;
        visitPoints += info.points;
      } else {
        stats.blockedDarts += 1;
      }
    }

    stats.bestVisit = Math.max(stats.bestVisit, visitPoints);
    next.history.push({
      id: `scram-${next.startedAt}-${next.history.length + 1}`,
      createdAt: new Date().toISOString(),
      phase: phaseBefore,
      round: roundBefore,
      playerId: player.id,
      team,
      role,
      darts,
      labels,
      points: visitPoints,
      marks: visitMarks,
      targetsClosed: closedTargets,
    });

    if (role === "stopper" && allClosed(next.marksByTeam[next.stopperTeam], next.rules)) {
      next.phaseRounds[phaseBefore] = roundBefore;
      endCurrentPhase(next, "closed");
      return next;
    }

    next.turnCursor = (next.turnCursor + 1) % next.turnOrder.length;
    const wrapped = next.turnCursor === 0;
    if (wrapped) {
      next.phaseRounds[phaseBefore] = roundBefore;
      const capped = next.rules.maxRoundsPerPhase > 0 && roundBefore >= next.rules.maxRoundsPerPhase;
      if (capped) {
        endCurrentPhase(next, "round-cap");
        return next;
      }
      next.round += 1;
      next.phaseRounds[phaseBefore] = next.round;
    }

    const nextId = next.turnOrder[next.turnCursor];
    next.activePlayerIndex = playerIndexForId(next.players, nextId);
    return next;
  },

  isGameOver(state: ScramState) {
    return Boolean(state?.finished);
  },

  getWinner(state: ScramState) {
    return state?.winnerTeam || null;
  },

  targets,
};
