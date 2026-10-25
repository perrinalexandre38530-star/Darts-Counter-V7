import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingAdaptationCoach } from "./trainingAdaptationCoach";
import type { TrainingBlockCoach } from "./trainingBlockCoach";
import type { TrainingLoadSummary } from "./trainingLoadCoach";
import type { TrainingWeekCoachPlan } from "./trainingWeeklyCoach";
import type { TrainingCycleCoach } from "./trainingCycleCoach";

export type TrainingActionReason = "recovery" | "correction" | "weekly" | "block" | "cycle" | "foundation";

export type TrainingActionCoach = {
  reason: TrainingActionReason;
  eyebrow: string;
  title: string;
  body: string;
  durationMin: 15 | 30 | 45;
  family: TrainingExerciseFamily | "balanced";
  familyLabel: string;
  buttonLabel: string;
  tone: "cyan" | "violet" | "amber" | "green";
  cycleText: string;
  blockText: string;
  weekText: string;
};

export function buildTrainingActionCoach(
  adaptation: TrainingAdaptationCoach,
  load: TrainingLoadSummary,
  week: TrainingWeekCoachPlan,
  cycle: TrainingCycleCoach,
  block: TrainingBlockCoach,
): TrainingActionCoach {
  let reason: TrainingActionReason = "foundation";
  let durationMin: 15 | 30 | 45 = adaptation.recommendedDurationMin;
  let family: TrainingExerciseFamily | "balanced" = adaptation.recommendedFamily;
  let title = adaptation.headline;
  let body = adaptation.summary;
  let tone: TrainingActionCoach["tone"] = "cyan";

  if (load.status === "recovery" || load.status === "high") {
    reason = "recovery";
    durationMin = 15;
    family = adaptation.status === "volatile" ? "regularity" : adaptation.recommendedFamily;
    title = load.status === "recovery" ? "Récupération avant de remettre de la charge" : "Charge élevée : séance courte uniquement";
    body = `${load.statusMessage} ${load.recommendedAction}`;
    tone = "amber";
  } else if (adaptation.status === "regressing" || adaptation.status === "volatile" || adaptation.status === "plateau") {
    reason = "correction";
    durationMin = adaptation.recommendedDurationMin;
    family = adaptation.recommendedFamily;
    title = adaptation.headline;
    body = adaptation.summary;
    tone = adaptation.status === "plateau" ? "violet" : "amber";
  } else if (week.nextSlot) {
    reason = "weekly";
    durationMin = week.nextSlot.durationMin || adaptation.recommendedDurationMin;
    family = week.nextSlot.focusFamily;
    title = `Prochaine séance : ${week.nextSlot.label}`;
    body = `${week.summary} Cette séance reste alignée sur le cap de cycle et la charge récente.`;
    tone = "violet";
  } else if (block.remainingSessions <= 3 && block.remainingSessions > 0) {
    reason = "block";
    durationMin = adaptation.recommendedDurationMin;
    family = block.recommendedFamily;
    title = `Finir proprement le bloc ${block.blockNumber}`;
    body = `${block.remainingSessions} séance${block.remainingSessions > 1 ? "s" : ""} restante${block.remainingSessions > 1 ? "s" : ""}. ${block.milestone}`;
    tone = "green";
  } else {
    reason = cycle.completedSessions ? "cycle" : "foundation";
    durationMin = adaptation.recommendedDurationMin;
    family = cycle.priority.family;
    title = cycle.completedSessions ? `Poursuivre le cycle ${cycle.cycleNumber}` : "Poser la prochaine référence";
    body = cycle.summary;
    tone = cycle.onTrack ? "green" : "cyan";
  }

  const familyLabel = family === "balanced" ? "Équilibré" : TRAINING_FAMILY_META[family].label;
  return {
    reason,
    eyebrow: reason === "recovery" ? "ACTION PRIORITAIRE • RÉCUPÉRATION" : reason === "correction" ? "ACTION PRIORITAIRE • CORRECTION" : "PROCHAINE ACTION AWENA",
    title,
    body,
    durationMin,
    family,
    familyLabel,
    buttonLabel: `PRÉPARER • ${durationMin} MIN • ${familyLabel.toUpperCase()}`,
    tone,
    cycleText: `Cycle ${cycle.cycleNumber} • ${cycle.completedSessions}/${cycle.cycleSize} séances • ${cycle.priority.label}`,
    blockText: `Bloc ${block.blockNumber} • ${block.completedSessions}/${block.blockSize} séances • cible ${block.targetAverage}/100`,
    weekText: week.cadenceLabel,
  };
}
