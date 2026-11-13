import React from "react";
import { getChallengeTrainingPreset } from "../catalog/challengeTrainingCatalog";
import { useTrainingVoiceCoach } from "./useTrainingVoiceCoach";
import {
  challengeTrainingResultSpeech,
  challengeTrainingRuleSpeech,
  challengeTrainingStepSpeech,
} from "../profile/trainingChallengeVoiceScripts";

/** Uniquement monté depuis le Centre d'entraînement, jamais sur une partie compétitive. */
export default function TrainingChallengeVoiceGuide({
  presetId, title, playerName, goal, phase, stageKey, sessionKey, finished,
  darts, score, accuracy, objectivesDone, objectivesTotal,
}: {
  presetId: string; title: string; playerName: string; goal: string;
  phase?: string; stageKey: string; sessionKey: string; finished: boolean;
  darts: number; score: number; accuracy?: number | null;
  objectivesDone?: number | null; objectivesTotal?: number | null;
}) {
  const voice = useTrainingVoiceCoach();
  const preset = getChallengeTrainingPreset(presetId);
  const instruction = preset?.instructions || preset?.description || "";
  const step = challengeTrainingStepSpeech({ title, playerName, goal, phase });
  const full = challengeTrainingRuleSpeech({ title, instruction, goal });
  const result = challengeTrainingResultSpeech({
    title, playerName, darts, score, accuracy, objectivesDone, objectivesTotal,
  });
  React.useEffect(() => {
    if (finished) voice.announce(`challenge-result:${sessionKey}`, result);
    else voice.announce(`challenge-step:${sessionKey}:${stageKey}`, step);
  }, [finished, result, sessionKey, stageKey, step, voice.announce]);
  return <div className="mssChallengeVoiceGuide" aria-label="Coaching vocal Awena">
    <span className="mssChallengeVoiceGuideLabel" title={goal}>✦ AWENA · {finished ? "BILAN" : "CONSEIL"}<small>{finished ? "Séance terminée" : goal}</small></span>
    <button type="button" onClick={() => voice.say(finished ? result : full)} aria-label={finished ? "Écouter le bilan Awena" : "Écouter les consignes Awena"} title="Écouter les consignes">🔊</button>
    <button type="button" className={voice.automatic ? "is-active" : ""} aria-pressed={voice.automatic} onClick={() => voice.setAuto(!voice.automatic)} title="Activer ou désactiver les annonces automatiques d’Awena">AUTO {voice.automatic ? "✓" : "○"}</button>
    {voice.notice && <p className="mssChallengeVoiceGuideNotice" role="status">{voice.notice}</p>}
  </div>;
}
