// =============================================================
// src/lib/pingpongStore.ts
// Ping-Pong (LOCAL ONLY)
// - Stocke l'état de match en localStorage
// - Gestion des sets (best-of) + points par set
// - Mode TOURNANTE: duel en 1 set, perdant éliminé, vainqueur reste
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
  tournantePlayers: string[]; // tous les joueurs inscrits (optionnel / legacy)
  tournanteQueue: string[]; // challengers restants (hors 2 actifs)
  tournanteActiveA: string | null; // joueur côté A (vainqueur restant)
  tournanteActiveB: string | null; // joueur côté B (challenger)
  tournanteEliminated: string[];
  tournanteFinished: boolean;
  tournanteWinner: string | null;

  // état (sets/simple)
  setIndex: number; // 1..N (affichage)
  pointsA: number;
  pointsB: number;
  setsA: number;
  setsB: number;
  finished: boolean;
  winner: PingPongSideId | null;

  // undo (pile de snapshots) — inclut aussi la tournante
  undo: Array<Pick<
    PingPongState,
    | "updatedAt"
    | "setIndex"
    | "pointsA"
    | "pointsB"
    | "setsA"
    | "setsB"
    | "finished"
    | "winner"
    | "tournanteQueue"
    | "tournanteActiveA"
    | "tournanteActiveB"
    | "tournanteEliminated"
    | "tournanteFinished"
    | "tournanteWinner"
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

function uniqNames(arr: any): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of Array.isArray(arr) ? arr : []) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export function newPingPongState(partial?: Partial<PingPongState>): PingPongState {
  const t = now();
  const id =
    (globalThis as any)?.crypto?.randomUUID?.() ??
    `pingpong-${t}-${Math.random().toString(36).slice(2, 8)}`;

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
    tournanteQueue: [],
    tournanteActiveA: null,
    tournanteActiveB: null,
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

    const mode: PingPongMode =
      parsed?.mode === "tournante" ? "tournante" : parsed?.mode === "simple" ? "simple" : "sets";

    const tournantePlayers = uniqNames(parsed?.tournantePlayers);
    const tournanteEliminated = uniqNames(parsed?.tournanteEliminated);
    const tournanteQueue = uniqNames(parsed?.tournanteQueue);

    const tournanteActiveA = typeof parsed?.tournanteActiveA === "string" ? parsed.tournanteActiveA : null;
    const tournanteActiveB = typeof parsed?.tournanteActiveB === "string" ? parsed.tournanteActiveB : null;

    const st = newPingPongState({
      ...(parsed || {}),
      mode,
      pointsPerSet: clampInt(parsed?.pointsPerSet, 5, 99, 11),
      setsToWin: clampInt(parsed?.setsToWin, 1, 9, 3),
      winByTwo: parsed?.winByTwo !== false,

      tournantePlayers,
      tournanteQueue,
      tournanteActiveA,
      tournanteActiveB,
      tournanteEliminated,
      tournanteFinished: !!parsed?.tournanteFinished,
      tournanteWinner: typeof parsed?.tournanteWinner === "string" ? parsed.tournanteWinner : null,
    });

    // ✅ Compat: anciennes versions n'avaient pas active/queue. On dérive si possible.
    if (st.mode === "tournante" && (!st.tournanteActiveA || !st.tournanteActiveB)) {
      const base = uniqNames(st.tournantePlayers);
      const alive = base.filter((p) => !st.tournanteEliminated.includes(p));
      const a = st.tournanteActiveA ?? alive[0] ?? null;
      const b = st.tournanteActiveB ?? alive[1] ?? null;
      const rest = alive.filter((p) => p !== a && p !== b);
      return {
        ...st,
        tournanteActiveA: a,
        tournanteActiveB: b,
        tournanteQueue: st.tournanteQueue.length ? st.tournanteQueue : rest,
      };
    }

    return st;
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
    tournanteQueue: Array.isArray(prev?.tournanteQueue) ? prev!.tournanteQueue : [],
    tournanteActiveA: prev?.tournanteActiveA ?? null,
    tournanteActiveB: prev?.tournanteActiveB ?? null,
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
  const nextBase: PingPongState = {
    ...st,
    mode: mode || "sets",
    sideA: (sideA || "Joueur A").trim(),
    sideB: (sideB || "Joueur B").trim(),
    pointsPerSet: clampInt(pointsPerSet, 5, 99, 11),
    setsToWin: clampInt(setsToWin, 1, 9, 3),
    winByTwo: winByTwo !== false,
    updatedAt: now(),
  };

  // ✅ Mode tournante : initialise duel + file
  if ((mode || "sets") === "tournante") {
    const players = uniqNames(tournantePlayers);
    const a = players[0] ?? null;
    const b = players[1] ?? null;
    const q = players.slice(2);

    const finished = players.length <= 1;
    const winnerName = finished ? (players[0] ?? null) : null;

    const next: PingPongState = {
      ...nextBase,
      tournantePlayers: players,
      tournanteQueue: q,
      tournanteActiveA: a,
      tournanteActiveB: b,
      tournanteEliminated: [],
      tournanteFinished: finished,
      tournanteWinner: winnerName,
      setIndex: 1,
      pointsA: 0,
      pointsB: 0,
      setsA: 0,
      setsB: 0,
      finished,
      winner: null,
      undo: [],
    };
    savePingPongState(next);
    return next;
  }

  // ✅ Modes sets/simple
  const next: PingPongState = {
    ...nextBase,
    tournantePlayers: Array.isArray(tournantePlayers) ? uniqNames(tournantePlayers) : st.tournantePlayers,
    tournanteQueue: [],
    tournanteActiveA: null,
    tournanteActiveB: null,
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
  };
  savePingPongState(next);
  return next;
}

// Legacy helper (UI "éliminer") — on conserve
export function tournanteEliminate(st: PingPongState, name: string) {
  if (st.mode !== "tournante") return st;
  const n = String(name || "").trim();
  if (!n) return st;

  const alive = uniqNames([st.tournanteActiveA, st.tournanteActiveB, ...(st.tournanteQueue || [])]).filter(Boolean);
  if (!alive.includes(n)) return st;

  const eliminated = uniqNames([...(st.tournanteEliminated || []), n]);
  const remaining = alive.filter((p) => p !== n);

  const a = remaining[0] ?? null;
  const b = remaining[1] ?? null;
  const q = remaining.slice(2);

  const finished = remaining.length <= 1;
  const winnerName = finished ? (remaining[0] ?? null) : null;

  const next: PingPongState = {
    ...st,
    tournanteActiveA: a,
    tournanteActiveB: b,
    tournanteQueue: q,
    tournanteEliminated: eliminated,
    tournanteFinished: finished,
    tournanteWinner: winnerName,
    pointsA: 0,
    pointsB: 0,
    setIndex: st.setIndex + 1,
    finished,
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

function pushUndo(st: PingPongState): PingPongState["undo"][number] {
  return {
    updatedAt: st.updatedAt,
    setIndex: st.setIndex,
    pointsA: st.pointsA,
    pointsB: st.pointsB,
    setsA: st.setsA,
    setsB: st.setsB,
    finished: st.finished,
    winner: st.winner,
    tournanteQueue: st.tournanteQueue,
    tournanteActiveA: st.tournanteActiveA,
    tournanteActiveB: st.tournanteActiveB,
    tournanteEliminated: st.tournanteEliminated,
    tournanteFinished: st.tournanteFinished,
    tournanteWinner: st.tournanteWinner,
  };
}

function tournanteAddPoint(st: PingPongState, side: PingPongSideId, delta: 1 | -1) {
  const snapshot = pushUndo(st);

  let pointsA = st.pointsA;
  let pointsB = st.pointsB;
  if (side === "A") pointsA = Math.max(0, pointsA + delta);
  else pointsB = Math.max(0, pointsB + delta);

  let setIndex = st.setIndex;
  let finished = st.finished;
  let tournanteFinished = st.tournanteFinished;
  let tournanteWinner = st.tournanteWinner;
  let tournanteActiveA = st.tournanteActiveA;
  let tournanteActiveB = st.tournanteActiveB;
  let tournanteQueue = [...(st.tournanteQueue || [])];
  let tournanteEliminated = [...(st.tournanteEliminated || [])];

  // Si on modifie à la baisse et que la tournante était terminée, on rouvre.
  if (delta === -1) {
    finished = false;
    tournanteFinished = false;
    tournanteWinner = null;
  }

  const setWinner = isSetWon(pointsA, pointsB, st.pointsPerSet, st.winByTwo);
  if (!finished && setWinner) {
    const winnerName = setWinner === "A" ? tournanteActiveA : tournanteActiveB;
    const loserName = setWinner === "A" ? tournanteActiveB : tournanteActiveA;

    if (loserName) tournanteEliminated.push(loserName);

    // Nouveau duel: le vainqueur reste (côté A), le challenger vient de la queue.
    const nextChallenger = tournanteQueue.shift() ?? null;
    setIndex += 1;
    pointsA = 0;
    pointsB = 0;

    tournanteActiveA = winnerName ?? null;
    tournanteActiveB = nextChallenger;

    // Plus de challenger => victoire finale
    if (!nextChallenger) {
      finished = true;
      tournanteFinished = true;
      tournanteWinner = winnerName ?? null;
    }
  }

  const next: PingPongState = {
    ...st,
    pointsA,
    pointsB,
    setIndex,
    finished,
    winner: null,
    tournanteActiveA,
    tournanteActiveB,
    tournanteQueue,
    tournanteEliminated,
    tournanteFinished,
    tournanteWinner,
    updatedAt: now(),
    undo: [snapshot, ...(st.undo || [])].slice(0, 250),
  };

  savePingPongState(next);
  return next;
}

export function addPoint(st: PingPongState, side: PingPongSideId, delta: 1 | -1) {
  if (st.mode === "tournante") return tournanteAddPoint(st, side, delta);

  const snapshot = pushUndo(st);

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
    tournanteQueue: u.tournanteQueue ?? st.tournanteQueue,
    tournanteActiveA: u.tournanteActiveA ?? st.tournanteActiveA,
    tournanteActiveB: u.tournanteActiveB ?? st.tournanteActiveB,
    tournanteEliminated: u.tournanteEliminated ?? st.tournanteEliminated,
    tournanteFinished: u.tournanteFinished ?? st.tournanteFinished,
    tournanteWinner: u.tournanteWinner ?? st.tournanteWinner,
    updatedAt: now(),
    undo: (st.undo || []).slice(1),
  };

  savePingPongState(next);
  return next;
}
