import { TRAINING_EXERCISE_CATALOG, TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingFamilyProgression } from "../coach/trainingDiagnosis";
import type { TrainingDetailedSession } from "../stats/trainingStatsHub";

export type TrainingDailyChallengeMilestone = {
  days: number;
  label: string;
  icon: string;
  unlocked: boolean;
};

export type TrainingDailyChallenge = {
  dateKey: string;
  family: TrainingExerciseFamily;
  familyLabel: string;
  exerciseId: string;
  exerciseTitle: string;
  difficulty: number;
  requiredScore: number;
  completed: boolean;
  bestScore: number;
  streakDays: number;
  nextMilestoneDays: number | null;
  nextMilestoneLabel: string;
  milestoneProgressPct: number;
  milestones: TrainingDailyChallengeMilestone[];
  headline: string;
  body: string;
};

function dateKeyAt(timestamp: number) {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return dateKeyAt(Date.now());
}

function recentLevel(family: TrainingExerciseFamily, progression: TrainingFamilyProgression[]) {
  const row = progression.find((item) => item.family === family);
  const score = Math.max(0, Number(row?.recentAverage || 0));
  const sessions = Math.max(0, Number(row?.sessions || 0));
  if (sessions >= 10 && score >= 78) return 5;
  if (sessions >= 7 && score >= 64) return 4;
  if (sessions >= 4 && score >= 50) return 3;
  if (sessions >= 2 && score >= 34) return 2;
  return 1;
}

function seededIndex(seed: string, size: number) {
  let value = 0;
  for (let i = 0; i < seed.length; i += 1) value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  return size ? value % size : 0;
}

function challengePass(row: TrainingDetailedSession) {
  if (row.config?.sessionKind !== "daily_challenge") return false;
  if (row.metrics?.dailyChallengePassed === true) return true;
  const required = Number(row.config?.dailyChallengeRequiredScore || 0);
  const score = Number(row.metrics?.performanceScore ?? row.metrics?.score ?? 0);
  return row.success === true && score >= required;
}

function challengeStreak(sessions: TrainingDetailedSession[]) {
  const passedDays = new Set(
    sessions
      .filter(challengePass)
      .map((row) => String(row.config?.dailyChallengeDateKey || dateKeyAt(row.endedAt)))
      .filter(Boolean)
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while (passedDays.has(dateKeyAt(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function buildTrainingDailyChallenge(
  family: TrainingExerciseFamily,
  progression: TrainingFamilyProgression[],
  sessions: TrainingDetailedSession[]
): TrainingDailyChallenge {
  const dateKey = todayKey();
  const level = recentLevel(family, progression);
  const exact = TRAINING_EXERCISE_CATALOG.filter((exercise) => exercise.family === family && exercise.difficulty === level);
  const fallback = TRAINING_EXERCISE_CATALOG.filter((exercise) => exercise.family === family)
    .sort((a, b) => Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level));
  const pool = exact.length ? exact : fallback;
  const exercise = pool[seededIndex(`${dateKey}:${family}`, pool.length)] || TRAINING_EXERCISE_CATALOG[0];
  const requiredScore = Math.min(82, 58 + level * 5);
  const todayRows = sessions.filter((row) => row.modeId === "training_lab" && row.config?.sessionKind === "daily_challenge" && row.config?.dailyChallengeDateKey === dateKey);
  const bestScore = todayRows.reduce((best, row) => Math.max(best, Number(row.metrics?.performanceScore ?? row.metrics?.score ?? 0) || 0), 0);
  const completed = todayRows.some(challengePass);
  const familyLabel = TRAINING_FAMILY_META[family].label;
  const streakDays = challengeStreak(sessions);
  const milestoneDefs = [
    { days: 3, label: "Série lancée", icon: "✦" },
    { days: 7, label: "Semaine parfaite", icon: "★" },
    { days: 14, label: "Rythme solide", icon: "◆" },
    { days: 30, label: "Routine en or", icon: "♛" },
  ];
  const milestones = milestoneDefs.map((item) => ({ ...item, unlocked: streakDays >= item.days }));
  const nextMilestone = milestoneDefs.find((item) => streakDays < item.days) || null;
  const previousMilestoneDays = [...milestoneDefs].reverse().find((item) => streakDays >= item.days)?.days || 0;
  const nextMilestoneDays = nextMilestone?.days ?? null;
  const milestoneProgressPct = nextMilestone
    ? Math.max(0, Math.min(100, ((streakDays - previousMilestoneDays) / Math.max(1, nextMilestone.days - previousMilestoneDays)) * 100))
    : 100;
  return {
    dateKey,
    family,
    familyLabel,
    exerciseId: exercise.id,
    exerciseTitle: exercise.title,
    difficulty: exercise.difficulty,
    requiredScore,
    completed,
    bestScore,
    streakDays,
    nextMilestoneDays,
    nextMilestoneLabel: nextMilestone?.label || "Tous les trophées débloqués",
    milestoneProgressPct,
    milestones,
    headline: completed ? "Défi du jour réussi" : `Défi du jour • ${familyLabel}`,
    body: completed
      ? `Validé à ${Math.round(bestScore)}/100. Reviens demain pour prolonger la série.`
      : `${exercise.title} • objectif ${requiredScore}/100. Une réussite suffit pour valider la journée.`,
  };
}
