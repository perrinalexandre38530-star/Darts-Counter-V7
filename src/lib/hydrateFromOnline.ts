// ============================================================
// src/lib/hydrateFromOnline.ts
// V8 — hydrate store DIRECT depuis user_store.data = {version, store}
// ============================================================

import { onlineApi } from "./onlineApi";
import { exportCloudSnapshot, importCloudSnapshot, saveStore } from "./storage";

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

  // ✅ payload est normalement un export complet (exportCloudSnapshot / exportAll)
  // { v, exportedAt, store, kv, idb }
  const payload: any = res.payload;

  // Back-compat : certains anciens payloads ne contenaient que {version, store}
  const cloudStore = payload?.store ?? null;
  if (!cloudStore) return { status: "ok", applied: false, reason: "empty_cloud" as const };

  const cloudTs = res.updatedAt ? Date.parse(res.updatedAt) : 0;
  const lastApplied = getAppliedAt();
  if (cloudTs && cloudTs <= lastApplied) {
    return { status: "ok", applied: false, reason: "cloud_not_newer" as const };
  }

  // ✅ hydrate COMPLET : on réimporte la snapshot cloud (store + localStorage + idb)
  // Ça évite le problème “après Clear Site Data tout est vide”.
  try {
    if (payload?.kv || payload?.idb || payload?.v) {
      await importCloudSnapshot(payload, { replace: true });
    } else {
      // fallback ultra minimal (ancienne forme)
      const minimal = { v: 1, exportedAt: Date.now(), store: cloudStore, kv: {}, idb: {} };
      await importCloudSnapshot(minimal, { replace: true });
    }
  } catch (e) {
    // fallback : au moins sauver le store
    try {
      await saveStore(cloudStore);
    } catch {}
  }

  // ✅ apply to app (store React live)
  const w: any = window as any;
  if (w?.__appStore?.update) w.__appStore.update(() => cloudStore);
  else if (w?.__appStore) w.__appStore.store = cloudStore;

  setAppliedAt(cloudTs || Date.now());

  if (reload && typeof window !== "undefined") window.location.reload();
  return { status: "ok", applied: true, updatedAt: res.updatedAt ?? null };
}

export async function pushLocalSnapshotToOnline() {
  if (typeof window === "undefined") return { ok: false, error: "no_window" };

  const w: any = window as any;
  const store = w?.__appStore?.store ?? null;
  if (!store) return { ok: false, error: "no_store" };

  // ✅ push COMPLET : exportAll (store + localStorage + idb)
  const snapshot = await exportCloudSnapshot();
  await onlineApi.pushStoreSnapshot(snapshot as any, (snapshot as any)?.v ?? 8);
  return { ok: true };
}
