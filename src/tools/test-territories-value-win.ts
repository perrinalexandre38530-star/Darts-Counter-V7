import {
  endTurn,
  initializeEqualTerritoryOwnership,
  sumOwnedValueByOwnerId,
} from "../src/territories/engine.ts";
import type { TerritoriesGameState } from "../src/territories/types.ts";

const baseConfig = {
  country: "FR" as const,
  gameMode: "fortress" as const,
  initialDistribution: "equal" as const,
  maxFortressesPerOwner: 2,
  targetSelectionMode: "free" as const,
  captureRule: "exact" as const,
  multiCapture: false,
  allowEnemyCapture: true,
  maxRounds: 1,
  victoryCondition: { type: "rounds_value" as const },
  voiceAnnouncements: false,
};

const distributionInput: TerritoriesGameState = {
  meta: { startedAtMs: Date.now() },
  config: baseConfig,
  players: [
    { id: "A", name: "A", color: "#f0f", capturedTerritories: [] },
    { id: "B", name: "B", color: "#ff0", capturedTerritories: [] },
  ],
  map: {
    country: "FR",
    svgViewBox: "0 0 100 100",
    territories: [5, 10, 20, 30, 40, 50].map((value, index) => ({
      id: `d${index}`,
      country: "FR",
      region: "r",
      name: `T${index}`,
      value,
      svgPathId: String(index),
    })),
  },
  turnIndex: 0,
  roundIndex: 1,
  turn: { activePlayerId: "A", dartsThrown: 0, capturedThisTurn: [] },
  status: "playing",
};

const distributed = initializeEqualTerritoryOwnership(distributionInput);
const distributedCounts = distributed.map.territories.reduce<Record<string, number>>((out, territory) => {
  if (territory.ownerId) out[territory.ownerId] = (out[territory.ownerId] || 0) + 1;
  return out;
}, {});
const distributedValues = sumOwnedValueByOwnerId(distributed);
if (distributedCounts.A !== 3 || distributedCounts.B !== 3) {
  throw new Error(`Unequal counts ${JSON.stringify(distributedCounts)}`);
}
if (Math.abs(distributedValues.A - distributedValues.B) > 10) {
  throw new Error(`Unbalanced initial values ${JSON.stringify(distributedValues)}`);
}

const state: TerritoriesGameState = {
  meta: { startedAtMs: Date.now() },
  config: baseConfig,
  players: [
    { id: "A", name: "A", color: "#f0f", capturedTerritories: ["t1", "t2"] },
    { id: "B", name: "B", color: "#ff0", capturedTerritories: ["t3"] },
  ],
  map: {
    country: "FR",
    svgViewBox: "0 0 100 100",
    territories: [
      { id: "t1", country: "FR", region: "r", name: "Petit 1", value: 5, svgPathId: "1", ownerId: "A" },
      { id: "t2", country: "FR", region: "r", name: "Petit 2", value: 5, svgPathId: "2", ownerId: "A" },
      { id: "t3", country: "FR", region: "r", name: "Grand", value: 30, svgPathId: "3", ownerId: "B" },
    ],
  },
  turnIndex: 1,
  roundIndex: 1,
  turn: { activePlayerId: "B", dartsThrown: 0, capturedThisTurn: [] },
  status: "playing",
};

const values = sumOwnedValueByOwnerId(state);
if (values.A !== 10 || values.B !== 30) throw new Error(`Bad values ${JSON.stringify(values)}`);
const result = endTurn(state);
if (result.state.status !== "game_end") throw new Error("Game did not end");
if (!result.events.some((event) => event.type === "game_end")) throw new Error("Missing game_end event");
console.log("TERRITORIES value victory regression: OK", { distributedValues, finalValues: values });
