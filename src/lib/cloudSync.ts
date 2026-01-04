// ============================================
// src/lib/cloudSync.ts (V8 simple)
// - source unique: window.__appStore.store
// - push debounced sur emitCloudChange
// - pull périodique
// ============================================

import { onCloudChange } from "./cloudEvents";
import { onlineApi } from "./onlineApi";
import { saveStore } from "./storage";

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
  const store = getStore();
  if (!store) return;

  const payload = { version: 8, store };
  await onlineApi.pushStoreSnapshot(payload, 8);
}

async function pullNow() {
  const res = await onlineApi.pullStoreSnapshot();
  if (res.status !== "ok") return;

  const cloudStore = res.payload?.store ?? null;
  if (!cloudStore) return;

  applyStore(cloudStore);
  try {
    await saveStore(cloudStore);
  } catch {}
}

function schedulePush() {
  if (!running) return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    pushNow().catch(() => {});
  }, DEBOUNCE_MS);
}

export function startCloudSync(opts?: { pullOnStart?: boolean }) {
  if (running) return;
  running = true;

  unsub = onCloudChange(() => schedulePush());

  if (opts?.pullOnStart !== false) {
    pullNow().catch(() => {});
  }

  pullTimer = window.setInterval(() => {
    pullNow().catch(() => {});
  }, PULL_INTERVAL_MS) as any;
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
