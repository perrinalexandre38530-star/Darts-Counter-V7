// ============================================
// src/lib/storage.ts — IndexedDB + compression + utilitaires
// Remplace totalement l'ancienne version localStorage
// API principale : loadStore(), saveStore(), clearStore()
// + Helpers : getKV()/setKV()/delKV(), exportAll(), importAll(), storageEstimate()
// + Tools : nukeAll(), migrateFromLocalStorage(), nukeAllKeepActiveProfile()
// + Cloud : exportCloudSnapshot(), importCloudSnapshot()
// ============================================

import type { Store, Profile } from "./types";

/* ---------- Constantes ---------- */
const DB_NAME = "darts-counter-v5";
const STORE_NAME = "kv";
const STORE_KEY = "store";
const LEGACY_LS_KEY = "darts-counter-store-v3";

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
    const est =
      (await (navigator.storage?.estimate?.() ?? Promise.resolve(undefined as any))) ?? null;

    return {
      quota: est?.quota ?? null, // bytes
      usage: est?.usage ?? null, // bytes
      usageDetails: est?.usageDetails ?? null,
    };
  } catch {
    return { quota: null, usage: null, usageDetails: null };
  }
}

/* ============================================================
   ✅ NORMALISATION AVATARS (COMPAT)
   Certains écrans legacy lisent uniquement profile.avatarDataUrl.
   => si avatarUrl (Supabase) ou avatarPath existe, et avatarDataUrl vide,
      on copie l’URL vers avatarDataUrl.
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
      const avatarDataUrl = typeof p.avatarDataUrl === "string" ? p.avatarDataUrl.trim() : "";

      if (!avatarDataUrl) {
        if (avatarUrl) {
          changed = true;
          return { ...p, avatarDataUrl: avatarUrl };
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
   Objectif : éviter les dataUrl énormes (RAM/latence + UI qui casse)
   - si data:image/... trop gros => downscale JPEG 256px
============================================================ */
function isHugeImageDataUrl(s: any, minLen = 200_000): s is string {
  return typeof s === "string" && s.startsWith("data:image/") && s.length > minLen;
}

async function downscaleImageDataUrl(dataUrl: string, maxSize = 256, quality = 0.82): Promise<string> {
  // Pas de DOM/canvas (SSR) -> on garde tel quel
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

          // JPEG compact ; si tu veux transparence => "image/webp"
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

        // Si avatarUrl existe (Supabase) -> on ne touche pas ici
        const hasAvatarUrl = typeof p.avatarUrl === "string" && p.avatarUrl.trim().length > 0;
        if (hasAvatarUrl) return p;

        const raw = p.avatarDataUrl;

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
  // 1) compat sync (copie avatarUrl->avatarDataUrl si besoin)
  const compat = normalizeStoreAvatarsCompatSync(store);
  // 2) perf async (downscale dataUrl énormes)
  const perf = await normalizeStoreAvatarsPerf(compat.store);
  return { store: perf.store, changed: compat.changed || perf.changed };
}

/* ---------- API publique principale ---------- */

/** Charge le store depuis IndexedDB (et migre depuis localStorage si présent). */
export async function loadStore<T extends Store>(): Promise<T | null> {
  try {
    // 1) IndexedDB
    const raw = (await idbGet<ArrayBuffer | Uint8Array | string>(STORE_KEY)) ?? null;

    if (raw != null) {
      const json = await decompressGzip(raw as any);
      const parsed = JSON.parse(json) as T;

      const norm = await normalizeStoreAll(parsed);

      // ✅ si on a modifié, on persiste directement sans repasser par saveStore (évite boucles)
      if (norm.changed) {
        try {
          const payload = await compressGzip(JSON.stringify(norm.store));
          await idbSet(STORE_KEY, payload);
        } catch {}
      }

      return norm.store;
    }

    // 2) Migration depuis localStorage (legacy)
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as T;

      const norm = await normalizeStoreAll(parsed);

      await saveStore(norm.store);
      try {
        localStorage.removeItem(LEGACY_LS_KEY);
      } catch {}

      return norm.store;
    }

    return null;
  } catch (err) {
    console.warn("[storage] loadStore error:", err);
    return null;
  }
}

type SaveOpts = {
  /** évite l’étape async (downscale) si tu veux une écriture ultra rapide */
  skipAsyncNormalize?: boolean;
};

/** Sauvegarde complète du store (écrase la valeur précédente). */
export async function saveStore<T extends Store>(store: T, opts?: SaveOpts): Promise<void> {
  try {
    // ✅ normalise toujours au minimum (compat)
    const compat = normalizeStoreAvatarsCompatSync(store);

    // ✅ perf (optionnel)
    const final =
      opts?.skipAsyncNormalize === true
        ? { store: compat.store as T, changed: compat.changed }
        : await normalizeStoreAll(compat.store as T);

    const json = JSON.stringify(final.store);
    const payload = await compressGzip(json);

    // Garde-fou quota (warning seulement)
    const est = await storageEstimate();
    if (est.quota != null && est.usage != null && typeof payload !== "string") {
      const projected = est.usage + (payload as Uint8Array).byteLength;
      if (projected > est.quota * 0.98) {
        console.warn("[storage] quota presque plein, tentative d’écriture quand même.");
      }
    }

    await idbSet(STORE_KEY, payload);
  } catch (err) {
    console.error("[storage] saveStore error:", err);
    // Dernier recours : mini-backup localStorage (seulement pour petits stores)
    try {
      localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(store));
    } catch {}
  }
}

/** Vide la persistance (IDB + legacy localStorage). */
export async function clearStore(): Promise<void> {
  try {
    await idbDel(STORE_KEY);
  } catch {}
  try {
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch {}
}

/* ---------- KV générique (pour sous-ensembles : history, stats, etc.) ---------- */
/** Récupère une valeur JSON (avec décompression si binaire). */
export async function getKV<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = await idbGet<ArrayBuffer | Uint8Array | string>(key);
    if (raw == null) return null;
    const json = await decompressGzip(raw as any);
    return JSON.parse(json) as T;
  } catch (err) {
    console.warn("[storage] getKV error:", key, err);
    return null;
  }
}

/** Enregistre une valeur JSON (gzip si dispo). */
export async function setKV(key: string, value: any): Promise<void> {
  try {
    const json = JSON.stringify(value);
    const payload = await compressGzip(json);
    await idbSet(key, payload);
  } catch (err) {
    console.error("[storage] setKV error:", key, err);
  }
}

/** Supprime une clé. */
export async function delKV(key: string): Promise<void> {
  try {
    await idbDel(key);
  } catch (err) {
    console.warn("[storage] delKV error:", key, err);
  }
}

/* ---------- Export / Import utiles pour debug / sauvegardes ---------- */
/** Exporte tout le contenu de l’object store "kv" en objet { key: any }. */
export async function exportAll(): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const keys = await idbKeys();

  for (const k of keys) {
    const v = await idbGet<any>(k);
    if (v === undefined) continue;

    let data: any = v;
    try {
      if (typeof v !== "string") {
        const text = await decompressGzip(v as any);
        data = JSON.parse(text);
      } else {
        data = JSON.parse(v);
      }
    } catch {
      data = v;
    }

    out[String(k)] = data;
  }

  return out;
}

/** Importe un dump { key: any } (remplace les valeurs existantes). */
export async function importAll(dump: Record<string, any>): Promise<void> {
  for (const [k, v] of Object.entries(dump)) {
    await setKV(k, v);
  }
}

/* ============================================================
   ✅ CLOUD SNAPSHOT (Supabase user_store)
   Snapshot complet de l'IndexedDB "kv"
   - exportCloudSnapshot(): dump { key: any }
   - importCloudSnapshot(): replace/merge local kv par le dump cloud
============================================================ */

export type CloudSnapshot = Record<string, any>;

export async function exportCloudSnapshot(): Promise<CloudSnapshot> {
  return await exportAll();
}

export async function importCloudSnapshot(
  dump: CloudSnapshot,
  opts?: { mode?: "replace" | "merge" }
): Promise<void> {
  const mode = opts?.mode ?? "replace";
  if (mode === "replace") {
    await nukeAll(); // wipe kv
  }
  for (const [k, v] of Object.entries(dump || {})) {
    await setKV(k, v);
  }
}

/** Efface toutes les clés du store IndexedDB (attention : destructif). */
export async function nukeAll(): Promise<void> {
  try {
    await idbClear();
  } catch (err) {
    console.error("[storage] nukeAll error:", err);
  }
}

/* ---------- Migration utilitaire (si d’autres clés legacy existent) ---------- */
export async function migrateFromLocalStorage(keys: string[]) {
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;

    try {
      const parsed = JSON.parse(raw);
      await setKV(k, parsed);
    } catch {
      // si ce n’est pas du JSON, on tente de sauvegarder tel quel
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
   - Efface toutes les clés IndexedDB (store, stats, history...)
   - Efface legacy localStorage
   - Recharge un mini-store avec SEULEMENT le profil actif
============================================================ */
export async function nukeAllKeepActiveProfile(): Promise<void> {
  // 1) Charger l'ancien store AVANT suppression
  let activeProfile: Profile | null = null;

  try {
    const raw = await idbGet<ArrayBuffer | Uint8Array | string>(STORE_KEY);
    if (raw != null) {
      const txt = await decompressGzip(raw as any);
      const parsed = JSON.parse(txt) as Store;

      const activeId = (parsed as any).activeProfileId ?? null;
      if (activeId) {
        const prof = parsed.profiles?.find((p) => p.id === activeId) || null;
        activeProfile = prof ? { ...prof } : null;
      }
    }
  } catch (err) {
    console.warn("[storage] unable to load existing store before reset", err);
  }

  // 2) Supprimer TOUT le contenu d’IndexedDB
  try {
    await idbClear();
  } catch (err) {
    console.warn("[storage] idbClear error during reset", err);
  }

  // 3) Effacer les éventuelles anciennes données du localStorage legacy
  try {
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch {}

  // 4) Si on avait un profil actif → on recrée un store minimal
  if (activeProfile) {
    const cleanProfile: Profile = { ...activeProfile };

    const newStore: Store = {
      profiles: [cleanProfile],
      activeProfileId: cleanProfile.id,
      selfStatus: "online",
    } as Store;

    try {
      const payload = await compressGzip(JSON.stringify(newStore));
      await idbSet(STORE_KEY, payload);
    } catch (err) {
      console.warn("[storage] unable to write minimal store after reset", err);
    }
  }
}
