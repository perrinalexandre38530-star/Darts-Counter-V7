/** V146: responsive scoring surfaces, latest visits, rules dialog and live stats. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHalveItState, playHalveItVisit } from '../src/lib/gameEngines/halveItEngine.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = (path) => readFileSync(resolve(root,path),'utf8');
const halves = text('src/pages/HalveItPlay.tsx');
const lives = text('src/pages/FiveLivesPlay.tsx');
const css = text('src/pages/HalveItPlayResponsive.css');
assert.match(halves,/import "\.\/HalveItPlayResponsive\.css"/);
for(const cls of ['msc-halveit-play','msc-halveit-stage','msc-halveit-overview','msc-halveit-keypad']) {
 assert.ok(halves.includes(cls),`${cls} missing in play markup`);
 assert.ok(css.includes(`.${cls}`),`${cls} missing in layout rules`);
}
assert.match(css,/@media \(orientation: landscape\)/);
assert.match(css,/max-height: 54dvh/);
assert.match(css,/env\(safe-area-inset-bottom\)/);
assert.match(halves,/SUIVI DE PERFORMANCE · \{modeLabel\}/);
assert.match(halves,/DÉTAIL PAR CIBLE/);
assert.match(halves,/DERNIÈRE VOLÉE/);
assert.match(lives,/DERNIÈRES VOLÉES · \{modeLabel\.toUpperCase\(\)\}/);
assert.match(lives,/ORDRE CHASE/);
assert.match(lives,/isChase: boolean;\s+modeLabel: string;/);
assert.match(lives,/isChase=\{isChase\}\s+modeLabel=\{modeLabel\}/);
for(const lang of ['fr','en']) for(const game of ['chase','split_score']) {
 assert.ok(existsSync(resolve(root,`src/assets/tickers/ticker_${game}_${lang}.webp`)));
}
// Both modes still use the original, unmodified rules engine.
const miss = { bed:'MISS' };
const players = [{id:'a',name:'A'},{id:'b',name:'B'}];
const rules = {participantMode:'players',sequencePreset:'extended9',customTargets:['n15','n16','double_any','n17','n18','triple_any','n19','n20','bull'],startMode:'fixed',fixedStartingScore:40,rounding:'floor'};
let state = createHalveItState(players,rules);
state = playHalveItVisit(state,[{bed:'T',number:15},miss,miss]);
state = playHalveItVisit(state,[miss,miss,miss]);
assert.equal(state.scoresByPlayer.a,85);
assert.equal(state.scoresByPlayer.b,20);
assert.equal(state.statsByPlayer.b.halvingEvents,1);
assert.equal(state.history.at(-1).loss,20);
assert.equal(state.history.at(-1).scoreAfter,20);
console.log('PASS V146 — desktop/mobile play layout, live target stats, visit recaps, CHASE order and rules, scoring unchanged.');
