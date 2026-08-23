import { haversineMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteCheckpoint = {
  id: string;
  distanceM: number;
  altitudeM?: number;
  kind: "distance" | "high-point" | "finish";
};

export type OutdoorRouteProgress = {
  matchedDistanceM: number;
  remainingM: number;
  progressPct: number;
  offRouteM: number | null;
  matchedBy: "position" | "distance";
  etaMs: number | null;
  expectedTotalMs: number;
  nextCheckpoint: OutdoorRouteCheckpoint | null;
  verticalSpeedMPerHour: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function baseSpeedKmh(sport: OutdoorPerformanceSport) {
  if (sport === "trail") return 7.5;
  if (sport === "hiking") return 4.5;
  if (sport === "walking") return 5.0;
  if (sport === "nordic-walking") return 5.6;
  if (sport === "treadmill") return 8.5;
  return 9.5;
}

function elevationPenaltyMinutesPer100M(sport: OutdoorPerformanceSport) {
  if (sport === "trail") return 7;
  if (sport === "hiking") return 10;
  if (sport === "walking" || sport === "nordic-walking") return 8;
  return 5;
}

export function estimateOutdoorRouteDurationMs(route: RunningRouteTemplate, sport: OutdoorPerformanceSport): number {
  const speedMps = Math.max(0.6, baseSpeedKmh(sport) / 3.6);
  const flatMs = Math.max(0, Number(route.distanceM || 0)) / speedMps * 1000;
  const elevationMs = Math.max(0, Number(route.elevationGainM || 0)) / 100 * elevationPenaltyMinutesPer100M(sport) * 60_000;
  return Math.max(60_000, flatMs + elevationMs);
}

function cumulativeDistances(points: GeoPoint[]): number[] {
  const result = new Array(points.length).fill(0);
  for (let index = 1; index < points.length; index += 1) {
    result[index] = result[index - 1] + haversineMeters(points[index - 1], points[index]);
  }
  return result;
}

export function buildOutdoorRouteCheckpoints(route: RunningRouteTemplate, sport: OutdoorPerformanceSport): OutdoorRouteCheckpoint[] {
  const total = Math.max(0, Number(route.distanceM || 0));
  if (total < 100) return [];
  const spacing = sport === "walking" || sport === "nordic-walking" ? 3000 : sport === "trail" || sport === "hiking" ? 5000 : 5000;
  const checkpoints: OutdoorRouteCheckpoint[] = [];
  for (let distanceM = spacing; distanceM < total - 350; distanceM += spacing) {
    checkpoints.push({ id: `km-${Math.round(distanceM)}`, distanceM, kind: "distance" });
  }

  const points = route.route || [];
  const distances = cumulativeDistances(points);
  let highIndex = -1;
  let highAltitude = Number.NEGATIVE_INFINITY;
  points.forEach((point, index) => {
    if (Number.isFinite(point.altitude) && Number(point.altitude) > highAltitude) {
      highAltitude = Number(point.altitude);
      highIndex = index;
    }
  });
  if (highIndex >= 0 && highAltitude > Number.NEGATIVE_INFINITY) {
    const highDistance = distances[highIndex] || 0;
    if (highDistance > 500 && highDistance < total - 500 && !checkpoints.some((item) => Math.abs(item.distanceM - highDistance) < 700)) {
      checkpoints.push({ id: "high-point", distanceM: highDistance, altitudeM: highAltitude, kind: "high-point" });
    }
  }

  checkpoints.push({ id: "finish", distanceM: total, kind: "finish" });
  return checkpoints.sort((a, b) => a.distanceM - b.distanceM);
}

function routeDistanceAtNearestPoint(route: RunningRouteTemplate, currentPoint: GeoPoint): { distanceM: number; offRouteM: number } | null {
  const points = route.route || [];
  if (!points.length) return null;
  const distances = cumulativeDistances(points);
  let nearestIndex = -1;
  let nearestM = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const meters = haversineMeters(currentPoint, point);
    if (meters < nearestM) {
      nearestM = meters;
      nearestIndex = index;
    }
  });
  if (nearestIndex < 0) return null;
  return { distanceM: distances[nearestIndex] || 0, offRouteM: nearestM };
}

export function outdoorRouteProgress(
  route: RunningRouteTemplate,
  sport: OutdoorPerformanceSport,
  liveDistanceM: number,
  elapsedMs: number,
  currentPoint?: GeoPoint | null,
  liveElevationGainM = 0,
): OutdoorRouteProgress {
  const total = Math.max(1, Number(route.distanceM || 0));
  const position = currentPoint ? routeDistanceAtNearestPoint(route, currentPoint) : null;
  const usePosition = !!position && position.offRouteM <= 220;
  const matchedDistanceM = clamp(usePosition ? position!.distanceM : liveDistanceM, 0, total);
  const remainingM = Math.max(0, total - matchedDistanceM);
  const progressPct = clamp(matchedDistanceM / total * 100, 0, 100);
  const currentSpeedMps = elapsedMs > 30_000 && liveDistanceM > 100 ? liveDistanceM / (elapsedMs / 1000) : 0;
  const fallbackSpeedMps = total / Math.max(1, estimateOutdoorRouteDurationMs(route, sport) / 1000);
  const effectiveSpeedMps = currentSpeedMps > 0.5 ? currentSpeedMps : fallbackSpeedMps;
  const etaMs = effectiveSpeedMps > 0 ? Math.max(0, remainingM / effectiveSpeedMps * 1000) : null;
  const checkpoints = buildOutdoorRouteCheckpoints(route, sport);
  const nextCheckpoint = checkpoints.find((checkpoint) => checkpoint.distanceM > matchedDistanceM + 30) || null;
  const verticalSpeedMPerHour = elapsedMs >= 5 * 60_000 && liveElevationGainM > 0
    ? liveElevationGainM / (elapsedMs / 3_600_000)
    : null;

  return {
    matchedDistanceM,
    remainingM,
    progressPct,
    offRouteM: position?.offRouteM ?? null,
    matchedBy: usePosition ? "position" : "distance",
    etaMs,
    expectedTotalMs: estimateOutdoorRouteDurationMs(route, sport),
    nextCheckpoint,
    verticalSpeedMPerHour,
  };
}
