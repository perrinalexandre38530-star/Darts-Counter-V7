// @ts-nocheck
// ============================================
// src/lib/diceStore.ts
// Dice Counter — store localStorage (offline-first)
// ============================================

import type { DiceRuntimeState } from "./diceTypes";

const LS_KEY = "dc_dice_state_v1";

export function loadDiceState(): DiceRuntimeState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw);
    return st && typeof st === "object" ? st : null;
  } catch {
    return null;
  }
}

export function saveDiceState(st: DiceRuntimeState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  } catch {}
}

export function clearDiceState() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}
/**
 * Matches Dice (History) — utilisé par les pages Stats Dice.
 * On filtre sur kind/sport === "dicegame" (ce que pushDiceHistory écrit).
 */
export async function loadDiceMatches() {
  try {
    const mod: any = await import("./history");
    const History = mod?.History;
    if (!History?.list) return [];
    const rows = await History.list();
    return (rows || []).filter((r: any) => r?.kind === "dicegame" || r?.sport === "dicegame");
  } catch {
    return [];
  }
}
