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

function getDartSetId(rec: any): string | null {
  const v =
    rec?.dartSetId ??
    rec?.payload?.dartSetId ??
    rec?.payload?.summary?.dartSetId ??
    rec?.summary?.dartSetId ??
    rec?.payload?.config?.dartSetId ??
    null;

  if (!v) return null;
  const s = String(v);
  return s.length ? s : null;
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

    const dsid = getDartSetId(r0);
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
