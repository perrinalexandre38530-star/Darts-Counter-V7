/** V158 — layout téléphone : saisie fixe à gauche en paysage,
 * pas de conflit CSS legacy, joueur actif visible parmi 12 participants. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createHalveItState, playHalveItVisit } from '../src/lib/gameEngines/halveItEngine.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=(path)=>readFileSync(resolve(root,path),'utf8');
const base=file('src/styles/responsive-landscape.css');
const five=file('src/pages/FiveLivesPlay.tsx');
const fiveCss=file('src/pages/FiveLivesPlayResponsive.css');
const halve=file('src/pages/HalveItPlay.tsx');
const halveCss=file('src/pages/HalveItPlayResponsive.css');
const landscapeRules=base.split('/* V158 — 5 VIES / CHASE')[1]?.split('/* ---------- SPORT GAME MENUS:')[0] || '';
assert.ok(landscapeRules,'Le bloc paysage actualisé est absent');
assert.match(landscapeRules,/grid-template-rows:\s*clamp\(64px,\s*14dvh,\s*96px\)\s+minmax\(0,\s*1fr\)/);
assert.match(landscapeRules,/> \.msc-five-lives-input\s*\{\s*grid-column:\s*1\s*!important/);
assert.match(landscapeRules,/> \.msc-five-lives-body\s*\{\s*grid-column:\s*2\s*!important/);
assert.doesNotMatch(landscapeRules,/grid-row:\s*2\s*\/\s*5/);
assert.match(halveCss,/\.msc-halveit-overview\s*\{\s*grid-column:\s*2/);
assert.match(halveCss,/\.msc-halveit-keypad\s*\{\s*grid-column:\s*1/);
for(const name of ['msc-five-lives-hero-grid']) {
 assert.ok(five.includes(name));
 assert.ok(fiveCss.includes('.'+name));
}
for(const name of ['msc-halveit-hero','msc-halveit-active-score','msc-halveit-target-label']) {
 assert.ok(halve.includes(name));
 assert.ok(halveCss.includes('.'+name));
}
assert.match(halve,/const standingsStripRef = React\.useRef<HTMLDivElement \| null>\(null\)/);
assert.match(halve,/ref=\{standingsStripRef\}/);
assert.match(halve,/querySelector<HTMLElement>\('\[aria-current="true"\]'\)/);
assert.match(halve,/strip\.scrollLeft \+= displacement/);
assert.doesNotMatch(halve,/scrollIntoView/); // ne doit jamais déplacer verticalement le clavier

const players=Array.from({length:12},(_,i)=>({id:`player-${i+1}`,name:`Joueur ${i+1}`}));
const miss={bed:'MISS'};
let match=createHalveItState(players,{participantMode:'players',sequencePreset:'extended9',customTargets:['n15','n16','double_any','n17','n18','triple_any','n19','n20','bull'],startMode:'fixed',fixedStartingScore:40,rounding:'floor'});
for(let i=0;i<11;i++) match=playHalveItVisit(match,[miss,miss,miss]);
assert.equal(match.standings.length,12);
assert.equal(match.history.length,11);
assert.equal(match.scoresByPlayer['player-12'],40,'Le dernier joueur est conservé et doit rester consultable.');
console.log('PASS V158 — paysage saisie gauche/suivi droite; mobiles étroits; défilement horizontal du joueur actif (12 joueurs); score inchangé.');
