import type { ViewerSessionInfo } from "./types";

export const ACTIVE_VIEWER_SESSION_KEY = "dc_viewer_active_session_v1";
const EVENT_NAME = "dc-viewer-session-changed";

function now() {
  return Date.now();
}

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getActiveViewerSession(): ViewerSessionInfo | null {
  if (typeof window === "undefined") return null;
  const info = readJson<ViewerSessionInfo | null>(window.localStorage.getItem(ACTIVE_VIEWER_SESSION_KEY), null);
  if (!info?.sessionId || !info.enabled) return null;
  if (info.expiresAt && info.expiresAt < now()) {
    clearActiveViewerSession();
    return null;
  }
  return info;
}

export function setActiveViewerSession(info: ViewerSessionInfo | null) {
  if (typeof window === "undefined") return;
  try {
    if (!info?.sessionId) window.localStorage.removeItem(ACTIVE_VIEWER_SESSION_KEY);
    else window.localStorage.setItem(ACTIVE_VIEWER_SESSION_KEY, JSON.stringify({ ...info, enabled: info.enabled !== false }));
  } catch {}
  emitViewerSessionChanged();
}

export function clearActiveViewerSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_VIEWER_SESSION_KEY);
  } catch {}
  emitViewerSessionChanged();
}

export function subscribeViewerSessionChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === ACTIVE_VIEWER_SESSION_KEY) cb();
  };
  const onEvent = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, onEvent as any);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, onEvent as any);
  };
}

export function emitViewerSessionChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {}
}
