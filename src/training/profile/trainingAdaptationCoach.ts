import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingCycleCoach } from "./trainingCycleCoach";
import type { TrainingBlockCoach } from "./trainingBlockCoach";
import type { TrainingLoadSummary } from "./trainingLoadCoach";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

export type TrainingAdaptationStatus = "insufficient" | "progressing" | "plateau" | "regressing" | "volatile";

export type TrainingAdaptationCoach = {
  status: TrainingAdaptationStatus;
  label: string;
  headline: string;
  summary: string;
  recentAverage: number;
  previousAverage: number;
  delta: number;
  consistency: number;
  recommendedFamily: TrainingExerciseFamily;
  recommendedLabel: string;
  recommendedDurationMin: 15 | 30 | 45;
  actionLabel: string;
  targetRequiredAverage: number | null;
  targetFeasible: boolean;
  confidence: "low" | "medium" | "high";
};

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function consistency(rows: TrainingProgramSessionRecord[]) {
  if (!rows.length) return 0;
  const mean = avg(rows.map((row) => row.performanceScore));
  const deviation = avg(rows.map((row) => Math.abs(row.performanceScore - mean)));
  return clamp(100 - deviation * 2.4, 0, 100);
}

export function buildTrainingAdaptationCoach(
  records: TrainingProgramSessionRecord[],
  cycleCoach: TrainingCycleCoach,
  blockCoach: TrainingBlockCoach,
  loadSummary: TrainingLoadSummary,
): TrainingAdaptationCoach {
  const chronological = [...records].sort((a, b) => a.endedAt - b.endedAt);
  const recent = chronological.slice(-4);
  const previous = chronological.slice(-8, -4);
  const recentAverage = avg(recent.map((row) => row.performanceScore));
  const previousAverage = avg(previous.map((row) => row.performanceScore));
  const delta = previous.length ? recentAverage - previousAverage : 0;
  const regularity = consistency(recent);

  let status: TrainingAdaptationStatus = "insufficient";
  if (chronological.length >= 8) {
    if (regularity < 58) status = "volatile";
    else if (delta >= 3) status = "progressing";
    else if (delta <= -3) status = "regressing";
    else status = "plateau";
  }

  let recommendedFamily = cycleCoach.priority.family;
  let duration: 15 | 30 | 45 = loadSummary.recommendedDurationMin;
  let actionLabel = `TRAVAILLER ${cycleCoach.priority.label.toUpperCase()}`;

  if (status === "plateau") {
    recommendedFamily = cycleCoach.secondary.family;
    duration = loadSummary.status === "high" || loadSummary.status === "recovery" ? 15 : 30;
    actionLabel = `DÉBLOQUER • ${cycleCoach.secondary.label.toUpperCase()}`;
  } else if (status === "volatile") {
    recommendedFamily = "regularity";
    duration = 15;
    actionLabel = "STABILISER LA RÉGULARITÉ";
  } else if (status === "regressing") {
    recommendedFamily = cycleCoach.priority.family;
    duration = loadSummary.status === "high" || loadSummary.status === "recovery" ? 15 : 30;
    actionLabel = `CORRIGER • ${cycleCoach.priority.label.toUpperCase()}`;
  } else if (status === "progressing") {
    recommendedFamily = cycleCoach.priority.family;
    duration = loadSummary.status === "low" ? 45 : 30;
    actionLabel = `CONSOLIDER • ${cycleCoach.priority.label.toUpperCase()}`;
  }

  const remaining = blockCoach.remainingSessions;
  const completed = blockCoach.completedSessions;
  const targetRequiredAverage = completed > 0 && remaining > 0
    ? clamp((blockCoach.targetAverage * blockCoach.blockSize - blockCoach.currentAverage * completed) / remaining, 0, 100)
    : null;
  const targetFeasible = targetRequiredAverage === null || targetRequiredAverage <= 94;

  const label = status === "progressing" ? "PROGRESSION"
    : status === "plateau" ? "PLATEAU"
      : status === "regressing" ? "RECUL"
        : status === "volatile" ? "IRRÉGULIER"
          : "RÉFÉRENCE";

  const headline = status === "progressing" ? "La progression est confirmée"
    : status === "plateau" ? "Plateau détecté : on change le stimulus"
      : status === "regressing" ? "Recul récent : correction ciblée"
        : status === "volatile" ? "Résultats trop variables : stabiliser d’abord"
          : "Encore quelques séances pour piloter finement";

  const summary = status === "progressing"
    ? `Les 4 dernières séances gagnent ${Math.round(delta)} pts face aux 4 précédentes. On conserve le cap ${TRAINING_FAMILY_META[recommendedFamily].label.toLowerCase()} sans augmenter brutalement la charge.`
    : status === "plateau"
      ? `Écart limité à ${Math.round(delta)} pt${Math.abs(Math.round(delta)) === 1 ? "" : "s"} sur les deux derniers groupes de 4 séances. Awena bascule temporairement sur ${TRAINING_FAMILY_META[recommendedFamily].label.toLowerCase()} pour relancer l’adaptation.`
      : status === "regressing"
        ? `La moyenne récente recule de ${Math.abs(Math.round(delta))} pts. Priorité à une séance plus courte et ciblée avant de remonter la charge.`
        : status === "volatile"
          ? `Régularité récente ${Math.round(regularity)}/100. Le prochain levier n’est pas le volume : on cherche d’abord des performances plus stables.`
          : `Il faut au moins 8 séances complètes pour comparer deux fenêtres de 4 séances et détecter progression, plateau ou recul de façon fiable.`;

  return {
    status,
    label,
    headline,
    summary,
    recentAverage,
    previousAverage,
    delta,
    consistency: regularity,
    recommendedFamily,
    recommendedLabel: TRAINING_FAMILY_META[recommendedFamily].label,
    recommendedDurationMin: duration,
    actionLabel,
    targetRequiredAverage,
    targetFeasible,
    confidence: chronological.length >= 16 ? "high" : chronological.length >= 8 ? "medium" : "low",
  };
}
