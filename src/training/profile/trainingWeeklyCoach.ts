import type { TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import { TRAINING_FAMILY_META } from "../catalog/trainingExerciseCatalog";
import type { TrainingLoadSummary } from "./trainingLoadCoach";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

const DAY = 24 * 60 * 60 * 1000;

export type TrainingWeekSlot = {
  dayStart: number;
  label: string;
  state: "done" | "planned" | "free";
  durationMin: 15 | 30 | 45 | 0;
  focusFamily: TrainingExerciseFamily | "balanced";
  focusLabel: string;
  performanceScore?: number;
};

export type TrainingWeekCoachPlan = {
  slots: TrainingWeekSlot[];
  nextSlot: TrainingWeekSlot | null;
  summary: string;
  cadenceLabel: string;
};

export type TrainingPostSessionCoach = {
  headline: string;
  body: string;
  delta: number;
  nextDurationMin: 15 | 30 | 45;
  nextFamily: TrainingExerciseFamily;
  nextFamilyLabel: string;
  tone: "positive" | "steady" | "caution";
};

function startOfDay(timestamp: number) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(timestamp: number) {
  const d = new Date(timestamp);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function durationForIndex(index: number, base: 15 | 30 | 45): 15 | 30 | 45 {
  if (base === 15) return index % 3 === 2 ? 30 : 15;
  if (base === 45) return index % 3 === 1 ? 30 : 45;
  return index % 4 === 3 ? 45 : 30;
}

function chooseFutureDays(available: number[], count: number) {
  if (count <= 0 || !available.length) return [] as number[];
  if (count >= available.length) return available.slice(0, count);
  const chosen: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.min(available.length - 1, Math.round((i * (available.length - 1)) / Math.max(1, count - 1)));
    const day = available[index];
    if (!chosen.includes(day)) chosen.push(day);
  }
  for (const day of available) {
    if (chosen.length >= count) break;
    if (!chosen.includes(day)) chosen.push(day);
  }
  return chosen.sort((a, b) => a - b);
}

export function buildTrainingWeekCoachPlan(
  records: TrainingProgramSessionRecord[],
  weeklyTarget: number,
  recommendedFamily: TrainingExerciseFamily,
  load: TrainingLoadSummary,
  now = Date.now()
): TrainingWeekCoachPlan {
  const target = Math.max(1, Math.min(7, Math.round(Number(weeklyTarget) || 3)));
  const weekStart = startOfWeek(now);
  const today = startOfDay(now);
  const weekEnd = weekStart + 7 * DAY;
  const weekRecords = records.filter((row) => row.endedAt >= weekStart && row.endedAt < weekEnd);
  const recordsByDay = new Map<number, TrainingProgramSessionRecord[]>();
  for (const row of weekRecords) {
    const key = startOfDay(row.endedAt);
    recordsByDay.set(key, [...(recordsByDay.get(key) || []), row]);
  }

  const doneDays = Array.from(recordsByDay.keys()).sort((a, b) => a - b);
  const remaining = Math.max(0, target - weekRecords.length);
  const futureDays = Array.from({ length: 7 }, (_, i) => weekStart + i * DAY).filter((day) => day >= today && !recordsByDay.has(day));
  const plannedDays = new Set(chooseFutureDays(futureDays, remaining));
  const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  let planIndex = 0;

  const slots: TrainingWeekSlot[] = Array.from({ length: 7 }, (_, index) => {
    const dayStart = weekStart + index * DAY;
    const rows = recordsByDay.get(dayStart) || [];
    const label = fmt.format(new Date(dayStart)).replace(".", "").toUpperCase();
    if (rows.length) {
      const score = average(rows.map((row) => row.performanceScore));
      const minutes = rows.reduce((sum, row) => sum + row.durationMin, 0);
      const focusFamily = rows[0]?.families?.[0] || recommendedFamily;
      return {
        dayStart,
        label,
        state: "done" as const,
        durationMin: (minutes >= 40 ? 45 : minutes >= 22 ? 30 : 15) as 15 | 30 | 45,
        focusFamily,
        focusLabel: TRAINING_FAMILY_META[focusFamily]?.label || "Training",
        performanceScore: score,
      };
    }
    if (plannedDays.has(dayStart)) {
      const focusFamily: TrainingExerciseFamily | "balanced" = planIndex % 3 === 2 ? "balanced" : recommendedFamily;
      const durationMin = durationForIndex(planIndex, load.recommendedDurationMin);
      planIndex += 1;
      return {
        dayStart,
        label,
        state: "planned" as const,
        durationMin,
        focusFamily,
        focusLabel: focusFamily === "balanced" ? "Équilibré" : TRAINING_FAMILY_META[focusFamily].label,
      };
    }
    return { dayStart, label, state: "free" as const, durationMin: 0 as const, focusFamily: "balanced" as const, focusLabel: "Repos / libre" };
  });

  const nextSlot = slots.find((slot) => slot.state === "planned") || null;
  const cadenceLabel = load.status === "recovery" ? "Récupération prioritaire" : load.status === "high" ? "Alléger la charge" : remaining === 0 ? "Objectif semaine atteint" : `${remaining} séance${remaining > 1 ? "s" : ""} à placer`;
  const summary = remaining === 0
    ? "Le quota hebdomadaire est atteint. Les prochains jours peuvent servir à récupérer ou à travailler léger."
    : nextSlot
      ? `Prochaine séance conseillée : ${nextSlot.label}, ${nextSlot.durationMin} min, focus ${nextSlot.focusLabel.toLowerCase()}.`
      : "Le quota n'est pas encore atteint, mais il reste peu de marge cette semaine : privilégie une séance courte dès que possible.";

  return { slots, nextSlot, summary, cadenceLabel };
}

export function buildPostSessionCoach(
  previousRecords: TrainingProgramSessionRecord[],
  current: TrainingProgramSessionRecord,
  nextFamily: TrainingExerciseFamily,
  loadAfter: TrainingLoadSummary
): TrainingPostSessionCoach {
  const baseline = average(previousRecords.slice(0, 3).map((row) => row.performanceScore));
  const delta = baseline ? current.performanceScore - baseline : 0;
  let tone: TrainingPostSessionCoach["tone"] = "steady";
  let headline = "SÉANCE CONSOLIDÉE";
  let body = "La séance est enregistrée. Awena conserve le même axe de travail pour construire de la régularité.";

  if (delta >= 8) {
    tone = "positive";
    headline = "FORME EN HAUSSE";
    body = `Cette séance est ${Math.round(delta)} points au-dessus de ta référence récente. On peut consolider sans augmenter brutalement le volume.`;
  } else if (delta <= -8) {
    tone = "caution";
    headline = "SÉANCE PLUS DIFFICILE";
    body = `Cette séance est ${Math.abs(Math.round(delta))} points sous ta référence récente. Awena recommande de raccourcir le prochain bloc et de privilégier la qualité.`;
  } else if (!baseline) {
    headline = "NOUVELLE RÉFÉRENCE";
    body = "Cette séance crée une nouvelle référence pour personnaliser les prochaines recommandations.";
  }

  if (loadAfter.status === "recovery") {
    tone = "caution";
    headline = "RÉCUPÉRATION AVANT LA SUITE";
    body = `${body} La charge récente indique qu'une récupération est préférable avant un nouveau volume important.`;
  }

  return {
    headline,
    body,
    delta,
    nextDurationMin: loadAfter.recommendedDurationMin,
    nextFamily,
    nextFamilyLabel: TRAINING_FAMILY_META[nextFamily].label,
    tone,
  };
}

const NEXT_RECOMMENDATION_KEY = "dc_training_next_recommendation_v1";

export type TrainingNextRecommendation = {
  savedAt: number;
  durationMin: 15 | 30 | 45;
  family: TrainingExerciseFamily;
  familyLabel: string;
  headline: string;
  body: string;
};

export function saveTrainingNextRecommendation(advice: TrainingPostSessionCoach) {
  const value: TrainingNextRecommendation = {
    savedAt: Date.now(),
    durationMin: advice.nextDurationMin,
    family: advice.nextFamily,
    familyLabel: advice.nextFamilyLabel,
    headline: advice.headline,
    body: advice.body,
  };
  try {
    localStorage.setItem(NEXT_RECOMMENDATION_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event("dc-training-next-recommendation-updated"));
  } catch {}
  return value;
}

export function loadTrainingNextRecommendation(): TrainingNextRecommendation | null {
  try {
    const raw = JSON.parse(localStorage.getItem(NEXT_RECOMMENDATION_KEY) || "null");
    if (!raw || typeof raw !== "object") return null;
    const duration = Number(raw.durationMin);
    const family = String(raw.family || "") as TrainingExerciseFamily;
    if (![15, 30, 45].includes(duration) || !TRAINING_FAMILY_META[family]) return null;
    return {
      savedAt: Number(raw.savedAt) || Date.now(),
      durationMin: duration as 15 | 30 | 45,
      family,
      familyLabel: String(raw.familyLabel || TRAINING_FAMILY_META[family].label),
      headline: String(raw.headline || "PROCHAINE SÉANCE"),
      body: String(raw.body || "Awena a préparé la continuité de ton plan."),
    };
  } catch {
    return null;
  }
}
