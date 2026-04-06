import type { Store } from "./types";
import { importCloudSnapshot, loadStore } from "./storage";
import { getAllDartSets } from "./dartSetsStore";

function extractStoreFromPayload(payload: any): any | null {
  if (!payload || typeof payload !== "object") return null;

  if ((payload as any)._v === 1 || (payload as any)._v === 2) {
    const idb = (payload as any).idb;
    if (idb && typeof idb === "object") {
      const storeKey = Object.keys(idb).find((k) => k === "store" || /(^|[:/])store$/.test(String(k)));
      if (storeKey) {
        const store = (idb as any)[storeKey];
        if (store && typeof store === "object") return store;
      }
    }

    const directStore = (payload as any).store ?? (payload as any).data ?? null;
    if (directStore && typeof directStore === "object") return directStore;
    return null;
  }

  const cloudStore = (payload as any).store ?? (payload as any)?.idb?.store ?? (payload as any).data ?? payload;
  return cloudStore && typeof cloudStore === "object" ? cloudStore : null;
}

export function hasMeaningfulRemoteSnapshotPayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;

  const store = extractStoreFromPayload(payload);
  if (store && typeof store === "object") {
    const hasProfiles = Array.isArray((store as any).profiles) && (store as any).profiles.length > 0;
    const hasHistory = Array.isArray((store as any).history) && (store as any).history.length > 0;
    const hasFriends = Array.isArray((store as any).friends) && (store as any).friends.length > 0;
    const hasDartSets = Array.isArray((store as any).dartSets) && (store as any).dartSets.length > 0;
    const hasActive = !!(store as any).activeProfileId;
    if (hasProfiles || hasHistory || hasFriends || hasDartSets || hasActive) return true;
  }

  const lsDump = (payload as any).localStorage;
  if (lsDump && typeof lsDump === "object" && Object.keys(lsDump).length > 0) return true;

  const idbDump = (payload as any).idb;
  if (idbDump && typeof idbDump === "object" && Object.keys(idbDump).length > 0) return true;

  return false;
}

export async function restoreRemoteSnapshotIntoLocalApp(payload: any): Promise<boolean> {
  if (!hasMeaningfulRemoteSnapshotPayload(payload)) return false;

  const appStore: any = (window as any).__appStore;
  if (!appStore) return false;

  await importCloudSnapshot(payload, { mode: "replace" });

  const restored = await loadStore<Store>();
  const next: Store = restored
    ? ({
        ...restored,
        profiles: restored.profiles ?? [],
        friends: restored.friends ?? [],
        history: restored.history ?? [],
        dartSets: (restored as any).dartSets ?? getAllDartSets(),
      } as Store)
    : ({
        profiles: [],
        friends: [],
        history: [],
        dartSets: getAllDartSets(),
      } as Store);

  if (typeof appStore.update === "function") {
    appStore.update(() => next);
  } else if (typeof appStore.setState === "function") {
    appStore.setState(next);
  } else {
    return false;
  }

  try {
    if ((next.profiles?.length || 0) > 0 || next.activeProfileId) {
      localStorage.setItem("dc_cloud_restore_done", "1");
    }
  } catch {}

  try {
    window.dispatchEvent(new Event("dc-dartsets-updated"));
  } catch {}

  return true;
}
