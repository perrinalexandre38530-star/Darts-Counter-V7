// =============================================================
// OCEAN CONTROL — moteur pur V1
// Bataille navale aux fléchettes : flotte, sonar, frappes tactiques,
// bots, équipes, manches, reprise et télémétrie détaillée.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type OceanControlVariant = "classic" | "tactical";
export type OceanControlDifficulty = "recruit" | "captain" | "admiral";
export type OceanControlBotLevel = "easy" | "normal" | "hard";
export type OceanControlParticipantMode = "players" | "teams";
export type OceanControlPlacement = "automatic" | "manual";
export type OceanControlGridOrder = "sequential" | "random";
export type OceanControlFleetPreset = "quick" | "standard" | "armada";
export type OceanControlScoreInputMethod = "keypad" | "dartboard";
export type OceanControlPhase = "placement" | "playing" | "finished";
export type OceanControlOrientation = "horizontal" | "vertical";

export type OceanControlConfigPayload = {
  mode: "ocean_control";
  variant: OceanControlVariant;
  difficulty: OceanControlDifficulty;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: OceanControlBotLevel;
  participantMode: OceanControlParticipantMode;
  teamByPlayer?: Record<string, string>;
  placement: OceanControlPlacement;
  gridOrder: OceanControlGridOrder;
  fleetPreset: OceanControlFleetPreset;
  winsNeeded: 1 | 2 | 3;
  dartsPerTurn: 3;
  sonarEnabled: boolean;
  dbullStrikeEnabled: boolean;
  duplicateConsumesDart: boolean;
  randomOrder: boolean;
  scoreInputMethod: OceanControlScoreInputMethod;
};

export type OceanControlShip = {
  id: string;
  name: string;
  icon: string;
  length: number;
  cells: number[];
  hits: number[];
  sunk: boolean;
};

export type OceanControlFleetOwner = {
  id: string;
  name: string;
  memberIds: string[];
  ships: OceanControlShip[];
  attackedCells: Record<string, "miss" | "hit" | "sunk">;
  eliminated: boolean;
};

export type OceanControlPlayerStats = {
  darts: number;
  visits: number;
  validShots: number;
  duplicateShots: number;
  waterShots: number;
  shipHits: number;
  shipsSunk: number;
  sonarUses: number;
  sonarContacts: number;
  precisionStrikes: number;
  cellsAffected: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  wins: number;
  successfulVisits: number;
  perfectVisits: number;
  multiHitVisits: number;
  bestVisitHits: number;
  currentHitStreak: number;
  bestHitStreak: number;
  hitsBySegment: Record<string, number>;
  shotsBySegment: Record<string, number>;
};

export type OceanControlSonarScan = {
  id: string;
  battle: number;
  visit: number;
  playerId: string;
  targetOwnerId: string;
  focusNumber: number;
  centerCell: number;
  cells: number[];
  contactCount: number;
  createdAt: number;
};

export type OceanControlBattleResult = {
  battle: number;
  winnerOwnerId: string;
  winnerPlayerId: string;
  scoreByOwner: Record<string, number>;
  visits: number;
  darts: number;
  hits: number;
  shipsSunk: number;
  durationMs: number;
  finishedAt: number;
};

export type OceanControlEvent = {
  type: "miss" | "water" | "hit" | "sunk" | "duplicate" | "sonar" | "strike" | "battle_win";
  label: string;
  playerId: string;
  targetOwnerId?: string;
  number?: number;
  cell?: number;
  shipId?: string;
  shipName?: string;
  contactCount?: number;
  scanCells?: number[];
};

export type OceanControlVisit = {
  id: string;
  battle: number;
  round: number;
  visit: number;
  playerId: string;
  targetOwnerId: string | null;
  darts: GameDart[];
  labels: string[];
  events: OceanControlEvent[];
  createdAt: number;
};

export type OceanControlState = {
  mode: "ocean_control";
  config: OceanControlConfigPayload;
  players: Player[];
  owners: OceanControlFleetOwner[];
  playerOwnerId: Record<string, string>;
  gridNumbers: number[];
  activePlayerIndex: number;
  targetOwnerId: string | null;
  focusNumber: number | null;
  battleNumber: number;
  roundIndex: number;
  visitIndex: number;
  scoreByOwner: Record<string, number>;
  statsByPlayer: Record<string, OceanControlPlayerStats>;
  visits: OceanControlVisit[];
  sonarScans: OceanControlSonarScan[];
  battleHistory: OceanControlBattleResult[];
  phase: OceanControlPhase;
  placementOwnerIndex: number;
  winnerOwnerIds: string[];
  winnerPlayerIds: string[];
  startedAt: number;
  battleStartedAt: number;
  finishedAt: number | null;
};

const SHIP_PRESETS: Record<OceanControlFleetPreset, Array<{ name: string; icon: string; length: number }>> = {
  quick: [
    { name: "Patrouilleur", icon: "🚤", length: 2 },
    { name: "Sous-marin", icon: "🛥️", length: 2 },
    { name: "Destroyer", icon: "🚢", length: 3 },
  ],
  standard: [
    { name: "Patrouilleur", icon: "🚤", length: 2 },
    { name: "Sous-marin", icon: "🛥️", length: 3 },
    { name: "Destroyer", icon: "🚢", length: 3 },
    { name: "Croiseur", icon: "🛳️", length: 4 },
  ],
  armada: [
    { name: "Patrouilleur", icon: "🚤", length: 2 },
    { name: "Escorteur", icon: "⛴️", length: 2 },
    { name: "Sous-marin", icon: "🛥️", length: 3 },
    { name: "Destroyer", icon: "🚢", length: 3 },
    { name: "Croiseur", icon: "🛳️", length: 4 },
  ],
};

const clamp = (value: any, min: number, max: number) => Math.max(min, Math.min(max, Number(value) || min));
const unique = (values: any[]) => Array.from(new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean)));

export const OCEAN_CONTROL_VARIANT_LABELS: Record<OceanControlVariant, string> = {
  classic: "Bataille classique",
  tactical: "Commandement tactique",
};

export function oceanControlVariantLabel(value: any): string {
  return OCEAN_CONTROL_VARIANT_LABELS[value as OceanControlVariant] || OCEAN_CONTROL_VARIANT_LABELS.tactical;
}

export function oceanControlDifficultyLabel(value: any): string {
  return value === "recruit" ? "Recrue" : value === "admiral" ? "Amiral" : "Capitaine";
}

export function oceanControlFleetLabel(value: any): string {
  return value === "quick" ? "Escarmouche" : value === "armada" ? "Armada" : "Flotte standard";
}

export function oceanControlFleetTemplate(preset: OceanControlFleetPreset): OceanControlShip[] {
  return (SHIP_PRESETS[preset] || SHIP_PRESETS.quick).map((ship, index) => ({
    id: `${preset}-ship-${index + 1}`,
    name: ship.name,
    icon: ship.icon,
    length: ship.length,
    cells: [],
    hits: [],
    sunk: false,
  }));
}

export function normalizeOceanControlConfig(raw: Partial<OceanControlConfigPayload> | any = {}): OceanControlConfigPayload {
  const variant: OceanControlVariant = raw?.variant === "classic" ? "classic" : "tactical";
  const difficulty: OceanControlDifficulty = ["recruit", "captain", "admiral"].includes(raw?.difficulty) ? raw.difficulty : "captain";
  const participantMode: OceanControlParticipantMode = raw?.participantMode === "teams" ? "teams" : "players";
  const placement: OceanControlPlacement = raw?.placement === "manual" ? "manual" : "automatic";
  const gridOrder: OceanControlGridOrder = raw?.gridOrder === "random" ? "random" : "sequential";
  const fleetPreset: OceanControlFleetPreset = ["quick", "standard", "armada"].includes(raw?.fleetPreset) ? raw.fleetPreset : "quick";
  const botLevel: OceanControlBotLevel = raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal";
  const scoreInputMethod: OceanControlScoreInputMethod = raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad";
  const selectedIds = unique(raw?.selectedIds || []);
  const winsRaw = clamp(raw?.winsNeeded, 1, 3);
  const winsNeeded = (winsRaw >= 3 ? 3 : winsRaw >= 2 ? 2 : 1) as 1 | 2 | 3;
  return {
    mode: "ocean_control",
    variant,
    difficulty,
    players: clamp(raw?.players || selectedIds.length || 2, 1, 12),
    selectedIds,
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    playerDartSets: raw?.playerDartSets && typeof raw.playerDartSets === "object" ? raw.playerDartSets : {},
    botIds: unique(raw?.botIds || []),
    botsEnabled: Boolean(raw?.botsEnabled || (raw?.botIds || []).length),
    botLevel,
    participantMode,
    teamByPlayer: raw?.teamByPlayer && typeof raw.teamByPlayer === "object" ? raw.teamByPlayer : {},
    placement,
    gridOrder,
    fleetPreset,
    winsNeeded,
    dartsPerTurn: 3,
    sonarEnabled: raw?.sonarEnabled !== false,
    dbullStrikeEnabled: raw?.dbullStrikeEnabled !== false,
    duplicateConsumesDart: raw?.duplicateConsumesDart !== false,
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod,
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function emptyStats(): OceanControlPlayerStats {
  return {
    darts: 0, visits: 0, validShots: 0, duplicateShots: 0, waterShots: 0, shipHits: 0, shipsSunk: 0,
    sonarUses: 0, sonarContacts: 0, precisionStrikes: 0, cellsAffected: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0, wins: 0,
    successfulVisits: 0, perfectVisits: 0, multiHitVisits: 0, bestVisitHits: 0,
    currentHitStreak: 0, bestHitStreak: 0,
    hitsBySegment: {}, shotsBySegment: {},
  };
}

function normalizePlayerStats(raw: Partial<OceanControlPlayerStats> | null | undefined): OceanControlPlayerStats {
  const base = emptyStats();
  const out = { ...base, ...(raw || {}) } as OceanControlPlayerStats;
  out.hitsBySegment = raw?.hitsBySegment && typeof raw.hitsBySegment === "object" ? { ...raw.hitsBySegment } : {};
  out.shotsBySegment = raw?.shotsBySegment && typeof raw.shotsBySegment === "object" ? { ...raw.shotsBySegment } : {};
  for (const key of Object.keys(base) as Array<keyof OceanControlPlayerStats>) {
    if (key === "hitsBySegment" || key === "shotsBySegment") continue;
    (out as any)[key] = Number.isFinite(Number((out as any)[key])) ? Number((out as any)[key]) : 0;
  }
  return out;
}

function ownerDefinitions(players: Player[], config: OceanControlConfigPayload) {
  if (config.participantMode === "teams" && players.length > 1) {
    const byTeam = new Map<string, Player[]>();
    players.forEach((player, index) => {
      const team = String(config.teamByPlayer?.[player.id] || (index % 2 === 0 ? "ÉQUIPE A" : "ÉQUIPE B"));
      byTeam.set(team, [...(byTeam.get(team) || []), player]);
    });
    return Array.from(byTeam.entries()).map(([name, members], index) => ({ id: `team-${index + 1}`, name, memberIds: members.map((p) => p.id) }));
  }
  return players.map((player) => ({ id: `fleet-${player.id}`, name: player.name, memberIds: [player.id] }));
}

function candidateCells(start: number, length: number, orientation: OceanControlOrientation): number[] {
  const row = Math.floor(start / 5);
  const col = start % 5;
  if (orientation === "horizontal") {
    if (col + length > 5) return [];
    return Array.from({ length }, (_, i) => start + i);
  }
  if (row + length > 4) return [];
  return Array.from({ length }, (_, i) => start + i * 5);
}

function autoPlaceShips(ships: OceanControlShip[], rng: () => number): OceanControlShip[] {
  const occupied = new Set<number>();
  return ships.map((ship) => {
    let cells: number[] = [];
    for (let attempt = 0; attempt < 400 && !cells.length; attempt += 1) {
      const orientation: OceanControlOrientation = rng() > 0.5 ? "horizontal" : "vertical";
      const start = Math.floor(rng() * 20);
      const candidate = candidateCells(start, ship.length, orientation);
      if (candidate.length === ship.length && candidate.every((cell) => !occupied.has(cell))) cells = candidate;
    }
    if (!cells.length) {
      for (let start = 0; start < 20 && !cells.length; start += 1) {
        for (const orientation of ["horizontal", "vertical"] as OceanControlOrientation[]) {
          const candidate = candidateCells(start, ship.length, orientation);
          if (candidate.length === ship.length && candidate.every((cell) => !occupied.has(cell))) { cells = candidate; break; }
        }
      }
    }
    cells.forEach((cell) => occupied.add(cell));
    return { ...ship, cells, hits: [], sunk: false };
  });
}

function rebuildBattle(state: OceanControlState, rng: () => number): OceanControlState {
  state.owners = state.owners.map((owner) => ({
    ...owner,
    ships: state.config.placement === "automatic" ? autoPlaceShips(oceanControlFleetTemplate(state.config.fleetPreset), rng) : oceanControlFleetTemplate(state.config.fleetPreset),
    attackedCells: {},
    eliminated: false,
  }));
  state.phase = state.config.placement === "manual" ? "placement" : "playing";
  state.placementOwnerIndex = 0;
  state.sonarScans = [];
  state.battleStartedAt = Date.now();
  state.targetOwnerId = defaultTargetOwnerId(state, state.players[state.activePlayerIndex]?.id);
  state.focusNumber = state.gridNumbers[0] || 1;
  return state;
}

export function createOceanControlState(playersInput: Player[], configInput: OceanControlConfigPayload, rng: () => number = Math.random): OceanControlState {
  const config = normalizeOceanControlConfig(configInput);
  const players = (playersInput || []).map((player, index) => ({ id: String(player?.id || `p${index + 1}`), name: String(player?.name || `Joueur ${index + 1}`) }));
  const orderedPlayers = config.randomOrder ? shuffle(players, rng) : players;
  const defs = ownerDefinitions(orderedPlayers, config);
  const playerOwnerId: Record<string, string> = {};
  defs.forEach((owner) => owner.memberIds.forEach((id) => { playerOwnerId[id] = owner.id; }));
  const owners: OceanControlFleetOwner[] = defs.map((owner) => ({ ...owner, ships: oceanControlFleetTemplate(config.fleetPreset), attackedCells: {}, eliminated: false }));
  const gridNumbers = config.gridOrder === "random" ? shuffle(Array.from({ length: 20 }, (_, i) => i + 1), rng) : Array.from({ length: 20 }, (_, i) => i + 1);
  const scoreByOwner = Object.fromEntries(owners.map((owner) => [owner.id, 0]));
  const statsByPlayer = Object.fromEntries(orderedPlayers.map((player) => [player.id, emptyStats()]));
  const state: OceanControlState = {
    mode: "ocean_control", config, players: orderedPlayers, owners, playerOwnerId, gridNumbers,
    activePlayerIndex: 0, targetOwnerId: null, focusNumber: gridNumbers[0] || 1,
    battleNumber: 1, roundIndex: 1, visitIndex: 0, scoreByOwner, statsByPlayer, visits: [], sonarScans: [], battleHistory: [],
    phase: config.placement === "manual" ? "placement" : "playing", placementOwnerIndex: 0,
    winnerOwnerIds: [], winnerPlayerIds: [], startedAt: Date.now(), battleStartedAt: Date.now(), finishedAt: null,
  };
  return rebuildBattle(state, rng);
}

export function cloneOceanControlState(state: OceanControlState): OceanControlState {
  const cloned = JSON.parse(JSON.stringify(state)) as OceanControlState;
  cloned.sonarScans = Array.isArray(cloned.sonarScans) ? cloned.sonarScans : [];
  cloned.battleHistory = Array.isArray(cloned.battleHistory) ? cloned.battleHistory : [];
  cloned.battleStartedAt = Number(cloned.battleStartedAt || cloned.startedAt || Date.now());
  cloned.statsByPlayer = Object.fromEntries(Object.entries(cloned.statsByPlayer || {}).map(([id, stats]) => [id, normalizePlayerStats(stats)]));
  return cloned;
}

export function getOceanActivePlayer(state: OceanControlState): Player | null {
  return state.players[state.activePlayerIndex] || null;
}

export function getOceanOwnerForPlayer(state: OceanControlState, playerId: string): OceanControlFleetOwner | null {
  const ownerId = state.playerOwnerId[String(playerId)] || "";
  return state.owners.find((owner) => owner.id === ownerId) || null;
}

export function getOceanTargetOwner(state: OceanControlState): OceanControlFleetOwner | null {
  return state.owners.find((owner) => owner.id === state.targetOwnerId) || null;
}

export function getOceanPlacementOwner(state: OceanControlState): OceanControlFleetOwner | null {
  return state.owners[state.placementOwnerIndex] || null;
}

export function getOceanNextUnplacedShip(state: OceanControlState): OceanControlShip | null {
  return getOceanPlacementOwner(state)?.ships.find((ship) => !ship.cells.length) || null;
}

export function placeOceanControlShip(stateInput: OceanControlState, startCell: number, orientation: OceanControlOrientation): OceanControlState {
  const state = cloneOceanControlState(stateInput);
  if (state.phase !== "placement") return state;
  const owner = getOceanPlacementOwner(state);
  const ship = owner?.ships.find((row) => !row.cells.length);
  if (!owner || !ship) return state;
  const candidate = candidateCells(Number(startCell), ship.length, orientation);
  const occupied = new Set(owner.ships.flatMap((row) => row.cells));
  if (candidate.length !== ship.length || candidate.some((cell) => occupied.has(cell))) return state;
  ship.cells = candidate;
  if (owner.ships.every((row) => row.cells.length === row.length)) {
    if (state.placementOwnerIndex < state.owners.length - 1) state.placementOwnerIndex += 1;
    else {
      state.phase = "playing";
      state.targetOwnerId = defaultTargetOwnerId(state, state.players[state.activePlayerIndex]?.id);
    }
  }
  return state;
}

export function resetOceanPlacementOwner(stateInput: OceanControlState): OceanControlState {
  const state = cloneOceanControlState(stateInput);
  const owner = getOceanPlacementOwner(state);
  if (owner) owner.ships = oceanControlFleetTemplate(state.config.fleetPreset);
  return state;
}

function ownerAlive(state: OceanControlState, ownerId: string) {
  const owner = state.owners.find((row) => row.id === ownerId);
  return Boolean(owner && !owner.eliminated);
}

function defaultTargetOwnerId(state: OceanControlState, playerId?: string): string | null {
  const ownId = state.playerOwnerId[String(playerId || "")] || "";
  const candidates = state.owners.filter((owner) => owner.id !== ownId && !owner.eliminated);
  if (!candidates.length) return null;
  const current = candidates.find((owner) => owner.id === state.targetOwnerId);
  return current?.id || candidates[0].id;
}

export function selectOceanControlTarget(stateInput: OceanControlState, ownerId: string): OceanControlState {
  const state = cloneOceanControlState(stateInput);
  const active = getOceanActivePlayer(state);
  const ownId = active ? state.playerOwnerId[active.id] : "";
  if (ownerId !== ownId && ownerAlive(state, ownerId)) state.targetOwnerId = ownerId;
  return state;
}

export function selectOceanControlFocus(stateInput: OceanControlState, number: number | null): OceanControlState {
  const state = cloneOceanControlState(stateInput);
  if (number == null || state.gridNumbers.includes(Number(number))) state.focusNumber = number == null ? null : Number(number);
  return state;
}

function labelDart(dart: GameDart) {
  if (dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number}`;
}

function cellForNumber(state: OceanControlState, number: number): number {
  return state.gridNumbers.indexOf(number);
}

function numberForCell(state: OceanControlState, cell: number): number {
  return state.gridNumbers[cell] || 0;
}

function neighbors(cell: number): number[] {
  const row = Math.floor(cell / 5), col = cell % 5;
  const out = [cell];
  if (row > 0) out.push(cell - 5);
  if (row < 3) out.push(cell + 5);
  if (col > 0) out.push(cell - 1);
  if (col < 4) out.push(cell + 1);
  return out;
}

function tacticalCells(cell: number, bed: GameDart["bed"]): number[] {
  if (bed === "S") return [cell];
  const row = Math.floor(cell / 5), col = cell % 5;
  if (bed === "D") {
    if (col < 4) return [cell, cell + 1];
    if (col > 0) return [cell, cell - 1];
    return [cell];
  }
  if (bed === "T") {
    const rowStart = row * 5;
    const candidates = col <= 2 ? [cell, cell + 1, cell + 2] : [cell - 2, cell - 1, cell];
    return candidates.filter((value) => value >= rowStart && value < rowStart + 5);
  }
  return [cell];
}

function shipAt(owner: OceanControlFleetOwner, cell: number): OceanControlShip | null {
  return owner.ships.find((ship) => ship.cells.includes(cell)) || null;
}

function markShipSunk(owner: OceanControlFleetOwner, ship: OceanControlShip) {
  ship.sunk = ship.cells.every((cell) => ship.hits.includes(cell));
  if (ship.sunk) ship.cells.forEach((cell) => { owner.attackedCells[String(cell)] = "sunk"; });
}

function recordDartType(stats: OceanControlPlayerStats, dart: GameDart) {
  stats.darts += 1;
  if (dart.bed === "MISS") stats.misses += 1;
  else if (dart.bed === "OB") stats.bulls += 1;
  else if (dart.bed === "IB") stats.dbulls += 1;
  else if (dart.bed === "D") stats.doubles += 1;
  else if (dart.bed === "T") stats.triples += 1;
  else stats.singles += 1;
}

function attackCell(state: OceanControlState, owner: OceanControlFleetOwner, cell: number, playerId: string, events: OceanControlEvent[]) {
  const stats = state.statsByPlayer[playerId] || (state.statsByPlayer[playerId] = normalizePlayerStats(null));
  if (cell < 0 || cell >= 20) return;
  const number = numberForCell(state, cell);
  stats.cellsAffected += 1;
  stats.shotsBySegment[String(number)] = (stats.shotsBySegment[String(number)] || 0) + 1;
  if (owner.attackedCells[String(cell)]) {
    stats.duplicateShots += 1;
    stats.currentHitStreak = 0;
    events.push({ type: "duplicate", label: `${number} déjà contrôlé`, playerId, targetOwnerId: owner.id, number, cell });
    return;
  }
  stats.validShots += 1;
  const ship = shipAt(owner, cell);
  if (!ship) {
    owner.attackedCells[String(cell)] = "miss";
    stats.waterShots += 1;
    stats.currentHitStreak = 0;
    events.push({ type: "water", label: `${number} · À L’EAU`, playerId, targetOwnerId: owner.id, number, cell });
    return;
  }
  owner.attackedCells[String(cell)] = "hit";
  if (!ship.hits.includes(cell)) ship.hits.push(cell);
  stats.shipHits += 1;
  stats.currentHitStreak += 1;
  stats.bestHitStreak = Math.max(stats.bestHitStreak, stats.currentHitStreak);
  stats.hitsBySegment[String(number)] = (stats.hitsBySegment[String(number)] || 0) + 1;
  const wasSunk = ship.sunk;
  markShipSunk(owner, ship);
  if (ship.sunk && !wasSunk) {
    stats.shipsSunk += 1;
    events.push({ type: "sunk", label: `${ship.name.toUpperCase()} COULÉ`, playerId, targetOwnerId: owner.id, number, cell, shipId: ship.id, shipName: ship.name });
  } else {
    events.push({ type: "hit", label: `${number} · TOUCHÉ`, playerId, targetOwnerId: owner.id, number, cell, shipId: ship.id, shipName: ship.name });
  }
  owner.eliminated = owner.ships.every((row) => row.sunk);
}

function resolveSonar(state: OceanControlState, owner: OceanControlFleetOwner, playerId: string, events: OceanControlEvent[]) {
  const stats = state.statsByPlayer[playerId] || (state.statsByPlayer[playerId] = normalizePlayerStats(null));
  stats.sonarUses += 1;
  const focusNumber = state.focusNumber && state.gridNumbers.includes(state.focusNumber) ? state.focusNumber : state.gridNumbers.find((number) => !owner.attackedCells[String(cellForNumber(state, number))]) || state.gridNumbers[0];
  const focusCell = cellForNumber(state, Number(focusNumber));
  const area = neighbors(focusCell);
  const contacts = area.filter((cell) => {
    const ship = shipAt(owner, cell);
    return Boolean(ship && !ship.hits.includes(cell));
  }).length;
  stats.sonarContacts += contacts;
  const scan: OceanControlSonarScan = {
    id: `sonar-${state.battleNumber}-${state.visitIndex + 1}-${Date.now()}`,
    battle: state.battleNumber,
    visit: state.visitIndex + 1,
    playerId,
    targetOwnerId: owner.id,
    focusNumber: Number(focusNumber),
    centerCell: focusCell,
    cells: area,
    contactCount: contacts,
    createdAt: Date.now(),
  };
  state.sonarScans = [...(state.sonarScans || []), scan].slice(-24);
  events.push({ type: "sonar", label: contacts ? `SONAR ${focusNumber} · ${contacts} contact${contacts > 1 ? "s" : ""}` : `SONAR ${focusNumber} · ZONE CLAIRE`, playerId, targetOwnerId: owner.id, number: Number(focusNumber), cell: focusCell, contactCount: contacts, scanCells: area });
}

function resolvePrecisionStrike(state: OceanControlState, owner: OceanControlFleetOwner, playerId: string, events: OceanControlEvent[]) {
  const stats = state.statsByPlayer[playerId] || (state.statsByPlayer[playerId] = normalizePlayerStats(null));
  stats.precisionStrikes += 1;
  let cell = state.focusNumber ? cellForNumber(state, state.focusNumber) : -1;
  if (cell < 0 || owner.attackedCells[String(cell)]) {
    const unknownShipCell = owner.ships.flatMap((ship) => ship.cells).find((candidate) => !owner.attackedCells[String(candidate)]);
    const unknownCell = Array.from({ length: 20 }, (_, i) => i).find((candidate) => !owner.attackedCells[String(candidate)]);
    cell = unknownShipCell ?? unknownCell ?? 0;
  }
  events.push({ type: "strike", label: `FRAPPE DE PRÉCISION · ${numberForCell(state, cell)}`, playerId, targetOwnerId: owner.id, number: numberForCell(state, cell), cell });
  attackCell(state, owner, cell, playerId, events);
}

function activeOwnerCount(state: OceanControlState) {
  return state.owners.filter((owner) => !owner.eliminated).length;
}

function completeBattle(state: OceanControlState, winningOwner: OceanControlFleetOwner, playerId: string, events: OceanControlEvent[]) {
  state.scoreByOwner[winningOwner.id] = (state.scoreByOwner[winningOwner.id] || 0) + 1;
  state.statsByPlayer[playerId].wins += 1;
  events.push({ type: "battle_win", label: `${winningOwner.name.toUpperCase()} CONTRÔLE L’OCÉAN`, playerId, targetOwnerId: winningOwner.id });
  const battleVisits = state.visits.filter((visit) => visit.battle === state.battleNumber);
  const battleEvents = battleVisits.flatMap((visit) => visit.events || []);
  const finishedAt = Date.now();
  state.battleHistory = [...(state.battleHistory || []), {
    battle: state.battleNumber,
    winnerOwnerId: winningOwner.id,
    winnerPlayerId: playerId,
    scoreByOwner: { ...state.scoreByOwner },
    visits: battleVisits.length,
    darts: battleVisits.reduce((sum, visit) => sum + (visit.darts?.length || 0), 0),
    hits: battleEvents.filter((event) => event.type === "hit" || event.type === "sunk").length,
    shipsSunk: battleEvents.filter((event) => event.type === "sunk").length,
    durationMs: Math.max(0, finishedAt - Number(state.battleStartedAt || state.startedAt || finishedAt)),
    finishedAt,
  }];
  if (state.scoreByOwner[winningOwner.id] >= state.config.winsNeeded) {
    state.phase = "finished";
    state.finishedAt = finishedAt;
    state.winnerOwnerIds = [winningOwner.id];
    state.winnerPlayerIds = [...winningOwner.memberIds];
    return;
  }
  state.battleNumber += 1;
  rebuildBattle(state, Math.random);
}

function advanceTurn(state: OceanControlState) {
  if (state.phase !== "playing") return;
  const previousIndex = state.activePlayerIndex;
  let nextIndex = previousIndex;
  for (let i = 0; i < state.players.length; i += 1) {
    nextIndex = (nextIndex + 1) % state.players.length;
    const candidate = state.players[nextIndex];
    const ownerId = state.playerOwnerId[candidate.id];
    if (ownerAlive(state, ownerId)) break;
  }
  state.activePlayerIndex = nextIndex;
  if (nextIndex <= previousIndex) state.roundIndex += 1;
  const player = getOceanActivePlayer(state);
  state.targetOwnerId = defaultTargetOwnerId(state, player?.id);
}

export function playOceanControlVisit(stateInput: OceanControlState, dartsInput: GameDart[]): OceanControlState {
  const state = cloneOceanControlState(stateInput);
  if (state.phase !== "playing") return state;
  const player = getOceanActivePlayer(state);
  if (!player) return state;
  state.targetOwnerId = defaultTargetOwnerId(state, player.id);
  const owner = getOceanTargetOwner(state);
  if (!owner) return state;
  const darts = (dartsInput || []).slice(0, state.config.dartsPerTurn);
  const stats = state.statsByPlayer[player.id] = normalizePlayerStats(state.statsByPlayer[player.id]);
  const events: OceanControlEvent[] = [];
  const labels = darts.map(labelDart);
  stats.visits += 1;
  for (const dart of darts) {
    recordDartType(stats, dart);
    if (dart.bed === "MISS") {
      stats.currentHitStreak = 0;
      events.push({ type: "miss", label: "MISS · TIR PERDU", playerId: player.id, targetOwnerId: owner.id });
      continue;
    }
    if (dart.bed === "OB") {
      if (state.config.sonarEnabled) resolveSonar(state, owner, player.id, events);
      else events.push({ type: "miss", label: "BULL SANS EFFET", playerId: player.id, targetOwnerId: owner.id });
      continue;
    }
    if (dart.bed === "IB") {
      if (state.config.dbullStrikeEnabled) resolvePrecisionStrike(state, owner, player.id, events);
      else resolveSonar(state, owner, player.id, events);
      if (owner.eliminated) break;
      continue;
    }
    const number = Number(dart.number || 0);
    const cell = cellForNumber(state, number);
    if (cell < 0) {
      events.push({ type: "miss", label: `${labelDart(dart)} · HORS GRILLE`, playerId: player.id, targetOwnerId: owner.id });
      continue;
    }
    const affected = state.config.variant === "tactical" ? tacticalCells(cell, dart.bed) : [cell];
    for (const affectedCell of affected) attackCell(state, owner, affectedCell, player.id, events);
    if (owner.eliminated) break;
  }
  state.visitIndex += 1;
  const visitHits = events.filter((event) => event.type === "hit" || event.type === "sunk").length;
  const visitFailures = events.filter((event) => event.type === "water" || event.type === "duplicate" || event.type === "miss").length;
  if (visitHits > 0) stats.successfulVisits += 1;
  if (visitHits > 1) stats.multiHitVisits += 1;
  if (visitHits > 0 && visitFailures === 0) stats.perfectVisits += 1;
  stats.bestVisitHits = Math.max(stats.bestVisitHits, visitHits);
  state.visits.push({ id: `ocean-visit-${state.battleNumber}-${state.visitIndex}-${Date.now()}`, battle: state.battleNumber, round: state.roundIndex, visit: state.visitIndex, playerId: player.id, targetOwnerId: owner.id, darts, labels, events, createdAt: Date.now() });

  if (owner.eliminated || activeOwnerCount(state) <= 1) {
    const winningOwner = state.owners.find((row) => !row.eliminated) || getOceanOwnerForPlayer(state, player.id);
    if (winningOwner) completeBattle(state, winningOwner, player.id, events);
  }
  if (state.phase === "playing") advanceTurn(state);
  return state;
}

export function oceanControlRemainingDecks(owner: OceanControlFleetOwner | null): number {
  return owner ? owner.ships.filter((ship) => !ship.sunk).length : 0;
}

export function oceanControlRemainingCells(owner: OceanControlFleetOwner | null): number {
  return owner ? owner.ships.reduce((sum, ship) => sum + ship.cells.filter((cell) => !ship.hits.includes(cell)).length, 0) : 0;
}

export function oceanControlAccuracy(stats: Partial<OceanControlPlayerStats> | null | undefined): number {
  const valid = Number(stats?.validShots || 0);
  return valid > 0 ? Math.round((Number(stats?.shipHits || 0) / valid) * 1000) / 10 : 0;
}

export function oceanControlTacticalHint(state: OceanControlState): string {
  const target = getOceanTargetOwner(state);
  if (!target) return "Aucune flotte ennemie disponible.";
  const recentHits = Object.entries(target.attackedCells).filter(([, status]) => status === "hit").map(([cell]) => Number(cell));
  for (const cell of recentHits) {
    const unknown = neighbors(cell).find((candidate) => !target.attackedCells[String(candidate)]);
    if (unknown != null) return `Poursuis le contact autour du secteur ${numberForCell(state, unknown)}.`;
  }
  const unknownNumber = state.gridNumbers.find((number) => !target.attackedCells[String(cellForNumber(state, number))]);
  return unknownNumber ? `Balaye la zone ${unknownNumber} ou utilise le Bull pour le sonar.` : "Toutes les zones ont été contrôlées.";
}

export function oceanControlLatestSonarScan(state: OceanControlState, ownerId?: string | null): OceanControlSonarScan | null {
  const scans = Array.isArray(state?.sonarScans) ? state.sonarScans : [];
  const filtered = ownerId ? scans.filter((scan) => scan.targetOwnerId === ownerId) : scans;
  return filtered.length ? filtered[filtered.length - 1] : null;
}

function targetCandidates(state: OceanControlState, owner: OceanControlFleetOwner): number[] {
  return state.gridNumbers.filter((number) => !owner.attackedCells[String(cellForNumber(state, number))]);
}

export function pickOceanControlBotDarts(state: OceanControlState, levelInput?: OceanControlBotLevel): { darts: GameDart[]; focusNumber: number | null } {
  const level = levelInput || state.config.botLevel;
  const target = getOceanTargetOwner(state) || state.owners.find((owner) => !owner.eliminated && owner.id !== state.playerOwnerId[getOceanActivePlayer(state)?.id || ""]);
  if (!target) return { darts: [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }], focusNumber: null };
  const candidates = targetCandidates(state, target);
  const liveCells = target.ships.flatMap((ship) => ship.cells.filter((cell) => !ship.hits.includes(cell) && !target.attackedCells[String(cell)]));
  const woundedNeighbors = target.ships.flatMap((ship) => ship.hits.flatMap(neighbors)).filter((cell) => !target.attackedCells[String(cell)]);
  const missRate = level === "easy" ? 0.35 : level === "hard" ? 0.08 : 0.18;
  const smartRate = level === "hard" ? 0.68 : level === "normal" ? 0.35 : 0.08;
  const darts: GameDart[] = [];
  let focusNumber: number | null = null;
  for (let i = 0; i < 3; i += 1) {
    if (Math.random() < missRate) { darts.push({ bed: "MISS" }); continue; }
    if (state.config.sonarEnabled && i === 0 && Math.random() < (level === "easy" ? 0.12 : 0.20)) {
      const focusCell = woundedNeighbors[0] ?? Math.floor(Math.random() * 20);
      focusNumber = numberForCell(state, focusCell);
      darts.push({ bed: "OB" });
      continue;
    }
    let cell: number | undefined;
    if (woundedNeighbors.length) cell = woundedNeighbors[Math.floor(Math.random() * woundedNeighbors.length)];
    else if (Math.random() < smartRate && liveCells.length) cell = liveCells[Math.floor(Math.random() * liveCells.length)];
    else if (candidates.length) cell = cellForNumber(state, candidates[Math.floor(Math.random() * candidates.length)]);
    if (cell == null || cell < 0) { darts.push({ bed: "MISS" }); continue; }
    const bed: GameDart["bed"] = state.config.variant === "tactical" ? (Math.random() < 0.18 ? "T" : Math.random() < 0.32 ? "D" : "S") : "S";
    darts.push({ bed, number: numberForCell(state, cell) });
  }
  return { darts, focusNumber };
}

export function buildOceanControlMatchStats(state: OceanControlState) {
  const rows = Object.values(state.statsByPlayer || {});
  return {
    battles: state.battleNumber,
    totalDarts: rows.reduce((sum, row) => sum + Number(row.darts || 0), 0),
    totalHits: rows.reduce((sum, row) => sum + Number(row.shipHits || 0), 0),
    shipsSunk: rows.reduce((sum, row) => sum + Number(row.shipsSunk || 0), 0),
    sonarUses: rows.reduce((sum, row) => sum + Number(row.sonarUses || 0), 0),
    precisionStrikes: rows.reduce((sum, row) => sum + Number(row.precisionStrikes || 0), 0),
    successfulVisits: rows.reduce((sum, row) => sum + Number(row.successfulVisits || 0), 0),
    perfectVisits: rows.reduce((sum, row) => sum + Number(row.perfectVisits || 0), 0),
    multiHitVisits: rows.reduce((sum, row) => sum + Number(row.multiHitVisits || 0), 0),
    bestHitStreak: rows.reduce((best, row) => Math.max(best, Number(row.bestHitStreak || 0)), 0),
    bestVisitHits: rows.reduce((best, row) => Math.max(best, Number(row.bestVisitHits || 0)), 0),
    sonarScans: state.sonarScans?.length || 0,
    battleHistory: state.battleHistory || [],
    visits: state.visits.length,
  };
}
