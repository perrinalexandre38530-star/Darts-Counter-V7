// ============================================
// src/hooks/useActiveProfileStats.ts
// Hook central pour les stats du profil actif
// - Lit stats X01 (quick) via statsBridge
// - Lit stats Cricket via getCricketProfileStats
// - Agrège Training X01 (localStorage "dc_training_x01_stats_v1")
// - Agrège Tour de l’Horloge (localStorage "dc_training_clock_stats_v1")
// - Remplit le modèle ActiveProfileStats pour ActiveProfileCard + Home
// ============================================

import { useEffect, useState } from "react";
import type { ActiveProfileStats } from "../components/home/ActiveProfileCard";
import {
  getBasicProfileStatsAsync,
  getCricketProfileStats,
} from "../lib/statsBridge";

/* ============================================================
   Exposé : stats vides + hook
============================================================ */

// Stats vides (pour init / fallback)
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
   Aggreg Training X01 pour 1 profil (dc_training_x01_stats_v1)
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

      // ⚠️ Compat ancien format
      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

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
    console.warn("[useActiveProfileStats] loadTrainingAggForProfile failed", e);
    return makeEmptyTrainingAgg();
  }
}

/* ============================================================
   Aggreg Tour de l’Horloge pour 1 profil (dc_training_clock_stats_v1)
   - Format agrégé par run :
     { profileId, targetsHit, attempts, totalTimeSec, bestStreak }
============================================================ */

const TRAINING_CLOCK_STATS_KEY = "dc_training_clock_stats_v1";

type ClockAgg = {
  runs: number;
  targetsHitTotal: number;
  attemptsTotal: number;
  totalTimeSec: number;
  bestStreak: number;
};

function makeEmptyClockAgg(): ClockAgg {
  return {
    runs: 0,
    targetsHitTotal: 0,
    attemptsTotal: 0,
    totalTimeSec: 0,
    bestStreak: 0,
  };
}

function loadClockAggForProfile(profileId: string): ClockAgg {
  if (typeof window === "undefined") return makeEmptyClockAgg();

  try {
    const raw = window.localStorage.getItem(TRAINING_CLOCK_STATS_KEY);
    if (!raw) return makeEmptyClockAgg();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return makeEmptyClockAgg();

    const agg = makeEmptyClockAgg();

    for (const row of parsed) {
      if (!row) continue;

      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

      const targetsHit = Number(row.targetsHit ?? row.hits ?? 0) || 0;
      const attempts = Number(row.attempts ?? row.throws ?? 0) || 0;
      const timeSec = Number(row.totalTimeSec ?? row.timeSec ?? 0) || 0;
      const streak = Number(row.bestStreak ?? row.streak ?? 0) || 0;

      agg.runs += 1;
      agg.targetsHitTotal += targetsHit;
      agg.attemptsTotal += attempts;
      agg.totalTimeSec += timeSec;
      if (streak > agg.bestStreak) agg.bestStreak = streak;
    }

    return agg;
  } catch (e) {
    console.warn("[useActiveProfileStats] loadClockAggForProfile failed", e);
    return makeEmptyClockAgg();
  }
}

/* ============================================================
   buildStatsForProfile(profileId)
   (logique déplacée depuis Home.tsx, inchangée)
============================================================ */

async function buildStatsForProfile(
  profileId: string
): Promise<ActiveProfileStats> {
  try {
    const base: any = await getBasicProfileStatsAsync(profileId);

    // Cricket
    let cricket: any = null;
    try {
      cricket = await getCricketProfileStats(profileId);
    } catch (e) {
      console.warn("[useActiveProfileStats] getCricketProfileStats failed", e);
    }

    const games = Number(base?.games || 0);
    const wins = Number(base?.wins || 0);
    const avg3 = Number(base?.avg3 || 0);
    const bestVisit = Number(base?.bestVisit || 0);
    const bestCheckout = Number(base?.bestCheckout || 0);

    const winRatePct = Number(base?.winRate != null ? base.winRate : 0);
    const winRate01 =
      winRatePct > 0 ? winRatePct / 100 : games > 0 ? wins / games : 0;

    const ratingGlobal = avg3;

    // Training X01
    const tAgg = loadTrainingAggForProfile(profileId);
    const trainingAvg3D =
      tAgg.sessions > 0 ? tAgg.sumAvg3D / tAgg.sessions : 0;

    // Cricket (profil)
    const cricketMatches = Number(cricket?.matchesTotal ?? 0);
    const cricketBestPoints = Number(cricket?.bestPointsInMatch ?? 0);
    const cricketWinsTotal = Number(cricket?.winsTotal ?? 0);
    const cricketWinRate =
      cricketMatches > 0 ? cricketWinsTotal / cricketMatches : 0;

    // Tour de l’Horloge
    const cAgg = loadClockAggForProfile(profileId);
    const clockTargetsHit = cAgg.targetsHitTotal;
    const clockSuccessRate =
      cAgg.attemptsTotal > 0 ? cAgg.targetsHitTotal / cAgg.attemptsTotal : 0;
    const clockTotalTimeSec = cAgg.totalTimeSec;
    const clockBestStreak = cAgg.bestStreak;

    const s: ActiveProfileStats = {
      // ---- Vue globale ----
      ratingGlobal,
      winrateGlobal: winRate01,
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

      // ---- Online (placeholder pour l’instant) ----
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

      // ---- Cricket ----
      cricketPointsPerRound: cricketBestPoints || 0,
      cricketHitsTotal: cricketMatches || 0,
      cricketCloseRate: cricketWinRate || 0,
      cricketLegsWinrate: cricketWinRate || 0,
      cricketAvgClose201918: 0,
      cricketOpenings: cricketMatches || 0,

      // ---- Training X01 ----
      trainingAvg3D,
      trainingHitsS: tAgg.hitsS || 0,
      trainingHitsD: tAgg.hitsD || 0,
      trainingHitsT: tAgg.hitsT || 0,
      trainingGoalSuccessRate: 0,
      trainingBestCO: tAgg.bestCheckout ?? 0,

      // ---- Tour de l'Horloge ----
      clockTargetsHit,
      clockSuccessRate,
      clockTotalTimeSec,
      clockBestStreak,
    };

    return s;
  } catch (err) {
    console.warn(
      "[useActiveProfileStats] buildStatsForProfile error, fallback zeros:",
      err
    );
    return emptyActiveProfileStats();
  }
}

/* ============================================================
   Hook public
============================================================ */

export function useActiveProfileStats(
  profileId: string | null | undefined
): ActiveProfileStats {
  const [stats, setStats] = useState<ActiveProfileStats>(
    () => emptyActiveProfileStats()
  );

  useEffect(() => {
    let cancelled = false;

    if (!profileId) {
      setStats(emptyActiveProfileStats());
      return;
    }

    (async () => {
      const s = await buildStatsForProfile(profileId);
      if (!cancelled) setStats(s);
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return stats;
}
