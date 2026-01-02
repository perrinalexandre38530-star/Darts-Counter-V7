// ============================================
// src/lib/tournaments/types.ts
// Types Tournois (LOCAL/ONLINE compatible)
// + viewKind (4 types)
// + repechage config
// + countryCode (drapeaux UI)
// ============================================

export type TournamentSource = "local" | "online";

export type TournamentMode = "x01" | "cricket" | "killer" | "clock";

export type TournamentStatus = "draft" | "running" | "finished";

export type StageType = "round_robin" | "single_elim";

export type SeedingMode = "random" | "manual" | "by_rating";

export type MatchStatus = "pending" | "playing" | "done";

// ✅ 4 types demandés
export type TournamentViewKind = "single_ko" | "double_ko" | "round_robin" | "groups_ko";

export type TournamentPlayer = {
  id: string; // profileId ou botId ou uuid local
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
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
  // plus tard: type, règles losers bracket, etc.
  kind?: "losers_bracket" | "extra_round" | "custom";
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
};

export type Tournament = {
  id: string;
  source: TournamentSource;
  name: string;
  status: TournamentStatus;

  createdAt: number;
  updatedAt: number;

  ownerProfileId?: string | null;

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
  groupIndex: number; // 0..groups-1 (RR), sinon 0
  roundIndex: number; // pour single elim / RR rounds
  orderIndex: number; // tri stable d’affichage

  aPlayerId: string;
  bPlayerId: string;

  status: MatchStatus;

  winnerId?: string | null;

  // "réservation" (multi-match en parallèle)
  sessionId?: string | null;
  startedAt?: number | null;
  startedBy?: string | null;

  // Lien vers ton History (quand on branchera auto-finish)
  historyMatchId?: string | null;

  createdAt: number;
  updatedAt: number;

  // ✅ (optionnel) pour filtrer/afficher
  phase?: "groups" | "ko" | "repechage";
};
