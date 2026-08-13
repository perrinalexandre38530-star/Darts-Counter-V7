import {
  downloadDirectR2MediaFallback,
  uploadDirectR2MediaFallback,
  isDirectR2MediaFresh,
  listDirectR2Backups,
  downloadDirectR2Backup,
  canAttemptDirectR2FromStoredSession,
} from "./directR2BackupApi";
import { resolveRuntimeMediaUrl } from "./serverConfig";
import { createCooperativeYielder } from "./mainThreadYield";

export type UserMediaKind =
  | "profile_avatar"
  | "local_profile_avatar"
  | "bot_avatar"
  | "dartset_main"
  | "dartset_thumb"
  | "team_logo"
  | "team_cover"
  | "group_avatar"
  | "group_cover"
  | "club_logo"
  | "club_cover"
  | "online_avatar"
  | "gallery_item"
  | "avatar_ai_gallery"
  | "user_image";

export type UserMediaFallbackEntry = {
  key: string;
  kind: UserMediaKind | string;
  dataUrl: string;
  updatedAt: number;
  sourceUrl?: string | null;
  // Signature légère de la source d'origine. Elle évite de reconvertir et
  // réécrire la même image à chaque saveStore.
  sourceSig?: string | null;
};

export type UserMediaFallbackSnapshot = {
  _v: 1;
  createdAt: string;
  media: Record<string, UserMediaFallbackEntry>;
};

const DB_NAME = "dc_user_media_fallback_v1";
const STORE_NAME = "media";
const MAX_LOCAL_ENTRIES = 1200;
const MAX_SNAPSHOT_ENTRIES = 500;
const MAX_SNAPSHOT_CHARS = 14_000_000;
const REMOTE_TIMEOUT_MS = 4_000;

// IMPORTANT MÉMOIRE : ce Map contenait historiquement jusqu'à 1200 data:image
// (certaines > 1 Mo) et ne libérait jamais les chaînes. Sur Chrome cela pouvait
// à lui seul retenir plusieurs Go de heap. Il devient un petit LRU borné.
const MEMORY_MAX_ENTRIES = 36;
const MEMORY_MAX_CHARS = 4_000_000;
const MEMORY_MAX_ENTRY_CHARS = 420_000;
const memory = new Map<string, UserMediaFallbackEntry>();
let memoryChars = 0;

function forgetRememberedEntry(key: string): void {
  const previous = memory.get(key);
  if (!previous) return;
  memory.delete(key);
  memoryChars = Math.max(0, memoryChars - String(previous.dataUrl || "").length);
}

function rememberEntry(entry: UserMediaFallbackEntry | null | undefined): void {
  if (!entry?.key || !isImageDataUrl(entry.dataUrl)) return;
  const chars = String(entry.dataUrl || "").length;
  forgetRememberedEntry(entry.key);

  // Les grands visuels restent dans IndexedDB mais ne sont jamais retenus en RAM.
  if (chars > MEMORY_MAX_ENTRY_CHARS) return;

  memory.set(entry.key, entry);
  memoryChars += chars;
  while (memory.size > MEMORY_MAX_ENTRIES || memoryChars > MEMORY_MAX_CHARS) {
    const oldestKey = memory.keys().next().value as string | undefined;
    if (!oldestKey) break;
    forgetRememberedEntry(oldestKey);
  }
}

function rememberedEntry(key: string): UserMediaFallbackEntry | null {
  const entry = memory.get(key) || null;
  if (!entry) return null;
  // touche LRU sans recopier la data URL
  memory.delete(key);
  memory.set(key, entry);
  return entry;
}

export function getUserMediaMemoryDiagnostics() {
  return {
    entries: memory.size,
    chars: memoryChars,
    pendingCaptures: pendingCapture.size,
    pendingResolves: pendingResolve.size,
  };
}

try {
  (globalThis as any).__dcUserMediaMemoryDiagnostics = getUserMediaMemoryDiagnostics;
} catch {}

const pendingResolve = new Map<string, Promise<string>>();
const pendingCapture = new Map<string, Promise<string>>();
let localVaultHydration: Promise<void> | null = null;
let externalHydration: Promise<void> | null = null;
let r2BackupHydration: Promise<void> | null = null;
let localVaultHydratedAt = 0;
let externalHydratedAt = 0;
let r2BackupHydratedAt = 0;
const SOURCE_SCAN_COOLDOWN_MS = 20_000;

function cleanKey(value: unknown): string {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 220);
}

export function profileAvatarMediaKey(profileId: unknown): string {
  return cleanKey(`profile_avatar:${String(profileId || "").trim()}`);
}

export function botAvatarMediaKey(botId: unknown): string {
  return cleanKey(`bot_avatar:${String(botId || "").trim()}`);
}

export function galleryItemMediaKey(itemId: unknown): string {
  return cleanKey(`gallery_item:${String(itemId || "").trim()}`);
}

export function avatarAiGalleryMediaKey(itemId: unknown): string {
  return cleanKey(`avatar_ai_gallery:${String(itemId || "").trim()}`);
}

export function onlineAvatarMediaKey(userId: unknown): string {
  return cleanKey(`online_avatar:${String(userId || "").trim()}`);
}

export function dartSetMainMediaKey(setId: unknown): string {
  return cleanKey(`dartset_main:${String(setId || "").trim()}`);
}

export function dartSetThumbMediaKey(setId: unknown): string {
  return cleanKey(`dartset_thumb:${String(setId || "").trim()}`);
}

function mediaAssetUrl(assetIdInput: unknown): string {
  const assetId = String(assetIdInput || "").trim();
  if (!assetId) return "";
  try { return resolveRuntimeMediaUrl(`/media/${encodeURIComponent(assetId)}`); } catch { return ""; }
}

export function teamLogoMediaKey(teamId: unknown): string {
  return cleanKey(`team_logo:${String(teamId || "").trim()}`);
}

export function teamCoverMediaKey(teamId: unknown): string {
  return cleanKey(`team_cover:${String(teamId || "").trim()}`);
}

export function groupAvatarMediaKey(groupId: unknown): string {
  return cleanKey(`group_avatar:${String(groupId || "").trim()}`);
}

export function groupCoverMediaKey(groupId: unknown): string {
  return cleanKey(`group_cover:${String(groupId || "").trim()}`);
}

function isImageDataUrl(value: unknown): boolean {
  return typeof value === "string" && /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(value.trim());
}

function sourceSignature(value: string): string {
  const s = String(value || "").trim();
  if (!s) return "";
  // Pas de hash complet : scanner plusieurs Mo à chaque save serait contre-productif.
  // Longueur + bords de la chaîne suffisent ici pour détecter les sauvegardes identiques.
  return `${s.length}:${s.slice(0, 48)}:${s.slice(-48)}`;
}

function imagePolicy(kind: string) {
  if (kind === "profile_avatar" || kind === "local_profile_avatar" || kind === "bot_avatar" || kind === "online_avatar" || kind === "group_avatar" || kind === "team_logo" || kind === "gallery_item" || kind === "avatar_ai_gallery") {
    return { maxEdge: 320, quality: 0.82, maxChars: 260_000 };
  }
  if (kind === "dartset_thumb") return { maxEdge: 420, quality: 0.82, maxChars: 420_000 };
  if (kind === "group_cover") return { maxEdge: 1280, quality: 0.80, maxChars: 1_350_000 };
  return { maxEdge: 900, quality: 0.82, maxChars: 1_100_000 };
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        try { db.close(); } catch {}
        dbPromise = null;
      };
      try {
        (db as any).onclose = () => { dbPromise = null; };
      } catch {}
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

async function idbGet(key: string): Promise<UserMediaFallbackEntry | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as UserMediaFallbackEntry) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbGetAll(): Promise<UserMediaFallbackEntry[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result || []) as UserMediaFallbackEntry[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function idbCount(): Promise<number> {
  try {
    const db = await openDb();
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(Number(req.result || 0));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Lit plusieurs clés dans une seule transaction IndexedDB et renvoie la première
 * image disponible dans l'ordre demandé. Utilisé notamment pour les alias de
 * dartsets restaurés depuis d'anciens backups.
 */
export async function readFirstLocalUserMediaFallback(keysInput: string[]): Promise<string> {
  const keys = Array.from(new Set((keysInput || []).map(cleanKey).filter(Boolean)));
  if (!keys.length) return "";

  for (const key of keys) {
    const cached = rememberedEntry(key);
    if (cached?.dataUrl && isImageDataUrl(cached.dataUrl)) return cached.dataUrl;
  }

  try {
    const db = await openDb();
    const rows = await new Promise<Array<UserMediaFallbackEntry | null>>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const values: Array<UserMediaFallbackEntry | null> = new Array(keys.length).fill(null);
      let completed = 0;
      let settled = false;

      const finishOne = () => {
        completed += 1;
        if (!settled && completed >= keys.length) {
          settled = true;
          resolve(values);
        }
      };

      keys.forEach((key, index) => {
        const req = store.get(key);
        req.onsuccess = () => {
          values[index] = (req.result as UserMediaFallbackEntry) || null;
          finishOne();
        };
        req.onerror = () => finishOne();
      });
      tx.onabort = () => {
        if (!settled) {
          settled = true;
          reject(tx.error);
        }
      };
    });

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row?.dataUrl || !isImageDataUrl(row.dataUrl)) continue;
      rememberEntry(row);
      return row.dataUrl;
    }
  } catch {}

  return "";
}

let trimScheduled = false;

function scheduleTrimLocalDb(): void {
  if (trimScheduled) return;
  trimScheduled = true;
  const run = () => {
    trimScheduled = false;
    void trimLocalDb();
  };

  try {
    const requestIdle = (globalThis as any)?.requestIdleCallback;
    if (typeof requestIdle === "function") {
      // Aucun timeout volontaire : le nettoyage n'a jamais la priorité sur la
      // navigation ou l'affichage Android.
      requestIdle(run);
      return;
    }
  } catch {}

  setTimeout(run, 5000);
}

async function idbPut(entry: UserMediaFallbackEntry): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    scheduleTrimLocalDb();
  } catch {}
}

async function idbPutMany(entries: UserMediaFallbackEntry[]): Promise<void> {
  if (!entries.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const entry of entries) store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  for (const entry of entries) rememberEntry(entry);
  scheduleTrimLocalDb();
}

async function trimLocalDb(): Promise<void> {
  try {
    // `getAll()` recopie toutes les grosses data:image en mémoire et provoquait
    // un freeze juste après restauration. Le count() léger évite totalement ce
    // travail dans le cas normal (144 médias pour une limite de 1200).
    const count = await idbCount();
    if (count <= MAX_LOCAL_ENTRIES) return;
    const rows = await idbGetAll();
    const keep = rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, MAX_LOCAL_ENTRIES);
    const keepKeys = new Set(keep.map((row) => row.key));
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const row of rows) if (!keepKeys.has(row.key)) store.delete(row.key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

function blobFromDataUrl(dataUrl: string): Blob | null {
  try {
    const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    const mime = match[1] || "image/jpeg";
    const binary = match[2] ? atob(match[3] || "") : decodeURIComponent(match[3] || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

async function responseToImageBlob(response: Response | undefined | null): Promise<Blob | null> {
  try {
    if (!response?.ok) return null;
    const blob = await response.blob();
    if (!String(blob.type || "").startsWith("image/")) return null;
    return blob;
  } catch {
    return null;
  }
}

async function browserCachedBlob(src: string): Promise<Blob | null> {
  const value = String(src || "").trim();
  if (!value) return null;
  if (isImageDataUrl(value)) return blobFromDataUrl(value);
  if (value.startsWith("blob:")) {
    try { return await responseToImageBlob(await fetch(value)); } catch { return null; }
  }

  // Les URLs historiques https://api.multisports-api.fr/media/* sont réécrites
  // vers /api/backend/media/* : même origine côté navigateur, donc aucun CORS.
  const runtimeValue = resolveRuntimeMediaUrl(value) || value;
  const cacheCandidates = Array.from(new Set([value, runtimeValue].filter(Boolean)));

  // 1) Cache Storage/PWA : aucune requête NAS nécessaire.
  try {
    if (typeof caches !== "undefined") {
      for (const candidate of cacheCandidates) {
        const direct = await caches.match(candidate, { ignoreSearch: false });
        const directBlob = await responseToImageBlob(direct);
        if (directBlob) return directBlob;
        const loose = await caches.match(candidate, { ignoreSearch: true });
        const looseBlob = await responseToImageBlob(loose);
        if (looseBlob) return looseBlob;
      }
    }
  } catch {}

  // 2) Cache HTTP / proxy same-origin. Si l'image n'existe pas en R2/local, ce
  // dernier filet peut encore récupérer l'ancien média sans exposer le browser
  // au CORS du backend historique.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(runtimeValue, {
      method: "GET",
      cache: "force-cache",
      signal: controller.signal,
    });
    return await responseToImageBlob(response);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function blobToExactDataUrl(blob: Blob): Promise<string> {
  if (!blob || !blob.size) return "";
  return await new Promise<string>((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    } catch {
      resolve("");
    }
  });
}

async function exactSourceDataUrl(source: string): Promise<string> {
  const value = String(source || "").trim();
  if (!value) return "";
  if (isImageDataUrl(value)) return value;
  const blob = await browserCachedBlob(value);
  if (!blob) return "";
  return blobToExactDataUrl(blob);
}

async function compactBlob(blob: Blob, kind: string): Promise<string> {
  if (typeof document === "undefined") return "";
  const policy = imagePolicy(kind);
  let bitmap: ImageBitmap | null = null;
  let objectUrl = "";
  try {
    let width = 0;
    let height = 0;
    let source: CanvasImageSource | null = null;
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(blob);
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } else {
      objectUrl = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const node = new Image();
        node.onload = () => resolve(node);
        node.onerror = reject;
        node.src = objectUrl;
      });
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      source = img;
    }
    if (!source || !width || !height) return "";
    const scale = Math.min(1, policy.maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return "";
    ctx.drawImage(source, 0, 0, w, h);

    const candidates = [
      canvas.toDataURL("image/webp", policy.quality),
      canvas.toDataURL("image/jpeg", policy.quality),
      canvas.toDataURL("image/jpeg", Math.max(0.58, policy.quality - 0.18)),
    ];
    for (const candidate of candidates) {
      if (isImageDataUrl(candidate) && candidate.length <= policy.maxChars) return candidate;
    }
    return "";
  } catch {
    return "";
  } finally {
    try { bitmap?.close?.(); } catch {}
    if (objectUrl) try { URL.revokeObjectURL(objectUrl); } catch {}
  }
}

async function compactSource(source: string, kind: string): Promise<string> {
  const value = String(source || "").trim();
  const policy = imagePolicy(kind);
  if (isImageDataUrl(value) && value.length <= policy.maxChars) return value;
  const blob = await browserCachedBlob(value);
  if (!blob) return "";
  return compactBlob(blob, kind);
}

async function storeEntry(entry: UserMediaFallbackEntry): Promise<void> {
  rememberEntry(entry);
  await idbPut(entry);
}

export async function readLocalUserMediaFallback(keyInput: string): Promise<string> {
  const key = cleanKey(keyInput);
  if (!key) return "";
  const mem = rememberedEntry(key);
  if (mem?.dataUrl) return mem.dataUrl;
  const row = await idbGet(key);
  if (row?.dataUrl && isImageDataUrl(row.dataUrl)) {
    rememberEntry(row);
    return row.dataUrl;
  }
  return "";
}

export async function captureUserMediaFallback(
  keyInput: string,
  sourceInput: string,
  opts: { kind?: UserMediaKind | string; updatedAt?: number; mirrorR2?: boolean; sourceUrl?: string | null } = {},
): Promise<string> {
  const key = cleanKey(keyInput);
  const source = String(sourceInput || "").trim();
  if (!key || !source) return "";
  const existing = pendingCapture.get(key);
  if (existing) return existing;

  const task = (async () => {
    const kind = String(opts.kind || key.split(":")[0] || "user_image");
    const explicitUpdatedAt = Number(opts.updatedAt || 0);
    const updatedAt = explicitUpdatedAt > 0 ? explicitUpdatedAt : Date.now();
    const mirrorR2 = opts.mirrorR2 !== false && canAttemptDirectR2FromStoredSession();
    const sourceSig = sourceSignature(source);

    // Dédup locale AVANT FileReader/canvas/IDB. C'était le point chaud principal :
    // saveStore recapturait la même image des dizaines de fois.
    let localEntry = rememberedEntry(key);
    if (!localEntry) localEntry = await idbGet(key);
    const sourceIsInline = isImageDataUrl(source);
    const sourceVersionCompatible = sourceIsInline || explicitUpdatedAt <= 0 || Number(localEntry?.updatedAt || 0) >= explicitUpdatedAt;
    const sameSource = !!localEntry?.dataUrl && sourceVersionCompatible && (
      (!!sourceSig && localEntry.sourceSig === sourceSig) ||
      (sourceIsInline && localEntry.dataUrl === source) ||
      (!sourceIsInline && String(localEntry.sourceUrl || "") === source)
    );

    if (sameSource && localEntry) {
      rememberEntry(localEntry);
      if (mirrorR2) {
        try {
          if (!(await isDirectR2MediaFresh({ key, updatedAt: Number(localEntry.updatedAt || updatedAt) }))) {
            await uploadDirectR2MediaFallback(localEntry);
          }
        } catch {}
      }
      return localEntry.dataUrl;
    }

    // Chemin ultra-rapide des sauvegardes suivantes : si R2 possède déjà cette
    // version, on ne relit PAS l'image, on ne crée PAS de canvas et on ne refait
    // aucun POST.
    if (mirrorR2) {
      try {
        if (await isDirectR2MediaFresh({ key, updatedAt })) {
          const local = await readLocalUserMediaFallback(key);
          return local || (isImageDataUrl(source) ? source : "");
        }
      } catch {}
    }

    // Respecte enfin imagePolicy : l'ancien chemin exactSourceDataUrl conservait
    // les originaux multi-Mo avant même d'essayer la compression.
    const policy = imagePolicy(kind);
    let mirrored = isImageDataUrl(source) && source.length <= policy.maxChars ? source : "";
    if (!mirrored) mirrored = await compactSource(source, kind);
    if (!mirrored) return "";
    const entry: UserMediaFallbackEntry = {
      key,
      kind,
      dataUrl: mirrored,
      updatedAt,
      sourceUrl: opts.sourceUrl || (!isImageDataUrl(source) ? source : null),
      sourceSig: sourceSig || null,
    };
    await storeEntry(entry);
    if (mirrorR2) {
      await uploadDirectR2MediaFallback(entry);
    }
    return mirrored;
  })().finally(() => pendingCapture.delete(key));

  pendingCapture.set(key, task);
  return task;
}


function unwrapPortableSnapshot(input: any): any {
  if (!input || typeof input !== "object") return input;
  if (input.snapshot && typeof input.snapshot === "object") return input.snapshot;
  if (input.payload?.snapshot && typeof input.payload.snapshot === "object") return input.payload.snapshot;
  if (input.content?.snapshot && typeof input.content.snapshot === "object") return input.content.snapshot;
  return input;
}

function collectSnapshotStores(snapshotInput: any): any[] {
  const snapshot = unwrapPortableSnapshot(snapshotInput);
  const out: any[] = [];
  const push = (value: any) => { if (value && typeof value === "object" && !out.includes(value)) out.push(value); };
  push(snapshot);
  push(snapshot?.store);
  push(snapshot?.data);
  push(snapshot?.portableAccountData);
  push(snapshot?.portable_account_data);
  if (snapshot?.idb && typeof snapshot.idb === "object") {
    for (const value of Object.values(snapshot.idb)) push(value);
  }
  return out;
}

async function importLegacyMediaFromSnapshot(
  snapshotInput: any,
  opts: { onProgress?: (completed: number, total: number, message: string) => void } = {},
): Promise<number> {
  const snapshot = unwrapPortableSnapshot(snapshotInput);
  if (!snapshot || typeof snapshot !== "object") return 0;

  const explicitBlock = snapshot?.userMediaFallbacks || snapshot?.user_media_fallbacks || null;
  const explicitMedia = explicitBlock?.media && typeof explicitBlock.media === "object"
    ? Object.keys(explicitBlock.media)
    : [];
  if (explicitMedia.length > 0) {
    // Snapshot moderne : le coffre média est la source canonique. Le rescanner
    // ensuite dans chaque copie de store du snapshot multipliait les mêmes
    // écritures des centaines de fois sur Android et bloquait la restauration.
    return await importUserMediaFallbackSnapshot(explicitBlock, opts).catch(() => 0);
  }

  let count = 0;
  const stores = collectSnapshotStores(snapshot);

  for (const root of stores) {
    for (const list of [root?.profiles, root?.localProfiles, root?.players]) {
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        const id = String(p?.id || p?.profileId || p?.playerId || "").trim();
        if (!id) continue;
        const src = firstImage(
          p?.avatarThumbDataUrl, p?.avatarDataUrl, p?.avatarFullDataUrl, p?.avatarCastDataUrl,
          p?.photoDataUrl, p?.avatar, p?.avatarUrl,
          mediaAssetUrl(p?.avatarAssetId || p?.avatarFullAssetId || p?.avatarThumbAssetId)
        );
        if (!src) continue;
        const saved = await captureUserMediaFallback(profileAvatarMediaKey(id), src, { kind: "profile_avatar" }).catch(() => "");
        if (saved) count += 1;
      }
    }

    const botLists = [root?.bots, root?.cpuBots, root?.botPlayers].filter(Array.isArray) as any[][];
    for (const list of botLists) {
      for (const bot of list) {
        const id = String(bot?.id || bot?.botId || "").trim();
        if (!id) continue;
        const src = firstImage(bot?.avatarDataUrl, bot?.avatarFullDataUrl, bot?.avatarThumbDataUrl, bot?.photoDataUrl, bot?.imageDataUrl, bot?.avatar, bot?.avatarUrl);
        if (!src) continue;
        const saved = await captureUserMediaFallback(botAvatarMediaKey(id), src, { kind: "bot_avatar" }).catch(() => "");
        if (saved) count += 1;
      }
    }

    const dartLists = [root?.dartSets, root?.dartsets].filter(Array.isArray) as any[][];
    for (const list of dartLists) {
      for (const set of list) {
        const id = String(set?.id || "").trim();
        if (!id) continue;
        const main = firstImage(
          set?.photoDataUrl, set?.imageDataUrl, set?.mainImageDataUrl, set?.dartSetImageDataUrl,
          set?.mainImageUrl, set?.photoUrl, set?.imageUrl,
          mediaAssetUrl(set?.mainImageAssetId || set?.photoAssetId || set?.imageAssetId || set?.dartSetImageAssetId)
        );
        const thumb = firstImage(
          set?.photoThumbDataUrl, set?.thumbDataUrl, set?.thumbImageDataUrl, set?.thumbImageUrl,
          set?.photoThumbUrl,
          mediaAssetUrl(set?.thumbImageAssetId || set?.photoThumbAssetId),
          main
        );
        if (main) {
          const saved = await captureUserMediaFallback(dartSetMainMediaKey(id), main, { kind: "dartset_main" }).catch(() => "");
          if (saved) count += 1;
        }
        if (thumb) {
          const saved = await captureUserMediaFallback(dartSetThumbMediaKey(id), thumb, { kind: "dartset_thumb" }).catch(() => "");
          if (saved) count += 1;
        }
      }
    }

    const teams = Array.isArray(root?.teams) ? root.teams : [];
    for (const team of teams) {
      const id = String(team?.id || team?.teamId || "").trim();
      if (!id) continue;
      const logo = firstImage(team?.logoDataUrl, team?.avatarDataUrl, team?.imageDataUrl, team?.regionLogoDataUrl, team?.logoUrl);
      const cover = firstImage(team?.coverDataUrl, team?.coverUrl, team?.bannerDataUrl, team?.bannerUrl);
      if (logo) {
        const saved = await captureUserMediaFallback(teamLogoMediaKey(id), logo, { kind: "team_logo" }).catch(() => "");
        if (saved) count += 1;
      }
      if (cover) {
        const saved = await captureUserMediaFallback(teamCoverMediaKey(id), cover, { kind: "team_cover" }).catch(() => "");
        if (saved) count += 1;
      }
    }
  }
  return count;
}

export async function importUserMediaFromSnapshot(
  snapshotInput: any,
  opts: { onProgress?: (completed: number, total: number, message: string) => void } = {},
): Promise<number> {
  return await importLegacyMediaFromSnapshot(snapshotInput, opts);
}

async function hydrateFromLocalVaultOnce(): Promise<void> {
  const now = Date.now();
  if (localVaultHydration) return localVaultHydration;
  if (now - localVaultHydratedAt < SOURCE_SCAN_COOLDOWN_MS) return;
  localVaultHydratedAt = now;
  localVaultHydration = (async () => {
    try {
      const mod = await import("./storageVault");
      const slots = await mod.listLocalMemorySlots().catch(() => []);
      for (const slot of slots || []) await importLegacyMediaFromSnapshot(slot?.payload);
    } catch {}
    finally { localVaultHydration = null; localVaultHydratedAt = Date.now(); }
  })();
  return localVaultHydration;
}

async function hydrateFromExternalFileOnce(): Promise<void> {
  const now = Date.now();
  if (externalHydration) return externalHydration;
  if (now - externalHydratedAt < SOURCE_SCAN_COOLDOWN_MS) return;
  externalHydratedAt = now;
  externalHydration = (async () => {
    try {
      const mod = await import("./externalBackupTarget");
      const snapshot = await mod.readExternalBackupSnapshotIfPermitted();
      if (snapshot) await importLegacyMediaFromSnapshot(snapshot);
    } catch {}
    finally { externalHydration = null; externalHydratedAt = Date.now(); }
  })();
  return externalHydration;
}

async function hydrateFromR2BackupsOnce(): Promise<void> {
  if (!canAttemptDirectR2FromStoredSession()) return;
  const now = Date.now();
  if (r2BackupHydration) return r2BackupHydration;
  if (now - r2BackupHydratedAt < SOURCE_SCAN_COOLDOWN_MS) return;
  r2BackupHydratedAt = now;
  r2BackupHydration = (async () => {
    try {
      const backups = await listDirectR2Backups(2, false);
      for (const backup of backups || []) {
        if (!backup?.id) continue;
        try {
          const downloaded: any = await downloadDirectR2Backup(String(backup.id));
          const raw = downloaded?.content ?? downloaded?.text ?? downloaded;
          const snapshot = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
          if (snapshot) await importLegacyMediaFromSnapshot(snapshot);
        } catch {}
      }
    } catch {}
    finally { r2BackupHydration = null; r2BackupHydratedAt = Date.now(); }
  })();
  return r2BackupHydration;
}

export async function resolveUserMediaFallback(
  keyInput: string,
  primarySourceInput = "",
  opts: { kind?: UserMediaKind | string; allowR2?: boolean; mirrorRecoveredToR2?: boolean } = {},
): Promise<string> {
  const key = cleanKey(keyInput);
  if (!key) return "";
  const existing = pendingResolve.get(key);
  if (existing) return existing;

  const task = (async () => {
    let found = await readLocalUserMediaFallback(key);
    if (found) return found;

    const kind = String(opts.kind || key.split(":")[0] || "user_image");

    // 1) Coffre Local IndexedDB / sauvegardes locales manuelles.
    await hydrateFromLocalVaultOnce();
    found = await readLocalUserMediaFallback(key);
    if (found) return found;

    // 2) Fichier mémorisé sur PC / SD / USB. Aucune fenêtre n'est ouverte :
    // on lit uniquement un handle déjà autorisé par l'utilisateur.
    await hydrateFromExternalFileOnce();
    found = await readLocalUserMediaFallback(key);
    if (found) return found;

    if (opts.allowR2 !== false && canAttemptDirectR2FromStoredSession()) {
      // 3) Objet média R2 dédié : chemin normal à partir de ce patch.
      try {
        const remote = await downloadDirectR2MediaFallback(key);
        const dataUrl = String(remote?.dataUrl || "").trim();
        if (isImageDataUrl(dataUrl)) {
          await storeEntry({
            key,
            kind: String(remote?.kind || kind),
            dataUrl,
            updatedAt: Number(remote?.updatedAtMs || Date.now()) || Date.now(),
            sourceUrl: remote?.sourceUrl || null,
          });
          return dataUrl;
        }
      } catch {}

      // 4) Sauvegardes R2 courante + précédente, lues directement par Pages.
      await hydrateFromR2BackupsOnce();
      found = await readLocalUserMediaFallback(key);
      if (found) return found;
    }

    // 5) Dernier filet : cache HTTP/PWA de l'ancienne URL puis NAS si celui-ci
    // vient de revenir. Une image retrouvée ici est immédiatement scellée dans
    // IndexedDB + R2 pour que la panne suivante soit transparente.
    const primary = String(primarySourceInput || "").trim();
    if (primary) {
      found = await compactSource(primary, kind);
      if (found) {
        await storeEntry({ key, kind, dataUrl: found, updatedAt: Date.now(), sourceUrl: primary });
        if (opts.mirrorRecoveredToR2 !== false && canAttemptDirectR2FromStoredSession()) {
          void uploadDirectR2MediaFallback({ key, kind, dataUrl: found, updatedAt: Date.now(), sourceUrl: primary }).catch(() => undefined);
        }
        return found;
      }
    }

    return "";
  })().finally(() => pendingResolve.delete(key));

  pendingResolve.set(key, task);
  return task;
}

function firstImage(...values: any[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function mediaTimestamp(value: any, fallback = Date.now()): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function fastImageHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

export async function captureStoreUserMedia(
  store: any,
  opts: { mirrorR2?: boolean } = {},
): Promise<void> {
  type MediaJob = { key: string; source: string; kind: UserMediaKind | string; updatedAt?: number };
  const jobsByKey = new Map<string, MediaJob>();
  const knownInlineHashes = new Set<string>();
  const enqueue = (key: string, source: string, kind: UserMediaKind | string, updatedAt?: number) => {
    if (!key || !source) return;
    if (isImageDataUrl(source)) knownInlineHashes.add(fastImageHash(source));
    jobsByKey.set(key, { key, source, kind, updatedAt });
  };

  try {
    const profileLists = [store?.profiles, store?.localProfiles, store?.players].filter(Array.isArray) as any[][];
    for (const list of profileLists) {
      for (const p of list) {
        const id = String(p?.id || p?.profileId || p?.playerId || "").trim();
        if (!id) continue;
        const src = firstImage(p?.avatarFullDataUrl, p?.avatarDataUrl, p?.avatarThumbDataUrl, p?.avatarCastDataUrl, p?.photoDataUrl, p?.avatarUrl, p?.avatar);
        if (src) enqueue(profileAvatarMediaKey(id), src, "profile_avatar", mediaTimestamp(p?.avatarUpdatedAt || p?.updatedAt));
      }
    }

    const bots = [store?.bots, store?.cpuBots, store?.botPlayers].find(Array.isArray) || [];
    for (const bot of bots) {
      const id = String(bot?.id || bot?.botId || "").trim();
      if (!id) continue;
      const src = firstImage(bot?.avatarFullDataUrl, bot?.avatarDataUrl, bot?.avatarThumbDataUrl, bot?.photoDataUrl, bot?.imageDataUrl, bot?.avatarUrl, bot?.avatar);
      if (src) enqueue(botAvatarMediaKey(id), src, "bot_avatar", mediaTimestamp(bot?.avatarUpdatedAt || bot?.updatedAt));
    }

    const dartSets = Array.isArray(store?.dartSets) ? store.dartSets : [];
    for (const set of dartSets) {
      const id = String(set?.id || "").trim();
      if (!id) continue;
      const main = firstImage(
        set?.photoDataUrl, set?.imageDataUrl, set?.mainImageDataUrl, set?.dartSetImageDataUrl,
        set?.mainImageUrl, set?.photoUrl, set?.imageUrl,
        mediaAssetUrl(set?.mainImageAssetId || set?.photoAssetId || set?.imageAssetId || set?.dartSetImageAssetId)
      );
      const thumb = firstImage(
        set?.photoThumbDataUrl, set?.thumbDataUrl, set?.thumbImageDataUrl, set?.thumbImageUrl,
        set?.photoThumbUrl, mediaAssetUrl(set?.thumbImageAssetId || set?.photoThumbAssetId), main
      );
      // Les visuels du catalogue (/assets/...) sont déjà dans l'application. R2
      // doit sauvegarder les photos PERSONNELLES choisies depuis la galerie/fichier.
      const customPhoto = set?.kind === "photo" || Boolean(set?.mainImageAssetId || set?.photoAssetId || set?.thumbImageAssetId) || [main, thumb, set?.photoDataUrl, set?.mainImageDataUrl]
        .some((value) => {
          const raw = String(value || "").trim();
          return raw.startsWith("data:image/") || raw.startsWith("blob:");
        });
      if (!customPhoto) continue;
      const mediaAt = mediaTimestamp(set?.mediaUpdatedAt || set?.createdAt || set?.updatedAt);
      if (main) enqueue(dartSetMainMediaKey(id), main, "dartset_main", mediaAt);
      if (thumb) enqueue(dartSetThumbMediaKey(id), thumb, "dartset_thumb", mediaAt);
    }

    const teams = Array.isArray(store?.teams) ? store.teams : [];
    for (const team of teams) {
      const id = String(team?.id || team?.teamId || "").trim();
      if (!id) continue;
      const logo = firstImage(team?.logoDataUrl, team?.avatarDataUrl, team?.imageDataUrl, team?.regionLogoDataUrl, team?.logoUrl, team?.avatarUrl, team?.imageUrl);
      const cover = firstImage(team?.coverDataUrl, team?.coverUrl, team?.bannerDataUrl, team?.bannerUrl);
      if (logo) enqueue(teamLogoMediaKey(id), logo, "team_logo", mediaTimestamp(team?.updatedAt));
      if (cover) enqueue(teamCoverMediaKey(id), cover, "team_cover", mediaTimestamp(team?.updatedAt));
    }

    // Galerie centrale + ancienne galerie Avatar IA : elles vivent en localStorage
    // et n'étaient pas toutes présentes dans le store React.
    if (typeof window !== "undefined") {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const lsKey = window.localStorage.key(i) || "";
        if (!lsKey.startsWith("dc_avatar_gallery_v1:")) continue;
        try {
          const rows = JSON.parse(window.localStorage.getItem(lsKey) || "[]");
          if (!Array.isArray(rows)) continue;
          for (const item of rows) {
            const id = String(item?.id || item?.hash || "").trim();
            const src = firstImage(item?.src, item?.dataUrl, item?.imageDataUrl);
            if (id && src) enqueue(galleryItemMediaKey(id), src, "gallery_item", mediaTimestamp(item?.updatedAt || item?.createdAt));
          }
        } catch {}
      }
      try {
        const rows = JSON.parse(window.localStorage.getItem("msc_avatar_ia_gallery_v1") || "[]");
        if (Array.isArray(rows)) {
          for (const item of rows) {
            const id = String(item?.id || item?.galleryId || "").trim();
            const src = firstImage(item?.dataUrl, item?.src, item?.imageDataUrl);
            if (id && src) enqueue(avatarAiGalleryMediaKey(id), src, "avatar_ai_gallery", mediaTimestamp(item?.updatedAt || item?.createdAt));
          }
        }
      } catch {}
    }

    // Dernier filet : toute image inline encore présente dans le store est
    // dédupliquée par son contenu et envoyée à R2. Cela couvre les futurs types
    // de données sans devoir attendre une nouvelle liste de catégories.
    const seen = new WeakSet<object>();
    const seenHashes = new Set<string>(knownInlineHashes);
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) { for (const item of node) walk(item); return; }
      for (const value of Object.values(node)) {
        if (isImageDataUrl(value)) {
          const imageValue = String(value);
          const hash = fastImageHash(imageValue);
          if (!seenHashes.has(hash)) {
            seenHashes.add(hash);
            enqueue(cleanKey(`user_image:${hash}`), imageValue, "user_image");
          }
        } else if (value && typeof value === "object") walk(value);
      }
    };
    walk(store);
  } catch {}

  const jobs = Array.from(jobsByKey.values());
  if (jobs.length) {
    // Deux captures maximum en parallèle : les data URLs/canvas sont lourds et
    // doivent rester sous contrôle sur Chrome/Android.
    await mapWithConcurrency(jobs, 2, async (job) => {
      await captureUserMediaFallback(job.key, job.source, {
        kind: job.kind,
        updatedAt: job.updatedAt,
        mirrorR2: opts.mirrorR2 !== false,
      }).catch(() => "");
    });
  }
}

async function mapWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const run = async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}

function dartSetMediaIds(raw: any): string[] {
  return Array.from(new Set([
    raw?.id,
    raw?.dartSetId,
    raw?.setId,
    raw?.linkedSourceDartSetId,
    raw?.sourceDartSetId,
    raw?.remoteDartSetId,
    raw?.originalId,
    ...(Array.isArray(raw?.duplicateIds) ? raw.duplicateIds : []),
    ...(Array.isArray(raw?.aliasIds) ? raw.aliasIds : []),
  ].map((value) => String(value || "").trim()).filter(Boolean)));
}

export async function hydrateStoreUserMedia(
  storeInput: any,
  opts: { allowRemote?: boolean } = {},
): Promise<{ store: any; changed: boolean }> {
  if (!storeInput || typeof storeInput !== "object") return { store: storeInput, changed: false };
  const store = { ...storeInput };
  let changed = false;

  const profiles: any[] = Array.isArray(store.profiles) ? store.profiles.map((p: any) => ({ ...p })) : [];
  await mapWithConcurrency(profiles, 4, async (p) => {
    const id = String(p?.id || "").trim();
    if (!id) return;
    const primary = firstImage(p?.avatarDataUrl, p?.avatarUrl, p?.avatar, p?.photoUrl, p?.avatarPath);
    const fallback = await resolveUserMediaFallback(profileAvatarMediaKey(id), primary, { kind: "profile_avatar", allowR2: opts.allowRemote !== false });
    if (fallback && p.avatarDataUrl !== fallback) {
      p.avatarDataUrl = fallback;
      changed = true;
    }
  });
  if (profiles.length) store.profiles = profiles;

  const bots: any[] = Array.isArray(store.bots) ? store.bots.map((b: any) => ({ ...b })) : [];
  await mapWithConcurrency(bots, 4, async (b) => {
    const id = String(b?.id || b?.botId || "").trim();
    if (!id) return;
    const primary = firstImage(b?.avatarDataUrl, b?.avatarFullDataUrl, b?.avatarThumbDataUrl, b?.avatarUrl, b?.avatar, b?.photoDataUrl);
    const fallback = await resolveUserMediaFallback(botAvatarMediaKey(id), primary, { kind: "bot_avatar", allowR2: opts.allowRemote !== false });
    if (fallback && b.avatarDataUrl !== fallback) {
      b.avatarDataUrl = fallback;
      changed = true;
    }
  });
  if (bots.length) store.bots = bots;

  const dartSets: any[] = Array.isArray(store.dartSets) ? store.dartSets.map((d: any) => ({ ...d })) : [];
  await mapWithConcurrency(dartSets, 3, async (d) => {
    const ids = dartSetMediaIds(d);
    const id = ids[0] || "";
    if (!id) return;
    const mainPrimary = firstImage(
      d?.photoDataUrl, d?.imageDataUrl, d?.mainImageDataUrl, d?.mainImageUrl, d?.photoUrl, d?.imageUrl,
      mediaAssetUrl(d?.mainImageAssetId || d?.photoAssetId || d?.imageAssetId || d?.dartSetImageAssetId)
    );
    const thumbPrimary = firstImage(
      d?.photoThumbDataUrl, d?.thumbDataUrl, d?.thumbImageDataUrl, d?.thumbImageUrl,
      mediaAssetUrl(d?.thumbImageAssetId || d?.photoThumbAssetId), mainPrimary
    );

    // Les anciens backups peuvent avoir enregistré le média sous l'identifiant
    // source/alias tandis que le dartset restauré porte un nouvel id canonique.
    // On cherche donc toutes les clés locales avant toute tentative réseau.
    const localMain = await readFirstLocalUserMediaFallback([
      ...ids.map(dartSetMainMediaKey),
      ...ids.map(dartSetThumbMediaKey),
    ]);
    const localThumb = await readFirstLocalUserMediaFallback([
      ...ids.map(dartSetThumbMediaKey),
      ...ids.map(dartSetMainMediaKey),
    ]);

    const [main, thumb] = await Promise.all([
      localMain || resolveUserMediaFallback(String(d?.r2MainMediaKey || dartSetMainMediaKey(id)), mainPrimary, { kind: "dartset_main", allowR2: opts.allowRemote !== false }),
      localThumb || resolveUserMediaFallback(String(d?.r2ThumbMediaKey || dartSetThumbMediaKey(id)), thumbPrimary, { kind: "dartset_thumb", allowR2: opts.allowRemote !== false }),
    ]);
    if (main && d.mainImageUrl !== main) { d.mainImageUrl = main; changed = true; }
    if (thumb && d.thumbImageUrl !== thumb) { d.thumbImageUrl = thumb; changed = true; }
  });
  if (dartSets.length) store.dartSets = dartSets;

  const teams: any[] = Array.isArray(store.teams) ? store.teams.map((t: any) => ({ ...t })) : [];
  await mapWithConcurrency(teams, 3, async (t) => {
    const id = String(t?.id || t?.teamId || "").trim();
    if (!id) return;
    const primary = firstImage(t?.logoDataUrl, t?.logoUrl, t?.avatarUrl, t?.imageUrl, t?.logo);
    const coverPrimary = firstImage(t?.coverDataUrl, t?.coverUrl, t?.bannerDataUrl, t?.bannerUrl);
    const [logo, cover] = await Promise.all([
      resolveUserMediaFallback(teamLogoMediaKey(id), primary, { kind: "team_logo", allowR2: opts.allowRemote !== false }),
      resolveUserMediaFallback(teamCoverMediaKey(id), coverPrimary, { kind: "team_cover", allowR2: opts.allowRemote !== false }),
    ]);
    if (logo && t.logoDataUrl !== logo) { t.logoDataUrl = logo; changed = true; }
    if (cover && t.coverDataUrl !== cover) { t.coverDataUrl = cover; changed = true; }
  });
  if (teams.length) store.teams = teams;

  return { store, changed };
}

export async function exportUserMediaFallbackSnapshot(): Promise<UserMediaFallbackSnapshot> {
  const rows = (await idbGetAll())
    .filter((row) => row?.key && isImageDataUrl(row?.dataUrl))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

  const media: Record<string, UserMediaFallbackEntry> = {};
  let chars = 0;
  for (const row of rows.slice(0, MAX_SNAPSHOT_ENTRIES)) {
    const size = String(row.dataUrl || "").length;
    if (chars + size > MAX_SNAPSHOT_CHARS) break;
    media[row.key] = row;
    chars += size;
  }
  return { _v: 1, createdAt: new Date().toISOString(), media };
}

export async function importUserMediaFallbackSnapshot(
  snapshot: any,
  opts: { onProgress?: (completed: number, total: number, message: string) => void } = {},
): Promise<number> {
  const block = snapshot?.userMediaFallbacks || snapshot?.user_media_fallbacks || snapshot;
  const media = block?.media && typeof block.media === "object" ? block.media : {};
  const rows = Object.entries(media);
  const entries: UserMediaFallbackEntry[] = [];
  const total = rows.length;
  const yieldIfNeeded = createCooperativeYielder(9);

  opts.onProgress?.(0, total, total > 0 ? `Préparation de ${total} média(s)…` : "Aucun média à restaurer.");
  for (let index = 0; index < rows.length; index += 1) {
    const [rawKey, raw] = rows[index];
    const row: any = raw;
    const key = cleanKey(row?.key || rawKey);
    const dataUrl = String(row?.dataUrl || "").trim();
    if (key && isImageDataUrl(dataUrl)) {
      entries.push({
        key,
        kind: String(row?.kind || key.split(":")[0] || "user_image"),
        dataUrl,
        updatedAt: Number(row?.updatedAt || Date.now()) || Date.now(),
        sourceUrl: row?.sourceUrl ? String(row.sourceUrl) : null,
      });
    }
    if ((index + 1) % 16 === 0 || index + 1 === rows.length) {
      opts.onProgress?.(index + 1, total, `Préparation des médias : ${index + 1}/${total}`);
      await yieldIfNeeded(true);
    } else {
      await yieldIfNeeded();
    }
  }

  // Une seule transaction IndexedDB au lieu d'une transaction + un getAll()
  // par image. Sur Android, c'est la différence entre quelques secondes et
  // plusieurs minutes à 64 %.
  opts.onProgress?.(Math.max(0, total - 1), total, `Écriture groupée de ${entries.length} média(s)…`);
  await yieldIfNeeded(true);
  await idbPutMany(entries);
  await yieldIfNeeded(true);
  opts.onProgress?.(total, total, `${entries.length} média(s) restauré(s).`);
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("dc-user-media-restored", { detail: { count: entries.length } })); } catch {}
    try { window.dispatchEvent(new Event("dc-dartsets-updated")); } catch {}
  }
  return entries.length;
}
