#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildCargoMatchStats,
  buildCargoPlayerAdvancedStats,
  buildCargoTeamStats,
  cargoEventPresentation,
  cloneCargoState,
  computeCargoMissionGrade,
  createCargoState,
  normalizeCargoConfig,
  playCargoVisit,
} from "../src/lib/gameEngines/cargoEngine.ts";
import { encodeCompactMatch, decodeCompactMatch } from "../src/lib/matchCompactCodec.ts";
import { detectHomeMode } from "../src/lib/homeModeStats.ts";

const players = [{ id: "p1", name: "Ninja" }];
const dart = (bed: "S"|"D"|"T", number: number) => ({ bed, number } as any);
const numeric = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;

// Livraison de colis : série maximale 5, avec 7 colis bonus => 12.
let parcel = createCargoState(players as any, normalizeCargoConfig({ variant: "parcel_delivery", rounds: 3, carrySeriesBetweenTurns: true } as any));
parcel = playCargoVisit(parcel, [dart("S", 12), dart("S", 12), dart("S", 12)]);
assert.equal(parcel.statsByPlayer.p1.currentSeries?.count, 3);
parcel = playCargoVisit(parcel, [dart("S", 12), dart("S", 12)]);
assert.equal(parcel.statsByPlayer.p1.parcelsDelivered, 12);
assert.equal(parcel.statsByPlayer.p1.currentSeries, null);
assert.equal(parcel.statsByPlayer.p1.parcelSeries["5"], 1);

// Charge libre : 4 simples 20 donnent 80 kg.
let free = createCargoState(players as any, normalizeCargoConfig({ variant: "free_load", rounds: 3, maxSeries: 4, carrySeriesBetweenTurns: true } as any));
free = playCargoVisit(free, [dart("S", 20), dart("S", 20), dart("S", 20)]);
free = playCargoVisit(free, [dart("S", 20)]);
assert.equal(free.statsByPlayer.p1.totalWeight, 80);
assert.equal(free.statsByPlayer.p1.longestSeries, 4);
assert.equal(free.statsByPlayer.p1.pallets, 1);

// Contrat classique : remplir le premier contrat valide sa charge et le remplace.
let classic = createCargoState(players as any, normalizeCargoConfig({ variant: "cargo_classic", rounds: 5, visibleContracts: 2, carrySeriesBetweenTurns: true } as any));
const contract = cloneCargoState(classic).contracts[0];
const hit = dart(contract.bed === "ANY" ? "S" : contract.bed, contract.sector);
while ((classic.statsByPlayer.p1.completedContracts || 0) === 0) {
  classic = playCargoVisit(classic, Array.from({ length: Math.min(3, contract.targetCount) }, () => hit));
  if (classic.phase === "finished") break;
}
assert.ok(classic.statsByPlayer.p1.completedContracts >= 1, "le contrat doit être terminé");
assert.ok(classic.statsByPlayer.p1.totalWeight >= contract.finalWeight, "le poids du contrat doit être chargé");
assert.ok(!classic.contracts.some((c) => c.id === contract.id), "le contrat terminé doit être remplacé");
const classicStats = buildCargoMatchStats(classic);
assert.equal(classicStats.statisticsVersion, 2);
assert.ok(classicStats.totalVisits >= 1);
assert.ok(classicStats.bestPalletWeight >= contract.finalWeight);
const grade = computeCargoMissionGrade(classic, "p1");
assert.ok(["S", "A", "B", "C", "D"].includes(grade.grade));
assert.ok(grade.rating >= 0 && grade.rating <= 100);
const completionEvent = classic.visits.flatMap((visit) => visit.events).find((event) => event.type === "contract_complete");
assert.ok(completionEvent, "un événement de contrat terminé doit être enregistré");
assert.equal(cargoEventPresentation(completionEvent).title, "CONTRAT CHARGÉ");

// Exact Load : une palette qui dépasse la capacité est rejetée.
let exact = createCargoState(players as any, normalizeCargoConfig({ variant: "exact_load", rounds: 3, truckCapacity: 100, targetWeight: 100, overloadRule: "reject_last", dbullRule: "weight" } as any));
exact = playCargoVisit(exact, [{ bed: "IB" } as any, { bed: "IB" } as any, { bed: "IB" } as any]);
assert.equal(exact.statsByPlayer.p1.totalWeight, 100);
assert.equal(exact.statsByPlayer.p1.overloads, 1);
assert.equal(exact.statsByPlayer.p1.rejectedWeight, 50);



// Multi équipes : score collectif, classement et gagnants membres de l'équipe.
const teamPlayers = [
  { id: "p1", name: "Ninja" },
  { id: "p2", name: "Nova" },
  { id: "p3", name: "Raven" },
  { id: "p4", name: "Kron" },
];
let teamsState = createCargoState(teamPlayers as any, normalizeCargoConfig({
  variant: "free_load",
  rounds: 1,
  maxSeries: 3,
  participantMode: "teams",
  teamCount: 2,
  teamByPlayer: { p1: "TEAM_A", p2: "TEAM_B", p3: "TEAM_A", p4: "TEAM_B" },
  teamNames: { TEAM_A: "ORANGE", TEAM_B: "BLEUE" },
} as any));
assert.equal(teamsState.teamStandings.length, 2);
assert.equal(teamsState.teamStandings.find((row) => row.id === "TEAM_A")?.name, "ORANGE");
for (let round = 0; round < teamsState.config.rounds; round += 1) {
  teamsState = playCargoVisit(teamsState, [dart("S", 20), dart("S", 20), dart("S", 20)]);
  teamsState = playCargoVisit(teamsState, [dart("S", 1), dart("S", 1), dart("S", 1)]);
  teamsState = playCargoVisit(teamsState, [dart("S", 20), dart("S", 20), dart("S", 20)]);
  teamsState = playCargoVisit(teamsState, [dart("S", 1), dart("S", 1), dart("S", 1)]);
}
assert.equal(teamsState.phase, "finished");
assert.equal(teamsState.teamStandings[0]?.id, "TEAM_A");
assert.equal(teamsState.teamStandings[0]?.score, 120 * teamsState.config.rounds);
assert.deepEqual(new Set(teamsState.winnerIds), new Set(["p1", "p3"]));
assert.deepEqual(teamsState.winnerTeamIds, ["TEAM_A"]);
const p1Advanced = buildCargoPlayerAdvancedStats(teamsState, "p1");
assert.equal(p1Advanced.productiveVisits, teamsState.config.rounds);
assert.equal(p1Advanced.firstDartAccuracy, 100);
assert.equal(p1Advanced.secondDartAccuracy, 100);
assert.equal(p1Advanced.thirdDartAccuracy, 100);
assert.equal(p1Advanced.lastDartAccuracy, 100);
assert.equal(p1Advanced.threeHitVisits, teamsState.config.rounds);
assert.equal(p1Advanced.zeroHitVisits, 0);
assert.equal(p1Advanced.safeVisitRate, 100);
assert.equal(p1Advanced.bestVisitScore, 60);
assert.equal(p1Advanced.p90VisitScore, 60);
assert.equal(p1Advanced.avgHitMultiplier, 1);
assert.equal(p1Advanced.longestHitStreak, 3 * teamsState.config.rounds);
const teamStats = buildCargoTeamStats(teamsState);
assert.equal(teamStats.length, 2);
assert.equal(teamStats[0].topContributorScore, 60 * teamsState.config.rounds);
assert.ok(Array.isArray(teamStats[0].contributions));
const teamMatchStats = buildCargoMatchStats(teamsState);
assert.equal(teamMatchStats.analyticsVersion, 4);
assert.equal(teamMatchStats.teamCount, 2);
assert.equal(teamMatchStats.playerCount, 4);
assert.ok(teamMatchStats.productiveVisitRate > 0);
assert.equal(teamMatchStats.firstDartAccuracy, 100);
assert.equal(teamMatchStats.secondDartAccuracy, 100);
assert.equal(teamMatchStats.thirdDartAccuracy, 100);
assert.equal(teamMatchStats.safeVisitRate, 100);
assert.equal(teamMatchStats.threeHitVisits, 4 * teamsState.config.rounds);
assert.equal(teamMatchStats.avgHitMultiplier, 1);

const teamPlayerRows = teamsState.players.map((player: any) => ({
  id: player.id,
  name: player.name,
  ...teamsState.statsByPlayer[player.id],
  ...buildCargoPlayerAdvancedStats(teamsState, player.id),
  advanced: buildCargoPlayerAdvancedStats(teamsState, player.id),
}));
const teamCompact = encodeCompactMatch({
  id: "cargo-team-test", kind: "cargo", mode: "cargo", sport: "darts", status: "finished", createdAt: Date.now(),
  players: teamPlayerRows,
  summary: { kind: "cargo", mode: "cargo", participantMode: "teams", variant: "free_load", winnerIds: teamsState.winnerIds, winnerTeamIds: teamsState.winnerTeamIds, teams: teamStats, perPlayer: teamPlayerRows },
  payload: { kind: "cargo", mode: "cargo", sport: "darts", config: teamsState.config, players: teamPlayerRows, teams: teamStats, stateSnapshot: cloneCargoState(teamsState), visits: teamsState.visits, summary: { participantMode: "teams", variant: "free_load", winnerIds: teamsState.winnerIds, winnerTeamIds: teamsState.winnerTeamIds, teams: teamStats }, stats: { sport: "darts", mode: "cargo", players: teamPlayerRows, teams: teamStats, match: teamMatchStats, global: teamMatchStats } },
});
const decodedTeam = decodeCompactMatch(teamCompact);
assert.equal(decodedTeam?.players?.length, 4, "les équipes ne doivent pas devenir des joueurs dans le compact");
assert.equal(decodedTeam?.teams?.length, 2);
assert.equal(decodedTeam?.summary?.participantMode, "teams");
assert.deepEqual(decodedTeam?.summary?.winnerTeamIds, ["TEAM_A"]);
assert.ok(numeric(decodedTeam?.players?.[0]?.productiveVisits) >= 1);
assert.ok(numeric(decodedTeam?.players?.[0]?.secondDarts) >= 1);
assert.ok(numeric(decodedTeam?.players?.[0]?.thirdDarts) >= 1);
assert.ok(numeric(decodedTeam?.players?.[0]?.threeHitVisits) >= 1);
assert.equal(numeric(decodedTeam?.players?.[0]?.avgHitMultiplier), 1);


// Détection et codec : CARGO V4 analytics doit rester conservé dans tous les pipelines.
const cargoRecord: any = {
  id: "cargo-test", kind: "cargo", mode: "cargo", sport: "darts", status: "in_progress", createdAt: Date.now(),
  players: [{ id: "p1", name: "Ninja", ...free.statsByPlayer.p1, ...buildCargoPlayerAdvancedStats(free, "p1"), advanced: buildCargoPlayerAdvancedStats(free, "p1") }],
  payload: {
    kind: "cargo", mode: "cargo", sport: "darts", config: free.config,
    players: [{ id: "p1", name: "Ninja", ...free.statsByPlayer.p1, ...buildCargoPlayerAdvancedStats(free, "p1"), advanced: buildCargoPlayerAdvancedStats(free, "p1") }],
    stateSnapshot: cloneCargoState(free), visits: free.visits,
    stats: { sport: "darts", mode: "cargo", players: [{ id: "p1", name: "Ninja", ...free.statsByPlayer.p1, ...buildCargoPlayerAdvancedStats(free, "p1") }], match: { totalWeight: 80 }, global: { totalWeight: 80 } },
    summary: { kind: "cargo", mode: "cargo", variant: "free_load", scoreLine: "80 kg" },
  },
};
assert.equal(detectHomeMode(cargoRecord), "cargo");
const compact = encodeCompactMatch(cargoRecord);
assert.equal(compact?.m, "cargo");
const decoded = decodeCompactMatch(compact);
assert.equal(decoded?.mode, "cargo");
assert.equal(decoded?.stateSnapshot?.mode, "cargo");
assert.equal(decoded?.stats?.mode, "cargo");
assert.equal(decoded?.players?.[0]?.totalWeight, 80);
assert.equal(decoded?.players?.[0]?.bestVisitScore, 80);
assert.equal(decoded?.players?.[0]?.firstDartAccuracy, undefined); // dérivé à l'affichage via compteurs compacts
assert.ok(numeric(decoded?.players?.[0]?.productiveVisits) >= 1);

console.log("✅ CARGO REGRESSION OK");
