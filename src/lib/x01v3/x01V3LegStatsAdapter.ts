// =============================================================
// src/lib/x01v3/x01V3LegStatsAdapter.ts
// Pont X01 V3 (moteur + liveStats) -> LegStats (EndOfLegOverlay)
// PATCH V16 : extraction robuste, plus de cartes résumé à 0
// =============================================================

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01PlayerId,
  X01StatsLiveV3,
} from "../../types/x01v3";
import type { LegStats } from "../stats";

function n(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null || v === "") continue;
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return 0;
}

function sumMap(map: any): number {
  if (!map || typeof map !== "object") return 0;
  return Object.values(map).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
}

function cloneSegmentMaps(live: any) {
  const byS: Record<string, number> = {};
  const byD: Record<string, number> = {};
  const byT: Record<string, number> = {};

  for (const [k, v] of Object.entries(live?.bySegmentS ?? live?.segmentsS ?? live?.hitsBySegmentS ?? {})) byS[String(k)] = n(v);
  for (const [k, v] of Object.entries(live?.bySegmentD ?? live?.segmentsD ?? live?.hitsBySegmentD ?? {})) byD[String(k)] = n(v);
  for (const [k, v] of Object.entries(live?.bySegmentT ?? live?.segmentsT ?? live?.hitsBySegmentT ?? {})) byT[String(k)] = n(v);

  const combinedSources = [live?.hitsBySegment, live?.bySegment, live?.segmentHits, live?.segmentsAll, live?.segments];
  for (const combined of combinedSources) {
    if (!combined || typeof combined !== "object") continue;
    for (const [seg, entry] of Object.entries(combined)) {
      if (!entry || typeof entry !== "object") continue;
      const e: any = entry;
      const s = n(e.S, e.s, e.single, e.singles, e.hitsS);
      const d = n(e.D, e.d, e.double, e.doubles, e.hitsD);
      const t = n(e.T, e.t, e.triple, e.triples, e.hitsT);
      if (s) byS[String(seg)] = Math.max(byS[String(seg)] || 0, s);
      if (d) byD[String(seg)] = Math.max(byD[String(seg)] || 0, d);
      if (t) byT[String(seg)] = Math.max(byT[String(seg)] || 0, t);
    }
  }
  return { byS, byD, byT };
}

function summaryRow(summary: any, pid: string): any {
  if (!summary || typeof summary !== "object") return {};
  if (summary?.detailedByPlayer?.[pid]) return summary.detailedByPlayer[pid];
  if (summary?.players?.[pid]) return summary.players[pid];
  if (Array.isArray(summary?.perPlayer)) {
    return summary.perPlayer.find((x: any) => String(x?.playerId ?? x?.profileId ?? x?.id ?? "") === String(pid)) || {};
  }
  return {};
}

function hitFromSummary(summary: any, pid: string, key: string): number {
  const r = summaryRow(summary, pid);
  const hits = r?.hits || r?.hitCounts || {};
  if (key === "S") return n(r.hitsS, r.hitsSingle, r.singles, hits.S, hits.s, hits.single, hits.singles);
  if (key === "D") return n(r.hitsD, r.hitsDouble, r.doubles, hits.D, hits.d, hits.double, hits.doubles);
  if (key === "T") return n(r.hitsT, r.hitsTriple, r.triples, hits.T, hits.t, hits.triple, hits.triples);
  if (key === "BULL") return n(r.hitsBull, r.bull, r.bulls, hits.BULL, hits.Bull, hits.bull, hits.bulls);
  if (key === "DBULL") return n(r.hitsDBull, r.hitsDbull, r.dBull, r.dbulls, r.doubleBull, hits.DBULL, hits.DBull, hits.dbull, hits.dbulls);
  if (key === "MISS") return n(r.misses, r.miss, hits.M, hits.MISS, hits.miss, hits.misses);
  return 0;
}

/**
 * Construit un LegStats "global match" à partir du moteur V3.
 * Source prioritaire pour les points : startScore - score restant.
 * Cela évite les résumés / cartes historique à 0 lorsque live.totalScore n'existe pas.
 */
export function buildLegStatsFromV3LiveForOverlay(
  config: X01ConfigV3,
  state: X01MatchStateV3,
  liveStatsByPlayer: Record<X01PlayerId, X01StatsLiveV3>,
  scores: Record<X01PlayerId, number>,
  summary?: any
): LegStats {
  const playerIds: string[] = (config.players ?? []).map((p: any) => String(p.id));
  const startScore = (config as any).startScore ?? 501;
  const perPlayer: Record<string, any> = {};

  for (const pid of playerIds) {
    const live: any = liveStatsByPlayer?.[pid] || {};
    const srow: any = summaryRow(summary, pid);
    const remaining = n(scores?.[pid], live.remaining, srow.remaining, startScore);
    const pointsFromScore = Math.max(0, startScore - remaining);

    const darts = n(
      live.dartsThrown,
      live.darts,
      live.totalDarts,
      srow.darts,
      srow.dartsThrown,
      srow.totalDarts,
      srow._sumDarts
    );
    const points = n(live.totalScore, live.pointsScored, live.points, srow.pointsScored, srow.points, srow._sumPoints, pointsFromScore);
    const visits = n(live.visits, srow.visits, srow._sumVisits, darts ? Math.ceil(darts / 3) : 0);
    const bestVisit = n(live.bestVisit, srow.bestVisit, summary?.bestVisitByPlayer?.[pid]);

    const scorePerVisit = Array.isArray(live.scorePerVisit)
      ? live.scorePerVisit
      : Array.isArray(live.visitsScores)
      ? live.visitsScores
      : Array.isArray(live.visitScores)
      ? live.visitScores
      : [];
    let h60 = 0;
    let h100 = 0;
    let h140 = 0;
    let h180 = 0;
    for (const v of scorePerVisit) {
      const score = Number(v) || 0;
      if (score >= 60) h60++;
      if (score >= 100) h100++;
      if (score >= 140) h140++;
      if (score === 180) h180++;
    }
    const buckets = {
      "0-59": Math.max(0, visits - Math.max(0, h60 - h100) - Math.max(0, h100 - h140 - h180) - h140 - h180),
      "60-99": Math.max(0, h60 - h100),
      "100+": Math.max(0, h100 - h140 - h180),
      "140+": h140,
      "180": h180,
    };

    const { byS, byD, byT } = cloneSegmentMaps(live);
    const singlesHits = n(live.hitsSingle, live.hitsSingles, live.singles, sumMap(byS), hitFromSummary(summary, pid, "S"));
    const doublesHits = n(live.hitsDouble, live.hitsDoubles, live.doubles, sumMap(byD), hitFromSummary(summary, pid, "D"));
    const triplesHits = n(live.hitsTriple, live.hitsTriples, live.triples, sumMap(byT), hitFromSummary(summary, pid, "T"));
    const bullHits = n(live.hits?.Bull, live.hits?.BULL, live.hitsBull, live.bull, live.bulls, hitFromSummary(summary, pid, "BULL"));
    const dbullHits = n(live.hits?.DBull, live.hits?.DBULL, live.hitsDBull, live.dBull, live.dbull, live.dbulls, hitFromSummary(summary, pid, "DBULL"));
    const missHits = n(live.hits?.MISS, live.hits?.M, live.misses, live.miss, hitFromSummary(summary, pid, "MISS"));

    const avg3d = darts ? +(((points / darts) * 3).toFixed(2)) : n(srow.avg3, summary?.avg3ByPlayer?.[pid], 0);
    const bestCheckout = n(summary?.bestCheckoutByPlayer?.[pid], srow.bestCheckoutScore, srow.bestCheckout, live.bestCheckout);

    const segments: Record<string, { S: number; D: number; T: number }> = {};
    for (const key of new Set([...Object.keys(byS), ...Object.keys(byD), ...Object.keys(byT)])) {
      segments[String(key)] = { S: byS[key] || 0, D: byD[key] || 0, T: byT[key] || 0 };
    }

    perPlayer[pid] = {
      darts,
      points,
      visits,
      avg3d,
      avg3: avg3d,
      bestVisit,
      h60,
      h100,
      h140,
      h180,
      singles: singlesHits,
      misses: missHits,
      doubles: doublesHits,
      triples: triplesHits,
      bulls: bullHits,
      bullsEye: dbullHits,
      hitsBull: bullHits,
      hitsDBull: dbullHits,
      doubleRate: darts ? (doublesHits / darts) * 100 : 0,
      tripleRate: darts ? (triplesHits / darts) * 100 : 0,
      bullRate: darts ? (bullHits / darts) * 100 : 0,
      bullEyeRate: darts ? (dbullHits / darts) * 100 : 0,
      bestCheckout: bestCheckout || undefined,
      coHits: bestCheckout > 0 ? 1 : undefined,
      coAtt: undefined,
      coPct: bestCheckout > 0 ? 100 : 0,
      dartsThrown: darts,
      bySegmentS: byS,
      bySegmentD: byD,
      bySegmentT: byT,
      segments,
      buckets,
      bins: buckets,
      remaining,
    };
  }

  const legNo = (state as any).currentLeg ?? 1;
  const winnerIdFromScores = Object.keys(scores || {}).find((id) => (scores as any)[id] === 0) ?? null;
  const winnerId = (state as any).lastWinnerId ?? (summary?.winnerId ?? winnerIdFromScores ?? null);

  return { legNo, players: playerIds, winnerId, finishedAt: Date.now(), perPlayer };
}
