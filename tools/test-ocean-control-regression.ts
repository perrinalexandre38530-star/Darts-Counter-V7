#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildOceanControlMatchStats,
  cloneOceanControlState,
  createOceanControlState,
  getOceanPlacementOwner,
  getOceanTargetOwner,
  normalizeOceanControlConfig,
  oceanControlAccuracy,
  oceanControlLatestSonarScan,
  placeOceanControlShip,
  playOceanControlVisit,
  selectOceanControlFocus,
} from "../src/lib/gameEngines/oceanControlEngine.ts";
import { encodeCompactMatch, decodeCompactMatch } from "../src/lib/matchCompactCodec.ts";
import { detectHomeMode } from "../src/lib/homeModeStats.ts";

const players = [
  { id: "p1", name: "Ninja" },
  { id: "p2", name: "Capitaine Bot" },
] as any;
const baseConfig = normalizeOceanControlConfig({
  variant: "tactical",
  difficulty: "captain",
  participantMode: "players",
  placement: "automatic",
  gridOrder: "sequential",
  fleetPreset: "quick",
  winsNeeded: 1,
  dartsPerTurn: 3,
  sonarEnabled: true,
  dbullStrikeEnabled: true,
  randomOrder: false,
});

// État jouable immédiat et flottes valides.
let state = createOceanControlState(players, baseConfig, () => 0.37);
assert.equal(state.mode, "ocean_control");
assert.equal(state.phase, "playing");
assert.equal(state.owners.length, 2);
for (const owner of state.owners) {
  assert.equal(owner.ships.length, 3);
  assert.ok(owner.ships.every((ship) => ship.cells.length === ship.length));
  const occupied = owner.ships.flatMap((ship) => ship.cells);
  assert.equal(new Set(occupied).size, occupied.length, "les navires ne doivent pas se chevaucher");
}

// Un tir simple sur une case de navire doit créer un impact exploitable dans les stats.
const target = getOceanTargetOwner(state)!;
const hitCell = target.ships[0].cells[0];
const hitNumber = state.gridNumbers[hitCell];
state = playOceanControlVisit(state, [{ bed: "S", number: hitNumber }] as any);
assert.equal(state.statsByPlayer.p1.darts, 1);
assert.equal(state.statsByPlayer.p1.validShots, 1);
assert.equal(state.statsByPlayer.p1.shipHits, 1);
assert.equal(oceanControlAccuracy(state.statsByPlayer.p1), 100);
assert.equal(state.visits.length, 1);
assert.ok(state.visits[0].events.some((event) => event.type === "hit" || event.type === "sunk"));

// Sonar : Bull, focus explicite, contacts conservés.
let sonar = createOceanControlState(players, baseConfig, () => 0.42);
const sonarTarget = getOceanTargetOwner(sonar)!;
const sonarCell = sonarTarget.ships[0].cells[0];
sonar = selectOceanControlFocus(sonar, sonar.gridNumbers[sonarCell]);
sonar = playOceanControlVisit(sonar, [{ bed: "OB" }] as any);
assert.equal(sonar.statsByPlayer.p1.sonarUses, 1);
assert.ok(sonar.statsByPlayer.p1.sonarContacts >= 1);
assert.ok(sonar.visits[0].events.some((event) => event.type === "sonar"));
assert.equal(sonar.sonarScans.length, 1);
assert.equal(oceanControlLatestSonarScan(sonar, sonarTarget.id)?.focusNumber, sonar.gridNumbers[sonarCell]);
assert.ok((oceanControlLatestSonarScan(sonar, sonarTarget.id)?.cells.length || 0) >= 3);

// Double Bull : frappe de précision sur le focus.
let strike = createOceanControlState(players, baseConfig, () => 0.53);
const strikeTarget = getOceanTargetOwner(strike)!;
const strikeCell = strikeTarget.ships[0].cells[0];
strike = selectOceanControlFocus(strike, strike.gridNumbers[strikeCell]);
strike = playOceanControlVisit(strike, [{ bed: "IB" }] as any);
assert.equal(strike.statsByPlayer.p1.precisionStrikes, 1);
assert.equal(strike.statsByPlayer.p1.shipHits, 1);
assert.ok(strike.visits[0].events.some((event) => event.type === "strike"));

// Placement manuel secret : les deux flottes doivent pouvoir être validées sans chevauchement.
let manual = createOceanControlState(players, normalizeOceanControlConfig({ ...baseConfig, placement: "manual" }), () => 0.2);
assert.equal(manual.phase, "placement");
for (let ownerIndex = 0; ownerIndex < 2; ownerIndex += 1) {
  assert.equal(getOceanPlacementOwner(manual)?.id, manual.owners[ownerIndex].id);
  manual = placeOceanControlShip(manual, 0, "horizontal");
  manual = placeOceanControlShip(manual, 5, "horizontal");
  manual = placeOceanControlShip(manual, 10, "horizontal");
}
assert.equal(manual.phase, "playing");

// Fin de bataille déterministe : une flotte réduite à une case est coulée et le gagnant est déclaré.
let finalShot = createOceanControlState(players, baseConfig, () => 0.61);
const finalTarget = getOceanTargetOwner(finalShot)!;
finalTarget.ships = [{ id: "last", name: "Patrouilleur", icon: "🚤", length: 1, cells: [0], hits: [], sunk: false }];
finalShot = playOceanControlVisit(finalShot, [{ bed: "S", number: finalShot.gridNumbers[0] }] as any);
assert.equal(finalShot.phase, "finished");
assert.deepEqual(finalShot.winnerPlayerIds, ["p1"]);
assert.equal(finalShot.statsByPlayer.p1.shipsSunk, 1);
assert.ok(finalShot.visits[0].events.some((event) => event.type === "battle_win"));
assert.equal(finalShot.battleHistory.length, 1);
assert.equal(finalShot.battleHistory[0].winnerOwnerId, finalShot.winnerOwnerIds[0]);
assert.equal(finalShot.statsByPlayer.p1.successfulVisits, 1);
assert.equal(finalShot.statsByPlayer.p1.perfectVisits, 1);
assert.equal(finalShot.statsByPlayer.p1.bestHitStreak, 1);

// Statistiques match + codec compact : la reprise doit préserver toute la flotte et les volées.
const stats = buildOceanControlMatchStats(strike);
assert.equal(stats.totalDarts, 1);
assert.equal(stats.totalHits, 1);
assert.equal(stats.successfulVisits, 1);
assert.equal(stats.bestHitStreak, 1);
const rows = strike.players.map((player) => ({ id: player.id, playerId: player.id, name: player.name, ...strike.statsByPlayer[player.id] }));
const record: any = {
  id: "ocean-test",
  kind: "ocean_control",
  mode: "ocean_control",
  sport: "darts",
  status: "in_progress",
  createdAt: Date.now(),
  players: rows,
  payload: {
    kind: "ocean_control",
    mode: "ocean_control",
    sport: "darts",
    config: strike.config,
    players: rows,
    stateSnapshot: cloneOceanControlState(strike),
    visits: strike.visits,
    stats: { sport: "darts", mode: "ocean_control", players: rows, match: stats, global: stats },
    summary: { kind: "ocean_control", mode: "ocean_control", variant: "tactical", matchStats: stats, scoreLine: "1 impact" },
  },
};
assert.equal(detectHomeMode(record), "ocean_control");
const compact = encodeCompactMatch(record);
assert.equal(compact?.m, "ocean_control");
const decoded = decodeCompactMatch(compact);
assert.equal(decoded?.mode, "ocean_control");
assert.equal(decoded?.stateSnapshot?.mode, "ocean_control");
assert.equal(decoded?.visits?.length, 1);
assert.equal(decoded?.stats?.mode, "ocean_control");
assert.equal(decoded?.players?.[0]?.precisionStrikes, 1);
assert.equal(decoded?.players?.[0]?.successfulVisits, 1);
assert.equal(decoded?.players?.[0]?.bestHitStreak, 1);

console.log("✅ OCEAN CONTROL REGRESSION OK");
