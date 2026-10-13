import assert from "node:assert/strict";
import {
  createPenduState,
  isPenduChallengeSatisfied,
  penduChallengeInstruction,
  penduChallengeLabel,
  playPenduVisit,
  type PenduChallenge,
} from "../src/lib/gameEngines/penduEngine.ts";

const players = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }];
const config: any = {
  mode: "pendu",
  seriesWins: 1,
  rules: { partsToLose: 6, challengeMode: "random", targetFamily: "mixed", executionMode: "flex" },
};

let state = createPenduState(players as any, config);
assert.equal(state.phase, "round");
assert.equal(state.roundNumber, 1);
assert.equal(state.copyQueue.length, 3);

// Même objectif pour tout le monde pendant la ronde : réussite = aucun trait du pendu.
state.challenge = { kind: "parity", parity: "even", difficulty: 1 } as any;
state = playPenduVisit(state, [{ bed: "S", number: 20 }] as any);
assert.equal(state.errors.a, 0);
assert.equal(state.activePlayerIndex, 1);
assert.equal(state.roundNumber, 1);

// Échec = exactement +1 élément du pendu.
state = playPenduVisit(state, [{ bed: "S", number: 19 }] as any);
assert.equal(state.errors.b, 1);
assert.equal(state.activePlayerIndex, 2);

// Fin de ronde => nouvel objectif / ronde suivante et starter tournant.
state = playPenduVisit(state, [{ bed: "D", number: 18 }] as any);
assert.equal(state.phase, "round");
assert.equal(state.roundNumber, 2);
assert.equal(state.activePlayerIndex, 1);

const flexConfig: any = { ...state.config, rules: { ...state.config.rules, executionMode: "flex" } };
const cases: Array<[PenduChallenge, any[], boolean]> = [
  [{ kind: "score", target: 60 }, [{ bed: "T", number: 20 }], true],
  [{ kind: "bed", bed: "D" }, [{ bed: "D", number: 7 }], true],
  [{ kind: "bed", bed: "T" }, [{ bed: "T", number: 3 }], true],
  [{ kind: "bed", bed: "BULL" }, [{ bed: "OB" }], true],
  [{ kind: "parity", parity: "even" }, [{ bed: "T", number: 20 }], true],
  [{ kind: "parity", parity: "odd" }, [{ bed: "S", number: 19 }], true],
  [{ kind: "color", color: "red" }, [{ bed: "T", number: 20 }], true],
  [{ kind: "color", color: "green" }, [{ bed: "T", number: 1 }], true],
  [{ kind: "color", color: "black" }, [{ bed: "S", number: 20 }], true],
  [{ kind: "color", color: "white" }, [{ bed: "S", number: 1 }], true],
  [{ kind: "zone", zone: "top" }, [{ bed: "S", number: 20 }], true],
  [{ kind: "zone", zone: "right" }, [{ bed: "S", number: 6 }], true],
  [{ kind: "zone", zone: "bottom" }, [{ bed: "S", number: 3 }], true],
  [{ kind: "zone", zone: "left" }, [{ bed: "S", number: 11 }], true],
  [{ kind: "range", range: "low" }, [{ bed: "S", number: 8 }], true],
  [{ kind: "range", range: "high" }, [{ bed: "S", number: 16 }], true],
];
for (const [challenge, darts, expected] of cases) {
  assert.equal(isPenduChallengeSatisfied(challenge, darts as any, flexConfig), expected, `${penduChallengeLabel(challenge)} should pass`);
  assert.ok(penduChallengeInstruction(challenge).length > 8);
}

assert.equal(isPenduChallengeSatisfied({ kind: "color", color: "red" } as any, [{ bed: "S", number: 20 }] as any, flexConfig), false);
assert.equal(isPenduChallengeSatisfied({ kind: "bed", bed: "T" } as any, [{ bed: "D", number: 20 }] as any, flexConfig), false);

console.log("✅ PENDU RANDOM ROUNDS V13 — objectifs arcade / pendu progressif : OK");
