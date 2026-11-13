import { pronounceDartSegments } from "./trainingVoiceScripts";

/** Scripts courts, construits à partir des objectifs du moteur officiel (aucun score estimé). */
export function challengeTrainingStepSpeech(args: {
  title: string; playerName?: string; goal: string; phase?: string; rule?: string;
}): string {
  const title = String(args.title || "Challenge").slice(0, 90);
  const player = args.playerName ? `${String(args.playerName).slice(0, 45)}. ` : "";
  const phase = args.phase ? `${String(args.phase).slice(0, 55)}. ` : "";
  const goal = String(args.goal || "Consulte l'objectif affiché").slice(0, 130);
  return pronounceDartSegments(`${player}${phase}${title}. Objectif : ${goal}.`);
}

export function challengeTrainingRuleSpeech(args: {title: string; instruction: string; goal: string}): string {
  return pronounceDartSegments(`${String(args.title || "Challenge").slice(0, 90)}. ${String(args.instruction || "").slice(0, 240)} Objectif actuel : ${String(args.goal || "").slice(0, 110)}.`);
}

export function challengeTrainingResultSpeech(args: {
  title: string; playerName?: string; darts: number; score: number;
  accuracy?: number | null; objectivesDone?: number | null; objectivesTotal?: number | null;
}): string {
  const dartCount = Math.max(0, Math.round(Number(args.darts) || 0));
  const score = Math.round(Number(args.score) || 0);
  const player = args.playerName ? `${String(args.playerName).slice(0, 45)}. ` : "";
  const progress = Number.isFinite(args.objectivesTotal) && Number(args.objectivesTotal) > 0 && Number.isFinite(args.objectivesDone)
    ? ` ${Math.max(0, Math.round(Number(args.objectivesDone))) } objectifs sur ${Math.round(Number(args.objectivesTotal))}.` : "";
  const accuracy = args.accuracy == null || !Number.isFinite(args.accuracy)
    ? "" : ` Précision mesurée : ${Math.max(0, Math.min(100, Math.round(args.accuracy)))} pour cent.`;
  return pronounceDartSegments(`${player}${String(args.title || "Challenge").slice(0, 90)} terminé. ${dartCount} fléchettes. ${score} points.${progress}${accuracy} Consulte le bilan pour préparer ta prochaine séance.`);
}
