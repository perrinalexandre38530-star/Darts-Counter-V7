export type CastGameId =
  | "golf"
  | "x01"
  | "cricket"
  | "killer"
  | "shanghai"
  | "petanque"
  | "babyfoot"
  | "pingpong"
  | "unknown";

export type CastPlayerStats = {
  avg3d?: string | number;
  bestVisit?: string | number;
  hits?: number;
  miss?: number;
  simple?: number;
  double?: number;
  triple?: number;
  bull?: number;
  dbull?: number;
  bust?: number;
  totalThrows?: number;
  [k: string]: any;
};

export type CastPlayer = {
  id: string;
  name: string;
  score: number;
  active?: boolean;
  avatarDataUrl?: string;
  avatarUrl?: string;
  avatar?: string;
  photoUrl?: string;
  imageUrl?: string;
  stats?: CastPlayerStats;
  [k: string]: any;
};

export type CastSnapshot = {
  game: CastGameId;
  title: string;
  status: "live" | "finished";
  players: CastPlayer[];
  screen?: string;
  currentPlayer?: string;
  scores?: number[];
  meta?: {
    hole?: number;
    leg?: number;
    set?: number;
    round?: number;
    target?: number;
    outMode?: string;
    [k: string]: any;
  };
  updatedAt: number;
  [k: string]: any;
};

export type CastRoom = {
  id: string;
  code: string;
  host_user_id: string;
  status: "open" | "live" | "closed" | string;
  active_game_id?: string | null;
  created_at?: string;
};
