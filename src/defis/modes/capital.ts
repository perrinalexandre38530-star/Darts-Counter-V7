/* @ts-nocheck
 * ============================================
 * Défi — CAPITAL (v1)
 * Variante type "Round the Clock + Bonus"
 * - Séquence: 1..20 puis BULL
 * - Chaque hit sur la cible active: S=1, D=2, T=3 (BULL=2, DBULL=3)
 * - À la fin du tour: si la cible a été touchée au moins une fois => on avance
 * - Fin quand BULL validé
 * ============================================
 */
import type { DefiMode } from "../engine/DefiTypes";

const SEQ: any[] = Array.from({ length: 20 }, (_, i) => i + 1).concat(["BULL"]);

function multFromDart(d: any) {
  const m = d?.multiplier ?? d?.mul ?? 1;
  if (m === 2 || m === "D") return 2;
  if (m === 3 || m === "T") return 3;
  return 1;
}
function isBull(d: any) {
  const n = d?.number ?? d?.n ?? d?.value ?? null;
  return n === 25 || n === 50 || d?.isBull;
}
function isDBull(d: any) {
  const n = d?.number ?? d?.n ?? d?.value ?? null;
  return n === 50;
}
function numFromDart(d: any) {
  return d?.number ?? d?.n ?? d?.value ?? null;
}

const Capital: any = {
  id: "capital",
  label: "CAPITAL",
  init(players: any) {
    return {
      modeId: "capital",
      step: 0,
      stepHitThisTurn: false,
      players: (players || []).map((p: any) => ({ ...p, points: 0 })),
      finished: false,
    };
  },
  onThrow(state: any, playerId: string, dart: any) {
    if (state?.finished) return state;

    const step = state?.step ?? 0;
    const target = SEQ[step] ?? "BULL";

    let hit = false;
    if (target === "BULL") hit = isBull(dart);
    else hit = numFromDart(dart) === target;

    if (!hit) return state;

    let add = multFromDart(dart);
    if (target === "BULL") {
      add = isDBull(dart) ? 3 : 2;
    }

    return {
      ...state,
      stepHitThisTurn: true,
      players: state.players.map((p: any) =>
        p.id === playerId ? { ...p, points: (p.points ?? 0) + add } : p
      ),
    };
  },
  onTurnEnd(state: any) {
    if (state?.finished) return state;
    if (!state?.stepHitThisTurn) return { ...state, stepHitThisTurn: false };

    const next = (state?.step ?? 0) + 1;
    if (next >= SEQ.length) return { ...state, finished: true, step: SEQ.length - 1, stepHitThisTurn: false };
    return { ...state, step: next, stepHitThisTurn: false };
  },
  isFinished(state: any) {
    return !!state?.finished;
  },
  getRanking(state: any) {
    return [...(state?.players || [])].sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0));
  },
  getDisplay(state: any) {
    const step = state?.step ?? 0;
    const target = SEQ[step] ?? "BULL";
    return { type: "capital", step, target, label: `Cible: ${target}` };
  },
};

export default Capital;
