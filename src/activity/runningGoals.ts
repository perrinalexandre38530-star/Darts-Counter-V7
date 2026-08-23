import type { RunningStats } from "./runningInsights";
import { racePredictions } from "./runningTraining";

export type RunningRaceGoalDistance = 5000 | 10000 | 21097 | 42195;

export type RunningRaceGoal = {
  distanceM: RunningRaceGoalDistance;
  targetDate: number;
  targetTimeMs: number;
  createdAt: number;
};

export type RunningRaceGoalSnapshot = {
  goal: RunningRaceGoal;
  daysLeft: number;
  targetPaceSecPerKm: number;
  predictedMs: number | null;
  deltaMs: number | null;
  readinessPct: number | null;
  status: "ahead" | "close" | "behind" | "unknown";
};

export const RUNNING_RACE_GOAL_KEY = "mss-running-race-goal-v1";

function validDistance(value: unknown): value is RunningRaceGoalDistance {
  return [5000, 10000, 21097, 42195].includes(Number(value));
}

export function loadRunningRaceGoal(): RunningRaceGoal | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(RUNNING_RACE_GOAL_KEY) || "null");
    if (!raw || !validDistance(raw.distanceM)) return null;
    const targetDate = Number(raw.targetDate || 0);
    const targetTimeMs = Number(raw.targetTimeMs || 0);
    if (!Number.isFinite(targetDate) || !Number.isFinite(targetTimeMs) || targetDate <= 0 || targetTimeMs <= 0) return null;
    return {
      distanceM: raw.distanceM,
      targetDate,
      targetTimeMs,
      createdAt: Number(raw.createdAt || Date.now()),
    };
  } catch {
    return null;
  }
}

export function saveRunningRaceGoal(goal: RunningRaceGoal | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!goal) localStorage.removeItem(RUNNING_RACE_GOAL_KEY);
    else localStorage.setItem(RUNNING_RACE_GOAL_KEY, JSON.stringify(goal));
  } catch {}
}

export function defaultGoalTimeMs(distanceM: RunningRaceGoalDistance) {
  if (distanceM === 5000) return 30 * 60_000;
  if (distanceM === 10000) return 60 * 60_000;
  if (distanceM === 21097) return 2 * 60 * 60_000;
  return 4 * 60 * 60_000;
}

export function distanceGoalLabel(distanceM: RunningRaceGoalDistance) {
  if (distanceM === 21097) return "SEMI · 21,1 KM";
  if (distanceM === 42195) return "MARATHON · 42,2 KM";
  return `${distanceM / 1000} KM`;
}

export function buildRunningRaceGoalSnapshot(goal: RunningRaceGoal, stats: RunningStats, now = Date.now()): RunningRaceGoalSnapshot {
  const daysLeft = Math.max(0, Math.ceil((goal.targetDate - now) / 86_400_000));
  const targetPaceSecPerKm = goal.targetTimeMs / 1000 / (goal.distanceM / 1000);
  const prediction = racePredictions(stats).find((row) => Math.abs(row.distanceM - goal.distanceM) < 10) || null;
  const predictedMs = prediction?.predictedMs ?? null;
  const deltaMs = predictedMs == null ? null : predictedMs - goal.targetTimeMs;
  const readinessPct = predictedMs == null
    ? null
    : Math.max(0, Math.min(100, Math.round((goal.targetTimeMs / Math.max(goal.targetTimeMs, predictedMs)) * 100)));
  const closeThreshold = Math.max(30_000, goal.targetTimeMs * 0.02);
  const status: RunningRaceGoalSnapshot["status"] = deltaMs == null
    ? "unknown"
    : deltaMs <= -closeThreshold
      ? "ahead"
      : Math.abs(deltaMs) <= closeThreshold
        ? "close"
        : "behind";
  return { goal, daysLeft, targetPaceSecPerKm, predictedMs, deltaMs, readinessPct, status };
}
