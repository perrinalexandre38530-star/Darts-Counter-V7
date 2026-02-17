// ============================================
// src/lib/stats/computeX01Stats.ts
// Calcul stats X01 "rapide" (à partir des summaries + payload si besoin)
// - Ne fait PAS de gros parsing systématique
// - Retourne un objet stable consommable par StatsHub / rebuildStats
// ============================================

import { History, type SavedMatch } from "../history";

export type X01Agg = {
  kind: "x01";
  matches: number;
  legs: number;
  darts: number;
  avg3Global: number; // moyenne simple sur avg3ByPlayer (approx)
  avg3ByPlayer: Record<string, number>;
  checkoutAttempts: number;
  checkouts: number;
  checkoutPct: number;
  updatedAt: number;
};

function isX01(rec: any) {
  const k = String(rec?.kind ?? rec?.game?.mode ?? rec?.resume?.game?.mode ?? rec?.resume?.mode ?? rec?.payload?.mode ?? rec?.payload?.gameMode ?? "").toLowerCase();
  return k === "x01" || k.includes("x01");
}

function pickSummary(rec: any): any {
  return rec?.summary ?? rec?.payload?.summary ?? rec?.payload?.result?.summary ?? null;
}

function pickStats(rec: any): any {
  // si ton moteur met des stats détaillées dans payload.stats
  return rec?.payload?.stats ?? rec?.payload?.result?.stats ?? null;
}

export async function computeX01Stats(profileId?: string | null): Promise<X01Agg> {
  const pid = profileId ? String(profileId) : "";

  // ⚡ On part sur listFinished() (lite) puis on ne "get()" que si besoin
  const rows = await History.listFinished();

  let matches = 0;
  let legs = 0;
  let darts = 0;

  const sumAvg3ByPlayer: Record<string, number> = {};
  const cntAvg3ByPlayer: Record<string, number> = {};

  let checkoutAttempts = 0;
  let checkouts = 0;

  const now = Date.now();

  for (const r0 of rows as any[]) {
    if (!r0) continue;
    if (!isX01(r0)) continue;

    // filtre profil si fourni (si le match contient ce joueur)
    if (pid) {
      const players = (r0.players || r0.resume?.players || r0.payload?.players || r0.payload?.config?.players || []) as any[];
      const has = Array.isArray(players) && players.some((p) => String(p?.id) === pid);
      if (!has) continue;
    }

    matches++;

    // ✅ priorité summary (lite)
    const s = pickSummary(r0) || {};
    legs += Number(s?.legs ?? 0) || 0;
    darts += Number(s?.darts ?? 0) || 0;

    // avg3ByPlayer (si présent)
    const a = (s?.avg3ByPlayer ?? s?.avg3 ?? null) as any;
    if (a && typeof a === "object") {
      for (const [k, v] of Object.entries(a)) {
        const vv = Number(v) || 0;
        if (!sumAvg3ByPlayer[k]) sumAvg3ByPlayer[k] = 0;
        if (!cntAvg3ByPlayer[k]) cntAvg3ByPlayer[k] = 0;
        if (vv > 0) {
          sumAvg3ByPlayer[k] += vv;
          cntAvg3ByPlayer[k] += 1;
        }
      }
    }

    // checkout (si dispo via stats payload)
    const st = pickStats(r0);
    if (st && typeof st === "object") {
      // formats tolérés : st.checkoutAttempts / st.checkouts / st.co
      checkoutAttempts += Number(st.checkoutAttempts ?? st.attempts ?? 0) || 0;
      checkouts += Number(st.checkouts ?? st.success ?? st.co ?? 0) || 0;
      continue;
    }

    // sinon: on tente un get() uniquement si nécessaire (rare)
    // (mais on évite à tout prix de decompressor tout)
    // -> ici on ne fait rien (approx), c’est volontaire pour la perf.
  }

  const avg3ByPlayer: Record<string, number> = {};
  let sumGlobal = 0;
  let cntGlobal = 0;

  for (const k of Object.keys(sumAvg3ByPlayer)) {
    const c = cntAvg3ByPlayer[k] || 0;
    const v = c ? sumAvg3ByPlayer[k] / c : 0;
    avg3ByPlayer[k] = Number.isFinite(v) ? v : 0;
    if (v > 0) {
      sumGlobal += v;
      cntGlobal += 1;
    }
  }

  const avg3Global = cntGlobal ? sumGlobal / cntGlobal : 0;
  const checkoutPct = checkoutAttempts ? (checkouts / checkoutAttempts) * 100 : 0;

  return {
    kind: "x01",
    matches,
    legs,
    darts,
    avg3Global,
    avg3ByPlayer,
    checkoutAttempts,
    checkouts,
    checkoutPct,
    updatedAt: now,
  };
}
