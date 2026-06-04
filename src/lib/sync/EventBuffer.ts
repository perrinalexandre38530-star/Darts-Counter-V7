// ============================================
// src/lib/sync/EventBuffer.ts
// Offline-first event buffer + sync vers Supabase
// - Stocke en IndexedDB les événements non envoyés
// - Sync dès que user_id existe et réseau dispo
// - Tolérant aux variations de schéma (fallback colonnes)
// - ✅ PATCH SAFE: conserve l'API existante (push/listUnsynced/markSynced/syncNow/installAutoSync)
// - ✅ Nouveau chemin recommandé: table 'events' (event_id,user_id,device_id,type,payload,created_at)
// - ✅ Fallback: si la table 'events' n'existe pas, on retombe sur 'stats_events' (ancien mapping)
// ============================================

import { supabase } from "../supabaseClient";
import { getDeviceId } from "../device";

export type GameEventSport =
  | "darts"
  | "petanque"
  | "babyfoot"
  | "pingpong"
  | "territories"
  | string;

export interface GameEvent {
  id: string;              // client event_id
  user_id: string;         // auth.users.id (vide si offline / pas connecté)
  device_id: string;
  sport: GameEventSport;
  mode: string;
  event_type: string;
  payload: any;
  created_at: string;      // ISO
  synced: boolean;
}

const DB_NAME = "dc-events-v1";
const DB_VER = 1;
const STORE = "events";

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseWindow() || !("indexedDB" in window)) {
      reject(new Error("IndexedDB indisponible"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: "id" });
        st.createIndex("by_synced", "synced", { unique: false });
        st.createIndex("by_created_at", "created_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (st: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await openDb();
  return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const st = tx.objectStore(STORE);

    fn(st)
      .then((out) => {
        tx.oncomplete = () => {
          try {
            db.close();
          } catch {}
          resolve(out);
        };
        tx.onerror = () => reject(tx.error || new Error("IDB tx error"));
        tx.onabort = () => reject(tx.error || new Error("IDB tx abort"));
      })
      .catch((e) => {
        try {
          tx.abort();
        } catch {}
        try {
          db.close();
        } catch {}
        reject(e);
      });
  });
}

async function idbPut(ev: GameEvent): Promise<void> {
  await withStore("readwrite", async (st) => {
    await new Promise<void>((resolve, reject) => {
      const req = st.put(ev);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

async function idbListUnsynced(limit = 200): Promise<GameEvent[]> {
  return await withStore("readonly", async (st) => {
    const idx = st.index("by_synced");
    return await new Promise<GameEvent[]>((resolve, reject) => {
      const out: GameEvent[] = [];
      const req = idx.openCursor(IDBKeyRange.only(false));
      req.onsuccess = () => {
        const cur = req.result as IDBCursorWithValue | null;
        if (!cur) {
          resolve(out);
          return;
        }
        out.push(cur.value as GameEvent);
        if (out.length >= limit) {
          resolve(out);
          return;
        }
        cur.continue();
      };
      req.onerror = () => reject(req.error);
    });
  });
}

async function idbMarkSynced(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await withStore("readwrite", async (st) => {
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => {
        const getReq = st.get(id);
        getReq.onsuccess = () => {
          const val = getReq.result as GameEvent | undefined;
          if (!val) {
            resolve();
            return;
          }
          const putReq = st.put({ ...val, synced: true });
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => resolve();
        };
        getReq.onerror = () => resolve();
      });
    }
  });
}

function isOnline(): boolean {
  if (!canUseWindow()) return true;
  return navigator.onLine !== false;
}

async function getAuthedUserId(): Promise<string> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return "";
    return String(data?.user?.id || "");
  } catch {
    return "";
  }
}

// --------- Schema fallback helpers ---------

type InsertRow = Record<string, any>;

function looksLikeMissingColumnError(err: any): boolean {
  const msg = String(err?.message || err?.details || "").toLowerCase();
  // PostgREST PGRST204 (column not found) or similar
  return (msg.includes("pgrst204") || (msg.includes("column") && msg.includes("does not exist")));
}

function looksLikeMissingRelationError(err: any): boolean {
  const msg = String(err?.message || err?.details || "").toLowerCase();
  // PostgREST may report: relation "xxx" does not exist
  return msg.includes("relation") && msg.includes("does not exist");
}

function extractMissingColumn(err: any): string | "" {
  const msg = String(err?.message || err?.details || "");
  const m1 = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of\s+relation/i);
  if (m1?.[1]) return m1[1];
  const m2 = msg.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
  if (m2?.[1]) return m2[1];
  return "";
}

async function insertWithColumnFallback(
  table: string,
  rows: InsertRow[],
  debugLabel: string
): Promise<{ ok: boolean; error?: any; missingRelation?: boolean }> {
  // Tentatives: insert direct -> si colonne manquante, on retire la colonne et on retente (max 6 colonnes)
  let current = rows.map((r) => ({ ...r }));
  for (let attempt = 0; attempt < 7; attempt++) {
    const { error } = await supabase.from(table).insert(current as any, { returning: "minimal" } as any);

    if (!error) return { ok: true };

    if (looksLikeMissingRelationError(error)) {
      console.warn(`[EventBuffer] ${debugLabel} relation missing for table '${table}'`, error);
      return { ok: false, error, missingRelation: true };
    }

    if (!looksLikeMissingColumnError(error)) {
      console.warn(`[EventBuffer] ${debugLabel} insert failed`, error);
      return { ok: false, error };
    }

    const col = extractMissingColumn(error);
    if (!col) {
      console.warn(`[EventBuffer] ${debugLabel} missing column (unknown)`, error);
      return { ok: false, error };
    }

    // remove column from all rows
    current = current.map((r) => {
      const c = { ...r };
      delete c[col];
      return c;
    });

    console.warn(`[EventBuffer] ${debugLabel} retry without column '${col}'`);
  }

  return { ok: false, error: new Error("Too many schema fallback attempts") };
}

export const EventBuffer = {
  /**
   * Push un évènement en buffer local.
   * - Ne jette jamais (failsafe)
   */
  async push(
    input: Omit<GameEvent, "id" | "created_at" | "synced" | "device_id" | "user_id"> & {
      user_id?: string;
      device_id?: string;
    }
  ) {
    try {
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const device_id = input.device_id || getDeviceId();

      // user_id: si pas connecté, on bufferise quand même (""), la sync attendra
      const user_id = String(input.user_id || "");

      const ev: GameEvent = {
        id,
        user_id,
        device_id,
        sport: input.sport,
        mode: input.mode,
        event_type: input.event_type,
        payload: input.payload ?? null,
        created_at: nowIso(),
        synced: false,
      };

      await idbPut(ev);

      // petit signal UI
      try {
        if (canUseWindow()) window.dispatchEvent(new Event("dc-events-buffer-updated"));
      } catch {}
    } catch (e) {
      console.warn("[EventBuffer] push failed", e);
    }
  },

  async listUnsynced(limit = 200): Promise<GameEvent[]> {
    try {
      return await idbListUnsynced(limit);
    } catch {
      return [];
    }
  },

  async markSynced(ids: string[]): Promise<void> {
    try {
      await idbMarkSynced(ids);
    } catch {}
  },

  /**
   * Envoie les events non syncés vers Supabase.
   *
   * ✅ Nouveau flux recommandé: table 'events'
   *   columns: event_id, user_id, device_id, type, payload, created_at
   *
   * 🔁 Fallback automatique: si la table 'events' n'existe pas (ancien projet),
   *    on retombe sur la table 'stats_events' avec le mapping legacy.
   *
   * - tolérant schéma (retire colonnes manquantes et retente)
   */
  async syncNow(opts?: { limit?: number }): Promise<void> {
    try {
      if (!isOnline()) return;

      const uid = await getAuthedUserId();
      if (!uid) return;

      const unsynced = await idbListUnsynced(opts?.limit ?? 200);
      if (!unsynced.length) return;

      const device_id = getDeviceId();

      // -------------------------------
      // 1) Chemin "events" (canonique)
      // -------------------------------
      const rowsEvents: InsertRow[] = unsynced.map((e) => ({
        event_id: e.id,
        user_id: (e.user_id || uid),
        device_id: e.device_id || device_id,
        type: `${e.sport}:${e.event_type}`,
        payload: {
          meta: {
            client_event_id: e.id,
            sport: e.sport,
            mode: e.mode,
            event_type: e.event_type,
            device_id: e.device_id || device_id,
            created_at: e.created_at,
          },
          data: e.payload ?? null,
        },
        created_at: e.created_at,
      }));

      const resEvents = await insertWithColumnFallback("events", rowsEvents, "events");
      if (resEvents.ok) {
        await idbMarkSynced(unsynced.map((e) => e.id));
        try {
          if (canUseWindow()) window.dispatchEvent(new Event("dc-events-synced"));
        } catch {}
        return;
      }

      // Si la relation "events" n'existe pas, on fallback (ancien schéma)
      if (!resEvents.missingRelation) return;

      // --------------------------------
      // 2) Fallback legacy: stats_events
      // --------------------------------
      const rowsLegacy: InsertRow[] = unsynced.map((e) => ({
        id: e.id,
        owner_user_id: (e.user_id || uid),
        type: `${e.sport}:${e.event_type}`,
        payload: {
          meta: {
            client_event_id: e.id,
            sport: e.sport,
            mode: e.mode,
            event_type: e.event_type,
            device_id: e.device_id || device_id,
            created_at: e.created_at,
          },
          data: e.payload ?? null,
        },
        created_at: e.created_at,
      }));

      const resLegacy = await insertWithColumnFallback("stats_events", rowsLegacy, "stats_events");
      if (!resLegacy.ok) return;

      await idbMarkSynced(unsynced.map((e) => e.id));

      try {
        if (canUseWindow()) window.dispatchEvent(new Event("dc-events-synced"));
      } catch {}
    } catch (e) {
      console.warn("[EventBuffer] syncNow failed", e);
    }
  },

  /**
   * Installe des triggers de sync :
   * - retour en ligne
   * - intervalle
   */
  
  /**
   * PULL cloud -> local
   * Récupère les events depuis Supabase (table events)
   * et les injecte en local s'ils n'existent pas déjà
   */
  async pullNow(): Promise<void> {
    try {
      if (!isOnline()) return;

      const uid = await getAuthedUserId();
      if (!uid) return;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: true });

      if (error || !data?.length) return;

      for (const row of data) {
        try {
          // si déjà présent localement, on ignore
          const existing = await withStore("readonly", async (st) => {
            return await new Promise<any>((resolve) => {
              const req = st.get(row.id);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
          });
          if (existing) continue;

          await idbPut({
            id: row.id,
            user_id: row.user_id,
            device_id: row.device_id,
            sport: row.sport,
            mode: row.mode,
            event_type: row.event_type,
            payload: row.payload,
            created_at: row.created_at,
            synced: true,
          });
        } catch {}
      }
    } catch (e) {
      console.warn("[EventBuffer] pullNow failed", e);
    }
  },

  installAutoSync(opts?: { intervalMs?: number }) {
    if (!canUseWindow()) return () => {};

    const onOnline = () => {
      EventBuffer.syncNow().catch(() => {});
    };
    window.addEventListener("online", onOnline);

    const intervalMs = Math.max(15_000, opts?.intervalMs ?? 45_000);
    const timer = window.setInterval(() => {
      EventBuffer.syncNow().catch(() => {});
    }, intervalMs);

    return () => {
      try {
        window.removeEventListener("online", onOnline);
      } catch {}
      try {
        window.clearInterval(timer);
      } catch {}
    };
  },
};
