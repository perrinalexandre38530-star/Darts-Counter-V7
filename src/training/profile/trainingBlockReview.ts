import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

const BLOCK_SIZE = 12;
const FAMILIES = Object.keys(TRAINING_FAMILY_META) as TrainingExerciseFamily[];

export type TrainingBlockOutcome = "breakthrough" | "progress" | "solid" | "rebuild" | "foundation";

export type TrainingBlockReview = {
  blockNumber: number;
  startAt: number;
  endAt: number;
  sessions: number;
  average: number;
  accuracy: number;
  consistency: number;
  successPct: number;
  bestScore: number;
  bestSession: TrainingProgramSessionRecord | null;
  familyCoverage: number;
  dominantFamily: TrainingExerciseFamily | null;
  dominantLabel: string;
  underexposedFamilies: TrainingExerciseFamily[];
  deltaVsPrevious: number;
  outcome: TrainingBlockOutcome;
  outcomeLabel: string;
  headline: string;
  summary: string;
  nextPriorityFamily: TrainingExerciseFamily;
  nextPriorityLabel: string;
  nextTargetAverage: number;
};

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function consistency(rows: TrainingProgramSessionRecord[]) {
  if (!rows.length) return 0;
  const mean = avg(rows.map((row) => row.performanceScore));
  const deviation = avg(rows.map((row) => Math.abs(row.performanceScore - mean)));
  return clamp(100 - deviation * 2.2, 0, 100);
}

function familyCounts(rows: TrainingProgramSessionRecord[]) {
  const counts = new Map<TrainingExerciseFamily, number>();
  for (const family of FAMILIES) counts.set(family, 0);
  for (const row of rows) {
    for (const family of new Set(row.families)) {
      if (counts.has(family)) counts.set(family, (counts.get(family) || 0) + 1);
    }
  }
  return counts;
}

function dominantFamily(rows: TrainingProgramSessionRecord[]) {
  const counts = familyCounts(rows);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function buildReview(
  rows: TrainingProgramSessionRecord[],
  blockIndex: number,
  previousRows: TrainingProgramSessionRecord[],
  fallbackFamily: TrainingExerciseFamily,
): TrainingBlockReview {
  const average = avg(rows.map((row) => row.performanceScore));
  const previousAverage = avg(previousRows.map((row) => row.performanceScore));
  const deltaVsPrevious = previousRows.length ? average - previousAverage : 0;
  const accuracy = avg(rows.map((row) => row.accuracyPct));
  const blockConsistency = consistency(rows);
  const successes = rows.reduce((sum, row) => sum + row.successes, 0);
  const steps = rows.reduce((sum, row) => sum + row.steps, 0);
  const successPct = steps ? (successes / steps) * 100 : 0;
  const counts = familyCounts(rows);
  const familyCoverage = [...counts.values()].filter((count) => count > 0).length;
  const dominant = dominantFamily(rows);
  const underexposedFamilies = [...counts.entries()]
    .filter(([, count]) => count <= 1)
    .sort((a, b) => a[1] - b[1])
    .map(([family]) => family);
  const bestSession = rows.reduce<TrainingProgramSessionRecord | null>((best, row) => !best || row.performanceScore > best.performanceScore ? row : best, null);

  let outcome: TrainingBlockOutcome = "foundation";
  if (previousRows.length) {
    if (deltaVsPrevious >= 6 && average >= 72) outcome = "breakthrough";
    else if (deltaVsPrevious >= 2.5) outcome = "progress";
    else if (deltaVsPrevious <= -4 || blockConsistency < 55) outcome = "rebuild";
    else outcome = "solid";
  } else if (average >= 75 && blockConsistency >= 65) outcome = "solid";

  const outcomeLabel = outcome === "breakthrough" ? "CAP FRANCHI"
    : outcome === "progress" ? "PROGRESSION"
      : outcome === "solid" ? "BLOC SOLIDE"
        : outcome === "rebuild" ? "À RECONSTRUIRE"
          : "RÉFÉRENCE POSÉE";

  const nextPriorityFamily = underexposedFamilies[0] || fallbackFamily;
  const nextPriorityLabel = TRAINING_FAMILY_META[nextPriorityFamily].label;
  const nextTargetAverage = clamp(Math.round(average + (average < 70 ? 5 : average < 82 ? 3 : 2)), 65, 94);
  const blockNumber = blockIndex + 1;

  const headline = outcome === "breakthrough" ? `Bloc ${blockNumber} : cap franchi`
    : outcome === "progress" ? `Bloc ${blockNumber} : progression confirmée`
      : outcome === "solid" ? `Bloc ${blockNumber} : niveau consolidé`
        : outcome === "rebuild" ? `Bloc ${blockNumber} : base à reconstruire`
          : `Bloc ${blockNumber} : première référence établie`;

  const summary = `${Math.round(average)}/100 de moyenne • ${Math.round(accuracy)}% de précision • régularité ${Math.round(blockConsistency)}/100 • ${familyCoverage}/6 familles couvertes${previousRows.length ? ` • ${deltaVsPrevious >= 0 ? "+" : ""}${Math.round(deltaVsPrevious)} pts vs bloc précédent` : ""}.`;

  return {
    blockNumber,
    startAt: rows[0]?.endedAt || 0,
    endAt: rows[rows.length - 1]?.endedAt || 0,
    sessions: rows.length,
    average,
    accuracy,
    consistency: blockConsistency,
    successPct,
    bestScore: bestSession?.performanceScore || 0,
    bestSession,
    familyCoverage,
    dominantFamily: dominant,
    dominantLabel: dominant ? TRAINING_FAMILY_META[dominant].label : "—",
    underexposedFamilies,
    deltaVsPrevious,
    outcome,
    outcomeLabel,
    headline,
    summary,
    nextPriorityFamily,
    nextPriorityLabel,
    nextTargetAverage,
  };
}

export function buildTrainingBlockReviews(
  records: TrainingProgramSessionRecord[],
  fallbackFamily: TrainingExerciseFamily,
  maxBlocks = 4,
): TrainingBlockReview[] {
  const chronological = [...records].sort((a, b) => a.endedAt - b.endedAt);
  const completedBlocks = Math.floor(chronological.length / BLOCK_SIZE);
  const reviews: TrainingBlockReview[] = [];
  for (let blockIndex = 0; blockIndex < completedBlocks; blockIndex += 1) {
    const start = blockIndex * BLOCK_SIZE;
    const rows = chronological.slice(start, start + BLOCK_SIZE);
    const previousRows = blockIndex > 0 ? chronological.slice(start - BLOCK_SIZE, start) : [];
    reviews.push(buildReview(rows, blockIndex, previousRows, fallbackFamily));
  }
  return reviews.reverse().slice(0, Math.max(1, maxBlocks));
}

export function buildTrainingBlockHandoff(
  records: TrainingProgramSessionRecord[],
  fallbackFamily: TrainingExerciseFamily,
) {
  const reviews = buildTrainingBlockReviews(records, fallbackFamily, 1);
  const latest = reviews[0] || null;
  const currentBlockSessions = records.length % BLOCK_SIZE;
  const justStartedNewBlock = !!latest && currentBlockSessions === 0;
  return {
    latest,
    currentBlockSessions,
    justStartedNewBlock,
    nextBlockNumber: latest ? latest.blockNumber + 1 : 1,
    recommendedFamily: latest?.nextPriorityFamily || fallbackFamily,
    recommendedLabel: latest?.nextPriorityLabel || TRAINING_FAMILY_META[fallbackFamily].label,
    targetAverage: latest?.nextTargetAverage || 65,
  };
}
