// ============================================
// src/lib/gameEngines/scramEngine.ts
// SCRAM (Cricket-like) — engine
// ✅ Phase RACE: fermeture des cibles (15–20 + Bull optionnel), sans points
// ✅ Transition auto RACE -> SCRAM quand une équipe ferme toutes les cibles
// ✅ Phase SCRAM:
//    - SCORERS (équipe qui a gagné la RACE) marquent des points
//      uniquement sur des cibles déjà fermées par eux ET non fermées par l'adversaire
//    - CLOSERS essaient de fermer pour bloquer le scoring
// ✅ Victoire:
//    - SCORERS gagnent si score >= objectif
//    - CLOSERS gagnent si ils ferment toutes les cibles avant que l'objectif soit atteint
// ✅ Compatible UI Cricket (mêmes notions S/D/T + Bull, même flow « 1 tour = 3 fléchettes »)
// ============================================

import type { Player } from "../types-game";
import type { GameDart } from "../types-game";

export type ScramTeam = "A" | "B";
export type ScramPhase = "race" | "scram";

export type ScramRules = {
  mode: "scram";
  objective: number;        // points à atteindre pendant la phase SCRAM
  maxRounds: number;        // 0 = illimité (un round = passage complet de tous les joueurs)
  useBull: boolean;         // inclure Bull dans les cibles
  marksToClose: 1 | 2 | 3;  // marks nécessaires pour « fermer » (par défaut 3)
};

export type Target = 15 | 16 | 17 | 18 | 19 | 20 | 25; // 25 = Bull

export type TargetMarks = Record<Target, number>;

export type ScramState = {
  sport: "darts";
  mode: "scram";
  rules: ScramRules;

  players: Player[];
  activePlayerIndex: number;
  round: number; // 1..n

  phase: ScramPhase;

  // Phase RACE
  raceMarks: Record<ScramTeam, TargetMarks>;

  // Phase SCRAM
  scorersTeam: ScramTeam | null;
  closersTeam: ScramTeam | null;
  scorersMarks: TargetMarks; // marks de l'équipe scorers
  closersMarks: TargetMarks; // marks de l'équipe closers
  scramScore: number;        // score des scorers pendant la phase scram

  // Stats (côté UI: "Darts / Miss / S / D / T / OB / IB")
  stats: Record<
    ScramTeam,
    { darts: number; miss: number; s: number; d: number; t: number; ob: number; ib: number }
  >;

  // Fin de partie
  winnerTeam: ScramTeam | null;
  finished: boolean;

  // Historique minimal
  history: Array<{
    id: string;
    createdAt: string;
    playerId: string;
    team: ScramTeam;
    phase: ScramPhase;
    darts: GameDart[];
    scramScoreDelta: number;
    snapshot?: any;
  }>;
};

const TARGETS_BASE: Target[] = [15, 16, 17, 18, 19, 20];
const BULL: Target = 25;

function nowIso() {
  return new Date().toISOString();
}

function teamForPlayerIndex(i: number): ScramTeam {
  return i % 2 === 0 ? "A" : "B";
}

function emptyMarks(useBull: boolean): TargetMarks {
  const obj: any = { 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 25: 0 };
  if (!useBull) obj[25] = 0; // reste présent mais ignoré par targets()
  return obj as TargetMarks;
}

function targets(rules: ScramRules): Target[] {
  return rules.useBull ? [...TARGETS_BASE, BULL] : [...TARGETS_BASE];
}

function isClosed(marks: number, rules: ScramRules) {
  return marks >= rules.marksToClose;
}

function allClosed(m: TargetMarks, rules: ScramRules) {
  for (const t of targets(rules)) {
    if (!isClosed(m[t], rules)) return false;
  }
  return true;
}

function cloneMarks(m: TargetMarks): TargetMarks {
  return { 15: m[15], 16: m[16], 17: m[17], 18: m[18], 19: m[19], 20: m[20], 25: m[25] } as TargetMarks;
}

function dartToTarget(d: GameDart): { target: Target; isBull: boolean } | null {
  // GameDart attendu: { value: number, multiplier: 1|2|3, label?: string }
  // Bull : value peut être 25 (OB) ou 50 (IB) selon conversion. On mappe vers target=25.
  if (!d) return null;
  const v = (d as any).value;
  if (v === 25 || v === 50) return { target: 25, isBull: true };
  if (v === 15 || v === 16 || v === 17 || v === 18 || v === 19 || v === 20) return { target: v as Target, isBull: false };
  return null;
}

function bullPoints(d: GameDart) {
  const v = (d as any).value;
  if (v === 50) return 50; // inner bull
  return 25;               // outer bull (25)
}

function pointsForDart(d: GameDart): number {
  const { isBull } = dartToTarget(d) ?? { isBull: false };
  if (isBull) return bullPoints(d);
  const v = (d as any).value ?? 0;
  const mult = (d as any).multiplier ?? 1;
  return v * mult;
}

function idTurn(state: ScramState) {
  return `${state.mode}-${state.round}-${state.activePlayerIndex}-${state.history.length + 1}`;
}

export const ScramEngine = {
  initGame(players: Player[], rulesInput: Partial<ScramRules>): ScramState {
    const rules: ScramRules = {
      mode: "scram",
      objective: typeof rulesInput.objective === "number" ? rulesInput.objective : 200,
      maxRounds: typeof rulesInput.maxRounds === "number" ? rulesInput.maxRounds : 0,
      useBull: rulesInput.useBull !== false,
      marksToClose: (rulesInput.marksToClose ?? 3) as 1 | 2 | 3,
    };

    const safePlayers = (players ?? []).filter((p: any) => p && typeof p.id === "string" && p.id.length > 0);
    const finalPlayers =
      safePlayers.length >= 2
        ? safePlayers
        : ([{ id: "p1", name: safePlayers[0]?.name ?? "Joueur 1" }, { id: "p2", name: "Joueur 2" }] as Player[]);

    return {
      sport: "darts",
      mode: "scram",
      rules,
      players: finalPlayers,
      activePlayerIndex: 0,
      round: 1,
      phase: "race",
      raceMarks: { A: emptyMarks(rules.useBull), B: emptyMarks(rules.useBull) },
      scorersTeam: null,
      closersTeam: null,
      scorersMarks: emptyMarks(rules.useBull),
      closersMarks: emptyMarks(rules.useBull),
      scramScore: 0,
      stats: {
        A: { darts: 0, miss: 0, s: 0, d: 0, t: 0, ob: 0, ib: 0 },
        B: { darts: 0, miss: 0, s: 0, d: 0, t: 0, ob: 0, ib: 0 },
      },
      winnerTeam: null,
      finished: false,
      history: [],
    };
  },

  playTurn(state: ScramState, dartsInput: GameDart[]): ScramState {
    if (state.finished) return state;

    const darts = (dartsInput ?? []).slice(0, 3);
    const next: ScramState = {
      ...state,
      raceMarks: { A: cloneMarks(state.raceMarks.A), B: cloneMarks(state.raceMarks.B) },
      scorersMarks: cloneMarks(state.scorersMarks),
      closersMarks: cloneMarks(state.closersMarks),
      stats: {
        A: { ...state.stats.A },
        B: { ...state.stats.B },
      },
      history: [...state.history],
    };

    const player = next.players[next.activePlayerIndex];
    const team = teamForPlayerIndex(next.activePlayerIndex);

    // --- stats volley
    next.stats[team].darts += darts.length;

    let scramScoreDelta = 0;

    for (const d of darts) {
      const mapped = dartToTarget(d);
      if (!mapped) {
        next.stats[team].miss += 1;
        continue;
      }

      const mult = (d as any).multiplier ?? 1;

      // Stats S/D/T + Bull
      if (mapped.isBull) {
        if ((d as any).value === 50 || mult === 2) next.stats[team].ib += 1;
        else next.stats[team].ob += 1;
      } else {
        if (mult === 1) next.stats[team].s += 1;
        else if (mult === 2) next.stats[team].d += 1;
        else if (mult === 3) next.stats[team].t += 1;
      }

      if (next.phase === "race") {
        // fermeture, sans points
        const cur = next.raceMarks[team][mapped.target] ?? 0;
        next.raceMarks[team][mapped.target] = Math.min(next.rules.marksToClose, cur + mult);
        continue;
      }

      // phase SCRAM
      const scorers = next.scorersTeam!;
      const closers = next.closersTeam!;

      if (team === scorers) {
        // scoring si cible déjà fermée chez scorers et pas fermée chez closers
        const sClosed = isClosed(next.scorersMarks[mapped.target], next.rules);
        const cClosed = isClosed(next.closersMarks[mapped.target], next.rules);

        if (sClosed && !cClosed) {
          scramScoreDelta += pointsForDart(d);
        } else {
          // sinon : au mieux on complète les marks scorers (mais ils sont supposés déjà fermés au départ)
          const cur = next.scorersMarks[mapped.target] ?? 0;
          next.scorersMarks[mapped.target] = Math.min(next.rules.marksToClose, cur + mult);
        }
      } else if (team === closers) {
        // closers ferment pour bloquer
        const cur = next.closersMarks[mapped.target] ?? 0;
        next.closersMarks[mapped.target] = Math.min(next.rules.marksToClose, cur + mult);
      }
    }

    // --- fin volley: transitions / victoire
    if (next.phase === "race") {
      const aWin = allClosed(next.raceMarks.A, next.rules);
      const bWin = allClosed(next.raceMarks.B, next.rules);

      if (aWin || bWin) {
        const winner: ScramTeam = aWin ? "A" : "B";
        const loser: ScramTeam = winner === "A" ? "B" : "A";

        next.phase = "scram";
        next.scorersTeam = winner;
        next.closersTeam = loser;

        // On réutilise les marks accumulés pendant la race
        next.scorersMarks = cloneMarks(next.raceMarks[winner]);
        next.closersMarks = cloneMarks(next.raceMarks[loser]);
        next.scramScore = 0;
      }
    } else {
      // phase scram
      next.scramScore += scramScoreDelta;

      if (next.scramScore >= next.rules.objective) {
        next.finished = true;
        next.winnerTeam = next.scorersTeam;
      } else if (allClosed(next.closersMarks, next.rules)) {
        // closers ont tout fermé avant l'objectif
        next.finished = true;
        next.winnerTeam = next.closersTeam;
      }
    }

    // --- history
    next.history.push({
      id: idTurn(next),
      createdAt: nowIso(),
      playerId: player?.id ?? "unknown",
      team,
      phase: next.phase,
      darts,
      scramScoreDelta,
    });

    // --- next player / round
    const prevIndex = next.activePlayerIndex;
    next.activePlayerIndex = (next.activePlayerIndex + 1) % next.players.length;

    if (next.activePlayerIndex === 0 && prevIndex !== 0) {
      next.round += 1;
      if (next.rules.maxRounds > 0 && next.round > next.rules.maxRounds && !next.finished) {
        // Tie-break simple : si on dépasse le cap sans fin, l'équipe scorers gagne si elle mène (score > 0),
        // sinon closers (ça pousse à fermer).
        next.finished = true;
        if (next.phase === "scram" && next.scorersTeam && next.closersTeam) {
          next.winnerTeam = next.scramScore > 0 ? next.scorersTeam : next.closersTeam;
        } else {
          // si encore en race: équipe qui a le plus de cibles fermées
          const sum = (m: TargetMarks) => targets(next.rules).reduce((acc, t) => acc + Math.min(next.rules.marksToClose, m[t] ?? 0), 0);
          next.winnerTeam = sum(next.raceMarks.A) >= sum(next.raceMarks.B) ? "A" : "B";
        }
      }
    }

    return next;
  },

  isGameOver(state: ScramState) {
    return !!state.finished;
  },

  getWinner(state: ScramState) {
    return state.winnerTeam;
  },
};
