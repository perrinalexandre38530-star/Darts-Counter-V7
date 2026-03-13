// ============================================
// src/lib/diagnosticPro.ts
// Diagnostic PRO persistant
// - breadcrumbs persistants
// - mémoire dans le temps
// - erreurs runtime / promises
// - dernières routes
// - résumé session avant crash
// ============================================

import { loadStore } from "./storage";
import { captureCrash, getCrashLog, getLastCrashReport } from "./crashReporter";

export interface DiagnosticReport {
  generatedAt: string;
  app: any;
  memory: any;
  storage: any;
  runtime: any;
  routes: string[];
  breadcrumbs: any[];
  lastCrash: any;
  crashLog: any[];
  probableCause: string[];
  recommendations: string[];
}

const ROUTE_KEY = "dc_diag_routes_v2";
const RENDER_KEY = "dc_diag_render_v2";
const MEMORY_KEY = "dc_diag_memory_samples_v2";
const EVENTS_KEY = "dc_diag_events_v2";
const SESSION_KEY = "dc_diag_session_v2";
const SNAPSHOT_KEY = "dc_diag_last_snapshot_v2";
const LONGTASK_KEY = "dc_diag_longtasks_v2";
const MAX_ROUTES = 60;
const MAX_EVENTS = 120;
const MAX_SAMPLES = 80;
const MAX_LONGTASKS = 40;
const SAMPLE_EVERY_MS = 15_000;

function hasWindow() {
  return typeof window !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: any) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function safeGet<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    return safeParse<T>(window.localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

const bootAt = Date.now();
let started = false;
let renderCount = safeGet<number>(RENDER_KEY, 0);
let routeHistory = safeGet<string[]>(ROUTE_KEY, []);
let memorySamples = safeGet<any[]>(MEMORY_KEY, []);
let longTasks = safeGet<any[]>(LONGTASK_KEY, []);
let eventLog = safeGet<any[]>(EVENTS_KEY, []);
let lastRuntimeError: any = safeGet<any>("dc_last_runtime_error_v1", null);
let lastPromiseError: any = safeGet<any>("dc_last_promise_error_v1", null);

function currentRoute() {
  try {
    const h = String(window.location.hash || "");
    return h || String(window.location.pathname || "/");
  } catch {
    return "/";
  }
}

function getSession() {
  const existing = safeGet<any>(SESSION_KEY, null);
  if (existing?.id) return existing;
  const created = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
    bootAt,
    href: hasWindow() ? String(window.location.href || "") : "",
  };
  safeSet(SESSION_KEY, created);
  return created;
}

function pushBounded<T>(list: T[], item: T, max: number) {
  const next = [...list, item];
  if (next.length > max) next.splice(0, next.length - max);
  return next;
}

function rememberEvent(type: string, data?: any) {
  const evt = {
    at: new Date().toISOString(),
    type,
    route: currentRoute(),
    data: data ?? null,
  };
  eventLog = pushBounded(eventLog, evt, MAX_EVENTS);
  safeSet(EVENTS_KEY, eventLog);
}

function saveSnapshot(extra?: any) {
  const snapshot = {
    at: new Date().toISOString(),
    route: currentRoute(),
    renderCount,
    routeCount: routeHistory.length,
    memory: getMemory(),
    lastRuntimeError,
    lastPromiseError,
    extra: extra ?? null,
  };
  safeSet(SNAPSHOT_KEY, snapshot);
}

function getMemory() {
  try {
    const mem = (performance as any)?.memory;
    if (!mem) return null;
    const usedMB = Math.round((Number(mem.usedJSHeapSize || 0) / 1048576) * 10) / 10;
    const totalMB = Math.round((Number(mem.totalJSHeapSize || 0) / 1048576) * 10) / 10;
    const limitMB = Math.round((Number(mem.jsHeapSizeLimit || 0) / 1048576) * 10) / 10;
    return {
      usedMB,
      totalMB,
      limitMB,
      pressure: limitMB > 0 ? Math.round((usedMB / limitMB) * 1000) / 1000 : null,
    };
  } catch {
    return null;
  }
}

function sampleMemory(reason = "interval") {
  const mem = getMemory();
  if (!mem) return;
  const sample = {
    at: new Date().toISOString(),
    usedMB: mem.usedMB,
    limitMB: mem.limitMB,
    route: currentRoute(),
    reason,
  };
  memorySamples = pushBounded(memorySamples, sample, MAX_SAMPLES);
  safeSet(MEMORY_KEY, memorySamples);
  try {
    safeSet("dc_memory_diag_v1", { at: sample.at, usedMB: mem.usedMB, limitMB: mem.limitMB, route: sample.route });
  } catch {}
  saveSnapshot({ reason: "memory-sample" });
}

function estimateStoreSize(store: any) {
  const json = JSON.stringify(store || {});
  return {
    sizeMB: Math.round((json.length / 1024 / 1024) * 100) / 100,
    profiles: Array.isArray(store?.profiles) ? store.profiles.length : 0,
    history: Array.isArray(store?.history) ? store.history.length : 0,
    friends: Array.isArray(store?.friends) ? store.friends.length : 0,
    dartSets: Array.isArray(store?.dartSets) ? store.dartSets.length : 0,
  };
}

function estimateAvatarMemory(store: any) {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  let total = 0;
  let withBase64 = 0;
  let largest = 0;
  for (const p of profiles) {
    const data = typeof p?.avatarDataUrl === "string" ? p.avatarDataUrl : "";
    if (data.startsWith("data:")) {
      withBase64++;
      total += data.length;
      if (data.length > largest) largest = data.length;
    }
  }
  return {
    profileCount: profiles.length,
    withBase64,
    totalMB: Math.round((total / 1024 / 1024) * 100) / 100,
    largestMB: Math.round((largest / 1024 / 1024) * 100) / 100,
  };
}

function estimateHistorySize(store: any) {
  const history = Array.isArray(store?.history) ? store.history : [];
  let biggest = 0;
  for (const rec of history) {
    try {
      const len = JSON.stringify(rec || {}).length;
      if (len > biggest) biggest = len;
    } catch {}
  }
  let total = 0;
  try {
    total = JSON.stringify(history).length;
  } catch {}
  return {
    matches: history.length,
    sizeMB: Math.round((total / 1024 / 1024) * 100) / 100,
    biggestRecordKB: Math.round((biggest / 1024) * 10) / 10,
  };
}

function buildProbableCauses(input: {
  memory: any;
  avatars: any;
  history: any;
  store: any;
  runtime: any;
  renderCount: number;
  renderRatePerMin: number;
}) {
  const causes: string[] = [];
  const { memory, avatars, history, store, runtime, renderRatePerMin } = input;

  if (runtime?.lastCrash?.message) {
    causes.push(`Crash capturé: ${runtime.lastCrash.message}`);
  }
  if (runtime?.runtimeError?.message) {
    causes.push(`Erreur runtime persistée: ${runtime.runtimeError.message}`);
  }
  if (runtime?.promiseError?.message) {
    causes.push(`Promesse rejetée non gérée: ${runtime.promiseError.message}`);
  }
  if (memory?.jsHeap?.pressure != null && memory.jsHeap.pressure >= 0.8) {
    causes.push("Mémoire JS proche de la limite: possible fuite mémoire ou assets trop lourds.");
  }
  if (memory?.trend?.risingFast) {
    causes.push("La mémoire monte rapidement pendant la session.");
  }
  if (avatars?.totalMB > 20) {
    causes.push("Les avatars base64 sont très lourds.");
  }
  if (history?.sizeMB > 20) {
    causes.push("L'historique local est trop volumineux.");
  }
  if (store?.sizeMB > 25) {
    causes.push("Le store global devient trop gros.");
  }
  if (renderRatePerMin > 120) {
    causes.push("Trop de re-renders React détectés.");
  }
  if (Array.isArray(runtime?.longTasks) && runtime.longTasks.length > 0) {
    causes.push("Des tâches longues bloquent le thread principal.");
  }
  if (!causes.length) {
    causes.push("Aucune cause évidente unique. Le crash semble contextuel ou intermittent.");
  }
  return causes;
}

function buildRecommendations(input: { probableCause: string[]; runtime: any; memory: any; avatars: any; history: any; }) {
  const recos: string[] = [];
  if (input.runtime?.lastCrash?.message || input.runtime?.runtimeError?.message || input.runtime?.promiseError?.message) {
    recos.push("Corriger d'abord la dernière stack capturée avant toute optimisation générale.");
  }
  if (input.memory?.trend?.risingFast) {
    recos.push("Tester l'écran ouvert plusieurs minutes puis comparer les samples mémoire avant/après navigation.");
  }
  if (input.avatars?.totalMB > 20) {
    recos.push("Convertir les avatars base64 en fichiers compressés ou URLs persistées.");
  }
  if (input.history?.sizeMB > 20) {
    recos.push("Archiver / compresser l'historique ancien hors du store principal.");
  }
  if (!recos.length) {
    recos.push("Reproduire le crash puis exporter le rapport juste après le redémarrage: le journal persistant gardera la trace.");
  }
  return recos;
}

function startOnce() {
  if (!hasWindow() || started) return;
  started = true;
  getSession();
  rememberEvent("boot", { href: String(window.location.href || "") });
  if (!routeHistory.length) {
    routeHistory = pushBounded(routeHistory, currentRoute(), MAX_ROUTES);
    safeSet(ROUTE_KEY, routeHistory);
  }
  sampleMemory("boot");

  window.setInterval(() => sampleMemory("interval"), SAMPLE_EVERY_MS);

  window.addEventListener("visibilitychange", () => {
    rememberEvent("visibility", { state: document.visibilityState });
    if (document.visibilityState === "hidden") saveSnapshot({ reason: "hidden" });
  });

  window.addEventListener("pagehide", () => saveSnapshot({ reason: "pagehide" }));
  window.addEventListener("beforeunload", () => saveSnapshot({ reason: "beforeunload" }));

  window.addEventListener("error", (e) => {
    const err = e?.error || e?.message || "Erreur inconnue";
    const payload = {
      at: new Date().toISOString(),
      type: "window.error",
      message: String(e?.message || e?.error?.message || err || ""),
      stack: String(e?.error?.stack || ""),
      href: String(window.location.href || ""),
      route: currentRoute(),
    };
    lastRuntimeError = payload;
    safeSet("dc_last_runtime_error_v1", payload);
    rememberEvent("runtime-error", { message: payload.message });
    try { captureCrash("window.error", err, { source: e?.filename, raw: payload.stack || payload.message }); } catch {}
    saveSnapshot({ reason: "runtime-error" });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason;
    const payload = {
      at: new Date().toISOString(),
      type: "unhandledrejection",
      message: String(reason?.message || reason || "Promesse rejetée"),
      stack: String(reason?.stack || ""),
      href: String(window.location.href || ""),
      route: currentRoute(),
    };
    lastPromiseError = payload;
    safeSet("dc_last_promise_error_v1", payload);
    rememberEvent("promise-error", { message: payload.message });
    try { captureCrash("unhandledrejection", reason, { raw: payload.stack || payload.message }); } catch {}
    saveSnapshot({ reason: "promise-error" });
  });

  try {
    const PerfObs = (window as any).PerformanceObserver;
    if (typeof PerfObs === "function") {
      const obs = new PerfObs((list: any) => {
        for (const entry of list.getEntries()) {
          const lt = {
            at: new Date().toISOString(),
            duration: Math.round(Number(entry.duration || 0)),
            name: String(entry.name || "longtask"),
            route: currentRoute(),
          };
          longTasks = pushBounded(longTasks, lt, MAX_LONGTASKS);
          safeSet(LONGTASK_KEY, longTasks);
          rememberEvent("long-task", lt);
        }
      });
      obs.observe({ entryTypes: ["longtask"] });
    }
  } catch {}
}

startOnce();

export function trackRoute(route: string) {
  startOnce();
  const value = String(route || currentRoute() || "/");
  routeHistory = pushBounded(routeHistory, value, MAX_ROUTES);
  safeSet(ROUTE_KEY, routeHistory);
  rememberEvent("route", { route: value });
  saveSnapshot({ reason: "route", route: value });
}

export function trackRender(component = "App") {
  startOnce();
  renderCount += 1;
  safeSet(RENDER_KEY, renderCount);
  if (renderCount <= 10 || renderCount % 25 === 0) {
    rememberEvent("render", { component, renderCount });
    saveSnapshot({ reason: "render", component, renderCount });
  }
}

export async function generateDiagnostic(): Promise<DiagnosticReport> {
  startOnce();
  const store = await loadStore();
  const mem = getMemory();
  const session = getSession();

  const storageEstimate = typeof navigator !== "undefined" && (navigator as any).storage?.estimate
    ? await (navigator as any).storage.estimate().catch(() => null)
    : null;

  const avatars = estimateAvatarMemory(store);
  const history = estimateHistorySize(store);
  const storeSize = estimateStoreSize(store);
  const minutes = Math.max(1, (Date.now() - Number(session?.bootAt || bootAt)) / 60000);
  const renderRatePerMin = Math.round((renderCount / minutes) * 10) / 10;

  const lastCrash = getLastCrashReport();
  const crashLog = getCrashLog();
  const runtime = {
    runtimeError: lastRuntimeError,
    promiseError: lastPromiseError,
    lastCrash,
    crashLog,
    errorEvents: eventLog.filter((e) => e.type === "runtime-error" || e.type === "promise-error").slice(-12),
    longTasks: [...longTasks],
    sw: {
      supported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
      controlled: typeof navigator !== "undefined" && !!navigator.serviceWorker?.controller,
    },
    lastSnapshot: safeGet<any>(SNAPSHOT_KEY, null),
  };

  const memory = {
    jsHeap: mem,
    samples: [...memorySamples],
    trend: (() => {
      if (memorySamples.length < 2) return { deltaMB: 0, risingFast: false };
      const first = Number(memorySamples[0]?.usedMB || 0);
      const last = Number(memorySamples[memorySamples.length - 1]?.usedMB || 0);
      const deltaMB = Math.round((last - first) * 10) / 10;
      return { deltaMB, risingFast: deltaMB >= 120 };
    })(),
  };

  const probableCause = buildProbableCauses({
    memory,
    avatars,
    history,
    store: storeSize,
    runtime,
    renderCount,
    renderRatePerMin,
  });

  const recommendations = buildRecommendations({ probableCause, runtime, memory, avatars, history });

  return {
    generatedAt: new Date().toISOString(),
    app: {
      sessionId: session?.id,
      route: currentRoute(),
      href: typeof window !== "undefined" ? String(window.location.href || "") : "",
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      visibility: typeof document !== "undefined" ? document.visibilityState : "unknown",
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "",
      viewport: {
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
        dpr: typeof window !== "undefined" ? Number(window.devicePixelRatio || 1) : 1,
      },
      renderCount,
      renderRatePerMin,
      routeChanges: routeHistory.length,
      uniqueRoutes: Array.from(new Set(routeHistory)),
      mountToNowMs: Date.now() - bootAt,
    },
    memory,
    storage: {
      estimate: storageEstimate
        ? {
            usageMB: Math.round((((storageEstimate as any).usage || 0) / 1024 / 1024) * 100) / 100,
            quotaMB: Math.round((((storageEstimate as any).quota || 0) / 1024 / 1024) * 100) / 100,
            usageRatio: (storageEstimate as any).quota ? Math.round((((storageEstimate as any).usage || 0) / (storageEstimate as any).quota) * 1000) / 1000 : 0,
          }
        : null,
      store: storeSize,
      avatars,
      history,
    },
    runtime,
    routes: [...routeHistory],
    breadcrumbs: [...eventLog],
    lastCrash,
    crashLog,
    probableCause,
    recommendations,
  };
}

export function exportDiagnostic(report: DiagnosticReport | null | undefined) {
  if (!report) return;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `multisports_diagnostic_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
