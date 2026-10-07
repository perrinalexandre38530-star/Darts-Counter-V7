// Incremental backup journal V1
// Compact local change journal: one latest record per logical entity.
// It never replaces manual full backups; it only prevents rebuilding/sending a
// full account snapshot after every small mutation.

export type IncrementalEntityType =
  | "profile"
  | "store_meta"
  | "team"
  | "match"
  | "settings"
  | "generic";

export type IncrementalChange = {
  key: string;
  entityType: IncrementalEntityType;
  entityId: string;
  op: "upsert" | "delete";
  updatedAt: number;
  revision: string;
  payload?: any;
};

type JournalMeta = {
  key: string;
  value: any;
};

const DB_NAME = "dc-incremental-backup-v1";
const DB_VERSION = 1;
const STORE_CHANGES = "changes";
const STORE_META = "meta";
const LAST_CHECKPOINT_KEY = "lastCheckpoint";
const SYNC_META_PREFIX = "synced:";
const MAX_PENDING_BEFORE_CHECKPOINT = 50;
const MAX_CHECKPOINT_AGE_MS = 24 * 60 * 60 * 1000;
let incrementalRecordingSuppressDepth = 0;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHANGES)) db.createObjectStore(STORE_CHANGES, { keyPath: "key" });
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function stableJson(value: any): string {
  try { return JSON.stringify(value ?? null); } catch { return "null"; }
}

function changeKey(entityType: string, entityId: string): string {
  return `${String(entityType || "generic")}:${String(entityId || "default")}`;
}

export async function withIncrementalRecordingSuppressed<T>(run: () => Promise<T>): Promise<T> {
  incrementalRecordingSuppressDepth += 1;
  try { return await run(); } finally { incrementalRecordingSuppressDepth = Math.max(0, incrementalRecordingSuppressDepth - 1); }
}

export async function recordIncrementalChange(args: {
  entityType: IncrementalEntityType;
  entityId: string;
  op?: "upsert" | "delete";
  payload?: any;
  updatedAt?: number;
}): Promise<boolean> {
  if (incrementalRecordingSuppressDepth > 0 || typeof indexedDB === "undefined") return false;
  const entityType = args.entityType || "generic";
  const entityId = String(args.entityId || "default").trim() || "default";
  const op = args.op || "upsert";
  const updatedAt = Number(args.updatedAt || Date.now());
  const json = op === "delete" ? "delete" : stableJson(args.payload);
  const revision = hashText(`${op}|${json}`);
  const key = changeKey(entityType, entityId);
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_CHANGES, "readwrite");
    const store = tx.objectStore(STORE_CHANGES);
    const existing = await new Promise<IncrementalChange | null>((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (existing?.revision === revision && existing?.op === op) return false;
    const row: IncrementalChange = { key, entityType, entityId, op, updatedAt, revision, ...(op === "upsert" ? { payload: args.payload } : {}) };
    await new Promise<void>((resolve, reject) => {
      const req = store.put(row);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    try { window.dispatchEvent(new CustomEvent("dc:incremental-backup-change", { detail: { key, entityType, entityId } })); } catch {}
    return true;
  } finally {
    db.close();
  }
}

export async function listIncrementalChanges(): Promise<IncrementalChange[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_CHANGES, "readonly");
    return await new Promise<IncrementalChange[]>((resolve) => {
      const req = tx.objectStore(STORE_CHANGES).getAll();
      req.onsuccess = () => resolve((Array.isArray(req.result) ? req.result : []).sort((a, b) => Number(a.updatedAt || 0) - Number(b.updatedAt || 0)));
      req.onerror = () => resolve([]);
    });
  } finally { db.close(); }
}


export async function listUnsyncedIncrementalChanges(provider: string): Promise<IncrementalChange[]> {
  const changes = await listIncrementalChanges();
  if (!changes.length || typeof indexedDB === "undefined") return changes;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_META, "readonly");
    const store = tx.objectStore(STORE_META);
    const out: IncrementalChange[] = [];
    for (const change of changes) {
      const key = `${SYNC_META_PREFIX}${provider}:${change.key}`;
      const row = await new Promise<JournalMeta | null>((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (String(row?.value?.revision || "") !== String(change.revision || "")) out.push(change);
    }
    return out;
  } finally { db.close(); }
}

export async function markIncrementalProviderSynced(provider: string, changes: IncrementalChange[]): Promise<void> {
  if (!changes.length || typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_META, "readwrite");
    const store = tx.objectStore(STORE_META);
    const at = Date.now();
    for (const change of changes) {
      store.put({ key: `${SYNC_META_PREFIX}${provider}:${change.key}`, value: { revision: change.revision, at } });
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); tx.onabort = () => resolve();
    });
  } finally { db.close(); }
}

export async function getIncrementalBackupStats(): Promise<{ pending: number; lastCheckpointAt: number; oldestChangeAt: number | null; newestChangeAt: number | null }> {
  const changes = await listIncrementalChanges();
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_META, "readonly");
    const meta = await new Promise<JournalMeta | null>((resolve) => {
      const req = tx.objectStore(STORE_META).get(LAST_CHECKPOINT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    return {
      pending: changes.length,
      lastCheckpointAt: Number(meta?.value?.at || 0),
      oldestChangeAt: changes.length ? Number(changes[0]?.updatedAt || 0) : null,
      newestChangeAt: changes.length ? Number(changes[changes.length - 1]?.updatedAt || 0) : null,
    };
  } finally { db.close(); }
}

export async function shouldCreateIncrementalCheckpoint(now = Date.now()): Promise<boolean> {
  const stats = await getIncrementalBackupStats();
  if (!stats.pending) return false;
  if (stats.pending >= MAX_PENDING_BEFORE_CHECKPOINT) return true;
  if (!stats.lastCheckpointAt) return false;
  return now - stats.lastCheckpointAt >= MAX_CHECKPOINT_AGE_MS;
}

export async function markIncrementalCheckpoint(metadata: Record<string, any> = {}): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    const tx = db.transaction([STORE_CHANGES, STORE_META], "readwrite");
    tx.objectStore(STORE_CHANGES).clear();
    tx.objectStore(STORE_META).put({ key: LAST_CHECKPOINT_KEY, value: { at: Date.now(), ...metadata } });
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } finally { db.close(); }
}

export async function exportIncrementalJournal(): Promise<{ version: 1; changes: IncrementalChange[]; stats: Awaited<ReturnType<typeof getIncrementalBackupStats>> }> {
  return { version: 1, changes: await listIncrementalChanges(), stats: await getIncrementalBackupStats() };
}
