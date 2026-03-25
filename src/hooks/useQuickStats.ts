// ============================================
// src/hooks/useQuickStats.ts
// Source principale: stats_index centralisé (IndexedDB/KV)
// Plus de dépendance au store principal pour les mini-stats.
// ============================================
import { useEffect, useMemo, useState } from "react";
import { loadStatsIndex, type StatsIndex } from "../lib/stats/rebuildStatsFromHistory";

export type QuickStats = {
  avg3: number;
  bestVisit: number;
  bestCheckout?: number;
  winRatePct: number;
  buckets: Record<string, number>;
};

export function useQuickStats(playerId: string | null): QuickStats | null {
  const [seed, setSeed] = useState(0);
  const [snap, setSnap] = useState<StatsIndex | null>(null);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const idx = await loadStatsIndex();
        if (!alive) return;
        setSnap(idx || null);
      } catch {
        if (!alive) return;
        setSnap(null);
      }
    };
    void read();

    const onStatsUpdated = () => setSeed((x) => x + 1);
    if (typeof window !== "undefined") {
      window.addEventListener("dc-stats-index-updated", onStatsUpdated as EventListener);
      window.addEventListener("dc-history-updated", onStatsUpdated as EventListener);
    }
    const t = setInterval(() => setSeed((x) => x + 1), 2000);

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("dc-stats-index-updated", onStatsUpdated as EventListener);
        window.removeEventListener("dc-history-updated", onStatsUpdated as EventListener);
      }
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const idx = await loadStatsIndex();
        setSnap(idx || null);
      } catch {
        setSnap(null);
      }
    })();
  }, [seed]);

  return useMemo(() => {
    if (!playerId || !snap?.byPlayer?.[playerId]) return null;
    const p: any = snap.byPlayer[playerId] || {};
    const games = Number(p.matches || 0) || 0;
    const wins = Number(p.wins || 0) || 0;
    const winRatePct = games > 0 ? (wins / games) * 100 : 0;

    return {
      avg3: Number(p.avg3 || 0) || 0,
      bestVisit: Number(p.bestVisit || 0) || 0,
      bestCheckout: p.bestCheckout != null ? Number(p.bestCheckout || 0) || 0 : undefined,
      winRatePct,
      buckets: (p.buckets && typeof p.buckets === "object") ? p.buckets : {},
    };
  }, [snap, playerId]);
}
