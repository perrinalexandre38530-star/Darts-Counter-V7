import { clampRunningNumber as clamp } from "./runningShared";
import type { ActivityRecord } from "./activityTypes";
import type { RunningStats } from "./runningInsights";

export type RunningPlanGoal = "first-5k" | "faster-5k" | "10k" | "half";

export type RunningCustomWorkoutSpec = {
  warmupMin: number;
  workMin: number;
  recoveryMin: number;
  reps: number;
  cooldownMin: number;
  title?: string;
};

export type RunningPlanState = {
  id: string;
  goal: RunningPlanGoal;
  startedAt: number;
  sessionsPerWeek: 3 | 4;
  targetDate?: number | null;
};

export type RunningPlanSession = {
  id: string;
  weekIndex: number;
  sessionIndex: number;
  scheduledAt: number;
  presetId: string;
  title: string;
  subtitle: string;
  targetDurationMs?: number | null;
  targetDistanceM?: number | null;
  customWorkout?: RunningCustomWorkoutSpec | null;
};

export type RunningPlanWeek = {
  weekIndex: number;
  startAt: number;
  sessions: RunningPlanSession[];
};

export type TrainingStatus = {
  acuteLoad7: number;
  chronicWeeklyLoad28: number;
  loadRatio: number | null;
  freshnessScore: number;
  hoursSinceLastRun: number | null;
  loadLabel: "low" | "balanced" | "high";
};

export type PaceZone = {
  id: "z1" | "z2" | "z3" | "z4" | "z5";
  label: string;
  purpose: string;
  fastSecPerKm: number;
  slowSecPerKm: number;
};

export type RacePrediction = {
  distanceM: number;
  predictedMs: number;
  anchorDistanceM: number;
};

export const RUNNING_PLAN_STORAGE_KEY = "mss-running-plan-v1";
export const RUNNING_AUDIO_COACH_KEY = "mss-running-audio-coach-v1";

const DAY = 24 * 60 * 60 * 1000;

function mondayStart(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  return d.getTime();
}

function workoutLoadWeight(type: ActivityRecord["workoutType"]) {
  switch (type) {
    case "intervals": return 1.28;
    case "tempo": return 1.18;
    case "pacer": return 1.08;
    case "distance": return 1.05;
    case "long": return 0.96;
    case "easy": return 0.72;
    default: return 0.86;
  }
}

export function activityTrainingLoad(activity: ActivityRecord): number {
  const minutes = Math.max(0, Number(activity.movingMs || activity.elapsedMs || 0) / 60_000);
  if (!minutes) return 0;
  const rpe = Number(activity.effortRating || 0);
  const rpeFactor = rpe >= 1 && rpe <= 10 ? clamp(0.72 + rpe * 0.085, 0.8, 1.55) : 1;
  return minutes * workoutLoadWeight(activity.workoutType) * rpeFactor;
}

export function buildTrainingStatus(activities: ActivityRecord[], now = Date.now()): TrainingStatus {
  const rows = activities.filter((a) => Number(a.startedAt || 0) > 0);
  const acute = rows
    .filter((a) => now - a.startedAt <= 7 * DAY)
    .reduce((sum, a) => sum + activityTrainingLoad(a), 0);
  const chronic28 = rows
    .filter((a) => now - a.startedAt <= 28 * DAY)
    .reduce((sum, a) => sum + activityTrainingLoad(a), 0) / 4;
  const ratio = chronic28 > 1 ? acute / chronic28 : null;
  const last = rows.slice().sort((a, b) => b.startedAt - a.startedAt)[0] || null;
  const hoursSinceLastRun = last ? Math.max(0, (now - last.startedAt) / 3_600_000) : null;

  let freshness = 72;
  if (hoursSinceLastRun == null) freshness = 92;
  else if (hoursSinceLastRun < 12) freshness -= 34;
  else if (hoursSinceLastRun < 24) freshness -= 22;
  else if (hoursSinceLastRun < 40) freshness -= 11;
  else if (hoursSinceLastRun > 72) freshness += 8;

  if (ratio != null) {
    if (ratio > 1.45) freshness -= 22;
    else if (ratio > 1.2) freshness -= 10;
    else if (ratio < 0.65) freshness += 7;
  }
  if (last?.effortRating && last.effortRating >= 8 && hoursSinceLastRun != null && hoursSinceLastRun < 36) freshness -= 9;
  freshness = Math.round(clamp(freshness, 15, 100));

  const loadLabel: TrainingStatus["loadLabel"] = ratio == null || ratio < 0.7 ? "low" : ratio > 1.35 ? "high" : "balanced";
  return {
    acuteLoad7: Math.round(acute),
    chronicWeeklyLoad28: Math.round(chronic28),
    loadRatio: ratio,
    freshnessScore: freshness,
    hoursSinceLastRun,
    loadLabel,
  };
}

function normalizedPlan(raw: unknown): RunningPlanState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<RunningPlanState>;
  if (!["first-5k", "faster-5k", "10k", "half"].includes(String(value.goal))) return null;
  const startedAt = Number(value.startedAt || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
  const sessionsPerWeek = Number(value.sessionsPerWeek) === 4 ? 4 : 3;
  return {
    id: String(value.id || `plan_${startedAt}`),
    goal: value.goal as RunningPlanGoal,
    startedAt,
    sessionsPerWeek,
    targetDate: Number.isFinite(Number(value.targetDate)) ? Number(value.targetDate) : null,
  };
}

export function loadRunningPlan(): RunningPlanState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return normalizedPlan(JSON.parse(localStorage.getItem(RUNNING_PLAN_STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
}

export function saveRunningPlan(plan: RunningPlanState | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!plan) localStorage.removeItem(RUNNING_PLAN_STORAGE_KEY);
    else localStorage.setItem(RUNNING_PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch {}
}

export function createRunningPlan(goal: RunningPlanGoal, sessionsPerWeek: 3 | 4, now = Date.now()): RunningPlanState {
  const startedAt = mondayStart(now);
  return {
    id: `runplan_${goal}_${startedAt}`,
    goal,
    startedAt,
    sessionsPerWeek,
    targetDate: null,
  };
}

export function planDurationWeeks(goal: RunningPlanGoal) {
  if (goal === "10k") return 10;
  if (goal === "half") return 12;
  return 8;
}

function sessionDays(count: 3 | 4) {
  return count === 4 ? [0, 2, 4, 6] : [1, 3, 6];
}

function planSessionRecipe(goal: RunningPlanGoal, weekIndex: number, slot: number, sessionsPerWeek: 3 | 4) {
  const w = weekIndex + 1;
  const isFourth = sessionsPerWeek === 4 && slot === 3;

  if (goal === "first-5k") {
    if (slot === 0) return { presetId: "easy", title: "ENDURANCE FACILE", subtitle: `${20 + Math.min(20, weekIndex * 3)} min faciles`, targetDurationMs: (20 + Math.min(20, weekIndex * 3)) * 60_000 };
    if (slot === 1) {
      const reps = Math.min(8, 4 + Math.floor(weekIndex / 2));
      return { presetId: "custom", title: "RUN / WALK", subtitle: `${reps} × 2 min course / 1 min marche`, customWorkout: { warmupMin: 5, workMin: 2, recoveryMin: 1, reps, cooldownMin: 5, title: "RUN / WALK" } };
    }
    if (isFourth) return { presetId: "recovery", title: "RÉCUPÉRATION", subtitle: "20 min très faciles", targetDurationMs: 20 * 60_000 };
    const longMin = Math.min(50, 28 + weekIndex * 3);
    return { presetId: "long", title: "SORTIE PROGRESSIVE", subtitle: `${longMin} min en aisance`, targetDurationMs: longMin * 60_000 };
  }

  if (goal === "faster-5k") {
    if (slot === 0) return { presetId: "easy", title: "ENDURANCE", subtitle: `${30 + Math.min(15, weekIndex * 2)} min faciles`, targetDurationMs: (30 + Math.min(15, weekIndex * 2)) * 60_000 };
    if (slot === 1) return weekIndex % 2 === 0
      ? { presetId: "intervals", title: "INTERVALLES", subtitle: `${6 + Math.min(2, Math.floor(weekIndex / 3))} répétitions rapides` }
      : { presetId: "tempo", title: "TEMPO", subtitle: `${18 + Math.min(8, weekIndex)} min soutenues au cœur de la séance` };
    if (isFourth) return { presetId: "recovery", title: "RÉCUPÉRATION", subtitle: "20 min très faciles", targetDurationMs: 20 * 60_000 };
    return { presetId: "long", title: "SORTIE LONGUE", subtitle: `${50 + Math.min(20, weekIndex * 3)} min faciles`, targetDurationMs: (50 + Math.min(20, weekIndex * 3)) * 60_000 };
  }

  if (goal === "10k") {
    if (slot === 0) return { presetId: "easy", title: "ENDURANCE", subtitle: `${35 + Math.min(20, weekIndex * 2)} min faciles`, targetDurationMs: (35 + Math.min(20, weekIndex * 2)) * 60_000 };
    if (slot === 1) return w % 3 === 0
      ? { presetId: "tempo", title: "TEMPO 10K", subtitle: "Travail soutenu et régulier" }
      : { presetId: "intervals", title: "INTERVALLES", subtitle: "Vitesse et économie de course" };
    if (isFourth) return { presetId: "recovery", title: "RÉCUPÉRATION", subtitle: "25 min très faciles", targetDurationMs: 25 * 60_000 };
    return { presetId: "long", title: "SORTIE LONGUE", subtitle: `${60 + Math.min(25, weekIndex * 3)} min faciles`, targetDurationMs: (60 + Math.min(25, weekIndex * 3)) * 60_000 };
  }

  if (slot === 0) return { presetId: "easy", title: "ENDURANCE", subtitle: `${40 + Math.min(20, weekIndex * 2)} min faciles`, targetDurationMs: (40 + Math.min(20, weekIndex * 2)) * 60_000 };
  if (slot === 1) return weekIndex % 2 === 0
    ? { presetId: "tempo", title: "TEMPO SEMI", subtitle: "Bloc soutenu contrôlé" }
    : { presetId: "intervals", title: "INTERVALLES", subtitle: "Travail de vitesse contrôlé" };
  if (isFourth) return { presetId: "recovery", title: "RÉCUPÉRATION", subtitle: "25 min très faciles", targetDurationMs: 25 * 60_000 };
  return { presetId: "long", title: "SORTIE LONGUE", subtitle: `${70 + Math.min(40, weekIndex * 4)} min faciles`, targetDurationMs: (70 + Math.min(40, weekIndex * 4)) * 60_000 };
}

export function buildRunningPlanWeeks(plan: RunningPlanState): RunningPlanWeek[] {
  const weeks = planDurationWeeks(plan.goal);
  const days = sessionDays(plan.sessionsPerWeek);
  return Array.from({ length: weeks }, (_, weekIndex) => {
    const startAt = plan.startedAt + weekIndex * 7 * DAY;
    const sessions = days.map((dayOffset, sessionIndex) => {
      const recipe = planSessionRecipe(plan.goal, weekIndex, sessionIndex, plan.sessionsPerWeek);
      return {
        id: `${plan.id}_w${weekIndex + 1}_s${sessionIndex + 1}`,
        weekIndex,
        sessionIndex,
        scheduledAt: startAt + dayOffset * DAY + 18 * 60 * 60 * 1000,
        ...recipe,
      } satisfies RunningPlanSession;
    });
    return { weekIndex, startAt, sessions };
  });
}

export function planSessionCompletion(session: RunningPlanSession, activities: ActivityRecord[]) {
  return activities.find((activity) => activity.planSessionId === session.id) || null;
}

export function activePlanWeekIndex(plan: RunningPlanState, now = Date.now()) {
  return clamp(Math.floor((mondayStart(now) - plan.startedAt) / (7 * DAY)), 0, planDurationWeeks(plan.goal) - 1);
}

export function nextPlanSession(plan: RunningPlanState, activities: ActivityRecord[], now = Date.now()) {
  const all = buildRunningPlanWeeks(plan).flatMap((week) => week.sessions);
  return all.find((session) => !planSessionCompletion(session, activities) && session.scheduledAt >= now - DAY) || all.find((session) => !planSessionCompletion(session, activities)) || null;
}

export function planCompletionPct(plan: RunningPlanState, activities: ActivityRecord[]) {
  const all = buildRunningPlanWeeks(plan).flatMap((week) => week.sessions);
  if (!all.length) return 0;
  const done = all.filter((session) => !!planSessionCompletion(session, activities)).length;
  return Math.round((done / all.length) * 100);
}

export function paceZonesFromStats(stats: RunningStats): PaceZone[] {
  let reference5kPace: number | null = null;
  if (stats.best5k) reference5kPace = stats.best5k.elapsedMs / 5 / 1000;
  else if (stats.best10k) reference5kPace = stats.best10k.elapsedMs / 10 / 1000 * 0.95;
  else if (stats.best1k) reference5kPace = stats.best1k.elapsedMs / 1000 * 1.16;
  if (!reference5kPace || !Number.isFinite(reference5kPace)) return [];

  const zone = (id: PaceZone["id"], label: string, purpose: string, fastFactor: number, slowFactor: number): PaceZone => ({
    id,
    label,
    purpose,
    fastSecPerKm: Math.round(reference5kPace! * fastFactor),
    slowSecPerKm: Math.round(reference5kPace! * slowFactor),
  });
  return [
    zone("z1", "Z1 · RÉCUP", "Récupération", 1.34, 1.5),
    zone("z2", "Z2 · EASY", "Endurance fondamentale", 1.18, 1.34),
    zone("z3", "Z3 · STEADY", "Endurance active", 1.10, 1.18),
    zone("z4", "Z4 · TEMPO", "Seuil / tempo", 1.02, 1.10),
    zone("z5", "Z5 · FAST", "Intervalles", 0.88, 1.02),
  ];
}

function riegel(sourceMs: number, sourceDistanceM: number, targetDistanceM: number) {
  return sourceMs * Math.pow(targetDistanceM / sourceDistanceM, 1.06);
}

export function racePredictions(stats: RunningStats): RacePrediction[] {
  const anchors = [stats.best10k, stats.best5k, stats.best1k].filter(Boolean) as NonNullable<RunningStats["best5k"]>[];
  const anchor = anchors[0];
  if (!anchor) return [];
  return [5000, 10000, 21097, 42195].map((distanceM) => ({
    distanceM,
    predictedMs: riegel(anchor.elapsedMs, anchor.distanceM, distanceM),
    anchorDistanceM: anchor.distanceM,
  }));
}
