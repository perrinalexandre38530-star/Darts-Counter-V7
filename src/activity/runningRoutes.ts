import { haversineMeters, routeDistanceMeters } from "./activityMath";
import type { ActivityRecord, ActivitySport, GeoPoint } from "./activityTypes";

export type RunningRouteTemplate = {
  id: string;
  name: string;
  sourceActivityId?: string;
  route: GeoPoint[];
  distanceM: number;
  elevationGainM: number;
  referenceElapsedMs: number;
  createdAt: number;
  source?: "activity" | "gpx" | "tcx" | "fit" | "osm" | "generated";
  scout?: {
    provider: "openstreetmap-route-scout" | "routeyou";
    score: number;
    reasons: string[];
    distanceFromCenterM?: number;
    loop?: boolean;
    quality?: "excellent" | "good" | "fair";
    sourceUrl?: string;
    discoveredAt: number;
  };
  generation?: {
    provider: "openstreetmap-overpass-local-router" | "openrouteservice-round-trip";
    targetDistanceM: number;
    profile: "balanced" | "trails" | "easy";
    shape: "loop" | "out-back";
    distanceErrorPct: number;
    trailSharePct: number;
    overlapPct: number;
    elevationGainMinM?: number;
    elevationGainMaxM?: number;
    elevationErrorM?: number;
    elevationTargetMatched?: boolean;
    elevationSource?: "open-meteo-copernicus-dem" | "embedded";
  };
  externalId?: string;
  network?: string;
  routeRef?: string;
  operator?: string;
  sourceFileName?: string;
  sport?: ActivitySport;
};

const STORAGE_KEY = "mss-running-routes-v1";
const MAX_ROUTES = 40;
const MAX_POINTS_PER_ROUTE = 420;

function safeParse(raw: string | null): RunningRouteTemplate[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.id === "string" && Array.isArray(item.route));
  } catch {
    return [];
  }
}

export function loadRunningRoutes(): RunningRouteTemplate[] {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveRunningRoutes(routes: RunningRouteTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes.slice(0, MAX_ROUTES)));
  } catch {}
}

function simplifyRoute(points: GeoPoint[]): GeoPoint[] {
  if (points.length <= MAX_POINTS_PER_ROUTE) return points.map((point) => ({ ...point }));
  const step = Math.ceil(points.length / MAX_POINTS_PER_ROUTE);
  const output = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
  if (output[output.length - 1] !== points[points.length - 1]) output.push(points[points.length - 1]);
  return output.map((point) => ({ ...point }));
}

function normalizedElapsed(points: GeoPoint[], index: number): number {
  const point = points[index];
  if (Number.isFinite(point?.elapsedMs)) return Math.max(0, Number(point.elapsedMs));
  const firstTs = Number(points[0]?.timestamp || 0);
  return Math.max(0, Number(point?.timestamp || firstTs) - firstTs);
}

export function routeTemplateFromActivity(activity: ActivityRecord, name?: string): RunningRouteTemplate {
  const route = simplifyRoute(activity.route || []);
  const normalized = route.map((point, index) => ({ ...point, elapsedMs: normalizedElapsed(route, index) }));
  const label = name?.trim() || `Parcours ${(activity.distanceM / 1000).toFixed(1)} km`;
  return {
    id: `activity:${activity.id}`,
    name: label,
    sourceActivityId: activity.id,
    route: normalized,
    distanceM: activity.distanceM || routeDistanceMeters(normalized),
    elevationGainM: activity.elevationGainM || 0,
    referenceElapsedMs: activity.elapsedMs || Number(normalized[normalized.length - 1]?.elapsedMs || 0),
    createdAt: activity.startedAt || Date.now(),
    source: "activity",
    sport: activity.sport,
  };
}

export function favoriteRouteFromActivity(activity: ActivityRecord, name?: string): RunningRouteTemplate {
  const base = routeTemplateFromActivity(activity, name);
  return { ...base, id: `route_${activity.id}_${Date.now().toString(36)}`, createdAt: Date.now() };
}

export function upsertRunningRoute(route: RunningRouteTemplate): RunningRouteTemplate[] {
  const current = loadRunningRoutes();
  const next = [route, ...current.filter((item) => item.id !== route.id && (!route.sourceActivityId || item.sourceActivityId !== route.sourceActivityId) && (!route.externalId || item.externalId !== route.externalId))];
  saveRunningRoutes(next);
  return next.slice(0, MAX_ROUTES);
}

export function removeRunningRoute(id: string): RunningRouteTemplate[] {
  const next = loadRunningRoutes().filter((item) => item.id !== id);
  saveRunningRoutes(next);
  return next;
}

export function routeElapsedAtDistance(points: GeoPoint[], targetDistanceM: number): number | null {
  if (!points.length || targetDistanceM < 0) return null;
  if (targetDistanceM === 0) return normalizedElapsed(points, 0);
  let cumulative = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segment = haversineMeters(previous, current);
    if (segment <= 0) continue;
    const nextCumulative = cumulative + segment;
    if (nextCumulative >= targetDistanceM) {
      const ratio = Math.max(0, Math.min(1, (targetDistanceM - cumulative) / segment));
      const startElapsed = normalizedElapsed(points, index - 1);
      const endElapsed = normalizedElapsed(points, index);
      return startElapsed + (endElapsed - startElapsed) * ratio;
    }
    cumulative = nextCumulative;
  }
  return normalizedElapsed(points, points.length - 1);
}

export function ghostDeltaMs(reference: RunningRouteTemplate | null | undefined, liveDistanceM: number, liveElapsedMs: number): number | null {
  if (!reference || reference.route.length < 2 || liveDistanceM < 1 || liveElapsedMs < 1) return null;
  const referenceElapsed = routeElapsedAtDistance(reference.route, Math.min(liveDistanceM, reference.distanceM));
  if (!Number.isFinite(referenceElapsed)) return null;
  return liveElapsedMs - Number(referenceElapsed);
}

export type RunningGhostMatch = {
  deltaMs: number;
  offRouteM: number | null;
  matchedBy: "position" | "distance";
};

export function ghostMatch(
  reference: RunningRouteTemplate | null | undefined,
  currentPoint: GeoPoint | null | undefined,
  liveDistanceM: number,
  liveElapsedMs: number,
): RunningGhostMatch | null {
  if (!reference || reference.route.length < 2 || liveElapsedMs < 1) return null;

  if (currentPoint) {
    let nearestIndex = -1;
    let nearestMeters = Number.POSITIVE_INFINITY;
    for (let index = 0; index < reference.route.length; index += 1) {
      const distance = haversineMeters(currentPoint, reference.route[index]);
      if (distance < nearestMeters) {
        nearestMeters = distance;
        nearestIndex = index;
      }
    }
    if (nearestIndex >= 0 && nearestMeters <= 120) {
      const referenceElapsed = normalizedElapsed(reference.route, nearestIndex);
      return { deltaMs: liveElapsedMs - referenceElapsed, offRouteM: nearestMeters, matchedBy: "position" };
    }
  }

  const fallback = ghostDeltaMs(reference, liveDistanceM, liveElapsedMs);
  if (fallback == null) return null;
  return { deltaMs: fallback, offRouteM: currentPoint ? null : null, matchedBy: "distance" };
}

export function routeStartDistanceMeters(a: RunningRouteTemplate, b: RunningRouteTemplate): number | null {
  const a0 = a.route[0];
  const b0 = b.route[0];
  if (!a0 || !b0) return null;
  return haversineMeters(a0, b0);
}
