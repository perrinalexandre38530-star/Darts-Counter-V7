import { exportAll, importAll, loadStore } from "./storage";
import { onlineApi } from "./onlineApi";

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
    window.dispatchEvent(new CustomEvent("dc:nas-sync-dirty", { detail: { reason } }));
  } catch {}
}

export async function pushNasAccountSnapshot() {
  try {
    const flush = (window as any)?.__flushLocalStoreNow;
    if (typeof flush === "function") {
      await flush("nas_push");
    }
  } catch {}
  const snapshot = await exportAll();
  const res = await onlineApi.pushStoreSnapshot(snapshot as any, (snapshot as any)?.v ?? 8);
  try { localStorage.setItem(LAST_PUSH_KEY, new Date().toISOString()); } catch {}
  clearNasSyncDirty();
  return res;
}

export async function pullNasAccountSnapshot() {
  const res: any = await onlineApi.pullStoreSnapshot();
  if (!res || res.status !== "ok" || !res.payload) return res;
  setApplyingNasSnapshot(true);
  try {
    await importAll(res.payload);
    try { localStorage.setItem(LAST_PULL_KEY, new Date().toISOString()); } catch {}
    clearNasSyncDirty();
    return res;
  } finally {
    setApplyingNasSnapshot(false);
  }
}

export async function computeNasSyncSummary() {
  const store: any = await loadStore().catch(() => null);
  return {
    profiles: Array.isArray(store?.profiles) ? store.profiles.length : 0,
    history: Array.isArray(store?.history) ? store.history.length : 0,
    bots: Array.isArray(store?.bots) ? store.bots.length : Array.isArray(store?.cpuBots) ? store.cpuBots.length : 0,
    dartSets: Array.isArray(store?.dartSets) ? store.dartSets.length : 0,
  };
}
