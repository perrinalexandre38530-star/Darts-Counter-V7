import { haversineMeters, routeDistanceMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import { outdoorRouteSearchPolicy } from "./outdoorRouteSearchPolicy";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteDiscoveryCenter = { lat: number; lon: number };

export type OutdoorRouteDiscoveryResult = {
  routes: RunningRouteTemplate[];
  center: OutdoorRouteDiscoveryCenter;
  radiusKm: number;
  provider: "mss-global-route-catalog" | "openstreetmap-overpass";
};

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const MAX_DISCOVERED_ROUTES = 64;
const MAX_POINTS_PER_DISCOVERED_ROUTE = 620;

function routeKindsForSport(sport: OutdoorPerformanceSport) {
  if (sport === "running") return "running|fitness_trail|foot|hiking";
  if (sport === "trail") return "hiking|foot|running|fitness_trail";
  if (sport === "hiking") return "hiking|foot";
  if (sport === "walking") return "foot|hiking";
  if (sport === "nordic-walking") return "nordic_walking|foot|hiking";
  return "hiking|foot|running|fitness_trail";
}

function bboxAround(center: OutdoorRouteDiscoveryCenter, radiusKm: number) {
  const radius = Math.max(2, Math.min(60, radiusKm));
  const latDelta = radius / 111.32;
  const lonScale = Math.max(0.18, Math.cos(center.lat * Math.PI / 180));
  const lonDelta = radius / (111.32 * lonScale);
  return {
    south: Math.max(-85, center.lat - latDelta),
    west: Math.max(-180, center.lon - lonDelta),
    north: Math.min(85, center.lat + latDelta),
    east: Math.min(180, center.lon + lonDelta),
  };
}

function overpassQuery(center: OutdoorRouteDiscoveryCenter, sport: OutdoorPerformanceSport, radiusKm: number) {
  const bbox = bboxAround(center, radiusKm);
  const routeKinds = routeKindsForSport(sport);
  const box = `${bbox.south.toFixed(6)},${bbox.west.toFixed(6)},${bbox.north.toFixed(6)},${bbox.east.toFixed(6)}`;
  return `[out:json][timeout:22];\nrelation["type"="route"]["route"~"^(${routeKinds})$"](${box});\nout geom(${box});`;
}

function sanitizeName(value: unknown, fallback: string) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  return raw ? raw.slice(0, 96) : fallback;
}

function simplify(points: GeoPoint[]) {
  if (points.length <= MAX_POINTS_PER_DISCOVERED_ROUTE) return points;
  const step = Math.ceil(points.length / MAX_POINTS_PER_DISCOVERED_ROUTE);
  const output = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
  if (output[output.length - 1] !== points[points.length - 1]) output.push(points[points.length - 1]);
  return output;
}

function geometryToPoints(geometry: any[]): GeoPoint[] {
  const now = Date.now();
  return geometry
    .map((point, index) => ({
      lat: Number(point?.lat),
      lon: Number(point?.lon),
      timestamp: now + index,
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function segmentDistance(points: GeoPoint[]) {
  return points.length >= 2 ? routeDistanceMeters(points) : 0;
}

function distanceToCenter(point: GeoPoint, center: OutdoorRouteDiscoveryCenter) {
  return haversineMeters(point, { lat: center.lat, lon: center.lon, timestamp: 0 });
}

function parseTaggedDistanceM(value: unknown) {
  const raw = String(value || "").trim().toLowerCase().replace(",", ".");
  if (!raw) return 0;
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return 0;
  const numeric = Number(match[1]);
  if (!(numeric > 0)) return 0;
  if (/\bmi(?:le|les)?\b/.test(raw)) return numeric * 1609.344;
  if (/\bkm\b/.test(raw)) return numeric * 1000;
  if (/\bm\b/.test(raw)) return numeric;
  // OSM route relations usually express `distance=*` in km when no unit is written.
  return numeric <= 100 ? numeric * 1000 : numeric;
}

function connectedChains(relation: any) {
  const members = Array.isArray(relation?.members) ? relation.members : [];
  const rawSegments = members
    .filter((member: any) => member?.type === "way" && Array.isArray(member?.geometry) && member.geometry.length >= 2)
    .map((member: any) => geometryToPoints(member.geometry))
    .filter((segment: GeoPoint[]) => segment.length >= 2);
  if (!rawSegments.length) return [] as GeoPoint[][];

  const chains: GeoPoint[][] = [];
  for (const segment of rawSegments) {
    if (!chains.length) {
      chains.push([...segment]);
      continue;
    }
    let bestIndex = -1;
    let bestGap = Number.POSITIVE_INFINITY;
    let reverse = false;
    let prepend = false;
    for (let index = 0; index < chains.length; index += 1) {
      const chain = chains[index];
      const chainStart = chain[0];
      const chainEnd = chain[chain.length - 1];
      const segStart = segment[0];
      const segEnd = segment[segment.length - 1];
      const candidates = [
        { gap: haversineMeters(chainEnd, segStart), reverse: false, prepend: false },
        { gap: haversineMeters(chainEnd, segEnd), reverse: true, prepend: false },
        { gap: haversineMeters(chainStart, segEnd), reverse: false, prepend: true },
        { gap: haversineMeters(chainStart, segStart), reverse: true, prepend: true },
      ];
      const local = candidates.sort((a, b) => a.gap - b.gap)[0];
      if (local.gap < bestGap) {
        bestGap = local.gap;
        bestIndex = index;
        reverse = local.reverse;
        prepend = local.prepend;
      }
    }
    const oriented = reverse ? [...segment].reverse() : segment;
    // Route relations sometimes have tiny discontinuities at junctions. 550 m is still
    // strict enough to avoid joining unrelated routes while recovering missing connectors.
    if (bestIndex >= 0 && bestGap <= 550) {
      const chain = chains[bestIndex];
      if (prepend) chains[bestIndex] = [...oriented.slice(0, -1), ...chain];
      else chains[bestIndex] = [...chain, ...oriented.slice(1)];
    } else {
      chains.push([...segment]);
    }
  }

  // IMPORTANT: choose the longest coherent chain first. The previous implementation
  // preferred the chain nearest to the user and could return a 300-700 m fragment of
  // an otherwise valid 10-20 km relation.
  return chains
    .filter((chain) => chain.length >= 2)
    .map((chain) => simplify(chain))
    .sort((a, b) => segmentDistance(b) - segmentDistance(a));
}

function relationToRoute(relation: any, center: OutdoorRouteDiscoveryCenter, sport: OutdoorPerformanceSport): RunningRouteTemplate | null {
  const relationId = Number(relation?.id);
  if (!Number.isFinite(relationId)) return null;
  const chains = connectedChains(relation);
  const route = chains[0];
  if (!route || route.length < 2) return null;

  const distanceM = routeDistanceMeters(route);
  const policy = outdoorRouteSearchPolicy(sport);
  const absoluteMinM = policy.absoluteMinKm * 1000;
  if (!Number.isFinite(distanceM) || distanceM < absoluteMinM) return null;

  const tags = relation?.tags || {};
  const taggedDistanceM = parseTaggedDistanceM(tags.distance);
  // If OSM explicitly says a route is e.g. 15 km but our geometry is only 2 km,
  // the relation geometry was clipped/incomplete: do not expose that fragment.
  if (taggedDistanceM > absoluteMinM && distanceM < taggedDistanceM * 0.42) return null;

  const network = sanitizeName(tags.network || tags["network:type"] || "", "");
  const ref = sanitizeName(tags.ref || "", "");
  const name = sanitizeName(tags["name:fr"] || tags.name || ref, `Parcours OSM ${relationId}`);
  return {
    id: `osm:route:${relationId}`,
    externalId: `osm-relation:${relationId}`,
    name,
    route,
    distanceM,
    elevationGainM: 0,
    referenceElapsedMs: 0,
    createdAt: Date.now(),
    source: "osm",
    sport,
    network: network || undefined,
    routeRef: ref || undefined,
    operator: sanitizeName(tags.operator || "", "") || undefined,
  };
}

async function fetchOverpass(query: string, signal: AbortSignal) {
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
      const json = await response.json();
      if (!Array.isArray(json?.elements)) throw new Error("Réponse cartographique invalide.");
      return { json, provider: "openstreetmap-overpass" as const };
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Service cartographique indisponible.");
}

function catalogPayloadToRoute(raw: any, sport: OutdoorPerformanceSport): RunningRouteTemplate | null {
  if (!raw || !Array.isArray(raw.route) || raw.route.length < 2) return null;
  const route = raw.route.map((point: any, index: number) => ({
    lat: Number(point?.lat),
    lon: Number(point?.lon ?? point?.lng),
    timestamp: Number(point?.timestamp || Date.now() + index),
    altitude: Number.isFinite(Number(point?.altitude)) ? Number(point.altitude) : undefined,
  })).filter((point: GeoPoint) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  if (route.length < 2) return null;
  const distanceM = Number(raw.distanceM || routeDistanceMeters(route));
  if (!Number.isFinite(distanceM) || distanceM < outdoorRouteSearchPolicy(sport).absoluteMinKm * 1000) return null;
  return {
    id: String(raw.id || raw.externalId || `catalog:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`),
    externalId: String(raw.externalId || raw.id || "") || undefined,
    name: sanitizeName(raw.name, "Parcours référencé"),
    route: simplify(route),
    distanceM,
    elevationGainM: Number(raw.elevationGainM || 0),
    referenceElapsedMs: Number(raw.referenceElapsedMs || 0),
    createdAt: Number(raw.createdAt || Date.now()),
    source: raw.source === "osm" ? "osm" : "catalog",
    sport,
    network: sanitizeName(raw.network || "", "") || undefined,
    routeRef: sanitizeName(raw.routeRef || "", "") || undefined,
    operator: sanitizeName(raw.operator || "", "") || undefined,
    catalog: raw.catalog && typeof raw.catalog === "object" ? {
      provider: String(raw.catalog.provider || "mss"),
      providerRouteId: String(raw.catalog.providerRouteId || raw.externalId || raw.id || ""),
      sourceUrl: raw.catalog.sourceUrl ? String(raw.catalog.sourceUrl) : undefined,
      imageUrl: raw.catalog.imageUrl ? String(raw.catalog.imageUrl) : undefined,
      attribution: raw.catalog.attribution ? String(raw.catalog.attribution) : undefined,
      license: raw.catalog.license ? String(raw.catalog.license) : undefined,
      ranking: Number.isFinite(Number(raw.catalog.ranking)) ? Number(raw.catalog.ranking) : undefined,
      difficulty: Number.isFinite(Number(raw.catalog.difficulty)) ? Number(raw.catalog.difficulty) : undefined,
      isLoop: typeof raw.catalog.isLoop === "boolean" ? raw.catalog.isLoop : undefined,
      cached: typeof raw.catalog.cached === "boolean" ? raw.catalog.cached : undefined,
    } : undefined,
  };
}

async function fetchGlobalCatalog(center: OutdoorRouteDiscoveryCenter, sport: OutdoorPerformanceSport, radiusKm: number, signal: AbortSignal, targetDistanceKm = 0) {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lon: String(center.lon),
    sport,
    radiusKm: String(radiusKm),
    targetKm: targetDistanceKm > 0 ? String(targetDistanceKm) : "0",
  });
  const response = await fetch(`/api/running/routes/catalog?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Catalogue MSS HTTP ${response.status}`);
  const json = await response.json();
  if (!Array.isArray(json?.elements) && !Array.isArray(json?.routes)) throw new Error("Catalogue MSS invalide.");
  return { json, provider: "mss-global-route-catalog" as const };
}

async function fetchDiscoveryData(center: OutdoorRouteDiscoveryCenter, sport: OutdoorPerformanceSport, radiusKm: number, signal: AbortSignal, targetDistanceKm = 0) {
  try {
    return await fetchGlobalCatalog(center, sport, radiusKm, signal, targetDistanceKm);
  } catch (catalogError) {
    if (signal.aborted) throw catalogError;
    // Development/StackBlitz or a Pages deployment without the Function still works.
    return fetchOverpass(overpassQuery(center, sport, radiusKm), signal);
  }
}

export async function discoverOutdoorRoutes(
  center: OutdoorRouteDiscoveryCenter,
  sport: OutdoorPerformanceSport,
  radiusKm = 10,
  targetDistanceKm = 0,
): Promise<OutdoorRouteDiscoveryResult> {
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lon)) throw new Error("Position invalide.");
  if (sport === "treadmill") return { routes: [], center, radiusKm, provider: "openstreetmap-overpass" };
  const safeRadius = Math.max(3, Math.min(60, Math.round(radiusKm)));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 26000);
  try {
    const fetched = await fetchDiscoveryData(center, sport, safeRadius, controller.signal, targetDistanceKm);
    const json = fetched.json;
    const catalogRoutes = (Array.isArray(json?.routes) ? json.routes : [])
      .map((raw: any) => catalogPayloadToRoute(raw, sport))
      .filter((route: RunningRouteTemplate | null): route is RunningRouteTemplate => !!route);
    const osmRoutes = (Array.isArray(json?.elements) ? json.elements : [])
      .filter((element: any) => element?.type === "relation")
      .map((relation: any) => relationToRoute(relation, center, sport))
      .filter((route: RunningRouteTemplate | null): route is RunningRouteTemplate => !!route);
    const routes = [...catalogRoutes, ...osmRoutes].sort((a, b) => {
      const a0 = a.route[0];
      const b0 = b.route[0];
      const aNear = a0 ? distanceToCenter(a0, center) : Number.POSITIVE_INFINITY;
      const bNear = b0 ? distanceToCenter(b0, center) : Number.POSITIVE_INFINITY;
      return aNear - bNear || b.distanceM - a.distanceM;
    });
    const unique = new Map<string, RunningRouteTemplate>();
    for (const route of routes) {
      if (!unique.has(route.id)) unique.set(route.id, route);
      if (unique.size >= MAX_DISCOVERED_ROUTES) break;
    }
    return { routes: [...unique.values()], center, radiusKm: safeRadius, provider: fetched.provider };
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("La recherche de parcours a expiré. Réessaie dans quelques secondes.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
