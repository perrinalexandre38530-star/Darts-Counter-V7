import { haversineMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import { cumulativeOutdoorRouteDistances } from "./outdoorNavigation";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteRerouteProvider = "openstreetmap-overpass-local-rerouter";

export type OutdoorRouteRerouteResult = {
  provider: OutdoorRouteRerouteProvider;
  routeId: string;
  route: GeoPoint[];
  distanceM: number;
  targetPoint: GeoPoint;
  targetIndex: number;
  targetDistanceM: number;
  forwardAdvanceM: number;
  routeRemainingAfterRejoinM: number;
  totalRemainingM: number;
  startSnapM: number;
  targetSnapM: number;
  networkNodeCount: number;
  networkEdgeCount: number;
  generatedAt: number;
};

export type OutdoorRouteRerouteRequest = {
  route: RunningRouteTemplate;
  currentPoint: GeoPoint;
  matchedDistanceM: number;
  sport: OutdoorPerformanceSport;
  signal?: AbortSignal;
};

type OsmWay = {
  id: number;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

type Edge = { to: string; meters: number; weight: number };
type Node = { key: string; lat: number; lon: number; edges: Edge[] };
type Graph = { nodes: Map<string, Node>; edgeCount: number };

type CandidateTarget = {
  index: number;
  point: GeoPoint;
  routeDistanceM: number;
  forwardAdvanceM: number;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const HIGHWAYS = new Set([
  "path",
  "footway",
  "pedestrian",
  "track",
  "bridleway",
  "cycleway",
  "living_street",
  "residential",
  "service",
  "unclassified",
  "tertiary",
  "steps",
]);

const TRAIL_HIGHWAYS = new Set(["path", "track", "bridleway"]);
const UNPAVED_SURFACES = new Set(["unpaved", "gravel", "fine_gravel", "dirt", "earth", "ground", "grass", "mud", "sand", "woodchips"]);
const MAX_GRAPH_NODES = 22000;
const MAX_REROUTE_POINTS = 520;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function coordKey(lat: number, lon: number) {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function isAllowedWay(tags: Record<string, string> | undefined) {
  const highway = String(tags?.highway || "");
  if (!HIGHWAYS.has(highway)) return false;
  const access = String(tags?.access || "").toLowerCase();
  const foot = String(tags?.foot || "").toLowerCase();
  if (["private", "no"].includes(access) || ["private", "no"].includes(foot)) return false;
  if (String(tags?.motorroad || "").toLowerCase() === "yes") return false;
  return true;
}

function preferenceFactor(tags: Record<string, string> | undefined, sport: OutdoorPerformanceSport) {
  const highway = String(tags?.highway || "");
  const surface = String(tags?.surface || "").toLowerCase();
  const trailLike = TRAIL_HIGHWAYS.has(highway) || UNPAVED_SURFACES.has(surface);
  let factor = 1;

  if (sport === "trail" || sport === "hiking") {
    if (trailLike) factor *= 0.72;
    else if (highway === "footway" || highway === "pedestrian") factor *= 0.86;
    else if (highway === "living_street" || highway === "service") factor *= 1.06;
    else if (highway === "residential" || highway === "unclassified") factor *= 1.25;
    else if (highway === "tertiary") factor *= 1.65;
  } else if (sport === "walking" || sport === "nordic-walking") {
    if (highway === "footway" || highway === "pedestrian") factor *= 0.76;
    else if (highway === "path" || highway === "cycleway") factor *= 0.86;
    else if (highway === "living_street") factor *= 0.92;
    else if (highway === "steps") factor *= sport === "nordic-walking" ? 1.65 : 1.2;
    else if (highway === "tertiary") factor *= 1.55;
  } else {
    if (highway === "footway" || highway === "pedestrian" || highway === "cycleway") factor *= 0.8;
    else if (highway === "path" || highway === "track") factor *= 0.9;
    else if (highway === "living_street") factor *= 0.94;
    else if (highway === "residential" || highway === "service") factor *= 1.02;
    else if (highway === "tertiary") factor *= 1.48;
    else if (highway === "steps") factor *= 1.28;
  }

  return clamp(factor, 0.55, 2.6);
}

function buildGraph(ways: OsmWay[], sport: OutdoorPerformanceSport): Graph {
  const nodes = new Map<string, Node>();
  let edgeCount = 0;

  const ensure = (lat: number, lon: number) => {
    const key = coordKey(lat, lon);
    let node = nodes.get(key);
    if (!node) {
      node = { key, lat, lon, edges: [] };
      nodes.set(key, node);
    }
    return node;
  };

  for (const way of ways) {
    if (!isAllowedWay(way.tags) || !Array.isArray(way.geometry) || way.geometry.length < 2) continue;
    const factor = preferenceFactor(way.tags, sport);
    for (let index = 1; index < way.geometry.length; index += 1) {
      const aRaw = way.geometry[index - 1];
      const bRaw = way.geometry[index];
      if (!aRaw || !bRaw) continue;
      const a = ensure(aRaw.lat, aRaw.lon);
      const b = ensure(bRaw.lat, bRaw.lon);
      if (a.key === b.key) continue;
      const meters = haversineMeters({ lat: a.lat, lon: a.lon, timestamp: 0 }, { lat: b.lat, lon: b.lon, timestamp: 0 });
      if (!Number.isFinite(meters) || meters < 0.5 || meters > 1600) continue;
      const weight = meters * factor;
      a.edges.push({ to: b.key, meters, weight });
      b.edges.push({ to: a.key, meters, weight });
      edgeCount += 2;
    }
    if (nodes.size > MAX_GRAPH_NODES) break;
  }
  return { nodes, edgeCount };
}

function futureCandidates(route: RunningRouteTemplate, matchedDistanceM: number): CandidateTarget[] {
  const points = route.route || [];
  const distances = cumulativeOutdoorRouteDistances(points);
  const total = Math.max(0, Number(route.distanceM || distances[distances.length - 1] || 0));
  const matched = clamp(matchedDistanceM, 0, total);
  const desired = [120, 260, 450, 700, 1000, 1400, 1850, 2300];
  const candidates: CandidateTarget[] = [];
  const seen = new Set<number>();

  for (const advance of desired) {
    const targetDistanceM = Math.min(total, matched + advance);
    let index = distances.findIndex((value) => value >= targetDistanceM);
    if (index < 0) index = points.length - 1;
    if (index < 0 || seen.has(index) || !points[index]) continue;
    seen.add(index);
    candidates.push({ index, point: points[index], routeDistanceM: distances[index] || targetDistanceM, forwardAdvanceM: Math.max(0, (distances[index] || targetDistanceM) - matched) });
  }

  if (!candidates.length && points.length) {
    const index = points.length - 1;
    candidates.push({ index, point: points[index], routeDistanceM: total, forwardAdvanceM: Math.max(0, total - matched) });
  }
  return candidates;
}

function bboxQuery(points: GeoPoint[]) {
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const span = Math.max(maxLat - minLat, maxLon - minLon);
  const pad = clamp(0.006 + span * 0.42, 0.006, 0.026);
  const south = clamp(minLat - pad, -85, 85);
  const north = clamp(maxLat + pad, -85, 85);
  const west = clamp(minLon - pad, -180, 180);
  const east = clamp(maxLon + pad, -180, 180);
  const highwayRegex = "path|footway|pedestrian|track|bridleway|cycleway|living_street|residential|service|unclassified|tertiary|steps";
  return `[out:json][timeout:20];\nway(${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)})[\"highway\"~\"^(${highwayRegex})$\"];\nout tags geom;`;
}

async function fetchWays(query: string, signal?: AbortSignal): Promise<OsmWay[]> {
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
      if (!response.ok) throw new Error(`OVERPASS_${response.status}`);
      const json = await response.json();
      return Array.isArray(json?.elements) ? json.elements.filter((item: any) => item?.type === "way") : [];
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("OVERPASS_UNAVAILABLE");
}

function nearestGraphNode(graph: Graph, point: GeoPoint, maxM = 500) {
  let best: { key: string; meters: number } | null = null;
  for (const node of graph.nodes.values()) {
    const meters = haversineMeters(point, { lat: node.lat, lon: node.lon, timestamp: 0 });
    if (meters <= maxM && (!best || meters < best.meters)) best = { key: node.key, meters };
  }
  return best;
}

class MinHeap {
  private data: Array<{ key: string; value: number }> = [];
  push(key: string, value: number) {
    const item = { key, value };
    this.data.push(item);
    let index = this.data.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if ((this.data[parent]?.value ?? Number.POSITIVE_INFINITY) <= value) break;
      this.data[index] = this.data[parent]!;
      index = parent;
    }
    this.data[index] = item;
  }
  pop() {
    if (!this.data.length) return null;
    const root = this.data[0]!;
    const last = this.data.pop()!;
    if (this.data.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1, right = left + 1;
        if (left >= this.data.length) break;
        let child = left;
        if (right < this.data.length && this.data[right]!.value < this.data[left]!.value) child = right;
        if (this.data[child]!.value >= last.value) break;
        this.data[index] = this.data[child]!;
        index = child;
      }
      this.data[index] = last;
    }
    return root;
  }
}

function shortestPaths(graph: Graph, startKey: string) {
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const metersFromStart = new Map<string, number>();
  const heap = new MinHeap();
  distances.set(startKey, 0);
  metersFromStart.set(startKey, 0);
  heap.push(startKey, 0);

  while (true) {
    const item = heap.pop();
    if (!item) break;
    if (item.value !== distances.get(item.key)) continue;
    const node = graph.nodes.get(item.key);
    if (!node) continue;
    for (const edge of node.edges) {
      const next = item.value + edge.weight;
      if (next >= (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
      distances.set(edge.to, next);
      previous.set(edge.to, item.key);
      metersFromStart.set(edge.to, (metersFromStart.get(item.key) || 0) + edge.meters);
      heap.push(edge.to, next);
    }
  }
  return { distances, previous, metersFromStart };
}

function reconstructPath(graph: Graph, previous: Map<string, string>, startKey: string, targetKey: string) {
  const keys: string[] = [];
  let current: string | undefined = targetKey;
  const guard = graph.nodes.size + 4;
  while (current && keys.length <= guard) {
    keys.push(current);
    if (current === startKey) break;
    current = previous.get(current);
  }
  if (keys[keys.length - 1] !== startKey) return [] as GeoPoint[];
  keys.reverse();
  return keys.map((key) => {
    const node = graph.nodes.get(key)!;
    return { lat: node.lat, lon: node.lon, timestamp: Date.now() } as GeoPoint;
  });
}

function simplify(points: GeoPoint[]) {
  if (points.length <= MAX_REROUTE_POINTS) return points;
  const step = Math.ceil(points.length / MAX_REROUTE_POINTS);
  return points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
}

export async function rerouteOutdoorToRoute(request: OutdoorRouteRerouteRequest): Promise<OutdoorRouteRerouteResult> {
  const { route, currentPoint, matchedDistanceM, sport, signal } = request;
  const candidates = futureCandidates(route, matchedDistanceM);
  if (!candidates.length) throw new Error("NO_REJOIN_TARGET");

  const queryPoints = [currentPoint, ...candidates.map((item) => item.point)];
  const ways = await fetchWays(bboxQuery(queryPoints), signal);
  const graph = buildGraph(ways, sport);
  if (graph.nodes.size < 2 || graph.edgeCount < 2) throw new Error("NO_ROUTABLE_NETWORK");

  const startSnap = nearestGraphNode(graph, currentPoint, 650);
  if (!startSnap) throw new Error("NO_ROUTABLE_START");
  const paths = shortestPaths(graph, startSnap.key);

  let best: {
    candidate: CandidateTarget;
    targetKey: string;
    targetSnapM: number;
    pathMeters: number;
    score: number;
  } | null = null;

  for (const candidate of candidates) {
    const targetSnap = nearestGraphNode(graph, candidate.point, 450);
    if (!targetSnap || !paths.distances.has(targetSnap.key)) continue;
    const networkMeters = paths.metersFromStart.get(targetSnap.key) || 0;
    const pathMeters = startSnap.meters + networkMeters + targetSnap.meters;
    const skipPenalty = Math.max(0, candidate.forwardAdvanceM - 700) * 0.10;
    const snapPenalty = (startSnap.meters + targetSnap.meters) * 0.35;
    const score = pathMeters + skipPenalty + snapPenalty;
    if (!best || score < best.score) best = { candidate, targetKey: targetSnap.key, targetSnapM: targetSnap.meters, pathMeters, score };
  }

  if (!best) throw new Error("NO_REROUTE_PATH");
  const graphPath = reconstructPath(graph, paths.previous, startSnap.key, best.targetKey);
  if (!graphPath.length) throw new Error("NO_REROUTE_PATH");

  const reroutePoints = simplify([
    { ...currentPoint, timestamp: currentPoint.timestamp || Date.now() },
    ...graphPath,
    { ...best.candidate.point, timestamp: Date.now() },
  ]);
  const total = Math.max(0, Number(route.distanceM || 0));
  const routeRemainingAfterRejoinM = Math.max(0, total - best.candidate.routeDistanceM);

  return {
    provider: "openstreetmap-overpass-local-rerouter",
    routeId: route.id,
    route: reroutePoints,
    distanceM: best.pathMeters,
    targetPoint: best.candidate.point,
    targetIndex: best.candidate.index,
    targetDistanceM: best.candidate.routeDistanceM,
    forwardAdvanceM: best.candidate.forwardAdvanceM,
    routeRemainingAfterRejoinM,
    totalRemainingM: best.pathMeters + routeRemainingAfterRejoinM,
    startSnapM: startSnap.meters,
    targetSnapM: best.targetSnapM,
    networkNodeCount: graph.nodes.size,
    networkEdgeCount: graph.edgeCount,
    generatedAt: Date.now(),
  };
}

export function outdoorRerouteMatchedDistanceM(reroute: OutdoorRouteRerouteResult, currentPoint: GeoPoint | null | undefined) {
  if (!currentPoint || !reroute.route.length) return 0;
  const distances = cumulativeOutdoorRouteDistances(reroute.route);
  let bestIndex = 0;
  let bestM = Number.POSITIVE_INFINITY;
  reroute.route.forEach((point, index) => {
    const meters = haversineMeters(currentPoint, point);
    if (meters < bestM) {
      bestM = meters;
      bestIndex = index;
    }
  });
  return distances[bestIndex] || 0;
}

export function rerouteAsRunningRoute(reroute: OutdoorRouteRerouteResult, sport: OutdoorPerformanceSport): RunningRouteTemplate {
  return {
    id: `reroute:${reroute.routeId}:${reroute.generatedAt}`,
    name: "Reroute",
    route: reroute.route,
    distanceM: reroute.distanceM,
    elevationGainM: 0,
    referenceElapsedMs: 0,
    createdAt: reroute.generatedAt,
    source: "generated",
    sport,
  };
}
