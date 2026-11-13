import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const src = read("src/lib/gameEngines/shoveAPennyTargets.ts");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const contextModule = { exports: {} };
vm.runInNewContext(js, { exports: contextModule.exports, module: contextModule });
const { shoveNextTarget, projectShoveMarks, shoveMarkForDart, shoveTargets, shoveRuleSet } = contextModule.exports;

const S = (number) => ({ bed: "S", number });
const D = (number) => ({ bed: "D", number });
const T = (number) => ({ bed: "T", number });
const OB = { bed: "OB" };
const IB = { bed: "IB" };
const MISS = { bed: "MISS" };

assert.equal(shoveNextTarget({}, 3), 15, "start at 15");
let marks = projectShoveMarks({}, [S(15), D(15), S(16)], 3);
assert.equal(marks["15"], 3, "close 15 in a visit");
assert.equal(marks["16"], 1, "third dart automatically moves to 16");
assert.equal(shoveNextTarget(marks, 3), 16);

marks = projectShoveMarks({ "15": 2 }, [T(15), T(16)], 3);
assert.equal(marks["15"], 3, "triple overflow caps marks at 3");
assert.equal(marks["16"], 3, "next dart now aims at 16");
assert.equal(shoveNextTarget(marks, 3), 17);

marks = projectShoveMarks({}, [S(17), MISS, D(15)], 3);
assert.equal(marks["15"], 2, "wrong sectors and miss do not advance");

marks = projectShoveMarks({ "15": 1 }, [D(15), S(16)], 2);
assert.equal(marks["15"], 2, "two-marks variant closes at 2");
assert.equal(marks["16"], 1);

marks = projectShoveMarks({}, [T(15), S(15), S(16)], 4);
assert.equal(marks["15"], 4, "four-marks variant advances after fourth mark");
assert.equal(marks["16"], 1);

const allNumbersClosed = { "15": 3, "16": 3, "17": 3, "18": 3, "19": 3, "20": 3 };
assert.equal(shoveNextTarget(allNumbersClosed, 3), 25, "BULL is unlocked only at the end");
marks = projectShoveMarks(allNumbersClosed, [IB, OB], 3);
assert.equal(marks["25"], 3, "DBULL scores 2 marks, BULL 1");
assert.equal(shoveNextTarget(marks, 3), null, "all boxes completed");
assert.equal(shoveMarkForDart(OB).marks, 1);
assert.equal(shoveMarkForDart(IB).marks, 2);

const engine = read("src/lib/gameEngines/wave61Engine.ts");
const play = read("src/pages/Wave61SharedPlay.tsx");
const config = read("src/pages/Wave61SharedConfig.tsx");
const keypad = read("src/components/KeypadTargets.tsx");
const board = read("src/components/ShovePennyCricketBoard.tsx");
assert.match(engine, /for \(const d of darts\) \{[\s\S]*?shoveNextTarget\(marks, marksPerBox, rule\)/);
assert.match(engine, /projectShoveMarks\(projected, \[dart\], marksPerBox, rule\)/, "bots should follow the selected rule");
assert.match(play, /spec.id === "shove_a_penny" && config.scoreInputMethod === "target"/);
assert.match(play, /showBull=\{shoveRule === "electronic" && shoveCurrentTarget === 25\}/);
assert.match(play, /showDBull=\{shoveRule === "electronic" && shoveCurrentTarget === 25\}/);
assert.match(config, /Cibles successives · Keypad Cricket/);
assert.match(keypad, /ANNULER/);
assert.match(keypad, /DOUBLE/);
assert.match(keypad, /TRIPLE/);
assert.match(keypad, /MISS/);
assert.match(board, /CricketMarkIcon/);
const trad = "traditional";
assert.deepEqual(Array.from(shoveTargets(trad)), [1,2,3,4,5,6,7,8,9]);
assert.equal(shoveRuleSet("traditional"), trad);
assert.equal(shoveNextTarget({}, 3, trad), 1);
marks = projectShoveMarks({}, [S(8), T(2), D(6)], 3, trad);
assert.equal(marks["8"], 1, "free-order first dart");
assert.equal(marks["2"], 3, "free-order triple closes 2");
assert.equal(marks["6"], 2, "free-order double scores on 6");
assert.equal(shoveMarkForDart(OB, trad).marks, 0, "bull excluded from traditional");
assert.equal(shoveMarkForDart(IB, trad).marks, 0, "double bull excluded");
assert.equal(shoveMarkForDart(T(20), trad).marks, 0, "20 is not a scoring sector");
assert.match(engine, /selectShoveGiftRecipient/);
assert.match(engine, /giftTargetRule/);
assert.match(engine, /Le dernier trait doit être acquis par le joueur/);
assert.match(play, /shoveGiftRecipientId/);
console.log("✅ SHOVE A PENNY : règle traditionnelle et électronique, marques Cricket, bots et redistribution.");
