/* @ts-nocheck
 * ============================================
 * Défi — CAPITAL (v1)
 * Implémentation "Round the Clock + Bonus"
 * - Séquence: 1..20 puis BULL
 * - Points: si tu touches la cible active
 *   - numéro (1..20) : +1 / +2 / +3 selon S/D/T
 *   - BULL : +2 (BULL) / +3 (DBULL)
 * - Fin de volée: si la cible a été touchée au moins 1 fois => on avance à la cible suivante
 * - Fin du défi quand BULL est validé
 * ============================================
 */

import type { DefiMode } from "../engine/DefiEngine";
import type { DefiDart, DefiDisplay, RankingEntry } from "../engine/DefiTypes";

export type CapitalConfig = {
  /** 1..20 puis BULL (fixe) — placeholder pour futures variantes */
  sequence?: "rtc";
};

type CapitalPlayer = { id: string; name: string; points: number };
export type CapitalData = {
  step: number; // 0..20 (20 = BULL)
  stepHitThisTurn: boolean;
  players: CapitalPlayer[];
  finished: boolean;
};

const SEQ: (number | "BULL")[] = Array.from({ length: 20 }, (_, i) => i + 1).concat(["BULL"]);

function multFromDart(d: DefiDart) {
  const m = (d as any)?.mult ?? (d as any)?.multiplier ?? (d as any)?.mul ?? 1;
  if (m === 2 || m === "D") return 2;
  if (m === 3 || m === "T") return 3;
  return 1;
}

function numFromDart(d: DefiDart) {
  return (d as any)?.v ?? (d as any)?.number ?? (d as any)?.n ?? (d as any)?.value ?? null;
}

function isBull(d: DefiDart) {
  const n = numFromDart(d);
  return n === 25 || n === 50 || (d as any)?.isBull;
}

function isDBull(d: DefiDart) {
  const n = numFromDart(d);
  return n === 50;
}

function targetLabel(target: number | "BULL") {
  return target === "BULL" ? "BULL" : String(target);
}

const Capital: DefiMode<CapitalConfig, CapitalData> = {
  id: "capital",
  label: "CAPITAL",
  dartsPerTurn: 3,

  init({ players }) {
    return {
      step: 0,
      stepHitThisTurn: false,
      players: (players || []).map((p: any) => ({ id: p.id, name: p.name, points: 0 })),
      finished: false,
    };
  },

  onDart(data, playerId, dart) {
    if (data?.finished) return data;

    const step = data?.step ?? 0;
    const target = SEQ[step] ?? "BULL";

    let hit = false;
    if (target === "BULL") hit = isBull(dart);
    else hit = numFromDart(dart) === target;

    if (!hit) return data;

    let add = multFromDart(dart);
    if (target === "BULL") add = isDBull(dart) ? 3 : 2;

    return {
      ...data,
      stepHitThisTurn: true,
      players: (data.players || []).map((p: any) =>
        p.id === playerId ? { ...p, points: (p.points ?? 0) + add } : p
      ),
    };
  },

  onTurnEnd(data) {
    if (data?.finished) return data;
    if (!data?.stepHitThisTurn) return { ...data, stepHitThisTurn: false };

    const next = (data?.step ?? 0) + 1;
    if (next >= SEQ.length) {
      return { ...data, finished: true, step: SEQ.length - 1, stepHitThisTurn: false };
    }
    return { ...data, step: next, stepHitThisTurn: false };
  },

  isFinished(data) {
    return !!data?.finished;
  },

  getRanking(data): RankingEntry[] {
    return [...(data?.players || [])]
      .sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0))
      .map((p: any, idx: number) => ({
        rank: idx + 1,
        playerId: p.id,
        label: p.name,
        value: p.points ?? 0,
      }));
  },

  getDisplay(data): DefiDisplay {
    const step = data?.step ?? 0;
    const target = SEQ[step] ?? "BULL";
    return {
      kind: "capital",
      title: "CAPITAL",
      subtitle: `Cible: ${targetLabel(target)}`,
      target: targetLabel(target),
    } as any;
  },
};

export default Capital;
