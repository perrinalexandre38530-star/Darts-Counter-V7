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
    void import("./externalBackupTarget")
      .then((mod) => mod.queueExternalBackup(why))
      .catch(() => undefined);
    // R2 est aussi une destination de compte : toute donnée utilisateur modifiée
    // doit programmer un snapshot complet, pas seulement les fins de partie.
    void import("./cloudAccountBackup")
      .then((mod) => mod.queueCloudR2AccountBackup(why))
      .catch(() => undefined);
  } catch {}
}

export function onCloudChange(_fn: (reason: string) => void) {
  return () => {};
}
