import { createAutoBackup } from "./autoBackupService";

const MIN_INTERVAL_MS = 5 * 60 * 1000;
const LAST_RUN_KEY = "__dc_auto_backup_last_run_v1";

/**
 * Trigger an auto-backup if user enabled it.
 * CRITICAL FIX:
 * - throttled to avoid huge repeated snapshots
 * - skips if last backup is too recent
 */
export async function triggerAutoBackupIfEnabled(): Promise<void> {
  const enabled =
    localStorage.getItem("dc_auto_backup_enabled") === "1" ||
    localStorage.getItem("dc_auto_backup_enabled") === "true";
  if (!enabled) return;

  try {
    const last = Number(localStorage.getItem(LAST_RUN_KEY) || "0") || 0;
    const now = Date.now();
    if (now - last < MIN_INTERVAL_MS) return;

    localStorage.setItem(LAST_RUN_KEY, String(now));
    await createAutoBackup();
  } catch {
    // swallow
  }
}
