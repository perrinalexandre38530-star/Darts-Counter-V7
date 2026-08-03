// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — moteur de jeu autonome
// - Carte issue de TERRITORIES
// - 20 zones actives reliées en graphe déterministe
// - S/D/T = 1/2/3 unités d'eau
// - Bull = largage ciblé, DBull = Canadair
// - Croissance, fumée, propagation, protection, destruction
// - Télémétrie complète pour historique et statistiques
// =============================================================

import type { GameDart } from "../types-game";
import type { TerritoriesMap, Territory } from "../../territories/types";

export type DartsFirefighterDifficulty = "recruit" | "firefighter" | "commander" | "inferno";
export type DartsFirefighterInputMethod = "keypad" | "dartboard";
export type DartsFirefighterFinishReason = "all_fires_out" | "critical_lost" | "destruction_limit" | "round_limit" | null;
export type FireStatus = "safe" | "protected" | "smoke" | "fire1" | "fire2" | "fire3" | "destroyed";

export type DartsFirefighterConfigPayload = {
  mode: "darts_firefighter";
  players: number;
  selectedIds: string[];
  playersList?: any[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  mapId: string;
  difficulty: DartsFirefighterDifficulty;
  activeTerritories: 12 | 16 | 20;
  initialFires: number;
  criticalTerritories: number;
  maxRounds: number;
  windEnabled: boolean;
  forecastEnabled: boolean;
  missEndsTurn: boolean;
  bullAirSupport: boolean;
  scoreInputMethod: DartsFirefighterInputMethod;
  randomOrder?: boolean;
};

export type DartsFirefighterPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  dartSetId?: string | null;
  isBot?: boolean;
};

export type FireTerritory = {
  id: string;
  name: string;
  short?: string;
  svgPathId: string;
  target: number;
  playable: boolean;
  critical: boolean;
  fireLevel: 0 | 1 | 2 | 3;
  smoke: boolean;
  protection: 0 | 1 | 2 | 3;
  destroyed: boolean;
  burnTurns: number;
  neighbors: string[];
  lastActionBy?: string | null;
};

export type FirefighterEvent = {
  type:
    | "water"
    | "extinguished"
    | "protected"
    | "smoke_cleared"
    | "spread_blocked"
    | "spread"
    | "grew"
    | "destroyed"
    | "canadair"
    | "bull_drop"
    | "miss"
    | "useless";
  territoryId?: string;
  territoryName?: string;
  value?: number;
  score?: number;
  label: string;
};

export type FirefighterVisit = {
  id: string;
  index: number;
  round: number;
  playerId: string;
  darts: GameDart[];
  labels: string[];
  score: number;
  comboBefore: number;
  comboAfter: number;
  totalFireBefore: number;
  totalFireAfter: number;
  selectedTerritoryId?: string | null;
  events: FirefighterEvent[];
  endedByMiss?: boolean;
};

export type FirefighterPlayerStats = {
  darts: number;
  visits: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  waterApplied: number;
  fireReduced: number;
  firesExtinguished: number;
  smokeCleared: number;
  protectionsPlaced: number;
  propagationBlocked: number;
  uselessDarts: number;
  score: number;
  bestVisitScore: number;
  perfectVisits: number;
  criticalInterventions: number;
  hitsBySegment: Record<string, number>;
};

export type DartsFirefighterState = {
  mode: "darts_firefighter";
  config: DartsFirefighterConfigPayload;
  players: DartsFirefighterPlayer[];
  map: TerritoriesMap;
  territories: FireTerritory[];
  activePlayerIndex: number;
  roundIndex: number;
  turnIndex: number;
  selectedTerritoryId: string | null;
  windOffset: -3 | -2 | -1 | 1 | 2 | 3;
  windLabel: string;
  forecastTerritoryIds: string[];
  combo: number;
  score: number;
  brigadeGauge: number;
  propagationBlocked: number;
  totalExtinguished: number;
  totalDestroyed: number;
  totalSpread: number;
  startedAt: number;
  finishedAt?: number;
  finished: boolean;
  won: boolean;
  finishReason: DartsFirefighterFinishReason;
  history: FirefighterVisit[];
  playerStats: Record<string, FirefighterPlayerStats>;
  seed: number;
};

const DIFFICULTY = {
  recruit: { growChance: .24, spreadChance: .38, smokeChance: .68, destructionTurns: 3, destructionLimit: 5, protectionDecay: .18, scoreMultiplier: 1 },
  firefighter: { growChance: .38, spreadChance: .55, smokeChance: .76, destructionTurns: 2, destructionLimit: 4, protectionDecay: .30, scoreMultiplier: 1.15 },
  commander: { growChance: .52, spreadChance: .70, smokeChance: .84, destructionTurns: 2, destructionLimit: 3, protectionDecay: .42, scoreMultiplier: 1.35 },
  inferno: { growChance: .68, spreadChance: .86, smokeChance: .92, destructionTurns: 1, destructionLimit: 2, protectionDecay: .58, scoreMultiplier: 1.65 },
} as const;

const WIND_LABELS: Record<number, string> = {
  [-3]: "VENT FORT OUEST",
  [-2]: "VENT OUEST",
  [-1]: "BRISE OUEST",
  [1]: "BRISE EST",
  [2]: "VENT EST",
  [3]: "VENT FORT EST",
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nextRandom(seed: number): [number, number] {
  let x = (seed || 0x9e3779b9) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  const next = x >>> 0;
  return [next / 0xffffffff, next];
}

function randomInt(state: DartsFirefighterState, max: number): number {
  const [r, seed] = nextRandom(state.seed);
  state.seed = seed;
  return Math.max(0, Math.min(max - 1, Math.floor(r * max)));
}

function chance(state: DartsFirefighterState, p: number): boolean {
  const [r, seed] = nextRandom(state.seed);
  state.seed = seed;
  return r < p;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function cloneDartsFirefighterState(state: DartsFirefighterState): DartsFirefighterState {
  return clone(state);
}

export function emptyFirefighterStats(): FirefighterPlayerStats {
  return {
    darts: 0, visits: 0, hits: 0, singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    waterApplied: 0, fireReduced: 0, firesExtinguished: 0, smokeCleared: 0, protectionsPlaced: 0,
    propagationBlocked: 0, uselessDarts: 0, score: 0, bestVisitScore: 0, perfectVisits: 0,
    criticalInterventions: 0, hitsBySegment: {},
  };
}

export function dartLabel(dart: GameDart): string {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number || 0}`;
}

export function dartWaterPower(dart: GameDart): number {
  if (!dart || dart.bed === "MISS") return 0;
  if (dart.bed === "S") return 1;
  if (dart.bed === "D") return 2;
  if (dart.bed === "T") return 3;
  if (dart.bed === "OB") return 2;
  if (dart.bed === "IB") return 3;
  return 0;
}

export function fireStatus(territory: FireTerritory): FireStatus {
  if (territory.destroyed) return "destroyed";
  if (territory.fireLevel === 3) return "fire3";
  if (territory.fireLevel === 2) return "fire2";
  if (territory.fireLevel === 1) return "fire1";
  if (territory.smoke) return "smoke";
  if (territory.protection > 0) return "protected";
  return "safe";
}

export function totalFire(state: Pick<DartsFirefighterState, "territories">): number {
  return state.territories.reduce((sum, t) => sum + (t.destroyed ? 0 : Number(t.fireLevel || 0)) + (t.smoke ? .5 : 0), 0);
}

export function activeIncidents(state: Pick<DartsFirefighterState, "territories">): number {
  return state.territories.filter((t) => !t.destroyed && (t.fireLevel > 0 || t.smoke)).length;
}

export function protectedCount(state: Pick<DartsFirefighterState, "territories">): number {
  return state.territories.filter((t) => !t.destroyed && t.protection > 0).length;
}

export function getActivePlayer(state: DartsFirefighterState): DartsFirefighterPlayer {
  return state.players[state.activePlayerIndex] || state.players[0];
}

export function getTargetTerritory(state: DartsFirefighterState, number: number): FireTerritory | null {
  return state.territories.find((t) => t.playable && !t.destroyed && t.target === number) || null;
}

function chooseActiveTerritories(map: TerritoriesMap, count: number): Territory[] {
  const source = [...(map.territories || [])].filter((t) => t && t.id && t.svgPathId);
  if (source.length <= count) return source;
  const out: Territory[] = [];
  const step = source.length / count;
  const used = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    let idx = Math.min(source.length - 1, Math.floor(i * step + step / 2));
    while (used.has(source[idx]?.id) && idx + 1 < source.length) idx += 1;
    if (source[idx] && !used.has(source[idx].id)) {
      used.add(source[idx].id);
      out.push(source[idx]);
    }
  }
  return out;
}

function buildNeighbors(ids: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const n = ids.length;
  ids.forEach((id, index) => {
    const indexes = [index - 1, index + 1, index - 3, index + 3]
      .map((x) => (x % n + n) % n)
      .filter((x, pos, arr) => x !== index && arr.indexOf(x) === pos);
    out[id] = indexes.map((x) => ids[x]);
  });
  return out;
}

function randomWind(state: DartsFirefighterState): void {
  const offsets = [-3, -2, -1, 1, 2, 3] as const;
  state.windOffset = offsets[randomInt(state, offsets.length)];
  state.windLabel = WIND_LABELS[state.windOffset] || "VENT VARIABLE";
}

function worstTerritory(state: DartsFirefighterState): FireTerritory | null {
  return [...state.territories]
    .filter((t) => t.playable && !t.destroyed)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || b.fireLevel - a.fireLevel || Number(b.smoke) - Number(a.smoke) || a.protection - b.protection)[0] || null;
}

function selectedOrWorst(state: DartsFirefighterState): FireTerritory | null {
  return state.territories.find((t) => t.id === state.selectedTerritoryId && t.playable && !t.destroyed) || worstTerritory(state);
}

function addEvent(events: FirefighterEvent[], event: FirefighterEvent) {
  events.push(event);
}

function applyWater(
  state: DartsFirefighterState,
  territory: FireTerritory | null,
  power: number,
  playerId: string,
  events: FirefighterEvent[],
  labelPrefix = "",
): { score: number; useful: boolean; fireReduced: number; protected: number; extinguished: boolean; smokeCleared: boolean } {
  if (!territory || territory.destroyed || power <= 0) return { score: 0, useful: false, fireReduced: 0, protected: 0, extinguished: false, smokeCleared: false };
  const rules = DIFFICULTY[state.config.difficulty];
  const beforeFire = territory.fireLevel;
  const beforeSmoke = territory.smoke;
  const beforeProtection = territory.protection;
  let remaining = power;
  let score = 0;
  let smokeCleared = false;

  if (territory.smoke && remaining > 0) {
    territory.smoke = false;
    remaining -= 1;
    smokeCleared = true;
    score += 90;
    addEvent(events, { type: "smoke_cleared", territoryId: territory.id, territoryName: territory.name, value: 1, score: 90, label: `${labelPrefix}Fumée dissipée · ${territory.name}` });
  }

  const reduced = Math.min(territory.fireLevel, remaining);
  if (reduced > 0) {
    territory.fireLevel = Math.max(0, territory.fireLevel - reduced) as any;
    remaining -= reduced;
    score += reduced * 100;
    addEvent(events, { type: "water", territoryId: territory.id, territoryName: territory.name, value: reduced, score: reduced * 100, label: `${labelPrefix}${reduced} niveau${reduced > 1 ? "x" : ""} de feu supprimé${reduced > 1 ? "s" : ""} · ${territory.name}` });
  }

  const extinguished = beforeFire > 0 && territory.fireLevel === 0;
  if (extinguished) {
    score += 200 + (territory.critical ? 120 : 0);
    territory.burnTurns = 0;
    addEvent(events, { type: "extinguished", territoryId: territory.id, territoryName: territory.name, value: beforeFire, score: 200 + (territory.critical ? 120 : 0), label: `${labelPrefix}INCENDIE ÉTEINT · ${territory.name}${territory.critical ? " · ZONE CRITIQUE" : ""}` });
  }

  const room = Math.max(0, 3 - territory.protection);
  const protectedAdded = Math.min(room, remaining);
  if (protectedAdded > 0) {
    territory.protection = Math.min(3, territory.protection + protectedAdded) as any;
    score += protectedAdded * 50;
    addEvent(events, { type: "protected", territoryId: territory.id, territoryName: territory.name, value: protectedAdded, score: protectedAdded * 50, label: `${labelPrefix}Zone refroidie +${protectedAdded} · ${territory.name}` });
  }

  territory.lastActionBy = playerId;
  score = Math.round(score * rules.scoreMultiplier);
  const useful = reduced > 0 || protectedAdded > 0 || smokeCleared || territory.protection > beforeProtection;
  if (!useful) addEvent(events, { type: "useless", territoryId: territory.id, territoryName: territory.name, score: 0, label: `${labelPrefix}Intervention sans effet · ${territory.name}` });
  return { score, useful, fireReduced: reduced, protected: protectedAdded, extinguished, smokeCleared };
}

function applyDart(state: DartsFirefighterState, dart: GameDart, playerId: string, events: FirefighterEvent[]) {
  const stats = state.playerStats[playerId] || (state.playerStats[playerId] = emptyFirefighterStats());
  const label = dartLabel(dart);
  stats.darts += 1;
  stats.hitsBySegment[label] = Number(stats.hitsBySegment[label] || 0) + 1;

  if (dart.bed === "MISS") {
    stats.misses += 1;
    stats.uselessDarts += 1;
    addEvent(events, { type: "miss", score: 0, label: "MISS · aucune eau délivrée" });
    return { score: 0, useful: false };
  }

  stats.hits += 1;
  if (dart.bed === "S") stats.singles += 1;
  else if (dart.bed === "D") stats.doubles += 1;
  else if (dart.bed === "T") stats.triples += 1;
  else if (dart.bed === "OB") stats.bulls += 1;
  else if (dart.bed === "IB") stats.dbulls += 1;

  let result;
  if (dart.bed === "IB" && state.config.bullAirSupport) {
    const center = selectedOrWorst(state);
    result = applyWater(state, center, 3, playerId, events, "CANADAIR · ");
    if (center) {
      for (const neighborId of center.neighbors.slice(0, 3)) {
        const neighbor = state.territories.find((t) => t.id === neighborId) || null;
        const extra = applyWater(state, neighbor, 1, playerId, events, "LARGAGE LATÉRAL · ");
        result.score += extra.score;
        result.fireReduced += extra.fireReduced;
        result.protected += extra.protected;
        result.extinguished = result.extinguished || extra.extinguished;
        result.smokeCleared = result.smokeCleared || extra.smokeCleared;
        result.useful = result.useful || extra.useful;
      }
      addEvent(events, { type: "canadair", territoryId: center.id, territoryName: center.name, score: 250, label: `CANADAIR engagé sur ${center.name}` });
      result.score += 250;
      state.brigadeGauge = Math.max(0, state.brigadeGauge - 35);
    }
  } else if (dart.bed === "OB") {
    const target = selectedOrWorst(state);
    result = applyWater(state, target, 2, playerId, events, "BULL · ");
    if (target) addEvent(events, { type: "bull_drop", territoryId: target.id, territoryName: target.name, score: 80, label: `Largage précis sur ${target.name}` });
    result.score += target ? 80 : 0;
  } else {
    const target = getTargetTerritory(state, Number(dart.number || 0));
    result = applyWater(state, target, dartWaterPower(dart), playerId, events);
  }

  stats.waterApplied += dartWaterPower(dart);
  stats.fireReduced += Number(result.fireReduced || 0);
  stats.protectionsPlaced += Number(result.protected || 0);
  stats.firesExtinguished += result.extinguished ? 1 : 0;
  stats.smokeCleared += result.smokeCleared ? 1 : 0;
  if (result.extinguished) state.totalExtinguished += 1;
  if (!result.useful) stats.uselessDarts += 1;
  if (result.useful) state.brigadeGauge = Math.min(100, state.brigadeGauge + 7 + Number(result.fireReduced || 0) * 4);
  return result;
}

function resolvePropagation(state: DartsFirefighterState, events: FirefighterEvent[], playerId: string) {
  const cfg = DIFFICULTY[state.config.difficulty];
  const active = state.territories.filter((t) => t.playable && !t.destroyed);
  const incomingSmoke = new Set<string>();
  const incomingFire = new Set<string>();

  for (const territory of active) {
    if (territory.protection > 0 && chance(state, cfg.protectionDecay)) {
      territory.protection = Math.max(0, territory.protection - 1) as any;
    }
    if (territory.smoke) {
      territory.smoke = false;
      territory.fireLevel = Math.max(1, territory.fireLevel) as any;
      addEvent(events, { type: "grew", territoryId: territory.id, territoryName: territory.name, value: 1, score: -70, label: `Départ de feu · ${territory.name}` });
      continue;
    }
    if (territory.fireLevel > 0 && territory.fireLevel < 3 && chance(state, cfg.growChance)) {
      territory.fireLevel = Math.min(3, territory.fireLevel + 1) as any;
      addEvent(events, { type: "grew", territoryId: territory.id, territoryName: territory.name, value: territory.fireLevel, score: -90, label: `Le feu gagne en intensité · ${territory.name}` });
    }
    if (territory.fireLevel === 3) {
      territory.burnTurns += 1;
      if (territory.burnTurns >= cfg.destructionTurns) {
        territory.destroyed = true;
        territory.fireLevel = 0;
        territory.smoke = false;
        territory.protection = 0;
        state.totalDestroyed += 1;
        state.score -= territory.critical ? 1000 : 500;
        addEvent(events, { type: "destroyed", territoryId: territory.id, territoryName: territory.name, score: territory.critical ? -1000 : -500, label: `${territory.critical ? "ZONE CRITIQUE PERDUE" : "TERRITOIRE DÉTRUIT"} · ${territory.name}` });
        continue;
      }
      if (chance(state, cfg.spreadChance)) {
        const currentIndex = active.findIndex((t) => t.id === territory.id);
        const windIndex = (currentIndex + state.windOffset + active.length) % active.length;
        const preferred = active[windIndex];
        const neighborIds = [preferred?.id, ...territory.neighbors].filter(Boolean);
        const targetId = neighborIds.find((id) => {
          const candidate = state.territories.find((t) => t.id === id);
          return candidate && candidate.playable && !candidate.destroyed && candidate.id !== territory.id;
        });
        const target = state.territories.find((t) => t.id === targetId);
        if (target) {
          if (target.protection > 0) {
            target.protection = Math.max(0, target.protection - 1) as any;
            state.propagationBlocked += 1;
            state.score += 150;
            const ownerStats = state.playerStats[target.lastActionBy || playerId] || state.playerStats[playerId];
            if (ownerStats) ownerStats.propagationBlocked += 1;
            addEvent(events, { type: "spread_blocked", territoryId: target.id, territoryName: target.name, score: 150, label: `PARE-FEU EFFICACE · propagation bloquée vers ${target.name}` });
          } else if (target.fireLevel > 0) {
            incomingFire.add(target.id);
          } else if (chance(state, cfg.smokeChance)) {
            incomingSmoke.add(target.id);
          } else {
            incomingFire.add(target.id);
          }
        }
      }
    } else if (territory.fireLevel === 0) {
      territory.burnTurns = 0;
    }
  }

  for (const id of incomingSmoke) {
    const target = state.territories.find((t) => t.id === id);
    if (!target || target.destroyed || target.fireLevel > 0) continue;
    target.smoke = true;
    state.totalSpread += 1;
    state.score -= 100;
    addEvent(events, { type: "spread", territoryId: target.id, territoryName: target.name, score: -100, label: `La fumée gagne ${target.name}` });
  }
  for (const id of incomingFire) {
    const target = state.territories.find((t) => t.id === id);
    if (!target || target.destroyed) continue;
    target.smoke = false;
    target.fireLevel = Math.min(3, Math.max(1, target.fireLevel + 1)) as any;
    state.totalSpread += 1;
    state.score -= 140;
    addEvent(events, { type: "spread", territoryId: target.id, territoryName: target.name, score: -140, label: `Propagation vers ${target.name}` });
  }

  if (state.config.windEnabled && (state.turnIndex + 1) % 3 === 0) randomWind(state);
  state.forecastTerritoryIds = computeForecast(state);
}

export function computeForecast(state: DartsFirefighterState): string[] {
  const active = state.territories.filter((t) => t.playable && !t.destroyed);
  const out: string[] = [];
  for (const territory of active.filter((t) => t.fireLevel === 3)) {
    const index = active.findIndex((t) => t.id === territory.id);
    const windIndex = (index + state.windOffset + active.length) % active.length;
    const preferred = active[windIndex];
    const id = preferred?.id || territory.neighbors[0];
    if (id && !out.includes(id)) out.push(id);
  }
  return out.slice(0, 4);
}

function evaluateEnd(state: DartsFirefighterState) {
  if (state.finished) return;
  const criticalLost = state.territories.some((t) => t.critical && t.destroyed);
  const cfg = DIFFICULTY[state.config.difficulty];
  if (criticalLost) {
    state.finished = true;
    state.won = false;
    state.finishReason = "critical_lost";
  } else if (state.totalDestroyed >= cfg.destructionLimit) {
    state.finished = true;
    state.won = false;
    state.finishReason = "destruction_limit";
  } else if (activeIncidents(state) === 0 && state.turnIndex > 0) {
    state.finished = true;
    state.won = true;
    state.finishReason = "all_fires_out";
    const criticalSaved = state.territories.filter((t) => t.critical && !t.destroyed).length;
    state.score += criticalSaved * 300 + Math.max(0, state.config.maxRounds - state.roundIndex - 1) * 100;
  } else if (state.config.maxRounds > 0 && state.roundIndex >= state.config.maxRounds) {
    state.finished = true;
    state.won = false;
    state.finishReason = "round_limit";
  }
  if (state.finished) state.finishedAt = Date.now();
}

export function createDartsFirefighterState(
  players: DartsFirefighterPlayer[],
  config: DartsFirefighterConfigPayload,
  rawMap: TerritoriesMap,
  now = Date.now(),
): DartsFirefighterState {
  const safePlayers = players.length ? players : [{ id: "p1", name: "Joueur 1" }];
  const activeCount = Math.max(6, Math.min(20, Number(config.activeTerritories || 20)));
  const chosen = chooseActiveTerritories(rawMap, activeCount);
  const chosenIds = chosen.map((t) => t.id);
  const neighbors = buildNeighbors(chosenIds);
  const activeIdSet = new Set(chosenIds);
  const seedBase = hash(`${config.mapId}|${config.difficulty}|${now}|${safePlayers.map((p) => p.id).join("|")}`);

  const territories: FireTerritory[] = (rawMap.territories || []).map((territory) => {
    const activeIndex = chosen.findIndex((t) => t.id === territory.id);
    return {
      id: territory.id,
      name: territory.name || territory.id,
      short: (territory as any).short,
      svgPathId: territory.svgPathId,
      target: activeIndex >= 0 ? activeIndex + 1 : 0,
      playable: activeIdSet.has(territory.id),
      critical: false,
      fireLevel: 0,
      smoke: false,
      protection: 0,
      destroyed: false,
      burnTurns: 0,
      neighbors: neighbors[territory.id] || [],
      lastActionBy: null,
    };
  });

  const map: TerritoriesMap = {
    ...rawMap,
    territories: rawMap.territories.map((territory) => ({ ...territory, playable: activeIdSet.has(territory.id) })),
    playableTerritoryCount: activeIdSet.size,
    disabledTerritoryCount: Math.max(0, rawMap.territories.length - activeIdSet.size),
  };

  const state: DartsFirefighterState = {
    mode: "darts_firefighter",
    config,
    players: safePlayers,
    map,
    territories,
    activePlayerIndex: 0,
    roundIndex: 0,
    turnIndex: 0,
    selectedTerritoryId: chosenIds[0] || null,
    windOffset: 1,
    windLabel: "BRISE EST",
    forecastTerritoryIds: [],
    combo: 0,
    score: 0,
    brigadeGauge: 0,
    propagationBlocked: 0,
    totalExtinguished: 0,
    totalDestroyed: 0,
    totalSpread: 0,
    startedAt: now,
    finished: false,
    won: false,
    finishReason: null,
    history: [],
    playerStats: {},
    seed: seedBase,
  };
  safePlayers.forEach((p) => { state.playerStats[p.id] = emptyFirefighterStats(); });
  randomWind(state);

  const active = state.territories.filter((t) => t.playable);
  const criticalCount = Math.max(0, Math.min(active.length, Number(config.criticalTerritories || 0)));
  const criticalPool = [...active];
  for (let i = 0; i < criticalCount && criticalPool.length; i += 1) {
    const idx = randomInt(state, criticalPool.length);
    const selected = criticalPool.splice(idx, 1)[0];
    if (selected) selected.critical = true;
  }

  const initialFireCount = Math.max(1, Math.min(active.length, Number(config.initialFires || 2)));
  const firePool = [...active].sort((a, b) => Number(b.critical) - Number(a.critical));
  for (let i = 0; i < initialFireCount && firePool.length; i += 1) {
    const idx = randomInt(state, firePool.length);
    const target = firePool.splice(idx, 1)[0];
    if (!target) continue;
    const base = config.difficulty === "inferno" ? 3 : config.difficulty === "commander" ? 2 : i === 0 ? 2 : 1;
    target.fireLevel = base as any;
  }
  if (config.difficulty === "commander" || config.difficulty === "inferno") {
    const smokeTarget = firePool[randomInt(state, Math.max(1, firePool.length))];
    if (smokeTarget) smokeTarget.smoke = true;
  }
  state.forecastTerritoryIds = computeForecast(state);
  return state;
}

export function selectFireTerritory(state: DartsFirefighterState, territoryId: string | null): DartsFirefighterState {
  const next = cloneDartsFirefighterState(state);
  const target = next.territories.find((t) => t.id === territoryId && t.playable && !t.destroyed);
  next.selectedTerritoryId = target?.id || null;
  return next;
}

export function playDartsFirefighterVisit(state: DartsFirefighterState, darts: GameDart[]): DartsFirefighterState {
  if (state.finished) return state;
  const next = cloneDartsFirefighterState(state);
  const player = getActivePlayer(next);
  const stats = next.playerStats[player.id] || (next.playerStats[player.id] = emptyFirefighterStats());
  const safeDarts = (darts || []).slice(0, 3);
  const processedDarts: GameDart[] = [];
  const events: FirefighterEvent[] = [];
  const before = totalFire(next);
  const comboBefore = next.combo;
  let visitScore = 0;
  let usefulDarts = 0;
  let endedByMiss = false;

  for (const dart of safeDarts) {
    processedDarts.push(dart);
    const result = applyDart(next, dart, player.id, events);
    visitScore += Number(result.score || 0);
    if (result.useful) usefulDarts += 1;
    if (dart.bed === "MISS" && next.config.missEndsTurn) {
      endedByMiss = true;
      break;
    }
  }

  if (usefulDarts > 0) next.combo = Math.min(12, next.combo + usefulDarts);
  else next.combo = 0;
  const comboMultiplier = 1 + Math.min(.75, comboBefore * .05);
  visitScore = Math.round(visitScore * comboMultiplier);
  if (processedDarts.length === 3 && usefulDarts === 3) {
    visitScore += 200;
    stats.perfectVisits += 1;
  }
  next.score += visitScore;
  stats.score += visitScore;
  stats.visits += 1;
  stats.bestVisitScore = Math.max(stats.bestVisitScore, visitScore);
  stats.criticalInterventions += events.filter((e) => e.territoryId && next.territories.find((t) => t.id === e.territoryId)?.critical && (e.type === "water" || e.type === "extinguished" || e.type === "protected")).length;

  resolvePropagation(next, events, player.id);

  const visit: FirefighterVisit = {
    id: `fire-visit-${next.turnIndex + 1}-${player.id}-${next.seed.toString(36)}`,
    index: next.history.length + 1,
    round: next.roundIndex + 1,
    playerId: player.id,
    darts: processedDarts,
    labels: processedDarts.map(dartLabel),
    score: visitScore,
    comboBefore,
    comboAfter: next.combo,
    totalFireBefore: before,
    totalFireAfter: totalFire(next),
    selectedTerritoryId: next.selectedTerritoryId,
    events,
    endedByMiss,
  };
  next.history.push(visit);
  next.turnIndex += 1;
  next.activePlayerIndex = (next.activePlayerIndex + 1) % next.players.length;
  if (next.activePlayerIndex === 0) next.roundIndex += 1;
  evaluateEnd(next);
  return next;
}

export function fireTerritoryColor(status: FireStatus): string {
  if (status === "destroyed") return "#3f4650";
  if (status === "fire3") return "#ff2b1f";
  if (status === "fire2") return "#ff6a1f";
  if (status === "fire1") return "#ffb11f";
  if (status === "smoke") return "#9c7b57";
  if (status === "protected") return "#25c9ff";
  return "rgba(255,255,255,.03)";
}

export function buildFireMapForView(state: DartsFirefighterState): TerritoriesMap {
  const byId = new Map(state.territories.map((t) => [t.id, t]));
  return {
    ...state.map,
    territories: state.map.territories.map((territory) => {
      const fire = byId.get(territory.id);
      if (!fire) return { ...territory };
      return {
        ...territory,
        playable: fire.playable,
        ownerId: fire.playable ? `fire-status-${fireStatus(fire)}` : undefined,
        fortressOwnerId: fire.critical && !fire.destroyed ? `critical-${fire.id}` : undefined,
      };
    }),
  };
}

export const FIRE_STATUS_OWNER_COLORS: Record<string, string> = {
  "fire-status-safe": "rgba(255,255,255,.04)",
  "fire-status-protected": "#25c9ff",
  "fire-status-smoke": "#9c7b57",
  "fire-status-fire1": "#ffb11f",
  "fire-status-fire2": "#ff6a1f",
  "fire-status-fire3": "#ff2b1f",
  "fire-status-destroyed": "#3f4650",
};

export function difficultyLabel(value: DartsFirefighterDifficulty): string {
  return value === "recruit" ? "RECRUE" : value === "firefighter" ? "POMPIER" : value === "commander" ? "COMMANDANT" : "INFERNO";
}

export function finishReasonLabel(reason: DartsFirefighterFinishReason): string {
  if (reason === "all_fires_out") return "INCENDIE MAÎTRISÉ";
  if (reason === "critical_lost") return "ZONE CRITIQUE PERDUE";
  if (reason === "destruction_limit") return "TROP DE TERRITOIRES DÉTRUITS";
  if (reason === "round_limit") return "TEMPS D’INTERVENTION ÉCOULÉ";
  return "MISSION TERMINÉE";
}
