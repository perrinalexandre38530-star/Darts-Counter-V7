import { TRAINING_EXERCISE_CATALOG, type TrainingExerciseDefinition } from "../catalog/trainingExerciseCatalog";

export type TrainingLivePhase = "warmup" | "core" | "finish";

export type TrainingLiveStepResult = {
  success: boolean;
  performanceScore: number;
  accuracyPct: number;
  completionPct: number;
};

export type TrainingLiveStepCoach = {
  phase: TrainingLivePhase;
  phaseLabel: string;
  cue: string;
  objective: string;
  targetScore: number;
};

export type TrainingLiveAdaptation = {
  replacementExerciseId: string | null;
  tone: "positive" | "neutral" | "caution";
  headline: string;
  body: string;
  nextLabel: string;
};

function phaseForStep(stepIndex: number, totalSteps: number): TrainingLivePhase {
  if (totalSteps <= 2) return stepIndex === 0 ? "warmup" : "finish";
  const warmupCount = totalSteps >= 8 ? 2 : 1;
  const finishCount = totalSteps >= 8 ? 2 : 1;
  if (stepIndex < warmupCount) return "warmup";
  if (stepIndex >= totalSteps - finishCount) return "finish";
  return "core";
}

function phaseLabel(phase: TrainingLivePhase) {
  if (phase === "warmup") return "ÉCHAUFFEMENT";
  if (phase === "finish") return "FINISH";
  return "BLOC PRINCIPAL";
}

function objectiveFor(exercise: TrainingExerciseDefinition) {
  if (exercise.engine === "target_hits") return `${exercise.hitsGoal || 1} impacts sur ${exercise.target || "la cible"}`;
  if (exercise.engine === "sequence") return `${exercise.sequence?.length || 1} cibles à valider dans l’ordre`;
  if (exercise.engine === "checkout") return `Fermer ${exercise.checkoutScore || 0} en ${exercise.maxDarts} darts max`;
  return `Atteindre ${exercise.scoreGoal || 0} points en ${exercise.maxDarts} darts max`;
}

function cueFor(exercise: TrainingExerciseDefinition, phase: TrainingLivePhase) {
  if (phase === "warmup") return "Installe le geste. Priorité au relâchement et au groupement, pas à la vitesse.";
  if (phase === "finish") return "Dernier bloc : garde la même routine et traite chaque fléchette comme une fléchette de match.";
  if (exercise.family === "doubles") return "Fixe ton point d’impact, même tempo à chaque fléchette. Ne corrige qu’après la volée.";
  if (exercise.family === "checkout") return "Annonce ta route avant la première fléchette et conserve une sortie propre après chaque impact.";
  if (exercise.family === "scoring") return "Cherche d’abord le groupement. Le score viendra de la répétition, pas de la force.";
  if (exercise.family === "bull") return "Même hauteur de bras et même ligne de visée. Le centre se travaille par répétition stable.";
  if (exercise.family === "regularity") return "Ne change pas ton rythme après une bonne ou mauvaise fléchette. Reproduis la routine.";
  return "Pose ta visée, garde le même tempo et valide la cible avant d’accélérer.";
}

export function buildTrainingLiveStepCoach(exercise: TrainingExerciseDefinition, stepIndex: number, totalSteps: number): TrainingLiveStepCoach {
  const phase = phaseForStep(stepIndex, totalSteps);
  const targetScore = phase === "warmup" ? 55 : phase === "finish" ? 70 : 65;
  return {
    phase,
    phaseLabel: phaseLabel(phase),
    cue: cueFor(exercise, phase),
    objective: objectiveFor(exercise),
    targetScore,
  };
}

function adaptiveCandidate(exercise: TrainingExerciseDefinition, direction: "easier" | "harder", usedIds: string[]) {
  const candidates = TRAINING_EXERCISE_CATALOG
    .filter((row) => row.family === exercise.family && row.id !== exercise.id && !usedIds.includes(row.id))
    .filter((row) => direction === "easier" ? row.difficulty < exercise.difficulty : row.difficulty > exercise.difficulty)
    .sort((a, b) => direction === "easier" ? b.difficulty - a.difficulty : a.difficulty - b.difficulty);
  return candidates[0] || null;
}

export function buildTrainingLiveAdaptation(args: {
  exercise: TrainingExerciseDefinition;
  result: TrainingLiveStepResult;
  stepIndex: number;
  totalSteps: number;
  nextExercise: TrainingExerciseDefinition | null;
  usedExerciseIds: string[];
  adaptive: boolean;
}): TrainingLiveAdaptation {
  const { exercise, result, stepIndex, totalSteps, nextExercise, usedExerciseIds, adaptive } = args;
  const coach = buildTrainingLiveStepCoach(exercise, stepIndex, totalSteps);
  const nextCoach = nextExercise ? buildTrainingLiveStepCoach(nextExercise, stepIndex + 1, totalSteps) : null;
  const canAdaptCore = adaptive && nextExercise && coach.phase === "core" && nextCoach?.phase === "core";

  if (result.performanceScore >= 85 && result.accuracyPct >= 70) {
    const harder = canAdaptCore ? adaptiveCandidate(nextExercise, "harder", usedExerciseIds) : null;
    return {
      replacementExerciseId: harder?.id || null,
      tone: "positive",
      headline: "RYTHME SOLIDE",
      body: harder
        ? `Tu es au-dessus de la cible (${result.performanceScore}/100). Awena relève légèrement le prochain exercice : ${harder.title}.`
        : `Tu es au-dessus de la cible (${result.performanceScore}/100). Garde exactement la même routine pour l’étape suivante.`,
      nextLabel: harder ? `ADAPTÉ • ${harder.title}` : "MAINTIEN DU PLAN",
    };
  }

  if (result.performanceScore < 45 || result.completionPct < 50) {
    const easier = canAdaptCore ? adaptiveCandidate(nextExercise, "easier", usedExerciseIds) : null;
    return {
      replacementExerciseId: easier?.id || null,
      tone: "caution",
      headline: "CONSOLIDATION",
      body: easier
        ? `La charge était trop haute sur cette étape (${result.performanceScore}/100). Awena allège légèrement la suivante : ${easier.title}.`
        : "Ne cherche pas à compenser. Ralentis la routine, stabilise la visée et repars proprement sur l’étape suivante.",
      nextLabel: easier ? `ADAPTÉ • ${easier.title}` : "REPRISE TECHNIQUE",
    };
  }

  return {
    replacementExerciseId: null,
    tone: "neutral",
    headline: result.success ? "OBJECTIF VALIDÉ" : "ÉTAPE UTILE",
    body: result.performanceScore >= coach.targetScore
      ? `Tu es dans la zone attendue (${result.performanceScore}/100). Le plan reste inchangé.`
      : `Tu es légèrement sous la cible de ${coach.targetScore}/100. Garde le plan, mais privilégie la qualité du geste à la vitesse.`,
    nextLabel: "PLAN MAINTENU",
  };
}
