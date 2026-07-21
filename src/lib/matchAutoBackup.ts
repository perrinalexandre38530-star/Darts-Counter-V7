import LZString from "lz-string";
import { apiDelete, apiGet, apiPost, readNasAccessToken } from "./apiClient";
import { exportCloudSnapshot, getStorageUser } from "./storage";
import { loadStoragePrefs } from "./storagePlans";
import { queueExternalBackup } from "./externalBackupTarget";
import {
  CLOUD_VAULT_OBJECT_TYPE,
  deleteCloudObjectRemote,
  downloadCloudObject,
  getAccountStorageUsage,
  listCloudObjects,
  uploadCloudObject,
  type CloudObjectIndexItem,
} from "./cloudStorageApi";

const DB_NAME = "dc-match-backups-v1";
const DB_VERSION = 1;
const STORE_NAME = "matches";
const MAX_LOCAL_MATCH_BACKUPS = 500;
const CLOUD_MATCH_BACKUP_OBJECT_TYPE = "cloud_match_backup_v1";
const CLOUD_MATCH_FULL_SNAPSHOT_KEY = "backups/cloud_vault_v1/auto_latest.json";
const CLOUD_FULL_SNAPSHOT_MIN_INTERVAL_MS = 90_000;

type StorageProviderCache = { at: number; provider: string; ok: boolean } | null;
let storageProviderCache: StorageProviderCache = null;

export type MatchBackupOrigin = "local" | "nas" | "cloud";

export type MatchBackupItem = {
  id: string;
  /** Compte propriétaire de la sauvegarde locale. Empêche un autre compte du même navigateur de la voir/restaurer. */
  ownerId?: string | null;
  matchId: string;
  origin?: MatchBackupOrigin;
  sport: string;
  kind: string;
  title: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  savedAt: string;
  players: Array<{ id?: string; profileId?: string; name?: string; displayName?: string; nickname?: string }>;
  winnerId?: string | null;
  summary?: any;
  game?: any;
  header: any;
  payloadCompressed: string;
  payloadEncoding: "lz-string-utf16";
  payloadBytes: number;
  source?: string;
  cloudObjectId?: string | null;
  cloudObjectKey?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function currentOwnerId(): string | null {
  try {
    const direct = getStorageUser();
    if (direct) return String(direct);
  } catch {}
  try {
    const raw = localStorage.getItem("dc_user_id") || localStorage.getItem("dc_storage_user_id_v1") || localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      const parsed = JSON.parse(raw);
      return String(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id || "").trim() || null;
    }
    return String(raw).trim() || null;
  } catch {
    return null;
  }
}


function safeSegment(value: any, fallback = "item"): string {
  const raw = String(value ?? "").trim().toLowerCase();
  const out = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
  return out || fallback;
}

function parseMs(value: any, fallback = 0): number {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  const t = Date.parse(String(value || ""));
  return Number.isFinite(t) && t > 0 ? t : fallback;
}

function readStorageProviderFromCachedAuthSession(): string {
  try {
    const raw = localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(
      parsed?.storage?.storage_provider ||
      parsed?.preference?.storage_provider ||
      parsed?.user?.storage?.storage_provider ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

async function getActiveStorageProviderCached(): Promise<string> {
  const localPrefs = loadStoragePrefs();
  if (localPrefs.updatedAt > 0) {
    if (localPrefs.selectedDestination === "cloud_r2") return "cloud_r2";
    if (localPrefs.selectedDestination === "founder_nas") return "nas_founder";
    if (localPrefs.selectedDestination === "device_file" || localPrefs.selectedDestination === "external_sd_manual") return "external_file";
    return "local_device";
  }

  if (!readNasAccessToken()) return "local_device";
  const cachedAuthProvider = readStorageProviderFromCachedAuthSession();
  if (cachedAuthProvider === "nas_founder") {
    storageProviderCache = { at: Date.now(), provider: "nas_founder", ok: true };
    return "nas_founder";
  }
  const now = Date.now();
  if (storageProviderCache && now - storageProviderCache.at < 60_000) return storageProviderCache.provider;
  try {
    const usage = await getAccountStorageUsage();
    const provider = String(usage?.preference?.storage_provider || "").trim();
    storageProviderCache = { at: now, provider, ok: true };
    return provider;
  } catch (error) {
    storageProviderCache = { at: now, provider: "", ok: false };
    throw error;
  }
}

async function shouldUseCloudR2(): Promise<boolean> {
  try {
    return (await getActiveStorageProviderCached()) === "cloud_r2";
  } catch {
    return false;
  }
}

function cloudMatchObjectKey(item: MatchBackupItem): string {
  const sport = safeSegment(item.sport || "darts", "darts");
  const matchId = safeSegment(item.matchId || item.id, "match");
  return `backups/matches_v1/${sport}/${matchId}.json`;
}

function cloudMatchMetadata(item: MatchBackupItem): Record<string, any> {
  return {
    source: "match_auto_backup_cloud_r2",
    backupKind: "single_match_backup",
    matchId: item.matchId,
    sport: item.sport,
    kind: item.kind,
    status: item.status,
    title: item.title,
    savedAt: item.savedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    players: Array.isArray(item.players) ? item.players.slice(0, 16) : [],
    playersCount: Array.isArray(item.players) ? item.players.length : 0,
    winnerId: item.winnerId ?? null,
    payloadBytes: item.payloadBytes || 0,
    summary: item.summary || {},
  };
}

function hydrateMatchBackupFromCloudIndex(row: CloudObjectIndexItem): MatchBackupItem {
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const matchId = String(metadata.matchId || metadata.match_id || row.title || row.id || "").trim();
  const createdAt = parseMs(metadata.createdAt || row.created_at, Date.parse(String(row.created_at || "")) || Date.now());
  const updatedAt = parseMs(metadata.updatedAt || row.updated_at, Date.parse(String(row.updated_at || row.created_at || "")) || createdAt);
  return {
    id: String(row.id || matchId),
    matchId: matchId || String(row.id || ""),
    origin: "cloud",
    cloudObjectId: String(row.id || ""),
    cloudObjectKey: String(row.object_key || ""),
    sport: String(row.sport || metadata.sport || "darts"),
    kind: String(metadata.kind || "match"),
    title: String(row.title || metadata.title || "Partie cloud"),
    status: String(metadata.status || "finished"),
    createdAt,
    updatedAt,
    savedAt: String(metadata.savedAt || row.updated_at || row.created_at || nowIso()),
    players: Array.isArray(metadata.players) ? metadata.players : [],
    winnerId: metadata.winnerId ?? null,
    summary: metadata.summary || {},
    game: metadata.game || null,
    header: metadata.header || {},
    payloadCompressed: "",
    payloadEncoding: "lz-string-utf16",
    payloadBytes: Number(row.size_bytes || metadata.payloadBytes || 0) || 0,
    source: "cloud-index",
  };
}

function normalizeDownloadedCloudMatch(downloaded: any, id: string): MatchBackupItem | null {
  const content = downloaded?.content ?? downloaded?.text ?? downloaded;
  let item: any = content;
  if (typeof content === "string") {
    try { item = JSON.parse(content); } catch { item = null; }
  }
  if (!item || typeof item !== "object") return null;
  const object = downloaded?.object || {};
  const fallback = object?.id ? hydrateMatchBackupFromCloudIndex(object) : null;
  const matchId = String(item.matchId || item.id || fallback?.matchId || "").trim();
  if (!matchId || !item.payloadCompressed) return null;
  return {
    ...(fallback || {}),
    ...item,
    id: String(object.id || id || item.id || matchId),
    matchId,
    origin: "cloud",
    cloudObjectId: String(object.id || id || item.cloudObjectId || ""),
    cloudObjectKey: String(object.object_key || item.cloudObjectKey || ""),
    payloadEncoding: "lz-string-utf16",
  } as MatchBackupItem;
}

function backupBelongsToCurrentUser(item: any): boolean {
  const uid = currentOwnerId();
  const owner = String(item?.ownerId || item?.userId || item?.user_id || "").trim();
  if (!uid) return !owner;
  return owner === uid;
}

function safeString(value: any, fallback = ""): string {
  const out = String(value ?? "").trim();
  return out || fallback;
}

function safeNum(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safeClone<T = any>(value: T): T {
  try {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function stripAvatarData(value: any): any {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stripAvatarData);
  if (typeof value !== "object") return value;
  const out: any = {};
  for (const [key, child] of Object.entries(value)) {
    if (/avatarDataUrl|avatar_data_url|dataUrl|base64/i.test(key) && typeof child === "string" && child.startsWith("data:image/")) continue;
    if (typeof child === "string" && child.startsWith("data:image/") && child.length > 2000) continue;
    out[key] = stripAvatarData(child);
  }
  return out;
}

function decodePayloadCompressed(payloadCompressed: string): any | null {
  const raw = String(payloadCompressed || "");
  if (!raw) return null;
  try {
    const json = LZString.decompressFromUTF16(raw) || LZString.decompress(raw) || "";
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function encodePayload(payload: any, fallbackPayloadCompressed = ""): { payloadCompressed: string; bytes: number } {
  const clean = stripAvatarData(payload);
  try {
    if (clean && typeof clean === "object") {
      const json = JSON.stringify(clean);
      return {
        payloadCompressed: LZString.compressToUTF16(json) || "",
        bytes: json.length,
      };
    }
  } catch {}
  const decoded = decodePayloadCompressed(fallbackPayloadCompressed);
  if (decoded) {
    try {
      const json = JSON.stringify(decoded);
      return { payloadCompressed: fallbackPayloadCompressed, bytes: json.length };
    } catch {}
  }
  return { payloadCompressed: String(fallbackPayloadCompressed || ""), bytes: String(fallbackPayloadCompressed || "").length };
}

function inferSport(row: any): string {
  const raw = String(row?.sport || row?.summary?.sport || row?.game?.sport || row?.payload?.sport || row?.kind || "").toLowerCase();
  if (raw.includes("baby")) return "babyfoot";
  if (raw.includes("petanque") || raw.includes("pétanque")) return "petanque";
  if (raw.includes("ping")) return "pingpong";
  if (raw.includes("molkky")) return "molkky";
  if (raw.includes("dice")) return "dice";
  return "darts";
}

function inferTitle(row: any, players: any[]): string {
  const mode = safeString(row?.game?.mode || row?.summary?.mode || row?.kind, "partie").toUpperCase();
  const names = players.map((p: any) => safeString(p?.name || p?.displayName || p?.nickname)).filter(Boolean).slice(0, 4).join(" · ");
  return names ? `${mode} — ${names}` : mode;
}

export function buildMatchBackupItem(args: {
  header: any;
  payload?: any;
  payloadCompressed?: string;
  source?: string;
}): MatchBackupItem | null {
  const header = safeClone(args.header || {});
  const matchId = safeString(header?.matchId || header?.id);
  if (!matchId) return null;
  const status = safeString(header?.status, "finished").toLowerCase();
  if (status === "in_progress" || status === "playing" || status === "live") return null;

  const players = Array.isArray(header?.players) ? stripAvatarData(header.players) : [];
  if (!players.length && !header?.summary && !args.payload && !args.payloadCompressed) return null;

  const encoded = encodePayload(args.payload, args.payloadCompressed || "");
  if (!encoded.payloadCompressed || encoded.payloadCompressed.length < 12) return null;

  const createdAt = safeNum(header?.createdAt || header?.playedAt || header?.date, Date.now());
  const updatedAt = safeNum(header?.updatedAt || header?.finishedAt || createdAt, createdAt);
  const cleanHeader = stripAvatarData({
    ...header,
    id: matchId,
    matchId,
    status: header.status || "finished",
    players,
  });

  return {
    id: matchId,
    matchId,
    sport: inferSport(header),
    kind: safeString(header?.kind || header?.game?.mode || header?.summary?.mode, "match"),
    title: inferTitle(header, players),
    status: safeString(header?.status, "finished"),
    createdAt,
    updatedAt,
    savedAt: nowIso(),
    players,
    winnerId: header?.winnerId ?? header?.summary?.winnerId ?? null,
    summary: stripAvatarData(header?.summary || null),
    game: stripAvatarData(header?.game || null),
    header: cleanHeader,
    payloadCompressed: encoded.payloadCompressed,
    payloadEncoding: "lz-string-utf16",
    payloadBytes: encoded.bytes,
    source: args.source || "history-upsert",
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponible"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      } else {
        store = req.transaction!.objectStore(STORE_NAME);
      }
      try { store.createIndex("by_savedAt", "savedAt", { unique: false }); } catch {}
      try { store.createIndex("by_updatedAt", "updatedAt", { unique: false }); } catch {}
      try { store.createIndex("by_sport", "sport", { unique: false }); } catch {}
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Ouverture sauvegardes parties impossible"));
  });
}

function txStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let result: T;
      Promise.resolve(fn(store)).then((value) => { result = value; }).catch(reject);
      tx.oncomplete = () => { try { db.close(); } catch {}; resolve(result!); };
      tx.onerror = () => { try { db.close(); } catch {}; reject(tx.error || new Error("Transaction sauvegardes parties impossible")); };
      tx.onabort = () => { try { db.close(); } catch {}; reject(tx.error || new Error("Transaction sauvegardes parties annulée")); };
    } catch (e) {
      try { db.close(); } catch {}
      reject(e);
    }
  }));
}

async function trimLocalMatchBackups(): Promise<void> {
  await txStore("readwrite", async (store) => {
    const rows: MatchBackupItem[] = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
    const sorted = rows.sort((a, b) => Date.parse(b.savedAt || "") - Date.parse(a.savedAt || ""));
    const overflow = sorted.slice(MAX_LOCAL_MATCH_BACKUPS);
    for (const item of overflow) {
      try { store.delete(item.id); } catch {}
    }
  }).catch(() => undefined);
}

export async function saveLocalMatchBackup(item: MatchBackupItem): Promise<void> {
  await txStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ ...item, ownerId: item.ownerId || currentOwnerId(), origin: "local" });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
  void trimLocalMatchBackups();
}

export async function listLocalMatchBackups(): Promise<MatchBackupItem[]> {
  return txStore("readonly", async (store) => {
    const rows: MatchBackupItem[] = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
    return rows
      .filter((r) => r?.matchId && r?.payloadCompressed && backupBelongsToCurrentUser(r))
      .map((r) => ({ ...r, ownerId: r.ownerId || currentOwnerId(), origin: "local" as const }))
      .sort((a, b) => Date.parse(b.savedAt || "") - Date.parse(a.savedAt || ""));
  }).catch(() => []);
}

export async function getLocalMatchBackup(id: string): Promise<MatchBackupItem | null> {
  return txStore("readonly", async (store) => {
    return await new Promise<MatchBackupItem | null>((resolve) => {
      const req = store.get(String(id || ""));
      req.onsuccess = () => {
        const row = req.result;
        resolve(row && backupBelongsToCurrentUser(row) ? { ...row, origin: "local" } : null);
      };
      req.onerror = () => resolve(null);
    });
  }).catch(() => null);
}

export async function deleteLocalMatchBackup(id: string): Promise<void> {
  await txStore("readwrite", async (store) => {
    store.delete(String(id || ""));
  }).catch(() => undefined);
}


export async function pushMatchBackupToCloud(item: MatchBackupItem): Promise<void> {
  if (!readNasAccessToken()) return;
  if (!(await shouldUseCloudR2())) return;
  const clean: MatchBackupItem = {
    ...item,
    origin: "cloud",
    cloudObjectKey: cloudMatchObjectKey(item),
    cloudObjectId: item.cloudObjectId || null,
  };
  await uploadCloudObject({
    objectType: CLOUD_MATCH_BACKUP_OBJECT_TYPE,
    sport: clean.sport || "darts",
    title: clean.title || `Partie ${clean.matchId}`,
    objectKey: clean.cloudObjectKey || cloudMatchObjectKey(clean),
    mimeType: "application/json",
    content: JSON.stringify(clean),
    gzip: true,
    metadata: cloudMatchMetadata(clean),
  });
}

async function pushLatestSnapshotToCloud(reason: string): Promise<void> {
  if (!readNasAccessToken()) return;
  if (!(await shouldUseCloudR2())) return;
  const now = Date.now();
  try {
    const last = Number(localStorage.getItem("dc_cloud_auto_full_backup_last_at_v1") || "0") || 0;
    if (last > 0 && now - last < CLOUD_FULL_SNAPSHOT_MIN_INTERVAL_MS) return;
    localStorage.setItem("dc_cloud_auto_full_backup_last_at_v1", String(now));
  } catch {}
  const snapshot = await exportCloudSnapshot();
  const json = JSON.stringify(snapshot);
  await uploadCloudObject({
    objectType: CLOUD_VAULT_OBJECT_TYPE,
    sport: "system",
    title: `Sauvegarde cloud automatique — ${new Date().toLocaleString("fr-FR")}`,
    objectKey: CLOUD_MATCH_FULL_SNAPSHOT_KEY,
    mimeType: "application/json",
    content: json,
    gzip: true,
    metadata: {
      source: "match_auto_backup_cloud_r2",
      backupKind: "auto_full_snapshot",
      reason,
      exportedAt: new Date().toISOString(),
      rawSizeBytes: json.length,
    },
  });
}

export async function pushMatchBackupToNas(item: MatchBackupItem): Promise<void> {
  // Aucun appel réseau si l'utilisateur n'est pas connecté au NAS :
  // la sauvegarde locale suffit et on évite un 401/timeout inutile en fin de partie.
  if (!readNasAccessToken()) return;
  await apiPost("/sync/match-backups", {
    matchId: item.matchId,
    sport: item.sport,
    kind: item.kind,
    title: item.title,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    savedAt: item.savedAt,
    players: item.players,
    winnerId: item.winnerId ?? null,
    summary: item.summary || {},
    game: item.game || null,
    header: item.header || {},
    payloadCompressed: item.payloadCompressed,
    payloadEncoding: item.payloadEncoding,
    payloadBytes: item.payloadBytes,
    source: item.source || "history-upsert",
  });
}

export async function listNasMatchBackups(): Promise<MatchBackupItem[]> {
  if (!readNasAccessToken()) return [];
  const data = await apiGet("/sync/match-backups?limit=500").catch(() => ({ items: [] }));
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return items.map((it: any) => ({ ...it, id: String(it.id || it.matchId), matchId: String(it.matchId || it.id), origin: "nas" as const }));
}

export async function pullNasMatchBackup(id: string): Promise<MatchBackupItem | null> {
  if (!readNasAccessToken()) return null;
  const data = await apiGet(`/sync/match-backups/${encodeURIComponent(String(id || ""))}`).catch(() => null);
  const item = data?.item || data;
  if (!item?.matchId && !item?.id) return null;
  return { ...item, id: String(item.id || item.matchId), matchId: String(item.matchId || item.id), origin: "nas" };
}

export async function deleteNasMatchBackup(id: string): Promise<void> {
  if (!readNasAccessToken()) throw new Error("Compte NAS non connecté.");
  await apiDelete(`/sync/match-backups/${encodeURIComponent(String(id || ""))}`);
}


export async function listCloudMatchBackups(): Promise<MatchBackupItem[]> {
  if (!readNasAccessToken()) return [];
  if (!(await shouldUseCloudR2())) return [];
  const rows = await listCloudObjects({ objectType: CLOUD_MATCH_BACKUP_OBJECT_TYPE, limit: 500 }).catch(() => []);
  return rows
    .filter((row: any) => row?.id && !row?.is_deleted)
    .map(hydrateMatchBackupFromCloudIndex)
    .filter((item) => !!item.matchId)
    .sort((a, b) => parseMs(b.updatedAt || b.savedAt) - parseMs(a.updatedAt || a.savedAt));
}

export async function pullCloudMatchBackup(idOrItem: string | MatchBackupItem): Promise<MatchBackupItem | null> {
  const objectId = typeof idOrItem === "string"
    ? String(idOrItem || "").trim()
    : String(idOrItem.cloudObjectId || idOrItem.id || "").trim();
  if (!objectId || !readNasAccessToken()) return null;
  const downloaded = await downloadCloudObject(objectId).catch(() => null);
  if (!downloaded?.ok) return null;
  return normalizeDownloadedCloudMatch(downloaded, objectId);
}

export async function deleteCloudMatchBackup(idOrItem: string | MatchBackupItem): Promise<void> {
  const objectId = typeof idOrItem === "string"
    ? String(idOrItem || "").trim()
    : String(idOrItem.cloudObjectId || idOrItem.id || "").trim();
  if (!objectId) throw new Error("Sauvegarde cloud introuvable.");
  await deleteCloudObjectRemote(objectId, { force: true });
}

export async function saveMatchBackupAfterHistoryUpsert(args: {
  header: any;
  payload?: any;
  payloadCompressed?: string;
  source?: string;
}): Promise<void> {
  const item = buildMatchBackupItem(args);
  if (!item) return;
  // La copie locale reste le filet de sécurité, quelle que soit la destination choisie.
  await saveLocalMatchBackup(item).catch(() => undefined);
  const provider = await getActiveStorageProviderCached().catch(() => "local_device");

  if (provider === "external_file") {
    queueExternalBackup("history-upsert");
    return;
  }
  if (provider === "local_device") return;

  if (provider === "cloud_r2") {
    await pushMatchBackupToCloud(item).catch((error) => {
      try {
        localStorage.setItem("dc_match_backup_last_cloud_error", JSON.stringify({ at: nowIso(), message: error?.message || String(error) }));
      } catch {}
    });
    void pushLatestSnapshotToCloud("history-upsert").catch((error) => {
      try {
        localStorage.setItem("dc_cloud_auto_full_backup_last_error", JSON.stringify({ at: nowIso(), message: error?.message || String(error) }));
      } catch {}
    });
    return;
  }
  if (provider === "nas_founder") {
    await pushMatchBackupToNas(item).catch((error) => {
      try {
        localStorage.setItem("dc_match_backup_last_nas_error", JSON.stringify({ at: nowIso(), message: error?.message || String(error) }));
      } catch {}
    });
  }
}

export async function restoreMatchBackupItem(item: MatchBackupItem): Promise<void> {
  const payload = decodePayloadCompressed(item.payloadCompressed);
  if (!payload || typeof payload !== "object") throw new Error("Détail de partie introuvable dans cette sauvegarde.");
  const rec = {
    ...(item.header || {}),
    id: item.matchId || item.id,
    matchId: item.matchId || item.id,
    kind: item.kind || item.header?.kind || payload?.kind || payload?.mode || "match",
    status: "finished",
    players: Array.isArray(item.header?.players) ? item.header.players : Array.isArray(payload?.players) ? payload.players : item.players || [],
    winnerId: item.winnerId ?? item.header?.winnerId ?? payload?.winnerId ?? payload?.summary?.winnerId ?? null,
    createdAt: item.createdAt || item.header?.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.header?.updatedAt || Date.now(),
    game: item.game || item.header?.game || payload?.game || null,
    summary: item.summary || item.header?.summary || payload?.summary || null,
    payload,
  };
  const mod = await import("./history");
  await mod.History.upsert(rec as any);
  try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason: "restore-single-match", matchId: rec.matchId } })); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason: "restore-single-match", matchId: rec.matchId } })); } catch {}
}
