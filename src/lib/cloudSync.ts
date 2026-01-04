// ============================================
// src/lib/cloudSync.ts
// Pipeline de sync cloud (pull + push) debounced
// - s'appuie sur emitCloudChange/onCloudChange
// - exportCloudSnapshot/importCloudSnapshot depuis storage.ts
// - onlineApi.pullStoreSnapshot/pushStoreSnapshot
// ============================================

import { onCloudChange } from "./cloudEvents";
import { exportCloudSnapshot, importCloudSnapshot } from "./storage";
import { onlineApi } from "./onlineApi";
import { getAllDartSets, setAllDartSets } from "./dartSetsStore";

/** Ajuste si tu veux */
const DEFAULT_DEBOUNCE_MS = 1200;
const DEFAULT_PULL_INTERVAL_MS = 60_000;

/** Debug (mets true 2 minutes pour voir si ça push) */
const DEBUG = true;

let running = false;
let unsubscribe: null | (() => void) = null;

let pushTimer: number | null = null;
let pullTimer: number | null = null;

let lastReason = "";
let lastLocalChangeAt = 0;
let inFlightPush = false;
let inFlightPull = false;

// Hash du dernier snapshot local connu (pour skip si pas de vrai changement)
let lastHash = "";

// anti-loop (si import => écritures locales => emitCloudChange)
let suppressEvents = 0;

function log(...args: any[]) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.log("[cloudSync]", ...args);
}

function withSuppressedEvents<T>(fn: () => T): T {
  suppressEvents++;
  try {
    return fn();
  } finally {
    suppressEvents = Math.max(0, suppressEvents - 1);
  }
}

/** Deep stable stringify (tri des clés + support array + anti-circular) */
function stableStringifyDeep(obj: any): string {
  const seen = new WeakSet();

  const normalize = (v: any): any => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) return "[Circular]";
    seen.add(v);

    if (Array.isArray(v)) return v.map(normalize);

    const out: any = {};
    for (const k of Object.keys(v).sort()) out[k] = normalize(v[k]);
    return out;
  };

  return JSON.stringify(normalize(obj));
}

/** Hash léger (djb2) */
function hashString(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

async function computeLocalHash(): Promise<{ hash: string; dump: any }> {
  // IMPORTANT:
  // - exportCloudSnapshot() exporte un dump (IDB + localStorage) mais, dans ton app,
  //   les DARTSETS vivent dans localStorage via dartSetsStore.
  // - Or, selon l’environnement / migrations, ils peuvent ne pas apparaître dans le dump
  //   (ou être trop enfouis dans `idb[STORE_KEY]`).
  // 👉 On les ajoute donc explicitement au snapshot cloud pour que :
  //   1) ils soient réellement synchronisés
  //   2) ils soient visibles facilement dans Supabase (data->'store'->'dartSets')
  const dumpBase = await exportCloudSnapshot(); // IDB + localStorage dc_*/dc-*

  const dump = {
    ...dumpBase,
    // champ "plat" (pratique à vérifier en SQL)
    dartSets: getAllDartSets(),
  };
  const str = stableStringifyDeep(dump);
  const hash = hashString(str);
  return { hash, dump };
}

function schedulePush(debounceMs = DEFAULT_DEBOUNCE_MS) {
  if (!running) return;
  if (suppressEvents > 0) return;

  if (pushTimer) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }

  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    cloudPushNow().catch(() => {});
  }, debounceMs);
}

/**
 * À appeler si tu veux forcer un push debounced sans passer par emitCloudChange.
 * (mais normalement emitCloudChange() suffit)
 */
export function notifyLocalChange(reason = "manual") {
  if (!running) return;
  lastReason = reason;
  lastLocalChangeAt = Date.now();
  schedulePush(DEFAULT_DEBOUNCE_MS);
}

export async function cloudPullAndImport(): Promise<{
  status: "ok" | "skip" | "not_found" | "error";
  error?: any;
}> {
  if (inFlightPull) return { status: "skip" };
  inFlightPull = true;

  try {
    const res: any = await onlineApi.pullStoreSnapshot();

    if (res?.status === "not_signed_in") return { status: "skip" };
    if (res?.status === "not_found") return { status: "not_found" };
    if (res?.status !== "ok") return { status: "error", error: res?.error || res };

    const dump = res?.payload?.store ?? res?.payload ?? null;
    if (!dump) return { status: "error", error: "empty payload" };

    // Import “replace” (source cloud) — on supprime la boucle d’events
    await withSuppressedEvents(async () => {
      await importCloudSnapshot(dump, { mode: "replace" });

      // ✅ Restaure les dartsets (ils vivent dans dc_dart_sets_v1, pas dans la snapshot IDB principale)
      if (Array.isArray(dump?.dartSets)) {
        try {
          setAllDartSets(dump.dartSets);
        } catch {
          // ignore
        }
      }
    });

    // après import, on recalcule le hash local pour éviter un push immédiat “inutile”
    try {
      const { hash } = await computeLocalHash();
      lastHash = hash;
      log("PULL ok -> imported, lastHash=", lastHash);
    } catch {}

    return { status: "ok" };
  } catch (e) {
    return { status: "error", error: e };
  } finally {
    inFlightPull = false;
  }
}

export async function cloudPushNow(): Promise<{
  status: "ok" | "skip" | "error";
  reason?: string;
  error?: any;
}> {
  if (!running) return { status: "skip", reason: "not_running" };
  if (inFlightPush) return { status: "skip", reason: "busy" };
  if (suppressEvents > 0) return { status: "skip", reason: "suppressed" };

  inFlightPush = true;

  try {
    // snapshot local complet (IDB + localStorage dc_* / dc-*)
    const { hash, dump } = await computeLocalHash();

    if (hash === lastHash) {
      log("PUSH skip (no-change) hash=", hash, "reason=", lastReason);
      return { status: "skip", reason: "no-change" };
    }

    // garde-fou taille (évite de planter si payload énorme)
    try {
      const approx = JSON.stringify(dump).length;
      if (approx > 6_000_000) {
        console.warn("[cloudSync] snapshot très gros:", approx, "chars. Risque de rejet côté DB.");
      }
    } catch {}

    const payload = {
      kind: "dc_store_snapshot_v1",
      createdAt: new Date().toISOString(),
      reason: lastReason || "unknown",
      changedAt: lastLocalChangeAt || Date.now(),
      store: dump,
    };

    const res: any = await onlineApi.pushStoreSnapshot(payload);

    if (res?.status === "not_signed_in") return { status: "skip", reason: "not_signed_in" };
    if (res?.status !== "ok") return { status: "error", error: res?.error || res };

    lastHash = hash;
    log("PUSH ok hash=", lastHash, "reason=", lastReason);

    return { status: "ok" };
  } catch (e) {
    log("PUSH error", e);
    return { status: "error", error: e };
  } finally {
    inFlightPush = false;
  }
}

export async function startCloudSync(opts?: {
  debounceMs?: number;
  pullIntervalMs?: number;
  pullOnStart?: boolean;
}) {
  if (running) return;

  const debounceMs = opts?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const pullIntervalMs = opts?.pullIntervalMs ?? DEFAULT_PULL_INTERVAL_MS;
  const pullOnStart = opts?.pullOnStart ?? true;

  running = true;

  // initialise lastHash au démarrage (évite un “push” immédiat si rien n’a changé)
  try {
    const { hash } = await computeLocalHash();
    lastHash = hash;
    log("start: lastHash init =", lastHash);
  } catch {}

  // écoute les changements locaux (idb + localStorage dc_*/dc-* via hook storage.ts)
  unsubscribe = onCloudChange((reason) => {
    if (!running) return;
    if (suppressEvents > 0) return;

    lastReason = reason;
    lastLocalChangeAt = Date.now();
    schedulePush(debounceMs);
  });

  // pull au démarrage
  if (pullOnStart) {
    cloudPullAndImport().catch(() => {});
  }

  // pull périodique (anti-désynchro si 2 devices)
  pullTimer = window.setInterval(() => {
    if (!running) return;
    cloudPullAndImport().catch(() => {});
  }, pullIntervalMs) as any;

  log("running (debounce=", debounceMs, "pullInterval=", pullIntervalMs, "pullOnStart=", pullOnStart, ")");
  return true;
}

export function stopCloudSync() {
  running = false;

  try {
    if (unsubscribe) unsubscribe();
  } catch {}
  unsubscribe = null;

  if (pushTimer) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (pullTimer) {
    window.clearInterval(pullTimer);
    pullTimer = null;
  }

  log("stopped");
}

export function isCloudSyncRunning() {
  return running;
}
