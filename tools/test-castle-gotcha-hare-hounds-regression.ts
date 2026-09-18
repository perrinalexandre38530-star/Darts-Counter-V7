import { createCastleState, playCastleVisit, assignCastleNumber } from "../src/lib/gameEngines/castleEngine.ts";
import { createGotchaState, playGotchaVisit } from "../src/lib/gameEngines/gotchaEngine.ts";
import { createHareState, playHareVisit, hareCurrentSegment } from "../src/lib/gameEngines/hareHoundsEngine.ts";

function assert(ok: unknown, message: string) { if (!ok) throw new Error(message); }
const players = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }];

// CASTLE — construction, attaque, attribution manuelle et BO.
{
  let s = createCastleState(players.slice(0, 2), { mode: "castle", seriesWins: 1, rules: { targetBricks: 10, numberAssignment: "random", attacksEnabled: true, reassignEachLeg: true } });
  const aTarget = s.targets.a;
  const bTarget = s.targets.b;
  s.bricks.b = 5;
  s = playCastleVisit(s, [{ bed: "T", number: bTarget }, { bed: "T", number: aTarget }, { bed: "T", number: aTarget }]);
  assert(s.bricks.b === 2, "CASTLE attack must remove 3 bricks");
  assert(s.bricks.a === 6, "CASTLE build must add multiplier bricks");
  s = playCastleVisit(s, [{ bed: "MISS" }]);
  s = playCastleVisit(s, [{ bed: "T", number: aTarget }, { bed: "S", number: aTarget }]);
  assert(s.phase === "finished" && s.winnerId === "a", "CASTLE must finish when target bricks are reached");

  let manual = createCastleState(players.slice(0, 2), { mode: "castle", seriesWins: 1, rules: { targetBricks: 15, numberAssignment: "offhand", attacksEnabled: true, reassignEachLeg: true } });
  const assignmentIndexBeforeInvalid = manual.assignmentIndex;
  manual = assignCastleNumber(manual, { bed: "IB" });
  assert(manual.assignmentIndex === assignmentIndexBeforeInvalid && !manual.targets.a, "CASTLE offhand BULL/MISS must require a numbered-sector rethrow");
  manual = assignCastleNumber(manual, { bed: "S", number: 7 });
  manual = assignCastleNumber(manual, { bed: "D", number: 7 });
  assert(manual.targets.a === 7 && manual.targets.b !== 7 && manual.phase === "playing", "CASTLE offhand numbers must be unique");
}

// GOTCHA — reset adverse, bust turn, Double Out.
{
  let s = createGotchaState(players.slice(0, 2), { mode: "gotcha", seriesWins: 1, rules: { targetScore: 301, outMode: "straight", maxRounds: 0, bustRule: "turn" } });
  s = playGotchaVisit(s, [{ bed: "T", number: 20 }]); // A=60
  s = playGotchaVisit(s, [{ bed: "T", number: 20 }]); // B=60 -> GOTCHA A
  assert(s.scores.a === 0 && s.scores.b === 60, "GOTCHA equal score must reset opponent to zero");

  let d = createGotchaState(players.slice(0, 2), { mode: "gotcha", seriesWins: 1, rules: { targetScore: 201, outMode: "double", maxRounds: 0, bustRule: "turn" } });
  d.scores.a = 181;
  d = playGotchaVisit(d, [{ bed: "S", number: 20 }]);
  assert(d.scores.a === 181 && d.statsByPlayer.a.busts === 1, "GOTCHA invalid Double Out must bust");
  d = playGotchaVisit(d, [{ bed: "MISS" }]);
  d = playGotchaVisit(d, [{ bed: "D", number: 10 }]);
  assert(d.phase === "finished" && d.winnerId === "a", "GOTCHA valid Double Out must win");

  let hardcore = createGotchaState(players.slice(0, 2), { mode: "gotcha", seriesWins: 1, rules: { targetScore: 201, outMode: "straight", maxRounds: 0, bustRule: "zero" } });
  hardcore.scores.a = 190;
  hardcore = playGotchaVisit(hardcore, [{ bed: "T", number: 20 }]);
  assert(hardcore.scores.a === 0 && hardcore.statsByPlayer.a.busts === 1, "GOTCHA hardcore bust must reset the active player to zero");
}

// HARE & HOUNDS — ordre de cible, zone et capture.
{
  let s = createHareState(players.slice(0, 2), { mode: "hare_hounds", seriesWins: 1, rules: { houndStart: 5, targetZone: "any", roleMode: "first", direction: "clockwise" } });
  assert(hareCurrentSegment(s, "a") === 20 && hareCurrentSegment(s, "b") === 5, "H&H start sectors incorrect");
  s = playHareVisit(s, [{ bed: "S", number: 20 }, { bed: "S", number: 1 }]);
  assert(hareCurrentSegment(s, "a") === 18, "Hare must advance through physical board order");
  s = playHareVisit(s, [{ bed: "S", number: 5 }, { bed: "S", number: 20 }, { bed: "S", number: 1 }]);
  assert(s.phase === "finished" && s.winnerId === "b", "Hound must win when it catches hare");

  let dbl = createHareState(players.slice(0, 2), { mode: "hare_hounds", seriesWins: 1, rules: { houndStart: 12, targetZone: "double", roleMode: "first", direction: "clockwise" } });
  dbl = playHareVisit(dbl, [{ bed: "S", number: 20 }, { bed: "D", number: 20 }]);
  assert(dbl.progressByPlayer.a === 1, "Double-only variant must reject singles");
}

console.log("CASTLE / GOTCHA / HARE & HOUNDS regression: OK");
