/* @ts-nocheck
 * ============================================
 * Défi — FOOTBALL (v1)
 * Variante simple "Targets en descente"
 * - Séquence: 20,19,18,17,16,15,BULL
 * - Sur ta volée: si tu touches la cible active => tu ajoutes (S=1,D=2,T=3) points
 * - À la fin du tour: si au moins 1 hit sur la cible active => on avance à la cible suivante
 * - Fin quand la séquence est terminée (après BULL validé)
 * ============================================
 */
import type { DefiMode } from "../engine/DefiTypes";

const SEQ = [20,19,18,17,16,15,"BULL"];

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
function numFromDart(d: any) {
  return d?.number ?? d?.n ?? d?.value ?? null;
}

const Football: any = {
  id: "football",
  label: "FOOTBALL",
  init(players: any, cfg: any = {}) {
    return {
      modeId: "football",
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

    const add = multFromDart(dart);
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
    return { type: "football", step, target, label: `Cible: ${target}` };
  },
};

export default Football;
