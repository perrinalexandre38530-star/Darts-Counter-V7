// src/lib/cloudBackup/cloudBackupTypes.ts

// ✅ Backup cloud léger mais complet côté gameplay :
// - source de vérité = History + profils locaux + dartsets
// - + storeLite = réglages / bots / flags / amis / activeProfileId / autres champs légers
// - ⚠️ PAS de stats agrégées ni gros historiques dupliqués (rebuild au restore)

import type { SavedMatch as HistoryEntry } from "../history";
import type { Profile as LocalProfile } from "../types";
import type { DartSet } from "../dartSetsStore";

export type CloudBackup = {
  version: number;
  exportedAt: string;
  appVersion: string;
  history: HistoryEntry[];
  localProfiles: LocalProfile[];
  dartsets: DartSet[];
  storeLite?: Record<string, any>;
};

export const CLOUD_BACKUP_VERSION = 2;

export function makeCloudBackup(params: {
  appVersion: string;
  history: HistoryEntry[];
  localProfiles: LocalProfile[];
  dartsets: DartSet[];
  storeLite?: Record<string, any>;
}): CloudBackup {
  return {
    version: CLOUD_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: params.appVersion,
    history: params.history,
    localProfiles: params.localProfiles,
    dartsets: params.dartsets,
    storeLite: params.storeLite || {},
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
