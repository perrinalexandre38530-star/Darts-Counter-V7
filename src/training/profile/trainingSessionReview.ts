import type { TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";

export type TrainingSessionReviewStep = {
  exerciseId: string;
  exerciseTitle: string;
  family: TrainingExerciseFamily | string;
  success: boolean;
  darts: number;
  accuracyPct: number;
  performanceScore: number;
};

export type TrainingSessionReviewPhase = "warmup" | "core" | "finish";

export type TrainingSessionPhaseReview = {
  phase: TrainingSessionReviewPhase;
  label: string;
  steps: number;
  averagePerformance: number;
  averageAccuracy: number;
  targetScore: number;
  targetMet: number;
};

export type TrainingSessionAdaptationReview = {
  stepIndex: number;
  plannedExerciseId: string;
  actualExerciseId: string;
};

export type TrainingSessionReview = {
  headline: string;
  body: string;
  adherencePct: number;
  unchangedSteps: number;
  adaptations: TrainingSessionAdaptationReview[];
  targetMet: number;
  targetTotal: number;
  phases: TrainingSessionPhaseReview[];
  strongestPhase: TrainingSessionPhaseReview | null;
  weakestPhase: TrainingSessionPhaseReview | null;
  nextFamily: TrainingExerciseFamily;
  nextReason: string;
};

function phaseForStep(stepIndex: number, totalSteps: number): TrainingSessionReviewPhase {
  if (totalSteps <= 2) return stepIndex === 0 ? "warmup" : "finish";
  const warmupCount = totalSteps >= 8 ? 2 : 1;
  const finishCount = totalSteps >= 8 ? 2 : 1;
  if (stepIndex < warmupCount) return "warmup";
  if (stepIndex >= totalSteps - finishCount) return "finish";
  return "core";
}

function phaseLabel(phase: TrainingSessionReviewPhase) {
  if (phase === "warmup") return "ÉCHAUFFEMENT";
  if (phase === "finish") return "FINISH";
  return "BLOC PRINCIPAL";
}

function targetForPhase(phase: TrainingSessionReviewPhase) {
  if (phase === "warmup") return 55;
  if (phase === "finish") return 70;
  return 65;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function safeFamily(value: string | undefined): TrainingExerciseFamily {
  const family = String(value || "precision") as TrainingExerciseFamily;
  return ["scoring", "doubles", "checkout", "precision", "bull", "regularity"].includes(family) ? family : "precision";
}

export function buildTrainingSessionReview(args: {
  plannedExerciseIds: string[];
  actualExerciseIds: string[];
  rows: TrainingSessionReviewStep[];
}): TrainingSessionReview {
  const planned = args.plannedExerciseIds.map(String).filter(Boolean);
  const actual = args.actualExerciseIds.map(String).filter(Boolean);
  const rows = args.rows || [];
  const total = Math.max(rows.length, actual.length, planned.length);
  const adaptations: TrainingSessionAdaptationReview[] = [];
  let unchangedSteps = 0;

  for (let index = 0; index < total; index += 1) {
    const plannedId = planned[index] || actual[index] || "";
    const actualId = actual[index] || plannedId;
    if (plannedId && actualId && plannedId !== actualId) {
      adaptations.push({ stepIndex: index, plannedExerciseId: plannedId, actualExerciseId: actualId });
    } else if (plannedId && actualId) {
      unchangedSteps += 1;
    }
  }

  const phaseRows = new Map<TrainingSessionReviewPhase, TrainingSessionReviewStep[]>();
  rows.forEach((row, index) => {
    const phase = phaseForStep(index, Math.max(1, rows.length));
    phaseRows.set(phase, [...(phaseRows.get(phase) || []), row]);
  });

  const phases = (["warmup", "core", "finish"] as TrainingSessionReviewPhase[])
    .map((phase) => {
      const list = phaseRows.get(phase) || [];
      const targetScore = targetForPhase(phase);
      return {
        phase,
        label: phaseLabel(phase),
        steps: list.length,
        averagePerformance: average(list.map((row) => row.performanceScore)),
        averageAccuracy: average(list.map((row) => row.accuracyPct)),
        targetScore,
        targetMet: list.filter((row) => row.performanceScore >= targetScore).length,
      } satisfies TrainingSessionPhaseReview;
    })
    .filter((phase) => phase.steps > 0);

  const targetMet = phases.reduce((sum, phase) => sum + phase.targetMet, 0);
  const targetTotal = phases.reduce((sum, phase) => sum + phase.steps, 0);
  const strongestPhase = phases.reduce<TrainingSessionPhaseReview | null>((best, phase) => !best || phase.averagePerformance > best.averagePerformance ? phase : best, null);
  const weakestPhase = phases.reduce<TrainingSessionPhaseReview | null>((worst, phase) => !worst || phase.averagePerformance < worst.averagePerformance ? phase : worst, null);
  const adherencePct = total ? (unchangedSteps / total) * 100 : 100;

  const indexedRows = rows.map((row, index) => ({ row, index, phase: phaseForStep(index, Math.max(1, rows.length)) }));
  const finishRows = indexedRows.filter((item) => item.phase === "finish");
  const coreRows = indexedRows.filter((item) => item.phase === "core");
  const finishWeak = finishRows.length && average(finishRows.map((item) => item.row.performanceScore)) < 60;
  const pool = finishWeak ? finishRows : coreRows.length ? coreRows : indexedRows;
  const weakestStep = pool.reduce<(typeof pool)[number] | null>((worst, item) => !worst || item.row.performanceScore < worst.row.performanceScore ? item : worst, null);
  const nextFamily = safeFamily(weakestStep?.row.family);

  let headline = "PLAN MAÎTRISÉ";
  let body = `Le plan est resté stable sur ${unchangedSteps}/${Math.max(1, total)} étapes et ${targetMet}/${Math.max(1, targetTotal)} objectifs de performance ont été atteints.`;
  if (adaptations.length >= 2) {
    headline = "PLAN ADAPTÉ EN DIRECT";
    body = `Awena a ajusté ${adaptations.length} étapes pour garder la séance dans une zone de travail utile. ${targetMet}/${Math.max(1, targetTotal)} objectifs de performance ont été atteints.`;
  } else if (adaptations.length === 1) {
    headline = "AJUSTEMENT UTILE";
    body = `Une étape a été adaptée pendant la séance, sans modifier l'architecture globale du plan. ${targetMet}/${Math.max(1, targetTotal)} objectifs de performance ont été atteints.`;
  } else if (targetTotal && targetMet / targetTotal < 0.5) {
    headline = "SÉANCE À CONSOLIDER";
    body = `Le plan est resté stable, mais seulement ${targetMet}/${targetTotal} objectifs de performance ont été atteints. La prochaine séance doit privilégier la qualité avant la charge.`;
  }

  const nextReason = finishWeak
    ? "Le finish est le secteur le plus fragile de la séance : Awena conserve ce signal pour la prochaine recommandation."
    : weakestStep
      ? `${weakestStep.row.exerciseTitle} est l'étape la plus fragile du bloc utile : le prochain focus part de cette faiblesse réelle.`
      : "La prochaine recommandation reste basée sur la continuité du plan.";

  return {
    headline,
    body,
    adherencePct,
    unchangedSteps,
    adaptations,
    targetMet,
    targetTotal,
    phases,
    strongestPhase,
    weakestPhase,
    nextFamily,
    nextReason,
  };
}
