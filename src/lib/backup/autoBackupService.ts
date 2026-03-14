import { exportAll } from "../storage";
import { pushStoreToNas } from "../nasAutoSync";
import { isNasSyncEnabled, nasApi } from "../nasApi";

const STORE_KEY = "__dc_auto_backups_v2";
const LEGACY_KEY = "dc_auto_backups";
const MAX_BACKUPS = 3;

export type AutoBackupItem = {
  createdAt: string;
  payload: any;
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeJsonStringify(value: any, fallback = "[]"): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function readBackups(): AutoBackupItem[] {
  const next = safeJsonParse<AutoBackupItem[]>(localStorage.getItem(STORE_KEY), []);
  if (Array.isArray(next) && next.length) return next;

  // migration one-shot from old recursive key
  const legacy = safeJsonParse<AutoBackupItem[]>(localStorage.getItem(LEGACY_KEY), []);
  if (Array.isArray(legacy) && legacy.length) {
    try {
      localStorage.setItem(STORE_KEY, safeJsonStringify(legacy.slice(0, MAX_BACKUPS)));
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
    return legacy.slice(0, MAX_BACKUPS);
  }
  return [];
}

/**
 * Create a new rolling auto-backup (stored locally).
 * CRITICAL FIX:
 * - no longer stored under dc_* key (prevents recursive inclusion in exportAll)
 * - keep only latest MAX_BACKUPS
 */
export async function createAutoBackup(): Promise<void> {
  const payload = await exportAll();

  // ✅ NEW: snapshot complet vers le NAS pour restauration fidèle multi-appareils
  try {
    if (isNasSyncEnabled()) {
      await nasApi.pushStoreSnapshot(payload, 8);
    }
  } catch (err) {
    try {
      localStorage.setItem(
        "dc_nas_snapshot_last_error",
        JSON.stringify({
          at: new Date().toISOString(),
          message: err instanceof Error ? err.message : String(err),
        })
      );
    } catch {}
  }

  const backups = readBackups();
  backups.unshift({
    createdAt: new Date().toISOString(),
    payload,
  });

  const trimmed = backups.slice(0, MAX_BACKUPS);
  localStorage.setItem(STORE_KEY, safeJsonStringify(trimmed));

  // cleanup old recursive key if still present
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {}

  // ✅ NEW: push opportuniste vers le NAS si l'API est dispo
  try {
    await pushStoreToNas();
  } catch (err) {
    try {
      localStorage.setItem(
        "dc_nas_sync_last_error",
        JSON.stringify({
          at: new Date().toISOString(),
          message: err instanceof Error ? err.message : String(err),
        })
      );
    } catch {}
  }
}

/** Read all stored auto-backups (newest first). */
export function getAutoBackups(): AutoBackupItem[] {
  return readBackups();
}

/** Convenience: return newest auto-backup or null. */
export function getLatestAutoBackup(): AutoBackupItem | null {
  const all = getAutoBackups();
  return all.length ? all[0] : null;
}

/** Clear all stored auto-backups. */
export function clearAutoBackups(): void {
  localStorage.removeItem(STORE_KEY);
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}
