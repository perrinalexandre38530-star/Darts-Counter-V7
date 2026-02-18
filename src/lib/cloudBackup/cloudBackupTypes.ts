// src/lib/cloudBackup/cloudBackupTypes.ts

// ✅ Backup "cloud" minimal :
// - source de vérité = History + profils locaux + dartsets
// - ⚠️ PAS de stats agrégées (on rebuild au restore)

import type { SavedMatch as HistoryEntry } from "../history";
import type { Profile as LocalProfile } from "../types";
import type { DartSet } from "../dartSetsStore";

export type CloudBackup = {
  version: number;
  exportedAt: string;   // ISO string
  appVersion: string;   // ta version app (package.json / env)
  history: HistoryEntry[];
  localProfiles: LocalProfile[];
  dartsets: DartSet[];
};

export const CLOUD_BACKUP_VERSION = 1;

export function makeCloudBackup(params: {
  appVersion: string;
  history: HistoryEntry[];
  localProfiles: LocalProfile[];
  dartsets: DartSet[];
}): CloudBackup {
  return {
    version: CLOUD_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: params.appVersion,
    history: params.history,
    localProfiles: params.localProfiles,
    dartsets: params.dartsets,
  };
}

/** Optionnel: petit garde-fou runtime */
export function isCloudBackup(x: any): x is CloudBackup {
  return (
    x &&
    typeof x === "object" &&
    typeof x.version === "number" &&
    typeof x.exportedAt === "string" &&
    typeof x.appVersion === "string" &&
    Array.isArray(x.history) &&
    Array.isArray(x.localProfiles) &&
    Array.isArray(x.dartsets)
  );
}
