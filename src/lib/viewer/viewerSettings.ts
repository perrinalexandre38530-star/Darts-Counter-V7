export const DEFAULT_VIEWER_POLL_MS = 700;
export const VIEWER_POLL_MS_KEY = "dc_viewer_poll_ms_v1";
export const VIEWER_AUTO_PUBLISH_KEY = "dc_viewer_auto_publish_v1";

function clampPollMs(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_VIEWER_POLL_MS;
  return Math.min(3000, Math.max(300, Math.round(value)));
}

export function getViewerPollMs(): number {
  if (typeof window === "undefined") return DEFAULT_VIEWER_POLL_MS;
  try {
    const raw = window.localStorage.getItem(VIEWER_POLL_MS_KEY);
    if (!raw) return DEFAULT_VIEWER_POLL_MS;
    return clampPollMs(Number(raw));
  } catch {
    return DEFAULT_VIEWER_POLL_MS;
  }
}

export function setViewerPollMs(value: number): number {
  const next = clampPollMs(value);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(VIEWER_POLL_MS_KEY, String(next));
    } catch {}
  }
  return next;
}

export function getViewerAutoPublish(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(VIEWER_AUTO_PUBLISH_KEY);
    return raw === null ? true : raw !== "0";
  } catch {
    return true;
  }
}

export function setViewerAutoPublish(enabled: boolean): boolean {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(VIEWER_AUTO_PUBLISH_KEY, enabled ? "1" : "0");
    } catch {}
  }
  return enabled;
}
