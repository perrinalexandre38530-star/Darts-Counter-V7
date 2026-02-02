// ============================================
// TERRITORIES — STEP 1 : DATA SCHEMAS (FINAL)
// Location: src/territories/types.ts
// ============================================

export type TerritoriesCountry =
  | "FR"
  | "AF"
  | "AR"
  | "ASIA"
  | "AT"
  | "BE"
  | "BR"
  | "CA"
  | "HR"
  | "CZ"
  | "DK"
  | "EG"
  | "EU"
  | "FI"
  | "GR"
  | "IS"
  | "IN"
  | "MX"
  | "NL"
  | "NA"
  | "NO"
  | "PL"
  | "SA"
  | "SAM"
  | "KR"
  | "SE"
  | "CH"
  | "UA"
  | "UN"
  | "EN"
  | "UK"
  | "IT"
  | "DE"
  | "ES"
  | "US"
  | "CN"
  | "AU"
  | "JP"
  | "RU"
  | "WORLD";

export interface TerritoriesConfig {
  country: TerritoriesCountry;
  targetSelectionMode: "imposed" | "free" | "by_score";
  // ✅ Align with UI/config vocabulary
  captureRule: "exact" | "gte";
  multiCapture: boolean;
  minTerritoryValue?: number;
  allowEnemyCapture: boolean;
  maxRounds: number;
  // ✅ Full victory modes supported by the engine + UI
  victoryCondition:
    | { type: "territories"; value: number }
    | { type: "regions"; value: number }
    | { type: "time"; minutes: number }
    | { type: "rounds" };
  voiceAnnouncements: boolean;
}

export interface TerritoriesPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  teamId?: string;
  capturedTerritories: string[];
}

export interface TerritoriesTeam {
  id: string;
  name: string;
  color: string;
}

export interface Territory {
  id: string;        // ex: FR-75
  country: string;   // FR
  region: string;    // free text / code
  name: string;      // display
  value: number;     // objective score
  svgPathId: string; // per-country key used to find SVG element (id or data-*)
  ownerId?: string;  // playerId or teamId
}

export interface TerritoriesMap {
  country: string;
  svgViewBox: string;
  territories: Territory[];
}

export interface TerritoriesTurnState {
  activePlayerId: string;
  selectedTerritoryId?: string;
  dartsThrown: number;
  capturedThisTurn: string[];
}

export interface TerritoriesGameState {
  meta?: {
    startedAtMs?: number;
  };
  config: TerritoriesConfig;
  players: TerritoriesPlayer[];
  teams?: TerritoriesTeam[];
  map: TerritoriesMap;
  turnIndex: number;
  roundIndex: number;
  turn: TerritoriesTurnState;
  status: "playing" | "round_end" | "game_end";
}

export interface VoiceEvent {
  type:
    | "turn_start"
    | "territory_selected"
    | "territory_captured"
    | "territory_failed"
    | "round_end"
    | "game_end";
  playerId: string;
  territoryId?: string;
}
