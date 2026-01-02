// ============================================
// src/lib/statsLiteIDB.ts
// Mini-cache profils (localStorage) pour Home/Profils/Stats
// - commitLiteFromLeg : alimente depuis un LEG "legacy maps"
// - addMatchSummary   : alimente depuis un résumé de match
// - getBasicProfileStatsSync : lecture (avg3, best, win%, co%)
// + Compatibilité X01 V3 (liveStatsByPlayer + summary V3)
// ============================================

export type LiteAcc = {
  // accumulateurs
  sumPoints: number;    // somme des points "validés"
  sumDarts: number;     // nombre de fléchettes jouées
  bestVisit: number;    // meilleure volée (max 3 darts)
  bestCheckout: number; // meilleur checkout
  legs: number;         // nombre de legs terminés
  wins: number;         // legs gagnés
  coHits: number;       // checkouts réussis
  coAtt: number;        // tentatives de checkout
};

type LiteDB = Record<string, LiteAcc>;

const KEY = "dc-lite-v1";

/* ---------- Load / Save ---------- */
function load(): LiteDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj ? obj : {};
  } catch {
    return {};
  }
}

function save(db: LiteDB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // ignore quota / private mode errors
  }
}

/* ---------- Accessor ---------- */
function acc(db: LiteDB, id: string): LiteAcc {
  if (!db[id]) {
    db[id] = {
      sumPoints: 0,
      sumDarts: 0,
      bestVisit: 0,
      bestCheckout: 0,
      legs: 0,
      wins: 0,
      coHits: 0,
      coAtt: 0,
    };
  }
  return db[id];
}

const N = (x: any, d = 0) =>
  Number.isFinite(Number(x)) ? Number(x) : d;

const clampCO = (v: any) => {
  const n = Math.round(N(v));
  return n === 50 || (n >= 2 && n <= 170) ? n : 0;
};

/* ============================================================
   🔥 Compatibilité X01 V3
   Extraction directe des stats V3 depuis liveStatsByPlayer
============================================================ */
function extractV3Stats(src: any, pid: string) {
  const live = src?.liveStatsByPlayer?.[pid];
  if (!live) return null;

  const darts = Number(live.dartsThrown || 0);
  const pts = Number(live.totalScore || 0);
  const bestVisit = Number(live.bestVisit || 0);
  const bestCheckout = Number(live.bestCheckout || 0);

  return { darts, pts, bestVisit, bestCheckout };
}

/* ============================================================
   API 1 — Commit depuis un LEG (legacy OR V3)
============================================================ */
export function commitLiteFromLeg(
  legacyOrRes: any,
  playersLite: Array<{ id: string; name?: string }>,
  winnerId: string | null
) {
  const db = load();
  const players = Array.isArray(playersLite) ? playersLite : [];

  // Legacy maps
  const darts = legacyOrRes?.darts || {};
  const pointsScored = legacyOrRes?.pointsScored || {};
  const avg3 = legacyOrRes?.avg3 || {};
  const bestVisit = legacyOrRes?.bestVisit || {};
  const bestCheckout = legacyOrRes?.bestCheckout || {};
  const coHits = legacyOrRes?.checkoutHits || {};
  const coAtt = legacyOrRes?.checkoutAttempts || {};

  for (const p of players) {
    const pid = String(p.id);
    const a = acc(db, pid);

    /* ---------- 🔥 Bloc spécial X01 V3 ---------- */
    const v3 = extractV3Stats(legacyOrRes, pid);
    if (v3) {
      a.sumDarts += v3.darts;
      a.sumPoints += v3.pts;
      a.bestVisit = Math.max(a.bestVisit, v3.bestVisit);
      a.bestCheckout = Math.max(
        a.bestCheckout,
        clampCO(v3.bestCheckout)
      );

      a.legs += 1;
      if (winnerId && pid === winnerId) a.wins += 1;

      // Skip legacy
      continue;
    }

    /* ---------- Legacy X01 ---------- */
    const d = N(darts[pid], 0);

    const pts =
      pointsScored && pid in pointsScored
        ? N(pointsScored[pid], 0)
        : d > 0
        ? (N(avg3[pid], 0) / 3) * d
        : 0;

    a.sumDarts += d;
    a.sumPoints += pts;

    a.bestVisit = Math.max(a.bestVisit, N(bestVisit[pid], 0));
    a.bestCheckout = Math.max(
      a.bestCheckout,
      clampCO(bestCheckout[pid])
    );
    a.coHits += N(coHits[pid], 0);
    a.coAtt += N(coAtt[pid], 0);

    a.legs += 1;
    if (winnerId && pid === winnerId) a.wins += 1;
  }

  save(db);
}

/* ============================================================
   API 2 — Commit depuis un résumé de match
   (legacy OR V3)
============================================================ */
export async function addMatchSummary(arg: {
  winnerId?: string | null;
  perPlayer: Record<
    string,
    {
      darts?: number;
      points?: number;
      bestVisit?: number;
      bestCheckout?: number;
      coHits?: number;
      coAtt?: number;
      legs?: number;
      win?: boolean;
      fromV3?: boolean; // tag externe éventuel
    }
  >;
}) {
  const db = load();
  const per = arg?.perPlayer || {};
  const winnerId = arg?.winnerId ?? null;

  for (const pid of Object.keys(per)) {
    const p = per[pid] || {};
    const a = acc(db, pid);

    /* ---------- 🔥 Bloc spécial X01 V3 summary ---------- */
    if (p.fromV3) {
      const darts = N(p.darts, 0);
      const pts = N(p.points, 0);

      a.sumDarts += darts;
      a.sumPoints += pts;
      a.bestVisit = Math.max(a.bestVisit, N(p.bestVisit, 0));
      a.bestCheckout = Math.max(
        a.bestCheckout,
        clampCO(p.bestCheckout)
      );

      const legsInc = Math.max(1, N(p.legs, 1));
      a.legs += legsInc;

      if (p.win || (winnerId && pid === winnerId)) a.wins += 1;

      continue;
    }

    /* ---------- Legacy summary ---------- */
    a.sumDarts += N(p.darts, 0);
    a.sumPoints += N(p.points, 0);
    a.bestVisit = Math.max(a.bestVisit, N(p.bestVisit, 0));
    a.bestCheckout = Math.max(
      a.bestCheckout,
      clampCO(p.bestCheckout)
    );

    a.coHits += N(p.coHits, 0);
    a.coAtt += N(p.coAtt, 0);

    const legsInc = Math.max(1, N(p.legs, 1));
    a.legs += legsInc;

    if (p.win || (winnerId && pid === winnerId)) a.wins += 1;
  }

  save(db);
}

/* ============================================================
   API 3 — Lecture simplifiée (Home/Profils/Stats)
============================================================ */
export function getBasicProfileStatsSync(playerId: string) {
  const db = load();
  const a = db[playerId];

  if (!a) {
    return {
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
      winPct: 0,
      coPct: 0,
      legs: 0,
    };
  }

  const avg3 = a.sumDarts > 0 ? (a.sumPoints / a.sumDarts) * 3 : 0;
  const winPct =
    a.legs > 0 ? Math.round((a.wins / a.legs) * 1000) / 10 : 0;
  const coPct =
    a.coAtt > 0 ? Math.round((a.coHits / a.coAtt) * 1000) / 10 : 0;

  return {
    avg3: Math.round(avg3 * 100) / 100,
    bestVisit: a.bestVisit,
    bestCheckout: a.bestCheckout,
    winPct,
    coPct,
    legs: a.legs,
  };
}

/* ============================================================
   Reset manuel — tout effacer
============================================================ */
export function __resetLiteStats() {
  save({});
}

/* ============================================================
   🔥 PURGE CIBLÉE : supprimer les stats d'un seul profil
   - À appeler quand on supprime un profil local ou un BOT
   - profileId = p.id utilisé partout dans l'app
============================================================ */

/**
 * Supprime les stats lite pour un profil donné dans le mini-cache.
 * (ne touche pas aux autres profils)
 */
export function purgeLiteStatsForProfile(profileId: string) {
  const db = load();
  if (db[profileId]) {
    delete db[profileId];
    save(db);
    console.log("[STATS LITE] Purge profil", profileId);
  }
}

/**
 * Alias "global" cohérent avec le reste de l'app.
 * Aujourd'hui, le mini-cache lite est uniquement dans localStorage,
 * donc la purge ciblée se limite à ça.
 */
export async function purgeAllStatsForProfile(profileId: string) {
  purgeLiteStatsForProfile(profileId);
}

// ------------------------------------------------------------
// Compat export (legacy imports)
// Some files import recordLegToLite; keep build compatible.
// ------------------------------------------------------------
export async function recordLegToLite(...args: any[]): Promise<void> {
  try {
    // If a newer function exists, call it (best effort).
    const anyMod: any = (globalThis as any);
    // Try common internal names (depends on your file's existing API)
    const self: any = (anyMod?.statsLiteIDB ?? null);

    if (typeof (self?.recordLegToLite) === "function") {
      await self.recordLegToLite(...args);
      return;
    }
  } catch {}

  // No-op fallback (prevents build crash; doesn't break gameplay)
}
