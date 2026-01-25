// ============================================
// src/defis/engine/DefiEngine.ts
// Engine Défis générique (hors Territories)
// - Injecte un DefiMode (règles) + gère le cycle de vie (init / tour / fin)
// - Ne contient AUCUNE logique de carte / départements
// - Gère une volée standard (par défaut 3 fléchettes) via `currentThrow`
// ============================================

import type { DefiPlayer, DefiDart, DefiDisplay, RankingEntry, DefiThrow } from "./DefiTypes";
import type { DefiState, DefiEvent } from "./DefiState";
import type { DefiResult } from "./DefiResult";

export type DefiModeInitArgs<TConfig = any> = {
  players: DefiPlayer[];
  config?: TConfig;
};

export type DefiModeContext<TConfig = any> = {
  players: DefiPlayer[];
  config?: TConfig;
};

export interface DefiMode<TConfig = any, TData = any> {
  id: string;     // ex: "count_up"
  label: string;  // ex: "COUNT-UP"

  /** Nombre de fléchettes par volée (par défaut: 3) */
  dartsPerTurn?: number;

  /** Initialise les données internes du mode */
  init(args: DefiModeInitArgs<TConfig>): TData;

  /** Applique une fléchette au state interne */
  onDart(data: TData, playerId: string, dart: DefiDart, ctx: DefiModeContext<TConfig>): TData;

  /**
   * Optionnel: hook appelé à la fin d'une volée (validate/auto/pass).
   * Utile pour modes type HALF-IT (halve si aucun hit).
   */
  onTurnEnd?(data: TData, playerId: string, throwDarts: DefiThrow, ctx: DefiModeContext<TConfig>, reason: "validate" | "pass" | "auto"): TData;

  /** Optionnel: gérer un "pass" / volée vide */
  onPass?(data: TData, playerId: string, ctx: DefiModeContext<TConfig>, reason?: string): TData;

  /** Indique si le défi est terminé */
  isFinished(data: TData, ctx: DefiModeContext<TConfig>): boolean;

  /** Classement (si applicable) */
  getRanking(data: TData, ctx: DefiModeContext<TConfig>): RankingEntry[];

  /** Affichage synthétique */
  getDisplay(data: TData, ctx: DefiModeContext<TConfig>, turnPlayerId: string, state: DefiState<TData>): DefiDisplay;
}

export type DefiEngineOptions = {
  /** Générateur d'id (sinon fallback time+rand) */
  makeId?: () => string;
};

export class DefiEngine<TConfig = any, TData = any> {
  private mode: DefiMode<TConfig, TData>;
  private config?: TConfig;
  private opts: DefiEngineOptions;

  constructor(mode: DefiMode<TConfig, TData>, config?: TConfig, opts: DefiEngineOptions = {}) {
    this.mode = mode;
    this.config = config;
    this.opts = opts;
  }

  init(players: DefiPlayer[]): DefiState<TData> {
    const id = this.opts.makeId ? this.opts.makeId() : `defi_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const startedAt = Date.now();
    const data = this.mode.init({ players, config: this.config });

    return {
      id,
      modeId: this.mode.id,
      startedAt,
      players,
      turn: { playerIndex: 0, round: 1 },
      currentThrow: [],
      data,
      events: [],
      status: "running",
    };
  }

  getDartsPerTurn(): number {
    return Math.max(1, Math.min(9, Number(this.mode.dartsPerTurn ?? 3)));
  }

  /** Joueur courant */
  getTurnPlayer(state: DefiState<TData>): DefiPlayer {
    return state.players[Math.max(0, Math.min(state.players.length - 1, state.turn.playerIndex))];
  }

  /** Applique une fléchette. Si la volée atteint `dartsPerTurn`, on termine automatiquement la volée. */
  applyDart(state: DefiState<TData>, dart: DefiDart): DefiState<TData> {
    if (state.status !== "running") return state;

    const turnPlayer = this.getTurnPlayer(state);
    const ctx = { players: state.players, config: this.config } as DefiModeContext<TConfig>;

    const nextData = this.mode.onDart(state.data, turnPlayer.id, dart, ctx);
    const nextThrow = [...state.currentThrow, dart];

    const ev: DefiEvent = { t: "THROW", ts: Date.now(), playerId: turnPlayer.id, dart };

    let nextState: DefiState<TData> = {
      ...state,
      data: nextData,
      currentThrow: nextThrow,
      events: [...state.events, ev],
    };

    // Auto-fin de volée si 3 fléchettes (ou config du mode)
    if (nextThrow.length >= this.getDartsPerTurn()) {
      nextState = this.endTurn(nextState, "auto");
    }

    return this.finalizeIfFinished(nextState);
  }

  /** Valide la volée en cours (même si < dartsPerTurn) */
  validateTurn(state: DefiState<TData>): DefiState<TData> {
    if (state.status !== "running") return state;
    return this.finalizeIfFinished(this.endTurn(state, "validate"));
  }

  /** Passe le tour (volée vide ou incomplète) */
  pass(state: DefiState<TData>, reason?: string): DefiState<TData> {
    if (state.status !== "running") return state;

    const turnPlayer = this.getTurnPlayer(state);
    const ctx = { players: state.players, config: this.config } as DefiModeContext<TConfig>;

    let nextData = state.data;
    if (this.mode.onPass) nextData = this.mode.onPass(nextData, turnPlayer.id, ctx, reason);

    const ev: DefiEvent = { t: "PASS", ts: Date.now(), playerId: turnPlayer.id, reason };
    const nextState: DefiState<TData> = {
      ...state,
      data: nextData,
      events: [...state.events, ev],
    };

    // Une passe termine la volée (avec 0..N fléchettes éventuellement)
    return this.finalizeIfFinished(this.endTurn(nextState, "pass"));
  }

  /** Vue UI synthétique */
  getDisplay(state: DefiState<TData>): DefiDisplay {
    const turnPlayer = this.getTurnPlayer(state);
    const ctx = { players: state.players, config: this.config } as DefiModeContext<TConfig>;
    return this.mode.getDisplay(state.data, ctx, turnPlayer.id, state);
  }

  getRanking(state: DefiState<TData>): RankingEntry[] {
    const ctx = { players: state.players, config: this.config } as DefiModeContext<TConfig>;
    return this.mode.getRanking(state.data, ctx);
  }

  finish(state: DefiState<TData>): DefiResult {
    const finishedAt = Date.now();
    const ctx = { players: state.players, config: this.config } as DefiModeContext<TConfig>;

    return {
      id: state.id,
      modeId: state.modeId,
      startedAt: state.startedAt,
      finishedAt,
      players: state.players,
      ranking: this.mode.getRanking(state.data, ctx),
      events: state.events,
      data: state.data,
    };
  }

  // ------------------ internals ------------------

  private endTurn(state: DefiState<TData>, reason: "validate" | "pass" | "auto"): DefiState<TData> {
    const turnPlayer = this.getTurnPlayer(state);
    const ctx = { players: state.players, config: this.config } as DefiModeContext<TConfig>;

    let nextData = state.data;
    if (this.mode.onTurnEnd) {
      nextData = this.mode.onTurnEnd(nextData, turnPlayer.id, state.currentThrow, ctx, reason);
    }

    const evEnd: DefiEvent = {
      t: "END_TURN",
      ts: Date.now(),
      playerId: turnPlayer.id,
      throw: state.currentThrow,
      reason,
    };

    const nextState: DefiState<TData> = {
      ...state,
      data: nextData,
      currentThrow: [],
      events: [...state.events, evEnd],
      turn: this.advanceTurn(state),
    };

    return nextState;
  }

  private advanceTurn(state: DefiState<TData>) {
    const nextIndex = state.turn.playerIndex + 1;
    if (nextIndex < state.players.length) {
      return { ...state.turn, playerIndex: nextIndex };
    }
    return { playerIndex: 0, round: state.turn.round + 1 };
  }

  private finalizeIfFinished(state: DefiState<TData>): DefiState<TData> {
    const ctx = { players: state.players, config: this.config } as DefiModeContext<TConfig>;
    if (state.status !== "running") return state;
    const finished = this.mode.isFinished(state.data, ctx);
    if (!finished) return state;
    return { ...state, status: "finished", finishedAt: Date.now() };
  }
}
