import { TRAINING_EXERCISE_CATALOG, TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import { buildCustomProgram, type TrainingProgramDefinition, type TrainingProgramBuildOptions } from "../catalog/trainingProgramCatalog";
import type { TrainingActionCoach } from "./trainingActionCoach";
import type { TrainingLoadSummary } from "./trainingLoadCoach";

export type TrainingDailyPlanPhase = {
  id: "warmup" | "core" | "finish";
  label: string;
  exerciseIds: string[];
};

export type TrainingDailyPlan = {
  dateKey: string;
  title: string;
  subtitle: string;
  durationMin: 15 | 30 | 45;
  family: TrainingExerciseFamily | "balanced";
  familyLabel: string;
  intensity: TrainingProgramBuildOptions["intensity"];
  program: TrainingProgramDefinition;
  phases: TrainingDailyPlanPhase[];
  rationale: string;
};

function dateKeyLocal(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function resolveIntensity(action: TrainingActionCoach, load: TrainingLoadSummary): TrainingProgramBuildOptions["intensity"] {
  if (action.reason === "recovery" || load.status === "high" || load.status === "recovery") return "accessible";
  if (action.reason === "block" && action.durationMin === 45 && load.status === "low") return "intense";
  return "standard";
}

function phaseSplit(ids: string[]): TrainingDailyPlanPhase[] {
  if (!ids.length) return [];
  const count = ids.length;
  const warmupCount = count >= 8 ? 2 : 1;
  const finishCount = count >= 8 ? 2 : 1;
  const warmup = ids.slice(0, Math.min(warmupCount, count));
  const finishStart = Math.max(warmup.length, count - finishCount);
  const core = ids.slice(warmup.length, finishStart);
  const finish = ids.slice(finishStart);
  return [
    { id: "warmup", label: "ÉCHAUFFEMENT", exerciseIds: warmup },
    { id: "core", label: "BLOC PRINCIPAL", exerciseIds: core },
    { id: "finish", label: "FINISH", exerciseIds: finish },
  ].filter((phase) => phase.exerciseIds.length > 0) as TrainingDailyPlanPhase[];
}

function describeExercise(id: string) {
  return TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === id)?.title || id;
}

export function buildTrainingDailyPlan(
  action: TrainingActionCoach,
  load: TrainingLoadSummary,
  now = new Date(),
): TrainingDailyPlan {
  const intensity = resolveIntensity(action, load);
  const base = buildCustomProgram({
    durationMin: action.durationMin,
    focusFamily: action.family,
    intensity,
  });
  const dateKey = dateKeyLocal(now);
  const familyLabel = action.family === "balanced" ? "ÉQUILIBRÉ" : TRAINING_FAMILY_META[action.family].label;
  const program: TrainingProgramDefinition = {
    ...base,
    id: `daily_${dateKey}_${action.durationMin}_${action.family}_${intensity}`,
    title: `PLAN DU JOUR • ${familyLabel}`,
    subtitle: `${action.title} • ${base.exerciseIds.length} étapes guidées par Awena.`,
    level: "Coach",
  };
  const phases = phaseSplit(program.exerciseIds);
  const first = program.exerciseIds[0] ? describeExercise(program.exerciseIds[0]) : "échauffement";
  const last = program.exerciseIds[program.exerciseIds.length - 1] ? describeExercise(program.exerciseIds[program.exerciseIds.length - 1]) : "finish";
  return {
    dateKey,
    title: program.title,
    subtitle: program.subtitle,
    durationMin: action.durationMin,
    family: action.family,
    familyLabel,
    intensity,
    program,
    phases,
    rationale: `${action.body} Départ sur ${first}, fin sur ${last}.`,
  };
}
