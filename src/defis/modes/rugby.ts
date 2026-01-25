/* @ts-nocheck
 * ============================================
 * Défi — RUGBY (v1)
 * Variante simple à points:
 * - TRY (5 pts): toucher un TRIPLE (n'importe lequel)
 * - CONVERSION (2 pts): toucher DBULL (50)
 * - PENALTY (3 pts): toucher un DOUBLE (n'importe lequel)
 * - DROP (3 pts): toucher BULL (25)
 * - Total = points, classement par points
 * ============================================
 */
import type { DefiMode } from "../engine/DefiTypes";

function isDouble(d: any) {
  const m = d?.multiplier ?? d?.mul;
  return m === 2 || m === "D";
}
function isTriple(d: any) {
  const m = d?.multiplier ?? d?.mul;
  return m === 3 || m === "T";
}
function isBull25(d: any) {
  const n = d?.number ?? d?.n ?? d?.value ?? null;
  return n === 25;
}
function isDBull50(d: any) {
  const n = d?.number ?? d?.n ?? d?.value ?? null;
  return n === 50;
}

const Rugby: any = {
  id: "rugby",
  label: "RUGBY",
  init(players: any) {
    return {
      modeId: "rugby",
      players: (players || []).map((p: any) => ({ ...p, points: 0 })),
      finished: false,
    };
  },
  onThrow(state: any, playerId: string, dart: any) {
    if (state?.finished) return state;

    let add = 0;
    if (isDBull50(dart)) add = 2; // conversion
    else if (isBull25(dart)) add = 3; // drop
    else if (isTriple(dart)) add = 5; // try
    else if (isDouble(dart)) add = 3; // penalty

    if (!add) return state;

    return {
      ...state,
      players: state.players.map((p: any) =>
        p.id === playerId ? { ...p, points: (p.points ?? 0) + add } : p
      ),
    };
  },
  isFinished(state: any) {
    return !!state?.finished;
  },
  getRanking(state: any) {
    return [...(state?.players || [])].sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0));
  },
  getDisplay(state: any) {
    return { type: "rugby", label: "TRY=5 / DBULL=2 / DOUBLE=3 / BULL=3" };
  },
};

export default Rugby;
