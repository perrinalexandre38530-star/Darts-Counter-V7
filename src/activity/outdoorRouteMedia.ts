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
};

const CACHE_KEY = "mss-route-photo-cache-v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type CacheRow = { routeKey: string; photos: OutdoorRoutePhoto[]; updatedAt: number };

function loadCache(): CacheRow[] {
  try { const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function saveCache(rows: CacheRow[]) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows.slice(0, 20))); } catch {} }
function stripHtml(value: unknown) { return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }

export async function fetchOutdoorRoutePhotos(route: RunningRouteTemplate, limit = 8): Promise<OutdoorRoutePhoto[]> {
  const routeKey = outdoorRouteKey(route);
  const cached = loadCache().find((row) => row.routeKey === routeKey && Date.now() - row.updatedAt < MAX_AGE_MS);
  if (cached?.photos?.length) return cached.photos.slice(0, limit);
  const points = route.route || [];
  const center = points[Math.floor(points.length / 2)] || points[0];
  if (!center) return [];
  const params = new URLSearchParams({
    action: "query", format: "json", origin: "*", generator: "geosearch", ggsprimary: "all", ggsnamespace: "6",
    ggsradius: "10000", ggslimit: String(Math.max(limit * 2, 12)), ggscoord: `${center.lat}|${center.lon}`,
    prop: "imageinfo|info", iiprop: "url|extmetadata", iiurlwidth: "900", inprop: "url",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  const json = await response.json();
  const pages = Object.values(json?.query?.pages || {}) as any[];
  const photos: OutdoorRoutePhoto[] = pages.map((page) => {
    const info = page?.imageinfo?.[0] || {};
    const meta = info?.extmetadata || {};
    const thumbUrl = String(info.thumburl || info.url || "");
    const imageUrl = String(info.url || thumbUrl || "");
    if (!thumbUrl || !imageUrl) return null;
    return {
      id: String(page.pageid || page.title || imageUrl),
      title: String(page.title || "").replace(/^File:/, ""),
      thumbUrl,
      imageUrl,
      pageUrl: String(page.fullurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title || ""))}`),
      author: stripHtml(meta.Artist?.value || meta.Credit?.value),
      license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value),
      description: stripHtml(meta.ImageDescription?.value),
    } satisfies OutdoorRoutePhoto;
  }).filter(Boolean).slice(0, limit) as OutdoorRoutePhoto[];
  const current = loadCache().filter((row) => row.routeKey !== routeKey);
  saveCache([{ routeKey, photos, updatedAt: Date.now() }, ...current]);
  return photos;
}
