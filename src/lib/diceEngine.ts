// @ts-nocheck
// ============================================
// src/lib/diceEngine.ts
// Dice Counter — engine (pure)
// ============================================

export function rollDice(count: number): number[] {
  const n = Math.max(1, Math.min(10, Number(count) || 1));
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.floor(Math.random() * 6) + 1);
  return out;
}

export function sumDice(dice: number[]): number {
  return (Array.isArray(dice) ? dice : []).reduce((a, b) => a + (Number(b) || 0), 0);
}
