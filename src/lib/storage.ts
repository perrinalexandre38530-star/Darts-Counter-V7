// ============================================
// src/lib/storage.ts — IndexedDB + compression + utilitaires
// Remplace totalement l'ancienne version localStorage
// API principale : loadStore(), saveStore(), clearStore()
// + Helpers : getKV()/setKV()/delKV(), exportAll(), importAll(), storageEstimate()
// + Tools : nukeAll(), migrateFromLocalStorage(), nukeAllKeepActiveProfile()
// + Cloud : exportCloudSnapshot(), importCloudSnapshot()
// ============================================

import type { Store, Profile } from "./types";
import { emitCloudChange } from "./cloudEvents";
import { exportHistoryDump, importHistoryDump } from "./historyCloud";
import { sanitizeAvatarDataUrl, MAX_AVATAR_DATA_URL_CHARS } from "./avatarSafe";

/* ---------- SAFE JSON ---------- */
function safeJsonParse<T = any>(value: any, fallback: T): T {
  try {
    if (value === null || value === undefined) return fallback;
    if (typeof value !== "string") return value as T;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeJsonStringify(value: any, fallback = "{}"): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}


function estimateObjectSizeBytes(obj: any): number {
  try {
    return safeJsonStringify(obj, "").length;
  } catch {
    return 0;
  }
}

function guardStoreShape<T extends Store>(store: T | null | undefined): T {
  const base: any = store && typeof store === "object" ? { ...(store as any) } : {};
  if (!Array.isArray(base.profiles)) base.profiles = [];
  if (base.activeProfileId !== undefined && base.activeProfileId !== null) {
    base.activeProfileId = String(base.activeProfileId);
  } else {
    base.activeProfileId = null;
  }
  return base as T;
}

function makeMinimalLegacyFallback<T extends Store>(store: T): Record<string, any> {
  const guarded = guardStoreShape(store);
  return {
    profiles: Array.isArray((guarded as any).profiles)
      ? (guarded as any).profiles.map((p: any) => ({
          id: p?.id ?? null,
          name: typeof p?.name === "string" ? p.name : "",
          color: typeof p?.color === "string" ? p.color : undefined,
        }))
      : [],
    activeProfileId: (guarded as any).activeProfileId ?? null,
    updatedAt: Date.now(),
    fallback: "minimal",
  };
}

function guardStoreSizeForMobile<T>(store: T): T {
  try {
    const bytes = estimateObjectSizeBytes(store);
    const mb = Math.round((bytes / 1024 / 1024) * 100) / 100;

    try {
      localStorage.setItem(
        "dc_last_store_size_v1",
        safeJsonStringify({
          at: Date.now(),
          bytes,
          mb,
        })
      );
    } catch {}

    if (bytes > 8 * 1024 * 1024) {
      console.warn("[storage] STORE TOO BIG FOR MOBILE:", mb, "MB");
      try {
        localStorage.setItem(
          "dc_store_size_warning",
          safeJsonStringify({
            at: Date.now(),
            bytes,
            mb,
            reason: "store_too_big_for_mobile",
          })
        );
      } catch {}
    }
  } catch {}
  return store;
}

function trimArrayTail<T>(arr: T[], keep: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (keep <= 0) return [];
  return arr.length > keep ? arr.slice(arr.length - keep) : arr;
}

const STORE_HISTORY_KEYS = [
  "history",
  "historyCache",
  "savedMatches",
  "matchHistory",
  "matchesHistory",
  "recentMatches",
  "historyRows",
  "historyDump",
  "matchArchive",
  "historyState",
] as const;

const STORE_HEAVY_STATS_KEYS = [
  "stats",
  "statsByPlayer",
  "statsByMode",
  "profileStats",
  "leaderboards",
  "statsCache",
  "statsCaches",
  "statsSnapshots",
  "statsBySport",
  "matchStatsCache",
] as const;

function stripStoreHistoryFields(target: any) {
  if (!target || typeof target !== "object") return target;
  for (const key of STORE_HISTORY_KEYS) delete target[key];
  delete target.lastHistorySync;
  delete target.historyVersion;
  return target;
}

function stripStoreHeavyStatsFields(target: any) {
  if (!target || typeof target !== "object") return target;
  for (const key of STORE_HEAVY_STATS_KEYS) delete target[key];
  return target;
}

function sanitizeBotLikeEntry(input: any) {
  const out = { ...(input || {}) };
  const avatarDataUrl = sanitizeAvatarFieldSync(out.avatarDataUrl);
  if (!avatarDataUrl) delete out.avatarDataUrl;
  else out.avatarDataUrl = avatarDataUrl;
  if (typeof out.avatar === "string" && out.avatar.length > MAX_AVATAR_DATA_URL_CHARS) delete out.avatar;
  if (typeof out.photoDataUrl === "string" && out.photoDataUrl.length > MAX_AVATAR_DATA_URL_CHARS) delete out.photoDataUrl;
  return out;
}

function sanitizeStoreForPersistence<T extends Store>(store: T): T {
  let clone: any;
  try {
    clone = safeJsonParse(safeJsonStringify(store || {}), {});
  } catch {
    clone = { ...(store || {}) };
  }

  stripStoreHeavyStatsFields(clone);
  stripStoreHistoryFields(clone);

  // Profiles: un seul avatar compressé, aucune variante legacy énorme.
  if (Array.isArray(clone.profiles)) {
    clone.profiles = clone.profiles.map((p: any) => {
      const out = { ...(p || {}) };
      const avatarDataUrl = sanitizeAvatarFieldSync(out.avatarDataUrl);
      if (!avatarDataUrl) {
        delete out.avatarDataUrl;
      } else {
        out.avatarDataUrl = avatarDataUrl;
      }

      if (typeof out.avatar === "string" && out.avatar.length > MAX_AVATAR_DATA_URL_CHARS) {
        delete out.avatar;
      }
      if (typeof out.photoDataUrl === "string" && out.photoDataUrl.length > MAX_AVATAR_DATA_URL_CHARS) {
        delete out.photoDataUrl;
      }

      return out;
    });
  }

  // Bots: même traitement que les profils, mais jamais de duplication d'history ici.
  if (Array.isArray(clone.bots)) {
    clone.bots = clone.bots.map((b: any) => sanitizeBotLikeEntry(b));
  }

  // Éventuels caches de reprise ultra lourds conservés par d'anciennes versions.
  if (Array.isArray(clone.resumes)) clone.resumes = trimArrayTail(clone.resumes, 20);
  if (Array.isArray(clone.liveMatches)) clone.liveMatches = trimArrayTail(clone.liveMatches, 20);

  return clone as T;
}

/* ---------- Constantes ---------- */
const DB_NAME = "darts-counter-v5";
const STORE_NAME = "kv";
// Exporté car utilisé par d'autres modules (sync/auth/migrations)
export const STORE_KEY = "store";
const LEGACY_LS_KEY = "darts-counter-store-v3";

const STORAGE_USER_LS_KEY = "dc_storage_user_id_v1";
const AUTH_SESSION_LS_KEY = "dc_online_auth_supabase_v1";
let CURRENT_USER_ID: string | null = null;

function normalizeUserId(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : String(value || "").trim();
  return s ? s : null;
}

function detectUserIdFromAuthLS(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER_LS_KEY) || localStorage.getItem(AUTH_SESSION_LS_KEY);
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      const parsed = safeJsonParse<any>(raw, null);
      return normalizeUserId(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id);
    }
    return normalizeUserId(raw);
  } catch {
    return null;
  }
}

export function getStorageUser(): string | null {
  if (CURRENT_USER_ID) return CURRENT_USER_ID;
  CURRENT_USER_ID = detectUserIdFromAuthLS();
  return CURRENT_USER_ID;
}

export function setStorageUser(userId: string | null) {
  CURRENT_USER_ID = normalizeUserId(userId);
  if (typeof localStorage === "undefined") return;
  try {
    if (CURRENT_USER_ID) localStorage.setItem(STORAGE_USER_LS_KEY, CURRENT_USER_ID);
    else localStorage.removeItem(STORAGE_USER_LS_KEY);
  } catch {}
}

export function scopedStorageKey(key: string): string {
  const uid = getStorageUser();
  return uid ? `${key}:${uid}` : key;
}

function scopedLegacyStoreKey(): string {
  const uid = getStorageUser();
  return uid ? `${LEGACY_LS_KEY}:${uid}` : LEGACY_LS_KEY;
}

function scopedCloudChangeReason(reason: string): string {
  const uid = getStorageUser();
  return uid ? `${reason}:${uid}` : reason;
}

async function migrateLegacyStoreIfNeeded() {
  const uid = getStorageUser();
  if (!uid || typeof localStorage === "undefined") return;
  try {
    const namespacedKey = scopedLegacyStoreKey();
    if (localStorage.getItem(namespacedKey)) return;
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (!legacy) return;
    localStorage.setItem(namespacedKey, legacy);
  } catch {}
}

/* ============================================================
   ✅ CLOUD SNAPSHOT (LOCAL) — inclut IndexedDB + localStorage(dc_* ET dc-*)
============================================================ */
// ✅ IMPORTANT : ton app a des clés en dc_ ET en dc- selon les versions
const LS_PREFIXES = ["dc_", "dc-"] as const;
function isDcKey(k: string) {
  return LS_PREFIXES.some((p) => k.startsWith(p));
}

const LS_EXCLUDE = new Set<string>([
  // auth online (ne jamais écraser)
  "dc_online_auth_supabase_v1",
  "sb-auth-token",
  "supabase.auth.token",

  // si tu as des clés “presence/ping” anciennes
  "dc_online_presence_v1",
  "dc_presence_v1",

  // divers flags techniques (optionnel)
  "dc_sw_purge_once",
  "dc_last_crash",

  // historique / caches legacy désormais gérés hors localStorage
  "dc-history-v1",
  "dc-history-cache-v1",
  "dc_stats_cache_v1",
  "dc_stats_cache_v2",
  "dc_match_stats_cache_v1",
]);

/**
 * ✅ HOOK GLOBAL localStorage -> emitCloudChange
 * Objectif: capturer les setItem/removeItem faits "directement" (ex: dartSetsStore)
 * Sans avoir à modifier 50 fichiers.
 *
 * - Ne touche que les clés dc_ / dc-
 * - Ignore LS_EXCLUDE
 * - Safe: no-op si déjà patché
 */
let __dcLsHookInstalled = false;

export function installLocalStorageDcHook() {
  if (typeof window === "undefined") return;
  if (__dcLsHookInstalled) return;
  __dcLsHookInstalled = true;

  try {
    const ls = window.localStorage;
    if (!ls) return;

    const originalSetItem = ls.setItem.bind(ls);
    const originalRemoveItem = ls.removeItem.bind(ls);
    const originalClear = ls.clear.bind(ls);

    // @ts-ignore
    if ((ls as any).__dc_hooked) return;
    // @ts-ignore
    (ls as any).__dc_hooked = true;

    ls.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      try {
        if (key && isDcKey(key) && !LS_EXCLUDE.has(key)) {
          emitCloudChange(`ls:set:${key}`);
        }
      } catch {}
    };

    ls.removeItem = (key: string) => {
      originalRemoveItem(key);
      try {
        if (key && isDcKey(key) && !LS_EXCLUDE.has(key)) {
          emitCloudChange(`ls:del:${key}`);
        }
      } catch {}
    };

    ls.clear = () => {
      originalClear();
      try {
        emitCloudChange(`ls:clear`);
      } catch {}
    };
  } catch {
    // si le navigateur bloque le monkey patch (rare), on ignore
  }
}

// install auto au chargement du module (web only)
try {
  if (typeof window !== "undefined") installLocalStorageDcHook();
} catch {}

/* ---------- Détection compression (gzip) ---------- */
const supportsCompression =
  typeof (globalThis as any).CompressionStream !== "undefined" &&
  typeof (globalThis as any).DecompressionStream !== "undefined";

/* ---------- Encodage / décodage ---------- */
async function compressGzip(data: string): Promise<Uint8Array | string> {
  if (!supportsCompression) return data;
  try {
    const cs = new (globalThis as any).CompressionStream("gzip");
    const stream = new Blob([data]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return data;
  }
}

async function decompressGzip(payload: ArrayBuffer | Uint8Array | string): Promise<string> {
  if (typeof payload === "string") return payload;

  // Pas de support gzip : on essaye de décoder brut
  if (!supportsCompression) {
    return new TextDecoder().decode(payload as ArrayBufferLike);
  }

  try {
    const ds = new (globalThis as any).DecompressionStream("gzip");
    const stream = new Blob([payload as ArrayBuffer]).stream().pipeThrough(ds);
    return await new Response(stream).text();
  } catch {
    // Dernier recours
    return new TextDecoder().decode(payload as ArrayBufferLike);
  }
}

/* ---------- Mini-wrapper IndexedDB (aucune lib externe) ---------- */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T = unknown>(key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);

    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: IDBValidKey, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbKeys(): Promise<IDBValidKey[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    // getAllKeys n’est pas supporté partout -> fallback curseur
    if ("getAllKeys" in store) {
      const req = (store as any).getAllKeys();
      req.onsuccess = () => resolve(req.result as IDBValidKey[]);
      req.onerror = () => reject(req.error);
    } else {
      const keys: IDBValidKey[] = [];
      const req = store.openKeyCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          keys.push(cursor.key);
          cursor.continue();
        } else {
          resolve(keys);
        }
      };
      req.onerror = () => reject(req.error);
    }
  });
}

async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ---------- Estimation de quota (quand disponible) ---------- */
export async function storageEstimate() {
  try {
    const est = (await (navigator.storage?.estimate?.() ?? Promise.resolve(undefined as any))) ?? null;

    return {
      quota: est?.quota ?? null, // bytes
      usage: est?.usage ?? null, // bytes
      usageDetails: est?.usageDetails ?? null,
    };
  } catch {
    return { quota: null, usage: null, usageDetails: null };
  }
}

function shouldExportLocalStorageDcKey(key: string, value: string | null): boolean {
  if (!key || !isDcKey(key) || LS_EXCLUDE.has(key)) return false;
  const lower = key.toLowerCase();
  if (
    lower.includes("history") ||
    lower.includes("stats") ||
    lower.includes("matchcache") ||
    lower.includes("historycache")
  ) {
    return false;
  }
  if (typeof value === "string" && value.length > 250_000) return false;
  return true;
}

function exportLocalStorageDc(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i) || "";
      if (!k) continue;
      const v = ls.getItem(k);
      if (!shouldExportLocalStorageDcKey(k, v)) continue;
      if (v != null) out[k] = v;
    }
  } catch {}
  return out;
}

function importLocalStorageDc(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  if (!map || typeof map !== "object") return;

  for (const [k, v] of Object.entries(map)) {
    if (!shouldExportLocalStorageDcKey(k, typeof v === "string" ? v : String(v ?? ""))) continue;
    try {
      window.localStorage.setItem(k, String(v ?? ""));
    } catch {}
  }
}

// Utile en mode "replace" : évite de garder des dc_* / dc-* obsolètes
function clearLocalStorageDc(): void {
  if (typeof window === "undefined") return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i) || "";
      if (!k) continue;
      if (!shouldExportLocalStorageDcKey(k, window.localStorage.getItem(k))) continue;
      toDelete.push(k);
    }
    for (const k of toDelete) {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    }
  } catch {}
}

/* ============================================================
   ✅ NORMALISATION AVATARS (COMPAT)
============================================================ */
function normalizeStoreAvatarsCompatSync<T extends any>(store: T): { store: T; changed: boolean } {
  try {
    const profiles = (store as any)?.profiles;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { store, changed: false };
    }

    let changed = false;

    const nextProfiles = profiles.map((p: any) => {
      if (!p || typeof p !== "object") return p;

      const avatarUrl = typeof p.avatarUrl === "string" ? p.avatarUrl.trim() : "";
      const avatarPath = typeof p.avatarPath === "string" ? p.avatarPath.trim() : "";
      const avatarDataUrl = sanitizeAvatarFieldSync(p.avatarDataUrl);

      // ✅ legacy champs rencontrés dans d'anciennes versions
      const legacyAvatar =
        sanitizeAvatarFieldSync(p.avatar) ||
        sanitizeAvatarFieldSync(p.photoDataUrl) ||
        (typeof p.photoUrl === "string" ? String(p.photoUrl).trim() : "");

      if (!avatarDataUrl) {
        if (typeof p?.avatarDataUrl === "string" && p.avatarDataUrl.length > MAX_AVATAR_DATA_URL_CHARS) {
          changed = true;
          return { ...p, avatarDataUrl: undefined };
        }
        if (avatarUrl) {
          changed = true;
          return { ...p, avatarDataUrl: avatarUrl };
        }

        if (
          legacyAvatar &&
          (legacyAvatar.startsWith("http://") ||
            legacyAvatar.startsWith("https://") ||
            legacyAvatar.startsWith("data:") ||
            legacyAvatar.startsWith("blob:"))
        ) {
          changed = true;
          return { ...p, avatarDataUrl: legacyAvatar };
        }

        if (
          avatarPath &&
          (avatarPath.startsWith("http://") ||
            avatarPath.startsWith("https://") ||
            avatarPath.startsWith("data:") ||
            avatarPath.startsWith("blob:"))
        ) {
          changed = true;
          return { ...p, avatarDataUrl: avatarPath };
        }
      }

      return p;
    });

    if (!changed) return { store, changed: false };

    return {
      store: { ...(store as any), profiles: nextProfiles } as T,
      changed: true,
    };
  } catch {
    return { store, changed: false };
  }
}

/* ============================================================
   ✅ NORMALISATION AVATAR (PERF)
============================================================ */
function isHugeImageDataUrl(s: any, minLen = 200_000): s is string {
  return typeof s === "string" && s.startsWith("data:image/") && s.length > minLen;
}


function sanitizeAvatarFieldSync(v: any): string {
  try {
    return sanitizeAvatarDataUrl(v, MAX_AVATAR_DATA_URL_CHARS) || "";
  } catch {
    return "";
  }
}

async function downscaleImageDataUrl(dataUrl: string, maxSize = 256, quality = 0.82): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  return new Promise<string>((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 1;
          const h = img.naturalHeight || img.height || 1;

          const scale = Math.min(1, maxSize / Math.max(w, h));
          const tw = Math.max(1, Math.round(w * scale));
          const th = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement("canvas");
          canvas.width = tw;
          canvas.height = th;

          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(dataUrl);

          ctx.drawImage(img, 0, 0, tw, th);

          const out = canvas.toDataURL("image/jpeg", quality);
          resolve(out || dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

async function normalizeStoreAvatarsPerf<T extends Store>(store: T): Promise<{ store: T; changed: boolean }> {
  try {
    const profiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
    if (profiles.length === 0) return { store, changed: false };

    let changed = false;

    const nextProfiles = await Promise.all(
      profiles.map(async (p) => {
        if (!p) return p;

        const hasAvatarUrl = typeof p.avatarUrl === "string" && p.avatarUrl.trim().length > 0;
        if (hasAvatarUrl) return p;

        const raw = sanitizeAvatarFieldSync(p.avatarDataUrl) || p.avatarDataUrl;

        if (typeof raw === "string" && raw.startsWith("data:image/") && raw.length > MAX_AVATAR_DATA_URL_CHARS) {
          changed = true;
          return { ...p, avatarDataUrl: undefined };
        }

        if (isHugeImageDataUrl(raw)) {
          const slim = await downscaleImageDataUrl(raw, 256, 0.82);
          if (typeof slim === "string" && slim !== raw) {
            changed = true;
            return { ...p, avatarDataUrl: slim };
          }
        }

        return p;
      })
    );

    if (!changed) return { store, changed: false };

    return {
      store: { ...(store as any), profiles: nextProfiles } as T,
      changed: true,
    };
  } catch {
    return { store, changed: false };
  }
}

async function normalizeStoreAll<T extends Store>(store: T): Promise<{ store: T; changed: boolean }> {
  const compat = normalizeStoreAvatarsCompatSync(store);
  const perf = await normalizeStoreAvatarsPerf(compat.store);
  return { store: perf.store, changed: compat.changed || perf.changed };
}

/* ---------- API publique principale ---------- */

export async function loadStore<T extends Store>(): Promise<T | null> {
  try {
    await migrateLegacyStoreIfNeeded();
    const raw = (await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(STORE_KEY))) ?? null;

    if (raw != null) {
      const json = await decompressGzip(raw as any);
      const parsed = safeJsonParse<T | null>(json, null);

      if (!parsed) return null;

      const guarded = guardStoreShape(parsed);
      const norm = await normalizeStoreAll(guarded);

      if (norm.changed) {
        try {
          const payload = await compressGzip(safeJsonStringify(norm.store));
          await idbSet(scopedStorageKey(STORE_KEY), payload);

    try {
      console.log("🔥 saveStore déclenché");
      emitCloudChange(scopedCloudChangeReason("idb:set:store"));
    } catch (e) {
      console.warn("emitCloudChange failed", e);
    }
        } catch {}
      }

      return guardStoreShape(norm.store);
    }

    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy) {
      const parsed = safeJsonParse<T | null>(legacy, null);
      if (!parsed) return null;

      const guarded = guardStoreShape(parsed);
      const norm = await normalizeStoreAll(guarded);

      await saveStore(norm.store);
      try {
        localStorage.removeItem(scopedLegacyStoreKey());
      } catch {}

      return guardStoreShape(norm.store);
    }

    return null;
  } catch (err) {
    console.warn("[storage] loadStore error:", err);
    return null;
  }
}

type SaveOpts = {
  skipAsyncNormalize?: boolean;
};

export async function saveStore<T extends Store>(store: T, opts?: SaveOpts): Promise<void> {
  const guardedInput = guardStoreShape(store);

  try {
    const compat = normalizeStoreAvatarsCompatSync(guardedInput);

    const normalized =
      opts?.skipAsyncNormalize === true
        ? { store: compat.store as T, changed: compat.changed }
        : await normalizeStoreAll(compat.store as T);

    let persistedStore = guardStoreShape(sanitizeStoreForPersistence(normalized.store as T));

    const preTrimBytes = estimateObjectSizeBytes(persistedStore);
    if (preTrimBytes > 2_000_000) {
      console.warn("[storage] store trop volumineux, trimming préventif avant écriture.");
      const trimmed: any = { ...(persistedStore as any) };
      delete trimmed.stats;
      delete trimmed.statsByPlayer;
      delete trimmed.statsByMode;
      delete trimmed.profileStats;
      delete trimmed.leaderboards;
      stripStoreHistoryFields(trimmed);
      if (Array.isArray(trimmed.profiles)) {
        trimmed.profiles = trimmed.profiles.map((p: any) => {
          const out = { ...(p || {}) };
          delete out.avatarDataUrl;
          delete out.avatar;
          delete out.photoDataUrl;
          return out;
        });
      }
      persistedStore = guardStoreShape(trimmed as T);
    }

    persistedStore = guardStoreSizeForMobile(persistedStore);

    let json = safeJsonStringify(persistedStore);
    let payload = await compressGzip(json);

    const est = await storageEstimate();
    if (est.quota != null && est.usage != null && typeof payload !== "string") {
      const projected = est.usage + (payload as Uint8Array).byteLength;
      if (projected > est.quota * 0.98) {
        console.warn("[storage] quota presque plein, réduction agressive du store avant écriture.");

        const emergencyStore: any = sanitizeStoreForPersistence({ ...(persistedStore as any) });
        if (Array.isArray(emergencyStore.profiles)) {
          emergencyStore.profiles = emergencyStore.profiles.map((p: any) => {
            const out = { ...(p || {}) };
            delete out.avatarDataUrl;
            delete out.avatar;
            delete out.photoDataUrl;
            return out;
          });
        }

        persistedStore = guardStoreShape(emergencyStore as T);
        json = safeJsonStringify(persistedStore);
        payload = await compressGzip(json);
      }
    }

    await idbSet(scopedStorageKey(STORE_KEY), payload);
  } catch (err) {
    console.error("[storage] saveStore error:", err);
    try {
      const minimalFallback = makeMinimalLegacyFallback(guardedInput);
      localStorage.setItem(scopedLegacyStoreKey(), safeJsonStringify(minimalFallback));
    } catch {
      console.warn("[storage] legacy fallback skipped");
    }
  }
}

export async function clearStore(): Promise<void> {
  try {
    await idbDel(scopedStorageKey(STORE_KEY));
  } catch {}
  try {
    localStorage.removeItem(scopedLegacyStoreKey());
  } catch {}
}

/* ---------- KV générique ---------- */
export async function getKV<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(key));
    if (raw == null) return null;
    const json = await decompressGzip(raw as any);
    return safeJsonParse<T | null>(json, null);
  } catch (err) {
    console.warn("[storage] getKV error:", key, err);
    return null;
  }
}

/** Enregistre une valeur JSON (gzip si dispo). */
export async function setKV(key: string, value: any): Promise<void> {
  try {
    const json = safeJsonStringify(value);
    const payload = await compressGzip(json);

    await idbSet(scopedStorageKey(key), payload);

    // ✅ signal cloud après écriture OK
    emitCloudChange(scopedCloudChangeReason(`idb:set:${key}`));
  } catch (err) {
    console.error("[storage] setKV error:", key, err);
  }
}

/** Supprime une clé. */
export async function delKV(key: string): Promise<void> {
  try {
    await idbDel(scopedStorageKey(key));

    // ✅ signal cloud après suppression OK
    emitCloudChange(scopedCloudChangeReason(`idb:del:${key}`));
  } catch (err) {
    console.warn("[storage] delKV error:", key, err);
  }
}

/* ---------- Helpers export IDB ---------- */
async function listKVKeys(): Promise<string[]> {
  const keys = await idbKeys();
  return keys.map((k) => String(k));
}

/* ============================================================
   Export / Import ALL (IDB + localStorage dc_* & dc-*)
   ✅ FIX : importAll supporte _v:2 (exportAll actuel) + restore history
============================================================ */
export async function exportAll(): Promise<any> {
  const idbDump: Record<string, any> = {};

  try {
    const db = await openDB();

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const req = store.getAllKeys();

    const keys: IDBValidKey[] = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const valuesReq = store.getAll();

    const values: any[] = await new Promise((resolve, reject) => {
      valuesReq.onsuccess = () => resolve(valuesReq.result || []);
      valuesReq.onerror = () => reject(valuesReq.error);
    });

    for (let i = 0; i < keys.length; i++) {
      try {
        const raw = values[i];

        if (raw == null) continue;

        const json = await decompressGzip(raw);
        const parsed = safeJsonParse(json, null);
        if (String(keys[i]) === scopedStorageKey(STORE_KEY) && parsed && typeof parsed === "object") {
          idbDump[String(keys[i])] = sanitizeStoreForPersistence(parsed as any);
        } else {
          idbDump[String(keys[i])] = parsed;
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[storage] exportAll optimized read failed:", err);
  }

  const lsDump = exportLocalStorageDc();

  return {
    _v: 2,
    idb: idbDump,
    localStorage: lsDump,
    history: await exportHistoryDump().catch(() => ({ _v: 1, rows: {} })),
    exportedAt: new Date().toISOString(),
  };
}

export async function importAll(dump: any): Promise<void> {
  if (!dump) return;

  // ✅ Support snapshots structurés (v1 et v2)
  // - v2 = format produit par exportAll() dans ce fichier
  if ((dump._v === 1 || dump._v === 2) && dump.idb) {
    const idbDump = dump.idb || {};
    const lsDump = dump.localStorage || {};

    // 1) restore KV (IDB kv)
    for (const [k, v] of Object.entries(idbDump)) {
      try {
        const key = String(k);
        const value = key === scopedStorageKey(STORE_KEY) ? sanitizeStoreForPersistence(v as any) : v;
        await setKV(key, value);
      } catch {}
    }

    // 2) restore localStorage (dc_* + dc-*)
    importLocalStorageDc(lsDump);

    // 3) ✅ CRITIQUE : restore DB historique (historyCloud)
    try {
      if (dump.history && dump.history._v === 1) {
        await importHistoryDump(dump.history, { replace: true });
      }
    } catch {}

    return;
  }

  // fallback legacy (imports très anciens clé->valeur)
  if (typeof dump === "object") {
    for (const [k, v] of Object.entries(dump)) {
      try {
        await setKV(String(k), v);
      } catch {}
    }
  }
}

/* ============================================================
   🧩 DartSets — compat localStorage (SOURCE DE VÉRITÉ UI)
   Objectif : restaurer les dartSets EXACTEMENT là où l’UI lit
============================================================ */

const LS_DARTSETS_KEYS = ["dc-dartsets-v1", "dc-dartSets-v1", "dc_lite_dartsets_v1", "dc-lite-dartsets-v1"];

const LS_ACTIVE_DARTSET_KEYS = ["dc-active-dartset-id", "dc-active-dartSet-id", "dc_dartset_active"];

function isRecord(x: any): x is Record<string, any> {
  return x && typeof x === "object" && !Array.isArray(x);
}

function pickFirst<T>(...vals: Array<T | undefined | null>): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

function writeDartSetsToLocalStorage(dartSets: any) {
  try {
    const s = safeJsonStringify(dartSets ?? {});
    for (const k of LS_DARTSETS_KEYS) localStorage.setItem(k, s);
  } catch (e) {
    console.warn("[dartsets] write localStorage failed", e);
  }
}

function writeActiveDartSetIdToLocalStorage(activeId: any) {
  if (!activeId) return;
  try {
    const v = String(activeId);
    for (const k of LS_ACTIVE_DARTSET_KEYS) localStorage.setItem(k, v);
  } catch (e) {
    console.warn("[dartsets] write active id failed", e);
  }
}

/**
 * Extrait dartSets depuis un snapshot cloud (tolère plusieurs formats)
 */
function extractDartSetsFromSnapshot(snap: any) {
  if (!isRecord(snap)) return { dartSets: null as any, activeId: null as any };

  // formats possibles selon ton historique
  const store = isRecord(snap.store) ? snap.store : null;
  const data = isRecord(snap.data) ? snap.data : null;

  const dartSets =
    pickFirst(store?.dartSets, store?.dartsets, data?.dartSets, data?.dartsets, snap.dartSets, snap.dartsets) ?? null;

  const activeId =
    pickFirst(
      store?.activeDartSetId,
      store?.active_dartset_id,
      data?.activeDartSetId,
      snap.activeDartSetId,
      snap.active_dartset_id
    ) ?? null;

  return { dartSets, activeId };
}

/* ============================================================
   ✅ CLOUD SNAPSHOT (Supabase user_store)
============================================================ */

export type CloudSnapshot = any;

// ============================================================
// ✅ Sanitize snapshots before pushing to Supabase
// - Avoid pushing huge base64 blobs (data:...)
// - Avoid leaking sensitive local-only fields
// ============================================================
function sanitizeStoreForCloud(store: any) {
  let clone: any;
  try {
    clone = safeJsonParse(safeJsonStringify(store || {}), {});
  } catch {
    clone = { ...(store || {}) };
  }

  // Profiles: strip avatarDataUrl (base64)
  if (Array.isArray(clone.profiles)) {
    clone.profiles = clone.profiles.map((p: any) => {
      const out = { ...(p || {}) };
      const v = out.avatarDataUrl;
      if (typeof v === "string" && v.startsWith("data:")) delete out.avatarDataUrl;

      // never push any stored password
      try {
        if (out.privateInfo && typeof out.privateInfo === "object") {
          const pi: any = { ...(out.privateInfo as any) };
          if (pi.password) delete pi.password;
          out.privateInfo = pi;
        }
      } catch {}

      return out;
    });
  }

  // History ne doit plus voyager dans le store principal cloud.
  stripStoreHistoryFields(clone);
  stripStoreHeavyStatsFields(clone);

  // Dart sets: strip photoDataUrl (base64)
  if (Array.isArray((clone as any).dartSets)) {
    (clone as any).dartSets = (clone as any).dartSets.map((ds: any) => {
      const dso: any = { ...(ds || {}) };
      const p = dso.photoDataUrl;
      if (typeof p === "string" && p.startsWith("data:")) delete dso.photoDataUrl;
      return dso;
    });
  }

  return clone;
}

export async function exportCloudSnapshot(): Promise<CloudSnapshot> {
  return await exportAll();
}

export async function importCloudSnapshot(dump: CloudSnapshot, opts?: { mode?: "replace" | "merge" }): Promise<void> {
  const mode = opts?.mode ?? "replace";

  if (mode === "replace") {
    await nukeAll();
    clearLocalStorageDc();
  }

  await importAll(dump);

  // ✅ Important: le cloud peut contenir des doublons (ex: plusieurs profils locaux
  // clonés depuis le profil online). On nettoie systématiquement après import
  // pour éviter que l'UI "Profils locaux" explose.
  try {
    await normalizeLocalProfilesInStore();
  } catch (err) {
    console.warn("[storage] normalizeLocalProfilesInStore failed", err);
  }

  // ✅ CRITIQUE : restaurer les DartSets là où l’UI lit réellement
  const { dartSets, activeId } = extractDartSetsFromSnapshot(dump);
  if (dartSets) writeDartSetsToLocalStorage(dartSets);
  if (activeId) writeActiveDartSetIdToLocalStorage(activeId);
}

// ------------------------------------------------------------
// Normalisation profils locaux (post-import / pre-push)
// ------------------------------------------------------------

function scoreProfileCompleteness(p: any): number {
  let s = 0;
  const keys = ["name", "country", "avatarUrl", "surname", "firstName", "birthDate", "city", "phone"];
  for (const k of keys) if (p?.[k]) s += 1;
  return s;
}

function isOnlineShadowProfile(p: any): boolean {
  const id = String(p?.id ?? "");
  // Notre convention (si jamais elle traîne dans des snapshots)
  if (id.startsWith("online:")) return true;
  // Et on écarte aussi les profils manifestement injectés depuis Supabase
  // (ils n'ont aucune donnée locale de profil, uniquement email/nickname)
  if (p?.isOnline === true) return true;
  return false;
}

async function normalizeLocalProfilesInStore(): Promise<void> {
  const raw = await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(STORE_KEY));
  if (raw == null) return;

  const txt = await decompressGzip(raw as any);
  const store = safeJsonParse<any | null>(txt, null);
  if (!store) return;

  const arr = Array.isArray(store?.profiles) ? [...store.profiles] : [];

  // 1) retire les "online" du tableau local
  const locals = arr.filter((p) => !isOnlineShadowProfile(p));

  // 2) dédoublonne par id
  const byId = new Map<string, any>();
  for (const p of locals) {
    const id = String(p?.id ?? "");
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, p);
    } else {
      // garde la version la plus "complète"
      const keep = scoreProfileCompleteness(p) >= scoreProfileCompleteness(prev) ? p : prev;
      byId.set(id, keep);
    }
  }

  // 3) dédoublonne "souple" par signature (name+country+avatarUrl)
  const bySig = new Map<string, any>();
  for (const p of byId.values()) {
    const sig = [String(p?.name ?? "").trim().toLowerCase(), String(p?.country ?? "").trim().toLowerCase(), String(p?.avatarUrl ?? "").trim()].join("|");

    const prev = bySig.get(sig);
    if (!prev) {
      bySig.set(sig, p);
    } else {
      const keep = scoreProfileCompleteness(p) >= scoreProfileCompleteness(prev) ? p : prev;
      bySig.set(sig, keep);
    }
  }

  const cleaned = Array.from(bySig.values());

  // 4) sécurise l'activeProfileId
  const activeId = String(store?.activeProfileId ?? "");
  if (activeId && !cleaned.some((p) => String(p?.id) === activeId)) {
    store.activeProfileId = cleaned[0]?.id ?? null;
  }

  store.profiles = cleaned;

  const outTxt = safeJsonStringify(store);
  const outRaw = await compressGzip(outTxt);
  await idbSet(scopedStorageKey(STORE_KEY), outRaw);
}

export async function nukeAll(): Promise<void> {
  try {
    await idbClear();
  } catch (err) {
    console.error("[storage] nukeAll error:", err);
  }
}

/* ============================================================
   ✅ WIPE TOTAL LOCAL (pour SIGNED_OUT / changement de compte)
   - Clear IndexedDB (store principal)
   - Clear toutes les clés localStorage dc_ / dc-
   - Supprime aussi la clé legacy darts-counter-store-v3
============================================================ */
export async function wipeAllLocalData(): Promise<void> {
  try {
    await nukeAll();
  } catch {}

  try {
    clearLocalStorageDc();
  } catch {}

  try {
    localStorage.removeItem(scopedLegacyStoreKey());
  } catch {}

  // par sécurité, retire aussi l'auth online éventuelle (si présente)
  try {
    localStorage.removeItem("dc_online_auth_supabase_v1");
  } catch {}
}

/* ---------- Migration utilitaire ---------- */
export async function migrateFromLocalStorage(keys: string[]) {
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;

    try {
      const parsed = safeJsonParse(raw, null);
      if (parsed !== null) {
        await setKV(k, parsed);
      } else {
        await idbSet(k, raw);
      }
    } catch {
      try {
        await idbSet(k, raw);
      } catch {}
    }

    try {
      localStorage.removeItem(k);
    } catch {}
  }
}

/* ============================================================
   RESET COMPLET : garder uniquement le profil actif (sans stats)
============================================================ */
export async function nukeAllKeepActiveProfile(): Promise<void> {
  let activeProfile: Profile | null = null;

  try {
    const raw = await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(STORE_KEY));
    if (raw != null) {
      const txt = await decompressGzip(raw as any);
      const parsed = safeJsonParse<Store | null>(txt, null);

      const activeId = (parsed as any)?.activeProfileId ?? null;
      if (activeId) {
        const prof = parsed?.profiles?.find((p) => p.id === activeId) || null;
        activeProfile = prof ? { ...prof } : null;
      }
    }
  } catch (err) {
    console.warn("[storage] unable to load existing store before reset", err);
  }

  try {
    await idbClear();
  } catch (err) {
    console.warn("[storage] idbClear error during reset", err);
  }

  try {
    localStorage.removeItem(scopedLegacyStoreKey());
  } catch {}

  if (activeProfile) {
    const cleanProfile: Profile = { ...activeProfile };

    const newStore: Store = {
      profiles: [cleanProfile],
      activeProfileId: cleanProfile.id,
      selfStatus: "online",
    } as Store;

    try {
      const payload = await compressGzip(safeJsonStringify(newStore));
      await idbSet(scopedStorageKey(STORE_KEY), payload);
    } catch (err) {
      console.warn("[storage] unable to write minimal store after reset", err);
    }
  }
}
