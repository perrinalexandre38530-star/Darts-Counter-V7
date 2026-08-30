import assert from "node:assert/strict";
import { applyTournamentMatchScore, buildRoundRobinMatches, buildRoundRobinStandings, buildSingleEliminationBracket } from "../src/esports/tournamentEngine.ts";
import type { EsportsTournamentParticipant } from "../src/esports/types.ts";

const participants = (count: number): EsportsTournamentParticipant[] => Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seed: i + 1 }));

{
  let bracket = buildSingleEliminationBracket(participants(4));
  assert.equal(bracket.length, 3);
  assert.equal(bracket.filter((m) => m.round === 1 && m.status === "ready").length, 2);
  bracket = applyTournamentMatchScore(bracket, "r1-m1", 2, 0, "single_elimination");
  bracket = applyTournamentMatchScore(bracket, "r1-m2", 1, 3, "single_elimination");
  const final = bracket.find((m) => m.id === "r2-m1")!;
  assert.equal(final.status, "ready");
  assert.equal(final.participantAName, "P1");
  assert.equal(final.participantBName, "P4");
  bracket = applyTournamentMatchScore(bracket, "r2-m1", 3, 1, "single_elimination");
  assert.equal(bracket.find((m) => m.id === "r2-m1")?.winnerId, "p1");
}

{
  const bracket = buildSingleEliminationBracket(participants(6));
  const round1 = bracket.filter((m) => m.round === 1);
  assert.equal(round1.length, 4);
  assert.equal(round1.filter((m) => m.status === "finished" && !!m.winnerId).length, 2, "6 participants doivent produire 2 BYE, pas un match vide");
  const semis = bracket.filter((m) => m.round === 2);
  assert.equal(semis.filter((m) => !!m.participantAId || !!m.participantBId).length, 2, "Les BYE doivent être propagés vers les demi-finales");
}

{
  const ps = participants(4);
  let rr = buildRoundRobinMatches(ps);
  assert.equal(rr.length, 6);
  rr = applyTournamentMatchScore(rr, rr[0].id, 2, 0, "round_robin");
  rr = applyTournamentMatchScore(rr, rr[1].id, 1, 3, "round_robin");
  const standings = buildRoundRobinStandings(ps, rr);
  assert.equal(standings[0].points, 3);
  assert.equal(standings.reduce((n, row) => n + row.played, 0), 4);
}

console.log("✅ E-SPORTS TOURNAMENT V0.2 REGRESSION OK");
