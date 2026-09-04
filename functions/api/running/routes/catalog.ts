// @ts-nocheck
// MULTISPORTS SCORING — RUNNING PERF global referenced-route catalogue.
// Same-origin Cloudflare Pages Function: avoids browser CORS/Overpass throttling,
// adds edge cache, retries public Overpass mirrors, and keeps the frontend thin.

interface Env {
  OUTDOORACTIVE_API_KEY?: string;
  OUTDOORACTIVE_PROJECT_KEY?: string;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const CACHE_TTL_SECONDS = 6 * 60 * 60;
const STALE_TTL_SECONDS = 24 * 60 * 60;

function json(payload: any, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? `public, max-age=300, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${STALE_TTL_SECONDS}` : "no-store",
      "access-control-allow-origin": "*",
      "x-mss-route-catalog": "v1",
      ...headers,
    },
  });
}

function finite(value: string | null, fallback: number) {
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
  const radius = Math.max(3, Math.min(60, radiusKm));
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
  // We intentionally query relations, not arbitrary ways: these are the closest thing
  // to an open, worldwide catalogue of already-referenced walking/running routes.
  return `[out:json][timeout:28];\nrelation["type"="route"]["route"~"^(${kinds})$"](${box});\nout geom(${box});`;
}

async function fetchOverpass(query: string, signal: AbortSignal) {
  const errors: string[] = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "accept": "application/json", "user-agent": "MULTISPORTS-SCORING-RouteCatalog/1.0" },
        signal,
      });
      if (!response.ok) {
        errors.push(`${endpoint}:${response.status}`);
        continue;
      }
      const data = await response.json();
      if (!Array.isArray(data?.elements)) {
        errors.push(`${endpoint}:invalid-json`);
        continue;
      }
      return { data, endpoint };
    } catch (error: any) {
      if (signal.aborted) throw error;
      errors.push(`${endpoint}:${String(error?.message || error || "network")}`);
    }
  }
  throw new Error(errors.join(" | ") || "route_catalog_unavailable");
}

function cacheRequestUrl(request: Request, lat: number, lon: number, sport: string, radiusKm: number) {
  const u = new URL(request.url);
  // Round the search center slightly so nearby users share the same edge cache entry.
  u.search = "";
  u.searchParams.set("lat", (Math.round(lat * 500) / 500).toFixed(3));
  u.searchParams.set("lon", (Math.round(lon * 500) / 500).toFixed(3));
  u.searchParams.set("sport", sport);
  u.searchParams.set("radiusKm", String(Math.round(radiusKm)));
  u.searchParams.set("v", "1");
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

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const lat = finite(url.searchParams.get("lat"), NaN);
  const lon = finite(url.searchParams.get("lon"), NaN);
  const sport = canonicalSport(url.searchParams.get("sport"));
  const radiusKm = Math.max(3, Math.min(60, Math.round(finite(url.searchParams.get("radiusKm"), 15))));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -85 || lat > 85 || lon < -180 || lon > 180) {
    return json({ ok: false, error: "invalid_position" }, 400);
  }

  const cacheKey = cacheRequestUrl(request, lat, lon, sport, radiusKm);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("x-mss-route-catalog-cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 31_000);
  try {
    const query = overpassQuery(lat, lon, sport, radiusKm);
    const { data, endpoint } = await fetchOverpass(query, controller.signal);
    const response = json({
      ok: true,
      provider: "mss-global-osm-catalog",
      source: "OpenStreetMap route relations",
      sport,
      radiusKm,
      center: { lat, lon },
      fetchedAt: Date.now(),
      elements: data.elements,
      osm3s: data.osm3s || null,
      upstream: endpoint,
    }, 200, { "x-mss-route-catalog-cache": "MISS" });
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error: any) {
    const reason = error?.name === "AbortError" ? "timeout" : String(error?.message || error || "unavailable");
    return json({ ok: false, error: "route_catalog_unavailable", reason }, 503);
  } finally {
    clearTimeout(timer);
  }
};
