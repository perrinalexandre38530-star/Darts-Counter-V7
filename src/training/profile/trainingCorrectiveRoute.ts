import { getTrainingExercise, type TrainingExerciseDefinition } from "../catalog/trainingExerciseCatalog";

/**
 * A practical follow-up, resolved only against the official Training catalog.
 * This makes no claim about where a dart landed when a visit was score-only.
 */
export type TrainingCorrectiveRoute = {
  exerciseId: string;
  exerciseTitle: string;
  reason: string;
  actionLabel: string;
};

const BASICS_BY_FAMILY: Record<TrainingExerciseDefinition["family"], string> = {
  scoring: "t20_10_hits",
  doubles: "d16_8_hits",
  checkout: "checkout_32",
  precision: "s20_12_hits",
  bull: "bull_10_hits",
  regularity: "repeat_t20_6",
};

export function buildTrainingCorrectiveRoute(
  exercise: TrainingExerciseDefinition | null | undefined,
  outcome: { success: boolean; precisionAvailable: boolean },
): TrainingCorrectiveRoute | null {
  if (!exercise || !getTrainingExercise(exercise.id)) return null;
  // A successful, measured attempt should be confirmed at the same settings.
  if (outcome.success && outcome.precisionAvailable) {
    return {
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      reason: "Confirmer ce résultat avec exactement le même exercice.",
      actionLabel: "CONFIRMER LA PERFORMANCE",
    };
  }
  const target = getTrainingExercise(BASICS_BY_FAMILY[exercise.family]) || exercise;
  const measurement = !outcome.precisionAvailable;
  return {
    exerciseId: target.id,
    exerciseTitle: target.title,
    reason: measurement
      ? "Saisir les impacts fléchette par fléchette pour mesurer les zones réellement touchées."
      : "Revenir à un repère fondamental avant de retenter l’objectif initial.",
    actionLabel: measurement ? "MESURER LES IMPACTS" : "LANCER L’EXERCICE CORRECTIF",
  };
}
