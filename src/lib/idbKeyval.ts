// ============================================
// src/lib/idbKeyval.ts
// Tiny IndexedDB KV helper (no deps)
// Used to store Supabase auth session safely (avoid localStorage quota).
// ============================================

const DB_NAME = "dc_kv";
const STORE_NAME = "kv";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB not available"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
  });
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB request failed"));
      })
  );
}

export async function idbGet(key: string): Promise<string | null> {
  try {
    const v = await withStore<any>("readonly", (s) => s.get(key));
    return typeof v === "string" ? v : v == null ? null : String(v);
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: string): Promise<void> {
  await withStore("readwrite", (s) => s.put(value, key));
}

export async function idbDel(key: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(key));
}

export async function idbClearPrefix(prefix: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }
        const k = String(cursor.key);
        if (k.startsWith(prefix)) store.delete(cursor.key);
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  } catch {
    // ignore
  }
}
