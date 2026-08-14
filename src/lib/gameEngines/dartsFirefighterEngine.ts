// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — moteur de jeu autonome
// - Carte issue de TERRITORIES
// - nombre de zones configurable, jusqu’à la carte complète
// - propagation basée en priorité sur une vraie proximité géographique approximative
// - S/D/T = 1/2/3 unités d'eau
// - Bull = largage ciblé, DBull = Canadair
// - Croissance, fumée, propagation, protection, destruction
// - Télémétrie complète pour historique et statistiques
// =============================================================

import type { GameDart } from "../types-game";
import type { TerritoriesMap, Territory } from "../../territories/types";
import { getBaseSvgForCountry } from "../../territories/map";
import { applyBalancedTerritoryValues, buildTerritoryValueCalibration } from "../../territories/territoryValueBalancing";
import { MAX_PLAYABLE_TERRITORIES } from "../../territories/territoryValueRules";

export type DartsFirefighterDifficulty = "recruit" | "firefighter" | "commander" | "inferno";
export type DartsFirefighterInputMethod = "keypad" | "dartboard";
export type DartsFirefighterObjective = "extinguish_all" | "protect_critical" | "survival";
export type DartsFirefighterPropagationTiming = "after_visit" | "after_round";
export type DartsFirefighterFirePlacement = "random" | "clustered" | "critical_first";
export type DartsFirefighterTargetOrder = "sequential" | "random";
export type DartsFirefighterTargetMode = "sector" | "visit_score";
export type DartsFirefighterWindStrength = "light" | "normal" | "strong";
export type DartsFirefighterInitialIntensity = "mixed" | 1 | 2 | 3;
export type DartsFirefighterFinishReason = "all_fires_out" | "objective_complete" | "critical_lost" | "destruction_limit" | "round_limit" | null;
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
  missionPreset?: "express" | "wildfire" | "civil_protection" | "inferno_survival" | "custom";
  objective?: DartsFirefighterObjective;
  activeTerritories: number;
  targetOrder?: DartsFirefighterTargetOrder;
  initialFires: number;
  initialFireLevel?: DartsFirefighterInitialIntensity;
  initialSmoke?: number;
  initialProtectedTerritories?: number;
  firePlacement?: DartsFirefighterFirePlacement;
  criticalTerritories: number;
  criticalLossEndsMission?: boolean;
  maxRounds: number;
  destructionLimit?: number;
  growthChance?: number;
  spreadChance?: number;
  smokeChance?: number;
  destructionTurns?: number;
  protectionDecay?: number;
  propagationTiming?: DartsFirefighterPropagationTiming;
  maxSpreadsPerCycle?: number;
  reinforcementEveryRounds?: number;
  reinforcementCount?: number;
  windEnabled: boolean;
  windStrength?: DartsFirefighterWindStrength;
  windChangeEvery?: number;
  forecastEnabled: boolean;
  forecastCount?: number;
  dartsPerTurn?: 1 | 2 | 3;
  missEndsTurn: boolean;
  comboEnabled?: boolean;
  perfectVisitBonus?: number;
  bullAirSupport: boolean;
  bullPower?: 1 | 2 | 3;
  bullTargetMode?: "selected" | "priority";
  canadairCenterPower?: 2 | 3;
  canadairNeighborPower?: 1 | 2;
  canadairNeighborCount?: 1 | 2 | 3 | 4;
  canadairRequiresGauge?: boolean;
  canadairGaugeCost?: number;
  startingBrigadeGauge?: number;
  scoreInputMethod: DartsFirefighterInputMethod;
  randomOrder?: boolean;
  /** Petites cartes (<=20) : chaque fléchette numérotée peut agir sur son propre territoire. */
  multiInterventionPerDart?: boolean;
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
  /** Maximum autorisé pour cette volée. */
  maxDarts?: number;
  /** Fléchettes non lancées à la fin de la volée. */
  unusedDarts?: number;
  /** Vrai lorsque le joueur a volontairement validé avant la limite. */
  voluntaryStop?: boolean;
  /** Total réel marqué aux fléchettes dans le mode cibles uniques. */
  rawDartScore?: number;
  /** Valeur exacte atteinte lorsqu’un territoire a été activé. */
  matchedTargetScore?: number | null;
  targetMode?: DartsFirefighterTargetMode;
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
  oneDartVisits: number;
  twoDartVisits: number;
  threeDartVisits: number;
  earlyValidatedVisits: number;
  dartsSaved: number;
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
  propagationIndex: number;
  lastReinforcementRound: number;
  selectedTerritoryId: string | null;
  windOffset: -3 | -2 | -1 | 1 | 2 | 3;
  windLabel: string;
  /** Direction météorologique d'origine sur une rose des vents 16 points. */
  windFromIndex?: number;
  windFromCode?: string;
  /** Direction vers laquelle le vent pousse le front. */
  windToCode?: string;
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
  /** Mode secteur classique jusqu’à 20 zones, score exact unique au-delà. */
  targetMode?: DartsFirefighterTargetMode;
  /** Calibration calculée au lancement à partir du niveau réel de la brigade. */
  targetCalibration?: { referenceAvg3: number; minTarget: number; maxTarget: number; label: string; playerCount: number };
};

const DIFFICULTY = {
  recruit: { growChance: .24, spreadChance: .38, smokeChance: .68, destructionTurns: 3, destructionLimit: 5, protectionDecay: .18, scoreMultiplier: 1 },
  firefighter: { growChance: .38, spreadChance: .55, smokeChance: .76, destructionTurns: 2, destructionLimit: 4, protectionDecay: .30, scoreMultiplier: 1.15 },
  commander: { growChance: .52, spreadChance: .70, smokeChance: .84, destructionTurns: 2, destructionLimit: 3, protectionDecay: .42, scoreMultiplier: 1.35 },
  inferno: { growChance: .68, spreadChance: .86, smokeChance: .92, destructionTurns: 1, destructionLimit: 2, protectionDecay: .58, scoreMultiplier: 1.65 },
} as const;

function clamp01(value: any, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

export function dartsFirefighterDifficultyRules(difficulty: DartsFirefighterDifficulty) {
  return { ...(DIFFICULTY[difficulty] || DIFFICULTY.firefighter) };
}

function effectiveRules(config: DartsFirefighterConfigPayload) {
  const base = DIFFICULTY[config.difficulty] || DIFFICULTY.firefighter;
  return {
    ...base,
    growChance: clamp01(config.growthChance, base.growChance),
    spreadChance: clamp01(config.spreadChance, base.spreadChance),
    smokeChance: clamp01(config.smokeChance, base.smokeChance),
    protectionDecay: clamp01(config.protectionDecay, base.protectionDecay),
    destructionTurns: Math.max(1, Math.min(6, Number(config.destructionTurns || base.destructionTurns))),
    destructionLimit: Math.max(1, Math.min(20, Number(config.destructionLimit || base.destructionLimit))),
  };
}

export function normalizeDartsFirefighterConfig(raw: Partial<DartsFirefighterConfigPayload> | any = {}): DartsFirefighterConfigPayload {
  const difficulty: DartsFirefighterDifficulty = ["recruit", "firefighter", "commander", "inferno"].includes(raw?.difficulty) ? raw.difficulty : "firefighter";
  const base = DIFFICULTY[difficulty];
  const requestedActive = Number(raw?.activeTerritories);
  const active = Number.isFinite(requestedActive)
    ? Math.max(8, Math.min(MAX_PLAYABLE_TERRITORIES, Math.round(requestedActive)))
    : 20;
  const objective: DartsFirefighterObjective = ["extinguish_all", "protect_critical", "survival"].includes(raw?.objective) ? raw.objective : "extinguish_all";
  return {
    mode: "darts_firefighter",
    players: Math.max(1, Math.min(8, Number(raw?.players || raw?.selectedIds?.length || 1))),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    mapId: String(raw?.mapId || "FR"),
    difficulty,
    missionPreset: ["express", "wildfire", "civil_protection", "inferno_survival", "custom"].includes(raw?.missionPreset) ? raw.missionPreset : "custom",
    objective,
    activeTerritories: active as any,
    targetOrder: raw?.targetOrder === "random" ? "random" : "sequential",
    initialFires: Math.max(1, Math.min(8, Number(raw?.initialFires || 3))),
    initialFireLevel: raw?.initialFireLevel === "mixed" || [1, 2, 3].includes(Number(raw?.initialFireLevel)) ? raw.initialFireLevel : "mixed",
    initialSmoke: Math.max(0, Math.min(8, Number(raw?.initialSmoke || 0))),
    initialProtectedTerritories: Math.max(0, Math.min(8, Number(raw?.initialProtectedTerritories || 0))),
    firePlacement: ["random", "clustered", "critical_first"].includes(raw?.firePlacement) ? raw.firePlacement : "random",
    criticalTerritories: Math.max(0, Math.min(8, Number(raw?.criticalTerritories ?? 2))),
    criticalLossEndsMission: raw?.criticalLossEndsMission !== false,
    maxRounds: Math.max(1, Math.min(60, Number(raw?.maxRounds || 18))),
    destructionLimit: Math.max(1, Math.min(12, Number(raw?.destructionLimit || base.destructionLimit))),
    growthChance: clamp01(raw?.growthChance, base.growChance),
    spreadChance: clamp01(raw?.spreadChance, base.spreadChance),
    smokeChance: clamp01(raw?.smokeChance, base.smokeChance),
    destructionTurns: Math.max(1, Math.min(6, Number(raw?.destructionTurns || base.destructionTurns))),
    protectionDecay: clamp01(raw?.protectionDecay, base.protectionDecay),
    propagationTiming: raw?.propagationTiming === "after_round" ? "after_round" : "after_visit",
    maxSpreadsPerCycle: Math.max(1, Math.min(8, Number(raw?.maxSpreadsPerCycle || 2))),
    reinforcementEveryRounds: Math.max(0, Math.min(10, Number(raw?.reinforcementEveryRounds || 0))),
    reinforcementCount: Math.max(1, Math.min(4, Number(raw?.reinforcementCount || 1))),
    windEnabled: raw?.windEnabled !== false,
    windStrength: ["light", "normal", "strong"].includes(raw?.windStrength) ? raw.windStrength : "normal",
    windChangeEvery: Math.max(1, Math.min(10, Number(raw?.windChangeEvery || 3))),
    forecastEnabled: raw?.forecastEnabled !== false,
    forecastCount: Math.max(1, Math.min(6, Number(raw?.forecastCount || 4))),
    dartsPerTurn: (active > 20 ? 3 : ([1, 2, 3].includes(Number(raw?.dartsPerTurn)) ? Number(raw.dartsPerTurn) : 3)) as any,
    missEndsTurn: Boolean(raw?.missEndsTurn),
    comboEnabled: raw?.comboEnabled !== false,
    perfectVisitBonus: Math.max(0, Math.min(1000, Number(raw?.perfectVisitBonus ?? 200))),
    bullAirSupport: raw?.bullAirSupport !== false,
    bullPower: ([1, 2, 3].includes(Number(raw?.bullPower)) ? Number(raw.bullPower) : 2) as any,
    bullTargetMode: raw?.bullTargetMode === "priority" ? "priority" : "selected",
    canadairCenterPower: ([2, 3].includes(Number(raw?.canadairCenterPower)) ? Number(raw.canadairCenterPower) : 3) as any,
    canadairNeighborPower: ([1, 2].includes(Number(raw?.canadairNeighborPower)) ? Number(raw.canadairNeighborPower) : 1) as any,
    canadairNeighborCount: ([1, 2, 3, 4].includes(Number(raw?.canadairNeighborCount)) ? Number(raw.canadairNeighborCount) : 3) as any,
    canadairRequiresGauge: Boolean(raw?.canadairRequiresGauge),
    canadairGaugeCost: Math.max(0, Math.min(100, Number(raw?.canadairGaugeCost ?? 35))),
    startingBrigadeGauge: Math.max(0, Math.min(100, Number(raw?.startingBrigadeGauge ?? 0))),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    randomOrder: Boolean(raw?.randomOrder),
    multiInterventionPerDart: raw?.multiInterventionPerDart !== false,
  };
}

const WIND_16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"] as const;

function windStrengthLabel(config: DartsFirefighterConfigPayload) {
  return config.windStrength === "strong" ? "FORT" : config.windStrength === "light" ? "LÉGER" : "BRISE";
}

function oppositeWindIndex(index: number) {
  return (Math.round(index) + 8) % 16;
}

function normalizeWindIndex(index: number) {
  return ((Math.round(index) % 16) + 16) % 16;
}

function windSourceIndex(state: DartsFirefighterState) {
  if (Number.isFinite(Number(state.windFromIndex))) return normalizeWindIndex(Number(state.windFromIndex));
  const raw = String(state.windFromCode || state.windLabel || "").toUpperCase();
  const explicit = WIND_16.findIndex((code) => raw === code || raw.includes(` ${code}→`) || raw.includes(` ${code} ->`) || raw.endsWith(` ${code}`));
  if (explicit >= 0) return explicit;
  if (raw.includes("OUEST")) return 12;
  if (raw.includes("EST")) return 4;
  if (raw.includes("NORD")) return 0;
  if (raw.includes("SUD")) return 8;
  return 4;
}

function windTargetIndex(state: DartsFirefighterState) {
  return oppositeWindIndex(windSourceIndex(state));
}

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
    criticalInterventions: 0, oneDartVisits: 0, twoDartVisits: 0, threeDartVisits: 0,
    earlyValidatedVisits: 0, dartsSaved: 0, hitsBySegment: {},
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

export function dartScoreValue(dart: GameDart): number {
  if (!dart || dart.bed === "MISS") return 0;
  if (dart.bed === "OB") return 25;
  if (dart.bed === "IB") return 50;
  const number = Math.max(0, Math.min(20, Number(dart.number || 0)));
  if (dart.bed === "D") return number * 2;
  if (dart.bed === "T") return number * 3;
  return number;
}

function recordDartStatsOnly(stats: FirefighterPlayerStats, dart: GameDart) {
  const label = dartLabel(dart);
  stats.darts += 1;
  stats.hitsBySegment[label] = Number(stats.hitsBySegment[label] || 0) + 1;
  if (dart.bed === "MISS") { stats.misses += 1; return; }
  stats.hits += 1;
  if (dart.bed === "S") stats.singles += 1;
  else if (dart.bed === "D") stats.doubles += 1;
  else if (dart.bed === "T") stats.triples += 1;
  else if (dart.bed === "OB") stats.bulls += 1;
  else if (dart.bed === "IB") stats.dbulls += 1;
}

function resolveVisitScoreTarget(state: DartsFirefighterState, rawScore: number): FireTerritory | null {
  const selected = state.territories.find((territory) => territory.id === state.selectedTerritoryId && territory.playable && !territory.destroyed) || null;
  // La sélection sert de priorité, jamais de verrou : si le score correspond à une autre
  // cible active, le moteur doit pouvoir la reconnaître.
  if (selected && Number(selected.target) === Number(rawScore)) return selected;
  return state.territories.find((territory) => territory.playable && !territory.destroyed && Number(territory.target) === Number(rawScore)) || null;
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
  const rows = state.territories.filter((t) => t.playable && !t.destroyed && t.target === number);
  if (!rows.length) return null;
  const selected = rows.find((territory) => territory.id === state.selectedTerritoryId);
  if (selected) return selected;
  return rows.sort((a, b) => Number(b.critical) - Number(a.critical) || b.fireLevel - a.fireLevel || Number(b.smoke) - Number(a.smoke) || a.protection - b.protection || a.name.localeCompare(b.name))[0] || null;
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

type TerritoryBounds = { x1: number; y1: number; x2: number; y2: number; cx: number; cy: number; width: number; height: number };
const territoryBoundsCache = new Map<string, Record<string, TerritoryBounds>>();

function parseNumericPathBounds(pathData: string): TerritoryBounds | null {
  if (!pathData) return null;
  const tokens = (pathData.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || []);
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const touch = (px: number, py: number) => {
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  };
  const isCmd = (value: string) => /^[a-zA-Z]$/.test(value);
  const hasNumber = () => i < tokens.length && !isCmd(tokens[i]);
  const read = () => Number(tokens[i++]);

  while (i < tokens.length) {
    if (isCmd(tokens[i])) cmd = tokens[i++];
    if (!cmd) break;
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;

    if (lower === "m") {
      if (!hasNumber()) continue;
      const px = read();
      const py = read();
      x = rel ? x + px : px;
      y = rel ? y + py : py;
      startX = x;
      startY = y;
      touch(x, y);
      while (hasNumber()) {
        const lx = read();
        const ly = read();
        x = rel ? x + lx : lx;
        y = rel ? y + ly : ly;
        touch(x, y);
      }
      continue;
    }

    if (lower === "z") {
      x = startX;
      y = startY;
      touch(x, y);
      continue;
    }

    if (lower === "l" || lower === "t") {
      while (hasNumber()) {
        const px = read();
        const py = read();
        x = rel ? x + px : px;
        y = rel ? y + py : py;
        touch(x, y);
      }
      continue;
    }

    if (lower === "h") {
      while (hasNumber()) {
        const px = read();
        x = rel ? x + px : px;
        touch(x, y);
      }
      continue;
    }

    if (lower === "v") {
      while (hasNumber()) {
        const py = read();
        y = rel ? y + py : py;
        touch(x, y);
      }
      continue;
    }

    if (lower === "c") {
      while (hasNumber()) {
        const x1 = read(); const y1 = read();
        const x2 = read(); const y2 = read();
        const x3 = read(); const y3 = read();
        touch(rel ? x + x1 : x1, rel ? y + y1 : y1);
        touch(rel ? x + x2 : x2, rel ? y + y2 : y2);
        x = rel ? x + x3 : x3;
        y = rel ? y + y3 : y3;
        touch(x, y);
      }
      continue;
    }

    if (lower === "s" || lower === "q") {
      while (hasNumber()) {
        const x1 = read(); const y1 = read();
        const x2 = read(); const y2 = read();
        touch(rel ? x + x1 : x1, rel ? y + y1 : y1);
        x = rel ? x + x2 : x2;
        y = rel ? y + y2 : y2;
        touch(x, y);
      }
      continue;
    }

    if (lower === "a") {
      while (hasNumber()) {
        read(); read(); read(); read(); read();
        const px = read();
        const py = read();
        x = rel ? x + px : px;
        y = rel ? y + py : py;
        touch(x, y);
      }
      continue;
    }

    if (lower === "r") {
      while (hasNumber()) {
        const px = read();
        const py = read();
        x = rel ? x + px : px;
        y = rel ? y + py : py;
        touch(x, y);
      }
      continue;
    }

    i += 1;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return {
    x1: minX,
    y1: minY,
    x2: maxX,
    y2: maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function translateBounds(bounds: TerritoryBounds, tx = 0, ty = 0, scale = 1): TerritoryBounds {
  const x1 = bounds.x1 * scale + tx;
  const y1 = bounds.y1 * scale + ty;
  const x2 = bounds.x2 * scale + tx;
  const y2 = bounds.y2 * scale + ty;
  return {
    x1, y1, x2, y2,
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
    width: Math.max(1, x2 - x1),
    height: Math.max(1, y2 - y1),
  };
}

function parseTransform(transform?: string | null): { tx: number; ty: number; scale: number } {
  const raw = String(transform || "");
  const translate = /translate\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/.exec(raw);
  const scale = /scale\(([-\d.]+)/.exec(raw);
  return {
    tx: translate ? Number(translate[1] || 0) : 0,
    ty: translate ? Number(translate[2] || 0) : 0,
    scale: scale ? Number(scale[1] || 1) : 1,
  };
}

function buildBoundsForMap(country: string, activeTerritories: Territory[]): Record<string, TerritoryBounds> {
  const cacheKey = `${country}|${activeTerritories.map((territory) => territory.id).join("|")}`;
  const cached = territoryBoundsCache.get(cacheKey);
  if (cached) return cached;
  const fallback: Record<string, TerritoryBounds> = {};
  try {
    if (typeof DOMParser === "undefined") throw new Error("dom-unavailable");
    const rawSvg = getBaseSvgForCountry(String(country || "FR") as any);
    const doc = new DOMParser().parseFromString(rawSvg, "image/svg+xml");
    const paths = Array.from(doc.querySelectorAll("path"));
    for (const territory of activeTerritories) {
      const searchId = String(territory.svgPathId || "").trim();
      const path = paths.find((candidate) => {
        if (String(country).toUpperCase() === "FR") {
          return String(candidate.getAttribute("data-numerodepartement") || "") === searchId.replace(/^FR-/, "");
        }
        return String(candidate.getAttribute("id") || "") === searchId || String(candidate.getAttribute("id") || "") === territory.id;
      });
      const d = path?.getAttribute("d") || "";
      const parsed = parseNumericPathBounds(d);
      if (!parsed) continue;
      const { tx, ty, scale } = parseTransform(path?.getAttribute("transform"));
      fallback[territory.id] = translateBounds(parsed, tx, ty, scale);
    }
  } catch {
    // fallback returned below
  }
  territoryBoundsCache.set(cacheKey, fallback);
  return fallback;
}

function buildFallbackNeighbors(ids: string[]): Record<string, string[]> {
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

function buildNeighbors(map: TerritoriesMap, activeTerritories: Territory[]): Record<string, string[]> {
  const ids = activeTerritories.map((territory) => territory.id);
  if (ids.length <= 1) return buildFallbackNeighbors(ids);
  const boxes = buildBoundsForMap(map.country, activeTerritories);
  if (Object.keys(boxes).length < Math.max(2, Math.floor(ids.length * 0.35))) return buildFallbackNeighbors(ids);

  const out: Record<string, string[]> = {};
  for (const territory of activeTerritories) {
    const boxA = boxes[territory.id];
    if (!boxA) continue;
    const candidates: Array<{ id: string; score: number; overlap: boolean }> = [];
    for (const other of activeTerritories) {
      if (other.id === territory.id) continue;
      const boxB = boxes[other.id];
      if (!boxB) continue;
      const tolerance = Math.max(2.5, Math.min(boxA.width, boxA.height, boxB.width, boxB.height) * 0.18);
      const overlapX = Math.min(boxA.x2 + tolerance, boxB.x2 + tolerance) - Math.max(boxA.x1 - tolerance, boxB.x1 - tolerance);
      const overlapY = Math.min(boxA.y2 + tolerance, boxB.y2 + tolerance) - Math.max(boxA.y1 - tolerance, boxB.y1 - tolerance);
      const overlap = overlapX >= 0 && overlapY >= 0;
      const dx = boxA.cx - boxB.cx;
      const dy = boxA.cy - boxB.cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const score = overlap ? distance : distance + 1000;
      candidates.push({ id: other.id, score, overlap });
    }
    candidates.sort((left, right) => left.score - right.score);
    const touching = candidates.filter((candidate) => candidate.overlap).slice(0, 8).map((candidate) => candidate.id);
    const nearest = candidates.slice(0, Math.min(6, candidates.length)).map((candidate) => candidate.id);
    out[territory.id] = Array.from(new Set([...(touching.length ? touching : []), ...nearest])).slice(0, 8);
  }

  for (const territory of activeTerritories) {
    const neighbors = out[territory.id] || [];
    for (const neighborId of neighbors) {
      out[neighborId] = Array.from(new Set([...(out[neighborId] || []), territory.id])).slice(0, 8);
    }
  }

  return Object.keys(out).length ? out : buildFallbackNeighbors(ids);
}

function randomWind(state: DartsFirefighterState): void {
  const fromIndex = randomInt(state, 16);
  const toIndex = oppositeWindIndex(fromIndex);
  const from = WIND_16[fromIndex];
  const to = WIND_16[toIndex];
  state.windFromIndex = fromIndex;
  state.windFromCode = from;
  state.windToCode = to;
  // Conservé pour compatibilité avec les anciennes sauvegardes / écrans.
  const horizontal = toIndex >= 1 && toIndex <= 7 ? 1 : toIndex >= 9 && toIndex <= 15 ? -1 : (toIndex === 8 ? 2 : -2);
  const strength = state.config.windStrength || "normal";
  const magnitude = strength === "strong" ? 3 : strength === "light" ? 1 : 2;
  state.windOffset = (horizontal > 0 ? magnitude : -magnitude) as any;
  state.windLabel = `${windStrengthLabel(state.config)} ${from}→${to}`;
}

function windPreferredNeighborId(state: DartsFirefighterState, territory: FireTerritory): string | null {
  const candidateIds = (territory.neighbors || []).filter(Boolean);
  if (!candidateIds.length) return null;
  const mapTerritories = (state.map?.territories || []).filter((item: Territory) => state.territories.some((t) => t.id === item.id && t.playable && !t.destroyed));
  const boxes = buildBoundsForMap(String(state.map?.country || state.config?.mapId || "FR"), mapTerritories as Territory[]);
  const source = boxes[territory.id];
  if (!source) return candidateIds[0] || null;

  const targetIndex = windTargetIndex(state);
  const angle = (targetIndex * Math.PI) / 8;
  // SVG : y positif vers le bas. N = -Y, E = +X.
  const desiredX = Math.sin(angle);
  const desiredY = -Math.cos(angle);
  const candidates = candidateIds.map((id) => {
    const box = boxes[id];
    if (!box) return { id, alignment: -2, distance: Number.POSITIVE_INFINITY };
    const dx = box.cx - source.cx;
    const dy = box.cy - source.cy;
    const distance = Math.max(.001, Math.sqrt(dx * dx + dy * dy));
    const alignment = (dx / distance) * desiredX + (dy / distance) * desiredY;
    return { id, alignment, distance };
  }).sort((a, b) => b.alignment - a.alignment || a.distance - b.distance);
  return candidates[0]?.id || candidateIds[0] || null;
}

function worstTerritory(state: DartsFirefighterState): FireTerritory | null {
  return [...state.territories]
    .filter((t) => t.playable && !t.destroyed)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || b.fireLevel - a.fireLevel || Number(b.smoke) - Number(a.smoke) || a.protection - b.protection)[0] || null;
}

function selectedOrWorst(state: DartsFirefighterState): FireTerritory | null {
  if (state.config.bullTargetMode === "priority") return worstTerritory(state);
  return state.territories.find((t) => t.id === state.selectedTerritoryId && t.playable && !t.destroyed) || worstTerritory(state);
}

function addEvent(events: FirefighterEvent[], event: FirefighterEvent) {
  events.push(event);
}

/**
 * Pondération tactique du score Firefighter.
 *
 * V8.1 : le danger reste prioritaire, mais le facteur est volontairement
 * contenu afin de garder les scores dans une échelle de quelques centaines.
 * La taille/difficulté de la cible augmente progressivement la valeur sans
 * pouvoir écraser le niveau réel d'urgence du territoire.
 */
export function dartsFirefighterTerritoryScoreFactor(territory: FireTerritory | null | undefined, state: DartsFirefighterState) {
  if (!territory || territory.destroyed) return 0;
  const fire = Math.max(0, Math.min(3, Number(territory.fireLevel || 0)));
  let dangerFactor = fire >= 3 ? 1.55 : fire === 2 ? 1.30 : fire === 1 ? 1.08 : territory.smoke ? .92 : .62;
  if (territory.smoke && fire > 0) dangerFactor += .08;
  if (territory.critical) dangerFactor += .14;
  if (Array.isArray(state.forecastTerritoryIds) && state.forecastTerritoryIds.includes(territory.id)) dangerFactor += .08;

  const uniqueTargetMode = state.targetMode === "visit_score" || Number(state.config?.activeTerritories || 0) > 20;
  const target = Math.max(1, Number(territory.target || 1));
  const targetFactor = uniqueTargetMode ? .90 + Math.min(.25, target / 360) : 1;
  return Math.max(.45, dangerFactor * targetFactor);
}

/**
 * Bonus d'adresse d'une combinaison exacte sur carte étendue.
 * Un checkout à 2/3 fléchettes avec doubles/triples doit valoir sensiblement
 * plus qu'un simple Bull/DBull, indépendamment de l'effet tactique produit.
 */
export function dartsFirefighterExactExecutionBonus(darts: GameDart[], targetScore: number, state: DartsFirefighterState) {
  const direct = (darts || []).filter((dart) => dart && dart.bed !== "MISS");
  if (!direct.length) return 0;
  const dartCountBonus = direct.length >= 3 ? 72 : direct.length === 2 ? 38 : 0;
  const bedBonus = direct.reduce((sum, dart) => sum + (dart.bed === "IB" ? 44 : dart.bed === "OB" ? 30 : dart.bed === "T" ? 34 : dart.bed === "D" ? 22 : 7), 0);
  const targetBonus = Math.min(72, Math.round(Math.max(1, Number(targetScore || 1)) * .48));
  const base = 18 + dartCountBonus + bedBonus + targetBonus;
  const difficultyScale = Math.min(1.25, .92 + (Number(effectiveRules(state.config).scoreMultiplier || 1) - 1) * .35);
  return Math.max(15, Math.round(base * difficultyScale));
}

/** Bonus d'adresse propre aux actions spéciales. */
export function dartsFirefighterSpecialExecutionBonus(kind: "bull" | "dbull", state: DartsFirefighterState) {
  const base = kind === "dbull" ? 68 : 44;
  const difficultyScale = Math.min(1.20, .95 + (Number(effectiveRules(state.config).scoreMultiplier || 1) - 1) * .25);
  return Math.round(base * difficultyScale);
}

/**
 * Conservé pour compatibilité avec les anciens appels UI. Le bonus est
 * désormais plafonné et n'est plus multiplié par un facteur de danger massif.
 */
export function dartsFirefighterSpecialActionBonus(basePoints: number, territory: FireTerritory | null | undefined, state: DartsFirefighterState) {
  if (!territory || basePoints <= 0) return 0;
  const factor = dartsFirefighterTerritoryScoreFactor(territory, state);
  return Math.min(95, Math.round(Math.max(8, basePoints * .20) * (.8 + factor * .25)));
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
  const rules = effectiveRules(state.config);
  const beforeFire = territory.fireLevel;
  const beforeSmoke = territory.smoke;
  const beforeProtection = territory.protection;
  const tacticalScoreFactor = dartsFirefighterTerritoryScoreFactor(territory, state);
  let remaining = power;
  let score = 0;
  let smokeCleared = false;

  if (territory.smoke && remaining > 0) {
    territory.smoke = false;
    remaining -= 1;
    smokeCleared = true;
    score += 20;
    addEvent(events, { type: "smoke_cleared", territoryId: territory.id, territoryName: territory.name, value: 1, score: 20, label: `${labelPrefix}Fumée dissipée · ${territory.name}` });
  }

  const reduced = Math.min(territory.fireLevel, remaining);
  if (reduced > 0) {
    territory.fireLevel = Math.max(0, territory.fireLevel - reduced) as any;
    remaining -= reduced;
    score += reduced * 35;
    addEvent(events, { type: "water", territoryId: territory.id, territoryName: territory.name, value: reduced, score: reduced * 35, label: `${labelPrefix}${reduced} niveau${reduced > 1 ? "x" : ""} de feu supprimé${reduced > 1 ? "s" : ""} · ${territory.name}` });
  }

  const extinguished = beforeFire > 0 && territory.fireLevel === 0;
  if (extinguished) {
    const extinguishPoints = 45 + (territory.critical ? 25 : 0);
    score += extinguishPoints;
    territory.burnTurns = 0;
    addEvent(events, { type: "extinguished", territoryId: territory.id, territoryName: territory.name, value: beforeFire, score: extinguishPoints, label: `${labelPrefix}INCENDIE ÉTEINT · ${territory.name}${territory.critical ? " · ZONE CRITIQUE" : ""}` });
  }

  const room = Math.max(0, 3 - territory.protection);
  const protectedAdded = Math.min(room, remaining);
  if (protectedAdded > 0) {
    territory.protection = Math.min(3, territory.protection + protectedAdded) as any;
    score += protectedAdded * 15;
    addEvent(events, { type: "protected", territoryId: territory.id, territoryName: territory.name, value: protectedAdded, score: protectedAdded * 15, label: `${labelPrefix}Zone refroidie +${protectedAdded} · ${territory.name}` });
  }

  territory.lastActionBy = playerId;
  score = Math.round(score * rules.scoreMultiplier * tacticalScoreFactor);
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
    const gaugeCost = Math.max(0, Number(state.config.canadairGaugeCost ?? 35));
    const gaugeReady = !state.config.canadairRequiresGauge || state.brigadeGauge >= gaugeCost;
    if (gaugeReady) {
      const centerPower = Number(state.config.canadairCenterPower || 3);
      const neighborPower = Number(state.config.canadairNeighborPower || 1);
      const neighborCount = Math.max(1, Math.min(4, Number(state.config.canadairNeighborCount || 3)));
      result = applyWater(state, center, centerPower, playerId, events, "CANADAIR · ");
      if (center) {
        for (const neighborId of center.neighbors.slice(0, neighborCount)) {
          const neighbor = state.territories.find((t) => t.id === neighborId) || null;
          const extra = applyWater(state, neighbor, neighborPower, playerId, events, "LARGAGE LATÉRAL · ");
          result.score += extra.score;
          result.fireReduced += extra.fireReduced;
          result.protected += extra.protected;
          result.extinguished = result.extinguished || extra.extinguished;
          result.smokeCleared = result.smokeCleared || extra.smokeCleared;
          result.useful = result.useful || extra.useful;
        }
        const canadairBonus = dartsFirefighterSpecialExecutionBonus("dbull", state);
        addEvent(events, { type: "canadair", territoryId: center.id, territoryName: center.name, score: canadairBonus, label: `CANADAIR engagé sur ${center.name} · adresse +${canadairBonus}` });
        result.score += canadairBonus;
        // Le Canadair cumule plusieurs effets, mais son action reste dans une échelle lisible.
        // Le combo de brigade est appliqué ensuite au score de la volée.
        result.score = Math.min(360, Math.max(0, Math.round(result.score)));
        state.brigadeGauge = Math.max(0, state.brigadeGauge - gaugeCost);
      }
    } else {
      const power = Number(state.config.bullPower || 2);
      result = applyWater(state, center, power, playerId, events, "DBULL · LARGAGE AU SOL · ");
      addEvent(events, { type: "bull_drop", territoryId: center?.id, territoryName: center?.name, score: 0, label: `Canadair indisponible · jauge ${Math.round(state.brigadeGauge)}/${gaugeCost}` });
    }
  } else if (dart.bed === "OB" || dart.bed === "IB") {
    const target = selectedOrWorst(state);
    const power = Number(state.config.bullPower || 2);
    result = applyWater(state, target, power, playerId, events, `${dart.bed === "IB" ? "DBULL" : "BULL"} · `);
    const bullBonus = target ? dartsFirefighterSpecialExecutionBonus(dart.bed === "IB" ? "dbull" : "bull", state) : 0;
    if (target) addEvent(events, { type: "bull_drop", territoryId: target.id, territoryName: target.name, score: bullBonus, label: `Largage précis sur ${target.name} · adresse +${bullBonus}` });
    result.score += bullBonus;
  } else {
    const target = getTargetTerritory(state, Number(dart.number || 0));
    result = applyWater(state, target, dartWaterPower(dart), playerId, events);
    if (target && result.useful) {
      const executionBonus = dart.bed === "T" ? 30 : dart.bed === "D" ? 18 : 6;
      result.score += executionBonus;
      addEvent(events, { type: "water", territoryId: target.id, territoryName: target.name, score: executionBonus, label: `${dartLabel(dart)} · adresse +${executionBonus}` });
    }
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

function resolvePropagation(state: DartsFirefighterState, events: FirefighterEvent[], playerId: string, completedBrigadeRound: boolean) {
  const cfg = effectiveRules(state.config);
  const active = state.territories.filter((t) => t.playable && !t.destroyed);
  const incomingSmoke = new Set<string>();
  const incomingFire = new Set<string>();
  const maxSpreads = Math.max(1, Math.min(8, Number(state.config.maxSpreadsPerCycle || 2)));
  let spreadAttempts = 0;

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
      if (spreadAttempts < maxSpreads && chance(state, cfg.spreadChance)) {
        const windPreferredId = windPreferredNeighborId(state, territory);
        const neighborIds = [windPreferredId, ...territory.neighbors].filter(Boolean);
        const targetId = neighborIds.find((id) => {
          const candidate = state.territories.find((t) => t.id === id);
          return candidate && candidate.playable && !candidate.destroyed && candidate.id !== territory.id;
        });
        const target = state.territories.find((t) => t.id === targetId);
        if (target) {
          spreadAttempts += 1;
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

  const completedRound = state.roundIndex + 1;
  const reinforcementEvery = Math.max(0, Number(state.config.reinforcementEveryRounds || 0));
  if (completedBrigadeRound && reinforcementEvery > 0 && completedRound % reinforcementEvery === 0 && state.lastReinforcementRound !== completedRound) {
    const count = Math.max(1, Math.min(4, Number(state.config.reinforcementCount || 1)));
    const pool = state.territories.filter((t) => t.playable && !t.destroyed && t.fireLevel === 0 && !t.smoke);
    for (let i = 0; i < count && pool.length; i += 1) {
      const index = randomInt(state, pool.length);
      const target = pool.splice(index, 1)[0];
      if (!target) continue;
      if (target.protection > 0) {
        target.protection = Math.max(0, target.protection - 1) as any;
        state.propagationBlocked += 1;
        state.score += 100;
        addEvent(events, { type: "spread_blocked", territoryId: target.id, territoryName: target.name, score: 100, label: `RENFORT BLOQUÉ PAR LE PARE-FEU · ${target.name}` });
      } else {
        target.smoke = true;
        state.totalSpread += 1;
        state.score -= 75;
        addEvent(events, { type: "spread", territoryId: target.id, territoryName: target.name, score: -75, label: `NOUVEAU DÉPART PROGRAMMÉ · fumée à ${target.name}` });
      }
    }
    state.lastReinforcementRound = completedRound;
  }

  const objective = state.config.objective || "extinguish_all";
  if ((objective === "survival" || objective === "protect_critical") && activeIncidents(state) === 0) {
    const candidates = state.territories.filter((t) => t.playable && !t.destroyed && t.fireLevel === 0 && !t.smoke);
    const preferred = objective === "protect_critical" ? candidates.filter((t) => !t.critical) : candidates;
    const pool = preferred.length ? preferred : candidates;
    const target = pool[randomInt(state, Math.max(1, pool.length))];
    if (target) {
      target.smoke = true;
      state.totalSpread += 1;
      state.score -= 75;
      addEvent(events, { type: "spread", territoryId: target.id, territoryName: target.name, score: -75, label: `NOUVEAU DÉPART DE FEU · fumée détectée à ${target.name}` });
    }
  }

  state.propagationIndex = Number(state.propagationIndex || 0) + 1;
  const changeEvery = Math.max(1, Number(state.config.windChangeEvery || 3));
  if (state.config.windEnabled && state.propagationIndex % changeEvery === 0) randomWind(state);
  state.forecastTerritoryIds = computeForecast(state);
}

export function computeForecast(state: DartsFirefighterState): string[] {
  const active = state.territories.filter((t) => t.playable && !t.destroyed);
  const out: string[] = [];
  for (const territory of active.filter((t) => t.fireLevel === 3)) {
    const id = windPreferredNeighborId(state, territory) || territory.neighbors[0];
    if (id && !out.includes(id)) out.push(id);
  }
  return out.slice(0, Math.max(1, Math.min(6, Number(state.config.forecastCount || 4))));
}

function evaluateEnd(state: DartsFirefighterState) {
  if (state.finished) return;
  const objective = state.config.objective || "extinguish_all";
  const criticalLost = state.territories.some((t) => t.critical && t.destroyed);
  const cfg = effectiveRules(state.config);
  const roundLimitReached = state.config.maxRounds > 0 && state.roundIndex >= state.config.maxRounds;

  if (criticalLost && state.config.criticalLossEndsMission !== false) {
    state.finished = true;
    state.won = false;
    state.finishReason = "critical_lost";
  } else if (state.totalDestroyed >= cfg.destructionLimit) {
    state.finished = true;
    state.won = false;
    state.finishReason = "destruction_limit";
  } else if (objective === "extinguish_all" && activeIncidents(state) === 0 && state.turnIndex > 0) {
    state.finished = true;
    state.won = true;
    state.finishReason = "all_fires_out";
  } else if ((objective === "survival" || objective === "protect_critical") && roundLimitReached) {
    state.finished = true;
    state.won = true;
    state.finishReason = "objective_complete";
  } else if (objective === "extinguish_all" && roundLimitReached) {
    state.finished = true;
    state.won = false;
    state.finishReason = "round_limit";
  }

  if (state.finished && state.won) {
    const criticalSaved = state.territories.filter((t) => t.critical && !t.destroyed).length;
    const timeBonus = objective === "extinguish_all" ? Math.max(0, state.config.maxRounds - state.roundIndex - 1) * 100 : 0;
    state.score += criticalSaved * 300 + timeBonus;
  }
  if (state.finished) state.finishedAt = Date.now();
}

export function createDartsFirefighterState(
  players: DartsFirefighterPlayer[],
  config: DartsFirefighterConfigPayload,
  rawMap: TerritoriesMap,
  now = Date.now(),
): DartsFirefighterState {
  const normalizedConfig = normalizeDartsFirefighterConfig(config);
  const safePlayers = players.length ? players : [{ id: "p1", name: "Joueur 1" }];
  const totalTerritories = Math.max(1, Number(rawMap.territories?.length || 0));
  const activeCount = Math.max(6, Math.min(totalTerritories, MAX_PLAYABLE_TERRITORIES, Number(normalizedConfig.activeTerritories || Math.min(20, totalTerritories))));
  const chosen = chooseActiveTerritories(rawMap, activeCount);
  const chosenIds = chosen.map((t) => t.id);
  const neighbors = buildNeighbors(rawMap, chosen);
  const activeIdSet = new Set(chosenIds);
  const seedBase = hash(`${normalizedConfig.mapId}|${normalizedConfig.difficulty}|${now}|${safePlayers.map((p) => p.id).join("|")}`);

  const targetMode: DartsFirefighterTargetMode = chosen.length > 20 ? "visit_score" : "sector";
  const calibrationProfiles = Array.isArray((normalizedConfig as any).playersList) && (normalizedConfig as any).playersList.length
    ? (normalizedConfig as any).playersList
    : safePlayers;
  const targetCalibration = buildTerritoryValueCalibration(calibrationProfiles, String((normalizedConfig as any).botLevel || "normal"));

  let targetNumbers: number[] = [];
  if (targetMode === "visit_score") {
    // Réutilise exactement la logique de TERRITORIES : valeurs uniques, atteignables
    // en une volée de 3 fléchettes, calibrées sur le niveau du groupe et réparties
    // selon la surface réelle des territoires. Les petites zones reçoivent les
    // objectifs les plus accessibles, les grandes les plus exigeants.
    const balanced = applyBalancedTerritoryValues(
      { ...rawMap, territories: chosen.map((territory) => ({ ...territory })) },
      String(rawMap.country || normalizedConfig.mapId || "FR") as any,
      targetCalibration,
    );
    const valueById = new Map((balanced.territories || []).map((territory) => [territory.id, Number(territory.value || 0)]));
    targetNumbers = chosen.map((territory, index) => valueById.get(territory.id) || index + 1);
  } else {
    targetNumbers = Array.from({ length: chosen.length }, (_, index) => index + 1);
    if (normalizedConfig.targetOrder === "random") {
      let targetSeed = seedBase;
      for (let i = targetNumbers.length - 1; i > 0; i -= 1) {
        const [r, nextSeed] = nextRandom(targetSeed);
        targetSeed = nextSeed;
        const j = Math.floor(r * (i + 1));
        [targetNumbers[i], targetNumbers[j]] = [targetNumbers[j], targetNumbers[i]];
      }
    }
  }

  const territories: FireTerritory[] = (rawMap.territories || []).map((territory) => {
    const activeIndex = chosen.findIndex((t) => t.id === territory.id);
    return {
      id: territory.id,
      name: territory.name || territory.id,
      short: (territory as any).short,
      svgPathId: territory.svgPathId,
      target: activeIndex >= 0 ? targetNumbers[activeIndex] : 0,
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
    territories: rawMap.territories.map((territory) => {
      const activeIndex = chosen.findIndex((item) => item.id === territory.id);
      return { ...territory, playable: activeIdSet.has(territory.id), value: activeIndex >= 0 ? targetNumbers[activeIndex] : territory.value };
    }),
    playableTerritoryCount: activeIdSet.size,
    disabledTerritoryCount: Math.max(0, rawMap.territories.length - activeIdSet.size),
  };

  const state: DartsFirefighterState = {
    mode: "darts_firefighter",
    config: normalizedConfig,
    players: safePlayers,
    map,
    territories,
    activePlayerIndex: 0,
    roundIndex: 0,
    turnIndex: 0,
    propagationIndex: 0,
    lastReinforcementRound: 0,
    selectedTerritoryId: chosenIds[0] || null,
    windOffset: 1,
    windLabel: "BRISE E→O",
    windFromIndex: 4,
    windFromCode: "E",
    windToCode: "O",
    forecastTerritoryIds: [],
    combo: 0,
    score: 0,
    brigadeGauge: normalizedConfig.startingBrigadeGauge || 0,
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
    targetMode,
    targetCalibration,
  };
  safePlayers.forEach((p) => { state.playerStats[p.id] = emptyFirefighterStats(); });
  randomWind(state);

  const active = state.territories.filter((t) => t.playable);
  const criticalCount = Math.max(0, Math.min(active.length, Number(normalizedConfig.criticalTerritories || 0)));
  const criticalPool = [...active];
  for (let i = 0; i < criticalCount && criticalPool.length; i += 1) {
    const idx = randomInt(state, criticalPool.length);
    const selected = criticalPool.splice(idx, 1)[0];
    if (selected) selected.critical = true;
  }

  const initialFireCount = Math.max(1, Math.min(active.length, Number(normalizedConfig.initialFires || 2)));
  const selectedFireIds: string[] = [];
  const fireCandidates = [...active];
  while (selectedFireIds.length < initialFireCount && fireCandidates.length) {
    let target: FireTerritory | undefined;
    if (normalizedConfig.firePlacement === "critical_first") {
      const critical = fireCandidates.filter((t) => t.critical);
      const pool = critical.length ? critical : fireCandidates;
      target = pool[randomInt(state, pool.length)];
    } else if (normalizedConfig.firePlacement === "clustered" && selectedFireIds.length > 0) {
      const neighborIds = selectedFireIds.flatMap((id) => state.territories.find((t) => t.id === id)?.neighbors || []);
      const clustered = fireCandidates.filter((t) => neighborIds.includes(t.id));
      const pool = clustered.length ? clustered : fireCandidates;
      target = pool[randomInt(state, pool.length)];
    } else {
      target = fireCandidates[randomInt(state, fireCandidates.length)];
    }
    if (!target) break;
    selectedFireIds.push(target.id);
    const removeIndex = fireCandidates.findIndex((t) => t.id === target?.id);
    if (removeIndex >= 0) fireCandidates.splice(removeIndex, 1);
  }

  selectedFireIds.forEach((id, index) => {
    const target = state.territories.find((t) => t.id === id);
    if (!target) return;
    const configured = normalizedConfig.initialFireLevel;
    const level = configured === "mixed"
      ? (normalizedConfig.difficulty === "inferno" ? 3 : normalizedConfig.difficulty === "commander" ? (index === 0 ? 3 : 2) : index === 0 ? 2 : 1)
      : Number(configured || 1);
    target.fireLevel = Math.max(1, Math.min(3, level)) as any;
  });

  const smokeCount = Math.max(0, Math.min(active.length - selectedFireIds.length, Number(normalizedConfig.initialSmoke || 0)));
  const smokePool = active.filter((t) => !selectedFireIds.includes(t.id));
  for (let i = 0; i < smokeCount && smokePool.length; i += 1) {
    const index = randomInt(state, smokePool.length);
    const target = smokePool.splice(index, 1)[0];
    if (target) target.smoke = true;
  }

  const protectionCount = Math.max(0, Math.min(active.length, Number(normalizedConfig.initialProtectedTerritories || 0)));
  const protectionPool = active.filter((t) => t.fireLevel === 0 && !t.smoke && !t.destroyed);
  for (let i = 0; i < protectionCount && protectionPool.length; i += 1) {
    const index = randomInt(state, protectionPool.length);
    const target = protectionPool.splice(index, 1)[0];
    if (target) target.protection = 1;
  }

  state.forecastTerritoryIds = computeForecast(state);
  return state;
}

export function selectFireTerritory(state: DartsFirefighterState, territoryId: string | null): DartsFirefighterState {
  // Une sélection UI ne modifie aucune donnée de partie : surtout ne pas cloner
  // l'intégralité de l'état (carte + historique + stats) à chaque tap.
  // Sur les grandes cartes, ce clone profond était l'une des principales causes
  // de saccades lors de la navigation entre carte / territoire / objectifs.
  const wantedId = territoryId == null ? null : String(territoryId);
  const target = wantedId
    ? state.territories.find((t) => t.id === wantedId && t.playable && !t.destroyed)
    : null;
  const nextId = target?.id || null;
  if (String(state.selectedTerritoryId || "") === String(nextId || "")) return state;
  return { ...state, selectedTerritoryId: nextId };
}

export function playDartsFirefighterVisit(state: DartsFirefighterState, darts: GameDart[]): DartsFirefighterState {
  if (state.finished) return state;
  const next = cloneDartsFirefighterState(state);
  const player = getActivePlayer(next);
  const stats = next.playerStats[player.id] = {
    ...emptyFirefighterStats(),
    ...(next.playerStats[player.id] || {}),
    hitsBySegment: { ...((next.playerStats[player.id] || {}).hitsBySegment || {}) },
  };
  const dartsPerTurn = Math.max(1, Math.min(3, Number(next.config.dartsPerTurn || 3)));
  const safeDarts = (darts || []).slice(0, dartsPerTurn);
  const processedDarts: GameDart[] = [];
  const events: FirefighterEvent[] = [];
  const before = totalFire(next);
  const comboBefore = next.combo;
  let visitScore = 0;
  let usefulDarts = 0;
  let endedByMiss = false;

  const scoreTargetMode = next.targetMode === "visit_score" || Number(next.config.activeTerritories || 0) > 20;
  let rawDartScore = 0;
  let matchedTargetScore: number | null = null;

  if (scoreTargetMode) {
    // CARTE ÉTENDUE — résolution déterministe en deux canaux :
    // 1) les darts numérotées construisent une cible exacte ;
    // 2) Bull / DBull restent des actions spéciales indépendantes.
    // Exception de compatibilité : si la cible exacte n'est atteignable qu'en
    // comptant un Bull/DBull dans le total, celui-ci est consommé par la
    // combinaison et ne déclenche alors PAS son action spéciale.
    const numberedDarts: GameDart[] = [];
    const bullDarts: GameDart[] = [];

    for (const dart of safeDarts) {
      processedDarts.push(dart);
      rawDartScore += dartScoreValue(dart);
      if (dart.bed === "MISS") {
        recordDartStatsOnly(stats, dart);
        if (next.config.missEndsTurn) {
          endedByMiss = true;
          break;
        }
        continue;
      }
      if (dart.bed === "OB" || dart.bed === "IB") bullDarts.push(dart);
      else numberedDarts.push(dart);
    }

    type DirectCandidate = { darts: GameDart[]; target: FireTerritory; score: number; power: number; estimated: number; usesBull: boolean };
    const enumerateCandidates = (sourceDarts: GameDart[], allowBull: boolean): DirectCandidate[] => {
      const out: DirectCandidate[] = [];
      const n = sourceDarts.length;
      for (let mask = 1; mask < (1 << n); mask += 1) {
        const subset = sourceDarts.filter((_, index) => Boolean(mask & (1 << index)));
        if (!subset.length || subset.length > 3) continue;
        const usesBull = subset.some((dart) => dart.bed === "OB" || dart.bed === "IB");
        if (usesBull && !allowBull) continue;
        const score = subset.reduce((sum, dart) => sum + dartScoreValue(dart), 0);
        const target = resolveVisitScoreTarget(next, score);
        if (!target || Number(target.target) !== Number(score)) continue;
        const power = Math.max(1, ...subset.map((dart) => dartWaterPower(dart)));
        const previewState = cloneDartsFirefighterState(next);
        const previewTarget = previewState.territories.find((territory) => territory.id === target.id) || null;
        const preview = applyWater(previewState, previewTarget, power, player.id, [], "");
        const execution = preview.useful ? dartsFirefighterExactExecutionBonus(subset, score, next) : 0;
        out.push({ darts: subset, target, score, power, estimated: Number(preview.score || 0) + execution, usesBull });
      }
      return out;
    };

    // Priorité absolue aux combinaisons sans Bull/DBull : ces derniers restent disponibles
    // pour leur action spéciale. Si aucune cible n'est atteignable ainsi, un Bull peut être
    // consommé par la combinaison exacte.
    let candidates = enumerateCandidates(numberedDarts, false);
    if (!candidates.length && bullDarts.length) candidates = enumerateCandidates([...numberedDarts, ...bullDarts], true);
    candidates.sort((a, b) => b.estimated - a.estimated
      || b.darts.length - a.darts.length
      || b.power - a.power
      || Number(b.target.target) - Number(a.target.target));
    const bestDirect = candidates[0] || null;
    const directDarts = bestDirect?.darts || [];
    const directScore = bestDirect?.score || 0;
    const directTarget = bestDirect?.target || null;
    const consumedBullSet = new Set(directDarts.filter((dart) => dart.bed === "OB" || dart.bed === "IB"));
    const specialBulls = bullDarts.filter((dart) => !consumedBullSet.has(dart));

    // Toutes les fléchettes numérotées sont comptabilisées dans les stats, mais seules celles
    // de la meilleure combinaison déclenchent l'intervention normale.
    for (const dart of numberedDarts) recordDartStatsOnly(stats, dart);
    for (const dart of directDarts.filter((dart) => dart.bed === "OB" || dart.bed === "IB")) recordDartStatsOnly(stats, dart);
    const unusedNumbered = numberedDarts.filter((dart) => !directDarts.includes(dart));
    if (unusedNumbered.length) stats.uselessDarts += unusedNumbered.length;

    if (directTarget && directDarts.length) {
      if (!next.selectedTerritoryId) next.selectedTerritoryId = directTarget.id;
      matchedTargetScore = directTarget.target;
      const power = bestDirect?.power || 1;
      const result = applyWater(next, directTarget, power, player.id, events, `CIBLE ${directTarget.target} · `);
      const executionBonus = result.useful ? dartsFirefighterExactExecutionBonus(directDarts, directTarget.target, next) : 0;
      visitScore += Number(result.score || 0) + executionBonus;
      usefulDarts += result.useful ? directDarts.length : 0;
      stats.waterApplied += power;
      stats.fireReduced += Number(result.fireReduced || 0);
      stats.protectionsPlaced += Number(result.protected || 0);
      stats.firesExtinguished += result.extinguished ? 1 : 0;
      stats.smokeCleared += result.smokeCleared ? 1 : 0;
      if (result.extinguished) next.totalExtinguished += 1;
      if (!result.useful) stats.uselessDarts += directDarts.length;
      if (result.useful) next.brigadeGauge = Math.min(100, next.brigadeGauge + 7 + Number(result.fireReduced || 0) * 4);
      addEvent(events, { type: "water", territoryId: directTarget.id, territoryName: directTarget.name, value: directScore, score: executionBonus, label: `MEILLEURE COMBINAISON ${directDarts.map(dartLabel).join(" + ")} = ${directScore} · ${directTarget.name} · puissance ${power}${bestDirect?.usesBull ? " · Bull intégré (action spéciale consommée)" : ""}${executionBonus ? ` · adresse +${executionBonus}` : ""}` });
    } else if (numberedDarts.length) {
      const fullNumberedScore = numberedDarts.reduce((sum, dart) => sum + dartScoreValue(dart), 0);
      addEvent(events, { type: "useless", value: fullNumberedScore, score: 0, label: `AUCUNE COMBINAISON VALIDE · ${numberedDarts.map(dartLabel).join(" + ")}` });
    }

    // Les actions spéciales sont résolues APRÈS la combinaison directe afin
    // que la même volée puisse, par exemple, réussir 89 points puis appeler le Canadair.
    for (const dart of specialBulls) {
      const result = applyDart(next, dart, player.id, events);
      visitScore += Number(result.score || 0);
      if (result.useful) usefulDarts += 1;
    }
  } else {
    // PETITES CARTES <=20 : mode multi-interventions optionnel.
    // ON  : chaque fléchette numérotée agit sur son propre territoire (S1 + D6 + T4 = 3 zones).
    // OFF : une seule intervention normale est retenue dans la volée ; Bull/DBull restent indépendants.
    if (next.config.multiInterventionPerDart !== false) {
      for (const dart of safeDarts) {
        processedDarts.push(dart);
        const result = applyDart(next, dart, player.id, events);
        visitScore += Number(result.score || 0);
        if (result.useful) usefulDarts += 1;
        rawDartScore += dartScoreValue(dart);
        if (dart.bed === "MISS" && next.config.missEndsTurn) {
          endedByMiss = true;
          break;
        }
      }
    } else {
      const numbered: GameDart[] = [];
      const specials: GameDart[] = [];
      for (const dart of safeDarts) {
        processedDarts.push(dart);
        rawDartScore += dartScoreValue(dart);
        if (dart.bed === "MISS") {
          recordDartStatsOnly(stats, dart);
          if (next.config.missEndsTurn) { endedByMiss = true; break; }
          continue;
        }
        if (dart.bed === "OB" || dart.bed === "IB") specials.push(dart);
        else numbered.push(dart);
      }

      // Le meilleur tir numéroté utile devient l'unique intervention normale.
      const candidates = numbered.map((dart, index) => {
        const target = getTargetTerritory(next, Number(dart.number || 0));
        const power = dartWaterPower(dart);
        const urgency = target ? Number(target.fireLevel || 0) * 100 + Number(target.smoke) * 35 + Number(target.critical) * 25 + Math.max(0, 3 - Number(target.protection || 0)) * 5 : -1;
        return { dart, index, target, power, rank: urgency + power * 18 };
      }).sort((a, b) => b.rank - a.rank || b.power - a.power || a.index - b.index);
      const chosen = candidates.find((item) => item.target) || candidates[0] || null;

      for (const dart of numbered) {
        if (chosen && dart === chosen.dart) continue;
        recordDartStatsOnly(stats, dart);
      }
      if (chosen?.dart) {
        const result = applyDart(next, chosen.dart, player.id, events);
        visitScore += Number(result.score || 0);
        if (result.useful) usefulDarts += 1;
        if (numbered.length > 1) addEvent(events, { type: "useless", territoryId: chosen.target?.id, territoryName: chosen.target?.name, score: 0, label: `MODE 1 INTERVENTION · ${numbered.length - 1} tir${numbered.length > 2 ? "s" : ""} numéroté${numbered.length > 2 ? "s" : ""} conservé${numbered.length > 2 ? "s" : ""} en réserve` });
      }
      for (const dart of specials) {
        const result = applyDart(next, dart, player.id, events);
        visitScore += Number(result.score || 0);
        if (result.useful) usefulDarts += 1;
      }
    }
  }

  if (next.config.comboEnabled !== false) {
    if (usefulDarts > 0) next.combo = Math.min(12, next.combo + usefulDarts);
    else next.combo = 0;
  } else {
    next.combo = 0;
  }
  const comboMultiplier = next.config.comboEnabled !== false ? 1 + Math.min(.75, comboBefore * .05) : 1;
  visitScore = Math.round(visitScore * comboMultiplier);
  const unusedDarts = Math.max(0, dartsPerTurn - processedDarts.length);
  const voluntaryStop = !endedByMiss && processedDarts.length > 0 && processedDarts.length < dartsPerTurn;
  if (processedDarts.length === 1) stats.oneDartVisits += 1;
  else if (processedDarts.length === 2) stats.twoDartVisits += 1;
  else if (processedDarts.length >= 3) stats.threeDartVisits += 1;
  if (voluntaryStop) {
    stats.earlyValidatedVisits += 1;
    stats.dartsSaved += unusedDarts;
  }
  if (processedDarts.length === dartsPerTurn && usefulDarts === dartsPerTurn) {
    visitScore += Math.max(0, Number(next.config.perfectVisitBonus ?? 200));
    stats.perfectVisits += 1;
  }
  next.score += visitScore;
  stats.score += visitScore;
  stats.visits += 1;
  stats.bestVisitScore = Math.max(stats.bestVisitScore, visitScore);
  stats.criticalInterventions += events.filter((e) => e.territoryId && next.territories.find((t) => t.id === e.territoryId)?.critical && (e.type === "water" || e.type === "extinguished" || e.type === "protected")).length;

  const endOfRound = next.activePlayerIndex >= next.players.length - 1;
  if (next.config.propagationTiming !== "after_round" || endOfRound) {
    resolvePropagation(next, events, player.id, endOfRound);
  } else {
    next.forecastTerritoryIds = computeForecast(next);
  }

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
    maxDarts: dartsPerTurn,
    unusedDarts,
    voluntaryStop,
    rawDartScore,
    matchedTargetScore,
    targetMode: next.targetMode,
  };
  next.history.push(visit);
  next.turnIndex += 1;
  next.activePlayerIndex = (next.activePlayerIndex + 1) % next.players.length;
  if (next.activePlayerIndex === 0) next.roundIndex += 1;
  evaluateEnd(next);
  return next;
}

export type DartsFirefighterMissionGrade = "S" | "A" | "B" | "C" | "D";

export function computeDartsFirefighterMissionGrade(state: DartsFirefighterState) {
  const playerStats = Object.values(state.playerStats || {});
  const darts = playerStats.reduce((sum, stats) => sum + Number(stats?.darts || 0), 0);
  const hits = playerStats.reduce((sum, stats) => sum + Number(stats?.hits || 0), 0);
  const dartsSaved = playerStats.reduce((sum, stats) => sum + Number(stats?.dartsSaved || 0), 0);
  const accuracy = darts > 0 ? (hits / darts) * 100 : 0;
  const active = state.territories.filter((territory) => territory.playable).length || 1;
  const preservationRate = Math.max(0, Math.min(100, ((active - Number(state.totalDestroyed || 0)) / active) * 100));
  const incidents = activeIncidents(state);
  let rating = 55;
  rating += accuracy * .18;
  rating += preservationRate * .17;
  rating += Math.min(8, Number(state.propagationBlocked || 0) * 2);
  rating += Math.min(5, dartsSaved);
  rating += state.won && incidents === 0 ? 5 : 0;
  rating -= Math.min(20, incidents * 3);
  rating = Math.max(0, Math.min(100, Math.round(rating)));
  if (!state.won) rating = Math.min(49, rating);
  const grade: DartsFirefighterMissionGrade = rating >= 90 ? "S" : rating >= 80 ? "A" : rating >= 68 ? "B" : rating >= 55 ? "C" : "D";
  const label = grade === "S" ? "LÉGENDE DU FEU" : grade === "A" ? "COMMANDANT D’ÉLITE" : grade === "B" ? "BRIGADE EFFICACE" : grade === "C" ? "MISSION VALIDÉE" : "INTERVENTION À REVOIR";
  return { grade, label, rating, accuracy: Math.round(accuracy * 10) / 10, preservationRate: Math.round(preservationRate * 10) / 10, dartsSaved };
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
  "fire-status-safe": "#3a2f2d",
  "fire-status-protected": "#36d7ff",
  "fire-status-smoke": "#b8956c",
  "fire-status-fire1": "#ffbf2d",
  "fire-status-fire2": "#ff7d2d",
  "fire-status-fire3": "#ff4036",
  "fire-status-destroyed": "#4c5562",
};

export function difficultyLabel(value: DartsFirefighterDifficulty): string {
  return value === "recruit" ? "RECRUE" : value === "firefighter" ? "POMPIER" : value === "commander" ? "COMMANDANT" : "INFERNO";
}

export function finishReasonLabel(reason: DartsFirefighterFinishReason): string {
  if (reason === "all_fires_out") return "INCENDIE MAÎTRISÉ";
  if (reason === "objective_complete") return "MISSION ACCOMPLIE";
  if (reason === "critical_lost") return "ZONE CRITIQUE PERDUE";
  if (reason === "destruction_limit") return "TROP DE TERRITOIRES DÉTRUITS";
  if (reason === "round_limit") return "TEMPS D’INTERVENTION ÉCOULÉ";
  return "MISSION TERMINÉE";
}
