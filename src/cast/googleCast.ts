import type { CastSnapshot } from "./castTypes";

export const DEFAULT_GOOGLE_CAST_APP_ID = "3534BC6A";
export const GOOGLE_CAST_APP_ID_KEY = "multisports_google_cast_app_id";
export const GOOGLE_CAST_NAMESPACE = "urn:x-cast:com.multisports.scoreboard";
export const GOOGLE_CAST_SDK_URL =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

let sdkPromise: Promise<boolean> | null = null;
let initializedAppId: string | null = null;

function emitStatus() {
  try {
    window.dispatchEvent(new CustomEvent("multisports-google-cast-status"));
  } catch {}
}

function normalizeAppId(value: any): string {
  return String(value || "").trim().toUpperCase();
}

function safeWindow(): any {
  return typeof window !== "undefined" ? (window as any) : null;
}

function getCastContext(): any | null {
  const w = safeWindow();
  return w?.cast?.framework?.CastContext?.getInstance?.() || null;
}

export function getGoogleCastAppId(): string {
  try {
    const stored = normalizeAppId(window.localStorage.getItem(GOOGLE_CAST_APP_ID_KEY));
    return stored || DEFAULT_GOOGLE_CAST_APP_ID;
  } catch {
    return DEFAULT_GOOGLE_CAST_APP_ID;
  }
}

export function setGoogleCastAppId(appId: string) {
  try {
    const next = normalizeAppId(appId) || DEFAULT_GOOGLE_CAST_APP_ID;
    window.localStorage.setItem(GOOGLE_CAST_APP_ID_KEY, next);
    initializedAppId = null;
  } catch {}
  emitStatus();
}

export function resetGoogleCastAppId() {
  try {
    window.localStorage.removeItem(GOOGLE_CAST_APP_ID_KEY);
    initializedAppId = null;
  } catch {}
  emitStatus();
}

export function isGoogleCastConfigured() {
  return !!getGoogleCastAppId();
}

export function isGoogleCastSupported() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Chrome|CriOS|Edg|Android/i.test(ua);
}

export async function loadGoogleCastSdk(): Promise<boolean> {
  const w = safeWindow();
  if (!w) return false;
  if (w.cast?.framework && w.chrome?.cast) return true;
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<boolean>((resolve) => {
    let doneOnce = false;

    const done = (ok: boolean) => {
      if (doneOnce) return;
      doneOnce = true;
      emitStatus();
      resolve(ok);
    };

    try {
      w.__onGCastApiAvailable = (available: boolean) => done(!!available);
    } catch {}

    const existing = document.querySelector(
      `script[src="${GOOGLE_CAST_SDK_URL}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("error", () => done(false), { once: true });
      setTimeout(() => {
        done(!!(w.cast?.framework && w.chrome?.cast));
      }, 600);
      return;
    }

    try {
      const script = document.createElement("script");
      script.src = GOOGLE_CAST_SDK_URL;
      script.async = true;
      script.onerror = () => done(false);
      document.head.appendChild(script);
    } catch {
      done(false);
      return;
    }

    setTimeout(() => {
      done(!!(w.cast?.framework && w.chrome?.cast));
    }, 1500);
  });

  return sdkPromise;
}

function bindCastEvents() {
  const w = safeWindow();
  const cast = w?.cast;
  const ctx = getCastContext();
  if (!ctx || !cast?.framework || (ctx as any).__multisportsBound) return;

  try {
    ctx.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, emitStatus);
  } catch {}

  try {
    ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, emitStatus);
  } catch {}

  try {
    (ctx as any).__multisportsBound = true;
  } catch {}
}

export async function ensureGoogleCastReady(): Promise<boolean> {
  if (!isGoogleCastSupported()) return false;

  const ok = await loadGoogleCastSdk();
  if (!ok) return false;

  const appId = getGoogleCastAppId();
  if (!appId) return false;
  if (initializedAppId === appId) {
    bindCastEvents();
    return true;
  }

  const w = safeWindow();
  const cast = w?.cast;
  const chrome = w?.chrome;
  if (!cast?.framework || !chrome?.cast) return false;

  try {
    cast.framework.CastContext.getInstance().setOptions({
      receiverApplicationId: appId,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      resumeSavedSession: true,
    });
    initializedAppId = appId;
    bindCastEvents();
    emitStatus();
    return true;
  } catch (err) {
    console.error("[googleCast] setOptions failed", err);
    return false;
  }
}

export function getGoogleCastState() {
  const w = safeWindow();
  const cast = w?.cast;
  const ctx = getCastContext();
  const session = ctx?.getCurrentSession?.() || null;
  const castState = ctx?.getCastState?.() || "NO_DEVICES_AVAILABLE";
  const deviceName = session?.getCastDevice?.()?.friendlyName || "";

  return {
    supported: isGoogleCastSupported(),
    configured: isGoogleCastConfigured(),
    appId: getGoogleCastAppId(),
    sdkLoaded: !!(w?.cast?.framework && w?.chrome?.cast),
    castState,
    session,
    deviceName,
    isCasting: !!session,
  };
}

export async function requestGoogleCastSession() {
  const ready = await ensureGoogleCastReady();
  if (!ready) {
    return { ok: false as const, reason: "sdk_unavailable" as const };
  }

  try {
    const ctx = getCastContext();
    if (!ctx?.requestSession) {
      return { ok: false as const, reason: "context_unavailable" as const };
    }

    await ctx.requestSession();
    emitStatus();
    return { ok: true as const };
  } catch (err: any) {
    const code = String(err?.code || err?.message || "request_failed");
    console.error("[googleCast] requestSession failed", err);
    return { ok: false as const, reason: code };
  }
}

export async function endGoogleCastSession() {
  try {
    const state = getGoogleCastState();
    if (state.session?.endSession) {
      state.session.endSession(true);
    } else {
      const ctx = getCastContext();
      await ctx?.endCurrentSession?.(true);
    }
    emitStatus();
  } catch {}
}

export async function sendCastSnapshot(snapshot: CastSnapshot | null): Promise<boolean> {
  if (!snapshot) return false;

  try {
    const stateBefore = getGoogleCastState();
    if (!stateBefore.isCasting) return false;

    const ready = await ensureGoogleCastReady();
    if (!ready) return false;

    const state = getGoogleCastState();
    const raw = state.session?.getSessionObj?.() || state.session;
    if (!raw?.sendMessage) return false;

    await raw.sendMessage(GOOGLE_CAST_NAMESPACE, {
      ...snapshot,
      updatedAt: Number((snapshot as any).updatedAt || Date.now()),
    });
    return true;
  } catch (err) {
    console.error("[googleCast] send snapshot failed", err);
    return false;
  }
}

export function subscribeGoogleCastStatus(cb: () => void) {
  const refresh = () => cb();

  if (typeof window !== "undefined") {
    window.addEventListener("multisports-google-cast-status", refresh);
  }

  const w = safeWindow();
  const cast = w?.cast;
  const ctx = getCastContext();

  try {
    ctx?.addEventListener?.(cast.framework.CastContextEventType.CAST_STATE_CHANGED, refresh);
  } catch {}

  try {
    ctx?.addEventListener?.(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, refresh);
  } catch {}

  return () => {
    try {
      window.removeEventListener("multisports-google-cast-status", refresh);
    } catch {}

    try {
      ctx?.removeEventListener?.(cast.framework.CastContextEventType.CAST_STATE_CHANGED, refresh);
    } catch {}

    try {
      ctx?.removeEventListener?.(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        refresh
      );
    } catch {}
  };
}
