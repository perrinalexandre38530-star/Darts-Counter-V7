import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const roots = new URL("../src/", import.meta.url);

function source(path) { return fs.readFileSync(new URL(path, roots), "utf8"); }
function moduleFor(path, deps = {}) {
  const file = fileURLToPath(new URL(path, roots));
  const code = ts.transpileModule(source(path), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal((code.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(code.outputText, {
    module, exports: module.exports,
    require: (name) => {
      assert.ok(name in deps, `Missing test dependency: ${name}`);
      return deps[name];
    },
  }, { filename: file });
  return module.exports;
}

const targets = moduleFor("lib/gameEngines/shoveAPennyTargets.ts");
const { getShoveValidatedCells } = moduleFor("lib/gameEngines/shoveAPennyValidatedMarks.ts", { "./shoveAPennyTargets": targets });
const { deriveShoveMatchRecords } = moduleFor("lib/gameEngines/shoveAPennyRecords.ts", { "./shoveAPennyTargets": targets });

const state = {
  players: [{ id: "a", name: "Ninja" }, { id: "b", name: "Awena" }],
  activePlayerIndex: 0,
  config: { modeOptions: { ruleSet: "traditional", marksPerBox: 3 } },
  special: { shoveMarksByPlayer: { a: { "1": 1, "3": 2, "8": 3 }, b: { "2": 3 } } },
  currentThrow: [{ v: 1, mult: 3 }], // Not yet validated: MUST NOT affect the band.
  visits: [],
};
let a = getShoveValidatedCells(state, "a");
let b = getShoveValidatedCells(state, "b");
assert.equal(a.length, 9);
assert.deepEqual(Array.from(a.map(({ target }) => target)), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.equal(a.find((cell) => cell.target === 1).count, 1);
assert.equal(a.find((cell) => cell.target === 1).closed, false);
assert.equal(a.find((cell) => cell.target === 3).count, 2);
assert.equal(a.find((cell) => cell.target === 8).closed, true);
assert.equal(b.find((cell) => cell.target === 1).count, 0, "Never mix player-specific marks");
assert.equal(b.find((cell) => cell.target === 2).count, 3);
assert.equal(a.find((cell) => cell.target === 1).count, 1, "Pending triple is not validated");
state.config.modeOptions.marksPerBox = 4;
state.special.shoveMarksByPlayer.a = { "1": 4, "4": 3 };
a = getShoveValidatedCells(state, "a");
assert.equal(a.find((cell) => cell.target === 1).closed, true, "Four-mark variant closes at four");
assert.equal(a.find((cell) => cell.target === 4).closed, false, "Three marks are partial in four-mark variant");
state.config.modeOptions.marksPerBox = 3;
state.config.modeOptions.ruleSet = "electronic";
state.special.shoveMarksByPlayer.a = { "15": 3, "16": 1, "25": 2 };
a = getShoveValidatedCells(state, "a");
assert.deepEqual(Array.from(a.map(({ target }) => target)), [15, 16, 17, 18, 19, 20, 25]);
assert.equal(a.find((cell) => cell.target === 15).closed, true);
assert.equal(a.find((cell) => cell.target === 16).count, 1);
assert.equal(a.find((cell) => cell.target === 25).count, 2);
assert.equal(deriveShoveMatchRecords(state).length, 0, "No match records before validated visits");
state.visits = [ { playerId: "a", delta: 3, darts: [{ bed: "T" }] }, { playerId: "b", delta: 1, darts: [{ bed: "S" }] } ];
assert.ok(deriveShoveMatchRecords(state).length > 0, "Records still derive from confirmed visits");

const mid = source("components/ShoveMatchMidZone.tsx");
const styles = source("components/ShoveMatchMidZone.css");
const stats = source("components/ShoveStatsDashboard.tsx");
const play = source("pages/Wave61SharedPlay.tsx");
assert.match(mid, /data-shove-validated-marks="1"/);
assert.match(mid, /getShoveValidatedCells\(state, playerId\)/);
assert.match(mid, /<CricketMarkIcon/);
assert.doesNotMatch(mid, /deriveShoveMatchRecords|data-shove-live-records|RECORDS/);
assert.match(styles, /overflow-x: auto/);
assert.match(styles, /touch-action: pan-x/);
assert.match(stats, /role="tablist"/);
assert.match(stats, /\{ id: "records", label: "RECORDS" \}/);
assert.match(stats, /TabIcon/);
assert.match(stats, /"resume" \| "marques" \| "evolution" \| "comparatif" \| "records"/);
assert.match(stats, /data-shove-records-tab="1"/);
assert.match(stats, /deriveShoveMatchRecords\(state\)/);
assert.match(play, /activePlayerId=\{String\(activePlayer\?\.id \|\| ""\)\}/);
assert.match(mid, /<InlineAdBanner placement="games"/);

for (const file of ["components/ShoveMatchMidZone.tsx", "components/ShoveStatsDashboard.tsx", "pages/Wave61SharedPlay.tsx"]) {
  const sf = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(sf.parseDiagnostics.length, 0, `${file} should parse as TSX`);
}
console.log("OK SHOVE V131 : validated player-only Cricket marks, 1-9/15-BULL, scrolling and records under STATS");
