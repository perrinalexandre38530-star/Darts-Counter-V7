// ============================================
// src/lib/cricketEngine.ts
// Moteur Cricket v2 (FIX maxRounds + Undo roundNumber)
// - Cibles 15..20 + Bull (25)
// - 0..14 = MISS : consomme la fléchette, pas de marks/points
// - Option withPoints : mode "points" / "sans points"
// - Historique pour Undo
// - ✅ NEW: maxRounds stoppe vraiment la partie à la fin du dernier round
// ============================================

export type CricketTarget = 15 | 16 | 17 | 18 | 19 | 20 | 25;
export type Multiplier = 1 | 2 | 3;

// à l'exécution on autorise aussi 0..14 pour gérer les MISS
export type RawTarget = CricketTarget | number;

export type CricketPlayerState = {
  id: string;
  name: string;
  marks: Record<CricketTarget, number>;
  score: number;
};

export type CricketHistoryEntry = {
  playerIndex: number;
  target: RawTarget;
  mult: Multiplier;
  prevMarks: number;
  prevScore: number;
  prevCurrentPlayerIndex: number;
  prevRemainingDarts: number;
  prevWinnerId: string | null;
  prevRoundNumber: number; // ✅ NEW
};

export type CricketState = {
  players: CricketPlayerState[];
  currentPlayerIndex: number;
  remainingDarts: number;
  winnerId: string | null;
  withPoints: boolean;
  maxRounds: number;
  roundNumber: number;
  history: CricketHistoryEntry[];
};

export const CRICKET_TARGETS: CricketTarget[] = [20, 19, 18, 17, 16, 15, 25];

function isClosed(marks: number): boolean {
  return marks >= 3;
}

function cloneState(state: CricketState): CricketState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      marks: { ...p.marks },
    })),
    history: [...state.history],
  };
}

function isTargetValid(t: RawTarget): t is CricketTarget {
  return CRICKET_TARGETS.includes(t as CricketTarget);
}

function sumMarks(p: CricketPlayerState): number {
  return CRICKET_TARGETS.reduce((acc, t) => acc + (p.marks[t] ?? 0), 0);
}

function closedCount(p: CricketPlayerState): number {
  return CRICKET_TARGETS.reduce((acc, t) => acc + (isClosed(p.marks[t] ?? 0) ? 1 : 0), 0);
}

// ---------- Création match ----------

export type CreateCricketMatchOptions = {
  withPoints?: boolean;
  maxRounds?: number;
};

export function createCricketMatch(
  players: { id: string; name: string }[],
  opts: CreateCricketMatchOptions = {}
): CricketState {
  const withPoints = opts.withPoints ?? true;
  const maxRounds = opts.maxRounds ?? 20;

  const baseMarks: Record<CricketTarget, number> = {
    15: 0,
    16: 0,
    17: 0,
    18: 0,
    19: 0,
    20: 0,
    25: 0,
  };

  const playerStates: CricketPlayerState[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    marks: { ...baseMarks },
    score: 0,
  }));

  return {
    players: playerStates,
    currentPlayerIndex: 0,
    remainingDarts: 3,
    winnerId: null,
    withPoints,
    maxRounds,
    roundNumber: 1,
    history: [],
  };
}

// ---------- Calcul vainqueur "standard" (fermeture) ----------

function checkWinner(state: CricketState): string | null {
  // tous les joueurs qui ont tout fermé
  const closedPlayers = state.players.filter((p) =>
    CRICKET_TARGETS.every((t) => isClosed(p.marks[t] ?? 0))
  );
  if (closedPlayers.length === 0) return null;

  if (!state.withPoints) {
    // sans points : premier qui ferme tout gagne
    return closedPlayers[0].id;
  }

  // avec points : fermé + score >= aux autres, et meilleur score
  const bestCandidate = closedPlayers.reduce<CricketPlayerState | null>(
    (best, player) => {
      const otherScores = state.players
        .filter((p) => p.id !== player.id)
        .map((p) => p.score);
      const maxOther = otherScores.length ? Math.max(...otherScores) : Number.NEGATIVE_INFINITY;

      // doit être au moins à égalité de points
      if (player.score < maxOther) return best;

      if (!best || player.score > best.score) return player;
      return best;
    },
    null
  );

  return bestCandidate ? bestCandidate.id : null;
}

// ---------- Vainqueur à la limite de rounds (fallback) ----------
// Quand on atteint maxRounds et que personne n'a gagné "par fermeture",
// on choisit un vainqueur cohérent pour terminer la manche.
function winnerOnMaxRounds(state: CricketState): string | null {
  if (!state.players.length) return null;

  const ranked = [...state.players].sort((a, b) => {
    // 1) si points -> score
    if (state.withPoints && b.score !== a.score) return b.score - a.score;

    // 2) nb de cibles fermées
    const bc = closedCount(b);
    const ac = closedCount(a);
    if (bc !== ac) return bc - ac;

    // 3) total marks
    const bm = sumMarks(b);
    const am = sumMarks(a);
    if (bm !== am) return bm - am;

    // 4) stable
    return a.name.localeCompare(b.name);
  });

  return ranked[0]?.id ?? null;
}

// ---------- Application d'un hit ----------

export function applyCricketHit(
  state: CricketState,
  target: RawTarget,
  mult: Multiplier
): CricketState {
  if (state.winnerId) return state;

  const next = cloneState(state);
  const playerIndex = next.currentPlayerIndex;
  const player = next.players[playerIndex];

  const isValid = isTargetValid(target);
  const cricketTarget = isValid ? (target as CricketTarget) : null;

  const beforeMarks = cricketTarget ? player.marks[cricketTarget] ?? 0 : 0;
  const beforeScore = player.score;

  // --- Marks + points seulement si cible Cricket (15..20 / Bull) ---
  if (cricketTarget) {
    let newMarks = beforeMarks + mult;
    if (newMarks < 0) newMarks = 0;
    player.marks[cricketTarget] = newMarks;

    if (next.withPoints) {
      const anyOpponentOpen = next.players.some((p, idx) => {
        if (idx === playerIndex) return false;
        const oppMarks = p.marks[cricketTarget] ?? 0;
        return !isClosed(oppMarks);
      });

      if (anyOpponentOpen) {
        const prevSurplus = Math.max(0, beforeMarks - 3);
        const newSurplus = Math.max(0, newMarks - 3);
        const surplusDelta = newSurplus - prevSurplus;

        if (surplusDelta > 0) {
          const value = cricketTarget === 25 ? 25 : (cricketTarget as number);
          player.score += surplusDelta * value;
        }
      }
    }
  }
  // si 0..14 : on ne touche à rien, ce sera un MISS "pur"

  // --- Historique pour Undo (y compris MISS) ---
  next.history.push({
    playerIndex,
    target,
    mult,
    prevMarks: beforeMarks,
    prevScore: beforeScore,
    prevCurrentPlayerIndex: state.currentPlayerIndex,
    prevRemainingDarts: state.remainingDarts,
    prevWinnerId: state.winnerId,
    prevRoundNumber: state.roundNumber, // ✅ NEW
  });

  // --- Consommation fléchette + passage joueur / round ---
  next.remainingDarts -= 1;

  const endOfTurn = next.remainingDarts <= 0;

  if (endOfTurn && !next.winnerId) {
    const wasLastPlayer = next.currentPlayerIndex === next.players.length - 1;
    const wasLastRound = next.roundNumber >= next.maxRounds;

    // passage joueur
    next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
    next.remainingDarts = 3;

    // si on boucle (dernier joueur -> premier), on incrémente le round (sans dépasser max)
    if (wasLastPlayer) {
      next.roundNumber = Math.min(next.roundNumber + 1, next.maxRounds);
    }

    // ✅ FIN FORCÉE: fin du dernier round (dernier joueur vient de jouer sa 3e fléchette)
    if (wasLastPlayer && wasLastRound) {
      const w = winnerOnMaxRounds(next);
      next.winnerId = w;
      next.remainingDarts = 0;
      return next;
    }
  }

  // --- Vérifier victoire seulement si cible valide ---
  if (cricketTarget) {
    const winner = checkWinner(next);
    if (winner) {
      next.winnerId = winner;
      next.remainingDarts = 0;
    }
  }

  return next;
}

// ---------- Undo ----------

export function undoLastCricketHit(state: CricketState): CricketState {
  if (!state.history.length) return state;
  const entry = state.history[state.history.length - 1];

  const next = cloneState(state);
  next.history.pop();

  const player = next.players[entry.playerIndex];

  // si la cible était valide, on peut restaurer les marks
  if (isTargetValid(entry.target)) {
    player.marks[entry.target] = entry.prevMarks;
  }
  player.score = entry.prevScore;

  next.currentPlayerIndex = entry.prevCurrentPlayerIndex;
  next.remainingDarts = entry.prevRemainingDarts;
  next.winnerId = entry.prevWinnerId;
  next.roundNumber = entry.prevRoundNumber; // ✅ NEW

  return next;
}
