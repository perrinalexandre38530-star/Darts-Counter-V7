// src/lib/x01CriticalCheckpoint.ts
// =============================================================
// X01 crash-safety checkpoint
// - ultra-light IndexedDB write on every validated visit/undo
// - stores raw darts + light config, no telemetry/compact/cloud work
// - used to rebuild the full match after an abrupt app/process stop
// =============================================================

import { getStorageUser, scopedStorageKey } from "./storage";

export type X01CriticalCheckpoint = {
  matchId: string;
  updatedAt: number;
  createdAt: number;
  config: any;
  darts: any[];
};

const DB_BASE = "dc-x01-critical-v1";
const DB_VERSION = 1;
const STORE = "matches";
const PAGEHIDE_FALLBACK_KEY = "dc-x01-critical-pagehide-v1";

function dbName(): string {
  try {
    const uid = getStorageUser();
    return uid ? `${DB_BASE}:${uid}` : DB_BASE;
  } catch {
    return DB_BASE;
  }
}

let cachedDbName = "";
let cachedDbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  const wantedName = dbName();
  if (cachedDbPromise && cachedDbName === wantedName) return cachedDbPromise;

  cachedDbName = wantedName;
  cachedDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      cachedDbPromise = null;
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(wantedName, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "matchId" });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        try { db.close(); } catch {}
        cachedDbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      cachedDbPromise = null;
      reject(req.error || new Error("Unable to open X01 critical checkpoint DB"));
    };
  });
  return cachedDbPromise;
}

export function warmX01CriticalCheckpointStorage(): void {
  void openDb().catch(() => {});
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("X01 critical checkpoint transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("X01 critical checkpoint transaction aborted"));
  });
}

function sanitizeConfig(config: any): any {
  if (!config || typeof config !== "object") return config ?? null;
  const players = Array.isArray(config.players)
    ? config.players.map((p: any) => {
        const clean: any = { ...(p || {}) };
        // Preserve every gameplay field (bot level, teams, handicap, order, etc.)
        // and remove only heavy inline media that can stall structured cloning.
        for (const key of ["avatarDataUrl", "photoDataUrl", "dartSetImageDataUrl", "dartsetImageDataUrl"]) {
          if (typeof clean[key] === "string" && clean[key].startsWith("data:")) delete clean[key];
        }
        for (const key of ["avatarUrl", "photoUrl", "imageUrl"]) {
          if (typeof clean[key] === "string" && clean[key].startsWith("data:")) delete clean[key];
        }
        return clean;
      })
    : [];
  return { ...config, players };
}

export async function saveX01CriticalCheckpoint(input: {
  matchId: string;
  config: any;
  darts: any[];
  createdAt?: number;
}): Promise<void> {
  const matchId = String(input?.matchId || "").trim();
  if (!matchId) return;

  const now = Date.now();
  const record: X01CriticalCheckpoint = {
    matchId,
    createdAt: Number(input?.createdAt || now),
    updatedAt: now,
    config: sanitizeConfig(input?.config),
    darts: Array.isArray(input?.darts) ? input.darts.slice() : [],
  };

  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(record);
  await txDone(tx);
}

export async function getX01CriticalCheckpoint(matchId: string): Promise<X01CriticalCheckpoint | null> {
  const id = String(matchId || "").trim();
  if (!id) return null;

  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const st = tx.objectStore(STORE);
    const value = await new Promise<any>((resolve) => {
      const req = st.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    await txDone(tx).catch(() => {});
    if (value && String(value.matchId || "") === id) return value as X01CriticalCheckpoint;
    return readX01PagehideFallback(id);
  } catch {
    return readX01PagehideFallback(id);
  }
}

export async function clearX01CriticalCheckpoint(matchId: string): Promise<void> {
  const id = String(matchId || "").trim();
  if (!id) return;

  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  } catch {}

  try {
    const key = scopedStorageKey(PAGEHIDE_FALLBACK_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (String(parsed?.matchId || "") === id) localStorage.removeItem(key);
  } catch {}
}

// Synchronous emergency copy used only when the document is hidden/pagehide.
// It never runs on normal keypad presses, so it cannot create gameplay jank.
export function writeX01PagehideFallback(input: {
  matchId: string;
  config: any;
  darts: any[];
  createdAt?: number;
}): void {
  try {
    if (typeof localStorage === "undefined") return;
    const matchId = String(input?.matchId || "").trim();
    if (!matchId) return;
    const now = Date.now();
    const payload: X01CriticalCheckpoint = {
      matchId,
      createdAt: Number(input?.createdAt || now),
      updatedAt: now,
      config: sanitizeConfig(input?.config),
      darts: Array.isArray(input?.darts) ? input.darts.slice() : [],
    };
    localStorage.setItem(scopedStorageKey(PAGEHIDE_FALLBACK_KEY), JSON.stringify(payload));
  } catch {}
}

export function readX01PagehideFallback(matchId: string): X01CriticalCheckpoint | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(scopedStorageKey(PAGEHIDE_FALLBACK_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (String(parsed?.matchId || "") !== String(matchId || "")) return null;
    if (!Array.isArray(parsed?.darts)) return null;
    return parsed as X01CriticalCheckpoint;
  } catch {
    return null;
  }
}
