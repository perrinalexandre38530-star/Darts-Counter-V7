// =============================================================
// src/lib/babyfootStore.ts
// Baby-Foot (LOCAL ONLY)
// - Stocke l'état de match en localStorage
// - Indépendant des autres sports (Darts/Pétanque/PingPong)
// - v2: équipes + profils + events + chrono + historique exploitable
// =============================================================

export type BabyFootTeamId = "A" | "B";
export type BabyFootMode = "1v1" | "2v2" | "2v1";

export type BabyFootEvent =
  | {
      type: "start";
      at: number;
      matchId: string;
    }
  | {
      type: "goal";
      at: number;
      team: BabyFootTeamId;
      delta: 1 | -1;
      // optionnel: but attribué à un joueur (si tu ajoutes plus tard la saisie joueur)
      playerId?: string | null;
      scoreA: number;
      scoreB: number;
    }
  | {
      type: "undo";
      at: number;
      scoreA: number;
      scoreB: number;
      finished: boolean;
      winner: BabyFootTeamId | null;
    }
  | {
      type: "finish";
      at: number;
      winner: BabyFootTeamId | null;
      scoreA: number;
      scoreB: number;
      target: number;
    };

export type BabyFootPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  team: BabyFootTeamId;
};

export type BabyFootState = {
  matchId: string;
  createdAt: number;
  updatedAt: number;

  // config
  teamA: string;
  teamB: string;
  mode: BabyFootMode;
  teamAPlayers: number;
  teamBPlayers: number;
  target: number; // score cible

  // profils sélectionnés (snap du moment)
  players: BabyFootPlayer[];

  // runtime
  startedAt: number | null;
  finishedAt: number | null;
  scoreA: number;
  scoreB: number;
  finished: boolean;
  winner: BabyFootTeamId | null;

  events: BabyFootEvent[];

  // undo simple (pile de snapshots)
  undo: Array<Pick<BabyFootState, "scoreA" | "scoreB" | "finished" | "winner" | "updatedAt" | "finishedAt" | "events">>;
};

const LS_KEY = "dc-babyfoot-state";

function now() {
  return Date.now();
}

function genId() {
  const t = now();
  return (globalThis as any)?.crypto?.randomUUID?.() ?? `babyfoot-${t}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newBabyFootState(partial?: Partial<BabyFootState>): BabyFootState {
  const t = now();
  const id = genId();
  return {
    matchId: id,
    createdAt: t,
    updatedAt: t,

    teamA: "Équipe A",
    teamB: "Équipe B",
    mode: "1v1",
    teamAPlayers: 1,
    teamBPlayers: 1,
    target: 10,

    players: [],

    startedAt: null,
    finishedAt: null,
    scoreA: 0,
    scoreB: 0,
    finished: false,
    winner: null,

    events: [],

    undo: [],
    ...(partial || {}),
  };
}

// backwards compat: merge safe defaults
export function loadBabyFootState(): BabyFootState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return newBabyFootState();
    const parsed = JSON.parse(raw) || {};
    return newBabyFootState({
      ...parsed,
      // harden fields
      players: Array.isArray(parsed.players) ? parsed.players : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      undo: Array.isArray(parsed.undo) ? parsed.undo : [],
      startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : null,
      finishedAt: typeof parsed.finishedAt === "number" ? parsed.finishedAt : null,
    });
  } catch {
    return newBabyFootState();
  }
}

export function saveBabyFootState(st: BabyFootState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  } catch {}
}

/**
 * Réinitialise une nouvelle partie en conservant la config (noms, mode, profils…)
 */
export function resetBabyFoot(prev?: BabyFootState) {
  const next = newBabyFootState({
    teamA: prev?.teamA ?? "Équipe A",
    teamB: prev?.teamB ?? "Équipe B",
    mode: prev?.mode ?? "1v1",
    teamAPlayers: prev?.teamAPlayers ?? 1,
    teamBPlayers: prev?.teamBPlayers ?? 1,
    target: prev?.target ?? 10,
    players: prev?.players ?? [],
  });

  const t = now();
  next.startedAt = t;
  next.events = [{ type: "start", at: t, matchId: next.matchId }];

  saveBabyFootState(next);
  return next;
}

export function setConfig(
  st: BabyFootState,
  cfg: {
    teamA: string;
    teamB: string;
    target: number;
    mode: BabyFootMode;
    teamAPlayers: number;
    teamBPlayers: number;
    players: BabyFootPlayer[];
  }
) {
  const next: BabyFootState = {
    ...st,
    teamA: (cfg.teamA || "Équipe A").trim(),
    teamB: (cfg.teamB || "Équipe B").trim(),
    mode: cfg.mode || "1v1",
    teamAPlayers: Math.max(1, Math.min(4, Number(cfg.teamAPlayers) || 1)),
    teamBPlayers: Math.max(1, Math.min(4, Number(cfg.teamBPlayers) || 1)),
    target: Math.max(1, Math.min(99, Number(cfg.target) || 10)),
    players: Array.isArray(cfg.players) ? cfg.players : [],
    updatedAt: now(),
  };
  saveBabyFootState(next);
  return next;
}

export function addGoal(st: BabyFootState, team: BabyFootTeamId, delta: 1 | -1, playerId?: string | null) {
  const snapshot = {
    scoreA: st.scoreA,
    scoreB: st.scoreB,
    finished: st.finished,
    winner: st.winner,
    finishedAt: st.finishedAt,
    updatedAt: st.updatedAt,
    events: st.events,
  };

  let scoreA = st.scoreA;
  let scoreB = st.scoreB;
  if (team === "A") scoreA = Math.max(0, scoreA + delta);
  else scoreB = Math.max(0, scoreB + delta);

  let finished = false;
  let winner: BabyFootTeamId | null = null;
  let finishedAt: number | null = st.finishedAt;

  if (scoreA >= st.target || scoreB >= st.target) {
    finished = true;
    winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;
    finishedAt = now();
  }

  const evAt = now();
  let events: BabyFootEvent[] = [
    ...(st.events || []),
    {
      type: "goal",
      at: evAt,
      team,
      delta,
      playerId: playerId ?? null,
      scoreA,
      scoreB,
    },
  ];

  if (finished) {
    events = [
      ...events,
      { type: "finish", at: finishedAt || evAt, winner, scoreA, scoreB, target: st.target },
    ];
  }

  const next: BabyFootState = {
    ...st,
    scoreA,
    scoreB,
    finished,
    winner,
    finishedAt,
    updatedAt: evAt,
    events,
    undo: [snapshot, ...(st.undo || [])].slice(0, 200),
  };

  saveBabyFootState(next);
  return next;
}

export function undo(st: BabyFootState) {
  const u = (st.undo || [])[0];
  if (!u) return st;

  const evAt = now();
  const next: BabyFootState = {
    ...st,
    scoreA: u.scoreA,
    scoreB: u.scoreB,
    finished: u.finished,
    winner: u.winner,
    finishedAt: u.finishedAt ?? null,
    updatedAt: evAt,
    events: [
      ...(u.events || []),
      { type: "undo", at: evAt, scoreA: u.scoreA, scoreB: u.scoreB, finished: u.finished, winner: u.winner },
    ],
    undo: (st.undo || []).slice(1),
  };

  saveBabyFootState(next);
  return next;
}
