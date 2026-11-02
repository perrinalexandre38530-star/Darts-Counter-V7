import { TRAINING_EXERCISE_CATALOG, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";

export type TrainingSkillTrendStatus = "progress" | "stable" | "decline" | "new";

export type TrainingSkillTrendRow = {
  family: TrainingExerciseFamily;
  attempts: number;
  currentAverage: number;
  previousAverage: number;
  delta: number | null;
  status: TrainingSkillTrendStatus;
  priorityScore: number;
};

export type TrainingSkillTrend = {
  rows: TrainingSkillTrendRow[];
  priorityFamily: TrainingExerciseFamily;
  strongestFamily: TrainingExerciseFamily;
  activeFamilies: number;
};

const FAMILY_ORDER: TrainingExerciseFamily[] = ["scoring", "doubles", "checkout", "precision", "bull", "regularity"];
const DAY_MS = 24 * 60 * 60 * 1000;

function sessionAt(row: any) {
  return Number(row?.endedAt || row?.completedAt || row?.createdAt || row?.startedAt || 0) || 0;
}

function scoreOf(row: any) {
  return Math.max(0, Math.min(100, Number(row?.metrics?.performanceScore ?? row?.metrics?.score ?? row?.score ?? 0) || 0));
}

function familyOf(row: any): TrainingExerciseFamily | null {
  const explicit = String(row?.metrics?.family || row?.config?.family || "").trim() as TrainingExerciseFamily;
  if (FAMILY_ORDER.includes(explicit)) return explicit;
  const exerciseId = String(row?.metrics?.exerciseId || row?.config?.exerciseId || "").trim();
  if (!exerciseId) return null;
  return TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === exerciseId)?.family || null;
}

function average(rows: any[]) {
  if (!rows.length) return 0;
  return Math.round(rows.reduce((sum, row) => sum + scoreOf(row), 0) / rows.length);
}

export function buildTrainingSkillTrend(sessions: any[], now = Date.now()): TrainingSkillTrend {
  const safe = (Array.isArray(sessions) ? sessions : []).filter((row) => familyOf(row));
  const currentStart = now - 14 * DAY_MS;
  const previousStart = now - 28 * DAY_MS;
  const rows = FAMILY_ORDER.map((family) => {
    const current = safe.filter((row) => familyOf(row) === family && sessionAt(row) >= currentStart && sessionAt(row) <= now);
    const previous = safe.filter((row) => familyOf(row) === family && sessionAt(row) >= previousStart && sessionAt(row) < currentStart);
    const currentAverage = average(current);
    const previousAverage = average(previous);
    const delta = current.length && previous.length ? currentAverage - previousAverage : null;
    const status: TrainingSkillTrendStatus = !current.length ? "new" : delta == null ? "stable" : delta >= 4 ? "progress" : delta <= -4 ? "decline" : "stable";
    // Lower score = higher training priority. Decline and low performance are intentionally weighted most.
    const priorityScore = (current.length ? currentAverage : 58) + (status === "decline" ? -18 : status === "progress" ? 10 : 0) + Math.min(12, current.length * 2);
    return { family, attempts: current.length, currentAverage, previousAverage, delta, status, priorityScore };
  });
  const priorityFamily = [...rows].sort((a, b) => a.priorityScore - b.priorityScore)[0]?.family || "scoring";
  const strongestFamily = [...rows].filter((row) => row.attempts > 0).sort((a, b) => b.currentAverage - a.currentAverage)[0]?.family || priorityFamily;
  return { rows, priorityFamily, strongestFamily, activeFamilies: rows.filter((row) => row.attempts > 0).length };
}
