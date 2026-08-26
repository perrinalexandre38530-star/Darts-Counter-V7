import type { ActivitySport, ActivityRecord } from "./activityTypes";

export const RUNNING_ACTIVE_SESSIONS_KEY = "mss-running-active-sessions-v1";
export const RUNNING_ACTIVE_SESSIONS_EVENT = "mss:running-active-sessions";
export const MAX_RUNNING_ACTIVE_SESSIONS = 3;
export const RUNNING_NATIVE_TRACKING_OWNER_KEY = "mss-running-native-tracking-owner-v1";

export type RunningActiveSessionStatus = "recording" | "paused";
export type RunningActiveSessionMode = "native-gps" | "web-gps" | "treadmill";

export type RunningActiveSession = {
  id: string;
  activityId?: string;
  sport: ActivitySport;
  title: string;
  presetId: string;
  workoutType?: ActivityRecord["workoutType"];
  startedAt: number;
  paused: boolean;
  pausedAt?: number;
  pausedTotalMs: number;
  status: RunningActiveSessionStatus;
  mode: RunningActiveSessionMode;
  targetDistanceM?: number | null;
  targetDurationMs?: number | null;
  targetPaceSecPerKm?: number | null;
  routeReferenceId?: string;
  shoeId?: string;
  lastDistanceM?: number;
  lastElapsedMs?: number;
  lastDraftAt?: number;
  recoveredAt?: number;
  lastUpdatedAt: number;
};

function safeRows(value: unknown): RunningActiveSession[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row: any) => row && typeof row.id === "string" && Number.isFinite(Number(row.startedAt))) as RunningActiveSession[];
}

export function loadRunningActiveSessions(): RunningActiveSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RUNNING_ACTIVE_SESSIONS_KEY) || "[]");
    return safeRows(parsed)
      .sort((a, b) => Number(b.lastUpdatedAt || b.startedAt) - Number(a.lastUpdatedAt || a.startedAt))
      .slice(0, MAX_RUNNING_ACTIVE_SESSIONS);
  } catch {
    return [];
  }
}

function persist(rows: RunningActiveSession[]) {
  if (typeof window === "undefined") return;
  const next = safeRows(rows)
    .sort((a, b) => Number(b.lastUpdatedAt || b.startedAt) - Number(a.lastUpdatedAt || a.startedAt))
    .slice(0, MAX_RUNNING_ACTIVE_SESSIONS);
  try { window.localStorage.setItem(RUNNING_ACTIVE_SESSIONS_KEY, JSON.stringify(next)); } catch {}
  try { window.dispatchEvent(new CustomEvent(RUNNING_ACTIVE_SESSIONS_EVENT, { detail: next })); } catch {}
}

export function getRunningActiveSession(id?: string | null): RunningActiveSession | null {
  const rows = loadRunningActiveSessions();
  if (id) return rows.find((row) => row.id === id) || null;
  return rows[0] || null;
}

export function upsertRunningActiveSession(session: RunningActiveSession): { ok: boolean; rows: RunningActiveSession[]; reason?: "limit" } {
  const rows = loadRunningActiveSessions();
  const existing = rows.findIndex((row) => row.id === session.id);
  if (existing < 0 && rows.length >= MAX_RUNNING_ACTIVE_SESSIONS) return { ok: false, rows, reason: "limit" };
  const next = rows.filter((row) => row.id !== session.id);
  next.unshift({ ...session, lastUpdatedAt: Date.now() });
  persist(next);
  return { ok: true, rows: next.slice(0, MAX_RUNNING_ACTIVE_SESSIONS) };
}

export function patchRunningActiveSession(id: string, patch: Partial<RunningActiveSession>): RunningActiveSession | null {
  const rows = loadRunningActiveSessions();
  const current = rows.find((row) => row.id === id);
  if (!current) return null;
  const next = { ...current, ...patch, id: current.id, lastUpdatedAt: Date.now() } as RunningActiveSession;
  persist([next, ...rows.filter((row) => row.id !== id)]);
  return next;
}

export function removeRunningActiveSession(id: string) {
  persist(loadRunningActiveSessions().filter((row) => row.id !== id));
}

export function runningActiveElapsedMs(session: RunningActiveSession, now = Date.now()) {
  const currentPause = session.paused && session.pausedAt ? Math.max(0, now - session.pausedAt) : 0;
  return Math.max(0, now - session.startedAt - Number(session.pausedTotalMs || 0) - currentPause);
}

export function subscribeRunningActiveSessions(listener: (rows: RunningActiveSession[]) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const rows = safeRows((event as CustomEvent)?.detail);
    listener(rows.length || Array.isArray((event as CustomEvent)?.detail) ? rows : loadRunningActiveSessions());
  };
  window.addEventListener(RUNNING_ACTIVE_SESSIONS_EVENT, handler as EventListener);
  return () => window.removeEventListener(RUNNING_ACTIVE_SESSIONS_EVENT, handler as EventListener);
}

export function getNativeTrackingOwnerSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = String(window.localStorage.getItem(RUNNING_NATIVE_TRACKING_OWNER_KEY) || "").trim();
    return value || null;
  } catch {
    return null;
  }
}

export function setNativeTrackingOwnerSessionId(sessionId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (sessionId) window.localStorage.setItem(RUNNING_NATIVE_TRACKING_OWNER_KEY, sessionId);
    else window.localStorage.removeItem(RUNNING_NATIVE_TRACKING_OWNER_KEY);
  } catch {}
}

export function clearNativeTrackingOwnerIf(sessionId: string | null | undefined) {
  if (!sessionId) return;
  if (getNativeTrackingOwnerSessionId() === sessionId) setNativeTrackingOwnerSessionId(null);
}

export function getRunningRecordingSession(excludeId?: string | null): RunningActiveSession | null {
  return loadRunningActiveSessions().find((row) => row.id !== excludeId && !row.paused && row.status === "recording") || null;
}

export function resumedRunningSessionTiming(session: RunningActiveSession, now = Date.now()) {
  const pausedAt = Number(session.pausedAt || now);
  return {
    paused: false,
    pausedAt: undefined,
    status: "recording" as const,
    pausedTotalMs: Math.max(0, Number(session.pausedTotalMs || 0) + Math.max(0, now - pausedAt)),
  };
}
