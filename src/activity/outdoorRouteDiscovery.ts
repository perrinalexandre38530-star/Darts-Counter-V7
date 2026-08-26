import { haversineMeters, routeDistanceMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteDiscoveryCenter = { lat: number; lon: number };

export type OutdoorRouteDiscoveryResult = {
  routes: RunningRouteTemplate[];
  center: OutdoorRouteDiscoveryCenter;
  radiusKm: number;
  provider: "openstreetmap-overpass";
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const MAX_DISCOVERED_ROUTES = 18;
const MAX_POINTS_PER_DISCOVERED_ROUTE = 520;

function routeKindsForSport(sport: OutdoorPerformanceSport) {
  if (sport === "running") return "running|foot|hiking";
  if (sport === "trail") return "hiking|foot|running";
  if (sport === "hiking" || sport === "walking" || sport === "nordic-walking") return "hiking|foot|running";
  return "hiking|foot|running";
}

function bboxAround(center: OutdoorRouteDiscoveryCenter, radiusKm: number) {
  const radius = Math.max(2, Math.min(40, radiusKm));
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
  return `[out:json][timeout:18];\nrelation["type"="route"]["route"~"^(${routeKinds})$"](${box});\nout geom(${box});`;
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

function connectedChains(relation: any, center: OutdoorRouteDiscoveryCenter) {
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
    if (bestIndex >= 0 && bestGap <= 350) {
      const chain = chains[bestIndex];
      if (prepend) chains[bestIndex] = [...oriented.slice(0, -1), ...chain];
      else chains[bestIndex] = [...chain, ...oriented.slice(1)];
    } else {
      chains.push([...segment]);
    }
  }

  return chains
    .filter((chain) => chain.length >= 2)
    .map((chain) => simplify(chain))
    .sort((a, b) => {
      const aNearest = Math.min(...a.map((point) => distanceToCenter(point, center)));
      const bNearest = Math.min(...b.map((point) => distanceToCenter(point, center)));
      if (Math.abs(aNearest - bNearest) > 250) return aNearest - bNearest;
      return segmentDistance(b) - segmentDistance(a);
    });
}

function relationToRoute(relation: any, center: OutdoorRouteDiscoveryCenter, sport: OutdoorPerformanceSport): RunningRouteTemplate | null {
  const relationId = Number(relation?.id);
  if (!Number.isFinite(relationId)) return null;
  const chains = connectedChains(relation, center);
  const route = chains.find((chain) => segmentDistance(chain) >= 250) || chains[0];
  if (!route || route.length < 2) return null;
  const distanceM = routeDistanceMeters(route);
  if (!Number.isFinite(distanceM) || distanceM < 200) return null;
  const tags = relation?.tags || {};
  const network = sanitizeName(tags.network || tags["network:type"] || "", "");
  const ref = sanitizeName(tags.ref || "", "");
  const name = sanitizeName(tags.name || tags["name:fr"] || ref, `Parcours OSM ${relationId}`);
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
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
      const json = await response.json();
      if (!Array.isArray(json?.elements)) throw new Error("Réponse cartographique invalide.");
      return json;
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Service cartographique indisponible.");
}

export async function discoverOutdoorRoutes(
  center: OutdoorRouteDiscoveryCenter,
  sport: OutdoorPerformanceSport,
  radiusKm = 10,
): Promise<OutdoorRouteDiscoveryResult> {
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lon)) throw new Error("Position invalide.");
  if (sport === "treadmill") return { routes: [], center, radiusKm, provider: "openstreetmap-overpass" };
  const safeRadius = Math.max(3, Math.min(30, Math.round(radiusKm)));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 22000);
  try {
    const json = await fetchOverpass(overpassQuery(center, sport, safeRadius), controller.signal);
    const routes = (json.elements as any[])
      .filter((element) => element?.type === "relation")
      .map((relation) => relationToRoute(relation, center, sport))
      .filter((route): route is RunningRouteTemplate => !!route)
      .sort((a, b) => {
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
    return { routes: [...unique.values()], center, radiusKm: safeRadius, provider: "openstreetmap-overpass" };
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("La recherche de parcours a expiré. Réessaie dans quelques secondes.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
