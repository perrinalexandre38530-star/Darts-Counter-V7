import { elevationGainMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import type { RunningRouteTemplate } from "./runningRoutes";

const CACHE_KEY = "mss-route-elevation-cache-v1";
const MAX_CACHE = 30;
const MAX_SAMPLES = 100;

type ElevationCacheRow = { routeKey: string; altitudes: number[]; pointCount: number; updatedAt: number };

function loadCache(): ElevationCacheRow[] {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch { return []; }
}

function saveCache(rows: ElevationCacheRow[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows.slice(0, MAX_CACHE))); } catch {}
}

function sampleIndices(length: number) {
  if (length <= MAX_SAMPLES) return Array.from({ length }, (_, index) => index);
  const out = new Set<number>([0, length - 1]);
  for (let i = 1; i < MAX_SAMPLES - 1; i += 1) out.add(Math.round((i / (MAX_SAMPLES - 1)) * (length - 1)));
  return [...out].sort((a, b) => a - b);
}

function applySamples(points: GeoPoint[], indices: number[], altitudes: number[]) {
  const next = points.map((point) => ({ ...point }));
  for (let sampleIndex = 0; sampleIndex < indices.length; sampleIndex += 1) {
    const pointIndex = indices[sampleIndex];
    if (pointIndex == null) continue;
    const altitude = Number(altitudes[sampleIndex]);
    const point = next[pointIndex];
    if (Number.isFinite(altitude) && point) point.altitude = altitude;
  }
  for (let segment = 1; segment < indices.length; segment += 1) {
    const aIndex = indices[segment - 1];
    const bIndex = indices[segment];
    if (aIndex == null || bIndex == null) continue;
    const aAlt = Number(next[aIndex]?.altitude);
    const bAlt = Number(next[bIndex]?.altitude);
    if (!Number.isFinite(aAlt) || !Number.isFinite(bAlt) || bIndex <= aIndex + 1) continue;
    for (let index = aIndex + 1; index < bIndex; index += 1) {
      const ratio = (index - aIndex) / (bIndex - aIndex);
      const point = next[index];
      if (point) point.altitude = aAlt + (bAlt - aAlt) * ratio;
    }
  }
  return next;
}

export function routeHasElevation(route: RunningRouteTemplate) {
  return (route.route || []).filter((point) => Number.isFinite(point.altitude)).length >= Math.min(6, Math.max(2, Math.round((route.route?.length || 0) * .2)));
}

export async function enrichOutdoorRouteElevation(route: RunningRouteTemplate): Promise<RunningRouteTemplate> {
  if (!route.route?.length || routeHasElevation(route)) return route;
  const routeKey = outdoorRouteKey(route);
  const cached = loadCache().find((row) => row.routeKey === routeKey && row.pointCount === route.route.length && row.altitudes.length === route.route.length);
  if (cached) {
    const cachedRoute = route.route.map((point, index) => ({ ...point, altitude: Number(cached.altitudes[index]) }));
    return { ...route, route: cachedRoute, elevationGainM: elevationGainMeters(cachedRoute) };
  }

  const indices = sampleIndices(route.route.length);
  const sampledPoints = indices.map((index) => route.route[index]).filter((point): point is GeoPoint => !!point);
  if (sampledPoints.length !== indices.length) throw new Error("Elevation sampling invalid");
  const latitude = sampledPoints.map((point) => Number(point.lat).toFixed(6)).join(",");
  const longitude = sampledPoints.map((point) => Number(point.lon).toFixed(6)).join(",");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Elevation HTTP ${response.status}`);
    const json = await response.json();
    const elevations = Array.isArray(json?.elevation) ? json.elevation.map(Number) : [];
    if (elevations.length !== indices.length || elevations.some((value: number) => !Number.isFinite(value))) throw new Error("Elevation response invalid");
    const enriched = applySamples(route.route, indices, elevations);
    const altitudes = enriched.map((point) => Number(point.altitude || 0));
    const current = loadCache().filter((row) => row.routeKey !== routeKey);
    saveCache([{ routeKey, altitudes, pointCount: enriched.length, updatedAt: Date.now() }, ...current]);
    return { ...route, route: enriched, elevationGainM: elevationGainMeters(enriched) };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function enrichOutdoorRoutesElevation(routes: RunningRouteTemplate[], concurrency = 3): Promise<RunningRouteTemplate[]> {
  if (!routes.length) return [];
  const safeConcurrency = Math.max(1, Math.min(4, Math.round(concurrency || 1)));
  const output = new Array<RunningRouteTemplate>(routes.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= routes.length) return;
      const route = routes[index];
      try {
        output[index] = await enrichOutdoorRouteElevation(route);
      } catch {
        output[index] = route;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(safeConcurrency, routes.length) }, () => worker()));
  return output;
}
