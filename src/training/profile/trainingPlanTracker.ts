import type { TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";

const KEY = "dc_training_plan_tracker_v1";

export type TrainingProgramSessionRecord = {
  id: string;
  endedAt: number;
  programId: string;
  programTitle: string;
  durationMin: number;
  exerciseIds: string[];
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
