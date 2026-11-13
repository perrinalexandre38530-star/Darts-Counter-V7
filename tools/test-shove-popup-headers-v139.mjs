import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const play = read('src/pages/Wave61SharedPlay.tsx');
const objective = read('src/components/ShoveObjectivesModal.tsx');
const header = read('src/components/ShoveFloatingHeader.tsx');
const tickerPath = path.join(root, 'src/assets/tickers/ticker_shove_a_penny.webp');
assert.ok(fs.statSync(tickerPath).size > 10000, 'Le ticker officiel doit exister');
assert.match(header, /import shoveTicker from "\.\.\/assets\/tickers\/ticker_shove_a_penny\.webp"/);
assert.match(header, /<img\s+src=\{shoveTicker\}/);
assert.match(header, /\{title\}/);
assert.match(header, /onClick=\{onClose\}/);
assert.match(play, /spec\.id === "shove_a_penny" \? \(\s*<ShoveFloatingHeader/);
assert.match(play, /onClose=\{\(\) => setQuickPanel\(null\)\}/);
assert.match(objective, /<ShoveFloatingHeader title="OBJECTIFS ET CONSEILS" accent=\{p\.accent\} onClose=\{p\.onClose\}/);
for (const panel of ['rules', 'settings', 'players', 'history', 'ranking', 'stats', 'shove_marks', 'shove_advice']) {
  assert.match(play, new RegExp(`\\b${panel}: "[^"]+"`), `Titre pour la fenêtre ${panel}`);
}
assert.ok(!play.includes('data-shove-stats-ticker-header'), 'Pas de doublon ancien en-tête stats');
assert.ok(!objective.includes('SHOVE A PENNY · OBJECTIFS'), 'Pas de titre texte dans la fenêtre Objectifs');
assert.match(play, /spec\.id === "shove_a_penny" \? \([\s\S]*<ShoveFloatingHeader[\s\S]*\) : \(\s*<div/, 'Les autres modes gardent leur en-tête existant');
console.log('✅ En-têtes ticker SHOVE : 8 fenêtres contextuelles + OBJECTIFS, fermeture, ancien header préservé hors SHOVE');
