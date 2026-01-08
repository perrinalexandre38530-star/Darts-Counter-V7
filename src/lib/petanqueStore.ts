// ============================================
// src/lib/petanqueStore.ts
// Pétanque — MVP store autonome (localStorage)
// + ✅ Mesurage (distance cochonnet -> boules) persisté
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

export type PetanqueState = {
  gameId: string;
  createdAt: number;

  teamA: string;
  teamB: string;

  scoreA: number;
  scoreB: number;

  ends: PetanqueEnd[];

  // ✅ NEW: historique des mesurages (dernier en premier)
  measurements: PetanqueMeasurement[];

  target: number; // ex: 13
  finished: boolean;
  winner: PetanqueTeamId | null;
};

const LS_KEY = "dc-petanque-game-v1";

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createNewPetanqueGame(prev?: Partial<PetanqueState>): PetanqueState {
  return {
    gameId: uid(),
    createdAt: Date.now(),
    teamA: prev?.teamA ?? "Équipe A",
    teamB: prev?.teamB ?? "Équipe B",
    scoreA: 0,
    scoreB: 0,
    ends: [],
    measurements: Array.isArray(prev?.measurements) ? prev!.measurements! : [],
    target: Number(prev?.target ?? 13),
    finished: false,
    winner: null,
  };
}

export function loadPetanqueState(): PetanqueState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return createNewPetanqueGame();
    const s = JSON.parse(raw) as PetanqueState;
    if (!s || typeof s !== "object") return createNewPetanqueGame();

    if (!Array.isArray((s as any).ends)) (s as any).ends = [];
    if (!Array.isArray((s as any).measurements)) (s as any).measurements = [];
    if (!s.target) s.target = 13;

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
  const next = {
    ...state,
    teamA: teamA?.trim() || "Équipe A",
    teamB: teamB?.trim() || "Équipe B",
  };
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

export function addEnd(state: PetanqueState, winner: PetanqueTeamId, points: number): PetanqueState {
  if (state.finished) return state;

  const pts = Math.max(0, Math.min(6, Math.floor(Number(points) || 0)));
  const end: PetanqueEnd = { id: uid(), at: Date.now(), winner, points: pts };

  let scoreA = state.scoreA;
  let scoreB = state.scoreB;
  if (winner === "A") scoreA += pts;
  else scoreB += pts;

  const target = Math.max(1, Math.floor(Number(state.target) || 13));
  let finished = false;
  let win: PetanqueTeamId | null = null;

  if (scoreA >= target || scoreB >= target) {
    finished = true;
    win = scoreA >= target ? "A" : "B";
  }

  const next: PetanqueState = {
    ...state,
    scoreA,
    scoreB,
    target,
    ends: [end, ...state.ends],
    finished,
    winner: win,
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
