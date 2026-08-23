import type { OutdoorPerformanceSport } from "./outdoorPerformance";
import { buildOutdoorRouteCheckpoints, estimateOutdoorRouteDurationMs } from "./outdoorNavigation";
import type { OutdoorRouteExtras } from "./outdoorRouteExtras";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorBatteryMode = "normal" | "eco" | "ultra";

export type OutdoorLongDistancePrefs = {
  routeId: string;
  hydrationReminderMin: 30 | 45 | 60 | 0;
  fuelReminderMin: 45 | 60 | 75 | 0;
  batteryMode: OutdoorBatteryMode;
  updatedAt: number;
};

export type OutdoorRoadbookStage = {
  id: string;
  name: string;
  icon: string;
  distanceM: number;
  estimatedElapsedMs: number;
  kind: string;
};

export type OutdoorLongDistancePlan = {
  enabled: boolean;
  expectedMs: number;
  distanceM: number;
  stages: OutdoorRoadbookStage[];
  suggestedBatteryMode: OutdoorBatteryMode;
  estimatedGpsIntervalSec: number;
};

const STORAGE_KEY = "mss-outdoor-long-distance-v1";

function allPrefs(): Record<string, OutdoorLongDistancePrefs> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

export function gpsIntervalSecForBatteryMode(mode: OutdoorBatteryMode): number {
  return mode === "ultra" ? 10 : mode === "eco" ? 5 : 1;
}

function recommendedBatteryMode(expectedMs: number): OutdoorBatteryMode {
  if (expectedMs >= 6 * 3_600_000) return "ultra";
  if (expectedMs >= 3 * 3_600_000) return "eco";
  return "normal";
}

export function defaultOutdoorLongDistancePrefs(routeId: string, expectedMs = 0): OutdoorLongDistancePrefs {
  return { routeId, hydrationReminderMin: 45, fuelReminderMin: 60, batteryMode: recommendedBatteryMode(expectedMs), updatedAt: Date.now() };
}

export function loadOutdoorLongDistancePrefs(routeId: string, expectedMs = 0): OutdoorLongDistancePrefs {
  const stored = allPrefs()[routeId];
  if (!stored) return defaultOutdoorLongDistancePrefs(routeId, expectedMs);
  return {
    routeId,
    hydrationReminderMin: [0, 30, 45, 60].includes(Number(stored.hydrationReminderMin)) ? stored.hydrationReminderMin : 45,
    fuelReminderMin: [0, 45, 60, 75].includes(Number(stored.fuelReminderMin)) ? stored.fuelReminderMin : 60,
    batteryMode: ["normal", "eco", "ultra"].includes(stored.batteryMode) ? stored.batteryMode : recommendedBatteryMode(expectedMs),
    updatedAt: Number(stored.updatedAt || Date.now()),
  };
}

export function saveOutdoorLongDistancePrefs(prefs: OutdoorLongDistancePrefs) {
  const all = allPrefs();
  all[prefs.routeId] = { ...prefs, updatedAt: Date.now() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch {}
}

function stageIcon(kind: string, icon?: string) {
  if (icon) return icon;
  if (kind === "finish") return "🏁";
  if (kind === "high-point") return "⛰️";
  return "📍";
}

function stageName(kind: string, name: string | undefined, distanceM: number, lang: string) {
  if (name) return name;
  if (kind === "finish") return lang.startsWith("fr") ? "Arrivée" : lang.startsWith("es") ? "Llegada" : "Finish";
  if (kind === "high-point") return lang.startsWith("fr") ? "Point haut" : lang.startsWith("es") ? "Punto alto" : "High point";
  return `${Math.max(1, Math.round(distanceM / 1000))} km`;
}

export function buildOutdoorLongDistancePlan(route: RunningRouteTemplate, sport: OutdoorPerformanceSport, extras: OutdoorRouteExtras, lang = "fr"): OutdoorLongDistancePlan {
  const expectedMs = estimateOutdoorRouteDurationMs(route, sport);
  const distanceM = Math.max(0, Number(route.distanceM || 0));
  const enabled = expectedMs >= 2 * 3_600_000 || distanceM >= (sport === "hiking" ? 12_000 : sport === "trail" ? 15_000 : 18_000);
  const checkpoints = buildOutdoorRouteCheckpoints(route, sport, extras.waypoints);
  const stages = checkpoints
    .filter((checkpoint) => checkpoint.kind === "custom" || checkpoint.kind === "high-point" || checkpoint.kind === "finish" || checkpoint.distanceM % 10_000 < 700)
    .slice(0, 16)
    .map((checkpoint) => ({
      id: checkpoint.id,
      name: stageName(checkpoint.kind, checkpoint.name, checkpoint.distanceM, lang),
      icon: stageIcon(checkpoint.kind, checkpoint.icon),
      distanceM: checkpoint.distanceM,
      estimatedElapsedMs: distanceM > 0 ? expectedMs * Math.max(0, Math.min(1, checkpoint.distanceM / distanceM)) : 0,
      kind: checkpoint.kind,
    }));
  const suggestedBatteryMode = recommendedBatteryMode(expectedMs);
  return {
    enabled,
    expectedMs,
    distanceM,
    stages,
    suggestedBatteryMode,
    estimatedGpsIntervalSec: gpsIntervalSecForBatteryMode(suggestedBatteryMode),
  };
}
