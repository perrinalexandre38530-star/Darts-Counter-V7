// =============================================================
// src/games/halveit/halveItEngine.ts
// HALVE-IT — Engine pur
// =============================================================

import type {
  HalveItState,
  HalveItConfig,
  ApplyTurnInput,
  HalveItTurnResult,
  HalveItPlayerState,
} from "./halveItTypes";
import { normalizeConfig, parseThrow, isHitTarget, sumPoints } from "./halveItUtils";

export function createHalveItState(configIn: HalveItConfig): HalveItState {
  const config = normalizeConfig(configIn);
  const players: HalveItPlayerState[] = (config.players || []).map((p) => ({
    id: p.id,
    name: p.name,
    isBot: !!p.isBot,
    total: 0,
    turns: [],
  }));

  return {
    config,
    createdAt: Date.now(),
    roundIndex: 0,
    playerIndex: 0,
    players,
    finished: false,
    winnerIds: [],
  };
}

export function getActivePlayer(state: HalveItState) {
  return state.players[state.playerIndex];
}

export function getActiveTarget(state: HalveItState) {
  return state.config.targets[state.roundIndex];
}

export function canApplyTurn(state: HalveItState): boolean {
  if (state.finished) return false;
  if (!state.players.length) return false;
  if (state.roundIndex >= state.config.targets.length) return false;
  return true;
}

export function applyTurn(stateIn: HalveItState, input: ApplyTurnInput): HalveItState {
  const state: HalveItState = structuredClone(stateIn);
  if (!canApplyTurn(state)) return state;

  const cfg = state.config;
  const p = state.players[state.playerIndex];
  const target = getActiveTarget(state);

  const maxDarts = cfg.dartsPerTurn ?? 3;
  const rawThrows = (input?.throws || []).slice(0, maxDarts);
  while (rawThrows.length < maxDarts) rawThrows.push("0");

  const throwsParsed = rawThrows.map(parseThrow);
  const hitTarget = throwsParsed.some((t) => isHitTarget(target, t, cfg));

  const pointsScored = sumPoints(throwsParsed);

  let halved = false;
  let newTotal = p.total + pointsScored;

  if ((cfg.halveOnMiss ?? true) && !hitTarget) {
    halved = true;
    newTotal = Math.floor(newTotal / 2);
  }

  const turnRes: HalveItTurnResult = {
    playerId: p.id,
    roundIndex: state.roundIndex,
    target,
    throws: throwsParsed,
    pointsScored,
    hitTarget,
    halved,
    totalAfter: newTotal,
  };

  // commit
  p.total = newTotal;
  p.turns.push(turnRes);

  // win by targetScore (optional)
  const targetScore = cfg.targetScore ?? null;
  if (typeof targetScore === "number" && targetScore > 0 && p.total >= targetScore) {
    state.finished = true;
    state.winnerIds = [p.id];
    return state;
  }

  // advance player/round
  const lastPlayer = state.playerIndex === state.players.length - 1;
  if (lastPlayer) {
    state.playerIndex = 0;
    state.roundIndex += 1;
  } else {
    state.playerIndex += 1;
  }

  // end of game
  if (state.roundIndex >= cfg.targets.length || state.roundIndex >= (cfg.maxRounds ?? cfg.targets.length)) {
    finishGame(state);
  }

  return state;
}

export function finishGame(state: HalveItState) {
  state.finished = true;
  const best = Math.max(...state.players.map((p) => p.total));
  state.winnerIds = state.players.filter((p) => p.total === best).map((p) => p.id);
}

export function getLeaderboard(state: HalveItState) {
  return [...state.players]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
    .map((p) => ({ id: p.id, name: p.name, total: p.total, isBot: !!p.isBot }));
}
