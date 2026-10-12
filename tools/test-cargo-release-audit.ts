#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildCargoMatchStats,
  buildCargoPlayerAdvancedStats,
  buildCargoTeamStats,
  cloneCargoState,
  createCargoState,
  normalizeCargoConfig,
  pickCargoBotDarts,
  playCargoVisit,
  type CargoState,
  type CargoVariant,
} from "../src/lib/gameEngines/cargoEngine.ts";
import { buildCargoVisualSnapshot } from "../src/lib/gameEngines/cargoVisuals.ts";
import { decodeCompactMatch, encodeCompactMatch } from "../src/lib/matchCompactCodec.ts";

const variants: CargoVariant[] = [
  "cargo_classic",
  "free_load",
  "full_pallet",
  "exact_load",
  "fragile_cargo",
  "cargo_rush",
  "convoy",
  "long_haul",
  "parcel_delivery",
];

const dart = (bed: "S" | "D" | "T", number: number) => ({ bed, number } as any);
const miss = () => ({ bed: "MISS" } as any);
const ib = () => ({ bed: "IB" } as any);

function withSeed<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  let x = seed >>> 0;
  Math.random = () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 0x100000000;
  };
  try { return fn(); } finally { Math.random = original; }
}

function configFor(variant: CargoVariant, count: number, teams = false) {
  const ids = Array.from({ length: count }, (_, i) => `p${i + 1}`);
  const teamByPlayer: Record<string, string> = {};
  if (teams) ids.forEach((id, i) => { teamByPlayer[id] = i % 2 === 0 ? "TEAM_A" : "TEAM_B"; });
  return normalizeCargoConfig({
    variant,
    rounds: 3,
    players: count,
    selectedIds: ids,
    participantMode: teams ? "teams" : "players",
    teamCount: 2,
    teamByPlayer,
    teamNames: { TEAM_A: "ORANGE", TEAM_B: "BLEUE" },
    visibleContracts: 2,
    carrySeriesBetweenTurns: true,
    minSeries: variant === "full_pallet" ? 2 : 1,
    maxSeries: variant === "full_pallet" ? 5 : variant === "parcel_delivery" ? 5 : 4,
    truckCapacity: 200,
    targetWeight: 200,
    fragileRate: variant === "fragile_cargo" ? 1 : 0,
    urgentRate: variant === "cargo_rush" ? 1 : 0,
    rushExpiryRounds: 1,
  } as any);
}

function smokeDarts(state: CargoState) {
  const variant = state.config.variant;
  if (variant === "parcel_delivery") return [dart("S", 12), dart("S", 12), dart("S", 12)];
  if (variant === "free_load" || variant === "full_pallet") return [dart("S", 20), dart("S", 20), dart("S", 20)];
  if (variant === "exact_load") return [ib(), ib(), ib()];
  const contract = state.contracts[0];
  if (!contract) return [dart("S", 20), dart("S", 20), dart("S", 20)];
  const bed = contract.bed === "ANY" ? "S" : contract.bed;
  return [dart(bed as "S" | "D" | "T", contract.sector), dart(bed as "S" | "D" | "T", contract.sector), dart(bed as "S" | "D" | "T", contract.sector)];
}

function assertFiniteDeep(value: any, path = "root") {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} contient une valeur non finie`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) value.forEach((entry, index) => assertFiniteDeep(entry, `${path}[${index}]`));
  else Object.entries(value).forEach(([key, entry]) => assertFiniteDeep(entry, `${path}.${key}`));
}

function runSmoke(variant: CargoVariant, count: number, teams: boolean, seed: number) {
  return withSeed(seed, () => {
    const players = Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
    let state = createCargoState(players as any, configFor(variant, count, teams));
    assert.equal(state.players.length, count);
    if (teams) assert.equal(state.teamStandings.length, 2);

    for (const level of ["easy", "normal", "hard"] as const) {
      state.config.botLevel = level;
      const botVisit = pickCargoBotDarts(state);
      assert.equal(botVisit.length, 3, `${variant}/${level}: le bot doit produire 3 darts`);
    }

    const expectedVisits = state.config.rounds * count;
    let guard = 0;
    while (state.phase === "playing" && guard < expectedVisits + 3) {
      state = playCargoVisit(state, smokeDarts(state));
      guard += 1;
    }
    assert.equal(state.phase, "finished", `${variant}: la partie doit se terminer`);
    assert.equal(state.visits.length, expectedVisits, `${variant}: nombre de volées incorrect`);
    assert.equal(state.standings.length, count, `${variant}: classement joueur incomplet`);
    if (teams) {
      assert.equal(state.teamStandings.length, 2, `${variant}: classement équipes incomplet`);
      assert.ok(state.winnerTeamIds.length >= 1, `${variant}: gagnant équipe absent`);
    } else {
      assert.ok(state.winnerIds.length >= 1, `${variant}: gagnant absent`);
    }

    const matchStats = buildCargoMatchStats(state);
    assertFiniteDeep(matchStats, `${variant}.matchStats`);
    state.players.forEach((player) => assertFiniteDeep(buildCargoPlayerAdvancedStats(state, String(player.id)), `${variant}.${player.id}.advanced`));
    if (teams) assertFiniteDeep(buildCargoTeamStats(state), `${variant}.teams`);

    const snapshot = buildCargoVisualSnapshot(state, state.statsByPlayer[String(state.players[0]?.id)]);
    assert.ok(snapshot.fillPercent >= 0 && snapshot.fillPercent <= 100, `${variant}: remplissage visuel hors bornes`);
    assert.ok(["EMPTY", "LOADING", "PALLET_READY", "LOADED", "FULL"].includes(snapshot.stage), `${variant}: état visuel invalide`);
    return state;
  });
}

// 9 variantes × SOLO / DUEL / MULTI / ÉQUIPES.
let seed = 1000;
for (const variant of variants) {
  runSmoke(variant, 1, false, seed++);
  runSmoke(variant, 2, false, seed++);
  runSmoke(variant, 3, false, seed++);
  runSmoke(variant, 4, true, seed++);
}

// CLASSIC : un contrat exact doit se charger et être remplacé.
withSeed(2001, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "cargo_classic", rounds: 3, minSeries: 2, maxSeries: 2, visibleContracts: 2 } as any));
  const contract = { ...state.contracts[0] };
  const bed = contract.bed === "ANY" ? "S" : contract.bed;
  state = playCargoVisit(state, [dart(bed as any, contract.sector), dart(bed as any, contract.sector)]);
  assert.ok(state.statsByPlayer.p1.completedContracts >= 1);
  assert.ok(!state.contracts.some((item) => item.id === contract.id));
});

// FREE LOAD : 4 × S20 = 80 kg.
withSeed(2002, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "free_load", rounds: 3, maxSeries: 4, carrySeriesBetweenTurns: true } as any));
  state = playCargoVisit(state, [dart("S", 20), dart("S", 20), dart("S", 20)]);
  state = playCargoVisit(state, [dart("S", 20)]);
  assert.equal(state.statsByPlayer.p1.totalWeight, 80);
});

// FULL PALLET : une série de 5 applique le bonus palette complète.
withSeed(2003, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "full_pallet", rounds: 3, minSeries: 2, maxSeries: 5, carrySeriesBetweenTurns: true } as any));
  state = playCargoVisit(state, [dart("S", 20), dart("S", 20), dart("S", 20)]);
  state = playCargoVisit(state, [dart("S", 20), dart("S", 20)]);
  assert.equal(state.statsByPlayer.p1.totalWeight, 165);
  assert.equal(state.statsByPlayer.p1.fullPallets, 1);
});

// EXACT LOAD : dépassement rejeté sans dépasser la capacité.
withSeed(2004, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "exact_load", rounds: 3, truckCapacity: 100, targetWeight: 100, overloadRule: "reject_last" } as any));
  state = playCargoVisit(state, [ib(), ib(), ib()]);
  assert.equal(state.statsByPlayer.p1.totalWeight, 100);
  assert.equal(state.statsByPlayer.p1.overloads, 1);
  assert.equal(state.statsByPlayer.p1.rejectedWeight, 50);
});

// FRAGILE : un MISS après le démarrage détruit bien une palette fragile.
withSeed(2005, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "fragile_cargo", rounds: 3, fragileRate: 1, minSeries: 3, maxSeries: 3, missRule: "lose", visibleContracts: 2 } as any));
  const contract = state.contracts[0];
  assert.ok(contract.fragile);
  const bed = contract.bed === "ANY" ? "S" : contract.bed;
  state = playCargoVisit(state, [dart(bed as any, contract.sector), miss()]);
  assert.equal(state.statsByPlayer.p1.fragileBroken, 1);
  assert.ok(state.visits.at(-1)?.events.some((event) => event.type === "series_lost"));
});

// RUSH : un contrat urgent non traité expire au changement de tour.
withSeed(2006, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "cargo_rush", rounds: 3, urgentRate: 1, rushExpiryRounds: 1, minSeries: 3, maxSeries: 3, visibleContracts: 2 } as any));
  assert.ok(state.contracts.every((contract) => contract.urgent));
  state = playCargoVisit(state, [miss(), miss(), miss()]);
  assert.ok(state.visits.at(-1)?.events.some((event) => event.type === "contract_expired"));
});

// CONVOY : la palette peut changer de porteur dans la même équipe.
withSeed(2007, () => {
  const players = [{ id: "c1", name: "Alpha" }, { id: "c2", name: "Bravo" }, { id: "c3", name: "Charlie" }];
  let state = createCargoState(players as any, normalizeCargoConfig({ variant: "convoy", rounds: 3, participantMode: "teams", teamCount: 2, teamByPlayer: { c1: "TEAM_A", c2: "TEAM_A", c3: "TEAM_B" }, teamNames: { TEAM_A: "ORANGE", TEAM_B: "BLEUE" }, minSeries: 3, maxSeries: 3 } as any));
  const contract = state.contracts[0];
  const bed = contract.bed === "ANY" ? "S" : contract.bed;
  state.statsByPlayer.c1.currentSeries = { key: `${bed}${contract.sector}`, number: contract.sector, bed: bed as any, count: 1, rawWeight: contract.sector, contractId: contract.id, protected: false, startedRound: 1, labels: [`${bed}${contract.sector}`] };
  state.activePlayerIndex = 1;
  state = playCargoVisit(state, [dart(bed as any, contract.sector)]);
  assert.ok(state.visits.at(-1)?.events.some((event) => event.type === "convoy_handoff"));
});

// LONG HAUL : le dernier tour doit toujours atteindre le centre de livraison.
withSeed(2008, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "long_haul", rounds: 10, minSeries: 2, maxSeries: 2 } as any));
  while (state.phase === "playing") state = playCargoVisit(state, [miss(), miss(), miss()]);
  assert.equal(state.routeStage, state.routeStages.length - 1, "Long Haul doit atteindre la dernière étape au dernier tour");
  assert.equal(state.routeStages[state.routeStage], "Centre de livraison");
});

// PARCEL : 5 touches = 5 colis + bonus 7.
withSeed(2009, () => {
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, normalizeCargoConfig({ variant: "parcel_delivery", rounds: 3, carrySeriesBetweenTurns: true } as any));
  state = playCargoVisit(state, [dart("S", 12), dart("S", 12), dart("S", 12)]);
  state = playCargoVisit(state, [dart("S", 12), dart("S", 12)]);
  assert.equal(state.statsByPlayer.p1.parcelsDelivered, 12);
  assert.equal(state.statsByPlayer.p1.parcelSeries["5"], 1);
});

// Reprise : le snapshot cloné doit reprendre exactement la même mission.
withSeed(2010, () => {
  const config = normalizeCargoConfig({ variant: "free_load", rounds: 3, maxSeries: 4, carrySeriesBetweenTurns: true } as any);
  let state = createCargoState([{ id: "p1", name: "Ninja" }] as any, config);
  state = playCargoVisit(state, [dart("S", 20), dart("S", 20), dart("S", 20)]);
  const resumed = cloneCargoState(state);
  const a = playCargoVisit(state, [dart("S", 20)]);
  const b = playCargoVisit(resumed, [dart("S", 20)]);
  assert.equal(a.statsByPlayer.p1.totalWeight, b.statsByPlayer.p1.totalWeight);
  assert.equal(a.roundIndex, b.roundIndex);
  assert.equal(a.activePlayerIndex, b.activePlayerIndex);
});

// Compact historique : les données principales et les équipes doivent survivre au codec.
withSeed(2011, () => {
  const state = runSmoke("free_load", 4, true, 3011);
  const playerRows = state.players.map((player: any) => ({ id: player.id, name: player.name, ...state.statsByPlayer[player.id], ...buildCargoPlayerAdvancedStats(state, player.id) }));
  const teams = buildCargoTeamStats(state);
  const compact = encodeCompactMatch({
    id: "cargo-release-audit", kind: "cargo", mode: "cargo", sport: "darts", status: "finished", createdAt: Date.now(),
    players: playerRows,
    teams,
    summary: { kind: "cargo", mode: "cargo", participantMode: "teams", variant: "free_load", winnerIds: state.winnerIds, winnerTeamIds: state.winnerTeamIds, teams, perPlayer: playerRows },
    payload: { kind: "cargo", mode: "cargo", sport: "darts", config: state.config, players: playerRows, teams, stateSnapshot: cloneCargoState(state), visits: state.visits, summary: { participantMode: "teams", variant: "free_load", winnerIds: state.winnerIds, winnerTeamIds: state.winnerTeamIds, teams }, stats: { mode: "cargo", players: playerRows, teams, match: buildCargoMatchStats(state) } },
  } as any);
  const decoded: any = decodeCompactMatch(compact);
  assert.equal(decoded?.mode, "cargo");
  assert.equal(decoded?.players?.length, 4);
  assert.equal(decoded?.teams?.length, 2);
  assert.equal(decoded?.summary?.participantMode, "teams");
});

console.log("✅ CARGO RELEASE AUDIT OK — 9 variantes × SOLO/DUEL/MULTI/ÉQUIPES + BOTS + REPRISE + CODEC");
