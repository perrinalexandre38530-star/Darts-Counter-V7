
// ============================================
// src/types/molkkyStats.ts
// ============================================

export type MolkkyPlayerStats = {
  playerId: string;
  throws: number;
  totalPoints: number;
  average: number;
  singles: number;
  multiples: number;
  misses: number;
  exactHits: number;
  over50: number;
  bestStreak: number;
  wins: number;
};

export type MolkkyMatchStats = {
  matchId: string;
  date: string;
  winnerId: string;
  players: MolkkyPlayerStats[];
};
