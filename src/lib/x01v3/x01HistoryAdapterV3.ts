// =======================================================
// src/lib/x01v3/x01HistoryAdapterV3.ts
// Adaptateur X01 V3 -> snapshot d'historique générique
// - Ne dépend PAS de lib/history.ts existant
// - Fournit un objet simple prêt à être stocké
//   ou adapté vers SavedMatch / MatchRecord plus tard
// =======================================================

import type {
    X01ConfigV3,
    X01MatchStateV3,
    X01MatchStatsV3,
  } from "../../types/x01v3";
  
  import type {
    X01V3MatchMeta,
    X01V3PlayerMatchSummary,
  } from "./x01StatsExportV3";
  
  import type {
    X01EndOfMatchPayloadV3,
  } from "./x01EndOfMatchV3";
  
  /* -------------------------------------------------------
     Snapshot d'historique générique pour un match X01 V3
     (indépendant de lib/history.ts)
  ------------------------------------------------------- */
  export interface X01V3HistorySnapshot {
    id: string;                 // matchId
    kind: "x01_v3";
  
    meta: X01V3MatchMeta;
  
    // Résumé minimal de la config (pour affichage liste)
    configSummary: {
      startScore: 301 | 501 | 701 | 901;
      gameMode: string;         // "solo", "multi", "teams"
      inMode: string;           // "single", "double", "master"
      outMode: string;          // "
      legsPerSet: number;
      setsToWin: number;
      players: Array<{
        id: string;
        name: string;
      }>;
    };
  
    // Résumé résultat global
    resultSummary: {
      winnerPlayerId?: string;
      winnerPlayerName?: string;
      winnerTeamId?: string;
      durationMs: number;
    };
  
    // Stats complètes match + par joueur (V3)
    matchStats: X01MatchStatsV3;
    playerSummaries: X01V3PlayerMatchSummary[];
  
    // État final brut (pour reprise si besoin)
    finalState: X01MatchStateV3;
    config: X01ConfigV3;
  }
  
  /* -------------------------------------------------------
     Construction d'un snapshot d'historique X01 V3
     à partir du payload de fin de match
  ------------------------------------------------------- */
  export function buildX01V3HistorySnapshot(
    payload: X01EndOfMatchPayloadV3
  ): X01V3HistorySnapshot {
    const { meta, config, finalState, matchStats, playerSummaries } = payload;
  
    const playersSummary = config.players.map(p => ({
      id: p.id,
      name: p.name,
    }));
  
    // Winner (si connu)
    let winnerPlayerId: string | undefined;
    let winnerPlayerName: string | undefined;
    let winnerTeamId: string | undefined;
  
    if (matchStats.winnerPlayerId) {
      winnerPlayerId = matchStats.winnerPlayerId;
      const p = config.players.find(pl => pl.id === winnerPlayerId);
      winnerPlayerName = p?.name;
    } else if (matchStats.winnerTeamId) {
      winnerTeamId = matchStats.winnerTeamId;
    }
  
    const durationMs = Math.max(
      0,
      (meta.finishedAt ?? Date.now()) - meta.startedAt
    );
  
    const snapshot: X01V3HistorySnapshot = {
      id: meta.matchId,
      kind: "x01_v3",
  
      meta,
  
      configSummary: {
        startScore: meta.startScore,
        gameMode: meta.gameMode,
        inMode: meta.inMode,
        outMode: meta.outMode,
        legsPerSet: meta.legsPerSet,
        setsToWin: meta.setsToWin,
        players: playersSummary,
      },
  
      resultSummary: {
        winnerPlayerId,
        winnerPlayerName,
        winnerTeamId,
        durationMs,
      },
  
      matchStats,
      playerSummaries,
  
      finalState,
      config,
    };
  
    return snapshot;
  }
  