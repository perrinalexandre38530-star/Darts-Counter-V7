async function getStorage() {
  return await import("./storage");
}

async function getMediaSync() {
  return await import("./mediaSync");
}

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
  const mediaSync = await getMediaSync();
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
      try { window.dispatchEvent(new Event("dc-store-updated")); } catch {}
    } else {
      await saveStore(hydratedStore as any);
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
  const { hydrateStoreMediaUrls } = await getMediaSync();
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
