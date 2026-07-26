// =============================================================
// DARTS RACER — moteur pur
// Course arcade pilotée par les impacts de fléchettes.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type DartsRacerParticipantMode = "players" | "teams";
export type DartsRacerScoreInputMethod = "keypad" | "dartboard";
export type DartsRacerStyle = "sprint" | "arcade" | "chaos";
export type DartsRacerBotLevel = "easy" | "normal" | "hard";
export type DartsRacerSpecialCellType = "boost" | "attack" | "shield" | "hazard";

export type DartsRacerTeamConfig = {
  id: string;
  name: string;
  color?: string | null;
  logoDataUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

export type DartsRacerConfigPayload = {
  mode: "darts_racer";
  participantMode: DartsRacerParticipantMode;
  players: number;
  selectedIds: string[];
  playersList?: any[];
  teamConfigs?: DartsRacerTeamConfig[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: DartsRacerBotLevel;
  trackLength: 30 | 40 | 50 | 60;
  laps: 1 | 2 | 3;
  raceStyle: DartsRacerStyle;
  specialCells: boolean;
  collisions: boolean;
  maxRounds: number;
  randomOrder: boolean;
  scoreInputMethod: DartsRacerScoreInputMethod;
};

export type DartsRacerRules = Pick<
  DartsRacerConfigPayload,
  "participantMode" | "trackLength" | "laps" | "raceStyle" | "specialCells" | "collisions" | "maxRounds"
>;

export type DartsRacerSpecialCell = {
  position: number;
  lap: number;
  localPosition: number;
  type: DartsRacerSpecialCellType;
};

export type DartsRacerSpecialEvent = {
  type: DartsRacerSpecialCellType | "collision";
  position: number;
  delta: number;
  targetEntityId?: string | null;
  shielded?: boolean;
  label: string;
};

export type DartsRacerPlayerStats = {
  darts: number;
  visits: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  baseDistance: number;
  bonusDistance: number;
  penaltyDistance: number;
  netDistance: number;
  bestVisitDistance: number;
  maxPosition: number;
  boosts: number;
  miniBoosts: number;
  turboHits: number;
  hyperTurboHits: number;
  specialBoosts: number;
  attackPickups: number;
  attacksLanded: number;
  attackDistance: number;
  shieldsPicked: number;
  shieldsUsed: number;
  hazards: number;
  hazardDistance: number;
  collisions: number;
  collisionDistance: number;
  leadVisits: number;
  lapsCompleted: number;
  finishVisit: number | null;
};

export type DartsRacerEntityProgress = {
  id: string;
  name: string;
  playerIds: string[];
  position: number;
  shield: number;
  completed: boolean;
  completedAtVisit: number | null;
  finishDarts: number | null;
};

export type DartsRacerVisit = {
  id: string;
  createdAt: string;
  round: number;
  playerId: string;
  teamId: string | null;
  entityId: string;
  darts: GameDart[];
  labels: string[];
  positionBefore: number;
  positionAfter: number;
  baseDistance: number;
  bonusDistance: number;
  penaltyDistance: number;
  netDistance: number;
  lapBefore: number;
  lapAfter: number;
  shieldBefore: number;
  shieldAfter: number;
  specialEvents: DartsRacerSpecialEvent[];
  completed: boolean;
};

export type DartsRacerStanding = {
  id: string;
  name: string;
  playerIds: string[];
  rank: number;
  tied: boolean;
  position: number;
  distanceToFinish: number;
  progressPct: number;
  lap: number;
  localPosition: number;
  shield: number;
  completed: boolean;
  visits: number;
  darts: number;
  netDistance: number;
};

export type DartsRacerState = {
  sport: "darts";
  mode: "darts_racer";
  rules: DartsRacerRules;
  players: Player[];
  teams: DartsRacerTeamConfig[];
  teamByPlayer: Record<string, string | null>;
  entityByPlayer: Record<string, string>;
  turnOrder: string[];
  activePlayerIndex: number;
  roundIndex: number;
  totalDistance: number;
  specialCells: DartsRacerSpecialCell[];
  entities: Record<string, DartsRacerEntityProgress>;
  statsByPlayer: Record<string, DartsRacerPlayerStats>;
  history: DartsRacerVisit[];
  standings: DartsRacerStanding[];
  winnerIds: string[];
  tied: boolean;
  finished: boolean;
  finishReason: "finish_line" | "round_limit" | null;
  startedAt: number;
  finishedAt?: number;
  leadChanges: number;
  lastLeaderId: string | null;
};

function clampInt(value: any, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function normalizePlayers(input: Player[]): Player[] {
  const seen = new Set<string>();
  const out: Player[] = [];
  (input || []).forEach((raw: any, index) => {
    const id = String(raw?.id || raw?.profileId || `p${index + 1}`).trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, name: String(raw?.name || raw?.displayName || `Joueur ${index + 1}`) });
  });
  return out.length ? out : [{ id: "p1", name: "Joueur 1" }];
}

function normalizeTeams(players: Player[], input: DartsRacerTeamConfig[]): DartsRacerTeamConfig[] {
  const valid = new Set(players.map((p) => p.id));
  const used = new Set<string>();
  return (input || []).map((raw: any, index) => {
    const ids: string[] = Array.from(new Set<string>((Array.isArray(raw?.playerIds) ? raw.playerIds : []).map((id: any) => String(id))))
      .filter((id: string) => valid.has(id) && !used.has(id));
    ids.forEach((id) => used.add(id));
    return {
      id: String(raw?.id || `team-${index + 1}`),
      name: String(raw?.name || `Équipe ${index + 1}`),
      color: raw?.color || null,
      logoDataUrl: raw?.logoDataUrl || raw?.logoUrl || null,
      playerIds: ids,
      isBotTeam: Boolean(raw?.isBotTeam),
    };
  }).filter((team) => team.playerIds.length > 0);
}

export function emptyDartsRacerStats(): DartsRacerPlayerStats {
  return {
    darts: 0, visits: 0, hits: 0, singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    baseDistance: 0, bonusDistance: 0, penaltyDistance: 0, netDistance: 0, bestVisitDistance: 0, maxPosition: 0,
    boosts: 0, miniBoosts: 0, turboHits: 0, hyperTurboHits: 0, specialBoosts: 0,
    attackPickups: 0, attacksLanded: 0, attackDistance: 0,
    shieldsPicked: 0, shieldsUsed: 0, hazards: 0, hazardDistance: 0,
    collisions: 0, collisionDistance: 0, leadVisits: 0, lapsCompleted: 0, finishVisit: null,
  };
}

export function dartsRacerDartLabel(dart: GameDart) {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number || ""}`;
}

export function dartsRacerDartDistance(dart: GameDart) {
  if (!dart || dart.bed === "MISS") return 0;
  if (dart.bed === "IB") return 5;
  if (dart.bed === "OB") return 4;
  if (dart.bed === "T") return 3;
  if (dart.bed === "D") return 2;
  return 1;
}

function entityMaps(players: Player[], teams: DartsRacerTeamConfig[], participantMode: DartsRacerParticipantMode) {
  const teamByPlayer: Record<string, string | null> = Object.fromEntries(players.map((p) => [p.id, null]));
  teams.forEach((team) => team.playerIds.forEach((id) => { if (id in teamByPlayer) teamByPlayer[id] = team.id; }));
  const entityByPlayer: Record<string, string> = {};
  players.forEach((p) => { entityByPlayer[p.id] = participantMode === "teams" && teamByPlayer[p.id] ? String(teamByPlayer[p.id]) : p.id; });
  return { teamByPlayer, entityByPlayer };
}

function createEntities(players: Player[], teams: DartsRacerTeamConfig[], participantMode: DartsRacerParticipantMode, entityByPlayer: Record<string, string>) {
  const entities: Record<string, DartsRacerEntityProgress> = {};
  if (participantMode === "teams") {
    teams.forEach((team) => {
      entities[team.id] = { id: team.id, name: team.name, playerIds: [...team.playerIds], position: 0, shield: 0, completed: false, completedAtVisit: null, finishDarts: null };
    });
  }
  players.forEach((player) => {
    const eid = entityByPlayer[player.id];
    if (!entities[eid]) entities[eid] = { id: eid, name: player.name, playerIds: [player.id], position: 0, shield: 0, completed: false, completedAtVisit: null, finishDarts: null };
  });
  return entities;
}

function uniqueCell(out: DartsRacerSpecialCell[], cell: DartsRacerSpecialCell) {
  if (cell.position <= 1 || out.some((c) => c.position === cell.position)) return;
  out.push(cell);
}

export function buildDartsRacerSpecialCells(rules: Pick<DartsRacerRules, "trackLength" | "laps" | "raceStyle" | "specialCells">): DartsRacerSpecialCell[] {
  if (!rules.specialCells || rules.raceStyle === "sprint") return [];
  const patterns: Array<[number, DartsRacerSpecialCellType]> = rules.raceStyle === "chaos"
    ? [[.12,"boost"],[.22,"attack"],[.31,"hazard"],[.40,"shield"],[.52,"attack"],[.64,"boost"],[.73,"hazard"],[.84,"attack"],[.93,"boost"]]
    : [[.16,"boost"],[.30,"shield"],[.44,"attack"],[.58,"hazard"],[.74,"boost"],[.88,"attack"]];
  const out: DartsRacerSpecialCell[] = [];
  for (let lap = 0; lap < rules.laps; lap += 1) {
    for (const [ratio, type] of patterns) {
      const localPosition = Math.max(2, Math.min(rules.trackLength - 1, Math.round(rules.trackLength * ratio)));
      const position = lap * rules.trackLength + localPosition;
      if (position >= rules.trackLength * rules.laps) continue;
      uniqueCell(out, { position, lap: lap + 1, localPosition, type });
    }
  }
  return out.sort((a, b) => a.position - b.position);
}

function aggregateEntityStats(state: DartsRacerState, entity: DartsRacerEntityProgress) {
  const rows = entity.playerIds.map((id) => state.statsByPlayer[id] || emptyDartsRacerStats());
  return {
    darts: rows.reduce((a, r) => a + r.darts, 0),
    visits: rows.reduce((a, r) => a + r.visits, 0),
    netDistance: rows.reduce((a, r) => a + r.netDistance, 0),
  };
}

function standingsKey(row: Omit<DartsRacerStanding, "rank" | "tied">) {
  // La ligne d’arrivée / la case atteinte décide du résultat. Les autres valeurs
  // servent uniquement à ordonner l'affichage, jamais à casser artificiellement
  // une égalité à la limite de rounds.
  return [row.completed ? 1 : 0, row.position];
}

function recalcStandings(state: DartsRacerState, countLeadChange = false) {
  const rows: Omit<DartsRacerStanding, "rank" | "tied">[] = Object.values(state.entities).map((entity) => {
    const agg = aggregateEntityStats(state, entity);
    const clamped = Math.max(0, Math.min(state.totalDistance, entity.position));
    const lap = entity.completed ? state.rules.laps : Math.min(state.rules.laps, Math.floor(clamped / state.rules.trackLength) + 1);
    const localPosition = entity.completed ? state.rules.trackLength : clamped % state.rules.trackLength;
    return {
      id: entity.id,
      name: entity.name,
      playerIds: [...entity.playerIds],
      position: clamped,
      distanceToFinish: Math.max(0, state.totalDistance - clamped),
      progressPct: state.totalDistance ? Math.round((clamped / state.totalDistance) * 1000) / 10 : 0,
      lap,
      localPosition,
      shield: entity.shield,
      completed: entity.completed,
      visits: agg.visits,
      darts: agg.darts,
      netDistance: agg.netDistance,
    };
  });
  rows.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    const ea = state.entities[a.id], eb = state.entities[b.id];
    if (a.completed && b.completed && ea.completedAtVisit !== eb.completedAtVisit) return Number(ea.completedAtVisit ?? 1e9) - Number(eb.completedAtVisit ?? 1e9);
    return b.position - a.position || b.netDistance - a.netDistance || a.visits - b.visits || a.name.localeCompare(b.name, "fr");
  });
  state.standings = rows.map((row, index) => {
    const prev = rows[index - 1];
    const tied = Boolean(prev) && standingsKey(row).every((v, i) => v === standingsKey(prev)[i]);
    return { ...row, rank: index + 1, tied };
  });
  const leader = state.standings[0]?.id || null;
  if (countLeadChange && state.history.length > 0 && state.lastLeaderId && leader && leader !== state.lastLeaderId) state.leadChanges += 1;
  state.lastLeaderId = leader;
  const best = rows[0];
  if (!best) { state.winnerIds = []; state.tied = false; return; }
  const bestKey = standingsKey(best);
  state.winnerIds = rows.filter((row) => standingsKey(row).every((v, i) => v === bestKey[i])).map((row) => row.id);
  state.tied = state.winnerIds.length > 1;
}

function finish(state: DartsRacerState, reason: DartsRacerState["finishReason"]) {
  state.finished = true;
  state.finishReason = reason;
  state.finishedAt = Date.now();
  recalcStandings(state, false);
  return state;
}

export function createDartsRacerState(
  inputPlayers: Player[],
  rulesInput: Partial<DartsRacerRules> = {},
  inputTeams: DartsRacerTeamConfig[] = [],
  turnOrderInput?: string[]
): DartsRacerState {
  const players = normalizePlayers(inputPlayers);
  const trackLength = ([30, 40, 50, 60].includes(Number(rulesInput.trackLength)) ? Number(rulesInput.trackLength) : 40) as DartsRacerRules["trackLength"];
  const laps = ([1, 2, 3].includes(Number(rulesInput.laps)) ? Number(rulesInput.laps) : 1) as DartsRacerRules["laps"];
  const raceStyle: DartsRacerStyle = rulesInput.raceStyle === "sprint" || rulesInput.raceStyle === "chaos" ? rulesInput.raceStyle : "arcade";
  const rules: DartsRacerRules = {
    participantMode: rulesInput.participantMode === "teams" ? "teams" : "players",
    trackLength,
    laps,
    raceStyle,
    specialCells: raceStyle === "sprint" ? false : rulesInput.specialCells !== false,
    collisions: rulesInput.collisions !== false,
    maxRounds: clampInt(rulesInput.maxRounds, 0, 99, 20),
  };
  const teams = normalizeTeams(players, inputTeams);
  const { teamByPlayer, entityByPlayer } = entityMaps(players, teams, rules.participantMode);
  const validIds = new Set(players.map((p) => p.id));
  const desired = Array.isArray(turnOrderInput) ? turnOrderInput.map(String).filter((id) => validIds.has(id)) : [];
  const turnOrder = Array.from(new Set([...desired, ...players.map((p) => p.id)]));
  const totalDistance = rules.trackLength * rules.laps;
  const state: DartsRacerState = {
    sport: "darts", mode: "darts_racer", rules, players, teams, teamByPlayer, entityByPlayer,
    turnOrder, activePlayerIndex: 0, roundIndex: 0, totalDistance,
    specialCells: buildDartsRacerSpecialCells(rules),
    entities: createEntities(players, teams, rules.participantMode, entityByPlayer),
    statsByPlayer: Object.fromEntries(players.map((p) => [p.id, emptyDartsRacerStats()])),
    history: [], standings: [], winnerIds: [], tied: false, finished: false, finishReason: null,
    startedAt: Date.now(), leadChanges: 0, lastLeaderId: null,
  };
  recalcStandings(state, false);
  return state;
}

export function cloneDartsRacerState(state: DartsRacerState): DartsRacerState {
  return {
    ...state,
    rules: { ...state.rules },
    players: state.players.map((p) => ({ ...p })),
    teams: state.teams.map((team) => ({ ...team, playerIds: [...team.playerIds] })),
    teamByPlayer: { ...state.teamByPlayer },
    entityByPlayer: { ...state.entityByPlayer },
    turnOrder: [...state.turnOrder],
    specialCells: state.specialCells.map((cell) => ({ ...cell })),
    entities: Object.fromEntries(Object.entries(state.entities).map(([id, e]) => [id, { ...e, playerIds: [...e.playerIds] }])),
    statsByPlayer: Object.fromEntries(Object.entries(state.statsByPlayer).map(([id, s]) => [id, { ...s }])),
    history: state.history.map((visit) => ({ ...visit, darts: visit.darts.map((d) => ({ ...d })), labels: [...visit.labels], specialEvents: visit.specialEvents.map((e) => ({ ...e })) })),
    standings: state.standings.map((row) => ({ ...row, playerIds: [...row.playerIds] })),
    winnerIds: [...state.winnerIds],
  };
}

export function getDartsRacerActivePlayerId(state: DartsRacerState) {
  return state.turnOrder[state.activePlayerIndex] || state.players[0]?.id || "";
}

export function getDartsRacerActiveEntity(state: DartsRacerState) {
  const pid = getDartsRacerActivePlayerId(state);
  return state.entities[state.entityByPlayer[pid]] || Object.values(state.entities)[0];
}

export function getDartsRacerLap(state: DartsRacerState, entity: DartsRacerEntityProgress) {
  if (entity.completed) return state.rules.laps;
  return Math.min(state.rules.laps, Math.floor(Math.max(0, entity.position) / state.rules.trackLength) + 1);
}

function specialAt(state: DartsRacerState, position: number) {
  return state.specialCells.find((cell) => cell.position === position) || null;
}

function leaderOpponent(state: DartsRacerState, entityId: string) {
  return Object.values(state.entities)
    .filter((entity) => entity.id !== entityId && !entity.completed)
    .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name, "fr"))[0] || null;
}

function applyShieldedBackstep(target: DartsRacerEntityProgress, requested: number) {
  if (target.shield > 0) {
    target.shield = Math.max(0, target.shield - 1);
    return { actual: 0, shielded: true };
  }
  const before = target.position;
  target.position = Math.max(0, target.position - Math.max(0, requested));
  return { actual: before - target.position, shielded: false };
}

export function playDartsRacerVisit(previous: DartsRacerState, dartsInput: GameDart[]): DartsRacerState {
  if (previous.finished) return previous;
  const state = cloneDartsRacerState(previous);
  const playerId = getDartsRacerActivePlayerId(state);
  const entityId = state.entityByPlayer[playerId];
  const entity = state.entities[entityId];
  if (!playerId || !entity || entity.completed) return state;

  const darts = (dartsInput || []).slice(0, 3).map((d) => ({ ...d }));
  while (darts.length < 3) darts.push({ bed: "MISS" });

  const stats = state.statsByPlayer[playerId] || emptyDartsRacerStats();
  const positionBefore = entity.position;
  const shieldBefore = entity.shield;
  const lapBefore = getDartsRacerLap(state, entity);
  let baseDistance = 0;
  let bonusDistance = 0;
  let penaltyDistance = 0;
  const specialEvents: DartsRacerSpecialEvent[] = [];

  for (let dartIndex = 0; dartIndex < darts.length; dartIndex += 1) {
    if (entity.completed) break;
    const dart = darts[dartIndex];
    const distance = dartsRacerDartDistance(dart);
    baseDistance += distance;
    if (distance > 0) stats.hits += 1;
    if (dart.bed === "S") stats.singles += 1;
    else if (dart.bed === "D") { stats.doubles += 1; stats.miniBoosts += 1; }
    else if (dart.bed === "T") { stats.triples += 1; stats.boosts += 1; }
    else if (dart.bed === "OB") { stats.bulls += 1; stats.turboHits += 1; }
    else if (dart.bed === "IB") { stats.dbulls += 1; stats.hyperTurboHits += 1; }
    else stats.misses += 1;

    const beforeDart = entity.position;
    entity.position = Math.min(state.totalDistance, entity.position + distance);

    if (entity.position >= state.totalDistance) {
      entity.completed = true;
      entity.completedAtVisit = state.history.length + 1;
      entity.finishDarts = stats.darts + dartIndex + 1;
      break;
    }

    const cell = specialAt(state, entity.position);
    if (cell) {
      const strong = state.rules.raceStyle === "chaos";
      if (cell.type === "boost") {
        const requested = strong ? 3 : 2;
        const before = entity.position;
        entity.position = Math.min(state.totalDistance, entity.position + requested);
        const actual = entity.position - before;
        bonusDistance += actual;
        stats.specialBoosts += 1;
        specialEvents.push({ type: "boost", position: cell.position, delta: actual, label: `BOOST +${actual}` });
      } else if (cell.type === "shield") {
        entity.shield = 1;
        stats.shieldsPicked += 1;
        specialEvents.push({ type: "shield", position: cell.position, delta: 0, label: "BOUCLIER" });
      } else if (cell.type === "hazard") {
        stats.hazards += 1;
        const requested = strong ? 3 : 2;
        const result = applyShieldedBackstep(entity, requested);
        if (result.shielded) stats.shieldsUsed += 1;
        else { penaltyDistance += result.actual; stats.hazardDistance += result.actual; }
        specialEvents.push({ type: "hazard", position: cell.position, delta: -result.actual, shielded: result.shielded, label: result.shielded ? "PIÈGE BLOQUÉ" : `PIÈGE −${result.actual}` });
      } else if (cell.type === "attack") {
        stats.attackPickups += 1;
        const target = leaderOpponent(state, entityId);
        if (target) {
          const requested = strong ? 3 : 2;
          const result = applyShieldedBackstep(target, requested);
          if (result.shielded) stats.shieldsUsed += 1;
          else if (result.actual > 0) { stats.attacksLanded += 1; stats.attackDistance += result.actual; }
          specialEvents.push({ type: "attack", position: cell.position, delta: -result.actual, targetEntityId: target.id, shielded: result.shielded, label: result.shielded ? `${target.name} bloque l'attaque` : `${target.name} −${result.actual}` });
        } else specialEvents.push({ type: "attack", position: cell.position, delta: 0, targetEntityId: null, label: "ATTAQUE sans cible" });
      }
    }

    if (entity.position >= state.totalDistance) {
      entity.completed = true;
      entity.completedAtVisit = state.history.length + 1;
      entity.finishDarts = stats.darts + dartIndex + 1;
      break;
    }

    if (state.rules.collisions && distance > 0) {
      const rivals = Object.values(state.entities).filter((rival) => rival.id !== entityId && !rival.completed && rival.position === entity.position);
      for (const rival of rivals) {
        const requested = state.rules.raceStyle === "chaos" ? 2 : 1;
        const result = applyShieldedBackstep(rival, requested);
        if (result.shielded) stats.shieldsUsed += 1;
        else if (result.actual > 0) { stats.collisions += 1; stats.collisionDistance += result.actual; }
        specialEvents.push({ type: "collision", position: entity.position, delta: -result.actual, targetEntityId: rival.id, shielded: result.shielded, label: result.shielded ? `${rival.name} bloque le contact` : `${rival.name} poussé −${result.actual}` });
      }
    }

    if (beforeDart === entity.position && distance > 0) {
      // Défensif : aucune boucle possible ; garde un état numérique valide.
      entity.position = Math.max(0, Math.min(state.totalDistance, entity.position));
    }
  }

  stats.darts += 3;
  stats.visits += 1;
  stats.baseDistance += baseDistance;
  stats.bonusDistance += bonusDistance;
  stats.penaltyDistance += penaltyDistance;
  const netDistance = entity.position - positionBefore;
  stats.netDistance += netDistance;
  stats.bestVisitDistance = Math.max(stats.bestVisitDistance, netDistance);
  stats.maxPosition = Math.max(stats.maxPosition, entity.position);
  stats.lapsCompleted = Math.max(stats.lapsCompleted, Math.min(state.rules.laps, Math.floor(entity.position / state.rules.trackLength)));
  if (entity.completed && stats.finishVisit == null) stats.finishVisit = state.history.length + 1;
  state.statsByPlayer[playerId] = stats;

  const lapAfter = getDartsRacerLap(state, entity);
  state.history.push({
    id: `dr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), round: state.roundIndex + 1, playerId,
    teamId: state.teamByPlayer[playerId] || null, entityId, darts, labels: darts.map(dartsRacerDartLabel),
    positionBefore, positionAfter: entity.position, baseDistance, bonusDistance, penaltyDistance,
    netDistance, lapBefore, lapAfter, shieldBefore, shieldAfter: entity.shield, specialEvents, completed: entity.completed,
  });

  recalcStandings(state, true);
  if (state.standings[0]?.id === entityId) stats.leadVisits += 1;
  state.statsByPlayer[playerId] = stats;

  if (entity.completed) {
    state.winnerIds = [entity.id];
    state.tied = false;
    return finish(state, "finish_line");
  }

  const currentIndex = state.activePlayerIndex;
  state.activePlayerIndex = (currentIndex + 1) % Math.max(1, state.turnOrder.length);
  if (state.activePlayerIndex <= currentIndex) {
    state.roundIndex += 1;
    if (state.rules.maxRounds > 0 && state.roundIndex >= state.rules.maxRounds) return finish(state, "round_limit");
  }
  recalcStandings(state, false);
  return state;
}
