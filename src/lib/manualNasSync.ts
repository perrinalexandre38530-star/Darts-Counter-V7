async function getStorage() {
  return await import("./storage");
}

import * as mediaSync from "./mediaSync";
import { getAllDartSets, replaceAllDartSets } from "./dartSetsStore";

async function getOnlineApi() {
  const mod = await import("./onlineApi");
  return mod.onlineApi;
}

const DIRTY_KEY = "dc_nas_sync_dirty_v1";
const DIRTY_REASON_KEY = "dc_nas_sync_dirty_reason_v1";
const LAST_PUSH_KEY = "dc_nas_sync_last_push_v1";
const LAST_PULL_KEY = "dc_nas_sync_last_pull_v1";
const APPLY_GUARD_KEY = "dc_nas_sync_apply_guard_v1";

function emit() {
  try { window.dispatchEvent(new CustomEvent("dc:nas-sync-state")); } catch {}
}

export function isApplyingNasSnapshot(): boolean {
  try { return sessionStorage.getItem(APPLY_GUARD_KEY) === "1"; } catch { return false; }
}

export function setApplyingNasSnapshot(v: boolean) {
  try {
    if (v) sessionStorage.setItem(APPLY_GUARD_KEY, "1");
    else sessionStorage.removeItem(APPLY_GUARD_KEY);
  } catch {}
}

export function markNasSyncDirty(reason = "change") {
  if (isApplyingNasSnapshot()) return;
  try {
    localStorage.setItem(DIRTY_KEY, "1");
    localStorage.setItem(DIRTY_REASON_KEY, String(reason || "change"));
  } catch {}
  emit();
}

export function clearNasSyncDirty() {
  try {
    localStorage.removeItem(DIRTY_KEY);
    localStorage.removeItem(DIRTY_REASON_KEY);
  } catch {}
  emit();
}

export function getNasSyncState() {
  try {
    return {
      dirty: localStorage.getItem(DIRTY_KEY) === "1",
      reason: localStorage.getItem(DIRTY_REASON_KEY) || "",
      lastPushAt: localStorage.getItem(LAST_PUSH_KEY) || "",
      lastPullAt: localStorage.getItem(LAST_PULL_KEY) || "",
    };
  } catch {
    return { dirty: false, reason: "", lastPushAt: "", lastPullAt: "" };
  }
}

export function pushNasSyncDirtyReason(reason: string) {
  try {
    window.dispatchEvent(new CustomEvent("dc:nas-sync-dirty", { detail: { reason: String(reason || "change") } }));
  } catch {}
}


function dartSetImageQuality(ds: any): number {
  if (!ds || typeof ds !== "object") return 0;
  let score = 0;
  const fields = [
    ds.mainImageAssetId, ds.photoAssetId, ds.imageAssetId, ds.dartSetImageAssetId,
    ds.thumbImageAssetId, ds.photoThumbAssetId,
    ds.mainImageUrl, ds.thumbImageUrl, ds.photoUrl, ds.imageUrl, ds.photoThumbUrl,
    ds.photoDataUrl, ds.imageDataUrl, ds.mainImageDataUrl, ds.dartSetImageDataUrl, ds.photoThumbDataUrl, ds.thumbDataUrl, ds.thumbImageDataUrl,
  ];
  for (const v of fields) {
    if (typeof v !== "string" || !v.trim()) continue;
    const raw = v.trim();
    if (raw.startsWith("data:image/")) score += 1000 + Math.min(1000, Math.floor(raw.length / 1000));
    else if (/\/media\//.test(raw) || /^https?:\/\//i.test(raw)) score += 700;
    else score += 100;
  }
  if (ds.kind === "photo") score += 50;
  return score;
}

function mergeRuntimeDartSetsIntoStore(store: any): any {
  try {
    const local = getAllDartSets();
    if (!Array.isArray(local) || !local.length) return store;
    const base = Array.isArray(store?.dartSets) ? store.dartSets : [];
    const byId = new Map<string, any>();
    for (const ds of base) {
      const id = String(ds?.id || "").trim();
      if (id) byId.set(id, ds);
    }
    for (const ds of local) {
      const id = String((ds as any)?.id || "").trim();
      if (!id) continue;
      const prev = byId.get(id);
      if (!prev || dartSetImageQuality(ds) >= dartSetImageQuality(prev)) byId.set(id, ds);
    }
    const merged = Array.from(byId.values());
    if (!merged.length) return store;
    return { ...(store || {}), dartSets: merged };
  } catch {
    return store;
  }
}

async function persistDartSetsMirrorFromStore(store: any) {
  try {
    if (Array.isArray(store?.dartSets)) replaceAllDartSets(store.dartSets as any);
  } catch {}
}

function countArray(value: any): number {
  return Array.isArray(value) ? value.length : 0;
}

function byteLengthOfJson(value: any): number {
  try {
    const text = JSON.stringify(value ?? null);
    return new Blob([text]).size;
  } catch {
    try { return JSON.stringify(value ?? null).length; } catch { return 0; }
  }
}

function countDataImageFields(value: any): number {
  let count = 0;
  const seen = new WeakSet<object>();
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node === "string") {
      if (node.startsWith("data:image/")) count += 1;
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(value);
  return count;
}

function countMediaUrls(value: any): number {
  let count = 0;
  const seen = new WeakSet<object>();
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node === "string") {
      if (/\/media\//.test(node) || /api\.multisports-api\.fr\/media\//.test(node)) count += 1;
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(value);
  return count;
}

function summarizeStore(store: any) {
  return {
    profiles: countArray(store?.profiles),
    localProfiles: countArray(store?.localProfiles),
    players: countArray(store?.players),
    totalProfiles: countArray(store?.profiles) || countArray(store?.localProfiles) || countArray(store?.players),
    history: countArray(store?.history),
    bots: countArray(store?.bots) || countArray(store?.cpuBots) || countArray(store?.botPlayers),
    dartSets: countArray(store?.dartSets),
    dataImageFields: countDataImageFields(store),
    mediaUrls: countMediaUrls(store),
    storeBytes: byteLengthOfJson(store),
  };
}


function profileCountOfStore(store: any): number {
  if (!store || typeof store !== "object") return 0;
  const profiles = countArray(store?.profiles);
  const localProfiles = countArray(store?.localProfiles);
  const players = countArray(store?.players);
  return Math.max(profiles, localProfiles, players);
}

function clonePlain<T = any>(value: T): T {
  try { return JSON.parse(JSON.stringify(value ?? null)); } catch { return value; }
}

function getRuntimeStoreSnapshot(): any | null {
  try {
    const w: any = typeof window !== "undefined" ? window : null;
    if (!w) return null;
    if (typeof w.__getRuntimeStoreSnapshot === "function") {
      const snap = w.__getRuntimeStoreSnapshot();
      if (snap && typeof snap === "object") return clonePlain(snap);
    }
    const live = w.__appStore?.store;
    if (live && typeof live === "object") return clonePlain(live);
  } catch {}
  return null;
}

function pickStoreWithMostProfiles(a: any, b: any): any {
  const ca = profileCountOfStore(a);
  const cb = profileCountOfStore(b);
  if (cb > ca) return b;
  return a || b;
}

async function waitForRuntimeFlushToSettle(maxMs = 4500) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const w: any = typeof window !== "undefined" ? window : null;
      if (!w?.__isStorePersistInFlight?.()) break;
    } catch { break; }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

function isStoreLikeSnapshotKey(key: string): boolean {
  const k = String(key || "");
  return k === "store" || k.startsWith("store:") || /(^|[:/])store(?::[^:/]+)?$/.test(k);
}

function findSnapshotStoreKeys(payload: any): string[] {
  const idb = payload?.idb && typeof payload.idb === "object" ? payload.idb : null;
  if (!idb) return [];
  return Object.keys(idb).filter(isStoreLikeSnapshotKey);
}

function countProfilesInSnapshot(payload: any): number {
  try {
    const idb = payload?.idb && typeof payload.idb === "object" ? payload.idb : null;
    if (idb) {
      let max = 0;
      for (const key of Object.keys(idb)) {
        if (!isStoreLikeSnapshotKey(key)) continue;
        max = Math.max(max, profileCountOfStore(idb[key]));
      }
      if (max > 0) return max;
    }
    return profileCountOfStore(payload?.store || payload?.data || payload);
  } catch { return 0; }
}

function stripDataImagesAndSecrets(value: any): any {
  const seen = new WeakSet<object>();
  const walk = (node: any): any => {
    if (node == null) return node;
    if (typeof node === "string") return node.startsWith("data:image/") ? undefined : node;
    if (typeof node !== "object") return node;
    if (seen.has(node)) return undefined;
    seen.add(node);
    if (Array.isArray(node)) return node.map(walk).filter((v) => v !== undefined);
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      if (["avatarDataUrl", "avatarThumbDataUrl", "avatarFullDataUrl", "avatarCastDataUrl", "photoDataUrl", "imageDataUrl", "mainImageDataUrl", "dartSetImageDataUrl", "password", "passwordHash", "confirmPassword"].includes(k)) continue;
      const next = walk(v);
      if (next !== undefined) out[k] = next;
    }
    return out;
  };
  return walk(value);
}

function forceSnapshotStore(payload: any, store: any): any {
  if (!payload || typeof payload !== "object" || !store || typeof store !== "object") return payload;
  const next = clonePlain(payload);
  const cleanStore = stripDataImagesAndSecrets(store);
  if (!next.idb || typeof next.idb !== "object") next.idb = {};
  const keys = findSnapshotStoreKeys(next);
  if (!keys.length) keys.push("store");
  for (const key of keys) next.idb[key] = cleanStore;
  return next;
}

async function flushRuntimeStoreBeforeNasPush() {
  try {
    const w: any = typeof window !== "undefined" ? window : null;
    if (w && typeof w.__flushLocalStoreNow === "function") {
      await w.__flushLocalStoreNow("before-nas-push");
    }
  } catch (e) {
    console.warn("[nasSync] runtime store flush failed before push", e);
  }
}

export async function pushNasAccountSnapshot() {
  const { loadStore, saveStore, exportCloudSnapshot } = await getStorage();
  
  const { uploadStoreMediaAssets, hydrateStoreMediaUrls } = mediaSync;
  const api = await getOnlineApi();

  // ✅ FINAL NAS FIX:
  // évite le cas: profil local créé en React → pas encore écrit en IDB → push NAS
  // envoie l'ancien snapshot sans ce profil.
  const startedAt = Date.now();
  await flushRuntimeStoreBeforeNasPush();
  await waitForRuntimeFlushToSettle();

  const persistedStore: any = await loadStore().catch(() => null);
  const runtimeStore: any = getRuntimeStoreSnapshot();
  let currentStore: any = pickStoreWithMostProfiles(persistedStore, runtimeStore);
  currentStore = mergeRuntimeDartSetsIntoStore(currentStore);

  // ✅ DartSets NAS MEDIA FIX:
  // La page Profils lit les dartsets depuis localStorage, alors que le push NAS
  // part du store IDB/runtime. On recopie ici la version la plus riche
  // (avec photo data:image ou assetId) dans le store avant upload média.
  if (currentStore) {
    await saveStore(currentStore as any).catch(() => {});
  }

  // ✅ COUNT FIX NAS V1:
  // Si le runtime React contient plus de profils que l'IDB, on force l'IDB avant
  // l'export NAS. C'est exactement le cas qui pouvait donner : téléphone = 38, PC = 35.
  if (currentStore && profileCountOfStore(currentStore) > profileCountOfStore(persistedStore)) {
    await saveStore(currentStore as any);
    try { window.dispatchEvent(new Event("dc-store-updated")); } catch {}
  }

  const beforeSummary = summarizeStore(currentStore);

  // Vérification explicite du backend média avant de promettre une synchro complète.
  // Si le NAS n'a pas le bon server.js déployé, on stoppe ici avec un message clair.
  try {
    if (typeof api.mediaHealth === "function") {
      await api.mediaHealth();
    }
  } catch (e: any) {
    throw new Error("Backend média NAS indisponible (/media/health). Remplace server.js sur le NAS puis redémarre l'API.");
  }

  // ✅ IMPORTANT:
  // On NE masque plus les erreurs d'upload média. Si /media/upload renvoie 404,
  // le push doit échouer clairement au lieu d'afficher une "synchronisation réussie"
  // avec des avatars manquants.
  const uploadedStore = currentStore ? await uploadStoreMediaAssets(currentStore) : currentStore;
  const hydratedStore = uploadedStore ? await hydrateStoreMediaUrls(uploadedStore).catch(() => uploadedStore) : uploadedStore;

  if (hydratedStore && hydratedStore !== currentStore) {
    const w: any = typeof window !== "undefined" ? window : null;
    if (w && typeof w.__replaceLocalStoreNow === "function") {
      await w.__replaceLocalStoreNow(hydratedStore, "nas-media-uploaded-before-push");
      // Sécurité critique : on force aussi l'écriture IDB. Sinon exportCloudSnapshot()
      // peut relire l'ancien store sans assetId/avatarUrl selon le timing React.
      await saveStore(hydratedStore as any);
      await persistDartSetsMirrorFromStore(hydratedStore);
      try { window.dispatchEvent(new Event("dc-store-updated")); } catch {}
    } else {
      await saveStore(hydratedStore as any);
      await persistDartSetsMirrorFromStore(hydratedStore);
      try { window.dispatchEvent(new Event("dc-store-updated")); } catch {}
    }
  }

  // Ne PAS refaire un flush React ici : le store runtime peut encore contenir
  // l ancienne version avec base64. Un second flush écraserait les assetId/URLs
  // que l on vient d écrire après upload média.
  let payload = await exportCloudSnapshot();
  const snapshotProfiles = countProfilesInSnapshot(payload);
  const hydratedProfiles = profileCountOfStore(hydratedStore || currentStore);
  if (hydratedProfiles > snapshotProfiles) {
    payload = forceSnapshotStore(payload, hydratedStore || currentStore);
    try {
      console.warn("[nasSync] payload store count repaired before push", { snapshotProfiles, hydratedProfiles });
    } catch {}
  }
  const payloadBytes = byteLengthOfJson(payload);
  const mediaSummary = typeof mediaSync.getLastMediaSyncSummary === "function" ? mediaSync.getLastMediaSyncSummary() : null;
  const afterStore: any = await loadStore().catch(() => hydratedStore || currentStore);
  const afterSummary = summarizeStore(afterStore);
  const res = await api.pushStoreSnapshot(payload as any, (payload as any)?._v ?? (payload as any)?.v ?? 2);
  try { localStorage.setItem(LAST_PUSH_KEY, new Date().toISOString()); } catch {}
  clearNasSyncDirty();
  const durationMs = Date.now() - startedAt;
  return {
    ...(res || {}),
    summary: {
      ...afterSummary,
      before: beforeSummary,
      after: afterSummary,
      media: mediaSummary,
      payloadBytes,
      payloadProfiles: countProfilesInSnapshot(payload),
      runtimeProfiles: profileCountOfStore(runtimeStore),
      persistedProfiles: profileCountOfStore(persistedStore),
      durationMs,
      snapshotLightened: afterSummary.dataImageFields === 0,
      base64FieldsBefore: beforeSummary.dataImageFields,
      base64FieldsAfter: afterSummary.dataImageFields,
      base64FieldsRemoved: Math.max(0, beforeSummary.dataImageFields - afterSummary.dataImageFields),
    },
  };
}

export async function pullNasAccountSnapshot() {
  const api = await getOnlineApi();
  const res: any = await api.pullStoreSnapshot();
  if (!res || res.status !== "ok" || !res.payload) return res;
  const { importCloudSnapshot, loadStore, saveStore } = await getStorage();
  setApplyingNasSnapshot(true);
  try {
    await importCloudSnapshot(res.payload, { mode: "replace" });
    try {
      const restored: any = await loadStore().catch(() => null);
      const hydrated = restored ? await hydrateStoreMediaUrls(restored).catch(() => restored) : null;
      const nextStore = hydrated || restored;

      // ✅ RESTORE LIVE FIX:
      // importCloudSnapshot() remplace bien IndexedDB, mais la page Profils lit le
      // store React déjà monté. Sans remplacement runtime, l'alerte peut annoncer
      // 38 profils NAS restaurés alors que l'écran Profils affiche encore les 33
      // profils de l'ancien état mémoire.
      if (nextStore) {
        const w: any = typeof window !== "undefined" ? window : null;
        if (w && typeof w.__replaceLocalStoreNow === "function") {
          await w.__replaceLocalStoreNow(nextStore, "nas-pull-apply-runtime");
        } else {
          await saveStore(nextStore as any);
          await persistDartSetsMirrorFromStore(nextStore);
          try { window.dispatchEvent(new Event("dc-store-updated")); } catch {}
        }
      }
    } catch (e) {
      console.warn("[nasSync] restore live apply failed", e);
    }
    try { localStorage.setItem(LAST_PULL_KEY, new Date().toISOString()); } catch {}
    clearNasSyncDirty();
    return res;
  } finally {
    setApplyingNasSnapshot(false);
  }
}



// ============================================================
// HISTORIQUE NAS — suppression persistante côté snapshot NAS
// ------------------------------------------------------------
// Pourquoi: l'historique est restauré depuis /sync/pull après reconnexion.
// Si on supprime uniquement en local, le snapshot NAS réinjecte les anciennes
// parties au prochain chargement. Ces helpers nettoient explicitement le
// payload NAS (dump.history + éventuels champs legacy store.history/localStorage).
// ============================================================
function getHistoryCandidateIds(row: any): string[] {
  const out: string[] = [];
  const push = (v: any) => {
    const s = String(v ?? "").trim();
    if (s && !out.includes(s)) out.push(s);
  };
  try {
    push(row?.id);
    push(row?.matchId);
    push(row?.resumeId);
    push(row?.payload?.id);
    push(row?.payload?.matchId);
    push(row?.payload?.resumeId);
    push(row?.summary?.id);
    push(row?.summary?.matchId);
    push(row?.summary?.resumeId);
    push(row?.game?.id);
    push(row?.game?.matchId);
  } catch {}
  return out;
}

function historyRowMatchesDelete(row: any, ids: Set<string> | null): boolean {
  if (!ids || ids.size === 0) return true; // null/empty = vider tout l'historique
  return getHistoryCandidateIds(row).some((id) => ids.has(id));
}

function cleanHistoryArray(value: any, ids: Set<string> | null): any {
  if (!Array.isArray(value)) return value;
  return value.filter((row) => !historyRowMatchesDelete(row, ids));
}

function cleanHistoryRowsObject(value: any, ids: Set<string> | null): any {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const next: Record<string, any> = {};
  for (const [key, row] of Object.entries(value)) {
    const keyHit = ids && ids.size > 0 ? ids.has(String(key)) : true;
    if (keyHit || historyRowMatchesDelete(row, ids)) continue;
    next[key] = row;
  }
  return next;
}

function cleanStoreLikeHistory(store: any, ids: Set<string> | null): any {
  if (!store || typeof store !== "object" || Array.isArray(store)) return store;
  const next: any = { ...store };
  for (const key of ["history", "matches", "savedMatches", "matchHistory", "finishedMatches", "inProgressMatches"]) {
    if (Array.isArray(next[key])) next[key] = cleanHistoryArray(next[key], ids);
  }
  return next;
}

function cleanSnapshotLocalStorageHistory(localStorageDump: any, ids: Set<string> | null): any {
  if (!localStorageDump || typeof localStorageDump !== "object" || Array.isArray(localStorageDump)) return localStorageDump;
  const next: any = { ...localStorageDump };
  for (const key of Object.keys(next)) {
    const k = String(key).toLowerCase();
    if (!k.includes("history")) continue;
    if (!ids || ids.size === 0) {
      delete next[key];
      continue;
    }
    try {
      const parsed = typeof next[key] === "string" ? JSON.parse(next[key]) : next[key];
      if (Array.isArray(parsed)) next[key] = JSON.stringify(cleanHistoryArray(parsed, ids));
      else if (parsed && typeof parsed === "object") next[key] = JSON.stringify(cleanHistoryRowsObject(parsed, ids));
    } catch {
      // Si on ne sait pas parser une vieille clé history et qu'on supprime tout, on la retire.
      if (!ids || ids.size === 0) delete next[key];
    }
  }
  return next;
}

export function removeHistoryFromNasPayload(payload: any, idsToRemove?: string[]): any {
  const ids = Array.isArray(idsToRemove) && idsToRemove.length
    ? new Set(idsToRemove.map((x) => String(x || "").trim()).filter(Boolean))
    : null;
  const next: any = clonePlain(payload || {});

  // Format moderne exportCloudSnapshot(): { _v:2, history:{ _v:1, rows:{...} } }
  if (next.history && typeof next.history === "object") {
    const h: any = { ...next.history };
    if (h.rows && typeof h.rows === "object") h.rows = cleanHistoryRowsObject(h.rows, ids);
    if (Array.isArray(h.items)) h.items = cleanHistoryArray(h.items, ids);
    if (Array.isArray(h.list)) h.list = cleanHistoryArray(h.list, ids);
    next.history = h;
  }

  // Formats legacy éventuels.
  if (Array.isArray(next.history)) next.history = cleanHistoryArray(next.history, ids);
  if (Array.isArray(next.matches)) next.matches = cleanHistoryArray(next.matches, ids);
  if (next.store) next.store = cleanStoreLikeHistory(next.store, ids);
  if (next.data) next.data = cleanStoreLikeHistory(next.data, ids);

  // Snapshots IDB: certains stores peuvent contenir un champ history en plus du dump history.
  if (next.idb && typeof next.idb === "object" && !Array.isArray(next.idb)) {
    const idb: any = { ...next.idb };
    for (const [key, value] of Object.entries(idb)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        idb[key] = cleanStoreLikeHistory(value, ids);
      }
    }
    next.idb = idb;
  }

  if (next.localStorage && typeof next.localStorage === "object") {
    next.localStorage = cleanSnapshotLocalStorageHistory(next.localStorage, ids);
  }

  return next;
}

export async function pushNasHistoryDeletion(idsToRemove?: string[]) {
  const api = await getOnlineApi();
  const pulled: any = await api.pullStoreSnapshot();
  if (!pulled || pulled.status !== "ok" || !pulled.payload) {
    return { ok: false, status: pulled?.status || "not_found", reason: "Aucun snapshot NAS à nettoyer" };
  }

  const cleaned = removeHistoryFromNasPayload(pulled.payload, idsToRemove);
  const version = Number((cleaned as any)?._v ?? (cleaned as any)?.v ?? pulled.version ?? 8);
  const res = await api.pushStoreSnapshot(cleaned, version);
  try { localStorage.setItem(LAST_PUSH_KEY, new Date().toISOString()); } catch {}
  clearNasSyncDirty();
  return { ok: true, clearedAll: !idsToRemove || idsToRemove.length === 0, removedIds: idsToRemove || [], result: res };
}

export async function computeNasSyncSummary(extra?: any) {
  const { loadStore } = await getStorage();
  const store: any = await loadStore().catch(() => null);
  const summary = summarizeStore(store);
  return {
    ...summary,
    profiles: summary.totalProfiles,
    ...(extra?.summary || {}),
  };
}
