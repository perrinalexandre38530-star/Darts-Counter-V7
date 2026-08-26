import { haversineMeters } from "./activityMath";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import { fetchOutdoorRoutePlaceContext, type OutdoorRoutePlace } from "./outdoorRoutePlaces";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRoutePhoto = {
  id: string;
  title: string;
  thumbUrl: string;
  imageUrl: string;
  pageUrl: string;
  author?: string;
  license?: string;
  description?: string;
  lat?: number | null;
  lon?: number | null;
  distanceToRouteM?: number | null;
  anchor?: "start" | "quarter" | "middle" | "three-quarter" | "summit" | "finish" | "place";
  source?: "wikimedia" | "wikipedia";
  placeName?: string;
};

const CACHE_KEY = "mss-route-photo-cache-v3";
const MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

type CacheRow = { routeKey: string; photos: OutdoorRoutePhoto[]; updatedAt: number };

function loadCache(): CacheRow[] {
  try { const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function saveCache(rows: CacheRow[]) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows.slice(0, 24))); } catch {} }
function stripHtml(value: unknown) { return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function normalizeTitle(value: string) { return value.toLowerCase().replace(/^file:/, "").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[^a-z0-9à-ÿ]+/gi, " ").trim(); }

function routeAnchors(route: RunningRouteTemplate) {
  const points = route.route || [];
  if (!points.length) return [];
  const pointAt = (ratio: number) => points[Math.min(points.length - 1, Math.max(0, Math.round((points.length - 1) * ratio)))];
  const start = points[0];
  const quarter = pointAt(.25);
  const middle = pointAt(.5);
  const threeQuarter = pointAt(.75);
  const finish = points[points.length - 1];
  const altitudePoints = points.filter((point) => Number.isFinite(point.altitude));
  const summit = altitudePoints.length ? altitudePoints.reduce((best, point) => Number(point.altitude) > Number(best.altitude) ? point : best, altitudePoints[0]) : null;
  const rows: Array<{ kind: OutdoorRoutePhoto["anchor"]; point: typeof start }> = [{ kind: "start", point: start }];
  const pushIfFar = (kind: OutdoorRoutePhoto["anchor"], point: typeof start | null | undefined, minDistanceM = 650) => {
    if (!point) return;
    if (rows.every((row) => haversineMeters(row.point, point) > minDistanceM)) rows.push({ kind, point });
  };
  pushIfFar("quarter", quarter);
  pushIfFar("middle", middle);
  pushIfFar("three-quarter", threeQuarter);
  pushIfFar("summit", summit, 450);
  pushIfFar("finish", finish);
  return rows.slice(0, 6);
}

function distanceToRoute(route: RunningRouteTemplate, lat: number, lon: number) {
  const points = route.route || [];
  if (!points.length) return null;
  const target = { lat, lon, timestamp: 0 };
  const step = Math.max(1, Math.floor(points.length / 140));
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += step) best = Math.min(best, haversineMeters(target, points[index]));
  const last = points[points.length - 1];
  if (last) best = Math.min(best, haversineMeters(target, last));
  return Number.isFinite(best) ? best : null;
}

function isDecorativeOrIrrelevant(title: string, description = "") {
  const haystack = `${title} ${description}`.toLowerCase();
  return /(coat of arms|blason|wappen|flag of|drapeau|logo|icon|map of|carte de|diagram|schema|schéma|portrait|signature|seal of|locator map|route map|trail map|plan de|panneau seul|sign only)/i.test(haystack);
}

async function fetchCommonsGeoPhotos(route: RunningRouteTemplate, anchor: ReturnType<typeof routeAnchors>[number], limit: number): Promise<OutdoorRoutePhoto[]> {
  const params = new URLSearchParams({
    action: "query", format: "json", origin: "*", generator: "geosearch", ggsprimary: "all", ggsnamespace: "6",
    ggsradius: "8500", ggslimit: String(Math.max(limit, 12)), ggscoord: `${anchor.point.lat}|${anchor.point.lon}`,
    prop: "imageinfo|info|coordinates", iiprop: "url|mime|mediatype|extmetadata", iiurlwidth: "1400", inprop: "url",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  const json = await response.json();
  const pages = Object.values(json?.query?.pages || {}) as any[];
  return pages.map((page) => commonsPageToPhoto(route, page, anchor.kind)).filter(Boolean) as OutdoorRoutePhoto[];
}

function commonsPageToPhoto(route: RunningRouteTemplate, page: any, anchor: OutdoorRoutePhoto["anchor"], placeName?: string): OutdoorRoutePhoto | null {
  const info = page?.imageinfo?.[0] || {};
  const meta = info?.extmetadata || {};
  const mime = String(info?.mime || "").toLowerCase();
  if (mime && !["image/jpeg", "image/png", "image/webp"].includes(mime)) return null;
  const thumbUrl = String(info.thumburl || info.url || "");
  const imageUrl = String(info.url || thumbUrl || "");
  if (!thumbUrl || !imageUrl) return null;
  const coord = page?.coordinates?.[0] || {};
  const lat = Number(coord.lat);
  const lon = Number(coord.lon);
  const title = String(page.title || "").replace(/^File:/, "");
  const description = stripHtml(meta.ImageDescription?.value || meta.ObjectName?.value);
  if (isDecorativeOrIrrelevant(title, description)) return null;
  return {
    id: `commons:${String(page.pageid || page.title || imageUrl)}`,
    title,
    thumbUrl,
    imageUrl,
    pageUrl: String(page.fullurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title || ""))}`),
    author: stripHtml(meta.Artist?.value || meta.Credit?.value),
    license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value),
    description,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    distanceToRouteM: Number.isFinite(lat) && Number.isFinite(lon) ? distanceToRoute(route, lat, lon) : null,
    anchor,
    source: "wikimedia",
    placeName,
  };
}

async function fetchWikipediaNearby(route: RunningRouteTemplate, anchor: ReturnType<typeof routeAnchors>[number], lang: string, limit = 10): Promise<OutdoorRoutePhoto[]> {
  const wikiLang = lang.startsWith("fr") ? "fr" : lang.startsWith("es") ? "es" : "en";
  const params = new URLSearchParams({
    action: "query", format: "json", origin: "*", generator: "geosearch", ggsnamespace: "0", ggsradius: "10000", ggslimit: String(Math.max(8, limit)), ggscoord: `${anchor.point.lat}|${anchor.point.lon}`,
    prop: "pageimages|coordinates|extracts|info", piprop: "thumbnail|original|name", pithumbsize: "1400", exintro: "1", explaintext: "1", exsentences: "2", inprop: "url",
  });
  const response = await fetch(`https://${wikiLang}.wikipedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
  const json = await response.json();
  const pages = Object.values(json?.query?.pages || {}) as any[];
  return pages.map((page): OutdoorRoutePhoto | null => {
    const thumbUrl = String(page?.thumbnail?.source || page?.original?.source || "");
    const imageUrl = String(page?.original?.source || thumbUrl || "");
    if (!thumbUrl || !imageUrl) return null;
    const title = String(page?.title || "").trim();
    const description = stripHtml(page?.extract || "");
    if (!title || isDecorativeOrIrrelevant(title, description)) return null;
    const coord = page?.coordinates?.[0] || {};
    const lat = Number(coord.lat);
    const lon = Number(coord.lon);
    return {
      id: `wikipedia:${wikiLang}:${String(page.pageid || title)}`,
      title,
      thumbUrl,
      imageUrl,
      pageUrl: String(page.fullurl || `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`),
      description,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      distanceToRouteM: Number.isFinite(lat) && Number.isFinite(lon) ? distanceToRoute(route, lat, lon) : null,
      anchor: anchor.kind,
      source: "wikipedia",
      placeName: title,
    };
  }).filter(Boolean) as OutdoorRoutePhoto[];
}

async function fetchCommonsNamedPlace(route: RunningRouteTemplate, place: OutdoorRoutePlace, limit = 6): Promise<OutdoorRoutePhoto[]> {
  if (!place.name || place.name.length < 3) return [];
  const params = new URLSearchParams({
    action: "query", format: "json", origin: "*", generator: "search", gsrnamespace: "6", gsrlimit: String(limit),
    gsrsearch: `${place.name} filetype:bitmap`, prop: "imageinfo|info|coordinates", iiprop: "url|mime|mediatype|extmetadata", iiurlwidth: "1400", inprop: "url",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error(`Wikimedia named HTTP ${response.status}`);
  const json = await response.json();
  const pages = Object.values(json?.query?.pages || {}) as any[];
  return pages.map((page) => commonsPageToPhoto(route, page, "place", place.name)).filter(Boolean) as OutdoorRoutePhoto[];
}

function photoScore(photo: OutdoorRoutePhoto) {
  const distance = photo.distanceToRouteM == null ? 3800 : Math.min(10000, photo.distanceToRouteM);
  const anchorBonus = photo.anchor === "summit" ? -700 : photo.anchor === "start" ? -280 : photo.anchor === "place" ? -420 : 0;
  const sourceBonus = photo.source === "wikipedia" ? -650 : 0;
  const placeBonus = photo.placeName ? -260 : 0;
  const descriptionBonus = photo.description && photo.description.length > 35 ? -220 : 0;
  const scenicText = `${photo.title} ${photo.description || ""}`.toLowerCase();
  const scenicBonus = /(mountain|montagne|sommet|peak|view|vue|panorama|forest|forêt|lake|lac|river|rivière|valley|vallée|trail|sentier|landscape|paysage|church|église|castle|château|village|coast|côte|waterfall|cascade)/i.test(scenicText) ? -360 : 0;
  return distance + anchorBonus + sourceBonus + placeBonus + descriptionBonus + scenicBonus;
}

function dedupePhotos(photos: OutdoorRoutePhoto[]) {
  const output: OutdoorRoutePhoto[] = [];
  const ids = new Set<string>();
  const titles = new Set<string>();
  for (const photo of [...photos].sort((a, b) => photoScore(a) - photoScore(b))) {
    const titleKey = normalizeTitle(photo.title || photo.placeName || "");
    const urlKey = photo.thumbUrl.split("?")[0];
    if (ids.has(photo.id) || (titleKey && titles.has(titleKey)) || output.some((row) => row.thumbUrl.split("?")[0] === urlKey)) continue;
    ids.add(photo.id);
    if (titleKey) titles.add(titleKey);
    output.push(photo);
  }
  return output;
}

export async function fetchOutdoorRoutePhotos(route: RunningRouteTemplate, limit = 14, lang = "fr"): Promise<OutdoorRoutePhoto[]> {
  const routeKey = outdoorRouteKey(route);
  const cached = loadCache().find((row) => row.routeKey === routeKey && Date.now() - row.updatedAt < MAX_AGE_MS);
  if (cached?.photos?.length) return cached.photos.slice(0, limit);
  const anchors = routeAnchors(route);
  if (!anchors.length) return [];

  const contextPromise = fetchOutdoorRoutePlaceContext(route, lang).catch(() => null);
  const geoSettled = await Promise.allSettled(anchors.flatMap((anchor) => [
    fetchWikipediaNearby(route, anchor, lang, 9),
    fetchCommonsGeoPhotos(route, anchor, Math.max(8, Math.ceil(limit / anchors.length) + 5)),
  ]));
  const context = await contextPromise;
  const scenicPlaces = (context?.places || []).filter((place) => ["viewpoint", "peak", "attraction", "shelter", "information"].includes(place.category) && place.distanceToRouteM < 1200).slice(0, 5);
  const placeSettled = await Promise.allSettled(scenicPlaces.map((place) => fetchCommonsNamedPlace(route, place, 6)));

  const pool: OutdoorRoutePhoto[] = [];
  for (const result of [...geoSettled, ...placeSettled]) if (result.status === "fulfilled") pool.push(...result.value);
  const photos = dedupePhotos(pool).filter((photo) => photo.distanceToRouteM == null || photo.distanceToRouteM < 9000).slice(0, limit);
  const current = loadCache().filter((row) => row.routeKey !== routeKey);
  saveCache([{ routeKey, photos, updatedAt: Date.now() }, ...current]);
  return photos;
}
