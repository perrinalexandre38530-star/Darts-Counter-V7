import { buildCanonicalBackupArtifact } from "./backupEngineV1";

const STORE_KEY = "__dc_auto_backups_v2";
const LEGACY_KEY = "dc_auto_backups";
const MAX_BACKUPS = 3;

export type AutoBackupItem = {
  createdAt: string;
  payload: any;
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

function safeJsonStringify(value: any, fallback = "[]"): string {
  try { return JSON.stringify(value); } catch { return fallback; }
}

function readBackups(): AutoBackupItem[] {
  const next = safeJsonParse<AutoBackupItem[]>(localStorage.getItem(STORE_KEY), []);
  if (Array.isArray(next) && next.length) return next;
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

/** Rolling backup LOCAL uniquement, désormais au format canonique WAVE 7. */
export async function createAutoBackup(): Promise<void> {
  const built = await buildCanonicalBackupArtifact();
  const backups = readBackups();
  backups.unshift({ createdAt: built.artifact.createdAt, payload: built.artifact });
  localStorage.setItem(STORE_KEY, safeJsonStringify(backups.slice(0, MAX_BACKUPS)));
  try { localStorage.removeItem(LEGACY_KEY); } catch {}
}

export function getAutoBackups(): AutoBackupItem[] { return readBackups(); }
export function getLatestAutoBackup(): AutoBackupItem | null { const all = getAutoBackups(); return all.length ? all[0] : null; }
export function clearAutoBackups(): void { localStorage.removeItem(STORE_KEY); try { localStorage.removeItem(LEGACY_KEY); } catch {} }
