// =============================================================
// src/lib/trainingAgg.ts
// Agrégateurs Training (X01 + Tour de l’Horloge) par profil
// - Lit les clés localStorage existantes :
//   • "dc_training_x01_stats_v1"
//   • "dc_training_clock_stats_v1"
// - Compatible ancien format sans profileId (legacy)
// - Utilisable depuis Home, StatsHub, hooks de quick stats, etc.
// =============================================================

export const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";
export const TRAINING_CLOCK_STATS_KEY = "dc_training_clock_stats_v1";

/* ============================================================
   Training X01 — agrégat par profil
   Format de base attendu (par session, en localStorage) :
   {
     profileId?: string;
     darts: number;
     avg3D: number;
     hitsS: number;
     hitsD: number;
     hitsT: number;
     bestCheckout?: number | null;
     checkout?: number | null; // compat ancien champ
   }
============================================================ */

export type TrainingX01Agg = {
  sessions: number;
  totalDarts: number;
  sumAvg3D: number;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  bestCheckout: number | null;
};

export function makeEmptyTrainingAgg(): TrainingX01Agg {
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

export function loadTrainingAggForProfile(
  profileId: string
): TrainingX01Agg {
  if (typeof window === "undefined") return makeEmptyTrainingAgg();

  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return makeEmptyTrainingAgg();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return makeEmptyTrainingAgg();

    const agg = makeEmptyTrainingAgg();

    for (const row of parsed) {
      if (!row) continue;

      // ⚠️ Compat ancien format : profileId facultatif
      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

      agg.sessions += 1;
      agg.totalDarts += Number(row.darts) || 0;
      agg.sumAvg3D += Number(row.avg3D ?? row.avg3 ?? 0) || 0;
      agg.hitsS += Number(row.hitsS ?? 0) || 0;
      agg.hitsD += Number(row.hitsD ?? 0) || 0;
      agg.hitsT += Number(row.hitsT ?? 0) || 0;

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
    console.warn("[trainingAgg] loadTrainingAggForProfile failed", e);
    return makeEmptyTrainingAgg();
  }
}

/* ============================================================
   Tour de l’Horloge — agrégat par profil
   Format de base attendu (par run, en localStorage) :
   {
     profileId?: string;
     targetsHit: number;   // ou "hits"
     attempts: number;     // ou "throws"
     totalTimeSec: number; // ou "timeSec"
     bestStreak: number;   // ou "streak"
   }
============================================================ */

export type ClockAgg = {
  runs: number;
  targetsHitTotal: number;
  attemptsTotal: number;
  totalTimeSec: number;
  bestStreak: number;
};

export function makeEmptyClockAgg(): ClockAgg {
  return {
    runs: 0,
    targetsHitTotal: 0,
    attemptsTotal: 0,
    totalTimeSec: 0,
    bestStreak: 0,
  };
}

export function loadClockAggForProfile(profileId: string): ClockAgg {
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
    console.warn("[trainingAgg] loadClockAggForProfile failed", e);
    return makeEmptyClockAgg();
  }
}

/* ============================================================
   Helpers dérivés : ratios pratiques
============================================================ */

export function getTrainingAvg3D(agg: TrainingX01Agg): number {
  if (!agg.sessions) return 0;
  return agg.sumAvg3D / agg.sessions;
}

export function getClockSuccessRate(agg: ClockAgg): number {
  if (!agg.attemptsTotal) return 0;
  return agg.targetsHitTotal / agg.attemptsTotal;
}
