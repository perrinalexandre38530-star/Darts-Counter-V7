// ============================================================
// src/lib/offlineFirstRuntime.ts
// Offline-first runtime coordinator.
//
// IMPORTANT:
// - navigator.onLine is only a connectivity hint, never a guarantee that a
//   remote service is reachable.
// - Local writes remain authoritative. Remote work must call
//   shouldAttemptRemoteWork() and keep its local queue intact on failure.
// - No network request is ever performed from this module.
// ============================================================

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
  return { ...currentState, onlineHint: readOnlineHint(), connectivity: readOnlineHint() ? "online" : "offline" };
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
