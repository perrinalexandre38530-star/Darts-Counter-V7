import assert from "node:assert/strict";
import { buildCompetitionStandings, buildCompetitionBracket, completeMatchScore, matchCompetitionIndex, knockoutPhase } from "../src/sportsLive/competitionModels.ts";

const result = (id, round, a, b, as, bs, family = null, playedOn = "2026-11-10T10:00:00Z") => ({
  id, round, competition: "Open", playedOn,
  winner: { name: a, score: as }, loser: { name: b, score: bs },
  competitionMeta: family ? { family } : null,
});
const fixtures = [
  { id:"next-final", round:"Final", startsAt:"2026-11-12T16:00:00Z", players:[{name:"A"},{name:"B"}] },
  { id:"already-played", round:"Quarter Final", startsAt:"2026-11-10T10:00:00Z", players:[{name:"B"},{name:"A"}] },
];
const rows = [
  result("g1", "Groupe A", "A", "B", 5, 3),
  result("g1-duplicate", "Groupe A", "A", "B", 5, 3),
  result("g2", "Groupe A", "C", "B", null, 3),
  result("league", "Journée 1", "C", "D", 2, 1, "domestic_league"),
  result("quarter", "Quarter Final", "A", "B", 6, 3),
];
assert.equal(completeMatchScore(rows[2]), false);
const tables = buildCompetitionStandings(rows);
assert.equal(tables.length, 2, "Only explicit group and league matches should form tables");
assert.equal(tables.find(x => x.name === "Groupe A")?.rows.find(x => x.name === "A")?.played, 1, "same match must not be counted twice");
assert.equal(tables.some(x => x.rows.some(row => row.played > 1)), false, "knockout rounds must not leak into standings");
assert.equal(knockoutPhase("1/8 de finale")?.label, "Huitièmes de finale");
assert.equal(knockoutPhase("Demi-finales")?.order, 5);
assert.equal(knockoutPhase("Groupe A"), null);
const bracket = buildCompetitionBracket(rows, fixtures);
assert.deepEqual(bracket.map(x => x.label), ["Quarts de finale", "Finale"]);
assert.equal(bracket[0].scheduled.length, 0, "completed fixtures should not be duplicated as scheduled");
assert.equal(bracket[1].scheduled.length, 1, "future knockout pairings must appear");
const index = [
  {key:"open--fr", name:"Open", countryCode:"FR", logoUrl:"https://example.com/fr.png"},
  {key:"open--gb", name:"Open", countryCode:"GB", logoUrl:"https://example.com/gb.png"},
];
assert.equal(matchCompetitionIndex(index, "Open", "GB")?.key, "open--gb");
assert.equal(matchCompetitionIndex(index, "Open", "US"), null, "foreign-country logos must never be borrowed");
assert.equal(matchCompetitionIndex(index, "Open", null, null), null, "ambiguity without country must not be guessed");
console.log("LIVE Score Center V268: standings, knockout fixtures, geography indexes OK");
