import LZString from "lz-string";
import { gunzipSync, strFromU8 } from "fflate";
import { apiGet, apiPost } from "./apiClient";
import { exportCloudSnapshot, importCloudSnapshot } from "./storage";
import { pushNasAccountSnapshot } from "./manualNasSync";

type AnyRecord = Record<string, any>;

export type VaultSummary = {
  bytes: number;
  keys: number;
  profiles: number;
  matches: number;
  historyRows: number;
  statsBlocks: number;
  mediaRefs: number;
  dataImages: number;
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
};

export type MemorySlot = {
  id: string;
  createdAt: string;
  updatedAt: string;
  label: string;
  source: "local" | "before-restore" | "manual";
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
  summary?: Partial<VaultSummary> | null;
  latest?: boolean;
};

const VAULT_DB = "dc_memory_card_v1";
const VAULT_STORE = "slots";
const MAX_LOCAL_SLOTS = 10;

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
      if (/history|match|matches|partie|saved/.test(low)) {
        const matchItems = node.filter((item) => looksLikeMatchObject(item)).length;
        matches += matchItems || (node.length && /history|match|partie/.test(low) ? node.length : 0);
      }
      for (let i = 0; i < Math.min(node.length, 250); i += 1) walk(node[i], `${path}[${i}]`);
      return;
    }

    const obj = node as AnyRecord;
    const objKeys = Object.keys(obj);
    keys += objKeys.length;

    if (!exportedAt && typeof obj.exportedAt === "string") exportedAt = obj.exportedAt;
    if (looksLikeMatchObject(obj)) matches += 1;

    if (typeof obj.sport === "string") uniquePush(sports, obj.sport, 12);
    if (typeof obj.mode === "string") uniquePush(sports, obj.mode, 12);
    if (typeof obj.gameMode === "string") uniquePush(sports, obj.gameMode, 12);

    for (const k of ["name", "displayName", "nickname", "playerName", "teamName", "winnerName"]) {
      if (typeof obj[k] === "string") uniquePush(names, obj[k], 16);
    }

    if (isRecord(obj.history) && isRecord(obj.history.rows)) {
      const c = Object.keys(obj.history.rows).length;
      historyRows += c;
      matches += c;
      if (c > 0) probable.add("historique");
    }
    if (isRecord(obj.rows) && /history|match/i.test(path)) {
      const c = Object.keys(obj.rows).length;
      historyRows += c;
      matches += c;
      if (c > 0) probable.add("historique");
    }

    for (const [k, v] of Object.entries(obj)) {
      const low = k.toLowerCase();
      if (low.includes("profile") && Array.isArray(v)) profiles = Math.max(profiles, v.length);
      if ((low === "stats" || low.includes("stats")) && v && typeof v === "object") statsBlocks += 1;
      if (/media|avatar|photo|image/.test(low) && typeof v === "string" && v) mediaRefs += /\/media\//.test(v) ? 1 : 0;
      if (/history|match|matches|partie|saved/.test(low) && Array.isArray(v)) probable.add("parties");
      walk(v, path ? `${path}.${k}` : k);
    }
  };

  walk(root);

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
    statsBlocks,
    mediaRefs,
    dataImages,
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
  return slots.sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
}

export async function createLocalMemorySlot(label = "Bloc local", source: MemorySlot["source"] = "manual"): Promise<MemorySlot> {
  const payload = await exportCloudSnapshot();
  const now = new Date().toISOString();
  const slot: MemorySlot = {
    id: `local_${now.replace(/[^0-9]/g, "")}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    label,
    source,
    payload,
    summary: summarizeVaultPayload(payload),
  };
  await vaultPut(slot);
  const slots = await listLocalMemorySlots();
  for (const old of slots.slice(MAX_LOCAL_SLOTS)) await vaultDelete(old.id).catch(() => {});
  return slot;
}

export async function deleteLocalMemorySlot(id: string): Promise<void> {
  await vaultDelete(id);
}

export async function restoreLocalMemorySlot(id: string): Promise<MemorySlot> {
  const slots = await listLocalMemorySlots();
  const slot = slots.find((s) => s.id === id);
  if (!slot) throw new Error("Bloc local introuvable");
  await createLocalMemorySlot("Sécurité avant restauration locale", "before-restore").catch(() => null);
  await importCloudSnapshot(slot.payload, { mode: "replace" });
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
      const rows = await readAllFromObjectStore(db, storeName);
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
    source: "localSlot",
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
  if (payload._format === "gzip+store-v2" && payload.compressed && typeof payload.data === "string") {
    const binary = atob(payload.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(strFromU8(gunzipSync(bytes)));
  }
  if (payload._format === "lz-string+store-v1" && payload.compressed && typeof payload.data === "string") {
    const json = payload.encoding === "utf16" ? LZString.decompressFromUTF16(payload.data) : LZString.decompressFromBase64(payload.data);
    if (!json) throw new Error("Impossible de décompresser le payload NAS");
    return JSON.parse(json);
  }
  return payload;
}

export async function listNasMemorySlots(): Promise<NasSlot[]> {
  const data = await apiGet("/sync/slots").catch(async () => {
    const latest = await apiGet("/sync/pull");
    if (!latest?.payload) return { slots: [] };
    return { slots: [{ id: "latest", latest: true, version: latest.version, updatedAt: latest.updatedAt, createdAt: latest.updatedAt }] };
  });
  const slots = Array.isArray(data) ? data : Array.isArray(data?.slots) ? data.slots : [];
  return slots as NasSlot[];
}

export async function pullNasMemorySlot(slotId: string): Promise<{ slot: NasSlot; payload: any; summary: VaultSummary }> {
  const data = slotId === "latest" ? await apiGet("/sync/pull") : await apiGet(`/sync/slots/${encodeURIComponent(slotId)}`);
  const payloadRaw = data?.payload ?? null;
  if (!payloadRaw) throw new Error("Payload NAS introuvable");
  const payload = decodeMaybeCompressedNasPayload(payloadRaw);
  return {
    slot: { id: data?.id || slotId, version: data?.version, updatedAt: data?.updatedAt, createdAt: data?.createdAt, latest: slotId === "latest" },
    payload,
    summary: summarizeVaultPayload(payload),
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

export async function exportJsonDownload(value: any, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}
