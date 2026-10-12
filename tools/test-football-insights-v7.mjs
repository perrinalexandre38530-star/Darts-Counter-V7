
import assert from "node:assert/strict";
import {
  footballTacticalProfile,
  buildFootballSectorProfileFromVisits,
} from "../src/lib/footballInsights.ts";

const tactical = footballTacticalProfile({
  darts: 18, hits: 14, successfulActions: 10,
  attackVisits: 4, advances: 6, passes: 2, counterAttacks: 1,
  shots: 4, shotsOnTarget: 3, goals: 2,
  defenseVisits: 3, interceptions: 2, tackles: 1, clearances: 1, possessionWins: 2,
  goalkeeperVisits: 2, saves: 1,
});
assert.ok(tactical.attaque >= 0 && tactical.attaque <= 100);
assert.ok(tactical.finition >= 0 && tactical.finition <= 100);
assert.ok(tactical.defense >= 0 && tactical.defense <= 100);
assert.ok(tactical.gardien >= 0 && tactical.gardien <= 100);
assert.ok(tactical.controle >= 0 && tactical.controle <= 100);
assert.ok(tactical.label);

const visits = [
  { playerId: "p1", action: "attack", targets: [20, 18, 12], darts: [{ bed: "T", number: 20 }, { bed: "S", number: 1 }, { bed: "MISS" }] },
  { playerId: "p1", action: "classic_shot", targets: [], darts: [{ bed: "D", number: 16 }] },
  { playerId: "p1", action: "classic_possession", targets: [], darts: [{ bed: "OB" }] },
  { playerId: "p2", action: "attack", targets: [5], darts: [{ bed: "T", number: 5 }] },
];
const sectors = buildFootballSectorProfileFromVisits(visits, "p1");
assert.equal(sectors.totalDarts, 5);
assert.equal(sectors.misses, 1);
assert.equal(sectors.bull, 1);
assert.equal(sectors.sectors[19].triples, 1);
assert.equal(sectors.sectors[15].doubles, 1);
assert.ok(sectors.missionHits >= 3);
assert.ok(sectors.strongestSector);
console.log("DARTS FOOTBALL insights V7: OK");
