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
};

function plugin(): any {
  try { return (window as any)?.Capacitor?.Plugins?.ActivityTracking || null; } catch { return null; }
}

export function isNativeActivityTrackingAvailable() { return !!plugin(); }
export async function nativeTrackingStatus(): Promise<NativeTrackingSnapshot | null> { try { return await plugin()?.getStatus?.(); } catch { return null; } }
export async function requestNativeTrackingPermissions() { const p = plugin(); if (!p) return { granted: false }; return p.requestTrackingPermissions(); }
export async function startNativeTracking(sport: string) { const p = plugin(); if (!p) throw new Error("Native tracking unavailable"); return p.startTracking({ sport }); }
export async function pauseNativeTracking() { return plugin()?.pauseTracking?.(); }
export async function resumeNativeTracking() { return plugin()?.resumeTracking?.(); }
export async function stopNativeTracking(): Promise<NativeTrackingSnapshot | null> { try { return await plugin()?.stopTracking?.(); } catch { return null; } }
export async function getNativeTrack(): Promise<NativeTrackingSnapshot | null> { try { return await plugin()?.getTrack?.(); } catch { return null; } }
export function addNativeTrackingListener(listener: (snapshot: NativeTrackingSnapshot) => void) {
  const p = plugin();
  if (!p?.addListener) return () => {};
  let handle: any = null;
  void Promise.resolve(p.addListener("trackingState", listener)).then((h) => { handle = h; }).catch(() => {});
  return () => { try { handle?.remove?.(); } catch {} };
}
