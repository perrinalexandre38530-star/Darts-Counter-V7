import { haversineMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import type { OutdoorCustomWaypoint } from "./outdoorRouteExtras";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteCheckpoint = {
  id: string;
  distanceM: number;
  altitudeM?: number;
  kind: "distance" | "high-point" | "finish" | "custom";
  name?: string;
  icon?: string;
  customKind?: OutdoorCustomWaypoint["kind"];
};

export type OutdoorAheadProfile = {
  horizonM: number;
  gainM: number;
  lossM: number;
  netElevationM: number;
  avgGradePct: number;
  maxGradePct: number;
  startAltitudeM: number | null;
  endAltitudeM: number | null;
};

export type OutdoorRouteProgress = {
  matchedDistanceM: number;
  remainingM: number;
  progressPct: number;
  offRouteM: number | null;
  offRouteAlert: boolean;
  matchedBy: "position" | "distance";
  etaMs: number | null;
  expectedTotalMs: number;
  nextCheckpoint: OutdoorRouteCheckpoint | null;
  nextCheckpointDistanceM: number | null;
  verticalSpeedMPerHour: number | null;
  ahead: OutdoorAheadProfile;
};

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

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

export function cumulativeOutdoorRouteDistances(points: GeoPoint[]): number[] {
  const result = new Array(points.length).fill(0);
  for (let index = 1; index < points.length; index += 1) result[index] = result[index - 1] + haversineMeters(points[index - 1], points[index]);
  return result;
}

function customIcon(kind: OutdoorCustomWaypoint["kind"]) {
  if (kind === "water") return "💧";
  if (kind === "food") return "🥪";
  if (kind === "shelter") return "🏕️";
  if (kind === "summit") return "⛰️";
  if (kind === "danger") return "⚠️";
  return "📍";
}

export function buildOutdoorRouteCheckpoints(route: RunningRouteTemplate, sport: OutdoorPerformanceSport, customWaypoints: OutdoorCustomWaypoint[] = []): OutdoorRouteCheckpoint[] {
  const total = Math.max(0, Number(route.distanceM || 0));
  if (total < 100) return [];
  const spacing = sport === "walking" || sport === "nordic-walking" ? 3000 : 5000;
  const checkpoints: OutdoorRouteCheckpoint[] = [];
  for (let distanceM = spacing; distanceM < total - 350; distanceM += spacing) checkpoints.push({ id: `km-${Math.round(distanceM)}`, distanceM, kind: "distance" });

  const points = route.route || [];
  const distances = cumulativeOutdoorRouteDistances(points);
  let highIndex = -1;
  let highAltitude = Number.NEGATIVE_INFINITY;
  points.forEach((point, index) => {
    if (Number.isFinite(point.altitude) && Number(point.altitude) > highAltitude) { highAltitude = Number(point.altitude); highIndex = index; }
  });
  if (highIndex >= 0 && highAltitude > Number.NEGATIVE_INFINITY) {
    const highDistance = distances[highIndex] || 0;
    if (highDistance > 500 && highDistance < total - 500 && !checkpoints.some((item) => Math.abs(item.distanceM - highDistance) < 700)) checkpoints.push({ id: "high-point", distanceM: highDistance, altitudeM: highAltitude, kind: "high-point" });
  }

  for (const waypoint of customWaypoints) {
    if (!waypoint || waypoint.routeId !== route.id) continue;
    checkpoints.push({ id: waypoint.id, distanceM: clamp(waypoint.distanceM, 0, total), kind: "custom", name: waypoint.name, icon: customIcon(waypoint.kind), customKind: waypoint.kind });
  }

  checkpoints.push({ id: "finish", distanceM: total, kind: "finish" });
  return checkpoints.sort((a, b) => a.distanceM - b.distanceM);
}

function routeDistanceAtNearestPoint(route: RunningRouteTemplate, currentPoint: GeoPoint): { distanceM: number; offRouteM: number; index: number } | null {
  const points = route.route || [];
  if (!points.length) return null;
  const distances = cumulativeOutdoorRouteDistances(points);
  let nearestIndex = -1;
  let nearestM = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const meters = haversineMeters(currentPoint, point);
    if (meters < nearestM) { nearestM = meters; nearestIndex = index; }
  });
  if (nearestIndex < 0) return null;
  return { distanceM: distances[nearestIndex] || 0, offRouteM: nearestM, index: nearestIndex };
}

function pointAtDistance(points: GeoPoint[], distances: number[], targetM: number) {
  if (!points.length) return null;
  let index = distances.findIndex((value) => value >= targetM);
  if (index < 0) index = points.length - 1;
  return { point: points[index], index };
}

export function analyzeOutdoorRouteAhead(route: RunningRouteTemplate, fromDistanceM: number, horizonM = 2000): OutdoorAheadProfile {
  const points = route.route || [];
  const distances = cumulativeOutdoorRouteDistances(points);
  const start = pointAtDistance(points, distances, Math.max(0, fromDistanceM));
  const end = pointAtDistance(points, distances, Math.min(Number(route.distanceM || 0), fromDistanceM + horizonM));
  if (!start || !end || end.index <= start.index) return { horizonM: 0, gainM: 0, lossM: 0, netElevationM: 0, avgGradePct: 0, maxGradePct: 0, startAltitudeM: null, endAltitudeM: null };
  let gainM = 0, lossM = 0, maxGradePct = 0;
  for (let i = start.index + 1; i <= end.index; i += 1) {
    const prev = points[i - 1], cur = points[i];
    if (!Number.isFinite(prev?.altitude) || !Number.isFinite(cur?.altitude)) continue;
    const delta = Number(cur.altitude) - Number(prev.altitude);
    if (delta > 0) gainM += delta; else lossM += Math.abs(delta);
    const segmentM = Math.max(1, haversineMeters(prev, cur));
    maxGradePct = Math.max(maxGradePct, delta / segmentM * 100);
  }
  const actualHorizonM = Math.max(0, (distances[end.index] || 0) - (distances[start.index] || 0));
  const startAltitudeM = Number.isFinite(points[start.index]?.altitude) ? Number(points[start.index].altitude) : null;
  const endAltitudeM = Number.isFinite(points[end.index]?.altitude) ? Number(points[end.index].altitude) : null;
  const netElevationM = startAltitudeM != null && endAltitudeM != null ? endAltitudeM - startAltitudeM : gainM - lossM;
  return { horizonM: actualHorizonM, gainM, lossM, netElevationM, avgGradePct: actualHorizonM > 0 ? netElevationM / actualHorizonM * 100 : 0, maxGradePct, startAltitudeM, endAltitudeM };
}

function remainingElevationGain(route: RunningRouteTemplate, fromDistanceM: number) {
  const remaining = Math.max(0, Number(route.distanceM || 0) - fromDistanceM);
  if (remaining <= 0) return 0;
  return analyzeOutdoorRouteAhead(route, fromDistanceM, remaining).gainM;
}

export function outdoorRouteProgress(route: RunningRouteTemplate, sport: OutdoorPerformanceSport, liveDistanceM: number, elapsedMs: number, currentPoint?: GeoPoint | null, liveElevationGainM = 0, customWaypoints: OutdoorCustomWaypoint[] = [], offRouteAlertM = 120): OutdoorRouteProgress {
  const total = Math.max(1, Number(route.distanceM || 0));
  const position = currentPoint ? routeDistanceAtNearestPoint(route, currentPoint) : null;
  const usePosition = !!position && position.offRouteM <= Math.max(220, offRouteAlertM * 1.8);
  const matchedDistanceM = clamp(usePosition ? position!.distanceM : liveDistanceM, 0, total);
  const remainingM = Math.max(0, total - matchedDistanceM);
  const progressPct = clamp(matchedDistanceM / total * 100, 0, 100);
  const currentSpeedMps = elapsedMs > 30_000 && matchedDistanceM > 100 ? matchedDistanceM / (elapsedMs / 1000) : 0;
  const fallbackSpeedMps = total / Math.max(1, estimateOutdoorRouteDurationMs(route, sport) / 1000);
  const effectiveSpeedMps = currentSpeedMps > 0.5 ? currentSpeedMps : fallbackSpeedMps;
  const flatEtaMs = effectiveSpeedMps > 0 ? Math.max(0, remainingM / effectiveSpeedMps * 1000) : null;
  const remainingGainM = remainingElevationGain(route, matchedDistanceM);
  const reliefPenaltyMs = remainingGainM / 100 * elevationPenaltyMinutesPer100M(sport) * 60_000;
  const etaMs = flatEtaMs == null ? null : flatEtaMs + reliefPenaltyMs * 0.55;
  const checkpoints = buildOutdoorRouteCheckpoints(route, sport, customWaypoints);
  const nextCheckpoint = checkpoints.find((checkpoint) => checkpoint.distanceM > matchedDistanceM + 30) || null;
  const verticalSpeedMPerHour = elapsedMs >= 5 * 60_000 && liveElevationGainM > 0 ? liveElevationGainM / (elapsedMs / 3_600_000) : null;
  const ahead = analyzeOutdoorRouteAhead(route, matchedDistanceM, Math.min(2000, remainingM));
  const offRouteM = position?.offRouteM ?? null;

  return {
    matchedDistanceM, remainingM, progressPct, offRouteM,
    offRouteAlert: offRouteM != null && offRouteM > offRouteAlertM,
    matchedBy: usePosition ? "position" : "distance",
    etaMs, expectedTotalMs: estimateOutdoorRouteDurationMs(route, sport), nextCheckpoint,
    nextCheckpointDistanceM: nextCheckpoint ? Math.max(0, nextCheckpoint.distanceM - matchedDistanceM) : null,
    verticalSpeedMPerHour, ahead,
  };
}
