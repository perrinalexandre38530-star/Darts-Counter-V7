
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

function setLastCastError(message: string) {
  try {
    (window as any).__msLastCastError = message;
    console.warn("[googleCast]", message);
  } catch {}
}

function normalizeAppId(value: any): string {
  return String(value || "").trim().toUpperCase();
}

export function getGoogleCastAppId(): string {
  try {
    const stored = normalizeAppId(window.localStorage.getItem(GOOGLE_CAST_APP_ID_KEY));
    if (!stored || stored === "CC1AD845") return DEFAULT_GOOGLE_CAST_APP_ID;
    return stored;
  } catch {
    return DEFAULT_GOOGLE_CAST_APP_ID;
  }
}

export function setGoogleCastAppId(appId: string) {
  try {
    const next = normalizeAppId(appId) || DEFAULT_GOOGLE_CAST_APP_ID;
    window.localStorage.setItem(GOOGLE_CAST_APP_ID_KEY, next);
  } catch {}
  initializedAppId = null;
  emitStatus();
}

export function resetGoogleCastAppId() {
  try {
    window.localStorage.removeItem(GOOGLE_CAST_APP_ID_KEY);
  } catch {}
  initializedAppId = null;
  emitStatus();
}

export function isGoogleCastConfigured() {
  return !!getGoogleCastAppId();
}

export function isGoogleCastSupported() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Chrome|CriOS|Android|Edg/i.test(ua);
}

export function hasGoogleCastSdkLoaded() {
  return !!((window as any).cast?.framework && (window as any).chrome?.cast);
}

export async function loadGoogleCastSdk(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (hasGoogleCastSdkLoaded()) return true;
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<boolean>((resolve) => {
    const finish = (ok: boolean) => {
      emitStatus();
      resolve(ok);
    };

    const current = (window as any).__onGCastApiAvailable;
    (window as any).__onGCastApiAvailable = (available: boolean) => {
      try {
        if (typeof current === "function") current(available);
      } catch {}
      finish(!!available);
    };

    const existing = document.querySelector(`script[src="${GOOGLE_CAST_SDK_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      window.setTimeout(() => finish(hasGoogleCastSdkLoaded()), 1600);
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_CAST_SDK_URL;
    script.async = true;
    script.onerror = () => finish(false);
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function ensureGoogleCastReady(): Promise<boolean> {
  const ok = await loadGoogleCastSdk();
  if (!ok) {
    setLastCastError("sdk_unavailable");
    return false;
  }

  const cast = (window as any).cast;
  const chrome = (window as any).chrome;
  if (!cast?.framework || !chrome?.cast) {
    setLastCastError("framework_unavailable");
    return false;
  }

  const appId = getGoogleCastAppId();
  if (!appId) {
    setLastCastError("app_id_missing");
    return false;
  }

  if (initializedAppId === appId) return true;

  try {
    cast.framework.CastContext.getInstance().setOptions({
      receiverApplicationId: appId,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    initializedAppId = appId;
    emitStatus();
    return true;
  } catch (err: any) {
    setLastCastError(String(err?.message || err?.code || "setOptions_failed"));
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
    appId: getGoogleCastAppId(),
    sdkLoaded: hasGoogleCastSdkLoaded(),
    castState,
    session,
    deviceName,
    isCasting: !!session,
    lastError: (window as any).__msLastCastError || "",
  };
}

export async function requestGoogleCastSession() {
  const ready = await ensureGoogleCastReady();
  if (!ready) return { ok: false as const, reason: "sdk_unavailable" as const };

  try {
    const ctx = (window as any).cast.framework.CastContext.getInstance();
    await ctx.requestSession();
    emitStatus();
    return { ok: true as const };
  } catch (err: any) {
    const code = String(err?.code || err?.message || "request_failed");
    setLastCastError(code);
    return { ok: false as const, reason: code };
  }
}

export async function endGoogleCastSession() {
  try {
    const state = getGoogleCastState();
    if (state.session?.endSession) state.session.endSession(true);
  } catch {}
  emitStatus();
}

function sanitizeSnapshot(snapshot: CastSnapshot) {
  return JSON.parse(
    JSON.stringify({
      game: snapshot.game || "unknown",
      title: String(snapshot.title || "Multisports Scoring"),
      status: snapshot.status === "finished" ? "finished" : "live",
      players: Array.isArray(snapshot.players)
        ? snapshot.players.map((p: any) => ({
            id: String(p?.id ?? ""),
            name: String(p?.name ?? "Joueur"),
            score: Number(p?.score ?? 0),
            active: !!p?.active,
          }))
        : [],
      meta: snapshot.meta || {},
      updatedAt: Number(snapshot.updatedAt || Date.now()),
    }),
  );
}

export async function sendCastSnapshot(snapshot: CastSnapshot | null): Promise<boolean> {
  if (!snapshot) return false;

  try {
    const state = getGoogleCastState();
    const raw = state.session?.getSessionObj?.();
    if (!raw?.sendMessage) return false;

    await raw.sendMessage(GOOGLE_CAST_NAMESPACE, sanitizeSnapshot(snapshot));
    return true;
  } catch (err: any) {
    setLastCastError(String(err?.message || err?.code || "send_failed"));
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
