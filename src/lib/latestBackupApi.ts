import { apiGet, apiPost, readAccountAccessToken } from "./apiClient";

export type LatestBackupProvider = "local" | "nas" | "r2" | "google_drive" | "onedrive" | "dropbox" | "external";
export type AccountLatestBackup = {
  provider: LatestBackupProvider;
  backupId: string;
  createdAt: string;
  updatedAt?: string | null;
  revision?: number;
  checksum?: string | null;
  sizeBytes?: number;
  summary?: Record<string, any>;
  metadata?: Record<string, any>;
};

export async function getAccountLatestBackup(): Promise<AccountLatestBackup | null> {
  // Au boot, la page peut être montée quelques millisecondes avant que la session
  // compte ne soit restaurée. Ne pas provoquer un 401 inutile dans cette fenêtre.
  if (!readAccountAccessToken()) return null;
  const res: any = await apiGet("/account/backups/latest", { manual: true, timeoutMs: 5_000 });
  return res?.latest || null;
}

export async function registerAccountLatestBackup(value: AccountLatestBackup): Promise<AccountLatestBackup | null> {
  if (!readAccountAccessToken()) return null;
  const res: any = await apiPost("/account/backups/latest", value, { manual: true, timeoutMs: 10_000 });
  return res?.latest || null;
}
