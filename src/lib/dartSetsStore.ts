import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "./imageStorageCodec";

// =============================================================
// src/lib/dartSetsStore.ts
// Gestion des jeux de fléchettes ("Dart Sets")
// ✅ PATCH DARTSETS CANONIQUES
// - dédoublonnage automatique par propriétaire + nom normalisé
// - conservation des anciens ids dans duplicateIds/aliasIds
// - résolution des anciens ids vers le set canonique pour éviter "Set inconnu"
// - filtres privés plus tolérants entre compte actif / profil actif / profil lié
// =============================================================

export type DartSetId = string;

export interface DartSet {
  id: DartSetId; // id unique canonique
  profileId: string; // profil auquel appartient ce jeu
  name: string; // "Noir 22g Target"
  brand?: string; // "Target", "Winmau"...
  weightGrams?: number; // 18, 20, 22 etc.
  notes?: string;

  mainImageUrl: string; // image cartoon principale (fond uni)
  thumbImageUrl?: string; // miniature pour overlay avatar
  bgColor?: string; // fond du thumb si pas d'image
  mainImageAssetId?: string | null;
  thumbImageAssetId?: string | null;
  photoAssetId?: string | null;

  // ✅ NAS BACKUP FIX: source temporaire uploadable pour les photos importées.
  // Ces champs sont supprimés du snapshot après upload média NAS.
  photoDataUrl?: string;
  imageDataUrl?: string;
  mainImageDataUrl?: string;
  dartSetImageDataUrl?: string;
  photoThumbDataUrl?: string;
  thumbDataUrl?: string;
  thumbImageDataUrl?: string;

  // ✅ Visuel (optionnel, compat)
  kind?: "plain" | "preset" | "photo";
  presetId?: string;

  isFavorite?: boolean; // ce profil → set préféré ?
  usageCount?: number; // nb de matchs joués avec ce set
  lastUsedAt?: number; // timestamp dernier match

  // 👇 portée d'utilisation
  // - "private" : utilisable seulement par le propriétaire
  // - "public"  : visible par tous les profils du device
  scope: "private" | "public";

  // ✅ PATCH: ids historiques / doublons à résoudre vers ce set canonique.
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

const MAX_DARTSET_IMAGE_DATA_URL_CHARS = 350_000;

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

function sanitizeDartSetImageUrl(value: any): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (!v.startsWith("data:image/")) return v;
  if (v.length > MAX_DARTSET_IMAGE_DATA_URL_CHARS) return undefined;
  return v;
}

function pickImageLike(raw: any, ...keys: string[]): string {
  for (const key of keys) {
    const v = s(raw?.[key]);
    if (v) return v;
  }
  return "";
}

function normalizeKind(value: any): "plain" | "preset" | "photo" | undefined {
  return value === "photo" || value === "preset" || value === "plain" ? value : undefined;
}

function isPublicOwnerProfileId(profileId: any): boolean {
  const id = normalizeText(profileId);
  return !id || ["global", "public", "shared", "all", "default", "library", "bibliotheque", "common", "commun", "device", "local device"].includes(id);
}

function readOwnerProfileId(raw: any): string {
  return s(raw?.profileId || raw?.profile_id || raw?.ownerProfileId || raw?.localProfileId || raw?.ownerId || raw?.userProfileId || "");
}

function readVisibilityFlag(raw: any): string {
  return normalizeText(raw?.scope || raw?.visibility || raw?.access || raw?.sharing || raw?.shareScope || "");
}

function isExplicitPublicDartSet(raw: any): boolean {
  const flag = readVisibilityFlag(raw);
  return (
    flag === "public" ||
    flag === "global" ||
    flag === "shared" ||
    flag === "all" ||
    raw?.isPublic === true ||
    raw?.public === true ||
    raw?.shared === true
  );
}

function effectiveDartSetScope(raw: any): "private" | "public" {
  if (!raw || typeof raw !== "object") return "private";
  if (isLinkedRemoteLike(raw) || isRemoteDartSetBucket(raw?.profileId)) return "private";
  if (isExplicitPublicDartSet(raw)) return "public";

  const flag = readVisibilityFlag(raw);
  if (flag === "private" && !isPublicOwnerProfileId(readOwnerProfileId(raw))) return "private";

  // Compat ancien stockage : les presets publics ont souvent profileId="global"
  // mais pas de scope, ou ont été réécrits par erreur en scope="private".
  // Un propriétaire global-like doit donc rester public.
  if (isPublicOwnerProfileId(readOwnerProfileId(raw))) return "public";

  return "private";
}

function normalizeScope(value: any, raw?: any): "private" | "public" {
  const merged = raw && typeof raw === "object" ? { ...raw, scope: value } : { scope: value };
  return effectiveDartSetScope(merged);
}

function isLinkedRemoteLike(raw: any): boolean {
  return Boolean(
    raw?.linkedRemoteDartSet === true ||
      raw?.linkedRemote === true ||
      raw?.__linkedRemote === true ||
      raw?.remoteDartSet === true
  );
}

function remoteDartSetBucketId(sourceProfileId: any, sourceSetId?: any): string {
  const src = s(sourceProfileId) || "unknown-profile";
  const sid = s(sourceSetId);
  return `__remote_dartsets_${hashString(`${src}|${sid}`)}`;
}

function isRemoteDartSetBucket(profileId: any): boolean {
  return s(profileId).startsWith("__remote_dartsets_");
}

function imageIdentity(set: any): string {
  const asset = s(set?.photoAssetId || set?.mainImageAssetId || set?.thumbImageAssetId);
  if (asset) return `asset:${asset}`;
  const preset = s(set?.presetId || set?.dartPresetId || set?.preset);
  if (preset) return `preset:${preset}`;
  const url = s(
    set?.mainImageUrl ||
      set?.thumbImageUrl ||
      set?.photoDataUrl ||
      set?.imageDataUrl ||
      set?.mainImageDataUrl ||
      set?.dartSetImageDataUrl ||
      set?.photoThumbDataUrl ||
      set?.thumbDataUrl ||
      set?.thumbImageDataUrl ||
      set?.photoUrl ||
      set?.imageUrl ||
      ""
  );
  if (!url) return "";
  if (url.startsWith("data:image/")) return `data:${url.length}:${url.slice(0, 42)}:${url.slice(-24)}`;
  return `url:${url.split("?")[0]}`;
}

function normalizeDartSetForRuntime(raw: any): DartSet | null {
  if (!raw || typeof raw !== "object") return null;

  const now = Date.now();
  const name = s(raw.name || raw.label || raw.title || raw.presetName || "Mes fléchettes") || "Mes fléchettes";

  const rawId = s(raw.id || raw.dartSetId || raw.setId || raw.uuid);
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

  let profileId = readOwnerProfileId(raw) || "global";

  // Les dartsets arrivant d'une projection ONLINE / profil lié ne doivent jamais
  // devenir des dartsets sélectionnables du profil local courant. On les garde en
  // base uniquement comme dictionnaire d'images/noms pour les historiques déjà
  // joués, via leurs alias d'id.
  if (linkedRemote) {
    const sourceProfile = linkedSourceProfileId || profileId || "remote";
    profileId = remoteDartSetBucketId(sourceProfile, rawId || raw.linkedSourceDartSetId || raw.presetId || name);
  }

  const mainImageUrl = sanitizeDartSetImageUrl(
    pickImageLike(raw, "mainImageUrl", "imageUrl", "photoUrl", "imgUrlMain", "imgUrl", "photoDataUrl", "imageDataUrl", "mainImageDataUrl", "dartSetImageDataUrl")
  ) || "";
  const thumbImageUrl = sanitizeDartSetImageUrl(
    pickImageLike(raw, "thumbImageUrl", "thumbUrl", "photoThumbUrl", "imgUrlThumb", "photoThumbDataUrl", "thumbDataUrl", "thumbImageDataUrl", "photoDataUrl", "imageDataUrl")
  );

  const base: DartSet = sanitizeDartSetForStorage({
    ...raw,
    id: rawId || `dartset_recovered_${hashString(`${profileId}|${name}|${imageIdentity(raw)}`)}`,
    profileId,
    name,
    brand: s(raw.brand) || undefined,
    weightGrams: Number.isFinite(Number(raw.weightGrams ?? raw.weight)) ? Number(raw.weightGrams ?? raw.weight) : undefined,
    notes: s(raw.notes || raw.description) || undefined,
    mainImageUrl,
    thumbImageUrl,
    bgColor: s(raw.bgColor || raw.backgroundColor) || undefined,
    mainImageAssetId: raw.mainImageAssetId ?? null,
    thumbImageAssetId: raw.thumbImageAssetId ?? null,
    photoAssetId: raw.photoAssetId ?? null,
    kind: normalizeKind(raw.kind) || (raw.presetId ? "preset" : mainImageUrl || thumbImageUrl ? "photo" : "plain"),
    presetId: s(raw.presetId || raw.dartPresetId || raw.preset || raw.basePresetId || raw.refPresetId) || undefined,
    isFavorite: Boolean(raw.isFavorite),
    usageCount: n(raw.usageCount, 0),
    lastUsedAt: n(raw.lastUsedAt, 0),
    scope: normalizeScope(raw.scope, { ...raw, profileId }),
    duplicateIds: uniqStrings([...(Array.isArray(raw.duplicateIds) ? raw.duplicateIds : []), ...(Array.isArray(raw.aliasIds) ? raw.aliasIds : [])]),
    aliasIds: uniqStrings(Array.isArray(raw.aliasIds) ? raw.aliasIds : []),
    linkedSourceDartSetId: raw.linkedSourceDartSetId ? s(raw.linkedSourceDartSetId) : rawId || null,
    linkedRemoteDartSet: linkedRemote,
    linkedSourceProfileId: linkedSourceProfileId || (linkedRemote ? s(raw.profileId || raw.ownerProfileId || raw.localProfileId) || null : null),
    linkedTargetLocalProfileId: raw.linkedTargetLocalProfileId ? s(raw.linkedTargetLocalProfileId) : null,
    linkedOwnerUserId: raw.linkedOwnerUserId ? s(raw.linkedOwnerUserId) : null,
    ownerUserId: raw.ownerUserId ? s(raw.ownerUserId) : null,
    userId: raw.userId ? s(raw.userId) : null,
    accountId: raw.accountId ? s(raw.accountId) : null,
    createdAt: n(raw.createdAt, n(raw.updatedAt, now)),
    updatedAt: n(raw.updatedAt, n(raw.createdAt, now)),
  }) as DartSet;

  base.duplicateIds = uniqStrings([
    base.id,
    rawId,
    base.linkedSourceDartSetId,
    ...(Array.isArray(base.duplicateIds) ? base.duplicateIds : []),
    ...(Array.isArray(base.aliasIds) ? base.aliasIds : []),
  ]).filter((id) => id !== base.id);
  base.aliasIds = uniqStrings([...(base.duplicateIds || []), ...(base.aliasIds || [])]);

  return base;
}

function canonicalKeyForSet(set: any): string {
  const scope = effectiveDartSetScope(set);
  const linkedRemote = isLinkedRemoteLike(set) || isRemoteDartSetBucket(set?.profileId);
  const owner = linkedRemote
    ? `remote:${normalizeText(set?.linkedSourceProfileId || set?.profileId || set?.ownerProfileId || "remote")}`
    : scope === "public"
    ? "public"
    : normalizeText(set?.profileId || set?.ownerProfileId || set?.linkedSourceProfileId || "global");
  const name = normalizeText(set?.name || set?.label || set?.title || "");

  // Le nom est volontairement prioritaire : les doublons constatés viennent de la
  // synchro/import qui recrée le même set avec un nouvel id, parfois avec une image
  // légèrement différente ou déjà convertie en asset. Un vrai deuxième set doit être
  // renommé pour rester distinct.
  if (name) return `${scope}|${owner}|name:${name}`;

  const visual = imageIdentity(set) || normalizeText(set?.presetId || set?.kind || "plain");
  return `${scope}|${owner}|visual:${visual || normalizeText(set?.id)}`;
}

function scoreDartSetForCanonical(set: DartSet): number {
  const hasImage = Boolean(
    s(set.mainImageUrl) ||
      s(set.thumbImageUrl) ||
      s((set as any).photoDataUrl) ||
      s((set as any).imageDataUrl) ||
      s((set as any).mainImageDataUrl) ||
      s((set as any).dartSetImageDataUrl) ||
      s(set.mainImageAssetId) ||
      s(set.photoAssetId)
  );
  return (
    (set.isFavorite ? 10_000_000 : 0) +
    n(set.usageCount, 0) * 10_000 +
    (hasImage ? 1_000 : 0) +
    n(set.lastUsedAt, 0) / 1_000_000 +
    n(set.updatedAt, 0) / 10_000_000
  );
}

function mergeDartSetIntoCanonical(base: DartSet, incoming: DartSet): DartSet {
  const aScore = scoreDartSetForCanonical(base);
  const bScore = scoreDartSetForCanonical(incoming);
  const winner = bScore > aScore ? incoming : base;
  const loser = winner === incoming ? base : incoming;

  const next: DartSet = { ...winner };

  const fill = (key: keyof DartSet) => {
    const current = (next as any)[key];
    const candidate = (loser as any)[key];
    if ((current === undefined || current === null || current === "") && candidate !== undefined && candidate !== null && candidate !== "") {
      (next as any)[key] = candidate;
    }
  };

  [
    "brand",
    "notes",
    "mainImageUrl",
    "thumbImageUrl",
    "bgColor",
    "mainImageAssetId",
    "thumbImageAssetId",
    "photoAssetId",
    "photoDataUrl",
    "imageDataUrl",
    "mainImageDataUrl",
    "dartSetImageDataUrl",
    "photoThumbDataUrl",
    "thumbDataUrl",
    "thumbImageDataUrl",
    "kind",
    "presetId",
    "linkedSourceProfileId",
    "linkedTargetLocalProfileId",
    "linkedOwnerUserId",
    "ownerUserId",
    "userId",
    "accountId",
  ].forEach((k) => fill(k as keyof DartSet));

  next.weightGrams = Number.isFinite(Number(next.weightGrams)) ? next.weightGrams : loser.weightGrams;
  next.isFavorite = Boolean(base.isFavorite || incoming.isFavorite);
  next.usageCount = n(base.usageCount, 0) + n(incoming.usageCount, 0);
  next.lastUsedAt = Math.max(n(base.lastUsedAt, 0), n(incoming.lastUsedAt, 0));
  next.createdAt = Math.min(n(base.createdAt, Date.now()), n(incoming.createdAt, Date.now()));
  next.updatedAt = Math.max(n(base.updatedAt, 0), n(incoming.updatedAt, 0), Date.now());
  next.duplicateIds = uniqStrings([
    base.id,
    incoming.id,
    base.linkedSourceDartSetId,
    incoming.linkedSourceDartSetId,
    ...(base.duplicateIds || []),
    ...(incoming.duplicateIds || []),
    ...(base.aliasIds || []),
    ...(incoming.aliasIds || []),
  ]).filter((id) => id !== next.id);
  next.aliasIds = uniqStrings([...(next.duplicateIds || []), ...(next.aliasIds || [])]);

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
      continue;
    }
    byKey.set(key, mergeDartSetIntoCanonical(old, normalized));
  }

  return order.map((key) => byKey.get(key)).filter(Boolean) as DartSet[];
}

function sanitizeDartSetForStorage(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  const next: any = { ...raw };
  const main = sanitizeDartSetImageUrl(next.mainImageUrl);
  const thumb = sanitizeDartSetImageUrl(next.thumbImageUrl);

  if (Object.prototype.hasOwnProperty.call(next, "mainImageUrl")) {
    next.mainImageUrl = main || "";
  }
  if (Object.prototype.hasOwnProperty.call(next, "thumbImageUrl")) {
    next.thumbImageUrl = thumb;
  }

  if (next.kind === "photo" && !next.mainImageUrl) {
    next.kind = next.presetId ? "preset" : "plain";
  }

  next.scope = normalizeScope(next.scope, next);
  next.name = s(next.name) || "Mes fléchettes";
  next.profileId = s(next.profileId || "global");
  next.id = s(next.id) || `dartset_recovered_${hashString(`${next.profileId}|${next.name}|${Date.now()}`)}`;
  next.duplicateIds = uniqStrings(Array.isArray(next.duplicateIds) ? next.duplicateIds : []).filter((id) => id !== next.id);
  next.aliasIds = uniqStrings([...(Array.isArray(next.aliasIds) ? next.aliasIds : []), ...next.duplicateIds]).filter((id) => id !== next.id);
  next.linkedTargetLocalProfileId = s(next.linkedTargetLocalProfileId) || null;
  next.linkedOwnerUserId = s(next.linkedOwnerUserId) || null;
  next.linkedSourceProfileId = s(next.linkedSourceProfileId) || null;
  next.linkedSourceDartSetId = s(next.linkedSourceDartSetId) || null;
  next.createdAt = n(next.createdAt, Date.now());
  next.updatedAt = n(next.updatedAt, next.createdAt);

  return next;
}

function loadAllRaw(): DartSet[] {
  try {
    const arr = safeLocalStorageGetJson<any>(STORAGE_KEY, []);
    if (!Array.isArray(arr)) return [];
    return arr.map((item: any) => sanitizeDartSetForStorage(item) as DartSet);
  } catch (err) {
    console.warn("[dartSetsStore] loadAll error", err);
    return [];
  }
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
      const stripped = sanitized.map((item: any) => {
        const next: any = { ...(item || {}) };
        if (typeof next.mainImageUrl === "string" && next.mainImageUrl.startsWith("data:image/")) next.mainImageUrl = "";
        if (typeof next.thumbImageUrl === "string" && next.thumbImageUrl.startsWith("data:image/")) next.thumbImageUrl = undefined;
        if (next.kind === "photo") next.kind = next.presetId ? "preset" : "plain";
        return next;
      });
      saved = !!safeLocalStorageSetJson(STORAGE_KEY, stripped, {
        sanitizeImages: true,
        imageMaxChars: MAX_DARTSET_IMAGE_DATA_URL_CHARS,
        compressAboveChars: 4_000,
      });
      if (saved) {
        for (let i = 0; i < sanitized.length; i += 1) {
          const current = sanitized[i] as any;
          const fallback = (stripped[i] || {}) as any;
          if (current && fallback) {
            current.mainImageUrl = fallback.mainImageUrl;
            current.thumbImageUrl = fallback.thumbImageUrl;
            current.kind = fallback.kind;
          }
        }
      }
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

function appStoreSnapshot(): any {
  try {
    if (typeof window === "undefined") return null;
    const w: any = window as any;
    return w?.__appStore?.store || w?.__appStore?.getState?.() || w?.__APP_STORE__ || null;
  } catch {
    return null;
  }
}

function collectIdLikeValues(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  const keys = [
    "id",
    "profileId",
    "localProfileId",
    "playerId",
    "pid",
    "uid",
    "userId",
    "accountId",
    "authUserId",
    "ownerUserId",
    "linkedUserId",
    "linkedFriendUserId",
    "linkedSourceLocalProfileId",
    "linkedSourceProfileId",
    "remoteProfileId",
    "sourceProfileId",
  ];
  return uniqStrings(keys.map((k) => obj?.[k]));
}

function collectProfileAliasIds(profileId: string): Set<string> {
  const aliases = new Set<string>();
  const add = (v: any) => {
    const id = s(v);
    if (id) aliases.add(id);
  };
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

  // Règle stricte : un set privé appartient à un profil, pas au compte complet.
  // On ne propage donc jamais userId/accountId vers tous les profils, car c'est
  // précisément ce qui faisait apparaître Alex/Romrom chez le mauvais joueur.
  const profileOnlyKeys = [
    "id",
    "profileId",
    "localProfileId",
    "playerId",
    "pid",
    "uid",
    "linkedSourceLocalProfileId",
    "linkedTargetLocalProfileId",
    "ownerProfileId",
  ];

  for (const obj of roots) {
    const vals = uniqStrings(profileOnlyKeys.map((k) => obj?.[k]));
    if (!vals.includes(pid)) continue;
    vals.forEach(add);
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

export function isSelectableDartSet(set: any): boolean {
  return !!set && !isLinkedRemoteDartSet(set);
}

function dartSetMatchesAnyId(set: any, id: any): boolean {
  const sid = s(id);
  if (!sid || !set) return false;
  if (s(set.id) === sid) return true;
  if (s(set.linkedSourceDartSetId) === sid) return true;
  const ids = uniqStrings([...(Array.isArray(set.duplicateIds) ? set.duplicateIds : []), ...(Array.isArray(set.aliasIds) ? set.aliasIds : [])]);
  return ids.includes(sid);
}

function isLinkedRemoteDartSet(set: any): boolean {
  return isLinkedRemoteLike(set) || isRemoteDartSetBucket(set?.profileId);
}

function profileCanSeeDartSet(set: DartSet, profileId: string): boolean {
  if (!set) return false;

  // Les sets ONLINE/profils liés restent un dictionnaire technique pour les
  // historiques/stats. Ils ne sont jamais sélectionnables dans X01/Online/Mes fléchettes.
  if (!isSelectableDartSet(set)) return false;

  // Public = visible pour TOUS les joueurs, même si l'ancien stockage avait
  // profileId="global" ou avait été réécrit en scope="private".
  if (effectiveDartSetScope(set) === "public") return true;

  // Privé = seulement le profil propriétaire exact (avec alias stricts du même profil).
  const aliases = collectProfileAliasIds(profileId);
  const setOwners = collectSelectableOwnerIds(set);
  return setOwners.some((id) => aliases.has(id));
}

function visibleDartSetKey(set: any): string {
  const scope = effectiveDartSetScope(set);
  const owner = scope === "public" ? "public" : normalizeText(collectSelectableOwnerIds(set)[0] || set?.profileId || "private");
  const name = normalizeText(set?.name || set?.label || set?.title || "");
  if (name) return `${scope}|${owner}|name:${name}`;
  const visual = imageIdentity(set) || normalizeText(set?.presetId || set?.id || "");
  return `${scope}|${owner}|visual:${visual}`;
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
    byKey.set(key, scoreDartSetForCanonical(set) > scoreDartSetForCanonical(old) ? set : old);
  }
  return order.map((key) => byKey.get(key)).filter(Boolean) as DartSet[];
}

// -------------------------------------------------------------
// API publique
// -------------------------------------------------------------

export function getAllDartSets(): DartSet[] {
  return loadAll();
}

export function getAllSelectableDartSets(): DartSet[] {
  return loadAll().filter((set) => isSelectableDartSet(set));
}

// ✅ Utilisé par la synchro cloud: remplace la liste entière (migration device → device)
export function setAllDartSets(list: DartSet[]) {
  return saveAll(Array.isArray(list) ? list : []);
}

// 👇 sets du profil + publics, avec alias compte/profil actif.
export function getDartSetsForProfile(profileId: string): DartSet[] {
  const pid = s(profileId);
  const visible = loadAll().filter((set) => !pid ? effectiveDartSetScope(set) === "public" && isSelectableDartSet(set) : profileCanSeeDartSet(set, pid));
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

  // Cas historique / ONLINE : un match peut pointer vers un doublon masqué ou
  // un set matérialisé distant. Si le profil courant possède un set visible avec
  // le même nom/visuel, on fusionne les stats vers celui-ci au lieu de produire
  // un "Set inconnu" ou une ligne doublon.
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

export function createDartSet(input: {
  profileId: string;
  name: string;
  brand?: string;
  weightGrams?: number;
  notes?: string;
  mainImageUrl: string;
  thumbImageUrl?: string;
  bgColor?: string;

  // ✅ BONUS: visuel
  kind?: "plain" | "preset" | "photo";
  presetId?: string | null;

  // ✅ NAS BACKUP FIX: photo importée conservée jusqu'au push média NAS
  photoDataUrl?: string | null;
  imageDataUrl?: string | null;
  mainImageDataUrl?: string | null;
  dartSetImageDataUrl?: string | null;
  photoThumbDataUrl?: string | null;
  thumbDataUrl?: string | null;
  thumbImageDataUrl?: string | null;

  // 👇 optionnel pour compat des appels existants
  scope?: "private" | "public";
} ): DartSet | undefined {
  const all = loadAll();
  const now = Date.now();
  const normalizedInput = normalizeDartSetForRuntime({
    ...input,
    id: `dartset_pending_${hashString(`${input.profileId}|${input.name}|${input.presetId || input.mainImageUrl || ""}`)}`,
    createdAt: now,
    updatedAt: now,
    scope: input.scope ?? "private",
  });

  const existing = normalizedInput
    ? all.find((set) => canonicalKeyForSet(set) === canonicalKeyForSet(normalizedInput))
    : null;

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
    } as any;
    return updateDartSet(existing.id, patch as any) || existing;
  }

  const alreadyForProfile = all.filter((set) => set.profileId === input.profileId);

  const newSet: DartSet = {
    id: `dartset_${now}_${Math.random().toString(16).slice(2)}`,
    profileId: input.profileId,
    name: input.name.trim() || "Mes fléchettes",
    brand: input.brand?.trim() || undefined,
    weightGrams: input.weightGrams,
    notes: input.notes?.trim() || undefined,

    mainImageUrl: input.mainImageUrl,
    thumbImageUrl: input.thumbImageUrl,
    bgColor: input.bgColor,

    // ✅ NAS BACKUP FIX: garder la source photo importée jusqu'au push média NAS.
    photoDataUrl: input.photoDataUrl || undefined,
    imageDataUrl: input.imageDataUrl || undefined,
    mainImageDataUrl: input.mainImageDataUrl || undefined,
    dartSetImageDataUrl: input.dartSetImageDataUrl || undefined,
    photoThumbDataUrl: input.photoThumbDataUrl || undefined,
    thumbDataUrl: input.thumbDataUrl || undefined,
    thumbImageDataUrl: input.thumbImageDataUrl || undefined,

    // ✅ BONUS: persist visuel
    kind: input.kind,
    presetId: input.presetId ?? undefined,

    isFavorite: alreadyForProfile.length === 0, // premier = favori

    usageCount: 0,
    lastUsedAt: 0,

    // 👇 si rien passé → privé par défaut
    scope: input.scope ?? "private",

    createdAt: now,
    updatedAt: now,
  };

  all.push(newSet);
  if (!saveAll(all)) return undefined;

  return getDartSetById(newSet.id) || newSet;
}

export function updateDartSet(
  id: DartSetId,
  patch: Partial<Omit<DartSet, "id" | "createdAt">>
 ): DartSet | undefined {
  const all = loadAll();
  const canonicalId = getCanonicalDartSetId(id) || id;
  const index = all.findIndex((set) => String(set.id) === String(canonicalId) || dartSetMatchesAnyId(set, id));
  if (index === -1) return undefined;

  const updated: DartSet = sanitizeDartSetForStorage({
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

  // ✅ Favoris multiples : on ne retire plus le favori des autres sets.
  // Si le set est déjà favori, un nouveau clic le retire.
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

  all[index] = {
    ...current,
    usageCount: (current.usageCount ?? 0) + 1,
    lastUsedAt: now,
    updatedAt: now,
  };

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

    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    });
  };

  const aliases = collectProfileAliasIds(profileId);

  // 1) Premier favori prioritaire du profil : favoris multiples OK.
  const favoriteOwn = visible
    .filter((set) => effectiveDartSetScope(set) !== "public" && collectSelectableOwnerIds(set).some((id) => aliases.has(id)) && set.isFavorite)
    .sort(byPriority)[0];
  if (favoriteOwn) return favoriteOwn;

  // 2) Sinon : set du profil le plus utilisé, puis alphabétique.
  const ownSorted = visible
    .filter((set) => effectiveDartSetScope(set) !== "public" && collectSelectableOwnerIds(set).some((id) => aliases.has(id)))
    .sort(byPriority);

  if (ownSorted.length > 0) return ownSorted[0];

  // 3) Ultime fallback : n'importe quel set visible (ex : que des publics)
  return visible.slice().sort(byPriority)[0];
}

// ✅ Replace full list (used when cloud hydrate wins)
export function replaceAllDartSets(list: DartSet[]) {
  return saveAll(Array.isArray(list) ? list : []);
}
