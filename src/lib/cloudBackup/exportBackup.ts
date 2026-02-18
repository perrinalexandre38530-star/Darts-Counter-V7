// src/lib/cloudBackup/exportBackup.ts

import { makeCloudBackup } from "./cloudBackupTypes";

import { History } from "../history";
import { loadStore, saveStore } from "../storage";
import type { Store } from "../types";
import { getAllDartSets, setAllDartSets } from "../dartSetsStore";

function getAppVersion(): string {
  // Option A (Vite): define import.meta.env.VITE_APP_VERSION
  const v = (import.meta as any)?.env?.VITE_APP_VERSION;
  if (typeof v === "string" && v.trim()) return v;

  // Option B: fallback
  return "unknown";
}

export async function exportCloudBackupAsJson(): Promise<{
  backupJson: string;
  backupObj: any;
}> {
  // ✅ Source de vérité :
  // - History (IndexedDB)
  // - Store (profils)
  // - dartSetsStore (localStorage) + mirror store.dartSets

  const [history, storeAny] = await Promise.all([
    History.list?.() ?? [],
    loadStore<any>().catch(() => null),
  ]);

  const localProfiles = (storeAny?.profiles ?? []) as any[];
  const dartsets = ((storeAny as any)?.dartSets ?? getAllDartSets()) as any[];

  // ✅ Best-effort: remet dartSetsStore en phase si store.dartSets est la source actuelle
  try {
    if (Array.isArray((storeAny as any)?.dartSets)) setAllDartSets((storeAny as any).dartSets);
  } catch {}
  try {
    if (storeAny && Array.isArray(dartsets)) {
      const st: any = { ...storeAny, dartSets: dartsets };
      await saveStore(st as Store).catch(() => {});
    }
  } catch {}

  const backup = makeCloudBackup({
    appVersion: getAppVersion(),
    history: Array.isArray(history) ? history : [],
    localProfiles: Array.isArray(localProfiles) ? localProfiles : [],
    dartsets: Array.isArray(dartsets) ? dartsets : [],
  });

  const backupJson = JSON.stringify(backup);
  return { backupJson, backupObj: backup };
}
