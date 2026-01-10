// ============================================
// src/lib/petanqueStore.ts
// Pétanque — MVP store autonome (localStorage)
// + ✅ Mesurage (distance cochonnet -> boules) persisté
// + ✅ FIX: ne jamais "reprendre" une partie terminée
// + ✅ NEW: statut explicite (active/finished) + finishAt
// ============================================

export type PetanqueTeamId = "A" | "B";

export type PetanqueEnd = {
  id: string;
  at: number;
  winner: PetanqueTeamId;
  points: number; // 0..6
};

// ✅ NEW: Mesurage
export type PetanqueMeasurementWinner = PetanqueTeamId | "TIE";

export type PetanqueMeasurement = {
  id: string;
  at: number; // timestamp
  dA: number; // distance cochonnet -> boule A (cm)
  dB: number; // distance cochonnet -> boule B (cm)
  winner: PetanqueMeasurementWinner;
  delta: number; // |dA - dB|
  tol: number; // tolérance utilisée (cm)
  note?: string;
};

export type PetanqueGameStatus = "active" | "finished";

export type PetanqueState = {
  gameId: string;
  createdAt: number;

  // ✅ NEW: gestion "partie active vs terminée"
  status: PetanqueGameStatus;
  finishedAt?: number;

  teamA: string;
  teamB: string;

  scoreA: number;
  scoreB: number;

  ends: PetanqueEnd[];

  // ✅ NEW: historique des mesurages (dernier en premier)
  measurements: PetanqueMeasurement[];

  target: number; // ex: 13
  // Back-compat
  finished: boolean;
  winner: PetanqueTeamId | null;
};

const LS_KEY = "dc-petanque-game-v1";

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeState(s: any): PetanqueState {
  const base = createNewPetanqueGame();

  const gameId = typeof s?.gameId === "string" && s.gameId ? s.gameId : base.gameId;
  const createdAt = Number.isFinite(Number(s?.createdAt)) ? Number(s.createdAt) : base.createdAt;

  const teamA = (typeof s?.teamA === "string" ? s.teamA : base.teamA) || "Équipe A";
  const teamB = (typeof s?.teamB === "string" ? s.teamB : base.teamB) || "Équipe B";

  const scoreA = Math.max(0, Math.floor(Number(s?.scoreA) || 0));
  const scoreB = Math.max(0, Math.floor(Number(s?.scoreB) || 0));

  const ends = Array.isArray(s?.ends) ? (s.ends as PetanqueEnd[]) : [];
  const measurements = Array.isArray(s?.measurements) ? (s.measurements as PetanqueMeasurement[]) : [];

  const target = Math.max(1, Math.floor(Number(s?.target) || 13));

  // Back-compat: "finished" existait déjà
  const finishedLegacy = Boolean(s?.finished);
  const winner = (s?.winner === "A" || s?.winner === "B") ? (s.winner as PetanqueTeamId) : null;

  // ✅ NEW: status est la source de vérité
  const status: PetanqueGameStatus =
    s?.status === "active" || s?.status === "finished"
      ? (s.status as PetanqueGameStatus)
      : finishedLegacy
      ? "finished"
      : "active";

  const finishedAt =
    Number.isFinite(Number(s?.finishedAt)) ? Number(s.finishedAt) : status === "finished" ? Date.now() : undefined;

  const finished = status === "finished";

  return {
    gameId,
    createdAt,
    status,
    finishedAt,
    teamA: teamA.trim() || "Équipe A",
    teamB: teamB.trim() || "Équipe B",
    scoreA,
    scoreB,
    ends,
    measurements,
    target,
    finished,
    winner: finished ? winner : null,
  };
}

export function createNewPetanqueGame(prev?: Partial<PetanqueState>): PetanqueState {
  const target = Math.max(1, Math.floor(Number(prev?.target ?? 13) || 13));

  return {
    gameId: uid(),
    createdAt: Date.now(),

    status: "active",
    finishedAt: undefined,

    teamA: prev?.teamA ?? "Équipe A",
    teamB: prev?.teamB ?? "Équipe B",

    scoreA: 0,
    scoreB: 0,

    ends: [],
    measurements: Array.isArray(prev?.measurements) ? prev!.measurements! : [],

    target,
    finished: false,
    winner: null,
  };
}

/**
 * ✅ FIX: si la dernière partie est terminée => on ne la recharge pas, on crée une nouvelle partie.
 * Cela évite le bug "je relance une partie et je retombe sur 12-14".
 */
export function loadPetanqueState(): PetanqueState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return createNewPetanqueGame();

    const parsed = JSON.parse(raw);
    const s = normalizeState(parsed);

    // ✅ règle: ne jamais reprendre une partie terminée
    if (s.status === "finished" || s.finished) {
      // On repart propre, en conservant uniquement les préférences (noms/target)
      const fresh = createNewPetanqueGame({
        teamA: s.teamA,
        teamB: s.teamB,
        target: s.target,
        measurements: [], // nouvelle partie => pas d’historique mesurage
      });
      savePetanqueState(fresh);
      return fresh;
    }

    return s;
  } catch {
    return createNewPetanqueGame();
  }
}

export function savePetanqueState(state: PetanqueState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export function setTeamNames(state: PetanqueState, teamA: string, teamB: string): PetanqueState {
  const next: PetanqueState = {
    ...state,
    teamA: teamA?.trim() || "Équipe A",
    teamB: teamB?.trim() || "Équipe B",
  };
  savePetanqueState(next);
  return next;
}

export function setTargetScore(state: PetanqueState, target: number): PetanqueState {
  const t = Math.max(1, Math.floor(Number(target) || 13));
  const next: PetanqueState = { ...state, target: t };
  savePetanqueState(next);
  return next;
}

export function resetPetanque(state?: PetanqueState): PetanqueState {
  const next = createNewPetanqueGame(
    state
      ? {
          teamA: state.teamA,
          teamB: state.teamB,
          target: state.target,
          // on repart sur une nouvelle partie -> on vide les mènes et les mesurages
          measurements: [],
        }
      : undefined
  );
  savePetanqueState(next);
  return next;
}

/**
 * ✅ NEW: force la fin de match (utile si tu as un bouton "Terminer")
 * - Ne permet plus d'ajouter des mènes ensuite
 */
export function finishPetanque(state: PetanqueState, winner: PetanqueTeamId | null): PetanqueState {
  const next: PetanqueState = {
    ...state,
    status: "finished",
    finishedAt: Date.now(),
    finished: true,
    winner,
  };
  savePetanqueState(next);
  return next;
}

/**
 * ✅ FIN DE MATCH (centrale)
 * Déduit automatiquement le vainqueur à partir des scores et de la cible.
 * 
 * Règles:
 * - Si déjà finished => no-op
 * - Si aucun score n'atteint la target => no-op
 * - Si les deux dépassent (rare) => prend le score le plus élevé
 */
export function finishPetanqueMatch(state: PetanqueState): PetanqueState {
  if (state.status === "finished" || state.finished) return state;

  const target = Math.max(1, Number(state.target) || 13);
  const a = Number(state.scoreA) || 0;
  const b = Number(state.scoreB) || 0;

  if (a < target && b < target) return state;

  const winner: PetanqueTeamId | null = a === b ? null : a > b ? "A" : "B";
  return finishPetanque({ ...state, target }, winner);
}

export function addEnd(state: PetanqueState, winner: PetanqueTeamId, points: number): PetanqueState {
  // ✅ blocage si match terminé (status est prioritaire)
  if (state.status === "finished" || state.finished) return state;

  const pts = Math.max(0, Math.min(6, Math.floor(Number(points) || 0)));
  const end: PetanqueEnd = { id: uid(), at: Date.now(), winner, points: pts };

  let scoreA = state.scoreA;
  let scoreB = state.scoreB;
  if (winner === "A") scoreA += pts;
  else scoreB += pts;

  const target = Math.max(1, Math.floor(Number(state.target) || 13));

  const next: PetanqueState = {
    ...state,
    scoreA,
    scoreB,
    target,
    ends: [end, ...state.ends],

    // ✅ IMPORTANT: la FIN DE MATCH est gérée ailleurs (finishPetanqueMatch)
    // Ici on se contente d'ajouter la mène + persister l'état.
  };

  savePetanqueState(next);
  return next;
}

export function undoLastEnd(state: PetanqueState): PetanqueState {
  if (!state.ends.length) return state;
  const [last, ...rest] = state.ends;

  let scoreA = state.scoreA;
  let scoreB = state.scoreB;
  if (last.winner === "A") scoreA = Math.max(0, scoreA - last.points);
  else scoreB = Math.max(0, scoreB - last.points);

  const next: PetanqueState = {
    ...state,
    scoreA,
    scoreB,
    ends: rest,

    // ✅ si on annule, on repasse en actif
    status: "active",
    finishedAt: undefined,
    finished: false,
    winner: null,
  };

  savePetanqueState(next);
  return next;
}

// ============================================
// ✅ MESURAGE — Actions
// ============================================

export function addMeasurement(
  state: PetanqueState,
  input: { dA: number; dB: number; tol: number; note?: string }
): PetanqueState {
  const dA = Number(input.dA);
  const dB = Number(input.dB);
  const tol = Math.max(0, Number(input.tol) || 0);

  // garde-fou
  if (!Number.isFinite(dA) || !Number.isFinite(dB) || dA < 0 || dB < 0) return state;

  const delta = Math.abs(dA - dB);
  const winner: PetanqueMeasurementWinner = delta <= tol ? "TIE" : dA < dB ? "A" : "B";

  const m: PetanqueMeasurement = {
    id: uid(),
    at: Date.now(),
    dA,
    dB,
    tol,
    delta,
    winner,
    note: input.note?.trim() ? input.note.trim() : undefined,
  };

  const next: PetanqueState = {
    ...state,
    measurements: [m, ...(state.measurements ?? [])],
  };

  savePetanqueState(next);
  return next;
}

export function undoLastMeasurement(state: PetanqueState): PetanqueState {
  const cur = state.measurements ?? [];
  if (!cur.length) return state;

  const next: PetanqueState = {
    ...state,
    measurements: cur.slice(1),
  };

  savePetanqueState(next);
  return next;
}
