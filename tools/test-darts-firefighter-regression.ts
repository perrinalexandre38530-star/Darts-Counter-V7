import assert from "node:assert/strict";
import {
  activeIncidents,
  buildFireMapForView,
  createDartsFirefighterState,
  fireStatus,
  normalizeDartsFirefighterConfig,
  playDartsFirefighterVisit,
  selectFireTerritory,
  totalFire,
  type DartsFirefighterConfigPayload,
} from "../src/lib/gameEngines/dartsFirefighterEngine";
import type { TerritoriesMap } from "../src/territories/types";
import { decodeCompactMatch, encodeCompactMatch } from "../src/lib/matchCompactCodec";

function fakeMap(count = 24): TerritoriesMap {
  return {
    country: "TEST",
    name: "Carte test",
    svgViewBox: "0 0 100 100",
    territories: Array.from({ length: count }, (_, index) => ({
      id: `T-${index + 1}`,
      country: "TEST",
      region: `R${index + 1}`,
      name: `Territoire ${index + 1}`,
      value: index + 1,
      playable: true,
      svgPathId: `path-${index + 1}`,
    })),
    playableTerritoryCount: count,
    disabledTerritoryCount: 0,
  } as TerritoriesMap;
}

function config(overrides: Partial<DartsFirefighterConfigPayload> = {}): DartsFirefighterConfigPayload {
  return {
    mode: "darts_firefighter",
    players: 2,
    selectedIds: ["p1", "p2"],
    mapId: "TEST",
    difficulty: "recruit",
    activeTerritories: 20,
    initialFires: 2,
    criticalTerritories: 2,
    maxRounds: 20,
    windEnabled: true,
    forecastEnabled: true,
    missEndsTurn: false,
    bullAirSupport: true,
    scoreInputMethod: "keypad",
    ...overrides,
  };
}

const players = [
  { id: "p1", name: "Alpha" },
  { id: "p2", name: "Bravo" },
];


// Configuration V2 : mini carte, secteurs aléatoires, fumée initiale et propagation par round.
const advancedCfg = normalizeDartsFirefighterConfig({
  ...config(),
  objective: "survival",
  activeTerritories: 8,
  targetOrder: "random",
  initialFires: 3,
  initialFireLevel: 2,
  initialSmoke: 2,
  firePlacement: "clustered",
  propagationTiming: "after_round",
  dartsPerTurn: 2,
  windStrength: "strong",
  windChangeEvery: 1,
});
let advanced = createDartsFirefighterState(players, advancedCfg, fakeMap(), 1_700_000_000_005);
const advancedActive = advanced.territories.filter((territory) => territory.playable);
assert.equal(advancedActive.length, 8, "la mini mission doit accepter 8 zones");
assert.equal(new Set(advancedActive.map((territory) => territory.target)).size, 8, "les secteurs aléatoires doivent rester uniques");
assert.equal(advancedActive.filter((territory) => territory.fireLevel > 0).length, 3, "les foyers configurés doivent être appliqués");
assert.equal(advancedActive.filter((territory) => territory.smoke).length, 2, "la fumée initiale doit être appliquée");
advanced = playDartsFirefighterVisit(advanced, [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }]);
assert.equal(advanced.history[0].darts.length, 2, "la limite de deux fléchettes doit être respectée");
assert.equal(advanced.propagationIndex, 0, "la propagation après round doit attendre le dernier joueur");
advanced = playDartsFirefighterVisit(advanced, [{ bed: "MISS" }]);
assert.equal(advanced.propagationIndex, 1, "la propagation doit se déclencher en fin de round");

// Objectif Survie : la mission réussit à la limite même si des incidents subsistent.
let survival = createDartsFirefighterState(players, normalizeDartsFirefighterConfig({
  ...config(), objective: "survival", maxRounds: 1, propagationTiming: "after_round",
  growthChance: 0, spreadChance: 0, smokeChance: 0, protectionDecay: 0,
  initialFires: 1, initialSmoke: 0, criticalTerritories: 0,
}), fakeMap(), 1_700_000_000_006);
survival = playDartsFirefighterVisit(survival, [{ bed: "MISS" }]);
survival = playDartsFirefighterVisit(survival, [{ bed: "MISS" }]);
assert.equal(survival.finished, true, "la survie doit finir à la limite de rounds");
assert.equal(survival.won, true, "tenir jusqu'aux renforts doit être une victoire");
assert.equal(survival.finishReason, "objective_complete");

// Canadair conditionné par la jauge : DBULL reste utile mais ne déclenche pas l'avion.
let gatedCanadair = createDartsFirefighterState(players, normalizeDartsFirefighterConfig({
  ...config(), canadairRequiresGauge: true, canadairGaugeCost: 50, initialFires: 2,
}), fakeMap(), 1_700_000_000_007);
gatedCanadair.brigadeGauge = 0;
gatedCanadair = playDartsFirefighterVisit(gatedCanadair, [{ bed: "IB" }]);
assert.equal(gatedCanadair.history[0].events.some((event) => event.type === "canadair"), false, "le Canadair ne doit pas partir sans jauge");
assert.ok(gatedCanadair.history[0].events.some((event) => event.type === "bull_drop"), "le DBULL doit conserver un largage au sol");

const initial = createDartsFirefighterState(players, config(), fakeMap(), 1_700_000_000_000);
const active = initial.territories.filter((territory) => territory.playable);
assert.equal(active.length, 20, "la carte doit exposer exactement 20 zones actives");
assert.equal(new Set(active.map((territory) => territory.target)).size, 20, "les secteurs doivent être uniques");
assert.deepEqual(active.map((territory) => territory.target).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
assert.equal(initial.territories.filter((territory) => territory.critical).length, 2, "les zones critiques doivent être initialisées");
assert.ok(activeIncidents(initial) >= 2, "les foyers initiaux doivent exister");
assert.ok(totalFire(initial) > 0, "la charge de feu initiale doit être positive");
assert.ok(initial.forecastTerritoryIds.every((id) => active.some((territory) => territory.id === id)), "la prévision ne doit contenir que des zones actives");

// Triple sur un feu niveau 3 : extinction et télémétrie complète.
let extinguish = createDartsFirefighterState(players, config({ initialFires: 1, criticalTerritories: 0 }), fakeMap(), 1_700_000_000_010);
for (const territory of extinguish.territories) {
  territory.fireLevel = 0;
  territory.smoke = false;
  territory.protection = 0;
}
const fire3 = extinguish.territories.find((territory) => territory.playable)!;
fire3.fireLevel = 3;
extinguish = playDartsFirefighterVisit(extinguish, [{ bed: "T", number: fire3.target }]);
const afterFire3 = extinguish.territories.find((territory) => territory.id === fire3.id)!;
assert.equal(afterFire3.fireLevel, 0, "T doit supprimer trois niveaux de feu");
assert.equal(extinguish.totalExtinguished, 1, "l'extinction doit être comptée");
assert.equal(extinguish.playerStats.p1.triples, 1);
assert.equal(extinguish.playerStats.p1.fireReduced, 3);
assert.equal(extinguish.history.length, 1);
assert.equal(extinguish.history[0].labels[0], `T${fire3.target}`);
assert.ok(extinguish.history[0].events.some((event) => event.type === "extinguished"));

// Surplus d'eau : protection enregistrée, même si la propagation la dégrade ensuite.
let protectedState = createDartsFirefighterState(players, config({ initialFires: 2, criticalTerritories: 0 }), fakeMap(), 1_700_000_000_020);
for (const territory of protectedState.territories) {
  territory.fireLevel = 0;
  territory.smoke = false;
  territory.protection = 0;
}
const lowFire = protectedState.territories.find((territory) => territory.playable)!;
const reserveFire = protectedState.territories.filter((territory) => territory.playable)[5];
lowFire.fireLevel = 1;
reserveFire.fireLevel = 1;
protectedState = playDartsFirefighterVisit(protectedState, [{ bed: "T", number: lowFire.target }]);
assert.equal(protectedState.playerStats.p1.fireReduced, 1);
assert.equal(protectedState.playerStats.p1.protectionsPlaced, 2, "le surplus du triple doit créer deux protections");
assert.ok(protectedState.history[0].events.some((event) => event.type === "protected"));

// Double Bull : Canadair sur la zone sélectionnée et ses voisines.
let canadair = createDartsFirefighterState(players, config({ initialFires: 2, criticalTerritories: 0 }), fakeMap(), 1_700_000_000_030);
const center = canadair.territories.find((territory) => territory.playable && territory.fireLevel > 0)!;
canadair = selectFireTerritory(canadair, center.id);
canadair = playDartsFirefighterVisit(canadair, [{ bed: "IB" }]);
assert.equal(canadair.playerStats.p1.dbulls, 1);
assert.ok(canadair.history[0].events.some((event) => event.type === "canadair"), "DBULL doit produire un événement Canadair");
assert.ok(canadair.playerStats.p1.waterApplied >= 3);

// MISS coupe correctement la volée et ne stocke pas les fléchettes non jouées.
let miss = createDartsFirefighterState(players, config({ missEndsTurn: true }), fakeMap(), 1_700_000_000_040);
const target = miss.territories.find((territory) => territory.playable)!;
miss = playDartsFirefighterVisit(miss, [{ bed: "MISS" }, { bed: "T", number: target.target }]);
assert.equal(miss.history[0].endedByMiss, true);
assert.equal(miss.history[0].darts.length, 1, "la télémétrie ne doit garder que le MISS réellement joué");
assert.equal(miss.playerStats.p1.darts, 1);

// La carte visuelle doit transporter l'état d'incendie sans modifier la carte source.
const rendered = buildFireMapForView(canadair);
const renderedCenter = rendered.territories.find((territory) => territory.id === center.id)!;
assert.ok(String(renderedCenter.ownerId || "").startsWith("fire-status-"));
assert.ok(["safe", "protected", "smoke", "fire1", "fire2", "fire3", "destroyed"].includes(fireStatus(canadair.territories.find((territory) => territory.id === center.id)!)));

// Le codec compact doit préserver le mode, les KPI et un état reprenable.
const compactRecord = {
  id: "ff-compact-1",
  kind: "darts_firefighter",
  mode: "darts_firefighter",
  sport: "darts",
  status: "in_progress",
  players: players.map((player) => ({ ...player, ...(canadair.playerStats[player.id] || {}) })),
  payload: {
    kind: "darts_firefighter",
    mode: "darts_firefighter",
    sport: "darts",
    config: canadair.config,
    players: players.map((player) => ({ ...player, ...(canadair.playerStats[player.id] || {}) })),
    stateSnapshot: canadair,
    finalTerritories: canadair.territories,
    visits: canadair.history,
    stats: {
      mode: "darts_firefighter",
      players: players.map((player) => ({ ...player, ...(canadair.playerStats[player.id] || {}) })),
      match: { score: canadair.score, totalExtinguished: canadair.totalExtinguished, propagationBlocked: canadair.propagationBlocked },
    },
    summary: { mode: "darts_firefighter", score: canadair.score, totalExtinguished: canadair.totalExtinguished },
  },
};
const compact = encodeCompactMatch(compactRecord);
assert.ok(compact, "le codec doit produire un paquet compact");
assert.equal(compact?.m, "darts_firefighter");
const decoded = decodeCompactMatch(compact);
assert.equal(decoded?.mode, "darts_firefighter");
assert.equal(decoded?.stateSnapshot?.mode, "darts_firefighter", "l'état reprenable doit conserver ses noms de champs");
assert.equal(decoded?.stateSnapshot?.territories?.length, canadair.territories.length);
assert.equal(decoded?.players?.[0]?.dbulls, canadair.playerStats.p1.dbulls);
assert.equal(decoded?.summary?.matchStats?.totalExtinguished, canadair.totalExtinguished);

console.log("✅ DARTS FIREFIGHTER ENGINE REGRESSION OK");
