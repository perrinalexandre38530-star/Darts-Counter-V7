import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "./imageStorageCodec";
import { dartPresets } from "./dartPresets";
import { getNasApiUrl } from "./serverConfig";

// =============================================================
// src/lib/dartSetsStore.ts
// Gestion des jeux de fléchettes (DartSets)
// ✅ AUDIT FIX 2026-06
// - une seule source principale : dc_dart_sets_v1
// - les anciennes clés ne servent qu'à RECUPERER une image manquante, pas à réinjecter des sets supprimés
// - public = visible/sélectionnable par tous les profils
// - privé = visible/sélectionnable uniquement par son profil propriétaire / cible liée
// - dartsets ONLINE/profils liés = visibles uniquement pour linkedTargetLocalProfileId
// - dédoublonnage réel par portée + propriétaire + nom normalisé
// - conservation des alias d'anciens IDs pour les stats/historiques
// =============================================================

export type DartSetId = string;

export interface DartSet {
  id: DartSetId;
  profileId: string;
  name: string;
  brand?: string;
  weightGrams?: number;
  notes?: string;

  mainImageUrl: string;
  thumbImageUrl?: string;
  bgColor?: string;
  mainImageAssetId?: string | null;
  thumbImageAssetId?: string | null;
  photoAssetId?: string | null;

  photoDataUrl?: string;
  imageDataUrl?: string;
  mainImageDataUrl?: string;
  dartSetImageDataUrl?: string;
  photoThumbDataUrl?: string;
  thumbDataUrl?: string;
  thumbImageDataUrl?: string;

  kind?: "plain" | "preset" | "photo";
  presetId?: string;

  isFavorite?: boolean;
  usageCount?: number;
  lastUsedAt?: number;

  scope: "private" | "public";

  duplicateIds?: string[];
  aliasIds?: string[];
  linkedSourceDartSetId?: string | null;
  linkedRemoteDartSet?: boolean;
  linkedSourceProfileId?: string | null;
  linkedTargetLocalProfileId?: string | null;
  linkedOwnerUserId?: string | null;
  ownerUserId?: string | null;
  userId?: string | null;
  accountId?: string | null;

  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "dc_dart_sets_v1";
const LEGACY_DARTSET_STORAGE_KEYS = [
  "dc-dartsets-v1",
  "dc-dartSets-v1",
  "dc_lite_dartsets_v1",
  "dc-lite-dartsets-v1",
];

// Les photos de fléchettes sont déjà compressées dans DartSetsPanel.
// L'ancien seuil 350k supprimait des photos valides et créait les carrés 🎯.
const MAX_DARTSET_IMAGE_DATA_URL_CHARS = 2_500_000;

function s(value: any): string {
  return String(value ?? "").trim();
}

function n(value: any, fallback = 0): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : fallback;
}

function uniqStrings(values: any[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values || []) {
    const id = s(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeText(value: any): string {
  return s(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hashString(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function isDataImageUrl(value: any): boolean {
  return typeof value === "string" && value.trim().startsWith("data:image/");
}

function isImageUrlLike(value: any): boolean {
  const v = s(value);
  if (!v) return false;
  return (
    v.startsWith("data:image/") ||
    v.startsWith("blob:") ||
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("/media/") ||
    v.startsWith("/images/") ||
    v.startsWith("/assets/") ||
    /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(v)
  );
}

function nasBase(): string {
  try {
    return s(getNasApiUrl()).replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function normalizeRuntimeImageUrl(value: any): string {
  const v = s(value);
  if (!v) return "";
  if (v.startsWith("/media/")) {
    const base = nasBase();
    return base ? `${base}${v}` : v;
  }
  return v;
}

function mediaUrlFromAssetId(assetId: any): string {
  const id = s(assetId);
  if (!id) return "";
  if (isImageUrlLike(id)) return normalizeRuntimeImageUrl(id);
  const base = nasBase();
  const path = `/media/${encodeURIComponent(id)}`;
  return base ? `${base}${path}` : path;
}

function sanitizeDartSetImageUrl(value: any): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = normalizeRuntimeImageUrl(value.trim());
  if (!v) return undefined;
  // Ne plus supprimer brutalement les photos : si localStorage est trop plein,
  // saveAll() fera un fallback contrôlé, mais l'affichage runtime garde l'image.
  if (v.startsWith("data:image/") && v.length > MAX_DARTSET_IMAGE_DATA_URL_CHARS) return v;
  return v;
}

function pickImageLike(raw: any, ...keys: string[]): string {
  for (const key of keys) {
    const v = sanitizeDartSetImageUrl(raw?.[key]);
    if (v) return v;
  }
  return "";
}

function normalizeKind(value: any): "plain" | "preset" | "photo" | undefined {
  return value === "photo" || value === "preset" || value === "plain" ? value : undefined;
}

function readOwnerProfileId(raw: any): string {
  return s(raw?.profileId || raw?.profile_id || raw?.ownerProfileId || raw?.localProfileId || raw?.ownerId || raw?.userProfileId || "");
}

function isPublicOwnerProfileId(profileId: any): boolean {
  const id = normalizeText(profileId);
  return !id || ["global", "public", "shared", "all", "default", "library", "bibliotheque", "common", "commun", "device", "local device"].includes(id);
}

function readVisibilityFlag(raw: any): string {
  return normalizeText(raw?.scope || raw?.visibility || raw?.access || raw?.sharing || raw?.shareScope || "");
}

function isExplicitPublicDartSet(raw: any): boolean {
  const flag = readVisibilityFlag(raw);
  return flag === "public" || flag === "global" || flag === "shared" || flag === "all" || raw?.isPublic === true || raw?.public === true || raw?.shared === true;
}

function isExplicitPrivateDartSet(raw: any): boolean {
  const flag = readVisibilityFlag(raw);
  return flag === "private" || raw?.isPrivate === true || raw?.private === true;
}

function isLinkedRemoteLike(raw: any): boolean {
  return Boolean(
    raw?.linkedRemoteDartSet === true ||
      raw?.linkedRemote === true ||
      raw?.__linkedRemote === true ||
      raw?.remoteDartSet === true ||
      s(raw?.profileId).startsWith("__remote_dartsets_")
  );
}

function effectiveDartSetScope(raw: any): "private" | "public" {
  if (!raw || typeof raw !== "object") return "private";
  if (isLinkedRemoteLike(raw)) return "private";
  if (isExplicitPublicDartSet(raw)) return "public";
  if (isExplicitPrivateDartSet(raw)) return "private";
  if (isPublicOwnerProfileId(readOwnerProfileId(raw))) return "public";
  return "private";
}

function presetById(id: any) {
  const sid = s(id);
  if (!sid) return null;
  return (dartPresets || []).find((p: any) => s(p?.id) === sid) || null;
}

function presetByName(name: any) {
  const wanted = normalizeText(name);
  if (!wanted) return null;
  return (
    (dartPresets || []).find((p: any) => normalizeText(p?.name) === wanted) ||
    (dartPresets || []).find((p: any) => normalizeText(p?.name).includes(wanted) || wanted.includes(normalizeText(p?.name))) ||
    null
  );
}

function resolvePresetForSet(raw: any) {
  return (
    presetById(raw?.presetId || raw?.dartPresetId || raw?.preset || raw?.basePresetId || raw?.refPresetId) ||
    presetByName(raw?.name || raw?.label || raw?.title)
  );
}

function readMainImage(raw: any): string {
  const direct = pickImageLike(
    raw,
    "mainImageUrl",
    "photoUrl",
    "imageUrl",
    "imgUrlMain",
    "imgUrl",
    "photoDataUrl",
    "imageDataUrl",
    "mainImageDataUrl",
    "dartSetImageDataUrl"
  );
  if (direct) return direct;

  const asset = mediaUrlFromAssetId(raw?.mainImageAssetId || raw?.photoAssetId || raw?.imageAssetId || raw?.dartSetImageAssetId);
  if (asset) return asset;

  const preset = resolvePresetForSet(raw);
  return s(preset?.imgUrlMain || preset?.imgUrlThumb || "");
}

function readThumbImage(raw: any): string | undefined {
  const direct = pickImageLike(
    raw,
    "thumbImageUrl",
    "photoThumbUrl",
    "thumbUrl",
    "imgUrlThumb",
    "photoThumbDataUrl",
    "thumbDataUrl",
    "thumbImageDataUrl",
    "photoDataUrl",
    "imageDataUrl",
    "mainImageUrl",
    "imageUrl"
  );
  if (direct) return direct;

  const asset = mediaUrlFromAssetId(raw?.thumbImageAssetId || raw?.photoThumbAssetId || raw?.mainImageAssetId || raw?.photoAssetId || raw?.imageAssetId || raw?.dartSetImageAssetId);
  if (asset) return asset;

  const preset = resolvePresetForSet(raw);
  return s(preset?.imgUrlThumb || preset?.imgUrlMain || "") || undefined;
}

function imageIdentity(set: any): string {
  const asset = s(set?.photoAssetId || set?.mainImageAssetId || set?.thumbImageAssetId || set?.imageAssetId || set?.dartSetImageAssetId);
  if (asset) return `asset:${asset}`;
  const preset = s(set?.presetId || set?.dartPresetId || set?.preset);
  if (preset) return `preset:${preset}`;
  const url = s(readMainImage(set) || readThumbImage(set) || "");
  if (!url) return "";
  if (url.startsWith("data:image/")) return `data:${url.length}:${url.slice(0, 42)}:${url.slice(-24)}`;
  return `url:${url.split("?")[0]}`;
}

function normalizeDartSetArray(value: any): any[] {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeDartSetArray(parsed);
    } catch {
      return [];
    }
  }
  if (typeof value === "object") return Object.values(value).filter((item) => item && typeof item === "object");
  return [];
}

function appStoreSnapshot(): any {
  try {
    if (typeof window === "undefined") return null;
    const w: any = window as any;
    return w?.__appStore?.store || w?.__appStore?.getState?.() || w?.__APP_STORE__ || null;
  } catch {
    return null;
  }
}

function readDartSetArrayFromLocalStorageKey(key: string): any[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    return normalizeDartSetArray(safeLocalStorageGetJson<any>(key, []));
  } catch {
    return [];
  }
}

function isKnownBaseRecoveryCandidate(candidate: any, baseKeys: Set<string>, baseNames: Set<string>): boolean {
  const normalized = normalizeDartSetForRuntime(candidate);
  if (!normalized) return false;
  if (baseKeys.has(canonicalKeyForSet(normalized))) return true;
  const name = normalizeText(normalized.name);
  return !!name && baseNames.has(name);
}

function collectRawDartSets(): any[] {
  const primary = readDartSetArrayFromLocalStorageKey(STORAGE_KEY);
  const store = appStoreSnapshot();
  const storeDartSets = normalizeDartSetArray(store?.dartSets || store?.dartsets);

  const base = primary.length ? [...primary, ...storeDartSets] : storeDartSets.slice();

  const legacy: any[] = [];
  for (const key of LEGACY_DARTSET_STORAGE_KEYS) legacy.push(...readDartSetArrayFromLocalStorageKey(key));

  if (!base.length) return legacy;

  // Les anciennes clés ont souvent des vieux doublons. On ne les réinjecte pas.
  // Elles servent uniquement à récupérer une image/asset pour un set déjà connu.
  const baseNormalized = base.map(normalizeDartSetForRuntime).filter(Boolean) as DartSet[];
  const baseKeys = new Set(baseNormalized.map(canonicalKeyForSet));
  const baseNames = new Set(baseNormalized.map((x) => normalizeText(x.name)).filter(Boolean));
  const recovery = legacy.filter((item) => isKnownBaseRecoveryCandidate(item, baseKeys, baseNames));

  return [...base, ...recovery];
}

function normalizeDartSetForRuntime(raw: any): DartSet | null {
  if (!raw || typeof raw !== "object") return null;

  const now = Date.now();
  const rawId = s(raw.id || raw.dartSetId || raw.setId || raw.uuid);
  const name = s(raw.name || raw.label || raw.title || raw.presetName || "Mes fléchettes") || "Mes fléchettes";
  const scope = effectiveDartSetScope(raw);
  const linkedRemote = isLinkedRemoteLike(raw);

  const linkedSourceProfileId = s(
    raw.linkedSourceProfileId ||
      raw.remoteProfileId ||
      raw.sourceProfileId ||
      raw.linkedSourceLocalProfileId ||
      raw.remoteLocalProfileId ||
      raw.ownerProfileId ||
      ""
  );
  const linkedTargetLocalProfileId = s(raw.linkedTargetLocalProfileId || raw.targetLocalProfileId || raw.targetProfileId || "") || null;

  let profileId = readOwnerProfileId(raw);
  if (!profileId) profileId = scope === "public" ? "global" : linkedTargetLocalProfileId || s(raw.userId || raw.ownerUserId || "global") || "global";

  const preset = resolvePresetForSet(raw);
  const presetId = s(raw.presetId || raw.dartPresetId || raw.preset || raw.basePresetId || raw.refPresetId || preset?.id || "") || undefined;
  const mainImageUrl = readMainImage({ ...raw, presetId });
  const thumbImageUrl = readThumbImage({ ...raw, presetId });

  const base: DartSet = {
    ...(raw as any),
    id: rawId || `dartset_recovered_${hashString(`${profileId}|${name}|${imageIdentity(raw)}`)}`,
    profileId,
    name,
    brand: s(raw.brand) || undefined,
    weightGrams: Number.isFinite(Number(raw.weightGrams ?? raw.weight)) ? Number(raw.weightGrams ?? raw.weight) : undefined,
    notes: s(raw.notes || raw.description) || undefined,
    mainImageUrl: sanitizeDartSetImageUrl(mainImageUrl) || "",
    thumbImageUrl: sanitizeDartSetImageUrl(thumbImageUrl),
    bgColor: s(raw.bgColor || raw.backgroundColor) || undefined,
    mainImageAssetId: raw.mainImageAssetId ?? raw.imageAssetId ?? raw.dartSetImageAssetId ?? null,
    thumbImageAssetId: raw.thumbImageAssetId ?? raw.photoThumbAssetId ?? null,
    photoAssetId: raw.photoAssetId ?? raw.mainImageAssetId ?? raw.imageAssetId ?? raw.dartSetImageAssetId ?? null,
    kind: normalizeKind(raw.kind) || (presetId ? "preset" : mainImageUrl || thumbImageUrl ? "photo" : "plain"),
    presetId,
    isFavorite: Boolean(raw.isFavorite),
    usageCount: n(raw.usageCount, 0),
    lastUsedAt: n(raw.lastUsedAt, 0),
    scope,
    duplicateIds: uniqStrings([...(Array.isArray(raw.duplicateIds) ? raw.duplicateIds : []), ...(Array.isArray(raw.aliasIds) ? raw.aliasIds : [])]),
    aliasIds: uniqStrings(Array.isArray(raw.aliasIds) ? raw.aliasIds : []),
    linkedSourceDartSetId: s(raw.linkedSourceDartSetId || raw.sourceDartSetId || (linkedRemote ? rawId : "")) || null,
    linkedRemoteDartSet: linkedRemote,
    linkedSourceProfileId: linkedSourceProfileId || (linkedRemote ? s(raw.profileId || raw.ownerProfileId || raw.localProfileId) || null : null),
    linkedTargetLocalProfileId,
    linkedOwnerUserId: s(raw.linkedOwnerUserId || raw.ownerUserId || "") || null,
    ownerUserId: s(raw.ownerUserId) || null,
    userId: s(raw.userId) || null,
    accountId: s(raw.accountId) || null,
    createdAt: n(raw.createdAt, n(raw.updatedAt, now)),
    updatedAt: n(raw.updatedAt, n(raw.createdAt, now)),
  };

  base.duplicateIds = uniqStrings([base.id, rawId, base.linkedSourceDartSetId, ...(base.duplicateIds || []), ...(base.aliasIds || [])]).filter((id) => id !== base.id);
  base.aliasIds = uniqStrings([...(base.duplicateIds || []), ...(base.aliasIds || [])]).filter((id) => id !== base.id);

  return sanitizeDartSetForStorage(base) as DartSet;
}

function selectableOwnerKey(set: any): string {
  if (effectiveDartSetScope(set) === "public") return "public";
  return normalizeText(set?.linkedTargetLocalProfileId || set?.ownerProfileId || set?.localProfileId || set?.profileId || set?.linkedSourceProfileId || set?.ownerUserId || set?.userId || "private");
}

function canonicalKeyForSet(set: any): string {
  const scope = effectiveDartSetScope(set);
  const owner = scope === "public" ? "public" : selectableOwnerKey(set);
  const name = normalizeText(set?.name || set?.label || set?.title || "");
  if (name) return `${scope}|${owner}|name:${name}`;
  const visual = imageIdentity(set) || normalizeText(set?.presetId || set?.kind || set?.id || "plain");
  return `${scope}|${owner}|visual:${visual}`;
}

function visibleDartSetKey(set: any): string {
  // Dans une liste visible d'un profil, deux cartes avec le même nom sont des doublons,
  // même si l'ancien stockage a varié profileId/scope pendant la synchro.
  const name = normalizeText(set?.name || set?.label || set?.title || "");
  if (name) return `visible|name:${name}`;
  const visual = imageIdentity(set) || normalizeText(set?.presetId || set?.id || "");
  return `visible|visual:${visual}`;
}

function scoreDartSetForCanonical(set: any): number {
  const main = readMainImage(set);
  const thumb = readThumbImage(set);
  const hasImage = Boolean(main || thumb || set?.mainImageAssetId || set?.photoAssetId || set?.thumbImageAssetId);
  const hasDataImage = isDataImageUrl(main) || isDataImageUrl(thumb) || isDataImageUrl(set?.photoDataUrl) || isDataImageUrl(set?.imageDataUrl) || isDataImageUrl(set?.mainImageDataUrl);
  const hasAsset = Boolean(s(set?.mainImageAssetId || set?.photoAssetId || set?.thumbImageAssetId || set?.imageAssetId || set?.dartSetImageAssetId));
  return (
    (hasDataImage ? 100_000_000 : 0) +
    (hasAsset ? 50_000_000 : 0) +
    (hasImage ? 10_000_000 : 0) +
    (set?.isFavorite ? 1_000_000 : 0) +
    n(set?.usageCount, 0) * 1_000 +
    n(set?.lastUsedAt, 0) / 1_000_000 +
    n(set?.updatedAt, 0) / 10_000_000
  );
}

function mergeDartSetIntoCanonical(base: DartSet, incoming: DartSet): DartSet {
  const winner = scoreDartSetForCanonical(incoming) > scoreDartSetForCanonical(base) ? incoming : base;
  const loser = winner === incoming ? base : incoming;
  const next: any = { ...winner };

  const fill = (key: keyof DartSet | string) => {
    const current = next[key];
    const candidate = (loser as any)[key];
    if ((current === undefined || current === null || current === "") && candidate !== undefined && candidate !== null && candidate !== "") next[key] = candidate;
  };

  [
    "brand", "notes", "mainImageUrl", "thumbImageUrl", "bgColor", "mainImageAssetId", "thumbImageAssetId", "photoAssetId",
    "photoDataUrl", "imageDataUrl", "mainImageDataUrl", "dartSetImageDataUrl", "photoThumbDataUrl", "thumbDataUrl", "thumbImageDataUrl",
    "kind", "presetId", "linkedSourceProfileId", "linkedTargetLocalProfileId", "linkedOwnerUserId", "ownerUserId", "userId", "accountId",
    "imageAssetId", "dartSetImageAssetId", "photoUrl", "imageUrl", "photoThumbUrl",
  ].forEach(fill);

  next.mainImageUrl = readMainImage(next) || readMainImage(loser) || next.mainImageUrl || "";
  next.thumbImageUrl = readThumbImage(next) || readThumbImage(loser) || next.thumbImageUrl;
  next.weightGrams = Number.isFinite(Number(next.weightGrams)) ? next.weightGrams : loser.weightGrams;
  next.isFavorite = Boolean(base.isFavorite || incoming.isFavorite);
  next.usageCount = Math.max(n(base.usageCount, 0), n(incoming.usageCount, 0));
  next.lastUsedAt = Math.max(n(base.lastUsedAt, 0), n(incoming.lastUsedAt, 0));
  next.createdAt = Math.min(n(base.createdAt, Date.now()), n(incoming.createdAt, Date.now()));
  next.updatedAt = Math.max(n(base.updatedAt, 0), n(incoming.updatedAt, 0), Date.now());
  next.duplicateIds = uniqStrings([
    base.id, incoming.id, base.linkedSourceDartSetId, incoming.linkedSourceDartSetId,
    ...(base.duplicateIds || []), ...(incoming.duplicateIds || []), ...(base.aliasIds || []), ...(incoming.aliasIds || []),
  ]).filter((id) => id !== next.id);
  next.aliasIds = uniqStrings([...(next.duplicateIds || []), ...(next.aliasIds || [])]).filter((id) => id !== next.id);

  return sanitizeDartSetForStorage(next) as DartSet;
}

function dedupeDartSets(list: any[]): DartSet[] {
  const byKey = new Map<string, DartSet>();
  const order: string[] = [];

  for (const raw of Array.isArray(list) ? list : []) {
    const normalized = normalizeDartSetForRuntime(raw);
    if (!normalized) continue;
    const key = canonicalKeyForSet(normalized);
    const old = byKey.get(key);
    if (!old) {
      byKey.set(key, normalized);
      order.push(key);
    } else {
      byKey.set(key, mergeDartSetIntoCanonical(old, normalized));
    }
  }

  return order.map((key) => byKey.get(key)).filter(Boolean) as DartSet[];
}

function dedupeVisibleDartSets(list: DartSet[]): DartSet[] {
  const byKey = new Map<string, DartSet>();
  const order: string[] = [];
  for (const set of Array.isArray(list) ? list : []) {
    if (!set) continue;
    const key = visibleDartSetKey(set);
    const old = byKey.get(key);
    if (!old) {
      byKey.set(key, set);
      order.push(key);
    } else {
      byKey.set(key, scoreDartSetForCanonical(set) > scoreDartSetForCanonical(old) ? mergeDartSetIntoCanonical(old, set) : mergeDartSetIntoCanonical(set, old));
    }
  }
  return order.map((key) => byKey.get(key)).filter(Boolean) as DartSet[];
}

function sanitizeDartSetForStorage(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  const next: any = { ...raw };

  const main = sanitizeDartSetImageUrl(next.mainImageUrl || readMainImage(next));
  const thumb = sanitizeDartSetImageUrl(next.thumbImageUrl || readThumbImage(next));
  next.mainImageUrl = main || "";
  next.thumbImageUrl = thumb || undefined;

  next.scope = effectiveDartSetScope(next);
  next.name = s(next.name) || "Mes fléchettes";
  next.profileId = s(next.profileId || (next.scope === "public" ? "global" : next.linkedTargetLocalProfileId || "global"));
  next.id = s(next.id) || `dartset_recovered_${hashString(`${next.profileId}|${next.name}|${Date.now()}`)}`;
  next.duplicateIds = uniqStrings(Array.isArray(next.duplicateIds) ? next.duplicateIds : []).filter((id) => id !== next.id);
  next.aliasIds = uniqStrings([...(Array.isArray(next.aliasIds) ? next.aliasIds : []), ...next.duplicateIds]).filter((id) => id !== next.id);
  next.linkedTargetLocalProfileId = s(next.linkedTargetLocalProfileId) || null;
  next.linkedOwnerUserId = s(next.linkedOwnerUserId) || null;
  next.linkedSourceProfileId = s(next.linkedSourceProfileId) || null;
  next.linkedSourceDartSetId = s(next.linkedSourceDartSetId) || null;
  next.ownerUserId = s(next.ownerUserId) || null;
  next.userId = s(next.userId) || null;
  next.accountId = s(next.accountId) || null;
  next.createdAt = n(next.createdAt, Date.now());
  next.updatedAt = n(next.updatedAt, next.createdAt);

  if (next.kind === "photo" && !next.mainImageUrl && !next.photoDataUrl && !next.photoAssetId) next.kind = next.presetId ? "preset" : "plain";

  return next;
}

function loadAllRaw(): DartSet[] {
  try {
    return collectRawDartSets().map((item: any) => sanitizeDartSetForStorage(item) as DartSet);
  } catch (err) {
    console.warn("[dartSetsStore] loadAll error", err);
    return [];
  }
}

function stripHeavyInlineImagesForFallback(list: DartSet[]): DartSet[] {
  return (Array.isArray(list) ? list : []).map((item: any) => {
    const next: any = { ...(item || {}) };
    for (const key of ["mainImageUrl", "thumbImageUrl", "photoDataUrl", "imageDataUrl", "mainImageDataUrl", "dartSetImageDataUrl", "photoThumbDataUrl", "thumbDataUrl", "thumbImageDataUrl"]) {
      if (typeof next[key] === "string" && next[key].startsWith("data:image/")) {
        if (key === "mainImageUrl") next[key] = "";
        else delete next[key];
      }
    }
    if (next.kind === "photo") next.kind = next.presetId ? "preset" : "plain";
    return next;
  }) as DartSet[];
}

function saveAll(list: DartSet[]): boolean {
  const sanitized = dedupeDartSets(Array.isArray(list) ? list : []).map((item) => sanitizeDartSetForStorage(item)) as DartSet[];

  let saved = false;
  try {
    saved = !!safeLocalStorageSetJson(STORAGE_KEY, sanitized, {
      sanitizeImages: true,
      imageMaxChars: MAX_DARTSET_IMAGE_DATA_URL_CHARS,
      compressAboveChars: 12_000,
    });
  } catch (err) {
    console.warn("[dartSetsStore] saveAll error", err);
    saved = false;
  }

  if (!saved) {
    try {
      const stripped = stripHeavyInlineImagesForFallback(sanitized);
      saved = !!safeLocalStorageSetJson(STORAGE_KEY, stripped, {
        sanitizeImages: true,
        imageMaxChars: MAX_DARTSET_IMAGE_DATA_URL_CHARS,
        compressAboveChars: 4_000,
      });
    } catch (fallbackErr) {
      console.warn("[dartSetsStore] fallback saveAll error", fallbackErr);
      saved = false;
    }
  }

  if (!saved) return false;

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dc-dartsets-updated"));
      try {
        const w: any = window as any;
        if (typeof w?.__markNasSyncDirty === "function") w.__markNasSyncDirty("dartsets_save");
      } catch {}
      try {
        const w: any = window as any;
        if (w?.__appStore?.update) {
          w.__appStore.update((st: any) => ({ ...(st || {}), dartSets: sanitized }));
        }
      } catch {}
    }
  } catch {}

  return true;
}

function loadAll(): DartSet[] {
  return dedupeDartSets(loadAllRaw());
}

function collectProfileAliasIds(profileId: string): Set<string> {
  const aliases = new Set<string>();
  const add = (v: any) => { const id = s(v); if (id) aliases.add(id); };
  const pid = s(profileId);
  add(pid);

  const store = appStoreSnapshot();
  if (!store) return aliases;

  const roots = [
    store.currentProfile,
    store.activeProfile,
    store.profile,
    ...(Array.isArray(store.profiles) ? store.profiles : []),
    ...(Array.isArray(store.localProfiles) ? store.localProfiles : []),
    ...(Array.isArray(store.players) ? store.players : []),
  ].filter(Boolean);

  const profileKeys = ["id", "profileId", "localProfileId", "playerId", "pid", "uid", "linkedSourceLocalProfileId", "linkedTargetLocalProfileId", "ownerProfileId"];

  for (const obj of roots) {
    const vals = uniqStrings(profileKeys.map((k) => obj?.[k]));
    if (!vals.includes(pid)) continue;
    vals.forEach(add);
  }

  // Si un écran passe l'id du compte au lieu de l'id du profil, on le ramène au profil actif uniquement.
  const accountIds = uniqStrings([store.userId, store.accountId, store.authUserId, store.sessionUserId, store.currentUserId, store.onlineUserId, store.user?.id, store.account?.id, store.session?.user?.id]);
  if (pid && accountIds.includes(pid)) {
    const activeId = s(store.activeProfileId || store.currentProfileId || store.selectedProfileId);
    if (activeId) {
      add(activeId);
      const activeObj = roots.find((obj: any) => uniqStrings(profileKeys.map((k) => obj?.[k])).includes(activeId));
      if (activeObj) uniqStrings(profileKeys.map((k) => activeObj?.[k])).forEach(add);
    }
  }

  return aliases;
}

function collectSelectableOwnerIds(set: any): string[] {
  return uniqStrings([
    set?.profileId,
    set?.profile_id,
    set?.ownerProfileId,
    set?.localProfileId,
    set?.linkedTargetLocalProfileId,
  ]);
}

function dartSetMatchesAnyId(set: any, id: any): boolean {
  const sid = s(id);
  if (!sid || !set) return false;
  if (s(set.id) === sid) return true;
  if (s(set.linkedSourceDartSetId) === sid) return true;
  const ids = uniqStrings([...(Array.isArray(set.duplicateIds) ? set.duplicateIds : []), ...(Array.isArray(set.aliasIds) ? set.aliasIds : [])]);
  return ids.includes(sid);
}

function profileCanSeeDartSet(set: DartSet, profileId: string): boolean {
  if (!set) return false;
  if (effectiveDartSetScope(set) === "public") return true;
  const aliases = collectProfileAliasIds(profileId);
  const owners = collectSelectableOwnerIds(set);
  if (owners.some((id) => aliases.has(id))) return true;
  // Sécurité pour les projections ONLINE : seul le profil cible voit ce set distant.
  const target = s((set as any).linkedTargetLocalProfileId);
  return !!target && aliases.has(target);
}

function mergeDartSetListsPreservingCurrent(incoming: any[]): DartSet[] {
  const current = loadAllRaw();
  const inc = Array.isArray(incoming) ? incoming : [];
  return dedupeDartSets([...current, ...inc]);
}

// -------------------------------------------------------------
// API publique
// -------------------------------------------------------------

export function getAllDartSets(): DartSet[] {
  return loadAll();
}

export function getAllSelectableDartSets(): DartSet[] {
  return dedupeVisibleDartSets(loadAll().filter((set) => effectiveDartSetScope(set) === "public" || Boolean(s((set as any).linkedTargetLocalProfileId)) || !isLinkedRemoteLike(set)));
}

export function setAllDartSets(list: DartSet[]) {
  return saveAll(mergeDartSetListsPreservingCurrent(Array.isArray(list) ? list : []));
}

export function getDartSetsForProfile(profileId: string): DartSet[] {
  const pid = s(profileId);
  const visible = loadAll().filter((set) => (pid ? profileCanSeeDartSet(set, pid) : effectiveDartSetScope(set) === "public"));
  return dedupeVisibleDartSets(visible);
}

export function getDartSetById(id: DartSetId): DartSet | undefined {
  const sid = s(id);
  if (!sid) return undefined;
  return loadAll().find((set) => dartSetMatchesAnyId(set, sid));
}

export function getCanonicalDartSetId(id: DartSetId | null | undefined, profileId?: string | null): string | null {
  const sid = s(id);
  if (!sid) return null;
  const pid = s(profileId);
  const visible = pid ? getDartSetsForProfile(pid) : [];
  const visibleHit = visible.find((set) => dartSetMatchesAnyId(set, sid));
  if (visibleHit?.id) return String(visibleHit.id);
  const globalHit = loadAll().find((set) => dartSetMatchesAnyId(set, sid));
  if (pid && globalHit) {
    const sameVisible = visible.find((set) => visibleDartSetKey(set) === visibleDartSetKey(globalHit));
    if (sameVisible?.id) return String(sameVisible.id);
  }
  return globalHit?.id ? String(globalHit.id) : sid;
}

export function getDartSetAliases(id: DartSetId | null | undefined): string[] {
  const set = getDartSetById(s(id));
  if (!set) return s(id) ? [s(id)] : [];
  return uniqStrings([set.id, set.linkedSourceDartSetId, ...(set.duplicateIds || []), ...(set.aliasIds || [])]);
}

export function getDartSetMainImageSrc(set: any): string | null {
  const src = readMainImage(set);
  return src || null;
}

export function getDartSetThumbImageSrc(set: any): string | null {
  const src = readThumbImage(set) || readMainImage(set);
  return src || null;
}

export function createDartSet(input: {
  profileId: string;
  name: string;
  brand?: string;
  weightGrams?: number;
  notes?: string;
  mainImageUrl: string;
  thumbImageUrl?: string;
  bgColor?: string;
  kind?: "plain" | "preset" | "photo";
  presetId?: string | null;
  photoDataUrl?: string | null;
  imageDataUrl?: string | null;
  mainImageDataUrl?: string | null;
  dartSetImageDataUrl?: string | null;
  photoThumbDataUrl?: string | null;
  thumbDataUrl?: string | null;
  thumbImageDataUrl?: string | null;
  scope?: "private" | "public";
}): DartSet | undefined {
  const all = loadAll();
  const now = Date.now();
  const normalizedInput = normalizeDartSetForRuntime({
    ...input,
    id: `dartset_pending_${hashString(`${input.profileId}|${input.name}|${input.presetId || input.mainImageUrl || ""}`)}`,
    createdAt: now,
    updatedAt: now,
    scope: input.scope ?? "private",
  });

  const existing = normalizedInput ? all.find((set) => canonicalKeyForSet(set) === canonicalKeyForSet(normalizedInput)) : null;
  if (existing) {
    const patch: Partial<DartSet> = {
      name: input.name.trim() || existing.name || "Mes fléchettes",
      brand: input.brand?.trim() || existing.brand,
      weightGrams: input.weightGrams ?? existing.weightGrams,
      notes: input.notes?.trim() || existing.notes,
      mainImageUrl: input.mainImageUrl || existing.mainImageUrl || "",
      thumbImageUrl: input.thumbImageUrl || existing.thumbImageUrl,
      bgColor: input.bgColor || existing.bgColor,
      photoDataUrl: input.photoDataUrl || existing.photoDataUrl,
      imageDataUrl: input.imageDataUrl || existing.imageDataUrl,
      mainImageDataUrl: input.mainImageDataUrl || existing.mainImageDataUrl,
      dartSetImageDataUrl: input.dartSetImageDataUrl || existing.dartSetImageDataUrl,
      photoThumbDataUrl: input.photoThumbDataUrl || existing.photoThumbDataUrl,
      thumbDataUrl: input.thumbDataUrl || existing.thumbDataUrl,
      thumbImageDataUrl: input.thumbImageDataUrl || existing.thumbImageDataUrl,
      kind: input.kind || existing.kind,
      presetId: input.presetId || existing.presetId,
      scope: input.scope ?? existing.scope,
      profileId: input.profileId || existing.profileId,
    } as any;
    return updateDartSet(existing.id, patch as any) || existing;
  }

  const alreadyForProfile = all.filter((set) => String(set.profileId) === String(input.profileId));
  const newSet: DartSet = sanitizeDartSetForStorage({
    id: `dartset_${now}_${Math.random().toString(16).slice(2)}`,
    profileId: input.profileId,
    name: input.name.trim() || "Mes fléchettes",
    brand: input.brand?.trim() || undefined,
    weightGrams: input.weightGrams,
    notes: input.notes?.trim() || undefined,
    mainImageUrl: input.mainImageUrl,
    thumbImageUrl: input.thumbImageUrl,
    bgColor: input.bgColor,
    photoDataUrl: input.photoDataUrl || undefined,
    imageDataUrl: input.imageDataUrl || undefined,
    mainImageDataUrl: input.mainImageDataUrl || undefined,
    dartSetImageDataUrl: input.dartSetImageDataUrl || undefined,
    photoThumbDataUrl: input.photoThumbDataUrl || undefined,
    thumbDataUrl: input.thumbDataUrl || undefined,
    thumbImageDataUrl: input.thumbImageDataUrl || undefined,
    kind: input.kind,
    presetId: input.presetId ?? undefined,
    isFavorite: alreadyForProfile.length === 0,
    usageCount: 0,
    lastUsedAt: 0,
    scope: input.scope ?? "private",
    createdAt: now,
    updatedAt: now,
  }) as DartSet;

  all.push(newSet);
  if (!saveAll(all)) return undefined;
  return getDartSetById(newSet.id) || newSet;
}

export function updateDartSet(id: DartSetId, patch: Partial<Omit<DartSet, "id" | "createdAt">>): DartSet | undefined {
  const all = loadAll();
  const canonicalId = getCanonicalDartSetId(id) || id;
  const index = all.findIndex((set) => String(set.id) === String(canonicalId) || dartSetMatchesAnyId(set, id));
  if (index === -1) return undefined;

  const updated = sanitizeDartSetForStorage({
    ...all[index],
    ...patch,
    id: all[index].id,
    duplicateIds: uniqStrings([...(all[index].duplicateIds || []), ...(Array.isArray((patch as any).duplicateIds) ? (patch as any).duplicateIds : [])]),
    aliasIds: uniqStrings([...(all[index].aliasIds || []), ...(Array.isArray((patch as any).aliasIds) ? (patch as any).aliasIds : [])]),
    updatedAt: Date.now(),
  }) as DartSet;

  all[index] = updated;
  if (!saveAll(all)) return undefined;
  return getDartSetById(updated.id) || updated;
}

export function deleteDartSet(id: DartSetId): boolean {
  const canonicalId = getCanonicalDartSetId(id) || id;
  const filtered = loadAll().filter((set) => String(set.id) !== String(canonicalId) && !dartSetMatchesAnyId(set, id));
  return saveAll(filtered);
}

export function setFavoriteDartSet(profileId: string, dartSetId: DartSetId) {
  const all = loadAll();
  const canonicalId = getCanonicalDartSetId(dartSetId, profileId) || dartSetId;
  let changed = false;
  const now = Date.now();
  const updated = all.map((set) => {
    if (!profileCanSeeDartSet(set, profileId) || !dartSetMatchesAnyId(set, canonicalId)) return set;
    changed = true;
    return { ...set, isFavorite: !set.isFavorite, updatedAt: now };
  });
  if (changed) return saveAll(updated);
  return true;
}

export function bumpDartSetUsage(dartSetId: DartSetId) {
  const all = loadAll();
  const canonicalId = getCanonicalDartSetId(dartSetId) || dartSetId;
  const index = all.findIndex((set) => String(set.id) === String(canonicalId) || dartSetMatchesAnyId(set, dartSetId));
  if (index === -1) return;
  const now = Date.now();
  const current = all[index];
  all[index] = { ...current, usageCount: (current.usageCount ?? 0) + 1, lastUsedAt: now, updatedAt: now };
  return saveAll(all);
}

export function getFavoriteDartSetForProfile(profileId: string): DartSet | undefined {
  const visible = getDartSetsForProfile(profileId);
  const byPriority = (a: DartSet, b: DartSet) => {
    const favA = a.isFavorite ? 1 : 0;
    const favB = b.isFavorite ? 1 : 0;
    if (favA !== favB) return favB - favA;
    const usageA = Number(a.usageCount || 0);
    const usageB = Number(b.usageCount || 0);
    if (usageA !== usageB) return usageB - usageA;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base", numeric: true });
  };

  const aliases = collectProfileAliasIds(profileId);
  const favoriteOwn = visible
    .filter((set) => effectiveDartSetScope(set) !== "public" && collectSelectableOwnerIds(set).some((id) => aliases.has(id)) && set.isFavorite)
    .sort(byPriority)[0];
  if (favoriteOwn) return favoriteOwn;

  const ownSorted = visible
    .filter((set) => effectiveDartSetScope(set) !== "public" && collectSelectableOwnerIds(set).some((id) => aliases.has(id)))
    .sort(byPriority);
  if (ownSorted.length > 0) return ownSorted[0];

  return visible.slice().sort(byPriority)[0];
}

export function replaceAllDartSets(list: DartSet[]) {
  return saveAll(mergeDartSetListsPreservingCurrent(Array.isArray(list) ? list : []));
}
