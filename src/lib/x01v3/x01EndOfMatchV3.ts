// =======================================================
// src/lib/x01v3/x01EndOfMatchV3.ts
// Orchestrateur de fin de match X01 V3
// - Construit un meta propre (X01V3MatchMeta)
// - Génère les résumés par joueur
// - Regroupe tout dans un payload unique
// =======================================================

import type {
    X01ConfigV3,
    X01MatchStateV3,
    X01MatchStatsV3,
  } from "../../types/x01v3";
  
  import {
    type X01V3MatchMeta,
    type X01V3PlayerMatchSummary,
    buildX01V3PlayerMatchSummaries,
  } from "./x01StatsExportV3";
  
  /* -------------------------------------------------------
     Options pour buildEndOfMatchPayloadV3
  ------------------------------------------------------- */
  export interface X01EndOfMatchOptionsV3 {
    startedAt: number;            // timestamp début de match
    finishedAt?: number;          // si absent => Date.now()
    isOnline?: boolean;
    lobbyId?: string;
  }
  
  /* -------------------------------------------------------
     Payload complet de fin de match
  ------------------------------------------------------- */
  export interface X01EndOfMatchPayloadV3 {
    meta: X01V3MatchMeta;
    config: X01ConfigV3;
    finalState: X01MatchStateV3;
    matchStats: X01MatchStatsV3;
    playerSummaries: X01V3PlayerMatchSummary[];
  }
  
  /* -------------------------------------------------------
     Fonction principale
     À appeler UNE FOIS quand le match se termine
     (state.status === "match_end" et matchStats finalisé)
  ------------------------------------------------------- */
  export function buildEndOfMatchPayloadV3(
    config: X01ConfigV3,
    state: X01MatchStateV3,
    matchStats: X01MatchStatsV3,
    opts: X01EndOfMatchOptionsV3
  ): X01EndOfMatchPayloadV3 {
    const finishedAt = opts.finishedAt ?? Date.now();
  
    const meta: X01V3MatchMeta = {
      matchId: state.matchId,
      startedAt: opts.startedAt,
      finishedAt,
  
      startScore: config.startScore,
      gameMode: config.gameMode,
      inMode: config.inMode,
      outMode: config.outMode,
  
      legsPerSet: config.legsPerSet,
      setsToWin: config.setsToWin,
  
      isOnline: !!opts.isOnline,
      lobbyId: opts.lobbyId,
    };
  
    const playerSummaries = buildX01V3PlayerMatchSummaries(
      config,
      state,
      matchStats,
      meta
    );
  
    return {
      meta,
      config,
      finalState: state,
      matchStats,
      playerSummaries,
    };
  }
  