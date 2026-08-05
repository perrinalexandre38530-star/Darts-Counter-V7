// =============================================================
// CARGO — moteur pur V1
// Palettes, contrats dynamiques, chargement libre, charge exacte,
// fragile, rush, convoi, long haul et variante livraison de colis.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type CargoVariant =
  | "cargo_classic"
  | "free_load"
  | "full_pallet"
  | "exact_load"
  | "fragile_cargo"
  | "cargo_rush"
  | "convoy"
  | "long_haul"
  | "parcel_delivery";

export type CargoSeriesRule = "exact_segment" | "same_number";
export type CargoBreakRule = "secure" | "partial" | "lose";
export type CargoBullRule = "weight" | "joker" | "secure";
export type CargoDBullRule = "weight" | "joker" | "validate" | "protect";
export type CargoBotLevel = "easy" | "normal" | "hard";
export type CargoScoreInputMethod = "keypad" | "dartboard";
export type CargoParticipantMode = "players" | "teams";
export type CargoOverloadRule = "reject_last" | "penalty" | "unload";
export type CargoContractBed = "S" | "D" | "T" | "ANY";

export type CargoConfigPayload = {
  mode: "cargo";
  variant: CargoVariant;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: CargoBotLevel;
  participantMode: CargoParticipantMode;
  teamByPlayer?: Record<string, string>;
  rounds: number;
  dartsPerTurn: 3;
  visibleContracts: 2 | 3 | 4;
  seriesRule: CargoSeriesRule;
  carrySeriesBetweenTurns: boolean;
  mismatchRule: CargoBreakRule;
  missRule: CargoBreakRule;
  minSeries: number;
  maxSeries: number;
  truckCapacity: number;
  targetWeight: number;
  overloadRule: CargoOverloadRule;
  bullRule: CargoBullRule;
  dbullRule: CargoDBullRule;
  fragileRate: number;
  urgentRate: number;
  rushExpiryRounds: number;
  parcelBonuses: Record<number, number>;
  randomOrder: boolean;
  scoreInputMethod: CargoScoreInputMethod;
};

export type CargoContract = {
  id: string;
  label: string;
  cargoType: string;
  sector: number;
  bed: CargoContractBed;
  targetCount: number;
  baseWeight: number;
  finalWeight: number;
  bonusPercent: number;
  fragile: boolean;
  urgent: boolean;
  expiresAtRound: number | null;
  icon: string;
};

export type CargoSeries = {
  key: string;
  number: number;
  bed: CargoContractBed;
  count: number;
  rawWeight: number;
  contractId: string | null;
  protected: boolean;
  startedRound: number;
  labels: string[];
};

export type CargoPlayerStats = {
  darts: number;
  visits: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  totalWeight: number;
  pallets: number;
  cartons: number;
  crates: number;
  fullPallets: number;
  completedContracts: number;
  failedContracts: number;
  fragileCompleted: number;
  fragileBroken: number;
  urgentCompleted: number;
  lostWeight: number;
  rejectedWeight: number;
  overloads: number;
  perfectLoads: number;
  currentSeries: CargoSeries | null;
  longestSeries: number;
  bestPalletWeight: number;
  seriesCompleted: Record<string, number>;
  weightByNumber: Record<string, number>;
  weightByBed: Record<string, number>;
  hitsBySegment: Record<string, number>;
  parcelsDelivered: number;
  parcelDeliveries: number;
  parcelBonuses: number;
  parcelSeries: Record<string, number>;
  routeStagesCompleted: number;
};

export type CargoVisitEvent = {
  type:
    | "hit"
    | "miss"
    | "series_start"
    | "series_progress"
    | "series_secure"
    | "series_lost"
    | "contract_complete"
    | "free_load_complete"
    | "parcel_delivery"
    | "bull_joker"
    | "bull_secure"
    | "dbull_validate"
    | "dbull_protect"
    | "overload"
    | "perfect_load"
    | "contract_expired"
    | "route_stage";
  label: string;
  playerId: string;
  contractId?: string | null;
  weight?: number;
  parcels?: number;
  seriesCount?: number;
};

export type CargoVisit = {
  id: string;
  createdAt: string;
  round: number;
  visit: number;
  playerId: string;
  darts: GameDart[];
  labels: string[];
  events: CargoVisitEvent[];
  before: CargoPlayerStats;
  after: CargoPlayerStats;
};

export type CargoStanding = {
  id: string;
  name: string;
  teamId: string | null;
  rank: number;
  tied: boolean;
  score: number;
  totalWeight: number;
  parcelsDelivered: number;
  pallets: number;
  completedContracts: number;
  longestSeries: number;
  bestPalletWeight: number;
};

export type CargoState = {
  sport: "darts";
  mode: "cargo";
  config: CargoConfigPayload;
  players: Player[];
  contracts: CargoContract[];
  contractSerial: number;
  roundIndex: number;
  activePlayerIndex: number;
  visitIndex: number;
  statsByPlayer: Record<string, CargoPlayerStats>;
  visits: CargoVisit[];
  phase: "playing" | "finished";
  standings: CargoStanding[];
  winnerIds: string[];
  routeStage: number;
  routeStages: string[];
  startedAt: number;
  finishedAt?: number;
};

const CARGO_TYPES = [
  ["Produits alimentaires", "🥫"],
  ["Pièces industrielles", "⚙️"],
  ["Matériel médical", "✚"],
  ["Électroménager", "▣"],
  ["Textile", "🧵"],
  ["Boissons", "🥤"],
  ["Électronique", "⌁"],
  ["Matériel sportif", "🏅"],
  ["Outillage", "🔧"],
  ["Marchandise premium", "◆"],
] as const;

export const CARGO_VARIANT_LABELS: Record<CargoVariant, string> = {
  cargo_classic: "Cargo Classic",
  free_load: "Free Load",
  full_pallet: "Full Pallet",
  exact_load: "Exact Load",
  fragile_cargo: "Fragile Cargo",
  cargo_rush: "Cargo Rush",
  convoy: "Convoy",
  long_haul: "Long Haul",
  parcel_delivery: "Parcel Delivery",
};

const DEFAULT_PARCEL_BONUSES: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 7 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
function int(value: unknown, fallback: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
function bedMultiplier(bed: CargoContractBed | string): number {
  if (bed === "T") return 3;
  if (bed === "D") return 2;
  return 1;
}
function gameDartBed(dart: GameDart): CargoContractBed | "BULL" | "DBULL" | "MISS" {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "IB") return "DBULL";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "T") return "T";
  if (dart.bed === "D") return "D";
  return "S";
}
function dartNumber(dart: GameDart): number {
  const bed = gameDartBed(dart);
  if (bed === "BULL") return 25;
  if (bed === "DBULL") return 25;
  return Number((dart as any)?.number || 0);
}
function dartWeight(dart: GameDart): number {
  const bed = gameDartBed(dart);
  if (bed === "MISS") return 0;
  if (bed === "BULL") return 25;
  if (bed === "DBULL") return 50;
  return dartNumber(dart) * bedMultiplier(bed);
}
function segmentKey(dart: GameDart): string {
  const bed = gameDartBed(dart);
  if (bed === "MISS") return "MISS";
  if (bed === "BULL") return "BULL";
  if (bed === "DBULL") return "DBULL";
  return `${bed}${dartNumber(dart)}`;
}
function seriesKey(dart: GameDart, rule: CargoSeriesRule): string {
  const bed = gameDartBed(dart);
  if (bed === "MISS") return "MISS";
  if (bed === "BULL" || bed === "DBULL") return bed;
  return rule === "same_number" ? `N${dartNumber(dart)}` : `${bed}${dartNumber(dart)}`;
}
function playerName(player: any): string {
  return String(player?.name || player?.displayName || player?.display_name || "Joueur");
}

export function cargoDartLabel(dart: GameDart): string {
  const bed = gameDartBed(dart);
  if (bed === "MISS") return "MISS";
  if (bed === "BULL") return "BULL";
  if (bed === "DBULL") return "DBULL";
  return `${bed}${dartNumber(dart)}`;
}

export function cargoVariantLabel(variant: CargoVariant): string {
  return CARGO_VARIANT_LABELS[variant] || "Cargo";
}

export function normalizeCargoConfig(raw: Partial<CargoConfigPayload> = {}): CargoConfigPayload {
  const variant = (Object.keys(CARGO_VARIANT_LABELS) as CargoVariant[]).includes(raw.variant as CargoVariant)
    ? (raw.variant as CargoVariant)
    : "cargo_classic";
  const maxSeriesDefault = variant === "parcel_delivery" ? 5 : variant === "full_pallet" ? 5 : 4;
  const exact = variant === "exact_load";
  return {
    mode: "cargo",
    variant,
    players: clamp(int(raw.players || raw.selectedIds?.length || 1, 1), 1, 12),
    selectedIds: Array.isArray(raw.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw.playersList) ? raw.playersList : [],
    playerDartSets: raw.playerDartSets || {},
    botIds: Array.isArray(raw.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw.botsEnabled),
    botLevel: raw.botLevel === "easy" || raw.botLevel === "hard" ? raw.botLevel : "normal",
    participantMode: raw.participantMode === "teams" ? "teams" : "players",
    teamByPlayer: raw.teamByPlayer || {},
    rounds: clamp(int(raw.rounds, variant === "cargo_rush" ? 5 : 10), 3, 30),
    dartsPerTurn: 3,
    visibleContracts: ([2, 3, 4].includes(Number(raw.visibleContracts)) ? Number(raw.visibleContracts) : 3) as 2 | 3 | 4,
    seriesRule: raw.seriesRule === "same_number" ? "same_number" : "exact_segment",
    carrySeriesBetweenTurns: raw.carrySeriesBetweenTurns !== false,
    mismatchRule: raw.mismatchRule === "secure" || raw.mismatchRule === "lose" ? raw.mismatchRule : "partial",
    missRule: raw.missRule === "secure" || raw.missRule === "partial" ? raw.missRule : variant === "fragile_cargo" ? "lose" : "partial",
    minSeries: clamp(int(raw.minSeries, variant === "full_pallet" ? 2 : 1), 1, 5),
    maxSeries: clamp(int(raw.maxSeries, maxSeriesDefault), 2, 7),
    truckCapacity: clamp(int(raw.truckCapacity, exact ? 500 : 1000), 100, 5000),
    targetWeight: clamp(int(raw.targetWeight, exact ? 500 : 0), 0, 5000),
    overloadRule: raw.overloadRule === "penalty" || raw.overloadRule === "unload" ? raw.overloadRule : "reject_last",
    bullRule: raw.bullRule === "joker" || raw.bullRule === "secure" ? raw.bullRule : "weight",
    dbullRule: raw.dbullRule === "joker" || raw.dbullRule === "validate" || raw.dbullRule === "protect" ? raw.dbullRule : "weight",
    fragileRate: clamp(Number(raw.fragileRate ?? (variant === "fragile_cargo" ? 0.55 : 0.16)), 0, 1),
    urgentRate: clamp(Number(raw.urgentRate ?? (variant === "cargo_rush" ? 0.65 : 0.18)), 0, 1),
    rushExpiryRounds: clamp(int(raw.rushExpiryRounds, 1), 1, 4),
    parcelBonuses: { ...DEFAULT_PARCEL_BONUSES, ...(raw.parcelBonuses || {}) },
    randomOrder: Boolean(raw.randomOrder),
    scoreInputMethod: raw.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function emptyPlayerStats(): CargoPlayerStats {
  return {
    darts: 0,
    visits: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    bulls: 0,
    dbulls: 0,
    misses: 0,
    totalWeight: 0,
    pallets: 0,
    cartons: 0,
    crates: 0,
    fullPallets: 0,
    completedContracts: 0,
    failedContracts: 0,
    fragileCompleted: 0,
    fragileBroken: 0,
    urgentCompleted: 0,
    lostWeight: 0,
    rejectedWeight: 0,
    overloads: 0,
    perfectLoads: 0,
    currentSeries: null,
    longestSeries: 0,
    bestPalletWeight: 0,
    seriesCompleted: {},
    weightByNumber: {},
    weightByBed: {},
    hitsBySegment: {},
    parcelsDelivered: 0,
    parcelDeliveries: 0,
    parcelBonuses: 0,
    parcelSeries: {},
    routeStagesCompleted: 0,
  };
}

function createContract(config: CargoConfigPayload, serial: number, currentRound: number, avoid: CargoContract[] = []): CargoContract {
  const used = new Set(avoid.map((contract) => `${contract.bed}-${contract.sector}-${contract.targetCount}`));
  let sector = randomBetween(1, 20);
  let bed: CargoContractBed = pick(["S", "S", "D", "D", "T"] as const);
  let targetCount = randomBetween(config.minSeries, config.maxSeries);
  for (let i = 0; i < 30 && used.has(`${bed}-${sector}-${targetCount}`); i += 1) {
    sector = randomBetween(1, 20);
    bed = pick(["S", "S", "D", "D", "T"] as const);
    targetCount = randomBetween(config.minSeries, config.maxSeries);
  }
  const [cargoType, icon] = pick(CARGO_TYPES);
  const fragile = Math.random() < config.fragileRate;
  const urgent = Math.random() < config.urgentRate;
  const bonusPercent = (fragile ? 25 : 0) + (urgent ? 20 : 0) + Math.max(0, targetCount - 3) * 8;
  const baseWeight = sector * bedMultiplier(bed) * targetCount;
  const finalWeight = Math.round(baseWeight * (1 + bonusPercent / 100));
  return {
    id: `cargo-contract-${serial}`,
    label: cargoType,
    cargoType,
    sector,
    bed,
    targetCount,
    baseWeight,
    finalWeight,
    bonusPercent,
    fragile,
    urgent,
    expiresAtRound: urgent ? currentRound + config.rushExpiryRounds - 1 : null,
    icon,
  };
}

function initialContracts(config: CargoConfigPayload): CargoContract[] {
  if (config.variant === "free_load" || config.variant === "full_pallet" || config.variant === "parcel_delivery") return [];
  const list: CargoContract[] = [];
  for (let i = 0; i < config.visibleContracts; i += 1) list.push(createContract(config, i + 1, 1, list));
  return list;
}

function computeStandings(state: CargoState): CargoStanding[] {
  const parcel = state.config.variant === "parcel_delivery";
  const rows = state.players.map((player) => {
    const stats = state.statsByPlayer[player.id] || emptyPlayerStats();
    const score = parcel ? stats.parcelsDelivered : stats.totalWeight;
    return {
      id: player.id,
      name: playerName(player),
      teamId: state.config.teamByPlayer?.[player.id] || null,
      rank: 0,
      tied: false,
      score,
      totalWeight: stats.totalWeight,
      parcelsDelivered: stats.parcelsDelivered,
      pallets: stats.pallets,
      completedContracts: stats.completedContracts,
      longestSeries: stats.longestSeries,
      bestPalletWeight: stats.bestPalletWeight,
    };
  });

  if (state.config.participantMode === "teams") {
    const teamTotals = new Map<string, number>();
    rows.forEach((row) => {
      const key = row.teamId || row.id;
      teamTotals.set(key, (teamTotals.get(key) || 0) + row.score);
    });
    rows.forEach((row) => { row.score = teamTotals.get(row.teamId || row.id) || row.score; });
  }

  rows.sort((a, b) => b.score - a.score || b.completedContracts - a.completedContracts || b.longestSeries - a.longestSeries || a.name.localeCompare(b.name));
  let rank = 0;
  let lastScore: number | null = null;
  rows.forEach((row, index) => {
    if (lastScore === null || row.score !== lastScore) rank = index + 1;
    row.rank = rank;
    lastScore = row.score;
  });
  rows.forEach((row) => { row.tied = rows.filter((other) => other.rank === row.rank).length > 1; });
  return rows;
}

export function createCargoState(players: Player[], rawConfig: Partial<CargoConfigPayload>): CargoState {
  const config = normalizeCargoConfig(rawConfig);
  const statsByPlayer: Record<string, CargoPlayerStats> = {};
  players.forEach((player) => { statsByPlayer[String(player.id)] = emptyPlayerStats(); });
  const state: CargoState = {
    sport: "darts",
    mode: "cargo",
    config,
    players: players.map((player) => ({ ...player, id: String(player.id), name: playerName(player) })),
    contracts: initialContracts(config),
    contractSerial: config.visibleContracts,
    roundIndex: 1,
    activePlayerIndex: 0,
    visitIndex: 0,
    statsByPlayer,
    visits: [],
    phase: "playing",
    standings: [],
    winnerIds: [],
    routeStage: 0,
    routeStages: ["Entrepôt", "Autoroute", "Péage", "Montagne", "Zone industrielle", "Centre de livraison"],
    startedAt: Date.now(),
  };
  state.standings = computeStandings(state);
  return state;
}

export function cloneCargoState(state: CargoState): CargoState {
  return clone(state);
}

export function getCargoActivePlayer(state: CargoState): Player | null {
  return state.players[state.activePlayerIndex] || null;
}

export function getCargoActiveStats(state: CargoState): CargoPlayerStats | null {
  const player = getCargoActivePlayer(state);
  return player ? state.statsByPlayer[player.id] || null : null;
}

export function findCargoContractForDart(state: CargoState, dart: GameDart): CargoContract | null {
  const bed = gameDartBed(dart);
  const number = dartNumber(dart);
  if (bed === "MISS" || bed === "BULL" || bed === "DBULL") return null;
  return state.contracts.find((contract) => contract.sector === number && (contract.bed === "ANY" || contract.bed === bed)) || null;
}

function seriesMatches(series: CargoSeries, dart: GameDart, rule: CargoSeriesRule, contract?: CargoContract | null): boolean {
  if (contract && series.contractId && contract.id !== series.contractId) return false;
  return series.key === seriesKey(dart, rule);
}

function startSeries(dart: GameDart, config: CargoConfigPayload, round: number, contract: CargoContract | null): CargoSeries {
  const bed = gameDartBed(dart);
  return {
    key: seriesKey(dart, config.seriesRule),
    number: dartNumber(dart),
    bed: bed === "S" || bed === "D" || bed === "T" ? bed : "ANY",
    count: 1,
    rawWeight: dartWeight(dart),
    contractId: contract?.id || null,
    protected: false,
    startedRound: round,
    labels: [cargoDartLabel(dart)],
  };
}

function addToSeries(series: CargoSeries, dart: GameDart): CargoSeries {
  return {
    ...series,
    count: series.count + 1,
    rawWeight: series.rawWeight + dartWeight(dart),
    labels: [...series.labels, cargoDartLabel(dart)],
  };
}

function seriesTier(count: number): "carton" | "caisse" | "palette" | "full" {
  if (count >= 5) return "full";
  if (count >= 4) return "palette";
  if (count >= 3) return "caisse";
  return "carton";
}

function applyWeightLoad(state: CargoState, playerId: string, weight: number, series: CargoSeries, contract: CargoContract | null, events: CargoVisitEvent[]): void {
  const stats = state.statsByPlayer[playerId];
  const config = state.config;
  let acceptedWeight = Math.max(0, Math.round(weight));
  const capacity = config.variant === "exact_load" ? config.truckCapacity : Number.POSITIVE_INFINITY;

  if (stats.totalWeight + acceptedWeight > capacity) {
    stats.overloads += 1;
    events.push({ type: "overload", label: `Surcharge : ${stats.totalWeight + acceptedWeight}/${capacity} kg`, playerId, weight: acceptedWeight, contractId: contract?.id || null });
    if (config.overloadRule === "reject_last") {
      stats.rejectedWeight += acceptedWeight;
      acceptedWeight = 0;
    } else if (config.overloadRule === "penalty") {
      const excess = stats.totalWeight + acceptedWeight - capacity;
      stats.rejectedWeight += excess;
      acceptedWeight = Math.max(0, acceptedWeight - excess * 2);
    } else {
      const overflow = stats.totalWeight + acceptedWeight - capacity;
      stats.totalWeight = Math.max(0, stats.totalWeight - overflow);
    }
  }

  if (acceptedWeight <= 0) return;
  stats.totalWeight += acceptedWeight;
  stats.pallets += 1;
  stats.completedContracts += contract ? 1 : 0;
  stats.bestPalletWeight = Math.max(stats.bestPalletWeight, acceptedWeight);
  stats.longestSeries = Math.max(stats.longestSeries, series.count);
  stats.seriesCompleted[String(series.count)] = (stats.seriesCompleted[String(series.count)] || 0) + 1;
  stats.weightByNumber[String(series.number)] = (stats.weightByNumber[String(series.number)] || 0) + acceptedWeight;
  stats.weightByBed[String(series.bed)] = (stats.weightByBed[String(series.bed)] || 0) + acceptedWeight;
  const tier = seriesTier(series.count);
  if (tier === "carton") stats.cartons += 1;
  if (tier === "caisse") stats.crates += 1;
  if (tier === "palette") stats.pallets += 0;
  if (tier === "full") stats.fullPallets += 1;
  if (contract?.fragile) stats.fragileCompleted += 1;
  if (contract?.urgent) stats.urgentCompleted += 1;

  if (config.variant === "exact_load" && stats.totalWeight === config.truckCapacity) {
    stats.perfectLoads += 1;
    events.push({ type: "perfect_load", label: `CHARGEMENT PARFAIT : ${config.truckCapacity} kg`, playerId, weight: acceptedWeight, contractId: contract?.id || null });
  }

  events.push({
    type: contract ? "contract_complete" : "free_load_complete",
    label: `${contract ? contract.label : "Palette"} chargée : ${acceptedWeight} kg`,
    playerId,
    weight: acceptedWeight,
    contractId: contract?.id || null,
    seriesCount: series.count,
  });
}

function closeParcelSeries(state: CargoState, playerId: string, series: CargoSeries | null, events: CargoVisitEvent[]): void {
  if (!series || series.count <= 0) return;
  const stats = state.statsByPlayer[playerId];
  const capped = Math.min(5, series.count);
  const bonus = Number(state.config.parcelBonuses[capped] || 0);
  const delivered = capped + bonus;
  stats.parcelsDelivered += delivered;
  stats.parcelDeliveries += 1;
  stats.parcelBonuses += bonus;
  stats.longestSeries = Math.max(stats.longestSeries, capped);
  stats.parcelSeries[String(capped)] = (stats.parcelSeries[String(capped)] || 0) + 1;
  events.push({
    type: "parcel_delivery",
    label: `${delivered} colis livrés à l’adresse ${series.number} (${capped} + bonus ${bonus})`,
    playerId,
    parcels: delivered,
    seriesCount: capped,
  });
}

function closeFreeSeries(state: CargoState, playerId: string, series: CargoSeries | null, events: CargoVisitEvent[], forceLose = false): void {
  if (!series || series.count <= 0) return;
  const stats = state.statsByPlayer[playerId];
  if (forceLose || series.count < state.config.minSeries) {
    stats.failedContracts += 1;
    stats.lostWeight += series.rawWeight;
    events.push({ type: "series_lost", label: `Chargement perdu : ${series.rawWeight} kg`, playerId, weight: series.rawWeight, seriesCount: series.count });
    return;
  }
  let weight = series.rawWeight;
  if (state.config.variant === "full_pallet") {
    const factor = series.count >= 5 ? 1.65 : series.count === 4 ? 1.35 : series.count === 3 ? 1.15 : 0.8;
    weight = Math.round(weight * factor);
  }
  applyWeightLoad(state, playerId, weight, series, null, events);
}

function closeContractSeries(state: CargoState, playerId: string, series: CargoSeries | null, events: CargoVisitEvent[], rule: CargoBreakRule): void {
  if (!series) return;
  const stats = state.statsByPlayer[playerId];
  const contract = state.contracts.find((item) => item.id === series.contractId) || null;
  if (!contract) {
    closeFreeSeries(state, playerId, series, events, rule === "lose");
    return;
  }
  if (series.count >= contract.targetCount) {
    applyWeightLoad(state, playerId, contract.finalWeight, series, contract, events);
    replaceContract(state, contract.id);
    return;
  }
  if (rule === "secure") {
    const partialWeight = Math.round(contract.finalWeight * (series.count / contract.targetCount));
    applyWeightLoad(state, playerId, partialWeight, series, null, events);
    events.push({ type: "series_secure", label: `Charge partielle sécurisée : ${partialWeight} kg`, playerId, weight: partialWeight, contractId: contract.id, seriesCount: series.count });
  } else if (rule === "partial") {
    const partialWeight = Math.round(series.rawWeight * 0.6);
    if (partialWeight > 0) applyWeightLoad(state, playerId, partialWeight, series, null, events);
    stats.failedContracts += 1;
    stats.lostWeight += Math.max(0, contract.finalWeight - partialWeight);
    events.push({ type: "series_lost", label: `Contrat interrompu : ${partialWeight} kg sauvés`, playerId, weight: partialWeight, contractId: contract.id, seriesCount: series.count });
  } else {
    stats.failedContracts += 1;
    stats.lostWeight += contract.finalWeight;
    if (contract.fragile) stats.fragileBroken += 1;
    events.push({ type: "series_lost", label: `${contract.fragile ? "Palette fragile détruite" : "Contrat perdu"} : ${contract.finalWeight} kg`, playerId, weight: contract.finalWeight, contractId: contract.id, seriesCount: series.count });
  }
}

function replaceContract(state: CargoState, contractId: string): void {
  const index = state.contracts.findIndex((contract) => contract.id === contractId);
  if (index < 0) return;
  state.contractSerial += 1;
  const next = createContract(state.config, state.contractSerial, state.roundIndex, state.contracts.filter((contract) => contract.id !== contractId));
  state.contracts.splice(index, 1, next);
}

function processBull(state: CargoState, playerId: string, dart: GameDart, events: CargoVisitEvent[]): boolean {
  const stats = state.statsByPlayer[playerId];
  const bed = gameDartBed(dart);
  if (bed !== "BULL" && bed !== "DBULL") return false;
  const series = stats.currentSeries;
  if (bed === "BULL") {
    if (state.config.bullRule === "joker" && series) {
      series.count += 1;
      series.rawWeight += 25;
      series.labels.push("BULL/JOKER");
      events.push({ type: "bull_joker", label: "Bull Joker : série prolongée", playerId, seriesCount: series.count });
      return true;
    }
    if (state.config.bullRule === "secure" && series) {
      if (state.config.variant === "parcel_delivery") closeParcelSeries(state, playerId, series, events);
      else if (series.contractId) closeContractSeries(state, playerId, series, events, "secure");
      else closeFreeSeries(state, playerId, series, events, false);
      stats.currentSeries = null;
      events.push({ type: "bull_secure", label: "Bull : chargement sécurisé", playerId });
      return true;
    }
    if (state.config.variant !== "parcel_delivery") {
      const bullSeries = startSeries(dart, state.config, state.roundIndex, null);
      applyWeightLoad(state, playerId, 25, bullSeries, null, events);
    } else {
      stats.parcelsDelivered += 1;
      stats.parcelDeliveries += 1;
    }
    return true;
  }

  if (state.config.dbullRule === "joker" && series) {
    series.count += 1;
    series.rawWeight += 50;
    series.labels.push("DBULL/JOKER");
    events.push({ type: "bull_joker", label: "Double Bull Joker : série prolongée", playerId, seriesCount: series.count });
    return true;
  }
  if (state.config.dbullRule === "protect" && series) {
    series.protected = true;
    events.push({ type: "dbull_protect", label: "Double Bull : palette protégée", playerId, seriesCount: series.count });
    return true;
  }
  if (state.config.dbullRule === "validate" && series) {
    if (state.config.variant === "parcel_delivery") closeParcelSeries(state, playerId, series, events);
    else if (series.contractId) {
      const contract = state.contracts.find((item) => item.id === series.contractId) || null;
      if (contract) {
        const completed = { ...series, count: contract.targetCount };
        applyWeightLoad(state, playerId, contract.finalWeight, completed, contract, events);
        replaceContract(state, contract.id);
      }
    } else closeFreeSeries(state, playerId, series, events, false);
    stats.currentSeries = null;
    events.push({ type: "dbull_validate", label: "Double Bull : livraison validée", playerId });
    return true;
  }
  if (state.config.variant !== "parcel_delivery") {
    const dbullSeries = startSeries(dart, state.config, state.roundIndex, null);
    applyWeightLoad(state, playerId, 50, dbullSeries, null, events);
  } else {
    stats.parcelsDelivered += 2;
    stats.parcelDeliveries += 1;
  }
  return true;
}

function processParcelDart(state: CargoState, playerId: string, dart: GameDart, events: CargoVisitEvent[]): void {
  const stats = state.statsByPlayer[playerId];
  const bed = gameDartBed(dart);
  if (bed === "MISS") {
    closeParcelSeries(state, playerId, stats.currentSeries, events);
    stats.currentSeries = null;
    return;
  }
  if (bed === "BULL" || bed === "DBULL") {
    processBull(state, playerId, dart, events);
    return;
  }
  const current = stats.currentSeries;
  if (current && seriesMatches(current, dart, state.config.seriesRule, null)) {
    stats.currentSeries = addToSeries(current, dart);
    events.push({ type: "series_progress", label: `Adresse ${dartNumber(dart)} : ${stats.currentSeries.count}/5 colis`, playerId, seriesCount: stats.currentSeries.count });
  } else {
    if (current) closeParcelSeries(state, playerId, current, events);
    stats.currentSeries = startSeries(dart, state.config, state.roundIndex, null);
    events.push({ type: "series_start", label: `Nouvelle livraison à l’adresse ${dartNumber(dart)}`, playerId, seriesCount: 1 });
  }
  if ((stats.currentSeries?.count || 0) >= 5) {
    closeParcelSeries(state, playerId, stats.currentSeries, events);
    stats.currentSeries = null;
  }
}

function processFreeLoadDart(state: CargoState, playerId: string, dart: GameDart, events: CargoVisitEvent[]): void {
  const stats = state.statsByPlayer[playerId];
  const bed = gameDartBed(dart);
  if (bed === "MISS") {
    const current = stats.currentSeries;
    if (current?.protected) {
      current.protected = false;
      events.push({ type: "series_secure", label: "Protection consommée : série conservée", playerId, seriesCount: current.count });
    } else {
      closeFreeSeries(state, playerId, current, events, state.config.missRule === "lose");
      stats.currentSeries = null;
    }
    return;
  }
  if (bed === "BULL" || bed === "DBULL") {
    processBull(state, playerId, dart, events);
    return;
  }
  const current = stats.currentSeries;
  if (current && seriesMatches(current, dart, state.config.seriesRule, null)) {
    stats.currentSeries = addToSeries(current, dart);
    events.push({ type: "series_progress", label: `${cargoDartLabel(dart)} : série ${stats.currentSeries.count}/${state.config.maxSeries}`, playerId, seriesCount: stats.currentSeries.count });
  } else {
    if (current) {
      if (current.protected) current.protected = false;
      else closeFreeSeries(state, playerId, current, events, state.config.mismatchRule === "lose");
    }
    stats.currentSeries = startSeries(dart, state.config, state.roundIndex, null);
    events.push({ type: "series_start", label: `Nouvelle palette : ${cargoDartLabel(dart)}`, playerId, seriesCount: 1 });
  }
  if ((stats.currentSeries?.count || 0) >= state.config.maxSeries) {
    closeFreeSeries(state, playerId, stats.currentSeries, events, false);
    stats.currentSeries = null;
  }
}

function processContractDart(state: CargoState, playerId: string, dart: GameDart, events: CargoVisitEvent[]): void {
  const stats = state.statsByPlayer[playerId];
  const bed = gameDartBed(dart);
  if (bed === "MISS") {
    const current = stats.currentSeries;
    if (current?.protected) {
      current.protected = false;
      events.push({ type: "series_secure", label: "Protection consommée : contrat conservé", playerId, seriesCount: current.count, contractId: current.contractId });
    } else {
      closeContractSeries(state, playerId, current, events, state.config.missRule);
      stats.currentSeries = null;
    }
    return;
  }
  if (bed === "BULL" || bed === "DBULL") {
    processBull(state, playerId, dart, events);
    return;
  }

  const current = stats.currentSeries;
  const selectedContract = current?.contractId
    ? state.contracts.find((contract) => contract.id === current.contractId) || null
    : findCargoContractForDart(state, dart);

  if (current && selectedContract && seriesMatches(current, dart, state.config.seriesRule, selectedContract)) {
    stats.currentSeries = addToSeries(current, dart);
    events.push({ type: "series_progress", label: `${selectedContract.label} : ${stats.currentSeries.count}/${selectedContract.targetCount}`, playerId, contractId: selectedContract.id, seriesCount: stats.currentSeries.count });
  } else {
    if (current) {
      if (current.protected) current.protected = false;
      else closeContractSeries(state, playerId, current, events, state.config.mismatchRule);
    }
    const contract = findCargoContractForDart(state, dart);
    if (contract) {
      stats.currentSeries = startSeries(dart, state.config, state.roundIndex, contract);
      events.push({ type: "series_start", label: `${contract.label} démarré : 1/${contract.targetCount}`, playerId, contractId: contract.id, seriesCount: 1 });
    } else {
      stats.currentSeries = null;
      events.push({ type: "hit", label: `${cargoDartLabel(dart)} ne correspond à aucun contrat`, playerId });
      return;
    }
  }

  const activeSeries = stats.currentSeries;
  const activeContract = activeSeries ? state.contracts.find((contract) => contract.id === activeSeries.contractId) || null : null;
  if (activeSeries && activeContract && activeSeries.count >= activeContract.targetCount) {
    applyWeightLoad(state, playerId, activeContract.finalWeight, activeSeries, activeContract, events);
    replaceContract(state, activeContract.id);
    stats.currentSeries = null;
  }
}

function expireUrgentContracts(state: CargoState, events: CargoVisitEvent[]): void {
  if (!state.contracts.length) return;
  const expired = state.contracts.filter((contract) => contract.expiresAtRound != null && contract.expiresAtRound < state.roundIndex);
  expired.forEach((contract) => {
    events.push({ type: "contract_expired", label: `Contrat urgent expiré : ${contract.label}`, playerId: "system", contractId: contract.id, weight: contract.finalWeight });
    replaceContract(state, contract.id);
  });
}

function maybeAdvanceLongHaulStage(state: CargoState, playerId: string, events: CargoVisitEvent[]): void {
  if (state.config.variant !== "long_haul") return;
  const stageSize = Math.max(1, Math.ceil(state.config.rounds / state.routeStages.length));
  const nextStage = Math.min(state.routeStages.length - 1, Math.floor((state.roundIndex - 1) / stageSize));
  if (nextStage > state.routeStage) {
    state.routeStage = nextStage;
    state.statsByPlayer[playerId].routeStagesCompleted = Math.max(state.statsByPlayer[playerId].routeStagesCompleted, nextStage);
    events.push({ type: "route_stage", label: `Étape atteinte : ${state.routeStages[nextStage]}`, playerId });
  }
}

function finishPendingSeries(state: CargoState): void {
  state.players.forEach((player) => {
    const stats = state.statsByPlayer[player.id];
    const events: CargoVisitEvent[] = [];
    if (state.config.variant === "parcel_delivery") closeParcelSeries(state, player.id, stats.currentSeries, events);
    else if (state.config.variant === "free_load" || state.config.variant === "full_pallet") closeFreeSeries(state, player.id, stats.currentSeries, events, false);
    else closeContractSeries(state, player.id, stats.currentSeries, events, "secure");
    stats.currentSeries = null;
  });
}

function advanceTurn(state: CargoState, events: CargoVisitEvent[]): void {
  const lastPlayer = state.activePlayerIndex >= state.players.length - 1;
  if (lastPlayer) {
    state.activePlayerIndex = 0;
    state.roundIndex += 1;
    expireUrgentContracts(state, events);
  } else {
    state.activePlayerIndex += 1;
  }
  if (state.roundIndex > state.config.rounds) {
    finishPendingSeries(state);
    state.phase = "finished";
    state.finishedAt = Date.now();
    state.standings = computeStandings(state);
    state.winnerIds = state.standings.filter((row) => row.rank === 1).map((row) => row.id);
  }
}

export function playCargoVisit(source: CargoState, darts: GameDart[]): CargoState {
  const state = cloneCargoState(source);
  if (state.phase !== "playing") return state;
  const player = getCargoActivePlayer(state);
  if (!player) return state;
  const playerId = String(player.id);
  const stats = state.statsByPlayer[playerId];

  // CONVOI collectif : un coéquipier peut poursuivre la palette commencée
  // par le joueur précédent. La série change de porteur, mais le score final
  // reste agrégé par équipe dans le classement.
  if (state.config.variant === "convoy" && state.config.participantMode === "teams" && !stats.currentSeries) {
    const teamId = state.config.teamByPlayer?.[playerId] || null;
    if (teamId) {
      const teammate = state.players.find((candidate) => {
        if (String(candidate.id) === playerId) return false;
        return state.config.teamByPlayer?.[String(candidate.id)] === teamId && Boolean(state.statsByPlayer[String(candidate.id)]?.currentSeries);
      });
      if (teammate) {
        stats.currentSeries = clone(state.statsByPlayer[String(teammate.id)].currentSeries);
        state.statsByPlayer[String(teammate.id)].currentSeries = null;
      }
    }
  }

  const before = clone(stats);
  const events: CargoVisitEvent[] = [];
  const labels = darts.map(cargoDartLabel);

  stats.visits += 1;
  state.visitIndex += 1;

  darts.slice(0, state.config.dartsPerTurn).forEach((dart) => {
    const bed = gameDartBed(dart);
    const key = segmentKey(dart);
    stats.darts += 1;
    stats.hitsBySegment[key] = (stats.hitsBySegment[key] || 0) + 1;
    if (bed === "MISS") stats.misses += 1;
    else {
      stats.hits += 1;
      if (bed === "S") stats.singles += 1;
      if (bed === "D") stats.doubles += 1;
      if (bed === "T") stats.triples += 1;
      if (bed === "BULL") stats.bulls += 1;
      if (bed === "DBULL") stats.dbulls += 1;
    }

    if (state.config.variant === "parcel_delivery") processParcelDart(state, playerId, dart, events);
    else if (state.config.variant === "free_load" || state.config.variant === "full_pallet") processFreeLoadDart(state, playerId, dart, events);
    else processContractDart(state, playerId, dart, events);
  });

  if (!state.config.carrySeriesBetweenTurns && stats.currentSeries) {
    if (state.config.variant === "parcel_delivery") closeParcelSeries(state, playerId, stats.currentSeries, events);
    else if (state.config.variant === "free_load" || state.config.variant === "full_pallet") closeFreeSeries(state, playerId, stats.currentSeries, events, false);
    else closeContractSeries(state, playerId, stats.currentSeries, events, "secure");
    stats.currentSeries = null;
  }

  maybeAdvanceLongHaulStage(state, playerId, events);
  const after = clone(stats);
  state.visits.push({
    id: uid("cargo-visit"),
    createdAt: new Date().toISOString(),
    round: state.roundIndex,
    visit: stats.visits,
    playerId,
    darts: clone(darts.slice(0, state.config.dartsPerTurn)),
    labels,
    events,
    before,
    after,
  });

  advanceTurn(state, events);
  state.standings = computeStandings(state);
  if ((state.phase as CargoState["phase"]) === "finished") state.winnerIds = state.standings.filter((row) => row.rank === 1).map((row) => row.id);
  return state;
}

export function cargoContractTargetLabel(contract: CargoContract): string {
  return `${contract.targetCount} × ${contract.bed}${contract.sector}`;
}

export function cargoCurrentObjective(state: CargoState, playerId?: string): string {
  const id = playerId || getCargoActivePlayer(state)?.id;
  const stats = id ? state.statsByPlayer[id] : null;
  const series = stats?.currentSeries;
  if (state.config.variant === "parcel_delivery") {
    return series ? `Adresse ${series.number} · ${series.count}/5 colis` : "Commence une série sur une adresse";
  }
  if (series?.contractId) {
    const contract = state.contracts.find((item) => item.id === series.contractId);
    return contract ? `${contract.label} · ${series.count}/${contract.targetCount} · ${contract.finalWeight} kg` : "Contrat en cours";
  }
  if (series) return `${series.labels[0]} · série ${series.count}/${state.config.maxSeries} · ${series.rawWeight} kg`;
  if (state.contracts[0]) return `${state.contracts[0].label} · ${cargoContractTargetLabel(state.contracts[0])}`;
  return "Construis une série de segments identiques";
}

export function pickCargoBotDarts(state: CargoState): GameDart[] {
  const stats = getCargoActiveStats(state);
  const config = state.config;
  let targetBed: CargoContractBed = "S";
  let targetNumber = 20;
  if (stats?.currentSeries) {
    targetBed = stats.currentSeries.bed === "ANY" ? "S" : stats.currentSeries.bed;
    targetNumber = stats.currentSeries.number;
  } else if (state.contracts.length) {
    const sorted = [...state.contracts].sort((a, b) => b.finalWeight / b.targetCount - a.finalWeight / a.targetCount);
    targetBed = sorted[0].bed === "ANY" ? "S" : sorted[0].bed;
    targetNumber = sorted[0].sector;
  } else if (config.variant === "parcel_delivery") {
    targetBed = "S";
    targetNumber = config.botLevel === "hard" ? 20 : config.botLevel === "normal" ? 18 : randomBetween(10, 20);
  }
  const accuracy = config.botLevel === "hard" ? 0.78 : config.botLevel === "normal" ? 0.58 : 0.36;
  return Array.from({ length: 3 }, () => {
    if (Math.random() > accuracy) {
      if (Math.random() < 0.18) return { bed: "MISS" } as GameDart;
      const randomBed = pick(["S", "S", "D", "T"] as const);
      return { bed: randomBed, number: randomBetween(1, 20) } as GameDart;
    }
    return { bed: targetBed, number: targetNumber } as GameDart;
  });
}

export type CargoMissionGrade = {
  grade: "S" | "A" | "B" | "C" | "D";
  label: string;
  rating: number;
  precision: number;
  completion: number;
  safety: number;
  efficiency: number;
};

export type CargoEventPresentation = {
  icon: string;
  title: string;
  color: string;
  priority: number;
};

function cargoPercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export function cargoEventPresentation(event: CargoVisitEvent | null | undefined): CargoEventPresentation {
  switch (event?.type) {
    case "perfect_load": return { icon: "★", title: "CHARGEMENT PARFAIT", color: "#f6c256", priority: 5 };
    case "contract_complete": return { icon: "▣", title: "CONTRAT CHARGÉ", color: "#62e6a7", priority: 4 };
    case "free_load_complete": return { icon: "▤", title: "PALETTE CHARGÉE", color: "#ff9b42", priority: 4 };
    case "parcel_delivery": return { icon: "⌂", title: "LIVRAISON EFFECTUÉE", color: "#56c9ff", priority: 4 };
    case "route_stage": return { icon: "➜", title: "NOUVELLE ÉTAPE", color: "#56c9ff", priority: 4 };
    case "overload": return { icon: "⚠", title: "SURCHARGE", color: "#ef5261", priority: 5 };
    case "series_lost": return { icon: "×", title: "CHARGEMENT PERDU", color: "#ef5261", priority: 4 };
    case "contract_expired": return { icon: "⌛", title: "CONTRAT EXPIRÉ", color: "#ef5261", priority: 4 };
    case "dbull_validate": return { icon: "◎", title: "VALIDATION DBULL", color: "#f6c256", priority: 3 };
    case "dbull_protect": return { icon: "◆", title: "PALETTE PROTÉGÉE", color: "#56c9ff", priority: 3 };
    case "bull_secure": return { icon: "✓", title: "CHARGE SÉCURISÉE", color: "#62e6a7", priority: 3 };
    case "bull_joker": return { icon: "✦", title: "JOKER BULL", color: "#f6c256", priority: 2 };
    case "series_secure": return { icon: "✓", title: "CHARGE PARTIELLE", color: "#62e6a7", priority: 2 };
    case "series_start": return { icon: "●", title: "NOUVELLE SÉRIE", color: "#ff9b42", priority: 1 };
    case "series_progress": return { icon: "+", title: "SÉRIE EN COURS", color: "#62e6a7", priority: 1 };
    case "miss": return { icon: "–", title: "MISS", color: "#ef5261", priority: 1 };
    default: return { icon: "•", title: "CARGO", color: "#aab1bf", priority: 0 };
  }
}

export function computeCargoMissionGrade(state: CargoState, playerId?: string): CargoMissionGrade {
  const selectedId = String(playerId || state.standings[0]?.id || state.players[0]?.id || "");
  const stats = state.statsByPlayer[selectedId] || emptyPlayerStats();
  const standing = state.standings.find((row) => String(row.id) === selectedId);
  const attempts = stats.completedContracts + stats.failedContracts;
  const precision = cargoPercent(stats.hits, stats.darts);
  const completion = state.config.variant === "parcel_delivery"
    ? clamp((stats.longestSeries / 5) * 55 + Math.min(45, stats.parcelDeliveries * 4), 0, 100)
    : attempts > 0
      ? cargoPercent(stats.completedContracts, attempts)
      : clamp(stats.pallets * 12, 0, 100);
  const lossBase = stats.totalWeight + stats.lostWeight + stats.rejectedWeight;
  const lossRate = lossBase > 0 ? ((stats.lostWeight + stats.rejectedWeight) / lossBase) * 100 : 0;
  const safety = clamp(100 - lossRate - stats.overloads * 12 - stats.fragileBroken * 10, 0, 100);
  const efficiency = state.config.variant === "parcel_delivery"
    ? clamp((stats.parcelsDelivered / Math.max(1, stats.darts)) * 70, 0, 100)
    : clamp((stats.totalWeight / Math.max(1, stats.darts)) * 4.5, 0, 100);
  const rankScore = standing?.rank === 1 ? 100 : standing?.rank === 2 ? 82 : standing?.rank === 3 ? 68 : standing?.rank ? Math.max(35, 72 - standing.rank * 7) : 50;
  const rating = Math.round(clamp(precision * .22 + completion * .25 + safety * .22 + efficiency * .21 + rankScore * .10, 0, 100));
  const grade: CargoMissionGrade["grade"] = rating >= 90 ? "S" : rating >= 78 ? "A" : rating >= 64 ? "B" : rating >= 48 ? "C" : "D";
  const label = grade === "S" ? "Logistique d’élite" : grade === "A" ? "Mission maîtrisée" : grade === "B" ? "Transport solide" : grade === "C" ? "Chargement perfectible" : "Mission à reprendre";
  return {
    grade,
    label,
    rating,
    precision: Math.round(precision),
    completion: Math.round(completion),
    safety: Math.round(safety),
    efficiency: Math.round(efficiency),
  };
}

export function buildCargoMatchStats(state: CargoState): any {
  const rows = state.players.map((player) => ({ id: player.id, ...(state.statsByPlayer[player.id] || emptyPlayerStats()) }));
  const sum = (key: keyof CargoPlayerStats) => rows.reduce((total, row) => total + Number((row as any)?.[key] || 0), 0);
  const totalDarts = sum("darts");
  const totalHits = sum("hits");
  const totalWeight = sum("totalWeight");
  const totalParcels = sum("parcelsDelivered");
  const totalVisits = sum("visits");
  return {
    statisticsVersion: 2,
    telemetryVersion: 2,
    variant: state.config.variant,
    participantMode: state.config.participantMode,
    roundsPlayed: Math.min(state.config.rounds, state.roundIndex),
    configuredRounds: state.config.rounds,
    totalDarts,
    totalVisits,
    totalHits,
    singles: sum("singles"),
    doubles: sum("doubles"),
    triples: sum("triples"),
    bulls: sum("bulls"),
    dbulls: sum("dbulls"),
    misses: sum("misses"),
    accuracy: cargoPercent(totalHits, totalDarts),
    totalWeight,
    totalPallets: sum("pallets"),
    totalCartons: sum("cartons"),
    totalCrates: sum("crates"),
    totalFullPallets: sum("fullPallets"),
    totalContracts: sum("completedContracts"),
    failedContracts: sum("failedContracts"),
    fragileCompleted: sum("fragileCompleted"),
    fragileBroken: sum("fragileBroken"),
    urgentCompleted: sum("urgentCompleted"),
    lostWeight: sum("lostWeight"),
    rejectedWeight: sum("rejectedWeight"),
    overloads: sum("overloads"),
    perfectLoads: sum("perfectLoads"),
    bestPalletWeight: Math.max(0, ...rows.map((row) => Number(row.bestPalletWeight || 0))),
    longestSeries: Math.max(0, ...rows.map((row) => Number(row.longestSeries || 0))),
    totalParcels,
    totalParcelDeliveries: sum("parcelDeliveries"),
    totalParcelBonuses: sum("parcelBonuses"),
    routeStagesCompleted: Math.max(0, ...rows.map((row) => Number(row.routeStagesCompleted || 0))),
    avgWeightPerDart: totalDarts ? Math.round((totalWeight / totalDarts) * 100) / 100 : 0,
    avgWeightPerVisit: totalVisits ? Math.round((totalWeight / totalVisits) * 10) / 10 : 0,
    avgParcelsPerDart: totalDarts ? Math.round((totalParcels / totalDarts) * 100) / 100 : 0,
    durationMs: Math.max(0, Number(state.finishedAt || Date.now()) - state.startedAt),
  };
}
