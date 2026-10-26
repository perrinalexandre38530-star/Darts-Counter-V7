import LZString from "lz-string";

export const HISTORY_V4_SCHEMA_VERSION = 4 as const;
export const HISTORY_DB_BASE_V4 = "dc-store-v1";
export const HISTORY_DB_VERSION_V4 = 4;

export const HISTORY_V4_HEADERS = "match_headers_v4";
export const HISTORY_V4_PAYLOADS = "match_payloads_v4";
export const HISTORY_V4_TOMBSTONES = "match_tombstones_v4";
export const HISTORY_V4_INDEX = "match_index_v4";

const LEGACY_HEADERS = "history_headers";
const LEGACY_DETAILS = "history_details";
const META_ID = "__history_v4_meta__";

type AnyRecord = Record<string, any>;

export type HistoryV4Tombstone = {
  id: string;
  matchId?: string;
  deletedAt: number;
  reason: string;
  schemaVersion: 4;
};

export type HistoryV4IndexRow = {
  id: string;
  matchId?: string;
  kind: "match" | "meta";
  schemaVersion: 4;
  status?: string;
  mode?: string;
  createdAt?: number;
  updatedAt?: number;
  finishedAt?: number;
  playerIds?: string[];
  deleted?: boolean;
  revision?: number;
  migratedAt?: number;
  lastBackfillAt?: number;
};

export type HistoryV4Snapshot = {
  schemaVersion: 4;
  rows: Record<string, any>;
  tombstones: Record<string, HistoryV4Tombstone>;
  meta: {
    exportedAt: number;
    activeRows: number;
    tombstones: number;
  };
};

function cleanId(value: any): string {
  return String(value ?? "").trim();
}

function toTs(value: any): number {
  const n = Number(value || 0);
  if (Number.isFinite(n) && n > 0) return n;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function detectHistoryScopeUserId(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem("dc_storage_user_id_v1") || localStorage.getItem("dc_user_id") || localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        return cleanId(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id) || null;
      } catch {
        return null;
      }
    }
    return cleanId(raw) || null;
  } catch {
    return null;
  }
}

export function historyV4DbName(): string {
  const uid = detectHistoryScopeUserId();
  return uid ? `${HISTORY_DB_BASE_V4}:${uid}` : HISTORY_DB_BASE_V4;
}

function ensureIndex(store: IDBObjectStore, name: string, path: string, options?: IDBIndexParameters): void {
  try {
    if (!(store.indexNames as any)?.contains?.(name)) store.createIndex(name, path, options || { unique: false });
  } catch {
    try { store.createIndex(name, path, options || { unique: false }); } catch {}
  }
}

/** Called from every history DB upgrader so DB version 4 can never exist without the canonical stores. */
export function ensureHistoryV4Stores(db: IDBDatabase, tx?: IDBTransaction | null): void {
  const getOrCreate = (name: string): IDBObjectStore => {
    if (!db.objectStoreNames.contains(name)) return db.createObjectStore(name, { keyPath: "id" });
    if (!tx) throw new Error(`History V4 upgrade transaction missing for ${name}`);
    return tx.objectStore(name);
  };

  const headers = getOrCreate(HISTORY_V4_HEADERS);
  ensureIndex(headers, "by_updatedAt", "updatedAt");
  ensureIndex(headers, "by_createdAt", "createdAt");
  ensureIndex(headers, "by_status", "status");
  ensureIndex(headers, "by_matchId", "matchId");

  const payloads = getOrCreate(HISTORY_V4_PAYLOADS);
  ensureIndex(payloads, "by_updatedAt", "updatedAt");

  const tombstones = getOrCreate(HISTORY_V4_TOMBSTONES);
  ensureIndex(tombstones, "by_deletedAt", "deletedAt");

  const index = getOrCreate(HISTORY_V4_INDEX);
  ensureIndex(index, "by_updatedAt", "updatedAt");
  ensureIndex(index, "by_createdAt", "createdAt");
  ensureIndex(index, "by_status", "status");
  ensureIndex(index, "by_mode", "mode");
  ensureIndex(index, "by_deleted", "deleted");
}

let dbCache: { name: string; db: IDBDatabase | null; pending: Promise<IDBDatabase> | null } = { name: "", db: null, pending: null };

function clearDbCache(): void {
  try { dbCache.db?.close?.(); } catch {}
  dbCache = { name: "", db: null, pending: null };
}

export function openHistoryV4Db(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  const name = historyV4DbName();
  if (dbCache.name === name && dbCache.db) return Promise.resolve(dbCache.db);
  if (dbCache.name === name && dbCache.pending) return dbCache.pending;
  if (dbCache.name && dbCache.name !== name) clearDbCache();

  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, HISTORY_DB_VERSION_V4);
    req.onupgradeneeded = () => {
      try {
        // Keep the legacy split stores available because History.list/get still use them during the transition.
        if (!req.result.objectStoreNames.contains(LEGACY_HEADERS)) {
          const st = req.result.createObjectStore(LEGACY_HEADERS, { keyPath: "id" });
          ensureIndex(st, "by_updatedAt", "updatedAt");
          ensureIndex(st, "by_matchId", "matchId");
        }
        if (!req.result.objectStoreNames.contains(LEGACY_DETAILS)) {
          const st = req.result.createObjectStore(LEGACY_DETAILS, { keyPath: "id" });
          ensureIndex(st, "by_updatedAt", "updatedAt");
        }
        ensureHistoryV4Stores(req.result, req.transaction);
      } catch (error) {
        console.warn("[history-v4] schema upgrade warning", error);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      try {
        db.onversionchange = () => { try { db.close(); } catch {} clearDbCache(); };
        (db as any).onclose = () => { if (dbCache.db === db) clearDbCache(); };
      } catch {}
      dbCache = { name, db, pending: null };
      resolve(db);
    };
    req.onerror = () => {
      if (dbCache.name === name) dbCache.pending = null;
      reject(req.error || new Error("History V4 IndexedDB open failed"));
    };
    req.onblocked = () => reject(new Error("History V4 IndexedDB upgrade blocked"));
  });
  dbCache = { name, db: null, pending };
  return pending;
}

function reqValue<T = any>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("History V4 transaction aborted"));
  });
}

async function getAll(store: IDBObjectStore): Promise<any[]> {
  if (typeof (store as any).getAll === "function") return (await reqValue((store as any).getAll())) || [];
  const rows: any[] = [];
  await new Promise<void>((resolve, reject) => {
    const req = store.openCursor();
    req.onsuccess = () => {
      const cur = req.result as IDBCursorWithValue | null;
      if (!cur) return resolve();
      rows.push(cur.value);
      cur.continue();
    };
    req.onerror = () => reject(req.error);
  });
  return rows;
}

function isFinished(rec: any): boolean {
  const status = String(rec?.status || rec?.summary?.status || "").trim().toLowerCase();
  return ["finished", "done", "ended", "complete", "completed", "match_end"].includes(status)
    || !!rec?.winnerId || rec?.summary?.finished === true || toTs(rec?.finishedAt) > 0;
}

function inferMode(rec: any): string {
  const parts = [rec?.game, rec?.mode, rec?.kind, rec?.variant, rec?.variantId, rec?.summary?.mode, rec?.summary?.variantId]
    .filter(Boolean).map((value) => String(value).toLowerCase()).join(" ");
  if (parts.includes("x01") || parts.includes("301") || parts.includes("501")) return "x01";
  if (parts.includes("cricket") || parts.includes("cut throat") || parts.includes("cut_throat")) return "cricket";
  if (parts.includes("babyfoot") || parts.includes("foosball")) return "babyfoot";
  return cleanId(rec?.mode || rec?.game || rec?.kind || "unknown").toLowerCase() || "unknown";
}

function collectPlayerIds(rec: any): string[] {
  const values: string[] = [];
  const add = (value: any) => { const id = cleanId(value); if (id && !values.includes(id)) values.push(id); };
  const players = Array.isArray(rec?.players) ? rec.players : [];
  for (const player of players) add(player?.profileId || player?.playerId || player?.id || player?.uid);
  const summaryPlayers = Array.isArray(rec?.summary?.players) ? rec.summary.players : [];
  for (const player of summaryPlayers) add(player?.profileId || player?.playerId || player?.id || player?.uid);
  add(rec?.winnerId);
  return values;
}

function toCanonicalHeader(rec: any): any {
  const out: any = { ...(rec || {}) };
  delete out.payload;
  delete out.payloadCompressed;
  out.schemaVersion = HISTORY_V4_SCHEMA_VERSION;
  out.canonicalHistory = true;
  return out;
}

function toCanonicalPayload(id: string, rec: any, payloadCompressed?: string): any {
  const updatedAt = toTs(rec?.updatedAt) || Date.now();
  return {
    id,
    matchId: cleanId(rec?.matchId || id) || id,
    schemaVersion: HISTORY_V4_SCHEMA_VERSION,
    createdAt: toTs(rec?.createdAt) || updatedAt,
    updatedAt,
    payloadCompressed: String(payloadCompressed ?? rec?.payloadCompressed ?? ""),
  };
}

function toCanonicalIndex(id: string, rec: any, revision: number, deleted = false): HistoryV4IndexRow {
  return {
    id,
    matchId: cleanId(rec?.matchId || id) || id,
    kind: "match",
    schemaVersion: HISTORY_V4_SCHEMA_VERSION,
    status: String(rec?.status || ""),
    mode: inferMode(rec),
    createdAt: toTs(rec?.createdAt) || undefined,
    updatedAt: toTs(rec?.updatedAt) || Date.now(),
    finishedAt: toTs(rec?.finishedAt || rec?.summary?.finishedAt) || undefined,
    playerIds: collectPlayerIds(rec),
    deleted,
    revision: Math.max(1, Number(revision || 1)),
  };
}

function decodePayload(raw: any): any | null {
  const value = String(raw || "");
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed); } catch {}
  }
  try {
    const json = LZString.decompressFromUTF16(value) || LZString.decompress(value) || "";
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

let backfillPromise: Promise<{ migrated: number; active: number }> | null = null;

export async function ensureHistoryV4Backfill(): Promise<{ migrated: number; active: number }> {
  if (backfillPromise) return backfillPromise;
  backfillPromise = (async () => {
    const db = await openHistoryV4Db();
    if (!db.objectStoreNames.contains(LEGACY_HEADERS) || !db.objectStoreNames.contains(LEGACY_DETAILS)) {
      return { migrated: 0, active: 0 };
    }

    const metaTx = db.transaction(HISTORY_V4_INDEX, "readonly");
    const meta = await reqValue<any>(metaTx.objectStore(HISTORY_V4_INDEX).get(META_ID)).catch(() => null);
    await txDone(metaTx).catch(() => {});
    if (Number(meta?.schemaVersion || 0) === HISTORY_V4_SCHEMA_VERSION && Number(meta?.migratedAt || 0) > 0) {
      // V123 SINGLE SOURCE: le marqueur de migration ne suffit pas. Certains anciens
      // restores/imports ont encore pu écrire dans les stores legacy APRÈS la création
      // du marqueur V4. On vérifie donc qu'aucune ligne legacy absente/plus récente
      // n'attend d'être absorbée par History V4 avant de considérer le backfill terminé.
      const probeTx = db.transaction([LEGACY_HEADERS, HISTORY_V4_INDEX], "readonly");
      const [legacyHeadersProbe, all] = await Promise.all([
        getAll(probeTx.objectStore(LEGACY_HEADERS)).catch(() => []),
        getAll(probeTx.objectStore(HISTORY_V4_INDEX)).catch(() => []),
      ]);
      await txDone(probeTx).catch(() => {});
      const activeRows = all.filter((row) => row?.kind === "match" && !row?.deleted);
      const byId = new Map(activeRows.map((row) => [cleanId(row?.id), row]));
      const needsReconcile = legacyHeadersProbe.some((row) => {
        const id = cleanId(row?.id || row?.matchId);
        if (!id) return false;
        const current = byId.get(id);
        if (!current) return true;
        return toTs(row?.updatedAt) > toTs(current?.updatedAt);
      });
      if (!needsReconcile) return { migrated: 0, active: activeRows.length };
    }

    const readTx = db.transaction([LEGACY_HEADERS, LEGACY_DETAILS, HISTORY_V4_HEADERS, HISTORY_V4_INDEX], "readonly");
    const [legacyHeaders, legacyDetails, currentHeaders, currentIndex] = await Promise.all([
      getAll(readTx.objectStore(LEGACY_HEADERS)),
      getAll(readTx.objectStore(LEGACY_DETAILS)),
      getAll(readTx.objectStore(HISTORY_V4_HEADERS)),
      getAll(readTx.objectStore(HISTORY_V4_INDEX)),
    ]);
    await txDone(readTx).catch(() => {});

    const detailById = new Map<string, any>();
    for (const row of legacyDetails) detailById.set(cleanId(row?.id || row?.matchId), row);
    const existingHeaderById = new Map<string, any>();
    for (const row of currentHeaders) existingHeaderById.set(cleanId(row?.id || row?.matchId), row);
    const existingIndexById = new Map<string, any>();
    for (const row of currentIndex) if (row?.kind === "match") existingIndexById.set(cleanId(row?.id), row);

    let migrated = 0;
    const writeTx = db.transaction([HISTORY_V4_HEADERS, HISTORY_V4_PAYLOADS, HISTORY_V4_INDEX], "readwrite");
    const hStore = writeTx.objectStore(HISTORY_V4_HEADERS);
    const pStore = writeTx.objectStore(HISTORY_V4_PAYLOADS);
    const iStore = writeTx.objectStore(HISTORY_V4_INDEX);
    for (const raw of legacyHeaders) {
      const id = cleanId(raw?.id || raw?.matchId);
      if (!id) continue;
      const existing = existingHeaderById.get(id);
      // Never downgrade a V4 record with an older legacy mirror.
      if (existing && toTs(existing?.updatedAt) > toTs(raw?.updatedAt)) continue;
      const detail = detailById.get(id) || null;
      hStore.put(toCanonicalHeader({ ...raw, id, matchId: cleanId(raw?.matchId || id) || id }));
      pStore.put(toCanonicalPayload(id, raw, detail?.payloadCompressed || raw?.payloadCompressed || ""));
      const previousRevision = Number(existingIndexById.get(id)?.revision || 0);
      iStore.put(toCanonicalIndex(id, raw, Math.max(1, previousRevision || 1), false));
      migrated += 1;
    }
    iStore.put({
      id: META_ID,
      kind: "meta",
      schemaVersion: HISTORY_V4_SCHEMA_VERSION,
      migratedAt: Date.now(),
      lastBackfillAt: Date.now(),
      deleted: false,
    } satisfies HistoryV4IndexRow);
    await txDone(writeTx);

    return { migrated, active: legacyHeaders.length };
  })();
  try {
    return await backfillPromise;
  } finally {
    backfillPromise = null;
  }
}

export async function upsertCanonicalHistoryV4(rec: any, payloadCompressed?: string): Promise<boolean> {
  const id = cleanId(rec?.id || rec?.matchId || rec?.resumeId);
  if (!id) return false;
  await ensureHistoryV4Backfill();
  const db = await openHistoryV4Db();

  const readTx = db.transaction([HISTORY_V4_HEADERS, HISTORY_V4_INDEX, HISTORY_V4_TOMBSTONES], "readonly");
  const [existing, existingIndex, tombstone] = await Promise.all([
    reqValue<any>(readTx.objectStore(HISTORY_V4_HEADERS).get(id)).catch(() => null),
    reqValue<any>(readTx.objectStore(HISTORY_V4_INDEX).get(id)).catch(() => null),
    reqValue<any>(readTx.objectStore(HISTORY_V4_TOMBSTONES).get(id)).catch(() => null),
  ]);
  await txDone(readTx).catch(() => {});
  if (tombstone) return false;
  if (existing && isFinished(existing) && !isFinished(rec)) return false;

  const merged = existing && isFinished(existing) && isFinished(rec)
    ? { ...existing, ...rec, createdAt: toTs(existing?.createdAt) || toTs(rec?.createdAt), finishedAt: Math.max(toTs(existing?.finishedAt), toTs(rec?.finishedAt)) || undefined }
    : { ...(existing || {}), ...(rec || {}) };
  merged.id = id;
  merged.matchId = cleanId(merged?.matchId || id) || id;
  merged.updatedAt = Math.max(toTs(existing?.updatedAt), toTs(rec?.updatedAt)) || Date.now();

  const tx = db.transaction([HISTORY_V4_HEADERS, HISTORY_V4_PAYLOADS, HISTORY_V4_INDEX], "readwrite");
  tx.objectStore(HISTORY_V4_HEADERS).put(toCanonicalHeader(merged));
  tx.objectStore(HISTORY_V4_PAYLOADS).put(toCanonicalPayload(id, merged, payloadCompressed));
  tx.objectStore(HISTORY_V4_INDEX).put(toCanonicalIndex(id, merged, Number(existingIndex?.revision || 0) + 1, false));
  await txDone(tx);
  return true;
}

export async function tombstoneCanonicalHistoryV4(idsInput: Iterable<any>, reason = "user_delete"): Promise<number> {
  await ensureHistoryV4Backfill();
  const ids = Array.from(new Set(Array.from(idsInput || []).map(cleanId).filter(Boolean)));
  if (!ids.length) return 0;
  const db = await openHistoryV4Db();
  const tx = db.transaction([HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX], "readwrite");
  const tStore = tx.objectStore(HISTORY_V4_TOMBSTONES);
  const iStore = tx.objectStore(HISTORY_V4_INDEX);
  const now = Date.now();
  for (const id of ids) {
    tStore.put({ id, matchId: id, deletedAt: now, reason, schemaVersion: HISTORY_V4_SCHEMA_VERSION } satisfies HistoryV4Tombstone);
    const req = iStore.get(id);
    req.onsuccess = () => {
      const current = req.result as HistoryV4IndexRow | undefined;
      if (current) iStore.put({ ...current, deleted: true, updatedAt: Math.max(Number(current.updatedAt || 0), now) });
    };
  }
  await txDone(tx);
  return ids.length;
}

export async function tombstoneAllCanonicalHistoryV4(reason = "user_clear"): Promise<number> {
  await ensureHistoryV4Backfill();
  const db = await openHistoryV4Db();
  const tx = db.transaction(HISTORY_V4_INDEX, "readonly");
  const rows = await getAll(tx.objectStore(HISTORY_V4_INDEX));
  await txDone(tx).catch(() => {});
  const ids = rows.filter((row) => row?.kind === "match" && !row?.deleted).map((row) => cleanId(row?.id)).filter(Boolean);
  return tombstoneCanonicalHistoryV4(ids, reason);
}

export async function reviveCanonicalHistoryV4(idsInput: Iterable<any>): Promise<number> {
  await ensureHistoryV4Backfill();
  const ids = Array.from(new Set(Array.from(idsInput || []).map(cleanId).filter(Boolean)));
  if (!ids.length) return 0;
  const db = await openHistoryV4Db();
  const tx = db.transaction([HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX], "readwrite");
  const tStore = tx.objectStore(HISTORY_V4_TOMBSTONES);
  const iStore = tx.objectStore(HISTORY_V4_INDEX);
  for (const id of ids) {
    tStore.delete(id);
    const req = iStore.get(id);
    req.onsuccess = () => {
      const current = req.result as HistoryV4IndexRow | undefined;
      if (current) iStore.put({ ...current, deleted: false, updatedAt: Math.max(Number(current.updatedAt || 0), Date.now()) });
    };
  }
  await txDone(tx);
  return ids.length;
}

export async function listCanonicalHistoryV4(options?: { hydratePayload?: boolean; includeDeleted?: boolean }): Promise<any[]> {
  await ensureHistoryV4Backfill();
  const db = await openHistoryV4Db();
  const stores = options?.hydratePayload
    ? [HISTORY_V4_HEADERS, HISTORY_V4_PAYLOADS, HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX]
    : [HISTORY_V4_HEADERS, HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX];
  const tx = db.transaction(stores, "readonly");
  const [headers, tombstones, indexes] = await Promise.all([
    getAll(tx.objectStore(HISTORY_V4_HEADERS)),
    getAll(tx.objectStore(HISTORY_V4_TOMBSTONES)),
    getAll(tx.objectStore(HISTORY_V4_INDEX)),
  ]);
  let payloads: any[] = [];
  if (options?.hydratePayload) payloads = await getAll(tx.objectStore(HISTORY_V4_PAYLOADS));
  await txDone(tx).catch(() => {});

  const payloadById = options?.hydratePayload ? new Map(payloads.map((row) => [cleanId(row?.id), row])) : new Map<string, any>();
  const tombstoneIds = new Set(tombstones.map((row) => cleanId(row?.id)).filter(Boolean));
  const indexById = new Map(indexes.filter((row) => row?.kind === "match").map((row) => [cleanId(row?.id), row]));
  const out: any[] = [];
  for (const header of headers) {
    const id = cleanId(header?.id || header?.matchId);
    if (!id) continue;
    const deleted = tombstoneIds.has(id) || indexById.get(id)?.deleted === true;
    if (deleted && !options?.includeDeleted) continue;
    const row: any = { ...header, id, matchId: cleanId(header?.matchId || id) || id };
    if (options?.hydratePayload) {
      const payloadRow = payloadById.get(id) || null;
      row.payloadCompressed = String(payloadRow?.payloadCompressed || "");
      const payload = decodePayload(row.payloadCompressed);
      if (payload && typeof payload === "object") row.payload = payload;
    }
    if (deleted) row.deleted = true;
    out.push(row);
  }
  out.sort((a, b) => (toTs(b?.updatedAt) || toTs(b?.createdAt)) - (toTs(a?.updatedAt) || toTs(a?.createdAt)));
  return out;
}

export async function getCanonicalHistoryV4(idInput: any, options?: { hydratePayload?: boolean; includeDeleted?: boolean }): Promise<any | null> {
  const wanted = cleanId(idInput);
  if (!wanted) return null;
  await ensureHistoryV4Backfill();
  const db = await openHistoryV4Db();

  const stores = options?.hydratePayload
    ? [HISTORY_V4_HEADERS, HISTORY_V4_PAYLOADS, HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX]
    : [HISTORY_V4_HEADERS, HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX];
  const tx = db.transaction(stores, "readonly");
  const headers = tx.objectStore(HISTORY_V4_HEADERS);
  let header = await reqValue<any>(headers.get(wanted)).catch(() => null);
  if (!header) {
    try { header = await reqValue<any>(headers.index("by_matchId").get(wanted)).catch(() => null); } catch {}
  }
  if (!header) {
    await txDone(tx).catch(() => {});
    return null;
  }

  const id = cleanId(header?.id || header?.matchId || wanted);
  const [tombstone, indexRow] = await Promise.all([
    reqValue<any>(tx.objectStore(HISTORY_V4_TOMBSTONES).get(id)).catch(() => null),
    reqValue<any>(tx.objectStore(HISTORY_V4_INDEX).get(id)).catch(() => null),
  ]);
  const deleted = !!tombstone || indexRow?.deleted === true;
  if (deleted && !options?.includeDeleted) {
    await txDone(tx).catch(() => {});
    return null;
  }

  const row: any = { ...header, id, matchId: cleanId(header?.matchId || id) || id };
  if (options?.hydratePayload) {
    const payloadRow = await reqValue<any>(tx.objectStore(HISTORY_V4_PAYLOADS).get(id)).catch(() => null);
    row.payloadCompressed = String(payloadRow?.payloadCompressed || "");
    const payload = decodePayload(row.payloadCompressed);
    if (payload && typeof payload === "object") row.payload = payload;
  }
  await txDone(tx).catch(() => {});
  if (deleted) row.deleted = true;
  return row;
}

export async function listHistoryV4Tombstones(): Promise<HistoryV4Tombstone[]> {
  await ensureHistoryV4Backfill();
  const db = await openHistoryV4Db();
  const tx = db.transaction(HISTORY_V4_TOMBSTONES, "readonly");
  const rows = await getAll(tx.objectStore(HISTORY_V4_TOMBSTONES));
  await txDone(tx).catch(() => {});
  return rows as HistoryV4Tombstone[];
}

export async function exportHistoryV4Snapshot(): Promise<HistoryV4Snapshot> {
  const [rows, tombstones] = await Promise.all([
    listCanonicalHistoryV4({ hydratePayload: false, includeDeleted: true }),
    listHistoryV4Tombstones(),
  ]);
  const rowMap: Record<string, any> = {};
  for (const row of rows) {
    const id = cleanId(row?.id || row?.matchId);
    if (!id) continue;
    const copy = { ...row };
    delete copy.deleted;
    rowMap[id] = copy;
  }
  const tombstoneMap: Record<string, HistoryV4Tombstone> = {};
  for (const tombstone of tombstones) if (cleanId(tombstone?.id)) tombstoneMap[cleanId(tombstone.id)] = tombstone;
  const deleted = new Set(Object.keys(tombstoneMap));
  return {
    schemaVersion: HISTORY_V4_SCHEMA_VERSION,
    rows: rowMap,
    tombstones: tombstoneMap,
    meta: {
      exportedAt: Date.now(),
      activeRows: Object.keys(rowMap).filter((id) => !deleted.has(id)).length,
      tombstones: Object.keys(tombstoneMap).length,
    },
  };
}

export async function importHistoryV4Snapshot(
  snapshot: Partial<HistoryV4Snapshot> | null | undefined,
  options?: { replace?: boolean },
): Promise<{ imported: number; tombstoned: number }> {
  if (!snapshot || Number(snapshot.schemaVersion || 0) !== HISTORY_V4_SCHEMA_VERSION) return { imported: 0, tombstoned: 0 };
  await ensureHistoryV4Backfill();
  const rows = snapshot.rows && typeof snapshot.rows === "object" ? snapshot.rows : {};
  const incomingTombstones = snapshot.tombstones && typeof snapshot.tombstones === "object" ? snapshot.tombstones : {};

  if (options?.replace) {
    const current = await listCanonicalHistoryV4({ includeDeleted: false });
    const incomingActive = new Set(Object.keys(rows).filter((id) => !incomingTombstones[id]));
    const absent = current.map((row) => cleanId(row?.id)).filter((id) => id && !incomingActive.has(id));
    if (absent.length) await tombstoneCanonicalHistoryV4(absent, "restore_replace");
  }

  let imported = 0;
  for (const [idRaw, rowRaw] of Object.entries<any>(rows)) {
    const id = cleanId(idRaw || rowRaw?.id || rowRaw?.matchId);
    if (!id || incomingTombstones[id]) continue;
    if (options?.replace) await reviveCanonicalHistoryV4([id]);
    const ok = await upsertCanonicalHistoryV4({ ...(rowRaw || {}), id, matchId: cleanId(rowRaw?.matchId || id) || id }, rowRaw?.payloadCompressed || "");
    if (ok) imported += 1;
  }

  const tombstoneRows = Object.values<any>(incomingTombstones);
  if (tombstoneRows.length) {
    const db = await openHistoryV4Db();
    const tx = db.transaction([HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX], "readwrite");
    const tStore = tx.objectStore(HISTORY_V4_TOMBSTONES);
    const iStore = tx.objectStore(HISTORY_V4_INDEX);
    for (const raw of tombstoneRows) {
      const id = cleanId(raw?.id || raw?.matchId);
      if (!id) continue;
      const tombstone: HistoryV4Tombstone = {
        id,
        matchId: cleanId(raw?.matchId || id) || id,
        deletedAt: toTs(raw?.deletedAt) || Date.now(),
        reason: String(raw?.reason || "snapshot_delete"),
        schemaVersion: HISTORY_V4_SCHEMA_VERSION,
      };
      tStore.put(tombstone);
      const req = iStore.get(id);
      req.onsuccess = () => {
        const current = req.result as HistoryV4IndexRow | undefined;
        if (current) iStore.put({ ...current, deleted: true, updatedAt: Math.max(Number(current.updatedAt || 0), tombstone.deletedAt) });
      };
    }
    await txDone(tx);
  }

  return { imported, tombstoned: tombstoneRows.length };
}

export async function historyV4Diagnostics(): Promise<{ schemaVersion: 4; active: number; totalHeaders: number; tombstones: number; payloads: number }> {
  await ensureHistoryV4Backfill();
  const db = await openHistoryV4Db();
  const tx = db.transaction([HISTORY_V4_HEADERS, HISTORY_V4_PAYLOADS, HISTORY_V4_TOMBSTONES, HISTORY_V4_INDEX], "readonly");
  const [headers, payloads, tombstones, indexes] = await Promise.all([
    getAll(tx.objectStore(HISTORY_V4_HEADERS)),
    getAll(tx.objectStore(HISTORY_V4_PAYLOADS)),
    getAll(tx.objectStore(HISTORY_V4_TOMBSTONES)),
    getAll(tx.objectStore(HISTORY_V4_INDEX)),
  ]);
  await txDone(tx).catch(() => {});
  return {
    schemaVersion: HISTORY_V4_SCHEMA_VERSION,
    active: indexes.filter((row) => row?.kind === "match" && !row?.deleted).length,
    totalHeaders: headers.length,
    tombstones: tombstones.length,
    payloads: payloads.length,
  };
}
