import {
  downloadDirectR2MediaFallback,
  uploadDirectR2MediaFallback,
  listDirectR2Backups,
  downloadDirectR2Backup,
} from "./directR2BackupApi";

export type UserMediaKind =
  | "profile_avatar"
  | "dartset_main"
  | "dartset_thumb"
  | "team_logo"
  | "group_avatar"
  | "group_cover"
  | "online_avatar"
  | "user_image";

export type UserMediaFallbackEntry = {
  key: string;
  kind: UserMediaKind | string;
  dataUrl: string;
  updatedAt: number;
  sourceUrl?: string | null;
};

export type UserMediaFallbackSnapshot = {
  _v: 1;
  createdAt: string;
  media: Record<string, UserMediaFallbackEntry>;
};

const DB_NAME = "dc_user_media_fallback_v1";
const STORE_NAME = "media";
const MAX_LOCAL_ENTRIES = 360;
const MAX_SNAPSHOT_ENTRIES = 260;
const MAX_SNAPSHOT_CHARS = 14_000_000;
const REMOTE_TIMEOUT_MS = 4_000;

const memory = new Map<string, UserMediaFallbackEntry>();
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

export function onlineAvatarMediaKey(userId: unknown): string {
  return cleanKey(`online_avatar:${String(userId || "").trim()}`);
}

export function dartSetMainMediaKey(setId: unknown): string {
  return cleanKey(`dartset_main:${String(setId || "").trim()}`);
}

export function dartSetThumbMediaKey(setId: unknown): string {
  return cleanKey(`dartset_thumb:${String(setId || "").trim()}`);
}

export function teamLogoMediaKey(teamId: unknown): string {
  return cleanKey(`team_logo:${String(teamId || "").trim()}`);
}

export function groupAvatarMediaKey(groupId: unknown): string {
  return cleanKey(`group_avatar:${String(groupId || "").trim()}`);
}

export function groupCoverMediaKey(groupId: unknown): string {
  return cleanKey(`group_cover:${String(groupId || "").trim()}`);
}

function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(value.trim());
}

function imagePolicy(kind: string) {
  if (kind === "profile_avatar" || kind === "online_avatar" || kind === "group_avatar" || kind === "team_logo") {
    return { maxEdge: 320, quality: 0.82, maxChars: 260_000 };
  }
  if (kind === "dartset_thumb") return { maxEdge: 420, quality: 0.82, maxChars: 420_000 };
  if (kind === "group_cover") return { maxEdge: 1280, quality: 0.80, maxChars: 1_350_000 };
  return { maxEdge: 900, quality: 0.82, maxChars: 1_100_000 };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

async function idbPut(entry: UserMediaFallbackEntry): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    void trimLocalDb();
  } catch {}
}

async function trimLocalDb(): Promise<void> {
  try {
    const rows = await idbGetAll();
    if (rows.length <= MAX_LOCAL_ENTRIES) return;
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

  // 1) Cache Storage/PWA : aucune requête NAS nécessaire.
  try {
    if (typeof caches !== "undefined") {
      const direct = await caches.match(value, { ignoreSearch: false });
      const directBlob = await responseToImageBlob(direct);
      if (directBlob) return directBlob;
      const loose = await caches.match(value, { ignoreSearch: true });
      const looseBlob = await responseToImageBlob(loose);
      if (looseBlob) return looseBlob;
    }
  } catch {}

  // 2) Cache HTTP du navigateur. force-cache permet de récupérer une image déjà
  // vue même si le NAS vient de tomber. Si elle n'est pas en cache, le timeout
  // évite de bloquer l'UI.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(value, {
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
  memory.set(entry.key, entry);
  await idbPut(entry);
}

export async function readLocalUserMediaFallback(keyInput: string): Promise<string> {
  const key = cleanKey(keyInput);
  if (!key) return "";
  const mem = memory.get(key);
  if (mem?.dataUrl) return mem.dataUrl;
  const row = await idbGet(key);
  if (row?.dataUrl && isImageDataUrl(row.dataUrl)) {
    memory.set(key, row);
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
    const compact = await compactSource(source, kind);
    if (!compact) return "";
    const entry: UserMediaFallbackEntry = {
      key,
      kind,
      dataUrl: compact,
      updatedAt: Number(opts.updatedAt || Date.now()) || Date.now(),
      sourceUrl: opts.sourceUrl || (!isImageDataUrl(source) ? source : null),
    };
    await storeEntry(entry);
    if (opts.mirrorR2 !== false) {
      void uploadDirectR2MediaFallback(entry).catch(() => undefined);
    }
    return compact;
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
  if (snapshot?.idb && typeof snapshot.idb === "object") {
    for (const value of Object.values(snapshot.idb)) push(value);
  }
  return out;
}

async function importLegacyMediaFromSnapshot(snapshotInput: any): Promise<number> {
  const snapshot = unwrapPortableSnapshot(snapshotInput);
  if (!snapshot || typeof snapshot !== "object") return 0;
  let count = await importUserMediaFallbackSnapshot(snapshot?.userMediaFallbacks || snapshot?.user_media_fallbacks || null).catch(() => 0);
  const stores = collectSnapshotStores(snapshot);

  for (const root of stores) {
    for (const list of [root?.profiles, root?.localProfiles, root?.players]) {
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        const id = String(p?.id || p?.profileId || p?.playerId || "").trim();
        if (!id) continue;
        const src = firstImage(p?.avatarThumbDataUrl, p?.avatarDataUrl, p?.avatarFullDataUrl, p?.avatarCastDataUrl, p?.photoDataUrl, p?.avatar, p?.avatarUrl);
        if (!isImageDataUrl(src)) continue;
        const saved = await captureUserMediaFallback(profileAvatarMediaKey(id), src, { kind: "profile_avatar" }).catch(() => "");
        if (saved) count += 1;
      }
    }

    const dartLists = [root?.dartSets, root?.dartsets].filter(Array.isArray) as any[][];
    for (const list of dartLists) {
      for (const set of list) {
        const id = String(set?.id || "").trim();
        if (!id) continue;
        const main = firstImage(set?.photoDataUrl, set?.imageDataUrl, set?.mainImageDataUrl, set?.dartSetImageDataUrl, set?.mainImageUrl, set?.photoUrl, set?.imageUrl);
        const thumb = firstImage(set?.photoThumbDataUrl, set?.thumbDataUrl, set?.thumbImageDataUrl, set?.thumbImageUrl, set?.photoThumbUrl, main);
        if (isImageDataUrl(main)) {
          const saved = await captureUserMediaFallback(dartSetMainMediaKey(id), main, { kind: "dartset_main" }).catch(() => "");
          if (saved) count += 1;
        }
        if (isImageDataUrl(thumb)) {
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
      if (!isImageDataUrl(logo)) continue;
      const saved = await captureUserMediaFallback(teamLogoMediaKey(id), logo, { kind: "team_logo" }).catch(() => "");
      if (saved) count += 1;
    }
  }
  return count;
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

    if (opts.allowR2 !== false) {
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
        if (opts.mirrorRecoveredToR2 !== false) {
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

export function captureStoreUserMedia(store: any): void {
  try {
    const profileLists = [store?.profiles, store?.localProfiles, store?.players].filter(Array.isArray) as any[][];
    for (const list of profileLists) {
      for (const p of list) {
        const id = String(p?.id || p?.profileId || p?.playerId || "").trim();
        if (!id) continue;
        const src = firstImage(p?.avatarThumbDataUrl, p?.avatarDataUrl, p?.avatarFullDataUrl, p?.avatarCastDataUrl, p?.photoDataUrl);
        if (isImageDataUrl(src)) void captureUserMediaFallback(profileAvatarMediaKey(id), src, { kind: "profile_avatar" });
      }
    }

    const dartSets = Array.isArray(store?.dartSets) ? store.dartSets : [];
    for (const set of dartSets) {
      const id = String(set?.id || "").trim();
      if (!id) continue;
      const main = firstImage(set?.photoDataUrl, set?.imageDataUrl, set?.mainImageDataUrl, set?.dartSetImageDataUrl, set?.mainImageUrl);
      const thumb = firstImage(set?.photoThumbDataUrl, set?.thumbDataUrl, set?.thumbImageDataUrl, set?.thumbImageUrl, main);
      if (isImageDataUrl(main)) void captureUserMediaFallback(dartSetMainMediaKey(id), main, { kind: "dartset_main" });
      if (isImageDataUrl(thumb)) void captureUserMediaFallback(dartSetThumbMediaKey(id), thumb, { kind: "dartset_thumb" });
    }

    const teams = Array.isArray(store?.teams) ? store.teams : [];
    for (const team of teams) {
      const id = String(team?.id || team?.teamId || "").trim();
      if (!id) continue;
      const logo = firstImage(team?.logoDataUrl, team?.avatarDataUrl, team?.imageDataUrl, team?.regionLogoDataUrl);
      if (isImageDataUrl(logo)) void captureUserMediaFallback(teamLogoMediaKey(id), logo, { kind: "team_logo" });
    }
  } catch {}
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

export async function hydrateStoreUserMedia(storeInput: any): Promise<{ store: any; changed: boolean }> {
  if (!storeInput || typeof storeInput !== "object") return { store: storeInput, changed: false };
  const store = { ...storeInput };
  let changed = false;

  const profiles = Array.isArray(store.profiles) ? store.profiles.map((p: any) => ({ ...p })) : [];
  await mapWithConcurrency(profiles, 4, async (p) => {
    const id = String(p?.id || "").trim();
    if (!id) return;
    const primary = firstImage(p?.avatarDataUrl, p?.avatarUrl, p?.avatar, p?.photoUrl, p?.avatarPath);
    const fallback = await resolveUserMediaFallback(profileAvatarMediaKey(id), primary, { kind: "profile_avatar" });
    if (fallback && p.avatarDataUrl !== fallback) {
      p.avatarDataUrl = fallback;
      changed = true;
    }
  });
  if (profiles.length) store.profiles = profiles;

  const dartSets = Array.isArray(store.dartSets) ? store.dartSets.map((d: any) => ({ ...d })) : [];
  await mapWithConcurrency(dartSets, 3, async (d) => {
    const id = String(d?.id || "").trim();
    if (!id) return;
    const mainPrimary = firstImage(d?.photoDataUrl, d?.imageDataUrl, d?.mainImageDataUrl, d?.mainImageUrl, d?.photoUrl, d?.imageUrl);
    const thumbPrimary = firstImage(d?.photoThumbDataUrl, d?.thumbDataUrl, d?.thumbImageDataUrl, d?.thumbImageUrl, mainPrimary);
    const [main, thumb] = await Promise.all([
      resolveUserMediaFallback(dartSetMainMediaKey(id), mainPrimary, { kind: "dartset_main" }),
      resolveUserMediaFallback(dartSetThumbMediaKey(id), thumbPrimary, { kind: "dartset_thumb" }),
    ]);
    if (main && d.mainImageUrl !== main) { d.mainImageUrl = main; changed = true; }
    if (thumb && d.thumbImageUrl !== thumb) { d.thumbImageUrl = thumb; changed = true; }
  });
  if (dartSets.length) store.dartSets = dartSets;

  const teams = Array.isArray(store.teams) ? store.teams.map((t: any) => ({ ...t })) : [];
  await mapWithConcurrency(teams, 3, async (t) => {
    const id = String(t?.id || t?.teamId || "").trim();
    if (!id) return;
    const primary = firstImage(t?.logoDataUrl, t?.logoUrl, t?.avatarUrl, t?.imageUrl, t?.logo);
    const logo = await resolveUserMediaFallback(teamLogoMediaKey(id), primary, { kind: "team_logo" });
    if (logo && t.logoDataUrl !== logo) { t.logoDataUrl = logo; changed = true; }
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

export async function importUserMediaFallbackSnapshot(snapshot: any): Promise<number> {
  const block = snapshot?.userMediaFallbacks || snapshot?.user_media_fallbacks || snapshot;
  const media = block?.media && typeof block.media === "object" ? block.media : {};
  let count = 0;
  for (const [rawKey, raw] of Object.entries(media)) {
    const row: any = raw;
    const key = cleanKey(row?.key || rawKey);
    const dataUrl = String(row?.dataUrl || "").trim();
    if (!key || !isImageDataUrl(dataUrl)) continue;
    const entry: UserMediaFallbackEntry = {
      key,
      kind: String(row?.kind || key.split(":")[0] || "user_image"),
      dataUrl,
      updatedAt: Number(row?.updatedAt || Date.now()) || Date.now(),
      sourceUrl: row?.sourceUrl ? String(row.sourceUrl) : null,
    };
    await storeEntry(entry);
    count += 1;
  }
  return count;
}
