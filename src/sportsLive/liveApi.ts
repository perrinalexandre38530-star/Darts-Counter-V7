import type { SportId } from "../contexts/SportContext";
import type { SportLiveOverview, SportLiveSportId } from "./types";

const CACHE_PREFIX = "msc_sport_live_cache_v11:";
const LEGACY_CACHE_PREFIXES = ["msc_sport_live_cache_v10:", "msc_sport_live_cache_v8:"];
const CACHE_RESULT_LIMIT = 240;
const CACHE_FIXTURE_LIMIT = 120;
const CACHE_EVENT_LIMIT = 180;
const CACHE_NEWS_LIMIT = 220;

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

function legacyCacheKeys(sport: SportId, lang?: string) {
  const locale = localeCode(lang);
  return LEGACY_CACHE_PREFIXES.flatMap((prefix) => [
    `${prefix}${sport}:${locale}`,
    `${prefix}${sport}`,
  ]);
}

type CachedEnvelope = {
  sport: SportId;
  lang?: string;
  savedAt?: number;
  data: SportLiveOverview;
};

function readEnvelope(raw: string | null, sport: SportId): CachedEnvelope | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.data || parsed?.sport !== sport) return null;
    return parsed as CachedEnvelope;
  } catch {
    return null;
  }
}

function readCacheEnvelope(sport: SportId, lang?: string): CachedEnvelope | null {
  try {
    const current = readEnvelope(localStorage.getItem(cacheKey(sport, lang)), sport);
    if (current) return current;
    for (const key of legacyCacheKeys(sport, lang)) {
      const legacy = readEnvelope(localStorage.getItem(key), sport);
      if (legacy) return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizedKey(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 180);
}

function rowKey(row: any, fallback: string) {
  const competition = normalizedKey(row?.competition || row?.sourceName || "");
  const title = normalizedKey(row?.title || "");
  const winner = normalizedKey(row?.winner?.name || "");
  const loser = normalizedKey(row?.loser?.name || "");
  const players = Array.isArray(row?.players) ? row.players.map((p: any) => normalizedKey(p?.name)).join("|") : "";
  const date = String(row?.playedOn || row?.startsAt || row?.date || row?.dateLabel || row?.publishedAt || "").slice(0, 16);

  // Semantic keys prevent the same story/result from being duplicated when it
  // arrives through CORE and DEEP with a different query index / generated id.
  if (fallback === "news" && title) return `news:${title}`;
  if (fallback === "event" && title) return `event:${title}|${date}|${normalizedKey(row?.status)}`;
  if (fallback === "result" && (winner || loser)) {
    const score = `${row?.winner?.score ?? ""}|${row?.loser?.score ?? ""}`;
    return `result:${competition}|${winner}|${loser}|${score}|${date}`;
  }
  if (fallback === "fixture" && players) return `fixture:${competition}|${players}|${date}`;

  const id = String(row?.id || "").trim();
  if (id) return `id:${id}`;
  return `${fallback}:${competition}|${title}|${winner}|${loser}|${players}|${date}`;
}

function mergeRows<T>(fresh: T[] | undefined, previous: T[] | undefined, limit: number, kind: string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const row of [...(fresh || []), ...(previous || [])]) {
    const key = rowKey(row, kind);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

function uniqWarnings(next: string[] | undefined, previous: string[] | undefined) {
  return Array.from(new Set([...(next || []), ...(previous || [])].filter(Boolean))).slice(0, 24);
}

/**
 * Merge progressive LIVE SPORTS payloads without erasing useful cached content.
 * Fresh rows always win. Results/news are intentionally retained across refreshes
 * to provide a deeper daily-sports history even when a provider only returns its
 * latest page. LIVE rows remain authoritative and are never accumulated.
 */
export function mergeSportLiveOverview(previous: SportLiveOverview | null | undefined, incoming: SportLiveOverview, phase: "fast" | "full" | "deep" = "full"): SportLiveOverview {
  if (!previous || previous.sport !== incoming.sport) return incoming;
  return {
    ...previous,
    ...incoming,
    configured: !!incoming.configured || !!previous.configured,
    automaticData: !!incoming.automaticData || !!previous.automaticData,
    provider: phase === "full" && previous.configured ? previous.provider : (incoming.provider || previous.provider),
    plan: phase === "full" && previous.plan ? previous.plan : (incoming.plan ?? previous.plan ?? null),
    dataAsOf: incoming.dataAsOf || previous.dataAsOf || null,
    liveAvailable: phase === "fast" ? !!incoming.liveAvailable : (!!incoming.liveAvailable || !!previous.liveAvailable),
    liveReason: phase === "fast" ? (incoming.liveReason ?? previous.liveReason ?? null) : (incoming.liveAvailable ? incoming.liveReason : previous.liveReason ?? incoming.liveReason ?? null),
    live: phase === "fast" ? (Array.isArray(incoming.live) ? incoming.live : []) : ((incoming.live || []).length ? incoming.live : previous.live),
    fixtures: mergeRows(incoming.fixtures, previous.fixtures, CACHE_FIXTURE_LIMIT, "fixture"),
    results: mergeRows(incoming.results, previous.results, CACHE_RESULT_LIMIT, "result"),
    events: mergeRows(incoming.events, previous.events, CACHE_EVENT_LIMIT, "event"),
    news: mergeRows(incoming.news, previous.news, CACHE_NEWS_LIMIT, "news"),
    intelligence: incoming.intelligence ?? previous.intelligence ?? null,
    warnings: uniqWarnings(incoming.warnings, previous.warnings),
  };
}

function cacheSafeOverview(data: SportLiveOverview): SportLiveOverview {
  const stripRaw = <T,>(rows: T[] | undefined): T[] => (rows || []).map((row: any) => {
    if (!row || typeof row !== "object" || !("raw" in row)) return row;
    const { raw: _raw, ...rest } = row;
    return rest as T;
  });
  return {
    ...data,
    live: stripRaw(data.live),
    fixtures: stripRaw(data.fixtures),
    results: stripRaw(data.results),
  };
}

function writeCache(sport: SportId, lang: string | undefined, incoming: SportLiveOverview, phase: "fast" | "full" | "deep") {
  const previous = readCacheEnvelope(sport, lang)?.data || null;
  const data = mergeSportLiveOverview(previous, incoming, phase);
  try {
    localStorage.setItem(cacheKey(sport, lang), JSON.stringify({ sport, lang: localeCode(lang), savedAt: Date.now(), data: cacheSafeOverview(data) }));
  } catch {}
  return data;
}

export function getCachedSportLiveOverview(sport: SportId, lang?: string): SportLiveOverview | null {
  return readCacheEnvelope(sport, lang)?.data || null;
}

export function getCachedSportLiveOverviewSavedAt(sport: SportId, lang?: string): number | null {
  const value = Number(readCacheEnvelope(sport, lang)?.savedAt || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export type SportLiveFetchPhase = "fast" | "full" | "deep";

export async function fetchSportLiveOverview(sport: SportId, signal?: AbortSignal, lang?: string, phase: SportLiveFetchPhase = "full"): Promise<SportLiveOverview> {
  if (!isSupportedSport(sport)) return emptyOverview(sport);

  try {
    const locale = localeCode(lang);
    const response = await fetch(`/api/sports-live/${encodeURIComponent(sport)}/overview?lang=${encodeURIComponent(locale)}&phase=${encodeURIComponent(phase)}&v=11`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "default",
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
    return writeCache(sport, lang, overview, phase);
  } catch (error) {
    const cached = getCachedSportLiveOverview(sport, lang);
    if (cached) {
      return {
        ...cached,
        warnings: uniqWarnings(["Mode hors ligne : dernière donnée LIVE mise en cache."], cached.warnings),
      };
    }
    throw error;
  }
}
