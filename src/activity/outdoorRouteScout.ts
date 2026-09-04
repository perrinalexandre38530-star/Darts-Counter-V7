import { haversineMeters, routeDistanceMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import { discoverOutdoorRoutes, type OutdoorRouteDiscoveryCenter } from "./outdoorRouteDiscovery";
import { generateOutdoorRoutes, type OutdoorRouteGenerationProfile, type OutdoorRouteGenerationShape } from "./outdoorRouteGenerator";
import { fetchNearbyCommunityRoutes } from "./outdoorPublicRoutes";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import { outdoorRouteDistanceFit, outdoorRouteSearchPolicy } from "./outdoorRouteSearchPolicy";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteScoutRequest = {
  center: OutdoorRouteDiscoveryCenter;
  sport: OutdoorPerformanceSport;
  radiusKm?: number;
  targetDistanceKm?: number | null;
  minResults?: number;
  profile?: OutdoorRouteGenerationProfile;
  shape?: OutdoorRouteGenerationShape;
};

export type OutdoorRouteScoutResult = {
  routes: RunningRouteTemplate[];
  searchedRadiiKm: number[];
  provider: "openstreetmap-route-scout";
  warnings: string[];
};

const CACHE_KEY = "mss-outdoor-route-scout-v3";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_RESULTS = 48;

function cacheKey(request: OutdoorRouteScoutRequest) {
  const lat = Math.round(request.center.lat * 50) / 50;
  const lon = Math.round(request.center.lon * 50) / 50;
  const target = request.targetDistanceKm ? Math.round(request.targetDistanceKm * 10) / 10 : 0;
  const profile = request.profile || outdoorRouteSearchPolicy(request.sport).defaultProfile;
  const shape = request.shape || "loop";
  return `${request.sport}:${lat}:${lon}:${Math.round(request.radiusKm || 15)}:${target}:${profile}:${shape}`;
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
  const points = route.route || [];
  let best = Number.POSITIVE_INFINITY;
  const step = Math.max(1, Math.floor(points.length / 80));
  for (let i = 0; i < points.length; i += step) best = Math.min(best, haversineMeters(points[i], target));
  if (points.length) best = Math.min(best, haversineMeters(points[points.length - 1], target));
  return Number.isFinite(best) ? best : 1e9;
}

function isLoop(route: RunningRouteTemplate) {
  const a = firstPoint(route);
  const b = lastPoint(route);
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
  const name = `${route.name || ""} ${route.routeRef || ""} ${route.network || ""}`.toLowerCase();
  const network = String(route.network || "").toLowerCase();
  let score = 0;

  if (sport === "trail") {
    if (/(trail|sentier|gr\s?\d|pr\s?\d|hiking|randonn|mountain|mont|crête|ridge)/i.test(name)) score += 12;
    if (/(^|[^a-z])(lwn|rwn|nwn|iwn)([^a-z]|$)/i.test(network)) score += 6;
    if (/(stade|parcours santé|fitness)/i.test(name)) score -= 4;
  } else if (sport === "hiking") {
    if (/(hiking|randonn|sentier|gr\s?\d|pr\s?\d|tour|boucle|chemin)/i.test(name)) score += 12;
    if (/(^|[^a-z])(lwn|rwn|nwn|iwn)([^a-z]|$)/i.test(network)) score += 8;
    if (/(running|stade|fitness)/i.test(name)) score -= 4;
  } else if (sport === "walking") {
    if (/(promenade|balade|marche|walking|boucle|chemin|sentier|parc)/i.test(name)) score += 11;
    if (/(ultra|marathon|skyrace)/i.test(name)) score -= 7;
  } else if (sport === "nordic-walking") {
    if (/(nordic|nordique|marche|walking|parcours santé|boucle|chemin)/i.test(name)) score += 13;
    if (/(ultra|skyrace)/i.test(name)) score -= 7;
  } else if (sport === "running") {
    if (/(running|course|jog|fitness|parcours santé|stade|10\s?km|semi|marathon)/i.test(name)) score += 12;
    if (/(gr\s?\d|randonn|hiking|trek)/i.test(name)) score -= 3;
  }
  return score;
}

export function routeFitsOutdoorScoutRequest(route: RunningRouteTemplate, request: OutdoorRouteScoutRequest) {
  if (!route || !Array.isArray(route.route) || route.route.length < 2) return false;
  const fit = outdoorRouteDistanceFit(Number(route.distanceM || routeDistanceMeters(route.route)), request.sport, request.targetDistanceKm);
  return fit.accepted;
}

export function scoreScoutedRoute(route: RunningRouteTemplate, request: OutdoorRouteScoutRequest) {
  let score = geometryQuality(route);
  const reasons: string[] = [];
  const generic = /^parcours\s+osm/i.test(String(route.name || "")) || /^route\s+osm/i.test(String(route.name || ""));
  if (!generic) { score += 14; reasons.push("nom officiel"); }
  if (route.routeRef) { score += 7; reasons.push(`réf. ${route.routeRef}`); }
  if (route.network) { score += 6; reasons.push(`réseau ${route.network}`); }
  if (route.operator) { score += 3; reasons.push("opérateur identifié"); }

  const loop = isLoop(route);
  const requestedShape = request.shape || "loop";
  if (requestedShape === "loop") {
    if (loop) { score += 10; reasons.push("boucle"); }
    else score -= 4;
  } else if (!loop) {
    score += 4;
    reasons.push("tracé linéaire");
  }

  score += sportAffinity(route, request.sport);

  const near = nearestDistanceM(route, request.center);
  const safeRadiusM = Math.max(5000, Number(request.radiusKm || 15) * 1000);
  const nearScore = Math.max(0, 14 * (1 - near / safeRadiusM));
  score += nearScore;

  const fit = outdoorRouteDistanceFit(Number(route.distanceM || 0), request.sport, request.targetDistanceKm);
  if (request.targetDistanceKm && request.targetDistanceKm > 0) {
    if (fit.grade === "excellent") { score += 28; reasons.push("distance idéale"); }
    else if (fit.grade === "good") { score += 19; reasons.push("distance proche"); }
    else if (fit.grade === "acceptable") { score += 9; reasons.push("distance compatible"); }
    else score -= 35;
  }

  const requestedProfile = request.profile || outdoorRouteSearchPolicy(request.sport).defaultProfile;
  if (route.generation?.profile) {
    if (route.generation.profile === requestedProfile) { score += 9; reasons.push("terrain adapté"); }
    else score -= 4;
  }
  if (route.source === "osm") { score += 8; reasons.push("parcours référencé"); }
  if (route.source === "generated") { score += 7; reasons.push("généré sur mesure"); }
  if (route.source === "community") { score += 5; reasons.push("parcours communauté"); }

  const quality: "excellent" | "good" | "fair" = score >= 78 ? "excellent" : score >= 60 ? "good" : "fair";
  const clamped = Math.round(Math.max(1, Math.min(100, score)));
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

export function rankOutdoorRouteCandidates(routes: RunningRouteTemplate[], request: OutdoorRouteScoutRequest) {
  return dedupe(routes)
    .filter((route) => routeFitsOutdoorScoutRequest(route, request))
    .map((route) => {
      const rankedRoute = scoreScoutedRoute(route, request);
      const relationId = String(route.externalId || "").replace("osm-relation:", "");
      return {
        ...route,
        scout: {
          provider: "openstreetmap-route-scout" as const,
          ...rankedRoute,
          sourceUrl: relationId && /^\d+$/.test(relationId) ? `https://www.openstreetmap.org/relation/${relationId}` : undefined,
          discoveredAt: Date.now(),
        },
      };
    })
    .sort((a, b) =>
      Number(b.scout?.score || 0) - Number(a.scout?.score || 0)
      || Math.abs(Number(a.distanceM || 0) - Number(request.targetDistanceKm || 0) * 1000)
         - Math.abs(Number(b.distanceM || 0) - Number(request.targetDistanceKm || 0) * 1000)
      || Number(a.scout?.distanceFromCenterM || 1e9) - Number(b.scout?.distanceFromCenterM || 1e9)
    );
}

function radiiFor(request: OutdoorRouteScoutRequest) {
  const policy = outdoorRouteSearchPolicy(request.sport);
  const requested = Math.max(4, Math.min(60, Math.round(request.radiusKm || policy.defaultRadiusKm)));
  const start = Math.min(requested, policy.defaultRadiusKm);
  // Progressive widening keeps the first response local/fast, then reaches a genuinely
  // useful catalogue radius only when the immediate area does not have enough routes.
  return [...new Set([start, requested, ...policy.radiusOptionsKm.filter((value) => value > requested), 25, 40, 60])]
    .filter((value) => value >= 4 && value <= 60)
    .sort((a, b) => a - b);
}

export async function scoutExistingOutdoorRoutes(request: OutdoorRouteScoutRequest): Promise<OutdoorRouteScoutResult> {
  if (!Number.isFinite(request.center.lat) || !Number.isFinite(request.center.lon)) throw new Error("Position invalide.");
  if (request.sport === "treadmill") return { routes: [], searchedRadiiKm: [], provider: "openstreetmap-route-scout", warnings: [] };

  const policy = outdoorRouteSearchPolicy(request.sport);
  const normalizedRequest: OutdoorRouteScoutRequest = {
    ...request,
    radiusKm: request.radiusKm || policy.defaultRadiusKm,
    targetDistanceKm: request.targetDistanceKm || policy.defaultTargetKm,
    profile: request.profile || policy.defaultProfile,
    shape: request.shape || "loop",
  };

  const key = cacheKey(normalizedRequest);
  const cached = readCache(key);
  if (cached?.length) {
    const validCached = rankOutdoorRouteCandidates(cached, normalizedRequest).slice(0, MAX_RESULTS);
    if (validCached.length) {
      return { routes: validCached, searchedRadiiKm: [], provider: "openstreetmap-route-scout", warnings: ["cache"] };
    }
  }

  const minResults = Math.max(8, Math.min(24, Number(normalizedRequest.minResults || 16)));
  const radii = radiiFor(normalizedRequest);
  const gathered: RunningRouteTemplate[] = [];
  const searched: number[] = [];
  const warnings: string[] = [];

  // Search community routes in parallel with OSM relations. This costs no UI thread time
  // and gives the Scout a second real-world source before generating a fallback.
  const communityPromise = fetchNearbyCommunityRoutes(
    normalizedRequest.center,
    normalizedRequest.sport,
    Math.max(Number(normalizedRequest.radiusKm || policy.defaultRadiusKm), policy.defaultRadiusKm),
  ).catch(() => ({ routes: [] as RunningRouteTemplate[], available: false }));

  const enoughExisting = Math.min(14, minResults);
  for (const radius of radii) {
    try {
      const result = await discoverOutdoorRoutes(normalizedRequest.center, normalizedRequest.sport, radius);
      searched.push(radius);
      gathered.push(...result.routes);
      const eligibleCount = rankOutdoorRouteCandidates(gathered, normalizedRequest).length;
      if (eligibleCount >= enoughExisting) break;
    } catch (error: any) {
      warnings.push(String(error?.message || `Échec rayon ${radius} km`));
    }
  }

  const community = await communityPromise;
  if (community.routes.length) gathered.push(...community.routes);

  let ranked = rankOutdoorRouteCandidates(gathered, normalizedRequest);

  // If there are not enough genuinely relevant existing routes, create precise routes
  // at the requested distance using the local OSM router / ORS fallback. This prevents
  // the "0 result" dead-end while keeping real mapped/community routes ranked first.
  if (ranked.length < minResults && Number(normalizedRequest.targetDistanceKm || 0) > 0) {
    try {
      const missing = Math.max(1, Math.min(8, minResults - ranked.length));
      const generated = await generateOutdoorRoutes({
        center: normalizedRequest.center,
        sport: normalizedRequest.sport,
        distanceKm: Number(normalizedRequest.targetDistanceKm),
        profile: normalizedRequest.profile,
        shape: normalizedRequest.shape,
        count: missing,
      });
      ranked = rankOutdoorRouteCandidates([...ranked, ...generated.routes], normalizedRequest);
      if (generated.routes.length) warnings.push(`fallback-generated:${generated.routes.length}`);
    } catch (error: any) {
      warnings.push(String(error?.message || "Génération de secours indisponible."));
    }
  }

  ranked = ranked.slice(0, MAX_RESULTS);
  if (ranked.length) writeCache(key, ranked);
  return { routes: ranked, searchedRadiiKm: searched, provider: "openstreetmap-route-scout", warnings };
}
