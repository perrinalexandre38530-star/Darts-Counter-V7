// ============================================
// src/lib/cloudSync.ts (V8 simple)
// - source unique: window.__appStore.store
// - push debounced sur emitCloudChange
// - pull périodique (optionnel)
// ============================================

import { onCloudChange } from "./cloudEvents";
import { onlineApi } from "./onlineApi";
import { exportCloudSnapshot, saveStore, importAll, getKV, setKV } from "./storage";

const DEBOUNCE_MS = 1200;
const PULL_INTERVAL_MS = 60_000;

let running = false;
let unsub: null | (() => void) = null;

let pushTimer: number | null = null;
let pullTimer: number | null = null;

// ------------------------------------------------------------
// Merge helpers (anti-perte)
// - heuristique volontairement conservative
// - but: éviter d'écraser un store local non vide par un pull cloud
// ------------------------------------------------------------

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function storeLooksEmpty(s: any): boolean {
  if (!s || typeof s !== "object") return true;
  // heuristique: si pas de profiles, pas de history, pas de dartSets
  const profilesCount = s?.profiles ? Object.keys(s.profiles).length : 0;
  const historyCount = s?.history ? (Array.isArray(s.history) ? s.history.length : Object.keys(s.history || {}).length) : 0;
  const dartSetsCount = s?.dartSets ? (Array.isArray(s.dartSets) ? s.dartSets.length : Object.keys(s.dartSets || {}).length) : 0;
  return profilesCount === 0 && historyCount === 0 && dartSetsCount === 0;
}

function mergeArrays(a: any[], b: any[]): any[] {
  // union simple, avec optimisation quand les items ont un id/uid
  const hasId = (x: any) => x && typeof x === "object" && ("id" in x || "uid" in x);
  if (a.every(hasId) && b.every(hasId)) {
    const map = new Map<string, any>();
    for (const it of a) map.set(String((it as any).id ?? (it as any).uid), it);
    for (const it of b) {
      const k = String((it as any).id ?? (it as any).uid);
      map.set(k, { ...(map.get(k) || {}), ...it });
    }
    return Array.from(map.values());
  }
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of [...a, ...b]) {
    const k = typeof it === "string" ? `s:${it}` : typeof it === "number" ? `n:${it}` : JSON.stringify(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function deepMergeConservative(local: any, cloud: any): any {
  if (cloud == null) return local;
  if (local == null) return cloud;

  if (Array.isArray(local) && Array.isArray(cloud)) return mergeArrays(local, cloud);

  if (isPlainObject(local) && isPlainObject(cloud)) {
    const out: Record<string, any> = { ...cloud, ...local };
    // priorité au LOCAL (pour éviter de perdre ce que l'utilisateur vient de faire)
    for (const k of Object.keys(cloud)) {
      if (!(k in local)) out[k] = cloud[k];
      else out[k] = deepMergeConservative(local[k], cloud[k]);
    }
    return out;
  }

  // types différents => garder local
  return local;
}

function getStore(): any | null {
  if (typeof window === "undefined") return null;
  const w: any = window as any;
  return w?.__appStore?.store ?? null;
}

function applyStore(next: any) {
  if (typeof window === "undefined") return;
  const w: any = window as any;
  if (w?.__appStore?.update) w.__appStore.update(() => next);
  else if (w?.__appStore) w.__appStore.store = next;
}

async function pushNow() {
  // ✅ push COMPLET : store + localStorage(dc_*) + indexedDB (kv/history/etc.)
  try {
    const snapshot: any = await exportCloudSnapshot();
    const v = (snapshot as any)?.v ?? 8;
    await onlineApi.pushStoreSnapshot(snapshot as any, v);
  } catch (e) {
    // fallback minimal
    const store = getStore();
    if (!store) return;
    const payload = { version: 8, store };
    await onlineApi.pushStoreSnapshot(payload as any, 8);
  }
}

async function pullNow() {
  try {
    const res: any = await onlineApi.pullStoreSnapshot();
    if (!res || res.status !== "ok") return;

    const updatedAt: string | null = (res as any)?.updatedAt ?? null;
    const payload: any = (res as any)?.payload ?? null;
    if (!payload) return;

    // ✅ Anti-rollback: ignore pull if cloud is not newer than what we already applied.
    const lastPulledAt: string | null = (await getKV("__cloud:last_pulled_at__").catch(() => null)) as any;
    if (updatedAt && lastPulledAt) {
      try {
        if (new Date(updatedAt).getTime() <= new Date(lastPulledAt).getTime()) {
          return;
        }
      } catch {}
    }

    // ✅ Support snapshot formats:
    // - Full snapshot: { _v:2, idb:{store:...}, localStorage:{...}, history:{...} }
    // - Store-only legacy: { store: {...} } or direct store object
    let cloudStore: any =
      payload?.store ??
      payload?.idb?.store ??
      payload?.idb?.["store"] ??
      null;

    // If it's a full snapshot, import it (writes IDB + dc_* localStorage + history)
    if (payload && typeof payload === "object" && (payload as any)._v === 2) {
      try {
        await importAll(payload);
      } catch {}

      // Re-read store from IDB after import
      try {
        cloudStore = await getKV("store");
      } catch {}
    }

    // Last chance: if payload itself looks like a Store
    if (!cloudStore && payload && typeof payload === "object" && !payload._v && (payload.profiles || payload.history || payload.activeProfileId)) {
      cloudStore = payload;
    }

    if (!cloudStore || typeof cloudStore !== "object") return;

    applyStore(cloudStore);

    try {
      await saveStore(cloudStore);
    } catch {}

    if (updatedAt) {
      await setKV("__cloud:last_pulled_at__", updatedAt).catch(() => {});
    } else {
      await setKV("__cloud:last_pulled_at__", new Date().toISOString()).catch(() => {});
    }
  } catch {
    // silent
  }
}

// ------------------------------------------------------------
// ✅ Public: merge local + cloud without data loss
// Strategy:
// - Pull cloud snapshot (store-only or full snapshot)
// - If one side is empty => take the other
// - Otherwise deep-merge conservatively (prefer LOCAL values when conflicts)
// - Apply merged store locally, then push merged snapshot to cloud
// ------------------------------------------------------------
export async function mergeNow() {
  try {
    const sess = await getSessionSafe();
    const uid = sess?.user?.id;
    if (!uid) return;

    // --- local
    const localStore = getStore();

    // --- cloud
    const pulled = await onlineApi.pullStoreSnapshot(uid);
    const payload = pulled?.payload;
    let cloudStore: any = payload?.store ?? payload?.idb?.store ?? null;
    if (payload && typeof payload === "object" && (payload as any)._v === 2) {
      // Full snapshot format — store is inside idb.store
      cloudStore = payload?.idb?.store ?? cloudStore;
    }
    if (!cloudStore && payload && typeof payload === "object" && !payload._v && (payload.profiles || payload.history || payload.activeProfileId)) {
      cloudStore = payload;
    }

    const localEmpty = !localStore || typeof localStore !== "object" || Object.keys(localStore).length === 0;
    const cloudEmpty = !cloudStore || typeof cloudStore !== "object" || Object.keys(cloudStore).length === 0;

    if (cloudEmpty && localEmpty) return;

    if (localEmpty && !cloudEmpty) {
      applyStore(cloudStore);
      await saveStore(cloudStore).catch(() => {});
      await setKV("__cloud:last_pulled_at__", pulled?.updated_at ?? new Date().toISOString()).catch(() => {});
      return;
    }

    if (!localEmpty && cloudEmpty) {
      await pushNow();
      return;
    }

    // Both non-empty => merge conservatively (prefer local on conflicts)
    const merged = mergeDeep(localStore, cloudStore);

    applyStore(merged);
    await saveStore(merged).catch(() => {});

    // Push merged store (store-only snapshot is enough, server stores payload JSON)
    await onlineApi.pushStoreSnapshot(uid, { store: merged, _note: "mergeNow" }, 8).catch(() => {});
    await setKV("__cloud:last_pulled_at__", new Date().toISOString()).catch(() => {});
  } catch {
    // silent
  }
}

function schedulePush() {
  if (!running) return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    pushNow().catch(() => {});
  }, DEBOUNCE_MS);
}

export function startCloudSync(opts?: { pullOnStart?: boolean; disablePull?: boolean }) {
  if (running) return;
  running = true;

  unsub = onCloudChange(() => schedulePush());

  if (opts?.pullOnStart !== false) {
    pullNow().catch(() => {});
  }

  if (!opts?.disablePull) {
    pullTimer = window.setInterval(() => {
      pullNow().catch(() => {});
    }, PULL_INTERVAL_MS) as any;
  }
}

export function stopCloudSync() {
  running = false;

  if (unsub) unsub();
  unsub = null;

  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = null;

  if (pullTimer) window.clearInterval(pullTimer);
  pullTimer = null;
}
