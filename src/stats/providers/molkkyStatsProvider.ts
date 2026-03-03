// ============================================
// src/stats/providers/molkkyStatsProvider.ts
// Phase 1: minimal provider backed by existing molkkyStore/molkkyStats
// ============================================

import { loadMolkkyMatches } from "../../lib/molkkyStore";
import {
  aggregatePlayers as aggregateMolkkyPlayers,
  safeNum,
} from "../../lib/molkkyStats";
import type {
  GlobalStats,
  MatchHistoryEntry,
  PlayerStats,
  RankingEntry,
  StatsPeriod,
  StatsProvider,
} from "../types";

function readProfiles(): Array<{ id: string; name: string }> {
  try {
    const raw = localStorage.getItem("dc_profiles_v1");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export const molkkyStatsProvider: StatsProvider = {
  getGlobalStats(): GlobalStats {
    const matches = (() => {
      try {
        return loadMolkkyMatches();
      } catch {
        return [];
      }
    })();

    const playersAgg = aggregateMolkkyPlayers(matches);
    const totalMatches = safeNum(matches?.length);
    const bestScore = playersAgg?.length
      ? Math.max(...playersAgg.map((p: any) => safeNum(p?.bestPtsPerThrow)))
      : 0;
    const avgScore = playersAgg?.length
      ?
          playersAgg.reduce(
            (acc: number, p: any) => acc + safeNum(p?.avgPtsPerThrow),
            0
          ) / playersAgg.length
      : 0;
    const winRate = playersAgg?.length
      ?
          playersAgg.reduce(
            (acc: number, p: any) => acc + safeNum(p?.winrate),
            0
          ) / playersAgg.length
      : 0;

    const avgDurationMs = playersAgg?.length
      ?
          playersAgg.reduce(
            (acc: number, p: any) => acc + safeNum(p?.avgDurationMs),
            0
          ) / playersAgg.length
      : 0;
    const avgTurns = playersAgg?.length
      ?
          playersAgg.reduce(
            (acc: number, p: any) => acc + safeNum(p?.avgTurns),
            0
          ) / playersAgg.length
      : 0;

    return {
      matches: totalMatches,
      winRate,
      avgScore: Number.isFinite(avgScore) ? Math.round(avgScore * 10) / 10 : 0,
      bestScore,
      avgDurationMs: Number.isFinite(avgDurationMs) ? avgDurationMs : 0,
      avgTurns: Number.isFinite(avgTurns) ? Math.round(avgTurns * 10) / 10 : 0,
      favoriteMode: "molkky.classic",
    };
  },

  getPlayerStats(playerId: string): PlayerStats {
    const profiles = readProfiles();
    const player = profiles.find((p) => String(p.id) === String(playerId));
    const name = player?.name || "";

    const matches = (() => {
      try {
        return loadMolkkyMatches();
      } catch {
        return [];
      }
    })();

    const agg = aggregateMolkkyPlayers(matches);
    const row = (agg || []).find((p: any) => String(p?.name || "") === name);

    return {
      matches: safeNum(row?.matches),
      winRate: safeNum(row?.winrate),
      avgScore: safeNum(row?.avgPtsPerThrow),
      bestScore: safeNum(row?.bestPtsPerThrow),
      avgDurationMs: safeNum(row?.avgDurationMs),
      avgTurns: safeNum(row?.avgTurns),
    };
  },

  getRankings(_period: StatsPeriod, sortBy: string): RankingEntry[] {
    const matches = (() => {
      try {
        return loadMolkkyMatches();
      } catch {
        return [];
      }
    })();

    const agg = aggregateMolkkyPlayers(matches) || [];
    const mapVal = (p: any) => {
      switch (sortBy) {
        case "winrate":
          return safeNum(p?.winrate) * 100;
        case "best":
          return safeNum(p?.bestPtsPerThrow);
        case "avg":
          return safeNum(p?.avgPtsPerThrow);
        case "matches":
        default:
          return safeNum(p?.matches);
      }
    };

    return agg
      .map((p: any) => ({
        playerId: String(p?.id || p?.playerId || p?.name || ""),
        playerName: String(p?.name || ""),
        value: mapVal(p),
      }))
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  },

  getHistory(_period: StatsPeriod): MatchHistoryEntry[] {
    const matches = (() => {
      try {
        return loadMolkkyMatches();
      } catch {
        return [];
      }
    })();

    return (matches || [])
      .map((m: any, i: number) => ({
        id: String(m?.id || m?.matchId || `molkky_${i}`),
        date: Number(m?.endedAt || m?.createdAt || Date.now()),
        players: Array.isArray(m?.players)
          ? m.players.map((p: any) => String(p?.name || p?.id || ""))
          : [],
        winner: String(m?.winnerName || m?.winner || ""),
        mode: String(m?.mode || "molkky.classic"),
        status: m?.endedAt ? "finished" : "in_progress",
      }))
      .sort((a: any, b: any) => (b.date || 0) - (a.date || 0));
  },
};
