// =======================================================
// src/lib/x01v3/x01StatsExportV3.ts
// Export & agrégation de stats X01 V3
// - Convertit X01MatchStatsV3 + config + state en résumés par joueur
// - Agrège plusieurs matchs pour un joueur (Stats Joueur / StatsHub)
// =======================================================

import type {
    X01ConfigV3,
    X01MatchStateV3,
    X01MatchStatsV3,
    X01PlayerId,
    X01GameMode,
    X01InMode,
    X01OutMode,
  } from "../../types/x01v3";
  
  /* -------------------------------------------------------
     Meta d'un match X01 V3 (pour Stats / Historique)
  ------------------------------------------------------- */
  export interface X01V3MatchMeta {
    matchId: string;
    startedAt: number;     // timestamp ms
    finishedAt: number;    // timestamp ms
  
    startScore: 301 | 501 | 701 | 901;
    gameMode: X01GameMode;
    inMode: X01InMode;
    outMode: X01OutMode;
  
    legsPerSet: number;
    setsToWin: number;
  
    isOnline: boolean;
    lobbyId?: string;
  }
  
  /* -------------------------------------------------------
     Résumé par joueur pour UN match X01 V3
  ------------------------------------------------------- */
  export interface X01V3PlayerMatchSummary {
    matchId: string;
    playerId: X01PlayerId;
    playerName: string;
  
    // Meta match
    startedAt: number;
    finishedAt: number;
    startScore: 301 | 501 | 701 | 901;
    gameMode: X01GameMode;
    inMode: X01InMode;
    outMode: X01OutMode;
    legsPerSet: number;
    setsToWin: number;
    isOnline: boolean;
  
    // Résultat
    isWinner: boolean;
    legsWon: number;
    setsWon: number;
  
    // Stats principales
    dartsThrown: number;
    visits: number;
    totalScore: number;
    avg3: number;
    bestVisit: number;
    miss: number;
    bust: number;
  
    // Hits / Segments
    hits: {
      S: number;
      D: number;
      T: number;
      Bull: number;
      DBull: number;
    };
    bySegment: Record<string, { S: number; D: number; T: number }>;
  }
  
  /* -------------------------------------------------------
     Agrégats globaux pour un joueur (tous matchs V3)
  ------------------------------------------------------- */
  export interface X01V3PlayerAgg {
    playerId: X01PlayerId;
  
    // Global
    matchesPlayed: number;
    matchesWon: number;
    legsWon: number;
    setsWon: number;
  
    dartsThrown: number;
    visits: number;
    totalScore: number;
  
    avg3Global: number;       // moyenne globale du joueur
    bestAvg3Match: number;    // meilleure avg3 sur un match
    bestVisitEver: number;    // meilleure volée
  
    miss: number;
    bust: number;
  
    hits: {
      S: number;
      D: number;
      T: number;
      Bull: number;
      DBull: number;
    };
    bySegment: Record<string, { S: number; D: number; T: number }>;
  
    // Détail par mode (solo/multi/teams + online/local)
    breakdownByMode: Record<
      string,
      {
        matchesPlayed: number;
        matchesWon: number;
        avg3Global: number;
        dartsThrown: number;
        totalScore: number;
      }
    >;
  }
  
  /* =======================================================
     1) Construction de résumés par joueur pour UN match
  ======================================================= */
  
  /**
   * Construit un tableau X01V3PlayerMatchSummary à partir
   * de la config, du state final et des matchStats V3.
   *
   * À appeler UNE FOIS à la fin du match (status = "match_end"),
   * après finalizeMatchStatsV3().
   */
  export function buildX01V3PlayerMatchSummaries(
    config: X01ConfigV3,
    state: X01MatchStateV3,
    matchStats: X01MatchStatsV3,
    meta: X01V3MatchMeta
  ): X01V3PlayerMatchSummary[] {
    const { players } = config;
    const summaries: X01V3PlayerMatchSummary[] = [];
  
    const winnerPid = matchStats.winnerPlayerId;
  
    for (const p of players) {
      const pStats = matchStats.players[p.id];
      if (!pStats) continue;
  
      const isWinner = !!winnerPid && winnerPid === p.id;
  
      const summary: X01V3PlayerMatchSummary = {
        matchId: meta.matchId,
        playerId: p.id,
        playerName: p.name,
  
        startedAt: meta.startedAt,
        finishedAt: meta.finishedAt,
        startScore: meta.startScore,
        gameMode: meta.gameMode,
        inMode: meta.inMode,
        outMode: meta.outMode,
        legsPerSet: meta.legsPerSet,
        setsToWin: meta.setsToWin,
        isOnline: meta.isOnline,
  
        isWinner,
        legsWon: pStats.legsWon,
        setsWon: pStats.setsWon,
  
        dartsThrown: pStats.dartsThrown,
        visits: pStats.visits,
        totalScore: pStats.totalScore,
        avg3: pStats.avg3,
        bestVisit: pStats.bestVisit,
        miss: pStats.miss,
        bust: pStats.bust,
  
        hits: {
          S: pStats.hits.S,
          D: pStats.hits.D,
          T: pStats.hits.T,
          Bull: pStats.hits.Bull,
          DBull: pStats.hits.DBull,
        },
  
        bySegment: { ...pStats.bySegment },
      };
  
      summaries.push(summary);
    }
  
    return summaries;
  }
  
  /* =======================================================
     2) Agrégation sur plusieurs matchs pour un joueur
  ======================================================= */
  
  export function aggregateX01V3ForPlayer(
    allSummaries: X01V3PlayerMatchSummary[],
    playerId: X01PlayerId
  ): X01V3PlayerAgg {
    const relevant = allSummaries.filter(s => s.playerId === playerId);
  
    const agg: X01V3PlayerAgg = {
      playerId,
      matchesPlayed: 0,
      matchesWon: 0,
      legsWon: 0,
      setsWon: 0,
      dartsThrown: 0,
      visits: 0,
      totalScore: 0,
      avg3Global: 0,
      bestAvg3Match: 0,
      bestVisitEver: 0,
      miss: 0,
      bust: 0,
      hits: {
        S: 0,
        D: 0,
        T: 0,
        Bull: 0,
        DBull: 0,
      },
      bySegment: {},
      breakdownByMode: {},
    };
  
    if (relevant.length === 0) {
      return agg;
    }
  
    for (const s of relevant) {
      agg.matchesPlayed += 1;
      if (s.isWinner) agg.matchesWon += 1;
  
      agg.legsWon += s.legsWon;
      agg.setsWon += s.setsWon;
  
      agg.dartsThrown += s.dartsThrown;
      agg.visits += s.visits;
      agg.totalScore += s.totalScore;
  
      agg.miss += s.miss;
      agg.bust += s.bust;
  
      agg.hits.S += s.hits.S;
      agg.hits.D += s.hits.D;
      agg.hits.T += s.hits.T;
      agg.hits.Bull += s.hits.Bull;
      agg.hits.DBull += s.hits.DBull;
  
      if (s.bestVisit > agg.bestVisitEver) {
        agg.bestVisitEver = s.bestVisit;
      }
      if (s.avg3 > agg.bestAvg3Match) {
        agg.bestAvg3Match = s.avg3;
      }
  
      // bySegment
      mergeBySegment(agg.bySegment, s.bySegment);
  
      // breakdown par mode (ex: "solo_local", "teams_online"…)
      const modeKey = getModeKey(s);
      let m = agg.breakdownByMode[modeKey];
      if (!m) {
        m = {
          matchesPlayed: 0,
          matchesWon: 0,
          avg3Global: 0,
          dartsThrown: 0,
          totalScore: 0,
        };
        agg.breakdownByMode[modeKey] = m;
      }
  
      m.matchesPlayed += 1;
      if (s.isWinner) m.matchesWon += 1;
      m.dartsThrown += s.dartsThrown;
      m.totalScore += s.totalScore;
    }
  
    // avg3 global joueur
    if (agg.dartsThrown > 0) {
      const perDart = agg.totalScore / agg.dartsThrown;
      agg.avg3Global = perDart * 3;
    }
  
    // avg3 globale par mode
    for (const key of Object.keys(agg.breakdownByMode)) {
      const m = agg.breakdownByMode[key];
      if (m.dartsThrown > 0) {
        const perDart = m.totalScore / m.dartsThrown;
        m.avg3Global = perDart * 3;
      } else {
        m.avg3Global = 0;
      }
    }
  
    return agg;
  }
  
  /* -------------------------------------------------------
     Merge bySegment helper
  ------------------------------------------------------- */
  function mergeBySegment(
    target: Record<string, { S: number; D: number; T: number }>,
    source: Record<string, { S: number; D: number; T: number }>
  ) {
    for (const key of Object.keys(source)) {
      if (!target[key]) {
        target[key] = { S: 0, D: 0, T: 0 };
      }
      target[key].S += source[key].S;
      target[key].D += source[key].D;
      target[key].T += source[key].T;
    }
  }
  
  /* -------------------------------------------------------
     Clef de breakdown mode (solo/multi/teams + online/local)
  ------------------------------------------------------- */
  function getModeKey(s: X01V3PlayerMatchSummary): string {
    const scope = s.isOnline ? "online" : "local";
    return `${s.gameMode}_${scope}`; // ex: "solo_local", "teams_online"
  }
  