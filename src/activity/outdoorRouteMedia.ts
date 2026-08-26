import { haversineMeters } from "./activityMath";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
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
  anchor?: "start" | "middle" | "summit" | "finish";
};

const CACHE_KEY = "mss-route-photo-cache-v2";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type CacheRow = { routeKey: string; photos: OutdoorRoutePhoto[]; updatedAt: number };

function loadCache(): CacheRow[] {
  try { const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function saveCache(rows: CacheRow[]) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows.slice(0, 24))); } catch {} }
function stripHtml(value: unknown) { return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }

function routeAnchors(route: RunningRouteTemplate) {
  const points = route.route || [];
  if (!points.length) return [];
  const start = points[0];
  const middle = points[Math.floor(points.length / 2)];
  const finish = points[points.length - 1];
  const altitudePoints = points.filter((point) => Number.isFinite(point.altitude));
  const summit = altitudePoints.length ? altitudePoints.reduce((best, point) => Number(point.altitude) > Number(best.altitude) ? point : best, altitudePoints[0]) : null;
  const rows: Array<{ kind: "start" | "middle" | "summit" | "finish"; point: typeof start }> = [{ kind: "start", point: start }];
  if (middle && haversineMeters(start, middle) > 1000) rows.push({ kind: "middle", point: middle });
  if (summit && rows.every((row) => haversineMeters(row.point, summit) > 700)) rows.push({ kind: "summit", point: summit });
  if (finish && haversineMeters(start, finish) > 1500 && rows.every((row) => haversineMeters(row.point, finish) > 700)) rows.push({ kind: "finish", point: finish });
  return rows.slice(0, 4);
}

function distanceToRoute(route: RunningRouteTemplate, lat: number, lon: number) {
  const points = route.route || [];
  if (!points.length) return null;
  const target = { lat, lon, timestamp: 0 };
  const step = Math.max(1, Math.floor(points.length / 100));
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += step) best = Math.min(best, haversineMeters(target, points[index]));
  const last = points[points.length - 1];
  if (last) best = Math.min(best, haversineMeters(target, last));
  return Number.isFinite(best) ? best : null;
}

async function fetchAnchorPhotos(route: RunningRouteTemplate, anchor: ReturnType<typeof routeAnchors>[number], limit: number): Promise<OutdoorRoutePhoto[]> {
  const params = new URLSearchParams({
    action: "query", format: "json", origin: "*", generator: "geosearch", ggsprimary: "all", ggsnamespace: "6",
    ggsradius: "6000", ggslimit: String(Math.max(limit, 8)), ggscoord: `${anchor.point.lat}|${anchor.point.lon}`,
    prop: "imageinfo|info|coordinates", iiprop: "url|extmetadata", iiurlwidth: "1100", inprop: "url",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  const json = await response.json();
  const pages = Object.values(json?.query?.pages || {}) as any[];
  return pages.map((page) => {
    const info = page?.imageinfo?.[0] || {};
    const meta = info?.extmetadata || {};
    const thumbUrl = String(info.thumburl || info.url || "");
    const imageUrl = String(info.url || thumbUrl || "");
    if (!thumbUrl || !imageUrl) return null;
    const coord = page?.coordinates?.[0] || {};
    const lat = Number(coord.lat);
    const lon = Number(coord.lon);
    return {
      id: String(page.pageid || page.title || imageUrl),
      title: String(page.title || "").replace(/^File:/, ""),
      thumbUrl,
      imageUrl,
      pageUrl: String(page.fullurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title || ""))}`),
      author: stripHtml(meta.Artist?.value || meta.Credit?.value),
      license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value),
      description: stripHtml(meta.ImageDescription?.value),
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      distanceToRouteM: Number.isFinite(lat) && Number.isFinite(lon) ? distanceToRoute(route, lat, lon) : null,
      anchor: anchor.kind,
    } satisfies OutdoorRoutePhoto;
  }).filter(Boolean) as OutdoorRoutePhoto[];
}

function photoScore(photo: OutdoorRoutePhoto) {
  const distance = photo.distanceToRouteM == null ? 3000 : Math.min(8000, photo.distanceToRouteM);
  const anchorBonus = photo.anchor === "summit" ? -550 : photo.anchor === "start" ? -250 : 0;
  const descriptionBonus = photo.description ? -180 : 0;
  return distance + anchorBonus + descriptionBonus;
}

export async function fetchOutdoorRoutePhotos(route: RunningRouteTemplate, limit = 10): Promise<OutdoorRoutePhoto[]> {
  const routeKey = outdoorRouteKey(route);
  const cached = loadCache().find((row) => row.routeKey === routeKey && Date.now() - row.updatedAt < MAX_AGE_MS);
  if (cached?.photos?.length) return cached.photos.slice(0, limit);
  const anchors = routeAnchors(route);
  if (!anchors.length) return [];
  const settled = await Promise.allSettled(anchors.map((anchor) => fetchAnchorPhotos(route, anchor, Math.max(7, Math.ceil(limit / anchors.length) + 4))));
  const unique = new Map<string, OutdoorRoutePhoto>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const photo of result.value) {
      const existing = unique.get(photo.id);
      if (!existing || photoScore(photo) < photoScore(existing)) unique.set(photo.id, photo);
    }
  }
  const photos = Array.from(unique.values()).sort((a, b) => photoScore(a) - photoScore(b)).slice(0, limit);
  const current = loadCache().filter((row) => row.routeKey !== routeKey);
  saveCache([{ routeKey, photos, updatedAt: Date.now() }, ...current]);
  return photos;
}
