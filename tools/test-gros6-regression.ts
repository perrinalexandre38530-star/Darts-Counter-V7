import assert from "node:assert/strict";
import {
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
  gros6MatchesTarget(makeGros6Special("digit_9", "Rond du 9"), makeGros6Special("digit_9", "Rond du 9"), baseConfig()),
  true,
);
assert.equal(
  gros6MatchesTarget(makeGros6Special("digit_8", "Rond du 8"), makeGros6Special("digit_9", "Rond du 9"), baseConfig()),
  false,
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

// la dernière cible valide de la volée de sélection devient la nouvelle cible
{
  const config = baseConfig();
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Segment("S", 6), config); // réussite D1 => 2 sélections
  state = applyGros6SelectionHit(state, makeGros6Segment("D", 18), config);
  state = applyGros6SelectionHit(state, makeGros6Special("digit_10", "Rond du 10"), config);
  assert.equal(state.phase, "attack");
  assert.equal(state.currentTarget.kind, "special");
  assert.equal((state.currentTarget as any).code, "digit_10");
}

// variante PRO : un simple ne peut pas devenir la prochaine cible
{
  const config = baseConfig({ selectionPolicy: "pro", allowSpecialZones: false });
  let state = buildGros6InitialState(config);
  state = applyGros6AttackHit(state, makeGros6Segment("S", 6), config);
  state = applyGros6SelectionHit(state, makeGros6Segment("S", 20), config);
  state = applyGros6SelectionHit(state, makeGros6Segment("D", 16), config);
  assert.equal(state.phase, "attack");
  assert.equal(state.currentTarget.kind, "segment");
  assert.equal((state.currentTarget as any).ring, "D");
  assert.equal((state.currentTarget as any).value, 16);
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
