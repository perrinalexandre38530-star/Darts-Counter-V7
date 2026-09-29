import { apiGet, apiPost } from "./apiClient";

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
  const res: any = await apiGet("/account/backups/latest", { manual: true, timeoutMs: 2_500 });
  return res?.latest || null;
}

export async function registerAccountLatestBackup(value: AccountLatestBackup): Promise<AccountLatestBackup | null> {
  const res: any = await apiPost("/account/backups/latest", value);
  return res?.latest || null;
}
