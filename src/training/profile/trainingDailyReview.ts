import { trainingLocalDateKey, trainingSessionDateKey } from "./trainingDailyQueue";

export type TrainingDailyReviewDay = {
  dateKey: string;
  label: string;
  attempts: number;
  exercises: number;
  averageScore: number;
  bestScore: number;
};

export type TrainingDailyReview = {
  days: TrainingDailyReviewDay[];
  today: TrainingDailyReviewDay;
  yesterday: TrainingDailyReviewDay;
  activeDays: number;
  totalAttempts: number;
  weekAverage: number;
  previousWeekAverage: number;
  deltaVsYesterday: number | null;
  deltaVsPreviousWeek: number | null;
};

function localDay(date: Date, offsetDays: number) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + offsetDays);
  return next;
}

function scoreOf(row: any) {
  return Math.max(0, Math.min(100, Number(row?.metrics?.performanceScore ?? row?.metrics?.score ?? row?.score ?? 0) || 0));
}

function exerciseIdOf(row: any) {
  return String(row?.metrics?.exerciseId || row?.config?.exerciseId || "").trim();
}

function buildDay(sessions: any[], date: Date): TrainingDailyReviewDay {
  const dateKey = trainingLocalDateKey(date);
  const rows = sessions.filter((row) => exerciseIdOf(row) && trainingSessionDateKey(row?.endedAt || row?.completedAt || row?.createdAt) === dateKey);
  const scores = rows.map(scoreOf);
  const exerciseIds = new Set(rows.map(exerciseIdOf));
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "").slice(0, 3).toUpperCase();
  return {
    dateKey,
    label,
    attempts: rows.length,
    exercises: exerciseIds.size,
    averageScore: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
  };
}

function averageAcrossActiveDays(days: TrainingDailyReviewDay[]) {
  const active = days.filter((day) => day.attempts > 0);
  if (!active.length) return 0;
  return Math.round(active.reduce((sum, day) => sum + day.averageScore, 0) / active.length);
}

export function buildTrainingDailyReview(sessions: any[], now = new Date()): TrainingDailyReview {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const days = Array.from({ length: 7 }, (_, index) => buildDay(safeSessions, localDay(now, index - 6)));
  const previousDays = Array.from({ length: 7 }, (_, index) => buildDay(safeSessions, localDay(now, index - 13)));
  const today = days[6];
  const yesterday = days[5];
  const weekAverage = averageAcrossActiveDays(days);
  const previousWeekAverage = averageAcrossActiveDays(previousDays);
  return {
    days,
    today,
    yesterday,
    activeDays: days.filter((day) => day.attempts > 0).length,
    totalAttempts: days.reduce((sum, day) => sum + day.attempts, 0),
    weekAverage,
    previousWeekAverage,
    deltaVsYesterday: today.attempts && yesterday.attempts ? today.averageScore - yesterday.averageScore : null,
    deltaVsPreviousWeek: weekAverage && previousWeekAverage ? weekAverage - previousWeekAverage : null,
  };
}
