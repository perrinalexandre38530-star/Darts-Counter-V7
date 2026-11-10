import type { TrainingSessionCard, TrainingSessionExerciseRow } from "./trainingSessionCards";

/** Presentation only. Never writes to Training stats, snapshots or match History. */
export type TrainingSessionInsight = {
  comparison: {
    previousAt: number;
    performanceDelta: number;
    accuracyDelta: number | null;
    successesDelta: number;
  } | null;
  weakest: { exerciseId: string; title: string; score: number } | null;
  strongest: { title: string; score: number } | null;
  preciseDarts: number;
  aggregatedDarts: number;
  guidance: string;
};

function safePercent(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

function hasSameExercises(a: TrainingSessionCard, b: TrainingSessionCard) {
  // Program comparisons need the same ordered exercise protocol; for free
  // practice, different daily exercise selections are NOT interchangeable.
  return a.kind === b.kind && a.exercises.length > 0 &&
    a.exercises.length === b.exercises.length &&
    a.exercises.every((row, i) => row.exerciseId && row.exerciseId === b.exercises[i]?.exerciseId);
}

function scoredExercises(card: TrainingSessionCard): Array<TrainingSessionExerciseRow & { performance: number }> {
  return card.exercises.filter((row): row is TrainingSessionExerciseRow & { performance: number } =>
    safePercent(row.performance) !== null);
}

/** Input cards must be account-scoped and sorted newest-first by the history builder. */
export function buildTrainingSessionInsight(card: TrainingSessionCard, allCards: TrainingSessionCard[]): TrainingSessionInsight {
  const previous = allCards.find((candidate) => candidate.id !== card.id &&
    candidate.at < card.at && hasSameExercises(card, candidate));
  const scored = scoredExercises(card);
  const ranked = scored.slice().sort((a, b) => a.performance - b.performance);
  const weakest = ranked[0] ? { exerciseId: ranked[0].exerciseId, title: ranked[0].title, score: Math.round(ranked[0].performance) } : null;
  const top = ranked[ranked.length - 1];
  const strongest = top ? { title: top.title, score: Math.round(top.performance) } : null;
  const aggregatedDarts = card.exercises.reduce((sum, row) => sum + Math.max(0, Number(row.aggregatedDarts) || 0), 0);
  // Legacy programs can lack their step data; do not assert that missing
  // details imply precise input.
  const knownDarts = card.exercises.reduce((sum, row) => sum + (row.darts == null ? 0 : Math.max(0, row.darts)), 0);
  const preciseDarts = Math.max(0, knownDarts - aggregatedDarts);
  let guidance = "Retrouve tes exercices et prépare une nouvelle séance avec Awena.";
  if (weakest && weakest.score < 70) guidance = `Priorité : retravailler ${weakest.title} (${weakest.score}/100).`;
  else if (weakest && weakest.score >= 70) guidance = `Consolidation : poursuivre ${weakest.title} (${weakest.score}/100).`;
  return {
    comparison: previous ? {
      previousAt: previous.at,
      performanceDelta: Math.round(card.performance - previous.performance),
      accuracyDelta: safePercent(card.accuracy) !== null && safePercent(previous.accuracy) !== null
        ? Math.round(card.accuracy! - previous.accuracy!) : null,
      successesDelta: card.successes - previous.successes,
    } : null,
    weakest,
    strongest,
    preciseDarts,
    aggregatedDarts,
    guidance,
  };
}
