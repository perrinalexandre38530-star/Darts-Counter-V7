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

  const currentStore: any = await loadStore().catch(() => null);
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
  const payload = await exportCloudSnapshot();
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
      if (hydrated && hydrated !== restored) {
        const w: any = typeof window !== "undefined" ? window : null;
        if (w && typeof w.__replaceLocalStoreNow === "function") {
          await w.__replaceLocalStoreNow(hydrated, "nas-pull-hydrated-media");
        } else {
          await saveStore(hydrated as any);
        }
      }
    } catch {}
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
