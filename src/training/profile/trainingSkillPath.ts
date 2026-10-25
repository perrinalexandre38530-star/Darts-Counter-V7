import { TRAINING_EXERCISE_CATALOG, TRAINING_FAMILY_META, type TrainingExerciseDefinition, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingFamilyProgression } from "../coach/trainingDiagnosis";

export type TrainingSkillPathStep = {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  unlocked: boolean;
  mastered: boolean;
  exercise: TrainingExerciseDefinition | null;
  exerciseCount: number;
};

export type TrainingSkillPath = {
  family: TrainingExerciseFamily;
  label: string;
  currentLevel: 1 | 2 | 3 | 4 | 5;
  nextLevel: 1 | 2 | 3 | 4 | 5;
  score: number;
  sessions: number;
  headline: string;
  body: string;
  recommendedExercise: TrainingExerciseDefinition;
  steps: TrainingSkillPathStep[];
};

const levelLabels: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "BASE",
  2: "ROUTINE",
  3: "CONSOLIDATION",
  4: "PRESSION",
  5: "MAÎTRISE",
};

function levelFromProgress(row: TrainingFamilyProgression | undefined): 1 | 2 | 3 | 4 | 5 {
  if (!row || row.sessions <= 0) return 1;
  const score = Math.max(0, Number(row.recentAverage || 0));
  const sessions = Math.max(0, Number(row.sessions || 0));
  if (sessions >= 10 && score >= 78) return 5;
  if (sessions >= 7 && score >= 64) return 4;
  if (sessions >= 4 && score >= 50) return 3;
  if (sessions >= 2 && score >= 34) return 2;
  return 1;
}

function pickExercise(family: TrainingExerciseFamily, level: number, usage: Map<string, number>) {
  const familyExercises = TRAINING_EXERCISE_CATALOG.filter((exercise) => exercise.family === family);
  const exact = familyExercises.filter((exercise) => exercise.difficulty === level);
  const pool = exact.length ? exact : [...familyExercises].sort((a, b) => Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level));
  return [...pool].sort((a, b) => (usage.get(a.id) || 0) - (usage.get(b.id) || 0) || a.maxDarts - b.maxDarts)[0] || familyExercises[0] || TRAINING_EXERCISE_CATALOG[0];
}

export function buildTrainingSkillPath(family: TrainingExerciseFamily, progression: TrainingFamilyProgression[]): TrainingSkillPath {
  const row = progression.find((item) => item.family === family);
  const currentLevel = levelFromProgress(row);
  const score = Math.max(0, Math.min(100, Number(row?.recentAverage || 0)));
  const sessions = Math.max(0, Number(row?.sessions || 0));
  const usage = new Map<string, number>();
  for (const point of row?.points || []) {
    if (!point.exerciseId) continue;
    usage.set(point.exerciseId, (usage.get(point.exerciseId) || 0) + 1);
  }
  const recommendedExercise = pickExercise(family, currentLevel, usage);
  const nextLevel = Math.min(5, currentLevel + (score >= 72 && sessions >= currentLevel * 2 ? 1 : 0)) as 1 | 2 | 3 | 4 | 5;
  const steps = ([1, 2, 3, 4, 5] as const).map((level) => {
    const exercises = TRAINING_EXERCISE_CATALOG.filter((exercise) => exercise.family === family && exercise.difficulty === level);
    return {
      level,
      label: levelLabels[level],
      unlocked: level <= currentLevel || level === nextLevel,
      mastered: level < currentLevel || (level === currentLevel && score >= 78),
      exercise: exercises.length ? pickExercise(family, level, usage) : null,
      exerciseCount: exercises.length,
    };
  });
  const label = TRAINING_FAMILY_META[family].label;
  const headline = sessions === 0
    ? `Commencer ${label} • niveau 1`
    : currentLevel >= 5 && score >= 78
      ? `${label} • maîtrise confirmée`
      : `${label} • niveau ${currentLevel}/5`;
  const body = sessions === 0
    ? "Pose une première référence. Le parcours se débloquera ensuite automatiquement avec tes résultats."
    : score >= 72
      ? `Niveau récent ${Math.round(score)}/100. Tu peux consolider ce palier puis tester le suivant.`
      : `Niveau récent ${Math.round(score)}/100. Awena maintient ce palier jusqu'à ce qu'il soit suffisamment stable.`;

  return { family, label, currentLevel, nextLevel, score, sessions, headline, body, recommendedExercise, steps };
}
