import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingDetailedSession } from "../stats/trainingStatsHub";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

const ASSESSMENT_ID = "assessment_30";
const FAMILIES: TrainingExerciseFamily[] = ["scoring", "doubles", "checkout", "precision", "bull", "regularity"];

export type TrainingAssessmentFamilyScore = {
  family: TrainingExerciseFamily;
  label: string;
  score: number;
  accuracyPct: number;
  exerciseTitle: string;
};

export type TrainingAssessmentSummary = {
  available: boolean;
  endedAt: number;
  overallScore: number;
  accuracyPct: number;
  coverage: number;
  familyScores: TrainingAssessmentFamilyScore[];
  strongestFamily: TrainingExerciseFamily | null;
  strongestLabel: string;
  weakestFamily: TrainingExerciseFamily | null;
  weakestLabel: string;
  previousOverallScore: number | null;
  delta: number | null;
  sessionsSinceAssessment: number;
  due: boolean;
  headline: string;
  body: string;
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function safeFamily(value: unknown): TrainingExerciseFamily | null {
  const family = String(value || "") as TrainingExerciseFamily;
  return TRAINING_FAMILY_META[family] ? family : null;
}

function detailedForAssessment(detailed: TrainingDetailedSession[], endedAt: number) {
  const minTime = endedAt - 3 * 60 * 60 * 1000;
  const maxTime = endedAt + 90 * 1000;
  return detailed.filter((row) => {
    const programId = String(row.metrics?.programId || "");
    return programId === ASSESSMENT_ID && row.endedAt >= minTime && row.endedAt <= maxTime;
  });
}

export function buildTrainingAssessment(
  programSessions: TrainingProgramSessionRecord[],
  detailedSessions: TrainingDetailedSession[],
): TrainingAssessmentSummary {
  const assessments = programSessions.filter((row) => row.programId === ASSESSMENT_ID).sort((a, b) => b.endedAt - a.endedAt);
  const latest = assessments[0] || null;
  const previous = assessments[1] || null;
  if (!latest) {
    return {
      available: false,
      endedAt: 0,
      overallScore: 0,
      accuracyPct: 0,
      coverage: 0,
      familyScores: [],
      strongestFamily: null,
      strongestLabel: "—",
      weakestFamily: null,
      weakestLabel: "—",
      previousOverallScore: null,
      delta: null,
      sessionsSinceAssessment: programSessions.length,
      due: true,
      headline: "POSE TA RÉFÉRENCE DE NIVEAU",
      body: "Six tests identiques couvrent Scoring, Doubles, Checkout, Précision, Bull et Régularité. Awena obtient ainsi un point zéro comparable dans le temps.",
    };
  }

  const detailRows = detailedForAssessment(detailedSessions, latest.endedAt);
  const familyScores: TrainingAssessmentFamilyScore[] = [];
  for (const family of FAMILIES) {
    const row = detailRows
      .filter((item) => safeFamily(item.metrics?.family) === family)
      .sort((a, b) => b.endedAt - a.endedAt)[0];
    if (!row) continue;
    familyScores.push({
      family,
      label: TRAINING_FAMILY_META[family].label,
      score: Math.max(0, Math.min(100, Number(row.metrics?.performanceScore || row.metrics?.score || 0))),
      accuracyPct: Math.max(0, Math.min(100, Number(row.metrics?.accuracyPct || row.accuracyPct || 0))),
      exerciseTitle: String(row.metrics?.exerciseTitle || "Test"),
    });
  }

  const ranked = [...familyScores].sort((a, b) => b.score - a.score);
  const strongest = ranked[0] || null;
  const weakest = ranked[ranked.length - 1] || null;
  const overallScore = familyScores.length ? average(familyScores.map((row) => row.score)) : latest.performanceScore;
  const accuracyPct = familyScores.length ? average(familyScores.map((row) => row.accuracyPct)) : latest.accuracyPct;
  const sessionsSinceAssessment = programSessions.filter((row) => row.endedAt > latest.endedAt && row.programId !== ASSESSMENT_ID).length;
  const previousOverallScore = previous ? previous.performanceScore : null;
  const delta = previousOverallScore == null ? null : overallScore - previousOverallScore;
  const due = sessionsSinceAssessment >= 12;

  const headline = due
    ? "BILAN À REJOUER"
    : delta == null
      ? "RÉFÉRENCE DE NIVEAU POSÉE"
      : delta >= 4
        ? "NIVEAU EN PROGRESSION"
        : delta <= -4
          ? "RÉFÉRENCE À RECONSOLIDER"
          : "NIVEAU GLOBAL STABLE";
  const body = due
    ? `${sessionsSinceAssessment} séances ont été réalisées depuis le dernier bilan. Rejoue les six tests pour mesurer le transfert réel du travail.`
    : weakest
      ? `${weakest.label} constitue actuellement le point de référence le plus bas${strongest ? `, tandis que ${strongest.label} est la compétence la plus solide` : ""}.`
      : "La référence globale est disponible ; les détails par compétence se préciseront avec un nouveau bilan complet.";

  return {
    available: true,
    endedAt: latest.endedAt,
    overallScore,
    accuracyPct,
    coverage: Math.round((familyScores.length / FAMILIES.length) * 100),
    familyScores,
    strongestFamily: strongest?.family || null,
    strongestLabel: strongest?.label || "—",
    weakestFamily: weakest?.family || null,
    weakestLabel: weakest?.label || "—",
    previousOverallScore,
    delta,
    sessionsSinceAssessment,
    due,
    headline,
    body,
  };
}
