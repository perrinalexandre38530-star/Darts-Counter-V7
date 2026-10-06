// Runtime performance helpers shared by background services.
// Keep gameplay/navigation on the critical path and move diagnostics/maintenance
// to genuine idle time without removing any feature.

const NAV_QUIET_GLOBAL_KEY = "__mscNavigationQuietUntil";
const NAV_QUIET_DATASET = "mscNavigationQuiet";
let navigationQuietUntil = 0;

export function getRuntimeTabName(): string {
  try {
    const w: any = window as any;
    return String(w?.__appStore?.tab || w?.__mscActiveTab || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export function isGameplayRuntime(tabLike?: unknown): boolean {
  const routeName = String(tabLike ?? getRuntimeTabName() ?? "").trim().toLowerCase();
  if (!routeName) return false;

  if (
    routeName === "x01" ||
    routeName === "cricket" ||
    routeName === "training_clock" ||
    routeName === "x01_device_camera" ||
    routeName === "tournament_match_play"
  ) return true;

  return (
    routeName === "x01_play_v3" ||
    routeName.endsWith("_play") ||
    routeName.endsWith(".play") ||
    routeName.includes("_play_")
  );
}

export function isRuntimeHidden(): boolean {
  try {
    return typeof document !== "undefined" && document.visibilityState === "hidden";
  } catch {
    return false;
  }
}

export function isConstrainedRuntimeDevice(): boolean {
  try {
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    return Boolean(
      /Android|iPhone|iPad|iPod|Mobile/i.test(nav?.userAgent || "") ||
      (Number(nav?.deviceMemory || 8) > 0 && Number(nav?.deviceMemory || 8) <= 4) ||
      (Number(nav?.hardwareConcurrency || 8) > 0 && Number(nav?.hardwareConcurrency || 8) <= 4)
    );
  } catch {
    return false;
  }
}

/**
 * V14 — navigation quiet window.
 *
 * Two RAFs are not enough on a phone: the route may have committed while a lazy
 * chunk, images and the first React effects are still mounting. Background idle
 * jobs used to wake immediately in that tiny window and compete with the user's
 * tap. The quiet window is intentionally short and only delays background work.
 */
export function beginRuntimeNavigationQuietPeriod(durationMs = 1400): number {
  const until = Date.now() + Math.max(250, Math.min(5000, Number(durationMs || 1400)));
  navigationQuietUntil = Math.max(navigationQuietUntil, until);
  try {
    if (typeof window !== "undefined") {
      (window as any)[NAV_QUIET_GLOBAL_KEY] = Math.max(Number((window as any)[NAV_QUIET_GLOBAL_KEY] || 0), until);
      window.setTimeout(() => {
        try {
          const currentUntil = Number((window as any)[NAV_QUIET_GLOBAL_KEY] || 0);
          if (Date.now() >= currentUntil) delete document.documentElement.dataset[NAV_QUIET_DATASET];
        } catch {}
      }, Math.max(300, until - Date.now() + 40));
    }
    if (typeof document !== "undefined") document.documentElement.dataset[NAV_QUIET_DATASET] = "1";
  } catch {}
  return until;
}

export function isRuntimeNavigationBusy(): boolean {
  try {
    const globalUntil = typeof window !== "undefined" ? Number((window as any)[NAV_QUIET_GLOBAL_KEY] || 0) : 0;
    const until = Math.max(navigationQuietUntil, globalUntil);
    const datasetBusy = typeof document !== "undefined" && document.documentElement.dataset.mscNavigating === "1";
    const busy = datasetBusy || Date.now() < until;
    if (!busy && typeof document !== "undefined") delete document.documentElement.dataset[NAV_QUIET_DATASET];
    return busy;
  } catch {
    return Date.now() < navigationQuietUntil;
  }
}

export function isRuntimePerformanceShieldActiveFast(): boolean {
  try {
    return typeof document !== "undefined" && document.documentElement.dataset.mscPerfShield === "1";
  } catch {
    return false;
  }
}

/** Background work should not start while the user is navigating on a phone. */
export function shouldPauseBackgroundRuntimeWork(): boolean {
  return isConstrainedRuntimeDevice() && !isRuntimeHidden() && isRuntimeNavigationBusy();
}

export function shouldDeferHeavyRuntimeWork(): boolean {
  return isConstrainedRuntimeDevice() && !isRuntimeHidden();
}

export function scheduleRuntimeIdle(
  task: () => void,
  options: { timeoutMs?: number; fallbackDelayMs?: number } = {},
): () => void {
  if (typeof window === "undefined") {
    task();
    return () => undefined;
  }

  const timeoutMs = Math.max(250, Number(options.timeoutMs || 3000));
  const fallbackDelayMs = Math.max(0, Number(options.fallbackDelayMs || 120));
  let cancelled = false;
  let idleId: number | null = null;
  let timerId: number | null = null;
  let navigationDeferrals = 0;

  const clearPending = () => {
    if (idleId != null) {
      try { (window as any).cancelIdleCallback?.(idleId); } catch {}
      idleId = null;
    }
    if (timerId != null) {
      try { window.clearTimeout(timerId); } catch {}
      timerId = null;
    }
  };

  const schedule = (preferTimer = false) => {
    if (cancelled) return;
    const ric = (window as any).requestIdleCallback;
    if (!preferTimer && typeof ric === "function") {
      idleId = ric(run, { timeout: timeoutMs }) as number;
    } else {
      timerId = window.setTimeout(run, Math.max(80, fallbackDelayMs));
    }
  };

  const run = () => {
    if (cancelled) return;
    idleId = null;
    timerId = null;

    // V14: never let an idle maintenance job steal the first paint/navigation.
    // Bounded deferral prevents starvation if a buggy route keeps the flag set.
    if (shouldPauseBackgroundRuntimeWork() && navigationDeferrals < 16) {
      navigationDeferrals += 1;
      schedule(true);
      return;
    }

    task();
  };

  schedule(false);

  return () => {
    cancelled = true;
    clearPending();
  };
}
