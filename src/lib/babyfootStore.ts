// =============================================================
// src/lib/babyfootStore.ts
// Baby-Foot (LOCAL ONLY)
//
// ✅ V3: teams + profiles + events + timer + overtime/penalties + sets + handicap + golden goal
// - Backward compatible with existing saved state (v1/v2)
// - No dependency on Darts/Pétanque/PingPong
// =============================================================

export type BabyFootTeamId = "A" | "B";
export type BabyFootMode = "1v1" | "2v2" | "2v1";

export type BabyFootPhase = "play" | "overtime" | "penalties";

export type BabyFootEvent =
  | { t: "start"; at: number }
  | { t: "goal"; at: number; team: BabyFootTeamId; scorerId?: string | null }
  | { t: "undo"; at: number }
  | { t: "overtime_start"; at: number }
  | { t: "penalties_start"; at: number }
  | { t: "penalty"; at: number; team: BabyFootTeamId; scorerId?: string | null }
  | { t: "set_end"; at: number; setIndex: number; scoreA: number; scoreB: number; winner: BabyFootTeamId }
  | { t: "finish"; at: number; winner: BabyFootTeamId };

export type BabyFootSetResult = { setIndex: number; scoreA: number; scoreB: number; winner: BabyFootTeamId };

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

  // score (current set score if sets enabled)
  scoreA: number;
  scoreB: number;

  // classic target (when sets disabled)
  target: number;

  // ✅ options
  matchDurationSec: number | null;      // regulation time (null = disabled)
  overtimeSec: number;                  // default 60
  goldenGoal: boolean;                  // first goal wins (regardless of target/sets)

  // handicap (applied at start of match only)
  handicapA: number;
  handicapB: number;

  // ✅ sets
  setsBestOf: 0 | 3 | 5;                // 0 = disabled
  setTarget: number;                    // goals to win a set
  currentSet: number;                   // 1-based
  setsWonA: number;
  setsWonB: number;
  setResults: BabyFootSetResult[];

  // timer
  startedAt: number | null;
  finishedAt: number | null;
  overtimeStartedAt: number | null;

  // penalties
  phase: BabyFootPhase;
  penA: number;
  penB: number;
  penRound: number;                     // 1.. (5 then sudden death)
  penKicksInRound: number;              // 0/1/2 tracking A+B
  penFinished: boolean;

  // status
  finished: boolean;
  winner: BabyFootTeamId | null;

  // events log
  events: BabyFootEvent[];

  // undo stack snapshots
  undo: Array<
    Pick<
      BabyFootState,
      | "scoreA"
      | "scoreB"
      | "finished"
      | "winner"
      | "updatedAt"
      | "events"
      | "finishedAt"
      | "phase"
      | "overtimeStartedAt"
      | "penA"
      | "penB"
      | "penRound"
      | "penKicksInRound"
      | "penFinished"
      | "currentSet"
      | "setsWonA"
      | "setsWonB"
      | "setResults"
    >
  >;
};

const LS_KEY = "babyfoot_state_v3";

function uid() {
  return `bf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

    matchDurationSec: null,
    overtimeSec: 60,
    goldenGoal: false,

    handicapA: 0,
    handicapB: 0,

    setsBestOf: 0,
    setTarget: 7,
    currentSet: 1,
    setsWonA: 0,
    setsWonB: 0,
    setResults: [],

    startedAt: null,
    finishedAt: null,
    overtimeStartedAt: null,

    phase: "play",
    penA: 0,
    penB: 0,
    penRound: 1,
    penKicksInRound: 0,
    penFinished: false,

    finished: false,
    winner: null,

    events: [],
    undo: [],
    ...partial,
  };
}

// Backward compat: migrate old v1/v2 shape to v3
function migrate(raw: any): BabyFootState {
  if (!raw || typeof raw !== "object") return defaultBabyFootState();

  const now = Date.now();
  const mode: BabyFootMode = raw.mode ?? "1v1";
  const teamAPlayers = raw.teamAPlayers ?? (mode === "2v2" || mode === "2v1" ? 2 : 1);
  const teamBPlayers = raw.teamBPlayers ?? (mode === "2v2" ? 2 : 1);

  const v3 = defaultBabyFootState({
    matchId: raw.matchId || raw.id || uid(),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    teamA: raw.teamA ?? "TEAM A",
    teamB: raw.teamB ?? "TEAM B",
    mode,
    teamAPlayers,
    teamBPlayers,
    teamAProfileIds: Array.isArray(raw.teamAProfileIds) ? raw.teamAProfileIds : [],
    teamBProfileIds: Array.isArray(raw.teamBProfileIds) ? raw.teamBProfileIds : [],
    scoreA: Number(raw.scoreA ?? 0) || 0,
    scoreB: Number(raw.scoreB ?? 0) || 0,
    target: clamp(Number(raw.target ?? 10) || 10, 1, 99),

    matchDurationSec:
      raw.matchDurationSec === null || raw.matchDurationSec === undefined ? null : clamp(Number(raw.matchDurationSec) || 0, 10, 3600),
    overtimeSec: clamp(Number(raw.overtimeSec ?? 60) || 60, 0, 600),
    goldenGoal: !!raw.goldenGoal,

    handicapA: clamp(Number(raw.handicapA ?? 0) || 0, 0, 20),
    handicapB: clamp(Number(raw.handicapB ?? 0) || 0, 0, 20),

    setsBestOf: (raw.setsBestOf === 3 || raw.setsBestOf === 5) ? raw.setsBestOf : 0,
    setTarget: clamp(Number(raw.setTarget ?? 7) || 7, 1, 30),
    currentSet: clamp(Number(raw.currentSet ?? 1) || 1, 1, 99),
    setsWonA: clamp(Number(raw.setsWonA ?? 0) || 0, 0, 99),
    setsWonB: clamp(Number(raw.setsWonB ?? 0) || 0, 0, 99),
    setResults: Array.isArray(raw.setResults) ? raw.setResults : [],

    startedAt: raw.startedAt ?? null,
    finishedAt: raw.finishedAt ?? null,
    overtimeStartedAt: raw.overtimeStartedAt ?? null,

    phase: raw.phase === "overtime" || raw.phase === "penalties" ? raw.phase : "play",
    penA: clamp(Number(raw.penA ?? 0) || 0, 0, 99),
    penB: clamp(Number(raw.penB ?? 0) || 0, 0, 99),
    penRound: clamp(Number(raw.penRound ?? 1) || 1, 1, 99),
    penKicksInRound: clamp(Number(raw.penKicksInRound ?? 0) || 0, 0, 2),
    penFinished: !!raw.penFinished,

    finished: !!raw.finished,
    winner: raw.winner === "A" || raw.winner === "B" ? raw.winner : null,

    events: Array.isArray(raw.events) ? raw.events : [],
    undo: Array.isArray(raw.undo) ? raw.undo : [],
  });

  return v3;
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
  const next = defaultBabyFootState(partial);
  saveBabyFootState(next);
  return next;
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
  const next = { ...s, target: clamp(target, 1, 99), updatedAt: Date.now() };
  saveBabyFootState(next);
  return next;
}

export function setTeamsProfiles(teamAProfileIds: string[], teamBProfileIds: string[]) {
  const s = loadBabyFootState();
  const next = {
    ...s,
    teamAProfileIds: Array.isArray(teamAProfileIds) ? teamAProfileIds : [],
    teamBProfileIds: Array.isArray(teamBProfileIds) ? teamBProfileIds : [],
    updatedAt: Date.now(),
  };
  saveBabyFootState(next);
  return next;
}

export function setOptions(opts: Partial<Pick<
  BabyFootState,
  "matchDurationSec" | "overtimeSec" | "goldenGoal" | "handicapA" | "handicapB" | "setsBestOf" | "setTarget"
>>) {
  const s = loadBabyFootState();
  const next: BabyFootState = {
    ...s,
    matchDurationSec: (opts.matchDurationSec === null || opts.matchDurationSec === undefined)
      ? s.matchDurationSec
      : (opts.matchDurationSec ? clamp(Number(opts.matchDurationSec) || 0, 10, 3600) : null),
    overtimeSec: opts.overtimeSec === undefined ? s.overtimeSec : clamp(Number(opts.overtimeSec) || 0, 0, 600),
    goldenGoal: opts.goldenGoal === undefined ? s.goldenGoal : !!opts.goldenGoal,
    handicapA: opts.handicapA === undefined ? s.handicapA : clamp(Number(opts.handicapA) || 0, 0, 20),
    handicapB: opts.handicapB === undefined ? s.handicapB : clamp(Number(opts.handicapB) || 0, 0, 20),
    setsBestOf: (opts.setsBestOf === 3 || opts.setsBestOf === 5 || opts.setsBestOf === 0) ? opts.setsBestOf : s.setsBestOf,
    setTarget: opts.setTarget === undefined ? s.setTarget : clamp(Number(opts.setTarget) || 1, 1, 30),
    updatedAt: Date.now(),
  };
  saveBabyFootState(next);
  return next;
}

function pushUndo(s: BabyFootState) {
  const snapshot: any = {
    scoreA: s.scoreA,
    scoreB: s.scoreB,
    finished: s.finished,
    winner: s.winner,
    updatedAt: s.updatedAt,
    events: s.events,
    finishedAt: s.finishedAt,
    phase: s.phase,
    overtimeStartedAt: s.overtimeStartedAt,
    penA: s.penA,
    penB: s.penB,
    penRound: s.penRound,
    penKicksInRound: s.penKicksInRound,
    penFinished: s.penFinished,
    currentSet: s.currentSet,
    setsWonA: s.setsWonA,
    setsWonB: s.setsWonB,
    setResults: s.setResults,
  };
  const undo = [...(s.undo || []), snapshot].slice(-60);
  return { ...s, undo };
}

function winSetsNeeded(bestOf: 3 | 5) {
  return Math.floor(bestOf / 2) + 1;
}

function finishMatch(s: BabyFootState, winner: BabyFootTeamId, now: number) {
  const events = [...(s.events || [])];
  events.push({ t: "finish", at: now, winner });
  const next: BabyFootState = {
    ...s,
    finished: true,
    winner,
    finishedAt: now,
    events,
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

function startOvertime(s: BabyFootState, now: number) {
  const events = [...(s.events || []), { t: "overtime_start", at: now } as BabyFootEvent];
  const next: BabyFootState = {
    ...s,
    phase: "overtime",
    overtimeStartedAt: now,
    events,
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

function startPenalties(s: BabyFootState, now: number) {
  const events = [...(s.events || []), { t: "penalties_start", at: now } as BabyFootEvent];
  const next: BabyFootState = {
    ...s,
    phase: "penalties",
    penA: 0,
    penB: 0,
    penRound: 1,
    penKicksInRound: 0,
    penFinished: false,
    overtimeStartedAt: s.overtimeStartedAt,
    events,
    updatedAt: now,
  };
  saveBabyFootState(next);
  return next;
}

export function startMatch() {
  const s = loadBabyFootState();
  const now = Date.now();

  const next: BabyFootState = {
    ...s,
    scoreA: clamp(s.handicapA || 0, 0, 20),
    scoreB: clamp(s.handicapB || 0, 0, 20),

    finished: false,
    winner: null,

    undo: [],
    startedAt: now,
    finishedAt: null,
    overtimeStartedAt: null,

    phase: "play",
    penA: 0,
    penB: 0,
    penRound: 1,
    penKicksInRound: 0,
    penFinished: false,

    currentSet: 1,
    setsWonA: 0,
    setsWonB: 0,
    setResults: [],

    events: [{ t: "start", at: now }],
    updatedAt: now,
  };

  saveBabyFootState(next);
  return next;
}

function maybeEndSetOrMatch(s: BabyFootState, now: number) {
  // Golden goal always ends match immediately
  if (s.goldenGoal) {
    if (s.scoreA !== s.scoreB) {
      const winner: BabyFootTeamId = s.scoreA > s.scoreB ? "A" : "B";
      return finishMatch(s, winner, now);
    }
    return s;
  }

  // Sets mode
  if (s.setsBestOf === 3 || s.setsBestOf === 5) {
    const target = clamp(s.setTarget || 7, 1, 30);
    const reachedA = s.scoreA >= target;
    const reachedB = s.scoreB >= target;
    if (!reachedA && !reachedB) return s;

    const setWinner: BabyFootTeamId = reachedA ? "A" : "B";
    const setIndex = s.currentSet || 1;

    const setResults: BabyFootSetResult[] = [...(s.setResults || []), { setIndex, scoreA: s.scoreA, scoreB: s.scoreB, winner: setWinner }];
    let setsWonA = s.setsWonA || 0;
    let setsWonB = s.setsWonB || 0;
    if (setWinner === "A") setsWonA += 1;
    else setsWonB += 1;

    const events: BabyFootEvent[] = [...(s.events || []), { t: "set_end", at: now, setIndex, scoreA: s.scoreA, scoreB: s.scoreB, winner: setWinner }];

    // match finished?
    const need = winSetsNeeded(s.setsBestOf);
    if (setsWonA >= need || setsWonB >= need) {
      const winner: BabyFootTeamId = setsWonA >= need ? "A" : "B";
      const next: BabyFootState = { ...s, events, setResults, setsWonA, setsWonB, updatedAt: now };
      return finishMatch(next, winner, now);
    }

    // next set
    const next: BabyFootState = {
      ...s,
      scoreA: 0,
      scoreB: 0,
      currentSet: setIndex + 1,
      setsWonA,
      setsWonB,
      setResults,
      events,
      updatedAt: now,
    };
    saveBabyFootState(next);
    return next;
  }

  // Classic target mode
  const tgt = clamp(s.target || 10, 1, 99);
  if (s.scoreA >= tgt || s.scoreB >= tgt) {
    const winner: BabyFootTeamId = s.scoreA >= tgt ? "A" : "B";
    return finishMatch(s, winner, now);
  }
  return s;
}

export function addGoal(team: BabyFootTeamId, scorerId?: string | null) {
  let s = loadBabyFootState();
  if (s.finished) return s;
  if (s.phase === "penalties") return s; // in penalties, use addPenalty

  s = pushUndo(s);
  const now = Date.now();

  let scoreA = s.scoreA;
  let scoreB = s.scoreB;
  if (team === "A") scoreA += 1;
  else scoreB += 1;

  const events = [...(s.events || []), { t: "goal", at: now, team, scorerId: scorerId ?? null } as BabyFootEvent];

  let next: BabyFootState = { ...s, scoreA, scoreB, events, updatedAt: now };

  // If in overtime and golden goal is desired (common), use the same goldenGoal flag.
  next = maybeEndSetOrMatch(next, now) as BabyFootState;

  saveBabyFootState(next);
  return next;
}

export function addPenalty(team: BabyFootTeamId, scorerId?: string | null) {
  let s = loadBabyFootState();
  if (s.finished) return s;
  if (s.phase !== "penalties") return s;

  s = pushUndo(s);
  const now = Date.now();

  let penA = s.penA || 0;
  let penB = s.penB || 0;

  // A/B kick per round: we allow both teams each round (2 kicks)
  if (team === "A") penA += 1;
  else penB += 1;

  let penKicksInRound = (s.penKicksInRound || 0) + 1;
  let penRound = s.penRound || 1;

  if (penKicksInRound >= 2) {
    penKicksInRound = 0;
    penRound += 1;
  }

  const events = [...(s.events || []), { t: "penalty", at: now, team, scorerId: scorerId ?? null } as BabyFootEvent];

  let next: BabyFootState = { ...s, penA, penB, penRound, penKicksInRound, events, updatedAt: now };

  // Determine winner after minimum 5 rounds completed (10 kicks total)
  // We approximate via penRound index:
  const kicksDone = (penRound - 1) * 2 + penKicksInRound;
  const minKicks = 10;

  const hasWinner = (a: number, b: number) => a !== b;

  if (kicksDone >= minKicks && hasWinner(penA, penB)) {
    const winner: BabyFootTeamId = penA > penB ? "A" : "B";
    next = finishMatch({ ...next, penFinished: true }, winner, now);
  } else if (kicksDone > minKicks && hasWinner(penA, penB) && penKicksInRound === 0) {
    // sudden death: after a full round, first lead wins
    const winner: BabyFootTeamId = penA > penB ? "A" : "B";
    next = finishMatch({ ...next, penFinished: true }, winner, now);
  }

  saveBabyFootState(next);
  return next;
}

export function undo() {
  const s = loadBabyFootState();
  const stack = s.undo || [];
  if (!stack.length) return s;

  const last = stack[stack.length - 1];
  const undo = stack.slice(0, -1);
  const now = Date.now();

  const next: BabyFootState = {
    ...s,
    ...last,
    undo,
    updatedAt: now,
  };

  // record undo event
  const events = [...(next.events || []), { t: "undo", at: now } as BabyFootEvent];
  next.events = events;

  // if we undid finish, reopen timer
  if (!next.finished) next.finishedAt = null;
  saveBabyFootState(next);
  return next;
}

export function computeDurationMs(s: BabyFootState) {
  const end = s.finishedAt || Date.now();
  const start = s.startedAt || end;
  return Math.max(0, end - start);
}

export function computeElapsedMs(s: BabyFootState, now: number) {
  if (!s.startedAt) return 0;
  if (s.phase === "overtime" && s.overtimeStartedAt) return Math.max(0, now - s.overtimeStartedAt);
  return Math.max(0, now - s.startedAt);
}

export function finishByTime(now: number) {
  let s = loadBabyFootState();
  if (s.finished) return s;

  const dur = s.matchDurationSec;
  const ot = s.overtimeSec || 0;

  if (s.phase === "play" && dur && s.startedAt) {
    const elapsed = Math.floor((now - s.startedAt) / 1000);
    if (elapsed >= dur) {
      if (s.scoreA !== s.scoreB) {
        const winner: BabyFootTeamId = s.scoreA > s.scoreB ? "A" : "B";
        return finishMatch(s, winner, now);
      }
      // tie => overtime or penalties
      if (ot > 0) return startOvertime(s, now);
      return startPenalties(s, now);
    }
  }

  if (s.phase === "overtime" && ot > 0 && s.overtimeStartedAt) {
    const elapsed = Math.floor((now - s.overtimeStartedAt) / 1000);
    if (elapsed >= ot) {
      if (s.scoreA !== s.scoreB) {
        const winner: BabyFootTeamId = s.scoreA > s.scoreB ? "A" : "B";
        return finishMatch(s, winner, now);
      }
      return startPenalties(s, now);
    }
  }

  return s;
}
