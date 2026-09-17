import assert from "node:assert/strict";
import { createPenduState, playPenduVisit, setPenduChallenge } from "../src/lib/gameEngines/penduEngine.ts";
import { callMenteur, createMenteurState, playMenteurVisit, raiseMenteurBid } from "../src/lib/gameEngines/menteurEngine.ts";
import { createCradosState, playCradosVisit } from "../src/lib/gameEngines/cradosEngine.ts";

const players=[{id:"a",name:"A"},{id:"b",name:"B"}];

let pendu=createPenduState(players,{mode:"pendu",seriesWins:1,rules:{partsToLose:6,challengeMode:"caller",targetFamily:"segments",executionMode:"strict"}});
pendu=setPenduChallenge(pendu,{kind:"segment",number:20,bed:"T"});
pendu=playPenduVisit(pendu,[{bed:"T",number:20}]);
assert.equal(pendu.phase,"copy");
assert.equal(pendu.activePlayerIndex,1);
pendu=playPenduVisit(pendu,[{bed:"MISS"}]);
assert.equal(pendu.errors.b,1);

let menteur=createMenteurState(players,{mode:"menteur",seriesWins:1,rules:{lives:3,contractDeck:"score",raiseStep:10,bullAllowed:true}});
for(let i=0;i<3;i++){
  menteur=raiseMenteurBid(menteur,30);
  menteur=callMenteur(menteur);
  menteur=playMenteurVisit(menteur,[{bed:"MISS"},{bed:"MISS"},{bed:"MISS"}]);
}
assert.equal(menteur.phase,"finished");
assert.equal(menteur.winnerId,"b");

let crados=createCradosState(players,{mode:"crados",seriesWins:1,rules:{dirtLimit:10,layersToOwn:2,bullWash:true,stealMode:"block"}});
crados=playCradosVisit(crados,[{bed:"D",number:20}]);
assert.equal(crados.sectors[20].ownerId,"a");
for(let i=0;i<10 && crados.phase!=="finished";i++) crados=playCradosVisit(crados,[{bed:"T",number:20}]);
assert.equal(crados.phase,"finished");
assert.equal(crados.winnerId,"a");

console.log("✅ PENDU / MENTEUR / CRADOS regression OK");
