import assert from "node:assert/strict";
import { createPenduState, isPenduChallengeSatisfied, playPenduVisit, scorePenduVisit, setPenduChallenge } from "../src/lib/gameEngines/penduEngine.ts";
import { callMenteur, createMenteurState, isMenteurContractSatisfied, playMenteurVisit, raiseMenteurBid, raiseMenteurBidTo, scoreMenteurVisit } from "../src/lib/gameEngines/menteurEngine.ts";
import { createCradosState, playCradosVisit } from "../src/lib/gameEngines/cradosEngine.ts";
import { decodeCompactMatch, encodeCompactMatch } from "../src/lib/matchCompactCodec.ts";

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

// Helpers UI : aperçu avant validation
assert.equal(scorePenduVisit([{bed:"T",number:20},{bed:"D",number:20}] as any),100);
assert.equal(isPenduChallengeSatisfied({kind:"segment",number:20,bed:"D"},[{bed:"T",number:20}] as any,{...pendu.config,rules:{...pendu.config.rules,executionMode:"flex"}} as any),true);
let bidPreview=createMenteurState(players,{mode:"menteur",seriesWins:1,rules:{lives:3,contractDeck:"advanced",raiseStep:5,bullAllowed:true}});
bidPreview=raiseMenteurBidTo(bidPreview,75);
assert.equal(bidPreview.bid,75);
assert.equal(scoreMenteurVisit([{bed:"T",number:20},{bed:"S",number:15}] as any),75);
bidPreview=callMenteur(bidPreview);
bidPreview.condition="none" as any;
assert.equal(isMenteurContractSatisfied(bidPreview,[{bed:"T",number:20},{bed:"S",number:15}] as any),true);

// Compact codec : les nouveaux modes doivent garder leur identité ET le snapshot
// complet nécessaire à la reprise depuis l'historique / cloud.
for (const [mode, state] of [["pendu", pendu], ["menteur", menteur], ["crados", crados]] as const) {
  const rec = {
    id: `codec-${mode}`,
    kind: mode,
    mode,
    sport: "darts",
    status: state.phase === "finished" ? "finished" : "in_progress",
    players,
    winnerId: state.winnerId,
    payload: {
      kind: mode, mode, sport: "darts", config: state.config, stateSnapshot: state,
      visits: state.visits, visitHistory: state.visits, stats: { mode, players: state.statsByPlayer },
      summary: { mode, winnerId: state.winnerId, perPlayer: state.statsByPlayer, config: state.config },
    },
  };
  const compact = encodeCompactMatch(rec);
  assert.ok(compact, `${mode}: compact absent`);
  assert.equal(compact?.m, mode, `${mode}: mode compact incorrect`);
  const decoded = decodeCompactMatch(compact);
  assert.equal(decoded?.mode, mode, `${mode}: mode décodé incorrect`);
  assert.equal(decoded?.stateSnapshot?.mode, mode, `${mode}: snapshot perdu`);
  assert.deepEqual(decoded?.config?.rules, state.config.rules, `${mode}: config/règles perdues`);
}

console.log("✅ PENDU / MENTEUR / CRADOS regression OK");
