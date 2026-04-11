import React from "react";
import { getBasicProfileStats, getBasicProfileStatsAsync } from "../lib/statsBridge";

const EMPTY = {
  avg3: 0,
  bestVisit: 0,
  bestCheckout: 0,
  wins: 0,
  games: 0,
  winRate: 0,
  darts: 0,
};

const memoryCache = new Map<string, typeof EMPTY>();

function normalizeBasicStats(basic: any) {
  const games = Number((basic && basic.games) ?? 0);
  const wins = Number((basic && basic.wins) ?? 0);
  const darts = Number((basic && basic.darts) ?? 0);
  const avg3 = Number((basic && basic.avg3) ?? 0);
  const bestVisit = Number((basic && basic.bestVisit) ?? 0);
  const bestCheckout = Number((basic && basic.bestCheckout) ?? 0);
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
  return { avg3, bestVisit, bestCheckout, wins, games, winRate, darts };
}

export function primeBasicProfileViewStats(playerId: string | null | undefined, basic: any) {
  if (!playerId) return;
  memoryCache.set(String(playerId), normalizeBasicStats(basic));
}

export function useBasicProfileViewStats(playerId: string | undefined | null, enabled = true) {
  const cached = React.useMemo(() => {
    if (!playerId) return EMPTY;
    return memoryCache.get(String(playerId)) || EMPTY;
  }, [playerId]);

  const [stats, setStats] = React.useState(cached);

  React.useEffect(() => {
    if (!playerId) {
      setStats(EMPTY);
      return;
    }
    setStats(memoryCache.get(String(playerId)) || EMPTY);
  }, [playerId]);

  React.useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (!playerId || !enabled) return;

      try {
        const syncStats = normalizeBasicStats(getBasicProfileStats(playerId));
        memoryCache.set(String(playerId), syncStats);
        if (!cancelled) setStats(syncStats);
      } catch {
        if (!cancelled && !memoryCache.has(String(playerId))) {
          setStats(EMPTY);
        }
      }

      try {
        const asyncStats = normalizeBasicStats(await getBasicProfileStatsAsync(playerId));
        memoryCache.set(String(playerId), asyncStats);
        if (!cancelled) setStats(asyncStats);
      } catch {}
    };

    refresh();

    const onUpdated = () => {
      refresh();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("dc-stats-index-updated", onUpdated as EventListener);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("dc-stats-index-updated", onUpdated as EventListener);
      }
    };
  }, [playerId, enabled]);

  return playerId ? stats : EMPTY;
}
