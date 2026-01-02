// ============================================
// src/stats/trainingX01Stats.ts
// Agrégations complètes pour Training X01
// - lit TrainingStore.getX01SessionsForProfile(profileId)
// - retourne un objet unique prêt pour StatsHub / Home
// ============================================

import {
    TrainingStore,
    type TrainingX01Session,
  } from "../lib/TrainingStore";
  
  export type TrainingX01SparkPoint = {
    date: number;
    value: number;
  };
  
  export type TrainingX01Aggregates = {
    // liste brute si tu veux détailler dans un tableau / modal
    sessions: TrainingX01Session[];
  
    // volumes
    countSessions: number;
    totalDarts: number;
    totalHits: number;
  
    // moyennes / records globaux
    avg3Global: number; // moyenne 3D pondérée par le nb de darts
    bestVisit: number;
    bestCheckout: number;
  
    // hit rates
    hitRatePct: number; // totalHits / totalDarts * 100
    pctS: number;
    pctD: number;
    pctT: number;
  
    // compteurs globaux
    miss: number;
    bull: number;
    dBull: number;
    bust: number;
  
    // heatmaps agrégées (toutes sessions confondues)
    bySegment: Record<string, number>;
    bySegmentS: Record<string, number>;
    bySegmentD: Record<string, number>;
    bySegmentT: Record<string, number>;
  
    // sparklines simples (par session, triées dans l'ordre chronologique)
    sparkAvg3: TrainingX01SparkPoint[];
    sparkDarts: TrainingX01SparkPoint[];
  };
  
  /** Petit helper interne pour merger des heatmaps */
  function mergeMaps(
    target: Record<string, number>,
    source?: Record<string, number>,
  ): void {
    if (!source) return;
    for (const [key, val] of Object.entries(source)) {
      const n = Number(val) || 0;
      if (!n) continue;
      target[key] = (target[key] ?? 0) + n;
    }
  }
  
  /**
   * Construit les stats complètes Training X01 pour un profil donné.
   * ➜ C'est CE helper qu'on branchera dans StatsHub + Home.
   */
  export function buildTrainingX01Aggregates(
    profileId: string | null,
  ): TrainingX01Aggregates {
    const sessions = TrainingStore.getX01SessionsForProfile(profileId);
  
    if (!sessions.length) {
      return {
        sessions: [],
        countSessions: 0,
        totalDarts: 0,
        totalHits: 0,
        avg3Global: 0,
        bestVisit: 0,
        bestCheckout: 0,
        hitRatePct: 0,
        pctS: 0,
        pctD: 0,
        pctT: 0,
        miss: 0,
        bull: 0,
        dBull: 0,
        bust: 0,
        bySegment: {},
        bySegmentS: {},
        bySegmentD: {},
        bySegmentT: {},
        sparkAvg3: [],
        sparkDarts: [],
      };
    }
  
    let totalDarts = 0;
    let totalHits = 0;
    let weightedAvg3Sum = 0; // somme(avg3D * darts) pour moyenne pondérée
  
    let bestVisit = 0;
    let bestCheckout = 0;
  
    let totalS = 0;
    let totalD = 0;
    let totalT = 0;
    let miss = 0;
    let bull = 0;
    let dBull = 0;
    let bust = 0;
  
    const bySegment: Record<string, number> = {};
    const bySegmentS: Record<string, number> = {};
    const bySegmentD: Record<string, number> = {};
    const bySegmentT: Record<string, number> = {};
  
    const sparkAvg3: TrainingX01SparkPoint[] = [];
    const sparkDarts: TrainingX01SparkPoint[] = [];
  
    // On part du principe que TrainingStore renvoie déjà trié par date décroissante
    // ➜ pour les sparklines on re-trie dans l'ordre chronologique à la fin.
    for (const s of sessions) {
      const darts = Number(s.darts || 0);
      const avg3D = Number(s.avg3D || 0);
      const bVisit = Number(s.bestVisit || 0);
      const bCheckout = s.bestCheckout != null ? Number(s.bestCheckout) : 0;
  
      const hS = Number(s.hitsS || 0);
      const hD = Number(s.hitsD || 0);
      const hT = Number(s.hitsT || 0);
      const m = Number(s.miss || 0);
      const b = Number(s.bull || 0);
      const db = Number(s.dBull || 0);
      const bu = Number(s.bust || 0);
  
      const hitsThisSession = hS + hD + hT + b + db;
  
      totalDarts += darts;
      totalHits += hitsThisSession;
      weightedAvg3Sum += avg3D * darts;
  
      if (bVisit > bestVisit) bestVisit = bVisit;
      if (bCheckout > bestCheckout) bestCheckout = bCheckout;
  
      totalS += hS;
      totalD += hD;
      totalT += hT;
      miss += m;
      bull += b;
      dBull += db;
      bust += bu;
  
      mergeMaps(bySegment, s.bySegment);
      mergeMaps(bySegmentS, s.bySegmentS);
      mergeMaps(bySegmentD, s.bySegmentD);
      mergeMaps(bySegmentT, s.bySegmentT);
  
      sparkAvg3.push({
        date: s.date,
        value: avg3D,
      });
  
      sparkDarts.push({
        date: s.date,
        value: darts,
      });
    }
  
    const avg3Global =
      totalDarts > 0 ? weightedAvg3Sum / totalDarts : 0;
  
    const hitRatePct =
      totalDarts > 0 ? (totalHits / totalDarts) * 100 : 0;
  
    const totalHitsForPct = totalS + totalD + totalT + bull + dBull;
  
    const pctS =
      totalHitsForPct > 0 ? (totalS / totalHitsForPct) * 100 : 0;
    const pctD =
      totalHitsForPct > 0 ? (totalD / totalHitsForPct) * 100 : 0;
    const pctT =
      totalHitsForPct > 0 ? (totalT / totalHitsForPct) * 100 : 0;
  
    // Sparklines triées chronologiquement (du plus ancien au plus récent)
    sparkAvg3.sort((a, b) => a.date - b.date);
    sparkDarts.sort((a, b) => a.date - b.date);
  
    return {
      sessions,
      countSessions: sessions.length,
      totalDarts,
      totalHits,
      avg3Global,
      bestVisit,
      bestCheckout,
      hitRatePct,
      pctS,
      pctD,
      pctT,
      miss,
      bull,
      dBull,
      bust,
      bySegment,
      bySegmentS,
      bySegmentD,
      bySegmentT,
      sparkAvg3,
      sparkDarts,
    };
  }