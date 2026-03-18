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

function hasSdkLoaded() {
  return !!((window as any).cast?.framework && (window as any).chrome?.cast);
}

function getCastContext() {
  try {
    return (window as any).cast?.framework?.CastContext?.getInstance?.();
  } catch {
    return null;
  }
}

function sanitizeSnapshot(snapshot: CastSnapshot) {
  try {
    return JSON.parse(
      JSON.stringify({
        game: snapshot.game || "",
        title: snapshot.title || "",
        status: snapshot.status || "live",
        players: Array.isArray(snapshot.players)
          ? snapshot.players.map((p: any) => ({
              id: String(p?.id ?? ""),
              name: String(p?.name ?? "Joueur"),
              score: Number(p?.score ?? 0),
              active: !!p?.active,
            }))
          : [],
        meta:
          snapshot.meta && typeof snapshot.meta === "object"
            ? Object.fromEntries(
                Object.entries(snapshot.meta).map(([k, v]) => [String(k), v == null ? "" : String(v)])
              )
            : {},
        updatedAt: Number((snapshot as any).updatedAt || Date.now()),
      })
    );
  } catch {
    return {
      game: "unknown",
      title: "Multisports Scoring",
      status: "live",
      players: [],
      meta: {},
      updatedAt: Date.now(),
    };
  }
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
  if (typeof window === "undefined") return false;
  if (hasSdkLoaded()) return true;
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<boolean>((resolve) => {
    const finish = (ok: boolean) => {
      emitStatus();
      resolve(ok);
    };

    const existingCb = (window as any).__onGCastApiAvailable;
    (window as any).__onGCastApiAvailable = (available: boolean) => {
      try {
        if (typeof existingCb === "function") existingCb(available);
      } catch {}
      finish(!!available);
    };

    const existing = document.querySelector(
      `script[src="${GOOGLE_CAST_SDK_URL}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      if (hasSdkLoaded()) {
        finish(true);
        return;
      }
      existing.addEventListener("error", () => finish(false), { once: true });
      window.setTimeout(() => finish(hasSdkLoaded()), 2000);
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
  if (!ok) return false;

  const appId = getGoogleCastAppId();
  if (!appId) return false;
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
  } catch (err) {
    console.error("[googleCast] setOptions failed", err);
    return false;
  }
}

export function getGoogleCastState() {
  const ctx = getCastContext();
  const session = ctx?.getCurrentSession?.() || null;
  const castState = ctx?.getCastState?.() || "NO_DEVICES_AVAILABLE";
  const deviceName = session?.getCastDevice?.()?.friendlyName || "";

  return {
    supported: isGoogleCastSupported(),
    configured: isGoogleCastConfigured(),
    appId: getGoogleCastAppId(),
    sdkLoaded: hasSdkLoaded(),
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
    if (!ctx) return { ok: false as const, reason: "context_unavailable" as const };
    await ctx.requestSession();
    emitStatus();
    return { ok: true as const };
  } catch (err: any) {
    const code = String(err?.code || err?.message || "request_failed");
    return { ok: false as const, reason: code };
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
    const state = getGoogleCastState();
    const raw = state.session?.getSessionObj?.();
    if (!raw?.sendMessage) return false;

    const payload = sanitizeSnapshot(snapshot);
    await raw.sendMessage(GOOGLE_CAST_NAMESPACE, payload);
    return true;
  } catch (err) {
    console.warn("[googleCast] send snapshot failed", err);
    return false;
  }
}

export function subscribeGoogleCastStatus(cb: () => void) {
  const refresh = () => cb();
  window.addEventListener("multisports-google-cast-status", refresh);

  const cast = (window as any).cast;
  const ctx = getCastContext();

  try {
    ctx?.addEventListener?.(cast.framework.CastContextEventType.CAST_STATE_CHANGED, refresh);
  } catch {}
  try {
    ctx?.addEventListener?.(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, refresh);
  } catch {}

  return () => {
    window.removeEventListener("multisports-google-cast-status", refresh);
    try {
      ctx?.removeEventListener?.(cast.framework.CastContextEventType.CAST_STATE_CHANGED, refresh);
    } catch {}
    try {
      ctx?.removeEventListener?.(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, refresh);
    } catch {}
  };
}
