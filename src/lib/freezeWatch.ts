// src/lib/freezeWatch.ts
// ============================================================
// P0 FREEZE WATCHDOG — diagnostic persistant, volontaire et léger.
//
// Objectif : capturer ce qui se passe JUSTE AVANT un gel Android/WebView,
// y compris quand l'utilisateur doit tuer l'application.
// - heartbeat persistant (route, mémoire, visibilité)
// - détection du retard de l'event-loop (main-thread stall)
// - marqueur d'opération lourde écrit AVANT son exécution
// - journal circulaire borné
// - récupération au prochain démarrage d'une opération restée active
//
// Le watchdog est OFF par défaut. Il est activé depuis Réglages > Développeur
// > Diagnostic et reste actif après redémarrage jusqu'à désactivation.
// ============================================================

export type FreezeWatchOperation = {
  token: string;
  label: string;
  startedAt: number;
  route: string;
  meta?: Record<string, any> | null;
};

export type FreezeWatchEvent = {
  at: number;
  kind: string;
  route: string;
  durationMs?: number;
  label?: string;
  meta?: any;
  activeOps?: FreezeWatchOperation[];
};

export type FreezeWatchHeartbeat = {
  _v: 1;
  sessionId: string;
  seq: number;
  at: number;
  route: string;
  visibility: string;
  lagMs: number;
  memory: null | { usedMB: number; totalMB: number; limitMB: number; pressure: number | null };
  activeOps: FreezeWatchOperation[];
  cleanExit?: boolean;
  reason?: string;
};

export type FreezeRuntimeProbe = {
  token: string;
  label: string;
  startedAt: number;
  route: string;
  meta?: Record<string, any> | null;
};

export type FreezeRuntimeTrace = {
  at: number;
  phase: "start" | "end" | "evidence";
  label: string;
  route: string;
  durationMs?: number;
  meta?: Record<string, any> | null;
};

export type FreezePerformanceEvidence = {
  lastLongTask?: any;
  lastLongAnimationFrame?: any;
  lastEventTiming?: any;
  lastReactCommit?: any;
};

export type FreezeWatchHardFreezeReport = {
  key: "latest";
  kind: "freeze" | "recovered";
  sessionId: string;
  detectedAt: number;
  recoveredAt?: number;
  gapMs: number;
  route: string;
  visibility: string;
  memory: FreezeWatchHeartbeat["memory"];
  activeOps: FreezeWatchOperation[];
  runtimeProbe?: FreezeRuntimeProbe | null;
  recentTrace?: FreezeRuntimeTrace[];
  performanceEvidence?: FreezePerformanceEvidence | null;
  note: string;
};

const ENABLED_KEY = "dc_freeze_watch_enabled_v1";
const HEARTBEAT_KEY = "dc_freeze_watch_heartbeat_v1";
const ACTIVE_OPS_KEY = "dc_freeze_watch_active_ops_v1";
const EVENTS_KEY = "dc_freeze_watch_events_v1";
const INTERRUPTED_KEY = "dc_freeze_watch_interrupted_v1";
const HISTORY_AUDIT_KEY = "dc_freeze_watch_history_audit_v1";
const EVIDENCE_KEY = "dc_freeze_watch_evidence_v4";
const HARD_FREEZE_DB = "dc-freeze-watchdog-v1";
const HARD_FREEZE_STORE = "state";
const HARD_FREEZE_KEY = "latest";

const MAX_EVENTS = 80;
const HEARTBEAT_INTERVAL_MS = 1500;
const HEARTBEAT_PERSIST_EVERY_MS = 4500;
const STALL_THRESHOLD_MS = 900;
const SLOW_OPERATION_MS = 250;
const RUNTIME_TRACE_MAX = 28;
const TIMER_PROBE_MIN_DELAY_MS = 250;
const LARGE_JSON_CHARS = 100_000;
const LARGE_STORAGE_CHARS = 100_000;

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
let started = false;
let timerId: number | null = null;
let hardFreezeWorker: Worker | null = null;
let hardFreezeHeartbeatTimer: number | null = null;
let lifecycleHooksInstalled = false;
let seq = 0;
let lastTickPerf = 0;
let lastHeartbeatPersistAt = 0;
let opSeq = 0;
let runtimeProbeSeq = 0;
const activeOps = new Map<string, FreezeWatchOperation>();
const runtimeProbes = new Map<string, FreezeRuntimeProbe>();
let runtimeTrace: FreezeRuntimeTrace[] = [];
let performanceEvidence: FreezePerformanceEvidence = {};
let runtimeInstrumentationInstalled = false;
let performanceObserversInstalled = false;
let originalWatchSetTimeout: any = null;
let originalWatchSetInterval: any = null;
let originalWatchRequestIdleCallback: any = null;
let originalWatchJsonParse: any = null;
let originalWatchJsonStringify: any = null;
let originalWatchStorageSetItem: any = null;
let originalWatchAtob: any = null;
let originalWatchBtoa: any = null;

function hasWindow() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: any) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function removeKey(key: string) {
  if (!hasWindow()) return;
  try { window.localStorage.removeItem(key); } catch {}
}

function currentRoute() {
  if (!hasWindow()) return "/";
  try {
    return String(window.location.hash || window.location.pathname || "/");
  } catch {
    return "/";
  }
}

function visibilityState() {
  try {
    return typeof document !== "undefined" ? String(document.visibilityState || "unknown") : "unknown";
  } catch {
    return "unknown";
  }
}

function memorySnapshot() {
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

function captureCallsite(): string {
  try {
    const raw = String(new Error("freeze-watch-callsite").stack || "");
    return raw
      .split("\n")
      .filter((line) => !line.includes("freezeWatch.ts") && !line.includes("freeze-watch-callsite"))
      .slice(0, 9)
      .join("\n")
      .slice(0, 2200);
  } catch {
    return "";
  }
}

function currentRuntimeProbe(): FreezeRuntimeProbe | null {
  const rows = Array.from(runtimeProbes.values()).sort((a, b) => a.startedAt - b.startedAt);
  const row = rows.length ? rows[rows.length - 1] : null;
  return row ? { ...row, meta: row.meta ? { ...row.meta } : null } : null;
}

function pushRuntimeTrace(row: FreezeRuntimeTrace) {
  runtimeTrace = [...runtimeTrace, row].slice(-RUNTIME_TRACE_MAX);
}

function persistPerformanceEvidence() {
  writeJson(EVIDENCE_KEY, { at: Date.now(), ...performanceEvidence });
}

function beginRuntimeProbe(label: string, meta?: Record<string, any> | null): string | null {
  if (!isFreezeWatchEnabled()) return null;
  const token = `rp-${Date.now()}-${++runtimeProbeSeq}`;
  const probe: FreezeRuntimeProbe = {
    token,
    label,
    startedAt: Date.now(),
    route: currentRoute(),
    meta: meta ? { ...meta } : null,
  };
  runtimeProbes.set(token, probe);
  pushRuntimeTrace({ at: probe.startedAt, phase: "start", label, route: probe.route, meta: probe.meta });
  // Le Worker reçoit le suspect AVANT l'exécution du callback.
  postHardFreezeState("state");
  return token;
}

function endRuntimeProbe(token: string | null | undefined, meta?: Record<string, any> | null) {
  if (!token) return;
  const probe = runtimeProbes.get(token);
  if (!probe) return;
  runtimeProbes.delete(token);
  const durationMs = Math.max(0, Date.now() - probe.startedAt);
  pushRuntimeTrace({
    at: Date.now(),
    phase: "end",
    label: probe.label,
    route: currentRoute(),
    durationMs,
    meta: { ...(probe.meta || {}), ...(meta || {}) },
  });
  if (durationMs >= SLOW_OPERATION_MS) {
    appendEvent({
      at: Date.now(),
      kind: durationMs >= STALL_THRESHOLD_MS ? "runtime-probe-critical" : "runtime-probe-slow",
      route: currentRoute(),
      durationMs,
      label: probe.label,
      meta: { ...(probe.meta || {}), ...(meta || {}) },
    });
  }
  postHardFreezeState("state");
}

function heavyStringifyCandidate(value: any): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.length >= 40;
  try {
    return (
      "history" in value || "profiles" in value || "matches" in value ||
      "records" in value || "snapshot" in value || "backup" in value ||
      "payload" in value || "stats" in value || "organizations" in value
    );
  } catch {
    return false;
  }
}

function installRuntimeInstrumentation() {
  if (!hasWindow() || runtimeInstrumentationInstalled || !isFreezeWatchEnabled()) return;
  runtimeInstrumentationInstalled = true;

  try {
    originalWatchSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: any, delay?: any, ...args: any[]) => {
      const ms = Math.max(0, Number(delay || 0));
      if (typeof handler !== "function" || ms < TIMER_PROBE_MIN_DELAY_MS) {
        return originalWatchSetTimeout(handler, delay, ...args);
      }
      const registeredAt = Date.now();
      const registeredRoute = currentRoute();
      const registrationStack = captureCallsite();
      let id: any = null;
      id = originalWatchSetTimeout((...cbArgs: any[]) => {
        const token = beginRuntimeProbe("timer.setTimeout", {
          delayMs: ms,
          ageMs: Date.now() - registeredAt,
          timerId: String(id),
          handlerName: String(handler?.name || "anonymous"),
          registeredRoute,
          registrationStack,
        });
        try { return handler(...cbArgs); }
        finally { endRuntimeProbe(token); }
      }, delay, ...args);
      return id;
    }) as any;
  } catch {}

  try {
    originalWatchSetInterval = window.setInterval.bind(window);
    window.setInterval = ((handler: any, delay?: any, ...args: any[]) => {
      const ms = Math.max(0, Number(delay || 0));
      if (typeof handler !== "function" || ms < TIMER_PROBE_MIN_DELAY_MS) {
        return originalWatchSetInterval(handler, delay, ...args);
      }
      const registeredAt = Date.now();
      const registeredRoute = currentRoute();
      const registrationStack = captureCallsite();
      let id: any = null;
      id = originalWatchSetInterval((...cbArgs: any[]) => {
        const token = beginRuntimeProbe("timer.setInterval", {
          delayMs: ms,
          ageMs: Date.now() - registeredAt,
          timerId: String(id),
          handlerName: String(handler?.name || "anonymous"),
          registeredRoute,
          registrationStack,
        });
        try { return handler(...cbArgs); }
        finally { endRuntimeProbe(token); }
      }, delay, ...args);
      return id;
    }) as any;
  } catch {}

  try {
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === "function") {
      originalWatchRequestIdleCallback = ric.bind(window);
      (window as any).requestIdleCallback = (handler: any, options?: any) => {
        if (typeof handler !== "function") return originalWatchRequestIdleCallback(handler, options);
        const registrationStack = captureCallsite();
        const registeredRoute = currentRoute();
        return originalWatchRequestIdleCallback((deadline: any) => {
          const token = beginRuntimeProbe("runtime.requestIdleCallback", { handlerName: String(handler?.name || "anonymous"), registeredRoute, registrationStack });
          try { return handler(deadline); }
          finally { endRuntimeProbe(token); }
        }, options);
      };
    }
  } catch {}

  try {
    originalWatchJsonParse = JSON.parse.bind(JSON);
    (JSON as any).parse = (text: any, reviver?: any) => {
      if (typeof text !== "string" || text.length < LARGE_JSON_CHARS) return originalWatchJsonParse(text, reviver);
      const token = beginRuntimeProbe("json.parse.large", { chars: text.length, registrationStack: captureCallsite() });
      try { return originalWatchJsonParse(text, reviver); }
      finally { endRuntimeProbe(token); }
    };
  } catch {}

  try {
    originalWatchJsonStringify = JSON.stringify.bind(JSON);
    (JSON as any).stringify = (value: any, replacer?: any, space?: any) => {
      if (!heavyStringifyCandidate(value)) return originalWatchJsonStringify(value, replacer, space);
      const token = beginRuntimeProbe("json.stringify.store-like", { registrationStack: captureCallsite() });
      let out: any;
      try {
        out = originalWatchJsonStringify(value, replacer, space);
        return out;
      } finally {
        endRuntimeProbe(token, { chars: typeof out === "string" ? out.length : null });
      }
    };
  } catch {}

  try {
    if (typeof Storage !== "undefined" && Storage.prototype?.setItem) {
      originalWatchStorageSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key: string, value: string) {
        const size = typeof value === "string" ? value.length : 0;
        if (size < LARGE_STORAGE_CHARS) return originalWatchStorageSetItem.call(this, key, value);
        const token = beginRuntimeProbe("storage.setItem.large", {
          key: String(key || ""),
          chars: size,
          registrationStack: captureCallsite(),
        });
        try { return originalWatchStorageSetItem.call(this, key, value); }
        finally { endRuntimeProbe(token); }
      };
    }
  } catch {}

  try {
    if (typeof window.atob === "function") {
      originalWatchAtob = window.atob.bind(window);
      window.atob = ((value: string) => {
        if (typeof value !== "string" || value.length < LARGE_JSON_CHARS) return originalWatchAtob(value);
        const token = beginRuntimeProbe("base64.atob.large", { chars: value.length, registrationStack: captureCallsite() });
        try { return originalWatchAtob(value); }
        finally { endRuntimeProbe(token); }
      }) as any;
    }
    if (typeof window.btoa === "function") {
      originalWatchBtoa = window.btoa.bind(window);
      window.btoa = ((value: string) => {
        if (typeof value !== "string" || value.length < LARGE_JSON_CHARS) return originalWatchBtoa(value);
        const token = beginRuntimeProbe("base64.btoa.large", { chars: value.length, registrationStack: captureCallsite() });
        try { return originalWatchBtoa(value); }
        finally { endRuntimeProbe(token); }
      }) as any;
    }
  } catch {}
}

function restoreRuntimeInstrumentation() {
  if (!hasWindow() || !runtimeInstrumentationInstalled) return;
  try { if (originalWatchSetTimeout) window.setTimeout = originalWatchSetTimeout as any; } catch {}
  try { if (originalWatchSetInterval) window.setInterval = originalWatchSetInterval as any; } catch {}
  try { if (originalWatchRequestIdleCallback) (window as any).requestIdleCallback = originalWatchRequestIdleCallback; } catch {}
  try { if (originalWatchJsonParse) (JSON as any).parse = originalWatchJsonParse; } catch {}
  try { if (originalWatchJsonStringify) (JSON as any).stringify = originalWatchJsonStringify; } catch {}
  try { if (originalWatchStorageSetItem && typeof Storage !== "undefined") Storage.prototype.setItem = originalWatchStorageSetItem; } catch {}
  try { if (originalWatchAtob) window.atob = originalWatchAtob; } catch {}
  try { if (originalWatchBtoa) window.btoa = originalWatchBtoa; } catch {}
  runtimeInstrumentationInstalled = false;
  runtimeProbes.clear();
}

function installPerformanceEvidenceObservers() {
  if (!hasWindow() || performanceObserversInstalled || !isFreezeWatchEnabled()) return;
  performanceObserversInstalled = true;
  const PO: any = (window as any).PerformanceObserver;
  if (typeof PO !== "function") return;
  const supported: string[] = Array.isArray(PO.supportedEntryTypes) ? PO.supportedEntryTypes : [];

  const saveEvidence = (key: keyof FreezePerformanceEvidence, value: any) => {
    if (!isFreezeWatchEnabled()) return;
    (performanceEvidence as any)[key] = value;
    pushRuntimeTrace({ at: Date.now(), phase: "evidence", label: String(key), route: currentRoute(), meta: value });
    persistPerformanceEvidence();
    postHardFreezeState("state");
  };

  try {
    if (supported.includes("long-animation-frame")) {
      const obs = new PO((list: any) => {
        for (const entry of list.getEntries()) {
          const duration = Math.round(Number(entry.duration || 0));
          if (duration < 120) continue;
          const scripts = (Array.isArray((entry as any).scripts) ? (entry as any).scripts : []).slice(0, 6).map((x: any) => ({
            sourceURL: String(x?.sourceURL || "").slice(0, 500),
            functionName: String(x?.functionName || "").slice(0, 180),
            invoker: String(x?.invoker || x?.invokerType || "").slice(0, 220),
            duration: Math.round(Number(x?.duration || 0)),
            executionDuration: Math.round(Number(x?.executionDuration || 0)),
            forcedStyleAndLayoutDuration: Math.round(Number(x?.forcedStyleAndLayoutDuration || 0)),
          }));
          saveEvidence("lastLongAnimationFrame", {
            at: Date.now(),
            duration,
            blockingDuration: Math.round(Number((entry as any).blockingDuration || 0)),
            renderStart: Math.round(Number((entry as any).renderStart || 0)),
            styleAndLayoutStart: Math.round(Number((entry as any).styleAndLayoutStart || 0)),
            scripts,
            route: currentRoute(),
          });
        }
      });
      obs.observe({ type: "long-animation-frame", buffered: true });
    }
  } catch {}

  try {
    if (supported.includes("longtask")) {
      const obs = new PO((list: any) => {
        for (const entry of list.getEntries()) {
          const duration = Math.round(Number(entry.duration || 0));
          if (duration < 120) continue;
          saveEvidence("lastLongTask", { at: Date.now(), duration, name: String(entry.name || "longtask"), route: currentRoute() });
        }
      });
      obs.observe({ type: "longtask", buffered: true });
    }
  } catch {}

  try {
    if (supported.includes("event")) {
      const obs = new PO((list: any) => {
        for (const entry of list.getEntries()) {
          const duration = Math.round(Number(entry.duration || 0));
          if (duration < 120) continue;
          saveEvidence("lastEventTiming", {
            at: Date.now(),
            duration,
            name: String(entry.name || "event"),
            interactionId: Number((entry as any).interactionId || 0),
            route: currentRoute(),
          });
        }
      });
      obs.observe({ type: "event", buffered: true, durationThreshold: 120 });
    }
  } catch {}
}

function copyActiveOps(): FreezeWatchOperation[] {
  return Array.from(activeOps.values())
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-8)
    .map((op) => ({ ...op, meta: op.meta ? { ...op.meta } : null }));
}

function persistActiveOps() {
  const rows = copyActiveOps();
  if (rows.length) writeJson(ACTIVE_OPS_KEY, { sessionId: SESSION_ID, at: Date.now(), rows });
  else removeKey(ACTIVE_OPS_KEY);
}

function appendEvent(event: FreezeWatchEvent) {
  const rows = readJson<FreezeWatchEvent[]>(EVENTS_KEY, []);
  const next = [...(Array.isArray(rows) ? rows : []), event].slice(-MAX_EVENTS);
  writeJson(EVENTS_KEY, next);
}

function buildHeartbeat(lagMs = 0, reason?: string, cleanExit = false): FreezeWatchHeartbeat {
  return {
    _v: 1,
    sessionId: SESSION_ID,
    seq: ++seq,
    at: Date.now(),
    route: currentRoute(),
    visibility: visibilityState(),
    lagMs: Math.max(0, Math.round(lagMs)),
    memory: memorySnapshot(),
    activeOps: copyActiveOps(),
    cleanExit: cleanExit || undefined,
    reason,
  };
}

function persistHeartbeat(lagMs = 0, reason?: string, cleanExit = false) {
  const hb = buildHeartbeat(lagMs, reason, cleanExit);
  writeJson(HEARTBEAT_KEY, hb);
  lastHeartbeatPersistAt = Date.now();
  return hb;
}


function buildHardFreezeWorkerSource() {
  return `
const DB_NAME=${JSON.stringify(HARD_FREEZE_DB)};
const STORE_NAME=${JSON.stringify(HARD_FREEZE_STORE)};
const REPORT_KEY=${JSON.stringify(HARD_FREEZE_KEY)};
let latest=null;
let lastBeat=0;
let freezeOpen=false;
let freezeStartedAt=0;
let freezeSnapshot=null;
function openDb(){return new Promise((resolve,reject)=>{try{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}catch(e){reject(e);}});}
async function save(report){try{const db=await openDb();await new Promise((resolve)=>{try{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).put({key:REPORT_KEY,value:report});tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();tx.onabort=()=>resolve();}catch{resolve();}});try{db.close();}catch{}}catch{}}
function report(kind,gapMs){const now=Date.now();return {key:REPORT_KEY,kind,sessionId:String(latest?.sessionId||''),detectedAt:freezeStartedAt||now,recoveredAt:kind==='recovered'?now:undefined,gapMs:Math.max(0,Math.round(gapMs||0)),route:String(latest?.route||'/'),visibility:String(latest?.visibility||'unknown'),memory:latest?.memory||null,activeOps:Array.isArray(latest?.activeOps)?latest.activeOps.slice(-8):[],runtimeProbe:latest?.runtimeProbe||null,recentTrace:Array.isArray(latest?.recentTrace)?latest.recentTrace.slice(-14):[],performanceEvidence:latest?.performanceEvidence||null,note:kind==='freeze'?'UI heartbeat missing while app remained visible.':'UI heartbeat resumed after a hard stall.'};}
self.onmessage=(event)=>{const msg=event?.data||{};if(msg.type==='stop'){latest=null;lastBeat=0;freezeOpen=false;return;}if(msg.type==='beat'||msg.type==='state'){latest=msg.payload||latest;if(msg.type==='beat'){const now=Date.now();if(freezeOpen){const recovered={...(freezeSnapshot||report('freeze',now-freezeStartedAt)),kind:'recovered',recoveredAt:now,gapMs:Math.max(0,now-freezeStartedAt),note:'UI heartbeat resumed after a hard stall.'};void save(recovered);freezeOpen=false;freezeSnapshot=null;}lastBeat=now;}}};
setInterval(()=>{if(!latest||!lastBeat)return;if(String(latest.visibility||'visible')!=='visible')return;const gap=Date.now()-lastBeat;if(gap>=4000&&!freezeOpen){freezeOpen=true;freezeStartedAt=lastBeat;freezeSnapshot=report('freeze',gap);void save(freezeSnapshot);}},750);
`;
}

function hardFreezePayload() {
  return {
    sessionId: SESSION_ID,
    route: currentRoute(),
    visibility: visibilityState(),
    memory: memorySnapshot(),
    activeOps: copyActiveOps(),
    runtimeProbe: currentRuntimeProbe(),
    recentTrace: runtimeTrace.slice(-14),
    performanceEvidence: { ...performanceEvidence },
  };
}

function postHardFreezeState(type: "beat" | "state" = "state") {
  if (!hardFreezeWorker) return;
  try { hardFreezeWorker.postMessage({ type, payload: hardFreezePayload() }); } catch {}
}

function startHardFreezeWorker() {
  if (!hasWindow() || hardFreezeWorker || !isFreezeWatchEnabled()) return;
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return;
  try {
    const blob = new Blob([buildHardFreezeWorkerSource()], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    hardFreezeWorker = new Worker(url);
    window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 1500);
    postHardFreezeState("beat");
    hardFreezeHeartbeatTimer = window.setInterval(() => postHardFreezeState("beat"), 700);
  } catch {
    hardFreezeWorker = null;
  }
}

function stopHardFreezeWorker() {
  if (hardFreezeHeartbeatTimer != null) {
    try { window.clearInterval(hardFreezeHeartbeatTimer); } catch {}
    hardFreezeHeartbeatTimer = null;
  }
  if (hardFreezeWorker) {
    try { hardFreezeWorker.postMessage({ type: "stop" }); } catch {}
    try { hardFreezeWorker.terminate(); } catch {}
    hardFreezeWorker = null;
  }
}

function openHardFreezeDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(HARD_FREEZE_DB, 1);
      req.onupgradeneeded = () => {
        try { if (!req.result.objectStoreNames.contains(HARD_FREEZE_STORE)) req.result.createObjectStore(HARD_FREEZE_STORE, { keyPath: "key" }); } catch {}
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function getHardFreezeReport(): Promise<FreezeWatchHardFreezeReport | null> {
  const db = await openHardFreezeDb();
  if (!db) return null;
  try {
    return await new Promise<FreezeWatchHardFreezeReport | null>((resolve) => {
      try {
        const tx = db.transaction(HARD_FREEZE_STORE, "readonly");
        const req = tx.objectStore(HARD_FREEZE_STORE).get(HARD_FREEZE_KEY);
        req.onsuccess = () => resolve((req.result?.value || null) as FreezeWatchHardFreezeReport | null);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  } finally {
    try { db.close(); } catch {}
  }
}

export async function clearHardFreezeReport(): Promise<void> {
  const db = await openHardFreezeDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(HARD_FREEZE_STORE, "readwrite");
        tx.objectStore(HARD_FREEZE_STORE).delete(HARD_FREEZE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch { resolve(); }
    });
  } finally {
    try { db.close(); } catch {}
  }
}

function recoverPreviousInterruptedSession() {
  const previous = readJson<FreezeWatchHeartbeat | null>(HEARTBEAT_KEY, null);
  const previousOpsWrap = readJson<any>(ACTIVE_OPS_KEY, null);
  const previousOps: FreezeWatchOperation[] = Array.isArray(previousOpsWrap?.rows) ? previousOpsWrap.rows : [];

  if (!previous || previous.sessionId === SESSION_ID) return;

  const ageMs = Math.max(0, Date.now() - Number(previous.at || 0));
  const wasVisible = String(previous.visibility || "") === "visible";
  const suspicious = !previous.cleanExit && (wasVisible || previousOps.length > 0);

  if (suspicious) {
    const interrupted = {
      detectedAt: Date.now(),
      previousHeartbeat: previous,
      staleActiveOps: previousOps,
      heartbeatAgeMs: ageMs,
      reason: previousOps.length
        ? "previous-session-ended-with-active-operation"
        : "previous-session-ended-while-visible",
    };
    writeJson(INTERRUPTED_KEY, interrupted);
    appendEvent({
      at: Date.now(),
      kind: "previous-session-interrupted",
      route: String(previous.route || "/"),
      durationMs: ageMs,
      meta: { reason: interrupted.reason, staleActiveOps: previousOps },
    });
  }

  // Les marqueurs appartenaient à l'ancienne session. Le rapport interrompu les
  // conserve dans INTERRUPTED_KEY, mais ils ne doivent pas rester "actifs".
  removeKey(ACTIVE_OPS_KEY);
}

function onWatchTick() {
  const nowPerf = (() => {
    try { return performance.now(); } catch { return Date.now(); }
  })();
  const expected = lastTickPerf > 0 ? lastTickPerf + HEARTBEAT_INTERVAL_MS : nowPerf;
  const lagMs = Math.max(0, nowPerf - expected);
  lastTickPerf = nowPerf;

  // Android suspend les timers en arrière-plan : ne jamais interpréter cela
  // comme un freeze UI.
  const visible = visibilityState() === "visible";
  if (visible && lagMs >= STALL_THRESHOLD_MS) {
    const event: FreezeWatchEvent = {
      at: Date.now(),
      kind: "main-thread-stall",
      route: currentRoute(),
      durationMs: Math.round(lagMs),
      activeOps: copyActiveOps(),
      meta: { memory: memorySnapshot() },
    };
    appendEvent(event);
    // Stall = événement important, heartbeat immédiat.
    persistHeartbeat(lagMs, "main-thread-stall");
    return;
  }

  if (Date.now() - lastHeartbeatPersistAt >= HEARTBEAT_PERSIST_EVERY_MS) {
    persistHeartbeat(lagMs, "heartbeat");
  }
}

function installLifecycleHooks() {
  if (!hasWindow() || lifecycleHooksInstalled) return;
  lifecycleHooksInstalled = true;
  window.addEventListener("visibilitychange", () => {
    if (!isFreezeWatchEnabled()) return;
    lastTickPerf = (() => { try { return performance.now(); } catch { return Date.now(); } })();
    persistHeartbeat(0, `visibility:${visibilityState()}`, visibilityState() === "hidden");
    postHardFreezeState("state");
  });
  window.addEventListener("pagehide", () => {
    if (!isFreezeWatchEnabled()) return;
    persistHeartbeat(0, "pagehide", true);
  });
  window.addEventListener("beforeunload", () => {
    if (!isFreezeWatchEnabled()) return;
    persistHeartbeat(0, "beforeunload", true);
  });
}

export function isFreezeWatchEnabled(): boolean {
  if (!hasWindow()) return false;
  try { return window.localStorage.getItem(ENABLED_KEY) === "1"; } catch { return false; }
}

export function startFreezeWatchIfEnabled(): boolean {
  if (!hasWindow() || !isFreezeWatchEnabled()) return false;
  if (started) return true;
  started = true;
  recoverPreviousInterruptedSession();
  installLifecycleHooks();
  startHardFreezeWorker();
  lastTickPerf = (() => { try { return performance.now(); } catch { return Date.now(); } })();
  persistHeartbeat(0, "watch-start");
  try {
    // Le timer du watchdog doit rester natif et ne pas s'auto-profiler.
    timerId = window.setInterval(onWatchTick, HEARTBEAT_INTERVAL_MS);
  } catch {
    timerId = null;
  }
  installPerformanceEvidenceObservers();
  installRuntimeInstrumentation();
  appendEvent({ at: Date.now(), kind: "watch-start", route: currentRoute(), meta: getDeviceSummary() });
  return true;
}

export function setFreezeWatchEnabled(enabled: boolean): boolean {
  if (!hasWindow()) return false;
  try { window.localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0"); } catch {}
  if (enabled) {
    startFreezeWatchIfEnabled();
    persistHeartbeat(0, "enabled-by-user");
    return true;
  }
  if (timerId != null) {
    try { window.clearInterval(timerId); } catch {}
    timerId = null;
  }
  started = false;
  stopHardFreezeWorker();
  restoreRuntimeInstrumentation();
  activeOps.clear();
  runtimeProbes.clear();
  removeKey(ACTIVE_OPS_KEY);
  persistHeartbeat(0, "disabled-by-user", true);
  return false;
}

export function beginFreezeOperation(label: string, meta?: Record<string, any> | null): string | null {
  if (!isFreezeWatchEnabled()) return null;
  startFreezeWatchIfEnabled();
  const token = `${Date.now()}-${++opSeq}-${Math.random().toString(36).slice(2, 6)}`;
  const op: FreezeWatchOperation = {
    token,
    label: String(label || "operation"),
    startedAt: Date.now(),
    route: currentRoute(),
    meta: meta ? { ...meta } : null,
  };
  activeOps.set(token, op);
  // Écriture synchrone intentionnelle : si le WebView gèle dans l'opération qui
  // suit, ce marqueur survit au kill de l'application.
  persistActiveOps();
  postHardFreezeState("state");
  return token;
}

export function endFreezeOperation(token: string | null | undefined, meta?: Record<string, any> | null) {
  if (!token) return;
  const op = activeOps.get(token);
  if (!op) return;
  activeOps.delete(token);
  persistActiveOps();
  postHardFreezeState("state");
  const durationMs = Math.max(0, Date.now() - Number(op.startedAt || Date.now()));
  if (durationMs >= SLOW_OPERATION_MS || meta?.error) {
    appendEvent({
      at: Date.now(),
      kind: durationMs >= STALL_THRESHOLD_MS ? "slow-operation-critical" : "slow-operation",
      route: currentRoute(),
      durationMs,
      label: op.label,
      meta: { ...(op.meta || {}), ...(meta || {}) },
      activeOps: copyActiveOps(),
    });
    persistHeartbeat(0, `operation:${op.label}`);
  }
}

export function recordFreezeWatchEvent(kind: string, meta?: any) {
  if (!isFreezeWatchEnabled()) return;
  startFreezeWatchIfEnabled();
  appendEvent({ at: Date.now(), kind: String(kind || "event"), route: currentRoute(), meta });
}

export function saveFreezeHistoryAudit(audit: any) {
  if (!hasWindow()) return;
  writeJson(HISTORY_AUDIT_KEY, { at: Date.now(), ...audit });
  if (isFreezeWatchEnabled()) recordFreezeWatchEvent("history-audit", {
    rows: audit?.rows,
    totalApproxMB: audit?.totalApproxMB,
    largestApproxKB: audit?.largest?.[0]?.approxKB,
  });
}

export function clearFreezeWatchData(options?: { keepEnabled?: boolean }) {
  const keepEnabled = options?.keepEnabled !== false;
  const wasEnabled = isFreezeWatchEnabled();
  for (const key of [HEARTBEAT_KEY, ACTIVE_OPS_KEY, EVENTS_KEY, INTERRUPTED_KEY, HISTORY_AUDIT_KEY, EVIDENCE_KEY]) removeKey(key);
  void clearHardFreezeReport();
  activeOps.clear();
  if (!keepEnabled) {
    try { window.localStorage.removeItem(ENABLED_KEY); } catch {}
  } else if (wasEnabled) {
    persistHeartbeat(0, "logs-cleared");
  }
}

export function recordReactFreezeCommit(
  id: string,
  phase: string,
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  if (!isFreezeWatchEnabled()) return;
  const duration = Math.round(Number(actualDuration || 0));
  if (duration < 80) return;
  performanceEvidence.lastReactCommit = {
    at: Date.now(),
    id: String(id || "AppRoot"),
    phase: String(phase || "update"),
    actualDuration: duration,
    baseDuration: Math.round(Number(baseDuration || 0)),
    startTime: Math.round(Number(startTime || 0)),
    commitTime: Math.round(Number(commitTime || 0)),
    route: currentRoute(),
  };
  pushRuntimeTrace({ at: Date.now(), phase: "evidence", label: "react.commit", route: currentRoute(), meta: performanceEvidence.lastReactCommit });
  persistPerformanceEvidence();
  postHardFreezeState("state");
}

function nearestEvidence(report: FreezeWatchHardFreezeReport | null, snapshotEvidence: any) {
  const evidence = report?.performanceEvidence || snapshotEvidence || {};
  const rows: any[] = [
    ["Long Animation Frame", evidence?.lastLongAnimationFrame],
    ["Long Task", evidence?.lastLongTask],
    ["Interaction lente", evidence?.lastEventTiming],
    ["Commit React", evidence?.lastReactCommit],
  ].filter((x: any) => x?.[1]);
  if (!rows.length) return null;
  const target = Number(report?.recoveredAt || report?.detectedAt || Date.now());
  rows.sort((a: any, b: any) => Math.abs(target - Number(a[1]?.at || 0)) - Math.abs(target - Number(b[1]?.at || 0)));
  return { label: rows[0][0], value: rows[0][1], distanceMs: Math.abs(target - Number(rows[0][1]?.at || 0)) };
}

export function diagnoseHardFreeze(report?: FreezeWatchHardFreezeReport | null) {
  const snapshotEvidence = readJson<any>(EVIDENCE_KEY, null);
  if (!report) {
    return { confidence: "AUCUNE", title: "Aucun gel Worker enregistré", detail: "Reproduis le gel avec la surveillance active.", source: "", meta: null };
  }

  const runtimeProbe = report.runtimeProbe || null;
  if (runtimeProbe) {
    const meta: any = runtimeProbe.meta || {};
    const names: Record<string, string> = {
      "timer.setTimeout": "callback setTimeout",
      "timer.setInterval": "callback setInterval",
      "runtime.requestIdleCallback": "travail requestIdleCallback",
      "json.parse.large": "JSON.parse volumineux",
      "json.stringify.store-like": "JSON.stringify d'un gros store/snapshot",
      "storage.setItem.large": "écriture localStorage/sessionStorage volumineuse",
      "base64.atob.large": "décodage base64 volumineux",
      "base64.btoa.large": "encodage base64 volumineux",
    };
    return {
      confidence: "ÉLEVÉE",
      title: names[runtimeProbe.label] || runtimeProbe.label,
      detail: `Cette opération était EN COURS lorsque le Worker a constaté ${Math.round(report.gapMs || 0)} ms sans heartbeat.`,
      source: String(meta.registrationStack || ""),
      meta,
    };
  }

  if (Array.isArray(report.activeOps) && report.activeOps.length) {
    const op = report.activeOps[report.activeOps.length - 1];
    return {
      confidence: "ÉLEVÉE",
      title: op.label,
      detail: `Opération MSS marquée active pendant le gel (${Math.round(report.gapMs || 0)} ms).`,
      source: String((op.meta as any)?.registrationStack || ""),
      meta: op.meta || null,
    };
  }

  // V5: si loadStore vient de provoquer une forte allocation ou une étape
  // anormalement longue, cette preuve est plus pertinente qu'une simple frame
  // longue enregistrée juste après (souvent le GC/compositing consécutif).
  try {
    const events = readJson<FreezeWatchEvent[]>(EVENTS_KEY, []);
    const target = Number(report?.recoveredAt || report?.detectedAt || Date.now());
    const loadStoreWarnings = events
      .filter((row: any) => row?.kind === "storage.loadStore.stage-warning")
      .map((row: any) => ({ row, distanceMs: Math.abs(target - Number(row?.at || 0)) }))
      .filter((entry: any) => entry.distanceMs <= 15_000)
      .sort((a: any, b: any) => a.distanceMs - b.distanceMs);
    const closest = loadStoreWarnings[0];
    if (closest?.row) {
      const meta: any = closest.row.meta || {};
      const heapDelta = Number(meta.heapDeltaMB || 0);
      const duration = Number(meta.durationMs || 0);
      const stage = String(meta.stage || "?");
      const confidence = heapDelta >= 128 || duration >= 900 ? "ÉLEVÉE" : "MOYENNE/ÉLEVÉE";
      return {
        confidence,
        title: `loadStore.${stage}${heapDelta ? ` — ${heapDelta > 0 ? "+" : ""}${heapDelta} MB` : ""}`,
        detail: `Étape loadStore anormale détectée ${closest.distanceMs} ms du gel (${duration} ms${heapDelta ? `, delta heap ${heapDelta} MB` : ""}). Un GC/WebView peut geler juste après une forte allocation, même quand l'étape JS est déjà terminée.`,
        source: "src/lib/storage.ts — loadStore V5 stage instrumentation",
        meta,
      };
    }
  } catch {}

  const nearest = nearestEvidence(report, snapshotEvidence);
  if (nearest && nearest.distanceMs <= 10_000) {
    const value: any = nearest.value || {};
    const scripts = Array.isArray(value.scripts) ? [...value.scripts] : [];
    scripts.sort((a: any, b: any) => Number(b?.duration || b?.executionDuration || 0) - Number(a?.duration || a?.executionDuration || 0));
    const topScript = scripts[0];
    const scriptSource = topScript ? [topScript.functionName, topScript.sourceURL, topScript.invoker].filter(Boolean).join(" — ") : "";
    return {
      confidence: nearest.label === "Long Animation Frame" && topScript ? "MOYENNE/ÉLEVÉE" : "MOYENNE",
      title: `${nearest.label}${value.duration ? ` (${value.duration} ms)` : ""}`,
      detail: `Mesure PerformanceObserver la plus proche du gel (écart ${nearest.distanceMs} ms).`,
      source: scriptSource,
      meta: value,
    };
  }

  const recent = Array.isArray(report.recentTrace) ? report.recentTrace : [];
  const last = recent.length ? recent[recent.length - 1] : null;
  if (last) {
    return {
      confidence: "FAIBLE/MOYENNE",
      title: `Dernière activité JS: ${last.label}`,
      detail: "Aucune opération n'était encore marquée active. Cette activité est la dernière trace connue avant le gel.",
      source: String((last.meta as any)?.registrationStack || ""),
      meta: last.meta || null,
    };
  }

  return {
    confidence: "FAIBLE",
    title: "Blocage hors instrumentation JS",
    detail: "Aucun callback JS instrumenté n'était actif. Suspects restants: rendu/compositing WebView, GC natif, décodage image/audio, plugin Capacitor/JNI ou tâche JS non instrumentée.",
    source: "",
    meta: null,
  };
}

export function getDeviceSummary() {
  try {
    const nav: any = typeof navigator !== "undefined" ? navigator : {};
    return {
      userAgent: String(nav.userAgent || ""),
      platform: String(nav.platform || ""),
      hardwareConcurrency: Number(nav.hardwareConcurrency || 0) || null,
      deviceMemoryGB: Number(nav.deviceMemory || 0) || null,
      language: String(nav.language || ""),
      viewport: hasWindow() ? { width: window.innerWidth, height: window.innerHeight, dpr: Number(window.devicePixelRatio || 1) } : null,
    };
  } catch {
    return null;
  }
}

export function getFreezeWatchSnapshot() {
  return {
    enabled: isFreezeWatchEnabled(),
    sessionId: SESSION_ID,
    heartbeat: readJson<FreezeWatchHeartbeat | null>(HEARTBEAT_KEY, null),
    activeOps: copyActiveOps(),
    persistedActiveOps: readJson<any>(ACTIVE_OPS_KEY, null),
    interrupted: readJson<any>(INTERRUPTED_KEY, null),
    events: readJson<FreezeWatchEvent[]>(EVENTS_KEY, []),
    historyAudit: readJson<any>(HISTORY_AUDIT_KEY, null),
    runtimeProbe: currentRuntimeProbe(),
    recentTrace: runtimeTrace.slice(-RUNTIME_TRACE_MAX),
    performanceEvidence: readJson<any>(EVIDENCE_KEY, { ...performanceEvidence }),
    device: getDeviceSummary(),
  };
}
