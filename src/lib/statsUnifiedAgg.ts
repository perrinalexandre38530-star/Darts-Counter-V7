// =============================================================
// src/lib/statsUnifiedAgg.ts
// PHASE 2 — Agrégateurs unifiés (basés sur NormalizedMatch)
// ✅ Dashboard player (avg3, bestVisit, bestCO, winRate, evolution, buckets, sessionsByMode)
// ✅ FIX: X01 V3 n'enregistre pas toujours payload.visits -> fallback depuis raw.summary
// =============================================================

import type { NormalizedMatch } from "./statsNormalized";


// =============================================================
// Unified stats helpers (payload.stats)
// - Allows dashboards to use the new lightweight payload.stats block
//   for non-X01 modes (Golf/Cricket/Killer/Shanghai/Batard/etc.)
// =============================================================
function getUnifiedStatsPlayers(raw: any): any[] {
  const ps = raw?.payload?.stats?.players;
  return Array.isArray(ps) ? ps : [];
}

function findUnifiedPlayer(raw: any, playerId: string): any | null {
  const pid = String(playerId || "");
  if (!pid) return null;
  const ps = getUnifiedStatsPlayers(raw);
  for (const p of ps) {
    const id = String(p?.id ?? p?.profileId ?? "");
    if (id && id === pid) return p;
  }
  // fallback: sometimes NormalizedPlayer.playerId != profileId; try matching by profileId
  for (const p of ps) {
    const id = String(p?.profileId ?? "");
    if (id && id === pid) return p;
  }
  return null;
}

function readUnifiedAvg3(raw: any, playerId: string): number {
  const p = findUnifiedPlayer(raw, playerId);
  const a = p?.averages?.avg3d ?? p?.avg3d ?? null;
  const n = Number(a);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readUnifiedBestVisit(raw: any, playerId: string): number {
  const p = findUnifiedPlayer(raw, playerId);
  const v = p?.special?.bestVisit ?? p?.bestVisit ?? null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

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

function isX01Mode(mode: string): boolean {
  const m = String(mode || '').toLowerCase();
  return m === 'x01' || m.startsWith('x01') || m.includes('x01');
}


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
  const sum: any = rec?.summary || rec?.payload?.summary || rec?.payload?.stats?.summary || {};

  const pid = String(playerId);

  // A) summary.players map (shape X01PlayV3)
  const sp = sum?.players?.[pid] || sum?.players?.[String(pid)] || null;

  const avg3 =
    N(sp?.avg3, NaN) ||
    N(sum?.avg3ByPlayer?.[pid], NaN) ||
    N(sum?.perPlayer?.find?.((x: any) => String(x?.playerId) === pid)?.avg3, NaN) ||
    N(sum?.avg3dByPlayer?.[pid], NaN) ||
    N(sum?.avg3d_by_player?.[pid], NaN) ||
    N(sum?.playersAvg3?.[pid], NaN) ||
    N(rec?.payload?.stats?.players?.find?.((x: any) => String(x?.id ?? x?.profileId) === pid)?.averages?.avg3d, NaN);

  const visits =
    N(sp?.visits, NaN) ||
    N(sum?.legacy?.visits?.[pid], NaN) ||
    N(sum?.legacy?.visits?.[String(pid)], NaN) ||
    N(rec?.payload?.stats?.players?.find?.((x: any) => String(x?.id ?? x?.profileId) === pid)?.special?.visits, NaN) ||
    N(rec?.payload?.stats?.players?.find?.((x: any) => String(x?.id ?? x?.profileId) === pid)?.visits, NaN);

  const bestVisit =
    N(sp?.bestVisit, NaN) ||
    N(sum?.bestVisitByPlayer?.[pid], NaN) ||
    N(sum?.perPlayer?.find?.((x: any) => String(x?.playerId) === pid)?.bestVisit, NaN) ||
    N(rec?.payload?.stats?.players?.find?.((x: any) => String(x?.id ?? x?.profileId) === pid)?.special?.bestVisit, NaN) ||
    N(rec?.payload?.stats?.players?.find?.((x: any) => String(x?.id ?? x?.profileId) === pid)?.bestVisit, NaN);

  const bestCheckout =
    N(sp?.bestCheckout, NaN) ||
    N(sum?.bestCheckoutByPlayer?.[pid], NaN) ||
    N(sum?.perPlayer?.find?.((x: any) => String(x?.playerId) === pid)?.bestCheckout, NaN) ||
    N(rec?.payload?.stats?.players?.find?.((x: any) => String(x?.id ?? x?.profileId) === pid)?.special?.bestCheckout, NaN) ||
    N(rec?.payload?.stats?.players?.find?.((x: any) => String(x?.id ?? x?.profileId) === pid)?.bestCheckout, NaN);

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


// Non-X01 (unified payload.stats) — avg3d per match (simple mean)
let totalUnifiedAvg3 = 0;
let totalUnifiedMatchesWithAvg3 = 0;

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
    if (isX01Mode(m.mode)) {
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
    } else {
      // Non-X01 modes: use unified payload.stats if present (lightweight block)
      const raw = (m as any)?.raw;
      const ua3 = readUnifiedAvg3(raw, playerId);
      if (ua3 > 0) {
        totalUnifiedAvg3 += ua3;
        totalUnifiedMatchesWithAvg3 += 1;
        evolution.push({ date: safeDate(m.date || Date.now()), avg3: fmt1(ua3) });
      }
      const ubv = readUnifiedBestVisit(raw, playerId);
      if (ubv > bestVisit) bestVisit = ubv;
    }
  }

  const avg3Overall = totalX01Visits ? totalX01VisitScore / totalX01Visits : totalUnifiedMatchesWithAvg3 ? totalUnifiedAvg3 / totalUnifiedMatchesWithAvg3 : 0;
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