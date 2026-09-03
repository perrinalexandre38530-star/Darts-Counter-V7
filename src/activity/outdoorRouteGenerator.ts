import { clampRunningNumber as clamp, runningCoordKey as coordKey } from "./runningShared";
import { haversineMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import { enrichOutdoorRoutesElevation, routeHasElevation } from "./outdoorRouteElevation";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteGenerationCenter = { lat: number; lon: number };
export type OutdoorRouteGenerationProfile = "balanced" | "trails" | "easy";
export type OutdoorRouteGenerationShape = "loop" | "out-back";

export type OutdoorRouteGenerationRequest = {
  center: OutdoorRouteGenerationCenter;
  sport: OutdoorPerformanceSport;
  distanceKm: number;
  profile?: OutdoorRouteGenerationProfile;
  shape?: OutdoorRouteGenerationShape;
  count?: number;
  elevationGainMinM?: number | null;
  elevationGainMaxM?: number | null;
};

export type OutdoorRouteGenerationResult = {
  routes: RunningRouteTemplate[];
  center: OutdoorRouteGenerationCenter;
  targetDistanceKm: number;
  provider: "openstreetmap-overpass-local-router" | "openrouteservice-round-trip";
  networkNodeCount: number;
  networkEdgeCount: number;
  elevationTarget?: {
    minGainM: number;
    maxGainM: number;
    matchedCount: number;
    closestGainM: number | null;
  };
};

type OsmWay = {
  id: number;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

type GraphEdge = {
  to: string;
  meters: number;
  weight: number;
  key: string;
  trailLike: boolean;
};

type GraphNode = {
  key: string;
  lat: number;
  lon: number;
  edges: GraphEdge[];
};

type Graph = {
  nodes: Map<string, GraphNode>;
  edgeCount: number;
};

type PathResult = {
  keys: string[];
  meters: number;
  edgeKeys: string[];
  trailMeters: number;
};

type Candidate = {
  route: GeoPoint[];
  distanceM: number;
  score: number;
  trailSharePct: number;
  overlapPct: number;
  shape: OutdoorRouteGenerationShape;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
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
  "secondary",
  "secondary_link",
  "primary",
  "primary_link",
  "road",
  "steps",
]);

const TRAIL_HIGHWAYS = new Set(["path", "track", "bridleway"]);
const UNPAVED_SURFACES = new Set(["unpaved", "gravel", "fine_gravel", "dirt", "earth", "ground", "grass", "mud", "sand", "woodchips"]);
const MAX_GRAPH_NODES = 28000;
const MAX_ROUTE_POINTS = 620;

function openRouteServiceApiKey() {
  try {
    return String((import.meta as any)?.env?.VITE_OPENROUTESERVICE_API_KEY || "").trim();
  } catch {
    return "";
  }
}

function orsProfileForSport(sport: OutdoorPerformanceSport) {
  return sport === "trail" || sport === "hiking" ? "foot-hiking" : "foot-walking";
}

async function generateOpenRouteServiceLoops(request: OutdoorRouteGenerationRequest, signal: AbortSignal): Promise<RunningRouteTemplate[]> {
  const apiKey = openRouteServiceApiKey();
  if (!apiKey || request.shape === "out-back" || request.sport === "treadmill") return [];
  const count = clamp(Math.round(request.count || 3), 1, 5);
  const targetDistanceM = clamp(Number(request.distanceKm || 0) * 1000, 2000, 35000);
  const profile = request.profile || (request.sport === "trail" || request.sport === "hiking" ? "trails" : "balanced");
  const endpoint = `https://api.openrouteservice.org/v2/directions/${orsProfileForSport(request.sport)}/geojson`;
  const attempts = Array.from({ length: Math.max(count, 3) }, (_, index) => index + 1);
  const settled = await Promise.allSettled(attempts.map(async (seed) => {
    const response = await fetch(endpoint, {
      method: "POST",
      signal,
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/geo+json,application/json",
      },
      body: JSON.stringify({
        coordinates: [[request.center.lon, request.center.lat]],
        elevation: true,
        instructions: false,
        options: { round_trip: { length: Math.round(targetDistanceM), points: 5, seed } },
      }),
    });
    if (!response.ok) throw new Error(`openrouteservice HTTP ${response.status}`);
    const json = await response.json();
    const feature = Array.isArray(json?.features) ? json.features[0] : null;
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 4) throw new Error("openrouteservice route invalide");
    const route: GeoPoint[] = coords.map((coord: any, index: number) => ({
      lon: Number(coord?.[0]),
      lat: Number(coord?.[1]),
      altitude: Number.isFinite(Number(coord?.[2])) ? Number(coord[2]) : undefined,
      timestamp: Date.now() + index,
    })).filter((point: GeoPoint) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    if (route.length < 4) throw new Error("openrouteservice route vide");
    const distanceM = routeDistanceFromPoints(route);
    const deviationPct = Math.abs(distanceM - targetDistanceM) / Math.max(1, targetDistanceM) * 100;
    const elevationGainM = elevationGainFromPoints(route);
    return {
      id: `generated:ors:${Date.now()}:${seed}:${Math.round(distanceM)}`,
      externalId: `generated:ors:${seed}:${Math.round(distanceM)}`,
      name: `Boucle ${(targetDistanceM / 1000).toFixed(targetDistanceM % 1000 ? 1 : 0)} km · ${labelProfile(profile)} ${String.fromCharCode(64 + seed)}`,
      route: simplify(route),
      distanceM,
      elevationGainM,
      referenceElapsedMs: 0,
      createdAt: Date.now() + seed,
      source: "generated" as const,
      sport: request.sport,
      generation: {
        provider: "openrouteservice-round-trip" as const,
        targetDistanceM,
        profile,
        shape: "loop" as const,
        distanceErrorPct: Math.round(deviationPct * 10) / 10,
        trailSharePct: profile === "trails" ? 70 : 0,
        overlapPct: 0,
        elevationGainMinM: request.elevationGainMinM == null ? undefined : Number(request.elevationGainMinM),
        elevationGainMaxM: request.elevationGainMaxM == null ? undefined : Number(request.elevationGainMaxM),
        elevationTargetMatched: request.elevationGainMinM == null && request.elevationGainMaxM == null ? undefined : outdoorElevationTargetError(elevationGainM, Number(request.elevationGainMinM || 0), Number(request.elevationGainMaxM ?? 5000)) === 0,
        elevationSource: route.some((point) => Number.isFinite(point.altitude)) ? "embedded" as const : undefined,
      },
    } satisfies RunningRouteTemplate;
  }));
  return settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []).sort((a, b) => Number(a.generation?.distanceErrorPct || 0) - Number(b.generation?.distanceErrorPct || 0)).slice(0, count);
}

function routeDistanceFromPoints(points: GeoPoint[]) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += haversineMeters(points[index - 1]!, points[index]!);
  return total;
}

function elevationGainFromPoints(points: GeoPoint[]) {
  let gain = 0;
  let previous: number | null = null;
  for (const point of points) {
    const altitude = Number(point.altitude);
    if (!Number.isFinite(altitude)) continue;
    if (previous != null && altitude > previous) gain += altitude - previous;
    previous = altitude;
  }
  return Math.round(gain);
}

function generationRadiusM(distanceKm: number, shape: OutdoorRouteGenerationShape) {
  const distanceM = distanceKm * 1000;
  if (shape === "out-back") return Math.round(clamp(distanceM * 0.62, 2500, 14500));
  return Math.round(clamp(distanceM * 0.42, 2500, 12000));
}

function overpassQuery(center: OutdoorRouteGenerationCenter, radiusM: number) {
  const highwayRegex = "path|footway|pedestrian|track|bridleway|cycleway|living_street|residential|service|unclassified|tertiary|secondary|secondary_link|primary|primary_link|road|steps";
  return `[out:json][timeout:28];\nway(around:${Math.round(radiusM)},${center.lat.toFixed(6)},${center.lon.toFixed(6)})["highway"~"^(${highwayRegex})$"];\nout tags geom;`;
}

function isAllowedWay(tags: Record<string, string> | undefined) {
  const highway = String(tags?.highway || "");
  if (!HIGHWAYS.has(highway)) return false;
  const access = String(tags?.access || "").toLowerCase();
  const foot = String(tags?.foot || "").toLowerCase();
  if (["private", "no"].includes(access) || ["private", "no"].includes(foot)) return false;
  if (String(tags?.motorroad || "").toLowerCase() === "yes") return false;
  if (String(tags?.construction || "").toLowerCase() === "yes") return false;
  return true;
}

function isTrailLike(tags: Record<string, string> | undefined) {
  const highway = String(tags?.highway || "");
  const surface = String(tags?.surface || "").toLowerCase();
  return TRAIL_HIGHWAYS.has(highway) || UNPAVED_SURFACES.has(surface);
}

function preferenceFactor(tags: Record<string, string> | undefined, profile: OutdoorRouteGenerationProfile, sport: OutdoorPerformanceSport) {
  const highway = String(tags?.highway || "");
  const surface = String(tags?.surface || "").toLowerCase();
  const unpaved = UNPAVED_SURFACES.has(surface);
  let factor = 1;

  if (profile === "trails") {
    if (highway === "path") factor *= 0.66;
    else if (highway === "track" || highway === "bridleway") factor *= 0.74;
    else if (highway === "footway") factor *= 0.9;
    else if (highway === "pedestrian") factor *= 0.98;
    else if (highway === "steps") factor *= 1.1;
    else if (highway === "service" || highway === "living_street") factor *= 1.22;
    else if (highway === "residential" || highway === "unclassified") factor *= 1.38;
    else if (highway === "tertiary") factor *= 1.75;
    else if (highway === "secondary" || highway === "secondary_link") factor *= 2.35;
    else if (highway === "primary" || highway === "primary_link") factor *= 2.8;
    else if (highway === "road") factor *= 1.9;
    if (unpaved) factor *= 0.8;
  } else if (profile === "easy") {
    if (highway === "pedestrian") factor *= 0.72;
    else if (highway === "footway" || highway === "cycleway") factor *= 0.8;
    else if (highway === "living_street") factor *= 0.9;
    else if (highway === "residential" || highway === "service") factor *= 1.0;
    else if (highway === "unclassified") factor *= 1.08;
    else if (highway === "path") factor *= 1.18;
    else if (highway === "track" || highway === "bridleway") factor *= 1.32;
    else if (highway === "steps") factor *= 2.2;
    else if (highway === "secondary" || highway === "secondary_link") factor *= 1.8;
    else if (highway === "primary" || highway === "primary_link") factor *= 2.25;
    else if (highway === "road") factor *= 1.45;
    if (unpaved) factor *= 1.2;
  } else {
    if (highway === "path" || highway === "footway" || highway === "pedestrian") factor *= 0.82;
    else if (highway === "track" || highway === "cycleway" || highway === "bridleway") factor *= 0.9;
    else if (highway === "living_street") factor *= 0.94;
    else if (highway === "residential" || highway === "service") factor *= 1.04;
    else if (highway === "unclassified") factor *= 1.12;
    else if (highway === "tertiary") factor *= 1.42;
    else if (highway === "secondary" || highway === "secondary_link") factor *= 2.15;
    else if (highway === "primary" || highway === "primary_link") factor *= 2.65;
    else if (highway === "road") factor *= 1.85;
    else if (highway === "steps") factor *= 1.25;
  }

  if (sport === "trail" || sport === "hiking") {
    if (TRAIL_HIGHWAYS.has(highway) || unpaved) factor *= 0.86;
  } else if (sport === "running") {
    if (highway === "steps") factor *= 1.25;
  }
  return clamp(factor, 0.48, 2.8);
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function buildGraph(ways: OsmWay[], profile: OutdoorRouteGenerationProfile, sport: OutdoorPerformanceSport): Graph {
  const nodes = new Map<string, GraphNode>();
  let edgeCount = 0;

  const ensureNode = (lat: number, lon: number) => {
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
    const factor = preferenceFactor(way.tags, profile, sport);
    const trailLike = isTrailLike(way.tags);
    for (let index = 1; index < way.geometry.length; index += 1) {
      const aRaw = way.geometry[index - 1];
      const bRaw = way.geometry[index];
      if (!aRaw || !bRaw || !Number.isFinite(aRaw.lat) || !Number.isFinite(aRaw.lon) || !Number.isFinite(bRaw.lat) || !Number.isFinite(bRaw.lon)) continue;
      const a = ensureNode(aRaw.lat, aRaw.lon);
      const b = ensureNode(bRaw.lat, bRaw.lon);
      if (a.key === b.key) continue;
      const meters = haversineMeters({ lat: a.lat, lon: a.lon, timestamp: 0 }, { lat: b.lat, lon: b.lon, timestamp: 0 });
      if (!Number.isFinite(meters) || meters < 0.4 || meters > 1800) continue;
      const key = edgeKey(a.key, b.key);
      const weight = meters * factor;
      a.edges.push({ to: b.key, meters, weight, key, trailLike });
      b.edges.push({ to: a.key, meters, weight, key, trailLike });
      edgeCount += 2;
    }
    if (nodes.size > MAX_GRAPH_NODES) break;
  }

  return { nodes, edgeCount };
}

type GraphComponents = {
  componentByNode: Map<string, number>;
  nodesByComponent: Map<number, Set<string>>;
};

function graphComponents(graph: Graph): GraphComponents {
  const componentByNode = new Map<string, number>();
  const nodesByComponent = new Map<number, Set<string>>();
  let componentId = 0;
  for (const key of graph.nodes.keys()) {
    if (componentByNode.has(key)) continue;
    componentId += 1;
    const members = new Set<string>();
    const stack = [key];
    componentByNode.set(key, componentId);
    while (stack.length) {
      const current = stack.pop()!;
      members.add(current);
      const node = graph.nodes.get(current);
      if (!node) continue;
      for (const edge of node.edges) {
        if (componentByNode.has(edge.to)) continue;
        componentByNode.set(edge.to, componentId);
        stack.push(edge.to);
      }
    }
    nodesByComponent.set(componentId, members);
  }
  return { componentByNode, nodesByComponent };
}

function pickStartNode(graph: Graph, center: OutdoorRouteGenerationCenter, maxDistanceM = 2200) {
  const components = graphComponents(graph);
  const targetPoint = { lat: center.lat, lon: center.lon, timestamp: 0 };
  const candidates: Array<{ node: GraphNode; distanceM: number; componentId: number; componentSize: number; score: number }> = [];
  for (const node of graph.nodes.values()) {
    const distanceM = haversineMeters(targetPoint, { lat: node.lat, lon: node.lon, timestamp: 0 });
    if (distanceM > maxDistanceM) continue;
    const componentId = components.componentByNode.get(node.key) || 0;
    const componentSize = components.nodesByComponent.get(componentId)?.size || 0;
    if (componentSize < 12) continue;
    const connectivityBonus = Math.min(1200, Math.log2(Math.max(2, componentSize)) * 105);
    candidates.push({ node, distanceM, componentId, componentSize, score: distanceM - connectivityBonus });
  }
  candidates.sort((a, b) => a.score - b.score || b.componentSize - a.componentSize || a.distanceM - b.distanceM);
  const chosen = candidates[0];
  if (!chosen) return null;
  return {
    node: chosen.node,
    distanceM: chosen.distanceM,
    componentId: chosen.componentId,
    componentSize: chosen.componentSize,
    allowedKeys: components.nodesByComponent.get(chosen.componentId) || new Set<string>([chosen.node.key]),
  };
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

  pop(): { key: string; value: number } | null {
    if (!this.data.length) return null;
    const root = this.data[0]!;
    const last = this.data.pop()!;
    if (this.data.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.data.length) break;
        const smaller = right < this.data.length && this.data[right]!.value < this.data[left]!.value ? right : left;
        if (this.data[smaller]!.value >= last.value) break;
        this.data[index] = this.data[smaller]!;
        index = smaller;
      }
      this.data[index] = last;
    }
    return root;
  }
}

function shortestPath(graph: Graph, startKey: string, endKey: string, usedEdges?: Map<string, number>): PathResult | null {
  if (startKey === endKey) return { keys: [startKey], meters: 0, edgeKeys: [], trailMeters: 0 };
  const distances = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, { node: string; edge: GraphEdge }>();
  const heap = new MinHeap();
  heap.push(startKey, 0);
  let visited = 0;

  while (true) {
    const current = heap.pop();
    if (!current) break;
    if (current.value !== distances.get(current.key)) continue;
    if (current.key === endKey) break;
    const node = graph.nodes.get(current.key);
    if (!node) continue;
    visited += 1;
    if (visited > MAX_GRAPH_NODES * 1.4) break;
    for (const edge of node.edges) {
      const reuse = usedEdges?.get(edge.key) || 0;
      const reusePenalty = reuse ? 1 + Math.min(5.5, reuse * 2.35) : 1;
      const nextDistance = current.value + edge.weight * reusePenalty;
      if (nextDistance >= (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
      distances.set(edge.to, nextDistance);
      previous.set(edge.to, { node: current.key, edge });
      heap.push(edge.to, nextDistance);
    }
  }

  if (!previous.has(endKey)) return null;
  const keys = [endKey];
  const edges: GraphEdge[] = [];
  let cursor = endKey;
  while (cursor !== startKey) {
    const step = previous.get(cursor);
    if (!step) return null;
    edges.push(step.edge);
    cursor = step.node;
    keys.push(cursor);
  }
  keys.reverse();
  edges.reverse();
  return {
    keys,
    meters: edges.reduce((sum, edge) => sum + edge.meters, 0),
    edgeKeys: edges.map((edge) => edge.key),
    trailMeters: edges.reduce((sum, edge) => sum + (edge.trailLike ? edge.meters : 0), 0),
  };
}

function nearestNode(graph: Graph, target: OutdoorRouteGenerationCenter, maxDistanceM = Number.POSITIVE_INFINITY, allowedKeys?: Set<string>) {
  let best: GraphNode | null = null;
  let bestDistance = maxDistanceM;
  const targetPoint = { lat: target.lat, lon: target.lon, timestamp: 0 };
  for (const node of graph.nodes.values()) {
    if (allowedKeys && !allowedKeys.has(node.key)) continue;
    const distance = haversineMeters(targetPoint, { lat: node.lat, lon: node.lon, timestamp: 0 });
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }
  return best ? { node: best, distanceM: bestDistance } : null;
}

function destinationPoint(center: OutdoorRouteGenerationCenter, bearingDeg: number, distanceM: number): OutdoorRouteGenerationCenter {
  const radius = 6371000;
  const bearing = bearingDeg * Math.PI / 180;
  const lat1 = center.lat * Math.PI / 180;
  const lon1 = center.lon * Math.PI / 180;
  const angular = distanceM / radius;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 * 180 / Math.PI, lon: ((lon2 * 180 / Math.PI + 540) % 360) - 180 };
}

function mergePaths(graph: Graph, paths: PathResult[]) {
  const keys: string[] = [];
  const edgeUse = new Map<string, number>();
  let trailMeters = 0;
  let meters = 0;
  for (const path of paths) {
    const segmentKeys = keys.length ? path.keys.slice(1) : path.keys;
    keys.push(...segmentKeys);
    meters += path.meters;
    trailMeters += path.trailMeters;
    for (const key of path.edgeKeys) edgeUse.set(key, (edgeUse.get(key) || 0) + 1);
  }
  const points = keys
    .map((key, index) => {
      const node = graph.nodes.get(key);
      return node ? { lat: node.lat, lon: node.lon, timestamp: Date.now() + index } : null;
    })
    .filter((point): point is GeoPoint => !!point);
  let repeatedMeters = 0;
  const counted = new Set<string>();
  for (const key of keys) {
    const node = graph.nodes.get(key);
    if (!node) continue;
    for (const edge of node.edges) {
      const count = edgeUse.get(edge.key) || 0;
      if (count > 1 && !counted.has(edge.key)) {
        repeatedMeters += edge.meters * (count - 1);
        counted.add(edge.key);
      }
    }
  }
  return {
    points,
    meters,
    trailSharePct: meters > 0 ? clamp(trailMeters / meters * 100, 0, 100) : 0,
    overlapPct: meters > 0 ? clamp(repeatedMeters / meters * 100, 0, 100) : 0,
  };
}

function simplify(points: GeoPoint[]) {
  if (points.length <= MAX_ROUTE_POINTS) return points;
  const step = Math.ceil(points.length / MAX_ROUTE_POINTS);
  const reduced = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
  if (reduced[reduced.length - 1] !== points[points.length - 1]) reduced.push(points[points.length - 1]!);
  return reduced;
}

function buildLoopCandidates(graph: Graph, center: OutdoorRouteGenerationCenter, startKey: string, targetDistanceM: number, allowedKeys?: Set<string>) {
  const candidates: Candidate[] = [];
  const radiusBase = targetDistanceM / 5.45;
  const bearings = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const radiusFactors = [0.7, 0.86, 1, 1.14, 1.32];
  const patterns: number[][] = [
    [0, 120, 240],
    [0, 90, 180, 270],
    [0, 72, 180, 288],
  ];

  for (const factor of radiusFactors) {
    const radius = clamp(radiusBase * factor, 550, 5200);
    for (const bearing of bearings) {
      for (const pattern of patterns) {
        const targets = pattern
          .map((offset) => nearestNode(graph, destinationPoint(center, bearing + offset, radius), Math.max(1000, radius * 0.75), allowedKeys)?.node)
          .filter((node): node is GraphNode => !!node);
        if (targets.length !== pattern.length) continue;
        const uniqueTargets = new Set(targets.map((node) => node.key));
        if (uniqueTargets.size !== targets.length || uniqueTargets.has(startKey)) continue;

        const used = new Map<string, number>();
        const paths: PathResult[] = [];
        let from = startKey;
        let failed = false;
        for (const target of [...targets, graph.nodes.get(startKey)!]) {
          const path = shortestPath(graph, from, target.key, used);
          if (!path || path.meters < 25) {
            failed = true;
            break;
          }
          paths.push(path);
          for (const key of path.edgeKeys) used.set(key, (used.get(key) || 0) + 1);
          from = target.key;
        }
        if (failed) continue;
        const merged = mergePaths(graph, paths);
        if (merged.points.length < 4 || merged.meters < targetDistanceM * 0.42 || merged.meters > targetDistanceM * 2.05) continue;
        const deviation = Math.abs(merged.meters - targetDistanceM) / targetDistanceM;
        const overlapPenalty = Math.max(0, merged.overlapPct - 10) / 100;
        const score = deviation + overlapPenalty * 0.88 - Math.min(0.1, merged.trailSharePct / 900);
        candidates.push({ route: simplify(merged.points), distanceM: merged.meters, score, trailSharePct: merged.trailSharePct, overlapPct: merged.overlapPct, shape: "loop" });
      }
    }
  }
  return candidates;
}

function buildOutBackCandidates(graph: Graph, center: OutdoorRouteGenerationCenter, startKey: string, targetDistanceM: number, allowedKeys?: Set<string>) {
  const candidates: Candidate[] = [];
  const outwardTarget = targetDistanceM / 2;
  const bearings = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  for (const factor of [0.55, 0.7, 0.84, 1, 1.16, 1.34]) {
    const radius = clamp(outwardTarget * factor, 500, 9000);
    for (const bearing of bearings) {
      const target = nearestNode(graph, destinationPoint(center, bearing, radius), Math.max(1100, radius * 0.7), allowedKeys)?.node;
      if (!target || target.key === startKey) continue;
      const outward = shortestPath(graph, startKey, target.key);
      if (!outward || outward.meters < 180) continue;
      const returnKeys = [...outward.keys].reverse();
      const routeKeys = [...outward.keys, ...returnKeys.slice(1)];
      const points = routeKeys
        .map((key, index) => {
          const node = graph.nodes.get(key);
          return node ? { lat: node.lat, lon: node.lon, timestamp: Date.now() + index } : null;
        })
        .filter((point): point is GeoPoint => !!point);
      const distanceM = outward.meters * 2;
      if (distanceM < targetDistanceM * 0.4 || distanceM > targetDistanceM * 2.0) continue;
      const deviation = Math.abs(distanceM - targetDistanceM) / targetDistanceM;
      const trailSharePct = outward.meters > 0 ? outward.trailMeters / outward.meters * 100 : 0;
      candidates.push({ route: simplify(points), distanceM, score: deviation + 0.06, trailSharePct, overlapPct: 50, shape: "out-back" });
    }
  }
  return candidates;
}

function dedupeCandidates(candidates: Candidate[]) {
  const sorted = [...candidates].sort((a, b) => a.score - b.score || Math.abs(a.overlapPct) - Math.abs(b.overlapPct));
  const output: Candidate[] = [];
  for (const candidate of sorted) {
    const duplicate = output.some((existing) => {
      const a = existing.route[Math.floor(existing.route.length / 2)];
      const b = candidate.route[Math.floor(candidate.route.length / 2)];
      if (!a || !b) return false;
      const midpointDistance = haversineMeters(a, b);
      const distanceRatio = Math.abs(existing.distanceM - candidate.distanceM) / Math.max(1, existing.distanceM);
      return midpointDistance < 180 && distanceRatio < 0.08;
    });
    if (!duplicate) output.push(candidate);
    if (output.length >= 12) break;
  }
  return output;
}

export function normalizeOutdoorElevationTarget(minValue?: number | null, maxValue?: number | null) {
  const hasMin = minValue != null && Number.isFinite(Number(minValue));
  const hasMax = maxValue != null && Number.isFinite(Number(maxValue));
  if (!hasMin && !hasMax) return null;
  let minGainM = clamp(Math.round(hasMin ? Number(minValue) : 0), 0, 5000);
  let maxGainM = clamp(Math.round(hasMax ? Number(maxValue) : Math.max(minGainM, 5000)), 0, 5000);
  if (maxGainM < minGainM) [minGainM, maxGainM] = [maxGainM, minGainM];
  return { minGainM, maxGainM };
}

export function outdoorElevationTargetError(gainM: number, minGainM: number, maxGainM: number) {
  const gain = Math.max(0, Number(gainM || 0));
  if (gain < minGainM) return minGainM - gain;
  if (gain > maxGainM) return gain - maxGainM;
  return 0;
}

function labelProfile(profile: OutdoorRouteGenerationProfile) {
  if (profile === "trails") return "Sentiers";
  if (profile === "easy") return "Facile";
  return "Équilibré";
}

async function fetchNetwork(query: string, signal: AbortSignal) {
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
      if (!Array.isArray(json?.elements)) throw new Error("Réseau cartographique invalide.");
      return json.elements as OsmWay[];
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Service cartographique indisponible.");
}

export async function generateOutdoorRoutes(request: OutdoorRouteGenerationRequest): Promise<OutdoorRouteGenerationResult> {
  const { center, sport } = request;
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lon)) throw new Error("Position GPS invalide.");
  if (sport === "treadmill") throw new Error("La génération de parcours n'est pas disponible sur tapis roulant.");

  const distanceKm = clamp(Math.round(Number(request.distanceKm || 0) * 10) / 10, 2, 35);
  const targetDistanceM = distanceKm * 1000;
  const profile = request.profile || (sport === "trail" || sport === "hiking" ? "trails" : "balanced");
  const shape = request.shape || "loop";
  const count = clamp(Math.round(request.count || 3), 1, 5);
  const elevationTarget = normalizeOutdoorElevationTarget(request.elevationGainMinM, request.elevationGainMaxM);
  const radiusM = Math.round(clamp(generationRadiusM(distanceKm, shape) * 1.28, 3000, 16500));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);

  try {
    try {
      const remoteRoutes = await generateOpenRouteServiceLoops({ ...request, distanceKm, profile, shape, count }, controller.signal);
      if (remoteRoutes.length >= count) {
        const sortedRemote = elevationTarget
          ? [...remoteRoutes].sort((a, b) => {
              const aError = outdoorElevationTargetError(Number(a.elevationGainM || 0), elevationTarget.minGainM, elevationTarget.maxGainM);
              const bError = outdoorElevationTargetError(Number(b.elevationGainM || 0), elevationTarget.minGainM, elevationTarget.maxGainM);
              return Number(aError > 0) - Number(bError > 0) || aError - bError || Number(a.generation?.distanceErrorPct || 0) - Number(b.generation?.distanceErrorPct || 0);
            })
          : remoteRoutes;
        return {
          routes: sortedRemote.slice(0, count),
          center,
          targetDistanceKm: distanceKm,
          provider: "openrouteservice-round-trip",
          networkNodeCount: 0,
          networkEdgeCount: 0,
          elevationTarget: elevationTarget ? {
            minGainM: elevationTarget.minGainM,
            maxGainM: elevationTarget.maxGainM,
            matchedCount: sortedRemote.filter((route) => outdoorElevationTargetError(Number(route.elevationGainM || 0), elevationTarget.minGainM, elevationTarget.maxGainM) === 0).length,
            closestGainM: sortedRemote[0] ? Math.round(Number(sortedRemote[0].elevationGainM || 0)) : null,
          } : undefined,
        };
      }
    } catch {
      // Optional provider: the local OpenStreetMap engine below remains the no-key fallback.
    }

    const ways = await fetchNetwork(overpassQuery(center, radiusM), controller.signal);
    const graph = buildGraph(ways, profile, sport);
    if (graph.nodes.size < 20 || graph.edgeCount < 40) throw new Error("Pas assez de chemins praticables autour de ta position pour générer un parcours.");
    const start = pickStartNode(graph, center, 2400);
    if (!start) throw new Error("Aucun chemin praticable n'a été trouvé près de ta position GPS.");

    const primaryCandidates = shape === "out-back"
      ? buildOutBackCandidates(graph, center, start.node.key, targetDistanceM, start.allowedKeys)
      : buildLoopCandidates(graph, center, start.node.key, targetDistanceM, start.allowedKeys);
    const fallbackCandidates = primaryCandidates.length >= Math.max(3, count)
      ? []
      : shape === "loop"
        ? buildOutBackCandidates(graph, center, start.node.key, targetDistanceM, start.allowedKeys)
        : buildLoopCandidates(graph, center, start.node.key, targetDistanceM, start.allowedKeys);
    const rawCandidates = [...primaryCandidates, ...fallbackCandidates.map((candidate) => ({ ...candidate, score: candidate.score + 0.22 }))];
    const candidatePoolSize = elevationTarget ? Math.min(12, Math.max(8, count * 3)) : count;
    const candidates = dedupeCandidates(rawCandidates).slice(0, candidatePoolSize);
    if (!candidates.length) throw new Error("Impossible de construire un parcours cohérent ici. Essaie une autre distance ou le mode aller-retour.");

    const now = Date.now();
    let routes = candidates.map((candidate, index): RunningRouteTemplate => {
      const distanceM = candidate.distanceM;
      const deviationPct = targetDistanceM > 0 ? Math.abs(distanceM - targetDistanceM) / targetDistanceM * 100 : 0;
      return {
        id: `generated:${now}:${index}:${Math.round(distanceM)}`,
        externalId: `generated:${now}:${index}`,
        name: `${candidate.shape === "loop" ? "Boucle" : "Aller-retour"} ${distanceKm.toFixed(distanceKm % 1 ? 1 : 0)} km · ${labelProfile(profile)} ${String.fromCharCode(65 + index)}`,
        route: candidate.route,
        distanceM,
        elevationGainM: 0,
        referenceElapsedMs: 0,
        createdAt: now + index,
        source: "generated",
        sport,
        generation: {
          provider: "openstreetmap-overpass-local-router",
          targetDistanceM,
          profile,
          shape: candidate.shape,
          distanceErrorPct: Math.round(deviationPct * 10) / 10,
          trailSharePct: Math.round(candidate.trailSharePct),
          overlapPct: Math.round(candidate.overlapPct),
          elevationGainMinM: elevationTarget?.minGainM,
          elevationGainMaxM: elevationTarget?.maxGainM,
        },
      };
    });

    let elevationTargetResult: OutdoorRouteGenerationResult["elevationTarget"] | undefined;
    if (elevationTarget) {
      const enriched = await enrichOutdoorRoutesElevation(routes, 4);
      const available = enriched.filter(routeHasElevation);
      if (!available.length) throw new Error("Le relief n'a pas pu être calculé. Réessaie dans quelques secondes ou génère sans contrainte de D+.");
      const scale = Math.max(120, (elevationTarget.maxGainM - elevationTarget.minGainM) / 2, (elevationTarget.minGainM + elevationTarget.maxGainM) * 0.12);
      routes = enriched
        .filter(routeHasElevation)
        .map((route) => {
          const gainM = Math.max(0, Math.round(Number(route.elevationGainM || 0)));
          const elevationErrorM = outdoorElevationTargetError(gainM, elevationTarget.minGainM, elevationTarget.maxGainM);
          const matched = elevationErrorM === 0;
          const distancePenalty = Math.max(0, Number(route.generation?.distanceErrorPct || 0)) / 100;
          const elevationPenalty = elevationErrorM / scale;
          const rankingScore = distancePenalty + elevationPenalty * 1.65;
          return {
            route: {
              ...route,
              name: `${route.name} · D+ ${gainM} m`,
              generation: route.generation ? {
                ...route.generation,
                elevationErrorM: Math.round(elevationErrorM),
                elevationTargetMatched: matched,
                elevationSource: "open-meteo-copernicus-dem" as const,
              } : route.generation,
            },
            rankingScore,
            matched,
            gainM,
          };
        })
        .sort((a, b) => Number(b.matched) - Number(a.matched) || a.rankingScore - b.rankingScore)
        .map((item) => item.route);
      const matchedCount = routes.filter((route) => route.generation?.elevationTargetMatched).length;
      const closest = routes[0];
      elevationTargetResult = {
        minGainM: elevationTarget.minGainM,
        maxGainM: elevationTarget.maxGainM,
        matchedCount,
        closestGainM: closest ? Math.round(Number(closest.elevationGainM || 0)) : null,
      };
    }

    routes = routes.slice(0, count);

    return {
      routes,
      center,
      targetDistanceKm: distanceKm,
      provider: "openstreetmap-overpass-local-router",
      networkNodeCount: graph.nodes.size,
      networkEdgeCount: graph.edgeCount,
      elevationTarget: elevationTargetResult,
    };
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("La génération a expiré. Réessaie avec une distance plus courte ou dans quelques secondes.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
