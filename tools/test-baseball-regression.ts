import assert from "node:assert/strict";
import {
  BaseballEngine,
  type BaseballRules,
  type BaseballState,
} from "../src/lib/gameEngines/baseballEngine.ts";

const S = (number: number) => ({ bed: "S" as const, number });
const D = (number: number) => ({ bed: "D" as const, number });
const T = (number: number) => ({ bed: "T" as const, number });
const MISS = { bed: "MISS" as const };

function rules(patch: Partial<BaseballRules> = {}): Partial<BaseballRules> {
  return {
    mode: "baseball",
    innings: 9,
    extraInnings: true,
    maxExtraInnings: 3,
    seventhInningRule: "none",
    participantMode: "players",
    ...patch,
  };
}

function play(state: BaseballState, darts: any[]): BaseballState {
  return BaseballEngine.playTurn(state, darts);
}

// S/D/T sur la cible valent 1/2/3 runs ; le reste ne marque pas.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 1, extraInnings: false })
  );
  state = play(state, [S(1), D(1), T(1)]);
  state = play(state, [S(2), D(2), MISS]);
  assert.equal(state.totalsByPlayer.p1, 6);
  assert.equal(state.totalsByPlayer.p2, 0);
  assert.equal(state.finished, true);
  assert.deepEqual(state.winnerIds, ["p1"]);
}

// Une égalité après la manche réglementaire ouvre la cible suivante.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 1, maxExtraInnings: 2 })
  );
  state = play(state, [S(1)]);
  state = play(state, [S(1)]);
  assert.equal(state.finished, false);
  assert.equal(state.inning, 2);
  assert.equal(state.target, 2);
  state = play(state, [D(2)]);
  state = play(state, [S(2)]);
  assert.equal(state.finished, true);
  assert.equal(state.finishReason, "extra");
  assert.deepEqual(state.winnerIds, ["p1"]);
}

// Si l'égalité subsiste au cap extra, la partie est enregistrée comme nulle.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 1, maxExtraInnings: 1 })
  );
  state = play(state, [S(1)]);
  state = play(state, [S(1)]);
  state = play(state, [D(2)]);
  state = play(state, [D(2)]);
  assert.equal(state.finished, true);
  assert.equal(state.tied, true);
  assert.equal(state.finishReason, "extra-cap");
}

// Variante 7e manche : zéro run divise le total courant par deux.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }],
    rules({ innings: 7, extraInnings: false, seventhInningRule: "halve_on_zero" })
  );
  for (let inning = 1; inning <= 6; inning += 1) state = play(state, [T(inning)]);
  assert.equal(state.totalsByPlayer.p1, 18);
  state = play(state, [MISS, S(1), D(2)]);
  assert.equal(state.totalsByPlayer.p1, 9);
  assert.equal(state.statsByPlayer.p1.penaltyRunsLost, 9);
}

// Équipes : le classement additionne tous les joueurs du camp.
{
  let state = BaseballEngine.initGame(
    [
      { id: "a1", name: "A1" },
      { id: "b1", name: "B1" },
      { id: "a2", name: "A2" },
      { id: "b2", name: "B2" },
    ],
    rules({ innings: 1, extraInnings: false, participantMode: "teams" }),
    [
      { id: "A", name: "Team A", playerIds: ["a1", "a2"] },
      { id: "B", name: "Team B", playerIds: ["b1", "b2"] },
    ]
  );
  state = play(state, [S(1)]);
  state = play(state, [D(1)]);
  state = play(state, [T(1)]);
  state = play(state, [MISS]);
  assert.equal(state.finished, true);
  assert.equal(state.standings[0].id, "A");
  assert.equal(state.standings[0].total, 4);
  assert.equal(state.standings[1].total, 2);
}

console.log("[BASEBALL] All regression tests passed");
