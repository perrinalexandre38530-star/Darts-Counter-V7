// @ts-nocheck
// MULTISPORTS SCORING — RUNNING PERF global route catalogue V2.
// The endpoint aggregates a persistent MSS/Supabase catalogue, live OSM route
// relations and optional licensed providers (Outdooractive). Results are returned
// in one normalized shape so the client never needs provider-specific logic.

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OUTDOORACTIVE_API_KEY?: string;
  OUTDOORACTIVE_PROJECT_KEY?: string;
}

type Point = { lat: number; lon: number; timestamp: number; altitude?: number };
type CatalogRoute = {
  id: string;
  externalId: string;
  name: string;
  route: Point[];
  distanceM: number;
  elevationGainM: number;
  referenceElapsedMs: number;
  createdAt: number;
  source: "osm" | "catalog";
  sport: string;
  network?: string;
  routeRef?: string;
  operator?: string;
  catalog?: {
    provider: string;
    providerRouteId: string;
    sourceUrl?: string;
    imageUrl?: string;
    attribution?: string;
    license?: string;
    ranking?: number;
    difficulty?: number;
    isLoop?: boolean;
    cached?: boolean;
  };
};

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const CACHE_TTL_SECONDS = 6 * 60 * 60;
const STALE_TTL_SECONDS = 24 * 60 * 60;
const MAX_ROUTE_POINTS = 620;
const MAX_RETURNED_ROUTES = 72;
const MAX_OUTDOORACTIVE_IDS = 28;

function json(payload: any, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? `public, max-age=300, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${STALE_TTL_SECONDS}` : "no-store",
      "access-control-allow-origin": "*",
      "x-mss-route-catalog": "v2",
      ...headers,
    },
  });
}

function finite(value: string | null | number | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function canonicalSport(value: string | null) {
  const sport = String(value || "running").toLowerCase().trim();
  if (["running", "trail", "hiking", "walking", "nordic-walking"].includes(sport)) return sport;
  return "running";
}

function routeKindsForSport(sport: string) {
  if (sport === "running") return "running|fitness_trail|foot|hiking";
  if (sport === "trail") return "hiking|foot|running|fitness_trail";
  if (sport === "hiking") return "hiking|foot";
  if (sport === "walking") return "foot|hiking|running|fitness_trail";
  if (sport === "nordic-walking") return "nordic_walking|foot|hiking|fitness_trail";
  return "hiking|foot|running|fitness_trail";
}

function bboxAround(lat: number, lon: number, radiusKm: number) {
  const radius = Math.max(3, Math.min(80, radiusKm));
  const latDelta = radius / 111.32;
  const lonScale = Math.max(0.18, Math.cos(lat * Math.PI / 180));
  const lonDelta = radius / (111.32 * lonScale);
  return {
    south: Math.max(-85, lat - latDelta),
    west: Math.max(-180, lon - lonDelta),
    north: Math.min(85, lat + latDelta),
    east: Math.min(180, lon + lonDelta),
  };
}

function overpassQuery(lat: number, lon: number, sport: string, radiusKm: number) {
  const bbox = bboxAround(lat, lon, radiusKm);
  const kinds = routeKindsForSport(sport);
  const box = `${bbox.south.toFixed(6)},${bbox.west.toFixed(6)},${bbox.north.toFixed(6)},${bbox.east.toFixed(6)}`;
  return `[out:json][timeout:28];\nrelation["type"="route"]["route"~"^(${kinds})$"](${box});\nout geom(${box});`;
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function routeDistanceMeters(points: Point[]) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineMeters(points[i - 1], points[i]);
  return total;
}

function simplify(points: Point[]) {
  if (points.length <= MAX_ROUTE_POINTS) return points;
  const step = Math.ceil(points.length / MAX_ROUTE_POINTS);
  const out = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}

function geometryToPoints(geometry: any[]) {
  const now = Date.now();
  return simplify((Array.isArray(geometry) ? geometry : [])
    .map((point, index) => ({ lat: Number(point?.lat), lon: Number(point?.lon), timestamp: now + index }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)));
}

function connectedChains(relation: any) {
  const rawSegments = (Array.isArray(relation?.members) ? relation.members : [])
    .filter((member: any) => member?.type === "way" && Array.isArray(member?.geometry) && member.geometry.length >= 2)
    .map((member: any) => geometryToPoints(member.geometry))
    .filter((segment: Point[]) => segment.length >= 2);
  const chains: Point[][] = [];
  for (const segment of rawSegments) {
    if (!chains.length) { chains.push([...segment]); continue; }
    let bestIndex = -1;
    let bestGap = Number.POSITIVE_INFINITY;
    let reverse = false;
    let prepend = false;
    for (let index = 0; index < chains.length; index += 1) {
      const chain = chains[index];
      const candidates = [
        { gap: haversineMeters(chain[chain.length - 1], segment[0]), reverse: false, prepend: false },
        { gap: haversineMeters(chain[chain.length - 1], segment[segment.length - 1]), reverse: true, prepend: false },
        { gap: haversineMeters(chain[0], segment[segment.length - 1]), reverse: false, prepend: true },
        { gap: haversineMeters(chain[0], segment[0]), reverse: true, prepend: true },
      ];
      candidates.sort((a, b) => a.gap - b.gap);
      if (candidates[0].gap < bestGap) {
        bestGap = candidates[0].gap;
        bestIndex = index;
        reverse = candidates[0].reverse;
        prepend = candidates[0].prepend;
      }
    }
    const oriented = reverse ? [...segment].reverse() : segment;
    if (bestIndex >= 0 && bestGap <= 550) {
      const chain = chains[bestIndex];
      chains[bestIndex] = prepend ? [...oriented.slice(0, -1), ...chain] : [...chain, ...oriented.slice(1)];
    } else chains.push([...segment]);
  }
  return chains.filter((chain) => chain.length >= 2).map(simplify).sort((a, b) => routeDistanceMeters(b) - routeDistanceMeters(a));
}

function cleanText(value: any, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 180) : fallback;
}

function osmRelationToRoute(relation: any, sport: string): CatalogRoute | null {
  const relationId = Number(relation?.id);
  if (!Number.isFinite(relationId)) return null;
  const route = connectedChains(relation)[0];
  if (!route || route.length < 2) return null;
  const distanceM = Math.round(routeDistanceMeters(route));
  if (!(distanceM >= 1000)) return null;
  const tags = relation?.tags || {};
  const ref = cleanText(tags.ref);
  const name = cleanText(tags["name:fr"] || tags.name || ref, `Parcours OSM ${relationId}`);
  const first = route[0];
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
    network: cleanText(tags.network || tags["network:type"]) || undefined,
    routeRef: ref || undefined,
    operator: cleanText(tags.operator) || undefined,
    catalog: {
      provider: "openstreetmap",
      providerRouteId: String(relationId),
      sourceUrl: `https://www.openstreetmap.org/relation/${relationId}`,
      attribution: "© OpenStreetMap contributors",
      license: "ODbL",
      isLoop: route.length > 2 && haversineMeters(route[0], route[route.length - 1]) <= Math.max(120, distanceM * 0.04),
      cached: false,
    },
  };
}

async function fetchOverpass(query: string, signal: AbortSignal) {
  const errors: string[] = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { accept: "application/json", "user-agent": "MULTISPORTS-SCORING-RouteCatalog/2.0" },
        signal,
      });
      if (!response.ok) { errors.push(`${endpoint}:${response.status}`); continue; }
      const data = await response.json();
      if (!Array.isArray(data?.elements)) { errors.push(`${endpoint}:invalid-json`); continue; }
      return { data, endpoint };
    } catch (error: any) {
      if (signal.aborted) throw error;
      errors.push(`${endpoint}:${String(error?.message || error || "network")}`);
    }
  }
  throw new Error(errors.join(" | ") || "route_catalog_unavailable");
}

function supabaseHeaders(key: string) {
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" };
}

function normalizeStoredRow(raw: any, sport: string): CatalogRoute | null {
  const row = raw?.value || raw;
  const points = (Array.isArray(row?.route) ? row.route : [])
    .map((point: any, index: number) => ({
      lat: Number(point?.lat), lon: Number(point?.lon ?? point?.lng), timestamp: Number(point?.timestamp || Date.now() + index),
      altitude: Number.isFinite(Number(point?.altitude)) ? Number(point.altitude) : undefined,
    }))
    .filter((point: Point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  if (points.length < 2) return null;
  const provider = cleanText(row?.provider, "mss");
  const providerId = cleanText(row?.providerRouteId ?? row?.provider_route_id ?? row?.externalId ?? row?.external_id);
  if (!providerId) return null;
  const isOsm = provider === "openstreetmap";
  return {
    id: isOsm ? `osm:route:${providerId}` : `catalog:${provider}:${providerId}`,
    externalId: isOsm ? `osm-relation:${providerId}` : `${provider}:${providerId}`,
    name: cleanText(row?.title || row?.name, "Parcours référencé"),
    route: simplify(points),
    distanceM: Math.round(finite(row?.distanceM ?? row?.distance_m, routeDistanceMeters(points))),
    elevationGainM: Math.round(finite(row?.elevationGainM ?? row?.elevation_gain_m, 0)),
    referenceElapsedMs: 0,
    createdAt: new Date(row?.updatedAt ?? row?.updated_at ?? row?.fetchedAt ?? row?.fetched_at ?? Date.now()).getTime(),
    source: provider === "openstreetmap" ? "osm" : "catalog",
    sport: cleanText(row?.sport, sport),
    network: cleanText(row?.network) || undefined,
    routeRef: cleanText(row?.routeRef ?? row?.route_ref) || undefined,
    operator: cleanText(row?.operator) || undefined,
    catalog: {
      provider,
      providerRouteId: providerId,
      sourceUrl: cleanText(row?.sourceUrl ?? row?.source_url) || undefined,
      imageUrl: cleanText(row?.imageUrl ?? row?.image_url) || undefined,
      attribution: cleanText(row?.attribution) || undefined,
      license: cleanText(row?.license ?? row?.sourceLicense ?? row?.source_license) || undefined,
      ranking: finite(row?.ranking, 0) || undefined,
      difficulty: finite(row?.difficulty, 0) || undefined,
      isLoop: typeof (row?.isLoop ?? row?.is_loop) === "boolean" ? Boolean(row?.isLoop ?? row?.is_loop) : undefined,
      cached: true,
    },
  };
}

async function searchPersistentCatalog(env: Env, lat: number, lon: number, sport: string, radiusKm: number, targetKm: number, signal: AbortSignal) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return [] as CatalogRoute[];
  const targetM = targetKm > 0 ? targetKm * 1000 : 0;
  const body = {
    p_latitude: lat,
    p_longitude: lon,
    p_radius_km: Math.max(1, Math.min(100, radiusKm)),
    p_sport: sport,
    p_min_distance_m: targetM > 0 ? Math.round(targetM * 0.5) : 0,
    p_max_distance_m: targetM > 0 ? Math.round(targetM * 1.5) : 1000000,
    p_limit: 60,
  };
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/ms_search_running_route_catalog`, {
      method: "POST",
      headers: supabaseHeaders(env.SUPABASE_ANON_KEY),
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (Array.isArray(payload) ? payload : []).map((row) => normalizeStoredRow(row, sport)).filter(Boolean) as CatalogRoute[];
  } catch {
    return [];
  }
}

function toPersistRow(route: CatalogRoute) {
  if (!route.catalog || route.catalog.provider !== "openstreetmap") return null;
  const first = route.route[0];
  if (!first) return null;
  return {
    provider: route.catalog.provider,
    provider_route_id: route.catalog.providerRouteId,
    title: route.name,
    sport: route.sport,
    route: route.route,
    distance_m: Math.round(route.distanceM),
    elevation_gain_m: Math.round(route.elevationGainM || 0),
    center_lat: first.lat,
    center_lon: first.lon,
    network: route.network || null,
    route_ref: route.routeRef || null,
    operator: route.operator || null,
    source_url: route.catalog.sourceUrl || null,
    image_url: route.catalog.imageUrl || null,
    attribution: route.catalog.attribution || "© OpenStreetMap contributors",
    source_license: route.catalog.license || "ODbL",
    ranking: route.catalog.ranking || 0,
    difficulty: route.catalog.difficulty || 0,
    is_loop: Boolean(route.catalog.isLoop),
    metadata: { source: "live-osm", importedBy: "mss-route-catalog-v2" },
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function persistRoutes(env: Env, routes: CatalogRoute[]) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const rows = routes.map(toPersistRow).filter(Boolean);
  if (!rows.length) return;
  try {
    await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/ms_running_route_catalog?on_conflict=provider,provider_route_id,sport`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows.slice(0, 64)),
    });
  } catch {}
}

function extractIds(payload: any): string[] {
  const direct = payload?.data?.ids ?? payload?.ids ?? payload?.result?.ids;
  if (Array.isArray(direct)) return direct.map(String).filter(Boolean);
  const found: string[] = [];
  const visit = (value: any, depth = 0) => {
    if (!value || depth > 5) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return; }
    if (typeof value !== "object") return;
    if (Array.isArray(value.ids)) value.ids.forEach((id: any) => found.push(String(id)));
    Object.values(value).forEach((child) => visit(child, depth + 1));
  };
  visit(payload);
  return [...new Set(found.filter(Boolean))];
}

function extractTours(payload: any): any[] {
  const candidates: any[] = [];
  const visit = (value: any, depth = 0) => {
    if (!value || depth > 6) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return; }
    if (typeof value !== "object") return;
    const geometry = value.geometry ?? value.geom ?? value.lineString;
    const id = value.id ?? value["@id"];
    if (id != null && geometry != null && (value.length != null || value.category != null || value.title != null)) candidates.push(value);
    Object.entries(value).forEach(([key, child]) => {
      if (key !== "geometry" && key !== "images") visit(child, depth + 1);
    });
  };
  visit(payload);
  const seen = new Set<string>();
  return candidates.filter((item) => {
    const id = String(item.id ?? item["@id"] ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function scalar(value: any): any {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return scalar(value[0]);
  if (typeof value === "object") return value.value ?? value.text ?? value["#text"] ?? value._ ?? value.name ?? undefined;
  return undefined;
}

function parseOutdooractiveGeometry(value: any): Point[] {
  const raw = cleanText(scalar(value), "").replace(/^LINESTRING\s*\(/i, "").replace(/\)$/, "");
  if (!raw) return [];
  const now = Date.now();
  const points = raw.split(/\s+/).map((pair, index) => {
    const pieces = pair.split(",");
    if (pieces.length < 2) return null;
    const lon = Number(pieces[0]);
    const lat = Number(pieces[1]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, timestamp: now + index } : null;
  }).filter(Boolean) as Point[];
  return simplify(points);
}

function outdooractiveSportAffinity(category: string, title: string, sport: string) {
  const haystack = `${category} ${title}`.toLowerCase();
  if (sport === "nordic-walking") return /(nordic|nordique|nordisch)/i.test(haystack) ? 4 : /(walk|marche|hiking|wander|randonn|sender)/i.test(haystack) ? 2 : 0;
  if (sport === "trail") return /(trail|mountain|berg|hiking|wander|randonn|sender|trek)/i.test(haystack) ? 3 : /(running|lauf|course)/i.test(haystack) ? 2 : 0;
  if (sport === "hiking") return /(hiking|wander|randonn|sender|walk|trek)/i.test(haystack) ? 3 : 0;
  if (sport === "walking") return /(walk|marche|promenade|hiking|wander|randonn|spazier)/i.test(haystack) ? 3 : 0;
  if (sport === "running") return /(running|jog|lauf|course|trail)/i.test(haystack) ? 3 : /(fitness)/i.test(haystack) ? 2 : 1;
  return 1;
}

function outdooractiveTourToRoute(tour: any, sport: string): CatalogRoute | null {
  const id = String(tour?.id ?? tour?.["@id"] ?? "");
  if (!id) return null;
  const route = parseOutdooractiveGeometry(tour?.geometry);
  if (route.length < 2) return null;
  const title = cleanText(scalar(tour?.title), `Outdooractive ${id}`);
  const categoryName = cleanText(scalar(tour?.category?.name ?? tour?.category), "");
  if (outdooractiveSportAffinity(categoryName, title, sport) <= 0) return null;
  const distanceM = finite(scalar(tour?.length), routeDistanceMeters(route));
  const elevation = tour?.elevation || {};
  const ascent = finite(elevation?.ascent ?? elevation?.["@ascent"], 0);
  const ranking = finite(tour?.ranking ?? tour?.["@ranking"], 0);
  const rating = tour?.rating || {};
  const difficulty = finite(rating?.difficulty ?? rating?.["@difficulty"], 0);
  const properties = Array.isArray(tour?.properties?.property) ? tour.properties.property : Array.isArray(tour?.properties) ? tour.properties : [];
  const loop = properties.some((property: any) => /loop/i.test(String(property?.tag || property?.name || property?.text || ""))) || haversineMeters(route[0], route[route.length - 1]) <= Math.max(120, distanceM * 0.04);
  const imageId = String(tour?.primaryImage?.id ?? tour?.primaryImage?.["@id"] ?? "");
  const sourceName = cleanText(tour?.meta?.source?.name ?? tour?.meta?.source?.["@name"], "Outdooractive");
  const author = cleanText(scalar(tour?.meta?.author), "");
  return {
    id: `catalog:outdooractive:${id}`,
    externalId: `outdooractive:${id}`,
    name: title,
    route,
    distanceM: Math.round(distanceM),
    elevationGainM: Math.round(ascent),
    referenceElapsedMs: 0,
    createdAt: Date.now(),
    source: "catalog",
    sport,
    catalog: {
      provider: "outdooractive",
      providerRouteId: id,
      sourceUrl: "https://www.outdooractive.com/",
      imageUrl: imageId ? `https://img.oastatic.com/img2/${imageId}/420x237r/variant.jpg` : undefined,
      attribution: [sourceName, author].filter(Boolean).join(" · ") || "Outdooractive",
      license: "Outdooractive API terms",
      ranking: ranking || undefined,
      difficulty: difficulty || undefined,
      isLoop: loop,
      cached: false,
    },
  };
}

async function fetchOutdooractive(env: Env, lat: number, lon: number, sport: string, radiusKm: number, targetKm: number, signal: AbortSignal) {
  if (!env.OUTDOORACTIVE_API_KEY || !env.OUTDOORACTIVE_PROJECT_KEY) return [] as CatalogRoute[];
  const project = encodeURIComponent(env.OUTDOORACTIVE_PROJECT_KEY);
  const key = encodeURIComponent(env.OUTDOORACTIVE_API_KEY);
  const targetM = targetKm > 0 ? targetKm * 1000 : 0;
  const params = new URLSearchParams({
    location: `${lon},${lat}`,
    radius: String(Math.round(Math.min(80, Math.max(3, radiusKm)) * 1000)),
    sortby: "distance",
    limit: String(MAX_OUTDOORACTIVE_IDS),
    key: env.OUTDOORACTIVE_API_KEY,
    lang: "fr",
  });
  if (targetM > 0) {
    params.set("len_s", String(Math.max(500, Math.round(targetM * 0.5))));
    params.set("len_e", String(Math.round(targetM * 1.5)));
  }
  const nearbyUrl = `https://www.outdooractive.com/api/project/${project}/nearby/tour?${params.toString()}`;
  const nearby = await fetch(nearbyUrl, { headers: { accept: "application/json" }, signal });
  if (!nearby.ok) throw new Error(`outdooractive-nearby:${nearby.status}`);
  const ids = extractIds(await nearby.json()).slice(0, MAX_OUTDOORACTIVE_IDS);
  if (!ids.length) return [];
  const detailsUrl = `https://www.outdooractive.com/api/project/${project}/oois/${ids.map(encodeURIComponent).join(",")}?key=${key}&lang=fr&fallback=true`;
  const details = await fetch(detailsUrl, { headers: { accept: "application/json" }, signal });
  if (!details.ok) throw new Error(`outdooractive-details:${details.status}`);
  return extractTours(await details.json()).map((tour) => outdooractiveTourToRoute(tour, sport)).filter(Boolean) as CatalogRoute[];
}

function routeStartDistance(route: CatalogRoute, lat: number, lon: number) {
  const first = route.route[0];
  return first ? haversineMeters(first, { lat, lon }) : Number.POSITIVE_INFINITY;
}

function targetDistanceScore(route: CatalogRoute, targetKm: number) {
  if (!(targetKm > 0)) return 0;
  const targetM = targetKm * 1000;
  const ratio = Math.abs(route.distanceM - targetM) / Math.max(500, targetM);
  if (ratio <= 0.1) return 40;
  if (ratio <= 0.2) return 28;
  if (ratio <= 0.35) return 14;
  if (ratio <= 0.5) return 2;
  return -30;
}

function providerScore(route: CatalogRoute) {
  const provider = route.catalog?.provider || "";
  if (provider === "outdooractive") return 18 + Math.min(10, Number(route.catalog?.ranking || 0) / 10);
  if (provider === "openstreetmap") return 14;
  if (provider === "gpx-import") return 16;
  return 12;
}

function dedupeAndRank(routes: CatalogRoute[], lat: number, lon: number, targetKm: number) {
  const exact = new Map<string, CatalogRoute>();
  for (const route of routes) {
    if (!route?.route?.length || route.distanceM < 700) continue;
    const key = route.externalId || route.id;
    const existing = exact.get(key);
    if (!existing || route.route.length > existing.route.length) exact.set(key, route);
  }
  const sorted = [...exact.values()].sort((a, b) => {
    const aScore = providerScore(a) + targetDistanceScore(a, targetKm) - Math.min(25, routeStartDistance(a, lat, lon) / 2500);
    const bScore = providerScore(b) + targetDistanceScore(b, targetKm) - Math.min(25, routeStartDistance(b, lat, lon) / 2500);
    return bScore - aScore || Math.abs(a.distanceM - targetKm * 1000) - Math.abs(b.distanceM - targetKm * 1000);
  });
  const output: CatalogRoute[] = [];
  for (const candidate of sorted) {
    const duplicate = output.some((existing) => {
      const nameA = existing.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const nameB = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const distanceRatio = Math.abs(existing.distanceM - candidate.distanceM) / Math.max(1000, existing.distanceM);
      const startGap = haversineMeters(existing.route[0], candidate.route[0]);
      return (nameA && nameB && nameA === nameB && distanceRatio < 0.12) || (distanceRatio < 0.05 && startGap < 180);
    });
    if (!duplicate) output.push(candidate);
    if (output.length >= MAX_RETURNED_ROUTES) break;
  }
  return output;
}

function cacheRequestUrl(request: Request, lat: number, lon: number, sport: string, radiusKm: number, targetKm: number) {
  const u = new URL(request.url);
  u.search = "";
  u.searchParams.set("lat", (Math.round(lat * 500) / 500).toFixed(3));
  u.searchParams.set("lon", (Math.round(lon * 500) / 500).toFixed(3));
  u.searchParams.set("sport", sport);
  u.searchParams.set("radiusKm", String(Math.round(radiusKm)));
  u.searchParams.set("targetKm", targetKm > 0 ? targetKm.toFixed(1) : "0");
  u.searchParams.set("v", "2");
  return new Request(u.toString(), { method: "GET" });
}

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, {
  status: 204,
  headers: {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
  },
});

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil, env }) => {
  const url = new URL(request.url);
  const lat = finite(url.searchParams.get("lat"), NaN);
  const lon = finite(url.searchParams.get("lon"), NaN);
  const sport = canonicalSport(url.searchParams.get("sport"));
  const radiusKm = Math.max(3, Math.min(80, Math.round(finite(url.searchParams.get("radiusKm"), 15))));
  const targetKm = Math.max(0, Math.min(100, finite(url.searchParams.get("targetKm"), 0)));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -85 || lat > 85 || lon < -180 || lon > 180) {
    return json({ ok: false, error: "invalid_position" }, 400);
  }

  const cacheKey = cacheRequestUrl(request, lat, lon, sport, radiusKm, targetKm);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("x-mss-route-catalog-cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 31_000);
  const warnings: string[] = [];
  let osmElements: any[] = [];
  let osmUpstream = "";
  try {
    const storedPromise = searchPersistentCatalog(env, lat, lon, sport, radiusKm, targetKm, controller.signal);
    const osmPromise = fetchOverpass(overpassQuery(lat, lon, sport, radiusKm), controller.signal)
      .then(({ data, endpoint }) => {
        osmElements = Array.isArray(data?.elements) ? data.elements : [];
        osmUpstream = endpoint;
        return osmElements.filter((element: any) => element?.type === "relation").map((relation: any) => osmRelationToRoute(relation, sport)).filter(Boolean) as CatalogRoute[];
      })
      .catch((error) => { warnings.push(`osm:${String(error?.message || error)}`); return [] as CatalogRoute[]; });
    const outdooractivePromise = fetchOutdooractive(env, lat, lon, sport, radiusKm, targetKm, controller.signal)
      .catch((error) => { warnings.push(`outdooractive:${String(error?.message || error)}`); return [] as CatalogRoute[]; });

    const [stored, osmRoutes, outdooractiveRoutes] = await Promise.all([storedPromise, osmPromise, outdooractivePromise]);
    const routes = dedupeAndRank([...stored, ...osmRoutes, ...outdooractiveRoutes], lat, lon, targetKm);
    if (osmRoutes.length) waitUntil(persistRoutes(env, osmRoutes));

    const providerCounts = routes.reduce((acc: Record<string, number>, route) => {
      const provider = route.catalog?.provider || (route.source === "osm" ? "openstreetmap" : "mss");
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {});
    const response = json({
      ok: true,
      provider: "mss-global-route-catalog-v2",
      sport,
      radiusKm,
      targetKm,
      center: { lat, lon },
      fetchedAt: Date.now(),
      routes,
      // Kept for V117/backward compatibility. New clients consume `routes` first.
      elements: osmElements,
      upstream: osmUpstream || null,
      providers: providerCounts,
      warnings,
      persistentCatalog: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
      outdooractiveEnabled: Boolean(env.OUTDOORACTIVE_API_KEY && env.OUTDOORACTIVE_PROJECT_KEY),
    }, 200, { "x-mss-route-catalog-cache": "MISS" });
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error: any) {
    const reason = error?.name === "AbortError" ? "timeout" : String(error?.message || error || "unavailable");
    return json({ ok: false, error: "route_catalog_unavailable", reason, warnings }, 503);
  } finally {
    clearTimeout(timer);
  }
};
