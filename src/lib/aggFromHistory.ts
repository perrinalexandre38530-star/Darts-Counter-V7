// ============================================
// src/lib/aggFromHistory.ts
// Extraction robuste d'un SavedMatch -> { winnerId, perPlayer{ id, name, darts, points, avg3, bestVisit, bestCheckout, win } }
// Compatible payload "legs riches" ET maps legacy (avg3,darts,visits,bestVisit,bestCheckout,...)
// ============================================

import type { SavedMatch, PlayerLite } from "./history";

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

type PerPlayerOut = {
  id: string;
  name?: string;
  darts: number;
  points: number;
  avg3: number;          // points/dart*3 si darts>0 sinon 0 (moy 3 flèches)
  bestVisit: number;
  bestCheckout: number;
  win?: boolean;
};

export function extractAggFromSavedMatch(rec: SavedMatch & { players?: PlayerLite[] }) {
  const players = (rec.players || []) as PlayerLite[];

  // ---- 1) Chemin "legs riches"
  const legs: any[] = Array.isArray((rec as any)?.payload?.legs)
    ? (rec as any).payload.legs
    : [];

  const perById: Record<string, PerPlayerOut> = {};

  if (legs.length) {
    for (const leg of legs) {
      // leg.perPlayer peut être tableau [{playerId, points, darts, bestVisit, co{highestCO}}] OU map
      const list = Array.isArray(leg.perPlayer)
        ? leg.perPlayer
        : Object.values(leg.perPlayer || []);

      for (const p of list) {
        const pid = p.playerId || p.id || p.pid;
        if (!pid) continue;

        const cur = (perById[pid] ||= {
          id: pid,
          darts: 0,
          points: 0,
          avg3: 0,
          bestVisit: 0,
          bestCheckout: 0,
        });

        cur.darts += N(p.darts ?? p.dartsThrown, 0);
        cur.points += N(p.points ?? p.totalScored ?? p.pointsSum, 0);
        cur.bestVisit = Math.max(cur.bestVisit, N(p.bestVisit ?? p.best ?? p.maxVisit, 0));

        const co = p.co || {};
        const hi = N(co.highestCO ?? co.best ?? p.highestCheckout ?? p.bestCheckout, 0);
        cur.bestCheckout = Math.max(cur.bestCheckout, hi);
      }

      // gagnant
      const w = leg.winnerId || leg.winner?.id;
      if (w && perById[w]) perById[w].win = true;
    }

    for (const pid of Object.keys(perById)) {
      const pp = perById[pid];
      pp.avg3 = pp.darts > 0 ? Math.round(((pp.points / pp.darts) * 3) * 100) / 100 : 0;
      const pLite = players.find((x) => x.id === pid);
      if (pLite?.name) (pp as any).name = pLite.name;
    }

    return {
      winnerId: rec.winnerId ?? legs.find((l) => l.winnerId)?.winnerId ?? null,
      perPlayer: perById,
    };
  }

  // ---- 2) Chemin "maps legacy" (payload.avg3, payload.darts, payload.bestVisit, payload.bestCheckout, ...)
  const legacy = (rec as any).payload || {};
  const ids =
    players.map((p) => p.id) ||
    Object.keys(legacy.avg3 || legacy.darts || legacy.visits || {});

  for (const pid of ids) {
    const darts = N(legacy.darts?.[pid], 0);
    const points =
      N(legacy.pointsScored?.[pid], 0) ||
      (darts ? Math.round(((N(legacy.avg3?.[pid], 0) / 3) * darts) * 100) / 100 : 0);

    perById[pid] = {
      id: pid,
      name: players.find((p) => p.id === pid)?.name || "",
      darts,
      points,
      avg3: darts > 0 ? Math.round(((points / darts) * 3) * 100) / 100 : N(legacy.avg3?.[pid], 0),
      bestVisit: N(legacy.bestVisit?.[pid], 0),
      bestCheckout: N(legacy.bestCheckout?.[pid], 0),
      win: rec.winnerId ? rec.winnerId === pid : undefined,
    };
  }

  return {
    winnerId: rec.winnerId ?? null,
    perPlayer: perById,
  };
}
