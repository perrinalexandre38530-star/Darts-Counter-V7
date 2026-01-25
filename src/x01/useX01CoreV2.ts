// =============================================================
// src/x01/useX01CoreV2.ts
// Moteur X01 "propre", indépendant de l'UI.
// - Multi-joueurs
// - bust / double-out / simple-out
// - Skeleton sets / legs
// - Log des visits (Training-like compatible)
// - Support de jeu en ÉQUIPE (teamId, legs/sets par équipe)
// =============================================================

import React from "react";
import type { Dart as UIDart } from "../lib/types";

/* --------- Types publics du moteur --------- */

export type Multiplier = 1 | 2 | 3;

export type CorePlayer = {
  id: string;
  name: string;
  teamId?: string | null;
};

export type CoreTeam = {
  id: string;
  name: string;
  playerIds: string[];
};

export type VisitCore = {
  p: string;
  segments: { v: number; mult: Multiplier }[];
  bust: boolean;
  isCheckout: boolean;
  score: number;
  remainingAfter: number;
  ts: number;
};

export type LegEndResult = {
  winnerId: string | null;
  winnerTeamId?: string | null;
  legNo: number;
  visits: VisitCore[];
};

export type MatchEndResult = {
  winnerId: string | null;
  winnerTeamId?: string | null;
  legs: LegEndResult[];
  visits: VisitCore[];
};

export type UseX01CoreV2Params = {
  players: CorePlayer[];
  teams?: CoreTeam[];         // optionnel : jeu en équipe
  start: number;              // 301 / 501 / 701 / ...
  doubleOut: boolean;
  setsToWin: number;
  legsPerSet: number;
  onLegEnd?: (res: LegEndResult) => void;
  onMatchEnd?: (res: MatchEndResult) => void;
};

/* =============================================================
   SuggestCheckout — copie simplifiée de X01Play
============================================================= */
function suggestCheckoutInternal(
  rest: number,
  doubleOut: boolean,
  dartsLeft: number
): string[] {
  if (rest < 2 || rest > 170) return [];
  if (!doubleOut) return rest <= 50 ? [rest === 50 ? "BULL" : `S${rest}`] : [];

  const map: Record<number, string> = {
    170: "T20 T20 D25",
    167: "T20 T19 D25",
    164: "T20 T18 D25",
    161: "T20 T17 D25",
    160: "T20 T20 D20",
    158: "T20 T20 D19",
    157: "T20 T19 D20",
    156: "T20 T20 D18",
    155: "T20 T19 D19",
    154: "T20 T18 D20",
    153: "T20 T19 D18",
    152: "T20 T20 D16",
    151: "T20 T17 D20",
    150: "T20 T18 D18",
    140: "T20 T20 D10",
    139: "T20 T13 D20",
    138: "T20 T18 D12",
    137: "T20 T15 D16",
    136: "T20 T20 D8",
    135: "T20 T17 D12",
    130: "T20 T18 D8",
    129: "T19 T16 D12",
    128: "T18 T14 D16",
    127: "T20 T17 D8",
    126: "T19 T19 D6",
    125: "25 T20 D20",
    124: "T20 T16 D8",
    123: "T19 T16 D9",
    122: "T18 T18 D7",
    121: "T20 11 D25",
    120: "T20 D20",
    119: "T19 10 D25",
    118: "T20 18 D20",
    117: "T20 17 D20",
    116: "T20 16 D20",
    115: "T20 15 D20",
    110: "T20 10 D20",
    109: "T20 9 D20",
    108: "T20 16 D16",
    107: "T19 18 D16",
    101: "T20 9 D16",
    100: "T20 D20",
    99: "T19 10 D16",
    98: "T20 D19",
    97: "T19 D20",
    96: "T20 D18",
    95: "T19 D19",
    94: "T18 D20",
    93: "T19 D18",
    92: "T20 D16",
    91: "T17 D20",
    90: "T18 D18",
    89: "T19 D16",
    88: "T16 D20",
    87: "T17 D18",
    86: "T18 D16",
    85: "T15 D20",
    84: "T16 D18",
    83: "T17 D16",
    82: "BULL D16",
    81: "T15 D18",
    80: "T20 D10",
    79: "T19 D11",
    78: "T18 D12",
    77: "T19 D10",
    76: "T20 D8",
    75: "T17 D12",
    74: "T14 D16",
    73: "T19 D8",
    72: "T16 D12",
    71: "T13 D16",
    70: "T20 D5",
  };

  const best = map[rest];
  if (best && best.split(" ").length <= dartsLeft) return [best];
  return [];
}

/* =============================================================
   Hook principal
============================================================= */
export function useX01CoreV2(params: UseX01CoreV2Params) {
  const {
    players,
    teams = [],
    start,
    doubleOut,
    setsToWin,
    legsPerSet,
    onLegEnd,
    onMatchEnd,
  } = params;

  // Map playerId -> teamId (ou null)
  const teamByPlayerId: Record<string, string | null> = React.useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const p of players) {
      if (p.teamId) m[p.id] = p.teamId;
      else {
        const t = teams.find((tt) => tt.playerIds.includes(p.id));
        m[p.id] = t ? t.id : null;
      }
    }
    return m;
  }, [players, teams]);

  // Scores par joueur
  const [scores, setScores] = React.useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of players) m[p.id] = start;
    return m;
  });

  // Joueur courant (index dans players)
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const currentPlayer = players[currentIndex];

  // Volée courante (max 3 darts)
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  // Log de visits pour la manche courante
  const [visits, setVisits] = React.useState<VisitCore[]>([]);

  // Legs & Sets par joueur
  const [legsWon, setLegsWon] = React.useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of players) m[p.id] = 0;
    return m;
  });
  const [setsWon, setSetsWon] = React.useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of players) m[p.id] = 0;
    return m;
  });

  // Legs & Sets par équipe (optionnel)
  const [teamLegsWon, setTeamLegsWon] = React.useState<Record<string, number>>(
    () => {
      const m: Record<string, number> = {};
      for (const t of teams) m[t.id] = 0;
      return m;
    }
  );
  const [teamSetsWon, setTeamSetsWon] = React.useState<Record<string, number>>(
    () => {
      const m: Record<string, number> = {};
      for (const t of teams) m[t.id] = 0;
      return m;
    }
  );

  const [currentLeg, setCurrentLeg] = React.useState(1);
  const [currentSet, setCurrentSet] = React.useState(1);

  // pendingFirstWin / finishedOrder façon X01Play
  const [pendingFirstWin, setPendingFirstWin] = React.useState<{
    playerId: string;
  } | null>(null);
  const [finishedOrder, setFinishedOrder] = React.useState<string[]>([]);

  // Accumulation de toutes les manches pour le match
  const allLegsRef = React.useRef<LegEndResult[]>([]);

  /* ---------------- Helpers ---------------- */

  function dartValue(d: UIDart): number {
    if (d.v === 25 && d.mult === 2) return 50;
    return d.v * d.mult;
  }

  function isDouble(d: UIDart): boolean {
    return d.mult === 2 || (d.v === 25 && d.mult === 2);
  }

  function getTeamIdForPlayer(playerId: string): string | null {
    return teamByPlayerId[playerId] ?? null;
  }

  /* ---------------- Gestion des darts ---------------- */

  function throwDart(v: number, mult: Multiplier) {
    if (currentThrow.length >= 3) return;
    setCurrentThrow((t) => [...t, { v, mult }]);
  }

  function undoDart() {
    setCurrentThrow((t) => t.slice(0, -1));
  }

  /* ---------------- Validation volée ---------------- */

  function validateThrow() {
    if (!currentThrow.length) return;
    const p = currentPlayer;
    // En mode TEAMS, le score est porté par l'équipe (tous les joueurs partagent le même score).
    const playerTeamId = getTeamIdForPlayer(p.id);
    const teamMemberIds = playerTeamId
      ? players.filter((pl) => getTeamIdForPlayer(pl.id) === playerTeamId).map((pl) => pl.id)
      : [p.id];
    const scoreRefId = teamMemberIds[0] ?? p.id;
    const oldScore = scores[scoreRefId];
    const pts = currentThrow.reduce((s, d) => s + dartValue(d), 0);
    const after = oldScore - pts;

    let bust = false;

    if (after < 0) bust = true;
    else if (after === 0 && doubleOut) {
      const last = currentThrow[currentThrow.length - 1];
      if (!isDouble(last)) bust = true;
    }

    const finalScore = bust ? oldScore : after;
    const isCheckout = !bust && after === 0;

    const visit: VisitCore = {
      p: p.id,
      segments: currentThrow.map((d) => ({
        v: d.v,
        mult: d.mult as Multiplier,
      })),
      bust,
      isCheckout,
      score: bust ? 0 : pts,
      remainingAfter: finalScore,
      ts: Date.now(),
    };

    setVisits((v) => [...v, visit]);
    setScores((s) => {
      const next = { ...s };
      for (const id of teamMemberIds) next[id] = finalScore;
      return next;
    });
    setCurrentThrow([]);

    if (isCheckout) {
      endOfLeg(p.id);
      return;
    }

    // joueur suivant (rotation simple)
    setCurrentIndex((i) => (i + 1) % players.length);
  }

  /* ---------------- Fin de manche ---------------- */

  function endOfLeg(winnerId: string) {
    // pendingFirstWin + finishedOrder pour coller à X01Play
    setPendingFirstWin({ playerId: winnerId });

    const order = [...players]
      .sort((a, b) => {
        const sa = scores[a.id];
        const sb = scores[b.id];
        const za = sa === 0;
        const zb = sb === 0;
        if (za && !zb) return -1;
        if (!za && zb) return 1;
        return sa - sb;
      })
      .map((p) => p.id);
    setFinishedOrder(order);

    const winnerTeamId = getTeamIdForPlayer(winnerId);

    const legRes: LegEndResult = {
      winnerId,
      winnerTeamId,
      legNo: currentLeg,
      visits: [...visits],
    };

    allLegsRef.current.push(legRes);
    onLegEnd?.(legRes);

    // legs par joueur
    setLegsWon((prev) => {
      const m = { ...prev };
      m[winnerId] = (m[winnerId] ?? 0) + 1;
      return m;
    });

    // legs par équipe
    if (winnerTeamId) {
      setTeamLegsWon((prev) => ({
        ...prev,
        [winnerTeamId]: (prev[winnerTeamId] ?? 0) + 1,
      }));
    }
  }

  /* ---------------- Manche suivante (Manche suivante / Set suivant) ---------------- */

  function confirmNextLeg() {
    if (!pendingFirstWin) return;
    const winnerId = pendingFirstWin.playerId;
    const winnerTeamId = getTeamIdForPlayer(winnerId);
    setPendingFirstWin(null);
    setFinishedOrder([]);

    const legsForWinner = legsWon[winnerId] ?? 0;
    const willWinSet = legsForWinner >= legsPerSet;
    const setsForWinner = setsWon[winnerId] ?? 0;
    const willWinMatch = willWinSet && (setsForWinner + 1) >= setsToWin;

    // reset board
    setScores(() => {
      const m: Record<string, number> = {};
      for (const p of players) m[p.id] = start;
      return m;
    });
    setCurrentThrow([]);
    setVisits([]);

    if (willWinSet) {
      setSetsWon((prev) => {
        const m = { ...prev };
        m[winnerId] = (m[winnerId] ?? 0) + 1;
        return m;
      });

      if (winnerTeamId) {
        setTeamSetsWon((prev) => ({
          ...prev,
          [winnerTeamId]: (prev[winnerTeamId] ?? 0) + 1,
        }));
      }

      setCurrentLeg(1);
      setCurrentSet((s) => s + 1);
    } else {
      setCurrentLeg((l) => l + 1);
    }

    if (willWinMatch) {
      endMatch(winnerId);
      return;
    }

    // comme ton moteur : le vainqueur commence la manche suivante
    const startIndex = players.findIndex((p) => p.id === winnerId);
    setCurrentIndex(startIndex >= 0 ? startIndex : 0);
  }

  /* ---------------- Fin de match ---------------- */

  function endMatch(winnerId: string) {
    const winnerTeamId = getTeamIdForPlayer(winnerId);
    const matchRes: MatchEndResult = {
      winnerId,
      winnerTeamId,
      legs: [...allLegsRef.current],
      visits: [...visits],
    };
    onMatchEnd?.(matchRes);
  }

  /* ---------------- Continuer après le premier (laisser finir) ---------------- */

  function continueAfterFirstWin() {
    // côté moteur, on enlève juste le "pending" et on laisse tourner normalement
    setPendingFirstWin(null);
    setFinishedOrder([]);
  }

  /* ---------------- Exports ---------------- */

  function suggestCheckout(remaining: number, dartsLeft: number) {
    return suggestCheckoutInternal(remaining, doubleOut, dartsLeft);
  }

  // équipe courante (si jeu en équipe)
  const currentTeamId = currentPlayer ? getTeamIdForPlayer(currentPlayer.id) : null;
  const currentTeam = currentTeamId
    ? teams.find((t) => t.id === currentTeamId) ?? null
    : null;

  return {
    // état
    players,
    teams,
    scores,
    currentPlayer,
    currentIndex,
    currentTeam,
    currentTeamId,
    currentThrow,
    visits,
    legsWon,
    setsWon,
    teamLegsWon,
    teamSetsWon,
    currentLeg,
    currentSet,
    pendingFirstWin,
    finishedOrder,

    // actions
    throwDart,
    undoDart,
    validateThrow,
    confirmNextLeg,
    continueAfterFirstWin,

    // helper
    suggestCheckout,
  };
}
