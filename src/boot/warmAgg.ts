// ============================================
// src/boot/warmAgg.ts — Backfill agrégateur depuis History (one-shot)
// ============================================
import { History } from "../lib/history";
import { markStatsIndexDirty } from "../lib/stats/rebuildStatsFromHistory";

const FLAG = "dc-stats-index-backfill-v2";

export async function warmAggOnce() {
  try {
    if (localStorage.getItem(FLAG)) return;

    const rows = await History.list();
    if ((rows || []).length > 0) {
      markStatsIndexDirty("warm-backfill");
    }

    localStorage.setItem(FLAG, "1");
  } catch (e) {
    console.warn("warmAggOnce:", e);
  }
}
