import type { TrainingExerciseDefinition, TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingSkillPath } from "./trainingSkillPath";

export type TrainingSkillCertification = {
  family: TrainingExerciseFamily;
  currentLevel: 1 | 2 | 3 | 4 | 5;
  targetLevel: 1 | 2 | 3 | 4 | 5;
  status: "locked" | "ready" | "confirmed";
  statusLabel: string;
  headline: string;
  body: string;
  requiredScore: number;
  requiredSessions: number;
  score: number;
  sessions: number;
  testExercise: TrainingExerciseDefinition;
};

const REQUIRED_SCORE: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 34,
  2: 50,
  3: 64,
  4: 78,
  5: 82,
};

const REQUIRED_SESSIONS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 2,
  2: 4,
  3: 7,
  4: 10,
  5: 12,
};

export function buildTrainingSkillCertification(path: TrainingSkillPath): TrainingSkillCertification {
  const currentLevel = path.currentLevel;
  const targetLevel = Math.min(5, currentLevel + 1) as 1 | 2 | 3 | 4 | 5;
  const requiredScore = REQUIRED_SCORE[currentLevel];
  const requiredSessions = REQUIRED_SESSIONS[currentLevel];
  const score = Math.round(path.score);
  const sessions = path.sessions;
  const scoreReady = score >= requiredScore;
  const sessionsReady = sessions >= requiredSessions;
  const atMastery = currentLevel === 5;
  const confirmed = atMastery && score >= REQUIRED_SCORE[5] && sessions >= REQUIRED_SESSIONS[5];
  const status = confirmed ? "confirmed" : scoreReady && sessionsReady ? "ready" : "locked";
  const targetStep = path.steps.find((step) => step.level === targetLevel && step.exercise)
    || path.steps.find((step) => step.level === currentLevel && step.exercise);
  const testExercise = targetStep?.exercise || path.recommendedExercise;

  const statusLabel = status === "confirmed" ? "MAÎTRISE CONFIRMÉE" : status === "ready" ? "TEST DISPONIBLE" : "À PRÉPARER";
  const headline = status === "confirmed"
    ? `${path.label} • niveau 5 certifié`
    : status === "ready"
      ? `${path.label} • passage niveau ${targetLevel}`
      : `${path.label} • prochain passage niveau ${targetLevel}`;

  const missing: string[] = [];
  if (!scoreReady) missing.push(`${Math.max(0, requiredScore - score)} pts`);
  if (!sessionsReady) missing.push(`${Math.max(0, requiredSessions - sessions)} séance${requiredSessions - sessions > 1 ? "s" : ""}`);
  const body = status === "confirmed"
    ? `Référence solide : ${score}/100 sur ${sessions} séances. Awena maintient désormais la maîtrise plutôt que de forcer un niveau supérieur.`
    : status === "ready"
      ? `Les prérequis sont atteints (${score}/100 · ${sessions} séances). Lance l'exercice test pour consolider le passage.`
      : `Encore ${missing.join(" et ")} avant le test. Le parcours continue avec des exercices du niveau actuel.`;

  return {
    family: path.family,
    currentLevel,
    targetLevel,
    status,
    statusLabel,
    headline,
    body,
    requiredScore,
    requiredSessions,
    score,
    sessions,
    testExercise,
  };
}
