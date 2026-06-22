// ============================================
// src/lib/storage.ts — IndexedDB + compression + utilitaires
// Remplace totalement l'ancienne version localStorage
// API principale : loadStore(), saveStore(), clearStore()
// + Helpers : getKV()/setKV()/delKV(), exportAll(), importAll(), storageEstimate()
// + Tools : nukeAll(), migrateFromLocalStorage(), nukeAllKeepActiveProfile()
// + Cloud : exportCloudSnapshot(), importCloudSnapshot()
// ============================================

import type { Store, Profile } from "./types";
import { emitCloudChange } from "./cloudEvents";
import { exportHistoryDump, importHistoryDump } from "./historyCloud";
import { sanitizeAvatarDataUrl, MAX_AVATAR_DATA_URL_CHARS } from "./avatarSafe";
import { runtimeDiag } from "./runtimeDiag";
import { setAvatarCache as setAvatarCacheLib } from "./avatarCache";
import { getAllDartSets, replaceAllDartSets } from "./dartSetsStore";
import { loadBots as loadStoredBots, restoreBotsFromSnapshot } from "./bots";
import { loadTeams as loadStoredTeams, saveTeams as saveStoredTeams } from "./petanqueTeamsStore";
import { exportLocalTournamentsSnapshot, importLocalTournamentsSnapshot } from "./tournaments/storeLocal";

const STORAGE_DIAG_ENABLED = false; // PERF V2: désactive les logs verbeux par défaut (les slows restent dans runtimeDiag)
const STORE_WRITE_MODE: "plain" | "gzip" = "plain";
const QUOTA_ESTIMATE_TTL_MS = 15_000;
let lastQuotaEstimateAt = 0;
let lastQuotaEstimateValue: { quota: number | null; usage: number | null } = { quota: null, usage: null };
let lastSavedStoreJsonByScope = new Map<string, string>();

function storageNowMs() {
  try {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  } catch {
    return Date.now();
  }
}

function storageDiag(event: string, payload?: Record<string, any>) {
  try {
    if (!STORAGE_DIAG_ENABLED) return;
    console.warn(`[storage-diag] ${event}`, payload || {});
  } catch {}
}

function getActiveStoreScopeKey() {
  try {
    return scopedStorageKey(STORE_KEY);
  } catch {
    return STORE_KEY;
  }
}

async function getQuotaEstimateCached() {
  const now = Date.now();
  if (now - lastQuotaEstimateAt < QUOTA_ESTIMATE_TTL_MS) return lastQuotaEstimateValue;
  lastQuotaEstimateValue = await storageEstimate();
  lastQuotaEstimateAt = now;
  return lastQuotaEstimateValue;
}

function persistPayloadForKey(key: string, json: string) {
  if (key === scopedStorageKey(STORE_KEY) && STORE_WRITE_MODE === "plain") return json;
  return compressGzip(json);
}

/* ---------- SAFE JSON ---------- */
function safeJsonParse<T = any>(value: any, fallback: T): T {
  try {
    if (value === null || value === undefined) return fallback;
    if (typeof value !== "string") return value as T;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeJsonStringify(value: any, fallback = "{}"): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}


function estimateObjectSizeBytes(obj: any): number {
  try {
    return safeJsonStringify(obj, "").length;
  } catch {
    return 0;
  }
}



/* ============================================================
   🛡️ PROFILS LOCAUX — garde-fou anti-disparition
   ------------------------------------------------------------
   Plusieurs flux peuvent réécrire le store (boot, cloud/NAS, cache,
   imports). Un snapshot partiel avec profiles: [] ne doit jamais effacer
   silencieusement des profils locaux déjà connus. La suppression volontaire
   reste possible via l'écran Profils, car le cache est rafraîchi à chaque
   sauvegarde contenant au moins 1 profil.
============================================================ */
const PROFILE_SAFETY_CACHE_KEY = "dc_profiles_safety_cache_v1";

type ProfileSafetyCache = {
  _v: 1;
  scopedStoreKey: string;
  userId: string | null;
  updatedAt: number;
  profiles: any[];
  activeProfileId: string | null;
};

function profileSafetyCacheKey() {
  try {
    return `${PROFILE_SAFETY_CACHE_KEY}:${scopedStorageKey(STORE_KEY)}`;
  } catch {
    return PROFILE_SAFETY_CACHE_KEY;
  }
}

function validProfileList(value: any): any[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p) => p && typeof p === "object" && String(p.id || "").trim() && String(p.name || "").trim());
}

function mergeProfilesForSafety(primary: any[], fallback: any[]): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const p of [...validProfileList(primary), ...validProfileList(fallback)]) {
    const id = String(p.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}

function readProfilesSafetyCache(): ProfileSafetyCache | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(profileSafetyCacheKey());
    if (!raw) return null;
    const parsed = safeJsonParse<ProfileSafetyCache | null>(raw, null);
    const profiles = validProfileList(parsed?.profiles);
    if (!parsed || profiles.length <= 0) return null;
    return { ...parsed, profiles };
  } catch {
    return null;
  }
}

function writeProfilesSafetyCache(store: any) {
  try {
    if (typeof localStorage === "undefined") return;
    const profiles = validProfileList(store?.profiles);
    if (profiles.length <= 0) return;
    const payload: ProfileSafetyCache = {
      _v: 1,
      scopedStoreKey: scopedStorageKey(STORE_KEY),
      userId: getStorageUser(),
      updatedAt: Date.now(),
      profiles,
      activeProfileId: store?.activeProfileId ? String(store.activeProfileId) : null,
    };
    localStorage.setItem(profileSafetyCacheKey(), safeJsonStringify(payload));
  } catch {}
}

export function getCachedLocalProfilesForSafety(): { profiles: any[]; activeProfileId: string | null } | null {
  const cache = readProfilesSafetyCache();
  if (!cache?.profiles?.length) return null;
  return { profiles: cache.profiles, activeProfileId: cache.activeProfileId ?? null };
}

async function getPersistedStoreProfilesForSafety(): Promise<{ profiles: any[]; activeProfileId: string | null } | null> {
  try {
    const raw = (await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(STORE_KEY))) ?? null;
    if (raw == null) return null;
    const json = await decompressGzip(raw as any);
    const parsed = safeJsonParse<any>(json, null);
    const profiles = validProfileList(parsed?.profiles);
    if (!profiles.length) return null;
    return { profiles, activeProfileId: parsed?.activeProfileId ? String(parsed.activeProfileId) : null };
  } catch {
    return null;
  }
}

async function protectProfilesAgainstEmptyOverwrite<T extends Store>(store: T, reason: string): Promise<T> {
  const currentProfiles = validProfileList((store as any)?.profiles);
  if (currentProfiles.length > 0) {
    writeProfilesSafetyCache(store as any);
    return { ...(store as any), profiles: currentProfiles } as T;
  }

  const persisted = await getPersistedStoreProfilesForSafety();
  const cached = getCachedLocalProfilesForSafety();
  const recovered = mergeProfilesForSafety(persisted?.profiles || [], cached?.profiles || []);
  if (recovered.length <= 0) return store;

  const activeProfileId =
    (store as any)?.activeProfileId ||
    persisted?.activeProfileId ||
    cached?.activeProfileId ||
    recovered[0]?.id ||
    null;

  try {
    console.warn("[storage] profils locaux protégés contre écrasement vide", {
      reason,
      recovered: recovered.length,
      activeProfileId,
    });
  } catch {}

  const next = { ...(store as any), profiles: recovered, activeProfileId } as T;
  writeProfilesSafetyCache(next as any);
  return next;
}


function pickBestStoreWithProfilesFromSnapshot(dump: any): { store: any; profiles: any[]; label: string } | null {
  const candidates: Array<{ store: any; profiles: any[]; label: string; score: number }> = [];

  const addCandidate = (storeLike: any, label: string, bonus = 0) => {
    try {
      if (!storeLike || typeof storeLike !== "object") return;
      const profiles = validProfileList((storeLike as any).profiles);
      if (profiles.length <= 0) return;
      const active = String((storeLike as any).activeProfileId || "");
      const activeBonus = active && profiles.some((p) => String(p?.id || "") === active) ? 25 : 0;
      candidates.push({ store: storeLike, profiles, label, score: profiles.length * 100 + activeBonus + bonus });
    } catch {}
  };

  try { addCandidate((dump as any)?.store, "dump.store", 5); } catch {}
  try { addCandidate((dump as any)?.data?.store, "dump.data.store", 5); } catch {}

  try {
    const extracted = extractStoreObjectFromSnapshot(dump)?.store;
    addCandidate(extracted, "extractStoreObjectFromSnapshot", 10);
  } catch {}

  try {
    const idb = (dump as any)?.idb;
    if (idb && typeof idb === "object") {
      const currentKey = scopedStorageKey(STORE_KEY);
      for (const [rawKey, value] of Object.entries(idb)) {
        const key = String(rawKey || "");
        const isStoreKey = key === STORE_KEY || key === currentKey || key.startsWith(`${STORE_KEY}:`) || /(^|[:/])store(?::[^:/]+)?$/.test(key);
        if (!isStoreKey) continue;
        addCandidate(value, `idb.${key}`, key === currentKey ? 50 : key === STORE_KEY ? 20 : 0);
      }
    }
  } catch {}

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

async function forceRestoreProfilesFromSnapshotIntoCurrentStore(dump: any, reason: string): Promise<boolean> {
  try {
    const best = pickBestStoreWithProfilesFromSnapshot(dump);
    if (!best?.profiles?.length) return false;

    const key = scopedStorageKey(STORE_KEY);
    let currentStore: any = {};
    try {
      const raw = await idbGet<any>(key);
      if (raw != null) {
        const json = await decompressGzip(raw as any);
        currentStore = safeJsonParse<any>(json, {}) || {};
      }
    } catch {
      currentStore = {};
    }

    const incomingStore = best.store || {};
    const incomingProfiles = validProfileList(best.profiles);
    const currentProfiles = validProfileList(currentStore?.profiles);
    const profiles = mergeProfilesForSafety(incomingProfiles, currentProfiles);

    if (!profiles.length) return false;

    const incomingActive = String(incomingStore?.activeProfileId || "").trim();
    const currentActive = String(currentStore?.activeProfileId || "").trim();
    const activeProfileId =
      (incomingActive && profiles.some((p) => String(p?.id || "") === incomingActive) ? incomingActive : "") ||
      (currentActive && profiles.some((p) => String(p?.id || "") === currentActive) ? currentActive : "") ||
      String(profiles[0]?.id || "") ||
      null;

    const nextStore = guardStoreShape({
      ...currentStore,
      ...incomingStore,
      profiles,
      activeProfileId,
      friends: Array.isArray(incomingStore?.friends) ? incomingStore.friends : (Array.isArray(currentStore?.friends) ? currentStore.friends : []),
      dartSets: Array.isArray(incomingStore?.dartSets) ? incomingStore.dartSets : (Array.isArray(currentStore?.dartSets) ? currentStore.dartSets : getAllDartSets()),
      bots: Array.isArray(incomingStore?.bots) ? incomingStore.bots : (Array.isArray(currentStore?.bots) ? currentStore.bots : loadStoredBots()),
      teams: Array.isArray(incomingStore?.teams) ? incomingStore.teams : (Array.isArray(currentStore?.teams) ? currentStore.teams : loadStoredTeams()),
    } as any);

    const json = safeJsonStringify(nextStore);
    await idbSet(key, await persistPayloadForKey(key, json));
    lastSavedStoreJsonByScope.set(key, json);
    writeProfilesSafetyCache(nextStore);

    try {
      console.warn("[storage] profils locaux restaurés explicitement depuis snapshot", {
        reason,
        source: best.label,
        profiles: profiles.length,
        activeProfileId,
        key,
      });
    } catch {}

    return true;
  } catch (e) {
    console.warn("[storage] forceRestoreProfilesFromSnapshotIntoCurrentStore failed", e);
    return false;
  }
}

function guardStoreShape<T extends Store>(store: T | null | undefined): T {
  const base: any = store && typeof store === "object" ? { ...(store as any) } : {};
  if (!Array.isArray(base.profiles)) base.profiles = [];
  if (base.activeProfileId !== undefined && base.activeProfileId !== null) {
    base.activeProfileId = String(base.activeProfileId);
  } else {
    base.activeProfileId = null;
  }
  return base as T;
}

function makeMinimalLegacyFallback<T extends Store>(store: T): Record<string, any> {
  const guarded = guardStoreShape(store);
  return {
    profiles: Array.isArray((guarded as any).profiles)
      ? (guarded as any).profiles.map((p: any) => ({
          id: p?.id ?? null,
          name: typeof p?.name === "string" ? p.name : "",
          color: typeof p?.color === "string" ? p.color : undefined,
        }))
      : [],
    activeProfileId: (guarded as any).activeProfileId ?? null,
    updatedAt: Date.now(),
    fallback: "minimal",
  };
}

const STORE_TOO_BIG_WARN_BYTES = 8 * 1024 * 1024;
const STORE_SOFT_TARGET_BYTES = 7_500_000;
const STORE_HARD_TARGET_BYTES = 6_500_000;

function guardStoreSizeForMobile<T>(store: T): T {
  try {
    const bytes = estimateObjectSizeBytes(store);
    const mb = Math.round((bytes / 1024 / 1024) * 100) / 100;
    if (bytes > STORE_TOO_BIG_WARN_BYTES) {
      storageDiag("store-too-big", { bytes, mb, reason: "store_too_big_for_mobile" });
    }
  } catch {}
  return store;
}

function trimArrayTail<T>(arr: T[], keep: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (keep <= 0) return [];
  return arr.length > keep ? arr.slice(arr.length - keep) : arr;
}

const STORE_HISTORY_KEYS = [
  "history",
  "historyCache",
  "savedMatches",
  "matchHistory",
  "matchesHistory",
  "recentMatches",
  "historyRows",
  "historyDump",
  "matchArchive",
  "historyState",
] as const;

const STORE_HEAVY_STATS_KEYS = [
  "stats",
  "statsByPlayer",
  "statsByMode",
  "profileStats",
  "leaderboards",
  "statsCache",
  "statsCaches",
  "statsSnapshots",
  "statsBySport",
  "matchStatsCache",
] as const;

function stripStoreHistoryFields(target: any) {
  if (!target || typeof target !== "object") return target;
  for (const key of STORE_HISTORY_KEYS) delete target[key];
  delete target.lastHistorySync;
  delete target.historyVersion;
  return target;
}

function stripStoreHeavyStatsFields(target: any) {
  if (!target || typeof target !== "object") return target;
  for (const key of STORE_HEAVY_STATS_KEYS) delete target[key];
  return target;
}

function sanitizeBotLikeEntry(input: any) {
  const out = { ...(input || {}) };
  const avatarDataUrl = sanitizeAvatarFieldSync(out.avatarDataUrl);
  if (!avatarDataUrl) delete out.avatarDataUrl;
  else out.avatarDataUrl = avatarDataUrl;
  if (typeof out.avatar === "string" && out.avatar.length > MAX_AVATAR_DATA_URL_CHARS) delete out.avatar;
  if (typeof out.photoDataUrl === "string" && out.photoDataUrl.length > MAX_AVATAR_DATA_URL_CHARS) delete out.photoDataUrl;
  return out;
}

function isObjectLike(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isHeavyImageDataUrl(value: any) {
  return typeof value === "string" && value.startsWith("data:image/") && value.length > 256;
}

function stripHeavyInlineImagesDeep(value: any, seen?: WeakSet<object>): any {
  if (!value || typeof value !== "object") return value;

  const guard = seen || new WeakSet<object>();
  if (guard.has(value)) return undefined;
  guard.add(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => stripHeavyInlineImagesDeep(item, guard))
      .filter((item) => item !== undefined);
  }

  if (!isObjectLike(value)) return value;

  const out: Record<string, any> = {};
  for (const [key, raw] of Object.entries(value)) {
    const lower = String(key || "").toLowerCase();

    if (
      isHeavyImageDataUrl(raw) &&
      (
        lower.includes("avatar") ||
        lower.includes("photo") ||
        lower.includes("image") ||
        lower.includes("thumbnail") ||
        lower.includes("screenshot") ||
        lower.includes("preview")
      )
    ) {
      continue;
    }

    const cleaned = stripHeavyInlineImagesDeep(raw, guard);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

function stripHeavyImagePayloads(target: any) {
  if (!target || typeof target !== "object") return target;

  const KEYS = [
    "saved",
    "matches",
    "recentMatches",
    "liveMatches",
    "resumes",
    "draftMatches",
    "pendingMatches",
  ] as const;

  for (const key of KEYS) {
    if (Array.isArray((target as any)[key])) {
      (target as any)[key] = stripHeavyInlineImagesDeep((target as any)[key]);
    }
  }

  return target;
}


function getStoreTopLevelHotspots(target: any, limit = 12) {
  try {
    if (!target || typeof target !== "object") return [];
    return Object.entries(target)
      .map(([key, value]) => ({
        key,
        bytes: estimateObjectSizeBytes(value),
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, limit)
      .map((row) => ({
        ...row,
        mb: Math.round((row.bytes / 1024 / 1024) * 100) / 100,
      }));
  } catch {
    return [];
  }
}

function recordStoreHotspots(_kind: string, _target: any) {}

function trimStoreCollection(target: any, key: string, keep: number) {
  if (!target || typeof target !== "object") return;
  if (!Array.isArray((target as any)[key])) return;
  (target as any)[key] = trimArrayTail((target as any)[key], keep);
}

function isEssentialStoreKey(key: string) {
  const lower = String(key || "").toLowerCase();
  return [
    "profiles",
    "activeprofileid",
    "settings",
    "dartsets",
    "activedartsetid",
    "teams",
    "profileteams",
    "bots",
    "friends",
    "friendinvites",
    "lang",
    "theme",
    "preferences",
    "version",
    "updatedat",
  ].includes(lower);
}

function isLikelyEphemeralStoreKey(key: string) {
  const lower = String(key || "").toLowerCase();
  if (!lower || isEssentialStoreKey(lower)) return false;
  if (STORE_HISTORY_KEYS.some((item) => String(item).toLowerCase() === lower)) return true;
  if (STORE_HEAVY_STATS_KEYS.some((item) => String(item).toLowerCase() === lower)) return true;

  return (
    lower.includes("cache") ||
    lower.includes("snapshot") ||
    lower.includes("debug") ||
    lower.includes("diagnostic") ||
    lower.includes("perf") ||
    lower.includes("leaderboard") ||
    lower.includes("summary") ||
    lower.includes("ticker") ||
    lower.includes("feed") ||
    lower.includes("tipofday") ||
    lower.includes("lastrecord") ||
    lower.includes("lastmatch") ||
    lower.includes("onlinelast") ||
    lower.includes("onlineleader") ||
    lower.includes("cloudsnapshot")
  );
}


function stripTopLevelHeavyBeforeClone(input: any): any {
  if (!input || typeof input !== "object") return input;
  const out: any = { ...(input as any) };
  stripStoreHistoryFields(out);
  stripStoreHeavyStatsFields(out);
  for (const key of Object.keys(out)) {
    const lower = String(key || "").toLowerCase();
    if (isLikelyEphemeralStoreKey(lower)) delete out[key];
  }
  return out;
}

function compactStoreForMobile<T extends Store>(store: T, mode: "soft" | "hard" = "soft"): T {
  let clone: any;
  try {
    // PERF V2: on retire les gros blocs top-level AVANT le JSON.stringify.
    // Avant, on clonait tout le store puis on supprimait history/stats/cache, ce qui coûtait
    // cher sur mobile même quand ces blocs étaient ensuite jetés.
    clone = safeJsonParse(safeJsonStringify(stripTopLevelHeavyBeforeClone(store) || {}), {});
  } catch {
    clone = { ...(stripTopLevelHeavyBeforeClone(store) || {}) };
  }

  stripStoreHistoryFields(clone);
  stripStoreHeavyStatsFields(clone);
  stripHeavyImagePayloads(clone);

  trimStoreCollection(clone, "resumes", mode === "hard" ? 4 : 8);
  trimStoreCollection(clone, "liveMatches", mode === "hard" ? 4 : 8);
  trimStoreCollection(clone, "recentMatches", mode === "hard" ? 4 : 8);
  trimStoreCollection(clone, "matches", mode === "hard" ? 6 : 10);
  trimStoreCollection(clone, "saved", mode === "hard" ? 6 : 10);
  trimStoreCollection(clone, "draftMatches", mode === "hard" ? 2 : 4);
  trimStoreCollection(clone, "pendingMatches", mode === "hard" ? 2 : 4);

  minimizeProfilesForPersistence(clone, mode === "hard");

  if (Array.isArray(clone.bots)) {
    clone.bots = clone.bots.map((b: any) => sanitizeBotLikeEntry(b));
  }

  for (const [key, value] of Object.entries(clone)) {
    const lower = String(key || "").toLowerCase();
    if (isEssentialStoreKey(lower)) continue;

    if (isLikelyEphemeralStoreKey(lower)) {
      delete clone[key];
      continue;
    }

    const bytes = estimateObjectSizeBytes(value);

    if (Array.isArray(value) && bytes > (mode === "hard" ? 180_000 : 350_000)) {
      clone[key] = trimArrayTail(value as any[], mode === "hard" ? 3 : 6);
      continue;
    }

    if (
      isObjectLike(value) &&
      bytes > (mode === "hard" ? 220_000 : 450_000) &&
      (
        lower.includes("cache") ||
        lower.includes("summary") ||
        lower.includes("stats") ||
        lower.includes("diagnostic") ||
        lower.includes("debug") ||
        lower.includes("snapshot")
      )
    ) {
      delete clone[key];
      continue;
    }

    if ((Array.isArray(value) || isObjectLike(value)) && bytes > (mode === "hard" ? 250_000 : 500_000)) {
      clone[key] = stripHeavyInlineImagesDeep(value);
    }
  }

  return guardStoreShape(clone as T);
}

function recordStoreMetric(_kind: string, _payload: Record<string, any>) {}

function cacheProfileAvatar(profile: any) {
  try {
    const profileId = String(profile?.id || "").trim();
    if (!profileId) return;

    const avatarDataUrl =
      sanitizeAvatarFieldSync(profile?.avatarDataUrl) ||
      sanitizeAvatarFieldSync(profile?.avatar) ||
      sanitizeAvatarFieldSync(profile?.photoDataUrl);

    const rawAvatarUrl =
      typeof profile?.avatarUrl === "string" && !profile.avatarUrl.startsWith("data:image/")
        ? profile.avatarUrl
        : typeof profile?.avatar === "string" && !profile.avatar.startsWith("data:image/")
          ? profile.avatar
          : undefined;

    if (!avatarDataUrl && !rawAvatarUrl) return;

    setAvatarCacheLib({
      profileId,
      avatarDataUrl: avatarDataUrl || null,
      avatarUrl: rawAvatarUrl || null,
      avatarUpdatedAt: Number(profile?.avatarUpdatedAt || Date.now()),
    });
  } catch {}
}

function stripInlineProfileAvatar(profile: any) {
  if (!profile || typeof profile !== "object") return profile;

  cacheProfileAvatar(profile);

  const out = { ...(profile || {}) };
  delete out.avatarDataUrl;
  delete out.photoDataUrl;

  if (typeof out.avatar === "string") {
    if (out.avatar.startsWith("data:image/") || out.avatar.length > MAX_AVATAR_DATA_URL_CHARS) {
      delete out.avatar;
    }
  }

  if (typeof out.avatarUrl === "string" && out.avatarUrl.startsWith("data:image/")) {
    delete out.avatarUrl;
  }

  return out;
}

function minimizeProfilesForPersistence(target: any, aggressive = false) {
  if (!target || typeof target !== "object" || !Array.isArray(target.profiles)) return target;

  const activeProfileId = String(target.activeProfileId || "").trim();

  target.profiles = target.profiles.map((p: any) => {
    const out = { ...(p || {}) };
    const profileId = String(out?.id || "").trim();
    const keepInlineAvatar = !aggressive && !!activeProfileId && profileId === activeProfileId;

    cacheProfileAvatar(out);

    const safeAvatarDataUrl = sanitizeAvatarFieldSync(out.avatarDataUrl);
    if (keepInlineAvatar && safeAvatarDataUrl) {
      out.avatarDataUrl = safeAvatarDataUrl;
    } else {
      delete out.avatarDataUrl;
    }

    if (typeof out.avatar === "string") {
      const isDataUrl = out.avatar.startsWith("data:image/");
      if (isDataUrl || out.avatar.length > MAX_AVATAR_DATA_URL_CHARS || !keepInlineAvatar) {
        delete out.avatar;
      }
    }

    if (typeof out.photoDataUrl === "string") delete out.photoDataUrl;
    if (typeof out.avatarUrl === "string" && out.avatarUrl.startsWith("data:image/")) delete out.avatarUrl;

    try {
      if (out.privateInfo && typeof out.privateInfo === "object") {
        const pi = { ...(out.privateInfo as any) };
        delete pi.password;
        delete pi.passwordHash;
        delete pi.confirmPassword;
        out.privateInfo = pi;
      }
    } catch {}

    return out;
  });

  return target;
}

function sanitizeStoreForPersistence<T extends Store>(store: T): T {
  let clone: any;
  try {
    // PERF V2: clone léger. Les blocs qui n'ont plus vocation à vivre dans le store
    // principal (historique, stats lourdes, caches, diagnostics) sont supprimés AVANT
    // le stringify. C'est ce qui réduit le plus les freeze/saveStore-slow.
    clone = safeJsonParse(safeJsonStringify(stripTopLevelHeavyBeforeClone(store) || {}), {});
  } catch {
    clone = { ...(stripTopLevelHeavyBeforeClone(store) || {}) };
  }

  stripStoreHeavyStatsFields(clone);
  stripStoreHistoryFields(clone);
  stripHeavyImagePayloads(clone);

  // Profiles: on conserve au maximum l'avatar inline du profil actif.
  // Les autres avatars sont déplacés vers le cache partagé pour éviter
  // d'exploser le store principal sur mobile.
  minimizeProfilesForPersistence(clone, false);

  // Bots: même traitement que les profils, mais jamais de duplication d'history ici.
  if (Array.isArray(clone.bots)) {
    clone.bots = clone.bots.map((b: any) => sanitizeBotLikeEntry(b));
  }

  // Éventuels caches de reprise ultra lourds conservés par d'anciennes versions.
  if (Array.isArray(clone.resumes)) clone.resumes = trimArrayTail(clone.resumes, 20);
  if (Array.isArray(clone.liveMatches)) clone.liveMatches = trimArrayTail(clone.liveMatches, 20);

  return clone as T;
}

/* ---------- Constantes ---------- */
const DB_NAME = "darts-counter-v5";
const STORE_NAME = "kv";
// Exporté car utilisé par d'autres modules (sync/auth/migrations)
export const STORE_KEY = "store";
const LEGACY_LS_KEY = "darts-counter-store-v3";

const STORAGE_USER_LS_KEY = "dc_storage_user_id_v1";
const AUTH_SESSION_LS_KEY = "dc_online_auth_supabase_v1";
let CURRENT_USER_ID: string | null = null;

function normalizeUserId(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : String(value || "").trim();
  return s ? s : null;
}

function detectUserIdFromAuthLS(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER_LS_KEY) || localStorage.getItem(AUTH_SESSION_LS_KEY);
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      const parsed = safeJsonParse<any>(raw, null);
      return normalizeUserId(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id);
    }
    return normalizeUserId(raw);
  } catch {
    return null;
  }
}

export function getStorageUser(): string | null {
  if (CURRENT_USER_ID) return CURRENT_USER_ID;
  CURRENT_USER_ID = detectUserIdFromAuthLS();
  return CURRENT_USER_ID;
}

export function setStorageUser(userId: string | null) {
  CURRENT_USER_ID = normalizeUserId(userId);
  if (typeof localStorage === "undefined") return;
  try {
    if (CURRENT_USER_ID) localStorage.setItem(STORAGE_USER_LS_KEY, CURRENT_USER_ID);
    else localStorage.removeItem(STORAGE_USER_LS_KEY);
  } catch {}
}

export function scopedStorageKey(key: string): string {
  const uid = getStorageUser();
  return uid ? `${key}:${uid}` : key;
}

function scopedLegacyStoreKey(): string {
  const uid = getStorageUser();
  return uid ? `${LEGACY_LS_KEY}:${uid}` : LEGACY_LS_KEY;
}

function scopedCloudChangeReason(reason: string): string {
  const uid = getStorageUser();
  return uid ? `${reason}:${uid}` : reason;
}

async function migrateLegacyStoreIfNeeded() {
  const uid = getStorageUser();
  if (!uid || typeof localStorage === "undefined") return;
  try {
    const namespacedKey = scopedLegacyStoreKey();
    if (localStorage.getItem(namespacedKey)) return;
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (!legacy) return;
    localStorage.setItem(namespacedKey, legacy);
  } catch {}
}

/* ============================================================
   ✅ CLOUD SNAPSHOT (LOCAL) — inclut IndexedDB + localStorage(dc_* ET dc-*)
============================================================ */
// ✅ IMPORTANT : ton app a des clés en dc_ ET en dc- selon les versions
const LS_PREFIXES = ["dc_", "dc-"] as const;
function isDcKey(k: string) {
  return LS_PREFIXES.some((p) => k.startsWith(p));
}

const LS_EXCLUDE = new Set<string>([
  // auth online (ne jamais écraser)
  "dc_online_auth_supabase_v1",
  "dc_profiles_nav_diag_v1",
  "dc_profiles_nav_diag_v2",
  "sb-auth-token",
  "supabase.auth.token",

  // si tu as des clés “presence/ping” anciennes
  "dc_online_presence_v1",
  "dc_presence_v1",

  // divers flags techniques (optionnel)
  "dc_sw_purge_once",
  "dc_last_crash",

  // historique / caches legacy désormais gérés hors localStorage
  "dc-history-v1",
  "dc-history-cache-v1",
  "dc_stats_cache_v1",
  "dc_stats_cache_v2",
  "dc_match_stats_cache_v1",
]);

const LS_LARGE_PAYLOAD_KEYS = new Set<string>([
  "dc_dart_sets_v1",
  "dc-dartsets-v1",
  "dc-dartSets-v1",
  "dc_lite_dartsets_v1",
  "dc-lite-dartsets-v1",
  "dc_bots_avatars_v1",
  "dc-teams-v1",
]);

function maxLocalStorageExportLenForKey(key: string): number {
  return LS_LARGE_PAYLOAD_KEYS.has(key) ? 2_500_000 : 250_000;
}

/**
 * ✅ HOOK GLOBAL localStorage -> emitCloudChange
 * Objectif: capturer les setItem/removeItem faits "directement" (ex: dartSetsStore)
 * Sans avoir à modifier 50 fichiers.
 *
 * - Ne touche que les clés dc_ / dc-
 * - Ignore LS_EXCLUDE
 * - Safe: no-op si déjà patché
 */
let __dcLsHookInstalled = false;

export function installLocalStorageDcHook() {
  if (typeof window === "undefined") return;
  if (__dcLsHookInstalled) return;
  __dcLsHookInstalled = true;

  try {
    const ls = window.localStorage;
    if (!ls) return;

    const originalSetItem = ls.setItem.bind(ls);
    const originalRemoveItem = ls.removeItem.bind(ls);
    const originalClear = ls.clear.bind(ls);

    // @ts-ignore
    if ((ls as any).__dc_hooked) return;
    // @ts-ignore
    (ls as any).__dc_hooked = true;

    ls.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      try {
        if (key && isDcKey(key) && !LS_EXCLUDE.has(key)) {
          emitCloudChange(`ls:set:${key}`);
        }
      } catch {}
    };

    ls.removeItem = (key: string) => {
      originalRemoveItem(key);
      try {
        if (key && isDcKey(key) && !LS_EXCLUDE.has(key)) {
          emitCloudChange(`ls:del:${key}`);
        }
      } catch {}
    };

    ls.clear = () => {
      originalClear();
      try {
        emitCloudChange(`ls:clear`);
      } catch {}
    };
  } catch {
    // si le navigateur bloque le monkey patch (rare), on ignore
  }
}

// install auto au chargement du module (web only)
try {
  if (typeof window !== "undefined") installLocalStorageDcHook();
} catch {}

/* ---------- Détection compression (gzip) ---------- */
const supportsCompression =
  typeof (globalThis as any).CompressionStream !== "undefined" &&
  typeof (globalThis as any).DecompressionStream !== "undefined";

/* ---------- Encodage / décodage ---------- */
async function compressGzip(data: string): Promise<Uint8Array | string> {
  if (!supportsCompression) return data;
  try {
    const cs = new (globalThis as any).CompressionStream("gzip");
    const stream = new Blob([data]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return data;
  }
}

async function decompressGzip(payload: ArrayBuffer | Uint8Array | string): Promise<string> {
  if (typeof payload === "string") return payload;

  // Pas de support gzip : on essaye de décoder brut
  if (!supportsCompression) {
    return new TextDecoder().decode(payload as ArrayBufferLike);
  }

  try {
    const ds = new (globalThis as any).DecompressionStream("gzip");
    const stream = new Blob([payload as ArrayBuffer]).stream().pipeThrough(ds);
    return await new Response(stream).text();
  } catch {
    // Dernier recours
    return new TextDecoder().decode(payload as ArrayBufferLike);
  }
}

/* ---------- Mini-wrapper IndexedDB (aucune lib externe) ---------- */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T = unknown>(key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);

    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: IDBValidKey, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbKeys(): Promise<IDBValidKey[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    // getAllKeys n’est pas supporté partout -> fallback curseur
    if ("getAllKeys" in store) {
      const req = (store as any).getAllKeys();
      req.onsuccess = () => resolve(req.result as IDBValidKey[]);
      req.onerror = () => reject(req.error);
    } else {
      const keys: IDBValidKey[] = [];
      const req = store.openKeyCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          keys.push(cursor.key);
          cursor.continue();
        } else {
          resolve(keys);
        }
      };
      req.onerror = () => reject(req.error);
    }
  });
}

async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ---------- Estimation de quota (quand disponible) ---------- */
export async function storageEstimate() {
  try {
    const est = (await (navigator.storage?.estimate?.() ?? Promise.resolve(undefined as any))) ?? null;

    return {
      quota: est?.quota ?? null, // bytes
      usage: est?.usage ?? null, // bytes
      usageDetails: est?.usageDetails ?? null,
    };
  } catch {
    return { quota: null, usage: null, usageDetails: null };
  }
}

function shouldExportLocalStorageDcKey(key: string, value: string | null): boolean {
  if (!key || !isDcKey(key) || LS_EXCLUDE.has(key)) return false;
  const lower = key.toLowerCase();
  if (
    lower.includes("history") ||
    lower.includes("stats") ||
    lower.includes("matchcache") ||
    lower.includes("historycache")
  ) {
    return false;
  }
  if (typeof value === "string" && value.length > maxLocalStorageExportLenForKey(key)) return false;
  return true;
}

function exportLocalStorageDc(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i) || "";
      if (!k) continue;
      const v = ls.getItem(k);
      if (!shouldExportLocalStorageDcKey(k, v)) continue;
      if (v != null) out[k] = v;
    }
  } catch {}
  return out;
}

function importLocalStorageDc(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  if (!map || typeof map !== "object") return;

  let restoredDartSets = false;
  let restoredBots = false;
  let restoredTeams = false;

  for (const [k, v] of Object.entries(map)) {
    if (!shouldExportLocalStorageDcKey(k, typeof v === "string" ? v : String(v ?? ""))) continue;
    try {
      window.localStorage.setItem(k, String(v ?? ""));
      if (LS_DARTSETS_KEYS.includes(k as any) || LS_ACTIVE_DARTSET_KEYS.includes(k as any)) restoredDartSets = true;
      if (k === "dc_bots_v1" || k === "dc_bots_avatars_v1") restoredBots = true;
      if (k === "dc-teams-v1") restoredTeams = true;
    } catch {}
  }

  try {
    if (restoredDartSets) window.dispatchEvent(new Event("dc-dartsets-updated"));
  } catch {}
  try {
    if (restoredBots) window.dispatchEvent(new Event("dc:bots-changed"));
  } catch {}
  try {
    if (restoredTeams) {
      window.dispatchEvent(new Event("dc-teams-updated"));
      window.dispatchEvent(new Event("dc:teams-changed"));
    }
  } catch {}
}

// Utile en mode "replace" : évite de garder des dc_* / dc-* obsolètes
function clearLocalStorageDc(): void {
  if (typeof window === "undefined") return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i) || "";
      if (!k) continue;
      if (!shouldExportLocalStorageDcKey(k, window.localStorage.getItem(k))) continue;
      toDelete.push(k);
    }
    for (const k of toDelete) {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    }
  } catch {}
}

function findStoreDumpKey(idbDump: Record<string, any>): string | null {
  const scoped = scopedStorageKey(STORE_KEY);
  if (Object.prototype.hasOwnProperty.call(idbDump, scoped)) return scoped;
  if (Object.prototype.hasOwnProperty.call(idbDump, STORE_KEY)) return STORE_KEY;
  const keys = Object.keys(idbDump || {});
  return keys.find((k) => k === STORE_KEY || /(^|[:/])store(?::[^:/]+)?$/.test(String(k))) || null;
}

function injectCollectionsIntoSnapshotStore(idbDump: Record<string, any>): Record<string, any> {
  try {
    const nextIdb = { ...(idbDump || {}) };
    const storeKey = findStoreDumpKey(nextIdb) || scopedStorageKey(STORE_KEY);
    const baseStore = isRecord(nextIdb[storeKey]) ? { ...(nextIdb[storeKey] as any) } : {};

    const dartSets = getAllDartSets();
    if (Array.isArray(dartSets)) baseStore.dartSets = dartSets;

    const bots = loadStoredBots();
    if (Array.isArray(bots)) baseStore.bots = bots;

    // ✅ NAS BACKUP TEAMS: Profiles > Teams écrit dans localStorage (dc-teams-v1),
    // pas toujours dans le store principal. On l'injecte explicitement pour que
    // le backup NAS soit restaurable même si la clé localStorage est trop lourde.
    const teams = loadStoredTeams();
    if (Array.isArray(teams)) baseStore.teams = teams;

    nextIdb[storeKey] = sanitizeStoreForPersistence(baseStore as any);
    return nextIdb;
  } catch (err) {
    console.warn("[storage] injectCollectionsIntoSnapshotStore failed", err);
    return idbDump;
  }
}

/* ============================================================
   ✅ NORMALISATION AVATARS (COMPAT)
============================================================ */
function normalizeStoreAvatarsCompatSync<T extends any>(store: T): { store: T; changed: boolean } {
  try {
    const profiles = (store as any)?.profiles;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { store, changed: false };
    }

    let changed = false;

    const nextProfiles = profiles.map((p: any) => {
      if (!p || typeof p !== "object") return p;

      const avatarUrl = typeof p.avatarUrl === "string" ? p.avatarUrl.trim() : "";
      const avatarPath = typeof p.avatarPath === "string" ? p.avatarPath.trim() : "";
      const avatarDataUrl = sanitizeAvatarFieldSync(p.avatarDataUrl);

      // ✅ legacy champs rencontrés dans d'anciennes versions
      const legacyAvatar =
        sanitizeAvatarFieldSync(p.avatar) ||
        sanitizeAvatarFieldSync(p.photoDataUrl) ||
        (typeof p.photoUrl === "string" ? String(p.photoUrl).trim() : "");

      if (!avatarDataUrl) {
        if (typeof p?.avatarDataUrl === "string" && p.avatarDataUrl.length > MAX_AVATAR_DATA_URL_CHARS) {
          changed = true;
          return { ...p, avatarDataUrl: undefined };
        }
        if (avatarUrl) {
          changed = true;
          return { ...p, avatarDataUrl: avatarUrl };
        }

        if (
          legacyAvatar &&
          (legacyAvatar.startsWith("http://") ||
            legacyAvatar.startsWith("https://") ||
            legacyAvatar.startsWith("data:") ||
            legacyAvatar.startsWith("blob:"))
        ) {
          changed = true;
          return { ...p, avatarDataUrl: legacyAvatar };
        }

        if (
          avatarPath &&
          (avatarPath.startsWith("http://") ||
            avatarPath.startsWith("https://") ||
            avatarPath.startsWith("data:") ||
            avatarPath.startsWith("blob:"))
        ) {
          changed = true;
          return { ...p, avatarDataUrl: avatarPath };
        }
      }

      return p;
    });

    if (!changed) return { store, changed: false };

    return {
      store: { ...(store as any), profiles: nextProfiles } as T,
      changed: true,
    };
  } catch {
    return { store, changed: false };
  }
}

/* ============================================================
   ✅ NORMALISATION AVATAR (PERF)
============================================================ */
function isHugeImageDataUrl(s: any, minLen = 200_000): s is string {
  return typeof s === "string" && s.startsWith("data:image/") && s.length > minLen;
}


function sanitizeAvatarFieldSync(v: any): string {
  try {
    return sanitizeAvatarDataUrl(v, MAX_AVATAR_DATA_URL_CHARS) || "";
  } catch {
    return "";
  }
}

async function downscaleImageDataUrl(dataUrl: string, maxSize = 256, quality = 0.82): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  return new Promise<string>((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 1;
          const h = img.naturalHeight || img.height || 1;

          const scale = Math.min(1, maxSize / Math.max(w, h));
          const tw = Math.max(1, Math.round(w * scale));
          const th = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement("canvas");
          canvas.width = tw;
          canvas.height = th;

          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(dataUrl);

          ctx.drawImage(img, 0, 0, tw, th);

          const out = canvas.toDataURL("image/jpeg", quality);
          resolve(out || dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

async function normalizeStoreAvatarsPerf<T extends Store>(store: T): Promise<{ store: T; changed: boolean }> {
  try {
    const profiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
    if (profiles.length === 0) return { store, changed: false };

    let changed = false;

    const nextProfiles = await Promise.all(
      profiles.map(async (p) => {
        if (!p) return p;

        const hasAvatarUrl = typeof p.avatarUrl === "string" && p.avatarUrl.trim().length > 0;
        if (hasAvatarUrl) return p;

        const raw = sanitizeAvatarFieldSync(p.avatarDataUrl) || p.avatarDataUrl;

        if (typeof raw === "string" && raw.startsWith("data:image/") && raw.length > MAX_AVATAR_DATA_URL_CHARS) {
          changed = true;
          return { ...p, avatarDataUrl: undefined };
        }

        if (isHugeImageDataUrl(raw)) {
          const slim = await downscaleImageDataUrl(raw, 256, 0.82);
          if (typeof slim === "string" && slim !== raw) {
            changed = true;
            return { ...p, avatarDataUrl: slim };
          }
        }

        return p;
      })
    );

    if (!changed) return { store, changed: false };

    return {
      store: { ...(store as any), profiles: nextProfiles } as T,
      changed: true,
    };
  } catch {
    return { store, changed: false };
  }
}

async function normalizeStoreAll<T extends Store>(store: T): Promise<{ store: T; changed: boolean }> {
  const compat = normalizeStoreAvatarsCompatSync(store);
  const perf = await normalizeStoreAvatarsPerf(compat.store);
  return { store: perf.store, changed: compat.changed || perf.changed };
}

function attachAuthoritativeDartSetsToStore<T extends any>(store: T): T {
  try {
    const dartSets = getAllDartSets();
    if (Array.isArray(dartSets) && dartSets.length > 0) {
      return { ...(store as any), dartSets } as T;
    }
  } catch {}
  return store;
}

/* ---------- API publique principale ---------- */

export async function loadStore<T extends Store>(): Promise<T | null> {
  try {
    await migrateLegacyStoreIfNeeded();
    const raw = (await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(STORE_KEY))) ?? null;

    if (raw != null) {
      const json = await decompressGzip(raw as any);
      const parsed = safeJsonParse<T | null>(json, null);

      if (!parsed) return null;

      const guarded = await protectProfilesAgainstEmptyOverwrite(guardStoreShape(parsed), "loadStore:idb");
      const norm = await normalizeStoreAll(guarded);

      if (norm.changed) {
        try {
          const storeScopeKey = scopedStorageKey(STORE_KEY);
          const normJson = safeJsonStringify(norm.store);
          const payload = await persistPayloadForKey(storeScopeKey, normJson);
          await idbSet(storeScopeKey, payload);
          lastSavedStoreJsonByScope.set(storeScopeKey, normJson);

          try {
            emitCloudChange(scopedCloudChangeReason("idb:set:store"));
          } catch (e) {
            console.warn("emitCloudChange failed", e);
          }
        } catch {}
      }

      return guardStoreShape(attachAuthoritativeDartSetsToStore(norm.store));
    }

    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy) {
      const parsed = safeJsonParse<T | null>(legacy, null);
      if (!parsed) return null;

      const guarded = await protectProfilesAgainstEmptyOverwrite(guardStoreShape(parsed), "loadStore:idb");
      const norm = await normalizeStoreAll(guarded);

      await saveStore(norm.store);
      try {
        localStorage.removeItem(scopedLegacyStoreKey());
      } catch {}

      return guardStoreShape(attachAuthoritativeDartSetsToStore(norm.store));
    }

    return null;
  } catch (err) {
    console.warn("[storage] loadStore error:", err);
    return null;
  }
}

type SaveOpts = {
  skipAsyncNormalize?: boolean;
};

export async function saveStore<T extends Store>(store: T, opts?: SaveOpts): Promise<void> {
  const guardedInput = await protectProfilesAgainstEmptyOverwrite(guardStoreShape(store), "saveStore");
  const startedAt = storageNowMs();

  try {
    const tCompat0 = storageNowMs();
    const compat = normalizeStoreAvatarsCompatSync(guardedInput);
    const tCompat1 = storageNowMs();

    // IMPORTANT:
    // We no longer re-run expensive async avatar downscaling on every global store save.
    // Avatar compression must happen at import/edit time, not during routine navigation saves.
    let persistedStore = guardStoreShape(sanitizeStoreForPersistence(attachAuthoritativeDartSetsToStore(compat.store as T)));
    const tSanitize1 = storageNowMs();

    let json = safeJsonStringify(persistedStore);
    let bytes = json.length;

    if (bytes > STORE_SOFT_TARGET_BYTES) {
      persistedStore = attachAuthoritativeDartSetsToStore(compactStoreForMobile(persistedStore, "soft"));
      json = safeJsonStringify(persistedStore);
      bytes = json.length;
    }

    if (bytes > STORE_HARD_TARGET_BYTES) {
      persistedStore = attachAuthoritativeDartSetsToStore(compactStoreForMobile(persistedStore, "hard"));
      json = safeJsonStringify(persistedStore);
      bytes = json.length;
    }

    persistedStore = attachAuthoritativeDartSetsToStore(guardStoreSizeForMobile(persistedStore));
    json = safeJsonStringify(persistedStore);
    bytes = json.length;
    const tCompact1 = storageNowMs();

    const storeScopeKey = scopedStorageKey(STORE_KEY);
    const prevJson = lastSavedStoreJsonByScope.get(storeScopeKey);
    if (prevJson === json) {
      const endedAt = storageNowMs();
      const totalMs = Math.round((endedAt - startedAt) * 10) / 10;
      const diagPayload = {
        totalMs,
        compatMs: Math.round((tCompat1 - tCompat0) * 10) / 10,
        sanitizeMs: Math.round((tSanitize1 - tCompat1) * 10) / 10,
        compactMs: Math.round((tCompact1 - tSanitize1) * 10) / 10,
        gzipMs: 0,
        jsonBytes: bytes,
        payloadBytes: 0,
        profiles: Array.isArray((persistedStore as any)?.profiles) ? (persistedStore as any).profiles.length : 0,
        bots: Array.isArray((persistedStore as any)?.bots) ? (persistedStore as any).bots.length : 0,
        dartSets: Array.isArray((persistedStore as any)?.dartSets) ? (persistedStore as any).dartSets.length : 0,
        skippedWrite: true,
        activeProfileId: (persistedStore as any)?.activeProfileId ?? null,
      };
      if (STORAGE_DIAG_ENABLED) storageDiag("saveStore-skipped", diagPayload);
      if (totalMs >= 50) runtimeDiag("storage:saveStore:skipped", diagPayload);
      return;
    }

    let payload = await persistPayloadForKey(storeScopeKey, json);
    const tGzip1 = storageNowMs();

    const est = await getQuotaEstimateCached();
    if (est.quota != null && est.usage != null && typeof payload !== "string") {
      const projected = est.usage + (payload as Uint8Array).byteLength;
      if (projected > est.quota * 0.98) {
        storageDiag("quota-near-full", {
          usage: est.usage,
          quota: est.quota,
          projected,
          bytes,
        });
        const emergencyStore = attachAuthoritativeDartSetsToStore(compactStoreForMobile(persistedStore, "hard"));
        persistedStore = guardStoreShape(emergencyStore as T);
        json = safeJsonStringify(persistedStore);
        payload = await persistPayloadForKey(scopedStorageKey(STORE_KEY), json);
        bytes = json.length;
      }
    }

    await idbSet(storeScopeKey, payload);
    lastSavedStoreJsonByScope.set(storeScopeKey, json);
    const endedAt = storageNowMs();
    const totalMs = Math.round((endedAt - startedAt) * 10) / 10;
    const payloadBytes = typeof payload === "string" ? payload.length : ((payload as Uint8Array)?.byteLength || 0);

    const diagPayload = {
      totalMs,
      compatMs: Math.round((tCompat1 - tCompat0) * 10) / 10,
      sanitizeMs: Math.round((tSanitize1 - tCompat1) * 10) / 10,
      compactMs: Math.round((tCompact1 - tSanitize1) * 10) / 10,
      gzipMs: Math.round((tGzip1 - tCompact1) * 10) / 10,
      jsonBytes: bytes,
      payloadBytes,
      profiles: Array.isArray((persistedStore as any)?.profiles) ? (persistedStore as any).profiles.length : 0,
      bots: Array.isArray((persistedStore as any)?.bots) ? (persistedStore as any).bots.length : 0,
      dartSets: Array.isArray((persistedStore as any)?.dartSets) ? (persistedStore as any).dartSets.length : 0,
      skipAsyncNormalize: opts?.skipAsyncNormalize === true,
      activeProfileId: (persistedStore as any)?.activeProfileId ?? null,
    };
    if (STORAGE_DIAG_ENABLED) {
      storageDiag(totalMs >= 120 ? "saveStore-slow" : "saveStore", diagPayload);
    }
    if (totalMs >= 50) {
      runtimeDiag(totalMs >= 120 ? "storage:saveStore:slow" : "storage:saveStore", diagPayload);
    }
  } catch (err) {
    console.error("[storage] saveStore error:", err);
    try {
      const minimalFallback = makeMinimalLegacyFallback(guardedInput);
      localStorage.setItem(scopedLegacyStoreKey(), safeJsonStringify(minimalFallback));
    } catch {
      console.warn("[storage] legacy fallback skipped");
    }
  }
}

export async function clearStore(): Promise<void> {
  try {
    await idbDel(scopedStorageKey(STORE_KEY));
    lastSavedStoreJsonByScope.delete(scopedStorageKey(STORE_KEY));
  } catch {}
  try {
    localStorage.removeItem(scopedLegacyStoreKey());
  } catch {}
}

/* ---------- KV générique ---------- */
export async function getKV<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(key));
    if (raw == null) return null;
    const json = await decompressGzip(raw as any);
    return safeJsonParse<T | null>(json, null);
  } catch (err) {
    console.warn("[storage] getKV error:", key, err);
    return null;
  }
}

/** Enregistre une valeur JSON (gzip si dispo). */
export async function setKV(key: string, value: any): Promise<void> {
  try {
    const json = safeJsonStringify(value);
    const payload = await compressGzip(json);

    await idbSet(scopedStorageKey(key), payload);

    // ✅ signal cloud après écriture OK
    emitCloudChange(scopedCloudChangeReason(`idb:set:${key}`));
  } catch (err) {
    console.error("[storage] setKV error:", key, err);
  }
}

/** Supprime une clé. */
export async function delKV(key: string): Promise<void> {
  try {
    await idbDel(scopedStorageKey(key));

    // ✅ signal cloud après suppression OK
    emitCloudChange(scopedCloudChangeReason(`idb:del:${key}`));
  } catch (err) {
    console.warn("[storage] delKV error:", key, err);
  }
}

/* ---------- Helpers export IDB ---------- */
async function listKVKeys(): Promise<string[]> {
  const keys = await idbKeys();
  return keys.map((k) => String(k));
}

/* ============================================================
   Export / Import ALL (IDB + localStorage dc_* & dc-*)
   ✅ FIX : importAll supporte _v:2 (exportAll actuel) + restore history
============================================================ */
export async function exportAll(): Promise<any> {
  const idbDump: Record<string, any> = {};

  try {
    const db = await openDB();

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const req = store.getAllKeys();

    const keys: IDBValidKey[] = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const valuesReq = store.getAll();

    const values: any[] = await new Promise((resolve, reject) => {
      valuesReq.onsuccess = () => resolve(valuesReq.result || []);
      valuesReq.onerror = () => reject(valuesReq.error);
    });

    for (let i = 0; i < keys.length; i++) {
      try {
        const raw = values[i];

        if (raw == null) continue;

        const json = await decompressGzip(raw);
        const parsed = safeJsonParse(json, null);
        if (String(keys[i]) === scopedStorageKey(STORE_KEY) && parsed && typeof parsed === "object") {
          idbDump[String(keys[i])] = sanitizeStoreForPersistence(parsed as any);
        } else {
          idbDump[String(keys[i])] = parsed;
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[storage] exportAll optimized read failed:", err);
  }

  const lsDump = exportLocalStorageDc();
  const nextIdbDump = injectCollectionsIntoSnapshotStore(idbDump);

  const tournaments = await exportLocalTournamentsSnapshot().catch((err) => {
    console.warn("[storage] export tournaments snapshot failed", err);
    return { _v: 1, exportedAt: new Date().toISOString(), tournaments: [], matchesByTournament: {}, counts: { tournaments: 0, matchesBuckets: 0, matches: 0 } };
  });

  return {
    _v: 2,
    idb: nextIdbDump,
    localStorage: lsDump,
    history: await exportHistoryDump().catch(() => ({ _v: 1, rows: {} })),
    // ✅ NAS BACKUP: les ligues/tournois vivent dans dc_tournaments_db_v1,
    // une IndexedDB séparée du store principal. On les embarque explicitement
    // pour que /sync/push puis /sync/pull restaurent aussi les compétitions.
    tournaments,
    competitions: tournaments,
    teams: loadStoredTeams(),
    exportedAt: new Date().toISOString(),
  };
}

async function importIdbEntryRaw(rawKey: string, value: any): Promise<void> {
  const key = String(rawKey || "").trim();
  if (!key) return;

  const isStoreLikeKey = key === STORE_KEY || key.startsWith(`${STORE_KEY}:`) || /(^|[:/])store$/.test(key);
  const valueToPersist = isStoreLikeKey ? sanitizeStoreForPersistence(value as any) : value;
  const json = safeJsonStringify(valueToPersist);
  const payload = await persistPayloadForKey(key, json);

  const targets = new Set<string>();
  targets.add(key);

  // ✅ Compat snapshots legacy/non-namespacés:
  // si la clé importée n'est pas déjà scoped pour l'utilisateur courant,
  // on écrit AUSSI la version scoped afin que loadStore()/getKV("store")
  // relisent correctement le store après reconnexion.
  const currentUid = getStorageUser();
  if (currentUid) {
    const alreadyScopedForCurrentUser = key === scopedStorageKey(STORE_KEY) || key.endsWith(`:${currentUid}`);
    if (!alreadyScopedForCurrentUser) {
      const scoped = scopedStorageKey(key);
      if (scoped !== key) targets.add(scoped);
    }
  }

  for (const target of targets) {
    await idbSet(target, payload);
  }
}



// ============================================================
// ✅ RESTORE FALLBACK latest.json / NAS
// Certains backups ne contiennent plus history.rows, mais contiennent encore
// dc_stats_index_v2 avec matchIdsByMode. Dans ce cas on recrée des lignes
// d'historique MINIMALES pour que HistoryPage revoie les parties, tout en
// gardant l'index stats restauré comme source de vérité.
// ============================================================
function storageStatsIndexHasData(idx: any): boolean {
  try {
    if (!idx || typeof idx !== "object") return false;
    if (Number(idx?.totals?.matches || 0) > 0) return true;
    const byPlayer = idx?.byPlayer && typeof idx.byPlayer === "object" ? idx.byPlayer : {};
    return Object.values(byPlayer).some((p: any) => Number((p as any)?.matches || 0) > 0);
  } catch { return false; }
}

function pickBestRestorableStatsIndexFromDump(dump: any): any | null {
  try {
    const idb = dump?.idb && typeof dump.idb === "object" ? dump.idb : {};
    const currentUid = getStorageUser();
    const candidates = Object.entries(idb)
      .filter(([k, v]) => String(k).startsWith("dc_stats_index_v2") && storageStatsIndexHasData(v))
      .map(([k, v]) => {
        const idx: any = v || {};
        const matches = Number(idx?.totals?.matches || 0) || 0;
        const players = idx?.byPlayer && typeof idx.byPlayer === "object" ? Object.keys(idx.byPlayer).length : 0;
        const scopedBonus = currentUid && String(k).includes(currentUid) ? 100000 : 0;
        return { key: String(k), value: idx, score: scopedBonus + matches * 1000 + players };
      })
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.value || null;
  } catch { return null; }
}

function markRestoredStatsIndex(idx: any): any {
  if (!idx || typeof idx !== "object") return idx;
  return {
    ...idx,
    version: Number(idx?.version || 2) || 2,
    rebuiltAt: Number(idx?.rebuiltAt || Date.now()) || Date.now(),
    meta: {
      ...(idx?.meta && typeof idx.meta === "object" ? idx.meta : {}),
      source: "restore-latest-json-stats-index",
      restoredFromStatsIndex: true,
      rowsScanned: Number(idx?.meta?.rowsScanned || idx?.totals?.matches || 0) || 0,
      historyUpdatedAt: Number(idx?.meta?.historyUpdatedAt || idx?.rebuiltAt || Date.now()) || Date.now(),
    },
  };
}

function storageModeLabel(mode: string): string {
  const m = String(mode || "unknown").toLowerCase();
  if (m === "x01") return "X01";
  if (m === "babyfoot") return "Baby-foot";
  if (m === "cricket") return "Cricket";
  if (m === "killer") return "Killer";
  if (m === "golf") return "Golf";
  if (m === "shanghai") return "Shanghai";
  return m ? m.toUpperCase() : "MATCH";
}

function storageTsFromMatchId(id: string, fallback: number, offset: number): number {
  try {
    const s = String(id || "");
    const m = s.match(/(?:^|[-_])(\d{13})(?:[-_]|$)/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 1000000000000) return n;
    }
  } catch {}
  const base = Number(fallback || Date.now()) || Date.now();
  return base - Math.max(0, offset) * 60000;
}

function storagePlayerModeScore(p: any, mode: string): number {
  try {
    const m = String(mode || "").toLowerCase();
    let score = 0;
    if (m && p?.[m] && typeof p[m] === "object") score += 5000;
    if (m === "x01") {
      score += Number(p?.dartsThrown || 0) > 0 || Number(p?.pointsScored || 0) > 0 || p?.buckets ? 2500 : 0;
    }
    score += (Number(p?.matches || 0) || 0) * 20;
    score += (Number(p?.wins || 0) || 0) * 8;
    score += Number(p?.lastMatchAt || 0) / 1000000000;
    return score;
  } catch { return 0; }
}

function storagePlayersForSyntheticHistory(idx: any, mode: string): any[] {
  try {
    const byPlayer = idx?.byPlayer && typeof idx.byPlayer === "object" ? idx.byPlayer : {};
    const rows = Object.entries(byPlayer)
      .map(([pid, raw]) => ({ pid: String(pid), raw: raw as any, score: storagePlayerModeScore(raw, mode) }))
      .filter((x) => x.pid && x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return rows.map(({ pid, raw }) => ({
      id: String(raw?.playerId || pid),
      playerId: String(raw?.playerId || pid),
      profileId: String(raw?.playerId || pid),
      name: String(raw?.name || raw?.displayName || raw?.nickname || pid),
      matches: Number(raw?.matches || 0) || 0,
      wins: Number(raw?.wins || 0) || 0,
      losses: Number(raw?.losses || 0) || 0,
      dartsThrown: Number(raw?.dartsThrown || 0) || 0,
      pointsScored: Number(raw?.pointsScored || 0) || 0,
      avg3: Number(raw?.avg3 || 0) || 0,
      bestVisit: Number(raw?.bestVisit || 0) || 0,
      bestCheckout: Number(raw?.bestCheckout || 0) || 0,
      buckets: raw?.buckets && typeof raw.buckets === "object" ? raw.buckets : {},
      ...(raw?.[String(mode).toLowerCase()] && typeof raw[String(mode).toLowerCase()] === "object" ? { [String(mode).toLowerCase()]: raw[String(mode).toLowerCase()] } : {}),
    }));
  } catch { return []; }
}

function buildSyntheticHistoryDumpFromStatsIndex(idx: any): any | null {
  try {
    if (!storageStatsIndexHasData(idx)) return null;
    const rows: Record<string, any> = {};
    const byMode = idx?.byMode && typeof idx.byMode === "object" ? idx.byMode : {};
    const matchIdsByMode = idx?.matchIdsByMode && typeof idx.matchIdsByMode === "object" ? idx.matchIdsByMode : {};
    const defaultTs = Number(idx?.meta?.historyUpdatedAt || idx?.rebuiltAt || Date.now()) || Date.now();

    for (const [modeRaw, infoRaw] of Object.entries(byMode)) {
      const mode = String(modeRaw || "unknown").toLowerCase();
      const info: any = infoRaw || {};
      const count = Number(info?.matches || 0) || 0;
      if (!count) continue;
      const rawIds = Array.isArray((matchIdsByMode as any)[mode]) ? (matchIdsByMode as any)[mode].filter(Boolean).map(String) : [];
      const ids = rawIds.length ? rawIds : Array.from({ length: count }, (_, i) => `restored-${mode}-${defaultTs}-${i + 1}`);
      const players = storagePlayersForSyntheticHistory(idx, mode);
      const winner = players.find((p: any) => Number(p?.wins || 0) > 0) || players[0] || null;
      const modeTs = Number(info?.lastMatchAt || defaultTs) || defaultTs;

      ids.forEach((id: string, i: number) => {
        const ts = storageTsFromMatchId(id, modeTs, i);
        rows[id] = {
          id,
          matchId: id,
          kind: mode,
          mode,
          sport: mode === "babyfoot" ? "babyfoot" : "darts",
          status: "finished",
          createdAt: ts,
          updatedAt: ts,
          finishedAt: ts,
          players,
          winnerId: winner?.id || winner?.playerId || null,
          winnerName: winner?.name || null,
          restoredFromStatsIndex: true,
          statsOnly: true,
          game: {
            mode,
            startScore: mode === "x01" ? 301 : undefined,
            restoredFromStatsIndex: true,
          },
          summary: {
            mode,
            status: "finished",
            title: `${storageModeLabel(mode)} restauré`,
            restoredFromStatsIndex: true,
            statsOnly: true,
            players,
            winnerId: winner?.id || winner?.playerId || null,
            scoreLine: "Stats restaurées depuis dc_stats_index_v2 — détail des volées absent",
            avg3ByPlayer: Object.fromEntries(players.map((p: any) => [String(p.id), Number(p.avg3 || 0) || 0])),
            bestVisitByPlayer: Object.fromEntries(players.map((p: any) => [String(p.id), Number(p.bestVisit || 0) || 0])),
          },
        };
      });
    }

    return Object.keys(rows).length ? { _v: 1, rows } : null;
  } catch { return null; }
}

export async function importAll(dump: any): Promise<void> {
  if (!dump) return;

  // ✅ Support snapshots structurés (v1 et v2)
  // - v2 = format produit par exportAll() dans ce fichier
  if ((dump._v === 1 || dump._v === 2) && dump.idb) {
    const idbDump = dump.idb || {};
    const lsDump = dump.localStorage || {};
    const restoredStatsIndex = markRestoredStatsIndex(pickBestRestorableStatsIndexFromDump(dump));

    // 1) restore KV (IDB kv)
    // ⚠️ IMPORTANT: un exportAll() v2 contient déjà des clés IDB potentiellement namespacées
    // (ex: "store:<uid>"). Il ne faut SURTOUT PAS repasser par setKV(), sinon la clé est
    // re-scopée une 2e fois ("store:<uid>:<uid>") et le store redevient introuvable.
    for (const [k, v] of Object.entries(idbDump)) {
      try {
        await importIdbEntryRaw(String(k), v);
      } catch (e) {
        console.warn("[storage] importAll idb entry failed", k, e);
      }
    }

    // ✅ Si un vrai dc_stats_index_v2 est présent, on le réécrit explicitement
    // sur la clé scopée de l'utilisateur courant. C'est le bloc qui contient
    // les 51 parties/stats quand history.rows est vide.
    try {
      if (storageStatsIndexHasData(restoredStatsIndex)) {
        await importIdbEntryRaw("dc_stats_index_v2", restoredStatsIndex);
      }
    } catch (e) {
      console.warn("[storage] importAll restored stats index preserve failed", e);
    }

    // 2) restore localStorage (dc_* + dc-*)
    importLocalStorageDc(lsDump);

    // 2.0) ✅ RESTORE PROFILS LOCAUX PRIORITAIRE
    // Certains snapshots NAS affichent bien "46 profils", mais l'app relit ensuite
    // une clé de store scopée différente ou un store partiel. On force donc la
    // réécriture du meilleur bloc profiles trouvé dans le snapshot vers la clé
    // courante `store:<userId>` AVANT le reload React.
    try {
      await forceRestoreProfilesFromSnapshotIntoCurrentStore(dump, "importAll:explicit-profiles-restore");
    } catch (e) {
      console.warn("[storage] importAll explicit profiles restore failed", e);
    }

    // 2.1) 🛡️ Protection profils locaux : si le snapshot NAS/cloud a restauré
    // un store partiel avec profiles: [], on réinjecte les profils connus avant
    // que l'app ne recharge l'état React.
    try {
      const key = scopedStorageKey(STORE_KEY);
      const raw = await idbGet<any>(key);
      if (raw != null) {
        const json = await decompressGzip(raw as any);
        const parsedStore = safeJsonParse<any>(json, null);
        if (parsedStore && typeof parsedStore === "object") {
          const protectedStore = await protectProfilesAgainstEmptyOverwrite(guardStoreShape(parsedStore), "importAll:snapshot");
          const protectedJson = safeJsonStringify(protectedStore);
          await idbSet(key, await persistPayloadForKey(key, protectedJson));
          lastSavedStoreJsonByScope.set(key, protectedJson);
        }
      }
    } catch (e) {
      console.warn("[storage] importAll profile safety failed", e);
    }

    // 2bis) ✅ NAS BACKUP TEAMS : restore Profiles > Teams depuis le champ
    // explicite du snapshot ou depuis le store injecté. Ça couvre aussi les cas
    // où dc-teams-v1 a été exclu du localStorage dump car trop volumineux.
    try {
      const { teams } = extractTeamsFromSnapshot(dump);
      if (Array.isArray(teams)) {
        saveStoredTeams(teams as any[]);
        try { window.dispatchEvent(new Event("dc-teams-updated")); } catch {}
        try { window.dispatchEvent(new Event("dc:teams-changed")); } catch {}
      }
    } catch (e) {
      console.warn("[storage] importAll teams restore failed", e);
    }

    // 3) ✅ CRITIQUE : restore DB historique (historyCloud)
    // Si history.rows est vide mais dc_stats_index_v2 contient les matchIds,
    // on reconstruit des cartes d'historique minimales. Elles ne recréent pas
    // les volées perdues, mais elles font réapparaître les parties dans Historique
    // et empêchent l'écran Stats de repartir d'un historique totalement vide.
    try {
      const rawRows = dump?.history?.rows && typeof dump.history.rows === "object" ? dump.history.rows : {};
      const hasRealHistoryRows = Object.keys(rawRows).length > 0;
      if (dump.history && dump.history._v === 1 && hasRealHistoryRows) {
        await importHistoryDump(dump.history, { replace: true });
      } else {
        const syntheticHistory = buildSyntheticHistoryDumpFromStatsIndex(restoredStatsIndex);
        if (syntheticHistory?.rows && Object.keys(syntheticHistory.rows).length > 0) {
          await importHistoryDump(syntheticHistory, { replace: true });
          try { localStorage.setItem("dc_history_restored_from_stats_index_v1", "1"); } catch {}
        } else if (dump.history && dump.history._v === 1) {
          await importHistoryDump(dump.history, { replace: true });
        }
      }
      try { if (typeof window !== "undefined") window.dispatchEvent(new Event("dc-history-updated")); } catch {}
    } catch (e) {
      console.warn("[storage] importAll history restore failed", e);
    }

    // 4) ✅ NAS BACKUP : restore ligues/tournois créés.
    // Compat: "tournaments" est le champ officiel, "competitions" est gardé
    // comme alias de sécurité pour les snapshots patchés.
    try {
      const competitionsDump = dump.tournaments || dump.competitions || null;
      if (competitionsDump && typeof competitionsDump === "object") {
        await importLocalTournamentsSnapshot(competitionsDump, { replace: true });
      }
    } catch (e) {
      console.warn("[storage] importAll tournaments restore failed", e);
    }

    try {
      const maybeStoreKey = scopedStorageKey(STORE_KEY);
      const rawStore = await idbGet<any>(maybeStoreKey);
      if (typeof rawStore === "string") lastSavedStoreJsonByScope.set(maybeStoreKey, rawStore);
    } catch {}
    return;
  }

  // fallback legacy (imports très anciens clé->valeur)
  if (typeof dump === "object") {
    for (const [k, v] of Object.entries(dump)) {
      try {
        await importIdbEntryRaw(String(k), v);
      } catch (e) {
        console.warn("[storage] importAll legacy entry failed", k, e);
      }
    }
  }
}

/* ============================================================
   🧩 DartSets — compat localStorage (SOURCE DE VÉRITÉ UI)
   Objectif : restaurer les dartSets EXACTEMENT là où l’UI lit
============================================================ */

const LS_DARTSETS_KEYS = ["dc_dart_sets_v1", "dc-dartsets-v1", "dc-dartSets-v1", "dc_lite_dartsets_v1", "dc-lite-dartsets-v1"];

const LS_ACTIVE_DARTSET_KEYS = ["dc-active-dartset-id", "dc-active-dartSet-id", "dc_dartset_active"];

function isRecord(x: any): x is Record<string, any> {
  return x && typeof x === "object" && !Array.isArray(x);
}

function pickFirst<T>(...vals: Array<T | undefined | null>): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

function writeDartSetsToLocalStorage(dartSets: any) {
  try {
    // ✅ NAS RESTORE FIX: passer par le store officiel des DartSets.
    // Il sait relire/écrire le format compressé et garde la même clé que l'UI.
    if (Array.isArray(dartSets)) {
      replaceAllDartSets(dartSets as any);
      return;
    }
  } catch (e) {
    console.warn("[dartsets] replaceAllDartSets failed, fallback localStorage", e);
  }

  try {
    const s = safeJsonStringify(dartSets ?? {});
    for (const k of LS_DARTSETS_KEYS) localStorage.setItem(k, s);
  } catch (e) {
    console.warn("[dartsets] write localStorage failed", e);
  }
}

function writeActiveDartSetIdToLocalStorage(activeId: any) {
  if (!activeId) return;
  try {
    const v = String(activeId);
    for (const k of LS_ACTIVE_DARTSET_KEYS) localStorage.setItem(k, v);
  } catch (e) {
    console.warn("[dartsets] write active id failed", e);
  }
}

function extractStoreObjectFromSnapshot(snap: any) {
  if (!isRecord(snap)) return { store: null as any, data: null as any };

  let store = isRecord(snap.store) ? snap.store : null;
  const data = isRecord(snap.data) ? snap.data : null;

  if (!store && isRecord((snap as any).idb)) {
    const idb = (snap as any).idb as Record<string, any>;
    const scoped = scopedStorageKey(STORE_KEY);
    const candidateKeys = [
      scoped,
      STORE_KEY,
      ...Object.keys(idb).filter((k) => k === STORE_KEY || /(^|[:/])store(?::[^:/]+)?$/.test(String(k))),
    ];
    for (const key of candidateKeys) {
      const candidate = idb?.[key];
      if (isRecord(candidate)) {
        store = candidate;
        break;
      }
    }
  }

  return { store, data };
}

/**
 * Extrait dartSets depuis un snapshot cloud (tolère plusieurs formats)
 */
function extractDartSetsFromSnapshot(snap: any) {
  if (!isRecord(snap)) return { dartSets: null as any, activeId: null as any };

  const { store, data } = extractStoreObjectFromSnapshot(snap);

  const dartSets =
    pickFirst(store?.dartSets, store?.dartsets, data?.dartSets, data?.dartsets, snap.dartSets, snap.dartsets) ?? null;

  const activeId =
    pickFirst(
      store?.activeDartSetId,
      store?.active_dartset_id,
      data?.activeDartSetId,
      snap.activeDartSetId,
      snap.active_dartset_id
    ) ?? null;

  return { dartSets, activeId };
}

function extractTeamsFromSnapshot(snap: any) {
  if (!isRecord(snap)) return { teams: null as any };

  const { store, data } = extractStoreObjectFromSnapshot(snap);
  const teams =
    pickFirst(
      store?.teams,
      store?.profileTeams,
      data?.teams,
      data?.profileTeams,
      (snap as any)?.teams,
      (snap as any)?.profileTeams
    ) ?? null;

  return { teams };
}

function extractBotsFromSnapshot(snap: any) {
  if (!isRecord(snap)) return { bots: null as any };

  const { store, data } = extractStoreObjectFromSnapshot(snap);
  const bots =
    pickFirst(
      store?.bots,
      store?.cpuBots,
      store?.botPlayers,
      data?.bots,
      data?.cpuBots,
      data?.botPlayers,
      (snap as any)?.bots,
      (snap as any)?.cpuBots,
      (snap as any)?.botPlayers
    ) ?? null;

  return { bots };
}

/* ============================================================
   ✅ CLOUD SNAPSHOT (Supabase user_store)
============================================================ */

export type CloudSnapshot = any;

// ============================================================
// ✅ Sanitize snapshots before pushing to Supabase
// - Avoid pushing huge base64 blobs (data:...)
// - Avoid leaking sensitive local-only fields
// ============================================================
function sanitizeStoreForCloud(store: any) {
  let clone: any;
  try {
    clone = safeJsonParse(safeJsonStringify(store || {}), {});
  } catch {
    clone = { ...(store || {}) };
  }

  stripStoreHistoryFields(clone);
  stripStoreHeavyStatsFields(clone);

  const sanitizeProfileMedia = (p: any) => {
    const out = { ...(p || {}) };
    cacheProfileAvatar(out);
    delete out.avatarDataUrl;
    delete out.avatarThumbDataUrl;
    delete out.avatarFullDataUrl;
    delete out.avatarCastDataUrl;
    delete out.photoDataUrl;
    delete out.imageDataUrl;
    if (typeof out.avatar === "string" && out.avatar.startsWith("data:")) delete out.avatar;
    if (typeof out.avatarUrl === "string" && out.avatarUrl.startsWith("data:")) delete out.avatarUrl;
    try {
      if (out.privateInfo && typeof out.privateInfo === "object") {
        const pi: any = { ...(out.privateInfo as any) };
        delete pi.password;
        delete pi.passwordHash;
        delete pi.confirmPassword;
        out.privateInfo = pi;
      }
    } catch {}
    return out;
  };

  if (Array.isArray(clone.profiles)) clone.profiles = clone.profiles.map(sanitizeProfileMedia);
  if (Array.isArray(clone.localProfiles)) clone.localProfiles = clone.localProfiles.map(sanitizeProfileMedia);
  if (Array.isArray(clone.players)) clone.players = clone.players.map(sanitizeProfileMedia);
  const sanitizeBotMedia = (b: any) => {
    const bo: any = { ...(b || {}) };
    delete bo.avatarDataUrl;
    delete bo.photoDataUrl;
    delete bo.imageDataUrl;
    if (typeof bo.avatar === "string" && bo.avatar.startsWith("data:")) delete bo.avatar;
    if (typeof bo.avatarUrl === "string" && bo.avatarUrl.startsWith("data:")) delete bo.avatarUrl;
    return bo;
  };
  if (Array.isArray((clone as any).bots)) (clone as any).bots = (clone as any).bots.map(sanitizeBotMedia);
  if (Array.isArray((clone as any).cpuBots)) (clone as any).cpuBots = (clone as any).cpuBots.map(sanitizeBotMedia);
  if (Array.isArray((clone as any).botPlayers)) (clone as any).botPlayers = (clone as any).botPlayers.map(sanitizeBotMedia);

  if (Array.isArray((clone as any).dartSets)) {
    (clone as any).dartSets = (clone as any).dartSets.map((ds: any) => {
      const dso: any = { ...(ds || {}) };
      delete dso.photoDataUrl;
      delete dso.imageDataUrl;
      delete dso.mainImageDataUrl;
      delete dso.dartSetImageDataUrl;
      delete dso.photoThumbDataUrl;
      delete dso.thumbDataUrl;
      delete dso.thumbImageDataUrl;
      if (typeof dso.mainImageUrl === "string" && dso.mainImageUrl.startsWith("data:")) delete dso.mainImageUrl;
      if (typeof dso.photoUrl === "string" && dso.photoUrl.startsWith("data:")) delete dso.photoUrl;
      if (typeof dso.imageUrl === "string" && dso.imageUrl.startsWith("data:")) delete dso.imageUrl;
      if (typeof dso.thumbImageUrl === "string" && dso.thumbImageUrl.startsWith("data:")) delete dso.thumbImageUrl;
      if (typeof dso.photoThumbUrl === "string" && dso.photoThumbUrl.startsWith("data:")) delete dso.photoThumbUrl;
      return dso;
    });
  }

  if (Array.isArray((clone as any).teams)) {
    (clone as any).teams = (clone as any).teams.map((team: any) => {
      const out: any = { ...(team || {}) };
      delete out.logoDataUrl;
      delete out.avatarDataUrl;
      delete out.imageDataUrl;
      delete out.regionLogoDataUrl;
      delete out.coverDataUrl;
      if (typeof out.logoUrl === "string" && out.logoUrl.startsWith("data:")) delete out.logoUrl;
      if (typeof out.avatarUrl === "string" && out.avatarUrl.startsWith("data:")) delete out.avatarUrl;
      if (typeof out.imageUrl === "string" && out.imageUrl.startsWith("data:")) delete out.imageUrl;
      if (typeof out.regionLogoUrl === "string" && out.regionLogoUrl.startsWith("data:")) delete out.regionLogoUrl;
      if (typeof out.coverUrl === "string" && out.coverUrl.startsWith("data:")) delete out.coverUrl;
      return out;
    });
  }

  return clone;
}

export async function exportCloudSnapshot(): Promise<CloudSnapshot> {
  const dump = await exportAll();
  try {
    const clone: any = safeJsonParse(safeJsonStringify(dump || {}), dump || {});

    if (clone?.store && typeof clone.store === "object") {
      clone.store = sanitizeStoreForCloud(clone.store);
    }
    if (clone?.data && typeof clone.data === "object") {
      clone.data = sanitizeStoreForCloud(clone.data);
    }

    if (clone?.idb && typeof clone.idb === "object") {
      for (const [key, value] of Object.entries(clone.idb as Record<string, any>)) {
        const rawKey = String(key || "");
        const isStoreLikeKey = rawKey === STORE_KEY || rawKey === scopedStorageKey(STORE_KEY) || /(^|[:/])store(?::[^:/]+)?$/.test(rawKey);
        if (isStoreLikeKey && value && typeof value === "object") {
          (clone.idb as Record<string, any>)[rawKey] = sanitizeStoreForCloud(value);
        }
      }
    }

    return clone;
  } catch (err) {
    console.warn("[storage] exportCloudSnapshot sanitize failed", err);
    return dump;
  }
}

export async function importCloudSnapshot(dump: CloudSnapshot, opts?: { mode?: "replace" | "merge" }): Promise<void> {
  const mode = opts?.mode ?? "replace";

  if (mode === "replace") {
    await nukeAll();
    clearLocalStorageDc();
  }

  await importAll(dump);

  // ✅ Important: le cloud peut contenir des doublons (ex: plusieurs profils locaux
  // clonés depuis le profil online). On nettoie systématiquement après import
  // pour éviter que l'UI "Profils locaux" explose.
  try {
    await normalizeLocalProfilesInStore();
  } catch (err) {
    console.warn("[storage] normalizeLocalProfilesInStore failed", err);
  }

  // ✅ CRITIQUE : restaurer les DartSets / Bots exactement là où l’UI lit réellement
  const { dartSets, activeId } = extractDartSetsFromSnapshot(dump);
  if (dartSets) {
    writeDartSetsToLocalStorage(dartSets);
    try { replaceAllDartSets(Array.isArray(dartSets) ? dartSets : []); } catch {}
  }
  if (activeId) writeActiveDartSetIdToLocalStorage(activeId);

  const { bots } = extractBotsFromSnapshot(dump);
  if (Array.isArray(bots)) {
    try {
      restoreBotsFromSnapshot(bots as any[]);
    } catch (e) {
      console.warn("[storage] restore bots from snapshot failed", e);
    }
  }

  const { teams } = extractTeamsFromSnapshot(dump);
  if (Array.isArray(teams)) {
    try {
      saveStoredTeams(teams as any[]);
      try { window.dispatchEvent(new Event("dc-teams-updated")); } catch {}
      try { window.dispatchEvent(new Event("dc:teams-changed")); } catch {}
    } catch (e) {
      console.warn("[storage] restore teams from snapshot failed", e);
    }
  }
}

// ------------------------------------------------------------
// Normalisation profils locaux (post-import / pre-push)
// ------------------------------------------------------------

function scoreProfileCompleteness(p: any): number {
  let s = 0;
  const keys = ["name", "country", "avatarUrl", "surname", "firstName", "birthDate", "city", "phone"];
  for (const k of keys) if (p?.[k]) s += 1;
  return s;
}

function isOnlineShadowProfile(p: any): boolean {
  const id = String(p?.id ?? "");
  // Notre convention (si jamais elle traîne dans des snapshots)
  if (id.startsWith("online:")) return true;
  // Et on écarte aussi les profils manifestement injectés depuis Supabase
  // (ils n'ont aucune donnée locale de profil, uniquement email/nickname)
  if (p?.isOnline === true) return true;
  return false;
}

async function normalizeLocalProfilesInStore(): Promise<void> {
  const raw = await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(STORE_KEY));
  if (raw == null) return;

  const txt = await decompressGzip(raw as any);
  const store = safeJsonParse<any | null>(txt, null);
  if (!store) return;

  const arr = Array.isArray(store?.profiles) ? [...store.profiles] : [];

  // 1) retire les "online" du tableau local
  const locals = arr.filter((p) => !isOnlineShadowProfile(p));

  // 2) dédoublonne par id
  const byId = new Map<string, any>();
  for (const p of locals) {
    const id = String(p?.id ?? "");
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, p);
    } else {
      // garde la version la plus "complète"
      const keep = scoreProfileCompleteness(p) >= scoreProfileCompleteness(prev) ? p : prev;
      byId.set(id, keep);
    }
  }

  // 3) Ne pas dédoublonner agressivement par signature : deux profils locaux
  // peuvent avoir le même nom/pays ou perdre temporairement leur avatar pendant
  // la migration média. On garde donc uniquement le dédoublonnage par id.
  const cleaned = Array.from(byId.values());

  // 4) sécurise l'activeProfileId
  const activeId = String(store?.activeProfileId ?? "");
  if (activeId && !cleaned.some((p) => String(p?.id) === activeId)) {
    store.activeProfileId = cleaned[0]?.id ?? null;
  }

  store.profiles = cleaned;

  const outTxt = safeJsonStringify(store);
  const outRaw = await compressGzip(outTxt);
  await idbSet(scopedStorageKey(STORE_KEY), outRaw);
}

export async function nukeAll(): Promise<void> {
  try {
    await idbClear();
  } catch (err) {
    console.error("[storage] nukeAll error:", err);
  }
}

/* ============================================================
   ✅ WIPE TOTAL LOCAL (pour SIGNED_OUT / changement de compte)
   - Clear IndexedDB (store principal)
   - Clear toutes les clés localStorage dc_ / dc-
   - Supprime aussi la clé legacy darts-counter-store-v3
============================================================ */
export async function wipeAllLocalData(): Promise<void> {
  try {
    await nukeAll();
  } catch {}

  try {
    clearLocalStorageDc();
  } catch {}

  try {
    localStorage.removeItem(scopedLegacyStoreKey());
  } catch {}

  // par sécurité, retire aussi l'auth online éventuelle (si présente)
  try {
    localStorage.removeItem("dc_online_auth_supabase_v1");
  } catch {}
}

/* ============================================================
   Compat simple appSnapshot.ts (sync wrappers)
============================================================ */
export function exportAllLocalData(): any {
  try {
    return {
      localStorage: exportLocalStorageDc(),
      legacyStore: safeJsonParse(localStorage.getItem(scopedLegacyStoreKey()), null),
    };
  } catch {
    return { localStorage: {}, legacyStore: null };
  }
}

export function importAllLocalData(data: any): void {
  try {
    if (data?.localStorage) importLocalStorageDc(data.localStorage);
  } catch {}
  try {
    if (data?.legacyStore != null) localStorage.setItem(scopedLegacyStoreKey(), safeJsonStringify(data.legacyStore));
  } catch {}
}

/* ---------- Migration utilitaire ---------- */
export async function migrateFromLocalStorage(keys: string[]) {
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;

    try {
      const parsed = safeJsonParse(raw, null);
      if (parsed !== null) {
        await setKV(k, parsed);
      } else {
        await idbSet(k, raw);
      }
    } catch {
      try {
        await idbSet(k, raw);
      } catch {}
    }

    try {
      localStorage.removeItem(k);
    } catch {}
  }
}

/* ============================================================
   RESET COMPLET : garder uniquement le profil actif (sans stats)
============================================================ */
export async function nukeAllKeepActiveProfile(): Promise<void> {
  let activeProfile: Profile | null = null;

  try {
    const raw = await idbGet<ArrayBuffer | Uint8Array | string>(scopedStorageKey(STORE_KEY));
    if (raw != null) {
      const txt = await decompressGzip(raw as any);
      const parsed = safeJsonParse<Store | null>(txt, null);

      const activeId = (parsed as any)?.activeProfileId ?? null;
      if (activeId) {
        const prof = parsed?.profiles?.find((p) => p.id === activeId) || null;
        activeProfile = prof ? { ...prof } : null;
      }
    }
  } catch (err) {
    console.warn("[storage] unable to load existing store before reset", err);
  }

  try {
    await idbClear();
  } catch (err) {
    console.warn("[storage] idbClear error during reset", err);
  }

  try {
    localStorage.removeItem(scopedLegacyStoreKey());
  } catch {}

  if (activeProfile) {
    const cleanProfile: Profile = { ...activeProfile };

    const newStore: Store = {
      profiles: [cleanProfile],
      activeProfileId: cleanProfile.id,
      selfStatus: "online",
    } as Store;

    try {
      const payload = await compressGzip(safeJsonStringify(newStore));
      await idbSet(storeScopeKey, payload);
    lastSavedStoreJsonByScope.set(storeScopeKey, json);
    } catch (err) {
      console.warn("[storage] unable to write minimal store after reset", err);
    }
  }
}
