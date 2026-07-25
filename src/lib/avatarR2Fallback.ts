import { buildApiUrl } from "./apiClient";
import { getAvatarCache, setAvatarCache } from "./avatarCache";
import { sanitizeAvatarDataUrl } from "./avatarSafe";
import { downloadCloudObject, listCloudVaultBackups } from "./cloudStorageApi";
import { downloadDirectR2AvatarFallback, uploadDirectR2AvatarFallback } from "./directR2BackupApi";

export type AvatarFallbackItem = {
  profileId: string;
  dataUrl: string;
  avatarUpdatedAt?: number | null;
  avatarAssetId?: string | null;
  sourceUrl?: string | null;
};

export type AvatarFallbackSnapshot = {
  _v: 1;
  createdAt: string;
  profiles: Record<string, AvatarFallbackItem>;
};

const THUMB_EDGE = 192;
const THUMB_MAX_CHARS = 120_000;
const REMOTE_FETCH_TIMEOUT_MS = 2_500;
const R2_LOAD_COOLDOWN_MS = 15_000;

let r2HydrationPromise: Promise<void> | null = null;
let r2HydratedAt = 0;
let r2HydrationAttempted = false;
const directR2AvatarPending = new Map<string, Promise<string>>();
const directR2AvatarMissAt = new Map<string, number>();

function asString(value: any): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickCachedDataUrl(profileId: string): string {
  const cached: any = getAvatarCache(String(profileId || ""));
  return sanitizeAvatarDataUrl(
    cached?.avatarThumbDataUrl ||
      cached?.avatarDataUrl ||
      cached?.avatarFullDataUrl ||
      cached?.avatarCastDataUrl ||
      null,
    THUMB_MAX_CHARS,
  ) || "";
}

function profileDataUrl(profile: any): string {
  return sanitizeAvatarDataUrl(
    profile?.avatarThumbDataUrl ||
      profile?.avatarDataUrl ||
      profile?.avatarFullDataUrl ||
      profile?.avatarCastDataUrl ||
      profile?.photoDataUrl ||
      (typeof profile?.avatar === "string" && profile.avatar.startsWith("data:image/") ? profile.avatar : null),
    380_000,
  ) || "";
}

function profileRemoteUrl(profile: any): string {
  const raw = asString(
    profile?.avatarUrl ||
      (typeof profile?.avatar === "string" && !profile.avatar.startsWith("data:") ? profile.avatar : "") ||
      profile?.photoUrl ||
      profile?.avatarPath,
  );
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/media/")) {
    try { return buildApiUrl(raw); } catch { return raw; }
  }
  if (raw.startsWith("/")) {
    try { return new URL(raw, window.location.origin).toString(); } catch { return raw; }
  }
  return raw;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const match = String(dataUrl || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    const mime = match[1] || "image/png";
    const encoded = match[3] || "";
    const binary = match[2] ? atob(encoded) : decodeURIComponent(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

async function fetchBlobWithTimeout(src: string): Promise<Blob | null> {
  const value = asString(src);
  if (!value) return null;
  if (value.startsWith("data:image/")) return dataUrlToBlob(value);
  if (value.startsWith("blob:")) {
    try { return await fetch(value).then((r) => (r.ok ? r.blob() : null)); } catch { return null; }
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(value, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.type.startsWith("image/") ? blob : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function blobToCompactAvatar(blob: Blob): Promise<string> {
  if (typeof document === "undefined") return "";
  let bitmap: ImageBitmap | null = null;
  let objectUrl = "";
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(blob);
    }

    let width = bitmap?.width || 0;
    let height = bitmap?.height || 0;
    let drawSource: CanvasImageSource = bitmap as any;

    if (!bitmap) {
      objectUrl = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const node = new Image();
        node.onload = () => resolve(node);
        node.onerror = () => reject(new Error("avatar_decode_failed"));
        node.src = objectUrl;
      });
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      drawSource = img;
    }

    if (!width || !height) return "";
    const scale = Math.min(1, THUMB_EDGE / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return "";
    ctx.drawImage(drawSource, 0, 0, targetW, targetH);

    const candidates = [
      canvas.toDataURL("image/webp", 0.76),
      canvas.toDataURL("image/jpeg", 0.76),
      canvas.toDataURL("image/jpeg", 0.62),
    ];
    for (const candidate of candidates) {
      const safe = sanitizeAvatarDataUrl(candidate, THUMB_MAX_CHARS);
      if (safe) return safe;
    }
    return "";
  } catch {
    return "";
  } finally {
    try { bitmap?.close?.(); } catch {}
    if (objectUrl) {
      try { URL.revokeObjectURL(objectUrl); } catch {}
    }
  }
}

async function compactAvatarSource(src: string): Promise<string> {
  const safeInline = sanitizeAvatarDataUrl(src, THUMB_MAX_CHARS);
  if (safeInline) return safeInline;
  const blob = await fetchBlobWithTimeout(src);
  if (!blob) return "";
  return blobToCompactAvatar(blob);
}

async function buildOneFallback(profile: any): Promise<AvatarFallbackItem | null> {
  const profileId = asString(profile?.id || profile?.profileId || profile?.playerId);
  if (!profileId) return null;

  const cached = pickCachedDataUrl(profileId);
  const inline = profileDataUrl(profile);
  const remote = profileRemoteUrl(profile);
  const chosen = cached || inline || remote;
  if (!chosen) return null;

  const dataUrl = await compactAvatarSource(chosen);
  if (!dataUrl) return null;

  const avatarUpdatedAt = Number(profile?.avatarUpdatedAt || getAvatarCache(profileId)?.avatarUpdatedAt || Date.now()) || Date.now();
  const avatarAssetId = asString(
    profile?.avatarAssetId ||
      profile?.avatarFullAssetId ||
      profile?.avatarThumbAssetId ||
      getAvatarCache(profileId)?.avatarAssetId ||
      getAvatarCache(profileId)?.avatarFullAssetId ||
      getAvatarCache(profileId)?.avatarThumbAssetId,
  ) || null;

  setAvatarCache({
    profileId,
    avatarThumbDataUrl: dataUrl,
    avatarDataUrl: dataUrl,
    avatarUrl: remote || getAvatarCache(profileId)?.avatarUrl || null,
    avatarUpdatedAt,
    avatarAssetId,
  });

  return {
    profileId,
    dataUrl,
    avatarUpdatedAt,
    avatarAssetId,
    sourceUrl: remote || null,
  };
}

/**
 * Réplique immédiatement un avatar vers un objet privé R2 dédié. Cette copie
 * est volontairement compacte : elle sert uniquement de secours visuel quand
 * l'URL média du NAS ne répond plus.
 */
export async function mirrorAvatarFallbackToR2(
  profileIdInput: string,
  sourceInput: string,
  meta: { avatarUpdatedAt?: number | null; avatarAssetId?: string | null } = {},
): Promise<boolean> {
  const profileId = asString(profileIdInput);
  const source = asString(sourceInput);
  if (!profileId || !source) return false;

  const dataUrl = await compactAvatarSource(source);
  if (!dataUrl) return false;

  const avatarUpdatedAt = Number(meta.avatarUpdatedAt || Date.now()) || Date.now();
  const avatarAssetId = asString(meta.avatarAssetId) || null;
  setAvatarCache({
    profileId,
    avatarThumbDataUrl: dataUrl,
    avatarDataUrl: dataUrl,
    avatarUpdatedAt,
    avatarAssetId,
  });

  await uploadDirectR2AvatarFallback({ profileId, dataUrl, avatarUpdatedAt, avatarAssetId });
  directR2AvatarMissAt.delete(profileId);
  return true;
}

async function hydrateOneAvatarFromDirectR2(profileIdInput: string): Promise<string> {
  const profileId = asString(profileIdInput);
  if (!profileId) return "";

  const cached = pickCachedDataUrl(profileId);
  if (cached) return cached;

  const lastMiss = Number(directR2AvatarMissAt.get(profileId) || 0);
  if (lastMiss && Date.now() - lastMiss < R2_LOAD_COOLDOWN_MS) return "";

  const existing = directR2AvatarPending.get(profileId);
  if (existing) return existing;

  const task = (async () => {
    try {
      const avatar = await downloadDirectR2AvatarFallback(profileId);
      const dataUrl = sanitizeAvatarDataUrl(avatar?.dataUrl || null, THUMB_MAX_CHARS) || "";
      if (!dataUrl) {
        directR2AvatarMissAt.set(profileId, Date.now());
        return "";
      }
      setAvatarCache({
        profileId,
        avatarDataUrl: dataUrl,
        avatarThumbDataUrl: dataUrl,
        avatarUpdatedAt: Number(avatar?.avatarUpdatedAt || Date.now()) || Date.now(),
        avatarAssetId: asString(avatar?.avatarAssetId) || null,
      });
      directR2AvatarMissAt.delete(profileId);
      return dataUrl;
    } catch {
      directR2AvatarMissAt.set(profileId, Date.now());
      return "";
    } finally {
      directR2AvatarPending.delete(profileId);
    }
  })();

  directR2AvatarPending.set(profileId, task);
  return task;
}

/**
 * Construit le bloc compact d'avatars embarqué dans chaque snapshot R2.
 * Les images sont réduites en 192px afin de garder un backup léger même avec
 * plusieurs dizaines de profils.
 */
export async function buildAvatarFallbackSnapshot(profiles: any[]): Promise<AvatarFallbackSnapshot> {
  const rows = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
  const results = await Promise.allSettled(rows.map((profile) => buildOneFallback(profile)));
  const mapped: Record<string, AvatarFallbackItem> = {};
  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value?.profileId || !result.value?.dataUrl) continue;
    mapped[result.value.profileId] = result.value;
  }
  return { _v: 1, createdAt: new Date().toISOString(), profiles: mapped };
}

export function importAvatarFallbackSnapshot(snapshot: any): number {
  try {
    const block = snapshot?.avatarFallbacks || snapshot?.avatar_fallbacks || snapshot;
    const rows = block?.profiles && typeof block.profiles === "object" ? block.profiles : {};
    let count = 0;
    for (const [profileIdRaw, raw] of Object.entries<any>(rows)) {
      const profileId = asString(raw?.profileId || profileIdRaw);
      const dataUrl = sanitizeAvatarDataUrl(raw?.dataUrl || raw?.avatarDataUrl || raw?.avatarThumbDataUrl || null, THUMB_MAX_CHARS);
      if (!profileId || !dataUrl) continue;
      setAvatarCache({
        profileId,
        avatarDataUrl: dataUrl,
        avatarThumbDataUrl: dataUrl,
        avatarUpdatedAt: Number(raw?.avatarUpdatedAt || Date.now()) || Date.now(),
        avatarAssetId: asString(raw?.avatarAssetId) || null,
        avatarUrl: asString(raw?.sourceUrl) || null,
      });
      count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

function unwrapSnapshot(input: any): any {
  if (input?.payload && typeof input.payload === "object") return input.payload;
  if (input?.data?.payload && typeof input.data.payload === "object") return input.data.payload;
  if (input?.snapshot && typeof input.snapshot === "object") return input.snapshot;
  return input;
}

function tryImportLegacyAvatarCacheFromSnapshot(snapshot: any): number {
  try {
    const root = unwrapSnapshot(snapshot);
    const localStorageDump = root?.localStorage && typeof root.localStorage === "object" ? root.localStorage : {};
    const raw = localStorageDump?.dc_avatar_cache_v1;
    if (!raw) return 0;
    let parsed: any = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch { return 0; }
    }
    if (!parsed || typeof parsed !== "object") return 0;
    let count = 0;
    for (const [profileId, entry] of Object.entries<any>(parsed)) {
      const dataUrl = sanitizeAvatarDataUrl(
        entry?.avatarThumbDataUrl || entry?.avatarDataUrl || entry?.avatarFullDataUrl || entry?.avatarCastDataUrl || null,
        THUMB_MAX_CHARS,
      );
      if (!dataUrl) continue;
      setAvatarCache({
        profileId: String(profileId),
        avatarDataUrl: dataUrl,
        avatarThumbDataUrl: dataUrl,
        avatarUpdatedAt: Number(entry?.avatarUpdatedAt || Date.now()),
        avatarAssetId: asString(entry?.avatarAssetId) || null,
        avatarUrl: asString(entry?.avatarUrl) || null,
      });
      count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

async function hydrateAvatarCacheFromLatestR2(): Promise<void> {
  const now = Date.now();
  if (r2HydrationPromise) return r2HydrationPromise;
  if (r2HydrationAttempted && now - r2HydratedAt < R2_LOAD_COOLDOWN_MS) return;

  r2HydrationAttempted = true;
  r2HydratedAt = now;
  r2HydrationPromise = (async () => {
    try {
      const backups = await listCloudVaultBackups(2, false);
      for (const backup of backups || []) {
        if (!backup?.id) continue;
        try {
          const downloaded: any = await downloadCloudObject(String(backup.id));
          const raw = downloaded?.content ?? downloaded?.text ?? downloaded;
          let parsed: any = raw;
          if (typeof raw === "string") {
            try { parsed = JSON.parse(raw); } catch { parsed = null; }
          }
          if (!parsed) continue;
          const snapshot = unwrapSnapshot(parsed);
          const count = importAvatarFallbackSnapshot(snapshot?.avatarFallbacks || snapshot?.avatar_fallbacks || null);
          const legacyCount = count > 0 ? 0 : tryImportLegacyAvatarCacheFromSnapshot(snapshot);
          if (count > 0 || legacyCount > 0) break;
        } catch {
          // Essaie la génération précédente si la plus récente est illisible.
        }
      }
    } catch {
      // Failover silencieux : l'UI garde l'initiale si R2 n'est pas joignable.
    } finally {
      r2HydrationPromise = null;
      r2HydratedAt = Date.now();
    }
  })();

  return r2HydrationPromise;
}

/**
 * Retourne d'abord le cache local. Si absent, hydrate UNE FOIS depuis la dernière
 * sauvegarde Cloudflare R2 puis relit le cache.
 */
export async function resolveAvatarFallback(profileId: string): Promise<string> {
  const id = asString(profileId);
  if (!id) return "";
  const local = pickCachedDataUrl(id);
  if (local) return local;

  // 1) Objet avatar R2 dédié : très petit, très rapide, totalement indépendant
  // du NAS et disponible immédiatement après une modification d'avatar.
  const direct = await hydrateOneAvatarFromDirectR2(id);
  if (direct) return direct;

  // 2) Compatibilité/ceinture de sécurité : tente le dernier snapshot R2 complet.
  await hydrateAvatarCacheFromLatestR2();
  return pickCachedDataUrl(id);
}
