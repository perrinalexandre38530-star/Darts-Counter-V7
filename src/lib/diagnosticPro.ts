// @ts-nocheck
// ============================================
// src/lib/diagnosticPro.ts
// Diagnostic ULTRA PRO persistant
// - crashs persistants après redémarrage
// - mémoire + stockage + cache + service worker
// - re-renders / routes / breadcrumbs
// - timers, listeners, fetch/xhr, images, resources
// - long tasks, erreurs runtime, promesses rejetées
// ============================================

import { loadStore } from "./storage";
import { captureCrash, getCrashLog, getLastCrashReport } from "./crashReporter";
import { getCrashGuardState, getCrashGuardRouteHistory } from "./crashGuard";

export interface DiagnosticReport {
  generatedAt: string;
  app: any;
  memory: any;
  storage: any;
  runtime: any;
  react: any;
  network: any;
  resources: any;
  images: any;
  timers: any;
  listeners: any;
  crashGuard?: any;
  routes: string[];
  breadcrumbs: any[];
  lastCrash: any;
  crashLog: any[];
  probableCause: string[];
  recommendations: string[];
}

const KEY_PREFIX = "dc_diag_ultra_v1";
const ROUTE_KEY = `${KEY_PREFIX}:routes`;
const RENDER_KEY = `${KEY_PREFIX}:renderCount`;
const RENDER_EVENTS_KEY = `${KEY_PREFIX}:renderEvents`;
const MEMORY_KEY = `${KEY_PREFIX}:memorySamples`;
const EVENTS_KEY = `${KEY_PREFIX}:events`;
const SESSION_KEY = `${KEY_PREFIX}:session`;
const SNAPSHOT_KEY = `${KEY_PREFIX}:lastSnapshot`;
const LONGTASK_KEY = `${KEY_PREFIX}:longTasks`;
const FETCH_KEY = `${KEY_PREFIX}:fetch`;
const XHR_KEY = `${KEY_PREFIX}:xhr`;
const TIMERS_KEY = `${KEY_PREFIX}:timers`;
const LISTENERS_KEY = `${KEY_PREFIX}:listeners`;
const RESOURCES_KEY = `${KEY_PREFIX}:resources`;
const IMAGES_KEY = `${KEY_PREFIX}:images`;
const MAX_ROUTES = 100;
const MAX_EVENTS = 180;
const MAX_SAMPLES = 120;
const MAX_LONGTASKS = 60;
const MAX_NET = 80;
const MAX_RESOURCES = 80;
const MAX_RENDER_EVENTS = 150;
const SAMPLE_EVERY_MS = 15000;

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

function safeGet<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    return safeParse<T>(window.localStorage.getItem(key), fallback);
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

function pushBounded<T>(arr: T[], item: T, max: number) {
  const next = [...(Array.isArray(arr) ? arr : []), item];
  if (next.length > max) next.splice(0, next.length - max);
  return next;
}

const bootAt = Date.now();
let started = false;
let intervalsInstalled = false;
let renderCount = safeGet<number>(RENDER_KEY, 0);
let routeHistory = safeGet<string[]>(ROUTE_KEY, []);
let renderEvents = safeGet<any[]>(RENDER_EVENTS_KEY, []);
let memorySamples = safeGet<any[]>(MEMORY_KEY, []);
let longTasks = safeGet<any[]>(LONGTASK_KEY, []);
let eventLog = safeGet<any[]>(EVENTS_KEY, []);
let fetchLog = safeGet<any[]>(FETCH_KEY, []);
let xhrLog = safeGet<any[]>(XHR_KEY, []);
let resourceLog = safeGet<any[]>(RESOURCES_KEY, []);
let imageSnapshots = safeGet<any[]>(IMAGES_KEY, []);
let timerSnapshots = safeGet<any[]>(TIMERS_KEY, []);
let listenerSnapshots = safeGet<any[]>(LISTENERS_KEY, []);
let lastRuntimeError: any = safeGet<any>(`${KEY_PREFIX}:lastRuntimeError`, null);
let lastPromiseError: any = safeGet<any>(`${KEY_PREFIX}:lastPromiseError`, null);

const activeTimeouts = new Map<any, { createdAt: number; delay: number; route: string }>();
const activeIntervals = new Map<any, { createdAt: number; delay: number; route: string }>();
const listenersState = new Map<string, { count: number; target: string; type: string }>();
const inFlightFetch = new Map<string, { startedAt: number; url: string; route: string; method: string }>();
let originalFetch: any = null;
let originalXHROpen: any = null;
let originalXHRSend: any = null;
let originalAddEventListener: any = null;
let originalRemoveEventListener: any = null;
let originalSetTimeout: any = null;
let originalClearTimeout: any = null;
let originalSetInterval: any = null;
let originalClearInterval: any = null;

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

function nowIso() {
  return new Date().toISOString();
}

function rememberEvent(type: string, data?: any) {
  const evt = {
    at: nowIso(),
    type,
    route: currentRoute(),
    data: data ?? null,
  };
  eventLog = pushBounded(eventLog, evt, MAX_EVENTS);
  safeSet(EVENTS_KEY, eventLog);
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

function buildTimerSnapshot() {
  const timeoutAges = [...activeTimeouts.values()].map((x) => Date.now() - x.createdAt);
  const intervalAges = [...activeIntervals.values()].map((x) => Date.now() - x.createdAt);
  const longestTimeoutMs = timeoutAges.length ? Math.max(...timeoutAges) : 0;
  const longestIntervalMs = intervalAges.length ? Math.max(...intervalAges) : 0;
  const timeoutDelays = [...activeTimeouts.values()].map((x) => x.delay).filter(Boolean);
  const intervalDelays = [...activeIntervals.values()].map((x) => x.delay).filter(Boolean);
  return {
    at: nowIso(),
    activeTimeouts: activeTimeouts.size,
    activeIntervals: activeIntervals.size,
    longestTimeoutMs,
    longestIntervalMs,
    shortestTimeoutDelayMs: timeoutDelays.length ? Math.min(...timeoutDelays) : 0,
    shortestIntervalDelayMs: intervalDelays.length ? Math.min(...intervalDelays) : 0,
  };
}

function buildListenerSnapshot() {
  const entries = [...listenersState.values()];
  const top = [...entries].sort((a, b) => b.count - a.count).slice(0, 12);
  return {
    at: nowIso(),
    totalActive: entries.reduce((sum, x) => sum + Number(x.count || 0), 0),
    uniqueBuckets: entries.length,
    top,
  };
}

function scanImages() {
  try {
    const imgs = Array.from(document.images || []);
    let total = 0;
    let dataUrlCount = 0;
    let blobCount = 0;
    let remoteCount = 0;
    const large: any[] = [];
    for (const img of imgs) {
      const src = String((img as any).currentSrc || img.src || "");
      const srcBytes = src.startsWith("data:") ? src.length : 0;
      total += srcBytes;
      if (src.startsWith("data:")) dataUrlCount++;
      else if (src.startsWith("blob:")) blobCount++;
      else if (src) remoteCount++;
      const pixels = Number(img.naturalWidth || 0) * Number(img.naturalHeight || 0);
      if (srcBytes > 300_000 || pixels > 3_000_000) {
        large.push({
          srcKind: src.startsWith("data:") ? "data" : src.startsWith("blob:") ? "blob" : "url",
          bytesKB: Math.round((srcBytes / 1024) * 10) / 10,
          naturalWidth: Number(img.naturalWidth || 0),
          naturalHeight: Number(img.naturalHeight || 0),
          renderedWidth: Number((img as any).width || 0),
          renderedHeight: Number((img as any).height || 0),
          alt: String(img.alt || "").slice(0, 80),
        });
      }
    }
    const snapshot = {
      at: nowIso(),
      count: imgs.length,
      dataUrlCount,
      blobCount,
      remoteCount,
      totalBase64MB: Math.round((total / 1024 / 1024) * 100) / 100,
      large: large.slice(0, 20),
    };
    imageSnapshots = pushBounded(imageSnapshots, snapshot, 30);
    safeSet(IMAGES_KEY, imageSnapshots);
    return snapshot;
  } catch {
    return null;
  }
}

function scanResources() {
  try {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return [];
    const entries = (performance.getEntriesByType("resource") as any[]) || [];
    const mapped = entries.map((e) => ({
      name: String(e.name || "").slice(0, 220),
      initiatorType: String(e.initiatorType || ""),
      duration: Math.round(Number(e.duration || 0)),
      transferKB: Math.round(((Number(e.transferSize || 0) / 1024) || 0) * 10) / 10,
      encodedKB: Math.round(((Number(e.encodedBodySize || 0) / 1024) || 0) * 10) / 10,
      decodedKB: Math.round(((Number(e.decodedBodySize || 0) / 1024) || 0) * 10) / 10,
      route: currentRoute(),
    }));
    const sorted = mapped.sort((a, b) => (b.transferKB || b.decodedKB || 0) - (a.transferKB || a.decodedKB || 0)).slice(0, 25);
    resourceLog = pushBounded(resourceLog, { at: nowIso(), route: currentRoute(), top: sorted }, 20);
    safeSet(RESOURCES_KEY, resourceLog);
    return sorted;
  } catch {
    return [];
  }
}

function saveSnapshot(extra?: any) {
  const snapshot = {
    at: nowIso(),
    route: currentRoute(),
    renderCount,
    routeCount: routeHistory.length,
    memory: getMemory(),
    timers: buildTimerSnapshot(),
    listeners: buildListenerSnapshot(),
    lastRuntimeError,
    lastPromiseError,
    extra: extra ?? null,
  };
  safeSet(SNAPSHOT_KEY, snapshot);
}

function sampleMemory(reason = "interval") {
  const mem = getMemory();
  if (!mem) return;
  const sample = {
    at: nowIso(),
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
  const t = buildTimerSnapshot();
  const l = buildListenerSnapshot();
  timerSnapshots = pushBounded(timerSnapshots, t, 40);
  listenerSnapshots = pushBounded(listenerSnapshots, l, 40);
  safeSet(TIMERS_KEY, timerSnapshots);
  safeSet(LISTENERS_KEY, listenerSnapshots);
  scanImages();
  scanResources();
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

function recordFetchEvent(evt: any) {
  fetchLog = pushBounded(fetchLog, { at: nowIso(), route: currentRoute(), ...evt }, MAX_NET);
  safeSet(FETCH_KEY, fetchLog);
}

function recordXhrEvent(evt: any) {
  xhrLog = pushBounded(xhrLog, { at: nowIso(), route: currentRoute(), ...evt }, MAX_NET);
  safeSet(XHR_KEY, xhrLog);
}

function installFetchProbe() {
  if (!hasWindow() || originalFetch || typeof window.fetch !== "function") return;
  originalFetch = window.fetch.bind(window);
  window.fetch = async (input: any, init?: any) => {
    const url = String(typeof input === "string" ? input : input?.url || "");
    const method = String(init?.method || input?.method || "GET");
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    inFlightFetch.set(key, { startedAt: Date.now(), url, route: currentRoute(), method });
    try {
      const res = await originalFetch(input, init);
      const duration = Date.now() - Number(inFlightFetch.get(key)?.startedAt || Date.now());
      recordFetchEvent({ key, method, url: url.slice(0, 220), ok: !!res?.ok, status: Number(res?.status || 0), duration });
      if (!res?.ok || duration > 3000) rememberEvent("fetch", { url: url.slice(0, 120), status: Number(res?.status || 0), duration });
      return res;
    } catch (e: any) {
      const duration = Date.now() - Number(inFlightFetch.get(key)?.startedAt || Date.now());
      recordFetchEvent({ key, method, url: url.slice(0, 220), ok: false, status: 0, duration, error: String(e?.message || e || "fetch failed") });
      rememberEvent("fetch-error", { url: url.slice(0, 120), duration, error: String(e?.message || e || "fetch failed") });
      throw e;
    } finally {
      inFlightFetch.delete(key);
    }
  };
}

function installXhrProbe() {
  if (!hasWindow() || originalXHROpen || typeof XMLHttpRequest === "undefined") return;
  originalXHROpen = XMLHttpRequest.prototype.open;
  originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
    (this as any).__diagMethod = method;
    (this as any).__diagUrl = url;
    return originalXHROpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(...args: any[]) {
    const startedAt = Date.now();
    const onDone = () => {
      try {
        const duration = Date.now() - startedAt;
        recordXhrEvent({
          method: String((this as any).__diagMethod || "GET"),
          url: String((this as any).__diagUrl || "").slice(0, 220),
          status: Number((this as any).status || 0),
          ok: Number((this as any).status || 0) >= 200 && Number((this as any).status || 0) < 400,
          duration,
        });
      } catch {}
    };
    this.addEventListener("loadend", onDone, { once: true } as any);
    return originalXHRSend.apply(this, args);
  };
}

function targetLabel(target: any) {
  try {
    if (target === window) return "window";
    if (target === document) return "document";
    if (target?.tagName) return String(target.tagName).toLowerCase();
    if (target?.constructor?.name) return String(target.constructor.name);
  } catch {}
  return "unknown";
}

function listenerKey(target: any, type: string) {
  return `${targetLabel(target)}::${String(type || "")}`;
}

function installEventListenerProbe() {
  if (!hasWindow() || originalAddEventListener || typeof EventTarget === "undefined") return;
  originalAddEventListener = EventTarget.prototype.addEventListener;
  originalRemoveEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function(type: any, listener: any, options?: any) {
    try {
      const key = listenerKey(this, String(type || ""));
      const prev = listenersState.get(key) || { count: 0, target: targetLabel(this), type: String(type || "") };
      prev.count += 1;
      listenersState.set(key, prev);
    } catch {}
    return originalAddEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function(type: any, listener: any, options?: any) {
    try {
      const key = listenerKey(this, String(type || ""));
      const prev = listenersState.get(key);
      if (prev) {
        prev.count = Math.max(0, prev.count - 1);
        if (prev.count === 0) listenersState.delete(key);
        else listenersState.set(key, prev);
      }
    } catch {}
    return originalRemoveEventListener.call(this, type, listener, options);
  };
}

function installTimerProbe() {
  if (!hasWindow() || originalSetTimeout || typeof window.setTimeout !== "function") return;
  originalSetTimeout = window.setTimeout.bind(window);
  originalClearTimeout = window.clearTimeout.bind(window);
  originalSetInterval = window.setInterval.bind(window);
  originalClearInterval = window.clearInterval.bind(window);

  window.setTimeout = ((handler: any, delay?: any, ...args: any[]) => {
    const id = originalSetTimeout((...cbArgs: any[]) => {
      try { activeTimeouts.delete(id); } catch {}
      if (typeof handler === "function") return handler(...cbArgs);
      return undefined;
    }, delay, ...args);
    activeTimeouts.set(id, { createdAt: Date.now(), delay: Number(delay || 0), route: currentRoute() });
    return id;
  }) as any;

  window.clearTimeout = ((id: any) => {
    try { activeTimeouts.delete(id); } catch {}
    return originalClearTimeout(id);
  }) as any;

  window.setInterval = ((handler: any, delay?: any, ...args: any[]) => {
    const id = originalSetInterval(handler, delay, ...args);
    activeIntervals.set(id, { createdAt: Date.now(), delay: Number(delay || 0), route: currentRoute() });
    return id;
  }) as any;

  window.clearInterval = ((id: any) => {
    try { activeIntervals.delete(id); } catch {}
    return originalClearInterval(id);
  }) as any;
}

async function getCacheInfo() {
  try {
    if (typeof caches === "undefined" || typeof caches.keys !== "function") return null;
    const names = await caches.keys();
    return {
      names,
      count: names.length,
    };
  } catch {
    return null;
  }
}

function buildProbableCauses(input: any) {
  const causes: string[] = [];
  const { memory, avatars, history, store, runtime, react, timers, listeners, network, resources, images } = input;

  if (runtime?.lastCrash?.message) causes.push(`Crash capturé: ${runtime.lastCrash.message}`);
  if (runtime?.runtimeError?.message) causes.push(`Erreur runtime persistée: ${runtime.runtimeError.message}`);
  if (runtime?.promiseError?.message) causes.push(`Promesse rejetée non gérée: ${runtime.promiseError.message}`);
  if (memory?.jsHeap?.pressure != null && memory.jsHeap.pressure >= 0.8) causes.push("Mémoire JS proche de la limite: possible fuite mémoire ou assets trop lourds.");
  if (memory?.trend?.risingFast) causes.push("La mémoire monte rapidement pendant la session.");
  if (avatars?.totalMB > 20) causes.push("Les avatars base64 sont très lourds.");
  if (history?.sizeMB > 20) causes.push("L'historique local est trop volumineux.");
  if (store?.sizeMB > 25) causes.push("Le store global devient trop gros.");
  if (react?.renderRatePerMin > 120) causes.push("Trop de re-renders React détectés.");
  if (react?.burstComponents?.length) causes.push(`Rendus excessifs détectés sur: ${react.burstComponents.slice(0, 3).map((x: any) => x.component).join(", ")}`);
  if (Array.isArray(runtime?.longTasks) && runtime.longTasks.length > 0) causes.push("Des tâches longues bloquent le thread principal.");
  if (timers?.activeIntervals > 30) causes.push("Trop d'intervalles actifs: probable fuite de timers.");
  if (timers?.oldIntervals > 10) causes.push("Beaucoup d'intervalles vivent trop longtemps sans nettoyage.");
  if (listeners?.totalActive > 120) causes.push("Trop de listeners actifs: probable fuite addEventListener/removeEventListener.");
  if (network?.failedCount > 5) causes.push("Plusieurs requêtes réseau ont échoué pendant la session.");
  if (network?.slowCount > 5) causes.push("Plusieurs requêtes réseau lentes ont été détectées.");
  if (images?.heavyCount > 0) causes.push("Des images ou avatars très lourds sont chargés à l'écran.");
  if (resources?.largestTransferKB > 1500) causes.push("Des ressources réseau volumineuses ralentissent fortement le chargement.");

  if (!causes.length) causes.push("Aucune cause évidente unique. Le crash semble contextuel ou intermittent.");
  return causes;
}

function buildRecommendations(input: any) {
  const recos: string[] = [];
  if (input.runtime?.lastCrash?.message || input.runtime?.runtimeError?.message || input.runtime?.promiseError?.message) {
    recos.push("Corriger d'abord la dernière stack capturée avant toute optimisation générale.");
  }
  if (input.memory?.trend?.risingFast) recos.push("Tester un écran ouvert plusieurs minutes puis comparer les samples mémoire avant/après navigation.");
  if (input.avatars?.totalMB > 20 || input.images?.heavyCount > 0) recos.push("Compresser les images lourdes et remplacer les base64 persistants par des fichiers/URLs.");
  if (input.history?.sizeMB > 20) recos.push("Archiver / compresser l'historique ancien hors du store principal.");
  if (input.react?.burstComponents?.length) recos.push("Inspecter les composants avec le plus de renders et vérifier leurs useEffect / state dérivés.");
  if (input.timers?.oldIntervals > 0) recos.push("Nettoyer les setInterval / setTimeout dans les useEffect de sortie.");
  if (input.listeners?.top?.length) recos.push("Contrôler les addEventListener non supprimés sur window/document.");
  if (input.network?.failedCount > 0) recos.push("Regarder les appels réseau en erreur juste avant le crash et ajouter un retry ou un guard UI.");
  if (!recos.length) recos.push("Reproduire le crash puis exporter le rapport juste après le redémarrage: le journal persistant gardera la trace.");
  return recos;
}

function installOnce() {
  if (!hasWindow() || started) return;
  started = true;
  getSession();
  rememberEvent("boot", { href: String(window.location.href || "") });
  if (!routeHistory.length) {
    routeHistory = pushBounded(routeHistory, currentRoute(), MAX_ROUTES);
    safeSet(ROUTE_KEY, routeHistory);
  }
  installTimerProbe();
  installEventListenerProbe();
  installFetchProbe();
  installXhrProbe();
  sampleMemory("boot");

  window.addEventListener("visibilitychange", () => {
    rememberEvent("visibility", { state: document.visibilityState });
    if (document.visibilityState === "hidden") saveSnapshot({ reason: "hidden" });
  });

  window.addEventListener("pagehide", () => saveSnapshot({ reason: "pagehide" }));
  window.addEventListener("beforeunload", () => saveSnapshot({ reason: "beforeunload" }));

  window.addEventListener("error", (e) => {
    const err = e?.error || e?.message || "Erreur inconnue";
    const payload = {
      at: nowIso(),
      type: "window.error",
      message: String(e?.message || e?.error?.message || err || ""),
      stack: String(e?.error?.stack || ""),
      href: String(window.location.href || ""),
      route: currentRoute(),
    };
    lastRuntimeError = payload;
    safeSet(`${KEY_PREFIX}:lastRuntimeError`, payload);
    rememberEvent("runtime-error", { message: payload.message });
    try { captureCrash("window.error", err, { source: e?.filename, raw: payload.stack || payload.message }); } catch {}
    saveSnapshot({ reason: "runtime-error" });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason;
    const payload = {
      at: nowIso(),
      type: "unhandledrejection",
      message: String(reason?.message || reason || "Promesse rejetée"),
      stack: String(reason?.stack || ""),
      href: String(window.location.href || ""),
      route: currentRoute(),
    };
    lastPromiseError = payload;
    safeSet(`${KEY_PREFIX}:lastPromiseError`, payload);
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
            at: nowIso(),
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

  if (!intervalsInstalled) {
    intervalsInstalled = true;
    window.setInterval(() => sampleMemory("interval"), SAMPLE_EVERY_MS);
    window.setInterval(() => {
      try {
        const t = buildTimerSnapshot();
        if (t.activeIntervals > 0 || t.activeTimeouts > 0) {
          timerSnapshots = pushBounded(timerSnapshots, t, 40);
          safeSet(TIMERS_KEY, timerSnapshots);
        }
      } catch {}
    }, 20000);
  }
}

installOnce();

export function trackRoute(route: string) {
  installOnce();
  const value = String(route || currentRoute() || "/");
  routeHistory = pushBounded(routeHistory, value, MAX_ROUTES);
  safeSet(ROUTE_KEY, routeHistory);
  rememberEvent("route", { route: value });
  saveSnapshot({ reason: "route", route: value });
}

export function trackRender(component = "App") {
  installOnce();
  renderCount += 1;
  safeSet(RENDER_KEY, renderCount);
  const ev = { at: nowIso(), component, renderCount, route: currentRoute() };
  renderEvents = pushBounded(renderEvents, ev, MAX_RENDER_EVENTS);
  safeSet(RENDER_EVENTS_KEY, renderEvents);
  if (renderCount <= 12 || renderCount % 20 === 0) {
    rememberEvent("render", { component, renderCount });
    saveSnapshot({ reason: "render", component, renderCount });
  }
}

export async function generateDiagnostic(): Promise<DiagnosticReport> {
  installOnce();
  const store = await loadStore();
  const mem = getMemory();
  const session = getSession();
  const lastCrash = getLastCrashReport();
  const crashLog = getCrashLog();
  const cacheInfo = await getCacheInfo();
  const storageEstimate = typeof navigator !== "undefined" && (navigator as any).storage?.estimate
    ? await (navigator as any).storage.estimate().catch(() => null)
    : null;

  const avatars = estimateAvatarMemory(store);
  const history = estimateHistorySize(store);
  const storeSize = estimateStoreSize(store);
  const minutes = Math.max(1, (Date.now() - Number(session?.bootAt || bootAt)) / 60000);
  const renderRatePerMin = Math.round((renderCount / minutes) * 10) / 10;
  const latestTimer = buildTimerSnapshot();
  const latestListener = buildListenerSnapshot();
  const latestImage = scanImages();
  const topResources = scanResources();

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

  const react = {
    renderCount,
    renderRatePerMin,
    recentRenders: renderEvents.slice(-25),
    byComponent: (() => {
      const map: any = {};
      for (const e of renderEvents) {
        const key = String(e?.component || "Unknown");
        map[key] = (map[key] || 0) + 1;
      }
      return Object.entries(map)
        .map(([component, count]) => ({ component, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 20);
    })(),
    burstComponents: (() => {
      const lastMinute = Date.now() - 60000;
      const map: any = {};
      for (const e of renderEvents) {
        const ts = Date.parse(String(e?.at || ""));
        if (!Number.isFinite(ts) || ts < lastMinute) continue;
        const key = String(e?.component || "Unknown");
        map[key] = (map[key] || 0) + 1;
      }
      return Object.entries(map).map(([component, count]) => ({ component, count })).filter((x: any) => x.count >= 8).sort((a: any, b: any) => b.count - a.count);
    })(),
  };

  const network = {
    fetch: fetchLog.slice(-30),
    xhr: xhrLog.slice(-30),
    failedCount: [...fetchLog, ...xhrLog].filter((x: any) => x && (x.ok === false || Number(x.status || 0) >= 400 || x.error)).length,
    slowCount: [...fetchLog, ...xhrLog].filter((x: any) => Number(x?.duration || 0) >= 3000).length,
    inFlight: [...inFlightFetch.values()].map((x) => ({ ...x, duration: Date.now() - x.startedAt })),
  };

  const resources = {
    cache: cacheInfo,
    top: topResources,
    largestTransferKB: topResources.length ? Math.max(...topResources.map((x: any) => Number(x.transferKB || x.decodedKB || 0))) : 0,
    snapshots: resourceLog.slice(-8),
  };

  const images = {
    current: latestImage,
    snapshots: imageSnapshots.slice(-8),
    heavyCount: Array.isArray(latestImage?.large) ? latestImage.large.length : 0,
  };

  const timers = {
    ...latestTimer,
    snapshots: timerSnapshots.slice(-10),
    oldTimeouts: [...activeTimeouts.values()].filter((x) => Date.now() - x.createdAt >= 60000).length,
    oldIntervals: [...activeIntervals.values()].filter((x) => Date.now() - x.createdAt >= 60000).length,
  };

  const listeners = {
    ...latestListener,
    snapshots: listenerSnapshots.slice(-10),
  };

  const storage = {
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
  };

  const crashGuard = getCrashGuardState();
  const crashGuardRoutes = getCrashGuardRouteHistory();

  const probableCause = buildProbableCauses({ memory, avatars, history, store: storeSize, runtime, react, timers, listeners, network, resources, images });
  const recommendations = buildRecommendations({ memory, avatars, history, runtime, react, timers, listeners, network, resources, images });

  if (crashGuard?.routeLoopDetected) {
    probableCause.unshift("CrashGuard: boucle de navigation détectée");
  }
  if (Number(crashGuard?.renderCountMinute || 0) >= 500) {
    probableCause.unshift(`CrashGuard: tempête de renders (${crashGuard.renderCountMinute}/min)`);
  }
  if (Number(crashGuard?.memoryUsedMB || 0) >= 900) {
    probableCause.unshift(`CrashGuard: mémoire critique (${crashGuard.memoryUsedMB} MB)`);
  }
  if (Array.isArray(crashGuard?.actions) && crashGuard.actions.length) {
    recommendations.unshift(`CrashGuard actif — dernière action: ${String(crashGuard.actions[0])}`);
  } else {
    recommendations.unshift("CrashGuard actif — surveillance mémoire / avatars / historique / renders.");
  }

  return {
    generatedAt: nowIso(),
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
    storage,
    runtime,
    react,
    network,
    resources,
    images,
    timers,
    listeners,
    crashGuard: {
      ...crashGuard,
      trackedRoutes: crashGuardRoutes,
    },
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
  a.download = `multisports_diagnostic_ultra_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
