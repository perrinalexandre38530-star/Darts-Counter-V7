import type { OutdoorLongDistancePrefs } from "./outdoorLongDistance";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import type { OutdoorRouteExtras } from "./outdoorRouteExtras";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorOfflineRoutePack = {
  id: string;
  routeId: string;
  name: string;
  sport: OutdoorPerformanceSport;
  route: RunningRouteTemplate;
  extras: OutdoorRouteExtras;
  longDistancePrefs: OutdoorLongDistancePrefs;
  preparedAt: number;
  approxBytes: number;
};

const DB_NAME = "mss-outdoor-offline-v1";
const STORE_NAME = "route-packs";
const DB_VERSION = 1;
const FALLBACK_KEY = "mss-outdoor-offline-fallback-v1";

function clonePack(pack: OutdoorOfflineRoutePack): OutdoorOfflineRoutePack {
  return JSON.parse(JSON.stringify(pack));
}

function estimateBytes(value: unknown): number {
  try { return new TextEncoder().encode(JSON.stringify(value)).length; } catch { return JSON.stringify(value).length * 2; }
}

function fallbackRead(): OutdoorOfflineRoutePack[] {
  try {
    const value = JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.routeId === "string") : [];
  } catch { return []; }
}

function fallbackWrite(packs: OutdoorOfflineRoutePack[]) {
  try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(packs.slice(0, 20))); } catch {}
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "routeId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function getOutdoorOfflineRoutePack(routeId: string): Promise<OutdoorOfflineRoutePack | null> {
  const db = await openDb();
  if (!db) return fallbackRead().find((item) => item.routeId === routeId) || null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(routeId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    } catch { db.close(); resolve(null); }
  });
}

export async function listOutdoorOfflineRoutePacks(): Promise<OutdoorOfflineRoutePack[]> {
  const db = await openDb();
  if (!db) return fallbackRead().sort((a, b) => b.preparedAt - a.preparedAt);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((Array.isArray(request.result) ? request.result : []).sort((a, b) => b.preparedAt - a.preparedAt));
      request.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    } catch { db.close(); resolve([]); }
  });
}

export async function prepareOutdoorOfflineRoutePack(
  route: RunningRouteTemplate,
  sport: OutdoorPerformanceSport,
  extras: OutdoorRouteExtras,
  longDistancePrefs: OutdoorLongDistancePrefs,
): Promise<OutdoorOfflineRoutePack> {
  const base = {
    id: `offline:${route.id}`,
    routeId: route.id,
    name: route.name,
    sport,
    route: JSON.parse(JSON.stringify(route)) as RunningRouteTemplate,
    extras: JSON.parse(JSON.stringify(extras)) as OutdoorRouteExtras,
    longDistancePrefs: { ...longDistancePrefs },
    preparedAt: Date.now(),
    approxBytes: 0,
  };
  const pack: OutdoorOfflineRoutePack = { ...base, approxBytes: estimateBytes(base) };
  const db = await openDb();
  if (!db) {
    const current = fallbackRead();
    fallbackWrite([pack, ...current.filter((item) => item.routeId !== pack.routeId)]);
    return clonePack(pack);
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(pack);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch { db.close(); resolve(); }
  });
  return clonePack(pack);
}

export async function removeOutdoorOfflineRoutePack(routeId: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    fallbackWrite(fallbackRead().filter((item) => item.routeId !== routeId));
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(routeId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch { db.close(); resolve(); }
  });
}

export function formatOfflinePackSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
