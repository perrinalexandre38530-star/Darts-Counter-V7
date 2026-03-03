// @ts-nocheck
// ============================================
// src/lib/diceYamsEngine.ts
// Yam's / Yahtzee — scoring helpers
// ============================================

export type YamsCategory =
  | "ones" | "twos" | "threes" | "fours" | "fives" | "sixes"
  | "threeKind" | "fourKind" | "fullHouse"
  | "smallStraight" | "largeStraight"
  | "chance" | "yams";

export const YAMS_CATEGORIES: { id: YamsCategory; label: string; group: "upper" | "lower" }[] = [
  { id: "ones", label: "1 (As)", group: "upper" },
  { id: "twos", label: "2", group: "upper" },
  { id: "threes", label: "3", group: "upper" },
  { id: "fours", label: "4", group: "upper" },
  { id: "fives", label: "5", group: "upper" },
  { id: "sixes", label: "6", group: "upper" },

  { id: "threeKind", label: "Brelan", group: "lower" },
  { id: "fourKind", label: "Carré", group: "lower" },
  { id: "fullHouse", label: "Full", group: "lower" },
  { id: "smallStraight", label: "Petite suite", group: "lower" },
  { id: "largeStraight", label: "Grande suite", group: "lower" },
  { id: "chance", label: "Chance", group: "lower" },
  { id: "yams", label: "Yam's", group: "lower" },
];

export function sum(dice: number[]) {
  return (dice || []).reduce((a, b) => a + b, 0);
}

export function counts(dice: number[]) {
  const c: Record<number, number> = {};
  for (const d of dice || []) c[d] = (c[d] || 0) + 1;
  return c;
}

export function hasNOfKind(dice: number[], n: number) {
  const c = counts(dice);
  return Object.values(c).some((v) => v >= n);
}

export function isFullHouse(dice: number[]) {
  const vals = Object.values(counts(dice)).sort((a, b) => a - b);
  return vals.length === 2 && vals[0] === 2 && vals[1] === 3;
}

function straightLen(dice: number[]) {
  const set = Array.from(new Set(dice || [])).sort((a, b) => a - b);
  let best = 1;
  let cur = 1;
  for (let i = 1; i < set.length; i++) {
    if (set[i] === set[i - 1] + 1) cur++;
    else cur = 1;
    best = Math.max(best, cur);
  }
  return best;
}

export function isSmallStraight(dice: number[]) {
  return straightLen(dice) >= 4;
}

export function isLargeStraight(dice: number[]) {
  return straightLen(dice) >= 5;
}

export function scoreCategory(dice: number[], cat: YamsCategory): number {
  const c = counts(dice);
  switch (cat) {
    case "ones": return (c[1] || 0) * 1;
    case "twos": return (c[2] || 0) * 2;
    case "threes": return (c[3] || 0) * 3;
    case "fours": return (c[4] || 0) * 4;
    case "fives": return (c[5] || 0) * 5;
    case "sixes": return (c[6] || 0) * 6;

    case "threeKind": return hasNOfKind(dice, 3) ? sum(dice) : 0;
    case "fourKind": return hasNOfKind(dice, 4) ? sum(dice) : 0;
    case "fullHouse": return isFullHouse(dice) ? 25 : 0;
    case "smallStraight": return isSmallStraight(dice) ? 30 : 0;
    case "largeStraight": return isLargeStraight(dice) ? 40 : 0;
    case "chance": return sum(dice);
    case "yams": return hasNOfKind(dice, 5) ? 50 : 0;
    default: return 0;
  }
}

export function upperSubtotal(scorecard: Partial<Record<YamsCategory, number | null>>) {
  const upper: YamsCategory[] = ["ones","twos","threes","fours","fives","sixes"];
  return upper.reduce((acc, k) => acc + (Number(scorecard?.[k] ?? 0) || 0), 0);
}

export function totalWithBonus(
  scorecard: Partial<Record<YamsCategory, number | null>>,
  threshold = 63,
  bonusValue = 35
) {
  const cats = YAMS_CATEGORIES.map((x) => x.id);
  const base = cats.reduce((acc, k) => acc + (Number(scorecard?.[k] ?? 0) || 0), 0);
  const up = upperSubtotal(scorecard);
  const bonus = up >= threshold ? bonusValue : 0;
  return base + bonus;
}

export function rollDice(count: number, keep: boolean[] = [], prev: number[] = []) {
  const next: number[] = [];
  for (let i = 0; i < count; i++) {
    if (keep[i]) next[i] = prev[i] ?? (Math.floor(Math.random() * 6) + 1);
    else next[i] = Math.floor(Math.random() * 6) + 1;
  }
  return next;
}
