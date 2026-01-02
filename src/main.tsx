// ============================================
// src/main.tsx — Entrée principale Cloudflare + React + Tailwind
// ✅ NEW: SAFE MODE anti "Aïe aïe aïe" (SW/caches)
// ============================================
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// ❌ IMPORTANT: NE PAS WRAPPER AuthOnlineProvider ICI
// ✅ Il doit être UNIQUEMENT dans App.tsx (un seul provider global)

// ✅ CRASH LOGGER (affiche l’erreur à l'écran)
(function attachCrashOverlay() {
  if (typeof window === "undefined") return;

  const show = (title: string, err: any) => {
    try {
      const el = document.createElement("pre");
      el.style.cssText =
        "position:fixed;inset:0;z-index:999999;background:#0b0b0f;color:#fff;padding:12px;white-space:pre-wrap;overflow:auto;font:12px/1.35 ui-monospace,Menlo,Consolas;";
      el.textContent =
        `[${title}]\n` +
        (err?.stack || err?.message || String(err)) +
        "\n\nURL:\n" +
        String(location.href);
      document.body.appendChild(el);
    } catch {}
  };

  window.addEventListener("error", (e: any) => show("window.error", e?.error || e?.message || e));
  window.addEventListener("unhandledrejection", (e: any) =>
    show("unhandledrejection", e?.reason || e)
  );
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

async function disableAllServiceWorkersAndCaches() {
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
}

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
  const format = (e: any) => {
    try {
      if (!e) return "Erreur inconnue";
      if (typeof e === "string") return e;
      if (e?.stack) return String(e.stack);
      if (e?.message) return String(e.message);
      return JSON.stringify(e, null, 2);
    } catch {
      return String(e);
    }
  };

  const msg = format(payload);

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
        Fais une capture de cet écran.
      </div>
      <pre style="
        white-space:pre-wrap;
        word-break:break-word;
        background:rgba(255,255,255,.06);
        padding:12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.12);">${msg}</pre>
      <button onclick="location.reload()" style="
        margin-top:10px;
        border-radius:999px;
        padding:10px 12px;
        border:none;
        font-weight:900;
        background:linear-gradient(180deg,#ffc63a,#ffaf00);
        color:#1b1508;
        cursor:pointer;">Recharger</button>
    </div>
  `;
}

/* ============================================================
   Service Worker policy (avec SAFE MODE)
============================================================ */
async function registerServiceWorkerProd() {
  // ✅ si SAFE MODE : on coupe tout
  if (isSafeMode()) {
    await disableAllServiceWorkersAndCaches();
    bootScreen(
      "🧯 SAFE MODE",
      "Service Worker + caches désactivés (anti crash). Si l’app marche ici, le problème vient du SW/cache."
    );
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      // 1) Désenregistre tout SW hérité
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
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    } catch {}
  }
  if (typeof caches !== "undefined" && (caches as any).keys) {
    try {
      const keys = await (caches as any).keys();
      await Promise.all(keys.map((k: string) => caches.delete(k)));
    } catch {}
  }
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
    if (import.meta.env.PROD) await registerServiceWorkerProd();
    else await devUnregisterSW();

    const container = document.getElementById("root");
    if (!container) throw new Error("❌ Élément #root introuvable dans index.html");

    const mod = await import("./App");
    const AppRoot = mod.default;

    // ✅ IMPORTANT: pas de AuthOnlineProvider ici
    createRoot(container).render(
      <React.StrictMode>
        <AppRoot />
      </React.StrictMode>
    );

    // ✅ si ça render, on peut enlever safe mode
    setSafeMode(false);
  } catch (e) {
    console.error("[BOOT CRASH]", e);
    bootCrashScreen(e);
  }
})();
