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
  const visits = Array.isArray(payload?.visits) ? payload.visits : Array.isArray(summary?.visits) ? summary.visits : [];
  const finalTerritories = Array.isArray(summary?.finalTerritories) ? summary.finalTerritories : Array.isArray(payload?.finalTerritories) ? payload.finalTerritories : [];
  const id = String(raw?.id || raw?.matchId || summary?.matchId || "").trim();
  if (!id) return null;

  const sumPlayers = (field: string) => players.reduce((sum: number, player: any) => sum + Number(player?.[field] || 0), 0);
  const mergedSegments: Record<string, number> = {};
  players.forEach((player: any) => Object.entries(player?.hitsBySegment || {}).forEach(([key, value]) => { mergedSegments[key] = Number(mergedSegments[key] || 0) + Number(value || 0); }));
  const allEvents = visits.flatMap((visit: any) => Array.isArray(visit?.events) ? visit.events : []);
  const countEvent = (type: string) => allEvents.filter((event: any) => String(event?.type || "") === type).length;
  const statusCounts: Record<string, number> = {};
  finalTerritories.forEach((territory: any) => { const key = String(territory?.status || (territory?.destroyed ? "destroyed" : territory?.fireLevel ? `fire${territory.fireLevel}` : territory?.smoke ? "smoke" : territory?.protection ? "protected" : "safe")); statusCounts[key] = Number(statusCounts[key] || 0) + 1; });

  const totalDarts = Number(matchStats?.totalDarts ?? sumPlayers("darts") ?? 0);
  const totalHits = Number(matchStats?.totalHits ?? sumPlayers("hits") ?? 0);
  const totalVisits = Number(matchStats?.totalVisits ?? visits.length ?? sumPlayers("visits") ?? 0);
  const waterApplied = Number(matchStats?.waterApplied ?? sumPlayers("waterApplied") ?? 0);
  const totalFireReduced = Number(matchStats?.totalFireReduced ?? sumPlayers("fireReduced") ?? 0);
  const totalSpread = Number(matchStats?.totalSpread ?? summary?.totalSpread ?? countEvent("spread") ?? 0);
  const propagationBlocked = Number(matchStats?.propagationBlocked ?? summary?.propagationBlocked ?? sumPlayers("propagationBlocked") ?? countEvent("spread_blocked") ?? 0);
  const totalDestroyed = Number(matchStats?.totalDestroyed ?? summary?.totalDestroyed ?? statusCounts.destroyed ?? countEvent("destroyed") ?? 0);
  const activeTerritories = Number(summary?.activeTerritories || payload?.config?.activeTerritories || matchStats?.activeTerritories || finalTerritories.length || 0);
  const exactTargetAttempts = Number(matchStats?.exactTargetAttempts ?? visits.filter((visit: any) => visit?.targetMode === "visit_score").length);
  const exactTargetHits = Number(matchStats?.exactTargetHits ?? visits.filter((visit: any) => visit?.targetMode === "visit_score" && Number(visit?.matchedTargetScore || 0) > 0).length);
  const preserved = Math.max(0, activeTerritories - totalDestroyed);

  return {
    id,
    ts: Number(raw?.finishedAt || raw?.updatedAt || raw?.createdAt || summary?.finishedAt || Date.now()),
    createdAt: Number(raw?.createdAt || summary?.startedAt || 0),
    mapId: String(summary?.mapId || payload?.config?.mapId || "FR"),
    difficulty: String(summary?.difficulty || payload?.config?.difficulty || "firefighter"),
    missionPreset: String(summary?.missionPreset || payload?.config?.missionPreset || "custom"),
    objective: String(summary?.objective || payload?.config?.objective || "extinguish_all"),
    won: Boolean(summary?.won ?? payload?.won),
    finishReason: summary?.finishReason || payload?.finishReason || null,
    score: Number(summary?.score ?? matchStats?.score ?? 0),
    roundsPlayed: Number(summary?.roundsPlayed ?? matchStats?.roundsPlayed ?? 0),
    durationMs: Number(summary?.durationMs ?? matchStats?.durationMs ?? 0),
    totalDarts,
    totalHits,
    totalVisits,
    accuracy: totalDarts > 0 ? (totalHits / totalDarts) * 100 : Number(matchStats?.accuracy || 0),
    scorePerDart: totalDarts > 0 ? Number(summary?.score ?? matchStats?.score ?? 0) / totalDarts : 0,
    scorePerVisit: totalVisits > 0 ? Number(summary?.score ?? matchStats?.score ?? 0) / totalVisits : 0,
    totalFireReduced,
    totalExtinguished: Number(matchStats?.totalExtinguished ?? summary?.totalExtinguished ?? sumPlayers("firesExtinguished") ?? countEvent("extinguished") ?? 0),
    propagationBlocked,
    totalDestroyed,
    totalSpread,
    protectionsPlaced: Number(matchStats?.protectionsPlaced ?? sumPlayers("protectionsPlaced") ?? countEvent("protected") ?? 0),
    protectedTerritories: Number(matchStats?.protectedTerritories ?? 0),
    waterApplied,
    waterEfficiency: waterApplied > 0 ? totalFireReduced / waterApplied : 0,
    canadairs: Number(matchStats?.canadairs ?? countEvent("canadair") ?? 0),
    bulls: Number(matchStats?.bulls ?? sumPlayers("bulls") ?? 0),
    dbulls: Number(matchStats?.dbulls ?? sumPlayers("dbulls") ?? 0),
    singles: Number(matchStats?.singles ?? sumPlayers("singles") ?? 0),
    doubles: Number(matchStats?.doubles ?? sumPlayers("doubles") ?? 0),
    triples: Number(matchStats?.triples ?? sumPlayers("triples") ?? 0),
    misses: Number(matchStats?.misses ?? sumPlayers("misses") ?? 0),
    smokeCleared: Number(matchStats?.smokeCleared ?? sumPlayers("smokeCleared") ?? countEvent("smoke_cleared") ?? 0),
    uselessDarts: Number(matchStats?.uselessDarts ?? sumPlayers("uselessDarts") ?? 0),
    criticalInterventions: Number(matchStats?.criticalInterventions ?? sumPlayers("criticalInterventions") ?? 0),
    perfectVisits: Number(matchStats?.perfectVisits ?? sumPlayers("perfectVisits") ?? 0),
    earlyValidatedVisits: Number(matchStats?.earlyValidatedVisits ?? summary?.earlyValidatedVisits ?? sumPlayers("earlyValidatedVisits") ?? 0),
    dartsSaved: Number(matchStats?.dartsSaved ?? summary?.dartsSaved ?? sumPlayers("dartsSaved") ?? 0),
    oneDartVisits: Number(matchStats?.oneDartVisits ?? sumPlayers("oneDartVisits") ?? 0),
    twoDartVisits: Number(matchStats?.twoDartVisits ?? sumPlayers("twoDartVisits") ?? 0),
    threeDartVisits: Number(matchStats?.threeDartVisits ?? sumPlayers("threeDartVisits") ?? 0),
    bestVisitScore: Number(matchStats?.bestVisitScore ?? Math.max(0, ...players.map((player: any) => Number(player?.bestVisitScore || 0)))),
    exactTargetAttempts,
    exactTargetHits,
    exactTargetRate: exactTargetAttempts > 0 ? (exactTargetHits / exactTargetAttempts) * 100 : 0,
    maxCombo: Number(matchStats?.maxCombo ?? Math.max(0, ...visits.map((visit: any) => Number(visit?.comboAfter || 0)))),
    missionGrade: String(matchStats?.missionGrade ?? summary?.missionGrade ?? "").toUpperCase() || null,
    missionRating: Number(matchStats?.missionRating ?? summary?.missionRating ?? 0),
    activeTerritories,
    initialFires: Number(summary?.initialFires || payload?.config?.initialFires || 0),
    initialSmoke: Number(summary?.initialSmoke || payload?.config?.initialSmoke || 0),
    criticalTerritories: Number(summary?.criticalTerritories || payload?.config?.criticalTerritories || 0),
    destructionLimit: Number(matchStats?.destructionLimit ?? payload?.config?.destructionLimit ?? 0),
    incidentsRemaining: Number(matchStats?.incidentsRemaining ?? 0),
    dartsPerTurn: Number(matchStats?.dartsPerTurn ?? payload?.config?.dartsPerTurn ?? 3),
    propagationTiming: String(matchStats?.propagationTiming ?? summary?.propagationTiming ?? payload?.config?.propagationTiming ?? "after_visit"),
    windStrength: String(matchStats?.windStrength ?? summary?.windStrength ?? payload?.config?.windStrength ?? "normal"),
    targetMode: String(matchStats?.targetMode ?? payload?.stateSnapshot?.targetMode ?? (activeTerritories > 20 ? "visit_score" : "sector")),
    targetCalibration: matchStats?.targetCalibration ?? payload?.stateSnapshot?.targetCalibration ?? null,
    preservationRate: activeTerritories > 0 ? (preserved / activeTerritories) * 100 : 0,
    blockRate: (propagationBlocked + totalSpread) > 0 ? (propagationBlocked / (propagationBlocked + totalSpread)) * 100 : 0,
    hitsBySegment: Object.keys(matchStats?.hitsBySegment || {}).length ? { ...matchStats.hitsBySegment } : mergedSegments,
    finalStatusCounts: Object.keys(matchStats?.finalStatusCounts || {}).length ? { ...matchStats.finalStatusCounts } : statusCounts,
    players,
    visits,
    finalTerritories,
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
