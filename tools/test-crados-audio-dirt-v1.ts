import assert from "node:assert/strict";
import { createCradosState, playCradosVisit } from "../src/lib/gameEngines/cradosEngine.ts";

const players = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
const base = { mode: "crados", selectedIds: ["a", "b"], seriesWins: 2, rules: { dirtLimit: 10, layersToOwn: 3, bullWash: true, stealMode: "block", sectorRaceMode: "claim", cleanBullSplash: false, endOnFirstMaxDirt: true } };

// MISS = +2 crasses.
let missState = createCradosState(players, base);
missState = playCradosVisit(missState, [{ bed: "MISS" }]);
assert.equal(missState.dirt.a, 2, "Un MISS doit ajouter +2 crasses au camp actif");
assert.equal(missState.statsByPlayer.a.misses, 1);
assert.match(missState.visits.at(-1)?.events.join(" ") || "", /MISS : \+2 CRASSE/);

// DOUBLE = douche -2 ET conserve sa puissance normale de 2 couches.
let doubleState = createCradosState(players, base);
doubleState.dirt.a = 5;
doubleState = playCradosVisit(doubleState, [{ bed: "D", number: 20 }]);
assert.equal(doubleState.dirt.a, 3, "Un DOUBLE doit laver 2 crasses quand la Douche est active");
assert.equal(doubleState.sectors[20].layers, 2, "Le DOUBLE doit conserver son effet normal de 2 couches");
assert.equal(doubleState.statsByPlayer.a.dirtWashed, 2);
assert.match(doubleState.visits.at(-1)?.events.join(" ") || "", /DOUBLE DOUCHE : −2 crasse/);

// La douche peut être désactivée : le DOUBLE garde ses 2 couches mais ne lave plus.
let doubleOff = createCradosState(players, { ...base, rules: { ...base.rules, bullWash: false } });
doubleOff.dirt.a = 5;
doubleOff = playCradosVisit(doubleOff, [{ bed: "D", number: 20 }]);
assert.equal(doubleOff.dirt.a, 5);
assert.equal(doubleOff.sectors[20].layers, 2);

// Un MISS qui remplit la jauge déclenche bien la fin de manche.
let lethalMiss = createCradosState(players, { ...base, seriesWins: 1 });
lethalMiss.dirt.a = 9;
lethalMiss = playCradosVisit(lethalMiss, [{ bed: "MISS" }]);
assert.equal(lethalMiss.dirt.a, 10);
assert.equal(lethalMiss.eliminated.a, true);
assert.equal(lethalMiss.legWins.b, 1);

console.log("✅ CRADOS audio/rules v1 OK");
