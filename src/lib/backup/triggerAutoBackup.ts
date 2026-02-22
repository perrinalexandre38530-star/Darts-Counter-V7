import { createAutoBackup } from "./autoBackupService";

/**
 * Trigger an auto-backup if user enabled it.
 * Safe to call multiple times; it will just create another rolling backup.
 */
export async function triggerAutoBackupIfEnabled(): Promise<void> {
  const enabled = (localStorage.getItem("dc_auto_backup_enabled") === "1" || localStorage.getItem("dc_auto_backup_enabled") === "true");
  if (!enabled) return;
  try {
    await createAutoBackup();
  } catch {
    // swallow
  }
}
