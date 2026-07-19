// tools/test-x01v3-undo.mjs
// Run: node tools/test-x01v3-undo.mjs
import { applyDartToCurrentPlayerV3, startNewVisitV3 } from "../src/lib/x01v3/x01LogicV3.js";
import { generateThrowOrderV3, getNextPlayerV3 } from "../src/lib/x01v3/x01FlowV3.js";

/** @typedef {{id:string, name:string}} P */

function clone(x) {
  return globalThis.structuredClone ? structuredClone(x) : JSON.parse(JSON.stringify(x));
}

function mkConfig(outMode = "double") {
  /** @type {any} */
  const config = {
    gameMode: "multi",
    serveMode: "alternate",
    startScore: 301,
    legsPerSet: 3,
    setsToWin: 1,
    outMode, // "simple" | "double" | "master"
    players: /** @type {P[]} */ ([
      { id: "A", name: "A" },
      { id: "B", name: "B" },
    ]),
  };
  return config;
}

function mkInitialState(config) {
  const scores = {};
  const legsWon = {};
  const setsWon = {};
  for (const p of config.players) {
    scores[p.id] = config.startScore;
    legsWon[p.id] = 0;
    setsWon[p.id] = 0;
  }

  const throwOrder = generateThrowOrderV3(config, null, 1);

  /** @type {any} */
  const state = {
    matchId: "TEST",
    currentSet: 1,
    currentLeg: 1,
    throwOrder,
    activePlayer: throwOrder[0],
    scores,
    legsWon,
    setsWon,
    teamLegsWon: undefined,
    teamSetsWon: undefined,
    visit: null,
    status: "playing",
  };

  startNewVisitV3(state);
  return state;
}

function assertInvariants(state, label) {
  const pid = state.activePlayer;
  const v = state.visit;

  if (!v) throw new Error(`[${label}] visit is null`);
  if (v.currentScore !== state.scores[pid]) {
    throw new Error(
      `[${label}] visit.currentScore(${v.currentScore}) != scores[${pid}](${state.scores[pid]})`
    );
  }
  if (v.dartsLeft < 0 || v.dartsLeft > 3) {
    throw new Error(`[${label}] dartsLeft out of range: ${v.dartsLeft}`);
  }
  if (!Array.isArray(v.darts)) throw new Error(`[${label}] visit.darts is not array`);
}

function fmtDart(d) {
  const m = d.multiplier;
  if (m === 0) return "MISS";
  if (d.segment === 25) return m === 2 ? "DBULL" : "SBULL";
  const pfx = m === 1 ? "S" : m === 2 ? "D" : "T";
  return `${pfx}${d.segment}`;
}

// Minimal “engine loop” (sans sets/legs) :
// - applique la fléchette
// - si la visite est finie (dartsLeft=0), passe au joueur suivant et startNewVisitV3
function throwOne(config, state, input) {
  const res = applyDartToCurrentPlayerV3(config, state, input);

  const endedVisit = state.visit && state.visit.dartsLeft === 0;
  const finishedLeg = res.scoreAfter === 0 && !res.bust;

  // On ne gère pas la victoire ici (pas besoin pour reproduire le bug UNDO).
  if (endedVisit && !finishedLeg) {
    state.activePlayer = getNextPlayerV3(state);
    startNewVisitV3(state);
  }

  return res;
}

function runScenario(outMode) {
  const config = mkConfig(outMode);
  const state = mkInitialState(config);

  // UNDO stack (snapshot state complet avant chaque dart)
  const undo = [];

  function pushUndo() {
    undo.push(clone(state));
  }
  function doUndo() {
    const snap = undo.pop();
    if (!snap) return false;

    // restore state in-place (important: on remplace toutes les clés)
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, snap);

    return true;
  }

  const log = [];
  function logLine(tag, extra = "") {
    const v = state.visit;
    log.push(
      `${tag} | P=${state.activePlayer} score=${state.scores[state.activePlayer]} left=${v?.dartsLeft} darts=[${(v?.darts || []).map(fmtDart).join(",")}] ${extra}`
    );
  }

  // Scenario volontairement “piégeux” :
  // A: T20 T20 T20 (visit ends) -> B starts
  // B: S20 (still same visit) -> UNDO -> rethrow different
  // + on vérifie invariants après chaque action
  logLine("START");

  pushUndo(); const r1 = throwOne(config, state, { segment: 20, multiplier: 3 }); assertInvariants(state, "after r1"); logLine("THROW", `(${fmtDart(r1.dart)} => ${r1.scoreAfter}${r1.bust ? " BUST":""})`);
  pushUndo(); const r2 = throwOne(config, state, { segment: 20, multiplier: 3 }); assertInvariants(state, "after r2"); logLine("THROW", `(${fmtDart(r2.dart)} => ${r2.scoreAfter}${r2.bust ? " BUST":""})`);
  pushUndo(); const r3 = throwOne(config, state, { segment: 20, multiplier: 3 }); assertInvariants(state, "after r3"); logLine("THROW", `(${fmtDart(r3.dart)} => ${r3.scoreAfter}${r3.bust ? " BUST":""})`);

  // Now B should be active (visit restarted)
  pushUndo(); const r4 = throwOne(config, state, { segment: 20, multiplier: 1 }); assertInvariants(state, "after r4"); logLine("THROW", `(${fmtDart(r4.dart)} => ${r4.scoreAfter}${r4.bust ? " BUST":""})`);

  const ok = doUndo();
  if (!ok) throw new Error("UNDO stack empty");
  assertInvariants(state, "after UNDO");
  logLine("UNDO");

  // Re-throw a different dart after undo
  pushUndo(); const r5 = throwOne(config, state, { segment: 19, multiplier: 3 }); assertInvariants(state, "after r5"); logLine("RETHROW", `(${fmtDart(r5.dart)} => ${r5.scoreAfter}${r5.bust ? " BUST":""})`);

  return log.join("\n");
}

for (const outMode of ["simple", "double", "master"]) {
  console.log("\n====================================================");
  console.log(`X01V3 UNDO TEST | outMode=${outMode}`);
  console.log("====================================================");
  console.log(runScenario(outMode));
}
