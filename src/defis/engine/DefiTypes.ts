// ============================================
// src/defis/engine/DefiTypes.ts
// Socle Défis (hors Territories) — types transverses
// - Indépendant de la carte / conquête
// - Les modes implémentent leur logique dans `data`
// ============================================

export type DefiID = string;
export type PlayerID = string;

/** Joueur participant à un Défi */
export type DefiPlayer = {
  id: PlayerID;
  name: string;
  /** Optionnel: couleur (ex: hex, rgb, css var) côté UI */
  color?: string;
  /** Optionnel: avatar (dataURL / url) côté UI */
  avatarUrl?: string;
};

/** Un segment de fléchette (compatible ScoreInputHub) */
export type DefiDart = {
  v: number;           // 0..20 ou 25/50 selon tes conventions
  mult: 1 | 2 | 3;     // simple / double / triple
  label?: string;
};

export type DefiThrow = DefiDart[];

/** Affichage standardisé que la UI peut consommer sans connaître le mode */
export type DefiDisplay = {
  /** Titre court (ex: COUNT-UP, HALF-IT) */
  title: string;
  /** Sous-titre optionnel (ex: "Objectif 300") */
  subtitle?: string;

  /** Indicateur de tour */
  roundLabel?: string; // ex: "Round 3"
  turnLabel?: string;  // ex: "À toi : Alex"

  /** Scoreboard générique (colonnes libres) */
  scoreboard?: Array<{
    playerId: PlayerID;
    primary: string;           // ex: "120" ou "Vies: 2"
    secondary?: string;        // ex: "+60" / "BUST"
    tags?: string[];           // ex: ["leader"]
  }>;

  /** Infos libres (cartes / badges) */
  infos?: Array<{ label: string; value?: string }>;
};

export type RankingEntry = {
  playerId: PlayerID;
  rank: number;        // 1..n
  value?: number;      // score / points (si applicable)
  label?: string;      // ex: "Vainqueur", "Éliminé", etc.
};
