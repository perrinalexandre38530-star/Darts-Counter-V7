// ============================================
// src/main.tsx — Entrée principale Cloudflare + React + Tailwind
// ✅ NEW: SAFE MODE anti "Aïe aïe aïe" (SW/caches)
// ✅ NEW: ONE-SHOT PURGE (même sans crash) pour virer SW/caches foireux
// ✅ FIX: ne plus purger automatiquement (freeze Stackblitz "Open in new tab")
// ✅ FIX: purge=1 NE BOUCLE PLUS (retire ?purge=1 avant reload)
// ✅ NEW: AsyncGuard + BootGuard + MemoryWatchdog
// ============================================
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import AsyncGuard from "./components/AsyncGuard";
import BootGuard from "./components/BootGuard";
import { startMemoryWatchdog } from "./utils/memoryWatchdog";
import { captureCrash, formatCrashReportText, isDynamicImportCrash, setCrashContext } from "./lib/crashReporter";

// ✅ démarre le watchdog mémoire Android/WebView
startMemoryWatchdog();

setCrashContext({
  route: "boot",
  build: String((import.meta as any)?.env?.MODE || "unknown"),
});

// One-shot startup cleanup for stale SW/cache states after deploy.
// Triggered only when URL has ?purge=1 or localStorage flag dc_force_purge_sw=1.
async function startupHardResetIfRequested() {
  try {
    const url = new URL(window.location.href);
    const byQuery = url.searchParams.get("purge") === "1";
    const byFlag = localStorage.getItem("dc_force_purge_sw") === "1";
    if (!byQuery && !byFlag) return false;

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister().catch(() => {})));
    }

    if (typeof caches !== "undefined" && (caches as any).keys) {
      const keys = await (caches as any).keys();
      await Promise.all(keys.map((key: string) => caches.delete(key)));
    }

    localStorage.removeItem("dc_force_purge_sw");
    url.searchParams.delete("purge");
    url.searchParams.set("r", String(Date.now()));
    window.location.replace(url.toString());
    return true;
  } catch {
    return false;
  }
}

// ---- PATCH: one-shot recovery for Vite lazy chunk load errors (Cloudflare cache mismatch, etc.) ----
try {
  const KEY = "dc:chunk-reload";
  const shouldReloadOnce = (msg: string) => {
    const m = (msg || "").toLowerCase();
    return (
      m.includes("failed to fetch dynamically imported module") ||
      m.includes("loading chunk") ||
      m.includes("chunkloaderror")
    );
  };

  window.addEventListener("error", (e: any) => {
    const message = String(e?.message || e?.error?.message || "");
    if (!shouldReloadOnce(message)) return;
    if (sessionStorage.getItem(KEY) === "1") return;
    sessionStorage.setItem(KEY, "1");
    // cache-buster
    const url = new URL(window.location.href);
    url.searchParams.set("r", String(Date.now()));
    window.location.replace(url.toString());
  });

  window.addEventListener("unhandledrejection", (e: any) => {
    const message = String(e?.reason?.message || e?.reason || "");
    if (!shouldReloadOnce(message)) return;
    if (sessionStorage.getItem(KEY) === "1") return;
    sessionStorage.setItem(KEY, "1");
    const url = new URL(window.location.href);
    url.searchParams.set("r", String(Date.now()));
    window.location.replace(url.toString());
  });
} catch {}
// ---- END PATCH ----


// ============================================================
// Dynamic import recovery (WebContainer/StackBlitz hardening)
// - If Vite serves stale module URLs (App.tsx?t=...), the dynamic import can fail.
// - We attempt a ONE-SHOT recovery: unregister SW + clear CacheStorage + reload with cache-buster.
// ============================================================
const DC_DYN_IMPORT_RECOVER_KEY = "dc_dyn_import_recover_once_v1";

function isDynImportFail(x: any) {
  return isDynamicImportCrash(x);
}

async function recoverDynamicImportOnce() {
  try {
    if (sessionStorage.getItem(DC_DYN_IMPORT_RECOVER_KEY) === "1") return false;
    sessionStorage.setItem(DC_DYN_IMPORT_RECOVER_KEY, "1");

    // Purge best-effort: unregister SW + clear CacheStorage
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
      }
    } catch {}
    try {
      if (typeof caches !== "undefined" && (caches as any).keys) {
        const keys = await (caches as any).keys();
        await Promise.all(keys.map((k: string) => caches.delete(k)));
      }
    } catch {}

    // Reload with cache-buster
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("sb", String(Date.now()));
      window.location.replace(u.toString());
    } catch {
      window.location.reload();
    }
    return true;
  } catch {
    return false;
  }
}


// ❌ IMPORTANT: NE PAS WRAPPER AuthOnlineProvider ICI
// ✅ Il doit être UNIQUEMENT dans App.tsx (un seul provider global)

// ✅ CRASH LOGGER (affiche l’erreur à l'écran)
(function attachCrashOverlay() {
  if (typeof window === "undefined") return;

  // ============================================================
  // StackBlitz / WebContainer hardening
  // - Au refresh en "Open in new tab", Vite peut invalider des chunks
  //   (dynamic import failed) et l'app reste blanche.
  // - On tente une récupération "une seule fois" : purge SW/caches +
  //   reload avec cache-buster.
  // ============================================================
  const SB_RECOVER_KEY = "dc_sb_recover_once_v1";

  // Reuse global helper
  const _isDynImportFail = (x: any) => isDynamicImportCrash(x);

  const recoverOnce = async () => {
    try {
      if (sessionStorage.getItem(SB_RECOVER_KEY) === "1") return;
      sessionStorage.setItem(SB_RECOVER_KEY, "1");

      // Purge best-effort : SW + CacheStorage (si dispo)
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
        }
      } catch {}
      try {
        if (typeof caches !== "undefined" && (caches as any).keys) {
          const keys = await (caches as any).keys();
          await Promise.all(keys.map((k: string) => caches.delete(k)));
        }
      } catch {}

      // Reload avec cache-buster (préserve hash)
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("sb", String(Date.now()));
        window.location.replace(u.toString());
      } catch {
        window.location.reload();
      }
    } catch {}
  };

  const show = (title: string, err: any, source?: string) => {
    try {
      const report = captureCrash(title, err, { source });
      const el = document.createElement("pre");
      el.style.cssText =
        "position:fixed;inset:0;z-index:999999;background:#0b0b0f;color:#fff;padding:12px;white-space:pre-wrap;overflow:auto;font:12px/1.35 ui-monospace,Menlo,Consolas;";
      el.textContent = formatCrashReportText(report);
      document.body.appendChild(el);
    } catch {}
  };

  window.addEventListener("error", (e: any) => {
    const payload = e?.error || e?.message || e;
    if (_isDynImportFail(payload)) recoverOnce();
    const source = e?.filename ? `${e.filename}:${e.lineno || 0}:${e.colno || 0}` : undefined;
    show("window.error", payload, source);
  });
  window.addEventListener("unhandledrejection", (e: any) => {
    const payload = e?.reason || e;
    if (_isDynImportFail(payload)) recoverOnce();
    show("unhandledrejection", payload);
  });
})();

/* ============================================================
   SAFE MODE (si crash au boot -> on coupe SW + purge caches)
============================================================ */
const SAFE_MODE_KEY = "dc_safe_mode_v1";

function setSafeMode(v: boolean) {
  try {
    localStorage.setItem(SAFE_MODE_KEY, v ? "1" : "0");
  } catch {}
}
function isSafeMode(): boolean {
  try {
    return localStorage.getItem(SAFE_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

/* ============================================================
   SW/CACHES UTILITIES
============================================================ */
async function disableAllServiceWorkersAndCaches() {
  // 1) unregister SW
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
  } catch {}

  // 2) delete caches
  try {
    if (typeof caches !== "undefined" && (caches as any).keys) {
      const keys = await (caches as any).keys();
      await Promise.all(keys.map((k: string) => caches.delete(k)));
    }
  } catch {}
}

/* ============================================================
   ONE-SHOT PURGE (même sans crash)
   -> exécute UNE fois: unregister SW + delete caches + reload
   -> utile quand l'app est bloquée (pending / navigation morte)
============================================================ */
const SW_PURGE_ONCE_KEY = "dc_sw_purge_once_v1";

async function purgeSWAndCachesOnce() {
  try {
    // évite boucle de reload
    if (localStorage.getItem(SW_PURGE_ONCE_KEY) === "1") return;

    // marque avant purge pour ne pas boucler si reload foire
    localStorage.setItem(SW_PURGE_ONCE_KEY, "1");

    await disableAllServiceWorkersAndCaches();

    // reload dur
    window.location.reload();
  } catch (e) {
    console.warn("[SW] purge once failed:", e);
  }
}

/* ============================================================
   UI boot screens
============================================================ */
function bootScreen(title: string, msg: string) {
  const el = document.getElementById("root") || document.body;
  el.innerHTML = `
    <div style="
      min-height:100vh;
      padding:14px;
      background:#0b0b10;
      color:#fff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
      <div style="font-size:18px;font-weight:900;margin-bottom:10px;">${title}</div>
      <div style="opacity:.85;font-size:13px;margin-bottom:10px;">${msg}</div>
      <button onclick="localStorage.setItem('${SAFE_MODE_KEY}','0');location.reload()" style="
        margin-top:10px;
        border-radius:999px;
        padding:10px 12px;
        border:none;
        font-weight:900;
        background:linear-gradient(180deg,#ffc63a,#ffaf00);
        color:#1b1508;
        cursor:pointer;">Recharger (mode normal)</button>
    </div>
  `;
}

function bootCrashScreen(payload: any) {
  const report = captureCrash("boot-crash", payload);
  const msg = formatCrashReportText(report);

  // ✅ on force SAFE MODE au prochain boot
  setSafeMode(true);

  try {
    localStorage.setItem(
      "dc_last_boot_crash_v1",
      JSON.stringify({ at: Date.now(), msg }, null, 2)
    );
  } catch {}

  const el = document.getElementById("root") || document.body;
  el.innerHTML = `
    <div style="
      min-height:100vh;
      padding:14px;
      background:#0b0b10;
      color:#fff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
      <div style="font-size:18px;font-weight:900;margin-bottom:10px;">💥 CRASH CAPTURÉ (BOOT)</div>
      <div style="opacity:.85;font-size:13px;margin-bottom:10px;">
        Safe mode sera activé au prochain démarrage pour couper le Service Worker / caches.
        Fais une capture de cet écran ou copie le rapport.
      </div>
      <pre style="
        white-space:pre-wrap;
        word-break:break-word;
        background:rgba(255,255,255,.06);
        padding:12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.12);">${msg}</pre>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button onclick="navigator.clipboard&&navigator.clipboard.writeText(document.querySelector('pre')?.innerText||'')" style="
          border-radius:999px;
          padding:10px 12px;
          border:1px solid rgba(255,255,255,.2);
          font-weight:900;
          background:rgba(255,255,255,.08);
          color:#fff;
          cursor:pointer;">Copier le rapport</button>
        <button onclick="location.reload()" style="
          border-radius:999px;
          padding:10px 12px;
          border:none;
          font-weight:900;
          background:linear-gradient(180deg,#ffc63a,#ffaf00);
          color:#1b1508;
          cursor:pointer;">Recharger</button>
      </div>
    </div>
  `;
}

/* ============================================================
   Service Worker policy (avec SAFE MODE)
============================================================ */
async function registerServiceWorkerProd() {
  // ✅ si SAFE MODE : on coupe tout et on affiche écran
  if (isSafeMode()) {
    await disableAllServiceWorkersAndCaches();
    bootScreen(
      "🧯 SAFE MODE",
      "Service Worker + caches désactivés (anti crash). Si l’app marche ici, le problème venait du SW/cache."
    );
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      // 1) Désenregistre tout SW hérité (sauf /sw.js)
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => !r.active?.scriptURL.endsWith("/sw.js"))
          .map((r) => r.unregister().catch(() => {}))
      );

      // 2) Enregistre le SW unique
      const reg = await navigator.serviceWorker.register("/sw.js");

      // 3) Si une nouvelle version est trouvée → skipWaiting
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw?.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            reg.waiting?.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      // 4) controllerchange → reload
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      console.log("✅ Service Worker enregistré :", reg.scope);
    } catch (err) {
      console.warn("⚠️ SW register error", err);
    }
  });
}

async function devUnregisterSW() {
  // ✅ DEV: on désactive TOUJOURS le SW + caches (évite 2 SW actifs, vieux chunks, intro bloquée)
  await disableAllServiceWorkersAndCaches();
}

/* ============================================================
   DEBUG
============================================================ */
(async () => {
  (window as any).dumpStore = async () => {
    const { loadStore } = await import("./lib/storage");
    const s = await loadStore<any>();
    console.log("STORE =", s);
    console.log("statsByPlayer =", s?.statsByPlayer);
    console.log(
      "Dernier summary =",
      Array.isArray(s?.history) ? s.history[s.history.length - 1]?.summary : undefined
    );
    return s;
  };
})();

/* ============================================================
   BOOT
============================================================ */
(async () => {
  try {
    if (await startupHardResetIfRequested()) return;

    // ✅ FIX: NE PLUS purger automatiquement au boot
    // (Stackblitz "Open in new tab" change d'origine → purge+reload → écran blanc/perçu comme gel)
    //
    // Pour forcer une purge ONE-SHOT :
    // - ajoute ?purge=1 à l'URL
    // - OU mets localStorage.setItem("dc_force_purge_sw","1") puis reload
    //
    // ✅ FIX: purge=1 ne doit JAMAIS boucler → on retire ?purge=1 avant reload + garde-fou SW_PURGE_ONCE_KEY
    const purgeInfo = (() => {
      try {
        const u = new URL(window.location.href);
        const byQuery = u.searchParams.get("purge") === "1";
        const byFlag = localStorage.getItem("dc_force_purge_sw") === "1";
        return { byQuery, byFlag, url: u };
      } catch {
        return { byQuery: false, byFlag: false, url: null as any };
      }
    })();

    if (purgeInfo.byQuery || purgeInfo.byFlag) {
      try {
        // Si déjà purgé une fois → on enlève ?purge=1 et on continue le boot normal
        if (localStorage.getItem(SW_PURGE_ONCE_KEY) === "1") {
          try {
            if (purgeInfo.url) {
              purgeInfo.url.searchParams.delete("purge");
              window.history.replaceState({}, "", purgeInfo.url.toString());
            }
            localStorage.removeItem("dc_force_purge_sw");
          } catch {}
        } else {
          // Première fois seulement : purge puis reload (SANS ?purge=1)
          localStorage.setItem(SW_PURGE_ONCE_KEY, "1");
          localStorage.removeItem("dc_force_purge_sw");

          await disableAllServiceWorkersAndCaches();

          try {
            if (purgeInfo.url) {
              purgeInfo.url.searchParams.delete("purge");
              window.history.replaceState({}, "", purgeInfo.url.toString());
            }
          } catch {}

          window.location.reload();
          return;
        }
      } catch {}
    }

    if (import.meta.env.PROD) await registerServiceWorkerProd();
    else await devUnregisterSW();

    const container = document.getElementById("root");
    if (!container) throw new Error("❌ Élément #root introuvable dans index.html");

    let mod: any;
    try {
      mod = await import("./App");
    } catch (e) {
      // Fallback: cache-bust the module URL once (helps when Vite/WebContainer serves stale ?t=... URLs)
      if (isDynImportFail(e)) {
        try {
          mod = await import(/* @vite-ignore */ `./App?sb=${Date.now()}`);
        } catch {
          throw e;
        }
      } else {
        throw e;
      }
    }
    const AppRoot = mod.default;

    // ✅ IMPORTANT: pas de AuthOnlineProvider ici
    createRoot(container).render(
      <React.StrictMode>
        <BootGuard>
          <AsyncGuard>
            <ErrorBoundary>
              <AppRoot />
            </ErrorBoundary>
          </AsyncGuard>
        </BootGuard>
      </React.StrictMode>
    );

    // ✅ si ça render, on peut enlever safe mode
    setSafeMode(false);
  } catch (e) {
    console.error("[BOOT CRASH]", e);

    // ✅ If the crash is a stale Vite chunk / dynamic import failure, try an automatic one-shot recovery.
    if (isDynImportFail(e)) {
      const recovered = await recoverDynamicImportOnce();
      if (recovered) return;
    }

    bootCrashScreen(e);
  }
})();