import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

export type TrainingDayLoad = {
  dayStart: number;
  label: string;
  sessions: number;
  minutes: number;
  averagePerformance: number;
};

export type TrainingLoadStatus = "light" | "optimal" | "high" | "recovery";

export type TrainingLoadSummary = {
  last7Sessions: number;
  last7Minutes: number;
  last28Sessions: number;
  activeDays7: number;
  sessions24h: number;
  hoursSinceLastSession: number | null;
  recentPerformance: number;
  previousPerformance: number;
  formDelta: number;
  status: TrainingLoadStatus;
  statusLabel: string;
  statusMessage: string;
  recommendedDurationMin: 15 | 30 | 45;
  recommendedAction: string;
  calendar: TrainingDayLoad[];
};

const DAY = 24 * 60 * 60 * 1000;

function dayStart(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildCalendar(records: TrainingProgramSessionRecord[], now: number): TrainingDayLoad[] {
  const today = dayStart(now);
  const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => {
    const start = today - (6 - index) * DAY;
    const end = start + DAY;
    const rows = records.filter((row) => row.endedAt >= start && row.endedAt < end);
    return {
      dayStart: start,
      label: fmt.format(new Date(start)).replace(".", "").toUpperCase(),
      sessions: rows.length,
      minutes: rows.reduce((sum, row) => sum + Math.max(0, Number(row.durationMin) || 0), 0),
      averagePerformance: average(rows.map((row) => Math.max(0, Math.min(100, Number(row.performanceScore) || 0)))),
    };
  });
}

export function buildTrainingLoadSummary(
  records: TrainingProgramSessionRecord[],
  weeklySessionTarget: number,
  now = Date.now()
): TrainingLoadSummary {
  const sorted = [...(records || [])].sort((a, b) => b.endedAt - a.endedAt);
  const last7 = sorted.filter((row) => row.endedAt >= now - 7 * DAY && row.endedAt <= now);
  const last28 = sorted.filter((row) => row.endedAt >= now - 28 * DAY && row.endedAt <= now);
  const last24 = sorted.filter((row) => row.endedAt >= now - DAY && row.endedAt <= now);
  const activeDays7 = new Set(last7.map((row) => dayStart(row.endedAt))).size;
  const last7Minutes = last7.reduce((sum, row) => sum + Math.max(0, Number(row.durationMin) || 0), 0);
  const target = Math.max(1, Math.min(7, Math.round(Number(weeklySessionTarget) || 3)));
  const latest = sorted[0] || null;
  const hoursSinceLastSession = latest ? Math.max(0, (now - latest.endedAt) / 3_600_000) : null;

  const recentPerformance = average(sorted.slice(0, 3).map((row) => row.performanceScore));
  const previousPerformance = average(sorted.slice(3, 6).map((row) => row.performanceScore));
  const formDelta = sorted.length >= 4 ? recentPerformance - previousPerformance : 0;

  const weeklyRatio = last7.length / target;
  const recoverySignal = last24.length >= 2 || (hoursSinceLastSession !== null && hoursSinceLastSession < 8);
  const highLoad = weeklyRatio >= 1.5 || last7Minutes >= target * 45;
  const lightLoad = weeklyRatio < 0.7;

  let status: TrainingLoadStatus = "optimal";
  let statusLabel = "CHARGE ÉQUILIBRÉE";
  let statusMessage = "Le volume récent est cohérent avec ton objectif hebdomadaire.";
  let recommendedDurationMin: 15 | 30 | 45 = 30;
  let recommendedAction = "Séance standard de consolidation.";

  if (recoverySignal) {
    status = "recovery";
    statusLabel = "RÉCUPÉRATION CONSEILLÉE";
    statusMessage = last24.length >= 2
      ? "Deux séances complètes ou plus ont déjà été enregistrées sur les dernières 24 h."
      : "Ta dernière séance est très récente : mieux vaut éviter d'empiler du volume immédiatement.";
    recommendedDurationMin = 15;
    recommendedAction = "Repos ou séance légère de précision, sans chercher le volume.";
  } else if (highLoad) {
    status = "high";
    statusLabel = "CHARGE ÉLEVÉE";
    statusMessage = "Le volume des 7 derniers jours dépasse nettement ton rythme cible.";
    recommendedDurationMin = 15;
    recommendedAction = "Séance courte et qualitative, puis récupération.";
  } else if (lightLoad) {
    status = "light";
    statusLabel = "CHARGE TROP LÉGÈRE";
    statusMessage = "Le volume récent est inférieur au rythme nécessaire pour tenir ton plan.";
    recommendedDurationMin = weeklyRatio < 0.35 ? 45 : 30;
    recommendedAction = recommendedDurationMin === 45 ? "Séance complète pour relancer le rythme." : "Séance standard pour revenir dans le plan.";
  } else if (formDelta < -8) {
    statusLabel = "FORME EN BAISSE";
    statusMessage = "La performance moyenne des dernières séances recule par rapport au bloc précédent.";
    recommendedDurationMin = 15;
    recommendedAction = "Séance courte ciblée sur la technique et la confiance.";
  } else if (formDelta > 8) {
    statusLabel = "FORME EN HAUSSE";
    statusMessage = "La tendance récente est franchement positive : la charge actuelle semble bien tolérée.";
    recommendedDurationMin = 30;
    recommendedAction = "Conserve le rythme et consolide l'axe prioritaire.";
  }

  return {
    last7Sessions: last7.length,
    last7Minutes,
    last28Sessions: last28.length,
    activeDays7,
    sessions24h: last24.length,
    hoursSinceLastSession,
    recentPerformance,
    previousPerformance,
    formDelta,
    status,
    statusLabel,
    statusMessage,
    recommendedDurationMin,
    recommendedAction,
    calendar: buildCalendar(sorted, now),
  };
}
