// V177 — contrôle ciblé HALF-IT / SPLIT SCORE à partir de V176.
// Exécution: node --experimental-strip-types tools/test-halveit-split-final-v177.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHalveItState, playHalveItVisit, halveItTargetScore, targetFromId } from '../src/lib/gameEngines/halveItEngine.ts';
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(base, path), 'utf8');
const screen = read('src/pages/HalveItPlay.tsx');
const css = read('src/pages/HalveItPlayResponsive.css');
const board = read('src/components/DartboardClickable.tsx');
assert.match(screen, /onBull=\{\(\) => addDart\(25, multiplier === 2 \? 2 : 1\)\}/, 'DOUBLE + BULL passe bien le multiplicateur 2');
assert.match(screen, /if \(dart\.v === 25\) return \{ bed: dart\.mult === 2 \? "IB" : "OB" \}/, 'IB indique DBULL 50');
assert.equal(halveItTargetScore(targetFromId('bull'), { bed: 'IB' }), 50);
assert.equal(halveItTargetScore(targetFromId('bull'), { bed: 'OB' }), 25);
assert.equal(halveItTargetScore(targetFromId('double_any'), { bed: 'IB' }), 50);
assert.equal(halveItTargetScore(targetFromId('triple_any'), { bed: 'IB' }), 0);
const split = ['n15','n16','double_any','n17','n18','triple_any','n19','n20','bull'];
const rules = { participantMode:'players', sequencePreset:'classic7', customTargets:split, startMode:'fixed', fixedStartingScore:40, rounding:'floor' };
let state = createHalveItState([{ id:'p1', name:'Test' }], rules);
for (const [n, targetId] of split.entries()) {
  assert.equal(state.targets[n].id, targetId);
  const hit = targetId === 'bull' ? { bed: 'IB' } : targetId === 'double_any' ? { bed:'D',number:20 } : targetId === 'triple_any' ? {bed:'T',number:20} : {bed:'S',number:Number(targetId.slice(1))};
  const before = state.scoresByPlayer.p1;
  state = playHalveItVisit(state, [hit, {bed:'MISS'}, {bed:'MISS'}]);
  assert.ok(state.scoresByPlayer.p1 > before, `cible ${targetId} réussie`);
}
assert.equal(state.finished, true, 'la partie se termine après 9 cibles');
assert.match(screen, /guideTargets=\{boardGuides\}/);
assert.match(screen, /guideLabel=\{`VISE \$\{targetLabel\}`\}/);
for (const ring of ['number','bull_any','double','triple']) assert.ok(screen.includes(`"${ring}"`), `guide ${ring}`);
assert.match(board, /guideTargets\.map\(/, 'cible partagée prend en charge le surlignage');
assert.match(css, /width: min\(320px, 100%\) !important/, 'dartboard adapté à la largeur disponible');
assert.match(screen, /saveGateRef\.current\.save\(id,/, 'sauvegarde unique par identifiant');
assert.match(screen, /saveStatus === "saving"\) return;/, 'ne réécrit pas à l’ouverture de l’historique');
assert.match(screen, /go\("statsHub", \{ tab: "history" \}\)/, 'navigation indépendante après sauvegarde');
assert.match(screen, /VOIR LES RÉSULTATS/, 'accès aux résultats après fermeture de la fenêtre');
console.log('PASS V177 — DBULL 50, SPLIT SCORE 9 manches, cible guidée, résultats/historique, responsive');
