import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingFamilyProgression } from "../coach/trainingDiagnosis";
import type { TrainingProgramSessionRecord, TrainingCycleComparison } from "./trainingPlanTracker";

const DAY = 24 * 60 * 60 * 1000;

export type TrainingMission = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  completed: boolean;
  tone: "cyan" | "green" | "gold" | "purple";
  family: TrainingExerciseFamily | "balanced";
  recommendedDurationMin: 15 | 30 | 45;
};

export type TrainingRecordSnapshot = {
  careerBest: number;
  weekBest: number;
  recentAverage: number;
  personalBestTarget: number;
  sessionsThisWeek: number;
};

export type TrainingMissionBoard = {
  weekStart: number;
  missions: TrainingMission[];
  completed: number;
  total: number;
  completionPct: number;
  headline: string;
  summary: string;
  nextMission: TrainingMission | null;
  record: TrainingRecordSnapshot;
  cycleChallenge: {
    title: string;
    description: string;
    progress: number;
    target: number;
    completed: boolean;
  };
};

function startOfWeek(timestamp: number) {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mission(
  id: string,
  title: string,
  description: string,
  progress: number,
  target: number,
  unit: string,
  tone: TrainingMission["tone"],
  family: TrainingMission["family"],
  recommendedDurationMin: 15 | 30 | 45,
): TrainingMission {
  const safeTarget = Math.max(1, target);
  return {
    id,
    title,
    description,
    progress,
    target: safeTarget,
    unit,
    completed: progress >= safeTarget,
    tone,
    family,
    recommendedDurationMin,
  };
}

export function buildTrainingMissionBoard(
  records: TrainingProgramSessionRecord[],
  progression: TrainingFamilyProgression[],
  recommendedFamily: TrainingExerciseFamily,
  weeklyTarget: number,
  cycle: TrainingCycleComparison,
  now = Date.now(),
): TrainingMissionBoard {
  const weekStart = startOfWeek(now);
  const weekEnd = weekStart + 7 * DAY;
  const weekRecords = records.filter((row) => row.endedAt >= weekStart && row.endedAt < weekEnd);
  const priorRecords = records.filter((row) => row.endedAt < weekStart);
  const safeWeeklyTarget = clamp(Math.round(Number(weeklyTarget) || 3), 1, 7);
  const focusTarget = Math.min(2, safeWeeklyTarget);
  const focusCount = weekRecords.filter((row) => row.families.includes(recommendedFamily)).length;
  const priorAverage = average(priorRecords.slice(0, 4).map((row) => row.performanceScore));
  const careerAverage = average(records.slice(0, 8).map((row) => row.performanceScore));
  const reference = priorAverage || careerAverage || 60;
  const qualityTarget = clamp(Math.round(reference + 4), 65, 90);
  const weekBest = weekRecords.length ? Math.max(...weekRecords.map((row) => row.performanceScore)) : 0;
  const careerBest = records.length ? Math.max(...records.map((row) => row.performanceScore)) : 0;
  const recentAverage = average(records.slice(0, 4).map((row) => row.performanceScore));
  const precisionTarget = clamp(Math.round(72 + Math.max(0, (recentAverage - 60) * .28)), 72, 88);
  const weekBestAccuracy = weekRecords.length ? Math.max(...weekRecords.map((row) => row.accuracyPct)) : 0;
  const focusLabel = TRAINING_FAMILY_META[recommendedFamily].label;

  const missions: TrainingMission[] = [
    mission(
      "weekly_cadence",
      "Tenir le rythme",
      `Valider ${safeWeeklyTarget} séance${safeWeeklyTarget > 1 ? "s" : ""} complète${safeWeeklyTarget > 1 ? "s" : ""} cette semaine.`,
      weekRecords.length,
      safeWeeklyTarget,
      "séances",
      "green",
      "balanced",
      30,
    ),
    mission(
      `focus_${recommendedFamily}`,
      `Focus ${focusLabel}`,
      `Placer ${focusTarget} séance${focusTarget > 1 ? "s" : ""} contenant un vrai bloc ${focusLabel.toLowerCase()}.`,
      focusCount,
      focusTarget,
      "séances",
      "purple",
      recommendedFamily,
      30,
    ),
    mission(
      "quality_session",
      "Séance référence",
      `Atteindre au moins ${qualityTarget}/100 sur une séance complète.`,
      weekBest,
      qualityTarget,
      "pts",
      "gold",
      recommendedFamily,
      qualityTarget >= 82 ? 45 : 30,
    ),
    mission(
      "precision_session",
      "Précision sous pression",
      `Finir une séance à ${precisionTarget}% de précision ou plus.`,
      weekBestAccuracy,
      precisionTarget,
      "%",
      "cyan",
      recommendedFamily,
      15,
    ),
  ];

  const completed = missions.filter((item) => item.completed).length;
  const nextMission = missions
    .filter((item) => !item.completed)
    .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))[0] || null;

  const cycleTarget = cycle.previousSessions
    ? Math.max(3, Math.round(cycle.previousAverage + 3))
    : 4;
  const cycleProgress = cycle.previousSessions ? cycle.recentAverage : cycle.recentSessions;
  const cycleCompleted = cycle.previousSessions
    ? cycle.recentSessions >= 4 && cycle.recentAverage >= cycleTarget
    : cycle.recentSessions >= 4;
  const cycleChallenge = cycle.previousSessions
    ? {
        title: "Défi de cycle",
        description: `Faire monter la moyenne des 4 séances à ${cycleTarget}/100 minimum.`,
        progress: cycleProgress,
        target: cycleTarget,
        completed: cycleCompleted,
      }
    : {
        title: "Construire la référence",
        description: "Terminer 4 séances complètes pour créer le premier cycle comparable.",
        progress: cycle.recentSessions,
        target: 4,
        completed: cycleCompleted,
      };

  const headline = completed === missions.length
    ? "Semaine maîtrisée"
    : completed >= 2
      ? "Semaine bien engagée"
      : "Cap de la semaine";
  const summary = completed === missions.length
    ? "Toutes les missions Awena sont validées. La suite peut viser la consolidation ou un nouveau record."
    : nextMission
      ? `Priorité suivante : ${nextMission.title.toLowerCase()}. ${nextMission.description}`
      : "Awena recalculera les prochaines missions dès qu'une nouvelle séance sera enregistrée.";

  return {
    weekStart,
    missions,
    completed,
    total: missions.length,
    completionPct: (completed / Math.max(1, missions.length)) * 100,
    headline,
    summary,
    nextMission,
    record: {
      careerBest,
      weekBest,
      recentAverage,
      personalBestTarget: careerBest >= 100 ? 100 : Math.max(65, careerBest + 1),
      sessionsThisWeek: weekRecords.length,
    },
    cycleChallenge,
  };
}
