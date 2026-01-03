// ============================================================
// src/lib/cloudSync.ts
// Sync "store snapshot" ↔ Supabase table user_store
// - Pull au login -> import local (CLOUD WINS)
// - Push auto (poll + hash) -> cloud
// - + Push debounced immédiat via notifyLocalChange()
// ============================================================

import { onlineApi } from "./onlineApi";
import { exportCloudSnapshot, importCloudSnapshot } from "./storage";

// interval (ms) : ajustable
const PUSH_EVERY = 15000; // 15s
const PULL_ON_START = true;

// push "quasi temps réel" (debounce)
const DEBOUNCE_PUSH_MS = 900;

let timer: any = null;
let debounceTimer: any = null;

let lastHash = "";
let running = false;
let pushing = false;

// ✅ FIX CRITIQUE : stringify stable SANS filtre (le 2e arg de JSON.stringify = FILTER)
// -> sinon tu perds des clés comme dc_dart_sets_v1 dans localStorage => hash ne change jamais
function stableStringify(value: any): string {
  const seen = new WeakSet();

  const walk = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;

    // sécurité anti-cycles (au cas où)
    if (seen.has(v)) return "[Circular]";
    seen.add(v);

    if (Array.isArray(v)) return v.map(walk);

    const out: any = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = walk(v[k]);
    }
    return out;
  };

  return JSON.stringify(walk(value));
}

function hashString(s: string) {
  // hash léger (djb2)
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/**
 * PULL cloud -> import local
 * "cloud wins" (si cloud existe)
 */
export async function cloudPullAndImport(): Promise<{
  status: "ok" | "not_found" | "skipped" | "error";
  reason?: string;
}> {
  try {
    const s = await onlineApi.getCurrentSession();
    if (!s?.token) return { status: "skipped", reason: "no-session" };

    const res = await onlineApi.pullStoreSnapshot();
    if (res.status === "not_found" || !res.payload) {
      return { status: "not_found" };
    }

    // ✅ IMPORT CLOUD → replace local kv entièrement
    await importCloudSnapshot(res.payload, { mode: "replace" });

    // met à jour le hash local après import
    const local = await exportCloudSnapshot();
    lastHash = hashString(stableStringify(local));

    return { status: "ok" };
  } catch (e: any) {
    console.warn("[cloudSync] cloudPullAndImport error", e);
    return { status: "error", reason: e?.message || String(e) };
  }
}

/**
 * PUSH local -> cloud (si session)
 */
export async function cloudPushNow(): Promise<{
  status: "ok" | "skipped" | "error";
  reason?: string;
}> {
  if (pushing) return { status: "skipped", reason: "busy" };

  pushing = true;
  try {
    const s = await onlineApi.getCurrentSession();
    if (!s?.token) return { status: "skipped", reason: "no-session" };

    const payload = await exportCloudSnapshot();
    const str = stableStringify(payload);
    const h = hashString(str);

    if (h === lastHash) return { status: "skipped", reason: "no-change" };

    // version : tu peux l'incrémenter plus tard, on garde 1 pour l’instant
    await onlineApi.pushStoreSnapshot(payload, 1);

    lastHash = h;
    return { status: "ok" };
  } catch (e: any) {
    console.warn("[cloudSync] cloudPushNow error", e);
    return { status: "error", reason: e?.message || String(e) };
  } finally {
    pushing = false;
  }
}

/**
 * Appelle ceci quand tu sais qu’un changement important vient d’être écrit localement
 * (stats, prefs, profils, dartsets...)
 * => déclenche un push rapide (debounced)
 */
export function notifyLocalChange() {
  if (!running) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cloudPushNow();
  }, DEBOUNCE_PUSH_MS);
}

/**
 * Démarre la sync auto
 * - pull 1 fois au start (option)
 * - push périodique si changement
 */
export async function startCloudSync() {
  if (running) return;
  running = true;

  if (PULL_ON_START) {
    await cloudPullAndImport();
  }

  timer = setInterval(() => {
    cloudPushNow();
  }, PUSH_EVERY);

  // push avant fermeture onglet
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      cloudPushNow(); // best effort
    });
  }
}

export function stopCloudSync() {
  running = false;
  if (timer) clearInterval(timer);
  timer = null;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
}

export function isCloudSyncRunning() {
  return running;
}
