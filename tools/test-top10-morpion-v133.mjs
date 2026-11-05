// V133 : règles, volées et protection de l'historique (test local sans navigateur).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { newMorpionGrid, applyMorpionVolley, morpionIsDraw, morpionWinner } from '../src/lib/morpionEngine.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(resolve(root, f), 'utf8');
const grid = newMorpionGrid(2, () => .123);
assert.equal(grid.targets[4], 25);
assert.equal(new Set(grid.targets).size, 9);
assert.equal(morpionIsDraw(Array(9).fill(null)), false);
assert.equal(morpionIsDraw([0,1,0,1,0,1,1,0,1]), true);
assert.equal(morpionIsDraw([0,0,0,null,null,null,null,null,null]), false);
assert.equal(morpionIsDraw([1,1,0,0,0,1,1,0,null]), true, 'nul dès que plus aucune ligne ne peut gagner');
assert.equal(morpionWinner([0,0,0,null,null,null,null,null,null]), 0);
let g = grid;
for (let i = 0; i < 4; i++) g = applyMorpionVolley(g, 0, [{v:25,mult:i%2?2:1}]).grid;
assert.equal(g.owners[4], 0, 'BULL25 et BULL50 partagent une case');
assert.equal(applyMorpionVolley(g,1,[{v:25,mult:1}]).grid.marks[4][1], 0, 'case conquise verrouillée');
for (const mode of ['Top10Play', 'TicTacToePlay']) {
 const src=read(`src/pages/${mode}.tsx`);
 assert.match(src,/darts\.length !== 3/,`${mode} : exactement 3 fléchettes`);
 assert.match(src,/commitGuard\.current/,`${mode} : anti double-validation`);
 assert.match(src,/createMatchCheckpointWriter/,`${mode} : file de sauvegarde ordonnée et récupérable`);
 assert.match(src,/setBotSummary/,`${mode} : récapitulatif bot`);
 assert.match(src,/CONTINUER/,`${mode} : validation du récapitulatif`);
}
assert.match(read('src/pages/Top10Config.tsx'),/tickerTop10En/);
assert.match(read('src/pages/TicTacToePlay.tsx'),/applyMorpionVolley/);
console.log('OK V133 : règles MORPION, volées complètes, récap bots, autosave ordonné.');
