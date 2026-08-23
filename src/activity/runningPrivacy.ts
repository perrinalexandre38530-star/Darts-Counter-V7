import { haversineMeters } from "./activityMath";
import type { GeoPoint } from "./activityTypes";

export type RunningPrivacyRadiusM = 0 | 200 | 500 | 1000;
export type RunningPrivacyPrefs = {
  hideStartEndM: RunningPrivacyRadiusM;
  includeTimestampsInExport: boolean;
};

const STORAGE_KEY = "mss-running-privacy-v1";
const DEFAULT_PREFS: RunningPrivacyPrefs = {
  hideStartEndM: 200,
  includeTimestampsInExport: true,
};

export function loadRunningPrivacyPrefs(): RunningPrivacyPrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<RunningPrivacyPrefs> | null;
    if (!parsed) return { ...DEFAULT_PREFS };
    const radius = [0, 200, 500, 1000].includes(Number(parsed.hideStartEndM)) ? Number(parsed.hideStartEndM) as RunningPrivacyRadiusM : DEFAULT_PREFS.hideStartEndM;
    return {
      hideStartEndM: radius,
      includeTimestampsInExport: parsed.includeTimestampsInExport !== false,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveRunningPrivacyPrefs(prefs: RunningPrivacyPrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

function cumulativeDistances(points: GeoPoint[]): number[] {
  const out = new Array(points.length).fill(0);
  for (let index = 1; index < points.length; index += 1) out[index] = out[index - 1] + haversineMeters(points[index - 1], points[index]);
  return out;
}

/**
 * Privacy is applied only to exported/shared copies. The original local activity
 * keeps its full GPS route so stats, Ghost and segments stay accurate.
 */
export function privacyTrimRoute(points: GeoPoint[], radiusM: number): GeoPoint[] {
  if (!Array.isArray(points) || points.length < 2 || radiusM <= 0) return (points || []).map((point) => ({ ...point }));
  const cumulative = cumulativeDistances(points);
  const total = cumulative[cumulative.length - 1] || 0;
  if (total <= 0) return points.map((point) => ({ ...point }));
  const safeRadius = Math.min(Math.max(0, radiusM), total * 0.4);
  const out = points.filter((_, index) => cumulative[index] >= safeRadius && total - cumulative[index] >= safeRadius);
  return out.length >= 2 ? out.map((point) => ({ ...point })) : [];
}
