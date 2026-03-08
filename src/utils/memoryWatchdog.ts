// ============================================
// Memory Watchdog — Mobile OOM protection
// ============================================

let interval: any = null;

function createOverlay() {
  let el = document.getElementById("dc-memory-hud");

  if (!el) {
    el = document.createElement("div");
    el.id = "dc-memory-hud";

    el.style.position = "fixed";
    el.style.bottom = "6px";
    el.style.right = "6px";
    el.style.zIndex = "999999";
    el.style.background = "rgba(0,0,0,.75)";
    el.style.color = "#0f0";
    el.style.fontSize = "11px";
    el.style.padding = "6px 8px";
    el.style.borderRadius = "6px";
    el.style.fontFamily = "monospace";

    document.body.appendChild(el);
  }

  return el;
}

export function startMemoryWatchdog() {
  if (interval) return;

  const hud = createOverlay();

  interval = setInterval(() => {
    try {
      const perf: any = performance as any;

      if (!perf.memory) {
        hud.textContent = "MEM: unknown";
        return;
      }

      const used = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
      const limit = Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024);

      hud.textContent = `MEM ${used}MB / ${limit}MB`;

      if (used > limit * 0.85) {
        hud.style.color = "#ff4444";
        console.warn("[MEMORY WARNING]", used, "/", limit);
      } else {
        hud.style.color = "#0f0";
      }
    } catch {}
  }, 2000);
}