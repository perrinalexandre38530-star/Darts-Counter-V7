// ============================================
// TERRITORIES — PURE GAME ENGINE
// Location: src/territories/engine.ts
// ============================================

import type {
  TerritoriesGameState,
  TerritoriesPlayer,
  Territory,
  VoiceEvent,
} from "./types";

export type OwnerId = string;

export interface EngineResult {
  state: TerritoriesGameState;
  events: VoiceEvent[];
  error?: string;
}

export interface ApplyDartOptions {
  territoryId?: string;
}

export interface ApplyVisitOptions {
  territoryId?: string;
}

function cloneState(s: TerritoriesGameState): TerritoriesGameState {
  return {
    ...s,
    config: { ...s.config, victoryCondition: { ...s.config.victoryCondition } as any },
    players: s.players.map((p) => ({ ...p, capturedTerritories: [...p.capturedTerritories] })),
    teams: s.teams ? s.teams.map((t) => ({ ...t })) : undefined,
    map: {
      ...s.map,
      territories: s.map.territories.map((t) => ({ ...t })),
    },
    turn: {
      ...s.turn,
      capturedThisTurn: [...s.turn.capturedThisTurn],
    },
  };
}

function getActivePlayer(state: TerritoriesGameState): TerritoriesPlayer | undefined {
  return state.players.find((p) => p.id === state.turn.activePlayerId);
}

export function getOwnerIdForPlayer(state: TerritoriesGameState, playerId: string): OwnerId | undefined {
  const p = state.players.find((item) => item.id === playerId);
  if (!p) return undefined;
  return p.teamId && state.teams?.some((t) => t.id === p.teamId) ? p.teamId : p.id;
}

function getOwnerIdForActive(state: TerritoriesGameState): OwnerId | undefined {
  return getOwnerIdForPlayer(state, state.turn.activePlayerId);
}

function possibleOwnerIds(state: TerritoriesGameState): OwnerId[] {
  return state.teams?.length ? state.teams.map((t) => t.id) : state.players.map((p) => p.id);
}

function findTerritory(state: TerritoriesGameState, territoryId: string): Territory | undefined {
  return state.map.territories.find((t) => t.id === territoryId);
}

function isFortressMode(state: TerritoriesGameState): boolean {
  return state.config.gameMode === "fortress";
}

export function isTerritoryPlayable(territory: Territory): boolean {
  return territory.playable !== false;
}

function maxFortressesPerOwner(state: TerritoriesGameState): number {
  const raw = Number(state.config.maxFortressesPerOwner ?? 2);
  if (!Number.isFinite(raw)) return 2;
  return Math.max(1, Math.min(10, Math.floor(raw)));
}

function isEligibleTerritory(state: TerritoriesGameState, territory: Territory, ownerId: OwnerId): boolean {
  const { allowEnemyCapture, minTerritoryValue } = state.config;

  if (!isTerritoryPlayable(territory)) return false;
  if (typeof minTerritoryValue === "number" && territory.value < minTerritoryValue) return false;

  // Forteresses mode deliberately allows attacking an enemy territory and
  // selecting one's own territory to build/move the fortress.
  if (isFortressMode(state)) return true;

  if (!allowEnemyCapture && territory.ownerId && territory.ownerId !== ownerId) return false;

  return true;
}

function chooseImposedTarget(state: TerritoriesGameState, ownerId: OwnerId): string | undefined {
  const eligibleNeutral = state.map.territories.find((t) => !t.ownerId && isEligibleTerritory(state, t, ownerId));
  if (eligibleNeutral) return eligibleNeutral.id;

  if (state.config.allowEnemyCapture || isFortressMode(state)) {
    const eligibleEnemy = state.map.territories.find(
      (t) => !!t.ownerId && t.ownerId !== ownerId && isEligibleTerritory(state, t, ownerId),
    );
    if (eligibleEnemy) return eligibleEnemy.id;
  }

  const anyEligible = state.map.territories.find((t) => isEligibleTerritory(state, t, ownerId));
  return anyEligible?.id;
}

function removeCapturedFromAllOwners(state: TerritoriesGameState, territoryId: string): void {
  for (const p of state.players) {
    const idx = p.capturedTerritories.indexOf(territoryId);
    if (idx >= 0) p.capturedTerritories.splice(idx, 1);
  }
}

function addCapturedToOwner(state: TerritoriesGameState, ownerId: OwnerId, territoryId: string): void {
  const p = state.players.find((x) => x.id === ownerId);
  if (p && !p.capturedTerritories.includes(territoryId)) p.capturedTerritories.push(territoryId);
}

function countTerritoriesOwned(state: TerritoriesGameState, ownerId: OwnerId): number {
  return state.map.territories.filter((t) => isTerritoryPlayable(t) && t.ownerId === ownerId).length;
}

function sumTerritoryValueOwned(state: TerritoriesGameState, ownerId: OwnerId): number {
  return state.map.territories.reduce((total, territory) => {
    if (!isTerritoryPlayable(territory) || territory.ownerId !== ownerId) return total;
    const value = Number(territory.value);
    return total + (Number.isFinite(value) ? Math.max(0, value) : 0);
  }, 0);
}

function computeRegionOwnership(state: TerritoriesGameState): Record<string, OwnerId | undefined> {
  const out: Record<string, OwnerId | undefined> = {};
  const byRegion: Record<string, Territory[]> = {};

  for (const t of state.map.territories) {
    if (!isTerritoryPlayable(t)) continue;
    const r = String(t.region || "").trim();
    if (!r) continue;
    (byRegion[r] ||= []).push(t);
  }

  for (const regionId of Object.keys(byRegion)) {
    const list = byRegion[regionId];
    if (!list?.length) continue;
    const firstOwner = list[0]?.ownerId as OwnerId | undefined;
    if (!firstOwner) {
      out[regionId] = undefined;
      continue;
    }
    out[regionId] = list.every((tt) => (tt.ownerId as OwnerId | undefined) === firstOwner)
      ? firstOwner
      : undefined;
  }
  return out;
}

function countOwnedRegions(state: TerritoriesGameState, ownerId: OwnerId): number {
  const owned = computeRegionOwnership(state);
  let n = 0;
  for (const k of Object.keys(owned)) if (owned[k] === ownerId) n += 1;
  return n;
}

function isLastPlayerOfRound(state: TerritoriesGameState): boolean {
  const n = state.players.length;
  if (!n) return false;
  return state.turnIndex % n === n - 1;
}

function roundLimitReachedAtEndOfCurrentTurn(state: TerritoriesGameState): boolean {
  return state.roundIndex >= Math.max(1, state.config.maxRounds) && isLastPlayerOfRound(state);
}

function bestOwnerByMetric(
  state: TerritoriesGameState,
  metric: "count" | "value" = "count",
): { winnerId?: OwnerId; tie: boolean } {
  let winnerId: OwnerId | undefined;
  let best = -1;
  let tie = false;
  for (const ownerId of possibleOwnerIds(state)) {
    const score = metric === "value"
      ? sumTerritoryValueOwned(state, ownerId)
      : countTerritoriesOwned(state, ownerId);
    if (score > best) {
      best = score;
      winnerId = ownerId;
      tie = false;
    } else if (score === best) {
      tie = true;
    }
  }
  return { winnerId, tie };
}

function bestOwnerByTerritories(state: TerritoriesGameState): { winnerId?: OwnerId; tie: boolean } {
  return bestOwnerByMetric(state, "count");
}

function checkVictory(state: TerritoriesGameState, nowMs: number = Date.now()): { gameEnded: boolean; winnerId?: OwnerId } {
  const { victoryCondition } = state.config;
  const owners = possibleOwnerIds(state);

  if (victoryCondition.type === "territories") {
    for (const ownerId of owners) {
      if (countTerritoriesOwned(state, ownerId) >= victoryCondition.value) {
        return { gameEnded: true, winnerId: ownerId };
      }
    }
    // Classic mode still respects the configured maximum number of rounds.
    if (roundLimitReachedAtEndOfCurrentTurn(state)) {
      const best = bestOwnerByTerritories(state);
      return { gameEnded: true, winnerId: best.tie ? undefined : best.winnerId };
    }
    return { gameEnded: false };
  }

  if (victoryCondition.type === "regions") {
    for (const ownerId of owners) {
      if (countOwnedRegions(state, ownerId) >= victoryCondition.value) {
        return { gameEnded: true, winnerId: ownerId };
      }
    }
    if (roundLimitReachedAtEndOfCurrentTurn(state)) {
      let winnerId: OwnerId | undefined;
      let best = -1;
      let tie = false;
      for (const ownerId of owners) {
        const n = countOwnedRegions(state, ownerId);
        if (n > best) {
          best = n;
          winnerId = ownerId;
          tie = false;
        } else if (n === best) {
          tie = true;
        }
      }
      return { gameEnded: true, winnerId: tie ? undefined : winnerId };
    }
    return { gameEnded: false };
  }

  if (victoryCondition.type === "conquest") {
    const total = state.map.territories.filter(isTerritoryPlayable).length;
    for (const ownerId of owners) {
      if (total > 0 && countTerritoriesOwned(state, ownerId) === total) {
        return { gameEnded: true, winnerId: ownerId };
      }
    }
    return { gameEnded: false };
  }

  if (victoryCondition.type === "time") {
    const started = state.meta?.startedAtMs ?? nowMs;
    const endAt = started + Math.max(1, victoryCondition.minutes) * 60_000;
    if (nowMs < endAt) return { gameEnded: false };

    const best = bestOwnerByTerritories(state);
    return { gameEnded: true, winnerId: best.tie ? undefined : best.winnerId };
  }

  if (victoryCondition.type === "rounds" || victoryCondition.type === "rounds_value") {
    if (!roundLimitReachedAtEndOfCurrentTurn(state)) return { gameEnded: false };
    const best = bestOwnerByMetric(state, victoryCondition.type === "rounds_value" ? "value" : "count");
    return { gameEnded: true, winnerId: best.tie ? undefined : best.winnerId };
  }

  return { gameEnded: false };
}

function advanceTurnIndex(state: TerritoriesGameState): void {
  const n = state.players.length;
  const wasLastPlayer = n > 0 && (state.turnIndex + 1) % n === 0;
  state.turnIndex += 1;
  if (wasLastPlayer) state.roundIndex += 1;
}

function setActivePlayerFromTurnIndex(state: TerritoriesGameState): void {
  const n = state.players.length;
  if (!n) return;
  const idx = state.turnIndex % n;
  const p = state.players[idx];
  if (p) state.turn.activePlayerId = p.id;
}

function resetTurnState(state: TerritoriesGameState): void {
  state.turn.dartsThrown = 0;
  state.turn.capturedThisTurn = [];
  state.turn.selectedTerritoryId = undefined;
}

function captureTerritory(state: TerritoriesGameState, territory: Territory, ownerId: OwnerId): void {
  territory.ownerId = ownerId;
  territory.fortressOwnerId = undefined;
  territory.fortressBuiltAtTurn = undefined;
  removeCapturedFromAllOwners(state, territory.id);
  addCapturedToOwner(state, ownerId, territory.id);
  if (!state.turn.capturedThisTurn.includes(territory.id)) state.turn.capturedThisTurn.push(territory.id);
}

function buildOrMoveFortress(state: TerritoriesGameState, territory: Territory, ownerId: OwnerId): void {
  const activeFortresses = state.map.territories.filter(
    (item) => item.id !== territory.id && item.ownerId === ownerId && item.fortressOwnerId === ownerId,
  );
  const limit = maxFortressesPerOwner(state);

  // Revalidating an already protected territory keeps it protected and refreshes
  // its age, so another (older) fortress will be moved first when the limit is reached.
  if (territory.ownerId === ownerId && territory.fortressOwnerId === ownerId) {
    territory.fortressBuiltAtTurn = state.turnIndex;
    return;
  }

  if (activeFortresses.length >= limit) {
    const oldest = [...activeFortresses].sort((a, b) => {
      const aTurn = Number.isFinite(a.fortressBuiltAtTurn) ? Number(a.fortressBuiltAtTurn) : -1;
      const bTurn = Number.isFinite(b.fortressBuiltAtTurn) ? Number(b.fortressBuiltAtTurn) : -1;
      return aTurn - bTurn;
    })[0];
    if (oldest) {
      oldest.fortressOwnerId = undefined;
      oldest.fortressBuiltAtTurn = undefined;
    }
  }

  territory.fortressOwnerId = ownerId;
  territory.fortressBuiltAtTurn = state.turnIndex;
}

function applySuccessfulFortressHit(
  state: TerritoriesGameState,
  territory: Territory,
  ownerId: OwnerId,
  events: VoiceEvent[],
): void {
  if (territory.ownerId === ownerId) {
    buildOrMoveFortress(state, territory, ownerId);
    events.push({ type: "fortress_built", playerId: state.turn.activePlayerId, territoryId: territory.id });
    return;
  }

  // First exact hit on a protected enemy territory only breaks the fortress.
  if (territory.ownerId && territory.fortressOwnerId === territory.ownerId) {
    territory.fortressOwnerId = undefined;
    territory.fortressBuiltAtTurn = undefined;
    events.push({ type: "fortress_broken", playerId: state.turn.activePlayerId, territoryId: territory.id });
    return;
  }

  captureTerritory(state, territory, ownerId);
  events.push({ type: "territory_captured", playerId: state.turn.activePlayerId, territoryId: territory.id });
}

function chooseByScoreTarget(state: TerritoriesGameState, ownerId: OwnerId, total: number): Territory | undefined {
  const eligible = state.map.territories.filter((tt) => isEligibleTerritory(state, tt, ownerId));
  const exactOnly = isFortressMode(state) || state.config.captureRule === "exact";

  if (exactOnly) {
    const matches = eligible.filter((tt) => tt.value === total);
    if (!matches.length) return undefined;

    // If the map was tapped for information and the score matches it, keep that
    // territory. Otherwise prefer an enemy target, then a territory that can be fortified.
    const selected = state.turn.selectedTerritoryId
      ? matches.find((tt) => tt.id === state.turn.selectedTerritoryId)
      : undefined;
    if (selected) return selected;
    return matches.find((tt) => tt.ownerId && tt.ownerId !== ownerId) || matches[0];
  }

  const candidates = eligible.filter((tt) => tt.value <= total);
  if (!candidates.length) return undefined;
  const best = Math.max(...candidates.map((c) => c.value));
  return candidates.find((c) => c.value === best);
}

// --------------------------------------------
// PUBLIC API
// --------------------------------------------

/**
 * Gives every owner exactly the same number of territories at game start.
 * When the map cannot be divided evenly, the small remainder stays neutral and
 * can be conquered during play. Territories are kept in map order so the
 * colored zones stay visually grouped where possible.
 */
export function initializeEqualTerritoryOwnership(input: TerritoriesGameState): TerritoriesGameState {
  const state = cloneState(input);
  const owners = possibleOwnerIds(state);
  if (!owners.length) return state;

  for (const p of state.players) p.capturedTerritories = [];
  for (const t of state.map.territories) {
    t.ownerId = undefined;
    t.fortressOwnerId = undefined;
    t.fortressBuiltAtTurn = undefined;
  }

  const playableTerritories = state.map.territories.filter(isTerritoryPlayable);
  const total = playableTerritories.length;
  const equalShare = Math.floor(total / owners.length);

  if (state.config.victoryCondition.type === "rounds_value") {
    // In value mode, equal territory counts are not sufficient: a camp could
    // start with the same quantity but a much larger total value. Distribute
    // the highest-value territories first to the currently weakest camp while
    // preserving exactly equal territory counts.
    const totals: Record<string, number> = Object.fromEntries(owners.map((ownerId) => [ownerId, 0]));
    const counts: Record<string, number> = Object.fromEntries(owners.map((ownerId) => [ownerId, 0]));
    const candidates = [...playableTerritories]
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0) || a.id.localeCompare(b.id))
      .slice(0, equalShare * owners.length);

    for (const territory of candidates) {
      const ownerId = [...owners]
        .filter((id) => counts[id] < equalShare)
        .sort((a, b) => totals[a] - totals[b] || counts[a] - counts[b] || a.localeCompare(b))[0];
      if (!ownerId) continue;
      territory.ownerId = ownerId;
      counts[ownerId] += 1;
      totals[ownerId] += Math.max(0, Number(territory.value) || 0);
      addCapturedToOwner(state, ownerId, territory.id);
    }
    return state;
  }

  let cursor = 0;
  owners.forEach((ownerId) => {
    for (let i = 0; i < equalShare; i += 1) {
      const territory = playableTerritories[cursor++];
      if (!territory) continue;
      territory.ownerId = ownerId;
      addCapturedToOwner(state, ownerId, territory.id);
    }
  });

  return state;
}

export function normalizeTerritoriesState(input: TerritoriesGameState): EngineResult {
  const state = cloneState(input);
  const events: VoiceEvent[] = [];

  if (!state.players.length) return { state, events, error: "No players in game state." };

  if (!Number.isFinite(state.roundIndex) || state.roundIndex < 1) state.roundIndex = 1;
  if (!Number.isFinite(state.turnIndex) || state.turnIndex < 0) state.turnIndex = 0;

  setActivePlayerFromTurnIndex(state);

  const ownerId = getOwnerIdForActive(state);
  if (!ownerId) return { state, events, error: "Active player not found." };

  resetTurnState(state);

  if (state.config.targetSelectionMode === "imposed") {
    const imposed = chooseImposedTarget(state, ownerId);
    if (imposed) {
      state.turn.selectedTerritoryId = imposed;
      events.push({ type: "territory_selected", playerId: state.turn.activePlayerId, territoryId: imposed });
    }
  }

  events.push({ type: "turn_start", playerId: state.turn.activePlayerId });
  return { state, events };
}

export function selectTerritory(input: TerritoriesGameState, territoryId: string): EngineResult {
  const state = cloneState(input);
  const events: VoiceEvent[] = [];

  if (state.status !== "playing") return { state, events, error: "Game is not in playing state." };
  if (state.config.targetSelectionMode === "imposed") {
    return { state, events, error: "Target selection is imposed mode." };
  }

  const ownerId = getOwnerIdForActive(state);
  if (!ownerId) return { state, events, error: "Active player not found." };

  const t = findTerritory(state, territoryId);
  if (!t) return { state, events, error: "Unknown territory." };
  if (!isEligibleTerritory(state, t, ownerId)) {
    return { state, events, error: "Territory not eligible under current rules." };
  }

  state.turn.selectedTerritoryId = territoryId;
  events.push({ type: "territory_selected", playerId: state.turn.activePlayerId, territoryId });
  return { state, events };
}

export function applyDart(input: TerritoriesGameState, dartScore: number, opts: ApplyDartOptions = {}): EngineResult {
  const state = cloneState(input);
  const events: VoiceEvent[] = [];

  if (state.status !== "playing") return { state, events, error: "Game is not in playing state." };
  if (!Number.isFinite(dartScore) || dartScore < 0) return { state, events, error: "Invalid dart score." };
  if (state.turn.dartsThrown >= 3) return { state, events, error: "Turn already has 3 darts." };

  const ownerId = getOwnerIdForActive(state);
  if (!ownerId) return { state, events, error: "Active player not found." };
  state.turn.dartsThrown += 1;

  if (!state.config.multiCapture) return { state, events };

  const territoryId = opts.territoryId ?? state.turn.selectedTerritoryId;
  if (!territoryId) return { state, events };
  const t = findTerritory(state, territoryId);
  if (!t) return { state, events, error: "Unknown territory." };
  if (!isEligibleTerritory(state, t, ownerId)) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  const exactOnly = isFortressMode(state) || state.config.captureRule === "exact";
  const success = exactOnly ? dartScore === t.value : dartScore >= t.value;
  if (!success) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  if (isFortressMode(state)) applySuccessfulFortressHit(state, t, ownerId, events);
  else {
    captureTerritory(state, t, ownerId);
    events.push({ type: "territory_captured", playerId: state.turn.activePlayerId, territoryId });
  }

  return { state, events };
}

export function applyVisit(input: TerritoriesGameState, dartScores: number[], opts: ApplyVisitOptions = {}): EngineResult {
  const state = cloneState(input);
  const events: VoiceEvent[] = [];

  if (state.status !== "playing") return { state, events, error: "Game is not in playing state." };
  if (!Array.isArray(dartScores) || dartScores.length === 0) return { state, events, error: "Empty visit." };
  if (dartScores.some((d) => !Number.isFinite(d) || d < 0)) return { state, events, error: "Invalid dart score in visit." };
  if (dartScores.length > 3) return { state, events, error: "Visit cannot exceed 3 darts." };

  const ownerId = getOwnerIdForActive(state);
  if (!ownerId) return { state, events, error: "Active player not found." };

  const total = dartScores.reduce((a, b) => a + b, 0);
  let territoryId = opts.territoryId ?? state.turn.selectedTerritoryId;

  if (state.config.targetSelectionMode === "by_score") {
    const chosen = chooseByScoreTarget(state, ownerId, total);
    if (!chosen) {
      state.turn.dartsThrown = Math.min(3, state.turn.dartsThrown + dartScores.length);
      events.push({ type: "territory_failed", playerId: state.turn.activePlayerId });
      return { state, events };
    }
    territoryId = chosen.id;
    state.turn.selectedTerritoryId = chosen.id;
    events.push({ type: "territory_selected", playerId: state.turn.activePlayerId, territoryId: chosen.id });
  } else if (!territoryId) {
    if (state.config.targetSelectionMode === "free") {
      return { state, events, error: "No selected territory (free mode requires selection before visit)." };
    }
    const imposed = chooseImposedTarget(state, ownerId);
    if (!imposed) return { state, events, error: "No eligible territory available." };
    territoryId = imposed;
    state.turn.selectedTerritoryId = imposed;
  }

  const t = findTerritory(state, territoryId);
  if (!t) return { state, events, error: "Unknown territory." };

  state.turn.dartsThrown = Math.min(3, state.turn.dartsThrown + dartScores.length);

  if (!isEligibleTerritory(state, t, ownerId)) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  const exactOnly = isFortressMode(state) || state.config.captureRule === "exact";
  const success = exactOnly ? total === t.value : total >= t.value;
  if (!success) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  if (isFortressMode(state)) applySuccessfulFortressHit(state, t, ownerId, events);
  else {
    captureTerritory(state, t, ownerId);
    events.push({ type: "territory_captured", playerId: state.turn.activePlayerId, territoryId });
  }

  return { state, events };
}

export function countOwnedByOwnerId(state: TerritoriesGameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of state.map.territories) {
    if (!isTerritoryPlayable(t) || !t.ownerId) continue;
    out[t.ownerId] = (out[t.ownerId] || 0) + 1;
  }
  return out;
}

export function sumOwnedValueByOwnerId(state: TerritoriesGameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const territory of state.map.territories) {
    if (!isTerritoryPlayable(territory) || !territory.ownerId) continue;
    const value = Number(territory.value);
    out[territory.ownerId] = (out[territory.ownerId] || 0) + (Number.isFinite(value) ? Math.max(0, value) : 0);
  }
  return out;
}

export function endTurn(input: TerritoriesGameState): EngineResult {
  const state = cloneState(input);
  const events: VoiceEvent[] = [];

  if (state.status !== "playing") return { state, events, error: "Game is not in playing state." };
  if (!state.players.length) return { state, events, error: "No players." };

  const pre = checkVictory(state);
  if (pre.gameEnded) {
    state.status = "game_end";
    events.push({ type: "game_end", playerId: state.turn.activePlayerId });
    return { state, events };
  }

  advanceTurnIndex(state);
  setActivePlayerFromTurnIndex(state);
  resetTurnState(state);

  const ownerId = getOwnerIdForActive(state);
  if (!ownerId) return { state, events, error: "Active player not found after advancing." };

  if (state.config.targetSelectionMode === "imposed") {
    const imposed = chooseImposedTarget(state, ownerId);
    if (imposed) {
      state.turn.selectedTerritoryId = imposed;
      events.push({ type: "territory_selected", playerId: state.turn.activePlayerId, territoryId: imposed });
    }
  }

  events.push({ type: "turn_start", playerId: state.turn.activePlayerId });
  return { state, events };
}
