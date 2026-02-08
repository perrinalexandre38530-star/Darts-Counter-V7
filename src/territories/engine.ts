// ============================================
// TERRITORIES — STEP 2 : PURE GAME ENGINE
// Location: src/territories/engine.ts
//
// Goals:
// - Pure functions (no React, no DOM)
// - Clear rules: imposed/free target, exact/>=, multiCapture, enemy capture, min value
// - Emits VoiceEvent[] so UI can speak (or ignore)
// - Safe, defensive: returns { state, events, error? }
//
// NOTE:
// - This engine does not compute dartboard segments; it consumes numeric dart scores
// - You can feed it either per-dart (applyDart) or per-visit (applyVisit)
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

function getOwnerIdForActive(state: TerritoriesGameState): OwnerId | undefined {
  const p = getActivePlayer(state);
  if (!p) return undefined;
  return p.teamId && state.teams?.some((t) => t.id === p.teamId) ? p.teamId : p.id;
}

function findTerritory(state: TerritoriesGameState, territoryId: string): Territory | undefined {
  return state.map.territories.find((t) => t.id === territoryId);
}

function isEligibleTerritory(state: TerritoriesGameState, territory: Territory, ownerId: OwnerId): boolean {
  const { allowEnemyCapture, minTerritoryValue } = state.config;

  if (typeof minTerritoryValue === "number" && territory.value < minTerritoryValue) return false;

  if (!allowEnemyCapture && territory.ownerId && territory.ownerId !== ownerId) return false;

  return true;
}

function chooseImposedTarget(state: TerritoriesGameState, ownerId: OwnerId): string | undefined {
  const eligibleNeutral = state.map.territories.find((t) => !t.ownerId && isEligibleTerritory(state, t, ownerId));
  if (eligibleNeutral) return eligibleNeutral.id;

  if (state.config.allowEnemyCapture) {
    const eligibleEnemy = state.map.territories.find(
      (t) => !!t.ownerId && t.ownerId !== ownerId && isEligibleTerritory(state, t, ownerId)
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
  if (p) {
    if (!p.capturedTerritories.includes(territoryId)) p.capturedTerritories.push(territoryId);
  }
}

function countTerritoriesOwned(state: TerritoriesGameState, ownerId: OwnerId): number {
  return state.map.territories.filter((t) => t.ownerId === ownerId).length;
}

function computeRegionOwnership(state: TerritoriesGameState): Record<string, OwnerId | undefined> {
  const out: Record<string, OwnerId | undefined> = {};
  const byRegion: Record<string, Territory[]> = {};

  for (const t of state.map.territories) {
    const r = String(t.region || "").trim();
    if (!r) continue;
    (byRegion[r] ||= []).push(t);
  }

  for (const regionId of Object.keys(byRegion)) {
    const list = byRegion[regionId];
    if (!list.length) continue;
    const firstOwner = list[0].ownerId as OwnerId | undefined;
    if (!firstOwner) {
      out[regionId] = undefined;
      continue;
    }
    const allSame = list.every((tt) => (tt.ownerId as OwnerId | undefined) === firstOwner);
    out[regionId] = allSame ? firstOwner : undefined;
  }
  return out;
}

function countOwnedRegions(state: TerritoriesGameState, ownerId: OwnerId): number {
  const owned = computeRegionOwnership(state);
  let n = 0;
  for (const k of Object.keys(owned)) if (owned[k] === ownerId) n += 1;
  return n;
}

function checkVictory(state: TerritoriesGameState, nowMs: number = Date.now()): { gameEnded: boolean; winnerId?: OwnerId } {
  const { victoryCondition, maxRounds } = state.config;
  const possibleOwners: OwnerId[] = state.teams?.length ? state.teams.map((t) => t.id) : state.players.map((p) => p.id);

  if (victoryCondition.type === "territories") {
    for (const ownerId of possibleOwners) {
      if (countTerritoriesOwned(state, ownerId) >= victoryCondition.value) {
        return { gameEnded: true, winnerId: ownerId };
      }
    }
    return { gameEnded: false };
  }

  if (victoryCondition.type === "regions") {
    for (const ownerId of possibleOwners) {
      if (countOwnedRegions(state, ownerId) >= victoryCondition.value) {
        return { gameEnded: true, winnerId: ownerId };
      }
    }
    return { gameEnded: false };
  }

  if (victoryCondition.type === "time") {
    const started = state.meta?.startedAtMs ?? nowMs;
    const endAt = started + Math.max(1, victoryCondition.minutes) * 60_000;
    if (nowMs < endAt) return { gameEnded: false };

    let bestOwner: OwnerId | undefined = undefined;
    let bestN = -1;
    let tie = false;

    for (const ownerId of possibleOwners) {
      const n = countTerritoriesOwned(state, ownerId);
      if (n > bestN) {
        bestN = n;
        bestOwner = ownerId;
        tie = false;
      } else if (n === bestN) {
        tie = true;
      }
    }

    if (!bestOwner) return { gameEnded: true };
    if (tie) return { gameEnded: true };
    return { gameEnded: true, winnerId: bestOwner };
  }

  if (victoryCondition.type === "rounds") {
    if (state.roundIndex > maxRounds) return { gameEnded: true };
    return { gameEnded: false };
  }

  return { gameEnded: false };
}
function advanceTurnIndex(state: TerritoriesGameState): void {
  const n = state.players.length;
  const wasLastPlayer = ((state.turnIndex + 1) % n) === 0;

  state.turnIndex = state.turnIndex + 1;

  if (wasLastPlayer) {
    state.roundIndex = state.roundIndex + 1;
  }
}

function setActivePlayerFromTurnIndex(state: TerritoriesGameState): void {
  const n = state.players.length;
  const idx = state.turnIndex % n;
  const p = state.players[idx];
  if (p) state.turn.activePlayerId = p.id;
}

function resetTurnState(state: TerritoriesGameState): void {
  state.turn.dartsThrown = 0;
  state.turn.capturedThisTurn = [];
  state.turn.selectedTerritoryId = undefined;
}

// --------------------------------------------
// PUBLIC API
// --------------------------------------------

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
  // 🔁 Restore map click selection:
  // - free: normal selection
  // - by_score: selection is allowed for INFO/HUD only (the SCORE decides capture)
  // - imposed: selection is forced by the engine
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

  if (!state.config.multiCapture) {
    return { state, events };
  }

  const territoryId = opts.territoryId ?? state.turn.selectedTerritoryId;
  if (!territoryId) return { state, events };

  const t = findTerritory(state, territoryId);
  if (!t) return { state, events, error: "Unknown territory." };

  if (!isEligibleTerritory(state, t, ownerId)) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  const success = state.config.captureRule === "exact" ? dartScore === t.value : dartScore >= t.value;

  if (!success) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  t.ownerId = ownerId;

  removeCapturedFromAllOwners(state, territoryId);
  addCapturedToOwner(state, ownerId, territoryId);

  if (!state.turn.capturedThisTurn.includes(territoryId)) state.turn.capturedThisTurn.push(territoryId);

  events.push({ type: "territory_captured", playerId: state.turn.activePlayerId, territoryId });

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

  // Territory target resolution
  // - free: must preselect a territory
  // - imposed: engine imposes the target
  // - by_score: the SCORE decides the target (map selection is INFO-ONLY and must NOT affect capture)
  let territoryId = opts.territoryId ?? state.turn.selectedTerritoryId;

  if (state.config.targetSelectionMode === "by_score") {
    // In by_score mode, ALWAYS derive the target from the visit score.
    // Any manual selection is kept only for UI display and must not change the capture result.
    const eligible = state.map.territories.filter((tt) => isEligibleTerritory(state, tt, ownerId));

    let chosen: Territory | undefined;
    if (state.config.captureRule === "exact") {
      const matches = eligible.filter((tt) => tt.value === total);
      if (matches.length) chosen = matches[Math.floor(Math.random() * matches.length)];
    } else {
      // gte: pick the highest value <= total
      const candidates = eligible.filter((tt) => tt.value <= total);
      if (candidates.length) {
        const best = Math.max(...candidates.map((c) => c.value));
        const bestOnes = candidates.filter((c) => c.value === best);
        chosen = bestOnes[Math.floor(Math.random() * bestOnes.length)];
      }
    }

    if (!chosen) {
      // no matching territory -> just consume the visit, no capture
      state.turn.dartsThrown = Math.min(3, state.turn.dartsThrown + dartScores.length);
      events.push({ type: "territory_failed", playerId: state.turn.activePlayerId });
      return { state, events };
    }

    territoryId = chosen.id;
    // Keep for HUD highlight only (does not drive the capture in by_score)
    state.turn.selectedTerritoryId = chosen.id;
    events.push({ type: "territory_selected", playerId: state.turn.activePlayerId, territoryId: chosen.id });
  } else if (!territoryId) {
    if (state.config.targetSelectionMode === "free") {
      return { state, events, error: "No selected territory (free mode requires selection before visit)." };
    }

    // imposed
    const imposed = chooseImposedTarget(state, ownerId);
    if (!imposed) return { state, events, error: "No eligible territory available." };
    territoryId = imposed;
    state.turn.selectedTerritoryId = imposed;
  }

  // Find target territory
  const t = findTerritory(state, territoryId);
  if (!t) return { state, events, error: "Unknown territory." };

  state.turn.dartsThrown = Math.min(3, state.turn.dartsThrown + dartScores.length);

  if (!isEligibleTerritory(state, t, ownerId)) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  // total already computed above
  const success = state.config.captureRule === "exact" ? total === t.value : total >= t.value;

  if (!success) {
    events.push({ type: "territory_failed", playerId: state.turn.activePlayerId, territoryId });
    return { state, events };
  }

  t.ownerId = ownerId;

  removeCapturedFromAllOwners(state, territoryId);
  addCapturedToOwner(state, ownerId, territoryId);

  if (!state.turn.capturedThisTurn.includes(territoryId)) state.turn.capturedThisTurn.push(territoryId);

  events.push({ type: "territory_captured", playerId: state.turn.activePlayerId, territoryId });

  return { state, events };
}

// --------------------------------------------
// HELPERS exported for UI (scoreboards / HUD)
// --------------------------------------------

/**
 * Count territories owned by each ownerId.
 * - In solo: ownerId is playerId.
 * - In teams: ownerId is teamId.
 */
export function countOwnedByOwnerId(state: TerritoriesGameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of state.map.territories) {
    if (!t.ownerId) continue;
    out[t.ownerId] = (out[t.ownerId] || 0) + 1;
  }
  return out;
}

export function endTurn(input: TerritoriesGameState): EngineResult {
  const state = cloneState(input);
  const events: VoiceEvent[] = [];

  if (state.status !== "playing") return { state, events, error: "Game is not in playing state." };
  if (!state.players.length) return { state, events, error: "No players." };

  // ✅ IMPORTANT:
  // Victory must be evaluated *before* advancing the turn.
  // Otherwise, a player who just reached the objective will never be detected
  // (because turnIndex/activePlayerId is already moved to the next player).
  const pre = checkVictory(state);
  if (pre.gameEnded) {
    state.status = "game_end";
    // keep the current activePlayerId as the one who just played
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

  // Victory is evaluated at the start of endTurn (pre-advance).

  events.push({ type: "turn_start", playerId: state.turn.activePlayerId });
  return { state, events };
}