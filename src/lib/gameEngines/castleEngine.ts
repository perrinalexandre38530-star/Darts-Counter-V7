// @ts-nocheck
// =============================================================
// CASTLE — moteur pur
// Construction / attaque de châteaux + manches BO1/BO3/BO5.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type CastleBotLevel = "easy" | "normal" | "hard";
export type CastleConfigPayload = {
  mode: "castle";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: CastleBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  rules: {
    targetBricks: number;
    numberAssignment: "random" | "offhand";
    attacksEnabled: boolean;
    reassignEachLeg: boolean;
  };
};

export type CastlePlayerStats = {
  darts: number;
  visits: number;
  usefulHits: number;
  builds: number;
  damage: number;
  misses: number;
  bulls: number;
  legsWon: number;
};

export type CastleVisit = {
  id: string;
  playerId: string;
  leg: number;
  turn: number;
  darts: GameDart[];
  before: Record<string, number>;
  after: Record<string, number>;
  events: string[];
};

export type CastleState = {
  sport: "darts";
  mode: "castle";
  config: CastleConfigPayload;
  players: Player[];
  targets: Record<string, number>;
  bricks: Record<string, number>;
  legWins: Record<string, number>;
  statsByPlayer: Record<string, CastlePlayerStats>;
  activePlayerIndex: number;
  assignmentIndex: number;
  legIndex: number;
  turnIndex: number;
  phase: "assignment" | "playing" | "finished";
  winnerId: string | null;
  lastLegWinnerId: string | null;
  visits: CastleVisit[];
  startedAt: number;
  finishedAt?: number;
};

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function id(prefix = "castle") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function multOf(d: GameDart) { return d?.bed === "T" ? 3 : d?.bed === "D" ? 2 : 1; }
function numberOf(d: GameDart) { return d?.bed === "S" || d?.bed === "D" || d?.bed === "T" ? Number(d.number || 0) : 0; }
function blankStats(): CastlePlayerStats { return { darts: 0, visits: 0, usefulHits: 0, builds: 0, damage: 0, misses: 0, bulls: 0, legsWon: 0 }; }

export function normalizeCastleConfig(raw: any): CastleConfigPayload {
  const rules = raw?.rules || {};
  const selectedIds = Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [];
  return {
    mode: "castle",
    selectedIds,
    players: Math.max(2, Number(raw?.players || selectedIds.length || 2)),
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    randomOrder: raw?.randomOrder !== false,
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    seriesWins: raw?.seriesWins === 2 || raw?.seriesWins === 3 ? raw.seriesWins : 1,
    rules: {
      targetBricks: [10, 15, 20].includes(Number(rules?.targetBricks)) ? Number(rules.targetBricks) : 15,
      numberAssignment: rules?.numberAssignment === "offhand" ? "offhand" : "random",
      attacksEnabled: rules?.attacksEnabled !== false,
      reassignEachLeg: rules?.reassignEachLeg !== false,
    },
  };
}

function shuffledNumbers(count: number): number[] {
  const a = Array.from({ length: 20 }, (_, i) => i + 1);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}

function assignRandom(players: Player[]): Record<string, number> {
  const nums = shuffledNumbers(players.length);
  return Object.fromEntries(players.map((p, i) => [p.id, nums[i] || ((i % 20) + 1)]));
}

export function createCastleState(players: Player[], rawConfig: any): CastleState {
  const config = normalizeCastleConfig(rawConfig);
  const safePlayers = (players || []).map((p, i) => ({ id: String(p?.id || `p${i + 1}`), name: String(p?.name || `Joueur ${i + 1}`) }));
  const random = config.rules.numberAssignment === "random";
  return {
    sport: "darts",
    mode: "castle",
    config,
    players: safePlayers,
    targets: random ? assignRandom(safePlayers) : {},
    bricks: Object.fromEntries(safePlayers.map((p) => [p.id, 0])),
    legWins: Object.fromEntries(safePlayers.map((p) => [p.id, 0])),
    statsByPlayer: Object.fromEntries(safePlayers.map((p) => [p.id, blankStats()])),
    activePlayerIndex: 0,
    assignmentIndex: 0,
    legIndex: 0,
    turnIndex: 0,
    phase: random ? "playing" : "assignment",
    winnerId: null,
    lastLegWinnerId: null,
    visits: [],
    startedAt: Date.now(),
  };
}

export function cloneCastleState(state: CastleState): CastleState { return clone(state); }

function firstFreeTarget(state: CastleState, desired: number): number {
  const used = new Set(Object.values(state.targets || {}).map(Number));
  const start = desired >= 1 && desired <= 20 ? desired : 1;
  for (let step = 0; step < 20; step++) {
    const n = ((start - 1 + step) % 20) + 1;
    if (!used.has(n)) return n;
  }
  return start;
}

export function assignCastleNumber(input: CastleState, dart: GameDart): CastleState {
  const state = cloneCastleState(input);
  if (state.phase !== "assignment" || !state.players.length) return state;
  const idx = Math.max(0, Math.min(state.players.length - 1, state.assignmentIndex));
  const player = state.players[idx];
  const raw = numberOf(dart);
  state.targets[player.id] = firstFreeTarget(state, raw || ((idx * 7 + state.legIndex * 3) % 20) + 1);
  state.assignmentIndex += 1;
  if (state.assignmentIndex >= state.players.length) {
    state.assignmentIndex = 0;
    state.activePlayerIndex = 0;
    state.phase = "playing";
  }
  return state;
}

function resetForNextLeg(state: CastleState) {
  state.legIndex += 1;
  state.turnIndex = 0;
  state.activePlayerIndex = 0;
  state.bricks = Object.fromEntries(state.players.map((p) => [p.id, 0]));
  if (state.config.rules.reassignEachLeg) {
    if (state.config.rules.numberAssignment === "random") {
      state.targets = assignRandom(state.players);
      state.phase = "playing";
    } else {
      state.targets = {};
      state.assignmentIndex = 0;
      state.phase = "assignment";
    }
  } else {
    state.phase = "playing";
  }
}

export function playCastleVisit(input: CastleState, dartsRaw: GameDart[]): CastleState {
  const state = cloneCastleState(input);
  if (state.phase !== "playing" || !state.players.length) return state;
  const darts = (dartsRaw || []).slice(0, 3);
  const player = state.players[state.activePlayerIndex];
  if (!player) return state;
  const before = clone(state.bricks);
  const events: string[] = [];
  const stats = state.statsByPlayer[player.id] || (state.statsByPlayer[player.id] = blankStats());
  stats.visits += 1;
  let legWinner: string | null = null;

  for (const dart of darts) {
    stats.darts += 1;
    if (!dart || dart.bed === "MISS") { stats.misses += 1; continue; }
    if (dart.bed === "OB" || dart.bed === "IB") { stats.bulls += 1; continue; }
    const n = numberOf(dart);
    const m = multOf(dart);
    if (!n) { stats.misses += 1; continue; }

    if (n === Number(state.targets[player.id])) {
      const old = Number(state.bricks[player.id] || 0);
      const next = Math.min(state.config.rules.targetBricks, old + m);
      const built = Math.max(0, next - old);
      state.bricks[player.id] = next;
      stats.usefulHits += 1;
      stats.builds += built;
      events.push(`+${built} brique${built > 1 ? "s" : ""} pour ${player.name}`);
      if (next >= state.config.rules.targetBricks) { legWinner = player.id; break; }
      continue;
    }

    if (state.config.rules.attacksEnabled) {
      const victim = state.players.find((p) => p.id !== player.id && Number(state.targets[p.id]) === n);
      if (victim) {
        const old = Number(state.bricks[victim.id] || 0);
        const next = Math.max(0, old - m);
        const damage = Math.max(0, old - next);
        state.bricks[victim.id] = next;
        stats.usefulHits += 1;
        stats.damage += damage;
        events.push(damage ? `−${damage} brique${damage > 1 ? "s" : ""} à ${victim.name}` : `${victim.name} est déjà à 0`);
      }
    }
  }

  state.visits.push({ id: id("castle-visit"), playerId: player.id, leg: state.legIndex + 1, turn: state.turnIndex + 1, darts, before, after: clone(state.bricks), events });
  state.turnIndex += 1;

  if (legWinner) {
    state.lastLegWinnerId = legWinner;
    state.legWins[legWinner] = Number(state.legWins[legWinner] || 0) + 1;
    state.statsByPlayer[legWinner].legsWon += 1;
    if (state.legWins[legWinner] >= state.config.seriesWins) {
      state.phase = "finished";
      state.winnerId = legWinner;
      state.finishedAt = Date.now();
      return state;
    }
    resetForNextLeg(state);
    return state;
  }

  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  return state;
}

export function castleDartLabel(d: GameDart): string {
  if (!d || d.bed === "MISS") return "MISS";
  if (d.bed === "IB") return "DBULL";
  if (d.bed === "OB") return "BULL";
  return `${d.bed}${d.number || ""}`;
}

function hitChance(level: CastleBotLevel) { return level === "hard" ? .84 : level === "easy" ? .48 : .67; }
function missDart(target: number): GameDart {
  const offset = 1 + Math.floor(Math.random() * 5);
  const n = ((target - 1 + (Math.random() < .5 ? offset : -offset) + 20) % 20) + 1;
  return { bed: "S", number: n };
}
export function pickCastleBotDarts(state: CastleState, level: CastleBotLevel = "normal"): GameDart[] {
  if (state.phase === "assignment") {
    const free = firstFreeTarget(state, 1 + Math.floor(Math.random() * 20));
    return [{ bed: "S", number: free }];
  }
  const p = state.players[state.activePlayerIndex];
  if (!p) return [];
  let target = Number(state.targets[p.id] || 20);
  if (state.config.rules.attacksEnabled && Math.random() < (level === "hard" ? .34 : level === "normal" ? .22 : .10)) {
    const rivals = state.players.filter((q) => q.id !== p.id).sort((a, b) => Number(state.bricks[b.id] || 0) - Number(state.bricks[a.id] || 0));
    if (rivals[0]) target = Number(state.targets[rivals[0].id] || target);
  }
  const chance = hitChance(level);
  return Array.from({ length: 3 }, () => {
    if (Math.random() > chance) return Math.random() < .12 ? { bed: "MISS" } : missDart(target);
    const roll = Math.random();
    const bed = level === "hard" ? (roll < .34 ? "T" : roll < .60 ? "D" : "S") : level === "easy" ? (roll < .08 ? "T" : roll < .22 ? "D" : "S") : (roll < .20 ? "T" : roll < .43 ? "D" : "S");
    return { bed, number: target } as GameDart;
  });
}
