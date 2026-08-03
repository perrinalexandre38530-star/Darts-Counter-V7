import LZString from "lz-string";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";
import { apiDelete, apiGet, apiGetBytes, apiPost } from "./apiClient";
import { exportCloudSnapshot, getStorageUser, importCloudSnapshot } from "./storage";
import { pushNasAccountSnapshot } from "./manualNasSync";

type AnyRecord = Record<string, any>;

export type VaultSummary = {
  bytes: number;
  keys: number;
  profiles: number;
  matches: number;
  historyRows: number;
  /** Nombre de parties possédant des statistiques/télémétrie réellement exploitables. */
  statsMatches?: number;
  statsBlocks: number;
  mediaRefs: number;
  dataImages: number;
  images?: number;
  teams?: number;
  bots?: number;
  dartsets?: number;
  visits?: number;
  darts?: number;
  sports: string[];
  names: string[];
  exportedAt?: string | null;
  probableContent: string[];
};

export type StorageBlock = {
  id: string;
  source: "localStorage" | "indexedDB" | "localSlot" | "nasSlot" | "nasLatest";
  title: string;
  subtitle?: string;
  location: string;
  dbName?: string;
  storeName?: string;
  key?: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  version?: number | null;
  recoverable: boolean;
  summary: VaultSummary;
  payload?: any;
};

export type MemorySlot = {
  id: string;
  /** Compte propriétaire du bloc local. Obligatoire pour éviter le mélange entre comptes sur le même navigateur. */
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
  label: string;
  source: "local" | "before-restore" | "before-nas-backup" | "manual";
  payload: any;
  summary: VaultSummary;
};

export type NasSlot = {
  id: string;
  ownerId?: string | null;
  version?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  promotedAt?: string | null;
  deletedAt?: string | null;
  deletedReason?: string | null;
  summary?: Partial<VaultSummary> | null;
  latest?: boolean;
};

const VAULT_DB = "dc_memory_card_v1";
const VAULT_STORE = "slots";
const MAX_LOCAL_SLOTS = 10;

/**
 * Un snapshot NAS complet peut dépasser 20 Mo et le QNAP peut mettre plusieurs
 * secondes à préparer la réponse avant d'envoyer les premiers octets.
 * Le délai court de 4 s reste réservé aux lectures automatiques de métadonnées.
 */
const NAS_MANUAL_PULL_TIMEOUT_MS = 120_000;


const STORAGE_USER_LS_KEY = "dc_storage_user_id_v1";
const AUTH_SESSION_LS_KEY = "dc_online_auth_supabase_v1";
const FALLBACK_USER_KEYS = ["dc_user_id", STORAGE_USER_LS_KEY, AUTH_SESSION_LS_KEY];

function normalizeOwnerId(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function readOwnerIdFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const direct = normalizeOwnerId(getStorageUser());
    if (direct) return direct;
  } catch {}
  try {
    for (const key of FALLBACK_USER_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      if (raw.startsWith("{") || raw.startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          const id = normalizeOwnerId(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id || parsed?.profile?.userId);
          if (id) return id;
        } catch {}
      } else {
        const id = normalizeOwnerId(raw);
        if (id) return id;
      }
    }
  } catch {}
  return null;
}

export function getVaultCurrentUserId(): string | null {
  return readOwnerIdFromBrowser();
}

function ownerMatchesCurrent(ownerId?: string | null): boolean {
  const uid = getVaultCurrentUserId();
  const owner = normalizeOwnerId(ownerId);
  if (!uid) return !owner;
  return owner === uid;
}

function stringContainsCurrentUser(value: string): boolean {
  const uid = getVaultCurrentUserId();
  if (!uid) return false;
  const raw = String(value || "");
  return raw === uid || raw.endsWith(`:${uid}`) || raw.includes(`:${uid}:`) || raw.includes(uid);
}

function payloadMentionsCurrentUser(value: any): boolean {
  const uid = getVaultCurrentUserId();
  if (!uid || value == null) return false;
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return text.includes(uid);
  } catch {
    return false;
  }
}

function localKeyBelongsToCurrentAccount(key: string): boolean {
  const uid = getVaultCurrentUserId();
  if (!uid) return false;
  const raw = String(key || "");
  if (stringContainsCurrentUser(raw)) return true;
  // paramètres techniques non restaurables, lisibles par tous les comptes mais non considérés comme backup utilisateur
  return raw === "dc_api_url" || raw === "dc_api_timeout_ms";
}

function indexedDbNameBelongsToCurrentAccount(dbName: string): boolean {
  const uid = getVaultCurrentUserId();
  if (!uid) return false;
  return stringContainsCurrentUser(dbName);
}

function isRecord(value: any): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stableId(prefix: string, parts: any[]) {
  return `${prefix}:${parts.map((p) => String(p ?? "").replace(/[\s:/]+/g, "_")).join(":")}`;
}

function jsonBytes(value: any): number {
  try { return new Blob([JSON.stringify(value ?? null)]).size; } catch {
    try { return JSON.stringify(value ?? null).length; } catch { return 0; }
  }
}

function tryParse(value: any): any {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return value;
  if (!(raw.startsWith("{") || raw.startsWith("[") || raw.startsWith('"'))) return value;
  try { return JSON.parse(raw); } catch { return value; }
}

function uniquePush(arr: string[], value: any, max = 12) {
  const s = String(value ?? "").trim();
  if (!s || arr.includes(s) || arr.length >= max) return;
  arr.push(s.slice(0, 72));
}

function looksLikeMatchObject(obj: any): boolean {
  if (!isRecord(obj)) return false;
  const hasSport = typeof obj.sport === "string" || typeof obj.mode === "string" || typeof obj.gameMode === "string";
  const hasPlayers = Array.isArray(obj.players) || Array.isArray(obj.teams) || Array.isArray(obj.participants);
  const hasScore = obj.score != null || obj.result != null || obj.winner != null || obj.createdAt != null || obj.finishedAt != null;
  const hasMatchId = obj.matchId != null || obj.resumeId != null || obj.id != null;
  return !!((hasSport && (hasPlayers || hasScore)) || (hasMatchId && hasPlayers && hasScore));
}

function arrayLength(value: any): number {
  return Array.isArray(value) ? value.length : 0;
}

function historyRowsFromSnapshot(snapshot: any): any[] {
  const rows = snapshot?.history?.rows;
  if (Array.isArray(rows)) return rows;
  if (rows && typeof rows === "object") return Object.values(rows);
  if (Array.isArray(snapshot?.history)) return snapshot.history;
  if (Array.isArray(snapshot?.matches)) return snapshot.matches;
  return [];
}

function telemetryArrayLength(value: any): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function matchTelemetrySummary(match: any): { usable: boolean; visits: number; darts: number } {
  if (!match || typeof match !== "object") return { usable: false, visits: 0, darts: 0 };
  const candidates = [
    match,
    match.summary,
    match.stats,
    match.game,
    match.resume,
    match.__legStats,
    match.telemetry,
  ].filter((value) => value && typeof value === "object");

  let visits = 0;
  let darts = 0;
  let usable = false;
  const seen = new Set<any>();

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const visitCollections = [
      candidate.visitHistory,
      candidate.visitsHistory,
      candidate.visits,
      candidate.volleys,
      candidate.vollees,
      candidate.rounds,
      candidate.turns,
    ];
    const dartCollections = [
      candidate.dartsDetail,
      candidate.darts,
      candidate.throws,
      candidate.hits,
      candidate.dartHits,
    ];
    visits = Math.max(visits, ...visitCollections.map(telemetryArrayLength));
    darts = Math.max(darts, ...dartCollections.map(telemetryArrayLength));

    const keys = Object.keys(candidate).map((key) => key.toLowerCase());
    if (keys.some((key) => /avg|average|checkout|bestvisit|hitsbysegment|dartdetail|visit|volley|volee|throw|bull|double|triple/.test(key))) {
      usable = true;
    }
  }

  if (visits > 0 || darts > 0) usable = true;
  if (darts <= 0 && visits > 0) darts = visits * 3;
  return { usable, visits, darts };
}

function statsIndexMatchCount(snapshot: any): number {
  const idb = snapshot?.idb;
  if (!idb || typeof idb !== "object") return 0;
  let best = 0;
  for (const [key, value] of Object.entries<any>(idb)) {
    if (!String(key).includes("stats_index")) continue;
    const direct = Number(value?.totals?.matches || value?.statsMatches || 0) || 0;
    const grouped = value?.matchIdsByMode && typeof value.matchIdsByMode === "object"
      ? Object.values<any>(value.matchIdsByMode).reduce((sum, ids) => sum + (Array.isArray(ids) ? ids.length : 0), 0)
      : 0;
    const ids = Array.isArray(value?.matchIds) ? value.matchIds.length : 0;
    best = Math.max(best, direct, grouped, ids);
  }
  return best;
}

export function summarizeVaultPayload(value: any): VaultSummary {
  const root = tryParse(value);
  const seen = new WeakSet<object>();
  const sports: string[] = [];
  const names: string[] = [];
  const probable = new Set<string>();
  let matches = 0;
  let profiles = 0;
  let historyRows = 0;
  let statsBlocks = 0;
  let mediaRefs = 0;
  let dataImages = 0;
  let keys = 0;
  let exportedAt: string | null = null;

  const walk = (node: any, path = "") => {
    if (node == null) return;
    if (typeof node === "string") {
      if (node.startsWith("data:image/")) dataImages += 1;
      if (/\/media\//.test(node) || /media_/.test(node)) mediaRefs += 1;
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      const low = path.toLowerCase();
      if (/profile|player|joueur/.test(low)) profiles = Math.max(profiles, node.length);
      // Ne jamais déduire le nombre de parties du nom complet du chemin.
      // Exemple réel : "history.rows.<id>.visitHistory" contient des centaines
      // de volées, qui étaient auparavant comptées comme autant de parties.
      for (let i = 0; i < Math.min(node.length, 250); i += 1) walk(node[i], `${path}[${i}]`);
      return;
    }

    const obj = node as AnyRecord;
    const objKeys = Object.keys(obj);
    keys += objKeys.length;

    if (!exportedAt && typeof obj.exportedAt === "string") exportedAt = obj.exportedAt;

    if (typeof obj.sport === "string") uniquePush(sports, obj.sport, 12);
    if (typeof obj.mode === "string") uniquePush(sports, obj.mode, 12);
    if (typeof obj.gameMode === "string") uniquePush(sports, obj.gameMode, 12);

    for (const k of ["name", "displayName", "nickname", "playerName", "teamName", "winnerName"]) {
      if (typeof obj[k] === "string") uniquePush(names, obj[k], 16);
    }

    for (const [k, v] of Object.entries(obj)) {
      const low = k.toLowerCase();
      if (low.includes("profile") && Array.isArray(v)) profiles = Math.max(profiles, v.length);
      if ((low === "stats" || low.includes("stats")) && v && typeof v === "object") statsBlocks += 1;
      if (low === "dc_stats_index_v2" || low.includes("stats_index")) {
        const indexedMatches = Number((v as any)?.totals?.matches || (v as any)?.statsMatches || 0) || 0;
        const indexedIds = Array.isArray((v as any)?.matchIds)
          ? (v as any).matchIds.length
          : (v as any)?.matchIdsByMode && typeof (v as any).matchIdsByMode === "object"
            ? Object.values<any>((v as any).matchIdsByMode).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0)
            : 0;
        if (Math.max(indexedMatches, indexedIds) > 0) statsBlocks = Math.max(statsBlocks, 1);
      }
      if (/media|avatar|photo|image/.test(low) && typeof v === "string" && v) mediaRefs += /\/media\//.test(v) ? 1 : 0;
      if (/history|match|matches|partie|saved/.test(low) && Array.isArray(v)) probable.add("parties");
      walk(v, path ? `${path}.${k}` : k);
    }
  };

  walk(root);

  const portable = root?.portableAccountData && typeof root.portableAccountData === "object"
    ? root.portableAccountData
    : {};
  const portableCounts = portable?.counts && typeof portable.counts === "object" ? portable.counts : {};
  const store = root?.store && typeof root.store === "object"
    ? root.store
    : root?.data && typeof root.data === "object"
      ? root.data
      : {};

  const teams = Math.max(
    Number(portableCounts.teams || 0) || 0,
    arrayLength(portable.teams),
    arrayLength(store.teams),
    arrayLength(root?.teams),
  );
  const bots = Math.max(
    Number(portableCounts.bots || 0) || 0,
    arrayLength(portable.bots),
    arrayLength(store.bots),
    arrayLength(store.cpuBots),
    arrayLength(root?.bots),
  );
  const dartsets = Math.max(
    Number(portableCounts.dartSets || portableCounts.dartsets || 0) || 0,
    arrayLength(portable.dartSets),
    arrayLength(portable.dartsets),
    arrayLength(store.dartSets),
    arrayLength(store.dartsets),
    arrayLength(root?.dartSets),
    arrayLength(root?.dartsets),
  );
  profiles = Math.max(
    profiles,
    Number(portableCounts.profiles || 0) || 0,
    arrayLength(portable.profiles),
    arrayLength(root?.localProfiles),
    arrayLength(store.profiles),
  );

  const historyMatches = historyRowsFromSnapshot(root)
    .filter((match) => match && typeof match === "object");
  const directRootMatches = Array.isArray(root)
    ? root.filter((match) => looksLikeMatchObject(match))
    : [];
  const canonicalMatches = historyMatches.length > 0 ? historyMatches : directRootMatches;

  // Le nombre de parties provient exclusivement des lignes d'historique
  // canoniques (ou, à défaut, d'un tableau racine de vrais matchs).
  // Les volées, fléchettes et tableaux de télémétrie imbriqués ne sont
  // donc plus additionnés au compteur de parties.
  historyRows = historyMatches.length;
  matches = canonicalMatches.length;
  if (historyRows > 0) probable.add("historique");

  let statsMatches = 0;
  let visits = 0;
  let darts = 0;
  for (const match of canonicalMatches) {
    const telemetry = matchTelemetrySummary(match);
    if (telemetry.usable) statsMatches += 1;
    visits += telemetry.visits;
    darts += telemetry.darts;
  }
  statsMatches = Math.max(statsMatches, statsIndexMatchCount(root));
  if (matches > 0) statsMatches = Math.min(statsMatches, matches);
  if (statsMatches > 0) statsBlocks = statsMatches;

  const mediaVaultCount = root?.userMediaFallbacks?.media && typeof root.userMediaFallbacks.media === "object"
    ? Object.keys(root.userMediaFallbacks.media).length
    : 0;
  const avatarFallbackCount = root?.avatarFallbacks?.profiles && typeof root.avatarFallbacks.profiles === "object"
    ? Object.keys(root.avatarFallbacks.profiles).length
    : 0;
  const galleryCount = Number(portableCounts.galleryItems || 0) || 0;
  const images = Math.max(mediaRefs + dataImages, mediaVaultCount + avatarFallbackCount, galleryCount);

  if (profiles > 0) probable.add("profils");
  if (matches > 0 || historyRows > 0) probable.add("parties");
  if (statsBlocks > 0) probable.add("stats");
  if (mediaRefs > 0 || dataImages > 0) probable.add("médias");

  return {
    bytes: jsonBytes(root),
    keys,
    profiles,
    matches,
    historyRows,
    statsMatches,
    statsBlocks,
    mediaRefs,
    dataImages,
    images,
    teams,
    bots,
    dartsets,
    visits,
    darts,
    sports,
    names,
    exportedAt,
    probableContent: Array.from(probable),
  };
}

async function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VAULT_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function vaultGetAll(): Promise<MemorySlot[]> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readonly");
    const req = tx.objectStore(VAULT_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []) as MemorySlot[]);
    req.onerror = () => reject(req.error);
  });
}

async function vaultPut(slot: MemorySlot): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readwrite");
    const req = tx.objectStore(VAULT_STORE).put(slot);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function vaultDelete(id: string): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readwrite");
    const req = tx.objectStore(VAULT_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listLocalMemorySlots(): Promise<MemorySlot[]> {
  const slots = await vaultGetAll().catch(() => []);
  return slots
    .filter((slot: any) => ownerMatchesCurrent(slot?.ownerId))
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
}

async function gzipJsonForLocalVault(json: string): Promise<Uint8Array> {
  const CompressionStreamCtor = (globalThis as any).CompressionStream;
  if (typeof CompressionStreamCtor === "function") {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStreamCtor("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return gzipSync(strToU8(json), { level: 1 });
}

function localCompressedPayload(bytes: Uint8Array, rawBytes: number): any {
  return {
    _format: "gzip+store-v2",
    compressed: true,
    encoding: "uint8array",
    data: bytes,
    meta: {
      rawBytes,
      compressedBytes: bytes.byteLength,
      compressedAt: new Date().toISOString(),
      engine: "local-vault-gzip-v2",
    },
  };
}

export async function createLocalMemorySlotFromSnapshot(
  payload: any,
  label = "Bloc local",
  source: MemorySlot["source"] = "manual",
  summaryInput?: VaultSummary | null,
  snapshotJson?: string,
  compressedBytes?: Uint8Array
): Promise<MemorySlot> {
  const now = new Date().toISOString();
  let storedPayload = payload;
  const json = typeof snapshotJson === "string" ? snapshotJson : "";
  if (json.length >= 64 * 1024) {
    const bytes = compressedBytes || await gzipJsonForLocalVault(json);
    storedPayload = localCompressedPayload(bytes, new TextEncoder().encode(json).byteLength);
  }
  const slot: MemorySlot = {
    id: `local_${now.replace(/[^0-9]/g, "")}_${Math.random().toString(16).slice(2, 8)}`,
    ownerId: getVaultCurrentUserId(),
    createdAt: now,
    updatedAt: now,
    label,
    source,
    payload: storedPayload,
    summary: summaryInput || summarizeVaultPayload(payload),
  };
  await vaultPut(slot);
  const slots = await listLocalMemorySlots();
  for (const old of slots.slice(MAX_LOCAL_SLOTS)) await vaultDelete(old.id).catch(() => {});
  return slot;
}

export async function createLocalMemorySlot(label = "Bloc local", source: MemorySlot["source"] = "manual"): Promise<MemorySlot> {
  const payload = await exportCloudSnapshot();
  return createLocalMemorySlotFromSnapshot(payload, label, source);
}

export async function deleteLocalMemorySlot(id: string): Promise<void> {
  await vaultDelete(id);
}

export async function restoreLocalMemorySlot(id: string): Promise<MemorySlot> {
  const slots = await listLocalMemorySlots();
  const slot = slots.find((s) => s.id === id);
  if (!slot) throw new Error("Bloc local introuvable");
  await createLocalMemorySlot("Sécurité avant restauration locale", "before-restore").catch(() => null);
  await importCloudSnapshot(decodeMaybeCompressedNasPayload(slot.payload), { mode: "replace" });
  return slot;
}

function readAllFromObjectStore(db: IDBDatabase, storeName: string): Promise<Array<{ key: IDBValidKey; value: any }>> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      let keys: IDBValidKey[] | null = null;
      let values: any[] | null = null;
      const finish = () => {
        if (!keys || !values) return;
        resolve(keys.map((key, i) => ({ key, value: values?.[i] })));
      };
      keysReq.onsuccess = () => { keys = keysReq.result || []; finish(); };
      valsReq.onsuccess = () => { values = valsReq.result || []; finish(); };
      keysReq.onerror = () => resolve([]);
      valsReq.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function scanIndexedDbBlocks(): Promise<StorageBlock[]> {
  const blocks: StorageBlock[] = [];
  const idb: any = typeof indexedDB !== "undefined" ? indexedDB : null;
  if (!idb) return blocks;
  let dbs: Array<{ name?: string; version?: number }> = [];
  try {
    dbs = typeof idb.databases === "function" ? await idb.databases() : [{ name: "darts-counter-v5" }];
  } catch {
    dbs = [{ name: "darts-counter-v5" }];
  }
  for (const info of dbs) {
    const name = String(info?.name || "").trim();
    if (!name || name === VAULT_DB) continue;
    const dbOwned = indexedDbNameBelongsToCurrentAccount(name);
    const db = await new Promise<IDBDatabase | null>((resolve) => {
      try {
        const req = indexedDB.open(name);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
    if (!db) continue;
    const stores = Array.from(db.objectStoreNames || []);
    for (const storeName of stores) {
      const rowsRaw = await readAllFromObjectStore(db, storeName);
      const rows = rowsRaw.filter((r) => dbOwned || stringContainsCurrentUser(String(r.key || "")) || payloadMentionsCurrentUser(r.value));
      if (!rows.length) continue;
      const wholeSummary = summarizeVaultPayload(rows.map((r) => r.value));
      blocks.push({
        id: stableId("idb-store", [name, storeName]),
        source: "indexedDB",
        title: `IndexedDB · ${name}`,
        subtitle: `${storeName} · ${rows.length} bloc(s)`,
        location: `${name}/${storeName}`,
        dbName: name,
        storeName,
        recoverable: wholeSummary.matches > 0 || wholeSummary.profiles > 0 || wholeSummary.keys > 0,
        summary: { ...wholeSummary, keys: rows.length || wholeSummary.keys },
        payload: { dbName: name, storeName, rows },
      });
      for (const row of rows.slice(0, 120)) {
        const summary = summarizeVaultPayload(row.value);
        if (summary.matches <= 0 && summary.profiles <= 0 && summary.historyRows <= 0 && summary.statsBlocks <= 0) continue;
        blocks.push({
          id: stableId("idb", [name, storeName, row.key]),
          source: "indexedDB",
          title: `Bloc IDB · ${String(row.key)}`,
          subtitle: `${name}/${storeName}`,
          location: `${name}/${storeName}/${String(row.key)}`,
          dbName: name,
          storeName,
          key: String(row.key),
          recoverable: true,
          summary,
          payload: { dbName: name, storeName, rows: [row] },
        });
      }
    }
    try { db.close(); } catch {}
  }
  return blocks;
}

export async function scanLocalStorageBlocks(): Promise<StorageBlock[]> {
  const blocks: StorageBlock[] = [];
  if (typeof window === "undefined") return blocks;
  try {
    const ls = window.localStorage;
    const all: AnyRecord = {};
    for (let i = 0; i < ls.length; i += 1) {
      const key = ls.key(i) || "";
      if (!key) continue;
      if (!localKeyBelongsToCurrentAccount(key)) continue;
      const value = ls.getItem(key);
      all[key] = tryParse(value);
      const summary = summarizeVaultPayload(all[key]);
      if (summary.matches > 0 || summary.profiles > 0 || summary.historyRows > 0 || summary.statsBlocks > 0 || /history|match|profile|store|dart|babyfoot|stats/i.test(key)) {
        blocks.push({
          id: stableId("ls", [key]),
          source: "localStorage",
          title: `LocalStorage · ${key}`,
          location: `localStorage/${key}`,
          key,
          recoverable: true,
          summary,
          payload: { key, value },
        });
      }
    }
    const whole = summarizeVaultPayload(all);
    blocks.unshift({
      id: "localStorage:all",
      source: "localStorage",
      title: "LocalStorage complet",
      subtitle: `${ls.length} clé(s) navigateur`,
      location: "localStorage/*",
      recoverable: true,
      summary: { ...whole, keys: ls.length },
      payload: { all },
    });
  } catch {}
  return blocks;
}

export async function scanLocalStorageAndIndexedDb(): Promise<StorageBlock[]> {
  const [ls, idb, slots] = await Promise.all([
    scanLocalStorageBlocks(),
    scanIndexedDbBlocks(),
    listLocalMemorySlots().catch(() => []),
  ]);
  const slotBlocks: StorageBlock[] = slots.map((slot) => ({
    id: slot.id,
    source: "localSlot" as const,
    title: slot.label || "Bloc local",
    subtitle: slot.source === "before-restore" ? "Sauvegarde automatique avant restauration" : "Sauvegarde locale manuelle",
    location: `${VAULT_DB}/${VAULT_STORE}/${slot.id}`,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
    recoverable: true,
    summary: slot.summary || summarizeVaultPayload(slot.payload),
  }));
  return [...slotBlocks, ...ls, ...idb].sort((a, b) => (b.summary.matches + b.summary.profiles) - (a.summary.matches + a.summary.profiles));
}

export function decodeMaybeCompressedNasPayload(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;
  if (payload._format === "gzip+store-v2" && payload.compressed) {
    let bytes: Uint8Array | null = null;
    if (typeof payload.data === "string") {
      // Décodage par blocs : évite de créer en même temps une chaîne binaire
      // géante de 20-30 Mo dans la WebView Android.
      const base64 = payload.data.replace(/\s+/g, "");
      const chunkChars = 1024 * 1024; // multiple de 4
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (let offset = 0; offset < base64.length; offset += chunkChars) {
        const binary = atob(base64.slice(offset, offset + chunkChars));
        const chunk = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) chunk[i] = binary.charCodeAt(i);
        chunks.push(chunk);
        total += chunk.byteLength;
      }
      bytes = new Uint8Array(total);
      let cursor = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, cursor);
        cursor += chunk.byteLength;
      }
    } else if (payload.data instanceof Uint8Array) {
      bytes = payload.data;
    } else if (payload.data instanceof ArrayBuffer) {
      bytes = new Uint8Array(payload.data);
    } else if (ArrayBuffer.isView(payload.data)) {
      bytes = new Uint8Array(payload.data.buffer, payload.data.byteOffset, payload.data.byteLength);
    }
    if (bytes) return JSON.parse(strFromU8(gunzipSync(bytes)));
  }
  if (payload._format === "lz-string+store-v1" && payload.compressed && typeof payload.data === "string") {
    const json = payload.encoding === "utf16" ? LZString.decompressFromUTF16(payload.data) : LZString.decompressFromBase64(payload.data);
    if (!json) throw new Error("Impossible de décompresser le payload NAS");
    return JSON.parse(json);
  }
  return payload;
}

export async function listNasMemorySlots(): Promise<NasSlot[]> {
  const data = await apiGet("/sync/slots?limit=120").catch(async () => {
    // Compatibilité ancien backend : /sync/pull suffit pour prouver que le
    // courant existe. On calcule aussi son résumé ; sans cela la page le
    // classait « technique » puis le masquait, donnant l'impression qu'il avait
    // disparu alors que le payload était bien présent sur le NAS.
    const latest = await apiGet("/sync/pull");
    if (!latest?.payload) return { slots: [] };
    const decoded = decodeMaybeCompressedNasPayload(latest.payload);
    return { slots: [{
      id: "latest",
      latest: true,
      version: latest.version,
      updatedAt: latest.updatedAt,
      createdAt: latest.updatedAt,
      summary: summarizeVaultPayload(decoded),
    }] };
  });
  const slots = Array.isArray(data) ? data : Array.isArray(data?.slots) ? data.slots : [];
  return slots as NasSlot[];
}

export async function listNasDeletedMemorySlots(): Promise<NasSlot[]> {
  const data = await apiGet("/sync/slots/trash?limit=120").catch(() => ({ slots: [] }));
  const slots = Array.isArray(data) ? data : Array.isArray(data?.slots) ? data.slots : [];
  return slots as NasSlot[];
}

export async function pullNasMemorySlot(
  slotId: string,
  opts?: {
    trash?: boolean;
    onProgress?: (loadedBytes: number, totalBytes: number) => void;
    summaryHint?: VaultSummary;
  },
): Promise<{ slot: NasSlot; payload: any; summary: VaultSummary }> {
  const rawQuery = opts?.trash ? "?trash=1" : "";
  const rawPath = slotId === "latest"
    ? `/sync/pull/raw${rawQuery}`
    : `/sync/slots/${encodeURIComponent(slotId)}/raw${rawQuery}`;

  // V61 : priorité au flux gzip brut. Il évite la grosse enveloppe JSON/base64
  // et réduit fortement le temps CPU/mémoire sur la WebView Android.
  try {
    const raw = await apiGetBytes(rawPath, {
      manual: true,
      timeoutMs: NAS_MANUAL_PULL_TIMEOUT_MS,
      onDownloadProgress: opts?.onProgress,
    });
    const bytes = raw.bytes;
    const isGzip = bytes.byteLength >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (!isGzip) throw new Error("Transport gzip NAS invalide");
    const payload = decodeMaybeCompressedNasPayload({
      _format: "gzip+store-v2",
      compressed: true,
      encoding: "binary",
      data: bytes,
    });
    return {
      slot: {
        id: raw.snapshotId || slotId,
        version: raw.snapshotVersion,
        updatedAt: raw.snapshotUpdatedAt,
        createdAt: raw.snapshotUpdatedAt,
        latest: slotId === "latest",
      },
      payload,
      summary: opts?.summaryHint || summarizeVaultPayload(payload),
    };
  } catch (error: any) {
    const status = Number(error?.status || 0);
    const compatibleFallback = [404, 405, 406, 409, 415, 501].includes(status) || /Transport gzip NAS invalide/i.test(String(error?.message || ""));
    if (!compatibleFallback) throw error;
  }

  // Compatibilité avec un backend NAS pas encore passé en V61 : enveloppe
  // gzip/base64 rapide, puis ancien JSON si le serveur ignore le paramètre.
  const query = new URLSearchParams();
  query.set("transport", "1");
  if (opts?.trash) query.set("trash", "1");
  const suffix = `?${query.toString()}`;
  const path = slotId === "latest"
    ? `/sync/pull${suffix}`
    : `/sync/slots/${encodeURIComponent(slotId)}${suffix}`;
  const data = await apiGet(path, {
    manual: true,
    timeoutMs: NAS_MANUAL_PULL_TIMEOUT_MS,
    onDownloadProgress: opts?.onProgress,
  });
  const payloadRaw = data?.payload ?? null;
  if (!payloadRaw) throw new Error("Payload NAS introuvable");
  const payload = decodeMaybeCompressedNasPayload(payloadRaw);
  return {
    slot: { id: data?.id || slotId, version: data?.version, updatedAt: data?.updatedAt, createdAt: data?.createdAt, deletedAt: data?.deletedAt || null, deletedReason: data?.deletedReason || null, latest: slotId === "latest" },
    payload,
    summary: opts?.summaryHint || summarizeVaultPayload(payload),
  };
}

export async function restoreNasMemorySlot(slotId: string): Promise<{ slot: NasSlot; summary: VaultSummary }> {
  await createLocalMemorySlot("Sécurité avant restauration NAS", "before-restore").catch(() => null);
  const pulled = await pullNasMemorySlot(slotId);
  await importCloudSnapshot(pulled.payload, { mode: "replace" });
  if (slotId !== "latest") {
    await apiPost(`/sync/slots/${encodeURIComponent(slotId)}/restore`, {}).catch(() => null);
  }
  return { slot: pulled.slot, summary: pulled.summary };
}

export async function createNasVersionedSnapshot(): Promise<any> {
  return pushNasAccountSnapshot();
}


export async function deleteNasMemorySlot(slotId: string, force = false): Promise<void> {
  if (!slotId || slotId === "latest") throw new Error("Le backup NAS courant ne peut pas être supprimé directement.");
  await apiDelete(`/sync/slots/${encodeURIComponent(slotId)}${force ? "?force=1" : ""}`);
}

export async function restoreNasDeletedMemorySlot(slotId: string): Promise<void> {
  if (!slotId || slotId === "latest") throw new Error("Emplacement NAS invalide.");
  await apiPost(`/sync/slots/${encodeURIComponent(slotId)}/undelete`, {});
}

export async function emptyNasDeletedMemorySlots(): Promise<void> {
  await apiDelete("/sync/slots/trash");
}

type NativeJsonExportResult = {
  cancelled?: boolean;
  exportId?: string;
  fileName?: string;
  uri?: string;
  chunksWritten?: number;
  bytesWritten?: number;
};

type NativeJsonExportPlugin = {
  beginJsonExport(options: { fileName: string; mimeType: string }): Promise<NativeJsonExportResult>;
  appendJsonChunk(options: { exportId: string; chunk: string; index: number }): Promise<NativeJsonExportResult>;
  finishJsonExport(options: { exportId: string }): Promise<NativeJsonExportResult>;
  abortJsonExport(options: { exportId: string }): Promise<void>;
};

const ANDROID_JSON_CHUNK_CHARS = 64 * 1024;
let nativeJsonExportPlugin: NativeJsonExportPlugin | null | undefined;

function getNativeJsonExportPlugin(): NativeJsonExportPlugin | null {
  if (nativeJsonExportPlugin !== undefined) return nativeJsonExportPlugin;
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      nativeJsonExportPlugin = null;
      return null;
    }
    nativeJsonExportPlugin = registerPlugin<NativeJsonExportPlugin>("NativeJsonExport");
    return nativeJsonExportPlugin;
  } catch {
    nativeJsonExportPlugin = null;
    return null;
  }
}

function safeJsonFileName(filename: string): string {
  const base = String(filename || "multisports-backup.json")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 180) || "multisports-backup.json";
  return base.toLowerCase().endsWith(".json") ? base : `${base}.json`;
}

function nextJsonChunkEnd(content: string, start: number): number {
  let end = Math.min(content.length, start + ANDROID_JSON_CHUNK_CHARS);
  if (end < content.length) {
    const previous = content.charCodeAt(end - 1);
    const next = content.charCodeAt(end);
    const splitSurrogatePair = previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
    if (splitSurrogatePair) end -= 1;
  }
  return Math.max(start + 1, end);
}

async function yieldToAndroidUi(): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

export async function exportJsonDownload(value: any, filename: string): Promise<NativeJsonExportResult> {
  const fileName = safeJsonFileName(filename);
  const nativePlugin = getNativeJsonExportPlugin();

  if (nativePlugin) {
    const content = JSON.stringify(value);
    const opened = await nativePlugin.beginJsonExport({ fileName, mimeType: "application/json" });
    if (opened.cancelled || !opened.exportId) return opened;

    const exportId = opened.exportId;
    let index = 0;
    let offset = 0;

    try {
      while (offset < content.length) {
        const end = nextJsonChunkEnd(content, offset);
        await nativePlugin.appendJsonChunk({ exportId, chunk: content.slice(offset, end), index });
        offset = end;
        index += 1;
        if (index % 8 === 0) await yieldToAndroidUi();
      }

      return await nativePlugin.finishJsonExport({ exportId });
    } catch (error) {
      try {
        await nativePlugin.abortJsonExport({ exportId });
      } catch {
        // L'erreur d'origine reste prioritaire.
      }
      throw error;
    }
  }

  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
  return { cancelled: false, fileName };
}
