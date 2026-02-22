import { exportAll } from "../storage";

const STORE_KEY = "dc_auto_backups";
const MAX_BACKUPS = 10;

export type AutoBackupItem = {
  createdAt: string;
  payload: any;
};

/**
 * Create a new rolling auto-backup (stored locally).
 * Keeps only the latest MAX_BACKUPS items.
 */
export async function createAutoBackup(): Promise<void> {
  const payload = await exportAll();

  const backupsRaw = localStorage.getItem(STORE_KEY);
  const backups: AutoBackupItem[] = backupsRaw ? JSON.parse(backupsRaw) : [];

  backups.unshift({
    createdAt: new Date().toISOString(),
    payload,
  });

  const trimmed = backups.slice(0, MAX_BACKUPS);
  localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
}

/** Read all stored auto-backups (newest first). */
export function getAutoBackups(): AutoBackupItem[] {
  const raw = localStorage.getItem(STORE_KEY);
  return raw ? (JSON.parse(raw) as AutoBackupItem[]) : [];
}

/** Convenience: return newest auto-backup or null. */
export function getLatestAutoBackup(): AutoBackupItem | null {
  const all = getAutoBackups();
  return all.length ? all[0] : null;
}

/** Clear all stored auto-backups. */
export function clearAutoBackups(): void {
  localStorage.removeItem(STORE_KEY);
}
