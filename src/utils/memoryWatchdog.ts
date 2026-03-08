// ============================================
// Memory Watchdog — background sampler only
// - no floating HUD
// - writes warnings to localStorage for Settings diagnostics
// ============================================

let interval: any = null;

export function startMemoryWatchdog() {
  if (interval) return;

  // retire un ancien HUD s'il existe encore dans le DOM
  try {
    document.getElementById("dc-memory-hud")?.remove();
    document.getElementById("dc-mobile-memory-hud")?.remove();
  } catch {}

  interval = setInterval(() => {
    try {
      const perf: any = performance as any;
      const mem = perf?.memory;
      if (!mem) return;

      const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
      const limit = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);

      if (used > limit * 0.85) {
        console.warn("[MEMORY WARNING]", used, "/", limit);
        try {
          localStorage.setItem(
            "dc_last_memory_warning_v1",
            JSON.stringify({
              at: Date.now(),
              usedMB: used,
              limitMB: limit,
              route: location.hash || location.pathname || "/",
            })
          );
        } catch {}
      }
    } catch {}
  }, 2000);
}
