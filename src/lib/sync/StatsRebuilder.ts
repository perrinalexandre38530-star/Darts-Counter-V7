// =============================================================
// src/lib/sync/StatsRebuilder.ts
// Compatibility wrapper.
//
// Stats are authoritative from local History, not from the retired Supabase
// events tables. Keep the old exported function name so existing UI/imports
// continue to work without generating network traffic.
// =============================================================

import { rebuildStatsFromHistory } from "../stats/rebuildStatsFromHistory";

export type RebuildOptions = {
  from?: string;
  to?: string;
};

export async function rebuildStatsFromEvents(_opts?: RebuildOptions) {
  return await rebuildStatsFromHistory({
    includeNonFinished: true,
    persist: true,
  });
}
