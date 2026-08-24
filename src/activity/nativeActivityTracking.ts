import { registerPlugin } from "@capacitor/core";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import type { GeoPoint } from "./activityTypes";

export type NativeTrackingSnapshot = {
  available?: boolean;
  running?: boolean;
  paused?: boolean;
  sport?: string;
  startedAt?: number;
  elapsedMs?: number;
  pointCount?: number;
  route?: GeoPoint[];
  lastPoint?: GeoPoint;
  locationPermission?: string;
  notificationPermission?: string;
  locationServicesEnabled?: boolean;
  platform?: string;
};

type ActivityTrackingPlugin = {
  getStatus?: () => Promise<NativeTrackingSnapshot>;
  requestTrackingPermissions?: () => Promise<{ granted?: boolean; location?: boolean; notifications?: boolean; locationServicesEnabled?: boolean }>;
  startTracking?: (options: { sport: string }) => Promise<{ started?: boolean; sport?: string }>;
  pauseTracking?: () => Promise<NativeTrackingSnapshot>;
  resumeTracking?: () => Promise<NativeTrackingSnapshot>;
  stopTracking?: () => Promise<NativeTrackingSnapshot>;
  getTrack?: () => Promise<NativeTrackingSnapshot>;
  openLocationSettings?: () => Promise<{ opened?: boolean }>;
  addListener?: (eventName: "trackingState", listener: (snapshot: NativeTrackingSnapshot) => void) => Promise<{ remove?: () => Promise<void> | void }> | { remove?: () => Promise<void> | void };
};

let pluginCache: ActivityTrackingPlugin | null = null;

/**
 * Capacitor 8 no longer guarantees that custom native plugins are exposed through
 * window.Capacitor.Plugins. Register them explicitly, just like PlayBilling and
 * InlineAdMob do elsewhere in the app. Falling back to Plugins keeps older builds
 * compatible while avoiding the WebView geolocation path on Android.
 */
function plugin(): ActivityTrackingPlugin | null {
  if (pluginCache) return pluginCache;
  if (typeof window === "undefined" || !isCapacitorNativeRuntime()) return null;
  try {
    // Capacitor 8 custom plugins must be registered through @capacitor/core.
    // Relying on window.Capacitor.registerPlugin is not guaranteed and can
    // silently fall back to WebView geolocation, which does not drive our
    // native foreground tracking permission flow.
    pluginCache = registerPlugin<ActivityTrackingPlugin>("ActivityTracking");
    return pluginCache;
  } catch {
    try {
      const cap = (window as any).Capacitor;
      pluginCache = (cap?.Plugins?.ActivityTracking || null) as ActivityTrackingPlugin | null;
      return pluginCache;
    } catch {
      return null;
    }
  }
}

export function isNativeActivityTrackingAvailable() { return !!plugin(); }
export async function nativeTrackingStatus(): Promise<NativeTrackingSnapshot | null> { try { return await plugin()?.getStatus?.() || null; } catch { return null; } }
export async function requestNativeTrackingPermissions() {
  const p = plugin();
  if (!p?.requestTrackingPermissions) return { granted: false, location: false, notifications: false };
  return p.requestTrackingPermissions();
}
export async function startNativeTracking(sport: string) {
  const p = plugin();
  if (!p?.startTracking) throw new Error("Native tracking unavailable");
  return p.startTracking({ sport });
}
export async function pauseNativeTracking() { return plugin()?.pauseTracking?.(); }
export async function resumeNativeTracking() { return plugin()?.resumeTracking?.(); }
export async function stopNativeTracking(): Promise<NativeTrackingSnapshot | null> { try { return await plugin()?.stopTracking?.() || null; } catch { return null; } }
export async function getNativeTrack(): Promise<NativeTrackingSnapshot | null> { try { return await plugin()?.getTrack?.() || null; } catch { return null; } }
export async function openNativeLocationSettings() { try { return await plugin()?.openLocationSettings?.() || { opened: false }; } catch { return { opened: false }; } }
export function addNativeTrackingListener(listener: (snapshot: NativeTrackingSnapshot) => void) {
  const p = plugin();
  if (!p?.addListener) return () => {};
  let handle: any = null;
  let disposed = false;
  void Promise.resolve(p.addListener("trackingState", listener)).then((h) => {
    if (disposed) {
      try { void h?.remove?.(); } catch {}
      return;
    }
    handle = h;
  }).catch(() => {});
  return () => {
    disposed = true;
    try { void handle?.remove?.(); } catch {}
  };
}

export async function waitForNativeGpsFix(timeoutMs = 15000): Promise<GeoPoint | null> {
  const deadline = Date.now() + Math.max(1000, timeoutMs);
  while (Date.now() < deadline) {
    const snapshot = await getNativeTrack();
    const point = snapshot?.lastPoint || (snapshot?.route?.length ? snapshot.route[snapshot.route.length - 1] : undefined);
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lon)) return point;
    await new Promise((resolve) => window.setTimeout(resolve, 450));
  }
  return null;
}
