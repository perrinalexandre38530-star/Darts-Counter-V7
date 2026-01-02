// =======================================================
// src/lib/x01v3/x01StatsMatchV3.ts
// Agrégation des stats LIVE (par leg) en stats MATCH V3
// - Cumule les stats live de chaque leg
// - Construit X01MatchStatsV3
// - Détermine winnerPlayerId / winnerTeamId
// =======================================================

import type {
  X01MatchStatsV3,
  X01StatsLiveV3,
  X01PlayerId,
  X01TeamId,
  X01ConfigV3,
  X01MatchStateV3,
} from "../../types/x01v3";

/* -------------------------------------------------------
   Créer un objet MatchStats V3 vide pour le match
------------------------------------------------------- */
export function createEmptyMatchStatsV3(
  playerIds: X01PlayerId[]
): X01MatchStatsV3 {
  const players: X01MatchStatsV3["players"] = {};

  for (const pid of playerIds) {
    players[pid] = {
      legsWon: 0,
      setsWon: 0,
      avg3: 0,
      dartsThrown: 0,
      visits: 0,
      bestVisit: 0,
      miss: 0,
      bust: 0,
      hits: {
        S: 0,
        D: 0,
        T: 0,
        Bull: 0,
        DBull: 0,
      },
      bySegment: {},
      totalScore: 0,
    };
  }

  const stats: X01MatchStatsV3 = {
    players,
    winnerPlayerId: undefined,
    winnerTeamId: undefined,
  };

  return stats;
}

/* -------------------------------------------------------
   Helper interne : merge bySegment pour un joueur
------------------------------------------------------- */
function mergeBySegment(
  target: Record<string, { S: number; D: number; T: number }>,
  source: Record<string, { S: number; D: number; T: number }>
) {
  for (const key of Object.keys(source)) {
    if (!target[key]) {
      target[key] = { S: 0, D: 0, T: 0 };
    }
    target[key].S += source[key].S;
    target[key].D += source[key].D;
    target[key].T += source[key].T;
  }
}

/* -------------------------------------------------------
   Appliquer les stats LIVE de leg d'un joueur au MATCH
------------------------------------------------------- */
export function applyLiveStatsToMatchStatsV3(
  matchStats: X01MatchStatsV3,
  playerId: X01PlayerId,
  live: X01StatsLiveV3
): void {
  const target = matchStats.players[playerId];
  if (!target) return;

  target.dartsThrown += live.dartsThrown;
  target.visits += live.visits;
  target.miss += live.miss;
  target.bust += live.bust;

  target.hits.S += live.hits.S;
  target.hits.D += live.hits.D;
  target.hits.T += live.hits.T;
  target.hits.Bull += live.hits.Bull;
  target.hits.DBull += live.hits.DBull;

  // score total cumulé du match
  target.totalScore += live.totalScore;

  // bestVisit = max de tous les legs
  if (live.bestVisit > target.bestVisit) {
    target.bestVisit = live.bestVisit;
  }

  // Cumuler bySegment
  mergeBySegment(target.bySegment, live.bySegment);
}

/* -------------------------------------------------------
   À appeler UNE FOIS à la fin du match
------------------------------------------------------- */
export function finalizeMatchStatsV3(
  config: X01ConfigV3,
  state: X01MatchStateV3,
  matchStats: X01MatchStatsV3
): X01MatchStatsV3 {
  // 1) Copier legsWon / setsWon dans matchStats.players
  for (const pid of Object.keys(matchStats.players)) {
    const pStats = matchStats.players[pid];

    pStats.legsWon = state.legsWon[pid] || 0;
    pStats.setsWon = state.setsWon[pid] || 0;

    // 2) Calculer avg3 pour chaque joueur depuis totalScore
    if (pStats.dartsThrown > 0) {
      const avgPerDart = pStats.totalScore / pStats.dartsThrown;
      pStats.avg3 = avgPerDart * 3;
    } else {
      pStats.avg3 = 0;
    }
  }

  // 3) Déterminer le vainqueur
  const winner = computeMatchWinnerFromStateV3(config, state);
  matchStats.winnerPlayerId = winner?.winnerPlayerId;
  matchStats.winnerTeamId = winner?.winnerTeamId;

  return matchStats;
}

/* -------------------------------------------------------
   Déterminer le vainqueur depuis le state du match
------------------------------------------------------- */
export function computeMatchWinnerFromStateV3(
  config: X01ConfigV3,
  state: X01MatchStateV3
): { winnerPlayerId?: X01PlayerId; winnerTeamId?: X01TeamId } | null {
  if (config.gameMode === "teams") {
    if (!state.teamSetsWon) return null;
    let bestTeam: X01TeamId | undefined;
    let bestSets = -1;

    for (const tid of Object.keys(state.teamSetsWon)) {
      const sets = state.teamSetsWon[tid];
      if (sets > bestSets) {
        bestSets = sets;
        bestTeam = tid;
      }
    }

    if (bestTeam) {
      return { winnerTeamId: bestTeam };
    }
    return null;
  }

  // Mode solo / multi : on cherche le joueur aux sets max
  let bestPlayer: X01PlayerId | undefined;
  let bestSets = -1;

  for (const pid of Object.keys(state.setsWon)) {
    const sets = state.setsWon[pid];
    if (sets > bestSets) {
      bestSets = sets;
      bestPlayer = pid;
    }
  }

  if (bestPlayer) {
    return { winnerPlayerId: bestPlayer };
  }

  return null;
}
