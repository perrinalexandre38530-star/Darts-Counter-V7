import { outdoorWaypointIcon, saveRunningLocalJson } from "./runningShared";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorWaypointKind = "water" | "food" | "shelter" | "summit" | "danger" | "poi";

export type OutdoorCustomWaypoint = {
  id: string;
  routeId: string;
  name: string;
  kind: OutdoorWaypointKind;
  distanceM: number;
  note?: string;
  createdAt: number;
};

export type OutdoorRouteExtras = {
  routeId: string;
  waypoints: OutdoorCustomWaypoint[];
  offRouteAlertM: number;
  alertsEnabled: boolean;
  updatedAt: number;
};

const STORAGE_KEY = "mss-outdoor-route-extras-v1";

function loadAll(): Record<string, OutdoorRouteExtras> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function defaultOutdoorRouteExtras(routeId: string): OutdoorRouteExtras {
  return { routeId, waypoints: [], offRouteAlertM: 120, alertsEnabled: true, updatedAt: Date.now() };
}

export function loadOutdoorRouteExtras(routeId: string): OutdoorRouteExtras {
  const stored = loadAll()[routeId];
  if (!stored) return defaultOutdoorRouteExtras(routeId);
  return {
    routeId,
    waypoints: Array.isArray(stored.waypoints) ? stored.waypoints.filter((item) => item && item.routeId === routeId) : [],
    offRouteAlertM: Math.max(60, Math.min(500, Number(stored.offRouteAlertM || 120))),
    alertsEnabled: stored.alertsEnabled !== false,
    updatedAt: Number(stored.updatedAt || Date.now()),
  };
}

export function saveOutdoorRouteExtras(extras: OutdoorRouteExtras) {
  const all = loadAll();
  all[extras.routeId] = { ...extras, updatedAt: Date.now() };
  saveRunningLocalJson(STORAGE_KEY, all);
}

export function addOutdoorWaypoint(route: RunningRouteTemplate, input: Omit<OutdoorCustomWaypoint, "id" | "routeId" | "createdAt">): OutdoorRouteExtras {
  const current = loadOutdoorRouteExtras(route.id);
  const waypoint: OutdoorCustomWaypoint = {
    ...input,
    id: `wp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    routeId: route.id,
    distanceM: Math.max(0, Math.min(Number(route.distanceM || 0), Number(input.distanceM || 0))),
    createdAt: Date.now(),
  };
  const next = { ...current, waypoints: [...current.waypoints, waypoint].sort((a, b) => a.distanceM - b.distanceM), updatedAt: Date.now() };
  saveOutdoorRouteExtras(next);
  return next;
}

export function removeOutdoorWaypoint(routeId: string, waypointId: string): OutdoorRouteExtras {
  const current = loadOutdoorRouteExtras(routeId);
  const next = { ...current, waypoints: current.waypoints.filter((item) => item.id !== waypointId), updatedAt: Date.now() };
  saveOutdoorRouteExtras(next);
  return next;
}

export function updateOutdoorRouteAlertPrefs(routeId: string, patch: Partial<Pick<OutdoorRouteExtras, "offRouteAlertM" | "alertsEnabled">>): OutdoorRouteExtras {
  const current = loadOutdoorRouteExtras(routeId);
  const next = {
    ...current,
    ...patch,
    offRouteAlertM: Math.max(60, Math.min(500, Number(patch.offRouteAlertM ?? current.offRouteAlertM))),
    alertsEnabled: patch.alertsEnabled ?? current.alertsEnabled,
    updatedAt: Date.now(),
  };
  saveOutdoorRouteExtras(next);
  return next;
}


export const waypointIcon = outdoorWaypointIcon;
