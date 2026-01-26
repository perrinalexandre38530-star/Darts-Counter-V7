// ============================================================
// src/lib/historyCloud.ts
// Export / Import du store IndexedDB "history" (dc-store-v1)
// Objectif: inclure l'historique (et donc les stats dérivées) dans la snapshot cloud.
//
// - Pas d'import depuis storage.ts / history.ts (évite cycles)
// - Stocke les records tels quels (payloadCompressed, summary, etc.)
// ============================================================

import type { SavedMatch } from "./history";

const DB_NAME = "dc-store-v1";
const DB_VER = 2;
const STORE = "history";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type HistoryDumpV1 = {
  _v: 1;
  rows: Record<string, SavedMatch>;
};

export async function exportHistoryDump(): Promise<HistoryDumpV1> {
  const db = await openDB();

  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);

    const out: Record<string, SavedMatch> = {};

    // getAll n'est pas garanti partout
    if ("getAll" in store) {
      const req = (store as any).getAll();
      req.onsuccess = () => {
        const rows = (req.result || []) as SavedMatch[];
        for (const r of rows) out[(r as any).id] = r as any;
        resolve({ _v: 1, rows: out });
      };
      req.onerror = () => reject(req.error);
      return;
    }

    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        const r = cursor.value as SavedMatch;
        out[(r as any).id] = r as any;
        cursor.continue();
      } else {
        resolve({ _v: 1, rows: out });
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function importHistoryDump(dump: HistoryDumpV1, opts?: { replace?: boolean }) {
  if (!dump || dump._v !== 1) return;
  const replace = opts?.replace ?? false;

  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    if (replace) {
      const clr = store.clear();
      clr.onerror = () => reject(clr.error);
      clr.onsuccess = () => {
        // continue
      };
    }

    // upsert rows
    for (const r of Object.values(dump.rows || {})) {
      try {
        store.put(r as any);
      } catch {
        // ignore record-level failure
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
