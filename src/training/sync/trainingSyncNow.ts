// ============================================
// src/training/sync/trainingSyncNow.ts
// LOT 27 — best-effort immediate sync after a run is recorded
// - No React deps
// - Debounced + guarded
// ============================================

import { syncTrainingEvents } from "./trainingSyncEngine";

let inFlight: Promise<void> | null = null;
let lastTs = 0;

export async function trainingSyncNowBestEffort(reason?: string) {
  try {
    const now = Date.now();
    // debounce (avoid double record calls)
    if (now - lastTs < 1500) return;
    lastTs = now;

    const userId =
      (typeof localStorage !== "undefined" && localStorage.getItem("dc_user_id")) || "";
    if (!userId) return;

    // if offline, don't spam
    if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return;

    if (!inFlight) {
      inFlight = (async () => {
        try {
          await syncTrainingEvents(userId);
        } catch {
          // ignore
        } finally {
          inFlight = null;
        }
      })();
    }

    await inFlight;
  } catch {
    // ignore
  }
}
