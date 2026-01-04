// ============================================================
// src/lib/hydrateFromOnline.ts
// V8 — hydrate store DIRECT depuis user_store.data = {version, store}
// ============================================================

import { onlineApi } from "./onlineApi";
import { saveStore } from "./storage";

const LS_CLOUD_APPLIED_AT = "dc_cloud_applied_at_v2";

function getAppliedAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LS_CLOUD_APPLIED_AT);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function setAppliedAt(ts: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_CLOUD_APPLIED_AT, String(ts));
}

export async function hydrateFromOnline(opts?: { reload?: boolean }) {
  const reload = opts?.reload ?? true;

  const res = await onlineApi.pullStoreSnapshot();
  if (res.status !== "ok") return { status: res.status, applied: false };

  const payload = res.payload; // {version, store}
  const cloudStore = payload?.store ?? null;
  if (!cloudStore) return { status: "ok", applied: false, reason: "empty_cloud" as const };

  const cloudTs = res.updatedAt ? Date.parse(res.updatedAt) : 0;
  const lastApplied = getAppliedAt();
  if (cloudTs && cloudTs <= lastApplied) {
    return { status: "ok", applied: false, reason: "cloud_not_newer" as const };
  }

  // ✅ apply to app (store React live)
  const w: any = window as any;
  if (w?.__appStore?.update) {
    w.__appStore.update(() => cloudStore);
  } else if (w?.__appStore) {
    w.__appStore.store = cloudStore;
  }

  // ✅ persist local (IndexedDB / storage layer)
  try {
    await saveStore(cloudStore);
  } catch {}

  setAppliedAt(cloudTs || Date.now());

  if (reload && typeof window !== "undefined") window.location.reload();
  return { status: "ok", applied: true, updatedAt: res.updatedAt ?? null };
}

export async function pushLocalSnapshotToOnline() {
  if (typeof window === "undefined") return { ok: false, error: "no_window" };

  const w: any = window as any;
  const store = w?.__appStore?.store ?? null;
  if (!store) return { ok: false, error: "no_store" };

  const payload = {
    version: 8,
    store,
  };

  await onlineApi.pushStoreSnapshot(payload, 8);
  return { ok: true };
}
