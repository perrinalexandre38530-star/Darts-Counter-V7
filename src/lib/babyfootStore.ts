// =============================================================
// src/lib/babyfootStore.ts
// Baby-Foot (LOCAL ONLY)
// ✅ V3: options avancées + phases (play/overtime/penalties) + sets + handicap
// - Backward compatible avec l'état V2 existant
// - AUCUNE dépendance Darts / Pétanque / PingPong
// =============================================================

export type BabyFootTeamId = "A" | "B";
export type BabyFootMode = "1v1" | "2v2" | "2v1";
export type BabyFootPhase = "play" | "overtime" | "penalties" | "finished";

export type BabyFootEvent =
  | { t: "start"; at: number }
  | { t: "goal"; at: number; team: BabyFootTeamId; scorerId?: string | null; phase?: BabyFootPhase }
  | { t: "pen_shot"; at: number; team: BabyFootTeamId; scored: boolean; scorerId?: string | null }
  | { t: "set_win"; at: number; team: BabyFootTeamId; setIndex: number }
  | { t: "phase"; at: number; phase: BabyFootPhase }
  | { t: "undo"; at: number }
  | { t: "finish"; at: number; winner: BabyFootTeamId; reason: "target" | "golden" | "time" | "sets" | "penalties" };

export type PenaltiesState = {
  // total shots taken
  shotsA: number;
  shotsB: number;
  // goals
  goalsA: number;
  goalsB: number;
  // next team to shoot
  turn: BabyFootTeamId;
};

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

  // selected profile ids (for stats/history)
  teamAProfileIds: string[];
  teamBProfileIds: string[];

  // current score (either match score, or set score when setsEnabled)
  scoreA: number;
  scoreB: number;

  // classic match target (when setsEnabled=false)
  target: number;

  // timer
  startedAt: number | null;
  finishedAt: number | null;

  // phases
  phase: BabyFootPhase;

  // options (V3)
  matchDurationSec: number | null;       // time limit for regular play
  overtimeSec: number | null;            // overtime duration when draw by time
  goldenGoal: boolean;                   // first goal ends match (regular play)
  overtimeGoldenGoal: boolean;           // first goal ends match during overtime
  handicapA: number;                     // starting bonus goals for team A
  handicapB: number;                     // starting bonus goals for team B

  // sets
  setsEnabled: boolean;
  setsBestOf: 1 | 3 | 5;
  setTarget: number;                     // goals to win a set
  setsA: number;
  setsB: number;
  setIndex: number;                      // 1-based

  // penalties (when time draw persists after overtime)
  penalties: PenaltiesState | null;

  // status
  finished: boolean;
  winner: BabyFootTeamId | null;

  // events log
  events: BabyFootEvent[];

  // undo stack
  undo: Array<
    Pick<
      BabyFootState,
      | "scoreA"
      | "scoreB"
      | "finished"
      | "winner"
      | "finishedAt"
      | "events"
      | "phase"
      | "setsA"
      | "setsB"
      | "setIndex"
      | "penalties"
    >
  >;
};

const LS_KEY = "babyfoot_state_v3";

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

    phase: "play",

    matchDurationSec: null,
    overtimeSec: 60,
    goldenGoal: false,
    overtimeGoldenGoal: true,
    handicapA: 0,
    handicapB: 0,

    setsEnabled: false,
    setsBestOf: 3,
    setTarget: 5,
    setsA: 0,
    setsB: 0,
    setIndex: 1,

    penalties: null,

    finished: false,
    winner: null,

    events: [],
    undo: [],
    ...partial,
  };
}

function normalizeBestOf(v: any): 1 | 3 | 5 {
  if (v === 1 || v === 3 || v === 5) return v;
  if (v === 0) return 1;
  return 3;
}

function migrate(raw: any): BabyFootState {
  if (!raw || typeof raw !== "object") return defaultBabyFootState();

  const now = Date.now();

  // V2 -> V3 key change (LS_KEY). If user still has v2, we migrate from it.
  const v3: BabyFootState = defaultBabyFootState({
    matchId: raw.matchId || raw.id || uid(),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,

    teamA: raw.teamA ?? "TEAM A",
    teamB: raw.teamB ?? "TEAM B",

    mode: raw.mode ?? "1v1",
    teamAPlayers:
      raw.teamAPlayers ??
      (raw.mode === "2v2" || raw.mode === "2v1" ? 2 : 1),
    teamBPlayers: raw.teamBPlayers ?? (raw.mode === "2v2" ? 2 : 1),

    teamAProfileIds: Array.isArray(raw.teamAProfileIds) ? raw.teamAProfileIds : [],
    teamBProfileIds: Array.isArray(raw.teamBProfileIds) ? raw.teamBProfileIds : [],

    scoreA: Number.isFinite(raw.scoreA) ? raw.scoreA : 0,
    scoreB: Number.isFinite(raw.scoreB) ? raw.scoreB : 0,
    target: Number.isFinite(raw.target) ? raw.target : 10,

    startedAt: raw.startedAt ?? null,
    finishedAt: raw.finishedAt ?? null,

    phase: (raw.phase as BabyFootPhase) || (raw.finished ? "finished" : "play"),

    matchDurationSec: Number.isFinite(raw.matchDurationSec) ? raw.matchDurationSec : null,
    overtimeSec: Number.isFinite(raw.overtimeSec) ? raw.overtimeSec : 60,
    goldenGoal: !!raw.goldenGoal,
    overtimeGoldenGoal: raw.overtimeGoldenGoal === undefined ? true : !!raw.overtimeGoldenGoal,
    handicapA: Number.isFinite(raw.handicapA) ? raw.handicapA : 0,
    handicapB: Number.isFinite(raw.handicapB) ? raw.handicapB : 0,

    setsEnabled: !!raw.setsEnabled,
    setsBestOf: normalizeBestOf(raw.setsBestOf),
    setTarget: Number.isFinite(raw.setTarget) ? raw.setTarget : 5,
    setsA: Number.isFinite(raw.setsA) ? raw.setsA : 0,
    setsB: Number.isFinite(raw.setsB) ? raw.setsB : 0,
    setIndex: Number.isFinite(raw.setIndex) ? raw.setIndex : 1,

    penalties: raw.penalties ?? null,

    finished: !!raw.finished,
    winner: raw.winner ?? null,

    events: Array.isArray(raw.events) ? raw.events : [],
    undo: Array.isArray(raw.undo) ? raw.undo : [],
  });

  // If not started yet and handicap exists, apply it to score baseline
  if ((v3.scoreA === 0 && v3.scoreB === 0) && (v3.handicapA || v3.handicapB)) {
    v3.scoreA = Math.max(0, v3.handicapA || 0);
    v3.scoreB = Math.max(0, v3.handicapB || 0);
  }

  return v3;
}

export function loadBabyFootState(): BabyFootState {
  try {
    const rawV3 = localStorage.getItem(LS_KEY);
    if (rawV3) return migrate(JSON.parse(rawV3));
  } catch {}

  // try v2 key for migration
  try {
    const rawV2 = localStorage.getItem("babyfoot_state_v2");
    if (rawV2) return migrate(JSON.parse(rawV2));
  } catch {}

  return defaultBabyFootState();
}

export function saveBabyFootState(s: BabyFootState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

export function saveBabyFootStatePatch(partial: Partial<BabyFootState>) {
  const s = loadBabyFootState();
  const next = { ...s, ...partial, updatedAt: Date.now() } as BabyFootState;
  saveBabyFootState(next);
  return next;
}

function pushUndo(s: BabyFootState) {
  const snap: any = {
    scoreA: s.scoreA,
    scoreB: s.scoreB,
    finished: s.finished,
    winner: s.winner,
    finishedAt: s.finishedAt ?? null,
    phase: s.phase,
    setsA: s.setsA,
    setsB: s.setsB,
    setIndex: s.setIndex,
    penalties: s.penalties ? { ...s.penalties } : null,
    events: [...(s.events || [])],
  };
  return [...(s.undo || []), snap].slice(-50);
}

function setPhase(s: BabyFootState, phase: BabyFootPhase) {
  if (s.phase === phase) return s;
  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    phase,
    events: [...(s.events || []), { t: "phase", at: now, phase }],
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

export function startIfNeeded() {
  const s = loadBabyFootState();
  if (s.startedAt) return s;
  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    startedAt: now,
    phase: "play",
    events: [...(s.events || []), { t: "start", at: now }],
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

function finishMatch(winner: BabyFootTeamId, reason: BabyFootEvent["t"] extends any ? any : any) {
  const s = loadBabyFootState();
  if (s.finished) return s;
  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    finished: true,
    winner,
    phase: "finished",
    finishedAt: now,
    events: [...(s.events || []), { t: "finish", at: now, winner, reason }],
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

function maybeWinSet(s: BabyFootState) {
  if (!s.setsEnabled) return s;

  const target = Math.max(1, s.setTarget || 5);
  const aWon = s.scoreA >= target && s.scoreA >= s.scoreB + 2;
  const bWon = s.scoreB >= target && s.scoreB >= s.scoreA + 2;

  if (!aWon && !bWon) return s;

  const now = Date.now();
  const winner: BabyFootTeamId = aWon ? "A" : "B";
  const setsA = s.setsA + (winner === "A" ? 1 : 0);
  const setsB = s.setsB + (winner === "B" ? 1 : 0);
  const bestOf = normalizeBestOf(s.setsBestOf);
  const needed = Math.floor(bestOf / 2) + 1;

  let next: BabyFootState = {
    ...s,
    undo: pushUndo(s),
    setsA,
    setsB,
    setIndex: s.setIndex + 1,
    scoreA: Math.max(0, s.handicapA || 0),
    scoreB: Math.max(0, s.handicapB || 0),
    events: [...(s.events || []), { t: "set_win", at: now, team: winner, setIndex: s.setIndex }],
    updatedAt: now,
  };

  // match won by sets
  if (setsA >= needed || setsB >= needed) {
    next = {
      ...next,
      finished: true,
      winner: setsA >= needed ? "A" : "B",
      phase: "finished",
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: setsA >= needed ? "A" : "B", reason: "sets" }],
    };
  }

  saveBabyFootState(next);
  return next;
}

export function addGoal(team: BabyFootTeamId, scorerId?: string | null) {
  let s = startIfNeeded();

  if (s.finished) return s;

  // penalties handled elsewhere
  if (s.phase === "penalties") return s;

  const now = Date.now();
  const undo = pushUndo(s);

  const nextScoreA = s.scoreA + (team === "A" ? 1 : 0);
  const nextScoreB = s.scoreB + (team === "B" ? 1 : 0);

  let next: BabyFootState = {
    ...s,
    undo,
    scoreA: nextScoreA,
    scoreB: nextScoreB,
    events: [...(s.events || []), { t: "goal", at: now, team, scorerId: scorerId ?? null, phase: s.phase }],
    updatedAt: now,
  };

  // Golden goal (regular play)
  if (s.phase === "play" && s.goldenGoal) {
    next = {
      ...next,
      finished: true,
      winner: team,
      phase: "finished",
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: team, reason: "golden" }],
    };
    saveBabyFootState(next);
    return next;
  }

  // Golden goal overtime
  if (s.phase === "overtime" && s.overtimeGoldenGoal) {
    next = {
      ...next,
      finished: true,
      winner: team,
      phase: "finished",
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: team, reason: "golden" }],
    };
    saveBabyFootState(next);
    return next;
  }

  // sets
  next = maybeWinSet(next);
  if (next.finished) return next;

  // classic target (no sets)
  if (!next.setsEnabled) {
    const target = Math.max(1, next.target || 10);
    if (next.scoreA >= target || next.scoreB >= target) {
      const winner: BabyFootTeamId = next.scoreA >= target ? "A" : "B";
      next = {
        ...next,
        finished: true,
        winner,
        phase: "finished",
        finishedAt: now,
        events: [...(next.events || []), { t: "finish", at: now, winner, reason: "target" }],
      };
    }
  }

  saveBabyFootState(next);
  return next;
}

function penaltyIsDecided(p: PenaltiesState) {
  const maxInitial = 5;

  const aShots = p.shotsA;
  const bShots = p.shotsB;

  const aGoals = p.goalsA;
  const bGoals = p.goalsB;

  const aInInitial = aShots <= maxInitial;
  const bInInitial = bShots <= maxInitial;

  // During initial 5 each: early win if opponent can't catch up
  if (aShots <= maxInitial && bShots <= maxInitial) {
    const aRemaining = maxInitial - aShots;
    const bRemaining = maxInitial - bShots;

    if (aGoals > bGoals + bRemaining) return "A";
    if (bGoals > aGoals + aRemaining) return "B";
    // after 5 each and unequal -> decided
    if (aShots === maxInitial && bShots === maxInitial && aGoals !== bGoals) return aGoals > bGoals ? "A" : "B";
    return null;
  }

  // Sudden death: after each pair of shots (same number of shots), if different -> decided
  if (aShots === bShots && aShots > maxInitial && aGoals !== bGoals) return aGoals > bGoals ? "A" : "B";

  return null;
}

export function addPenaltyShot(team: BabyFootTeamId, scored: boolean, scorerId?: string | null) {
  let s = startIfNeeded();
  if (s.finished) return s;

  // Ensure penalties phase exists
  if (s.phase !== "penalties") {
    s = setPhase(s, "penalties");
  }

  const now = Date.now();
  const undo = pushUndo(s);

  const p: PenaltiesState = s.penalties ?? { shotsA: 0, shotsB: 0, goalsA: 0, goalsB: 0, turn: "A" };

  // Enforce turn order
  if (p.turn !== team) return s;

  const nextP: PenaltiesState = {
    ...p,
    shotsA: p.shotsA + (team === "A" ? 1 : 0),
    shotsB: p.shotsB + (team === "B" ? 1 : 0),
    goalsA: p.goalsA + (team === "A" && scored ? 1 : 0),
    goalsB: p.goalsB + (team === "B" && scored ? 1 : 0),
    turn: team === "A" ? "B" : "A",
  };

  let next: BabyFootState = {
    ...s,
    undo,
    penalties: nextP,
    events: [...(s.events || []), { t: "pen_shot", at: now, team, scored, scorerId: scorerId ?? null }],
    updatedAt: now,
  };

  const decided = penaltyIsDecided(nextP);
  if (decided) {
    next = {
      ...next,
      finished: true,
      winner: decided,
      phase: "finished",
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: decided, reason: "penalties" }],
    };
  }

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
    phase: last.phase ?? (last.finished ? "finished" : "play"),
    setsA: last.setsA ?? 0,
    setsB: last.setsB ?? 0,
    setIndex: last.setIndex ?? 1,
    penalties: last.penalties ?? null,
    events: [...(last.events || []), { t: "undo", at: now }],
    undo: stack.slice(0, -1),
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}



// -------------------------------------------------------------
// Public setters used by Config (keep API stable)
// -------------------------------------------------------------

export function resetBabyFoot(partial?: Partial<BabyFootState>) {
  const next = defaultBabyFootState(partial);
  saveBabyFootState(next);
  return next;
}

export function setMode(mode: BabyFootMode) {
  const s = loadBabyFootState();
  const teamAPlayers = mode === "2v2" || mode === "2v1" ? 2 : 1;
  const teamBPlayers = mode === "2v2" ? 2 : 1;
  const next: BabyFootState = {
    ...s,
    mode,
    teamAPlayers,
    teamBPlayers,
    updatedAt: Date.now(),
  };
  saveBabyFootState(next);
  return next;
}

export function setTeams(teamA: string, teamB: string) {
  const s = loadBabyFootState();
  const next: BabyFootState = { ...s, teamA, teamB, updatedAt: Date.now() };
  saveBabyFootState(next);
  return next;
}

export function setTeamsProfiles(teamAProfileIds: string[], teamBProfileIds: string[]) {
  const s = loadBabyFootState();
  const next: BabyFootState = {
    ...s,
    teamAProfileIds: Array.isArray(teamAProfileIds) ? teamAProfileIds : [],
    teamBProfileIds: Array.isArray(teamBProfileIds) ? teamBProfileIds : [],
    updatedAt: Date.now(),
  };
  saveBabyFootState(next);
  return next;
}

export function setTarget(target: number) {
  const s = loadBabyFootState();
  const t = Math.max(1, Math.floor(Number(target) || 10));
  const next: BabyFootState = { ...s, target: t, updatedAt: Date.now() };
  saveBabyFootState(next);
  return next;
}

export function setAdvancedOptions(partial: Partial<Pick<
  BabyFootState,
  | "matchDurationSec"
  | "overtimeSec"
  | "goldenGoal"
  | "overtimeGoldenGoal"
  | "setsEnabled"
  | "setsBestOf"
  | "setTarget"
  | "handicapA"
  | "handicapB"
>>) {
  const s = loadBabyFootState();
  const next: BabyFootState = {
    ...s,
    ...partial,
    setsBestOf: normalizeBestOf((partial as any)?.setsBestOf ?? s.setsBestOf),
    updatedAt: Date.now(),
  };
  saveBabyFootState(next);
  return next;
}

// Start a fresh match from current config/options (new matchId, reset scores, clear events)
export function startMatch() {
  const s = loadBabyFootState();
  const now = Date.now();

  const baseA = Math.max(0, Math.floor(Number(s.handicapA) || 0));
  const baseB = Math.max(0, Math.floor(Number(s.handicapB) || 0));

  const next: BabyFootState = {
    ...s,
    matchId: uid(),
    createdAt: now,
    updatedAt: now,

    scoreA: baseA,
    scoreB: baseB,

    startedAt: now,
    finishedAt: null,

    phase: "play",

    // reset sets counters on new match
    setsA: 0,
    setsB: 0,
    setIndex: 1,

    penalties: null,

    finished: false,
    winner: null,

    events: [{ t: "start", at: now }],
    undo: [],
  };

  saveBabyFootState(next);
  return next;
}
export function computeDurationMs(s: BabyFootState) {
  const start = s.startedAt ?? s.createdAt;
  const end = s.finishedAt ?? Date.now();
  return Math.max(0, end - start);
}

// Called by Play when time limit reached.
// Handles draw -> overtime -> penalties.
export function finishByTime() {
  let s = startIfNeeded();
  if (s.finished) return s;

  // decide winner if not draw
  if (s.scoreA !== s.scoreB) {
    const winner: BabyFootTeamId = s.scoreA > s.scoreB ? "A" : "B";
    return finishMatch(winner, "time");
  }

  // Draw: go overtime if configured and not already in overtime
  const ot = Number.isFinite(s.overtimeSec) ? (s.overtimeSec as number) : 0;
  if (ot > 0 && s.phase === "play") {
    return setPhase(s, "overtime");
  }

  // Draw after overtime -> penalties
  const next = setPhase(s, "penalties");
  const ensured: BabyFootState = {
    ...next,
    penalties: next.penalties ?? { shotsA: 0, shotsB: 0, goalsA: 0, goalsB: 0, turn: "A" },
  };
  saveBabyFootState(ensured);
  return ensured;
}
