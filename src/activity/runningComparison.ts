import type { ActivityRecord } from "./activityTypes";

export type RunningComparison = {
  distanceDeltaM: number;
  elapsedDeltaMs: number;
  paceDeltaSecPerKm: number | null;
  elevationDeltaM: number;
  splitRows: Array<{ km: number; aPace: number | null; bPace: number | null }>;
};

export function compareRunningActivities(a: ActivityRecord, b: ActivityRecord): RunningComparison {
  const max = Math.max(a.splits?.length || 0, b.splits?.length || 0);
  const splitRows = Array.from({ length: max }, (_, i) => ({
    km: i + 1,
    aPace: Number.isFinite(a.splits?.[i]?.paceSecPerKm) ? Number(a.splits[i].paceSecPerKm) : null,
    bPace: Number.isFinite(b.splits?.[i]?.paceSecPerKm) ? Number(b.splits[i].paceSecPerKm) : null,
  }));
  return {
    distanceDeltaM: a.distanceM - b.distanceM,
    elapsedDeltaMs: a.elapsedMs - b.elapsedMs,
    paceDeltaSecPerKm: a.avgPaceSecPerKm != null && b.avgPaceSecPerKm != null ? a.avgPaceSecPerKm - b.avgPaceSecPerKm : null,
    elevationDeltaM: a.elevationGainM - b.elevationGainM,
    splitRows,
  };
}
