import { safeLocalStorageGetJson, safeLocalStorageSetJson, unpackJsonFromStorage } from "./imageStorageCodec";
import { dartPresets } from "./dartPresets";
import { getNasApiUrl } from "./serverConfig";

// =============================================================
// src/lib/dartSetsStore.ts
// Source officielle des jeux de fléchettes.
//
// Règle impérative :
// - dc_dart_sets_v1 = source de vérité UI.
// - appStore / anciennes clés / snapshots ONLINE = sources de récupération IMAGE seulement.
// - PUBLIC = visible/sélectionnable par tous.
// - PRIVÉ = visible/sélectionnable uniquement par le profil propriétaire.
// - ONLINE lié = visible uniquement pour linkedTargetLocalProfileId.
//
// Diagnostics mutations : [DartSetsDiag]
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
const META_KEY = "dc_dart_sets_v1_meta";
const IMAGE_BANK_KEY = "dc_dart_sets_image_bank_v1";
const LEGACY_DARTSET_STORAGE_KEYS = [
  "dc-dartsets-v1",
  "dc-dartSets-v1",
  "dc_lite_dartsets_v1",
  "dc-lite-dartsets-v1",
];

// Les photos sont compressées côté panel. On accepte large pour ne plus remplacer
// des photos valides par le placeholder 🎯 au premier souci de quota.
const MAX_DARTSET_IMAGE_DATA_URL_CHARS = 8_000_000;

type DartSetMutationLock = {
  at: number;
  values: {
    scope?: "private" | "public";
    profileId?: string;
    isFavorite?: boolean;
    name?: string;
    brand?: string | undefined;
    weightGrams?: number | undefined;
    notes?: string | undefined;
    bgColor?: string | undefined;
    kind?: "plain" | "preset" | "photo" | undefined;
    presetId?: string | undefined;
  };
};

type DartSetsMeta = {
  initialized?: boolean;
  updatedAt?: number;
  deletedKeys?: Record<string, number>;
  // Anti-réinjection : mémorise les derniers champs éditables modifiés par l'utilisateur.
  // Les snapshots IDB/NAS/appStore peuvent encore apporter des images, mais ils ne
  // doivent plus écraser scope/profileId/isFavorite juste après une modification.
  mutationLocks?: Record<string, DartSetMutationLock>;
};

function s(value: any): string {
  return String(value ?? "").trim();
}

function n(value: any, fallback = 0): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : fallback;
}

function diag(action: string, payload: any = {}) {
  try {
    // Diagnostics désactivés par défaut : les logs massifs ralentissaient les
    // modales X01. Pour réactiver : window.__DARTSETS_DEBUG = true
    if (typeof window !== "undefined" && (window as any).__DARTSETS_DEBUG === true) {
      console.info("[DartSetsDiag]", action, payload);
    }
  } catch {}
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


function isUrlishText(value: any): boolean {
  const raw = s(value).toLowerCase();
  return raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/media/") || raw.startsWith("/images/") || raw.startsWith("data:image/") || raw.includes("darts-counter-v7.pages.dev") || raw.includes("/assets/");
}

function isSyntheticRecoveredDartSet(raw: any): boolean {
  const id = s(raw?.id || raw?.dartSetId || raw?.setId || "").toLowerCase();
  // Ces IDs ont été créés par d'anciennes rustines de récupération/fallback.
  // Ils ne correspondent pas à des dartsets réellement créés dans MES FLÉCHETTES.
  return id.startsWith("builtin_public_") || id.startsWith("dartset_recovered_") || id.startsWith("recovered_dartset_");
}

function objectLooksLikeProfileOrTeam(raw: any): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const keys = Object.keys(raw).join("|").toLowerCase();
  const type = normalizeText(raw.type || raw.kind || raw.category || raw.role || raw.entityType);
  if (/profile|profil|player|joueur|avatar|team|equipe|équipe|bot|league|ligue|tournament|tournoi/.test(type)) return true;
  if (/teamname|members|players|captain|avatarurl|avatardataurl|medallion|coverurl|coverdataurl|profileavatar|teamlogo|logoasset|botlevel|botdifficulty/.test(keys)) {
    // Un vrai dartset peut avoir profileId ou ownerProfileId, mais pas les champs structurels d'un profil/team.
    if (!/dartset|dartpreset|weightgrams|barrel|shaft|flight|mainimage|thumbimage|photoasset|presetid/.test(keys)) return true;
  }
  return false;
}

function valueLooksLikeAvatarOrProfileImage(value: any): boolean {
  const raw = s(value).toLowerCase();
  return raw.includes("avatar") || raw.includes("profile") || raw.includes("profil") || raw.includes("medallion") || raw.includes("logo-equipe") || raw.includes("team-logo") || raw.includes("league") || raw.includes("cover");
}

function collectStoreNameSet(): Set<string> {
  const names = new Set<string>();
  const add = (v: any) => {
    const name = normalizeText(v);
    if (name) names.add(name);
  };
  try {
    const store = appStoreSnapshot();
    const arrays = [
      store?.profiles,
      store?.localProfiles,
      store?.players,
      store?.bots,
      store?.teams,
      store?.localTeams,
      store?.leagueTeams,
      store?.babyfootTeams,
      store?.contacts,
    ];
    for (const arr of arrays) {
      if (!Array.isArray(arr)) continue;
      for (const obj of arr) {
        add(obj?.name);
        add(obj?.displayName);
        add(obj?.nickname);
        add(obj?.playerName);
        add(obj?.teamName);
        add(obj?.label);
        add(obj?.title);
      }
    }
    add(store?.currentProfile?.name);
    add(store?.currentProfile?.displayName);
    add(store?.activeProfile?.name);
    add(store?.activeProfile?.displayName);
  } catch {}
  return names;
}

function objectHasDartSpecificField(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  return Boolean(
    obj.dartSetId || obj.setId || obj.presetId || obj.dartPresetId || obj.basePresetId || obj.refPresetId ||
      obj.weightGrams || obj.weight || obj.brand || obj.grip || obj.barrel || obj.shaft || obj.flight ||
      obj.kind === "preset" || obj.kind === "photo" || obj.kind === "plain" ||
      obj.mainImageUrl || obj.thumbImageUrl || obj.photoDataUrl || obj.imageDataUrl || obj.mainImageDataUrl || obj.dartSetImageDataUrl ||
      obj.mainImageAssetId || obj.thumbImageAssetId || obj.photoAssetId || obj.dartSetImageAssetId || obj.imageAssetId
  );
}

function isKnownDartPresetName(value: any): boolean {
  const wanted = normalizeText(value);
  if (!wanted) return false;
  return (dartPresets || []).some((p: any) => normalizeText(p?.name) === wanted || wanted.includes(normalizeText(p?.name)) || normalizeText(p?.name).includes(wanted));
}

function isLikelyBadRecoveredDartSet(raw: any): boolean {
  if (!raw || typeof raw !== "object") return true;
  const rawIdForPollution = s(raw?.id || raw?.dartSetId || raw?.setId || "").toLowerCase();
  // Les presets publics inventés par une ancienne rustine restent interdits.
  // En revanche certains vrais sets utilisateur peuvent avoir reçu un id
  // dartset_recovered_* lors d'une migration : on les garde s'ils passent les
  // contrôles stricts ci-dessous.
  if (rawIdForPollution.startsWith("builtin_public_") || rawIdForPollution.startsWith("recovered_dartset_")) return true;

  const name = s(raw?.name || raw?.label || raw?.title || raw?.presetName || "");
  const normName = normalizeText(name);
  if (!normName) return true;

  // Jamais d'URL, jamais de profil/team/avatar transformé en jeu de fléchettes.
  if (isUrlishText(name)) return true;
  if (objectLooksLikeProfileOrTeam(raw)) return true;

  const storeNames = collectStoreNameSet();
  const id = s(raw?.id || raw?.dartSetId || raw?.setId || "");
  const lowerId = id.toLowerCase();
  const hasDartField = objectHasDartSpecificField(raw);
  const hasRealImage = Boolean(readMainImage(raw) || readThumbImage(raw));
  const hasPreset = Boolean(resolvePresetForSet(raw) || isKnownDartPresetName(name));
  const hasProductMeta = Boolean(s(raw?.brand) || Number.isFinite(Number(raw?.weightGrams ?? raw?.weight)));
  const profileOrTeamName = storeNames.has(normName);

  if (profileOrTeamName && !hasProductMeta && !hasPreset) return true;
  if (/profile|profil|team|equipe|équipe|avatar|bot|league|ligue|tournament|tournoi/.test(lowerId) && !hasProductMeta && !hasPreset) return true;

  // Un objet doit avoir au moins un vrai indice dartset. Une simple image + nom
  // ne suffit pas : c'est précisément comme ça que les avatars/teams/URLs ont pollué la liste.
  if (!hasDartField && !hasPreset && !hasProductMeta) return true;

  // On accepte les sets créés par l'utilisateur même sans image, mais pas les
  // fragments récupérés sans donnée produit ni preset.
  if (!hasRealImage && !hasPreset && !hasProductMeta && !hasDartField) return true;

  return false;
}

function filterOutPollutedDartSets(rawList: any[]): any[] {
  const arr = Array.isArray(rawList) ? rawList : [];
  const kept = arr.filter((raw) => !isLikelyBadRecoveredDartSet(raw));
  const removed = arr.length - kept.length;
  if (removed > 0) {
    diag("pollution-filter:removed", { removed, kept: kept.length, removedNames: arr.filter((raw) => isLikelyBadRecoveredDartSet(raw)).map((x:any) => s(x?.name || x?.label || x?.title || x?.id)).slice(0, 20) });
  }
  return kept;
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
  // Ne jamais supprimer à la lecture runtime : la sauvegarde gère le quota.
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
  // Vide ≠ public. Un set custom sans propriétaire clair doit rester privé/invisible
  // plutôt que réapparaître chez tous les joueurs.
  return !!id && ["global", "public", "shared", "all", "default", "library", "bibliotheque", "common", "commun", "device", "local device"].includes(id);
}

function hasConcreteOwnerProfileId(profileId: any): boolean {
  return s(profileId).length > 0;
}

function isExplicitPublicOwnerProfileId(profileId: any): boolean {
  return hasConcreteOwnerProfileId(profileId) && isPublicOwnerProfileId(profileId);
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

  const ownerProfileId = readOwnerProfileId(raw);
  const hasExplicitPrivateTarget = Boolean(s(raw?.privateProfileId || raw?.linkedTargetLocalProfileId || raw?.targetLocalProfileId || raw?.targetProfileId));

  // PUBLIC explicite gagne toujours : c'est le cas normal des sets publics
  // créés/édités dans MES FLÉCHETTES.
  if (isExplicitPublicDartSet(raw)) return "public";

  // PRIVÉ explicite gagne ensuite : jamais de fallback global qui ouvrirait un
  // set privé sans propriétaire correct à tous les joueurs.
  if (isExplicitPrivateDartSet(raw) || hasExplicitPrivateTarget) return "private";

  // Owner global/public sans marqueur privé = ancien public légitime.
  if (isPublicOwnerProfileId(ownerProfileId)) return "public";
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
    (dartPresets || []).find((p: any) => {
      const pn = normalizeText(p?.name);
      return !!pn && (pn.includes(wanted) || wanted.includes(pn));
    }) ||
    null
  );
}

function resolvePresetForSet(raw: any) {
  return (
    presetById(raw?.presetId || raw?.dartPresetId || raw?.preset || raw?.basePresetId || raw?.refPresetId) ||
    presetByName(raw?.name || raw?.label || raw?.title)
  );
}

function readNestedImage(raw: any, ...paths: string[]): string {
  for (const path of paths || []) {
    const parts = String(path || "").split(".").filter(Boolean);
    let cur = raw;
    for (const part of parts) cur = cur?.[part];
    const v = sanitizeDartSetImageUrl(cur);
    if (v) return v;
  }
  return "";
}

function readMainImage(raw: any): string {
  const direct = pickImageLike(
    raw,
    "mainImageUrl",
    "mainImage",
    "photoUrl",
    "photo",
    "imageUrl",
    "image",
    "src",
    "url",
    "dataUrl",
    "dataURL",
    "imgUrlMain",
    "imgUrl",
    "photoDataUrl",
    "imageDataUrl",
    "mainImageDataUrl",
    "dartSetImageDataUrl",
    "visualUrl",
    "pictureUrl",
    "customImageUrl"
  );
  if (direct) return direct;

  const nested = readNestedImage(raw, "main.url", "main.src", "image.url", "image.src", "photo.url", "photo.src", "media.url", "media.publicUrl", "media.path", "asset.url", "asset.publicUrl");
  if (nested) return nested;

  const asset = mediaUrlFromAssetId(raw?.mainImageAssetId || raw?.photoAssetId || raw?.imageAssetId || raw?.dartSetImageAssetId || raw?.mediaAssetId || raw?.assetId || raw?.asset_id);
  if (asset) return asset;

  const preset = resolvePresetForSet(raw);
  return s(preset?.imgUrlMain || preset?.imgUrlThumb || "");
}

function readThumbImage(raw: any): string | undefined {
  const direct = pickImageLike(
    raw,
    "thumbImageUrl",
    "thumbnailUrl",
    "thumb",
    "photoThumbUrl",
    "thumbUrl",
    "imgUrlThumb",
    "photoThumbDataUrl",
    "thumbDataUrl",
    "thumbImageDataUrl",
    "mainImageUrl",
    "mainImage",
    "photoDataUrl",
    "imageDataUrl",
    "imageUrl",
    "image",
    "src",
    "url",
    "dataUrl",
    "dataURL"
  );
  if (direct) return direct;

  const nested = readNestedImage(raw, "thumb.url", "thumb.src", "thumbnail.url", "thumbnail.src", "image.thumb", "photo.thumb", "media.thumbUrl", "media.url", "asset.thumbUrl", "asset.url");
  if (nested) return nested;

  const asset = mediaUrlFromAssetId(raw?.thumbImageAssetId || raw?.photoThumbAssetId || raw?.mainImageAssetId || raw?.photoAssetId || raw?.imageAssetId || raw?.dartSetImageAssetId || raw?.mediaAssetId || raw?.assetId || raw?.asset_id);
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
      return normalizeDartSetArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (typeof value === "object") return Object.values(value).filter((item) => item && typeof item === "object");
  return [];
}

function hasLocalStorageKey(key: string): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage && window.localStorage.getItem(key) != null;
  } catch {
    return false;
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

function appStoreSnapshot(): any {
  try {
    if (typeof window === "undefined") return null;
    const w: any = window as any;
    return w?.__appStore?.store || w?.__appStore?.getState?.() || w?.__APP_STORE__ || null;
  } catch {
    return null;
  }
}

function readMeta(): DartSetsMeta {
  try {
    if (typeof window === "undefined") return {};
    return safeLocalStorageGetJson<DartSetsMeta>(META_KEY, {}) || {};
  } catch {
    return {};
  }
}

function writeMeta(meta: DartSetsMeta) {
  try {
    safeLocalStorageSetJson(META_KEY, { ...(meta || {}), updatedAt: Date.now() }, { sanitizeImages: false });
  } catch {}
}

function cleanupDeletedKeys(meta: DartSetsMeta): DartSetsMeta {
  const now = Date.now();
  const keepMs = 1000 * 60 * 60 * 24 * 14;
  const next: Record<string, number> = {};
  for (const [key, ts] of Object.entries(meta.deletedKeys || {})) {
    if (now - Number(ts || 0) <= keepMs) next[key] = Number(ts || now);
  }

  const mutationLocks: Record<string, DartSetMutationLock> = {};
  for (const [key, lock] of Object.entries(meta.mutationLocks || {})) {
    const at = Number((lock as any)?.at || 0);
    if (at > 0 && now - at <= keepMs && (lock as any)?.values && typeof (lock as any).values === "object") {
      mutationLocks[key] = { at, values: { ...((lock as any).values || {}) } };
    }
  }

  return { ...(meta || {}), deletedKeys: next, mutationLocks };
}

function isDeletedByMeta(raw: any, meta: DartSetsMeta): boolean {
  const deleted = meta.deletedKeys || {};
  const normalized = normalizeDartSetForRuntime(raw, { allowDeleted: true });
  if (!normalized) return false;
  const keys = deletionKeysForSet(normalized);
  return keys.some((key) => !!deleted[key]);
}

function readPrimaryRaw(): any[] {
  return readDartSetArrayFromLocalStorageKey(STORAGE_KEY);
}

let deepRecoveryCacheAt = 0;
let deepRecoveryCache: any[] = [];

function readLocalStorageJsonLoose(key: string): any {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return unpackJsonFromStorage<any>(raw, null);
  } catch {
    return null;
  }
}

function objectHasImageCandidate(obj: any): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  if (readMainImage(obj) || readThumbImage(obj)) return true;
  return Boolean(
    obj.mainImageAssetId || obj.thumbImageAssetId || obj.photoAssetId || obj.imageAssetId || obj.dartSetImageAssetId || obj.mediaAssetId || obj.assetId ||
      obj.photoDataUrl || obj.imageDataUrl || obj.mainImageDataUrl || obj.dartSetImageDataUrl || obj.dataUrl || obj.dataURL
  );
}

function objectLooksLikeDartSetCandidate(obj: any, path = ""): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj).join("|").toLowerCase();
  const p = String(path || "").toLowerCase();
  const name = s(obj.name || obj.label || obj.title || obj.presetName);
  if (!name || isUrlishText(name)) return false;

  // STRICT : un objet avec juste un nom + une image peut être un profil/avatar/team.
  // On n'accepte comme dartset récupérable que les chemins/champs explicitement dartsets.
  const hasDartPath = /dartset|dartsets|dart_set|dart_sets/.test(p);
  const hasDartKeys = /dartset|dartpreset|presetid|mainimage|thumbimage|photoasset|dartsetimage|weightgrams|barrel|shaft|flight/.test(keys);
  const hasProductHint = Boolean(obj.brand || obj.weightGrams || obj.weight || obj.presetId || obj.dartPresetId || obj.kind === "photo" || obj.kind === "preset");
  if (!(hasDartPath || hasDartKeys || hasProductHint)) return false;
  return !isLikelyBadRecoveredDartSet(obj);
}

function collectDeepDartSetCandidates(root: any, sourceKey = ""): any[] {
  const out: any[] = [];
  const seen = new Set<any>();
  let nodes = 0;
  const maxNodes = 25000;

  const walk = (value: any, path = "") => {
    if (value == null || nodes >= maxNodes) return;
    if (typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    nodes += 1;

    if (Array.isArray(value)) {
      if (/dartset|dartsets|dart_sets|flechette|fléchette/i.test(path)) {
        for (const item of value) if (item && typeof item === "object") out.push(item);
      }
      for (let i = 0; i < value.length && nodes < maxNodes; i += 1) walk(value[i], `${path}[${i}]`);
      return;
    }

    if (objectLooksLikeDartSetCandidate(value, path)) out.push(value);

    for (const [key, child] of Object.entries(value)) {
      if (nodes >= maxNodes) break;
      const nextPath = path ? `${path}.${key}` : key;
      if (/dartset|dartsets|dart_sets/i.test(String(key))) {
        out.push(...normalizeDartSetArray(child));
      }
      walk(child, nextPath);
    }
  };

  walk(root, sourceKey);
  const bySig = new Map<string, any>();
  for (const item of out) {
    const name = normalizeText(item?.name || item?.label || item?.title || "");
    const img = imageIdentity(item) || readMainImage(item) || readThumbImage(item) || s(item?.id || item?.presetId || "");
    const key = `${name}|${img}|${s(item?.profileId || item?.ownerProfileId || item?.localProfileId || "")}`;
    if (!bySig.has(key)) bySig.set(key, item);
  }
  return Array.from(bySig.values());
}

function readDeepRecoveryRaw(): any[] {
  // DÉSACTIVÉ pour les dartsets.
  // Le scan large localStorage a transformé des profils, équipes, avatars et URLs
  // en faux dartsets. On garde cette fonction pour compatibilité diagnostic, mais
  // elle ne doit plus alimenter la bibliothèque ni le sélecteur.
  try {
    const now = Date.now();
    if (now - deepRecoveryCacheAt < 1500) return deepRecoveryCache.slice();
    deepRecoveryCacheAt = now;
    deepRecoveryCache = [];
    return [];
  } catch {
    return [];
  }
}

function readImageBankRaw(): any[] {
  try {
    const bank = safeLocalStorageGetJson<Record<string, any>>(IMAGE_BANK_KEY, {}) || {};
    return Object.values(bank).filter((item) => item && typeof item === "object");
  } catch {
    return [];
  }
}

function readRecoveryRaw(): any[] {
  const store = appStoreSnapshot();
  const out: any[] = [];
  // Sources autorisées pour RECRÉER des dartsets : collections explicitement
  // nommées dartSets seulement. Surtout pas la banque d’images : elle contient
  // des fragments utilisés pour retrouver les photos, pas des fiches dartset fiables.
  out.push(...normalizeDartSetArray(store?.dartSets || store?.dartsets));
  for (const key of LEGACY_DARTSET_STORAGE_KEYS) out.push(...readDartSetArrayFromLocalStorageKey(key));
  return filterOutPollutedDartSets(out);
}

function mergeExplicitLibrarySources(primaryRaw: any[], recoveryRaw: any[]): any[] {
  const meta = cleanupDeletedKeys(readMeta());
  const out: DartSet[] = mergePrimaryDuplicates(filterOutPollutedDartSets(primaryRaw || []));
  const seenIds = new Set<string>();
  const seenVisible = new Set<string>();
  const addSeen = (set: any) => {
    for (const id of uniqStrings([set?.id, set?.linkedSourceDartSetId, ...(Array.isArray(set?.duplicateIds) ? set.duplicateIds : []), ...(Array.isArray(set?.aliasIds) ? set.aliasIds : [])])) seenIds.add(id);
    seenVisible.add(visibleDartSetKey(set));
  };
  out.forEach(addSeen);

  let restored = 0;
  for (const raw of recoveryRaw || []) {
    if (!raw || typeof raw !== "object") continue;
    if (isLikelyBadRecoveredDartSet(raw)) continue;
    if (isLinkedRemoteLike(raw)) continue;
    if (isDeletedByMeta(raw, meta)) continue;
    const ds = normalizeDartSetForRuntime(raw, { allowDeleted: true });
    if (!ds || isLikelyBadRecoveredDartSet(ds) || isLinkedRemoteLike(ds) || isDeletedByMeta(ds, meta)) continue;

    const ids = uniqStrings([ds.id, ds.linkedSourceDartSetId, ...(ds.duplicateIds || []), ...(ds.aliasIds || [])]);
    if (ids.some((id) => seenIds.has(id))) continue;

    // Même nom + même visuel = doublon. Même nom sans visuel peut être un vrai set différent, on le garde.
    const vk = visibleDartSetKey(ds);
    if (vk && seenVisible.has(vk) && imageIdentity(ds)) continue;

    out.push(ds);
    addSeen(ds);
    restored += 1;
  }

  if (restored > 0) {
    diag("library-explicit-merge:restored", { primary: primaryRaw?.length || 0, recovery: recoveryRaw?.length || 0, restored, result: out.length, names: out.map((x) => `${x.name}:${x.scope}:${x.profileId}`).slice(0, 16) });
  }
  return out;
}

function readImageRecoveryRaw(): any[] {
  // Sources autorisées pour les IMAGES uniquement. Ces objets ne doivent jamais
  // créer de nouveaux sets sélectionnables, sinon profils/teams/URLs reviennent
  // dans “Choisir un set”.
  const store = appStoreSnapshot();
  return [
    ...readImageBankRaw(),
    ...readDeepRecoveryRaw(),
    ...normalizeDartSetArray(store?.dartSets || store?.dartsets),
  ];
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
  const scope = effectiveDartSetScope(set);
  const owner = scope === "public" ? "public" : selectableOwnerKey(set);
  const name = normalizeText(set?.name || set?.label || set?.title || "");
  const visual = imageIdentity(set);
  // CRITICAL X01 : la clé visible doit inclure scope + propriétaire.
  // Sinon un vieux doublon public et un privé du même nom/image se fusionnent,
  // puis le sélecteur réaffiche un privé chez les mauvais joueurs.
  if (name && visual) return `visible|${scope}|${owner}|name:${name}|visual:${visual}`;
  if (name) return `visible|${scope}|${owner}|name:${name}`;
  return `visible|${scope}|${owner}|visual:${visual || normalizeText(set?.presetId || set?.id || "")}`;
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

function normalizeDartSetForRuntime(raw: any, opts?: { allowDeleted?: boolean }): DartSet | null {
  if (!raw || typeof raw !== "object") return null;

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
  const now = Date.now();

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

  const sanitized = sanitizeDartSetForStorage(base) as DartSet;
  if (!opts?.allowDeleted && isDeletedByMeta(sanitized, cleanupDeletedKeys(readMeta()))) return null;
  return sanitized;
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

  // IMPORTANT : un set PUBLIC ne doit jamais rester rattaché à un profil local.
  // Sinon l'UI affiche l'avatar propriétaire et, à la prochaine édition, l'ancien
  // profil peut faire rebasculer le set en PRIVÉ via les vieux champs legacy.
  if (next.scope === "public") {
    next.profileId = "global";
    next.ownerProfileId = undefined;
    next.localProfileId = undefined;
    next.linkedTargetLocalProfileId = null;
    next.isPublic = true;
    next.public = true;
    next.shared = true;
    next.isPrivate = false;
    next.private = false;
  } else {
    next.profileId = s(next.profileId || next.linkedTargetLocalProfileId || next.ownerProfileId || next.localProfileId || "global");
    next.isPublic = false;
    next.public = false;
    next.shared = false;
    next.isPrivate = true;
    next.private = true;
  }

  next.id = s(next.id) || `dartset_recovered_${hashString(`${next.profileId}|${next.name}|${Date.now()}`)}`;
  next.duplicateIds = uniqStrings(Array.isArray(next.duplicateIds) ? next.duplicateIds : []).filter((id) => id !== next.id);
  next.aliasIds = uniqStrings([...(Array.isArray(next.aliasIds) ? next.aliasIds : []), ...next.duplicateIds]).filter((id) => id !== next.id);
  next.linkedTargetLocalProfileId = next.scope === "public" ? null : (s(next.linkedTargetLocalProfileId) || null);
  next.linkedOwnerUserId = s(next.linkedOwnerUserId) || null;
  next.linkedSourceProfileId = next.scope === "public" ? null : (s(next.linkedSourceProfileId) || null);
  next.linkedSourceDartSetId = s(next.linkedSourceDartSetId) || null;
  next.ownerUserId = s(next.ownerUserId) || null;
  next.userId = s(next.userId) || null;
  next.accountId = s(next.accountId) || null;
  next.createdAt = n(next.createdAt, Date.now());
  next.updatedAt = n(next.updatedAt, next.createdAt);

  if (next.kind === "photo" && !next.mainImageUrl && !next.photoDataUrl && !next.photoAssetId) next.kind = next.presetId ? "preset" : "plain";
  return next;
}

function mergePrimaryDuplicates(list: any[]): DartSet[] {
  const byKey = new Map<string, DartSet>();
  const order: string[] = [];

  const pickMetadataWinner = (a: DartSet, b: DartSet): DartSet => {
    const au = n(a?.updatedAt, 0);
    const bu = n(b?.updatedAt, 0);
    if (au !== bu) return au > bu ? a : b;
    const ac = n(a?.createdAt, 0);
    const bc = n(b?.createdAt, 0);
    if (ac !== bc) return ac > bc ? a : b;
    return scoreDartSetForCanonical(a) >= scoreDartSetForCanonical(b) ? a : b;
  };

  const pickImageWinner = (a: DartSet, b: DartSet): DartSet => {
    return scoreDartSetForCanonical(a) >= scoreDartSetForCanonical(b) ? a : b;
  };

  for (const raw of Array.isArray(list) ? list : []) {
    const normalized = normalizeDartSetForRuntime(raw);
    if (!normalized) continue;
    const key = canonicalKeyForSet(normalized);
    const old = byKey.get(key);
    if (!old) {
      byKey.set(key, normalized);
      order.push(key);
      continue;
    }

    // IMPORTANT : les champs éditables (favori, scope, propriétaire, nom, poids)
    // doivent venir de la version la plus récente. Avant, isFavorite faisait
    // un OR avec les anciens doublons, donc un favori supprimé revenait au refresh.
    // Les images, elles, peuvent venir du doublon le plus riche.
    const winner = pickMetadataWinner(normalized, old);
    const loser = winner === normalized ? old : normalized;
    const imageSource = pickImageWinner(normalized, old);

    const merged: DartSet = applyMutationLockToSet(sanitizeDartSetForStorage({
      ...winner,
      brand: winner.brand || loser.brand,
      weightGrams: winner.weightGrams ?? loser.weightGrams,
      notes: winner.notes || loser.notes,
      mainImageUrl: winner.mainImageUrl || imageSource.mainImageUrl || loser.mainImageUrl || "",
      thumbImageUrl: winner.thumbImageUrl || imageSource.thumbImageUrl || loser.thumbImageUrl,
      photoDataUrl: winner.photoDataUrl || imageSource.photoDataUrl || loser.photoDataUrl,
      imageDataUrl: winner.imageDataUrl || imageSource.imageDataUrl || loser.imageDataUrl,
      mainImageDataUrl: winner.mainImageDataUrl || imageSource.mainImageDataUrl || loser.mainImageDataUrl,
      dartSetImageDataUrl: winner.dartSetImageDataUrl || imageSource.dartSetImageDataUrl || loser.dartSetImageDataUrl,
      photoThumbDataUrl: winner.photoThumbDataUrl || imageSource.photoThumbDataUrl || loser.photoThumbDataUrl,
      thumbDataUrl: winner.thumbDataUrl || imageSource.thumbDataUrl || loser.thumbDataUrl,
      thumbImageDataUrl: winner.thumbImageDataUrl || imageSource.thumbImageDataUrl || loser.thumbImageDataUrl,
      mainImageAssetId: winner.mainImageAssetId || imageSource.mainImageAssetId || loser.mainImageAssetId || null,
      thumbImageAssetId: winner.thumbImageAssetId || imageSource.thumbImageAssetId || loser.thumbImageAssetId || null,
      photoAssetId: winner.photoAssetId || imageSource.photoAssetId || loser.photoAssetId || null,
      isFavorite: Boolean(winner.isFavorite),
      usageCount: Math.max(n(winner.usageCount, 0), n(loser.usageCount, 0)),
      lastUsedAt: Math.max(n(winner.lastUsedAt, 0), n(loser.lastUsedAt, 0)),
      createdAt: Math.min(n(winner.createdAt, Date.now()), n(loser.createdAt, Date.now())),
      updatedAt: Math.max(n(winner.updatedAt, 0), n(loser.updatedAt, 0)),
      duplicateIds: uniqStrings([winner.id, loser.id, winner.linkedSourceDartSetId, loser.linkedSourceDartSetId, ...(winner.duplicateIds || []), ...(loser.duplicateIds || []), ...(winner.aliasIds || []), ...(loser.aliasIds || [])]).filter((id) => id !== winner.id),
      aliasIds: uniqStrings([...(winner.aliasIds || []), ...(loser.aliasIds || []), winner.id, loser.id]).filter((id) => id !== winner.id),
    }) as DartSet, [winner, loser, normalized, old]);
    byKey.set(key, merged);
  }

  return order.map((key) => byKey.get(key)).filter(Boolean) as DartSet[];
}

function recoveryKeyStrict(set: any): string {
  return canonicalKeyForSet(set);
}

function recoveryKeyLoose(set: any): string {
  const name = normalizeText(set?.name || set?.label || set?.title || "");
  return name ? `name:${name}` : imageIdentity(set) ? `visual:${imageIdentity(set)}` : "";
}

function imageBankKeysForSet(set: any): string[] {
  const name = normalizeText(set?.name || set?.label || set?.title || "");
  return uniqStrings([
    s(set?.id) ? `id:${s(set?.id)}` : "",
    s(set?.linkedSourceDartSetId) ? `id:${s(set?.linkedSourceDartSetId)}` : "",
    name ? `name:${name}` : "",
    canonicalKeyForSet(set) ? `canon:${canonicalKeyForSet(set)}` : "",
    recoveryKeyLoose(set) ? `loose:${recoveryKeyLoose(set)}` : "",
    imageIdentity(set) ? `visual:${imageIdentity(set)}` : "",
  ]);
}

function extractImageBankEntry(raw: any): any | null {
  if (!raw || typeof raw !== "object") return null;
  const main = readMainImage(raw);
  const thumb = readThumbImage(raw) || main;
  const mainAsset = s(raw?.mainImageAssetId || raw?.photoAssetId || raw?.imageAssetId || raw?.dartSetImageAssetId || raw?.mediaAssetId || raw?.assetId || "");
  const thumbAsset = s(raw?.thumbImageAssetId || raw?.photoThumbAssetId || raw?.mainImageAssetId || raw?.photoAssetId || raw?.imageAssetId || "");
  if (!main && !thumb && !mainAsset && !thumbAsset) return null;
  const normalized = normalizeDartSetForRuntime(raw, { allowDeleted: true });
  if (!normalized) return null;
  return sanitizeDartSetForStorage({
    ...normalized,
    mainImageUrl: main || normalized.mainImageUrl || "",
    thumbImageUrl: thumb || normalized.thumbImageUrl,
    mainImageAssetId: mainAsset || normalized.mainImageAssetId || null,
    thumbImageAssetId: thumbAsset || normalized.thumbImageAssetId || null,
    photoAssetId: mainAsset || normalized.photoAssetId || null,
    photoDataUrl: raw.photoDataUrl || normalized.photoDataUrl,
    imageDataUrl: raw.imageDataUrl || normalized.imageDataUrl,
    mainImageDataUrl: raw.mainImageDataUrl || normalized.mainImageDataUrl,
    dartSetImageDataUrl: raw.dartSetImageDataUrl || normalized.dartSetImageDataUrl,
    photoThumbDataUrl: raw.photoThumbDataUrl || normalized.photoThumbDataUrl,
    thumbDataUrl: raw.thumbDataUrl || normalized.thumbDataUrl,
    thumbImageDataUrl: raw.thumbImageDataUrl || normalized.thumbImageDataUrl,
    updatedAt: Math.max(n(normalized.updatedAt, 0), Date.now()),
  });
}

function rememberImagesForSets(rawList: any[]) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const bank = safeLocalStorageGetJson<Record<string, any>>(IMAGE_BANK_KEY, {}) || {};
    let changed = false;
    for (const raw of rawList || []) {
      const entry = extractImageBankEntry(raw);
      if (!entry) continue;
      const keys = imageBankKeysForSet(entry);
      for (const key of keys) {
        const old = bank[key];
        if (!old || scoreDartSetForCanonical(entry) >= scoreDartSetForCanonical(old)) {
          bank[key] = entry;
          changed = true;
        }
      }
    }
    if (!changed) return;
    safeLocalStorageSetJson(IMAGE_BANK_KEY, bank, {
      sanitizeImages: false,
      compressAboveChars: 8_000,
    });
  } catch (err) {
    console.warn("[DartSetsDiag] image-bank save failed", err);
  }
}

function recoverImageForSet(set: any): DartSet | null {
  if (!set) return null;
  const candidates = readImageRecoveryRaw();
  if (!candidates.length) return null;
  const indexes = buildRecoveryIndexes(candidates);
  const strictList = indexes.strict.get(recoveryKeyStrict(set)) || [];
  const looseList = indexes.loose.get(recoveryKeyLoose(set)) || [];
  return strictList[0] || looseList[0] || null;
}

function buildRecoveryIndexes(rawRecovery: any[]) {
  const strict = new Map<string, DartSet[]>();
  const loose = new Map<string, DartSet[]>();
  const meta = cleanupDeletedKeys(readMeta());

  for (const raw of rawRecovery || []) {
    if (isDeletedByMeta(raw, meta)) continue;
    const ds = normalizeDartSetForRuntime(raw, { allowDeleted: true });
    if (!ds) continue;
    const sk = recoveryKeyStrict(ds);
    const lk = recoveryKeyLoose(ds);
    if (sk) strict.set(sk, [...(strict.get(sk) || []), ds]);
    if (lk) loose.set(lk, [...(loose.get(lk) || []), ds]);
  }

  const sort = (arr: DartSet[]) => arr.slice().sort((a, b) => scoreDartSetForCanonical(b) - scoreDartSetForCanonical(a));
  for (const [k, v] of Array.from(strict.entries())) strict.set(k, sort(v));
  for (const [k, v] of Array.from(loose.entries())) loose.set(k, sort(v));
  return { strict, loose };
}

function enrichImagesFromRecovery(primary: DartSet[], recoveryRaw: any[]): DartSet[] {
  if (!primary.length || !recoveryRaw.length) return primary;
  const indexes = buildRecoveryIndexes(recoveryRaw);

  return primary.map((item) => {
    const strictList = indexes.strict.get(recoveryKeyStrict(item)) || [];
    const looseList = indexes.loose.get(recoveryKeyLoose(item)) || [];
    const candidate = strictList[0] || looseList[0] || null;
    if (!candidate) return item;

    const hasMain = !!readMainImage(item);
    const hasThumb = !!readThumbImage(item);
    const candidateMain = readMainImage(candidate);
    const candidateThumb = readThumbImage(candidate);
    if (hasMain && hasThumb) return item;

    const next: any = { ...item };
    if (!hasMain && candidateMain) next.mainImageUrl = candidateMain;
    if (!hasThumb && (candidateThumb || candidateMain)) next.thumbImageUrl = candidateThumb || candidateMain;

    for (const key of ["photoDataUrl", "imageDataUrl", "mainImageDataUrl", "dartSetImageDataUrl", "photoThumbDataUrl", "thumbDataUrl", "thumbImageDataUrl"]) {
      if (!next[key] && (candidate as any)[key]) next[key] = (candidate as any)[key];
    }
    for (const key of ["mainImageAssetId", "thumbImageAssetId", "photoAssetId"]) {
      if (!next[key] && (candidate as any)[key]) next[key] = (candidate as any)[key];
    }
    if ((!next.presetId || next.kind === "plain") && candidate.presetId) {
      next.presetId = candidate.presetId;
      if (!next.kind || next.kind === "plain") next.kind = "preset";
    }
    if ((!next.kind || next.kind === "plain") && (candidateMain || candidateThumb)) next.kind = candidate.kind || "photo";

    return sanitizeDartSetForStorage(next) as DartSet;
  });
}

function recoverMissingPublicDartSetsForSelector(primary: DartSet[], recoveryRaw: any[]): DartSet[] {
  const meta = cleanupDeletedKeys(readMeta());
  const primaryKeys = new Set<string>();
  const primaryIds = new Set<string>();
  for (const item of primary || []) {
    primaryKeys.add(canonicalKeyForSet(item));
    primaryKeys.add(visibleDartSetKey(item));
    primaryIds.add(s(item.id));
    for (const alias of uniqStrings([item.linkedSourceDartSetId, ...(item.duplicateIds || []), ...(item.aliasIds || [])])) primaryIds.add(alias);
  }

  const recovered: DartSet[] = [];
  for (const raw of Array.isArray(recoveryRaw) ? recoveryRaw : []) {
    if (!raw || typeof raw !== "object") continue;
    if (isLikelyBadRecoveredDartSet(raw)) continue;
    if (isDeletedByMeta(raw, meta)) continue;

    // Les projections ONLINE / profils liés ne doivent jamais être ajoutées comme
    // sets publics globaux. Elles servent seulement à résoudre images/stats.
    if (isLinkedRemoteLike(raw)) continue;

    const ds = normalizeDartSetForRuntime(raw, { allowDeleted: true });
    if (!ds) continue;
    if (isDeletedByMeta(ds, meta)) continue;
    if (isLinkedRemoteLike(ds)) continue;

    const owner = readOwnerProfileId(raw) || readOwnerProfileId(ds);
    const explicitPublic = isExplicitPublicDartSet(raw) || isExplicitPublicDartSet(ds);
    const publicOwner = isPublicOwnerProfileId(owner) || isPublicOwnerProfileId(ds.profileId);
    const explicitPrivate = isExplicitPrivateDartSet(raw) || isExplicitPrivateDartSet(ds);
    const privateTarget = Boolean(s(
      raw.privateProfileId || raw.linkedTargetLocalProfileId || raw.targetLocalProfileId || raw.targetProfileId ||
      (ds as any).privateProfileId || ds.linkedTargetLocalProfileId
    ));

    // On ne récupère que les vrais sets bibliothèque/publics. Un set privé avec
    // propriétaire concret ne doit pas être proposé à tout le monde.
    const looksPublic = explicitPublic || publicOwner || effectiveDartSetScope(raw) === "public" || effectiveDartSetScope(ds) === "public";
    if (!looksPublic) continue;
    if (explicitPrivate && !explicitPublic && !publicOwner) continue;
    if (privateTarget && !explicitPublic && !publicOwner) continue;

    const publicSet = sanitizeDartSetForStorage({
      ...ds,
      scope: "public",
      profileId: "global",
      ownerProfileId: undefined,
      localProfileId: undefined,
      privateProfileId: undefined,
      linkedTargetLocalProfileId: null,
      linkedSourceProfileId: null,
      linkedRemoteDartSet: false,
      linkedRemote: false,
      __linkedRemote: false,
      remoteDartSet: false,
      isPublic: true,
      public: true,
      shared: true,
      isPrivate: false,
      private: false,
    }) as DartSet;

    if (!publicSet?.id) continue;
    if (primaryIds.has(publicSet.id) || primaryIds.has(s(publicSet.linkedSourceDartSetId))) continue;
    if (primaryKeys.has(canonicalKeyForSet(publicSet)) || primaryKeys.has(visibleDartSetKey(publicSet))) continue;
    recovered.push(publicSet);
    primaryKeys.add(canonicalKeyForSet(publicSet));
    primaryKeys.add(visibleDartSetKey(publicSet));
    primaryIds.add(publicSet.id);
  }

  if (recovered.length) {
    diag("public-recovery:selector", {
      recovered: recovered.length,
      names: recovered.map((x) => `${x.name}:${x.id}`).slice(0, 12),
    });
  }
  return recovered;
}

function loadPrimaryAuthoritative(): DartSet[] {
  try {
    const primaryExists = hasLocalStorageKey(STORAGE_KEY);
    const primaryRaw = readPrimaryRaw();
    const recovery = readRecoveryRaw();
    const imageRecovery = readImageRecoveryRaw();

    // Source de vérité stricte : si dc_dart_sets_v1 existe, on ne recrée plus
    // aucun set sélectionnable depuis appStore/legacy. Ces sources peuvent être
    // en retard et réinjectaient les anciens statuts public/privé après édition.
    const raw = primaryExists
      ? filterOutPollutedDartSets(primaryRaw)
      : filterOutPollutedDartSets(recovery);

    rememberImagesForSets([...raw, ...imageRecovery]);
    const primary = mergePrimaryDuplicates(raw);
    const finalList = enrichImagesFromRecovery(primary, imageRecovery).filter((set) => !isLikelyBadRecoveredDartSet(set));
    installDartSetsDiagnostics(finalList, primaryExists ? [] : recovery);
    return finalList;
  } catch (err) {
    console.warn("[dartSetsStore] load error", err);
    return [];
  }
}

function stripHeavyInlineImagesForFallback(list: DartSet[]): DartSet[] {
  return (Array.isArray(list) ? list : []).map((item: any) => {
    const next: any = { ...(item || {}) };
    for (const key of ["mainImageUrl", "thumbImageUrl", "photoDataUrl", "imageDataUrl", "mainImageDataUrl", "dartSetImageDataUrl", "photoThumbDataUrl", "thumbDataUrl", "thumbImageDataUrl"]) {
      if (typeof next[key] === "string" && next[key].startsWith("data:image/") && next[key].length > MAX_DARTSET_IMAGE_DATA_URL_CHARS) {
        if (key === "mainImageUrl") next[key] = "";
        else delete next[key];
      }
    }
    if (next.kind === "photo" && !next.mainImageUrl && !next.photoDataUrl && !next.photoAssetId) next.kind = next.presetId ? "preset" : "plain";
    return next;
  }) as DartSet[];
}

function savePrimary(list: DartSet[], reason = "save"): boolean {
  const cleanInput = filterOutPollutedDartSets(Array.isArray(list) ? list : []);
  rememberImagesForSets(cleanInput);
  const sanitized = mergePrimaryDuplicates(cleanInput).map((item) => sanitizeDartSetForStorage(item)) as DartSet[];
  let saved = false;

  try {
    // 1er essai : ne pas couper les photos valides. Le packer compresse déjà la clé.
    saved = !!safeLocalStorageSetJson(STORAGE_KEY, sanitized, {
      sanitizeImages: false,
      compressAboveChars: 12_000,
    });
  } catch (err) {
    console.warn("[dartSetsStore] save error", err);
    saved = false;
  }

  if (!saved) {
    try {
      saved = !!safeLocalStorageSetJson(STORAGE_KEY, sanitized, {
        sanitizeImages: true,
        imageMaxChars: MAX_DARTSET_IMAGE_DATA_URL_CHARS,
        compressAboveChars: 12_000,
      });
    } catch (err) {
      console.warn("[dartSetsStore] save sanitized error", err);
      saved = false;
    }
  }

  if (!saved) {
    try {
      const stripped = stripHeavyInlineImagesForFallback(sanitized);
      saved = !!safeLocalStorageSetJson(STORAGE_KEY, stripped, {
        sanitizeImages: true,
        imageMaxChars: MAX_DARTSET_IMAGE_DATA_URL_CHARS,
        compressAboveChars: 4_000,
      });
      if (saved) diag("save:fallback-stripped", { reason, count: stripped.length });
    } catch (fallbackErr) {
      console.warn("[dartSetsStore] fallback save error", fallbackErr);
      saved = false;
    }
  }

  if (!saved) {
    diag("save:failed", { reason, count: sanitized.length });
    return false;
  }

  const meta = cleanupDeletedKeys(readMeta());
  writeMeta({ ...meta, initialized: true });
  invalidateLoadAllCache();

  try {
    if (typeof window !== "undefined") {
      const w: any = window as any;
      try {
        if (w?.__appStore?.update) {
          w.__appStore.update((st: any) => {
            const prev = Array.isArray((st || {}).dartSets) ? (st || {}).dartSets : [];
            try {
              if (JSON.stringify(prev) === JSON.stringify(sanitized)) return st;
            } catch {}
            return { ...(st || {}), dartSets: sanitized };
          });
        }
      } catch (e) {
        console.warn("[dartSetsStore] appStore update failed", e);
      }
      window.dispatchEvent(new Event("dc-dartsets-updated"));
      try {
        if (typeof w?.__markNasSyncDirty === "function") w.__markNasSyncDirty(`dartsets_${reason}`);
      } catch {}
      // Évite le cas constaté : l'utilisateur modifie un set puis rafraîchit
      // immédiatement avant que l'auto-save React/IDB n'ait persisté le store.
      try {
        if (typeof w?.__flushLocalStoreNow === "function") {
          setTimeout(() => {
            try { w.__flushLocalStoreNow(`dartsets_${reason}`); } catch {}
          }, 0);
        }
      } catch {}
    }
  } catch {}

  diag("save:ok", { reason, count: sanitized.length, ids: sanitized.map((x) => `${x.name}:${x.id}`).slice(0, 8) });
  return true;
}

let loadAllCacheAt = 0;
let loadAllCache: DartSet[] | null = null;

function invalidateLoadAllCache() {
  loadAllCacheAt = 0;
  loadAllCache = null;
}

function loadAll(): DartSet[] {
  const now = Date.now();
  if (loadAllCache && now - loadAllCacheAt < 750) return loadAllCache.slice();
  loadAllCache = loadPrimaryAuthoritative();
  loadAllCacheAt = now;
  return loadAllCache.slice();
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

  // Ne pas mapper un compte utilisateur vers le profil actif : en X01, cela
  // rend les sets privés du profil actif visibles pour les autres profils.
  return aliases;
}

function collectSelectableOwnerIds(set: any): string[] {
  return uniqStrings([
    set?.profileId,
    set?.profile_id,
    set?.ownerProfileId,
    set?.localProfileId,
    set?.linkedTargetLocalProfileId,
    set?.privateProfileId,
    set?.targetLocalProfileId,
    set?.targetProfileId,
  ]).filter((id) => !isPublicOwnerProfileId(id));
}

function collectStrictProfileIds(profileId: string): Set<string> {
  const ids = new Set<string>();
  const add = (v: any) => {
    const id = s(v);
    if (id && !isPublicOwnerProfileId(id)) ids.add(id);
  };
  const pid = s(profileId);
  add(pid);

  // Alias stricts seulement : on ne prend que les identifiants portés par
  // l'objet profil qui correspond déjà à profileId. On ne mappe plus
  // accountId -> activeProfile, car cela rendait les sets privés visibles
  // pour plusieurs joueurs dans X01.
  try {
    const store = appStoreSnapshot();
    const roots = [
      store?.currentProfile,
      store?.activeProfile,
      store?.profile,
      ...(Array.isArray(store?.profiles) ? store.profiles : []),
      ...(Array.isArray(store?.localProfiles) ? store.localProfiles : []),
      ...(Array.isArray(store?.players) ? store.players : []),
    ].filter(Boolean);
    const profileKeys = ["id", "profileId", "localProfileId", "playerId", "pid", "uid", "uuid", "linkedSourceLocalProfileId", "linkedTargetLocalProfileId", "ownerProfileId"];
    for (const obj of roots) {
      const vals = uniqStrings(profileKeys.map((k) => obj?.[k]));
      if (vals.includes(pid)) vals.forEach(add);
    }
  } catch {}

  return ids;
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
  if (isSelectablePublicForEveryProfile(set)) return true;

  // PRIVÉ = exclusif au profil propriétaire.
  // On n'utilise plus les alias de compte larges : ils rendaient Romrom / Zen JuJi
  // visibles chez Ninja, Chevroute, Lehna, etc.
  const profileIds = collectStrictProfileIds(profileId);
  if (!profileIds.size) return false;
  const owners = collectSelectableOwnerIds(set);
  if (!owners.length) return false;
  return owners.some((id) => profileIds.has(id));
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
      continue;
    }
    const winner = scoreDartSetForCanonical(set) > scoreDartSetForCanonical(old) ? set : old;
    const loser = winner === set ? old : set;
    byKey.set(key, sanitizeDartSetForStorage({
      ...winner,
      // Visible merge : garder surtout la version avec image, mais additionner les aliases.
      duplicateIds: uniqStrings([winner.id, loser.id, winner.linkedSourceDartSetId, loser.linkedSourceDartSetId, ...(winner.duplicateIds || []), ...(loser.duplicateIds || []), ...(winner.aliasIds || []), ...(loser.aliasIds || [])]).filter((id) => id !== winner.id),
      aliasIds: uniqStrings([...(winner.aliasIds || []), ...(loser.aliasIds || []), winner.id, loser.id]).filter((id) => id !== winner.id),
    }) as DartSet);
  }
  return order.map((key) => byKey.get(key)).filter(Boolean) as DartSet[];
}

function findDartSetByIdIn(list: DartSet[], id: any): DartSet | undefined {
  const sid = s(id);
  if (!sid) return undefined;
  return (list || []).find((set) => dartSetMatchesAnyId(set, sid));
}

function deletionKeysForSet(set: any): string[] {
  if (!set) return [];
  return uniqStrings([
    `id:${set.id}`,
    `canon:${canonicalKeyForSet(set)}`,
    `source:${set.linkedSourceDartSetId}`,
    ...(Array.isArray(set.duplicateIds) ? set.duplicateIds.map((id: string) => `id:${id}`) : []),
    ...(Array.isArray(set.aliasIds) ? set.aliasIds.map((id: string) => `id:${id}`) : []),
  ]);
}

function markDeleted(set: DartSet) {
  const meta = cleanupDeletedKeys(readMeta());
  const deletedKeys = { ...(meta.deletedKeys || {}) };
  const now = Date.now();
  for (const key of deletionKeysForSet(set)) deletedKeys[key] = now;
  writeMeta({ ...meta, initialized: true, deletedKeys });
}
function mutationLockKeysForSet(set: any): string[] {
  if (!set) return [];
  return uniqStrings([
    s(set?.id) ? `id:${s(set.id)}` : "",
    s(set?.linkedSourceDartSetId) ? `id:${s(set.linkedSourceDartSetId)}` : "",
    s(set?.linkedSourceDartSetId) ? `source:${s(set.linkedSourceDartSetId)}` : "",
    canonicalKeyForSet(set) ? `canon:${canonicalKeyForSet(set)}` : "",
    ...(Array.isArray(set?.duplicateIds) ? set.duplicateIds.map((id: string) => `id:${id}`) : []),
    ...(Array.isArray(set?.aliasIds) ? set.aliasIds.map((id: string) => `id:${id}`) : []),
  ]);
}

function editableLockValues(set: any): DartSetMutationLock["values"] {
  const scope: "private" | "public" = effectiveDartSetScope(set);
  return {
    scope,
    profileId: scope === "public" ? "global" : s(set?.profileId || set?.privateProfileId || set?.ownerProfileId || set?.localProfileId || "global"),
    isFavorite: Boolean(set?.isFavorite),
    name: s(set?.name) || "Mes fléchettes",
    brand: s(set?.brand) || undefined,
    weightGrams: Number.isFinite(Number(set?.weightGrams)) ? Number(set.weightGrams) : undefined,
    notes: s(set?.notes) || undefined,
    bgColor: s(set?.bgColor) || undefined,
    kind: normalizeKind(set?.kind),
    presetId: s(set?.presetId) || undefined,
  };
}

function readMutationLockForSet(...sets: any[]): DartSetMutationLock | null {
  const meta = cleanupDeletedKeys(readMeta());
  let best: DartSetMutationLock | null = null;
  for (const set of sets || []) {
    for (const key of mutationLockKeysForSet(set)) {
      const lock = meta.mutationLocks?.[key];
      if (!lock) continue;
      if (!best || Number(lock.at || 0) > Number(best.at || 0)) best = lock;
    }
  }
  return best;
}

function applyMutationLockToSet<T extends any>(set: T, related: any[] = []): T {
  if (!set || typeof set !== "object") return set;
  const lock = readMutationLockForSet(set, ...(related || []));
  if (!lock?.values) return set;
  const values: any = { ...(lock.values || {}) };
  if (values.scope === "public") {
    values.profileId = "global";
    values.linkedTargetLocalProfileId = null;
    values.linkedSourceProfileId = null;
    values.isPublic = true;
    values.public = true;
    values.shared = true;
    values.isPrivate = false;
    values.private = false;
  } else if (values.scope === "private") {
    values.profileId = s(values.profileId || (set as any).profileId || "global");
    values.linkedTargetLocalProfileId = null;
    values.isPublic = false;
    values.public = false;
    values.shared = false;
    values.isPrivate = true;
    values.private = true;
  }
  return sanitizeDartSetForStorage({
    ...(set as any),
    ...values,
    updatedAt: Math.max(n((set as any).updatedAt, 0), Number(lock.at || 0)),
  }) as T;
}

function rememberMutationLock(before: any, after: any, reason: string) {
  try {
    const normalizedBefore = normalizeDartSetForRuntime(before, { allowDeleted: true });
    const normalizedAfter = normalizeDartSetForRuntime(after, { allowDeleted: true });
    if (!normalizedAfter) return;
    const meta = cleanupDeletedKeys(readMeta());
    const mutationLocks = { ...(meta.mutationLocks || {}) };
    const at = Date.now();
    const lock: DartSetMutationLock = { at, values: editableLockValues(normalizedAfter) };
    const keys = uniqStrings([
      ...mutationLockKeysForSet(normalizedBefore),
      ...mutationLockKeysForSet(normalizedAfter),
    ]);
    for (const key of keys) mutationLocks[key] = lock;
    writeMeta({ ...meta, initialized: true, mutationLocks });
    diag("mutation-lock:set", { reason, keys: keys.slice(0, 8), values: lock.values });
  } catch (err) {
    console.warn("[DartSetsDiag] mutation-lock failed", err);
  }
}


function findSameIdentitySet(list: DartSet[], incoming: DartSet): DartSet | undefined {
  return (Array.isArray(list) ? list : []).find((current) => {
    if (!current || !incoming) return false;
    if (dartSetMatchesAnyId(current, incoming.id) || dartSetMatchesAnyId(incoming, current.id)) return true;
    const a = s(current.linkedSourceDartSetId);
    const b = s(incoming.linkedSourceDartSetId);
    return !!a && !!b && a === b;
  });
}

function mergeImageFieldsKeepMetadata(authoritative: DartSet, imageSource: DartSet): DartSet {
  if (!authoritative || !imageSource) return authoritative;
  return sanitizeDartSetForStorage({
    ...authoritative,
    mainImageUrl: authoritative.mainImageUrl || imageSource.mainImageUrl || "",
    thumbImageUrl: authoritative.thumbImageUrl || imageSource.thumbImageUrl,
    photoDataUrl: authoritative.photoDataUrl || imageSource.photoDataUrl,
    imageDataUrl: authoritative.imageDataUrl || imageSource.imageDataUrl,
    mainImageDataUrl: authoritative.mainImageDataUrl || imageSource.mainImageDataUrl,
    dartSetImageDataUrl: authoritative.dartSetImageDataUrl || imageSource.dartSetImageDataUrl,
    photoThumbDataUrl: authoritative.photoThumbDataUrl || imageSource.photoThumbDataUrl,
    thumbDataUrl: authoritative.thumbDataUrl || imageSource.thumbDataUrl,
    thumbImageDataUrl: authoritative.thumbImageDataUrl || imageSource.thumbImageDataUrl,
    mainImageAssetId: authoritative.mainImageAssetId || imageSource.mainImageAssetId || null,
    thumbImageAssetId: authoritative.thumbImageAssetId || imageSource.thumbImageAssetId || null,
    photoAssetId: authoritative.photoAssetId || imageSource.photoAssetId || null,
    duplicateIds: uniqStrings([authoritative.id, imageSource.id, authoritative.linkedSourceDartSetId, imageSource.linkedSourceDartSetId, ...(authoritative.duplicateIds || []), ...(imageSource.duplicateIds || []), ...(authoritative.aliasIds || []), ...(imageSource.aliasIds || [])]).filter((id) => id !== authoritative.id),
    aliasIds: uniqStrings([...(authoritative.aliasIds || []), ...(imageSource.aliasIds || []), imageSource.id]).filter((id) => id !== authoritative.id),
  }) as DartSet;
}

function mergeIncomingWithCurrentPrimary(incomingRaw: any[], reason: string): DartSet[] {
  const incoming = mergePrimaryDuplicates(filterOutPollutedDartSets(Array.isArray(incomingRaw) ? incomingRaw : []));
  const primaryExists = hasLocalStorageKey(STORAGE_KEY);
  const current = primaryExists ? loadPrimaryAuthoritative() : [];

  if (!primaryExists || current.length === 0) return incoming;

  const currentById = new Map<string, DartSet>();
  const out: DartSet[] = [];
  for (const cur of current) {
    currentById.set(String(cur.id), cur);
    out.push(cur);
  }

  const added: DartSet[] = [];
  let keptLocal = 0;
  let acceptedIncoming = 0;

  for (const inc of incoming) {
    const same = findSameIdentitySet(out, inc);
    if (same) {
      const incomingIsNewer = n(inc.updatedAt, 0) > n(same.updatedAt, 0) + 250;
      const merged = applyMutationLockToSet(
        incomingIsNewer ? mergeImageFieldsKeepMetadata(inc, same) : mergeImageFieldsKeepMetadata(same, inc),
        [same, inc]
      );
      const idx = out.findIndex((x) => String(x.id) === String(same.id));
      if (idx >= 0) out[idx] = merged;
      if (incomingIsNewer) acceptedIncoming += 1;
      else keptLocal += 1;
      continue;
    }

    const sameCanonical = out.find((cur) => canonicalKeyForSet(cur) === canonicalKeyForSet(inc));
    if (sameCanonical) {
      const incomingIsNewer = n(inc.updatedAt, 0) > n(sameCanonical.updatedAt, 0) + 250;
      const merged = applyMutationLockToSet(
        incomingIsNewer ? mergeImageFieldsKeepMetadata(inc, sameCanonical) : mergeImageFieldsKeepMetadata(sameCanonical, inc),
        [sameCanonical, inc]
      );
      const idx = out.findIndex((x) => String(x.id) === String(sameCanonical.id));
      if (idx >= 0) out[idx] = merged;
      if (incomingIsNewer) acceptedIncoming += 1;
      else keptLocal += 1;
      continue;
    }

    // Nouveau set réellement absent : on l'accepte. Les sets supprimés sont déjà
    // filtrés par normalizeDartSetForRuntime/isDeletedByMeta dans mergePrimaryDuplicates.
    added.push(inc);
    acceptedIncoming += 1;
  }

  const merged = mergePrimaryDuplicates([...out, ...added]);
  diag("replaceAll:merge-current", { reason, current: current.length, incoming: incoming.length, result: merged.length, keptLocal, acceptedIncoming, added: added.length });
  return merged;
}

function replacePrimaryWith(list: any[], reason: string): boolean {
  const merged = mergeIncomingWithCurrentPrimary(Array.isArray(list) ? list : [], reason);
  const enriched = enrichImagesFromRecovery(merged, [...loadPrimaryAuthoritative(), ...readImageRecoveryRaw(), ...(Array.isArray(list) ? list : [])]);
  return savePrimary(enriched, reason);
}

function installDartSetsDiagnostics(list: DartSet[] = [], recovery: any[] = []) {
  try {
    if (typeof window === "undefined") return;
    const w: any = window as any;
    if (w.__DARTSETS_IMAGE_DIAG_INSTALLED__) return;
    w.__DARTSETS_IMAGE_DIAG_INSTALLED__ = true;
    w.__DARTSETS_IMAGE_DIAG = () => {
      const sets = loadPrimaryAuthoritative();
      const rows = sets.map((set) => ({
        id: set.id,
        name: set.name,
        scope: set.scope,
        profileId: set.profileId,
        kind: set.kind,
        presetId: set.presetId,
        main: Boolean(readMainImage(set)),
        thumb: Boolean(readThumbImage(set)),
        recoveredMain: Boolean(recoverImageForSet(set) && readMainImage(recoverImageForSet(set))),
        imageKeys: Object.keys(set || {}).filter((k) => /image|photo|thumb|asset|url/i.test(k)),
      }));
      console.table(rows);
      console.info("[DartSetsDiag] image recovery", { officialCount: sets.length, recoveryCount: readRecoveryRaw().length, bankCount: readImageBankRaw().length });
      return rows;
    };
    w.__DARTSETS_CLEAN_POLLUTION_NOW = () => {
      const before = readPrimaryRaw();
      const clean = filterOutPollutedDartSets(before);
      const ok = savePrimary(clean as any, "manual-clean-pollution");
      console.info("[DartSetsDiag] clean-pollution", { before: before.length, after: clean.length, ok });
      return { before: before.length, after: clean.length, ok };
    };
    w.__DARTSETS_SELECTABLE_DIAG = (profileId: string) => {
      const pid = s(profileId);
      const all = loadPrimaryAuthoritative();
      const selector = getDartSetsForProfile(pid);
      const rows = selector.map((set) => ({
        id: set.id,
        name: set.name,
        scope: effectiveDartSetScope(set),
        profileId: set.profileId,
        public: effectiveDartSetScope(set) === "public",
        visibleForProfile: pid ? profileCanSeeDartSet(set, pid) : false,
        owners: collectSelectableOwnerIds(set).join(","),
        hasImage: Boolean(readMainImage(set) || readThumbImage(set)),
      }));
      console.table(rows);
      console.info("[DartSetsDiag] selectable", { profileId: pid, officialTotal: all.length, selectorTotal: rows.length, visible: rows.filter((r) => r.visibleForProfile || r.public).length, public: rows.filter((r) => r.public).length });
      return rows;
    };
    diag("image-diag:installed", { officialCount: list.length, recoveryCount: recovery.length });
  } catch {}
}


function bgForPresetTheme(theme: any): string {
  const t = s(theme).toLowerCase();
  if (t === "gold" || t === "yellow") return "#8a6d3b";
  if (t === "red") return "#f05252";
  if (t === "green") return "#214c3d";
  if (t === "blue") return "#203f70";
  if (t === "pink") return "#e648b8";
  if (t === "purple") return "#4a2f70";
  if (t === "white") return "#4b4b4b";
  return "#25273a";
}

function getBuiltInPublicPresetDartSets(_existing: DartSet[] = []): DartSet[] {
  // Désactivé : le sélecteur ne doit jamais inventer de sets depuis les presets.
  // Il doit afficher uniquement les dartsets réellement présents dans MES FLÉCHETTES.
  return [];
}

function withSelectorPublicFallback(visible: DartSet[], _all: DartSet[], reason: string): DartSet[] {
  const cleanVisible = dedupeVisibleDartSets((visible || []).filter((set) => !isLikelyBadRecoveredDartSet(set)));
  try {
    diag("selector:official-only", {
      reason,
      count: cleanVisible.length,
      publicCount: cleanVisible.filter((set) => effectiveDartSetScope(set) === "public").length,
      privateCount: cleanVisible.filter((set) => effectiveDartSetScope(set) !== "public").length,
      names: cleanVisible.map((x) => `${x.name}:${x.scope}:${x.profileId}`).slice(0, 16),
    });
  } catch {}
  return cleanVisible;
}

// -------------------------------------------------------------
// API publique
// -------------------------------------------------------------

export function getAllDartSets(): DartSet[] {
  return loadAll();
}

export function getAllSelectableDartSets(): DartSet[] {
  // MES FLÉCHETTES = bibliothèque officielle créée par l'utilisateur.
  // On accepte aussi les dartsets explicites présents dans appStore/anciennes clés
  // pour réparer les publics perdus, mais jamais les presets inventés / profils / teams / URLs.
  return dedupeVisibleDartSets(
    loadAll().filter((set) => !isLikelyBadRecoveredDartSet(set))
  );
}

export function setAllDartSets(list: DartSet[]) {
  return replacePrimaryWith(Array.isArray(list) ? list : [], "setAll");
}



function isSelectablePublicForEveryProfile(set: any): boolean {
  if (!set || isLikelyBadRecoveredDartSet(set) || isLinkedRemoteLike(set)) return false;
  // Public explicite : source de vérité. On ignore les vieux flags private
  // résiduels quand scope/visibility/access/isPublic/public/shared dit public.
  if (isExplicitPublicDartSet(set)) return true;
  // Ancien format : owner global/public sans cible privée = public.
  const owner = readOwnerProfileId(set);
  const hasPrivateTarget = Boolean(s(set?.privateProfileId || set?.linkedTargetLocalProfileId || set?.targetLocalProfileId || set?.targetProfileId));
  if (!hasPrivateTarget && isExplicitPublicOwnerProfileId(owner)) return true;
  return false;
}

export function getPublicDartSetsForSelector(): DartSet[] {
  // Sélecteurs de partie : publics disponibles pour ABSOLUMENT tous les joueurs.
  // IMPORTANT : on lit uniquement loadAll() = dc_dart_sets_v1 normalisé.
  // readRecoveryRaw() contenait parfois l'ancien état d'un set avant édition
  // (ex-public resté public), ce qui annulait le passage public -> privé.
  const raw = loadAll();
  const publics = raw
    .map((item: any) => normalizeDartSetForRuntime(item, { allowDeleted: true }))
    .filter(Boolean)
    .filter((set: any) => isSelectablePublicForEveryProfile(set))
    .map((set: any) => sanitizeDartSetForStorage({
      ...set,
      scope: "public",
      profileId: "global",
      ownerProfileId: undefined,
      localProfileId: undefined,
      privateProfileId: undefined,
      linkedTargetLocalProfileId: null,
      isPublic: true,
      public: true,
      shared: true,
      isPrivate: false,
      private: false,
    }) as DartSet);
  return dedupeVisibleDartSets(publics);
}

export function getDartSetsForProfile(profileId: string): DartSet[] {
  const pid = s(profileId);
  const all = getAllSelectableDartSets();
  const publics = getPublicDartSetsForSelector();
  const privateForOwner = all.filter((set) => {
    if (!set || isLikelyBadRecoveredDartSet(set) || isLinkedRemoteLike(set)) return false;
    if (isSelectablePublicForEveryProfile(set)) return false;
    // Tout ce qui n'est pas public est privé : visible seulement si le propriétaire
    // matche le profil demandé. Aucun fallback global, aucun privé des autres.
    return pid ? profileCanSeeDartSet(set, pid) : false;
  });
  const result = withSelectorPublicFallback([...publics, ...privateForOwner], all, `profile:${pid || "none"}`);
  try {
    diag("selector:profile-result", {
      profileId: pid,
      all: all.length,
      result: result.length,
      publicResult: result.filter((x) => isSelectablePublicForEveryProfile(x)).length,
      privateResult: result.filter((x) => !isSelectablePublicForEveryProfile(x)).length,
      names: result.map((x) => `${x.name}:${x.scope}:${x.profileId}`).slice(0, 20),
    });
  } catch {}
  return result;
}

export function getDartSetById(id: DartSetId): DartSet | undefined {
  return findDartSetByIdIn(loadAll(), id);
}

export function getCanonicalDartSetId(id: DartSetId | null | undefined, profileId?: string | null): string | null {
  const sid = s(id);
  if (!sid) return null;
  const pid = s(profileId);
  const visible = pid ? getDartSetsForProfile(pid) : [];
  const visibleHit = findDartSetByIdIn(visible, sid);
  if (visibleHit?.id) return String(visibleHit.id);
  const globalHit = findDartSetByIdIn(loadAll(), sid);
  return globalHit?.id ? String(globalHit.id) : sid;
}

export function getDartSetAliases(id: DartSetId | null | undefined): string[] {
  const set = getDartSetById(s(id));
  if (!set) return s(id) ? [s(id)] : [];
  return uniqStrings([set.id, set.linkedSourceDartSetId, ...(set.duplicateIds || []), ...(set.aliasIds || [])]);
}

export function getDartSetMainImageSrc(set: any): string | null {
  const src = readMainImage(set);
  if (src) return src;
  const recovered = recoverImageForSet(set);
  const recoveredSrc = recovered ? readMainImage(recovered) || readThumbImage(recovered) : "";
  if (!recoveredSrc) {
    try { console.info("[DartSetsDiag] image:missing", { id: set?.id, name: set?.name, presetId: set?.presetId, keys: Object.keys(set || {}).filter((k) => /image|photo|thumb|asset|url/i.test(k)) }); } catch {}
  }
  return recoveredSrc || null;
}

export function getDartSetThumbImageSrc(set: any): string | null {
  const src = readThumbImage(set) || readMainImage(set);
  if (src) return src;
  const recovered = recoverImageForSet(set);
  const recoveredSrc = recovered ? readThumbImage(recovered) || readMainImage(recovered) : "";
  return recoveredSrc || null;
}

function normalizeDartSetMutationPatch(patch: any): any {
  const next: any = { ...(patch || {}) };
  if (Object.prototype.hasOwnProperty.call(next, "scope")) {
    const scope: "private" | "public" = next.scope === "public" ? "public" : "private";
    next.scope = scope;
    if (scope === "public") {
      next.profileId = "global";
      next.ownerProfileId = undefined;
      next.localProfileId = undefined;
      next.linkedTargetLocalProfileId = null;
      next.linkedSourceProfileId = null;
      next.linkedRemoteDartSet = false;
      next.linkedRemote = false;
      next.__linkedRemote = false;
      next.remoteDartSet = false;
      next.isPublic = true;
      next.public = true;
      next.shared = true;
      next.isPrivate = false;
      next.private = false;
    } else {
      next.profileId = s(next.profileId || next.privateProfileId || next.ownerProfileId || next.localProfileId || "global");
      next.linkedTargetLocalProfileId = null;
      next.linkedRemoteDartSet = false;
      next.linkedRemote = false;
      next.__linkedRemote = false;
      next.remoteDartSet = false;
      next.isPublic = false;
      next.public = false;
      next.shared = false;
      next.isPrivate = true;
      next.private = true;
    }
  }
  return next;
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
  const wantedScope: "private" | "public" = input.scope === "public" ? "public" : "private";
  const payload = normalizeDartSetForRuntime(normalizeDartSetMutationPatch({
    ...input,
    profileId: wantedScope === "public" ? "global" : input.profileId,
    id: `dartset_${now}_${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    updatedAt: now,
    scope: wantedScope,
  }));
  if (!payload) return undefined;

  const existing = all.find((set) => canonicalKeyForSet(set) === canonicalKeyForSet(payload));
  if (existing) {
    diag("create:dedupe-update", { existing: existing.id, name: payload.name, profileId: payload.profileId, scope: payload.scope });
    return updateDartSet(existing.id, {
      name: payload.name,
      brand: payload.brand,
      weightGrams: payload.weightGrams,
      notes: payload.notes,
      mainImageUrl: payload.mainImageUrl || existing.mainImageUrl || "",
      thumbImageUrl: payload.thumbImageUrl || existing.thumbImageUrl,
      bgColor: payload.bgColor || existing.bgColor,
      photoDataUrl: payload.photoDataUrl || existing.photoDataUrl,
      imageDataUrl: payload.imageDataUrl || existing.imageDataUrl,
      mainImageDataUrl: payload.mainImageDataUrl || existing.mainImageDataUrl,
      dartSetImageDataUrl: payload.dartSetImageDataUrl || existing.dartSetImageDataUrl,
      photoThumbDataUrl: payload.photoThumbDataUrl || existing.photoThumbDataUrl,
      thumbDataUrl: payload.thumbDataUrl || existing.thumbDataUrl,
      thumbImageDataUrl: payload.thumbImageDataUrl || existing.thumbImageDataUrl,
      kind: payload.kind,
      presetId: payload.presetId,
      scope: payload.scope,
      profileId: payload.profileId,
    } as any);
  }

  if (all.filter((set) => String(set.profileId) === String(payload.profileId)).length === 0) payload.isFavorite = true;
  const next = [...all, payload];
  if (!savePrimary(next, "create")) return undefined;
  diag("create:ok", { id: payload.id, name: payload.name, profileId: payload.profileId, scope: payload.scope });
  return getDartSetById(payload.id) || payload;
}

export function updateDartSet(id: DartSetId, patch: Partial<Omit<DartSet, "id" | "createdAt">>): DartSet | undefined {
  const mutationPatch = normalizeDartSetMutationPatch(patch);
  const all = loadAll();
  const target = findDartSetByIdIn(all, id);
  if (!target) {
    diag("update:not-found", { id, patch: mutationPatch });
    return undefined;
  }

  const lockDraft = sanitizeDartSetForStorage({
    ...target,
    ...mutationPatch,
    id: target.id,
    updatedAt: Date.now(),
  }) as DartSet;
  rememberMutationLock(target, lockDraft, "update");

  const next = all.map((set) => {
    if (!dartSetMatchesAnyId(set, target.id) && !dartSetMatchesAnyId(set, id)) return set;
    return sanitizeDartSetForStorage({
      ...set,
      ...mutationPatch,
      id: set.id,
      duplicateIds: uniqStrings([...(set.duplicateIds || []), ...(Array.isArray((mutationPatch as any).duplicateIds) ? (mutationPatch as any).duplicateIds : [])]),
      aliasIds: uniqStrings([...(set.aliasIds || []), ...(Array.isArray((mutationPatch as any).aliasIds) ? (mutationPatch as any).aliasIds : [])]),
      updatedAt: Date.now(),
    }) as DartSet;
  });

  const saved = savePrimary(next, "update");
  if (!saved) return undefined;
  const updated = getDartSetById(target.id);
  diag("update:ok", { id, canonicalId: target.id, name: updated?.name, profileId: updated?.profileId, scope: updated?.scope, isFavorite: updated?.isFavorite });
  return updated;
}

export function deleteDartSet(id: DartSetId): boolean {
  const all = loadAll();
  const target = findDartSetByIdIn(all, id);
  if (!target) {
    diag("delete:not-found", { id, count: all.length });
    return false;
  }

  markDeleted(target);
  const targetCanonical = canonicalKeyForSet(target);
  const targetImage = imageIdentity(target);
  const targetName = normalizeText(target.name);
  const targetAliases = new Set(uniqStrings([target.id, target.linkedSourceDartSetId, ...(target.duplicateIds || []), ...(target.aliasIds || []), id]));

  const filtered = all.filter((set) => {
    if (dartSetMatchesAnyId(set, id)) return false;
    if (targetAliases.has(set.id) || targetAliases.has(s(set.linkedSourceDartSetId))) return false;
    if (canonicalKeyForSet(set) === targetCanonical) return false;
    // Cas doublons anciens : même nom + même image, mais propriétaire/scope corrompus.
    if (targetName && normalizeText(set.name) === targetName && targetImage && imageIdentity(set) === targetImage) return false;
    return true;
  });

  const ok = savePrimary(filtered, "delete");
  diag("delete:result", { id, canonicalId: target.id, name: target.name, before: all.length, after: filtered.length, ok });
  return ok;
}

export function setFavoriteDartSet(profileId: string, dartSetId: DartSetId) {
  const set = getDartSetById(dartSetId);
  if (!set) return false;
  if (!profileCanSeeDartSet(set, profileId)) return false;
  return !!updateDartSet(set.id, { isFavorite: !set.isFavorite } as any);
}

export function bumpDartSetUsage(dartSetId: DartSetId) {
  const set = getDartSetById(dartSetId);
  if (!set) return;
  const now = Date.now();
  return updateDartSet(set.id, { usageCount: (set.usageCount ?? 0) + 1, lastUsedAt: now } as any);
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
  const own = (set: DartSet) => effectiveDartSetScope(set) !== "public" && collectSelectableOwnerIds(set).some((id) => aliases.has(id));
  return visible.filter((set) => own(set) && set.isFavorite).sort(byPriority)[0] || visible.filter(own).sort(byPriority)[0] || visible.slice().sort(byPriority)[0];
}

export function replaceAllDartSets(list: DartSet[]) {
  return replacePrimaryWith(Array.isArray(list) ? list : [], "replaceAll");
}
