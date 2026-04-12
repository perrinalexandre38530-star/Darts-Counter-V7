// ============================================
// src/lib/cloudEvents.ts
// NAS manual mode: local changes only mark the account as dirty.
// ============================================

import { markNasSyncDirty, pushNasSyncDirtyReason } from "./manualNasSync";

export function emitCloudChange(reason: string) {
  try {
    const why = String(reason || "change");
    markNasSyncDirty(why);
    pushNasSyncDirtyReason(why);
  } catch {}
}

export function onCloudChange(_fn: (reason: string) => void) {
  return () => {};
}
