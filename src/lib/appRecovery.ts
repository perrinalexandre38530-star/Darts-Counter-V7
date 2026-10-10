// src/lib/appRecovery.ts
// ============================================
// Hard reset / recovery helpers
// - n'efface pas le NAS distant
// - nettoie uniquement le stockage local (LS + IDB + SW/cache)
// ============================================

const SAFE_MODE_KEY = "dc_safe_mode_v1";

const DB_NAMES = [
  "darts-counter-v5",
  "dc-store-v1",
  "dc-events-v1",
  "dc_kv",
  "dc-indexeddb",
  "dc_tournaments_db_v1",
];

const LOCAL_KEYS_TO_REMOVE = [
  SAFE_MODE_KEY,
  "dc-history-v1",
  "dc_last_store_size_v1",
  "dc_memory_diag_v1",
  "dc_last_memory_warning_v1",
  "dc_last_runtime_error_v1",
  "dc_last_boot_crash_v1",
  "dc_last_chunk_error_v1",
  "dc_force_purge_sw",
  "dc_sw_purge_once_v1",
  "dc_dyn_import_fail_count_v1",
  "dc_dyn_import_recover_once_v1",
  "dc_last_crash_report_v1",
  "dc_resume_index_v1",
  "dc_current_match_v1",
  "dc_bots_v1",
  "dc_dart_sets_v1",
  "dc-debug-overlay",
];

export function activateSafeMode() {
  try {
    localStorage.setItem(SAFE_MODE_KEY, "1");
  } catch {}
}

export function deactivateSafeMode() {
  try {
    localStorage.setItem(SAFE_MODE_KEY, "0");
  } catch {}
}

async function clearLocalState() {
  try {
    for (const k of LOCAL_KEYS_TO_REMOVE) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  try {
    for (const dbName of DB_NAMES) {
      await new Promise<void>((resolve) => {
        try {
          const req = indexedDB.deleteDatabase(dbName);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch {}
}

async function clearSwAndCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
  } catch {}

  try {
    if (typeof caches !== "undefined" && (caches as any).keys) {
      const keys = await (caches as any).keys();
      await Promise.all(keys.map((k: string) => caches.delete(k)));
    }
  } catch {}
}

export async function repairApplication(opts?: {
  enableSafeMode?: boolean;
  clearServiceWorkers?: boolean;
  reload?: boolean;
}) {
  const enableSafeMode = opts?.enableSafeMode !== false;
  const clearServiceWorkers = opts?.clearServiceWorkers !== false;
  const reload = opts?.reload !== false;

  if (enableSafeMode) activateSafeMode();
  await clearLocalState();
  if (clearServiceWorkers) await clearSwAndCaches();

  if (reload) {
    try {
      window.location.reload();
    } catch {}
  }
}

export async function safeModeReload() {
  activateSafeMode();
  try {
    window.location.reload();
  } catch {}
}


const CHUNK_RECOVERY_KEY = "dc_chunk_boundary_recovery_v1";

export function isRecoverableChunkLoadError(error: any): boolean {
  const msg = String(error?.message || error?.reason?.message || error || "").toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading chunk")
  );
}

/**
 * Récupération ciblée d'un chunk Vite obsolète après déploiement.
 * IMPORTANT : ne touche PAS au localStorage métier ni à IndexedDB.
 * On purge seulement Service Workers + CacheStorage, puis recharge le shell
 * courant avec un cache-buster. Le compte, MON PROFIL et HISTORIQUE restent intacts.
 */
export async function recoverStaleChunkWithoutDataLoss(error?: any): Promise<boolean> {
  if (typeof window === "undefined" || !isRecoverableChunkLoadError(error)) return false;

  const now = Date.now();
  let previous = 0;
  try { previous = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY) || "0") || 0; } catch {}

  // Une seule récupération automatique dans une fenêtre courte pour éviter une
  // boucle si le déploiement lui-même est incomplet.
  if (previous && now - previous < 20_000) return false;
  try { sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(now)); } catch {}

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister().catch(() => false)));
    }
  } catch {}

  try {
    if (typeof caches !== "undefined" && (caches as any).keys) {
      const names = await (caches as any).keys();
      await Promise.all(names.map((name: string) => caches.delete(name).catch(() => false)));
    }
  } catch {}

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("chunk", String(now));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  return true;
}
