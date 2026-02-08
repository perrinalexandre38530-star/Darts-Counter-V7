// ============================================
// src/lib/cloudSync.ts (V8 simple)
// - source unique: window.__appStore.store
// - push debounced sur emitCloudChange
// - pull périodique (optionnel)
// ============================================

import { onCloudChange } from "./cloudEvents";
import { onlineApi } from "./onlineApi";
import { exportCloudSnapshot, saveStore, importAll, getKV, setKV, loadStore } from "./storage";

const DEBOUNCE_MS = 1200;
const PULL_INTERVAL_MS = 60_000;

let running = false;
let unsub: null | (() => void) = null;

let pushTimer: number | null = null;
let pullTimer: number | null = null;

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

    // ⚠️ Sécurité anti-perte : ne jamais écraser un local "riche" par un cloud "vide"
    // (scénario classique : données en local avant connexion, puis profil cloud ...
    let nextStore: any = cloudStore;
    try {
      const local = await loadStore();
      const localHistory = Array.isArray(local?.history) ? local.history.length : 0;
      const cloudHistory = Array.isArray((cloudStore as any)?.history) ? (cloudStore as any).history.length : 0;

      // Heuristique: si le cloud semble vide/moins riche, on garde le local pour les data lourdes.
      if (local && typeof local === "object") {
        const merged: any = { ...cloudStore };

        // history
        if (localHistory > cloudHistory) merged.history = local.history;

        // saved (configurations / presets)
        if (local?.saved && (!merged.saved || Object.keys(merged.saved).length < Object.keys(local.saved).length)) {
          merged.saved = local.saved;
        }

        // profiles: merge par id, préférer le cloud pour nickname/avatar quand présent
        const cp = (cloudStore as any)?.profiles || {};
        const lp = (local as any)?.profiles || {};
        const outProfiles: any = { ...lp, ...cp };
        for (const id of Object.keys(lp)) {
          const a = lp[id];
          const b = cp[id];
          if (!b) continue;
          outProfiles[id] = {
            ...a,
            ...b,
            nickname: (b.nickname ?? a.nickname),
            displayName: (b.displayName ?? a.displayName),
            avatarUrl: (b.avatarUrl ?? a.avatarUrl),
          };
        }
        merged.profiles = outProfiles;

        // settings: garder cloud, mais fallback local si cloud absent
        if (!merged.settings && (local as any).settings) merged.settings = (local as any).settings;

        // active profile id: préférer cloud sinon local
        if (!merged.activeProfileId && (local as any).activeProfileId) merged.activeProfileId = (local as any).activeProfileId;

        // Si le cloud n'a rien mais le local oui, on applique le merged (donc local) puis on push.
        nextStore = merged;

        const cloudLooksEmpty = cloudHistory === 0 && Object.keys(cp).length <= 1;
        const localLooksRich = localHistory > 0 || Object.keys(lp).length > 1;
        if (cloudLooksEmpty && localLooksRich) {
          // Push immédiat pour remonter les données locales vers le cloud
          try { await pushNow(); } catch {}
        }
      }
    } catch {
      nextStore = cloudStore;
    }

    applyStore(nextStore);

    try {
      await saveStore(nextStore);
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
