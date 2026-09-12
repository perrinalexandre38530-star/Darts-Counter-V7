import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import type { OutdoorRouteGenerationProfile } from "./outdoorRouteGenerator";

export type OutdoorRouteDistanceBand = "short" | "medium" | "long";
export type OutdoorRouteFitGrade = "excellent" | "good" | "acceptable" | "alternative" | "poor";

export type OutdoorRouteSearchPolicy = {
  defaultRadiusKm: number;
  maxRadiusKm: number;
  radiusOptionsKm: number[];
  defaultTargetKm: number;
  distanceOptionsKm: number[];
  absoluteMinKm: number;
  defaultProfile: OutdoorRouteGenerationProfile;
  distanceBandsKm: { shortMax: number; mediumMax: number };
  excellentTolerance: number;
  goodTolerance: number;
  hardTolerance: number;
  relaxedTolerance: number;
};

const POLICIES: Record<OutdoorPerformanceSport, OutdoorRouteSearchPolicy> = {
  running: {
    defaultRadiusKm: 12,
    maxRadiusKm: 45,
    radiusOptionsKm: [5, 10, 15, 25, 35, 45],
    defaultTargetKm: 10,
    distanceOptionsKm: [3, 5, 8, 10, 12, 15, 21.1],
    absoluteMinKm: 1.5,
    defaultProfile: "balanced",
    distanceBandsKm: { shortMax: 6, mediumMax: 15 },
    excellentTolerance: 0.10,
    goodTolerance: 0.22,
    hardTolerance: 0.45,
    relaxedTolerance: 0.62,
  },
  trail: {
    defaultRadiusKm: 18,
    maxRadiusKm: 60,
    radiusOptionsKm: [8, 15, 25, 35, 45, 60],
    defaultTargetKm: 10,
    distanceOptionsKm: [5, 8, 10, 15, 20, 25, 30],
    absoluteMinKm: 2.5,
    defaultProfile: "trails",
    distanceBandsKm: { shortMax: 10, mediumMax: 22 },
    excellentTolerance: 0.12,
    goodTolerance: 0.25,
    hardTolerance: 0.45,
    relaxedTolerance: 0.68,
  },
  hiking: {
    defaultRadiusKm: 18,
    maxRadiusKm: 60,
    radiusOptionsKm: [8, 15, 25, 35, 45, 60],
    defaultTargetKm: 10,
    distanceOptionsKm: [5, 8, 10, 12, 15, 20, 25, 30],
    absoluteMinKm: 2.5,
    defaultProfile: "trails",
    distanceBandsKm: { shortMax: 8, mediumMax: 18 },
    excellentTolerance: 0.12,
    goodTolerance: 0.25,
    hardTolerance: 0.45,
    relaxedTolerance: 0.70,
  },
  walking: {
    defaultRadiusKm: 10,
    maxRadiusKm: 40,
    radiusOptionsKm: [4, 8, 12, 20, 30, 40],
    defaultTargetKm: 6,
    distanceOptionsKm: [2, 3, 5, 6, 8, 10, 12, 15],
    absoluteMinKm: 1,
    defaultProfile: "easy",
    distanceBandsKm: { shortMax: 5, mediumMax: 10 },
    excellentTolerance: 0.10,
    goodTolerance: 0.22,
    hardTolerance: 0.45,
    relaxedTolerance: 0.60,
  },
  "nordic-walking": {
    defaultRadiusKm: 12,
    maxRadiusKm: 45,
    radiusOptionsKm: [5, 10, 15, 25, 35, 45],
    defaultTargetKm: 8,
    distanceOptionsKm: [3, 5, 8, 10, 12, 15, 20],
    absoluteMinKm: 1.5,
    defaultProfile: "balanced",
    distanceBandsKm: { shortMax: 6, mediumMax: 12 },
    excellentTolerance: 0.10,
    goodTolerance: 0.24,
    hardTolerance: 0.45,
    relaxedTolerance: 0.62,
  },
  treadmill: {
    defaultRadiusKm: 0,
    maxRadiusKm: 0,
    radiusOptionsKm: [],
    defaultTargetKm: 5,
    distanceOptionsKm: [3, 5, 8, 10],
    absoluteMinKm: 0,
    defaultProfile: "balanced",
    distanceBandsKm: { shortMax: 5, mediumMax: 10 },
    excellentTolerance: 0.10,
    goodTolerance: 0.22,
    hardTolerance: 0.45,
    relaxedTolerance: 0.60,
  },
};

export function outdoorRouteSearchPolicy(sport: OutdoorPerformanceSport): OutdoorRouteSearchPolicy {
  return POLICIES[sport] || POLICIES.running;
}

export function outdoorRouteDistanceBand(distanceM: number, sport: OutdoorPerformanceSport): OutdoorRouteDistanceBand {
  const policy = outdoorRouteSearchPolicy(sport);
  const km = Math.max(0, Number(distanceM || 0) / 1000);
  if (km < policy.distanceBandsKm.shortMax) return "short";
  if (km < policy.distanceBandsKm.mediumMax) return "medium";
  return "long";
}

export function outdoorRouteDistanceFit(distanceM: number, sport: OutdoorPerformanceSport, targetDistanceKm?: number | null) {
  const policy = outdoorRouteSearchPolicy(sport);
  const distanceKm = Math.max(0, Number(distanceM || 0) / 1000);
  const targetKm = Math.max(0, Number(targetDistanceKm || 0));
  const aboveAbsoluteMinimum = distanceKm >= policy.absoluteMinKm;
  if (!(targetKm > 0)) {
    return {
      accepted: aboveAbsoluteMinimum,
      relaxedAccepted: aboveAbsoluteMinimum,
      grade: aboveAbsoluteMinimum ? "good" as OutdoorRouteFitGrade : "poor" as OutdoorRouteFitGrade,
      deviationRatio: 0,
      deviationPct: 0,
      deltaKm: 0,
    };
  }

  const deltaKm = distanceKm - targetKm;
  const deviationRatio = Math.abs(deltaKm) / Math.max(0.5, targetKm);
  let grade: OutdoorRouteFitGrade = "poor";
  if (deviationRatio <= policy.excellentTolerance) grade = "excellent";
  else if (deviationRatio <= policy.goodTolerance) grade = "good";
  else if (deviationRatio <= policy.hardTolerance) grade = "acceptable";
  else if (deviationRatio <= policy.relaxedTolerance) grade = "alternative";

  return {
    accepted: aboveAbsoluteMinimum && deviationRatio <= policy.hardTolerance,
    relaxedAccepted: aboveAbsoluteMinimum && deviationRatio <= policy.relaxedTolerance,
    grade,
    deviationRatio,
    deviationPct: Math.round(deviationRatio * 100),
    deltaKm,
  };
}
