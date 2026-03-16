// ============================================
// src/lib/crashGuard.ts
// CrashGuard — protection mémoire / PWA Android
// - surveillance mémoire
// - compression avatars
// - limitation historique
// - détection render storms
// - cleanup intelligent
// ============================================

import { loadStore, saveStore } from "./storage";

type AnyObj = Record<string, any>;

export interface CrashGuardOptions {
  memorySoftLimitMB?: number;     // seuil d'alerte
  memoryHardLimitMB?: number;     // seuil d'action forte
  maxHistoryEntries?: number;     // limite historique
  maxRouteEntries?: number;       // historique navigation
  maxRenderPerMinute?: number;    // tempête de renders
  avatarMaxSide?: number;         // compression avatars
  avatarJpegQuality?: number;     // compression avatars
  enableAutoTrimHistory?: boolean;
  enableAutoCompressAvatars?: boolean;
  enableEmergencyCleanup?: boolean;
}

export interface CrashGuardState {
  lastCheckAt: number;
  lastActionAt: number;
  lastReason: string;
  warnings: string[];
  actions: string[];
  memoryUsedMB: number | null;
  memoryLimitMB: number | null;
  renderCountMinute: number;
  routeLoopDetected: boolean;
}

const DEFAULTS: Required<CrashGuardOptions> = {
  memorySoftLimitMB: 700,
  memoryHardLimitMB: 900,
  maxHistoryEntries: 250,
  maxRouteEntries: 30,
  maxRenderPerMinute: 500,
  avatarMaxSide: 512,
  avatarJpegQuality: 0.72,
  enableAutoTrimHistory: true,
  enableAutoCompressAvatars: true,
  enableEmergencyCleanup: true,
};

let opts: Required<CrashGuardOptions> = { ...DEFAULTS };

let renderTimestamps: number[] = [];
let routeHistory: string[] = [];

const state: CrashGuardState = {
  lastCheckAt: 0,
  lastActionAt: 0,
  lastReason: "",
  warnings: [],
  actions: [],
  memoryUsedMB: null,
  memoryLimitMB: null,
  renderCountMinute: 0,
  routeLoopDetected: false,
};

function now() {
  return Date.now();
}

function clampHistory<T>(arr: T[], max: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= max) return arr;
  return arr.slice(arr.length - max);
}

function pushUniqueLimited(arr: string[], value: string, max: number) {
  arr.push(value);
  if (arr.length > max) arr.shift();
}

function safeJsonSizeMB(obj: unknown): number {
  try {
    return Math.round(JSON.stringify(obj).length / 1024 / 1024);
  } catch {
    return 0;
  }
}

function getPerfMemory() {
  const mem = (performance as any)?.memory;
  if (!mem) return null;

  return {
    usedMB: Math.round(mem.usedJSHeapSize / 1048576),
    totalMB: Math.round(mem.totalJSHeapSize / 1048576),
    limitMB: Math.round(mem.jsHeapSizeLimit / 1048576),
  };
}

function addWarning(msg: string) {
  state.warnings.unshift(`${new Date().toLocaleString()} — ${msg}`);
  state.warnings = state.warnings.slice(0, 20);
}

function addAction(msg: string) {
  state.actions.unshift(`${new Date().toLocaleString()} — ${msg}`);
  state.actions = state.actions.slice(0, 20);
  state.lastActionAt = now();
}

function setReason(msg: string) {
  state.lastReason = msg;
}

export function getCrashGuardState(): CrashGuardState {
  return {
    ...state,
    warnings: [...state.warnings],
    actions: [...state.actions],
  };
}

export function configureCrashGuard(options?: CrashGuardOptions) {
  opts = { ...DEFAULTS, ...(options || {}) };
}

export function crashGuardTrackRender() {
  const t = now();
  renderTimestamps.push(t);

  const limit = t - 60_000;
  renderTimestamps = renderTimestamps.filter((x) => x >= limit);

  state.renderCountMinute = renderTimestamps.length;

  if (state.renderCountMinute > opts.maxRenderPerMinute) {
    addWarning(`Tempête de renders détectée (${state.renderCountMinute}/min)`);
    setReason("Render storm");
  }
}

export function crashGuardTrackRoute(route: string) {
  pushUniqueLimited(routeHistory, route, opts.maxRouteEntries);

  if (routeHistory.length >= 6) {
    const last6 = routeHistory.slice(-6);
    const unique = new Set(last6);
    state.routeLoopDetected = unique.size <= 2;
    if (state.routeLoopDetected) {
      addWarning(`Boucle de navigation probable: ${last6.join(" -> ")}`);
      setReason("Navigation loop");
    }
  }
}

export function getCrashGuardRouteHistory() {
  return [...routeHistory];
}

async function compressImageDataUrl(
  dataUrl: string,
  maxSide: number,
  quality: number
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out || dataUrl);
      };

      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

async function compressHeavyAvatars(store: AnyObj) {
  if (!opts.enableAutoCompressAvatars) return false;
  if (!Array.isArray(store?.profiles)) return false;

  let changed = false;

  for (const profile of store.profiles) {
    const dataUrl = profile?.avatarDataUrl;
    if (!dataUrl || typeof dataUrl !== "string") continue;

    const approxMB = dataUrl.length / 1024 / 1024;
    if (approxMB < 0.35) continue;

    const compressed = await compressImageDataUrl(
      dataUrl,
      opts.avatarMaxSide,
      opts.avatarJpegQuality
    );

    if (compressed && compressed.length < dataUrl.length) {
      profile.avatarDataUrl = compressed;
      changed = true;
    }
  }

  if (changed) {
    addAction("Compression automatique des avatars lourds");
  }

  return changed;
}

function trimHistory(store: AnyObj) {
  if (!opts.enableAutoTrimHistory) return false;
  if (!Array.isArray(store?.history)) return false;

  const before = store.history.length;
  store.history = clampHistory(store.history, opts.maxHistoryEntries);
  const after = store.history.length;

  if (after < before) {
    addAction(`Historique réduit (${before} -> ${after})`);
    return true;
  }

  return false;
}

function dropVolatileCaches() {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (
        k.startsWith("tmp_") ||
        k.startsWith("cache_") ||
        k.startsWith("probe_") ||
        k.startsWith("diag_") ||
        k.includes("debug")
      ) {
        keysToRemove.push(k);
      }
    }

    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }

    if (keysToRemove.length) {
      addAction(`Caches volatils supprimés (${keysToRemove.length})`);
    }
  } catch {
    // no-op
  }
}

async function emergencyCleanup(store: AnyObj) {
  if (!opts.enableEmergencyCleanup) return false;

  let changed = false;

  changed = trimHistory(store) || changed;
  changed = (await compressHeavyAvatars(store)) || changed;

  dropVolatileCaches();

  if (changed) {
    addAction("Nettoyage d'urgence exécuté");
  }

  return changed;
}

function analyzeStore(store: AnyObj) {
  const historyCount = Array.isArray(store?.history) ? store.history.length : 0;
  const profilesCount = Array.isArray(store?.profiles) ? store.profiles.length : 0;

  let avatarMB = 0;
  if (Array.isArray(store?.profiles)) {
    for (const p of store.profiles) {
      if (typeof p?.avatarDataUrl === "string") {
        avatarMB += p.avatarDataUrl.length / 1024 / 1024;
      }
    }
  }

  return {
    storeSizeMB: safeJsonSizeMB(store),
    historyCount,
    profilesCount,
    avatarMB: Math.round(avatarMB),
  };
}

export async function runCrashGuardCheck() {
  state.lastCheckAt = now();

  const perf = getPerfMemory();
  state.memoryUsedMB = perf?.usedMB ?? null;
  state.memoryLimitMB = perf?.limitMB ?? null;

  const store = await loadStore();
  const analysis = analyzeStore(store);

  let changed = false;

  if (state.renderCountMinute > opts.maxRenderPerMinute) {
    addWarning(`Renders excessifs: ${state.renderCountMinute}/min`);
  }

  if (analysis.avatarMB > 40) {
    addWarning(`Mémoire avatars élevée: ${analysis.avatarMB} MB`);
    setReason("Heavy avatars");
  }

  if (analysis.historyCount > opts.maxHistoryEntries) {
    addWarning(`Historique trop volumineux: ${analysis.historyCount} entrées`);
    setReason("History too large");
    changed = trimHistory(store) || changed;
  }

  if (perf) {
    const { usedMB, limitMB } = perf;

    if (usedMB >= opts.memorySoftLimitMB) {
      addWarning(`Mémoire haute: ${usedMB} / ${limitMB} MB`);
      setReason("High memory");
    }

    if (usedMB >= opts.memoryHardLimitMB) {
      addWarning(`Mémoire critique: ${usedMB} / ${limitMB} MB`);
      setReason("Critical memory");
      changed = (await emergencyCleanup(store)) || changed;
    }
  }

  if (state.routeLoopDetected) {
    addWarning("Boucle de navigation détectée");
  }

  if (changed) {
    await saveStore(store);
  }

  return {
    perf,
    analysis,
    state: getCrashGuardState(),
  };
}

let intervalId: number | null = null;

export function startCrashGuard(options?: CrashGuardOptions) {
  configureCrashGuard(options);

  if (intervalId !== null) return;

  intervalId = window.setInterval(() => {
    runCrashGuardCheck().catch(() => {
      addWarning("Erreur pendant le contrôle CrashGuard");
    });
  }, 15_000);

  addAction("CrashGuard démarré");
}

export function stopCrashGuard() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
    addAction("CrashGuard arrêté");
  }
}