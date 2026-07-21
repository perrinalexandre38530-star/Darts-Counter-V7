import {
  MAX_PLAYABLE_TERRITORIES,
  buildUniqueTerritoryValues,
  selectPlayableTerritoryIds,
} from "../src/territories/territoryValueRules.ts";
import { initializeEqualTerritoryOwnership } from "../src/territories/engine.ts";
import type { TerritoriesGameState, Territory } from "../src/territories/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

for (const count of [1, 5, 16, 41, 58, 96, 171, 180]) {
  const values = buildUniqueTerritoryValues(count, 10, 92);
  assert(values.length === count, `Expected ${count} values, got ${values.length}`);
  assert(new Set(values).size === count, `Duplicate value detected for ${count} territories`);
  assert(values.every((value) => value >= 1 && value <= 180), `Out-of-range value for ${count}`);
  assert(values.every((value, index) => index === 0 || value > values[index - 1]!), `Values are not strictly increasing for ${count}`);
}

const fullRange = buildUniqueTerritoryValues(180, 20, 80);
assert(fullRange[0] === 1 && fullRange[179] === 180, "180 territories must use the exact 1..180 range");
assert(fullRange.every((value, index) => value === index + 1), "180-territory range is not contiguous");

const territories: Territory[] = Array.from({ length: 256 }, (_, index) => ({
  id: `T${String(index + 1).padStart(3, "0")}`,
  country: "WORLD",
  region: "WORLD",
  name: `Territory ${index + 1}`,
  value: index + 1,
  svgPathId: `P${index + 1}`,
}));
const areas = Object.fromEntries(territories.map((territory, index) => [territory.id, index + 1]));
const playableIds = selectPlayableTerritoryIds(territories, areas);
assert(playableIds.size === MAX_PLAYABLE_TERRITORIES, `Expected 180 playable territories, got ${playableIds.size}`);
assert(!playableIds.has("T001") && playableIds.has("T256"), "The 180 largest territories were not selected");

const state: TerritoriesGameState = {
  config: {
    country: "WORLD",
    gameMode: "fortress",
    initialDistribution: "equal",
    maxFortressesPerOwner: 2,
    targetSelectionMode: "free",
    captureRule: "exact",
    multiCapture: false,
    allowEnemyCapture: true,
    maxRounds: 1,
    victoryCondition: { type: "rounds" },
    voiceAnnouncements: false,
  },
  players: [
    { id: "A", name: "A", color: "#f0f", capturedTerritories: [] },
    { id: "B", name: "B", color: "#ff0", capturedTerritories: [] },
  ],
  map: {
    country: "WORLD",
    svgViewBox: "0 0 100 100",
    playableTerritoryCount: 180,
    disabledTerritoryCount: 2,
    territories: Array.from({ length: 182 }, (_, index) => ({
      id: `D${index + 1}`,
      country: "WORLD",
      region: "WORLD",
      name: `D${index + 1}`,
      value: index < 180 ? index + 1 : 0,
      playable: index < 180,
      svgPathId: `D${index + 1}`,
    })),
  },
  turnIndex: 0,
  roundIndex: 1,
  turn: { activePlayerId: "A", dartsThrown: 0, capturedThisTurn: [] },
  status: "playing",
};

const distributed = initializeEqualTerritoryOwnership(state);
const ownerCounts = distributed.map.territories.reduce<Record<string, number>>((result, territory) => {
  if (territory.ownerId) result[territory.ownerId] = (result[territory.ownerId] || 0) + 1;
  return result;
}, {});
assert(ownerCounts.A === 90 && ownerCounts.B === 90, `Bad equal distribution: ${JSON.stringify(ownerCounts)}`);
assert(distributed.map.territories.slice(180).every((territory) => !territory.ownerId), "Disabled territories received an owner");

console.log("TERRITORIES unique values regression: OK", {
  maxPlayable: playableIds.size,
  exactRange: `${fullRange[0]}-${fullRange[fullRange.length - 1]}`,
  equalDistribution: ownerCounts,
});
