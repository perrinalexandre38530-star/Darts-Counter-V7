// src/lib/stats/rebuildStatsToStore.ts
// ============================================
// Compat layer — ne réécrit plus de gros stats blobs dans le store principal.
// Source de vérité : stats_index centralisé (IndexedDB/KV)
// ============================================

import { getOrRebuildStatsIndex } from "./rebuildStatsFromHistory";

export type PlayerStats = {
  matches: number;
  wins: number;
  points: number;
  darts: number;
  avg3?: number;
  bestVisit?: number;
  bestCheckout?: number;
};

export type ModeStats = {
  matches: number;
  totalPoints: number;
};

export async function rebuildStatsToStore() {
  const idx = await getOrRebuildStatsIndex({ includeNonFinished: true, persist: true });

  const statsByPlayer: Record<string, PlayerStats> = {};
  const statsByMode: Record<string, ModeStats> = {};

  for (const [pid, p] of Object.entries(idx?.byPlayer || {})) {
    const row: any = p || {};
    statsByPlayer[pid] = {
      matches: Number(row.matches || 0) || 0,
      wins: Number(row.wins || 0) || 0,
      points: Number(row.pointsScored || 0) || 0,
      darts: Number(row.dartsThrown || 0) || 0,
      avg3: Number(row.avg3 || 0) || 0,
      bestVisit: Number(row.bestVisit || 0) || 0,
      bestCheckout: Number(row.bestCheckout || 0) || 0,
    };
  }

  for (const [mode, m] of Object.entries(idx?.byMode || {})) {
    const row: any = m || {};
    statsByMode[mode] = {
      matches: Number(row.matches || 0) || 0,
      totalPoints: 0,
    };
  }

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dc-stats-store-refreshed", {
        detail: {
          players: Object.keys(statsByPlayer).length,
          modes: Object.keys(statsByMode).length,
          rebuiltAt: Number(idx?.rebuiltAt || Date.now()) || Date.now(),
        },
      }));
      window.dispatchEvent(new Event("dc-history-updated"));
    }
  } catch {}

  return {
    players: Object.keys(statsByPlayer).length,
    modes: Object.keys(statsByMode).length,
  };
}
