// =======================================================
// src/lib/x01v3/x01FlowV3.ts
// Logique de rotation / flow X01 V3
// - Choix du 1er joueur (random / alternate)
// - Rotation des joueurs (solo / multi)
// - Rotation des équipes (teams)
// - Progression Leg → Set → Match
// - Détection victoires
// =======================================================

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01PlayerId,
  X01TeamId,
} from "../../types/x01v3";

/* -------------------------------------------------------
   1. Générer l'ordre de tir du set actuel
------------------------------------------------------- */
export function generateThrowOrderV3(
  config: X01ConfigV3,
  previousOrder: X01PlayerId[] | null,
  setIndex: number
): X01PlayerId[] {
  const base = config.players.map((p) => p.id);

  if (config.serveMode === "random" && !previousOrder) {
    // Premier set : random intégral
    return shuffleArray(base);
  }

  if (config.serveMode === "random" && previousOrder) {
    // Sets suivants : on décale
    return rotateArray(previousOrder, 1);
  }

  if (config.serveMode === "alternate") {
    // Alternance stricte : chaque set → joueur suivant commence
    if (!previousOrder) return base; // premier set, ordre original
    return rotateArray(previousOrder, 1);
  }

  return base; // fallback
}

/* -------------------------------------------------------
   Utilitaires
------------------------------------------------------- */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rotateArray<T>(arr: T[], amount: number): T[] {
  const a = [...arr];
  for (let i = 0; i < amount; i++) {
    const first = a.shift();
    if (first !== undefined) a.push(first);
  }
  return a;
}

/* -------------------------------------------------------
   2. Next player (solo / multi / teams)
------------------------------------------------------- */
export function getNextPlayerV3(state: X01MatchStateV3): X01PlayerId {
  const order = state.throwOrder;
  const idx = order.indexOf(state.activePlayer);
  const nextIndex = (idx + 1) % order.length;
  return order[nextIndex];
}

/* -------------------------------------------------------
   3. Victoire d’un LEG
------------------------------------------------------- */
export function checkLegWinV3(
  config: X01ConfigV3,
  state: X01MatchStateV3
): { winnerPlayerId?: X01PlayerId; winnerTeamId?: X01TeamId } | null {
  // En solo / multi : leg gagné si score = 0
  for (const pid of Object.keys(state.scores)) {
    if (state.scores[pid] === 0) {
      if (config.gameMode !== "teams") {
        return { winnerPlayerId: pid };
      }
      // MODE TEAMS : déterminer l'équipe gagnante
      const team = config.teams?.find((t) => t.players.includes(pid));
      if (team) return { winnerTeamId: team.id };
    }
  }

  return null;
}

/* -------------------------------------------------------
   4. Mise à jour des legs gagnés
------------------------------------------------------- */
export function applyLegWinV3(
  config: X01ConfigV3,
  state: X01MatchStateV3,
  winner: { winnerPlayerId?: string; winnerTeamId?: string }
) {
  if (config.gameMode === "teams") {
    if (!winner.winnerTeamId) return;
    state.teamLegsWon![winner.winnerTeamId] =
      (state.teamLegsWon![winner.winnerTeamId] || 0) + 1;
  } else {
    if (!winner.winnerPlayerId) return;
    state.legsWon[winner.winnerPlayerId] =
      (state.legsWon[winner.winnerPlayerId] || 0) + 1;
  }
}

/* -------------------------------------------------------
   5. Détection SET gagné (règle tennis)
------------------------------------------------------- */
export function checkSetWinV3(
  config: X01ConfigV3,
  state: X01MatchStateV3
): { winnerPlayerId?: X01PlayerId; winnerTeamId?: X01TeamId } | null {
  const legsNeeded = Math.floor(config.legsPerSet / 2) + 1;

  if (config.gameMode === "teams") {
    for (const tid of Object.keys(state.teamLegsWon!)) {
      if (state.teamLegsWon![tid] >= legsNeeded) {
        return { winnerTeamId: tid };
      }
    }
  } else {
    for (const pid of Object.keys(state.legsWon)) {
      if (state.legsWon[pid] >= legsNeeded) {
        return { winnerPlayerId: pid };
      }
    }
  }

  return null;
}

/* -------------------------------------------------------
   6. Appliquer SET gagné
------------------------------------------------------- */
export function applySetWinV3(
  config: X01ConfigV3,
  state: X01MatchStateV3,
  winner: { winnerPlayerId?: string; winnerTeamId?: string }
) {
  if (config.gameMode === "teams") {
    if (!winner.winnerTeamId) return;
    state.teamSetsWon![winner.winnerTeamId] =
      (state.teamSetsWon![winner.winnerTeamId] || 0) + 1;
  } else {
    if (!winner.winnerPlayerId) return;
    state.setsWon[winner.winnerPlayerId] =
      (state.setsWon[winner.winnerPlayerId] || 0) + 1;
  }
}

/* -------------------------------------------------------
   7. Détection MATCH gagné — logique "best-of"
   config.setsToWin = nb de sets MAX (1,3,5,7...)
   target = floor(setsMax / 2) + 1  → BO3=2, BO5=3, BO7=4...
------------------------------------------------------- */
export function checkMatchWinV3(
  config: X01ConfigV3,
  state: X01MatchStateV3
): { winnerPlayerId?: X01PlayerId; winnerTeamId?: X01TeamId } | null {
  const setsMax = config.setsToWin ?? 1;
  const target = setsMax <= 1 ? 1 : Math.floor(setsMax / 2) + 1;

  if (config.gameMode === "teams") {
    for (const tid of Object.keys(state.teamSetsWon || {})) {
      if ((state.teamSetsWon?.[tid] ?? 0) >= target) {
        return { winnerTeamId: tid };
      }
    }
  } else {
    for (const pid of Object.keys(state.setsWon)) {
      if ((state.setsWon[pid] ?? 0) >= target) {
        return { winnerPlayerId: pid };
      }
    }
  }

  return null;
}
