// =============================================================
// src/lib/dartSetsStore.ts
// DARTSETS — STORE UNIQUE (plus de localStorage ici)
// - API compatible avec ton ancien dartSetsStore.ts
// - La vérité = window.__appStore.store.dartSets
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

  kind?: "plain" | "preset" | "photo";
  presetId?: string;

  isFavorite?: boolean;
  usageCount?: number;
  lastUsedAt?: number;

  scope: "private" | "public";

  createdAt: number;
  updatedAt: number;
}

declare global {
  interface Window {
    __appStore?: {
      store: any;
      update: (fn: (s: any) => any) => void;
    };
  }
}

function assertStore() {
  const api = window.__appStore;
  if (!api?.store || !api?.update) {
    throw new Error("[dartSetsStore] window.__appStore not ready (store/update manquants)");
  }
  if (!Array.isArray(api.store.dartSets)) api.store.dartSets = [];
  return api;
}

function normalize(raw: any): DartSet {
  const now = Date.now();
  const scope: "private" | "public" = raw?.scope === "public" ? "public" : "private";
  const kind: any = raw?.kind === "photo" || raw?.kind === "preset" || raw?.kind === "plain" ? raw.kind : undefined;
  const presetId: string | undefined = typeof raw?.presetId === "string" ? raw.presetId : undefined;

  return {
    id: String(raw?.id || `dartset_${now}_${Math.random().toString(16).slice(2)}`),
    profileId: String(raw?.profileId || ""),
    name: String(raw?.name || "Mes fléchettes"),
    brand: typeof raw?.brand === "string" ? raw.brand : undefined,
    weightGrams: typeof raw?.weightGrams === "number" ? raw.weightGrams : undefined,
    notes: typeof raw?.notes === "string" ? raw.notes : undefined,

    mainImageUrl: String(raw?.mainImageUrl || ""),
    thumbImageUrl: typeof raw?.thumbImageUrl === "string" ? raw.thumbImageUrl : undefined,
    bgColor: typeof raw?.bgColor === "string" ? raw.bgColor : undefined,

    kind,
    presetId,

    isFavorite: !!raw?.isFavorite,
    usageCount: typeof raw?.usageCount === "number" ? raw.usageCount : 0,
    lastUsedAt: typeof raw?.lastUsedAt === "number" ? raw.lastUsedAt : 0,

    scope,
    createdAt: typeof raw?.createdAt === "number" ? raw.createdAt : now,
    updatedAt: typeof raw?.updatedAt === "number" ? raw.updatedAt : now,
  };
}

function getAllFromStore(): DartSet[] {
  const api = assertStore();
  const list = Array.isArray(api.store.dartSets) ? api.store.dartSets : [];
  // normalise au passage (compat anciens objets)
  return list.map(normalize);
}

function writeAll(next: DartSet[]) {
  const api = assertStore();
  api.update((s) => {
    s.dartSets = next.map(normalize);
    return s;
  });
}

// -------------------------------------------------------------
// API publique (compat)
// -------------------------------------------------------------

export function getAllDartSets(): DartSet[] {
  return getAllFromStore();
}

// sets du profil + tous les sets publics
export function getDartSetsForProfile(profileId: string): DartSet[] {
  return getAllFromStore().filter((s) => s.scope === "public" || s.profileId === profileId);
}

export function getDartSetById(id: DartSetId): DartSet | undefined {
  return getAllFromStore().find((s) => s.id === id);
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
  scope?: "private" | "public";
}): DartSet {
  const all = getAllFromStore();
  const now = Date.now();

  const alreadyForProfile = all.filter((s) => s.profileId === input.profileId);

  const newSet: DartSet = normalize({
    id: `dartset_${now}_${Math.random().toString(16).slice(2)}`,
    profileId: input.profileId,
    name: input.name?.trim() || "Mes fléchettes",
    brand: input.brand?.trim() || undefined,
    weightGrams: input.weightGrams,
    notes: input.notes?.trim() || undefined,

    mainImageUrl: input.mainImageUrl,
    thumbImageUrl: input.thumbImageUrl,
    bgColor: input.bgColor,

    kind: input.kind,
    presetId: input.presetId ?? undefined,

    isFavorite: alreadyForProfile.length === 0, // premier = favori
    usageCount: 0,
    lastUsedAt: 0,

    scope: input.scope ?? "private",
    createdAt: now,
    updatedAt: now,
  });

  all.push(newSet);
  writeAll(all);
  return newSet;
}

export function updateDartSet(
  id: DartSetId,
  patch: Partial<Omit<DartSet, "id" | "profileId" | "createdAt">>
): DartSet | undefined {
  const all = getAllFromStore();
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) return undefined;

  const updated: DartSet = normalize({
    ...all[index],
    ...patch,
    updatedAt: Date.now(),
  });

  all[index] = updated;
  writeAll(all);
  return updated;
}

export function deleteDartSet(id: DartSetId) {
  writeAll(getAllFromStore().filter((s) => s.id !== id));
}

export function setFavoriteDartSet(profileId: string, dartSetId: DartSetId) {
  const all = getAllFromStore();
  let changed = false;

  const updated = all.map((s) => {
    if (s.profileId !== profileId) return s;

    if (s.id === dartSetId) {
      changed = true;
      return normalize({ ...s, isFavorite: true, updatedAt: Date.now() });
    }
    if (s.isFavorite) {
      changed = true;
      return normalize({ ...s, isFavorite: false, updatedAt: Date.now() });
    }
    return s;
  });

  if (changed) writeAll(updated);
}

export function bumpDartSetUsage(dartSetId: DartSetId) {
  const all = getAllFromStore();
  const index = all.findIndex((s) => s.id === dartSetId);
  if (index === -1) return;

  const now = Date.now();
  const current = all[index];

  all[index] = normalize({
    ...current,
    usageCount: (current.usageCount ?? 0) + 1,
    lastUsedAt: now,
    updatedAt: now,
  });

  writeAll(all);
}

export function getFavoriteDartSetForProfile(profileId: string): DartSet | undefined {
  const visible = getDartSetsForProfile(profileId);

  const favoriteOwn = visible.find((s) => s.profileId === profileId && s.isFavorite);
  if (favoriteOwn) return favoriteOwn;

  const ownSorted = visible
    .filter((s) => s.profileId === profileId)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (ownSorted.length > 0) return ownSorted[0];
  return visible[0];
}
