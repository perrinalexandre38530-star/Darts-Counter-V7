import type { TrainingExerciseDefinition } from "../catalog/trainingExerciseCatalog";
import { getTrainingDetailedSessions } from "../stats/trainingStatsHub";
import { buildTrainingExerciseProgression, type TrainingExerciseProgression } from "./trainingExerciseProgression";

export type TrainingExerciseProgressionSnapshot = {
  progression: TrainingExerciseProgression;
  bestPerformance: number;
  attempts: number;
};

export type TrainingExercisePostSessionFeedback = {
  beforeLevel: number;
  afterLevel: number;
  levelUp: boolean;
  masteredNow: boolean;
  newRecord: boolean;
  previousBest: number;
  currentPerformance: number;
  nextObjective: string;
  currentObjective: string;
};

function exerciseRows(exerciseId: string, participantId: string | null) {
  return getTrainingDetailedSessions({ modeId: "training_lab", participantId, limit: 600 })
    .filter((row) => String(row?.metrics?.exerciseId || row?.config?.exerciseId || "") === exerciseId);
}

export function getTrainingExerciseProgressionSnapshot(exercise: TrainingExerciseDefinition, participantId: string | null): TrainingExerciseProgressionSnapshot {
  const rows = exerciseRows(exercise.id, participantId);
  return {
    progression: buildTrainingExerciseProgression(exercise, rows),
    bestPerformance: rows.reduce((best, row) => Math.max(best, Number(row?.metrics?.performanceScore ?? row?.metrics?.score ?? 0) || 0), 0),
    attempts: rows.length,
  };
}

export function buildTrainingExercisePostSessionFeedback(
  exercise: TrainingExerciseDefinition,
  participantId: string | null,
  before: TrainingExerciseProgressionSnapshot,
  currentPerformance: number,
): TrainingExercisePostSessionFeedback {
  const after = getTrainingExerciseProgressionSnapshot(exercise, participantId);
  const beforeLevel = before.progression.level;
  const afterLevel = after.progression.level;
  const normalizedPerformance = Math.max(0, Math.min(100, Math.round(Number(currentPerformance) || 0)));
  return {
    beforeLevel,
    afterLevel,
    levelUp: afterLevel > beforeLevel,
    masteredNow: !before.progression.mastered && after.progression.mastered,
    newRecord: normalizedPerformance > before.bestPerformance,
    previousBest: Math.round(before.bestPerformance),
    currentPerformance: normalizedPerformance,
    nextObjective: after.progression.nextObjective,
    currentObjective: after.progression.currentObjective,
  };
}
