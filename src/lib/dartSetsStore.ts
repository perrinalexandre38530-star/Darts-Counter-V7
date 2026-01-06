// =============================================================
// src/lib/dartSetsStore.ts
// Gestion des jeux de fléchettes ("Dart Sets")
// - Stockage local via localStorage (clé "dc_dart_sets_v1")
// - CRUD complet : list / get / create / update / delete
// - Prévu pour être étendu plus tard (sync Supabase, etc.)
// ✅ BONUS: officialise kind/presetId (évite incohérences + compat UI)
// =============================================================

export type DartSetId = string;

export interface DartSet {
  id: DartSetId; // id unique
  profileId: string; // profil auquel appartient ce jeu
  name: string; // "Noir 22g Target"
  brand?: string; // "Target", "Winmau"...
  weightGrams?: number; // 18, 20, 22 etc.
  notes?: string;

  mainImageUrl: string; // image cartoon principale (fond uni)
  thumbImageUrl?: string; // miniature pour overlay avatar
  bgColor?: string; // fond du thumb si pas d'image

  // ✅ Visuel (optionnel, compat)
  kind?: "plain" | "preset" | "photo";
  presetId?: string;

  isFavorite?: boolean; // ce profil → set préféré ?
  usageCount?: number; // nb de matchs joués avec ce set
  lastUsedAt?: number; // timestamp dernier match

  // 👇 NOUVEAU : portée d'utilisation
  // - "private" : utilisable seulement par le propriétaire
  // - "public"  : visible par tous les profils du device
  scope: "private" | "public";

  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "dc_dart_sets_v1";

// -------------------------------------------------------------
// Helpers internes
// -------------------------------------------------------------

function safeParse(json: string | null): DartSet[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];

    // Normalisation + compat anciens sets (sans scope / sans kind/presetId)
    return arr.map((raw: any) => {
      const scope: "private" | "public" =
        raw.scope === "public" || raw.scope === "private" ? raw.scope : "private";

      const kind: "plain" | "preset" | "photo" | undefined =
        raw.kind === "photo" || raw.kind === "preset" || raw.kind === "plain"
          ? raw.kind
          : undefined;

      const presetId: string | undefined =
        typeof raw.presetId === "string" ? raw.presetId : undefined;

      return {
        ...raw,
        scope,
        kind,
        presetId,
      } as DartSet;
    });
  } catch {
    return [];
  }
}

function saveAll(list: DartSet[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("[dartSetsStore] saveAll error", err);
  }

  // ✅ notify app + listeners
  try {
    window.dispatchEvent(new Event("dc-dartsets-updated"));
    try {
      window.dispatchEvent(new Event("dc-flush-cloud"));
      (window as any).__flushCloudNow?.();
    } catch {}
  } catch {}
  try {
    const w: any = window as any;
    if (w?.__appStore?.update) {
      w.__appStore.update((st: any) => ({ ...(st || {}), dartSets: list }));
    }
  } catch {}
}

function loadAll(): DartSet[] {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    console.warn("[dartSetsStore] loadAll error", err);
    return [];
  }
}

// -------------------------------------------------------------
// API publique
// -------------------------------------------------------------

export function getAllDartSets(): DartSet[] {
  return loadAll();
}

// ✅ Utilisé par la synchro cloud: remplace la liste entière (migration device → device)
export function setAllDartSets(list: DartSet[]) {
  saveAll(Array.isArray(list) ? list : []);
}

// 👇 Désormais : sets du profil + tous les sets publics
export function getDartSetsForProfile(profileId: string): DartSet[] {
  return loadAll().filter((s) => s.scope === "public" || s.profileId === profileId);
}

export function getDartSetById(id: DartSetId): DartSet | undefined {
  return loadAll().find((s) => s.id === id);
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

  // 👇 NOUVEAU : on laisse optionnel pour compat des appels existants
  scope?: "private" | "public";
}): DartSet {
  const all = loadAll();
  const now = Date.now();

  const alreadyForProfile = all.filter((s) => s.profileId === input.profileId);

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
  saveAll(all);

  return newSet;
}

export function updateDartSet(
  id: DartSetId,
  patch: Partial<Omit<DartSet, "id" | "profileId" | "createdAt">>
): DartSet | undefined {
  const all = loadAll();
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) return undefined;

  const updated: DartSet = {
    ...all[index],
    ...patch,
    updatedAt: Date.now(),
  };

  all[index] = updated;
  saveAll(all);
  return updated;
}

export function deleteDartSet(id: DartSetId) {
  const filtered = loadAll().filter((s) => s.id !== id);
  saveAll(filtered);
}

export function setFavoriteDartSet(profileId: string, dartSetId: DartSetId) {
  const all = loadAll();
  let changed = false;

  const updated = all.map((s) => {
    // ⚠️ On ne touche qu'aux sets appartenant à ce profil,
    // même s'il voit des sets "public" d'autres profils.
    if (s.profileId !== profileId) return s;

    if (s.id === dartSetId) {
      changed = true;
      return { ...s, isFavorite: true, updatedAt: Date.now() };
    }
    if (s.isFavorite) {
      changed = true;
      return { ...s, isFavorite: false, updatedAt: Date.now() };
    }

    return s;
  });

  if (changed) saveAll(updated);
}

export function bumpDartSetUsage(dartSetId: DartSetId) {
  const all = loadAll();
  const index = all.findIndex((s) => s.id === dartSetId);
  if (index === -1) return;

  const now = Date.now();
  const current = all[index];

  all[index] = {
    ...current,
    usageCount: (current.usageCount ?? 0) + 1,
    lastUsedAt: now,
    updatedAt: now,
  };

  saveAll(all);
}

export function getFavoriteDartSetForProfile(profileId: string): DartSet | undefined {
  const visible = getDartSetsForProfile(profileId);

  // 1) Favori parmi les sets appartenant au profil
  const favoriteOwn = visible.find((s) => s.profileId === profileId && s.isFavorite);
  if (favoriteOwn) return favoriteOwn;

  // 2) Sinon : premier set créé appartenant au profil
  const ownSorted = visible
    .filter((s) => s.profileId === profileId)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (ownSorted.length > 0) return ownSorted[0];

  // 3) Ultime fallback : n'importe quel set visible (ex : que des publics)
  return visible[0];
}


// ✅ Replace full list (used when cloud hydrate wins)
export function replaceAllDartSets(list: DartSet[]) {
  saveAll(Array.isArray(list) ? list : []);
}
