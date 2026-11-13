import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const load = (sourceFile, dependencies = {}) => {
  const path = typeof sourceFile === 'string' ? sourceFile : fileURLToPath(sourceFile);
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal((js.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, `${sourceFile} should parse`);
  const module = { exports: {} };
  vm.runInNewContext(js.outputText, { module, exports: module.exports,
    require: (key) => {
      if (!(key in dependencies)) throw new Error(`unexpected dependency ${key}`);
      return dependencies[key];
    },
  }, { filename: path });
  return module.exports;
};
const roots = new URL('../src/', import.meta.url);
const targets = load(new URL('lib/gameEngines/shoveAPennyTargets.ts', roots));
const records = load(new URL('lib/gameEngines/shoveAPennyRecords.ts', roots), {
  './shoveAPennyTargets': targets,
});
const state = (visits, marksByPlayer = {}) => ({
  players: [ { id: 'a', name: 'Ninja' }, { id: 'b', name: 'Awena' } ],
  config: { modeOptions: { marksPerBox: 3, ruleSet: 'electronic' } },
  special: { shoveMarksByPlayer: marksByPlayer }, visits,
});
const v = (playerId, delta, darts = []) => ({ playerId, delta, darts });
assert.equal(records.deriveShoveMatchRecords(state([])).length, 0);
assert.equal(records.deriveShoveMatchRecords(state([v('a', 3, [{bed:'T'}])])).length, 0, 'first volley must have no record strip');
assert.equal(records.deriveShoveMatchRecords(state([v('a', 0), v('b', 0)])).length, 0, 'no marks means no fake record');
let r = records.deriveShoveMatchRecords(state([v('a', 1), v('b', 3, [{bed:'T'}])], {a:{'15':1},b:{'15':3}}));
assert.equal(r[0].id, 'visit'); assert.equal(r[0].value, '+3 marques'); assert.equal(r[0].player,'Awena');
assert.equal(r[1].id, 'closed'); assert.equal(r[1].value, '1/7');
r = records.deriveShoveMatchRecords(state([v('a', 1), v('b', 2, [{bed:'T'}, {bed:'T'}])], {a:{'15':1}}));
assert.ok(r.find(x => x.id==='triples' && x.value==='2 sur 3'), 'actual double-triple volley produces record');
const source = fs.readFileSync(new URL('components/KeypadTargets.tsx',roots),'utf8');
const css = fs.readFileSync(new URL('components/KeypadTargets.css',roots),'utf8');
const play = fs.readFileSync(new URL('pages/Wave61SharedPlay.tsx',roots),'utf8');
const mid = fs.readFileSync(new URL('components/ShoveMatchMidZone.tsx',roots),'utf8');
assert.match(source, /data-targetpad-layout=\{isNine \? "nine" : isFocus \? "focus"/);
assert.match(css, /grid-template-areas:"visits visits" "targets actions" "validate validate"/);
assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(play, /tickerBottomGap=\{spec\.id === "shove_a_penny"/);
assert.match(play, /spec\.id === "shove_a_penny" \? <ShoveMatchMidZone/);
assert.match(mid, /<InlineAdBanner placement="games" slotKey="games-shove-a-penny-play"/);
assert.match(mid, /freeHeight >= 120/);
assert.match(play, /!shoveOverlay && !visitRecap && !quickPanel/);
assert.ok(!css.includes('position:fixed'), 'keypad is never a floating overlay');
console.log('OK SHOVE V130 base checks retained: 15→BULL balanced keys, record derivation, ad modal safety, header margin');
