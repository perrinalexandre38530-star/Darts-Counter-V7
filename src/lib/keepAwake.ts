import { registerPlugin } from "@capacitor/core";
import { isCapacitorNativeRuntime } from "./nativePlatform";

const STORAGE_KEY = "dc_keep_screen_awake_v1";
const CHANGE_EVENT = "msc:keep-screen-awake-change";

interface NativeKeepAwakePlugin {
  setEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  getStatus(): Promise<{ enabled: boolean }>;
}

const NativeKeepAwake = registerPlugin<NativeKeepAwakePlugin>("KeepAwake");

let wakeLockSentinel: any = null;
let runtimeInstalled = false;

export function getKeepScreenAwakePreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // DEFAULT = ON on first launch.
    if (raw == null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

async function releaseWebWakeLock() {
  const current = wakeLockSentinel;
  wakeLockSentinel = null;
  if (!current) return;
  try {
    if (!current.released && typeof current.release === "function") await current.release();
  } catch {}
}

async function acquireWebWakeLock(): Promise<boolean> {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  if (document.visibilityState !== "visible") return false;
  const wakeLockApi: any = (navigator as any).wakeLock;
  if (!wakeLockApi || typeof wakeLockApi.request !== "function") return false;

  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) return true;
    const sentinel = await wakeLockApi.request("screen");
    wakeLockSentinel = sentinel;
    try {
      sentinel.addEventListener?.("release", () => {
        if (wakeLockSentinel === sentinel) wakeLockSentinel = null;
      });
    } catch {}
    return true;
  } catch {
    return false;
  }
}

export async function applyKeepScreenAwakePreference(): Promise<boolean> {
  const enabled = getKeepScreenAwakePreference();

  if (isCapacitorNativeRuntime()) {
    try {
      await NativeKeepAwake.setEnabled({ enabled });
      return enabled;
    } catch {
      // If the native bridge is unavailable in an old Android build, keep the
      // browser wake-lock fallback below instead of breaking startup.
    }
  }

  if (enabled) await acquireWebWakeLock();
  else await releaseWebWakeLock();
  return enabled;
}

export async function setKeepScreenAwakePreference(enabled: boolean): Promise<boolean> {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0"); } catch {}
  }
  await applyKeepScreenAwakePreference();
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { enabled } })); } catch {}
  }
  return enabled;
}

export function subscribeKeepScreenAwakePreference(listener: (enabled: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener(getKeepScreenAwakePreference());
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
    window.removeEventListener("storage", handler);
  };
}

export function initKeepAwakeRuntime() {
  if (runtimeInstalled || typeof window === "undefined" || typeof document === "undefined") return;
  runtimeInstalled = true;

  void applyKeepScreenAwakePreference();

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void applyKeepScreenAwakePreference();
    } else if (!isCapacitorNativeRuntime()) {
      // Chromium normally releases automatically, but releasing explicitly
      // avoids keeping stale sentinels around in browsers with partial support.
      void releaseWebWakeLock();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onVisibility);
}
