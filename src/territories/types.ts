// ============================================
// TERRITORIES — STEP 1 : DATA SCHEMAS (FINAL)
// Location: src/territories/types.ts
// ============================================

export type TerritoriesCountry =
  | "FR"
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

// --------------------------------------------
// CONFIG
// --------------------------------------------

export interface TerritoriesConfig {
  country: TerritoriesCountry;

  targetSelectionMode: "imposed" | "free";

  captureRule: "exact" | "greater_or_equal";

  multiCapture: boolean;

  minTerritoryValue?: number;

  allowEnemyCapture: boolean;

  maxRounds: number;

  victoryCondition:
    | { type: "territories"; value: number }
    | { type: "rounds" };

  voiceAnnouncements: boolean;
}

// --------------------------------------------
// PLAYERS / TEAMS
// --------------------------------------------

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

// --------------------------------------------
// TERRITORIES / MAP
// --------------------------------------------

export interface Territory {
  id: string;        // ex: FR-75
  country: string;   // FR
  region: string;    // Île-de-France
  name: string;      // Paris
  value: number;     // 75
  svgPathId: string; // must match SVG path id

  ownerId?: string;  // playerId or teamId
}

export interface TerritoriesMap {
  country: string;
  svgViewBox: string;
  territories: Territory[];
}

// --------------------------------------------
// TURN STATE
// --------------------------------------------

export interface TerritoriesTurnState {
  activePlayerId: string;

  selectedTerritoryId?: string;

  dartsThrown: number;

  capturedThisTurn: string[];
}

// --------------------------------------------
// GAME STATE
// --------------------------------------------

export interface TerritoriesGameState {
  config: TerritoriesConfig;

  players: TerritoriesPlayer[];
  teams?: TerritoriesTeam[];

  map: TerritoriesMap;

  turnIndex: number;
  roundIndex: number;

  turn: TerritoriesTurnState;

  status: "playing" | "round_end" | "game_end";
}

// --------------------------------------------
// VOICE EVENTS
// --------------------------------------------

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
