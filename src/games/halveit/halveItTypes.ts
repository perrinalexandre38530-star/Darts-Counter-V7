// =============================================================
// src/games/halveit/halveItTypes.ts
// HALVE-IT — Types (engine pur, sans UI)
// =============================================================

export type HalveItTargetKind =
  | "number" // 1..20
  | "double" // D (any double)
  | "triple" // T (any triple)
  | "bull";  // BULL (SB/DB selon config)

export type HalveItTarget =
  | { kind: "number"; value: number } // 1..20
  | { kind: "double" }
  | { kind: "triple" }
  | { kind: "bull" };

export type HalveItConfig = {
  gameId?: string;
  maxRounds?: number; // default = targets.length
  dartsPerTurn?: number; // default 3

  // Ordre des cibles (rounds)
  targets: HalveItTarget[];

  // Bull rules
  bullCountsAs?: "sb" | "sb_or_db"; // default sb_or_db

  // Division quand round raté
  halveOnMiss?: boolean; // default true

  // Players
  players: { id: string; name: string; isBot?: boolean }[];

  // Optional objective
  targetScore?: number | null; // si défini, 1er qui atteint/gagne
};

export type HalveItThrow = {
  raw: string; // ex: "S20", "D16", "T5", "SBULL", "DBULL", "0"
  mult: 0 | 1 | 2 | 3;
  value: number; // 0..20, 25 (SB), 50 (DB)
  points: number;
};

export type HalveItTurnResult = {
  playerId: string;
  roundIndex: number;
  target: HalveItTarget;
  throws: HalveItThrow[];
  pointsScored: number;
  hitTarget: boolean;
  halved: boolean;
  totalAfter: number;
};

export type HalveItPlayerState = {
  id: string;
  name: string;
  isBot?: boolean;
  total: number;
  turns: HalveItTurnResult[];
};

export type HalveItState = {
  config: HalveItConfig;
  createdAt: number;

  // indices
  roundIndex: number; // 0..targets-1
  playerIndex: number; // 0..players-1

  // état
  players: HalveItPlayerState[];
  finished: boolean;
  winnerIds: string[]; // tie possible
};

export type ApplyTurnInput = {
  // 0..3 throws, mais généralement 3
  throws: string[]; // ex: ["S20","D10","0"]
};

export type HalveItError = {
  code: string;
  message: string;
};
