import type { SportId } from "../contexts/SportContext";
import type { SportLiveOverview, SportLiveSportId } from "./types";

const CACHE_PREFIX = "msc_sport_live_cache_v10:";
const LEGACY_CACHE_PREFIX = "msc_sport_live_cache_v8:";

function isSupportedSport(value: SportId): value is SportLiveSportId {
  return ["darts", "petanque", "pingpong", "babyfoot", "molkky", "foot", "padel", "badminton", "cornhole", "palet", "bowling"].includes(String(value));
}

function emptyOverview(sport: SportId): SportLiveOverview {
  return {
    sport: (isSupportedSport(sport) ? sport : "darts") as SportLiveSportId,
    automaticData: false,
    configured: false,
    provider: "official_links",
    plan: null,
    dataAsOf: null,
    liveAvailable: false,
    liveReason: "Les scores automatiques ne sont pas encore connectés pour ce sport. Les sources officielles restent disponibles.",
    live: [],
    fixtures: [],
    results: [],
    events: [],
    news: [],
    intelligence: null,
    warnings: [],
  };
}

function localeCode(lang?: string) {
  return String(lang || document.documentElement.lang || "fr").toLowerCase().split(/[-_]/)[0] || "fr";
}

function cacheKey(sport: SportId, lang?: string) {
  return `${CACHE_PREFIX}${sport}:${localeCode(lang)}`;
}

function readCache(sport: SportId, lang?: string): SportLiveOverview | null {
  try {
    const raw = localStorage.getItem(cacheKey(sport, lang)) || localStorage.getItem(`${LEGACY_CACHE_PREFIX}${sport}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || parsed?.sport !== sport) return null;
    return parsed.data as SportLiveOverview;
  } catch {
    return null;
  }
}

function writeCache(sport: SportId, lang: string | undefined, data: SportLiveOverview) {
  try {
    localStorage.setItem(cacheKey(sport, lang), JSON.stringify({ sport, lang: localeCode(lang), savedAt: Date.now(), data }));
  } catch {}
}

export function getCachedSportLiveOverview(sport: SportId, lang?: string): SportLiveOverview | null {
  return readCache(sport, lang);
}

export type SportLiveFetchPhase = "fast" | "full";

export async function fetchSportLiveOverview(sport: SportId, signal?: AbortSignal, lang?: string, phase: SportLiveFetchPhase = "full"): Promise<SportLiveOverview> {
  if (!isSupportedSport(sport)) return emptyOverview(sport);

  try {
    const locale = localeCode(lang);
    const response = await fetch(`/api/sports-live/${encodeURIComponent(sport)}/overview?lang=${encodeURIComponent(locale)}&phase=${encodeURIComponent(phase)}&v=10`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
    const body = await response.json().catch(() => null) as any;
    if (!response.ok) {
      throw new Error(String(body?.message || body?.error || `LIVE SPORTS HTTP ${response.status}`));
    }
    const overview: SportLiveOverview = {
      ...emptyOverview(sport),
      ...(body || {}),
      sport,
      automaticData: !!body?.automaticData,
      configured: !!body?.configured,
      live: Array.isArray(body?.live) ? body.live : [],
      fixtures: Array.isArray(body?.fixtures) ? body.fixtures : [],
      results: Array.isArray(body?.results) ? body.results : [],
      events: Array.isArray(body?.events) ? body.events : [],
      news: Array.isArray(body?.news) ? body.news : [],
      intelligence: body?.intelligence && typeof body.intelligence === "object" ? body.intelligence : null,
      warnings: Array.isArray(body?.warnings) ? body.warnings : [],
    };
    writeCache(sport, lang, overview);
    return overview;
  } catch (error) {
    const cached = readCache(sport, lang);
    if (cached) {
      return {
        ...cached,
        warnings: [...(cached.warnings || []), "Mode hors ligne : dernière donnée LIVE mise en cache."],
      };
    }
    throw error;
  }
}
