import type { GeoPoint } from "./activityTypes";

export type WebGpsErrorCode = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";

export class WebGpsError extends Error {
  code: WebGpsErrorCode;
  constructor(code: WebGpsErrorCode, message: string) {
    super(message);
    this.name = "WebGpsError";
    this.code = code;
  }
}

export type WebGpsEnvironment = {
  supported: boolean;
  secure: boolean;
  permission: PermissionState | "unknown" | "unsupported";
};

function isLocalHost() {
  if (typeof window === "undefined") return false;
  const host = String(window.location?.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

export function isWebGpsSecureContext() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true || window.location?.protocol === "https:" || isLocalHost();
}

export async function getWebGpsEnvironment(): Promise<WebGpsEnvironment> {
  const supported = typeof navigator !== "undefined" && !!navigator.geolocation;
  const secure = isWebGpsSecureContext();
  let permission: WebGpsEnvironment["permission"] = "unsupported";
  if (typeof navigator !== "undefined" && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      permission = status.state;
    } catch {
      permission = "unknown";
    }
  }
  return { supported, secure, permission };
}

export function webGpsErrorCode(error: unknown): WebGpsErrorCode {
  if (error instanceof WebGpsError) return error.code;
  const raw = Number((error as any)?.code || 0);
  if (raw === 1) return "denied";
  if (raw === 2) return "unavailable";
  if (raw === 3) return "timeout";
  return "unavailable";
}

function pointFromPosition(position: GeolocationPosition): GeoPoint {
  const coords = position.coords;
  return {
    lat: Number(coords.latitude),
    lon: Number(coords.longitude),
    timestamp: Number(position.timestamp || Date.now()),
    accuracy: Number.isFinite(coords.accuracy) ? Number(coords.accuracy) : undefined,
    altitude: Number.isFinite(coords.altitude) ? Number(coords.altitude) : undefined,
    speed: Number.isFinite(coords.speed) ? Number(coords.speed) : undefined,
  };
}

/**
 * Acquire a fresh, high-accuracy web/PWA fix. A temporary watch is used instead
 * of one getCurrentPosition call because Android browsers often return a coarse
 * network fix first and a precise GNSS fix a few seconds later.
 */
export async function acquireWebGpsFix(options: {
  timeoutMs?: number;
  desiredAccuracyM?: number;
  maxAcceptableAccuracyM?: number;
  onFix?: (point: GeoPoint) => void;
} = {}): Promise<GeoPoint> {
  const timeoutMs = Math.max(4000, Number(options.timeoutMs || 20000));
  const desiredAccuracyM = Math.max(5, Number(options.desiredAccuracyM || 25));
  const maxAcceptableAccuracyM = Math.max(desiredAccuracyM, Number(options.maxAcceptableAccuracyM || 80));
  const environment = await getWebGpsEnvironment();
  if (!environment.supported) throw new WebGpsError("unsupported", "Geolocation API unavailable");
  if (!environment.secure) throw new WebGpsError("insecure", "Geolocation requires HTTPS");
  if (environment.permission === "denied") throw new WebGpsError("denied", "Geolocation permission denied");

  return new Promise<GeoPoint>((resolve, reject) => {
    let settled = false;
    let best: GeoPoint | null = null;
    let watchId: number | null = null;
    let lastError: unknown = null;

    const cleanup = () => {
      window.clearTimeout(timer);
      if (watchId != null) {
        try { navigator.geolocation.clearWatch(watchId); } catch {}
      }
    };
    const finish = (point: GeoPoint) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(point);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      const code = webGpsErrorCode(error);
      reject(error instanceof WebGpsError ? error : new WebGpsError(code, String((error as any)?.message || code)));
    };

    const timer = window.setTimeout(() => {
      const accuracy = Number(best?.accuracy ?? Infinity);
      if (best && accuracy <= maxAcceptableAccuracyM) finish(best);
      else fail(lastError || new WebGpsError("timeout", "GPS fix timeout"));
    }, timeoutMs);

    try {
      watchId = navigator.geolocation.watchPosition((position) => {
        const point = pointFromPosition(position);
        if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return;
        options.onFix?.(point);
        const accuracy = Number(point.accuracy ?? Infinity);
        const bestAccuracy = Number(best?.accuracy ?? Infinity);
        if (!best || accuracy < bestAccuracy || Number(point.timestamp || 0) > Number(best.timestamp || 0) + 5000) best = point;
        if (accuracy <= desiredAccuracyM) finish(point);
      }, (error) => {
        lastError = error;
        if (error.code === error.PERMISSION_DENIED) fail(error);
        // POSITION_UNAVAILABLE / TIMEOUT are transient on mobile: keep waiting
        // until our own deadline so a GNSS fix can still arrive.
      }, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: Math.min(timeoutMs, 15000),
      });
    } catch (error) {
      fail(error);
    }
  });
}

export function geoPointFromWebPosition(position: GeolocationPosition): GeoPoint {
  return pointFromPosition(position);
}

export const WEB_GPS_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
};
