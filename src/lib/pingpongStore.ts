// =============================================================
// src/lib/pingpongStore.ts
// Ping-Pong (LOCAL ONLY)
// - Stocke l'état de match en localStorage
// - Gestion des sets (best-of) + points par set
// - Mode TOURNANTE: duel en 1 set, perdant éliminé, vainqueur reste
// =============================================================

export type PingPongSideId = "A" | "B";

export type PingPongMode = "simple" | "sets" | "tournante";

export type PingPongRulesPreset = "official" | "fun" | "custom";

export type PingPongServeStart =
  | "A" // A sert en premier
  | "B" // B sert en premier
  | "manual" // choix manuel au lancement (dans l'écran match)
  | "toss_first_point"; // lancer de balle manuel -> le 1er point marqué détermine le serveur

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

  // règles avancées (V2)
  // ⚠️ Ces champs sont stockés mais pas encore tous exploités par PingPongPlay.
  // Objectif : permettre une config libre "officiel / fun / custom" sans casser l'existant.
  uiMode?: string; // match_1v1/match_2v2/match_2v1/tournante/training (UI)
  rulesPreset: PingPongRulesPreset;
  serveStart: PingPongServeStart;
  serviceEvery: number; // nombre de points avant changement de service (ex: 2)
  deuceServiceEvery: number; // en fin de set (deuce), changement tous les X points (ex: 1)
  switchEndsEachSet: boolean;
  switchEndsAtFinal: boolean;
  switchEndsAtFinalPoints: number; // ex: 5 (à 11) / 10 (à 21)

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

  // runtime (match)
  matchStarted: boolean;
  matchStartedAt: number | null;
  setStartedAt: number | null;
  setDurationsMs: number[];
  // choix serveur (si serveStart==='manual')
  manualStart: PingPongSideId | null;
  // 1er point gagnant (si serveStart==='toss_first_point')
  firstPointSide: PingPongSideId | null;

  // télémétrie points (pour stats live / fin de partie)
  pointLog: Array<{ setIndex: number; winner: PingPongSideId; server: PingPongSideId; ts: number }>;

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
    | "matchStarted"
    | "manualStart"
    | "firstPointSide"
    | "pointLog"
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

    uiMode: (partial as any)?.uiMode ?? undefined,
    rulesPreset: (partial as any)?.rulesPreset ?? "official",
    serveStart: (partial as any)?.serveStart ?? "manual",
    serviceEvery: clampInt((partial as any)?.serviceEvery, 1, 20, 2),
    deuceServiceEvery: clampInt((partial as any)?.deuceServiceEvery, 1, 10, 1),
    switchEndsEachSet: (partial as any)?.switchEndsEachSet !== false,
    switchEndsAtFinal: (partial as any)?.switchEndsAtFinal !== false,
    switchEndsAtFinalPoints: clampInt((partial as any)?.switchEndsAtFinalPoints, 1, 50, 5),

    tournantePlayers: [],
    tournanteQueue: [],
    tournanteActiveA: null,
    tournanteActiveB: null,
    tournanteEliminated: [],
    tournanteFinished: false,
    tournanteWinner: null,

    matchStarted: false,
    matchStartedAt: null,
    setStartedAt: null,
    setDurationsMs: [],
    manualStart: null,
    firstPointSide: null,
    pointLog: [],

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

      uiMode: typeof parsed?.uiMode === "string" ? parsed.uiMode : undefined,
      rulesPreset:
        parsed?.rulesPreset === "fun" ? "fun" : parsed?.rulesPreset === "custom" ? "custom" : "official",
      serveStart:
        parsed?.serveStart === "A"
          ? "A"
          : parsed?.serveStart === "B"
          ? "B"
          : parsed?.serveStart === "toss_first_point"
          ? "toss_first_point"
          : "manual",
      serviceEvery: clampInt(parsed?.serviceEvery, 1, 20, 2),
      deuceServiceEvery: clampInt(parsed?.deuceServiceEvery, 1, 10, 1),
      switchEndsEachSet: parsed?.switchEndsEachSet !== false,
      switchEndsAtFinal: parsed?.switchEndsAtFinal !== false,
      switchEndsAtFinalPoints: clampInt(parsed?.switchEndsAtFinalPoints, 1, 50, 5),

      matchStarted: !!parsed?.matchStarted,
      manualStart: parsed?.manualStart === "A" ? "A" : parsed?.manualStart === "B" ? "B" : null,
      firstPointSide: parsed?.firstPointSide === "A" ? "A" : parsed?.firstPointSide === "B" ? "B" : null,
      pointLog: Array.isArray(parsed?.pointLog)
        ? (parsed.pointLog
            .map((p: any) => ({
              setIndex: Number(p?.setIndex ?? 1),
              winner: p?.winner === "B" ? "B" : "A",
              server: p?.server === "B" ? "B" : "A",
              ts: Number(p?.ts ?? 0),
            }))
            .filter((p: any) => Number.isFinite(p.ts))
          ).slice(0, 5000)
        : [],

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

    uiMode: (prev as any)?.uiMode ?? undefined,
    rulesPreset: (prev as any)?.rulesPreset ?? "official",
    serveStart: (prev as any)?.serveStart ?? "manual",
    serviceEvery: clampInt((prev as any)?.serviceEvery, 1, 20, 2),
    deuceServiceEvery: clampInt((prev as any)?.deuceServiceEvery, 1, 10, 1),
    switchEndsEachSet: (prev as any)?.switchEndsEachSet !== false,
    switchEndsAtFinal: (prev as any)?.switchEndsAtFinal !== false,
    switchEndsAtFinalPoints: clampInt(
      (prev as any)?.switchEndsAtFinalPoints,
      1,
      50,
      (clampInt(prev?.pointsPerSet, 5, 99, 11) === 21 ? 10 : 5)
    ),

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
  tournantePlayers?: string[],
  advanced?: Partial<
    Pick<
      PingPongState,
      | "uiMode"
      | "rulesPreset"
      | "serveStart"
      | "serviceEvery"
      | "deuceServiceEvery"
      | "switchEndsEachSet"
      | "switchEndsAtFinal"
      | "switchEndsAtFinalPoints"
    >
  >
) {
  const nextBase: PingPongState = {
    ...st,
    mode: mode || "sets",
    sideA: (sideA || "Joueur A").trim(),
    sideB: (sideB || "Joueur B").trim(),
    pointsPerSet: clampInt(pointsPerSet, 5, 99, 11),
    setsToWin: clampInt(setsToWin, 1, 9, 3),
    winByTwo: winByTwo !== false,

    // advanced (soft) — clamp + defaults
    uiMode: typeof (advanced as any)?.uiMode === "string" ? (advanced as any).uiMode : st.uiMode,
    rulesPreset:
      (advanced as any)?.rulesPreset === "fun"
        ? "fun"
        : (advanced as any)?.rulesPreset === "custom"
        ? "custom"
        : (advanced as any)?.rulesPreset === "official"
        ? "official"
        : st.rulesPreset ?? "official",
    serveStart:
      (advanced as any)?.serveStart === "A"
        ? "A"
        : (advanced as any)?.serveStart === "B"
        ? "B"
        : (advanced as any)?.serveStart === "toss_first_point"
        ? "toss_first_point"
        : (advanced as any)?.serveStart === "manual"
        ? "manual"
        : st.serveStart ?? "manual",
    serviceEvery: clampInt((advanced as any)?.serviceEvery, 1, 20, st.serviceEvery ?? 2),
    deuceServiceEvery: clampInt((advanced as any)?.deuceServiceEvery, 1, 10, st.deuceServiceEvery ?? 1),
    switchEndsEachSet:
      (advanced as any)?.switchEndsEachSet === undefined
        ? st.switchEndsEachSet !== false
        : !!(advanced as any).switchEndsEachSet,
    switchEndsAtFinal:
      (advanced as any)?.switchEndsAtFinal === undefined
        ? st.switchEndsAtFinal !== false
        : !!(advanced as any).switchEndsAtFinal,
    switchEndsAtFinalPoints: clampInt(
      (advanced as any)?.switchEndsAtFinalPoints,
      1,
      50,
      st.switchEndsAtFinalPoints ?? (clampInt(pointsPerSet, 5, 99, 11) === 21 ? 10 : 5)
    ),
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



// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
export function getCurrentServerSide(st: PingPongState) {
  const totalPts = Number(st.pointsA ?? 0) + Number(st.pointsB ?? 0);
  return computeServerSide(st, totalPts, st.firstPointSide ?? null);
}

function computeServerSide(
  st: PingPongState,
  totalPtsBefore: number,
  overrideStart?: PingPongSideId | null
): PingPongSideId {
  const ptsA = Number(st.pointsA ?? 0);
  const ptsB = Number(st.pointsB ?? 0);
  const pps = Number(st.pointsPerSet ?? 11);
  const winByTwo = st.winByTwo !== false;

  const inDeuce = winByTwo && ptsA >= pps - 1 && ptsB >= pps - 1;
  const interval = Math.max(1, Number(inDeuce ? st.deuceServiceEvery : st.serviceEvery) || (inDeuce ? 1 : 2));

  let start: PingPongSideId = "A";
  if (overrideStart === "A" || overrideStart === "B") start = overrideStart;
  else if (st.serveStart === "A" || st.serveStart === "B") start = st.serveStart;
  else if (st.serveStart === "manual" && (st.manualStart === "A" || st.manualStart === "B")) start = st.manualStart;
  else if (st.serveStart === "toss_first_point" && (st.firstPointSide === "A" || st.firstPointSide === "B"))
    start = st.firstPointSide;

  const turn = Math.floor(totalPtsBefore / interval) % 2;
  return turn === 0 ? start : start === "A" ? "B" : "A";
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
    matchStarted: st.matchStarted,
    manualStart: st.manualStart,
    firstPointSide: st.firstPointSide,
    pointLog: st.pointLog,
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

  // timers (best-effort)
  let matchStartedAt: number | null = (st as any).matchStartedAt ?? null;
  let setStartedAt: number | null = (st as any).setStartedAt ?? null;
  let setDurationsMs: number[] = Array.isArray((st as any).setDurationsMs) ? [...((st as any).setDurationsMs as any)] : [];

  const totalPtsBefore = Number(st.pointsA ?? 0) + Number(st.pointsB ?? 0);
  if (delta > 0 && !matchStartedAt) matchStartedAt = now();
  if (delta > 0 && !setStartedAt) setStartedAt = now();
  let firstPointSide: PingPongSideId | null = st.firstPointSide;
  if (delta > 0 && st.serveStart === "toss_first_point" && !firstPointSide && totalPtsBefore === 0) {
    firstPointSide = side;
  }
  let pointLog = Array.isArray(st.pointLog) ? [...st.pointLog] : [];
  if (delta > 0) {
    const server = computeServerSide(st, totalPtsBefore, firstPointSide);
    pointLog.push({ setIndex: Number(st.setIndex ?? 1), winner: side, server, ts: now() });
    pointLog = pointLog.slice(-5000);
  } else if (delta < 0) {
    pointLog.pop();
  }

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

  // timers (best-effort)
  let matchStartedAt: number | null = (st as any).matchStartedAt ?? null;
  let setStartedAt: number | null = (st as any).setStartedAt ?? null;
  let setDurationsMs: number[] = Array.isArray((st as any).setDurationsMs) ? [...((st as any).setDurationsMs as any)] : [];

  const totalPtsBefore = Number(st.pointsA ?? 0) + Number(st.pointsB ?? 0);
  if (delta > 0 && !matchStartedAt) matchStartedAt = now();
  if (delta > 0 && !setStartedAt) setStartedAt = now();
  let firstPointSide: PingPongSideId | null = st.firstPointSide;

  // Si option "toss_first_point": le 1er point marque le serveur (et donc le départ)
  if (delta > 0 && st.serveStart === "toss_first_point" && !firstPointSide && totalPtsBefore === 0) {
    firstPointSide = side;
  }

  let pointLog = Array.isArray(st.pointLog) ? [...st.pointLog] : [];
  if (delta > 0) {
    const server = computeServerSide(st, totalPtsBefore, firstPointSide);
    pointLog.push({ setIndex: Number(st.setIndex ?? 1), winner: side, server, ts: now() });
    pointLog = pointLog.slice(-5000);
  } else if (delta < 0) {
    pointLog.pop();
  }

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

      // durée du set terminé (best-effort)
      if (setStartedAt) {
        const dur = Math.max(0, now() - setStartedAt);
        // setIndex courant correspond au set qui vient de finir
        const idx = Math.max(0, Number(st.setIndex ?? 1) - 1);
        // on remplace si déjà présent
        if (setDurationsMs.length <= idx) {
          while (setDurationsMs.length < idx) setDurationsMs.push(0);
          setDurationsMs.push(dur);
        } else {
          setDurationsMs[idx] = dur;
        }
      }

      // set suivant
      pointsA = 0;
      pointsB = 0;
      setIndex += 1;
      setStartedAt = now();

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
    matchStarted: (u as any).matchStarted ?? st.matchStarted,
    manualStart: (u as any).manualStart ?? st.manualStart,
    firstPointSide: (u as any).firstPointSide ?? st.firstPointSide,
    pointLog: (u as any).pointLog ?? st.pointLog,
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
