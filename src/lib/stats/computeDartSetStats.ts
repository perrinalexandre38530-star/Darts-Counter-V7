// ============================================
// src/lib/stats/computeDartSetStats.ts
// Stats par set de fléchettes (approx rapide)
// - Supporte import legacy: computeDartSetsStats (pluriel)
// ============================================

import { History } from "../history";

export type DartSetAgg = {
  byDartSetId: Record<
    string,
    {
      matches: number;
      legs: number;
      avg3: number; // moyenne simple (si summary.avg3ByPlayer)
      updatedAt: number;
    }
  >;
  updatedAt: number;
};

function getDartSetIdsByPlayer(rec: any): Record<string, string> {
  const out: Record<string, string> = {};

  const metaMap = rec?.payload?.meta?.dartSetIdsByPlayer ?? rec?.resume?.meta?.dartSetIdsByPlayer ?? rec?.meta?.dartSetIdsByPlayer;
  if (metaMap && typeof metaMap === "object") {
    for (const [k, v] of Object.entries(metaMap)) {
      const ds = v ? String(v) : "";
      if (k && ds) out[String(k)] = ds;
    }
  }

  const statsPlayers = rec?.payload?.stats?.players;
  if (Array.isArray(statsPlayers)) {
    for (const p of statsPlayers) {
      const pid = p?.id ?? p?.profileId;
      const ds = p?.dartSetId ?? p?.favoriteDartSetId;
      if (pid && ds) out[String(pid)] = String(ds);
    }
  }

  const perPlayer =
    rec?.summary?.perPlayer ??
    rec?.payload?.summary?.perPlayer ??
    rec?.payload?.summary?.stats?.perPlayer ??
    null;
  if (Array.isArray(perPlayer)) {
    for (const p of perPlayer) {
      const pid = p?.id ?? p?.profileId;
      const ds = p?.dartSetId ?? p?.favoriteDartSetId;
      if (pid && ds) out[String(pid)] = String(ds);
    }
  }

  const players = (rec?.players || rec?.resume?.players || rec?.resume?.config?.players || rec?.payload?.players || rec?.payload?.config?.players || []) as any[];
  if (Array.isArray(players)) {
    for (const p of players) {
      const pid = p?.id ?? p?.profileId;
      const ds = p?.dartSetId ?? p?.favoriteDartSetId;
      if (pid && ds) out[String(pid)] = String(ds);
    }
  }

  const g =
    rec?.dartSetId ??
    rec?.payload?.dartSetId ??
    rec?.payload?.meta?.dartSetId ??
    rec?.meta?.dartSetId ??
    rec?.payload?.summary?.dartSetId ??
    rec?.summary?.dartSetId ??
    rec?.payload?.config?.dartSetId ??
    null;

  if (g) {
    const ds = String(g);
    if (!Object.keys(out).length) out["*"] = ds;
  }

  return out;
}

function getDartSetIdForMatch(rec: any): string | null {
  const m = getDartSetIdsByPlayer(rec);
  const vals = Object.values(m).filter(Boolean);
  const uniq = Array.from(new Set(vals));
  if (uniq.length === 1) return uniq[0];
  return null;
}

/** ✅ Export "singulier" */
export async function computeDartSetStats(profileId?: string | null): Promise<DartSetAgg> {
  const pid = profileId ? String(profileId) : "";
  const rows = await History.listFinished();

  const by: DartSetAgg["byDartSetId"] = {};

  for (const r0 of rows as any[]) {
    if (!r0) continue;

    if (pid) {
      const players = (r0.players || r0.payload?.players || []) as any[];
      const has = Array.isArray(players) && players.some((p) => String(p?.id) === pid);
      if (!has) continue;
    }

    const dsMap = getDartSetIdsByPlayer(r0);

    const dsid = pid ? (dsMap[pid] || null) : getDartSetIdForMatch(r0);
    if (!dsid) continue;

    if (!by[dsid]) by[dsid] = { matches: 0, legs: 0, avg3: 0, updatedAt: 0 };

    by[dsid].matches += 1;

    const s = r0?.summary ?? r0?.payload?.summary ?? null;
    by[dsid].legs += Number(s?.legs ?? 0) || 0;

    // avg3 approx : moyenne de avg3ByPlayer
    const avg3ByPlayer = s?.avg3ByPlayer;
    if (avg3ByPlayer && typeof avg3ByPlayer === "object") {
      const vals = Object.values(avg3ByPlayer)
        .map((x: any) => Number(x) || 0)
        .filter((n) => n > 0);

      if (vals.length) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const prev = by[dsid].avg3 || 0;
        by[dsid].avg3 = prev ? (prev + avg) / 2 : avg;
      }
    }

    by[dsid].updatedAt = Date.now();
  }

  return { byDartSetId: by, updatedAt: Date.now() };
}

/** ✅ Compat import legacy (pluriel) */
export const computeDartSetsStats = computeDartSetStats;
