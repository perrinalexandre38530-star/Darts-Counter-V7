import type { OutdoorPerformanceSport } from "./outdoorPerformance";

export type OutdoorRouteSearchProfile = "balanced" | "trails" | "easy";

export type OutdoorRouteSearchPolicy = {
  defaultTargetKm: number;
  distanceOptionsKm: number[];
  defaultRadiusKm: number;
  radiusOptionsKm: number[];
  absoluteMinKm: number;
  absoluteMaxKm: number;
  distanceBandsKm: { shortMax: number; mediumMax: number };
  defaultProfile: OutdoorRouteSearchProfile;
};

const POLICIES: Record<OutdoorPerformanceSport, OutdoorRouteSearchPolicy> = {
  running: {
    defaultTargetKm: 10,
    distanceOptionsKm: [3, 5, 10, 15, 21],
    defaultRadiusKm: 15,
    radiusOptionsKm: [8, 15, 25, 40],
    absoluteMinKm: 2,
    absoluteMaxKm: 35,
    distanceBandsKm: { shortMax: 7, mediumMax: 15 },
    defaultProfile: "balanced",
  },
  trail: {
    defaultTargetKm: 12,
    distanceOptionsKm: [5, 10, 15, 20, 30],
    defaultRadiusKm: 20,
    radiusOptionsKm: [10, 20, 30, 40],
    absoluteMinKm: 3,
    absoluteMaxKm: 45,
    distanceBandsKm: { shortMax: 10, mediumMax: 20 },
    defaultProfile: "trails",
  },
  hiking: {
    defaultTargetKm: 12,
    distanceOptionsKm: [5, 10, 15, 20, 30],
    defaultRadiusKm: 20,
    radiusOptionsKm: [10, 20, 30, 40],
    absoluteMinKm: 3,
    absoluteMaxKm: 50,
    distanceBandsKm: { shortMax: 10, mediumMax: 20 },
    defaultProfile: "trails",
  },
  walking: {
    defaultTargetKm: 6,
    distanceOptionsKm: [2, 5, 8, 10, 15],
    defaultRadiusKm: 12,
    radiusOptionsKm: [6, 12, 20, 30],
    absoluteMinKm: 1.5,
    absoluteMaxKm: 25,
    distanceBandsKm: { shortMax: 5, mediumMax: 12 },
    defaultProfile: "easy",
  },
  "nordic-walking": {
    defaultTargetKm: 8,
    distanceOptionsKm: [5, 8, 10, 15, 20],
    defaultRadiusKm: 15,
    radiusOptionsKm: [8, 15, 25, 35],
    absoluteMinKm: 2.5,
    absoluteMaxKm: 30,
    distanceBandsKm: { shortMax: 8, mediumMax: 15 },
    defaultProfile: "balanced",
  },
  treadmill: {
    defaultTargetKm: 5,
    distanceOptionsKm: [3, 5, 10],
    defaultRadiusKm: 0,
    radiusOptionsKm: [],
    absoluteMinKm: 0,
    absoluteMaxKm: 0,
    distanceBandsKm: { shortMax: 5, mediumMax: 10 },
    defaultProfile: "easy",
  },
};

export function outdoorRouteSearchPolicy(sport: OutdoorPerformanceSport): OutdoorRouteSearchPolicy {
  return POLICIES[sport] || POLICIES.running;
}

export function outdoorRouteDistanceFit(
  distanceM: number,
  sport: OutdoorPerformanceSport,
  targetDistanceKm?: number | null,
) {
  const policy = outdoorRouteSearchPolicy(sport);
  const distanceKm = Math.max(0, Number(distanceM || 0) / 1000);
  if (!Number.isFinite(distanceKm) || distanceKm < policy.absoluteMinKm || distanceKm > policy.absoluteMaxKm) {
    return {
      accepted: false,
      grade: "reject" as const,
      errorPct: 100,
      minKm: policy.absoluteMinKm,
      maxKm: policy.absoluteMaxKm,
    };
  }

  const targetKm = Number(targetDistanceKm || 0);
  if (!(targetKm > 0)) {
    return {
      accepted: true,
      grade: "good" as const,
      errorPct: 0,
      minKm: policy.absoluteMinKm,
      maxKm: policy.absoluteMaxKm,
    };
  }

  const errorRatio = Math.abs(distanceKm - targetKm) / Math.max(0.1, targetKm);
  const errorPct = Math.round(errorRatio * 1000) / 10;
  const hardTolerance = 0.45;
  const minKm = Math.max(policy.absoluteMinKm, targetKm * (1 - hardTolerance));
  const maxKm = Math.min(policy.absoluteMaxKm, targetKm * (1 + hardTolerance));
  if (distanceKm < minKm || distanceKm > maxKm) {
    return { accepted: false, grade: "reject" as const, errorPct, minKm, maxKm };
  }
  if (errorRatio <= 0.15) return { accepted: true, grade: "excellent" as const, errorPct, minKm, maxKm };
  if (errorRatio <= 0.28) return { accepted: true, grade: "good" as const, errorPct, minKm, maxKm };
  return { accepted: true, grade: "acceptable" as const, errorPct, minKm, maxKm };
}

export function outdoorRouteDistanceBand(distanceM: number, sport: OutdoorPerformanceSport): "short" | "medium" | "long" {
  const km = Math.max(0, Number(distanceM || 0) / 1000);
  const bands = outdoorRouteSearchPolicy(sport).distanceBandsKm;
  if (km < bands.shortMax) return "short";
  if (km <= bands.mediumMax) return "medium";
  return "long";
}
