import type { ActivityRecord } from "./activityTypes";
import {
  buildRunningPlanWeeks,
  buildTrainingStatus,
  planSessionCompletion,
  type RunningPlanSession,
  type RunningPlanState,
  type RunningPlanWeek,
} from "./runningTraining";

export type RunningPlanAdaptationMode = "recover" | "maintain" | "progress";

export type RunningPlanAdaptation = {
  mode: RunningPlanAdaptationMode;
  readinessScore: number;
  compliancePct: number;
  loadRatio: number | null;
  recentHardRuns: number;
  factor: number;
  reasonCode: "fatigue" | "progress" | "missed" | "stable";
};

const DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function recentHardRuns(activities: ActivityRecord[], now: number) {
  return activities.filter((activity) => {
    if (now - activity.startedAt > 10 * DAY) return false;
    const hardFeeling = activity.feeling === "hard" || activity.feeling === "tired";
    const highRpe = Number(activity.effortRating || 0) >= 8;
    return hardFeeling || highRpe;
  }).length;
}

function scheduledCompliance(plan: RunningPlanState, activities: ActivityRecord[], now: number) {
  const past = buildRunningPlanWeeks(plan)
    .flatMap((week) => week.sessions)
    .filter((session) => session.scheduledAt <= now);
  if (!past.length) return 100;
  const completed = past.filter((session) => !!planSessionCompletion(session, activities)).length;
  return Math.round((completed / past.length) * 100);
}

export function buildRunningPlanAdaptation(plan: RunningPlanState, activities: ActivityRecord[], now = Date.now()): RunningPlanAdaptation {
  const training = buildTrainingStatus(activities, now);
  const compliancePct = scheduledCompliance(plan, activities, now);
  const hardRuns = recentHardRuns(activities, now);
  const ratio = training.loadRatio;

  let mode: RunningPlanAdaptationMode = "maintain";
  let factor = 1;
  let reasonCode: RunningPlanAdaptation["reasonCode"] = "stable";

  if (training.freshnessScore < 48 || hardRuns >= 2 || (ratio != null && ratio > 1.35)) {
    mode = "recover";
    factor = 0.9;
    reasonCode = "fatigue";
  } else if (compliancePct >= 82 && hardRuns === 0 && training.freshnessScore >= 68 && (ratio == null || ratio <= 1.15)) {
    mode = "progress";
    factor = 1.05;
    reasonCode = "progress";
  } else if (compliancePct < 55) {
    mode = "recover";
    factor = 0.92;
    reasonCode = "missed";
  }

  const readinessScore = Math.round(clamp(training.freshnessScore * 0.65 + compliancePct * 0.35, 10, 100));
  return { mode, readinessScore, compliancePct, loadRatio: ratio, recentHardRuns: hardRuns, factor, reasonCode };
}

function adaptSession(session: RunningPlanSession, adaptation: RunningPlanAdaptation, now: number): RunningPlanSession {
  if (session.scheduledAt < now) return session;
  if (adaptation.mode === "maintain") return session;

  const next: RunningPlanSession = { ...session };
  const canScaleDuration = ["easy", "long", "recovery", "tempo"].includes(session.presetId);
  if (canScaleDuration && session.targetDurationMs) {
    const scaled = Math.round((session.targetDurationMs * adaptation.factor) / 60_000) * 60_000;
    next.targetDurationMs = Math.max(15 * 60_000, scaled);
  }

  if (session.customWorkout) {
    const repsDelta = adaptation.mode === "progress" ? 1 : -1;
    next.customWorkout = {
      ...session.customWorkout,
      reps: clamp(session.customWorkout.reps + repsDelta, 3, 12),
    };
  }

  const marker = adaptation.mode === "progress" ? "↗" : "↘";
  next.subtitle = `${marker} ${session.subtitle}`;
  return next;
}

export function buildAdaptiveRunningPlanWeeks(plan: RunningPlanState, activities: ActivityRecord[], now = Date.now()): RunningPlanWeek[] {
  const adaptation = buildRunningPlanAdaptation(plan, activities, now);
  return buildRunningPlanWeeks(plan).map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      if (planSessionCompletion(session, activities)) return session;
      return adaptSession(session, adaptation, now);
    }),
  }));
}

export function nextAdaptivePlanSession(plan: RunningPlanState, activities: ActivityRecord[], now = Date.now()) {
  const all = buildAdaptiveRunningPlanWeeks(plan, activities, now).flatMap((week) => week.sessions);
  return all.find((session) => !planSessionCompletion(session, activities) && session.scheduledAt >= now - DAY)
    || all.find((session) => !planSessionCompletion(session, activities))
    || null;
}
