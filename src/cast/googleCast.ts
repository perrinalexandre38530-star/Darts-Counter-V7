
import type { CastSnapshot } from "./castTypes";

export const DEFAULT_GOOGLE_CAST_APP_ID = "3534BC6A";
export const GOOGLE_CAST_NAMESPACE = "urn:x-cast:com.multisports.scoreboard";
export const GOOGLE_CAST_SDK_URL =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
const GOOGLE_CAST_DIAG_KEY = "multisports_google_cast_diag";

let sdkPromise: Promise<boolean> | null = null;
let initializedAppId: string | null = null;
let lastPingAt = 0;

function emitStatus() {
  try {
    window.dispatchEvent(new CustomEvent("multisports-google-cast-status"));
  } catch {}
}

function pushDiag(entry: string, extra?: any) {
  try {
    const now = new Date().toISOString();
    const prev = JSON.parse(window.localStorage.getItem(GOOGLE_CAST_DIAG_KEY) || "[]");
    const next = Array.isArray(prev) ? prev : [];
    next.push({ now, entry, extra: extra == null ? null : extra });
    while (next.length > 200) next.shift();
    window.localStorage.setItem(GOOGLE_CAST_DIAG_KEY, JSON.stringify(next));
  } catch {}
  emitStatus();
}

function hasSdkLoaded() {
  return !!((window as any).cast?.framework && (window as any).chrome?.cast);
}

function getCastContext() {
  try {
    return (window as any).cast?.framework?.CastContext?.getInstance?.() || null;
  } catch {
    return null;
  }
}

function safeString(value: any) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeSnapshot(snapshot: CastSnapshot) {
  try {
    return JSON.parse(
      JSON.stringify({
        game: snapshot?.game || "",
        title: snapshot?.title || "",
        status: snapshot?.status || "live",
        players: Array.isArray(snapshot?.players)
          ? snapshot.players.map((p: any) => ({
              id: String(p?.id ?? ""),
              name: String(p?.name ?? "Joueur"),
              score: Number(p?.score ?? 0),
              active: !!p?.active,
              avatarDataUrl: typeof p?.avatarDataUrl === "string" ? p.avatarDataUrl : "",
              avatarUrl: typeof p?.avatarUrl === "string" ? p.avatarUrl : "",
              avatar: typeof p?.avatar === "string" ? p.avatar : "",
              stats: p?.stats && typeof p.stats === "object" ? p.stats : {},
            }))
          : [],
        meta:
          snapshot?.meta && typeof snapshot.meta === "object"
            ? Object.fromEntries(
                Object.entries(snapshot.meta).map(([k, v]) => [String(k), safeString(v)])
              )
            : {},
        updatedAt: Number((snapshot as any)?.updatedAt || Date.now()),
      })
    );
  } catch (err) {
    pushDiag("sanitize_snapshot_failed", String(err));
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

function getRawSession() {
  try {
    return getCastContext()?.getCurrentSession?.()?.getSessionObj?.() || null;
  } catch {
    return null;
  }
}

async function sendMessageInternal(message: any, diagKeyOk: string, diagKeyFail: string) {
  try {
    const state = getGoogleCastState();
    const raw = getRawSession();
    if (!raw?.sendMessage) {
      pushDiag(`${diagKeyFail}_no_session`, {
        castState: state.castState,
        isCasting: state.isCasting,
        device: state.deviceName,
      });
      return false;
    }
    await raw.sendMessage(GOOGLE_CAST_NAMESPACE, message);
    pushDiag(diagKeyOk, {
      type: message?.type || "",
      sessionId: state.sessionId,
      device: state.deviceName,
    });
    return true;
  } catch (err) {
    pushDiag(diagKeyFail, String(err));
    return false;
  }
}

export function getGoogleCastAppId(): string {
  return DEFAULT_GOOGLE_CAST_APP_ID;
}

export function setGoogleCastAppId(_appId: string) {
  pushDiag("set_app_id_ignored", { forced: DEFAULT_GOOGLE_CAST_APP_ID });
}

export function resetGoogleCastAppId() {
  pushDiag("reset_app_id", { forced: DEFAULT_GOOGLE_CAST_APP_ID });
}

export function getGoogleCastDiagLog() {
  try {
    const data = JSON.parse(window.localStorage.getItem(GOOGLE_CAST_DIAG_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function clearGoogleCastDiagLog() {
  try {
    window.localStorage.removeItem(GOOGLE_CAST_DIAG_KEY);
  } catch {}
  emitStatus();
}

export function appendGoogleCastDiag(entry: string, extra?: any) {
  pushDiag(entry, extra);
}

export function isGoogleCastConfigured() {
  return true;
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

  pushDiag("sdk_load_begin");

  sdkPromise = new Promise<boolean>((resolve) => {
    const done = (ok: boolean, why?: string) => {
      pushDiag(ok ? "sdk_load_ok" : "sdk_load_failed", why || null);
      resolve(ok);
    };

    const current = (window as any).__onGCastApiAvailable;
    (window as any).__onGCastApiAvailable = (available: boolean) => {
      try {
        if (typeof current === "function") current(available);
      } catch {}
      done(!!available, "callback");
    };

    const existing = document.querySelector(
      `script[src="${GOOGLE_CAST_SDK_URL}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      if (hasSdkLoaded()) {
        done(true, "already_present");
        return;
      }
      existing.addEventListener("error", () => done(false, "existing_script_error"), {
        once: true,
      });
      window.setTimeout(() => done(hasSdkLoaded(), "existing_script_timeout"), 2500);
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_CAST_SDK_URL;
    script.async = true;
    script.onerror = () => done(false, "script_error");
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function ensureGoogleCastReady(): Promise<boolean> {
  const ok = await loadGoogleCastSdk();
  if (!ok) return false;

  const appId = DEFAULT_GOOGLE_CAST_APP_ID;
  if (initializedAppId === appId) return true;

  const cast = (window as any).cast;
  const chrome = (window as any).chrome;
  if (!cast?.framework || !chrome?.cast) {
    pushDiag("ensure_ready_sdk_incomplete");
    return false;
  }

  try {
    cast.framework.CastContext.getInstance().setOptions({
      receiverApplicationId: DEFAULT_GOOGLE_CAST_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      resumeSavedSession: true,
    });
    initializedAppId = appId;
    pushDiag("ensure_ready_ok", { appId: DEFAULT_GOOGLE_CAST_APP_ID });
    emitStatus();
    return true;
  } catch (err) {
    pushDiag("ensure_ready_failed", String(err));
    return false;
  }
}

export function getGoogleCastState() {
  const ctx = getCastContext();
  const session = ctx?.getCurrentSession?.() || null;
  const castState = ctx?.getCastState?.() || "NO_DEVICES_AVAILABLE";
  const deviceName = session?.getCastDevice?.()?.friendlyName || "";
  let sessionId = "";
  try {
    sessionId = session?.getSessionObj?.()?.sessionId || "";
  } catch {}

  return {
    supported: isGoogleCastSupported(),
    configured: true,
    appId: DEFAULT_GOOGLE_CAST_APP_ID,
    sdkLoaded: hasSdkLoaded(),
    castState,
    session,
    sessionId,
    deviceName,
    isCasting: !!session,
  };
}

export async function requestGoogleCastSession() {
  const ready = await ensureGoogleCastReady();
  if (!ready) {
    pushDiag("request_session_sdk_unavailable");
    return { ok: false as const, reason: "sdk_unavailable" as const };
  }

  try {
    const ctx = getCastContext();
    if (!ctx) {
      pushDiag("request_session_no_context");
      return { ok: false as const, reason: "context_unavailable" as const };
    }
    await ctx.requestSession();
    const next = getGoogleCastState();
    pushDiag("request_session_ok", {
      device: next.deviceName,
      sessionId: next.sessionId,
      appId: DEFAULT_GOOGLE_CAST_APP_ID,
    });
    emitStatus();
    await pingGoogleCastReceiver(true);
    return { ok: true as const };
  } catch (err: any) {
    const code = String(err?.code || err?.message || "request_failed");
    pushDiag("request_session_failed", code);
    return { ok: false as const, reason: code };
  }
}

export async function endGoogleCastSession() {
  try {
    const state = getGoogleCastState();
    if (state.session?.endSession) state.session.endSession(true);
    pushDiag("session_end");
    emitStatus();
  } catch (err) {
    pushDiag("session_end_failed", String(err));
  }
}

export async function pingGoogleCastReceiver(force = false) {
  if (!force && Date.now() - lastPingAt < 1500) {
    pushDiag("ping_skipped_rate_limit");
    return true;
  }
  lastPingAt = Date.now();
  return sendMessageInternal(
    { type: "PING", at: Date.now(), from: "sender", build: DEFAULT_GOOGLE_CAST_APP_ID },
    "ping_ok",
    "ping_failed"
  );
}

export async function sendCastSnapshot(snapshot: CastSnapshot | null): Promise<boolean> {
  if (!snapshot) return false;
  const payload = sanitizeSnapshot(snapshot);
  return sendMessageInternal(
    { type: "SNAPSHOT", payload },
    "send_snapshot_ok",
    "send_snapshot_failed"
  );
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
    ctx?.addEventListener?.(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (e: any) => {
      pushDiag("session_state_changed", {
        sessionState: e?.sessionState || null,
        castState: getGoogleCastState().castState,
      });
      refresh();
      try {
        const ss = (window as any).cast?.framework?.SessionState;
        if (e?.sessionState === ss?.SESSION_STARTED || e?.sessionState === ss?.SESSION_RESUMED) {
          void pingGoogleCastReceiver(true);
        }
      } catch {}
    });
  } catch {}

  return () => {
    window.removeEventListener("multisports-google-cast-status", refresh);
  };
}
