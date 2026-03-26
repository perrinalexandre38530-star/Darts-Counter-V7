import type { CastSnapshot } from "./castTypes";

export const DEFAULT_GOOGLE_CAST_APP_ID = "3534BC6A";
export const GOOGLE_CAST_NAMESPACE = "urn:x-cast:com.multisports.scoreboard";
export const GOOGLE_CAST_SDK_URL =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
const GOOGLE_CAST_DIAG_KEY = "multisports_google_cast_diag";

let sdkPromise: Promise<boolean> | null = null;
let initializedAppId: string | null = null;
let lastPingAt = 0;
let lastSnapshotPayload: any = null;
let lastSnapshotAt = 0;
let lastSnapshotSignature = "";
const avatarThumbCache = new Map<string, string>();
const avatarThumbPromiseCache = new Map<string, Promise<string>>();
const lastSentAvatarByPlayer = new Map<string, string>();

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

function sanitizeNumberLike(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager" as any;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("avatar_image_load_failed"));
      img.src = src;
    } catch (err) {
      reject(err);
    }
  });
}

async function buildTinyAvatarDataUrl(src: string): Promise<string> {
  const cached = avatarThumbCache.get(src);
  if (cached !== undefined) return cached;
  const pending = avatarThumbPromiseCache.get(src);
  if (pending) return pending;

  const job = (async () => {
    try {
      if (typeof document === "undefined") return "";
      const img = await loadImageElement(src);
      const size = 96;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      const sw = Number((img as any).naturalWidth || (img as any).width || size);
      const sh = Number((img as any).naturalHeight || (img as any).height || size);
      const side = Math.max(1, Math.min(sw, sh));
      const sx = Math.max(0, Math.floor((sw - side) / 2));
      const sy = Math.max(0, Math.floor((sh - side) / 2));
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      let out = "";
      try {
        out = canvas.toDataURL("image/webp", 0.72);
      } catch {}
      for (const q of [0.78, 0.68, 0.58]) {
        if (!out || out.length > 70_000) out = canvas.toDataURL("image/jpeg", q);
        if (out.length <= 65_000) break;
      }
      if (out.length > 80_000) {
        pushDiag("sanitize_avatar_thumb_still_large", { size: out.length });
        out = "";
      }
      avatarThumbCache.set(src, out);
      return out;
    } catch (err) {
      pushDiag("sanitize_avatar_thumb_failed", safeString(err));
      avatarThumbCache.set(src, "");
      return "";
    } finally {
      avatarThumbPromiseCache.delete(src);
    }
  })();

  avatarThumbPromiseCache.set(src, job);
  return job;
}

async function sanitizeAvatarFields(player: any) {
  const sources = [
    player?.avatarDataUrl,
    player?.avatarUrl,
    player?.avatar,
    player?.photoUrl,
    player?.imageUrl,
    player?.photoDataUrl,
    player?.avatarPath,
    player?.avatar_path,
    player?.profile?.avatarDataUrl,
    player?.profile?.avatarUrl,
    player?.profile?.avatar,
    player?.profile?.photoUrl,
    player?.profile?.photoDataUrl,
    player?.meta?.avatarDataUrl,
    player?.meta?.avatarUrl,
    player?.meta?.avatar,
    player?.meta?.photoUrl,
    player?.user?.avatarDataUrl,
    player?.user?.avatarUrl,
    player?.user?.avatar,
    player?.user?.photoUrl,
  ];

  const raw = sources.find((value) => typeof value === "string" && value.trim()) || "";
  const src = String(raw || "").trim();
  if (!src) return { avatarDataUrl: "", avatarUrl: "" };

  if (/^(https?:|blob:|\/)/i.test(src)) {
    return { avatarDataUrl: "", avatarUrl: src };
  }

  if (/^data:image\//i.test(src)) {
    if (src.length <= 28_000) return { avatarDataUrl: src, avatarUrl: "" };
    const tiny = await buildTinyAvatarDataUrl(src);
    if (tiny) return { avatarDataUrl: tiny, avatarUrl: "" };
    pushDiag("sanitize_avatar_dropped_too_large", { size: src.length });
    return { avatarDataUrl: "", avatarUrl: "" };
  }

  return { avatarDataUrl: "", avatarUrl: "" };
}

function sanitizePlayerStats(player: any) {
  const stats = player?.stats && typeof player.stats === "object" ? player.stats : {};
  return {
    avg3d: safeString(stats?.avg3d ?? stats?.avg3 ?? stats?.avg ?? "—"),
    bestVisit: safeString(stats?.bestVisit ?? stats?.best ?? "—"),
    hits: sanitizeNumberLike(stats?.hits ?? stats?.hitCount ?? 0),
    miss: sanitizeNumberLike(stats?.miss ?? stats?.misses ?? 0),
    simple: sanitizeNumberLike(stats?.simple ?? stats?.singles ?? 0),
    double: sanitizeNumberLike(stats?.double ?? stats?.doubles ?? 0),
    triple: sanitizeNumberLike(stats?.triple ?? stats?.triples ?? 0),
    bull: sanitizeNumberLike(stats?.bull ?? stats?.bulls ?? 0),
    dbull: sanitizeNumberLike(stats?.dbull ?? stats?.doubleBull ?? stats?.dbulls ?? 0),
    bust: sanitizeNumberLike(stats?.bust ?? stats?.busts ?? 0),
    totalThrows: sanitizeNumberLike(stats?.totalThrows ?? stats?.throws ?? stats?.attempts ?? 0),
  };
}

async function sanitizeSnapshot(snapshot: CastSnapshot) {
  try {
    const players = Array.isArray(snapshot?.players)
      ? await Promise.all(
          snapshot.players.map(async (p: any) => {
            const avatar = await sanitizeAvatarFields(p);
            const pid = String(p?.id ?? "");
            const avatarSig = avatar.avatarUrl || avatar.avatarDataUrl || "";
            const lastSig = pid ? (lastSentAvatarByPlayer.get(pid) || "") : "";
            const shouldSendAvatar = !!avatarSig && avatarSig !== lastSig;
            if (pid && avatarSig) lastSentAvatarByPlayer.set(pid, avatarSig);
            return {
              id: pid,
              name: String(p?.name ?? "Joueur"),
              score: sanitizeNumberLike(p?.score ?? 0),
              active: !!p?.active,
              avatarDataUrl: shouldSendAvatar ? avatar.avatarDataUrl : "",
              avatarUrl: shouldSendAvatar ? avatar.avatarUrl : "",
              stats: sanitizePlayerStats(p),
            };
          })
        )
      : [];

    return JSON.parse(
      JSON.stringify({
        screen: (snapshot as any)?.screen || "",
        currentPlayer: safeString((snapshot as any)?.currentPlayer || ""),
        game: snapshot?.game || "unknown",
        title: snapshot?.title || "",
        status: snapshot?.status || "live",
        players,
        meta:
          snapshot?.meta && typeof snapshot.meta === "object"
            ? Object.fromEntries(
                Object.entries(snapshot.meta).map(([k, v]) => [String(k), typeof v === "number" ? v : safeString(v)])
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

function getSessionWrapper() {
  try {
    return getCastContext()?.getCurrentSession?.() || null;
  } catch {
    return null;
  }
}

function getRawSession() {
  try {
    return getSessionWrapper()?.getSessionObj?.() || null;
  } catch {
    return null;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type SendTarget = {
  kind: "wrapper" | "raw";
  send: (payload: any) => Promise<void>;
};

function makeWrapperTarget(wrapper: any): SendTarget | null {
  if (!wrapper?.sendMessage) return null;
  return {
    kind: "wrapper",
    send: async (payload: any) => {
      await wrapper.sendMessage(GOOGLE_CAST_NAMESPACE, payload);
    },
  };
}

function makeRawTarget(raw: any): SendTarget | null {
  if (!raw?.sendMessage) return null;
  return {
    kind: "raw",
    send: (payload: any) =>
      new Promise<void>((resolve, reject) => {
        try {
          raw.sendMessage(
            GOOGLE_CAST_NAMESPACE,
            payload,
            () => resolve(),
            (err: any) => reject(err || new Error("raw_send_failed"))
          );
        } catch (err) {
          reject(err);
        }
      }),
  };
}

function resolveSendTargets(): SendTarget[] {
  const targets: SendTarget[] = [];
  const wrapper = makeWrapperTarget(getSessionWrapper());
  const raw = makeRawTarget(getRawSession());
  if (wrapper) targets.push(wrapper);
  if (raw) targets.push(raw);
  return targets;
}

async function sendWithTargets(targets: SendTarget[], message: any, diagKeyOk: string) {
  let lastErr: any = null;
  for (const target of targets) {
    try {
      await target.send(message);
      const state = getGoogleCastState();
      pushDiag(diagKeyOk, {
        via: target.kind,
        type: message?.type || "",
        sessionId: state.sessionId,
        device: state.deviceName,
      });
      return true;
    } catch (err) {
      lastErr = err;
      pushDiag(`${diagKeyOk}_attempt_failed`, { via: target.kind, err: safeString(err) });
    }
  }
  if (lastErr) throw lastErr;
  return false;
}

async function sendMessageInternal(message: any, diagKeyOk: string, diagKeyFail: string) {
  try {
    const ready = await ensureGoogleCastReady();
    if (!ready) {
      pushDiag(`${diagKeyFail}_sdk_not_ready`);
      return false;
    }

    for (const delay of [0, 120, 320, 800]) {
      if (delay > 0) await wait(delay);
      const targets = resolveSendTargets();
      if (!targets.length) continue;
      const sent = await sendWithTargets(targets, message, diagKeyOk);
      if (sent) return true;
    }

    const state = getGoogleCastState();
    pushDiag(`${diagKeyFail}_no_session`, {
      castState: state.castState,
      isCasting: state.isCasting,
      device: state.deviceName,
      hasWrapper: !!getSessionWrapper(),
      hasRaw: !!getRawSession(),
    });
    return false;
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
    let settled = false;
    const done = (ok: boolean, why?: string) => {
      if (settled) return;
      settled = true;
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
    window.setTimeout(() => done(hasSdkLoaded(), "script_timeout"), 3500);
  });

  return sdkPromise;
}

export async function ensureGoogleCastReady(): Promise<boolean> {
  const ok = await loadGoogleCastSdk();
  if (!ok) return false;

  const appId = DEFAULT_GOOGLE_CAST_APP_ID;
  const cast = (window as any).cast;
  const chrome = (window as any).chrome;
  if (!cast?.framework || !chrome?.cast) {
    pushDiag("ensure_ready_sdk_incomplete");
    return false;
  }

  try {
    if (initializedAppId !== appId) {
      cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: DEFAULT_GOOGLE_CAST_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        resumeSavedSession: true,
      });
      initializedAppId = appId;
      pushDiag("ensure_ready_ok", { appId: DEFAULT_GOOGLE_CAST_APP_ID });
      emitStatus();
      await wait(80);
    }
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
    await resendLastSnapshot("request_session");
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

async function resendLastSnapshot(reason: string) {
  if (!lastSnapshotPayload) {
    pushDiag("resend_snapshot_skipped_no_payload", { reason });
    return false;
  }
  pushDiag("resend_snapshot_begin", {
    reason,
    ageMs: Math.max(0, Date.now() - lastSnapshotAt),
    players: Array.isArray(lastSnapshotPayload?.players) ? lastSnapshotPayload.players.length : 0,
    game: safeString(lastSnapshotPayload?.game || ""),
  });
  return sendMessageInternal(
    { type: "SNAPSHOT", payload: lastSnapshotPayload },
    "resend_snapshot_ok",
    "resend_snapshot_failed"
  );
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
  const payload = await sanitizeSnapshot(snapshot);
  const signature = JSON.stringify({
    game: payload?.game || "",
    title: payload?.title || "",
    status: payload?.status || "",
    currentPlayer: payload?.currentPlayer || "",
    meta: payload?.meta || {},
    players: Array.isArray(payload?.players)
      ? payload.players.map((p: any) => ({
          id: p?.id || "",
          score: p?.score ?? 0,
          active: !!p?.active,
          stats: p?.stats || {},
        }))
      : [],
  });
  lastSnapshotPayload = payload;
  lastSnapshotAt = Date.now();
  if (signature === lastSnapshotSignature) return true;
  lastSnapshotSignature = signature;
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
          void resendLastSnapshot("session_state_changed");
        }
      } catch {}
    });
  } catch {}

  return () => {
    window.removeEventListener("multisports-google-cast-status", refresh);
  };
}
