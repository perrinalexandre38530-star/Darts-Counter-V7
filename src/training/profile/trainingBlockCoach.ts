import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingCycleCoach } from "./trainingCycleCoach";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

const CYCLE_SIZE = 4;
const BLOCK_CYCLES = 3;
const BLOCK_SIZE = CYCLE_SIZE * BLOCK_CYCLES;

export type TrainingCycleSnapshot = {
  cycleNumber: number;
  sessions: number;
  average: number;
  accuracy: number;
  consistency: number;
  families: TrainingExerciseFamily[];
  dominantFamily: TrainingExerciseFamily | null;
  dominantLabel: string;
  bestScore: number;
};

export type TrainingBlockCoach = {
  blockNumber: number;
  blockSize: number;
  completedSessions: number;
  remainingSessions: number;
  completionPct: number;
  completedCycles: number;
  currentCycleIndex: number;
  currentAverage: number;
  targetAverage: number;
  previousBlockAverage: number;
  deltaVsPreviousBlock: number;
  consistency: number;
  familyCoverage: number;
  familyCoverageTarget: number;
  bestSession: TrainingProgramSessionRecord | null;
  cycles: TrainingCycleSnapshot[];
  headline: string;
  summary: string;
  milestone: string;
  recommendedFamily: TrainingExerciseFamily;
  recommendedLabel: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function consistency(rows: TrainingProgramSessionRecord[]) {
  if (!rows.length) return 0;
  const mean = avg(rows.map((row) => row.performanceScore));
  const deviation = avg(rows.map((row) => Math.abs(row.performanceScore - mean)));
  return clamp(100 - deviation * 2.2, 0, 100);
}

function dominantFamily(rows: TrainingProgramSessionRecord[]): TrainingExerciseFamily | null {
  const counts = new Map<TrainingExerciseFamily, number>();
  for (const row of rows) {
    for (const family of row.families) counts.set(family, (counts.get(family) || 0) + 1);
  }
  let winner: TrainingExerciseFamily | null = null;
  let winnerCount = -1;
  for (const [family, count] of counts) {
    if (count > winnerCount) {
      winner = family;
      winnerCount = count;
    }
  }
  return winner;
}

function makeCycleSnapshot(rows: TrainingProgramSessionRecord[], absoluteCycleIndex: number): TrainingCycleSnapshot {
  const family = dominantFamily(rows);
  return {
    cycleNumber: absoluteCycleIndex + 1,
    sessions: rows.length,
    average: avg(rows.map((row) => row.performanceScore)),
    accuracy: avg(rows.map((row) => row.accuracyPct)),
    consistency: consistency(rows),
    families: Array.from(new Set(rows.flatMap((row) => row.families))),
    dominantFamily: family,
    dominantLabel: family ? TRAINING_FAMILY_META[family].label : "—",
    bestScore: rows.reduce((best, row) => Math.max(best, row.performanceScore), 0),
  };
}

export function buildTrainingBlockCoach(
  records: TrainingProgramSessionRecord[],
  cycleCoach: TrainingCycleCoach,
): TrainingBlockCoach {
  const chronological = [...records].sort((a, b) => a.endedAt - b.endedAt);
  const completedBlocks = Math.floor(chronological.length / BLOCK_SIZE);
  const currentCount = chronological.length % BLOCK_SIZE;
  const currentBlock = currentCount ? chronological.slice(-currentCount) : [];
  const previousBlock = chronological.length >= BLOCK_SIZE
    ? chronological.slice(-(currentCount + BLOCK_SIZE), currentCount ? -currentCount : undefined)
    : [];

  const absoluteCycleBase = completedBlocks * BLOCK_CYCLES;
  const cycles: TrainingCycleSnapshot[] = [];
  for (let offset = 0; offset < currentBlock.length; offset += CYCLE_SIZE) {
    const rows = currentBlock.slice(offset, offset + CYCLE_SIZE);
    cycles.push(makeCycleSnapshot(rows, absoluteCycleBase + Math.floor(offset / CYCLE_SIZE)));
  }

  const currentAverage = avg(currentBlock.map((row) => row.performanceScore));
  const previousBlockAverage = avg(previousBlock.map((row) => row.performanceScore));
  const baseline = previousBlockAverage || avg(chronological.slice(-24, -currentCount || undefined).map((row) => row.performanceScore)) || currentAverage || 60;
  const targetAverage = clamp(Math.round(baseline + (baseline < 70 ? 5 : baseline < 82 ? 3 : 2)), 65, 94);
  const familyCoverage = new Set(currentBlock.flatMap((row) => row.families)).size;
  const familyCoverageTarget = 5;
  const completedCycles = Math.floor(currentCount / CYCLE_SIZE);
  const currentCycleIndex = Math.min(BLOCK_CYCLES, completedCycles + 1);
  const remainingSessions = BLOCK_SIZE - currentCount;
  const bestSession = currentBlock.reduce<TrainingProgramSessionRecord | null>((best, row) => !best || row.performanceScore > best.performanceScore ? row : best, null);
  const deltaVsPreviousBlock = previousBlock.length ? currentAverage - previousBlockAverage : 0;
  const blockConsistency = consistency(currentBlock);

  let headline = `Bloc ${completedBlocks + 1} prêt à démarrer`;
  if (currentCount) {
    if (currentCount >= BLOCK_SIZE) headline = `Bloc ${completedBlocks + 1} terminé`;
    else if (currentAverage >= targetAverage - 2 && familyCoverage >= Math.min(familyCoverageTarget, 3 + completedCycles)) headline = `Bloc ${completedBlocks + 1} dans le bon rythme`;
    else headline = `Bloc ${completedBlocks + 1} en construction`;
  }

  let milestone: string;
  if (currentCount < CYCLE_SIZE) milestone = `Terminer le cycle ${absoluteCycleBase + 1} (${currentCount}/${CYCLE_SIZE} séances).`;
  else if (familyCoverage < familyCoverageTarget) milestone = `Élargir le travail : ${familyCoverage}/${familyCoverageTarget} familles couvertes dans le bloc.`;
  else if (currentAverage < targetAverage) milestone = `Faire monter la moyenne du bloc de ${Math.round(currentAverage)} vers ${targetAverage}/100.`;
  else if (remainingSessions > 0) milestone = `Consolider le niveau sur les ${remainingSessions} séance${remainingSessions > 1 ? "s" : ""} restante${remainingSessions > 1 ? "s" : ""}.`;
  else milestone = "Bloc terminé : le prochain bloc repartira de cette nouvelle référence.";

  const summary = currentCount
    ? `${currentCount}/${BLOCK_SIZE} séances • ${completedCycles}/${BLOCK_CYCLES} cycles terminés • moyenne ${Math.round(currentAverage)}/100 • régularité ${Math.round(blockConsistency)}/100 • ${familyCoverage}/6 familles travaillées.`
    : `Objectif : 3 cycles de 4 séances, moyenne ${targetAverage}/100 et au moins ${familyCoverageTarget} familles travaillées.`;

  return {
    blockNumber: completedBlocks + 1,
    blockSize: BLOCK_SIZE,
    completedSessions: currentCount,
    remainingSessions,
    completionPct: (currentCount / BLOCK_SIZE) * 100,
    completedCycles,
    currentCycleIndex,
    currentAverage,
    targetAverage,
    previousBlockAverage,
    deltaVsPreviousBlock,
    consistency: blockConsistency,
    familyCoverage,
    familyCoverageTarget,
    bestSession,
    cycles,
    headline,
    summary,
    milestone,
    recommendedFamily: cycleCoach.priority.family,
    recommendedLabel: cycleCoach.priority.label,
  };
}

export function buildTrainingCycleHistory(records: TrainingProgramSessionRecord[], maxCycles = 6): TrainingCycleSnapshot[] {
  const chronological = [...records].sort((a, b) => a.endedAt - b.endedAt);
  const snapshots: TrainingCycleSnapshot[] = [];
  for (let offset = 0; offset + CYCLE_SIZE <= chronological.length; offset += CYCLE_SIZE) {
    snapshots.push(makeCycleSnapshot(chronological.slice(offset, offset + CYCLE_SIZE), Math.floor(offset / CYCLE_SIZE)));
  }
  return snapshots.reverse().slice(0, Math.max(1, maxCycles));
}
