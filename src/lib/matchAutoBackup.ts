import LZString from "lz-string";
import { apiDelete, apiGet, apiPost, readNasAccessToken } from "./apiClient";

const DB_NAME = "dc-match-backups-v1";
const DB_VERSION = 1;
const STORE_NAME = "matches";
const MAX_LOCAL_MATCH_BACKUPS = 500;

export type MatchBackupOrigin = "local" | "nas";

export type MatchBackupItem = {
  id: string;
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
};

function nowIso() {
  return new Date().toISOString();
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
      const req = store.put({ ...item, origin: "local" });
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
      .filter((r) => r?.matchId && r?.payloadCompressed)
      .map((r) => ({ ...r, origin: "local" as const }))
      .sort((a, b) => Date.parse(b.savedAt || "") - Date.parse(a.savedAt || ""));
  }).catch(() => []);
}

export async function getLocalMatchBackup(id: string): Promise<MatchBackupItem | null> {
  return txStore("readonly", async (store) => {
    return await new Promise<MatchBackupItem | null>((resolve) => {
      const req = store.get(String(id || ""));
      req.onsuccess = () => resolve(req.result ? { ...req.result, origin: "local" } : null);
      req.onerror = () => resolve(null);
    });
  }).catch(() => null);
}

export async function deleteLocalMatchBackup(id: string): Promise<void> {
  await txStore("readwrite", async (store) => {
    store.delete(String(id || ""));
  }).catch(() => undefined);
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

export async function saveMatchBackupAfterHistoryUpsert(args: {
  header: any;
  payload?: any;
  payloadCompressed?: string;
  source?: string;
}): Promise<void> {
  const item = buildMatchBackupItem(args);
  if (!item) return;
  await saveLocalMatchBackup(item).catch(() => undefined);
  await pushMatchBackupToNas(item).catch((error) => {
    try {
      localStorage.setItem("dc_match_backup_last_nas_error", JSON.stringify({ at: nowIso(), message: error?.message || String(error) }));
    } catch {}
  });
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
