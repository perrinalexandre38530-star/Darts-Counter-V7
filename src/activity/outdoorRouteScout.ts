import { haversineMeters, routeDistanceMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import { discoverOutdoorRoutes, type OutdoorRouteDiscoveryCenter } from "./outdoorRouteDiscovery";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteScoutRequest = {
  center: OutdoorRouteDiscoveryCenter;
  sport: OutdoorPerformanceSport;
  radiusKm?: number;
  targetDistanceKm?: number | null;
  minResults?: number;
};

export type OutdoorRouteScoutResult = {
  routes: RunningRouteTemplate[];
  searchedRadiiKm: number[];
  provider: "openstreetmap-route-scout";
  warnings: string[];
};

const CACHE_KEY = "mss-outdoor-route-scout-v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_RESULTS = 28;

function cacheKey(request: OutdoorRouteScoutRequest) {
  const lat = Math.round(request.center.lat * 50) / 50;
  const lon = Math.round(request.center.lon * 50) / 50;
  const target = request.targetDistanceKm ? Math.round(request.targetDistanceKm) : 0;
  return `${request.sport}:${lat}:${lon}:${Math.round(request.radiusKm || 15)}:${target}`;
}

function readCache(key: string): RunningRouteTemplate[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, { updatedAt: number; routes: RunningRouteTemplate[] }>;
    const row = all?.[key];
    if (!row || Date.now() - Number(row.updatedAt || 0) > CACHE_TTL_MS || !Array.isArray(row.routes)) return null;
    return row.routes;
  } catch { return null; }
}

function writeCache(key: string, routes: RunningRouteTemplate[]) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[key] = { updatedAt: Date.now(), routes: routes.slice(0, MAX_RESULTS) };
    const entries = Object.entries(all).sort((a: any, b: any) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0)).slice(0, 12);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

function firstPoint(route: RunningRouteTemplate) { return route.route?.[0] || null; }
function lastPoint(route: RunningRouteTemplate) { return route.route?.[route.route.length - 1] || null; }

function nearestDistanceM(route: RunningRouteTemplate, center: OutdoorRouteDiscoveryCenter) {
  const target: GeoPoint = { lat: center.lat, lon: center.lon, timestamp: 0 };
  let best = Number.POSITIVE_INFINITY;
  const points = route.route || [];
  const step = Math.max(1, Math.floor(points.length / 80));
  for (let i = 0; i < points.length; i += step) best = Math.min(best, haversineMeters(points[i], target));
  if (points.length) best = Math.min(best, haversineMeters(points[points.length - 1], target));
  return Number.isFinite(best) ? best : 1e9;
}

function isLoop(route: RunningRouteTemplate) {
  const a = firstPoint(route), b = lastPoint(route);
  return !!a && !!b && haversineMeters(a, b) <= Math.max(180, Math.min(650, route.distanceM * 0.035));
}

function geometryQuality(route: RunningRouteTemplate) {
  const points = route.route || [];
  if (points.length < 2) return 0;
  const measured = routeDistanceMeters(points);
  const claimed = Math.max(1, Number(route.distanceM || measured));
  const ratio = measured / claimed;
  let score = 18;
  if (points.length >= 40) score += 8;
  if (points.length >= 100) score += 5;
  if (ratio >= .82 && ratio <= 1.18) score += 7;
  return score;
}

function sportAffinity(route: RunningRouteTemplate, sport: OutdoorPerformanceSport) {
  const name = `${route.name} ${route.network || ""} ${route.routeRef || ""}`.toLowerCase();
  if (sport === "trail" && /(trail|sentier|gr\s?\d|pr\s?\d|hiking|randonn|mountain|mont|crête|ridge)/i.test(name)) return 9;
  if (sport === "running" && /(running|course|fitness|parcours santé|stade)/i.test(name)) return 9;
  if ((sport === "hiking" || sport === "walking" || sport === "nordic-walking") && /(hiking|randonn|gr\s?\d|pr\s?\d|promenade|boucle|sentier)/i.test(name)) return 9;
  return 4;
}

export function scoreScoutedRoute(route: RunningRouteTemplate, request: OutdoorRouteScoutRequest) {
  const reasons: string[] = [];
  let score = geometryQuality(route);
  const rawName = String(route.name || "").trim();
  const generic = !rawName || /^parcours\s+osm/i.test(rawName);
  if (!generic) { score += 14; reasons.push("nom officiel"); }
  if (route.routeRef) { score += 7; reasons.push(`réf. ${route.routeRef}`); }
  if (route.network) { score += 6; reasons.push(`réseau ${route.network}`); }
  if (route.operator) { score += 3; reasons.push("opérateur identifié"); }
  const loop = isLoop(route);
  if (loop) { score += 9; reasons.push("boucle"); }
  score += sportAffinity(route, request.sport);

  const near = nearestDistanceM(route, request.center);
  const safeRadiusM = Math.max(5000, Number(request.radiusKm || 15) * 1000);
  const nearScore = Math.max(0, 15 * (1 - near / safeRadiusM));
  score += nearScore;
  if (near <= 2500) reasons.push("proche de toi");

  if (request.targetDistanceKm && request.targetDistanceKm > 0) {
    const targetM = request.targetDistanceKm * 1000;
    const error = Math.abs(route.distanceM - targetM) / Math.max(1, targetM);
    const distanceScore = Math.max(0, 18 * (1 - error / .75));
    score += distanceScore;
    if (error <= .12) reasons.push("distance très proche");
    else if (error <= .25) reasons.push("distance compatible");
  }

  const clamped = Math.round(Math.max(1, Math.min(100, score)));
  const quality = clamped >= 78 ? "excellent" : clamped >= 58 ? "good" : "fair";
  return { score: clamped, reasons: reasons.slice(0, 4), distanceFromCenterM: Math.round(near), loop, quality } as const;
}

function dedupe(routes: RunningRouteTemplate[]) {
  const seen = new Set<string>();
  const out: RunningRouteTemplate[] = [];
  for (const route of routes) {
    const key = outdoorRouteKey(route);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(route);
  }
  return out;
}

function radiiFor(request: OutdoorRouteScoutRequest) {
  const requested = Math.max(5, Math.min(40, Math.round(request.radiusKm || 15)));
  return [...new Set([Math.min(8, requested), requested, Math.min(25, Math.max(requested, 16)), Math.min(40, Math.max(requested, 30))])]
    .filter((value) => value >= 5)
    .sort((a, b) => a - b);
}

export async function scoutExistingOutdoorRoutes(request: OutdoorRouteScoutRequest): Promise<OutdoorRouteScoutResult> {
  if (!Number.isFinite(request.center.lat) || !Number.isFinite(request.center.lon)) throw new Error("Position invalide.");
  if (request.sport === "treadmill") return { routes: [], searchedRadiiKm: [], provider: "openstreetmap-route-scout", warnings: [] };
  const key = cacheKey(request);
  const cached = readCache(key);
  if (cached?.length) return { routes: cached, searchedRadiiKm: [], provider: "openstreetmap-route-scout", warnings: ["cache"] };

  const minResults = Math.max(6, Math.min(20, Number(request.minResults || 12)));
  const radii = radiiFor(request);
  const gathered: RunningRouteTemplate[] = [];
  const searched: number[] = [];
  const warnings: string[] = [];

  for (const radius of radii) {
    try {
      const result = await discoverOutdoorRoutes(request.center, request.sport, radius);
      searched.push(radius);
      gathered.push(...result.routes);
      if (dedupe(gathered).length >= minResults) break;
    } catch (error: any) {
      warnings.push(String(error?.message || `Échec rayon ${radius} km`));
    }
  }

  const ranked = dedupe(gathered)
    .map((route) => {
      const rankedRoute = scoreScoutedRoute(route, request);
      const relationId = String(route.externalId || "").replace("osm-relation:", "");
      return {
        ...route,
        scout: {
          provider: "openstreetmap-route-scout" as const,
          ...rankedRoute,
          sourceUrl: relationId ? `https://www.openstreetmap.org/relation/${relationId}` : undefined,
          discoveredAt: Date.now(),
        },
      };
    })
    .sort((a, b) => Number(b.scout?.score || 0) - Number(a.scout?.score || 0) || Number(a.scout?.distanceFromCenterM || 1e9) - Number(b.scout?.distanceFromCenterM || 1e9))
    .slice(0, MAX_RESULTS);

  if (ranked.length) writeCache(key, ranked);
  return { routes: ranked, searchedRadiiKm: searched, provider: "openstreetmap-route-scout", warnings };
}
