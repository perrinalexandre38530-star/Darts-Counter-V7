import type { TrainingExerciseDefinition } from "../catalog/trainingExerciseCatalog";
import type { TrainingLiveStepCoach } from "./trainingLiveCoach";

type VoiceStep = Pick<TrainingExerciseDefinition, "title" | "engine" | "maxDarts" | "target" | "hitsGoal" | "sequence" | "checkoutScore" | "scoreGoal">;

/** Spell dart segments in spoken French; do not change the data used for scoring. */
export function pronounceDartSegments(text: string): string {
  return String(text || "")
    .replace(/\bDBULL\b/gi, "double bull")
    .replace(/\bBULL\b/gi, "bull")
    .replace(/\bT(\d{1,2})\b/gi, "triple $1")
    .replace(/\bD(\d{1,2})\b/gi, "double $1")
    .replace(/\bS(\d{1,2})\b/gi, "simple $1");
}

function bounded(value: number, lower = 0, upper = 100): number {
  return Math.max(lower, Math.min(upper, Number.isFinite(value) ? value : lower));
}

/** The text is deliberately short: no TTS on each dart and no lengthy narration blocking the keypad. */
export function buildTrainingStepVoiceText(exercise: VoiceStep, coach: Pick<TrainingLiveStepCoach, "cue" | "phaseLabel" | "objective">, stepIndex: number, totalSteps: number): string {
  const title = String(exercise.title || "Exercice").slice(0, 90);
  const order = totalSteps > 1 ? `Étape ${stepIndex + 1} sur ${totalSteps}. ` : "";
  return pronounceDartSegments(`${order}${title}. ${coach.objective}. ${coach.cue}`);
}

export function buildTrainingResultVoiceText(args: {
  title: string; success: boolean; performanceScore: number; completionPct: number;
  accuracyPct: number | null; nextCue?: string | null;
}): string {
  const outcome = args.success ? "Objectif validé." : "Objectif à retravailler.";
  const performance = Math.round(bounded(args.performanceScore));
  const completion = Math.round(bounded(args.completionPct));
  const measured = args.accuracyPct === null || !Number.isFinite(args.accuracyPct)
    ? "Précision non mesurée pour les saisies en score total."
    : `Précision mesurée : ${Math.round(bounded(args.accuracyPct))} pour cent.`;
  const cue = args.nextCue ? ` ${String(args.nextCue).slice(0, 200)}` : "";
  return pronounceDartSegments(`${String(args.title || "Exercice").slice(0, 90)} terminé. ${outcome} Performance ${performance} sur 100. Progression ${completion} pour cent. ${measured}${cue}`);
}

export function buildTrainingSessionVoiceText(args: {
  title: string; successes: number; steps: number; performance: number;
  precisionUnavailable: boolean; accuracyPct: number; advice?: string | null;
}): string {
  const steps = Math.max(0, Math.round(args.steps));
  const successes = bounded(Math.round(args.successes), 0, steps);
  const measured = args.precisionUnavailable ? "Précision non mesurée." : `Précision mesurée : ${Math.round(bounded(args.accuracyPct))} pour cent.`;
  const advice = args.advice ? ` Prochain conseil : ${String(args.advice).slice(0, 230)}` : "";
  return pronounceDartSegments(`Bilan de ${String(args.title || "la séance").slice(0, 90)}. ${successes} étapes réussies sur ${steps}. Performance moyenne : ${Math.round(bounded(args.performance))} sur 100. ${measured}${advice}`);
}
