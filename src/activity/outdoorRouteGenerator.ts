import { haversineMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
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
};

export type OutdoorRouteGenerationResult = {
  routes: RunningRouteTemplate[];
  center: OutdoorRouteGenerationCenter;
  targetDistanceKm: number;
  provider: "openstreetmap-overpass-local-router";
  networkNodeCount: number;
  networkEdgeCount: number;
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
const MAX_GRAPH_NODES = 28000;
const MAX_ROUTE_POINTS = 620;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function generationRadiusM(distanceKm: number, shape: OutdoorRouteGenerationShape) {
  const distanceM = distanceKm * 1000;
  if (shape === "out-back") return Math.round(clamp(distanceM * 0.62, 2500, 14500));
  return Math.round(clamp(distanceM * 0.42, 2500, 12000));
}

function overpassQuery(center: OutdoorRouteGenerationCenter, radiusM: number) {
  const highwayRegex = "path|footway|pedestrian|track|bridleway|cycleway|living_street|residential|service|unclassified|tertiary|steps";
  return `[out:json][timeout:24];\nway(around:${Math.round(radiusM)},${center.lat.toFixed(6)},${center.lon.toFixed(6)})["highway"~"^(${highwayRegex})$"];\nout tags geom;`;
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
    if (unpaved) factor *= 1.2;
  } else {
    if (highway === "path" || highway === "footway" || highway === "pedestrian") factor *= 0.82;
    else if (highway === "track" || highway === "cycleway" || highway === "bridleway") factor *= 0.9;
    else if (highway === "living_street") factor *= 0.94;
    else if (highway === "residential" || highway === "service") factor *= 1.04;
    else if (highway === "unclassified") factor *= 1.12;
    else if (highway === "tertiary") factor *= 1.42;
    else if (highway === "steps") factor *= 1.25;
  }

  if (sport === "trail" || sport === "hiking") {
    if (TRAIL_HIGHWAYS.has(highway) || unpaved) factor *= 0.86;
  } else if (sport === "running") {
    if (highway === "steps") factor *= 1.25;
  }
  return clamp(factor, 0.48, 2.8);
}

function coordKey(lat: number, lon: number) {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
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

function nearestNode(graph: Graph, target: OutdoorRouteGenerationCenter, maxDistanceM = Number.POSITIVE_INFINITY) {
  let best: GraphNode | null = null;
  let bestDistance = maxDistanceM;
  const targetPoint = { lat: target.lat, lon: target.lon, timestamp: 0 };
  for (const node of graph.nodes.values()) {
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

function buildLoopCandidates(graph: Graph, center: OutdoorRouteGenerationCenter, startKey: string, targetDistanceM: number) {
  const candidates: Candidate[] = [];
  const radiusBase = targetDistanceM / 5.45;
  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  const radiusFactors = [0.82, 1, 1.16];

  for (const factor of radiusFactors) {
    const radius = clamp(radiusBase * factor, 550, 5200);
    for (const bearing of bearings) {
      const targets = [bearing, bearing + 120, bearing + 240]
        .map((angle) => nearestNode(graph, destinationPoint(center, angle, radius), Math.max(850, radius * 0.55))?.node)
        .filter((node): node is GraphNode => !!node);
      if (targets.length !== 3) continue;
      const uniqueTargets = new Set(targets.map((node) => node.key));
      if (uniqueTargets.size !== 3 || uniqueTargets.has(startKey)) continue;

      const used = new Map<string, number>();
      const paths: PathResult[] = [];
      let from = startKey;
      let failed = false;
      for (const target of [...targets, graph.nodes.get(startKey)!]) {
        const path = shortestPath(graph, from, target.key, used);
        if (!path || path.meters < 35) {
          failed = true;
          break;
        }
        paths.push(path);
        for (const key of path.edgeKeys) used.set(key, (used.get(key) || 0) + 1);
        from = target.key;
      }
      if (failed) continue;
      const merged = mergePaths(graph, paths);
      if (merged.points.length < 4 || merged.meters < targetDistanceM * 0.5 || merged.meters > targetDistanceM * 1.75) continue;
      const deviation = Math.abs(merged.meters - targetDistanceM) / targetDistanceM;
      const overlapPenalty = Math.max(0, merged.overlapPct - 12) / 100;
      const score = deviation + overlapPenalty * 0.92 - Math.min(0.08, merged.trailSharePct / 1000);
      candidates.push({ route: simplify(merged.points), distanceM: merged.meters, score, trailSharePct: merged.trailSharePct, overlapPct: merged.overlapPct });
    }
  }
  return candidates;
}

function buildOutBackCandidates(graph: Graph, center: OutdoorRouteGenerationCenter, startKey: string, targetDistanceM: number) {
  const candidates: Candidate[] = [];
  const outwardTarget = targetDistanceM / 2;
  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  for (const factor of [0.72, 0.9, 1.08, 1.25]) {
    const radius = clamp(outwardTarget * factor, 500, 9000);
    for (const bearing of bearings) {
      const target = nearestNode(graph, destinationPoint(center, bearing, radius), Math.max(900, radius * 0.45))?.node;
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
      if (distanceM < targetDistanceM * 0.55 || distanceM > targetDistanceM * 1.65) continue;
      const deviation = Math.abs(distanceM - targetDistanceM) / targetDistanceM;
      const trailSharePct = outward.meters > 0 ? outward.trailMeters / outward.meters * 100 : 0;
      candidates.push({ route: simplify(points), distanceM, score: deviation, trailSharePct, overlapPct: 50 });
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
    if (output.length >= 8) break;
  }
  return output;
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
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
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
  const radiusM = generationRadiusM(distanceKm, shape);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);

  try {
    const ways = await fetchNetwork(overpassQuery(center, radiusM), controller.signal);
    const graph = buildGraph(ways, profile, sport);
    if (graph.nodes.size < 20 || graph.edgeCount < 40) throw new Error("Pas assez de chemins praticables autour de ta position pour générer un parcours.");
    const start = nearestNode(graph, center, 1400);
    if (!start) throw new Error("Aucun chemin praticable n'a été trouvé près de ta position GPS.");

    const rawCandidates = shape === "out-back"
      ? buildOutBackCandidates(graph, center, start.node.key, targetDistanceM)
      : buildLoopCandidates(graph, center, start.node.key, targetDistanceM);
    const candidates = dedupeCandidates(rawCandidates).slice(0, count);
    if (!candidates.length) throw new Error("Impossible de construire un parcours cohérent ici. Essaie une autre distance ou le mode aller-retour.");

    const now = Date.now();
    const routes = candidates.map((candidate, index): RunningRouteTemplate => {
      const distanceM = candidate.distanceM;
      const deviationPct = targetDistanceM > 0 ? Math.abs(distanceM - targetDistanceM) / targetDistanceM * 100 : 0;
      return {
        id: `generated:${now}:${index}:${Math.round(distanceM)}`,
        externalId: `generated:${now}:${index}`,
        name: `${shape === "loop" ? "Boucle" : "Aller-retour"} ${distanceKm.toFixed(distanceKm % 1 ? 1 : 0)} km · ${labelProfile(profile)} ${String.fromCharCode(65 + index)}`,
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
          shape,
          distanceErrorPct: Math.round(deviationPct * 10) / 10,
          trailSharePct: Math.round(candidate.trailSharePct),
          overlapPct: Math.round(candidate.overlapPct),
        },
      };
    });

    return {
      routes,
      center,
      targetDistanceKm: distanceKm,
      provider: "openstreetmap-overpass-local-router",
      networkNodeCount: graph.nodes.size,
      networkEdgeCount: graph.edgeCount,
    };
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("La génération a expiré. Réessaie avec une distance plus courte ou dans quelques secondes.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
