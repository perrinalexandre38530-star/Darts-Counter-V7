// src/lib/storageMigration.ts
// One-shot migration from localStorage -> IndexedDB for heavy keys

import { idbSet } from "./indexedDb";

const KEYS = ["stats", "snapshots", "user_store"];

export async function migrateLocalStorageToIndexedDB() {
  try {
    for (const k of KEYS) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          await idbSet(k, parsed);
        } catch {
          await idbSet(k, raw);
        }
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn("IndexedDB migration failed", e);
  }
}
