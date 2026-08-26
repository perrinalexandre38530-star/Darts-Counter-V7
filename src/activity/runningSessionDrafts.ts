import type { ActivityLap, ActivityRecord, ActivitySensorSample, ActivitySport, GeoPoint } from "./activityTypes";

const DRAFT_DB_NAME = "mss-running-session-drafts-v1";
const DRAFT_DB_VERSION = 1;
const DRAFT_STORE = "drafts";
const FALLBACK_KEY = "mss-running-session-drafts-fallback-v1";

export type RunningSessionDraft = {
  sessionId: string;
  activityId: string;
  sport: ActivitySport;
  title?: string;
  presetId?: string;
  workoutType?: ActivityRecord["workoutType"];
  startedAt?: number;
  mode?: "native-gps" | "web-gps" | "treadmill";
  targetDistanceM?: number | null;
  targetDurationMs?: number | null;
  targetPaceSecPerKm?: number | null;
  routeReferenceId?: string;
  shoeId?: string;
  paused?: boolean;
  pausedAt?: number;
  route: GeoPoint[];
  manualLaps: ActivityLap[];
  sensorSamples: ActivitySensorSample[];
  treadmillDistanceM: number;
  manualTreadmillSpeedKmh?: number;
  manualTreadmillIncline?: number;
  lastLapElapsedMs: number;
  lastLapDistanceM: number;
  pausedTotalMs: number;
  pauseStartedAt?: number;
  updatedAt: number;
};

function sanitizeRoute(value: unknown): GeoPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((point: any) => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)) && Number.isFinite(Number(point.timestamp)))
    .map((point: any) => ({
      lat: Number(point.lat),
      lon: Number(point.lon),
      timestamp: Number(point.timestamp),
      accuracy: Number.isFinite(Number(point.accuracy)) ? Number(point.accuracy) : undefined,
      altitude: Number.isFinite(Number(point.altitude)) ? Number(point.altitude) : undefined,
      speed: Number.isFinite(Number(point.speed)) ? Number(point.speed) : undefined,
      elapsedMs: Number.isFinite(Number(point.elapsedMs)) ? Number(point.elapsedMs) : undefined,
    }));
}

function sanitizeDraft(value: unknown): RunningSessionDraft | null {
  const row = value as any;
  if (!row || typeof row.sessionId !== "string" || !row.sessionId || typeof row.activityId !== "string" || !row.activityId) return null;
  return {
    sessionId: row.sessionId,
    activityId: row.activityId,
    sport: String(row.sport || "running") as ActivitySport,
    title: typeof row.title === "string" ? row.title : undefined,
    presetId: typeof row.presetId === "string" ? row.presetId : undefined,
    workoutType: row.workoutType,
    startedAt: Number.isFinite(Number(row.startedAt)) ? Number(row.startedAt) : undefined,
    mode: ["native-gps", "web-gps", "treadmill"].includes(String(row.mode || "")) ? row.mode : undefined,
    targetDistanceM: row.targetDistanceM == null ? undefined : Math.max(0, Number(row.targetDistanceM || 0)),
    targetDurationMs: row.targetDurationMs == null ? undefined : Math.max(0, Number(row.targetDurationMs || 0)),
    targetPaceSecPerKm: row.targetPaceSecPerKm == null ? undefined : Math.max(0, Number(row.targetPaceSecPerKm || 0)),
    routeReferenceId: typeof row.routeReferenceId === "string" ? row.routeReferenceId : undefined,
    shoeId: typeof row.shoeId === "string" ? row.shoeId : undefined,
    paused: typeof row.paused === "boolean" ? row.paused : undefined,
    pausedAt: Number.isFinite(Number(row.pausedAt)) ? Number(row.pausedAt) : undefined,
    route: sanitizeRoute(row.route),
    manualLaps: Array.isArray(row.manualLaps) ? row.manualLaps : [],
    sensorSamples: Array.isArray(row.sensorSamples) ? row.sensorSamples : [],
    treadmillDistanceM: Math.max(0, Number(row.treadmillDistanceM || 0)),
    manualTreadmillSpeedKmh: Number.isFinite(Number(row.manualTreadmillSpeedKmh)) ? Number(row.manualTreadmillSpeedKmh) : undefined,
    manualTreadmillIncline: Number.isFinite(Number(row.manualTreadmillIncline)) ? Number(row.manualTreadmillIncline) : undefined,
    lastLapElapsedMs: Math.max(0, Number(row.lastLapElapsedMs || 0)),
    lastLapDistanceM: Math.max(0, Number(row.lastLapDistanceM || 0)),
    pausedTotalMs: Math.max(0, Number(row.pausedTotalMs || 0)),
    pauseStartedAt: Number.isFinite(Number(row.pauseStartedAt)) ? Number(row.pauseStartedAt) : undefined,
    updatedAt: Number.isFinite(Number(row.updatedAt)) ? Number(row.updatedAt) : Date.now(),
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        const store = db.createObjectStore(DRAFT_STORE, { keyPath: "sessionId" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open running drafts"));
  });
}

function fallbackRead(): RunningSessionDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeDraft).filter(Boolean) as RunningSessionDraft[];
  } catch {
    return [];
  }
}

function fallbackWrite(rows: RunningSessionDraft[]) {
  if (typeof window === "undefined") return;
  try {
    const compact = rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3)
      .map((row) => ({
        ...row,
        route: row.route.slice(-1800),
        sensorSamples: row.sensorSamples.slice(-1200),
        manualLaps: row.manualLaps.slice(-120),
      }));
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(compact));
  } catch {}
}

export function mergeRunningDraftRoutes(previous: GeoPoint[] | null | undefined, next: GeoPoint[] | null | undefined): GeoPoint[] {
  const a = sanitizeRoute(previous);
  const b = sanitizeRoute(next);
  if (!a.length) return b;
  if (!b.length) return a;
  const seen = new Set(a.map((point) => `${Math.round(point.timestamp)}:${point.lat.toFixed(6)}:${point.lon.toFixed(6)}`));
  const merged = [...a];
  for (const point of b) {
    const key = `${Math.round(point.timestamp)}:${point.lat.toFixed(6)}:${point.lon.toFixed(6)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(point);
    }
  }
  return merged.sort((x, y) => Number(x.timestamp || 0) - Number(y.timestamp || 0));
}

export async function saveRunningSessionDraft(draft: RunningSessionDraft): Promise<void> {
  const clean = sanitizeDraft({ ...draft, updatedAt: Date.now() });
  if (!clean) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, "readwrite");
      tx.objectStore(DRAFT_STORE).put(clean);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Unable to save running draft"));
      tx.onabort = () => reject(tx.error || new Error("Running draft save aborted"));
    });
    db.close();
  } catch {
    const rows = fallbackRead().filter((row) => row.sessionId !== clean.sessionId);
    rows.unshift(clean);
    fallbackWrite(rows);
  }
}

export async function patchRunningSessionDraft(sessionId: string, patch: Partial<RunningSessionDraft>): Promise<RunningSessionDraft | null> {
  const current = await loadRunningSessionDraft(sessionId);
  if (!current) return null;
  const next = sanitizeDraft({ ...current, ...patch, sessionId: current.sessionId, activityId: current.activityId, updatedAt: Date.now() });
  if (!next) return null;
  await saveRunningSessionDraft(next);
  return next;
}

export async function loadRunningSessionDraft(sessionId: string): Promise<RunningSessionDraft | null> {
  if (!sessionId) return null;
  try {
    const db = await openDb();
    const result = await new Promise<RunningSessionDraft | undefined>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, "readonly");
      const request = tx.objectStore(DRAFT_STORE).get(sessionId);
      request.onsuccess = () => resolve(request.result as RunningSessionDraft | undefined);
      request.onerror = () => reject(request.error || new Error("Unable to read running draft"));
    });
    db.close();
    return sanitizeDraft(result);
  } catch {
    return fallbackRead().find((row) => row.sessionId === sessionId) || null;
  }
}

export async function listRunningSessionDrafts(): Promise<RunningSessionDraft[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<RunningSessionDraft[]>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, "readonly");
      const request = tx.objectStore(DRAFT_STORE).getAll();
      request.onsuccess = () => resolve((request.result || []) as RunningSessionDraft[]);
      request.onerror = () => reject(request.error || new Error("Unable to list running drafts"));
    });
    db.close();
    return rows.map(sanitizeDraft).filter(Boolean).sort((a: any, b: any) => b.updatedAt - a.updatedAt) as RunningSessionDraft[];
  } catch {
    return fallbackRead().sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function deleteRunningSessionDraft(sessionId: string): Promise<void> {
  if (!sessionId) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, "readwrite");
      tx.objectStore(DRAFT_STORE).delete(sessionId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Unable to delete running draft"));
    });
    db.close();
  } catch {
    fallbackWrite(fallbackRead().filter((row) => row.sessionId !== sessionId));
  }
}


export async function listRecoverableRunningSessionDrafts(activeSessionIds: string[] = [], maxAgeMs = 72 * 3600000): Promise<RunningSessionDraft[]> {
  const active = new Set(activeSessionIds.map(String));
  const now = Date.now();
  return (await listRunningSessionDrafts()).filter((draft) => !active.has(draft.sessionId) && now - Number(draft.updatedAt || 0) <= maxAgeMs);
}
