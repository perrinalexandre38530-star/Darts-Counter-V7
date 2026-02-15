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

function toId(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function pickFirstNonEmpty(arr: any[]): string | null {
  for (const v of arr) {
    const id = toId(v);
    if (id) return id;
  }
  return null;
}

function getDartSetId(rec: any, profileId?: string | null): string | null {
  // ✅ Priorité aux champs unifiés (Patch 4)
  const meta = rec?.payload?.meta ?? rec?.meta ?? null;
  const byPlayer = meta?.dartSetIdsByPlayer ?? rec?.dartSetIdsByPlayer ?? null;
  if (byPlayer && profileId) {
    const v = (byPlayer as any)[String(profileId)];
    const id = toId(v);
    if (id) return id;
  }

  // ✅ Global si unique
  const direct = pickFirstNonEmpty([
    rec?.dartSetId,
    rec?.payload?.dartSetId,
    meta?.dartSetId,
    rec?.payload?.summary?.dartSetId,
    rec?.summary?.dartSetId,
    rec?.payload?.config?.dartSetId,
  ]);
  if (direct) return direct;

  // ✅ X01 V3: summary.perPlayer contient dartSetId
  const s = rec?.summary ?? rec?.payload?.summary ?? null;
  const perPlayer =
    (Array.isArray(s?.perPlayer) && s.perPlayer) ||
    (Array.isArray(s?.players) && s.players) ||
    null;
  if (Array.isArray(perPlayer) && perPlayer.length) {
    if (profileId) {
      const row = perPlayer.find(
        (pp: any) => String(pp?.playerId ?? pp?.profileId ?? pp?.id ?? "") === String(profileId)
      );
      const pid = pickFirstNonEmpty([row?.dartSetId, row?.dartPresetId]);
      if (pid) return pid;
    }
    const anyId = pickFirstNonEmpty(
      perPlayer
        .map((pp: any) => pp?.dartSetId ?? pp?.dartPresetId ?? null)
        .filter(Boolean)
    );
    if (anyId) return anyId;
  }

  // ✅ players[] (record ou payload.config)
  const players =
    (Array.isArray(rec?.players) && rec.players) ||
    (Array.isArray(rec?.payload?.players) && rec.payload.players) ||
    (Array.isArray(rec?.payload?.config?.players) && rec.payload.config.players) ||
    null;
  if (Array.isArray(players) && players.length) {
    if (profileId) {
      const row = players.find((p: any) => String(p?.id ?? "") === String(profileId));
      const pid = pickFirstNonEmpty([row?.dartSetId, row?.dartPresetId]);
      if (pid) return pid;
    }
    const anyId = pickFirstNonEmpty(
      players
        .map((p: any) => p?.dartSetId ?? p?.dartPresetId ?? null)
        .filter(Boolean)
    );
    if (anyId) return anyId;
  }

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

    const dsid = getDartSetId(r0, pid || null);
    if (!dsid) continue;

    if (!by[dsid]) by[dsid] = { matches: 0, legs: 0, avg3: 0, updatedAt: 0 };

    by[dsid].matches += 1;

    const s = r0?.summary ?? r0?.payload?.summary ?? null;
    // legs: si absent, fallback = 1 match
    by[dsid].legs += Number(s?.legs ?? s?.legsPlayed ?? 0) || 1;

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
