// src/hooks/useStatsBootstrap.ts
// ============================================
// Bootstrapping StatsIndex (cache + rebuild)
// ============================================

import { useCallback, useEffect, useState } from "react";
import { loadStatsIndex, rebuildStatsFromHistory, type StatsIndex } from "../lib/stats/rebuildStatsFromHistory";

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
    // 1) tente cache
    const cached = loadStatsIndex();
    if (cached) {
      setIndex(cached);
      setLoading(false);
      return;
    }
    // 2) sinon rebuild
    rebuild();
  }, [rebuild]);

  return { index, loading, error, rebuild };
}
