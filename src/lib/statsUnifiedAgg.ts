// =============================================================
// src/lib/statsUnifiedAgg.ts
// PHASE 2 — Agrégateurs unifiés (basés sur NormalizedMatch)
// ✅ Dashboard player (avg3, bestVisit, bestCO, winRate, evolution, buckets, sessionsByMode)
// ✅ FIX: X01 V3 n'enregistre pas toujours payload.visits -> fallback depuis raw.summary
// =============================================================

import type { NormalizedMatch } from "./statsNormalized";

type VisitBucket = "0-59" | "60-99" | "100+" | "140+" | "180";
type PlayerDistribution = Record<VisitBucket, number>;

export type UnifiedPlayerDashboardStats = {
  playerId: string;
  playerName: string;
  avg3Overall: number;
  bestVisit: number;
  winRatePct: number;
  bestCheckout?: number;
  evolution: Array<{ date: string; avg3: number }>;
  distribution: PlayerDistribution;
  sessionsByMode?: Record<string, number>;
};

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const fmt1 = (x: number) => Math.round(x * 10) / 10;

function bucketForVisit(score: number): VisitBucket {
  if (score >= 180) return "180";
  if (score >= 140) return "140+";
  if (score >= 100) return "100+";
  if (score >= 60) return "60-99";
  return "0-59";
}

function safeDate(ts: number) {
  try {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}/${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

/**
 * 🔥 Fallback X01 quand m.visits est vide (cas X01 V3 actuel)
 * On lit les stats déjà sauvegardées dans summary :
 * - summary.players[pid].avg3
 * - summary.players[pid].visits
 * - summary.players[pid].bestVisit / bestCheckout
 * ou maps : avg3ByPlayer / bestVisitByPlayer / bestCheckoutByPlayer
 */
function readX01SummaryFallback(m: NormalizedMatch, playerId: string) {
  const rec: any = (m as any)?.raw || {};
  const sum: any = rec?.summary || {};

  const pid = String(playerId);

  // A) summary.players map (shape X01PlayV3)
  const sp = sum?.players?.[pid] || sum?.players?.[String(pid)] || null;

  const avg3 =
    N(sp?.avg3, NaN) ||
    N(sum?.avg3ByPlayer?.[pid], NaN) ||
    N(sum?.perPlayer?.find?.((x: any) => String(x?.playerId) === pid)?.avg3, NaN);

  const visits =
    N(sp?.visits, NaN) ||
    N(sum?.legacy?.visits?.[pid], NaN) ||
    N(sum?.legacy?.visits?.[String(pid)], NaN);

  const bestVisit =
    N(sp?.bestVisit, NaN) ||
    N(sum?.bestVisitByPlayer?.[pid], NaN) ||
    N(sum?.perPlayer?.find?.((x: any) => String(x?.playerId) === pid)?.bestVisit, NaN);

  const bestCheckout =
    N(sp?.bestCheckout, NaN) ||
    N(sum?.bestCheckoutByPlayer?.[pid], NaN) ||
    N(sum?.perPlayer?.find?.((x: any) => String(x?.playerId) === pid)?.bestCheckout, NaN);

  return {
    has: Number.isFinite(avg3) || Number.isFinite(bestVisit) || Number.isFinite(bestCheckout),
    avg3: Number.isFinite(avg3) ? avg3 : 0,
    visits: Number.isFinite(visits) ? visits : 0,
    bestVisit: Number.isFinite(bestVisit) ? bestVisit : 0,
    bestCheckout: Number.isFinite(bestCheckout) ? bestCheckout : 0,
  };
}

export function buildDashboardFromNormalized(
  playerId: string,
  playerName: string,
  matches: NormalizedMatch[]
): UnifiedPlayerDashboardStats {
  const dist: PlayerDistribution = {
    "0-59": 0,
    "60-99": 0,
    "100+": 0,
    "140+": 0,
    "180": 0,
  };

  const sessionsByMode: Record<string, number> = {};
  let totalX01VisitScore = 0; // somme des scores de visits (ou avg3 * visits)
  let totalX01Visits = 0;

  let bestVisit = 0;
  let bestCheckout = 0;

  let matchesPlayed = 0;
  let wins = 0;

  const evolution: Array<{ date: string; avg3: number }> = [];

  for (const m of matches || []) {
    const playersIn = (m.players || []).some((p) => String(p.playerId) === String(playerId));
    if (!playersIn) continue;

    matchesPlayed += 1;
    sessionsByMode[m.mode || "unknown"] = (sessionsByMode[m.mode || "unknown"] || 0) + 1;

    if ((m.winnerIds || []).some((w) => String(w) === String(playerId))) {
      wins += 1;
    }

    // X01 : visits OU fallback summary
    if (m.mode === "x01") {
      const myVisits = (m.visits || []).filter((v) => String(v.playerId) === String(playerId));

      if (myVisits.length) {
        // ✅ cas idéal : on a les visits détaillées
        let sum = 0;
        for (const v of myVisits) {
          const sc = N(v.score, 0);
          sum += sc;

          if (sc > bestVisit) bestVisit = sc;

          dist[bucketForVisit(sc)] += 1;

          if (v.isCheckout) {
            if (sc > bestCheckout) bestCheckout = sc;
          }
        }

        totalX01VisitScore += sum;
        totalX01Visits += myVisits.length;

        const matchAvg3 = myVisits.length ? sum / myVisits.length : 0;
        evolution.push({ date: safeDate(m.date || Date.now()), avg3: fmt1(matchAvg3) });
      } else {
        // ✅ fallback : X01 V3 => summary.players / avg3ByPlayer / legacy.visits
        const fb = readX01SummaryFallback(m, playerId);

        if (fb.has) {
          const vCount = Math.max(0, N(fb.visits, 0));
          const matchAvg3 = Math.max(0, N(fb.avg3, 0));

          // avg3 global pondéré par nb de visits (≈ “3 flèches”)
          if (vCount > 0 && matchAvg3 > 0) {
            totalX01VisitScore += matchAvg3 * vCount;
            totalX01Visits += vCount;

            // distribution (approx) : on met les visits dans le bucket correspondant à l'avg
            dist[bucketForVisit(matchAvg3)] += vCount;
          }

          if (fb.bestVisit > bestVisit) bestVisit = fb.bestVisit;
          if (fb.bestCheckout > bestCheckout) bestCheckout = fb.bestCheckout;

          evolution.push({ date: safeDate(m.date || Date.now()), avg3: fmt1(matchAvg3) });
        }
      }
    }
  }

  const avg3Overall = totalX01Visits ? totalX01VisitScore / totalX01Visits : 0;
  const winRatePct = matchesPlayed ? (wins / matchesPlayed) * 100 : 0;

  const evoSorted = evolution
    .map((e) => e)
    .sort((a, b) => {
      const pa = a.date.split("/").map((x) => Number(x));
      const pb = b.date.split("/").map((x) => Number(x));
      const ta = pa.length === 3 ? new Date(pa[2], pa[1] - 1, pa[0]).getTime() : 0;
      const tb = pb.length === 3 ? new Date(pb[2], pb[1] - 1, pb[0]).getTime() : 0;
      return ta - tb;
    });

  return {
    playerId,
    playerName,
    avg3Overall: fmt1(avg3Overall),
    bestVisit: N(bestVisit, 0),
    winRatePct: fmt1(winRatePct),
    bestCheckout: bestCheckout ? N(bestCheckout, 0) : undefined,
    evolution: evoSorted,
    distribution: dist,
    sessionsByMode,
  };
}
