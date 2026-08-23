import type { ActivityRecord } from "./activityTypes";

export type RunningRunAnalysis = {
  consistencyScore: number | null;
  fastestSplit: { index: number; paceSecPerKm: number } | null;
  slowestSplit: { index: number; paceSecPerKm: number } | null;
  firstHalfPace: number | null;
  secondHalfPace: number | null;
  secondHalfDeltaSecPerKm: number | null;
  negativeSplit: boolean;
  pacingLabel: "stable" | "progressive" | "fade" | "insufficient";
};

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function analyseRunningActivity(activity: ActivityRecord): RunningRunAnalysis {
  const splits = (activity.splits || []).filter((split) => Number.isFinite(split.paceSecPerKm) && split.paceSecPerKm > 0);
  if (splits.length < 2) {
    return { consistencyScore: null, fastestSplit: null, slowestSplit: null, firstHalfPace: null, secondHalfPace: null, secondHalfDeltaSecPerKm: null, negativeSplit: false, pacingLabel: "insufficient" };
  }

  const paces = splits.map((split) => split.paceSecPerKm);
  const mean = avg(paces)!;
  const variance = paces.reduce((sum, pace) => sum + Math.pow(pace - mean, 2), 0) / paces.length;
  const stdev = Math.sqrt(variance);
  const cv = mean > 0 ? stdev / mean : 1;
  const consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - cv * 260)));

  const fastestRaw = splits.reduce((best, split) => split.paceSecPerKm < best.paceSecPerKm ? split : best, splits[0]);
  const slowestRaw = splits.reduce((worst, split) => split.paceSecPerKm > worst.paceSecPerKm ? split : worst, splits[0]);
  const midpoint = Math.ceil(splits.length / 2);
  const firstHalfPace = avg(splits.slice(0, midpoint).map((split) => split.paceSecPerKm));
  const secondHalfPace = avg(splits.slice(midpoint).map((split) => split.paceSecPerKm));
  const secondHalfDeltaSecPerKm = firstHalfPace != null && secondHalfPace != null ? secondHalfPace - firstHalfPace : null;
  const negativeSplit = secondHalfDeltaSecPerKm != null && secondHalfDeltaSecPerKm < -2;

  let pacingLabel: RunningRunAnalysis["pacingLabel"] = "stable";
  if (secondHalfDeltaSecPerKm != null && secondHalfDeltaSecPerKm <= -5) pacingLabel = "progressive";
  else if (secondHalfDeltaSecPerKm != null && secondHalfDeltaSecPerKm >= 8) pacingLabel = "fade";

  return {
    consistencyScore,
    fastestSplit: { index: fastestRaw.index, paceSecPerKm: fastestRaw.paceSecPerKm },
    slowestSplit: { index: slowestRaw.index, paceSecPerKm: slowestRaw.paceSecPerKm },
    firstHalfPace,
    secondHalfPace,
    secondHalfDeltaSecPerKm,
    negativeSplit,
    pacingLabel,
  };
}
