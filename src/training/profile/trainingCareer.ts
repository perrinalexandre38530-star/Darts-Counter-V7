import type { TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import { TRAINING_FAMILY_META } from "../catalog/trainingExerciseCatalog";
import type { TrainingFamilyProgression } from "../coach/trainingDiagnosis";
import type { TrainingProgramSessionRecord, TrainingWeeklyPlanStats } from "./trainingPlanTracker";

export type TrainingCareerLevel = {
  level: number;
  title: string;
  minXp: number;
  nextXp: number | null;
  progressPct: number;
};

export type TrainingMastery = {
  family: TrainingExerciseFamily;
  label: string;
  tier: "À découvrir" | "Bronze" | "Argent" | "Or" | "Diamant";
  score: number;
  sessions: number;
  nextTarget: number | null;
};

export type TrainingCareerBadge = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export type TrainingCareerSummary = {
  xp: number;
  level: TrainingCareerLevel;
  completedPrograms: number;
  totalDarts: number;
  averagePerformance: number;
  mastery: TrainingMastery[];
  badges: TrainingCareerBadge[];
  unlockedBadges: number;
  totalBadges: number;
};

const LEVELS = [
  { minXp: 0, title: "Débutant" },
  { minXp: 350, title: "Apprenti" },
  { minXp: 900, title: "Joueur régulier" },
  { minXp: 1800, title: "Spécialiste" },
  { minXp: 3200, title: "Expert" },
  { minXp: 5200, title: "Maître Training" },
  { minXp: 8000, title: "Élite" },
];

export function trainingProgramXp(record: TrainingProgramSessionRecord) {
  const completion = record.steps ? record.successes / record.steps : 0;
  const base = Math.round(record.performanceScore * 1.15 + record.accuracyPct * .35);
  const volume = Math.min(60, Math.round(record.darts / 3));
  const completionBonus = Math.round(completion * 55);
  const perfectBonus = record.steps > 0 && record.successes === record.steps ? 35 : 0;
  return Math.max(20, base + volume + completionBonus + perfectBonus);
}

function buildLevel(xp: number): TrainingCareerLevel {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (xp >= LEVELS[i].minXp) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  const span = next ? Math.max(1, next.minXp - current.minXp) : 1;
  return {
    level: index + 1,
    title: current.title,
    minXp: current.minXp,
    nextXp: next?.minXp ?? null,
    progressPct: next ? Math.max(0, Math.min(100, ((xp - current.minXp) / span) * 100)) : 100,
  };
}

function masteryTier(score: number, sessions: number): Pick<TrainingMastery, "tier" | "nextTarget"> {
  if (sessions < 2 || score < 45) return { tier: "À découvrir", nextTarget: 50 };
  if (score < 60) return { tier: "Bronze", nextTarget: 60 };
  if (score < 75) return { tier: "Argent", nextTarget: 75 };
  if (score < 88) return { tier: "Or", nextTarget: 88 };
  return { tier: "Diamant", nextTarget: null };
}

export function buildTrainingCareer(
  records: TrainingProgramSessionRecord[],
  progression: TrainingFamilyProgression[],
  weekly?: TrainingWeeklyPlanStats | null,
): TrainingCareerSummary {
  const xp = records.reduce((sum, record) => sum + trainingProgramXp(record), 0);
  const completedPrograms = records.length;
  const totalDarts = records.reduce((sum, record) => sum + record.darts, 0);
  const averagePerformance = records.length ? records.reduce((sum, record) => sum + record.performanceScore, 0) / records.length : 0;
  const mastery = progression.map((row) => {
    const score = Math.max(row.recentAverage, row.bestScore * .82);
    const tier = masteryTier(score, row.sessions);
    return {
      family: row.family,
      label: TRAINING_FAMILY_META[row.family].label,
      score,
      sessions: row.sessions,
      ...tier,
    };
  });

  const perfectPrograms = records.filter((record) => record.steps > 0 && record.successes === record.steps).length;
  const accuracy90 = records.filter((record) => record.accuracyPct >= 90).length;
  const performance90 = records.filter((record) => record.performanceScore >= 90).length;
  const masteredFamilies = mastery.filter((row) => row.tier === "Or" || row.tier === "Diamant").length;
  const diamondFamilies = mastery.filter((row) => row.tier === "Diamant").length;
  const streakWeeks = weekly?.streakWeeks || 0;

  const defs: Array<[string, string, string, number, number]> = [
    ["first", "Premier pas", "Terminer un premier programme complet.", completedPrograms, 1],
    ["regular5", "Routine lancée", "Terminer 5 programmes complets.", completedPrograms, 5],
    ["regular20", "Assidu", "Terminer 20 programmes complets.", completedPrograms, 20],
    ["regular50", "Machine d'entraînement", "Terminer 50 programmes complets.", completedPrograms, 50],
    ["perfect", "Sans faute", "Réussir toutes les étapes d'un programme.", perfectPrograms, 1],
    ["accuracy90", "Sniper", "Finir une séance complète à 90 % de précision.", accuracy90, 1],
    ["performance90", "Séance référence", "Atteindre 90/100 de performance globale.", performance90, 1],
    ["master3", "Polyvalent", "Atteindre Or ou Diamant dans 3 compétences.", masteredFamilies, 3],
    ["diamond", "Maîtrise totale", "Atteindre Diamant dans une compétence.", diamondFamilies, 1],
    ["streak4", "Mois solide", "Tenir l'objectif hebdomadaire 4 semaines de suite.", streakWeeks, 4],
  ];
  const badges = defs.map(([id, title, description, progress, target]) => ({ id, title, description, progress, target, unlocked: progress >= target }));
  return {
    xp,
    level: buildLevel(xp),
    completedPrograms,
    totalDarts,
    averagePerformance,
    mastery,
    badges,
    unlockedBadges: badges.filter((badge) => badge.unlocked).length,
    totalBadges: badges.length,
  };
}
