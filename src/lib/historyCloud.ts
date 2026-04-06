// ============================================================
// src/lib/historyCloud.ts
// Export / Import du store IndexedDB history pour snapshots cloud.
// ✅ Compat DB_VER=3 (history_headers/history_details) + fallback legacy.
// ============================================================

import type { SavedMatch } from "./history";

const DB_NAME = "dc-store-v1";
const DB_VER = 3;
const STORE_LEGACY = "history";
const STORE_HEADERS = "history_headers";
const STORE_DETAILS = "history_details";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_LEGACY)) {
        try {
          db.createObjectStore(STORE_LEGACY, { keyPath: "id" });
        } catch {}
      }

      let headers: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_HEADERS)) {
        headers = db.createObjectStore(STORE_HEADERS, { keyPath: "id" });
      } else {
        headers = req.transaction!.objectStore(STORE_HEADERS);
      }
      try {
        if (!(headers.indexNames as any)?.contains?.("by_updatedAt")) {
          headers.createIndex("by_updatedAt", "updatedAt", { unique: false });
        }
      } catch {
        try { headers.createIndex("by_updatedAt", "updatedAt", { unique: false }); } catch {}
      }
      try {
        if (!(headers.indexNames as any)?.contains?.("by_matchId")) {
          headers.createIndex("by_matchId", "matchId", { unique: false });
        }
      } catch {
        try { headers.createIndex("by_matchId", "matchId", { unique: false }); } catch {}
      }

      let details: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_DETAILS)) {
        details = db.createObjectStore(STORE_DETAILS, { keyPath: "id" });
      } else {
        details = req.transaction!.objectStore(STORE_DETAILS);
      }
      try {
        if (!(details.indexNames as any)?.contains?.("by_updatedAt")) {
          details.createIndex("by_updatedAt", "updatedAt", { unique: false });
        }
      } catch {
        try { details.createIndex("by_updatedAt", "updatedAt", { unique: false }); } catch {}
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

function getAllFromStore<T = any>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if ("getAll" in store) {
      const req = (store as any).getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
      return;
    }
    const rows: T[] = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cur = req.result as IDBCursorWithValue | null;
      if (!cur) return resolve(rows);
      rows.push(cur.value as T);
      cur.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function exportHistoryDump(): Promise<HistoryDumpV1> {
  const db = await openDB();

  // ✅ format moderne split header/detail
  if (db.objectStoreNames.contains(STORE_HEADERS) && db.objectStoreNames.contains(STORE_DETAILS)) {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_HEADERS, STORE_DETAILS], "readonly");
      const headers = tx.objectStore(STORE_HEADERS);
      const details = tx.objectStore(STORE_DETAILS);
      const out: Record<string, SavedMatch> = {};

      Promise.all([getAllFromStore<any>(headers), getAllFromStore<any>(details)])
        .then(([headerRows, detailRows]) => {
          const detailsById = new Map<string, any>();
          for (const d of detailRows || []) detailsById.set(String(d?.id || ""), d);
          for (const h of headerRows || []) {
            const id = String(h?.id || h?.matchId || "").trim();
            if (!id) continue;
            const detail = detailsById.get(id) || null;
            out[id] = {
              ...(h || {}),
              id,
              matchId: String(h?.matchId || id),
              payloadCompressed: String(detail?.payloadCompressed || ""),
            } as any;
          }
        })
        .catch(reject);

      tx.oncomplete = () => resolve({ _v: 1, rows: out });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  // fallback legacy
  if (db.objectStoreNames.contains(STORE_LEGACY)) {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LEGACY, "readonly");
      const store = tx.objectStore(STORE_LEGACY);
      const out: Record<string, SavedMatch> = {};
      getAllFromStore<any>(store)
        .then((rows) => {
          for (const r of rows || []) {
            const id = String(r?.id || r?.matchId || "").trim();
            if (id) out[id] = r as any;
          }
        })
        .catch(reject);
      tx.oncomplete = () => resolve({ _v: 1, rows: out });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return { _v: 1, rows: {} };
}

function toHeaderRecord(rec: any) {
  const out: any = { ...(rec || {}) };
  delete out.payload;
  delete out.payloadCompressed;
  return out;
}

function toDetailRecord(id: string, rec: any) {
  const updatedAt = Number(rec?.updatedAt || Date.now());
  return {
    id: String(id),
    matchId: String(rec?.matchId ?? id),
    kind: String(rec?.kind || ""),
    status: String(rec?.status || ""),
    createdAt: Number(rec?.createdAt || updatedAt),
    updatedAt,
    payloadCompressed: String(rec?.payloadCompressed || ""),
  };
}

export async function importHistoryDump(dump: HistoryDumpV1, opts?: { replace?: boolean }) {
  if (!dump || dump._v !== 1) return;
  const replace = opts?.replace ?? false;

  const db = await openDB();

  if (db.objectStoreNames.contains(STORE_HEADERS) && db.objectStoreNames.contains(STORE_DETAILS)) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_HEADERS, STORE_DETAILS], "readwrite");
      const headers = tx.objectStore(STORE_HEADERS);
      const details = tx.objectStore(STORE_DETAILS);

      if (replace) {
        try { headers.clear(); } catch {}
        try { details.clear(); } catch {}
      }

      for (const r of Object.values(dump.rows || {})) {
        try {
          const id = String((r as any)?.id || (r as any)?.matchId || "").trim();
          if (!id) continue;
          headers.put(toHeaderRecord({ ...(r as any), id, matchId: String((r as any)?.matchId || id) }));
          details.put(toDetailRecord(id, r));
        } catch {}
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return;
  }

  if (db.objectStoreNames.contains(STORE_LEGACY)) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_LEGACY, "readwrite");
      const store = tx.objectStore(STORE_LEGACY);
      if (replace) {
        try { store.clear(); } catch {}
      }
      for (const r of Object.values(dump.rows || {})) {
        try { store.put(r as any); } catch {}
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
