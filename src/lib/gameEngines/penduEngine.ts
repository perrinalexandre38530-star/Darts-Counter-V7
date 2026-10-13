// @ts-nocheck
// =============================================================
// PENDU — moteur pur PREMIUM
// Mode recommandé : rondes aléatoires d'objectifs darts.
// Chaque joueur tente le même objectif. Échec = 1 partie du pendu.
// Compatibilité conservée avec l'ancien mode "caller/copy".
// =============================================================

import type { GameDart, Player } from "../types-game";
import type { PremiumBotBrain } from "../premiumPartyBotAI";
import {
  blankPenduPenaltyState,
  drawRoulettePenalty,
  drawSabotagePenalty,
  isPenduPenaltyConstraintSatisfied,
  normalizePenduPenaltyMode,
  penaltyMaxDarts,
  penduPenaltyConstraintDetail,
  penduPenaltyConstraintLabel,
  viciousBodyEffect,
  type PenduPenaltyCard,
  type PenduPenaltyMode,
  type PenduPenaltyPlayerState,
} from "../penduPenaltySystem";

export type PenduBotLevel = "easy" | "normal" | "hard";
export type PenduDifficulty = 1 | 2 | 3;
export type PenduChallenge =
  | { kind: "segment"; number: number; bed: "S" | "D" | "T"; difficulty?: PenduDifficulty }
  | { kind: "score"; target: number; difficulty?: PenduDifficulty }
  | { kind: "bed"; bed: "D" | "T" | "BULL"; difficulty?: PenduDifficulty }
  | { kind: "parity"; parity: "even" | "odd"; difficulty?: PenduDifficulty }
  | { kind: "color"; color: "red" | "green" | "black" | "white"; difficulty?: PenduDifficulty }
  | { kind: "zone"; zone: "left" | "right" | "top" | "bottom"; difficulty?: PenduDifficulty }
  | { kind: "range"; range: "low" | "high"; difficulty?: PenduDifficulty };

export type PenduConfigPayload = {
  mode: "pendu";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: PenduBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  sfxEnabled?: boolean;
  awenaEnabled?: boolean;
  coachEnabled?: boolean;
  rules: {
    partsToLose: 6 | 8;
    challengeMode: "caller" | "random" | "mixed";
    targetFamily: "segments" | "scores" | "mixed";
    executionMode: "strict" | "flex";
    penaltyMode: PenduPenaltyMode;
  };
};

export type PenduPlayerStats = {
  darts: number;
  visits: number;
  challengesSet: number;
  challengesPassed: number;
  challengesFailed: number;
  callerAttempts: number;
  callerSuccesses: number;
  copyAttempts: number;
  copySuccesses: number;
  roundsPlayed: number;
  roundsSurvived: number;
  errorsTaken: number;
  eliminations: number;
  legsWon: number;
  bestVisit: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  currentSuccessStreak: number;
  bestSuccessStreak: number;
};

export type PenduVisit = {
  id: string;
  playerId: string;
  leg: number;
  turn: number;
  round?: number;
  phase: "caller" | "copy" | "round";
  challenge: PenduChallenge;
  darts: GameDart[];
  score: number;
  success: boolean;
  events: string[];
};

export type PenduState = {
  sport: "darts";
  mode: "pendu";
  config: PenduConfigPayload;
  players: Player[];
  errors: Record<string, number>;
  eliminated: Record<string, boolean>;
  legWins: Record<string, number>;
  statsByPlayer: Record<string, PenduPlayerStats>;
  activePlayerIndex: number;
  callerPlayerIndex: number;
  copyQueue: string[];
  copyIndex: number;
  challenge: PenduChallenge;
  roundNumber: number;
  penaltiesByPlayer: Record<string, PenduPenaltyPlayerState>;
  penaltyHistory: Array<{ id: string; playerId: string; source: string; card: PenduPenaltyCard | null; at: number; detail: string }>;
  legIndex: number;
  turnIndex: number;
  phase: "caller" | "copy" | "round" | "finished";
  winnerId: string | null;
  lastLegWinnerId: string | null;
  visits: PenduVisit[];
  startedAt: number;
  finishedAt?: number;
};

const BOARD_CW = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const COLOR_LABEL: Record<string,string> = { red:"ROUGE", green:"VERT", black:"NOIR", white:"BLANC" };
const ZONE_LABEL: Record<string,string> = { left:"GAUCHE", right:"DROITE", top:"HAUT", bottom:"BAS" };

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function id(prefix = "pendu") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function blankStats(): PenduPlayerStats {
  return {
    darts: 0, visits: 0, challengesSet: 0, challengesPassed: 0, challengesFailed: 0,
    callerAttempts: 0, callerSuccesses: 0, copyAttempts: 0, copySuccesses: 0,
    roundsPlayed: 0, roundsSurvived: 0,
    errorsTaken: 0, eliminations: 0, legsWon: 0, bestVisit: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    currentSuccessStreak: 0, bestSuccessStreak: 0,
  };
}
function hydratedStats(raw: any): PenduPlayerStats { return { ...blankStats(), ...(raw || {}) }; }
function scoreDart(d: GameDart) {
  if (!d || d.bed === "MISS") return 0;
  if (d.bed === "IB") return 50;
  if (d.bed === "OB") return 25;
  const n = Number(d.number || 0);
  return n * (d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1);
}
export function scorePenduVisit(ds: GameDart[]) { return (ds || []).slice(0, 3).reduce((s, d) => s + scoreDart(d), 0); }
function aliveIds(state: PenduState) { return state.players.filter((p) => !state.eliminated[p.id]).map((p) => p.id); }
function nextAliveIndex(state: PenduState, from: number) {
  for (let step = 1; step <= state.players.length; step++) {
    const i = (from + step) % state.players.length;
    const p = state.players[i];
    if (p && !state.eliminated[p.id]) return i;
  }
  return from;
}
function orderedAliveIdsAfter(state: PenduState, from: number) {
  const out: string[] = [];
  for (let step = 1; step < state.players.length; step++) {
    const i = (from + step) % state.players.length;
    const p = state.players[i];
    if (p && !state.eliminated[p.id]) out.push(p.id);
  }
  return out;
}
function orderedAliveIdsFrom(state: PenduState, from: number) {
  const out: string[] = [];
  for (let step = 0; step < state.players.length; step++) {
    const i = (from + step) % state.players.length;
    const p = state.players[i];
    if (p && !state.eliminated[p.id]) out.push(p.id);
  }
  return out;
}
function countDarts(stats: PenduPlayerStats, darts: GameDart[]) {
  for (const d of darts || []) {
    if (!d || d.bed === "MISS") stats.misses += 1;
    else if (d.bed === "IB") stats.dbulls += 1;
    else if (d.bed === "OB") stats.bulls += 1;
    else if (d.bed === "T") stats.triples += 1;
    else if (d.bed === "D") stats.doubles += 1;
    else stats.singles += 1;
  }
}

export function normalizePenduConfig(raw: any): PenduConfigPayload {
  const rules = raw?.rules || {};
  const selectedIds = Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [];
  return {
    mode: "pendu",
    selectedIds,
    players: Math.max(2, Number(raw?.players || selectedIds.length || 2)),
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    randomOrder: raw?.randomOrder !== false,
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    seriesWins: raw?.seriesWins === 2 || raw?.seriesWins === 3 ? raw.seriesWins : 1,
    sfxEnabled: raw?.sfxEnabled !== false,
    awenaEnabled: raw?.awenaEnabled !== false,
    coachEnabled: raw?.coachEnabled !== false,
    rules: {
      partsToLose: rules?.partsToLose === 8 ? 8 : 6,
      // Nouveau comportement par défaut : rondes aléatoires façon CAPITAL.
      challengeMode: rules?.challengeMode === "caller" ? "caller" : rules?.challengeMode === "mixed" ? "mixed" : "random",
      targetFamily: rules?.targetFamily === "segments" ? "segments" : rules?.targetFamily === "scores" ? "scores" : "mixed",
      executionMode: rules?.executionMode === "strict" ? "strict" : "flex",
      penaltyMode: normalizePenduPenaltyMode(rules?.penaltyMode),
    },
  };
}

function difficultyForRound(roundNumber: number): PenduDifficulty {
  if (roundNumber >= 7) return 3;
  if (roundNumber >= 3) return 2;
  return 1;
}
function randomFrom<T>(rows: T[]): T { return rows[Math.floor(Math.random() * rows.length)]!; }
function objectiveDeck(configOrRules: any, roundNumber = 1): PenduChallenge[] {
  const rules = configOrRules?.rules || configOrRules || {};
  const family = String(rules.targetFamily || "mixed");
  const level = difficultyForRound(roundNumber);
  const scores: PenduChallenge[] = [
    { kind:"score", target:40, difficulty:1 }, { kind:"score", target:50, difficulty:1 },
    { kind:"score", target:60, difficulty:1 }, { kind:"score", target:70, difficulty:2 },
    { kind:"score", target:80, difficulty:2 }, { kind:"score", target:90, difficulty:2 },
    { kind:"score", target:100, difficulty:3 }, { kind:"score", target:120, difficulty:3 },
  ];
  if (rules.challengeMode === "caller") {
    const segments: PenduChallenge[] = Array.from({ length: 20 }, (_, i) => {
      const number = i + 1;
      const r = Math.random();
      const bed: "S" | "D" | "T" = r < .58 ? "S" : r < .84 ? "D" : "T";
      return { kind:"segment", number, bed, difficulty:bed === "T" ? 3 : bed === "D" ? 2 : 1 };
    });
    if (family === "scores") return scores.filter((c:any) => Number(c.difficulty || 1) <= level);
    if (family === "segments") return segments.filter((c:any) => Number(c.difficulty || 1) <= level);
    return [...scores, ...segments].filter((c:any) => Number(c.difficulty || 1) <= level);
  }
  const arcade: PenduChallenge[] = [
    { kind:"parity", parity:"even", difficulty:1 }, { kind:"parity", parity:"odd", difficulty:1 },
    { kind:"range", range:"low", difficulty:1 }, { kind:"range", range:"high", difficulty:1 },
    { kind:"zone", zone:"left", difficulty:1 }, { kind:"zone", zone:"right", difficulty:1 },
    { kind:"zone", zone:"top", difficulty:1 }, { kind:"zone", zone:"bottom", difficulty:1 },
    { kind:"color", color:"black", difficulty:2 }, { kind:"color", color:"white", difficulty:2 },
    { kind:"color", color:"red", difficulty:2 }, { kind:"color", color:"green", difficulty:2 },
    { kind:"bed", bed:"D", difficulty:2 }, { kind:"bed", bed:"T", difficulty:3 },
    { kind:"bed", bed:"BULL", difficulty:3 },
    ...[20,18,16,14,12,10,8,6,4,2,19,17,15,13,11,9,7,5,3,1].map((number, i) => ({ kind:"segment", number, bed:"S", difficulty:(i < 8 ? 2 : 3) as PenduDifficulty })),
  ];
  if (family === "scores") return scores.filter((c:any) => Number(c.difficulty || 1) <= level);
  if (family === "segments") return arcade.filter((c:any) => Number(c.difficulty || 1) <= level);
  return [...scores, ...arcade].filter((c:any) => Number(c.difficulty || 1) <= level);
}
export function randomPenduChallenge(configOrRules: any, roundNumber = 1, previous?: PenduChallenge | null): PenduChallenge {
  const deck = objectiveDeck(configOrRules, roundNumber);
  if (!deck.length) return { kind:"score", target:50, difficulty:1 };
  let next = clone(randomFrom(deck));
  const prevLabel = previous ? penduChallengeLabel(previous, "flex") : "";
  for (let i = 0; i < 5 && prevLabel && penduChallengeLabel(next, "flex") === prevLabel; i++) next = clone(randomFrom(deck));
  return next;
}

export function penduChallengeIcon(c: PenduChallenge) {
  if (!c) return "🎯";
  if (c.kind === "score") return "💯";
  if (c.kind === "bed") return c.bed === "BULL" ? "🎯" : c.bed === "D" ? "⭕" : "⚡";
  if (c.kind === "parity") return c.parity === "even" ? "2️⃣" : "1️⃣";
  if (c.kind === "color") return c.color === "red" ? "🔴" : c.color === "green" ? "🟢" : c.color === "black" ? "⚫" : "⚪";
  if (c.kind === "zone") return c.zone === "left" ? "⬅️" : c.zone === "right" ? "➡️" : c.zone === "top" ? "⬆️" : "⬇️";
  if (c.kind === "range") return c.range === "low" ? "🔟" : "🔝";
  return "🎯";
}
export function penduChallengeLabel(c: PenduChallenge, executionMode = "flex") {
  if (!c) return "OBJECTIF";
  if (c.kind === "score") return `${executionMode === "strict" ? "= " : "≥ "}${c.target} PTS`;
  if (c.kind === "segment") return c.bed === "S" ? `SECTEUR ${c.number}` : `${c.bed}${c.number}`;
  if (c.kind === "bed") return c.bed === "BULL" ? "BULL" : c.bed === "D" ? "UN DOUBLE" : "UN TRIPLE";
  if (c.kind === "parity") return c.parity === "even" ? "SECTEUR PAIR" : "SECTEUR IMPAIR";
  if (c.kind === "color") return `COULEUR ${COLOR_LABEL[c.color]}`;
  if (c.kind === "zone") return `ZONE ${ZONE_LABEL[c.zone]}`;
  if (c.kind === "range") return c.range === "low" ? "SECTEUR 1–10" : "SECTEUR 11–20";
  return "OBJECTIF";
}
export function penduChallengeInstruction(c: PenduChallenge, executionMode = "flex") {
  if (!c) return "Réussis l'objectif avec 3 fléchettes maximum.";
  if (c.kind === "score") return executionMode === "strict" ? `Fais exactement ${c.target} points en 3 fléchettes maximum.` : `Atteins au moins ${c.target} points en 3 fléchettes maximum.`;
  if (c.kind === "segment") return c.bed === "S" ? `Touche au moins une fois le secteur ${c.number}, en Simple, Double ou Triple.` : `Touche au moins une fois ${c.bed}${c.number}.`;
  if (c.kind === "bed") return c.bed === "BULL" ? "Touche BULL 25 ou DBULL 50." : c.bed === "D" ? "Touche n'importe quel Double." : "Touche n'importe quel Triple.";
  if (c.kind === "parity") return `Touche au moins un secteur ${c.parity === "even" ? "PAIR" : "IMPAIR"}.`;
  if (c.kind === "color") return `Touche au moins une zone ${COLOR_LABEL[c.color]} de la cible.`;
  if (c.kind === "zone") return `Touche au moins une fois la moitié ${ZONE_LABEL[c.zone]} de la cible.`;
  if (c.kind === "range") return c.range === "low" ? "Touche un secteur numéroté de 1 à 10." : "Touche un secteur numéroté de 11 à 20.";
  return "Réussis l'objectif avec 3 fléchettes maximum.";
}
export function penduChallengeDifficulty(c: PenduChallenge): PenduDifficulty { return (Number((c as any)?.difficulty || 1) >= 3 ? 3 : Number((c as any)?.difficulty || 1) >= 2 ? 2 : 1) as PenduDifficulty; }

function dartSectorColor(d: GameDart): "red" | "green" | "black" | "white" | null {
  if (!d || d.bed === "MISS") return null;
  if (d.bed === "IB") return "red";
  if (d.bed === "OB") return "green";
  const idx = BOARD_CW.indexOf(Number(d.number || 0));
  if (idx < 0) return null;
  if (d.bed === "D" || d.bed === "T") return idx % 2 === 0 ? "red" : "green";
  return idx % 2 === 0 ? "black" : "white";
}
function dartPhysicalZone(d: GameDart): { left:boolean; right:boolean; top:boolean; bottom:boolean } {
  const idx = BOARD_CW.indexOf(Number(d?.number || 0));
  if (idx < 0) return { left:false,right:false,top:false,bottom:false };
  const angle = (-90 + idx * 18) * Math.PI / 180;
  const x = Math.cos(angle), y = Math.sin(angle);
  return { left:x < -.05, right:x > .05, top:y < -.05, bottom:y > .05 };
}
export function isPenduChallengeSatisfied(c: PenduChallenge, darts: GameDart[], config: PenduConfigPayload) {
  const ds = (darts || []).slice(0, 3);
  if (c.kind === "score") {
    const sc = scorePenduVisit(ds);
    return config.rules.executionMode === "strict" ? sc === c.target : sc >= c.target;
  }
  return ds.some((d) => {
    if (!d || d.bed === "MISS") return false;
    if (c.kind === "segment") {
      if (Number(d.number || 0) !== c.number) return false;
      if (c.bed === "S") return ["S","D","T"].includes(String(d.bed));
      if (config.rules.executionMode === "strict") return d.bed === c.bed;
      const rank: any = { S:1, D:2, T:3 };
      return Number(rank[d.bed] || 0) >= Number(rank[c.bed] || 0);
    }
    if (c.kind === "bed") return c.bed === "BULL" ? d.bed === "OB" || d.bed === "IB" : d.bed === c.bed;
    if (c.kind === "parity") {
      const number = Number(d.number || 0);
      if (!number) return false;
      return c.parity === "even" ? number % 2 === 0 : number % 2 === 1;
    }
    if (c.kind === "color") return dartSectorColor(d) === c.color;
    if (c.kind === "zone") return !!dartPhysicalZone(d)[c.zone];
    if (c.kind === "range") {
      const number = Number(d.number || 0);
      return c.range === "low" ? number >= 1 && number <= 10 : number >= 11 && number <= 20;
    }
    return false;
  });
}

function hydrateState(state: PenduState): PenduState {
  state.config = normalizePenduConfig(state.config || {});
  state.errors = Object.fromEntries((state.players || []).map((p: any) => [p.id, Number(state.errors?.[p.id] || 0)]));
  state.eliminated = Object.fromEntries((state.players || []).map((p: any) => [p.id, Boolean(state.eliminated?.[p.id])]));
  state.legWins = Object.fromEntries((state.players || []).map((p: any) => [p.id, Number(state.legWins?.[p.id] || 0)]));
  state.statsByPlayer = Object.fromEntries((state.players || []).map((p: any) => [p.id, hydratedStats(state.statsByPlayer?.[p.id])]));
  state.penaltiesByPlayer = Object.fromEntries((state.players || []).map((p: any) => {
    const raw = state.penaltiesByPlayer?.[p.id] || {};
    return [p.id, { ...blankPenduPenaltyState(), ...raw, curse: raw?.curse || null, lastDraw: raw?.lastDraw || null, lastBodyEffect: raw?.lastBodyEffect || null }];
  }));
  state.penaltyHistory = Array.isArray(state.penaltyHistory) ? state.penaltyHistory : [];
  state.copyQueue = Array.isArray(state.copyQueue) ? state.copyQueue.map(String) : [];
  state.copyIndex = Number.isFinite(Number(state.copyIndex)) ? Math.max(0, Number(state.copyIndex)) : 0;
  state.roundNumber = Number.isFinite(Number(state.roundNumber)) ? Math.max(1, Number(state.roundNumber)) : 1;
  state.challenge = state.challenge || randomPenduChallenge(state.config, state.roundNumber);
  state.visits = Array.isArray(state.visits) ? state.visits : [];
  // Une ancienne sauvegarde "random" utilisait caller/copy. À la reprise on la remet
  // dans le nouveau flux de ronde sans perdre erreurs, stats ou historique.
  if (state.config.rules.challengeMode !== "caller" && state.phase !== "finished" && state.phase !== "round") {
    const starter = Math.max(0, Number(state.activePlayerIndex || state.callerPlayerIndex || 0));
    state.callerPlayerIndex = starter;
    state.copyQueue = orderedAliveIdsFrom(state, starter);
    state.copyIndex = Math.max(0, state.copyQueue.findIndex((id) => id === state.players[state.activePlayerIndex]?.id));
    if (state.copyIndex < 0) state.copyIndex = 0;
    state.phase = "round";
  }
  return state;
}
function startCallerCycle(state: PenduState, callerIndex: number) {
  state.callerPlayerIndex = callerIndex;
  state.activePlayerIndex = callerIndex;
  state.copyQueue = [];
  state.copyIndex = 0;
  state.challenge = randomPenduChallenge(state.config, state.roundNumber || 1, state.challenge);
  state.phase = "caller";
  return state;
}
function startRandomRound(state: PenduState, starterIndex: number, nextRound?: number) {
  state.roundNumber = Math.max(1, Number(nextRound || state.roundNumber || 1));
  state.callerPlayerIndex = starterIndex;
  state.copyQueue = orderedAliveIdsFrom(state, starterIndex);
  state.copyIndex = 0;
  const first = state.copyQueue[0];
  state.activePlayerIndex = Math.max(0, state.players.findIndex((p) => p.id === first));
  state.challenge = randomPenduChallenge(state.config, state.roundNumber, state.challenge);
  state.phase = "round";
  return state;
}
function startCycle(state: PenduState, starterIndex: number) {
  if (state.config.rules.challengeMode === "caller") return startCallerCycle(state, starterIndex);
  return startRandomRound(state, starterIndex, Math.max(1, Number(state.roundNumber || 0) + 1));
}
function resetLeg(state: PenduState, starter: number) {
  state.legIndex += 1;
  state.turnIndex = 0;
  state.roundNumber = 0;
  state.errors = Object.fromEntries(state.players.map((p) => [p.id, 0]));
  state.eliminated = Object.fromEntries(state.players.map((p) => [p.id, false]));
  state.penaltiesByPlayer = Object.fromEntries(state.players.map((p) => [p.id, blankPenduPenaltyState()]));
  state.penaltyHistory = [];
  startCycle(state, starter);
}
function winLeg(state: PenduState, winnerId: string) {
  state.lastLegWinnerId = winnerId;
  state.legWins[winnerId] = Number(state.legWins[winnerId] || 0) + 1;
  state.statsByPlayer[winnerId].legsWon += 1;
  if (state.legWins[winnerId] >= state.config.seriesWins) {
    state.phase = "finished";
    state.winnerId = winnerId;
    state.finishedAt = Date.now();
    return state;
  }
  const wi = Math.max(0, state.players.findIndex((p) => p.id === winnerId));
  resetLeg(state, (wi + 1) % state.players.length);
  return state;
}

export function createPenduState(players: Player[], rawConfig: any): PenduState {
  const config = normalizePenduConfig(rawConfig);
  const safe = (players || []).map((p, i) => ({ id: String(p?.id || `p${i + 1}`), name: String(p?.name || `Joueur ${i + 1}`) }));
  const state: PenduState = {
    sport: "darts", mode: "pendu", config, players: safe,
    errors: Object.fromEntries(safe.map((p) => [p.id, 0])),
    eliminated: Object.fromEntries(safe.map((p) => [p.id, false])),
    legWins: Object.fromEntries(safe.map((p) => [p.id, 0])),
    statsByPlayer: Object.fromEntries(safe.map((p) => [p.id, blankStats()])),
    activePlayerIndex: 0, callerPlayerIndex: 0, copyQueue: [], copyIndex: 0,
    challenge: randomPenduChallenge(config, 1), roundNumber: 0,
    penaltiesByPlayer: Object.fromEntries(safe.map((p) => [p.id, blankPenduPenaltyState()])),
    penaltyHistory: [],
    legIndex: 0, turnIndex: 0, phase: "caller",
    winnerId: null, lastLegWinnerId: null, visits: [], startedAt: Date.now(),
  };
  return startCycle(state, 0);
}
export function clonePenduState(s: PenduState): PenduState { return hydrateState(clone(s)); }
export function setPenduChallenge(input: PenduState, challenge: PenduChallenge): PenduState {
  const s = clonePenduState(input);
  if (s.phase === "caller") s.challenge = clone(challenge);
  return s;
}


export function getPenduPenaltyState(state: PenduState, playerId: string): PenduPenaltyPlayerState {
  const raw = state?.penaltiesByPlayer?.[playerId] || blankPenduPenaltyState();
  return { ...blankPenduPenaltyState(), ...raw, curse: raw?.curse || null, lastDraw: raw?.lastDraw || null, lastBodyEffect: raw?.lastBodyEffect || null };
}

export function getPenduMaxDarts(state: PenduState, playerId: string) {
  return penaltyMaxDarts(getPenduPenaltyState(state, playerId));
}

export function isPenduAttemptSatisfied(state: PenduState, playerId: string, darts: GameDart[]) {
  const limited = (darts || []).slice(0, getPenduMaxDarts(state, playerId));
  return isPenduChallengeSatisfied(state.challenge, limited, state.config) &&
    isPenduPenaltyConstraintSatisfied(getPenduPenaltyState(state, playerId), limited);
}

function logPenalty(state: PenduState, playerId: string, source: string, card: PenduPenaltyCard | null, detail: string) {
  state.penaltyHistory.push({ id: id("pendu-penalty"), playerId, source, card: card ? clone(card) : null, at: Date.now(), detail });
  if (state.penaltyHistory.length > 80) state.penaltyHistory = state.penaltyHistory.slice(-80);
}

function applyDrawnPenalty(state: PenduState, playerId: string, card: PenduPenaltyCard, events: string[]) {
  const ps = state.penaltiesByPlayer[playerId] || (state.penaltiesByPlayer[playerId] = blankPenduPenaltyState());
  ps.lastDraw = clone(card);
  if (card.id === "hard_hit") {
    state.errors[playerId] = Number(state.errors[playerId] || 0) + 1;
    state.statsByPlayer[playerId].errorsTaken += 1;
    events.push(`${card.icon} ${card.label} : +1 morceau supplémentaire`);
    logPenalty(state, playerId, "roulette", card, "+1 morceau supplémentaire");
    return;
  }
  if (card.id === "shield") {
    ps.shield = Number(ps.shield || 0) + 1;
    events.push(`${card.icon} ${card.label} gagné : la prochaine erreur sera annulée`);
    logPenalty(state, playerId, "bonus", card, "Bouclier gagné");
    return;
  }
  if (card.id === "heal") {
    const before = Number(state.errors[playerId] || 0);
    state.errors[playerId] = Math.max(0, before - 1);
    if (before > state.errors[playerId]) events.push(`${card.icon} ${card.label} : 1 morceau retiré`);
    else events.push(`${card.icon} ${card.label} : aucun morceau à retirer`);
    logPenalty(state, playerId, "bonus", card, "Rémission");
    return;
  }
  if (card.id === "joker") {
    ps.joker = Number(ps.joker || 0) + 1;
    events.push(`${card.icon} ${card.label} conservé pour éviter une erreur fatale`);
    logPenalty(state, playerId, "bonus", card, "Joker gagné");
    return;
  }
  ps.curse = clone(card);
  events.push(`${card.icon} ${card.label} au prochain tour`);
  logPenalty(state, playerId, "curse", card, card.detail);
}

function applyPenaltyAfterFailure(state: PenduState, playerId: string, events: string[]) {
  const mode = state.config.rules.penaltyMode;
  const ps = state.penaltiesByPlayer[playerId] || (state.penaltiesByPlayer[playerId] = blankPenduPenaltyState());

  if (mode === "vicious") {
    const effect = viciousBodyEffect(Number(state.errors[playerId] || 0), state.config.rules.partsToLose);
    ps.lastBodyEffect = effect ? clone(effect) : null;
    if (effect && effect.id !== "warning") {
      ps.curse = clone(effect);
      events.push(`${effect.icon} ${effect.label} : ${effect.detail}`);
      logPenalty(state, playerId, "vicious", effect, effect.detail);
    } else if (effect) {
      events.push(`${effect.icon} ${effect.label} : simple avertissement`);
      logPenalty(state, playerId, "vicious", effect, effect.detail);
    }
    return;
  }

  if (mode === "roulette" || mode === "chaos") {
    const draw = drawRoulettePenalty();
    applyDrawnPenalty(state, playerId, draw, events);
  }
}

function consumeCurrentCurse(state: PenduState, playerId: string) {
  const ps = state.penaltiesByPlayer[playerId] || (state.penaltiesByPlayer[playerId] = blankPenduPenaltyState());
  const previous = ps.curse ? clone(ps.curse) : null;
  ps.curse = null;
  return previous;
}

export function usePenduSabotage(input: PenduState, actorId: string, targetId: string, forcedCard?: PenduPenaltyCard | null): PenduState {
  const state = clonePenduState(input);
  const actor = state.penaltiesByPlayer[actorId] || (state.penaltiesByPlayer[actorId] = blankPenduPenaltyState());
  if (actor.sabotageTokens <= 0 || actorId === targetId || state.eliminated[targetId]) return state;
  const target = state.penaltiesByPlayer[targetId] || (state.penaltiesByPlayer[targetId] = blankPenduPenaltyState());
  const card = forcedCard ? clone(forcedCard) : drawSabotagePenalty();
  actor.sabotageTokens -= 1;
  target.curse = clone(card);
  target.lastDraw = clone(card);
  const actorName = state.players.find((p) => p.id === actorId)?.name || "Joueur";
  const targetName = state.players.find((p) => p.id === targetId)?.name || "adversaire";
  logPenalty(state, targetId, "sabotage", card, `${actorName} → ${targetName}`);
  state.visits.push({
    id: id("pendu-sabotage"), playerId: actorId, leg: state.legIndex + 1, turn: state.turnIndex + 1,
    round: state.phase === "round" ? state.roundNumber : undefined,
    phase: state.phase === "round" ? "round" : state.phase,
    challenge: clone(state.challenge), darts: [], score: 0, success: true,
    events: [`💣 ${actorName} sabote ${targetName} : ${card.label}`],
  } as any);
  return state;
}

export function playPenduVisit(input: PenduState, dartsRaw: GameDart[]): PenduState {
  const state = clonePenduState(input);
  if (state.phase === "finished") return state;
  const player = state.players[state.activePlayerIndex];
  if (!player) return state;
  const penaltyBefore = getPenduPenaltyState(state, player.id);
  const maxDarts = penaltyMaxDarts(penaltyBefore);
  const darts = (dartsRaw || []).slice(0, maxDarts);
  const baseSuccess = isPenduChallengeSatisfied(state.challenge, darts, state.config);
  const penaltySuccess = isPenduPenaltyConstraintSatisfied(penaltyBefore, darts);
  const success = baseSuccess && penaltySuccess;
  const usedCurse = consumeCurrentCurse(state, player.id);
  const stats = state.statsByPlayer[player.id] || (state.statsByPlayer[player.id] = blankStats());
  const phase = state.phase;
  stats.visits += 1;
  stats.darts += darts.length;
  stats.bestVisit = Math.max(stats.bestVisit, scorePenduVisit(darts));
  countDarts(stats, darts);
  if (phase === "caller") { stats.challengesSet += 1; stats.callerAttempts += 1; }
  else stats.copyAttempts += 1;
  if (phase === "round") stats.roundsPlayed += 1;

  const events: string[] = [];
  if (usedCurse) events.push(`⚠️ ${penduPenaltyConstraintLabel({ ...penaltyBefore, curse: usedCurse } as any)} : ${penduPenaltyConstraintDetail({ ...penaltyBefore, curse: usedCurse } as any)}`);

  if (success) {
    stats.challengesPassed += 1;
    stats.currentSuccessStreak += 1;
    stats.bestSuccessStreak = Math.max(stats.bestSuccessStreak, stats.currentSuccessStreak);
    if (phase === "caller") stats.callerSuccesses += 1; else stats.copySuccesses += 1;
    if (phase === "round") stats.roundsSurvived += 1;
    events.push(`${player.name} réussit ${penduChallengeLabel(state.challenge, state.config.rules.executionMode)}`);

    // Un PERFECT = objectif déjà validé avec la première fléchette.
    const perfect = darts.length >= 1 && isPenduChallengeSatisfied(state.challenge, darts.slice(0, 1), state.config) &&
      isPenduPenaltyConstraintSatisfied(penaltyBefore, darts.slice(0, 1));
    if (perfect && (state.config.rules.penaltyMode === "sabotage" || state.config.rules.penaltyMode === "chaos")) {
      const ps = state.penaltiesByPlayer[player.id] || (state.penaltiesByPlayer[player.id] = blankPenduPenaltyState());
      ps.sabotageTokens = Number(ps.sabotageTokens || 0) + 1;
      events.push(`💣 PERFECT : ${player.name} gagne 1 SABOTAGE`);
      logPenalty(state, player.id, "perfect", null, "Jeton sabotage gagné");
    }
  } else {
    stats.challengesFailed += 1;
    stats.currentSuccessStreak = 0;
    const ps = state.penaltiesByPlayer[player.id] || (state.penaltiesByPlayer[player.id] = blankPenduPenaltyState());

    if (!baseSuccess) events.push(`${player.name} rate l'objectif de ronde`);
    else if (!penaltySuccess) events.push(`${player.name} réussit l'objectif mais rate sa malédiction`);

    if (ps.shield > 0) {
      ps.shield -= 1;
      events.push(`🛡️ BOUCLIER : aucune partie du pendu n'est ajoutée`);
      logPenalty(state, player.id, "shield", null, "Erreur annulée");
    } else {
      const fatalWithoutJoker = Number(state.errors[player.id] || 0) + (usedCurse?.id === "sudden_death" ? 2 : 1) >= state.config.rules.partsToLose;
      if (fatalWithoutJoker && ps.joker > 0) {
        ps.joker -= 1;
        events.push(`🎁 JOKER : l'erreur fatale est annulée`);
        logPenalty(state, player.id, "joker", null, "Erreur fatale annulée");
      } else {
        const damage = usedCurse?.id === "sudden_death" ? 2 : 1;
        state.errors[player.id] = Number(state.errors[player.id] || 0) + damage;
        stats.errorsTaken += damage;
        events.push(`${damage > 1 ? "💣 " : ""}${player.name} prend +${damage} : ${state.errors[player.id]}/${state.config.rules.partsToLose} partie(s) du pendu`);

        if (state.errors[player.id] < state.config.rules.partsToLose) {
          applyPenaltyAfterFailure(state, player.id, events);
        }

        if (state.errors[player.id] >= state.config.rules.partsToLose) {
          state.errors[player.id] = state.config.rules.partsToLose;
          state.eliminated[player.id] = true;
          stats.eliminations += 1;
          events.push(`${player.name} est PENDU`);
        }
      }
    }
  }

  state.visits.push({
    id: id("pendu-visit"), playerId: player.id, leg: state.legIndex + 1, turn: state.turnIndex + 1,
    round: phase === "round" ? state.roundNumber : undefined,
    phase, challenge: clone(state.challenge), darts, score: scorePenduVisit(darts), success, events,
    penaltyMode: state.config.rules.penaltyMode,
    penaltyUsed: usedCurse ? clone(usedCurse) : null,
    penaltyAfter: clone(state.penaltiesByPlayer[player.id] || blankPenduPenaltyState()),
  } as any);
  state.turnIndex += 1;

  const alive = aliveIds(state);
  if (alive.length === 1) return winLeg(state, alive[0]);

  if (phase === "round") {
    let pos = state.copyIndex + 1;
    while (pos < state.copyQueue.length && state.eliminated[state.copyQueue[pos]]) pos += 1;
    if (pos < state.copyQueue.length) {
      state.copyIndex = pos;
      state.activePlayerIndex = Math.max(0, state.players.findIndex((p) => p.id === state.copyQueue[pos]));
      return state;
    }
    const nextStarter = nextAliveIndex(state, state.callerPlayerIndex);
    return startRandomRound(state, nextStarter, state.roundNumber + 1);
  }

  if (phase === "caller") {
    if (!success) return startCallerCycle(state, nextAliveIndex(state, state.callerPlayerIndex));
    const queue = orderedAliveIdsAfter(state, state.callerPlayerIndex);
    state.copyQueue = queue;
    state.copyIndex = 0;
    state.phase = "copy";
    const first = queue[0];
    state.activePlayerIndex = Math.max(0, state.players.findIndex((p) => p.id === first));
    return state;
  }

  let pos = state.copyIndex + 1;
  while (pos < state.copyQueue.length && state.eliminated[state.copyQueue[pos]]) pos += 1;
  if (pos < state.copyQueue.length) {
    state.copyIndex = pos;
    state.activePlayerIndex = Math.max(0, state.players.findIndex((p) => p.id === state.copyQueue[pos]));
    return state;
  }
  return startCallerCycle(state, nextAliveIndex(state, state.callerPlayerIndex));
}

function skill(level: PenduBotLevel, brain?: PremiumBotBrain) {
  const base = level === "hard" ? .79 : level === "easy" ? .37 : .59;
  return Math.max(.18, Math.min(.96, Number(brain?.precision ?? base)));
}
function randomDart(brain?: PremiumBotBrain): GameDart {
  const n = 1 + Math.floor(Math.random() * 20);
  const risk = Number(brain?.risk ?? .5);
  const r = Math.random();
  const doubleAt = .74 - (risk - .5) * .08;
  const tripleAt = .91 - (risk - .5) * .14;
  return { bed: r < doubleAt ? "S" : r < tripleAt ? "D" : "T", number: n } as GameDart;
}
function scorePlan(target: number, brain?: PremiumBotBrain): GameDart[] {
  let rem = Math.max(0, Math.min(180, Math.round(target)));
  const out: GameDart[] = [];
  for (let i = 0; i < 3; i++) {
    if (rem <= 0) break;
    if (rem >= 60) { out.push({ bed: "T", number: 20 }); rem -= 60; continue; }
    if (rem === 50) { out.push({ bed: "IB" }); rem = 0; continue; }
    if (rem === 25) { out.push({ bed: "OB" }); rem = 0; continue; }
    if (rem <= 20) { out.push({ bed: "S", number: rem }); rem = 0; continue; }
    if (rem % 3 === 0 && rem / 3 <= 20 && Number(brain?.risk ?? .5) >= .42) { out.push({ bed: "T", number: rem / 3 }); rem = 0; continue; }
    if (rem % 2 === 0 && rem / 2 <= 20) { out.push({ bed: "D", number: rem / 2 }); rem = 0; continue; }
    const n = Math.min(20, rem); out.push({ bed: "S", number: n }); rem -= n;
  }
  while (out.length < 3) out.push({ bed: "MISS" });
  return out.slice(0, 3);
}
function representativeForChallenge(c: PenduChallenge): GameDart {
  if (c.kind === "segment") return { bed: c.bed === "S" ? "T" : c.bed, number: c.number } as GameDart;
  if (c.kind === "bed") return c.bed === "BULL" ? { bed:"IB" } : { bed:c.bed, number:20 } as GameDart;
  if (c.kind === "parity") return { bed:"T", number:c.parity === "even" ? 20 : 19 } as GameDart;
  if (c.kind === "color") {
    if (c.color === "red") return { bed:"T", number:20 };
    if (c.color === "green") return { bed:"T", number:19 };
    if (c.color === "black") return { bed:"S", number:20 };
    return { bed:"S", number:1 };
  }
  if (c.kind === "zone") {
    const rep:any = { top:20, right:6, bottom:3, left:11 };
    return { bed:"T", number:rep[c.zone] || 20 } as GameDart;
  }
  if (c.kind === "range") return { bed:"T", number:c.range === "low" ? 10 : 20 } as GameDart;
  return { bed:"T", number:20 };
}
function failForChallenge(c: PenduChallenge, brain?: PremiumBotBrain): GameDart[] {
  for (let tries = 0; tries < 12; tries++) {
    const ds = [randomDart(brain), randomDart(brain), Math.random() < .18 ? { bed:"MISS" } as GameDart : randomDart(brain)];
    const fakeConfig:any = { rules:{ executionMode:"flex" } };
    if (!isPenduChallengeSatisfied(c, ds, fakeConfig)) return ds;
  }
  return [{ bed:"MISS" }, { bed:"MISS" }, { bed:"MISS" }];
}
export function pickPenduBotDarts(state: PenduState, level: PenduBotLevel = "normal", brain?: PremiumBotBrain): GameDart[] {
  const current = state.players[state.activePlayerIndex];
  const danger = Number(state.errors?.[current?.id] || 0) / Math.max(1, state.config.rules.partsToLose);
  const difficulty = penduChallengeDifficulty(state.challenge);
  const pressureBoost = Math.max(0, danger - .45) * (.10 + Number(brain?.composure || .5) * .14);
  const difficultyPenalty = difficulty === 3 ? .12 : difficulty === 2 ? .05 : 0;
  const adjusted = Math.min(.97, Math.max(.12, skill(level, brain) + pressureBoost - difficultyPenalty));
  const ok = Math.random() < adjusted;
  const c = state.challenge;
  let darts: GameDart[];
  if (c.kind === "score") {
    if (ok) {
      const flexBonus = state.config.rules.executionMode === "flex" ? Math.floor(Math.random() * (Number(brain?.risk || .5) > .70 ? 28 : 14)) : 0;
      darts = scorePlan(Math.min(180, c.target + flexBonus), brain);
    } else {
      const missGap = 8 + Math.floor(Math.random() * (Number(brain?.composure || .5) > .8 ? 14 : 28));
      darts = scorePlan(Math.max(0, c.target - missGap), brain);
    }
  } else {
    darts = ok ? [representativeForChallenge(c), randomDart(brain), randomDart(brain)] : failForChallenge(c, brain);
  }

  const ps = getPenduPenaltyState(state, current?.id);
  const curse = ps.curse;
  if (ok && curse) {
    if (curse.id === "require_double") darts[0] = { bed:"D", number: Math.max(1, Number(darts[0]?.number || 20)) } as GameDart;
    else if (curse.id === "require_triple") darts[0] = { bed:"T", number: Math.max(1, Number(darts[0]?.number || 20)) } as GameDart;
    else if (curse.id === "require_top") darts[0] = { bed:"T", number:20 } as GameDart;
    else if (curse.id === "require_bottom") darts[0] = { bed:"T", number:3 } as GameDart;
    else if (curse.id === "color_red") darts[0] = { bed:"T", number:20 } as GameDart;
    else if (curse.id === "color_green") darts[0] = { bed:"T", number:19 } as GameDart;
    else if (curse.id === "color_black") darts[0] = { bed:"S", number:20 } as GameDart;
    else if (curse.id === "color_white") darts[0] = { bed:"S", number:1 } as GameDart;
    else if (curse.id === "two_hits") {
      if (!darts[1] || darts[1].bed === "MISS") darts[1] = randomDart(brain);
    } else if (curse.id === "ban_20") darts = darts.map((d:any) => Number(d?.number || 0) === 20 ? ({ bed:d.bed === "MISS" ? "MISS" : "S", number:19 } as GameDart) : d);
    else if (curse.id === "ban_bull") darts = darts.map((d:any) => d?.bed === "IB" || d?.bed === "OB" ? ({ bed:"T", number:19 } as GameDart) : d);
    else if (curse.id === "ban_left") darts = darts.map((d:any) => [11,14,9,12,5,20,1,18,4].includes(Number(d?.number||0)) ? ({bed:"S",number:6} as GameDart) : d);
    else if (curse.id === "ban_right") darts = darts.map((d:any) => [6,10,15,2,17,3,19,7,16].includes(Number(d?.number||0)) ? ({bed:"S",number:11} as GameDart) : d);
  }
  return darts.slice(0, penaltyMaxDarts(ps));
}
