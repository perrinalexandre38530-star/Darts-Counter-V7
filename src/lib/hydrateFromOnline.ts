// ============================================================
// src/lib/hydrateFromOnline.ts
// Hydrate local store from Supabase user_store snapshot
// ============================================================

import { onlineApi } from "./onlineApi";
import { importCloudSnapshot, exportCloudSnapshot } from "./storage";

const LS_CLOUD_APPLIED_AT = "dc_cloud_applied_at_v1";

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

  // 1) pull cloud
  const res = await onlineApi.pullStoreSnapshot();
  if (res.status !== "ok") {
    return { status: res.status, applied: false, reason: "no_cloud" as const };
  }
  if (!res.payload) {
    return { status: "ok", applied: false, reason: "empty_cloud" as const };
  }

  // 2) decide apply
  const cloudTs = res.updatedAt ? Date.parse(res.updatedAt) : 0;
  const lastApplied = getAppliedAt();

  // Heuristique:
  // - si cloud plus récent que dernière application -> on applique
  // - sinon on n’écrase pas
  const shouldApply = cloudTs > lastApplied;

  if (!shouldApply) {
    return { status: "ok", applied: false, reason: "cloud_not_newer" as const };
  }

  // 3) apply cloud -> local
  await importCloudSnapshot(res.payload);
  setAppliedAt(cloudTs || Date.now());

  // 4) reload pour recharger les stores en mémoire
  if (reload && typeof window !== "undefined") {
    window.location.reload();
  }

  return { status: "ok", applied: true, updatedAt: res.updatedAt ?? null };
}

export async function pushLocalSnapshotToOnline() {
  const payload = await exportCloudSnapshot();
  await onlineApi.pushStoreSnapshot(payload, 1);
  return { ok: true };
}
