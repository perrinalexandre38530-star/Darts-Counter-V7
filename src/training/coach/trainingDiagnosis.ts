import type { TrainingDetailedSession } from "../stats/trainingStatsHub";
import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";

export type TrainingFamilyDiagnosis = {
  family: TrainingExerciseFamily;
  label: string;
  sessions: number;
  accuracyPct: number;
  successPct: number;
  score: number;
};

const families = Object.keys(TRAINING_FAMILY_META) as TrainingExerciseFamily[];

function inferredFamily(row: TrainingDetailedSession): TrainingExerciseFamily | null {
  const explicit = String(row?.metrics?.family || row?.config?.family || "") as TrainingExerciseFamily;
  if (families.includes(explicit)) return explicit;
  const mode = String(row?.modeId || "");
  if (mode.includes("double")) return "doubles";
  if (mode.includes("precision") || mode.includes("clock")) return "precision";
  if (mode.includes("bull")) return "bull";
  if (mode.includes("repeat") || mode.includes("ghost")) return "regularity";
  if (mode.includes("x01") || mode.includes("time_attack")) return "scoring";
  return null;
}

export function buildTrainingDiagnosis(sessions: TrainingDetailedSession[]): TrainingFamilyDiagnosis[] {
  return families.map((family) => {
    const rows = (sessions || []).filter((row) => inferredFamily(row) === family);
    const darts = rows.reduce((sum, row) => sum + Math.max(0, Number(row.darts) || 0), 0);
    const hits = rows.reduce((sum, row) => sum + Math.max(0, Number(row.hits) || 0), 0);
    const successes = rows.reduce((sum, row) => sum + (row.success ? 1 : 0), 0);
    const accuracyPct = darts > 0 ? (hits / darts) * 100 : 0;
    const successPct = rows.length ? (successes / rows.length) * 100 : 0;
    const evidence = Math.min(1, rows.length / 5);
    const score = rows.length ? ((accuracyPct * 0.65 + successPct * 0.35) * evidence) : 0;
    return { family, label: TRAINING_FAMILY_META[family].label, sessions: rows.length, accuracyPct, successPct, score };
  });
}

export function chooseRecommendedFamily(rows: TrainingFamilyDiagnosis[]): TrainingExerciseFamily {
  const practiced = rows.filter((row) => row.sessions > 0);
  if (!practiced.length) return "precision";
  return [...practiced].sort((a, b) => a.score - b.score || a.sessions - b.sessions)[0].family;
}
