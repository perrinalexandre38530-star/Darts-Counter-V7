/** The worldwide search endpoint returns verified match rows only, not scraped headlines. */
import type { DartsLiveResult } from "../dartsLive/types";

export type DartsResultsProviderStatus = {
  id: string;
  label: string;
  state: "connected" | "unconfigured" | "restricted" | "unavailable" | "directory";
  count: number;
  detail: string;
};

export type DartsResultsPage = {
  results: DartsLiveResult[];
  archiveMatches: number;
  archivePersistent: boolean;
  returned: number;
  nextArchiveOffset: number | null;
  nextArchiveCursor: string | null;
  archivePartitions: number;
  archiveScanned: number;
  archiveMatchesExact: boolean;
  syncStatus?: {recent?: {period:string;updatedAt:string;completed:boolean;lastError?:string|null}|null; backfill?: {period:string;updatedAt:string;completed:boolean;lastError?:string|null}|null};
  nextProviderCursor: string | null;
  partial: boolean;
  providers: DartsResultsProviderStatus[];
  warnings: string[];
  updatedAt: string;
};

export type DartsResultsFilters = {
  q?: string;
  year?: string;
  competition?: string;
  country?: string;
  level?: string;
  source?: string;
  lang?: string;
  archiveOffset?: number;
  providerCursor?: string;
  archiveCursor?: string;
  skipProviders?: boolean;
  skipLegacy?: boolean;
  skipV2?: boolean;
};

export async function searchDartsResults(filters: DartsResultsFilters, signal?: AbortSignal, sport = "darts"): Promise<DartsResultsPage> {
  const params = new URLSearchParams();
  for (const key of ["q", "year", "competition", "country", "level", "source"] as const) {
    const value = String(filters[key] || "").trim();
    if (value) params.set(key, value);
  }
  if (filters.lang) params.set("lang", filters.lang.slice(0, 8));
  if (filters.archiveOffset) params.set("offset", String(filters.archiveOffset));
  if (filters.providerCursor) params.set("cursor", filters.providerCursor);
  if (filters.archiveCursor) params.set("archiveCursor",filters.archiveCursor);
  if (filters.skipProviders) params.set("skipProviders","1");
  if (filters.skipLegacy) params.set("skipLegacy","1");
  if (filters.skipV2) params.set("skipV2","1");
  const res = await fetch(`/api/sports-live/${encodeURIComponent(sport)}/results-search?${params.toString()}`, {
    method: "GET", headers: { Accept: "application/json" }, signal,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !Array.isArray(body.results)) {
    throw new Error(String(body?.message || body?.error || `Recherche de résultats indisponible (HTTP ${res.status})`));
  }
  return {
    results: body.results,
    archiveMatches: Number(body.archiveMatches) || 0,
    archivePersistent: !!body.archivePersistent,
    returned: Number(body.returned) || body.results.length,
    nextArchiveOffset: Number.isInteger(body.nextArchiveOffset) ? body.nextArchiveOffset : null,
    nextArchiveCursor: typeof body.nextArchiveCursor === "string" ? body.nextArchiveCursor : null,
    archivePartitions: Number(body.archivePartitions) || 0,
    archiveScanned: Number(body.archiveScanned) || 0,
    archiveMatchesExact: body.archiveMatchesExact === true,
    syncStatus: body.syncStatus,
    nextProviderCursor: typeof body.nextProviderCursor === "string" ? body.nextProviderCursor : null,
    partial: !!body.partial,
    providers: Array.isArray(body.providers) ? body.providers : [],
    warnings: Array.isArray(body.warnings) ? body.warnings : [],
    updatedAt: String(body.updatedAt || ""),
  };
}
