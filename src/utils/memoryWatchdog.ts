// ============================================
// Memory Watchdog — background sampler only
// - no floating HUD
// - warnings throttled (DevTools itself retains console entries)
// - compact diagnostics for media/localStorage hot spots
// ============================================

import { isRuntimeHidden } from "../lib/runtimePerformance";

let interval: any = null;
let lastWarningAt = 0;
const WARNING_COOLDOWN_MS = 15_000;

function localStorageHotspots(limit = 5) {
  try {
    if (typeof localStorage === "undefined") return [];
    const rows: Array<{ key: string; kb: number }> = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      const chars = (localStorage.getItem(key) || "").length;
      rows.push({ key, kb: Math.round((chars * 2) / 1024) });
    }
    rows.sort((a, b) => b.kb - a.kb);
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

function compactMemoryDiagnostics() {
  try {
    const media = typeof (globalThis as any).__dcUserMediaMemoryDiagnostics === "function"
      ? (globalThis as any).__dcUserMediaMemoryDiagnostics()
      : null;
    const avatar = typeof (globalThis as any).__dcAvatarCacheDiagnostics === "function"
      ? (globalThis as any).__dcAvatarCacheDiagnostics()
      : null;
    return {
      userMediaCacheEntries: Number(media?.entries || 0),
      userMediaCacheMB: Math.round((Number(media?.chars || 0) * 2 / 1024 / 1024) * 10) / 10,
      userMediaPendingCaptures: Number(media?.pendingCaptures || 0),
      userMediaPendingResolves: Number(media?.pendingResolves || 0),
      avatarSessionMB: Math.round((Number(avatar?.sessionThumbChars || 0) * 2 / 1024 / 1024) * 10) / 10,
      avatarFastLocalStorageKB: Math.round((Number(avatar?.fastChars || 0) * 2 / 1024)),
      localStorageTop: localStorageHotspots(),
    };
  } catch {
    return { localStorageTop: localStorageHotspots() };
  }
}

export function startMemoryWatchdog() {
  if (interval) return;

  try {
    document.getElementById("dc-memory-hud")?.remove();
    document.getElementById("dc-mobile-memory-hud")?.remove();
  } catch {}

  interval = setInterval(() => {
    try {
      if (isRuntimeHidden()) return;
      const perf: any = performance as any;
      const mem = perf?.memory;
      if (!mem) return;

      const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
      const limit = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
      const ratio = limit > 0 ? used / limit : 0;

      if (ratio > 0.85) {
        const now = Date.now();
        if (now - lastWarningAt < WARNING_COOLDOWN_MS) return;
        lastWarningAt = now;

        const diag = compactMemoryDiagnostics();
        console.warn("[MEMORY WARNING]", used, "/", limit, {
          ratioPct: Math.round(ratio * 100),
          route: location.hash || location.pathname || "/",
          ...diag,
        });
        try {
          localStorage.setItem(
            "dc_last_memory_warning_v1",
            JSON.stringify({
              at: now,
              usedMB: used,
              limitMB: limit,
              ratioPct: Math.round(ratio * 100),
              route: location.hash || location.pathname || "/",
              userMediaCacheEntries: (diag as any)?.userMediaCacheEntries || 0,
              userMediaCacheMB: (diag as any)?.userMediaCacheMB || 0,
            })
          );
        } catch {}
      }
    } catch {}
  }, 5000);
}
