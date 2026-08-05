// @ts-nocheck
// DARTS FIREFIGHTER — cache statistique rapide + réconciliation Historique.
import { History } from "./history";

export const DARTS_FIREFIGHTER_STATS_KEY = "dc_darts_firefighter_history_v1";

export function isDartsFirefighterRecord(raw: any): boolean {
  const tokens = [raw?.kind, raw?.mode, raw?.summary?.kind, raw?.summary?.mode, raw?.payload?.kind, raw?.payload?.mode, raw?.payload?.summary?.mode]
    .map((value) => String(value || "").toLowerCase());
  return tokens.some((value) => value.includes("darts_firefighter") || value.includes("firefighter"));
}

export function normalizeDartsFirefighterRecord(raw: any): any | null {
  if (!raw || typeof raw !== "object" || !isDartsFirefighterRecord(raw)) return null;
  const summary = raw?.summary || raw?.payload?.summary || {};
  const payload = raw?.payload || {};
  const matchStats = summary?.matchStats || payload?.stats?.match || payload?.stats?.global || {};
  const players = Array.isArray(summary?.players) ? summary.players : Array.isArray(payload?.players) ? payload.players : Array.isArray(raw?.players) ? raw.players : [];
  const id = String(raw?.id || raw?.matchId || summary?.matchId || "").trim();
  if (!id) return null;
  return {
    id,
    ts: Number(raw?.finishedAt || raw?.updatedAt || raw?.createdAt || summary?.finishedAt || Date.now()),
    createdAt: Number(raw?.createdAt || summary?.startedAt || 0),
    mapId: String(summary?.mapId || payload?.config?.mapId || "FR"),
    difficulty: String(summary?.difficulty || payload?.config?.difficulty || "firefighter"),
    won: Boolean(summary?.won ?? payload?.won),
    finishReason: summary?.finishReason || payload?.finishReason || null,
    score: Number(summary?.score ?? matchStats?.score ?? 0),
    roundsPlayed: Number(summary?.roundsPlayed ?? matchStats?.roundsPlayed ?? 0),
    durationMs: Number(summary?.durationMs ?? matchStats?.durationMs ?? 0),
    totalDarts: Number(matchStats?.totalDarts ?? 0),
    totalHits: Number(matchStats?.totalHits ?? 0),
    totalFireReduced: Number(matchStats?.totalFireReduced ?? 0),
    totalExtinguished: Number(matchStats?.totalExtinguished ?? summary?.totalExtinguished ?? 0),
    propagationBlocked: Number(matchStats?.propagationBlocked ?? summary?.propagationBlocked ?? 0),
    totalDestroyed: Number(matchStats?.totalDestroyed ?? summary?.totalDestroyed ?? 0),
    totalSpread: Number(matchStats?.totalSpread ?? summary?.totalSpread ?? 0),
    protectionsPlaced: Number(matchStats?.protectionsPlaced ?? 0),
    waterApplied: Number(matchStats?.waterApplied ?? 0),
    canadairs: Number(matchStats?.canadairs ?? 0),
    bulls: Number(matchStats?.bulls ?? 0),
    dbulls: Number(matchStats?.dbulls ?? 0),
    misses: Number(matchStats?.misses ?? 0),
    perfectVisits: Number(matchStats?.perfectVisits ?? 0),
    earlyValidatedVisits: Number(matchStats?.earlyValidatedVisits ?? summary?.earlyValidatedVisits ?? 0),
    dartsSaved: Number(matchStats?.dartsSaved ?? summary?.dartsSaved ?? 0),
    oneDartVisits: Number(matchStats?.oneDartVisits ?? 0),
    twoDartVisits: Number(matchStats?.twoDartVisits ?? 0),
    threeDartVisits: Number(matchStats?.threeDartVisits ?? 0),
    missionGrade: String(matchStats?.missionGrade ?? summary?.missionGrade ?? "").toUpperCase() || null,
    missionRating: Number(matchStats?.missionRating ?? summary?.missionRating ?? 0),
    activeTerritories: Number(summary?.activeTerritories || payload?.config?.activeTerritories || 0),
    initialFires: Number(summary?.initialFires || payload?.config?.initialFires || 0),
    criticalTerritories: Number(summary?.criticalTerritories || payload?.config?.criticalTerritories || 0),
    players,
    visits: Array.isArray(payload?.visits) ? payload.visits : Array.isArray(summary?.visits) ? summary.visits : [],
    summary,
    payload,
  };
}

export function loadDartsFirefighterStatsCache(): any[] {
  try {
    const rows = JSON.parse(localStorage.getItem(DARTS_FIREFIGHTER_STATS_KEY) || "[]");
    return Array.isArray(rows) ? rows.map(normalizeDartsFirefighterRecord).filter(Boolean).sort((a, b) => b.ts - a.ts) : [];
  } catch { return []; }
}

export function pushDartsFirefighterStats(record: any) {
  const normalized = normalizeDartsFirefighterRecord(record);
  if (!normalized) return;
  const prev = loadDartsFirefighterStatsCache();
  const next = [normalized, ...prev.filter((row) => String(row.id) !== String(normalized.id))].slice(0, 250);
  try { localStorage.setItem(DARTS_FIREFIGHTER_STATS_KEY, JSON.stringify(next)); } catch {}
  try {
    window.dispatchEvent(new Event("dc-darts-firefighter-updated"));
    window.dispatchEvent(new Event("dc-history-updated"));
  } catch {}
}

export async function loadDartsFirefighterStatsUnified(): Promise<any[]> {
  const byId = new Map(loadDartsFirefighterStatsCache().map((row) => [String(row.id), row]));
  try {
    const api: any = History as any;
    const light = typeof api?.listFinished === "function" ? await api.listFinished() : await api.list();
    const candidates = (Array.isArray(light) ? light : []).filter(isDartsFirefighterRecord);
    for (let i = 0; i < candidates.length; i += 16) {
      const batch = candidates.slice(i, i + 16);
      const rows = await Promise.all(batch.map(async (rec: any) => {
        const id = String(rec?.id || rec?.matchId || "");
        try { return id && typeof api?.get === "function" ? (await api.get(id)) || rec : rec; } catch { return rec; }
      }));
      rows.forEach((row) => {
        const normalized = normalizeDartsFirefighterRecord(row);
        if (normalized) byId.set(String(normalized.id), normalized);
      });
    }
  } catch {}
  const out = Array.from(byId.values()).sort((a, b) => b.ts - a.ts);
  try { localStorage.setItem(DARTS_FIREFIGHTER_STATS_KEY, JSON.stringify(out.slice(0, 250))); } catch {}
  return out;
}
