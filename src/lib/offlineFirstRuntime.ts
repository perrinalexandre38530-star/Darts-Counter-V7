// ============================================================
// src/lib/offlineFirstRuntime.ts
// Offline-first runtime coordinator.
//
// IMPORTANT:
// - navigator.onLine is only a connectivity hint, never a guarantee that a
//   remote service is reachable.
// - Local writes remain authoritative. Remote work must call
//   shouldAttemptRemoteWork() and keep its local queue intact on failure.
// - This module never performs a network request by itself.
// ============================================================

import { onlineApi } from "./onlineApi";

type ConnectivityState = "online" | "offline";

export type OfflineFirstState = {
  connectivity: ConnectivityState;
  onlineHint: boolean;
  changedAt: number;
  persistentStorage: boolean | null;
};

const EVENT_NAME = "msc:connectivity-changed";
const DIAG_KEY = "msc_offline_first_state_v1";

let started = false;
let persistentStorage: boolean | null = null;
let cachedAuthBridgeInstalled = false;
let currentState: OfflineFirstState = {
  connectivity: "online",
  onlineHint: true,
  changedAt: Date.now(),
  persistentStorage: null,
};

function readOnlineHint(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

function buildState(changedAt = Date.now()): OfflineFirstState {
  const onlineHint = readOnlineHint();
  return {
    connectivity: onlineHint ? "online" : "offline",
    onlineHint,
    changedAt,
    persistentStorage,
  };
}

function persistDiagnostics(state: OfflineFirstState): void {
  try {
    localStorage.setItem(DIAG_KEY, JSON.stringify(state));
  } catch {}
}

function readKnownLocalAccountId(): string {
  try {
    return String(
      localStorage.getItem("dc_user_id") ||
      (window as any).__dc_primary_auth_user_id ||
      (window as any).__dc_last_signed_in_user_id ||
      "",
    ).trim();
  } catch {
    return "";
  }
}

/**
 * Compatibility bridge for the V102 account gate.
 *
 * V102 already persists the canonical account session locally and Android's
 * auth provider has a fast local boot path. The only thing that prevented this
 * path after a long offline period was the cached network-token expiration.
 *
 * While OFFLINE ONLY, expose the exact same cached identity with no expiration
 * and in degraded/local mode. We never invent a user id and never change the
 * storage namespace. If the cached auth object itself is missing but V102 still
 * has its canonical dc_user_id, rebuild only the minimal local identity from
 * that SAME id. Explicit logout removes dc_user_id and is also enforced again
 * inside useAuthOnline, so this bridge cannot undo a deliberate logout.
 *
 * As soon as connectivity returns, the original cached session is returned
 * untouched and Supabase can refresh normally.
 */
function installOfflineCachedAuthBridge(): void {
  if (cachedAuthBridgeInstalled) return;
  cachedAuthBridgeInstalled = true;
  try {
    const api: any = onlineApi as any;
    const original = typeof api?.loadAuthFromLS === "function" ? api.loadAuthFromLS.bind(api) : null;
    if (!original) return;
    api.loadAuthFromLS = () => {
      const cached = original();
      if (readOnlineHint()) return cached;

      const cachedUserId = String(
        cached?.supabaseUserId ||
        cached?.user?.user_metadata?.supabase_user_id ||
        cached?.user?.id ||
        cached?.userId ||
        "",
      ).trim();
      const userId = cachedUserId || readKnownLocalAccountId();
      if (!userId) return cached;

      if (!cached) {
        return {
          token: "",
          refreshToken: "",
          expiresAt: null,
          userId,
          supabaseUserId: userId,
          canonicalUserId: userId,
          authProvider: "supabase_failover",
          degradedMode: true,
          profile: null,
          user: {
            id: userId,
            nickname: "Player",
            user_metadata: {
              supabase_user_id: userId,
              canonical_user_id: userId,
              degraded_mode: true,
              auth_provider: "supabase_failover",
            },
          },
        };
      }

      return {
        ...cached,
        expiresAt: null,
        degradedMode: true,
        authProvider: cached?.authProvider || "supabase_failover",
        supabaseUserId: String(cached?.supabaseUserId || userId),
      };
    };
  } catch {}
}

function publish(force = false): void {
  const next = buildState();
  if (!force && next.connectivity === currentState.connectivity && next.persistentStorage === currentState.persistentStorage) {
    return;
  }
  currentState = next;
  try {
    document.documentElement.dataset.mscConnectivity = next.connectivity;
    document.documentElement.dataset.mscOfflineFirst = "1";
  } catch {}
  persistDiagnostics(next);
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  } catch {}
}

async function requestPersistentStorageBestEffort(): Promise<void> {
  try {
    const storage: any = typeof navigator !== "undefined" ? navigator.storage : null;
    if (!storage) return;
    if (typeof storage.persisted === "function" && (await storage.persisted())) {
      persistentStorage = true;
      publish(true);
      return;
    }
    if (typeof storage.persist === "function") {
      persistentStorage = (await storage.persist()) === true;
      publish(true);
    }
  } catch {
    // Persistence is a bonus. IndexedDB remains usable if the browser refuses it.
    persistentStorage = false;
    publish(true);
  }
}

export function initOfflineFirstRuntime(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  installOfflineCachedAuthBridge();
  currentState = buildState();
  try {
    document.documentElement.dataset.mscConnectivity = currentState.connectivity;
    document.documentElement.dataset.mscOfflineFirst = "1";
  } catch {}
  persistDiagnostics(currentState);

  window.addEventListener("online", () => publish(true), { passive: true });
  window.addEventListener("offline", () => publish(true), { passive: true });

  // Never put StorageManager persistence in the critical render path.
  window.setTimeout(() => {
    void requestPersistentStorageBestEffort();
  }, 0);
}

export function getOfflineFirstState(): OfflineFirstState {
  if (!started && typeof window !== "undefined") initOfflineFirstRuntime();
  const onlineHint = readOnlineHint();
  return { ...currentState, onlineHint, connectivity: onlineHint ? "online" : "offline" };
}

export function isRuntimeOffline(): boolean {
  return !readOnlineHint();
}

export function shouldAttemptRemoteWork(): boolean {
  return readOnlineHint();
}

export function subscribeConnectivity(listener: (state: OfflineFirstState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  initOfflineFirstRuntime();
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<OfflineFirstState>)?.detail;
    listener(detail || getOfflineFirstState());
  };
  window.addEventListener(EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
}
