// ============================================
// src/hooks/useQuickStats.ts
// Snapshot instantané, sans rebuild au montage.
// - 1er rendu : miroir localStorage ultra-léger
// - Puis : lecture de l'index IndexedDB déjà calculé
// - Aucun polling / aucun force:true / aucun scan Historique depuis la page Stats
// ============================================
import { useEffect, useMemo, useState } from "react";
import {
  loadStatsIndex,
  loadStatsQuickMirrorSync,
  type StatsIndex,
  type StatsQuickMirror,
} from "../lib/stats/rebuildStatsFromHistory";

export type QuickStats = {
  avg3: number;
  bestVisit: number;
  bestCheckout?: number;
  winRatePct: number;
  buckets: Record<string, number>;
  matches?: number;
  wins?: number;
  losses?: number;
  dartsThrown?: number;
  pointsScored?: number;
  lastMatchAt?: number;
};

function readQuickEntry(
  playerId: string,
  index: StatsIndex | null,
  mirror: StatsQuickMirror | null
): QuickStats | null {
  const fromIndex: any = index?.byPlayer?.[playerId] || null;
  const fromMirror: any = mirror?.byPlayer?.[playerId] || null;
  const p: any = fromIndex || fromMirror;
  if (!p) return null;

  const games = Number(p.matches || 0) || 0;
  const wins = Number(p.wins || 0) || 0;
  const losses = Number(p.losses || 0) || 0;
  const winRatePct = games > 0 ? (wins / games) * 100 : 0;

  return {
    avg3: Number(p.avg3 || 0) || 0,
    bestVisit: Number(p.bestVisit || 0) || 0,
    bestCheckout: p.bestCheckout != null ? Number(p.bestCheckout || 0) || 0 : undefined,
    winRatePct,
    buckets: p.buckets && typeof p.buckets === "object" ? p.buckets : {},
    matches: games,
    wins,
    losses,
    dartsThrown: Number(p.dartsThrown || 0) || 0,
    pointsScored: Number(p.pointsScored || 0) || 0,
    lastMatchAt: Number(p.lastMatchAt || 0) || undefined,
  };
}

export function useQuickStats(playerId: string | null): QuickStats | null {
  // Lecture synchronisée avant le premier paint. Ce miroir fait quelques ko,
  // contrairement à l'Historique et à ses payloads compressés.
  const [mirror, setMirror] = useState<StatsQuickMirror | null>(() => loadStatsQuickMirrorSync());
  const [index, setIndex] = useState<StatsIndex | null>(null);

  useEffect(() => {
    let alive = true;

    const refreshFromCaches = async () => {
      // Toujours relire le miroir immédiatement : il est mis à jour par le rebuild
      // réalisé après une partie/import, pas par la page Stats.
      try {
        if (alive) setMirror(loadStatsQuickMirrorSync());
      } catch {}

      try {
        const cached = await loadStatsIndex();
        if (alive) setIndex(cached || null);
      } catch {
        if (alive) setIndex(null);
      }
    };

    void refreshFromCaches();

    const onStatsUpdated = () => {
      void refreshFromCaches();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("dc-stats-index-updated", onStatsUpdated as EventListener);
    }

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("dc-stats-index-updated", onStatsUpdated as EventListener);
      }
    };
  }, []);

  return useMemo(() => {
    if (!playerId) return null;
    return readQuickEntry(String(playerId), index, mirror);
  }, [index, mirror, playerId]);
}
