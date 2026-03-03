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

// ============================================
// StatsHub Provider types — used by the unified Stats Center
// (compatible with all sports)
// ============================================

export type StatsPeriod = "J" | "S" | "M" | "A" | "ALL" | "TOUT";

export type GlobalStats = {
  matches: number;
  winRate: number; // 0..1
  avgScore: number;
  bestScore: number;
  favoriteMode?: string;
  avgDurationMs?: number;
  avgTurns?: number;
};

export type PlayerStats = {
  matches: number;
  winRate: number; // 0..1
  avgScore: number;
  bestScore: number;
  avgDurationMs?: number;
  avgTurns?: number;
};

export type RankingEntry = {
  playerId: string;
  playerName: string;
  value: number;
};

export type MatchHistoryEntry = {
  id: string;
  date: number;
  players: string[];
  winner?: string;
  mode?: string;
  status?: "finished" | "in_progress";
};

export type StatsProvider = {
  getGlobalStats: () => GlobalStats;
  getPlayerStats: (playerId: string) => PlayerStats;
  getRankings: (period: StatsPeriod, sortBy: string) => RankingEntry[];
  getHistory: (period: StatsPeriod) => MatchHistoryEntry[];
};
