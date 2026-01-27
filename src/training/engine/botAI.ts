// ============================================
// src/training/engine/botAI.ts
// IA BOTS Training — comportement par niveau (simple et crédible)
// ============================================

export type BotLevel = "easy" | "medium" | "strong" | "pro" | "legend";

export type BotHit = {
  segment: string; // ex: S20, D18, T19, BULL, DBULL
  score: number;   // points visit (0..60 / bull 25/50)
};

const LEVEL: Record<BotLevel, { accuracy: number; power: number; bullBias: number }> = {
  easy:   { accuracy: 0.35, power: 0.35, bullBias: 0.02 },
  medium: { accuracy: 0.55, power: 0.55, bullBias: 0.04 },
  strong: { accuracy: 0.72, power: 0.75, bullBias: 0.06 },
  pro:    { accuracy: 0.86, power: 0.90, bullBias: 0.08 },
  legend: { accuracy: 0.95, power: 1.00, bullBias: 0.12 },
};

const BASES = ["20","19","18","17","16","15","14","13","12","11","10","9","8","7","6","5","4","3","2","1"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function botThrow(level: BotLevel): BotHit {
  const p = LEVEL[level] ?? LEVEL.medium;

  // Bull attempts (rare, more with higher level)
  if (Math.random() < p.bullBias) {
    const db = Math.random() < p.accuracy * 0.5;
    return { segment: db ? "DBULL" : "BULL", score: db ? 50 : 25 };
  }

  const base = pick(BASES);
  const accurate = Math.random() < p.accuracy;

  let mult: "S" | "D" | "T" = "S";

  if (accurate) {
    if (Math.random() < p.power) mult = Math.random() < 0.65 ? "T" : "D";
    else if (Math.random() < 0.25) mult = "D";
  } else {
    // miss tendency: downgrade multiplier or shift to single
    mult = Math.random() < 0.85 ? "S" : "D";
  }

  const n = Number(base);
  const score = mult === "T" ? 3 * n : mult === "D" ? 2 * n : n;
  return { segment: `${mult}${base}`, score };
}
