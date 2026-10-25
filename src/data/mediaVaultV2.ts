import { getAccountScopeId, sanitizeAccountScopePart } from "../lib/accountScope";

export type MediaVaultV2Asset = {
  assetId: string;
  ownerUserId: string | null;
  kind: string;
  sha256: string;
  mime: string;
  byteLength: number;
  createdAt: number;
  updatedAt: number;
  blob: Blob;
  sourceUrl?: string | null;
  remoteAssetId?: string | null;
  remoteObjectKey?: string | null;
  publicUrl?: string | null;
};

export type MediaVaultV2Ref = {
  refId: string;
  ownerUserId: string | null;
  mediaKey: string;
  assetId: string;
  kind: string;
  updatedAt: number;
};

export type MediaVaultV2SnapshotAsset = Omit<MediaVaultV2Asset, "blob"> & { dataUrl: string };

export type MediaVaultV2Snapshot = {
  _v: 2;
  schemaVersion: 2;
  ownerUserId: string | null;
  createdAt: string;
  assets: Record<string, MediaVaultV2SnapshotAsset>;
  refs: Record<string, string>;
  summary: {
    assets: number;
    refs: number;
    bytes: number;
    requiredRefs: number;
    missingRequiredRefs: string[];
    integrityErrors: string[];
  };
};

export type MediaVaultV2ImportReport = {
  ok: boolean;
  importedAssets: number;
  importedRefs: number;
  skippedAssets: number;
  errors: string[];
};

const DB_NAME = "mss_media_vault_v2";
const DB_VERSION = 1;
const ASSET_STORE = "assets";
const REF_STORE = "refs";
const LOCAL_OWNER = "__local__";

let dbPromise: Promise<IDBDatabase> | null = null;
const dataUrlMemory = new Map<string, string>();
const MEMORY_MAX = 24;

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanMediaKey(value: unknown): string {
  return cleanString(value).replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 220);
}

function ownerUserId(value?: string | null): string | null {
  const explicit = cleanString(value);
  if (explicit) return explicit;
  return cleanString(getAccountScopeId()) || null;
}

function ownerStorageKey(value?: string | null): string {
  return sanitizeAccountScopePart(ownerUserId(value) || LOCAL_OWNER) || LOCAL_OWNER;
}

function refIdFor(mediaKey: string, owner?: string | null): string {
  return `${ownerStorageKey(owner)}:${cleanMediaKey(mediaKey)}`;
}

function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value.trim());
}

function mimeFromDataUrl(value: string): string {
  const match = /^data:([^;,]+);base64,/i.exec(String(value || ""));
  return cleanString(match?.[1] || "application/octet-stream").toLowerCase();
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(String(base64 || "").replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const value = String(dataUrl || "").trim();
  const comma = value.indexOf(",");
  if (comma < 0 || !value.slice(0, comma).includes(";base64")) return null;
  try {
    return { bytes: base64ToBytes(value.slice(comma + 1)), mime: mimeFromDataUrl(value) };
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(bytes.length, i + chunk));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type || "application/octet-stream"};base64,${bytesToBase64(bytes)}`;
}

async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function canonicalAssetId(owner: string | null, sha256: string): Promise<string> {
  const identityHash = await sha256Hex(`${owner || LOCAL_OWNER}\n${sha256}`);
  return `mva2_${identityHash.slice(0, 40)}`;
}

function rememberDataUrl(assetId: string, dataUrl: string): void {
  if (!assetId || !dataUrl) return;
  dataUrlMemory.delete(assetId);
  dataUrlMemory.set(assetId, dataUrl);
  while (dataUrlMemory.size > MEMORY_MAX) {
    const oldest = dataUrlMemory.keys().next().value as string | undefined;
    if (!oldest) break;
    dataUrlMemory.delete(oldest);
  }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        const assets = db.createObjectStore(ASSET_STORE, { keyPath: "assetId" });
        assets.createIndex("ownerUserId", "ownerUserId", { unique: false });
        assets.createIndex("sha256", "sha256", { unique: false });
      }
      if (!db.objectStoreNames.contains(REF_STORE)) {
        const refs = db.createObjectStore(REF_STORE, { keyPath: "refId" });
        refs.createIndex("ownerUserId", "ownerUserId", { unique: false });
        refs.createIndex("assetId", "assetId", { unique: false });
        refs.createIndex("mediaKey", "mediaKey", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        try { db.close(); } catch {}
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function getRef(mediaKeyInput: string, owner?: string | null): Promise<MediaVaultV2Ref | null> {
  const mediaKey = cleanMediaKey(mediaKeyInput);
  if (!mediaKey) return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(REF_STORE, "readonly");
      const req = tx.objectStore(REF_STORE).get(refIdFor(mediaKey, owner));
      req.onsuccess = () => resolve((req.result as MediaVaultV2Ref) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function getAsset(assetId: string): Promise<MediaVaultV2Asset | null> {
  if (!assetId) return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, "readonly");
      const req = tx.objectStore(ASSET_STORE).get(assetId);
      req.onsuccess = () => resolve((req.result as MediaVaultV2Asset) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function getAllAssets(): Promise<MediaVaultV2Asset[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, "readonly");
      const req = tx.objectStore(ASSET_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []) as MediaVaultV2Asset[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function getAllRefs(): Promise<MediaVaultV2Ref[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(REF_STORE, "readonly");
      const req = tx.objectStore(REF_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []) as MediaVaultV2Ref[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function putAssetAndRef(asset: MediaVaultV2Asset, ref: MediaVaultV2Ref): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([ASSET_STORE, REF_STORE], "readwrite");
    tx.objectStore(ASSET_STORE).put(asset);
    tx.objectStore(REF_STORE).put(ref);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function putMediaVaultV2DataUrl(input: {
  mediaKey: string;
  kind: string;
  dataUrl: string;
  ownerUserId?: string | null;
  updatedAt?: number;
  sourceUrl?: string | null;
  remoteAssetId?: string | null;
  remoteObjectKey?: string | null;
  publicUrl?: string | null;
}): Promise<MediaVaultV2Asset | null> {
  const mediaKey = cleanMediaKey(input.mediaKey);
  const dataUrl = cleanString(input.dataUrl);
  if (!mediaKey || !isImageDataUrl(dataUrl)) return null;
  const parsed = dataUrlToBytes(dataUrl);
  if (!parsed) return null;

  const owner = ownerUserId(input.ownerUserId);
  const sha256 = await sha256Hex(parsed.bytes);
  const assetId = await canonicalAssetId(owner, sha256);
  const now = Date.now();
  const updatedAt = Math.max(1, Number(input.updatedAt || now) || now);
  const existing = await getAsset(assetId);
  const asset: MediaVaultV2Asset = {
    assetId,
    ownerUserId: owner,
    kind: cleanString(input.kind) || cleanString(mediaKey.split(":")[0]) || "user_image",
    sha256,
    mime: parsed.mime,
    byteLength: parsed.bytes.byteLength,
    createdAt: Number(existing?.createdAt || updatedAt) || updatedAt,
    updatedAt: Math.max(Number(existing?.updatedAt || 0), updatedAt),
    blob: existing?.blob instanceof Blob && Number(existing?.byteLength || 0) === parsed.bytes.byteLength
      ? existing.blob
      : new Blob([parsed.bytes], { type: parsed.mime }),
    sourceUrl: cleanString(input.sourceUrl || existing?.sourceUrl) || null,
    remoteAssetId: cleanString(input.remoteAssetId || existing?.remoteAssetId) || null,
    remoteObjectKey: cleanString(input.remoteObjectKey || existing?.remoteObjectKey) || null,
    publicUrl: cleanString(input.publicUrl || existing?.publicUrl) || null,
  };
  const ref: MediaVaultV2Ref = {
    refId: refIdFor(mediaKey, owner),
    ownerUserId: owner,
    mediaKey,
    assetId,
    kind: asset.kind,
    updatedAt: asset.updatedAt,
  };
  await putAssetAndRef(asset, ref);
  rememberDataUrl(assetId, dataUrl);
  return asset;
}

export async function resolveMediaVaultV2DataUrl(mediaKeyInput: string, owner?: string | null): Promise<string> {
  const ref = await getRef(mediaKeyInput, owner);
  if (!ref?.assetId) return "";
  const cached = dataUrlMemory.get(ref.assetId);
  if (cached) {
    rememberDataUrl(ref.assetId, cached);
    return cached;
  }
  const asset = await getAsset(ref.assetId);
  if (!asset?.blob) return "";
  try {
    const dataUrl = await blobToDataUrl(asset.blob);
    rememberDataUrl(asset.assetId, dataUrl);
    return dataUrl;
  } catch {
    return "";
  }
}

export async function getMediaVaultV2AssetForKey(mediaKeyInput: string, owner?: string | null): Promise<MediaVaultV2Asset | null> {
  const ref = await getRef(mediaKeyInput, owner);
  return ref?.assetId ? getAsset(ref.assetId) : null;
}

export async function importLegacyEntriesIntoMediaVaultV2(
  entries: Array<{ key?: string; kind?: string; dataUrl?: string; updatedAt?: number; sourceUrl?: string | null }>,
  opts: { ownerUserId?: string | null; onProgress?: (completed: number, total: number) => void } = {},
): Promise<{ imported: number; skipped: number }> {
  const rows = Array.isArray(entries) ? entries : [];
  let imported = 0;
  let skipped = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {};
    try {
      const asset = await putMediaVaultV2DataUrl({
        mediaKey: cleanString(row.key),
        kind: cleanString(row.kind) || "user_image",
        dataUrl: cleanString(row.dataUrl),
        ownerUserId: opts.ownerUserId,
        updatedAt: Number(row.updatedAt || 0) || Date.now(),
        sourceUrl: row.sourceUrl || null,
      });
      if (asset) imported += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
    opts.onProgress?.(index + 1, rows.length);
    if ((index + 1) % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return { imported, skipped };
}

export async function exportMediaVaultV2Snapshot(opts: {
  ownerUserId?: string | null;
  requiredKeys?: Iterable<string>;
  onProgress?: (completed: number, total: number) => void;
} = {}): Promise<MediaVaultV2Snapshot> {
  const owner = ownerUserId(opts.ownerUserId);
  const refs = (await getAllRefs()).filter((ref) => cleanString(ref.ownerUserId) === cleanString(owner));
  const allAssets = await getAllAssets();
  const assetsById = new Map(allAssets.map((asset) => [asset.assetId, asset] as const));
  const required = Array.from(new Set(Array.from(opts.requiredKeys || [], (value) => cleanMediaKey(value)).filter(Boolean)));
  const refByKey = new Map(refs.map((ref) => [ref.mediaKey, ref] as const));
  const missingRequiredRefs = required.filter((key) => !refByKey.has(key));
  const selectedAssetIds = Array.from(new Set(refs.map((ref) => ref.assetId).filter(Boolean)));
  const assets: Record<string, MediaVaultV2SnapshotAsset> = {};
  const snapshotRefs: Record<string, string> = {};
  const integrityErrors: string[] = [];
  let bytes = 0;

  for (const ref of refs) snapshotRefs[ref.mediaKey] = ref.assetId;
  for (let index = 0; index < selectedAssetIds.length; index += 1) {
    const assetId = selectedAssetIds[index];
    const asset = assetsById.get(assetId);
    if (!asset?.blob) {
      integrityErrors.push(`Asset introuvable pour ${assetId}.`);
      opts.onProgress?.(index + 1, selectedAssetIds.length);
      continue;
    }
    try {
      const dataUrl = await blobToDataUrl(asset.blob);
      const parsed = dataUrlToBytes(dataUrl);
      if (!parsed) throw new Error("data_url_invalid");
      const sha = await sha256Hex(parsed.bytes);
      if (sha !== asset.sha256) throw new Error("sha256_mismatch");
      bytes += parsed.bytes.byteLength;
      assets[assetId] = { ...asset, dataUrl };
      delete (assets[assetId] as any).blob;
    } catch (error) {
      integrityErrors.push(`${assetId}: ${String((error as any)?.message || error)}`);
    }
    opts.onProgress?.(index + 1, selectedAssetIds.length);
    if ((index + 1) % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return {
    _v: 2,
    schemaVersion: 2,
    ownerUserId: owner,
    createdAt: new Date().toISOString(),
    assets,
    refs: snapshotRefs,
    summary: {
      assets: Object.keys(assets).length,
      refs: Object.keys(snapshotRefs).length,
      bytes,
      requiredRefs: required.length,
      missingRequiredRefs,
      integrityErrors,
    },
  };
}

export async function importMediaVaultV2Snapshot(
  snapshotInput: any,
  opts: { ownerUserId?: string | null; onProgress?: (completed: number, total: number, message: string) => void } = {},
): Promise<MediaVaultV2ImportReport> {
  const snapshot = snapshotInput?.mediaVaultV2 || snapshotInput?.media_vault_v2 || snapshotInput;
  if (!snapshot || Number(snapshot?._v || 0) !== 2 || !snapshot?.assets || typeof snapshot.assets !== "object") {
    return { ok: true, importedAssets: 0, importedRefs: 0, skippedAssets: 0, errors: [] };
  }
  const currentOwner = ownerUserId(opts.ownerUserId);
  const snapshotOwner = cleanString(snapshot?.ownerUserId) || null;
  if (currentOwner && snapshotOwner && currentOwner !== snapshotOwner) {
    return {
      ok: false,
      importedAssets: 0,
      importedRefs: 0,
      skippedAssets: Object.keys(snapshot.assets).length,
      errors: ["Le Media Vault V2 appartient à un autre compte."],
    };
  }
  const sourceOwner = snapshotOwner;
  const targetOwner = currentOwner || snapshotOwner;

  const entries = Object.entries<any>(snapshot.assets);
  const validAssets = new Map<string, MediaVaultV2Asset>();
  const importedAssetIdMap = new Map<string, string>();
  const errors: string[] = [];
  let skippedAssets = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const [rawAssetId, raw] = entries[index];
    const dataUrl = cleanString(raw?.dataUrl);
    const parsed = dataUrlToBytes(dataUrl);
    if (!parsed) {
      skippedAssets += 1;
      errors.push(`${rawAssetId}: dataUrl invalide.`);
      opts.onProgress?.(index + 1, entries.length, `Contrôle médias V2 ${index + 1}/${entries.length}`);
      continue;
    }
    const sha = await sha256Hex(parsed.bytes);
    if (cleanString(raw?.sha256).toLowerCase() !== sha.toLowerCase()) {
      skippedAssets += 1;
      errors.push(`${rawAssetId}: SHA-256 invalide.`);
      opts.onProgress?.(index + 1, entries.length, `Contrôle médias V2 ${index + 1}/${entries.length}`);
      continue;
    }
    const incomingAssetId = cleanString(raw?.assetId || rawAssetId);
    const expectedIncomingAssetId = await canonicalAssetId(sourceOwner, sha);
    if (incomingAssetId !== expectedIncomingAssetId) {
      skippedAssets += 1;
      errors.push(`${rawAssetId}: assetId ne correspond pas au contenu/propriétaire source.`);
      opts.onProgress?.(index + 1, entries.length, `Contrôle médias V2 ${index + 1}/${entries.length}`);
      continue;
    }
    const targetAssetId = await canonicalAssetId(targetOwner, sha);
    importedAssetIdMap.set(incomingAssetId, targetAssetId);
    validAssets.set(targetAssetId, {
      assetId: targetAssetId,
      ownerUserId: targetOwner,
      kind: cleanString(raw?.kind) || "user_image",
      sha256: sha,
      mime: parsed.mime,
      byteLength: parsed.bytes.byteLength,
      createdAt: Number(raw?.createdAt || raw?.updatedAt || Date.now()) || Date.now(),
      updatedAt: Number(raw?.updatedAt || Date.now()) || Date.now(),
      blob: new Blob([parsed.bytes], { type: parsed.mime }),
      sourceUrl: cleanString(raw?.sourceUrl) || null,
      remoteAssetId: cleanString(raw?.remoteAssetId) || null,
      remoteObjectKey: cleanString(raw?.remoteObjectKey) || null,
      publicUrl: cleanString(raw?.publicUrl) || null,
    });
    rememberDataUrl(targetAssetId, dataUrl);
    opts.onProgress?.(index + 1, entries.length, `Contrôle médias V2 ${index + 1}/${entries.length}`);
    if ((index + 1) % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const rawRefs = snapshot?.refs && typeof snapshot.refs === "object" ? snapshot.refs : {};
  const refs: MediaVaultV2Ref[] = [];
  for (const [rawKey, rawAssetId] of Object.entries<any>(rawRefs)) {
    const mediaKey = cleanMediaKey(rawKey);
    const incomingAssetId = cleanString(rawAssetId);
    const assetId = importedAssetIdMap.get(incomingAssetId) || "";
    const asset = validAssets.get(assetId);
    if (!mediaKey || !asset) continue;
    refs.push({
      refId: refIdFor(mediaKey, targetOwner),
      ownerUserId: targetOwner,
      mediaKey,
      assetId,
      kind: asset.kind,
      updatedAt: asset.updatedAt,
    });
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([ASSET_STORE, REF_STORE], "readwrite");
      const assetStore = tx.objectStore(ASSET_STORE);
      const refStore = tx.objectStore(REF_STORE);
      for (const asset of validAssets.values()) assetStore.put(asset);
      for (const ref of refs) refStore.put(ref);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (error) {
    errors.push(`Écriture IndexedDB Media Vault V2 impossible: ${String((error as any)?.message || error)}`);
  }

  return {
    ok: errors.length === 0,
    importedAssets: validAssets.size,
    importedRefs: refs.length,
    skippedAssets,
    errors,
  };
}

export async function getMediaVaultV2Diagnostics(ownerInput?: string | null): Promise<{
  ownerUserId: string | null;
  assets: number;
  refs: number;
  bytes: number;
  byKind: Record<string, number>;
  orphanAssets: number;
  brokenRefs: number;
}> {
  const owner = ownerUserId(ownerInput);
  const refs = (await getAllRefs()).filter((ref) => cleanString(ref.ownerUserId) === cleanString(owner));
  const assets = (await getAllAssets()).filter((asset) => cleanString(asset.ownerUserId) === cleanString(owner));
  const assetIds = new Set(assets.map((asset) => asset.assetId));
  const referenced = new Set(refs.map((ref) => ref.assetId));
  const byKind: Record<string, number> = {};
  let bytes = 0;
  for (const asset of assets) {
    byKind[asset.kind || "user_image"] = (byKind[asset.kind || "user_image"] || 0) + 1;
    bytes += Number(asset.byteLength || 0) || 0;
  }
  return {
    ownerUserId: owner,
    assets: assets.length,
    refs: refs.length,
    bytes,
    byKind,
    orphanAssets: assets.filter((asset) => !referenced.has(asset.assetId)).length,
    brokenRefs: refs.filter((ref) => !assetIds.has(ref.assetId)).length,
  };
}

const DURABLE_MEDIA_KEY = /^(?:profile_avatar|local_profile_avatar|bot_avatar|dartset_main|dartset_thumb|team_logo|team_cover|group_avatar|group_cover|club_logo|club_cover|online_avatar|gallery_item|avatar_ai_gallery|user_image):/i;

/**
 * Collecte les références média déclarées dans un snapshot sans dépendre des
 * stores métier. WAVE 4 s'en sert comme contrat d'intégrité : toute référence
 * durable déclarée doit avoir un asset V2 dans les snapshots portables.
 */
export function collectRequiredMediaKeysFromSnapshot(snapshot: any): string[] {
  const out = new Set<string>();
  const seen = new WeakSet<object>();
  const push = (value: unknown) => {
    const key = cleanMediaKey(value);
    if (key && DURABLE_MEDIA_KEY.test(key)) out.add(key);
  };
  const meaningfulMediaSource = (value: unknown): boolean => {
    const s = cleanString(value);
    if (!s) return false;
    if (/^(?:\/assets\/|\/src\/assets\/|asset:|emoji:)/i.test(s)) return false;
    return true;
  };
  const walk = (node: any, depth: number) => {
    if (!node || typeof node !== "object" || depth > 10) return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }

    // Les metadata de galerie déclarent un mediaKey sans autre champ asset.
    if (meaningfulMediaSource(node?.mediaKey)) push(node.mediaKey);

    // Ne rendre obligatoire qu'un média réellement utilisé par l'entité. Les
    // stores WAVE 3 précréent parfois logoMediaKey/coverMediaKey alors qu'aucun
    // logo/cover personnalisé n'existe encore : ces placeholders ne doivent pas
    // invalider une sauvegarde.
    const logoUsed = !node?.logoLibraryId && !node?.logoLibraryFileName && [
      node?.logoDataUrl, node?.logoUrl, node?.logoAssetId, node?.logoMediaAssetId,
      node?.teamLogoAssetId, node?.avatarUrl, node?.imageUrl,
    ].some(meaningfulMediaSource);
    if (logoUsed) push(node?.logoMediaKey);

    const coverUsed = [node?.coverDataUrl, node?.coverUrl, node?.coverAssetId].some(meaningfulMediaSource);
    if (coverUsed) push(node?.coverMediaKey);

    const avatarUsed = [
      node?.avatarDataUrl, node?.avatarUrl, node?.avatarAssetId,
      node?.avatarFullAssetId, node?.avatarThumbAssetId, node?.avatarCastAssetId,
    ].some(meaningfulMediaSource);
    if (avatarUsed) push(node?.avatarMediaKey);

    const mainUsed = node?.kind === "photo" || [
      node?.photoDataUrl, node?.mainImageDataUrl, node?.mainImageUrl,
      node?.photoUrl, node?.photoAssetId, node?.mainImageAssetId,
    ].some(meaningfulMediaSource);
    if (mainUsed) {
      push(node?.mainMediaKey);
      push(node?.r2MainMediaKey);
    }
    const thumbUsed = [
      node?.photoThumbDataUrl, node?.thumbImageDataUrl, node?.thumbImageUrl,
      node?.photoThumbUrl, node?.thumbImageAssetId, node?.photoThumbAssetId,
    ].some(meaningfulMediaSource);
    if (thumbUsed) {
      push(node?.thumbMediaKey);
      push(node?.r2ThumbMediaKey);
    }

    for (const value of Object.values<any>(node)) walk(value, depth + 1);
  };
  walk(snapshot?.portableAccountData || snapshot?.portable_account_data || {}, 0);
  walk(snapshot?.organizationData || snapshot?.organization_data || {}, 0);

  const portable = snapshot?.portableAccountData || snapshot?.portable_account_data || {};
  for (const profile of Array.isArray(portable?.profiles) ? portable.profiles : []) {
    const id = cleanString(profile?.id);
    if (!id) continue;
    const avatarSource = cleanString(profile?.avatarUrl || profile?.avatar || profile?.avatarDataUrl || profile?.avatarAssetId || profile?.avatarFullAssetId);
    if (meaningfulMediaSource(avatarSource)) push(`profile_avatar:${id}`);
  }
  return Array.from(out).sort();
}

export async function validateMediaVaultV2Snapshot(
  snapshotInput: any,
  opts: { ownerUserId?: string | null; requiredKeys?: Iterable<string> } = {},
): Promise<{ ok: boolean; legacy: boolean; errors: string[]; assets: number; refs: number; bytes: number }> {
  const snapshot = snapshotInput?.mediaVaultV2 || snapshotInput?.media_vault_v2 || snapshotInput;
  if (!snapshot || Number(snapshot?._v || 0) !== 2) {
    return { ok: true, legacy: true, errors: [], assets: 0, refs: 0, bytes: 0 };
  }
  const errors: string[] = [];
  const currentOwner = ownerUserId(opts.ownerUserId);
  const snapshotOwner = cleanString(snapshot?.ownerUserId) || null;
  if (currentOwner && snapshotOwner && currentOwner !== snapshotOwner) errors.push("Le Media Vault V2 appartient à un autre compte.");
  const verificationOwner = snapshotOwner;
  const rawAssets = snapshot?.assets && typeof snapshot.assets === "object" ? snapshot.assets : {};
  const rawRefs = snapshot?.refs && typeof snapshot.refs === "object" ? snapshot.refs : {};
  const validAssetIds = new Set<string>();
  let bytes = 0;
  for (const [rawAssetId, raw] of Object.entries<any>(rawAssets)) {
    const dataUrl = cleanString(raw?.dataUrl);
    const parsed = dataUrlToBytes(dataUrl);
    if (!parsed) {
      errors.push(`${rawAssetId}: dataUrl invalide.`);
      continue;
    }
    const sha = await sha256Hex(parsed.bytes);
    if (cleanString(raw?.sha256).toLowerCase() !== sha.toLowerCase()) {
      errors.push(`${rawAssetId}: SHA-256 invalide.`);
      continue;
    }
    const expectedAssetId = await canonicalAssetId(verificationOwner, sha);
    const assetId = cleanString(raw?.assetId || rawAssetId);
    if (assetId !== expectedAssetId) {
      errors.push(`${rawAssetId}: assetId invalide.`);
      continue;
    }
    validAssetIds.add(assetId);
    bytes += parsed.bytes.byteLength;
  }
  for (const [mediaKey, rawAssetId] of Object.entries<any>(rawRefs)) {
    if (!cleanMediaKey(mediaKey) || !validAssetIds.has(cleanString(rawAssetId))) {
      errors.push(`Référence média cassée: ${cleanString(mediaKey) || "?"}.`);
    }
  }
  const required = Array.from(new Set(Array.from(opts.requiredKeys || [], (value) => cleanMediaKey(value)).filter(Boolean)));
  for (const mediaKey of required) {
    const assetId = cleanString(rawRefs?.[mediaKey]);
    if (!assetId || !validAssetIds.has(assetId)) errors.push(`Média requis absent: ${mediaKey}.`);
  }
  return {
    ok: errors.length === 0,
    legacy: false,
    errors: Array.from(new Set(errors)),
    assets: validAssetIds.size,
    refs: Object.keys(rawRefs).length,
    bytes,
  };
}

export async function clearMediaVaultV2ForOwner(ownerInput?: string | null): Promise<void> {
  const owner = ownerUserId(ownerInput);
  const refs = (await getAllRefs()).filter((ref) => cleanString(ref.ownerUserId) === cleanString(owner));
  const assets = (await getAllAssets()).filter((asset) => cleanString(asset.ownerUserId) === cleanString(owner));
  if (!refs.length && !assets.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([ASSET_STORE, REF_STORE], "readwrite");
    const refStore = tx.objectStore(REF_STORE);
    const assetStore = tx.objectStore(ASSET_STORE);
    for (const ref of refs) refStore.delete(ref.refId);
    for (const asset of assets) assetStore.delete(asset.assetId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  for (const asset of assets) dataUrlMemory.delete(asset.assetId);
}

export async function clearMediaVaultV2All(): Promise<void> {
  try {
    const db = await openDb();
    db.close();
  } catch {}
  dbPromise = null;
  dataUrlMemory.clear();
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function linkMediaVaultV2Remote(
  mediaKeyInput: string,
  patch: { ownerUserId?: string | null; remoteAssetId?: string | null; remoteObjectKey?: string | null; publicUrl?: string | null },
): Promise<boolean> {
  const ref = await getRef(mediaKeyInput, patch.ownerUserId);
  if (!ref?.assetId) return false;
  const asset = await getAsset(ref.assetId);
  if (!asset) return false;
  const next: MediaVaultV2Asset = {
    ...asset,
    remoteAssetId: cleanString(patch.remoteAssetId || asset.remoteAssetId) || null,
    remoteObjectKey: cleanString(patch.remoteObjectKey || asset.remoteObjectKey) || null,
    publicUrl: cleanString(patch.publicUrl || asset.publicUrl) || null,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE, "readwrite");
    tx.objectStore(ASSET_STORE).put(next);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return true;
}
