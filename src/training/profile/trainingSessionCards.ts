/**
 * Single-card Training history, with source-backed detail rows.
 * A completed program owns its steps.  Free practice is aggregated per local day.
 * Legacy programs keep their aggregate and recover step details only when a matching
 * TrainingDetailedSession exists; missing data is NEVER synthesized from the aggregate.
 */
import type { TrainingDetailedSession } from "../stats/trainingStatsHub";
import type { TrainingProgramSessionRecord, TrainingProgramStepStats } from "./trainingPlanTracker";
import { trainingSessionDateKey } from "./trainingDailyQueue";
import { TRAINING_EXERCISE_CATALOG } from "../catalog/trainingExerciseCatalog";

export type TrainingSessionExerciseRow = {
  exerciseId: string;
  title: string;
  performance: number | null;
  accuracy: number | null;
  darts: number | null;
  hits: number | null;
  aggregatedDarts?: number;
  points: number | null;
  goal: number | null;
  completion: number | null;
  success: boolean | null;
};

export type TrainingSessionCard = {
  id: string;
  at: number;
  title: string;
  kind: "program" | "practice";
  count: number;
  darts: number;
  performance: number;
  accuracy: number | null;
  successes: number;
  exercises: TrainingSessionExerciseRow[];
};

const asNumber = (value: unknown): number | null => {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const pct = (value: unknown): number | null => {
  const n = asNumber(value);
  return n == null ? null : Math.max(0, Math.min(100, n));
};
const exerciseName = (id: string, fallback?: string): string =>
  fallback || TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === id)?.title || id;

function fromStoredStep(step: TrainingProgramStepStats): TrainingSessionExerciseRow {
  return {
    exerciseId: step.exerciseId,
    title: exerciseName(step.exerciseId, step.exerciseTitle),
    performance: pct(step.performanceScore),
    accuracy: step.precisionUnavailable ? null : pct(step.accuracyPct),
    darts: step.darts,
    hits: step.aggregatedDarts ? null : step.hits,
    aggregatedDarts: step.aggregatedDarts || 0,
    points: step.points,
    goal: asNumber(step.goal),
    completion: pct(step.completionPct),
    success: step.success,
  };
}

function fromDetailedSession(row: TrainingDetailedSession): TrainingSessionExerciseRow {
  const exerciseId = String(row.metrics?.exerciseId || row.config?.exerciseId || "");
  return {
    exerciseId,
    title: exerciseName(exerciseId, String(row.metrics?.exerciseTitle || "") || undefined),
    performance: pct(row.metrics?.performanceScore ?? row.metrics?.score),
    accuracy: row.metrics?.precisionUnavailable ? null : pct(row.metrics?.accuracyPct ?? row.accuracyPct),
    darts: asNumber(row.darts),
    hits: row.metrics?.aggregatedDarts ? null : asNumber(row.hits),
    aggregatedDarts: Math.max(0, Number(row.metrics?.aggregatedDarts || 0)),
    points: asNumber(row.points),
    goal: asNumber(row.metrics?.goal),
    completion: pct(row.metrics?.completionPct),
    success: row.success,
  };
}

function missingStep(exerciseId: string): TrainingSessionExerciseRow {
  return {
    exerciseId, title: exerciseName(exerciseId), performance: null, accuracy: null,
    darts: null, hits: null, points: null, goal: null, completion: null, success: null,
  };
}

/** Correlate pre-V268 program steps WITHOUT joining another program or another player. */
export function buildTrainingSessionCards(
  programSessions: TrainingProgramSessionRecord[],
  sessions: TrainingDetailedSession[],
): TrainingSessionCard[] {
  const usedLegacyIds = new Set<string>();
  const sortedDetails = [...sessions].sort((a, b) => b.endedAt - a.endedAt);
  const programCards: TrainingSessionCard[] = [...programSessions]
    .sort((a, b) => b.endedAt - a.endedAt)
    .map((program) => {
      // Once persisted, the immutable step snapshot is authoritative, even when
      // older detailed sessions have been pruned by the Training stats store.
      const saved = Array.isArray(program.stepResults) ? program.stepResults : [];
      const steps = program.exerciseIds.map((exerciseId, index) => {
        const snapshot = saved[index];
        if (snapshot && snapshot.exerciseId === exerciseId) return fromStoredStep(snapshot);
        // Older backups: only match records explicitly belonging to this program
        // AND this step. Consumed IDs prevent duplicate attribution on same-day reruns.
        const match = sortedDetails.find((detail) => {
          if (usedLegacyIds.has(detail.id) || detail.modeId !== "training_lab") return false;
          if (detail.participantId !== program.participantId) return false;
          if (detail.endedAt > program.endedAt + 2 * 60_000 || detail.endedAt < program.endedAt - 14 * 86_400_000) return false;
          const programId = String(detail.metrics?.programId || detail.config?.programId || "");
          const step = asNumber(detail.metrics?.programStep ?? detail.config?.programStep);
          const detailId = String(detail.metrics?.exerciseId || detail.config?.exerciseId || "");
          return !!programId && programId === program.programId && step === index + 1 && detailId === exerciseId;
        });
        if (!match) return missingStep(exerciseId);
        usedLegacyIds.add(match.id);
        return fromDetailedSession(match);
      });
      return {
        id: program.id, at: program.endedAt, title: program.programTitle, kind: "program" as const,
        count: program.steps, darts: program.darts, performance: program.performanceScore,
        accuracy: saved.length && saved.every((step) => step.precisionUnavailable) ? null : program.accuracyPct, successes: program.successes, exercises: steps,
      };
    });

  const dailyPractice = new Map<string, TrainingDetailedSession[]>();
  for (const row of sortedDetails) {
    if (row.modeId !== "training_lab") continue;
    // Program steps belong exclusively to the single complete program card.
    if (row.config?.sessionKind === "program" || row.config?.programId || row.config?.programExerciseIds || row.metrics?.programId) continue;
    const key = `${row.participantId || "account"}:${trainingSessionDateKey(row.endedAt)}`;
    if (!dailyPractice.has(key)) dailyPractice.set(key, []);
    dailyPractice.get(key)!.push(row);
  }
  const practiceCards: TrainingSessionCard[] = [...dailyPractice].map(([key, rows]) => {
    const orderedRows = rows.slice().sort((a, b) => a.endedAt - b.endedAt);
    const darts = rows.reduce((sum, row) => sum + row.darts, 0);
    const performances = rows.map((row) => pct(row.metrics?.performanceScore ?? row.metrics?.score)).filter((v): v is number => v !== null);
    return {
      id: `practice:${key}`,
      at: Math.max(...rows.map((row) => row.endedAt)),
      title: "Entraînement libre",
      kind: "practice" as const,
      count: rows.length,
      darts,
      performance: performances.length ? performances.reduce((sum, value) => sum + value, 0) / performances.length : 0,
      accuracy: (() => {
        const preciseDarts = rows.reduce((sum, row) => sum + Math.max(0, row.darts - Math.max(0, Number(row.metrics?.aggregatedDarts || 0))), 0);
        return preciseDarts ? rows.reduce((sum, row) => sum + row.hits, 0) / preciseDarts * 100 : null;
      })(),
      successes: rows.filter((row) => row.success).length,
      exercises: orderedRows.map(fromDetailedSession),
    };
  });
  // Every completed Training Challenge is one exercise session, never a competitive match.
  const challengeCards: TrainingSessionCard[] = sortedDetails
    .filter((row) => row.modeId === "training_challenges" && row.config?.trainingOrigin === "training_lab")
    .map((row) => {
      const exercise = fromDetailedSession(row);
      return {
        id: row.id, at: row.endedAt,
        title: `Challenge · ${exercise.title || "Exercice"}`,
        kind: "practice" as const, count: 1, darts: row.darts,
        performance: pct(row.metrics?.trainingPerformancePct ?? row.metrics?.performanceScore) ?? 0,
        accuracy: pct(row.accuracyPct), successes: row.success ? 1 : 0,
        exercises: [exercise],
      };
    });
  return [...programCards, ...practiceCards, ...challengeCards].sort((a, b) => b.at - a.at).slice(0, 80);
}
