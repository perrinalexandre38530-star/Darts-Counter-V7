import type { TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingProgramDefinition } from "../catalog/trainingProgramCatalog";

const KEY = "dc_training_lab_preferences_v1";

export type TrainingFamilyGoals = Record<TrainingExerciseFamily, number>;

export type TrainingFamilyGoalDeadlines = Record<TrainingExerciseFamily, string | null>;

export type TrainingLabPreferences = {
  favoriteExerciseIds: string[];
  favoritePrograms: TrainingProgramDefinition[];
  familyGoals: TrainingFamilyGoals;
  familyGoalDeadlines: TrainingFamilyGoalDeadlines;
  weeklySessionTarget: number;
};

export const DEFAULT_TRAINING_FAMILY_GOALS: TrainingFamilyGoals = {
  scoring: 70,
  doubles: 65,
  checkout: 65,
  precision: 70,
  bull: 60,
  regularity: 70,
};

export const DEFAULT_TRAINING_GOAL_DEADLINES: TrainingFamilyGoalDeadlines = {
  scoring: null,
  doubles: null,
  checkout: null,
  precision: null,
  bull: null,
  regularity: null,
};

function clampGoal(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(20, Math.min(100, Math.round(n)));
}

function sanitizeProgram(input: any): TrainingProgramDefinition | null {
  if (!input || typeof input !== "object") return null;
  const ids = Array.isArray(input.exerciseIds)
    ? input.exerciseIds.map((id: unknown) => String(id || "")).filter(Boolean)
    : [];
  if (!ids.length) return null;
  const duration = Number(input.durationMin);
  const durationMin: 15 | 30 | 45 = duration === 15 || duration === 45 ? duration : 30;
  const level = String(input.level || "Personnalisé") as TrainingProgramDefinition["level"];
  return {
    id: String(input.id || `favorite_${Date.now()}`),
    title: String(input.title || "PROGRAMME FAVORI"),
    subtitle: String(input.subtitle || "Séance enregistrée"),
    durationMin,
    level,
    exerciseIds: ids,
    accent: typeof input.accent === "string" ? input.accent : undefined,
    focusFamily: input.focusFamily || "balanced",
  };
}

export function loadTrainingLabPreferences(): TrainingLabPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
    const goals = { ...DEFAULT_TRAINING_FAMILY_GOALS };
    for (const family of Object.keys(goals) as TrainingExerciseFamily[]) {
      goals[family] = clampGoal(parsed?.familyGoals?.[family], goals[family]);
    }
    const favoritePrograms = Array.isArray(parsed?.favoritePrograms)
      ? parsed.favoritePrograms.map(sanitizeProgram).filter(Boolean) as TrainingProgramDefinition[]
      : [];
    const deadlines = { ...DEFAULT_TRAINING_GOAL_DEADLINES };
    for (const family of Object.keys(deadlines) as TrainingExerciseFamily[]) {
      const value = parsed?.familyGoalDeadlines?.[family];
      deadlines[family] = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
    }
    return {
      favoriteExerciseIds: Array.isArray(parsed?.favoriteExerciseIds)
        ? Array.from(new Set(parsed.favoriteExerciseIds.map((id: unknown) => String(id || "")).filter(Boolean)))
        : [],
      favoritePrograms: favoritePrograms.slice(0, 12),
      familyGoals: goals,
      familyGoalDeadlines: deadlines,
      weeklySessionTarget: Math.max(1, Math.min(7, Math.round(Number(parsed?.weeklySessionTarget) || 3))),
    };
  } catch {
    return {
      favoriteExerciseIds: [],
      favoritePrograms: [],
      familyGoals: { ...DEFAULT_TRAINING_FAMILY_GOALS },
      familyGoalDeadlines: { ...DEFAULT_TRAINING_GOAL_DEADLINES },
      weeklySessionTarget: 3,
    };
  }
}

export function saveTrainingLabPreferences(input: TrainingLabPreferences) {
  const clean: TrainingLabPreferences = {
    favoriteExerciseIds: Array.from(new Set(input.favoriteExerciseIds || [])).slice(0, 40),
    favoritePrograms: (input.favoritePrograms || []).map(sanitizeProgram).filter(Boolean).slice(0, 12) as TrainingProgramDefinition[],
    familyGoals: { ...DEFAULT_TRAINING_FAMILY_GOALS, ...(input.familyGoals || {}) },
    familyGoalDeadlines: { ...DEFAULT_TRAINING_GOAL_DEADLINES, ...(input.familyGoalDeadlines || {}) },
    weeklySessionTarget: Math.max(1, Math.min(7, Math.round(Number(input.weeklySessionTarget) || 3))),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event("dc-training-lab-preferences-updated"));
  } catch {}
  return clean;
}

export function toggleFavoriteExercise(prefs: TrainingLabPreferences, exerciseId: string) {
  const id = String(exerciseId || "");
  const exists = prefs.favoriteExerciseIds.includes(id);
  return saveTrainingLabPreferences({
    ...prefs,
    favoriteExerciseIds: exists
      ? prefs.favoriteExerciseIds.filter((item) => item !== id)
      : [id, ...prefs.favoriteExerciseIds],
  });
}

export function toggleFavoriteProgram(prefs: TrainingLabPreferences, program: TrainingProgramDefinition) {
  const exists = prefs.favoritePrograms.some((item) => item.id === program.id);
  return saveTrainingLabPreferences({
    ...prefs,
    favoritePrograms: exists
      ? prefs.favoritePrograms.filter((item) => item.id !== program.id)
      : [{ ...program }, ...prefs.favoritePrograms],
  });
}

export function setTrainingFamilyGoal(
  prefs: TrainingLabPreferences,
  family: TrainingExerciseFamily,
  value: number
) {
  return saveTrainingLabPreferences({
    ...prefs,
    familyGoals: {
      ...prefs.familyGoals,
      [family]: clampGoal(value, DEFAULT_TRAINING_FAMILY_GOALS[family]),
    },
  });
}

export function setTrainingFamilyGoalDeadline(
  prefs: TrainingLabPreferences,
  family: TrainingExerciseFamily,
  value: string | null
) {
  const deadline = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  return saveTrainingLabPreferences({
    ...prefs,
    familyGoalDeadlines: { ...prefs.familyGoalDeadlines, [family]: deadline },
  });
}

export function setTrainingWeeklySessionTarget(prefs: TrainingLabPreferences, value: number) {
  return saveTrainingLabPreferences({
    ...prefs,
    weeklySessionTarget: Math.max(1, Math.min(7, Math.round(Number(value) || 3))),
  });
}
