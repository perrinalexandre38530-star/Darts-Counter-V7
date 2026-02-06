// src/lib/sync/EventBuffer.ts
// ============================================================
// EventBuffer — Offline-first event queue for multi-device sync
//
// ✅ Goals (Step 1):
// - Do NOT change existing gameplay/history engine.
// - Collect facts ("events") locally even when offline.
// - Sync to Supabase when user is authenticated.
// - Never lose events; only mark as synced after successful write.
//
// Notes:
// - We keep our own lightweight IndexedDB ("dc-events-v1") to avoid risky migrations.
// - We use a column-missing fallback (PGRST204) to stay compatible with current DB schema.
// ============================================================

import { supabase } from "../supabaseClient";
import { onlineApi } from "../onlineApi";
import { getDeviceId } from "../device";

export type GameEventV1 = {
  id: string;            // uuid
  user_id: string | null;
  device_id: string;
  sport: string;         // darts | petanque | babyfoot | pingpong | territories | etc
  mode: string;          // x01 | cricket | training | ...
  event_type: string;    // THROW | MATCH_END | TRAINING_RUN | ...
  payload: any;          // JSON
  created_at: string;    // ISO
  synced: boolean;
  synced_at: string | null;
};

type PushInput = Omit<GameEventV1, "id" | "created_at" | "synced" | "synced_at" | "device_id" | "user_id"> & {
  // optional overrides
  user_id?: string | null;
  device_id?: string;
};

const DB_NAME = "dc-events-v1";
const DB_VER = 1;
const STORE = "events";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: "id" });
        // index for sync scan
        st.createIndex("by_synced_createdAt", ["synced", "created_at"], { unique: false });
        st.createIndex("by_createdAt", "created_at", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (st: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDB();
  return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const st = tx.objectStore(STORE);
    fn(st).then(resolve).catch(reject);
    tx.onerror = () => reject(tx.error);
  });
}

async function putEvent(ev: GameEventV1): Promise<void> {
  await withStore("readwrite", (st) => {
    return new Promise<void>((resolve, reject) => {
      const req = st.put(ev);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

async function getUnsynced(limit = 250): Promise<GameEventV1[]> {
  return await withStore("readonly", (st) => {
    return new Promise<GameEventV1[]>((resolve, reject) => {
      const out: GameEventV1[] = [];
      const ix = st.index("by_synced_createdAt");
      const range = IDBKeyRange.bound([false, ""], [false, "\uffff"]);
      const req = ix.openCursor(range, "next");

      req.onsuccess = () => {
        const cur = req.result as IDBCursorWithValue | null;
        if (!cur) return resolve(out);
        out.push(cur.value as GameEventV1);
        if (out.length >= limit) return resolve(out);
        cur.continue();
      };

      req.onerror = () => reject(req.error);
    });
  });
}

async function markSynced(ids: string[], syncedAtIso: string): Promise<void> {
  if (!ids.length) return;

  await withStore("readwrite", (st) => {
    return new Promise<void>((resolve, reject) => {
      let pending = ids.length;
      const done = () => {
        pending -= 1;
        if (pending <= 0) resolve();
      };

      for (const id of ids) {
        const getReq = st.get(id);
        getReq.onsuccess = () => {
          const ev = getReq.result as GameEventV1 | undefined;
          if (!ev) return done();
          const putReq = st.put({ ...ev, synced: true, synced_at: syncedAtIso });
          putReq.onsuccess = () => done();
          putReq.onerror = () => done();
        };
        getReq.onerror = () => done();
      }
    });
  });
}

// ============================================================
// Supabase write with missing-column fallback (PGRST204)
// ============================================================
function extractMissingColumn(err: any): string | null {
  try {
    const msg = String(err?.message ?? "");
    const m = msg.match(/Could not find the '([^']+)' column/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function upsertWithColumnFallback(table: string, row: Record<string, any>) {
  let payload = { ...row };
  // try at most 6 times (avoid infinite loop)
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase.from(table).upsert(payload as any, {
      onConflict: "id",
      ignoreDuplicates: true,
    } as any);

    if (!error) return;

    const missing = extractMissingColumn(error);
    if (missing && missing in payload) {
      delete payload[missing];
      continue;
    }

    throw error;
  }
}

// ============================================================
// Public API
// ============================================================
export const EventBuffer = {
  async push(input: PushInput & { sport: string; mode: string; event_type: string; payload: any }) {
    try {
      const sess = await onlineApi.getCurrentSession().catch(() => null);
      const uid = String((sess as any)?.user?.id || "") || null;

      const ev: GameEventV1 = {
        id: crypto.randomUUID?.() ?? String(Date.now()) + "-" + String(Math.random()).slice(2),
        user_id: input.user_id ?? uid,
        device_id: input.device_id ?? getDeviceId(),
        sport: String(input.sport || "unknown"),
        mode: String(input.mode || "unknown"),
        event_type: String(input.event_type || "unknown"),
        payload: input.payload ?? null,
        created_at: new Date().toISOString(),
        synced: false,
        synced_at: null,
      };

      await putEvent(ev);

      // Optional: lightweight signal for UI/debug
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dc-eventbuffer-updated"));
        }
      } catch {}
    } catch (e) {
      // Never crash gameplay because of sync layer
      console.warn("[EventBuffer.push] failed:", e);
    }
  },

  async listUnsynced(limit = 250) {
    return await getUnsynced(limit);
  },

  async syncNow(opts?: { max?: number }) {
    // Only sync if authenticated
    const sess = await onlineApi.getCurrentSession().catch(() => null);
    const uid = String((sess as any)?.user?.id || "");
    if (!uid) return;

    const max = Math.max(1, Math.min(1000, opts?.max ?? 250));
    const batch = await getUnsynced(max);
    if (!batch.length) return;

    const syncedAt = new Date().toISOString();
    const syncedIds: string[] = [];

    for (const ev of batch) {
      // attach user_id late if it was created offline before auth
      const user_id = ev.user_id || uid;

      const row: Record<string, any> = {
        id: ev.id,
        user_id,
        device_id: ev.device_id,
        sport: ev.sport,
        mode: ev.mode,
        event_type: ev.event_type,
        payload: ev.payload,
        created_at: ev.created_at,
      };

      try {
        // prefer writing into stats_events (already present in your schema)
        await upsertWithColumnFallback("stats_events", row);
        syncedIds.push(ev.id);
      } catch (e) {
        // stop on first failure: keep ordering; don't mark partially unknown
        console.warn("[EventBuffer.syncNow] write failed, stop batch:", e);
        break;
      }
    }

    await markSynced(syncedIds, syncedAt);

    // Optional notify
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dc-eventbuffer-synced"));
      }
    } catch {}
  },
};
