// ============================================================
// x01MultiAgg.ts — Agrégation complète X01 Multi
// Reproduit EXACTEMENT la logique du TrainingX01Stats
// mais basée sur l'historique des matchs X01 multi (SavedMatch)
// ============================================================

import type { SavedMatch, PlayerLite } from "./types";

// Sécurité
const N = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// détecte si un match est X01
export function isX01Match(rec: SavedMatch): boolean {
  const k = (rec.kind || "").toLowerCase();
  return k.startsWith("x01");
}

// Extraction universelle d’une visite (score, bust, hits)
function extractVisits(rec: SavedMatch, pid: string) {
  // TrainingX01 utilise un format simple : {score, bust, segments:[{mult, value}] }
  // Ici on doit récupérer les data depuis payload.visits ou engineState
  const visits =
    (rec as any).payload?.visits ??
    (rec as any).engineState?.visits ??
    [];

  const arr: Array<{
    bust: boolean;
    score: number;
    segments: Array<{ value: number; mult: number }>;
  }> = [];

  for (const v of visits) {
    if (v.p !== pid) continue;

    const segs: any[] = Array.isArray(v.segments) ? v.segments : [];

    arr.push({
      bust: !!v.bust,
      score: Number(v.score) || 0,
      segments: segs.map((s) => ({
        value: Number(s.value) || 0,
        mult: Number(s.mult) || 1,
      })),
    });
  }

  return arr;
}

/**
 * Agrège toutes les statistiques comme dans TrainingX01 :
 * - hits S/D/T
 * - bull / dBull
 * - miss
 * - progression
 * - best visit
 * - best checkout
 * - total darts
 * - avg 3D
 * - %S / %D / %T
 * - %Miss
 * - utilisation par segment (1..20)
 */
export function computeX01MultiAgg(
  records: SavedMatch[],
  playerId: string,
  playerName?: string
) {
  const out = {
    sessions: 0,
    darts: 0,
    sumAvg3D: 0,
    bestVisit: 0,
    bestCheckout: 0,

    hitsSingle: 0,
    hitsDouble: 0,
    hitsTriple: 0,

    hitsBull: 0,
    hitsDBull: 0,
    miss: 0,

    // 1 à 20 → total hits
    byNumber: Array(21).fill(0),

    // progression (moy 3D par match)
    progression: [] as { avg3D: number; ts: number }[],
  };

  const set = new Set<string>();

  for (const rec of records) {
    if (!isX01Match(rec)) continue;
    if (rec.status && rec.status !== "finished") continue;

    if (rec.id && set.has(rec.id)) continue;
    if (rec.id) set.add(rec.id);

    const players = (rec.players || []) as PlayerLite[];

    const pname = (playerName || "").trim().toLowerCase();
    const matched =
      players.find((p) => p?.id === playerId) ||
      (pname ? players.find((p) => (p?.name || "").trim().toLowerCase() === pname) : undefined);

    if (!matched?.id) continue;
    const effectivePlayerId = matched.id;

    // ----- visites -----
    const visits = extractVisits(rec, effectivePlayerId);

    if (!visits.length) continue;

    out.sessions++;

    let darts = 0;
    let scored = 0;
    let bestVisit = 0;
    let bestCO = 0;

    for (const v of visits) {
      darts += v.segments.length;

      if (!v.bust) {
        scored += v.score;
        if (v.score > bestVisit) bestVisit = v.score;
      }

      // Checkout détecté : score == checkout ? dépend du moteur, mais on prend bestCO = bestVisit ici
      if (!v.bust && v.score > bestCO) {
        bestCO = v.score;
      }

      // décomposition segments
      for (const s of v.segments) {
        if (s.value === 25 && s.mult === 1) {
          out.hitsBull++;
        } else if (s.value === 25 && s.mult === 2) {
          out.hitsDBull++;
        } else if (s.value === 0) {
          out.miss++;
        } else {
          if (s.value >= 1 && s.value <= 20) {
            out.byNumber[s.value] += 1;
          }

          if (s.mult === 1) out.hitsSingle++;
          else if (s.mult === 2) out.hitsDouble++;
          else if (s.mult === 3) out.hitsTriple++;
        }
      }
    }

    out.darts += darts;
    const avg3 = darts > 0 ? (scored / darts) * 3 : 0;
    out.sumAvg3D += avg3;

    if (bestVisit > out.bestVisit) out.bestVisit = bestVisit;
    if (bestCO > out.bestCheckout) out.bestCheckout = bestCO;

    out.progression.push({
      avg3D: avg3,
      ts:
        rec.updatedAt ??
        rec.createdAt ??
        Date.now(),
    });
  }

  // tri progression
  out.progression.sort((a, b) => a.ts - b.ts);

  return out;
}
