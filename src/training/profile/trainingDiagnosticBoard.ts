import type { TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingFamilyDiagnosis, TrainingGoalStatus } from "../coach/trainingDiagnosis";

export type TrainingDiagnosticAlert = {
  id: string;
  family: TrainingExerciseFamily | null;
  level: "info" | "watch" | "priority";
  title: string;
  body: string;
};

export type TrainingDiagnosticBoard = {
  overallScore: number;
  coverage: number;
  totalSessions: number;
  confidence: "FAIBLE" | "MOYENNE" | "SOLIDE";
  strongestFamily: TrainingExerciseFamily | null;
  strongestLabel: string;
  strongestScore: number;
  priorityFamily: TrainingExerciseFamily;
  priorityLabel: string;
  priorityScore: number;
  goalGap: number;
  reachedGoals: number;
  alerts: TrainingDiagnosticAlert[];
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function buildTrainingDiagnosticBoard(
  diagnosis: TrainingFamilyDiagnosis[],
  goals: TrainingGoalStatus[],
  priorityFamily: TrainingExerciseFamily,
): TrainingDiagnosticBoard {
  const practiced = diagnosis.filter((row) => row.sessions > 0);
  const totalSessions = diagnosis.reduce((sum, row) => sum + Math.max(0, row.sessions), 0);
  const overallScore = average(practiced.map((row) => row.recentScore));
  const coverage = diagnosis.length ? Math.round((practiced.length / diagnosis.length) * 100) : 0;
  const strongest = [...practiced].sort((a, b) => b.recentScore - a.recentScore)[0] || null;
  const priority = diagnosis.find((row) => row.family === priorityFamily) || diagnosis[0];
  const priorityGoal = goals.find((row) => row.family === priorityFamily);
  const reachedGoals = goals.filter((row) => row.reached).length;
  const confidence: TrainingDiagnosticBoard["confidence"] = totalSessions >= 24 && practiced.length >= 6
    ? "SOLIDE"
    : totalSessions >= 10 && practiced.length >= 4
      ? "MOYENNE"
      : "FAIBLE";

  const alerts: TrainingDiagnosticAlert[] = [];
  for (const row of diagnosis) {
    if (row.sessions === 0) {
      alerts.push({ id: `missing-${row.family}`, family: row.family, level: "info", title: `${row.label} à mesurer`, body: "Aucune référence fiable : une séance ciblée suffit pour ouvrir ce diagnostic." });
      continue;
    }
    if (row.trend <= -7) {
      alerts.push({ id: `trend-${row.family}`, family: row.family, level: "priority", title: `${row.label} en recul`, body: `La tendance récente baisse de ${Math.abs(Math.round(row.trend))} points. Awena doit vérifier ce signal sur la prochaine séance.` });
    } else if (row.trend <= -3) {
      alerts.push({ id: `watch-${row.family}`, family: row.family, level: "watch", title: `${row.label} à surveiller`, body: `La tendance récente recule de ${Math.abs(Math.round(row.trend))} points.` });
    }
  }
  for (const goal of goals) {
    if (goal.gap >= 20) {
      alerts.push({ id: `goal-${goal.family}`, family: goal.family, level: "priority", title: `${goal.label} loin de l'objectif`, body: `${Math.ceil(goal.gap)} points restent à gagner pour atteindre ${goal.goal}/100.` });
    }
  }

  alerts.sort((a, b) => {
    const rank = { priority: 0, watch: 1, info: 2 } as const;
    return rank[a.level] - rank[b.level];
  });

  return {
    overallScore,
    coverage,
    totalSessions,
    confidence,
    strongestFamily: strongest?.family || null,
    strongestLabel: strongest?.label || "À établir",
    strongestScore: strongest?.recentScore || 0,
    priorityFamily,
    priorityLabel: priority?.label || "À établir",
    priorityScore: priority?.recentScore || 0,
    goalGap: priorityGoal?.gap || 0,
    reachedGoals,
    alerts: alerts.slice(0, 5),
  };
}
