import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingFamilyDiagnosis } from "../coach/trainingDiagnosis";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

const FAMILIES = Object.keys(TRAINING_FAMILY_META) as TrainingExerciseFamily[];
const CYCLE_SIZE = 4;
const DAY = 24 * 60 * 60 * 1000;

export type TrainingCyclePriority = {
  family: TrainingExerciseFamily;
  label: string;
  score: number;
  current: number;
  goal: number;
  gap: number;
  urgency: number;
  recentExposure: number;
  reason: string;
};

export type TrainingCycleCoach = {
  cycleNumber: number;
  cycleSize: number;
  completedSessions: number;
  remainingSessions: number;
  completionPct: number;
  priority: TrainingCyclePriority;
  secondary: TrainingCyclePriority;
  targetAverage: number;
  currentAverage: number;
  focusTarget: number;
  focusCompleted: number;
  varietyTarget: number;
  varietyCompleted: number;
  onTrack: boolean;
  headline: string;
  summary: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function deadlineUrgency(raw?: string | null) {
  if (!raw) return 0;
  const target = new Date(`${raw}T23:59:59`).getTime();
  if (!Number.isFinite(target)) return 0;
  const days = Math.ceil((target - Date.now()) / DAY);
  if (days < 0) return 28;
  if (days <= 7) return 22;
  if (days <= 14) return 14;
  if (days <= 30) return 7;
  return 2;
}

function buildPriority(
  family: TrainingExerciseFamily,
  diagnosis: TrainingFamilyDiagnosis[],
  goals: Partial<Record<TrainingExerciseFamily, number>>,
  deadlines: Partial<Record<TrainingExerciseFamily, string | null>>,
  recentRecords: TrainingProgramSessionRecord[],
): TrainingCyclePriority {
  const row = diagnosis.find((item) => item.family === family);
  const current = clamp(Number(row?.recentScore || 0), 0, 100);
  const goal = clamp(Number(goals?.[family] ?? 70), 20, 100);
  const gap = Math.max(0, goal - current);
  const urgency = deadlineUrgency(deadlines?.[family]);
  const recentExposure = recentRecords.filter((record) => record.families.includes(family)).length;
  const evidenceBonus = Number(row?.sessions || 0) < 3 ? 8 : 0;
  const trendBonus = Number(row?.trend || 0) < -4 ? 5 : 0;
  const exposurePenalty = recentExposure >= 3 ? 14 : recentExposure === 2 ? 7 : 0;
  const score = gap + urgency + evidenceBonus + trendBonus - exposurePenalty;
  const reason = urgency >= 14
    ? "échéance proche"
    : gap >= 15
      ? "écart important à l’objectif"
      : evidenceBonus
        ? "référence encore insuffisante"
        : trendBonus
          ? "forme récente en baisse"
          : recentExposure >= 2
            ? "à maintenir sans surcharge"
            : "meilleur levier de progression";
  return { family, label: TRAINING_FAMILY_META[family].label, score, current, goal, gap, urgency, recentExposure, reason };
}

export function buildTrainingCycleCoach(
  records: TrainingProgramSessionRecord[],
  diagnosis: TrainingFamilyDiagnosis[],
  goals: Partial<Record<TrainingExerciseFamily, number>>,
  deadlines: Partial<Record<TrainingExerciseFamily, string | null>>,
): TrainingCycleCoach {
  const chronological = [...records].sort((a, b) => a.endedAt - b.endedAt);
  const completedCycles = Math.floor(chronological.length / CYCLE_SIZE);
  const currentCount = chronological.length % CYCLE_SIZE;
  const currentCycle = currentCount ? chronological.slice(-currentCount) : [];
  const previousCycle = chronological.length >= CYCLE_SIZE
    ? chronological.slice(-(currentCount + CYCLE_SIZE), currentCount ? -currentCount : undefined)
    : [];
  const recentRecords = chronological.slice(-3);

  const priorities = FAMILIES
    .map((family) => buildPriority(family, diagnosis, goals, deadlines, recentRecords))
    .sort((a, b) => b.score - a.score || b.gap - a.gap || a.current - b.current);
  const priority = priorities[0];
  const secondary = priorities.find((item) => item.family !== priority.family) || priorities[0];

  const previousAverage = avg(previousCycle.map((record) => record.performanceScore));
  const baseline = previousAverage || avg(chronological.slice(-8).map((record) => record.performanceScore)) || 60;
  const targetAverage = clamp(Math.round(baseline + (baseline < 70 ? 4 : 3)), 64, 92);
  const currentAverage = avg(currentCycle.map((record) => record.performanceScore));
  const focusTarget = 2;
  const focusCompleted = currentCycle.filter((record) => record.families.includes(priority.family)).length;
  const varietyTarget = 3;
  const varietyCompleted = new Set(currentCycle.flatMap((record) => record.families)).size;
  const remainingSessions = CYCLE_SIZE - currentCount;
  const projectedAverageOk = !currentCount || currentAverage >= targetAverage - 4;
  const focusStillReachable = focusCompleted + remainingSessions >= focusTarget;
  const varietyStillReachable = varietyCompleted + remainingSessions >= varietyTarget;
  const onTrack = projectedAverageOk && focusStillReachable && varietyStillReachable;

  const cycleNumber = completedCycles + 1;
  const headline = currentCount === 0
    ? `Cycle ${cycleNumber} prêt à démarrer`
    : onTrack
      ? `Cycle ${cycleNumber} dans le bon rythme`
      : `Cycle ${cycleNumber} à rééquilibrer`;
  const summary = currentCount === 0
    ? `Cap : moyenne ${targetAverage}/100, ${focusTarget} séances avec un bloc ${priority.label.toLowerCase()} et au moins ${varietyTarget} familles travaillées.`
    : `${currentCount}/${CYCLE_SIZE} séances • moyenne ${Math.round(currentAverage)}/100 (cible ${targetAverage}) • focus ${priority.label} ${focusCompleted}/${focusTarget} • variété ${varietyCompleted}/${varietyTarget}.`;

  return {
    cycleNumber,
    cycleSize: CYCLE_SIZE,
    completedSessions: currentCount,
    remainingSessions,
    completionPct: (currentCount / CYCLE_SIZE) * 100,
    priority,
    secondary,
    targetAverage,
    currentAverage,
    focusTarget,
    focusCompleted,
    varietyTarget,
    varietyCompleted,
    onTrack,
    headline,
    summary,
  };
}
