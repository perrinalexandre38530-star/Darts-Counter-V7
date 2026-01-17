// =============================================================
// src/lib/pingpongStore.ts
// Ping-Pong (LOCAL ONLY)
// - Stocke l'état de match en localStorage
// - Gestion des sets (best-of) + points par set
// - Aucun lien avec Online/Supabase
// =============================================================

export type PingPongSideId = "A" | "B";

export type PingPongMode = "simple" | "sets" | "tournante";

export type PingPongState = {
  matchId: string;
  createdAt: number;
  updatedAt: number;

  sideA: string;
  sideB: string;

  // mode
  mode: PingPongMode;

  // configuration
  pointsPerSet: number; // 11 par défaut
  setsToWin: number; // 3 => best-of-5
  winByTwo: boolean; // true par défaut

  // tournante
  tournantePlayers: string[];
  tournanteEliminated: string[];
  tournanteFinished: boolean;
  tournanteWinner: string | null;

  // état
  setIndex: number; // 1..N (affichage)
  pointsA: number;
  pointsB: number;
  setsA: number;
  setsB: number;
  finished: boolean;
  winner: PingPongSideId | null;

  // undo simple (pile de snapshots)
  undo: Array<Pick<PingPongState,
    | "updatedAt"
    | "setIndex"
    | "pointsA"
    | "pointsB"
    | "setsA"
    | "setsB"
    | "finished"
    | "winner"
  >>;
};

const LS_KEY = "dc-pingpong-state";

function now() {
  return Date.now();
}

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function newPingPongState(partial?: Partial<PingPongState>): PingPongState {
  const t = now();
  const id = (globalThis as any)?.crypto?.randomUUID?.() ?? `pingpong-${t}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    matchId: id,
    createdAt: t,
    updatedAt: t,
    sideA: "Joueur A",
    sideB: "Joueur B",
    mode: "sets",
    pointsPerSet: 11,
    setsToWin: 3,
    winByTwo: true,

    tournantePlayers: [],
    tournanteEliminated: [],
    tournanteFinished: false,
    tournanteWinner: null,
    setIndex: 1,
    pointsA: 0,
    pointsB: 0,
    setsA: 0,
    setsB: 0,
    finished: false,
    winner: null,
    undo: [],
    ...(partial || {}),
  };
}

export function loadPingPongState(): PingPongState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return newPingPongState();
    const parsed = JSON.parse(raw);
    // normalisation (robuste aux versions)
    const mode: PingPongMode = parsed?.mode === "tournante" ? "tournante" : parsed?.mode === "simple" ? "simple" : "sets";
    const tournantePlayers = Array.isArray(parsed?.tournantePlayers)
      ? parsed.tournantePlayers.map((s: any) => String(s || "").trim()).filter(Boolean)
      : [];
    const tournanteEliminated = Array.isArray(parsed?.tournanteEliminated)
      ? parsed.tournanteEliminated.map((s: any) => String(s || "").trim()).filter(Boolean)
      : [];

    return newPingPongState({
      ...(parsed || {}),
      mode,
      pointsPerSet: clampInt(parsed?.pointsPerSet, 5, 99, 11),
      setsToWin: clampInt(parsed?.setsToWin, 1, 9, 3),
      winByTwo: parsed?.winByTwo !== false,
      tournantePlayers,
      tournanteEliminated,
      tournanteFinished: !!parsed?.tournanteFinished,
      tournanteWinner: typeof parsed?.tournanteWinner === "string" ? parsed.tournanteWinner : null,
    });
  } catch {
    return newPingPongState();
  }
}

export function savePingPongState(st: PingPongState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  } catch {}
}

export function resetPingPong(prev?: PingPongState) {
  const next = newPingPongState({
    sideA: prev?.sideA ?? "Joueur A",
    sideB: prev?.sideB ?? "Joueur B",
    mode: prev?.mode ?? "sets",
    pointsPerSet: clampInt(prev?.pointsPerSet, 5, 99, 11),
    setsToWin: clampInt(prev?.setsToWin, 1, 9, 3),
    winByTwo: prev?.winByTwo !== false,
    tournantePlayers: Array.isArray(prev?.tournantePlayers) ? prev!.tournantePlayers : [],
    tournanteEliminated: [],
    tournanteFinished: false,
    tournanteWinner: null,
  });
  savePingPongState(next);
  return next;
}

export function setConfig(
  st: PingPongState,
  mode: PingPongMode,
  sideA: string,
  sideB: string,
  pointsPerSet: number,
  setsToWin: number,
  winByTwo: boolean,
  tournantePlayers?: string[]
) {
  const next: PingPongState = {
    ...st,
    mode: mode || "sets",
    sideA: (sideA || "Joueur A").trim(),
    sideB: (sideB || "Joueur B").trim(),
    pointsPerSet: clampInt(pointsPerSet, 5, 99, 11),
    setsToWin: clampInt(setsToWin, 1, 9, 3),
    winByTwo: winByTwo !== false,
    tournantePlayers: Array.isArray(tournantePlayers)
      ? tournantePlayers.map((s) => String(s || "").trim()).filter(Boolean)
      : st.tournantePlayers,
    tournanteEliminated: [],
    tournanteFinished: false,
    tournanteWinner: null,
    updatedAt: now(),
  };
  savePingPongState(next);
  return next;
}

export function tournanteEliminate(st: PingPongState, name: string) {
  if (st.mode !== "tournante") return st;
  const n = String(name || "").trim();
  if (!n) return st;
  if (!Array.isArray(st.tournantePlayers) || st.tournantePlayers.length < 2) return st;
  if (!st.tournantePlayers.includes(n)) return st;

  const players = st.tournantePlayers.filter((p) => p !== n);
  const eliminated = [...(st.tournanteEliminated || []), n];
  const finished = players.length <= 1;
  const winner = finished ? (players[0] || null) : null;

  const next: PingPongState = {
    ...st,
    tournantePlayers: players,
    tournanteEliminated: eliminated,
    tournanteFinished: finished,
    tournanteWinner: winner,
    finished: finished,
    winner: null,
    updatedAt: now(),
  };
  savePingPongState(next);
  return next;
}

function isSetWon(pointsA: number, pointsB: number, pointsPerSet: number, winByTwo: boolean) {
  const max = Math.max(pointsA, pointsB);
  const diff = Math.abs(pointsA - pointsB);
  if (max < pointsPerSet) return null as PingPongSideId | null;
  if (winByTwo && diff < 2) return null;
  return pointsA > pointsB ? "A" : pointsB > pointsA ? "B" : null;
}

export function addPoint(st: PingPongState, side: PingPongSideId, delta: 1 | -1) {
  if (st.mode === "tournante") return st;
  const snapshot = {
    updatedAt: st.updatedAt,
    setIndex: st.setIndex,
    pointsA: st.pointsA,
    pointsB: st.pointsB,
    setsA: st.setsA,
    setsB: st.setsB,
    finished: st.finished,
    winner: st.winner,
  };

  let pointsA = st.pointsA;
  let pointsB = st.pointsB;
  if (side === "A") pointsA = Math.max(0, pointsA + delta);
  else pointsB = Math.max(0, pointsB + delta);

  let setsA = st.setsA;
  let setsB = st.setsB;
  let setIndex = st.setIndex;
  let finished = st.finished;
  let winner: PingPongSideId | null = st.winner;

  // Si on modifie à la baisse et que le match était terminé, on rouvre.
  if (delta === -1) {
    finished = false;
    winner = null;
  }

  const pointWinner = isSetWon(pointsA, pointsB, st.pointsPerSet, st.winByTwo);
  if (!finished && pointWinner) {
    if (st.mode === "simple") {
      finished = true;
      winner = pointWinner;
    } else {
      // mode "sets"
      if (pointWinner === "A") setsA += 1;
      else setsB += 1;

      // set suivant
      pointsA = 0;
      pointsB = 0;
      setIndex += 1;

      if (setsA >= st.setsToWin || setsB >= st.setsToWin) {
        finished = true;
        winner = setsA > setsB ? "A" : "B";
      }
    }
  }

  const next: PingPongState = {
    ...st,
    pointsA,
    pointsB,
    setsA,
    setsB,
    setIndex,
    finished,
    winner,
    updatedAt: now(),
    undo: [snapshot, ...(st.undo || [])].slice(0, 250),
  };

  savePingPongState(next);
  return next;
}

export function undo(st: PingPongState) {
  const u = (st.undo || [])[0];
  if (!u) return st;
  const next: PingPongState = {
    ...st,
    setIndex: u.setIndex,
    pointsA: u.pointsA,
    pointsB: u.pointsB,
    setsA: u.setsA,
    setsB: u.setsB,
    finished: u.finished,
    winner: u.winner,
    updatedAt: now(),
    undo: (st.undo || []).slice(1),
  };
  savePingPongState(next);
  return next;
}
