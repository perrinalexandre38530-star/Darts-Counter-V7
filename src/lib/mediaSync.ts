import { onlineApi } from "./onlineApi";
import { setAvatarCache } from "./avatarCache";

function asString(value: any): string {
  return typeof value === "string" ? value.trim() : "";
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
