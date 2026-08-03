// ============================================================
// src/lib/historyCloud.ts
// Export / Import du store IndexedDB history pour snapshots cloud.
// ✅ Compat DB_VER=3 (history_headers/history_details) + fallback legacy.
// ============================================================

import type { SavedMatch } from "./history";
import LZString from "lz-string";
import { mergeHistoryPayloadMonotonic, protectFinishedHistoryPayload } from "./historyIntegrity";
import { createCooperativeYielder } from "./mainThreadYield";

const HISTORY_DB_BASE = "dc-store-v1";
const DB_VER = 3;

function detectHistoryScopeUserId(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem("dc_storage_user_id_v1") || localStorage.getItem("dc_user_id") || localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        return String(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id || "").trim() || null;
      } catch { return null; }
    }
    return String(raw).trim() || null;
  } catch { return null; }
}

function historyDbName(): string {
  const uid = detectHistoryScopeUserId();
  return uid ? `${HISTORY_DB_BASE}:${uid}` : HISTORY_DB_BASE;
}
const STORE_LEGACY = "history";
const STORE_HEADERS = "history_headers";
const STORE_DETAILS = "history_details";


const HISTORY_DELETED_IDS_KEY = "dc-history-deleted-ids-v1";
const HISTORY_DELETED_IDS_TTL_MS = 1000 * 60 * 60 * 24 * 90;

function readHistoryDeletedIdsSet(): Set<string> {
  try {
    if (typeof localStorage === "undefined") return new Set();
    const raw = localStorage.getItem(HISTORY_DELETED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Set();
    const now = Date.now();
    const out = new Set<string>();
    const cleaned: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed)) {
      const key = String(id || "").trim();
      const n = Number(ts || 0);
      if (key && n > 0 && now - n < HISTORY_DELETED_IDS_TTL_MS) {
        out.add(key);
        cleaned[key] = n;
      }
    }
    if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
      try { localStorage.setItem(HISTORY_DELETED_IDS_KEY, JSON.stringify(cleaned)); } catch {}
    }
    return out;
  } catch {
    return new Set();
  }
}

function isDeletedHistoryRecord(rec: any, deleted: Set<string>): boolean {
  if (!deleted.size) return false;
  const ids = [
    rec?.id,
    rec?.matchId,
    rec?.resumeId,
    rec?.sessionId,
    rec?.summary?.id,
    rec?.summary?.matchId,
    rec?.summary?.resumeId,
    rec?.payload?.id,
    rec?.payload?.matchId,
    rec?.payload?.resumeId,
    rec?.payload?.sessionId,
  ].map((x) => String(x ?? "").trim()).filter(Boolean);
  return ids.some((id) => deleted.has(id));
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(historyDbName(), DB_VER);

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


function historyRowIsFinished(rec: any): boolean {
  const status = String(rec?.status || rec?.summary?.status || "").toLowerCase();
  if (["finished", "done", "ended", "match_end"].includes(status)) return true;
  return !!(
    rec?.winnerId ||
    rec?.summary?.winnerId ||
    rec?.summary?.finished === true ||
    rec?.finishedAt
  );
}

function decodeHistoryPayloadCompressed(raw: any): any | null {
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

function encodeHistoryPayloadCompressed(payload: any): string {
  if (payload == null) return "";
  try {
    const json = JSON.stringify(payload);
    return json ? (LZString.compressToUTF16(json) || "") : "";
  } catch {
    return "";
  }
}

function positiveMin(a: any, b: any): number {
  const aa = Number(a || 0);
  const bb = Number(b || 0);
  if (aa > 0 && bb > 0) return Math.min(aa, bb);
  return aa > 0 ? aa : bb > 0 ? bb : 0;
}

function positiveMax(a: any, b: any): number {
  const aa = Number(a || 0);
  const bb = Number(b || 0);
  return Math.max(Number.isFinite(aa) ? aa : 0, Number.isFinite(bb) ? bb : 0);
}

/**
 * Fusion monotone d'une ligne d'historique venant d'un snapshot avec la copie
 * déjà présente localement. C'est LE garde-fou des restaurations NAS/R2 :
 * une ligne plus récente mais plus pauvre ne peut plus remplacer le détail d'un
 * match terminé (ex. Cricket 18 649 B -> 862 B).
 */
export function mergeHistorySnapshotRowMonotonic(existing: any, incoming: any): any {
  if (!existing) return { ...(incoming || {}) };
  if (!incoming) return { ...(existing || {}) };

  const existingHeader: any = { ...(existing || {}) };
  const incomingHeader: any = { ...(incoming || {}) };
  delete existingHeader.payloadCompressed;
  delete incomingHeader.payloadCompressed;

  let merged: any = mergeHistoryPayloadMonotonic(existingHeader, incomingHeader, "historyRow");

  const id = String(incoming?.id || incoming?.matchId || existing?.id || existing?.matchId || "").trim();
  if (id) {
    merged.id = id;
    merged.matchId = String(incoming?.matchId || existing?.matchId || id);
  }

  // Un match fini ne redevient jamais "en cours" à cause d'un snapshot plus vieux.
  if (historyRowIsFinished(existing) || historyRowIsFinished(incoming)) merged.status = "finished";

  const createdAt = positiveMin(existing?.createdAt, incoming?.createdAt);
  const updatedAt = positiveMax(existing?.updatedAt, incoming?.updatedAt);
  const finishedAt = positiveMax(existing?.finishedAt ?? existing?.summary?.finishedAt, incoming?.finishedAt ?? incoming?.summary?.finishedAt);
  if (createdAt) merged.createdAt = createdAt;
  if (updatedAt) merged.updatedAt = updatedAt;
  if (finishedAt) merged.finishedAt = finishedAt;

  // compactBytes est un excellent signal de régression pour les anciens Cricket.
  const compactBytes = positiveMax(existing?.compactBytes ?? existing?.summary?.compactBytes, incoming?.compactBytes ?? incoming?.summary?.compactBytes);
  if (compactBytes) {
    merged.compactBytes = compactBytes;
    merged.summary = {
      ...(merged?.summary && typeof merged.summary === "object" ? merged.summary : {}),
      compact: true,
      compactBytes,
    };
  }

  const previousPayload = decodeHistoryPayloadCompressed(existing?.payloadCompressed);
  const incomingPayload = decodeHistoryPayloadCompressed(incoming?.payloadCompressed);

  let payloadCompressed = String(incoming?.payloadCompressed || "");
  if (previousPayload && (historyRowIsFinished(existing) || historyRowIsFinished(incoming))) {
    const protectedPayload = protectFinishedHistoryPayload(previousPayload, incomingPayload);
    const encoded = encodeHistoryPayloadCompressed(protectedPayload.payload);
    payloadCompressed = encoded || String(existing?.payloadCompressed || incoming?.payloadCompressed || "");
    if (protectedPayload.regressionPrevented) {
      merged.summary = {
        ...(merged?.summary && typeof merged.summary === "object" ? merged.summary : {}),
        integrityGuard: {
          version: 2,
          source: "snapshot-import",
          protectedAt: Date.now(),
          previousBytes: protectedPayload.previous.jsonBytes,
          incomingBytes: protectedPayload.incoming.jsonBytes,
          mergedBytes: protectedPayload.merged.jsonBytes,
        },
      };
    }
  } else if (!incomingPayload && previousPayload) {
    payloadCompressed = String(existing?.payloadCompressed || "");
  } else if (incomingPayload && previousPayload) {
    // Même pour un match ancien sans marqueur de fin fiable, privilégier une fusion
    // structurelle plutôt qu'un remplacement aveugle.
    const payload = mergeHistoryPayloadMonotonic(previousPayload, incomingPayload, "payload");
    payloadCompressed = encodeHistoryPayloadCompressed(payload) || String(incoming?.payloadCompressed || existing?.payloadCompressed || "");
  } else if (!payloadCompressed && existing?.payloadCompressed) {
    payloadCompressed = String(existing.payloadCompressed);
  }

  merged.payloadCompressed = payloadCompressed;
  return merged;
}

async function enrichHistoryDumpFromLocalRevisions(dump: HistoryDumpV1): Promise<HistoryDumpV1> {
  try {
    // Import dynamique pour éviter une dépendance cyclique storage -> historyCloud -> matchAutoBackup -> storage.
    const mod = await import("./matchAutoBackup");
    const revisions = await mod.listLocalMatchBackups();
    if (!Array.isArray(revisions) || !revisions.length) return dump;

    const bestByMatch = new Map<string, any>();
    for (const revision of revisions) {
      const matchId = String(revision?.matchId || "").trim();
      if (!matchId || !dump.rows?.[matchId]) continue; // ne ressuscite jamais une partie supprimée
      const previous = bestByMatch.get(matchId);
      const score = Number(revision?.payloadBytes || 0);
      const prevScore = Number(previous?.payloadBytes || 0);
      if (!previous || score > prevScore || (score === prevScore && Date.parse(String(revision?.savedAt || "")) > Date.parse(String(previous?.savedAt || "")))) {
        bestByMatch.set(matchId, revision);
      }
    }

    if (!bestByMatch.size) return dump;
    const rows: Record<string, SavedMatch> = { ...(dump.rows || {}) };
    for (const [matchId, revision] of bestByMatch.entries()) {
      const revisionRow = {
        ...(revision?.header || {}),
        id: matchId,
        matchId,
        kind: revision?.kind || revision?.header?.kind,
        status: revision?.status || revision?.header?.status || "finished",
        createdAt: revision?.createdAt || revision?.header?.createdAt,
        updatedAt: revision?.updatedAt || revision?.header?.updatedAt,
        winnerId: revision?.winnerId ?? revision?.header?.winnerId ?? null,
        summary: revision?.summary || revision?.header?.summary || null,
        game: revision?.game || revision?.header?.game || null,
        players: revision?.players || revision?.header?.players || [],
        payloadCompressed: revision?.payloadCompressed || "",
      };
      rows[matchId] = mergeHistorySnapshotRowMonotonic(rows[matchId], revisionRow) as SavedMatch;
    }
    return { _v: 1, rows };
  } catch (error) {
    console.warn("[historyCloud] local revision safety enrichment skipped", error);
    return dump;
  }
}

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
    const dump = await new Promise<HistoryDumpV1>((resolve, reject) => {
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
    return await enrichHistoryDumpFromLocalRevisions(dump);
  }

  // fallback legacy
  if (db.objectStoreNames.contains(STORE_LEGACY)) {
    const dump = await new Promise<HistoryDumpV1>((resolve, reject) => {
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
    return await enrichHistoryDumpFromLocalRevisions(dump);
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

export async function importHistoryDump(
  dump: HistoryDumpV1,
  opts?: {
    replace?: boolean;
    preserveExisting?: boolean;
    onProgress?: (completed: number, total: number) => void;
  },
) {
  if (!dump || dump._v !== 1) return;
  const replace = opts?.replace ?? false;
  const preserveExisting = opts?.preserveExisting ?? !replace;

  const db = await openDB();
  const deletedIds = readHistoryDeletedIdsSet();

  // Une restauration explicite en mode replace possède déjà une sauvegarde de
  // sécurité. Relire et fusionner tout l'ancien historique avant de l'effacer
  // doublait le coût CPU/mémoire sur Android pour 75 gros matchs.
  const existingDump = preserveExisting
    ? await exportHistoryDump().catch(() => ({ _v: 1 as const, rows: {} as Record<string, SavedMatch> }))
    : { _v: 1 as const, rows: {} as Record<string, SavedMatch> };
  const preparedRows: Record<string, SavedMatch> = {};
  const incomingRows = Object.values(dump.rows || {});
  const totalRows = incomingRows.length;
  const yieldIfNeeded = createCooperativeYielder(9);
  opts?.onProgress?.(0, totalRows);
  for (let rowIndex = 0; rowIndex < incomingRows.length; rowIndex += 1) {
    const raw = incomingRows[rowIndex];
    try {
      const r: any = raw || {};
      const id = String(r?.id || r?.matchId || "").trim();
      if (!id || deletedIds.has(id) || isDeletedHistoryRecord(r, deletedIds)) continue;
      const incoming = { ...r, id, matchId: String(r?.matchId || id) };
      const existing = (existingDump.rows || {})[id] || null;
      preparedRows[id] = mergeHistorySnapshotRowMonotonic(existing, incoming) as SavedMatch;
    } catch {}
    if ((rowIndex + 1) % 8 === 0 || rowIndex + 1 === totalRows) {
      opts?.onProgress?.(rowIndex + 1, totalRows);
      await yieldIfNeeded(true);
    } else {
      await yieldIfNeeded();
    }
  }

  await yieldIfNeeded(true);
  if (db.objectStoreNames.contains(STORE_HEADERS) && db.objectStoreNames.contains(STORE_DETAILS)) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_HEADERS, STORE_DETAILS], "readwrite");
      const headers = tx.objectStore(STORE_HEADERS);
      const details = tx.objectStore(STORE_DETAILS);

      if (replace) {
        try { headers.clear(); } catch {}
        try { details.clear(); } catch {}
      }

      for (const [id, r] of Object.entries(preparedRows)) {
        try {
          headers.put(toHeaderRecord({ ...(r as any), id, matchId: String((r as any)?.matchId || id) }));
          details.put(toDetailRecord(id, r));
        } catch {}
      }

      tx.oncomplete = () => {
        opts?.onProgress?.(totalRows, totalRows);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    await yieldIfNeeded(true);
    return;
  }

  if (db.objectStoreNames.contains(STORE_LEGACY)) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_LEGACY, "readwrite");
      const store = tx.objectStore(STORE_LEGACY);
      if (replace) {
        try { store.clear(); } catch {}
      }
      for (const [id, r] of Object.entries(preparedRows)) {
        try {
          const existing = (existingDump.rows || {})[id] || null;
          store.put(mergeHistorySnapshotRowMonotonic(existing, r) as any);
        } catch {}
      }
      tx.oncomplete = () => {
        opts?.onProgress?.(totalRows, totalRows);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    await yieldIfNeeded(true);
  }
}
