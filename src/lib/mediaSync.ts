import { onlineApi } from "./onlineApi";
import { setAvatarCache } from "./avatarCache";

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

export function collectStoreMediaAssetIds(store: any): string[] {
  const ids = new Set<string>();

  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  for (const p of profiles) {
    pushIfString(ids, p?.avatarAssetId);
    pushIfString(ids, p?.avatarThumbAssetId);
    pushIfString(ids, p?.avatarFullAssetId);
    pushIfString(ids, p?.avatarCastAssetId);
  }

  const bots = Array.isArray(store?.bots) ? store.bots : [];
  for (const b of bots) {
    pushIfString(ids, b?.avatarAssetId);
    pushIfString(ids, b?.avatarThumbAssetId);
    pushIfString(ids, b?.avatarFullAssetId);
    pushIfString(ids, b?.avatarCastAssetId);
  }

  const dartSets = Array.isArray(store?.dartSets) ? store.dartSets : [];
  for (const ds of dartSets) {
    pushIfString(ids, ds?.mainImageAssetId);
    pushIfString(ids, ds?.thumbImageAssetId);
    pushIfString(ids, ds?.photoAssetId);
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
  const dataUrl = profile?.avatarDataUrl || profile?.avatar;
  if (!isDataImageUrl(dataUrl)) return profile;
  try {
    const uploaded: any = await onlineApi.uploadMediaAsset({
      dataUrl,
      kind: "local_profile_avatar",
      ownerId: String(profile?.id || ""),
      variant: "full",
    } as any);
    const publicUrl = asString(uploaded?.publicUrl || uploaded?.avatarUrl || uploaded?.path);
    const assetId = uploaded?.assetId || uploaded?.id || profile?.avatarAssetId || null;
    const next = {
      ...(profile || {}),
      avatarUrl: publicUrl || profile?.avatarUrl || null,
      avatar: publicUrl || profile?.avatar || null,
      avatarAssetId: assetId,
      avatarThumbAssetId: uploaded?.avatarThumbAssetId || assetId || profile?.avatarThumbAssetId || null,
      avatarFullAssetId: uploaded?.avatarFullAssetId || assetId || profile?.avatarFullAssetId || null,
      avatarCastAssetId: uploaded?.avatarCastAssetId || assetId || profile?.avatarCastAssetId || null,
      avatarUpdatedAt: uploaded?.avatarUpdatedAt || Date.now(),
      avatarDataUrl: profile?.avatarDataUrl || null,
    };
    try {
      setAvatarCache({
        profileId: String(next.id || ""),
        avatarDataUrl: next.avatarDataUrl || null,
        avatarUrl: next.avatarUrl || null,
        avatarUpdatedAt: Number(next.avatarUpdatedAt || Date.now()),
        avatarAssetId: next.avatarAssetId || null,
        avatarThumbAssetId: next.avatarThumbAssetId || null,
        avatarFullAssetId: next.avatarFullAssetId || null,
        avatarCastAssetId: next.avatarCastAssetId || null,
      } as any);
    } catch {}
    return next;
  } catch (err) {
    console.error("[mediaSync] uploadProfileAvatar failed", err);
    throw err;
  }
}

async function uploadBotAvatar(bot: any) {
  const dataUrl = bot?.avatarDataUrl || bot?.avatar;
  if (!isDataImageUrl(dataUrl)) return bot;
  try {
    const uploaded: any = await onlineApi.uploadMediaAsset({
      dataUrl,
      kind: "bot_avatar",
      ownerId: String(bot?.id || ""),
      variant: "full",
    } as any);
    const publicUrl = asString(uploaded?.publicUrl || uploaded?.path);
    return {
      ...(bot || {}),
      avatarUrl: publicUrl || bot?.avatarUrl || null,
      avatar: publicUrl || bot?.avatar || null,
      avatarAssetId: uploaded?.assetId || uploaded?.id || bot?.avatarAssetId || null,
      avatarThumbAssetId: uploaded?.assetId || uploaded?.id || bot?.avatarThumbAssetId || null,
      avatarFullAssetId: uploaded?.assetId || uploaded?.id || bot?.avatarFullAssetId || null,
      avatarCastAssetId: uploaded?.assetId || uploaded?.id || bot?.avatarCastAssetId || null,
      avatarUpdatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[mediaSync] uploadBotAvatar failed", err);
    throw err;
  }
}

async function uploadDartSetMedia(ds: any) {
  let changed = false;
  let next = { ...(ds || {}) };

  const mainImage = next?.mainImageUrl;
  if (isDataImageUrl(mainImage)) {
    try {
      const uploaded: any = await onlineApi.uploadMediaAsset({
        dataUrl: mainImage,
        kind: "dartset_photo",
        ownerId: String(ds?.id || ""),
        variant: "main",
      } as any);
      const publicUrl = asString(uploaded?.publicUrl || uploaded?.path);
      next.mainImageAssetId = uploaded?.assetId || uploaded?.id || next.mainImageAssetId || null;
      next.photoAssetId = uploaded?.assetId || uploaded?.id || next.photoAssetId || null;
      if (publicUrl) next.mainImageUrl = publicUrl;
      changed = true;
    } catch (err) {
      console.error("[mediaSync] uploadDartSetMedia main failed", err);
      throw err;
    }
  }

  const thumbImage = next?.thumbImageUrl;
  if (isDataImageUrl(thumbImage)) {
    try {
      const uploaded: any = await onlineApi.uploadMediaAsset({
        dataUrl: thumbImage,
        kind: "dartset_photo",
        ownerId: String(ds?.id || ""),
        variant: "thumb",
      } as any);
      const publicUrl = asString(uploaded?.publicUrl || uploaded?.path);
      next.thumbImageAssetId = uploaded?.assetId || uploaded?.id || next.thumbImageAssetId || null;
      if (publicUrl) next.thumbImageUrl = publicUrl;
      changed = true;
    } catch (err) {
      console.error("[mediaSync] uploadDartSetMedia thumb failed", err);
      throw err;
    }
  }

  return changed ? next : ds;
}

export async function uploadStoreMediaAssets(store: any): Promise<any> {
  const next: any = { ...(store || {}) };
  if (Array.isArray(next.profiles)) {
    next.profiles = await Promise.all(next.profiles.map((p: any) => uploadProfileAvatar(p)));
  }
  if (Array.isArray(next.bots)) {
    next.bots = await Promise.all(next.bots.map((b: any) => uploadBotAvatar(b)));
  }
  if (Array.isArray(next.dartSets)) {
    next.dartSets = await Promise.all(next.dartSets.map((ds: any) => uploadDartSetMedia(ds)));
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

  if (Array.isArray(next.profiles)) {
    next.profiles = next.profiles.map((p: any) => {
      const out = { ...(p || {}) };
      const assetId = asString(out.avatarAssetId || out.avatarFullAssetId || out.avatarThumbAssetId || out.avatarCastAssetId);
      const url = assetId ? urls[assetId] : "";
      if (url && out.avatarUrl !== url) {
        out.avatarUrl = url;
        out.avatar = url;
        changed = true;
      }
      if (url) {
        try {
          setAvatarCache({
            profileId: String(out.id || ""),
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
  }

  if (Array.isArray(next.bots)) {
    next.bots = next.bots.map((b: any) => {
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
  }

  if (Array.isArray(next.dartSets)) {
    next.dartSets = next.dartSets.map((ds: any) => {
      const out = { ...(ds || {}) };
      const mainId = asString(out.mainImageAssetId || out.photoAssetId);
      const thumbId = asString(out.thumbImageAssetId || out.mainImageAssetId || out.photoAssetId);
      const mainUrl = mainId ? urls[mainId] : "";
      const thumbUrl = thumbId ? urls[thumbId] : "";
      if (mainUrl && out.mainImageUrl !== mainUrl) {
        out.mainImageUrl = mainUrl;
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
