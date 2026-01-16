// =============================================================
// src/lib/babyfootStore.ts
// Baby-Foot (LOCAL ONLY)
// - Stocke l'état de match en localStorage
// - Aucun lien avec Online/Supabase
// =============================================================

export type BabyFootTeamId = "A" | "B";

export type BabyFootState = {
  matchId: string;
  createdAt: number;
  updatedAt: number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  target: number; // score cible
  finished: boolean;
  winner: BabyFootTeamId | null;
  // undo simple (pile de snapshots)
  undo: Array<Pick<BabyFootState, "scoreA" | "scoreB" | "finished" | "winner" | "updatedAt">>;
};

const LS_KEY = "dc-babyfoot-state";

function now() {
  return Date.now();
}

export function newBabyFootState(partial?: Partial<BabyFootState>): BabyFootState {
  const t = now();
  const id =
    (globalThis as any)?.crypto?.randomUUID?.() ?? `babyfoot-${t}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    matchId: id,
    createdAt: t,
    updatedAt: t,
    teamA: "Équipe A",
    teamB: "Équipe B",
    scoreA: 0,
    scoreB: 0,
    target: 10,
    finished: false,
    winner: null,
    undo: [],
    ...(partial || {}),
  };
}

export function loadBabyFootState(): BabyFootState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return newBabyFootState();
    const parsed = JSON.parse(raw);
    return newBabyFootState({ ...(parsed || {}) });
  } catch {
    return newBabyFootState();
  }
}

export function saveBabyFootState(st: BabyFootState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  } catch {}
}

export function resetBabyFoot(prev?: BabyFootState) {
  const next = newBabyFootState({
    teamA: prev?.teamA ?? "Équipe A",
    teamB: prev?.teamB ?? "Équipe B",
    target: prev?.target ?? 10,
  });
  saveBabyFootState(next);
  return next;
}

export function setTeams(st: BabyFootState, teamA: string, teamB: string, target: number) {
  const next: BabyFootState = {
    ...st,
    teamA: (teamA || "Équipe A").trim(),
    teamB: (teamB || "Équipe B").trim(),
    target: Math.max(1, Math.min(99, Number(target) || 10)),
    updatedAt: now(),
  };
  saveBabyFootState(next);
  return next;
}

export function addGoal(st: BabyFootState, team: BabyFootTeamId, delta: 1 | -1) {
  const snapshot = {
    scoreA: st.scoreA,
    scoreB: st.scoreB,
    finished: st.finished,
    winner: st.winner,
    updatedAt: st.updatedAt,
  };

  let scoreA = st.scoreA;
  let scoreB = st.scoreB;
  if (team === "A") scoreA = Math.max(0, scoreA + delta);
  else scoreB = Math.max(0, scoreB + delta);

  let finished = false;
  let winner: BabyFootTeamId | null = null;
  if (scoreA >= st.target || scoreB >= st.target) {
    finished = true;
    winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;
  }

  const next: BabyFootState = {
    ...st,
    scoreA,
    scoreB,
    finished,
    winner,
    updatedAt: now(),
    undo: [snapshot, ...(st.undo || [])].slice(0, 200),
  };

  saveBabyFootState(next);
  return next;
}

export function undo(st: BabyFootState) {
  const u = (st.undo || [])[0];
  if (!u) return st;
  const next: BabyFootState = {
    ...st,
    scoreA: u.scoreA,
    scoreB: u.scoreB,
    finished: u.finished,
    winner: u.winner,
    updatedAt: now(),
    undo: (st.undo || []).slice(1),
  };
  saveBabyFootState(next);
  return next;
}
