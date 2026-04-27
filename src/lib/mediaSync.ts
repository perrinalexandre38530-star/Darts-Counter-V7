import { onlineApi } from "./onlineApi";
import { getAvatarCache, setAvatarCache } from "./avatarCache";

let lastMediaSyncSummary: any = null;

function resetMediaSyncSummary() {
  lastMediaSyncSummary = {
    profilesScanned: 0,
    botsScanned: 0,
    dartSetsScanned: 0,
    avatarsUploaded: 0,
    avatarsAlreadyPresent: 0,
    avatarsAlreadyLinked: 0,
    avatarsMissing: 0,
    mediaUploaded: 0,
    mediaAlreadyPresent: 0,
    uploadErrors: 0,
    base64FieldsRemoved: 0,
    startedAt: Date.now(),
    finishedAt: null,
    durationMs: 0,
  };
}

function bumpMediaSyncSummary(key: string, amount = 1) {
  if (!lastMediaSyncSummary) return;
  lastMediaSyncSummary[key] = Number(lastMediaSyncSummary[key] || 0) + amount;
}

export function getLastMediaSyncSummary(): any {
  return lastMediaSyncSummary ? { ...lastMediaSyncSummary } : null;
}

function asString(value: any): string {
  return typeof value === "string" ? value.trim() : "";
}

function isDataImageUrl(value: any): boolean {
  return typeof value === "string" && value.startsWith("data:image/");
}

function pickPublicUrl(row: any): string | null {
  const v = row?.publicUrl || row?.url || row?.avatarUrl || row?.path || null;
  return typeof v === "string" && v.trim() ? String(v) : null;
}

function pushIfString(set: Set<string>, value: any) {
  const v = asString(value);
  if (v) set.add(v);
}

function pickFirstDataImage(...values: any[]): string {
  for (const value of values) {
    if (isDataImageUrl(value)) return String(value);
  }
  return "";
}

function stripDataImageFields<T extends Record<string, any>>(obj: T, keys: string[]): T {
  const out: any = { ...(obj || {}) };
  for (const key of keys) {
    if (typeof out[key] === "string" && out[key].startsWith("data:image/")) {
      delete out[key];
      bumpMediaSyncSummary("base64FieldsRemoved");
    }
  }
  return out;
}

function base64ToBytes(base64: string): Uint8Array {
  const clean = String(base64 || "").replace(/\s+/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256DataUrl(dataUrl: string): Promise<string> {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma < 0 || !dataUrl.slice(0, comma).includes(";base64")) return "";
    const bytes = base64ToBytes(dataUrl.slice(comma + 1));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

function sameUploadedImage(localHash: string, ...known: any[]): boolean {
  if (!localHash) return false;
  return known.some((v) => asString(v).toLowerCase() === localHash.toLowerCase());
}

function pickProfileCachedAvatar(profile: any) {
  try {
    const id = asString(profile?.id);
    return id ? getAvatarCache(id) : null;
  } catch {
    return null;
  }
}

function normalizeUploadedAssetId(uploaded: any, fallback: any): string | null {
  return asString(uploaded?.assetId || uploaded?.id || fallback) || null;
}

function normalizeUploadedPublicUrl(uploaded: any): string | null {
  return asString(uploaded?.publicUrl || uploaded?.avatarUrl || uploaded?.url || uploaded?.path) || null;
}

export function collectStoreMediaAssetIds(store: any): string[] {
  const ids = new Set<string>();

  const profiles = [
    ...(Array.isArray(store?.profiles) ? store.profiles : []),
    ...(Array.isArray(store?.localProfiles) ? store.localProfiles : []),
    ...(Array.isArray(store?.players) ? store.players : []),
  ];
  for (const p of profiles) {
    pushIfString(ids, p?.avatarAssetId);
    pushIfString(ids, p?.avatarThumbAssetId);
    pushIfString(ids, p?.avatarFullAssetId);
    pushIfString(ids, p?.avatarCastAssetId);
  }

  const botLists = [
    Array.isArray(store?.bots) ? store.bots : [],
    Array.isArray(store?.cpuBots) ? store.cpuBots : [],
    Array.isArray(store?.botPlayers) ? store.botPlayers : [],
  ];
  for (const bots of botLists) {
    for (const b of bots) {
      pushIfString(ids, b?.avatarAssetId);
      pushIfString(ids, b?.avatarThumbAssetId);
      pushIfString(ids, b?.avatarFullAssetId);
      pushIfString(ids, b?.avatarCastAssetId);
    }
  }

  const dartSets = Array.isArray(store?.dartSets) ? store.dartSets : [];
  for (const ds of dartSets) {
    pushIfString(ids, ds?.mainImageAssetId);
    pushIfString(ids, ds?.thumbImageAssetId);
    pushIfString(ids, ds?.photoAssetId);
    pushIfString(ids, ds?.imageAssetId);
    pushIfString(ids, ds?.photoThumbAssetId);
    pushIfString(ids, ds?.dartSetImageAssetId);
  }

  return Array.from(ids);
}

export async function resolveAssetPublicUrls(ids: string[]): Promise<Record<string, string>> {
  const cleanIds = (Array.isArray(ids) ? ids : []).map((v) => String(v || "").trim()).filter(Boolean);
  if (!cleanIds.length) return {};
  try {
    const assets = await onlineApi.bulkResolveMediaAssets(cleanIds as any);
    const out: Record<string, string> = {};
    for (const row of Array.isArray(assets) ? assets : []) {
      const id = asString((row as any)?.id || (row as any)?.assetId);
      const url = pickPublicUrl(row);
      if (id && url) out[id] = url;
    }
    return out;
  } catch (err) {
    console.warn("[mediaSync] resolveAssetPublicUrls failed", err);
    return {};
  }
}

async function uploadProfileAvatar(profile: any) {
  bumpMediaSyncSummary("profilesScanned");
  const cached = pickProfileCachedAvatar(profile);

  const dataUrl = pickFirstDataImage(
    profile?.avatarDataUrl,
    profile?.avatarFullDataUrl,
    profile?.avatarCastDataUrl,
    profile?.avatarThumbDataUrl,
    profile?.avatar,
    profile?.avatarUrl,
    cached?.avatarFullDataUrl,
    cached?.avatarCastDataUrl,
    cached?.avatarDataUrl,
    cached?.avatarThumbDataUrl
  );

  const existingAssetId = asString(
    profile?.avatarAssetId ||
    profile?.avatarFullAssetId ||
    profile?.avatarThumbAssetId ||
    profile?.avatarCastAssetId ||
    cached?.avatarAssetId ||
    cached?.avatarFullAssetId ||
    cached?.avatarThumbAssetId ||
    cached?.avatarCastAssetId
  );
  const existingUrl = asString(profile?.avatarUrl || profile?.avatar || cached?.avatarUrl);
  const knownHash = asString(profile?.avatarSha256 || profile?.avatarHash || cached?.avatarSha256 || cached?.avatarHash);

  const stripProfileData = (base: any) => {
    const out = stripDataImageFields(base || {}, [
      "avatarDataUrl",
      "avatarFullDataUrl",
      "avatarCastDataUrl",
      "avatarThumbDataUrl",
      "photoDataUrl",
      "imageDataUrl",
    ]);
    if (typeof out.avatar === "string" && out.avatar.startsWith("data:image/")) delete out.avatar;
    if (typeof out.avatarUrl === "string" && out.avatarUrl.startsWith("data:image/")) delete out.avatarUrl;
    return out;
  };

  if (!dataUrl) {
    if (existingAssetId || existingUrl) {
      bumpMediaSyncSummary("avatarsAlreadyLinked");
      return stripProfileData({
        ...(profile || {}),
        avatarUrl: existingUrl || profile?.avatarUrl || null,
        avatar: existingUrl || profile?.avatar || null,
        avatarAssetId: existingAssetId || profile?.avatarAssetId || null,
        avatarThumbAssetId: asString(profile?.avatarThumbAssetId || cached?.avatarThumbAssetId || existingAssetId) || null,
        avatarFullAssetId: asString(profile?.avatarFullAssetId || cached?.avatarFullAssetId || existingAssetId) || null,
        avatarCastAssetId: asString(profile?.avatarCastAssetId || cached?.avatarCastAssetId || existingAssetId) || null,
        avatarSha256: knownHash || profile?.avatarSha256 || null,
      });
    }
    bumpMediaSyncSummary("avatarsMissing");
    return stripProfileData(profile || {});
  }

  const localHash = await sha256DataUrl(dataUrl);
  if (existingAssetId && existingUrl && sameUploadedImage(localHash, knownHash, profile?.avatarSha256, cached?.avatarSha256)) {
    bumpMediaSyncSummary("avatarsAlreadyLinked");
    return stripProfileData({
      ...(profile || {}),
      avatarUrl: existingUrl,
      avatar: existingUrl,
      avatarAssetId: existingAssetId,
      avatarThumbAssetId: asString(profile?.avatarThumbAssetId || cached?.avatarThumbAssetId || existingAssetId) || null,
      avatarFullAssetId: asString(profile?.avatarFullAssetId || cached?.avatarFullAssetId || existingAssetId) || null,
      avatarCastAssetId: asString(profile?.avatarCastAssetId || cached?.avatarCastAssetId || existingAssetId) || null,
      avatarSha256: localHash || knownHash || null,
    });
  }

  try {
    const uploaded: any = await onlineApi.uploadMediaAsset({
      dataUrl,
      kind: "local_profile_avatar",
      ownerId: String(profile?.id || ""),
      variant: "full",
      sha256: localHash || undefined,
    } as any);
    if ((uploaded as any)?.deduped) bumpMediaSyncSummary("avatarsAlreadyPresent");
    else bumpMediaSyncSummary("avatarsUploaded");
    const publicUrl = normalizeUploadedPublicUrl(uploaded);
    const assetId = normalizeUploadedAssetId(uploaded, profile?.avatarAssetId || cached?.avatarAssetId);
    const uploadedHash = asString(uploaded?.sha256 || localHash || knownHash) || null;
    const updatedAt = Date.now();
    const next = stripProfileData({
      ...(profile || {}),
      avatarUrl: publicUrl || existingUrl || null,
      avatar: publicUrl || existingUrl || null,
      avatarAssetId: assetId,
      avatarThumbAssetId: normalizeUploadedAssetId(uploaded, profile?.avatarThumbAssetId || cached?.avatarThumbAssetId || assetId),
      avatarFullAssetId: normalizeUploadedAssetId(uploaded, profile?.avatarFullAssetId || cached?.avatarFullAssetId || assetId),
      avatarCastAssetId: normalizeUploadedAssetId(uploaded, profile?.avatarCastAssetId || cached?.avatarCastAssetId || assetId),
      avatarSha256: uploadedHash,
      avatarUpdatedAt: updatedAt,
    });

    try {
      setAvatarCache({
        profileId: String(next.id || ""),
        avatarDataUrl: null,
        avatarThumbDataUrl: null,
        avatarFullDataUrl: null,
        avatarCastDataUrl: null,
        avatarUrl: next.avatarUrl || null,
        avatarUpdatedAt: updatedAt,
        avatarAssetId: next.avatarAssetId || null,
        avatarThumbAssetId: next.avatarThumbAssetId || null,
        avatarFullAssetId: next.avatarFullAssetId || null,
        avatarCastAssetId: next.avatarCastAssetId || null,
        avatarSha256: uploadedHash,
      } as any);
    } catch {}
    return next;
  } catch (err) {
    bumpMediaSyncSummary("uploadErrors");
    console.error("[mediaSync] uploadProfileAvatar failed", err);
    throw err;
  }
}

async function uploadBotAvatar(bot: any) {
  bumpMediaSyncSummary("botsScanned");
  const dataUrl = pickFirstDataImage(bot?.avatarDataUrl, bot?.avatarUrl, bot?.avatar, bot?.photoDataUrl, bot?.imageDataUrl);
  const existingAssetId = asString(bot?.avatarAssetId || bot?.avatarFullAssetId || bot?.avatarThumbAssetId || bot?.avatarCastAssetId);
  const existingUrl = asString(bot?.avatarUrl || bot?.avatar);
  const knownHash = asString(bot?.avatarSha256 || bot?.avatarHash);
  const stripBotData = (base: any) => {
    const out = stripDataImageFields(base || {}, ["avatarDataUrl", "photoDataUrl", "imageDataUrl", "avatarFullDataUrl", "avatarCastDataUrl", "avatarThumbDataUrl"]);
    if (typeof out.avatar === "string" && out.avatar.startsWith("data:image/")) delete out.avatar;
    if (typeof out.avatarUrl === "string" && out.avatarUrl.startsWith("data:image/")) delete out.avatarUrl;
    return out;
  };
  if (!dataUrl) {
    if (existingAssetId || existingUrl) bumpMediaSyncSummary("avatarsAlreadyLinked");
    else bumpMediaSyncSummary("avatarsMissing");
    return stripBotData(bot || {});
  }
  const localHash = await sha256DataUrl(dataUrl);
  if (existingAssetId && existingUrl && sameUploadedImage(localHash, knownHash)) {
    bumpMediaSyncSummary("avatarsAlreadyLinked");
    return stripBotData({ ...(bot || {}), avatarUrl: existingUrl, avatar: existingUrl, avatarSha256: localHash || knownHash || null });
  }
  try {
    const uploaded: any = await onlineApi.uploadMediaAsset({
      dataUrl,
      kind: "bot_avatar",
      ownerId: String(bot?.id || ""),
      variant: "full",
      sha256: localHash || undefined,
    } as any);
    if ((uploaded as any)?.deduped) bumpMediaSyncSummary("avatarsAlreadyPresent");
    else bumpMediaSyncSummary("avatarsUploaded");
    const publicUrl = asString(uploaded?.publicUrl || uploaded?.url || uploaded?.path);
    const assetId = uploaded?.assetId || uploaded?.id || bot?.avatarAssetId || null;
    return stripBotData({
      ...(bot || {}),
      avatarUrl: publicUrl || bot?.avatarUrl || null,
      avatar: publicUrl || bot?.avatar || null,
      avatarAssetId: assetId,
      avatarThumbAssetId: assetId || bot?.avatarThumbAssetId || null,
      avatarFullAssetId: assetId || bot?.avatarFullAssetId || null,
      avatarCastAssetId: assetId || bot?.avatarCastAssetId || null,
      avatarSha256: asString(uploaded?.sha256 || localHash || knownHash) || null,
      avatarUpdatedAt: new Date().toISOString(),
    });
  } catch (err) {
    bumpMediaSyncSummary("uploadErrors");
    console.error("[mediaSync] uploadBotAvatar failed", err);
    throw err;
  }
}

async function uploadDartSetMedia(ds: any) {
  bumpMediaSyncSummary("dartSetsScanned");
  let changed = false;
  let next = { ...(ds || {}) };

  const mainImage = next?.photoDataUrl || next?.imageDataUrl || next?.mainImageDataUrl || next?.dartSetImageDataUrl || next?.mainImageUrl || next?.photoUrl || next?.imageUrl;
  if (isDataImageUrl(mainImage)) {
    try {
      const uploaded: any = await onlineApi.uploadMediaAsset({
        dataUrl: mainImage,
        kind: "dartset_photo",
        ownerId: String(ds?.id || ""),
        variant: "main",
      } as any);
      if ((uploaded as any)?.deduped) bumpMediaSyncSummary("mediaAlreadyPresent");
      else bumpMediaSyncSummary("mediaUploaded");
      const publicUrl = asString(uploaded?.publicUrl || uploaded?.path);
      next.mainImageAssetId = uploaded?.assetId || uploaded?.id || next.mainImageAssetId || null;
      next.photoAssetId = uploaded?.assetId || uploaded?.id || next.photoAssetId || null;
      next.imageAssetId = uploaded?.assetId || uploaded?.id || next.imageAssetId || null;
      if (publicUrl) {
        next.mainImageUrl = publicUrl;
        next.photoUrl = publicUrl;
        next.imageUrl = publicUrl;
      }
      changed = true;
    } catch (err) {
      bumpMediaSyncSummary("uploadErrors");
      console.error("[mediaSync] uploadDartSetMedia main failed", err);
      throw err;
    }
  }

  const thumbImage = next?.photoThumbDataUrl || next?.thumbDataUrl || next?.thumbImageDataUrl || next?.thumbImageUrl || next?.photoThumbUrl;
  if (isDataImageUrl(thumbImage)) {
    try {
      const uploaded: any = await onlineApi.uploadMediaAsset({
        dataUrl: thumbImage,
        kind: "dartset_photo",
        ownerId: String(ds?.id || ""),
        variant: "thumb",
      } as any);
      if ((uploaded as any)?.deduped) bumpMediaSyncSummary("mediaAlreadyPresent");
      else bumpMediaSyncSummary("mediaUploaded");
      const publicUrl = asString(uploaded?.publicUrl || uploaded?.path);
      next.thumbImageAssetId = uploaded?.assetId || uploaded?.id || next.thumbImageAssetId || null;
      next.photoThumbAssetId = uploaded?.assetId || uploaded?.id || next.photoThumbAssetId || null;
      if (publicUrl) {
        next.thumbImageUrl = publicUrl;
        next.photoThumbUrl = publicUrl;
      }
      changed = true;
    } catch (err) {
      bumpMediaSyncSummary("uploadErrors");
      console.error("[mediaSync] uploadDartSetMedia thumb failed", err);
      throw err;
    }
  }

  return changed ? next : ds;
}

async function mapSequential<T>(list: T[], fn: (item: T) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  for (const item of list) out.push(await fn(item));
  return out;
}

export async function uploadStoreMediaAssets(store: any): Promise<any> {
  resetMediaSyncSummary();
  const next: any = { ...(store || {}) };
  if (Array.isArray(next.profiles)) {
    next.profiles = await mapSequential(next.profiles, (p: any) => uploadProfileAvatar(p));
  }
  if (Array.isArray(next.localProfiles)) {
    next.localProfiles = await mapSequential(next.localProfiles, (p: any) => uploadProfileAvatar(p));
  }
  if (Array.isArray(next.players)) {
    next.players = await mapSequential(next.players, (p: any) => uploadProfileAvatar(p));
  }
  if (Array.isArray(next.bots)) {
    next.bots = await mapSequential(next.bots, (b: any) => uploadBotAvatar(b));
  }
  if (Array.isArray(next.cpuBots)) {
    next.cpuBots = await mapSequential(next.cpuBots, (b: any) => uploadBotAvatar(b));
  }
  if (Array.isArray(next.botPlayers)) {
    next.botPlayers = await mapSequential(next.botPlayers, (b: any) => uploadBotAvatar(b));
  }
  if (Array.isArray(next.dartSets)) {
    next.dartSets = await mapSequential(next.dartSets, (ds: any) => uploadDartSetMedia(ds));
  }
  if (lastMediaSyncSummary) {
    lastMediaSyncSummary.finishedAt = Date.now();
    lastMediaSyncSummary.durationMs = Math.max(0, Number(lastMediaSyncSummary.finishedAt || 0) - Number(lastMediaSyncSummary.startedAt || 0));
  }
  return next;
}

export async function hydrateStoreMediaUrls(store: any): Promise<any> {
  const ids = collectStoreMediaAssetIds(store);
  if (!ids.length) return store;
  const urls = await resolveAssetPublicUrls(ids);
  if (!Object.keys(urls).length) return store;

  let changed = false;
  const next: any = { ...(store || {}) };

  const hydrateProfileList = (list: any[]) => list.map((p: any) => {
      const out = { ...(p || {}) };
      const assetId = asString(out.avatarAssetId || out.avatarFullAssetId || out.avatarThumbAssetId || out.avatarCastAssetId);
      const url = assetId ? urls[assetId] : "";
      if (url) {
        if (out.avatarUrl !== url || out.avatar !== url || out.avatarDataUrl || out.avatarFullDataUrl || out.avatarCastDataUrl || out.avatarThumbDataUrl) {
          changed = true;
        }
        out.avatarUrl = url;
        out.avatar = url;
        delete out.avatarDataUrl;
        delete out.avatarFullDataUrl;
        delete out.avatarCastDataUrl;
        delete out.avatarThumbDataUrl;
        try {
          setAvatarCache({
            profileId: String(out.id || ""),
            avatarDataUrl: null,
            avatarThumbDataUrl: null,
            avatarFullDataUrl: null,
            avatarCastDataUrl: null,
            avatarUrl: url,
            avatarUpdatedAt: Number(out.avatarUpdatedAt || Date.now()),
            avatarAssetId: asString(out.avatarAssetId || null) || null,
            avatarThumbAssetId: asString(out.avatarThumbAssetId || null) || null,
            avatarFullAssetId: asString(out.avatarFullAssetId || null) || null,
            avatarCastAssetId: asString(out.avatarCastAssetId || null) || null,
          } as any);
        } catch {}
      }
      return out;
    });

  if (Array.isArray(next.profiles)) next.profiles = hydrateProfileList(next.profiles);
  if (Array.isArray(next.localProfiles)) next.localProfiles = hydrateProfileList(next.localProfiles);
  if (Array.isArray(next.players)) next.players = hydrateProfileList(next.players);

  const hydrateBotList = (list: any[]) => list.map((b: any) => {
    const out = { ...(b || {}) };
    const assetId = asString(out.avatarAssetId || out.avatarFullAssetId || out.avatarThumbAssetId || out.avatarCastAssetId);
    const url = assetId ? urls[assetId] : "";
    if (url) {
      if (out.avatarUrl !== url) changed = true;
      out.avatarUrl = url;
      out.avatar = url;
    }
    return out;
  });

  if (Array.isArray(next.bots)) next.bots = hydrateBotList(next.bots);
  if (Array.isArray(next.cpuBots)) next.cpuBots = hydrateBotList(next.cpuBots);
  if (Array.isArray(next.botPlayers)) next.botPlayers = hydrateBotList(next.botPlayers);

  if (Array.isArray(next.dartSets)) {
    next.dartSets = next.dartSets.map((ds: any) => {
      const out = { ...(ds || {}) };
      const mainId = asString(out.mainImageAssetId || out.photoAssetId || out.imageAssetId || out.dartSetImageAssetId);
      const thumbId = asString(out.thumbImageAssetId || out.photoThumbAssetId || out.mainImageAssetId || out.photoAssetId || out.imageAssetId);
      const mainUrl = mainId ? urls[mainId] : "";
      const thumbUrl = thumbId ? urls[thumbId] : "";
      if (mainUrl && out.mainImageUrl !== mainUrl) {
        out.mainImageUrl = mainUrl;
        out.photoUrl = mainUrl;
        out.imageUrl = mainUrl;
        changed = true;
      }
      if (thumbUrl && out.thumbImageUrl !== thumbUrl) {
        out.thumbImageUrl = thumbUrl;
        changed = true;
      }
      return out;
    });
  }

  return changed ? next : store;
}
