#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildCargoMatchStats,
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

// Détection et codec : la base (18) doit conserver CARGO dans tous les pipelines.
const cargoRecord: any = {
  id: "cargo-test", kind: "cargo", mode: "cargo", sport: "darts", status: "in_progress", createdAt: Date.now(),
  players: [{ id: "p1", name: "Ninja", ...free.statsByPlayer.p1 }],
  payload: {
    kind: "cargo", mode: "cargo", sport: "darts", config: free.config,
    players: [{ id: "p1", name: "Ninja", ...free.statsByPlayer.p1 }],
    stateSnapshot: cloneCargoState(free), visits: free.visits,
    stats: { sport: "darts", mode: "cargo", players: [{ id: "p1", name: "Ninja", ...free.statsByPlayer.p1 }], match: { totalWeight: 80 }, global: { totalWeight: 80 } },
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

console.log("✅ CARGO REGRESSION OK");
