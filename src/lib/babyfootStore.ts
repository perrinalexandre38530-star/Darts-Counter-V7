// =============================================================
// src/lib/babyfootStore.ts
// Baby-Foot (LOCAL ONLY)
// ✅ options avancées + phases (play/overtime/penalties) + sets + handicap
// ✅ chrono manuel (start / pause / reprise)
// ✅ actions spéciales (gamelle / pêche / demi empilable)
// - Backward compatible avec l'état existant
// - AUCUNE dépendance Darts / Pétanque / PingPong
// =============================================================

export type BabyFootTeamId = "A" | "B";
export type BabyFootMode = "1v1" | "2v2" | "2v1";
export type BabyFootPhase = "play" | "overtime" | "penalties" | "finished";
export type BabyFootGoalKind = "normal" | "gamelle" | "peche";
export type BabyFootScoreAction = "goal" | "gamelle" | "peche" | "demi";

export type BabyFootEvent =
  | { t: "start"; at: number }
  | {
      t: "goal";
      at: number;
      team: BabyFootTeamId;
      scorerId?: string | null;
      phase?: BabyFootPhase;
      kind?: BabyFootGoalKind;
      points?: number;
      demiBonusApplied?: number;
    }
  | { t: "demi"; at: number; team: BabyFootTeamId; scorerId?: string | null; phase?: BabyFootPhase }
  | { t: "pen_shot"; at: number; team: BabyFootTeamId; scored: boolean; scorerId?: string | null }
  | { t: "set_win"; at: number; team: BabyFootTeamId; setIndex: number }
  | { t: "phase"; at: number; phase: BabyFootPhase }
  | { t: "undo"; at: number }
  | { t: "finish"; at: number; winner: BabyFootTeamId | null; reason: "target" | "golden" | "time" | "sets" | "penalties" | "draw" };

export type PenaltiesState = {
  shotsA: number;
  shotsB: number;
  goalsA: number;
  goalsB: number;
  turn: BabyFootTeamId;
};

export type BabyFootState = {
  matchId: string;
  createdAt: number;
  updatedAt: number;

  teamA: string;
  teamB: string;

  teamARefId?: string | null;
  teamBRefId?: string | null;
  teamALogoDataUrl?: string | null;
  teamBLogoDataUrl?: string | null;

  mode: BabyFootMode;
  teamAPlayers: number;
  teamBPlayers: number;

  teamAProfileIds: string[];
  teamBProfileIds: string[];

  scoreA: number;
  scoreB: number;
  target: number;

  // chrono manuel
  startedAt: number | null;
  finishedAt: number | null;
  clockRunning: boolean;
  pausedAt: number | null;
  pausedTotalMs: number;
  phaseStartedElapsedMs: number;

  phase: BabyFootPhase;

  matchDurationSec: number | null;
  overtimeSec: number | null;
  goldenGoal: boolean;
  overtimeGoldenGoal: boolean;
  handicapA: number;
  handicapB: number;
  allowDrawOnTimeEnd?: boolean;
  requireTwoGoalLead?: boolean;

  setsEnabled: boolean;
  setsBestOf: 1 | 3 | 5;
  setTarget: number;
  setsA: number;
  setsB: number;
  setIndex: number;

  penalties: PenaltiesState | null;

  // spéciaux
  pendingDemiBonus: number;

  finished: boolean;
  winner: BabyFootTeamId | null;

  events: BabyFootEvent[];

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
      | "startedAt"
      | "clockRunning"
      | "pausedAt"
      | "pausedTotalMs"
      | "phaseStartedElapsedMs"
      | "pendingDemiBonus"
    >
  >;
};

const LS_KEY = "babyfoot_state_v3";

function uid() {
  return `bf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBestOf(v: any): 1 | 3 | 5 {
  if (v === 1 || v === 3 || v === 5) return v;
  if (v === 0) return 1;
  return 3;
}

export function defaultBabyFootState(partial?: Partial<BabyFootState>): BabyFootState {
  const now = Date.now();
  return {
    matchId: uid(),
    createdAt: now,
    updatedAt: now,

    teamA: "TEAM A",
    teamB: "TEAM B",

    teamARefId: null,
    teamBRefId: null,
    teamALogoDataUrl: null,
    teamBLogoDataUrl: null,

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
    clockRunning: false,
    pausedAt: null,
    pausedTotalMs: 0,
    phaseStartedElapsedMs: 0,

    phase: "play",

    matchDurationSec: null,
    overtimeSec: 60,
    goldenGoal: false,
    overtimeGoldenGoal: true,
    handicapA: 0,
    handicapB: 0,
    allowDrawOnTimeEnd: false,
    requireTwoGoalLead: false,

    setsEnabled: false,
    setsBestOf: 3,
    setTarget: 5,
    setsA: 0,
    setsB: 0,
    setIndex: 1,

    penalties: null,
    pendingDemiBonus: 0,

    finished: false,
    winner: null,

    events: [],
    undo: [],
    ...partial,
  };
}

function migrate(raw: any): BabyFootState {
  if (!raw || typeof raw !== "object") return defaultBabyFootState();

  const now = Date.now();
  const startedAt = raw.startedAt ?? null;
  const finished = !!raw.finished;
  const inferredClockRunning = !!(startedAt && !finished);

  const v3: BabyFootState = defaultBabyFootState({
    matchId: raw.matchId || raw.id || uid(),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,

    teamA: raw.teamA ?? "TEAM A",
    teamB: raw.teamB ?? "TEAM B",

    teamARefId: raw.teamARefId ?? null,
    teamBRefId: raw.teamBRefId ?? null,
    teamALogoDataUrl: raw.teamALogoDataUrl ?? null,
    teamBLogoDataUrl: raw.teamBLogoDataUrl ?? null,

    mode: raw.mode ?? "1v1",
    teamAPlayers: raw.teamAPlayers ?? (raw.mode === "2v2" || raw.mode === "2v1" ? 2 : 1),
    teamBPlayers: raw.teamBPlayers ?? (raw.mode === "2v2" ? 2 : 1),

    teamAProfileIds: Array.isArray(raw.teamAProfileIds) ? raw.teamAProfileIds : [],
    teamBProfileIds: Array.isArray(raw.teamBProfileIds) ? raw.teamBProfileIds : [],

    scoreA: Number.isFinite(raw.scoreA) ? raw.scoreA : 0,
    scoreB: Number.isFinite(raw.scoreB) ? raw.scoreB : 0,
    target: Number.isFinite(raw.target) ? raw.target : 10,

    startedAt,
    finishedAt: raw.finishedAt ?? null,
    clockRunning: typeof raw.clockRunning === "boolean" ? raw.clockRunning : inferredClockRunning,
    pausedAt: raw.pausedAt ?? null,
    pausedTotalMs: Number.isFinite(raw.pausedTotalMs) ? raw.pausedTotalMs : 0,
    phaseStartedElapsedMs: Number.isFinite(raw.phaseStartedElapsedMs) ? raw.phaseStartedElapsedMs : 0,

    phase: (raw.phase as BabyFootPhase) || (raw.finished ? "finished" : "play"),

    matchDurationSec: Number.isFinite(raw.matchDurationSec) ? raw.matchDurationSec : null,
    overtimeSec: Number.isFinite(raw.overtimeSec) ? raw.overtimeSec : 60,
    goldenGoal: !!raw.goldenGoal,
    overtimeGoldenGoal: raw.overtimeGoldenGoal === undefined ? true : !!raw.overtimeGoldenGoal,
    handicapA: Number.isFinite(raw.handicapA) ? raw.handicapA : 0,
    handicapB: Number.isFinite(raw.handicapB) ? raw.handicapB : 0,
    allowDrawOnTimeEnd: !!raw.allowDrawOnTimeEnd,
    requireTwoGoalLead: !!raw.requireTwoGoalLead,

    setsEnabled: !!raw.setsEnabled,
    setsBestOf: normalizeBestOf(raw.setsBestOf),
    setTarget: Number.isFinite(raw.setTarget) ? raw.setTarget : 5,
    setsA: Number.isFinite(raw.setsA) ? raw.setsA : 0,
    setsB: Number.isFinite(raw.setsB) ? raw.setsB : 0,
    setIndex: Number.isFinite(raw.setIndex) ? raw.setIndex : 1,

    penalties: raw.penalties ?? null,
    pendingDemiBonus: Number.isFinite(raw.pendingDemiBonus) ? raw.pendingDemiBonus : 0,

    finished,
    winner: raw.winner ?? null,

    events: Array.isArray(raw.events) ? raw.events : [],
    undo: Array.isArray(raw.undo) ? raw.undo : [],
  });

  if (v3.scoreA === 0 && v3.scoreB === 0 && (v3.handicapA || v3.handicapB)) {
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

export function computeDurationMs(s: BabyFootState) {
  if (!s.startedAt) return 0;
  const end = s.finishedAt ?? Date.now();
  let pausedMs = Math.max(0, Number(s.pausedTotalMs) || 0);
  if (!s.clockRunning && s.pausedAt != null) {
    pausedMs += Math.max(0, end - s.pausedAt);
  }
  return Math.max(0, end - s.startedAt - pausedMs);
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
    startedAt: s.startedAt ?? null,
    clockRunning: !!s.clockRunning,
    pausedAt: s.pausedAt ?? null,
    pausedTotalMs: Math.max(0, Number(s.pausedTotalMs) || 0),
    phaseStartedElapsedMs: Math.max(0, Number(s.phaseStartedElapsedMs) || 0),
    pendingDemiBonus: Math.max(0, Number(s.pendingDemiBonus) || 0),
    events: [...(s.events || [])],
  };
  return [...(s.undo || []), snap].slice(-50);
}

function persist(next: BabyFootState) {
  saveBabyFootState(next);
  return next;
}

function setPhase(s: BabyFootState, phase: BabyFootPhase) {
  if (s.phase === phase) return s;
  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    phase,
    phaseStartedElapsedMs: computeDurationMs(s),
    events: [...(s.events || []), { t: "phase", at: now, phase }],
    updatedAt: now,
  };
  return persist(next);
}

export function startClock() {
  const s = loadBabyFootState();
  if (s.finished) return s;
  const now = Date.now();

  if (!s.startedAt) {
    const next: BabyFootState = {
      ...s,
      startedAt: now,
      clockRunning: true,
      pausedAt: null,
      pausedTotalMs: 0,
      phaseStartedElapsedMs: 0,
      phase: "play",
      events: [...(s.events || []), { t: "start", at: now }],
      updatedAt: now,
    };
    return persist(next);
  }

  if (s.clockRunning) return s;

  const pausedChunk = s.pausedAt != null ? Math.max(0, now - s.pausedAt) : 0;
  const next: BabyFootState = {
    ...s,
    clockRunning: true,
    pausedAt: null,
    pausedTotalMs: Math.max(0, Number(s.pausedTotalMs) || 0) + pausedChunk,
    updatedAt: now,
  };
  return persist(next);
}

export function pauseClock() {
  const s = loadBabyFootState();
  if (s.finished || !s.startedAt || !s.clockRunning) return s;
  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    clockRunning: false,
    pausedAt: now,
    updatedAt: now,
  };
  return persist(next);
}

export function toggleClock() {
  const s = loadBabyFootState();
  return s.clockRunning ? pauseClock() : startClock();
}

export function startIfNeeded() {
  const s = loadBabyFootState();
  if (!s.startedAt || !s.clockRunning) return startClock();
  return s;
}

function finishMatch(winner: BabyFootTeamId | null, reason: BabyFootEvent extends any ? any : any) {
  const s = loadBabyFootState();
  if (s.finished) return s;
  const now = Date.now();
  const next: BabyFootState = {
    ...s,
    finished: true,
    winner,
    phase: "finished",
    clockRunning: false,
    finishedAt: now,
    events: [...(s.events || []), { t: "finish", at: now, winner, reason }],
    updatedAt: now,
  };
  return persist(next);
}

function maybeWinSet(s: BabyFootState) {
  if (!s.setsEnabled) return s;

  const target = Math.max(1, s.setTarget || 5);
  const require2 = !!s.requireTwoGoalLead && !Number.isFinite(s.matchDurationSec as any);
  const aWon = require2 ? s.scoreA >= target && s.scoreA >= s.scoreB + 2 : s.scoreA >= target;
  const bWon = require2 ? s.scoreB >= target && s.scoreB >= s.scoreA + 2 : s.scoreB >= target;

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
    pendingDemiBonus: 0,
    events: [...(s.events || []), { t: "set_win", at: now, team: winner, setIndex: s.setIndex }],
    updatedAt: now,
  };

  if (setsA >= needed || setsB >= needed) {
    next = {
      ...next,
      finished: true,
      winner: setsA >= needed ? "A" : "B",
      phase: "finished",
      clockRunning: false,
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: setsA >= needed ? "A" : "B", reason: "sets" }],
    };
  }

  return persist(next);
}

function applyScoreAction(kind: BabyFootScoreAction, team: BabyFootTeamId, scorerId?: string | null) {
  let s = startIfNeeded();
  if (s.finished || s.phase === "penalties") return s;

  const now = Date.now();
  const undo = pushUndo(s);

  if (kind === "demi") {
    const next: BabyFootState = {
      ...s,
      undo,
      pendingDemiBonus: Math.max(0, Number(s.pendingDemiBonus) || 0) + 1,
      events: [...(s.events || []), { t: "demi", at: now, team, scorerId: scorerId ?? null, phase: s.phase }],
      updatedAt: now,
    };
    return persist(next);
  }

  const demiBonusApplied = Math.max(0, Number(s.pendingDemiBonus) || 0);
  const points = 1 + demiBonusApplied;
  const nextScoreA = s.scoreA + (team === "A" ? points : 0);
  const nextScoreB = s.scoreB + (team === "B" ? points : 0);

  let next: BabyFootState = {
    ...s,
    undo,
    scoreA: nextScoreA,
    scoreB: nextScoreB,
    pendingDemiBonus: 0,
    events: [
      ...(s.events || []),
      {
        t: "goal",
        at: now,
        team,
        scorerId: scorerId ?? null,
        phase: s.phase,
        kind: kind === "goal" ? "normal" : kind,
        points,
        demiBonusApplied,
      },
    ],
    updatedAt: now,
  };

  if (s.phase === "play" && s.goldenGoal) {
    next = {
      ...next,
      finished: true,
      winner: team,
      phase: "finished",
      clockRunning: false,
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: team, reason: "golden" }],
    };
    return persist(next);
  }

  if (s.phase === "overtime" && s.overtimeGoldenGoal) {
    next = {
      ...next,
      finished: true,
      winner: team,
      phase: "finished",
      clockRunning: false,
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: team, reason: "golden" }],
    };
    return persist(next);
  }

  next = maybeWinSet(next);
  if (next.finished) return next;

  if (!next.setsEnabled) {
    const target = Math.max(1, next.target || 10);
    if (next.scoreA >= target || next.scoreB >= target) {
      const require2 = !!next.requireTwoGoalLead && !Number.isFinite(next.matchDurationSec as any);
      const aOk = require2 ? next.scoreA >= target && next.scoreA >= next.scoreB + 2 : next.scoreA >= target;
      const bOk = require2 ? next.scoreB >= target && next.scoreB >= next.scoreA + 2 : next.scoreB >= target;
      if (!aOk && !bOk) return persist(next);
      const winner: BabyFootTeamId = aOk ? "A" : "B";
      next = {
        ...next,
        finished: true,
        winner,
        phase: "finished",
        clockRunning: false,
        finishedAt: now,
        events: [...(next.events || []), { t: "finish", at: now, winner, reason: "target" }],
      };
    }
  }

  return persist(next);
}

export function addGoal(team: BabyFootTeamId, scorerId?: string | null) {
  return applyScoreAction("goal", team, scorerId);
}

export function addSpecialScoreEvent(team: BabyFootTeamId, action: Exclude<BabyFootScoreAction, "goal">, scorerId?: string | null) {
  return applyScoreAction(action, team, scorerId);
}

function penaltyIsDecided(p: PenaltiesState) {
  const maxInitial = 5;
  const aShots = p.shotsA;
  const bShots = p.shotsB;
  const aGoals = p.goalsA;
  const bGoals = p.goalsB;

  if (aShots <= maxInitial && bShots <= maxInitial) {
    const aRemaining = maxInitial - aShots;
    const bRemaining = maxInitial - bShots;

    if (aGoals > bGoals + bRemaining) return "A";
    if (bGoals > aGoals + aRemaining) return "B";
    if (aShots === maxInitial && bShots === maxInitial && aGoals !== bGoals) return aGoals > bGoals ? "A" : "B";
    return null;
  }

  if (aShots === bShots && aShots > maxInitial && aGoals !== bGoals) return aGoals > bGoals ? "A" : "B";
  return null;
}

export function addPenaltyShot(team: BabyFootTeamId, scored: boolean, scorerId?: string | null) {
  let s = startIfNeeded();
  if (s.finished) return s;

  if (s.phase !== "penalties") s = setPhase(s, "penalties");

  const now = Date.now();
  const undo = pushUndo(s);
  const p: PenaltiesState = s.penalties ?? { shotsA: 0, shotsB: 0, goalsA: 0, goalsB: 0, turn: "A" };
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
      clockRunning: false,
      finishedAt: now,
      events: [...(next.events || []), { t: "finish", at: now, winner: decided, reason: "penalties" }],
    };
  }

  return persist(next);
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
    startedAt: last.startedAt ?? null,
    clockRunning: !!last.clockRunning,
    pausedAt: last.pausedAt ?? null,
    pausedTotalMs: Math.max(0, Number(last.pausedTotalMs) || 0),
    phaseStartedElapsedMs: Math.max(0, Number(last.phaseStartedElapsedMs) || 0),
    pendingDemiBonus: Math.max(0, Number(last.pendingDemiBonus) || 0),
    events: [...(last.events || []), { t: "undo", at: now }],
    undo: stack.slice(0, -1),
    updatedAt: now,
  };
  return persist(next);
}

export function resetBabyFoot(partial?: Partial<BabyFootState>) {
  const next = defaultBabyFootState(partial);
  return persist(next);
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
  return persist(next);
}

export function setTeams(
  teamA: string,
  teamB: string,
  opt?: {
    teamARefId?: string | null;
    teamBRefId?: string | null;
    teamALogoDataUrl?: string | null;
    teamBLogoDataUrl?: string | null;
  }
) {
  const s = loadBabyFootState();
  const next: BabyFootState = {
    ...s,
    teamA,
    teamB,
    teamARefId: opt?.teamARefId ?? (s as any).teamARefId ?? null,
    teamBRefId: opt?.teamBRefId ?? (s as any).teamBRefId ?? null,
    teamALogoDataUrl: opt?.teamALogoDataUrl ?? (s as any).teamALogoDataUrl ?? null,
    teamBLogoDataUrl: opt?.teamBLogoDataUrl ?? (s as any).teamBLogoDataUrl ?? null,
    updatedAt: Date.now(),
  };
  return persist(next);
}

export function setTeamsProfiles(teamAProfileIds: string[], teamBProfileIds: string[]) {
  const s = loadBabyFootState();
  const next: BabyFootState = {
    ...s,
    teamAProfileIds: Array.isArray(teamAProfileIds) ? teamAProfileIds : [],
    teamBProfileIds: Array.isArray(teamBProfileIds) ? teamBProfileIds : [],
    updatedAt: Date.now(),
  };
  return persist(next);
}

export function setTarget(target: number) {
  const s = loadBabyFootState();
  const t = Math.max(1, Math.floor(Number(target) || 10));
  const next: BabyFootState = { ...s, target: t, updatedAt: Date.now() };
  return persist(next);
}

export function setAdvancedOptions(
  partial: Partial<
    Pick<
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
      | "allowDrawOnTimeEnd"
      | "requireTwoGoalLead"
    >
  >
) {
  const s = loadBabyFootState();
  const next: BabyFootState = {
    ...s,
    ...partial,
    setsBestOf: normalizeBestOf((partial as any)?.setsBestOf ?? s.setsBestOf),
    updatedAt: Date.now(),
  };
  return persist(next);
}

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
    startedAt: null,
    finishedAt: null,
    clockRunning: false,
    pausedAt: null,
    pausedTotalMs: 0,
    phaseStartedElapsedMs: 0,
    phase: "play",
    setsA: 0,
    setsB: 0,
    setIndex: 1,
    penalties: null,
    pendingDemiBonus: 0,
    finished: false,
    winner: null,
    events: [],
    undo: [],
  };

  return persist(next);
}

export function finishByTime() {
  let s = loadBabyFootState();
  if (!s.startedAt) s = startClock();
  if (s.finished) return s;

  if (s.scoreA !== s.scoreB) {
    const winner: BabyFootTeamId = s.scoreA > s.scoreB ? "A" : "B";
    return finishMatch(winner, "time");
  }

  if (s.allowDrawOnTimeEnd) return finishMatch(null, "draw");

  const ot = Number.isFinite(s.overtimeSec) ? (s.overtimeSec as number) : 0;
  if (ot > 0 && s.phase === "play") return setPhase(s, "overtime");

  const next = setPhase(s, "penalties");
  const ensured: BabyFootState = {
    ...next,
    penalties: next.penalties ?? { shotsA: 0, shotsB: 0, goalsA: 0, goalsB: 0, turn: "A" },
  };
  return persist(ensured);
}
