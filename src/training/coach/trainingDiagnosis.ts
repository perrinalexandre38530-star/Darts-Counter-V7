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
