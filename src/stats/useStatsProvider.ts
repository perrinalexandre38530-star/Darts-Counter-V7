// ============================================
// src/stats/useStatsProvider.ts
// Phase 1: pick the right provider based on SportContext
// ============================================

import { useMemo } from "react";
import { useSport } from "../contexts/SportContext";

import { dartsStatsProvider } from "./providers/dartsStatsProvider";
import { molkkyStatsProvider } from "./providers/molkkyStatsProvider";
import { dicegameStatsProvider } from "./providers/dicegameStatsProvider";

export function useStatsProvider() {
  const { sport } = useSport();

  return useMemo(() => {
    switch (sport) {
      case "molkky":
        return molkkyStatsProvider;
      case "dicegame":
        return dicegameStatsProvider;
      case "darts":
      default:
        return dartsStatsProvider;
    }
  }, [sport]);
}
