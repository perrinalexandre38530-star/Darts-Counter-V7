// ============================================
// src/lib/simpleRounds/types.ts
// SimpleRounds — types partagés pour variantes "round-based" simples
// Objectif: éviter le copier-coller entre Count-Up / SuperBull / HappyMille / Enculette / 170.
// ============================================

export type BotLevel = "easy" | "normal" | "hard";

export type CommonConfig = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  /** 0 => pas d'objectif (fin aux rounds) */
  objective: number;
};

export type VariantId = "count_up" | "super_bull" | "happy_mille" | "enculette" | "game_170";

export type VariantSpec = {
  id: VariantId;
  title: string;
  tickerSrc: string;
  infoTitle: string;
  infoText: string;

  // UI config
  playersOptions: number[];
  roundsOptions: number[];
  objectiveOptions: number[];

  defaults: CommonConfig;

  // scoring
  /**
   * Calcule la variation de score après validation d'une volée.
   * - mode "sum": on ajoute delta au score du joueur
   * - mode "success": on ajoute delta (0/1 typiquement) au compteur
   */
  applyVisit: (args: {
    visit: number;
    currentScore: number;
    objective: number;
    roundIndex: number; // 0..rounds-1
  }) => { delta: number; forceWin?: boolean };
  /**
   * Détermine le vainqueur final quand rounds terminés (si pas de winner forcé).
   * Retourne l'index du joueur gagnant.
   */
  computeWinnerOnEnd: (scores: number[]) => number;
};
