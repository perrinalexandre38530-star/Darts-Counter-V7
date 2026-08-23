import type { ActivityRecord, ActivitySensorSample, ActivitySport, GeoPoint } from "./activityTypes";
import { averagePaceSecPerKm, averageSpeedMps, buildKilometerSplits, elevationGainMeters, movingTimeMs, routeDistanceMeters } from "./activityMath";

export type HealthConnectStatus = {
  available: boolean;
  status: "available" | "update-required" | "unavailable" | string;
  provider?: string;
  permissionsGranted?: boolean;
  exerciseRoutesGranted?: boolean;
  exerciseRouteWriteGranted?: boolean;
  grantedPermissions?: string[];
};

export type HealthConnectNativeSession = {
  recordId: string;
  clientRecordId?: string | null;
  originPackage?: string;
  exerciseType: number;
  title?: string | null;
  notes?: string | null;
  startedAt: number;
  endedAt: number;
  distanceM?: number;
  elevationGainM?: number;
  routeStatus?: "data" | "permission-required" | "consent-required" | "none" | string;
  route?: GeoPoint[];
  heartRate?: Array<{ timestamp: number; heartRateBpm: number }>;
  speed?: Array<{ timestamp: number; sensorSpeedMps: number }>;
  cadence?: Array<{ timestamp: number; cadenceSpm: number }>;
};

export type HealthConnectReadResult = {
  days: number;
  exerciseRoutesGranted?: boolean;
  sessions: HealthConnectNativeSession[];
};

function healthPlugin(): any {
  try { return (window as any)?.Capacitor?.Plugins?.HealthConnect || null; } catch { return null; }
}

export function isHealthConnectBridgeInstalled() { return !!healthPlugin(); }
export async function getHealthConnectStatus(): Promise<HealthConnectStatus | null> { try { return await healthPlugin()?.getStatus?.(); } catch { return null; } }
export async function requestHealthConnectWorkoutPermissions() { const p = healthPlugin(); if (!p) throw new Error("Health Connect bridge unavailable"); return p.requestWorkoutPermissions(); }
export async function openHealthConnectSettings() { const p = healthPlugin(); if (!p) throw new Error("Health Connect bridge unavailable"); return p.openHealthConnect(); }
export async function readHealthConnectWorkoutSessions(days = 30): Promise<HealthConnectReadResult> {
  const p = healthPlugin();
  if (!p?.readWorkoutSessions) throw new Error("Health Connect workout sync unavailable");
  const result = await p.readWorkoutSessions({ days: Math.max(1, Math.min(30, Math.round(days || 30))) });
  return { days: Number(result?.days || days), exerciseRoutesGranted: !!result?.exerciseRoutesGranted, sessions: Array.isArray(result?.sessions) ? result.sessions : [] };
}

export type HealthConnectWriteResult = {
  clientRecordId: string;
  recordIds: string[];
};

export async function writeHealthConnectActivity(activity: ActivityRecord): Promise<HealthConnectWriteResult> {
  const p = healthPlugin();
  if (!p?.writeWorkoutSession) throw new Error("Health Connect write bridge unavailable");
  if (activity.source === "health-connect") throw new Error("Health Connect imported activities are not re-exported");
  const clientRecordId = `mss:${activity.id}`;
  const result = await p.writeWorkoutSession({
    clientRecordId,
    sport: activity.sport,
    title: activity.title || "MULTISPORTS SCORING",
    notes: activity.notes || "",
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
    distanceM: activity.distanceM,
    elevationGainM: activity.elevationGainM,
    route: (activity.route || []).map((point) => ({
      lat: point.lat, lon: point.lon, timestamp: point.timestamp,
      accuracy: point.accuracy, altitude: point.altitude,
    })),
  });
  return { clientRecordId: String(result?.clientRecordId || clientRecordId), recordIds: Array.isArray(result?.recordIds) ? result.recordIds.map(String) : [] };
}
export async function requestHealthConnectExerciseRoute(sessionId: string) {
  const p = healthPlugin();
  if (!p?.requestExerciseRoute) throw new Error("Health Connect route bridge unavailable");
  return p.requestExerciseRoute({ sessionId });
}

function sportFromHealthSession(row: HealthConnectNativeSession): ActivitySport | null {
  if (row.exerciseType === 57) return "treadmill";
  if (row.exerciseType === 37) return "hiking";
  if (row.exerciseType === 79) {
    const title = String(row.title || "").toLowerCase();
    return /nordic|nordique|bâton|baton/.test(title) ? "nordic-walking" : "walking";
  }
  if (row.exerciseType === 56) {
    const title = String(row.title || "").toLowerCase();
    return /trail|sentier|mountain run|course nature/.test(title) ? "trail" : "running";
  }
  return null;
}

function mergedSensorSamples(row: HealthConnectNativeSession): ActivitySensorSample[] {
  const byTime = new Map<number, ActivitySensorSample>();
  const upsert = (timestamp: number, patch: Partial<ActivitySensorSample>) => {
    if (!Number.isFinite(timestamp)) return;
    const current = byTime.get(timestamp) || { timestamp };
    byTime.set(timestamp, { ...current, ...patch, elapsedMs: Math.max(0, timestamp - Number(row.startedAt || timestamp)) });
  };
  for (const sample of row.heartRate || []) upsert(Number(sample.timestamp), { heartRateBpm: Number(sample.heartRateBpm) });
  for (const sample of row.speed || []) upsert(Number(sample.timestamp), { sensorSpeedMps: Number(sample.sensorSpeedMps) });
  for (const sample of row.cadence || []) upsert(Number(sample.timestamp), { cadenceSpm: Number(sample.cadenceSpm) });
  return [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function healthConnectSessionToActivity(row: HealthConnectNativeSession): ActivityRecord | null {
  const sport = sportFromHealthSession(row);
  if (!sport || !row.recordId) return null;
  const startedAt = Number(row.startedAt || 0);
  const endedAt = Math.max(startedAt, Number(row.endedAt || startedAt));
  const elapsedMs = Math.max(0, endedAt - startedAt);
  const route = (Array.isArray(row.route) ? row.route : []).map((point) => ({
    lat: Number(point.lat), lon: Number(point.lon), timestamp: Number(point.timestamp),
    accuracy: Number.isFinite(Number(point.accuracy)) ? Number(point.accuracy) : undefined,
    altitude: Number.isFinite(Number(point.altitude)) ? Number(point.altitude) : undefined,
    elapsedMs: Math.max(0, Number(point.timestamp) - startedAt),
  })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Number.isFinite(point.timestamp));
  const routedDistance = route.length > 1 ? routeDistanceMeters(route) : 0;
  const distanceM = Math.max(0, Number(row.distanceM || 0), routedDistance);
  const routeGain = route.length > 1 ? elevationGainMeters(route) : 0;
  const elevationGainM = Math.max(0, Number(row.elevationGainM || 0), routeGain);
  const movingMs = route.length > 1 ? Math.max(0, movingTimeMs(route)) : elapsedMs;
  const sensors = mergedSensorSamples(row);
  const sourceDevices = [
    sensors.some((s) => Number.isFinite(s.heartRateBpm)) ? { kind: "heart-rate" as const, name: "Health Connect" } : null,
    sensors.some((s) => Number.isFinite(s.cadenceSpm) || Number.isFinite(s.sensorSpeedMps)) ? { kind: "running-speed-cadence" as const, name: "Health Connect" } : null,
  ].filter(Boolean) as ActivityRecord["sensorDevices"];
  const indoor = sport === "treadmill";
  return {
    id: `health-connect:${row.recordId}`,
    sport,
    source: "health-connect",
    verification: "connected",
    startedAt,
    endedAt,
    elapsedMs,
    movingMs: movingMs || elapsedMs,
    distanceM,
    avgSpeedMps: averageSpeedMps(distanceM, movingMs || elapsedMs),
    avgPaceSecPerKm: averagePaceSecPerKm(distanceM, movingMs || elapsedMs),
    elevationGainM,
    route,
    splits: route.length > 1 ? buildKilometerSplits(route, startedAt) : [],
    title: row.title || (sport === "treadmill" ? "TAPIS · HEALTH CONNECT" : sport === "hiking" ? "RANDONNÉE · HEALTH CONNECT" : sport === "walking" ? "MARCHE · HEALTH CONNECT" : sport === "trail" ? "TRAIL · HEALTH CONNECT" : "RUNNING · HEALTH CONNECT"),
    notes: row.notes || undefined,
    sensorSamples: sensors,
    sensorDevices: sourceDevices?.length ? sourceDevices : undefined,
    deviceName: row.originPackage || "Health Connect",
    importedAt: Date.now(),
    indoor,
    healthConnect: {
      recordId: row.recordId,
      clientRecordId: row.clientRecordId || undefined,
      originPackage: row.originPackage || undefined,
      routeStatus: row.routeStatus || "none",
      syncedAt: Date.now(),
    },
    createdAt: Date.now(),
  };
}
