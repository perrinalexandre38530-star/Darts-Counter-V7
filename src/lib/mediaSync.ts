import { nasBulkResolveMediaAssets, nasUploadMediaAsset, type NasMediaAsset } from "./nasApi";

export type MediaVariantMap = {
  thumb?: string | null;
  full?: string | null;
  cast?: string | null;
};

export type UploadedAvatarRefs = {
  avatarAssetId: string | null;
  avatarThumbAssetId: string | null;
  avatarFullAssetId: string | null;
  avatarCastAssetId: string | null;
  avatarUpdatedAt: string;
  avatarVersionBump: number;
};

function cleanDataUrl(value: unknown): string | null {
  const raw = String(value || "").trim();
  return raw.startsWith("data:image/") ? raw : null;
}

export async function uploadAvatarVariantsToNas(opts: {
  ownerId: string;
  kind: "local_profile_avatar" | "bot_avatar" | "dartset_photo" | "profile_avatar";
  variants: MediaVariantMap;
}): Promise<UploadedAvatarRefs> {
  const thumb = cleanDataUrl(opts.variants.thumb);
  const full = cleanDataUrl(opts.variants.full) || thumb;
  const cast = cleanDataUrl(opts.variants.cast) || full || thumb;
  const main = full || thumb || cast;

  if (!main) {
    throw new Error("Aucune image avatar valide à envoyer.");
  }

  const uploadedMain = await nasUploadMediaAsset({
    dataUrl: main,
    kind: opts.kind,
    ownerId: opts.ownerId,
    variant: "main",
  });

  const uploadedThumb = thumb
    ? await nasUploadMediaAsset({
        dataUrl: thumb,
        kind: opts.kind,
        ownerId: opts.ownerId,
        variant: "thumb",
      })
    : null;

  const uploadedFull = full
    ? await nasUploadMediaAsset({
        dataUrl: full,
        kind: opts.kind,
        ownerId: opts.ownerId,
        variant: "full",
      })
    : null;

  const uploadedCast = cast
    ? await nasUploadMediaAsset({
        dataUrl: cast,
        kind: opts.kind,
        ownerId: opts.ownerId,
        variant: "cast",
      })
    : null;

  return {
    avatarAssetId: uploadedMain.id || null,
    avatarThumbAssetId: uploadedThumb?.id || null,
    avatarFullAssetId: uploadedFull?.id || uploadedMain.id || null,
    avatarCastAssetId: uploadedCast?.id || uploadedFull?.id || uploadedMain.id || null,
    avatarUpdatedAt: new Date().toISOString(),
    avatarVersionBump: 1,
  };
}

export async function resolveMediaAssetMap(ids: Array<string | null | undefined>): Promise<Record<string, NasMediaAsset>> {
  const cleanIds = Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)));
  if (!cleanIds.length) return {};
  const assets = await nasBulkResolveMediaAssets(cleanIds);
  return assets.reduce<Record<string, NasMediaAsset>>((acc, asset) => {
    if (asset?.id) acc[String(asset.id)] = asset;
    return acc;
  }, {});
}

export function pickBestMediaUrl(assetMap: Record<string, NasMediaAsset>, refs: {
  avatarThumbAssetId?: string | null;
  avatarFullAssetId?: string | null;
  avatarCastAssetId?: string | null;
  avatarAssetId?: string | null;
}): string {
  const candidates = [
    refs.avatarThumbAssetId,
    refs.avatarFullAssetId,
    refs.avatarCastAssetId,
    refs.avatarAssetId,
  ];
  for (const id of candidates) {
    const key = String(id || "").trim();
    if (!key) continue;
    const asset = assetMap[key];
    const url = String(asset?.publicUrl || asset?.path || "").trim();
    if (url) return url;
  }
  return "";
}
