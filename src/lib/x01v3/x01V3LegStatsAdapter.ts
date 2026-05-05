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


function parseVisitDart(raw: any): { segment: number; multiplier: 0 | 1 | 2 | 3 } {
  const label = String(raw?.label ?? raw?.segmentLabel ?? raw?.dart ?? raw?.hit ?? raw?.code ?? raw?.text ?? raw?.name ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  let segment = Number.NaN;
  let multiplier = Number(raw?.multiplier ?? raw?.mult ?? raw?.m ?? raw?.coef ?? raw?.factor);
  if (label) {
    if (label === "MISS" || label === "M" || label === "0") { segment = 0; multiplier = 0; }
    else if (label === "BULL" || label === "SBULL" || label === "OB") { segment = 25; multiplier = 1; }
    else if (label === "DBULL" || label === "D-BULL" || label === "DOUBLEBULL" || label === "IB") { segment = 25; multiplier = 2; }
    else {
      const m = label.match(/^([SDT])?(\d{1,2})$/);
      if (m) { segment = Number(m[2]); multiplier = m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1; }
    }
  }
  if (!Number.isFinite(segment)) segment = Number(raw?.segment ?? raw?.v ?? raw?.target ?? raw?.number ?? raw?.n ?? 0);
  if (!Number.isFinite(segment) || segment < 0 || segment > 25) segment = 0;
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    if (label.startsWith("T")) multiplier = 3;
    else if (label.startsWith("D") && label !== "DBULL") multiplier = 2;
    else multiplier = segment > 0 ? 1 : 0;
  }
  if (segment === 25 && multiplier > 2) multiplier = 2;
  if (![0, 1, 2, 3].includes(multiplier)) multiplier = segment > 0 ? 1 : 0;
  return { segment, multiplier: multiplier as 0 | 1 | 2 | 3 };
}

function derivePerPlayerFromVisitHistory(rawVisits: any[], playerIds: string[], startScore: number): Record<string, any> {
  const out: Record<string, any> = {};
  const ensure = (pid: string) => out[pid] || (out[pid] = {
    darts: 0, points: 0, visits: 0, avg3d: 0, avg3: 0, bestVisit: 0,
    h60: 0, h100: 0, h140: 0, h180: 0,
    singles: 0, misses: 0, busts: 0,
    doubles: 0, triples: 0, bulls: 0, bullsEye: 0, dBull: 0, dbulls: 0,
    singleRate: 0, missRate: 0, bustRate: 0,
    doubleRate: 0, tripleRate: 0, bullRate: 0, bullEyeRate: 0,
    bestCheckout: 0, coHits: 0, coAtt: 0, coPct: 0,
    dartsThrown: 0, remaining: startScore,
    buckets: { "0-59": 0, "60-99": 0, "100+": 0, "140+": 0, "180": 0 },
    bins: { "0-59": 0, "60-99": 0, "100+": 0, "140+": 0, "180": 0 },
    segments: {},
  });
  playerIds.forEach(ensure);

  for (const visit of rawVisits || []) {
    const pid = String(visit?.playerId ?? visit?.pid ?? "");
    if (!pid) continue;
    const m = ensure(pid);
    const darts = Array.isArray(visit?.darts) ? visit.darts : [];
    m.visits += 1;
    m.darts += darts.length;
    m.dartsThrown = m.darts;
    const isBustVisit = !!(visit?.bust || visit?.isBust);
    for (let dartIdx = 0; dartIdx < darts.length; dartIdx += 1) {
      const d = darts[dartIdx];
      const parsed = parseVisitDart(d);
      const seg = parsed.segment;
      const mult = parsed.multiplier;
      const isBustDart = isBustVisit && dartIdx === darts.length - 1;
      if (isBustDart) continue;
      if (!seg || mult <= 0) { m.misses += 1; continue; }
      if (seg === 25 && mult >= 2) { m.bullsEye += 1; m.dBull += 1; m.dbulls += 1; }
      else if (seg === 25) m.bulls += 1;
      else {
        const cur = m.segments[String(seg)] || { S: 0, D: 0, T: 0 };
        if (mult >= 3) { m.triples += 1; cur.T += 1; }
        else if (mult === 2) { m.doubles += 1; cur.D += 1; }
        else { m.singles += 1; cur.S += 1; }
        m.segments[String(seg)] = cur;
      }
    }
    const before = Number(visit?.scoreBefore ?? visit?.before ?? 0) || 0;
    const after = Number(visit?.scoreAfter ?? visit?.after ?? 0) || 0;
    const bust = !!(visit?.bust || visit?.isBust);
    const finish = !!(visit?.finish || visit?.isFinish) || (!bust && after === 0 && before > 0);
    const score = bust ? 0 : Math.max(0, Number(visit?.score ?? (before - after)) || 0);
    m.points += score;
    m.bestVisit = Math.max(m.bestVisit, score);
    m.remaining = after;
    if (score >= 180) m.h180 += 1;
    else if (score >= 140) m.h140 += 1;
    else if (score >= 100) m.h100 += 1;
    else if (score >= 60) m.h60 += 1;
    if (before > 1 && before <= 170) m.coAtt += 1;
    if (bust) m.busts += 1;
    if (finish) {
      m.bestCheckout = Math.max(m.bestCheckout, score);
      m.coHits += 1;
      m.checkoutDarts = darts.length;
      m.avgCheckoutDarts = darts.length;
      m.dartsCheckout = darts.length;
      if (m.coAtt <= 0) m.coAtt = 1;
    }
  }
  for (const pid of Object.keys(out)) {
    const m = out[pid];
    m.avg3d = m.darts > 0 ? +(((m.points / m.darts) * 3).toFixed(2)) : 0;
    m.avg3 = m.avg3d;
    m.singleRate = m.darts ? (m.singles / m.darts) * 100 : 0;
    m.missRate = m.darts ? (m.misses / m.darts) * 100 : 0;
    m.bustRate = m.darts ? (m.busts / m.darts) * 100 : 0;
    m.doubleRate = m.darts ? (m.doubles / m.darts) * 100 : 0;
    m.tripleRate = m.darts ? (m.triples / m.darts) * 100 : 0;
    m.bullRate = m.darts ? (m.bulls / m.darts) * 100 : 0;
    m.bullEyeRate = m.darts ? (m.bullsEye / m.darts) * 100 : 0;
    m.coPct = m.coAtt ? (m.coHits / m.coAtt) * 100 : 0;
    const sixtyTo99 = Math.max(0, m.h60);
    m.buckets = { "0-59": Math.max(0, m.visits - m.h60 - m.h100 - m.h140 - m.h180), "60-99": sixtyTo99, "60+": sixtyTo99, "100+": m.h100, "140+": m.h140, "180": m.h180 };
    m.bins = m.buckets;
  }
  return out;
}

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
    // live.totalScore est souvent absent dans X01PlayV3. La source fiable
    // pour une manche finie est startScore - score restant.
    const remainingNow = Number(scores?.[pid]);
    const pointsFromScore = Number.isFinite(remainingNow)
      ? Math.max(0, startScore - remainingNow)
      : 0;
    const points = Number(live.totalScore ?? live.pointsScored ?? live.points ?? pointsFromScore) || pointsFromScore;
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
      remaining: Number.isFinite(remainingNow) ? remainingNow : Math.max(0, startScore - points),
    };
  }

  const replayVisits = Array.isArray(summary?.visitHistory)
    ? summary.visitHistory
    : Array.isArray(summary?.visitsHistory)
    ? summary.visitsHistory
    : Array.isArray(summary?.__legStats?.visits)
    ? summary.__legStats.visits
    : [];
  if (replayVisits.length) {
    const replayPerPlayer = derivePerPlayerFromVisitHistory(replayVisits, playerIds, startScore);
    for (const pid of Object.keys(replayPerPlayer)) {
      perPlayer[pid] = { ...(perPlayer[pid] || {}), ...replayPerPlayer[pid] };
    }
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
