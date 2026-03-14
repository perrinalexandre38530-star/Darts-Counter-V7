import type { CastSnapshot } from "./castTypes";

export const GOOGLE_CAST_APP_ID_KEY = "multisports_google_cast_app_id";
export const GOOGLE_CAST_NAMESPACE = "urn:x-cast:com.multisports.scoreboard";
export const GOOGLE_CAST_SDK_URL = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

let sdkPromise: Promise<boolean> | null = null;
let initializedAppId: string | null = null;

function emitStatus() {
  try {
    window.dispatchEvent(new CustomEvent("multisports-google-cast-status"));
  } catch {}
}

export function getGoogleCastAppId(): string {
  try {
    return String(window.localStorage.getItem(GOOGLE_CAST_APP_ID_KEY) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export function setGoogleCastAppId(appId: string) {
  try {
    const next = String(appId || "").trim().toUpperCase();
    if (next) window.localStorage.setItem(GOOGLE_CAST_APP_ID_KEY, next);
    else window.localStorage.removeItem(GOOGLE_CAST_APP_ID_KEY);
    initializedAppId = null;
  } catch {}
  emitStatus();
}

export function isGoogleCastConfigured() {
  return !!getGoogleCastAppId();
}

export function isGoogleCastSupported() {
  return typeof window !== "undefined" && /Chrome|Edg|Android/i.test(navigator.userAgent || "");
}

export async function loadGoogleCastSdk(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if ((window as any).cast?.framework && (window as any).chrome?.cast) return true;
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<boolean>((resolve) => {
    const done = (ok: boolean) => {
      emitStatus();
      resolve(ok);
    };

    (window as any).__onGCastApiAvailable = (available: boolean) => done(!!available);

    const existing = document.querySelector(`script[src="${GOOGLE_CAST_SDK_URL}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.src = GOOGLE_CAST_SDK_URL;
    script.async = true;
    script.onerror = () => done(false);
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function ensureGoogleCastReady(): Promise<boolean> {
  const ok = await loadGoogleCastSdk();
  if (!ok) return false;

  const appId = getGoogleCastAppId();
  if (!appId) return true;
  if (initializedAppId === appId) return true;

  const cast = (window as any).cast;
  const chrome = (window as any).chrome;
  if (!cast?.framework || !chrome?.cast) return false;

  try {
    cast.framework.CastContext.getInstance().setOptions({
      receiverApplicationId: appId,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    initializedAppId = appId;
    emitStatus();
    return true;
  } catch {
    return false;
  }
}

export function getGoogleCastState() {
  const cast = (window as any).cast;
  const ctx = cast?.framework?.CastContext?.getInstance?.();
  const session = ctx?.getCurrentSession?.() || null;
  const castState = ctx?.getCastState?.() || "NO_DEVICES_AVAILABLE";
  const deviceName = session?.getCastDevice?.()?.friendlyName || "";

  return {
    supported: isGoogleCastSupported(),
    configured: isGoogleCastConfigured(),
    sdkLoaded: !!((window as any).cast?.framework && (window as any).chrome?.cast),
    castState,
    session,
    deviceName,
    isCasting: !!session,
  };
}

export async function requestGoogleCastSession() {
  const appId = getGoogleCastAppId();
  if (!appId) {
    return { ok: false, reason: "missing_app_id" as const };
  }

  const ready = await ensureGoogleCastReady();
  if (!ready) {
    return { ok: false, reason: "sdk_unavailable" as const };
  }

  try {
    const ctx = (window as any).cast.framework.CastContext.getInstance();
    await ctx.requestSession();
    emitStatus();
    return { ok: true as const };
  } catch (err: any) {
    const code = String(err?.code || err?.message || "request_failed");
    return { ok: false, reason: code };
  }
}

export async function endGoogleCastSession() {
  try {
    const state = getGoogleCastState();
    if (state.session?.endSession) state.session.endSession(true);
    emitStatus();
  } catch {}
}

export async function sendCastSnapshot(snapshot: CastSnapshot | null): Promise<boolean> {
  if (!snapshot) return false;
  try {
    const ready = await ensureGoogleCastReady();
    if (!ready) return false;
    const state = getGoogleCastState();
    const session = state.session;
    const raw = session?.getSessionObj?.();
    if (!raw?.sendMessage) return false;
    await raw.sendMessage(GOOGLE_CAST_NAMESPACE, {
      ...snapshot,
      updatedAt: Number(snapshot.updatedAt || Date.now()),
    });
    return true;
  } catch {
    return false;
  }
}

export function subscribeGoogleCastStatus(cb: () => void) {
  const refresh = () => cb();
  const cast = (window as any).cast;

  window.addEventListener("multisports-google-cast-status", refresh);
  try {
    cast?.framework?.CastContext?.getInstance?.()?.addEventListener?.(
      cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      refresh,
    );
  } catch {}
  try {
    cast?.framework?.CastContext?.getInstance?.()?.addEventListener?.(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      refresh,
    );
  } catch {}

  return () => {
    window.removeEventListener("multisports-google-cast-status", refresh);
    try {
      cast?.framework?.CastContext?.getInstance?.()?.removeEventListener?.(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        refresh,
      );
    } catch {}
    try {
      cast?.framework?.CastContext?.getInstance?.()?.removeEventListener?.(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        refresh,
      );
    } catch {}
  };
}
