import type { SportId } from "../contexts/SportContext";
import type { SportLiveOverview, SportLiveSportId } from "./types";

const CACHE_PREFIX = "msc_sport_live_cache_v3:";

function isSupportedSport(value: SportId): value is SportLiveSportId {
  return ["darts", "petanque", "pingpong", "babyfoot", "molkky", "padel", "badminton", "cornhole", "palet", "bowling"].includes(String(value));
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

function readCache(sport: SportId): SportLiveOverview | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${sport}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || parsed?.sport !== sport) return null;
    return parsed.data as SportLiveOverview;
  } catch {
    return null;
  }
}

function writeCache(sport: SportId, data: SportLiveOverview) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${sport}`, JSON.stringify({ sport, savedAt: Date.now(), data }));
  } catch {}
}

export function getCachedSportLiveOverview(sport: SportId): SportLiveOverview | null {
  return readCache(sport);
}

export async function fetchSportLiveOverview(sport: SportId, signal?: AbortSignal, lang?: string): Promise<SportLiveOverview> {
  if (!isSupportedSport(sport)) return emptyOverview(sport);

  try {
    const locale = String(lang || document.documentElement.lang || "fr").toLowerCase();
    const response = await fetch(`/api/sports-live/${encodeURIComponent(sport)}/overview?lang=${encodeURIComponent(locale)}&v=4`, {
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
    writeCache(sport, overview);
    return overview;
  } catch (error) {
    const cached = readCache(sport);
    if (cached) {
      return {
        ...cached,
        warnings: [...(cached.warnings || []), "Mode hors ligne : dernière donnée LIVE mise en cache."],
      };
    }
    throw error;
  }
}
