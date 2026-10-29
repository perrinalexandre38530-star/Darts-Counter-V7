import { TRAINING_EXERCISE_CATALOG, TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingFamilyProgression } from "../coach/trainingDiagnosis";
import type { TrainingDetailedSession } from "../stats/trainingStatsHub";

export type TrainingDailyChallengeMilestone = {
  days: number;
  label: string;
  icon: string;
  unlocked: boolean;
};

export type TrainingDailyChallengeReward = {
  tier: "none" | "bronze" | "silver" | "gold" | "diamond";
  label: string;
  icon: string;
  nextLabel: string | null;
  nextScore: number | null;
};

export type TrainingDailyChallenge = {
  dateKey: string;
  family: TrainingExerciseFamily;
  familyLabel: string;
  preferredFamily: TrainingExerciseFamily;
  rotated: boolean;
  rotationLabel: string;
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
  reward: TrainingDailyChallengeReward;
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


function recentChallengeFamilies(sessions: TrainingDetailedSession[], today: string) {
  const byDay = new Map<string, TrainingExerciseFamily>();
  const ordered = [...sessions]
    .filter((row) => row.modeId === "training_lab" && row.config?.sessionKind === "daily_challenge")
    .sort((a, b) => Number(b.endedAt || 0) - Number(a.endedAt || 0));
  for (const row of ordered) {
    const key = String(row.config?.dailyChallengeDateKey || dateKeyAt(row.endedAt));
    if (!key || key === today || byDay.has(key)) continue;
    const family = String(row.metrics?.family || row.config?.family || "") as TrainingExerciseFamily;
    if (TRAINING_FAMILY_META[family]) byDay.set(key, family);
    if (byDay.size >= 5) break;
  }
  return [...byDay.values()];
}

function chooseDailyFamily(
  preferred: TrainingExerciseFamily,
  progression: TrainingFamilyProgression[],
  sessions: TrainingDetailedSession[],
  dateKey: string
) {
  const recent = recentChallengeFamilies(sessions, dateKey);
  const repeated = recent.slice(0, 3).filter((family) => family === preferred).length;
  if (repeated < 2) return preferred;

  const counts = new Map<TrainingExerciseFamily, number>();
  recent.forEach((family) => counts.set(family, (counts.get(family) || 0) + 1));
  const families = Object.keys(TRAINING_FAMILY_META) as TrainingExerciseFamily[];
  const candidates = families
    .filter((family) => family !== preferred)
    .map((family) => {
      const row = progression.find((item) => item.family === family);
      const recentAverage = Math.max(0, Number(row?.recentAverage || 0));
      const sessionsCount = Math.max(0, Number(row?.sessions || 0));
      const exposure = counts.get(family) || 0;
      // Favorise les compétences encore fragiles et peu proposées récemment.
      const need = sessionsCount < 2 ? 18 : Math.max(0, 78 - recentAverage);
      return { family, score: exposure * 28 - need };
    })
    .sort((a, b) => a.score - b.score || a.family.localeCompare(b.family));
  if (!candidates.length) return preferred;
  const bestScore = candidates[0].score;
  const pool = candidates.filter((item) => item.score <= bestScore + 8);
  return pool[seededIndex(`${dateKey}:rotation`, pool.length)]?.family || candidates[0].family;
}

function buildReward(bestScore: number, requiredScore: number): TrainingDailyChallengeReward {
  const thresholds = [
    { tier: "bronze" as const, label: "Bronze", icon: "●", score: requiredScore },
    { tier: "silver" as const, label: "Argent", icon: "◆", score: Math.min(100, requiredScore + 8) },
    { tier: "gold" as const, label: "Or", icon: "★", score: Math.min(100, requiredScore + 16) },
    { tier: "diamond" as const, label: "Diamant", icon: "✦", score: Math.min(100, requiredScore + 24) },
  ];
  let current: (typeof thresholds)[number] | null = null;
  for (const row of thresholds) if (bestScore >= row.score) current = row;
  const next = thresholds.find((row) => bestScore < row.score) || null;
  return {
    tier: current?.tier || "none",
    label: current?.label || "À décrocher",
    icon: current?.icon || "○",
    nextLabel: next?.label || null,
    nextScore: next?.score ?? null,
  };
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
  const preferredFamily = family;
  const challengeFamily = chooseDailyFamily(preferredFamily, progression, sessions, dateKey);
  const level = recentLevel(challengeFamily, progression);
  const exact = TRAINING_EXERCISE_CATALOG.filter((exercise) => exercise.family === challengeFamily && exercise.difficulty === level);
  const fallback = TRAINING_EXERCISE_CATALOG.filter((exercise) => exercise.family === challengeFamily)
    .sort((a, b) => Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level));
  const pool = exact.length ? exact : fallback;
  const exercise = pool[seededIndex(`${dateKey}:${challengeFamily}`, pool.length)] || TRAINING_EXERCISE_CATALOG[0];
  const requiredScore = Math.min(82, 58 + level * 5);
  const todayRows = sessions.filter((row) => row.modeId === "training_lab" && row.config?.sessionKind === "daily_challenge" && row.config?.dailyChallengeDateKey === dateKey);
  const bestScore = todayRows.reduce((best, row) => Math.max(best, Number(row.metrics?.performanceScore ?? row.metrics?.score ?? 0) || 0), 0);
  const completed = todayRows.some(challengePass);
  const familyLabel = TRAINING_FAMILY_META[challengeFamily].label;
  const rotated = challengeFamily !== preferredFamily;
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
  const reward = buildReward(bestScore, requiredScore);
  const milestoneProgressPct = nextMilestone
    ? Math.max(0, Math.min(100, ((streakDays - previousMilestoneDays) / Math.max(1, nextMilestone.days - previousMilestoneDays)) * 100))
    : 100;
  return {
    dateKey,
    family: challengeFamily,
    familyLabel,
    preferredFamily,
    rotated,
    rotationLabel: rotated ? `Variation du jour • ${familyLabel}` : `Priorité Awena • ${familyLabel}`,
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
    reward,
    headline: completed ? "Défi du jour réussi" : `Défi du jour • ${familyLabel}`,
    body: completed
      ? `Validé à ${Math.round(bestScore)}/100. Reviens demain pour prolonger la série.`
      : `${exercise.title} • objectif ${requiredScore}/100. Une réussite suffit pour valider la journée.`,
  };
}
