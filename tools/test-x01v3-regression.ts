// =============================================================
// tools/test-x01v3-regression.ts
// X01 V3 Regression Tests (no vitest)
// Run:
//   node --experimental-strip-types ./tools/test-x01v3-regression.ts
//
// Objectifs :
// - Vérifier que les suggestions de checkout respectent outMode
// - Vérifier qu'un "UNDO + rebuild" produit un état cohérent et identique
//   à un replay déterministe.
// =============================================================

import assert from "node:assert/strict";

import { startNewVisitV3, applyDartToCurrentPlayerV3 } from "../src/lib/x01v3/x01LogicV3";
import { generateThrowOrderV3, getNextPlayerV3 } from "../src/lib/x01v3/x01FlowV3";
import { getAdaptiveCheckoutSuggestionV3 } from "../src/lib/x01v3/x01CheckoutV3";

type DartInput = { segment: number; multiplier: 0 | 1 | 2 | 3 };

function clone<T>(x: T): T {
  // @ts-ignore
  return globalThis.structuredClone ? structuredClone(x) : JSON.parse(JSON.stringify(x));
}

function mkConfig(outMode: "simple" | "double" | "master" = "double") {
  return {
    gameMode: "multi",
    serveMode: "alternate",
    startScore: 301,
    legsPerSet: 1,
    setsToWin: 1,
    outMode,
    players: [
      { id: "A", name: "A" },
      { id: "B", name: "B" },
    ],
  } as any;
}

function mkInitialState(cfg: any) {
  const scores = { A: cfg.startScore, B: cfg.startScore } as any;
  const legsWon = { A: 0, B: 0 } as any;
  const setsWon = { A: 0, B: 0 } as any;

  const throwOrder = generateThrowOrderV3(cfg, null, 1);

  const st: any = {
    matchId: "TEST",
    currentSet: 1,
    currentLeg: 1,
    throwOrder,
    activePlayer: throwOrder[0],
    scores,
    legsWon,
    setsWon,
    status: "playing",
    visit: null,
  };
  startNewVisitV3(st);
  return st;
}

function applyDartWithFlow(cfg: any, prevState: any, input: DartInput) {
  const st = clone(prevState);
  if (st.status !== "playing") return st;
  if (!st.visit) startNewVisitV3(st);

  const res: any = applyDartToCurrentPlayerV3(cfg, st, input as any);
  const visit = st.visit;
  const ended = res.bust || visit.dartsLeft === 0 || res.scoreAfter === 0;

  // en cours : checkout suggestion live
  if (!ended) {
    if (!res.bust && visit.dartsLeft > 0 && res.scoreAfter > 1) {
      visit.checkoutSuggestion = getAdaptiveCheckoutSuggestionV3({
        score: visit.currentScore,
        dartsLeft: visit.dartsLeft,
        outMode: cfg.outMode,
      } as any);
    } else {
      visit.checkoutSuggestion = null;
    }
    return st;
  }

  // checkout : on stoppe ici (pas besoin de legs/sets pour ce test)
  if (!res.bust && res.scoreAfter === 0) {
    st.status = "leg_end";
    return st;
  }

  // bust ou fin visite : rotation + nouvelle visite
  st.activePlayer = getNextPlayerV3(st);
  startNewVisitV3(st);
  return st;
}

function replay(cfg: any, history: DartInput[]) {
  let st = mkInitialState(cfg);
  for (const d of history) st = applyDartWithFlow(cfg, st, d);
  return st;
}

function assertStateCoherent(st: any) {
  assert.ok(st.visit, "visit must exist");
  const pid = st.activePlayer;
  assert.equal(st.visit.currentScore, st.scores[pid], "visit.currentScore must match scores[active]");
  assert.ok(st.visit.dartsLeft >= 0 && st.visit.dartsLeft <= 3, "dartsLeft range");
}

function testUndoRebuildDeterministic() {
  const cfg = mkConfig("double");

  // scénario piégeux (switch joueur + undo + rethrow)
  const history: DartInput[] = [
    { segment: 20, multiplier: 3 },
    { segment: 20, multiplier: 3 },
    { segment: 20, multiplier: 3 },
    { segment: 20, multiplier: 1 },
  ];

  const stA = replay(cfg, history);
  assertStateCoherent(stA);

  // UNDO du dernier dart + rethrow
  const historyUndo = history.slice(0, -1);
  const historyRe = [...historyUndo, { segment: 19, multiplier: 3 }];

  const stB = replay(cfg, historyRe);
  assertStateCoherent(stB);

  // Si on est en mode "rebuild from history" pour l'UNDO, le replay est déterministe
  const stC = replay(cfg, historyRe);
  assert.deepEqual(
    { activePlayer: stB.activePlayer, scores: stB.scores, dartsLeft: stB.visit.dartsLeft, currentScore: stB.visit.currentScore },
    { activePlayer: stC.activePlayer, scores: stC.scores, dartsLeft: stC.visit.dartsLeft, currentScore: stC.visit.currentScore },
    "rebuild must be deterministic"
  );
}

function finisherOk(sug: any, outMode: "simple" | "double" | "master") {
  if (!sug) return false;
  const last = sug.darts[sug.darts.length - 1];
  if (outMode === "simple") return true;
  if (outMode === "double") return last.multiplier === 2;
  return last.multiplier === 2 || last.multiplier === 3;
}

function testCheckoutModes() {
  const scores = [170, 167, 40, 32, 50, 24, 2, 171, 1, 0];
  for (const outMode of ["simple", "double", "master"] as const) {
    for (const s of scores) {
      const sug = getAdaptiveCheckoutSuggestionV3({ score: s, dartsLeft: 3, outMode } as any);

      if (s <= 1 || s > 170) {
        assert.equal(sug, null);
        continue;
      }

      // On n'exige pas une suggestion pour chaque score, mais si elle existe elle doit respecter outMode
      if (sug) {
        assert.ok(finisherOk(sug, outMode), `finisher must respect outMode=${outMode} score=${s}`);
      }
    }
  }
}

function main() {
  console.log("[X01V3] Running regression tests...");
  testUndoRebuildDeterministic();
  testCheckoutModes();
  console.log("[X01V3] ✅ All tests passed");
}

main();
