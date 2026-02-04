// =============================================================
// src/lib/babyfootStore.ts
// Baby-Foot (LOCAL ONLY)
//
// ✅ V2 (rebased on project): teams + profiles + events + timer
// - Backward compatible with existing saved state (v1)
// - No dependency on Darts/Pétanque/PingPong
// =============================================================

export type BabyFootTeamId = "A" | "B";
export type BabyFootMode = "1v1" | "2v2" | "2v1";

export type BabyFootEvent =
  | { t: "start"; at: number }
  | { t: "goal"; at: number; team: BabyFootTeamId; scorerId?: string | null }
  | { t: "undo"; at: number }
  | { t: "finish"; at: number; winner: BabyFootTeamId };

export type BabyFootState = {
  matchId: string;
  createdAt: number;
  updatedAt: number;

  // display
  teamA: string;
  teamB: string;

  // match format
  mode: BabyFootMode;
  teamAPlayers: number;
  teamBPlayers: number;

  // ✅ V2: selected profile ids (for stats/history)
  teamAProfileIds: string[];
  teamBProfileIds: string[];

  // score
  scoreA: number;
  scoreB: number;
  target: number;

  // timer
  startedAt: number | null;
  finishedAt: number | null;

  // status
  finished: boolean;
  winner: BabyFootTeamId | null;

  // ✅ V2: events log
  events: BabyFootEvent[];

  // undo simple (stack of snapshots)
  undo: Array<
    Pick<BabyFootState, "scoreA" | "scoreB" | "finished" | "winner" | "updatedAt" | "events" | "finishedAt">
  >;
};

const LS_KEY = "babyfoot_state_v2";

function uid() {
  return `bf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultBabyFootState(partial?: Partial<BabyFootState>): BabyFootState {
  const now = Date.now();
  return {
    matchId: uid(),
    createdAt: now,
    updatedAt: now,

    teamA: "TEAM A",
    teamB: "TEAM B",

    mode: "1v1",
    teamAPlayers: 1,
    teamBPlayers: 1,

    teamAProfileIds: [],
    teamBProfileIds: [],

    scoreA: 0,
    scoreB: 0,
    target: 10,

    startedAt: null,
    finishedAt: null,

    finished: false,
    winner: null,

    events: [],

    undo: [],
    ...partial,
  };
}

// Backward compat: migrate old v1 shape to v2
function migrate(raw: any): BabyFootState {
  if (!raw || typeof raw !== "object") return defaultBabyFootState();

  const now = Date.now();
  const v2: BabyFootState = defaultBabyFootState({
    matchId: raw.matchId || raw.id || uid(),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    teamA: raw.teamA ?? "TEAM A",
    teamB: raw.teamB ?? "TEAM B",
    mode: raw.mode ?? "1v1",
    teamAPlayers: raw.teamAPlayers ?? (raw.mode === "2v2" ? 2 : raw.mode === "2v1" ? 2 : 1),
    teamBPlayers: raw.teamBPlayers ?? (raw.mode === "2v2" ? 2 : 1),
    scoreA: Number(raw.scoreA ?? 0),
    scoreB: Number(raw.scoreB ?? 0),
    target: Number(raw.target ?? 10),
    finished: !!raw.finished,
    winner: raw.winner ?? null,
  });

  // v2 fields
  v2.teamAProfileIds = Array.isArray(raw.teamAProfileIds) ? raw.teamAProfileIds.filter(Boolean) : [];
  v2.teamBProfileIds = Array.isArray(raw.teamBProfileIds) ? raw.teamBProfileIds.filter(Boolean) : [];

  v2.startedAt = typeof raw.startedAt === "number" ? raw.startedAt : null;
  v2.finishedAt = typeof raw.finishedAt === "number" ? raw.finishedAt : null;

  v2.events = Array.isArray(raw.events) ? raw.events : [];
  v2.undo = Array.isArray(raw.undo) ? raw.undo : [];

  return v2;
}

export function loadBabyFootState(): BabyFootState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultBabyFootState();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultBabyFootState();
  }
}

export function saveBabyFootState(state: BabyFootState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export function resetBabyFoot(partial?: Partial<BabyFootState>) {
  const s = defaultBabyFootState(partial);
  saveBabyFootState(s);
  return s;
}

export function setTeams(teamA: string, teamB: string) {
  const s = loadBabyFootState();
  const next = { ...s, teamA, teamB, updatedAt: Date.now() };
  saveBabyFootState(next);
  return next;
}

export function setMode(mode: BabyFootMode) {
  const s = loadBabyFootState();
  const teamAPlayers = mode === "2v2" || mode === "2v1" ? 2 : 1;
  const teamBPlayers = mode === "2v2" ? 2 : 1;
  const next = { ...s, mode, teamAPlayers, teamBPlayers, updatedAt: Date.now() };
  saveBabyFootState(next);
  return next;
}

export function setTarget(target: number) {
  const s = loadBabyFootState();
  const next = { ...s, target: Math.max(1, Math.floor(target || 1)), updatedAt: Date.now() };
  saveBabyFootState(next);
  return next;
}

export function setTeamsProfiles(teamAProfileIds: string[], teamBProfileIds: string[]) {
  const s = loadBabyFootState();
  const next = {
    ...s,
    teamAProfileIds: Array.from(new Set((teamAProfileIds || []).filter(Boolean))),
    teamBProfileIds: Array.from(new Set((teamBProfileIds || []).filter(Boolean))),
    updatedAt: Date.now(),
  };
  saveBabyFootState(next);
  return next;
}

export function startMatch() {
  const s = loadBabyFootState();
  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    scoreA: 0,
    scoreB: 0,
    finished: false,
    winner: null,
    undo: [],
    startedAt: now,
    finishedAt: null,
    events: [{ t: "start", at: now }],
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

function pushUndo(s: BabyFootState): BabyFootState {
  const snap = {
    scoreA: s.scoreA,
    scoreB: s.scoreB,
    finished: s.finished,
    winner: s.winner,
    updatedAt: s.updatedAt,
    events: s.events,
    finishedAt: s.finishedAt,
  };
  const stack = [...(s.undo || []), snap].slice(-50);
  return { ...s, undo: stack };
}

export function addGoal(team: BabyFootTeamId, scorerId?: string | null) {
  let s = loadBabyFootState();
  if (s.finished) return s;

  s = pushUndo(s);
  const now = Date.now();

  let scoreA = s.scoreA;
  let scoreB = s.scoreB;
  if (team === "A") scoreA += 1;
  else scoreB += 1;

  let finished = false;
  let winner: BabyFootTeamId | null = null;
  let finishedAt: number | null = s.finishedAt;

  if (scoreA >= s.target || scoreB >= s.target) {
    finished = true;
    winner = scoreA >= s.target ? "A" : "B";
    finishedAt = now;
  }

  const events = [...(s.events || []), { t: "goal", at: now, team, scorerId: scorerId ?? null } as BabyFootEvent];
  if (finished && winner) events.push({ t: "finish", at: now, winner });

  const next: BabyFootState = {
    ...s,
    scoreA,
    scoreB,
    finished,
    winner,
    finishedAt,
    events,
    updatedAt: now,
  };

  saveBabyFootState(next);
  return next;
}

export function undo() {
  const s = loadBabyFootState();
  const stack = s.undo || [];
  const last = stack[stack.length - 1];
  if (!last) return s;

  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    scoreA: last.scoreA,
    scoreB: last.scoreB,
    finished: last.finished,
    winner: last.winner,
    finishedAt: last.finishedAt ?? null,
    events: [...(last.events || []), { t: "undo", at: now } as BabyFootEvent],
    undo: stack.slice(0, -1),
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

export function computeDurationMs(s: BabyFootState) {
  const start = s.startedAt ?? s.createdAt;
  const end = s.finishedAt ?? Date.now();
  return Math.max(0, end - start);
}
