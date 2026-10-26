import type { TrainingExerciseDefinition, TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingDetailedSession } from "../stats/trainingStatsHub";
import type { TrainingSkillPath } from "./trainingSkillPath";

export type TrainingSkillCertificationAttempt = {
  endedAt: number;
  level: 1 | 2 | 3 | 4 | 5;
  performanceScore: number;
  success: boolean;
};

export type TrainingSkillCertification = {
  family: TrainingExerciseFamily;
  currentLevel: 1 | 2 | 3 | 4 | 5;
  certifiedLevel: 1 | 2 | 3 | 4 | 5;
  targetLevel: 1 | 2 | 3 | 4 | 5;
  status: "locked" | "ready" | "confirmed";
  statusLabel: string;
  headline: string;
  body: string;
  requiredScore: number;
  requiredSessions: number;
  score: number;
  sessions: number;
  attempts: number;
  bestAttemptScore: number;
  lastAttempt: TrainingSkillCertificationAttempt | null;
  testExercise: TrainingExerciseDefinition;
};

const REQUIRED_SCORE: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 34,
  3: 50,
  4: 64,
  5: 78,
};

const REQUIRED_SESSIONS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
};

function clampLevel(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const n = Math.max(1, Math.min(5, Math.round(Number(value) || 1)));
  return n as 1 | 2 | 3 | 4 | 5;
}

function certificationAttempts(family: TrainingExerciseFamily, sessions: TrainingDetailedSession[]) {
  return sessions
    .filter((row) => row.modeId === "training_lab" && row.config?.sessionKind === "certification" && row.config?.certificationFamily === family)
    .map((row): TrainingSkillCertificationAttempt => ({
      endedAt: Number(row.endedAt) || 0,
      level: clampLevel(row.config?.certificationTargetLevel),
      performanceScore: Math.max(0, Math.min(100, Math.round(Number(row.metrics?.performanceScore ?? row.metrics?.score) || 0))),
      success: row.success === true && row.metrics?.certificationPassed !== false,
    }))
    .sort((a, b) => b.endedAt - a.endedAt);
}

export function buildTrainingSkillCertification(path: TrainingSkillPath, detailedSessions: TrainingDetailedSession[] = []): TrainingSkillCertification {
  const allAttempts = certificationAttempts(path.family, detailedSessions);
  let certifiedLevel: 1 | 2 | 3 | 4 | 5 = 1;
  for (const attempt of allAttempts) {
    const required = REQUIRED_SCORE[attempt.level];
    if (attempt.success && attempt.performanceScore >= required && attempt.level > certifiedLevel) certifiedLevel = attempt.level;
  }

  const currentLevel = path.currentLevel;
  const targetLevel = certifiedLevel >= 5 ? 5 : clampLevel(certifiedLevel + 1);
  const requiredScore = REQUIRED_SCORE[targetLevel];
  const requiredSessions = REQUIRED_SESSIONS[targetLevel];
  const score = Math.round(path.score);
  const sessions = path.sessions;
  const scoreReady = score >= requiredScore;
  const sessionsReady = sessions >= requiredSessions;
  const confirmed = certifiedLevel >= 5;
  const status = confirmed ? "confirmed" : scoreReady && sessionsReady ? "ready" : "locked";
  const targetStep = path.steps.find((step) => step.level === targetLevel && step.exercise)
    || path.steps.find((step) => step.level === currentLevel && step.exercise);
  const testExercise = targetStep?.exercise || path.recommendedExercise;
  const targetAttempts = allAttempts.filter((attempt) => attempt.level === targetLevel);
  const bestAttemptScore = targetAttempts.reduce((best, attempt) => Math.max(best, attempt.performanceScore), 0);
  const lastAttempt = targetAttempts[0] || null;

  const statusLabel = status === "confirmed" ? "MAÎTRISE CERTIFIÉE" : status === "ready" ? "TEST DISPONIBLE" : "À PRÉPARER";
  const headline = status === "confirmed"
    ? `${path.label} • niveau 5 certifié`
    : status === "ready"
      ? `${path.label} • certification niveau ${targetLevel}`
      : `${path.label} • prochain test niveau ${targetLevel}`;

  const missing: string[] = [];
  if (!scoreReady) missing.push(`${Math.max(0, requiredScore - score)} pts`);
  if (!sessionsReady) missing.push(`${Math.max(0, requiredSessions - sessions)} séance${requiredSessions - sessions > 1 ? "s" : ""}`);
  const attemptNote = lastAttempt
    ? ` Dernière tentative : ${lastAttempt.performanceScore}/100 (${lastAttempt.success ? "validée" : "non validée"}).`
    : "";
  const body = status === "confirmed"
    ? `Référence certifiée : les cinq paliers ont été validés par un test dédié. Awena passe maintenant en maintien de maîtrise.`
    : status === "ready"
      ? `Prérequis atteints (${score}/100 · ${sessions} séances). Le passage n'est validé que si le test dédié atteint ${requiredScore}/100.${attemptNote}`
      : `Encore ${missing.join(" et ")} avant le test. Le niveau affiché reste indicatif tant que le passage n'est pas certifié.${attemptNote}`;

  return {
    family: path.family,
    currentLevel,
    certifiedLevel,
    targetLevel,
    status,
    statusLabel,
    headline,
    body,
    requiredScore,
    requiredSessions,
    score,
    sessions,
    attempts: targetAttempts.length,
    bestAttemptScore,
    lastAttempt,
    testExercise,
  };
}
