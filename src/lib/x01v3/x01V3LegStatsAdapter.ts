// =============================================================
// src/lib/x01v3/x01V3LegStatsAdapter.ts
// Pont X01 V3 (moteur + liveStats) -> LegStats (EndOfLegOverlay)
// =============================================================

import type {
    X01ConfigV3,
    X01MatchStateV3,
    X01PlayerId,
    X01StatsLiveV3,
  } from "../../types/x01v3";
  import type { LegStats } from "../stats";
  
  /**
   * Construit un LegStats "global match" à partir du moteur V3
   * pour l'overlay EndOfLegOverlay.
   *
   * - darts / points / visits / avg3d / bestVisit
   * - 60+ / 100+ / 140+ / 180 via scorePerVisit
   * - doubles / triples / bulls / bullsEye + % associés
   * - buckets + bins (alias) pour 0-59 / 60-99 / 100+ / 140+ / 180
   * - remaining = score restant actuel (scores[pid])
   */
  export function buildLegStatsFromV3LiveForOverlay(
    config: X01ConfigV3,
    state: X01MatchStateV3,
    liveStatsByPlayer: Record<X01PlayerId, X01StatsLiveV3>,
    scores: Record<X01PlayerId, number>,
    summary?: any
  ): LegStats {
    const playerIds: string[] = (config.players ?? []).map((p: any) => p.id as string);
    const startScore = (config as any).startScore ?? 501;
  
    const perPlayer: Record<string, any> = {};
  
    for (const pid of playerIds) {
      const live = liveStatsByPlayer?.[pid];
  
      if (!live) {
        perPlayer[pid] = {
          darts: 0,
          points: 0,
          visits: 0,
          avg3d: 0,
          bestVisit: 0,
          h60: 0,
          h100: 0,
          h140: 0,
          h180: 0,
          doubles: 0,
          triples: 0,
          bulls: 0,
          bullsEye: 0,
          doubleRate: 0,
          tripleRate: 0,
          bullRate: 0,
          bullEyeRate: 0,
          bestCheckout: 0,
          coHits: 0,
          coAtt: 0,
          coPct: 0,
          avg3: 0,
          dartsThrown: 0,
          buckets: {
            "0-59": 0,
            "60-99": 0,
            "100+": 0,
            "140+": 0,
            "180": 0,
          },
          bins: {
            "0-59": 0,
            "60-99": 0,
            "100+": 0,
            "140+": 0,
            "180": 0,
          },
          remaining: scores[pid] ?? startScore,
        };
        continue;
      }
  
      const darts = live.dartsThrown ?? 0;
      const points = live.totalScore ?? 0;
      const visits = live.visits ?? (darts ? Math.ceil(darts / 3) : 0);
      const bestVisit = live.bestVisit ?? 0;
  
      // ---- Power scoring (60+ / 100+ / 140+ / 180) depuis scorePerVisit ----
      const scorePerVisit = live.scorePerVisit ?? [];
      let h60 = 0,
        h100 = 0,
        h140 = 0,
        h180 = 0;
  
      for (const v of scorePerVisit) {
        if (v >= 60) h60++;
        if (v >= 100) h100++;
        if (v >= 140) h140++;
        if (v === 180) h180++;
      }
  
      const sixtyTo99 = Math.max(0, h60 - h100);
      const hundredPlus = Math.max(0, h100 - h140 - h180);
      const oneFortyPlus = h140;
      const oneEighty = h180;
      const known = sixtyTo99 + hundredPlus + oneFortyPlus + oneEighty;
      const zeroTo59 = Math.max(0, visits - known);
  
      const buckets = {
        "0-59": zeroTo59,
        "60-99": sixtyTo99,
        "100+": hundredPlus,
        "140+": oneFortyPlus,
        "180": oneEighty,
      };
  
      // ---- Impacts doubles / triples / bulls ----
      const doublesHits = live.hitsDouble ?? 0;
      const triplesHits = live.hitsTriple ?? 0;
      const bulls = live.hits?.Bull ?? 0;
      const bullsEye = live.hits?.DBull ?? 0;
  
      const doubleRate = darts ? (doublesHits / darts) * 100 : 0;
      const tripleRate = darts ? (triplesHits / darts) * 100 : 0;
      const bullRate = darts ? (bulls / darts) * 100 : 0;
      const bullEyeRate = darts ? (bullsEye / darts) * 100 : 0;
  
      const avg3d = darts ? +(((points / darts) * 3).toFixed(2)) : 0;
  
      // ---- Segments pour le radar / tableau ----
      const segments: Record<string, { S: number; D: number; T: number }> = {};
      const hitsBySegment = (live.hitsBySegment as any) ?? (live.bySegment as any) ?? {};
      for (const key in hitsBySegment) {
        const st = hitsBySegment[key] || {};
        segments[String(key)] = {
          S: st.S || 0,
          D: st.D || 0,
          T: st.T || 0,
        };
      }
  
      // ---- Checkouts (si dispo dans summary.bestCheckoutByPlayer) ----
      const bestCheckoutByPlayer =
        summary?.bestCheckoutByPlayer && typeof summary.bestCheckoutByPlayer === "object"
          ? summary.bestCheckoutByPlayer
          : {};
      const bestCheckout = bestCheckoutByPlayer[pid] ?? 0;
  
      perPlayer[pid] = {
        // Volumes
        darts,
        points,
        visits,
        avg3d,
        bestVisit,
  
        // Power scoring
        h60,
        h100,
        h140,
        h180,
  
        // Impacts
        doubles: doublesHits,
        triples: triplesHits,
        bulls,
        bullsEye,
        doubleRate,
        tripleRate,
        bullRate,
        bullEyeRate,
  
        // Checkouts
        bestCheckout: bestCheckout || undefined,
        coHits: undefined,
        coAtt: undefined,
        coPct: 0,
  
        // Alias / compléments attendus par EndOfLegOverlay
        avg3: avg3d,
        dartsThrown: darts,
        buckets,
        bins: buckets, // ✅ pour powerBucketsFromNew
        remaining: scores[pid] ?? Math.max(0, startScore - points),
      };
    }
  
    const legNo = (state as any).currentLeg ?? 1;
    const winnerIdFromScores =
      Object.keys(scores || {}).find((id) => (scores as any)[id] === 0) ?? null;
    const winnerId =
      (state as any).lastWinnerId ??
      (summary?.winnerId ?? winnerIdFromScores ?? null);
  
    return {
      legNo,
      players: playerIds,
      winnerId,
      finishedAt: Date.now(),
      perPlayer,
    };
  }
  