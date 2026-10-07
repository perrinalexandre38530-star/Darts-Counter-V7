// ============================================
// src/lib/tournaments/types.ts
// Types Tournois (LOCAL/ONLINE compatible)
// + viewKind (4 types)
// + repechage config
// + countryCode (drapeaux UI)
// + rôles / scores / feeders bracket
// ============================================

export type TournamentSource = "local" | "online";
export type TournamentCompetitionScope = "local" | "team" | "online";


export type TournamentAdminPermission =
  | "identity"
  | "participants"
  | "invitations"
  | "rules"
  | "schedule"
  | "results"
  | "admins";

export type TournamentEnrollmentRequest = {
  id: string;
  userId: string;
  profileId?: string | null;
  name: string;
  avatarUrl?: string | null;
  message?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedAt: number;
  respondedAt?: number | null;
  respondedBy?: string | null;
};

export type TournamentInvitation = {
  id: string;
  userId: string;
  profileId?: string | null;
  name: string;
  avatarUrl?: string | null;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: number;
  respondedAt?: number | null;
};


export type ChallengeCompetitionFormat = "objectives" | "duels" | "free" | "divisions";

export type ChallengeCompetitionAttempt = {
  id: string;
  playerId: string;
  objective: string;
  attemptNumber: number;
  score: number;
  tieBreak?: number;
  accuracy?: number;
  bestStreak?: number;
  historyMatchId?: string | null;
  createdAt: number;
};

export type ChallengeCompetitionRound = {
  id: string;
  cycle: number;
  round: number;
  objectives: string[];
  status: "locked" | "open" | "closed";
  openedAt?: number | null;
  closedAt?: number | null;
};

export type ChallengeCompetitionStandingSnapshot = {
  playerId: string;
  name?: string;
  division?: number;
  rank: number;
  points: number;
  cyclePoints?: number;
  wins?: number;
  podiums?: number;
  objectives?: number;
};

export type ChallengeCompetitionPlayoffResult = {
  id: string;
  playerId: string;
  side: "upper" | "lower";
  objective: string;
  attemptNumber: number;
  score: number;
  tieBreak?: number;
  historyMatchId?: string | null;
  createdAt: number;
};

export type ChallengeCompetitionPlayoff = {
  id: string;
  cycle: number;
  boundary: number;
  upperPlayerId: string;
  lowerPlayerId: string;
  upperDivision: number;
  lowerDivision: number;
  objective?: string;
  objectiveMode?: "fixed" | "random" | "multiple";
  objectivePool?: string[];
  objectives?: string[];
  attemptsPerObjective?: 1 | 2 | 3 | 4 | 5;
  results?: ChallengeCompetitionPlayoffResult[];
  objectiveResults?: Array<{
    objective: string;
    upperScore: number;
    lowerScore: number;
    upperTieBreak?: number;
    lowerTieBreak?: number;
    winner: "upper" | "lower" | "tie";
  }>;
  visits?: number;
  status?: "pending" | "playing" | "tied" | "resolved";
  upperScore?: number | null;
  lowerScore?: number | null;
  upperTieBreak?: number | null;
  lowerTieBreak?: number | null;
  upperHistoryMatchId?: string | null;
  lowerHistoryMatchId?: string | null;
  resolved?: boolean;
  winnerPlayerId?: string | null;
  resolvedAt?: number | null;
};

export type ChallengeCompetitionDivisionCycle = {
  cycle: number;
  name?: string;
  status?: "draft" | "active" | "closed";
  createdAt?: number | null;
  assignments: Record<string, number>;
  appliedAt?: number | null;
  closedAt?: number | null;
  movements?: Array<{
    id?: string;
    playerId: string;
    from: number;
    to: number;
    manual?: boolean;
    reason?: "promotion" | "relegation" | "playoff" | "manual";
    cycle?: number;
    at?: number;
    playoffId?: string | null;
    note?: string | null;
  }>;
  standingsSnapshot?: ChallengeCompetitionStandingSnapshot[];
  carryPoints?: Record<string, number>;
  pendingPlayoffs?: ChallengeCompetitionPlayoff[];
};

export type ChallengeCompetitionConfig = {
  enabled: boolean;
  format: ChallengeCompetitionFormat;
  attemptsPerObjective: 1 | 2 | 3 | 4 | 5;
  pointsPreset: "standard" | "f1" | "linear" | "custom";
  pointsTable: number[];
  countBestObjectives?: number | null;
  allowHistoryLinks?: boolean;
  attempts?: ChallengeCompetitionAttempt[];
  objectiveSettings?: Record<string, {
    visits?: number;
    attemptsPerObjective?: 1 | 2 | 3 | 4 | 5;
  }>;
  currentCycle?: number;
  divisionCycles?: ChallengeCompetitionDivisionCycle[];
  schedule?: {
    publicationMode: "all" | "round_by_round";
    objectivesPerRound: number;
    rounds: ChallengeCompetitionRound[];
  };
  cyclePoints?: {
    mode: "reset" | "carry" | "carry_percent";
    carryPercent?: number;
  };
  season?: {
    name?: string;
    status?: "draft" | "running" | "finished";
    maxCycles?: number | null;
    endsAt?: number | null;
    startedAt?: number | null;
  };
  confrontation?: {
    enabled: boolean;
    entity: "players" | "teams";
  };
  divisions?: {
    enabled: boolean;
    count: number;
    promote: number;
    relegate: number;
    resetPointsEachCycle?: boolean;
    policies?: Record<string, { promote: number; relegate: number; playoff: number }>;
    playoffEnabled?: boolean;
    playoffSlots?: number;
    playoffObjective?: string;
    playoffObjectiveMode?: "fixed" | "random" | "multiple";
    playoffObjectives?: string[];
    playoffAttemptsPerObjective?: 1 | 2 | 3 | 4 | 5;
    playoffVisits?: number;
  };
};

export type TournamentMode = "x01" | "cricket" | "killer" | "clock" | "shanghai" | "babyfoot" | "petanque" | "pingpong" | "molkky" | "dicegame" | "football" | "rugby" | "basket" | "badminton" | "tennis" | string;

export type TournamentStatus = "draft" | "running" | "finished";

export type StageType = "round_robin" | "single_elim";

export type SeedingMode = "random" | "manual" | "by_rating";

export type MatchStatus = "pending" | "playing" | "done";

export type StageRole = "groups" | "ko" | "repechage";

// ✅ 4 types demandés
export type TournamentViewKind = "single_ko" | "double_ko" | "round_robin" | "groups_ko";

export type TournamentPlayer = {
  id: string; // profileId ou botId ou uuid local
  onlineUserId?: string | null;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  isBot?: boolean;
  seed?: number | null; // tête de série (1 = meilleur)
  countryCode?: string | null; // ✅ pour drapeaux UI (FR, GB, etc.)
};

export type TournamentGameSettings = {
  mode: TournamentMode;
  rules: Record<string, any>;
};

export type TournamentRepechageConfig = {
  enabled?: boolean; // ✅ si true => onglet Repêchage
  kind?: "losers_bracket" | "extra_round" | "custom";
  slotsToKo?: number;
  afterKoRoundIndex?: number;
};

export type TournamentStage = {
  id: string;
  type: StageType;

  // poules (round robin)
  groups?: number; // nb de poules (si absent => 1 poule)
  qualifiersPerGroup?: number; // nb qualifiés par poule vers stage suivant

  // seeding / têtes de série
  seeding?: SeedingMode;

  // meta
  name?: string; // ex: "Poules", "Finale"
  role?: StageRole;
};

export type Tournament = {
  id: string;
  source: TournamentSource;
  competitionScope?: TournamentCompetitionScope;
  sport?: string;
  kind?: "league" | "championship" | "tournament" | "cup" | string;
  onlineCompetitionId?: string | null;
  hostTeamId?: string | null;
  hostTeamName?: string | null;
  hostOrganizationId?: string | null;
  hostOrganizationName?: string | null;
  enrollment?: {
    policy?: "fixed" | "open" | "approval" | "invite";
    minParticipants?: number;
    maxParticipants?: number | null;
    startMode?: "manual" | "auto_when_full" | "scheduled";
    opensAt?: number | null;
    closesAt?: number | null;
  };
  name: string;
  status: TournamentStatus;

  createdAt: number;
  updatedAt: number;

  ownerProfileId?: string | null;
  ownerOnlineUserId?: string | null;
  adminProfileIds?: string[];
  adminPermissions?: Record<string, TournamentAdminPermission[]>;
  invitedProfileIds?: string[];
  invitations?: TournamentInvitation[];
  enrollmentRequests?: TournamentEnrollmentRequest[];
  publicView?: {
    enabled?: boolean;
    showParticipants?: boolean;
    showObjectives?: boolean;
    showStandings?: boolean;
    showStats?: boolean;
    liveRefreshSeconds?: number;
  };
  shareCode?: string | null;
  challengeCompetition?: ChallengeCompetitionConfig;

  players: TournamentPlayer[];

  // Pipeline : ex [Poules RR] -> [Finale SE]
  stages: TournamentStage[];

  game: TournamentGameSettings;

  // état runtime
  currentStageIndex: number;

  // ✅ UI comportement
  viewKind?: TournamentViewKind;

  // ✅ Repêchage
  repechage?: TournamentRepechageConfig;
};

export type TournamentMatch = {
  id: string;
  tournamentId: string;

  stageIndex: number; // index dans tournament.stages
  groupIndex: number; // 0..groups-1 (RR), KO/repechage => -1
  roundIndex: number; // pour single elim / RR rounds
  orderIndex: number; // tri stable d’affichage

  aPlayerId: string;
  bPlayerId: string;

  status: MatchStatus;

  winnerId?: string | null;

  // score persistant tournoi (plus de faux fallback 1-0)
  scoreA?: number | null;
  scoreB?: number | null;
  legsA?: number | null;
  legsB?: number | null;
  setsA?: number | null;
  setsB?: number | null;

  // "réservation" (multi-match en parallèle)
  sessionId?: string | null;
  startedAt?: number | null;
  startedBy?: string | null;

  // Lien vers ton History (quand on branchera auto-finish)
  historyMatchId?: string | null;

  createdAt: number;
  updatedAt: number;

  // structure bracket
  nextMatchId?: string | null;
  nextSlot?: "A" | "B" | string | null;
  aFromMatchId?: string | null;
  bFromMatchId?: string | null;

  // ✅ (optionnel) pour filtrer/afficher
  phase?: StageRole;
  groupId?: string | null;
};
