import { exportCloudSnapshot } from "../storage";

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

  // Migration one-shot from old recursive key.
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
 * Rolling backup LOCAL uniquement.
 *
 * Ancien comportement supprimé : cette fonction poussait aussi deux variantes
 * de snapshot vers le NAS, en parallèle du vrai moteur de sauvegarde. C'était
 * une source directe de courses et de versions différentes entre Local/NAS/R2.
 * Les destinations distantes sont désormais gérées exclusivement par
 * saveConfiguredBackupNow().
 */
export async function createAutoBackup(): Promise<void> {
  const payload = await exportCloudSnapshot({ mediaMirror: "skip" });
  const backups = readBackups();
  backups.unshift({
    createdAt: new Date().toISOString(),
    payload,
  });

  const trimmed = backups.slice(0, MAX_BACKUPS);
  localStorage.setItem(STORE_KEY, safeJsonStringify(trimmed));

  try { localStorage.removeItem(LEGACY_KEY); } catch {}
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
  try { localStorage.removeItem(LEGACY_KEY); } catch {}
}
