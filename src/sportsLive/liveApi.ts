import type { SportId } from "../contexts/SportContext";
import { fetchDartsLiveOverview } from "../dartsLive/liveApi";
import type { SportLiveOverview } from "./types";

const CACHE_PREFIX = "msc_sport_live_cache_v1:";

function emptyOverview(sport: SportId): SportLiveOverview {
  return {
    sport,
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

export async function fetchSportLiveOverview(sport: SportId, signal?: AbortSignal): Promise<SportLiveOverview> {
  if (sport !== "darts") return emptyOverview(sport);

  try {
    const darts = await fetchDartsLiveOverview(signal);
    const overview: SportLiveOverview = {
      ...darts,
      sport,
      automaticData: !!darts.configured,
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
