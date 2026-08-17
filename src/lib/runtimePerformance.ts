// Runtime performance helpers shared by background services.
// Keep gameplay/navigation on the critical path and move diagnostics/maintenance
// to genuine idle time without removing any feature.

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

  const run = () => {
    if (cancelled) return;
    task();
  };

  const ric = (window as any).requestIdleCallback;
  if (typeof ric === "function") {
    idleId = ric(run, { timeout: timeoutMs }) as number;
  } else {
    timerId = window.setTimeout(run, fallbackDelayMs);
  }

  return () => {
    cancelled = true;
    if (idleId != null) {
      try { (window as any).cancelIdleCallback?.(idleId); } catch {}
    }
    if (timerId != null) {
      try { window.clearTimeout(timerId); } catch {}
    }
  };
}
