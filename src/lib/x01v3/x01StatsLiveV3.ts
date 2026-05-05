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


  // Score de la volée : 0 en cas de bust, sinon score réellement validé.
  // Important : scorePerVisit sert aux tranches 60+/100+/140+/180 ; il ne doit
  // contenir qu'une seule entrée par volée et jamais le total brut d'un bust.
  const visitScoreRaw = visit.startingScore - visit.currentScore;
  const visitScore = wasBust ? 0 : Math.max(visitScoreRaw, 0);
  stats.scorePerVisit.push(visitScore);

  // First 9 darts average (average of first 3 visits)
  if (stats.scorePerVisit.length >= 3 && (stats as any).first9Avg === 0) {
    (stats as any).first9Avg = (stats.scorePerVisit[0] + stats.scorePerVisit[1] + stats.scorePerVisit[2]) / 3;
  }

  // Tranches EXCLUSIVES : 60-99 / 100-139 / 140-179 / 180 exact.
  (stats as any).h60 = (stats as any).h60 || 0;
  (stats as any).h100 = (stats as any).h100 || 0;
  (stats as any).h140 = (stats as any).h140 || 0;
  (stats as any).h180 = (stats as any).h180 || 0;
  if (visitScore === 180) (stats as any).h180 += 1;
  else if (visitScore >= 140) (stats as any).h140 += 1;
  else if (visitScore >= 100) (stats as any).h100 += 1;
  else if (visitScore >= 60) (stats as any).h60 += 1;

  // Checkout attempt heuristic: any visit starting on a finish (<=170)
  if (visit.startingScore <= 170 && visit.startingScore > 0) {
    (stats as any).checkoutAttempts = ((stats as any).checkoutAttempts || 0) + 1;

    // doubles attempts: number of double darts thrown during checkout-range visits
    const dAtt = visit.darts.reduce((acc, d) => acc + (d?.multiplier === 2 && (Number(d?.score) || 0) > 0 ? 1 : 0), 0);
    (stats as any).doublesAttempts = ((stats as any).doublesAttempts || 0) + dAtt;
  }

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
    // Keep a detail list for later KPIs
    stats.dartsDetail.push({
      segment: dart.segment,
      multiplier: dart.multiplier,
      score: dart.score,
      isMiss: dart.score <= 0,
    });
    stats.dartsThrown += 1;

    // MISS = score 0
    if (dart.score <= 0) {
      stats.miss += 1;
      continue;
    }

    const score = Number(dart.score) || 0;
    const seg = Number(dart.segment) || 0;
    const mult = Number(dart.multiplier) || 0;

    // Gestion Bull / DBull robuste : certains flux stockent score=25/50
    // sans segment=25. On classe donc d'abord par score quand nécessaire.
    if (seg === 25 || score === 25 || score === 50) {
      ensureSegmentBucket(stats, 25);
      if (score === 50 || mult === 2) {
        stats.hits.DBull += 1;
        stats.bull += 1;
        stats.dBull += 1;
        stats.bySegment["25"].D += 1;
        stats.hitsBySegment[25].D += 1;
      } else {
        stats.hits.Bull += 1;
        stats.bull += 1;
        stats.bySegment["25"].S += 1;
        stats.hitsBySegment[25].S += 1;
      }
      continue;
    }

    // Segments 1-20
    ensureSegmentBucket(stats, seg as any);

    if (mult === 1) {
      stats.hits.S += 1;
      stats.hitsSingle = (stats.hitsSingle || 0) + 1;
      stats.bySegment[String(seg)].S += 1;
      stats.hitsBySegment[seg].S += 1;
    } else if (mult === 2) {
      stats.hits.D += 1;
      stats.hitsDouble = (stats.hitsDouble || 0) + 1;
      stats.bySegment[String(seg)].D += 1;
      stats.hitsBySegment[seg].D += 1;
    } else if (mult === 3) {
      stats.hits.T += 1;
      stats.hitsTriple = (stats.hitsTriple || 0) + 1;
      stats.bySegment[String(seg)].T += 1;
      stats.hitsBySegment[seg].T += 1;
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
