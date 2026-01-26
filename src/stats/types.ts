// ============================================
// Stats types — CONTRAT STABLE (v1)
// Ne PAS casser sans migration
// ============================================

export type SportType = "darts";
export type GameMode =
  | "x01"
  | "cricket"
  | "killer"
  | "shanghai"
  | "training"
  | "fun";

export type StatsScope =
  | "career"
  | "training"
  | "season";

export type StatsSnapshot = {
  userId: string;
  sport: SportType;
  mode: GameMode;
  scope: StatsScope;

  gamesPlayed: number;
  gamesWon: number;

  dartsThrown: number;
  pointsScored: number;

  avg3Darts: number;
  bestCheckout: number | null;
  checkoutRate: number;

  hits180: number;
  hits140: number;

  updatedAt: number;
};
