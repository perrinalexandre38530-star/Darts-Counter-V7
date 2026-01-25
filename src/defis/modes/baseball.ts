/* @ts-nocheck
 * ============================================
 * Défi — BASEBALL (v1)
 * - 9 manches (innings)
 * - Une manche = cible numéro (1..9)
 * - Sur ta volée: si tu touches la cible de la manche:
 *    S = 1 run, D = 2 runs, T = 3 runs
 * - Total = runs cumulés, classement par runs
 * ============================================
 */
import type { DefiMode } from "../engine/DefiTypes";

function multFromDart(d: any) {
  const m = d?.multiplier ?? d?.mul ?? 1;
  if (m === 2 || m === "D") return 2;
  if (m === 3 || m === "T") return 3;
  return 1;
}
function numFromDart(d: any) {
  return d?.number ?? d?.n ?? d?.value ?? null;
}

const Baseball: any = {
  id: "baseball",
  label: "BASEBALL",
  init(players: any, cfg: any = {}) {
    const innings = cfg?.innings ?? 9;
    return {
      modeId: "baseball",
      cfg: { innings },
      inning: 1,
      players: (players || []).map((p: any) => ({ ...p, runs: 0 })),
      finished: false,
    };
  },
  onThrow(state: any, playerId: string, dart: any, ctx: any) {
    if (state?.finished) return state;

    const inning = state?.inning ?? 1;
    const target = inning; // 1..9
    const n = numFromDart(dart);
    if (n === target) {
      const add = multFromDart(dart);
      return {
        ...state,
        players: state.players.map((p: any) =>
          p.id === playerId ? { ...p, runs: (p.runs ?? 0) + add } : p
        ),
      };
    }
    return state;
  },
  // Appelée par l'engine à la fin de la volée / fin de tour
  onTurnEnd(state: any, ctx: any) {
    // quand tous les joueurs ont joué la manche, on incrémente inning
    const inning = state?.inning ?? 1;
    const innings = state?.cfg?.innings ?? 9;

    // ctx.turnEndForAllPlayers peut exister, sinon on tente un fallback:
    const allDone = !!ctx?.allPlayersCompletedRound || !!ctx?.isRoundCompleted;
    if (!allDone) return state;

    const nextInning = inning + 1;
    if (nextInning > innings) {
      return { ...state, inning: innings, finished: true };
    }
    return { ...state, inning: nextInning };
  },
  isFinished(state: any) {
    return !!state?.finished;
  },
  getRanking(state: any) {
    return [...(state?.players || [])].sort((a: any, b: any) => (b.runs ?? 0) - (a.runs ?? 0));
  },
  getDisplay(state: any) {
    return {
      type: "baseball",
      inning: state?.inning ?? 1,
      target: state?.inning ?? 1,
      label: `Manche ${state?.inning ?? 1}`,
    };
  },
};

export default Baseball;
