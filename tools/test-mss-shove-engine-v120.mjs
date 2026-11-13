/** Runtime engine regression: compiles the actual TypeScript modules with local dev TypeScript. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const previous = Module._extensions['.ts'];
Module._extensions['.ts'] = (module, filename) => {
  const js = ts.transpileModule(fs.readFileSync(filename,'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  module._compile(js, filename);
};
try {
  const { createWave61State, playWave61Visit } = require('../src/lib/gameEngines/wave61Engine.ts');
  const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  const mk = (options={},count=2) => createWave61State(players.slice(0,count), 'shove_a_penny', {
    modeOptions: { marksPerBox:3, overflowRule:1, ...options },
    selectedIds: players.slice(0,count).map(x=>x.id), rounds:60, randomOrder:false,
  });
  const d = (bed,number) => number == null ? {bed} : {bed,number};
  let s=mk(); assert.equal(s.config.goal,27);
  s=playWave61Visit(s,[d('S',8),d('D',6),d('T',2)]);
  assert.equal(s.progress.a,6); assert.equal(s.scores.a,0);
  s=playWave61Visit(mk(),[d('S',1),d('S',1),d('T',1)]);
  assert.equal(s.special.shoveMarksByPlayer.b['1'],2);
  s=mk({ruleSet:'electronic'}); assert.equal(s.config.goal,21);
  s=playWave61Visit(s,[d('T',16),d('D',15),d('S',15)]);
  assert.equal(s.special.shoveMarksByPlayer.a['15'],3);
  assert.equal(s.special.shoveMarksByPlayer.a['16'],0);
  s=mk({giftTargetRule:'shooter_choice',giftRecipientId:'c'},3);
  s.special.shoveMarksByPlayer.a['5']=2;
  s=playWave61Visit(s,[d('T',5)]);
  assert.equal(s.special.shoveMarksByPlayer.c['5'],2);
  s=mk(); for(let n=1;n<=9;n++) s.special.shoveMarksByPlayer.b[String(n)]=3;
  s.special.shoveMarksByPlayer.b['3']=2; s.special.shoveMarksByPlayer.a['3']=2;
  s=playWave61Visit(s,[d('T',3)]);
  assert.equal(s.special.shoveMarksByPlayer.b['3'],2);
  assert.notEqual(s.winnerId,'b');
  console.log('✅ MSS V120: moteur SHOVE réel, ordre libre, surplus, variante, choix et marque gagnante.');
} finally { if(previous) Module._extensions['.ts']=previous; else delete Module._extensions['.ts']; }
