// ============================================
// src/stats/providers/dartsStatsProvider.ts
// Phase 1: contract + safe stub (wire real darts stats in Phase 2)
// ============================================

import type {
  GlobalStats,
  MatchHistoryEntry,
  PlayerStats,
  RankingEntry,
  StatsPeriod,
  StatsProvider,
} from "../types";

export const dartsStatsProvider: StatsProvider = {
  getGlobalStats(): GlobalStats {
    return {
      matches: 0,
      winRate: 0,
      avgScore: 0,
      bestScore: 0,
    };
  },

  getPlayerStats(_playerId: string): PlayerStats {
    return {
      matches: 0,
      winRate: 0,
      avgScore: 0,
      bestScore: 0,
    };
  },

  getRankings(_period: StatsPeriod, _sortBy: string): RankingEntry[] {
    return [];
  },

  getHistory(_period: StatsPeriod): MatchHistoryEntry[] {
    return [];
  },
};
