import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

export type TrainingWeeklyMissionResult = {
  id: "cadence" | "quality" | "precision" | "variety";
  label: string;
  completed: boolean;
  progress: number;
  target: number;
  suffix: string;
};

export type TrainingCoachWeekSummary = {
  weekStart: number;
  label: string;
  sessions: number;
  minutes: number;
  averagePerformance: number;
  bestPerformance: number;
  bestAccuracy: number;
  dominantFamily: TrainingExerciseFamily | null;
  dominantFamilyLabel: string;
  completedMissions: number;
  totalMissions: number;
  completionPct: number;
  missions: TrainingWeeklyMissionResult[];
  status: "mastered" | "solid" | "partial" | "empty";
  headline: string;
};

export type TrainingCoachHistory = {
  weeks: TrainingCoachWeekSummary[];
  current: TrainingCoachWeekSummary;
  previous: TrainingCoachWeekSummary | null;
  performanceDelta: number;
  missionDelta: number;
  masteredWeeks: number;
  consistencyPct: number;
  headline: string;
  body: string;
  recommendation: string;
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

function dominantFamily(rows: TrainingProgramSessionRecord[]) {
  const counts = new Map<TrainingExerciseFamily, number>();
  for (const row of rows) {
    for (const family of row.families || []) counts.set(family, (counts.get(family) || 0) + 1);
  }
  let best: TrainingExerciseFamily | null = null;
  let bestCount = 0;
  for (const [family, count] of counts) {
    if (count > bestCount) {
      best = family;
      bestCount = count;
    }
  }
  return best;
}

function buildWeek(
  records: TrainingProgramSessionRecord[],
  weekStart: number,
  weeklyTarget: number,
  now: number,
): TrainingCoachWeekSummary {
  const weekEnd = weekStart + WEEK;
  const rows = records.filter((row) => row.endedAt >= weekStart && row.endedAt < weekEnd && row.endedAt <= now);
  const prior = records.filter((row) => row.endedAt < weekStart).slice(0, 8);
  const safeTarget = clamp(Math.round(Number(weeklyTarget) || 3), 1, 7);
  const priorAverage = average(prior.slice(0, 4).map((row) => row.performanceScore));
  const reference = priorAverage || average(records.slice(-8).map((row) => row.performanceScore)) || 60;
  const qualityTarget = clamp(Math.round(reference + 4), 65, 90);
  const precisionTarget = clamp(Math.round(72 + Math.max(0, (reference - 60) * 0.28)), 72, 88);
  const diversityTarget = Math.min(3, Math.max(2, safeTarget));
  const distinctFamilies = new Set(rows.flatMap((row) => row.families || [])).size;
  const bestPerformance = rows.length ? Math.max(...rows.map((row) => row.performanceScore)) : 0;
  const bestAccuracy = rows.length ? Math.max(...rows.map((row) => row.accuracyPct)) : 0;

  const missions: TrainingWeeklyMissionResult[] = [
    { id: "cadence", label: "Rythme", completed: rows.length >= safeTarget, progress: rows.length, target: safeTarget, suffix: " séances" },
    { id: "quality", label: "Qualité", completed: bestPerformance >= qualityTarget, progress: bestPerformance, target: qualityTarget, suffix: "/100" },
    { id: "precision", label: "Précision", completed: bestAccuracy >= precisionTarget, progress: bestAccuracy, target: precisionTarget, suffix: "%" },
    { id: "variety", label: "Variété", completed: distinctFamilies >= diversityTarget, progress: distinctFamilies, target: diversityTarget, suffix: " familles" },
  ];
  const completedMissions = missions.filter((item) => item.completed).length;
  const status: TrainingCoachWeekSummary["status"] = !rows.length ? "empty" : completedMissions === missions.length ? "mastered" : completedMissions >= 3 ? "solid" : "partial";
  const headline = status === "mastered" ? "Semaine maîtrisée" : status === "solid" ? "Semaine solide" : status === "partial" ? "Semaine à consolider" : "Pas encore de séance";
  const family = dominantFamily(rows);
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

  return {
    weekStart,
    label: `${fmt.format(new Date(weekStart))} → ${fmt.format(new Date(weekEnd - DAY))}`,
    sessions: rows.length,
    minutes: rows.reduce((sum, row) => sum + row.durationMin, 0),
    averagePerformance: average(rows.map((row) => row.performanceScore)),
    bestPerformance,
    bestAccuracy,
    dominantFamily: family,
    dominantFamilyLabel: family ? TRAINING_FAMILY_META[family].label : "—",
    completedMissions,
    totalMissions: missions.length,
    completionPct: (completedMissions / missions.length) * 100,
    missions,
    status,
    headline,
  };
}

export function buildTrainingCoachHistory(
  records: TrainingProgramSessionRecord[],
  weeklyTarget: number,
  recommendedFamily: TrainingExerciseFamily,
  now = Date.now(),
  weekCount = 6,
): TrainingCoachHistory {
  const currentStart = startOfWeek(now);
  const weeks = Array.from({ length: Math.max(2, Math.min(12, weekCount)) }, (_, index) =>
    buildWeek(records, currentStart - index * WEEK, weeklyTarget, now),
  );
  const current = weeks[0];
  const previous = weeks[1]?.sessions ? weeks[1] : null;
  const performanceDelta = previous ? current.averagePerformance - previous.averagePerformance : 0;
  const missionDelta = previous ? current.completedMissions - previous.completedMissions : 0;
  const completedWeeks = weeks.filter((week) => week.sessions > 0);
  const masteredWeeks = completedWeeks.filter((week) => week.status === "mastered").length;
  const consistencyPct = completedWeeks.length
    ? (completedWeeks.reduce((sum, week) => sum + week.completionPct, 0) / completedWeeks.length)
    : 0;

  let headline = current.headline;
  let body = current.sessions
    ? `${current.sessions} séance${current.sessions > 1 ? "s" : ""}, ${current.completedMissions}/${current.totalMissions} missions validées et ${Math.round(current.averagePerformance)}/100 de performance moyenne.`
    : "La semaine n'a pas encore de séance complète enregistrée.";
  let recommendation = `Prochaine priorité : intégrer un bloc ${TRAINING_FAMILY_META[recommendedFamily].label.toLowerCase()} dans la prochaine séance.`;

  if (current.status === "mastered") {
    headline = "Cycle hebdomadaire maîtrisé";
    body = `${body} Les quatre axes — rythme, qualité, précision et variété — sont validés.`;
    recommendation = "Conserve le volume actuel et cherche un petit gain de qualité plutôt qu'une hausse brutale de charge.";
  } else {
    const missing = current.missions.find((mission) => !mission.completed);
    if (missing?.id === "cadence") recommendation = `Il manque ${Math.max(1, Math.ceil(missing.target - missing.progress))} séance pour tenir le rythme hebdomadaire.`;
    else if (missing?.id === "quality") recommendation = `Cherche une séance propre à ${Math.round(missing.target)}/100 avant d'augmenter le volume.`;
    else if (missing?.id === "precision") recommendation = `Travaille court et ciblé : l'objectif de précision de la semaine est ${Math.round(missing.target)}%.`;
    else if (missing?.id === "variety") recommendation = `Ajoute une famille différente à la prochaine séance, avec priorité ${TRAINING_FAMILY_META[recommendedFamily].label.toLowerCase()}.`;
  }

  if (previous && performanceDelta <= -8) {
    recommendation = `${recommendation} La moyenne recule de ${Math.abs(Math.round(performanceDelta))} points vs semaine précédente : privilégie la qualité et la récupération.`;
  } else if (previous && performanceDelta >= 8) {
    recommendation = `${recommendation} La forme progresse de ${Math.round(performanceDelta)} points vs semaine précédente.`;
  }

  return { weeks, current, previous, performanceDelta, missionDelta, masteredWeeks, consistencyPct, headline, body, recommendation };
}
