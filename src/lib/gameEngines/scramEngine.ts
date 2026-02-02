// ============================================
// src/lib/gameEngines/scramEngine.ts
// SCRAM (team-based) — 2 phases
// - Phase RACE: les deux équipes ferment 20..15 (+ bull optionnel) en "marks" (défaut 3)
// - Phase SCRAM: l'équipe qui a gagné la RACE devient "SCORERS" (marque des points)
//                l'autre devient "CLOSERS" (ferme les cibles). Fin:
//                - SCORERS atteignent objective => SCORERS gagnent
//                - CLOSERS ferment toutes les cibles => CLOSERS gagnent
// Notes:
// - Le moteur est volontairement "state-centric" (contrôle/phase), pas score-centric.
// - getWinner() renvoie le 1er joueur de l'équipe gagnante (compat UI existante).
// ============================================

import type {
  BaseGameState,
  Player,
  GameDart as Dart,
  MatchRules,
  GameEngine,
  ScramRules,
} from "../types-game";
import { makeBaseState, pushTurn } from "./baseEngine";

type TeamId = "A" | "B";
type Phase = "race" | "scram" | "finished";
type Target = 15 | 16 | 17 | 18 | 19 | 20 | 25; // 25 = bull (OB/IB)

const DEFAULT_TARGETS: Target[] = [20, 19, 18, 17, 16, 15, 25];

type Marks = Record<Target, number>; // 0..marksToClose

function otherTeam(t: TeamId): TeamId {
  return t === "A" ? "B" : "A";
}

function hitToMarks(d: Dart, target: Target): number {
  if (d.bed === "MISS") return 0;
  if (target === 25) {
    if (d.bed === "OB") return 1;
    if (d.bed === "IB") return 2;
    return 0;
  }
  if (d.number !== target) return 0;
  if (d.bed === "S") return 1;
  if (d.bed === "D") return 2;
  if (d.bed === "T") return 3;
  return 0;
}

function hitToPoints(d: Dart, target: Target): number {
  if (d.bed === "MISS") return 0;
  if (target === 25) {
    if (d.bed === "OB") return 25;
    if (d.bed === "IB") return 50;
    return 0;
  }
  if (d.number !== target) return 0;
  const mult = d.bed === "S" ? 1 : d.bed === "D" ? 2 : d.bed === "T" ? 3 : 0;
  return target * mult;
}

function emptyMarks(targets: Target[]): Marks {
  return Object.fromEntries(targets.map((t) => [t, 0])) as Marks;
}

function isClosed(m: Marks, targets: Target[], marksToClose: number): boolean {
  return targets.every((t) => (m[t] ?? 0) >= marksToClose);
}

export type ScramState = BaseGameState & {
  rules: Required<Pick<ScramRules, "objective" | "useBull" | "marksToClose">> & {
    maxRounds: number; // 0 = illimité
  };
  phase: Phase;
  targets: Target[];

  // Assignation équipe (par playerId)
  teamByPlayer: Record<string, TeamId>;
  teams: Record<TeamId, string[]>; // ids

  // Phase RACE
  raceMarks: Record<TeamId, Marks>;
  raceWinner: TeamId | null;

  // Phase SCRAM
  scorersTeam: TeamId | null;
  closersTeam: TeamId | null;
  closersMarks: Marks; // marks de l'équipe "closers" uniquement
  scramScore: number;  // points des "scorers" uniquement

  // Fin
  winningTeam: TeamId | null;
};

export const ScramEngine: GameEngine<ScramState> = {
  initGame(players: Player[], rules: MatchRules): ScramState {
    const r0 = (rules.mode === "scram" ? rules : ({} as any)) as ScramRules;

    const useBull = r0.useBull !== false;
    const objective = Math.max(0, Math.floor(Number(r0.objective ?? 200)));
    const marksToClose = (r0.marksToClose ?? 3) as 1 | 2 | 3;
    const maxRounds = Math.max(0, Math.floor(Number(r0.maxRounds ?? 0)));

    const base = makeBaseState("scram", players);
    const targets = (useBull ? DEFAULT_TARGETS : DEFAULT_TARGETS.filter((t) => t !== 25)) as Target[];

    // Assignation simple: alternance A/B selon l'ordre des joueurs
    const teamByPlayer: Record<string, TeamId> = {};
    const teams: Record<TeamId, string[]> = { A: [], B: [] };
    players.forEach((p, idx) => {
      const team: TeamId = idx % 2 === 0 ? "A" : "B";
      teamByPlayer[p.id] = team;
      teams[team].push(p.id);
    });

    return {
      ...base,
      rules: { objective, useBull, marksToClose, maxRounds },
      phase: "race",
      targets,
      teamByPlayer,
      teams,
      raceMarks: { A: emptyMarks(targets), B: emptyMarks(targets) },
      raceWinner: null,
      scorersTeam: null,
      closersTeam: null,
      closersMarks: emptyMarks(targets),
      scramScore: 0,
      winningTeam: null,
    };
  },

  playTurn(state: ScramState, darts: Dart[]): ScramState {
    if (state.phase === "finished") return state;

    // maxRounds: si cap atteint => fin (sécurité)
    if (state.rules.maxRounds > 0 && state.turnIndex >= state.rules.maxRounds * state.players.length) {
      const forcedWinner: TeamId = state.scramScore >= state.rules.objective ? (state.scorersTeam ?? "A") : (state.closersTeam ?? "B");
      return {
        ...state,
        phase: "finished",
        endedAt: Date.now(),
        winningTeam: forcedWinner,
      };
    }

    const pid = state.players[state.currentPlayerIndex]?.id;
    const team: TeamId = state.teamByPlayer[pid] ?? "A";

    const slice = darts.slice(0, 3);

    // --- Phase RACE ---
    if (state.phase === "race") {
      const next: ScramState = {
        ...state,
        raceMarks: { ...state.raceMarks, [team]: { ...state.raceMarks[team] } },
      };

      const m = next.raceMarks[team];
      let notes = "";

      for (const d of slice) {
        for (const t of next.targets) {
          const add = hitToMarks(d, t);
          if (!add) continue;
          m[t] = Math.min(next.rules.marksToClose, (m[t] ?? 0) + add);
        }
      }

      const closed = isClosed(m, next.targets, next.rules.marksToClose);
      if (closed) {
        next.raceWinner = team;
        next.phase = "scram";
        next.scorersTeam = team;
        next.closersTeam = otherTeam(team);
        next.closersMarks = emptyMarks(next.targets);
        next.scramScore = 0;
        notes = `RACE WON by ${team} → SCRAM start (SCORERS=${team})`;
      }

      const advanced = pushTurn(next, { darts: slice, scoreDelta: 0, notes: notes || "race" });
      return advanced;
    }

    // --- Phase SCRAM ---
    const scorers = state.scorersTeam ?? "A";
    const closers = state.closersTeam ?? otherTeam(scorers);

    let next: ScramState = {
      ...state,
      closersMarks: { ...state.closersMarks },
    };

    let gained = 0;
    let notes = "";

    if (team === scorers) {
      // SCORERS: marquent des points sur les cibles NON fermées par les CLOSERS
      for (const d of slice) {
        for (const t of next.targets) {
          if ((next.closersMarks[t] ?? 0) >= next.rules.marksToClose) continue;
          const pts = hitToPoints(d, t);
          if (pts) gained += pts;
        }
      }
      next.scramScore = next.scramScore + gained;
      notes = gained > 0 ? `scram +${gained}` : "scram";
    } else if (team === closers) {
      // CLOSERS: ferment les cibles
      for (const d of slice) {
        for (const t of next.targets) {
          const add = hitToMarks(d, t);
          if (!add) continue;
          next.closersMarks[t] = Math.min(next.rules.marksToClose, (next.closersMarks[t] ?? 0) + add);
        }
      }
      notes = "close";
    }

    const scorersWin = next.rules.objective > 0 && next.scramScore >= next.rules.objective;
    const closersWin = isClosed(next.closersMarks, next.targets, next.rules.marksToClose);

    if (scorersWin || closersWin) {
      next.phase = "finished";
      next.endedAt = Date.now();
      next.winningTeam = scorersWin ? scorers : closers;
      notes = scorersWin ? `WIN ${scorers} (objective)` : `WIN ${closers} (closed)`;
    }

    next = pushTurn(next, { darts: slice, scoreDelta: gained, notes });
    return next;
  },

  isGameOver(state: ScramState): boolean {
    return state.phase === "finished";
  },

  getWinner(state: ScramState): Player | null {
    if (state.phase !== "finished") return null;
    const wt = state.winningTeam;
    if (!wt) return null;
    const winnerId = state.teams[wt]?.[0];
    if (!winnerId) return null;
    return state.players.find((p) => p.id === winnerId) ?? null;
  },
};
