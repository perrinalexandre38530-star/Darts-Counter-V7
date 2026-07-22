import assert from "node:assert/strict";
import {
  BaseballEngine,
  type BaseballRules,
  type BaseballState,
} from "../src/lib/gameEngines/baseballEngine.ts";

const S = (number: number) => ({ bed: "S" as const, number });
const D = (number: number) => ({ bed: "D" as const, number });
const T = (number: number) => ({ bed: "T" as const, number });
const BULL = { bed: "OB" as const };
const DBULL = { bed: "IB" as const };
const MISS = { bed: "MISS" as const };

function rules(patch: Partial<BaseballRules> = {}): Partial<BaseballRules> {
  return {
    mode: "baseball",
    innings: 9,
    extraInnings: true,
    maxExtraInnings: 3,
    seventhInningRule: "none",
    bullTargetMode: "off",
    dbullRuns: 2,
    participantMode: "players",
    ...patch,
  };
}

function play(state: BaseballState, darts: any[]): BaseballState {
  return BaseballEngine.playTurn(state, darts);
}

function targetDart(target: number, mult: 1 | 2 | 3 = 1) {
  if (target === 25) return mult >= 2 ? DBULL : BULL;
  return mult === 3 ? T(target) : mult === 2 ? D(target) : S(target);
}

// S/D/T sur la cible valent 1/2/3 runs ; le reste ne marque pas.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 1, extraInnings: false })
  );
  const target = state.target;
  const wrong = target === 20 ? 19 : target + 1;
  state = play(state, [S(target), D(target), T(target)]);
  state = play(state, [S(wrong), D(wrong), MISS]);
  assert.equal(state.totalsByPlayer.p1, 6);
  assert.equal(state.totalsByPlayer.p2, 0);
  assert.equal(state.finished, true);
  assert.deepEqual(state.winnerIds, ["p1"]);
}

// Une égalité après la manche réglementaire ouvre une nouvelle cible du tirage.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 1, maxExtraInnings: 2 })
  );
  const firstTarget = state.target;
  state = play(state, [targetDart(firstTarget)]);
  state = play(state, [targetDart(firstTarget)]);
  assert.equal(state.finished, false);
  assert.equal(state.inning, 2);
  assert.notEqual(state.target, firstTarget);
  const secondTarget = state.target;
  state = play(state, [targetDart(secondTarget, 2)]);
  state = play(state, [targetDart(secondTarget, 1)]);
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
  let target = state.target;
  state = play(state, [targetDart(target)]);
  state = play(state, [targetDart(target)]);
  target = state.target;
  state = play(state, [targetDart(target, 2)]);
  state = play(state, [targetDart(target, 2)]);
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
  for (let inning = 1; inning <= 6; inning += 1) {
    state = play(state, [targetDart(state.target, 3)]);
  }
  assert.equal(state.totalsByPlayer.p1, 18);
  const wrong = state.target === 20 ? 19 : state.target + 1;
  state = play(state, [MISS, S(wrong), D(wrong)]);
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
  const target = state.target;
  state = play(state, [targetDart(target)]);
  state = play(state, [targetDart(target, 2)]);
  state = play(state, [targetDart(target, 3)]);
  state = play(state, [MISS]);
  assert.equal(state.finished, true);
  assert.equal(state.standings[0].id, "A");
  assert.equal(state.standings[0].total, 4);
  assert.equal(state.standings[1].total, 2);
}

// Tirage : les cibles sont uniques sur les 9 manches tant que le pool n'est pas épuisé.
{
  const state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }],
    rules({ innings: 9, bullTargetMode: "random" })
  );
  const firstNine = state.targetSequence.slice(0, 9);
  assert.equal(firstNine.length, 9);
  assert.equal(new Set(firstNine).size, 9);
  assert.ok(firstNine.every((value) => (value >= 1 && value <= 20) || value === 25));
}

// BULL final + variante DBULL Home Run.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }],
    rules({ innings: 1, extraInnings: false, bullTargetMode: "final", dbullRuns: 3 })
  );
  assert.equal(state.target, 25);
  assert.equal(state.targetSequence[0], 25);
  state = play(state, [DBULL]);
  assert.equal(state.totalsByPlayer.p1, 3);
  assert.equal(state.statsByPlayer.p1.dbulls, 1);
  assert.equal(state.statsByPlayer.p1.bestDart, 3);
}

console.log("[BASEBALL] All regression tests passed");
