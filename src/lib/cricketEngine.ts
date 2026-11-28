// ============================================
// src/lib/cricketEngine.ts
// Moteur Cricket v2 (FIX maxRounds + Undo roundNumber)
// - Cibles 15..20 + Bull (25)
// - 0..14 = MISS : consomme la fléchette, pas de marks/points
// - Option withPoints : mode "points" / "sans points"
// - Historique pour Undo
// - ✅ NEW: maxRounds stoppe vraiment la partie à la fin du dernier round
// ============================================

export type CricketTarget = number;
/** Cibles virtuelles du Cricket Étendu : 26 = DOUBLE, 27 = TRIPLE. */
export type Multiplier = 1 | 2 | 3;

export type CricketVariant = "classic" | "enculette";

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
  prevTurnPoints: number; // ✅ NEW (enculette)
  prevExtraMarks?: { double: number; triple: number; bed?: number };
  prevEliminatedIds?: string[];
  prevWildCard?: number | null;
  prevFinishOrder?: string[];
  specialChoice?: "number" | "special" | "bed";
};

export type CricketState = {
  players: CricketPlayerState[];
  variant: CricketVariant;
  /** 0 => pas d'objectif (fin aux rounds). Utilisé par variante enculette. */
  objective: number;
  /** Points accumulés sur la volée en cours (variante enculette). */
  turnPoints: number;
  currentPlayerIndex: number;
  remainingDarts: number;
  winnerId: string | null;
  withPoints: boolean;
  cutThroat: boolean;
  extended: boolean;
  /** Cibles du match, gelées au lancement (numéros réels + BULL et éventuels objectifs). */
  targets?: CricketTarget[];
  doubleOnly?: boolean;
  allowTripleMaster?: boolean;
  hiddenTargets?: boolean;
  sameBed?: boolean;
  exclusiveSpecial?: boolean;
  wildCard?: number | null;
  suddenDeathGap?: number;
  eliminatedIds?: string[];
  maxRounds: number;
  /** Continue après le premier vainqueur pour établir un classement complet. */
  continueToLast: boolean;
  finishOrder: string[];
  roundNumber: number;
  history: CricketHistoryEntry[];
};

export const CRICKET_TARGETS: CricketTarget[] = [20, 19, 18, 17, 16, 15, 25];
export const CRICKET_EXTENDED_TARGETS: CricketTarget[] = [...CRICKET_TARGETS, 26, 27];
export function cricketTargets(state: Pick<CricketState,"extended"|"targets">): CricketTarget[] { return state.targets?.length ? state.targets : (state.extended ? CRICKET_EXTENDED_TARGETS : CRICKET_TARGETS); }

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
    eliminatedIds: [...(state.eliminatedIds || [])],
    finishOrder: [...(state.finishOrder || [])],
  };
}

function isTargetValid(t: RawTarget): t is CricketTarget {
  return Number.isInteger(t) && ((t >= 1 && t <= 20) || t === 25 || t === 26 || t === 27 || t === 28);
}

function sumMarks(p: CricketPlayerState, extended = false, targets?: CricketTarget[]): number {
  return (targets ?? (extended ? CRICKET_EXTENDED_TARGETS : CRICKET_TARGETS)).reduce((acc, t) => acc + (p.marks[t] ?? 0), 0);
}

function closedCount(p: CricketPlayerState, extended = false, targets?: CricketTarget[]): number {
  return (targets ?? (extended ? CRICKET_EXTENDED_TARGETS : CRICKET_TARGETS)).reduce((acc, t) => acc + (isClosed(p.marks[t] ?? 0) ? 1 : 0), 0);
}

// ---------- Création match ----------

export type CreateCricketMatchOptions = {
  withPoints?: boolean;
  maxRounds?: number;
  continueToLast?: boolean;
  cutThroat?: boolean;
  variant?: CricketVariant;
  objective?: number;
  extended?: boolean;
  targets?: CricketTarget[];
  doubleOnly?: boolean;
  allowTripleMaster?: boolean;
  hiddenTargets?: boolean;
  sameBed?: boolean;
  exclusiveSpecial?: boolean;
  wildCard?: boolean;
  suddenDeathGap?: number;
};

export function createCricketMatch(
  players: { id: string; name: string }[],
  opts: CreateCricketMatchOptions = {}
): CricketState {
  const cutThroat = opts.cutThroat ?? false;
  const withPoints = (opts.withPoints ?? true) || cutThroat; // Cut-throat implique des points
  const maxRounds = opts.maxRounds ?? 20;

  const baseMarks: Record<CricketTarget, number> = {
    ...Object.fromEntries(Array.from({ length:20 }, (_,i)=>[i+1,0])),
    15: 0,
    16: 0,
    17: 0,
    18: 0,
    19: 0,
    20: 0,
    25: 0,
    26: 0,
    27: 0,
    28: 0,
  };

  const playerStates: CricketPlayerState[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    marks: { ...baseMarks },
    score: 0,
  }));

  return {
    players: playerStates,
    variant: opts.variant ?? "classic",
    objective: Math.max(0, Number(opts.objective ?? 0) || 0),
    turnPoints: 0,
    currentPlayerIndex: 0,
    remainingDarts: 3,
    winnerId: null,
    withPoints,
    cutThroat,
    extended: !!opts.extended,
    targets: opts.targets?.length ? [...opts.targets] : undefined,
    doubleOnly: !!opts.doubleOnly,
    allowTripleMaster: !!opts.allowTripleMaster,
    hiddenTargets: !!opts.hiddenTargets,
    sameBed: !!opts.sameBed,
    exclusiveSpecial: !!opts.exclusiveSpecial,
    wildCard: opts.wildCard ? (opts.targets || CRICKET_TARGETS).filter(t => t<=20)[Math.floor(Math.random()*(opts.targets || CRICKET_TARGETS).filter(t=>t<=20).length)] : null,
    suddenDeathGap: opts.suddenDeathGap || 0,
    eliminatedIds: [],
    maxRounds,
    continueToLast: !!opts.continueToLast,
    finishOrder: [],
    roundNumber: 1,
    history: [],
  };
}

// ---------- Calcul vainqueur "standard" (fermeture) ----------

function checkWinner(state: CricketState): string | null {
  // tous les joueurs qui ont tout fermé
  const activePlayers = state.players.filter(p => !(state.finishOrder || []).includes(p.id));
  const closedPlayers = activePlayers.filter((p) =>
    cricketTargets(state).every((t) => isClosed(p.marks[t] ?? 0))
  );
  if (closedPlayers.length === 0) return null;

  if (!state.withPoints) {
    // sans points : premier qui ferme tout gagne
    return closedPlayers[0].id;
  }

  // avec points : règles selon variante
  const bestCandidate = closedPlayers.reduce<CricketPlayerState | null>(
    (best, player) => {
      const otherScores = activePlayers
        .filter((p) => p.id !== player.id)
        .map((p) => p.score);
      const maxOther = otherScores.length ? Math.max(...otherScores) : Number.NEGATIVE_INFINITY;
      const minOther = otherScores.length ? Math.min(...otherScores) : Number.POSITIVE_INFINITY;

      if (state.cutThroat) {
        // Cut-throat : fermé + score <= aux autres (on cherche le plus petit score)
        if (player.score > minOther) return best;
        if (!best || player.score < best.score) return player;
        return best;
      }

      // Standard : fermé + score >= aux autres (on cherche le plus grand score)
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

  const ranked = state.players.filter(p=>!(state.eliminatedIds||[]).includes(p.id)).sort((a, b) => {
    // 1) si points -> score
    if (state.withPoints && b.score !== a.score) {
      return state.cutThroat ? (a.score - b.score) : (b.score - a.score);
    }

    // 2) nb de cibles fermées
    const bc = closedCount(b, state.extended, state.targets);
    const ac = closedCount(a, state.extended, state.targets);
    if (bc !== ac) return bc - ac;

    // 3) total marks
    const bm = sumMarks(b, state.extended, state.targets);
    const am = sumMarks(a, state.extended, state.targets);
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
  mult: Multiplier,
  bull50Choice?: "bull" | "double",
  specialChoice?: "number" | "special" | "bed"
): CricketState {
  if (state.winnerId) return state;
  if ((state.eliminatedIds||[]).includes(state.players[state.currentPlayerIndex]?.id)) return state;
  if ((state.finishOrder||[]).includes(state.players[state.currentPlayerIndex]?.id)) return state;

  const next = cloneState(state);
  const playerIndex = next.currentPlayerIndex;
  const player = next.players[playerIndex];

  const isValid = cricketTargets(state).includes(Number(target));
  const cricketTarget = isValid ? (target as CricketTarget) : null;

  const beforeMarks = cricketTarget ? player.marks[cricketTarget] ?? 0 : 0;
  const beforeScore = player.score;
  const beforeTurnPoints = next.turnPoints ?? 0;
  const beforeExtraMarks = state.extended ? { double: Number(player.marks[26] || 0), triple: Number(player.marks[27] || 0), bed: Number(player.marks[28] || 0) } : undefined;

  // ==================================================
  // VARIANTE ENCULETTE / VACHE
  // - Les marks ne comptent pas
  // - Chaque fléchette marque sa valeur (S/D/T) sur 15..20 + Bull(25/50)
  // - MISS (0..14) = 0
  // - Fin de volée: si total volée = 0 => -50, sinon +total
  // - Objectif optionnel: premier à l'atteindre gagne
  // - Fin maxRounds: meilleur score gagne
  // ==================================================
  if (next.variant === "enculette") {
    let dartPts = 0;
    if (cricketTarget) {
      const base = cricketTarget === 25 ? 25 : (cricketTarget as number);
      dartPts = base * mult;
    }

    next.history.push({
      playerIndex,
      target,
      mult,
      prevMarks: beforeMarks,
      prevScore: beforeScore,
      prevCurrentPlayerIndex: state.currentPlayerIndex,
      prevRemainingDarts: state.remainingDarts,
      prevWinnerId: state.winnerId,
      prevRoundNumber: state.roundNumber,
      prevTurnPoints: beforeTurnPoints,
      prevExtraMarks: beforeExtraMarks,
      prevEliminatedIds: [...(state.eliminatedIds||[])],
      prevWildCard: state.wildCard,
      prevFinishOrder: [...(state.finishOrder || [])],
      specialChoice,
    });

    next.turnPoints = beforeTurnPoints + dartPts;
    next.remainingDarts -= 1;

    const endOfTurn = next.remainingDarts <= 0;
    if (endOfTurn && !next.winnerId) {
      const visitTotal = next.turnPoints;
      const delta = visitTotal === 0 ? -50 : visitTotal;
      player.score += delta;
      next.turnPoints = 0;

      if (next.objective > 0 && player.score >= next.objective) {
        next.winnerId = player.id;
        next.remainingDarts = 0;
        return next;
      }

      const wasLastPlayer = next.currentPlayerIndex === next.players.length - 1;
      const wasLastRound = next.maxRounds > 0 && next.roundNumber >= next.maxRounds;

      next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
      next.remainingDarts = 3;

      if (wasLastPlayer) {
        next.roundNumber = next.maxRounds > 0 ? Math.min(next.roundNumber + 1, next.maxRounds) : next.roundNumber + 1;
      }

      if (wasLastPlayer && wasLastRound) {
        let best = -Infinity;
        let wid: string | null = null;
        for (const p of next.players) {
          if (p.score > best) {
            best = p.score;
            wid = p.id;
          }
        }
        next.winnerId = wid;
        next.remainingDarts = 0;
        return next;
      }
    }

    return next;
  }


  // DBULL50 dans le Cricket Étendu : choix exclusif entre
  // 2 marques BULL et 1 marque DOUBLE (3 doubles pour fermer DOUBLE).
  // Si BULL est fermé, attribution automatique à DOUBLE.
  const dbullExtended = next.extended && Number(target) === 25 && mult === 2;
  const bullAlreadyClosed = Number(player.marks[25] || 0) >= 3;
  const dbullToDouble = dbullExtended && (bullAlreadyClosed || bull50Choice === "double");

  // --- Marks + points seulement si cible Cricket (15..20 / Bull) ---
  if (cricketTarget && !dbullToDouble) {
    // CRICKET ÉTENDU : chaque objectif 15..20 et BULL demande
    // TROIS impacts distincts (une marque par fléchette réussie).
    // S20, D20 et T20 apportent chacun UNE marque au 20 ; D20/T20
    // ajoutent également UNE marque à DOUBLE/TRIPLE respectivement.
    // BULL25 rapporte 1 marque ; DBULL50 en rapporte 2 si choisi BULL.
    // Le CRICKET classique conserve ses multiplicateurs de marques.
    const acceptable = !next.doubleOnly || Number(target) === 25 || mult === 2 || (next.allowTripleMaster && mult === 3);
    const hitMarks = !acceptable || (next.exclusiveSpecial && specialChoice && specialChoice!=="number") ? 0 : next.doubleOnly ? 1 : next.extended ? (dbullExtended ? 2 : 1) : (next.wildCard === cricketTarget ? mult + 1 : mult);
    let newMarks = beforeMarks + hitMarks;
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
          const delta = surplusDelta * value;
          if (next.cutThroat) {
            // Cut-throat : points ajoutés aux adversaires qui n'ont pas fermé cette cible
            next.players.forEach((opp, idx) => {
              if (idx === playerIndex) return;
              const oppMarks = opp.marks[cricketTarget] ?? 0;
              if (!isClosed(oppMarks)) opp.score += delta;
            });
          } else {
            player.score += delta;
          }
        }
      }
    }
  }
  // si 0..14 : on ne touche à rien, ce sera un MISS "pur"

  // Cricket Étendu : chaque DOUBLE ou TRIPLE sur les secteurs 1..20
  // ajoute UNE marque à son objectif dédié. DBULL peut être attribué à DOUBLE.
  // Sur 15..20 la cible numérique progresse en parallèle.
  if (next.extended) {
    if ((Number(target) >= 1 && Number(target) <= 20 && mult === 2 && (!next.exclusiveSpecial || specialChoice==="special")) || dbullToDouble) {
      player.marks[26] = Math.min(3, Number(player.marks[26] || 0) + 1);
    }
    if (Number(target) >= 1 && Number(target) <= 20 && mult === 3 && (!next.exclusiveSpecial || specialChoice==="special")) {
      player.marks[27] = Math.min(3, Number(player.marks[27] || 0) + 1);
    }
  }

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
    prevTurnPoints: beforeTurnPoints,
    prevExtraMarks: beforeExtraMarks,
      prevEliminatedIds: [...(state.eliminatedIds||[])],
      prevWildCard: state.wildCard,
      prevFinishOrder: [...(state.finishOrder || [])],
      specialChoice,
  });

  // MICKEY MOUSE : 3 fléchettes dans le même lit (numéro ET anneau)
  // pendant une volée complète ajoutent une marque à la ligne BED.
  if (next.sameBed && next.remainingDarts === 1) {
    const visit = next.history.slice(-3);
    if (visit.length === 3 && visit.every(h => h.playerIndex===playerIndex && h.target===target && h.mult===mult && (!next.exclusiveSpecial || h.specialChoice==='bed'))
      && Number(target)>=1 && Number(target)<=20) {
      player.marks[28] = Math.min(3,Number(player.marks[28]||0)+1);
    }
  }
  // Mort subite : l'écart de score élimine le joueur distancé.
  if ((next.suddenDeathGap||0)>0 && next.withPoints) {
    const leader = Math.max(...next.players.filter(p=>!(next.eliminatedIds||[]).includes(p.id)).map(p=>p.score));
    for(const p of next.players) if(!(next.eliminatedIds||[]).includes(p.id) && leader - p.score >= (next.suddenDeathGap||100)) next.eliminatedIds!.push(p.id);
    const survivors = next.players.filter(p=>!next.eliminatedIds!.includes(p.id));
    if(survivors.length===1){next.winnerId=survivors[0].id;next.remainingDarts=0;return next;}
  }

  // --- Consommation fléchette + passage joueur / round ---
  next.remainingDarts -= 1;

  const endOfTurn = next.remainingDarts <= 0;

  if (endOfTurn && !next.winnerId) {
    const wasLastPlayer = next.currentPlayerIndex === next.players.length - 1;
    const wasLastRound = next.maxRounds > 0 && next.roundNumber >= next.maxRounds;

    // passage joueur
    next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
    for(let i=0;i<next.players.length && (next.eliminatedIds?.includes(next.players[next.currentPlayerIndex].id) || next.finishOrder?.includes(next.players[next.currentPlayerIndex].id));i++)
      next.currentPlayerIndex=(next.currentPlayerIndex+1)%next.players.length;
    next.remainingDarts = 3;

    // si on boucle (dernier joueur -> premier), on incrémente le round (sans dépasser max)
    if (wasLastPlayer) {
      next.roundNumber = next.maxRounds > 0 ? Math.min(next.roundNumber + 1, next.maxRounds) : next.roundNumber + 1;
      if(next.wildCard!=null) {
        const candidates=cricketTargets(next).filter(t=>t>=1&&t<=20);
        next.wildCard=candidates[Math.floor(Math.random()*candidates.length)] ?? null;
      }
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
  if (cricketTarget || dbullToDouble || (next.extended && Number(target) >= 1 && Number(target) <= 20 && (mult === 2 || mult === 3))) {
    const winner = checkWinner(next);
    if (winner) {
      if (next.continueToLast && next.variant !== "enculette") {
        if (!next.finishOrder.includes(winner)) next.finishOrder.push(winner);
        if (next.finishOrder.length === next.players.length) {
          next.winnerId = next.finishOrder[0] || winner;
          next.remainingDarts = 0;
        } else {
          // Le joueur classé quitte la rotation, les autres continuent.
          const previousIndex = next.currentPlayerIndex;
          // En fin de volée, le moteur a déjà avancé au participant suivant.
          if (endOfTurn) next.currentPlayerIndex = (next.currentPlayerIndex + next.players.length - 1) % next.players.length;
          for (let i = 0; i < next.players.length; i++) {
            next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
            if (!next.finishOrder.includes(next.players[next.currentPlayerIndex].id)
              && !(next.eliminatedIds || []).includes(next.players[next.currentPlayerIndex].id)) break;
          }
          if (!endOfTurn && next.currentPlayerIndex <= previousIndex) next.roundNumber += 1;
          next.remainingDarts = 3;
        }
      } else {
        next.winnerId = winner;
        next.remainingDarts = 0;
      }
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
  if (isTargetValid(entry.target) && cricketTargets(next).includes(Number(entry.target))) {
    player.marks[entry.target] = entry.prevMarks;
  }
  if (entry.prevExtraMarks) {
    player.marks[26] = entry.prevExtraMarks.double;
    player.marks[27] = entry.prevExtraMarks.triple;
    if(entry.prevExtraMarks.bed != null) player.marks[28]=entry.prevExtraMarks.bed;
  }
  player.score = entry.prevScore;

  next.currentPlayerIndex = entry.prevCurrentPlayerIndex;
  next.remainingDarts = entry.prevRemainingDarts;
  next.winnerId = entry.prevWinnerId;
  next.roundNumber = entry.prevRoundNumber; // ✅ NEW
  next.turnPoints = entry.prevTurnPoints ?? 0;
  if(entry.prevEliminatedIds) next.eliminatedIds = [...entry.prevEliminatedIds];
  next.wildCard = entry.prevWildCard ?? null;
  next.finishOrder = [...(entry.prevFinishOrder || [])];

  return next;
}
