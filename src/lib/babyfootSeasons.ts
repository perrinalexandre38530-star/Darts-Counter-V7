// =============================================================
// src/lib/babyfootSeasons.ts
// Baby-Foot — V4.9 Saisons / Sessions (SAFE)
// =============================================================

export type SeasonId = string;

export function detectSeason(match: any): SeasonId {
  const ts = match?.createdAt || match?.finishedAt || Date.now();
  const d = new Date(ts);
  return String(d.getFullYear());
}

export function groupBySeason(history: any[]) {
  const map: Record<SeasonId, any[]> = {};
  for (const h of history || []) {
    const season = detectSeason(h);
    if (!map[season]) map[season] = [];
    map[season].push(h);
  }
  return map;
}

export function filterBySeason(history: any[], season: SeasonId | "all") {
  if (!history) return [];
  if (season === "all") return history;
  return history.filter((h) => detectSeason(h) === season);
}
