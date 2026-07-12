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
export type BabyFootGoalKind = "normal" | "gamelle" | "peche" | "pissette" | "csc" | "parachute";
export type BabyFootGoalSource = "AV" | "DEF" | "GB" | "MIL";
export type BabyFootScoreAction = "goal" | "gamelle" | "peche_off" | "peche_def" | "pissette" | "demi" | "csc" | "parachute";
export type BabyFootRulePreset = "competition" | "bar";
export type BabyFootDemiRule = "point" | "suspend" | "forbidden"; // point conservé pour compatibilité: traité comme suspendu
export type BabyFootPissetteRule = "point" | "forbidden_stat" | "stat_only";
export type BabyFootGamelleRule = "plus_one_scoring_team" | "minus_one_conceding_team" | "stat_only";
export type BabyFootPecheOffRule = "forbidden" | "minus_one_conceding_team" | "stat_only";
export type BabyFootPecheDefRule = "forbidden" | "cancel_goal" | "stat_only";

export type BabyFootSpecialStats = {
  demiA: number;
  demiB: number;
  gamelleA: number;
  gamelleB: number;
  pissetteA: number;
  pissetteB: number;
  pissetteValidA: number;
  pissetteValidB: number;
  pissetteRefusedA: number;
  pissetteRefusedB: number;
  pecheOffA: number;
  pecheOffB: number;
  pecheDefA: number;
  pecheDefB: number;
  demiBonusAppliedA: number;
  demiBonusAppliedB: number;
  goalAvA: number;
  goalAvB: number;
  goalDefA: number;
  goalDefB: number;
  goalGbA: number;
  goalGbB: number;
  cscA: number;
  cscB: number;
  parachuteA: number;
  parachuteB: number;
};

export type BabyFootEvent =
  | { t: "start"; at: number; elapsedMs?: number }
  | {
      t: "goal";
      at: number;
      elapsedMs?: number;
      team: BabyFootTeamId;
      scorerId?: string | null;
      ownGoalById?: string | null;
      ownGoalTeam?: BabyFootTeamId | null;
      phase?: BabyFootPhase;
      kind?: BabyFootGoalKind;
      points?: number;
      demiBonusApplied?: number;
      sourceLine?: BabyFootGoalSource;
    }
  | { t: "demi"; at: number; elapsedMs?: number; team: BabyFootTeamId; scorerId?: string | null; phase?: BabyFootPhase; sourceLine?: BabyFootGoalSource; counted?: boolean; lastBallPenalty?: number; pendingBefore?: number; scoreDeltaA?: number; scoreDeltaB?: number }
  | { t: "special"; at: number; elapsedMs?: number; team: BabyFootTeamId; scorerId?: string | null; phase?: BabyFootPhase; kind: Exclude<BabyFootScoreAction, "goal" | "demi">; counted?: boolean; scoreDeltaA?: number; scoreDeltaB?: number; demiBonusApplied?: number; sourceLine?: BabyFootGoalSource }
  | { t: "pen_shot"; at: number; elapsedMs?: number; team: BabyFootTeamId; scored: boolean; scorerId?: string | null }
  | { t: "set_win"; at: number; elapsedMs?: number; team: BabyFootTeamId; setIndex: number }
  | { t: "phase"; at: number; elapsedMs?: number; phase: BabyFootPhase }
  | { t: "undo"; at: number; elapsedMs?: number }
  | { t: "finish"; at: number; elapsedMs?: number; winner: BabyFootTeamId | null; reason: "target" | "golden" | "time" | "sets" | "penalties" | "draw" };

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
  scoreMode?: "target" | "balls5" | "balls10" | "balls11" | "chrono";
  maxBalls?: number | null;

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
  rulesPreset: BabyFootRulePreset;
  demiRule: BabyFootDemiRule;
  pissetteRule: BabyFootPissetteRule;
  gamelleRule: BabyFootGamelleRule;
  pecheOffRule: BabyFootPecheOffRule;
  pecheDefRule: BabyFootPecheDefRule;
  allowRoulette: boolean;
  allowTacles: boolean;
  allowLobShot: boolean;
  specialStats: BabyFootSpecialStats;

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
      | "specialStats"
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

function emptySpecialStats(): BabyFootSpecialStats {
  return {
    demiA: 0,
    demiB: 0,
    gamelleA: 0,
    gamelleB: 0,
    pissetteA: 0,
    pissetteB: 0,
    pissetteValidA: 0,
    pissetteValidB: 0,
    pissetteRefusedA: 0,
    pissetteRefusedB: 0,
    pecheOffA: 0,
    pecheOffB: 0,
    pecheDefA: 0,
    pecheDefB: 0,
    demiBonusAppliedA: 0,
    demiBonusAppliedB: 0,
    goalAvA: 0,
    goalAvB: 0,
    goalDefA: 0,
    goalDefB: 0,
    goalGbA: 0,
    goalGbB: 0,
    cscA: 0,
    cscB: 0,
    parachuteA: 0,
    parachuteB: 0,
  };
}

function normalizeSpecialStats(raw: any): BabyFootSpecialStats {
  const base = emptySpecialStats();
  if (!raw || typeof raw !== "object") return base;
  return {
    demiA: Number.isFinite(raw.demiA) ? raw.demiA : base.demiA,
    demiB: Number.isFinite(raw.demiB) ? raw.demiB : base.demiB,
    gamelleA: Number.isFinite(raw.gamelleA) ? raw.gamelleA : base.gamelleA,
    gamelleB: Number.isFinite(raw.gamelleB) ? raw.gamelleB : base.gamelleB,
    pissetteA: Number.isFinite(raw.pissetteA) ? raw.pissetteA : base.pissetteA,
    pissetteB: Number.isFinite(raw.pissetteB) ? raw.pissetteB : base.pissetteB,
    pissetteValidA: Number.isFinite(raw.pissetteValidA) ? raw.pissetteValidA : base.pissetteValidA,
    pissetteValidB: Number.isFinite(raw.pissetteValidB) ? raw.pissetteValidB : base.pissetteValidB,
    pissetteRefusedA: Number.isFinite(raw.pissetteRefusedA) ? raw.pissetteRefusedA : base.pissetteRefusedA,
    pissetteRefusedB: Number.isFinite(raw.pissetteRefusedB) ? raw.pissetteRefusedB : base.pissetteRefusedB,
    pecheOffA: Number.isFinite(raw.pecheOffA) ? raw.pecheOffA : base.pecheOffA,
    pecheOffB: Number.isFinite(raw.pecheOffB) ? raw.pecheOffB : base.pecheOffB,
    pecheDefA: Number.isFinite(raw.pecheDefA) ? raw.pecheDefA : base.pecheDefA,
    pecheDefB: Number.isFinite(raw.pecheDefB) ? raw.pecheDefB : base.pecheDefB,
    demiBonusAppliedA: Number.isFinite(raw.demiBonusAppliedA) ? raw.demiBonusAppliedA : base.demiBonusAppliedA,
    demiBonusAppliedB: Number.isFinite(raw.demiBonusAppliedB) ? raw.demiBonusAppliedB : base.demiBonusAppliedB,
    goalAvA: Number.isFinite(raw.goalAvA) ? raw.goalAvA : base.goalAvA,
    goalAvB: Number.isFinite(raw.goalAvB) ? raw.goalAvB : base.goalAvB,
    goalDefA: Number.isFinite(raw.goalDefA) ? raw.goalDefA : base.goalDefA,
    goalDefB: Number.isFinite(raw.goalDefB) ? raw.goalDefB : base.goalDefB,
    goalGbA: Number.isFinite(raw.goalGbA) ? raw.goalGbA : base.goalGbA,
    goalGbB: Number.isFinite(raw.goalGbB) ? raw.goalGbB : base.goalGbB,
    cscA: Number.isFinite(raw.cscA) ? raw.cscA : base.cscA,
    cscB: Number.isFinite(raw.cscB) ? raw.cscB : base.cscB,
    parachuteA: Number.isFinite(raw.parachuteA) ? raw.parachuteA : base.parachuteA,
    parachuteB: Number.isFinite(raw.parachuteB) ? raw.parachuteB : base.parachuteB,
  };
}

function bumpSpecialStats(
  stats: BabyFootSpecialStats,
  key: keyof BabyFootSpecialStats,
  amount = 1
): BabyFootSpecialStats {
  return { ...stats, [key]: Math.max(0, Number((stats as any)[key]) || 0) + amount } as BabyFootSpecialStats;
}

function applyPresetDefaults(preset: BabyFootRulePreset) {
  if (preset === "bar") {
    return {
      rulesPreset: "bar" as BabyFootRulePreset,
      demiRule: "suspend" as BabyFootDemiRule,
      pissetteRule: "forbidden_stat" as BabyFootPissetteRule,
      gamelleRule: "minus_one_conceding_team" as BabyFootGamelleRule,
      pecheOffRule: "minus_one_conceding_team" as BabyFootPecheOffRule,
      pecheDefRule: "cancel_goal" as BabyFootPecheDefRule,
      allowRoulette: false,
      allowTacles: false,
      allowLobShot: false,
    };
  }
  return {
    rulesPreset: "competition" as BabyFootRulePreset,
    demiRule: "suspend" as BabyFootDemiRule,
    pissetteRule: "point" as BabyFootPissetteRule,
    gamelleRule: "plus_one_scoring_team" as BabyFootGamelleRule,
    pecheOffRule: "forbidden" as BabyFootPecheOffRule,
    pecheDefRule: "forbidden" as BabyFootPecheDefRule,
    allowRoulette: false,
    allowTacles: false,
    allowLobShot: false,
  };
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
    scoreMode: "target",
    maxBalls: null,

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
    ...applyPresetDefaults("competition"),
    specialStats: emptySpecialStats(),

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
    scoreMode: raw.scoreMode === "balls5" || raw.scoreMode === "balls10" || raw.scoreMode === "balls11" || raw.scoreMode === "chrono" ? raw.scoreMode : "target",
    maxBalls: Number.isFinite(raw.maxBalls) ? raw.maxBalls : null,

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

    rulesPreset: raw.rulesPreset === "bar" ? "bar" : "competition",
    demiRule: raw.demiRule || (raw.rulesPreset === "bar" ? "suspend" : "point"),
    pissetteRule: raw.pissetteRule || (raw.rulesPreset === "bar" ? "forbidden_stat" : "point"),
    gamelleRule: raw.gamelleRule || (raw.rulesPreset === "bar" ? "minus_one_conceding_team" : "plus_one_scoring_team"),
    pecheOffRule: raw.pecheOffRule || (raw.rulesPreset === "bar" ? "minus_one_conceding_team" : "forbidden"),
    pecheDefRule: raw.pecheDefRule || (raw.rulesPreset === "bar" ? "cancel_goal" : "forbidden"),
    allowRoulette: !!raw.allowRoulette,
    allowTacles: !!raw.allowTacles,
    allowLobShot: !!raw.allowLobShot,
    specialStats: normalizeSpecialStats(raw.specialStats),

    finished,
    winner: raw.winner ?? null,

    events: Array.isArray(raw.events) ? raw.events : [],
    undo: Array.isArray(raw.undo) ? raw.undo : [],
  });

  // Handicap = malus pour l’équipe concernée : les buts de départ sont donnés à l’adversaire.
  if (v3.scoreA === 0 && v3.scoreB === 0 && (v3.handicapA || v3.handicapB)) {
    v3.scoreA = Math.max(0, v3.handicapB || 0);
    v3.scoreB = Math.max(0, v3.handicapA || 0);
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

function computeDurationAtMs(s: BabyFootState, at: number) {
  if (!s.startedAt) return 0;
  const end = Number.isFinite(at) && at > 0 ? at : Date.now();
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
    rulesPreset: s.rulesPreset === "bar" ? "bar" : "competition",
    demiRule: s.demiRule || "point",
    pissetteRule: s.pissetteRule || "point",
    gamelleRule: s.gamelleRule || "plus_one_scoring_team",
    pecheOffRule: s.pecheOffRule || "forbidden",
    pecheDefRule: s.pecheDefRule || "forbidden",
    allowRoulette: !!s.allowRoulette,
    allowTacles: !!s.allowTacles,
    allowLobShot: !!s.allowLobShot,
    specialStats: normalizeSpecialStats(s.specialStats),
    events: [...(s.events || [])],
  };
  return [...(s.undo || []), snap].slice(-50);
}

function isLimitedBallsMode(s: Pick<BabyFootState, "scoreMode">) {
  return s.scoreMode === "balls5" || s.scoreMode === "balls10" || s.scoreMode === "balls11";
}

function maxBallsForState(s: Pick<BabyFootState, "scoreMode" | "maxBalls">) {
  const fallback = s.scoreMode === "balls5" ? 5 : s.scoreMode === "balls11" ? 11 : 10;
  return Math.max(1, Math.floor(Number(s.maxBalls) || fallback));
}

function isPlayableBallEvent(event: BabyFootEvent | any) {
  if (!event || typeof event !== "object") return false;
  const kind = String(event.kind || "");

  // Une gamelle ne met pas fin à l'échange : la balle reste en jeu.
  // Même principe pour les pêches offensive/défensive. Ces actions modifient
  // éventuellement le score et les statistiques, mais ne consomment jamais
  // une balle dans les formats 5 / 10 / 11 balles.
  if (event.t === "goal") return kind !== "gamelle";
  if (event.t === "demi") return true;
  if (event.t === "special") {
    return kind === "pissette" || kind === "csc" || kind === "parachute";
  }
  return false;
}

function playedBallsCount(events: BabyFootEvent[] | any[]) {
  return (Array.isArray(events) ? events : []).filter(isPlayableBallEvent).length;
}

function finishAfterLimitedBallsIfNeeded(s: BabyFootState, now: number, reason: "target" | "draw" = "target") {
  if (!isLimitedBallsMode(s)) return s;
  const maxBalls = maxBallsForState(s);
  if (playedBallsCount(s.events || []) < maxBalls) return s;
  if (s.setsEnabled) return maybeWinLimitedBallsSet(s);
  const winner: BabyFootTeamId | null = s.scoreA === s.scoreB ? null : s.scoreA > s.scoreB ? "A" : "B";
  return persist({
    ...s,
    finished: true,
    winner,
    phase: "finished",
    clockRunning: false,
    finishedAt: now,
    events: [...(s.events || []), { t: "finish", at: now, elapsedMs: computeDurationAtMs(s, now), winner, reason: winner ? reason : "draw" }],
    updatedAt: now,
  });
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
  return loadBabyFootState();
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
    scoreA: Math.max(0, s.handicapB || 0),
    scoreB: Math.max(0, s.handicapA || 0),
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


function maybeWinLimitedBallsSet(s: BabyFootState) {
  if (!s.setsEnabled) return s;
  if (s.scoreMode !== "balls5" && s.scoreMode !== "balls10" && s.scoreMode !== "balls11") return s;

  const maxBalls = maxBallsForState(s);
  if (playedBallsCount(s.events || []) < maxBalls) return s;

  // En sets + balles limitées, le set se termine à la limite de balles jouées si un camp mène.
  // En cas d'égalité, on laisse jouer la balle suivante pour éviter un set sans vainqueur.
  if (s.scoreA === s.scoreB) return s;

  const now = Date.now();
  const winner: BabyFootTeamId = s.scoreA > s.scoreB ? "A" : "B";
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
    scoreA: Math.max(0, s.handicapB || 0),
    scoreB: Math.max(0, s.handicapA || 0),
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

function applyScoreAction(kind: BabyFootScoreAction, team: BabyFootTeamId, scorerId?: string | null, sourceLine?: BabyFootGoalSource) {
  let s = startIfNeeded();
  if (s.finished || s.phase === "penalties") return s;

  const now = Date.now();
  const elapsedMs = computeDurationAtMs(s, now);
  const undo = pushUndo(s);
  let stats = normalizeSpecialStats(s.specialStats);
  const pending = Math.max(0, Number(s.pendingDemiBonus) || 0);

  const withGoalEvent = (
    nextScoreA: number,
    nextScoreB: number,
    goalKind: BabyFootGoalKind,
    points: number,
    demiBonusApplied: number,
    eventTeam: BabyFootTeamId = team,
    eventScorerId: string | null | undefined = scorerId,
    ownGoal?: { byId?: string | null; team?: BabyFootTeamId | null }
  ) => {
    let next: BabyFootState = {
      ...s,
      undo,
      scoreA: Math.max(0, nextScoreA),
      scoreB: Math.max(0, nextScoreB),
      pendingDemiBonus: 0,
      specialStats: stats,
      events: [
        ...(s.events || []),
        {
          t: "goal",
          at: now,
          elapsedMs,
          team: eventTeam,
          scorerId: eventScorerId ?? null,
          ownGoalById: ownGoal?.byId ?? null,
          ownGoalTeam: ownGoal?.team ?? null,
          phase: s.phase,
          kind: goalKind,
          points,
          demiBonusApplied,
          sourceLine,
        },
      ],
      updatedAt: now,
    };

    if (s.phase === "play" && s.goldenGoal) {
      next = {
        ...next,
        finished: true,
        winner: eventTeam,
        phase: "finished",
        clockRunning: false,
        finishedAt: now,
        events: [...(next.events || []), { t: "finish", at: now, winner: eventTeam, reason: "golden" }],
      };
      return persist(next);
    }

    if (s.phase === "overtime" && s.overtimeGoldenGoal) {
      next = {
        ...next,
        finished: true,
        winner: eventTeam,
        phase: "finished",
        clockRunning: false,
        finishedAt: now,
        events: [...(next.events || []), { t: "finish", at: now, winner: eventTeam, reason: "golden" }],
      };
      return persist(next);
    }

    next = maybeWinSet(next);
    if (next.finished) return next;

    next = finishAfterLimitedBallsIfNeeded(next, now, "target");
    if (next.finished) return next;

    if (!next.setsEnabled && next.scoreMode !== "chrono" && !isLimitedBallsMode(next) && !next.finished) {
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
  };

  const withSpecialEvent = (patch: Partial<BabyFootState>, specialKind: Exclude<BabyFootScoreAction, "goal" | "demi">, extra?: { counted?: boolean; scoreDeltaA?: number; scoreDeltaB?: number; demiBonusApplied?: number }) => {
    const next: BabyFootState = {
      ...s,
      undo,
      specialStats: stats,
      ...patch,
      scoreA: Math.max(0, Number((patch as any).scoreA ?? s.scoreA) || 0),
      scoreB: Math.max(0, Number((patch as any).scoreB ?? s.scoreB) || 0),
      events: [
        ...(s.events || []),
        {
          t: "special",
          at: now,
          elapsedMs,
          team,
          scorerId: scorerId ?? null,
          phase: s.phase,
          kind: specialKind,
          counted: extra?.counted,
          scoreDeltaA: extra?.scoreDeltaA,
          scoreDeltaB: extra?.scoreDeltaB,
          demiBonusApplied: extra?.demiBonusApplied,
          sourceLine,
        },
      ],
      updatedAt: now,
    };
    return persist(next);
  };

  if (kind === "demi") {
    // Règle Baby-Foot validée :
    // - Partie au temps : le DEMI est totalement ignoré (aucun point, aucun bonus, aucune stat).
    // - Partie à nombre de balles : si le DEMI tombe sur la dernière balle, il enlève
    //   2 points à son équipe + les demis déjà en suspens.
    //   Exemple : aucun demi en suspens => -2 ; 1 demi en suspens => -3 ; 2 => -4, etc.
    // - Sinon, le DEMI reste en suspens pour le prochain BUT NORMAL AV/DEF/GB.
    if (s.scoreMode === "chrono") {
      return s;
    }

    stats = bumpSpecialStats(stats, team === "A" ? "demiA" : "demiB");

    if (isLimitedBallsMode(s)) {
      const maxBalls = maxBallsForState(s);
      const isLastBall = playedBallsCount(s.events || []) >= maxBalls - 1;
      if (isLastBall) {
        const penalty = Math.max(2, pending + 2);
        const scoreDeltaA = team === "A" ? -penalty : 0;
        const scoreDeltaB = team === "B" ? -penalty : 0;
        const nextScoreA = Math.max(0, s.scoreA + scoreDeltaA);
        const nextScoreB = Math.max(0, s.scoreB + scoreDeltaB);
        const demiEvent: BabyFootEvent = {
          t: "demi",
          at: now,
          elapsedMs,
          team,
          scorerId: scorerId ?? null,
          phase: s.phase,
          sourceLine: sourceLine ?? "MIL",
          counted: true,
          pendingBefore: pending,
          lastBallPenalty: penalty,
          scoreDeltaA,
          scoreDeltaB,
        };
        let next: BabyFootState = {
          ...s,
          undo,
          scoreA: nextScoreA,
          scoreB: nextScoreB,
          pendingDemiBonus: 0,
          specialStats: stats,
          events: [...(s.events || []), demiEvent],
          updatedAt: now,
        };

        if (next.setsEnabled) {
          next = maybeWinLimitedBallsSet(next);
          if (next.finished) return next;
          return persist(next);
        }

        const winner: BabyFootTeamId | null = nextScoreA === nextScoreB ? null : nextScoreA > nextScoreB ? "A" : "B";
        next = {
          ...next,
          finished: true,
          winner,
          phase: "finished",
          clockRunning: false,
          finishedAt: now,
          events: [...(next.events || []), { t: "finish", at: now, elapsedMs, winner, reason: winner ? "target" : "draw" }],
        };
        return persist(next);
      }
    }

    if (s.demiRule === "forbidden") {
      const next: BabyFootState = {
        ...s,
        undo,
        specialStats: stats,
        events: [...(s.events || []), { t: "demi", at: now, elapsedMs, team, scorerId: scorerId ?? null, phase: s.phase, sourceLine: sourceLine ?? "MIL", counted: false }],
        updatedAt: now,
      };
      return persist(next);
    }

    const next: BabyFootState = {
      ...s,
      undo,
      pendingDemiBonus: pending + 1,
      specialStats: stats,
      events: [...(s.events || []), { t: "demi", at: now, elapsedMs, team, scorerId: scorerId ?? null, phase: s.phase, sourceLine: sourceLine ?? "MIL", counted: true }],
      updatedAt: now,
    };
    return persist(next);
  }

  if (kind === "goal" && sourceLine === "MIL") {
    return applyScoreAction("demi", team, scorerId, "MIL");
  }

  if (kind === "goal") {
    if (sourceLine === "AV") stats = bumpSpecialStats(stats, team === "A" ? "goalAvA" : "goalAvB");
    if (sourceLine === "DEF") stats = bumpSpecialStats(stats, team === "A" ? "goalDefA" : "goalDefB");
    if (sourceLine === "GB") stats = bumpSpecialStats(stats, team === "A" ? "goalGbA" : "goalGbB");
    const bonus = pending;
    if (team === "A" && bonus > 0) stats = bumpSpecialStats(stats, "demiBonusAppliedA", bonus);
    if (team === "B" && bonus > 0) stats = bumpSpecialStats(stats, "demiBonusAppliedB", bonus);
    return withGoalEvent(s.scoreA + (team === "A" ? 1 + bonus : 0), s.scoreB + (team === "B" ? 1 + bonus : 0), "normal", 1 + bonus, bonus);
  }

  if (kind === "gamelle") {
    stats = bumpSpecialStats(stats, team === "A" ? "gamelleA" : "gamelleB");
    if (s.gamelleRule === "plus_one_scoring_team") {
      return withGoalEvent(s.scoreA + (team === "A" ? 1 : 0), s.scoreB + (team === "B" ? 1 : 0), "gamelle", 1, 0);
    }
    if (s.gamelleRule === "minus_one_conceding_team") {
      const scoreA = team === "A" ? s.scoreA : Math.max(0, s.scoreA - 1);
      const scoreB = team === "B" ? s.scoreB : Math.max(0, s.scoreB - 1);
      return withSpecialEvent({ scoreA, scoreB }, "gamelle", { counted: true, scoreDeltaA: scoreA - s.scoreA, scoreDeltaB: scoreB - s.scoreB });
    }
    return withSpecialEvent({}, "gamelle", { counted: true, scoreDeltaA: 0, scoreDeltaB: 0 });
  }

  if (kind === "pissette") {
    stats = bumpSpecialStats(stats, team === "A" ? "pissetteA" : "pissetteB");
    if (s.pissetteRule === "point") {
      stats = bumpSpecialStats(stats, team === "A" ? "pissetteValidA" : "pissetteValidB");
      // Une pissette validée marque son point, mais ne consomme pas les demis en suspens :
      // seuls les BUTS NORMAUX AV/DEF/GB récupèrent la réserve de demis.
      return withGoalEvent(s.scoreA + (team === "A" ? 1 : 0), s.scoreB + (team === "B" ? 1 : 0), "pissette", 1, 0);
    }
    if (s.pissetteRule === "forbidden_stat") stats = bumpSpecialStats(stats, team === "A" ? "pissetteRefusedA" : "pissetteRefusedB");
    return withSpecialEvent({}, "pissette", { counted: s.pissetteRule === "forbidden_stat", scoreDeltaA: 0, scoreDeltaB: 0 });
  }

  if (kind === "parachute") {
    stats = bumpSpecialStats(stats, team === "A" ? "parachuteA" : "parachuteB");
    // Parachute = balle qui passe au-dessus de la barre du gardien : +2 et stat dédiée.
    return withGoalEvent(s.scoreA + (team === "A" ? 2 : 0), s.scoreB + (team === "B" ? 2 : 0), "parachute", 2, 0, team, scorerId ?? null, undefined);
  }

  if (kind === "csc") {
    // CSC = le joueur sélectionné marque contre son camp.
    // La stat CSC est attribuée à son équipe, mais le point est offert à l'équipe adverse.
    const ownGoalTeam = team;
    const awardedTeam: BabyFootTeamId = ownGoalTeam === "A" ? "B" : "A";
    const ownKey = ownGoalTeam === "A" ? "cscA" : "cscB";
    stats = bumpSpecialStats(stats, ownKey);
    return withGoalEvent(
      s.scoreA + (awardedTeam === "A" ? 1 : 0),
      s.scoreB + (awardedTeam === "B" ? 1 : 0),
      "csc",
      1,
      0,
      awardedTeam,
      null,
      { byId: scorerId ?? null, team: ownGoalTeam }
    );
  }

  if (kind === "peche_off") {
    stats = bumpSpecialStats(stats, team === "A" ? "pecheOffA" : "pecheOffB");
    if (s.pecheOffRule === "minus_one_conceding_team") {
      const scoreA = team === "A" ? s.scoreA : Math.max(0, s.scoreA - 1);
      const scoreB = team === "B" ? s.scoreB : Math.max(0, s.scoreB - 1);
      return withSpecialEvent({ scoreA, scoreB }, "peche_off", { counted: true, scoreDeltaA: scoreA - s.scoreA, scoreDeltaB: scoreB - s.scoreB });
    }
    return withSpecialEvent({}, "peche_off", { counted: s.pecheOffRule === "stat_only", scoreDeltaA: 0, scoreDeltaB: 0 });
  }

  if (kind === "peche_def") {
    stats = bumpSpecialStats(stats, team === "A" ? "pecheDefA" : "pecheDefB");
    if (s.pecheDefRule === "cancel_goal") {
      // Pêche défensive autorisée : elle annule le dernier point adverse possible.
      // On ne touche pas aux demis en suspens : seuls les buts normaux les consomment.
      const opponent: BabyFootTeamId = team === "A" ? "B" : "A";
      const scoreA = opponent === "A" ? Math.max(0, s.scoreA - 1) : s.scoreA;
      const scoreB = opponent === "B" ? Math.max(0, s.scoreB - 1) : s.scoreB;
      return withSpecialEvent({ scoreA, scoreB }, "peche_def", {
        counted: true,
        scoreDeltaA: scoreA - s.scoreA,
        scoreDeltaB: scoreB - s.scoreB,
      });
    }
    return withSpecialEvent({}, "peche_def", { counted: s.pecheDefRule === "stat_only", scoreDeltaA: 0, scoreDeltaB: 0 });
  }

  return s;
}

export function addGoal(team: BabyFootTeamId, scorerId?: string | null, sourceLine?: BabyFootGoalSource) {
  return applyScoreAction("goal", team, scorerId, sourceLine);
}

export function addSpecialScoreEvent(team: BabyFootTeamId, action: Exclude<BabyFootScoreAction, "goal">, scorerId?: string | null, sourceLine?: BabyFootGoalSource) {
  return applyScoreAction(action, team, scorerId, sourceLine);
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
    specialStats: normalizeSpecialStats((last as any).specialStats),
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
      | "scoreMode"
      | "maxBalls"
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
      | "rulesPreset"
      | "demiRule"
      | "pissetteRule"
      | "gamelleRule"
      | "pecheOffRule"
      | "pecheDefRule"
      | "allowRoulette"
      | "allowTacles"
      | "allowLobShot"
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
  // Handicap = malus : si A a 1 de handicap, B démarre avec +1.
  const baseA = Math.max(0, Math.floor(Number(s.handicapB) || 0));
  const baseB = Math.max(0, Math.floor(Number(s.handicapA) || 0));

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
    specialStats: emptySpecialStats(),
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
