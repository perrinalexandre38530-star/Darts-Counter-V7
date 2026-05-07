export type ViewerPhase = "lobby" | "playing" | "paused" | "finished";

export type ViewerPlayerStats = {
  avg?: number | string;
  avg3d?: number | string;
  bestVisit?: number | string;
  dartsThrown?: number | string;
  checkoutRate?: number | string;
  mpr?: number | string;
  [key: string]: any;
};

export type ViewerPlayer = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarDataUrl?: string | null;
  color?: string | null;
  score?: number | string | null;
  rank?: number | null;
  isActive?: boolean;
  isWinner?: boolean;
  stats?: ViewerPlayerStats;
  lives?: number | string | null;
  target?: number | string | null;
  eliminated?: boolean;
  [key: string]: any;
};

export type ViewerLiveSnapshot = {
  v: 1;
  sessionId?: string;
  rev?: number;
  updatedAt: number;
  sport?: string;
  game: string;
  phase: ViewerPhase;
  title?: string;
  screen?: string;
  activePlayerId?: string | null;
  currentPlayer?: string | null;
  match?: {
    legIndex?: number | null;
    legTotal?: number | null;
    setIndex?: number | null;
    setTotal?: number | null;
    round?: number | null;
    target?: number | string | null;
    modeLabel?: string | null;
    [key: string]: any;
  };
  players: ViewerPlayer[];
  recentEvents?: Array<{ id: string; label: string; at: number }>;
  summary?: {
    winnerId?: string | null;
    podium?: string[];
    bestStats?: Array<{ label: string; playerId?: string | null; value: string | number }>;
    [key: string]: any;
  };
  meta?: Record<string, any>;
  source?: "cast" | "viewer" | "demo" | string;
  [key: string]: any;
};

export type ViewerSessionInfo = {
  sessionId: string;
  code: string;
  joinUrl: string;
  createdAt: number;
  expiresAt?: number | null;
  enabled: boolean;
};

export type ViewerCreateSessionResult = {
  sessionId: string;
  code: string;
  expiresInSeconds?: number;
  joinUrl?: string;
};
