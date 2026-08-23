import { haversineMeters } from "./activityMath";
import type { ActivityRecord, GeoPoint } from "./activityTypes";

export type RunningSegment = {
  id: string;
  name: string;
  sourceActivityId: string;
  startDistanceM: number;
  endDistanceM: number;
  start: Pick<GeoPoint, "lat" | "lon">;
  end: Pick<GeoPoint, "lat" | "lon">;
  createdAt: number;
};

export type RunningSegmentEffort = {
  activityId: string;
  startedAt: number;
  elapsedMs: number;
  distanceM: number;
};

export const RUNNING_SEGMENTS_KEY = "mss-running-segments-v1";
const MATCH_RADIUS_M = 120;

function makeId() { try { return crypto.randomUUID(); } catch { return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; } }

export function loadRunningSegments(): RunningSegment[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RUNNING_SEGMENTS_KEY) || "[]");
    return (Array.isArray(raw) ? raw : []).filter((row) => row?.id && row?.start && row?.end && Number(row.endDistanceM) > Number(row.startDistanceM));
  } catch { return []; }
}
export function saveRunningSegments(rows: RunningSegment[]) { try { localStorage.setItem(RUNNING_SEGMENTS_KEY, JSON.stringify(rows.slice(0, 40))); } catch {} }
export function upsertRunningSegment(segment: RunningSegment) { const rows = [segment, ...loadRunningSegments().filter((row) => row.id !== segment.id)]; saveRunningSegments(rows); return rows; }
export function removeRunningSegment(id: string) { const rows = loadRunningSegments().filter((row) => row.id !== id); saveRunningSegments(rows); return rows; }

function elapsedAt(point: GeoPoint, activity: ActivityRecord) {
  return Number.isFinite(point.elapsedMs) ? Number(point.elapsedMs) : Math.max(0, point.timestamp - activity.startedAt);
}

function cumulativeRoute(route: GeoPoint[]) {
  const out = [0];
  let total = 0;
  for (let i = 1; i < route.length; i += 1) { total += haversineMeters(route[i - 1], route[i]); out.push(total); }
  return out;
}

function pointNearDistance(route: GeoPoint[], distanceM: number) {
  if (!route.length) return null;
  const cumulative = cumulativeRoute(route);
  let best = 0;
  let delta = Infinity;
  for (let i = 0; i < cumulative.length; i += 1) {
    const d = Math.abs(cumulative[i] - distanceM);
    if (d < delta) { best = i; delta = d; }
  }
  return route[best] || null;
}

export function createSegmentFromActivity(activity: ActivityRecord, name: string, startDistanceM: number, lengthM: number): RunningSegment | null {
  if (!activity.route?.length || activity.route.length < 2) return null;
  const startM = Math.max(0, Math.min(activity.distanceM - 100, startDistanceM));
  const endM = Math.min(activity.distanceM, startM + Math.max(200, lengthM));
  if (endM - startM < 150) return null;
  const start = pointNearDistance(activity.route, startM);
  const end = pointNearDistance(activity.route, endM);
  if (!start || !end) return null;
  return { id: makeId(), name: name.trim().slice(0, 64) || `Segment ${(endM - startM) / 1000} km`, sourceActivityId: activity.id, startDistanceM: startM, endDistanceM: endM, start: { lat: start.lat, lon: start.lon }, end: { lat: end.lat, lon: end.lon }, createdAt: Date.now() };
}

function nearestIndex(route: GeoPoint[], target: Pick<GeoPoint, "lat" | "lon">, from = 0) {
  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let i = Math.max(0, from); i < route.length; i += 1) {
    const distance = haversineMeters(route[i], { ...target, timestamp: 0 });
    if (distance < bestDistance) { bestDistance = distance; bestIndex = i; }
  }
  return bestDistance <= MATCH_RADIUS_M ? { index: bestIndex, distanceM: bestDistance } : null;
}

export function segmentEffort(segment: RunningSegment, activity: ActivityRecord): RunningSegmentEffort | null {
  if (!activity.route?.length || activity.route.length < 2) return null;
  const startMatch = nearestIndex(activity.route, segment.start, 0);
  if (!startMatch) return null;
  const endMatch = nearestIndex(activity.route, segment.end, startMatch.index + 1);
  if (!endMatch || endMatch.index <= startMatch.index) return null;
  const startPoint = activity.route[startMatch.index];
  const endPoint = activity.route[endMatch.index];
  const elapsedMs = elapsedAt(endPoint, activity) - elapsedAt(startPoint, activity);
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return null;
  return { activityId: activity.id, startedAt: activity.startedAt, elapsedMs, distanceM: Math.max(1, segment.endDistanceM - segment.startDistanceM) };
}

export function segmentLeaderboard(segment: RunningSegment, activities: ActivityRecord[]) {
  return activities.map((activity) => segmentEffort(segment, activity)).filter((row): row is RunningSegmentEffort => !!row).sort((a, b) => a.elapsedMs - b.elapsedMs);
}
