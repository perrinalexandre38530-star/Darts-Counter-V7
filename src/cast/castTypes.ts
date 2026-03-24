export type CastGameId =
  | "golf"
  | "x01"
  | "cricket"
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
};

export type CastSnapshot = {
  game: CastGameId;
  title: string;
  status: "live" | "finished";
  players: CastPlayer[];
  meta?: {
    hole?: number;
    leg?: number;
    set?: number;
    [k: string]: any;
  };
  updatedAt: number;
};

export type CastRoom = {
  id: string;
  code: string;
  host_user_id: string;
  status: "open" | "live" | "closed" | string;
  active_game_id?: string | null;
  created_at?: string;
};
