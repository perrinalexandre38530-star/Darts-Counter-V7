import { clampRunningNumber as clamp } from "./runningShared";
import { haversineMeters } from "./activityMath";
import type { ActivityRecord, GeoPoint } from "./activityTypes";
import { analyzeRunningTerrain } from "./runningElevation";

export type RunningPerformanceBand = "excellent" | "strong" | "steady" | "easy" | "slow";

export type RunningPerformanceSegment = {
  index: number;
  startIndex: number;
  endIndex: number;
  startDistanceM: number;
  endDistanceM: number;
  distanceM: number;
  elapsedMs: number;
  speedKmh: number;
  paceSecPerKm: number | null;
  elevationDeltaM: number;
  gainM: number;
  lossM: number;
  avgGradePct: number;
  score: number;
  band: RunningPerformanceBand;
  color: string;
};

export type RunningRouteEdgePerformance = {
  startIndex: number;
  endIndex: number;
  speedKmh: number | null;
  score: number | null;
  color: string;
};

export type RunningActivityAnalytics = {
  segmentLengthM: number;
  segments: RunningPerformanceSegment[];
  routeEdges: RunningRouteEdgePerformance[];
  maxSpeedKmh: number | null;
  minMovingSpeedKmh: number | null;
  medianSpeedKmh: number | null;
  speedVariabilityPct: number | null;
  movingRatioPct: number;
  stoppedMs: number;
  bestAccuracyM: number | null;
  avgAccuracyM: number | null;
  altitudeRangeM: number | null;
  maxUphillGradePct: number | null;
  maxDownhillGradePct: number | null;
  verticalSpeedMph: number | null;
  fastestSegment: RunningPerformanceSegment | null;
  slowestSegment: RunningPerformanceSegment | null;
  zoneDistanceM: Record<RunningPerformanceBand, number>;
};

export const RUNNING_PERFORMANCE_COLORS: Record<RunningPerformanceBand, string> = {
  excellent: "#38f58a",
  strong: "#55dfff",
  steady: "#ffd45a",
  easy: "#ff9f55",
  slow: "#ff5e72",
};

function percentile(values: number[], q: number) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * q, 0, sorted.length - 1);
  const low = Math.floor(index), high = Math.ceil(index);
  if (low === high) return sorted[low];
  const ratio = index - low;
  return sorted[low] * (1 - ratio) + sorted[high] * ratio;
}
function median(values: number[]) { return percentile(values, .5); }
function elapsedAt(points: GeoPoint[], index: number) {
  const row = points[index];
  if (Number.isFinite(row?.elapsedMs)) return Math.max(0, Number(row.elapsedMs));
  const first = Number(points[0]?.timestamp || 0), current = Number(row?.timestamp || 0);
  return first > 0 && current >= first ? current - first : null;
}
function cumulativeDistances(points: GeoPoint[]) {
  const out = new Array<number>(points.length).fill(0);
  for (let i = 1; i < points.length; i += 1) out[i] = out[i - 1] + haversineMeters(points[i - 1], points[i]);
  return out;
}
function nearestIndexAtDistance(distances: number[], target: number) {
  if (!distances.length) return 0;
  let lo = 0, hi = distances.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (distances[mid] < target) lo = mid + 1; else hi = mid;
  }
  if (lo > 0 && Math.abs(distances[lo - 1] - target) < Math.abs(distances[lo] - target)) return lo - 1;
  return lo;
}
function chooseSegmentLength(totalDistanceM: number) {
  if (totalDistanceM < 1500) return 100;
  if (totalDistanceM < 4000) return 200;
  if (totalDistanceM < 10000) return 500;
  return 1000;
}
function bandForScore(score: number): RunningPerformanceBand {
  if (score >= 82) return "excellent";
  if (score >= 64) return "strong";
  if (score >= 42) return "steady";
  if (score >= 22) return "easy";
  return "slow";
}
function rankScore(value: number, values: number[]) {
  if (values.length < 2) return 50;
  const sorted = values.slice().sort((a, b) => a - b);
  let lowerOrEqual = 0;
  for (const row of sorted) if (row <= value) lowerOrEqual += 1;
  return Math.round(clamp((lowerOrEqual - .5) / sorted.length * 100, 0, 100));
}
function altitudeAt(points: GeoPoint[], index: number) {
  const direct = Number(points[index]?.altitude);
  if (Number.isFinite(direct)) return direct;
  for (let radius = 1; radius <= 4; radius += 1) {
    const a = Number(points[index - radius]?.altitude), b = Number(points[index + radius]?.altitude);
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
    if (Number.isFinite(a)) return a;
    if (Number.isFinite(b)) return b;
  }
  return null;
}
function localEdgeSpeedKmh(points: GeoPoint[], distances: number[], index: number) {
  const from = Math.max(0, index - 2), to = Math.min(points.length - 1, index + 2);
  const startElapsed = elapsedAt(points, from), endElapsed = elapsedAt(points, to);
  const distanceM = Math.max(0, distances[to] - distances[from]);
  if (startElapsed != null && endElapsed != null && endElapsed > startElapsed && distanceM >= 3) {
    const speed = distanceM / ((endElapsed - startElapsed) / 1000) * 3.6;
    if (Number.isFinite(speed) && speed > .3 && speed < 80) return speed;
  }
  const native = Number(points[index]?.speed);
  return Number.isFinite(native) && native > .08 && native < 22 ? native * 3.6 : null;
}

export function buildRunningActivityAnalytics(activity: ActivityRecord): RunningActivityAnalytics {
  const points = (activity.route || []).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  const distances = cumulativeDistances(points);
  const totalDistanceM = distances[distances.length - 1] || Number(activity.distanceM || 0);
  const segmentLengthM = chooseSegmentLength(totalDistanceM);
  const rawSegments: Omit<RunningPerformanceSegment, "score" | "band" | "color">[] = [];

  if (points.length >= 2 && totalDistanceM >= 40) {
    for (let startDistanceM = 0, segmentIndex = 1; startDistanceM < totalDistanceM - 20; startDistanceM += segmentLengthM, segmentIndex += 1) {
      const endDistanceM = Math.min(totalDistanceM, startDistanceM + segmentLengthM);
      const startIndex = nearestIndexAtDistance(distances, startDistanceM);
      const endIndex = Math.max(startIndex + 1, nearestIndexAtDistance(distances, endDistanceM));
      if (!points[endIndex]) break;
      const actualDistance = Math.max(0, distances[endIndex] - distances[startIndex]);
      const startElapsed = elapsedAt(points, startIndex), endElapsed = elapsedAt(points, endIndex);
      const elapsedMs = startElapsed != null && endElapsed != null ? Math.max(0, endElapsed - startElapsed) : 0;
      if (actualDistance < Math.min(30, segmentLengthM * .35) || elapsedMs < 1000) continue;
      const speedKmh = actualDistance / (elapsedMs / 1000) * 3.6;
      if (!Number.isFinite(speedKmh) || speedKmh <= .3 || speedKmh > 80) continue;
      let gainM = 0, lossM = 0;
      let previousAltitude = altitudeAt(points, startIndex);
      for (let i = startIndex + 1; i <= endIndex; i += 1) {
        const altitude = altitudeAt(points, i);
        if (altitude == null || previousAltitude == null) { previousAltitude = altitude; continue; }
        const delta = altitude - previousAltitude;
        if (delta > 1) gainM += delta; else if (delta < -1) lossM += Math.abs(delta);
        previousAltitude = altitude;
      }
      const startAlt = altitudeAt(points, startIndex), endAlt = altitudeAt(points, endIndex);
      const elevationDeltaM = startAlt != null && endAlt != null ? endAlt - startAlt : 0;
      rawSegments.push({
        index: segmentIndex,
        startIndex,
        endIndex,
        startDistanceM: distances[startIndex],
        endDistanceM: distances[endIndex],
        distanceM: actualDistance,
        elapsedMs,
        speedKmh,
        paceSecPerKm: speedKmh > .1 ? 3600 / speedKmh : null,
        elevationDeltaM,
        gainM,
        lossM,
        avgGradePct: actualDistance >= 20 ? elevationDeltaM / actualDistance * 100 : 0,
      });
    }
  }

  const segmentSpeeds = rawSegments.map((segment) => segment.speedKmh);
  const segments: RunningPerformanceSegment[] = rawSegments.map((segment) => {
    const score = rankScore(segment.speedKmh, segmentSpeeds);
    const band = bandForScore(score);
    return { ...segment, score, band, color: RUNNING_PERFORMANCE_COLORS[band] };
  });

  const edgeSpeeds: Array<number | null> = points.map((_, index) => index === 0 ? null : localEdgeSpeedKmh(points, distances, index));
  const validEdges = edgeSpeeds.filter((value): value is number => value != null && value > .3);
  const routeEdges: RunningRouteEdgePerformance[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const speed = edgeSpeeds[index];
    if (speed == null || validEdges.length < 2) routeEdges.push({ startIndex: index - 1, endIndex: index, speedKmh: speed, score: null, color: "#55dfff" });
    else {
      const score = rankScore(speed, validEdges), band = bandForScore(score);
      routeEdges.push({ startIndex: index - 1, endIndex: index, speedKmh: speed, score, color: RUNNING_PERFORMANCE_COLORS[band] });
    }
  }

  const reliableMaxSpeed = percentile(validEdges, .95);
  const reliableMinSpeed = percentile(validEdges, .10);
  const medianSpeedKmh = median(validEdges);
  const mean = validEdges.length ? validEdges.reduce((sum, value) => sum + value, 0) / validEdges.length : null;
  const stdev = mean != null && validEdges.length > 1 ? Math.sqrt(validEdges.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / validEdges.length) : null;
  const speedVariabilityPct = mean && stdev != null ? stdev / mean * 100 : null;
  const accuracy = points.map((point) => Number(point.accuracy)).filter((value) => Number.isFinite(value) && value > 0 && value < 500);
  const terrain = analyzeRunningTerrain(points);
  const minDownhill = terrain.samples.length ? Math.min(...terrain.samples.map((sample) => sample.gradePct)) : null;
  const maxUphill = terrain.samples.length ? Math.max(...terrain.samples.map((sample) => sample.gradePct)) : null;
  const movingMs = Math.max(0, Number(activity.movingMs || 0));
  const elapsedMs = Math.max(movingMs, Number(activity.elapsedMs || 0));
  const stoppedMs = Math.max(0, elapsedMs - movingMs);
  const verticalSpeedMph = movingMs > 0 && terrain.gainM > 0 ? terrain.gainM / (movingMs / 3_600_000) : null;
  const zoneDistanceM: Record<RunningPerformanceBand, number> = { excellent: 0, strong: 0, steady: 0, easy: 0, slow: 0 };
  for (const segment of segments) zoneDistanceM[segment.band] += segment.distanceM;

  return {
    segmentLengthM,
    segments,
    routeEdges,
    maxSpeedKmh: reliableMaxSpeed,
    minMovingSpeedKmh: reliableMinSpeed,
    medianSpeedKmh,
    speedVariabilityPct,
    movingRatioPct: elapsedMs > 0 ? clamp(movingMs / elapsedMs * 100, 0, 100) : 0,
    stoppedMs,
    bestAccuracyM: accuracy.length ? Math.min(...accuracy) : null,
    avgAccuracyM: accuracy.length ? accuracy.reduce((sum, value) => sum + value, 0) / accuracy.length : null,
    altitudeRangeM: terrain.minAltitudeM != null && terrain.maxAltitudeM != null ? terrain.maxAltitudeM - terrain.minAltitudeM : null,
    maxUphillGradePct: maxUphill,
    maxDownhillGradePct: minDownhill,
    verticalSpeedMph,
    fastestSegment: segments.length ? segments.reduce((best, row) => row.speedKmh > best.speedKmh ? row : best, segments[0]) : null,
    slowestSegment: segments.length ? segments.reduce((worst, row) => row.speedKmh < worst.speedKmh ? row : worst, segments[0]) : null,
    zoneDistanceM,
  };
}

export function performanceBandLabel(band: RunningPerformanceBand, lang: string) {
  const row: Record<RunningPerformanceBand, [string, string, string]> = {
    excellent: ["TRÈS FORT", "FASTEST", "MUY FUERTE"],
    strong: ["FORT", "STRONG", "FUERTE"],
    steady: ["RÉGULIER", "STEADY", "REGULAR"],
    easy: ["CALME", "EASY", "SUAVE"],
    slow: ["LENT", "SLOW", "LENTO"],
  };
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? row[band][1] : lower.startsWith("es") ? row[band][2] : row[band][0];
}
