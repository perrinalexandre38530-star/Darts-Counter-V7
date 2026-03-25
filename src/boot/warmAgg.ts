// ============================================
// src/boot/warmAgg.ts — Backfill agrégateur depuis History (one-shot)
// ============================================
import { History } from "../lib/history";
import { scheduleStatsIndexRefresh } from "../lib/stats/rebuildStatsFromHistory";

const FLAG = "dc-stats-index-backfill-v2";

export async function warmAggOnce() {
  try {
    if (localStorage.getItem(FLAG)) return;

    const rows = await History.list();
    if ((rows || []).length > 0) {
      scheduleStatsIndexRefresh({
        reason: "warm-backfill",
        debounceMs: 80,
        includeNonFinished: false,
      });
    }

    localStorage.setItem(FLAG, "1");
  } catch (e) {
    console.warn("warmAggOnce:", e);
  }
}
