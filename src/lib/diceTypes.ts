// @ts-nocheck
// ============================================
// src/lib/diceTypes.ts
// Dice Counter — types (LOCAL)
// ============================================

export type DiceMode = "duel" | "race" | "tenk" | "yams" | "farkle" | "421" | "poker";

export type DiceConfig = {
  mode: DiceMode;

  // Commun
  diceCount: number; // nb de dés lancés
  sets: number; // BOx (sets)

  // Modes "duel" / "race" / "tenk" (course)
  targetScore?: number; // ex: 100 / 200 / 10000

  // Mode "yams"
  yamsRounds?: number; // par défaut 13
  yamsRerolls?: number; // par défaut 2 (donc 3 lancers max)
  yamsUpperBonusThreshold?: number; // par défaut 63
  yamsUpperBonusValue?: number; // par défaut 35
};

export type DicePlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
};

export type DiceRuntimeState = {
  createdAt: number;
  config: DiceConfig;
  players: DicePlayer[];
  scores: Record<string, number>;
  setsWon: Record<string, number>;
  currentTurnId: string;
  lastRoll?: number[];
  finished?: boolean;
  winnerId?: string | null;
  finishedAt?: number;
};
