import type { TrainingExerciseDefinition } from "../catalog/trainingExerciseCatalog";
import { EXTENDED_TRAINING_RULES } from "../catalog/trainingLabExtendedRules";

export type TrainingExerciseProgression = {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  mastered: boolean;
  nextObjective: string;
  currentObjective: string;
  bestPerformance: number;
};

const ruleById = new Map(EXTENDED_TRAINING_RULES.map((rule) => [rule.id, rule] as const));

function parseNumber(label = "") {
  const match = String(label).match(/(-?\d+(?:[.,]\d+)?)/);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function roundTarget(value: number, direction: "higher" | "lower") {
  if (direction === "lower") return Math.max(1, Math.floor(value));
  return Math.max(1, Math.ceil(value));
}

function extendedTargetLadder(label: string) {
  const raw = String(label || "").trim();
  const lower = raw.toLowerCase();
  const base = parseNumber(raw);
  if (base == null) return null;

  const direction: "higher" | "lower" = lower.includes("moins de") ? "lower" : "higher";
  const factors = direction === "lower" ? [1, 0.9, 0.8, 0.7, 0.6] : [1, 1.3, 1.6, 2, 2.5];
  const values = factors.map((factor) => roundTarget(base * factor, direction));
  return { direction, values, noun: raw.replace(/^(plus|moins)\s+de\s+/i, "").replace(/^-?\d+(?:[.,]\d+)?\s*/i, "").trim() };
}

function metricValue(row: any) {
  const value = Number(row?.metrics?.objectiveValue);
  return Number.isFinite(value) ? value : null;
}

function performance(row: any) {
  const value = Number(row?.metrics?.performanceScore ?? row?.metrics?.score ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function formatObjective(direction: "higher" | "lower", target: number, noun: string) {
  const suffix = noun ? ` ${noun}` : "";
  return `${direction === "lower" ? "Moins de" : "Plus de"} ${target}${suffix}`.trim();
}

export function buildTrainingExerciseProgression(exercise: TrainingExerciseDefinition, rows: any[]): TrainingExerciseProgression {
  const sessions = (rows || []).filter((row) => String(row?.metrics?.exerciseId || row?.config?.exerciseId || "") === exercise.id);
  const bestPerformance = sessions.reduce((best, row) => Math.max(best, performance(row)), 0);
  const rule = ruleById.get(exercise.id);

  if (rule?.level1Label) {
    const label = String(rule.level1Label);
    const normalized = label.toLowerCase();
    if (normalized.includes("terminer")) {
      const completed = sessions.some((row) => !!row?.success || performance(row) >= 100);
      return {
        level: completed ? 5 : 0,
        mastered: completed,
        currentObjective: label,
        nextObjective: completed ? "Maîtrise validée" : label,
        bestPerformance,
      };
    }

    const ladder = extendedTargetLadder(label);
    if (ladder) {
      const metrics = sessions.map(metricValue).filter((value): value is number => value != null);
      let level: 0 | 1 | 2 | 3 | 4 | 5 = 0;
      ladder.values.forEach((target, index) => {
        const passed = metrics.some((value) => ladder.direction === "lower" ? value < target : value > target);
        if (passed) level = Math.max(level, index + 1) as 1 | 2 | 3 | 4 | 5;
      });
      const currentTarget = ladder.values[Math.max(0, level - 1)] ?? ladder.values[0];
      const nextTarget = ladder.values[Math.min(4, level)] ?? ladder.values[4];
      return {
        level,
        mastered: level >= 5,
        currentObjective: level === 0 ? formatObjective(ladder.direction, ladder.values[0], ladder.noun) : formatObjective(ladder.direction, currentTarget, ladder.noun),
        nextObjective: level >= 5 ? "Maîtrise validée" : formatObjective(ladder.direction, nextTarget, ladder.noun),
        bestPerformance,
      };
    }
  }

  const thresholds = [55, 65, 75, 85, 95];
  let level: 0 | 1 | 2 | 3 | 4 | 5 = 0;
  thresholds.forEach((threshold, index) => {
    if (bestPerformance >= threshold) level = (index + 1) as 1 | 2 | 3 | 4 | 5;
  });
  const next = thresholds[Math.min(level, 4)];
  return {
    level,
    mastered: level >= 5,
    currentObjective: level === 0 ? `Atteindre ${thresholds[0]}/100 de performance` : `Niveau ${level} validé`,
    nextObjective: level >= 5 ? "Maîtrise validée" : `Atteindre ${next}/100 de performance`,
    bestPerformance,
  };
}
