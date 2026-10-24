import type { TrainingDetailedSession } from "../stats/trainingStatsHub";
import { TRAINING_FAMILY_META, getTrainingExercise, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";

export type TrainingFamilyDiagnosis = {
  family: TrainingExerciseFamily;
  label: string;
  sessions: number;
  accuracyPct: number;
  successPct: number;
  score: number;
  recentScore: number;
  trend: number;
};

const families = Object.keys(TRAINING_FAMILY_META) as TrainingExerciseFamily[];

function inferredFamily(row: TrainingDetailedSession): TrainingExerciseFamily | null {
  const explicit = String(row?.metrics?.family || row?.config?.family || "") as TrainingExerciseFamily;
  if (families.includes(explicit)) return explicit;
  const exerciseId = String(row?.metrics?.exerciseId || row?.config?.exerciseId || "");
  if (exerciseId) {
    const family = getTrainingExercise(exerciseId)?.family;
    if (family && families.includes(family)) return family;
  }
  const mode = String(row?.modeId || "");
  if (mode.includes("double")) return "doubles";
  if (mode.includes("precision") || mode.includes("clock")) return "precision";
  if (mode.includes("bull")) return "bull";
  if (mode.includes("repeat") || mode.includes("ghost")) return "regularity";
  if (mode.includes("x01") || mode.includes("time_attack")) return "scoring";
  return null;
}

function computeScore(rows: TrainingDetailedSession[]) {
  const darts = rows.reduce((sum, row) => sum + Math.max(0, Number(row.darts) || 0), 0);
  const hits = rows.reduce((sum, row) => sum + Math.max(0, Number(row.hits) || 0), 0);
  const successes = rows.reduce((sum, row) => sum + (row.success ? 1 : 0), 0);
  const accuracyPct = darts > 0 ? (hits / darts) * 100 : 0;
  const successPct = rows.length ? (successes / rows.length) * 100 : 0;
  const evidence = Math.min(1, rows.length / 5);
  const score = rows.length ? ((accuracyPct * 0.65 + successPct * 0.35) * evidence) : 0;
  return { accuracyPct, successPct, score };
}

export function buildTrainingDiagnosis(sessions: TrainingDetailedSession[]): TrainingFamilyDiagnosis[] {
  return families.map((family) => {
    const rows = (sessions || [])
      .filter((row) => inferredFamily(row) === family)
      .sort((a, b) => Number(b.endedAt || 0) - Number(a.endedAt || 0));
    const total = computeScore(rows);
    const recentRows = rows.slice(0, 5);
    const previousRows = rows.slice(5, 10);
    const recent = computeScore(recentRows);
    const previous = computeScore(previousRows);
    const trend = recentRows.length && previousRows.length ? recent.score - previous.score : 0;
    return {
      family,
      label: TRAINING_FAMILY_META[family].label,
      sessions: rows.length,
      accuracyPct: total.accuracyPct,
      successPct: total.successPct,
      score: total.score,
      recentScore: recent.score,
      trend,
    };
  });
}

export function chooseRecommendedFamily(rows: TrainingFamilyDiagnosis[]): TrainingExerciseFamily {
  const unpracticed = rows.find((row) => row.sessions === 0);
  if (unpracticed) return unpracticed.family;
  const practiced = rows.filter((row) => row.sessions > 0);
  if (!practiced.length) return "precision";
  return [...practiced].sort((a, b) => a.recentScore - b.recentScore || a.sessions - b.sessions)[0].family;
}

export function buildCoachPrescription(rows: TrainingFamilyDiagnosis[]) {
  const family = chooseRecommendedFamily(rows);
  const row = rows.find((item) => item.family === family);
  const meta = TRAINING_FAMILY_META[family];
  const secondary = [...rows]
    .filter((item) => item.family !== family && item.sessions > 0)
    .sort((a, b) => a.recentScore - b.recentScore)[0];

  if (!row || row.sessions === 0) {
    return {
      family,
      title: `Awena recommande : découvrir ${meta.label}`,
      body: `Tu n'as pas encore assez de données sur cette compétence. Une séance ciblée permettra d'établir une première référence fiable.`,
    };
  }

  const trendText = row.trend > 3 ? "La tendance récente est positive." : row.trend < -3 ? "La tendance récente recule : on remet cette compétence au centre de la séance." : "La tendance est stable : on cherche maintenant plus de régularité.";
  return {
    family,
    title: `Awena recommande : renforcer ${meta.label}`,
    body: `${Math.round(row.accuracyPct)} % de précision sur ${row.sessions} séance${row.sessions > 1 ? "s" : ""}. ${trendText}${secondary ? ` En second axe : ${secondary.label}.` : ""}`,
  };
}

export type TrainingProgressPoint = {
  endedAt: number;
  score: number;
  accuracyPct: number;
  success: boolean;
  exerciseId: string | null;
};

export type TrainingFamilyProgression = {
  family: TrainingExerciseFamily;
  label: string;
  sessions: number;
  recentAverage: number;
  previousAverage: number;
  bestScore: number;
  delta: number;
  streak: number;
  points: TrainingProgressPoint[];
};

function performanceScoreOf(row: TrainingDetailedSession) {
  const explicit = Number(row?.metrics?.performanceScore ?? row?.metrics?.score);
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, explicit));
  const accuracy = Number(row?.accuracyPct || 0);
  return Math.max(0, Math.min(100, accuracy));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildTrainingProgression(sessions: TrainingDetailedSession[]): TrainingFamilyProgression[] {
  return families.map((family) => {
    const rows = (sessions || [])
      .filter((row) => inferredFamily(row) === family)
      .sort((a, b) => Number(b.endedAt || 0) - Number(a.endedAt || 0));

    const recentRows = rows.slice(0, 5);
    const previousRows = rows.slice(5, 10);
    const recentAverage = average(recentRows.map(performanceScoreOf));
    const previousAverage = average(previousRows.map(performanceScoreOf));
    const bestScore = rows.reduce((best, row) => Math.max(best, performanceScoreOf(row)), 0);

    let streak = 0;
    for (const row of rows) {
      if (!row.success) break;
      streak += 1;
    }

    return {
      family,
      label: TRAINING_FAMILY_META[family].label,
      sessions: rows.length,
      recentAverage,
      previousAverage,
      bestScore,
      delta: previousRows.length ? recentAverage - previousAverage : 0,
      streak,
      points: rows.slice(0, 10).reverse().map((row) => ({
        endedAt: Number(row.endedAt || 0),
        score: performanceScoreOf(row),
        accuracyPct: Math.max(0, Number(row.accuracyPct || 0)),
        success: !!row.success,
        exerciseId: String(row?.metrics?.exerciseId || row?.config?.exerciseId || "") || null,
      })),
    };
  });
}


export type TrainingGoalStatus = {
  family: TrainingExerciseFamily;
  label: string;
  current: number;
  goal: number;
  gap: number;
  reached: boolean;
};

export function buildTrainingGoalStatuses(
  rows: TrainingFamilyDiagnosis[],
  goals: Partial<Record<TrainingExerciseFamily, number>>
): TrainingGoalStatus[] {
  return families.map((family) => {
    const row = rows.find((item) => item.family === family);
    const current = Math.max(0, Math.min(100, Number(row?.recentScore || 0)));
    const goal = Math.max(20, Math.min(100, Number(goals?.[family] ?? 70)));
    return {
      family,
      label: TRAINING_FAMILY_META[family].label,
      current,
      goal,
      gap: Math.max(0, goal - current),
      reached: current >= goal,
    };
  });
}

export function chooseGoalPriorityFamily(
  rows: TrainingFamilyDiagnosis[],
  goals: Partial<Record<TrainingExerciseFamily, number>>
): TrainingExerciseFamily {
  const statuses = buildTrainingGoalStatuses(rows, goals);
  const withEvidence = statuses.filter((status) => {
    const row = rows.find((item) => item.family === status.family);
    return Number(row?.sessions || 0) > 0;
  });
  if (!withEvidence.length) return chooseRecommendedFamily(rows);
  return [...withEvidence].sort((a, b) => b.gap - a.gap || a.current - b.current)[0].family;
}

export function buildGoalAwareCoachPrescription(
  rows: TrainingFamilyDiagnosis[],
  goals: Partial<Record<TrainingExerciseFamily, number>>
) {
  const base = buildCoachPrescription(rows);
  const family = chooseGoalPriorityFamily(rows, goals);
  const row = rows.find((item) => item.family === family);
  const goal = Math.max(20, Math.min(100, Number(goals?.[family] ?? 70)));
  const current = Math.max(0, Math.min(100, Number(row?.recentScore || 0)));
  const gap = Math.max(0, goal - current);
  const label = TRAINING_FAMILY_META[family].label;

  if (!row || row.sessions === 0) {
    return {
      ...base,
      family,
      title: `Awena recommande : établir ta référence ${label}`,
      body: `Objectif personnel ${goal}/100. Il faut d'abord quelques séances ciblées pour mesurer précisément ton niveau sur cette compétence.`,
      goal,
      current,
      gap,
    };
  }

  if (gap <= 0) {
    return {
      ...base,
      family,
      title: `Awena : objectif ${label} atteint`,
      body: `Indice récent ${Math.round(current)}/100 pour un objectif ${goal}/100. On peut maintenir ce niveau tout en renforçant ton prochain axe prioritaire.`,
      goal,
      current,
      gap,
    };
  }

  return {
    ...base,
    family,
    title: `Awena recommande : ${label} — encore ${Math.ceil(gap)} pts`,
    body: `Indice récent ${Math.round(current)}/100, objectif personnel ${goal}/100. Je privilégie cette compétence jusqu'à réduire l'écart, puis le programme rééquilibrera automatiquement la séance.`,
    goal,
    current,
    gap,
  };
}
