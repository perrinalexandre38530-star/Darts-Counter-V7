import { haversineMeters } from "./activityMath";
import { loadRunningArrayCache, saveRunningLocalJson } from "./runningShared";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRoutePlaceCategory = "viewpoint" | "peak" | "water" | "shelter" | "parking" | "toilets" | "food" | "cafe" | "information" | "attraction";

export type OutdoorRoutePlace = {
  id: string;
  name: string;
  category: OutdoorRoutePlaceCategory;
  lat: number;
  lon: number;
  distanceToRouteM: number;
  distanceFromStartM: number;
  elevationM?: number | null;
  website?: string | null;
  wikipedia?: string | null;
  tags?: Record<string, string>;
};

export type OutdoorRoutePlaceContext = {
  routeKey: string;
  locality: string;
  municipality?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  displayName?: string;
  places: OutdoorRoutePlace[];
  updatedAt: number;
};

type CacheRow = OutdoorRoutePlaceContext;

const CACHE_KEY = "mss-route-place-context-v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function routeCenter(route: RunningRouteTemplate) {
  const points = route.route || [];
  return points[Math.floor(points.length / 2)] || points[0] || null;
}

function nearestRouteDistanceM(route: RunningRouteTemplate, lat: number, lon: number) {
  const points = route.route || [];
  if (!points.length) return Number.POSITIVE_INFINITY;
  const target = { lat, lon, timestamp: 0 };
  const step = Math.max(1, Math.floor(points.length / 80));
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += step) {
    const distance = haversineMeters(target, points[index]);
    if (distance < best) best = distance;
  }
  const last = points[points.length - 1];
  if (last) best = Math.min(best, haversineMeters(target, last));
  return best;
}

function categoryFromTags(tags: Record<string, string>): OutdoorRoutePlaceCategory | null {
  const tourism = String(tags.tourism || "");
  const natural = String(tags.natural || "");
  const amenity = String(tags.amenity || "");
  if (tourism === "viewpoint") return "viewpoint";
  if (natural === "peak") return "peak";
  if (amenity === "drinking_water" || tags.drinking_water === "yes") return "water";
  if (tourism === "alpine_hut" || tourism === "wilderness_hut" || amenity === "shelter") return "shelter";
  if (amenity === "parking") return "parking";
  if (amenity === "toilets") return "toilets";
  if (amenity === "restaurant" || amenity === "fast_food") return "food";
  if (amenity === "cafe") return "cafe";
  if (tourism === "information") return "information";
  if (tourism === "attraction") return "attraction";
  return null;
}

function genericName(category: OutdoorRoutePlaceCategory, lang: string) {
  const fr: Record<OutdoorRoutePlaceCategory, string> = { viewpoint: "Point de vue", peak: "Sommet", water: "Point d'eau", shelter: "Refuge", parking: "Parking", toilets: "Toilettes", food: "Restauration", cafe: "Café", information: "Information", attraction: "Point d'intérêt" };
  const en: Record<OutdoorRoutePlaceCategory, string> = { viewpoint: "Viewpoint", peak: "Peak", water: "Drinking water", shelter: "Shelter", parking: "Parking", toilets: "Toilets", food: "Food", cafe: "Café", information: "Information", attraction: "Point of interest" };
  const es: Record<OutdoorRoutePlaceCategory, string> = { viewpoint: "Mirador", peak: "Cima", water: "Agua potable", shelter: "Refugio", parking: "Aparcamiento", toilets: "Baños", food: "Restauración", cafe: "Café", information: "Información", attraction: "Punto de interés" };
  return lang.startsWith("fr") ? fr[category] : lang.startsWith("es") ? es[category] : en[category];
}

async function reverseGeocode(lat: number, lon: number, lang: string) {
  const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lon), zoom: "13", addressdetails: "1", "accept-language": lang || "fr" });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const json = await response.json();
  const address = json?.address || {};
  const municipality = String(address.city || address.town || address.village || address.municipality || address.hamlet || "").trim();
  const locality = String(address.neighbourhood || address.suburb || address.locality || municipality || address.county || "").trim();
  return {
    locality: locality || municipality || String(json?.name || "").trim(),
    municipality: municipality || undefined,
    region: String(address.state || address.region || address.county || "").trim() || undefined,
    country: String(address.country || "").trim() || undefined,
    countryCode: String(address.country_code || "").trim().toUpperCase() || undefined,
    displayName: String(json?.display_name || "").trim() || undefined,
  };
}

function buildOverpassQuery(lat: number, lon: number, radiusM: number) {
  const around = `(around:${Math.round(radiusM)},${lat.toFixed(6)},${lon.toFixed(6)})`;
  return `[out:json][timeout:18];(\nnode${around}[tourism=viewpoint];\nnode${around}[natural=peak];\nnode${around}[amenity=drinking_water];\nnode${around}[drinking_water=yes];\nnode${around}[tourism=alpine_hut];\nnode${around}[tourism=wilderness_hut];\nnode${around}[amenity=shelter];\nnode${around}[amenity=parking];\nnode${around}[amenity=toilets];\nnode${around}[amenity=restaurant];\nnode${around}[amenity=fast_food];\nnode${around}[amenity=cafe];\nnode${around}[tourism=information];\nnode${around}[tourism=attraction];\n);out tags center;`;
}

async function fetchNearbyPlaces(route: RunningRouteTemplate, lang: string): Promise<OutdoorRoutePlace[]> {
  const center = routeCenter(route);
  if (!center) return [];
  const radiusM = Math.max(1800, Math.min(7500, Number(route.distanceM || 0) * 0.45));
  const query = buildOverpassQuery(center.lat, center.lon, radiusM);
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: `data=${encodeURIComponent(query)}` });
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
      const json = await response.json();
      const start = route.route?.[0] || center;
      const rows = (Array.isArray(json?.elements) ? json.elements : []).map((item: any): OutdoorRoutePlace | null => {
        const tags = item?.tags && typeof item.tags === "object" ? item.tags as Record<string, string> : {};
        const category = categoryFromTags(tags);
        const lat = Number(item?.lat ?? item?.center?.lat);
        const lon = Number(item?.lon ?? item?.center?.lon);
        if (!category || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const name = String(tags.name || tags["name:fr"] || tags["name:en"] || tags.ref || genericName(category, lang)).trim();
        return {
          id: `osm:${item.type || "node"}:${item.id}`,
          name,
          category,
          lat,
          lon,
          distanceToRouteM: nearestRouteDistanceM(route, lat, lon),
          distanceFromStartM: haversineMeters(start, { lat, lon, timestamp: 0 }),
          elevationM: Number.isFinite(Number(tags.ele)) ? Number(tags.ele) : null,
          website: tags.website || tags.url || null,
          wikipedia: tags.wikipedia || null,
          tags,
        };
      }).filter(Boolean) as OutdoorRoutePlace[];
      const unique = new Map<string, OutdoorRoutePlace>();
      for (const row of rows.sort((a, b) => a.distanceToRouteM - b.distanceToRouteM || a.distanceFromStartM - b.distanceFromStartM)) {
        const key = `${row.category}:${row.name.toLowerCase()}`;
        if (!unique.has(key)) unique.set(key, row);
      }
      const categoryCount = new Map<OutdoorRoutePlaceCategory, number>();
      return Array.from(unique.values()).filter((row) => {
        if (row.distanceToRouteM > 1600) return false;
        const count = categoryCount.get(row.category) || 0;
        if (count >= 3) return false;
        categoryCount.set(row.category, count + 1);
        return true;
      }).slice(0, 18);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

export async function fetchOutdoorRoutePlaceContext(route: RunningRouteTemplate, lang = "fr"): Promise<OutdoorRoutePlaceContext> {
  const routeKey = outdoorRouteKey(route);
  const cached = loadRunningArrayCache<CacheRow>(CACHE_KEY).find((row) => row.routeKey === routeKey && Date.now() - Number(row.updatedAt || 0) < MAX_AGE_MS);
  if (cached) return cached;
  const center = routeCenter(route);
  if (!center) return { routeKey, locality: "", places: [], updatedAt: Date.now() };

  const [geoResult, placesResult] = await Promise.allSettled([
    reverseGeocode(center.lat, center.lon, lang),
    fetchNearbyPlaces(route, lang),
  ]);
  const geo = geoResult.status === "fulfilled" ? geoResult.value : { locality: "" };
  const places = placesResult.status === "fulfilled" ? placesResult.value : [];
  const context: OutdoorRoutePlaceContext = { routeKey, ...geo, places, updatedAt: Date.now() };
  const rest = loadRunningArrayCache<CacheRow>(CACHE_KEY).filter((row) => row.routeKey !== routeKey);
  saveRunningLocalJson(CACHE_KEY, [context, ...rest].slice(0, 30));
  return context;
}

export function outdoorRoutePlaceIcon(category: OutdoorRoutePlaceCategory) {
  if (category === "viewpoint") return "👁️";
  if (category === "peak") return "⛰️";
  if (category === "water") return "💧";
  if (category === "shelter") return "🏕️";
  if (category === "parking") return "🅿️";
  if (category === "toilets") return "🚻";
  if (category === "food") return "🍽️";
  if (category === "cafe") return "☕";
  if (category === "information") return "ℹ️";
  return "📍";
}
