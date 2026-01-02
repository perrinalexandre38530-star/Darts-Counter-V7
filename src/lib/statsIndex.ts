// ============================================
// src/lib/statsIndex.ts
// Index unique des stats à partir de History
// -> toutes les pages stats lisent ça
// ============================================

import { History } from "./history";
import type { SavedMatch } from "./history";
import { normalizeHistoryRow, type NormalizedMatch } from "./historyNormalize";

export type StatsIndex = {
  matches: NormalizedMatch[];
  byPlayer: Record<
    string,
    {
      all: NormalizedMatch[];
      x01: NormalizedMatch[];
      cricket: NormalizedMatch[];
      killer: NormalizedMatch[];
      shanghai: NormalizedMatch[];
      other: NormalizedMatch[];
    }
  >;
};

function ensurePlayer(idx: StatsIndex, playerId: string) {
  if (!idx.byPlayer[playerId]) {
    idx.byPlayer[playerId] = {
      all: [],
      x01: [],
      cricket: [],
      killer: [],
      shanghai: [],
      other: [],
    };
  }
}

function bucketKind(kind: string) {
  const k = (kind || "").toLowerCase();
  if (k.includes("cricket")) return "cricket";
  if (k.includes("killer")) return "killer";
  if (k.includes("shanghai")) return "shanghai";
  if (k === "x01" || k.includes("x01") || k === "leg") return "x01";
  return "other";
}

export async function buildStatsIndex(): Promise<StatsIndex> {
  const rows = (await History.list()) as SavedMatch[];
  const decoded = await Promise.all(rows.map((r) => normalizeHistoryRow(r)));

  const finished = decoded.filter((m) => m.status === "finished");

  const idx: StatsIndex = { matches: finished, byPlayer: {} };

  for (const m of finished) {
    const bucket = bucketKind(m.kind);

    for (const pid of m.playerIds.length ? m.playerIds : ["__unknown__"]) {
      ensurePlayer(idx, pid);
      idx.byPlayer[pid].all.push(m);
      (idx.byPlayer[pid] as any)[bucket].push(m);
    }
  }

  return idx;
}
