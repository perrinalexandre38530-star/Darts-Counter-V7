import assert from "node:assert/strict";
import {
  GROS6_SPECIAL_ZONES,
  applyGros6AttackHit,
  applyGros6SelectionHit,
  buildGros6InitialState,
  gros6MatchesTarget,
  makeGros6Bull,
  makeGros6Miss,
  makeGros6Segment,
  makeGros6Special,
} from "../src/lib/gros6Engine.ts";

function player(id: string, name: string, teamId?: string) {
  return { id, name, teamId, teamName: teamId ? `Team ${teamId}` : undefined };
}

function baseConfig(extra: any = {}) {
  return {
    participantMode: "players",
    startingLives: 5,
    targetRule: "strict",
    allowBull: true,
    allowSpecialZones: true,
    selectionPolicy: "open",
    thirdDartBonusSelection: true,
    thirdDartBonusCount: 3,
    startingTarget: makeGros6Segment("S", 6),
    players: [player("p1", "P1"), player("p2", "P2")],
    ...extra,
  };
}

// strict vs value mode
assert.equal(gros6MatchesTarget(makeGros6Segment("D", 6), makeGros6Segment("S", 6), baseConfig()), false);
assert.equal(gros6MatchesTarget(makeGros6Segment("D", 6), makeGros6Segment("S", 6), baseConfig({ targetRule: "value" })), true);

// zone fermée : cible distincte et réellement validable
assert.equal(
  gros6MatchesTarget(makeGros6Special("closed_9", "Hors cible 9"), makeGros6Special("closed_9", "Hors cible 9"), baseConfig()),
  true,
);
assert.equal(
  gros6MatchesTarget(makeGros6Special("closed_8_top", "Hors cible 8 haut"), makeGros6Special("closed_9", "Hors cible 9"), baseConfig()),
  false,
);


// zones hors cible 4 et 14 intégrées au moteur
assert.equal(GROS6_SPECIAL_ZONES.some((zone: any) => zone.code === "closed_4"), true);
assert.equal(GROS6_SPECIAL_ZONES.some((zone: any) => zone.code === "closed_14"), true);
assert.equal(
  gros6MatchesTarget(makeGros6Special("closed_4", "Hors cible 4"), makeGros6Special("closed_4", "Hors cible 4"), baseConfig()),
  true,
);
assert.equal(
  gros6MatchesTarget(makeGros6Special("closed_14", "Hors cible 14"), makeGros6Special("closed_14", "Hors cible 14"), baseConfig()),
  true,
);

// validation à la 3e fléchette => 3 fléchettes bonus de sélection
{
  const config = baseConfig();
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Miss(), config);
  state = applyGros6AttackHit(state, makeGros6Miss(), config);
  state = applyGros6AttackHit(state, makeGros6Segment("S", 6), config);
  assert.equal(state.phase, "select");
  assert.equal(state.selectionAllowed, 3);
  assert.equal(state.players[0].stats.lastDartSaves, 1);
}

// en sélection, la première nouvelle cible valide met fin immédiatement au tour
{
  const config = baseConfig();
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Segment("S", 6), config);
  state = applyGros6SelectionHit(state, makeGros6Special("closed_10", "Hors cible 10"), config);
  assert.equal(state.phase, "attack");
  assert.equal(state.turnIndex, 1);
  assert.equal(state.currentTarget.kind, "special");
  assert.equal((state.currentTarget as any).code, "closed_10");
}

// en sélection, un miss fait perdre une vie et conserve l'ancienne cible
{
  const config = baseConfig({ allowSpecialZones: false });
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Segment("S", 6), config);
  state = applyGros6SelectionHit(state, makeGros6Miss(), config);
  assert.equal(state.phase, "select");
  state = applyGros6SelectionHit(state, makeGros6Miss(), config);
  assert.equal(state.phase, "attack");
  assert.equal(state.turnIndex, 1);
  assert.equal(state.players[0].lives, 4);
  assert.equal((state.currentTarget as any).value, 6);
}

// variante PRO : un simple ne peut pas devenir la prochaine cible et fait perdre l'avantage
{
  const config = baseConfig({ selectionPolicy: "pro", allowSpecialZones: false });
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Segment("S", 6), config);
  state = applyGros6SelectionHit(state, makeGros6Segment("S", 20), config);
  assert.equal(state.phase, "select");
  state = applyGros6SelectionHit(state, makeGros6Segment("S", 19), config);
  assert.equal(state.phase, "attack");
  assert.equal(state.turnIndex, 1);
  assert.equal(state.players[0].lives, 4);
  assert.equal(state.currentTarget.kind, "segment");
  assert.equal((state.currentTarget as any).value, 6);
}

// équipes avec réserve commune : l'échec retire une vie à l'équipe, pas au joueur
{
  const config = baseConfig({
    participantMode: "teams",
    teamLifeMode: "shared",
    startingLives: 1,
    teams: [
      { id: "a", name: "Team A", playerIds: ["a1"] },
      { id: "b", name: "Team B", playerIds: ["b1"] },
    ],
    players: [player("a1", "A1", "a"), player("b1", "B1", "b")],
  });
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Miss(), config);
  state = applyGros6AttackHit(state, makeGros6Miss(), config);
  state = applyGros6AttackHit(state, makeGros6Miss(), config);
  assert.equal(state.teams.find((t: any) => t.id === "a")?.lives, 0);
  assert.equal(state.winnerType, "team");
  assert.equal(state.winnerId, "b");
}

// Bull strictement distinct du DBull
assert.equal(gros6MatchesTarget(makeGros6Bull(false), makeGros6Bull(true), baseConfig()), false);
assert.equal(gros6MatchesTarget(makeGros6Bull(true), makeGros6Bull(true), baseConfig()), true);

console.log("✅ GROS 6 regression OK");

// --- TEAMS V2 : alternance équitable, rotation interne et protection d'équipe ---
function missVisit(state: any, config: any) {
  let next = state;
  for (let i = 0; i < 3; i += 1) next = applyGros6AttackHit(next, makeGros6Miss(), config);
  return next;
}

{
  const config: any = baseConfig({
    participantMode: "teams",
    teamLifeMode: "individual",
    startingLives: 20,
    teams: [
      { id: "A", name: "Alpha", playerIds: ["A1", "A2", "A3"] },
      { id: "B", name: "Bravo", playerIds: ["B1", "B2"] },
    ],
    players: [
      player("A1", "A1", "A"), player("B1", "B1", "B"), player("A2", "A2", "A"), player("B2", "B2", "B"), player("A3", "A3", "A"),
    ],
  });
  let state = buildGros6InitialState(config);
  assert.equal(state.players[state.turnIndex].id, "A1");
  state = missVisit(state, config); assert.equal(state.players[state.turnIndex].id, "B1");
  state = missVisit(state, config); assert.equal(state.players[state.turnIndex].id, "A2");
  state = missVisit(state, config); assert.equal(state.players[state.turnIndex].id, "B2");
  state = missVisit(state, config); assert.equal(state.players[state.turnIndex].id, "A3");
  state = missVisit(state, config); assert.equal(state.players[state.turnIndex].id, "B1");
}

{
  const config: any = baseConfig({
    participantMode: "teams",
    teamLifeMode: "shared",
    startingLives: 6,
    teams: [
      { id: "A", name: "Alpha", playerIds: ["A1", "A2"] },
      { id: "B", name: "Bravo", playerIds: ["B1", "B2"] },
    ],
    players: [player("A1", "A1", "A"), player("B1", "B1", "B"), player("A2", "A2", "A"), player("B2", "B2", "B")],
  });
  let state = buildGros6InitialState(config);
  state = missVisit(state, config);
  assert.equal(state.teams.find((t: any) => t.id === "A")?.lives, 5);
  assert.equal(state.players.find((p: any) => p.id === "A1")?.lives, 6);
  assert.equal(state.players.find((p: any) => p.id === "A1")?.stats?.livesLost, 1);
}

{
  const config: any = baseConfig({
    participantMode: "teams",
    teamLifeMode: "individual",
    startingLives: 20,
    teams: [
      { id: "A", name: "Alpha", playerIds: ["A1", "A2"] },
      { id: "B", name: "Bravo", playerIds: ["B1", "B2"] },
    ],
    players: [player("A1", "A1", "A"), player("B1", "B1", "B"), player("A2", "A2", "A"), player("B2", "B2", "B")],
  });
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Segment("S", 6, "big"), config);
  state = applyGros6SelectionHit(state, makeGros6Segment("D", 20), config);
  assert.equal(state.currentTargetOwnerId, "A1");
  assert.equal(state.currentTargetOwnerTeamId, "A");
  assert.equal(state.players[state.turnIndex].id, "B1");
  state = missVisit(state, config);
  assert.equal(state.players[state.turnIndex].id, "B2");
  const lastAttack = state.history.filter((e: any) => e.phase === "attack").at(-1);
  assert.equal(lastAttack.targetOwnerTeamId, "A");
  assert.equal(lastAttack.lifeLost, true);
}

console.log("✅ GROS 6 TEAMS V2 regression OK");
