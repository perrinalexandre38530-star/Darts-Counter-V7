import type { TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";

const KEY = "dc_training_plan_tracker_v1";

export type TrainingProgramSessionRecord = {
  id: string;
  endedAt: number;
  programId: string;
  programTitle: string;
  durationMin: number;
  exerciseIds: string[];
  plannedExerciseIds: string[];
  adaptationCount: number;
  targetHitCount: number;
  families: TrainingExerciseFamily[];
  steps: number;
  successes: number;
  darts: number;
  accuracyPct: number;
  performanceScore: number;
};

function sanitizeRecord(input: any): TrainingProgramSessionRecord | null {
  if (!input || typeof input !== "object") return null;
  const endedAt = Number(input.endedAt);
  if (!Number.isFinite(endedAt) || endedAt <= 0) return null;
  const exerciseIds = Array.isArray(input.exerciseIds) ? input.exerciseIds.map(String).filter(Boolean) : [];
  const plannedExerciseIds = Array.isArray(input.plannedExerciseIds) ? input.plannedExerciseIds.map(String).filter(Boolean) : exerciseIds.slice();
  const families = Array.isArray(input.families)
    ? input.families.map(String).filter(Boolean) as TrainingExerciseFamily[]
    : [];
  return {
    id: String(input.id || `program_${endedAt}`),
    endedAt,
    programId: String(input.programId || "program"),
    programTitle: String(input.programTitle || "Programme Training"),
    durationMin: Math.max(0, Math.round(Number(input.durationMin) || 0)),
    exerciseIds,
    plannedExerciseIds,
    adaptationCount: Math.max(0, Math.round(Number(input.adaptationCount) || 0)),
    targetHitCount: Math.max(0, Math.round(Number(input.targetHitCount) || 0)),
    families,
    steps: Math.max(0, Math.round(Number(input.steps) || exerciseIds.length)),
    successes: Math.max(0, Math.round(Number(input.successes) || 0)),
    darts: Math.max(0, Math.round(Number(input.darts) || 0)),
    accuracyPct: Math.max(0, Math.min(100, Number(input.accuracyPct) || 0)),
    performanceScore: Math.max(0, Math.min(100, Number(input.performanceScore) || 0)),
  };
}

export function loadTrainingProgramSessions(): TrainingProgramSessionRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(sanitizeRecord).filter(Boolean).sort((a, b) => b!.endedAt - a!.endedAt).slice(0, 160) as TrainingProgramSessionRecord[];
  } catch {
    return [];
  }
}

export function recordTrainingProgramSession(input: Omit<TrainingProgramSessionRecord, "id" | "endedAt"> & { endedAt?: number }) {
  const endedAt = Number(input.endedAt) || Date.now();
  const record = sanitizeRecord({ ...input, endedAt, id: `program_${endedAt}_${Math.random().toString(36).slice(2, 7)}` });
  if (!record) return null;
  try {
    const existing = loadTrainingProgramSessions();
    const next = [record, ...existing].slice(0, 160);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("dc-training-plan-updated"));
  } catch {}
  return record;
}

function startOfWeek(timestamp: number) {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

export type TrainingWeeklyPlanStats = {
  weekStart: number;
  completed: number;
  target: number;
  remaining: number;
  completionPct: number;
  streakWeeks: number;
  bestSession: TrainingProgramSessionRecord | null;
  latestSession: TrainingProgramSessionRecord | null;
};

export function buildTrainingWeeklyPlanStats(records: TrainingProgramSessionRecord[], target: number, now = Date.now()): TrainingWeeklyPlanStats {
  const safeTarget = Math.max(1, Math.min(7, Math.round(Number(target) || 3)));
  const weekStart = startOfWeek(now);
  const completed = records.filter((row) => row.endedAt >= weekStart && row.endedAt <= now).length;
  let streakWeeks = 0;
  let cursor = weekStart;
  for (let i = 0; i < 52; i += 1) {
    const end = cursor + 7 * 24 * 60 * 60 * 1000;
    const count = records.filter((row) => row.endedAt >= cursor && row.endedAt < end).length;
    if (count >= safeTarget) streakWeeks += 1;
    else if (i > 0 || completed < safeTarget) break;
    cursor -= 7 * 24 * 60 * 60 * 1000;
  }
  const bestSession = records.reduce<TrainingProgramSessionRecord | null>((best, row) => !best || row.performanceScore > best.performanceScore ? row : best, null);
  return {
    weekStart,
    completed,
    target: safeTarget,
    remaining: Math.max(0, safeTarget - completed),
    completionPct: Math.min(100, (completed / safeTarget) * 100),
    streakWeeks,
    bestSession,
    latestSession: records[0] || null,
  };
}


const DRAFT_KEY = "dc_training_program_draft_v1";

export type TrainingProgramDraftStep = {
  exerciseId: string;
  exerciseTitle: string;
  family: TrainingExerciseFamily;
  success: boolean;
  darts: number;
  hits: number;
  points: number;
  completionPct: number;
  accuracyPct: number;
  performanceScore: number;
};

export type TrainingProgramDraft = {
  savedAt: number;
  programId: string;
  programTitle: string;
  durationMin: number;
  exerciseIds: string[];
  focusFamily: TrainingExerciseFamily | "balanced";
  nextStepIndex: number;
  completedSteps: TrainingProgramDraftStep[];
};

function sanitizeDraftStep(input: any): TrainingProgramDraftStep | null {
  if (!input || typeof input !== "object" || !input.exerciseId) return null;
  return {
    exerciseId: String(input.exerciseId),
    exerciseTitle: String(input.exerciseTitle || input.exerciseId),
    family: String(input.family || "precision") as TrainingExerciseFamily,
    success: !!input.success,
    darts: Math.max(0, Math.round(Number(input.darts) || 0)),
    hits: Math.max(0, Math.round(Number(input.hits) || 0)),
    points: Math.max(0, Math.round(Number(input.points) || 0)),
    completionPct: Math.max(0, Math.min(100, Number(input.completionPct) || 0)),
    accuracyPct: Math.max(0, Math.min(100, Number(input.accuracyPct) || 0)),
    performanceScore: Math.max(0, Math.min(100, Number(input.performanceScore) || 0)),
  };
}

export function loadTrainingProgramDraft(): TrainingProgramDraft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!raw || typeof raw !== "object") return null;
    const exerciseIds = Array.isArray(raw.exerciseIds) ? raw.exerciseIds.map(String).filter(Boolean) : [];
    if (exerciseIds.length < 2) return null;
    const completedSteps = (Array.isArray(raw.completedSteps) ? raw.completedSteps : []).map(sanitizeDraftStep).filter(Boolean) as TrainingProgramDraftStep[];
    const nextStepIndex = Math.max(0, Math.min(exerciseIds.length - 1, Math.round(Number(raw.nextStepIndex) || completedSteps.length)));
    return {
      savedAt: Number(raw.savedAt) || Date.now(),
      programId: String(raw.programId || "program"),
      programTitle: String(raw.programTitle || "Programme Training"),
      durationMin: Math.max(0, Math.round(Number(raw.durationMin) || 0)),
      exerciseIds,
      focusFamily: (raw.focusFamily === "balanced" ? "balanced" : String(raw.focusFamily || "precision")) as TrainingExerciseFamily | "balanced",
      nextStepIndex,
      completedSteps,
    };
  } catch {
    return null;
  }
}

export function saveTrainingProgramDraft(input: Omit<TrainingProgramDraft, "savedAt"> & { savedAt?: number }) {
  const value: TrainingProgramDraft = {
    ...input,
    savedAt: Number(input.savedAt) || Date.now(),
    exerciseIds: input.exerciseIds.map(String).filter(Boolean),
    nextStepIndex: Math.max(0, Math.min(Math.max(0, input.exerciseIds.length - 1), Math.round(Number(input.nextStepIndex) || 0))),
    completedSteps: input.completedSteps.map((row) => sanitizeDraftStep(row)).filter(Boolean) as TrainingProgramDraftStep[],
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event("dc-training-program-draft-updated"));
  } catch {}
  return value;
}

export function clearTrainingProgramDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    window.dispatchEvent(new Event("dc-training-program-draft-updated"));
  } catch {}
}

export type TrainingCycleComparison = {
  recentSessions: number;
  previousSessions: number;
  recentAverage: number;
  previousAverage: number;
  delta: number;
  consistency: number;
  direction: "up" | "stable" | "down" | "new";
  headline: string;
};

export function buildTrainingCycleComparison(records: TrainingProgramSessionRecord[], windowSize = 4): TrainingCycleComparison {
  const size = Math.max(2, Math.min(8, Math.round(Number(windowSize) || 4)));
  const recent = records.slice(0, size);
  const previous = records.slice(size, size * 2);
  const avg = (rows: TrainingProgramSessionRecord[]) => rows.length ? rows.reduce((sum, row) => sum + row.performanceScore, 0) / rows.length : 0;
  const recentAverage = avg(recent);
  const previousAverage = avg(previous);
  const delta = previous.length ? recentAverage - previousAverage : 0;
  const deviations = recent.map((row) => Math.abs(row.performanceScore - recentAverage));
  const meanDeviation = deviations.length ? deviations.reduce((sum, value) => sum + value, 0) / deviations.length : 0;
  const consistency = Math.max(0, Math.min(100, 100 - meanDeviation * 2.2));
  const direction: TrainingCycleComparison["direction"] = !previous.length ? "new" : delta >= 4 ? "up" : delta <= -4 ? "down" : "stable";
  const headline = direction === "up" ? "Cycle en progression" : direction === "down" ? "Cycle à consolider" : direction === "stable" ? "Cycle stable" : "Référence en construction";
  return { recentSessions: recent.length, previousSessions: previous.length, recentAverage, previousAverage, delta, consistency, direction, headline };
}
