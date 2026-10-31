import type { ExtendedTrainingRule } from "../catalog/trainingLabExtendedRules";

export type ExtendedOutcomeSnapshot = {
  darts: number;
  hits: number;
  points: number;
  round: number;
  index: number;
  remaining: number;
  best: number;
  bestStreak: number;
  lives: number;
  aux?: any;
};

export type ExtendedOutcome = {
  metricLabel: string;
  metricValue: number;
  targetValue: number | null;
  direction: "higher" | "lower" | "complete";
  passed: boolean;
  performanceScore: number;
};

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

function numericFromLabel(label = "") {
  const match = label.match(/(-?\d+(?:[.,]\d+)?)/);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function metricForRule(rule: ExtendedTrainingRule, s: ExtendedOutcomeSnapshot) {
  switch (rule.kind) {
    case "clock_speed":
    case "deadline":
    case "five_elements":
      return { label: "FLÉCHETTES", value: s.darts };
    case "fish170":
      return { label: "MEILLEUR FINISH", value: s.best || 99 };
    case "hardcore_clock":
      return { label: "SECTEURS", value: Math.max(s.index, s.points) };
    case "card_missions":
      return { label: "CARTES", value: s.round };
    case "atomic":
      return { label: "TOURS", value: s.round };
    case "progressive_checkout":
      if (rule.params?.refuge) return { label: "REFUGE", value: (Number(rule.params?.start) || 121) + s.index };
      return { label: "FINISHES", value: s.points };
    case "survival_score":
      return { label: "TIRS ÉVITÉS", value: s.points };
    case "manual_hits":
      return { label: "TOUCHES", value: s.points };
    case "streak_sector":
      return { label: "MEILLEURE SÉRIE", value: Math.max(s.bestStreak, s.points) };
    case "endurance42":
      return { label: "ÉTAPES", value: s.round };
    case "technique":
      return { label: "SÉANCE", value: 1 };
    default:
      return { label: "POINTS", value: s.points };
  }
}

export function evaluateExtendedOutcome(rule: ExtendedTrainingRule, s: ExtendedOutcomeSnapshot, completed: boolean): ExtendedOutcome {
  const metric = metricForRule(rule, s);
  const label = String(rule.level1Label || "").toLowerCase();
  const parsed = numericFromLabel(label);

  if (rule.kind === "technique") {
    return { metricLabel: metric.label, metricValue: metric.value, targetValue: 1, direction: "complete", passed: completed, performanceScore: completed ? 100 : 0 };
  }

  if (label.includes("terminer")) {
    const target = parsed ?? rule.rounds ?? 1;
    const value = rule.kind === "endurance42" ? s.round : (completed ? target : s.round);
    return { metricLabel: metric.label, metricValue: value, targetValue: target, direction: "complete", passed: value >= target, performanceScore: clamp((value / Math.max(1, target)) * 100) };
  }

  if (label.includes("score positif")) {
    const passed = metric.value > 0;
    return { metricLabel: metric.label, metricValue: metric.value, targetValue: 0, direction: "higher", passed, performanceScore: passed ? clamp(60 + Math.min(40, metric.value)) : 0 };
  }

  if (label.includes("meilleur score possible")) {
    const accuracy = s.darts ? (s.hits / s.darts) * 100 : 0;
    return { metricLabel: metric.label, metricValue: metric.value, targetValue: null, direction: "higher", passed: completed, performanceScore: clamp(Math.max(accuracy, completed ? 55 : 0)) };
  }

  if (label.includes("moins de") && parsed !== null) {
    const target = parsed;
    const passed = metric.value < target && (completed || rule.durationSec != null || rule.kind === "fish170");
    const ratio = metric.value > 0 ? target / metric.value : 0;
    return { metricLabel: metric.label, metricValue: metric.value, targetValue: target, direction: "lower", passed, performanceScore: clamp(ratio * 70 + (completed ? 30 : 0)) };
  }

  if (label.includes("plus de") && parsed !== null) {
    const target = parsed;
    const passed = metric.value > target;
    return { metricLabel: metric.label, metricValue: metric.value, targetValue: target, direction: "higher", passed, performanceScore: clamp((metric.value / Math.max(1, target + 1)) * 100) };
  }

  const accuracy = s.darts ? (s.hits / s.darts) * 100 : 0;
  return { metricLabel: metric.label, metricValue: metric.value, targetValue: null, direction: "complete", passed: completed, performanceScore: clamp(completed ? Math.max(55, accuracy) : accuracy * .5) };
}
