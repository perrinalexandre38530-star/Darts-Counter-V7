// ============================================
// src/lib/playerStats.ts
// Micro-store compatible pour Accueil/Profils/Stats (fallback LS) + builder de résumé X01
// expose: commitMatchSummary(summary), buildX01Summary({ kind, winnerId, perPlayer:[{playerId,name,avg3,bestVisit,bestCheckout,darts,win,buckets?}] })
// À chaque commit -> persiste (LS) + émet 'stats:updated' (les pages se rafraîchissent)
// ============================================

const LS_KEY = "dc-player-stats-v1";

type PerPlayerIn = {
  playerId: string;
  name?: string;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  darts: number;
  win?: boolean;
  buckets?: Record<string, number>;
};

type SummaryIn = {
  kind: "x01" | string;
  winnerId: string | null;
  perPlayer?: PerPlayerIn[];
};

type Quick = {
  id: string;
  name?: string;
  matches: number;
  wins: number;
  darts: number;
  avg3: number;        // moyenne 3D cumulée (pondérée par darts)
  bestVisit: number;
  bestCheckout: number;
  updatedAt: number;
  // buckets: conservé brut si présent (best sur les 2 derniers merge)
  buckets?: Record<string, number>;
};

type LSShape = Record<string, Quick>;

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

function readLS(): LSShape {
  try {
    const txt = localStorage.getItem(LS_KEY);
    if (!txt) return {};
    return JSON.parse(txt) as LSShape;
  } catch {
    return {};
  }
}
function writeLS(data: LSShape) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

function mergeQuick(prev: Quick | undefined, add: PerPlayerIn): Quick {
  if (!prev) {
    const darts = N(add.darts, 0);
    const matches = 1;
    const wins = add.win ? 1 : 0;
    return {
      id: add.playerId,
      name: add.name,
      matches,
      wins,
      darts,
      avg3: darts > 0 ? N(add.avg3, 0) : 0,
      bestVisit: N(add.bestVisit, 0),
      bestCheckout: N(add.bestCheckout, 0),
      updatedAt: Date.now(),
      buckets: add.buckets && Object.keys(add.buckets).length ? add.buckets : undefined,
    };
  }
  const darts = N(prev.darts, 0) + N(add.darts, 0);
  const matches = prev.matches + 1;
  const wins = prev.wins + (add.win ? 1 : 0);

  // moyenne pondérée: (avg_prev*(d_prev/3) + avg_add*(d_add/3)) / ((d_prev+d_add)/3)
  const vPrev = (N(prev.avg3, 0) / 3) * N(prev.darts, 0);
  const vAdd = (N(add.avg3, 0) / 3) * N(add.darts, 0);
  const avg3 =
    darts > 0 ? Math.round(((vPrev + vAdd) / darts) * 3 * 100) / 100 : prev.avg3;

  return {
    id: prev.id,
    name: add.name || prev.name,
    matches,
    wins,
    darts,
    avg3,
    bestVisit: Math.max(N(prev.bestVisit, 0), N(add.bestVisit, 0)),
    bestCheckout: Math.max(N(prev.bestCheckout, 0), N(add.bestCheckout, 0)),
    updatedAt: Date.now(),
    buckets: add.buckets && Object.keys(add.buckets).length ? add.buckets : prev.buckets,
  };
}

/** Commit d'un résumé de match (profil rapide/accueil/stats) */
export function commitMatchSummary(summary: SummaryIn) {
  if (!summary?.perPlayer?.length) return;
  const ls = readLS();

  for (const p of summary.perPlayer!) {
    const prev = ls[p.playerId];
    ls[p.playerId] = mergeQuick(prev, p);
  }

  writeLS(ls);

  try {
    window.dispatchEvent(new CustomEvent("stats:updated"));
  } catch {}
}

/** Builder de résumé X01 depuis des perPlayer calculés */
export function buildX01Summary({
  kind,
  winnerId,
  perPlayer,
}: {
  kind: "x01";
  winnerId: string | null;
  perPlayer?: Array<{
    playerId: string;
    name?: string;
    avg3?: number;
    bestVisit?: number;
    bestCheckout?: number;
    darts?: number;
    win?: boolean;
    buckets?: Record<string, number>;
  }>;
}): SummaryIn {
  return {
    kind,
    winnerId: winnerId ?? null,
    perPlayer:
      (perPlayer || []).map((pp) => ({
        playerId: pp.playerId,
        name: pp.name,
        avg3: N(pp.avg3, 0),
        bestVisit: N(pp.bestVisit, 0),
        bestCheckout: N(pp.bestCheckout, 0),
        darts: N(pp.darts, 0),
        win: !!pp.win,
        buckets: pp.buckets && Object.keys(pp.buckets).length ? pp.buckets : undefined,
      })) || [],
  };
}

// Optionnel: petit helper de lecture côté UI (si tu veux)
export function getQuickFromLS(playerId: string) {
  const ls = readLS();
  return ls[playerId] || null;
}
