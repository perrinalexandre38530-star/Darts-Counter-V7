// =======================================================
// src/lib/x01v3/x01StatsLiveV3.ts
// Stats LIVE X01 V3 (par joueur, par leg)
// - dartsThrown, visits, totalScore, bestVisit, bestCheckout
// - miss, bust
// - hits S/D/T + Bull/DBull
// - bySegment pour graphes
// - PATCH : hitsBySegment + détails S/D/T + dartsDetail + scorePerVisit
// - helpers avg3, %miss, %bust
// =======================================================

import type {
  X01StatsLiveV3,
  X01VisitStateV3,
  X01SegmentHits,
} from "../../types/x01v3";

/* -------------------------------------------------------
   Création d'un objet stats LIVE vide
------------------------------------------------------- */
export function createEmptyLiveStatsV3(): X01StatsLiveV3 {
  // Nouveau : structure complète pour hitsBySegment 1..20 + 25
  const hitsBySegment: Record<number, X01SegmentHits> = {};
  for (let i = 1; i <= 20; i++) {
    hitsBySegment[i] = { S: 0, D: 0, T: 0 };
  }
  hitsBySegment[25] = { S: 0, D: 0, T: 0 };

  // Ancienne structure bySegment pour compat (clé string)
  const bySegment: Record<string, { S: number; D: number; T: number }> = {};
  for (let i = 1; i <= 20; i++) {
    bySegment[String(i)] = { S: 0, D: 0, T: 0 };
  }
  bySegment["25"] = { S: 0, D: 0, T: 0 };

  return {
    // Stats de base
    dartsThrown: 0,
    visits: 0,
    totalScore: 0,
    bestVisit: 0,
    bestCheckout: 0, // ✅ nouveau : meilleur checkout sur le leg
    avg3: 0,

    // Miss / bust
    miss: 0,
    bust: 0,

    // Résumé global des hits
    hits: {
      S: 0,
      D: 0,
      T: 0,
      Bull: 0,
      DBull: 0,
    },

    // Ancienne map (graphes déjà existants)
    bySegment,

    // -------- PATCH STATS COMPLETES --------
    hitsBySegment, // 1..20 + 25

    hitsSingle: 0,
    hitsDouble: 0,
    hitsTriple: 0,

    pctMiss: 0,
    pctS: 0,
    pctD: 0,
    pctT: 0,

    // Bulls explicites
    bull: 0,
    dBull: 0,

    // Détail des fléchettes + score par volée
    dartsDetail: [],
    scorePerVisit: [],
  };
}

/* -------------------------------------------------------
   Helper interne : assure l'entrée bySegment["N"]
------------------------------------------------------- */
function ensureSegmentBucket(stats: X01StatsLiveV3, segment: number | 25) {
  const key = String(segment);
  if (!stats.bySegment[key]) {
    stats.bySegment[key] = { S: 0, D: 0, T: 0 };
  }
}

/* -------------------------------------------------------
   Appliquer une VISIT complète aux stats LIVE
   - visit : la volée terminée (bust ou non)
   - wasBust : true si la volée est un bust
   - isCheckout : true si cette volée termine le leg (score 0)
------------------------------------------------------- */
export function applyVisitToLiveStatsV3(
  stats: X01StatsLiveV3,
  visit: X01VisitStateV3,
  wasBust: boolean,
  isCheckout: boolean
): X01StatsLiveV3 {
  // On modifie en place et on renvoie (pour chainage)
  stats.visits += 1;

  // Score de la volée (0 en cas de bust)
  const visitScoreRaw = visit.startingScore - visit.currentScore;
  const visitScore = wasBust ? 0 : Math.max(visitScoreRaw, 0);

  stats.totalScore += visitScore;

  if (visitScore > stats.bestVisit) {
    stats.bestVisit = visitScore;
  }

  // ✅ Meilleur checkout (uniquement si la volée finit le leg)
  if (!wasBust && isCheckout && visitScore > 0) {
    if (!stats.bestCheckout || visitScore > stats.bestCheckout) {
      stats.bestCheckout = visitScore;
    }
  }

  if (wasBust) {
    stats.bust += 1;
  }

  // Parcours de toutes les fléchettes tirées dans la volée
  for (const dart of visit.darts) {
    stats.dartsThrown += 1;

    // MISS = score 0
    if (dart.score <= 0) {
      stats.miss += 1;
      continue;
    }

    const seg = dart.segment;

    // Gestion Bull / DBull
    if (seg === 25) {
      if (dart.multiplier === 1) {
        stats.hits.Bull += 1;
        stats.bull += 1;
      } else if (dart.multiplier === 2) {
        stats.hits.DBull += 1;
        stats.bull += 1;
        stats.dBull += 1;
      }

      // On enregistre quand même dans bySegment["25"] (S/D)
      ensureSegmentBucket(stats, seg);
      if (dart.multiplier === 1) {
        stats.bySegment["25"].S += 1;
      } else if (dart.multiplier === 2) {
        stats.bySegment["25"].D += 1;
      }
      continue;
    }

    // Segments 1-20
    ensureSegmentBucket(stats, seg);

    if (dart.multiplier === 1) {
      stats.hits.S += 1;
      stats.bySegment[String(seg)].S += 1;
    } else if (dart.multiplier === 2) {
      stats.hits.D += 1;
      stats.bySegment[String(seg)].D += 1;
    } else if (dart.multiplier === 3) {
      stats.hits.T += 1;
      stats.bySegment[String(seg)].T += 1;
    }
  }

  return stats;
}

/* -------------------------------------------------------
   Helpers de lecture : avg3, %miss, %bust
------------------------------------------------------- */

// ✅ Moyenne par volée (Moy/3D) = totalScore / visits
// → 1 seule volée à 170 pts → Moy/3D = 170
export function getAvg3FromLiveStatsV3(stats: X01StatsLiveV3): number {
  if (stats.visits === 0) return 0;
  return stats.totalScore / stats.visits;
}

// % de bust par VISIT
export function getBustRateFromLiveStatsV3(stats: X01StatsLiveV3): number {
  if (stats.visits === 0) return 0;
  return (stats.bust / stats.visits) * 100;
}

// % de miss par DART
export function getMissRateFromLiveStatsV3(stats: X01StatsLiveV3): number {
  if (stats.dartsThrown === 0) return 0;
  return (stats.miss / stats.dartsThrown) * 100;
}
