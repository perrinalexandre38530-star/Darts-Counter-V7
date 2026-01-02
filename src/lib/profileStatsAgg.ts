// =============================================================
// src/lib/profileStatsAgg.ts
// Agrégateur unique de stats profil (Home + StatsHub + ailleurs)
// - X01 global + multi via statsBridge (quick + History)
// - Training X01 via dc_training_x01_stats_v1 (legacy inclus)
// - Cricket via getCricketProfileStats (CricketProfileStats)
// - Renvoie un ActiveProfileStats utilisable par ActiveProfileCard
//   et par les dashboards (StatsHub, etc.)
// =============================================================

import {
  getBasicProfileStatsAsync,
  getCricketProfileStats,
} from "./statsBridge";

import type { ActiveProfileStats } from "../components/home/ActiveProfileCard";

/* ============================================================
   Training X01 localStorage (dc_training_x01_stats_v1)
   - Compatible ancien format sans profileId (legacy)
============================================================ */

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

type TrainingX01Agg = {
  sessions: number;
  totalDarts: number;
  sumAvg3D: number;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  bestCheckout: number | null;
};

function makeEmptyTrainingAgg(): TrainingX01Agg {
  return {
    sessions: 0,
    totalDarts: 0,
    sumAvg3D: 0,
    hitsS: 0,
    hitsD: 0,
    hitsT: 0,
    bestCheckout: null,
  };
}

function loadTrainingAggForProfile(profileId: string): TrainingX01Agg {
  if (typeof window === "undefined") return makeEmptyTrainingAgg();

  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return makeEmptyTrainingAgg();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return makeEmptyTrainingAgg();

    const agg = makeEmptyTrainingAgg();

    for (const row of parsed) {
      if (!row) continue;

      // ⚠️ Compat ancien format :
      // - si profileId présent ➜ on filtre dessus
      // - si PAS de profileId ➜ on considère que c'est du "legacy"
      //   et on l'inclut pour tous les profils (donc aussi l'actif)
      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

      // ➜ Ici : soit c'est bien ce profil, soit c'est du legacy sans profileId
      agg.sessions += 1;
      agg.totalDarts += Number(row.darts) || 0;
      agg.sumAvg3D += Number(row.avg3D) || 0;
      agg.hitsS += Number(row.hitsS) || 0;
      agg.hitsD += Number(row.hitsD) || 0;
      agg.hitsT += Number(row.hitsT) || 0;

      const bestCheckoutRaw =
        row.bestCheckout !== undefined && row.bestCheckout !== null
          ? row.bestCheckout
          : row.checkout;

      const bestCheckout =
        bestCheckoutRaw === null || bestCheckoutRaw === undefined
          ? null
          : Number(bestCheckoutRaw) || 0;

      if (
        bestCheckout &&
        (!agg.bestCheckout || bestCheckout > agg.bestCheckout)
      ) {
        agg.bestCheckout = bestCheckout;
      }
    }

    return agg;
  } catch (e) {
    console.warn("[profileStatsAgg] loadTrainingAggForProfile failed", e);
    return makeEmptyTrainingAgg();
  }
}

/* ============================================================
   Stats vides (pour init / fallback)
============================================================ */

export function emptyActiveProfileStats(): ActiveProfileStats {
  return {
    // ---- Vue globale ----
    ratingGlobal: 0,
    winrateGlobal: 0,
    avg3DGlobal: 0,
    sessionsGlobal: 0,
    favoriteNumberLabel: null,

    // ---- Records ----
    recordBestVisitX01: 0,
    recordBestCOX01: 0,
    recordMinDarts501: null,
    recordBestAvg3DX01: 0,
    recordBestStreak: null,
    recordBestCricketScore: null,

    // ---- Online ----
    onlineMatches: 0,
    onlineWinrate: 0,
    onlineAvg3D: 0,
    onlineBestVisit: 0,
    onlineBestCO: 0,
    onlineRank: null,
    onlineBestRank: null,

    // ---- X01 Multi ----
    x01MultiAvg3D: 0,
    x01MultiSessions: 0,
    x01MultiWinrate: 0,
    x01MultiBestVisit: 0,
    x01MultiBestCO: 0,
    x01MultiMinDartsLabel: null,

    // ---- Cricket ----
    cricketPointsPerRound: 0,
    cricketHitsTotal: 0,
    cricketCloseRate: 0,
    cricketLegsWinrate: 0,
    cricketAvgClose201918: 0,
    cricketOpenings: 0,

    // ---- Training X01 ----
    trainingAvg3D: 0,
    trainingHitsS: 0,
    trainingHitsD: 0,
    trainingHitsT: 0,
    trainingGoalSuccessRate: 0,
    trainingBestCO: 0,

    // ---- Tour de l'Horloge ----
    clockTargetsHit: 0,
    clockSuccessRate: 0,
    clockTotalTimeSec: 0,
    clockBestStreak: 0,
  };
}

/* ============================================================
   buildActiveProfileStats(profileId)
   - X01 global + X01 multi + records via statsBridge
   - Training X01 via TrainingStore (localStorage dc_training_x01_stats_v1)
   - Cricket via getCricketProfileStats
   - Online / Horloge à 0 pour l’instant
============================================================ */

export async function buildActiveProfileStats(
  profileId: string
): Promise<ActiveProfileStats> {
  try {
    const base: any = await getBasicProfileStatsAsync(profileId);

    // Cricket : on sécurise avec un try interne au cas où
    let cricket: any = null;
    try {
      cricket = await getCricketProfileStats(profileId);
    } catch (e) {
      console.warn("[profileStatsAgg] getCricketProfileStats failed", e);
    }

    const games = Number(base?.games || 0);
    const wins = Number(base?.wins || 0);
    const avg3 = Number(base?.avg3 || 0);
    const bestVisit = Number(base?.bestVisit || 0);
    const bestCheckout = Number(base?.bestCheckout || 0);

    // winRate dans base = 0..100 (si présent)
    const winRatePct = Number(base?.winRate != null ? base.winRate : 0);
    const winRate01 =
      winRatePct > 0 ? winRatePct / 100 : games > 0 ? wins / games : 0;

    // Rating global : pour l’instant, on réutilise la moy. 3D
    const ratingGlobal = avg3;

    // 🔹 Training X01 (agrégat localStorage par profil + legacy)
    const tAgg = loadTrainingAggForProfile(profileId);
    const trainingAvg3D =
      tAgg.sessions > 0 ? tAgg.sumAvg3D / tAgg.sessions : 0;

    // 🔹 Cricket (profil) — basé sur CricketProfileStats
    const cricketMatches = Number(cricket?.matchesTotal ?? 0);
    const cricketBestPoints = Number(cricket?.bestPointsInMatch ?? 0);
    const cricketWinsTotal = Number(cricket?.winsTotal ?? 0);
    const cricketWinRate =
      cricketMatches > 0 ? cricketWinsTotal / cricketMatches : 0;

    const s: ActiveProfileStats = {
      // ---- Vue globale (tous jeux confondus, pour l’instant X01) ----
      ratingGlobal,
      winrateGlobal: winRate01, // 0..1
      avg3DGlobal: avg3,
      sessionsGlobal: games,
      favoriteNumberLabel: null,

      // ---- Records ----
      recordBestVisitX01: bestVisit,
      recordBestCOX01: bestCheckout,
      recordMinDarts501: null,
      recordBestAvg3DX01: avg3,
      recordBestStreak: null,
      recordBestCricketScore: cricketBestPoints || null,

      // ---- Online (non branché pour l’instant) ----
      onlineMatches: 0,
      onlineWinrate: 0,
      onlineAvg3D: 0,
      onlineBestVisit: 0,
      onlineBestCO: 0,
      onlineRank: null,
      onlineBestRank: null,

      // ---- X01 Multi ----
      x01MultiAvg3D: avg3,
      x01MultiSessions: games,
      x01MultiWinrate: winRate01,
      x01MultiBestVisit: bestVisit,
      x01MultiBestCO: bestCheckout,
      x01MultiMinDartsLabel: null,

      // ---- Cricket (macro profil) ----
      cricketPointsPerRound: cricketBestPoints || 0,
      cricketHitsTotal: cricketMatches || 0,
      cricketCloseRate: cricketWinRate || 0,
      cricketLegsWinrate: cricketWinRate || 0,
      cricketAvgClose201918: 0,
      cricketOpenings: cricketMatches || 0,

      // ---- Training X01 (agrégat réel) ----
      trainingAvg3D,
      trainingHitsS: tAgg.hitsS || 0,
      trainingHitsD: tAgg.hitsD || 0,
      trainingHitsT: tAgg.hitsT || 0,
      trainingGoalSuccessRate: 0,
      trainingBestCO: tAgg.bestCheckout ?? 0,

      // ---- Tour de l'Horloge (sera branché ensuite) ----
      clockTargetsHit: 0,
      clockSuccessRate: 0,
      clockTotalTimeSec: 0,
      clockBestStreak: 0,
    };

    return s;
  } catch (err) {
    console.warn(
      "[profileStatsAgg] buildActiveProfileStats error, fallback zeros:",
      err
    );
    return emptyActiveProfileStats();
  }
}
