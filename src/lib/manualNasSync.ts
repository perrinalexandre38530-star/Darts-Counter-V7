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
  const { uploadStoreMediaAssets, hydrateStoreMediaUrls } = await getMediaSync();
  const api = await getOnlineApi();

  // ✅ FINAL NAS FIX:
  // évite le cas: profil local créé en React → pas encore écrit en IDB → push NAS
  // envoie l'ancien snapshot sans ce profil.
  await flushRuntimeStoreBeforeNasPush();

  const currentStore: any = await loadStore().catch(() => null);

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
    await saveStore(hydratedStore as any);
    try { window.dispatchEvent(new Event("dc-store-updated")); } catch {}
  }

  // Recharger après saveStore pour éviter de pousser un snapshot ancien.
  await flushRuntimeStoreBeforeNasPush();
  const payload = await exportCloudSnapshot();
  const res = await api.pushStoreSnapshot(payload as any, (payload as any)?._v ?? (payload as any)?.v ?? 2);
  try { localStorage.setItem(LAST_PUSH_KEY, new Date().toISOString()); } catch {}
  clearNasSyncDirty();
  return res;
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
        await saveStore(hydrated as any);
      }
    } catch {}
    try { localStorage.setItem(LAST_PULL_KEY, new Date().toISOString()); } catch {}
    clearNasSyncDirty();
    return res;
  } finally {
    setApplyingNasSnapshot(false);
  }
}

export async function computeNasSyncSummary() {
  const { loadStore } = await getStorage();
  const store: any = await loadStore().catch(() => null);
  return {
    profiles: Array.isArray(store?.profiles) ? store.profiles.length : 0,
    history: Array.isArray(store?.history) ? store.history.length : 0,
    bots: Array.isArray(store?.bots) ? store.bots.length : Array.isArray(store?.cpuBots) ? store.cpuBots.length : 0,
    dartSets: Array.isArray(store?.dartSets) ? store.dartSets.length : 0,
  };
}
