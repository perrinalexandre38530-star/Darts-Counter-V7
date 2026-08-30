export type EsportsPlatform = "pc" | "playstation" | "xbox" | "switch" | "mobile" | "crossplay";
export type EsportsGenre = "fps" | "battle_royale" | "moba" | "sports" | "racing" | "fighting" | "strategy" | "party" | "other";
export type EsportsResultKind = "score" | "rounds" | "maps" | "placement" | "points" | "sets";
export type EsportsMatchShape = "1v1" | "team" | "battle_royale" | "ffa";

export type EsportsGameDefinition = {
  id: string;
  name: string;
  shortName: string;
  publisher?: string;
  genre: EsportsGenre;
  platforms: EsportsPlatform[];
  crossplay: boolean;
  matchShape: EsportsMatchShape;
  teamSizes: number[];
  maxPlayers: number;
  resultKind: EsportsResultKind;
  bestOf: number[];
  statKeys: string[];
  accent: string;
  icon: string;
  featured?: boolean;
};

export type GamerIdentity = {
  displayName: string;
  bio: string;
  country: string;
  favoriteGameIds: string[];
  handles: Partial<Record<EsportsPlatform | "steam" | "epic" | "riot" | "ea" | "battlenet", string>>;
  availability: "available" | "busy" | "offline";
  lookingForGroup: boolean;
};

export type EsportsRoomMember = {
  id: string;
  name: string;
  ready: boolean;
  team?: "A" | "B" | null;
  role?: "player" | "spectator" | "host";
  onlineUserId?: string | null;
};

export type EsportsRoom = {
  id: string;
  code: string;
  source: "local" | "online";
  onlineLobbyId?: string | null;
  gameId: string;
  title: string;
  formatLabel: string;
  teamSize: number;
  maxPlayers: number;
  bestOf: number;
  status: "waiting" | "playing" | "finished";
  visibility: "private" | "friends" | "public";
  members: EsportsRoomMember[];
  createdAt: number;
  updatedAt: number;
};

export type EsportsMatchSide = {
  name: string;
  playerNames: string[];
  score: number;
};

export type EsportsMatch = {
  id: string;
  gameId: string;
  roomId?: string | null;
  tournamentId?: string | null;
  bestOf: number;
  resultKind: EsportsResultKind;
  sideA: EsportsMatchSide;
  sideB: EsportsMatchSide;
  winner: "A" | "B" | "draw";
  notes?: string;
  stats?: Record<string, number | string | null>;
  playedAt: number;
  createdAt: number;
};

export type EsportsTournamentFormat = "single_elimination" | "round_robin";

export type EsportsTournamentParticipant = {
  id: string;
  name: string;
  seed: number;
};

export type EsportsTournamentMatch = {
  id: string;
  round: number;
  slot: number;
  participantAId?: string | null;
  participantBId?: string | null;
  participantAName?: string | null;
  participantBName?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  winnerId?: string | null;
  status: "pending" | "ready" | "finished";
};

export type EsportsTournament = {
  id: string;
  name: string;
  gameId: string;
  format: EsportsTournamentFormat;
  bestOf: number;
  participants: EsportsTournamentParticipant[];
  matches: EsportsTournamentMatch[];
  status: "draft" | "active" | "finished";
  createdAt: number;
  updatedAt: number;
};

export type EsportsState = {
  version: 1;
  gamer: GamerIdentity;
  selectedGameId: string;
  rooms: EsportsRoom[];
  matches: EsportsMatch[];
  tournaments: EsportsTournament[];
};
