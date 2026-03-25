// src/hooks/useStatsBootstrap.ts
// ============================================
// Bootstrapping StatsIndex (cache IDB + rebuild)
// ============================================

import { useCallback, useEffect, useState } from "react";
import { getOrRebuildStatsIndex, loadStatsIndex, rebuildStatsFromHistory, type StatsIndex } from "../lib/stats/rebuildStatsFromHistory";

export function useStatsBootstrap() {
  const [index, setIndex] = useState<StatsIndex | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const rebuild = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const idx = await rebuildStatsFromHistory({ includeNonFinished: true, persist: true });
      setIndex(idx);
    } catch (e: any) {
      setError(e?.message || "Rebuild stats failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      setError(null);
      try {
        const idx = await getOrRebuildStatsIndex({ includeNonFinished: true, persist: true });
        if (!cancelled) setIndex(idx);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Stats bootstrap failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const onStatsUpdated = async () => {
      try {
        const idx = await loadStatsIndex();
        if (!cancelled && idx) setIndex(idx);
      } catch {}
    };

    void boot();
    if (typeof window !== "undefined") {
      window.addEventListener("dc-stats-index-updated", onStatsUpdated as EventListener);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("dc-stats-index-updated", onStatsUpdated as EventListener);
      }
    };
  }, []);

  return { index, loading, error, rebuild };
}
