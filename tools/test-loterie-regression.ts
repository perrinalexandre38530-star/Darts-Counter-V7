import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { autoLevelFromAvg3, buildPlayerStates, expressDartMatchesTarget, expressPool, expressTurnShouldEnd, generateCards, hasWon, resultKey, revealResult, type LoterieConfig } from "../src/lib/loterie.ts";

const base: LoterieConfig = { variant: "classic", level: "auto", autoMode: "balanced", volleyMode: "free", expressTarget: "simple", cardsPerPlayer: 4, cellsPerCard: 10, startOrderMode: "fixed" };
assert.equal(autoLevelFromAvg3(20), "beginner");
assert.equal(autoLevelFromAvg3(30), "leisure");
assert.equal(autoLevelFromAvg3(45), "intermediate");
assert.equal(autoLevelFromAvg3(60), "confirmed");
assert.equal(autoLevelFromAvg3(80), "expert");
const states = buildPlayerStates([{id:"a",name:"A",avg3:25},{id:"b",name:"B",avg3:85}], base, 1234);
assert.equal(states[0].targetMax,45);
assert.equal(states[1].targetMax,120);
assert.equal(states[0].cards.length,4);
for (const card of states[0].cards) assert.equal(new Set(card.cells.map(c=>c.key)).size, card.cells.length);
assert.equal(expressPool("double").some(c=>c.key==="DBULL"), true);
for (let i = 1; i <= 9; i++) assert.equal(existsSync(`public/images/loterie/score-cards/${i}.webp`), true, `carte simple ${i} manquante`);
for (let i = 1; i <= 20; i++) {
  assert.equal(existsSync(`public/images/loterie/express-cards/D${i}.webp`), true, `carte D${i} manquante`);
  assert.equal(existsSync(`public/images/loterie/express-cards/T${i}.webp`), true, `carte T${i} manquante`);
}
assert.equal(existsSync("public/images/loterie/express-cards/DB.webp"), true, "carte DB manquante");
assert.equal(existsSync("public/images/loterie/express-cards/miss.webp"), true, "carte MISS manquante");

// EXPRESS : les simples 1..9 sont de vrais résultats, plus jamais "hors lot" par construction.
assert.deepEqual(resultKey({...base,variant:"express",expressTarget:"simple"},[{v:3,mult:1}]).key,"S3");
assert.deepEqual(resultKey({...base,variant:"express",expressTarget:"double"},[{v:10,mult:2}]).key,"D10");
assert.equal(resultKey({...base,variant:"express",expressTarget:"double"},[{v:20,mult:1}]).key,null);

// EXPRESS jusqu'à 3 essais : on retient la première fléchette qui correspond à la cible demandée.
const express3: LoterieConfig = {...base,variant:"express",expressTarget:"double",expressAttempts:"up_to_3",missEndsTurn:false};
assert.equal(expressDartMatchesTarget("double", {v:2,mult:1}), false);
assert.equal(expressDartMatchesTarget("double", {v:5,mult:2}), true);
assert.deepEqual(resultKey(express3,[{v:2,mult:1},{v:5,mult:2}]).key,"D5");
assert.equal(resultKey(express3,[{v:2,mult:1},{v:7,mult:1},{v:9,mult:3}]).key,null);
assert.equal(resultKey({...express3,missEndsTurn:true},[{v:0,mult:1}]).label,"MISS");
assert.equal(expressTurnShouldEnd(express3,[{v:2,mult:1}]),false);
assert.equal(expressTurnShouldEnd(express3,[{v:2,mult:1},{v:5,mult:2}]),true);
assert.equal(expressTurnShouldEnd(express3,[{v:2,mult:1},{v:7,mult:1},{v:9,mult:3}]),true);
assert.equal(expressTurnShouldEnd({...express3,missEndsTurn:true},[{v:0,mult:1}]),true);

assert.deepEqual(resultKey(base,[{v:20,mult:3},{v:18,mult:1},{v:11,mult:2}]).value,100);
const forced = structuredClone(states[0]);
forced.cards[0].cells = forced.cards[0].cells.map((c,i)=>({...c,key:i===0?"N60":c.key,revealed:i!==0}));
const r = revealResult(forced, base, [{v:20,mult:3}]);
assert.equal(r.revealed >= 1,true);
assert.equal(hasWon(r.player),true);

const expressState = buildPlayerStates([{id:"x",name:"X"}], express3, 42)[0];
expressState.cards[0].cells[0] = {...expressState.cards[0].cells[0], key:"D5", label:"D5", value:10, revealed:false};
const er = revealResult(expressState, express3, [{v:2,mult:1},{v:5,mult:2}]);
assert.equal(er.player.stats.expressTurns,1);
assert.equal(er.player.stats.expressTargetHits,1);
assert.equal(er.player.stats.expressWrongRingDarts,1);
assert.equal(er.player.stats.expressSuccessOnDart2,1);
assert.equal(er.player.stats.expressAttemptsUsed,2);

console.log("LOTERIE regression: OK");
