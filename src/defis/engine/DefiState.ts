// ============================================
// src/defis/engine/DefiState.ts
// État Défi générique (hors Territories)
// - `data` est propre à chaque mode
// - `events` permet un replay/undo ultérieur sans coupler la UI au mode
// - `currentThrow` contient la volée en cours (0..dartsPerTurn fléchettes)
// ============================================

import type { DefiID, DefiPlayer, PlayerID, DefiDart, DefiThrow } from "./DefiTypes";

export type DefiEvent =
  | {
      t: "THROW";
      ts: number;
      playerId: PlayerID;
      dart: DefiDart;
    }
  | {
      t: "END_TURN";
      ts: number;
      playerId: PlayerID;
      throw: DefiThrow;
      reason?: "validate" | "pass" | "auto";
    }
  | {
      t: "PASS";
      ts: number;
      playerId: PlayerID;
      reason?: string;
    }
  | {
      t: "CUSTOM";
      ts: number;
      name: string;
      payload?: any;
    };

export type DefiTurn = {
  /** Index dans `players` du joueur courant */
  playerIndex: number;
  /** Round / manche (démarre à 1) */
  round: number;
};

/** État générique d'un défi */
export type DefiState<TData = any> = {
  id: DefiID;
  modeId: string;

  startedAt: number;
  finishedAt?: number;

  players: DefiPlayer[];
  turn: DefiTurn;

  /** Volée en cours (0..dartsPerTurn) */
  currentThrow: DefiThrow;

  /** Données spécifiques au mode (score, vies, cibles, etc.) */
  data: TData;

  /** Historique événementiel (utile pour undo / replay / stats) */
  events: DefiEvent[];

  /** Flags rapides */
  status: "running" | "finished";
};
