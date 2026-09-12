import { haversineMeters, routeDistanceMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import { discoverOutdoorRoutes, type OutdoorRouteDiscoveryCenter } from "./outdoorRouteDiscovery";
import { generateOutdoorRoutes, type OutdoorRouteGenerationProfile, type OutdoorRouteGenerationShape } from "./outdoorRouteGenerator";
import { fetchNearbyCommunityRoutes } from "./outdoorPublicRoutes";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import { outdoorRouteDistanceFit, outdoorRouteSearchPolicy } from "./outdoorRouteSearchPolicy";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteScoutStage = "cache" | "community" | "local" | "expanded" | "generated" | "done";

export type OutdoorRouteScoutProgress = {
  stage: OutdoorRouteScoutStage;
  routes: RunningRouteTemplate[];
  searchedRadiiKm: number[];
  warnings: string[];
  elapsedMs: number;
};

export type OutdoorRouteScoutRequest = {
  center: OutdoorRouteDiscoveryCenter;
  sport: OutdoorPerformanceSport;
  radiusKm?: number;
  targetDistanceKm?: number | null;
  minResults?: number;
  profile?: OutdoorRouteGenerationProfile;
  shape?: OutdoorRouteGenerationShape;
  onProgress?: (progress: OutdoorRouteScoutProgress) => void;
};

export type OutdoorRouteScoutResult = {
  routes: RunningRouteTemplate[];
  searchedRadiiKm: number[];
  provider: "openstreetmap-route-scout";
  warnings: string[];
};

const CACHE_KEY = "mss-outdoor-route-scout-v6";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const STALE_CACHE_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_RESULTS = 48;
const FAST_STAGE_WAIT_MS = 2200;
const TOTAL_SCOUT_BUDGET_MS = 10_000;

function cacheKey(request: OutdoorRouteScoutRequest) {
  const lat = Math.round(request.center.lat * 50) / 50;
  const lon = Math.round(request.center.lon * 50) / 50;
  const target = request.targetDistanceKm ? Math.round(request.targetDistanceKm * 10) / 10 : 0;
  const profile = request.profile || outdoorRouteSearchPolicy(request.sport).defaultProfile;
  const shape = request.shape || "loop";
  return `${request.sport}:${lat}:${lon}:${Math.round(request.radiusKm || 15)}:${target}:${profile}:${shape}`;
}

function readCache(key: string): { routes: RunningRouteTemplate[]; ageMs: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, { updatedAt: number; routes: RunningRouteTemplate[] }>;
    const row = all?.[key];
    const ageMs = Date.now() - Number(row?.updatedAt || 0);
    if (!row || ageMs > STALE_CACHE_TTL_MS || !Array.isArray(row.routes)) return null;
    return { routes: row.routes, ageMs };
  } catch { return null; }
}

function readRelatedCache(request: OutdoorRouteScoutRequest): { routes: RunningRouteTemplate[]; ageMs: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, { updatedAt: number; routes: RunningRouteTemplate[] }>;
    const lat = Math.round(request.center.lat * 50) / 50;
    const lon = Math.round(request.center.lon * 50) / 50;
    const prefix = `${request.sport}:${lat}:${lon}:`;
    const rows = Object.entries(all || {})
      .filter(([key, row]) => key.startsWith(prefix) && Array.isArray(row?.routes) && Date.now() - Number(row?.updatedAt || 0) <= STALE_CACHE_TTL_MS)
      .sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
      .slice(0, 4);
    if (!rows.length) return null;
    const routes = rows.flatMap(([, row]) => row.routes || []).slice(0, MAX_RESULTS * 3);
    const newest = Math.max(...rows.map(([, row]) => Number(row?.updatedAt || 0)));
    return { routes, ageMs: Date.now() - newest };
  } catch { return null; }
}

function writeCache(key: string, routes: RunningRouteTemplate[]) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[key] = { updatedAt: Date.now(), routes: routes.slice(0, MAX_RESULTS) };
    const entries = Object.entries(all)
      .sort((a: any, b: any) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
      .slice(0, 16);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

function firstPoint(route: RunningRouteTemplate) { return route.route?.[0] || null; }
function lastPoint(route: RunningRouteTemplate) { return route.route?.[route.route.length - 1] || null; }

function nearestDistanceM(route: RunningRouteTemplate, center: OutdoorRouteDiscoveryCenter) {
  const target: GeoPoint = { lat: center.lat, lon: center.lon, timestamp: 0 };
  const points = route.route || [];
  let best = Number.POSITIVE_INFINITY;
  const step = Math.max(1, Math.floor(points.length / 100));
  for (let i = 0; i < points.length; i += step) best = Math.min(best, haversineMeters(points[i]!, target));
  if (points.length) best = Math.min(best, haversineMeters(points[points.length - 1]!, target));
  return Number.isFinite(best) ? best : 1e9;
}

function isLoop(route: RunningRouteTemplate) {
  if (typeof route.catalog?.isLoop === "boolean") return route.catalog.isLoop;
  const a = firstPoint(route);
  const b = lastPoint(route);
  return !!a && !!b && haversineMeters(a, b) <= Math.max(180, Math.min(700, route.distanceM * 0.04));
}

function geometryQuality(route: RunningRouteTemplate) {
  const points = route.route || [];
  if (points.length < 2) return 0;
  const measured = routeDistanceMeters(points);
  const claimed = Math.max(1, Number(route.distanceM || measured));
  const ratio = measured / claimed;
  let score = 16;
  if (points.length >= 20) score += 6;
  if (points.length >= 60) score += 6;
  if (points.length >= 140) score += 3;
  if (ratio >= .86 && ratio <= 1.14) score += 8;
  else if (ratio >= .72 && ratio <= 1.28) score += 3;
  else score -= 10;
  return score;
}

function sportAffinity(route: RunningRouteTemplate, sport: OutdoorPerformanceSport) {
  const name = `${route.name || ""} ${route.routeRef || ""} ${route.network || ""} ${route.operator || ""}`.toLowerCase();
  const network = String(route.network || "").toLowerCase();
  let score = 0;

  if (sport === "trail") {
    if (/(trail|sentier|gr\s?\d|pr\s?\d|hiking|randonn|mountain|mont|crête|ridge|single)/i.test(name)) score += 14;
    if (/(^|[^a-z])(lwn|rwn|nwn|iwn)([^a-z]|$)/i.test(network)) score += 7;
    if (/(stade|parcours santé|fitness|promenade urbaine)/i.test(name)) score -= 6;
  } else if (sport === "hiking") {
    if (/(hiking|randonn|sentier|gr\s?\d|pr\s?\d|tour|boucle|chemin|trek)/i.test(name)) score += 14;
    if (/(^|[^a-z])(lwn|rwn|nwn|iwn)([^a-z]|$)/i.test(network)) score += 9;
    if (/(running|stade|fitness)/i.test(name)) score -= 5;
  } else if (sport === "walking") {
    if (/(promenade|balade|marche|walking|boucle|chemin|parc|voie verte)/i.test(name)) score += 13;
    if (/(ultra|marathon|skyrace|alpin)/i.test(name)) score -= 9;
  } else if (sport === "nordic-walking") {
    if (/(nordic|nordique|marche|walking|parcours santé|boucle|chemin)/i.test(name)) score += 15;
    if (/(ultra|skyrace)/i.test(name)) score -= 9;
  } else if (sport === "running") {
    if (/(running|course|jog|fitness|parcours santé|stade|10\s?km|semi|marathon|voie verte)/i.test(name)) score += 14;
    if (/(gr\s?\d|randonn|hiking|trek|alpin)/i.test(name)) score -= 5;
  }
  return score;
}

export function routeFitsOutdoorScoutRequest(route: RunningRouteTemplate, request: OutdoorRouteScoutRequest, relaxed = false) {
  if (!route || !Array.isArray(route.route) || route.route.length < 2) return false;
  const fit = outdoorRouteDistanceFit(Number(route.distanceM || routeDistanceMeters(route.route)), request.sport, request.targetDistanceKm);
  return relaxed ? fit.relaxedAccepted : fit.accepted;
}

export function scoreScoutedRoute(route: RunningRouteTemplate, request: OutdoorRouteScoutRequest) {
  let score = geometryQuality(route);
  const reasons: string[] = [];
  const generic = /^parcours\s+osm/i.test(String(route.name || "")) || /^route\s+osm/i.test(String(route.name || ""));
  if (!generic) { score += 12; reasons.push("nom identifié"); }
  if (route.routeRef) { score += 7; reasons.push(`réf. ${route.routeRef}`); }
  if (route.network) { score += 6; reasons.push(`réseau ${route.network}`); }
  if (route.operator) score += 3;

  const loop = isLoop(route);
  const requestedShape = request.shape || "loop";
  if (requestedShape === "loop") {
    if (loop) { score += 10; reasons.push("boucle"); }
    else score -= 3;
  } else if (!loop) {
    score += 5;
    reasons.push("aller-retour / linéaire");
  }

  score += sportAffinity(route, request.sport);

  const near = nearestDistanceM(route, request.center);
  const safeRadiusM = Math.max(4000, Number(request.radiusKm || 15) * 1000);
  score += Math.max(-8, 16 * (1 - near / safeRadiusM));
  if (near <= 2500) reasons.push("départ proche");

  const fit = outdoorRouteDistanceFit(Number(route.distanceM || 0), request.sport, request.targetDistanceKm);
  if (request.targetDistanceKm && request.targetDistanceKm > 0) {
    if (fit.grade === "excellent") { score += 31; reasons.push("distance idéale"); }
    else if (fit.grade === "good") { score += 21; reasons.push("distance très proche"); }
    else if (fit.grade === "acceptable") { score += 9; reasons.push("distance compatible"); }
    else if (fit.grade === "alternative") { score -= 5; reasons.push("alternative distance"); }
    else score -= 38;
  }

  const requestedProfile = request.profile || outdoorRouteSearchPolicy(request.sport).defaultProfile;
  if (route.generation?.profile) {
    if (route.generation.profile === requestedProfile) { score += 10; reasons.push("terrain adapté"); }
    else score -= 4;
  }
  if (route.source === "osm") { score += 10; reasons.push("parcours référencé"); }
  if (route.source === "catalog") { score += 13; reasons.push(route.catalog?.provider ? `catalogue ${route.catalog.provider}` : "catalogue référencé"); }
  if (route.source === "generated") { score += 8; reasons.push("sur mesure"); }
  if (route.source === "community") { score += 6; reasons.push("communauté"); }
  if (Number(route.catalog?.ranking || 0) > 0) score += Math.min(8, Number(route.catalog?.ranking || 0) / 12);

  const quality: "excellent" | "good" | "fair" = score >= 82 ? "excellent" : score >= 64 ? "good" : "fair";
  const clamped = Math.round(Math.max(1, Math.min(100, score)));
  return { score: clamped, reasons: [...new Set(reasons)].slice(0, 5), distanceFromCenterM: Math.round(near), loop, quality } as const;
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

export function rankOutdoorRouteCandidates(routes: RunningRouteTemplate[], request: OutdoorRouteScoutRequest, relaxed = false) {
  return dedupe(routes)
    .filter((route) => routeFitsOutdoorScoutRequest(route, request, relaxed))
    .map((route) => {
      const rankedRoute = scoreScoutedRoute(route, request);
      const relationId = String(route.externalId || "").replace("osm-relation:", "");
      return {
        ...route,
        scout: {
          provider: route.catalog?.provider === "outdooractive" ? "outdooractive" as const : route.catalog?.provider === "geotrek" ? "geotrek" as const : route.catalog?.provider === "gpx-import" ? "gpx-catalog" as const : route.source === "catalog" ? "mss-route-catalog" as const : "openstreetmap-route-scout" as const,
          ...rankedRoute,
          sourceUrl: route.catalog?.sourceUrl || (relationId && /^\d+$/.test(relationId) ? `https://www.openstreetmap.org/relation/${relationId}` : undefined),
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

function displayRanked(routes: RunningRouteTemplate[], request: OutdoorRouteScoutRequest, minResults: number) {
  const strict = rankOutdoorRouteCandidates(routes, request, false);
  if (strict.length >= Math.min(12, minResults)) return strict.slice(0, MAX_RESULTS);
  const relaxed = rankOutdoorRouteCandidates(routes, request, true);
  return relaxed.slice(0, MAX_RESULTS);
}

function radiiFor(request: OutdoorRouteScoutRequest) {
  const policy = outdoorRouteSearchPolicy(request.sport);
  const requested = Math.max(4, Math.min(policy.maxRadiusKm || 60, Math.round(request.radiusKm || policy.defaultRadiusKm)));
  const expandedTarget = Math.min(policy.maxRadiusKm || 60, Math.max(requested + 5, Math.round(requested * 1.8)));
  const expanded = policy.radiusOptionsKm.find((value) => value >= expandedTarget) || policy.maxRadiusKm || requested;
  return [...new Set([requested, expanded])].filter((value) => value >= 4 && value <= (policy.maxRadiusKm || 60));
}

function delay(ms: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, ms)); }

async function withDeadline<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([promise, delay(timeoutMs).then(() => fallback)]);
}

export async function scoutExistingOutdoorRoutes(request: OutdoorRouteScoutRequest): Promise<OutdoorRouteScoutResult> {
  if (!Number.isFinite(request.center.lat) || !Number.isFinite(request.center.lon)) throw new Error("Position invalide.");
  if (request.sport === "treadmill") return { routes: [], searchedRadiiKm: [], provider: "openstreetmap-route-scout", warnings: [] };

  const startedAt = Date.now();
  const policy = outdoorRouteSearchPolicy(request.sport);
  const normalizedRequest: OutdoorRouteScoutRequest = {
    ...request,
    radiusKm: request.radiusKm || policy.defaultRadiusKm,
    targetDistanceKm: request.targetDistanceKm || policy.defaultTargetKm,
    profile: request.profile || policy.defaultProfile,
    shape: request.shape || "loop",
  };
  const minResults = Math.max(12, Math.min(32, Number(normalizedRequest.minResults || 24)));
  const key = cacheKey(normalizedRequest);
  const gathered: RunningRouteTemplate[] = [];
  const searched: number[] = [];
  const warnings: string[] = [];
  let closed = false;
  let enoughResolve: (() => void) | null = null;
  const enoughPromise = new Promise<void>((resolve) => { enoughResolve = resolve; });

  const snapshot = (stage: OutdoorRouteScoutStage) => {
    const ranked = displayRanked(gathered, normalizedRequest, minResults);
    const strong = ranked.filter((route) => Number(route.scout?.score || 0) >= 64).length;
    if (ranked.length >= Math.min(minResults, 18) && strong >= Math.min(12, minResults)) enoughResolve?.();
    if (!closed) {
      try {
        normalizedRequest.onProgress?.({ stage, routes: ranked, searchedRadiiKm: [...searched], warnings: [...warnings], elapsedMs: Date.now() - startedAt });
      } catch {}
    }
    return ranked;
  };

  const cached = readCache(key);
  if (cached?.routes.length) {
    gathered.push(...cached.routes);
    const cachedRanked = snapshot("cache");
    if (cached.ageMs <= CACHE_TTL_MS && cachedRanked.length >= Math.min(minResults, 18)) {
      closed = true;
      return { routes: cachedRanked, searchedRadiiKm: [], provider: "openstreetmap-route-scout", warnings: ["cache"] };
    }
  }

  // Reuse nearby searches for the same discipline even when distance/profile changed.
  // They are immediately re-ranked against the current request, so Scout never starts
  // from an empty screen when we already know useful routes around this location.
  const relatedCached = readRelatedCache(normalizedRequest);
  if (relatedCached?.routes.length) {
    gathered.push(...relatedCached.routes);
    snapshot("cache");
  }

  const [primaryRadius, expandedRadius] = radiiFor(normalizedRequest);
  const tasks: Promise<void>[] = [];
  const addTask = (stage: OutdoorRouteScoutStage, work: () => Promise<RunningRouteTemplate[]>, radius?: number) => {
    const task = work().then((routes) => {
      if (closed) return;
      if (radius && !searched.includes(radius)) searched.push(radius);
      if (routes?.length) gathered.push(...routes);
      snapshot(stage);
    }).catch((error: any) => {
      if (closed) return;
      if (radius && !searched.includes(radius)) searched.push(radius);
      const message = String(error?.message || error || "source indisponible");
      if (!/délai rapide|timeout|aborted/i.test(message)) warnings.push(message);
      snapshot(stage);
    });
    tasks.push(task);
    return task;
  };

  addTask("community", async () => {
    const result = await withDeadline(
      fetchNearbyCommunityRoutes(normalizedRequest.center, normalizedRequest.sport, Math.max(Number(primaryRadius || policy.defaultRadiusKm), policy.defaultRadiusKm)),
      3200,
      { routes: [] as RunningRouteTemplate[], available: false },
    );
    return result.routes;
  });

  if (primaryRadius) {
    addTask("local", async () => {
      const result = await discoverOutdoorRoutes(normalizedRequest.center, normalizedRequest.sport, primaryRadius, Number(normalizedRequest.targetDistanceKm || 0), { timeoutMs: 7000 });
      return result.routes;
    }, primaryRadius);
  }

  await Promise.race([Promise.allSettled([...tasks]).then(() => undefined), delay(FAST_STAGE_WAIT_MS)]);
  let current = snapshot("local");
  const strongNow = current.filter((route) => Number(route.scout?.score || 0) >= 64).length;

  if (current.length < minResults || strongNow < Math.min(12, minResults)) {
    if (expandedRadius && expandedRadius !== primaryRadius) {
      addTask("expanded", async () => {
        const result = await discoverOutdoorRoutes(normalizedRequest.center, normalizedRequest.sport, expandedRadius, Number(normalizedRequest.targetDistanceKm || 0), { timeoutMs: 7600 });
        return result.routes;
      }, expandedRadius);
    }

    if (Number(normalizedRequest.targetDistanceKm || 0) > 0) {
      addTask("generated", async () => {
        const result = await generateOutdoorRoutes({
          center: normalizedRequest.center,
          sport: normalizedRequest.sport,
          distanceKm: Number(normalizedRequest.targetDistanceKm),
          profile: normalizedRequest.profile,
          shape: normalizedRequest.shape,
          count: 8,
          timeoutMs: 7200,
        });
        if (result.routes.length) warnings.push(`fallback-generated:${result.routes.length}`);
        return result.routes;
      });
    }
  }

  const remainingBudget = Math.max(1500, TOTAL_SCOUT_BUDGET_MS - (Date.now() - startedAt));
  await Promise.race([
    Promise.allSettled([...tasks]).then(() => undefined),
    enoughPromise,
    delay(remainingBudget),
  ]);

  current = snapshot("done");
  closed = true;
  if (current.length) writeCache(key, current);
  return { routes: current.slice(0, MAX_RESULTS), searchedRadiiKm: [...searched].sort((a, b) => a - b), provider: "openstreetmap-route-scout", warnings };
}
