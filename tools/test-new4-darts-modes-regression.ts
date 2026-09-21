import { createFiftyOneByFiveState, playFiftyOneByFiveVisit } from "../src/lib/gameEngines/fiftyOneByFiveEngine.ts";
import { createLooperState, playLooperVisit } from "../src/lib/gameEngines/looperEngine.ts";
import { createCallThreeState, playCallThreeVisit } from "../src/lib/gameEngines/callThreeEngine.ts";
import { createSteeplechaseState, playSteeplechaseVisit } from "../src/lib/gameEngines/steeplechaseEngine.ts";
import { encodeCompactMatch, decodeCompactMatch } from "../src/lib/matchCompactCodec.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(ok: unknown, message: string) { if (!ok) throw new Error(message); }
const one = [{ id: "a", name: "A" }];
const two = [{ id: "a", name: "A" }, { id: "b", name: "B" }];

// 51 BY 5 — division, volée invalidée par un MISS et arrivée exacte.
{
  let s = createFiftyOneByFiveState(one, {
    mode: "fifty_one_by_five",
    seriesWins: 1,
    rules: { target: 51, divisor: 5, requireThreeScoringDarts: true, bustRule: "hold", exactFinish: true },
  });
  s = playFiftyOneByFiveVisit(s, [{ bed: "S", number: 20 }, { bed: "S", number: 4 }, { bed: "S", number: 1 }]);
  assert(s.scores.a === 5, "51 BY 5: 25 points bruts doivent donner +5");
  s = playFiftyOneByFiveVisit(s, [{ bed: "S", number: 20 }, { bed: "S", number: 5 }, { bed: "MISS" }]);
  assert(s.scores.a === 5 && s.statsByPlayer.a.invalidVisits === 1, "51 BY 5: un MISS doit invalider la volée en règle classique");
  s.scores.a = 50;
  s = playFiftyOneByFiveVisit(s, [{ bed: "S", number: 1 }, { bed: "S", number: 1 }, { bed: "T", number: 1 }]);
  assert(s.phase === "finished" && s.winnerId === "a" && s.scores.a === 51, "51 BY 5: l'arrivée exacte à 51 doit gagner");
}

// LOOPER — cible active, survie et perte de vie.
{
  let s = createLooperState(two, {
    mode: "looper",
    seriesWins: 1,
    rules: { lives: 3, startTarget: "random", exactSegment: true, numberLoopsEnabled: true, setterShield: true },
  });
  s.currentTarget = 7;
  s = playLooperVisit(s, [{ bed: "S", number: 7 }, { bed: "MISS" }, { bed: "MISS" }]);
  assert(s.statsByPlayer.a.hits === 1 && s.lives.a === 3 && s.shields.a === 1, "LOOPER: toucher la cible doit conserver les vies et créer le bouclier configuré");
  s = playLooperVisit(s, [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }]);
  assert(s.lives.b === 2 && s.statsByPlayer.b.lifeLosses === 1, "LOOPER: rater la cible sans bouclier doit coûter une vie");
}

// CALL THREE — ordre strict, multiplicateurs, Bull 2 / DBull 3, égalité => extra round.
{
  let s = createCallThreeState(two, {
    mode: "call_three",
    seriesWins: 1,
    rules: { rounds: 5, callerMode: "next", orderedTargets: true, bullAllowed: true, multiplierScoring: true },
  });
  s.currentCalls = [{ kind: "number", number: 20 }, { kind: "number", number: 1 }, { kind: "bull" }];
  s = playCallThreeVisit(s, [{ bed: "T", number: 20 }, { bed: "D", number: 1 }, { bed: "IB" }]);
  assert(s.scores.a === 8, "CALL THREE: T=3, D=2 et DBull=3 doivent donner 8 points sans bonus inventé");
  assert(s.statsByPlayer.a.perfectRounds === 1, "CALL THREE: trois appels réussis doivent enregistrer un Full Call");

  let tie = createCallThreeState(two, {
    mode: "call_three",
    seriesWins: 1,
    rules: { rounds: 5, callerMode: "next", orderedTargets: true, bullAllowed: true, multiplierScoring: true },
  });
  tie.roundIndex = 4;
  tie.activePlayerIndex = 1;
  tie.scores.a = 4;
  tie.scores.b = 4;
  tie.currentCalls = [{ kind: "number", number: 20 }, { kind: "number", number: 1 }, { kind: "bull" }];
  tie = playCallThreeVisit(tie, [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }]);
  assert(tie.phase === "playing" && tie.roundIndex === 5 && tie.winnerId == null, "CALL THREE: une égalité après les rounds prévus doit ouvrir un round supplémentaire");
}

// STEEPLECHASE — progression normale et haie obligatoire en Triple.
{
  let s = createSteeplechaseState(one, {
    mode: "steeplechase",
    seriesWins: 1,
    rules: { direction: "clockwise", innerSingleOnly: true, fencesEnabled: true, fences: [13, 17, 8, 5], finishBull: "any" },
  });
  s = playSteeplechaseVisit(s, [{ bed: "S", number: 20 }]);
  assert(s.stepByPlayer.a === 1, "STEEPLECHASE: S20 doit franchir la première étape");
  s.stepByPlayer.a = 4; // étape 13 = première haie
  s = playSteeplechaseVisit(s, [{ bed: "S", number: 13 }]);
  assert(s.stepByPlayer.a === 4, "STEEPLECHASE: S13 ne doit pas franchir la haie T13");
  s = playSteeplechaseVisit(s, [{ bed: "T", number: 13 }]);
  assert(s.stepByPlayer.a === 5 && s.statsByPlayer.a.fencesCleared === 1, "STEEPLECHASE: T13 doit franchir la haie");
}

// Codec compact — les 4 moteurs doivent conserver config, snapshot, visites et stats pour reprise/cloud.
for (const mode of ["fifty_one_by_five", "looper", "call_three", "steeplechase"] as const) {
  const stateSnapshot = { mode, phase: "playing", activePlayerIndex: 0, marker: `${mode}-resume`, visits: [{ id: "v1", playerId: "a" }] };
  const rec = {
    id: `codec-${mode}`,
    mode,
    sport: "darts",
    status: "in_progress",
    createdAt: 123456,
    players: [{ id: "a", name: "A" }],
    payload: {
      mode,
      sport: "darts",
      config: { mode, selectedIds: ["a"], rules: { marker: mode } },
      stateSnapshot,
      visits: stateSnapshot.visits,
      stats: { mode, players: { a: { darts: 3, visits: 1 } } },
      summary: { mode, marker: "summary" },
    },
  };
  const compact = encodeCompactMatch(rec);
  assert(compact?.m === mode, `CODEC ${mode}: mode compact incorrect`);
  const decoded = decodeCompactMatch(compact);
  assert(decoded?.mode === mode, `CODEC ${mode}: mode décodé incorrect`);
  assert((decoded as any)?.stateSnapshot?.marker === `${mode}-resume`, `CODEC ${mode}: snapshot de reprise perdu`);
  assert((decoded as any)?.config?.rules?.marker === mode, `CODEC ${mode}: configuration perdue`);
  assert(Array.isArray((decoded as any)?.visits) && (decoded as any).visits.length === 1, `CODEC ${mode}: visites perdues`);
}


// Intégration application — fin de partie, reprise, stats et ticker NEW doivent être câblés.
{
  const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
  const history = readFileSync(resolve(process.cwd(), "src/pages/HistoryPage.tsx"), "utf8");
  const stats = readFileSync(resolve(process.cwd(), "src/pages/StatsHub.tsx"), "utf8");
  const summary = readFileSync(resolve(process.cwd(), "src/pages/DartsModeSummaryPage.tsx"), "utf8");
  const ticker = readFileSync(resolve(process.cwd(), "src/games/newModesTicker.ts"), "utf8");
  for (const mode of ["fifty_one_by_five", "looper", "call_three", "steeplechase"]) {
    assert(app.includes(`enrichOnlineMatchForHistory(m, "${mode}"`), `APP ${mode}: onFinish/pushHistory non câblé`);
    assert(history.includes(`${mode}_play`) || (mode === "fifty_one_by_five" && history.includes("fifty_one_by_five_play")), `HISTORY ${mode}: route de reprise absente`);
    assert(stats.includes(mode), `STATS ${mode}: mode absent du StatsHub`);
    assert(summary.includes(mode), `SUMMARY ${mode}: résumé dédié absent`);
    assert(ticker.includes(`"${mode}"`), `TICKER ${mode}: nouveauté absente`);
  }
  assert(ticker.includes('id === "fifty_one_by_five" ? "51_by_5" : id'), "TICKER 51 BY 5: alias asset ticker_51_by_5.png absent");
}

console.log("51 BY 5 / LOOPER / CALL THREE / STEEPLECHASE regression: OK");
