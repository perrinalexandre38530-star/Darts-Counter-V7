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
   Helpers (local)
------------------------------------------------------- */
type TeamLike = { id: string; players?: X01PlayerId[] };

function safeTeamPlayers(t: TeamLike): X01PlayerId[] {
  return Array.isArray(t.players) ? t.players : [];
}

/**
 * TEAMS: ordre "tour de table joueurs"
 * A1 → B1 → C1 → A2 → B2 → C2 ...
 *
 * - Défensif si players manquants
 * - Fallback vers `base` si aucun joueur exploitable
 */
function buildTeamsOrder(teams: TeamLike[], base: X01PlayerId[]): X01PlayerId[] {
  if (!Array.isArray(teams) || teams.length < 2) return base;

  const maxLen = Math.max(0, ...teams.map((t) => safeTeamPlayers(t).length));
  const out: X01PlayerId[] = [];

  for (let i = 0; i < maxLen; i++) {
    for (const t of teams) {
      const list = safeTeamPlayers(t);
      const pid = list[i];
      if (pid) out.push(pid);
    }
  }

  // Si la config teams est incomplète (aucun joueur assigné), fallback
  return out.length ? out : base;
}

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
  const n = a.length;
  if (!n) return a;

  const k = ((amount % n) + n) % n;
  if (k === 0) return a;

  // rotate left by k (historique de ton code : shift/push)
  return a.slice(k).concat(a.slice(0, k));
}

/* -------------------------------------------------------
   1. Générer l'ordre de tir du set actuel
------------------------------------------------------- */
export function generateThrowOrderV3(
  config: X01ConfigV3,
  previousOrder: X01PlayerId[] | null,
  setIndex: number
): X01PlayerId[] {
  // SOLO / MULTI (comportement historique)
  const base: X01PlayerId[] = Array.isArray(config.players)
    ? config.players.map((p) => p.id)
    : [];

  // TEAMS : ordre intercalé officiel (A1,B1,C1,...,A2,B2,...)
  if (config.gameMode === "teams" && Array.isArray(config.teams) && config.teams.length >= 2) {
    // Premier set
    if (!previousOrder) {
      if (config.serveMode === "random") {
        // "random" : on randomise l'ordre des équipes, MAIS on conserve le tour de table joueurs
        const shuffledTeams = shuffleArray(config.teams);
        return buildTeamsOrder(shuffledTeams, base);
      }
      // "alternate" : ordre des équipes tel que configuré
      return buildTeamsOrder(config.teams, base);
    }

    // Sets suivants : on décale l'ordre précédent (cohérent avec solo/multi)
    return rotateArray(previousOrder, 1);
  }

  // ----- SOLO / MULTI -----
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
   2. Next player (solo / multi / teams)
------------------------------------------------------- */
export function getNextPlayerV3(state: X01MatchStateV3): X01PlayerId {
  const order = state.throwOrder || [];
  if (!order.length) return state.activePlayer;

  const idx = order.indexOf(state.activePlayer);
  const nextIndex = (idx >= 0 ? idx + 1 : 0) % order.length;
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
  for (const pid of Object.keys(state.scores || {})) {
    if ((state.scores as any)[pid] === 0) {
      if (config.gameMode !== "teams") {
        return { winnerPlayerId: pid as X01PlayerId };
      }

      // MODE TEAMS : déterminer l'équipe gagnante
      const teams = Array.isArray(config.teams) ? config.teams : [];
      const team = teams.find((t) => safeTeamPlayers(t).includes(pid as X01PlayerId));
      if (team) return { winnerTeamId: team.id as X01TeamId };

      // Si pas trouvé (config incomplète) → fallback winnerPlayer
      return { winnerPlayerId: pid as X01PlayerId };
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
    state.teamLegsWon = state.teamLegsWon || {};
    state.teamLegsWon[winner.winnerTeamId as X01TeamId] =
      (state.teamLegsWon[winner.winnerTeamId as X01TeamId] || 0) + 1;
  } else {
    if (!winner.winnerPlayerId) return;
    state.legsWon = state.legsWon || ({} as any);
    state.legsWon[winner.winnerPlayerId as X01PlayerId] =
      (state.legsWon[winner.winnerPlayerId as X01PlayerId] || 0) + 1;
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
    const teamLegs = state.teamLegsWon || {};
    for (const tid of Object.keys(teamLegs)) {
      if ((teamLegs as any)[tid] >= legsNeeded) {
        return { winnerTeamId: tid as X01TeamId };
      }
    }
  } else {
    const legsWon = state.legsWon || ({} as any);
    for (const pid of Object.keys(legsWon)) {
      if ((legsWon as any)[pid] >= legsNeeded) {
        return { winnerPlayerId: pid as X01PlayerId };
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
    state.teamSetsWon = state.teamSetsWon || {};
    state.teamSetsWon[winner.winnerTeamId as X01TeamId] =
      (state.teamSetsWon[winner.winnerTeamId as X01TeamId] || 0) + 1;
  } else {
    if (!winner.winnerPlayerId) return;
    state.setsWon = state.setsWon || ({} as any);
    state.setsWon[winner.winnerPlayerId as X01PlayerId] =
      (state.setsWon[winner.winnerPlayerId as X01PlayerId] || 0) + 1;
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
    const teamSets = state.teamSetsWon || {};
    for (const tid of Object.keys(teamSets)) {
      if (((teamSets as any)[tid] ?? 0) >= target) {
        return { winnerTeamId: tid as X01TeamId };
      }
    }
  } else {
    const setsWon = state.setsWon || ({} as any);
    for (const pid of Object.keys(setsWon)) {
      if (((setsWon as any)[pid] ?? 0) >= target) {
        return { winnerPlayerId: pid as X01PlayerId };
      }
    }
  }

  return null;
}